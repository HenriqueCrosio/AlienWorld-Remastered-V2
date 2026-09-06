# FATIA 7 · BLOCO A — O LUGAR · Plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA — `superpowers:executing-plans` ou
> `superpowers:subagent-driven-development`. Os passos usam `- [ ]` para marcação.

**Goal:** trocar o cenário da Fase 4 pelos quatro fundos pintados do Henrique, que se sucedem ao
longo da fase, e tirar o `hangar.png` do interior — **sem tocar em uma única hitbox**.

**Architecture:** cada fundo é um par de cópias lado a lado no `Parallax` (a receita que o
`paintBgF2`/`paintBgF3` já usam), e a troca entre eles é um **evento do roteiro** (`cenario`), não
um relógio interno — o `STAGE_4` continua sendo a fonte única da forma da fase.

**Tech Stack:** TypeScript, Phaser 3.90, Vite, `sharp` (redução das pinturas), Playwright (sondas).

## Global Constraints

- **1px de arte = 1px de jogo.** Os fundos entram assados em **384×216** e desenhados em escala 1.
  **REDUZIR pode; AUMENTAR, NUNCA.** Um passo só de `lanczos3`, do original do gerador direto para
  o tamanho final — reamostrar duas vezes custa detalhe.
- **O `hangar.png` não pode mudar.** Ele continua **160×160**, byte por byte. `git status` limpo
  nele ao fim de cada task.
- **Risco de hitbox: ZERO.** Nenhum número do `STAGE_4` referente a `corredor`, `hazard` ou `wave`
  é tocado neste bloco. O evento `corredor` sai igual ao que entrou.
- **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.
- **Commits são de autoria só do Henrique** — sem `Co-Authored-By`, sem "Generated with".
- Resolução do jogo: `GAME_WIDTH = 384`, `GAME_HEIGHT = 216` (`src/config.ts`).

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `scripts/instalar-fundos-f4.mjs` | **criar** — reduz os 4 originais para 384×216 e grava em `public/sprites/` |
| `src/scenes/BootScene.ts` | **modificar** — registra `paintBgF4a..d` no `ART` |
| `src/Parallax.ts` | **modificar** — `buildInterior()` perde o `hangar` e o `nebula3`, ganha a pintura; método novo `setPintura()` |
| `src/systems/StageDirector.ts` | **modificar** — `StageEvent` ganha `cenario`; `STAGE_4` ganha as trocas |
| `src/scenes/GameScene.ts` | **modificar** — `runEvent` ganha o `case 'cenario'` |
| `scripts/probe-f4-visual.mjs` | **criar** — a sonda da fatia |

---

## Task 1: Os quatro fundos entram no disco e no BootScene

**Files:**
- Create: `scripts/instalar-fundos-f4.mjs`
- Create: `scripts/probe-f4-visual.mjs`
- Modify: `src/scenes/BootScene.ts` (o objeto `ART`)

**Interfaces:**
- Consumes: `assets/raw/paint-bg-f4-original-{1..4}.png` (1672×941, arte do Henrique)
- Produces: as chaves de textura `paintBgF4a`, `paintBgF4b`, `paintBgF4c`, `paintBgF4d`, todas
  384×216. As tasks 2 e 3 dependem desses nomes exatos.

- [ ] **Passo 1: escrever a sonda que reprova**

Criar `scripts/probe-f4-visual.mjs`:

