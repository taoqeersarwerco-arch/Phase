// public/js/downloader.js
// Client-side download manager for Phase (Supports Local Desktop Storage & Cloud Browser Downloads)

class DownloaderManager {
  constructor() {
    this.pollInterval = null;
    this.downloads = [];
  }

  init() {
    this.fetchDownloads();
  }

  async fetchDownloads() {
    try {
      const res = await fetch('/api/downloads');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        this.downloads = data.downloads || [];
        this.renderDownloads();
        this.updateBadge();

        const hasActive = this.downloads.some(d => d.status === 'downloading');
        if (hasActive && !this.pollInterval) {
          this.pollInterval = setInterval(() => this.fetchDownloads(), 1500);
        } else if (!hasActive && this.pollInterval) {
          clearInterval(this.pollInterval);
          this.pollInterval = null;
        }
      }
    } catch (err) {
      console.error('[DownloaderManager] fetchDownloads error:', err);
    }
  }

  updateBadge() {
    const badge = document.getElementById('downloadCountBadge');
    if (!badge) return;
    const activeCount = this.downloads.filter(d => d.status === 'downloading').length;
    if (activeCount > 0) {
      badge.textContent = activeCount;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }

  renderDownloads() {
    const container = document.getElementById('downloadsList');
    const emptyState = document.getElementById('downloadsEmptyState');
    if (!container || !emptyState) return;

    if (this.downloads.length === 0) {
      emptyState.style.display = 'block';
      container.innerHTML = '';
      return;
    }

    emptyState.style.display = 'none';
    container.innerHTML = this.downloads.map(d => `
      <div class="download-item">
        <div class="download-item-info">
          <div class="download-item-title">${this.escapeHtml(d.title)}</div>
          <div class="download-progress-track">
            <div class="download-progress-fill" style="width: ${d.progress}%;"></div>
          </div>
          <div class="download-stats">
            <span>Status: <strong style="color: ${d.status === 'completed' ? '#10b981' : '#6366f1'}">${d.status.toUpperCase()}</strong></span>
            <span>Progress: ${d.progress}%</span>
            ${d.speedMBs > 0 ? `<span>Speed: ${d.speedMBs} MB/s</span>` : ''}
            <span>Saved: ${d.destPath ? d.destPath.split(/[\\/]/).pop() : ''}</span>
          </div>
        </div>
        <div class="download-item-actions">
          ${d.status === 'downloading' ? `
            <button class="btn btn-secondary" onclick="window.downloader.cancel('${d.id}')" style="padding: 0.4rem 0.8rem; font-size: 0.8rem;">
              Cancel
            </button>
          ` : `
            <span style="color: #10b981; font-weight: 700; font-size: 0.85rem;">✓ Saved</span>
          `}
        </div>
      </div>
    `).join('');
  }

  async queueDownload(item, streamUrl) {
    const title = item.name || item.title || 'video';

    // Direct Browser Download Helper
    const triggerBrowserDownload = (url) => {
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title.replace(/[/\\?%*:|"<>]/g, '_')}.mp4`;
      a.target = '_blank';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.app.showToast(`Starting browser download for "${title}"`);
    };

    try {
      const res = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `dl_${Date.now()}`,
          title: title,
          url: streamUrl,
          type: item.type || 'movie'
        })
      });

      const data = await res.json();
      if (data.success) {
        if (data.isVercel || data.directDownloadUrl) {
          triggerBrowserDownload(data.directDownloadUrl || streamUrl);
        } else {
          window.app.showToast(`Started background download for "${title}"`);
          this.fetchDownloads();
        }
      } else {
        // Fallback to direct browser download
        triggerBrowserDownload(streamUrl);
      }
    } catch {
      // Fallback on error
      triggerBrowserDownload(streamUrl);
    }
  }

  async cancel(id) {
    try {
      await fetch('/api/download/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      this.fetchDownloads();
    } catch (err) {
      console.error(err);
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }
}

window.downloader = new DownloaderManager();
document.addEventListener('DOMContentLoaded', () => window.downloader.init());
