// Talks to the Spark backend (auth + AI proxy). Falls back gracefully when no
// backend is configured, so the bring-your-own-key mode still works.
import { getUser, saveUser } from '../data/store';

const TOKEN_KEY = 'spark_token';

export function backendUrl() {
  return (getUser()?.backendUrl || '').replace(/\/$/, '');
}

export function hasBackend() {
  return !!backendUrl();
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}

async function call(path, { method = 'GET', body, auth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${getToken()}`;
  const res = await fetch(`${backendUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

// A stable per-device id, stored locally.
export function getDeviceId() {
  let id = localStorage.getItem('spark_device_id');
  if (!id) {
    id = (crypto.randomUUID?.() || `dev-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem('spark_device_id', id);
  }
  return id;
}

// Register this device against the account; throws (with .payload.upgrade) if
// the plan's device limit is exceeded.
export async function registerDevice() {
  const name = navigator.platform || navigator.userAgent?.slice(0, 40) || 'Device';
  return call('/devices/register', { method: 'POST', auth: true, body: { deviceId: getDeviceId(), name } });
}

export async function register(email, password) {
  const data = await call('/auth/register', { method: 'POST', body: { email, password } });
  setToken(data.token);
  return data.user;
}

export async function login(email, password) {
  const data = await call('/auth/login', { method: 'POST', body: { email, password } });
  setToken(data.token);
  return data.user;
}

export function logout() {
  setToken('');
  localStorage.removeItem(ACCOUNT_KEY);
  localStorage.removeItem(CUSTOM_FIELDS_KEY);
  localStorage.removeItem(BRANDING_KEY);
}

const ACCOUNT_KEY = 'spark_account';
const CUSTOM_FIELDS_KEY = 'spark_custom_fields';
const BRANDING_KEY = 'spark_branding';

function cacheAccount(a) {
  if (a) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ plan: a.plan, org_id: a.org_id || null }));
    localStorage.setItem(CUSTOM_FIELDS_KEY, JSON.stringify(a.customFields || []));
    localStorage.setItem(BRANDING_KEY, JSON.stringify(a.branding || {}));
  } else {
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem(CUSTOM_FIELDS_KEY);
    localStorage.removeItem(BRANDING_KEY);
  }
}

// Org-defined custom client fields (empty for personal accounts).
export function getCustomFields() {
  try {
    return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_KEY) || '[]');
  } catch {
    return [];
  }
}

// Org branding: { companyName, accentColor, logo } — empty for personal accounts.
export function getBranding() {
  try {
    return JSON.parse(localStorage.getItem(BRANDING_KEY) || '{}');
  } catch {
    return {};
  }
}

export async function fetchMe() {
  if (!getToken()) return null;
  const me = await call('/auth/me', { auth: true });
  if (me.token) setToken(me.token); // roll the 90-day session
  cacheAccount(me);
  return me;
}

// True only for an enterprise account (org member). Gates cloud sync.
export function isEnterprise() {
  if (!isLoggedIn()) return false;
  try {
    const a = JSON.parse(localStorage.getItem(ACCOUNT_KEY) || 'null');
    return !!a && (a.plan === 'enterprise' || !!a.org_id);
  } catch {
    return false;
  }
}

// The key call: extract client details server-side (no user API key needed).
export async function extractViaBackend(transcript) {
  const data = await call('/ai/extract', { method: 'POST', auth: true, body: { transcript } });
  return data.extracted;
}

// ── Client sync ──
export async function listClientsRemote(since) {
  const qs = since ? `?since=${encodeURIComponent(since)}` : '';
  return call(`/clients${qs}`, { auth: true });
}

export async function upsertClientRemote(client) {
  return call(`/clients/${client.id}`, { method: 'PUT', auth: true, body: { data: client, updatedAt: client.updatedAt } });
}

export async function deleteClientRemote(id) {
  return call(`/clients/${id}`, { method: 'DELETE', auth: true });
}

// Extract contact details from a business card image (server-side vision).
export async function extractCardViaBackend(imageDataUrl) {
  const data = await call('/ai/business-card', { method: 'POST', auth: true, body: { image: imageDataUrl } });
  return data.contact;
}

// ── Enterprise orgs ──
export async function createOrg(name) {
  return call('/orgs', { method: 'POST', auth: true, body: { name } });
}

export async function joinOrg(code) {
  return call('/orgs/join', { method: 'POST', auth: true, body: { code } });
}

export async function getOrg() {
  return call('/orgs/me', { auth: true });
}

export async function updateOrgSettings({ branding, customFields }) {
  return call('/orgs/settings', { method: 'PATCH', auth: true, body: { branding, customFields } });
}

export async function updateOrgSeats(seats) {
  return call('/orgs/seats', { method: 'PATCH', auth: true, body: { seats } });
}

export async function setMemberRole(memberId, role) {
  return call(`/orgs/members/${memberId}/role`, { method: 'POST', auth: true, body: { role } });
}

// Start a Stripe Checkout session for a plan; returns a URL to redirect to.
export async function startCheckout(plan) {
  const data = await call('/billing/checkout', { method: 'POST', auth: true, body: { plan } });
  return data.url;
}

export function isLoggedIn() {
  return hasBackend() && !!getToken();
}

export function setBackendUrl(url) {
  const user = getUser() || {};
  saveUser({ ...user, backendUrl: url });
}
