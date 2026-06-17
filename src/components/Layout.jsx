import { Users, Mic, Settings, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'recorder', label: 'Record', icon: Mic },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ page, onNav, children }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Users size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg">ClientIQ</span>
        </div>
        <button
          className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        {/* Desktop nav */}
        <nav className="hidden md:flex gap-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNav(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNav(id); setMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* Page content */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 py-6">
        {children}
      </main>

      {/* Bottom mobile nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex z-40">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              page === id ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <Icon size={20} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
