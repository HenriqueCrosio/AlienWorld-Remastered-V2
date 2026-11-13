# Bloco I, etapa 2 — os clarões no lugar dos flashes de tela cheia · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar as 21 chamadas de `cameras.main.flash` (e o clarão de tela cheia da cutscene final) pelas quatro
formas aprovadas: clarão local, vinheta, tela fraca, com um teto de 3 por segundo.

**Architecture:** um módulo novo `src/systems/clarao/` — as regras puras (`claraoRegras.ts`), as texturas assadas em
canvas (`texturasClarao.ts`) e a interface por cena (`Clarao.ts`, obtida por `claraoDe(scene)`). Cada chamada de hoje
vira uma chamada da família dela. O teto é um só por jogo.

**Tech Stack:** Phaser 3.90, TypeScript, Vite; testes puros em `node scripts/test-*.mjs` (o Node importa `.ts` direto:
só TypeScript apagável, sem Phaser, nos arquivos puros).

Spec: `specs/2026-11-13-bloco-i-flashes-design.md`. Folha aprovada: `folhas/2026-11-13/flashes/flashes.html`.

## Global Constraints

- Nenhuma chamada de `cameras.main.flash` sobra em `src/`.
- Pixel na resolução nativa 384×216: disco e vinheta quantizados em 4 níveis pelo Bayer 4×4, 6 quadros; sem `Graphics`.
- As cores são as de hoje, chamada por chamada. Os números são os da spec §2.
- `shake`, fagulhas, explosões, véus pretos, mecânica e tempos de cena NÃO mudam.
- A HUD (profundidade 99+) fica limpa: disco em 90, vinheta e tela em 98.
- Commit e push só quando ele pedir, só no nome dele, nunca para `legacy`; vídeos e `q/` fora do git.
- Editar com Edit/Write (CRLF); testes terminam com `process.exitCode`.
- Durante uma filmagem não editar `src/` nem `.html` do projeto.

---

### Task 1: as regras puras e o teste

**Files:**
- Create: `src/systems/clarao/claraoRegras.ts`
- Create: `scripts/test-claroes.mjs`

**Interfaces — Produces:**
- `CLARAO` (os números), `BAYER4: number[]`
- `nivel(v: number, x: number, y: number): number` — 0…4
- `forcaDisco(px: number, py: number, raio: number): number` — 0…1
- `forcaVinheta(px: number, py: number): number` — 0…1
- `raioDoImpacto(escala: number): number` — múltiplo de 4 entre 40 e 120
- `teto(janela: number[], agora: number): number` — muda `janela`, devolve 1 ou 0,35

- [ ] **Step 1: o teste que falha** — `scripts/test-claroes.mjs`:

