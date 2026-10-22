// DramaboxD Main Application Controller
import { Api } from "./api.js";
import { applyI18n, getLanguage, setLanguage, t } from "./i18n.js";
import { VerticalPlayer } from "./player.js";
import { Store } from "./store.js";

// Inisialisasi Player
const player = new VerticalPlayer();

// State Lokal
let currentActiveView = "home";
let currentModalDrama = null;
let currentModalEpisodes = [];
let allPlatformsCache = [];
let allGenresCache = [];
let browseDataCache = null;
let selectedHomeGenre = "all";
let currentGenreDramas = [];
let currentSearchResults = [];
let currentLibTab = "bookmarks";
let currentLibPlatform = "all";

// DOM Elements
const navbar = document.getElementById("navbar");
const brandBtn = document.getElementById("brandBtn");
const navHomeBtn = document.getElementById("navHomeBtn");
const navPlatformsBtn = document.getElementById("navPlatformsBtn");
const navGenresBtn = document.getElementById("navGenresBtn");
const navMyListBtn = document.getElementById("navMyListBtn");
const langSwitchBtn = document.getElementById("langSwitchBtn");
const lanBadge = document.getElementById("lanBadge");

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const searchSuggestDropdown = document.getElementById("searchSuggestDropdown");
let searchSuggestTimer = null;

const viewHome = document.getElementById("view-home");
const viewPlatforms = document.getElementById("view-platforms");
const viewGenres = document.getElementById("view-genres");
const viewSearch = document.getElementById("view-search");
const viewMyList = document.getElementById("view-mylist");
const viewWatch = document.getElementById("view-watch");

const homeGenreFilterBar = document.getElementById("homeGenreFilterBar");
const continueWatchingSection = document.getElementById("continueWatchingSection");
const continueWatchingSlider = document.getElementById("continueWatchingSlider");
const rowsContainer = document.getElementById("rows-container");

const platformsGrid = document.getElementById("platformsGrid");
const genresGrid = document.getElementById("genresGrid");
const genreDramasContainer = document.getElementById("genreDramasContainer");
const genreDramasGrid = document.getElementById("genreDramasGrid");
const selectedGenreTitle = document.getElementById("selectedGenreTitle");
const genreSortSelect = document.getElementById("genreSortSelect");

const searchResultsGrid = document.getElementById("searchResultsGrid");
const searchResultTitle = document.getElementById("searchResultTitle");
const searchSortSelect = document.getElementById("searchSortSelect");
const myListGrid = document.getElementById("myListGrid");

