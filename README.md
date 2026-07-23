# 🏈 Playbook — Learn your plays

A dead-simple app that helps football players **learn their playbook**: what to
do, where to line up, and their job on every play. Built high-school-first —
the #1 rule is that a young athlete who "doesn't know anything about computers"
can pick it up in seconds.

**Live (web):** auto-deploys to GitHub Pages.
**Branch:** `claude/football-playbook-app-k9y6pp`

## What works today

- **Playbook** — plays grouped by Offense / Defense / Special Teams, searchable
  by name, formation, or tag.
- **Interactive field diagrams** — draw a play right on the field: drop players,
  drag them around, draw routes with arrows. Or upload a photo of a real
  playbook page.
- **Assignments by position** — every play stores each position's job in plain
  language.
- **Study mode** — flashcards backed by **spaced repetition** (the plays you're
  about to forget resurface first). Filter to your side of the ball or drill a
  single position.
- **Player profile** — pick your position; study defaults to drilling *your*
  job.
- **Works offline / installable** — it's a PWA. Add to Home Screen and it runs
  like a native app; a native iOS/Android shell (Capacitor) is scaffolded too.
- **Backup & share** — export your whole playbook to a file; a teammate can
  import it.

Everything is stored on the device — no account required to start.

## Tech

React + Vite + Tailwind. Local storage is the source of truth. Spaced
repetition is a small SM-2 variant in `src/lib/srs.js`. The field diagram is a
pure-SVG editor in `src/components/FieldDiagram.jsx`.

## Develop

```
npm install          # (use --ignore-scripts if the sharp binary is blocked)
npm run dev           # local dev server
npm run build         # production build → dist/
```

See **ROADMAP.md** for where this is going (AI position coach, film review,
quizzes & modules, quick notes/sketch).
