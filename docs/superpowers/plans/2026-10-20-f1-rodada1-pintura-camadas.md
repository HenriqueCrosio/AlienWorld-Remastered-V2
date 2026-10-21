# F1 · Rodada 1 — a pintura e as camadas · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A F1 roda sobre a pintura nova dele (inteira, 429×216, com deriva de 45 px), com os faróis piscando, a cachoeira correndo, a cordilheira tirada da própria pintura, a bruma entre os planos, o chão na paleta dela e o tratamento recalculado — filmada em velocidade real numa folha para ele aprovar.

**Architecture:** As camadas são ASSADAS fora do jogo por scripts em `scripts/_g/` (a pintura, a camada "apagada" das luzes, a cachoeira, as peças da cordilheira, o chão), reaproveitando as regras de luz do menu, extraídas para `scripts/_cenario/luzes.mjs`. No jogo, `src/f1/` (no molde de `src/menu/`) monta o horizonte e o anima por funções puras do relógio da fase; o `Parallax.buildSurface` troca as camadas antigas pelas novas e só repassa o relógio.

**Tech Stack:** Phaser 3.90, TypeScript 5.7, Vite 6, Node 24 (roda `.ts` direto nos testes), sharp 0.35, Playwright 1.61.

**Spec:** `docs/superpowers/specs/2026-10-20-f1-cenario-design.md` (§4 = esta rodada; §9 = as rodadas).

## Global Constraints

- **A pintura entra INTEIRA**, reduzida do original numa passada (lanczos3) à altura 216 → 429×216, escala 1. Nunca recorte ampliado, nunca `setScale` em arte (*"todos os fundos das fases são no tamanho original da pintura, exatamente para dar o aspecto de grandeza e profundidade"*).
- **1 px de arte = 1 px de jogo** em tudo o que é novo: a cordilheira entra com `scale: [1, 1]` (as alturas são assadas), sem `tint` de código.
- **A dificuldade da F1 está FECHADA:** nada do roteiro, das peças de jogo, da física ou das áreas de colisão muda nesta rodada.
- **O jogo é determinístico no dado do jogo:** arte de fundo usa `Math.random`/LCG próprio, NUNCA `Phaser.Math.RND`/`Phaser.Math.Between` (o `addLayer` existente já respeita isso no que é dele).
- **Commit só quando ele pedir**, só no nome dele (sem `Co-Authored-By`), sem GIFs/vídeos; nunca empurrar para `legacy`. Nenhum passo deste plano commita.
- Comentários: em `src/` em português (como o resto do `src/`); em `scripts/_g/` e `scripts/_cenario/` em inglês (como `scripts/_menu/`).
- Edite arquivos com a ferramenta Edit/Write, nunca `sed`/`node -e` (o repositório tem CRLF; edição por script falha em silêncio).
- `npm run dev` precisa estar no ar (porta 5173) para as sondas e a filmagem.

## Desvios da spec (anotar no fim do plano ao executar)

1. **A máscara do céu vai para a rodada 2.** Na rodada 1 nada passa entre o céu e as montanhas; o recorte certo depende de ONDE as naves invasoras descem (a silhueta da colina da cidadela, nítida, em vez de segmentar a névoa distante, que é ambígua). A spec §4 fica valendo; muda só a rodada.
2. **A cordilheira de trás é a MESMA arte da da frente, menor e mais enevoada** (o precedente das duas `mtnMid` e a regra "a camada de trás diminui"): três peças boas recortadas das massas da frente da pintura, em vez de seis recortes de risco na névoa.
3. **O chão é o desenho de hoje RECOLORIDO na paleta da rocha da pintura** (casamento de histograma). Arte nova de chão só se ele pedir ao ver.
4. **Só a cachoeira corre; o rio fica pintado.** O rio está no terço de baixo da pintura, atrás da cordilheira nova; animar o que quase não aparece é custo sem retorno. Se ele aparecer entre as peças e pedir, entra na rodada 2.

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `scripts/_cenario/luzes.mjs` (novo) | As regras de luz de uma pintura (detectar, marcar o que muda, apagar por difusão, agrupar), extraídas sem mudança do `_camadas.mjs` do menu. |
| `scripts/_cenario/_comparar.mjs` (novo) | Compara duas pastas de camadas pixel a pixel (a regressão do menu). |
| `scripts/_menu/_camadas.mjs` (mod.) | Passa a importar as regras de `luzes.mjs`. Saída idêntica. |
| `src/f1/numerosF1.ts` (novo) | Os números do cenário da F1 (pintura, deriva, profundidades, bruma, cordilheira, cores). Puro. |
| `src/f1/ritmosF1.ts` (novo) | `derivaPintura(t)`. Puro. |
| `scripts/test-f1-ritmos.mjs` (novo) | Teste no Node dos números e do relógio. |
| `scripts/_g/_camadas-f1.mjs` (novo) | Assa `public/sprites/f1/{pintura,apagadas,cachoeira}.png` + `dados.json`. |
| `scripts/_g/_auditar-luzes-f1.mjs` (novo) | Folha de cada luz acesa × apagada, recortada como o jogo recorta. |
| `scripts/_g/_cordilheira-f1.mjs` (novo) | Assa `public/sprites/f1-cordilheira{,-2,-3}.png` e `f1-cordilheira-perto{,-2,-3}.png`. |
| `scripts/_g/_chao-f1.mjs` (novo) | Recolore `public/sprites/ground-tile.png` (o antigo vai para `assets/raw/ground-tile-original.png`). |
| `scripts/_g/_cor-nevoa-f1.mjs` (novo) | Imprime a cor da névoa da pintura (para `perfis.ts` e `numerosF1.ts`). |
| `src/f1/horizonte.ts` (novo) | Monta a pintura, os faróis, a cachoeira; `atualizar(t)`; a lista de objetos que a saída apaga. |
| `src/scenes/BootScene.ts` (mod.) | Carrega as texturas e o `dados.json` da F1. |
| `src/Parallax.ts` (mod.) | `buildSurface` com as camadas novas; `setRelogio`; a saída apaga o horizonte e a bruma. |
| `src/scenes/GameScene.ts` (mod.) | Passa `this.elapsed` ao `Parallax` a cada quadro. |
| `src/systems/atmosfera/perfis.ts` (mod.) | A cor da névoa do `faseF1` tirada da pintura nova. |
| `scripts/_g/_probe-f1.mjs` (novo) | A sonda da rodada (o horizonte montado, as camadas velhas fora, a deriva, os faróis, a saída). |
| `scripts/_g/_filmar-f1.mjs` (novo) | Filma a F1 num relógio a passos (30 fps) → WebM + quadros. |
| `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1.html` (novo) | A folha da rodada para ele. |

---

### Task 1: As regras de luz num módulo compartilhado (com regressão do menu)

**Files:**
- Create: `scripts/_cenario/luzes.mjs`
- Create: `scripts/_cenario/_comparar.mjs`
- Modify: `scripts/_menu/_camadas.mjs` (o import no topo; o bloco "3. The lights", linhas 171–348)

**Interfaces:**
- Produces (usado nas Tasks 3 e 4):
  - `lum(r: number, g: number, b: number): number`
  - `detectarLuzes(cidade: Buffer, W: number, H: number, K: number): Uint8Array` — 0 nada, 1 janela (luz quente), 2 farol.
  - `marcarMuda(cidade: Buffer, W: number, H: number, K: number, tipo: Uint8Array): Uint8Array` — 1 = pixel de luz, 2 = franja/halo.
  - `apagarPorDifusao(cidade: Buffer, W: number, H: number, muda: Uint8Array): Buffer` — RGBA, transparente fora do que muda.
  - `gruposDeLuz(tipo: Uint8Array, W: number, H: number, K: number): Array<{ tipo: 'janela'|'farol', x, y, w, h, n }>` — caixas em px de jogo (÷K).
  - `cidade` é RGBA na densidade da camada; alpha 255 = pintura opaca (o resto é janela de céu e é ignorado).

- [ ] **Step 1: A linha de base — assar o menu com o código de HOJE**

```bash
cd "/c/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater"
node scripts/_menu/_camadas.mjs "$TEMP/aw-g/menu-antes-k1" 1
node scripts/_menu/_camadas.mjs "$TEMP/aw-g/menu-antes-k4" 4
```
Expected: duas linhas `… k=1 384x216 nave … grupos N janelas J faróis F` e `… k=4 1536x864 …`.

- [ ] **Step 2: Escrever o comparador**

`scripts/_cenario/_comparar.mjs`:
```js
// Compares two layer folders: PNGs pixel by pixel, JSON byte by byte. Exit 1 on any difference.
//   node scripts/_cenario/_comparar.mjs <dirA> <dirB>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [A, B] = process.argv.slice(2);
let difs = 0;
for (const n of fs.readdirSync(A).filter((f) => /\.(png|json)$/.test(f)).sort()) {
  const a = path.join(A, n);
  const b = path.join(B, n);
  if (!fs.existsSync(b)) {
    console.log('FALTA ', n);
    difs++;
    continue;
  }
  let ok;
  if (n.endsWith('.json')) ok = fs.readFileSync(a, 'utf8') === fs.readFileSync(b, 'utf8');
  else {
    const [ra, rb] = await Promise.all([a, b].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    ok = ra.info.width === rb.info.width && ra.info.height === rb.info.height && ra.data.equals(rb.data);
  }
  console.log(ok ? 'IGUAL ' : 'DIFERE', n);
  if (!ok) difs++;
}
console.log(difs ? `${difs} diferença(s)` : 'TUDO IGUAL');
process.exit(difs ? 1 : 0);
```

- [ ] **Step 3: Conferir que o comparador acusa diferença (o teste do teste)**

```bash
node scripts/_cenario/_comparar.mjs "$TEMP/aw-g/menu-antes-k1" "$TEMP/aw-g/menu-antes-k4"
```
Expected: `DIFERE` em todos os PNGs e no `dados.json`, exit 1.

- [ ] **Step 4: Criar `scripts/_cenario/luzes.mjs` com o código MOVIDO, sem mudança de lógica**

