import { useId, useRef, useState } from 'react';

// A football field play diagram. Coordinates are in a 0–100 (x) by 0–120 (y)
// space that maps 1:1 onto the SVG viewBox, so screen↔field math is linear.
// A diagram value is { players: [{id,x,y,label,side}], routes: [{playerId, points:[{x,y}]}] }.
//   side: 'off' (offense, white disc) | 'def' (defense, red X) | 'qb' (quarterback)
//
// Read-only by default. Pass `editable` + `onChange` to enable the editor.

const VB_W = 100;
const VB_H = 120;
const LOS_Y = 78;            // line of scrimmage
const OFFENSE_LABELS = ['X', 'Z', 'Y', 'H', 'F', 'T', 'A', 'B'];

export function emptyDiagram() {
  return { players: [], routes: [] };
}

// A quick 11-personnel-ish starting formation so a new play isn't a blank field.
export function starterFormation() {
  const ol = [38, 44, 50, 56, 62].map((x, i) => ({
    id: `ol${i}`, x, y: LOS_Y - 2, label: '', side: 'off',
  }));
  return {
    players: [
      ...ol,
      { id: 'qb', x: 50, y: LOS_Y + 8, label: 'QB', side: 'qb' },
      { id: 'rb', x: 50, y: LOS_Y + 14, label: 'H', side: 'off' },
      { id: 'wl', x: 14, y: LOS_Y - 2, label: 'X', side: 'off' },
      { id: 'wr', x: 86, y: LOS_Y - 2, label: 'Z', side: 'off' },
      { id: 'te', x: 68, y: LOS_Y - 2, label: 'Y', side: 'off' },
    ],
    routes: [],
  };
}

function Field({ uid }) {
  const lines = [];
  for (let y = 12; y <= VB_H - 12; y += 12) {
    lines.push(
      <line key={`yl${y}`} x1="6" y1={y} x2={VB_W - 6} y2={y}
        stroke="#ffffff" strokeOpacity="0.35" strokeWidth="0.4" />
    );
    // Hash marks
    for (let x = 22; x <= VB_W - 22; x += 4) {
      lines.push(
        <line key={`h${x}-${y}`} x1={x} y1={y - 0.8} x2={x} y2={y + 0.8}
          stroke="#ffffff" strokeOpacity="0.25" strokeWidth="0.3" />
      );
    }
  }
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}-turf`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1a7a43" />
          <stop offset="1" stopColor="#146536" />
        </linearGradient>
        <marker id={`${uid}-arrow`} viewBox="0 0 10 10" refX="7" refY="5"
          markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M 0 1 L 9 5 L 0 9 z" fill="#ffe14d" />
        </marker>
      </defs>
      <rect x="0" y="0" width={VB_W} height={VB_H} fill={`url(#${uid}-turf)`} />
      {lines}
      {/* Line of scrimmage */}
      <line x1="4" y1={LOS_Y} x2={VB_W - 4} y2={LOS_Y}
        stroke="#ffe14d" strokeOpacity="0.9" strokeWidth="0.7" />
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="none"
        stroke="#ffffff" strokeOpacity="0.4" strokeWidth="0.8" />
    </g>
  );
}

function routePath(player, points) {
  if (!player) return '';
  let d = `M ${player.x} ${player.y}`;
  for (const p of points) d += ` L ${p.x} ${p.y}`;
  return d;
}

function PlayerMark({ p, dimmed }) {
  const op = dimmed ? 0.25 : 1;
  if (p.side === 'def') {
    return (
      <g opacity={op}>
        <line x1={p.x - 2.6} y1={p.y - 2.6} x2={p.x + 2.6} y2={p.y + 2.6}
          stroke="#ff5a5a" strokeWidth="1.2" strokeLinecap="round" />
        <line x1={p.x - 2.6} y1={p.y + 2.6} x2={p.x + 2.6} y2={p.y - 2.6}
          stroke="#ff5a5a" strokeWidth="1.2" strokeLinecap="round" />
      </g>
    );
  }
  const fill = p.side === 'qb' ? '#ffe14d' : '#ffffff';
  return (
    <g opacity={op}>
      <circle cx={p.x} cy={p.y} r="3.4" fill={fill} stroke="#0b3d2e" strokeWidth="0.5" />
      {p.label && (
        <text x={p.x} y={p.y + 1.4} textAnchor="middle" fontSize="3.4"
          fontWeight="700" fill="#0b3d2e">{p.label}</text>
      )}
    </g>
  );
}

// ── Read-only renderer ──
// `contain` fits the whole field inside the container (for fixed-size
// thumbnails), so defensive plays below the LOS are never clipped. The default
// renders at the field's natural aspect ratio (for the full detail view).
export function DiagramView({ diagram, className = '', contain = false }) {
  const uid = useId().replace(/:/g, '');
  const d = diagram || emptyDiagram();
  return (
    <svg viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio={contain ? 'xMidYMid meet' : undefined}
      className={contain ? `w-full h-full block ${className}` : `w-full h-auto ${className}`}
      style={contain ? undefined : { aspectRatio: `${VB_W}/${VB_H}` }}>
      <Field uid={uid} />
      {d.routes.map((r, i) => {
        const p = d.players.find(pl => pl.id === r.playerId);
        return <path key={i} d={routePath(p, r.points)} fill="none"
          stroke="#ffe14d" strokeWidth="1" strokeLinejoin="round"
          strokeLinecap="round" markerEnd={`url(#${uid}-arrow)`} />;
      })}
      {d.players.map(p => <PlayerMark key={p.id} p={p} />)}
    </svg>
  );
}

