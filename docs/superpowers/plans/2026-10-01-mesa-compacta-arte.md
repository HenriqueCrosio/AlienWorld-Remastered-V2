# A arte nova da mesa compacta — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a carta compacta com a moldura aprovada (M2 + o feixe da M3), a raridade na paleta P1, ícones nas cores
reais, e NENHUM texto fora do quadro ou fora do centro — cobrado por sonda nas 13 cartas e três janelas.

**Architecture:** a mesa (`CartasScene`, na camada HD) passa a ser desenhada no GRID DE PIXEL FINO (câmera em zoom =
pixel fino), com a carta no tamanho nativo da moldura (105×141). A geometria dos encaixes mora num módulo puro medido
da arte; o texto é medido, quebrado e centrado pela TINTA (`measureText().actualBoundingBox*`) por um módulo puro
testado em node. Uma sonda isola a tinta de cada texto por diferença de fotos e cobra folga e centro.

**Tech Stack:** Phaser 3.90 · TypeScript · Vite · Playwright + sharp (sondas e scripts) · Node 24 (roda `.ts` puro
direto, com o type stripping nativo) · PixelLab MCP (ícones).

**Spec:** `docs/superpowers/specs/2026-09-30-mesa-compacta-arte-design.md` (leia antes de começar).

## Global Constraints

- Branch `feat/cartas-preview`. Commits com autoria **só do Henrique** — **sem** linha `Co-Authored-By`.
- Mensagens de commit, comentários e docs em **pt-br**, no tom do código vizinho (identificadores em português).
- ⚠️ `sed`/`node -e` falham em silêncio aqui (CRLF, `${}`): **edite arquivo com a ferramenta Edit** e confira.
- As sondas precisam do `npm run dev` rodando (http://localhost:5173/).
- Paleta P1: comum `0xa8b0bc` · incomum `0x4fc85a` · rara `0x3f7bff` · épica `0xa45cff`.
- Moldura: **105×141** pixels finos. Encaixes internos: NOME `{x:24,y:4,w:57,h:11}` · VISOR `{x:13,y:20,w:78,h:67}` ·
  PLAQUETA `{x:18,y:105,w:70,h:21}` (era 68; corrigida pelo teste na Task 1). Folga mínima **2px finos**; centro a **≤1px fino**.
- Tudo dentro da carta em MAIÚSCULAS. Um tamanho só de nome para as 13; um só de efeito; efeito em 1–2 linhas,
  quebra em palavra inteira. Nenhum nome é renomeado para caber.
- **Critério de pronto (palavra dele):** *"só termine quando constatar e visualizar que não tem mais isso em todas"* —
  a `probe-mesa-texto` passando E a folha das 13 cartas olhada carta por carta e mandada para ele.

---

## Mapa dos arquivos

| Arquivo | Papel |
|---|---|
| `src/raridade.ts` (novo) | PURO: tipo `Raridade`, `COR_RARIDADE` (P1), `NOME_RARIDADE`, `RARIDADES` |
| `src/molduraCarta.ts` (novo) | PURO: `MOLDURA`, `ENCAIXE`, `FOLGA`, tipo `Caixa` — a geometria medida da arte |
| `src/textoNoEncaixe.ts` (novo) | medir a tinta (navegador) + quebrar/tamanho/posicionar (puros) |
| `scripts/gerar-molduras.mjs` (novo) | gera `moldura-<raridade>.png` ×4 e `realce-canto.png` a partir da base aprovada |
| `scripts/test-molduras.mjs` (novo) | cobra os PNGs: tamanho, cor da energia, encaixes contra a arte |
| `scripts/test-texto-encaixe.mjs` (novo) | cobra as funções puras do texto, em node |
| `scripts/probe-mesa-texto.mjs` (novo) | a sonda do critério de pronto + a folha das 13 cartas |
| `src/cartas.ts` | passa a reexportar a raridade de `raridade.ts` |
| `src/uiHD.ts` | `zoomHD` (grid fino por cena) e o aviso de troca de escala |
| `src/scenes/CartasScene.ts` | reescrita: a carta no grid fino, com moldura, encaixes e realce em pixel |
| `src/scenes/BootHDScene.ts`, `src/scenes/BootScene.ts` | carregam molduras e realce |
| `scripts/probe-vozes.mjs` | o alvo do mouse sai da geometria da mesa (as cartas mudaram de lugar) |

---

### Task 1: A raridade P1, as molduras por raridade e a geometria dos encaixes

**Files:**
- Create: `src/raridade.ts`, `src/molduraCarta.ts`, `scripts/gerar-molduras.mjs`, `scripts/test-molduras.mjs`
- Create (gerados): `public/sprites/cartas/moldura-comum.png`, `moldura-incomum.png`, `moldura-rara.png`,
  `moldura-epica.png`, `realce-canto.png`
- Modify: `src/cartas.ts` (o bloco de raridade, linhas ~24 e ~75–98)

**Interfaces:**
- Produces: `Raridade`, `COR_RARIDADE: Record<Raridade, number>`, `NOME_RARIDADE: Record<Raridade, string>`,
  `RARIDADES: Raridade[]` (de `src/raridade.ts`, reexportados por `src/cartas.ts`); `Caixa {x,y,w,h}`,
  `MOLDURA {w:105,h:141}`, `ENCAIXE: Record<'nome'|'visor'|'plaqueta', Caixa>`, `FOLGA = 2` (de
  `src/molduraCarta.ts`); texturas `moldura-<raridade>` e `realce-canto` (arquivos em `public/sprites/cartas/`).

- [ ] **Step 1: Escrever o teste**

`scripts/test-molduras.mjs`:

```js
// As molduras da carta (spec 2026-09-30-mesa-compacta-arte-design.md §2.3 e §3.1).
// Uso: node scripts/test-molduras.mjs
// Cobra: os 4 PNGs no tamanho da MOLDURA; a energia de cada um na cor da SUA raridade (e nenhum azul de energia
// sobrando fora da rara); cada ENCAIXE é miolo escuro uniforme cercado de borda — medido NA ARTE.
import fs from 'fs';
import sharp from 'sharp';
import { COR_RARIDADE, RARIDADES } from '../src/raridade.ts';
import { ENCAIXE, MOLDURA } from '../src/molduraCarta.ts';

const falhas = [];
const cobrar = (ok, msg) => { console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}`); if (!ok) falhas.push(msg); };
const DIR = 'public/sprites/cartas';

/** O "miolo" da moldura: o cinza-chumbo escuro dos encaixes (luminância média de 22 a 39). */
const noMiolo = (r, g, b) => { const l = (r + g + b) / 3; return l >= 22 && l < 40; };
const ehEnergiaAzul = (r, g, b) => b > r + 35 && b > 90;

for (const r of RARIDADES) {
  const arq = `${DIR}/moldura-${r}.png`;
  if (!fs.existsSync(arq)) { cobrar(false, `${arq} existe`); continue; }
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  cobrar(info.width === MOLDURA.w && info.height === MOLDURA.h, `${r}: ${info.width}×${info.height} = ${MOLDURA.w}×${MOLDURA.h}`);
  const px = (x, y) => { const i = (y * info.width + x) * 4; return [data[i], data[i + 1], data[i + 2], data[i + 3]]; };

  // A ENERGIA: pixels claros com a direção de cor da raridade (cosseno ≥ 0.995) — pelo menos 150.
  const cor = COR_RARIDADE[r];
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const na = Math.hypot(...alvo);
  let naCor = 0, azulSobrando = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const [R, G, B, A] = px(x, y);
    if (!A || Math.max(R, G, B) <= 90) continue;
    const cos = (R * alvo[0] + G * alvo[1] + B * alvo[2]) / (Math.hypot(R, G, B) * na);
    if (cos >= 0.995) naCor++;
    if (r !== 'rara' && ehEnergiaAzul(R, G, B)) azulSobrando++;
  }
  cobrar(naCor >= 150, `${r}: ${naCor} pixels de energia na cor da raridade (≥150)`);
  cobrar(azulSobrando === 0, `${r}: nenhum azul de energia sobrando (${azulSobrando})`);

  // OS ENCAIXES, medidos na arte: miolo ≥97% uniforme; cada lado de fora (a 1px) ≤50% miolo — é borda.
  for (const [nome, c] of Object.entries(ENCAIXE)) {
    let dentro = 0, total = 0;
    for (let y = c.y; y < c.y + c.h; y++) for (let x = c.x; x < c.x + c.w; x++) { total++; if (noMiolo(...px(x, y))) dentro++; }
    cobrar(dentro / total >= 0.97, `${r}/${nome}: miolo ${(100 * dentro / total).toFixed(1)}% uniforme (≥97%)`);
    const lados = {
      cima: Array.from({ length: c.w }, (_, i) => px(c.x + i, c.y - 1)),
      baixo: Array.from({ length: c.w }, (_, i) => px(c.x + i, c.y + c.h)),
      esquerda: Array.from({ length: c.h }, (_, i) => px(c.x - 1, c.y + i)),
      direita: Array.from({ length: c.h }, (_, i) => px(c.x + c.w, c.y + i)),
    };
    for (const [lado, pxs] of Object.entries(lados)) {
      const f = pxs.filter((p) => noMiolo(...p)).length / pxs.length;
      cobrar(f <= 0.5, `${r}/${nome}: borda de ${lado} (${(100 * f).toFixed(0)}% miolo, ≤50%)`);
    }
  }
}

