import { t } from "../i18n/index.js";
import { getHistoryEntry, isFavorite, toggleFavorite } from "../store/store.js";

const FALLBACK_IMG =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='300' viewBox='0 0 200 300'><defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='%23331111'/><stop offset='100%' stop-color='%23141414'/></linearGradient></defs><rect width='100%' height='100%' fill='url(%23g)'/><text x='50%' y='50%' fill='%23e50914' font-family='sans-serif' font-weight='900' font-size='18' text-anchor='middle'>DRAMABOXD</text></svg>";

/** Kartu poster vertikal dengan lencana platform, tombol favorit, dan bar progres tonton. */
export function createDramaCard(item, provider, onOpen) {
  const card = document.createElement("div");
  card.className = "drama-card";
  card.onclick = () => onOpen(provider, item.id, false);

  const img = document.createElement("img");
  img.className = "card-img";
  img.referrerPolicy = "no-referrer";
  img.alt = item.title;
  img.loading = "lazy";
  img.onerror = () => {
    img.onerror = null;
    img.src = FALLBACK_IMG;
  };
  img.src = item.cover || FALLBACK_IMG;
  card.appendChild(img);

  const favBtn = document.createElement("button");
  favBtn.className = "fav-btn" + (isFavorite(provider, item.id) ? " active" : "");
  favBtn.textContent = "★";
  favBtn.title = t(isFavorite(provider, item.id) ? "fav.remove" : "fav.add");
  favBtn.onclick = (e) => {
    e.stopPropagation();
    const active = toggleFavorite(item, provider);
    favBtn.classList.toggle("active", active);
    favBtn.title = t(active ? "fav.remove" : "fav.add");
  };
  card.appendChild(favBtn);

  const overlay = document.createElement("div");
  overlay.className = "card-overlay";
  const title = document.createElement("h3");
  title.className = "card-title";
  title.textContent = item.title;
  const meta = document.createElement("div");
  meta.className = "card-meta";
  meta.innerHTML = `<span>${provider.toUpperCase()}</span>${
    item.episodeCount ? `<span class="card-episodes">${item.episodeCount} Ep</span>` : ""
  }`;
  overlay.appendChild(title);
  overlay.appendChild(meta);
  card.appendChild(overlay);

  const history = getHistoryEntry(provider, item.id);
  if (history?.durationSeconds > 0 && history?.lastPositionSeconds > 0) {
    const pct = Math.min(100, Math.round((history.lastPositionSeconds / history.durationSeconds) * 100));
    const bar = document.createElement("div");
    bar.className = "card-progress";
    bar.innerHTML = `<div style="width:${pct}%"></div>`;
    card.appendChild(bar);
  }

  return card;
}

/** Satu baris geser berisi kartu-kartu drama. */
export function createRow(title, items, providerOf, onOpen) {
  const rowEl = document.createElement("section");
  rowEl.className = "category-row";
  const titleEl = document.createElement("h2");
  titleEl.className = "row-title";
  titleEl.textContent = title;
  rowEl.appendChild(titleEl);
  const sliderEl = document.createElement("div");
  sliderEl.className = "row-slider";
  for (const item of items) sliderEl.appendChild(createDramaCard(item, providerOf(item), onOpen));
  rowEl.appendChild(sliderEl);
  return rowEl;
}