```js
// The lights of a painted scene — the menu rules (BLOCO E, 19/10), moved here unchanged from scripts/_menu/_camadas.mjs
// so the F1 horizon (BLOCO G) uses the very same ones. `cidade` is the FRONT layer at density K (RGBA; alpha 255 =
// opaque painting, anything else is the sky window and is skipped). Boxes come out in game px (÷K).
export const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

/** 1 = warm window light, 2 = red beacon. */
export function detectarLuzes(cidade, W, H, K) {
  const tipo = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    // A beacon is PURE red (19/10: the old test, g < 0.5 r, also took saturated orange facades — big groups that then
    // blinked as dark squares over the city).
    if (r >= 130 && g < r * 0.36 && b < r * 0.4) tipo[y * W + x] = 2;
    else if (r >= 105 && r > b + 45 && r > g * 1.12) tipo[y * W + x] = 1;
  }
  // The white-hot core of a lamp misses the warm test (its blue is high too): a warm-white pixel next to a light is one.
  for (let pass = 0; pass < 2; pass++) for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const s = y * W + x, i = s * 4;
    if (tipo[s] || cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    if (lum(r, g, b) < 150 || r < b) continue;
    const t = tipo[s - 1] || tipo[s + 1] || tipo[s - W] || tipo[s + W];
    if (t) tipo[s] = t;
  }
  // A beacon stands alone against the dark: a red point SURROUNDED by amber (g ≥ 0.42 r, a quarter of the K box) is a
  // red-tinted bit of a lit window or door, and it goes with that light (19/10, he).
  const vermelhos = [];
  const ambar = (q) => tipo[q] === 1 && cidade[q * 4 + 1] >= 0.42 * cidade[q * 4];
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) vermelhos.push(s);
  for (const s of vermelhos) {
    const x = s % W, y = (s / W) | 0;
    let n = 0, total = 0;
    for (let dy = -K; dy <= K; dy++) for (let dx = -K; dx <= K; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      total++;
      if (ambar(ny * W + nx)) n++;
    }
    if (n >= total / 4) tipo[s] = 1;
  }
  // Red dots INSIDE a lit area (the ring 2K–3K px has > 5.5% warm-lit pixels; real beacons ≤ 4%) are fixed lights.
  for (const s of vermelhos) {
    if (tipo[s] !== 2) continue;
    const x = s % W, y = (s / W) | 0;
    let aceso = 0, total = 0;
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = (ny * W + nx) * 4;
      if (cidade[j + 3] < 255) continue;
      total++;
      if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
    }
    if (total && aceso / total > 0.055) tipo[s] = 0;
  }
  // A tower's other lights: a red-orange point on the same tower as a beacon (≤ 3 px across, ≤ 14 px up or down, game
  // px), dark around it and not a lamp of a lit ROW (a deck), blinks with it (19/10, he).
  const farolPx = [];
  for (let s = 0; s < W * H; s++) if (tipo[s] === 2) farolPx.push([s % W, (s / W) | 0]);
  const escuroEmVolta = (x, y) => {
    let aceso = 0, total = 0;
    for (let dy = -3 * K; dy <= 3 * K; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 2 * K) continue;
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
      const j = (ny * W + nx) * 4;
      if (cidade[j + 3] < 255) continue;
      total++;
      if (lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 55 && cidade[j] > cidade[j + 2] + 20) aceso++;
    }
    return total > 0 && aceso / total <= 0.055;
  };
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x, i = s * 4;
    if (tipo[s] === 2 || cidade[i + 3] < 255) continue;
    const r = cidade[i], g = cidade[i + 1], b = cidade[i + 2];
    if (!(r >= 120 && g < 0.5 * r && b < 0.45 * r)) continue;
    if (!farolPx.some(([fx, fy]) => Math.abs(fx - x) <= 3 * K && Math.abs(fy - y) <= 14 * K)) continue;
    const acesoEm = (xx) => {
      if (xx < 0 || xx >= W) return false;
      const j = (y * W + xx) * 4;
      return lum(cidade[j], cidade[j + 1], cidade[j + 2]) > 45 && cidade[j] > cidade[j + 2] + 15;
    };
    if ([2 * K, 3 * K].some((d) => acesoEm(x - d) || acesoEm(x + d))) continue;
    if (escuroEmVolta(x, y)) tipo[s] = 2;
  }
  return tipo;
}

/** 1 = a light pixel; 2 = its warm fringe (F = K px) or a beacon's RED halo (3K px). */
export function marcarMuda(cidade, W, H, K, tipo) {
  const F = K;
  const quenteP = (i) => cidade[i] > cidade[i + 2] + 8;
  const muda = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) if (tipo[s]) muda[s] = 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x;
    if (muda[s] || cidade[s * 4 + 3] < 255 || !quenteP(s * 4)) continue;
    let viz = false;
    for (let dy = -F; dy <= F && !viz; dy++) for (let dx = -F; dx <= F; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx]) { viz = true; break; }
    }
    if (viz) muda[s] = 2;
  }
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const s = y * W + x, i = s * 4;
    if (muda[s] || cidade[i + 3] < 255 || !(cidade[i] > cidade[i + 1] * 1.5 && cidade[i] > cidade[i + 2] * 1.3)) continue;
    let viz = false;
    for (let dy = -3 * K; dy <= 3 * K && !viz; dy++) for (let dx = -3 * K; dx <= 3 * K; dx++) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < W && ny < H && tipo[ny * W + nx] === 2) { viz = true; break; }
    }
    if (viz) muda[s] = 2;
  }
  return muda;
}

/**
 * The light LIFTED out of the painting: the changed pixels are filled from their unchanged surroundings by diffusion
 * (each one the mean of its neighbours, swept until it settles). Transparent everywhere else.
 */
export function apagarPorDifusao(cidade, W, H, muda) {
  const apagadas = Buffer.alloc(W * H * 4);
  const alvo = [];
  for (let s = 0; s < W * H; s++) if (muda[s] && cidade[s * 4 + 3] === 255) alvo.push(s);
  const val = new Float32Array(W * H * 3);
  for (let s = 0; s < W * H; s++) for (let c = 0; c < 3; c++) val[s * 3 + c] = cidade[s * 4 + c];
  const vale = (q) => cidade[q * 4 + 3] === 255;
  for (const s of alvo) for (let c = 0; c < 3; c++) val[s * 3 + c] = 0;
  for (let volta = 0; volta < 160; volta++) {
    const ida = volta % 2 === 0;
    for (let n = 0; n < alvo.length; n++) {
      const s = alvo[ida ? n : alvo.length - 1 - n], x = s % W, y = (s / W) | 0;
      let r = 0, g = 0, b = 0, peso = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (!vale(q)) continue;
        const p = muda[q] ? 0.5 : 1;
        r += val[q * 3] * p; g += val[q * 3 + 1] * p; b += val[q * 3 + 2] * p; peso += p;
      }
      if (peso) { val[s * 3] = r / peso; val[s * 3 + 1] = g / peso; val[s * 3 + 2] = b / peso; }
    }
  }
  for (const s of alvo) {
    const i = s * 4;
    [apagadas[i], apagadas[i + 1], apagadas[i + 2], apagadas[i + 3]] = [val[s * 3], val[s * 3 + 1], val[s * 3 + 2], 255].map(Math.round);
  }
  return apagadas;
}

/** 8-connected clusters of the same type, boxes and area in GAME px (÷K). */
export function gruposDeLuz(tipo, W, H, K) {
  const grupos = [];
  const visto = new Uint8Array(W * H);
  for (let s = 0; s < W * H; s++) {
    if (!tipo[s] || visto[s]) continue;
    const t = tipo[s], fila = [s];
    visto[s] = 1;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0;
    while (fila.length) {
      const c = fila.pop(); n++;
      const cx = c % W, cy = (c / W) | 0;
      x0 = Math.min(x0, cx); y0 = Math.min(y0, cy); x1 = Math.max(x1, cx); y1 = Math.max(y1, cy);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const q = ny * W + nx;
        if (tipo[q] === t && !visto[q]) { visto[q] = 1; fila.push(q); }
      }
    }
    grupos.push({ tipo: t === 2 ? 'farol' : 'janela', x: x0 / K, y: y0 / K, w: (x1 - x0 + 1) / K, h: (y1 - y0 + 1) / K, n: n / (K * K) });
  }
  return grupos;
}
```

- [ ] **Step 5: Ligar o `_camadas.mjs` do menu ao módulo**

Em `scripts/_menu/_camadas.mjs`:
1. Logo abaixo de `import sharp from 'sharp';` (linha 10), acrescentar:
```js
import { lum, detectarLuzes, marcarMuda, apagarPorDifusao, gruposDeLuz } from '../_cenario/luzes.mjs';
```
2. Apagar a linha 26 (`const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;`).
3. Apagar o bloco inteiro de `// ─── 3. The lights: warm windows and red beacons, and the "off" layer ───…` (linha 171) até a última linha antes de `// ─── 4. The waterfall loop ───…` (linha 349), e no lugar escrever:
```js
// ─── 3. The lights: warm windows and red beacons, and the "off" layer (rules in scripts/_cenario/luzes.mjs) ──────
const tipo = detectarLuzes(cidade, W, H, K);
const muda = marcarMuda(cidade, W, H, K, tipo);
const apagadas = apagarPorDifusao(cidade, W, H, muda);
const grupos = gruposDeLuz(tipo, W, H, K);
```

- [ ] **Step 6: A regressão — assar de novo e comparar com a linha de base**

```bash
node scripts/_menu/_camadas.mjs "$TEMP/aw-g/menu-depois-k1" 1
node scripts/_menu/_camadas.mjs "$TEMP/aw-g/menu-depois-k4" 4
node scripts/_cenario/_comparar.mjs "$TEMP/aw-g/menu-antes-k1" "$TEMP/aw-g/menu-depois-k1"
node scripts/_cenario/_comparar.mjs "$TEMP/aw-g/menu-antes-k4" "$TEMP/aw-g/menu-depois-k4"
```
Expected: `TUDO IGUAL` nas duas, exit 0. Se algo DIFERE, o movimento mudou lógica — refazer o Step 4 contra o original (`git diff scripts/_menu/_camadas.mjs`), nunca aceitar diferença.

- [ ] **Step 7: Checkpoint** — sem commit (ele pede). Anotar "Task 1 ✓ (regressão do menu: TUDO IGUAL k1 e k4)".

---

### Task 2: Os números e o relógio da F1 (TDD)

**Files:**
- Create: `src/f1/numerosF1.ts`
- Create: `src/f1/ritmosF1.ts`
- Test: `scripts/test-f1-ritmos.mjs`

**Interfaces:**
- Produces:
  - `PINTURA = { largura: 429, altura: 216, derivaMax: 45, derivaSeg: 110 }`
  - `PROF = { pintura: -94.6, apagadas: -94.59, agua: -94.58 }`
  - `CACHOEIRA_F1 = { fps: 10 }`
  - `BRUMA_F1: ReadonlyArray<{ y, h, pico, fator, depth }>`
  - `CORDILHEIRA = { longe: { chave: 'f1Cordilheira', fator: 0.35, baseY: 2, depth: -88 }, perto: { chave: 'f1CordilheiraPerto', fator: 0.6, baseY: 4, depth: -86 } }`
  - `COR = { nevoa: number, aresta: number, chaoFrente: number }` (hex)
  - `derivaPintura(t: number): number` — inteiro em [0, 45].

- [ ] **Step 1: Escrever o teste que falha**

