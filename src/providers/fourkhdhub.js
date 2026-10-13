// src/providers/fourkhdhub.js
// 4KHDHub scraper: extracts high-bitrate 4K UHD and 1080p BluRay releases

export async function search4KHdHub(query) {
  if (!query) return [];
  try {
    const clean = query.replace(/[^\w\s]/gi, ' ').trim();
    const url = `https://4khdhub.one/?s=${encodeURIComponent(clean)}`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) return [];

    const html = await res.text();
    const items = [];
    const parts = html.split('class="movie-card"');

    for (let i = 0; i < parts.length - 1; i++) {
      const prev = parts[i];
      const after = parts[i + 1];

      // Find href from previous chunk
      const hrefIdx = prev.lastIndexOf('href="');
      if (hrefIdx === -1) continue;
      const pagePath = prev.substring(hrefIdx + 6).split('"')[0];

      // Find title from after chunk
      const altIdx = after.indexOf('alt="');
      let title = 'Title';
      if (altIdx !== -1) {
        title = after.substring(altIdx + 5).split('"')[0];
      }

      items.push({
        title,
        pageUrl: pagePath.startsWith('http') ? pagePath : `https://4khdhub.one${pagePath}`
      });
    }

    return items;
  } catch (err) {
    console.error('[4KHDHub search error]:', err.message);
    return [];
  }
}

export async function get4KHdHubReleases(pageUrl) {
  if (!pageUrl) return [];
  try {
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return [];

    const html = await res.text();
    const releases = [];
    const sections = html.split('class="download-item');

    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      const titleStart = sec.indexOf('class="file-title">');
      let title = '';
      if (titleStart !== -1) {
        title = sec.substring(titleStart + 19).split('</div>')[0].trim();
      } else {
        const headerStart = sec.indexOf('class="flex-1 text-left font-semibold">');
        if (headerStart !== -1) {
          title = sec.substring(headerStart + 39).split('<br>')[0].replace(/<[^>]+>/g, '').trim();
        }
      }

      // Find download links
      const linkMatches = [...sec.matchAll(/href="([^"]+)"[^>]*class="btn[^"]*">([\s\S]*?)<\/a>/gi)];
      for (const lm of linkMatches) {
        const href = lm[1];
        const label = lm[2].replace(/<[^>]+>/g, '').trim();

        let quality = '1080p FHD';
        if (title.includes('2160p') || title.includes('4K')) quality = '4K UHD';
        else if (title.includes('720p')) quality = '720p HD';

        releases.push({
          title,
          quality,
          hubcloudUrl: href,
          provider: `4KHDHub (${label || 'Direct'})`
        });
      }
    }

    return releases;
  } catch (err) {
    console.error('[4KHDHub releases error]:', err.message);
    return [];
  }
}
