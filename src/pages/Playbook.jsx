import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getProgress } from '../data/playbook';
import { masteryLabel, masteryScore } from '../lib/srs';
import Emoji from '../components/Emoji';

function PlayCard({ play, onOpen }) {
  const meta = categoryMeta(play.category);
  const progress = getProgress()[play.id];
  const score = masteryScore(progress);
  return (
    <button onClick={() => onOpen(play.id)}
      className="text-left bg-white dark:bg-neutral-900 rounded-2xl p-3 card-elevate border border-gray-100 dark:border-neutral-800 hover:border-green-300 dark:hover:border-green-800 transition-colors">
      <div className="rounded-xl overflow-hidden mb-2.5" style={{ backgroundColor: '#15683a' }}>
        {play.image
          ? <img src={play.image} alt={play.name} className="w-full h-32 object-cover" />
          : <div className="h-32"><DiagramView diagram={play.diagram} contain /></div>}
      </div>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-bold text-gray-900 dark:text-neutral-100 truncate flex items-center gap-1">
            {play.starred && <Emoji e="⭐" size="0.85em" />}
            {play.name || 'Untitled play'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
            {[play.formation, play.personnel].filter(Boolean).join(' · ') || meta.label}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${meta.chip}`}>
          {meta.emoji} {masteryLabel(progress)}
        </span>
      </div>
      {score > 0 && (
        <div className="mt-2 h-1 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-green-600 dark:bg-green-500 rounded-full" style={{ width: `${Math.round(score * 100)}%` }} />
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
        ...(p.positions || []).map(x => `${x.pos} ${x.label} ${x.assignment}`)]
        .join(' ').toLowerCase();
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
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100">Playbook</h1>
        <button onClick={onAdd}
          className="bg-green-700 hover:bg-green-800 text-white text-sm font-semibold px-3.5 py-2 rounded-xl flex items-center gap-1.5">
          <Emoji e="➕" size="0.9em" /> Add play
        </button>
      </div>

      <input value={q} onChange={e => setQ(e.target.value)}
        placeholder="Search plays, formations, tags…"
        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 mb-3 outline-none focus:border-green-500" />

      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {['all', ...CATEGORY_ORDER].map(c => {
          const active = cat === c;
          const label = c === 'all' ? 'All' : categoryMeta(c).label;
          return (
            <button key={c} onClick={() => setCat(c)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${
                active ? 'bg-green-700 text-white border-green-700'
                : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>
              {c === 'all' ? '📋 ' : categoryMeta(c).emoji + ' '}{label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500 dark:text-neutral-400">
          <div className="text-4xl mb-3"><Emoji e="🏈" /></div>
          <p className="font-medium">No plays yet</p>
          <p className="text-sm mt-1">Add your first play to start building your book.</p>
          <button onClick={onAdd} className="mt-4 bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-xl">Add a play</button>
        </div>
      ) : (
        CATEGORY_ORDER.filter(c => grouped[c]?.length).map(c => (
          <div key={c} className="mb-6">
            <h2 className={`text-sm font-bold uppercase tracking-wide mb-2.5 ${categoryMeta(c).color}`}>
              {categoryMeta(c).emoji} {categoryMeta(c).label}
              <span className="text-gray-400 dark:text-neutral-500 ml-1.5 font-semibold">{grouped[c].length}</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {grouped[c].map(p => <PlayCard key={p.id} play={p} onOpen={onOpen} />)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
