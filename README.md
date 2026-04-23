# YouTube Playlist Analyzer

A minimal Chrome extension to analyze YouTube playlist durations — with caching, speed breakdowns, and recent searches.

---

## Setup

### 1. Get a YouTube Data API v3 Key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Navigate to **APIs & Services → Library**
4. Search **YouTube Data API v3** → Enable it
5. Go to **APIs & Services → Credentials → Create Credentials → API Key**
6. Copy the key

### 2. Add Your API Key

Open `js/api.js` and replace:
```js
const API_KEY = 'YOUR_API_KEY_HERE';
```
with your actual key.

> **Recommended:** Restrict your key to the YouTube Data API v3 and your extension ID in the Google Cloud Console to prevent misuse.

### 3. Load the Extension in Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right toggle)
3. Click **Load Unpacked**
4. Select the `youtube-playlist-analyzer/` folder
5. The extension icon appears in your toolbar

---

## Usage

| Feature | How |
|---|---|
| Analyze a playlist | Paste URL → click Analyze |
| Analyze a range | Fill From / To → click Analyze |
| Revisit past analysis | Toggle Recent → click any entry |
| Switch theme | Click 🌓 |
| Open playlist | Click ↗ next to title |

---

## File Structure

```
youtube-playlist-analyzer/
├── manifest.json       Chrome extension manifest (MV3)
├── popup.html          UI shell
├── popup.css           Matte grain theme system
├── popup.js            Main orchestrator
├── icons/              Extension icons
└── js/
    ├── api.js          YouTube Data API v3 integration
    ├── parser.js       ISO 8601 duration parsing & speed math
    ├── cache.js        chrome.storage.local cache layer
    ├── ui.js           DOM rendering & UI state
    └── theme.js        Dark / light theme toggle
```

---

## API Quota

YouTube Data API v3 gives **10,000 units/day** free.

| Operation | Cost |
|---|---|
| Playlist metadata | 1 unit |
| Playlist items (per page) | 1 unit |
| Video durations (per batch) | 1 unit |
| **Typical 100-video playlist** | ~5–7 units |

Cached playlists cost **0 units** on repeat visits.

If quota is exceeded, the extension shows the reset time (YouTube resets at midnight Pacific Time).

---

## Edge Cases Handled

| Situation | Behaviour |
|---|---|
| Invalid URL | Error message shown |
| Private playlist | "Access denied" message |
| Empty playlist | "Empty playlist" message |
| Unavailable videos | Counted separately, excluded from duration |
| Quota exceeded | Shows reset time |
| YouTube server error | Retry message shown |

---

## Privacy

- No data is sent to any server other than the YouTube Data API
- All cache stored locally via `chrome.storage.local`
- No analytics, no tracking

---

© saijishnup 2026