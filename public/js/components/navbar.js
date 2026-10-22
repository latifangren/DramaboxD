import { api } from "../api/client.js";
import { applyToDom, setLanguage, t } from "../i18n/index.js";

/** Navbar: efek scroll, badge LAN, pencarian, dan pengalih bahasa ID/EN. */
export function initNavbar({ onSearch, onNavigate }) {
  const navbar = document.getElementById("navbar");
  const lanBadge = document.getElementById("lanBadge");
  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  window.addEventListener("scroll", () => {
    navbar.classList.toggle("scrolled", window.scrollY > 40);
  });

  const submit = () => {
    const q = searchInput.value.trim();
    if (q) onSearch(q);
  };
  searchBtn.onclick = submit;
  searchInput.onkeydown = (e) => {
    if (e.key === "Enter") submit();
  };

  document.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.onclick = () => setLanguage(btn.dataset.lang);
  });
  document.querySelectorAll("[data-nav]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      onNavigate(el.dataset.nav);
    });
  });
  applyToDom();

  api
    .status()
    .then((data) => {
      lanBadge.textContent =
        data.lanIps?.length > 0 ? t("status.lan", { ip: data.lanIps[0] }) : "LAN Ready";
    })
    .catch(() => {
      lanBadge.textContent = t("status.offline");
    });
}
