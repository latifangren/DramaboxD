// DramaboxD Local Storage Store (Watch History, Resume, Favorites)

const HISTORY_KEY = "dramaboxd_watch_history";
const MY_LIST_KEY = "dramaboxd_my_list";
const PREFS_KEY = "dramaboxd_user_prefs";

const memoryStore = new Map();
const storage = {
  getItem(k) {
    if (typeof localStorage !== "undefined") {
      try { return localStorage.getItem(k); } catch { return null; }
    }
    return memoryStore.get(k) || null;
  },
  setItem(k, v) {
    if (typeof localStorage !== "undefined") {
      try { localStorage.setItem(k, v); return; } catch {}
    }
    memoryStore.set(k, String(v));
  },
  removeItem(k) {
    if (typeof localStorage !== "undefined") {
      try { localStorage.removeItem(k); return; } catch {}
    }
    memoryStore.delete(k);
  },
};

function emitEvent(name, detail) {
  if (typeof window !== "undefined" && typeof CustomEvent !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent(name, { detail }));
    } catch {}
  }
}

export const Store = {
  getWatchHistory() {
    try {
      const raw = storage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  saveWatchProgress({ provider, dramaId, title, cover, episodeIndex, episodeCount, currentTime, duration }) {
    if (!provider || !dramaId) return;
    try {
      const list = this.getWatchHistory();
      const existingIdx = list.findIndex((item) => item.provider === provider && item.id === dramaId);

      const entry = {
        provider,
        id: dramaId,
        title: title || "Drama",
        cover: cover || "",
        lastEpisodeIndex: episodeIndex,
        episodeCount: episodeCount || 0,
        currentTime: Math.floor(currentTime || 0),
        duration: Math.floor(duration || 0),
        updatedAt: Date.now(),
      };

      if (existingIdx >= 0) {
        list.splice(existingIdx, 1);
      }
      list.unshift(entry);

      // Simpan maksimal 30 drama terakhir
      const trimmed = list.slice(0, 30);
      storage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
      emitEvent("historyUpdated", trimmed);
    } catch (e) {
      console.warn("Gagal menyimpan progres tontonan:", e);
    }
  },

  getDramaProgress(provider, dramaId) {
    const list = this.getWatchHistory();
    return list.find((item) => item.provider === provider && item.id === dramaId) || null;
  },

  removeFromHistory(provider, dramaId) {
    const list = this.getWatchHistory().filter(
      (item) => !(item.provider === provider && item.id === dramaId),
    );
    storage.setItem(HISTORY_KEY, JSON.stringify(list));
    emitEvent("historyUpdated", list);
    return list;
  },

  clearWatchHistory() {
    storage.removeItem(HISTORY_KEY);
    emitEvent("historyUpdated", []);
  },

  getMyList() {
    try {
      const raw = storage.getItem(MY_LIST_KEY);
      if (!raw) return [];
      const list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  },

  isInMyList(provider, dramaId) {
    const list = this.getMyList();
    return list.some((item) => item.provider === provider && item.id === dramaId);
  },

  toggleMyList(drama) {
    if (!drama || !drama.provider || !drama.id) return false;
    const list = this.getMyList();
    const idx = list.findIndex((item) => item.provider === drama.provider && item.id === drama.id);
    let inList = false;

    if (idx >= 0) {
      list.splice(idx, 1);
      inList = false;
    } else {
      list.unshift({
        provider: drama.provider,
        id: drama.id,
        title: drama.title,
        cover: drama.cover,
        episodeCount: drama.episodeCount,
        addedAt: Date.now(),
      });
      inList = true;
    }

    storage.setItem(MY_LIST_KEY, JSON.stringify(list));
    emitEvent("myListUpdated", { list, inList });
    return inList;
  },

  removeFromMyList(provider, dramaId) {
    const list = this.getMyList().filter(
      (item) => !(item.provider === provider && item.id === dramaId),
    );
    storage.setItem(MY_LIST_KEY, JSON.stringify(list));
    emitEvent("myListUpdated", { list, inList: false });
    return list;
  },

  clearMyList() {
    storage.removeItem(MY_LIST_KEY);
    emitEvent("myListUpdated", { list: [], inList: false });
  },

  getPrefs() {
    try {
      const raw = storage.getItem(PREFS_KEY);
      return raw ? JSON.parse(raw) : { autoplay: true, speed: 1.0 };
    } catch {
      return { autoplay: true, speed: 1.0 };
    }
  },

  setPrefs(prefs) {
    const current = this.getPrefs();
    const updated = { ...current, ...prefs };
    storage.setItem(PREFS_KEY, JSON.stringify(updated));
  },
};
