# Bloco SOM — a fundação e a folha 1 (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** the sound-effects engine of the game (one player, the catalogue, the mix, the acoustics of the place), the
treatment script, the sound-sheet template, and the FIRST sheet (the ship) ready for him to listen and choose.

**Architecture:** our own small Web Audio graph on Phaser's `AudioContext` and the buffers Phaser's loader decodes:
`voice → pan → layer bus → acoustics of the place → duck → out → Phaser's destination`. The music keeps going through
`Music` (never through the acoustics). Everything that can be pure is pure (`mixagem`, `vozes`, the profile data, the
catalogue) and is tested in Node; the engine is tested in the automated browser by its nodes and gains.

**Tech Stack:** TypeScript (Node 24 runs the pure `.ts` directly — erasable syntax only, `.ts` import extensions),
Phaser 3.90 (`WebAudioSoundManager`), Web Audio API, ffmpeg 9 (already installed), Playwright for the browser tests.

**Spec:** `docs/superpowers/specs/2026-11-15-bloco-som-design.md`.

## Global Constraints

- The conversation with him in pt-br; code, comments, prompts and reasoning in English (the project's rule).
- Effects only: the soundtrack is HIS; `Music` is not touched beyond what Task 4 says.
- No new settings line: GERAL × EFEITOS for action/interface/ambience/engine; ambience and engine × `presenca(MÚSICA)`.
- The interface layer and the music never pass through the acoustics.
- Nothing enters the game before he chooses it on a sheet (this plan ends with sheet 1 SHOWN, not installed).
- Every sound file that ships has a line in `docs/SONS.md` (source, author, licence, link, what was done to it). Only
  CC0, PixelLab (his account), or a licence read on its own page.
- Pure modules: no Phaser import, no DOM at top level, `.ts` import extensions, no enums / parameter properties.
- New tests end with `process.exitCode`.
- Edit with Edit/Write (never sed / node -e on these CRLF files); one heredoc per Bash command.
- No commit unless he asks; when he does: only his authorship (no `Co-Authored-By`), never to `legacy`, videos/`q/` out.
- During a recording do not edit `src/` or `.html` of the project (Vite reloads).

## File map

| File | Responsibility |
|---|---|
| `src/som/mixagem.ts` (new, pure) | the layers, `presenca`, the gain of each layer from the player's volumes |
| `src/som/vozes.ts` (new, pure) | the voice rules: the per-sound cap, the global cap with priority, the min interval, the variation |
| `src/som/acustica.ts` (new) | the place profiles (data), `lugarDaCena`, the background rule, the impulse, `montarAcustica` (Web Audio) |
| `src/som/catalogoSons.ts` (new, pure) | `DefSom`, `SONS` (empty until a sheet is chosen), `validarCatalogo` |
| `src/som/Som.ts` (new) | the engine: `iniciar`, `tocar`, `laco`, `atualizarVolume`, `abafar`, `lugar`, `registrar`, `diagnostico` |
| `src/aplicarPreferencias.ts` (mod) | plugs `Som.volumes` and calls `Som.atualizarVolume()` |
| `src/scenes/BootScene.ts` (mod) | loads the catalogue's files, starts `Som` |
| `src/scenes/PausaScene.ts` (mod) | ducks the world on open (and silences the action on `derrota`), restores on close |
| `src/scenes/{Menu,Hangar,Game,Interlude,Interlude2,Interlude3,Interlude4}Scene.ts` (mod) | set the place on create |
| `docs/SONS.md` (new) | the credits and licences, one line per shipped file |
| `scripts/_som/_som-tratar.mjs` (new) | ffmpeg: trim, normalise, fades, mono, ogg + m4a, report |
| `docs/superpowers/folhas/_sons/folha-sons.js` + `.css` (new) | the sheet template (players, place, repeat ×8, music under, the choice text) |
| `scripts/_som/_folha-sons.mjs` (new) | builds a `folha.html` from a sheet's `dados.json` |
| `scripts/test-som.mjs` (new) | the pure rules |
| `scripts/test-som-tratar.mjs` (new) | the treatment script on a synthetic file |
| `scripts/test-som-jogo.mjs` (new) | the engine in the browser |

---

### Task 1: the mix and the voice rules (pure)

**Files:**
- Create: `src/som/mixagem.ts`, `src/som/vozes.ts`
- Test: `scripts/test-som.mjs`

**Interfaces:**
- Produces: `type Camada = 'acao' | 'interface' | 'ambiente' | 'motor'`; `PISO_PRESENCA = 0.35`;
  `presenca(musica: number): number`; `interface Volumes { geral: number; efeitos: number; musica: number }` (all 0–1);
  `ganhoDaCamada(c: Camada, v: Volumes): number`.
- Produces: `type Prioridade = 'interface' | 'jogador' | 'chefe' | 'cena' | 'inimigo'`; `PESO: Record<Prioridade, number>`;
  `TETO_GERAL = 24`; `INTERVALO_MIN = 0.012`; `interface VozAtiva { id: number; nome: string; peso: number; inicio: number }`;
  `type Decisao = { tipo: 'tocar' } | { tipo: 'recusar' } | { tipo: 'trocar'; id: number }`;
  `decidir(ativas, nome, peso, tetoDoSom, agora, ultimo, tetoGeral?): Decisao`;
  `sortearVariacao(rnd: () => number, tom: number, vol: number): { taxa: number; ganho: number }`.

- [ ] **Step 1: Write the failing test** — `scripts/test-som.mjs`:

```js
// BLOCK SOUND (15/11) — the pure rules of the sound effects (spec `specs/2026-11-15-bloco-som-design.md`):
// the mix (layers, the presence under the music), the voice rules, and (Tasks 2–3) the places and the catalogue.
//   node scripts/test-som.mjs
import { PISO_PRESENCA, ganhoDaCamada, presenca } from '../src/som/mixagem.ts';
import { INTERVALO_MIN, PESO, TETO_GERAL, decidir, sortearVariacao } from '../src/som/vozes.ts';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const perto = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

// ─── the mix ───
ok(presenca(0) === 1, 'presence: music at 0 → ambience full');
ok(perto(presenca(1), PISO_PRESENCA), 'presence: music full → the floor', presenca(1));
ok([0, 0.2, 0.5, 0.8, 1].every((m, i, a) => i === 0 || presenca(m) <= presenca(a[i - 1])), 'presence never rises with the music');
ok(presenca(-1) === 1 && perto(presenca(2), PISO_PRESENCA), 'presence clamps out-of-range input');
const v = { geral: 0.5, efeitos: 0.8, musica: 1 };
ok(perto(ganhoDaCamada('acao', v), 0.4), 'action = general × effects', ganhoDaCamada('acao', v));
ok(perto(ganhoDaCamada('interface', v), 0.4), 'interface = general × effects');
ok(perto(ganhoDaCamada('ambiente', v), 0.4 * PISO_PRESENCA), 'ambience = general × effects × presence');
ok(perto(ganhoDaCamada('motor', { ...v, musica: 0 }), 0.4), 'engine without music = full');
ok(ganhoDaCamada('acao', { geral: 0, efeitos: 1, musica: 1 }) === 0, 'GERAL 0 silences everything');
ok(ganhoDaCamada('ambiente', { geral: 1, efeitos: 0, musica: 0 }) === 0, 'EFEITOS 0 silences the ambience too');

// ─── the voices ───
const voz = (id, nome, peso, inicio) => ({ id, nome, peso, inicio });
ok(decidir([], 'a', PESO.jogador, 4, 1, undefined).tipo === 'tocar', 'empty: plays');
ok(decidir([], 'a', PESO.jogador, 4, 1, 1 - INTERVALO_MIN / 2).tipo === 'recusar', 'the same sound inside the min interval is refused');
ok(decidir([], 'a', PESO.jogador, 4, 1, 1 - INTERVALO_MIN * 2).tipo === 'tocar', 'after the interval it plays');
{
  const ativas = [voz(1, 'a', 3, 0.1), voz(2, 'a', 3, 0.3)];
  const d = decidir(ativas, 'a', 3, 2, 1, 0.3);
  ok(d.tipo === 'trocar' && d.id === 1, 'the per-sound cap replaces the OLDEST of the same sound', d);
}
{
  const cheio = Array.from({ length: TETO_GERAL }, (_, i) => voz(i + 1, `s${i}`, i < 3 ? PESO.inimigo : PESO.jogador, i));
  const d = decidir(cheio, 'novo', PESO.jogador, 4, 99, undefined);
  ok(d.tipo === 'trocar' && d.id === 1, 'global cap: the player pushes out the oldest enemy voice', d);
  const d2 = decidir(cheio.map((x) => ({ ...x, peso: PESO.chefe })), 'novo', PESO.inimigo, 4, 99, undefined);
  ok(d2.tipo === 'recusar', 'global cap: an enemy does not push out a boss or the player', d2);
  const d3 = decidir(cheio.map((x) => ({ ...x, peso: PESO.interface })), 'novo', PESO.interface, 4, 99, undefined);
  ok(d3.tipo === 'recusar', 'global cap: interface voices are never pushed out', d3);
}
{
  let s = 0.123; const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const vs = Array.from({ length: 200 }, () => sortearVariacao(rnd, 0.04, 0.1));
  ok(vs.every((x) => x.taxa >= 0.96 && x.taxa <= 1.04 && x.ganho >= 0.9 && x.ganho <= 1.1), 'the variation stays inside ±tom and ±vol');
  ok(new Set(vs.map((x) => x.taxa.toFixed(4))).size > 50, 'the variation varies');
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
```

- [ ] **Step 2: Run it, expect FAIL** — `node scripts/test-som.mjs` → `ERR_MODULE_NOT_FOUND` for `mixagem.ts`.

- [ ] **Step 3: Write `src/som/mixagem.ts`:**

```ts
/**
 * THE MIX of the sound effects (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.3). Pure.
 *
 * His rule: GERAL lowers everything, MÚSICA is only the soundtrack, EFEITOS is the action AND the ambience. And the
 * player chooses how to play — soundtrack + effects, only one of them — so whoever turns the music off still has an
 * atmosphere: the ambience and the ship's engine sit low under the soundtrack and come up when MÚSICA is at 0. That
 * adjustment is invisible (no settings line).
 */
export type Camada = 'acao' | 'interface' | 'ambiente' | 'motor';

/** How much of the ambience/engine is left with the music at full volume (tuned by ear on sheet 8). */
export const PISO_PRESENCA = 0.35;

const lim = (v: number): number => Math.min(1, Math.max(0, v));

/** The presence of the ambience and of the engine for a MÚSICA level `musica` (0–1): 1 at 0, the floor at 1. */
export const presenca = (musica: number): number => 1 - (1 - PISO_PRESENCA) * lim(musica);

/** The player's volumes, each 0–1 (the settings' 0–10 divided by 10). */
export interface Volumes {
  geral: number;
  efeitos: number;
  musica: number;
}

/** The gain of a layer's bus. */
export function ganhoDaCamada(c: Camada, v: Volumes): number {
  const base = lim(v.geral) * lim(v.efeitos);
  return c === 'ambiente' || c === 'motor' ? base * presenca(v.musica) : base;
}
```

- [ ] **Step 4: Write `src/som/vozes.ts`:**

```ts
/**
 * THE VOICE RULES (block SOUND, spec §3.1). Pure: the engine asks, this answers.
 *
 * - the same sound twice inside `INTERVALO_MIN` (one frame) plays once — a chain explosion does not stack;
 * - each sound has its own cap; at the cap the OLDEST copy of it is cut for the new one (the newest shot is the one
 *   that matters);
 * - over the global cap, the new voice only enters by pushing out a voice of equal or lower weight (the oldest of the
 *   lowest weight); the interface is never pushed out.
 */
export type Prioridade = 'interface' | 'jogador' | 'chefe' | 'cena' | 'inimigo';
export const PESO: Record<Prioridade, number> = { interface: 4, jogador: 3, chefe: 3, cena: 2, inimigo: 1 };

export const TETO_GERAL = 24;
/** Seconds: one frame at 60 fps, a little less. */
export const INTERVALO_MIN = 0.012;

export interface VozAtiva {
  id: number;
  nome: string;
  peso: number;
  /** `AudioContext.currentTime` when it started. */
  inicio: number;
}

export type Decisao = { tipo: 'tocar' } | { tipo: 'recusar' } | { tipo: 'trocar'; id: number };

const maisVelha = (vs: readonly VozAtiva[]): VozAtiva => vs.reduce((a, b) => (b.inicio < a.inicio ? b : a));

export function decidir(
  ativas: readonly VozAtiva[],
  nome: string,
  peso: number,
  tetoDoSom: number,
  agora: number,
  ultimo: number | undefined,
  tetoGeral = TETO_GERAL,
): Decisao {
  if (ultimo !== undefined && agora - ultimo < INTERVALO_MIN) return { tipo: 'recusar' };
  const mesmas = ativas.filter((v) => v.nome === nome);
  if (mesmas.length >= tetoDoSom) return { tipo: 'trocar', id: maisVelha(mesmas).id };
  if (ativas.length < tetoGeral) return { tipo: 'tocar' };
  const fracas = ativas.filter((v) => v.peso <= peso && v.peso < PESO.interface);
  if (!fracas.length) return { tipo: 'recusar' };
  const menor = Math.min(...fracas.map((v) => v.peso));
  return { tipo: 'trocar', id: maisVelha(fracas.filter((v) => v.peso === menor)).id };
}

/** The per-shot variation: `taxa` is the playback rate (pitch), `ganho` multiplies the volume. */
export function sortearVariacao(rnd: () => number, tom: number, vol: number): { taxa: number; ganho: number } {
  return { taxa: 1 + (rnd() * 2 - 1) * tom, ganho: 1 + (rnd() * 2 - 1) * vol };
}
```

- [ ] **Step 5: Run, expect PASS** — `node scripts/test-som.mjs` → all `✔`, `tudo certo`, exit code 0.

---

### Task 2: the acoustics of the place

**Files:**
- Create: `src/som/acustica.ts`
- Modify: `scripts/test-som.mjs` (append the place section before the final summary lines)

**Interfaces:**
- Produces: `type Lugar = 'atmosfera' | 'caverna' | 'cabine' | 'interior' | 'agua'`; `interface Perfil`; `PERFIS_SOM`;
  `AO_FUNDO: Record<Lugar, { passaBaixa: number; volume: number }>`; `lugarDaCena(cena: string, fase?: number): Lugar`;
  `impulso(ctx: BaseAudioContext, seg: number, decai: number, semente?: number): AudioBuffer`;
  `interface Acustica { entrada: AudioNode; saida: AudioNode; lugar(): Lugar; mudar(l: Lugar, ms: number): void }`;
  `montarAcustica(ctx: BaseAudioContext, inicial: Lugar): Acustica`.

- [ ] **Step 1: Append the failing tests** to `scripts/test-som.mjs` (new import at the top, block before the summary):

```js
import { AO_FUNDO, PERFIS_SOM, lugarDaCena } from '../src/som/acustica.ts';
```

```js
// ─── the places ───
ok(lugarDaCena('Menu') === 'atmosfera' && lugarDaCena('Hangar') === 'atmosfera', 'the menu and the hangar are in the atmosphere');
ok(lugarDaCena('Game', 1) === 'atmosfera', 'stage 1 is in the atmosphere');
ok(lugarDaCena('Game', 2) === 'cabine' && lugarDaCena('Game', 3) === 'cabine', 'stages 2 and 3 are in space (cabin)');
ok(lugarDaCena('Game', 4) === 'interior', 'stage 4 is the organic interior');
ok(lugarDaCena('Interlude2') === 'cabine', 'a cutscene without its own place falls on the cabin');
ok(PERFIS_SOM.atmosfera.passaBaixa < PERFIS_SOM.cabine.passaBaixa, 'the atmosphere is more muffled than the cabin');
ok(PERFIS_SOM.atmosfera.eco.seg > PERFIS_SOM.cabine.eco.seg, 'the atmosphere has a longer tail than the cabin');
ok(PERFIS_SOM.agua.passaBaixa <= 1000, 'the water lets only the low end through');
ok(AO_FUNDO.cabine.passaBaixa <= 200 && AO_FUNDO.cabine.volume <= 0.3, 'in space the background is only a dull low thump');
ok(Object.keys(PERFIS_SOM).every((l) => AO_FUNDO[l].passaBaixa < PERFIS_SOM[l].passaBaixa), 'the background is always more muffled than the place');
```

- [ ] **Step 2: Run, expect FAIL** — `node scripts/test-som.mjs` → module not found `acustica.ts`.

- [ ] **Step 3: Write `src/som/acustica.ts`:**

```ts
/**
 * THE ACOUSTICS OF THE PLACE (block SOUND, spec §4) — the sound partner of the visual Atmosfera (GDD pillar 5:
 * nothing goes raw). His words: *"tudo que é na atmosfera tem aquele som mais abafado"*; in space the CABIN sound
 * (dry); and THE DISTANCE DECIDES: what lives in the back layers, in the vacuum, is almost silent (a dull thump felt
 * through the hull). The profiles are data (tested in Node); `montarAcustica` builds the Web Audio chain.
 * The interface and the soundtrack never pass through here.
 */
export type Lugar = 'atmosfera' | 'caverna' | 'cabine' | 'interior' | 'agua';

export interface Perfil {
  /** Hz */
  passaAlta: number;
  /** Hz */
  passaBaixa: number;
  realce: { freq: number; ganhoDb: number };
  /** The generated tail: length (s), decay exponent, wet mix (0–1). */
  eco: { seg: number; decai: number; mistura: number };
}

/** The starting points; his ear tunes them on the sheets. */
export const PERFIS_SOM: Record<Lugar, Perfil> = {
  atmosfera: { passaAlta: 30, passaBaixa: 6000, realce: { freq: 180, ganhoDb: 2 }, eco: { seg: 1.8, decai: 3, mistura: 0.22 } },
  caverna: { passaAlta: 40, passaBaixa: 5000, realce: { freq: 400, ganhoDb: 1 }, eco: { seg: 1.2, decai: 2, mistura: 0.35 } },
  cabine: { passaAlta: 60, passaBaixa: 14000, realce: { freq: 2500, ganhoDb: 2 }, eco: { seg: 0.25, decai: 6, mistura: 0.06 } },
  interior: { passaAlta: 40, passaBaixa: 4500, realce: { freq: 300, ganhoDb: 2 }, eco: { seg: 1.4, decai: 2.5, mistura: 0.3 } },
  agua: { passaAlta: 30, passaBaixa: 800, realce: { freq: 120, ganhoDb: 3 }, eco: { seg: 1.0, decai: 2, mistura: 0.25 } },
};

/** A sound with `plano: 'fundo'`: its own low-pass and volume on top of the place. In space: almost nothing. */
export const AO_FUNDO: Record<Lugar, { passaBaixa: number; volume: number }> = {
  atmosfera: { passaBaixa: 2500, volume: 0.5 },
  caverna: { passaBaixa: 2000, volume: 0.5 },
  cabine: { passaBaixa: 150, volume: 0.25 },
  interior: { passaBaixa: 1800, volume: 0.5 },
  agua: { passaBaixa: 400, volume: 0.4 },
};

/** The place a scene starts in. The cave (F1) and the chamber B water (F4) are switched by the scene itself. */
export function lugarDaCena(cena: string, fase?: number): Lugar {
  if (cena === 'Menu' || cena === 'Hangar') return 'atmosfera';
  if (cena === 'Game') return fase === 1 ? 'atmosfera' : fase === 4 ? 'interior' : 'cabine';
  return 'cabine';
}

/** A short stereo impulse (seeded noise with a decay) — the tail, without an impulse-response file. */
export function impulso(ctx: BaseAudioContext, seg: number, decai: number, semente = 1): AudioBuffer {
  const n = Math.max(1, Math.floor(ctx.sampleRate * seg));
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  let s = semente >>> 0 || 1;
  const rnd = (): number => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < n; i++) d[i] = (rnd() * 2 - 1) * Math.pow(1 - i / n, decai);
  }
  return b;
}

export interface Acustica {
  entrada: AudioNode;
  saida: AudioNode;
  lugar(): Lugar;
  /** Crosses to another place in `ms` (0 = at once). */
  mudar(l: Lugar, ms: number): void;
}

/** input → high-pass → peak → low-pass → (dry + tail) → output. */
export function montarAcustica(ctx: BaseAudioContext, inicial: Lugar): Acustica {
  const alta = ctx.createBiquadFilter();
  alta.type = 'highpass';
  const realce = ctx.createBiquadFilter();
  realce.type = 'peaking';
  realce.Q.value = 0.8;
  const baixa = ctx.createBiquadFilter();
  baixa.type = 'lowpass';
  baixa.Q.value = 0.5;
  const seco = ctx.createGain();
  const conv = ctx.createConvolver();
  const molhado = ctx.createGain();
  const saida = ctx.createGain();
  alta.connect(realce).connect(baixa);
  baixa.connect(seco).connect(saida);
  baixa.connect(conv).connect(molhado).connect(saida);

  let atual = inicial;
  let troca: ReturnType<typeof setTimeout> | null = null;
  const filtros = (p: Perfil, tau: number): void => {
    const t = ctx.currentTime;
    alta.frequency.setTargetAtTime(p.passaAlta, t, tau);
    realce.frequency.setTargetAtTime(p.realce.freq, t, tau);
    realce.gain.setTargetAtTime(p.realce.ganhoDb, t, tau);
    baixa.frequency.setTargetAtTime(p.passaBaixa, t, tau);
  };
  const cauda = (p: Perfil): void => {
    conv.buffer = impulso(ctx, p.eco.seg, p.eco.decai, 7);
  };
  const inicialP = PERFIS_SOM[inicial];
  alta.frequency.value = inicialP.passaAlta;
  realce.frequency.value = inicialP.realce.freq;
  realce.gain.value = inicialP.realce.ganhoDb;
  baixa.frequency.value = inicialP.passaBaixa;
  molhado.gain.value = inicialP.eco.mistura;
  cauda(inicialP);

  return {
    entrada: alta,
    saida,
    lugar: () => atual,
    mudar(l: Lugar, ms: number): void {
      if (l === atual) return;
      atual = l;
      const p = PERFIS_SOM[l];
      if (troca) clearTimeout(troca);
      if (ms <= 0) {
        filtros(p, 0.001);
        molhado.gain.cancelScheduledValues(ctx.currentTime);
        molhado.gain.value = p.eco.mistura;
        cauda(p);
        return;
      }
      filtros(p, ms / 1000 / 3);
      // the tail cannot be crossfaded on one convolver: down, swap, up
      molhado.gain.setTargetAtTime(0, ctx.currentTime, ms / 1000 / 6);
      troca = setTimeout(() => {
        cauda(p);
        molhado.gain.setTargetAtTime(p.eco.mistura, ctx.currentTime, ms / 1000 / 6);
        troca = null;
      }, ms / 2);
    },
  };
}
```

- [ ] **Step 4: Run, expect PASS** — `node scripts/test-som.mjs` → all `✔`.

---

### Task 3: the catalogue and the credits sheet

**Files:**
- Create: `src/som/catalogoSons.ts`, `docs/SONS.md`
- Modify: `scripts/test-som.mjs` (append)

**Interfaces:**
- Consumes: `Camada` (Task 1), `Prioridade` (Task 1).
- Produces: `interface DefSom { arquivo: string; camada: Camada; volume: number; vozes: number; variacao: { tom: number;
  vol: number }; prioridade: Prioridade; plano?: 'perto' | 'fundo'; laco?: boolean }`; `SONS: Record<string, DefSom>`;
  `NOME_SOM: RegExp`; `validarCatalogo(sons, existe: (caminho: string) => boolean, creditos: string): string[]`.

- [ ] **Step 1: Append the failing tests:**

```js
import { NOME_SOM, SONS, validarCatalogo } from '../src/som/catalogoSons.ts';
import { existsSync, readFileSync } from 'node:fs';
```

```js
// ─── the catalogue ───
const def = (o = {}) => ({ arquivo: 'nave/x', camada: 'acao', volume: 0.6, vozes: 4, variacao: { tom: 0.04, vol: 0.1 }, prioridade: 'jogador', ...o });
const tudo = () => true;
const cred = '| `nave.xaelo.tiro` | PixelLab |';
ok(NOME_SOM.test('nave.xaelo.tiro') && NOME_SOM.test('explosao.carne') && !NOME_SOM.test('Nave.Tiro') && !NOME_SOM.test('tiro'), 'the name is grupo.dono.acao, lower case');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, tudo, cred).length === 0, 'a valid entry passes');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, () => false, cred).some((e) => e.includes('.ogg')), 'a missing file is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def() }, tudo, '').some((e) => e.includes('SONS.md')), 'a missing credits line is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ volume: 1.4 }) }, tudo, cred).length > 0, 'volume over 1 is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ vozes: 0 }) }, tudo, cred).length > 0, 'zero voices is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ variacao: { tom: 0.3, vol: 0.1 } }) }, tudo, cred).length > 0, 'a pitch variation over 10% is an error');
ok(validarCatalogo({ 'nave.xaelo.tiro': def({ camada: 'interface', plano: 'fundo' }) }, tudo, cred).length > 0, 'the interface has no background');
{
  const creditos = existsSync('docs/SONS.md') ? readFileSync('docs/SONS.md', 'utf8') : '';
  const erros = validarCatalogo(SONS, (c) => existsSync(`public/sfx/${c}`), creditos);
  ok(erros.length === 0, `the REAL catalogue is valid (${Object.keys(SONS).length} sounds)`, erros);
}
```

- [ ] **Step 2: Run, expect FAIL** — module not found `catalogoSons.ts`.

- [ ] **Step 3: Write `src/som/catalogoSons.ts`:**

```ts
import type { Camada } from './mixagem.ts';
import type { Prioridade } from './vozes.ts';

/**
 * THE SOUND CATALOGUE (block SOUND, spec §3.2) — data, no Phaser (the mould of `catalogoCartas`). The scenes call the
 * NAME, never the file. A sound only enters here after HE chose it on its sheet; each one has its files in
 * `public/sfx/<arquivo>.ogg` + `.m4a` and its line in `docs/SONS.md`.
 */
export interface DefSom {
  /** Path under `public/sfx/`, without the extension. */
  arquivo: string;
  camada: Camada;
  /** The mix level of the sound itself, 0–1. */
  volume: number;
  /** How many copies of it may sound at once. */
  vozes: number;
  /** Per-shot variation: pitch ± `tom`, volume ± `vol` (fractions). */
  variacao: { tom: number; vol: number };
  prioridade: Prioridade;
  /** `fundo` = lives in the back layers (in space: only the dull thump). Default `perto`. */
  plano?: 'perto' | 'fundo';
  laco?: boolean;
}

export const NOME_SOM = /^[a-z][a-z0-9]*(\.[a-z][a-zA-Z0-9]*){1,3}$/;

/** Empty until sheet 1 is chosen. */
export const SONS: Record<string, DefSom> = {};

/** Every problem of a catalogue, as text (empty = valid). `existe` receives a path under `public/sfx/`. */
export function validarCatalogo(sons: Record<string, DefSom>, existe: (caminho: string) => boolean, creditos: string): string[] {
  const erros: string[] = [];
  for (const [nome, d] of Object.entries(sons)) {
    if (!NOME_SOM.test(nome)) erros.push(`${nome}: the name is not grupo.dono.acao`);
    for (const ext of ['ogg', 'm4a']) if (!existe(`${d.arquivo}.${ext}`)) erros.push(`${nome}: missing public/sfx/${d.arquivo}.${ext}`);
    if (!creditos.includes(`\`${nome}\``)) erros.push(`${nome}: no line in docs/SONS.md`);
    if (!(d.volume > 0 && d.volume <= 1)) erros.push(`${nome}: volume ${d.volume} outside (0, 1]`);
    if (!(Number.isInteger(d.vozes) && d.vozes >= 1)) erros.push(`${nome}: voices ${d.vozes}`);
    if (d.variacao.tom < 0 || d.variacao.tom > 0.1) erros.push(`${nome}: pitch variation ${d.variacao.tom} outside [0, 0.1]`);
    if (d.variacao.vol < 0 || d.variacao.vol > 0.3) erros.push(`${nome}: volume variation ${d.variacao.vol} outside [0, 0.3]`);
    if (d.camada === 'interface' && d.plano === 'fundo') erros.push(`${nome}: the interface has no background`);
  }
  return erros;
}
```

- [ ] **Step 4: Write `docs/SONS.md`:**

```markdown
# SONS — os créditos e as licenças dos efeitos sonoros

