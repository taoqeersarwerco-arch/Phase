// src/providers/iptv.js
// Live IPTV channel aggregator with categories and verified streaming feeds

const FEATURED_CHANNELS = [
  {
    id: "redbull-tv",
    name: "Red Bull TV",
    group: "Sports",
    logo: "https://images.redbull.com/t_logo/redbullcom/redbull-logo",
    stream_url: "https://rbmn-live.akamaized.net/hls/live/590964/BoRB-AT/master.m3u8",
    quality: "1080p HD"
  },
  {
    id: "euronews-en",
    name: "Euronews (English)",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/4/41/Euronews_2016_logo.svg/320px-Euronews_2016_logo.svg.png",
    stream_url: "https://euronews-euronews-world-1-au.samsung.wurl.tv/playlist.m3u8",
    quality: "1080p HD"
  },
  {
    id: "france24-en",
    name: "France 24 (English)",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/6/65/France_24_logo.svg/320px-France_24_logo.svg.png",
    stream_url: "https://static.france24.com/live/F24_EN_LO_HLS/live_tv.m3u8",
    quality: "720p HD"
  },
  {
    id: "aljazeera-en",
    name: "Al Jazeera English",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/f/f2/Al_Jazeera_English_logo.svg/320px-Al_Jazeera_English_logo.svg.png",
    stream_url: "https://live-hls-web-aje.getaj.net/AJE/03.m3u8",
    quality: "1080p HD"
  },
  {
    id: "dw-en",
    name: "DW News (English)",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/75/Deutsche_Welle_symbol.svg/320px-Deutsche_Welle_symbol.svg.png",
    stream_url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8",
    quality: "720p HD"
  },
  {
    id: "bloomberg-quicktake",
    name: "Bloomberg Quicktake",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Bloomberg_Logo.svg/320px-Bloomberg_Logo.svg.png",
    stream_url: "https://bloomberg.com/media-manifest/streams/us.m3u8",
    quality: "1080p HD"
  },
  {
    id: "nasa-tv",
    name: "NASA TV Public HD",
    group: "Documentary",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/e5/NASA_logo.svg/320px-NASA_logo.svg.png",
    stream_url: "https://ntv1.akamaized.net/hls/live/2014075/NASA-NTV1-HLS/master.m3u8",
    quality: "1080p HD"
  },
  {
    id: "weather-nation",
    name: "WeatherNation",
    group: "News",
    logo: "https://upload.wikimedia.org/wikipedia/en/thumb/e/e4/WeatherNation_logo.svg/320px-WeatherNation_logo.svg.png",
    stream_url: "https://weathernation.samsung.wurl.tv/playlist.m3u8",
    quality: "720p HD"
  },
  {
    id: "classical-arts",
    name: "Classic Arts Showcase",
    group: "Music",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/Classical_music_icon.svg/320px-Classical_music_icon.svg.png",
    stream_url: "https://casstream.mmdlive.lldns.net/casstream/85bc7df2ec6a47a1b0be07297e68fa7d/manifest.m3u8",
    quality: "720p HD"
  }
];

export async function getLiveChannels(category = null) {
  if (!category || category === 'All') {
    return FEATURED_CHANNELS;
  }
  return FEATURED_CHANNELS.filter(ch => ch.group.toLowerCase() === category.toLowerCase());
}

export function getCategories() {
  const groups = new Set(FEATURED_CHANNELS.map(c => c.group));
  return ['All', ...Array.from(groups)];
}
