# Fase 1 — Passe visual do cenário (leva 1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar profundidade atmosférica de cenário (clima Metal Slug em paleta DARK) à Fase 1 e enraizar os picos-obstáculo, sem tocar em jogabilidade, balanceamento ou roteiro.

**Architecture:** O grosso é adicionar CAMADAS ao parallax de superfície (`Parallax.buildSurface`), reusando o motor de scatter/reciclagem que já existe (`addLayer`/`emit`). Uma extensão mínima do `ScatterLayer` (`glow?`) habilita elementos aditivos (luzes/haze). A raiz dos picos é decoração anexada ao prop no `TerrainSystem.spawn`. A leva B gera arte bespoke pelo pipeline existente, aprovada asset a asset.

**Tech Stack:** TypeScript + Phaser 3 + Vite. Verificação por Playwright (`scripts/probe-*.mjs`) + screenshot + revisão a olho. Assets via PixelLab (`scripts/install-sprite.mjs` / `anim-sheet.mjs`).

## Global Constraints

- **Paleta DARK/alienígena preservada** — névoa é FRIA e dim; nada de crepúsculo terrestre claro.
- **Legibilidade jogável é lei** — picos-obstáculo continuam claros e lidos de relance; camadas novas ficam no FUNDO; a luta de chefão continua limpa (`setForegroundDimmed` já apaga o primeiro plano).
- **Guarda de textura** — todo asset novo passa por `this.textures.exists(...)`; sem o PNG, a camada não entra e o jogo não quebra.
- **Sem mudança de jogabilidade** — `STAGE_1`, hitboxes, balanceamento e navegação inalterados. Autoria dos commits: SÓ Henrique (sem Co-Authored-By).
- **Verificação por sonda/screenshot + typecheck/build**, não por teste unitário (não há suíte de testes no projeto).

---

## Estrutura de arquivos

- **`src/Parallax.ts`** — extensão do `ScatterLayer` (`glow?`) + honra em `emit`; novas camadas em `buildSurface` (gradiente de céu, haze de horizonte, haze entre montanhas, 3ª montanha, luzes da colônia, névoa rasteira). Responsável pelo FUNDO.
- **`src/systems/TerrainSystem.ts`** — raiz dos picos (`spire`): base + sombra + névoa anexadas ao prop no `spawn`, reciclando junto.
- **`src/scenes/BootScene.ts`** — textura procedural de "luz da colônia" (`colonyLight`) e registro de qualquer arte bespoke da leva B.
- **`scripts/probe-stage1-visual.mjs`** — NOVO: sobe a Fase 1 e tira screenshots (a régua visual desta fatia).

---

### Task 0: Harness visual da Fase 1

**Files:**
- Create: `scripts/probe-stage1-visual.mjs`

**Interfaces:**
- Produces: um script Node que sobe `http://localhost:5173`, entra na Fase 1 e salva `scripts/_f1-<t>.png` em alguns instantes. (Prefixo `_` = gitignorado.)

- [ ] **Step 1: Escrever o harness**

```js
// scripts/probe-stage1-visual.mjs — screenshots da Fase 1 para o passe visual do cenário.
import { chromium } from 'playwright';
const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// A Fase 1 começa via atalho de dev do menu? Não — inicia direto: pular o menu e entrar em F1.
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'diegetico' });
});
let last = 0;
for (const t of [3000, 12000, 24000]) {
  await page.waitForTimeout(t - last);
  last = t;
  await page.screenshot({ path: `scripts/_f1-${t}.png` });
}
await browser.close();
console.log('ok — scripts/_f1-*.png');
```

- [ ] **Step 2: Rodar com o dev server no ar**

Run: `npm run dev` (background) e depois `node scripts/probe-stage1-visual.mjs`
Expected: imprime `ok` e cria `scripts/_f1-3000.png`, `_f1-12000.png`, `_f1-24000.png`. Abrir os 3 e confirmar que a Fase 1 está rodando (chão, montanhas, inimigos). Este é o estado ANTES do passe — a base de comparação.

- [ ] **Step 3: Commit** (o harness é útil e versionável apesar do `_` nos PNGs)

```bash
git add scripts/probe-stage1-visual.mjs
git commit -m "chore(fase1): harness de screenshots da Fase 1 para o passe visual"
```

---

### Task 1: Extensão `glow` no ScatterLayer + gradiente de céu + haze de horizonte

