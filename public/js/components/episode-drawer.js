import { api } from "../api/client.js";
import { t } from "../i18n/index.js";
import { setDrama } from "../store/session.js";
import { playEpisode } from "./vertical-player.js";

/** Modal detail drama: banner, sinopsis, pil nomor episode + daftar episode. */
export async function openDramaDetail(provider, id, autoPlay = false) {
  const modal = document.getElementById("detailModal");
  const titleEl = document.getElementById("modalTitle");
  const synopsisEl = document.getElementById("modalSynopsis");
  const providerBadge = document.getElementById("modalProviderBadge");
  const epCountBadge = document.getElementById("modalEpCountBadge");
  const playBtn = document.getElementById("modalPlayBtn");
  const banner = document.getElementById("modalBanner");
  const pillsEl = document.getElementById("episodePills");
  const gridEl = document.getElementById("episodeGrid");

  titleEl.textContent = t("detail.loading");
  synopsisEl.textContent = "";
  providerBadge.textContent = provider.toUpperCase();
  epCountBadge.textContent = "";
  pillsEl.innerHTML = "";
  gridEl.innerHTML = `<div class="loader">${t("detail.loadingEpisodes")}</div>`;
  modal.classList.add("active");

  try {
    const data = await api.drama(provider, id);
    const episodes = data.episodes || [];
    setDrama({ ...data.detail, provider }, episodes);

    titleEl.textContent = data.detail.title || t("detail.noTitle");
    synopsisEl.textContent = data.detail.synopsis || t("detail.noSynopsis");
    epCountBadge.textContent = t("detail.episodeCount", { count: episodes.length });
    playBtn.textContent = t("detail.playFirst");
    playBtn.onclick = () => playEpisode(0);
    if (data.detail.cover) banner.style.backgroundImage = `url('${data.detail.cover}')`;

    pillsEl.innerHTML = "";
    episodes.forEach((ep, idx) => {
      const pill = document.createElement("button");
      pill.className = "ep-pill" + (ep.locked ? " locked" : "");
      pill.textContent = String(ep.index || idx + 1);
      pill.onclick = () => playEpisode(idx);
      pillsEl.appendChild(pill);
    });

    gridEl.innerHTML = "";
    if (episodes.length === 0) {
      gridEl.innerHTML = `<p style="color:#aaa;">${t("detail.noEpisodes")}</p>`;
      return;
    }
    episodes.forEach((ep, idx) => {
      const epEl = document.createElement("div");
      epEl.className = "episode-item";
      epEl.onclick = () => playEpisode(idx);
      const durationStr = ep.duration ? t("common.seconds", { n: Math.round(ep.duration) }) : "";
      epEl.innerHTML = `
        <span class="ep-num">${ep.index || idx + 1}</span>
        <img class="ep-thumb" src="${ep.snapshot || data.detail.cover || ""}" alt="" loading="lazy">
        <div class="ep-details">
          <div class="ep-title">${ep.title || t("common.episode", { n: ep.index || idx + 1 })}</div>
          <div class="ep-dur">${durationStr} ${ep.locked ? t("detail.locked") : t("detail.ready")}</div>
        </div>
        <div class="ep-play-icon">▶</div>
      `;
      gridEl.appendChild(epEl);
    });

    if (autoPlay && episodes.length > 0) playEpisode(0);
  } catch (err) {
    synopsisEl.textContent = `${t("detail.loadError")}: ${err.message}`;
    gridEl.innerHTML = "";
  }
}

export function initDetailModal() {
  const modal = document.getElementById("detailModal");
  document.getElementById("modalCloseBtn").onclick = () => modal.classList.remove("active");
  document.getElementById("modalBackdrop").onclick = () => modal.classList.remove("active");
}

/** Tandai episode yang sedang diputar di pil + daftar. */
export function markPlayingEpisode(index) {
  document.querySelectorAll("#episodePills .ep-pill").forEach((el, i) => {
    el.classList.toggle("playing", i === index);
  });
  document.querySelectorAll("#episodeGrid .episode-item").forEach((el, i) => {
    el.classList.toggle("playing", i === index);
  });
}
