# Serpente do Casco — architecture sketch (code structure, data, assets, integration)

> Phase 2 of `/team-combat` (gameplay-programmer). **A sketch, not code.** It implements
> `design/gdd/serpente-do-casco.md` (APPROVED 30/10: 1-A underground, 2-A four forms A 50 → B 50 → C 30 → Fusion 80,
> 3-A free-flying fusion, target ≈ 85 s). The companion `docs/architecture/serpente-do-casco-ai-sketch.md`
> (ai-programmer) owns the **per-form state machines and their transition tables**; this file owns the boundary they
> plug into (`Percepcao` in, `Atuador` out), the Phaser side, the data, the asset contract and the integration.
> Where the two disagree on a name, the AI sketch wins on behaviour, this one wins on the interface; reconcile them at
> the start of Phase 3.
> No `docs/engine-reference/` exists in the repo: every Phaser API named here is from the 3.90 API as I know it,
> **unverified against reference docs** (marked ⚠️API).

---

## 0. The decisions in one screen

1. **The brain and the body are split.** The brain (the fight director plus one state machine per form, the verbs and the
   rules) is **Phaser-free** and runs in Node. It reads a `Percepcao` and acts only through an `Atuador` port. The
   Phaser body implements that port: one sprite, a clip player, the hitboxes, the overlays, the hull and the shots. The
   Node tests drive the real brain with a recording `Atuador`, so T_cue, mutual exclusion, pool peak and breathers are
   measured from the **actual state machines**, not from a copy of the numbers.
2. **The emergence pins the clip's ground row to the hole's lip. Height comes from the frame, never from moving the
   sprite.** While an emergence clip plays at a toca, the sprite origin is the clip's **anchor** (the throat's centre on
   the ground row), so `sprite.(x,y) = (toca.cx, crest + LUTA.labio.abaixo)`. The bote's height is chosen by holding the
   clip on the frame whose live skull is nearest the target y. Nothing of her is cropped or darkened. The toca's front rim
   is drawn in front of her by the living hull, using the **hull's own pixels** (`labios`), and that is what hides the
   straight cut.
3. **Per-frame lookups use the clip player's logical frame index, never the texture key.** The skull, mouths, veins,
   shadow, bite points and centroid are all read from generated per-clip data, indexed by
   `sprite.anims.currentFrame.index`. That retires the regexes on `serpenteErguerA7`-style keys, and the trap where the
   destruction engine's holed copies change the key.
4. **There is one sprite, one head target and one HP model for the whole fight, and the same objects all fight**
   (GameScene registers its overlaps once, at spawn). The body is shaped per mode (`nada / repouso / coluna / cabeca /
   pescoco`). `damage()` applies a **boss-local per-hit cap** of `floor(HP_form / 3)`, which fixes form C against the
   12-damage bomb without touching the bomb.
5. **The core loop needs zero edits to shared systems.** BootScene only has to **load** the new frame textures. The
   anims are registered boss-side and idempotently. Every other request is a confirmation or an optional one-liner (§5).

---

## 1. Modules (new / changed), one line each

Existing paths stay where GameScene and the scripts import them. New code goes in `src/entities/serpente/`.