`scripts/test-f1-ritmos.mjs`:
```js
// O RELÓGIO DO CENÁRIO DA F1 (spec 2026-10-20-f1-cenario-design.md §4). Uso, da raiz: node scripts/test-f1-ritmos.mjs
import { PINTURA, CORDILHEIRA, BRUMA_F1, PROF } from '../src/f1/numerosF1.ts';
import { derivaPintura } from '../src/f1/ritmosF1.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

// ── A PINTURA ──
conferir(PINTURA.largura === 429 && PINTURA.altura === 216, 'a pintura inteira: 1768×890 reduzida à altura 216 dá 429×216', PINTURA);
conferir(PINTURA.largura - 384 === PINTURA.derivaMax, 'a deriva é a SOBRA da pintura (429 − 384 = 45)', PINTURA.derivaMax);
conferir(PROF.pintura > -95.5, 'o horizonte fica NA FRENTE da pintura do zero-G (−95,5), que só aparece quando ele se apaga', PROF);

// ── A DERIVA ──
conferir(derivaPintura(0) === 0, 'parada no começo da fase', derivaPintura(0));
conferir(derivaPintura(-3) === 0, 'nunca anda para trás do começo', derivaPintura(-3));
conferir(derivaPintura(PINTURA.derivaSeg) === 45, 'chega a 45 px em 110 s', derivaPintura(PINTURA.derivaSeg));
conferir(derivaPintura(400) === 45, 'e para (a luta do chefão pode durar o quanto for)', derivaPintura(400));
let monotona = true, inteira = true, anterior = -1;
for (let t = 0; t <= 130; t += 0.25) {
  const d = derivaPintura(t);
  if (d < anterior) monotona = false;
  if (!Number.isInteger(d)) inteira = false;
  anterior = d;
}
conferir(monotona, 'só anda para a frente', null);
conferir(inteira, 'sempre em pixel inteiro (a grade da pintura casa com a da tela)', null);

// ── AS CAMADAS ──
conferir(CORDILHEIRA.longe.fator < CORDILHEIRA.perto.fator, 'a cordilheira de trás anda mais devagar', CORDILHEIRA);
conferir(CORDILHEIRA.longe.depth < CORDILHEIRA.perto.depth, 'e fica atrás da da frente', CORDILHEIRA);
conferir(BRUMA_F1.every((b) => b.pico <= 0.25), 'a bruma é leve (nunca tapa o jogo)', BRUMA_F1);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-f1-ritmos.mjs`
Expected: erro de módulo não encontrado (`src/f1/numerosF1.ts`).

- [ ] **Step 3: Escrever `src/f1/numerosF1.ts`**

```ts
/**
 * OS NÚMEROS DO CENÁRIO DA F1 (spec `2026-10-20-f1-cenario-design.md` §4): a pintura dele em camadas, a deriva, a
 * cordilheira tirada da pintura, a bruma e o chão. Tudo em PIXELS DE JOGO. Módulo puro: os testes o leem no Node.
 */

/**
 * A PINTURA INTEIRA (`assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png`, 1768×890) reduzida à altura da tela.
 * A regra é dele (20/10): *"todos os fundos das fases são no tamanho original da pintura, exatamente para dar o aspecto
 * de grandeza e profundidade"* — nunca recorte ampliado. A sobra de 45 px vira a deriva da fase inteira.
 */
export const PINTURA = { largura: 429, altura: 216, derivaMax: 45, derivaSeg: 110 } as const;

/** O horizonte fica NA FRENTE da pintura do zero-G (−95,5, opaca), que só aparece quando a saída o apaga. */
export const PROF = { pintura: -94.6, apagadas: -94.59, agua: -94.58 } as const;

/** A cachoeira da pintura (a caixa e os quadros vêm do `dados.json`). */
export const CACHOEIRA_F1 = { fps: 10 } as const;

/**
 * A BRUMA ENTRE OS PLANOS: a textura `fogBand` das fases, na cor da névoa da pintura, separando a pintura da cordilheira
 * de trás e as duas cordilheiras. Leve: ela é volume, não véu.
 */
export const BRUMA_F1 = [
  { y: 92, h: 96, pico: 0.2, fator: 0.2, depth: -91 },
  { y: 124, h: 92, pico: 0.16, fator: 0.45, depth: -87 },
] as const;

/**
 * A CORDILHEIRA: duas faixas da MESMA arte (`_cordilheira-f1.mjs`: as massas da frente da pintura), a de trás menor e
 * mais enevoada. Base enterrada abaixo da linha do solo (a lição do deslize de 30/08). Escala 1: as alturas são assadas.
 */
export const CORDILHEIRA = {
  longe: { chave: 'f1Cordilheira', fator: 0.35, baseY: 2, depth: -88 },
  perto: { chave: 'f1CordilheiraPerto', fator: 0.6, baseY: 4, depth: -86 },
} as const;

/** As cores tiradas da pintura (`_cor-nevoa-f1.mjs`, `_chao-f1.mjs`). */
export const COR = {
  /** A névoa da pintura: a bruma e a névoa rasteira. */
  nevoa: 0x2d3846,
  /** A aresta de luz do chão: a rocha com neve da pintura. */
  aresta: 0x8a909c,
  /** O tint da faixa de solo da frente (um tom abaixo do chão: o solo mais perto, em sombra). */
  chaoFrente: 0xa8acb6,
} as const;
```

- [ ] **Step 4: Escrever `src/f1/ritmosF1.ts`**

```ts
import { PINTURA } from './numerosF1.ts';

/**
 * O TEMPO DO CENÁRIO DA F1, em funções puras do relógio da fase `t` (s): o mesmo instante dá sempre o mesmo quadro —
 * para filmar, sondar e testar no Node. Quem entra direto no chefão (o treino) cai no estado certo de graça.
 */

/** A deriva da pintura (px, INTEIRO) em `t`: 45 px em 110 s, depois parada. Inteiro: a grade da pintura casa com a da tela. */
export function derivaPintura(t: number): number {
  const u = Math.min(1, Math.max(0, t / PINTURA.derivaSeg));
  return Math.round(u * PINTURA.derivaMax);
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node scripts/test-f1-ritmos.mjs`
Expected: todas as linhas `OK`, `TUDO OK`, exit 0.

- [ ] **Step 6: Typecheck**

Run: `npm run typecheck`
Expected: sem erros (os imports com `.ts` seguem o `src/menu/ritmos.ts`, que já faz isso).

- [ ] **Step 7: Checkpoint** — sem commit.

---

### Task 3: O horizonte assado (a pintura, as luzes apagadas, a cachoeira) e a auditoria

**Files:**
- Create: `scripts/_g/_camadas-f1.mjs`
- Create: `scripts/_g/_auditar-luzes-f1.mjs`
- Output: `public/sprites/f1/pintura.png`, `apagadas.png`, `cachoeira.png`, `dados.json`; folha `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/luzes.png` e `apagada-inteira.png`

**Interfaces:**
- Consumes: `lum`, `detectarLuzes`, `marcarMuda`, `apagarPorDifusao`, `gruposDeLuz` (Task 1).
- Produces: `dados.json` = `{ k: 1, w: 429, h: 216, agua: { x, y, w, h, quadros, fw, fh }, grupos: [{ tipo, x, y, w, h, n }] }` (px de jogo) — lido pelo `src/f1/horizonte.ts` (Task 6).

- [ ] **Step 1: Escrever `scripts/_g/_camadas-f1.mjs`**

```js
// BLOCO G · the F1 horizon, cut from HIS painting (`assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png`,
// 1768×890): the WHOLE painting reduced to the screen height (429×216 — his rule, 20/10: never a crop or a zoom), the
// "off" state of its lights, and the waterfall loop.
//   node scripts/_g/_camadas-f1.mjs [outDir=public/sprites/f1]
// At 1× the lights are single amber pixels and the spire beacons blend into the amber, so they are DETECTED at 4×
// (1716×864, where a beacon is still pure red) with the menu rules, and ERASED at 1×: every 1× pixel that holds a 4×
// light (or its fringe) and is warm is refilled by diffusion from its neighbours.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { lum, detectarLuzes, marcarMuda, apagarPorDifusao, gruposDeLuz } from '../_cenario/luzes.mjs';

const [OUT = 'public/sprites/f1'] = process.argv.slice(2);
const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
const W = 429, H = 216, K = 4;
// The waterfall right of the citadel (game px, measured on the 1× reduction: the warm-lit water at x 313–318, y 103–111).
const AGUA = { x: 311, y: 101, w: 9, h: 12 };
const QUADROS_AGUA = 8;
fs.mkdirSync(OUT, { recursive: true });

const reduzir = (w, h) => sharp(ORIG).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
const p1 = await reduzir(W, H); // the painting, ONE pass from the original
const p4 = await reduzir(W * K, H * K); // the detection copy

// ─── 1. Detect at 4× (the waterfall is warm-lit water, not a window: its box is left out) ──────────────────────
const tipo4 = detectarLuzes(p4, W * K, H * K, K);
for (let y = AGUA.y * K; y < (AGUA.y + AGUA.h) * K; y++) for (let x = AGUA.x * K; x < (AGUA.x + AGUA.w) * K; x++) tipo4[y * W * K + x] = 0;
const muda4 = marcarMuda(p4, W * K, H * K, K, tipo4);
const grupos = gruposDeLuz(tipo4, W * K, H * K, K);

// ─── 2. Erase at 1× ────────────────────────────────────────────────────────────────────────────────────────────
const muda1 = new Uint8Array(W * H);
for (let y = 0; y < H * K; y++) for (let x = 0; x < W * K; x++) {
  const m = muda4[y * W * K + x];
  if (!m) continue;
  const s = ((y / K) | 0) * W + ((x / K) | 0);
  muda1[s] = muda1[s] === 1 ? 1 : m; // a light pixel wins over a fringe pixel
}
// A neutral 1× pixel keeps its value: only warm ones carry the light.
for (let s = 0; s < W * H; s++) if (muda1[s] && !(p1[s * 4] > p1[s * 4 + 2] + 8)) muda1[s] = 0;
const apagadas = apagarPorDifusao(p1, W, H, muda1);

// ─── 3. The waterfall loop (the menu recipe at 1×: stripes falling 1 px per frame, a seamless 8-frame loop) ─────
let semente = 7;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const listras = [];
for (let x = 0; x < AGUA.w; x++) {
  const col = Array.from({ length: QUADROS_AGUA }, () => rnd());
  listras.push(col.map((_, y) => (col[y] + col[(y + 1) % QUADROS_AGUA] + col[(y + QUADROS_AGUA - 1) % QUADROS_AGUA]) / 3));
}
const aguaFolha = Buffer.alloc(AGUA.w * QUADROS_AGUA * AGUA.h * 4);
let pixelsAgua = 0;
for (let f = 0; f < QUADROS_AGUA; f++) for (let y = 0; y < AGUA.h; y++) for (let x = 0; x < AGUA.w; x++) {
  const i = ((AGUA.y + y) * W + (AGUA.x + x)) * 4;
  const r = p1[i], g = p1[i + 1], b = p1[i + 2];
  if (lum(r, g, b) < 90) continue; // only the water itself
  if (f === 0) pixelsAgua++;
  const v = listras[x][((y - f) % QUADROS_AGUA + QUADROS_AGUA) % QUADROS_AGUA];
  const m = 0.72 + 0.62 * v;
  const o = (y * AGUA.w * QUADROS_AGUA + f * AGUA.w + x) * 4;
  aguaFolha[o] = Math.min(255, Math.round(r * m));
  aguaFolha[o + 1] = Math.min(255, Math.round(g * m));
  aguaFolha[o + 2] = Math.min(255, Math.round(b * m));
  aguaFolha[o + 3] = 255;
}

// ─── 4. Write ──────────────────────────────────────────────────────────────────────────────────────────────────
const png = (buf, w, h, f) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toFile(path.join(OUT, f));
await png(p1, W, H, 'pintura.png');
await png(apagadas, W, H, 'apagadas.png');
await png(aguaFolha, AGUA.w * QUADROS_AGUA, AGUA.h, 'cachoeira.png');
fs.writeFileSync(path.join(OUT, 'dados.json'), JSON.stringify({
  k: 1, w: W, h: H,
  agua: { ...AGUA, quadros: QUADROS_AGUA, fw: AGUA.w, fh: AGUA.h },
  grupos,
}, null, 1));
const nMuda = muda1.reduce((a, v) => a + (v ? 1 : 0), 0);
console.log(OUT, `${W}x${H}`, 'grupos', grupos.length, 'janelas', grupos.filter((g) => g.tipo === 'janela').length,
  'faróis', grupos.filter((g) => g.tipo === 'farol').length, 'pixels apagados', nMuda, 'água', pixelsAgua);
```