Uma linha por arquivo que vai para o jogo (`public/sfx/`). Nada entra sem linha aqui (a `test-som.mjs` cobra).
Spec: `docs/superpowers/specs/2026-11-15-bloco-som-design.md`. Os originais ficam em `assets/raw/sons/<grupo>/`.

Licenças aceitas: **CC0**; **PixelLab** (gerado na conta dele, Tier 2); outra só lida na página da licença, com o link.

| nome no catálogo | arquivo | fonte | autor | licença | link | o que foi feito |
|---|---|---|---|---|---|---|
```

- [ ] **Step 5: Run, expect PASS** — `node scripts/test-som.mjs` → all `✔` (the real catalogue: 0 sounds, valid).

---

### Task 4: the engine and its wiring

**Files:**
- Create: `src/som/Som.ts`
- Modify: `src/aplicarPreferencias.ts:34-39,61` · `src/scenes/BootScene.ts:1489-1493` · `src/scenes/PausaScene.ts:107,294`
  · `src/scenes/MenuScene.ts` (create) · `src/scenes/HangarScene.ts` (create) · `src/scenes/GameScene.ts:338` ·
  `src/scenes/InterludeScene.ts`, `Interlude2Scene.ts`, `Interlude3Scene.ts`, `Interlude4Scene.ts` (create)
- Test: `scripts/test-som-jogo.mjs`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (static class `Som`): `volumes: () => Volumes`; `iniciar(gerente: unknown, cache: { get(k: string): unknown }): void`;
  `pronto(): boolean`; `tocar(nome: string, op?: { x?: number; forca?: number }): void`;
  `laco(nome: string): Laco | null` with `interface Laco { volume(v: number, ms?: number): void; parar(ms?: number): void }`;
  `atualizarVolume(): void`; `abafar(k: number, ms: number, calarAcao?: boolean): void`; `lugar(l: Lugar, ms?: number): void`;
  `registrar(nome: string, def: DefSom, buffer: AudioBuffer): void`; `diagnostico(): DiagnosticoSom`; `chaveSom(nome)`.
  In DEV, `window.__som = Som`.

- [ ] **Step 1: Write the failing browser test** — `scripts/test-som-jogo.mjs`:

```js
// BLOCK SOUND (15/11) — the sound-effects engine IN THE GAME (spec `specs/2026-11-15-bloco-som-design.md` §3, §7):
// it is born with the context; nothing plays before the first key; the caps hold; EFEITOS 0 = zero gain; the pause
// ducks the world (the interface not); SHIP LOST silences the action; each scene sets its place.
// The automated Chromium has Web Audio: this measures the NODES and the gains, not the ear.
//   npm run dev  in another terminal, then  node scripts/test-som-jogo.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.waitForTimeout(1200);
const diag = () => page.evaluate(() => window.__som.diagnostico());
const ativa = (k, ms = 20000) => page.waitForFunction((x) => window.__game.scene.isActive(x), k, { timeout: ms }).then(() => true, () => false);