const libTabBookmarks = document.getElementById("libTabBookmarks");
const libTabHistory = document.getElementById("libTabHistory");
const libPlatformFilter = document.getElementById("libPlatformFilter");
const libClearAllBtn = document.getElementById("libClearAllBtn");
// Modal Elements
const detailModal = document.getElementById("detailModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalBanner = document.getElementById("modalBanner");
const modalTitle = document.getElementById("modalTitle");
const modalProviderBadge = document.getElementById("modalProviderBadge");
const modalEpCountBadge = document.getElementById("modalEpCountBadge");
const modalSynopsis = document.getElementById("modalSynopsis");
const modalPlayBtn = document.getElementById("modalPlayBtn");
const modalBookmarkBtn = document.getElementById("modalBookmarkBtn");
const episodeGrid = document.getElementById("episodeGrid");

// Billboard Elements
const billboard = document.getElementById("billboard");
const billboardBg = document.getElementById("billboardBg");
const billboardProvider = document.getElementById("billboardProvider");
const billboardTitle = document.getElementById("billboardTitle");
const billboardDesc = document.getElementById("billboardDesc");
const billboardPlayBtn = document.getElementById("billboardPlayBtn");
const billboardInfoBtn = document.getElementById("billboardInfoBtn");

// 1. Setup Navbar Scroll Effect
window.addEventListener("scroll", () => {
  if (window.scrollY > 30) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// 2. View Switcher
function switchView(viewName) {
  if (currentActiveView === "watch" && viewName !== "watch") {
    player.stop();
  }

  currentActiveView = viewName;
  [navHomeBtn, navPlatformsBtn, navGenresBtn, navMyListBtn].forEach((btn) => btn?.classList.remove("active"));
  [viewHome, viewPlatforms, viewGenres, viewSearch, viewMyList, viewWatch].forEach((v) => {
    if (v) v.style.display = "none";
  });

  switch (viewName) {
    case "home":
      navHomeBtn?.classList.add("active");
      viewHome.style.display = "block";
      billboard.style.display = "flex";
      renderContinueWatching();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "platforms":
      navPlatformsBtn?.classList.add("active");
      viewPlatforms.style.display = "block";
      billboard.style.display = "none";
      loadPlatformsView();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "genres":
      navGenresBtn?.classList.add("active");
      viewGenres.style.display = "block";
      billboard.style.display = "none";
      loadGenresView();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "mylist":
      navMyListBtn?.classList.add("active");
      viewMyList.style.display = "block";
      billboard.style.display = "none";
      renderMyListView();
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "search":
      viewSearch.style.display = "block";
      billboard.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
    case "watch":
      viewWatch.style.display = "block";
      billboard.style.display = "none";
      window.scrollTo({ top: 0, behavior: "smooth" });
      break;
  }
}

// Hook callback tombol kembali di Watch Page
player.onBackCallback = () => switchView("home");

// Helper Pengurutan Drama (Sorting)
function sortDramas(dramas, sortOption) {
  const copy = [...dramas];
  switch (sortOption) {
    case "episodes_desc":
      return copy.sort((a, b) => (b.episodeCount ?? 0) - (a.episodeCount ?? 0));
    case "episodes_asc":
      return copy.sort((a, b) => (a.episodeCount ?? 0) - (b.episodeCount ?? 0));
    case "az":
      return copy.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    case "za":
      return copy.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    case "popular":
    default:
      return copy;
  }
}

function renderDramasToGrid(dramas, containerEl) {
  containerEl.innerHTML = "";
  if (!dramas || dramas.length === 0) {
    containerEl.innerHTML = `<div class="loader">${t("noResults")}</div>`;
    return;
  }
  dramas.forEach((drama) => {
    const card = createDramaCard(drama, drama.provider);
    containerEl.appendChild(card);
  });
}

genreSortSelect?.addEventListener("change", (e) => {
  const sorted = sortDramas(currentGenreDramas, e.target.value);
  renderDramasToGrid(sorted, genreDramasGrid);
});

searchSortSelect?.addEventListener("change", (e) => {
  const sorted = sortDramas(currentSearchResults, e.target.value);
  renderDramasToGrid(sorted, searchResultsGrid);
});

brandBtn.onclick = () => switchView("home");
navHomeBtn.onclick = () => switchView("home");
navPlatformsBtn.onclick = () => switchView("platforms");
navGenresBtn.onclick = () => switchView("genres");
navMyListBtn.onclick = () => switchView("mylist");

// 3. Language Switcher (ID <-> EN)
langSwitchBtn.onclick = () => {
  const nextLang = getLanguage() === "id" ? "en" : "id";
  setLanguage(nextLang);
};
window.addEventListener("languageChanged", () => {
  renderContinueWatching();
  renderHomeGenreFilterBar();
  if (currentActiveView === "platforms") loadPlatformsView();
  if (currentActiveView === "genres") loadGenresView();
  if (currentActiveView === "mylist") renderMyListView();
  if (currentActiveView === "watch") {
    player.renderLeftMeta();
  }
});

// 4. Inisialisasi Server Status & LAN IP
async function initStatus() {
  try {
    const data = await Api.getStatus();
    if (data.lanIps && data.lanIps.length > 0) {
      lanBadge.textContent = `LAN: ${data.lanIps[0]}`;
    } else {
      lanBadge.textContent = "ONLINE";
    }
  } catch {
    lanBadge.textContent = "OFFLINE";
  }
}

// 5. Render Continue Watching Row
function renderContinueWatching() {
  const history = Store.getWatchHistory();
  if (!history || history.length === 0) {
    continueWatchingSection.style.display = "none";
    return;
  }

  continueWatchingSection.style.display = "block";
  continueWatchingSlider.innerHTML = "";

  history.forEach((item) => {
    const card = document.createElement("div");
    card.className = "drama-card";
    const epIdx = typeof item.lastEpisodeIndex === "number" ? item.lastEpisodeIndex : 0;
    card.onclick = (e) => {
      if (e.target.closest(".card-delete-btn")) return;
      openDramaDetail(item.provider, item.id, epIdx, true);
    };

    const progressPct = item.duration > 0 ? Math.min(100, Math.round((item.currentTime / item.duration) * 100)) : 0;

    card.innerHTML = `
      <div class="card-img-wrapper">
        <span class="card-badge">${(item.provider || "").toUpperCase()}</span>
        <button class="card-delete-btn" title="${t("deleteItem")}">✕</button>
        <img class="card-img" src="${item.cover || ""}" alt="${item.title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 200 300\\' fill=\\'%23121218\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
        <div class="card-overlay">
          <div class="card-title">${item.title}</div>
          <div class="card-meta">
            <span>Ep ${epIdx + 1}</span>
            <span class="card-episodes">${progressPct}%</span>
          </div>
        </div>
        <div class="card-progress-bar">
          <div class="card-progress-fill" style="width: ${progressPct}%;"></div>
        </div>
      </div>
    `;

    const delBtn = card.querySelector(".card-delete-btn");
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        Store.removeFromHistory(item.provider, item.id);
        renderContinueWatching();
      };
    }
    continueWatchingSlider.appendChild(card);
  });
}

// 6. Muat Beranda (Hero Billboard, Genre Bar & Baris Katalog)
async function loadHomeBrowse() {
  try {
    const data = await Api.getBrowse();
    browseDataCache = data;

    // Render Billboard
    if (data.featured) {
      const feat = data.featured;
      billboardProvider.textContent = (feat.provider || "DRAMABOXD").toUpperCase();
      billboardTitle.textContent = feat.title || "Drama Pilihan";
      billboardDesc.textContent = `${feat.episodeCount ? feat.episodeCount + " Episode. " : ""}${feat.tags ? feat.tags.join(" • ") : "Drama pendek vertikal terpopuler hari ini."}`;
      if (feat.cover) {
        billboardBg.style.backgroundImage = `url('${feat.cover}')`;
      }
      billboardPlayBtn.onclick = () => openDramaDetail(feat.provider, feat.id, 0, true);
      billboardInfoBtn.onclick = () => openDramaDetail(feat.provider, feat.id, 0, false);
    }

    renderHomeGenreFilterBar();
    renderCatalogRows(data.rows || []);
  } catch (err) {
    rowsContainer.innerHTML = `<div class="loader">Gagal memuat katalog: ${err.message}</div>`;
  }
}

function renderCatalogRows(rows) {
  rowsContainer.innerHTML = "";
  if (!rows || rows.length === 0) {
    rowsContainer.innerHTML = `<div class="loader">${t("noResults")}</div>`;
    return;
  }

  rows.forEach((row) => {
    if (!row.items || row.items.length === 0) return;

    const rowEl = document.createElement("section");
    rowEl.className = "category-row";

    const headerEl = document.createElement("div");
    headerEl.className = "row-header";

    const titleEl = document.createElement("h2");
    titleEl.className = "row-title";
    titleEl.textContent = row.title;
    headerEl.appendChild(titleEl);
    rowEl.appendChild(headerEl);

    const sliderEl = document.createElement("div");
    sliderEl.className = "row-slider";

    row.items.forEach((item) => {
      const card = createDramaCard(item, row.provider);
      sliderEl.appendChild(card);
    });

    rowEl.appendChild(sliderEl);
    rowsContainer.appendChild(rowEl);
  });
}

// 7. Genre Filter Bar di Beranda
async function renderHomeGenreFilterBar() {
  if (!homeGenreFilterBar) return;
  try {
    if (allGenresCache.length === 0) {
      const res = await Api.getGenres();
      allGenresCache = res.genres || [];
    }

    homeGenreFilterBar.innerHTML = "";

    // Chip "Semua Genre"
    const allChip = document.createElement("button");
    allChip.className = `genre-chip ${selectedHomeGenre === "all" ? "active" : ""}`;
    allChip.textContent = t("genreAll");
    allChip.onclick = () => {
      selectedHomeGenre = "all";
      document.querySelectorAll(".genre-chip").forEach((c) => c.classList.remove("active"));
      allChip.classList.add("active");
      if (browseDataCache) renderCatalogRows(browseDataCache.rows || []);
    };
    homeGenreFilterBar.appendChild(allChip);

    const isEn = getLanguage() === "en";

    allGenresCache.forEach((genre) => {
      const chip = document.createElement("button");
      chip.className = `genre-chip ${selectedHomeGenre === genre.id ? "active" : ""}`;
      chip.textContent = `${genre.icon} ${isEn ? genre.nameEn : genre.nameId}`;
      chip.onclick = async () => {
        selectedHomeGenre = genre.id;
        document.querySelectorAll(".genre-chip").forEach((c) => c.classList.remove("active"));
        chip.classList.add("active");
        filterHomeCatalogByGenre(genre.id);
      };
      homeGenreFilterBar.appendChild(chip);
    });
  } catch (err) {
    console.warn("Gagal memuat filter genre:", err);
  }
}

async function filterHomeCatalogByGenre(genreId) {
  rowsContainer.innerHTML = `<div class="loader">${t("loadingCatalog")}</div>`;
  try {
    const res = await Api.getDramasByGenre(genreId);
    const dramas = res.dramas || [];

    rowsContainer.innerHTML = "";
    if (dramas.length === 0) {
      rowsContainer.innerHTML = `<div class="loader">${t("genreEmpty")}</div>`;
      return;
    }

    const rowEl = document.createElement("section");
    rowEl.className = "category-row";

    const headerEl = document.createElement("div");
    headerEl.className = "row-header";

    const isEn = getLanguage() === "en";
    const genre = allGenresCache.find((g) => g.id === genreId);
    const genreName = genre ? (isEn ? genre.nameEn : genre.nameId) : genreId;

    const titleEl = document.createElement("h2");
    titleEl.className = "row-title";
    titleEl.textContent = `${genre?.icon || "🎬"} ${genreName} (${dramas.length} Drama)`;
    headerEl.appendChild(titleEl);
    rowEl.appendChild(headerEl);

    const gridEl = document.createElement("div");
    gridEl.className = "platforms-grid";
    gridEl.style.marginTop = "16px";

    dramas.forEach((drama) => {
      const card = createDramaCard(drama, drama.provider);
      gridEl.appendChild(card);
    });

    rowEl.appendChild(gridEl);
    rowsContainer.appendChild(rowEl);
  } catch (err) {
    rowsContainer.innerHTML = `<div class="loader">Gagal memfilter genre: ${err.message}</div>`;
  }
}

// 8. Dedicated Genre View
async function loadGenresView() {
  try {
    if (allGenresCache.length === 0) {
      const res = await Api.getGenres();
      allGenresCache = res.genres || [];
    }

    genresGrid.innerHTML = "";
    if (genreDramasContainer) genreDramasContainer.style.display = "none";

    const isEn = getLanguage() === "en";

    allGenresCache.forEach((genre) => {
      const card = document.createElement("div");
      card.className = "genre-card";
      card.onclick = () => selectGenreInGenreView(genre);

      card.innerHTML = `
        <div class="genre-card-icon">${genre.icon}</div>
        <div class="genre-card-name">${isEn ? genre.nameEn : genre.nameId}</div>
        <div class="genre-card-desc">${genre.description}</div>
      `;
      genresGrid.appendChild(card);
    });
  } catch (err) {
    genresGrid.innerHTML = `<div class="loader">Gagal memuat genre: ${err.message}</div>`;
  }
}

async function selectGenreInGenreView(genre) {
  const cards = genresGrid.querySelectorAll(".genre-card");
  cards.forEach((c) => c.classList.remove("active"));
  event.currentTarget?.classList.add("active");

  const isEn = getLanguage() === "en";
  const genreName = isEn ? genre.nameEn : genre.nameId;

  if (genreDramasContainer) {
    genreDramasContainer.style.display = "block";
    selectedGenreTitle.textContent = `${genre.icon} Koleksi ${genreName}`;
    genreDramasGrid.innerHTML = `<div class="loader">${t("loadingCatalog")}</div>`;

    try {
      const res = await Api.getDramasByGenre(genre.id);
      currentGenreDramas = res.dramas || [];
      const sortOption = genreSortSelect?.value || "popular";
      const sorted = sortDramas(currentGenreDramas, sortOption);
      renderDramasToGrid(sorted, genreDramasGrid);
      genreDramasContainer.scrollIntoView({ behavior: "smooth" });
    } catch (err) {
      genreDramasGrid.innerHTML = `<div class="loader">Gagal memuat drama: ${err.message}</div>`;
    }
  }
}

// Helper Pembuatan Drama Card Vertikal
// Helper Pembuatan Drama Card Vertikal (Dengan Quick Action Hover)
function createDramaCard(item, provider, options = {}) {
  const card = document.createElement("div");
  card.className = "drama-card";
  card.onclick = (e) => {
    if (e.target.closest(".card-delete-btn") || e.target.closest(".quick-btn")) return;
    openDramaDetail(provider, item.id);
  };

  const deleteBtnHtml = options.showDelete
    ? `<button class="card-delete-btn" title="${t("deleteItem")}">✕</button>`
    : "";

  const inList = Store.isInMyList(provider, item.id);
  const bookmarkIcon = inList ? "✓" : "🔖";

  card.innerHTML = `
    <div class="card-img-wrapper">
      <span class="card-badge">${(provider || "").toUpperCase()}</span>
      ${deleteBtnHtml}
      <img class="card-img" src="${item.cover || ""}" alt="${item.title}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 200 300\\' fill=\\'%23121218\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
      
      <!-- Quick Action Buttons on Hover -->
      <div class="card-quick-actions">
        <button class="quick-btn quick-play-btn" title="Putar Cepat">▶</button>
        <button class="quick-btn quick-bookmark-btn" title="Simpan ke Daftar">${bookmarkIcon}</button>
      </div>

      <div class="card-overlay">
        <div class="card-title">${item.title}</div>
        <div class="card-meta">
          <span>${provider.toUpperCase()}</span>
          ${item.episodeCount ? `<span class="card-episodes">${item.episodeCount} Ep</span>` : ""}
        </div>
      </div>
    </div>
  `;

  // Quick Play handler
  const playBtn = card.querySelector(".quick-play-btn");
  if (playBtn) {
    playBtn.onclick = (e) => {
      e.stopPropagation();
      openDramaDetail(provider, item.id, 0, true);
    };
  }

  // Quick Bookmark handler
  const bkmkBtn = card.querySelector(".quick-bookmark-btn");
  if (bkmkBtn) {
    bkmkBtn.onclick = (e) => {
      e.stopPropagation();
      const nowInList = Store.toggleMyList({ ...item, provider });
      bkmkBtn.textContent = nowInList ? "✓" : "🔖";
      bkmkBtn.style.color = nowInList ? "#46D369" : "#fff";
    };
  }

  // Delete button handler (for library view)
  if (options.showDelete && options.onDelete) {
    const delBtn = card.querySelector(".card-delete-btn");
    if (delBtn) {
      delBtn.onclick = (e) => {
        e.stopPropagation();
        options.onDelete(item);
      };
    }
  }

  return card;
}

// 9. Platforms View (Direktori Platform ala dramaflix.net/id/platforms)
async function loadPlatformsView() {
  try {
    if (allPlatformsCache.length === 0) {
      const res = await Api.getPlatforms();
      allPlatformsCache = res.platforms || [];
    }
    renderPlatformGrid("all");
    setupPlatformFilters();
  } catch (err) {
    platformsGrid.innerHTML = `<div class="loader">Gagal memuat platform: ${err.message}</div>`;
  }
}

function renderPlatformGrid(filterType) {
  platformsGrid.innerHTML = "";
  const filtered = allPlatformsCache.filter((p) => {
    if (filterType === "active") return p.status === "active";
    if (filterType === "planned") return p.status === "planned" || p.status === "coming_soon";
    return true;
  });

  filtered.forEach((p) => {
    const card = document.createElement("div");
    card.className = "platform-card";
    const statusClass = p.status === "active" ? "badge-active" : p.status === "planned" ? "badge-planned" : "badge-coming";
    const statusText = p.status === "active" ? t("statusActive") : p.status === "planned" ? t("statusPlanned") : t("statusComingSoon");

    card.onclick = () => {
      if (p.status === "active") {
        searchInput.value = p.name;
        performGlobalSearch();
      }
    };

    card.innerHTML = `
      <img class="platform-icon" src="${p.icon || ''}" alt="${p.name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 50 50\\' fill=\\'%23222\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
      <div class="platform-info">
        <div class="platform-name">${p.name}</div>
        <div class="platform-count">${p.dramaCount.toLocaleString()} drama</div>
        <span class="platform-status-badge ${statusClass}">${statusText}</span>
      </div>
    `;
    platformsGrid.appendChild(card);
  });
}

function setupPlatformFilters() {
  const chips = document.querySelectorAll(".filter-chip");
  chips.forEach((chip) => {
    chip.onclick = () => {
      chips.forEach((c) => c.classList.remove("active"));
      chip.classList.add("active");
      renderPlatformGrid(chip.getAttribute("data-filter"));
    };
  });
}

// 10. Global Multi-Provider Search
async function performGlobalSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  switchView("search");
  searchResultTitle.textContent = `${t("searchResultsFor", { query })}`;
  searchResultsGrid.innerHTML = `<div class="loader">${t("loadingCatalog")}</div>`;

  try {
    const data = await Api.searchGlobal(query);
    currentSearchResults = data.flat || [];
    const sortOption = searchSortSelect?.value || "popular";
    const sorted = sortDramas(currentSearchResults, sortOption);
    renderDramasToGrid(sorted, searchResultsGrid);
  } catch (err) {
    searchResultsGrid.innerHTML = `<div class="loader">Pencarian gagal: ${err.message}</div>`;
  }
}

