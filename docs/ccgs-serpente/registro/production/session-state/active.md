# Session state — the Serpente review (CCGS, temporary)

> Read this first. Written 30/10/2026 by the main session, at the CCGS install. The CCGS is installed ONLY to review the
> Phase 3 boss end to end (models, animations, skills, the fight); afterwards it is removed
> (`docs/ccgs-serpente/INSTALADO.md`). The user speaks Brazilian Portuguese; answer him in pt-br.

## Why the CCGS

Three rounds on this boss did not converge. The user (30/10): *"Não estamos conseguindo chegar num acordo. Precisamos
rever o boss da fase 3 inteiro. Dos modelos, animações, skills etc."* He wants to test the CCGS on this boss alone, with
the full combat team (`team.size: small`).

## The boss today (all in the working tree, NOTHING committed since `14a6bcc`)

**SERPENTE DO CASCO**: the Phase 3 boss of a side-scrolling shmup.
- **The setting:** the player's ship flies left-to-right over the armoured back (the hull) of a colossal creature, the
  Leviathan.
- **Health:** 210 total.
- **The forms:**
  - **A**: three heads (cyan, green, orange). The vulnerable head is cyan.
  - **B**: two heads. The vulnerable head is green.
  - **C**: one head. The vulnerable head is orange.
  - **The FUSION**: the bigger one, art `serpente-fusao`.

  Each form's vulnerable head takes damage; the body and the other heads absorb shots. Killing a head swaps the art to
  the next form.

**The fight as implemented (S1 28/10 + S1b 29/10 + the review fixes 29/10 night):**
- **The arrival:** the hull band arrives whole (`serpente-rombo-inteiro`), the world brakes to a stop, the hull trembles
  and BURSTS open (the destruction engine, in its own pixels), and she rises whole through the breach (`serpente-rombo`
  + `serpente-rombo-labio` in front of her coils).
- **At rest in the breach:** three heights (sprite y 142/126/110 at x 300), breathing ±14 px. The ERGUER gesture
  (PixMiniMax, 17 frames, the heads rise and open their jaws) is her attack gesture there; shots leave from the shooting
  head's MOUTH, one colour per head: cyan→BLUE (a deep blue: cyan reads as the player's shot), green, orange→AMBER.
- **The charge "under the hull" (every form):**
  1. She dives into the breach.
  2. A crack runs along the hull to under the ship (a bump lifts the plates, a dark R3 fissure behind).
  3. The tip locks white for 0.55 s.
  4. She bursts out there and rises with the erguer.
  5. The window, 1.1 s.
  6. She sinks, the bump runs back, she re-emerges in the breach. The tear and the crack heal.

  B's charge is double (from the tear); C spits a close burst in the window.
- **The TRIPLE RAIN** (A and B, alternating with the charge): she rises, the mouths light up in their colours, each living
  head spits up, then one wave per head falls with a 3-drop gap that moves at most one slot per wave.
