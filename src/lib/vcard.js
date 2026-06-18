// Minimal vCard (.vcf) parser → array of { name, phone, email, company, position }.
export function parseVCards(text) {
  const cards = text.split(/BEGIN:VCARD/i).slice(1);
  return cards.map(block => {
    const get = (re) => (block.match(re) || [])[1]?.trim() || '';
    // Strip vCard param suffixes like ;TYPE=CELL
    const fn = get(/\nFN[^:]*:(.*)/i);
    const n = get(/\nN[^:]*:(.*)/i);
    const name = fn || n.split(';').filter(Boolean).reverse().join(' ').trim();
    return {
      name,
      phone: get(/\nTEL[^:]*:(.*)/i),
      email: get(/\nEMAIL[^:]*:(.*)/i),
      company: get(/\nORG[^:]*:(.*)/i).split(';')[0],
      position: get(/\nTITLE[^:]*:(.*)/i),
    };
  }).filter(c => c.name || c.phone || c.email);
}

// True if the browser supports the native Contact Picker API (Chrome on Android).
export function contactPickerSupported() {
  return 'contacts' in navigator && 'select' in navigator.contacts;
}

export async function pickDeviceContacts() {
  const props = ['name', 'tel', 'email'];
  const selected = await navigator.contacts.select(props, { multiple: true });
  return selected.map(c => ({
    name: c.name?.[0] || '',
    phone: c.tel?.[0] || '',
    email: c.email?.[0] || '',
    company: '',
    position: '',
  })).filter(c => c.name || c.phone || c.email);
}
