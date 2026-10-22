import { api } from "../api/client.js";
import { t } from "../i18n/index.js";
import { getDrama, getEpisodeIndex, getEpisodes, setEpisodeIndex } from "../store/session.js";
import { getHistoryEntry, getPrefs, setPref, touchHistory } from "../store/store.js";
import { markPlayingEpisode } from "./episode-drawer.js";

// Pemutar vertikal 9:16 (ARCHITECTURE.md §4.2): Hls.js + fallback native,
// lewati ±10 dtk, pilihan kecepatan, auto-next, menu subtitle, resume posisi.
let hlsInstance = null;
let lastHistoryWrite = 0;

const els = () => ({
  overlay: document.getElementById("playerOverlay"),
  video: document.getElementById("videoPlayer"),
  dramaTitle: document.getElementById("playerDramaTitle"),
  epTitle: document.getElementById("playerEpTitle"),
  nextBtn: document.getElementById("nextEpBtn"),
  error: document.getElementById("playerErrorMessage"),
  subMenu: document.getElementById("subtitleMenu"),
  subBtn: document.getElementById("subtitleBtn"),
});

function showError(msg) {
  const { error } = els();
  error.textContent = msg;
  error.style.display = "block";
}

function hideError() {
  els().error.style.display = "none";
}

function recordHistory(positionSeconds = 0) {
  const drama = getDrama();
  const episodes = getEpisodes();
  const ep = episodes[getEpisodeIndex()];
  if (!drama || !ep) return;
  touchHistory({
    provider: drama.provider,
    seriesId: drama.id,
    title: drama.title,
    cover: drama.cover,
    lastEpisode: ep.index || getEpisodeIndex() + 1,
    lastPositionSeconds: Math.floor(positionSeconds),
    durationSeconds: ep.duration ? Math.floor(ep.duration) : Math.floor(els().video.duration || 0),
  });
}

export function playEpisode(index, { resume = true } = {}) {
  const episodes = getEpisodes();
  const drama = getDrama();
  if (!episodes[index] || !drama) return;
  setEpisodeIndex(index);
  const ep = episodes[index];
  const { overlay, video, dramaTitle, epTitle, nextBtn } = els();

  dramaTitle.textContent = drama.title || "";
  epTitle.textContent = ep.title || t("common.episode", { n: ep.index || index + 1 });
  nextBtn.style.display = index < episodes.length - 1 ? "block" : "none";
  overlay.classList.add("active");
  hideError();
  buildSubtitleMenu([]);

  if (!ep.streamUrl) {
    showError(t("player.lockedMsg"));
    return;
  }

  const streamSrc = api.streamUrl(ep.streamUrl, drama.provider);
  const prefs = getPrefs();
  video.playbackRate = prefs.playbackRate || 1;

  let startAt = 0;
  if (resume) {
    const history = getHistoryEntry(drama.provider, drama.id);
    if (history && history.lastEpisode === (ep.index || index + 1) && history.lastPositionSeconds > 5) {
      startAt = history.lastPositionSeconds;
    }
  }
  const applyResume = () => {
    if (startAt > 0 && Number.isFinite(video.duration) && startAt < video.duration - 5) {
      video.currentTime = startAt;
    }
  };

  if (hlsInstance) {
    hlsInstance.destroy();
    hlsInstance = null;
  }

  if (ep.streamUrl.includes(".m3u8") && window.Hls?.isSupported()) {
    hlsInstance = new window.Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      fragLoadingRetryDelay: 1000,
      fragLoadingMaxRetry: 4,
    });
    hlsInstance.loadSource(streamSrc);
    hlsInstance.attachMedia(video);
    hlsInstance.on(window.Hls.Events.MANIFEST_PARSED, () => {
      applyResume();
      video.play().catch(() => {});
    });
    hlsInstance.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, (_e, data) => {
      buildSubtitleMenu((data.subtitleTracks ?? []).map((track, i) => ({ name: track.name || track.lang || `Track ${i + 1}`, hlsIndex: i })));
    });
    hlsInstance.on(window.Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return;
      if (data.type === window.Hls.ErrorTypes.NETWORK_ERROR) hlsInstance.startLoad();
      else if (data.type === window.Hls.ErrorTypes.MEDIA_ERROR) hlsInstance.recoverMediaError();
      else showError(t("player.error", { detail: data.details }));
    });
    // Track dari ekstraksi server (pelengkap bila manifest tidak diekspos hls.js).
    api
      .subtitles(ep.streamUrl, drama.provider)
      .then(({ tracks }) => {
        if (tracks?.length && !hlsInstance?.subtitleTracks?.length) {
          buildSubtitleMenu(tracks.map((track) => ({ name: track.name, url: track.url })));
        }
      })
      .catch(() => {});
  } else {
    video.src = streamSrc;
    video.addEventListener("loadedmetadata", applyResume, { once: true });
    video.play().catch(() => {});
  }

  recordHistory(startAt);
  markPlayingEpisode(index);
}

