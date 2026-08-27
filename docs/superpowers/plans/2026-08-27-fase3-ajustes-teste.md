# Fase 3 — Ajustes do Primeiro Teste Jogado — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar as quatro mudanças que o primeiro teste jogado da Fase 3 pediu — o rabo colossal que sangra do quadro, o toco da cauda virando a costura do casco, os respiradouros raros e a água-viva elétrica no Ato 1.

**Architecture:** Três dos quatro são cirurgias em código já existente: um campo novo no `Parallax` que desacopla o alpha do casco da densidade da nuvem, uma rotação em torno do pedúnculo que substitui a translação do mergulho, e uma carência no sorteio de props. O quarto é um inimigo novo pelo caminho de sempre (arte PixelLab → `install-anim.mjs` → `BootScene` → `DEFS` → roteiro).

**Tech Stack:** TypeScript · Phaser 3.90 · Vite 6 · Playwright (sondas) · sharp (arte) · PixelLab MCP

**Spec:** `docs/superpowers/specs/2026-08-27-fase3-ajustes-teste-design.md`

## Global Constraints

- **Branch:** `feat/fase3-visual`. Não mergear. `main` continua na Fatia 4.
- **Autoria dos commits: SÓ do Henrique.** Nada de `Co-Authored-By`, nada de `Claude-Session`.
- **O `localhost:5173` tem que estar no ar** para toda sonda. `npm run dev`.
- ⚠️ **SONDA DE TEMPO REAL SE RODA UMA POR VEZ.** Três browsers headless no mesmo Vite quebram a `probe-stage3`. Nunca em paralelo.
- ⚠️ **SONDA EXISTENTE QUE ENCOSTA NA MUDANÇA SE CONFERE, NÃO SE AFROUXA.** Quando um assert reprovar, primeiro decida se ele mede a coisa certa. Se o critério mudou, o assert muda para medir o critério NOVO — nunca para medir menos.
- **Nada fora do escopo muda.** A pintura do Ato 1, o lança-mísseis, os projéteis, a faixa da frente, o piso e as emendas do casco foram APROVADOS jogando.
- **A `paintBgF2` e a `paintBgZeroG` não se tocam** nesta rodada.
- Todo commit fecha com `tsc` limpo. `npx tsc --noEmit`.

## ⚠️ Ordem de execução: dispare a Task 5 primeiro

A animação da água-viva é um job externo do PixelLab (~30–60s). **Dispare o `animate_object` da Task 5, Step 1 ANTES de começar a Task 1** e deixe cozinhando enquanto as Tasks 1–4 andam. O resto da Task 5 espera o job terminar.

## Mudança de número em relação à spec

A spec fixou `rate: 3,2s` para os props do Ato 2 sobre uma janela de 27s. Mas a Task 3 empurra o começo dos props de `t=46` para `t=48` (o casco só fica sólido em `t=48`, e prop opaco sobre casco meio transparente é o defeito que estamos consertando). A janela vira **25s**, e o intervalo cai para **3,0s** para a contagem de lança-mísseis continuar em ~4,2:

- antes: `27 / 1,6 × 0,25 = 4,22`
- depois: `25 / 3,0 × 0,50 = 4,17`

**O balanceamento continua intocado; o número mudou para que ele continuasse intocado.**

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tasks |
|---|---|---|
| `src/Parallax.ts` | `cascoReveal` desacoplado de `nebulaDim`; método `revealCasco()` | 1 |
| `src/scenes/GameScene.ts` | `raboDoLeviata()` (escala, arco, mergulho em duas etapas); carência do respiradouro em `spawnProps()` | 2, 3, 4 |
| `src/systems/StageDirector.ts` | `STAGE_3`: horários do rabo/hazard/banner/props, mistura e intervalo, ondas da água-viva | 3, 4, 5 |
| `src/systems/EnemySystem.ts` | `EnemyKind: 'aguaViva'` + entrada em `DEFS` + o pulso elétrico | 5 |
| `src/scenes/BootScene.ts` | `FRAMES`, `ANIMS`, `TEX` da água-viva | 5 |
| `scripts/probe-f3-visual.mjs` | Asserts: casco invisível, rabo sangrando, toco, respiradouros espaçados, água-viva | 1–5 |
| `scripts/_medir-rabo.mjs` | **Criar.** Mede a arte do rabo para confirmar a escala e o ângulo do mergulho | 2 |
| `public/sprites/agua-viva*.png` | **Criar.** Arte e quadros da água-viva | 5 |
| `docs/HANDOFF.md`, `docs/superpowers/plans/2026-08-25-fase3-visual-START.md` | Registro e frase de arranque | 6 |

---

## Task 1: O casco para de aparecer cedo

O alpha do casco é `1 − nebulaDim` (`src/Parallax.ts:1275`): afinar a nuvem em `t=21` **obriga** o casco a subir a 0,25. Jogado, isso é o *"gradiente de transparência estranho"*. Esta task quebra o acoplamento.

**Files:**
- Modify: `src/Parallax.ts:61-65` (o comentário do campo `casco`), `:131` (campo novo), `:1274-1276` (`alphaFor`), `:1287-1308` (`setNebulaDensity`), e método novo depois dele
- Modify: `scripts/probe-f3-visual.mjs:26-50` (`estado()`), `:82-100` (o bloco do "casco se anuncia")

**Interfaces:**
- Produces: `Parallax.revealCasco(alvo: number, durationMs?: number): void` — a Task 3 chama isto do mergulho do rabo. `Parallax.cascoReveal: number` (0..1) — a sonda lê.
- Consumes: nada.

- [ ] **Step 1: Ensinar a sonda a ler o `cascoReveal`**

Em `scripts/probe-f3-visual.mjs`, dentro do objeto devolvido por `estado()`, logo depois da linha do `nebulaDim`:

```js
      nebulaDim: p ? Number(p.nebulaDim.toFixed(2)) : null,
      cascoReveal: p ? Number(p.cascoReveal.toFixed(2)) : null,
```

- [ ] **Step 2: Inverter o assert do "casco se anuncia"**

Substituir o bloco inteiro em `scripts/probe-f3-visual.mjs` (o que hoje vai da linha 82 à 100):

```js
// ⚠️ O CASCO NÃO SE ANUNCIA MAIS, E A INVERSÃO É DELIBERADA (2026-08-27).
//
// Até aqui este assert exigia o contrário: `alpha > 0.05` em t≈25, a "insinuação" que o
// HANDOFF pedia desde sempre ("na metade do tempo, o Leviatã começa a aparecer"). Ela foi
// implementada na sessão de 26/08, foi JOGADA, e foi reprovada pelo Henrique — o que se via
// era uma estrutura meio apagada pairando 20s antes de ter motivo.
//
// O TESTE JOGADO VENCE O DOCUMENTO. O casco agora nasce quando o RABO afunda, e não antes.
while ((await estado()).t < 25) {
  await page.waitForTimeout(1500);
  await respirar();
}
const meio = await estado();
const cascoMeio = meio.camadas.filter((c) => c.casco);
console.log('t=' + meio.t, 'nebulaDim=' + meio.nebulaDim, 'cascoReveal=' + meio.cascoReveal, JSON.stringify(cascoMeio));

ok(cascoMeio.length > 0, 'a camada do casco existe');
ok(
  cascoMeio.every((c) => c.alpha === null || c.alpha === 0),
  'e está INVISÍVEL na metade do Ato 1 — o casco só nasce quando o rabo afunda',
);
ok(meio.cascoReveal === 0, `cascoReveal=0 em t=${meio.t} (era 1 − nebulaDim = 0.25)`);
// ⚠️ E A NUVEM CONTINUA AFINANDO. É o par que prova o DESACOPLAMENTO: se este assert
// reprovar junto com os de cima, alguém consertou o casco desligando o t=21 inteiro.
ok(
  meio.nebulaDim > 0.6 && meio.nebulaDim < 0.9,
  `mas a NUVEM afinou mesmo assim (nebulaDim=${meio.nebulaDim}) — os dois estão separados`,
);
await page.screenshot({ path: 'scripts/_f3/probe-anuncio.png' });
```

