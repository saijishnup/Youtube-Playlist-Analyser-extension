# YouTube Playlist Analyzer

A Chrome extension to analyze YouTube playlist duration with caching, speed breakdowns, and recent history.

## Setup

1. Create a YouTube Data API v3 key in Google Cloud Console.
2. Copy `config-example.js` to `config.js`.
3. Put your key in `config.js`:

```js
const API_KEY = 'YOUR_API_KEY_HERE';
```

Note: `config.js` is the actual runtime file used by the extension. `config-example.js` is only a template for users.

## Load In Chrome

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Click Load unpacked.
4. Select the `yt-playlist-analyzer/` folder.

## Current Features

- Analyze full playlist duration from URL.
- Optional range analysis with From and To.
- Speed breakdown rows for 1.25x, 1.50x, 1.75x, 2.00x, and custom speed.
- Recent searches overlay with playlist thumbnail, title, channel, and cached date/time.
- Close Results button in results header.
- Theme toggle (dark/light).
- Local caching with `chrome.storage.local`.

## File Structure

```
yt-playlist-analyzer/
|- manifest.json
|- popup.html
|- popup.css
|- popup.js
|- config.js
|- config-example.js
|- privacy-policy.html
|- icons/
`- js/
   |- api.js
   |- cache.js
   |- parser.js
   |- theme.js
   `- ui.js
```

## Privacy

See `privacy-policy.html` for the full privacy policy.

Summary:

- Data is fetched only from the YouTube Data API.
- Cached results are stored locally in the browser.
- No analytics and no third-party tracking.

## Author

saijishnup