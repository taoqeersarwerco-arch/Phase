// server.js
// Phase - Ultra-Lightweight Cinema Platform Server

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getTopCatalog, searchCatalog, getMetadata } from './src/providers/cinemeta.js';
import { getLiveChannels, getCategories } from './src/providers/iptv.js';
import { resolveStreams } from './src/providers/streamResolver.js';
import { startDownload, getDownloadList, cancelDownload } from './src/downloader.js';
import { launchPlayer } from './src/playerLauncher.js';
import { getNetworkInfo } from './src/network.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ico': 'image/x-icon'
};

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
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

function serveStatic(req, res, pathname) {
  let relativePath = pathname === '/' ? '/index.html' : pathname;
  let safePath = path.normalize(path.join(PUBLIC_DIR, relativePath));

  if (!safePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Access Denied');
  }

  if (!fs.existsSync(safePath) || fs.statSync(safePath).isDirectory()) {
    safePath = path.join(PUBLIC_DIR, 'index.html');
  }

  const ext = path.extname(safePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  const stat = fs.statSync(safePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': stat.size,
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400'
  });

  const stream = fs.createReadStream(safePath);
  stream.pipe(res);
}

const server = http.createServer(async (req, res) => {
  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;
  const searchParams = parsedUrl.searchParams;

  // API Endpoints
  if (pathname.startsWith('/api/')) {
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
        return sendJson(res, 200, { success: true, downloads: list });
      }

      if (pathname === '/api/download' && req.method === 'POST') {
        const body = await parseBody(req);
        if (!body.url) return sendJson(res, 400, { success: false, error: 'Missing stream URL' });
        const item = await startDownload(body);
        return sendJson(res, 200, { success: true, item });
      }

      if (pathname === '/api/download/cancel' && req.method === 'POST') {
        const body = await parseBody(req);
        const cancelled = cancelDownload(body.id);
        return sendJson(res, 200, { success: true, cancelled });
      }

      if (pathname === '/api/player/launch' && req.method === 'POST') {
        const body = await parseBody(req);
        const result = launchPlayer(body.streamUrl, body.player, body.title);
        return sendJson(res, 200, result);
      }

      if (pathname === '/api/network' && req.method === 'GET') {
        const info = getNetworkInfo(PORT);
        return sendJson(res, 200, { success: true, network: info });
      }

      if (pathname === '/api/health') {
        return sendJson(res, 200, { status: 'ok', name: 'Phase Cinema Hub', uptime: process.uptime() });
      }

      return sendJson(res, 404, { success: false, error: 'API route not found' });
    } catch (err) {
      console.error(`[Server API Error]:`, err);
      return sendJson(res, 500, { success: false, error: err.message });
    }
  }

  // Serve Frontend Website
  serveStatic(req, res, pathname);
});

server.listen(PORT, '0.0.0.0', () => {
  const net = getNetworkInfo(PORT);
  console.log('====================================================');
  console.log(`🎬 PHASE - Cinematic Streaming & Downloader Active`);
  console.log(`💻 Desktop: ${net.desktopUrl}`);
  console.log(`📱 Mobile:  ${net.mobileUrl}`);
  console.log(`====================================================`);
});
