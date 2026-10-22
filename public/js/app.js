// DramaboxD SPA — router hash + inisialisasi komponen.
import { initDetailModal } from "./components/episode-drawer.js";
import { initNavbar } from "./components/navbar.js";
import { initPlayer } from "./components/vertical-player.js";
import { applyToDom, onLanguageChange } from "./i18n/index.js";
import { renderHome } from "./views/home.view.js";
import { renderPlatforms } from "./views/platforms.view.js";
import { renderSearch } from "./views/search.view.js";
import { renderWatch } from "./views/watch.view.js";

const container = document.getElementById("view-container");

function navigate(hash) {
  if (location.hash !== hash) location.hash = hash;
  else route();
}

function route() {
  const hash = location.hash || "#/";
  const [, view, a, b] = hash.split("/");
  window.scrollTo(0, 0);
  if (view === "platforms") return renderPlatforms(container);
  if (view === "search") return renderSearch(container, decodeURIComponent(a ?? ""));
  if (view === "watch" && a && b) return renderWatch(container, a, decodeURIComponent(b));
  return renderHome(container);
}

initNavbar({
  onSearch: (q) => navigate(`#/search/${encodeURIComponent(q)}`),
  onNavigate: (target) => navigate(target === "platforms" ? "#/platforms" : "#/"),
});
initDetailModal();
initPlayer();
onLanguageChange(() => {
  applyToDom();
  route();
});
window.addEventListener("hashchange", route);
route();
