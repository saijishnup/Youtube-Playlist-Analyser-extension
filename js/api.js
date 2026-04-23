/* ═══════════════════════════════════════════════════════
   api.js — YouTube Data API v3 Integration
   Responsibilities:
     • Extract playlist ID from any YouTube URL format
     • Fetch all playlist items (paginated, 50 per page)
     • Batch-fetch video durations (50 IDs per request)
     • Handle all API error cases gracefully
═══════════════════════════════════════════════════════ */

'use strict';

/* ── API key is loaded from config.js (never committed) ──
   See config.example.js for setup instructions.
──────────────────────────────────────────────────────── */
// API_KEY is declared in config.js, loaded before this script in popup.html

const BASE_URL = 'https://www.googleapis.com/youtube/v3';

/* Maximum items YouTube allows per page request */
const PAGE_SIZE = 50;


/* ══════════════════════════════════════════════════════
   1. URL → PLAYLIST ID EXTRACTOR
══════════════════════════════════════════════════════ */

/**
 * Extracts the playlist ID from any valid YouTube playlist URL.
 *
 * Supports formats:
 *   https://www.youtube.com/playlist?list=PLxxxxxx
 *   https://youtube.com/playlist?list=PLxxxxxx
 *   https://www.youtube.com/watch?v=xxxxxx&list=PLxxxxxx
 *   https://youtu.be/xxxxxx?list=PLxxxxxx
 *   PLxxxxxx  (raw ID passed directly)
 *
 * @param {string} input - URL or raw playlist ID
 * @returns {string|null} - Playlist ID or null if invalid
 */
function extractPlaylistId(input) {
  if (!input || typeof input !== 'string') return null;

  const trimmed = input.trim();

  /* Raw playlist ID — starts with PL, UU, FL, RD, etc. (no spaces, no slashes) */
  if (/^[A-Za-z0-9_-]{10,}$/.test(trimmed) && !trimmed.includes('youtube')) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);

    /* Standard ?list= parameter (works for /playlist and /watch URLs) */
    const listParam = url.searchParams.get('list');
    if (listParam) return listParam;

  } catch {
    /* Not a valid URL — check if it's a raw ID anyway */
    const rawMatch = trimmed.match(/[?&]list=([A-Za-z0-9_-]+)/);
    if (rawMatch) return rawMatch[1];
  }

  return null;
}


/* ══════════════════════════════════════════════════════
   2. FETCH PLAYLIST METADATA + ALL VIDEO IDs
══════════════════════════════════════════════════════ */

/**
 * Fetches ALL items from a playlist using pagination.
 * YouTube returns max 50 per page — loops via nextPageToken.
 *
 * @param {string} playlistId
 * @param {number|null} fromVideo - 1-based start index (optional)
 * @param {number|null} toVideo   - 1-based end index (optional)
 * @returns {Promise<{ videoIds: string[], totalInPlaylist: number, unavailable: number }>}
 */
async function fetchAllPlaylistItems(playlistId, fromVideo = null, toVideo = null) {
  let videoIds = [];
  let nextPageToken = null;
  let totalInPlaylist = 0;
  let unavailable = 0;
  let pageIndex = 0;       /* tracks item count across pages */

  do {
    const params = new URLSearchParams({
      part: 'contentDetails,status',
      playlistId: playlistId,
      maxResults: PAGE_SIZE,
      key: API_KEY,
    });

    if (nextPageToken) {
      params.set('pageToken', nextPageToken);
    }

    const response = await fetch(`${BASE_URL}/playlistItems?${params}`);
    const data = await response.json();

    /* ── API-level error handling ── */
    if (!response.ok) {
      throwApiError(data, response.status);
    }

    /* Total count from first page */
    if (pageIndex === 0) {
      totalInPlaylist = data.pageInfo?.totalResults ?? 0;
    }

    if (!data.items || data.items.length === 0) break;

    for (const item of data.items) {
      pageIndex++;

      /* Apply from/to range filter (1-based) */
      if (fromVideo !== null && pageIndex < fromVideo) continue;
      if (toVideo   !== null && pageIndex > toVideo)   break;

      const videoId = item.contentDetails?.videoId;
      const privacyStatus = item.status?.privacyStatus;

      /* Skip deleted / private videos, count them as unavailable */
      if (!videoId || privacyStatus === 'private' || privacyStatus === 'privacyStatusUnspecified') {
        unavailable++;
        continue;
      }

      videoIds.push(videoId);
    }

    nextPageToken = data.nextPageToken ?? null;

    /* Stop paginating if we've passed the toVideo limit */
    if (toVideo !== null && pageIndex >= toVideo) break;

  } while (nextPageToken);

  return { videoIds, totalInPlaylist, unavailable };
}


