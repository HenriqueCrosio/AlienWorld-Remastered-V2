# Serpente do Casco — AI behaviour sketch (Phase 2, ai-programmer)

> Status: DESIGN SKETCH, no code. Source of truth for numbers: `design/gdd/serpente-do-casco.md` (APPROVED 30/10:
> 1-A underground, 2-A four forms A50→B50→C30→F80, 3-A free-flying fusion, ≈ 85 s). Variable names follow the GDD.
> Module/file names below are PROPOSED and must be reconciled with the gameplay-programmer's integration sketch
> (`docs/architecture/serpente-do-casco-sketch.md`): this document owns *what the boss decides and when*; that one owns
> *how the decision becomes sprites, clips, bodies and bullets*.

---

## 1. Behaviour architecture

### 1.1 Choice: a pure "brain" with four layers

```
 GameScene ──update(dt, ship)──▶ BossSerpente (Phaser view, integration sketch)
                                   │  Percepcao {t, ship x/y/vx/vy, shipHitAt, damage events}
                                   ▼
                         ┌──────── Cerebro (pure TS, no Phaser) ────────┐
                         │ Relogio  fixed step h = 1/60 s, accumulator   │
                         │ Diretor  HP → aperto, furies, transitions,    │
                         │          post-hit breather, fast-cue budget   │
                         │ Arbitro  ONE telegraph token + area leases,   │
                         │          threat ledger (for tests/probes)     │
                         │ Forma*   A / B / C / Fusao controllers (scripts│
                         │          of verbs; scaffold; site choice)     │
                         │ Verbos   V1..V6 + Dente + Repouso/Volta/       │
                         │          Espreita/Transicao/Rasgo (small FSMs) │
                         └──────────────────┬───────────────────────────┘
                                            ▼
                  Intencoes {corpo shape, vulneravel, pista (cue), lombada, clip key+progress,
                             head pos, events: abrirToca/estourar/disparo/trocarArte/rasgo/mordida/morte}
```

- **Why a pure brain.** The probes and `scripts/test-serpente.mjs` must drive the fight deterministically and check
  timing invariants in Node. Today's `BossSerpente.ts` interleaves decisions, Phaser objects and `Math.random()`, so none of
  it is testable without a browser. Splitting it out keeps all decisions in plain data plus pure step functions. Node imports `.ts` directly
  (`test-serpente.mjs` already does), so the brain must use **erasable TS only** (no `enum`, `namespace`, or parameter
  properties; use `import type`).
- **Why verbs as FSM tasks under form controllers (not one big FSM, not a behaviour tree).** The GDD *is* a verb
  vocabulary (V1–V6) reused by four forms with per-form numbers. A shared verb library with parameters avoids the
  patch-grown mega-FSM. Form controllers are short scripts (a loop and a scaffold), which suits authored, learnable patterns.
  A BT would add indirection without adding value: there is no reactive priority selection here, only sequencing plus global gates.
- **Why a separate Arbitro.** The rules that make the fight fair cut across all forms: §0.8 mutual exclusion, §0.5 read budget,
  the 1-in-3 fast-cue cap, the post-hit breather and the rain's area lease. Putting them in one gate makes each rule an
  invariant that holds *by construction* and a ledger that tests can assert, instead of a property every controller must
  remember.
- **Authority.** The brain is authoritative for: head position (from clip key + progress + the per-frame head table in
  `gestoSerpente` data, which is pure JSON), the lethal shape, `vulneravel`, hole registry (the model; `cascoVivo` renders it),
  bullet *intents*. The view never decides timing. One shared pure `balistica` (straight-line kinematics) is used by the
  brain for T_cue predictions and by the Node sim to integrate bullets; in game, Phaser bullets from the shared pool fly the
  same lines.

### 1.2 Clock and randomness (determinism)

- `Relogio`: accumulator over Phaser's `dt`; steps of **h = 1/60 s** (the probes' own step), max 5 steps/frame (the
  remainder carries over). Every duration is converted ONCE to steps with `n = ceil(d/h − 1e-9)`: **quantisation can only
  lengthen a cue, never shorten it** (load-bearing for the 0.09 s margin of F8 and the 0.45 s double band).
- `Sorte`: seeded mulberry32 owned by the brain, seed injected by the scene (probe sets it; game uses `Date.now()`).
  Two streams: `decisao` (sites, gaps, posts, φ) and `fala` (cosmetic choices the view may ask for). Particles and other
  pure-visual randomness stay on the view's `Math.random`, so changing an effect never perturbs decisions.