searchBtn.onclick = () => {
  if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
  performGlobalSearch();
};

searchInput.onkeydown = (e) => {
  if (e.key === "Enter") {
    if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
    performGlobalSearch();
  } else if (e.key === "Escape") {
    if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
  }
};

// Debounced Auto-Suggest
searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  clearTimeout(searchSuggestTimer);

  if (query.length < 2) {
    if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
    return;
  }

  searchSuggestTimer = setTimeout(async () => {
    try {
      const suggestions = await Api.getSearchSuggestions(query);
      if (!suggestions || suggestions.length === 0) {
        if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
        return;
      }

      searchSuggestDropdown.innerHTML = "";
      suggestions.forEach((item) => {
        const row = document.createElement("div");
        row.className = "suggest-item";
        row.onclick = () => {
          searchSuggestDropdown.style.display = "none";
          openDramaDetail(item.provider, item.id);
        };

        const thumb = item.cover || "";
        row.innerHTML = `
          <img class="suggest-thumb" src="${thumb}" alt="${item.title}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 34 48\\' fill=\\'%23111\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
          <div class="suggest-info">
            <div class="suggest-title">${item.title}</div>
            <div class="suggest-meta">
              <span class="suggest-badge">${(item.provider || "").toUpperCase()}</span>
              ${item.episodeCount ? `<span>${item.episodeCount} Ep</span>` : ""}
            </div>
          </div>
        `;
        searchSuggestDropdown.appendChild(row);
      });

      searchSuggestDropdown.style.display = "flex";
    } catch {
      if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
    }
  }, 250);
});

