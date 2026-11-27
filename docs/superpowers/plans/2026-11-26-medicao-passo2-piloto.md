# A medição das lutas, passo 2: o piloto — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the second robot, the PILOTO — a good player who takes real damage, sees with a fixed reaction delay and dodges any boss — calibrated on today's Capitânia with the median hand (spec §5: 1–2 lives lost per fight, most of them in the fury).

**Architecture:** a Playwright script (`scripts/_rebalance/robo/piloto.mjs`) that installs, in the page, a per-frame controller on the Game scene's `postupdate`: a 1 s history of every threat box with its velocity (the enemy shots, the live enemies, the boss's `perigos`, the boss's body), the decision on the snapshot `REACAO` ms old (threats born after it are not seen yet) extrapolated in straight lines, a set of reachable candidates (16 directions × 2 reaches in 0.5 s + stay + the goal), the cost = predicted danger + distance from the line of the weak point + a penalty for passing behind the boss, the ship moved toward the best at its own max speed, and the fire key pressed only when the weak point is on its line (and never into the Beast's thirst). A death does not end the fight: `gameOver` is replaced by a counter that gives the lives back.

**Tech Stack:** Playwright, Phaser 3.90 Arcade (in-page), the recorder of step 1 (`window.__registro`).

## Global Constraints

- Spec `docs/superpowers/specs/2026-11-26-medicao-das-lutas-design.md` §4.2 and §5.
- The ship moves by sprite position, at most `body.maxVelocity` px/s; never `body.reset`.
- No change to `src/` in this step (the robot lives in `scripts/`).
- The reaction delay is the ONE calibration knob; once set on the Capitânia it is frozen for every fight.

---

### Task 1: the piloto

**Files:** Create `scripts/_rebalance/robo/piloto.mjs` (uses `comum.mjs`).

- [ ] `--chefe --mao --reacao <ms, default 250> --teto <game s> --saida <json> --parado` (`--parado` = the controller sees but never moves: the sanity check that the threats are real).
- [ ] The controller as in Architecture; the fire key by `KeyboardEvent` on `window` (`keyCode` 32 defined on the event), pressed/released only on change.
- [ ] Output: the recorder's summary + `mortes` (times the lives reached 0).

### Task 2: the sanity checks

- [ ] `--parado` on the Capitânia, median hand, for its whole fight time: it takes blows (≥ 3) — the threats reach a ship that does not move.
- [ ] The piloto on the Capitânia, median hand, at 250 ms: it finishes the fight, fires with ≥ 50 % accuracy, and takes fewer blows than `--parado`.

### Task 3: the calibration

- [ ] The Capitânia, median hand, 3 runs at each of 150 / 250 / 350 ms; the table (lives per fight, per phase, per cause).
- [ ] Pick the delay whose mean is 1–2 lives with the majority in `capitania2`; write it as the default in `piloto.mjs` and in the spec §9.
- [ ] Report the table to him (pt-br).
