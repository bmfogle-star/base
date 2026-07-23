import { useMemo } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getProgress } from '../data/playbook';
import { isDue, masteryLabel, masteryScore } from '../lib/srs';
import { Button, Chip, Label, Ring, Icon } from '../components/ui';

function StatTile({ value, label, tone }) {
  return (
    <div className="card-flat p-3 text-center">
      <div className={`font-display num text-[2.4rem] leading-none ${tone === 'brand' ? 'text-brand' : 'text-ink'}`}>{value}</div>
      <div className="label text-[10px] text-muted mt-1">{label}</div>
    </div>
  );
}

function Thumb({ play, className = '' }) {
  return (
    <div className={`overflow-hidden ${className}`} style={{ backgroundColor: 'var(--field-bot)' }}>
      {play.image
        ? <img src={play.image} alt="" className="w-full h-full object-cover" />
        : <DiagramView diagram={play.diagram} contain />}
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
    return { mastered, learning, newCount, due, overall: plays.length ? sum / plays.length : 0 };
  }, [plays, progress]);

  const starred = plays.filter(p => p.starred).slice(0, 6);
  const recent = [...plays].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || '')).slice(0, 4);
  const name = profile?.name?.trim();
  const pct = Math.round(stats.overall * 100);

  return (
    <div className="pb-4">
      <Label className="text-brand mb-1">{name ? `Let’s get to work, ${name}` : 'Welcome to your playbook'}</Label>
      <h1 className="display text-[2.1rem] text-ink mb-5">
        {profile?.position ? `${profile.position} · ` : ''}{plays.length} PLAY{plays.length !== 1 ? 'S' : ''} TO MASTER
      </h1>

      {/* Scoreboard hero */}
      <div className="chalkboard text-white rounded-[var(--radius-card)] p-5 mb-5 border border-white/10"
        style={{ boxShadow: 'inset 0 -3px 0 var(--c-yard)' }}>
        <div className="flex items-center justify-between mb-4">
          <span className="label text-[11px] text-brand">Daily reps</span>
          <span className="label text-[11px] text-white/55">{pct}% mastered</span>
        </div>
        <div className="flex items-center gap-5 mb-4">
          <Ring value={stats.overall} size={82} stroke={9} color="var(--c-yard)">
            <div className="text-center">
              <div className="font-display num text-2xl leading-none">{pct}</div>
              <div className="label text-[8px] text-white/50">mastered</div>
            </div>
          </Ring>
          <div className="min-w-0">
            <div className="flex items-end gap-2">
              <span className="font-display num text-6xl leading-[0.8] text-yard">{stats.due}</span>
              <span className="label text-xs text-white/70 pb-1">play{stats.due !== 1 ? 's' : ''}<br />due</span>
            </div>
          </div>
        </div>
        <Button variant="primary" className="w-full" icon="study" onClick={onStudy}>
          {stats.due > 0 ? 'Start today’s reps' : 'Study anyway'}
        </Button>
      </div>

      {/* Stat row */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <StatTile value={stats.mastered} label="Mastered" tone="brand" />
        <StatTile value={stats.learning} label="Learning" />
        <StatTile value={stats.newCount} label="New" />
      </div>

      {/* Quick access */}
      {starred.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-1.5 mb-2.5">
            <Icon name="star" size={14} fill className="text-yard" />
            <Label>Quick access</Label>
          </div>
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
            {starred.map(p => (
              <button key={p.id} onClick={() => onOpen(p.id)} className="flex-shrink-0 w-32 press text-left">
                <Thumb play={p} className="w-32 h-24 rounded-xl card-flat mb-1.5" />
                <p className="text-sm font-semibold text-ink truncate">{p.name}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Category split */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        {CATEGORY_ORDER.map(c => {
          const count = plays.filter(p => p.category === c).length;
          const m = categoryMeta(c);
          return (
            <button key={c} onClick={() => onBrowse(c)} className="card-flat p-3 text-left press">
              <div className="text-lg mb-0.5">{m.emoji}</div>
              <div className="font-display num text-2xl leading-none text-ink">{count}</div>
              <div className="label text-[10px] text-muted mt-0.5">{m.label}</div>
            </button>
          );
        })}
      </div>

      {/* Recently added */}
      {recent.length > 0 && (
        <div>
          <Label className="mb-2.5">Recently added</Label>
          <div className="space-y-2">
            {recent.map(p => (
              <button key={p.id} onClick={() => onOpen(p.id)} className="w-full flex items-center gap-3 card-flat p-2.5 text-left press">
                <Thumb play={p} className="w-16 h-14 rounded-lg flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink truncate">{p.name}</p>
                  <p className="text-sm text-muted truncate">{[categoryMeta(p.category).label, p.formation].filter(Boolean).join(' · ')}</p>
                </div>
                <Chip tone={p.category === 'defense' ? 'def' : p.category === 'special' ? 'st' : 'brand'}>{masteryLabel(progress[p.id])}</Chip>
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={onAdd} className="w-full mt-5 rounded-2xl border-2 border-dashed border-line2 text-muted label text-[12px] py-3.5 flex items-center justify-center gap-2 press">
        <Icon name="plus" size={16} /> Add a play
      </button>
    </div>
  );
}