```js
// FATIA 7 · A FASE 4 — a sonda do passe visual do interior.
//
// O que só se vê rodando: se as quatro pinturas entraram na resolução do jogo, se o hangar
// SUMIU do modo interior, e se o cenário TROCA nas batidas que o roteiro manda.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// ─── As quatro pinturas, na resolução EXATA do jogo ───
const pinturas = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return ['paintBgF4a', 'paintBgF4b', 'paintBgF4c', 'paintBgF4d'].map((k) => {
    if (!s.textures.exists(k)) return { k, existe: false };
    const img = s.textures.get(k).getSourceImage();
    return { k, existe: true, w: img.width, h: img.height };
  });
});
console.log('pinturas ', JSON.stringify(pinturas));
for (const p of pinturas) {
  ok(p.existe, `${p.k} existe`);
  ok(p.existe && p.w === 384 && p.h === 216, `${p.k} está em 384×216 (${p.w}×${p.h})`);
}

console.log(falhas === 0 ? '\n✔ A FATIA 7 (BLOCO A) ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Passo 2: rodar e ver reprovar**

Rodar (com o `npm run dev` de pé): `node scripts/probe-f4-visual.mjs`
Esperado: **FALHA** — `✘ paintBgF4a existe` nas quatro.

- [ ] **Passo 3: escrever o instalador**

Criar `scripts/instalar-fundos-f4.mjs`:

```js
// INSTALA os quatro fundos pintados da Fase 4 na resolução NATIVA do jogo.
//
// ⚠️ A LEI: 1px de arte = 1px de jogo. A pintura entra ASSADA em 384×216 e é desenhada em
// escala 1. REDUZIR pode; AUMENTAR, NUNCA — é a grade de pixel casando com a da tela que dá o
// aspecto de PROFUNDIDADE. Pintura esticada em runtime perde a grade e o fundo achata.
//
// ⚠️ E A REDUÇÃO SAI DO ORIGINAL DO GERADOR, num passo só. Reamostrar duas vezes custa
// detalhe (a lição do Zero-G, ver scripts/reduzir-sprite.mjs).
//
// uso: node scripts/instalar-fundos-f4.mjs
import sharp from 'sharp';

const GW = 384;
const GH = 216;
const MAPA = [
  [1, 'a', 'a câmara 1 — o hangar engolido'],
  [2, 'b', 'a câmara 2 — a caixa torácica'],
  [3, 'c', 'o duto'],
  [4, 'd', 'a câmara do núcleo'],
];

for (const [n, letra, oque] of MAPA) {
  const src = `assets/raw/paint-bg-f4-original-${n}.png`;
  const out = `public/sprites/paint-bg-f4-${letra}.png`;

  const meta = await sharp(src).metadata();
  if (meta.width < GW || meta.height < GH) {
    throw new Error(`${src} é ${meta.width}×${meta.height} — MENOR que 384×216. Não amplie: gere de novo maior.`);
  }

  await sharp(src).resize(GW, GH, { kernel: 'lanczos3' }).png().toFile(out);

  const dep = await sharp(out).metadata();
  if (dep.width !== GW || dep.height !== GH) {
    throw new Error(`${out} saiu ${dep.width}×${dep.height}, esperado ${GW}×${GH}`);
  }
  console.log(`✔ ${out}  ${meta.width}×${meta.height} → ${GW}×${GH}   (${oque})`);
}
```

- [ ] **Passo 4: rodar o instalador**

Rodar: `node scripts/instalar-fundos-f4.mjs`
Esperado: quatro linhas `✔ public/sprites/paint-bg-f4-{a,b,c,d}.png  1672×941 → 384×216`.

- [ ] **Passo 5: registrar no BootScene**

Em `src/scenes/BootScene.ts`, no objeto `ART`, logo depois da entrada `hangar:`, acrescentar:

```ts
  // ─── OS QUATRO FUNDOS DA FASE 4 (Fatia 7, arte do Henrique) ───
  // A jornada anatômica: o hangar engolido → a caixa torácica → o duto → a câmara do núcleo.
  // ⚠️ 384×216 = a resolução EXATA do jogo, assada no arquivo (scripts/instalar-fundos-f4.mjs).
  // Desenhados em escala 1: é a grade de pixel casando com a da tela que dá a PROFUNDIDADE.
  // Sem placeholder: sem eles, o `interior` cai nas camadas procedurais de sempre.
  paintBgF4a: 'sprites/paint-bg-f4-a.png',
  paintBgF4b: 'sprites/paint-bg-f4-b.png',
  paintBgF4c: 'sprites/paint-bg-f4-c.png',
  paintBgF4d: 'sprites/paint-bg-f4-d.png',