- [ ] **Step 3: Rodar a sonda e ver reprovar**

Run: `node scripts/probe-f3-visual.mjs`
Expected: FALHA em `cascoReveal=0` (a propriedade nem existe → `undefined`) e em `está INVISÍVEL na metade do Ato 1` (o alpha é 0,25).

- [ ] **Step 4: Criar o campo `cascoReveal`**

Em `src/Parallax.ts`, logo depois da declaração de `nebulaDim` (linha ~131):

```ts
  /**
   * A REVELAÇÃO DO CASCO (Fase 3): 0 = não existe, 1 = é o chão.
   *
   * ⚠️ SEPARADO DE `nebulaDim` DE PROPÓSITO (2026-08-27, o primeiro teste jogado). Até aqui o
   * alpha do casco era `1 − nebulaDim` — afinar a nuvem OBRIGAVA o casco a aparecer, e não
   * havia como ter um sem o outro. O roteiro se apoiava nisso em t=21 para "insinuar" o
   * Leviatã, e o que o Henrique viu jogando foi "aquele gradiente de transparência estranho":
   * uma estrutura meio apagada pairando 20s antes de ter motivo.
   *
   * Agora a nuvem afina sozinha, e o casco só nasce quando o RABO o chama — no fim do
   * mergulho, do toco da cauda para a esquerda (ver `GameScene.raboDoLeviata`).
   */
  private cascoReveal = 0;
```

- [ ] **Step 5: Trocar a conta em `alphaFor`**

Em `src/Parallax.ts`, dentro de `alphaFor` (linha ~1275), trocar:

```ts
    if (layer.casco) a *= 1 - this.nebulaDim;
```

por:

```ts
    if (layer.casco) a *= this.cascoReveal;
```

- [ ] **Step 6: Tirar o casco de dentro do `setNebulaDensity`**

Em `src/Parallax.ts`, no corpo do `onUpdate` de `setNebulaDensity`, trocar o laço e a linha da faixa:

```ts
        this.nebulaDim = tw.getValue() ?? alvo;
        for (const layer of this.layers) {
          if (!layer.nebulosaExtra) continue;
          const a = this.alphaFor(layer);
          for (const s of layer.sprites) s.setAlpha(a);
        }
        // A pintura não é ScatterLayer, então ela não passa por `alphaFor` — some aqui, à mão.
        for (const img of this.nebulaPainting) img.setAlpha(this.nebulaDim);
```

⚠️ A linha `this.cascoFrente?.setAlpha(1 - this.nebulaDim);` **sai daqui** — ela vai para o `revealCasco` no Step 7.

E corrigir o cabeçalho do método, que hoje mente ("É UM fade só para DUAS revelações"):

```ts
  /**
   * A DENSIDADE DA NEBULOSA (Fase 3): 1 = dentro da nuvem, 0 = céu limpo.
   *
   * ⚠️ ELE NÃO MEXE MAIS NO CASCO (2026-08-27). Até aqui era "um fade só para duas
   * revelações" — a nuvem sumindo e o casco nascendo eram a MESMA variável, e por isso
   * afinar a nuvem em t=21 arrastava o casco junto. Agora o casco tem o `cascoReveal` dele,
   * e quem o chama é o mergulho do rabo. Ver `revealCasco`.
   *
   * Counter em vez de tween por sprite: as camadas RECICLAM durante o fade, e um sprite novo
   * tem que nascer no alpha do instante (ver `emit`).
   */
```

- [ ] **Step 7: Escrever o `revealCasco`**

Em `src/Parallax.ts`, logo depois do `setNebulaDensity`:

```ts
  /**
   * O CASCO NASCE (Fase 3, a virada do Ato 1 para o Ato 2).
   *
   * ⚠️ QUEM CHAMA É O MERGULHO DO RABO (`GameScene.raboDoLeviata`), NÃO O ROTEIRO. O casco tem
   * que começar no instante exato em que a nadadeira limpa o rodapé — e esse instante é uma
   * etapa de tween, não uma linha do `STAGE_3`. Amarrá-lo ao relógio do roteiro faria os dois
   * derivarem na primeira vez que alguém mexesse na duração da descida, e a costura viraria
   * corte outra vez.
   */
  revealCasco(alvo: number, durationMs = 1500): void {
    const destino = Phaser.Math.Clamp(alvo, 0, 1);

    this.scene.tweens.addCounter({
      from: this.cascoReveal,
      to: destino,
      duration: durationMs,
      ease: 'Sine.easeInOut',
      onUpdate: (tw) => {
        this.cascoReveal = tw.getValue() ?? destino;
        for (const layer of this.layers) {
          if (!layer.casco) continue;
          const a = this.alphaFor(layer);
          for (const s of layer.sprites) s.setAlpha(a);
        }
        // A faixa da frente não é ScatterLayer — não passa por `alphaFor`. Acende aqui, à mão,
        // e junto com o casco: ela é o casco MAIS PERTO (ver a construção dela).
        this.cascoFrente?.setAlpha(this.cascoReveal);
      },
    });
  }
```

- [ ] **Step 8: Corrigir o comentário do campo `casco` na interface**

Em `src/Parallax.ts` (linha ~62), trocar:

```ts
  /** O CASCO do Leviatã (Fase 3, Ato 2): o alpha segue o INVERSO de `nebulaDim` — sair da
   * nuvem e revelar o casco são o MESMO fade, e é por isso que são a mesma variável. */
  casco?: boolean;
```

por:

```ts
  /** O CASCO do Leviatã (Fase 3, Ato 2): o alpha segue `cascoReveal`, que é dirigido pelo
   * MERGULHO DO RABO — não pela nuvem. Ver `revealCasco` para o porquê da separação. */
  casco?: boolean;
```

- [ ] **Step 9: `tsc` e sonda**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `node scripts/probe-f3-visual.mjs`
Expected: os asserts do Step 2 passam. ⚠️ **Os asserts do ATO 2 (a partir de "a BASE do casco usa a arte nova") vão reprovar agora** — o `cascoReveal` nunca sobe de 0, porque ninguém o chama ainda. Isso é esperado e a Task 3 resolve. Anote quais reprovaram.

- [ ] **Step 10: Commit**

```bash
git add src/Parallax.ts scripts/probe-f3-visual.mjs
git commit -m "fix(fase3): o casco para de aparecer no meio do Ato 1

O alpha do casco era 1 - nebulaDim: afinar a nuvem em t=21 OBRIGAVA a
estrutura a subir a 0,25, e nao havia como ter um sem o outro. Jogado,
isso e o gradiente de transparencia estranho que o Henrique viu 20s
antes de o casco ter motivo.

Agora o casco tem o cascoReveal dele, e quem o chama e o mergulho do
rabo. A nuvem continua afinando sozinha.

A sonda inverte o assert que exigia o contrario: o teste jogado vence o
documento."
```

---

## Task 2: O rabo colossal

**Files:**
- Create: `scripts/_medir-rabo.mjs`
- Modify: `src/scenes/GameScene.ts` (dentro de `raboDoLeviata()`, o `setScale` e os ângulos da batida)
- Modify: `scripts/probe-f3-visual.mjs` (o bloco de asserts do rabo)

