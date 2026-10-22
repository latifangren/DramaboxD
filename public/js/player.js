// DramaboxD Vertical 9:16 Video Player Controller (3-Column Layout Watch Page)
import { Api } from "./api.js";
import { t } from "./i18n.js";
import { Store } from "./store.js";

export class VerticalPlayer {
  constructor() {
    this.video = document.getElementById("videoPlayer");
    this.loader = document.getElementById("playerLoader");
    this.loaderText = document.getElementById("playerLoaderText");
    this.errorEl = document.getElementById("playerErrorMessage");

    // Controls
    this.playPauseBtn = document.getElementById("playerPlayPauseBtn");
    this.prevBtn = document.getElementById("playerPrevBtn");
    this.nextBtn = document.getElementById("playerNextBtn");
    this.skipBackBtn = document.getElementById("playerSkipBack");
    this.skipForwardBtn = document.getElementById("playerSkipForward");
    this.timeDisplay = document.getElementById("playerTimeDisplay");
    this.seekbarContainer = document.getElementById("playerProgressBarContainer");
    this.seekbarFill = document.getElementById("playerProgressBar");
    this.speedSelect = document.getElementById("playerSpeedSelect");
    this.subtitleSelect = document.getElementById("playerSubtitleSelect");
    this.autoplayToggle = document.getElementById("playerAutoplayToggle");
    this.fullscreenBtn = document.getElementById("playerFullscreenBtn");

    // Kolom Kiri: Metadata
    this.watchPoster = document.getElementById("watchPoster");
    this.watchTitle = document.getElementById("watchTitle");
    this.watchCurrentEp = document.getElementById("watchCurrentEp");
    this.watchEpCountChip = document.getElementById("watchEpCountChip");
    this.watchPlatformChip = document.getElementById("watchPlatformChip");
    this.watchSynopsis = document.getElementById("watchSynopsis");
    this.watchBookmarkBtn = document.getElementById("watchBookmarkBtn");
    this.watchBackBtn = document.getElementById("watchBackBtn");

    // Kolom Kanan: Grid Episode & UpNext
    this.watchEpTotalCount = document.getElementById("watchEpTotalCount");
    this.watchEpisodeGrid = document.getElementById("watchEpisodeGrid");
    this.watchUpNextList = document.getElementById("watchUpNextList");

    this.currentDrama = null;
    this.currentEpisodes = [];
    this.currentIndex = 0;
    this.hls = null;
    this.lastSavedTime = 0;
    this.onBackCallback = null;

    this.initEvents();
  }

  initEvents() {
    // Play / Pause toggle
    this.playPauseBtn?.addEventListener("click", () => this.togglePlay());
    this.video?.addEventListener("click", () => this.togglePlay());
    this.video?.addEventListener("play", () => this.updatePlayIcon(true));
    this.video?.addEventListener("pause", () => this.updatePlayIcon(false));

    // Navigasi episode
    this.prevBtn?.addEventListener("click", () => this.playEpisode(this.currentIndex - 1));
    this.nextBtn?.addEventListener("click", () => this.playEpisode(this.currentIndex + 1));

    // Skip ±10 detik
    this.skipBackBtn?.addEventListener("click", () => this.skip(-10));
    this.skipForwardBtn?.addEventListener("click", () => this.skip(10));

    // Seekbar click to seek
    this.seekbarContainer?.addEventListener("click", (e) => this.onSeekbarClick(e));

    // Kecepatan putar
    this.speedSelect?.addEventListener("change", (e) => {
      const speed = parseFloat(e.target.value);
      this.video.playbackRate = speed;
      Store.setPrefs({ speed });
    });

    // Toggle autoplay
    this.autoplayToggle?.addEventListener("change", (e) => {
      Store.setPrefs({ autoplay: e.target.checked });
    });

    // Layar Penuh
    this.fullscreenBtn?.addEventListener("click", () => this.toggleFullscreen());

    // Bookmark tombol di watch page
    this.watchBookmarkBtn?.addEventListener("click", () => {
      if (!this.currentDrama) return;
      const inList = Store.toggleMyList(this.currentDrama);
      this.updateBookmarkButton(inList);
    });

    // Tombol Kembali
    this.watchBackBtn?.addEventListener("click", () => {
      if (this.onBackCallback) this.onBackCallback();
    });

    // Video progress & tracking
    this.video?.addEventListener("timeupdate", () => this.onTimeUpdate());
    this.video?.addEventListener("ended", () => this.onEnded());
    this.video?.addEventListener("waiting", () => this.showLoader(t("loadingStream")));
    this.video?.addEventListener("playing", () => this.hideLoader());

    // Keyboard shortcuts
    window.addEventListener("keydown", (e) => {
      const watchView = document.getElementById("view-watch");
      if (!watchView || watchView.style.display === "none") return;
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          this.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          this.skip(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          this.skip(10);
          break;
        case "n":
        case "N":
          if (this.currentIndex < this.currentEpisodes.length - 1) {
            this.playEpisode(this.currentIndex + 1);
          }
          break;
        case "p":
        case "P":
          if (this.currentIndex > 0) {
            this.playEpisode(this.currentIndex - 1);
          }
          break;
        case "f":
        case "F":
          this.toggleFullscreen();
          break;
      }
    });

    // Sync saved prefs
    const prefs = Store.getPrefs();
    if (this.autoplayToggle) this.autoplayToggle.checked = prefs.autoplay ?? true;
    if (this.speedSelect) this.speedSelect.value = String(prefs.speed || 1.0);
  }

