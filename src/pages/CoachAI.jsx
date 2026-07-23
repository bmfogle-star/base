import { useEffect, useRef, useState } from 'react';
import { askCoach, isCoachConfigured, getKnowledge } from '../lib/aiCoach';
import { getProfile } from '../data/playbook';
import Emoji from '../components/Emoji';

const SUGGESTIONS = [
  "What's my job on our go-to play?",
  'How do I beat man coverage?',
  'What should I look for before the snap?',
  'Explain my assignment like I’m new to it.',
];

export default function CoachAI({ plays, onGoToSettings }) {
  const [profile] = useState(() => getProfile());
  const [position, setPosition] = useState(profile.position || '');
  const [messages, setMessages] = useState([]); // {role, text}
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const configured = isCoachConfigured();
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send(text) {
    const q = (text ?? input).trim();
    if (!q || busy) return;
    setInput('');
    setError('');
    const history = messages;
    setMessages(m => [...m, { role: 'user', text: q }, { role: 'assistant', text: '' }]);
    setBusy(true);
    try {
      await askCoach({
        question: q,
        plays,
        knowledge: getKnowledge(),
        position,
        history,
        onDelta: (delta) => {
          setMessages(m => {
            const copy = [...m];
            copy[copy.length - 1] = { role: 'assistant', text: copy[copy.length - 1].text + delta };
            return copy;
          });
        },
      });
    } catch (e) {
      setError(e.message || 'Something went wrong. Check the API key in Settings.');
      setMessages(m => m.slice(0, -1)); // drop the empty assistant bubble
    } finally {
      setBusy(false);
    }
  }

  const positions = [...new Set(plays.flatMap(p => (p.positions || []).map(x => x.pos)).filter(Boolean))].sort();

  if (!configured) {
    return (
      <div className="pb-8">
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100 mb-1">💬 Ask Coach</h1>
        <p className="text-sm text-gray-500 dark:text-neutral-400 mb-6">Ask the AI coach anything about your plays and assignments.</p>
        <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 card-elevate border border-gray-100 dark:border-neutral-800 text-center">
          <div className="text-4xl mb-3"><Emoji e="🧑‍🏫" /></div>
          <h2 className="font-bold text-gray-900 dark:text-neutral-100">The AI coach isn’t set up yet</h2>
          <p className="text-sm text-gray-500 dark:text-neutral-400 mt-1 mb-4">
            A coach needs to turn this on (it takes a minute). Once it’s on, you can ask questions any time.
          </p>
          <button onClick={onGoToSettings} className="bg-green-700 hover:bg-green-800 text-white font-semibold px-4 py-2.5 rounded-xl">
            Set up the AI coach
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 'calc(100svh - 200px)' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-2xl font-display text-gray-900 dark:text-neutral-100">💬 Ask Coach</h1>
        {messages.length > 0 && (
          <button onClick={() => setMessages([])} className="text-xs font-semibold text-gray-500 dark:text-neutral-400">Clear</button>
        )}
      </div>

      {positions.length > 0 && (
        <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-gray-500 dark:text-neutral-400 self-center whitespace-nowrap">I play:</span>
          <button onClick={() => setPosition('')}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${!position ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>Any</button>
          {positions.map(p => (
            <button key={p} onClick={() => setPosition(p)}
              className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap border ${position === p ? 'bg-green-700 text-white border-green-700' : 'bg-white dark:bg-neutral-900 text-gray-600 dark:text-neutral-300 border-gray-200 dark:border-neutral-700'}`}>{p}</button>
          ))}
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-3 mb-3">
        {messages.length === 0 && (
          <div className="pt-2">
            <p className="text-sm text-gray-500 dark:text-neutral-400 mb-2">Try asking:</p>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)}
                  className="text-left bg-white dark:bg-neutral-900 rounded-xl p-3 card-elevate border border-gray-100 dark:border-neutral-800 text-sm text-gray-800 dark:text-neutral-200 hover:border-green-300 dark:hover:border-green-800">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'bg-green-700 text-white rounded-br-sm'
                : 'bg-white dark:bg-neutral-900 text-gray-800 dark:text-neutral-100 border border-gray-100 dark:border-neutral-800 rounded-bl-sm card-elevate'}`}>
              {m.text || (busy && i === messages.length - 1 ? <span className="text-gray-400">Coach is thinking…</span> : m.text)}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400 mb-2">{error}</p>}

      <div className="flex gap-2 sticky bottom-0 pb-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') send(); }}
          placeholder="Ask about a play or your assignment…"
          className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-900 dark:text-neutral-100 outline-none focus:border-green-500" />
        <button onClick={() => send()} disabled={busy || !input.trim()}
          className="bg-green-700 hover:bg-green-800 disabled:opacity-40 text-white font-bold px-5 rounded-xl">
          <Emoji e="⬆️" size="1em" />
        </button>
      </div>
    </div>
  );
}
