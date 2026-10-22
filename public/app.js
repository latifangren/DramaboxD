// DramaFlix WebUI Client
let currentDrama = null;
let currentEpisodes = [];
let currentEpisodeIndex = 0;
let hlsInstance = null;

// DOM Elements
const navbar = document.getElementById("navbar");
const lanBadge = document.getElementById("lanBadge");
const billboardBg = document.getElementById("billboardBg");
const billboardProvider = document.getElementById("billboardProvider");
const billboardTitle = document.getElementById("billboardTitle");
const billboardDesc = document.getElementById("billboardDesc");
const billboardPlayBtn = document.getElementById("billboardPlayBtn");
const billboardInfoBtn = document.getElementById("billboardInfoBtn");
const rowsContainer = document.getElementById("rows-container");

// Search elements
const providerSelect = document.getElementById("providerSelect");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

// Modal elements
const detailModal = document.getElementById("detailModal");
const modalBackdrop = document.getElementById("modalBackdrop");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalBanner = document.getElementById("modalBanner");
const modalTitle = document.getElementById("modalTitle");
const modalProviderBadge = document.getElementById("modalProviderBadge");
const modalEpCountBadge = document.getElementById("modalEpCountBadge");
const modalPlayBtn = document.getElementById("modalPlayBtn");
const modalSynopsis = document.getElementById("modalSynopsis");
const episodeGrid = document.getElementById("episodeGrid");

// Player elements
const playerOverlay = document.getElementById("playerOverlay");
const playerDramaTitle = document.getElementById("playerDramaTitle");
const playerEpTitle = document.getElementById("playerEpTitle");
const videoPlayer = document.getElementById("videoPlayer");
const nextEpBtn = document.getElementById("nextEpBtn");
const playerCloseBtn = document.getElementById("playerCloseBtn");
const playerErrorMessage = document.getElementById("playerErrorMessage");

// Navbar scroll styling
window.addEventListener("scroll", () => {
  if (window.scrollY > 40) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});

// 1. Inisialisasi: Cek status LAN & Provider
async function initStatus() {
  try {
    const res = await fetch("/api/status");
    const data = await res.json();
    if (data.lanIps && data.lanIps.length > 0) {
      lanBadge.textContent = `LAN: ${data.lanIps[0]}`;
    }
  } catch (err) {
    lanBadge.textContent = "Offline";
  }
}

// 2. Muat Browse Katalog (Trending & Latest)
async function loadBrowse() {
  try {
    const res = await fetch("/api/browse");
    const data = await res.json();

    // Render Billboard Hero
    if (data.featured) {
      const feat = data.featured;
      billboardProvider.textContent = (feat.provider || "DRAMA").toUpperCase();
      billboardTitle.textContent = feat.title || "Drama Pilihan";
      billboardDesc.textContent = `${feat.episodeCount ? feat.episodeCount + " Episode. " : ""}${feat.tags ? feat.tags.join(" • ") : "Drama pendek terpopuler hari ini."}`;
      if (feat.cover) {
        billboardBg.style.backgroundImage = `url('${feat.cover}')`;
      }
      billboardPlayBtn.onclick = () => openDramaDetail(feat.provider, feat.id, true);
      billboardInfoBtn.onclick = () => openDramaDetail(feat.provider, feat.id, false);
    }

    // Render Rows
    rowsContainer.innerHTML = "";
    if (!data.rows || data.rows.length === 0) {
      rowsContainer.innerHTML = `<div class="loader">Tidak ada drama yang ditemukan. Coba gunakan fitur cari.</div>`;
      return;
    }

    data.rows.forEach((row) => {
      const rowEl = document.createElement("section");
      rowEl.className = "category-row";

      const titleEl = document.createElement("h2");
      titleEl.className = "row-title";
      titleEl.textContent = row.title;
      rowEl.appendChild(titleEl);

      const sliderEl = document.createElement("div");
      sliderEl.className = "row-slider";

      row.items.forEach((item) => {
        const card = createDramaCard(item, row.provider);
        sliderEl.appendChild(card);
      });

      rowEl.appendChild(sliderEl);
      rowsContainer.appendChild(rowEl);
    });
  } catch (err) {
    rowsContainer.innerHTML = `<div class="loader">Gagal memuat katalog: ${err.message}</div>`;
  }
}

