// Light / Dark theme handling.
const THEME_KEY = 'spark_theme';

export function getTheme() {
  const t = localStorage.getItem(THEME_KEY);
  return t === 'dark' ? 'dark' : 'light'; // default light; legacy "system" → light
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme === 'dark' ? 'dark' : 'light');
  applyTheme();
}

// Apply the current theme to <html>. Call on startup and on change.
export function applyTheme() {
  document.documentElement.classList.toggle('dark', getTheme() === 'dark');
}

// Kept for compatibility; no-op now that there's no System mode.
export function watchSystemTheme() {}
