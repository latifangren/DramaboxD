// Store klien persisten (localStorage) — riwayat tonton, favorit, preferensi.
// Bentuk mengikuti ARCHITECTURE.md §4.2.

const HISTORY_KEY = "dramaboxd.history";
const FAVORITES_KEY = "dramaboxd.favorites";
const PREFS_KEY = "dramaboxd.prefs";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* penyimpanan penuh — abaikan, UI tetap jalan */
  }
}

/** { "<provider>:<seriesId>": { provider, seriesId, title, cover, lastEpisode, lastPositionSeconds, durationSeconds, updatedAt } } */
export function getHistory() {
  return read(HISTORY_KEY, {});
}

export function historyList() {
  return Object.values(getHistory()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export function touchHistory(entry) {
  const history = getHistory();
  const key = `${entry.provider}:${entry.seriesId}`;
  history[key] = { ...(history[key] ?? {}), ...entry, updatedAt: Date.now() };
  write(HISTORY_KEY, history);
}

export function getHistoryEntry(provider, seriesId) {
  return getHistory()[`${provider}:${seriesId}`];
}

/** Favorit menyimpan snapshot ringkasan supaya baris "Daftar Saya" bisa dirender tanpa fetch. */
export function getFavorites() {
  return read(FAVORITES_KEY, []);
}

export function isFavorite(provider, seriesId) {
  return getFavorites().some((f) => f.provider === provider && f.id === seriesId);
}

export function toggleFavorite(summary, provider) {
  const favorites = getFavorites();
  const idx = favorites.findIndex((f) => f.provider === provider && f.id === summary.id);
  if (idx >= 0) {
    favorites.splice(idx, 1);
    write(FAVORITES_KEY, favorites);
    return false;
  }
  favorites.unshift({ ...summary, provider });
  write(FAVORITES_KEY, favorites);
  return true;
}

export function getPrefs() {
  return { autoplayNext: true, playbackRate: 1, ...read(PREFS_KEY, {}) };
}

export function setPref(name, value) {
  write(PREFS_KEY, { ...getPrefs(), [name]: value });
}
