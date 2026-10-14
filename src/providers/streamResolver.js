// src/providers/streamResolver.js
// Resolves high-speed streaming links, Stremio native streams, and unblocked mirrors

import { search4KHdHub, get4KHdHubReleases } from './fourkhdhub.js';
import { getStremioStreams } from './stremioStreams.js';

function detectQualityCategory(qualityStr = '', titleStr = '') {
  const combined = `${qualityStr} ${titleStr}`.toLowerCase();
  if (/2160p|4k|uhd/i.test(combined)) return '2160p';
  if (/1440p|2k|qhd/i.test(combined)) return '1440p';
  if (/1080p|fhd|full hd/i.test(combined)) return '1080p';
  if (/720p|hd/i.test(combined)) return '720p';
  return '1080p';
}

export async function resolveStreams(type, id, season = null, episode = null, title = null) {
  const streams = [];

  // 1. Fetch Direct Streams & P2P Swarms from Stremio Addon Protocol
  try {
    const stremioResults = await getStremioStreams(type, id, season, episode);
    
    // Separate direct HTTP/HLS streams from torrent swarms
    const directHttp = stremioResults.filter(s => s.isNative);
    const p2pSwarms = stremioResults.filter(s => !s.isNative);

    // Add Direct High-Speed Streams first (Netflix-grade native playback)
    for (const s of directHttp) {
      streams.push({
        ...s,
        qualityCategory: detectQualityCategory(s.quality, s.title)
      });
    }

    // Add top P2P Swarm releases (playable in VLC/MPV or download)
    for (let i = 0; i < Math.min(p2pSwarms.length, 3); i++) {
      const s = p2pSwarms[i];
      streams.push({
        ...s,
        qualityCategory: detectQualityCategory(s.quality, s.title)
      });
    }
  } catch (err) {
    console.warn('[Stremio stream resolver error]:', err.message);
  }

  // 2. High-Reliability Unblocked Multi-Server Embed Mirrors (Fallback)
  if (type === 'movie') {
    streams.push({
      id: "mirror-autoembed",
      provider: "Server 1: AutoEmbed 4K",
      quality: "4K UHD / 1080p",
      qualityCategory: "2160p",
      format: "embed",
      embedUrl: `https://autoembed.co/movie/imdb/${id}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-vidsrc-pm",
      provider: "Server 2: PM VIP 1080p",
      quality: "1080p Full HD",
      qualityCategory: "1080p",
      format: "embed",
      embedUrl: `https://vidsrc.pm/embed/movie/${id}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-2embed",
      provider: "Server 3: 2Embed 720p",
      quality: "720p HD",
      qualityCategory: "720p",
      format: "embed",
      embedUrl: `https://www.2embed.cc/embed/${id}`,
      canDownload: false
    });
  } else if (type === 'series') {
    const s = season ?? 1;
    const e = episode ?? 1;

    streams.push({
      id: "mirror-autoembed-series",
      provider: "Server 1: AutoEmbed 1080p",
      quality: "1080p Full HD",
      qualityCategory: "1080p",
      format: "embed",
      embedUrl: `https://autoembed.co/tv/imdb/${id}-${s}-${e}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-vidsrc-pm-series",
      provider: "Server 2: PM VIP 1080p",
      quality: "1080p Full HD",
      qualityCategory: "1080p",
      format: "embed",
      embedUrl: `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-2embed-series",
      provider: "Server 3: 2Embed 720p",
      quality: "720p HD",
      qualityCategory: "720p",
      format: "embed",
      embedUrl: `https://www.2embed.cc/embedtv/${id}&s=${s}&e=${e}`,
      canDownload: false
    });
  }

  // 3. 4KHDHub Real Cloud & BluRay Releases (Download & Cloud Lockers)
  if (title) {
    try {
      const items = await search4KHdHub(title);
      if (items.length > 0) {
        const releases = await get4KHdHubReleases(items[0].pageUrl);
        for (let i = 0; i < Math.min(releases.length, 4); i++) {
          const r = releases[i];
          streams.push({
            id: `4khdhub-release-${i}`,
            provider: r.provider,
            quality: r.quality,
            qualityCategory: detectQualityCategory(r.quality, r.title),
            format: "direct-link",
            url: r.hubcloudUrl,
            canDownload: true
          });
        }
      }
    } catch (err) {
      console.warn('[4KHDHub fetch error]:', err.message);
    }
  }

  // 4. Fallback High-Quality HLS Adaptive Direct Feed
  streams.push({
    id: "hls-fallback-adaptive",
    provider: "Phase CDN (Adaptive)",
    quality: "720p / 1080p Adaptive",
    qualityCategory: "720p",
    format: "hls",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    canDownload: true
  });

  return streams;
}
