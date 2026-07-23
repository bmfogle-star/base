import { useMemo } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getProgress } from '../data/playbook';
import { isDue, masteryLabel, masteryScore } from '../lib/srs';
import Emoji from '../components/Emoji';

function Stat({ value, label, emoji }) {
  return (
    <div className="bg-white dark:bg-neutral-900 rounded-2xl p-3 text-center card-elevate border border-gray-100 dark:border-neutral-800">
      <div className="text-2xl font-display text-gray-900 dark:text-neutral-100">{value}</div>
      <div className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400 uppercase tracking-wide">{emoji} {label}</div>
    </div>
  );
}

export default function Home({ plays, profile, onStudy, onOpen, onAdd, onBrowse }) {
  const progress = getProgress();
  const stats = useMemo(() => {
    let mastered = 0, learning = 0, newCount = 0, due = 0, sum = 0;
    for (const p of plays) {
      const st = progress[p.id];
      const label = masteryLabel(st);
      if (label === 'Mastered') mastered++;
      else if (label === 'New') newCount++;
      else learning++;
      if (isDue(st)) due++;
      sum += masteryScore(st);
    }
    const overall = plays.length ? Math.round((sum / plays.length) * 100) : 0;
    return { mastered, learning, newCount, due, overall };
  }, [plays, progress]);

  const starred = plays.filter(p => p.starred).slice(0, 6);
  const recent = [...plays].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);
  const name = profile?.name?.trim();

  return (
    <div className="pb-6">
      <div className="mb-4">
        <p className="text-sm text-gray-500 dark:text-neutral-400">{name ? `Let's get to work, ${name}.` : 'Welcome to your playbook.'}</p>
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100">
          {profile?.position ? `${profile.position} · ` : ''}{plays.length} play{plays.length !== 1 ? 's' : ''} to master
        </h1>
      </div>

      {/* Hero study card */}
      <div className="rounded-3xl p-5 mb-5 card-elevate text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f5132, #146536 60%, #1a7a43)' }}>
        <div className="card-pattern absolute inset-0 opacity-60" />
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-green-200">Daily reps</span>
            <span className="text-xs font-semibold text-green-100">{stats.overall}% mastered</span>
          </div>
          <div className="text-3xl font-display mb-0.5">{stats.due} play{stats.due !== 1 ? 's' : ''} due</div>
          <p className="text-sm text-green-100 mb-4">Spaced repetition resurfaces the plays you're about to forget.</p>
          <div className="h-2 rounded-full bg-white/20 overflow-hidden mb-4">
            <div className="h-full bg-gold rounded-full" style={{ width: `${stats.overall}%` }} />
          </div>
          <button onClick={onStudy}
            className="w-full bg-white text-green-800 font-bold py-3 rounded-xl hover:bg-green-50">
            {stats.due > 0 ? '🧠 Start today’s reps' : '🧠 Study anyway'}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <Stat value={stats.mastered} label="Mastered" emoji="🏆" />
        <Stat value={stats.learning} label="Learning" emoji="📈" />
        <Stat value={stats.newCount} label="New" emoji="✨" />
      </div>

      {/* Quick access (starred) */}
      {starred.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-neutral-400">⭐ Quick access</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {starred.map(p => (
              <button key={p.id} onClick={() => onOpen(p.id)} className="flex-shrink-0 w-32">
                <div className="rounded-xl overflow-hidden card-elevate mb-1" style={{ backgroundColor: '#15683a' }}>
                  {p.image ? <img src={p.image} alt={p.name} className="w-32 h-24 object-cover" />
                    : <div className="h-24"><DiagramView diagram={p.diagram} contain /></div>}
                </div>
                <p className="text-xs font-semibold text-gray-800 dark:text-neutral-200 truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        {CATEGORY_ORDER.map(c => {
          const count = plays.filter(p => p.category === c).length;
          const m = categoryMeta(c);
          return (
            <button key={c} onClick={() => onBrowse(c)}
              className="bg-white dark:bg-neutral-900 rounded-2xl p-3 card-elevate border border-gray-100 dark:border-neutral-800 text-left">
              <div className="text-xl">{m.emoji}</div>
              <div className="text-lg font-bold text-gray-900 dark:text-neutral-100">{count}</div>
              <div className="text-[11px] font-semibold text-gray-500 dark:text-neutral-400">{m.label}</div>
            </button>
          );
        })}
      </div>

      {/* Recently added */}
      {recent.length > 0 && (
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-2">Recently added</h2>
          <div className="space-y-2">
            {recent.map(p => (
              <button key={p.id} onClick={() => onOpen(p.id)}
                className="w-full flex items-center gap-3 bg-white dark:bg-neutral-900 rounded-xl p-2.5 card-elevate border border-gray-100 dark:border-neutral-800 text-left">
                <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0" style={{ backgroundColor: '#15683a' }}>
                  {p.image ? <img src={p.image} alt="" className="w-full h-full object-cover" />
                    : <DiagramView diagram={p.diagram} contain />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 dark:text-neutral-100 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{[categoryMeta(p.category).label, p.formation].filter(Boolean).join(' · ')}</p>
                </div>
                <span className="text-xs font-semibold text-green-700 dark:text-green-400">{masteryLabel(progress[p.id])}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onAdd} className="w-full mt-5 border-2 border-dashed border-gray-300 dark:border-neutral-700 text-gray-500 dark:text-neutral-400 font-semibold py-3 rounded-xl">
        ➕ Add a play
      </button>
    </div>
  );
}