**Files:**
- Modify: `src/Parallax.ts` (interface `ScatterLayer`, `emit`, `buildSurface`)

**Interfaces:**
- Produces: campo opcional `glow?: boolean` em `ScatterLayer`; quando true, `emit` cria o sprite com `blendMode: 'ADD'`. Duas camadas novas no fundo (gradiente + haze de horizonte).

- [ ] **Step 1: Adicionar `glow?` ao ScatterLayer**

No bloco da interface `ScatterLayer`, ao lado de `flutua?`:

```ts
  /** Sprite ADITIVO (luzes da colônia, brilho de névoa): vira BRILHO em vez de mancha opaca. */
  glow?: boolean;
```

- [ ] **Step 2: Honrar `glow` em `emit`**

Em `emit`, logo após criar `img` com `.setFlipX(...)`, encadear/aplicar:

```ts
    if (layer.glow) img.setBlendMode(Phaser.BlendModes.ADD);
```

- [ ] **Step 3: Gradiente de céu no topo do `buildSurface`**

Como PRIMEIRA coisa em `buildSurface()` (antes das camadas), um Graphics com gradiente vertical, depth −99:

```ts
    // GRADIENTE DE CÉU: topo mais preto → horizonte um tom acima. Dá VOLUME ao céu (era preto
    // chapado). Estático (é o céu), depth −99 (atrás de tudo). Frio e escuro — a Fase 1 segue dark.
    const ceu = this.scene.add.graphics().setDepth(-99);
    ceu.fillGradientStyle(0x05070f, 0x05070f, 0x141c30, 0x141c30, 1);
    ceu.fillRect(0, 0, GAME_WIDTH, GROUND_Y);
```

- [ ] **Step 4: Haze de horizonte (atrás das montanhas)**

Ainda em `buildSurface`, ANTES da camada `mtnFar` (para ficar atrás dela), uma camada de névoa fria e dim presa numa faixa junto ao horizonte:

```ts
    // HAZE DO HORIZONTE: névoa fria e dim atrás das montanhas — cada cume dissolve nela e a
    // camada de trás lê como mais LONGE (perspectiva aérea por névoa, o truque do Metal Slug).
    // Faixa junto ao horizonte; tom frio; alpha baixo. Deriva devagar com o parallax.
    this.addLayer({
      key: 'nebula',
      factor: 0.09,
      baseY: 0,
      depth: -95,
      tint: 0x1a2338,
      alpha: 0.28,
      scale: [1.6, 2.6],
      gap: [150, 260],
      terreno: false,
      flutua: true,
      faixa: [GROUND_Y - 54, GROUND_Y - 6],
    });
```

- [ ] **Step 5: typecheck/build + screenshot**

Run: `npm run build` → Expected: PASS (typecheck + vite).
Run: `node scripts/probe-stage1-visual.mjs` (dev server no ar) → abrir `_f1-*.png`.
Expected: o céu tem gradiente sutil (não preto chapado) e há uma bruma fria assentada no horizonte, atrás das montanhas. A cena segue DARK. Inimigos e picos legíveis.

- [ ] **Step 6: Commit**

```bash
git add src/Parallax.ts
git commit -m "feat(fase1): gradiente de céu + haze de horizonte (profundidade atmosférica)"
```

---

### Task 2: Haze entre montanhas + 3ª faixa de montanha (mtnNear)

**Files:**
- Modify: `src/Parallax.ts` (`buildSurface`)

**Interfaces:**
- Consumes: `addLayer` e as texturas `mtnMid*` já registradas.
- Produces: duas camadas novas entre `mtnMid` e o primeiro plano.

- [ ] **Step 1: Haze entre mtnFar e mtnMid**

Em `buildSurface`, ENTRE a camada `mtnFar` e a `mtnMid`:

```ts
    // HAZE ENTRE AS MONTANHAS: a névoa que separa a cordilheira distante da próxima — é ela que
    // faz as duas lerem como PLANOS distintos, não uma massa só (o degrau de profundidade do ref).
    this.addLayer({
      key: 'nebula',
      factor: 0.22,
      baseY: 0,
      depth: -90,
      tint: 0x222c44,
      alpha: 0.22,
      scale: [1.4, 2.2],
      gap: [170, 300],
      terreno: false,
      flutua: true,
      faixa: [GROUND_Y - 46, GROUND_Y - 2],
    });
```

- [ ] **Step 2: 3ª faixa de montanha (mtnNear) — preenche o "MAIS COMPLEXIDADE"**

