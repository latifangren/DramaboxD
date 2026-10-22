import { openDramaDetail } from "../components/episode-drawer.js";
import { getHistoryEntry } from "../store/store.js";
import { playEpisode } from "../components/vertical-player.js";
import { getEpisodes } from "../store/session.js";

/** Rute tonton langsung (#/watch/<provider>/<id>): buka detail, lanjutkan dari riwayat bila ada. */
export async function renderWatch(_container, provider, id) {
  document.getElementById("billboard").style.display = "none";
  await openDramaDetail(provider, id, false);
  const history = getHistoryEntry(provider, id);
  if (history?.lastEpisode) {
    const idx = getEpisodes().findIndex((ep) => (ep.index || 0) === history.lastEpisode);
    if (idx >= 0) playEpisode(idx);
  }
}
