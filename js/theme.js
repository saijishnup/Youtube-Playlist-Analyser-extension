/* ═══════════════════════════════════════════════════════
   theme.js — Dark / Light Theme Toggle
═══════════════════════════════════════════════════════ */

'use strict';

const THEME_KEY     = 'theme';
const DEFAULT_THEME = 'dark';

/** Apply theme to <html> element */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

/** Save preference and apply */
function setTheme(theme) {
  applyTheme(theme);
  chrome.storage.local.set({ [THEME_KEY]: theme });
}

/** Toggle between dark ↔ light */
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') ?? DEFAULT_THEME;
  setTheme(current === 'dark' ? 'light' : 'dark');
}

/** Load saved theme on startup — call this first in popup.js */
function initTheme() {
  chrome.storage.local.get(THEME_KEY, (data) => {
    applyTheme(data[THEME_KEY] ?? DEFAULT_THEME);
  });

  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
}