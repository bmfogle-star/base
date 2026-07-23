import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta } from '../lib/playmeta';
import { Button, Chip } from '../components/ui';

const toneFor = (c) => (c === 'defense' ? 'def' : c === 'special' ? 'st' : 'brand');

function sample(arr, n, except = []) {
  const pool = arr.filter(x => !except.includes(x));
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function buildQuiz(plays, { cat, posFocus, count = 10 }) {
  const pool = plays.filter(p => cat === 'all' || p.category === cat);
  const allAssignments = plays.flatMap(p => (p.positions || []).map(x => x.assignment)).filter(Boolean);
  const allNames = plays.map(p => p.name).filter(Boolean);
  const questions = [];
  for (const play of shuffle(pool)) {
    const positions = (play.positions || []).filter(x => x.assignment &&
      (!posFocus || posFocus === 'all' || `${x.pos} ${x.label}`.toLowerCase().includes(posFocus.toLowerCase())));
    if (positions.length && allAssignments.length >= 4) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const distractors = sample(allAssignments, 3, [pos.assignment]);
      if (distractors.length === 3) questions.push({
        play, prompt: <>On <b>{play.name}</b>, what’s the <span className="text-brand font-bold">{pos.pos}</span>{pos.label ? ` (${pos.label})` : ''} assignment?</>,
        correct: pos.assignment, options: shuffle([pos.assignment, ...distractors]),
      });
    } else if (allNames.length >= 4) {
      const distractors = sample(allNames, 3, [play.name]);
      if (distractors.length === 3) questions.push({
        play, prompt: <>Which play is this?</>, correct: play.name, options: shuffle([play.name, ...distractors]), showDiagram: true,
      });
    }
    if (questions.length >= count) break;
  }
  return questions;
}

export default function Quiz({ plays, config, onExit }) {
  const questions = useMemo(() => buildQuiz(plays, config), [plays, config]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  if (questions.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">📝</div>
        <h2 className="display text-2xl text-ink">Not enough to quiz yet</h2>
        <p className="text-muted mt-1 mb-6">Add a few more plays with assignments and try again.</p>
        <Button onClick={onExit}>Back</Button>
      </div>
    );
  }
  if (i >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3">{pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'}</div>
        <h2 className="display num text-5xl text-ink">{score}<span className="text-muted">/{questions.length}</span></h2>
        <p className="text-muted mt-2 mb-6">{pct >= 80 ? 'You know your stuff.' : pct >= 50 ? 'Getting there — keep reps up.' : 'Hit the flashcards, then run it back.'}</p>
        <Button onClick={onExit}>Done</Button>
      </div>
    );
  }

  const q = questions[i];
  function pick(opt) { if (picked) return; setPicked(opt); if (opt === q.correct) setScore(s => s + 1); }
  function next() { setPicked(null); setI(n => n + 1); }

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="label text-[11px] text-muted press">Exit</button>
        <span className="label text-[11px] text-muted num">Q{i + 1} / {questions.length} · {score} right</span>
      </div>
      <div className="h-1.5 rounded-full bg-ink/8 overflow-hidden mb-4">
        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.round((i / questions.length) * 100)}%` }} />
      </div>

      {q.showDiagram && (
        <div className="rounded-[var(--radius-card)] overflow-hidden mb-3 border border-line" style={{ backgroundColor: 'var(--field-bot)' }}>
          {q.play.image ? <img src={q.play.image} alt="" className="w-full object-contain max-h-64" /> : <DiagramView diagram={q.play.diagram} />}
        </div>
      )}

      <div className="mb-4">
        <Chip tone={toneFor(q.play.category)}>{categoryMeta(q.play.category).emoji} {categoryMeta(q.play.category).label}</Chip>
        <p className="text-lg font-semibold text-ink mt-2">{q.prompt}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = opt === q.correct, isPicked = opt === picked;
          let cls = 'card-flat text-ink2', extra = null;
          if (picked) {
            if (isCorrect) { cls = 'text-ink'; extra = { background: 'color-mix(in srgb, var(--c-brand) 12%, var(--c-surface))', borderColor: 'var(--c-brand)' }; }
            else if (isPicked) { cls = 'text-ink'; extra = { background: 'color-mix(in srgb, var(--c-def) 12%, var(--c-surface))', borderColor: 'var(--c-def)' }; }
            else cls = 'card-flat text-muted opacity-70';
          }
          return (
            <button key={idx} onClick={() => pick(opt)} disabled={!!picked} style={extra || undefined}
              className={`w-full text-left rounded-xl p-3 border text-sm font-medium transition-colors press ${cls}`}>
              {picked && isCorrect && '✅ '}{picked && isPicked && !isCorrect && '❌ '}{opt}
            </button>
          );
        })}
      </div>

      {picked && <Button className="w-full mt-4" onClick={next}>{i + 1 >= questions.length ? 'See results' : 'Next question'}</Button>}
    </div>
  );
}