**Interfaces:**
- Consumes: nada da Task 1.
- Produces: o sprite `raboLeviata` em escala 3,4 com arco ±6°. A Task 3 mexe no mergulho do mesmo sprite.

- [ ] **Step 1: Escrever a régua**

Create `scripts/_medir-rabo.mjs`:

```js
// Mede a arte do rabo do Leviatã e imprime o que a escala faz com ela na tela.
//
// Existe porque "colossal" virou um número de duas mãos: a sessão de 26/08 travou em 2,4 pela
// regra "o arco inteiro tem que caber", e o teste jogado derrubou a regra (agora ele DEVE
// sangrar). Sem régua, a escala nova é chute — e foi chute ampliado que aprovou um míssil que
// no tamanho do jogo era uma lasca vazia.
import sharp from 'sharp';

const GAME_W = 384;
const GAME_H = 216;
const ORIGIN_X = 0.92;
const X = 368;
const Y = 104;

const img = sharp('public/sprites/rabo-leviata.png');
const { width, height } = await img.metadata();
const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });

// Perfil por coluna: quantos pixels opacos, e onde eles começam/terminam.
const alturaDaColuna = [];
for (let x = 0; x < info.width; x++) {
  let n = 0;
  for (let y = 0; y < info.height; y++) {
    if (data[(y * info.width + x) * info.channels + 3] > 24) n++;
  }
  alturaDaColuna.push(n);
}

const maisAlta = Math.max(...alturaDaColuna);
// A NADADEIRA é a metade alta (o leque); o TOCO é onde o perfil afina para o corpo.
const limite = maisAlta * 0.55;
let fimDaNadadeira = 0;
for (let x = 0; x < alturaDaColuna.length; x++) {
  if (alturaDaColuna[x] >= limite) fimDaNadadeira = x;
}

console.log(`arte              ${width}x${height}`);
console.log(`coluna mais alta  ${maisAlta}px`);
console.log(`fim da nadadeira  x=${fimDaNadadeira} (${((fimDaNadadeira / width) * 100).toFixed(0)}% da largura)`);
console.log(`o TOCO ocupa      x=${fimDaNadadeira}..${width} (${width - fimDaNadadeira}px de arte)`);
console.log('');

for (const escala of [2.4, 3.0, 3.4, 3.8]) {
  const w = width * escala;
  const h = height * escala;
  const esq = X - ORIGIN_X * w;
  const dir = X + (1 - ORIGIN_X) * w;
  const topo = Y - h / 2;
  const base = Y + h / 2;
  // A ponta da nadadeira, medida do pivô: é ela que limita o arco.
  const braco = ORIGIN_X * w;
  const varre = (a) => 2 * braco * Math.sin((a * Math.PI) / 180);
  console.log(
    `escala ${escala}  tela ${w.toFixed(0)}x${h.toFixed(0)}  ` +
      `x ${esq.toFixed(0)}..${dir.toFixed(0)}  y ${topo.toFixed(0)}..${base.toFixed(0)}  ` +
      `sangra ${topo < 0 ? `${(-topo).toFixed(0)}px topo` : 'NAO'} / ` +
      `${base > GAME_H ? `${(base - GAME_H).toFixed(0)}px base` : 'NAO'}  ` +
      `braco ${braco.toFixed(0)}px  varredura ±6°=${varre(6).toFixed(0)}px ±8°=${varre(8).toFixed(0)}px`,
  );
}

// O MERGULHO é uma ROTAÇÃO em torno do pedúnculo (ver GameScene.raboDoLeviata): girar
// positivo manda a nadadeira para baixo e deixa o TOCO praticamente no lugar.
console.log('');
const braco34 = ORIGIN_X * width * 3.4;
for (const a of [26, 32, 38, 44]) {
  const queda = braco34 * Math.sin((a * Math.PI) / 180);
  const recuo = braco34 * (1 - Math.cos((a * Math.PI) / 180));
  console.log(
    `mergulho ${a}°  a nadadeira cai ${queda.toFixed(0)}px e recua ${recuo.toFixed(0)}px  ` +
      `(pivô em y=200 -> nadadeira em y=${(200 + queda).toFixed(0)}, tela tem ${GAME_H})`,
  );
}
```

- [ ] **Step 2: Rodar a régua**

Run: `node scripts/_medir-rabo.mjs`
Expected: a arte é `107x73`; em escala 3,4 a tela é ~`364x248`, sangra ~20px no topo e ~12px na base, braço ~335px, varredura ±6° ≈ 70px e ±8° ≈ 93px. **Confirmar antes de seguir.** Se a arte não for 107×73, recalcular a escala para que a altura em tela fique entre 240 e 255px.

- [ ] **Step 3: Trocar os asserts do rabo na sonda**

Em `scripts/probe-f3-visual.mjs`, no `page.evaluate` do `naVirada`, acrescentar as duas bordas ao objeto devolvido (logo depois de `alturaTela`):

```js
    alturaTela: Math.round(r.displayHeight),
    topo: Math.round(r.y - r.displayHeight / 2),
    base: Math.round(r.y + r.displayHeight / 2),
```

E trocar o assert do "COLOSSAL" (hoje `alturaTela > 150`) por:

```js
// ⚠️ O CRITÉRIO DE "COLOSSAL" MUDOU, E MUDOU PARA MAIS EXIGENTE (2026-08-27).
//
// A versão anterior pedia `alturaTela > 150` e o comentário do código dizia que 2,4 era o teto
// "porque o arco inteiro tem que caber na tela". O Henrique jogou e derrubou a regra: ele QUER
// que o rabo saia do frame — é assim que a coisa lê como grande demais para o quadro.
//
// Então o assert deixa de medir "cabe" e passa a medir "NÃO cabe". Não é afrouxar: é a mesma
// pergunta com a resposta invertida, e ela reprova tanto o pequeno demais quanto o que voltou
// a caber por acidente.
ok(
  naVirada.alturaTela > 240,
  `e é COLOSSAL: ${naVirada.alturaTela}px de altura numa tela de 216 (escala ${naVirada.escala})`,
);
ok(
  naVirada.topo < 0 && naVirada.base > 216,
  `SANGRANDO do quadro em cima E embaixo (y ${naVirada.topo}..${naVirada.base}, tela 0..216)`,
);
```

- [ ] **Step 4: Rodar a sonda e ver reprovar**

Run: `node scripts/probe-f3-visual.mjs`
Expected: FALHA em `é COLOSSAL: 175px` e em `SANGRANDO do quadro` (a escala ainda é 2,4).

- [ ] **Step 5: Subir a escala e baixar o arco**

Em `src/scenes/GameScene.ts`, dentro de `raboDoLeviata()`, trocar `.setScale(2.4)` por `.setScale(3.4)`, e substituir o bloco de comentário da escala (o que hoje começa em `// ⚠️ ESCALA 2,4 — COLOSSAL, MAS AINDA VISÍVEL POR INTEIRO`) por:

```ts
    // ⚠️ ESCALA 3,4 — COLOSSAL PORQUE NÃO CABE. A arte é 107×73 e vira 364×248 numa tela de
    // 384×216: ela sangra ~20px pelo topo e ~12px pelo rodapé.
    //
    // ⚠️ A REGRA ANTERIOR ERA A OPOSTA, E FOI DERRUBADA JOGANDO (2026-08-27). A sessão de 26/08
    // travou em 2,4 com a justificativa "é o maior tamanho em que o ARCO INTEIRO da batida
    // ainda cabe na tela" — e a regra existia porque sair do quadro era tratado como defeito.
    // O Henrique jogou e pediu o contrário: "precisa ser maior, talvez fazer com que ele saia
    // do frame da tela, para dar a impressão de colossal". Sem o teto, a escala sobe.
    //
    // 3,0 é o degrau abaixo, se um dia 3,4 ficar opressivo — a coreografia não muda com ele.
    // A régua é `scripts/_medir-rabo.mjs`.
```

