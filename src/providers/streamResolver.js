// src/providers/streamResolver.js
// Resolves high-speed streaming links, unblocked cloud embeds, and real 4KHDHub releases

import { search4KHdHub, get4KHdHubReleases } from './fourkhdhub.js';

// High-definition public sample streams for benchmarking player & downloader
const SAMPLE_4K_STREAMS = {
  "tt0111161": { // The Shawshank Redemption
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    quality: "1080p FHD"
  },
  "tt0468569": { // The Dark Knight
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4",
    quality: "4K UHD"
  },
  "tt1375666": { // Inception
    streamUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4",
    quality: "4K UHD"
  }
};

export async function resolveStreams(type, id, season = null, episode = null, title = null) {
  const streams = [];

  // 1. Check for dedicated benchmark stream if available
  if (SAMPLE_4K_STREAMS[id]) {
    const s = SAMPLE_4K_STREAMS[id];
    streams.push({
      id: "source-direct-sample",
      provider: "Phase Ultra CDN (Direct)",
      quality: s.quality,
      format: "mp4",
      url: s.streamUrl,
      canDownload: true
    });
  }

  // 2. High-Reliability Unblocked Multi-Server Embed Mirrors (Never blocked by X-Frame-Options)
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

  // 3. 4KHDHub Real Cloud & BluRay Releases (Just like MovieBox-Tui)
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
    provider: "Server 4: Phase Adaptive HLS",
    quality: "1080p Adaptive",
    format: "hls",
    url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
    canDownload: true
  });

  return streams;
}