| File | Status | Role |
| --- | --- | --- |
| `src/entities/BossSerpente.ts` | **REWRITE → thin shell (~300 lines)** | `StageBoss` implementation: owns the sprite, the head target, the HP bar and the parts. Runs the per-frame order (§3), plus `damage()` (gates + cap), `destrocos`, `mundo`, `pausaFinalMs`, `sonda` and the legacy probe fields (§6) |
| `src/entities/numerosSerpente.ts` | **CHANGED** | The single source of every tuning knob in the GDD's Tuning Knobs table (`LUTA`, `FORMAS`, `FUSAO`, `TOCAS`, `VERBOS`) plus pure formula functions F1–F11. `LUTA.faixa.largura` is kept (GameScene imports it) |
| `src/entities/cascoVivo.ts` | **CHANGED** | The living hull. Keeps: copy, crack, bump, gravel, tears, `estouroDoRombo`, `alargar`. Adds persistent tocas (merge, max open, oldest closes), the `lombada` style (`caca/ferida/ronda/luzes`), the `ponta` state (`cinza/ambar/branca`), **`labios`** (the toca rim in front of her, drawn from hull pixels) and the ruin re-copy. **Removes** the dark `frente()` strip |
| `src/entities/gestoSerpente.ts` | KEPT (generated) | The ERGUER data. It becomes the data of clip `erguer-{A,B,C}` (the gesture in REPOUSO, and the B/C placeholder) |
| `src/entities/serpenteFusao.ts` | KEPT | The static bite points (the fallback when the flight clip has no per-frame bites) |
| `serpente/tipos.ts` | NEW, Phaser-free | `FormaId`, `Cor`, `Vec`, `ModoCorpo`, `ClipeId`, `Telegrafo`, `Percepcao`, `Atuador`, `CerebroForma`, `EventoSonda`, `SondaSerpente` |
| `serpente/clipes.ts` | NEW, Phaser-free | `ClipeDados` type, the `CLIPES` registry (generated data plus fallbacks) and pure lookups: `pontoNaTela`, `quadroDaAltura`, `exposta`, `placeholderDe` |
| `serpente/dados/emerge.ts` | NEW, **generated** | Per-frame data of `emerge-A/B/C` and `fusao-subida`. Written by `scripts/_serpente/_emerge-instalar.mjs` |
| `serpente/dados/voo.ts` | NEW, **generated** | Per-frame data of `fusao-voo` (and the optional `fusao-investida`). Written by `scripts/_serpente/_voo-instalar.mjs` |
| `serpente/tocas.ts` | NEW, Phaser-free | The toca model: open, merge (< 60 px), persist or heal, max open, oldest closes. Site choice, C chain sites, the x > 270 relax rule |
| `serpente/cerebro/*.ts` | NEW, Phaser-free, **ai-programmer** | `diretor.ts` (arrival → A → trans → B → C → rasgo → fusion → death), `chegada.ts`, `formaA.ts`, `formaB.ts`, `formaC.ts`, `fusao.ts`, `transicao.ts`, `verbos.ts` (V1–V6 sub-machines) |
| `serpente/corpo.ts` | NEW, Phaser | `CorpoSerpente`: the sprite, the clip player (play, hold, reverse, ping-pong, duration), anchor swaps, velocity-only motion, body modes → Arcade rect, the head circle, veins/shadow/mouth glow/stump smoke |
| `serpente/arena.ts` | NEW, Phaser | `ArenaViva`: wraps `CascoVivo` and the breach strip and lip. Lombada and tip cues, dust and white sparks, tocas painting, the ruin swap, `arena.estourar`, the white band (`faixaBranca`) |
| `serpente/faixaBranca.ts` | NEW, Phaser | The fusion's white band, baked as native-res pixel particles on a CanvasTexture with a **never-reused key** (no vector Graphics) |
| `serpente/disparos.ts` | NEW, Phaser | Wraps the shared enemy pool: `tiro/leque/rajada/gota`. Always `body.reset` after `get()`; a null `get()` is safe. Tracks its own shots in a `Set` for the probe count and peak |
| `serpente/sonda.ts` | NEW, Phaser-free | The `SondaSerpente` snapshot builder and a 256-entry event ring |
| `serpente/gravador.ts` | NEW, Phaser-free | `AtuadorGravador`: the recording port for Node tests (and the offline timeline dump) |
| `scripts/_serpente/_emerge-instalar.mjs`, `_voo-instalar.mjs` | NEW | Install the frames: key out the background (see R7), measure the ground row, anchor, skull, mouths, centroid and bites, bake the veins and shadow, write `dados/*.ts` |
| `scripts/test-serpente.mjs` | EXTENDED | Pure plus sequence tests (§6) |
| `scripts/_serpente/_sonda-luta.mjs` | CHANGED | Reads `boss.sonda` instead of private fields. Runs profiles P0/P1/P2 |

**Node constraint (Node v24 type-stripping; `tsconfig` has `allowImportingTsExtensions`).** Phaser-free modules use
erasable syntax only: no `enum`, no namespaces, no constructor parameter properties. Value imports need explicit `.ts`
specifiers, and they may use `import type` only for anything Phaser-side.

---

## 2. Core interfaces (signatures only)