const canto = `${DIR}/realce-canto.png`;
if (fs.existsSync(canto)) {
  const m = await sharp(canto).metadata();
  cobrar(m.width === 8 && m.height === 8, `realce-canto: ${m.width}×${m.height} = 8×8`);
} else cobrar(false, `${canto} existe`);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-molduras.mjs`
Expected: erro `ERR_MODULE_NOT_FOUND` para `src/raridade.ts` (o módulo ainda não existe).

- [ ] **Step 3: Criar `src/raridade.ts`**

```ts
/**
 * A RARIDADE das cartas — a cor e o nome (spec 2026-09-30-mesa-compacta-arte-design.md §2.1).
 *
 * Módulo PURO (sem Phaser): o script que gera as molduras (`scripts/gerar-molduras.mjs`) e o teste delas importam
 * daqui, em node. O resto do jogo continua importando de `cartas.ts`, que reexporta.
 */
export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica';

/** Da mais baixa para a mais alta. */
export const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica'];

/**
 * A paleta P1 — a convenção (WoW/Borderlands/Destiny), a que o jogador já traz: cinza · verde · azul · roxo. O
 * LARANJA fica livre para uma futura lendária. O azul é FUNDO de propósito: o ciano `0x3ee0f0` é da nave e da HUD.
 * (Até 30/09 era cinza/ciano/roxo/laranja — folha `folhas/2026-09-30/raridade-paletas.png`.)
 */
export const COR_RARIDADE: Record<Raridade, number> = {
  comum: 0xa8b0bc,
  incomum: 0x4fc85a,
  rara: 0x3f7bff,
  epica: 0xa45cff,
};

export const NOME_RARIDADE: Record<Raridade, string> = {
  comum: 'COMUM',
  incomum: 'INCOMUM',
  rara: 'RARA',
  epica: 'ÉPICA',
};
```

- [ ] **Step 4: Fazer `src/cartas.ts` reexportar**

Com a ferramenta Edit, em `src/cartas.ts`:

1. No topo do arquivo, junto dos outros `import`, acrescentar:

```ts
import { RARIDADES, type Raridade } from './raridade';
```

   e trocar a linha `export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica';` por:

```ts
export { COR_RARIDADE, NOME_RARIDADE, RARIDADES, type Raridade } from './raridade';
```

2. Apagar o bloco inteiro de `/** A cor da raridade — é a ENERGIA da carta ... */ export const COR_RARIDADE ...`
   até o fim de `export const NOME_RARIDADE ... };` (as duas constantes saem daqui; agora moram em `raridade.ts`).

3. Trocar `const ORDEM: Raridade[] = ['comum', 'incomum', 'rara', 'epica'];` por `const ORDEM = RARIDADES;`

Run: `npx tsc --noEmit`
Expected: sem erro.

- [ ] **Step 5: Criar `src/molduraCarta.ts`**

```ts
/**
 * A MOLDURA da carta compacta — a geometria MEDIDA da arte aprovada (spec 2026-09-30-mesa-compacta-arte-design.md
 * §3.1). Módulo PURO.
 *
 * Unidade: o pixel da moldura = o PIXEL FINO da camada HD (a mesa é desenhada nesse grid, §2.4). Os retângulos são
 * INTERNOS (o miolo escuro, sem a borda), com origem no canto superior esquerdo da moldura. Nenhum texto da carta
 * tem coordenada digitada: todo texto se posiciona por um destes encaixes. `scripts/test-molduras.mjs` cobra estes
 * números contra os PNGs.
 */
export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A moldura inteira (`sprites/cartas/moldura-<raridade>.png`). */
export const MOLDURA = { w: 105, h: 141 } as const;

export const ENCAIXE: Record<'nome' | 'visor' | 'plaqueta', Caixa> = {
  /** O encaixe do topo: o nome, uma linha. */
  nome: { x: 24, y: 4, w: 57, h: 11 },
  /** O visor (contornado pela energia): o "REQUER…" no topo, o ícone no meio, a raridade no pé. */
  visor: { x: 13, y: 20, w: 78, h: 67 },
  /** A plaqueta de baixo: o efeito, uma ou duas linhas. */
  plaqueta: { x: 18, y: 105, w: 70, h: 21 },
};

/** A folga mínima entre a tinta de um texto e a borda do encaixe — e entre dois elementos do visor (§3.2). */
export const FOLGA = 2;
```

- [ ] **Step 6: Criar `scripts/gerar-molduras.mjs`**

```js
// Gera as 4 molduras da carta (uma por raridade) e o canto do realce, a partir da arte APROVADA
// (spec 2026-09-30-mesa-compacta-arte-design.md §2.3). Reprodutível: rode de novo se a base ou a paleta mudarem.
// Uso: node scripts/gerar-molduras.mjs
import sharp from 'sharp';
import { COR_RARIDADE, RARIDADES } from '../src/raridade.ts';

const BASE = 'docs/superpowers/folhas/2026-09-30/moldura-final-base.png';
const DESTINO = 'public/sprites/cartas';

/** A ENERGIA da moldura é o azul dominante (o filete do visor e o feixe do pé). */
const ehEnergia = (r, g, b) => b > r + 35 && b > 90;

const { data, info } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const r of RARIDADES) {
  const cor = COR_RARIDADE[r];
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || !ehEnergia(data[i], data[i + 1], data[i + 2])) continue;
    // Troca a cor e mantém o BRILHO do pixel (o miolo do feixe continua mais aceso que a borda dele).
    const k = Math.min(1.35, data[i + 2] / 200);
    for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(alvo[c] * k));
  }
  await sharp(out, { raw: info }).png().toFile(`${DESTINO}/moldura-${r}.png`);
  console.log(`${DESTINO}/moldura-${r}.png`);
}

// O CANTO DO REALCE (8×8): um L de 2px no amarelo do foco (hotBright 0xffd447) com 1px de contorno escuro. Este é o
// canto SUPERIOR ESQUERDO; a cena usa quatro cópias espelhadas (setFlip).
const C = 8;
const AMARELO = [0xff, 0xd4, 0x47, 255];
const ESCURO = [5, 6, 13, 255];
const canto = Buffer.alloc(C * C * 4);
const noL = (x, y) => x >= 1 && y >= 1 && (x <= 2 || y <= 2);
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
  if (noL(x, y)) { canto.set(AMARELO, (y * C + x) * 4); continue; }
  let vizinho = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (noL(x + dx, y + dy)) vizinho = true;
  if (vizinho) canto.set(ESCURO, (y * C + x) * 4);
}
await sharp(canto, { raw: { width: C, height: C, channels: 4 } }).png().toFile(`${DESTINO}/realce-canto.png`);
console.log(`${DESTINO}/realce-canto.png`);
```

- [ ] **Step 7: Gerar e rodar o teste**

Run: `node scripts/gerar-molduras.mjs && node scripts/test-molduras.mjs`
Expected: 5 arquivos escritos e `TUDO OK`.

⚠️ Se uma cobrança de ENCAIXE falhar, **meça de novo, não afrouxe o teste**: imprima o mapa de luminância da
`moldura-comum.png` (um caractere por pixel: `.` <22, `:` 22–39, `+` 40–69, `o` ≥70) nas linhas do encaixe, ache o
retângulo de `:` e corrija o número em `ENCAIXE` (e na tabela da spec §3.1, no mesmo commit).

- [ ] **Step 8: Typecheck e commit**

Run: `npx tsc --noEmit` — Expected: sem erro.

```bash
git add src/raridade.ts src/molduraCarta.ts src/cartas.ts scripts/gerar-molduras.mjs scripts/test-molduras.mjs public/sprites/cartas/moldura-*.png public/sprites/cartas/realce-canto.png
git commit -m "feat(cartas): a raridade na P1 e as molduras por raridade, com os encaixes medidos da arte"
```

---

### Task 2: O texto no encaixe — medir, quebrar e centrar pela tinta

**Files:**
- Create: `src/textoNoEncaixe.ts`, `scripts/test-texto-encaixe.mjs`

**Interfaces:**
- Consumes: `Caixa` (de `src/molduraCarta.ts`, Task 1).
- Produces (de `src/textoNoEncaixe.ts`):
  - `interface Tinta { x0: number; x1: number; asc: number; desc: number }` — a tinta de uma linha, relativa ao ponto
    de alinhamento (x) e à linha de base (y);
  - `type Medir = (texto: string, px: number) => Tinta`;
  - `medidorDaFonte(familia: string): Medir` (navegador);
  - `largura(t: Tinta): number`;
  - `quebrar(texto: string, px: number, medir: Medir, larguraMax: number, maxLinhas: 1 | 2): string[] | null`;
  - `passoDaLinha(px: number): number`;
  - `alturaDoBloco(linhas: string[], px: number, medir: Medir): number`;
  - `tamanhoUnico(textos: string[], caixa: { w: number; h: number }, maxLinhas: 1 | 2, medir: Medir, maxPx: number, folga: number): number`;
  - `posicionar(linhas: string[], px: number, medir: Medir, caixa: Caixa, vertical: 'centro' | 'topo' | 'pe', folga: number): { x: number; base: number }[]`.

