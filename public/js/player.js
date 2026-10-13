// public/js/player.js
// Cinema-Grade Video Player, Custom Server Switcher, and Online Subtitles Engine for Phase

class CinemaPlayer {
  constructor() {
    this.theater = document.getElementById('playerTheater');
    this.video = document.getElementById('cinemaVideo');
    this.iframe = document.getElementById('cinemaIframe');
    this.titleEl = document.getElementById('theaterVideoTitle');
    this.controls = document.getElementById('cinemaControls');
    this.header = document.querySelector('.player-theater-header');
    this.touchFeedback = document.getElementById('touchFeedback');
    this.feedbackIcon = document.getElementById('feedbackIcon');
    this.feedbackText = document.getElementById('feedbackText');

    // Custom Glassmorphism Server Switcher
    this.customServerDropdown = document.getElementById('customServerDropdown');
    this.serverDropdownBtn = document.getElementById('serverDropdownBtn');
    this.serverActiveLabel = document.getElementById('serverActiveLabel');
    this.serverDropdownPanel = document.getElementById('serverDropdownPanel');
    this.serverPanelList = document.getElementById('serverPanelList');

    // Subtitle Engine Elements
    this.btnSubtitles = document.getElementById('btnSubtitles');
    this.subtitlesDrawer = document.getElementById('subtitlesDrawer');
    this.closeSubtitlesBtn = document.getElementById('closeSubtitlesBtn');
    this.subtitlesSearchInput = document.getElementById('subtitlesSearchInput');
    this.subtitlesList = document.getElementById('subtitlesList');
    this.subSyncMinus = document.getElementById('subSyncMinus');
    this.subSyncPlus = document.getElementById('subSyncPlus');
    this.subSyncReset = document.getElementById('subSyncReset');
    this.subSyncValue = document.getElementById('subSyncValue');
    this.subOverlay = document.getElementById('cinemaSubtitleOverlay');
    this.subtitleText = document.getElementById('subtitleText');

    // Standard Player Controls
    this.btnPlayPause = document.getElementById('btnPlayPause');
    this.playIcon = document.getElementById('playIcon');
    this.pauseIcon = document.getElementById('pauseIcon');
    this.btnRewind = document.getElementById('btnRewind10');
    this.btnForward = document.getElementById('btnForward10');
    this.progressBar = document.getElementById('progressBar');
    this.bufferedBar = document.getElementById('bufferedBar');
    this.progressBarContainer = document.getElementById('progressBarContainer');
    this.volumeSlider = document.getElementById('volumeSlider');
    this.btnVolume = document.getElementById('btnVolume');
    this.timeDisplay = document.getElementById('timeDisplay');
    this.btnSpeed = document.getElementById('btnSpeed');
    this.btnPip = document.getElementById('btnPip');
    this.btnFullscreen = document.getElementById('btnFullscreen');
    this.btnClose = document.getElementById('closeTheaterBtn');
    this.btnLaunchVlc = document.getElementById('btnLaunchVLC');

    // State Variables
    this.hls = null;
    this.availableStreams = [];
    this.currentStream = null;
    this.currentMeta = null;
    this.hideControlsTimer = null;
    this.playbackSpeeds = [1, 1.25, 1.5, 2, 0.75];
    this.speedIndex = 0;
    this.lastTap = 0;

    // Subtitle Engine State
    this.availableSubtitles = [];
    this.activeSubtitle = null;
    this.parsedCues = [];
    this.subSyncOffset = 0;
    this.subFontSize = 'normal';
    this.activeTrack = null;
    this.embedTimeSyncTimer = null;
    this.embedStartTime = 0;
  }

  init() {
    this.bindEvents();
    this.bindKeyboardShortcuts();
    this.bindTouchGestures();
    this.bindServerDropdown();
    this.bindSubtitlesEngine();
    this.bindAntiRedirectionGuard();
  }