```ts
// serpente/tipos.ts — Phaser-free
export type FormaId = 'A' | 'B' | 'C' | 'fusao';
export type Cor = 'ciano' | 'verde' | 'laranja';
export interface Vec { x: number; y: number }
export type ModoCorpo = 'nada' | 'repouso' | 'coluna' | 'cabeca' | 'pescoco'; // pescoco = fusion: head + 36 px neck
export type ClipeId =
  | 'idle-A' | 'idle-B' | 'idle-C' | 'idle-fusao'
  | 'erguer-A' | 'erguer-B' | 'erguer-C'
  | 'emerge-A' | 'emerge-B' | 'emerge-C'
  | 'fusao-subida' | 'fusao-voo' | 'fusao-investida';
export type TipoTelegrafo = 'bote' | 'chuva' | 'leque' | 'rajada' | 'faixa' | 'salto';
export interface Telegrafo { tipo: TipoTelegrafo; letal: boolean; desde: number; x?: number; y?: number }

export interface Percepcao {
  t: number; dt: number;
  nave: Vec;
  naveGolpeadaHa: number;          // s since the ship was hit; Infinity if unknown (see request G2)
  cabeca: Vec;                     // the live skull on screen, last frame
  exposta: boolean;                // skull ≥ acimaDaCrista above the crest AND the target is collidable
  clipe: { id: ClipeId | null; quadro: number; acabou: boolean };
  hpForma: number; hpFormaMax: number; hpTotal: number; hpMax: number;
  tocas: readonly TocaInfo[];
  rnd: () => number;               // seeded (Phaser.Math.RND in game, a LCG in Node)
}
export interface TocaInfo { id: number; cx: number; meia: number; forma: FormaId; aberta: boolean; idade: number }

/** Everything the brain may do to the world. The Phaser shell implements it; `AtuadorGravador` records it. */
export interface Atuador {
  // the body
  clipe(id: ClipeId, o?: { de?: number; ate?: number; duracao?: number; segurar?: boolean; reverso?: boolean; vaivem?: boolean }): void;
  ancorar(onde: 'rombo' | { toca: number } | 'livre'): void;       // ground-row pin, or free (path)
  mover(alvo: Vec, vmax: number): void;                             // path target for the anchor: velocity only
  parar(): void;
  corpo(modo: ModoCorpo): void;
  visivel(sim: boolean): void;
  vestir(forma: FormaId): void;            // asserted: only while corpo = 'nada' and invisible (AC 6)
  alerta(sim: boolean): void;              // the veins' 1.0 → 2.5 Hz
  boca(cor: Cor | 'fusao', acesa: boolean): void;
  olhos(brilho: number): void;             // fusion: 0..1 eye glow (MIRA)
  // the world
  lombada(o: { de: number; ate: number; v: number; estilo: 'caca' | 'ferida' | 'ronda' | 'luzes' }): void;
  lombadaFim(): void;
  ponta(x: number, estado: 'cinza' | 'ambar' | 'branca'): void;
  pontaFim(): void;
  abrirToca(cx: number, forma: FormaId): number;                  // returns the toca id (merged id if < 60 px)
  fecharToca(id: number, emSegundos: number): void;
  tremor(ms: number, forca: number): void;
  rasgo(passo: 'incha' | 'estoura' | 'ruina'): void;
  cadeiaDaCabeca(): void;                  // the 0.55 s death chain on the live skull
  faixa(o: { y: number; x0: number; x1: number; estado: 'trava' | 'apaga' }): void;
  // the shots (shared pool)
  tiro(de: 'boca' | Cor, angulo: number, v: number, cor: Cor | 'fusao'): void;
  leque(n: number, aberturaDeg: number, v: number, cor: Cor | 'fusao'): void;   // aimed at the ship
  gota(x: number, y: number, vy: number, cor: Cor): void;
  limparTiros(): void;
  // the probe
  evento(tipo: EventoSonda['tipo'], dados?: Record<string, number | string>): void;
}

/** One form's state machine (ai-programmer). */
export interface CerebroForma {
  readonly forma: FormaId;
  readonly estado: string;                      // 'REPOUSO', 'MERGULHO', 'TRAVA', 'JANELA', 'MIRA', …
  readonly verbo: 'V1' | 'V2' | 'V3' | 'V4' | 'V5' | 'V6' | null;
  readonly telegrafos: readonly Telegrafo[];    // §0.8: at most one lethal open
  readonly alerta: boolean;
  entrar(p: Percepcao, a: Atuador): void;       // after the transition's emergence; the breather starts here
  passo(p: Percepcao, a: Atuador): void;
  recolher(p: Percepcao, a: Atuador): void;     // the head died mid-verb: drop lock/crack, sink where she is
}
export interface Diretor {
  readonly fase: 'chegada' | FormaId | 'transicao' | 'rasgo' | 'morta';
  readonly atual: CerebroForma | null;
  readonly danoValido: boolean;                 // false while entering / hidden / immune
  passo(p: Percepcao, a: Atuador): void;
  cabecaMorreu(p: Percepcao, a: Atuador): void; // the shell calls this when hpForma ≤ 0
}

export interface EventoSonda {
  t: number;
  tipo: 'cue' | 'trava' | 'letal' | 'janela+' | 'janela-' | 'dente' | 'forma' | 'vestir' | 'escondida' | 'dano' | 'absorvido' | 'respiro';
  dados?: Record<string, number | string>;
}
export interface SondaSerpente {
  fase: Diretor['fase']; estado: string; verbo: string | null; corpo: ModoCorpo; exposta: boolean;
  cabeca: Vec; sprite: Vec; centroide: Vec; clipe: ClipeId | null; quadro: number; soIdle: boolean;
  hpForma: number; hpFormaMax: number; hpTotal: number; hpMax: number; furia: 0 | 1 | 2;
  telegrafos: readonly Telegrafo[]; tocas: readonly TocaInfo[]; balas: number; balasPico: number;
  eventos: readonly EventoSonda[];
}
```

