import { useState } from 'react';
import { Search, Plus, Star, ChevronRight, Filter, X } from 'lucide-react';

function getInitials(name) {
  return name ? name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : '?';
}

function getAvatarColor(name) {
  const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
  const idx = name ? name.charCodeAt(0) % colors.length : 0;
  return colors[idx];
}

export default function ClientList({ clients, onSelect, onAdd, onToggleStar }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const filtered = clients.filter(c => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      c.name?.toLowerCase().includes(q) ||
      c.company?.toLowerCase().includes(q) ||
      c.email?.toLowerCase().includes(q) ||
      c.tags?.some(t => t.toLowerCase().includes(q));
    const matchFilter = filter === 'all' || (filter === 'starred' && c.starred);
    return matchSearch && matchFilter;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (a.starred && !b.starred) return -1;
    if (!a.starred && b.starred) return 1;
    return a.name?.localeCompare(b.name || '') || 0;
  });

  return (
    <div className="pb-20 md:pb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-500 text-sm">{clients.length} total</p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={16} />
          Add Client
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search clients, companies, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-4">
        {['all', 'starred'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              filter === f ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {f === 'starred' ? '⭐ Starred' : 'All Clients'}
          </button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <div className="text-4xl mb-3">👤</div>
          <p className="text-gray-500 text-sm">
            {search ? 'No clients match your search.' : 'No clients yet. Add your first one!'}
          </p>
          {!search && (
            <button onClick={onAdd} className="mt-4 bg-blue-600 text-white px-5 py-2 rounded-xl text-sm font-medium">
              Add Client
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {sorted.map((client, i) => (
            <div
              key={client.id}
              className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                i < sorted.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              <button
                onClick={() => onToggleStar(client.id)}
                className={`flex-shrink-0 ${client.starred ? 'text-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`}
              >
                <Star size={16} fill={client.starred ? 'currentColor' : 'none'} />
              </button>
              <button
                onClick={() => onSelect(client.id)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {getInitials(client.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{client.name || 'Unnamed Client'}</p>
                  <p className="text-xs text-gray-500 truncate">{client.company || client.email || 'No details'}</p>
                </div>
                {client.tags?.length > 0 && (
                  <span className="hidden sm:block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full truncate max-w-24">
                    {client.tags[0]}
                  </span>
                )}
                <ChevronRight size={16} className="text-gray-400 flex-shrink-0" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
