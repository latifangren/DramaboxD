#!/usr/bin/env node
import { loadConfig } from "./infrastructure/config/index.js";
import { writeSeriesM3u } from "./shared/utils/m3u.js";
import { createProvider, IMPLEMENTED, PLANNED } from "./integrations/providers/registry.js";
import type { DramaProvider } from "./shared/types/index.js";

const HELP = `DracinScraper — scrape drama pendek jadi playlist .m3u per judul

Penggunaan:
  dracinscraper <perintah> [opsi]

Perintah:
  providers                     Daftar provider (implementasi + roadmap)
  latest   [--provider X]       Judul terbaru
  trending [--provider X]       Judul trending
  search   <query> [--provider X]
  detail   <id> [--provider X]
  episodes <id> [--provider X]  Daftar episode + status stream
  scrape   <id> [--provider X] [--out DIR]   Ambil 1 judul -> tulis .m3u
  scrape-search <query> [--provider X] [--out DIR]
                                Search, ambil hasil pertama -> tulis .m3u

Opsi umum:
  --provider X    Provider (default: dramabox). "mock" = data fixture lokal, tanpa jaringan.
  --out DIR       Folder output M3U (default: output / DRACIN_OUT_DIR)
  --json          Cetak hasil sebagai JSON (untuk latest/trending/search/detail/episodes)
  -h, --help      Tantuan ini

Lingkungan: lihat .env.example (DRAMABOX_API_BASE, FREEREELS_API_BASE, MELOLO_API_BASE, PINEDRAMA_SITE_BASE, DRACIN_DELAY_MS, DRACIN_TIMEOUT_MS)
`;

interface Args {
  command: string;
  positional: string[];
  provider: string;
  out?: string;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const args: Args = { command, positional: [], provider: "dramabox", json: false };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === "--provider") args.provider = rest[++i] ?? args.provider;
    else if (a === "--out") args.out = rest[++i];
    else if (a === "--json") args.json = true;
    else args.positional.push(a);
  }
  return args;
}

function printSeriesList(list: Awaited<ReturnType<DramaProvider["search"]>>, json: boolean): void {
  if (json) return console.log(JSON.stringify(list, null, 2));
  if (list.length === 0) return console.log("(kosong)");
  for (const s of list) {
    console.log(`${s.id}\t${s.title}${s.episodeCount ? `\t(${s.episodeCount} ep)` : ""}`);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.command === "help" || args.command === "--help" || args.command === "-h") {
    console.log(HELP);
    return;
  }
  if (args.command === "providers") {
    console.log(`Terimplementasi: ${IMPLEMENTED.join(", ")}, mock (offline)`);
    console.log(`Roadmap: ${PLANNED.join(", ")}`);
    return;
  }

  const config = loadConfig();
  const provider = createProvider(args.provider, config);
  const outDir = args.out ?? config.outDir;

  switch (args.command) {
    case "latest":
      printSeriesList(await provider.latest(), args.json);
      break;
    case "trending":
      printSeriesList(await provider.trending(), args.json);
      break;
    case "search": {
      const query = args.positional.join(" ");
      if (!query) throw new Error("Perintah search butuh <query>.");
      printSeriesList(await provider.search(query), args.json);
      break;
    }
    case "detail": {
      const id = args.positional[0];
      if (!id) throw new Error("Perintah detail butuh <id>.");
      const detail = await provider.detail(id);
      console.log(args.json ? JSON.stringify(detail, null, 2) : `${detail.id}\t${detail.title}\n${detail.synopsis ?? ""}`);
      break;
    }
    case "episodes": {
      const id = args.positional[0];
      if (!id) throw new Error("Perintah episodes butuh <id>.");
      const eps = await provider.episodes(id);
      if (args.json) console.log(JSON.stringify(eps, null, 2));
      else
        for (const ep of eps) {
          console.log(`Ep ${ep.index}\t${ep.duration ?? "?"}s\t${ep.streamUrl ? "OK" : ep.locked ? "TERKUNCI" : "KOSONG"}\t${ep.streamUrl ?? ""}`);
        }
      break;
    }
    case "scrape":
    case "scrape-search": {
      let id = args.positional[0];
      if (args.command === "scrape-search") {
        const query = args.positional.join(" ");
        if (!query) throw new Error("Perintah scrape-search butuh <query>.");
        const results = await provider.search(query);
        if (results.length === 0) throw new Error(`Tidak ada hasil untuk "${query}".`);
        id = results[0].id;
        console.log(`Hasil pertama: ${results[0].title} (${id})`);
      }
      if (!id) throw new Error("Perintah scrape butuh <id>.");
      const detail = await provider.detail(id);
      const episodes = await provider.episodes(id);
      const report = await writeSeriesM3u(outDir, provider.name, detail, episodes);
      console.log(`Provider : ${report.provider}`);
      console.log(`Judul    : ${report.title} (${report.seriesId})`);
      console.log(`File     : ${report.file}`);
      console.log(`Episode  : ${report.episodesWritten}/${report.episodesFound} tertulis`);
      for (const s of report.skipped) console.log(`  - Ep ${s.index} dilewati: ${s.reason}`);
      break;
    }
    default:
      console.log(HELP);
      throw new Error(`Perintah tidak dikenal: ${args.command}`);
  }
}

main().catch((err: unknown) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