- [ ] **Step 2: Assar**

Run: `node scripts/_g/_camadas-f1.mjs`
Expected: `public/sprites/f1 429x216 grupos G janelas J faróis F pixels apagados P água A`, com **F ≥ 4** (as pontas das torres da cidadela e do posto da esquerda), **J ≥ 30**, **A ≥ 10**. Se F < 4: abrir `$TEMP` com o recorte 4× das torres (Step 4) e conferir o vermelho das pontas antes de mexer em qualquer limiar; um limiar novo vai num parâmetro do `_camadas-f1.mjs`, nunca no `luzes.mjs` (o menu depende dele).

- [ ] **Step 3: Escrever `scripts/_g/_auditar-luzes-f1.mjs`**

```js
// BLOCO G · every light of the F1 horizon, lit vs off EXACTLY as the rig crops it (the box + the margin of
// `src/f1/horizonte.ts`), ×8 — beacons first, then up to 48 windows. Also the whole painting with every light off.
//   node scripts/_g/_auditar-luzes-f1.mjs [layersDir=public/sprites/f1] [outDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [S = 'public/sprites/f1', OUT = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1'] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const D = JSON.parse(fs.readFileSync(path.join(S, 'dados.json'), 'utf8'));
const pintura = path.join(S, 'pintura.png');
const apagadas = path.join(S, 'apagadas.png');
const M = 6, L = 2 * M + 1, Z = 8;

// The painting with only this box of the off layer laid over it.
async function comCaixa(bx, by, bw, bh) {
  const pedaco = await sharp(apagadas).extract({ left: bx, top: by, width: bw, height: bh }).png().toBuffer();
  return sharp(pintura).composite([{ input: pedaco, left: bx, top: by }]).png().toBuffer();
}
const lista = [
  ...D.grupos.filter((g) => g.tipo === 'farol').map((g) => [g, 3]),
  ...D.grupos.filter((g) => g.tipo === 'janela').slice(0, 48).map((g) => [g, 1]),
];
const tiles = [];
for (const [g, margem] of lista) {
  const bx = Math.max(0, Math.floor(g.x - margem)), by = Math.max(0, Math.floor(g.y - margem));
  const bw = Math.min(D.w - bx, Math.ceil(g.w + 2 * margem)), bh = Math.min(D.h - by, Math.ceil(g.h + 2 * margem));
  const cx = Math.round(g.x + g.w / 2), cy = Math.round(g.y + g.h / 2);
  const left = Math.min(Math.max(0, cx - M), D.w - L), top = Math.min(Math.max(0, cy - M), D.h - L);
  const off = await comCaixa(bx, by, bw, bh);
  for (const src of [pintura, off]) {
    const t = await sharp(src).extract({ left, top, width: L, height: L }).png().toBuffer();
    tiles.push(await sharp(t).resize(L * Z, L * Z, { kernel: 'nearest' }).png().toBuffer());
  }
}
const T = L * Z, COL = 8;
const linhas = Math.max(1, Math.ceil(tiles.length / COL));
await sharp({ create: { width: COL * (T + 6), height: linhas * (T + 6), channels: 4, background: '#401010' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % COL) * (T + 6) + (i % 2 ? 0 : 6), top: Math.floor(i / COL) * (T + 6) })))
  .png().toFile(path.join(OUT, 'luzes.png'));
// The colony with EVERY light off (the end state of round 2), ×3.
const todas = await sharp(pintura).composite([{ input: apagadas }]).png().toBuffer();
await sharp(todas).resize(D.w * 3, D.h * 3, { kernel: 'nearest' }).toFile(path.join(OUT, 'apagada-inteira.png'));
await sharp(pintura).resize(D.w * 3, D.h * 3, { kernel: 'nearest' }).toFile(path.join(OUT, 'acesa-inteira.png'));
console.log('faróis', D.grupos.filter((g) => g.tipo === 'farol').length, 'janelas na folha', Math.min(48, D.grupos.filter((g) => g.tipo === 'janela').length), 'tiles', tiles.length);
```

- [ ] **Step 4: Auditar e CONFERIR AMPLIADO (regra dele: abrir antes de mostrar)**

Run: `node scripts/_g/_auditar-luzes-f1.mjs`
Abrir `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/luzes.png` e `apagada-inteira.png` com o Read.
Aceite (cada par aceso | apagado):
- nenhum apagado deixa BURACO mais escuro que a parede em volta, nem franja âmbar em volta do buraco;
- os faróis são as pontas das torres (não janelas de fachada);
- a `apagada-inteira` lê como "a colônia morta" sem manchas cinza.
Se falhar: o defeito e a correção vão num parâmetro do `_camadas-f1.mjs` (ex.: o teste "quente" do Step 2 do script), assar e auditar de novo.

- [ ] **Step 5: Checkpoint** — sem commit.

---

### Task 4: A cordilheira tirada da pintura

**Files:**
- Create: `scripts/_g/_cordilheira-f1.mjs`
- Output: `public/sprites/f1-cordilheira.png`, `f1-cordilheira-2.png`, `f1-cordilheira-3.png`, `f1-cordilheira-perto.png`, `f1-cordilheira-perto-2.png`, `f1-cordilheira-perto-3.png`; folha `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/cordilheira.png`

**Interfaces:**
- Consumes: `lum` (Task 1).
- Produces: as chaves de textura `f1Cordilheira`, `f1Cordilheira2`, `f1Cordilheira3`, `f1CordilheiraPerto`, `f1CordilheiraPerto2`, `f1CordilheiraPerto3` (registradas na Task 6), base de cada PNG = a linha de baixo (a peça cresce do chão).

- [ ] **Step 1: Escrever `scripts/_g/_cordilheira-f1.mjs`**

```js
// BLOCO G · the F1 mountain bands, cut from the NEAR mountains of HIS painting (spec §4, layer 4). Each piece is a dark
// mass against the lighter fog: its alpha comes from darkness, the snow inside it is kept (holes filled), and only what
// touches the bottom of the box stays. Reduced ONCE from the original to each band height; the alpha is dithered (no
// partial alpha in pixel art). The far band is the SAME pieces smaller and hazier (the "back layer shrinks" rule).
//   node scripts/_g/_cordilheira-f1.mjs [outDir=public/sprites] [sheetDir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const [OUT = 'public/sprites', FOLHA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1'] = process.argv.slice(2);
const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
// The pieces, in ORIGINAL pixels: a box around each near mass, its bottom on the bottom of the painting.
const PECAS = [
  { nome: 'esquerda', x: 0, y: 380, w: 560, h: 510 },
  { nome: 'direita', x: 1420, y: 460, w: 348, h: 430 },
  { nome: 'centro', x: 560, y: 640, w: 520, h: 250 },
];
// Darkness → alpha: rock darker than ROCHA is solid, fog lighter than NEVOA is gone, a ramp between.
const ROCHA = 24, NEVOA = 36;
// The bands: the height of the TALLEST piece (game px; the others keep their size relative to it) and the haze.
const BANDAS = [
  { arquivo: 'f1-cordilheira-perto', altura: 80, nevoa: 0 },
  { arquivo: 'f1-cordilheira', altura: 52, nevoa: 0.22 },
];
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const suave = (a, b, x) => { const u = Math.min(1, Math.max(0, (x - a) / (b - a))); return u * u * (3 - 2 * u); };
fs.mkdirSync(FOLHA, { recursive: true });

const orig = await sharp(ORIG).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const OW = orig.info.width, OH = orig.info.height, px = orig.data;

// The fog colour: the mean of the fog-lit pixels (lum NEVOA..70) in the lower half of the painting.
const nev = [0, 0, 0];
let nn = 0;
for (let y = OH >> 1; y < OH; y++) for (let x = 0; x < OW; x++) {
  const i = (y * OW + x) * 4, l = lum(px[i], px[i + 1], px[i + 2]);
  if (l >= NEVOA && l <= 70) { nev[0] += px[i]; nev[1] += px[i + 1]; nev[2] += px[i + 2]; nn++; }
}
const corNevoa = nev.map((v) => v / nn);

function recortar(p) {
  const { w, h } = p;
  const rgba = Buffer.alloc(w * h * 4);
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = ((p.y + y) * OW + (p.x + x)) * 4, s = y * w + x;
    for (let c = 0; c < 4; c++) rgba[s * 4 + c] = px[i + c];
    a[s] = 1 - suave(ROCHA, NEVOA, lum(px[i], px[i + 1], px[i + 2]));
  }
  // Background = flood from the top row and the two sides through NON-solid pixels (the fog between the peaks).
  const solido = (s) => a[s] > 0.5;
  const fundo = new Uint8Array(w * h);
  const fila = [];
  const semear = (x, y) => { const s = y * w + x; if (!solido(s) && !fundo[s]) { fundo[s] = 1; fila.push(s); } };
  for (let x = 0; x < w; x++) semear(x, 0);
  for (let y = 0; y < h; y++) { semear(0, y); semear(w - 1, y); }
  while (fila.length) {
    const s = fila.pop(), x = s % w, y = (s / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) semear(nx, ny);
    }
  }
  // Rock = not background (the snow and small fog holes inside the mass are kept). Only the part touching the bottom.
  const rocha = new Uint8Array(w * h);
  for (let x = 0; x < w; x++) { const s = (h - 1) * w + x; if (!fundo[s]) { rocha[s] = 1; fila.push(s); } }
  while (fila.length) {
    const s = fila.pop(), x = s % w, y = (s / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (!fundo[q] && !rocha[q]) { rocha[q] = 1; fila.push(q); }
    }
  }
  // Alpha: solid inside; on the silhouette edge (rock touching background) the soft darkness ramp.
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const s = y * w + x;
    if (!rocha[s]) { rgba[s * 4 + 3] = 0; continue; }
    const borda = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < w && ny < h && fundo[ny * w + nx];
    });
    rgba[s * 4 + 3] = Math.round((borda ? a[s] : 1) * 255);
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return { rgba, w, h, caixa: { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 } };
}

const recortes = PECAS.map((p) => ({ p, ...recortar(p) }));
const maisAlto = Math.max(...recortes.map((r) => r.caixa.height));
const folha = [];
for (const b of BANDAS) {
  for (let n = 0; n < recortes.length; n++) {
    const r = recortes[n];
    const esc = b.altura / maisAlto;
    const ow = Math.max(1, Math.round(r.caixa.width * esc)), oh = Math.max(1, Math.round(r.caixa.height * esc));
    const out = await sharp(r.rgba, { raw: { width: r.w, height: r.h, channels: 4 } })
      .extract(r.caixa).resize(ow, oh, { kernel: 'lanczos3' }).raw().toBuffer();
    for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
      const i = (y * ow + x) * 4;
      const al = out[i + 3] / 255;
      out[i + 3] = al > 0.86 ? 255 : al > BAYER4[(y % 4) * 4 + (x % 4)] ? 255 : 0;
      // The bottom row is buried under the ground anyway: solid, so the base never shows a dithered seam.
      if (y === oh - 1 && al > 0.2) out[i + 3] = 255;
      for (let c = 0; c < 3; c++) out[i + c] = Math.round(out[i + c] * (1 - b.nevoa) + corNevoa[c] * b.nevoa);
    }
    const nome = `${b.arquivo}${n === 0 ? '' : `-${n + 1}`}.png`;
    await sharp(out, { raw: { width: ow, height: oh, channels: 4 } }).png().toFile(path.join(OUT, nome));
    folha.push({ nome, buf: await sharp(out, { raw: { width: ow, height: oh, channels: 4 } }).png().toBuffer(), ow, oh });
    console.log(nome, `${ow}x${oh}`, r.p.nome);
  }
}
// The sheet: every piece ×4 on the fog colour, bases aligned.
const Z = 4, PAD = 8;
const larg = folha.reduce((a, f) => a + f.ow * Z + PAD, PAD), alt = Math.max(...folha.map((f) => f.oh)) * Z + 2 * PAD;
let x = PAD;
const camadas = [];
for (const f of folha) {
  camadas.push({ input: await sharp(f.buf).resize(f.ow * Z, f.oh * Z, { kernel: 'nearest' }).png().toBuffer(), left: x, top: alt - PAD - f.oh * Z });
  x += f.ow * Z + PAD;
}
const bg = corNevoa.map((v) => Math.round(v));
await sharp({ create: { width: larg, height: alt, channels: 4, background: { r: bg[0], g: bg[1], b: bg[2], alpha: 1 } } })
  .composite(camadas).png().toFile(path.join(FOLHA, 'cordilheira.png'));
console.log('névoa', bg.join(','), 'folha', path.join(FOLHA, 'cordilheira.png'));
```

