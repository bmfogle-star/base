import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Trash2, Save, CalendarDays, Apple, ExternalLink, Users } from 'lucide-react';
import { getAccountInfo, isEnterprise, getOrg } from '../lib/api';
import { downloadICS, googleCalUrl } from '../lib/ics';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW = ['S','M','T','W','T','F','S'];

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toLocalInput(iso) {
  const d = iso ? new Date(iso) : new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

export default function Calendar({ events, addEvent, updateEvent, removeEvent }) {
  const account = getAccountInfo();
  const enterprise = isEnterprise();
  const isAdmin = enterprise && (account.role === 'owner' || account.role === 'admin');

  const [cursor, setCursor] = useState(new Date());
  const [selected, setSelected] = useState(new Date());
  const [editing, setEditing] = useState(null); // event object or null
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (isAdmin) getOrg().then(o => setMembers(o.members || [])).catch(() => {});
  }, [isAdmin]);

  // Events visible to me (in an org, filter by audience).
  const visible = events.filter(e => {
    if (!enterprise) return true;
    if (e.createdBy === account.id) return true;
    if (e.audience === 'org') return true;
    if (e.audience && typeof e.audience === 'object' && Array.isArray(e.audience.members)) {
      return e.audience.members.includes(account.id);
    }
    return e.audience === 'org'; // default org events visible; personal others hidden
  });

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

  function eventsOn(day) {
    return visible.filter(e => sameDay(new Date(e.start), day)).sort((a, b) => new Date(a.start) - new Date(b.start));
  }
  const dayEvents = eventsOn(selected);

  function openNew() {
    setEditing({ title: '', start: toLocalInput(new Date(selected.setHours(9, 0, 0, 0))), end: '', location: '', notes: '', audience: 'me', members: [] });
  }
  function openEdit(ev) {
    setEditing({ ...ev, start: toLocalInput(ev.start), end: ev.end ? toLocalInput(ev.end) : '', members: ev.audience?.members || [] });
  }

  function saveEditing() {
    if (!editing.title.trim()) return;
    const audience = editing.audience === 'specific' ? { members: editing.members } : editing.audience;
    const payload = {
      title: editing.title.trim(),
      start: new Date(editing.start).toISOString(),
      end: editing.end ? new Date(editing.end).toISOString() : '',
      location: editing.location, notes: editing.notes,
      audience, createdBy: account.id || null,
    };
    if (editing.id) updateEvent({ ...editing, ...payload });
    else addEvent(payload);
    setEditing(null);
  }

  function audienceLabel(a) {
    if (a === 'org') return 'Everyone';
    if (a && typeof a === 'object') return `${a.members?.length || 0} people`;
    return 'Just me';
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl text-gray-900">Calendar</h1>
        <button onClick={openNew} className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-900">
          <Plus size={16} /> New event
        </button>
      </div>

      {/* Month nav */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 mb-3">
        <div className="flex items-center justify-between mb-2">
          <button onClick={() => setCursor(new Date(year, month - 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronLeft size={18} /></button>
          <p className="font-semibold text-gray-900 text-sm">{MONTHS[month]} {year}</p>
          <button onClick={() => setCursor(new Date(year, month + 1, 1))} className="p-1.5 rounded-lg hover:bg-gray-100"><ChevronRight size={18} /></button>
        </div>
        <div className="grid grid-cols-7 text-center text-xs text-gray-400 mb-1">
          {DOW.map((d, i) => <div key={i}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((day, i) => {
            if (!day) return <div key={i} />;
            const isSel = sameDay(day, selected);
            const isToday = sameDay(day, new Date());
            const has = eventsOn(day).length;
            return (
              <button key={i} onClick={() => setSelected(day)}
                className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative ${isSel ? 'bg-green-800 text-white' : isToday ? 'ring-1 ring-gold text-green-800 font-semibold' : 'hover:bg-gray-100 text-gray-700'}`}>
                {day.getDate()}
                {has > 0 && <span className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSel ? 'bg-white' : 'bg-green-600'}`} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day events */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">
            {selected.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}
          </h2>
        </div>
        {dayEvents.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">
            <CalendarDays size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No events this day.</p>
          </div>
        ) : dayEvents.map(ev => (
          <div key={ev.id} className="px-4 py-3 border-b border-gray-50 last:border-0">
            <div className="flex items-start justify-between gap-2">
              <button onClick={() => openEdit(ev)} className="text-left flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm">{ev.title}</p>
                <p className="text-xs text-gray-500">
                  {new Date(ev.start).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  {ev.location ? ` · ${ev.location}` : ''}
                  {ev.source === 'call' ? ' · from a call' : ''}
                </p>
                {enterprise && <p className="text-xs text-gray-400 mt-0.5">For: {audienceLabel(ev.audience)}</p>}
              </button>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <a href={googleCalUrl(ev)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-green-700 hover:underline">
                <ExternalLink size={12} /> Google
              </a>
              <button onClick={() => downloadICS(ev)} className="flex items-center gap-1 text-xs text-green-700 hover:underline">
                <Apple size={12} /> Apple / .ics
              </button>
              <button onClick={() => removeEvent(ev.id)} className="flex items-center gap-1 text-xs text-red-500 hover:underline ml-auto">
                <Trash2 size={12} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400 text-center mt-3">
        Tip: “Google” / “Apple” add an event to your phone’s calendar. Events mentioned on calls are added here automatically.
      </p>

      {/* Editor modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center justify-center z-50 p-0 md:p-4" onClick={() => setEditing(null)}>
          <div className="bg-white w-full md:max-w-md rounded-t-2xl md:rounded-2xl p-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">{editing.id ? 'Edit event' : 'New event'}</h3>
              <button onClick={() => setEditing(null)} className="text-gray-400"><X size={20} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" placeholder="Title" value={editing.title} onChange={e => setEditing(s => ({ ...s, title: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Starts</label>
                <input type="datetime-local" value={editing.start} onChange={e => setEditing(s => ({ ...s, start: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Ends (optional)</label>
                <input type="datetime-local" value={editing.end} onChange={e => setEditing(s => ({ ...s, end: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              </div>
              <input type="text" placeholder="Location (optional)" value={editing.location} onChange={e => setEditing(s => ({ ...s, location: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600" />
              <textarea placeholder="Notes (optional)" value={editing.notes} onChange={e => setEditing(s => ({ ...s, notes: e.target.value }))} rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 resize-none" />

              {/* Enterprise audience */}
              {isAdmin && (
                <div className="border-t border-gray-100 pt-3">
                  <label className="text-xs text-gray-500 font-medium flex items-center gap-1 mb-1"><Users size={12} /> Who's this for?</label>
                  <select value={editing.audience === 'org' || editing.audience === 'me' ? editing.audience : 'specific'}
                    onChange={e => setEditing(s => ({ ...s, audience: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-600">
                    <option value="me">Just me</option>
                    <option value="org">Everyone in the company</option>
                    <option value="specific">Specific people…</option>
                  </select>
                  {editing.audience !== 'org' && editing.audience !== 'me' && (
                    <div className="mt-2 max-h-40 overflow-y-auto border border-gray-100 rounded-lg">
                      {members.filter(m => m.id !== account.id).map(m => {
                        const on = editing.members?.includes(m.id);
                        return (
                          <button key={m.id} type="button"
                            onClick={() => setEditing(s => ({ ...s, members: on ? s.members.filter(x => x !== m.id) : [...(s.members || []), m.id] }))}
                            className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50 text-sm">
                            <span className={`w-4 h-4 rounded flex items-center justify-center ${on ? 'bg-green-800 text-white' : 'border border-gray-300'}`}>{on ? '✓' : ''}</span>
                            {m.email}
                          </button>
                        );
                      })}
                      {members.length === 0 && <p className="text-xs text-gray-400 p-3">No other members yet.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              {editing.id && <button onClick={() => { removeEvent(editing.id); setEditing(null); }} className="px-4 py-2.5 text-red-500 text-sm">Delete</button>}
              <button onClick={saveEditing} disabled={!editing.title.trim()}
                className="flex-1 flex items-center justify-center gap-2 bg-green-800 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-green-900 disabled:opacity-50">
                <Save size={15} /> {editing.id ? 'Save' : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