  loadDrama(drama, episodes, startIndex = 0) {
    this.currentDrama = drama;
    this.currentEpisodes = episodes || [];
    this.renderLeftMeta();
    this.renderRightEpisodeGrid();
    this.renderRightUpNext();
    this.playEpisode(startIndex);
  }

  renderLeftMeta() {
    if (!this.currentDrama) return;
    if (this.watchPoster) this.watchPoster.src = this.currentDrama.cover || "";
    if (this.watchTitle) this.watchTitle.textContent = this.currentDrama.title || "Drama";
    if (this.watchEpCountChip) {
      this.watchEpCountChip.textContent = t("episodesCount", { count: this.currentEpisodes.length });
    }
    if (this.watchPlatformChip) {
      this.watchPlatformChip.textContent = (this.currentDrama.provider || "").toUpperCase();
    }
    if (this.watchSynopsis) {
      this.watchSynopsis.textContent = this.currentDrama.synopsis || "Drama pendek vertikal kualitas tinggi.";
    }
    const inList = Store.isInMyList(this.currentDrama.provider, this.currentDrama.id);
    this.updateBookmarkButton(inList);
  }

  updateBookmarkButton(inList) {
    if (!this.watchBookmarkBtn) return;
    this.watchBookmarkBtn.textContent = inList ? t("modalInList") : `🔖 ${t("modalAddList")}`;
    this.watchBookmarkBtn.style.color = inList ? "#46D369" : "#fff";
  }

  renderRightEpisodeGrid() {
    if (!this.watchEpisodeGrid) return;
    this.watchEpisodeGrid.innerHTML = "";
    if (this.watchEpTotalCount) {
      this.watchEpTotalCount.textContent = String(this.currentEpisodes.length);
    }

    this.currentEpisodes.forEach((ep, idx) => {
      const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : idx + 1;
      const btn = document.createElement("button");
      btn.className = `ep-square-btn ${idx === this.currentIndex ? "active" : ""}`;
      btn.textContent = String(epNum);
      btn.title = `Episode ${epNum}`;
      btn.onclick = () => this.playEpisode(idx);
      this.watchEpisodeGrid.appendChild(btn);
    });
  }