let d = await diag();
ok(d.iniciado, 'the engine started with the Phaser context', d);
ok(d.lugar === 'atmosfera', 'the menu is in the atmosphere', d.lugar);

await page.keyboard.press('ArrowDown');
await page.waitForTimeout(300);
d = await diag();
ok(d.pronto, 'after the first key the context runs', d.estado);

// a synthetic test sound (100 ms of a 440 Hz sine) and a loop
await page.evaluate(() => {
  const S = window.__som; const ctx = S.contexto();
  const b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.1), ctx.sampleRate);
  const c = b.getChannelData(0); for (let i = 0; i < c.length; i++) c[i] = Math.sin((i / ctx.sampleRate) * 2 * Math.PI * 440) * 0.3;
  S.registrar('teste.bip', { arquivo: '-', camada: 'acao', volume: 0.5, vozes: 2, variacao: { tom: 0.04, vol: 0.1 }, prioridade: 'jogador' }, b);
  S.registrar('teste.amb', { arquivo: '-', camada: 'ambiente', volume: 0.5, vozes: 1, variacao: { tom: 0, vol: 0 }, prioridade: 'cena', laco: true }, b);
});
await page.evaluate(() => { for (let i = 0; i < 6; i++) window.__som.tocar('teste.bip'); });
d = await diag();
ok(d.vozes.filter((v) => v === 'teste.bip').length === 1 && d.recusadas >= 5, 'six in the same instant: one plays, the rest are refused', d);
await page.evaluate(async () => { for (let i = 0; i < 6; i++) { window.__som.tocar('teste.bip'); await new Promise((r) => setTimeout(r, 20)); } });
d = await diag();
ok(d.vozes.filter((v) => v === 'teste.bip').length <= 2, 'the per-sound cap (2) holds', d.vozes);
await page.evaluate(() => window.__som.laco('teste.amb'));
d = await diag();
ok(d.vozes.includes('teste.amb'), 'the loop plays', d.vozes);