- [ ] **Step 2: Assar**

Run: `node scripts/_g/_cordilheira-f1.mjs`
Expected: seis linhas `f1-cordilheira-perto.png 80xN …` (a mais alta tem 80 de altura na faixa da frente e 52 na de trás), e a linha da névoa.

- [ ] **Step 3: CONFERIR AMPLIADO**

Abrir `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/cordilheira.png` com o Read. Aceite:
- cada peça é UMA massa de rocha com a silhueta de cima limpa (sem bolha de névoa grudada, sem buraco aberto no meio);
- a neve continua dentro da rocha;
- a base é reta e cheia (ela fica enterrada);
- a de trás lê mais enevoada que a da frente.
Se uma peça falhar: ajustar a CAIXA dela em `PECAS` (subir/baixar `y`, estreitar `w`) ou `ROCHA`/`NEVOA`, assar e conferir de novo. Uma peça que não fecha depois de 3 tentativas sai da lista (duas peças bastam; anotar).

- [ ] **Step 4: Checkpoint** — sem commit.

---

### Task 5: O chão na paleta da pintura e a cor da névoa

**Files:**
- Create: `scripts/_g/_chao-f1.mjs`
- Create: `scripts/_g/_cor-nevoa-f1.mjs`
- Modify: `public/sprites/ground-tile.png` (o antigo vai para `assets/raw/ground-tile-original.png`)
- Modify: `src/f1/numerosF1.ts` (`COR`)
- Modify: `src/systems/atmosfera/perfis.ts:252` (`faseF1`)

**Interfaces:**
- Consumes: `lum` (Task 1); `public/sprites/f1/pintura.png` (Task 3).
- Produces: `COR.nevoa`, `COR.aresta` com os valores medidos.

- [ ] **Step 1: Escrever `scripts/_g/_chao-f1.mjs`**

```js
// BLOCO G · the F1 ground tile recoloured into HIS painting's near rock (spec §4, layer 5): the old cracked-rock tile
// keeps its drawing (and its mirrored seam), and each pixel takes the colour the painting's rock has at the same
// luminance PERCENTILE (histogram matching). The old tile is kept once as assets/raw/ground-tile-original.png.
// Prints the edge-light colour (the snow-lit rock) for COR.aresta.
//   node scripts/_g/_chao-f1.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const ORIG = 'assets/raw/Cidadela Gótica entre Montanhas Nebulosas.png';
const TILE = 'public/sprites/ground-tile.png';
const ANTIGO = 'assets/raw/ground-tile-original.png';
// Inside the near-left mass of the painting (rock and snow, no fog): ORIGINAL pixels.
const ROCHA = { left: 40, top: 640, width: 400, height: 240 };

if (!fs.existsSync(ANTIGO)) fs.copyFileSync(TILE, ANTIGO);
const r = await sharp(ORIG).extract(ROCHA).ensureAlpha().raw().toBuffer();
const cores = [];
for (let i = 0; i < r.length; i += 4) cores.push([lum(r[i], r[i + 1], r[i + 2]), r[i], r[i + 1], r[i + 2]]);
cores.sort((a, b) => a[0] - b[0]);
const naPercentil = (p) => cores[Math.min(cores.length - 1, Math.max(0, Math.round(p * (cores.length - 1))))];

const t = await sharp(ANTIGO).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = t.info;
const opacos = [];
for (let s = 0; s < w * h; s++) if (t.data[s * 4 + 3] > 0) opacos.push([lum(t.data[s * 4], t.data[s * 4 + 1], t.data[s * 4 + 2]), s]);
opacos.sort((a, b) => a[0] - b[0]);
const out = Buffer.from(t.data);
opacos.forEach(([, s], k) => {
  const c = naPercentil(k / Math.max(1, opacos.length - 1));
  out[s * 4] = c[1]; out[s * 4 + 1] = c[2]; out[s * 4 + 2] = c[3];
});
await sharp(out, { raw: { width: w, height: h, channels: 4 } }).png().toFile(TILE);
const aresta = naPercentil(0.97);
const hex = (c) => '0x' + c.slice(1).map((v) => v.toString(16).padStart(2, '0')).join('');
console.log(TILE, `${w}x${h}`, 'aresta', hex(aresta), aresta.slice(1).join(','));
```

- [ ] **Step 2: Escrever `scripts/_g/_cor-nevoa-f1.mjs`**

```js
// BLOCO G · the fog colour the F1 treatment takes from HIS painting — the usual sum of the phases and cutscenes: the
// mean of the mid-dark tones (luminance percentile 40–70) ×1.5, plus a cold touch on blue. For perfis.ts (faseF1) and
// numerosF1.ts (COR.nevoa).
//   node scripts/_g/_cor-nevoa-f1.mjs
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const p = await sharp('public/sprites/f1/pintura.png').ensureAlpha().raw().toBuffer();
const px = [];
for (let i = 0; i < p.length; i += 4) px.push([lum(p[i], p[i + 1], p[i + 2]), p[i], p[i + 1], p[i + 2]]);
px.sort((a, b) => a[0] - b[0]);
const meio = px.slice(Math.round(px.length * 0.4), Math.round(px.length * 0.7));
const media = [1, 2, 3].map((c) => meio.reduce((a, v) => a + v[c], 0) / meio.length);
const cor = media.map((v, c) => Math.min(255, Math.round(v * 1.5 + (c === 2 ? 6 : 0))));
console.log('névoa', `[${cor.join(', ')}]`, '0x' + cor.map((v) => v.toString(16).padStart(2, '0')).join(''));
```

- [ ] **Step 3: Rodar os dois**

```bash
node scripts/_g/_chao-f1.mjs
node scripts/_g/_cor-nevoa-f1.mjs
```
Expected: `public/sprites/ground-tile.png 128x48 aresta 0x…` e `névoa [r, g, b] 0x…`. `assets/raw/ground-tile-original.png` existe.

- [ ] **Step 4: Gravar as cores medidas**

Em `src/f1/numerosF1.ts`, no `COR`, trocar o valor de `nevoa` pelo hex da névoa impresso e o de `aresta` pelo hex da aresta impresso (os valores do Step 3; `chaoFrente` fica `0xa8acb6`).
Em `src/systems/atmosfera/perfis.ts`, linha 252, trocar `[45, 64, 83]` pelo `[r, g, b]` da névoa impresso, e trocar o comentário acima da linha 252 (se houver) — a linha fica:
```ts
  faseF1: perfilDeFase('faseF1', ABERTA, [R, G, B], HALO_COMBATE),
```
com `R, G, B` = os três números impressos. O halo continua `HALO_COMBATE` (o laranja dos tiros nas fases abertas: a regra da Fatia 9).

- [ ] **Step 5: Rodar os testes de perfil e de relógio**

```bash
node scripts/test-atmosfera-perfis.mjs
node scripts/test-f1-ritmos.mjs
```
Expected: os dois sem falha.

- [ ] **Step 6: Conferir o chão ampliado** — abrir `public/sprites/ground-tile.png` com o Read; ele tem de ler como a rocha escura com neve da pintura (não azul), com o mesmo desenho de rachaduras. Checkpoint, sem commit.

---

### Task 6: O horizonte no jogo (módulo, carregamento, Parallax, GameScene) e a sonda

**Files:**
- Create: `src/f1/horizonte.ts`
- Modify: `src/scenes/BootScene.ts` (o mapa `ART`, perto da linha 1234; o `preload`, linha 1354)
- Modify: `src/Parallax.ts` (imports; campos; `buildSurface` 663–926; `update` 1617; `playAtmosphereExit` 2201–2207; método novo `setRelogio`)
- Modify: `src/scenes/GameScene.ts:816`
- Create: `scripts/_g/_probe-f1.mjs`

**Interfaces:**
- Consumes: `PROF`, `CACHOEIRA_F1`, `BRUMA_F1`, `CORDILHEIRA`, `COR` (Task 2/5); `derivaPintura` (Task 2); `farolApagado`, `torres` (`src/menu/ritmos.ts`); `FAROIS` (`src/menu/numerosMenu.ts`); `lcg` (`src/menu/acaso.ts`); o `dados.json` (Task 3); as texturas da Task 4.
- Produces:
  - `montarHorizonte(scene: Phaser.Scene): Horizonte | null`, com `Horizonte = { atualizar(t: number): void; readonly objetos: Phaser.GameObjects.GameObject[]; readonly pintura: Phaser.GameObjects.Image; readonly farois: Phaser.GameObjects.Image[] }`
  - `Parallax.setRelogio(t: number): void`

- [ ] **Step 1: Escrever a sonda que falha**