// Dismiss dropdown on click outside
document.addEventListener("click", (e) => {
  if (!e.target.closest(".search-container")) {
    if (searchSuggestDropdown) searchSuggestDropdown.style.display = "none";
  }
});

// 11. My List / My Library View (Bookmarks & Watch History)
function renderMyListView() {
  if (!myListGrid) return;
  myListGrid.innerHTML = "";
  const isHistory = currentLibTab === "history";
  const rawList = isHistory ? Store.getWatchHistory() : Store.getMyList();

  // Setup platform filter options
  if (libPlatformFilter) {
    const providers = Array.from(new Set(rawList.map((item) => item.provider).filter(Boolean)));
    libPlatformFilter.innerHTML = `<option value="all">${t("filterAll")}</option>`;
    providers.forEach((prov) => {
      const opt = document.createElement("option");
      opt.value = prov;
      opt.textContent = prov.toUpperCase();
      if (prov === currentLibPlatform) opt.selected = true;
      libPlatformFilter.appendChild(opt);
    });
  }

  const filtered = currentLibPlatform === "all"
    ? rawList
    : rawList.filter((item) => item.provider === currentLibPlatform);

  if (filtered.length === 0) {
    const emptyMsg = isHistory ? t("historyEmpty") : t("myListEmpty");
    myListGrid.innerHTML = `<div class="loader">${emptyMsg}</div>`;
    return;
  }

  filtered.forEach((item) => {
    const card = createDramaCard(item, item.provider, {
      showDelete: true,
      onDelete: (target) => {
        if (isHistory) {
          Store.removeFromHistory(target.provider, target.id);
        } else {
          Store.removeFromMyList(target.provider, target.id);
        }
        renderMyListView();
        renderContinueWatching();
      },
    });
    myListGrid.appendChild(card);
  });
}

