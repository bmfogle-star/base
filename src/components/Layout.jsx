import { Fragment } from 'react';
import { isNativeApp } from '../lib/platform';
import Emoji from './Emoji';

const navItems = [
  { id: 'home', label: 'Home', emoji: '🏠' },
  { id: 'playbook', label: 'Playbook', emoji: '📋' },
  { id: 'study', label: 'Study', emoji: '🧠' },
  { id: 'coach', label: 'Ask', emoji: '💬' },
  { id: 'settings', label: 'Settings', emoji: '⚙️' },
];

export default function Layout({ page, onNav, children }) {
  const native = isNativeApp();

  return (
    <div className="flex flex-col min-h-screen app-bg">
      {/* Top bar */}
      <header className="app-header bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-gray-200/70 dark:border-neutral-800 px-4 py-3 flex items-center justify-between gap-4 sticky top-0 z-40">
        <div className="flex items-center gap-2 flex-shrink-0">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Playbook" className="w-8 h-8 rounded-lg" />
          <span className="font-display font-semibold text-gray-900 dark:text-neutral-100 text-xl tracking-tight">Playbook</span>
        </div>

        {/* Desktop nav — equal segments across the top bar (web only) */}
        {!native && (
          <nav className="hidden md:flex flex-1 items-stretch justify-end max-w-lg ml-auto">
            {navItems.map(({ id, label, emoji }, i) => (
              <Fragment key={id}>
                {i > 0 && <span className="self-center h-6 w-px bg-gray-200 dark:bg-neutral-700" />}
                <button
                  onClick={() => onNav(id)}
                  className={`flex-1 flex items-center justify-center gap-2 mx-1.5 my-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    page === id
                      ? 'bg-green-50 dark:bg-green-950/50 text-green-800 dark:text-green-300 shadow-sm'
                      : 'text-gray-600 dark:text-neutral-300 hover:bg-gray-100 dark:hover:bg-neutral-800'
                  }`}
                >
                  <Emoji e={emoji} size="1em" /> {label}
                </button>
              </Fragment>
            ))}
          </nav>
        )}
      </header>

      {/* Page content */}
      <main className={`flex-1 max-w-3xl w-full mx-auto px-4 py-6 ${native ? 'pb-28' : ''}`}>
        {children}
      </main>

      {/* Bottom tab bar — always in the native app, mobile-only on the web */}
      <nav className={`app-bottom-nav ${native ? 'flex' : 'flex md:hidden'} fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md border-t border-gray-200/70 dark:border-neutral-800 z-40`}>
        {navItems.map(({ id, label, emoji }) => (
          <button
            key={id}
            onClick={() => onNav(id)}
            className={`flex-1 flex flex-col items-center py-2.5 gap-0.5 text-[11px] font-semibold transition-colors ${
              page === id ? 'text-green-700 dark:text-green-400' : 'text-gray-500 dark:text-neutral-400'
            }`}
          >
            <Emoji e={emoji} size="1.35em" style={page === id ? undefined : { opacity: 0.55 }} />
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}