  renderRightUpNext() {
    if (!this.watchUpNextList) return;
    this.watchUpNextList.innerHTML = "";
    const nextEpisodes = this.currentEpisodes.slice(this.currentIndex + 1, this.currentIndex + 5);

    if (nextEpisodes.length === 0) {
      this.watchUpNextList.innerHTML = `<div style="font-size:12px;color:#666;padding:8px 0;">Tidak ada episode selanjutnya.</div>`;
      return;
    }

    nextEpisodes.forEach((ep, relIdx) => {
      const absIdx = this.currentIndex + 1 + relIdx;
      const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : absIdx + 1;
      const item = document.createElement("div");
      item.className = "upnext-item";
      item.onclick = () => this.playEpisode(absIdx);

      const thumbUrl = ep.snapshot || this.currentDrama?.cover || "";
      const durStr = ep.duration ? `${Math.round(ep.duration)}s` : "";

      item.innerHTML = `
        <img class="upnext-thumb" src="${thumbUrl}" alt="Ep ${epNum}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 40 56\\' fill=\\'%23111\\'><rect width=\\'100%\\' height=\\'100%\\'/></svg>'">
        <div class="upnext-info">
          <div class="upnext-ep-title">Episode ${epNum}</div>
          <div class="upnext-ep-sub">${durStr} ${ep.locked ? '🔒' : '✓ Siap Putar'}</div>
        </div>
      `;
      this.watchUpNextList.appendChild(item);
    });
  }