- [ ] **Step 1: Escrever o teste**

`scripts/test-texto-encaixe.mjs`:

```js
// As funções PURAS do texto no encaixe (spec 2026-09-30 §3.2), com uma fonte de mentira: cada letra tem 3/5·px de
// largura, a tinta sobe 7/10·px e não desce (frações escritas como divisão: 0.6 não é exato em ponto flutuante e
// faria 100·0.6 passar de 60). Uso: node scripts/test-texto-encaixe.mjs
import { alturaDoBloco, posicionar, quebrar, tamanhoUnico } from '../src/textoNoEncaixe.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};
const medir = (t, px) => ({ x0: 0, x1: (t.length * px * 3) / 5, asc: (px * 7) / 10, desc: 0 });

// quebrar
igual(quebrar('2 PROJÉTEIS', 10, medir, 70, 2), ['2 PROJÉTEIS'], 'cabe numa linha → uma linha');
igual(quebrar('EXPLODE AO ACERTAR', 10, medir, 60, 2), ['EXPLODE AO', 'ACERTAR'], 'duas linhas, a quebra mais equilibrada (empate → 1ª linha mais longa)');
igual(quebrar('EXPLODE AO ACERTAR', 10, medir, 60, 1), null, 'só uma linha permitida e não cabe → null');
igual(quebrar('ATRAVESSAINIMIGOS', 10, medir, 60, 2), null, 'palavra que sozinha não cabe → null (nunca parte a palavra)');

// alturaDoBloco: 1 linha = asc+desc; 2 linhas = asc + passo + desc (passo = ceil(1.25·px))
igual(alturaDoBloco(['A'], 10, medir), 7, 'altura de uma linha');
igual(alturaDoBloco(['A', 'B'], 10, medir), 7 + 13, 'altura de duas linhas');

// tamanhoUnico: o MAIOR px (de ¼ em ¼) em que todos cabem com a folga
igual(tamanhoUnico(['AB', 'ABCDEFGHIJ'], { w: 40, h: 20 }, 1, medir, 10, 2), 6, 'tamanho único limitado pelo mais longo');
let lancou = false;
try { tamanhoUnico(['ABCDEFGHIJKLMNOPQRSTUVWXYZ'], { w: 20, h: 20 }, 1, medir, 10, 2); } catch { lancou = true; }
igual(lancou, true, 'nenhum tamanho cabe → lança erro (melhor quebrar o teste que vazar)');

// posicionar: a TINTA centrada; topo/pé a `folga` da borda (arredondando PARA DENTRO)
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 21 }, 'centro', 2), [{ x: 8, base: 14 }], 'centro: tinta 24×7 no meio de 40×21');
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 67 }, 'topo', 2.5), [{ x: 8, base: 10 }], 'topo: tinta começa em ≥2.5');
igual(posicionar(['ABCD'], 10, medir, { x: 0, y: 0, w: 40, h: 67 }, 'pe', 2.5), [{ x: 8, base: 64 }], 'pé: tinta acaba em ≤64.5');
igual(posicionar(['ABCD', 'AB'], 10, medir, { x: 0, y: 0, w: 40, h: 40 }, 'centro', 2), [{ x: 8, base: 17 }, { x: 14, base: 30 }], 'duas linhas: bloco centrado, cada linha centrada');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

(Conta do último caso: bloco = 7 + 13 + 0 = 20; topo da tinta = (40−20)/2 = 10; base0 = 10 + 7 = 17; a 2ª linha
fica 13 abaixo = 30; 'AB' tem 12 de largura → x = (40−12)/2 = 14.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-texto-encaixe.mjs`
Expected: `ERR_MODULE_NOT_FOUND` para `src/textoNoEncaixe.ts`.

- [ ] **Step 3: Criar `src/textoNoEncaixe.ts`**

```ts
import type { Caixa } from './molduraCarta';

/**
 * O TEXTO NO ENCAIXE — medir, quebrar e centrar pela TINTA (spec 2026-09-30-mesa-compacta-arte-design.md §3).
 *
 * A caixa de um objeto de texto inclui o espaço de acento e de descendente: centrar pela caixa joga a palavra em
 * maiúsculas para fora do meio (o defeito que ele apontou na folha de 30/09). Aqui tudo é pela tinta — o retângulo
 * dos pixels acesos que o navegador mede (`measureText().actualBoundingBox*`).
 *
 * As funções de layout são PURAS (recebem a medida como função) — `scripts/test-texto-encaixe.mjs` as cobra em node.
 * Só `medidorDaFonte` toca o navegador.
 */

/** A tinta de UMA linha, relativa ao ponto de alinhamento (x) e à linha de base (y), em unidades da cena. */
export interface Tinta {
  x0: number;
  x1: number;
  asc: number;
  desc: number;
}

export type Medir = (texto: string, px: number) => Tinta;

/** Mede numa escala grande e divide: a medida não depende da janela, e o layout da carta sai IGUAL em todas. */
const ESCALA_MEDIDA = 8;
let ctx: CanvasRenderingContext2D | null = null;
const cache = new Map<string, Tinta>();

/** A medida da tinta numa família CSS (a mesma string que o Phaser põe no `font` do texto). */
export function medidorDaFonte(familia: string): Medir {
  return (texto, px) => {
    const chave = `${familia}|${px}|${texto}`;
    const tem = cache.get(chave);
    if (tem) return tem;
    if (!ctx) ctx = document.createElement('canvas').getContext('2d')!;
    ctx.font = `${px * ESCALA_MEDIDA}px ${familia}`;
    const m = ctx.measureText(texto);
    const t: Tinta = {
      x0: -m.actualBoundingBoxLeft / ESCALA_MEDIDA,
      x1: m.actualBoundingBoxRight / ESCALA_MEDIDA,
      asc: m.actualBoundingBoxAscent / ESCALA_MEDIDA,
      desc: m.actualBoundingBoxDescent / ESCALA_MEDIDA,
    };
    cache.set(chave, t);
    return t;
  };
}

export const largura = (t: Tinta): number => t.x1 - t.x0;

/**
 * Uma ou duas linhas, quebradas em PALAVRA inteira (nunca no meio). Entre as quebras possíveis, a de linha mais
 * longa mais curta — as duas linhas ficam equilibradas; no empate, a 1ª linha mais longa ("EXPLODE AO / ACERTAR").
 * `null` se não couber em `maxLinhas`.
 */
export function quebrar(texto: string, px: number, medir: Medir, larguraMax: number, maxLinhas: 1 | 2): string[] | null {
  const larg = (t: string) => largura(medir(t, px));
  if (larg(texto) <= larguraMax) return [texto];
  if (maxLinhas === 1) return null;
  const palavras = texto.split(' ');
  let melhor: string[] | null = null;
  let menorMaior = Infinity;
  for (let i = 1; i < palavras.length; i++) {
    const linhas = [palavras.slice(0, i).join(' '), palavras.slice(i).join(' ')];
    const maior = Math.max(...linhas.map(larg));
    if (maior > larguraMax) continue;
    if (maior <= menorMaior) {
      menorMaior = maior;
      melhor = linhas;
    }
  }
  return melhor;
}

/** A distância entre as linhas de base de duas linhas seguidas (inteira: a linha cai no pixel). */
export const passoDaLinha = (px: number): number => Math.ceil(px * 1.25);

/** A altura da TINTA de um bloco de linhas: do topo da 1ª ao pé da última. */
export function alturaDoBloco(linhas: string[], px: number, medir: Medir): number {
  const primeira = medir(linhas[0], px);
  const ultima = medir(linhas[linhas.length - 1], px);
  return primeira.asc + (linhas.length - 1) * passoDaLinha(px) + ultima.desc;
}

/**
 * O MAIOR tamanho (de `maxPx` para baixo, de ¼ em ¼) em que TODOS os textos cabem na caixa com a folga — um tamanho
 * só para todas as cartas (spec §3.2, regras 4 e 5). Lança erro se nada ≥5 couber: melhor quebrar a mesa no teste
 * que deixar texto vazar (o remédio é reescrever o `curto` da carta, não encolher a letra dela).
 */
export function tamanhoUnico(
  textos: string[],
  caixa: { w: number; h: number },
  maxLinhas: 1 | 2,
  medir: Medir,
  maxPx: number,
  folga: number,
): number {
  for (let px = maxPx; px >= 5; px -= 0.25) {
    const cabe = textos.every((t) => {
      const linhas = quebrar(t, px, medir, caixa.w - 2 * folga, maxLinhas);
      return linhas !== null && alturaDoBloco(linhas, px, medir) <= caixa.h - 2 * folga;
    });
    if (cabe) return px;
  }
  throw new Error(`[textoNoEncaixe] nenhum tamanho ≥5 cabe em ${caixa.w}×${caixa.h}: ${textos.join(' | ')}`);
}

/**
 * Onde pôr cada linha para a TINTA do bloco ficar no lugar: o ponto de alinhamento (`x`) e a linha de base (`base`)
 * de cada linha, em unidades INTEIRAS. Na horizontal, cada linha centrada pela tinta. Na vertical: `'centro'` centra
 * o bloco; `'topo'` e `'pe'` encostam a tinta a `folga` da borda — arredondando PARA DENTRO, para a folga nunca
 * encolher no arredondamento.
 */
export function posicionar(
  linhas: string[],
  px: number,
  medir: Medir,
  caixa: Caixa,
  vertical: 'centro' | 'topo' | 'pe',
  folga: number,
): { x: number; base: number }[] {
  const altura = alturaDoBloco(linhas, px, medir);
  const topoTinta =
    vertical === 'centro' ? caixa.y + (caixa.h - altura) / 2
    : vertical === 'topo' ? caixa.y + folga
    : caixa.y + caixa.h - folga - altura;
  const arred = vertical === 'topo' ? Math.ceil : vertical === 'pe' ? Math.floor : Math.round;
  const base0 = arred(topoTinta + medir(linhas[0], px).asc);
  return linhas.map((l, i) => {
    const t = medir(l, px);
    return { x: Math.round(caixa.x + (caixa.w - largura(t)) / 2 - t.x0), base: base0 + i * passoDaLinha(px) };
  });
}
```