```ts
// serpente/clipes.ts — Phaser-free. All per-frame points are ART px from the clip's ANCHOR (the existing convention:
// FASES.cabeca is "art px from the art centre" = anchor at the centre).
export interface ClipeDados {
  id: ClipeId;
  prefixo: string;                 // texture prefix: prefixo0 … prefixo(N-1) (BootScene loads them)
  anim: string;                    // anim key, registered boss-side
  quadros: number; lado: { w: number; h: number };     // canvas (256² for the PixelLab clips)
  escala: number;                  // 0.55 heads / 0.63 fusion
  ancora: Vec;                     // canvas px → sprite origin (ancora.x / w, ancora.y / h) while the clip plays
  /** ground-cut clips: per frame, true = the art ends on the ground row (anchor.y); fusao-subida flips false at its end */
  cortado: boolean[];
  cabeca: Vec[];                   // the live skull per frame
  bocas: Partial<Record<Cor | 'fusao', Vec[]>>;
  centroide: Vec[];                // opaque-pixel centroid per frame (AC 11, STR)
  pico: number;                    // frame of the highest live skull
  bocaAberta?: [number, number];   // frames where the dente may fire
  janela?: [number, number];       // the window's sway segment (ping-pong)
  paraIdle?: Vec;                  // the last frame = the form's idle frame 0 at this sprite offset (seamless swap)
  mordidas?: Vec[][];              // fusion clips: neck/chin/skull per frame
  veias: boolean; sombra: boolean; // baked per-frame overlay textures exist
  fps: number;                     // nominal; the brain overrides with `duracao`
}
export declare const CLIPES: Record<ClipeId, ClipeDados>;
export declare function pontoNaTela(c: ClipeDados, quadro: number, p: Vec, sprite: Vec): Vec;
export declare function quadroDaAltura(c: ClipeDados, alvoY: number, chaoY: number, minY: number, maxY: number): number;
export declare function exposta(cabecaY: number): boolean;     // cabecaY ≤ crista − acimaDaCrista
export declare function placeholderDe(id: ClipeId, existe: (key: string) => boolean): ClipeId;  // art missing → fallback
```

```ts
// numerosSerpente.ts — added pure functions (F1–F11 plus the rules), all Node-tested
export declare function tClear(d: number): number;                          // F1
export declare function tCueMin(t: 'coluna' | 'faixa'): number;             // F3: 0.593 / 0.560
export declare function tCueBote(f: 'A' | 'B' | 'C', aperto: number): number;
export declare function tCueFaixa(xNave: number, furia: 0 | 1 | 2): number;
export declare function sobraEsquerda(): number;                            // F4
export declare function corredorChuva(f: 'A' | 'B'): { vReq: number; livre: number };   // F6
export declare function ondaDaChuva(inicioVao: number): number[];           // kept; `ate` 300 → 278
export declare function proximoVao(anterior: number, deriva: number, rnd: () => number): number;
export declare function lequeSeguro(D: number, n: number, alfaDeg: number, v: number): boolean;  // F8
export declare function patrulha(t: number, phi: number, furia: 0 | 1 | 2): Vec;                // F9
export declare function xFim(xNave: number): number;                        // clamp(x − 12, 60, 220)
export declare function aperto(hp: number, max: number): number;           // F10 and the lerps below
export declare function tTrava(f: 'A' | 'B' | 'C', aperto: number): number;
export declare function tBatida(aperto: number): number;
export declare function tHop(aperto: number): number;
export declare function repousoA(aperto: number): number;
export declare function furiaDe(hpFusao: number): 0 | 1 | 2;
export declare function golpeMax(f: FormaId): number;                       // floor(hp / 3): A 16, B 16, C 10, F 26
export declare function travaX(naveX: number): number;                      // kept; bordaX 60 → 80
```

```ts
// serpente/tocas.ts — Phaser-free
export declare class Tocas {   // (no parameter properties: Node strips types)
  abrir(cx: number, forma: FormaId, t: number): number;   // merge < 60 px; enforce max open (C: oldest closes in 1.5 s)
  fechar(id: number, t: number, em: number): void;
  fimDaForma(forma: FormaId, t: number): void;            // A heals in 2.5 s after she leaves; B/C persist to form end
  lista(): readonly TocaInfo[];
}
export declare function escolherSitio(naveX: number, anterior: number | null, tocas: readonly TocaInfo[]): number;
export declare function cadeiaC(naveX: number): [number, number];   // x1 = nave + 90, x2 = nave + 45, ≤ 320
```

