# Bloco I, etapa 1 — as explosões do jogo inteiro · Implementation Plan

> ✅ **EXECUTADO E APROVADO em 09/11** (Tasks 1–7), commitado e empurrado. O que mudou na execução: as folhas saíram em
> GRADE ≤ 4096 px (uma linha da grande teria ~11 000 px); a carne ganhou um estouro de matéria (começava vazia); o teste
> da física mede a fumaça em volta do estouro (o centroide vaga com o sorteio das bolhas); a cutscene 1, a pedido dele,
> ficou maior e sem as implosões (uma explosão grande e a Aurora afundando); as folhas antigas foram para
> `assets/raw/backup-explosoes/` e os retornos a elas saíram do código. O próximo: `plans/2026-11-09-bloco-i-etapa2-START.md`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar todas as explosões do jogo (pequena, média, grande, implosão) pelas quatro receitas aprovadas (A fogo e
fumaça · B plasma · C fumaça densa · D estilhaços), escolhidas pelo MATERIAL de quem explode, assadas em pixel.

**Architecture:** as receitas são funções puras idade → desenho sobre o pintor do pixelfx (que sai da enguia para
`src/fx/pixelfx/`). Um script ASSA cada tipo × zona × tamanho numa folha de cor + uma folha de luz (aditiva) e gera um
manifesto TS. O `Fx` carrega pelo manifesto e ganha o parâmetro `tipo`; os pontos de chamada passam o material.