- [ ] **Step 4: Rodar o teste**

Run: `node scripts/test-texto-encaixe.mjs`
Expected: `TUDO OK` (um aviso `ExperimentalWarning` do type stripping pode aparecer — é normal).

Run: `npx tsc --noEmit` — Expected: sem erro.

- [ ] **Step 5: Commit**

```bash
git add src/textoNoEncaixe.ts scripts/test-texto-encaixe.mjs
git commit -m "feat(cartas): o texto no encaixe — medir, quebrar e centrar pela tinta"
```

---

### Task 3: A mesa no grid fino — a carta com moldura, encaixes e realce em pixel

**Files:**
- Create: `scripts/probe-mesa-texto.mjs`
- Modify: `src/uiHD.ts` (`prepararCameraHD`, `alinhar`, novas exportações)
- Modify: `src/scenes/CartasScene.ts` (reescrita)
- Modify: `src/scenes/BootHDScene.ts`, `src/scenes/BootScene.ts:991-993`
- Modify: `scripts/probe-vozes.mjs:86-89` (o alvo do mouse)

**Interfaces:**
- Consumes: `COR_RARIDADE`, `NOME_RARIDADE`, `RARIDADES` (Task 1, via `../cartas`); `ENCAIXE`, `FOLGA`, `MOLDURA`,
  `Caixa` (Task 1); `medidorDaFonte`, `posicionar`, `quebrar`, `tamanhoUnico`, `Medir` (Task 2); texturas
  `moldura-<raridade>`, `realce-canto`, `icone-<ID>`.
- Produces: em `src/uiHD.ts`: `zoomHD(scene): number`, `EVENTO_ESCALA = 'escala-hd'`. Na `CartasScene` (lida pela
  sonda): `cartas: Container[]` (cada um no canto superior esquerdo da carta, em px finos), `grupos: Grupo[][]`
  (`{ tipo, objs, caixa, centrarX, centrarY, tinta }`), `geometria()`.

- [ ] **Step 1: Escrever a sonda**

`scripts/probe-mesa-texto.mjs`:

```js
// A MESA — nenhum texto fora do quadro, nenhum fora do centro (spec 2026-09-30-mesa-compacta-arte-design.md §3.3).
// Uso: node scripts/probe-mesa-texto.mjs <dir-da-folha>   (com `npm run dev` rodando)
//
// Monta as 13 cartas (em lotes de 3) em 1152×648, 1920×1080 e 2560×1440. Para CADA grupo (nome, efeito, requer,
// raridade, ícone) de CADA carta, isola a TINTA por diferença de fotos (o grupo apagado × só ele aceso) e cobra:
// - a tinta dentro da caixa com ≥2px finos de folga nos quatro lados;
// - o centro da tinta a ≤1px fino do centro da caixa (nos eixos que o grupo centra);
// - no visor, ≥2px finos entre "requer", ícone e raridade, nessa ordem de cima para baixo.
// Escreve <dir>/mesa-13-cartas.png: as 13 cartas em 1152 (2×, sem suavizar) e em 1920 (1×).
import { chromium } from 'playwright';
import sharp from 'sharp';

const OUT = process.argv[2] ?? '.';
const FOLGA = 2;
const CENTRO = 1;
const LIMIAR = 48; // diferença de cor (soma dos 3 canais) que conta como tinta
const MARGEM_FOTO = 6; // px finos em volta da carta na foto
const JANELAS = [[1152, 648], [1920, 1080], [2560, 1440]];

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const falhas = [];
const cobrar = (ok, msg) => { if (!ok) { console.log(`FALHA ${msg}`); falhas.push(msg); } };
const folha = { 1152: [], 1920: [] };
const raw = (png) => sharp(png).raw().toBuffer({ resolveWithObject: true });

function diferenca(a, b) {
  const { data: A, info } = a;
  const B = b.data;
  const ch = info.channels;
  let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * ch;
    if (Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) > LIMIAR) {
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

for (const [W, H] of JANELAS) {
  const tag = `${W}x${H}`;
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);
  const ids = await page.evaluate(async () => {
    const { CARTAS } = await import('/src/cartas.ts');
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('tierNave', 1);
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
    return Object.keys(CARTAS);
  });
  await page.waitForTimeout(4000);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.invulnerableUntil = s.time.now + 1e7;
    s.scene.pause();
  });

  let grupos = 0;
  for (let l = 0; l < ids.length; l += 3) {
    const lote = ids.slice(l, l + 3);
    await page.evaluate((lote) => {
      const hd = window.__gameHD;
      if (hd.scene.getScene('Cartas').sys.isActive()) hd.scene.stop('Cartas');
      window.__game.scene.stop('Cartas');
      window.__game.scene.getScene('Game').scene.launch('Cartas', { opcoes: lote, titulo: 'SUPRIMENTO ENCONTRADO', onEscolha: () => {} });
    }, lote);
    await page.waitForTimeout(1200);
    const geo = await page.evaluate(() => {
      const hd = window.__gameHD;
      const c = hd.scene.getScene('Cartas');
      const r = hd.canvas.getBoundingClientRect();
      return { ...c.geometria(), z: c.cameras.main.zoom * (r.width / hd.canvas.width), left: r.left, top: r.top };
    });
    const eps = 0.5 / geo.z; // meio pixel de tela, em px finos
    const vis = (i, g, v) => page.evaluate(([i, g, v]) => {
      const c = window.__gameHD.scene.getScene('Cartas');
      c.grupos[i].forEach((gr, j) => (g === null || j === g) && gr.objs.forEach((o) => o.setVisible(v)));
    }, [i, g, v]);

    for (const [i, carta] of geo.cartas.entries()) {
      const clip = {
        x: geo.left + (carta.x - MARGEM_FOTO) * geo.z, y: geo.top + (carta.y - MARGEM_FOTO) * geo.z,
        width: (geo.moldura.w + 2 * MARGEM_FOTO) * geo.z, height: (geo.moldura.h + 2 * MARGEM_FOTO) * geo.z,
      };
      if (folha[W]) folha[W].push(await page.screenshot({ clip }));
      await vis(i, null, false);
      await page.waitForTimeout(60);
      const base = await raw(await page.screenshot({ clip }));
      const tintas = [];
      for (const [g, gr] of carta.grupos.entries()) {
        await vis(i, g, true);
        await page.waitForTimeout(60);
        const bb = diferenca(base, await raw(await page.screenshot({ clip })));
        await vis(i, g, false);
        grupos++;
        const nome = `${tag} ${carta.id} ${gr.tipo}`;
        if (!bb) { cobrar(false, `${nome}: nenhuma tinta`); continue; }
        // A tinta em px finos, relativa à carta.
        const t = {
          x0: bb.x0 / geo.z - MARGEM_FOTO, x1: (bb.x1 + 1) / geo.z - MARGEM_FOTO,
          y0: bb.y0 / geo.z - MARGEM_FOTO, y1: (bb.y1 + 1) / geo.z - MARGEM_FOTO,
        };
        const c = gr.caixa;
        const f = { esq: t.x0 - c.x, dir: c.x + c.w - t.x1, cima: t.y0 - c.y, baixo: c.y + c.h - t.y1 };
        for (const [lado, v] of Object.entries(f)) cobrar(v >= FOLGA - eps, `${nome}: folga ${lado} ${v.toFixed(2)} (≥${FOLGA})`);
        if (gr.centrarX) {
          const d = (t.x0 + t.x1) / 2 - (c.x + c.w / 2);
          cobrar(Math.abs(d) <= CENTRO + eps, `${nome}: fora do centro na horizontal por ${d.toFixed(2)} (≤${CENTRO})`);
        }
        if (gr.centrarY) {
          const d = (t.y0 + t.y1) / 2 - (c.y + c.h / 2);
          cobrar(Math.abs(d) <= CENTRO + eps, `${nome}: fora do centro na vertical por ${d.toFixed(2)} (≤${CENTRO})`);
        }
        tintas.push({ tipo: gr.tipo, ...t });
      }
      await vis(i, null, true);
      const ordem = ['requer', 'icone', 'raridade'].map((tp) => tintas.find((t) => t.tipo === tp)).filter(Boolean);
      for (let j = 1; j < ordem.length; j++) {
        const vao = ordem[j].y0 - ordem[j - 1].y1;
        cobrar(vao >= FOLGA - eps, `${tag} ${carta.id}: ${ordem[j - 1].tipo}→${ordem[j].tipo} a ${vao.toFixed(2)} (≥${FOLGA})`);
      }
    }
  }
  cobrar(grupos >= 13 * 4, `${tag}: ${grupos} grupos medidos (≥52)`);
  cobrar(erros.length === 0, `${tag}: zero erro${erros.length ? ` (${erros.slice(0, 3).join(' | ')})` : ''}`);
  console.log(`${tag}: ${grupos} grupos medidos`);
  await page.close();
}
await browser.close();

// A FOLHA: 13 cartas por janela, 7 por linha.
const blocos = [];
let y = 20;
for (const [W, zoom] of [[1152, 2], [1920, 1]]) {
  const fotos = await Promise.all(folha[W].map(async (f) => {
    const m = await sharp(f).metadata();
    return { buf: await sharp(f).resize(m.width * zoom, m.height * zoom, { kernel: 'nearest' }).toBuffer(), w: m.width * zoom, h: m.height * zoom };
  }));
  if (!fotos.length) continue;
  const fw = fotos[0].w + 16, fh = fotos[0].h + 16;
  fotos.forEach((f, i) => blocos.push({ input: f.buf, left: 20 + (i % 7) * fw, top: y + Math.floor(i / 7) * fh }));
  y += Math.ceil(fotos.length / 7) * fh + 30;
}
const largura = Math.max(...blocos.map((b) => b.left)) + 600;
await sharp({ create: { width: largura, height: y, channels: 4, background: '#0b0d14' } }).composite(blocos).png().toFile(`${OUT}/mesa-13-cartas.png`);
console.log(`folha: ${OUT}/mesa-13-cartas.png`);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run (com `npm run dev` rodando): `node scripts/probe-mesa-texto.mjs "$TEMP"`
Expected: FALHA — `c.geometria is not a function` (a mesa de hoje não expõe a geometria).

- [ ] **Step 3: `src/uiHD.ts` — o grid fino por cena e o aviso de escala**

Com a ferramenta Edit:

1. Logo abaixo de `export const pixelFino = ...`, acrescentar:

```ts
/**
 * As cenas da camada desenhadas no GRID DE PIXEL FINO (spec 2026-09-30-mesa-compacta-arte-design.md §2.4): câmera em
 * zoom = pixel fino, coordenadas em pixels finos — a arte delas cai pixel a pixel na tela em qualquer janela. Hoje,
 * só a mesa.
 */