```

- [ ] **Passo 6: rodar a sonda e ver passar**

Rodar: `node scripts/probe-f4-visual.mjs`
Esperado: **PASSA** — as oito linhas de `paintBgF4*` verdes.

- [ ] **Passo 7: conferir que o hangar não foi tocado**

Rodar: `git status --porcelain public/sprites/hangar.png`
Esperado: **saída vazia**.

- [ ] **Passo 8: commit**

```bash
git add scripts/instalar-fundos-f4.mjs scripts/probe-f4-visual.mjs src/scenes/BootScene.ts public/sprites/paint-bg-f4-*.png
git commit -m "feat(fatia7): os quatro fundos do interior entram na resolucao do jogo"
```

---

## Task 2: O hangar sai do interior, e a pintura entra no lugar

**Files:**
- Modify: `src/Parallax.ts` — `buildInterior()`
- Modify: `scripts/probe-f4-visual.mjs`

**Interfaces:**
- Consumes: `paintBgF4a` (Task 1).
- Produces: `Parallax.pinturaF4: Phaser.GameObjects.Image[]` — o par de cópias da pintura atual do
  interior. A Task 3 troca a textura desses dois objetos.

- [ ] **Passo 1: acrescentar os asserts que reprovam**

Em `scripts/probe-f4-visual.mjs`, antes da linha final de resumo, acrescentar:

```js
// ─── O INTERIOR: a pintura entrou e o hangar SUMIU ───
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

const interior = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const imgs = s.children.list.filter((o) => o.type === 'Image');
  const chaves = imgs.map((o) => o.texture?.key).filter(Boolean);
  return {
    modo: s.parallax?.mode,
    usamHangar: chaves.filter((k) => k === 'hangar').length,
    pintura: chaves.filter((k) => String(k).startsWith('paintBgF4')).length,
    escalas: [...new Set(imgs.filter((o) => String(o.texture?.key).startsWith('paintBgF4')).map((o) => o.scaleX))],
  };
});
console.log('interior ', JSON.stringify(interior));
ok(interior.modo === 'interior', `o fundo é o modo interior (${interior.modo})`);
ok(interior.usamHangar === 0, `o hangar SUMIU do interior (${interior.usamHangar} imagens usam)`);
ok(interior.pintura === 2, `a pintura entrou com as DUAS cópias (${interior.pintura})`);
ok(
  interior.escalas.length === 1 && interior.escalas[0] === 1,
  `a pintura é desenhada em escala 1 (${JSON.stringify(interior.escalas)})`,
);
```

- [ ] **Passo 2: rodar e ver reprovar**

Rodar: `node scripts/probe-f4-visual.mjs`
Esperado: **FALHA** em `o hangar SUMIU` (hoje há várias) e em `a pintura entrou`.

- [ ] **Passo 3: trocar a camada no `buildInterior`**

Em `src/Parallax.ts`, no início de `buildInterior()`, **remover** os dois `addLayer` de
`nebula3` e de `hangar` (o bloco que começa em `// A nebulosa pelas janelas` e termina no fecho do
`addLayer` do `hangar`) e pôr no lugar:

```ts
    // ─── A PINTURA DO INTERIOR (Fatia 7) ───
    //
    // A parede era o `hangar.png` repetido, com janelas mostrando o espaço — o jogador acabava
    // de ser ENGOLIDO por uma garganta e a primeira coisa que via era uma parede de hangar com
    // vista para a nebulosa. O lugar mentia sobre o que é.
    //
    // Agora é a pintura do Henrique, e ela TROCA ao longo da fase (ver `setPintura`): o hangar
    // engolido → a caixa torácica → o duto → a câmara do núcleo.
    //
    // ⚠️ A `nebula3` saiu junto: ela existia para aparecer PELAS JANELAS do hangar. Com uma
    // pintura opaca na frente, ela era sprite gasto atrás de parede.
    //
    // ⚠️ ESCALA 1, SEMPRE. A pintura está assada em 384×216 (a resolução do jogo). É a grade de
    // pixel casando com a da tela que dá a PROFUNDIDADE — esticar aqui achata o fundo.
    //
    // Duas cópias lado a lado, como o `paintBgF2`/`paintBgF3`, para a rolagem nunca mostrar
    // buraco. Depth −96: atrás de tudo que é do interior, à frente do planeta (−97).
    if (this.scene.textures.exists('paintBgF4a')) {
      const w = (this.scene.textures.get('paintBgF4a').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.pinturaF4.push(
          this.scene.add
            .image(i * w, 0, 'paintBgF4a')
            .setOrigin(0, 0)
            .setDepth(-96)
            .setData('bgFactor', 0.02),
        );
      }
      this.paintedBg.push(...this.pinturaF4);
    }
```

