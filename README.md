# Mauvine Planner

A bilingual (English / العربية) **rotation planner** for any team that sends *people with roles* to *sites of different categories* on *working days*, fairly and within rules. It works for field inspections, store audits, home‑care rounds, merchandising, maintenance crews, school visits, and similar work.

It uses vanilla JS, has no build step, runs offline in the browser, and is deterministic: the same data and seed always give the same plan.

The full build specification (data model, cost function, solver pipeline, UI contract) is in **[PLAN.md](PLAN.md)**.

## Entry points
| Path | What |
|---|---|
| `index.html` | The app |
| `index.html#plan` · `#sites` · `#people` · `#rules` · `#insights` · `#workspace` | Deep links to tabs |
| `tests/engine-test.html` | Solver test harness: templates, determinism, strict vs bend, pins, warm start, explain |

## Features
- **Workspaces and templates.** You can keep several independent plans. Templates: Field inspections, Store audits, Home‑care rounds, Blank.
- **Your own vocabulary.** You can rename visit / site / person in both languages, and every label follows.
- **General model.**
  - Any number of roles and categories.
  - Staffing per category × role, and a target mix share.
  - Categories can be switched off ("excluded") so they are never planned.
  - Sites: distance, zone, weight, min/max per window, open weekdays, blackout dates.
  - People: several roles each, home distance, near/far preference, weight, weekdays, off days, max total and max per week, avoid/pair with others, liked and banned sites.
- **Rhythm.** A weekly default, plus per‑date overrides from the ribbon (on/off, visit count, day focus: near, far or a category).
- **Rules.**
  - Hard rules: visits per person per day, rest days between duties, distinct sites per day, minimum gap before revisiting a site.
  - When a rule can't be met: "bend and flag" or "strict, leave open".
- **Solver (Web Worker).**
  - One cost function with 15 terms, updated incrementally.
  - Build pipeline: greedy construction, then simulated annealing (4 move types), then a deterministic polish.
  - Runs several independent attempts and keeps the best.
  - **Warm start:** live edits and pins repair the current plan instead of reshuffling it.
  - Falls back to the main thread when opened from `file://`.
- **Explain and pin.** Clicking a person or site shows ranked alternatives, each with its cost change broken down by rule (e.g. "rest +300", "home distance −0.4"). You can Use it, Pin it or Leave it open. There is also "Pin whole plan" and "Clear pins".
- **Views.** Agenda (hover a name to trace that person through the plan), Matrix (people × days, with load vs fair target), Calendar.
- **Checks.** A pre‑flight check warns about capacity, missing roles, tight back‑to‑back days and impossible minimums. After solving, issues are listed and you can jump to the affected day.
- **Insights.** KPIs, rules audit, category mix (achieved vs target), where the cost comes from, load per person with a fair‑target tick, site usage and unused sites, day ledger, copyable report.
- **Export.** CSV, Excel TSV, Markdown, WhatsApp text, iCalendar (.ics) and JSON. You can export for one person only and toggle columns. Print is also supported.
- **Data.** CSV import/export and templates for sites and people. Workspace JSON import/export (this also imports the old Mauvine Rota v1 file). Snapshots. Undo/redo (60 steps).
- **Look.** The original mauve identity, a dark "Dusk" theme, full RTL, command palette (Ctrl K) and keyboard shortcuts (`1–6`, `G`, `R`, `E`, `L`, `?`).
- **Migration.** Existing `mauveineRota.v1` localStorage data is turned into a workspace automatically on first run.

## Data and storage
Everything is kept in `localStorage`:
- `mauvine.v2.index` holds the list of workspaces and your preferences (language, theme, layout, export options).
- `mauvine.v2.ws.<id>` holds one full workspace: model, locks, snapshots and the last solved plan with its fingerprint.

There is no server and no tables API.

## Solver benchmarks (from `tests/engine-test.html`)
| Case | Result |
|---|---|
| Field month (26 visits / 104 seats) | 0 issues, ~0.5 s |
| Field 3 months (80 visits / 320 seats) | 0 issues, ~3 s |
| Store audits month (66 visits) | 0 issues, ~1.2 s |
| Home‑care week | 0 issues |
| 1 person, daily visits, rest = 1 | Bend mode: all filled, 6 rest breaks flagged. Strict mode: 3 seats left open |
| Same seed twice | Identical plan |
| Warm re‑solve | Keeps 104 of 104 assignments, ~80 ms |

## Not yet implemented / next steps
- Real road distances or a map. Distances are currently one number from a shared base.
- Time‑of‑day slots (morning / afternoon) inside a day.
- Sharing between several users. The app is single‑user and local.
- Carrying load history across windows (so next month compensates for this one).
- A side‑by‑side diff view between snapshots.
