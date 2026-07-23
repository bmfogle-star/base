import { useMemo, useState } from 'react';
import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta } from '../lib/playmeta';
import Emoji from '../components/Emoji';

// Pick n random items from arr (excluding `except`), no repeats.
function sample(arr, n, except = []) {
  const pool = arr.filter(x => !except.includes(x));
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a set of multiple-choice questions from the playbook.
function buildQuiz(plays, { cat, posFocus, count = 10 }) {
  let pool = plays.filter(p => cat === 'all' || p.category === cat);
  const allAssignments = plays.flatMap(p => (p.positions || []).map(x => x.assignment)).filter(Boolean);
  const allNames = plays.map(p => p.name).filter(Boolean);
  const questions = [];

  for (const play of shuffle(pool)) {
    const positions = (play.positions || []).filter(x => x.assignment &&
      (!posFocus || posFocus === 'all' || `${x.pos} ${x.label}`.toLowerCase().includes(posFocus.toLowerCase())));

    // Assignment question (needs enough distractors)
    if (positions.length && allAssignments.length >= 4) {
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const distractors = sample(allAssignments, 3, [pos.assignment]);
      if (distractors.length === 3) {
        questions.push({
          play,
          kind: 'assignment',
          prompt: <>On <b>{play.name}</b>, what's the <span className="text-green-700 dark:text-green-400 font-bold">{pos.pos}</span>{pos.label ? ` (${pos.label})` : ''} assignment?</>,
          correct: pos.assignment,
          options: shuffle([pos.assignment, ...distractors]),
        });
      }
    } else if (allNames.length >= 4) {
      // "Which play is this?" from the diagram
      const distractors = sample(allNames, 3, [play.name]);
      if (distractors.length === 3) {
        questions.push({
          play,
          kind: 'name',
          prompt: <>Which play is this?</>,
          correct: play.name,
          options: shuffle([play.name, ...distractors]),
          showDiagram: true,
        });
      }
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
        <div className="text-5xl mb-4"><Emoji e="📝" /></div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-neutral-100">Not enough to quiz yet</h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 mb-6">Add a few more plays with assignments and try again.</p>
        <button onClick={onExit} className="bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl">Back</button>
      </div>
    );
  }

  if (i >= questions.length) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-3"><Emoji e={pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '📚'} /></div>
        <h2 className="text-2xl font-display text-gray-900 dark:text-neutral-100">{score} / {questions.length}</h2>
        <p className="text-gray-500 dark:text-neutral-400 mt-1 mb-6">
          {pct >= 80 ? 'You know your stuff!' : pct >= 50 ? 'Getting there — keep reps up.' : 'Hit the flashcards, then run it back.'}
        </p>
        <button onClick={onExit} className="bg-green-700 text-white font-bold px-6 py-2.5 rounded-xl">Done</button>
      </div>
    );
  }

  const q = questions[i];
  const meta = categoryMeta(q.play.category);

  function pick(opt) {
    if (picked) return;
    setPicked(opt);
    if (opt === q.correct) setScore(s => s + 1);
  }
  function next() {
    setPicked(null);
    setI(n => n + 1);
  }

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onExit} className="text-sm font-semibold text-gray-500 dark:text-neutral-400">Exit</button>
        <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400">Q{i + 1} / {questions.length} · {score} right</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden mb-4">
        <div className="h-full bg-green-600 rounded-full transition-all" style={{ width: `${Math.round((i / questions.length) * 100)}%` }} />
      </div>

      {q.showDiagram && (
        <div className="rounded-2xl overflow-hidden card-elevate mb-3 bg-green-900">
          {q.play.image ? <img src={q.play.image} alt="" className="w-full object-contain max-h-64" />
            : <DiagramView diagram={q.play.diagram} />}
        </div>
      )}

      <div className="mb-4">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${meta.chip}`}>{meta.emoji} {meta.label}</span>
        <p className="text-lg font-bold text-gray-900 dark:text-neutral-100 mt-2">{q.prompt}</p>
      </div>

      <div className="space-y-2">
        {q.options.map((opt, idx) => {
          const isCorrect = opt === q.correct;
          const isPicked = opt === picked;
          let cls = 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 text-gray-800 dark:text-neutral-100';
          if (picked) {
            if (isCorrect) cls = 'bg-green-50 dark:bg-green-950/50 border-green-500 text-green-900 dark:text-green-200';
            else if (isPicked) cls = 'bg-red-50 dark:bg-red-950/50 border-red-400 text-red-900 dark:text-red-200';
            else cls = 'bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-800 text-gray-400 dark:text-neutral-500';
          }
          return (
            <button key={idx} onClick={() => pick(opt)} disabled={!!picked}
              className={`w-full text-left rounded-xl p-3 border text-sm font-medium transition-colors ${cls}`}>
              <span className="inline-flex items-center gap-2">
                {picked && isCorrect && <Emoji e="✅" size="0.95em" />}
                {picked && isPicked && !isCorrect && <Emoji e="❌" size="0.95em" />}
                {opt}
              </span>
            </button>
          );
        })}
      </div>

      {picked && (
        <button onClick={next}
          className="w-full mt-4 bg-green-700 hover:bg-green-800 text-white font-bold py-3 rounded-xl">
          {i + 1 >= questions.length ? 'See results' : 'Next question'}
        </button>
      )}
    </div>
  );
}
