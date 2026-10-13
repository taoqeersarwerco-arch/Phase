// src/apiHandler.js
// Shared REST API Handler for both Local Server and Vercel Serverless Function

import { getTopCatalog, searchCatalog, getMetadata } from './providers/cinemeta.js';
import { getLiveChannels, getCategories } from './providers/iptv.js';
import { resolveStreams } from './providers/streamResolver.js';
import { startDownload, getDownloadList, cancelDownload } from './downloader.js';
import { launchPlayer } from './playerLauncher.js';
import { getNetworkInfo } from './network.js';

export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

export async function parseBody(req) {
  // If body is already parsed by serverless runtime
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body); } catch { return {}; }
  }

  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

export async function handleApiRequest(req, res, parsedUrl) {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;
  const isVercel = Boolean(process.env.VERCEL || process.env.NOW_REGION);

  try {
    if (pathname === '/api/catalog' && req.method === 'GET') {
      const type = searchParams.get('type') || 'movie';
      const genre = searchParams.get('genre') || null;
      const skip = parseInt(searchParams.get('skip') || '0', 10);
      const items = await getTopCatalog(type, genre, skip);
      return sendJson(res, 200, { success: true, count: items.length, items });
    }

    if (pathname === '/api/search' && req.method === 'GET') {
      const query = searchParams.get('q') || '';
      const type = searchParams.get('type') || 'movie';
      const items = await searchCatalog(query, type);
      return sendJson(res, 200, { success: true, count: items.length, items });
    }

    if (pathname === '/api/meta' && req.method === 'GET') {
      const type = searchParams.get('type') || 'movie';
      const id = searchParams.get('id') || '';
      const meta = await getMetadata(type, id);
      return sendJson(res, 200, { success: true, meta });
    }

    if (pathname === '/api/streams' && req.method === 'GET') {
      const type = searchParams.get('type') || 'movie';
      const id = searchParams.get('id') || '';
      const season = searchParams.get('season') ? parseInt(searchParams.get('season'), 10) : null;
      const episode = searchParams.get('episode') ? parseInt(searchParams.get('episode'), 10) : null;
      const streams = await resolveStreams(type, id, season, episode);
      return sendJson(res, 200, { success: true, streams });
    }

    if (pathname === '/api/live' && req.method === 'GET') {
      const category = searchParams.get('category') || null;
      const channels = await getLiveChannels(category);
      const categories = getCategories();
      return sendJson(res, 200, { success: true, categories, channels });
    }

    if (pathname === '/api/downloads' && req.method === 'GET') {
      const list = getDownloadList();
      return sendJson(res, 200, { success: true, isVercel, downloads: list });
    }

    if (pathname === '/api/download' && req.method === 'POST') {
      const body = await parseBody(req);
      if (!body.url) return sendJson(res, 400, { success: false, error: 'Missing stream URL' });

      if (isVercel) {
        // In serverless cloud, direct browser download is used
        return sendJson(res, 200, {
          success: true,
          isVercel: true,
          directDownloadUrl: body.url,
          message: 'Serverless deployment: triggering direct browser download'
        });
      }

      const item = await startDownload(body);
      return sendJson(res, 200, { success: true, isVercel: false, item });
    }

    if (pathname === '/api/download/cancel' && req.method === 'POST') {
      const body = await parseBody(req);
      const cancelled = cancelDownload(body.id);
      return sendJson(res, 200, { success: true, cancelled });
    }

    if (pathname === '/api/player/launch' && req.method === 'POST') {
      if (isVercel) {
        return sendJson(res, 200, {
          success: false,
          error: 'External desktop player (VLC/MPV) is available when running Phase locally on your desktop.'
        });
      }
      const body = await parseBody(req);
      const result = launchPlayer(body.streamUrl, body.player, body.title);
      return sendJson(res, 200, result);
    }

    if (pathname === '/api/network' && req.method === 'GET') {
      if (isVercel) {
        const host = req.headers['x-forwarded-host'] || req.headers.host || 'phase.vercel.app';
        const publicUrl = `https://${host}`;
        const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&data=${encodeURIComponent(publicUrl)}`;
        return sendJson(res, 200, {
          success: true,
          network: {
            localIp: host,
            port: 443,
            desktopUrl: publicUrl,
            mobileUrl: publicUrl,
            qrCodeUrl,
            isCloud: true
          }
        });
      }

      const port = searchParams.get('port') ? parseInt(searchParams.get('port'), 10) : 8080;
      const info = getNetworkInfo(port);
      return sendJson(res, 200, { success: true, network: info });
    }

    if (pathname === '/api/health') {
      return sendJson(res, 200, {
        status: 'ok',
        name: 'Phase Cinema Hub',
        isVercel,
        uptime: process.uptime()
      });
    }

    return sendJson(res, 404, { success: false, error: 'API route not found' });
  } catch (err) {
    console.error(`[API Error]:`, err);
    return sendJson(res, 500, { success: false, error: err.message });
  }
}
