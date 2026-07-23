import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta, CATEGORY_ORDER } from '../lib/playmeta';
import { getPlayProgress, setPlayProgress } from '../data/playbook';
import { schedule, isDue, gradePreview, masteryLabel } from '../lib/srs';
import Emoji from '../components/Emoji';

const GRADES = [
  { id: 'again', label: 'Again', sub: "Didn't know it", cls: 'bg-red-600 hover:bg-red-700' },
  { id: 'hard', label: 'Hard', sub: 'Barely', cls: 'bg-amber-500 hover:bg-amber-600' },
  { id: 'good', label: 'Good', sub: 'Got it', cls: 'bg-green-600 hover:bg-green-700' },
  { id: 'easy', label: 'Easy', sub: 'Too easy', cls: 'bg-emerald-500 hover:bg-emerald-600' },
];

// Pull the assignment(s) to quiz for a play, given a position focus.
function answerFor(play, posFocus) {
  if (posFocus && posFocus !== 'all') {
    const match = (play.positions || []).find(p =>
      `${p.pos} ${p.label}`.toLowerCase().includes(posFocus.toLowerCase()));
    if (match) return { focused: match, list: [match] };
  }
  return { focused: null, list: play.positions || [] };
}

function SessionSetup({ plays, profile, onStart, onExit }) {
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
    <div className="pb-8">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100">🧠 Study</h1>
        <button onClick={onExit} className="text-sm font-semibold text-gray-500 dark:text-neutral-400">Close</button>
      </div>

      <p className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">What to study</p>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button onClick={() => setScope('due')}
          className={`p-3 rounded-xl border text-left ${scope === 'due' ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700'}`}>
          <div className="font-bold">Due for review</div>
          <div className={`text-xs ${scope === 'due' ? 'text-green-100' : 'text-gray-500 dark:text-neutral-400'}`}>{dueCount} play{dueCount !== 1 ? 's' : ''} ready</div>
        </button>
        <button onClick={() => setScope('all')}
          className={`p-3 rounded-xl border text-left ${scope === 'all' ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700'}`}>
          <div className="font-bold">Everything</div>
          <div className={`text-xs ${scope === 'all' ? 'text-green-100' : 'text-gray-500 dark:text-neutral-400'}`}>{plays.length} plays</div>
        </button>
      </div>

      <p className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Side of the ball</p>
      <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
        {['all', ...CATEGORY_ORDER].map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${cat === c ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>
            {c === 'all' ? '📋 All' : `${categoryMeta(c).emoji} ${categoryMeta(c).label.split(' ')[0]}`}
          </button>
        ))}
      </div>

      {positions.length > 0 && (
        <>
          <p className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-2">Drill a position <span className="font-normal text-gray-400">(optional)</span></p>
          <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
            <button onClick={() => setPosFocus('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${posFocus === 'all' ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>All assignments</button>
            {positions.map(p => (
              <button key={p} onClick={() => setPosFocus(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border ${posFocus === p ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>{p}</button>
            ))}
          </div>
        </>
      )}

      <button onClick={() => onStart({ scope, cat, posFocus })}
        className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3.5 rounded-xl">Start studying</button>
    </div>
  );
}

function Flashcard({ plays, config, onDone, onExit }) {
  const [queue, setQueue] = useState(() => {
    let list = plays.filter(p => {
      if (config.cat !== 'all' && p.category !== config.cat) return false;
      if (config.scope === 'due' && !isDue(getPlayProgress(p.id))) return false;
      if (config.posFocus && config.posFocus !== 'all') {
        // Only quiz plays that actually have that position.
        return (p.positions || []).some(x => `${x.pos} ${x.label}`.toLowerCase().includes(config.posFocus.toLowerCase()));
      }
      return true;
    }).map(p => p.id);
    return list;
  });
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(0);
  const [total] = useState(() => queue.length);

  if (queue.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4"><Emoji e="🎉" /></div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">
          {total === 0 ? 'Nothing to study here' : 'Session complete!'}
        </h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 mb-6">
          {total === 0 ? 'Try a different scope or add more plays.' : `You reviewed ${done} card${done !== 1 ? 's' : ''}. Nice work.`}
        </p>
        <button onClick={onExit} className="bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl">Done</button>
      </div>
    );
  }

  const play = plays.find(p => p.id === queue[0]);
  if (!play) return null; // ids come from a stable list, so this shouldn't happen

  const progress = getPlayProgress(play.id);
  const preview = gradePreview(progress);
  const { focused, list } = answerFor(play, config.posFocus);
  const meta = categoryMeta(play.category);

  function grade(g) {
    const next = schedule(progress, g);
    setPlayProgress(play.id, next);
    setDone(d => d + 1);
    setRevealed(false);
    setQueue(q => {
      const [cur, ...rest] = q;
      // "Again" → resurface later this session (a few cards on).
      if (g === 'again') {
        const at = Math.min(3, rest.length);
        return [...rest.slice(0, at), cur, ...rest.slice(at)];
      }
      return rest;
    });
    onDone?.();
  }

  return (
    <div className="pb-8">
      {/* Header + progress */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="text-sm font-semibold text-gray-500 dark:text-neutral-400">Exit</button>
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400">{done + 1} / {total}{done >= total ? '+' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden mb-4">
        <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${Math.round((done / Math.max(total, 1)) * 100)}%` }} />
      </div>

      {/* Front — the play */}
      <div className="rounded-2xl overflow-hidden card-elevate mb-3 bg-green-900">
        {play.image
          ? <img src={play.image} alt={play.name} className="w-full object-contain max-h-72" />
          : <DiagramView diagram={play.diagram} />}
      </div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">{play.name}</h2>
          <p className="text-xs text-gray-500 dark:text-neutral-400">{[play.formation, play.personnel].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${meta.chip}`}>{meta.emoji} {masteryLabel(progress)}</span>
      </div>

      {/* Question */}
      <div className="text-center mb-4">
        <p className="text-sm font-semibold text-gray-600 dark:text-neutral-300">
          {focused
            ? <>What's your job as <span className="text-green-700 dark:text-green-400 font-bold">{focused.pos}</span> ({focused.label})?</>
            : 'What is everyone doing on this play?'}
        </p>
      </div>

      {!revealed ? (
        <button onClick={() => setRevealed(true)}
          className="w-full border-2 border-dashed border-green-300 dark:border-green-800 text-green-700 dark:text-green-400 font-bold py-8 rounded-2xl">
          Tap to reveal the answer
        </button>
      ) : (
        <>
          <div className="space-y-2 mb-5">
            {list.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">No assignments recorded for this play yet.</p>
            )}
            {list.map((p, i) => (
              <div key={i} className={`rounded-xl p-3 border ${focused ? 'bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-900' : 'bg-white dark:bg-neutral-900 border-gray-100 dark:border-neutral-800'}`}>
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-green-700 dark:text-green-400">{p.pos}</span>
                  <span className="text-sm text-gray-500 dark:text-neutral-400">{p.label}</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-neutral-200">{p.assignment}</p>
              </div>
            ))}
            {play.notes && (
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3">
                <p className="text-sm text-gray-800 dark:text-neutral-200 whitespace-pre-wrap">{play.notes}</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs font-semibold text-gray-500 dark:text-neutral-400 mb-2">How well did you know it?</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map(g => (
              <button key={g.id} onClick={() => grade(g.id)}
                className={`${g.cls} text-white rounded-xl py-2.5 flex flex-col items-center`}>
                <span className="font-bold text-sm">{g.label}</span>
                <span className="text-[10px] opacity-90">{preview[g.id]}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Study({ plays, profile, singlePlayId, onExit }) {
  // Single-play study skips the setup screen.
  const [config, setConfig] = useState(
    singlePlayId ? { scope: 'all', cat: 'all', posFocus: profile?.position || 'all', single: singlePlayId } : null);

  if (!config) {
    return <SessionSetup plays={plays} profile={profile} onStart={setConfig} onExit={onExit} />;
  }

  const sessionPlays = config.single ? plays.filter(p => p.id === config.single) : plays;
  return <Flashcard plays={sessionPlays} config={config} onExit={onExit} />;
}