  async playEpisode(index) {
    if (index < 0 || index >= this.currentEpisodes.length) return;
    this.currentIndex = index;
    const ep = this.currentEpisodes[index];
    const epNum = typeof ep.index === "number" && ep.index > 0 ? ep.index : index + 1;

    this.hideError();
    this.showLoader(t("loadingStream"));

    // Update label episode di kiri
    if (this.watchCurrentEp) {
      this.watchCurrentEp.textContent = t("episodeNum", { num: epNum });
    }

    // Highlight kotak episode di kanan
    const buttons = this.watchEpisodeGrid?.querySelectorAll(".ep-square-btn") || [];
    buttons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add("active");
        btn.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else {
        btn.classList.remove("active");
      }
    });

    // Update antrean selanjutnya
    this.renderRightUpNext();

    // Resolusi stream URL
    let rawStreamUrl = ep.streamUrl;
    if (!rawStreamUrl && this.currentDrama) {
      try {
        const resolved = await Api.resolveEpisodeStream(
          this.currentDrama.provider,
          this.currentDrama.id,
          epNum,
          ep.id,
        );
        if (resolved.streamUrl) {
          rawStreamUrl = resolved.streamUrl;
          ep.streamUrl = resolved.streamUrl;
          if (resolved.duration) ep.duration = resolved.duration;
        }
      } catch (err) {
        console.warn("Gagal resolve stream episode:", err);
      }
    }

    if (!rawStreamUrl) {
      this.hideLoader();
      this.showError(t("streamError"));
      return;
    }

    const streamSrc = Api.getStreamProxyUrl(rawStreamUrl);

    // Pulihkan saved speed
    const prefs = Store.getPrefs();
    this.video.playbackRate = prefs.speed || 1.0;

    // Load Stream via HLS vs MP4
    if (rawStreamUrl.includes(".m3u8")) {
      if (window.Hls && window.Hls.isSupported()) {
        if (this.hls) this.hls.destroy();

        this.hls = new window.Hls({
          maxBufferLength: 30,
          maxMaxBufferLength: 60,
          fragLoadingRetryDelay: 1000,
          fragLoadingMaxRetry: 4,
        });

        this.hls.loadSource(streamSrc);
        this.hls.attachMedia(this.video);

        this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          this.hideLoader();
          this.populateSubtitles();
          this.resumePosition();
          this.video.play().catch(() => {});
        });

        this.hls.on(window.Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
          this.populateSubtitles();
        });

        this.hls.on(window.Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case window.Hls.ErrorTypes.NETWORK_ERROR:
                this.hls.startLoad();
                break;
              case window.Hls.ErrorTypes.MEDIA_ERROR:
                this.hls.recoverMediaError();
                break;
              default:
                this.hideLoader();
                this.showError(t("streamError"));
                break;
            }
          }
        });
      } else if (this.video.canPlayType("application/vnd.apple.mpegurl")) {
        this.video.src = streamSrc;
        this.resumePosition();
        this.video.play().catch(() => {});
      }
    } else {
      if (this.hls) {
        this.hls.destroy();
        this.hls = null;
      }
      this.video.src = streamSrc;
      this.resumePosition();
      this.video.play().catch(() => {});
    }
  }

  togglePlay() {
    if (!this.video) return;
    if (this.video.paused) {
      this.video.play().catch(() => {});
    } else {
      this.video.pause();
    }
  }

  updatePlayIcon(isPlaying) {
    if (this.playPauseBtn) {
      this.playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
    }
  }

  skip(seconds) {
    if (!this.video) return;
    this.video.currentTime = Math.max(0, Math.min(this.video.duration || 0, this.video.currentTime + seconds));
  }

  onSeekbarClick(e) {
    if (!this.video || !this.video.duration || !this.seekbarContainer) return;
    const rect = this.seekbarContainer.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    this.video.currentTime = pct * this.video.duration;
  }

  onTimeUpdate() {
    if (!this.video || !this.video.duration) return;
    const cur = this.video.currentTime;
    const dur = this.video.duration;

    // Update progress bar
    if (this.seekbarFill) {
      const pct = (cur / dur) * 100;
      this.seekbarFill.style.width = `${pct}%`;
    }

    if (this.timeDisplay) {
      this.timeDisplay.textContent = `${this.formatTime(cur)} / ${this.formatTime(dur)}`;
    }

    // Auto-save progress setiap 3 detik
    if (Math.abs(cur - this.lastSavedTime) > 3) {
      this.lastSavedTime = cur;
      Store.saveWatchProgress({
        provider: this.currentDrama?.provider,
        dramaId: this.currentDrama?.id,
        title: this.currentDrama?.title,
        cover: this.currentDrama?.cover,
        episodeIndex: this.currentIndex,
        episodeCount: this.currentEpisodes.length,
        currentTime: cur,
        duration: dur,
      });
    }
  }

  onEnded() {
    const prefs = Store.getPrefs();
    if (prefs.autoplay && this.currentIndex < this.currentEpisodes.length - 1) {
      this.playEpisode(this.currentIndex + 1);
    }
  }

  resumePosition() {
    const progress = Store.getDramaProgress(this.currentDrama?.provider, this.currentDrama?.id);
    if (progress && progress.lastEpisodeIndex === this.currentIndex && progress.currentTime > 5) {
      if (progress.duration && progress.currentTime < progress.duration - 5) {
        this.video.currentTime = progress.currentTime;
      }
    }
  }

  populateSubtitles() {
    if (!this.subtitleSelect || !this.hls) return;
    const tracks = this.hls.subtitleTracks || [];
    this.subtitleSelect.innerHTML = `<option value="-1">${t("playerSubNone")}</option>`;

    if (tracks.length === 0) {
      this.subtitleSelect.style.display = "none";
      return;
    }

    this.subtitleSelect.style.display = "inline-block";
    let autoSelectIdx = -1;

    tracks.forEach((track, idx) => {
      const opt = document.createElement("option");
      opt.value = String(idx);
      const label = track.name || track.lang || `Track ${idx + 1}`;
      opt.textContent = label;
      if (track.lang === "id" || label.toLowerCase().includes("indonesi")) {
        autoSelectIdx = idx;
      }
      this.subtitleSelect.appendChild(opt);
    });

    if (autoSelectIdx >= 0) {
      this.subtitleSelect.value = String(autoSelectIdx);
      this.hls.subtitleTrack = autoSelectIdx;
    }

    this.subtitleSelect.onchange = (e) => {
      const trackId = parseInt(e.target.value, 10);
      this.hls.subtitleTrack = trackId;
    };
  }

  toggleFullscreen() {
    const frame = document.querySelector(".watch-player-frame") || this.video;
    if (!document.fullscreenElement) {
      frame.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  showLoader(text) {
    if (this.loader) {
      this.loader.style.display = "flex";
      if (this.loaderText && text) this.loaderText.textContent = text;
    }
  }

  hideLoader() {
    if (this.loader) {
      this.loader.style.display = "none";
    }
  }

  showError(msg) {
    if (this.errorEl) {
      this.errorEl.textContent = msg;
      this.errorEl.style.display = "block";
    }
  }

  hideError() {
    if (this.errorEl) {
      this.errorEl.textContent = "";
      this.errorEl.style.display = "none";
    }
  }

  formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }

  stop() {
    if (this.video) {
      this.video.pause();
      this.video.removeAttribute("src");
    }
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
  }
}
