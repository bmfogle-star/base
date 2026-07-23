import { useEffect, useMemo, useRef, useState } from 'react';
import {
  getClips, createClip, saveClip, deleteClip,
  detectProvider, embedUrl, getBlob, putBlob, PROVIDER_META,
} from '../lib/film';
import { categoryMeta } from '../lib/playmeta';
import Emoji from '../components/Emoji';

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:border-green-500';

// Inline player for a single clip.
function ClipPlayer({ clip }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    if (clip.source === 'file' && clip.blobKey) {
      getBlob(clip.blobKey).then(b => { if (b) { url = URL.createObjectURL(b); setSrc(url); } });
    }
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [clip]);

  if (clip.source === 'file') {
    return src
      ? <video src={src} controls playsInline className="w-full rounded-xl bg-black max-h-80" />
      : <div className="text-sm text-gray-400 py-6 text-center">Loading clip…</div>;
  }
  if (clip.provider === 'direct') {
    return <video src={clip.url} controls playsInline className="w-full rounded-xl bg-black max-h-80" />;
  }
  const embed = embedUrl(clip);
  if (embed) {
    return (
      <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
        <iframe src={embed} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title={clip.title} />
      </div>
    );
  }
  // Hudl / other → open externally (embedding is usually blocked)
  const meta = PROVIDER_META[clip.provider] || PROVIDER_META.other;
  return (
    <a href={clip.url} target="_blank" rel="noreferrer"
      className="flex items-center justify-center gap-2 bg-[#0c2018] text-white font-display tracking-wide py-4 rounded-xl">
      <Emoji e="▶️" size="1em" /> OPEN IN {meta.label.toUpperCase()}
    </a>
  );
}

