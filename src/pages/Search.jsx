import { useState, useMemo, useRef, useEffect } from 'react';
import { ArrowLeft, Search as SearchIcon, X, User, Phone, CalendarDays } from 'lucide-react';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

// Search across clients (incl. notes, tags, calls, custom fields) and events.
export default function Search({ clients, events, onSelectClient, onBack }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const query = q.trim().toLowerCase();

  const results = useMemo(() => {
    if (!query) return { clients: [], calls: [], events: [] };

    const clientHits = clients.filter(c =>
      [c.name, c.company, c.email, c.phone, c.position, c.notes, ...(c.tags || []), ...(c.hobbies || []),
        ...Object.values(c.customFields || {})]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(query))
    );

    const callHits = [];
    for (const c of clients) {
      for (const call of c.callHistory || []) {
        if ([call.title, call.summary, call.transcript, call.extracted]
          .filter(Boolean).some(v => String(v).toLowerCase().includes(query))) {
          callHits.push({ client: c, call });
        }
      }
    }

    const eventHits = (events || []).filter(e =>
      [e.title, e.location, e.notes].filter(Boolean).some(v => String(v).toLowerCase().includes(query))
    );

    return { clients: clientHits, calls: callHits.slice(0, 20), events: eventHits.slice(0, 20) };
  }, [query, clients, events]);

  const empty = query && !results.clients.length && !results.calls.length && !results.events.length;

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 -ml-1">
          <ArrowLeft size={20} className="text-gray-600 dark:text-neutral-300" />
        </button>
        <div className="relative flex-1">
          <SearchIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Search clients, calls, notes, events…"
            className="w-full pl-9 pr-9 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
          />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500"><X size={14} /></button>}
        </div>
      </div>

      {!query && <p className="text-sm text-gray-400 dark:text-neutral-500 text-center py-8">Type to search across everything in Spark.</p>}
      {empty && <p className="text-sm text-gray-400 dark:text-neutral-500 text-center py-8">No matches for “{q}”.</p>}

      {results.clients.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide px-1 mb-1.5">Clients</h2>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
            {results.clients.map(c => (
              <button key={c.id} onClick={() => onSelectClient(c.id)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left">
                <div className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{getInitials(c.name)}</div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm truncate">{c.name || 'Unnamed'}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{c.company || c.email || 'No details'}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {results.calls.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide px-1 mb-1.5">Calls</h2>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
            {results.calls.map(({ client, call }) => (
              <button key={call.id} onClick={() => onSelectClient(client.id)} className="w-full flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left">
                <Phone size={15} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm truncate">{call.title || `Call with ${client.name}`}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{client.name} · {new Date(call.date).toLocaleDateString()}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {results.events.length > 0 && (
        <div className="mb-4">
          <h2 className="text-xs font-bold text-gray-500 dark:text-neutral-400 uppercase tracking-wide px-1 mb-1.5">Events</h2>
          <div className="bg-white dark:bg-neutral-900 rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
            {results.events.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
                <CalendarDays size={15} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm truncate">{e.title}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{new Date(e.start).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