/* ══════════════════════════════════════════════════════
   3. BATCH-FETCH VIDEO DURATIONS
══════════════════════════════════════════════════════ */

/**
 * Fetches ISO 8601 durations for an array of video IDs.
 * Batches in groups of 50 (YouTube API limit per request).
 *
 * @param {string[]} videoIds
 * @returns {Promise<string[]>} - Array of ISO 8601 duration strings e.g. "PT4M13S"
 */
async function fetchVideoDurations(videoIds) {
  if (!videoIds || videoIds.length === 0) return [];

  const durations = [];
  const batches = chunkArray(videoIds, PAGE_SIZE);

  for (const batch of batches) {
    const params = new URLSearchParams({
      part: 'contentDetails',
      id: batch.join(','),
      key: API_KEY,
    });

    const response = await fetch(`${BASE_URL}/videos?${params}`);
    const data = await response.json();

    if (!response.ok) {
      throwApiError(data, response.status);
    }

    if (!data.items) continue;

    for (const item of data.items) {
      const dur = item.contentDetails?.duration;
      if (dur) durations.push(dur);
    }
  }

  return durations;
}


/* ══════════════════════════════════════════════════════
   4. FETCH PLAYLIST TITLE + CHANNEL (metadata)
══════════════════════════════════════════════════════ */

/**
 * Fetches playlist title, channel name, and thumbnail.
 *
 * @param {string} playlistId
 * @returns {Promise<{ title: string, channel: string, thumbnail: string }>}
 */
async function fetchPlaylistMeta(playlistId) {
  const params = new URLSearchParams({
    part: 'snippet',
    id: playlistId,
    key: API_KEY,
  });

  const response = await fetch(`${BASE_URL}/playlists?${params}`);
  const data = await response.json();

  if (!response.ok) {
    throwApiError(data, response.status);
  }

  if (!data.items || data.items.length === 0) {
    throw new ExtensionError(
      'Playlist not found. It may be private or deleted.',
      'NOT_FOUND'
    );
  }

  const snippet = data.items[0].snippet;

  return {
    title:     snippet.title        ?? 'Untitled Playlist',
    channel:   snippet.channelTitle ?? 'Unknown Channel',
    thumbnail: snippet.thumbnails?.medium?.url
            ?? snippet.thumbnails?.default?.url
            ?? '',
  };
}


/* ══════════════════════════════════════════════════════
   5. MAIN ORCHESTRATOR — called by popup.js
══════════════════════════════════════════════════════ */

/**
 * Full pipeline: URL → ID → metadata → items → durations
 *
 * @param {string} rawUrl       - Raw URL or playlist ID from input
 * @param {number|null} from    - Optional start video number (1-based)
 * @param {number|null} to      - Optional end video number (1-based)
 * @returns {Promise<PlaylistResult>}
 *
 * @typedef {Object} PlaylistResult
 * @property {string}   id          - Playlist ID
 * @property {string}   title       - Playlist title
 * @property {string}   channel     - Channel name
 * @property {string}   thumbnail   - Thumbnail URL
 * @property {number}   videoCount  - Counted videos (in range, available)
 * @property {number}   unavailable - Unavailable/private video count
 * @property {string[]} durations   - ISO 8601 duration strings
 */