`scripts/_g/_probe-f1.mjs`:
```js
// BLOCO G · the round-1 probe: the F1 horizon is up, the old layers are gone, the painting drifts by the stage clock,
// the beacons blink, and the atmosphere exit fades the horizon. Needs `npm run dev` on :5173.
//   node scripts/_g/_probe-f1.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, msg, visto) => { console.log(`${c ? '✔' : '✘'} ${msg}${c ? '' : ` — visto: ${JSON.stringify(visto)}`}`); if (!c) falhas++; };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0.5, null, { timeout: 30000 });

const r = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const p = s.parallax;
  return {
    temHorizonte: !!p.horizonte,
    objetos: p.horizonte?.objetos.length ?? 0,
    farois: p.horizonte?.farois.length ?? 0,
    chaves: p.layers.map((l) => l.key),
    brumas: p.brumaF1.length,
    pinturaTextura: p.horizonte?.pintura.texture.key,
    pinturaLarg: p.horizonte?.pintura.width,
  };
});
ok(r.temHorizonte, 'o horizonte da F1 está montado', r);
ok(r.pinturaTextura === 'f1-pintura' && r.pinturaLarg === 429, 'a pintura inteira, 429 de largura, em escala 1', r);
ok(r.farois >= 4, 'os faróis das torres estão no rig', r.farois);
ok(r.brumas === 2, 'duas bandas de bruma entre os planos', r.brumas);
const velhas = ['skyline', 'colonyLight', 'cometSky', 'mtnMid', 'enemyScout', 'asteroid'];
ok(!r.chaves.some((k) => velhas.includes(k)), 'as camadas antigas saíram (skyline, luzes ciano, cometa, mtnMid, tráfego, entulho)', r.chaves);
ok(r.chaves.includes('f1Cordilheira') && r.chaves.includes('f1CordilheiraPerto'), 'as duas faixas da cordilheira nova estão lá', r.chaves);

// The drift, by the clock (not by real time).
const deriva = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const x = (t) => { p.setRelogio(t); p.update(0, 0); return p.horizonte.pintura.x; };
  return { t0: x(0), t55: x(55), t110: x(110), t300: x(300) };
});
ok(deriva.t0 === 0 && deriva.t110 === -45 && deriva.t300 === -45 && deriva.t55 < 0 && deriva.t55 > -45, 'a pintura deriva 45 px pelo relógio da fase e para', deriva);

// The beacons blink (1.4 s on every 2.3 s): over one cycle each one is seen both lit and off.
const pisca = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const vistos = p.horizonte.farois.map(() => new Set());
  for (let t = 0; t < 2.3; t += 0.05) {
    p.setRelogio(t);
    p.update(0, 0);
    p.horizonte.farois.forEach((f, i) => vistos[i].add(f.visible));
  }
  return vistos.every((v) => v.size === 2);
});
ok(pisca, 'cada farol acende e apaga dentro de um ciclo', pisca);

// The exit: the horizon fades out, the zero-G painting comes in.
await page.evaluate(() => window.__game.scene.getScene('Game').breakAtmosphere());
await page.waitForTimeout(2300);
const saida = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  return { pintura: p.horizonte.pintura.alpha, bruma: p.brumaF1[0].ts.alpha, zeroG: p.zeroGBg?.alpha };
});
ok(saida.pintura < 0.05 && saida.bruma < 0.05 && saida.zeroG > 0.9, 'a saída apaga o horizonte e a bruma, e acende o zero-G', saida);
ok(erros.length === 0, 'nenhum erro de página', erros);

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/_g/_probe-f1.mjs`
Expected: `✘ o horizonte da F1 está montado` (e as seguintes), exit 1.

- [ ] **Step 3: Escrever `src/f1/horizonte.ts`**

```ts
import Phaser from 'phaser';
import { lcg } from '../menu/acaso';
import { FAROIS } from '../menu/numerosMenu';
import { farolApagado, torres } from '../menu/ritmos';
import { CACHOEIRA_F1, PROF } from './numerosF1';
import { derivaPintura } from './ritmosF1';

/**
 * O HORIZONTE DA F1 (bloco G, spec `2026-10-20-f1-cenario-design.md` §4): a pintura dele INTEIRA (429×216, escala 1), os
 * faróis das torres piscando (a luz TIRADA da pintura: `apagadas.png` só tem os pixels que mudam) e a cachoeira
 * correndo — tudo derivando junto com a pintura, pelo RELÓGIO DA FASE. As camadas são assadas fora do jogo
 * (`scripts/_g/_camadas-f1.mjs`). A invasão (rodada 2) entra aqui.
 */

/** Um grupo de luz da pintura (`dados.json`): caixa e área em px de jogo. */
export interface GrupoLuzF1 {
  tipo: 'janela' | 'farol';
  x: number;
  y: number;
  w: number;
  h: number;
  n: number;
}

/** O `dados.json` de `_camadas-f1.mjs`. */
export interface DadosF1 {
  k: number;
  w: number;
  h: number;
  agua: { x: number; y: number; w: number; h: number; quadros: number; fw: number; fh: number };
  grupos: GrupoLuzF1[];
}

export const CHAVES_F1 = {
  pintura: 'f1-pintura',
  apagadas: 'f1-apagadas',
  cachoeira: 'f1-cachoeira',
  dados: 'f1-dados',
} as const;

export interface Horizonte {
  atualizar(t: number): void;
  /** Tudo o que a saída da atmosfera apaga. */
  readonly objetos: Phaser.GameObjects.GameObject[];
  readonly pintura: Phaser.GameObjects.Image;
  /** As peças apagadas dos faróis (visível = farol apagado). A sonda as lê. */
  readonly farois: Phaser.GameObjects.Image[];
}

/** O sorteio da fase de cada torre: o mesmo a cada partida. */
const SEMENTE_FAROIS = 41;

/** Monta o horizonte; `null` se as camadas não foram carregadas (a fase segue, com o céu de reserva). */
export function montarHorizonte(scene: Phaser.Scene): Horizonte | null {
  const D = scene.cache.json.get(CHAVES_F1.dados) as DadosF1 | undefined;
  const faltam = [CHAVES_F1.pintura, CHAVES_F1.apagadas, CHAVES_F1.cachoeira].filter((k) => !scene.textures.exists(k));
  if (!D || faltam.length) {
    console.warn('[f1] as camadas do horizonte não chegaram', faltam);
    return null;
  }
  const A = scene.add;
  const pintura = A.image(0, 0, CHAVES_F1.pintura).setOrigin(0).setDepth(PROF.pintura);

  // Os faróis: os da mesma torre dividem a fase (piscam juntos, a regra do menu).
  const grupos = D.grupos.filter((g) => g.tipo === 'farol');
  const raizes = torres(grupos);
  const rf = lcg(SEMENTE_FAROIS);
  const faseDaTorre = new Map<number, number>();
  const m = FAROIS.margem;
  const farois = grupos.map((g, i) => {
    if (!faseDaTorre.has(raizes[i])) faseDaTorre.set(raizes[i], rf() * FAROIS.ciclo);
    const x0 = Math.max(0, Math.floor(g.x - m));
    const y0 = Math.max(0, Math.floor(g.y - m));
    const o = A.image(0, 0, CHAVES_F1.apagadas)
      .setOrigin(0)
      .setDepth(PROF.apagadas)
      .setCrop(x0, y0, Math.ceil(g.w + 2 * m), Math.ceil(g.h + 2 * m))
      .setVisible(false);
    return { o, fase: faseDaTorre.get(raizes[i]) ?? 0 };
  });

  // A cachoeira: os quadros da folha, cortados uma vez por cena.
  const tex = scene.textures.get(CHAVES_F1.cachoeira);
  if (!tex.has('0')) for (let i = 0; i < D.agua.quadros; i++) tex.add(i, 0, i * D.agua.fw, 0, D.agua.fw, D.agua.fh);
  const agua = A.sprite(D.agua.x, D.agua.y, CHAVES_F1.cachoeira, 0).setOrigin(0).setDepth(PROF.agua);

  const objetos: Phaser.GameObjects.GameObject[] = [pintura, ...farois.map((f) => f.o), agua];
  return {
    objetos,
    pintura,
    farois: farois.map((f) => f.o),
    atualizar(t: number): void {
      const dx = -derivaPintura(t);
      pintura.x = dx;
      for (const f of farois) {
        f.o.x = dx;
        f.o.setVisible(farolApagado(f.fase, t));
      }
      agua.x = D.agua.x + dx;
      agua.setFrame(Math.floor(t * CACHOEIRA_F1.fps) % D.agua.quadros);
    },
  };
}
```

- [ ] **Step 4: Carregar na `BootScene`**

Em `src/scenes/BootScene.ts`, no mapa `ART`, logo depois da linha `paintBgF1: 'sprites/paint-bg-f1.png',` (perto da 1234), acrescentar:
```ts
  // A F1 do bloco G (20/10): o horizonte (a pintura dele inteira, as luzes apagadas, a cachoeira) e a cordilheira
  // tirada da pintura — `scripts/_g/_camadas-f1.mjs` e `_cordilheira-f1.mjs`. O `paintBgF1` antigo fica carregado até
  // o fim do bloco (a limpeza vem depois da aprovação dele).
  'f1-pintura': 'sprites/f1/pintura.png',
  'f1-apagadas': 'sprites/f1/apagadas.png',
  'f1-cachoeira': 'sprites/f1/cachoeira.png',
  f1Cordilheira: 'sprites/f1-cordilheira.png',
  f1Cordilheira2: 'sprites/f1-cordilheira-2.png',
  f1Cordilheira3: 'sprites/f1-cordilheira-3.png',
  f1CordilheiraPerto: 'sprites/f1-cordilheira-perto.png',
  f1CordilheiraPerto2: 'sprites/f1-cordilheira-perto-2.png',
  f1CordilheiraPerto3: 'sprites/f1-cordilheira-perto-3.png',
```
No `preload()`, logo depois do laço `for (const [key, sheet] of Object.entries(SHEETS)) { … }`, acrescentar:
```ts
    // O mapa das luzes e da cachoeira do horizonte da F1 (`scripts/_g/_camadas-f1.mjs`).
    this.load.json('f1-dados', 'sprites/f1/dados.json');
```
(Se a Task 4 tirou uma peça da lista, apagar as duas linhas da variante que não existe.)

- [ ] **Step 5: O `Parallax` — imports, campos e `setRelogio`**

Em `src/Parallax.ts`, depois de `import type { ChavePintura } from './systems/atmosfera/perfis';` (linha 5):
```ts
import { montarHorizonte, type Horizonte } from './f1/horizonte';
import { BRUMA_F1, COR, CORDILHEIRA } from './f1/numerosF1';
```
Depois do campo `private cascoFrente: Phaser.GameObjects.TileSprite | null = null;` (linha 260):
```ts
  /** O HORIZONTE DA F1 (bloco G): a pintura dele, os faróis e a cachoeira, pelo relógio da fase. */
  private horizonte: Horizonte | null = null;
  /** A BRUMA ENTRE OS PLANOS da F1 (bloco G): duas bandas `fogBand` na cor da névoa da pintura. */
  private brumaF1: { ts: Phaser.GameObjects.TileSprite; fator: number }[] = [];
  /** O relógio da fase (s), que o `GameScene` passa a cada quadro: o horizonte é função dele, não do tempo real. */
  private relogio = 0;
```
E um método público, logo antes de `update(dt: number, worldSpeed: number): void {` (linha 1617):
```ts
  /** O relógio da fase (s). O horizonte da F1 é função dele: o treino, que salta para o chefão, cai no estado certo. */
  setRelogio(t: number): void {
    this.relogio = t;
  }

  /** A menor largura entre as variantes de uma camada (para o `gap` garantir sobreposição). */
  private larguraMin(chave: string): number {
    let w = Infinity;
    for (let i = 1; i < 10; i++) {
      const k = i === 1 ? chave : `${chave}${i}`;
      if (!this.scene.textures.exists(k)) break;
      w = Math.min(w, (this.scene.textures.get(k).getSourceImage() as { width: number }).width);
    }
    return w;
  }
```

- [ ] **Step 6: O `Parallax.buildSurface` com as camadas novas**

