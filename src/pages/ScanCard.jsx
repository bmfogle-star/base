import { useState, useRef } from 'react';
import { ArrowLeft, Camera, Image as ImageIcon, Loader, AlertCircle, ScanLine, UserPlus, UserCheck } from 'lucide-react';
import { compressImageFile } from '../lib/image';
import { extractBusinessCard } from '../lib/businessCard';

const FIELDS = [
  ['name', 'Full Name'], ['phone', 'Phone'], ['email', 'Email'],
  ['company', 'Company'], ['position', 'Position / Title'],
  ['website', 'Website'], ['address', 'Address'],
];

export default function ScanCard({ clients, onSaveNew, onMerge, onBack, apiKey }) {
  const [status, setStatus] = useState('idle'); // idle | processing | review | error
  const [error, setError] = useState('');
  const [fields, setFields] = useState({});
  const [preview, setPreview] = useState('');
  const [target, setTarget] = useState('new'); // 'new' | client id
  const cameraRef = useRef(null);
  const libraryRef = useRef(null);

  async function handleFile(fileList) {
    const file = fileList?.[0];
    if (!file) return;
    setStatus('processing'); setError('');
    try {
      const dataUrl = await compressImageFile(file);
      setPreview(dataUrl);
      const contact = await extractBusinessCard(dataUrl, apiKey);
      setFields(contact);
      setStatus('review');
    } catch (e) {
      setError(e.message); setStatus('error');
    }
  }

  function set(key, val) { setFields(f => ({ ...f, [key]: val })); }

  function handleSave() {
    const notesParts = [];
    if (fields.website) notesParts.push(`Website: ${fields.website}`);
    if (fields.address) notesParts.push(`Address: ${fields.address}`);
    const data = {
      name: fields.name || '', phone: fields.phone || '', email: fields.email || '',
      company: fields.company || '', position: fields.position || '',
      notes: notesParts.join('\n'),
    };
    if (target === 'new') onSaveNew(data);
    else onMerge(target, data);
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <h1 className="text-xl text-gray-900 dark:text-neutral-100">Scan Business Card</h1>
      </div>

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" onChange={e => { handleFile(e.target.files); e.target.value = ''; }} className="hidden" />
      <input ref={libraryRef} type="file" accept="image/*" onChange={e => { handleFile(e.target.files); e.target.value = ''; }} className="hidden" />

      {status === 'idle' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-6 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/40 ring-2 ring-gold/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <ScanLine size={28} className="text-green-700 dark:text-green-400" />
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-neutral-100 mb-1">Snap or upload a card</h3>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mb-5">AI reads the name, phone, email, company and more, then you confirm.</p>
          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto">
            <button onClick={() => cameraRef.current?.click()} className="flex flex-col items-center gap-1.5 py-4 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-gray-700 dark:text-neutral-300 hover:border-green-600 hover:text-green-700">
              <Camera size={20} /> Take Photo
            </button>
            <button onClick={() => libraryRef.current?.click()} className="flex flex-col items-center gap-1.5 py-4 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm font-medium text-gray-700 dark:text-neutral-300 hover:border-green-600 hover:text-green-700">
              <ImageIcon size={20} /> Upload
            </button>
          </div>
        </div>
      )}

      {status === 'processing' && (
        <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-8 text-center">
          <Loader size={40} className="text-green-700 dark:text-green-400 mx-auto mb-4 animate-spin" />
          <p className="font-semibold text-gray-900 dark:text-neutral-100">Reading the card…</p>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1">Extracting contact details</p>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl p-5 text-center">
          <AlertCircle size={32} className="text-red-500 mx-auto mb-3" />
          <p className="font-semibold text-red-800 dark:text-red-300 mb-1">Couldn’t scan the card</p>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => setStatus('idle')} className="bg-red-600 text-white px-5 py-2 rounded-xl text-sm font-medium">Try Again</button>
        </div>
      )}

      {status === 'review' && (
        <div>
          {preview && <img src={preview} alt="card" className="w-full max-h-44 object-contain rounded-xl border border-gray-200 dark:border-neutral-700 mb-4 bg-gray-50 dark:bg-neutral-800" />}

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-3">Review details</h3>
            <div className="space-y-3">
              {FIELDS.map(([key, label]) => (
                <div key={key}>
                  <label className="text-xs text-gray-500 dark:text-neutral-400 font-medium block mb-1">{label}</label>
                  <input
                    type="text"
                    value={fields[key] || ''}
                    onChange={e => set(key, e.target.value)}
                    className="w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-neutral-300 mb-3">Save to</h3>
            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer mb-2 ${target === 'new' ? 'border-green-600 bg-green-50 dark:bg-green-950/40' : 'border-gray-200 dark:border-neutral-700'}`}>
              <input type="radio" checked={target === 'new'} onChange={() => setTarget('new')} className="accent-green-700" />
              <UserPlus size={16} className="text-gray-500 dark:text-neutral-400" />
              <span className="text-sm text-gray-800 dark:text-neutral-100">Create a new client</span>
            </label>
            <label className={`flex items-center gap-2 p-3 rounded-lg border-2 cursor-pointer ${target !== 'new' ? 'border-green-600 bg-green-50 dark:bg-green-950/40' : 'border-gray-200 dark:border-neutral-700'}`}>
              <input type="radio" checked={target !== 'new'} onChange={() => setTarget(clients[0]?.id || 'new')} className="accent-green-700" />
              <UserCheck size={16} className="text-gray-500 dark:text-neutral-400" />
              <span className="text-sm text-gray-800 dark:text-neutral-100">Add to existing client</span>
            </label>
            {target !== 'new' && (
              <select value={target} onChange={e => setTarget(e.target.value)} className="mt-2 w-full border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white dark:bg-neutral-900">
                {clients.map(c => <option key={c.id} value={c.id}>{c.name || 'Unnamed'}</option>)}
              </select>
            )}
            {target !== 'new' && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2">Only empty fields on that client will be filled in; nothing is overwritten.</p>}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStatus('idle')} className="flex-1 border border-gray-300 dark:border-neutral-700 text-gray-700 dark:text-neutral-300 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-neutral-800">Rescan</button>
            <button onClick={handleSave} disabled={!fields.name?.trim()} className="flex-1 bg-green-800 text-white py-3 rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50">
              {target === 'new' ? 'Create Client' : 'Add to Client'}
            </button>
          </div>
          {!fields.name?.trim() && <p className="text-xs text-gray-400 dark:text-neutral-500 mt-2 text-center">A name is required to save</p>}
        </div>
      )}
    </div>
  );
}
