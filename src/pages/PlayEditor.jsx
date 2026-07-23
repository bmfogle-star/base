import { useState } from 'react';
import FieldDiagram, { starterFormation, emptyDiagram } from '../components/FieldDiagram';
import { CATEGORY_ORDER, categoryMeta } from '../lib/playmeta';
import Emoji from '../components/Emoji';

// Downscale an uploaded image to keep localStorage small, return a data URL.
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

function Field({ label, children }) {
  return (
    <label className="block mb-4">
      <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:border-green-500';

export default function PlayEditor({ play, onSave, onCancel, onDelete }) {
  const isNew = !play;
  const [form, setForm] = useState(() => play || {
    name: '', category: 'offense', formation: '', personnel: '',
    tags: [], positions: [], notes: '', starred: false,
    diagram: starterFormation(), image: null,
  });
  // 'draw' = interactive field, 'image' = uploaded page.
  const [mode, setMode] = useState(play?.image ? 'image' : 'draw');
  const [tagsText, setTagsText] = useState((play?.tags || []).join(', '));

  const set = (patch) => setForm(f => ({ ...f, ...patch }));

  function setPosition(i, patch) {
    set({ positions: form.positions.map((p, idx) => idx === i ? { ...p, ...patch } : p) });
  }
  function addPosition() {
    set({ positions: [...form.positions, { pos: '', label: '', assignment: '' }] });
  }
  function removePosition(i) {
    set({ positions: form.positions.filter((_, idx) => idx !== i) });
  }

  async function onImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImage(file);
      set({ image: dataUrl });
    } catch {
      alert('Could not read that image.');
    }
  }

  function submit() {
    const cleanPositions = form.positions.filter(p => p.pos || p.label || p.assignment);
    onSave({
      ...form,
      name: form.name.trim() || 'Untitled play',
      tags: tagsText.split(',').map(t => t.trim()).filter(Boolean),
      positions: cleanPositions,
      // Keep only the chosen medium so viewers know which to show.
      image: mode === 'image' ? form.image : null,
    });
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onCancel} className="text-sm font-semibold text-gray-500 dark:text-neutral-400 flex items-center gap-1">
          <Emoji e="⬅️" size="0.85em" /> Cancel
        </button>
        <h1 className="text-lg font-display text-gray-900 dark:text-neutral-100">{isNew ? 'New play' : 'Edit play'}</h1>
        <button onClick={submit} className="text-sm font-bold text-green-700 dark:text-green-400">Save</button>
      </div>

      <Field label="Play name">
        <input className={inputCls} value={form.name} autoFocus
          onChange={e => set({ name: e.target.value })} placeholder="e.g. Mesh, Power O, Cover 3" />
      </Field>

      <div className="grid grid-cols-3 gap-2 mb-4">
        {CATEGORY_ORDER.map(c => {
          const active = form.category === c;
          return (
            <button key={c} onClick={() => set({ category: c })}
              className={`py-2.5 rounded-xl text-sm font-semibold border ${
                active ? 'bg-green-700 text-white border-green-700'
                : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>
              {categoryMeta(c).emoji} {categoryMeta(c).label.split(' ')[0]}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Formation">
          <input className={inputCls} value={form.formation}
            onChange={e => set({ formation: e.target.value })} placeholder="Trips Right" />
        </Field>
        <Field label="Personnel">
          <input className={inputCls} value={form.personnel}
            onChange={e => set({ personnel: e.target.value })} placeholder="11 personnel" />
        </Field>
      </div>

      <Field label="Tags (comma separated)">
        <input className={inputCls} value={tagsText}
          onChange={e => setTagsText(e.target.value)} placeholder="Pass, Man-beater, Red zone" />
      </Field>

      {/* Diagram: draw or upload */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Diagram</span>
          <div className="flex gap-1 bg-gray-100 dark:bg-neutral-800 rounded-lg p-0.5">
            <button onClick={() => setMode('draw')}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'draw' ? 'bg-white dark:bg-neutral-700 text-green-700 dark:text-green-300 shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}>✏️ Draw</button>
            <button onClick={() => setMode('image')}
              className={`px-3 py-1 rounded-md text-xs font-semibold ${mode === 'image' ? 'bg-white dark:bg-neutral-700 text-green-700 dark:text-green-300 shadow-sm' : 'text-gray-500 dark:text-neutral-400'}`}>🖼️ Upload</button>
          </div>
        </div>

        {mode === 'draw' ? (
          <FieldDiagram value={form.diagram || emptyDiagram()} onChange={d => set({ diagram: d })} />
        ) : (
          <div>
            {form.image ? (
              <div className="relative">
                <img src={form.image} alt="Play" className="w-full rounded-2xl card-elevate" />
                <button onClick={() => set({ image: null })}
                  className="absolute top-2 right-2 bg-black/60 text-white text-xs font-semibold px-2.5 py-1 rounded-lg">Remove</button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 dark:border-neutral-700 rounded-2xl py-12 cursor-pointer text-gray-500 dark:text-neutral-400">
                <span className="text-3xl"><Emoji e="📷" /></span>
                <span className="text-sm font-medium">Snap or upload a playbook page</span>
                <input type="file" accept="image/*" className="hidden" onChange={onImage} />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Position assignments */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Assignments by position</span>
          <button onClick={addPosition} className="text-xs font-bold text-green-700 dark:text-green-400">+ Add</button>
        </div>
        {form.positions.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-neutral-500 mb-2">Add each position's job — this is what you'll be quizzed on.</p>
        )}
        <div className="space-y-2">
          {form.positions.map((p, i) => (
            <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-800 p-2.5">
              <div className="flex gap-2 mb-2">
                <input className={`${inputCls} w-24`} value={p.pos}
                  onChange={e => setPosition(i, { pos: e.target.value })} placeholder="Pos" />
                <input className={inputCls} value={p.label}
                  onChange={e => setPosition(i, { label: e.target.value })} placeholder="Role (e.g. Slot WR)" />
                <button onClick={() => removePosition(i)} className="px-2 text-gray-400 hover:text-red-500"><Emoji e="🗑️" size="0.9em" /></button>
              </div>
              <textarea className={`${inputCls} min-h-[52px] resize-y`} value={p.assignment}
                onChange={e => setPosition(i, { assignment: e.target.value })} placeholder="Assignment / responsibility on this play" />
            </div>
          ))}
        </div>
      </div>

      <Field label="Coaching notes">
        <textarea className={`${inputCls} min-h-[72px] resize-y`} value={form.notes}
          onChange={e => set({ notes: e.target.value })} placeholder="Keys, adjustments, when to check…" />
      </Field>

      <label className="flex items-center gap-2 mb-6 cursor-pointer">
        <input type="checkbox" checked={form.starred} onChange={e => set({ starred: e.target.checked })}
          className="w-4 h-4 accent-green-700" />
        <span className="text-sm text-gray-700 dark:text-neutral-200">⭐ Star this play (quick access)</span>
      </label>

      <button onClick={submit}
        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl mb-3">
        {isNew ? 'Add to playbook' : 'Save changes'}
      </button>

      {!isNew && (
        <button onClick={() => { if (confirm('Delete this play?')) onDelete(play.id); }}
          className="w-full text-red-600 dark:text-red-400 font-semibold py-2 text-sm">Delete play</button>
      )}
    </div>
  );
}
