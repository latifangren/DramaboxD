import type { Config } from "../infrastructure/config.js";
import {
  IMPLEMENTED,
  createProvider,
  type UiLanguage,
} from "../providers/registry.js";
import type { SeriesSummary } from "../types.js";

export interface GenreInfo {
  id: string;
  nameId: string;
  nameEn: string;
  icon: string;
  /** Tag bawaan provider (dari panen live) yang memetakan langsung ke genre ini. */
  tagAliases: string[];
  /** Kata kunci fallback untuk tag longgar, judul, dan sinopsis. */
  keywords: string[];
  description: string;
}

export type GenreWithCount = GenreInfo & { count: number };

const norm = (s: string): string => s.toLowerCase().trim();

/** Tag provider bisa berupa daftar gabungan koma ("Thriller, Mystery, Crime"). */
export function splitTags(tags?: string[]): string[] {
  if (!Array.isArray(tags)) return [];
  return tags
    .flatMap((t) => String(t).split(","))
    .map(norm)
    .filter(Boolean);
}

/** Bentuk minimal yang dibutuhkan pencocokan genre (sinopsis opsional). */
export type GenreMatchInput = Pick<SeriesSummary, "title" | "tags"> & {
  synopsis?: string;
};

/**
 * Pencocokan genre berlapis:
 * 1. tag bawaan provider yang sama persis dengan alias genre (sinyal terkuat),
 * 2. kata kunci yang muncul di teks tag,
 * 3. kata kunci di judul / sinopsis (fallback untuk provider tanpa tag).
 */
export function dramaMatchesGenre(drama: GenreMatchInput, genre: GenreInfo): boolean {
  const tags = splitTags(drama.tags);
  const aliases = genre.tagAliases.map(norm);
  if (tags.some((t) => aliases.includes(t))) return true;

  const keywords = genre.keywords.map(norm);
  if (keywords.length === 0) return false;
  const tagText = tags.join(" ");
  if (keywords.some((k) => tagText.includes(k))) return true;

  const title = norm(drama.title || "");
  const synopsis = norm(drama.synopsis || "");
  return keywords.some((k) => title.includes(k) || synopsis.includes(k));
}

export function countGenres(pool: GenreMatchInput[], genres: GenreInfo[]): GenreWithCount[] {
  return genres.map((g) => ({
    ...g,
    count: pool.reduce((n, d) => n + (dramaMatchesGenre(d, g) ? 1 : 0), 0),
  }));
}

export class GenreService {
  private readonly poolCache = new Map<
    string,
    { items: Array<SeriesSummary & { provider: string }>; timestamp: number }
  >();
  private readonly poolInflight = new Map<
    string,
    Promise<Array<SeriesSummary & { provider: string }>>
  >();
  private readonly ttlMs = 10 * 60 * 1000;

  constructor(private readonly config: Config) {}

