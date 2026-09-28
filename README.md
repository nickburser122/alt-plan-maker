# Cadence — Field Rotation Planner

Bilingual (EN / العربية), deterministic, offline-first planner that builds visit rotations for teams visiting facilities. (Formerly "Mauvine Planner"; existing browser data is kept.)

## Entry points
| Path | Purpose |
|---|---|
| `index.html#plan` | Plan window, **Recipe** (plan size + goals), schedule |
| `#sites` | Facilities ledger (category, location, distance, criticality, type) + Locations & distances + direct routes |
| `#people` | Team ledger (roles, rank overall + per category, home location, limits). The drawer holds **personal rules** and the group rules that also apply |
| `#rules` | Rule book (filters: All / Per person / Gender / Group / Must), work/rest pattern, rank ↔ criticality, hard rules, weights, categories, week, vocabulary |
| `#model` | Objective equation with **one-click copy as Text / LaTeX / Markdown / JSON**, plus Export (download) |
| `#insights` | KPIs, audit, mix, load, usage |
| `#workspace` | Workspaces, snapshots, import/export, data file source |
| `tests/engine-test.html` | Engine regression + dataset + rule tests |

## Features
- **Dataset loads on open**: `data/complete_data.json` is fetched on first run, when the active workspace has no facilities, or when no dataset workspace exists yet. Falls back to `*.json.txt` names. If you open the page from `file://` you get a prompt to import the file, because browsers block local fetches.
- **The split files win**: `data/facilities.json` and `data/people_ranking.json` are layered on top of `complete_data.json`, matched by id and then by name. They set the list of facilities and people and their name, category, location, gender, pool and ranks. `complete_data.json` still provides the distances, criticality, pools and rules. When any of these files change, the workspace updates on its own and keeps your edits. `tests/ds-check.html` compares what the app shows with the files.
- **Rule book** (every rule can be soft with a strength, or a hard "must"):
  - `Place`: who prefers / avoids / only / never goes to a place, category, location, type, criticality ≥ / ≤, or distance.
  - `Day`: who prefers / avoids / only / never works on certain weekdays.
  - `Partner`: who prefers / avoids / only / never pairs with whom.
  - `Team mix`: visits to X should / must have at least / at most / exactly / **none or at least** N × who (for example, women never go alone).
  - `Visit count` (new, per person or group): who should / must do at least / at most / exactly N visits to X, **per plan or per week**.
  - **NOT** toggle on each side inverts the matcher ("everyone except rank ≥ 75", "anywhere except location X").
  - ⇄ flips a rule into its opposite (prefer ↔ avoid, only ↔ never, min ↔ max). 🔒 switches soft ↔ must. ↺ restores the rule book from the data file.
  - New who-matcher **Lives in** (home location) and what-matcher **criticality ≤**.
  - **AND / OR conditions**: `+` after any who/what picker adds up to 3 extra conditions; click the joiner to switch AND ↔ OR (e.g. "Women AND rank ≤ 50 never go farther than 40 km"). JSON: `who:{k,v,more:[{k,v,not}],join:'and'|'or'}`.
  - **Calendar dates** on Day rules: switch `weekdays | dates` and type `2026-10-06, 2026-10-12..2026-10-15`. JSON: `what:{k:'dates',v:'…'}`.
- **Gender rules**: `default_settings.genderRule` in the dataset (for example `"basic":"31"`) is turned into a team rule ("at most 1 woman per basic visit"). There are ready-made templates for women (none-or-2 per visit, never far, prefer near).
- **Per-person rules**: open a person's drawer to add a Place / Day / Partner / Visit-count rule in one click and edit it inline. Group rules that match them are listed underneath.
- **Multi-stop day routing**: new soft term `route` puts each day's stops, and each person's same-day stops, into the shortest loop from base or home. It uses exact search for up to 5 stops and nearest-neighbour above that, with the direct routes table. The agenda shows the ordered route and km for each day.
- Work/rest patterns (global or per person), rank-to-criticality matching, locations and routes, goals, pins, explainable alternatives.

## Algorithm
J = hard terms (coverage, limits, rest, distinct, must rules) + Σ weight × soft term (goals, book, rank, fair, rotate, mix, pref, home, focus, cluster, spacing, pairs, likes).
Rule book term: Σ_r w_r·(1.2·[site/day] + 3·[avoid-with] − 0.8·[pair-with] + 2·team_gap + 2·count_gap).
The solver builds a greedy start, then runs simulated annealing and a polish pass, taking the best of N seeded runs. It runs in a Web Worker.

## Data / storage
All data is stored in the browser's localStorage (`mauvine.v2.*`). Rule JSON: `{rel: site|day|with|team|count, sense, who:{k,v,not?}, what:{k,v,not?}, op, n, per: plan|week, w, note}`. `data/app-config.json` sets the dataset path and the rule templates. There is no server or table API.

## Not yet / next
- Travel-time windows (routing uses km only).
- Nested condition groups (one AND/OR level per side for now).