E declarar o campo, junto dos outros, perto de `private nebulaPainting`:

```ts
  /** As duas cópias da pintura do interior (Fase 4). `setPintura` troca a textura delas. */
  private pinturaF4: Phaser.GameObjects.Image[] = [];
```

- [ ] **Passo 4: rodar a sonda e ver passar**

Rodar: `node scripts/probe-f4-visual.mjs`
Esperado: **PASSA** — `o hangar SUMIU do interior (0 imagens usam)` e `a pintura entrou com as
DUAS cópias (2)`.

- [ ] **Passo 5: a regressão — a Fase 4 continua jogável de ponta a ponta**

Rodar: `node scripts/probe-stage4.mjs`
Esperado: **PASSA**, incluindo `✔ FASE 4 DE PONTA A PONTA (com o NÚCLEO)`. Nenhum número de
corredor mudou; se esta sonda cair aqui, o erro é de render, não de geometria.

- [ ] **Passo 6: commit**

```bash
git add src/Parallax.ts scripts/probe-f4-visual.mjs
git commit -m "feat(fatia7): a parede do interior deixa de ser o hangar e vira a pintura"
```

---

## Task 3: O cenário TROCA, dirigido pelo roteiro

**Files:**
- Modify: `src/Parallax.ts` — método `setPintura()`
- Modify: `src/systems/StageDirector.ts` — `StageEvent` e `STAGE_4`
- Modify: `src/scenes/GameScene.ts` — `runEvent`
- Modify: `scripts/probe-f4-visual.mjs`

**Interfaces:**
- Consumes: `Parallax.pinturaF4` (Task 2).
- Produces:
  - `Parallax.setPintura(key: string, durationMs?: number): void` — troca a textura das duas
    cópias com um fade por baixo. `durationMs` default 600.
  - `StageEvent` ganha `{ t: number; type: 'cenario'; key: string }`.

- [ ] **Passo 1: acrescentar os asserts que reprovam**

Em `scripts/probe-f4-visual.mjs`, antes do resumo final:

```js
// ─── A TROCA DE CENÁRIO: o roteiro manda, o Parallax obedece ───
//
// ⚠️ Espera por ESTADO (o relógio da fase), nunca por relógio de parede: um assert novo que
// gaste tempo faria a espera cega derivar.
const pinturaEm = async (ate) => {
  for (let i = 0; i < 600; i++) {
    const e = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99;                                  // a sonda não sabe jogar
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      return { t: s.elapsed ?? 0, tex: s.parallax?.pinturaAtual ?? null };
    });
    if (!e) return null;
    if (e.t >= ate) return e;
    await page.waitForTimeout(200);
  }
  return null;
};

const c1 = await pinturaEm(5);
console.log('cenario 1', JSON.stringify(c1));
ok(c1?.tex === 'paintBgF4a', `t=5s: a câmara 1 é o hangar engolido (${c1?.tex})`);

const c2 = await pinturaEm(45);
console.log('cenario 2', JSON.stringify(c2));
ok(c2?.tex === 'paintBgF4b', `t=45s: TROCOU para a caixa torácica (${c2?.tex})`);

const c3 = await pinturaEm(70);
console.log('cenario 3', JSON.stringify(c3));
ok(c3?.tex === 'paintBgF4c', `t=70s: TROCOU para o duto (${c3?.tex})`);

const c4 = await pinturaEm(84);
console.log('cenario 4', JSON.stringify(c4));
ok(c4?.tex === 'paintBgF4d', `t=84s: TROCOU para a câmara do núcleo (${c4?.tex})`);
```

