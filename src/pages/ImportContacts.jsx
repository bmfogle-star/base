import { useState, useRef } from 'react';
import { ArrowLeft, Users, Upload, Check, AlertCircle } from 'lucide-react';
import { parseVCards, contactPickerSupported, pickDeviceContacts } from '../lib/vcard';

export default function ImportContacts({ onImport, onBack }) {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  function load(list) {
    setContacts(list);
    setSelected(new Set(list.map((_, i) => i)));
    setError(list.length ? '' : 'No contacts found in that file.');
  }

  async function fromDevice() {
    setError('');
    try {
      load(await pickDeviceContacts());
    } catch (e) {
      setError('Could not access device contacts.');
    }
  }

  async function fromFile(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setError('');
    try {
      load(parseVCards(await file.text()));
    } catch {
      setError('Could not read that file. Make sure it’s a .vcf contacts file.');
    }
  }

  function toggle(i) {
    setSelected(s => {
      const next = new Set(s);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  }

  function handleImport() {
    const chosen = contacts.filter((_, i) => selected.has(i));
    onImport(chosen);
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <h1 className="text-xl text-gray-900 dark:text-neutral-100">Import from Contacts</h1>
      </div>

      <input ref={fileRef} type="file" accept=".vcf,text/vcard" onChange={e => { fromFile(e.target.files); e.target.value = ''; }} className="hidden" />

      {contacts.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 ring-2 ring-gold/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-green-700 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-1">Add clients from your contacts</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5">
            {contactPickerSupported()
              ? 'Pick straight from your device, or upload a contacts (.vcf) file.'
              : 'Upload a contacts (.vcf) file exported from your phone or computer. Works on any device.'}
          </p>
          <div className="space-y-2 max-w-xs mx-auto">
            {contactPickerSupported() && (
              <button onClick={fromDevice} className="w-full flex items-center justify-center gap-2 bg-green-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-900">
                <Users size={16} /> Choose from device
              </button>
            )}
            <button onClick={() => fileRef.current?.click()} className="w-full flex items-center justify-center gap-2 border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 py-3 rounded-xl text-sm font-medium hover:border-green-600 hover:text-green-700">
              <Upload size={16} /> Upload .vcf file
            </button>
          </div>
          {!contactPickerSupported() && (
            <div className="text-xs text-gray-400 dark:text-neutral-500 mt-4 space-y-1.5 text-left max-w-xs mx-auto">
              <p className="font-semibold text-gray-500 dark:text-neutral-400">How to export a .vcf:</p>
              <p><span className="font-medium">iPhone / iPad:</span> Contacts app → tap a contact (or Lists → select) → Share Contact → Save to Files.</p>
              <p><span className="font-medium">Desktop:</span> export from iCloud.com or Google Contacts (Export → vCard), then upload it here.</p>
              <p><span className="font-medium">Android:</span> open this app in Chrome to pick contacts directly.</p>
            </div>
          )}
          {error && <p className="text-xs text-red-600 dark:text-red-400 mt-3">{error}</p>}
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600 dark:text-neutral-300">{selected.size} of {contacts.length} selected</p>
            <button
              onClick={() => setSelected(selected.size === contacts.length ? new Set() : new Set(contacts.map((_, i) => i)))}
              className="text-xs text-green-700 dark:text-green-400 font-medium"
            >
              {selected.size === contacts.length ? 'Deselect all' : 'Select all'}
            </button>
          </div>
          <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-4 max-h-96 overflow-y-auto">
            {contacts.map((c, i) => (
              <button key={i} onClick={() => toggle(i)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left">
                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 ${selected.has(i) ? 'bg-green-800' : 'border border-gray-300 dark:border-neutral-700'}`}>
                  {selected.has(i) && <Check size={13} className="text-white" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-neutral-100 truncate">{c.name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{[c.phone, c.email].filter(Boolean).join(' · ') || 'No details'}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => { setContacts([]); setSelected(new Set()); }} className="flex-1 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800">Cancel</button>
            <button onClick={handleImport} disabled={selected.size === 0} className="flex-1 bg-green-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50">
              Import {selected.size > 0 ? selected.size : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
