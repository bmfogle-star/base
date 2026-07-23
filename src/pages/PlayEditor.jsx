import { useState } from 'react';
import FieldDiagram, { starterFormation, emptyDiagram } from '../components/FieldDiagram';
import { CATEGORY_ORDER, categoryMeta } from '../lib/playmeta';
import { Button, Label, Segmented, Icon } from '../components/ui';

function compressImage(file, maxDim = 1000, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function FieldRow({ label, children }) {
  return <label className="block mb-4"><span className="label text-[11px] text-ink2 mb-1.5 block">{label}</span>{children}</label>;
}

export default function PlayEditor({ play, onSave, onCancel, onDelete }) {
  const isNew = !play;
  const [form, setForm] = useState(() => play || {
    name: '', category: 'offense', formation: '', personnel: '', tags: [], positions: [], notes: '', starred: false,
    diagram: starterFormation(), image: null,
  });
  const [mode, setMode] = useState(play?.image ? 'image' : 'draw');
  const [tagsText, setTagsText] = useState((play?.tags || []).join(', '));
  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  const setPosition = (i, patch) => set({ positions: form.positions.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  const addPosition = () => set({ positions: [...form.positions, { pos: '', label: '', assignment: '' }] });
  const removePosition = (i) => set({ positions: form.positions.filter((_, idx) => idx !== i) });

  async function onImage(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try { set({ image: await compressImage(file) }); } catch { alert('Could not read that image.'); }
  }
  function submit() {
    onSave({
      ...form, name: form.name.trim() || 'Untitled play',
      tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
      positions: form.positions.filter(p => p.pos || p.label || p.assignment),
      image: mode === 'image' ? form.image : null,
    });
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="flex items-center gap-1 label text-[11px] text-muted press"><Icon name="close" size={15} /> Cancel</button>
        <h1 className="font-display text-xl text-ink">{isNew ? 'NEW PLAY' : 'EDIT PLAY'}</h1>
        <button onClick={submit} className="label text-[11px] text-brand press">Save</button>
      </div>

      <FieldRow label="Play name">
        <input className="input" value={form.name} autoFocus onChange={e => set({ name: e.target.value })} placeholder="e.g. Mesh, Power O, Cover 3" />
      </FieldRow>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {CATEGORY_ORDER.map(c => (
          <button key={c} onClick={() => set({ category: c })}
            className={`py-2.5 rounded-xl label text-[11px] border press ${form.category === c ? 'bg-brand text-brandink border-brand' : 'card-flat text-muted'}`}>
            {categoryMeta(c).emoji} {categoryMeta(c).label.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FieldRow label="Formation"><input className="input" value={form.formation} onChange={e => set({ formation: e.target.value })} placeholder="Trips Right" /></FieldRow>
        <FieldRow label="Personnel"><input className="input" value={form.personnel} onChange={e => set({ personnel: e.target.value })} placeholder="11 personnel" /></FieldRow>
      </div>

      <FieldRow label="Tags (comma separated)"><input className="input" value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="Pass, Man-beater, Red zone" /></FieldRow>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label>Diagram</Label>
          <Segmented className="w-44" value={mode} onChange={setMode}
            options={[{ value: 'draw', label: 'Draw', icon: 'edit' }, { value: 'image', label: 'Upload', icon: 'camera' }]} />
        </div>
        {mode === 'draw' ? (
          <FieldDiagram value={form.diagram || emptyDiagram()} onChange={d => set({ diagram: d })} />
        ) : form.image ? (
          <div className="relative">
            <img src={form.image} alt="Play" className="w-full rounded-2xl card" />
            <button onClick={() => set({ image: null })} className="absolute top-2 right-2 bg-black/60 text-white label text-[10px] px-2.5 py-1 rounded-lg">Remove</button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-line2 rounded-2xl py-12 cursor-pointer text-muted">
            <Icon name="camera" size={28} />
            <span className="text-sm font-medium">Snap or upload a playbook page</span>
            <input type="file" accept="image/*" className="hidden" onChange={onImage} />
          </label>
        )}
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <Label>Assignments by position</Label>
          <button onClick={addPosition} className="label text-[11px] text-brand press">+ Add</button>
        </div>
        {form.positions.length === 0 && <p className="text-xs text-muted mb-2">Add each position’s job — this is what you’ll be quizzed on.</p>}
        <div className="space-y-2">
          {form.positions.map((p, i) => (
            <div key={i} className="card-flat p-2.5">
              <div className="flex gap-2 mb-2">
                <input className="input w-24" value={p.pos} onChange={e => setPosition(i, { pos: e.target.value })} placeholder="Pos" />
                <input className="input" value={p.label} onChange={e => setPosition(i, { label: e.target.value })} placeholder="Role (e.g. Slot WR)" />
                <button onClick={() => removePosition(i)} className="px-2 text-muted hover:text-def press"><Icon name="trash" size={17} /></button>
              </div>
              <textarea className="input min-h-[52px] resize-y" value={p.assignment} onChange={e => setPosition(i, { assignment: e.target.value })} placeholder="Assignment / responsibility on this play" />
            </div>
          ))}
        </div>
      </div>

      <FieldRow label="Coaching notes"><textarea className="input min-h-[72px] resize-y" value={form.notes} onChange={e => set({ notes: e.target.value })} placeholder="Keys, adjustments, when to check…" /></FieldRow>

      <label className="flex items-center gap-2 mb-6 cursor-pointer">
        <input type="checkbox" checked={form.starred} onChange={e => set({ starred: e.target.checked })} className="w-4 h-4 accent-[var(--c-brand)]" />
        <span className="text-sm text-ink2 flex items-center gap-1.5"><Icon name="star" size={15} fill className="text-yard" /> Star this play (quick access)</span>
      </label>

      <Button className="w-full mb-3" onClick={submit}>{isNew ? 'Add to playbook' : 'Save changes'}</Button>
      {!isNew && <button onClick={() => { if (confirm('Delete this play?')) onDelete(play.id); }} className="w-full text-def label text-[11px] py-2 press">Delete play</button>}
    </div>
  );
}
