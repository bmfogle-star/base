// Minimal vCard (.vcf) parser → array of { name, phone, email, company, position, birthday, tags }.
export function parseVCards(text) {
  // Unfold folded lines (vCard wraps long lines with CRLF + space/tab).
  const unfolded = text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const cards = unfolded.split(/BEGIN:VCARD/i).slice(1);
  return cards.map(block => {
    const get = (re) => (block.match(re) || [])[1]?.trim() || '';
    // Strip vCard param suffixes like ;TYPE=CELL
    const fn = get(/\nFN[^:]*:(.*)/i);
    const n = get(/\nN[^:]*:(.*)/i);
    const name = (fn || n.split(';').filter(Boolean).reverse().join(' ')).trim();
    // Prefer a mobile/cell number if several TEL lines exist.
    const tels = [...block.matchAll(/\nTEL([^:\n]*):(.*)/gi)];
    const cell = tels.find(t => /CELL|MOBILE|IPHONE/i.test(t[1]));
    const phone = (cell || tels[0])?.[2]?.trim() || '';
    return {
      name,
      phone,
      email: get(/\nEMAIL[^:]*:(.*)/i),
      company: get(/\nORG[^:]*:(.*)/i).split(';')[0].trim(),
      position: get(/\nTITLE[^:]*:(.*)/i),
      birthday: normalizeBday(get(/\nBDAY[^:]*:(.*)/i)),
      tags: ['Imported'],
    };
  }).filter(c => c.name || c.phone || c.email);
}

// vCard BDAY can be 1985-04-12, 19850412, or --0412 (no year). Normalize to YYYY-MM-DD where possible.
function normalizeBday(raw) {
  if (!raw) return '';
  const v = raw.trim();
  let m = v.match(/^(\d{4})-?(\d{2})-?(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = v.match(/^--(\d{2})-?(\d{2})/); // month/day only — use a neutral year
  if (m) return `2000-${m[1]}-${m[2]}`;
  return '';
}

import { Capacitor } from '@capacitor/core';

// Running inside the native iOS/Android app (vs. a plain web browser)?
export function isNativeApp() {
  return Capacitor?.isNativePlatform?.() === true;
}

// True if we can pull contacts directly from the device — either the native
// app (any phone) or Chrome on Android via the web Contact Picker API.
export function contactPickerSupported() {
  return isNativeApp() || ('contacts' in navigator && 'select' in navigator.contacts);
}

// Native app: read the full address book via the device's Contacts framework
// (with a permission prompt). Pulls name, phone, email, company, birthday.
async function pickNativeContacts() {
  const { Contacts } = await import('@capacitor-community/contacts');
  const perm = await Contacts.requestPermissions();
  if (perm.contacts !== 'granted') throw new Error('Contacts permission denied');
  const { contacts } = await Contacts.getContacts({
    projection: { name: true, phones: true, emails: true, organization: true, birthday: true },
  });
  return contacts.map(c => {
    const b = c.birthday;
    const birthday = b && b.year && b.month && b.day
      ? `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`
      : '';
    return {
      name: c.name?.display || [c.name?.given, c.name?.family].filter(Boolean).join(' ') || '',
      phone: c.phones?.[0]?.number || '',
      email: c.emails?.[0]?.address || '',
      company: c.organization?.company || '',
      position: c.organization?.jobTitle || '',
      birthday,
      tags: ['Imported'],
    };
  }).filter(c => c.name || c.phone || c.email);
}

export async function pickDeviceContacts() {
  if (isNativeApp()) return pickNativeContacts();
  // Web fallback: Chrome-on-Android Contact Picker API.
  const supported = (await navigator.contacts.getProperties?.()) || ['name', 'tel', 'email'];
  const props = ['name', 'tel', 'email'].filter(p => supported.includes(p));
  const selected = await navigator.contacts.select(props, { multiple: true });
  return selected.map(c => ({
    name: c.name?.[0] || '',
    phone: c.tel?.[0] || '',
    email: c.email?.[0] || '',
    company: '',
    position: '',
    birthday: '',
    tags: ['Imported'],
  })).filter(c => c.name || c.phone || c.email);
}