// EFEITOS to 0 through the real settings bridge
await page.evaluate(async () => { const m = await import('/src/aplicarPreferencias.ts'); for (let i = 0; i < 10; i++) m.mudarPref('volume.efeitos', -1); });
await page.waitForTimeout(200);
d = await diag();
ok(d.ganhos.acao === 0 && d.ganhos.ambiente === 0, 'EFEITOS 0 = zero gain on action and ambience', d.ganhos);
await page.evaluate(async () => { const m = await import('/src/aplicarPreferencias.ts'); for (let i = 0; i < 10; i++) m.mudarPref('volume.efeitos', 1); });
await page.waitForTimeout(200);
d = await diag();
ok(d.ganhos.acao > 0.9, 'EFEITOS back to 10', d.ganhos);
await page.evaluate(async () => { const m = await import('/src/aplicarPreferencias.ts'); for (let i = 0; i < 10; i++) m.mudarPref('volume.musica', -1); });
await page.waitForTimeout(200);
d = await diag();
ok(d.ganhos.ambiente > 0.9, 'MÚSICA 0 = the ambience full', d.ganhos);
await page.evaluate(async () => { const m = await import('/src/aplicarPreferencias.ts'); for (let i = 0; i < 10; i++) m.mudarPref('volume.musica', 1); });
await page.waitForTimeout(200);
d = await diag();
ok(d.ganhos.ambiente < 0.5, 'MÚSICA 10 = the ambience under the music', d.ganhos);

// stage 2: the cabin; the pause ducks the world
await page.keyboard.press('KeyV');
ok(await ativa('Game'), 'stage 2 opened');
await page.waitForTimeout(2000);
d = await diag();
ok(d.lugar === 'cabine', 'stage 2 is in the cabin', d.lugar);
await page.keyboard.press('Escape');
ok(await ativa('Pausa'), 'the pause opened');
await page.waitForTimeout(500);
d = await diag();
ok(d.abafo < 0.6 && d.acaoMuda === 1, 'the pause ducks the world, the action is not silenced', d);
await page.keyboard.press('Escape');
await page.waitForTimeout(500);
d = await diag();
ok(d.abafo === 1, 'closing the pause restores', d.abafo);

// SHIP LOST: the action is silenced, the ambience stays
await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.gameOver(); });
ok(await ativa('Pausa', 15000), 'the SHIP LOST window opened');
await page.waitForTimeout(600);
d = await diag();
ok(d.acaoMuda < 0.01 && d.abafo > 0, 'SHIP LOST: the action silenced, the ambience low', d);

ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
```

- [ ] **Step 2: Run, expect FAIL** — `node scripts/test-som-jogo.mjs` → `window.__som` undefined (TypeError in evaluate).

- [ ] **Step 3: Write `src/som/Som.ts`:**

```ts
import { AO_FUNDO, montarAcustica, type Acustica, type Lugar } from './acustica.ts';
import { SONS, type DefSom } from './catalogoSons.ts';
import { ganhoDaCamada, type Camada, type Volumes } from './mixagem.ts';
import { PESO, decidir, sortearVariacao, type VozAtiva } from './vozes.ts';

/**
 * THE SOUND-EFFECTS PLAYER (block SOUND, 15/11 — spec `specs/2026-11-15-bloco-som-design.md` §3.1). Every effect of
 * the game passes here; the soundtrack stays in `Music`. Our own Web Audio graph on Phaser's context:
 *
 *   voice (buffer → gain → pan [→ background low-pass]) → layer bus ─┬→ acoustics → duck → out → Phaser destination
 *                                                   (interface bus) ─┴──────────────────────→ out
 *
 * Before the browser unlocks the audio, `tocar` drops the sound (a late shot is worse than none) and `laco` waits.
 * Without Web Audio the player is silent, without errors.
 */
