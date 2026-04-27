/* ═══════════════════════════════════════════════════════
   ui.js — DOM Rendering & UI State Management
═══════════════════════════════════════════════════════ */

'use strict';

/* ══════════════════════════════════════════════════════
   ELEMENT REFS
══════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);

const els = {
  /* Part C — results */
  partC:        $('partC'),
  resTitle:     $('resTitle'),
  resOpenLink:  $('resOpenLink'),
  resCloseBtn:  $('resCloseBtn'),
  resId:        $('resId'),
  resCreator:   $('resCreator'),
  resVideoCount:$('resVideoCount'),
  resUnavailable:$('resUnavailable'),
  unavailChip:  $('unavailableChip'),
  resAverage:   $('resAverage'),
  resTotal:     $('resTotal'),

  /* Speed values */
  speed125:     $('speed125'),
  speed150:     $('speed150'),
  speed175:     $('speed175'),
  speed200:     $('speed200'),
  speedCustom:  $('speedCustom'),
  customSpeed:  $('customSpeed'),

  /* Loader */
  loader:       $('loader'),

  /* Status message */
  statusMsg:    $('statusMsg'),

  /* Recent overlay */
  recentOverlay:$('recentOverlay'),
  recentList:   $('recentList'),
  recentEmpty:  $('recentEmpty'),
  recentToggle: $('recentToggle'),
  closeRecent:  $('closeRecent'),

  /* Input */
  playlistUrl:  $('playlistUrl'),
  clearUrl:     $('clearUrl'),
  fromVideo:    $('fromVideo'),
  toVideo:      $('toVideo'),
  analyzeBtn:   $('analyzeBtn'),
};

/* ══════════════════════════════════════════════════════
   LOADER
══════════════════════════════════════════════════════ */

function showLoader() {
  els.partC.hidden  = false;
  els.loader.hidden = false;
  /* Hide result content while loading */
  els.loader.previousElementSibling && (els.loader.previousElementSibling.style.display = 'none');
  clearStatus();
}

function hideLoader() {
  els.loader.hidden = true;
  if (els.loader.previousElementSibling) {
    els.loader.previousElementSibling.style.display = '';
  }
}

/* ══════════════════════════════════════════════════════
   STATUS / ERROR MESSAGES
══════════════════════════════════════════════════════ */

function showError(msg) {
  els.statusMsg.textContent = msg;
  els.statusMsg.className   = 'status-msg is-error';
  els.statusMsg.hidden      = false;
}

function showInfo(msg) {
  els.statusMsg.textContent = msg;
  els.statusMsg.className   = 'status-msg is-info';
  els.statusMsg.hidden      = false;
}

function clearStatus() {
  els.statusMsg.hidden    = true;
  els.statusMsg.textContent = '';
}

/* ══════════════════════════════════════════════════════
   RENDER RESULTS (Part C)
══════════════════════════════════════════════════════ */

/**
 * Renders a full playlist result into Part C.
 * @param {Object} result   - from analyzePlaylist() or cache
 * @param {number} totalSec - precomputed total seconds
 * @param {number} avgSec   - precomputed average seconds
 */
function renderResults(result, totalSec, avgSec) {
  /* Meta */
  els.resTitle.textContent      = result.title;
  els.resOpenLink.href          = `https://www.youtube.com/playlist?list=${result.id}`;
  els.resId.textContent         = result.id;
  els.resCreator.textContent    = result.channel;
  els.resVideoCount.textContent = result.videoCount;
  els.resAverage.textContent    = secondsToHMS(avgSec);
  els.resTotal.textContent      = secondsToHMS(totalSec);

  /* Unavailable chip — only show if > 0 */
  if (result.unavailable > 0) {
    els.resUnavailable.textContent = result.unavailable;
    els.unavailChip.hidden         = false;
  } else {
    els.unavailChip.hidden = true;
  }

  /* Speed rows */
  const speeds = allSpeeds(totalSec, parseCustomSpeed());
  els.speed125.textContent    = speeds.s125;
  els.speed150.textContent    = speeds.s150;
  els.speed175.textContent    = speeds.s175;
  els.speed200.textContent    = speeds.s200;
  els.speedCustom.textContent = speeds.custom;

  /* Show section */
  els.partC.hidden = false;
  els.partC.classList.add('fade-in');
}

/* ══════════════════════════════════════════════════════
   CUSTOM SPEED — live update
══════════════════════════════════════════════════════ */

function parseCustomSpeed() {
  const val = parseFloat(els.customSpeed.value);
  return (!isNaN(val) && val > 0) ? val : 1.0;
}

/**
 * Call this after renderResults to wire the custom speed input.
 * Stores total seconds on the element for live recalculation.
 */