---

## 3. Data flow per frame (`BossSerpente.update(dt, target)`)

| # | Step | Reads | Writes |
| --- | --- | --- | --- |
| 1 | Clocks: `t`, `imune`, the respite timer | — | — |
| 2 | Build `Percepcao` | ship, last frame's `CorpoSerpente` (skull, exposure, clip frame), HP, `Tocas` | — |
| 3 | **Brain:** `diretor.passo(p, atuador)` | `Percepcao` | `Atuador` calls, applied **synchronously** to body, arena and shots (a clip or anchor change takes effect now) |
| 4 | **Path:** `corpo.mover(dt)` | anchor mode, path target | `body.setVelocity` only. A pinned anchor gets velocity 0. A teleport (`body.reset`) is allowed **only** while invisible, asserted |
| 5 | **Body + hitboxes:** `corpo.sincronizar()` | `anims.currentFrame.index` → `ClipeDados` | Head target: `cabeca.body.reset(x, y)` plus `checkCollision.none = !(exposta && corpo ≠ 'nada')`. Sprite body rect per `ModoCorpo` (the `aplicarCorpo` math kept; `pescoco` = skull circle box + 36 px neck strip). Bobbin: no rect |
| 6 | **Veins / mouths:** `corpo.overlays()` | logical frame index | Veins and shadow textures `serpenteVeias{Clip}{i}` plus heartbeat alpha (`pulso`, `diretor.atual.alerta`). Mouth glow at `bocas[cor][i]`; stump smoke; fusion eye glow |
| 7 | **Hull:** `arena.update(dt)` | `Tocas`, lombada/tip state, her x-span this frame | `CascoVivo` repaint, `labios` against her span, dust and white sparks, the white band |
| 8 | Shots bookkeeping | own-shot `Set` | prune inactive, `balasPico` |
| 9 | HP bar, `sonda` ring flush | — | — |

**Invariants**

- Steps 3 → 5 run in this order, so the hitbox always matches the frame and pose the brain just chose. There is one
  frame of physics lag on velocity (as today).
- `sprite` and `cabeca` are the same objects all fight. `targets.length === 1` always.
- In GameScene the targets × bullets overlap is registered **before** the sprite × bullets absorb (it is today). In
  `cabeca` mode the head box sits in both, and the order is what makes the hit count as damage and not as absorption.
  The main session must not reorder it.
- `damage(n)` runs in this order:
  - gate on `dead | entering | imune > 0 | corpo === 'nada' | !exposta`;
  - `n = min(n, golpeMax(forma))`;
  - subtract from HP;
  - at `hpForma ≤ 0`, set `imune = LUTA.imunidadeTroca` and call `diretor.cabecaMorreu`;
  - it returns `true` only at the fusion's death.

---

## 4. Asset contract

**Loading.** BootScene **loads** the textures, with additive keys (request G1). The **boss registers the anims itself**
(`registrarAnims(scene)`, idempotent, keys `serpente-*`), including the derived segment and ping-pong keys. That keeps
BootScene's `ANIMS` table untouched.

| Clip | Texture prefix (file `sprites/…-{i}.png`) | Frames | Canvas | Anchor | Data | Status → placeholder |
| --- | --- | --- | --- | --- | --- | --- |
| `emerge-A` | `serpenteEmergeA` (`serpente-emerge-A`) | 17 | 256² | throat × ground row | `dados/emerge.ts` | install the raw **E2** (`folhas/2026-10-29/serpente-casco/revisao/cru/E2/0–16.png`) → none needed |
| `emerge-B` | `serpenteEmergeB` | 17 | 256² | idem | idem | NEW → `erguer-B` + **geometric crop at the ground row** (no dark strip; placeholder only, see C5) |
| `emerge-C` | `serpenteEmergeC` | 17 | 256² | idem | idem | NEW → `erguer-C` + crop |
| `fusao-subida` | `serpenteFusaoSubida` | ≈19 | 256² | throat (start) → `cortado[i]` false at end | idem | NEW → `idle-fusao` rising on a path (placeholder; violates 0.1, never shown as final) |
| `fusao-voo` | `serpenteFusaoVoo` | 9, **ping-pong** (the loop does not close) | 256² | art centre | `dados/voo.ts` (+ per-frame `mordidas`) | NEW → `serpente-fusao-fury` (existing 9 frames) |
| `fusao-investida` (opt.) | `serpenteFusaoInvest` | 9–12, hold last | 256² | art centre | idem | → `fusao-voo` at 1.8× for 0.45 s (GDD) |
| `rombo-ruina` | `serpenteRomboRuina` (image) | 1 | 318×100, same registration as `serpenteRombo` | — | — | → `serpenteRombo` + `estourar` the lip |
| veins / shadow | `serpenteVeiasEmerge{F}{i}`, `serpenteSombraEmerge{F}{i}` (C: veins only) | per frame | 256² | — | flags in `ClipeDados` | baked by `_emerge-instalar.mjs` (the `_veias.mjs` pipeline) |

