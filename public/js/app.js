// public/js/app.js
// Main Website Application Logic for Phase

class PhaseApp {
  constructor() {
    this.currentTab = 'movies';
    this.currentGenre = 'All';
    this.catalogItems = [];
    this.heroItem = null;
    this.searchDebounceTimer = null;

    // DOM Elements
    this.mediaGrid = document.getElementById('mediaGrid');
    this.catalogSectionTitle = document.getElementById('catalogSectionTitle');
    this.catalogItemCount = document.getElementById('catalogItemCount');
    this.genrePills = document.getElementById('genrePills');

    this.searchInput = document.getElementById('searchInput');
    this.searchClearBtn = document.getElementById('searchClearBtn');
    this.searchDropdown = document.getElementById('searchDropdown');
    this.searchDropdownContent = document.getElementById('searchDropdownContent');

    this.heroBillboard = document.getElementById('heroBillboard');
    this.heroBackdropImg = document.getElementById('heroBackdropImg');
    this.heroTitle = document.getElementById('heroTitle');
    this.heroSynopsis = document.getElementById('heroSynopsis');
    this.heroRating = document.getElementById('heroRating');
    this.heroYear = document.getElementById('heroYear');
    this.heroGenres = document.getElementById('heroGenres');
    this.heroBtnWatch = document.getElementById('heroBtnWatch');
    this.heroBtnDetails = document.getElementById('heroBtnDetails');
    this.heroBtnDownload = document.getElementById('heroBtnDownload');

    this.detailModal = document.getElementById('detailModal');
    this.detailModalContent = document.getElementById('detailModalContent');
    this.closeDetailModalBtn = document.getElementById('closeDetailModalBtn');

    this.qrModal = document.getElementById('qrModal');
    this.btnConnectPhone = document.getElementById('btnConnectPhone');
    this.closeQrModalBtn = document.getElementById('closeQrModalBtn');
    this.qrCodeImg = document.getElementById('qrCodeImg');
    this.qrMobileUrlInput = document.getElementById('qrMobileUrlInput');
    this.btnCopyMobileUrl = document.getElementById('btnCopyMobileUrl');

    this.toastContainer = document.getElementById('toastContainer');
  }

  async init() {
    this.bindNavigation();
    this.bindSearch();
    this.bindModals();
    this.bindHeroActions();

    // Initial load
    await this.loadCatalog('movie');
    await this.loadLiveTv();
  }