```js
// BLOCO I, etapa 2 (13/11) — the flashes become local light / vignette / weak screen (plan `plans/2026-11-13-bloco-i-flashes.md`):
//   regras — the ceiling, the impact radius, the disc, the vignette, the quantisation;
//   src    — no camera flash left in src/.
//   node scripts/test-claroes.mjs [section …]
import fs from 'node:fs';
import path from 'node:path';
import { CLARAO, nivel, forcaDisco, forcaVinheta, raioDoImpacto, teto } from '../src/systems/clarao/claraoRegras.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const secoes = process.argv.slice(2);
const roda = (s) => !secoes.length || secoes.includes(s);

if (roda('regras')) {
  const j = [];
  const f = [0, 100, 200, 300, 400].map((t) => teto(j, t));
  ok(f[0] === 1 && f[1] === 1 && f[2] === 1, 'o teto: os 3 primeiros do segundo saem inteiros');
  ok(f[3] === CLARAO.teto.atenuado && f[4] === CLARAO.teto.atenuado, 'o teto: do 4º em diante, atenuado');
  ok(teto(j, 1500) === 1, 'o teto: depois de 1 s sem nada, volta inteiro');
  ok(raioDoImpacto(0.1) === 40 && raioDoImpacto(9) === 120, 'o raio do impacto fica entre 40 e 120');
  ok(raioDoImpacto(1) === 56 && raioDoImpacto(1.7) % 4 === 0, 'o raio do impacto: 56 por escala, em múltiplos de 4');
  ok(forcaDisco(60, 60, 60) > 0.9 && forcaDisco(0, 0, 60) === 0 && forcaDisco(119, 60, 60) < 0.01, 'o disco: cheio no centro, zero fora do raio');
  ok(forcaVinheta(192, 108) === 0 && forcaVinheta(96, 108) === 0, 'a vinheta: o meio da tela fica limpo');
  ok(forcaVinheta(0, 0) === 1 && forcaVinheta(383, 215) === 1, 'a vinheta: cheia nos cantos');
  let max = 0, min = 9;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) for (const v of [0, 0.3, 0.7, 1, 2]) { const n = nivel(v, x, y); max = Math.max(max, n); min = Math.min(min, n); }
  ok(max === CLARAO.niveis && min === 0, 'a quantização: de 0 a 4 níveis, nunca mais');
  ok(nivel(0, 3, 3) === 0, 'a quantização: luz zero não acende pixel nenhum');
}

if (roda('src')) {
  const achados = [];
  const anda = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) anda(p); else if (/\.ts$/.test(e.name) && /cameras\.main\.flash\(|\.flashEffect/.test(fs.readFileSync(p, 'utf8'))) achados.push(p); } };
  anda('src');
  ok(achados.length === 0, `nenhum flash de câmera em src/ ${achados.length ? '→ ' + achados.join(', ') : ''}`);
}

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exitCode = falhas ? 1 : 0;
```

- [ ] **Step 2:** `node scripts/test-claroes.mjs regras` → falha (o módulo não existe).

- [ ] **Step 3: `src/systems/clarao/claraoRegras.ts`** (puro, sem Phaser, sem `enum`):

```ts
export const CLARAO = {
  forca: 1,
  niveis: 4,
  quadros: 6,
  teto: { porSegundo: 3, janelaMs: 1000, atenuado: 0.35 },
  impacto: { raioPorEscala: 56, raioMin: 40, raioMax: 120, pico: 0.6, msMin: 220, msFator: 1.5 },
  climax: { raio: 150, pico: 0.6 },
  sinal: { pico: 0.7, ms: 300, raioNave: 56, raioChefe: 100 },
  golpe: { inicio: 0.7, faixa: 0.5, pico: 0.75, msMin: 180, msFator: 2 },
  largada: { pico: 0.28, msFator: 0.75 },
  depth: { local: 90, tela: 98 },
  tela: { w: 384, h: 216 },
} as const;

export const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export function nivel(v: number, x: number, y: number): number {
  if (v <= 0) return 0;
  return Math.min(CLARAO.niveis, Math.floor(v * CLARAO.niveis + BAYER4[(y & 3) * 4 + (x & 3)] / 16));
}

export function forcaDisco(px: number, py: number, raio: number): number {
  const d = Math.hypot(px - raio + 0.5, py - raio + 0.5) / raio;
  return d >= 1 ? 0 : (1 - d) * (1 - d);
}

export function forcaVinheta(px: number, py: number): number {
  const { w, h } = CLARAO.tela;
  const e = Math.hypot((px - (w - 1) / 2) / (w / 2), (py - (h - 1) / 2) / (h / 2));
  return Math.max(0, Math.min(1, (e - CLARAO.golpe.inicio) / CLARAO.golpe.faixa));
}

export function raioDoImpacto(escala: number): number {
  const I = CLARAO.impacto;
  return Math.max(I.raioMin, Math.min(I.raioMax, Math.round((I.raioPorEscala * escala) / 4) * 4));
}

export function teto(janela: number[], agora: number): number {
  while (janela.length && (janela[0] < agora - CLARAO.teto.janelaMs || janela[0] > agora)) janela.shift();
  const fator = janela.length < CLARAO.teto.porSegundo ? 1 : CLARAO.teto.atenuado;
  janela.push(agora);
  return fator;
}
```

(A guarda `janela[0] > agora` limpa a janela se o relógio voltar — um jogo reiniciado.)

