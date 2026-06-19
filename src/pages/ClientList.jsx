import { useState } from 'react';
import { Search, Plus, Star, ChevronRight, Filter, X, Paperclip, ScanLine, Users } from 'lucide-react';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

function getAvatarColor(name) {
  const colors = ['bg-amber-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[idx];
}

export default function ClientList({ clients, onSelect, onAdd, onScan, onImport, onToggleStar }) {
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filtered = clients.filter(c => {
    if (!q) return true;
    return c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q));
  });

  const alpha = [...filtered].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  const favorites = alpha.filter(c => c.starred);
  const others = alpha.filter(c => !c.starred);

  // Group non-favorites into A–Z sections (anything non-letter goes under '#').
  const groups = [];
  for (const c of others) {
    const ch = (c.name || '#').trim().charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(ch) ? ch : '#';
    const last = groups[groups.length - 1];
    if (!last || last.letter !== letter) groups.push({ letter, items: [c] });
    else last.items.push(c);
  }

  function ClientRow(client) {
    return (
      <div key={client.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors border-b border-gray-100 dark:border-neutral-800 last:border-0">
        <button
          onClick={() => onToggleStar(client.id)}
          className={`flex-shrink-0 ${client.starred ? 'text-gold' : 'text-gray-300 hover:text-gold'}`}
          title={client.starred ? 'Unfavorite' : 'Add to favorites'}
        >
          <Star size={16} fill={client.starred ? 'currentColor' : 'none'} />
        </button>
        <button onClick={() => onSelect(client.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          <div className={`w-10 h-10 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
            {getInitials(client.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 dark:text-neutral-100 text-sm truncate">{client.name || 'Unnamed Client'}</p>
            <p className="text-xs text-gray-500 dark:text-neutral-400 truncate">{client.company || client.email || 'No details'}</p>
          </div>
          {client.attachments?.length > 0 && (
            <span className="flex items-center gap-0.5 text-gray-400 dark:text-neutral-500 text-xs flex-shrink-0">
              <Paperclip size={12} />{client.attachments.length}
            </span>
          )}
          {client.tags?.length > 0 && (
            <span className="hidden sm:block bg-gray-100 dark:bg-neutral-800 text-gray-600 dark:text-neutral-300 text-xs px-2 py-0.5 rounded-full truncate max-w-24">
              {client.tags[0]}
            </span>
          )}
          <ChevronRight size={16} className="text-gray-400 dark:text-neutral-500 flex-shrink-0" />
        </button>
      </div>
    );
  }

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl text-gray-900 dark:text-neutral-100">Clients</h1>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">{clients.length} total</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-green-900 transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Quick add options */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <button onClick={onScan} className="flex items-center justify-center gap-2 border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 py-2.5 rounded-xl text-sm font-medium hover:border-green-600 hover:text-green-700 transition-colors">
          <ScanLine size={16} /> Scan card
        </button>
        <button onClick={onImport} className="flex items-center justify-center gap-2 border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-gray-700 dark:text-neutral-300 py-2.5 rounded-xl text-sm font-medium hover:border-green-600 hover:text-green-700 transition-colors">
          <Users size={16} /> Import contacts
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500" />
        <input
          type="text"
          placeholder="Search clients, companies, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-neutral-500">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Directory */}
      {alpha.length === 0 ? (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate p-10 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500 dark:text-neutral-400 text-sm">
            {search ? 'No clients match your search.' : 'No clients yet. Add your first one!'}
          </p>
          {!search && (
            <button onClick={onAdd} className="mt-4 bg-green-800 text-white px-5 py-2 rounded-xl text-sm font-medium">
              Add Client
            </button>
          )}
        </div>
      ) : q ? (
        // Flat results while searching
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden">
          {alpha.map(ClientRow)}
        </div>
      ) : (
        <>
          {favorites.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center gap-1.5 px-1 mb-1.5">
                <Star size={13} className="text-gold" fill="currentColor" />
                <h2 className="text-xs font-bold text-gold uppercase tracking-[0.15em]">Favorites</h2>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden">
                {favorites.map(ClientRow)}
              </div>
            </div>
          )}
          {groups.map(group => (
            <div key={group.letter} className="mb-4">
              <h2 className="text-xs font-bold text-gold uppercase tracking-[0.15em] px-1 mb-1.5">{group.letter}</h2>
              <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-gray-200/70 dark:border-neutral-800 card-elevate overflow-hidden">
                {group.items.map(ClientRow)}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