interface Gerente {
  context?: AudioContext;
  destination?: AudioNode;
}
interface CacheAudio {
  get(chave: string): unknown;
}
export interface Laco {
  volume(v: number, ms?: number): void;
  parar(ms?: number): void;
}
export interface DiagnosticoSom {
  iniciado: boolean;
  pronto: boolean;
  estado: string;
  lugar: Lugar;
  vozes: string[];
  recusadas: number;
  ganhos: Record<Camada, number>;
  abafo: number;
  acaoMuda: number;
}
type Voz = VozAtiva & { fonte: AudioBufferSourceNode; ganho: GainNode };

export const chaveSom = (nome: string): string => `sfx:${nome}`;
const LARGURA_TELA = 384;
const PAN_MAX = 0.4;
const CAMADAS: Camada[] = ['acao', 'interface', 'ambiente', 'motor'];

export class Som {
  /** The player's volumes (0–1): `aplicarPreferencias.ts` plugs them in. */
  static volumes: () => Volumes = () => ({ geral: 1, efeitos: 1, musica: 1 });

  private static ctx: AudioContext | null = null;
  private static cache: CacheAudio | null = null;
  private static barras = {} as Record<Camada, GainNode>;
  private static acaoMudaNo: GainNode | null = null;
  private static abafoNo: GainNode | null = null;
  private static ac: Acustica | null = null;
  private static lugarAtual: Lugar = 'atmosfera';
  private static ativas: Voz[] = [];
  private static ultimo = new Map<string, number>();
  private static extras = new Map<string, { def: DefSom; buffer: AudioBuffer }>();
  private static proxId = 1;
  private static recusadas = 0;
  private static semente = 20261115;
  private static rnd = (): number => ((Som.semente = (Math.imul(Som.semente, 1664525) + 1013904223) >>> 0) / 4294967296);

  /** Once, in the BootScene: the Phaser sound manager and the audio cache. */
  static iniciar(gerente: unknown, cache: CacheAudio): void {
    const g = gerente as Gerente;
    if (Som.ctx || !g.context || !g.destination) return;
    const ctx = g.context;
    Som.ctx = ctx;
    Som.cache = cache;
    const saida = ctx.createGain();
    saida.connect(g.destination);
    Som.abafoNo = ctx.createGain();
    Som.abafoNo.connect(saida);
    Som.ac = montarAcustica(ctx, Som.lugarAtual);
    Som.ac.saida.connect(Som.abafoNo);
    Som.acaoMudaNo = ctx.createGain();
    Som.acaoMudaNo.connect(Som.ac.entrada);
    for (const c of CAMADAS) {
      const b = ctx.createGain();
      if (c === 'interface') b.connect(saida);
      else if (c === 'acao') b.connect(Som.acaoMudaNo);
      else b.connect(Som.ac.entrada);
      Som.barras[c] = b;
    }
    Som.atualizarVolume();
    if (import.meta.env?.DEV) (window as unknown as { __som: typeof Som }).__som = Som;
  }

  static contexto(): AudioContext | null {
    return Som.ctx;
  }

  static pronto(): boolean {
    return Som.ctx?.state === 'running';
  }

  private static achar(nome: string): { def: DefSom; buffer: AudioBuffer } | null {
    const extra = Som.extras.get(nome);
    if (extra) return extra;
    const def = SONS[nome];
    const buffer = def ? Som.cache?.get(chaveSom(nome)) : undefined;
    return def && buffer instanceof AudioBuffer ? { def, buffer } : null;
  }

  /** A sound for the folha and the tests (and DEV tries): it lives beside the catalogue. */
  static registrar(nome: string, def: DefSom, buffer: AudioBuffer): void {
    Som.extras.set(nome, { def, buffer });
  }

  private static voz(nome: string, def: DefSom, buffer: AudioBuffer, ganhoExtra: number, x: number | undefined, laco: boolean): Voz | null {
    const ctx = Som.ctx!;
    const agora = ctx.currentTime;
    const peso = PESO[def.prioridade];
    const d = decidir(Som.ativas, nome, peso, def.vozes, agora, Som.ultimo.get(nome));
    if (d.tipo === 'recusar') {
      Som.recusadas++;
      return null;
    }
    if (d.tipo === 'trocar') Som.cortar(d.id);
    Som.ultimo.set(nome, agora);

    const fonte = ctx.createBufferSource();
    fonte.buffer = buffer;
    fonte.loop = laco;
    const v = sortearVariacao(Som.rnd, def.variacao.tom, def.variacao.vol);
    fonte.playbackRate.value = v.taxa;
    const ganho = ctx.createGain();
    ganho.gain.value = Math.min(1, def.volume * v.ganho * ganhoExtra);
    let ultimoNo: AudioNode = fonte.connect(ganho);
    if (x !== undefined) {
      const pan = ctx.createStereoPanner();
      pan.pan.value = Math.max(-1, Math.min(1, (x / LARGURA_TELA) * 2 - 1)) * PAN_MAX;
      ultimoNo = ultimoNo.connect(pan);
    }
    if (def.plano === 'fundo' && def.camada !== 'interface') {
      const f = AO_FUNDO[Som.lugarAtual];
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = f.passaBaixa;
      ganho.gain.value *= f.volume;
      ultimoNo = ultimoNo.connect(lp);
    }
    ultimoNo.connect(Som.barras[def.camada]);
    const voz: Voz = { id: Som.proxId++, nome, peso, inicio: agora, fonte, ganho };
    fonte.onended = () => {
      Som.ativas = Som.ativas.filter((a) => a !== voz);
      ganho.disconnect();
    };
    Som.ativas.push(voz);
    fonte.start();
    return voz;
  }

  private static cortar(id: number): void {
    const v = Som.ativas.find((a) => a.id === id);
    if (!v || !Som.ctx) return;
    Som.ativas = Som.ativas.filter((a) => a !== v);
    v.ganho.gain.setTargetAtTime(0, Som.ctx.currentTime, 0.01);
    v.fonte.stop(Som.ctx.currentTime + 0.05);
  }

  /** A one-shot. `x` = screen x (0–384) → a gentle pan; `forca` (0–1) scales the volume. */
  static tocar(nome: string, op: { x?: number; forca?: number } = {}): void {
    if (!Som.pronto()) return;
    const s = Som.achar(nome);
    if (!s) return;
    Som.voz(nome, s.def, s.buffer, op.forca ?? 1, op.x, false);
  }

  /** A loop (the engine, the ambience). Before the unlock it waits; `parar` before it starts cancels it. */
  static laco(nome: string): Laco | null {
    const ctx = Som.ctx;
    const s = Som.achar(nome);
    if (!ctx || !s) return null;
    let voz: Voz | null = null;
    let alvo = 1;
    let cancelado = false;
    const comecar = (): void => {
      if (cancelado || voz) return;
      voz = Som.voz(nome, s.def, s.buffer, alvo, undefined, true);
    };
    if (Som.pronto()) comecar();
    else ctx.addEventListener('statechange', function espera() {
      if (ctx.state !== 'running') return;
      ctx.removeEventListener('statechange', espera);
      comecar();
    });
    return {
      volume(v: number, ms = 300): void {
        alvo = v;
        if (voz) voz.ganho.gain.setTargetAtTime(Math.min(1, s.def.volume * v), ctx.currentTime, Math.max(0.001, ms / 3000));
      },
      parar(ms = 400): void {
        cancelado = true;
        if (!voz) return;
        voz.ganho.gain.setTargetAtTime(0, ctx.currentTime, Math.max(0.001, ms / 3000));
        voz.fonte.stop(ctx.currentTime + ms / 1000 + 0.05);
      },
    };
  }

  /** The preferences changed: each layer bus to its new gain at once. */
  static atualizarVolume(): void {
    if (!Som.ctx) return;
    const v = Som.volumes();
    for (const c of CAMADAS) Som.barras[c]?.gain.setTargetAtTime(ganhoDaCamada(c, v), Som.ctx.currentTime, 0.02);
  }

  /** Ducks the world to `k` (the pause: the same factor as the music) or restores it (1); `calarAcao` = SHIP LOST. */
  static abafar(k: number, ms: number, calarAcao = false): void {
    if (!Som.ctx || !Som.abafoNo || !Som.acaoMudaNo) return;
    const t = Som.ctx.currentTime;
    const tau = Math.max(0.001, ms / 3000);
    Som.abafoNo.gain.setTargetAtTime(k, t, tau);
    Som.acaoMudaNo.gain.setTargetAtTime(calarAcao ? 0 : 1, t, tau);
  }

  /** The place of the scene (spec §4). */
  static lugar(l: Lugar, ms = 1000): void {
    Som.lugarAtual = l;
    Som.ac?.mudar(l, ms);
  }