  private readonly genres: GenreInfo[] = [
    {
      id: "billionaire",
      nameId: "CEO & Miliarder",
      nameEn: "Billionaire & CEO",
      icon: "💎",
      tagAliases: ["Billionaire", "Affluent Family", "Rich Family", "Chaebol"],
      keywords: ["billionaire", "ceo", "rich", "miliarder", "boss", "konglomerat", "wealthy", "tycoon", "heir", "pewaris"],
      description: "Kisah cinta konglomerat, pewaris takhta, dan bos dingin yang jatuh cinta.",
    },
    {
      id: "romance",
      nameId: "Romansa Manis",
      nameEn: "Sweet Romance",
      icon: "❤️",
      tagAliases: ["Romance", "Romantic", "Sweet Romance", "Modern Romance", "Fantasy Romance", "Historical Romance", "Campus Romance", "Love at First Sight"],
      keywords: ["romance", "love", "sweet", "cinta", "first love", "lover", "crush", "romansa", "percintaan"],
      description: "Cerita cinta penuh emosi, perjodohan tak terduga, dan romansa manis.",
    },
    {
      id: "revenge",
      nameId: "Balas Dendam",
      nameEn: "Revenge & Retribution",
      icon: "🗡️",
      tagAliases: ["Revenge", "Karma Payback", "Karma", "Retribution"],
      keywords: ["revenge", "dendam", "betrayal", "retribution", "khianat", "nemesis", "comeback", "balas dendam", "pembalasan"],
      description: "Dikhianati dan diinjak-injak lalu bangkit membalas semua musuhnya.",
    },
    {
      id: "reborn",
      nameId: "Kelahiran Kembali (Reborn)",
      nameEn: "Reborn & Rebirth",
      icon: "⏳",
      tagAliases: ["Reborn", "Rebirth", "Second Chance"],
      keywords: ["reborn", "rebirth", "transmigration", "second chance", "kembali", "hidup kembali", "bangkit"],
      description: "Mendapat kesempatan kedua untuk memperbaiki masa lalu dan merebut takdir.",
    },
    {
      id: "forbidden-love",
      nameId: "Cinta Terlarang",
      nameEn: "Forbidden Love",
      icon: "🔥",
      tagAliases: ["Forbidden Love", "Steamy", "Affair", "Erotica", "Forced Love"],
      keywords: ["forbidden", "secret love", "swap", "affair", "terlarang", "taboo", "desire"],
      description: "Ketegangan hubungan rahasia yang melanggar norma dan batasan sosial.",
    },
    {
      id: "werewolf",
      nameId: "Werewolf & Alpha",
      nameEn: "Werewolf & Alpha",
      icon: "🐺",
      tagAliases: ["Werewolf", "Alpha", "Luna", "Lycan", "Mate"],
      keywords: ["werewolf", "alpha", "luna", "lycan", "mate", "pack", "serigala", "beast"],
      description: "Dunia fantasi serigala jadian, takdir mate sejati, dan hierarki Alpha.",
    },
    {
      id: "action",
      nameId: "Aksi & Bela Diri",
      nameEn: "Action & Martial Arts",
      icon: "🥋",
      tagAliases: ["Action"],
      keywords: ["action", "martial", "pedang", "warrior", "pendekar", "fighter", "battle", "aksi", "laga"],
      description: "Pertarungan pendekar pedang, aksi bela diri sengit, dan dewa tempur.",
    },
    {
      id: "fantasy",
      nameId: "Fantasi & Sistem",
      nameEn: "Fantasy & System",
      icon: "🔮",
      tagAliases: ["Fantasy", "Immortal Love", "Supernatural"],
      keywords: ["fantasy", "system", "magic", "super power", "god", "immortal", "dewa", "sakti", "cultivation", "kultivasi"],
      description: "Kebangkitan sistem ajaib, sihir spektakuler, dan petualangan dunia lain.",
    },
    {
      id: "campus",
      nameId: "Kampus & Remaja",
      nameEn: "Campus & Youth",
      icon: "🎓",
      tagAliases: ["Young Adult", "New Adult", "Youth", "Campus", "School"],
      keywords: ["campus", "college", "youth", "school", "student", "young adult", "kuliah", "sekolah", "remaja"],
      description: "Dinamika cinta masa muda di bangku kampus, persahabatan, dan cinta pertama.",
    },
    {
      id: "drama",
      nameId: "Drama & Konflik Keluarga",
      nameEn: "Family & Drama",
      icon: "🎭",
      tagAliases: ["Drama", "Family Drama", "Drama Shorts", "Life", "Finding Relatives"],
      keywords: ["drama", "family", "mother", "father", "son", "keluarga", "conflict", "divorce", "menantu"],
      description: "Intrik keluarga besar, perseteruan warisan, dan drama emosional menyentuh hati.",
    },
    {
      id: "hidden-identity",
      nameId: "Identitas Tersembunyi",
      nameEn: "Hidden Identity",
      icon: "🕶️",
      tagAliases: ["Hidden Identity", "Secret Identity", "Playing Dumb"],
      keywords: ["hidden identity", "secret identity", "identitas rahasia", "menyamar", "playing dumb", "undercover", "pura-pura"],
      description: "Tokoh yang menyembunyikan jati diri aslinya — pewaris, ahli, atau orang paling berkuasa di ruangan itu.",
    },
    {
      id: "flash-marriage",
      nameId: "Pernikahan Kilat & Kontrak",
      nameEn: "Flash & Contract Marriage",
      icon: "💍",
      tagAliases: ["Flash Marriage", "Contract Lovers", "Contract Marriage", "Married First", "Arranged Marriage"],
      keywords: ["flash marriage", "contract marriage", "kawin kontrak", "nikah kontrak", "pernikahan kilat", "perjodohan", "arranged marriage"],
      description: "Menikah dulu, cinta belakangan — dari kontrak dingin menjadi perasaan sungguhan.",
    },
    {
      id: "underdog-rise",
      nameId: "Bangkit dari Bawah",
      nameEn: "Underdog Rise & Counterattack",
      icon: "🚀",
      tagAliases: ["Underdog Rise", "Rags to Riches", "Counterattack"],
      keywords: ["underdog", "rags to riches", "counterattack", "diremehkan", "underestimated", "dari nol"],
      description: "Diremehkan semua orang, lalu membalikkan keadaan sampai tak ada yang berani merendahkan lagi.",
    },
    {
      id: "love-triangle",
      nameId: "Cinta Segitiga",
      nameEn: "Love Triangle",
      icon: "🔺",
      tagAliases: ["Love Triangle", "Love-Hate", "Toxic"],
      keywords: ["love triangle", "cinta segitiga", "orang ketiga", "third party", "love-hate"],
      description: "Dua hati memperebutkan satu cinta — atau satu hati terbelah untuk dua orang.",
    },
    {
      id: "divorce",
      nameId: "Perceraian & Mantan",
      nameEn: "Divorce & Exes",
      icon: "💔",
      tagAliases: ["Divorce", "Love After Divorce"],
      keywords: ["divorce", "cerai", "perceraian", "mantan suami", "mantan istri", "ex-husband", "ex-wife"],
      description: "Pernikahan yang kandas, mantan yang menyesal, dan cinta yang diuji setelah perpisahan.",
    },
    {
      id: "strong-heroine",
      nameId: "Wanita Kuat & Mandiri",
      nameEn: "Strong Heroine",
      icon: "👑",
      tagAliases: ["Strong Heroine", "Independent Woman", "Independent", "Female Lead"],
      keywords: ["strong heroine", "independent woman", "wanita kuat", "wanita mandiri", "perempuan kuat", "heroine"],
      description: "Tokoh utama perempuan yang tangguh, mandiri, dan tidak menunggu diselamatkan.",
    },
    {
      id: "historical",
      nameId: "Kolosal & Kerajaan",
      nameEn: "Historical & Palace",
      icon: "🏯",
      tagAliases: ["Historical", "Period Drama"],
      keywords: ["historical", "ancient", "dynasty", "dinasti", "kerajaan", "palace", "istana", "kolosal", "emperor", "kaisar"],
      description: "Intrik istana, dinasti kuno, dan romansa di masa kerajaan.",
    },
    {
      id: "mystery-thriller",
      nameId: "Misteri & Thriller",
      nameEn: "Mystery & Thriller",
      icon: "🕵️",
      tagAliases: ["Mystery", "Thriller", "Crime", "Suspense"],
      keywords: ["mystery", "thriller", "misteri", "suspense", "crime", "kriminal", "detective", "detektif", "murder", "pembunuhan"],
      description: "Rahasia gelap, kejahatan, dan ketegangan yang membuat penasaran sampai akhir.",
    },
    {
      id: "comedy",
      nameId: "Komedi",
      nameEn: "Comedy",
      icon: "😂",
      tagAliases: ["Comedy", "Funny"],
      keywords: ["comedy", "komedi", "lucu", "funny", "kocak", "humor"],
      description: "Cerita ringan penuh tawa, situasi kocak, dan kesalahpahaman menggemaskan.",
    },
    {
      id: "modern",
      nameId: "Modern & Perkotaan",
      nameEn: "Modern & Urban",
      icon: "🏙️",
      tagAliases: ["Modern", "Contemporary", "Urban", "City"],
      keywords: ["modern", "urban", "contemporary", "city life", "perkotaan", "masa kini", "metropolitan"],
      description: "Kehidupan kota masa kini — karier, cinta, dan ambisi di tengah hiruk-pikuk metropolitan.",
    },
    {
      id: "workplace",
      nameId: "Dunia Kerja & Kantor",
      nameEn: "Workplace & Office",
      icon: "💼",
      tagAliases: ["Workplace", "Office", "Business", "Life OL"],
      keywords: ["workplace", "office", "kantor", "business", "bisnis", "secretary", "sekretaris", "kerja"],
      description: "Romansa dan intrik di tempat kerja — bos, sekretaris, rekan kantor, dan ambisi karier.",
    },
    {
      id: "vampire",
      nameId: "Vampir & Makhluk Abadi",
      nameEn: "Vampire & Immortals",
      icon: "🧛",
      tagAliases: ["Vampire"],
      keywords: ["vampire", "vampir"],
      description: "Cinta abadi dengan makhluk penghisap darah dan dunia gelap mereka.",
    },
    {
      id: "tearjerker",
      nameId: "Mengharukan & Tragis",
      nameEn: "Tearjerker & Tragic Love",
      icon: "🥹",
      tagAliases: ["Tragic Love", "Heartfelt", "Emotional", "Sensitive"],
      keywords: ["tragic", "tragis", "sedih", "mengharukan", "heartwarming", "air mata", "emotional"],
      description: "Kisah menyentuh yang menguras air mata — cinta tragis, pengorbanan, dan perpisahan.",
    },
    {
      id: "war-god",
      nameId: "Dewa Perang & Raja Naga",
      nameEn: "War God & Dragon King",
      icon: "🐉",
      tagAliases: ["War God", "God of War", "Dragon King"],
      keywords: ["war god", "god of war", "dewa perang", "dragon king", "raja naga", "supreme", "penguasa"],
      description: "Sang legenda kembali — dewa perang, raja naga, dan penguasa tersembunyi yang mengguncang dunia.",
    },
    {
      id: "secret-baby",
      nameId: "Bayi Rahasia & Ibu Tunggal",
      nameEn: "Secret Baby & Single Mom",
      icon: "🍼",
      tagAliases: ["Secret Baby", "Pregnant", "Single Mother"],
      keywords: ["secret baby", "pregnant", "hamil", "bayi", "anak rahasia", "single mother", "ibu tunggal"],
      description: "Anak yang disembunyikan bertahun-tahun dan ayah yang baru tahu kebenarannya.",
    },
  ];

