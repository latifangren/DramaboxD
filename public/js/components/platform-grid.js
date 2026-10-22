import { t } from "../i18n/index.js";

/** Kartu direktori platform (aktif / segera hadir) untuk halaman Platform. */
export function createPlatformGrid(platforms, onOpenPlatform) {
  const grid = document.createElement("div");
  grid.className = "platform-grid";
  for (const platform of platforms) {
    const active = platform.status === "active";
    const card = document.createElement("div");
    card.className = "platform-card" + (active ? "" : " soon");
    const lang = document.documentElement.lang || "id";
    const desc = platform.description ? platform.description[lang] ?? platform.description.id : "";
    card.innerHTML = `
      <div class="platform-name">${platform.displayName}</div>
      <div class="platform-meta">
        <span class="status-badge ${active ? "active" : "soon"}">${active ? t("platforms.active") : t("platforms.comingSoon")}</span>
        ${platform.dramaCount != null ? `<span>${t("platforms.dramaCount", { count: platform.dramaCount })}</span>` : ""}
      </div>
      ${desc ? `<p class="platform-desc">${desc}</p>` : ""}
    `;
    if (active) card.onclick = () => onOpenPlatform(platform);
    grid.appendChild(card);
  }
  return grid;
}
