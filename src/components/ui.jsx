// Shared UI kit for the Playbook design system.
// Everything reads from the CSS tokens in index.css so both themes stay in sync.

// ── Icons ── clean athletic line icons, inherit currentColor.
const P = {
  home: <><path d="M4 11 12 4l8 7" /><path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" /></>,
  playbook: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3h6v1" /><circle cx="9.5" cy="12" r="1.5" /><path d="m13.4 10.5 3 3M16.4 10.5l-3 3" /></>,
  study: <><rect x="4" y="7" width="16" height="12" rx="2" /><path d="M7 4h10" /><path d="M4 12h16" /></>,
  ask: <><path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" /></>,
  settings: <><circle cx="12" cy="12" r="3.1" /><path d="M12 3v2.3M12 18.7V21M4.6 7.6l1.6 1M17.8 15.4l1.6 1M3 12h2.3M18.7 12H21M4.6 16.4l1.6-1M17.8 8.6l1.6-1" /></>,
  whistle: <><circle cx="9" cy="14" r="5" /><path d="M13.2 11.5 20 8.5v4l-6 1.2" /><path d="M9 9V6h4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  star: <><path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8L12 17l-5.2 2.4 1-5.8-4.2-4.1 5.8-.8Z" /></>,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  chevronUp: <path d="m6 15 6-6 6 6" />,
  chevronRight: <path d="m9 6 6 6-6 6" />,
  back: <><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></>,
  play: <path d="M7 5v14l12-7z" />,
  trash: <><path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" /><path d="M10 11v6M14 11v6" /></>,
  edit: <><path d="M4 20h4L19 9l-4-4L4 16z" /><path d="M14 6l4 4" /></>,
  upload: <><path d="M12 16V5" /><path d="m7 10 5-5 5 5" /><path d="M5 19h14" /></>,
  camera: <><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" /><circle cx="12" cy="13" r="3.4" /></>,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  check: <path d="m5 12 5 5L20 6" />,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4" /></>,
  link: <><path d="M9 15 15 9" /><path d="M11 6.5 13 4.5a3.5 3.5 0 0 1 5 5l-2 2" /><path d="M13 17.5 11 19.5a3.5 3.5 0 0 1-5-5l2-2" /></>,
  flag: <><path d="M6 21V4" /><path d="M6 4h11l-2 3 2 3H6" /></>,
};

export function Icon({ name, size = 22, stroke = 2, fill = false, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
      fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || null}
    </svg>
  );
}

// ── Buttons ──
export function Button({ variant = 'primary', size, icon, iconFill, children, className = '', ...rest }) {
  return (
    <button className={`btn btn-${variant} ${size === 'sm' ? 'btn-sm' : ''} ${className}`} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 16 : 18} fill={iconFill} />}
      {children}
    </button>
  );
}

// ── Section label (uppercase, tracked) ──
export function Label({ children, className = '' }) {
  return <div className={`label text-[11px] text-muted ${className}`}>{children}</div>;
}

// ── Chip / badge ──
const CHIP_TONES = {
  brand: 'bg-brand/12 text-brand',
  yard: 'bg-yard/15 text-yard',
  off: 'bg-off/12 text-off',
  def: 'bg-def/12 text-def',
  st: 'bg-st/14 text-st',
  muted: 'bg-ink/6 text-muted',
};
export function Chip({ tone = 'muted', children, className = '' }) {
  return <span className={`chip ${CHIP_TONES[tone] || CHIP_TONES.muted} ${className}`}>{children}</span>;
}

// ── Segmented control ──
export function Segmented({ options, value, onChange, className = '' }) {
  return (
    <div className={`flex gap-1 p-1 rounded-2xl bg-ink/6 ${className}`}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl label text-[11px] transition-colors ${
            value === o.value ? 'bg-surface text-brand shadow-sm' : 'text-muted'
          }`}>
          {o.icon && <Icon name={o.icon} size={15} />} {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Pills row (horizontal filter) ──
export function Pill({ active, children, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full label text-[11px] whitespace-nowrap border transition-colors ${
        active ? 'bg-brand text-brandink border-brand' : 'bg-surface text-muted border-line'
      }`}>{children}</button>
  );
}

// ── Progress ring (SVG) ──
export function Ring({ value = 0, size = 64, stroke = 7, children, color = 'var(--c-brand)' }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, value)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.2,.7,.2,1)' }} />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}
