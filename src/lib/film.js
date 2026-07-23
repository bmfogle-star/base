// Film room data layer.
//
// Clips can come from anywhere — a Hudl share link, a YouTube/Vimeo link, a
// direct video URL, or a video file the player uploads. Uploaded files are kept
// on-device in IndexedDB (localStorage is too small for video), so they play
// offline. Link clips need a connection. Coaching notes, position tags, and the
// "good example" flag live in localStorage alongside the clip metadata.

const CLIPS_KEY = 'pb_clips';

// ── Clip metadata (localStorage) ──
function read(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key));
    return v == null ? fallback : v;
  } catch { return fallback; }
}
function uid() {
  return 'clip' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function getClips() {
  return read(CLIPS_KEY, []);
}
export function saveClips(clips) {
  localStorage.setItem(CLIPS_KEY, JSON.stringify(clips));
}
export function saveClip(clip) {
  const clips = getClips();
  const idx = clips.findIndex(c => c.id === clip.id);
  const stamped = { ...clip, updatedAt: new Date().toISOString() };
  if (idx >= 0) clips[idx] = stamped; else clips.push(stamped);
  saveClips(clips);
  return stamped;
}
export function createClip(data = {}) {
  const now = new Date().toISOString();
  return saveClip({
    id: uid(),
    title: '',
    source: 'link',        // 'link' | 'file'
    url: '',               // for links
    blobKey: null,         // for uploaded files (IndexedDB key)
    provider: 'other',     // 'hudl' | 'youtube' | 'vimeo' | 'direct' | 'file' | 'other'
    playId: null,
    positions: [],
    goodExample: false,
    notes: '',
    createdAt: now,
    updatedAt: now,
    ...data,
  });
}
export async function deleteClip(id) {
  const clip = getClips().find(c => c.id === id);
  saveClips(getClips().filter(c => c.id !== id));
  if (clip?.blobKey) await delBlob(clip.blobKey).catch(() => {});
}

// ── Provider detection + embed helpers ──
export function detectProvider(url = '') {
  const u = url.toLowerCase();
  if (/youtu\.?be/.test(u)) return 'youtube';
  if (/vimeo\.com/.test(u)) return 'vimeo';
  if (/hudl\.com/.test(u)) return 'hudl';
  if (/\.(mp4|mov|webm|m4v|ogg)(\?|#|$)/.test(u)) return 'direct';
  return 'other';
}

function youtubeId(url) {
  const m = url.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function vimeoId(url) {
  const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return m ? m[1] : null;
}

// Returns an embeddable iframe URL, or null if the clip should open externally.
export function embedUrl(clip) {
  if (clip.provider === 'youtube') {
    const id = youtubeId(clip.url);
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  if (clip.provider === 'vimeo') {
    const id = vimeoId(clip.url);
    return id ? `https://player.vimeo.com/video/${id}` : null;
  }
  return null; // hudl / other → open in a new tab
}

export const PROVIDER_META = {
  hudl: { label: 'Hudl', emoji: '🎬' },
  youtube: { label: 'YouTube', emoji: '▶️' },
  vimeo: { label: 'Vimeo', emoji: '📹' },
  direct: { label: 'Video', emoji: '🎞️' },
  file: { label: 'On device', emoji: '📲' },
  other: { label: 'Link', emoji: '🔗' },
};

// ── Video blobs (IndexedDB) ──
const DB_NAME = 'pb_film';
const STORE = 'clips';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function putBlob(key, blob) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve(key);
    tx.onerror = () => reject(tx.error);
  });
}
export async function getBlob(key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const rq = tx.objectStore(STORE).get(key);
    rq.onsuccess = () => resolve(rq.result);
    rq.onerror = () => reject(rq.error);
  });
}
export async function delBlob(key) {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}