const CENAS_FINAS = new Set(['Cartas']);

/** O zoom da câmera de uma cena da camada: `s` (coordenadas do mundo) ou o pixel fino (coordenadas finas). */
export const zoomHD = (scene: Phaser.Scene): number => (CENAS_FINAS.has(scene.scene.key) ? pixelFino() : s);

/** Emitido em `jogoHD().events` quando a escala da tela muda (janela, tela cheia) — depois das câmeras refeitas. */
export const EVENTO_ESCALA = 'escala-hd';
```

2. Em `prepararCameraHD`, trocar `.setZoom(s)` por `.setZoom(zoomHD(scene))`, e o comentário dela por
   `/** Cena da camada: câmera a partir do canto, no zoom dela (`zoomHD`). */`.

3. Em `alinhar`, logo depois de `for (const restyle of textos.values()) restyle(s);` (ainda dentro do `if`),
   acrescentar: `jogo.events.emit(EVENTO_ESCALA, s);`

Run: `npx tsc --noEmit` — Expected: sem erro.

- [ ] **Step 4: Carregar molduras e realce nos dois boots**

`src/scenes/BootHDScene.ts` — trocar o import e o `preload`:

```ts
import { ICONES_CARTAS, RARIDADES } from '../cartas';
```

```ts
  preload(): void {
    ICONES_CARTAS.forEach((id) => this.load.image(`icone-${id}`, `sprites/cartas/icone-${id}.png`));
    RARIDADES.forEach((r) => this.load.image(`moldura-${r}`, `sprites/cartas/moldura-${r}.png`));
    this.load.image('realce-canto', 'sprites/cartas/realce-canto.png');
  }
```

(E no comentário da classe, `(hoje, só a mesa: os ícones das cartas)` → `(hoje, só a mesa: molduras, ícones e o
realce)`.)

`src/scenes/BootScene.ts` — trocar `import { ICONES_CARTAS } from '../cartas';` por
`import { ICONES_CARTAS, RARIDADES } from '../cartas';`, e logo abaixo da linha
`...Object.fromEntries(ICONES_CARTAS.map((id) => [`icone-${id}`, `sprites/cartas/icone-${id}.png`])),` acrescentar:

```ts
  // A MOLDURA da carta por raridade e o canto do realce (spec 2026-09-30) — para a mesa sem a camada.
  ...Object.fromEntries(RARIDADES.map((r) => [`moldura-${r}`, `sprites/cartas/moldura-${r}.png`])),
  'realce-canto': 'sprites/cartas/realce-canto.png',
```

- [ ] **Step 5: Reescrever `src/scenes/CartasScene.ts`**

Substituir o arquivo inteiro por:

```ts
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { FAMILIA, fontesOk } from '../fonte';
import { EVENTO_ESCALA, ehHD, escalaHD, jogoHD, mouseHD, pixelFino, prepararCameraHD, registrarTextoHD } from '../uiHD';
import { CARTAS, COR_RARIDADE, NOME_RARIDADE, type CartaDef } from '../cartas';
import { ENCAIXE, FOLGA, MOLDURA, type Caixa } from '../molduraCarta';
import { medidorDaFonte, posicionar, quebrar, tamanhoUnico, type Medir } from '../textoNoEncaixe';

/**
 * A MESA DE CARTAS — o COMPACTO (decisão de 29/09: *"traz mais foco no conteúdo, deixa mais o background do jogo à
 * vista"*), com a arte de 30/09 (spec `2026-09-30-mesa-compacta-arte-design.md`): a moldura M2 + o feixe da M3, a
 * raridade na moldura (o filete do visor, o feixe do pé e a palavra), os ícones nas cores reais.
 *
 * Uma cena SOBREPOSTA (`scene.launch`), não objetos dentro da cena de baixo, por dois motivos:
 * - a fase PAUSA inteira por baixo (`scene.pause` congela física, tweens, timers e o relógio do roteiro) — escolher
 *   carta com tiro vindo na cara não é escolha, é punição;
 * - a mesa não passa pela Atmosfera da fase: a carta fica LIMPA, como a HUD.
 *
 * Ela MORA NA CAMADA HD (`uiHD.ts`) e fala com a voz do PILOTO. A cena 'Cartas' do mundo continua sendo a que a fase
 * lança: ela fica viva e vazia (a fase segue vendo 'Cartas' ativa) e repassa a mesa para a 'Cartas' da camada, que
 * desenha e responde — teclado e mouse. Sem a camada, a mesa roda no próprio mundo.
 *
 * ⚠️ O GRID DE PIXEL FINO: na camada, esta cena tem câmera em zoom = pixel fino (`zoomHD`), e TODA coordenada daqui é
 * em pixels finos. A carta tem o tamanho nativo da moldura (105×141): cai pixel a pixel em qualquer janela, e o
 * texto que cabe numa cabe em todas. (Sem a camada, 1 pixel fino = 1 pixel do mundo.)
 *
 * ⚠️ NENHUM TEXTO TEM COORDENADA DIGITADA: tudo sai de um ENCAIXE da moldura (`molduraCarta.ts`) e é centrado pela
 * TINTA (`textoNoEncaixe.ts`). A sonda `probe-mesa-texto` cobra folga e centro nas 13 cartas.
 */
export interface CartasData {
  opcoes: string[];
  titulo: string;
  onEscolha: (id: string) => void;
  /** ESC: sair do jogo. Só a cutscene passa (a fase tem o ESC dela, e ela está pausada por baixo). */
  onSair?: () => void;
}

type TipoGrupo = 'nome' | 'efeito' | 'requer' | 'raridade' | 'icone';

/** Um elemento da carta e a caixa em que ele tem de caber — relativa ao canto da carta, em px finos. */
interface Grupo {
  tipo: TipoGrupo;
  objs: Phaser.GameObjects.GameObject[];
  caixa: Caixa;
  centrarX: boolean;
  centrarY: boolean;
  /** Topo e pé da tinta (calculados), para empilhar o visor. */
  tinta: { topo: number; pe: number };
}

/** O vão entre duas cartas (px finos). */
const VAO = 12;
/** Folga de DESENHO além da cobrada (`FOLGA`): o navegador desenha a letra com até ½px de diferença da medida. */
const MARGEM = 0.5;
/** O texto da carta não passa disto (px finos): acima, a carta vira cartaz. */
const MAX_PX = 10;
/** Título e ajuda, fora da carta (px finos — em 1152 são os 9 e 7 do mundo de antes). */
const PX_TITULO = 13;
const PX_AJUDA = 10;

