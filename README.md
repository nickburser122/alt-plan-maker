# Cadence — Field Rotation Planner

Bilingual (EN / العربية), deterministic, offline-first planner that builds visit rotations for teams visiting facilities. (Formerly "Mauvine Planner"; existing browser data is kept.)

## Entry points
| Path | Purpose |
|---|---|
| `index.html#plan` | Plan window, **Recipe** (plan size + goals), schedule |
| `#sites` | Facilities ledger (category, **location**, distance, **criticality**, type) + **Locations & distances** table |
| `#people` | Team ledger (roles, **rank** overall + per category, home location, limits) |
| `#rules` | Vocabulary, roles, categories, weekly rhythm, **Work/rest pattern**, **Rank ↔ criticality**, hard rules, engine |
| `#model` | **Objective equation**, "What moves the needle" (weights + live cost share), problem size, pipeline |
| `#insights` | KPIs (coverage, critical matched), audit, mix, load, usage |
| `#workspace` | Workspaces, snapshots, import/export, **Load branch dataset** |
| `tests/engine-test.html` | Engine regression + dataset scenario tests |

## Features
- **Dataset**: `data/complete_data.json` (locations, facilities, criticality, pools, people ranks) loads automatically on first run; you can also load it again from Workspace or import any file with the same shape.
- **Locations**: facilities and homes pick a location, and the distance comes from the locations table. Editing a distance updates every facility and home in that location.
- **Criticality and rank** (0/25/50/75/100): a soft "rank match" term sends good ranks to critical places without wasting strong people on trivial ones. An optional gate ("Lead must match" or "Everyone must match") adds a tolerance rule on top.
- **Flexible plans (Recipe)**:
  - Size: weekly rhythm / fixed total / fit the goals.
  - Stackable goals: `Each | In total` × `all / category / location / type / criticality ≥ / one facility` × `at least | exactly | at most` × N.
  - Quick recipes: every place once / twice / critical ×2 + high ×1.
  - Plans that run only on some weekdays (e.g. every Saturday, 2 visits) use the working-weekday chips plus the per-day count.
- **Work/rest patterns**: never consecutive, 1-on-2-off, 2-on-1-off, 2/2, 3/1, 5/2, or custom (max in a row + rest ≥ N).
- **Consistent custom dropdowns** everywhere: searchable, keyboard-navigable, RTL-aware.
- Explainable choices: click any seat or visit to see ranked alternatives and the cost of each.

## Algorithm
Cost J = hard terms (coverage, limits, work/rest, distinct) + Σ weight × soft term (goals, rank, fair, rotate, mix, pref, home, focus, cluster, spacing, pairs, likes).
Greedy construction → simulated annealing (reassign, swap, relocate with goal-directed relocation, site-swap) → exhaustive polish. Best of N seeded runs, so the same data and seed always give the same plan. Runs in a Web Worker.

## Data / storage
All data is stored in the browser's localStorage (`mauvine.v2.*`). Workspace model: `roles, categories, sites{loc,crit,tag,...}, people{rank,rankBy,homeLoc,...}, locations{name,km}, goals[], sizing{mode,total}, rules{runMax,offMin,rankGate,rankTol,...}`. There is no server or table API.

## Not yet / next
- Gender pairing rule (`genderRule` in the dataset is not used yet).
- Per-person work patterns (the pattern is global for now).
- Multi-location travel routing (distances are all measured from base).