function AddClip({ plays, onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', url: '', playId: '', positions: '', goodExample: true, notes: '' });
  const [mode, setMode] = useState('link'); // 'link' | 'file'
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  async function submit() {
    if (mode === 'link' && !form.url.trim()) return;
    if (mode === 'file' && !file) return;
    setBusy(true);
    const positions = form.positions.split(',').map(s => s.trim()).filter(Boolean);
    const base = {
      title: form.title.trim() || (mode === 'file' ? file.name : 'Untitled clip'),
      playId: form.playId || null,
      positions, goodExample: form.goodExample, notes: form.notes.trim(),
    };
    if (mode === 'file') {
      const key = 'blob' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await putBlob(key, file);
      onAdd(createClip({ ...base, source: 'file', provider: 'file', blobKey: key }));
    } else {
      const provider = detectProvider(form.url);
      onAdd(createClip({ ...base, source: 'link', url: form.url.trim(), provider }));
    }
    setBusy(false);
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 card-elevate border border-gray-100 dark:border-neutral-800 mb-4">
      <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5 mb-3">
        <button onClick={() => setMode('link')} className={`flex-1 py-1.5 rounded-md text-sm font-semibold ${mode === 'link' ? 'bg-white dark:bg-neutral-700 text-green-700 dark:text-green-300 shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}>🔗 Paste a link</button>
        <button onClick={() => setMode('file')} className={`flex-1 py-1.5 rounded-md text-sm font-semibold ${mode === 'file' ? 'bg-white dark:bg-neutral-700 text-green-700 dark:text-green-300 shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}>📲 Upload a clip</button>
      </div>

      {mode === 'link' ? (
        <>
          <input className={`${inputCls} mb-1`} value={form.url} onChange={e => set({ url: e.target.value })}
            placeholder="Paste a Hudl, YouTube, or video link" />
          <p className="text-xs text-gray-400 dark:text-neutral-500 mb-3">
            Hudl links open in the Hudl app/site. YouTube & Vimeo play right here.
          </p>
        </>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-xl py-6 cursor-pointer text-gray-500 dark:text-neutral-400 mb-3">
          <span className="text-2xl"><Emoji e="🎞️" /></span>
          <span className="text-sm font-medium">{file ? file.name : 'Choose a video file (saved on your phone, plays offline)'}</span>
          <input type="file" accept="video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
      )}

      <input className={`${inputCls} mb-3`} value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Title (e.g. Mesh vs Cover 1 — perfect rub)" />

      <div className="grid grid-cols-2 gap-2 mb-3">
        <select className={inputCls} value={form.playId} onChange={e => set({ playId: e.target.value })}>
          <option value="">Link to a play…</option>
          {plays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className={inputCls} value={form.positions} onChange={e => set({ positions: e.target.value })} placeholder="Positions (X, Y…)" />
      </div>

      <textarea className={`${inputCls} min-h-[60px] resize-y mb-3`} value={form.notes} onChange={e => set({ notes: e.target.value })}
        placeholder="Coaching points: what to watch, the indicator, why it works…" />

      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={form.goodExample} onChange={e => set({ goodExample: e.target.checked })} className="w-4 h-4 accent-green-700" />
        <span className="text-sm text-gray-700 dark:text-neutral-200">✅ This is a “do it like this” example</span>
      </label>

      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="flex-1 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl">
          {busy ? 'Saving…' : 'Add clip'}
        </button>
        <button onClick={onCancel} className="px-4 text-gray-500 dark:text-neutral-400 font-semibold">Cancel</button>
      </div>
    </div>
  );
}

function ClipCard({ clip, play, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = PROVIDER_META[clip.provider] || PROVIDER_META.other;
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-3 card-elevate border border-gray-100 dark:border-neutral-800">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left flex items-start gap-3">
        <div className="w-14 h-14 rounded-lg bg-[#0c2018] text-white flex items-center justify-center text-xl flex-shrink-0">
          <Emoji e={meta.emoji} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {clip.goodExample && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">✅ EXAMPLE</span>}
            <span className="chalk text-[10px] text-gray-400 dark:text-neutral-500">{meta.label}</span>
          </div>
          <p className="font-bold text-gray-900 dark:text-neutral-100 truncate">{clip.title}</p>
          <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
            {[play?.name, clip.positions?.join('/')].filter(Boolean).join(' · ') || 'Tap to watch'}
          </p>
        </div>
        <Emoji e={open ? '🔼' : '🔽'} size="0.9em" />
      </button>

      {open && (
        <div className="mt-3">
          <ClipPlayer clip={clip} />
          {clip.notes && (
            <div className="mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3">
              <p className="chalk text-[10px] text-amber-700 dark:text-amber-400 mb-1">Coaching points</p>
              <p className="text-sm text-gray-800 dark:text-neutral-200 whitespace-pre-wrap">{clip.notes}</p>
            </div>
          )}
          <button onClick={() => { if (confirm('Remove this clip?')) onDelete(clip.id); }}
            className="mt-2 text-xs font-semibold text-red-600 dark:text-red-400">Remove clip</button>
        </div>
      )}
    </div>
  );
}

export default function Film({ plays }) {
  const [clips, setClips] = useState(() => getClips());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' | 'examples' | position
  const refresh = () => setClips(getClips());

  const positions = useMemo(() => (
    [...new Set(clips.flatMap(c => c.positions || []).filter(Boolean))].sort()
  ), [clips]);

  const shown = clips.filter(c => {
    if (filter === 'all') return true;
    if (filter === 'examples') return c.goodExample;
    return (c.positions || []).includes(filter);
  });

  const playById = useMemo(() => Object.fromEntries(plays.map(p => [p.id, p])), [plays]);

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-3xl tracking-wide text-gray-900 dark:text-neutral-100">FILM ROOM</h1>
        <button onClick={() => setAdding(a => !a)}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
          <Emoji e="➕" size="0.9em" /> Add clip
        </button>
      </div>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-4">Examples of plays &amp; assignments done right — with your coach’s notes.</p>

      {adding && (
        <AddClip plays={plays} onCancel={() => setAdding(false)}
          onAdd={() => { setAdding(false); refresh(); }} />
      )}

      {clips.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {[['all', '📋 All'], ['examples', '✅ Examples']].map(([id, label]) => (
            <button key={id} onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${filter === id ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>{label}</button>
          ))}
          {positions.map(p => (
            <button key={p} onClick={() => setFilter(p)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${filter === p ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>{p}</button>
          ))}
        </div>
      )}

      {clips.length === 0 ? (
        <div className="text-center py-14 text-gray-500 dark:text-neutral-400">
          <div className="text-4xl mb-3"><Emoji e="🎬" /></div>
          <p className="font-medium">No film yet</p>
          <p className="text-sm mt-1 mb-4">Add a Hudl link or upload a clip, then tag it to a play.</p>
          <button onClick={() => setAdding(true)} className="bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Add your first clip</button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map(c => (
            <ClipCard key={c.id} clip={c} play={playById[c.playId]}
              onDelete={async (id) => { await deleteClip(id); refresh(); }} />
          ))}
          {shown.length === 0 && <p className="text-center text-sm text-gray-400 py-8">No clips match that filter.</p>}
        </div>
      )}
    </div>
  );
}
