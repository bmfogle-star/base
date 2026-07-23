import { useEffect, useRef, useState } from 'react';
import { askCoach, isCoachConfigured, getKnowledge } from '../lib/aiCoach';
import { getProfile } from '../data/playbook';
import { Button, Label, Pill, Icon } from '../components/ui';

const SUGGESTIONS = [
  "What's my job on our go-to play?",
  'How do I beat man coverage?',
  'What should I look for before the snap?',
  'Explain my assignment like I’m new to it.',
];

export default function CoachAI({ plays, onGoToSettings }) {
  const [profile] = useState(() => getProfile());
  const [position, setPosition] = useState(profile.position || '');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configured = isCoachConfigured();
  const scrollRef = useRef(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [messages, busy]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput(''); setError('');
    const history = messages;
    setMessages(m => [...m, { role: 'user', text: q }, { role: 'assistant', text: '' }]);
    setBusy(true);
    try {
      await askCoach({ question: q, plays, knowledge: getKnowledge(), position, history,
        onDelta: (delta) => setMessages(m => { const c = [...m]; c[c.length - 1] = { role: 'assistant', text: c[c.length - 1].text + delta }; return c; }) });
    } catch (e) {
      setError(e.message || 'Something went wrong. Check the API key in Settings.');
      setMessages(m => m.slice(0, -1));
    } finally { setBusy(false); }
  }

  const positions = [...new Set(plays.flatMap(p => (p.positions || []).map(x => x.pos)).filter(Boolean))].sort();

  if (!configured) {
    return (
      <div className="pb-4">
        <h1 className="display text-3xl text-ink mb-1">ASK COACH</h1>
        <p className="text-sm text-muted mb-6">Ask the AI coach anything about your plays and assignments.</p>
        <div className="card p-6 text-center">
          <div className="text-4xl mb-3">🧑‍🏫</div>
          <h2 className="font-semibold text-ink text-lg">The AI coach isn’t set up yet</h2>
          <p className="text-sm text-muted mt-1 mb-4">A coach needs to turn this on (it takes a minute). Then you can ask questions any time.</p>
          <Button onClick={onGoToSettings}>Set up the AI coach</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100svh - 210px)' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="display text-3xl text-ink">ASK COACH</h1>
        {messages.length > 0 && <button onClick={() => setMessages([])} className="label text-[11px] text-muted press">Clear</button>}
      </div>

      {positions.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto no-scrollbar pb-1 items-center">
          <span className="label text-[10px] text-muted whitespace-nowrap">I play:</span>
          <Pill active={!position} onClick={() => setPosition('')}>Any</Pill>
          {positions.map(p => <Pill key={p} active={position === p} onClick={() => setPosition(p)}>{p}</Pill>)}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="pt-2">
            <Label className="mb-2">Try asking</Label>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} className="text-left card-flat p-3 text-sm text-ink2 press hover:border-line2">{s}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user' ? 'bg-brand text-brandink rounded-br-sm' : 'card-flat text-ink rounded-bl-sm'}`}>
              {m.text || (busy && i === messages.length - 1 ? <span className="text-muted">Coach is thinking…</span> : m.text)}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-def mb-2">{error}</p>}

      <div className="flex gap-2 sticky bottom-0 pb-1">
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask about a play or your assignment…" className="input" />
        <Button onClick={() => send()} disabled={busy || !input.trim()} className="px-4"><Icon name="upload" size={18} /></Button>
      </div>
    </div>
  );
}
