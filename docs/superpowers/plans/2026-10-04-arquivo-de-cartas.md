# O ARQUIVO DE CARTAS — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a wiki das 24 cartas dentro do jogo — aberta do menu, grade de miniaturas + ficha (texto, números, tecla) +
um clipe em loop da carta em jogo.

**Architecture:** uma cena do MUNDO (`ArquivoScene`, chave `Arquivo`) desenha o fundo e o clipe em pixel nativo; o
texto vai para a irmã HD dela pelo `pixelText` de sempre; ícones e miniaturas também vão para a irmã, na escala do
PIXEL FINO (`pixelFino()/escalaHD()`), como a mesa. Os números das cartas mudam de endereço para um módulo puro
(`src/data/numerosCartas.ts`), que os sistemas e a ficha leem. Os clipes saem do `_gif-cartas.mjs` num modo novo.

**Tech Stack:** Phaser 3 + TypeScript (Vite), scripts em node (`.mjs` importando `.ts` direto, como os `test-*`),
Playwright + SwiftShader nas sondas, sharp nas folhas.

**Spec:** `docs/superpowers/specs/2026-10-04-arquivo-de-cartas-design.md`.

## Global Constraints

- Só a conversa com ele é pt-br; código, nomes e comentários seguem o idioma do repositório (pt-br nos comentários,
  como o código em volta).