- [ ] **Step 4:** `node scripts/test-claroes.mjs regras` → tudo ✔.

### Task 2: as texturas e a interface

**Files:**
- Create: `src/systems/clarao/texturasClarao.ts`
- Create: `src/systems/clarao/Clarao.ts`

**Interfaces — Consumes:** tudo da Task 1.
**Produces:**
- `texturaDisco(scene: Phaser.Scene, raio: number): string`, `texturaVinheta(scene: Phaser.Scene): string` (a chave; assa na 1ª vez)
- `claraoDe(scene: Phaser.Scene): Clarao`, com
  - `impacto(x, y, cor, o?: { escala?: number; raio?: number; ms?: number; depth?: number }): void` (ms padrão 120)
  - `climax(x, y, cor, ms, depth?): void`
  - `sinal(x, y, cor, raio, depth?): void`
  - `golpe(cor, ms): void`
  - `largada(cor, ms): void`
  - `conta(): void` (só registra um clarão no teto; os quadros de impacto da cutscene final)

- [ ] **Step 1: `texturasClarao.ts`** — `assa(scene, chave, w, h, forca)`: um canvas de `w × 6` por `h`; no quadro `k` a força
  é `forca(x, y) × (1 − k/6)`; cada pixel branco com alpha `nivel/4 × 255`; `t.add(k, 0, k*w, 0, w, h)`. `texturaDisco` usa
  `forcaDisco` num quadrado de `2·raio`; `texturaVinheta` usa `forcaVinheta` em 384×216.
- [ ] **Step 2: `Clarao.ts`** — a janela do teto no módulo; `claraoDe` guarda a instância num `WeakMap` por cena; cada
  método calcula `pico × teto(janela, scene.time.now) × CLARAO.forca`, cria a imagem (`ADD`, `setTint(cor)`,
  `setAlpha`, a profundidade), e um `time.addEvent({ delay: ms/6, repeat: 5 })` avança o quadro e destrói no fim. A
  `largada` é um `rectangle` liso com `tweens.add({ alpha: 0 })`. As durações: impacto `max(ms × 1,5, 220)`; clímax os
  `ms`; sinal 300; golpe `max(ms × 2, 180)`; largada `ms × 0,75`.
- [ ] **Step 3:** `npm run typecheck` → sem erro.

### Task 3: as 21 chamadas + a cutscene final

**Files (Modify):** `src/systems/Fx.ts`, `src/entities/Boss.ts`, `src/entities/BossCapitania.ts`,
`src/entities/BossSerpente.ts`, `src/entities/sangue.ts`, `src/scenes/GameScene.ts`, `src/systems/CartasEmJogo.ts`,
`src/systems/morte/MorteDaNave.ts`, `src/scenes/InterludeScene.ts`, `src/scenes/Interlude2Scene.ts`,
`src/scenes/Interlude3Scene.ts`, `src/scenes/final/queda.ts`.

