import { Users, Mic, Settings, Home, Menu, X, Calendar as CalendarIcon, Search as SearchIcon } from 'lucide-react';
import { useState } from 'react';
import { getBranding } from '../lib/api';

const navItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'clients', label: 'Clients', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
  { id: 'recorder', label: 'Record', icon: Mic },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Layout({ page, onNav, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const branding = getBranding();
  const accent = branding.accentColor || null;

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-neutral-950">
      {/* Brand accent strip (org primary color) */}
      {accent && <div className="h-1 w-full" style={{ backgroundColor: accent }} />}
      {/* Top bar */}
      <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          {branding.logo
            ? <img src={branding.logo} alt={branding.companyName || 'Logo'} className="w-8 h-8 rounded-lg object-contain" />
            : <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Spark" className="w-8 h-8 rounded-lg" />}
          <span className="font-display font-semibold text-gray-900 dark:text-neutral-100 text-xl tracking-tight">{branding.companyName || 'Spark'}</span>
        </div>
        <div className="flex items-center gap-1">
        <button
          className="p-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
          onClick={() => onNav('search')}
          title="Search"
        >
          <SearchIcon size={20} />
        </button>
        <button
          className="md:hidden p-2 rounded-lg text-gray-500 dark:text-neutral-400 hover:bg-gray-100 dark:hover:bg-neutral-800"
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
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-700 px-4 py-2">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { onNav(id); setMenuOpen(false); }}
              className={`flex items-center gap-3 w-full px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                page === id
                  ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300'
                  : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
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
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-900 border-t border-gray-200 dark:border-neutral-700 flex z-40">
        {navItems.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`flex-1 flex flex-col items-center py-3 gap-1 text-xs font-medium transition-colors ${
              page === id ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-neutral-400'
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