E no bloco da batida, trocar `rabo.setAngle(-8)` por `rabo.setAngle(-6)`, `{ angle: 8, ... }` por `{ angle: 6, ... }` e os dois `{ angle: -8, ... }` por `{ angle: -6, ... }`. Substituir o parágrafo `// ±8°: com a ponta a 236px do pivô...` por:

```ts
    //    ⚠️ ±6°, E O ÂNGULO CAIU PARA O MOVIMENTO NÃO MUDAR. Com a escala em 3,4 a ponta da
    //    nadadeira passou a ficar a ~335px do pedúnculo, contra 236 antes — a mesma alavanca
    //    ficou mais longa. ±8° agora varreria 93px e a batida viraria outra coisa; ±6° varre
    //    ~70px, que é praticamente a varredura que o Henrique aprovou (~66px). Reduzir o ângulo
    //    aqui é o que PRESERVA a remada, não o que a enfraquece.
```

- [ ] **Step 6: `tsc` e sonda**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `node scripts/probe-f3-visual.mjs`
Expected: `é COLOSSAL: 248px` e `SANGRANDO do quadro em cima E embaixo` passam. Os asserts do Ato 2 seguem reprovando (Task 3).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/GameScene.ts scripts/probe-f3-visual.mjs scripts/_medir-rabo.mjs
git commit -m "feat(fase3): o rabo cresce ate nao caber no quadro

Escala 2,4 -> 3,4: 364x248 numa tela de 384x216, sangrando 20px pelo topo
e 12px pelo rodape. A regra antiga era o oposto (o arco inteiro tem que
caber) e o teste jogado a derrubou: sair do frame E a leitura de colossal.

O arco cai de +-8 para +-6 porque a alavanca cresceu de 236 para 335px.
Varredura ~70px contra os ~66 de antes: o angulo diminui para a remada
ficar igual.

A sonda troca cabe por NAO cabe, e a regua nova mede os dois."
```

---

## Task 3: O toco vira a costura

A peça central. O mergulho deixa de ser translação e vira **rotação em torno do pedúnculo** — é isso que manda a nadadeira para fora do rodapé deixando o toco no lugar.

**Files:**
- Modify: `src/scenes/GameScene.ts` (o bloco `// 3. O MERGULHO` de `raboDoLeviata()`)
- Modify: `src/systems/StageDirector.ts:240-243` (horários no `STAGE_3`)
- Modify: `scripts/probe-f3-visual.mjs` (horários da espera + asserts do toco e do casco)

**Interfaces:**
- Consumes: `Parallax.revealCasco(alvo, durationMs)` da Task 1; o sprite em escala 3,4 da Task 2.
- Produces: o casco em `cascoReveal = 1` a partir de `t≈48`. A Task 4 conta com o casco sólido quando os props começam.

**A coreografia, em números:**

| t | o quê |
|---|---|
| 37,5 | `hazard rate 0` — o quadro esvazia |
| 38,0 | o rabo entra (`x = GAME_WIDTH + 200` → `368`, 2,5s) |
| 38–45 | a batida, em laço |
| 42,0 | `nebula density 0` — a nuvem abre. **O casco continua em 0** |
| 45,0 | a última remada: `angle −6 → 38`, `y 104 → 200` (1,5s) |
| 46,5 | a nadadeira limpou o rodapé. **`revealCasco(1, 1500)`** |
| 47,3 | o toco afunda: `y 200 → 330`, `alpha → 0` (1,7s) |
| 48,0 | o casco está sólido |
| 48,5 | banner `O CASCO DO LEVIATÃ` |
| 49,0 | o rabo é destruído |

- [ ] **Step 1: Asserts do toco e do casco na sonda**

Em `scripts/probe-f3-visual.mjs`, trocar a espera do rabo (hoje `while ((await estado()).t < 41.5)`) por `t < 39.5`, e ajustar o comentário do bloco (hoje diz "Ele entra em t=40,5") para "Ele entra em t=38 — ANTES da nuvem abrir em t=42".

Depois do bloco de asserts do rabo e antes do `// O ATO 2:`, acrescentar:

```js
// ─── O TOCO: a nadadeira sai pelo rodapé e o casco NASCE dali ───
//
// ⚠️ ESTE É O ASSERT DA COSTURA, e ele existe porque a versão anterior fazia um CORTE. O
// mergulho é uma ROTAÇÃO em torno do pedúnculo: a nadadeira desce 206px e sai da tela, e o
// toco — que está no pivô — praticamente não sai do lugar. Depois dele, e só depois, o casco
// começa. Se este assert reprovar com o casco já em 1, alguém religou o casco ao relógio do
// roteiro e a costura virou corte de novo.
while ((await estado()).t < 47) {
  await page.waitForTimeout(400);
  await respirar();
}
const noToco = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const r = s.children.list.find((o) => o.texture && o.texture.key === 'raboLeviata');
  return {
    t: Number((s.elapsed ?? 0).toFixed(1)),
    cascoReveal: Number(s.parallax.cascoReveal.toFixed(2)),
    n: r ? 1 : 0,
    angulo: r ? Number(r.angle.toFixed(1)) : null,
    y: r ? Math.round(r.y) : null,
    depth: r ? r.depth : null,
  };
});
console.log('toco    ' + JSON.stringify(noToco));
ok(noToco.n === 1, `o TOCO ainda está em cena em t=${noToco.t}`);
ok(noToco.angulo !== null && noToco.angulo > 20, `e ele GIROU para baixo (${noToco.angulo}°) — a nadadeira saiu pelo rodapé`);
ok(noToco.depth === -76, `atrás da faixa do casco (depth ${noToco.depth}) — ele afunda POR BAIXO do chão novo`);
ok(noToco.cascoReveal > 0, `e o casco JÁ COMEÇOU a nascer dele (cascoReveal=${noToco.cascoReveal})`);
await page.screenshot({ path: 'scripts/_f3/probe-toco.png' });
```

E no bloco do Ato 2 que já existe, logo depois do `const casco2 = ...`, acrescentar:

```js
ok(ato2.cascoReveal === 1, `o casco está INTEIRO no Ato 2 (cascoReveal=${ato2.cascoReveal})`);
ok(!ato2.camadas.some((c) => c.key === 'raboLeviata'), 'e o rabo já foi embora');
```

- [ ] **Step 2: Rodar a sonda e ver reprovar**

Run: `node scripts/probe-f3-visual.mjs`
Expected: FALHA em `ele GIROU para baixo` (o mergulho ainda é translação, o ângulo fica em ±6) e em `o casco JÁ COMEÇOU a nascer dele` (`cascoReveal` segue 0).

- [ ] **Step 3: Reescrever o mergulho**

Em `src/scenes/GameScene.ts`, substituir todo o bloco `// 3. O MERGULHO ...` (os dois `this.tweens.add` finais de `raboDoLeviata()`) por:

