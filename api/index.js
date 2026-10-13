// api/index.js
// Vercel Serverless Function entry point for all /api routes

import { handleApiRequest } from '../src/apiHandler.js';

export default async function handler(req, res) {
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
  const parsedUrl = new URL(req.url, `${protocol}://${host}`);

  return handleApiRequest(req, res, parsedUrl);
}