// Helper card pembuatan
function createDramaCard(item, provider) {
  const card = document.createElement("div");
  card.className = "drama-card";
  card.onclick = () => openDramaDetail(provider, item.id, false);

  const img = document.createElement("img");
  img.className = "card-img";
  img.referrerPolicy = "no-referrer";
  img.alt = item.title;
  img.loading = "lazy";
  img.onerror = () => {
    img.onerror = null;
    img.src = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23331111'/><stop offset='100%' stop-color='%23141414'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><text x='50%' y='50%' fill='%23e50914' font-family='sans-serif' font-weight='900' font-size='18' text-anchor='middle'>DRAMAFLIX</text></svg>`;
  };
  img.src = item.cover || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='150' fill='%23222'><rect width='100%' height='100%'/></svg>";

  const overlay = document.createElement("div");
  overlay.className = "card-overlay";

  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.title;

  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.innerHTML = `
    <span>${provider.toUpperCase()}</span>
    ${item.episodeCount ? `<span class="card-episodes">${item.episodeCount} Ep</span>` : ""}
  `;

  overlay.appendChild(title);
  overlay.appendChild(meta);
  card.appendChild(img);
  card.appendChild(overlay);

  return card;
}

// 3. Cari Drama
async function performSearch() {
  const query = searchInput.value.trim();
  const provider = providerSelect.value;
  if (!query) return;

  rowsContainer.innerHTML = `<div class="loader">Mencari "${query}" di ${provider}...</div>`;

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}`);
    const data = await res.json();

    rowsContainer.innerHTML = "";
    const rowEl = document.createElement("section");
    rowEl.className = "category-row";

    const titleEl = document.createElement("h2");
    titleEl.className = "row-title";
    titleEl.textContent = `Hasil Pencarian: "${query}" (${provider.toUpperCase()})`;
    rowEl.appendChild(titleEl);

    const sliderEl = document.createElement("div");
    sliderEl.className = "row-slider";

    if (!data.results || data.results.length === 0) {
      rowEl.innerHTML += `<p style="color:#888; padding: 20px 0;">Tidak ada judul yang cocok.</p>`;
    } else {
      data.results.forEach((item) => {
        const card = createDramaCard(item, provider);
        sliderEl.appendChild(card);
      });
      rowEl.appendChild(sliderEl);
    }

    rowsContainer.appendChild(rowEl);
  } catch (err) {
    rowsContainer.innerHTML = `<div class="loader">Gagal mencari: ${err.message}</div>`;
  }
}

searchBtn.onclick = performSearch;
searchInput.onkeydown = (e) => {
  if (e.key === "Enter") performSearch();
};

// 4. Modal Detail & Load Episode
async function openDramaDetail(provider, id, autoPlay = false) {
  modalTitle.textContent = "Memuat detail drama...";
  modalSynopsis.textContent = "";
  modalProviderBadge.textContent = provider.toUpperCase();
  modalEpCountBadge.textContent = "";
  episodeGrid.innerHTML = `<div class="loader">Mengambil daftar episode...</div>`;
  detailModal.classList.add("active");

  try {
    const res = await fetch(`/api/drama/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`);
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    currentDrama = { ...data.detail, provider };
    currentEpisodes = data.episodes || [];

    modalTitle.textContent = data.detail.title || "Tanpa Judul";
    modalSynopsis.textContent = data.detail.synopsis || "Tidak ada deskripsi sinopsis.";
    modalEpCountBadge.textContent = `${currentEpisodes.length} Episode`;
    modalPlayBtn.onclick = () => playEpisode(0);

    if (data.detail.cover) {
      modalBanner.style.backgroundImage = `url('${data.detail.cover}')`;
    }

    // Render list episode
    episodeGrid.innerHTML = "";
    if (currentEpisodes.length === 0) {
      episodeGrid.innerHTML = `<p style="color:#aaa;">Tidak ada stream episode yang tersedia.</p>`;
      return;
    }

    currentEpisodes.forEach((ep, idx) => {
      const epEl = document.createElement("div");
      epEl.className = "episode-item";
      epEl.onclick = () => {
        playEpisode(idx);
      };

      const durationStr = ep.duration ? `${Math.round(ep.duration)} dtk` : "";

      epEl.innerHTML = `
        <span class="ep-num">${ep.index || idx + 1}</span>
        <img class="ep-thumb" src="${ep.snapshot || data.detail.cover || ''}" alt="Ep ${ep.index || idx + 1}" loading="lazy">
        <div class="ep-details">
          <div class="ep-title">${ep.title || `Episode ${ep.index || idx + 1}`}</div>
          <div class="ep-dur">${durationStr} ${ep.locked ? '🔒 Terkunci' : '✓ Siap Putar'}</div>
        </div>
        <div class="ep-play-icon">▶</div>
      `;
      episodeGrid.appendChild(epEl);
    });

    if (autoPlay && currentEpisodes.length > 0) {
      playEpisode(0);
    }
  } catch (err) {
    modalSynopsis.textContent = `Gagal memuat episode: ${err.message}`;
    episodeGrid.innerHTML = "";
  }
}

// Tutup Modal
modalCloseBtn.onclick = () => detailModal.classList.remove("active");
modalBackdrop.onclick = () => detailModal.classList.remove("active");

// 5. Video Player & Streaming (Auto-Next)
function playEpisode(index) {
  if (!currentEpisodes[index]) return;
  currentEpisodeIndex = index;
  const ep = currentEpisodes[index];

  playerDramaTitle.textContent = currentDrama ? currentDrama.title : "Drama";
  playerEpTitle.textContent = ep.title || `Episode ${ep.index || index + 1}`;

  const rawUrl = ep.streamUrl;
  if (!rawUrl) {
    showPlayerError("Episode ini terkunci atau stream belum tersedia di provider.");
    return;
  }

  // Gunakan proxy lokal /api/stream untuk bypass CORS / CDN protection
  const streamSrc = `/api/stream?url=${encodeURIComponent(rawUrl)}`;

  // Update tombol berikutnya
  nextEpBtn.style.display = currentEpisodeIndex < currentEpisodes.length - 1 ? "block" : "none";

  playerOverlay.classList.add("active");
  hidePlayerError();

  // HLS stream vs direct MP4
  if (rawUrl.includes(".m3u8")) {
    if (Hls.isSupported()) {
      if (hlsInstance) hlsInstance.destroy();
      hlsInstance = new Hls({
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        fragLoadingRetryDelay: 1000,
        fragLoadingMaxRetry: 4,
      });
      hlsInstance.loadSource(streamSrc);
      hlsInstance.attachMedia(videoPlayer);
      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        videoPlayer.play().catch(() => {});
      });
      hlsInstance.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hlsInstance.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hlsInstance.recoverMediaError();
              break;
            default:
              showPlayerError(`Gagal memuat stream (${data.details}). Coba episode lain.`);
              break;
          }
        }
      });
    } else if (videoPlayer.canPlayType("application/vnd.apple.mpegurl")) {
      videoPlayer.src = streamSrc;
      videoPlayer.play().catch(() => {});
    }
  } else {
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    videoPlayer.src = streamSrc;
    videoPlayer.play().catch(() => {});
  }

  // Highlight di list modal
  const epItems = episodeGrid.querySelectorAll(".episode-item");
  epItems.forEach((el, i) => {
    if (i === index) el.classList.add("playing");
    else el.classList.remove("playing");
  });
}

function showPlayerError(msg) {
  playerErrorMessage.textContent = msg;
  playerErrorMessage.style.display = "block";
}

function hidePlayerError() {
  playerErrorMessage.textContent = "";
  playerErrorMessage.style.display = "none";
}

// Auto next episode ketika video selesai
videoPlayer.onended = () => {
  if (currentEpisodeIndex < currentEpisodes.length - 1) {
    playEpisode(currentEpisodeIndex + 1);
  }
};

nextEpBtn.onclick = () => {
  if (currentEpisodeIndex < currentEpisodes.length - 1) {
    playEpisode(currentEpisodeIndex + 1);
  }
};

playerCloseBtn.onclick = () => {
  videoPlayer.pause();
  videoPlayer.removeAttribute("src");
  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }
  playerOverlay.classList.remove("active");
};

// Start
initStatus();
loadBrowse();
