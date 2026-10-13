// src/network.js
// Local network discovery and mobile pairing URL generator

import os from 'node:os';

export function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Look for IPv4, not internal loopback
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

export function getNetworkInfo(port = 8080) {
  const localIp = getLocalIpAddress();
  const mobileUrl = `http://${localIp}:${port}`;
  const desktopUrl = `http://localhost:${port}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=240x240&format=svg&data=${encodeURIComponent(mobileUrl)}`;

  return {
    localIp,
    port,
    desktopUrl,
    mobileUrl,
    qrCodeUrl
  };
}
