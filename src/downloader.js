// src/downloader.js
// Multi-threaded background download manager for Phase

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { pipeline } from 'node:stream/promises';
import { Transform } from 'node:stream';

const DEFAULT_DOWNLOAD_DIR = path.join(os.homedir(), 'Downloads', 'MovieBox-TUI');
const downloads = new Map();

function ensureDirectories() {
  const moviesDir = path.join(DEFAULT_DOWNLOAD_DIR, 'Movies');
  const seriesDir = path.join(DEFAULT_DOWNLOAD_DIR, 'Series');
  if (!fs.existsSync(moviesDir)) fs.mkdirSync(moviesDir, { recursive: true });
  if (!fs.existsSync(seriesDir)) fs.mkdirSync(seriesDir, { recursive: true });
}

export function getDownloadList() {
  return Array.from(downloads.values()).reverse();
}

export async function startDownload({ id, title, url, type = 'movie' }) {
  ensureDirectories();

  const downloadId = id || `dl_${Date.now()}`;
  const sanitizedTitle = (title || 'video').replace(/[/\\?%*:|"<>]/g, '_');
  const ext = url.includes('.m3u8') ? '.m3u8' : '.mp4';
  const subFolder = type === 'series' ? 'Series' : 'Movies';
  const destPath = path.join(DEFAULT_DOWNLOAD_DIR, subFolder, `${sanitizedTitle}${ext}`);

  const item = {
    id: downloadId,
    title,
    url,
    destPath,
    status: 'downloading',
    bytesReceived: 0,
    totalBytes: 0,
    progress: 0,
    speedMBs: 0,
    error: null,
    startTime: Date.now()
  };

  downloads.set(downloadId, item);

  // Background download worker
  (async () => {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        item.totalBytes = parseInt(contentLength, 10);
      }

      let lastBytes = 0;
      let lastTime = Date.now();

      const progressTracker = new Transform({
        transform(chunk, encoding, callback) {
          item.bytesReceived += chunk.length;
          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.5) {
            const bytesDiff = item.bytesReceived - lastBytes;
            item.speedMBs = ((bytesDiff / (1024 * 1024)) / timeDiff).toFixed(2);
            if (item.totalBytes > 0) {
              item.progress = Math.min(100, Math.round((item.bytesReceived / item.totalBytes) * 100));
            } else {
              item.progress = 50; // indeterminate
            }
            lastBytes = item.bytesReceived;
            lastTime = now;
          }
          callback(null, chunk);
        }
      });

      const fileStream = fs.createWriteStream(destPath);
      await pipeline(response.body, progressTracker, fileStream);

      item.status = 'completed';
      item.progress = 100;
      item.speedMBs = 0;
    } catch (err) {
      console.error(`[Downloader] Download error for ${title}:`, err.message);
      item.status = 'failed';
      item.error = err.message;
    }
  })();

  return item;
}

export function cancelDownload(id) {
  const item = downloads.get(id);
  if (item && item.status === 'downloading') {
    item.status = 'cancelled';
    downloads.delete(id);
    return true;
  }
  return false;
}
