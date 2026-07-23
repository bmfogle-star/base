import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getPlayProgress, setPlayProgress } from '../data/playbook';
import { schedule, isDue, gradePreview, masteryLabel } from '../lib/srs';
import Quiz from './Quiz';
import { Button, Chip, Label, Pill, Segmented, Icon } from '../components/ui';

const GRADES = [
  { id: 'again', label: 'Again', style: { background: 'color-mix(in srgb, var(--c-def) 90%, black)', color: '#fff' } },
  { id: 'hard', label: 'Hard', style: { background: 'var(--c-st)', color: '#1a1400' } },
  { id: 'good', label: 'Good', style: { background: 'var(--c-brand)', color: 'var(--c-brandink)' } },
  { id: 'easy', label: 'Easy', style: { background: 'color-mix(in srgb, var(--c-brand) 70%, white)', color: '#06140c' } },
];
const toneFor = (c) => (c === 'defense' ? 'def' : c === 'special' ? 'st' : 'brand');

function answerFor(play, posFocus) {
  if (posFocus && posFocus !== 'all') {
    const match = (play.positions || []).find(p => `${p.pos} ${p.label}`.toLowerCase().includes(posFocus.toLowerCase()));
    if (match) return { focused: match, list: [match] };
  }
  return { focused: null, list: play.positions || [] };
}

function SessionSetup({ plays, profile, onStart, onExit }) {
  const [mode, setMode] = useState('flashcards');
  const [scope, setScope] = useState('due');
  const [cat, setCat] = useState('all');
  const [posFocus, setPosFocus] = useState(profile?.position || 'all');

  const positions = useMemo(() => {
    const set = new Set();
    plays.forEach(p => (p.positions || []).forEach(x => x.pos && set.add(x.pos)));
    return [...set].sort();
  }, [plays]);
  const dueCount = plays.filter(p => isDue(getPlayProgress(p.id))).length;

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-5">
        <h1 className="display text-3xl text-ink">STUDY</h1>
        <button onClick={onExit} className="label text-[11px] text-muted press">Close</button>
      </div>

      <Label className="mb-2">How to study</Label>
      <Segmented className="mb-5" value={mode} onChange={setMode}
        options={[{ value: 'flashcards', label: 'Flashcards', icon: 'study' }, { value: 'quiz', label: 'Quiz', icon: 'check' }]} />

      {mode === 'flashcards' && (
        <>
          <Label className="mb-2">What to study</Label>
          <div className="grid grid-cols-2 gap-2 mb-5">
            {[['due', 'Due for review', `${dueCount} ready`], ['all', 'Everything', `${plays.length} plays`]].map(([id, t, sub]) => (
              <button key={id} onClick={() => setScope(id)}
                className={`p-3 rounded-2xl border text-left press ${scope === id ? 'bg-brand text-brandink border-brand' : 'card-flat'}`}>
                <div className="font-display text-lg leading-none">{t}</div>
                <div className={`text-xs mt-1 ${scope === id ? 'opacity-80' : 'text-muted'}`}>{sub}</div>
              </button>
            ))}
          </div>
        </>
      )}

      <Label className="mb-2">Side of the ball</Label>
      <div className="flex gap-1.5 mb-5 overflow-x-auto no-scrollbar pb-1">
        <Pill active={cat === 'all'} onClick={() => setCat('all')}>All</Pill>
        {CATEGORY_ORDER.map(c => <Pill key={c} active={cat === c} onClick={() => setCat(c)}>{categoryMeta(c).emoji} {categoryMeta(c).label}</Pill>)}
      </div>

      {positions.length > 0 && (
        <>
          <Label className="mb-2">Drill a position <span className="text-muted normal-case tracking-normal">(optional)</span></Label>
          <div className="flex gap-1.5 mb-6 overflow-x-auto no-scrollbar pb-1">
            <Pill active={posFocus === 'all'} onClick={() => setPosFocus('all')}>All</Pill>
            {positions.map(p => <Pill key={p} active={posFocus === p} onClick={() => setPosFocus(p)}>{p}</Pill>)}
          </div>
        </>
      )}

      <Button className="w-full" onClick={() => onStart({ mode, scope, cat, posFocus })}>
        {mode === 'quiz' ? 'Start quiz' : 'Start studying'}
      </Button>
    </div>
  );
}

