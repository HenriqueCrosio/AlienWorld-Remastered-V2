# Cutscene 1 (fatia 2) — fundo pintado + Aurora nítida — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o céu da cutscene 1 pela pintura do Henrique (espaço aberto: lua + cinturão) e a Aurora borrada (120×49 esticada ×3.2) por arte pixel nítida ~192px exibida em escala ×2 inteira — sem tocar em roteiro, tempos ou textos.

**Architecture:** A pintura entra como camada mais distante da `InterludeScene` (depth −110, atrás do starfield −100), substituindo o `Parallax('espaco')` — que vira o fallback quando o PNG não existe. A Aurora nova segue o pipeline PixelLab da leva 2 (ref lateral de OUTRO asset, candidatos aprovados pelo Henrique) e o código só recalibra geometria MEDIDA no PNG (`ART_H`, `DECK_ROW`, `SCALE`, aresta do convés). A sonda existente `probe-interlude.mjs` é a régua de regressão.

**Tech Stack:** TypeScript + Phaser 3 + Vite. sharp (downscale/medições). PixelLab via `scripts/gerar.mjs` + MCP + `scripts/install-sprite.mjs`. Playwright (`scripts/probe-interlude.mjs`).

## Global Constraints

- **Roteiro/tempos/textos da cena INTACTOS** (inclusive a ausência de tecla de pular — decisão documentada no código).
- **Guarda de textura em tudo**: sem `paint-bg-cut1.png` → parallax antigo; sem `carrier-big.png` → `carrier` antigo ×3.2 (comportamento de hoje).
- **Geometria MEDIDA no PNG, nunca chutada** (lição das bocas de canhão/convés — `InterludeScene.ts:60-73`).
- **Arte aprovada pelo Henrique antes de instalar** (candidatos PixelLab mostrados inline).
- **Commits com autoria só do Henrique** (sem Co-Authored-By).
- **Ao fechar a fatia: merge em `main` + `git push`** (pedido de 2026-07-24; inclui commits locais de fatias anteriores).
- Spec: `docs/superpowers/specs/2026-07-24-cutscene1-visual-design.md`.

---

## Estrutura de arquivos

- **`scripts/paint-bg.mjs`** — NOVO, reusável (a fatia 3 usa para a F2): crop central para a proporção alvo + downscale lanczos3 para a resolução interna.
- **`public/sprites/paint-bg-cut1.png`** — a pintura reduzida (480×270).
- **`assets/raw/paint-bg-cut1-original.png` + `paint-bg-f2-original.png`** — originais do Henrique (já no disco), entram no repo.
- **`scripts/medir-conves.mjs`** — NOVO: imprime, por linha do PNG, a largura opaca (acha o SALTO = linha do convés e o vão para a aresta de luz).
- **`public/sprites/carrier-big.png`** — a Aurora nova (PixelLab, ~192px).
- **`src/scenes/BootScene.ts`** — 2 chaves novas em `ART`.
- **`src/scenes/InterludeScene.ts`** — fundo (pintura|parallax) + geometria do casco por textura (`cfg`).

---

### Task 0: Branch de trabalho

- [ ] **Step 1:** `git checkout -b feat/cutscene1-visual` (a partir de `main` limpo; `git status` sem mudanças rastreadas pendentes — os `scripts/_*` soltos podem ficar).

---

### Task 1: Fundo pintado (`paint-bg-cut1.png`)

**Files:**
- Create: `scripts/paint-bg.mjs`, `public/sprites/paint-bg-cut1.png`
- Modify: `src/scenes/BootScene.ts` (bloco `ART`, após `paintBgF1`), `src/scenes/InterludeScene.ts`

**Interfaces:**
- Produces: chave de textura `paintBgCut1`; campo `this.paintedBg: Phaser.GameObjects.Image | null` e `this.parallax: Parallax | null` na `InterludeScene` (a Task 2 não toca nisso).

- [ ] **Step 1: Escrever `scripts/paint-bg.mjs`**

```js
// Reduz uma pintura para a resolução interna do jogo (1 px da arte = 1 px do jogo) — o
// upscale nearest da engine dá o acabamento pixel (mesmo tratamento do paint-bg-f1, b98cce3).
// Crop CENTRAL para a proporção alvo antes do downscale.
//
// uso: node scripts/paint-bg.mjs <in.png> <out.png> <W> <H>
import sharp from 'sharp';

const [inp, out, W, H] = process.argv.slice(2);
if (!inp || !out || !W || !H) {
  console.error('uso: node scripts/paint-bg.mjs <in.png> <out.png> <W> <H>');
  process.exit(1);
}
const w = Number(W);
const h = Number(H);

const img = sharp(inp);
const meta = await img.metadata();
const alvo = w / h;
let cw = meta.width;
let ch = Math.round(meta.width / alvo);
if (ch > meta.height) {
  ch = meta.height;
  cw = Math.round(meta.height * alvo);
}
await img
  .extract({
    left: Math.floor((meta.width - cw) / 2),
    top: Math.floor((meta.height - ch) / 2),
    width: cw,
    height: ch,
  })
  .resize(w, h, { kernel: 'lanczos3' })
  .png()
  .toFile(out);
console.log(`${out}: ${w}x${h} (crop central ${cw}x${ch} de ${meta.width}x${meta.height})`);
```

