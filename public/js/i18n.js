// DramaboxD i18n Localization Engine (ID 🇮🇩 & EN 🇬🇧)
const DICTIONARIES = {
  id: {
    brandSubtitle: "Streaming Drama Pendek Vertikal",
    navHome: "Beranda",
    navPlatforms: "Platform",
    navGenres: "Genre",
    navMyList: "Daftar Saya",
    searchBtn: "Cari",
    heroPlay: "Putar Sekarang",
    heroInfo: "Lihat Detail",
    continueWatching: "Lanjutkan Menonton",
    episodesCount: "{count} Episode",
    episodeNum: "Episode {num}",
    readyToPlay: "Siap Putar",
    locked: "Terkunci",
    modalSynopsis: "Sinopsis",
    modalAddList: "+ Daftar Saya",
    modalInList: "✓ Di Daftar",
    modalEpisodes: "Daftar Episode",
    platformTitle: "Direktori Platform",
    platformSubtitle: "Pilih platform drama pendek untuk melihat koleksi resminya.",
    filterAll: "Semua Platform",
    filterActive: "Aktif (Dapat Diputar)",
    filterComingSoon: "Segera Hadir",
    statusActive: "Tersedia",
    statusPlanned: "Dalam Pengembangan",
    statusComingSoon: "Segera Hadir",
    genreTitle: "Koleksi Genre Drama",
    genreSubtitle: "Temukan drama pendek favoritmu berdasarkan alur dan tema cerita.",
    genreAll: "Semua Genre",
    genreEmpty: "Belum ada drama yang ditemukan untuk genre ini.",
    sortLabel: "Urutkan:",
    sortPopular: "🔥 Terpopuler",
    sortEpDesc: "📈 Episode Terbanyak",
    sortEpAsc: "📉 Episode Tersedikit",
    sortAZ: "🔤 Judul (A — Z)",
    sortZA: "🔠 Judul (Z — A)",
    searchResultsFor: 'Hasil pencarian untuk: "{query}"',
    noResults: "Tidak ada drama yang cocok dengan kata kunci.",
    myListTitle: "Koleksi Saya",
    myListEmpty: "Belum ada drama yang ditambahkan ke daftar favoritmu.",
    tabBookmarks: "🔖 Favorit Saya",
    tabHistory: "🕒 Riwayat Nonton",
    clearAll: "Bersihkan Semua",
    clearConfirm: "Apakah kamu yakin ingin mengosongkan daftar ini?",
    historyEmpty: "Belum ada riwayat tontonan drama.",
    deleteItem: "Hapus",
    playerNext: "Episode Berikutnya",
    playerPrev: "Episode Sebelumnya",
    playerAutoplay: "Otomatis Putar Berikutnya",
    playerSpeed: "Kecepatan",
    playerSubtitles: "Subtitle",
    playerSubNone: "Mati (Off)",
    playerSubTranslate: "Terjemahan mesin",
    playerQualityAuto: "Otomatis",
    platformLangBadge: "Ikut bahasa",
    loadingCatalog: "Memuat katalog drama...",
    loadingEpisodes: "Mengambil daftar episode...",
    loadingStream: "Menghubungkan stream video...",
    streamError: "Gagal memutar stream. Episode terkunci atau server upstream bermasalah.",
  },
  en: {
    brandSubtitle: "Vertical Short Drama Streaming",
    navHome: "Home",
    navPlatforms: "Platforms",
    navGenres: "Genres",
    navMyList: "My List",
    searchBtn: "Search",
    heroPlay: "Play Now",
    heroInfo: "More Info",
    continueWatching: "Continue Watching",
    episodesCount: "{count} Episodes",
    episodeNum: "Episode {num}",
    readyToPlay: "Ready to Play",
    locked: "Locked",
    modalSynopsis: "Synopsis",
    modalAddList: "+ My List",
    modalInList: "✓ In List",
    modalEpisodes: "Episode List",
    platformTitle: "Platform Directory",
    platformSubtitle: "Explore short drama catalogs categorized by original platform.",
    filterAll: "All Platforms",
    filterActive: "Active (Playable)",
    filterComingSoon: "Coming Soon",
    statusActive: "Playable",
    statusPlanned: "In Development",
    statusComingSoon: "Coming Soon",
    genreTitle: "Genre Collections",
    genreSubtitle: "Explore short dramas categorized by plot themes and genres.",
    genreAll: "All Genres",
    genreEmpty: "No dramas found for this genre yet.",
    sortLabel: "Sort by:",
    sortPopular: "🔥 Most Popular",
    sortEpDesc: "📈 Most Episodes",
    sortEpAsc: "📉 Fewest Episodes",
    sortAZ: "🔤 Title (A — Z)",
    sortZA: "🔠 Title (Z — A)",
    searchResultsFor: 'Search results for: "{query}"',
    noResults: "No dramas match your search query.",
    myListTitle: "My Library",
    myListEmpty: "No dramas added to your watchlist yet.",
    tabBookmarks: "🔖 Bookmarks",
    tabHistory: "🕒 Watch History",
    clearAll: "Clear All",
    clearConfirm: "Are you sure you want to clear this list?",
    historyEmpty: "No drama watch history yet.",
    deleteItem: "Remove",
    playerNext: "Next Episode",
    playerPrev: "Previous Episode",
    playerAutoplay: "Autoplay Next",
    playerSpeed: "Speed",
    playerSubtitles: "Subtitles",
    playerSubNone: "Off",
    playerSubTranslate: "Machine translation",
    playerQualityAuto: "Auto",
    platformLangBadge: "Follows language",
    loadingCatalog: "Loading drama catalog...",
    loadingEpisodes: "Fetching episodes...",
    loadingStream: "Connecting video stream...",
    streamError: "Failed to play stream. Episode is locked or upstream server error.",
  },
};

let currentLang = localStorage.getItem("dramaboxd_lang") || "id";

export function getLanguage() {
  return currentLang;
}

export function setLanguage(lang) {
  if (DICTIONARIES[lang]) {
    currentLang = lang;
    localStorage.setItem("dramaboxd_lang", lang);
    applyI18n();
    window.dispatchEvent(new CustomEvent("languageChanged", { detail: { lang } }));
  }
}

export function t(key, params = {}) {
  const dict = DICTIONARIES[currentLang] || DICTIONARIES.id;
  let text = dict[key] || DICTIONARIES.en[key] || key;
  for (const [pKey, pVal] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\{${pKey}\\}`, "g"), String(pVal));
  }
  return text;
}

export function applyI18n() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      el.textContent = t(key);
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      el.setAttribute("placeholder", t(key));
    }
  });

  const langBtn = document.getElementById("langSwitchBtn");
  if (langBtn) {
    langBtn.textContent = currentLang === "id" ? "🇮🇩 ID" : "🇬🇧 EN";
  }
}