function bindCustomSpeed(totalSec) {
  els.customSpeed.dataset.totalSec = totalSec;

  els.customSpeed.addEventListener('input', () => {
    const speed = parseCustomSpeed();
    els.speedCustom.textContent = atSpeed(totalSec, speed);
  });
}

/* ══════════════════════════════════════════════════════
   RECENT SEARCHES — PART B
══════════════════════════════════════════════════════ */

/** Renders the recent searches overlay list */
async function renderRecents() {
  const recents = await getRecents();
  els.recentList.innerHTML = '';

  if (recents.length === 0) {
    els.recentEmpty.hidden = false;
    return;
  }

  els.recentEmpty.hidden = true;

  recents.forEach(entry => {
    const { dateText, timeText } = formatRecentDateTime(entry.cachedAt);

    const li = document.createElement('li');
    li.className  = 'recent-item';
    li.role       = 'option';
    li.tabIndex   = 0;
    li.dataset.id = entry.id;

    li.innerHTML = `
      ${entry.thumbnail
        ? `<img class="recent-thumb" src="${entry.thumbnail}" alt="" loading="lazy" />`
        : `<div class="recent-thumb" style="display:flex;align-items:center;justify-content:center;font-size:16px;">▶</div>`
      }
      <div class="recent-info">
        <span class="recent-playlist-title">${escapeHtml(entry.title)}</span>
        <span class="recent-channel">${escapeHtml(entry.channel)}</span>
      </div>
      <div class="recent-side">
        <div class="recent-meta" aria-hidden="true">
          <span class="recent-date">${dateText}</span>
          <span class="recent-time">${timeText}</span>
        </div>
        <button
          class="btn-recent-delete"
          type="button"
          aria-label="Remove from recent searches"
          title="Remove"
        >✕</button>
      </div>
    `;

    /* Click or Enter → load cached result */
    const load = () => loadRecentEntry(entry);
    li.addEventListener('click', load);
    li.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.target.closest('.btn-recent-delete')) load();
    });

    const deleteBtn = li.querySelector('.btn-recent-delete');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFromCache(entry.id);
      li.remove();

      if (!els.recentList.children.length) {
        els.recentEmpty.hidden = false;
      }
    });

    els.recentList.appendChild(li);
  });
}

function formatRecentDateTime(timestamp) {
  if (!timestamp || Number.isNaN(Number(timestamp))) {
    return { dateText: '--', timeText: '--' };
  }

  const dt = new Date(Number(timestamp));
  return {
    dateText: dt.toLocaleDateString(undefined, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }),
    timeText: dt.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

/** Loads a cached entry into the results without an API call */
function loadRecentEntry(entry) {
  /* Pre-fill URL input */
  els.playlistUrl.value = `https://www.youtube.com/playlist?list=${entry.id}`;

  /* Compute durations from stored data */
  const { totalSeconds, averageSeconds } = computeDurations(entry.durations);

  /* Render */
  renderResults(entry, totalSeconds, averageSeconds);
  bindCustomSpeed(totalSeconds);

  /* Close overlay */
  toggleRecentOverlay(false);
}

/* ══════════════════════════════════════════════════════
   RECENT OVERLAY TOGGLE
══════════════════════════════════════════════════════ */

function toggleRecentOverlay(force) {
  const show = force !== undefined ? force : els.recentOverlay.hidden;

  if (show) {
    renderRecents();
    els.recentOverlay.hidden = false;
    els.recentToggle.setAttribute('aria-pressed', 'true');
    document.body.classList.add('recent-open');
  } else {
    els.recentOverlay.hidden = true;
    els.recentToggle.setAttribute('aria-pressed', 'false');
    document.body.classList.remove('recent-open');
  }
}

function bindResultsControls() {
  els.resCloseBtn.addEventListener('click', () => {
    resetResults();
    toggleRecentOverlay(false);
  });
}

/* ══════════════════════════════════════════════════════
   CLEAR URL BUTTON
══════════════════════════════════════════════════════ */

function bindClearButton() {
  els.clearUrl.addEventListener('click', () => {
    els.playlistUrl.value = '';
    els.partC.hidden      = true;
    clearStatus();
    els.playlistUrl.focus();
  });
}

/* ══════════════════════════════════════════════════════
   RECENT TOGGLE + CLOSE BUTTON EVENTS
══════════════════════════════════════════════════════ */

function bindRecentControls() {
  els.recentToggle.addEventListener('click', () => {
    toggleRecentOverlay();
  });

  els.closeRecent.addEventListener('click', () => {
    toggleRecentOverlay(false);
  });
}

/* ══════════════════════════════════════════════════════
   UTILITY
══════════════════════════════════════════════════════ */

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* Reset results section to blank state */
function resetResults() {
  els.partC.hidden = true;
  els.partC.classList.remove('fade-in');
  clearStatus();
}