// Library Tabs & Action Listeners
libTabBookmarks?.addEventListener("click", () => {
  currentLibTab = "bookmarks";
  libTabBookmarks.classList.add("active");
  libTabHistory?.classList.remove("active");
  renderMyListView();
});

libTabHistory?.addEventListener("click", () => {
  currentLibTab = "history";
  libTabHistory.classList.add("active");
  libTabBookmarks?.classList.remove("active");
  renderMyListView();
});

libPlatformFilter?.addEventListener("change", (e) => {
  currentLibPlatform = e.target.value;
  renderMyListView();
});

libClearAllBtn?.addEventListener("click", () => {
  if (confirm(t("clearConfirm"))) {
    if (currentLibTab === "history") {
      Store.clearWatchHistory();
    } else {
      Store.clearMyList();
    }
    renderMyListView();
    renderContinueWatching();
  }
});

// 12. Drama Detail Modal (Quick Preview) & Transition to 3-Column Watch Page
async function openDramaDetail(provider, id, initialEpisodeIndex = 0, autoPlay = false) {
  modalTitle.textContent = t("loadingEpisodes");
  modalSynopsis.textContent = "";
  modalProviderBadge.textContent = provider.toUpperCase();
  modalEpCountBadge.textContent = "";
  episodeGrid.innerHTML = `<div class="loader">${t("loadingEpisodes")}</div>`;

  if (!autoPlay) {
    detailModal.classList.add("active");
  }

  try {
    const data = await Api.getDramaDetail(provider, id);
    currentModalDrama = { ...data.detail, provider };
    currentModalEpisodes = data.episodes || [];

    modalTitle.textContent = data.detail.title || "Tanpa Judul";
    modalSynopsis.textContent = data.detail.synopsis || "Tidak ada deskripsi sinopsis.";
    modalEpCountBadge.textContent = t("episodesCount", { count: currentModalEpisodes.length });

    if (data.detail.cover) {
      modalBanner.style.backgroundImage = `url('${data.detail.cover}')`;
    }

    // Sinkronkan Tombol Bookmark My List
    updateBookmarkButton(provider, id);
    modalBookmarkBtn.onclick = () => {
      const inList = Store.toggleMyList(currentModalDrama);
      updateBookmarkButton(provider, id);
    };

    // Tombol Putar -> Masuk ke Dedicated 3-Column Watch View
    modalPlayBtn.onclick = () => {
      detailModal.classList.remove("active");
      switchView("watch");
      player.loadDrama(currentModalDrama, currentModalEpisodes, initialEpisodeIndex);
    };

    // Render Episode Grid di Modal Preview
    episodeGrid.innerHTML = "";
    if (currentModalEpisodes.length === 0) {
      episodeGrid.innerHTML = `<p style="color:#888;">Tidak ada episode yang tersedia.</p>`;
      return;
    }

    currentModalEpisodes.forEach((ep, idx) => {
      const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : idx + 1;
      const epCard = document.createElement("div");
      epCard.className = `ep-card ${idx === initialEpisodeIndex ? "playing" : ""}`;
      epCard.onclick = () => {
        detailModal.classList.remove("active");
        switchView("watch");
        player.loadDrama(currentModalDrama, currentModalEpisodes, idx);
      };

      const durationStr = ep.duration ? `${Math.round(ep.duration)}s` : "";
      epCard.innerHTML = `
        <div class="ep-card-num">Ep ${epNum}</div>
        <div class="ep-card-sub">${durationStr} ${ep.locked ? "🔒" : "✓"}</div>
      `;
      episodeGrid.appendChild(epCard);
    });

    if (autoPlay && currentModalEpisodes.length > 0) {
      detailModal.classList.remove("active");
      switchView("watch");
      player.loadDrama(currentModalDrama, currentModalEpisodes, initialEpisodeIndex);
    }
  } catch (err) {
    modalSynopsis.textContent = `Gagal memuat detail: ${err.message}`;
    episodeGrid.innerHTML = "";
  }
}

function updateBookmarkButton(provider, id) {
  const inList = Store.isInMyList(provider, id);
  modalBookmarkBtn.textContent = inList ? t("modalInList") : t("modalAddList");
  modalBookmarkBtn.style.color = inList ? "#46D369" : "#fff";
}

modalCloseBtn.onclick = () => detailModal.classList.remove("active");
modalBackdrop.onclick = () => detailModal.classList.remove("active");

// Inisialisasi Aplikasi Saat Startup
applyI18n();
initStatus();
renderContinueWatching();
loadHomeBrowse();
