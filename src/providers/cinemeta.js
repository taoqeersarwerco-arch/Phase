// src/providers/cinemeta.js
// High-performance metadata and catalog engine powered by Cinemeta / Stremio protocol

const BASE_URL = 'https://v3-cinemeta.strem.io';
const cache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes cache

function getCached(key) {
  const item = cache.get(key);
  if (item && Date.now() - item.timestamp < CACHE_TTL_MS) {
    return item.data;
  }
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

export async function getTopCatalog(type = 'movie', genre = null, skip = 0) {
  const cacheKey = `catalog_${type}_${genre || 'all'}_${skip}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  let url = `${BASE_URL}/catalog/${type}/top.json`;
  if (genre) {
    url = `${BASE_URL}/catalog/${type}/top/genre=${encodeURIComponent(genre)}.json`;
  }
  if (skip > 0) {
    url = `${BASE_URL}/catalog/${type}/top/skip=${skip}.json`;
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Phase-Cinema/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = (data && data.metas) ? data.metas : [];
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[Cinemeta] getTopCatalog error:`, err.message);
    return [];
  }
}

export async function searchCatalog(query, type = 'movie') {
  if (!query || !query.trim()) return [];
  const cleanQuery = query.trim();
  const cacheKey = `search_${type}_${cleanQuery.toLowerCase()}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const encoded = encodeURIComponent(cleanQuery);
  const url = `${BASE_URL}/catalog/${type}/top/search=${encoded}.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Phase-Cinema/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = (data && data.metas) ? data.metas : [];
    setCached(cacheKey, result);
    return result;
  } catch (err) {
    console.error(`[Cinemeta] searchCatalog error:`, err.message);
    return [];
  }
}

export async function getMetadata(type, id) {
  if (!id) return null;
  const cacheKey = `meta_${type}_${id}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  const url = `${BASE_URL}/meta/${type}/${id}.json`;

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Phase-Cinema/1.0' }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = (data && data.meta) ? data.meta : null;
    if (result) {
      setCached(cacheKey, result);
    }
    return result;
  } catch (err) {
    console.error(`[Cinemeta] getMetadata error:`, err.message);
    return null;
  }
}