  getAllGenres(): GenreInfo[] {
    return this.genres;
  }

  getGenreById(id: string): GenreInfo | undefined {
    return this.genres.find((g) => g.id.toLowerCase() === id.toLowerCase());
  }

  /**
   * Pool genre: gabungan latest+trending dari SEMUA provider aktif
   * (bukan hanya yang tampil di browse), deduplikasi per provider:id,
   * di-cache 10 menit per bahasa.
   */
  private async getPool(
    language?: UiLanguage,
  ): Promise<Array<SeriesSummary & { provider: string }>> {
    const key = language ?? "default";
    const cached = this.poolCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) return cached.items;
    const inflight = this.poolInflight.get(key);
    if (inflight) return inflight;

    const build = (async () => {
      const settled = await Promise.allSettled(
        IMPLEMENTED.map(async (name) => {
          const p = createProvider(name, this.config, language);
          const [latest, trending] = await Promise.allSettled([p.latest(), p.trending()]);
          const items = [
            ...(latest.status === "fulfilled" ? latest.value : []),
            ...(trending.status === "fulfilled" ? trending.value : []),
          ];
          return items.map((item) => ({ ...item, provider: name }));
        }),
      );
      const seen = new Set<string>();
      const pool: Array<SeriesSummary & { provider: string }> = [];
      for (const outcome of settled) {
        if (outcome.status !== "fulfilled") continue;
        for (const item of outcome.value) {
          const k = `${item.provider}:${item.id}`;
          if (!seen.has(k)) {
            seen.add(k);
            pool.push(item);
          }
        }
      }
      this.poolCache.set(key, { items: pool, timestamp: Date.now() });
      return pool;
    })();

