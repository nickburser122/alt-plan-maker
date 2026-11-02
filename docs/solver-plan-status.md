# Solver plan status

Branch `solver-plan`. Verify with:
- `node tests/run.js all` (53 checks: oracle, fixtures, moves, preflight, golden)
- `python3 tests/ui-solver.py` (13 browser checks, EN and AR)
- `node tests/legacy.js <root> <suite>.js` for goals, regress, alldays, inject, history
- `node tests/run.js golden --strict` after any engine change

## Phases

| Phase | State |
|---|---|
| A oracle | Done. Node harness, 40-run goldens, single-validator oracle on solved and random states, intent fixtures. |
| B tiers | Done. `P.tiers=false` reproduces the old solver byte for byte. Tier map in the solve result and Insights. |
| C annealing | Done as measured. Best-from-start on. Ejection chain on by default. Reheat, Late Acceptance, hot-set, goal-visit lists exist and are opt-in. |
| D sub-solvers | Done. Staffing-aware construction and ejection chain on by default. Hungarian, day-swap, flow layout, cross-category polish exist and are opt-in. |
| E proofs | Done. Max-flow with per-week caps and an exact run/rest DP. |
| F performance | Done where it pays. Insertion sort, tour cache (byte-identical). `rcScan` already used an insertion sort. The 1.5x quarter-plan target is not met. |
| G explain and UI | Done. Tier chips, proven-shortfall note, Keep searching command. |

## Options and the evidence behind each default

Paired runs on seeds not used for tuning. Cost change is vs the default engine; negative is better.

| Option (`P.` key) | Default | Fast quality | Balanced quality | Decision |
|---|---|---|---|---|
| `chain` 0.1 | on | field -5.3% (15 of 15 better), retail -1.1%, care -0.2% | field -0.9%, retail +0.6%, within noise | On |
| `hung` 0.01 | off | adds nothing over chain, +6 to +30% time | field -1.3% +/- 0.6, retail flat, +5 to +13% time | Opt-in |
| `dswap` | off | 7 better / 8 worse | 8 better / 7 worse | Opt-in |
| `layout:'flow'` | off | retail -0.8% (13 of 15 better), care -0.4%, field flat | all within noise | Opt-in |
| `hot` | off | no effect (hot sets are empty once H and I are 0) | same | Opt-in |
| `polishMix` | off | no effect on the templates (mix term off) | same | Opt-in |
| `reheat` | off | 4 better / 1 worse | 3 better / 11 worse | Opt-in |
| `la` | off | 7 / 8 | 7 / 8 | Opt-in |

Every option passes drift, oracle, determinism and no-hard-cost checks (`node tests/run.js moves`).

## Golden changes

- Staffing-aware construction: `docs/golden-changes-phaseD1.txt` (care only).
- Chain default: `docs/golden-changes-chain.txt` (30 of 40 changed, 19 better and 11 worse, total cost -0.30%, no hard cost, every seat still filled).

## Behaviour changes to be aware of

- Coverage and hard rules now always outrank soft preferences, so plans that used to leave seats open to dodge soft penalties now fill them.
- The old `capacity` warning could overstate shortage for run/rest patterns. The corrected formula and the exact DP remove those false alarms.
- History-suite costs differ slightly from the original (all lower) because the chain move changes the search path.
- About 9% more time per move on retail, 2% on the quarter plan.

## Findings the plan got wrong or missed

- Tier mixing shows up through `pairs`, not `fair`.
- A fixed `T0=8` is already near-optimal; the plan's median formula would hurt.
- Counting only real proposals just relabels the budget.
- `sMin` is soft in the engine, so it is a warning, not a proof.
- The rest-capacity formula in `compile` was wrong.
- A person on two seats of one visit cost a hard penalty with no issue shown.
