import type { PlatformInfo } from "../types.js";
import { IMPLEMENTED, PLANNED } from "../providers/registry.js";

export class PlatformService {
  /**
   * Daftar platform lengkap terinspirasi dari dramaflix.net/id/platforms.
   * Platform dengan status 'active' terintegrasi langsung dengan provider lokal.
   */
  private readonly platforms: PlatformInfo[] = [
    {
      id: "reelshort",
      name: "ReelShort",
      dramaCount: 2030,
      status: "active",
      icon: "https://dramaflix.net/reelshort.webp",
      description: "Platform drama pendek populer global dengan ribuan judul vertikal romansa & CEO.",
    },
    {
      id: "freereels",
      name: "FreeReels",
      dramaCount: 915,
      status: "active",
      icon: "https://dramaflix.net/freereels.png?v=1",
      description: "Platform dracin gratis dengan ragam genre romansa, kampus, dan miliarder.",
    },
    {
      id: "pinedrama",
      name: "PineDrama",
      dramaCount: 2340,
      status: "active",
      icon: "https://dramaflix.net/pinedrama.png?v=1",
      description: "Koleksi ribuan drama pendek Asia dengan sub Indo dan alur cepat.",
    },
    {
      id: "melolo",
      name: "Melolo",
      dramaCount: 76,
      status: "active",
      icon: "https://dramaflix.net/melolo.webp?v=1",
      description: "Aplikasi drama micro-series dengan streaming video langsung.",
    },
    {
      id: "drakorku",
      name: "DrakorKu",
      dramaCount: 520,
      status: "active",
      icon: "https://dramaflix.net/idrama.webp?v=1",
      description: "Koleksi drama Korea dan serial Asia dengan subtitle Bahasa Indonesia.",
    },
    {
      id: "dramabox",
      name: "DramaBox",
      dramaCount: 1526,
      status: "active",
      icon: "https://dramaflix.net/dramabox.webp?v=3",
      description: "Salah satu pelopor micro-drama terbesar dengan puluhan ribu episode pendek.",
    },
    {
      id: "mock",
      name: "Mock Offline",
      dramaCount: 10,
      status: "active",
      icon: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='%23e50914'/><text x='50' y='55' fill='white' font-size='30' text-anchor='middle' font-family='sans-serif'>DEV</text></svg>",
      description: "Provider pengujian fixture lokal tanpa koneksi internet.",
    },
    // Platform Roadmap & Coming Soon
    {
      id: "shortmax",
      name: "ShortMax",
      dramaCount: 435,
      status: "planned",
      icon: "https://dramaflix.net/shortmax.webp?v=3",
      description: "Platform drama vertikal dengan fokus cerita thriller, werewolf, dan balas dendam.",
    },
    {
      id: "netshort",
      name: "NetShort",
      dramaCount: 830,
      status: "planned",
      icon: "https://dramaflix.net/netshort.webp?v=3",
      description: "Katalog drama modern perkotaan, fantasi, dan romansa kantor.",
    },
    {
      id: "goodshort",
      name: "GoodShort",
      dramaCount: 499,
      status: "planned",
      icon: "https://dramaflix.net/goodshort.webp?v=1",
      description: "Adaptasi novel populer menjadi drama pendek berdurasi 1 menit per episode.",
    },
    {
      id: "dramawave",
      name: "DramaWave",
      dramaCount: 853,
      status: "planned",
      icon: "https://dramaflix.net/dramawave.webp?v=3",
      description: "Serial vertikal kualitas HD dengan beragam cerita sistem dan fantasi.",
    },
    {
      id: "moboreels",
      name: "MoboReels",
      dramaCount: 632,
      status: "planned",
      icon: "https://dramaflix.net/moboreels.webp?v=3",
      description: "Micro-drama terjemahan multibahasa dengan visual sinematik.",
    },
    {
      id: "reelife",
      name: "Reelife",
      dramaCount: 1592,
      status: "coming_soon",
      icon: "https://dramaflix.net/reelife.webp?v=1",
      description: "Koleksi drama pendek dari kreator indie Asia.",
    },
    {
      id: "luminareels",
      name: "LuminaReels",
      dramaCount: 1260,
      status: "coming_soon",
      icon: "https://dramaflix.net/luminareels.webp?v=1",
      description: "Serial pendek drama aksi, komedi romantis, dan cerita keluarga.",
    },
    {
      id: "flextv",
      name: "FlexTV",
      dramaCount: 683,
      status: "coming_soon",
      icon: "https://dramaflix.net/flextv.png",
      description: "Platform streaming video pendek multi-kategori.",
    },
  ];

  getAllPlatforms(): PlatformInfo[] {
    return this.platforms;
  }

  getPlatform(id: string): PlatformInfo | undefined {
    return this.platforms.find((p) => p.id === id);
  }

  getActiveProviderIds(): string[] {
    return this.platforms.filter((p) => p.status === "active").map((p) => p.id);
  }
}
