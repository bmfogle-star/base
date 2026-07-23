import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta } from '../lib/playmeta';
import { getPlayProgress } from '../data/playbook';
import { masteryLabel, masteryScore } from '../lib/srs';
import Emoji from '../components/Emoji';

export default function PlayDetail({ play, onBack, onEdit, onStudy, onToggleStar }) {
  const meta = categoryMeta(play.category);
  const progress = getPlayProgress(play.id);
  const score = masteryScore(progress);

  return (
    <div className="pb-8">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm font-semibold text-gray-500 dark:text-neutral-400 flex items-center gap-1">
          <Emoji e="⬅️" size="0.85em" /> Playbook
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => onToggleStar(play)} title="Star" className="text-lg">
            <Emoji e="⭐" style={{ opacity: play.starred ? 1 : 0.3 }} />
          </button>
          <button onClick={() => onEdit(play.id)} className="text-sm font-bold text-green-700 dark:text-green-400">Edit</button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden card-elevate mb-4 bg-green-900">
        {play.image
          ? <img src={play.image} alt={play.name} className="w-full object-contain" />
          : <DiagramView diagram={play.diagram} />}
      </div>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100">{play.name}</h1>
        <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${meta.chip}`}>{meta.emoji} {meta.label}</span>
      </div>
      <p className="text-sm text-gray-500 dark:text-neutral-400 mb-3">
        {[play.formation, play.personnel].filter(Boolean).join(' · ')}
      </p>

      {(play.tags?.length > 0) && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {play.tags.map((t, i) => (
            <span key={i} className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300">{t}</span>
          ))}
        </div>
      )}

      {/* Mastery */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-4 card-elevate border border-gray-100 dark:border-neutral-800 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200">Your mastery</span>
          <span className="text-sm font-bold text-green-700 dark:text-green-400">{masteryLabel(progress)}</span>
        </div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-neutral-800 overflow-hidden">
          <div className="h-full bg-green-600 dark:bg-green-500 rounded-full" style={{ width: `${Math.max(4, Math.round(score * 100))}%` }} />
        </div>
        <button onClick={() => onStudy(play.id)}
          className="w-full mt-3 bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-xl">
          🧠 Study this play
        </button>
      </div>

      {/* Assignments */}
      {play.positions?.length > 0 && (
        <div className="mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500 dark:text-neutral-400 mb-2">Assignments</h2>
          <div className="space-y-2">
            {play.positions.map((p, i) => (
              <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl p-3 border border-gray-100 dark:border-neutral-800">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-bold text-green-700 dark:text-green-400">{p.pos}</span>
                  <span className="text-sm text-gray-500 dark:text-neutral-400">{p.label}</span>
                </div>
                <p className="text-sm text-gray-800 dark:text-neutral-200">{p.assignment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {play.notes && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-xl p-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 mb-1">Coaching notes</h2>
          <p className="text-sm text-gray-800 dark:text-neutral-200 whitespace-pre-wrap">{play.notes}</p>
        </div>
      )}
    </div>
  );
}