  static diagnostico(): DiagnosticoSom {
    const ganhos = {} as Record<Camada, number>;
    for (const c of CAMADAS) ganhos[c] = Som.barras[c]?.gain.value ?? 0;
    return {
      iniciado: !!Som.ctx,
      pronto: Som.pronto(),
      estado: Som.ctx?.state ?? 'none',
      lugar: Som.lugarAtual,
      vozes: Som.ativas.map((a) => a.nome),
      recusadas: Som.recusadas,
      ganhos,
      abafo: Som.abafoNo?.gain.value ?? 1,
      acaoMuda: Som.acaoMudaNo?.gain.value ?? 1,
    };
  }
}
```

Note for the implementer: the test reads `abafo === 1` after closing the pause; `setTargetAtTime` approaches the target
asymptotically, so in `abafar` when `k === 1 && ms <= 0` also set `.value` directly after the call:
`if (ms <= 0) { Som.abafoNo.gain.cancelScheduledValues(t); Som.abafoNo.gain.value = k; Som.acaoMudaNo.gain.cancelScheduledValues(t); Som.acaoMudaNo.gain.value = calarAcao ? 0 : 1; return; }` — put it right after `const tau`.
The same for `atualizarVolume` is not needed (the test allows `> 0.9` / `< 0.5` and `=== 0`; for `=== 0` the
`setTargetAtTime(0, …, 0.02)` reaches < 1e-30 after 200 ms only in theory — so set `.value` directly there too:
replace the loop body with `{ const b = Som.barras[c]; if (b) { b.gain.cancelScheduledValues(Som.ctx.currentTime); b.gain.value = ganhoDaCamada(c, v); } }`).

- [ ] **Step 4: Wire the preferences** — `src/aplicarPreferencias.ts`: add `import { Som } from './som/Som.ts';` under the
  `Music` import; in `aplicar` add `Som.atualizarVolume();` after `Music.atualizarVolume();`; at the bottom add:

```ts
Som.volumes = () => {
  const p = prefs();
  return { geral: p.volume.geral / 10, efeitos: p.volume.efeitos / 10, musica: p.volume.musica / 10 };
};
```

  and update the comment of `volumeEfeitos` ("recorded today, used when the sound comes in" → "kept for the sheets; the
  engine reads `Som.volumes`").

- [ ] **Step 5: Load and start in the BootScene** — after `this.load.audio('boss', 'audio/boss.mp3');`:

```ts
    // THE SOUND EFFECTS (block SOUND, 15/11): every sound of the catalogue, ogg with the m4a fallback (Safari).
    for (const [nome, d] of Object.entries(SONS)) this.load.audio(chaveSom(nome), [`sfx/${d.arquivo}.ogg`, `sfx/${d.arquivo}.m4a`]);
```

  and as the first line of `create()`: `Som.iniciar(this.sound, this.cache.audio);`. Imports:
  `import { SONS } from '../som/catalogoSons';` and `import { Som, chaveSom } from '../som/Som';` (match the file's
  existing import style — check whether BootScene uses `.ts` extensions and do the same).

- [ ] **Step 6: The pause** — `src/scenes/PausaScene.ts` line 107: replace

```ts
    if (!doMenu) Music.abafar(this, JANELA.abafo, 200);
```

  with

```ts
    if (!doMenu) {
      Music.abafar(this, JANELA.abafo, 200);
      // the world's effects duck with the music; on SHIP LOST the action is silenced and only the ambience stays, low
      Som.abafar(JANELA.abafo, 200, this.ctx.tipo === 'derrota');
    }
```

  and line 294: `if (this.ctx.tipo !== 'menu') { Music.abafar(this, 1, 0); Som.abafar(1, 0); }`. Import `Som`.

- [ ] **Step 7: The place of each scene** — at the start of each `create()`:
  `MenuScene`, `HangarScene`: `Som.lugar(lugarDaCena(this.scene.key), 0);`; `InterludeScene`, `Interlude2Scene`,
  `Interlude3Scene`, `Interlude4Scene`: the same line. `GameScene`, right after line 338
  (`this.stage = STAGES[data.stage ?? 1] ?? STAGES[1];`): `Som.lugar(lugarDaCena('Game', data.stage ?? 1), 0);`.
  Imports `Som` and `lugarDaCena` (`../som/acustica`). Check that `data.stage` is the 1–4 stage number by reading
  `STAGES` (if the keys differ, map them so stage 1 → 1 … stage 4 → 4).

- [ ] **Step 8: Run** — `npm run typecheck` (0 errors); `node scripts/test-som.mjs` (pass); with `npm run dev` running,
  `node scripts/test-som-jogo.mjs` → all `✔`. Then the M tests: `node scripts/test-pausa-jogo.mjs`,
  `node scripts/test-derrota-jogo.mjs`, `node scripts/test-carregamento.mjs` (pass; the `igual` of `test-pausa-jogo`
  may oscillate — repeat once before blaming the change); `npm run build` (ok).

---

### Task 5: the treatment script

**Files:**
- Create: `scripts/_som/_som-tratar.mjs`
- Test: `scripts/test-som-tratar.mjs`

**Interfaces:**
- Produces: CLI `node scripts/_som/_som-tratar.mjs <entrada> <saida-sem-extensao> [--camada acao|interface|ambiente|motor] [--laco] [--estereo]`
  → writes `<saida>.ogg` and `<saida>.m4a`, prints a JSON report `{ dur, pico, inicio }` (seconds, dBFS, seconds of
  leading silence left). Exported `tratar(entrada, saida, opcoes)` returning the same report.

- [ ] **Step 1: Write the failing test** — `scripts/test-som-tratar.mjs`:

```js
// BLOCK SOUND (15/11) — the treatment script on a synthetic file: the leading silence goes, the peak lands at
// -1 dBFS, both outputs exist, a short sound comes out mono.
//   node scripts/test-som-tratar.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tratar } from './_som/_som-tratar.mjs';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const dir = mkdtempSync(join(tmpdir(), 'som-'));
const cru = join(dir, 'cru.wav');
// 0.4 s of silence, then 0.5 s of a quiet stereo sine
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo:d=0.4', '-f', 'lavfi', '-i', 'sine=f=330:d=0.5:r=44100',
  '-filter_complex', '[1]volume=0.2,aformat=channel_layouts=stereo[s];[0][s]concat=n=2:v=0:a=1', cru]);
const r = tratar(cru, join(dir, 'saida'), { camada: 'acao' });
ok(existsSync(join(dir, 'saida.ogg')) && existsSync(join(dir, 'saida.m4a')), 'ogg and m4a written');
ok(r.inicio < 0.02, 'the leading silence is gone', r);
ok(r.dur > 0.45 && r.dur < 0.6, 'the sound itself stays', r);
ok(Math.abs(r.pico - -1) < 0.6, 'the peak at -1 dBFS', r);
const canais = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', join(dir, 'saida.ogg')]).toString().trim();
ok(canais === '1', 'a short sound comes out mono', canais);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
```

- [ ] **Step 2: Run, expect FAIL** — module not found.

- [ ] **Step 3: Write `scripts/_som/_som-tratar.mjs`:**

```js
// BLOCK SOUND (15/11) — the treatment of ONE sound for the game (spec §3.4): trims the silence, brings the peak to
// -1 dBFS (the short sounds; the long ambience goes to -24 LUFS instead), 5 ms fades at the ends (no click; not on a
// loop), mono unless --estereo, and writes the .ogg (vorbis q5) and the .m4a (aac 128k) side by side.
//   node scripts/_som/_som-tratar.mjs <entrada> <saida-sem-extensao> [--camada acao|interface|ambiente|motor] [--laco] [--estereo]
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
const ffErr = (args) => {
  try { return execFileSync('ffmpeg', ['-hide_banner', ...args], { stdio: ['ignore', 'pipe', 'pipe'] }).toString(); }
  catch (e) { return String(e.stderr ?? ''); }
};
const duracao = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const pico = (f) => Number(/max_volume:\s*(-?[\d.]+) dB/.exec(ffErr(['-i', f, '-af', 'volumedetect', '-f', 'null', '-']))?.[1] ?? NaN);
const silencioInicial = (f) => {
  const m = /silence_end:\s*([\d.]+)/.exec(ffErr(['-i', f, '-af', 'silencedetect=n=-50dB:d=0.005', '-f', 'null', '-']));
  const comeca = /silence_start:\s*([\d.]+)/.exec(ffErr(['-i', f, '-af', 'silencedetect=n=-50dB:d=0.005', '-f', 'null', '-']));
  return m && comeca && Number(comeca[1]) === 0 ? Number(m[1]) : 0;
};