  bindEvents() {
    // Play / Pause
    this.btnPlayPause?.addEventListener('click', () => this.togglePlay());
    this.video?.addEventListener('click', () => this.togglePlay());

    // Skip
    this.btnRewind?.addEventListener('click', () => this.skip(-10));
    this.btnForward?.addEventListener('click', () => this.skip(10));

    // Progress updates
    this.video?.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video?.addEventListener('progress', () => this.onBufferUpdate());

    // Scrubber click & drag
    this.progressBarContainer?.addEventListener('click', (e) => this.scrub(e));

    // Volume
    this.volumeSlider?.addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
      this.video.muted = false;
    });
    this.btnVolume?.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    });

    // Speed
    this.btnSpeed?.addEventListener('click', () => {
      this.speedIndex = (this.speedIndex + 1) % this.playbackSpeeds.length;
      const speed = this.playbackSpeeds[this.speedIndex];
      this.video.playbackRate = speed;
      this.btnSpeed.textContent = `${speed}x`;
    });

    // PiP & Fullscreen
    this.btnPip?.addEventListener('click', () => this.togglePip());
    this.btnFullscreen?.addEventListener('click', () => this.toggleFullscreen());
    this.btnClose?.addEventListener('click', () => this.close());

    // Launch VLC
    this.btnLaunchVlc?.addEventListener('click', () => {
      if (!this.currentStream || !this.currentStream.url) {
        window.app?.showToast('VLC launcher requires direct MP4/HLS stream');
        return;
      }
      this.launchExternal('vlc', this.currentStream.url, this.titleEl.textContent);
    });

    // Auto-hide controls
    this.theater?.addEventListener('mousemove', () => this.showControlsTemporarily());
    this.theater?.addEventListener('touchstart', () => this.showControlsTemporarily());
  }

  bindServerDropdown() {
    if (!this.serverDropdownBtn || !this.serverDropdownPanel) return;

    this.serverDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleServerPanel();
    });

    // Close panel on outside click
    document.addEventListener('click', (e) => {
      if (this.customServerDropdown && !this.customServerDropdown.contains(e.target)) {
        this.closeServerPanel();
      }
    });

    // Close panel on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.serverDropdownPanel.style.display !== 'none') {
        this.closeServerPanel();
      }
    });
  }

  toggleServerPanel() {
    const isHidden = this.serverDropdownPanel.style.display === 'none';
    if (isHidden) {
      this.serverDropdownPanel.style.display = 'block';
      this.customServerDropdown?.classList.add('open');
    } else {
      this.closeServerPanel();
    }
  }

  closeServerPanel() {
    if (this.serverDropdownPanel) this.serverDropdownPanel.style.display = 'none';
    this.customServerDropdown?.classList.remove('open');
  }

  renderServerList() {
    if (!this.serverPanelList) return;

    if (!this.availableStreams || this.availableStreams.length === 0) {
      this.serverPanelList.innerHTML = `<div style="padding: 1rem; color: #64748b; font-size: 0.8rem; text-align: center;">No mirrors available</div>`;
      return;
    }

    this.serverPanelList.innerHTML = this.availableStreams.map((s, idx) => {
      const isActive = this.currentStream && (this.currentStream === s || this.currentStream.id === s.id);
      const isDirect = s.format === 'direct-link';
      return `
        <div class="server-panel-item ${isActive ? 'active' : ''}" onclick="window.cinemaPlayer.selectServer(${idx})">
          <div class="server-item-left">
            <span class="server-item-name">${isDirect ? '🔗 ' : '▶ '}${s.provider || 'Server ' + (idx + 1)}</span>
            <span class="server-item-type">${isDirect ? 'Cloud Release (4KHDHub)' : 'Instant Stream Mirror'}</span>
          </div>
          <span class="server-item-badge">${s.quality || 'HD'}</span>
        </div>
      `;
    }).join('');
  }

  selectServer(index) {
    this.closeServerPanel();
    if (this.availableStreams && this.availableStreams[index]) {
      const s = this.availableStreams[index];
      if (s.format === 'direct-link') {
        window.open(s.url, '_blank');
        window.app?.showToast('Opened 4KHDHub direct release in new window');
        return;
      }
      this.playStreamItem(s);
      window.app?.showToast(`Switched to ${s.provider}`);
    }
  }

  bindSubtitlesEngine() {
    // Open/Close Subtitles Drawer
    this.btnSubtitles?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleSubtitlesDrawer();
    });

    this.closeSubtitlesBtn?.addEventListener('click', () => {
      this.closeSubtitlesDrawer();
    });

    // Subtitle Search
    this.subtitlesSearchInput?.addEventListener('input', (e) => {
      this.filterSubtitles(e.target.value);
    });

    // Subtitle Timing Sync Controls
    this.subSyncMinus?.addEventListener('click', () => this.adjustSubSync(-0.5));
    this.subSyncPlus?.addEventListener('click', () => this.adjustSubSync(0.5));
    this.subSyncReset?.addEventListener('click', () => this.adjustSubSync(0, true));

    // Subtitle Font Size Controls
    const sizeBtns = this.subtitlesDrawer?.querySelectorAll('.size-btn');
    sizeBtns?.forEach(btn => {
      btn.addEventListener('click', (e) => {
        sizeBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const sz = e.target.getAttribute('data-size') || 'normal';
        this.setSubFontSize(sz);
      });
    });
  }

  toggleSubtitlesDrawer() {
    if (!this.subtitlesDrawer) return;
    const isHidden = this.subtitlesDrawer.style.display === 'none';
    if (isHidden) {
      this.subtitlesDrawer.style.display = 'flex';
      this.subtitlesSearchInput?.focus();
    } else {
      this.closeSubtitlesDrawer();
    }
  }

  closeSubtitlesDrawer() {
    if (this.subtitlesDrawer) this.subtitlesDrawer.style.display = 'none';
  }

  adjustSubSync(delta, reset = false) {
    if (reset) {
      this.subSyncOffset = 0;
    } else {
      this.subSyncOffset = Math.round((this.subSyncOffset + delta) * 10) / 10;
    }
    const sign = this.subSyncOffset > 0 ? '+' : '';
    if (this.subSyncValue) {
      this.subSyncValue.textContent = `${sign}${this.subSyncOffset.toFixed(1)}s`;
    }
    window.app?.showToast(`Subtitle sync: ${sign}${this.subSyncOffset.toFixed(1)}s`);
  }

  setSubFontSize(size) {
    this.subFontSize = size;
    if (this.subtitleText) {
      this.subtitleText.className = `subtitle-text size-${size}`;
    }
  }

  async fetchSubtitles(type, id, season = null, episode = null) {
    if (!id || !this.subtitlesList) return;

    this.subtitlesList.innerHTML = `<div class="subtitles-loading">Searching OpenSubtitles repository...</div>`;

    try {
      const seasonParam = season !== null ? `&season=${season}` : '';
      const episodeParam = episode !== null ? `&episode=${episode}` : '';
      const res = await fetch(`/api/subtitles?type=${type}&id=${id}${seasonParam}${episodeParam}`);
      const data = await res.json();

      this.availableSubtitles = data.subtitles || [];
      this.renderSubtitlesList(this.availableSubtitles);
    } catch (err) {
      this.subtitlesList.innerHTML = `<div class="subtitles-empty">Unable to reach subtitles catalog: ${err.message}</div>`;
    }
  }

  renderSubtitlesList(list) {
    if (!this.subtitlesList) return;

    const offItem = `
      <div class="subtitle-item ${!this.activeSubtitle ? 'active' : ''}" onclick="window.cinemaPlayer.selectSubtitle(null)">
        <div class="subtitle-item-info">
          <span class="subtitle-item-lang">Off / Disabled</span>
          <span class="subtitle-item-release">Disable subtitle captions</span>
        </div>
        ${!this.activeSubtitle ? '<span class="subtitle-item-check">✓</span>' : ''}
      </div>
    `;

    if (!list || list.length === 0) {
      this.subtitlesList.innerHTML = offItem + `<div class="subtitles-empty">No subtitles available for this title.</div>`;
      return;
    }

    const items = list.map((sub, idx) => {
      const isActive = this.activeSubtitle && this.activeSubtitle.id === sub.id;
      return `
        <div class="subtitle-item ${isActive ? 'active' : ''}" onclick="window.cinemaPlayer.selectSubtitle(${idx})">
          <div class="subtitle-item-info">
            <span class="subtitle-item-lang">${this.escapeHtml(sub.lang)}</span>
            <span class="subtitle-item-release">${this.escapeHtml(sub.release || 'Standard Sync')}</span>
          </div>
          ${isActive ? '<span class="subtitle-item-check">✓</span>' : ''}
        </div>
      `;
    }).join('');

    this.subtitlesList.innerHTML = offItem + items;
  }

  filterSubtitles(query) {
    if (!query) {
      this.renderSubtitlesList(this.availableSubtitles);
      return;
    }
    const q = query.toLowerCase();
    const filtered = this.availableSubtitles.filter(s => 
      s.lang.toLowerCase().includes(q) || 
      (s.release && s.release.toLowerCase().includes(q))
    );
    this.renderSubtitlesList(filtered);
  }

  async selectSubtitle(subOrIndex) {
    if (subOrIndex === null) {
      this.activeSubtitle = null;
      this.parsedCues = [];
      if (this.subOverlay) this.subOverlay.style.display = 'none';
      if (this.activeTrack && this.video) {
        this.activeTrack.mode = 'disabled';
      }
      this.renderSubtitlesList(this.availableSubtitles);
      window.app?.showToast('Subtitles disabled');
      return;
    }

    const sub = typeof subOrIndex === 'number' ? this.availableSubtitles[subOrIndex] : subOrIndex;
    if (!sub) return;

    this.activeSubtitle = sub;
    this.renderSubtitlesList(this.availableSubtitles);
    window.app?.showToast(`Loading ${sub.lang} subtitles...`);

    try {
      const res = await fetch(sub.vttProxyUrl);
      if (!res.ok) throw new Error('Proxy returned ' + res.status);
      const vttText = await res.text();

      // Parse cues for high-contrast on-screen overlay
      this.parsedCues = this.parseVttCues(vttText);

      // Also attach native <track> if playing in HTML5 video
      this.attachNativeTrack(sub.vttProxyUrl, sub.lang, sub.langCode);

      window.app?.showToast(`Active: ${sub.lang} Subtitles (${this.parsedCues.length} cues)`);
    } catch (err) {
      window.app?.showToast('Failed to load subtitle track: ' + err.message);
    }
  }

  parseVttCues(vttText) {
    const cues = [];
    if (!vttText) return cues;

    const normalized = vttText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalized.split('\n');

    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (line.includes('-->')) {
        const parts = line.split('-->');
        const start = this.parseTimeStr(parts[0].trim());
        const end = this.parseTimeStr(parts[1].trim());

        i++;
        const textLines = [];
        while (i < lines.length && lines[i].trim() !== '') {
          // Strip WebVTT formatting tags (<c.color>, <i>, <b>)
          const cleanLine = lines[i].trim().replace(/<[^>]+>/g, '');
          if (cleanLine) textLines.push(cleanLine);
          i++;
        }

        if (textLines.length > 0 && !isNaN(start) && !isNaN(end)) {
          cues.push({ start, end, text: textLines.join('\n') });
        }
      }
      i++;
    }

    return cues;
  }

  parseTimeStr(str) {
    if (!str) return 0;
    // Format: 00:01:23.456 or 01:23.456
    const clean = str.split(' ')[0];
    const parts = clean.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return 0;
  }

  attachNativeTrack(vttUrl, label, srclang) {
    if (!this.video) return;

    // Remove existing tracks
    const existing = this.video.querySelectorAll('track');
    existing.forEach(t => t.remove());

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = label;
    track.srclang = srclang || 'en';
    track.src = vttUrl;
    track.default = true;

    this.video.appendChild(track);
    track.addEventListener('load', () => {
      track.mode = 'showing';
    });
    this.activeTrack = track;
  }

  updateSubtitleOverlay(currentTime) {
    if (!this.subOverlay || !this.subtitleText) return;

    if (!this.activeSubtitle || this.parsedCues.length === 0) {
      this.subOverlay.style.display = 'none';
      return;
    }

    const t = currentTime + this.subSyncOffset;
    const activeCue = this.parsedCues.find(c => t >= c.start && t <= c.end);

    if (activeCue) {
      this.subtitleText.textContent = activeCue.text;
      this.subOverlay.style.display = 'block';
    } else {
      this.subOverlay.style.display = 'none';
    }
  }

  bindAntiRedirectionGuard() {
    // 1. Strict sandbox attribute is configured on #cinemaIframe
    // sandbox="allow-scripts allow-same-origin allow-forms allow-presentation"
    // Omitting allow-top-navigation ensures the embedded page CANNOT redirect the Phase tab.
    // Omitting allow-popups prevents unwanted clickjack ad popups.

    // 2. Intercept beforeunload when theater is active
    window.addEventListener('beforeunload', (e) => {
      if (this.theater && this.theater.style.display === 'flex') {
        // If an ad script tries to redirect, warn the user and cancel navigation
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    });
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.theater.style.display === 'none') return;

      // Don't intercept typing in inputs
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        this.skip(-10);
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        this.skip(10);
      } else if (e.code === 'ArrowUp') {
        e.preventDefault();
        this.video.volume = Math.min(1, this.video.volume + 0.1);
        if (this.volumeSlider) this.volumeSlider.value = this.video.volume;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.video.volume = Math.max(0, this.video.volume - 0.1);
        if (this.volumeSlider) this.volumeSlider.value = this.video.volume;
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.video.muted = !this.video.muted;
      } else if (e.code === 'KeyC') {
        e.preventDefault();
        this.toggleSubtitlesDrawer();
      } else if (e.code === 'Escape') {
        if (this.subtitlesDrawer && this.subtitlesDrawer.style.display !== 'none') {
          this.closeSubtitlesDrawer();
        } else {
          this.close();
        }
      }
    });
  }

  bindTouchGestures() {
    this.video?.addEventListener('touchstart', (e) => {
      const now = Date.now();
      const touch = e.touches[0];

      if (now - this.lastTap < 300) {
        const rect = this.video.getBoundingClientRect();
        const tapX = touch.clientX - rect.left;
        if (tapX < rect.width / 2) {
          this.skip(-10);
          this.showFeedback('⏪', '-10s');
        } else {
          this.skip(10);
          this.showFeedback('⏩', '+10s');
        }
      }
      this.lastTap = now;
    }, { passive: true });
  }

  showFeedback(icon, text) {
    if (!this.feedbackIcon || !this.feedbackText || !this.touchFeedback) return;
    this.feedbackIcon.textContent = icon;
    this.feedbackText.textContent = text;
    this.touchFeedback.classList.add('active');
    setTimeout(() => {
      this.touchFeedback.classList.remove('active');
    }, 600);
  }

  showControlsTemporarily() {
    this.controls?.classList.remove('hidden');
    this.header?.classList.remove('hidden');
    clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = setTimeout(() => {
      if (!this.video.paused) {
        this.controls?.classList.add('hidden');
        this.header?.classList.add('hidden');
      }
    }, 3500);
  }

  open(streamOrList, title, initialIndex = 0, metaInfo = null) {
    this.titleEl.textContent = title || 'Now Playing';
    this.theater.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    this.currentMeta = metaInfo;

    if (Array.isArray(streamOrList)) {
      this.availableStreams = streamOrList;
    } else {
      this.availableStreams = [streamOrList];
    }

    // Render Custom Glassmorphism Server Switcher
    this.renderServerList();

    // Default to first playable stream
    let selected = this.availableStreams[initialIndex];
    if (!selected || selected.format === 'direct-link') {
      const playable = this.availableStreams.find(s => s.format === 'embed' || s.format === 'hls' || s.format === 'mp4');
      selected = playable || this.availableStreams[0];
    }
    this.playStreamItem(selected);

    // Fetch Subtitles Automatically
    if (metaInfo && metaInfo.id) {
      this.fetchSubtitles(metaInfo.type || 'movie', metaInfo.id, metaInfo.season, metaInfo.episode);
    }
  }

  playStreamItem(stream) {
    if (!stream) return;
    this.currentStream = stream;

    // Update Server Label in Top Header
    if (this.serverActiveLabel) {
      this.serverActiveLabel.textContent = `${stream.provider || 'Server'} (${stream.quality || 'HD'})`;
    }
    this.renderServerList();

    // Reset video & iframe state
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.embedTimeSyncTimer) {
      clearInterval(this.embedTimeSyncTimer);
      this.embedTimeSyncTimer = null;
    }

    this.video.pause();
    this.video.src = '';
    this.iframe.src = '';

    if (stream.format === 'direct-link') {
      window.open(stream.url, '_blank');
      window.app?.showToast('Opened 4KHDHub direct release in new window');
      return;
    }

    if (stream.format === 'embed' && stream.embedUrl) {
      // Use Redirection-Proof Sandboxed Embed Player
      this.video.style.display = 'none';
      this.controls.style.display = 'none';
      this.iframe.style.display = 'block';

      // Set sandboxed URL
      this.iframe.src = stream.embedUrl;
      this.btnLaunchVlc.style.display = 'none';

      // Start elapsed timer for Subtitle Overlay sync in embeds
      this.embedStartTime = Date.now();
      this.embedTimeSyncTimer = setInterval(() => {
        const elapsed = (Date.now() - this.embedStartTime) / 1000;
        this.updateSubtitleOverlay(elapsed);
      }, 250);

    } else {
      // Use Custom Native HTML5 / HLS.js Cinema Player
      this.iframe.style.display = 'none';
      this.video.style.display = 'block';
      this.controls.style.display = 'block';
      this.btnLaunchVlc.style.display = 'flex';

      const streamUrl = stream.url;
      if (streamUrl.includes('.m3u8')) {
        if (window.Hls && Hls.isSupported()) {
          this.hls = new Hls({ autoStartLoad: true });
          this.hls.loadSource(streamUrl);
          this.hls.attachMedia(this.video);
          this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
            this.video.play().catch(() => {});
          });
        } else if (this.video.canPlayType('application/vnd.apple.mpegurl')) {
          this.video.src = streamUrl;
          this.video.play().catch(() => {});
        }
      } else {
        this.video.src = streamUrl;
        this.video.play().catch(() => {});
      }
    }

    this.showControlsTemporarily();
  }

  close() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    if (this.embedTimeSyncTimer) {
      clearInterval(this.embedTimeSyncTimer);
      this.embedTimeSyncTimer = null;
    }
    this.video.pause();
    this.video.src = '';
    this.iframe.src = '';
    this.theater.style.display = 'none';
    document.body.style.overflow = '';
    this.closeSubtitlesDrawer();
    this.closeServerPanel();
    if (this.subOverlay) this.subOverlay.style.display = 'none';
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
      if (this.playIcon) this.playIcon.style.display = 'none';
      if (this.pauseIcon) this.pauseIcon.style.display = 'block';
    } else {
      this.video.pause();
      if (this.playIcon) this.playIcon.style.display = 'block';
      if (this.pauseIcon) this.pauseIcon.style.display = 'none';
    }
    this.showControlsTemporarily();
  }

  skip(seconds) {
    this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    this.showControlsTemporarily();
  }

  scrub(e) {
    const rect = this.progressBarContainer.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    this.video.currentTime = pos * this.video.duration;
  }

  onTimeUpdate() {
    if (!this.video.duration) return;
    const progress = (this.video.currentTime / this.video.duration) * 100;
    if (this.progressBar) this.progressBar.style.width = `${progress}%`;
    const handle = document.getElementById('scrubHandle');
    if (handle) handle.style.left = `${progress}%`;

    const curr = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.video.duration);
    if (this.timeDisplay) this.timeDisplay.textContent = `${curr} / ${total}`;

    // Update Subtitles Overlay
    this.updateSubtitleOverlay(this.video.currentTime);
  }

  onBufferUpdate() {
    if (this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const percent = (bufferedEnd / this.video.duration) * 100;
      if (this.bufferedBar) this.bufferedBar.style.width = `${percent}%`;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds)) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async togglePip() {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else if (document.pictureInPictureEnabled) {
      await this.video.requestPictureInPicture();
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      this.theater.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  async launchExternal(player, streamUrl, title) {
    try {
      const res = await fetch('/api/player/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player, streamUrl, title })
      });
      const data = await res.json();
      if (data.success) {
        window.app?.showToast(`Launched in desktop ${player.toUpperCase()}`);
      } else {
        window.app?.showToast(`External player: ${data.error || 'Check if VLC is installed'}`);
      }
    } catch (err) {
      window.app?.showToast('Launcher error: ' + err.message);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
}

window.cinemaPlayer = new CinemaPlayer();
document.addEventListener('DOMContentLoaded', () => window.cinemaPlayer.init());
