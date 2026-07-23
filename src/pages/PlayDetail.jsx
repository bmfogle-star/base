import { DiagramView } from '../components/FieldDiagram';
import { categoryMeta } from '../lib/playmeta';
import { getPlayProgress } from '../data/playbook';
import { masteryLabel, masteryScore } from '../lib/srs';
import { Button, Chip, Label, Ring, Icon } from '../components/ui';

const toneFor = (c) => (c === 'defense' ? 'def' : c === 'special' ? 'st' : 'brand');

export default function PlayDetail({ play, onBack, onEdit, onStudy, onToggleStar }) {
  const meta = categoryMeta(play.category);
  const progress = getPlayProgress(play.id);
  const score = masteryScore(progress);
  const pct = Math.round(score * 100);

  return (
    <div className="pb-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1 text-muted label text-[11px] press">
          <Icon name="back" size={16} /> Playbook
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => onToggleStar(play)} aria-label="Star" className="press">
            <Icon name="star" size={22} fill={!!play.starred} className={play.starred ? 'text-yard' : 'text-muted'} />
          </button>
          <button onClick={() => onEdit(play.id)} className="flex items-center gap-1.5 text-brand label text-[11px] press">
            <Icon name="edit" size={16} /> Edit
          </button>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] overflow-hidden mb-4 border border-line" style={{ backgroundColor: 'var(--field-bot)' }}>
        {play.image
          ? <img src={play.image} alt={play.name} className="w-full object-contain" />
          : <DiagramView diagram={play.diagram} />}
      </div>

      <div className="flex items-start justify-between gap-3 mb-1">
        <h1 className="display text-3xl text-ink">{play.name}</h1>
        <Chip tone={toneFor(play.category)} className="mt-1">{meta.emoji} {meta.label}</Chip>
      </div>
      <p className="text-sm text-muted mb-3">{[play.formation, play.personnel].filter(Boolean).join(' · ')}</p>

      {play.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {play.tags.map((t, i) => <Chip key={i}>{t}</Chip>)}
        </div>
      )}

      {/* Mastery */}
      <div className="card p-4 mb-4 flex items-center gap-4">
        <Ring value={score} size={64} stroke={7}>
          <div className="font-display num text-lg text-ink leading-none">{pct}<span className="text-[10px]">%</span></div>
        </Ring>
        <div className="flex-1">
          <Label className="mb-0.5">Your mastery</Label>
          <div className="font-display text-xl text-brand leading-none mb-2">{masteryLabel(progress)}</div>
          <Button size="sm" icon="study" onClick={() => onStudy(play.id)}>Study this play</Button>
        </div>
      </div>

      {play.positions?.length > 0 && (
        <div className="mb-4">
          <Label className="mb-2">Assignments</Label>
          <div className="space-y-2">
            {play.positions.map((p, i) => (
              <div key={i} className="card-flat p-3">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-display text-brand">{p.pos}</span>
                  <span className="text-sm text-muted">{p.label}</span>
                </div>
                <p className="text-sm text-ink2">{p.assignment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {play.notes && (
        <div className="rounded-2xl p-3 border" style={{ background: 'color-mix(in srgb, var(--c-st) 8%, var(--c-surface))', borderColor: 'color-mix(in srgb, var(--c-st) 22%, transparent)' }}>
          <Label className="text-st mb-1">Coaching notes</Label>
          <p className="text-sm text-ink2 whitespace-pre-wrap">{play.notes}</p>
        </div>
      )}
    </div>
  );
}
