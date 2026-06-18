import { Users, Phone, Star, TrendingUp, ChevronRight, Plus } from 'lucide-react';

export default function Dashboard({ clients, onNav, onSelectClient, onAdd }) {
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

  return (
    <div className="pb-20 md:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-500 text-sm mt-1">Here's your sales overview</p>
      </div>

      {/* Add client */}
      <button
        onClick={onAdd}
        className="w-full flex items-center justify-center gap-2 bg-green-700 text-white py-3.5 rounded-xl text-sm font-semibold hover:bg-green-800 transition-colors mb-6"
      >
        <Plus size={18} />
        Add Client
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <Users size={18} className="text-green-700" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
          <p className="text-xs text-gray-500 mt-1">Clients</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-9 h-9 bg-green-100 rounded-lg flex items-center justify-center mb-2">
            <Phone size={18} className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalCalls}</p>
          <p className="text-xs text-gray-500 mt-1">Calls Logged</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="w-9 h-9 bg-yellow-100 rounded-lg flex items-center justify-center mb-2">
            <Star size={18} className="text-yellow-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{starred}</p>
          <p className="text-xs text-gray-500 mt-1">Starred</p>
        </div>
      </div>

      {/* Recent clients */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-sm">Recent Clients</h2>
          <button
            onClick={() => onNav('clients')}
            className="text-green-700 text-xs font-medium hover:underline"
          >
            View all
          </button>
        </div>
        {recentClients.length === 0 ? (
          <div className="px-4 py-8 text-center text-gray-400">
            <Users size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No clients yet.</p>
            <button
              onClick={() => onNav('clients')}
              className="mt-3 text-green-700 text-sm font-medium hover:underline"
            >
              Add your first client →
            </button>
          </div>
        ) : (
          recentClients.map(client => (
            <button
              key={client.id}
              onClick={() => onSelectClient(client.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
            >
              <div className={`w-10 h-10 rounded-full ${getAvatarColor(client.name)} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                {getInitials(client.name)}
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900 text-sm">{client.name || 'Unnamed'}</p>
                <p className="text-xs text-gray-500">{client.company || client.email || 'No details'}</p>
              </div>
              <ChevronRight size={16} className="text-gray-400" />
            </button>
          ))
        )}
      </div>

      {/* Quick tip */}
      <div className="bg-green-50 border border-green-100 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <TrendingUp size={18} className="text-green-700 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-green-900">Pro tip</p>
            <p className="text-xs text-green-800 mt-0.5">
              Record your next sales call to automatically extract client details, hobbies, and personal info.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
