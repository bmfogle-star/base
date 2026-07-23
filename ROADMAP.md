# 🏈 Playbook — Roadmap

The product vision, and how the build maps to it. Audience: **all levels,
high-school-first**. Guiding rule: **radically simple** — assume a young athlete
who isn't comfortable with technology. Big tap targets, plain language, few
steps, works offline.

## Two roles
- **Coach** — builds the playbook, writes each position's rules, programs the AI
  position coach, uploads film + coaching notes, organizes install modules.
- **Player** — learns: studies flashcards/quizzes, watches film, asks the AI
  coach questions, jots quick notes. Learn-only, nothing to break.

## Feature map

| Vision | Status |
| --- | --- |
| Playbook of plays w/ diagrams | ✅ Built |
| Assignments broken down by position | ✅ Built |
| Flashcards + spaced repetition | ✅ Built |
| Drill your own position | ✅ Built |
| Offline / installable on phones | ✅ PWA + service worker (works with no signal) |
| Coach vs Player mode | ✅ Built (role toggle in profile) |
| **AI position coach** — coach programs it per position; players ask about assignments & "what-if" situations | ✅ Built (Anthropic SDK, coach brings an API key) |
| **Quizzes** — multiple-choice, auto-built from the playbook | ✅ Built (in the Study hub, scored) |
| **Film review** — clips of plays/assignments done right, with coach notes, indicators & coaching points | ✅ Built (Film room: Hudl/YouTube links + on-device upload, tags, coaching notes) |
| **Modules / install units** — group plays into weekly installs; progress tracking | 🔜 Next |
| **Quick notes + sketch pad** — fast text notes and a freeform drawing to capture an indicator | 🔜 Next |

### Hudl note
Hudl has **no open self-serve API** for third-party apps to pull a team's film
(their "API" is Hudl IQ / StatsBomb *data*, enterprise-only). So the Film room
is source-agnostic: paste a Hudl/YouTube/Vimeo link or upload the clip file
(stored on-device via IndexedDB, plays offline). True one-click Hudl account
sync would require a partnership/data agreement with Hudl — a business step, not
a code change; if that lands, real sync drops into this same Film model.
| Team sync / roster (coach pushes the book to players' phones) | 🔮 Later (needs a backend) |

## Design principles (do not break)
1. **Simple beats powerful.** If a 9th grader can't use it on the first try, cut
   or hide it.
2. **Position-first.** A player should only ever have to think about *their* job
   unless they ask for more.
3. **Offline always.** Everything a player needs is on their phone, no signal
   required.
4. **Plain language.** Coaching points read like a coach talking, not a manual.
