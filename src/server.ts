import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import os from "node:os";
import { loadConfig } from "./config.js";
import { createProvider, IMPLEMENTED } from "./providers/registry.js";
import type { DramaProvider, SeriesSummary } from "./types.js";

const app = new Hono();
const config = loadConfig();

app.use("*", cors());

// Helper instansiasi provider
function getProvider(name: string): DramaProvider {
  return createProvider(name, config);
}

// 1. Status & Info Jaringan
app.get("/api/status", (c) => {
  const nets = os.networkInterfaces();
  const lanIps: string[] = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] ?? []) {
      if (net.family === "IPv4" && !net.internal) {
        lanIps.push(net.address);
      }
    }
  }
  return c.json({
    status: "ok",
    version: "0.6.0",
    lanIps,
    providers: IMPLEMENTED,
  });
});

// 2. Daftar Provider
app.get("/api/providers", (c) => {
  return c.json({ providers: ["reelshort", "freereels", "dramabox", "melolo", "mock"] });
});

interface BrowsePayload {
  featured: (SeriesSummary & { provider: string }) | null;
  rows: { provider: string; title: string; items: SeriesSummary[] }[];
}

let browseCache: { data: BrowsePayload; timestamp: number } | undefined;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 menit

// 3. Browse (Billboard banner + Baris kategori ala Netflix)
app.get("/api/browse", async (c) => {
  const now = Date.now();
  if (browseCache && now - (browseCache as any).timestamp < CACHE_TTL_MS) {
    return c.json((browseCache as any).data);
  }

  const providersToFetch = ["reelshort", "freereels", "dramabox", "melolo", "mock"];
  const rows: { provider: string; title: string; items: SeriesSummary[] }[] = [];

  const results = await Promise.allSettled(
    providersToFetch.map(async (name) => {
      try {
        const p = getProvider(name);
        const [trending, latest] = await Promise.allSettled([p.trending(), p.latest()]);
        const trendingItems = trending.status === "fulfilled" ? trending.value : [];
        const latestItems = latest.status === "fulfilled" ? latest.value : [];

        // Gabungkan dan deduplikasi
        const map = new Map<string, SeriesSummary>();
        for (const item of [...trendingItems, ...latestItems]) {
          if (!map.has(item.id)) map.set(item.id, item);
        }
        return {
          provider: name,
          title: `Trending di ${name.toUpperCase()}`,
          items: Array.from(map.values()),
        };
      } catch (err) {
        return { provider: name, title: name, items: [] };
      }
    })
  );

  for (const res of results) {
    if (res.status === "fulfilled" && res.value.items.length > 0) {
      rows.push(res.value);
    }
  }

  // Prioritaskan ReelShort & FreeReels sebagai hero billboard
  let featured: (SeriesSummary & { provider: string }) | null = null;
  const preferred = rows.find((r) => r.provider === "reelshort" || r.provider === "freereels");
  if (preferred && preferred.items.length > 0) {
    const cand = preferred.items.find((item) => item.cover);
    if (cand) featured = { ...cand, provider: preferred.provider };
  }
  if (!featured) {
    for (const r of rows) {
      const candidate = r.items.find((item) => item.cover);
      if (candidate) {
        featured = { ...candidate, provider: r.provider };
        break;
      }
    }
  }

  const payload: BrowsePayload = {
    featured,
    rows,
  };
  browseCache = { data: payload, timestamp: now };

  return c.json(payload);
});

// 4. Search
app.get("/api/search", async (c) => {
  const q = c.req.query("q")?.trim() ?? "";
  const providerParam = c.req.query("provider") ?? "melolo";
  if (!q) {
    return c.json({ error: "Query 'q' wajib diisi" }, 400);
  }

  try {
    const p = getProvider(providerParam);
    const results = await p.search(q);
    return c.json({ provider: providerParam, query: q, results });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal melakukan pencarian" }, 500);
  }
});

// 5. Drama Detail & Episode
app.get("/api/drama/:provider/:id", async (c) => {
  const provider = c.req.param("provider");
  const id = c.req.param("id");

  try {
    const p = getProvider(provider);
    const [detail, episodes] = await Promise.all([p.detail(id), p.episodes(id)]);
    return c.json({ provider, detail, episodes });
  } catch (err: any) {
    return c.json({ error: err.message || "Gagal mengambil data drama" }, 500);
  }
});

// 6. Video Stream Proxy (Range request + Bypass CORS)
app.get("/api/stream", async (c) => {
  const targetUrl = c.req.query("url");
  if (!targetUrl) {
    return c.text("Parameter url wajib ada", 400);
  }

  try {
    const headers: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    };

    const rangeHeader = c.req.header("range");
    if (rangeHeader) {
      headers["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers,
    });

    const resHeaders = new Headers();
    resHeaders.set("Access-Control-Allow-Origin", "*");
    resHeaders.set("Accept-Ranges", "bytes");
    resHeaders.set("Content-Disposition", "inline");

    for (const h of ["content-type", "content-length", "content-range"]) {
      const val = upstreamRes.headers.get(h);
      if (val) resHeaders.set(h, val);
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3u8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl");

    if (isM3u8) {
      const text = await upstreamRes.text();
      const basePath = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);

      const rewritten = text
        .split("\n")
        .map((line) => {
          const trimmed = line.trim();
          if (!trimmed) return line;
          if (trimmed.startsWith("#")) {
            return line.replace(/URI="([^"]+)"/g, (_, uri) => {
              const absUrl = new URL(uri, basePath).href;
              return `URI="/api/stream?url=${encodeURIComponent(absUrl)}"`;
            });
          }
          const absUrl = new URL(trimmed, basePath).href;
          return `/api/stream?url=${encodeURIComponent(absUrl)}`;
        })
        .join("\n");

      resHeaders.set("content-type", "application/vnd.apple.mpegurl");
      return new Response(rewritten, {
        status: 200,
        headers: resHeaders,
      });
    }

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return c.text(`Stream Proxy Error: ${err.message}`, 502);
  }
});

// Static assets (Frontend UI)
app.use("/*", serveStatic({ root: "./public" }));

const PORT = Number.parseInt(process.env.PORT || "3004", 10);
const HOST = "0.0.0.0";

console.log(`Starting Netflix-style Drama Server on port ${PORT}...`);
serve(
  {
    fetch: app.fetch,
    port: PORT,
    hostname: HOST,
  },
  (info) => {
    console.log(`🚀 Drama WebUI aktif:`);
    console.log(`- Local: http://localhost:${info.port}`);
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name] ?? []) {
        if (net.family === "IPv4" && !net.internal) {
          console.log(`- LAN:   http://${net.address}:${info.port}`);
        }
      }
    }
  }
);