- [ ] **Step 2: Gerar o PNG**

Run: `node scripts/paint-bg.mjs assets/raw/paint-bg-cut1-original.png public/sprites/paint-bg-cut1.png 480 270`
Expected: `public/sprites/paint-bg-cut1.png: 480x270 (crop central 1650x928 de 1694x928)`

Abrir o PNG e conferir a olho: lua embaixo à esquerda, campo de asteroides à direita, galáxia em cima — a composição inteira presente.

- [ ] **Step 3: Registrar a chave no BootScene**

Em `src/scenes/BootScene.ts`, logo após a linha `paintBgF1: 'sprites/paint-bg-f1.png',` (~468):

```ts
  // FUNDO PINTADO da cutscene 1 (espaço aberto: a lua que ficou + a borda do cinturão à direita,
  // arte do Henrique). Camada mais distante da InterludeScene; o parallax 'espaco' é o fallback.
  paintBgCut1: 'sprites/paint-bg-cut1.png',
```

- [ ] **Step 4: Trocar o fundo na InterludeScene**

Em `src/scenes/InterludeScene.ts`:

(a) Campos (substituir `private parallax!: Parallax;`):

```ts
  /** O céu: a pintura do Henrique (lua + borda do cinturão). Null = sem PNG, caiu no parallax. */
  private paintedBg: Phaser.GameObjects.Image | null = null;
  /** Fallback do céu (o parallax pixel da Fase 2) — só existe quando a pintura NÃO existe. */
  private parallax: Parallax | null = null;
```

(b) No `create()`, substituir a linha `this.parallax = new Parallax(this, 'espaco');` (e o comentário acima dela) por:

```ts
    // O CÉU DA TRAVESSIA: a pintura do espaço aberto (arte do Henrique). A lua embaixo à
    // esquerda é o mundo que a nave acabou de deixar; o cinturão adensando à direita é para
    // onde ela decola — o corte para a Fase 2 vira VIAGEM, não troca de céu.
    //
    // Depth −110: ATRÁS do starfield (−100) — as estrelas em movimento por cima da pintura
    // parada são o que dá a sensação de deriva. Y centrado (270 de arte para 216 de tela).
    this.paintedBg = null;
    this.parallax = null;
    if (this.textures.exists('paintBgCut1')) {
      this.paintedBg = this.add.image(0, -27, 'paintBgCut1').setOrigin(0, 0).setDepth(-110);
    } else {
      // Sem o PNG: o céu antigo (o mesmo parallax da Fase 2) — comportamento de hoje.
      this.parallax = new Parallax(this, 'espaco');
    }
```

(c) No `update()`, substituir `this.parallax.update(dt, 26);` (mantendo o comentário do ritmo) por:

```ts
    this.parallax?.update(dt, 26);
    // A pintura deriva no MESMO fator da camada pintada da F1 (0.04 sobre a velocidade da
    // cena): ~1px/s. Na cena de <40s anda ~40px — a folga é 96px (480−384), nunca acaba.
    if (this.paintedBg) this.paintedBg.x -= 26 * 0.04 * dt;
```

- [ ] **Step 5: Verificar**

Run: `npm run build` → PASS.
Com `npm run dev` no ar: `node scripts/probe-interlude.mjs` → sem `[ERRO DE PÁGINA]`, os checks existentes ✔ (róster, textura da nave, queda na Fase 2). Abrir `probe-cut-2-aproximacao.png` e `probe-cut-5-implosao.png`: a pintura como céu (lua + cinturão), estrelas por cima, SEM a lua/asteroides pixel antigos.

- [ ] **Step 6: Commit**

```
git add scripts/paint-bg.mjs public/sprites/paint-bg-cut1.png assets/raw/paint-bg-cut1-original.png assets/raw/paint-bg-f2-original.png src/scenes/BootScene.ts src/scenes/InterludeScene.ts
git commit -m "feat(cutscene1): ceu pintado do espaco aberto (arte do Henrique)"
```

(O original da F2 entra junto: é o insumo da fatia 3, já salvo pelo Henrique.)

---

