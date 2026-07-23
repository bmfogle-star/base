// Shared metadata for play categories + position options.

export const CATEGORIES = {
  offense: { label: 'Offense', emoji: '🏈', color: 'text-green-700 dark:text-green-400', chip: 'bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300' },
  defense: { label: 'Defense', emoji: '🛡️', color: 'text-red-700 dark:text-red-400', chip: 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300' },
  special: { label: 'Special Teams', emoji: '⭐', color: 'text-amber-700 dark:text-amber-400', chip: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300' },
};

export const CATEGORY_ORDER = ['offense', 'defense', 'special'];

export function categoryMeta(cat) {
  return CATEGORIES[cat] || CATEGORIES.offense;
}

// Common football positions, grouped, for the profile picker.
export const POSITIONS = [
  { group: 'Offense', items: ['QB', 'RB', 'FB', 'WR', 'TE', 'OL (C/G/T)'] },
  { group: 'Defense', items: ['DL (DE/DT)', 'LB', 'CB', 'S', 'NB'] },
  { group: 'Special Teams', items: ['K', 'P', 'LS', 'Returner'] },
];
