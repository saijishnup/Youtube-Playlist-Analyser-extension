/* ═══════════════════════════════════════════════════════
   popup.js — Main Orchestrator
   Load order (from popup.html):
     theme.js → cache.js → parser.js → api.js → ui.js → popup.js
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════
   INIT — runs when popup opens
══════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initTheme();         /* theme.js — apply saved dark/light preference */
  bindClearButton();   /* ui.js   — wire ✕ button on URL input */
  bindRecentControls();/* ui.js   — wire toggle + close button */
  bindAnalyzeButton(); /* below   — wire Analyze button */
  bindCustomSpeed();   /* below   — will be re-bound after results render */
});


/* ══════════════════════════════════════════════════════
   ANALYZE BUTTON
══════════════════════════════════════════════════════ */

function bindAnalyzeButton() {
  const btn        = document.getElementById('analyzeBtn');
  const urlInput   = document.getElementById('playlistUrl');
  const fromInput  = document.getElementById('fromVideo');
  const toInput    = document.getElementById('toVideo');

  /* Allow Enter key on URL input to trigger analyze */
  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') runAnalysis();
  });

  btn.addEventListener('click', runAnalysis);

  async function runAnalysis() {
    const rawUrl = urlInput.value.trim();

    /* ── Validate input ── */
    if (!rawUrl) {
      showError('Please paste a YouTube playlist URL.');
      return;
    }

    const playlistId = extractPlaylistId(rawUrl);
    if (!playlistId) {
      showError('Invalid URL. Please paste a valid YouTube playlist link.');
      return;
    }

    /* ── Parse from/to ── */
    const from = parseRangeInput(fromInput.value);
    const to   = parseRangeInput(toInput.value);

    if (from !== null && to !== null && from > to) {
      showError('"From" must be less than or equal to "To".');
      return;
    }

    /* ── Check cache first ── */
    const cached = await loadFromCache(playlistId);

    if (cached && !from && !to) {
      /* Cache hit — no API call needed */
      renderFromData(cached);
      return;
    }

    /* ── Fetch from API ── */
    setLoadingState(true);

    try {
      const result = await analyzePlaylist(rawUrl, from, to);

      /* Save to cache only when no range filter applied */
      if (!from && !to) {
        saveToCache(result);
      }

      renderFromData(result);

    } catch (err) {
      hideLoader();
      resetResults();

      if (err instanceof ExtensionError) {
        showError(err.message);
      } else {
        /* Unexpected JS error */
        showError('Something went wrong. Please try again.');
        console.error('[PlaylistAnalyzer]', err);
      }
    } finally {
      setLoadingState(false);
    }
  }
}


/* ══════════════════════════════════════════════════════
   RENDER PIPELINE
══════════════════════════════════════════════════════ */

/**
 * Computes durations and calls ui.js render functions.
 * Works for both fresh API results and cached entries.
 * @param {Object} data - PlaylistResult shape
 */
function renderFromData(data) {
  const { totalSeconds, averageSeconds } = computeDurations(data.durations);

  hideLoader();
  clearStatus();
  renderResults(data, totalSeconds, averageSeconds);  /* ui.js */
  bindCustomSpeed(totalSeconds);                       /* ui.js */
}


/* ══════════════════════════════════════════════════════
   LOADING STATE
══════════════════════════════════════════════════════ */

function setLoadingState(isLoading) {
  const btn     = document.getElementById('analyzeBtn');
  const btnText = btn.querySelector('.btn__text');
  const btnIcon = btn.querySelector('.btn__icon');

  if (isLoading) {
    btn.disabled      = true;
    btnText.textContent = 'Analyzing…';
    btnIcon.textContent = '◌';
    showLoader(); /* ui.js */
  } else {
    btn.disabled        = false;
    btnText.textContent = 'Analyze';
    btnIcon.textContent = '◎';
  }
}


/* ══════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════ */

/**
 * Parses a range input value.
 * Returns null if empty/invalid, positive integer otherwise.
 */
function parseRangeInput(value) {
  if (!value || value.trim() === '') return null;
  const n = parseInt(value, 10);
  return (!isNaN(n) && n > 0) ? n : null;
}