import { api } from "../api/client.js";
import { renderBillboard } from "../components/billboard.js";
import { createRow } from "../components/drama-card.js";
import { openDramaDetail } from "../components/episode-drawer.js";
import { t } from "../i18n/index.js";
import { getFavorites, historyList } from "../store/store.js";

/** Beranda: billboard + Lanjutkan Menonton + Daftar Saya + baris per provider. */
export async function renderHome(container) {
  const billboard = document.getElementById("billboard");
  billboard.style.display = "";
  container.innerHTML = `<div class="loader">${t("home.loading")}</div>`;
  try {
    const data = await api.browse();
    renderBillboard(data.featured, openDramaDetail);
    container.innerHTML = "";

    const history = historyList().filter((h) => h.lastEpisode);
    if (history.length) {
      container.appendChild(
        createRow(
          t("home.continueWatching"),
          history.map((h) => ({ id: h.seriesId, title: h.title, cover: h.cover })),
          (item) => history.find((h) => h.seriesId === item.id)?.provider ?? "",
          openDramaDetail,
        ),
      );
    }

    const favorites = getFavorites();
    if (favorites.length) {
      container.appendChild(createRow(t("home.myList"), favorites, (item) => item.provider, openDramaDetail));
    }

    if (!data.rows?.length && !history.length && !favorites.length) {
      container.innerHTML = `<div class="loader">${t("home.empty")}</div>`;
      return;
    }
    for (const row of data.rows ?? []) {
      container.appendChild(createRow(row.title, row.items, () => row.provider, openDramaDetail));
    }
  } catch (err) {
    container.innerHTML = `<div class="loader">${t("home.loadError")}: ${err.message}</div>`;
  }
}
