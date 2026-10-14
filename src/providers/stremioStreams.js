// src/providers/stremioStreams.js
// Stremio Addon Protocol Stream Resolver for Phase: fetches native direct streams (.m3u8 / .mp4 / Debrid)

const DEFAULT_STREMIO_ADDONS = [
  // Primary community stream resolver (supports Debrid token via env var STREMIO_ADDON_URL)
  process.env.STREMIO_ADDON_URL || 'https://torrentio.strem.fun',
  'https://mediafusion.elfhosted.com'
];

/**
 * Fetch direct stream manifests from Stremio stream addons
 */
export async function getStremioStreams(type, id, season = null, episode = null) {
  if (!id) return [];

  let queryId = id;
  if (type === 'series') {
    const s = season ?? 1;
    const e = episode ?? 1;
    queryId = `${id}:${s}:${e}`;
  }

  const addonBase = process.env.STREMIO_ADDON_URL || 'https://torrentio.strem.fun';
  const url = `${addonBase.replace(/\/$/, '')}/stream/${type}/${queryId}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Phase/2.0'
      },
      signal: AbortSignal.timeout(4500)
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawStreams = data.streams || [];
    const directStreams = [];

    for (let i = 0; i < rawStreams.length; i++) {
      const s = rawStreams[i];
      const title = s.title || s.name || '';
      
      // Extract quality label (4K, 1080p, 720p)
      let quality = '1080p Full HD';
      if (/4k|2160p|uhd/i.test(title)) quality = '4K Ultra HD';
      else if (/720p/i.test(title)) quality = '720p HD';
      else if (/1080p/i.test(title)) quality = '1080p Full HD';

      // 1. Direct HTTP / HLS Stream URL (e.g. Debrid or HTTP media hosts)
      if (s.url) {
        const isHls = s.url.includes('.m3u8');
        directStreams.push({
          id: `stremio-direct-${i}`,
          provider: `Native CDN: ${s.name ? s.name.replace(/\n.*/g, '') : 'Stremio Stream'}`,
          quality: quality,
          format: isHls ? 'hls' : 'mp4',
          url: s.url,
          title: title,
          canDownload: true,
          isNative: true
        });
      } 
      // 2. BitTorrent Swarm InfoHash (playable via local streaming daemon or external desktop player)
      else if (s.infoHash) {
        const magnetUrl = `magnet:?xt=urn:btih:${s.infoHash}&dn=${encodeURIComponent(s.behaviorHints?.filename || id)}`;
        directStreams.push({
          id: `stremio-torrent-${i}`,
          provider: `P2P Swarm: ${s.name ? s.name.replace(/\n.*/g, '') : 'Torrentio'} (${quality})`,
          quality: quality,
          format: 'torrent',
          infoHash: s.infoHash,
          url: magnetUrl,
          title: title,
          canDownload: true,
          isNative: false
        });
      }
    }

    return directStreams;
  } catch (err) {
    console.warn('[Stremio addon stream error]:', err.message);
    return [];
  }
}