**Tech Stack:** TypeScript + Phaser 3.90, Node 24 (scripts `.mjs`, `.ts` importado direto), sharp, ffmpeg, Playwright.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-11-09-bloco-i-explosoes-design.md` (§3 o desenho, §4b a distribuição).
- Fundo/arte em pixel: o jogo só REDUZ uma folha (escala ≤ 1), nunca amplia (`fundos-pintados-resolucao-nativa`).
- No vácuo nada sobe nem cai por peso; na atmosfera (só a F1) a fumaça sobe.
- Nada em vermelho de aviso puro (`r > 200 && g < 80`) nem branco-azulado (`b > r && lum > 0.8`), salvo o clarão branco
  do primeiro quadro.
- A enguia aprovada não muda: `node scripts/test-enguia-porte.mjs` segue verde.
- Durante uma filmagem não editar `src/` nem `.html` (o Vite recarrega).
- Commit e push só quando ele pedir, só no nome dele (sem Co-Authored-By); vídeos e quadros soltos fora.
- Editar com Edit/Write (sed/node -e falham em silêncio com CRLF e `${}`).

## Os arquivos

| arquivo | papel |
|---|---|
| `src/fx/pixelfx/` (movido de `src/entities/serpente/enguia/pixelfx/`) | o motor (MIT), comum ao jogo |
| `scripts/_i/explosoes/receitas.mjs` | as receitas puras: as partes (fogo, fumaça, cacos, plasma), as paletas, os 8 tipos |
| `scripts/_i/_explosoes-assar.mjs` | assa as folhas e escreve o manifesto |
| `public/sprites/explosoes/<tipo>-<zona>-<tam>.png` e `…-luz.png` | as folhas (cor; luz aditiva) |
| `src/systems/explosoes/folhasExplosao.ts` | GERADO: o manifesto (chave, célula, quadros, fps) + `escolheFolha` puro |
| `src/systems/explosoes/tipoExplosao.ts` | `TipoExplosao`, `tipoDoMaterial` (puro) |
| `src/systems/Fx.ts` | `explode`/`explodeBig`/`implodeBig` com `tipo`; `zona`; a luz em ADD |
| `src/scenes/BootScene.ts` | carrega pelo manifesto |
| `scripts/test-explosoes.mjs` | o teste |
| os pontos de chamada (Task 5 e 6) | passam o tipo |

---

### Task 1: o motor do pixelfx para `src/fx/pixelfx/`

**Files:**
- Move: `src/entities/serpente/enguia/pixelfx/` → `src/fx/pixelfx/` (`git mv`, com LICENSE, NOTICE.md, ORIGEM.txt)
- Modify: `src/entities/serpente/enguia/efeitos.ts:13-17`, `src/entities/serpente/enguia/alvos.ts:13`
- Modify: `scripts/_i/_explosoes-conceitos.mjs` (os dois imports)

**Interfaces:** Produces: `src/fx/pixelfx/core/index.js` (o mesmo de antes) e `src/fx/pixelfx/fx/fire/_lib.js`.

- [ ] **Step 1:** `git mv src/entities/serpente/enguia/pixelfx src/fx/pixelfx`
- [ ] **Step 2:** trocar `'./pixelfx/` por `'../../../fx/pixelfx/` nos imports de `efeitos.ts` (linhas 13–17) e `alvos.ts`
  (linha 13); no comentário de `efeitos.ts` linha 4, `./pixelfx/` → `src/fx/pixelfx/`.
- [ ] **Step 3:** no `_explosoes-conceitos.mjs`, `'../../src/entities/serpente/enguia/pixelfx/` → `'../../src/fx/pixelfx/`.
- [ ] **Step 4:** `npx tsc --noEmit` → limpo; `node scripts/test-enguia-porte.mjs` → todas as seções `ok`;
  `npm run build` → ok (o worker da enguia empacota o pixelfx do caminho novo).

### Task 2: as receitas puras

**Files:**
- Create: `scripts/_i/explosoes/receitas.mjs`
- Modify: `scripts/_i/_explosoes-conceitos.mjs` (passa a importar A, B, C, D e `fumacaDensa` das receitas)
- Create: `scripts/test-explosoes.mjs` (seção `receitas`)

**Interfaces:**
- Produces: `export const TIPOS = ['perigo','metal','chefeFim','luz','biomec','carne','rocha','carta','implosao']`;
  `export const TAMANHOS = { P: { R: 8, D: 0.55, cel: 60 }, M: { R: 15, D: 0.8, cel: 116 }, G: { R: 38, D: 1.2, cel: 264 } }`;
  `export function receita(tipo, zona) → (p, age, { R, D, seed }) => void` (zona `'vac' | 'atm'`);
  `export const ZONAS_DO_TIPO = { perigo: ['vac','atm'], metal: ['vac','atm'], chefeFim: ['vac','atm'], rocha: ['vac'], luz: ['vac'], biomec: ['vac'], carne: ['vac'], carta: ['vac'], implosao: ['vac'] }`.

- [ ] **Step 1: o teste que falha** — `scripts/test-explosoes.mjs`, seção `receitas`:

```js
import { createFrame, clearFrame, painterFor } from '../src/fx/pixelfx/core/index.js';
import { TIPOS, TAMANHOS, ZONAS_DO_TIPO, receita } from './_i/explosoes/receitas.mjs';
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const proibida = (c) => (c[0] > 200 && c[1] < 80) || (c[2] > c[0] && lum(c) > 0.8 && !(c[0] > 240 && c[1] > 240));
/** draws tipo/zona at age into a fresh frame; returns { color, light, w, h } */
function quadro(tipo, zona, tam, age, seed = 3) {
  const t = TAMANHOS[tam], f = createFrame(t.cel, t.cel);
  clearFrame(f);
  const p = painterFor(f); p.reset(); p.place(t.cel / 2, t.cel / 2);
  receita(tipo, zona)(p, age, { R: t.R, D: t.D, seed });
  return f;
}
const centroY = (f) => { let s = 0, n = 0; for (let i = 0; i < f.color.length; i++) if (f.color[i] >>> 24) { s += Math.floor(i / f.w); n++; } return n ? s / n : NaN; };
for (const tipo of TIPOS) for (const zona of ZONAS_DO_TIPO[tipo]) {
  const a = quadro(tipo, zona, 'M', 0.3), b = quadro(tipo, zona, 'M', 0.3);
  ok(a.color.some((v) => v) && a.color.every((v, i) => v === b.color[i]), `${tipo}/${zona}: desenha, e igual duas vezes`);
  let ruins = 0;
  for (const v of a.color) if (v >>> 24) { const c = [v & 255, (v >>> 8) & 255, (v >>> 16) & 255]; if (proibida(c)) ruins++; }
  ok(ruins === 0, `${tipo}/${zona}: nenhuma cor proibida (${ruins})`);
}
// the physics: in the vacuum the smoke does not rise; in the atmosphere it does
for (const tipo of ['perigo', 'chefeFim']) {
  const t = TAMANHOS.G, c0 = centroY(quadro(tipo, 'vac', 'G', t.D * 0.6)), c1 = centroY(quadro(tipo, 'vac', 'G', t.D * 1.2));
  const a0 = centroY(quadro(tipo, 'atm', 'G', t.D * 0.6)), a1 = centroY(quadro(tipo, 'atm', 'G', t.D * 1.2));
  ok(Math.abs(c1 - c0) < t.R * 0.15, `${tipo}: no vácuo a fumaça não sobe (${(c1 - c0).toFixed(1)} px)`);
  ok(a0 - a1 > t.R * 0.3, `${tipo}: na atmosfera ela sobe (${(a0 - a1).toFixed(1)} px)`);
}
// carne has no fire: no pixel of the hot ramp
{
  const f = quadro('carne', 'vac', 'M', 0.15);
  let quentes = 0;
  for (const v of f.color) if (v >>> 24) { const r = v & 255, g = (v >>> 8) & 255; if (r > 200 && g > 120) quentes++; }
  ok(quentes === 0, `carne: sem fogo (${quentes} px quentes)`);
}
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
```

- [ ] **Step 2:** `node scripts/test-explosoes.mjs` → FAIL (módulo `receitas.mjs` não existe).
- [ ] **Step 3: as receitas.** `receitas.mjs` recebe, movidos do `_explosoes-conceitos.mjs` sem mudar o desenho: as
  paletas (`FOGO`, `H`, `FAISCA`, `BRASA`, `FUMO`, `CASCO`), `ease`, `hash`, `fumacaDensa` e os corpos de A, B, C e D,
  repartidos em quatro PARTES com um objeto de opções `o = { R, D, seed, zona, pal, k }`:
  - `parteFogo(p, age, o)` — o clarão, o núcleo e as labaredas jogadas de A (`k.fogo` multiplica quantidade e tamanho;
    0 = sem fogo);
  - `parteFumaca(p, age, o)` — a fumaça de bolhas (os puffs de A ou de C conforme `k.fumaca` = `'leve' | 'densa'`),
    desenhada SEMPRE primeiro; na atmosfera cada puff sobe `sobe(u) = R * 1.1 * u * u` (u = idade relativa do puff) e
    a fumaça inteira sobe `R * 0.4 * (age / D)`; no vácuo, zero;
  - `parteCacos(p, age, o)` — os estilhaços de D com os rastros (que entram na fumaça) em `pal.cacos`;
  - `partePlasma(p, age, o)` — a casca, o núcleo, os arcos e as brasas de B.

  As paletas por material: `pal.metal = { fumo: FUMO, cacos: CASCO, fogo: H }`;
  `pal.rocha = { fumo: { contorno: '#0d0c0b', sombra: '#1a1816', corpo: '#2a2724', luz: '#3a3632', aceso: '#4a4540' }, cacos: { luz: '#5c5650', corpo: '#3a3632' }, fogo: H }`;
  `pal.carne = { fumo: { contorno: '#0a0405', sombra: '#160809', corpo: '#240e0e', luz: '#341816', aceso: '#44201c' }, cacos: null, fogo: null }`.

  Os tipos (`receita(tipo, zona)` devolve a função que chama as partes nesta ordem — fumaça, fogo, plasma, cacos):

```js
const RECEITAS = {
  perigo:   { fumaca: 'leve',  fogo: 1,   plasma: false, cacos: false, pal: 'metal' }, // A
  metal:    { fumaca: 'leve',  fogo: 0.6, plasma: false, cacos: true,  pal: 'metal' }, // D (+ o fogo do A)
  chefeFim: { fumaca: 'densa', fogo: 1.2, plasma: false, cacos: true,  pal: 'metal' }, // C fechando A + D
  luz:      { fumaca: null,    fogo: 0,   plasma: true,  cacos: false, pal: 'metal' }, // B
  carta:    { fumaca: null,    fogo: 0,   plasma: true,  cacos: false, pal: 'metal' }, // B
  biomec:   { fumaca: 'densa', fogo: 0,   plasma: true,  cacos: false, pal: 'metal' }, // B → C
  carne:    { fumaca: 'densa', fogo: 0,   plasma: false, cacos: false, pal: 'carne' }, // C de matéria
  rocha:    { fumaca: 'leve',  fogo: 0.2, plasma: false, cacos: true,  pal: 'rocha' }, // D em pedra
};
export function receita(tipo, zona) {
  if (tipo === 'implosao') return implosao; // the pixelfx `implosion`, fire ramp, driven by age (see below)
  const r = RECEITAS[tipo], pal = PALETAS[r.pal];
  return (p, age, o) => {
    const oo = { ...o, zona, pal, k: r };
    if (r.fumaca) parteFumaca(p, age, oo);
    if (r.fogo > 0) parteFogo(p, age, oo);
    if (r.plasma) partePlasma(p, age, oo);
    if (r.cacos) parteCacos(p, age, oo);
  };
}
// the implosion: the vendored `implosion` effect stepped to `age` (it runs at its own 1/60 s), recoloured in the fire ramp
import * as implosionFx from '../../../src/fx/pixelfx/fx/explosions/implosion.js';
import { createFx } from '../../../src/fx/pixelfx/core/index.js';
function implosao(p, age, o) {
  // `createFx(...).draw` takes the FRAME (it places its own painter at opts.x/y): the painter's current origin goes in
  const fx = createFx(implosionFx, { x: p.tx, y: p.ty, palette: ['#3a120e', '#b8281c', '#ff8a2a', '#ffc23d', '#fff3a6', '#ffffff'], seed: o.seed });
  if (age > 0) fx.update(age); // (it sub-steps at 120 Hz by itself)
  fx.draw(p.frame);
}
```

  (o `implosao` reconstrói o efeito a cada quadro: o assar é offline, o custo não importa, e assim ele fica puro.)
- [ ] **Step 4:** o `_explosoes-conceitos.mjs` mantém A–D como estão (a folha de conceitos aprovada fica
  reproduzível); só a fumaça e as paletas passam a vir das receitas (DRY), e o `comparativo.png` sai idêntico.
- [ ] **Step 5:** `node scripts/test-explosoes.mjs` → `tudo ok`. `node scripts/_i/_explosoes-conceitos.mjs <tmp>` →
  `comparativo.png` igual ao de hoje (`cmp`).

### Task 3: assar as folhas e o manifesto

**Files:**
- Create: `scripts/_i/_explosoes-assar.mjs`, `public/sprites/explosoes/*.png`, `src/systems/explosoes/folhasExplosao.ts`
- Modify: `scripts/test-explosoes.mjs` (seção `folhas`)

**Interfaces:**
- Consumes: `receita`, `TIPOS`, `TAMANHOS`, `ZONAS_DO_TIPO` (Task 2).
- Produces (o manifesto gerado):

```ts
// GERADO por scripts/_i/_explosoes-assar.mjs — não editar à mão.
export interface FolhaExplosao { chave: string; luz: string; arq: string; arqLuz: string; cel: number; quadros: number; fps: number }
export const FPS_EXPLOSAO = 20;
/** o maior `size` (as unidades do `Fx.explode`) que cada tamanho cobre, e o size em que ele foi assado (escala 1) */
export const FAIXAS = { P: { ate: 1.25, nativo: 1.25 }, M: { ate: 2, nativo: 2 }, G: { ate: Infinity, nativo: 3.4 } } as const;
export const FOLHAS_EXPLOSAO: Record<string, FolhaExplosao> = { /* 'perigo-vac-P': {...}, … */ };
/** a folha e a escala (≤ 1) de um estouro; a zona cai no vácuo se o tipo não tiver a da atmosfera */
export function escolheFolha(tipo: string, zona: 'vac' | 'atm', size: number): { folha: FolhaExplosao; escala: number } | null {
  const tam = tipo === 'implosao' ? 'G' : size <= FAIXAS.P.ate ? 'P' : size <= FAIXAS.M.ate ? 'M' : 'G';
  const f = FOLHAS_EXPLOSAO[`${tipo}-${zona}-${tam}`] ?? FOLHAS_EXPLOSAO[`${tipo}-vac-${tam}`] ?? FOLHAS_EXPLOSAO[`perigo-vac-${tam}`];
  if (!f) return null;
  return { folha: f, escala: Math.min(1, size / FAIXAS[tam].nativo) };
}
```

  (`explodeBig(escala e)` equivale a `size = 2 × e`: o `G` nativo em 3,4 cobre a bomba, `explodeBig 1.7`.)

- [ ] **Step 1: o teste** — seção `folhas` no `test-explosoes.mjs`: para cada entrada do manifesto, o PNG existe, mede
  `cel × quadros` por `cel`, a cor tem alpha só 0/255, a luz existe com o mesmo tamanho; `escolheFolha` devolve escala
  ≤ 1 para `size` em `[0.3, 0.5, 1, 1.25, 1.5, 2, 2.6, 3.4]`; a soma dos PNGs ≤ 12 MB.
- [ ] **Step 2:** rodar → FAIL (sem manifesto).
- [ ] **Step 3: o assar.** Para cada tipo × zona × tamanho (a implosão só `vac-G`): desenhar a 20 fps com
  `receita(tipo, zona)` numa `createFrame(cel, cel)`, até a cor e a luz ficarem vazias 2 quadros seguidos (teto 3 s);
  cada quadro vira duas células RGBA — a COR (`color`: alpha 0/255 exato, o pixel do pintor) e a LUZ (`light`, o
  aditivo: RGB = a luz, alpha 255 onde há luz, para tocar em `ADD`); gravar `public/sprites/explosoes/<chave>.png` e
  `<chave>-luz.png` (quadros lado a lado) e escrever o `folhasExplosao.ts` (o bloco acima com o `FOLHAS_EXPLOSAO`
  preenchido). Semente fixa por tipo (a mesma explosão sempre: o jogo varia pela escala e pelo `flipX`).
- [ ] **Step 4:** `node scripts/_i/_explosoes-assar.mjs` e `node scripts/test-explosoes.mjs` → `tudo ok`;
  `npx tsc --noEmit` limpo.

### Task 4: o `Fx` e o carregamento

**Files:**
- Create: `src/systems/explosoes/tipoExplosao.ts`
- Modify: `src/systems/Fx.ts:80-120` (anims), `:122-212` (os estouros), `src/scenes/BootScene.ts` (o load)
- Modify: `scripts/test-explosoes.mjs` (seção `tipo`)

**Interfaces:**
- Produces:

```ts
// src/systems/explosoes/tipoExplosao.ts
import type { Classe, Material } from '../morte/numerosDestrocos';
export type TipoExplosao = 'perigo' | 'metal' | 'chefeFim' | 'luz' | 'biomec' | 'carne' | 'rocha' | 'carta' | 'implosao';
/** a explosão de um corpo pelo material dele (spec §4b); o chefe de metal fecha na nuvem (`chefeFim`) */
export function tipoDoMaterial(material: Material | undefined, classe?: Classe): TipoExplosao {
  if (!material) return 'perigo';
  if (material === 'metal') return classe === 'chefe' ? 'chefeFim' : 'metal';
  return material; // 'luz' | 'biomec' | 'carne' | 'rocha'
}
```

  No `Fx`: `zona: 'vac' | 'atm' = 'vac'` (público); `explode(x, y, size = 1, depth = 50, tipo: TipoExplosao = 'perigo')`;
  `explodeBig(x, y, escala = 1, depth = 50, tipo: TipoExplosao = 'perigo')` (desenha `size = 2 × escala`);
  `implodeBig(x, y, escala = 1, depth = 50)` (tipo `implosao`); `explosao(tipo, x, y, size, depth): Sprite | null` — o
  único que cria sprites: o de cor (`setScale(escala)`, a anim `explosao-<chave>`) e o de luz por cima
  (`setBlendMode(Phaser.BlendModes.ADD)`, depth + 0.01, a anim `explosao-<chave>-luz`), os dois se destroem no fim;
  `flipX` sorteado. `sheetSprite` fica para quem toca outras folhas (as cartas aprovadas). O abalo e o flash seguem
  como hoje (os flashes são a etapa 2).
- [ ] **Step 1:** seção `tipo` no teste: `tipoDoMaterial` para cada `SEPARACAO`/`CHEFOES`/`PECAS` dá um tipo do
  manifesto; `metal`+`chefe` → `chefeFim`; `undefined` → `perigo`.
- [ ] **Step 2:** BootScene: para cada `FOLHAS_EXPLOSAO` → `load.spritesheet(f.chave, f.arq, { frameWidth: f.cel, frameHeight: f.cel })`
  e o mesmo para a luz. As folhas antigas seguem carregadas (o `sheetSprite` das cartas e o retorno se faltar arquivo).
- [ ] **Step 3:** `Fx.registerAnims`: uma anim por folha (`frameRate: FPS_EXPLOSAO`, `repeat: 0`).
- [ ] **Step 4:** `explode`/`explodeBig`/`implodeBig` passam por `explosao(...)`; se `escolheFolha` der `null` (folha
  faltando), caem no código de hoje.
- [ ] **Step 5:** `npx tsc --noEmit`, `node scripts/test-explosoes.mjs`, `npm run build` → ok.

### Task 5: os pontos de chamada do jogo, pelo material

**Files (Modify):** `src/scenes/GameScene.ts` (≈ 487, 496, 674, 1781, 2103, 2360, 2382, 2596, 2645, 2740, 2856,
2903, 2906; e onde a zona nasce), `src/systems/morte/Destrocos.ts:1680-1696`, `src/systems/morte/MorteDaNave.ts:556-565`,
`src/systems/cartas/ExplosaoDoJogador.ts:99,108`, `src/entities/Boss.ts:795,807`, `src/entities/BossNucleo.ts:686,699`,
`src/entities/esfincter.ts:447`, `src/entities/fimDoPredador.ts:144`, `src/entities/Predador.ts:1156`,
`src/entities/SerraGuardiao.ts:200`, `src/entities/BossSerpente.ts:1237`.

- [ ] **Step 1: a zona.** Na `GameScene.create`, logo depois de criar o `Fx`: `this.fx.zona = this.zone === 'atmosfera' ? 'atm' : 'vac'`
  (e de novo onde a F1 sai da atmosfera, no `breakAtmosphere`).
- [ ] **Step 2: o inimigo** (2856): `this.fx.explode(e.x, e.y, e.scale, 50, tipoDoMaterial(SEPARACAO[kind]?.material, SEPARACAO[kind]?.classe))`.
- [ ] **Step 3: as peças** (2740): `tipoDoMaterial(p?.material)`, com `explode` (mina/sensor que estoura) → `'perigo'`;
  o F4 usa `p.materialF4` quando a fase é a 4.
- [ ] **Step 4: a destruição por pixel** (`Destrocos` 1680–1696): o ramo das três folhas vira
  `this.fx.explosao(tipoDoMaterial(mat, classe), x, y, escala, depth)`; `carne` deixa de só sacudir: ganha a sua
  (`tipoDoMaterial('carne')`) além do tremor; `luz` segue com o `choque` (o B entra pelo `Fx.explode` do inimigo);
  `rocha` segue sem fogo próprio (a explosão de cena é a do `killHazard`, agora `rocha`).
- [ ] **Step 5: a nave** (`MorteDaNave.estouro`): `folha === 'explosion' ? escala / 0.6 : escala / 1.1` vira o `size`
  de `this.o.fx.explosao('metal', …)`; a manta segue com o `choque`.
- [ ] **Step 6: as cartas** (`ExplosaoDoJogador` 99 e 108): `fx.explode(x, y, visual, undefined, 'carta')` e o
  retorno `fx.explosao('carta', ex, ey, escala, PROFUNDIDADE)`.
- [ ] **Step 7: os chefões:** `Boss.ts` 795 (a cadeia) `'metal'`, 807 (o fim) `'chefeFim'`; `GameScene` 2360 (a cadeia
  genérica) `tipoDoMaterial(quem?.material)`, 2382 `tipoDoMaterial(quem?.material, 'chefe')`; `BossNucleo` 686 e 699
  `'biomec'`; `esfincter` 447, `fimDoPredador` 144, `Predador` 1156 e as portas (2645) `'carne'`; `SerraGuardiao` 200 e o
  golfinho (2103) `'biomec'`; props (2596) `'metal'`; a bomba (674, 2906) `'perigo'`; a nave atingida (2903) `'metal'`;
  a mesa do mar afundando (1781) `'rocha'`; o elite que estoura (496) e o estilhaço da mina (487) `'perigo'`.
- [ ] **Step 8:** `npx tsc --noEmit`, todos os `scripts/test-*.mjs`, `npm run build` → ok.

### Task 6: as cutscenes

**Files (Modify):** `src/scenes/InterludeScene.ts:474-475,499-500`, `src/scenes/Interlude2Scene.ts:835-836,851,864,890`,
`src/scenes/Interlude3Scene.ts:736,915,941`.

- [ ] **Step 1:** os `Fx` das cutscenes ficam em `zona = 'vac'` (o padrão).
- [ ] **Step 2:** cutscene 1 — a cadeia: `explode(..., 26, 'metal')`, os grandes `explodeBig(..., 26, 'chefeFim')`; a
  implosão já é `implodeBig` (tipo `implosao`).
- [ ] **Step 3:** cutscene 2 — a doca: mesmos tipos (`'metal'`, grandes `'chefeFim'`, 864 `'metal'`).
- [ ] **Step 4:** cutscene 3 — a garganta: 736, 915 e 941 `'carne'`.
- [ ] **Step 5:** `npx tsc --noEmit` e `npm run build` → ok.

### Task 7: a folha no jogo

**Files:** Create `folhas/2026-11-09/explosoes/jogo.html` (+ vídeos/fotos, fora do commit os vídeos).

- [ ] **Step 1:** filmar com `scripts/_h/_filmar.mjs` (sem editar `src/` durante): a F1 (drones e torres, 30–40 s,
  `--fase 1`), a F2 (o cinturão e a Capitânia: `--fase 2`, um trecho com asteroides e o fim da luta), a F3 (a lula e a
  água-viva no Ato 1), a F4 (pupas, moscas, Tubo, o golfinho), a cutscene 1 (a cadeia) e a bomba. Uma sonda curta por
  material se a fase não mostrar no trecho (o `?sandbox` das cartas tem as ondas).
- [ ] **Step 2:** a folha: cada material, o antes (a de hoje, pelos vídeos antigos ou `git stash`) e o depois.
- [ ] **Step 3:** registrar no 🧭 e na memória; as folhas antigas (`explosion*-sheet.png`) só saem para
  `assets/raw/` depois do ok dele (e das cartas aprovadas que ainda usam a pequena).
