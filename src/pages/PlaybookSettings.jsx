import { useMemo, useRef, useState } from 'react';
import { getProfile, saveProfile, exportData, importData } from '../data/playbook';
import { POSITIONS } from '../lib/playmeta';
import { getTheme, setTheme } from '../lib/theme';
import { getAISettings, saveAISettings, getKnowledge, saveKnowledge, MODELS } from '../lib/aiCoach';
import { Button, Label, Segmented, Icon } from '../components/ui';

function Section({ title, children }) {
  return <section className="card p-4 mb-4">
    <h2 className="font-display text-xl text-ink mb-3">{title}</h2>
    {children}
  </section>;
}
function FieldRow({ label, hint, children }) {
  return <label className="block mb-3">
    <span className="label text-[11px] text-ink2 mb-1.5 block">{label}</span>
    {children}
    {hint && <span className="text-xs text-muted mt-1 block">{hint}</span>}
  </label>;
}

export default function PlaybookSettings({ plays = [], onChanged }) {
  const [profile, setProfile] = useState(() => getProfile());
  const [theme, setThemeState] = useState(() => getTheme());
  const [saved, setSaved] = useState(false);
  const [ai, setAi] = useState(() => getAISettings());
  const [knowledge, setKnowledge] = useState(() => getKnowledge());
  const [aiSaved, setAiSaved] = useState(false);
  const fileRef = useRef(null);
  const set = (patch) => setProfile(p => ({ ...p, ...patch }));

  const playbookPositions = useMemo(() => [...new Set(plays.flatMap(p => (p.positions || []).map(x => x.pos)).filter(Boolean))].sort(), [plays]);
  const isCoach = profile.role === 'coach';

  function persist() { saveProfile(profile); setSaved(true); setTimeout(() => setSaved(false), 1500); onChanged?.(); }
  function toggleTheme(t) { setTheme(t); setThemeState(t); }
  function saveAI() { saveAISettings(ai); saveKnowledge(knowledge); setAiSaved(true); setTimeout(() => setAiSaved(false), 1500); }
  const setPosNote = (pos, text) => setKnowledge(k => ({ ...k, positions: { ...k.positions, [pos]: text } }));

  function doExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `playbook-${new Date().toISOString().slice(0, 10)}.json`; a.click();
    URL.revokeObjectURL(url);
  }
  async function doImport(e) {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      importData(data, { merge: confirm('Merge into your current playbook? (Cancel = replace everything)') });
      onChanged?.(); alert('Playbook imported.');
    } catch (err) { alert('Could not import that file: ' + err.message); }
    e.target.value = '';
  }

  return (
    <div className="pb-4">
      <h1 className="display text-3xl text-ink mb-5">SETTINGS</h1>

      <Section title="Your profile">
        <div className="mb-3">
          <Label className="mb-1.5">I am a…</Label>
          <Segmented value={profile.role || 'player'} onChange={r => set({ role: r })}
            options={[{ value: 'player', label: 'Player' }, { value: 'coach', label: 'Coach' }]} />
        </div>
        <FieldRow label="Name"><input className="input" value={profile.name} onChange={e => set({ name: e.target.value })} placeholder="Your name" /></FieldRow>
        <FieldRow label="Position" hint="Study mode defaults to drilling your position.">
          <select className="input" value={profile.position} onChange={e => set({ position: e.target.value })}>
            <option value="">Select a position</option>
            {POSITIONS.map(g => <optgroup key={g.group} label={g.group}>{g.items.map(pos => <option key={pos} value={pos}>{pos}</option>)}</optgroup>)}
          </select>
        </FieldRow>
        <div className="grid grid-cols-2 gap-3">
          <FieldRow label="Team"><input className="input" value={profile.team} onChange={e => set({ team: e.target.value })} placeholder="Team name" /></FieldRow>
          <FieldRow label="Level"><input className="input" value={profile.level} onChange={e => set({ level: e.target.value })} placeholder="Varsity, JV…" /></FieldRow>
        </div>
        <Button size="sm" className="mt-1" onClick={persist}>{saved ? 'Saved ✓' : 'Save profile'}</Button>
      </Section>

      <Section title="Appearance">
        <Segmented value={theme} onChange={toggleTheme}
          options={[{ value: 'light', label: '☀ Light' }, { value: 'dark', label: '☾ Dark' }]} />
      </Section>

      <Section title="AI Position Coach">
        <p className="text-xs text-muted mb-3">
          {isCoach ? 'Program the AI coach with your team’s philosophy, terminology, and each position’s rules. Players can then ask it about their assignments.'
            : 'Usually set up by a coach. Switch your role to Coach above to configure it.'}
        </p>
        <FieldRow label="Anthropic API key" hint="From console.anthropic.com. Stored only on this device. Fractions of a cent per question.">
          <input className="input" type="password" value={ai.apiKey} onChange={e => setAi(a => ({ ...a, apiKey: e.target.value }))} placeholder="sk-ant-..." autoComplete="off" />
        </FieldRow>
        <FieldRow label="Answer quality">
          <select className="input" value={ai.model} onChange={e => setAi(a => ({ ...a, model: e.target.value }))}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.label} — {m.note}</option>)}
          </select>
        </FieldRow>
        <FieldRow label="Team philosophy"><textarea className="input min-h-[64px] resize-y" value={knowledge.philosophy} onChange={e => setKnowledge(k => ({ ...k, philosophy: e.target.value }))} placeholder="How we play: spread, tempo, run-first, aggressive defense…" /></FieldRow>
        <FieldRow label="Terminology & calls"><textarea className="input min-h-[64px] resize-y" value={knowledge.terminology} onChange={e => setKnowledge(k => ({ ...k, terminology: e.target.value }))} placeholder="Words the AI should know: 'Rip/Liz' = strong-side call, 'Green' = tempo…" /></FieldRow>
        {playbookPositions.length > 0 && (
          <div className="mb-4">
            <Label className="mb-1.5">Notes per position</Label>
            <div className="space-y-2">
              {playbookPositions.map(pos => (
                <div key={pos}>
                  <span className="font-display text-brand text-sm">{pos}</span>
                  <textarea className="input min-h-[44px] resize-y mt-0.5" value={knowledge.positions?.[pos] || ''} onChange={e => setPosNote(pos, e.target.value)} placeholder={`Rules / reads / reminders for ${pos}…`} />
                </div>
              ))}
            </div>
          </div>
        )}
        <Button size="sm" onClick={saveAI}>{aiSaved ? 'Saved ✓' : 'Save AI coach'}</Button>
      </Section>

      <Section title="Backup & share">
        <p className="text-xs text-muted mb-3">Export your whole playbook to a file — back it up, move devices, or send it to a teammate to import.</p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" icon="upload" className="flex-1" onClick={doExport}>Export</Button>
          <Button variant="ghost" size="sm" icon="upload" className="flex-1" onClick={() => fileRef.current?.click()}>Import</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
        </div>
      </Section>

      <p className="text-center text-xs text-muted mt-6">🏈 Playbook — learn your plays. Everything is stored on your device.</p>
    </div>
  );
}