async function analyzePlaylist(rawUrl, from = null, to = null) {
  /* Step 1: Extract ID */
  const playlistId = extractPlaylistId(rawUrl);
  if (!playlistId) {
    throw new ExtensionError(
      'Invalid URL. Please paste a valid YouTube playlist link.',
      'INVALID_URL'
    );
  }

  /* Step 2: Fetch metadata + items in parallel for speed */
  const [meta, itemsResult] = await Promise.all([
    fetchPlaylistMeta(playlistId),
    fetchAllPlaylistItems(playlistId, from, to),
  ]);

  const { videoIds, unavailable } = itemsResult;

  if (videoIds.length === 0) {
    throw new ExtensionError(
      'This playlist appears to be empty or all videos are unavailable.',
      'EMPTY_PLAYLIST'
    );
  }

  /* Step 3: Batch-fetch durations */
  const durations = await fetchVideoDurations(videoIds);

  return {
    id:          playlistId,
    title:       meta.title,
    channel:     meta.channel,
    thumbnail:   meta.thumbnail,
    videoCount:  videoIds.length,
    unavailable: unavailable,
    durations:   durations,
  };
}


/* ══════════════════════════════════════════════════════
   6. ERROR HANDLING
══════════════════════════════════════════════════════ */

/**
 * Custom error class so popup.js can distinguish
 * our errors from unexpected JS errors.
 */
class ExtensionError extends Error {
  constructor(message, code = 'UNKNOWN') {
    super(message);
    this.name = 'ExtensionError';
    this.code = code;
  }
}

/**
 * Maps YouTube API error responses → friendly ExtensionError messages.
 * @param {Object} data       - Parsed JSON response body
 * @param {number} httpStatus - HTTP status code
 */
function throwApiError(data, httpStatus) {
  const reason = data?.error?.errors?.[0]?.reason ?? '';
  const message = data?.error?.message ?? '';

  if (httpStatus === 403) {
    if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded') {
      /* Calculate approx reset time (YouTube quota resets at midnight Pacific) */
      const resetMsg = getQuotaResetMessage();
      throw new ExtensionError(
        `Sorry, we have reached the maximum API limit. Try after ${resetMsg}.`,
        'QUOTA_EXCEEDED'
      );
    }
    if (reason === 'forbidden') {
      throw new ExtensionError(
        'Access denied. This playlist may be private.',
        'FORBIDDEN'
      );
    }
    throw new ExtensionError(
      'API access forbidden. Check your API key.',
      'FORBIDDEN'
    );
  }

  if (httpStatus === 400) {
    throw new ExtensionError(
      'Bad request. The playlist ID may be invalid.',
      'BAD_REQUEST'
    );
  }

  if (httpStatus === 404) {
    throw new ExtensionError(
      'Playlist not found. It may have been deleted or made private.',
      'NOT_FOUND'
    );
  }

  if (httpStatus >= 500) {
    throw new ExtensionError(
      'YouTube servers are having issues. Please try again shortly.',
      'SERVER_ERROR'
    );
  }

  throw new ExtensionError(
    message || 'An unexpected API error occurred. Please try again.',
    'API_ERROR'
  );
}

/**
 * Returns a human-readable quota reset time string.
 * YouTube quota resets at midnight Pacific Time (UTC-8 or UTC-7).
 */
function getQuotaResetMessage() {
  const now = new Date();
  /* Pacific Time offset: -8h standard, -7h daylight saving */
  const pacificOffset = isDST(now) ? -7 : -8;
  const pacificNow = new Date(now.getTime() + (pacificOffset * 60 * 60 * 1000));

  /* Next midnight Pacific */
  const reset = new Date(pacificNow);
  reset.setUTCHours(24, 0, 0, 0); /* next midnight UTC in pacific-adjusted time */

  /* Convert back to user's local time */
  const resetLocal = new Date(reset.getTime() - (pacificOffset * 60 * 60 * 1000));

  return resetLocal.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Rough DST check for US Pacific */
function isDST(date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return date.getTimezoneOffset() < Math.max(jan, jul);
}


/* ══════════════════════════════════════════════════════
   7. UTILITY
══════════════════════════════════════════════════════ */

/**
 * Splits an array into chunks of a given size.
 * Used for batching video ID requests.
 *
 * @param {any[]} array
 * @param {number} size
 * @returns {any[][]}
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}