interface Tamanhos {
  nome: number;
  efeito: number;
  raridade: number;
  requer: number;
}

const textoRequer = (c: CartaDef): string => `REQUER ${CARTAS[c.requer!].nome}`;

/** UM tamanho por tipo de texto, para as 13 cartas (spec §3.2): calculado uma vez, pelo texto mais longo de cada. */
let tamanhos: Tamanhos | null = null;
function calcularTamanhos(medir: Medir): Tamanhos {
  const todas = Object.values(CARTAS);
  const f = FOLGA + MARGEM;
  const nome = tamanhoUnico(todas.map((c) => c.nome), ENCAIXE.nome, 1, medir, MAX_PX, f);
  return {
    nome,
    efeito: tamanhoUnico(todas.map((c) => c.curto), ENCAIXE.plaqueta, 2, medir, nome, f),
    raridade: tamanhoUnico(Object.values(NOME_RARIDADE), ENCAIXE.visor, 1, medir, nome, f),
    requer: tamanhoUnico(todas.filter((c) => c.requer).map(textoRequer), ENCAIXE.visor, 1, medir, nome - 1, f),
  };
}

export class CartasScene extends Phaser.Scene {
  private opcoes: CartaDef[] = [];
  private onEscolha: (id: string) => void = () => {};
  private cursor = 1;
  private cartas: Phaser.GameObjects.Container[] = [];
  private grupos: Grupo[][] = [];
  private realces: Phaser.GameObjects.Image[][] = [];
  private zonas: Phaser.GameObjects.Zone[] = [];
  private fechando = false;
  private familia = 'monospace';
  private medir!: Medir;
  private escurecer!: Phaser.GameObjects.Rectangle;
  private faixa!: Phaser.GameObjects.Rectangle;
  private titulo!: Phaser.GameObjects.Text;
  private ajuda!: Phaser.GameObjects.Text;

  constructor() {
    super('Cartas');
  }

  create(data: CartasData): void {
    const hd = jogoHD();
    if (hd && !ehHD(this)) {
      this.repassar(hd, data);
      return;
    }
    if (ehHD(this)) {
      prepararCameraHD(this);
      mouseHD(true);
      this.game.events.on(EVENTO_ESCALA, this.posicionar, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        mouseHD(false);
        this.game.events.off(EVENTO_ESCALA, this.posicionar, this);
      });
    }

    this.opcoes = data.opcoes.map((id) => CARTAS[id]).filter(Boolean);
    this.onEscolha = data.onEscolha;
    this.cursor = Math.min(1, this.opcoes.length - 1);
    this.cartas = [];
    this.grupos = [];
    this.realces = [];
    this.zonas = [];
    this.fechando = false;
    this.familia = fontesOk().piloto ? FAMILIA.piloto : 'monospace';
    this.medir = medidorDaFonte(this.familia);
    if (!tamanhos) tamanhos = calcularTamanhos(this.medir);

    // O jogo aparece por trás, escurecido (as referências mostram a ação por baixo da escolha). A faixa do título
    // apaga a HUD da fase por baixo: os dois textos moram na mesma altura.
    this.escurecer = this.add.rectangle(0, 0, 1, 1, COLORS.bgDeep, 0.6).setOrigin(0);
    this.faixa = this.add.rectangle(0, 0, 1, 1, COLORS.bgDeep, 0.9).setOrigin(0);
    this.titulo = this.criarTexto(data.titulo.toUpperCase(), PX_TITULO, COLORS.playerBright);
    this.ajuda = this.criarTexto('[<-  ->] ESCOLHER   [ENTER] CONFIRMAR', PX_AJUDA, COLORS.metalMid);

    this.opcoes.forEach((c, i) => this.montarCarta(c, i));
    this.posicionar();

