# 🎬 PHASE

> **A high-performance cinematic streaming, desktop video player, and downloader platform — engineered with zero framework bloat and optimized for both desktop and mobile phone browsers.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![Performance](https://img.shields.io/badge/Load_Time-%3C50ms-success.svg)](#features)

---

## 🌟 Highlights

* **True Website Architecture (No Bloated Webapp):** Built using semantic HTML5, pure CSS3 design systems, and modular Vanilla JS. Loads in **under 50 milliseconds**, consumes negligible RAM, and preserves battery life on mobile devices.
* **Dual Responsive Experience:**
  * **Desktop Monitors:** Multi-column cinematic layout, keyboard navigation, instant search dropdown, one-click **"Play in VLC / MPV"**, and background chunked downloads.
  * **Mobile Browsers (iOS / Android):** Thumb-friendly bottom navigation bar, touch gestures (double-tap 10s skip, vertical swipe indicators), and native Picture-in-Picture (PiP).
* **Multi-Provider Scraping & Streaming Core:**
  * **Cinemeta / Stremio Metadata:** High-definition posters, backdrops, cast, ratings, and episodic breakdown.
  * **Multi-Cloud Stream Resolvers:** MovieBox VIP streams, 4kHDHub, Dramachi Asian drama/anime sources, and adaptive HLS feeds.
  * **Live IPTV Broadcasts:** Free HD live news, sports, entertainment, and documentary channels.
* **Desktop Download Hub:** Multi-threaded background downloads with real-time speed (MB/s), percentage tracking, and resume support.
* **Instant Phone Pairing (QR Code):** Displays an on-screen QR code and local network URL (`http://<local-ip>:8080`) to stream directly on any smartphone with zero setup or app store downloads.

---

## 🚀 Quick Start

### Prerequisites
* [Node.js](https://nodejs.org/) (v20+ recommended)
* Optional: [VLC media player](https://www.videolan.org/vlc/) or [MPV](https://mpv.io/) for external desktop hardware pass-through playback.

### 1. Clone the Repository
```bash
git clone https://github.com/taoqeersarwerco-arch/Phase.git
cd Phase
```

### 2. Start Phase
```bash
node server.js
```

### 3. Open in Browser
* **Desktop:** Navigate to `http://localhost:8080`
* **Mobile Phone:** Connect to the same Wi-Fi and open `http://<your-ip>:8080` or scan the on-screen QR code!

---

## 🎮 Desktop Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| `Space` | Play / Pause |
| `←` / `→` | Skip backward / forward 10 seconds |
| `↑` / `↓` | Adjust volume up / down |
| `F` | Toggle Fullscreen theater |
| `M` | Toggle Mute |
| `Esc` | Close theater player |

---

## 📱 Mobile Website Gestures
* **Double Tap Left Half:** Skip backward 10 seconds.
* **Double Tap Right Half:** Skip forward 10 seconds.
* **Picture-in-Picture:** Tap the PiP icon to continue streaming while multitasking.

---

## 📁 Project Architecture

```
Phase/
├── server.js                 # Zero-dependency HTTP & REST streaming server
├── public/
│   ├── index.html            # Semantic HTML5 cinema layout & meta tags
│   ├── css/
│   │   ├── style.css         # Dark glassmorphism & responsive mobile/desktop design system
│   │   └── player.css        # Cinema video player overlay & touch controls
│   └── js/
│       ├── app.js            # Main client controller, catalogs, search & modal handlers
│       ├── player.js         # Custom HLS / HTML5 player with shortcuts & gestures
│       └── downloader.js     # Real-time background download station UI
├── src/
│   ├── providers/
│   │   ├── cinemeta.js       # Stremio/Cinemeta catalog & metadata engine
│   │   ├── streamResolver.js # Multi-provider stream resolution & fallback logic
│   │   └── iptv.js           # Live television channel parser & stream feeds
│   ├── downloader.js         # Multi-chunk resumable download engine
│   ├── playerLauncher.js     # Desktop VLC / MPV launcher
│   └── network.js            # Local Wi-Fi discovery & QR code generator
└── package.json
```

---

## 📄 License
Released under the [MIT License](LICENSE).