import { Users, Phone, Star, ChevronRight, Plus, BellRing, Check, X, CalendarDays, Clock, Cake, Pin } from '../components/icons';
import { getBranding } from '../lib/api';

export default function Dashboard({ clients, reminders = [], events = [], onNav, onSelectClient, onAdd, onCompleteReminder, onDismissReminder }) {
  // Pending follow-ups due now or soon (next 2 days), oldest first.
  const soon = Date.now() + 2 * 86400000;
  const dueFollowups = reminders
    .filter(r => r.status === 'pending' && new Date(r.dueDate).getTime() <= soon)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  // Today's schedule.
  const now = new Date();
  const isToday = (d) => { const x = new Date(d); return x.getFullYear() === now.getFullYear() && x.getMonth() === now.getMonth() && x.getDate() === now.getDate(); };
  const todaysEvents = events.filter(e => isToday(e.start)).sort((a, b) => new Date(a.start) - new Date(b.start));
  const dueToday = dueFollowups.filter(r => new Date(r.dueDate).getTime() <= Date.now() + 86400000).length;

  const briefingParts = [];
  if (todaysEvents.length) briefingParts.push(`${todaysEvents.length} event${todaysEvents.length > 1 ? 's' : ''}`);
  if (dueToday) briefingParts.push(`${dueToday} follow-up${dueToday > 1 ? 's' : ''} due`);
  const briefing = briefingParts.length
    ? `Today you have ${briefingParts.join(' and ')}.`
    : 'Nothing scheduled today — a good time to reach out to a client.';

  // Upcoming birthdays + client key dates within the next 30 days.
  function daysUntilNextBirthday(birthday) {
    if (!birthday) return null;
    const b = new Date(birthday);
    if (isNaN(b)) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const next = new Date(today.getFullYear(), b.getMonth(), b.getDate());
    if (next < today) next.setFullYear(today.getFullYear() + 1);
    return Math.round((next - today) / 86400000);
  }
  const keyDates = [];
  for (const c of clients) {
    const d = daysUntilNextBirthday(c.birthday);
    if (d !== null && d <= 30) keyDates.push({ id: c.id, clientId: c.id, label: `${c.name || 'Client'}'s birthday`, days: d, kind: 'birthday' });
    for (const ev of c.upcomingEvents || []) {
      if (!ev.date) continue;
      const diff = Math.round((new Date(new Date(ev.date).setHours(0, 0, 0, 0)) - new Date(new Date().setHours(0, 0, 0, 0))) / 86400000);
      if (diff >= 0 && diff <= 30) keyDates.push({ id: `${c.id}-${ev.id || ev.title}`, clientId: c.id, label: `${c.name || 'Client'}: ${ev.title}`, days: diff, kind: 'event' });
    }
  }
  keyDates.sort((a, b) => a.days - b.days);
  function inDays(d) { return d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `in ${d}d`; }

  function dueLabel(iso) {
    const d = new Date(iso);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const diff = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / 86400000);
    if (diff < 0) return `${-diff}d overdue`;
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `In ${diff}d`;
  }
  const recentClients = [...clients]
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
    .slice(0, 5);

  const totalCalls = clients.reduce((sum, c) => sum + (c.callHistory?.length || 0), 0);
  const starred = clients.filter(c => c.starred).length;

  function getInitials(name) {
    return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
  }

  function getAvatarColor(name) {
    const colors = ['bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    const idx = name ? name.charCodeAt(0) % colors.length : 0;
    return colors[idx];
  }

  const greeting = (() => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  })();
  const dateStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const brandName = getBranding().companyName || 'Spark';

  return (
    <div className="pb-20 md:pb-6">
      {/* Hero membership card */}
      <div className="relative overflow-hidden rounded-3xl mb-5 text-white card-elevate bg-gradient-to-br from-green-950 via-green-800 to-green-700">
        <div className="absolute inset-0 card-pattern pointer-events-none" />
        <div className="absolute -top-1 left-0 right-0 h-1 bg-gold/80" />
        <div className="relative p-5">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg tracking-tight">{brandName}</span>
            {/* card chip */}
            <div className="w-9 h-7 rounded-md bg-gradient-to-br from-yellow-200 via-amber-300 to-yellow-600 shadow-inner" />
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold mt-6">{dateStr}</p>
          <h1 className="text-2xl text-white mt-1">{greeting}.</h1>

          <div className="grid grid-cols-3 gap-2 mt-5">
            <div>
              <p className="text-2xl font-display leading-none">{clients.length}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-green-100/70 mt-1">Clients</p>
            </div>
            <div>
              <p className="text-2xl font-display leading-none">{totalCalls}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-green-100/70 mt-1">Calls</p>
            </div>
            <div>
              <p className="text-2xl font-display leading-none">{starred}</p>
              <p className="text-[10px] uppercase tracking-[0.15em] text-green-100/70 mt-1">Favorites</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add client */}
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 bg-green-800 text-white py-4 rounded-2xl text-sm font-bold tracking-tight hover:bg-green-900 transition-colors mb-6 card-elevate"
      >
        <Plus size={18} />
        Add Client
      </button>

      {/* Daily briefing + today's schedule */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-6">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <CalendarDays size={15} className="text-green-700 dark:text-green-400" />
            <h2 className="font-bold text-gray-900 dark:text-neutral-100 text-sm">Today</h2>
          </div>
          <button onClick={() => onNav('calendar')} className="text-green-700 dark:text-green-400 text-xs font-medium hover:underline">Open calendar</button>
        </div>
        <div className="px-4 py-3">
          <p className="text-sm text-gray-700 dark:text-neutral-300 mb-2">{briefing}</p>
          {todaysEvents.length > 0 && (
            <div className="space-y-1.5">
              {todaysEvents.map(e => (
                <div key={e.id} className="flex items-center gap-2 text-sm">
                  <Clock size={13} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" />
                  <span className="text-gray-500 dark:text-neutral-400 w-16 flex-shrink-0">{new Date(e.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                  <span className="text-gray-900 dark:text-neutral-100 truncate">{e.title}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Birthdays & key dates */}
      {keyDates.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
            <Cake size={15} className="text-green-700 dark:text-green-400" />
            <h2 className="font-bold text-gray-900 dark:text-neutral-100 text-sm">Birthdays & key dates</h2>
          </div>
          {keyDates.slice(0, 6).map(k => (
            <button key={k.id} onClick={() => onSelectClient(k.clientId)} className="w-full flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:hover:bg-neutral-800 text-left">
              <span className="flex items-center gap-2 text-sm text-gray-900 dark:text-neutral-100 truncate">
                {k.kind === 'birthday' ? <Cake size={14} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" /> : <Pin size={13} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" />}
                {k.label}
              </span>
              <span className={`text-xs flex-shrink-0 font-medium ${k.days <= 2 ? 'text-green-700 dark:text-green-400' : 'text-gray-400 dark:text-neutral-500'}`}>{inDays(k.days)}</span>
            </button>
          ))}
        </div>
      )}

      {/* Follow-ups due */}
      {dueFollowups.length > 0 && (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-6">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-neutral-800 bg-amber-50 dark:bg-amber-950/40">
            <BellRing size={15} className="text-amber-600 dark:text-amber-400" />
            <h2 className="font-bold text-gray-900 dark:text-neutral-100 text-sm">Follow-ups due ({dueFollowups.length})</h2>
          </div>
          {dueFollowups.slice(0, 6).map(r => {
            const overdue = new Date(r.dueDate).getTime() < Date.now() - 86400000;
            return (
              <div key={r.id} className="flex items-center gap-2 px-4 py-3 border-b border-gray-50 last:border-0">
                <button onClick={() => onSelectClient(r.clientId)} className="flex-1 min-w-0 text-left">
                  <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm truncate">{r.label}</p>
                  <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">
                    <span className={overdue ? 'text-red-500 font-medium' : 'text-amber-600 dark:text-amber-400'}>{dueLabel(r.dueDate)}</span>
                    {r.context ? ` · ${r.context}` : ''}
                  </p>
                </button>
                <button onClick={() => onCompleteReminder(r)} title="Mark done" className="p-1.5 rounded-lg text-green-700 dark:text-green-400 hover:bg-green-50"><Check size={16} /></button>
                <button onClick={() => onDismissReminder(r.id)} title="Dismiss" className="p-1.5 rounded-lg text-gray-400 dark:text-neutral-500 hover:bg-gray-100 dark:hover:bg-neutral-800"><X size={16} /></button>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent clients */}
      <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
          <h2 className="font-bold text-gray-900 dark:text-neutral-100 text-sm">Recent Clients</h2>
          <button
            onClick={() => onNav('clients')}
            className="text-green-700 dark:text-green-400 text-xs font-medium hover:underline"
          >
            View all
          </button>
        </div>
        {recentClients.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400 dark:text-neutral-500">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No clients yet.</p>
            <button
              onClick={() => onNav('clients')}
              className="mt-3 text-green-700 dark:text-green-400 text-sm font-medium hover:underline"
            >
              Add your first client →
            </button>
          </div>
        ) : (
          recentClients.map(client => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {getInitials(client.name)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm">{client.name || 'Unnamed'}</p>
                <p className="text-xs text-gray-500 dark:text-neutral-400">{client.company || client.email || 'No details'}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400 dark:text-neutral-500" />
            </button>
          ))
        )}
      </div>

    </div>
  );
}
