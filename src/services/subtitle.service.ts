// DramaboxD On-The-Fly Subtitle Auto-Translation Service

export class SubtitleService {
  private readonly cache = new Map<string, { vtt: string; timestamp: number }>();
  private readonly cacheTtlMs = 60 * 60 * 1000; // 1 Jam

  async translateText(text: string, from = "auto", to = "id"): Promise<string> {
    const trimmed = text.trim();
    if (!trimmed) return text;

    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(from)}&tl=${encodeURIComponent(to)}&dt=t&q=${encodeURIComponent(trimmed)}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
        },
      });

      if (!res.ok) return text;
      const data = (await res.json()) as Array<Array<[string, string]>>;
      if (!Array.isArray(data) || !Array.isArray(data[0])) return text;

      return data[0].map((item) => item[0]).join("");
    } catch {
      return text;
    }
  }

  async translateVtt(rawVtt: string, from = "auto", to = "id"): Promise<string> {
    if (!rawVtt) return "";
    let cleanVtt = rawVtt;
    // Konversi format SRT ke WebVTT jika diperlukan
    if (!cleanVtt.startsWith("WEBVTT")) {
      cleanVtt = `WEBVTT\n\n${cleanVtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2")}`;
    }

    const lines = cleanVtt.split(/\r?\n/);
    const out: string[] = [];
    const cueTexts: string[] = [];
    const cueIndices: number[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.includes("-->")) {
        out.push(line);
        i++;
        let cueBody = "";
        while (i < lines.length && lines[i].trim() !== "") {
          cueBody += (cueBody ? "\n" : "") + lines[i];
          i++;
        }
        cueTexts.push(cueBody);
        cueIndices.push(out.length);
        out.push("__CUE_PLACEHOLDER__");
        out.push("");
      } else {
        out.push(line);
      }
    }

    if (cueTexts.length === 0) {
      return cleanVtt;
    }

    // Terjemahkan dalam batch kecil (maksimal 25 cue per request agar tidak melebihi URL limit)
    const BATCH_SIZE = 25;
    const translatedCues: string[] = [];

    for (let b = 0; b < cueTexts.length; b += BATCH_SIZE) {
      const batch = cueTexts.slice(b, b + BATCH_SIZE);
      const joined = batch.join(" [CUE_DELIM] ");
      const translatedBatch = await this.translateText(joined, from, to);
      const parts = translatedBatch.split(/\s*\[CUE_DELIM\]\s*/i);

      for (let k = 0; k < batch.length; k++) {
        translatedCues.push(parts[k] || batch[k]);
      }
    }

    cueIndices.forEach((pos, idx) => {
      out[pos] = translatedCues[idx] || cueTexts[idx];
    });

    return out.join("\n");
  }

  async fetchAndTranslateVtt(vttUrl: string, from = "auto", to = "id"): Promise<string> {
    const cacheKey = `${vttUrl}:${to}`;
    const cached = this.cache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < this.cacheTtlMs) {
      return cached.vtt;
    }

    const res = await fetch(vttUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`Gagal mengunduh file subtitle dari upstream (HTTP ${res.status})`);
    }

    const raw = await res.text();
    const translated = await this.translateVtt(raw, from, to);

    this.cache.set(cacheKey, { vtt: translated, timestamp: now });
    return translated;
  }
}