DEPOIS da camada `mtnMid` (mais à frente/rápida), reusando a arte `mtnMid` com tint um degrau acima:

```ts
    // 3ª FAIXA DE MONTANHA: mais próxima e rápida que a mtnMid, um degrau de tint acima. É ela que
    // PREENCHE o vão vazio do meio-de-cena (o "MAIS COMPLEXIDADE"). Reusa a arte mtnMid — sem custo
    // de geração. Contida na escala para não invadir o campo de jogo; fica atrás do chão (−86).
    this.addLayer({
      key: 'mtnMid',
      factor: 0.6,
      baseY: GROUND_Y + 4,
      depth: -86,
      tint: 0x435679,
      alpha: 1,
      scale: [0.55, 0.9],
      gap: [50, 82],
      terreno: true,
    });
```

- [ ] **Step 3: typecheck/build + screenshot**

Run: `npm run build` → PASS.
Run: `node scripts/probe-stage1-visual.mjs` → abrir `_f1-*.png`.
Expected: o meio-de-cena está preenchido — TRÊS planos de montanha lidos como distâncias distintas, separados por bruma. O vão vazio some. Inimigos ainda pop contra o fundo (tint frio das montanhas). Se a mtnNear invadir a faixa dos inimigos, reduzir `scale` máx.

- [ ] **Step 4: Commit**

```bash
git add src/Parallax.ts
git commit -m "feat(fase1): haze entre montanhas + 3a faixa de montanha (meio-de-cena cheio)"
```

---

### Task 3: Luzes frias da colônia

**Files:**
- Modify: `src/scenes/BootScene.ts` (textura procedural `colonyLight`)
- Modify: `src/Parallax.ts` (`buildSurface`)

**Interfaces:**
- Consumes: `glow?` (Task 1); a faixa do skyline (baseY ≈ `GROUND_Y - 6`).
- Produces: textura `colonyLight` + camada de luzes no horizonte.

- [ ] **Step 1: Textura procedural `colonyLight` no BootScene**

No método que gera texturas procedurais (junto às outras `generateTexture`), um ponto de luz fria de ~3px:

```ts
    // Ponto de luz FRIA da colônia (passe visual F1): um núcleo claro num halo curto. Aditivo em
    // cena (ver ScatterLayer.glow) — vira brilho no horizonte, não um quadrado.
    const gl = this.make.graphics({ x: 0, y: 0 });
    gl.fillStyle(0x9fd0ff, 0.5); gl.fillCircle(2, 2, 2);
    gl.fillStyle(0xffffff, 1); gl.fillCircle(2, 2, 1);
    gl.generateTexture('colonyLight', 4, 4);
    gl.destroy();
```

(Ajustar o padrão exato ao helper de texturas do arquivo; a régua é: núcleo branco + halo ciano-frio, 4×4.)

- [ ] **Step 2: Camada de luzes no `buildSurface`**

Logo DEPOIS da camada `skyline`, uma camada aditiva presa na faixa da silhueta da colônia, na MESMA velocidade do skyline (factor 0.1):

```ts
    // LUZES FRIAS DA COLÔNIA: pontos de luz pontilhando o horizonte industrial (o "vale com luz"
    // do ref, mas alienígena — ciano frio, não janela amarela). Aditivas (glow), na velocidade do
    // skyline. Faixa estreita rente à linha do horizonte.
    this.addLayer({
      key: 'colonyLight',
      factor: 0.1,
      baseY: 0,
      depth: -92,
      tint: 0xffffff,
      alpha: 0.9,
      scale: [0.7, 1.6],
      gap: [26, 70],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 30, GROUND_Y - 4],
      glow: true,
    });
```

- [ ] **Step 3: typecheck/build + screenshot**

Run: `npm run build` → PASS.
Run: `node scripts/probe-stage1-visual.mjs` → abrir `_f1-*.png`.
Expected: pontos de luz fria pontilham o horizonte da colônia (brilho, não quadrados). Densidade de "assentamento", não de letreiro. Se piscar demais/forte, baixar `alpha` ou densidade (subir `gap`).

- [ ] **Step 4: Commit**

```bash
git add src/scenes/BootScene.ts src/Parallax.ts
git commit -m "feat(fase1): luzes frias da colônia no horizonte"
```

---

### Task 4: Névoa rasteira (fog de solo)

**Files:**
- Modify: `src/Parallax.ts` (`buildSurface`)