export function tratar(entrada, saida, { camada = 'acao', laco = false, estereo = false } = {}) {
  mkdirSync(dirname(saida), { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'tratar-'));
  const a = join(tmp, 'a.wav');
  const canais = estereo || camada === 'ambiente' ? 2 : 1;
  const corte = laco
    ? 'anull'
    : 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse';
  ff(['-i', entrada, '-af', corte, '-ac', String(canais), '-ar', '44100', a]);
  const b = join(tmp, 'b.wav');
  const longo = camada === 'ambiente' || duracao(a) > 3;
  if (longo) ff(['-i', a, '-af', 'loudnorm=I=-24:TP=-1.5:LRA=11', '-ar', '44100', b]);
  else ff(['-i', a, '-af', `volume=${(-1 - pico(a)).toFixed(2)}dB`, b]);
  const c = join(tmp, 'c.wav');
  const d = duracao(b);
  ff(['-i', b, '-af', laco ? 'anull' : `afade=t=in:d=0.005,afade=t=out:st=${Math.max(0, d - 0.005).toFixed(4)}:d=0.005`, c]);
  ff(['-i', c, '-c:a', 'libvorbis', '-q:a', '5', `${saida}.ogg`]);
  ff(['-i', c, '-c:a', 'aac', '-b:a', '128k', `${saida}.m4a`]);
  return { dur: duracao(`${saida}.ogg`), pico: pico(c), inicio: silencioInicial(c) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [entrada, saida, ...resto] = process.argv.slice(2);
  if (!entrada || !saida) {
    console.error('uso: node scripts/_som/_som-tratar.mjs <entrada> <saida-sem-extensao> [--camada X] [--laco] [--estereo]');
    process.exitCode = 1;
  } else {
    const i = resto.indexOf('--camada');
    console.log(JSON.stringify(tratar(entrada, saida, { camada: i >= 0 ? resto[i + 1] : 'acao', laco: resto.includes('--laco'), estereo: resto.includes('--estereo') })));
  }
}
```

- [ ] **Step 4: Run, expect PASS** — `node scripts/test-som-tratar.mjs` → all `✔`. If the peak check fails after the
  fades, re-measure on `c` (already done) — the fades of 5 ms cannot raise the peak; if `aac` is missing, check
  `ffmpeg -encoders | findstr aac`.

---

### Task 6: the sound-sheet template

**Files:**
- Create: `docs/superpowers/folhas/_sons/folha-sons.js`, `docs/superpowers/folhas/_sons/folha-sons.css`,
  `scripts/_som/_folha-sons.mjs`
- Test: a sample sheet `docs/superpowers/folhas/2026-11-15/sons/0-amostra/` built from two synthetic takes, opened in
  the automated browser (Step 4).

**Interfaces:**
- Consumes: `PERFIS_SOM`, `AO_FUNDO`, `montarAcustica`, `type Lugar` (Task 2); `sortearVariacao` (Task 1).
- Produces: the sheet data format (`dados.json`):

```json
{ "titulo": "Folha 1 — a nave", "dia": "2026-11-15", "nota": "…",
  "grupos": [ { "titulo": "X-AELO", "sons": [
    { "nome": "nave.xaelo.tiro", "oque": "o tiro base", "onde": "toda a campanha com a X-AELO", "lugar": "atmosfera",
      "repetir": true, "variacao": { "tom": 0.04, "vol": 0.1 }, "laco": false,
      "versoes": [ { "id": "A", "arquivo": "v/nave.xaelo.tiro-A.ogg", "fonte": "PixelLab", "licenca": "PixelLab (conta dele)", "nota": "…" } ] } ] } ] }
```

  CLI: `node scripts/_som/_folha-sons.mjs <pasta-da-folha>` → writes `<pasta>/folha.html` from `<pasta>/dados.json`.
  Open at `http://localhost:5173/docs/superpowers/folhas/<dia>/sons/<n>-<grupo>/folha.html` (Vite serves `docs/` and
  transforms `/src/som/*.ts`).

- [ ] **Step 1: Write `scripts/_som/_folha-sons.mjs`:**

```js
// BLOCK SOUND (15/11) — builds a sound sheet's folha.html from its dados.json (spec §6). The page itself is the
// shared template in docs/superpowers/folhas/_sons/ (players, the place, repeat ×8, the music under, the choice).
//   node scripts/_som/_folha-sons.mjs <pasta-da-folha>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const pasta = process.argv[2];
if (!pasta) { console.error('uso: node scripts/_som/_folha-sons.mjs <pasta-da-folha>'); process.exitCode = 1; }
else {
  const dados = JSON.parse(readFileSync(join(pasta, 'dados.json'), 'utf8'));
  const molde = relative(pasta, 'docs/superpowers/folhas/_sons').replaceAll('\\', '/');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  writeFileSync(join(pasta, 'folha.html'), `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(dados.titulo)}</title>
<link rel="stylesheet" href="${molde}/folha-sons.css">
</head>
<body>
<script type="application/json" id="dados">${JSON.stringify(dados).replaceAll('</', '<\\/')}</script>
<main id="folha"></main>
<script type="module" src="${molde}/folha-sons.js"></script>
</body>
</html>
`);
  console.log(`folha.html escrita em ${pasta}`);
}
```

- [ ] **Step 2: Write `docs/superpowers/folhas/_sons/folha-sons.css`:**

```css
:root { --fundo: #0d0f14; --painel: #161a22; --linha: #232a36; --texto: #d8dde6; --fraco: #8a93a3; --acento: #e08a3c; --ok: #6fbf73; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--fundo); color: var(--texto); font: 14px/1.45 system-ui, sans-serif; }
main { max-width: 1100px; margin: 0 auto; padding: 24px 16px 160px; }
h1 { font-size: 22px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 32px 0 8px; color: var(--acento); }
.nota { color: var(--fraco); margin: 0 0 16px; }
.barra { position: sticky; top: 0; z-index: 2; display: flex; flex-wrap: wrap; gap: 12px; align-items: center; padding: 10px 12px; background: var(--painel); border: 1px solid var(--linha); border-radius: 8px; }
.barra label { display: flex; gap: 6px; align-items: center; }
.som { margin: 10px 0; padding: 12px; background: var(--painel); border: 1px solid var(--linha); border-radius: 8px; }
.som header { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: baseline; }
.som code { color: var(--acento); } .som .onde { color: var(--fraco); }
.versoes { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 8px; margin-top: 10px; }
.versao { padding: 8px; border: 1px solid var(--linha); border-radius: 6px; }
.versao.escolhida { border-color: var(--ok); box-shadow: 0 0 0 1px var(--ok) inset; }
.versao .fonte { color: var(--fraco); font-size: 12px; }
button { background: #222a37; color: var(--texto); border: 1px solid #334055; border-radius: 5px; padding: 4px 10px; cursor: pointer; font: inherit; }
button:hover { border-color: var(--acento); }
.escolha { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; align-items: center; }
.escolha input[type=text] { flex: 1; min-width: 180px; background: #0f1218; color: var(--texto); border: 1px solid var(--linha); border-radius: 5px; padding: 4px 8px; }
footer { position: fixed; left: 0; right: 0; bottom: 0; padding: 10px 16px; background: var(--painel); border-top: 1px solid var(--linha); }
footer textarea { width: 100%; height: 70px; background: #0f1218; color: var(--texto); border: 1px solid var(--linha); border-radius: 5px; font: 12px/1.4 ui-monospace, monospace; }
```

- [ ] **Step 3: Write `docs/superpowers/folhas/_sons/folha-sons.js`:**

```js
// BLOCK SOUND (15/11) — the shared sound-sheet page (spec §6): every take of every sound, heard AS IN THE GAME (the
// same acoustics module the game uses), repeated ×8 with the per-shot variation, optionally over the soundtrack; one
// choice per sound; the footer is the text he pastes in the conversation. The choice is kept in this browser only.
import { AO_FUNDO, montarAcustica } from '/src/som/acustica.ts';
import { sortearVariacao } from '/src/som/vozes.ts';

const dados = JSON.parse(document.getElementById('dados').textContent);
const raiz = document.getElementById('folha');
const CHAVE = `folha-sons:${location.pathname}`;
let escolhas = {};
try { escolhas = JSON.parse(localStorage.getItem(CHAVE) ?? '{}'); } catch { escolhas = {}; }

let ctx = null, ac = null, trilha = null;
const buffers = new Map();
let lugarForcado = '';
let fundo = false;
const rnd = Math.random;

function audio() {
  if (!ctx) {
    ctx = new AudioContext();
    ac = montarAcustica(ctx, 'atmosfera');
    ac.saida.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}
async function buffer(arquivo) {
  if (!buffers.has(arquivo)) buffers.set(arquivo, fetch(arquivo).then((r) => r.arrayBuffer()).then((b) => audio().decodeAudioData(b)));
  return buffers.get(arquivo);
}
async function tocar(som, versao, { variar = false, quando = 0 } = {}) {
  const c = audio();
  const lugar = lugarForcado || som.lugar || 'cabine';
  ac.mudar(lugar, 0);
  const b = await buffer(versao.arquivo);
  const f = c.createBufferSource();
  f.buffer = b;
  const g = c.createGain();
  const v = variar ? sortearVariacao(rnd, som.variacao?.tom ?? 0.04, som.variacao?.vol ?? 0.1) : { taxa: 1, ganho: 1 };
  f.playbackRate.value = v.taxa;
  g.gain.value = 0.8 * v.ganho;
  let no = f.connect(g);
  if (fundo) {
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = AO_FUNDO[lugar].passaBaixa;
    g.gain.value *= AO_FUNDO[lugar].volume;
    no = no.connect(lp);
  }
  no.connect(som.interface ? c.destination : ac.entrada);
  f.start(c.currentTime + quando);
  if (som.laco) f.stop(c.currentTime + quando + 6);
}
function alternarTrilha(liga) {
  if (!liga) { trilha?.pause(); return; }
  trilha ??= Object.assign(new Audio('/audio/stage1.mp3'), { loop: true, volume: 0.45 });
  trilha.play();
}
function gravar() {
  try { localStorage.setItem(CHAVE, JSON.stringify(escolhas)); } catch { /* private window */ }
  const linhas = [];
  for (const gr of dados.grupos) for (const s of gr.sons) {
    const e = escolhas[s.nome];
    if (e?.id || e?.nota) linhas.push(`${s.nome}: ${e.id ?? '?'}${e.nota ? ` — ${e.nota}` : ''}`);
  }
  document.getElementById('texto').value = linhas.join('\n');
  document.querySelectorAll('.versao').forEach((el) => el.classList.toggle('escolhida', escolhas[el.dataset.som]?.id === el.dataset.id));
}
const el = (tag, props = {}, ...filhos) => { const e = Object.assign(document.createElement(tag), props); e.append(...filhos); return e; };

raiz.append(
  el('h1', { textContent: dados.titulo }),
  el('p', { className: 'nota', textContent: dados.nota ?? '' }),
  el('div', { className: 'barra' },
    el('label', {}, 'lugar:', (() => {
      const s = el('select');
      for (const [v, t] of [['', 'o do som'], ['atmosfera', 'atmosfera'], ['caverna', 'caverna'], ['cabine', 'espaço (cabine)'], ['interior', 'interior'], ['agua', 'água']]) s.append(el('option', { value: v, textContent: t }));
      s.onchange = () => { lugarForcado = s.value; };
      return s;
    })()),
    el('label', {}, (() => { const c = el('input', { type: 'checkbox' }); c.onchange = () => { fundo = c.checked; }; return c; })(), 'ao fundo'),
    el('label', {}, (() => { const c = el('input', { type: 'checkbox' }); c.onchange = () => alternarTrilha(c.checked); return c; })(), 'trilha por baixo'),
  ),
);
for (const gr of dados.grupos) {
  raiz.append(el('h2', { textContent: gr.titulo }));
  for (const s of gr.sons) {
    const caixa = el('section', { className: 'som' },
      el('header', {}, el('code', { textContent: s.nome }), el('strong', { textContent: s.oque }), el('span', { className: 'onde', textContent: `${s.onde} · ${s.lugar ?? 'cabine'}` })));
    const grade = el('div', { className: 'versoes' });
    for (const v of s.versoes) {
      grade.append(el('div', { className: 'versao', dataset: { som: s.nome, id: v.id } },
        el('div', {}, el('strong', { textContent: v.id }), ' ',
          el('button', { textContent: '▶', onclick: () => tocar(s, v) }), ' ',
          s.repetir ? el('button', { textContent: '×8', onclick: () => { for (let i = 0; i < 8; i++) tocar(s, v, { variar: true, quando: i * 0.14 }); } }) : ''),
        el('div', { className: 'fonte', textContent: `${v.fonte} · ${v.licenca}` }),
        v.nota ? el('div', { className: 'fonte', textContent: v.nota }) : ''));
    }
    const escolha = el('div', { className: 'escolha' });
    for (const id of [...s.versoes.map((v) => v.id), 'refazer']) {
      const r = el('input', { type: 'radio', name: s.nome, value: id, checked: escolhas[s.nome]?.id === id });
      r.onchange = () => { escolhas[s.nome] = { ...escolhas[s.nome], id }; gravar(); };
      escolha.append(el('label', {}, r, id));
    }
    const nota = el('input', { type: 'text', placeholder: 'nota (opcional)', value: escolhas[s.nome]?.nota ?? '' });
    nota.oninput = () => { escolhas[s.nome] = { ...escolhas[s.nome], nota: nota.value }; gravar(); };
    escolha.append(nota);
    caixa.append(grade, escolha);
    raiz.append(caixa);
  }
}
document.body.append(el('footer', {}, el('div', { textContent: 'as escolhas (copie e cole na conversa):' }), el('textarea', { id: 'texto', readOnly: true })));
gravar();
```

