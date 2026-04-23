/* ═══════════════════════════════════════════════════════
   cache.js — chrome.storage.local Cache Layer
═══════════════════════════════════════════════════════ */

'use strict';

const CACHE_PREFIX   = 'playlist_';
const RECENTS_KEY    = 'recent_ids';
const MAX_RECENTS    = 10;

/* ── Save a full playlist result to cache ── */
function saveToCache(result) {
  const key = CACHE_PREFIX + result.id;
  const payload = {
    id:          result.id,
    title:       result.title,
    channel:     result.channel,
    thumbnail:   result.thumbnail,
    videoCount:  result.videoCount,
    unavailable: result.unavailable,
    durations:   result.durations,
    cachedAt:    Date.now(),
  };
  chrome.storage.local.set({ [key]: payload });
  _addToRecents(result.id);
}

/* ── Load a playlist from cache by ID ── */
function loadFromCache(playlistId) {
  return new Promise((resolve) => {
    const key = CACHE_PREFIX + playlistId;
    chrome.storage.local.get(key, (data) => {
      resolve(data[key] ?? null);
    });
  });
}

/* ── Check cache first; returns null if not found ── */
async function getCachedResult(rawUrl) {
  const id = extractPlaylistId(rawUrl); /* from api.js — loaded before cache.js */
  if (!id) return null;
  return await loadFromCache(id);
}

/* ── Get all recent playlist entries (ordered, newest first) ── */
function getRecents() {
  return new Promise((resolve) => {
    chrome.storage.local.get(RECENTS_KEY, (data) => {
      const ids = data[RECENTS_KEY] ?? [];
      if (ids.length === 0) return resolve([]);

      const keys = ids.map(id => CACHE_PREFIX + id);
      chrome.storage.local.get(keys, (entries) => {
        const results = ids
          .map(id => entries[CACHE_PREFIX + id])
          .filter(Boolean);
        resolve(results);
      });
    });
  });
}

/* ── Clear a single playlist from cache ── */
function removeFromCache(playlistId) {
  const key = CACHE_PREFIX + playlistId;
  chrome.storage.local.remove(key);
  _removeFromRecents(playlistId);
}

/* ── Clear everything ── */
function clearAllCache() {
  chrome.storage.local.clear();
}

/* ══ Internal helpers ══ */

function _addToRecents(playlistId) {
  chrome.storage.local.get(RECENTS_KEY, (data) => {
    let ids = data[RECENTS_KEY] ?? [];
    ids = ids.filter(id => id !== playlistId); /* remove duplicate */
    ids.unshift(playlistId);                   /* add to front */
    if (ids.length > MAX_RECENTS) ids = ids.slice(0, MAX_RECENTS);
    chrome.storage.local.set({ [RECENTS_KEY]: ids });
  });
}

function _removeFromRecents(playlistId) {
  chrome.storage.local.get(RECENTS_KEY, (data) => {
    const ids = (data[RECENTS_KEY] ?? []).filter(id => id !== playlistId);
    chrome.storage.local.set({ [RECENTS_KEY]: ids });
  });
}