**Interfaces:**
- Consumes: `addLayer`.
- Produces: uma camada de névoa baixa cruzando a linha do chão.

- [ ] **Step 1: Camada de névoa rasteira**

Perto do fim do `buildSurface` (depois do entulho, antes do primeiro plano `spire`), névoa dim numa faixa baixa:

```ts
    // NÉVOA RASTEIRA: fog frio e sutil cruzando a linha do chão (o fog de solo do Metal Slug). Dá
    // "ar" ao terreno. Atrás do primeiro plano e dos obstáculos; dim para não esconder o jogo.
    this.addLayer({
      key: 'nebula',
      factor: 0.75,
      baseY: 0,
      depth: -84,
      tint: 0x1c2740,
      alpha: 0.16,
      scale: [1.2, 2.0],
      gap: [140, 240],
      terreno: true,
      flutua: true,
      faixa: [GROUND_Y - 20, GROUND_Y + 8],
    });
```

- [ ] **Step 2: typecheck/build + screenshot**

Run: `npm run build` → PASS.
Run: `node scripts/probe-stage1-visual.mjs` → abrir `_f1-*.png`.
Expected: uma bruma baixa lambe a linha do chão, dando atmosfera sem esconder obstáculos/inimigos.

- [ ] **Step 3: Commit**

```bash
git add src/Parallax.ts
git commit -m "feat(fase1): névoa rasteira na linha do chão"
```

---

### Task 5: Enraizar os picos-obstáculo (fim do "SPRITE COLADO")

**Files:**
- Modify: `src/systems/TerrainSystem.ts` (`spawn` + reciclagem)

**Interfaces:**
- Consumes: o fluxo de `spawn`/reciclagem dos props.
- Produces: cada `spire` (âncora `chao`) nasce com base + sombra + névoa que viajam e reciclam junto.

- [ ] **Step 1: Ler como os props ROLAM e reciclam**

Antes de codar: abrir `TerrainSystem.ts` inteiro e identificar (a) como o prop se move (velocity no corpo? movido no `update`?) e (b) onde ele é destruído ao sair da tela. A raiz tem que acompanhar EXATAMENTE o mesmo movimento e morrer junto. Anotar o mecanismo — o código do Step 2 se ancora nele.

- [ ] **Step 2: Anexar a RAIZ ao spire no `spawn`**

Quando `kind === 'spire'` e `!teto`, criar os sprites de raiz na base do pico (`GROUND_Y`), com o MESMO movimento do prop (mesma `velocityX`/mesma lista de update, conforme o mecanismo do Step 1), e guardá-los para reciclar junto:

```ts
    // RAIZ do pico (passe visual F1): base de entulho + sombra de contato + respiro de névoa, para
    // ele NASCER do terreno em vez de colado. Decoração pura — sem física. Viaja e recicla com o prop.
    if (kind === 'spire' && !teto) {
      const x = p.x;
      const sombra = this.scene.add.ellipse(x, GROUND_Y + 1, 26, 7, 0x05070f, 0.5).setDepth(-79);
      const base = this.scene.add
        .image(x, GROUND_Y, pickVariant(this.scene, 'asteroid'))
        .setOrigin(0.5, 1).setDepth(-77).setScale(0.5).setTint(0x4a5a7c);
      const nevoa = this.scene.add
        .image(x, GROUND_Y - 2, 'nebula')
        .setOrigin(0.5, 1).setDepth(-76).setScale(1.1).setTint(0x1c2740).setAlpha(0.22)
        .setBlendMode(Phaser.BlendModes.SCREEN);
      // Vincular ao prop: a raiz segue o x do pico a cada frame e morre com ele (ver Step 1).
      p.setData('raiz', [sombra, base, nevoa]);
    }
```

- [ ] **Step 3: Mover/destruir a raiz junto com o prop**

No `update` do TerrainSystem (onde os props avançam/reciclam), sincronizar cada raiz com o x do seu prop e destruí-la quando o prop for destruído. (Forma exata conforme o mecanismo do Step 1 — se os props têm `velocityX`, dar a mesma aos sprites de raiz e destruí-los no mesmo filtro de saída; se são movidos à mão, atualizar `raiz[i].x = p.x` e destruir no mesmo ponto.)

- [ ] **Step 4: typecheck/build + screenshot com um pico na tela**

