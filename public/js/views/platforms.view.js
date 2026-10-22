import { api } from "../api/client.js";
import { createPlatformGrid } from "../components/platform-grid.js";
import { openDramaDetail } from "../components/episode-drawer.js";
import { createRow } from "../components/drama-card.js";
import { t } from "../i18n/index.js";

/** Halaman Platform: direktori aktif + segera hadir (pola dramaflix.net/id/platforms). */
export async function renderPlatforms(container) {
  document.getElementById("billboard").style.display = "none";
  container.innerHTML = `<div class="loader">${t("home.loading")}</div>`;
  try {
    const { platforms } = await api.platforms();
    container.innerHTML = "";
    const title = document.createElement("h1");
    title.className = "view-title";
    title.textContent = t("platforms.title");
    const sub = document.createElement("p");
    sub.className = "view-sub";
    sub.textContent = t("platforms.sub");
    container.appendChild(title);
    container.appendChild(sub);

    const active = platforms.filter((p) => p.status === "active");
    const soon = platforms.filter((p) => p.status !== "active");
    container.appendChild(
      createPlatformGrid(active, async (platform) => {
        // Klik platform aktif: tampilkan baris trending-nya sebagai pratinjau katalog.
        container.innerHTML = `<div class="loader">${t("home.loading")}</div>`;
        try {
          const data = await api.browse();
          const row = (data.rows ?? []).find((r) => r.provider === platform.slug);
          container.innerHTML = "";
          container.appendChild(title.cloneNode(true));
          if (row) container.appendChild(createRow(row.title, row.items, () => platform.slug, openDramaDetail));
          else container.innerHTML += `<div class="loader">${t("home.empty")}</div>`;
        } catch (err) {
          container.innerHTML = `<div class="loader">${t("home.loadError")}: ${err.message}</div>`;
        }
      }),
    );

    if (soon.length) {
      const soonTitle = document.createElement("h2");
      soonTitle.className = "view-title";
      soonTitle.textContent = t("platforms.comingSoonTitle");
      container.appendChild(soonTitle);
      container.appendChild(createPlatformGrid(soon, () => {}));
    }
  } catch (err) {
    container.innerHTML = `<div class="loader">${t("home.loadError")}: ${err.message}</div>`;
  }
}
