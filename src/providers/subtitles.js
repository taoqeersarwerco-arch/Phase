// src/providers/subtitles.js
// High-reliability Subtitle Engine for Phase: fetches multilingual subtitles and converts to CORS-friendly WebVTT

const LANG_MAP = {
  eng: 'English',
  spa: 'Spanish',
  fre: 'French',
  fra: 'French',
  deu: 'German',
  ger: 'German',
  ita: 'Italian',
  por: 'Portuguese',
  pob: 'Portuguese (Brazil)',
  rus: 'Russian',
  ara: 'Arabic',
  hin: 'Hindi',
  zho: 'Chinese',
  chi: 'Chinese',
  jpn: 'Japanese',
  kor: 'Korean',
  tur: 'Turkish',
  nld: 'Dutch',
  dut: 'Dutch',
  pol: 'Polish',
  swe: 'Swedish',
  nor: 'Norwegian',
  dan: 'Danish',
  fin: 'Finnish',
  heb: 'Hebrew',
  ind: 'Indonesian',
  vie: 'Vietnamese',
  tha: 'Thai',
  ell: 'Greek',
  gre: 'Greek',
  ces: 'Czech',
  cze: 'Czech',
  hun: 'Hungarian',
  ron: 'Romanian',
  rum: 'Romanian',
  ben: 'Bengali',
  fas: 'Persian',
  per: 'Persian',
  ukr: 'Ukrainian',
  tam: 'Tamil',
  tel: 'Telugu',
  mal: 'Malayalam'
};

/**
 * Fetch subtitles for a movie or TV series episode from Stremio OpenSubtitles v3
 */
export async function getSubtitles(type, id, season = null, episode = null) {
  if (!id) return [];

  let queryId = id;
  if (type === 'series') {
    const s = season ?? 1;
    const e = episode ?? 1;
    queryId = `${id}:${s}:${e}`;
  }

  const url = `https://opensubtitles-v3.strem.io/subtitles/${type}/${queryId}.json`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Phase/2.0'
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) return [];

    const data = await res.json();
    const rawSubs = data.subtitles || [];

    // Group and sort subtitles cleanly
    const processed = rawSubs.map(s => {
      const code = (s.lang || 'eng').toLowerCase();
      const langName = LANG_MAP[code] || s.lang || 'Unknown';
      const releaseName = s.movieReleaseName || s.subtitleFileName || s.releaseGroup || '';

      return {
        id: s.id || Math.random().toString(36).substring(7),
        lang: langName,
        langCode: code,
        url: s.url,
        release: releaseName,
        format: 'vtt',
        vttProxyUrl: `/api/subtitles/vtt?url=${encodeURIComponent(s.url)}`
      };
    });

    // Sort English and high-priority languages first, then alphabetically
    const priority = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Hindi', 'Arabic'];
    processed.sort((a, b) => {
      const idxA = priority.indexOf(a.lang);
      const idxB = priority.indexOf(b.lang);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.lang.localeCompare(b.lang);
    });

    return processed;
  } catch (err) {
    console.warn('[Subtitles fetch error]:', err.message);
    return [];
  }
}

/**
 * Convert SRT text into standard, valid WebVTT format
 */
export function srtToVtt(srtContent) {
  if (!srtContent) return 'WEBVTT\n\n';

  // Normalize line breaks
  let text = srtContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.substring(1);
  }

  // Convert SRT timestamps (00:01:23,456) to WebVTT timestamps (00:01:23.456)
  const converted = text.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, (m, p1, p2) => `${p1}.${p2}`);

  return `WEBVTT\n\n${converted}\n`;
}
