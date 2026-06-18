// Two-way client sync between local storage and the backend.
// Runs whenever the user is signed in, so their clients follow them across all
// their devices and logins. The backend scopes data automatically:
//   • personal account  → synced privately across that user's own devices
//   • enterprise account → shared across the whole organization/team
// Local storage stays the source the UI reads; this keeps it converged.
import { isLoggedIn, listClientsRemote, upsertClientRemote, deleteClientRemote, registerDevice } from './api';
import { getClients, saveClients } from '../data/store';

const LAST_PULL_KEY = 'spark_last_pull';

// Pull remote changes, merge into local (last-write-wins), then push local rows.
export async function syncClients() {
  if (!isLoggedIn()) return { synced: false };

  // Enforce the per-plan device limit before syncing.
  try {
    await registerDevice();
  } catch (e) {
    if (e.payload?.upgrade) {
      window.dispatchEvent(new CustomEvent('spark:device-limit', { detail: e.message }));
      return { synced: false, deviceLimit: true, message: e.message };
    }
    // Other registration errors shouldn't block local use; continue.
  }

  const since = localStorage.getItem(LAST_PULL_KEY) || '';
  const { clients: remote, serverTime } = await listClientsRemote(since);

  const byId = new Map(getClients().map(c => [c.id, c]));
  for (const r of remote) {
    if (r.deleted) { byId.delete(r.id); continue; }
    const local = byId.get(r.id);
    if (!local || new Date(r.updatedAt) >= new Date(local.updatedAt || 0)) {
      byId.set(r.id, r.data);
    }
  }
  const merged = [...byId.values()];
  saveClients(merged);
  localStorage.setItem(LAST_PULL_KEY, serverTime || new Date().toISOString());

  // Push everything we have (best-effort; server skips anything stale).
  await Promise.allSettled(merged.map(c => upsertClientRemote(c)));
  return { synced: true, count: merged.length };
}

// Fire-and-forget helpers for individual changes.
export function pushClient(client) {
  if (isLoggedIn()) upsertClientRemote(client).catch(() => {});
}

export function pushDelete(id) {
  if (isLoggedIn()) deleteClientRemote(id).catch(() => {});
}

export { isLoggedIn };

export function resetSyncCursor() {
  localStorage.removeItem(LAST_PULL_KEY);
}