- **Parameters are sampled at verb entry** (aperto, fury, T_trava…) and frozen in the verb instance. A telegraph is never
  re-timed mid-read (invariant I6).

### 1.3 Inputs the brain needs (Percepcao)

| Field | Source | Note |
| --- | --- | --- |
| `t`, step index | `Relogio` | — |
| ship `x, y` (+ `vx, vy` for the probe-player sim only) | `target` sprite | already passed to `update` |
| `shipHitAt` | **NOT AVAILABLE today** (`GameScene.invulnerableUntil`/`damageShip` are private) | see §7 BLOCKED-1 |
| damage events `{amount, source}` | `BossSerpente.hit()` forwarded | brain applies only if `vulneravel` at that step |
| clip metadata (frames, head per frame, cut line) | `gestoSerpente` data | pure JSON, loaded by both the game and Node |

### 1.4 Outputs (Intencoes, one per step)

`corpo` ∈ `nada | coluna{x, yTop, r=16.5} | cabeca{x,y,r} | cabecaPescoco{x,y,r=18.9, neck 36 px} | semLetal` plus
`absorvedores` (other heads/necks: shots absorbed with a spark, no contact damage). The output also carries `vulneravel: bool`, `pista`
(public cue: `{kind: poeira|poeiraGrossa|ambar|branco|boca|chuvaAviso|olhos|faixa, x, y, geometry}`), `lombada {x, cor, espessura}`,
`clip {key, progress 0..1, dir}`, `cabeca {x,y}`, and a step event list. **The probe players read `pista`, the same thing the
human sees, never internal timers.**

### 1.5 The Arbitro (scheduler) rules

1. **One telegraph token.** A verb must hold the token from its *first unequivocal cue* to its *commit* (table §2.0). If the
   token is busy, the requester waits in a harmless state (`ESPREITA` underground; continued patrol/idle when exposed).
2. **Post-hit breather.** No token grant in `(shipHitAt, shipHitAt + respiroPosDano]` (0.8 s). An open telegraph is never
   cancelled or shortened by a hit; only the *next* grant waits.
3. **Area lease (rain).** After a rain commits, the next grant must satisfy
   `t_grant + T_cue_min(next) ≥ leaseEnd`, where `leaseEnd = lastWaveSpawn + (151 − y_spawn)/v_gota` (the last wave's drops
   reach the crest). Aimed shots already in flight hold no lease (they are "background" once fired, per §0.8).
4. **Fast-cue cap (§0.5).** The ledger keeps the last 3 *aimed* threats (V1, V3, V4, V5, V6, Dente; amber hops are
   excluded, being safe by distance). In B, C and F, if granting a threat with `T_cue < 0.80` would make 2 of the last 3 fast, the Arbitro
   **stretches** its cue phase (T_trava, LUZ) up to the threshold within the verb's slack, or defers it; it never shortens.
   In A every threat must be ≥ 0.85 (static check + runtime assert).