- [ ] **Step 4: Check it with a sample sheet** — make `docs/superpowers/folhas/2026-11-15/sons/0-amostra/v/`, write two
  synthetic takes with ffmpeg (`sine=f=440:d=0.3` → `teste.a-A.ogg`, `sine=f=220:d=0.3` → `teste.a-B.ogg`, through
  `_som-tratar.mjs`), a `dados.json` with one group and one sound (`"repetir": true`), run
  `node scripts/_som/_folha-sons.mjs docs/superpowers/folhas/2026-11-15/sons/0-amostra`, then in a Playwright script in
  the scratchpad: open the page, assert no `pageerror`, 2 `.versao` elements, click A's `▶` and `×8` (no error), click
  radio B and assert the textarea reads `teste.a: B`. Delete the `0-amostra` folder afterwards.

---

### Task 7: sheet 1 — the ship (sourcing, treatment, the sheet)

**Files:**
- Create: `assets/raw/sons/nave/` (the raw takes), `assets/raw/sons/_kenney/<pacote>/` (the CC0 packs with their
  `License.txt`), `docs/superpowers/folhas/2026-11-15/sons/1-nave/{dados.json,folha.html,v/*.ogg}`

**The sounds of sheet 1 (26), with the place each one is judged in:**

| nome | o que é | lugar | laço |
|---|---|---|---|
| `nave.xaelo.tiro` / `nave.terminus.tiro` / `nave.charybdis.tiro` | the base shot of each ship | atmosfera (X-AELO, TERMINUS: F1) · cabine (CHARYBDIS) | — |
| `nave.xaelo.motor` / `nave.terminus.motor` / `nave.charybdis.motor` | the engine (the auto-presence loop) | the same | ✔ |
| `nave.xaelo.atingida` / `…terminus…` / `…charybdis…` | hit (lost the hull or a life) | cabine | — |
| `nave.xaelo.vida` / `…terminus…` / `…charybdis…` | the life lost (the 24 px chip) | cabine | — |
| `nave.xaelo.morte` (RUPTURA) / `nave.terminus.morte` (ESTILHAÇOS) / `nave.charybdis.morte` (DESINTEGRAÇÃO) | the death (`numerosMorte.ts`: jato = ruptura, a = estilhaços, alien = desintegra) | cabine | — |
| `nave.missil.lancar`, `nave.missil.travar` | the guided missile (Q): launch, lock | cabine | — |
| `nave.drone.tiro` | the escort drone's shot | cabine | — |
| `nave.bomba.lancar` | the drop bomb leaving the ship (the blast is sheet 2) | cabine | — |
| `nave.dash` | the invulnerable dash | cabine | — |
| `nave.impulso` | the F1 flap impulse | atmosfera | — |
| `nave.casco.absorver`, `nave.casco.quebrar`, `nave.casco.voltar` | the HULL card: absorbs, breaks, recharges | cabine | — |
| `nave.flare.soltar` | the FLARE trap dropped behind | cabine | — |
| `momento.f1.estrondo` | **the sonic boom at the F1 opening** (his ask) | atmosfera | — |

**Per take, the sources (2–3 takes per sound, at least one PixelLab for the identity sounds):**
- PixelLab `create_sound_effect` — prompts in English, describing the sound, the ship and the place, never "music".
  Starting prompts (vary wording per take; the shot ~0.5–0.8 s, the engine loops 6 s, deaths ~2.5 s, the boom ~3 s):
  - X-AELO shot: *"a single short blaster shot from a small agile human fighter jet, punchy bright attack with a quick
    low thump, dark sci-fi, dry, no music"*;
  - TERMINUS shot: *"a single heavier energy cannon shot from an armored black-and-orange human gunship, short metallic
    punch with a low electric crack, dark sci-fi, dry"*;
  - CHARYBDIS shot: *"a single organic alien bio-energy shot from a living manta-ray ship, wet pulse with a resonant
    glassy hum, short, dark sci-fi creature weapon"*;
  - engines: *"continuous steady low engine hum of a small fighter jet, seamless, no start or end"* (human),
    *"continuous breathing organic hum of a living alien ship, slow pulse, seamless"* (CHARYBDIS);
  - deaths: RUPTURA *"a fighter's hull ripping open, metal tearing and a deep burst, debris"*; ESTILHAÇOS *"a ship
    shattering into many metal shards, sharp breaking glass-like metal and a short blast"*; DESINTEGRAÇÃO *"an organic
    alien ship disintegrating into glowing dust, a rising hiss and a soft deep collapse"*;
  - the boom: *"a jet breaking the sound barrier high in the sky, a sharp double sonic boom followed by the roar of air
    tearing, distant thunder-like tail"*.
- Kenney CC0 packs (`kenney.nl/assets/sci-fi-sounds`, `impact-sounds`, `interface-sounds`): download the zip, keep it
  with its `License.txt` in `assets/raw/sons/_kenney/<pack>/`; good for the missile, drone, dash, hull, flare layers.
- Freesound only with the CC0 filter (the link and the author go to `docs/SONS.md` when chosen).

- [ ] **Step 1:** Download the three Kenney packs (WebFetch the asset page to get the zip URL; `curl -L -o` to
  `assets/raw/sons/_kenney/`; unzip; keep `License.txt`).
- [ ] **Step 2:** Generate the PixelLab takes (the prompts above; 2 per identity sound, 1 for the commons where a
  Kenney take exists); `wait_for_jobs`; download each WAV to `assets/raw/sons/nave/<nome>-<id>.wav`.
- [ ] **Step 3:** Treat every take: `node scripts/_som/_som-tratar.mjs <raw> docs/superpowers/folhas/2026-11-15/sons/1-nave/v/<nome>-<id> --camada <acao|motor> [--laco]`.
  Read each report: discard a take with a clipped/garbled sound, a leading gap, or a loop that clicks at the seam
  (for loops: play it twice back to back in the sheet and listen to the seam via the waveform — `ffmpeg -i x.ogg
  -filter_complex "[0][0]concat=n=2:v=0:a=1,showwavespic=s=1200x200" seam.png` and look at the seam).
- [ ] **Step 4:** Write `dados.json` (groups: X-AELO · TERMINUS · CHARYBDIS · comuns · o momento) and build the sheet
  with `_folha-sons.mjs`. Open it in the automated browser (no `pageerror`, every take decodes: evaluate a decode of
  each `arquivo`).
- [ ] **Step 5:** Run every test once more (`test-som`, `test-som-tratar`, `test-som-jogo`, the M tests, build).
- [ ] **Step 6:** Show him the sheet URL and stop: he listens and pastes the choices. **The installation of his
  choices (the catalogue entries, `public/sfx/`, `docs/SONS.md`, the calls in the ship's code) is the next plan,
  written once the choices exist.**
