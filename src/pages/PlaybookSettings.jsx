import { useRef, useState } from 'react';
import { getProfile, saveProfile, exportData, importData } from '../data/playbook';
import { POSITIONS } from '../lib/playmeta';
import { getTheme, setTheme } from '../lib/theme';
import Emoji from '../components/Emoji';

const inputCls = 'w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:border-green-500';

export default function PlaybookSettings({ onChanged }) {
  const [profile, setProfile] = useState(() => getProfile());
  const [theme, setThemeState] = useState(() => getTheme());
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const set = (patch) => setProfile(p => ({ ...p, ...patch }));

  function persist() {
    saveProfile(profile);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
    onChanged?.();
  }

  function toggleTheme(t) {
    setTheme(t);
    setThemeState(t);
  }

  function doExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `playbook-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function doImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const merge = confirm('Merge into your current playbook? (Cancel = replace everything)');
      importData(data, { merge });
      onChanged?.();
      alert('Playbook imported.');
    } catch (err) {
      alert('Could not import that file: ' + err.message);
    }
    e.target.value = '';
  }

  return (
    <div className="pb-8">
      <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100 mb-5">Settings</h1>

      {/* Player profile */}
      <section className="bg-white dark:bg-neutral-900 rounded-2xl p-4 card-elevate border border-gray-100 dark:border-neutral-800 mb-4">
        <h2 className="font-bold text-gray-900 dark:text-neutral-100 mb-3">👤 Your profile</h2>
        <label className="block mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-1 block">Name</span>
          <input className={inputCls} value={profile.name} onChange={e => set({ name: e.target.value })} placeholder="Your name" />
        </label>
        <label className="block mb-3">
          <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-1 block">Position</span>
          <select className={inputCls} value={profile.position} onChange={e => set({ position: e.target.value })}>
            <option value="">Select a position</option>
            {POSITIONS.map(g => (
              <optgroup key={g.group} label={g.group}>
                {g.items.map(pos => <option key={pos} value={pos}>{pos}</option>)}
              </optgroup>
            ))}
          </select>
          <span className="text-xs text-gray-400 dark:text-neutral-500 mt-1 block">Study mode defaults to drilling your position.</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-1 block">Team</span>
            <input className={inputCls} value={profile.team} onChange={e => set({ team: e.target.value })} placeholder="Team name" />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-neutral-200 mb-1 block">Level</span>
            <input className={inputCls} value={profile.level} onChange={e => set({ level: e.target.value })} placeholder="Varsity, JV…" />
          </label>
        </div>
        <button onClick={persist} className="mt-3 bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2 rounded-xl text-sm">
          {saved ? '✓ Saved' : 'Save profile'}
        </button>
      </section>

      {/* Appearance */}
      <section className="bg-white dark:bg-neutral-900 rounded-2xl p-4 card-elevate border border-gray-100 dark:border-neutral-800 mb-4">
        <h2 className="font-bold text-gray-900 dark:text-neutral-100 mb-3">🎨 Appearance</h2>
        <div className="flex gap-2">
          {[['light', '☀️ Light'], ['dark', '🌙 Dark']].map(([t, label]) => (
            <button key={t} onClick={() => toggleTheme(t)}
              className={`flex-1 py-2.5 rounded-xl font-semibold border ${theme === t ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {/* Backup / share */}
      <section className="bg-white dark:bg-neutral-900 rounded-2xl p-4 card-elevate border border-gray-100 dark:border-neutral-800 mb-4">
        <h2 className="font-bold text-gray-900 dark:text-neutral-100 mb-1">💾 Backup & share</h2>
        <p className="text-xs text-gray-500 dark:text-neutral-400 mb-3">Export your whole playbook to a file — back it up, move devices, or send it to a teammate to import.</p>
        <div className="flex gap-2">
          <button onClick={doExport} className="flex-1 bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 font-semibold py-2.5 rounded-xl text-sm">⬇️ Export</button>
          <button onClick={() => fileRef.current?.click()} className="flex-1 bg-gray-100 dark:bg-neutral-800 text-gray-800 dark:text-neutral-200 font-semibold py-2.5 rounded-xl text-sm">⬆️ Import</button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={doImport} />
        </div>
      </section>

      <p className="text-center text-xs text-gray-400 dark:text-neutral-500 mt-6">
        <Emoji e="🏈" /> Playbook — learn your plays. Everything is stored on your device.
      </p>
    </div>
  );
}