- [ ] **Passo 2: rodar e ver reprovar**

Rodar: `node scripts/probe-f4-visual.mjs`
Esperado: **FALHA** nos quatro — `s.parallax.pinturaAtual` é `undefined`.

- [ ] **Passo 3: o método no Parallax**

Em `src/Parallax.ts`, junto de `setNebulaDensity`, acrescentar:

```ts
  /**
   * TROCA a pintura do interior (Fase 4). Quem manda é o ROTEIRO (evento `cenario`), não um
   * relógio interno — o `STAGE_4` é a fonte única da forma da fase.
   *
   * O fade mergulha no ESCURO e volta, em vez de dissolver uma pintura na outra: as quatro são
   * opacas e detalhadas, e um crossfade direto vira sopa no meio do caminho. O escuro lê como
   * passar por um estreitamento — que é exatamente o que a ficção diz que está acontecendo.
   *
   * ⚠️ A textura troca no MEIO do mergulho, com a tela já escura. Trocar no começo mostraria o
   * corte.
   */
  setPintura(key: string, durationMs = 600): void {
    if (!this.pinturaF4.length || !this.scene.textures.exists(key)) return;
    if (this.pinturaAtual === key) return;

    const meio = durationMs / 2;
    this.scene.tweens.addCounter({
      from: 1,
      to: 0,
      duration: meio,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => {
        const a = tw.getValue() ?? 0;
        for (const img of this.pinturaF4) img.setAlpha(a);
      },
      onComplete: () => {
        for (const img of this.pinturaF4) img.setTexture(key);
        this.pinturaAtual = key;
        this.scene.tweens.addCounter({
          from: 0,
          to: 1,
          duration: meio,
          ease: 'Sine.easeOut',
          onUpdate: (tw) => {
            const a = tw.getValue() ?? 1;
            for (const img of this.pinturaF4) img.setAlpha(a);
          },
        });
      },
    });
  }
```

E o campo público que a sonda lê, junto de `pinturaF4`:

```ts
  /** A chave da pintura do interior que está na tela. A sonda da fatia cobra este valor. */
  pinturaAtual: string | null = null;
```

No `buildInterior`, dentro do `if` que cria as cópias, logo depois do `this.paintedBg.push(...)`:

```ts
      this.pinturaAtual = 'paintBgF4a';
```

- [ ] **Passo 4: o evento no StageDirector**

Em `src/systems/StageDirector.ts`, no `StageEvent`, antes de `| { t: number; type: 'boss' }`:

```ts
  /**
   * TROCA O CENÁRIO PINTADO (Fase 4). A fase é uma jornada anatômica — o hangar engolido, a
   * caixa torácica, o duto e a câmara do núcleo — e cada câmara é uma pintura própria.
   *
   * ⚠️ É o ROTEIRO que manda, não o Parallax: assim a forma da fase mora toda num lugar só.
   */
  | { t: number; type: 'cenario'; key: string }
```

E no `STAGE_4`, acrescentar as três trocas (a primeira câmara já nasce no `buildInterior`):

```ts
  // A CÂMARA 2 — a caixa torácica. Azul frio contra o vermelho da 1: é a troca de PALETA que
  // faz "estou indo fundo" ser lido. Duas câmaras vermelhas seguidas leriam como o mesmo lugar.
  { t: 40, type: 'cenario', key: 'paintBgF4b' },
  // O DUTO — a mais escura das quatro, e é onde a leitura mais importa.
  { t: 68, type: 'cenario', key: 'paintBgF4c' },
  // A CÂMARA DO NÚCLEO, no silêncio que já existia antes do chefão.
  { t: 82, type: 'cenario', key: 'paintBgF4d' },
```

