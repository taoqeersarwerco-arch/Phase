// src/playerLauncher.js
// Launches local desktop media players (VLC or MPV) with hardware acceleration

import { spawn } from 'node:child_process';
import fs from 'node:fs';

const KNOWN_VLC_PATHS = [
  'C:\\Program Files\\VideoLAN\\VLC\\vlc.exe',
  'C:\\Program Files (x86)\\VideoLAN\\VLC\\vlc.exe',
  '/usr/bin/vlc',
  '/Applications/VLC.app/Contents/MacOS/VLC'
];

const KNOWN_MPV_PATHS = [
  'C:\\Program Files\\mpv\\mpv.exe',
  'C:\\mpv\\mpv.exe',
  '/usr/bin/mpv',
  '/usr/local/bin/mpv'
];

function findExecutable(paths, defaultCmd) {
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return defaultCmd;
}

export function launchPlayer(streamUrl, preferredPlayer = 'vlc', title = 'Phase Stream') {
  if (!streamUrl) {
    return { success: false, error: 'No stream URL provided' };
  }

  let cmd = 'vlc';
  let args = [];

  if (preferredPlayer === 'mpv') {
    cmd = findExecutable(KNOWN_MPV_PATHS, 'mpv');
    args = [`--title=${title}`, streamUrl];
  } else {
    cmd = findExecutable(KNOWN_VLC_PATHS, 'vlc');
    args = ['--meta-title', title, streamUrl];
  }

  try {
    const child = spawn(cmd, args, {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    return { success: true, player: preferredPlayer, launched: cmd };
  } catch (err) {
    console.error(`[PlayerLauncher] Failed to launch ${preferredPlayer}:`, err.message);
    return { success: false, error: err.message };
  }
}