| onde | sai | entra |
|---|---|---|
| `Fx.explodeBig`, `Fx.abaloGrande` | `flash(120, 255, 190, 110)` | `claraoDe(this.scene).impacto(x, y, 0xffbe6e, { escala })` |
| `Boss` a virada | `flash(160, 232, 60, 140)` | `sinal(this.sprite.x, this.sprite.y, 0xe83c8c, CLARAO.sinal.raioChefe)` |
| `BossCapitania` a fúria | `flash(180, 232, 48, 107)` | `sinal(this.sprite.x, this.sprite.y, 0xe8306b, CLARAO.sinal.raioChefe)` |
| `BossSerpente` a fusão | `flash(220, 255, 255, 255)` | `sinal(cx, LUTA.crista, 0xffffff, CLARAO.sinal.raioChefe)` |
| `sangue.ts` | `flash(260, 140, 0, 0)` | `impacto(x, y, 0x8c0000, { escala, ms: 260 })` |
| `GameScene` a atmosfera | `flash(400, 180, 230, 255)` | `largada(0xb4e6ff, 400)` |
| `GameScene` a bomba de pânico | `flash(220, 255, 232, 180)` | `impacto(GAME_WIDTH / 2, GAME_HEIGHT / 2, 0xffe8b4, { raio: 120, ms: 220 })` |
| `GameScene` a perda de casco | `flash(90, 255, 122, 168)` | `golpe(0xff7aa8, 90)` |
| `CartasEmJogo` o Casco | `flash(70, 62, 224, 240)` | `golpe(0x3ee0f0, 70)` |
| `MorteDaNave.clarao` | `flash(ms, cor…)` | `golpe((cor[0] << 16) \| (cor[1] << 8) \| cor[2], ms)` |
| `Interlude{,2}` a largada | `flash(160, 255, 212, 71)` | `largada(0xffd447, 160)` |
| `Interlude3` a largada | `flash(160, 255, 80, 80)` | `largada(0xff5050, 160)` |
| `Interlude{,2,3}` "nave armada" | `flash(200, 62, 224, 240)` | `sinal(this.ship.x, this.ship.y, 0x3ee0f0, CLARAO.sinal.raioNave)` |
| `Interlude` a Aurora | `flash(500, 255, 210, 120)` | `climax(GAME_WIDTH / 2, InterludeScene.DECK_Y - 30, 0xffd278, 500)` |
| `Interlude2` a doca | `flash(800, 255, 170, 90)` | `climax(artToScreenX(168), artToScreenY(155), 0xffaa5a, 800)` |
| `Interlude3` o clarão final | `flash(700, 255, 150, 80)` | `largada(0xff9650, 700)` |
| `Interlude3` o impacto | `flash(140, 255, 150, 80)` | `impacto(impactoX, g.bocaY, 0xff9650, { escala: 0.7, ms: 140 })` |
| `final/queda.ts` o clarão | o `rectangle` ADD a 0,6 + o tween | `climax(NARIZ.x, NARIZ.y, 0xffc890, 280, DEPTH.CENARIO + 4)` |
| `final/queda.ts` os quadros de impacto | (ficam) | `conta()` ao acender a chapa e ao inverter |

- [ ] **Step 1:** trocar cada linha (Edit), com o import de `claraoDe` (e de `CLARAO` onde o raio é usado).
- [ ] **Step 2:** `node scripts/test-claroes.mjs src` → ainda falha só por `Atmosfera.ts` (a Task 4).
- [ ] **Step 3:** `npm run typecheck` → sem erro.

### Task 4: a Atmosfera larga o `uFlash`

**Files (Modify):** `src/systems/atmosfera/Atmosfera.ts` (a leitura do `flashEffect`),
`src/systems/atmosfera/AtmosferaPipeline.ts` (o `uniform float uFlash`, o `* (1.0 - uFlash)` do halo, o campo `flash` e
o `set1f('uFlash', …)`).

- [ ] **Step 1:** tirar as quatro coisas; o halo fica `cor += uCorHalo * max(v, 0.0) * uForcaHalo * respira;`.
- [ ] **Step 2:** `node scripts/test-claroes.mjs` → tudo ✔. `npm run build` → sem erro.
- [ ] **Step 3:** todos os testes: `for f in scripts/test-*.mjs; do node "$f" > /dev/null || echo "FALHOU $f"; done` → nada.

### Task 5: a prova no jogo

**Files:** `scripts/_i/_flashes-conceitos.mjs` (usar `--modo hoje`: não troca nada, filma o jogo como está),
`docs/superpowers/folhas/2026-11-13/flashes/instalado.html` (Create).

- [ ] **Step 1:** filmar as cinco cenas no jogo de verdade (`--modo hoje`, saída `<cena>-jogo`) e conferir, quadro a
  quadro nos picos da folha aprovada, que cada clarão está onde o conceito o pôs (ampliado).
- [ ] **Step 2:** filmar os que o conceito não mostrou: a cutscene final (a queda), a virada da Torre da F1, a fusão da
  Serpente, o núcleo da F4 — o que a sonda alcançar; o que não alcançar, dizer a ele.
- [ ] **Step 3:** a folha `instalado.html` (conceito × instalado) e os docs (o 🧭 e o START). Nada commitado sem ele pedir.
