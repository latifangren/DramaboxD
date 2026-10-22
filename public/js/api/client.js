// Klien fetch tipis untuk endpoint /api/* — satu tempat menangani error JSON.

async function getJson(path) {
  const res = await fetch(path);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  status: () => getJson("/api/status"),
  browse: () => getJson("/api/browse"),
  platforms: () => getJson("/api/platforms"),
  searchGlobal: (q) => getJson(`/api/search/global?q=${encodeURIComponent(q)}`),
  searchOne: (provider, q) =>
    getJson(`/api/search?q=${encodeURIComponent(q)}&provider=${encodeURIComponent(provider)}`),
  drama: (provider, id) =>
    getJson(`/api/drama/${encodeURIComponent(provider)}/${encodeURIComponent(id)}`),
  subtitles: (manifestUrl, provider) =>
    getJson(
      `/api/subtitles?url=${encodeURIComponent(manifestUrl)}${provider ? `&provider=${encodeURIComponent(provider)}` : ""}`,
    ),
  streamUrl: (rawUrl, provider) =>
    `/api/stream?url=${encodeURIComponent(rawUrl)}${provider ? `&provider=${encodeURIComponent(provider)}` : ""}`,
};
