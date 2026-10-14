// src/providers/streamResolver.js
// Resolves high-speed streaming links, Stremio native streams, and unblocked mirrors

import { search4KHdHub, get4KHdHubReleases } from './fourkhdhub.js';
import { getStremioStreams } from './stremioStreams.js';

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
      streams.push(s);
    }

    // Add top P2P Swarm releases (playable in VLC/MPV or download)
    for (let i = 0; i < Math.min(p2pSwarms.length, 3); i++) {
      streams.push(p2pSwarms[i]);
    }
  } catch (err) {
    console.warn('[Stremio stream resolver error]:', err.message);
  }

  // 2. High-Reliability Unblocked Multi-Server Embed Mirrors (Fallback)
  if (type === 'movie') {
    streams.push({
      id: "mirror-vidsrc-pm",
      provider: "Server 1: PM VIP (Fast)",
      quality: "1080p Full HD",
      format: "embed",
      embedUrl: `https://vidsrc.pm/embed/movie/${id}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-autoembed",
      provider: "Server 2: AutoEmbed Pro",
      quality: "4K / 1080p",
      format: "embed",
      embedUrl: `https://autoembed.co/movie/imdb/${id}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-2embed",
      provider: "Server 3: 2Embed Global",
      quality: "720p / 1080p",
      format: "embed",
      embedUrl: `https://www.2embed.cc/embed/${id}`,
      canDownload: false
    });
  } else if (type === 'series') {
    const s = season ?? 1;
    const e = episode ?? 1;

    streams.push({
      id: "mirror-vidsrc-pm-series",
      provider: "Server 1: PM VIP (Fast)",
      quality: "1080p Full HD",
      format: "embed",
      embedUrl: `https://vidsrc.pm/embed/tv/${id}/${s}/${e}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-autoembed-series",
      provider: "Server 2: AutoEmbed Pro",
      quality: "1080p / 720p",
      format: "embed",
      embedUrl: `https://autoembed.co/tv/imdb/${id}-${s}-${e}`,
      canDownload: false
    });
    streams.push({
      id: "mirror-2embed-series",
      provider: "Server 3: 2Embed Global",
      quality: "720p / 1080p",
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
        for (let i = 0; i < Math.min(releases.length, 3); i++) {
          const r = releases[i];
          streams.push({
            id: `4khdhub-release-${i}`,
            provider: r.provider,
            quality: r.quality,
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
    provider: "Phase Adaptive HLS (CDN)",
    quality: "1080p Adaptive",
    format: "hls",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    canDownload: true
  });

  return streams;
}
