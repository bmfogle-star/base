// Local-storage data layer for the football playbook app.
// Local storage is the source of truth; everything works offline.

const PLAYS_KEY = 'pb_plays';
const PROFILE_KEY = 'pb_profile';
const PROGRESS_KEY = 'pb_progress';

function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch {
    return fallback;
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Plays ──
export function getPlays() {
  return read(PLAYS_KEY, []);
}

export function savePlays(plays) {
  localStorage.setItem(PLAYS_KEY, JSON.stringify(plays));
}

export function getPlay(id) {
  return getPlays().find(p => p.id === id) || null;
}

export function savePlay(play) {
  const plays = getPlays();
  const idx = plays.findIndex(p => p.id === play.id);
  const stamped = { ...play, updatedAt: new Date().toISOString() };
  if (idx >= 0) plays[idx] = stamped;
  else plays.push(stamped);
  savePlays(plays);
  return stamped;
}

export function deletePlay(id) {
  savePlays(getPlays().filter(p => p.id !== id));
  // Drop its study progress too.
  const prog = getProgress();
  if (prog[id]) {
    delete prog[id];
    saveProgress(prog);
  }
}

export function createPlay(data = {}) {
  const now = new Date().toISOString();
  return savePlay({
    id: uid(),
    name: '',
    category: 'offense',      // 'offense' | 'defense' | 'special'
    formation: '',
    personnel: '',            // e.g. "11 personnel"
    tags: [],
    positions: [],            // [{ pos, label, assignment }]
    diagram: null,            // { players:[], routes:[] } drawn on the field
    image: null,             // data URL of an uploaded playbook page
    notes: '',
    starred: false,
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}

// ── Player profile (who's studying) ──
export function getProfile() {
  return read(PROFILE_KEY, { name: '', position: '', team: '', level: '' });
}

export function saveProfile(profile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

// ── Study progress (spaced repetition state, keyed by play id) ──
export function getProgress() {
  return read(PROGRESS_KEY, {});
}

export function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

export function getPlayProgress(id) {
  return getProgress()[id] || null;
}

export function setPlayProgress(id, state) {
  const prog = getProgress();
  prog[id] = state;
  saveProgress(prog);
  return state;
}

// ── Bulk export / import (backup, share a playbook) ──
export function exportData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    plays: getPlays(),
    profile: getProfile(),
    progress: getProgress(),
  };
}

export function importData(data, { merge = false } = {}) {
  if (!data || !Array.isArray(data.plays)) throw new Error('Invalid playbook file');
  if (merge) {
    const existing = getPlays();
    const byId = new Map(existing.map(p => [p.id, p]));
    for (const p of data.plays) byId.set(p.id, p);
    savePlays([...byId.values()]);
  } else {
    savePlays(data.plays);
    if (data.progress) saveProgress(data.progress);
  }
  if (data.profile && !merge) saveProfile(data.profile);
  return getPlays();
}