```ts
    // 3. O MERGULHO, EM DUAS ETAPAS — e é a PRIMEIRA que faz a transição.
    //
    // ⚠️ A DESCIDA É UMA ROTAÇÃO, NÃO UMA TRANSLAÇÃO, E É ISSO QUE DEIXA O TOCO. O pivô é o
    // pedúnculo (origem 0.92), lá na borda direita. Girar para +38° manda a NADADEIRA — que
    // está a ~335px do pivô — 206px para baixo, para fora do rodapé, enquanto o TOCO, que está
    // EM CIMA do pivô, praticamente não sai do lugar. Uma translação levaria a peça inteira
    // junto e não sobraria toco nenhum para o casco nascer.
    //
    // É o pedido do Henrique ao pé da letra: "sai por baixo, deixando apenas o toco da cauda...
    // quando a cauda abaixa para a parte de baixo da tela, o casco se inicia".
    //
    // E é a MESMA remada da batida, terminada. Ele afunda porque DEU a remada, não apesar dela.
    //
    // O `y` desce junto (104 → 200) só para plantar o toco na quina de baixo, que é de onde o
    // chão novo vai crescer.
    this.tweens.add({
      targets: rabo,
      angle: 38,
      y: 200,
      delay: 7000,
      duration: 1500,
      ease: 'Sine.easeIn',
      onStart: () => {
        // A batida para: um rabo que continua remando enquanto afunda lê como peça solta caindo.
        batida.stop();
        // ATRÁS da faixa do casco (−75/−74), para o toco afundar POR BAIXO do chão novo em vez
        // de escorregar na frente dele.
        rabo.setDepth(-76);
      },
      // ⚠️ O CASCO NASCE AQUI, E NÃO NO ROTEIRO. Este é o instante em que a nadadeira limpou o
      // rodapé — o único instante em que o casco pode começar sem que a emenda vire corte. Uma
      // linha no `STAGE_3` derivaria deste tween na primeira vez que alguém mexesse na duração.
      onComplete: () => this.parallax.revealCasco(1, 1500),
    });

    // 4. O TOCO AFUNDA (1,7s a partir dos 9,3s), por trás do casco que já está se formando. Ele
    //    segura 800ms parado depois da remada: é o tempo de o jogador ler que o chão novo
    //    COMEÇA ali. Sem essa pausa a costura passa rápido demais para ser vista.
    this.tweens.add({
      targets: rabo,
      y: 330,
      alpha: 0,
      delay: 9300,
      duration: 1700,
      ease: 'Sine.easeIn',
      onComplete: () => rabo.destroy(),
    });
```

- [ ] **Step 4: Mover os horários no roteiro**

Em `src/systems/StageDirector.ts`, substituir as quatro linhas do bloco da virada (hoje `t: 40`, `t: 40.5`, `t: 42`, `t: 44`) por:

```ts
  { t: 37.5, type: 'hazard', rate: 0, mix: [] },
  { t: 38, type: 'rabo' },
  { t: 42, type: 'nebula', density: 0 },
  { t: 48.5, type: 'banner', text: 'O CASCO DO LEVIATÃ' },
```

E acrescentar ao comentário do bloco (logo antes deles):

```ts
  // ⚠️ O RABO ANDOU PARA TRÁS: 40,5 → 38 (2026-08-27). A coreografia nova — a remada final que
  // manda a nadadeira para fora do rodapé, o toco segurando, e o casco nascendo dele — precisa
  // de ~2,5s a mais de pista. Puxar o rabo é mais barato do que empurrar o Ato 2 inteiro.
  //
  // O `hazard rate 0` andou junto (40 → 37,5) porque ele NÃO é do Ato 2: é a preparação do
  // rabo. Esvaziar o quadro é o que faz a chegada pesar, e tem que acontecer antes dela.
  //
  // ⚠️ O BANNER ANDOU PARA A FRENTE: 44 → 48,5. Ele anunciava um casco que só existe em t=48 —
  // legenda antes da imagem. Agora ele chega quando há o que ver.
  //
  // ⚠️ A "INSINUAÇÃO" DE t=21 NÃO REVELA MAIS O CASCO, e isso é deliberado. O `density 0.75`
  // continua lá afinando a nuvem, mas o casco não está mais amarrado a ele (ver
  // `Parallax.cascoReveal`). O HANDOFF pedia a insinuação desde sempre; ela foi implementada em
  // 26/08, foi JOGADA, e o Henrique reprovou. O teste jogado vence o documento.
```

- [ ] **Step 5: `tsc` e sonda**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `node scripts/probe-f3-visual.mjs`
Expected: **26+ asserts, todos verdes**, incluindo os do toco e os do Ato 2 que estavam reprovando desde a Task 1.

- [ ] **Step 6: Olhar as fotos**

Abrir `scripts/_f3/probe-rabo.png` e `scripts/_f3/probe-toco.png`. Confirmar: na primeira o rabo sangra do quadro em cima e embaixo; na segunda só o toco está no canto de baixo-direita e o casco já se vê nascendo. **Se a nadadeira ainda aparecer na foto do toco, o ângulo do mergulho é baixo demais** — subir de 38° para 44° (a régua do Step 2 da Task 2 dá a queda de cada ângulo).

- [ ] **Step 7: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/StageDirector.ts scripts/probe-f3-visual.mjs
git commit -m "feat(fase3): o toco da cauda vira a costura do casco

O mergulho deixa de ser translacao e vira ROTACAO em torno do pedunculo.
Girar +38 manda a nadadeira 206px para baixo, para fora do rodape,
enquanto o toco — que esta em cima do pivo — fica. E dele que o casco
comeca, e por isso a emenda deixa de ser corte.

Quem chama o revealCasco e o fim do tween da remada, nao uma linha do
roteiro: o instante certo e o em que a nadadeira limpa o rodape, e um
horario fixo derivaria dele no primeiro ajuste de duracao.

O rabo anda de 40,5 para 38 e o hazard de 40 para 37,5 (ele e preparacao
do rabo, nao do Ato 2). O banner anda de 44 para 48,5: ele anunciava um
casco que so existe em 48."
```

---

## Task 4: Os respiradouros raros

Um prop a cada 1,6s com 75% de respiradouro dá **um espiráculo a cada ~2,1s**, ~12,7 na fase. Uma baleia tem um.

**Files:**
- Modify: `src/scenes/GameScene.ts` (constante nova, campo novo, `spawnProps()`, e os três pontos de reset)
- Modify: `src/systems/StageDirector.ts:254` e `:265` (as duas linhas de `terrain`)
- Modify: `scripts/probe-f3-visual.mjs` (assert de contagem ao longo do tempo)

**Interfaces:**
- Consumes: o casco sólido em `t=48` da Task 3.
- Produces: nada para tasks seguintes.

- [ ] **Step 1: Assert de espaçamento na sonda**

Em `scripts/probe-f3-visual.mjs`, antes do bloco do rodapé (o `// ─── O RODAPÉ`), acrescentar:

```js
// ─── OS RESPIRADOUROS SÃO RAROS, E O ESPAÇAMENTO NÃO DEPENDE DE SORTE ───
//
// ⚠️ ISTO CONTA AO LONGO DO TEMPO, NÃO NUMA AMOSTRA. É a lição do assert do rodapé, paga nesta
// mesma fatia: um assert que olha um instante só mede o instante, não a regra. Aqui a regra é
// "nenhum par a menos de 6,4s", e ela só existe no tempo.
//
// O trinco é uma CARÊNCIA no spawn, não uma proporção no sorteio: `GetRandom` é uniforme e pode
// dar dois seguidos por acaso. É a mesma lição do `pickVariant` — proporção que importa vem da
// geometria, nunca do dado.
const vistos = new Set();
const nascimentos = [];
const ateT = 82;
while ((await estado()).t < ateT) {
  const amostra = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const t = Number((s.elapsed ?? 0).toFixed(2));
    return {
      t,
      props: s.terrain.group.getChildren()
        .filter((o) => o.active && o.getData && o.getData('kind') === 'respiradouro')
        .map((o) => o.name || `${Math.round(o.x)}:${Math.round(o.y)}`),
    };
  });
  for (const id of amostra.props) {
    if (!vistos.has(id)) {
      vistos.add(id);
      nascimentos.push(amostra.t);
    }
  }
  await page.waitForTimeout(250);
  await respirar();
}
const pares = nascimentos.slice(1).map((t, i) => Number((t - nascimentos[i]).toFixed(2)));
console.log('respiradouros nasceram em ' + JSON.stringify(nascimentos));
console.log('intervalos ' + JSON.stringify(pares));
ok(
  nascimentos.length <= 6,
  `POUCOS respiradouros no Ato 2 (${nascimentos.length} — eram ~13 antes da carência)`,
);
ok(
  pares.every((d) => d >= 5),
  `e BEM ESPAÇADOS: nenhum par a menos de 5s (o menor foi ${pares.length ? Math.min(...pares) : 'n/a'}s)`,
);
```