### Task 2: Aurora nítida (PixelLab ~192px, exibida ×2)

**Files:**
- Create: `scripts/medir-conves.mjs`, `public/sprites/carrier-big.png`, `scripts/_ref-aurora.png` (gitignorado)
- Modify: `src/scenes/BootScene.ts` (`ART`), `src/scenes/InterludeScene.ts` (geometria)

**Interfaces:**
- Consumes: `this.paintedBg`/`this.parallax` da Task 1 (não mexe).
- Produces: chave `carrierBig`; campo `this.cfg` com a geometria do casco (tex/artH/deckRow/scale/rimX0/rimX1).

- [ ] **Step 1: Ref de estilo** — vista lateral + paleta humana SEM impor silhueta (lição da leva 2: nunca o `carrier.png` atual, senão sai máquina de cópia). Criar `scripts/_mk-ref-aurora.mjs`:

```js
// Ref de estilo para a Aurora: o caça CINZA (paleta humana, vista lateral) ampliado para a
// LARGURA ALVO — com style_images o size é ignorado e a MAIOR ref define o tamanho de saída.
import sharp from 'sharp';
await sharp('public/sprites/ship-cinza.png')
  .resize({ width: 192, kernel: 'nearest' })
  .png()
  .toFile('scripts/_ref-aurora.png');
console.log('scripts/_ref-aurora.png (192 de largura)');
```

Run: `node scripts/_mk-ref-aurora.mjs`

- [ ] **Step 2: Gerar no PixelLab**

Run: `node scripts/gerar.mjs "massive human military carrier flagship, long flat landing deck on top, command tower and antenna masts rising above the deck, armored grey-blue hull with warm lit windows, side view" 192 sidescroller scripts/_ref-aurora.png`
Expected: imprime `OBJECT_ID` (anotar).

- [ ] **Step 3: Revisar candidatos + APROVAÇÃO** — MCP `get_object(object_id=OBJECT_ID)` mostra os candidatos inline. Critério: convés PLANO legível em cima, superestrutura vertical, casco preenchendo a base. **Mostrar ao Henrique e SÓ seguir com aprovação explícita** (senão `dismiss_review` e regerar ajustando o prompt).

- [ ] **Step 4: Instalar**

MCP `select_object_frames(object_id, indices=[N])` com o candidato aprovado, então:
Run: `node scripts/install-sprite.mjs <OBJECT_ID> - carrier-big`
Expected: `public/sprites/carrier-big.png` criado (recortado à caixa real; anotar o `WxH` impresso).

- [ ] **Step 5: Medir o convés** — criar `scripts/medir-conves.mjs`:

```js
// Onde está o CONVÉS dentro da arte: varre as linhas de cima para baixo e imprime a largura
// opaca de cada uma. A linha do convés é o 1º SALTO grande de largura (torres → casco) — a
// mesma medição documentada em InterludeScene.ts:60-73. O vão [x0..x1] dessa linha é a
// extensão da aresta de luz (deckRim).
//
// uso: node scripts/medir-conves.mjs public/sprites/carrier-big.png
import sharp from 'sharp';

const inp = process.argv[2];
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let prev = 0;
for (let y = 0; y < info.height; y++) {
  let x0 = -1;
  let x1 = -1;
  for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 32) {
      if (x0 < 0) x0 = x;
      x1 = x;
    }
  }
  const w = x0 < 0 ? 0 : x1 - x0 + 1;
  const salto = prev > 0 && w >= prev * 1.8 ? '  ◀ SALTO' : '';
  if (w > 0) console.log(`row ${String(y).padStart(3)}: ${String(w).padStart(3)}px [${x0}..${x1}]${salto}`);
  if (w > 0) prev = w;
}
console.log(`\narte: ${info.width}x${info.height}`);
```

Run: `node scripts/medir-conves.mjs public/sprites/carrier-big.png`
Anotar: **ART_H** (altura impressa), **DECK_ROW** (o `◀ SALTO`), **RIM_X0..RIM_X1** (o vão dessa linha).

- [ ] **Step 6: Registrar + geometria por textura**

(a) `BootScene.ts`, após `paintBgCut1`:

```ts
  // A AURORA nítida (cutscene 1): ~192px exibida ×2 inteira. O `carrier` antigo é o fallback.
  carrierBig: 'sprites/carrier-big.png',
```

(b) `InterludeScene.ts` — substituir as quatro constantes de arte (`ART_H`, `DECK_ROW`, `SCALE`, o getter `carrierY`) por uma config por textura (preencher com os números do Step 5 — eles são MEDIDOS, o plano não pode adivinhá-los):

