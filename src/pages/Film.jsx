import { useEffect, useMemo, useState } from 'react';
import {
  getClips, createClip, deleteClip, detectProvider, embedUrl,
  getBlob, putBlob, PROVIDER_META,
} from '../lib/film';
import { Button, Chip, Label, Pill, Segmented, Icon } from '../components/ui';

function ClipPlayer({ clip }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let url;
    if (clip.source === 'file' && clip.blobKey) getBlob(clip.blobKey).then(b => { if (b) { url = URL.createObjectURL(b); setSrc(url); } });
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [clip]);

  if (clip.source === 'file') return src
    ? <video src={src} controls playsInline className="w-full rounded-xl bg-black max-h-80" />
    : <div className="text-sm text-muted py-6 text-center">Loading clip…</div>;
  if (clip.provider === 'direct') return <video src={clip.url} controls playsInline className="w-full rounded-xl bg-black max-h-80" />;
  const embed = embedUrl(clip);
  if (embed) return (
    <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
      <iframe src={embed} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media" allowFullScreen title={clip.title} />
    </div>
  );
  const meta = PROVIDER_META[clip.provider] || PROVIDER_META.other;
  return (
    <a href={clip.url} target="_blank" rel="noreferrer"
      className="btn btn-primary w-full"><Icon name="play" size={18} fill /> Open in {meta.label}</a>
  );
}