⚠️ Se `s.terrain.group` não for o nome do grupo em `TerrainSystem`, ajustar para o campo real — conferir com `grep -n "this.group\|private group" src/systems/TerrainSystem.ts` antes de rodar.

- [ ] **Step 2: Rodar a sonda e ver reprovar**

Run: `node scripts/probe-f3-visual.mjs`
Expected: FALHA em `POUCOS respiradouros no Ato 2` (vai contar ~12) e provavelmente em `BEM ESPAÇADOS`.

- [ ] **Step 3: A carência**

Em `src/scenes/GameScene.ts`, junto das outras constantes do topo do arquivo:

```ts
/**
 * A CARÊNCIA DO RESPIRADOURO (Fase 3), em segundos.
 *
 * ⚠️ ESTE É O BOTÃO, e a mistura NÃO É. Cortar respiradouro mexendo na mistura mexeria também
 * na proporção de quem ATIRA (o lança-mísseis divide o mesmo sorteio), e o volume de tiro do
 * Ato 2 está congelado até o playtest por decisão do Henrique. Quem regula quantos espiráculos
 * se vê é este número: 5 → ~3 na fase; 3 → ~4; 8 → ~2.
 */
const RESPIRADOURO_CARENCIA = 5;
```

E o campo, junto de `propTimer`:

```ts
  /** Segundos desde o último RESPIRADOURO que NASCEU. Ver `RESPIRADOURO_CARENCIA`. */
  private respiradouroTimer = RESPIRADOURO_CARENCIA;
```

- [ ] **Step 4: Aplicar a carência no spawn**

Em `src/scenes/GameScene.ts`, substituir `spawnProps` inteiro por:

```ts
  private spawnProps(dt: number): void {
    // ⚠️ O RELÓGIO DA CARÊNCIA CORRE SEMPRE, inclusive nas janelas em que `propRate` é 0. Aquilo
    // é casco liso passando na tela, e casco liso É espaçamento — não contá-lo faria o primeiro
    // prop depois do respiro da aranha nascer bloqueado sem motivo.
    this.respiradouroTimer += dt;

    if (this.propRate <= 0 || this.propMix.length === 0) return;

    this.propTimer -= dt;
    if (this.propTimer > 0) return;

    this.propTimer = this.propRate;

    const escolhido = Phaser.Utils.Array.GetRandom(this.propMix);

    // ⚠️ A CARÊNCIA DO RESPIRADOURO, E POR QUE A VAGA MORRE EM VEZ DE SER SUBSTITUÍDA.
    //
    // Uma baleia tem UM espiráculo. Doze deles ao longo do Ato 2 (o que a mistura antiga dava)
    // lia como tileset, não como anatomia — o Henrique jogou e pediu "bemmm espaçados, aparecer
    // poucas vezes".
    //
    // Substituir por lança-mísseis manteria a densidade e DOBRARIA os atiradores. O slot morre,
    // e é justamente isso que preserva o volume de tiro: o lança continua sorteando os 50% dele
    // sobre o mesmo número de slots. Casco liso é o que "bem espaçado" significa.
    if (escolhido === 'respiradouro') {
      if (this.respiradouroTimer < RESPIRADOURO_CARENCIA) return;
      this.respiradouroTimer = 0;
    }

    this.terrain.spawn(escolhido);
  }
```

- [ ] **Step 5: Zerar o relógio junto com a fase**

Em `src/scenes/GameScene.ts`, nos três pontos que já resetam `propTimer` (perto das linhas 157-159, 388 e 752), acrescentar ao lado de cada um:

```ts
    this.respiradouroTimer = RESPIRADOURO_CARENCIA;
```

⚠️ **`RESPIRADOURO_CARENCIA`, não `0`.** A fase tem que começar PRONTA para o primeiro espiráculo — começando em 0 o primeiro slot nasceria bloqueado e o Ato 2 abriria com um buraco que ninguém pediu.

- [ ] **Step 6: Intervalo e mistura no roteiro**

Em `src/systems/StageDirector.ts`, trocar as duas linhas de `terrain` do Ato 2:

```ts
  { t: 48, type: 'terrain', rate: 3.0, mix: ['respiradouro', 'lancaMisseis'] },
```

```ts
  { t: 63, type: 'terrain', rate: 3.0, mix: ['respiradouro', 'lancaMisseis'] },
```

E substituir o parágrafo `// ⚠️ A PROPORÇÃO DE QUEM ATIRA É A MESMA: 1 em 4 ...` por:

```ts
  // ⚠️ A PROPORÇÃO DE QUEM ATIRA CONTINUA A MESMA — E É POR ISSO QUE OS DOIS NÚMEROS MUDARAM
  // JUNTOS (2026-08-27). A cadência caiu pela metade (1,6s → 3,0s) e a mistura dobrou a favor do
  // lança (1:3 → 1:1). Os dois se cancelam exatamente na conta de quem atira:
  //
  //   antes   27s de janela / 1,6s × 0,25 = 4,22 lança-mísseis
  //   depois  25s de janela / 3,0s × 0,50 = 4,17 lança-mísseis
  //
  // (A janela encolheu porque os props começam em t=48, quando o casco fica sólido, e não mais
  // em t=46. O 3,0 em vez do 3,2 da spec é o que compensa esses 2 segundos.)
  //
  // O respiradouro cai de ~12,7 para ~3 — e quem garante o ESPAÇAMENTO é a carência no
  // `GameScene.spawnProps`, não esta mistura. Sorteio uniforme pode dar dois seguidos.
```

- [ ] **Step 7: `tsc` e sonda**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `node scripts/probe-f3-visual.mjs`
Expected: tudo verde, incluindo `POUCOS respiradouros no Ato 2 (3 ...)` e `BEM ESPAÇADOS`.

- [ ] **Step 8: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/StageDirector.ts scripts/probe-f3-visual.mjs
git commit -m "feat(fase3): o respiradouro vira anatomia, nao papel de parede

Um prop a cada 1,6s com 75% de respiradouro dava um espiraculo a cada
2,1s — ~13 na fase. Uma baleia tem um.

A cadencia cai pela metade e a mistura dobra a favor do lanca-misseis:
os dois se cancelam na conta de quem atira (4,22 -> 4,17), entao o
volume de tiro do Ato 2 continua congelado como combinado.