    const kb = this.input.keyboard!;
    const mover = (d: number) => {
      this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.opcoes.length);
      this.marcar();
    };
    kb.on('keydown-LEFT', () => mover(-1));
    kb.on('keydown-A', () => mover(-1));
    kb.on('keydown-RIGHT', () => mover(1));
    kb.on('keydown-D', () => mover(1));
    kb.on('keydown-ONE', () => this.confirmar(0));
    kb.on('keydown-TWO', () => this.confirmar(1));
    kb.on('keydown-THREE', () => this.confirmar(2));
    kb.on('keydown-ENTER', () => this.confirmar(this.cursor));
    kb.on('keydown-SPACE', () => this.confirmar(this.cursor));
    kb.on('keydown-J', () => this.confirmar(this.cursor));
    const sair = data.onSair;
    if (sair) {
      kb.on('keydown-ESC', () => {
        if (this.fechando) return;
        this.fechando = true;
        this.scene.stop();
        sair();
      });
    }

    this.marcar();

    // Entrada: as cartas sobem para a mesa, uma depois da outra (e terminam em pixel inteiro).
    this.cartas.forEach((k, i) => {
      const y = k.y;
      k.y += 16;
      k.alpha = 0;
      this.tweens.add({ targets: k, y, alpha: 1, duration: 200, delay: 50 * i, ease: 'Quad.easeOut' });
    });
  }

  /** A geometria da mesa, para a sonda `probe-mesa-texto` (px finos; as caixas são relativas à carta). */
  geometria(): { moldura: { w: number; h: number }; cartas: { id: string; x: number; y: number; grupos: Omit<Grupo, 'objs'>[] }[] } {
    return {
      moldura: { w: MOLDURA.w, h: MOLDURA.h },
      cartas: this.cartas.map((k, i) => ({
        id: this.opcoes[i].id,
        x: k.x,
        y: k.y,
        grupos: this.grupos[i].map(({ tipo, caixa, centrarX, centrarY, tinta }) => ({ tipo, caixa, centrarX, centrarY, tinta })),
      })),
    };
  }

  /**
   * No MUNDO, com a camada viva: a mesa vai para a 'Cartas' de lá. Esta fica vazia até a de lá decidir, e fecha
   * junto — e se a fase fechar esta primeiro (ESC, dev), fecha a de lá.
   */
  private repassar(hd: Phaser.Game, data: CartasData): void {
    let fechada = false;
    const fechar = () => {
      fechada = true;
      this.scene.stop();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!fechada) hd.scene.stop('Cartas');
    });
    // ⚠️ NA FILA, não `hd.scene.start`: a mesa de lá fecha com `this.scene.stop()`, que o Phaser ENFILEIRA, e o
    // `start` do gerenciador roda NA HORA. Os dois jogos têm cada um o seu laço — no reset da alien (mesas
    // encadeadas), a mesa nova abria antes do `stop` pendente da anterior, e o `stop` a matava. Na fila, o `start`
    // espera atrás do `stop`.
    // (`queueOp` é público no Phaser, só não está no `phaser.d.ts`; a fila chama `start(keyA, keyB)`.)
    const fila = hd.scene as unknown as { queueOp(op: 'start', chave: string, dados: CartasData): void };
    fila.queueOp('start', 'Cartas', {
      ...data,
      onEscolha: (id: string) => {
        fechar();
        data.onEscolha(id);
      },
      onSair:
        data.onSair &&
        (() => {
          fechar();
          data.onSair!();
        }),
    });
  }

  // ─── O GRID ────────────────────────────────────────────────────────────────────────────────────

  /** Unidades do mundo → unidades desta cena (px finos na camada; o próprio mundo sem ela). */
  private get fino(): number {
    return ehHD(this) ? escalaHD() / pixelFino() : 1;
  }

  /**
   * Põe a mesa no lugar — na criação e quando a janela muda de escala (o pixel fino muda, e a tela passa a ter outra
   * largura em px finos). A carta por dentro NÃO muda: só o lugar dela na tela.
   */
  private posicionar(): void {
    if (ehHD(this)) prepararCameraHD(this);
    const f = this.fino;
    const L = Math.round(GAME_WIDTH * f);
    const A = Math.round(GAME_HEIGHT * f);
    this.escurecer.setSize(L, A);
    const faixaH = Math.ceil(22 * f);
    this.faixa.setSize(L, faixaH);
    this.colocar(this.titulo, PX_TITULO, { x: 0, y: 0, w: L, h: faixaH });
    this.colocar(this.ajuda, PX_AJUDA, { x: 0, y: Math.round(209 * f) - 8, w: L, h: 16 });

    const n = this.cartas.length;
    const total = n * MOLDURA.w + (n - 1) * VAO;
    const x0 = Math.round((L - total) / 2);
    const y = Math.round(108 * f - MOLDURA.h / 2);
    this.cartas.forEach((k, i) => {
      const x = x0 + i * (MOLDURA.w + VAO);
      this.tweens.killTweensOf(k);
      k.setPosition(x, y).setAlpha(1).setScale(1);
      this.zonas[i].setPosition(x, y);
      // O realce: um L de 2px a 2px da borda — o canto de 8×8 tem 1px de contorno antes do L.
      const [a, b, c, d] = this.realces[i];
      a.setPosition(x - 5, y - 5);
      b.setPosition(x + MOLDURA.w - 3, y - 5);
      c.setPosition(x - 5, y + MOLDURA.h - 3);
      d.setPosition(x + MOLDURA.w - 3, y + MOLDURA.h - 3);
    });
  }

  // ─── O TEXTO ───────────────────────────────────────────────────────────────────────────────────

  /** Um objeto de texto na voz do piloto, SEM contorno (dentro da moldura o fundo já é escuro e liso). */
  private criarTexto(texto: string, px: number, cor: number): Phaser.GameObjects.Text {
    const t = this.add
      .text(0, 0, texto, {
        fontFamily: this.familia,
        fontSize: `${px}px`,
        color: Phaser.Display.Color.IntegerToColor(cor).rgba,
      })
      .setOrigin(0, 0);
    if (ehHD(this)) {
      t.setResolution(pixelFino());
      registrarTextoHD(t, () => t.setResolution(pixelFino()));
    }
    return t;
  }

  /** Põe um texto com a linha de base em `base`: o Phaser desenha a base em `y + round(ascent)` (Text.updateText). */
  private assentar(t: Phaser.GameObjects.Text, x: number, base: number): void {
    t.setPosition(x, base - Math.round(t.getTextMetrics().ascent));
  }

  /** Um texto solto (título, ajuda) centrado pela tinta numa caixa. */
  private colocar(t: Phaser.GameObjects.Text, px: number, caixa: Caixa): void {
    const [p] = posicionar([t.text], px, this.medir, caixa, 'centro', 0);
    this.assentar(t, p.x, p.base);
  }

  /** Um grupo de texto DENTRO da carta: as linhas no encaixe, pela tinta. */
  private textoNaCarta(
    k: Phaser.GameObjects.Container,
    tipo: TipoGrupo,
    linhas: string[],
    px: number,
    cor: number,
    caixa: Caixa,
    vertical: 'centro' | 'topo' | 'pe',
  ): Grupo {
    const pos = posicionar(linhas, px, this.medir, caixa, vertical, FOLGA + MARGEM);
    const objs = linhas.map((l, i) => {
      const t = this.criarTexto(l, px, cor);
      this.assentar(t, pos[i].x, pos[i].base);
      k.add(t);
      return t;
    });
    const primeira = this.medir(linhas[0], px);
    const ultima = this.medir(linhas[linhas.length - 1], px);
    return {
      tipo,
      objs,
      caixa,
      centrarX: true,
      centrarY: vertical === 'centro',
      tinta: { topo: pos[0].base - primeira.asc, pe: pos[pos.length - 1].base + ultima.desc },
    };
  }

  // ─── A CARTA ───────────────────────────────────────────────────────────────────────────────────

  private montarCarta(c: CartaDef, i: number): void {
    const t = tamanhos!;
    const v = ENCAIXE.visor;
    const k = this.add.container(0, 0);
    k.add(this.add.image(0, 0, `moldura-${c.raridade}`).setOrigin(0));
    const grupos: Grupo[] = [];

    grupos.push(this.textoNaCarta(k, 'nome', [c.nome], t.nome, COLORS.metalLight, ENCAIXE.nome, 'centro'));
    const efeito = quebrar(c.curto, t.efeito, this.medir, ENCAIXE.plaqueta.w - 2 * (FOLGA + MARGEM), 2)!;
    grupos.push(this.textoNaCarta(k, 'efeito', efeito, t.efeito, COLORS.metalLight, ENCAIXE.plaqueta, 'centro'));
    const requer = c.requer
      ? this.textoNaCarta(k, 'requer', [textoRequer(c)], t.requer, COLORS.metalMid, v, 'topo')
      : null;
    if (requer) grupos.push(requer);
    const raridade = this.textoNaCarta(k, 'raridade', [NOME_RARIDADE[c.raridade]], t.raridade, COR_RARIDADE[c.raridade], v, 'pe');
    grupos.push(raridade);

    // O ÍCONE: no meio do espaço que sobra entre o "requer" (ou o topo do visor) e a raridade.
    const topo = requer ? Math.ceil(requer.tinta.pe) + FOLGA : v.y + FOLGA;
    const pe = Math.floor(raridade.tinta.topo) - FOLGA;
    const icone = `icone-${c.id}`;
    if (this.textures.exists(icone)) {
      const img = this.add.image(0, 0, icone).setOrigin(0);
      img.setPosition(Math.round(v.x + (v.w - img.width) / 2), Math.round(topo + (pe - topo - img.height) / 2));
      k.add(img);
      grupos.push({ tipo: 'icone', objs: [img], caixa: v, centrarX: true, centrarY: false, tinta: { topo: img.y, pe: img.y + img.height } });
    } else {
      const g = this.textoNaCarta(k, 'icone', [SIGLA[c.categoria]], t.nome, COR_RARIDADE[c.raridade], { x: v.x, y: topo, w: v.w, h: pe - topo }, 'centro');
      grupos.push({ ...g, caixa: v, centrarY: false });
    }

    this.cartas.push(k);
    this.grupos.push(grupos);
    this.realces.push(this.cantos());
    this.zonas.push(this.zona(i));
  }

  /** Os 4 CANTOS do realce (o mesmo L de 8×8, espelhado) — pixel, não Graphics. */
  private cantos(): Phaser.GameObjects.Image[] {
    const canto = (fx: boolean, fy: boolean) => this.add.image(0, 0, 'realce-canto').setOrigin(0).setFlip(fx, fy).setVisible(false);
    return [canto(false, false), canto(true, false), canto(false, true), canto(true, true)];
  }

  private zona(i: number): Phaser.GameObjects.Zone {
    const z = this.add.zone(0, 0, MOLDURA.w, MOLDURA.h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => {
      this.cursor = i;
      this.marcar();
    });
    z.on('pointerdown', () => this.confirmar(i));
    return z;
  }

  private marcar(): void {
    this.realces.forEach((r, i) => r.forEach((c) => c.setVisible(i === this.cursor)));
  }

  private confirmar(i: number): void {
    if (this.fechando || i < 0 || i >= this.opcoes.length) return;
    this.fechando = true;
    const escolhida = this.opcoes[i];

    this.cartas.forEach((k, j) => {
      // O "pulo" da escolhida cresce a partir do MEIO (a carta é posicionada pelo canto).
      if (j === i) this.tweens.add({ targets: k, x: k.x - MOLDURA.w * 0.05, y: k.y - MOLDURA.h * 0.05, scale: 1.1, duration: 140, yoyo: true });
      else this.tweens.add({ targets: k, alpha: 0, y: k.y + 12, duration: 180 });
    });
    this.realces.forEach((r) => r.forEach((c) => c.setVisible(false)));

    // ⚠️ FECHA ANTES DE AVISAR: o reset da alien encadeia mesas, e a próxima relança ESTA cena. Avisar primeiro
    // faria o `launch` bater numa cena ainda viva — e o `stop` logo depois mataria a mesa nova.
    const cb = this.onEscolha;
    this.time.delayedCall(420, () => {
      this.scene.stop();
      cb(escolhida.id);
    });
  }
}

// ASCII puro: a fonte pode não ter os símbolos Unicode (o ShipPanel já tomou caixas vazias assim).
const SIGLA: Record<CartaDef['categoria'], string> = {
  arma: 'ARMA',
  efeito: 'EFEITO',
  defesa: 'DEFESA',
  movimento: 'MOV',
};
```

Run: `npx tsc --noEmit` — Expected: sem erro.

- [ ] **Step 6: Atualizar o alvo do mouse na `probe-vozes`**

Em `scripts/probe-vozes.mjs`, trocar o bloco do `alvo` (o comentário `// A MESA, com o mouse sobre a 3ª carta (x = 192 + 84 no mundo, y = 108).` continua; mude-o para
`// A MESA, com o mouse sobre o meio da 3ª carta (as cartas moram no grid fino — a posição sai da geometria).`) e:

```js
  const alvo = await page.evaluate(() => {
    const r = window.__gameHD.canvas.getBoundingClientRect();
    return { x: r.left + (276 / 384) * r.width, y: r.top + (108 / 216) * r.height };
  });
```

por:

```js
  const alvo = await page.evaluate(() => {
    const hd = window.__gameHD;
    const c = hd.scene.getScene('Cartas');
    const g = c.geometria();
    const k = g.cartas[2];
    const r = hd.canvas.getBoundingClientRect();
    const z = c.cameras.main.zoom * (r.width / hd.canvas.width);
    return { x: r.left + (k.x + g.moldura.w / 2) * z, y: r.top + (k.y + g.moldura.h / 2) * z };
  });
```

- [ ] **Step 7: Rodar a sonda nova e as antigas**

Run: `node scripts/probe-mesa-texto.mjs "$TEMP"`
Expected: `TUDO OK` e a folha escrita. Se `tamanhoUnico` lançar erro no console (um `curto` que não cabe em 2
linhas no tamanho do nome), **reescreva o `curto` daquela carta** em `src/cartas.ts` (mais curto, mesmo sentido) e
registre a troca na spec §3.2 — nunca encolha a letra só dela.

