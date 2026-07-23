import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getProgress } from '../data/playbook';
import { masteryLabel, masteryScore } from '../lib/srs';
import { Button, Chip, Label, Pill, Icon } from '../components/ui';

const toneFor = (c) => (c === 'defense' ? 'def' : c === 'special' ? 'st' : 'brand');

function PlayCard({ play, onOpen }) {
  const meta = categoryMeta(play.category);
  const progress = getProgress()[play.id];
  const score = masteryScore(progress);
  return (
    <button onClick={() => onOpen(play.id)} className="text-left card-flat p-2.5 press hover:border-line2 transition-colors">
      <div className="rounded-xl overflow-hidden mb-2.5" style={{ backgroundColor: 'var(--field-bot)' }}>
        {play.image
          ? <img src={play.image} alt={play.name} className="w-full h-28 object-cover" />
          : <div className="h-28"><DiagramView diagram={play.diagram} contain /></div>}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink truncate flex items-center gap-1">
            {play.starred && <Icon name="star" size={13} fill className="text-yard" />}
            {play.name || 'Untitled play'}
          </h3>
          <p className="text-xs text-muted truncate">
            {[play.formation, play.personnel].filter(Boolean).join(' · ') || meta.label}
          </p>
        </div>
        <Chip tone={toneFor(play.category)}>{masteryLabel(progress)}</Chip>
      </div>
      {score > 0 && (
        <div className="mt-2 h-1 rounded-full bg-ink/8 overflow-hidden">
          <div className="h-full bg-brand rounded-full" style={{ width: `${Math.round(score * 100)}%` }} />
        </div>
      )}
    </button>
  );
}

export default function Playbook({ plays, onOpen, onAdd, initialCategory }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(initialCategory || 'all');

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return plays.filter(p => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!term) return true;
      const hay = [p.name, p.formation, p.personnel, ...(p.tags || []),
        ...(p.positions || []).map(x => `${x.pos} ${x.label} ${x.assignment}`)].join(' ').toLowerCase();
      return hay.includes(term);
    });
  }, [plays, q, cat]);

  const grouped = useMemo(() => {
    const g = {};
    for (const p of filtered) (g[p.category] ||= []).push(p);
    return g;
  }, [filtered]);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="display text-3xl text-ink">PLAYBOOK</h1>
        <Button size="sm" icon="plus" onClick={onAdd}>Add play</Button>
      </div>

      <div className="relative mb-3">
        <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search plays, formations, tags…"
          className="input pl-10" />
      </div>

      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-1">
        <Pill active={cat === 'all'} onClick={() => setCat('all')}>All</Pill>
        {CATEGORY_ORDER.map(c => (
          <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{categoryMeta(c).emoji} {categoryMeta(c).label}</Pill>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted">
          <div className="text-4xl mb-3">🏈</div>
          <p className="font-semibold text-ink">No plays yet</p>
          <p className="text-sm mt-1 mb-4">Add your first play to start building your book.</p>
          <Button icon="plus" onClick={onAdd}>Add a play</Button>
        </div>
      ) : (
        CATEGORY_ORDER.filter(c => grouped[c]?.length).map(c => (
          <div key={c} className="mb-6">
            <div className="flex items-center gap-2 mb-2.5">
              <Label className={`text-${toneFor(c) === 'def' ? 'def' : toneFor(c) === 'st' ? 'st' : 'brand'}`}>
                {categoryMeta(c).emoji} {categoryMeta(c).label}
              </Label>
              <span className="font-display num text-sm text-muted">{grouped[c].length}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {grouped[c].map(p => <PlayCard key={p.id} play={p} onOpen={onOpen} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