O espacamento nao vem do sorteio, que e uniforme e pode dar dois
seguidos: vem de uma carencia de 5s no spawn. A vaga bloqueada MORRE em
vez de virar lanca-misseis — substituir dobraria os atiradores."
```

---

## Task 5: A água-viva elétrica

**Files:**
- Create: `public/sprites/agua-viva.png` + `public/sprites/agua-viva-anim-{0..N}.png`
- Modify: `src/scenes/BootScene.ts` (`FRAMES`, `ANIMS`, `TEX`)
- Modify: `src/systems/EnemySystem.ts` (`EnemyKind`, `DEFS`, o pulso em `spawn`)
- Modify: `src/systems/StageDirector.ts` (duas ondas no Ato 1 do `STAGE_3`)
- Modify: `scripts/probe-f3-visual.mjs` (asserts da água-viva)

**Interfaces:**
- Consumes: nada.
- Produces: `EnemyKind` ganha `'aguaViva'`. Nenhuma outra task depende disso.

- [ ] **Step 1: Pedir a animação (FAZER PRIMEIRO, antes da Task 1)**

Chamar o MCP do PixelLab:

```
animate_object(
  object_id: "3b886d72-e956-4c9d-a235-a46384ed6043",
  directions: ["west"],
  animation_description: "the bell contracts and expands as it swims, long tentacles trailing behind and swaying",
  display_name: "drift",
  mode: "v3",
  frame_count: 8
)
```

⚠️ **`west` E SÓ `west`.** Ela deriva para a esquerda, na direção do jogador; um shmup de rolagem lateral não usa as outras sete direções, e cada uma custa um job.

⚠️ **NÃO PEDIR O PULSO ELÉTRICO AQUI.** "Pulsa com eletricidade" é movimento que cabe numa frase de geometria, e o v3 já leu *"bater para cima e para baixo"* como **girar** nesta mesma fatia — a animação do rabo virou hélice e foi descartada inteira. O pulso é código (Step 6). Aos quadros vai só o que código não faz: a deformação do sino e o arrasto dos tentáculos.

- [ ] **Step 2: Esperar e conferir os quadros**

Run: `mcp__pixellab__get_object(object_id: "3b886d72-e956-4c9d-a235-a46384ed6043")`
Expected: a animação aparece em `animations:` com uma URL base e a contagem de quadros.

⚠️ **OLHAR OS QUADROS ANTES DE INSTALAR.** Se o sino estiver GIRANDO em vez de contraindo, descartar e refazer com a descrição mais geométrica (`"the bell squeezes narrower then opens wider, tentacles following"`). Não instalar animação que gira.

- [ ] **Step 3: Instalar**

Run: `node scripts/install-anim.mjs agua-viva <url-base-dos-quadros> <n-quadros> agua-viva`
Expected: `public/sprites/agua-viva-anim-{0..N}.png` e `public/sprites/agua-viva.png`, todos recortados pela mesma caixa união.

- [ ] **Step 4: Medir no tamanho real do jogo**

Run: `node -e "import('sharp').then(async ({default:s})=>{const m=await s('public/sprites/agua-viva.png').metadata();console.log('arte',m.width+'x'+m.height);for(const e of [0.5,0.6,0.7,0.8,1.0])console.log('escala',e,'->',(m.width*e).toFixed(0)+'x'+(m.height*e).toFixed(0),'(kamikaze em tela: 26x24)')})"`
Expected: a arte é ~48×48 antes do recorte. **Escolher a escala que dê entre 26 e 34px de altura em tela** — ela é o bicho mais lento e mais visível do Ato 1, então pode ser um pouco maior que a tropa comum, mas não o dobro. Anotar o número escolhido para o Step 6.

⚠️ Esta medição existe porque foi assim que o míssil descartado se entregou nesta fatia: ampliado parecia bom, no tamanho do jogo era uma lasca de 20×18.

- [ ] **Step 5: Registrar a arte no `BootScene`**

Em `src/scenes/BootScene.ts`, três acréscimos. No `FRAMES` (junto das outras entradas da Fase 3):

```ts
  aguaVivaAnim: 8,
```

⚠️ **O número tem que bater com os quadros que o Step 3 gravou** — `install-anim.mjs` imprime a contagem. `registerAnims` só monta a animação se achar 2 ou mais, então errar para menos silencia a animação sem erro nenhum.

No `ANIMS`:

```ts
  // A água-viva do Ato 1 da Fase 3. LENTA de propósito: ela é a única coisa que fica no quadro
  // enquanto tudo o mais atravessa, e uma pulsação rápida a transformaria em mais uma nave.
  { key: 'aguaviva-drift', prefix: 'aguaVivaAnim', frameRate: 6 },
```

No `TEX`, junto do róster de inimigos:

```ts
  ...animFrames('aguaVivaAnim', 'agua-viva-anim'),
  aguaViva: 'sprites/agua-viva.png',
```

- [ ] **Step 6: O inimigo e o pulso**

Em `src/systems/EnemySystem.ts`, acrescentar a `EnemyKind`:

```ts
export type EnemyKind = 'drone' | 'batedor' | 'canhoneira' | 'kamikaze' | 'cargueiro' | 'aranha' | 'aguaViva';
```

E a entrada em `DEFS` (usar no `scale` o número medido no Step 4 — abaixo está 0,6 como ponto de partida):

```ts
  // A ÁGUA-VIVA (Fase 3, Ato 1). A única coisa LENTA da nebulosa.
  //
  // O Ato 1 é todo rápido — drone 70, batedor 95, kamikaze 45 com perseguição, mais asteroide,
  // mina e sensor. Não havia nada que FICASSE no quadro. Ela é isso: deriva a 28, atravessa em
  // ~13,7s, e o azul aceso dela é a única coisa que a névoa densa deixa ver de longe.
  //
  // ⚠️ NÃO ATIRA E NÃO PERSEGUE. Ela ATRAPALHA — é obstáculo vivo, não alvo. Isso é deliberado:
  // um projétil novo entraria no volume de tiro do Ato 1, e esse número está congelado até o
  // playtest.
  //
  // ⚠️ `hp 10` É O NÚMERO MAIS FRÁGIL DESTA PEÇA. A escala do jogo é 2 para drone/batedor/
  // kamikaze e 6 para a canhoneira; dez é 5× um drone, e é para ela não morrer de raspão. Se no
  // playtest ela virar pedágio em vez de estorvo, é este número que desce — não a velocidade,
  // que é a razão de ela existir.
  //
  // Tint BRANCO: a arte já nasce acesa, e multiplicar cor por cima apagaria justamente o brilho.
  aguaViva: { texture: 'aguaViva', anim: 'aguaviva-drift', hp: 10, speed: 28, wave: 34, fireRate: 0, score: 120, scale: 0.6, tint: 0xffffff, homing: 0, spawnRate: 0 },
