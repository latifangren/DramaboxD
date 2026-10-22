// DramaboxD HTTP API Client

export const Api = {
  async getStatus() {
    const res = await fetch("/api/status");
    if (!res.ok) throw new Error("Gagal memeriksa status server");
    return await res.json();
  },

  async getBrowse() {
    const res = await fetch("/api/browse");
    if (!res.ok) throw new Error("Gagal mengambil katalog browse");
    return await res.json();
  },

  async getPlatforms() {
    const res = await fetch("/api/platforms");
    if (!res.ok) throw new Error("Gagal mengambil direktori platform");
    return await res.json();
  },

  async getGenres() {
    const res = await fetch("/api/genres");
    if (!res.ok) throw new Error("Gagal mengambil daftar genre");
    return await res.json();
  },

  async getDramasByGenre(slug, sort = "popular") {
    const res = await fetch(`/api/genres/${encodeURIComponent(slug)}?sort=${encodeURIComponent(sort)}`);
    if (!res.ok) throw new Error(`Gagal mengambil drama untuk genre ${slug}`);
    return await res.json();
  },

  async searchSingle(provider, query) {
    const url = `/api/search?q=${encodeURIComponent(query)}&provider=${encodeURIComponent(provider)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Pencarian gagal di ${provider}`);
    return await res.json();
  },

  async searchGlobal(query) {
    const url = `/api/search/global?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Pencarian global gagal");
    return await res.json();
  },

  async getSearchSuggestions(query) {
    const url = `/api/search/suggest?q=${encodeURIComponent(query)}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return data.suggestions || [];
  },

  async getDramaDetail(provider, id) {
    const url = `/api/drama/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Gagal mengambil detail drama ${id}`);
    }
    return await res.json();
  },

  async resolveEpisodeStream(provider, id, epIndex, epId) {
    const url = `/api/drama/${encodeURIComponent(provider)}/${encodeURIComponent(id)}/episode/${epIndex}${epId ? `?epId=${encodeURIComponent(epId)}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Gagal mengambil stream episode ${epIndex}`);
    }
    return await res.json();
  },

  getStreamProxyUrl(rawUrl) {
    if (!rawUrl) return "";
    return `/api/stream?url=${encodeURIComponent(rawUrl)}`;
  },
};