Run: `npm run build` → PASS.
Run: `node scripts/probe-stage1-visual.mjs` → nos frames onde há `spire`, confirmar: o pico tem BASE de entulho + SOMBRA no chão + um respiro de névoa no pé; deixou de parecer colado; e continua CLARO/legível (obstáculo). Verificar que a raiz não fica para trás nem some antes do pico (segue e recicla junto).

- [ ] **Step 5: Commit**

```bash
git add src/systems/TerrainSystem.ts
git commit -m "feat(fase1): raiz dos picos-obstaculo (base + sombra + nevoa) — fim do 'colado'"
```

---

### Task 6 (B): Arte bespoke de cenário — geração aprovada asset a asset

**Files:**
- Create: `public/sprites/<novos>.png`
- Modify: `src/scenes/BootScene.ts` (registro), `src/Parallax.ts` (camadas que usam a arte nova)

**Interfaces:**
- Consumes: o pipeline `scripts/install-sprite.mjs` / `anim-sheet.mjs`; a guarda de textura.
- Produces: camadas de meio-fundo com arte dedicada, substituindo/reforçando o reuso das Tasks 2–3.

- [ ] **Step 1: Orçar e propor os assets ao Henrique**

Verificar saldo (`get_balance`). Propor a lista curta (candidatas do spec: estrutura de colônia rica, formação de rocha de meio-fundo distinta, base de pico dedicada). O Henrique escolhe o que gerar. **Nenhuma geração antes do OK dele.**

- [ ] **Step 2: Gerar + revisar cada asset aprovado**

Para cada um: gerar no PixelLab, revisar a arte, instalar via `scripts/install-sprite.mjs`, mostrar ao Henrique. Só entra no jogo o que ele aprovar.

- [ ] **Step 3: Registrar no BootScene + trocar/reforçar a camada no Parallax**

Registrar a textura em `BootScene` (com a guarda) e substituir o reuso das Tasks 2–3 pela arte nova na camada correspondente (ex.: `mtnNear` passa a usar a formação bespoke; skyline ganha a estrutura nova).

- [ ] **Step 4: typecheck/build + screenshot + revisão do Henrique**

Run: `npm run build` → PASS. `node scripts/probe-stage1-visual.mjs` → o Henrique confere o resultado com a arte bespoke.

- [ ] **Step 5: Commit** (autoria só do Henrique)

```bash
git add public/sprites/<novos>.png src/scenes/BootScene.ts src/Parallax.ts
git commit -m "feat(fase1): arte bespoke de cenario (<descricao>)"
```

---

### Task 7: Prova da luta de chefão + sondas de regressão

**Files:**
- Verificação apenas (mais ajustes finos se preciso em `src/Parallax.ts`).

- [ ] **Step 1: Rodar as sondas de regressão da campanha**

Run: `node scripts/probe-stage1.mjs` (se existir) e as demais sondas de F1 tocadas. Se não houver probe-stage1 de fim-a-fim, usar o harness visual até a entrada do chefão.
Expected: verde; nenhum erro de página.

- [ ] **Step 2: Screenshot da luta da Torre**

Levar a Fase 1 até o chefão (atalho `[B]` = chefão 1 em modo practice, via `scene.start('Game', { handling:'diegetico', practice:true })`) e tirar screenshot.
Expected: as camadas novas NÃO tapam os padrões da Torre; o primeiro plano continua apagando na luta (`setForegroundDimmed`); os leques são legíveis. Ajustar alpha/faixa de qualquer camada que atrapalhe.

- [ ] **Step 3: typecheck/build final + Commit de ajustes (se houver)**

```bash
npm run build   # PASS
git add -A && git commit -m "fix(fase1): ajustes de legibilidade das camadas na luta de chefao"
```

---

## Self-review (cobertura do spec)

- Haze entre camadas → Tasks 1, 2, 4. ✔
- Encher o meio-de-cena (3ª montanha, luzes, gradiente) → Tasks 1, 2, 3. ✔
- Enraizar os picos ("colado") → Task 5. ✔
- Névoa rasteira → Task 4. ✔
- Arte bespoke (B) → Task 6. ✔
- Paleta dark / legibilidade / luta de chefão limpa → Constraints + Task 7. ✔
- Guarda de textura, sem mudança de jogabilidade → Constraints (todas as tasks). ✔

Sem placeholders de código nas tasks de engine (código completo). A Task 5 tem um passo de INVESTIGAÇÃO explícito (o mecanismo de scroll dos props) porque o código da raiz se ancora nele — não é placeholder, é a ordem correta. A Task 6 é interativa por natureza (arte aprovada asset a asset).
