// Clean, athletic line icons for the nav — replaces the generic emoji chrome.
// Stroke-based, inherit currentColor, bold rounded joins.

const paths = {
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></>,
  // Clipboard with an X-and-O play on it
  playbook: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><circle cx="9.5" cy="12" r="1.6" /><path d="m13.5 10.4 3 3M16.5 10.4l-3 3" /></>,
  // Stacked flashcards
  study: <><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M7 4h10" /><path d="M4 12h16" /></>,
  // Chat bubble
  ask: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4a0 0 0 0 1 0 0V6a1 1 0 0 1 1-1Z" /></>,
  // Gear
  settings: <><circle cx="12" cy="12" r="3.2" /><path d="M12 3v2.4M12 18.6V21M4.5 7.5l1.7 1M17.8 15.5l1.7 1M3 12h2.4M18.6 12H21M4.5 16.5l1.7-1M17.8 8.5l1.7-1" /></>,
  whistle: <><circle cx="9" cy="14" r="5" /><path d="M13 11l7-3v4l-6 1" /><path d="M9 9V6h4" /></>,
};

export default function NavIcon({ name, size = 24, active = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={active ? 2.4 : 2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || null}
    </svg>
  );
}