⚠️ Inserir cada linha na posição CRONOLÓGICA correta do array (depois de `t: 38`, depois de
`t: 67`, e depois de `t: 79.5`). O `StageDirector` consome o roteiro em ordem.

- [ ] **Passo 5: o case na GameScene**

Em `src/scenes/GameScene.ts`, no `switch` de `runEvent`, antes de `case 'boss'`:

```ts
      case 'cenario':
        this.parallax.setPintura(e.key);
        break;
```

- [ ] **Passo 6: rodar a sonda e ver passar**

Rodar: `node scripts/probe-f4-visual.mjs`
Esperado: **PASSA** nas quatro trocas.

- [ ] **Passo 7: typecheck e build**

Rodar: `npm run build`
Esperado: sem erro de tipo. ⚠️ O `switch` de `runEvent` é exaustivo — se o `case 'cenario'`
faltar, o typecheck acusa aqui, não a sonda.

- [ ] **Passo 8: a regressão**

Rodar: `node scripts/probe-stage4.mjs`
Esperado: **PASSA** de ponta a ponta.

- [ ] **Passo 9: commit**

```bash
git add src/Parallax.ts src/systems/StageDirector.ts src/scenes/GameScene.ts scripts/probe-f4-visual.mjs
git commit -m "feat(fatia7): o cenario da Fase 4 troca ao longo da fase, dirigido pelo roteiro"
```

---

## Task 4: As colunas novas — arte

⚠️ **Esta task termina numa FOLHA DE CONTATO para o Henrique julgar, não num merge.** Gerar
coluna nova e instalar sem ele ver é exatamente o que custou 40 gerações na Fatia 6.

**Files:**
- Create: `scripts/_f4/_folha-colunas.mjs`
- Modify (depois da aprovação dele): `src/scenes/BootScene.ts`, `src/scenes/GameScene.ts`
  (`sorteiaKind`)

- [ ] **Passo 1: medir a linha de base ANTES de trocar qualquer arte**

Rodar: `node scripts/probe-stage4.mjs` e guardar a saída de `corredores`. É o número contra o
qual a troca vai ser conferida.

- [ ] **Passo 2: gerar as colunas no PixelLab**

Duas peças, `colunaA` (costela) e `colunaB` (duto orgânico), desenhadas COMO coluna: **base
cortada reta, ponta definida**, silhueta que diz onde a coluna termina e onde o vão começa. Passar
como referência de estilo o `paint-bg-f4-a.png` já instalado.

- [ ] **Passo 3: montar a folha de contato e mandar para ele**

As candidatas em cima do fundo `paintBgF4a`, em zoom 2×, com o vão de 76px marcado — a pergunta
que ele responde é **"dá para achar o vão de relance?"**.

- [ ] **Passo 4: PARAR e esperar o julgamento dele**

⚠️ Nada é instalado antes da resposta.

- [ ] **Passo 5 (só depois do OK): instalar e RE-MEDIR os vãos**

Rodar `node scripts/probe-stage4.mjs` de novo e comparar com o Passo 1.
⚠️ **Instalar arte mais justa encolhe o vão sem uma linha do roteiro mudar.** Se o número mudou,
a arte está errada — não o roteiro.

- [ ] **Passo 6: commit**

```bash
git add public/sprites/coluna-*.png src/scenes/BootScene.ts src/scenes/GameScene.ts
git commit -m "feat(fatia7): as colunas do interior passam a ser desenhadas como coluna"
```

---

## Critério de aceite do Bloco A

O Henrique joga a Fase 4 inteira e responde:

1. **Parece estar dentro do bicho?**
2. **Dá para achar o vão de relance?**
3. **A troca entre câmaras se sente como passar por um estreitamento, ou como um corte?**
   (o `durationMs` de 600 é ponto de partida, não número fechado)

Nada de screenshot: a Fatia 6 teve três defeitos que passaram por sonda verde e só caíram quando
ele rodou a cena.