**How a ground-cut clip sits on a hole**

- **The install script** finds the ground row: the lowest opaque row across all frames, which must be identical. It
  checks that no frame has opaque pixels below that row, and records `ancora = (throat x at that row, row)`.
- **At runtime**, the sprite origin is set to `ancora / lado`, and the sprite position to
  `(toca.cx, LUTA.crista + LUTA.labio.abaixo)`. The cut edge sits `labio.abaixo` px under the crest.
- **The cover.** `CascoVivo.labios` (depth 35, `W × (labio.acima + labio.abaixo)` rows) paints the toca's **front rim
  from the hull's own copied pixels** (the jagged plate edge of the tear geometry), only across her x-span. It is never
  the `ESCURO` colour.
- **The rombo** is the same mechanism with the rombo strip's lip row. In REPOUSO she shows whole with
  `serpenteRomboLabio` in front, unchanged.
- **Swaps between clips with different anchors** keep the registration point fixed. The last frame plus `paraIdle`
  equals idle frame 0, so the art never jumps. Swaps are measured by the install script.

**Height by frame**

- **Rise.** `BOTE` plays frames `0 … h` in `T_bote` (`duracao`; ⚠️API `play({ key, duration })` /
  `anims.pause()` on `ANIMATION_UPDATE`). `h = quadroDaAltura(...)` is the frame whose skull is nearest the ship's y,
  clamped to [crest − 6, the high post].
- **Window.** `JANELA` ping-pongs `[h − 1, h]`, or the clip's `janela` segment when `h = pico`.
- **Sink.** `AFUNDA` plays the clip reversed (⚠️API `playReverse`).
- **Requirements on the art** (to put on the concept sheet): the skull rises monotonically up to `pico`; the live head
  leads (§9).

**Before the art exists.** `placeholderDe` substitutes, so all code and the probe land first; the timings come from the
brain, not from the art. A missing veins texture hides the overlay, as today.

---

## 5. Integration points and FLAGGED shared-system requests (the main session decides; nothing edited by the team)

**Unchanged.** Constructor `(scene, enemies, fx, rombo, arena: ArenaSerpente)`, `StageBoss` (`sprite`, `targets`,
`isDead`, `damage`, `update`, `destroy`, `mundo`, `pausaFinalMs`, `destrocos`), `LUTA.faixa.largura`.

**`destrocos`.** `forma` = the form index (scars reset per art). `mira` = the per-frame `mordidas` of the current
fusion clip, else `MORDIDAS_FUSAO`, else the live skull. `zona` = the skull circle.