Substituir o corpo de `buildSurface()` (linhas 663–926: do comentário `/** A lua da Fase 1: …` até o `}` que fecha o método, depois de `this.buildAtmosphereExit();`) por:
```ts
  /**
   * A F1 (bloco G, spec `2026-10-20-f1-cenario-design.md` §4): a pintura dele INTEIRA ao fundo, a bruma entre os planos,
   * a cordilheira tirada da própria pintura, o chão na paleta dela e as rochas do primeiro plano.
   *
   * ⚠️ SAÍRAM (20/10): o céu em degradê (fica só como rede de segurança atrás da pintura opaca), a `paint-bg-f1`
   * antiga, o `skyline`, as `colonyLight` (pontos ciano em código), o `cometSky`, o tráfego feito com o `enemyScout`
   * escurecido, as duas faixas de `mtnMid` pintadas de azul pelo `tint` e o entulho de `asteroid`. Tudo isso lia como
   * "gerado" contra a pintura (folha `folhas/2026-10-20/f1-cenario/hoje.html`).
   */
  private buildSurface(): void {
    // A REDE DE SEGURANÇA: sem as camadas da pintura, a fase ainda tem um céu (a pintura é opaca e o cobre inteiro).
    const ceu = this.scene.add.graphics().setDepth(-99);
    ceu.fillGradientStyle(0x05070f, 0x05070f, 0x141c30, 0x141c30, 1);
    ceu.fillRect(0, 0, GAME_WIDTH, GROUND_Y);

    // O HORIZONTE: a pintura dele inteira, os faróis e a cachoeira, derivando pelo relógio da fase.
    this.horizonte = montarHorizonte(this.scene);

    // A BRUMA ENTRE OS PLANOS: é a diferença de velocidade entre ela, a pintura e a cordilheira que vende o volume.
    for (const b of BRUMA_F1) {
      const ts = this.scene.add
        .tileSprite(0, b.y, GAME_WIDTH, b.h, 'fogBand')
        .setOrigin(0, 0)
        .setDepth(b.depth)
        .setTint(COR.nevoa)
        .setAlpha(b.pico);
      ts.setTileScale(1, b.h / 64);
      this.brumaF1.push({ ts, fator: b.fator });
    }

    // A CORDILHEIRA: as massas da frente da pintura, em duas faixas (a de trás menor, mais enevoada e mais lenta).
    // Escala 1 (as alturas são assadas), sem tint. GAP MENOR QUE A LARGURA = sobreposição obrigatória: a peça termina
    // numa parede vertical, e espaçada esse corte apareceria contra o céu. A base nasce ENTERRADA (a lição do deslize).
    for (const c of [CORDILHEIRA.longe, CORDILHEIRA.perto]) {
      if (!this.scene.textures.exists(c.chave)) continue;
      const w = this.larguraMin(c.chave);
      this.addLayer({
        key: c.chave,
        factor: c.fator,
        baseY: GROUND_Y + c.baseY,
        depth: c.depth,
        tint: 0xffffff,
        alpha: 1,
        scale: [1, 1],
        gap: [Math.round(w * 0.55), Math.round(w * 0.8)],
        terreno: true,
      });
    }

    // Alto o bastante para sangrar para fora da tela: uma faixa fina de solo denuncia que o mundo acaba ali embaixo.
    // O tile é o desenho de sempre RECOLORIDO na rocha da pintura (`scripts/_g/_chao-f1.mjs`); sem tint.
    this.ground = this.scene.add
      .tileSprite(0, GROUND_Y, GAME_WIDTH, 48, 'groundTile')
      .setOrigin(0, 0)
      .setDepth(-80)
      .setTint(0xffffff);

    // Aresta de luz no topo do solo: a rocha com neve da pintura. Sem ela, chão e cordilheira viram uma massa só.
    this.groundRim = this.scene.add
      .rectangle(0, GROUND_Y, GAME_WIDTH, 1, COR.aresta)
      .setOrigin(0, 0)
      .setDepth(-79)
      .setAlpha(0.7);

    // FAIXA DE SOLO DA FRENTE: a mesma arte do chão, um degrau acima e um tom abaixo, escondendo o pé dos props.
    // Depth −0.2: na frente dos props (−0.5), atrás da nave (0). Rola junto com o mundo (o `groundOffset`).
    this.groundFront = this.scene.add
      .tileSprite(0, GROUND_Y - 5, GAME_WIDTH, 48, 'groundTile')
      .setOrigin(0, 0)
      .setDepth(-0.2)
      .setTint(COR.chaoFrente);

    // NÉVOA RASTEIRA: o fog de solo, na cor da névoa da pintura. À frente da cordilheira, atrás do chão.
    this.addLayer({
      key: 'nebula',
      factor: 0.75,
      baseY: 0,
      depth: -84,
      tint: COR.nevoa,
      alpha: 0.16,
      scale: [1.2, 2.0],
      gap: [140, 240],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 20, GROUND_Y + 8],
    });

    // PRIMEIRO PLANO: as rochas em silhueta passando NA FRENTE da nave (depth 60). A arte nova é da rodada 3 (a família
    // das peças); até lá, o pico de sempre, no mesmo azul-abissal.
    this.addLayer({
      key: 'spire',
      factor: 1.5,
      baseY: GAME_HEIGHT + 8,
      depth: 60,
      tint: 0x121a2e,
      alpha: 1,
      scale: [0.9, 1.6],
      gap: [120, 230],
      terreno: true,
      primeiroPlano: true,
    });

    this.buildAtmosphereExit();
  }
```

- [ ] **Step 7: O `update` anda o horizonte e a bruma**

Em `Parallax.update`, logo depois do bloco `if (this.paintedBg.length) { … }` (termina na linha 1631), acrescentar:
```ts
    // O HORIZONTE DA F1 e a BRUMA entre os planos (bloco G): o horizonte pelo relógio da fase; a bruma pelo mundo.
    this.horizonte?.atualizar(this.relogio);
    for (const b of this.brumaF1) b.ts.tilePositionX += worldSpeed * b.fator * dt;
```

- [ ] **Step 8: A saída da atmosfera apaga o horizonte e a bruma**

Em `playAtmosphereExit`, trocar:
```ts
    const saindo: Phaser.GameObjects.GameObject[] = [
      ...this.paintedBg,
      ...(this.groundFront ? [this.groundFront] : []),
    ];
```
por:
```ts
    const saindo: Phaser.GameObjects.GameObject[] = [
      ...this.paintedBg,
      ...(this.groundFront ? [this.groundFront] : []),
      // A F1 do bloco G: o horizonte (a pintura, os faróis, a cachoeira) e a bruma entre os planos. Não são terreno:
      // não caem, só saem, como a pintura antiga saía.
      ...(this.horizonte?.objetos ?? []),
      ...this.brumaF1.map((b) => b.ts),
    ];
```
⚠️ Um farol apagado que acende de novo durante o fade: o `setVisible` do `atualizar` não mexe no alpha, e o tween leva o alpha de todos a 0 — sem pisca no fim.

- [ ] **Step 9: O `GameScene` passa o relógio**

Em `src/scenes/GameScene.ts`, logo ANTES da linha `this.parallax.update(dt, SCROLL_SPEED * frenagem);` (816):
```ts
    // O relógio da fase para o horizonte da F1 (bloco G): ele é função do relógio, não do tempo real.
    this.parallax.setRelogio(this.elapsed);
```

- [ ] **Step 10: Typecheck**

Run: `npm run typecheck`
Expected: sem erros. (Se o `tsc` acusar campos não lidos — `paintedBg` continua lido pelo `update` e pelo `fatorPintura` —, nada a fazer; se acusar `GAME_HEIGHT`/`pickVariant` sem uso, conferir que continuam usados em outros métodos antes de apagar o import.)

- [ ] **Step 11: Rodar a sonda e ver passar**

Run: `node scripts/_g/_probe-f1.mjs` (com `npm run dev` no ar)
Expected: todas as linhas `✔`, `TUDO OK`, exit 0.

- [ ] **Step 12: Ver no jogo, parado, antes de filmar**

```bash
node scripts/_g/_f1-fotos.mjs docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/fotos
```
Abrir 3 das fotos (4 s, 28 s, 52 s) com o Read. Aceite: a pintura inteira ao fundo (a cidadela à direita), as duas faixas de cordilheira sem corte reto contra o céu, o chão sem azul, nenhuma camada antiga. Se a cordilheira tapar a colônia, baixar `CORDILHEIRA.*.altura` no `_cordilheira-f1.mjs` (Task 4) e reassar; se o vão entre as peças mostrar corte reto, baixar o fator do `gap` (0,55–0,8) no Step 6.

- [ ] **Step 13: Checkpoint** — sem commit.

---

### Task 7: A filmagem, a folha da rodada e a verificação completa

**Files:**
- Create: `scripts/_g/_filmar-f1.mjs`
- Create: `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1.html`
- Output: `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1/f1.webm`, `saida.webm`, `t*.png`

**Interfaces:**
- Consumes: tudo das Tasks 3–6; `webm(dir, out, fps)` de `scripts/_menu/_webm.mjs`.

- [ ] **Step 1: Escrever `scripts/_g/_filmar-f1.mjs`**

```js
// BLOCO G · the F1 as it is now, filmed on a STEPPED clock (60 Hz steps, a photo every 2 = 30 fps, fake Date.now so
// the tweens follow — the lesson of block D) for his sheet. The world canvas only (no HUD): the ship parked high on
// the left and untouchable; the enemies and the hazards hidden with --limpo (the background is what is judged).
//   node scripts/_g/_filmar-f1.mjs <outDir> [segundos=70] [--limpo] [--saida]
//   --saida: films the atmosphere exit instead (breakAtmosphere 1 s in, 7 s long) → saida.webm
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright';
import { webm } from '../_menu/_webm.mjs';

const args = process.argv.slice(2);
const OUT = args[0];
const SAIDA = args.includes('--saida');
const LIMPO = args.includes('--limpo');
const SEG = SAIDA ? 8 : Number(args.find((a, i) => i > 0 && /^\d+$/.test(a)) ?? 70);
const Z = 3;
const QUADROS = path.join(OUT, '_q');
fs.rmSync(QUADROS, { recursive: true, force: true });
fs.mkdirSync(QUADROS, { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0, null, { timeout: 30000 });
await page.evaluate(() => {
  const g = window.__game;
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  const base = Date.now(), t0 = window.__passo.t;
  Date.now = () => base + Math.round(window.__passo.t - t0);
  const s = g.scene.getScene('Game');
  if (s?.cartas) s.cartas.intocavel = () => true;
  s.invulnerableUntil = 1e12;
});
const foto = () => page.evaluate(() => new Promise((res) => window.__game.renderer.snapshot((img) => {
  const c = document.createElement('canvas');
  c.width = img.width; c.height = img.height;
  c.getContext('2d').drawImage(img, 0, 0);
  res(c.toDataURL('image/png'));
}))).then((u) => Buffer.from(u.split(',')[1], 'base64'));

const QUADRO = 1000 / 60;
const total = Math.round(SEG * 30);
const marcas = SAIDA ? [] : [0, 10, 20, 30, 40, 50, 60].map((s) => s * 30);
for (let i = 0; i < total; i++) {
  await page.evaluate(({ QUADRO, limpo, saida, i }) => {
    const g = window.__game;
    const s = g.scene.getScene('Game');
    if (saida && i === 30) s.breakAtmosphere();
    for (let k = 0; k < 2; k++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
      if (s?.ship) { s.ship.x = 40; s.ship.y = 40; s.ship.body?.setVelocity?.(0, 0); }
    }
    if (limpo) for (const gr of [s?.enemies?.enemies, s?.debris?.hazards, s?.enemyBullets]) if (gr?.children) gr.getChildren().forEach((o) => o.setVisible(false));
  }, { QUADRO, limpo: LIMPO, saida: SAIDA, i });
  const f = await foto();
  const arq = path.join(QUADROS, `${String(i).padStart(5, '0')}.png`);
  await sharp(f).resize(384 * Z, 216 * Z, { kernel: 'nearest' }).png().toFile(arq);
  if (marcas.includes(i)) fs.copyFileSync(arq, path.join(OUT, `t${String(i / 30).padStart(2, '0')}.png`));
}
await browser.close();
const nome = SAIDA ? 'saida.webm' : LIMPO ? 'f1-limpo.webm' : 'f1.webm';
await webm(QUADROS, path.join(OUT, nome), 30);
fs.rmSync(QUADROS, { recursive: true, force: true });
console.log(path.join(OUT, nome), total, 'quadros');
```

