import { api } from "../api/client.js";
import { createRow } from "../components/drama-card.js";
import { openDramaDetail } from "../components/episode-drawer.js";
import { t } from "../i18n/index.js";

/** Pencarian global: semua platform paralel, hasil dikelompokkan per platform. */
export async function renderSearch(container, query) {
  document.getElementById("billboard").style.display = "none";
  container.innerHTML = `<div class="loader">${t("search.searching", { q: query })}</div>`;
  try {
    const data = await api.searchGlobal(query);
    container.innerHTML = "";
    const title = document.createElement("h1");
    title.className = "view-title";
    title.textContent = t("search.title", { q: query });
    container.appendChild(title);

    const groups = (data.perProvider ?? []).filter((g) => g.results.length);
    if (!groups.length) {
      container.innerHTML += `<div class="loader">${t("search.noResults")}</div>`;
    }
    for (const group of groups) {
      container.appendChild(
        createRow(group.provider.toUpperCase(), group.results, () => group.provider, openDramaDetail),
      );
    }
    if (data.failures?.length) {
      const note = document.createElement("p");
      note.className = "view-sub";
      note.textContent = t("search.failedProviders", {
        names: data.failures.map((f) => f.provider).join(", "),
      });
      container.appendChild(note);
    }
  } catch (err) {
    container.innerHTML = `<div class="loader">${t("search.error")}: ${err.message}</div>`;
  }
}