| # | System | Request | Kind |
| --- | --- | --- | --- |
| G1 | `BootScene.ts` | **Load** frame textures through the existing `animFrames(prefix, file)` helper: `serpenteEmergeA/B/C`, `serpenteFusaoSubida`, `serpenteFusaoVoo`, (`serpenteFusaoInvest`); image `serpenteRomboRuina`; veins/shadow `serpenteVeiasEmerge{F}{i}` / `serpenteSombraEmerge{A,B}{i}`. New keys only, no renames. Anims are **not** needed in `ANIMS` (registered boss-side). | additive |
| G2 | `GameScene.damageShip` | *Optional:* one line, `this.ship.setData('golpeEm', this.time.now)`, so the boss can honour the 0.8 s post-hit respite (GDD Tuning). Without it: `naveGolpeadaHa = Infinity`, except when the boss detects contact with its own body (degraded: bullet hits not seen). | additive, optional |
| G3 | `GameScene` overlaps | **Confirm only:** keep the registration order targets × bullets → sprite × bullets (absorb). The narrow fusion body (`pescoco`) then absorbs only there, and the bobbin is shot-transparent by construction. | confirm |
| G4 | `Parallax.inserirNoCasco / pecasDoCasco` | **Confirm** that neither recreates the breach strip after the boss does `rombo.setTexture('serpenteRomboRuina')`. | confirm |
| G5 | `EnemySystem` pool (128) | No change. Design peak ≤ 40 (F11). **Confirm** no other F3 spawner runs during the boss. | confirm |
| G6 | `Destrocos` | No change. **Confirm** that holed copies work on the new per-frame textures, and with a `mira` list that changes every frame (fusion bites in flight). | confirm |
| G7 | `pausaFinalMs` | The boss returns 1800 at the fusion's death (field exists; GDD §8.5). Needs the main session's OK. | OK only |
| G8 | Bomb / missile damage | **No change.** The boss-local cap `golpeMax` handles C (bomb 12 → 10). | none |
| G9 | Scripts outside the Serpente | `probe-stage3`, `_sonda-chefes`, `probe-chefao-misseis`, `_f3/ver-fusao` read `entering`, `hpTotal`, `maxHpTotal`, `faseIdx`, `imune`, `investida`, `colapso`, `cabeca`, `corpo`. The shell **keeps these names** (`investida` and `colapso` become derived getters). No change. | none |
| G10 | git (the user's call) | Before the rewrite, a WIP commit or branch of the uncommitted S1/S1b state (e.g. `backup/serpente-s1b`), so the backup is restorable by git, not only by `novos.tar` + `versionados.patch`. | process |

---

## 6. Test hooks

**`scripts/test-serpente.mjs` (pure Node, no Phaser)**

- **Formulas:**
  - F1–F3: every T_cue from `numerosSerpente` is ≥ `tCueMin`, or ≥ 0.6× when marked "2nd of a pattern" (AC 1);
  - F4: `sobraEsquerda ≥ 40` (AC 2);
  - F6: free width ≥ 87 and `vReq ≤ 110`; every `proximoVao` sequence keeps a gap (AC 3);
  - F8: `lequeSeguro` for B/C/F at their minimum D;
  - F9: patrol y ∈ [56, 100], x ∈ [207, 292], speed bounds ×1.25 in fury 1;
  - F10: the curves stay monotonic within their ranges;
  - the HP sum is 210, and `golpeMax(f) ≤ hp/3` for every form.
- **Geometry:**
  - `travaX ≥ 80`;
  - `escolherSitio`: ≥ 70 px right of the ship, no repeat, the relax rule above x 270, the rombo fallback;
  - the < 60 px merge;
  - `cadeiaC ≤ 320`;
  - `xFim` clamp;
  - `quadroDaAltura`: the skull never below crest − 6, never above the high post (run on every `ClipeDados`).
- **Clip data sanity:**
  - every ground-cut frame has no opaque row below `ancora.y` (the install script writes a checksum; the test asserts the flags);
  - `cabeca.length = quadros`.
- **Sequences** (the real brain plus `AtuadorGravador` plus a scripted ship, many seeds):
  - ≤ 1 lethal telegraph open at any time (AC 4);
  - T_cue measured from the first `cue` event to the first `letal` event at the ship's x/y;
  - pool peak ≤ 40 (AC 8);
  - `vestir` only while hidden with corpo `nada` (AC 6);
  - ≥ 1.0 s with no lethal after each transition (AC 17);
  - background shots only with no telegraph open;
  - modelled ρ per loop and form durations with DPS_ref 5.5 (sanity for AC 9).
- **Damage:** hidden → 0; skull < 6 px above crest → 0; the cap clamps; the order of deaths is ciano → verde → laranja → fusion (AC 5–6).

**`_sonda-luta.mjs` reads only `boss.sonda`** (plus the scene's ship and pool):

- `fase/estado/verbo/corpo/exposta` give the exposure ratio (AC 10);
- `centroide` + `soIdle` give the STR (AC 11);
- `cabeca` gives mobility (AC 12);
- the `eventos` ring gives in-game T_cue, contacts and breathers;
- `balas/balasPico` give the pool peak;
- `furia` and the HP fields give per-form durations (AC 9).

For AC 7, the probe walks `scene.children` during an emergence and asserts there is no object with a `cascoFrente*`
texture and no cropped boss sprite (the crop is allowed only on placeholder clips, which are flagged in `sonda.clipe`).
Profiles P0/P1/P2 are as specified in the GDD.

---

## 7. Migration (reuse / remove) and the backup

**Reused, moved into the new modules**

- Constructor wiring, the HP bar and emitter configs, `cravarCirculo`, the `checkCollision.none` pattern (never
  `enable = false`) and the `aplicarCorpo` rect math → `corpo.ts`.
- The arrival (brake, tremble, `estourarChegada`): timings → `cerebro/chegada.ts`, effects → `arena.ts`.
- The CascoVivo copy, crack, bump, gravel, tears, `estouroDoRombo`, `alargar`.
- `ondaDaChuva`, `pulso`, `freadaDe`, `travaX`.
- `tiro/leque/rajada` → `disparos.ts`. `acenderLuzes` → the `luzes` lombada style. `detonar` → `rasgo('estoura')`.
- `die`, `cortarParaAMorte`, `destroy`. The `GOTA` / `BRILHO` tables.

**Removed**

- `aplicarCorte`, `LUTA.escuro`, `escondidaY`, `postoY`, `FormaLuta.corte`, `cortada`.
- `CascoVivo.frente()` and `frenteTex` painting `ESCURO` (replaced by `labios`).
- `trocaPosto` 2.2–3.2 s (→ 0.8–1.2 s).
- The texture-key regexes (`quadroDoGesto`, `sincronizarVeias`).
- The `cd*` cooldown clocks and `furiaPasso` (→ brain scripts).
- The `fusaoPasso` scene (→ the rasgo).
- The duplicated `FASES` (one source: `FORMAS`).
- Auto-heal of tocas in B/C.

**Changed values**

| Knob | Old → new |
| --- | --- |
| `bordaX` | 60 → 80 |
| chuva `ate` | 300 → 278 |
| HP C | 50 → 30 |
| HP fusion | 60 → 80 |

**Backup.** `docs/ccgs-serpente/backup-2026-10-30/` stays untouched; its `LEIA-ME.md` procedure (checkout `14a6bcc` +
apply patch + untar) remains valid because no new code edits shared files. Add G10, a git ref, for a one-command restore.
The new modules live in a new folder, so restoring the backup = restore the old files + delete
`src/entities/serpente/` (add that line to the LEIA-ME when Phase 3 starts).

---

## 8. Risks and implementation order (risk first)

**Risks**

| # | Risk | Mitigation |
| --- | --- | --- |
| R1 | **Emergence quality** (the declared risk: it repeats the S1b "ficou fraco") | M1 below, filmed at real speed before anything else |
| R2 | **Height by frame vs the open-mouth pose**: lower bote heights hold a mid-rise frame whose mouth may be closed | Art: the mouth opens early in the clip; or the designer accepts 2–3 discrete height bands |
| R3 | **`v_bote` = 700 px/s has no meaning with a pinned clip** | It becomes `T_bote` (A table: 0.30 s) driving the clip's duration; `v_bote` is kept as a derived/doc value — designer sign-off |
| R4 | Phaser anim control (`play({duration, startFrame})`, `pause`, `playReverse`, `anims.currentFrame.index`) **unverified** (no engine-reference) | Verify in M1 with a 10-line spike; fallback = boss-registered segment anim keys per hold frame |
| R5 | Destruction engine and per-frame textures: holed copies are keyed per texture, and the frame changes happen in the anims' preUpdate before `GameScene.update` (same as today) | Never `setTexture` frames manually from `update` (bites would flicker) |
| R6 | One sprite body is both the lethal and the absorbing shape | The overlap order invariant (G3); `pescoco` mode for the fusion |
| R7 | The raw E2 has a "darker square around her" (his 29/10 review) | `_emerge-instalar.mjs` must key the background to alpha and assert no opaque border; checked AMPLIFIED before the sheet |
| R8 | The fusion flies over the hull | `labios` must paint only for an occupied toca (never over the fusion); the rombo lip is gone after the ruin |
| R9 | Interface drift with the parallel AI sketch | `Percepcao`/`Atuador` are the contract; reconcile at Phase 3 kick-off |
| R10 | The post-hit respite depends on G2 | Degraded without it |

**Order**

| Step | Work | Gate |
| --- | --- | --- |
| **M1** | **One hole, one clip.** `_emerge-instalar.mjs` on E2 → `dados/emerge.ts`; `clipes.ts`, `corpo.ts` (clip player, anchor, height by frame, hitboxes, veins), `tocas.ts`, `CascoVivo.labios` with `frente()` removed; a scripted V1 on a fixed loop (no brain yet); R4 spike | **Film → him** (approve the emergence before anything else) |
| **M2** | **Form A end to end.** Shell + `diretor` + `formaA` (REPOUSO / V1 / V3 / VOLTA / dente) via the `Atuador`; `disparos`, `damage` + cap, `sonda`; the arrival with E2; tests F1–F6/F10 + sequences; probe P0/P1/P2 on A (a dev knob `LUTA.dev.parar` ends the fight after a chosen form) | Film + probe |
| **M3** | Transitions A→B→C plus B/C on placeholders; persistent tocas; then the B/C clips as approved | — |
| **M4** | Fusion on placeholders: rasgo, ruin, Lissajous, V6 band + `faixaBranca`, furies, flight bites, death fall | — |
| **M5** | Fusion art in parallel. Plan B 3-C = `fusao.ts` swaps its locomotion `voo` ↔ `tocas` (behaviour unchanged) | ≤ 4 generations |
| **M6** | Calibration with the probe (DPS_ref per weapon load), then his films | — |
