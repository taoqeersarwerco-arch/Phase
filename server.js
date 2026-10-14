// server.js
// Phase - Ultra-Lightweight Cinema Platform Server (Local & Portable)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleApiRequest } from './src/apiHandler.js';
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
    'Cache-Control': 'no-cache, no-store, must-revalidate'
  });

  const stream = fs.createReadStream(safePath);
  stream.pipe(res);
}

export const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Route API endpoints
  if (pathname.startsWith('/api/')) {
    return handleApiRequest(req, res, parsedUrl);
  }

  // Serve Frontend Website
  serveStatic(req, res, pathname);
});

// Start listener only when run directly (not when imported as a module by serverless)
if (!process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    const net = getNetworkInfo(PORT);
    console.log('====================================================');
    console.log(`🎬 PHASE - Cinematic Streaming & Downloader Active`);
    console.log(`💻 Desktop: ${net.desktopUrl}`);
    console.log(`📱 Mobile:  ${net.mobileUrl}`);
    console.log('====================================================');
  });
}

export default server;
