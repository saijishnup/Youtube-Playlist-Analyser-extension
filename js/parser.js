/* ═══════════════════════════════════════════════════════
   parser.js — Duration Parsing & Speed Calculations
═══════════════════════════════════════════════════════ */

'use strict';

/**
 * ISO 8601 duration → total seconds
 * e.g. "PT1H4M13S" → 3853
 */
function isoToSeconds(iso) {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || 0);
  const m = parseInt(match[2] || 0);
  const s = parseInt(match[3] || 0);
  return (h * 3600) + (m * 60) + s;
}

/**
 * Seconds → "Xh Xm Xs" readable string
 * Omits zero-value leading units (e.g. no "0h" prefix)
 */
function secondsToHMS(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return '0m 0s';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);

  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/**
 * Computes total + average duration from ISO duration array.
 * @param {string[]} durations - ISO 8601 strings
 * @returns {{ totalSeconds: number, averageSeconds: number }}
 */
function computeDurations(durations) {
  if (!durations || durations.length === 0) {
    return { totalSeconds: 0, averageSeconds: 0 };
  }
  const totalSeconds = durations.reduce((sum, iso) => sum + isoToSeconds(iso), 0);
  const averageSeconds = Math.round(totalSeconds / durations.length);
  return { totalSeconds, averageSeconds };
}

/**
 * Computes duration at a given playback speed.
 * @param {number} totalSeconds
 * @param {number} speed - e.g. 1.25, 1.5, 2.0
 * @returns {string} - formatted "Xh Xm Xs"
 */
function atSpeed(totalSeconds, speed) {
  if (!speed || speed <= 0) return '—';
  return secondsToHMS(Math.round(totalSeconds / speed));
}

/**
 * Returns all speed variants at once.
 * @param {number} totalSeconds
 * @param {number} customSpeed
 * @returns {{ s125, s150, s175, s200, custom }}
 */
function allSpeeds(totalSeconds, customSpeed = 1.0) {
  return {
    s125:   atSpeed(totalSeconds, 1.25),
    s150:   atSpeed(totalSeconds, 1.50),
    s175:   atSpeed(totalSeconds, 1.75),
    s200:   atSpeed(totalSeconds, 2.00),
    custom: atSpeed(totalSeconds, customSpeed),
  };
}