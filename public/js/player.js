// public/js/player.js
// Cinema-Grade Video Player & Touch Gestures for Phase

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

    this.hls = null;
    this.currentStream = null;
    this.hideControlsTimer = null;
    this.playbackSpeeds = [1, 1.25, 1.5, 2, 0.75];
    this.speedIndex = 0;
    this.lastTap = 0;
  }

  init() {
    this.bindEvents();
    this.bindKeyboardShortcuts();
    this.bindTouchGestures();
  }

  bindEvents() {
    // Play / Pause
    this.btnPlayPause.addEventListener('click', () => this.togglePlay());
    this.video.addEventListener('click', () => this.togglePlay());

    // Skip
    this.btnRewind.addEventListener('click', () => this.skip(-10));
    this.btnForward.addEventListener('click', () => this.skip(10));

    // Progress updates
    this.video.addEventListener('timeupdate', () => this.onTimeUpdate());
    this.video.addEventListener('progress', () => this.onBufferUpdate());

    // Scrubber click & drag
    this.progressBarContainer.addEventListener('click', (e) => this.scrub(e));

    // Volume
    this.volumeSlider.addEventListener('input', (e) => {
      this.video.volume = parseFloat(e.target.value);
      this.video.muted = false;
    });
    this.btnVolume.addEventListener('click', () => {
      this.video.muted = !this.video.muted;
      this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
    });

    // Speed
    this.btnSpeed.addEventListener('click', () => {
      this.speedIndex = (this.speedIndex + 1) % this.playbackSpeeds.length;
      const speed = this.playbackSpeeds[this.speedIndex];
      this.video.playbackRate = speed;
      this.btnSpeed.textContent = `${speed}x`;
    });

    // PiP & Fullscreen
    this.btnPip.addEventListener('click', () => this.togglePip());
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    this.btnClose.addEventListener('click', () => this.close());

    // Launch VLC
    this.btnLaunchVlc.addEventListener('click', () => {
      if (!this.currentStream || !this.currentStream.url) {
        window.app.showToast('VLC launcher requires direct MP4/HLS stream URL');
        return;
      }
      this.launchExternal('vlc', this.currentStream.url, this.titleEl.textContent);
    });

    // Auto-hide controls
    this.theater.addEventListener('mousemove', () => this.showControlsTemporarily());
    this.theater.addEventListener('touchstart', () => this.showControlsTemporarily());
  }

  bindKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (this.theater.style.display === 'none') return;

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
        this.volumeSlider.value = this.video.volume;
      } else if (e.code === 'ArrowDown') {
        e.preventDefault();
        this.video.volume = Math.max(0, this.video.volume - 0.1);
        this.volumeSlider.value = this.video.volume;
      } else if (e.code === 'KeyF') {
        e.preventDefault();
        this.toggleFullscreen();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        this.video.muted = !this.video.muted;
      } else if (e.code === 'Escape') {
        this.close();
      }
    });
  }

  bindTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;

    this.video.addEventListener('touchstart', (e) => {
      const now = Date.now();
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;

      // Double tap detection
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
    this.feedbackIcon.textContent = icon;
    this.feedbackText.textContent = text;
    this.touchFeedback.classList.add('active');
    setTimeout(() => {
      this.touchFeedback.classList.remove('active');
    }, 600);
  }

  showControlsTemporarily() {
    this.controls.classList.remove('hidden');
    this.header.classList.remove('hidden');
    clearTimeout(this.hideControlsTimer);
    this.hideControlsTimer = setTimeout(() => {
      if (!this.video.paused) {
        this.controls.classList.add('hidden');
        this.header.classList.add('hidden');
      }
    }, 3500);
  }

  open(stream, title) {
    this.currentStream = stream;
    this.titleEl.textContent = title || 'Now Playing';
    this.theater.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    if (stream.format === 'embed' && stream.embedUrl) {
      // Use Embed Player
      this.video.style.display = 'none';
      this.controls.style.display = 'none';
      this.iframe.style.display = 'block';
      this.iframe.src = stream.embedUrl;
      this.btnLaunchVlc.style.display = 'none';
    } else {
      // Use Custom HTML5 / HLS.js Player
      this.iframe.style.display = 'none';
      this.video.style.display = 'block';
      this.controls.style.display = 'block';
      this.btnLaunchVlc.style.display = 'flex';

      const streamUrl = stream.url;
      if (streamUrl.includes('.m3u8')) {
        if (window.Hls && Hls.isSupported()) {
          if (this.hls) this.hls.destroy();
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
    this.video.pause();
    this.video.src = '';
    this.iframe.src = '';
    this.theater.style.display = 'none';
    document.body.style.overflow = '';
  }

  togglePlay() {
    if (this.video.paused) {
      this.video.play();
      this.playIcon.style.display = 'none';
      this.pauseIcon.style.display = 'block';
    } else {
      this.video.pause();
      this.playIcon.style.display = 'block';
      this.pauseIcon.style.display = 'none';
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
    this.progressBar.style.width = `${progress}%`;
    document.getElementById('scrubHandle').style.left = `${progress}%`;

    const curr = this.formatTime(this.video.currentTime);
    const total = this.formatTime(this.video.duration);
    this.timeDisplay.textContent = `${curr} / ${total}`;
  }

  onBufferUpdate() {
    if (this.video.buffered.length > 0) {
      const bufferedEnd = this.video.buffered.end(this.video.buffered.length - 1);
      const percent = (bufferedEnd / this.video.duration) * 100;
      this.bufferedBar.style.width = `${percent}%`;
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
        window.app.showToast(`Launched in desktop ${player.toUpperCase()}`);
      } else {
        window.app.showToast(`External player: ${data.error || 'Check if VLC is installed'}`);
      }
    } catch (err) {
      window.app.showToast('Launcher error: ' + err.message);
    }
  }
}

window.cinemaPlayer = new CinemaPlayer();
document.addEventListener('DOMContentLoaded', () => window.cinemaPlayer.init());