```ts
  /** Geometria do casco POR TEXTURA — números MEDIDOS no PNG (scripts/medir-conves.mjs). */
  private cfg!: { tex: string; artH: number; deckRow: number; scale: number; rimX0: number; rimX1: number };

  /** Y do centro do sprite que põe a linha do convés exatamente em DECK_Y. */
  private get carrierY(): number {
    return InterludeScene.DECK_Y + (this.cfg.artH / 2 - this.cfg.deckRow) * this.cfg.scale;
  }
```

No começo do `create()` (antes de criar o carrier):

```ts
    // A Aurora nova (×2 INTEIRA — nítida) ou a antiga (×3.2 — o fallback borrado de hoje).
    this.cfg = this.textures.exists('carrierBig')
      ? { tex: 'carrierBig', artH: ART_H, deckRow: DECK_ROW, scale: 2, rimX0: RIM_X0, rimX1: RIM_X1 }
      : { tex: 'carrier', artH: 49, deckRow: 15, scale: 3.2, rimX0: 19, rimX1: 102 };
```

Trocar os usos: `this.add.image(GAME_WIDTH / 2, this.carrierY, this.cfg.tex).setScale(this.cfg.scale)`; no `deckRim`, `const rimX0 = this.cfg.rimX0 * this.cfg.scale;` e `const rimW = (this.cfg.rimX1 - this.cfg.rimX0 + 1) * this.cfg.scale;`. Os DOIS usos de `InterludeScene.carrierY` (create e nenhum outro — conferir com grep) passam a `this.carrierY`.

Se a arte nova já trouxer a própria aresta iluminada no convés (julgar no PNG), manter o `deckRim` mesmo assim — ele custa 1px e reforça; só remover se criar linha dupla feia no screenshot.

- [ ] **Step 7: Verificar + APROVAÇÃO**

Run: `npm run build` → PASS.
`node scripts/probe-interlude.mjs` → checks ✔; nos screenshots: a nave pousa NA linha do convés (não flutuando/enterrada), casco nítido (pixels ×2 uniformes), aresta de luz sobre o vão certo. **Mostrar `probe-cut-3-pouso.png` ao Henrique e aguardar o OK.**

- [ ] **Step 8: Commit**

```
git add public/sprites/carrier-big.png scripts/medir-conves.mjs src/scenes/BootScene.ts src/scenes/InterludeScene.ts
git commit -m "feat(cutscene1): Aurora nitida (arte nova, escala x2 inteira, conves medido)"
```

---

### Task 3: Regressão + fechamento da fatia (merge + push)

- [ ] **Step 1: Regressão completa** — `npm run build` PASS; `node scripts/probe-interlude.mjs` do zero: TODOS os checks ✔ (painel abre, róster 4, textura vira `shipVerde`, cai na Fase 2 com OBUS), sem erro de página. Conferir os 6 `probe-cut-*.png` a olho.

- [ ] **Step 2: Fumaça nas vizinhas** — `node scripts/probe-stage1-visual.mjs` (a F1 não foi tocada, mas o BootScene foi): ok, sem erro.

- [ ] **Step 3: Merge + push** (o pedido do Henrique: fechar a cutscene 1 com commit e push):

```
git checkout main
git merge feat/cutscene1-visual
npm run build   (PASS no resultado)
git branch -d feat/cutscene1-visual
git push origin main
```

- [ ] **Step 4: Registrar o estado** — atualizar a memória do passe (fatia 2 ✅) e, se houver dívida nova (ex.: candidato da Aurora aquém do ideal), anotá-la no spec da fatia.

---

## Self-review (cobertura do spec)

- Fundo pintado 480×270, tratamento da F1, substitui parallax com fallback → Task 1. ✔
- Starfield por cima (pintura em −110 < starfield −100) → Task 1 Step 4. ✔
- Aurora PixelLab ~192 ×2, conceito "convés = horizonte", ref de outro asset, aprovação → Task 2. ✔
- Geometria medida (ART_H/DECK_ROW/SCALE/rim), beats intactos → Task 2 Step 6 (só constantes/config; nenhum delay/texto tocado). ✔
- Guardas de textura nos dois assets → Task 1 Step 4 / Task 2 Step 6. ✔
- Verificação: build + probe-interlude (a sonda já existente cobre os 4+ momentos do spec; não se cria sonda nova — o spec pedia "sonda", esta É a sonda da cena) → Tasks 1–3. ✔
- Commit + push no fechamento, autoria Henrique → Task 3 + Global Constraints. ✔

Os únicos valores não literais do plano (ART_H/DECK_ROW/RIM_X0/RIM_X1) são MEDIDOS do PNG que ainda não existe — o Step 5 da Task 2 os produz e o Step 6 os consome; é o mesmo contrato medido-não-chutado das fatias anteriores, não um placeholder.
