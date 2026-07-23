import { Fragment } from 'react';
import { isNativeApp } from '../lib/platform';
import { Icon } from './ui';

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
      {/* Top bench */}
      <header className="pt-safe sticky top-0 z-40 text-white px-4 pb-3 flex items-center justify-between gap-4"
        style={{ background: 'var(--header)', boxShadow: 'inset 0 -3px 0 var(--c-yard)' }}>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="w-8 h-8 rounded-md" />
          <span className="font-display text-2xl leading-none tracking-wide">PLAYBOOK</span>
        </div>

        {!native && (
          <nav className="hidden md:flex flex-1 items-stretch justify-end max-w-xl ml-auto">
            {navItems.map(({ id, label, icon }, i) => (
              <Fragment key={id}>
                {i > 0 && <span className="self-center h-6 w-px bg-white/15" />}
                <button onClick={() => onNav(id)}
                  className={`flex-1 flex items-center justify-center gap-2 mx-1 my-0.5 px-3 py-2 rounded-lg label text-[11px] transition-colors ${
                    page === id ? 'bg-brand text-brandink' : 'text-white/65 hover:text-white hover:bg-white/10'
                  }`}>
                  <Icon name={icon} size={17} /> {label}
                </button>
              </Fragment>
            ))}
          </nav>
        )}

        <button onClick={() => onNav('settings')} aria-label="Settings"
          className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${page === 'settings' ? 'text-yard' : 'text-white/70 hover:text-white'}`}>
          <Icon name="settings" size={22} />
        </button>
      </header>

      {/* Content — re-animates on page change via key */}
      <main key={page} className={`rise flex-1 max-w-3xl w-full mx-auto px-4 py-6 ${native ? 'pb-28' : 'pb-24 md:pb-8'}`}>
        {children}
      </main>

      {/* Bottom tab bar */}
      <nav className={`pb-safe ${native ? 'flex' : 'flex md:hidden'} fixed bottom-0 left-0 right-0 z-40 text-white`}
        style={{ background: 'var(--header)' }}>
        {navItems.map(({ id, label, icon }) => {
          const on = page === id;
          return (
            <button key={id} onClick={() => onNav(id)} className="flex-1 flex flex-col items-center pt-2 pb-2 gap-1 relative press">
              <span className={`absolute top-0 h-[3px] w-9 rounded-full transition-colors ${on ? 'bg-yard' : 'bg-transparent'}`} />
              <span className={on ? 'text-brand' : 'text-white/55'}><Icon name={icon} size={22} stroke={on ? 2.4 : 2} /></span>
              <span className={`label text-[9.5px] ${on ? 'text-white' : 'text-white/55'}`}>{label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