function AddClip({ plays, onAdd, onCancel }) {
  const [form, setForm] = useState({ title: '', url: '', playId: '', positions: '', goodExample: true, notes: '' });
  const [mode, setMode] = useState('link');
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  async function submit() {
    if (mode === 'link' && !form.url.trim()) return;
    if (mode === 'file' && !file) return;
    setBusy(true);
    const positions = form.positions.split(',').map(s => s.trim()).filter(Boolean);
    const base = { title: form.title.trim() || (mode === 'file' ? file.name : 'Untitled clip'), playId: form.playId || null, positions, goodExample: form.goodExample, notes: form.notes.trim() };
    if (mode === 'file') {
      const key = 'blob' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await putBlob(key, file);
      onAdd(createClip({ ...base, source: 'file', provider: 'file', blobKey: key }));
    } else {
      onAdd(createClip({ ...base, source: 'link', url: form.url.trim(), provider: detectProvider(form.url) }));
    }
    setBusy(false);
  }

  return (
    <div className="card p-4 mb-4">
      <Segmented className="mb-3" value={mode} onChange={setMode}
        options={[{ value: 'link', label: 'Paste link', icon: 'link' }, { value: 'file', label: 'Upload', icon: 'upload' }]} />

      {mode === 'link' ? (
        <>
          <input className="input mb-1" value={form.url} onChange={e => set({ url: e.target.value })} placeholder="Paste a Hudl, YouTube, or video link" />
          <p className="text-xs text-muted mb-3">Hudl links open in Hudl. YouTube &amp; Vimeo play right here.</p>
        </>
      ) : (
        <label className="flex flex-col items-center justify-center gap-1 border-2 border-dashed border-line2 rounded-xl py-6 cursor-pointer text-muted mb-3">
          <Icon name="upload" size={24} />
          <span className="text-sm font-medium text-center px-4">{file ? file.name : 'Choose a video (saved on your phone, plays offline)'}</span>
          <input type="file" accept="video/*" className="hidden" onChange={e => setFile(e.target.files?.[0] || null)} />
        </label>
      )}

      <input className="input mb-3" value={form.title} onChange={e => set({ title: e.target.value })} placeholder="Title (e.g. Mesh vs Cover 1 — perfect rub)" />
      <div className="grid grid-cols-2 gap-2 mb-3">
        <select className="input" value={form.playId} onChange={e => set({ playId: e.target.value })}>
          <option value="">Link to a play…</option>
          {plays.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="input" value={form.positions} onChange={e => set({ positions: e.target.value })} placeholder="Positions (X, Y…)" />
      </div>
      <textarea className="input min-h-[60px] resize-y mb-3" value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Coaching points: what to watch, the indicator, why it works…" />
      <label className="flex items-center gap-2 mb-4 cursor-pointer">
        <input type="checkbox" checked={form.goodExample} onChange={e => set({ goodExample: e.target.checked })} className="w-4 h-4 accent-[var(--c-brand)]" />
        <span className="text-sm text-ink2">Mark as a “do it like this” example</span>
      </label>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={busy} onClick={submit}>{busy ? 'Saving…' : 'Add clip'}</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function ClipCard({ clip, play, onDelete }) {
  const [open, setOpen] = useState(false);
  const meta = PROVIDER_META[clip.provider] || PROVIDER_META.other;
  return (
    <div className="card-flat p-3">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left flex items-start gap-3 press">
        <div className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-white" style={{ background: 'var(--field-bot)' }}>
          <Icon name="play" size={22} fill />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            {clip.goodExample && <Chip tone="brand">Example</Chip>}
            <span className="label text-[10px] text-muted">{meta.label}</span>
          </div>
          <p className="font-semibold text-ink truncate">{clip.title}</p>
          <p className="text-xs text-muted truncate">{[play?.name, clip.positions?.join('/')].filter(Boolean).join(' · ') || 'Tap to watch'}</p>
        </div>
        <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} className="text-muted mt-1" />
      </button>
      {open && (
        <div className="mt-3">
          <ClipPlayer clip={clip} />
          {clip.notes && (
            <div className="mt-3 rounded-xl p-3" style={{ background: 'color-mix(in srgb, var(--c-st) 8%, var(--c-surface))', border: '1px solid color-mix(in srgb, var(--c-st) 22%, transparent)' }}>
              <Label className="text-st mb-1">Coaching points</Label>
              <p className="text-sm text-ink2 whitespace-pre-wrap">{clip.notes}</p>
            </div>
          )}
          <button onClick={() => { if (confirm('Remove this clip?')) onDelete(clip.id); }} className="mt-2 label text-[11px] text-def press">Remove clip</button>
        </div>
      )}
    </div>
  );
}

export default function Film({ plays }) {
  const [clips, setClips] = useState(() => getClips());
  const [adding, setAdding] = useState(false);
  const [filter, setFilter] = useState('all');
  const refresh = () => setClips(getClips());

  const positions = useMemo(() => [...new Set(clips.flatMap(c => c.positions || []).filter(Boolean))].sort(), [clips]);
  const shown = clips.filter(c => filter === 'all' ? true : filter === 'examples' ? c.goodExample : (c.positions || []).includes(filter));
  const playById = useMemo(() => Object.fromEntries(plays.map(p => [p.id, p])), [plays]);

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-1">
        <h1 className="display text-3xl text-ink">FILM ROOM</h1>
        <Button size="sm" icon="plus" onClick={() => setAdding(a => !a)}>Add clip</Button>
      </div>
      <p className="text-sm text-muted mb-4">Examples of plays &amp; assignments done right — with your coach’s notes.</p>

      {adding && <AddClip plays={plays} onCancel={() => setAdding(false)} onAdd={() => { setAdding(false); refresh(); }} />}

      {clips.length > 0 && (
        <div className="flex gap-1.5 mb-4 overflow-x-auto no-scrollbar pb-1">
          <Pill active={filter === 'all'} onClick={() => setFilter('all')}>All</Pill>
          <Pill active={filter === 'examples'} onClick={() => setFilter('examples')}>✅ Examples</Pill>
          {positions.map(p => <Pill key={p} active={filter === p} onClick={() => setFilter(p)}>{p}</Pill>)}
        </div>
      )}

      {clips.length === 0 ? (
        <div className="text-center py-14 text-muted">
          <div className="text-4xl mb-3">🎬</div>
          <p className="font-semibold text-ink">No film yet</p>
          <p className="text-sm mt-1 mb-4">Add a Hudl link or upload a clip, then tag it to a play.</p>
          <Button icon="plus" onClick={() => setAdding(true)}>Add your first clip</Button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {shown.map(c => <ClipCard key={c.id} clip={c} play={playById[c.playId]} onDelete={async (id) => { await deleteClip(id); refresh(); }} />)}
          {shown.length === 0 && <p className="text-center text-sm text-muted py-8">No clips match that filter.</p>}
        </div>
      )}
    </div>
  );
}