// ── Interactive editor ──
export default function FieldDiagram({ value, onChange }) {
  const uid = useId().replace(/:/g, '');
  const svgRef = useRef(null);
  const [tool, setTool] = useState('select'); // select | offense | defense | route | erase
  const [routeFor, setRouteFor] = useState(null); // player id currently drawing a route
  const dragRef = useRef(null);
  const d = value || emptyDiagram();

  function update(next) {
    onChange({ players: next.players || d.players, routes: next.routes || d.routes });
  }

  function toField(e) {
    const rect = svgRef.current.getBoundingClientRect();
    const t = e.touches?.[0] || e;
    return {
      x: Math.max(2, Math.min(VB_W - 2, ((t.clientX - rect.left) / rect.width) * VB_W)),
      y: Math.max(2, Math.min(VB_H - 2, ((t.clientY - rect.top) / rect.height) * VB_H)),
    };
  }

  function nearestPlayer(pt, max = 6) {
    let best = null, bestD = max;
    for (const p of d.players) {
      const dist = Math.hypot(p.x - pt.x, p.y - pt.y);
      if (dist < bestD) { bestD = dist; best = p; }
    }
    return best;
  }

  function nextLabel() {
    const used = new Set(d.players.filter(p => p.side === 'off').map(p => p.label));
    return OFFENSE_LABELS.find(l => !used.has(l)) || '';
  }

  function addPlayer(pt, side) {
    const id = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 4)}`;
    const label = side === 'off' ? nextLabel() : side === 'qb' ? 'QB' : '';
    update({ players: [...d.players, { id, x: pt.x, y: pt.y, label, side }] });
  }

  function removeAt(pt) {
    const p = nearestPlayer(pt);
    if (p) {
      update({
        players: d.players.filter(pl => pl.id !== p.id),
        routes: d.routes.filter(r => r.playerId !== p.id),
      });
    }
  }

  function onPointerDown(e) {
    const pt = toField(e);
    if (tool === 'offense') return addPlayer(pt, 'off');
    if (tool === 'defense') return addPlayer(pt, 'def');
    if (tool === 'erase') return removeAt(pt);
    if (tool === 'route') {
      if (!routeFor) {
        const p = nearestPlayer(pt);
        if (p) {
          setRouteFor(p.id);
          update({ routes: [...d.routes.filter(r => r.playerId !== p.id), { playerId: p.id, points: [] }] });
        }
      } else {
        update({
          routes: d.routes.map(r =>
            r.playerId === routeFor ? { ...r, points: [...r.points, pt] } : r),
        });
      }
      return;
    }
    // select → begin dragging a player
    const p = nearestPlayer(pt);
    if (p) dragRef.current = p.id;
  }

  function onPointerMove(e) {
    if (tool !== 'select' || !dragRef.current) return;
    e.preventDefault();
    const pt = toField(e);
    update({ players: d.players.map(p => p.id === dragRef.current ? { ...p, x: pt.x, y: pt.y } : p) });
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  const tools = [
    { id: 'select', label: 'Move', emoji: '✋' },
    { id: 'offense', label: 'Player', emoji: '⚪' },
    { id: 'defense', label: 'Defender', emoji: '❌' },
    { id: 'route', label: 'Route', emoji: '↗️' },
    { id: 'erase', label: 'Erase', emoji: '🧽' },
  ];

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tools.map(t => (
          <button key={t.id} type="button"
            onClick={() => { setTool(t.id); setRouteFor(null); }}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
              tool === t.id
                ? 'bg-green-700 text-white border-green-700'
                : 'bg-white dark:bg-neutral-800 text-gray-700 dark:text-neutral-200 border-gray-200 dark:border-neutral-700'
            }`}>
            <span className="mr-1">{t.emoji}</span>{t.label}
          </button>
        ))}
      </div>

      {tool === 'route' && (
        <div className="mb-2 flex items-center gap-2 text-xs">
          <span className="text-gray-600 dark:text-neutral-300">
            {routeFor ? 'Tap the field to add turns in the route.' : 'Tap a player to start their route.'}
          </span>
          {routeFor && (
            <button type="button" onClick={() => setRouteFor(null)}
              className="px-2 py-1 rounded-md bg-green-700 text-white font-semibold">Finish route</button>
          )}
        </div>
      )}

      <div className="rounded-2xl overflow-hidden card-elevate select-none touch-none">
        <svg ref={svgRef} viewBox={`0 0 ${VB_W} ${VB_H}`}
          className="w-full h-auto block cursor-crosshair"
          style={{ aspectRatio: `${VB_W}/${VB_H}` }}
          onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}>
          <Field uid={uid} />
          {d.routes.map((r, i) => {
            const p = d.players.find(pl => pl.id === r.playerId);
            return <path key={i} d={routePath(p, r.points)} fill="none"
              stroke={r.playerId === routeFor ? '#fff' : '#ffe14d'} strokeWidth="1"
              strokeLinejoin="round" strokeLinecap="round" markerEnd={`url(#${uid}-arrow)`} />;
          })}
          {d.players.map(p => <PlayerMark key={p.id} p={p} dimmed={tool === 'route' && routeFor && p.id !== routeFor} />)}
        </svg>
      </div>

      <div className="flex justify-between mt-2">
        <button type="button" onClick={() => update(starterFormation())}
          className="text-xs font-semibold text-green-700 dark:text-green-400">Reset to formation</button>
        <button type="button" onClick={() => update(emptyDiagram())}
          className="text-xs font-semibold text-gray-500 dark:text-neutral-400">Clear field</button>
      </div>
    </div>
  );
}