    this.poolInflight.set(key, build);
    try {
      return await build;
    } finally {
      this.poolInflight.delete(key);
    }
  }

  async getGenresWithCounts(language?: UiLanguage): Promise<GenreWithCount[]> {
    const pool = await this.getPool(language);
    return countGenres(pool, this.genres);
  }

  async getDramasByGenre(
    genreId: string,
    sortBy: "popular" | "episodes_desc" | "episodes_asc" | "az" | "za" = "popular",
    language?: UiLanguage,
  ): Promise<Array<SeriesSummary & { provider: string }>> {
    const genre = this.getGenreById(genreId);
    if (!genre) return [];

    const pool = await this.getPool(language);
    const filtered = pool.filter((drama) => dramaMatchesGenre(drama, genre));

    switch (sortBy) {
      case "episodes_desc":
        return filtered.sort((a, b) => (b.episodeCount ?? 0) - (a.episodeCount ?? 0));
      case "episodes_asc":
        return filtered.sort((a, b) => (a.episodeCount ?? 0) - (a.episodeCount ?? 0));
      case "az":
        return filtered.sort((a, b) => a.title.localeCompare(b.title));
      case "za":
        return filtered.sort((a, b) => b.title.localeCompare(a.title));
      case "popular":
      default:
        return filtered;
    }
  }
}
