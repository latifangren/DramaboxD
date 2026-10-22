import { id } from "./id.js";
import { en } from "./en.js";

const DICTS = { id, en };
const KEY = "dramaboxd.lang";
let lang = localStorage.getItem(KEY) || "id";
const listeners = new Set();

export function getLanguage() {
  return lang;
}

export function t(key, params = {}) {
  const template = DICTS[lang]?.[key] ?? DICTS.id[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (_m, name) => String(params[name] ?? ""));
}

export function setLanguage(next) {
  if (!DICTS[next] || next === lang) return;
  lang = next;
  localStorage.setItem(KEY, lang);
  document.documentElement.lang = lang;
  applyToDom();
  for (const fn of listeners) fn(lang);
}

export function onLanguageChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Terapkan kamus ke elemen statis ber-atribut data-i18n / data-i18n-ph (placeholder). */
export function applyToDom(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => {
    el.placeholder = t(el.dataset.i18nPh);
  });
  root.querySelectorAll(".lang-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
}