  bindNavigation() {
    // Desktop Nav
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Mobile Bottom Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        this.switchTab(tab);
      });
    });

    // Genre Pills
    this.genrePills.querySelectorAll('.pill').forEach(pill => {
      pill.addEventListener('click', () => {
        this.genrePills.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.currentGenre = pill.dataset.genre;
        this.applyFilter();
      });
    });
  }

  switchTab(tab) {
    this.currentTab = tab;

    // Update nav states
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Toggle sections
    const catalogSection = document.getElementById('catalogSection');
    const liveTvSection = document.getElementById('liveTvSection');
    const downloadsSection = document.getElementById('downloadsSection');
    const filtersSection = document.getElementById('sectionFilters');

    catalogSection.style.display = 'none';
    liveTvSection.style.display = 'none';
    downloadsSection.style.display = 'none';
    filtersSection.style.display = 'none';

    if (tab === 'movies') {
      catalogSection.style.display = 'block';
      filtersSection.style.display = 'block';
      this.catalogSectionTitle.textContent = 'Trending Movies';
      this.loadCatalog('movie');
    } else if (tab === 'series') {
      catalogSection.style.display = 'block';
      filtersSection.style.display = 'block';
      this.catalogSectionTitle.textContent = 'Popular TV Series';
      this.loadCatalog('series');
    } else if (tab === 'live') {
      liveTvSection.style.display = 'block';
    } else if (tab === 'downloads') {
      downloadsSection.style.display = 'block';
      window.downloader.fetchDownloads();
    }
  }

  async loadCatalog(type = 'movie') {
    this.mediaGrid.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: #64748b;">
        <p>Loading cinematic catalog...</p>
      </div>
    `;

    try {
      const res = await fetch(`/api/catalog?type=${type}`);
      const data = await res.json();
      if (data.success && data.items) {
        this.catalogItems = data.items;
        this.catalogItemCount.textContent = `${data.items.length} Titles`;

        if (this.catalogItems.length > 0 && !this.heroItem) {
          this.setHeroItem(this.catalogItems[0]);
        }

        this.applyFilter();
      }
    } catch (err) {
      console.error('[loadCatalog] Error:', err);
    }
  }

  applyFilter() {
    let filtered = this.catalogItems;
    if (this.currentGenre !== 'All') {
      filtered = this.catalogItems.filter(item => {
        if (!item.genres && !item.genre) return false;
        const gList = item.genres || item.genre || [];
        return gList.some(g => g.toLowerCase() === this.currentGenre.toLowerCase());
      });
    }

    this.renderGrid(filtered);
  }

  renderGrid(items) {
    if (items.length === 0) {
      this.mediaGrid.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: #64748b;">
          <h3>No titles found for "${this.currentGenre}"</h3>
          <p>Try selecting "All" or searching for a specific keyword.</p>
        </div>
      `;
      return;
    }

    this.mediaGrid.innerHTML = items.map(item => `
      <div class="media-card" onclick="window.app.openDetails('${item.type || 'movie'}', '${item.id || item.imdb_id}')">
        <div class="media-poster-box">
          <img class="media-poster-img" src="${item.poster || 'https://images.metahub.space/poster/small/' + item.id + '/img'}" alt="${this.escapeHtml(item.name)}" loading="lazy" onerror="this.src='https://placehold.co/300x450/11111a/ffffff?text=Poster'">
          ${item.imdbRating ? `<span class="card-rating-tag">★ ${item.imdbRating}</span>` : ''}
          ${item.year ? `<span class="card-year-tag">${item.year}</span>` : ''}
          <div class="card-hover-overlay">
            <div class="overlay-play-btn">
              <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
            </div>
          </div>
        </div>
        <div class="media-card-info">
          <h4 class="media-card-title">${this.escapeHtml(item.name)}</h4>
          <p class="media-card-meta">${item.year || ''} • ${(item.genres && item.genres[0]) || 'Featured'}</p>
        </div>
      </div>
    `).join('');
  }

  setHeroItem(item) {
    this.heroItem = item;
    const bg = item.background || item.poster || '';
    if (bg) {
      this.heroBackdropImg.src = bg;
    }
    this.heroTitle.textContent = item.name;
    this.heroSynopsis.textContent = item.description || 'Watch full feature presentation in ultra high definition.';
    this.heroRating.textContent = `★ ${item.imdbRating || '8.5'}`;
    this.heroYear.textContent = item.year || '2026';
    const genres = (item.genres || item.genre || ['Action', 'Drama']).join(' • ');
    this.heroGenres.textContent = genres;
  }

  bindHeroActions() {
    this.heroBtnWatch.addEventListener('click', () => {
      if (this.heroItem) {
        this.openDetails(this.heroItem.type || 'movie', this.heroItem.id || this.heroItem.imdb_id, true);
      }
    });
    this.heroBtnDetails.addEventListener('click', () => {
      if (this.heroItem) {
        this.openDetails(this.heroItem.type || 'movie', this.heroItem.id || this.heroItem.imdb_id, false);
      }
    });
    this.heroBtnDownload.addEventListener('click', () => {
      if (this.heroItem) {
        this.openDetails(this.heroItem.type || 'movie', this.heroItem.id || this.heroItem.imdb_id, false);
      }
    });
  }

  bindSearch() {
    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      this.searchClearBtn.style.display = q ? 'block' : 'none';

      clearTimeout(this.searchDebounceTimer);
      if (!q) {
        this.searchDropdown.style.display = 'none';
        return;
      }

      this.searchDebounceTimer = setTimeout(async () => {
        try {
          const type = this.currentTab === 'series' ? 'series' : 'movie';
          const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&type=${type}`);
          const data = await res.json();
          if (data.success && data.items && data.items.length > 0) {
            this.renderSearchDropdown(data.items);
          } else {
            this.searchDropdownContent.innerHTML = `<div style="padding:1rem;color:#94a3b8;text-align:center;">No matching titles</div>`;
            this.searchDropdown.style.display = 'block';
          }
        } catch (err) {
          console.error(err);
        }
      }, 300);
    });

    this.searchClearBtn.addEventListener('click', () => {
      this.searchInput.value = '';
      this.searchClearBtn.style.display = 'none';
      this.searchDropdown.style.display = 'none';
    });

    // Close dropdown on click outside
    document.addEventListener('click', (e) => {
      if (!this.searchInput.contains(e.target) && !this.searchDropdown.contains(e.target)) {
        this.searchDropdown.style.display = 'none';
      }
    });
  }

  renderSearchDropdown(items) {
    this.searchDropdownContent.innerHTML = items.slice(0, 7).map(item => `
      <div class="search-dropdown-item" onclick="window.app.openDetails('${item.type || 'movie'}', '${item.id || item.imdb_id}'); document.getElementById('searchDropdown').style.display='none';">
        <img class="search-dropdown-poster" src="${item.poster || ''}" alt="" onerror="this.style.display='none'">
        <div class="search-dropdown-info">
          <h4>${this.escapeHtml(item.name)}</h4>
          <p>${item.year || ''} • ${item.imdbRating ? '★ ' + item.imdbRating : 'Trending'}</p>
        </div>
      </div>
    `).join('');
    this.searchDropdown.style.display = 'block';
  }

  async openDetails(type, id, autoPlay = false) {
    this.detailModal.style.display = 'flex';
    this.detailModalContent.innerHTML = `
      <div style="padding: 4rem; text-align: center; color: #94a3b8;">
        <p>Fetching cinema details & stream sources...</p>
      </div>
    `;

    try {
      const [metaRes, streamRes] = await Promise.all([
        fetch(`/api/meta?type=${type}&id=${id}`).then(r => r.json()),
        fetch(`/api/streams?type=${type}&id=${id}`).then(r => r.json())
      ]);

      const meta = metaRes.meta || {};
      const streams = streamRes.streams || [];

      if (autoPlay && streams.length > 0) {
        this.detailModal.style.display = 'none';
        window.cinemaPlayer.open(streams, meta.name || 'Cinema Presentation', 0);
        return;
      }

      this.renderDetailModal(meta, streams, type);
    } catch (err) {
      this.detailModalContent.innerHTML = `
        <div style="padding: 2rem; color: #ef4444;">
          <h3>Failed to load title details</h3>
          <p>${err.message}</p>
        </div>
      `;
    }
  }

  renderDetailModal(meta, streams, type) {
    const bg = meta.background || meta.poster || '';
    const hasEpisodes = type === 'series' && meta.videos && meta.videos.length > 0;

    this.detailModalContent.innerHTML = `
      <div class="detail-hero-box" style="background-image: url('${bg}');">
        <div class="detail-hero-overlay"></div>
        <div class="detail-hero-info">
          <div class="hero-badges">
            ${meta.imdbRating ? `<span class="badge-rating">★ ${meta.imdbRating}</span>` : ''}
            <span class="badge-year">${meta.year || meta.releaseInfo || ''}</span>
            <span class="badge-quality">4K ULTRA</span>
          </div>
          <h2 style="font-family: var(--font-display); font-size: 2.2rem; font-weight: 800; color: #fff;">${this.escapeHtml(meta.name)}</h2>
          <p style="color: #94a3b8; font-size: 0.95rem; margin-top: 0.25rem;">
            ${(meta.genres || []).join(' • ')} ${meta.runtime ? '• ' + meta.runtime : ''}
          </p>
        </div>
      </div>

      <div class="detail-body">
        <p class="detail-description">${this.escapeHtml(meta.description || 'No overview available.')}</p>

        <!-- Stream Sources Selection -->
        <div class="detail-streams-box">
          <h4 style="color: #fff; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.4rem;">Available Streaming Sources</h4>
          <p style="color: #64748b; font-size: 0.85rem;">Select your preferred stream server or download directly to desktop.</p>
          <div class="streams-list">
            ${streams.map((s, idx) => `
              <div class="stream-row">
                <div class="stream-row-left">
                  <span class="stream-quality-tag">${s.quality}</span>
                  <span class="stream-provider-name">${s.provider}</span>
                </div>
                <div class="stream-actions">
                  <button class="btn btn-primary" onclick="window.app.playStream(${idx})" style="padding: 0.45rem 1rem; font-size: 0.85rem;">
                    ▶ Play
                  </button>
                  ${s.canDownload ? `
                    <button class="btn btn-glass" onclick="window.app.downloadStream(${idx})" style="padding: 0.45rem 0.9rem; font-size: 0.85rem;">
                      ⬇ Download
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- TV Series Episode Browser -->
        ${hasEpisodes ? `
          <div class="episodes-selector">
            <h4 style="color: #fff; font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem;">Episodes</h4>
            <div class="episodes-grid">
              ${meta.videos.slice(0, 24).map(v => `
                <div class="episode-card" onclick="window.app.playEpisode('${meta.id}', ${v.season}, ${v.episode}, '${this.escapeHtml(v.name || 'Episode ' + v.episode)}')">
                  <img class="episode-thumb" src="${v.thumbnail || ''}" alt="" onerror="this.src='https://placehold.co/320x180/1a1a28/ffffff?text=Episode'">
                  <div class="episode-title">S${v.season} E${v.episode}: ${this.escapeHtml(v.name || 'Episode')}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </div>
    `;

    this.activeStreams = streams;
    this.activeMeta = meta;
  }

  playStream(index) {
    if (this.activeStreams && this.activeStreams[index]) {
      this.detailModal.style.display = 'none';
      window.cinemaPlayer.open(this.activeStreams, this.activeMeta.name, index);
    }
  }

  downloadStream(index) {
    if (this.activeStreams && this.activeStreams[index]) {
      const stream = this.activeStreams[index];
      window.downloader.queueDownload(this.activeMeta, stream.url);
    }
  }

  async playEpisode(seriesId, season, episode, epTitle) {
    try {
      this.showToast(`Loading S${season} E${episode}...`);
      const res = await fetch(`/api/streams?type=series&id=${seriesId}&season=${season}&episode=${episode}`);
      const data = await res.json();
      if (data.success && data.streams && data.streams.length > 0) {
        this.detailModal.style.display = 'none';
        window.cinemaPlayer.open(data.streams, `${this.activeMeta.name} - ${epTitle}`, 0);
      }
    } catch (err) {
      this.showToast('Episode stream error: ' + err.message);
    }
  }

  async loadLiveTv() {
    const grid = document.getElementById('channelsGrid');
    try {
      const res = await fetch('/api/live');
      const data = await res.json();
      if (data.success && data.channels) {
        grid.innerHTML = data.channels.map(ch => `
          <div class="channel-card" onclick="window.cinemaPlayer.open({ format: 'hls', url: '${ch.stream_url}' }, '${this.escapeHtml(ch.name)}')">
            <div class="channel-logo-box">
              <img class="channel-logo-img" src="${ch.logo}" alt="${this.escapeHtml(ch.name)}" onerror="this.src='https://placehold.co/100x100/181824/ffffff?text=TV'">
            </div>
            <div class="channel-info">
              <h4>${this.escapeHtml(ch.name)}</h4>
              <div class="channel-tags">
                <span class="badge-live">LIVE</span>
                <span class="badge-channel-group">${ch.group} • ${ch.quality}</span>
              </div>
            </div>
          </div>
        `).join('');
      }
    } catch (err) {
      console.error(err);
    }
  }

  bindModals() {
    this.closeDetailModalBtn.addEventListener('click', () => {
      this.detailModal.style.display = 'none';
    });
    this.detailModal.addEventListener('click', (e) => {
      if (e.target === this.detailModal) this.detailModal.style.display = 'none';
    });

    // QR Modal
    this.btnConnectPhone.addEventListener('click', async () => {
      this.qrModal.style.display = 'flex';
      try {
        const res = await fetch('/api/network');
        const data = await res.json();
        if (data.success && data.network) {
          this.qrCodeImg.src = data.network.qrCodeUrl;
          this.qrMobileUrlInput.value = data.network.mobileUrl;
        }
      } catch (err) {
        console.error(err);
      }
    });

    this.closeQrModalBtn.addEventListener('click', () => {
      this.qrModal.style.display = 'none';
    });
    this.qrModal.addEventListener('click', (e) => {
      if (e.target === this.qrModal) this.qrModal.style.display = 'none';
    });

    this.btnCopyMobileUrl.addEventListener('click', () => {
      navigator.clipboard.writeText(this.qrMobileUrlInput.value);
      this.showToast('Copied mobile address to clipboard!');
    });
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span>✨</span><span>${this.escapeHtml(message)}</span>`;
    this.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 3500);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
}

window.app = new PhaseApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
