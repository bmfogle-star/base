// A small starter playbook so a new user sees finished, realistic examples.
// Diagrams use the 0–100 (x) / 0–120 (y) field space from FieldDiagram.

const LOS = 78;

// Offensive line for a play — five linemen on the LOS.
const OL = [38, 44, 50, 56, 62].map((x, i) => ({
  id: `ol${i}`, x, y: LOS - 2, label: '', side: 'off',
}));

export const SAMPLE_PLAYS = [
  {
    id: 'sample-mesh',
    name: 'Mesh',
    category: 'offense',
    formation: 'Trips Right',
    personnel: '11 personnel',
    tags: ['Quick game', 'Man-beater', 'Pass'],
    starred: true,
    positions: [
      { pos: 'X', label: 'Backside WR', assignment: 'Shallow cross — run it 5 yds deep, rub off the Y, keep running to the sideline.' },
      { pos: 'Y', label: 'Slot', assignment: 'Shallow cross from the other side — set the mesh point at 5 yds, run flat.' },
      { pos: 'Z', label: 'Outside WR', assignment: 'Corner route at 12 yds. Sit down vs zone.' },
      { pos: 'H', label: 'Running Back', assignment: 'Check protection, then release to the flat.' },
      { pos: 'QB', label: 'Quarterback', assignment: 'Read high-to-low: corner, then the mesh crossers, then the RB in the flat.' },
    ],
    notes: 'Great vs man coverage — the crossers create a natural pick. Vs zone, the crossers sit in the windows.',
    diagram: {
      players: [
        ...OL,
        { id: 'qb', x: 50, y: LOS + 8, label: 'QB', side: 'qb' },
        { id: 'h', x: 44, y: LOS + 13, label: 'H', side: 'off' },
        { id: 'x', x: 12, y: LOS - 2, label: 'X', side: 'off' },
        { id: 'y', x: 72, y: LOS - 2, label: 'Y', side: 'off' },
        { id: 'z', x: 86, y: LOS - 2, label: 'Z', side: 'off' },
      ],
      routes: [
        { playerId: 'x', points: [{ x: 20, y: LOS - 8 }, { x: 78, y: LOS - 12 }] },
        { playerId: 'y', points: [{ x: 64, y: LOS - 8 }, { x: 16, y: LOS - 12 }] },
        { playerId: 'z', points: [{ x: 88, y: LOS - 18 }, { x: 96, y: LOS - 30 }] },
        { playerId: 'h', points: [{ x: 28, y: LOS + 2 }, { x: 10, y: LOS - 2 }] },
      ],
    },
  },
  {
    id: 'sample-power',
    name: 'Power O',
    category: 'offense',
    formation: 'I-Formation',
    personnel: '21 personnel',
    tags: ['Run', 'Gap scheme', 'Short yardage'],
    positions: [
      { pos: 'PST/PSG', label: 'Playside line', assignment: 'Down block — cover the man to your inside.' },
      { pos: 'BSG', label: 'Backside guard', assignment: 'Pull and kick out the playside end / lead through the hole.' },
      { pos: 'F', label: 'Fullback', assignment: 'Kick out the first defender outside the tackle.' },
      { pos: 'H', label: 'Running Back', assignment: 'Take the handoff, read the kick-out, run downhill off the guard.' },
      { pos: 'QB', label: 'Quarterback', assignment: 'Open playside, hand off, carry out the naked fake.' },
    ],
    notes: 'Double team at the point of attack, guard pulls to lead. Downhill, physical run.',
    diagram: {
      players: [
        ...OL,
        { id: 'qb', x: 50, y: LOS + 7, label: 'QB', side: 'qb' },
        { id: 'f', x: 50, y: LOS + 12, label: 'F', side: 'off' },
        { id: 'h', x: 50, y: LOS + 18, label: 'H', side: 'off' },
        { id: 'y', x: 68, y: LOS - 2, label: 'Y', side: 'off' },
        { id: 'z', x: 88, y: LOS - 2, label: 'Z', side: 'off' },
        { id: 'd1', x: 44, y: LOS - 6, side: 'def' },
        { id: 'd2', x: 62, y: LOS - 6, side: 'def' },
        { id: 'd3', x: 74, y: LOS - 7, side: 'def' },
      ],
      routes: [
        { playerId: 'f', points: [{ x: 66, y: LOS - 1 }] },
        { playerId: 'h', points: [{ x: 58, y: LOS + 6 }, { x: 66, y: LOS - 4 }] },
      ],
    },
  },
  {
    id: 'sample-cover3',
    name: 'Cover 3 Sky',
    category: 'defense',
    formation: '4-3 Base',
    personnel: 'Base',
    tags: ['Zone', 'Coverage'],
    positions: [
      { pos: 'CB', label: 'Cornerbacks', assignment: 'Bail to the deep third. Eyes on the QB, keep everything in front.' },
      { pos: 'FS', label: 'Free Safety', assignment: 'Deep middle third — split the difference over the top.' },
      { pos: 'SS', label: 'Strong Safety', assignment: 'Roll down to the strong-side flat/curl. Force defender vs run.' },
      { pos: 'LB', label: 'Linebackers', assignment: 'Hook-to-curl zones, wall off crossers, get depth on the drop.' },
    ],
    notes: 'Three deep, four under. Strong safety rolls down — the "sky" force player.',
    diagram: {
      players: [
        { id: 'dl1', x: 40, y: LOS + 4, side: 'def' },
        { id: 'dl2', x: 47, y: LOS + 4, side: 'def' },
        { id: 'dl3', x: 53, y: LOS + 4, side: 'def' },
        { id: 'dl4', x: 60, y: LOS + 4, side: 'def' },
        { id: 'lb1', x: 42, y: LOS + 12, side: 'def' },
        { id: 'lb2', x: 50, y: LOS + 12, side: 'def' },
        { id: 'lb3', x: 58, y: LOS + 12, side: 'def' },
        { id: 'cb1', x: 14, y: LOS + 8, side: 'def' },
        { id: 'cb2', x: 86, y: LOS + 8, side: 'def' },
        { id: 'ss', x: 70, y: LOS + 16, side: 'def' },
        { id: 'fs', x: 50, y: LOS + 28, side: 'def' },
      ],
      routes: [
        { playerId: 'cb1', points: [{ x: 16, y: LOS + 30 }] },
        { playerId: 'cb2', points: [{ x: 84, y: LOS + 30 }] },
        { playerId: 'ss', points: [{ x: 80, y: LOS + 10 }] },
      ],
    },
  },
];

// Deep-clone the samples with fresh timestamps for a new install.
export function seedPlays() {
  const now = new Date().toISOString();
  return SAMPLE_PLAYS.map(p => ({
    ...structuredClone(p),
    createdAt: now,
    updatedAt: now,
  }));
}
