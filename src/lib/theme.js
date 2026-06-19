// Light / Dark / System theme handling.
const THEME_KEY = 'spark_theme';

export function getTheme() {
  return localStorage.getItem(THEME_KEY) || 'system';
}

export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
  applyTheme();
}

// Apply the current theme to <html>. Call on startup and on change.
export function applyTheme() {
  const theme = getTheme();
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
  const dark = theme === 'dark' || (theme === 'system' && prefersDark);
  document.documentElement.classList.toggle('dark', dark);
}

// Keep "system" in sync if the OS theme changes while the app is open.
export function watchSystemTheme() {
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (getTheme() === 'system') applyTheme();
  });
}
