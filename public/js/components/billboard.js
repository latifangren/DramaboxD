import { t } from "../i18n/index.js";

/** Hero billboard ala DramaFlix: poster, lencana platform, episode, sinopsis/tag, CTA. */
export function renderBillboard(featured, onOpen) {
  const bg = document.getElementById("billboardBg");
  const providerEl = document.getElementById("billboardProvider");
  const titleEl = document.getElementById("billboardTitle");
  const descEl = document.getElementById("billboardDesc");
  const playBtn = document.getElementById("billboardPlayBtn");
  const infoBtn = document.getElementById("billboardInfoBtn");
  if (!featured) {
    titleEl.textContent = "DramaboxD";
    descEl.textContent = t("billboard.defaultDesc");
    return;
  }
  providerEl.textContent = (featured.provider || "DRAMA").toUpperCase();
  titleEl.textContent = featured.title || "DramaboxD";
  const parts = [];
  if (featured.episodeCount) parts.push(t("detail.episodeCount", { count: featured.episodeCount }));
  if (featured.tags?.length) parts.push(featured.tags.join(" • "));
  descEl.textContent = parts.join(" — ") || t("billboard.defaultDesc");
  if (featured.cover) bg.style.backgroundImage = `url('${featured.cover}')`;
  playBtn.onclick = () => onOpen(featured.provider, featured.id, true);
  infoBtn.onclick = () => onOpen(featured.provider, featured.id, false);
}
