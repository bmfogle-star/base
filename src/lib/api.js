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
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
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
}

export async function fetchMe() {
  if (!getToken()) return null;
  return call('/auth/me', { auth: true });
}

// The key call: extract client details server-side (no user API key needed).
export async function extractViaBackend(transcript) {
  const data = await call('/ai/extract', { method: 'POST', auth: true, body: { transcript } });
  return data.extracted;
}

export function isLoggedIn() {
  return hasBackend() && !!getToken();
}

export function setBackendUrl(url) {
  const user = getUser() || {};
  saveUser({ ...user, backendUrl: url });
}