- **The death of form C:** she sinks into the breach, three coloured lights converge inside, and the fusion bursts out
  (today's fusion art, held in the breach; S2 was to free it).
- **The hit circle** sits on the drawn SKULL of the live head (the S1 one sat on the neck). The veins of the live head
  beat like a heart; a hit on it spits small flesh pixels.

**What the user said about it (keep these):**
- **LIKED:** the hull explosion at the arrival (*"ficou muito bom"*); the triple rain (*"adiciona uma mecânica que não
  tinha no jogo"*); the erguer, now as her attack gesture in the breach.
- **DISLIKED:**
  - everything else of the S1b (*"o restante ficou muito fraco e mal feito"*);
  - the "shadow" that hid her body when she burst from a tear: a dark square around her (*"precário e mal acabado"*,
    *"ficou feio"*);
  - before that, S1: the charge was the whole drawing sliding across the screen (*"Ficou a mesma coisa, só mudou a base
    e a distância da investida"*);
  - and from the start: *"muito engessadas"* (idle the whole fight), *"É um dos bosses mais fáceis"*.
- **HIS RULES for this fight:**
  - the player always lives to the LEFT of the serpent, so leave room to dodge;
  - the body stays hidden ONLY when she bursts out after the charge, never in her breach;
  - the bigger serpent (the fusion) should break free from the immobile form and become MOBILE, as the challenge of the
    second fight (*"ela se desgarra da forma imóvel e se torna mais móvel"*).
- **Pending his choice** (`docs/superpowers/folhas/2026-10-29/serpente-casco/revisao/revisao.html`): the emergence after
  the charge. It is a PixelLab clip already drawn CUT at the ground line: E2 (rise, undulating) + the erguer
  recommended, or E1. It comes out of a real torn-hull hole: H1 recommended, out of H1–H4. Raw files are in that folder's
  `cru/`.

## Scope update (30/10, when the CCGS started)

The user: *"Mesmo que a explosão do casco, a chuva e o erguer fiquem, se não passarem ou forem reformulados, tudo bem. O
interessante é agir na fase do boss da F3 inteira."* **Nothing above is sacred:** the liked pieces are candidates, not
constraints. The scope is the WHOLE Phase 3 boss stage: the arena, the arrival, every form, the fusion, the art, the
animations, the skills.

## Intent answered at `/reverse-document` (30/10) — the brief: `design/serpente-do-casco-brief.md`

- **The pillar:** one vulnerable head at a time stays; HOW it is marked, reached and attacks is open.
- **The forms:** free to restructure, **but keep the current form as a backup** (done:
  `docs/ccgs-serpente/backup-2026-10-30/`, restorable).
- **The movement:** ALL forms more mobile (not only the fusion).
- **The difficulty:** *"algo entre ser difícil pela leitura e um pouco de reflexo"*. The bosses are not yet scaled against
  each other.
- **The sound is OUT** until the whole game's balance is done (*"não precisamos de equipe de som por enquanto"*): the
  `sound-designer` is not spawned in `/team-combat`.

## Measures (practice run, `_sonda-luta.mjs`)

| | the fight | contacts | shots taken |
| --- | --- | --- | --- |
| parked player (S1b) | 42.0 s | 7 | 10 |
| dodging player (S1b) | 41.7 s | 0 | 15 |
| before S1, parked | 24.9 s | 0 | 8 |

## Constraints

See `CLAUDE.md`: the GUARDRAIL (shared systems → stop and report to the main session) and the user's standing rules
(concept sheets before installing art, zoom checks, films for motion, no commits without him).

## Progress (31/10) — `/team-combat` Phase 3 M1 DONE, waiting the user's gate

- Phase 1: GDD `design/gdd/serpente-do-casco.md` APPROVED (1-A underground, 2-A four forms A50/B50/C30/F80, 3-A the fusion flies, ~85 s).
- Phase 2: architecture approved (`docs/architecture/serpente-do-casco-sketch.md` + `-ai-sketch.md`); 5 design adjustments approved;
  shared changes approved and done by the main session: G2 `ship.setData('golpeEm')` in `GameScene.damageShip`; G1 BootScene loads
  `serpenteEmergeA0..20`, veins/shadow, `serpenteTocaFundo/Labio/Fundura`. G7 (`pausaFinalMs` 1800) waits for M4.
- Git backup: branch `backup/serpente-s1b` (commit 99bad1c, authored by the user, not pushed).
- M1 (one hole, one clip): brain `src/entities/serpente/cerebro/*` (V1 `Bote`), body `src/entities/serpente/*`, art
  `dados/emerge.ts` (21 frames E2+erguer) + `dados/toca.ts` (H1, his pick), `cascoVivo` hole API + `labios` (no dark).
  Test mode only via `registry.serpenteM1` (default OFF; the normal fight is intact: probe-stage3, fusion, chefes all pass).
  Decisions: in the ROMBO she is never cut (uncut idle); tocas at x ≤ 170; the burst is gravel behind her (never the
  destruction engine — it draws over her).
- The sheet waiting for him: `docs/superpowers/folhas/2026-10-30/serpente-m1/m1.html`.
- Next: M2 (form A complete: REPOUSO/V1/V3 rain/VOLTA/dente, director, damage), after his OK.