- Commits só com a autoria dele (sem `Co-Authored-By`) — memória `git-autoria`.
- Edite com a ferramenta Edit (sed/`node -e` falham em silêncio aqui: CRLF, `${}`) — memória `edicao-por-script-falha-crlf`.
- Pixel nativo: o clipe toca a 1:1 no mundo (384×216); nada de esticar pixel.
- Testes em node: `node scripts/test-<nome>.mjs` imprime `OK`/`FALHA` por linha e `TUDO OK` no fim (exit 0).
- Sondas no navegador precisam do `npm run dev` rodando (http://localhost:5173/).
- **Correções da spec achadas no plano (04/10):** (1) o menu ainda NÃO passa pela Atmosfera (está na calibragem); o
  fundo do arquivo é o céu do menu (estrelas + nebulosas) sob um véu escuro — a Atmosfera do menu e do arquivo fica
  com a calibragem. (2) Os ícones 40×40 da mesa não cabem 24 numa coluna com títulos de grupo: a grade usa
  MINIATURAS (os ícones reduzidos a 50% pela redução da casa — vizinho + alfa binário), e a ficha mostra o ícone
  grande. As miniaturas entram na folha de revisão (Task 2). (3) Sem a camada HD, o menu não mostra o item ARQUIVO.

---

### Task 1: Os números num endereço só

**Files:**
- Create: `src/data/numerosCartas.ts`
- Create: `scripts/test-numeros-cartas.mjs`
- Modify: `src/systems/cartas/Eletrico.ts` (CHANCE, TRAVA_MS, ARCO, PULSO)
- Modify: `src/systems/cartas/Lancadores.ts` (MISSIL.recargaMs, MISSIL.dano, FLARE.esperaMs, FLARE.dano)
- Modify: `src/systems/cartas/ExplosaoDoJogador.ts` (EXPLOSAO raio/dano, ESTILHACOS)
- Modify: `src/systems/cartas/DroneAuxiliar.ts` (DRONE.esperaS, alcance, dano)
- Modify: `src/systems/cartas/Dash.ts` (DISTANCIA, INTOCAVEL_MS, ESPERA_MS)
- Modify: `src/systems/CartasEmJogo.ts` (CASCO_RECARGA, QUEIMA_MS, TRANCO, chance 0.25, 0.12 dos propulsores, queima 1 a cada 0,4s)
- Modify: `src/cartas.ts` (`montarArma`: 1.15, ×2, 0.7, 1.3)

**Interfaces:**
- Produces: `NUMEROS` (objeto abaixo) e `numerosDaCarta(id: string): string` — `''` quando a carta não tem número.

- [ ] **Step 1: Escrever o teste que falha** — `scripts/test-numeros-cartas.mjs`:

```js
// OS NÚMEROS DAS CARTAS num endereço só (spec 2026-10-04-arquivo-de-cartas §4.2). Uso: node scripts/test-numeros-cartas.mjs
import { NUMEROS, numerosDaCarta } from '../src/data/numerosCartas.ts';
import { CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

// Os valores de hoje (04/10) — a troca de endereço não muda nenhum.
igual(NUMEROS.missil.recargaMs, [8000, 5000], 'míssil: recarga 8s / 5s');
igual(NUMEROS.eletrico.chance, 0.2, 'elétrico: 20%');
igual(NUMEROS.tranco.px, 8, 'tranco: 8px');
igual(NUMEROS.casco.recargaS, [8, 5.5], 'casco: 8s / 5,5s com Recarga');

// A linha da ficha sai do módulo.
igual(numerosDaCarta('WPN_009'), 'recarga 8s (×2: 5s) · dano 2 · explosão raio 20', 'linha do míssil');
igual(numerosDaCarta('EFF_011'), '20% por acerto · trava 0,4s', 'linha do elétrico');
igual(numerosDaCarta('WPN_007'), '', 'o Perfurante não tem número');
// Mexer no módulo muda a ficha (o que a calibragem vai fazer).
NUMEROS.missil.recargaMs[0] = 9000;
igual(numerosDaCarta('WPN_009').startsWith('recarga 9s'), true, 'a ficha acompanha o módulo');
NUMEROS.missil.recargaMs[0] = 8000;
// Toda carta do catálogo passa pela função sem erro.
igual(Object.keys(CARTAS).filter((id) => typeof numerosDaCarta(id) !== 'string'), [], 'as 24 têm linha (ou vazia)');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar** — `node scripts/test-numeros-cartas.mjs` → erro de módulo não encontrado.

- [ ] **Step 3: Escrever o módulo** — `src/data/numerosCartas.ts`:

```ts
import { FATOR_EXPLOSAO_MAIOR } from '../cartasRegras';

/**
 * OS NÚMEROS DAS CARTAS (spec 2026-10-04-arquivo-de-cartas §4.2) — UM endereço para os números PROVISÓRIOS que o
 * jogador sente (dano, raio, chance, recarga, duração). Os sistemas de `systems/cartas/` leem daqui, e a ficha do
 * ARQUIVO também: mexer num número na calibragem (frente C) muda o jogo e a wiki juntos.
 *
 * Módulo PURO (sem Phaser): o `test-numeros-cartas` roda em node. Os números de VOO (aceleração do míssil, queda,
 * mola do drone…) ficam em quem voa — não são o que a ficha mostra.
 */
export const NUMEROS = {
  cadencia: { fator: 1.15 },
  pesado: { dano: 2, velocidade: 0.7, escala: 1.3 },
  tranco: { px: 8, cadaMs: 250, aranha: 0.5 },
  missil: { recargaMs: [8000, 5000], dano: 2 },
  drone: { esperaS: 1.2, alcance: 160, dano: 1 },
  explosao: {
    explosivo: { raio: 18, dano: 1 },
    combustao: { raio: 26, dano: 2 },
    reativo: { raio: 40, dano: 3 },
    missil: { raio: 20, dano: 1 },
    flare: { raio: 22, dano: 2 },
  },
  explosaoMaior: { fator: FATOR_EXPLOSAO_MAIOR },
  estilhacos: { n: 5, alcance: 36, dano: 1 },
  incendiario: { chance: 0.25, queimaMs: 2000, cadaS: 0.4, dano: 1 },
  flare: { esperaMs: 8000, dano: 1 },
  eletrico: { chance: 0.2, travaMs: 400 },
  arco: { saltos: 3, raio: 50, dano: 1 },
  sobrecarga: { raio: 30, dano: 2 },
  casco: { recargaS: [8, 5.5] },
  propulsores: { porCopia: 0.12 },
  dash: { distancia: 40, intocavelMs: 200, esperaMs: 8000 },
};

/** 0,4 / 8 / 5,5 — vírgula decimal, sem zero à toa. */
const n = (v: number): string => String(Math.round(v * 100) / 100).replace('.', ',');
const s = (ms: number): string => `${n(ms / 1000)}s`;
const pct = (f: number): string => `${Math.round(f * 100)}%`;

/** A LINHA DE NÚMEROS da ficha (`''` = a carta não tem número para mostrar). */
export function numerosDaCarta(id: string): string {
  const N = NUMEROS;
  const linhas: Record<string, string[]> = {
    WPN_004: [`+${pct(N.cadencia.fator - 1)} por cópia`],
    WPN_008: [`dano ×${n(N.pesado.dano)}`, `tiro ${pct(1 - N.pesado.velocidade)} mais lento`, `tranco ${N.tranco.px}px`],
    WPN_009: [
      `recarga ${s(N.missil.recargaMs[0])} (×2: ${s(N.missil.recargaMs[1])})`,
      `dano ${N.missil.dano}`,
      `explosão raio ${N.explosao.missil.raio}`,
    ],
    WPN_010: [`dano ${N.drone.dano}`, `1 tiro a cada ${n(N.drone.esperaS)}s`, `alcance ${N.drone.alcance}`],
    EFF_001: [`dano ${N.explosao.explosivo.dano}`, `raio ${N.explosao.explosivo.raio}`],
    EFF_002: [`raio ×${n(N.explosaoMaior.fator)}`],
    EFF_003: [`${N.estilhacos.n} estilhaços`, `dano ${N.estilhacos.dano}`, `alcance ${N.estilhacos.alcance}`],
    EFF_004: [`${pct(N.incendiario.chance)} por acerto`, `${N.incendiario.dano} de dano a cada ${n(N.incendiario.cadaS)}s por ${s(N.incendiario.queimaMs)}`],
    EFF_006: [`dano ${N.explosao.combustao.dano}`, `raio ${N.explosao.combustao.raio}`],
    EFF_010: [`recarga ${s(N.flare.esperaMs)}`, `explosão dano ${N.explosao.flare.dano}`, `raio ${N.explosao.flare.raio}`],
    EFF_011: [`${pct(N.eletrico.chance)} por acerto`, `trava ${s(N.eletrico.travaMs)}`],
    EFF_012: [`até ${N.arco.saltos} saltos`, `alcance ${N.arco.raio}`, `dano ${N.arco.dano}`],
    EFF_013: [`dano ${N.sobrecarga.dano}`, `raio ${N.sobrecarga.raio}`],
    DEF_001: [`volta em ${n(N.casco.recargaS[0])}s`],
    DEF_002: [`o casco volta em ${n(N.casco.recargaS[1])}s`],
    DEF_004: [`dano ${N.explosao.reativo.dano}`, `raio ${N.explosao.reativo.raio}`],
    MOV_001: [`+${pct(N.propulsores.porCopia)} por cópia`],
    MOV_003: [`recarga ${s(N.dash.esperaMs)}`, `${N.dash.distancia}px`, `intocável ${s(N.dash.intocavelMs)}`],
  };
  return (linhas[id] ?? []).join(' · ');
}
```

- [ ] **Step 4: Rodar e ver passar** — `node scripts/test-numeros-cartas.mjs` → `TUDO OK`.

- [ ] **Step 5: Os sistemas leem do módulo** (troca de endereço; os valores são os mesmos). Em cada arquivo, importar
  `import { NUMEROS } from '../../data/numerosCartas';` (em `CartasEmJogo.ts` e `cartas.ts`: `'../data/numerosCartas'`
  e `'./data/numerosCartas'`) e trocar:
  - `Eletrico.ts`: `CHANCE` → `NUMEROS.eletrico.chance`; `TRAVA_MS` → `NUMEROS.eletrico.travaMs`; `ARCO` → `NUMEROS.arco`
    (`ARCO.saltos/raio/dano`); `PULSO` → `NUMEROS.sobrecarga`. `RAIO_NO_CORPO_MS = NUMEROS.eletrico.travaMs`.
  - `Lancadores.ts`: `MISSIL.recargaMs` → `NUMEROS.missil.recargaMs`; `MISSIL.dano` → `NUMEROS.missil.dano`;
    `FLARE.esperaMs` → `NUMEROS.flare.esperaMs`; `FLARE.dano` → `NUMEROS.flare.dano` (tirar as chaves dos objetos locais).
  - `ExplosaoDoJogador.ts`: `EXPLOSAO[f].raio/dano` → `NUMEROS.explosao[f]` (o `visual` fica local num
    `VISUAL: Record<FonteExplosao, number>`); `ESTILHACOS.n/alcance/dano` → `NUMEROS.estilhacos` (a `velocidade` fica local).
  - `DroneAuxiliar.ts`: `DRONE.esperaS/alcance/dano` → `NUMEROS.drone`.
  - `Dash.ts`: `DISTANCIA` → `NUMEROS.dash.distancia`; `INTOCAVEL_MS` → `NUMEROS.dash.intocavelMs`; `ESPERA_MS` → `NUMEROS.dash.esperaMs`.
  - `CartasEmJogo.ts`: `CASCO_RECARGA` → `NUMEROS.casco.recargaS`; `QUEIMA_MS` → `NUMEROS.incendiario.queimaMs`;
    o `0.4` da queima → `NUMEROS.incendiario.cadaS`; o dano `1` da queima → `NUMEROS.incendiario.dano`; o `0.25` →
    `NUMEROS.incendiario.chance`; o `0.12` → `NUMEROS.propulsores.porCopia`; `TRANCO` → `NUMEROS.tranco`.
  - `cartas.ts#montarArma`: `1.15` → `NUMEROS.cadencia.fator`; `* 2` → `* NUMEROS.pesado.dano`; `0.7` →
    `NUMEROS.pesado.velocidade`; `1.3` → `NUMEROS.pesado.escala`.

- [ ] **Step 6: Provar que o jogo não mudou** — `npx tsc --noEmit`; `node scripts/test-cartas-regras.mjs`,
  `test-catalogo-cartas`, `test-numeros-cartas`, `test-sandbox-arvore`; sondas `probe-cartas-novas`, `probe-sandbox`,
  `probe-cartas` → todos `TUDO OK` / `"erros": []`.

- [ ] **Step 7: Commit** — `git add src/data/numerosCartas.ts scripts/test-numeros-cartas.mjs src/systems src/cartas.ts`
  e `git commit -m "refactor(cartas): os números das cartas num endereço só (numerosCartas) — o jogo não muda"`.

---

### Task 2: As descrições e as miniaturas → FOLHA PARA ELE (checkpoint)

**Files:**
- Modify: `src/data/catalogoCartas.ts` (`descricao` em `CartaDef` e nas 24)
- Modify: `scripts/test-catalogo-cartas.mjs`
- Create: `scripts/_miniaturas-icones.mjs` → `public/sprites/cartas/mini/icone-<ID>.png` (20×20)
- Create: `scripts/_folha-arquivo-textos.mjs` → `docs/superpowers/folhas/2026-10-04/arquivo/descricoes.html`

**Interfaces:**
- Produces: `CartaDef.descricao: string` (até 3 linhas de ~34 caracteres, quebra automática — sem `\n`);
  texturas `mini-<ID>` (carregadas na Task 3).

- [ ] **Step 1: O teste do catálogo exige a descrição** — em `scripts/test-catalogo-cartas.mjs`, antes do resumo:

```js
// A DESCRIÇÃO do ARQUIVO (spec 2026-10-04 §4.1): toda carta tem, sem número (os números vêm do módulo), e cabe em
// 3 linhas de 34 caracteres (a largura da ficha na voz do piloto).
const linhasDe = (t, w = 34) => t.split(' ').reduce((ls, p) => {
  const u = ls[ls.length - 1];
  if (u && (u + ' ' + p).length <= w) ls[ls.length - 1] = u + ' ' + p; else ls.push(p);
  return ls;
}, []);
igual(ids.filter((id) => !CARTAS[id].descricao), [], 'toda carta tem descricao');
igual(ids.filter((id) => /\d/.test(CARTAS[id].descricao ?? '')), [], 'a descricao não tem número');
igual(ids.filter((id) => linhasDe(CARTAS[id].descricao ?? '').length > 3), [], 'a descricao cabe em 3 linhas');
```

- [ ] **Step 2: Rodar e ver falhar** — `node scripts/test-catalogo-cartas.mjs` → `FALHA toda carta tem descricao`.

- [ ] **Step 3: `descricao` no catálogo** — em `CartaDef`: `/** O texto da FICHA do Arquivo, para o jogador: até 3
  linhas, sem número (spec 2026-10-04 §4.1). */ descricao: string;` e nas 24 (texto proposto — ele revisa no Step 6):

| ID | descricao |
|---|---|
| WPN_001 | A nave dispara dois tiros lado a lado. Cobre mais altura da tela. |
| WPN_002 | Três tiros em leque: um reto e dois abertos. Pega quem vem pelos lados. |
| WPN_004 | A nave atira mais rápido. Pode ser escolhida mais vezes, e soma. |
| WPN_007 | O tiro atravessa o inimigo e segue, acertando quem estiver atrás. |
| WPN_008 | Tiro mais lento e mais forte. Cada acerto dá um tranco que joga o inimigo para trás. |
| WPN_009 | Na tecla, um míssil cai da nave, trava no inimigo mais próximo e explode nele. |
| WPN_010 | Um drone acompanha a nave e atira sozinho nos inimigos por perto. Desvia do perigo. |
| EFF_001 | O tiro explode ao acertar e fere quem está em volta. |
| EFF_002 | As suas explosões ficam maiores e pegam mais inimigos. |
| EFF_003 | Cada explosão solta estilhaços em leque, que ferem quem está na frente. |
| EFF_004 | O tiro pode incendiar o inimigo, que queima e perde vida por um tempo. |
| EFF_006 | O inimigo que morre queimando explode em fogo. |
| EFF_007 | As suas explosões incendeiam todo mundo que pegam. Fogo vira reação em cadeia. |
| EFF_010 | Na tecla, solta para trás uma armadilha acesa que explode em quem encostar. |
| EFF_011 | O tiro pode eletrificar: o inimigo leva um raio e fica parado, sem andar nem atirar. |
| EFF_012 | O choque salta do inimigo eletrificado para os vizinhos, um por vez. |
| EFF_013 | O inimigo eletrificado que morre solta um pulso que fere quem está em volta. |
| DEF_001 | Um escudo que absorve um golpe sem perder vida. Depois de um tempo, ele volta. |
| DEF_002 | O casco quebrado volta mais rápido. |
| DEF_003 | Ganha uma vida a mais na hora. |
| DEF_004 | Quando o casco quebra, ele explode e fere quem está perto da nave. |
| DEF_005 | Ganha uma bomba a mais na hora, e a cada vida nova. |
| MOV_001 | A nave voa mais rápido no voo livre. Pode ser escolhida mais vezes. |
| MOV_003 | Na tecla, um avanço rápido em que a nave fica intocável. |

- [ ] **Step 4: Rodar e ver passar** — `node scripts/test-catalogo-cartas.mjs` → `TUDO OK`.

- [ ] **Step 5: As miniaturas** — `scripts/_miniaturas-icones.mjs`:

```js
// AS MINIATURAS da grade do ARQUIVO (plano 2026-10-04 Task 2): os ícones 40×40 da mesa a 50% (20×20), pela redução da
// casa — vizinho mais próximo + alfa binário. Uso, da raiz: node scripts/_miniaturas-icones.mjs
import fs from 'fs';
import sharp from 'sharp';
import { ICONES_CARTAS } from '../src/data/catalogoCartas.ts';

const OUT = 'public/sprites/cartas/mini';
fs.mkdirSync(OUT, { recursive: true });
for (const id of ICONES_CARTAS) {
  const src = `public/sprites/cartas/icone-${id}.png`;
  const m = await sharp(src).metadata();
  const { data, info } = await sharp(src).ensureAlpha()
    .resize(Math.round(m.width / 2), Math.round(m.height / 2), { kernel: 'nearest' })
    .raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
  await sharp(data, { raw: info }).png().toFile(`${OUT}/icone-${id}.png`);
}
console.log(OUT, ICONES_CARTAS.length, 'miniaturas');
```

  Rodar: `node scripts/_miniaturas-icones.mjs` → `24 miniaturas`.

- [ ] **Step 6: A FOLHA para ele** — `scripts/_folha-arquivo-textos.mjs` gera
  `docs/superpowers/folhas/2026-10-04/arquivo/descricoes.html`: por carta, o ícone 40×40 e a miniatura 20×20 (ambos
  ampliados ×3, `image-rendering: pixelated`), nome, `curto` da mesa, a `descricao` e a `numerosDaCarta`. Abrir para
  ele. **PARAR aqui** e esperar a revisão: ele corrige textos; miniatura ruim → redesenhar à mão a 20×20.

```js
// A FOLHA DOS TEXTOS DO ARQUIVO, para ele revisar (descrição, números, miniatura). Uso: node scripts/_folha-arquivo-textos.mjs
import fs from 'fs';
import { CARTAS } from '../src/data/catalogoCartas.ts';
import { numerosDaCarta } from '../src/data/numerosCartas.ts';

const OUT = 'docs/superpowers/folhas/2026-10-04/arquivo';
fs.mkdirSync(OUT, { recursive: true });
const GRUPO = { arma: 'ARMAMENTO', efeito: 'EFEITO', defesa: 'DEFESA', movimento: 'MOVIMENTO' };
const cartao = (c) => `<article><div class="ic"><img class="g" src="../../../../../public/sprites/cartas/icone-${c.id}.png">
<img class="m" src="../../../../../public/sprites/cartas/mini/icone-${c.id}.png"></div><div>
<h3>${c.nome}</h3><p class="meta">${c.raridade.toUpperCase()} · ${GRUPO[c.categoria]} · máx. ${c.max} · mesa: “${c.curto}”</p>
<p class="d">${c.descricao}</p><p class="n">${numerosDaCarta(c.id) || '—'}</p></div></article>`;
const grupos = Object.keys(GRUPO).map((g) => `<h2>${GRUPO[g]}</h2>${Object.values(CARTAS).filter((c) => c.categoria === g).map(cartao).join('')}`);
fs.writeFileSync(`${OUT}/descricoes.html`, `<!doctype html><html lang="pt-br"><meta charset="utf-8"><title>Arquivo: textos</title>
<style>body{background:#0b0d14;color:#d8deea;font:15px/1.45 system-ui;margin:0;padding:24px 16px;max-width:900px}
h2{color:#ffb040}article{display:flex;gap:16px;background:#141824;border-radius:8px;padding:12px;margin:8px 0}
.ic{display:flex;gap:10px;align-items:center;flex:none}.g{width:120px}.m{width:60px}img{image-rendering:pixelated}
h3{margin:0}.meta{color:#8a93a6;font-size:13px;margin:2px 0}.d{margin:6px 0}.n{font-family:Consolas,monospace;color:#7fe0ff;margin:0}</style>
<h1>Arquivo de cartas — os textos (revisar)</h1>${grupos.join('')}`);
console.log(`${OUT}/descricoes.html`);
```

- [ ] **Step 7: Commit** (depois da revisão dele e das correções) —
  `git add src/data/catalogoCartas.ts scripts/test-catalogo-cartas.mjs scripts/_miniaturas-icones.mjs scripts/_folha-arquivo-textos.mjs public/sprites/cartas/mini docs/superpowers/folhas/2026-10-04/arquivo`
  e `git commit -m "feat(arquivo): as descrições das 24 cartas e as miniaturas da grade (revisadas por ele)"`.

---

### Task 3: A lista do menu e a tela do Arquivo (grade + ficha, sem clipe)

**Files:**
- Create: `src/scenes/ArquivoScene.ts`
- Create: `scripts/probe-arquivo.mjs`
- Modify: `src/scenes/MenuScene.ts` (`buildUI` e `bindKeys`: a lista COMEÇAR / ARQUIVO DE CARTAS)
- Modify: `src/scenes/BootHDScene.ts` (carregar `mini-<ID>`)
- Modify: `src/main.ts` (registrar `ArquivoScene`)
- Modify: `src/uiHD.ts` (`VOZ_DA_CENA.Arquivo = 'piloto'`)

**Interfaces:**
- Consumes: `CARTAS`, `ICONES_CARTAS` (catálogo), `numerosDaCarta` (Task 1), `CartaDef.descricao` e as texturas
  `mini-<ID>` (Task 2), `mapaAtivo`/`rotuloDaTecla` (`controles.ts`), `pixelText` (`ui.ts`), `irmaDe`, `escalaHD`,
  `pixelFino`, `registrarTextoHD`, `jogoHD` (`uiHD.ts`), a cor da raridade (`raridade.ts`).
- Produces: cena `Arquivo` (`scene.start('Arquivo')`; ESC → `scene.start('Menu', { cursor: 1 })`); para a sonda:
  `ArquivoScene.selecionada: string` e `ArquivoScene.geometria(): { id: string; caixas: { tipo: string; x: number; y: number; w: number; h: number }[] }`.

**Layout (mundo 384×216):** título `ARQUIVO DE CARTAS` em y 10 (voz do jogo); grade à esquerda a partir de (12, 24),
células de 16×16 (miniatura centrada), 6 por linha, título de grupo de 8px antes de cada grupo; caixa do clipe
(208, 22, 160×90); a ficha abaixo dela de y 118 a 202: ícone grande em (208, 118) caixa 32×32, nome à direita
dele, a linha `RARIDADE · CATEGORIA · máx. N`, a descrição (largura 160, até 3 linhas), os números (voz da nave) e a
tecla; rodapé `←↑↓→ escolher · ESC voltar` em y 208.

- [ ] **Step 1: A sonda que falha** — `scripts/probe-arquivo.mjs` (molde: `probe-teclas.mjs`/`probe-mesa-texto.mjs`):
  abre `http://localhost:5173/`, pula a abertura (tecla), aperta ↓ e Enter; confere: (a) a cena `Arquivo` ativa;
  (b) `selecionada === 'WPN_001'`; (c) → seis vezes e ↓ uma, anotando `selecionada` a cada passo — percorre ids
  diferentes e nunca sai das 24; (d) para cada uma das 24 (setando `cena.selecionar(id)`), toda caixa de texto da
  `geometria()` cabe dentro da área da ficha (x ≥ 208, x+w ≤ 372, y+h ≤ 204); (e) ESC → `Menu` ativa; (f) no menu,
  Enter com o cursor em COMEÇAR → `Game` ativa; (g) nenhum `pageerror`. Saída `OK/FALHA` e `TUDO OK`.
  Rodar: `node scripts/probe-arquivo.mjs` → falha (não há item no menu).

- [ ] **Step 2: O menu ganha a lista** — em `buildUI`, o `cta` vira dois itens em y 151 e 161, com o marcador `▸`:
  `COMEÇAR` e `ARQUIVO DE CARTAS` (o 2º só se `jogoHD()` existir); `private cursorMenu = 0` (de `init(data)`:
  `data.cursor ?? 0`); `marcarMenu()` pinta o selecionado de `COLORS.playerGlow` e o outro de `COLORS.metalLight`, com
  o `▸` no selecionado. Em `bindKeys`: `UP`/`W` e `DOWN`/`S` mudam o cursor (com `Phaser.Math.Wrap`) e chamam
  `marcarMenu`; `ENTER`/`SPACE` → `this.cursorMenu === 1 ? this.scene.start('Arquivo') : this.start('diegetico')`. Os
  `1`–`3` e os atalhos de dev ficam como estão.

- [ ] **Step 3: A cena** — `src/scenes/ArquivoScene.ts`: fundo (o `Starfield` do menu + as duas `nebula` com o mesmo
  tint do menu + um retângulo `COLORS.bgDeep` a 0,6 por cima); a grade (miniaturas na irmã HD, escala
  `pixelFino()/escalaHD()`, posições arredondadas a `1/escalaHD()`, e um `registrarTextoHD(img, (s) =>
  img.setScale(pixelFino() / s))` para a troca de escala); o realce na cor da raridade (um `Graphics` de 1px na irmã
  em volta da célula); a ficha (`pixelText` com `voz: 'piloto'` para nome/meta/descrição com `wordWrap` de 160px
  do mundo, `voz: 'nave'` para números e tecla); a caixa do clipe com o ÍCONE GRANDE centrado (até a Task 4); as
  teclas (←→↑↓ e WASD andam na grade em linha/coluna; ESC/Backspace voltam ao menu com `{ cursor: 1 }`); `selecionar(id)`
  público (troca a ficha) e `geometria()` para a sonda. A TECLA só nas ativas: `{ WPN_009: 'missil', EFF_010: 'flare',
  MOV_003: 'dash' }` → `tecla ${rotuloDaTecla(mapaAtivo()[acao][0])}`.

- [ ] **Step 4: Ligar** — `main.ts`: `ArquivoScene` na lista de cenas; `uiHD.ts`: `Arquivo: 'piloto'` em
  `VOZ_DA_CENA`; `BootHDScene.ts`: `ICONES_CARTAS.forEach((id) => this.load.image(`mini-${id}`, `sprites/cartas/mini/icone-${id}.png`))`.

- [ ] **Step 5: Rodar** — `npx tsc --noEmit`; `node scripts/probe-arquivo.mjs` → `TUDO OK`; `probe-teclas`,
  `probe-cartas` (o menu mudou) → ok.

- [ ] **Step 6: Commit** — `git commit -m "feat(arquivo): a lista do menu e a tela do Arquivo — grade de miniaturas + ficha"`.

---

### Task 4: Os clipes

**Files:**
- Modify: `scripts/_gif-cartas.mjs` (modo `clipe`)
- Create: `public/sprites/cartas/clipes/<ID>.png` (20) e `public/sprites/cartas/clipes/clipes.json`
- Modify: `src/scenes/ArquivoScene.ts` (tocar o clipe)
- Modify: `scripts/probe-arquivo.mjs` (o clipe toca)

**Interfaces:**
- Produces: `clipes.json` = `{ "w": 160, "h": 90, "fps": 20, "colunas": 10, "cartas": { "<ID>": { "quadros": number } } }`.

- [ ] **Step 1: O modo `clipe`** — `node scripts/_gif-cartas.mjs --clipes [ID,...]`: para cada carta da tabela
  `CLIPE_DA_CARTA` (abaixo), grava o cenário com `GIF_ZOOM=1`, recortando 160×90 no ponto `clipe` do cenário (padrão
  `{ x: 60, y: 60 }`), e monta os quadros em grade de 10 colunas em `public/sprites/cartas/clipes/<ID>.png`;
  atualiza `clipes.json`. Tabela (cenário · segundos):
  `WPN_001 duplo 2.5 · WPN_002 triplo 2.5 · WPN_004 cadencia 2.5 · WPN_007 perfurante 2.5 · WPN_008 tranco 3 ·
  WPN_009 missil2 3 · WPN_010 drone 3 · EFF_001 explosivo 2.5 · EFF_002 maior 2.5 · EFF_003 fragmentos 2.5 ·
  EFF_004 estadoqueimando 2.5 · EFF_006 combustao 3 · EFF_007 emcadeia 3 · EFF_010 flare 3.5 · EFF_011 estadoeletrico 3 ·
  EFF_012 arco 2.5 · EFF_013 eletrico 3 · DEF_001 casco 3 · DEF_004 reativo 2.5 · MOV_003 dash 2.5`.
  Ajustar o ponto `clipe` de cada cenário olhando o 1º quadro (a ação dentro dos 160×90).

- [ ] **Step 2: Gerar e conferir** — `node scripts/_gif-cartas.mjs --clipes`; ver 3 folhas (WPN_009, EFF_011,
  MOV_003) ampliadas; a ação cabe no quadro.

- [ ] **Step 3: A cena toca o clipe** — `preload`: `this.load.json('clipes', 'sprites/cartas/clipes/clipes.json')`.
  Em `selecionar(id)`: se `clipes.cartas[id]` existe e a textura `clipe-<id>` não, `this.load.spritesheet(...)` +
  `this.load.once('complete', …)` + `this.load.start()`; com a textura, um sprite em (208, 22) origem (0, 0) toca a
  anim `clipe-<id>` (`repeat: -1`, `fps` do json); na emenda (`ANIMATION_REPEAT`), um retângulo preto sobre a caixa
  vai a 1 e volta em 100ms. Sem clipe (as 4 sem movimento, ou falhou): o ícone grande centrado.

- [ ] **Step 4: A sonda confere o clipe** — em `probe-arquivo`: com `WPN_009` selecionada, em até 3s a textura
  `clipe-WPN_009` existe e o sprite do clipe está tocando (`anims.isPlaying`); com `DEF_003`, não há sprite de clipe e
  o ícone grande está visível. Rodar → `TUDO OK`.

- [ ] **Step 5: Commit** — `git commit -m "feat(arquivo): os clipes em loop — 20 cartas gravadas em jogo, carregadas sob demanda"`.

---

### Task 5: A folha final para ele aprovar

**Files:**
- Create: `docs/superpowers/folhas/2026-10-04/arquivo/arquivo-navegando.gif` e prints `arquivo-*.png`
- Modify: `docs/HANDOFF.md` (o 🧭), a spec (estado: implementada + as correções do plano)

- [ ] **Step 1: Prints e GIF** — com Playwright (molde da `probe-arquivo`): print do menu com a lista; prints do
  Arquivo em 3 cartas (WPN_009, EFF_011, DEF_003); um GIF de ~6s navegando pela grade (as setas e o clipe trocando).
- [ ] **Step 2: Rodar tudo** — os 6 `test-*` e as sondas `probe-arquivo`, `probe-cartas-novas`, `probe-sandbox`,
  `probe-teclas`, `probe-cartas`, `probe-bomba-queda`.
- [ ] **Step 3: Mostrar para ele** — abrir os prints e o GIF. Ajustes que ele pedir → voltar à task da parte.
- [ ] **Step 4: Commit + push** — docs e folha; `git push origin feat/cartas-preview`.
