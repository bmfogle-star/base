import { Fragment } from 'react';
import { isNativeApp } from '../lib/platform';
import NavIcon from './NavIcon';

const navItems = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'playbook', label: 'Playbook', icon: 'playbook' },
  { id: 'film', label: 'Film', icon: 'whistle' },
  { id: 'study', label: 'Study', icon: 'study' },
  { id: 'coach', label: 'Ask', icon: 'ask' },
];

export default function Layout({ page, onNav, children }) {
  const native = isNativeApp();

  return (
    <div className="flex flex-col min-h-screen app-bg">
      {/* Top bar — dark bench with a yellow yard-line under it */}
      <header className="app-header sticky top-0 z-40 bg-[#0c2018] text-white px-4 py-3 flex items-center justify-between gap-4 yardline">
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-8 h-8 rounded-md" />
          <span className="font-display text-2xl leading-none tracking-wide">PLAYBOOK</span>
        </div>

        {/* Desktop nav — equal segments across the top bar (web only) */}
        {!native && (
          <nav className="hidden md:flex flex-1 items-stretch justify-end max-w-xl ml-auto">
            {navItems.map(({ id, label, icon }, i) => (
              <Fragment key={id}>
                {i > 0 && <span className="self-center h-6 w-px bg-white/15" />}
                <button
                  onClick={() => onNav(id)}
                  className={`flex-1 flex items-center justify-center gap-2 mx-1 my-0.5 px-3 py-2 rounded-md chalk text-xs transition-colors ${
                    page === id ? 'bg-green-500 text-[#0c2018]' : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <NavIcon name={icon} size={18} active={page === id} /> {label}
                </button>
              </Fragment>
            ))}
          </nav>
        )}

        {/* Settings gear (keeps the bottom bar to 5 tabs) */}
        <button onClick={() => onNav('settings')} aria-label="Settings"
          className={`p-1.5 rounded-md flex-shrink-0 ${page === 'settings' ? 'text-yard' : 'text-white/70 hover:text-white'}`}>
          <NavIcon name="settings" size={22} active={page === 'settings'} />
        </button>
      </header>

      {/* Page content */}
      <main className={`flex-1 max-w-3xl w-full mx-auto px-4 py-6 ${native ? 'pb-28' : ''}`}>
        {children}
      </main>

      {/* Bottom tab bar — always in the native app, mobile-only on the web */}
      <nav className={`app-bottom-nav ${native ? 'flex' : 'flex md:hidden'} fixed bottom-0 left-0 right-0 bg-[#0c2018] text-white z-40`}>
        {navItems.map(({ id, label, icon }) => {
          const on = page === id;
          return (
            <button
              key={id}
              onClick={() => onNav(id)}
              className="flex-1 flex flex-col items-center pt-2 pb-2.5 gap-1 relative"
            >
              {/* active indicator bar */}
              <span className={`absolute top-0 h-0.5 w-8 rounded-full transition-colors ${on ? 'bg-yard' : 'bg-transparent'}`} />
              <span className={on ? 'text-green-400' : 'text-white/55'}><NavIcon name={icon} size={22} active={on} /></span>
              <span className={`chalk text-[10px] ${on ? 'text-white' : 'text-white/55'}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