Se aparecer FALHA de folha/centro, olhe a folha e o número: o defeito é de medida (corrija a regra em
`textoNoEncaixe.ts` com um caso novo no `test-texto-encaixe.mjs`) ou de encaixe (corrija `ENCAIXE`, Task 1 Step 7).
Nunca afrouxe `FOLGA`, `CENTRO` ou `LIMIAR` para passar.

Run: `node scripts/probe-vozes.mjs "$TEMP"`, `node scripts/probe-cartas.mjs "$TEMP"`
Expected: `TUDO OK` / sem FALHA nas duas.

- [ ] **Step 8: Olhar a folha**

Abra `$TEMP/mesa-13-cartas.png` (Read) e confira, carta por carta, nas duas janelas: nada fora do quadro, nada
fora do meio, o "REQUER…" dentro do visor, a raridade na cor certa, o realce na carta do meio. Anote o que a sonda
não pega (ícone mal centrado no olho, letra encostando no filete) e corrija antes do commit.

- [ ] **Step 9: Commit**

```bash
git add src/uiHD.ts src/scenes/CartasScene.ts src/scenes/BootHDScene.ts src/scenes/BootScene.ts scripts/probe-mesa-texto.mjs scripts/probe-vozes.mjs
git commit -m "feat(cartas): a mesa no grid fino — moldura por raridade, texto pelos encaixes e o realce em pixel"
```

---

### Task 4: Os 13 ícones nas cores reais (PixelLab + aprovação dele)

> ⏸ **EM ESPERA (01/10, decisão dele):** as Tasks 1–3 estão feitas (`587594a`, `ff301d9`, `e3f165f`; a letra fica
> no tamanho que saiu — *"bem legível em jogo em tela maior"*). Os ícones esperam o **catálogo novo de cartas**
> (até 25, frente A) — não se gera ícone para carta que pode sair. Quando o catálogo fechar, esta task roda com a
> lista nova de IDs.

**Files:**
- Modify (substituir): `public/sprites/cartas/icone-<ID>.png` ×13 (40×40)
- Create: `docs/superpowers/folhas/2026-10-01/icones-candidatos.png` (a data do dia em que gerar)
- Modify: `src/cartas.ts` — o comentário de `ICONES_CARTAS` (`32×32` → `40×40`, a origem nova)

**Interfaces:**
- Consumes: a mesa da Task 3 (o ícone se centra sozinho no espaço do visor; o tamanho vem do PNG).
- Produces: as texturas `icone-<ID>` em 40×40.

⚠️ Esta task tem uma PARADA: os candidatos vão para ele ANTES de instalar (regra da casa). Ele pode escolher fazer
algum à mão — esses ele entrega, e você só instala.

- [ ] **Step 1: Gerar os candidatos**

Para cada carta, um `mcp__pixellab__create_image_pro` com `width: 40, height: 40, no_background: true` (≤42px →
64 candidatos por chamada) e `reference_images` com o ícone ATUAL dela (`public/sprites/cartas/icone-<ID>.png` em
base64, `usage: "subject and silhouette to keep"`). Descrição (em inglês), sempre terminando com
`"Side view, flat game icon, crisp pixel art, dark 1px outline, 3-4 real material colours, no text, no background, no glow halo."`:

| ID | Descrição |
|---|---|
| WPN_001 | Two rifle bullets side by side flying right, grey steel jacket, bronze copper tip. |
| WPN_002 | Three rifle bullets fanning out to the right in a spread, grey steel jacket, bronze copper tip. |
| WPN_004 | A short belt of three linked bullets with motion streaks behind, steel jackets, bronze tips. |
| WPN_007 | A long pointed armor-piercing bullet punching through a thin dark steel plate, bronze tip. |
| WPN_008 | One big heavy cannon shell, brass casing, dark steel nose. |
| EFF_001 | A bullet hitting and bursting into a small orange-yellow explosion at its tip. |
| EFF_004 | A bullet trailing orange flames behind it. |
| EFF_006 | A small burning skull wrapped in orange flames, bursting. |
| DEF_001 | A riveted grey steel hull armor plate shaped like a shield, front view. |
| DEF_002 | A riveted grey steel armor plate with a cyan circular recharge arrow around it. |
| DEF_003 | A glossy red heart with a small metal plus sign. |
| DEF_004 | A grey steel armor plate shattering outward with an orange blast behind it. |
| MOV_001 | A ship thruster nozzle, grey steel, firing a blue-white flame jet to the left. |

Espere com `mcp__pixellab__wait_for_jobs` e baixe com `mcp__pixellab__get_image`. Descarte os que saírem de frente
para a câmera onde a tabela pede perfil (memória: o PixelLab tende à vista de cima).

- [ ] **Step 2: A folha dos candidatos**

Escolha os 3 melhores por carta e monte `docs/superpowers/folhas/<data>/icones-candidatos.png`: para cada carta,
os 3 crus a 4× (sem suavizar) e cada um DENTRO da carta real, na mesa a 1152 — use o padrão de
`scripts/_folha-molduras.mjs` (`textures.addBase64` na camada e troca da textura `icone-<ID>` antes de abrir a mesa).
Mande para ele (abra o arquivo) com uma recomendação por carta. **PARE e espere a escolha.**

- [ ] **Step 3: Instalar os aprovados**

Salve cada escolhido como `public/sprites/cartas/icone-<ID>.png` (40×40, fundo transparente). Atualize o comentário
de `ICONES_CARTAS` em `src/cartas.ts`: `(PixelLab object 75460844, 32×32, ...)` →
`(PixelLab create_image_pro, 40×40, aprovados em <data> — folha folhas/<data>/icones-candidatos.png; ...)`.

- [ ] **Step 4: A sonda com os ícones novos**

Run: `node scripts/probe-mesa-texto.mjs "$TEMP"`
Expected: `TUDO OK` (o ícone maior pode encostar no "requer" ou na raridade — a sonda cobra ≥2px entre eles; se
falhar, o ícone é que está grande demais para o visor: corte a margem transparente dele, não mexa no texto).

- [ ] **Step 5: Commit**

```bash
git add public/sprites/cartas/icone-*.png src/cartas.ts docs/superpowers/folhas
git commit -m "feat(cartas): os 13 ícones nas cores reais do objeto, 40×40"
```

---

### Task 5: O critério de pronto, as sondas de sempre e o ponto marcado

**Files:**
- Create: `docs/superpowers/folhas/<data>/mesa-13-cartas.png`
- Create: `docs/superpowers/plans/<data>-mesa-arte-retomada-START.md`
- Modify: `docs/HANDOFF.md` (o 🧭: a frase de arranque, a linha da etapa 1.5)
- Modify: memória `raridade-cores-e-icones.md` (o que foi implementado)

- [ ] **Step 1: Todas as sondas**

Com `npm run dev` rodando:

```bash
npx tsc --noEmit
node scripts/test-molduras.mjs
node scripts/test-texto-encaixe.mjs
node scripts/probe-mesa-texto.mjs docs/superpowers/folhas/<data>
node scripts/probe-vozes.mjs "$TEMP"
node scripts/probe-cartas.mjs "$TEMP"
node scripts/probe-pecas.mjs "$TEMP"
node scripts/probe-tiers.mjs "$TEMP"
node scripts/probe-stage4.mjs "$TEMP"
```

Expected: tudo sem FALHA. Qualquer FALHA volta para a task dona dela — não siga adiante.

- [ ] **Step 2: Olhar a folha final, carta por carta**

Read `docs/superpowers/folhas/<data>/mesa-13-cartas.png`. Para CADA uma das 13 cartas, nas duas janelas, confira
e anote: nome dentro e no meio do encaixe · efeito dentro e no meio da plaqueta (1 ou 2 linhas) · "REQUER…" dentro
do visor (Combustão, Recarga, Casco Reativo) · ícone no meio do visor, sem encostar · raridade na cor certa no pé do
visor. **Só siga se as 13 passarem no olho.** Depois abra a folha para ele (`Start-Process`).

- [ ] **Step 3: Marcar o ponto**

- `docs/HANDOFF.md`, no 🧭: a frase de arranque passa a apontar para o START novo; na linha da etapa 1.5, "spec 2 =
  a arte nova do compacto" vira ✅ com a data e a folha.
- `docs/superpowers/plans/<data>-mesa-arte-retomada-START.md`, no molde do START de 29/09: onde está, como testar
  (as sondas novas), o que olhar jogando (a mesa em 1152 e em tela cheia; o reset da alien na Doca), os próximos
  passos (etapa 1.6 — controle de Xbox e PS; o resto da 1.5) e as lições.
- O START de 29/09 ganha no topo: `> ⚠️ Substituído pelo START de <data>.`
- Memória `raridade-cores-e-icones.md`: "IMPLEMENTADO em <data> (`<commit>`): `src/raridade.ts`,
  `src/molduraCarta.ts`, `src/textoNoEncaixe.ts`, a mesa no grid fino; sondas `probe-mesa-texto`,
  `test-molduras`, `test-texto-encaixe`."

- [ ] **Step 4: Commit e push**

```bash
git add docs
git commit -m "docs: o ponto marcado — a mesa compacta com a arte nova, as 13 cartas conferidas"
git push origin feat/cartas-preview
```
