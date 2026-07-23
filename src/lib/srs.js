// A lightweight spaced-repetition scheduler (SM-2 flavored) for learning plays.
// Each play carries: reps, interval (days), ease, due (ISO), lapses, lastGrade.
// Grades: 'again' | 'hard' | 'good' | 'easy'.

const DAY = 86400000;
const MIN_EASE = 1.3;

export function freshState() {
  return { reps: 0, interval: 0, ease: 2.5, due: new Date().toISOString(), lapses: 0, lastGrade: null };
}

// Return the next state after grading a card `now` (Date). Pure — no storage.
export function schedule(state, grade, now = new Date()) {
  const s = state ? { ...state } : freshState();
  const t = now.getTime();

  if (grade === 'again') {
    s.reps = 0;
    s.interval = 0;
    s.lapses = (s.lapses || 0) + 1;
    s.ease = Math.max(MIN_EASE, s.ease - 0.2);
    // Comes back in ~10 minutes — resurfaces within the same session.
    s.due = new Date(t + 10 * 60000).toISOString();
  } else {
    if (grade === 'hard') {
      s.interval = s.reps === 0 ? 1 : Math.max(1, Math.round(s.interval * 1.2));
      s.ease = Math.max(MIN_EASE, s.ease - 0.15);
    } else if (grade === 'easy') {
      s.interval = s.reps === 0 ? 3 : Math.round(s.interval * s.ease * 1.3);
      s.ease = s.ease + 0.15;
    } else { // good
      s.interval = s.reps === 0 ? 1 : s.reps === 1 ? 3 : Math.round(s.interval * s.ease);
    }
    s.reps = (s.reps || 0) + 1;
    s.due = new Date(t + s.interval * DAY).toISOString();
  }
  s.lastGrade = grade;
  s.lastReviewed = now.toISOString();
  return s;
}

// Is this play due for review now?
export function isDue(state, now = new Date()) {
  if (!state || !state.due) return true; // never studied → due
  return new Date(state.due).getTime() <= now.getTime();
}

// A human label for how well a play is known.
export function masteryLabel(state) {
  if (!state || !state.reps) return 'New';
  if (state.interval >= 21) return 'Mastered';
  if (state.interval >= 4) return 'Learning';
  return 'Seen';
}

// 0..1 confidence used for progress bars.
export function masteryScore(state) {
  if (!state || !state.reps) return 0;
  return Math.min(1, state.interval / 21);
}

// Preview of the interval each grade would produce, for the study buttons.
export function gradePreview(state) {
  const fmt = (s) => {
    if (s.interval === 0) return '10m';
    if (s.interval < 1) return '<1d';
    if (s.interval < 30) return `${s.interval}d`;
    const m = Math.round(s.interval / 30);
    return `${m}mo`;
  };
  return {
    again: fmt(schedule(state, 'again')),
    hard: fmt(schedule(state, 'hard')),
    good: fmt(schedule(state, 'good')),
    easy: fmt(schedule(state, 'easy')),
  };
}