5. **Background shots** (A's REPOUSO) fire only when the token is free and no lease is active.
6. **Ledger.** Every grant logs `{t, form, verb, kind, T_cue_planned, segundaDePadrao, shipX, shipY}` and every commit/contact
   logs its step. Tests and the probe read the ledger (`window.__serpente.ledger`).

---

## 2. Verbs as state machines

### 2.0 Common conventions

| Verb | Token acquired at | Commit (token released) | T_cue measured from → to |
| --- | --- | --- | --- |
| V1 Bote travado | `SEGUE` entry | end of `BOTE` | `SEGUE` entry → `BOTE` entry (conservative earliest contact) |
| V2 Salto | `RACHA` entry | end of `BOTE` | safe by distance (predicate I4b), not a T_cue threat |
| V3 Chuva | `AVISO` entry | last wave spawned (+ lease) | `AVISO` entry → first drop at ship y |
| V4 Leque / Dente A | `LUZ` entry | fire | `LUZ` entry → arrival at D (F8) |
| V5 Rajada | `LUZ` entry | last shot | `LUZ` entry → 1st shot arrival; shots 2+ are "2nd of pattern" |
| V6 Faixa | `MIRA` entry | end of `LANÇA` (end of 2nd band in Fury 2) | `TRAVA` entry → head reaches ship x (F3) |

Body states: `nada` = hidden: no contact, no damage, shots pass. `semLetal` = dying chain: shots absorbed, no contact
damage. Damage only when `vulneravel` = live skull circle **and** skull ≥ 6 px above crest (forms) / always (fusion),
**and** not immune.

**Cancellation (all verbs):** `morteCabeca` → release the token at once. Then:
- verb in a hidden state (`CORRE/SEGUE/TRAVA/RACHA/ESPREITA`): the cue drops (white/amber vanish), the crack heals in 1.5 s, and Transicao starts underground;
- verb exposed (`BOTE/JANELA/AFUNDA`, rain on post): `recolher` → `MORTE_CABECA` in place.
- `shipHit` → no cancel (rule 1.5.2).
- `formaMorta` mid-dente → the pending shots are dropped.

### 2.1 V1 — Bote travado (A, B Pinça, C hop 3)

| State | Duration | corpo | Lethal | Cue | Entry / exit |
| --- | --- | --- | --- | --- | --- |
| `MERGULHO` | Δy/380 | cabeca → nada below crest | head | — | from exposed pose; clip reversed |
| `CORRE` | \|x₀ − x_alvo\|/`v_corre` | nada | no | `poeira` grey | `x_alvo = travaX(x_ship)` = max(80, x_ship) at entry |
| `ESPREITA` | until token | nada | no | `poeira` grey, bump drifts ≤ 60 px/s toward the ship's x | only if the grant is refused |
| `SEGUE` | `T_segue` | nada | no | `poeiraGrossa` (grows) | **token**; bump follows x_ship at ≤ `v_segue`, clamped [80, 320] |
| `TRAVA` | `T_trava` | nada | no | `branco` tip + white sparks | x frozen = `x_lock`; tip stops |
| `BOTE` | Δy/`v_bote` | **coluna** (x_lock, skull→216, r 16.5) | column | burst | `estourar(x_lock)`, `abrirToca(form)`; height = `alturaDoBote(y_ship@TRAVA end)`; **commit** at end |
| `JANELA` | `janela` | cabeca | head only | — | starts `Dente(form)` at its offset |
| `AFUNDA` | Δy/380 | cabeca → nada | head | — | toca A heals 2.5 s after `nada` |

Per form: A `T_segue` 0.40 / `T_trava` lerp(0.60, 0.55) / janela 1.7 / Dente A; B 0.40 / 0.50 / 1.2 / leque 5;
C 0.25 / 0.40 / 0.9 (last of chain) / rajada 3.

### 2.2 V2 — Salto de toca (B beat 2, C hops 1–2)

`AFUNDA` → `CORRE` (to `site`) → [`ESPREITA`] → `RACHA` (**token**, `ambar` glow at site, `T_racha` 0.35 B / 0.40 C) →
`BOTE` (coluna at site; commit) → `JANELA` + Dente → `AFUNDA`.
- **Site re-validated at RACHA entry** (the ship may have moved during CORRE). If the site breaks its rule (§3.4), re-pick
  with the same rule; the bump runs on (CORRE again, harmless). Amber is never shown under the ship.
- Bote height: **post of the form** drawn from {low, mid, high} without repeating the previous (so the player
  re-aligns vertically, per §5 "mira vertical"). See §7 OPEN-3.
- Reusing an open hole (< 60 px): no new crack; the amber glow is drawn on the hole's lip (the cue is never skipped).

### 2.3 V3 — Chuva (A: 3 waves; B: 2 waves)

| State | Duration | corpo | Cue | Notes |
| --- | --- | --- | --- | --- |
| `SOBE` | Δy/320 to high post | cabeca(s) | — | A from rombo; B emerges at a §3.4 site first |
| `AVISO` | 0.7 (1.0 the first rain of this fight) | cabeca(s) | `chuvaAviso`: live mouths lit, each its colour | **token** |
| `CUSPE` | 0.45 | cabeca(s) | — | 3 drops/live head up at 320 px/s ±0.18 rad (seeded) |
| `ONDAS` | (nWaves−1)·0.55 + 1 step | A: holds high post; B: `AFUNDA` 0.3 s in parallel | — | **commit** at last spawn; lease starts |

Gap selection (seeded `decisao`): wave 1 start slot `g₁` ∈ [0, 8] restricted to slots whose free-corridor centre is
within reach `R = v_s·max(0, t_toShipY − t_react) + 33` of x_ship at `CUSPE` end; fallback = slot nearest to x_ship.
Wave k: `g_k = clamp(g_{k−1} + U{−deriva..+deriva}, 0, 8)` (A deriva 1, B 2). Pool `get()` null → the drop is lost: the gap only widens.

### 2.4 V4 — Leque (B dente, C pause, Fusion)

`LUZ` (**token**, `boca`, 0.40 s; dente-B 0.40 = +0.3→+0.7) → `SAI` (n shots over α centred on the ship direction at
fire time; commit). Guard: at fire, if D(head, ship) < `D_min` (F8: 31 px) the fan is skipped and logged. The ship is inside contact
range then anyway.
Per use: B n5/48°/155; C pause n4/40°/150 (light +0.1, fire +0.5); F n7/64°/170 → Fury 1 n9/72°.

### 2.5 V5 — Rajada (C dente, Fusion)

`LUZ` (**token**, 0.40) → `TIROS` (n shots at 0.12 s spacing, each re-aimed at the ship's current position; commit after
the last). C n3/175; F n4/190. In C the light starts **at BOTE entry** so it fits the 0.5 s window (§7 CONCERN-2).

### 2.6 Dente A (3 aimed shots)

V4 variant: n3, ±14°, 140 px/s, `LUZ` at window +0.5, fire at +0.9.
- **Breather shift:** `LUZ` ≥ `shipHitAt` + 0.8.
- **Skip:** if fire would land later than `janela − 0.15`, skip this window (the ship is invulnerable for 1.4 s anyway). The same rule applies to every Dente.

### 2.7 V6 — Investida em faixa (Fusion)

| State | Duration | corpo | Cue | Rules |
| --- | --- | --- | --- | --- |
| `MIRA` | `T_mira` 0.55 | cabecaPescoco | `olhos` growing | **token**; Lissajous parameter **frozen**; head moves to (292, y_ship) at ≤ 140 px/s |
| `TRAVA` | `T_trava_faixa` 0.45 (Fury 1: 0.42) | cabecaPescoco | `faixa` white pixel row 292→x_fim | `y_faixa` frozen; `x_fim = clamp(x_ship − 12, 60, 220)` frozen here; **guard G6** |
| `LANÇA` | ramp 0.12 + travel at 380 | cabecaPescoco (lethal) | faixa | **commit** (non-Fury-2) at arrival |
| `SEGURA` | 0.35 (Fury 2: 0.45) | cabecaPescoco | Fury 2: 2nd `faixa` at `y₂ = y_ship@SEGURA entry`, x_fim→292 | head does NOT move during SEGURA (keeps T_cue₂ ≥ 0.45) |
| `VOLTA` | ≈ 1.3 at 150, eased | cabecaPescoco | — | back to the frozen Lissajous point, then the parameter resumes (no jump) |
| `VOLTA_LETAL` (Fury 2) | hitch to y₂ at 380, then x_fim→292 at 260 | lethal | faixa 2 | **commit**; then `VOLTA` to the patrol point |

- **Guard G6 (read budget):** at `MIRA` entry, predict `T_cue = T_trava_faixa + max(0, 0.12 + (292 − x_ship − 23)/380)`.
  If it is < 0.56, swap this slot for a V4 Leque and log it. The cutoff is x_ship > 269 at T_trava 0.45 and x_ship > 261 in Fury 1
  (0.42), which is inside her patrol zone. Re-check at TRAVA entry; if the check fails there, abort to `VOLTA` with no band.
- Fusion dies mid-band: path frozen, `semLetal`, the band and trail fade in 0.2 s, token released, then death (§4.4).

---

## 3. Form controllers

Each controller is a script of verb slots plus a scaffold for cycle 1. It samples `aperto = 1 − PV_forma/PV_max` at each
**slot start**, and asks the Arbitro for grants. Waiting is always visible movement (grey bump, posts, patrol), never a freeze.

### 3.1 Form A — "A Moradora"

- **Loop:** `REPOUSO` → `V1` → `VOLTA` → `V3(3)`.
- **Scaffold (cycle 1):** `REPOUSO(1.6, breath, no shots)` → `V1` → `VOLTA` → `REPOUSO` → `V1` → `VOLTA` → `V3(3, aviso 1.0)` → then the loop.
- `REPOUSO` = lerp(1.6, 1.0, aperto). She sits whole in the rombo and changes post every U(0.8, 1.2) s, never repeating
  (seeded). Background shot every 0.8 s, rotating cyan→green→orange among the heads, each with an erguer gesture of 0.25 s.
- `T_trava` = lerp(0.60, 0.55, aperto).
- `VOLTA`: the bump returns to the rombo at 300 px/s, then the clip rises to the low post (0.3 s exposed).
- Holes: A size, max 2 (a 3rd closes the oldest), heal 2.5 s after she leaves. A bote whose x_lock is within 60 px
  of the rombo emerges **in the rombo** (`doRombo`).
- Lethal contact in `REPOUSO`/`VOLTA`: live head only; the other crania and the necks are absorbers (§7 OPEN-6).

### 3.2 Form B — "A Caçadora" (metronome with slip)

- **Bar:** `Pinça (V1)` → `Salto (V2)` → `Chuva de 2 (V3)`, repeat. She never returns to the rombo to rest. The rombo is only a hop site.
- **Beat = the emergence instant** (BOTE entry; for the rain, SOBE entry). The nominal beat k+1 = beat k + `T_b`, with
  `T_b` = lerp(2.8, 2.0, aperto) sampled at beat k.
- The next verb's pre-phases are **back-scheduled** from the beat (AFUNDA + CORRE + cue).
- **Slip rule:** a beat may come *later* than nominal, never earlier. It slips when any of these holds:
  - (a) the window would be shorter than `dente.fire + 0.15`;
  - (b) the token, lease or breather refuse the grant;
  - (c) CORRE needs longer (a distant site).
  This yields the GDD's "useful window = T_b − 1.0" for the Pinça and Salto windows. The bar runs ≈ 9.2 s early and ≈ 7 s late, plus any lease slip (§7 OPEN-1).
- **Scaffold:** `RESPIRO` (transition) → `Pinça` isolated (the new verb for B is the beat itself and the fan dente) →
  one empty beat (bump prowls) → then the full bar. The B rain is the first *2-wave drifting* rain: it uses `aviso` 0.7.
- Holes: B size, persist to end of form, max 4. At the cap, site choice prefers open holes. A V1 lock that is > 60 px
  from every open hole closes the oldest (1.5 s heal).

### 3.3 Form C — "A Fugitiva" (convergent chain)

- **Loop:** `Chain` = V2(x₁) → V2(x₂) → V1c(x₃) → `JANELA` extension (+0.4, total 0.9) → `PAUSA` (stays in the last hole: V4
  n4/40°, light +0.1, fire +0.5; 1.0 s exposed).
- At chain start: `x₁ = min(x_ship + 90, 320)`, `x₂ = min(x_ship + 45, 320)`, frozen. `x₃ = travaX(x_ship)` at TRAVA
  (`T_segue` 0.25, `T_trava` 0.40, the white one).
- Each emergence fires Rajada 3 with LUZ at BOTE entry.
- **Tightening** `T_hop` = lerp(1.30, 1.15, aperto): the 0.15 s comes from janela 0.50 → 0.40 and `T_racha` 0.40 → 0.35
  (racha ≥ 0.35 floor). CORRE is geometry, not tuned.
- **Degenerate geometry:** if x_ship ≥ 275, then x₁ = x₂ = 320, so the chain collapses to V2(320) → V1c (2 hops).
- **Merge threshold:** x₁ and x₂ are always 45 px apart, so the GDD's "< 60 px merge into one" would fuse them. In C the merge
  distance is therefore **40 px** (≈ 2 × 22 half-width); A and B keep 60 (§7 CONCERN-4).
- **Scaffold:** `RESPIRO` → one Chain with **no** Rajada dente on hops 1–2 (the convergence is the novelty; the burst is
  introduced on hop 3) → `PAUSA` → full loop.
- Holes: C size, persist; max 5; the 6th closes the oldest in 1.5 s.

### 3.4 Site selection (B Salto, B rain emergence, transitions) — deterministic

1. Candidates `{190, 240, 300}`, plus the last lock x, plus the open holes of this form.
2. **Valid** if `x ≥ x_ship + 70`, merged with any open hole < 60 px away.
   - **Relaxation:** if x_ship > 270, a site counts as valid when `|x − x_ship| ≥ 70` on either side, still with `x ≥ 80`.
   - **C chain rule:** a site counts as valid when `x − x_ship ≥ d_col + 8` (39 px) at RACHA entry (§7 CONCERN-3). Otherwise it is shifted to
     `x_ship + 45` (≤ 320); if that is impossible, skip to hop 3.
3. Exclude the previous site, then pick the **farthest** valid one from the ship.
4. **Tie-breaks:** an open hole beats a fresh crack, then the lower x.
5. **Fallback:** if no site is valid, use the rombo (300).

Transition emergence uses the **nearest** valid site instead: A→B uses the 70 px rule; B→C uses `min(x_ship + 90, 320)`.

---

## 4. Transitions and the fusion

### 4.1 Transicao (A→B, B→C) ≈ 2.6 s + respiro

| State | Duration | corpo | Notes |
| --- | --- | --- | --- |
| `MORTE_CABECA` | 0.55 | semLetal, immune | token dropped; verb cancelled; chain of bursts + bites (events) |
| `DESCE` | 0.45 | → nada | sinks into the current hole or rombo. `trocarArte(next)` is emitted **only once `corpo = nada`** (I9) |
| `LOMBADA_FERIDA` | 0.8 (≥ CORRE to site) | nada | grey + dark/amber thread; harmless; to the §3.4 transition site |
| `EMERGE` | clip of the new form | cabeca | damage on (skull rule); no lethal cue |
| `RESPIRO` | `respiro` 1.2 (1.0–1.5) | exposed | Arbitro **locked**: no grants, no background shots (I10) |

Overkill damage does not carry over to the next form.

### 4.2 Rasgo (C→Fusion) ≈ 5.5 s

`MORTE_CABECA` 0.55 → `DESCE` 0.45 → `TRES_LUZES` 1.2 (three coloured bumps converge on the rombo; harmless) → `INCHA`
1.0 + `SILENCIO` 0.4 → `RASGO` (events: `estourarRombo`, `trocarFaixa('ruina')`, shake 0.5) → `SUBIDA` (clip
`fusao-subida`, 1.6, `semLetal`, immune) → `RUGIDO` 0.6 (ease from clip end to the first Lissajous point L(τ₀),
φ seeded) → Fusion controller. The rombo leaves the site list forever.

### 4.3 Fusion controller

- **Patrol:** Lissajous F9 driven by a parameter τ advancing at rate `s` (1.0; Fury 1 = 1.25). The rate changes with no position
  jump. τ freezes during V6 and resumes after VOLTA. Head clamped to y ∈ [56, 100], x ∈ [207, 292].
- **Loop:** `PATRULHA+RAJADA` 2.0 (V5 LUZ at +1.0) → silence 0.6–0.8 → `V6` → silence → `LEQUE` 1.6 (V4 LUZ at +0.2, fire
  +0.6) → silence. Waiting for a grant = more patrol.
- **Scaffold:** `RUGIDO` → patrol 1.2 s (breath, no shots) → **V6 isolated** → silence 0.8 → loop from `PATRULHA+RAJADA`.
- **Furies** latch on HP change and apply at the **next slot start**:
  - Fury 1 (≤ 53 HP): rate 1.25, Leque n9/72°, `T_trava_faixa` 0.42.
  - Fury 2 (≤ 27 HP): the next V6 is double.
  - A fury never alters an in-flight verb (I6).
- **Mordidas** at 22/13/5 % of TOTAL HP: visual events only. The lethal shape (head + 36 px neck) does not change, for readability.
- **Plan B 3-C** (no flight): the same Fusion controller runs with `PATRULHA` → "hop-hunt" (FormaC-like hops with fusion
  numbers) and V6 disabled. Locomotion is a strategy object behind the controller, so the decision layer is unchanged.

### 4.4 Death

On death the path freezes and corpo becomes `semLetal`. The body falls 40 px over the rupture (trajectory only). All pending bullets intents are dropped, the
token is released, and `morte` is emitted. `pausaFinalMs` is the integration sketch's call.

---

## 5. Invariants (checkable) and probe expectations

### 5.1 Static checks (pure numbers from `numerosSerpente.ts`; extend `scripts/test-serpente.mjs`)

- S1 `T_cue` per form/verb ≥ `T_cue_min` (0.593 col / 0.560 band). V1: `T_segue + T_trava` at aperto 0 **and** 1. Fan/burst: F8 at
  D_min. Band: F3 over x_ship ∈ [10.5, 261]. The flagged "2nd of pattern" items must be ≥ 0.6·T_cue_min.
- S2 `bordaX − d_col ≥ 40`.
- S3 rain: free width ≥ 87, `v_req ≤ v_s`, `max_vao_inicio = 8`.
- S4 every form's slot durations quantised by `ceil(d/h)` are ≥ their nominal values.
- S5 Form A: all aimed threats ≥ 0.85.
- S6 HP sum = 210; Fury thresholds within the form.

### 5.2 Simulation checks (pure brain + Node kinematic ship; seeds 1..50; P0/P1/P2 policies)

| Id | Predicate (evaluated every step / on the ledger) |
| --- | --- |
| I1 | `tokenHolders ≤ 1` at every step; a background shot fires ⇒ the token is free and no lease is active |
| I2 | for every ledger threat, the measured `T_cue` (first-cue step → earliest-contact step, from the realised timeline) ≥ `T_cue_min[kind]`, or ≥ 0.6× if `segundaDePadrao` |
| I3 | B/C/F: in any 3 consecutive aimed threats, at most 1 has `T_cue < 0.80`. A: none < 0.85 |
| I4a | every V1 lock x ≥ 80; band `x_fim ≥ 60`; boss **body centres** never at x < 60 (bullets excluded: the rain spans 14–278 by design) |
| I4b | every amber RACHA: the §3.4 rule holds at RACHA entry |
| I5 | for every ship hit at `t_h`: no grant in `(t_h, t_h + 0.8]` |
| I6 | for every verb instance: realised cue-state durations = durations planned at entry |
| I7 | rain: each wave has a 3-slot gap; `|g_k − g_{k−1}| ≤ deriva`; g₁ within reach R |
| I8 | damage accepted ⇒ `vulneravel` (live skull, ≥ 6 px above crest for forms, not immune); hidden ⇒ 0 |
| I9 | `trocarArte` only on a step with `corpo = nada` |
| I10 | ≥ 1.0 s without grant or boss bullet after each `EMERGE`/`RUGIDO` end |
| I11 | the order of deaths is cyan → green → orange → fusion; 210 total |
| I12 | concurrent boss bullets ≤ 40 |
| I13 | determinism: same seed + same ship trace ⇒ identical ledger hash |
| I14 | `t_grant + T_cue_min ≥ leaseEnd` for every grant after a rain |
| I15 (pre-probe) | mobility from the head trace: relocations ≥ 40 px per 10 s: A ≥ 2.5, B ≥ 3.5, C ≥ 6; Fusion mean head speed outside bands ≥ 25 px/s; STR ≤ 0.25 |

### 5.3 Probe players (the Node sim first, then the in-game `_sonda-luta.mjs` as the gate)

All three read only `pista` and the bullets. The ship is kinematic (v 110, a 900, box 21×9). Lives are emulated as
contacts separated by ≥ 1.4 s.

| Profile | Policy | Expected (GDD) | Where the hits should come from |
| --- | --- | --- | --- |
| P0 parked | (110, 110), always firing | ≥ 8 contacts, ≥ 2 per form; dead before the end in ≥ 90 % | every V1/Pinça/hop 3 lock, the rain unless the gap lands on 110, the bands, the re-aimed bursts |
| P1 reader | latency 0.25 ± 0.05 (seeded); nearest safe side; re-aligns y with the head | 2–5 contacts (median ≈ 3), P95 ≤ 7, ≤ 2 per form | expected: the Fury 2 double band (0.45 < 0.25 + 0.31) ≈ 1; B's 79 % rain corridor; occasional burst |
| P2 perfect | 0 latency, knows the script | ≤ 1 | — |

- The sim also reports the duration per form; targets A 14–22, B 14–22, C 9–15, F 16–26, total 72–100 s.
- The sim also reports the raw exposure ratio (A 0.55–0.65, B 0.50–0.60, C 0.50–0.60, F ≥ 0.85).
- The damage source in the sim is a constant `DPS_ref` 5.5 applied while P1/P2 are aligned with a `vulneravel` head.

---

## 6. GDD edge cases → handling

| GDD edge case | Concrete handling |
| --- | --- |
| Ship camping x < 49 | `travaX` clamps to 80. The Dente fires every window, the rain covers x ≥ 14, and V6 `x_fim` follows the ship (≥ 60). |
| Ship over the hull band (y > 150) at lock | Column to y 216, no exception. `alturaDoBote` clamps to crest − 6. |
| Ship above head reach (y < 60) | `alturaDoBote` clamps to the high post. The rain's reach R shrinks with low `t_toShipY` (the punishment is by design). |
| Head killed mid-bote/hop | `recolher` → `MORTE_CABECA` in place (semLetal, so the dying column never kills) → Transicao. |
| Head killed during TRAVA/RACHA (hidden, so only via an exotic delayed damage) | Cue dropped, token released, crack heals 1.5 s, Transicao underground (no `DESCE` clip). |
| Bomb/missile while hidden | `vulneravel` false ⇒ 0 damage (I8). |
| Bomb/missile one-shots a form | Overkill discarded. The 0.55 s immunity is applied in `MORTE_CABECA`. `dano ≤ PV/3` is checked by the integration side. |
| Ship hit (1.4 s invuln) | Arbitro rule 2 (needs `shipHitAt`, §7 BLOCKED-1). Any Dente within 0.8 s is shifted or skipped. |
| Two holes < 60 px | Merge in the hole model: reuse the oldest; no new crack (the cue still shows). |
| Site < 70 px from the ship | §3.4 re-pick at RACHA entry; the fallback is the rombo. |
| Ship right of all sites (x > 250 / > 270) | §3.4 relaxation. C chain collapse (x_ship > 230). G6 swaps V6→V4 at x ≳ 261. |
| C chain with a moving ship | x₁, x₂ frozen, re-validated only for safety (§3.3); x₃ = travaX at TRAVA. |
| Fusion band with the ship at ceiling/floor | y_faixa = y_ship (16..200). The vertical escape is guaranteed in one direction (F4). |
| Fusion coil off-screen right | View concern. The brain clamps only the head (x ≤ 292). |
| Fusion dies during the band | §2.7 last line / §4.4. |
| Player loses a life | Brain state untouched. Only the breather timer follows `shipHitAt`. |
| Cards (`intocavel`, `absorver`, Dash) | Brain-agnostic. A hit absorbed by a card still calls `damageShip` → counts as a hit for the breather, if the signal is taken there (§7 BLOCKED-1). |
| Bullet pool full | Intent dropped by the view. Rain: the gap only widens (I7 checks intents, not spawns). |
| Degenerate: always high / right of bote / window-only | Covered by the rain, the Dente and the §3.4 site rules. Window-only is the expected play (ρ ≈ 0.5). |

---

## 7. Open questions, concerns, risks

- **BLOCKED-1 — ship-hit signal (shared system).** The 0.8 s breather (I5) needs `shipHitAt`. `GameScene.invulnerableUntil` and
  `damageShip()` are private and the `StageBoss` contract has no hook. Proposal for the main session: an optional
  `StageBoss.aoAtingirNave?(t)` called from `damageShip()` after the invulnerability gate. This would be a GameScene + Boss.ts change, so it is flagged, not
  designed here. Until then the brain runs with `shipHitAt = −∞` (breather inert) and I5 is skipped in game; it stays testable in the Node sim.
- **CONCERN-1 — Fusion SEGURA reward is behind the ship.** `x_fim = x_ship − 12` stops the head *left* of the ship, but the ship
  only fires right. Reaching a firing position (x < x_fim − ~20) needs ≈ 30 px leftward in 0.35 s, and is impossible when x_fim = 60.
  The "reward" may be unreachable. Game-designer to decide: e.g. `x_fim = x_ship + 40` (stops in front) or SEGURA 0.6 s.
- **CONCERN-2 — C window (0.5 s) cannot hold a 0.40 s light + 3 shots at 0.12 s.** Sketch: light starts at BOTE entry,
  shots at window +0.30/+0.42/+0.54 (the last in early AFUNDA, with the skull still above the crest). This is a deviation from "dente at ~60 % of
  the window with light inside it"; needs designer OK.
- **CONCERN-3 — C's x₂ = x_ship + 45 breaks §0.3(b) (≥ 70 px for unlocked holes).** Treated as the designed convergence exception
  with a safety floor of 39 px at RACHA entry. Confirm.
- **CONCERN-4 — the hole merge rule vs C's chain spacing.** The GDD merges holes < 60 px apart, but C's chain is designed at 45 px
  spacing. The sketch uses a 40 px merge distance in C only; confirm (or space the chain ≥ 60 px).
- **OPEN-1 — rain lease vs B's bar.** A strict lease (drops reach the crest before the next contact) is estimated to add ≈ 1.3 s per B bar
  (B ≈ 20–21 s, still within 14–22; the Node sim will measure it). The alternative is to let the Pinça lock while drops are still falling (breaks the spirit of §0.8).
- **OPEN-2 — B beat anchoring.** Beat = emergence instant, with slip-only elasticity. The GDD's "T_b − 1.0" table fits the Pinça and
  Salto windows; the Pinça's own pre-phase (≈ 1.55 s) slips the beat after the rain. Confirm this reading.
- **OPEN-3 — V2 bote height unspecified.** Default is a seeded non-repeating post (forces vertical re-aim). The alternative is the ship's height, as in V1.
- **OPEN-4 — first-gap reachability filter** (§2.3) is an AI-side fairness addition to "gap in a drawn place". Without it,
  a P1 far from a uniformly drawn gap can meet an unreachable corridor (the Node sim will measure how often) and miss the
  2–5 contacts target.
- **OPEN-5 — fury tell.** Fury 1 and 2 change behaviour with no specified cue. Suggest that the next mordida or a short roar (0.4 s) marks it.
- **OPEN-6 — contact lethality of the non-live crania in A/B.** Default: only the live head is lethal; the others absorb shots.
- **OPEN-7 — "first rain of the game" = first of this fight instance** (a stage retry shows 1.0 s again). Confirm.
- **RISK — clip time vs gameplay time.** The brain owns durations (BOTE = Δy/700 ≈ 0.1–0.3 s). The integration side maps the clip's 17
  frames onto that progress plus the window's erguer pose. If clips must play at a fixed fps, the timings change, and that must come back here.
- **RISK — budget.** ≤ 1 active verb + controller + Arbitro per step: negligible against 2 ms. Bullets are simulated by Phaser in game,
  by `balistica` only in the Node sim.
