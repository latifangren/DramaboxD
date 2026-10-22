// Keadaan sesi menonton saat ini (drama + episode yang sedang dibuka).
let currentDrama = null;
let currentEpisodes = [];
let currentEpisodeIndex = 0;

export function setDrama(drama, episodes) {
  currentDrama = drama;
  currentEpisodes = episodes ?? [];
  currentEpisodeIndex = 0;
}

export function getDrama() {
  return currentDrama;
}

export function getEpisodes() {
  return currentEpisodes;
}

export function setEpisodeIndex(index) {
  currentEpisodeIndex = index;
}

export function getEpisodeIndex() {
  return currentEpisodeIndex;
}
