// src/providers/streamResolver.js
// Resolves high-speed streaming links and embeds across multiple providers

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

export async function resolveStreams(type, id, season = null, episode = null) {
  const streams = [];

  // 1. Check for dedicated benchmark stream if available
  if (SAMPLE_4K_STREAMS[id]) {
    const s = SAMPLE_4K_STREAMS[id];
    streams.push({
      id: "source-direct-sample",
      provider: "Phase Ultra CDN",
      quality: s.quality,
      format: "mp4",
      url: s.streamUrl,
      canDownload: true
    });
  }

  // 2. Add Multi-Server Cloud Embed Streams (Vidsrc, SuperEmbed, 2Embed)
  if (type === 'movie') {
    streams.push({
      id: "embed-vidsrc-vip",
      provider: "MovieBox VIP Cloud",
      quality: "1080p Full HD",
      format: "embed",
      embedUrl: `https://vidsrc.to/embed/movie/${id}`,
      canDownload: false
    });
    streams.push({
      id: "embed-super",
      provider: "4kHDHub Stream",
      quality: "4K UHD / 1080p",
      format: "embed",
      embedUrl: `https://multiembed.mov/?video_id=${id}`,
      canDownload: false
    });
    streams.push({
      id: "embed-2embed",
      provider: "Dramachi Fast Mirror",
      quality: "720p HD",
      format: "embed",
      embedUrl: `https://www.2embed.cc/embed/${id}`,
      canDownload: false
    });
  } else if (type === 'series' && season !== null && episode !== null) {
    streams.push({
      id: "embed-vidsrc-series",
      provider: "MovieBox VIP Cloud",
      quality: "1080p Full HD",
      format: "embed",
      embedUrl: `https://vidsrc.to/embed/tv/${id}/${season}/${episode}`,
      canDownload: false
    });
    streams.push({
      id: "embed-super-series",
      provider: "4kHDHub Stream",
      quality: "1080p / 720p",
      format: "embed",
      embedUrl: `https://multiembed.mov/?video_id=${id}&s=${season}&e=${episode}`,
      canDownload: false
    });
    streams.push({
      id: "embed-2embed-series",
      provider: "Dramachi Fast Mirror",
      quality: "720p HD",
      format: "embed",
      embedUrl: `https://www.2embed.cc/embedtv/${id}&s=${season}&e=${episode}`,
      canDownload: false
    });
  }

  // 3. Fallback High-Quality HLS Adaptive Feed
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