function Flashcard({ plays, config, onExit }) {
  const [queue, setQueue] = useState(() => plays.filter(p => {
    if (config.cat !== 'all' && p.category !== config.cat) return false;
    if (config.scope === 'due' && !isDue(getPlayProgress(p.id))) return false;
    if (config.posFocus && config.posFocus !== 'all') {
      return (p.positions || []).some(x => `${x.pos} ${x.label}`.toLowerCase().includes(config.posFocus.toLowerCase()));
    }
    return true;
  }).map(p => p.id));
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [total] = useState(() => queue.length);

  if (queue.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="display text-2xl text-ink">{total === 0 ? 'Nothing to study here' : 'Session complete'}</h2>
        <p className="text-muted mt-1 mb-6">{total === 0 ? 'Try a different scope or add more plays.' : `You reviewed ${done} card${done !== 1 ? 's' : ''}. Nice work.`}</p>
        <Button onClick={onExit}>Done</Button>
      </div>
    );
  }

  const play = plays.find(p => p.id === queue[0]);
  if (!play) return null;
  const progress = getPlayProgress(play.id);
  const preview = gradePreview(progress);
  const { focused, list } = answerFor(play, config.posFocus);

  function grade(g) {
    const next = schedule(progress, g);
    setPlayProgress(play.id, next);
    setDone(d => d + 1);
    setRevealed(false);
    setQueue(q => {
      const [cur, ...rest] = q;
      if (g === 'again') { const at = Math.min(3, rest.length); return [...rest.slice(0, at), cur, ...rest.slice(at)]; }
      return rest;
    });
  }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="label text-[11px] text-muted press">Exit</button>
        <span className="label text-[11px] text-muted num">{done + 1} / {total}{done >= total ? '+' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink/8 overflow-hidden mb-4">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
      </div>

      <div className="rounded-[var(--radius-card)] overflow-hidden mb-3 border border-line" style={{ backgroundColor: 'var(--field-bot)' }}>
        {play.image ? <img src={play.image} alt={play.name} className="w-full object-contain max-h-72" /> : <DiagramView diagram={play.diagram} />}
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="display text-2xl text-ink">{play.name}</h2>
          <p className="text-xs text-muted">{[play.formation, play.personnel].filter(Boolean).join(' · ')}</p>
        </div>
        <Chip tone={toneFor(play.category)}>{masteryLabel(progress)}</Chip>
      </div>

      <p className="text-center text-sm font-semibold text-ink2 mb-4">
        {focused ? <>What’s your job as <span className="text-brand font-bold">{focused.pos}</span> ({focused.label})?</> : 'What is everyone doing on this play?'}
      </p>

      {!revealed ? (
        <button onClick={() => setRevealed(true)} className="w-full border-2 border-dashed border-brand/40 text-brand label text-sm py-8 rounded-2xl press">
          Tap to reveal the answer
        </button>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {list.length === 0 && <p className="text-sm text-muted text-center py-4">No assignments recorded yet.</p>}
            {list.map((p, i) => (
              <div key={i} className={`rounded-xl p-3 border ${focused ? 'border-brand/40' : 'border-line'}`} style={focused ? { background: 'color-mix(in srgb, var(--c-brand) 8%, var(--c-surface))' } : { background: 'var(--c-surface)' }}>
                <div className="flex items-baseline gap-2 mb-0.5"><span className="font-display text-brand">{p.pos}</span><span className="text-sm text-muted">{p.label}</span></div>
                <p className="text-sm text-ink2">{p.assignment}</p>
              </div>
            ))}
            {play.notes && <div className="rounded-xl p-3 text-sm text-ink2 whitespace-pre-wrap" style={{ background: 'color-mix(in srgb, var(--c-st) 8%, var(--c-surface))', border: '1px solid color-mix(in srgb, var(--c-st) 22%, transparent)' }}>{play.notes}</div>}
          </div>
          <p className="text-center label text-[11px] text-muted mb-2">How well did you know it?</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(g => (
              <button key={g.id} onClick={() => grade(g.id)} style={g.style} className="rounded-xl py-2.5 flex flex-col items-center press">
                <span className="font-display text-sm leading-none">{g.label}</span>
                <span className="text-[10px] opacity-90 num mt-0.5">{preview[g.id]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Study({ plays, profile, singlePlayId, onExit }) {
  const [config, setConfig] = useState(
    singlePlayId ? { scope: 'all', cat: 'all', posFocus: profile?.position || 'all', single: singlePlayId } : null);

  if (!config) return <SessionSetup plays={plays} profile={profile} onStart={setConfig} onExit={onExit} />;
  const sessionPlays = config.single ? plays.filter(p => p.id === config.single) : plays;
  if (config.mode === 'quiz') return <Quiz plays={sessionPlays} config={config} onExit={onExit} />;
  return <Flashcard plays={sessionPlays} config={config} onExit={onExit} />;
}