- [ ] **Step 2: Filmar (a fase com o jogo, a fase limpa, a saída)**

```bash
node scripts/_g/_filmar-f1.mjs docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1 70
node scripts/_g/_filmar-f1.mjs docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1 70 --limpo
node scripts/_g/_filmar-f1.mjs docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1 --saida
```
Expected: `…/f1.webm 2100 quadros`, `…/f1-limpo.webm 2100 quadros`, `…/saida.webm 240 quadros`, e os `t00.png`…`t60.png`. (Cada filmagem de 70 s leva alguns minutos: rodar em segundo plano se precisar.)

- [ ] **Step 3: Conferir as fotos ampliadas antes de montar a folha**

Abrir `t00.png`, `t30.png` e `t60.png` com o Read. Conferir: a deriva (a cidadela anda ~12 px de t=0 a t=30), os faróis em estados diferentes entre as fotos, a cachoeira, a bruma, a cordilheira, o chão. Qualquer defeito volta à Task de origem antes da folha.

- [ ] **Step 4: Escrever a folha `docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1.html`**

```html
<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Fase 1 · rodada 1</title>
<style>
  :root { --bg:#0d0f15; --card:#151923; --line:#262c3a; --txt:#d9dde6; --sub:#9aa3b5; --pend:#ffb347; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--txt); font:15px/1.55 system-ui, "Segoe UI", sans-serif; }
  main { max-width: 1240px; margin: 0 auto; padding: 32px 16px 80px; }
  h1 { font-size: 28px; margin: 0 0 6px; }
  h2 { font-size: 22px; margin: 48px 0 14px; padding-bottom: 6px; border-bottom: 1px solid var(--line); }
  p { margin: 6px 0; }
  a { color: var(--sub); }
  .sub { color: var(--sub); }
  .item { background: var(--card); border: 1px solid var(--line); border-radius: 10px; padding: 18px; margin: 18px 0; }
  .grade { display:grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 14px; }
  figure { margin: 14px 0 0; }
  figure img, figure video { display:block; width:100%; height:auto; border-radius: 6px; border:1px solid var(--line); background:#000; image-rendering: pixelated; }
  figcaption { color: var(--sub); font-size: 13px; margin-top: 6px; }
  figcaption b { color: var(--txt); }
  ul { margin: 6px 0; padding-left: 22px; }
  li { margin: 4px 0; }
  .decidir { border-color: var(--pend); }
</style>
</head>
<body>
<main>
<h1>Fase 1 · rodada 1 · a pintura e as camadas</h1>
<p class="sub">20/10/2026 · <a href="pintura.html">← a pintura</a> · <a href="hoje.html">o cenário de antes</a> · A sua pintura inteira ao fundo, com os faróis piscando e a cachoeira correndo; a cordilheira tirada das montanhas da frente dela; a bruma entre os planos; o chão na paleta dela. As peças do chão, o primeiro plano e os inimigos ainda são os de antes (a rodada 3 troca as peças).</p>

<h2>A fase, em velocidade real</h2>
<figure><video src="rodada1/f1-limpo.webm" autoplay loop muted playsinline controls></video><figcaption><b>Só o cenário (70 s):</b> os inimigos e os tiros escondidos, para julgar o fundo.</figcaption></figure>
<figure><video src="rodada1/f1.webm" loop muted playsinline controls></video><figcaption><b>Com o jogo (70 s).</b></figcaption></figure>
<figure><video src="rodada1/saida.webm" loop muted playsinline controls></video><figcaption><b>A saída da atmosfera:</b> o horizonte e a bruma saem dentro da névoa, como a pintura antiga saía.</figcaption></figure>

<h2>Quadro a quadro</h2>
<div class="grade">
  <figure><img src="rodada1/t00.png" alt=""><figcaption><b>0 s</b></figcaption></figure>
  <figure><img src="rodada1/t20.png" alt=""><figcaption><b>20 s</b></figcaption></figure>
  <figure><img src="rodada1/t40.png" alt=""><figcaption><b>40 s</b></figcaption></figure>
  <figure><img src="rodada1/t60.png" alt=""><figcaption><b>60 s</b>: a pintura já andou ~25 px</figcaption></figure>
</div>

<h2>As peças da rodada</h2>
<div class="item">
  <figure><img src="rodada1/cordilheira.png" alt=""><figcaption><b>A cordilheira:</b> as massas da frente da sua pintura, recortadas. As três da direita são as mesmas, menores e mais enevoadas: a faixa de trás.</figcaption></figure>
  <figure><img src="rodada1/luzes.png" alt=""><figcaption><b>Cada luz, acesa e apagada</b> (8×), recortada como o jogo recorta: primeiro os faróis (piscam agora), depois as janelas (apagam na rodada 2).</figcaption></figure>
  <div class="grade">
    <figure><img src="rodada1/acesa-inteira.png" alt=""><figcaption><b>A colônia acesa</b> (o começo da fase).</figcaption></figure>
    <figure><img src="rodada1/apagada-inteira.png" alt=""><figcaption><b>A colônia com todas as luzes apagadas</b>: um gosto do fim da rodada 2.</figcaption></figure>
  </div>
</div>

<h2>O que você decide</h2>
<div class="item decidir">
  <ul>
    <li><b>A cordilheira:</b> a altura e a quantidade das faixas, e se ela tapa demais a colônia.</li>
    <li><b>A bruma:</b> mais forte, mais leve ou como está.</li>
    <li><b>O chão:</b> o desenho de antes recolorido na sua rocha basta, ou quer arte nova.</li>
    <li><b>A deriva:</b> 45 px na fase inteira; ou a pintura parada.</li>
  </ul>
</div>
</main>
</body>
</html>
```

- [ ] **Step 5: A verificação completa**

```bash
npm run typecheck
node scripts/test-f1-ritmos.mjs
node scripts/test-menu-ritmos.mjs
node scripts/test-atmosfera-perfis.mjs
node scripts/_g/_probe-f1.mjs
node scripts/probe-menu.mjs
node scripts/probe-stage4.mjs
npm run build
```
Expected: tudo verde, exceto as falhas JÁ CONHECIDAS de antes deste bloco (anotar qualquer outra e investigar antes de seguir). `probe-stage4` atravessa a campanha inteira, F1 incluída.

- [ ] **Step 6: Abrir a folha para ele**

```powershell
Start-Process "http://localhost:5173/docs/superpowers/folhas/2026-10-20/f1-cenario/rodada1.html"
```

- [ ] **Step 7: Registrar e parar para a aprovação dele**

Acrescentar ao fim deste plano uma seção "## Execução (data)" com: os desvios da spec (os três do topo + qualquer outro), os números finais (quantos faróis e janelas, as alturas da cordilheira, as cores medidas) e o que espera por ele. NÃO seguir para a rodada 2 sem a aprovação dele. Sem commit.

---

## Execução (20/10)

Tasks 1–7 executadas na mesma sessão do plano. Nada commitado.

**Os números finais**
- A pintura: 429×216, deriva de 45 px em 110 s.
- As luzes: **13 faróis** e **249 janelas**; 627 pixels mudam quando tudo apaga; a cachoeira tem 21 px de água.
- A cordilheira: **duas peças** (a encosta da montanha grande da esquerda e a montanha grande da direita): 63×62 e 59×80 na faixa da frente, 41×40 e 38×52 na de trás.
- As cores: a névoa `[33, 41, 58]` (`0x21293a`), a aresta do chão `0x354152`.

**Os desvios além dos quatro do topo**
5. **Os faróis desta pintura são ROSADOS, não o vermelho puro do menu** (medido a 4×: r 120–200, g ≈ b ≈ 0,45–0,6 r). A regra do menu achou ZERO faróis. Entrou uma regra própria da F1 no `_camadas-f1.mjs` (não no `luzes.mjs`, de que o menu depende): um grupo rosado com o escuro em volta (≤ 4% de pixels acesos no anel de 2K–3K) é farol. E, a 1×, o brilho rosado de cada farol se espalha um pixel em volta e às vezes não passa no teste de "quente": todo pixel avermelhado (r acima da média de g e b por mais de 4) a até 1 px da caixa do farol muda também (`_medir-farois-f1.mjs` mostrou 3 de 13 faróis sem mudança nenhuma antes disso).
6. **A cordilheira segue o CUME, não a escuridão.** A 1ª tentativa (alfa pela escuridão + preencher buracos) trouxe as faixas de névoa que cruzam a rocha como bolhas sólidas, e uma peça encostada na borda da caixa saiu retangular. Nesta pintura o céu atrás das montanhas é tão escuro quanto a rocha, então o cume é achado coluna a coluna com um limiar POR PEÇA (a meio caminho entre a névoa do topo da caixa e a rocha do terço de baixo), alisado por mediana, e as pontas descem numa rampa de 20%. Ficaram duas peças: as colinas do meio traziam luzes da colônia (iam aparecer duas vezes, andando) e a crista de pinheiros quase não tem névoa acima (10,6 contra 8,1 de rocha), então o cume saiu em degraus.
7. **O chão: rampa suave, não pixel a pixel.** O casamento de percentis pixel a pixel na rocha mais escura deu um chão quase preto e chiado; agora cada pixel do desenho, 25% mais escuro, pega a cor MÉDIA da faixa de luminosidade da montanha da frente (32 faixas).
8. **A névoa é a bruma pintada, não a conta de sempre.** A conta (tons médio-escuros ×1,5) dava `[18, 30, 49]`, quase preto: esta pintura é muito mais escura que as outras. A névoa da Atmosfera, da bruma e da névoa rasteira é a média da bruma pintada da metade de baixo, com o toque frio.

9. **A filmagem fotografa a TELA, não o renderizador.** O `_filmar-f1.mjs` do plano usava `renderer.snapshot`, que só entrega a imagem no PRÓXIMO quadro desenhado; com o relógio do jogo parado entre os passos, esse quadro nunca vinha, e a 1ª filmagem ficou presa na primeira foto. Agora é `page.screenshot` do canvas do mundo (como as ferramentas do bloco D), com a camada do texto escondida.

**O que espera por ele:** a folha `folhas/2026-10-20/f1-cenario/rodada1.html` (os três vídeos, os quadros, a cordilheira, as luzes, a colônia acesa e apagada) e as quatro decisões dela (a cordilheira, a bruma, o chão, a deriva).
