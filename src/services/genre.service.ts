import type { SeriesSummary } from "../types.js";
import type { BrowseService } from "./browse.service.js";
import type { UiLanguage } from "../providers/registry.js";

export interface GenreInfo {
  id: string;
  nameId: string;
  nameEn: string;
  icon: string;
  keywords: string[];
  description: string;
}

export class GenreService {
  constructor(private readonly browseService: BrowseService) {}

  private readonly genres: GenreInfo[] = [
    {
      id: "billionaire",
      nameId: "CEO & Miliarder",
      nameEn: "Billionaire & CEO",
      icon: "💎",
      keywords: ["billionaire", "ceo", "rich", "miliarder", "boss", "konglomerat", "wealthy", "tycoon"],
      description: "Kisah cinta konglomerat, pewaris takhta, dan bos dingin yang jatuh cinta.",
    },
    {
      id: "romance",
      nameId: "Romansa Manis",
      nameEn: "Sweet Romance",
      icon: "❤️",
      keywords: ["romance", "love", "sweet", "cinta", "first love", "lover", "marriage", "crush"],
      description: "Cerita cinta penuh emosi, perjodohan tak terduga, dan romansa manis.",
    },
    {
      id: "revenge",
      nameId: "Balas Dendam",
      nameEn: "Revenge & Retribution",
      icon: "🗡️",
      keywords: ["revenge", "dendam", "betrayal", "retribution", "khianat", "nemesis", "comeback", "rise"],
      description: "Dikhianati dan diinjak-injak lalu bangkit membalas semua musuhnya.",
    },
    {
      id: "reborn",
      nameId: "Kelahiran Kembali (Reborn)",
      nameEn: "Reborn & Rebirth",
      icon: "⏳",
      keywords: ["reborn", "rebirth", "transmigration", "second chance", "kembali", "hidup kembali", "bangkit"],
      description: "Mendapat kesempatan kedua untuk memperbaiki masa lalu dan merebut takdir.",
    },
    {
      id: "forbidden-love",
      nameId: "Cinta Terlarang",
      nameEn: "Forbidden Love",
      icon: "🔥",
      keywords: ["forbidden", "secret love", "swap", "affair", "terlarang", "steamy", "taboo", "desire"],
      description: "Ketegangan hubungan rahasia yang melanggar norma dan batasan sosial.",
    },
    {
      id: "werewolf",
      nameId: "Werewolf & Alpha",
      nameEn: "Werewolf & Alpha",
      icon: "🐺",
      keywords: ["werewolf", "alpha", "luna", "lycan", "mate", "pack", "serigala", "beast"],
      description: "Dunia fantasi serigala jadian, takdir mate sejati, dan hierarki Alpha.",
    },
    {
      id: "action",
      nameId: "Aksi & Bela Diri",
      nameEn: "Action & Martial Arts",
      icon: "🥋",
      keywords: ["action", "martial", "pedang", "warrior", "pendekar", "fighter", "battle", "dewa perang"],
      description: "Pertarungan pendekar pedang, aksi bela diri sengit, dan dewa tempur.",
    },
    {
      id: "fantasy",
      nameId: "Fantasi & Sistem",
      nameEn: "Fantasy & System",
      icon: "🔮",
      keywords: ["fantasy", "system", "magic", "super power", "god", "immortal", "dewa", "sakti"],
      description: "Kebangkitan sistem ajaib, sihir spektakuler, dan petualangan dunia lain.",
    },
    {
      id: "campus",
      nameId: "Kampus & Remaja",
      nameEn: "Campus & Youth",
      icon: "🎓",
      keywords: ["campus", "college", "youth", "school", "student", "young adult", "kuliah"],
      description: "Dinamika cinta masa muda di bangku kampus, persahabatan, dan cinta pertama.",
    },
    {
      id: "drama",
      nameId: "Drama & Konflik Keluarga",
      nameEn: "Family & Drama",
      icon: "🎭",
      keywords: ["drama", "family", "mother", "father", "son", "keluarga", "conflict", "divorce", "menantu"],
      description: "Intrik keluarga besar, perseteruan warisan, dan drama emosional menyentuh hati.",
    },
  ];

  getAllGenres(): GenreInfo[] {
    return this.genres;
  }

  getGenreById(id: string): GenreInfo | undefined {
    return this.genres.find((g) => g.id.toLowerCase() === id.toLowerCase());
  }

  async getDramasByGenre(
    genreId: string,
    sortBy: "popular" | "episodes_desc" | "episodes_asc" | "az" | "za" = "popular",
    language?: UiLanguage,
  ): Promise<Array<SeriesSummary & { provider: string }>> {
    const genre = this.getGenreById(genreId);
    if (!genre) return [];

    const browse = await this.browseService.getBrowse(false, language);
    const allItems: Array<SeriesSummary & { provider: string }> = [];
    const seenIds = new Set<string>();

    for (const row of browse.rows || []) {
      for (const item of row.items || []) {
        const key = `${row.provider}:${item.id}`;
        if (!seenIds.has(key)) {
          seenIds.add(key);
          allItems.push({ ...item, provider: row.provider });
        }
      }
    }

    const kwLower = genre.keywords.map((k) => k.toLowerCase());

    const filtered = allItems.filter((drama) => {
      const titleLower = (drama.title || "").toLowerCase();
      if (kwLower.some((kw) => titleLower.includes(kw))) return true;
      if (Array.isArray(drama.tags)) {
        const tagText = drama.tags.join(" ").toLowerCase();
        if (kwLower.some((kw) => tagText.includes(kw))) return true;
      }
      return false;
    });

    switch (sortBy) {
      case "episodes_desc":
        return filtered.sort((a, b) => (b.episodeCount ?? 0) - (a.episodeCount ?? 0));
      case "episodes_asc":
        return filtered.sort((a, b) => (a.episodeCount ?? 0) - (b.episodeCount ?? 0));
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