function buildSubtitleMenu(tracks) {
  const { subMenu, subBtn, video } = els();
  subMenu.innerHTML = "";
  const offBtn = document.createElement("button");
  offBtn.textContent = t("player.subOff");
  offBtn.onclick = () => {
    if (hlsInstance) hlsInstance.subtitleTrack = -1;
    for (const track of video.textTracks) track.mode = "disabled";
    subMenu.classList.remove("active");
  };
  subMenu.appendChild(offBtn);
  tracks.forEach((track) => {
    const btn = document.createElement("button");
    btn.textContent = track.name;
    btn.onclick = () => {
      if (track.hlsIndex !== undefined && hlsInstance) {
        hlsInstance.subtitleTrack = track.hlsIndex;
      } else if (track.url) {
        showError(`${t("player.subtitles")}: ${track.name} — ${track.url}`);
      }
      subMenu.classList.remove("active");
    };
    subMenu.appendChild(btn);
  });
  subBtn.style.display = tracks.length ? "block" : "none";
}

export function initPlayer() {
  const { overlay, video, nextBtn, subBtn, subMenu } = els();
  const episodesCount = () => getEpisodes().length;

  document.getElementById("playerCloseBtn").onclick = closePlayer;
  nextBtn.onclick = () => {
    if (getEpisodeIndex() < episodesCount() - 1) playEpisode(getEpisodeIndex() + 1, { resume: false });
  };
  document.getElementById("skipBackBtn").onclick = () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
  };
  document.getElementById("skipFwdBtn").onclick = () => {
    video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
  };
  document.getElementById("speedSelect").onchange = (e) => {
    const rate = Number.parseFloat(e.target.value);
    video.playbackRate = rate;
    setPref("playbackRate", rate);
  };
  document.getElementById("speedSelect").value = String(getPrefs().playbackRate || 1);
  const autoNextToggle = document.getElementById("autoNextToggle");
  autoNextToggle.checked = getPrefs().autoplayNext;
  autoNextToggle.onchange = () => setPref("autoplayNext", autoNextToggle.checked);
  subBtn.onclick = () => subMenu.classList.toggle("active");

  video.onended = () => {
    recordHistory(0);
    if (getPrefs().autoplayNext && getEpisodeIndex() < episodesCount() - 1) {
      playEpisode(getEpisodeIndex() + 1, { resume: false });
    }
  };
  video.ontimeupdate = () => {
    const now = Date.now();
    if (now - lastHistoryWrite > 5000 && video.currentTime > 0) {
      lastHistoryWrite = now;
      recordHistory(video.currentTime);
    }
  };
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closePlayer();
  });

  function closePlayer() {
    recordHistory(video.currentTime || 0);
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (hlsInstance) {
      hlsInstance.destroy();
      hlsInstance = null;
    }
    overlay.classList.remove("active");
  }
}