```

E o pulso elétrico, no fim de `spawn()`, logo depois do `e.setData('spawnCd', ...)`:

```ts
    // ⚠️ O PULSO ELÉTRICO É CÓDIGO, E ISSO NÃO É PREGUIÇA — É A LIÇÃO DA HÉLICE.
    //
    // "Acende e apaga" cabe numa frase de geometria, e nesta mesma fatia o v3 do PixelLab leu
    // "bater para cima e para baixo" como GIRAR: a animação do rabo do Leviatã voltou com a
    // nadadeira rodando em torno do próprio eixo e foi descartada inteira. Pedir "pulsa com
    // eletricidade" aos quadros devolveria uma hélice azul. Aos quadros vai o que código não faz
    // (o sino deformando, os tentáculos arrastando); o brilho fica aqui.
    //
    // ⚠️ GLOW E NÃO TINT. O tint é do flash branco de dano (ver `damage`, que restaura o valor
    // guardado em `setData('tint')`) — um pulso escrevendo tint todo frame comeria o flash e o
    // jogador deixaria de ver que acertou.
    //
    // `preFX` é nulo no renderer Canvas. A guarda mantém o contrato de sempre: sem o recurso, a
    // cena continua — só sem brilho.
    if (kind === 'aguaViva' && e.preFX) {
      const glow = e.preFX.addGlow(0x6ad8ff, 0, 0, false, 0.08, 12);
      this.scene.tweens.add({
        targets: glow,
        outerStrength: 3.4,
        duration: 900,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
```

- [ ] **Step 7: As duas ondas no roteiro**

Em `src/systems/StageDirector.ts`, no `STAGE_3`, acrescentar depois da linha do `t: 5` e depois da do `t: 16`, respectivamente:

```ts
  // ─── A ÁGUA-VIVA: a vida da nebulosa, e o único ritmo lento do Ato 1 ───
  //
  // ⚠️ ELAS CAEM EM CIMA DAS ONDAS RÁPIDAS DE PROPÓSITO. Lento e rápido no mesmo quadro é o
  // contraste que justifica ela existir; sozinha numa janela vazia ela vira só um asteroide
  // bonito que brilha.
  //
  // ⚠️ O ÚLTIMO SPAWN TEM QUE LIMPAR A TELA ANTES DE t=38. A 28px/s ela leva ~13,7s para
  // atravessar, e o quadro precisa estar VAZIO quando o rabo entra — o vazio é o que faz a
  // chegada dele pesar (é para isso que o `hazard rate 0` existe em t=37,5). A onda de t=19 põe
  // o último no ar em t=23,2, que limpa em t≈36,9. NÃO empurrar estas ondas para depois de 24,3.
  { t: 8, type: 'wave', kind: 'aguaViva', count: 3, spacing: 1.6, y: 100 },
```

```ts
  { t: 19, type: 'wave', kind: 'aguaViva', count: 4, spacing: 1.4, y: 75 },
```

- [ ] **Step 8: Asserts na sonda**

Em `scripts/probe-f3-visual.mjs`, logo depois do primeiro bloco (o da pintura, antes do `// O CASCO`), acrescentar:

```js
// ─── A ÁGUA-VIVA: existe, deriva, e some antes do rabo ───
while ((await estado()).t < 22) {
  await page.waitForTimeout(800);
  await respirar();
}
const vivas = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const l = s.enemies.enemies.getChildren().filter((o) => o.active && o.getData('kind') === 'aguaViva');
  return { n: l.length, vx: l[0] ? Math.round(l[0].body.velocity.x) : null };
});
console.log('agua-viva ' + JSON.stringify(vivas));
ok(vivas.n > 0, `a ÁGUA-VIVA está no Ato 1 (achei ${vivas.n})`);
ok(vivas.vx !== null && vivas.vx > -40, `e ela DERIVA, não voa (vx=${vivas.vx}, o drone faz -70)`);

// ⚠️ O QUADRO TEM QUE ESTAR VAZIO QUANDO O RABO CHEGA. A 28px/s ela demora ~13,7s para
// atravessar — é o inimigo mais lento do jogo, e o único capaz de sobrar para dentro da virada.
while ((await estado()).t < 38) {
  await page.waitForTimeout(500);
  await respirar();
}
const naEntrada = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  return s.enemies.enemies.getChildren().filter((o) => o.active && o.getData('kind') === 'aguaViva').length;
});
ok(naEntrada === 0, `e ela LIMPOU a tela antes do rabo entrar (achei ${naEntrada} em t=38)`);
```

⚠️ Conferir o caminho `s.enemies.enemies` contra o campo real do `EnemySystem` (`grep -n "enemies" src/systems/EnemySystem.ts | head`) antes de rodar.

- [ ] **Step 9: `tsc`, build e sonda**

Run: `npx tsc --noEmit`
Expected: sem saída.

Run: `npm run build`
Expected: build limpo.

Run: `node scripts/probe-f3-visual.mjs`
Expected: tudo verde, incluindo os três asserts da água-viva.

- [ ] **Step 10: Commit**

```bash
git add public/sprites/agua-viva*.png src/scenes/BootScene.ts src/systems/EnemySystem.ts src/systems/StageDirector.ts scripts/probe-f3-visual.mjs
git commit -m "feat(fase3): a agua-viva eletrica, o unico ritmo lento do Ato 1

O Ato 1 era todo rapido — drone 70, batedor 95, kamikaze com perseguicao.
Nada FICAVA no quadro. Ela deriva a 28, atravessa em ~13,7s, e o azul
aceso dela e a unica coisa que a nevoa densa deixa ver de longe.

Nao atira e nao persegue: obstaculo vivo, nao alvo. Nenhum projetil novo
entra no volume de tiro do Ato 1.

O pulso eletrico e CODIGO (glow + tween), nao quadros gerados. Acende e
apaga cabe numa frase de geometria, e nesta mesma fatia o v3 leu bater
para cima e para baixo como girar. Aos quadros foi so o que codigo nao
faz: o sino deformando e os tentaculos arrastando.

Glow e nao tint porque o tint e do flash de dano."
```

---

## Task 6: Regressão e documentos

**Files:**
- Modify: `docs/HANDOFF.md` (a seção da Fatia 5)
- Modify: `docs/superpowers/plans/2026-08-25-fase3-visual-START.md` (a frase de arranque e o que testar)

- [ ] **Step 1: A regressão inteira, uma sonda por vez**

⚠️ **UMA POR VEZ.** Três browsers headless no mesmo Vite quebram a `probe-stage3` — ela já passou sozinha sem nenhuma mudança depois de reprovar em paralelo.

```bash
npx tsc --noEmit
npm run build
node scripts/probe-f3-visual.mjs
node scripts/probe-stage3.mjs
node scripts/probe-chain.mjs
node scripts/probe-cut2-visual.mjs
node scripts/probe-doca.mjs
```

Expected: todas verdes. **Se alguma reprovar, ela se confere antes de se afrouxar** — decidir primeiro se o assert mede a coisa certa.

- [ ] **Step 2: Registrar no `HANDOFF`**

Na seção da Fatia 5, acrescentar um bloco com: (a) o casco desacoplado da nuvem e **a reversão explícita do pedido antigo** *"na metade do tempo o Leviatã começa a aparecer"* — implementado, jogado, reprovado; (b) o rabo em 3,4 sangrando do quadro e a regra "colossal tem teto" derrubada pelo teste; (c) a rotação em torno do pedúnculo como o mecanismo do toco; (d) a carência do respiradouro e por que a vaga morre em vez de virar lança-mísseis; (e) a água-viva e a divisão quadros/código.

⚠️ **O item (a) é o mais importante do registro.** Sem ele, a próxima sessão relê o `HANDOFF`, acha que a insinuação foi esquecida, e a reimplementa.

- [ ] **Step 3: Atualizar o START**

Reescrever a frase de arranque e a tabela "o que testar" com os horários novos (rabo em 38, toco em 46,5, casco em 48, banner em 48,5) e as perguntas abertas desta rodada: a escala 3,4 é opressiva? o ângulo de mergulho deixa mesmo só o toco? ~3 respiradouros é pouco demais? a água-viva atrapalha ou vira pedágio?

- [ ] **Step 4: Commit**

```bash
git add docs/
git commit -m "docs(fase3): o que o primeiro teste jogado mudou, e o que ele reverteu

Registra a reversao da insinuacao do casco em t=21: o HANDOFF pedia desde
sempre, a sessao de 26/08 implementou, e o teste jogado reprovou. Sem
este registro a proxima sessao a reimplementa achando que foi esquecida.

E a regra colossal tem teto, que morreu pelo mesmo motivo."
```

---

## Pendências que este plano NÃO fecha

1. **A revisão ampla da branch** — a Task 3 da fatia nunca foi revisada, nem a sessão de 26/08, nem esta. **Antes do merge.**
2. **A decisão sobre `paintBgF2` / `paintBgZeroG`** — mesmo erro de resolução, em fases mergeadas.
3. **A luz quente entre segmentos do casco** — condicional, e se pedida vira tarefa própria.
