# Cutscene 3, 2ª volta: A GARGANTA — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA — use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para tocar este plano tarefa a tarefa. Os passos
> usam caixa (`- [ ]`) para marcação.

**Objetivo:** substituir o portão descartado por uma CRIATURA viva no hangar — a garganta — que
existe desde o primeiro quadro, é baleada pelo jogador no beat final, e cuja explosão é a CAUSA do
colapso; e consertar a nadadeira reprovada, na arte e no movimento.

**Arquitetura:** três frentes que não se cruzam. (1) ARTE: PixelLab → limpeza → caixa única →
correção de paleta assada NO ARQUIVO → `public/sprites/`. (2) CENA: `Interlude3Scene` ganha a
garganta, o beat final de cinco tempos, os destroços novos, o pivô da nadadeira e as 17 luzes.
(3) PROVA: `scripts/_cut3/probe-cut3-visual.mjs` cresce um bloco de asserts por tarefa.

**Tech Stack:** TypeScript + Phaser 3.90 · Vite · sharp (pipeline de arte) · Playwright (sondas) ·
PixelLab via MCP (`create_1_direction_object`, `animate_object`).

---

## Global Constraints

Valem em TODAS as tarefas. Copiadas do spec
`docs/superpowers/specs/2026-09-03-cutscene3-garganta-design.md`.

- **A FRONTEIRA:** `public/sprites/hangar.png` é a parede da **Fase 4** (Fatia 7) e **não pode ser
  tocado**. Prova a cada rodada: 160×160 · `git status` limpo nele · `usamHangar: 0` na sonda.
- **1px de arte = 1px de jogo.** Tamanho e COR se assam no ARQUIVO, nunca em `setScale()`/`setTint()`.
- **Nada de aleatório por quadro.** Fase, semente, posição e ordem são DERIVADAS de índice ou
  constantes. A sonda compara quadros; um `Math.random()` por quadro a quebra.
- **Família de luminância:** a pintura do hangar tem média **13,1** e teto prático **~110**. Toda
  peça nova sai do `_paleta-familia.mjs` com **média ~30 e pico ≤ 132**.
- **A caixa do recorte é UMA SÓ** para o estático e para todos os quadros de todas as animações da
  mesma peça. Recorte por quadro faz o sprite tremer.
- **Míssil próprio.** O projétil do beat final **não pode** ser `bolt2` tingido — é o padrão que o
  Henrique já reprovou duas vezes (`BossCapitania.ts:578`).
- **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram.
- **`probe-f3-visual` tem ruído documentado** (lança-mísseis por sorteio, faixa real 2 a 8). Não
  afrouxe o assert: rode de novo.
- **Decisões fechadas, não reabrir:** enquadramento C (garganta inteira na direita, altura
  inteira) · ela mora DENTRO do hangar, na frente da parede · o final é a nave ENTRANDO na boca ·
  idle + morte, só · nadadeira lisa e escura com o `leviathan-swim-sheet` como referência · pivô,
  nunca travessia · portão descartado · `DECK_Y` 171 e a luminância da 3ª carcaça ficam como estão.

### A DECISÃO NOVA DESTA SESSÃO (2026-09-04) — a 3ª carcaça cai

O spec fixou a garganta em 191px centrada em x=330, cobrindo **x 235..426**, e não cruzou isso com
duas posições já decididas no convés. Medido e conferido em `scripts/_cut3/_mock-garganta.png`:

- a **3ª carcaça** (x=330) ficaria **100% atrás dela** — invisível;
- a **nave** para em **x=258**, ou seja, colada na borda esquerda da criatura.

**Henrique decidiu (2026-09-04): cai a 3ª carcaça.** Ficam duas (x=64 e x=150), a nave continua
parando em **x=258**, e o assert de contagem baixa de `>= 3` para `>= 2`. ⚠️ Fica um risco
conhecido para o próximo teste jogado: a nave passa ~10s parada sobre as tentáculas da criatura, e
casco escuro sobre corpo escuro pode dissolver a silhueta. **É para ser julgado, não consertado
por conta própria.**

### AS DUAS LEIS DO ENTULHO CONVIVEM

O spec manda inverter a ordem de queda (direita → esquerda, acompanhando a onda). A lei de
2026-07-19 manda empilhar de baixo para cima ("pilha que começa pelo topo é chuva"). As duas valem:
**as FIADAS continuam de baixo para cima; dentro de cada fiada as peças entram da direita para a
esquerda.** E a pilha inteira começa só DEPOIS de a cadeia ter passado.

---

## Estrutura de arquivos

| arquivo | responsabilidade |
|---|---|
| `scripts/_cut3/_paleta.mjs` | **CRIAR** — o módulo puro da correção de paleta (as 3 operações) + `estatistica()`. Existe para o instalador e o CLI usarem a MESMA lei. |
| `scripts/_cut3/_paleta-familia.mjs` | **MODIFICAR** — passa a importar `_paleta.mjs`; a lei sai daqui e o CLI fica. |
| `scripts/_cut3/_estilo-garganta.mjs` | **CRIAR** — recorta a face `south`, sobe para 191×191 e emite o base64 da imagem de estilo. |
| `scripts/_cut3/_instalar-garganta.mjs` | **CRIAR** — baixa estático + os dois lotes de animação, limpa, recorta TUDO pela mesma caixa e assa a paleta. |
| `scripts/_cut3/_instalar-destrocos.mjs` | **CRIAR** — baixa as 4 peças promovidas, limpa, reduz para a altura alvo e assa a paleta. |
| `scripts/_cut3/_estilo-nadadeira.mjs` | **CRIAR** — recorta o quadro 0 do `leviathan-swim-sheet` e emite o base64. |
| `scripts/_cut3/probe-cut3-visual.mjs` | **MODIFICAR** — cai o bloco do portão; entram garganta, beat final, destroços, pivô da nadadeira e luzes. |
| `scripts/_cut3/_mock-garganta.mjs` | já existe (bancada desta sessão) — conferência de geometria. |
| `scripts/_cut3/_med-south.mjs` | já existe (bancada desta sessão) — mede a face `south` do objeto. |
| `src/scenes/BootScene.ts` | **MODIFICAR** — sai `portaoHangar`; entram `gargantaCut3`, os dois lotes de quadros, `destroco1..4` e o `torpedoCut3` desenhado em código. |
| `src/scenes/Interlude3Scene.ts` | **MODIFICAR** — o grosso da fatia. |
| `public/sprites/portao-hangar.png` | **APAGAR** |
| `public/sprites/nadadeira.png` | **SUBSTITUIR** |
| `public/sprites/garganta.png` + `garganta-idle-anim-*.png` + `garganta-morte-anim-*.png` + `destroco-1..4.png` | **CRIAR** |
| `docs/HANDOFF.md` · `docs/ASSETS.md` | **MODIFICAR** — na última tarefa. |

**Constantes de profundidade da cena, depois desta fatia:**

```
starfield/parallax  <  nadadeira (69, ATRÁS da pintura)  <  pintura (70)
  <  luzes (70,5)  <  carcaças (71,x)  <  entulho (72)  <  GARGANTA (75)  <  nave (80)
```

---

## Tarefa 1 · O módulo de paleta, extraído

Sem isto, a lei de cor existiria em duas cópias (o CLI e o instalador) e uma delas envelheceria.

**Files:**
- Create: `scripts/_cut3/_paleta.mjs`
- Modify: `scripts/_cut3/_paleta-familia.mjs`

**Interfaces:**
- Produces: `corrigirPaleta(buf: Buffer, channels: number): Buffer` (corrige EM CÓPIA e devolve) e
  `estatistica(buf: Buffer, channels: number): { media: number, pico: number }`. Consumidos pelas
  Tarefas 2, 5 e 6.

- [ ] **Passo 1: criar o módulo puro**

```javascript
// scripts/_cut3/_paleta.mjs
// A LEI DE COR da Cutscene 3, em um lugar só.
//
// ⚠️ Por que no arquivo e não em `setTint()`: `setTint` multiplica a textura INTEIRA por uma cor
// só — ele não sabe separar o casco do miolo, e some com a única luz que a peça tem direito de
// ter. A mesma lei do `reduzir-sprite.mjs`: 1px de arte = 1px de jogo, 1 cor de arte = 1 cor de
// jogo.
//
// O QUE A PINTURA DO HANGAR EXIGE (medido em 2026-09-03):
//   luminância média 13,1  ·  só 31 pixels da tela inteira passam de 110 (0,05%)
// O teto prático do quadro é ~110. Uma peça com pico 207 grita.

export const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;

export function rgb2hsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  const l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn;
  const s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = (mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4) * 60;
  return [h, s, l];
}

export function hsl2rgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] :
    h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

/** Média e pico de luminância dos pixels OPACOS (alpha ≥ 200). */
export function estatistica(buf, ch) {
  let soma = 0, n = 0, pico = 0;
  for (let i = 0; i < buf.length; i += ch) {
    if (buf[i + 3] < 200) continue;
    const L = lum(buf[i], buf[i + 1], buf[i + 2]);
    soma += L; n++;
    if (L > pico) pico = L;
  }
  return { media: n ? soma / n : 0, pico };
}

/**
 * AS TRÊS OPERAÇÕES, e o motivo de cada uma:
 *   1. o casco TEAL (matiz 140°–215°) gira para a FERRUGEM do hangar (~18°).
 *      Teal é `player 0x17a6bd` — a cor do JOGADOR. Um inimigo vestido da cor do jogador mente.
 *   2. o miolo ROSA/MAGENTA (matiz ≥280° ou ≤15°) MANTÉM o matiz.
 *      Rosa é `enemyBright 0xe8306b` — paleta de inimigo. Está certo, e é a energia da peça.
 *   3. COMPRESSÃO DE REALCE acima de L=90: a curva achata em 0,36, teto vira ~132.
 *      É isso que tira o grito sem escurecer o corpo — a média mal se move.
 *
 * Aferida na criatura da garganta: 31,8/207 → 30,6/132.
 */
export function corrigirPaleta(buf, ch) {
  const saida = Buffer.from(buf);

  for (let i = 0; i < saida.length; i += ch) {
    if (saida[i + 3] < 8) continue;

    let [h, s, l] = rgb2hsl(saida[i], saida[i + 1], saida[i + 2]);

    if (h >= 140 && h <= 215) {
      h = 18 + (h - 140) * 0.10;
      s *= 0.55;
      l *= 0.80;
    } else if (h >= 280 || h <= 15) {
      s *= 0.92;
    }

    let [r, g, b] = hsl2rgb(h, s, l);

    const L = lum(r, g, b);
    if (L > 90) {
      const k = (90 + (L - 90) * 0.36) / L;
      r = Math.round(r * k); g = Math.round(g * k); b = Math.round(b * k);
    }

    saida[i] = Math.min(255, r);
    saida[i + 1] = Math.min(255, g);
    saida[i + 2] = Math.min(255, b);
  }

  return saida;
}
```

- [ ] **Passo 2: reescrever o CLI para usar o módulo**

Substitua `scripts/_cut3/_paleta-familia.mjs` INTEIRO por:

```javascript
// Puxa um sprite do PixelLab para a FAMÍLIA DE LUMINÂNCIA da Cutscene 3, assando a cor NO ARQUIVO.
//
// ⚠️ A LEI mora em `_paleta.mjs` — este arquivo é só a linha de comando. Duas cópias da lei é uma
// cópia envelhecendo.
//
//   node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>
//
// Aferido na criatura da garganta: 31,8/207 → 30,6/132.

import sharp from 'sharp';
import { corrigirPaleta, estatistica } from './_paleta.mjs';

const [, , ENTRADA, SAIDA] = process.argv;
if (!ENTRADA || !SAIDA) {
  console.error('uso: node scripts/_cut3/_paleta-familia.mjs <entrada.png> <saida.png>');
  process.exit(1);
}

const { data, info } = await sharp(ENTRADA).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const antes = estatistica(data, info.channels);
const saida = corrigirPaleta(data, info.channels);

await sharp(saida, { raw: { width: info.width, height: info.height, channels: info.channels } })
  .png()
  .toFile(SAIDA);

const depois = estatistica(saida, info.channels);
console.log(`${ENTRADA}  ->  ${SAIDA}   (${info.width}x${info.height})`);
console.log(`  antes:   média ${antes.media.toFixed(1)}   pico ${antes.pico.toFixed(0)}`);
console.log(`  depois:  média ${depois.media.toFixed(1)}   pico ${depois.pico.toFixed(0)}`);
console.log(`  a pintura do hangar: média 13,1  ·  teto prático ~110`);
if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140 — essa peça vai gritar no quadro escuro.');
```

- [ ] **Passo 3: provar que a lei não mudou**

O `_med-south.mjs` já deixou `scripts/_cut3/_south-bruta.png` no disco. Rode:

```bash
node scripts/_cut3/_paleta-familia.mjs scripts/_cut3/_south-bruta.png scripts/_cut3/_south-corrigida.png
```

Esperado — **exatamente estes números**, que são os aferidos no spec:

```
  antes:   média 31.8   pico 207
  depois:  média 30.6   pico 132
```

⚠️ Se saírem outros, a extração quebrou a lei. **Pare e conserte antes de seguir** — todas as
peças desta fatia dependem dela.

- [ ] **Passo 4: commit**

```bash
git add scripts/_cut3/_paleta.mjs scripts/_cut3/_paleta-familia.mjs scripts/_cut3/_med-south.mjs scripts/_cut3/_mock-garganta.mjs
git commit -m "refactor(cut3): a lei de cor da fatia sai do CLI e vira modulo"
```

---

## Tarefa 2 · A criatura: arte em 191px, as duas animações, uma caixa só

Sai um único sprite estático + 18 quadros, todos recortados pela MESMA caixa e todos já na família
de luminância do hangar.

**Files:**
- Create: `scripts/_cut3/_estilo-garganta.mjs`, `scripts/_cut3/_instalar-garganta.mjs`
- Create: `public/sprites/garganta.png`, `public/sprites/garganta-idle-anim-{0..8}.png`,
  `public/sprites/garganta-morte-anim-{0..8}.png`
- Modify: `src/scenes/BootScene.ts`
- Delete: `public/sprites/portao-hangar.png`

**Interfaces:**
- Consumes: `corrigirPaleta`, `estatistica` (Tarefa 1).
- Produces: a textura `gargantaCut3`, e as animações **`garganta-idle`** (loop) e
  **`garganta-morte`** (uma vez). Consumidas pelas Tarefas 3 e 4.

- [ ] **Passo 1: montar a imagem de estilo em 191×191**

```javascript
// scripts/_cut3/_estilo-garganta.mjs
// A IMAGEM DE ESTILO que faz o PixelLab REDESENHAR a criatura em 191px.
//
// ⚠️ POR QUE ELA EXISTE. A face `south` do objeto tem 132x131 de conteúdo, e o enquadramento
// aprovado pede 191 de altura. Esticar 1,46x quebra a grade de pixel — é o erro nº 4 da 1ª volta
// (`setScale()` contra a lei "1px de arte = 1px de jogo").
//
// O caminho verificado: `create_1_direction_object` NÃO aceita `size` junto com `style_images` —
// quando há imagem de estilo, é A MAIOR DELAS que determina o tamanho da saída. Então a face sobe
// para 191x191 AQUI, entra como estilo, e o modelo REDESENHA naquela resolução em vez de esticar.
// É upscale por redesenho: o único que não quebra a grade.
//
// ⚠️ O REDIMENSIONAMENTO AQUI É LEGÍTIMO e não fere a lei: esta imagem NUNCA vai para
// `public/sprites/`. Ela é prompt, não asset.
//
//   node scripts/_cut3/_estilo-garganta.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const OBJ = '15f111fd-62c2-4689-9a33-93c931b5b796';
const CAIXA = { left: 19, top: 19, width: 132, height: 131 }; // medida por _med-south.mjs
const LADO = 191;

const res = await fetch(`https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}/rotations/south.png`);
if (!res.ok) throw new Error(`HTTP ${res.status}`);

const png = await sharp(Buffer.from(await res.arrayBuffer()))
  .extract(CAIXA)
  // `nearest`: o lanczos inventaria meio-tons que o modelo leria como estilo borrado.
  .resize(LADO, LADO, { kernel: 'nearest' })
  // Paleta indexada: a imagem viaja como base64 dentro da chamada MCP, e um PNG truecolor de
  // 191px custa três vezes mais texto sem melhorar em nada o estilo de uma peça de pixel art.
  .png({ palette: true, colours: 48 })
  .toBuffer();

fs.writeFileSync('scripts/_cut3/_estilo-garganta.png', png);
fs.writeFileSync('scripts/_cut3/_estilo-garganta.b64.txt', png.toString('base64'));

console.log(`scripts/_cut3/_estilo-garganta.png  ${LADO}x${LADO}  ${(png.length / 1024).toFixed(1)} KB`);
console.log(`scripts/_cut3/_estilo-garganta.b64.txt  ${(png.toString('base64').length / 1024).toFixed(1)} KB de base64`);
```

Rode e confirme o tamanho:

```bash
node scripts/_cut3/_estilo-garganta.mjs
```

Esperado: `191x191` e um base64 abaixo de ~40 KB. Se passar muito disso, baixe `colours` para 32.

- [ ] **Passo 2: gerar a criatura em 191px**

Leia o base64 (`cat scripts/_cut3/_estilo-garganta.b64.txt`) e chame o MCP do PixelLab:

```
mcp__pixellab__create_1_direction_object(
  description: "colossal biomechanical maw embedded in a derelict alien hangar: a ring of bone teeth around a spiralling flesh throat, rusted iron carapace plates and cable-like tendrils, wet organic surfaces, deep shadow, dark sci-fi, single frontal view",
  view: "sidescroller",
  style_images: [{ base64: "<o conteúdo de _estilo-garganta.b64.txt>", format: "png" }]
)
```

⚠️ **NÃO passe `size`** — a ferramenta recusa `size` junto com `style_images`, e é a imagem de
estilo (191px) que fixa a saída. Como 191 > 170, volta **1 candidato só**, sem etapa de review.

Anote o `object_id` devolvido. Custo esperado: 20–40 gerações de **5.000** disponíveis
(ciclo vira em 2026-10-04 — orçamento não é restrição).

- [ ] **Passo 3: esperar e conferir**

```bash
node scripts/_aguardar.mjs <object-id>
```

Depois `mcp__pixellab__get_object(object_id: "<object-id>")` **com `include_preview: true`** e
OLHE a peça. Ela tem que ser a mesma criatura: boca frontal, anel de dentes, miolo em espiral.
Se voltar outra coisa, refaça o passo 2 (a folga de orçamento existe exatamente para isto).

- [ ] **Passo 4: as duas animações**

Duas chamadas, na ordem:

```
mcp__pixellab__animate_object(
  object_id: "<object-id>",
  animation_description: "the maw breathes: the ring of teeth contracts and relaxes slowly, the spiral throat pulses with a faint inner glow, tendrils drift",
  display_name: "garganta-idle",
  mode: "v3"
)
```

```
mcp__pixellab__animate_object(
  object_id: "<object-id>",
  animation_description: "the maw dies: the jaws wrench open in a spasm, the spiral throat flares once and goes dark, the body slackens",
  display_name: "garganta-morte",
  mode: "v3"
)
```

⚠️ **NÃO passe `directions`.** O objeto é de 1 direção; passar `directions` devolve erro. A
direção interna é resolvida sozinha.
⚠️ **NÃO passe `frame_count`.** O padrão do v3 é 8 gerados + o quadro de referência = **9 quadros
em disco**, que é o número declarado no `FRAMES` do passo 6.

Anote os dois `animation_group_id`.

```bash
node scripts/_aguardar-anim.mjs <object-id>
```

Depois `mcp__pixellab__get_object` de novo e confirme que **as duas** animações aparecem, com os
dois `animation_group_id` distintos.

- [ ] **Passo 5: instalar tudo pela mesma caixa**

```javascript
// scripts/_cut3/_instalar-garganta.mjs
// Instala a GARGANTA inteira — o estático e os quadros das DUAS animações — de uma vez só.
//
// ⚠️ POR QUE UM INSTALADOR PRÓPRIO, e não o `install-anim.mjs` duas vezes. Aquele calcula a caixa
// união DE UM LOTE. Rodado duas vezes, o idle e a morte ganhariam caixas DIFERENTES, e o sprite
// SALTARIA no instante exato do impacto — o único quadro da cena em que ninguém pode piscar. Aqui
// a caixa é a união de TUDO: estático + idle + morte.
//
// ⚠️ E A LIMPEZA VEM ANTES DA CAIXA. Os quadros herdam os dois defeitos do gerador (docs/HANDOFF,
// lições 16-17): o xadrez de transparência desenhado dentro do PNG e colunas/linhas de borda 100%
// opacas. Uma borda opaca é opaca em TODOS os quadros, então entraria na união e inflaria o
// recorte do sprite inteiro.
//
// ⚠️ E A PALETA É ASSADA AQUI, no mesmo passe. A cor mora no arquivo (ver _paleta.mjs).
//
//   node scripts/_cut3/_instalar-garganta.mjs <object-id> <grupo-idle> <grupo-morte> [n-quadros]
import sharp from 'sharp';
import fs from 'node:fs';
import { corrigirPaleta, estatistica } from './_paleta.mjs';

const [OBJ, GRP_IDLE, GRP_MORTE, N_RAW] = process.argv.slice(2);
const N = Number(N_RAW ?? 9);
if (!OBJ || !GRP_IDLE || !GRP_MORTE) {
  console.error('uso: node scripts/_cut3/_instalar-garganta.mjs <object-id> <grupo-idle> <grupo-morte> [n]');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
const raiz = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${OBJ}`;

const tmp = 'assets/raw/anim-garganta';
fs.mkdirSync(tmp, { recursive: true });

async function baixarLimpo(url, guardarComo) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  const bruto = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(`${tmp}/${guardarComo}`, bruto);

  const { data, info } = await sharp(bruto).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  // XADREZ: cinzas neutros e claros opacos são o padrão de transparência desenhado por engano.
  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    const claro = r > 140 && r < 215;
    if (a > 10 && neutro && claro) data[p * 4 + 3] = 0;
  }

  // BORDAS 100% OPACAS: se a borda inteira é opaca, é moldura, não arte.
  const colunaCheia = (x) => { for (let y = 0; y < H; y++) if (A(x, y) < 250) return false; return true; };
  const linhaCheia = (y) => { for (let x = 0; x < W; x++) if (A(x, y) < 250) return false; return true; };
  for (const x of [0, W - 1]) if (colunaCheia(x)) for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
  for (const y of [0, H - 1]) if (linhaCheia(y)) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;

  return { data, W, H };
}

const pecas = [];
pecas.push({ saida: 'garganta', quadro: await baixarLimpo(`${raiz}/rotations/unknown.png`, 'estatico.png') });
for (const [grp, nome] of [[GRP_IDLE, 'garganta-idle-anim'], [GRP_MORTE, 'garganta-morte-anim']]) {
  for (let i = 0; i < N; i++) {
    pecas.push({
      saida: `${nome}-${i}`,
      quadro: await baixarLimpo(`${raiz}/animations/${grp}/unknown/${i}.png`, `${nome}-${i}.png`),
    });
  }
}

// A CAIXA ÚNICA — a união dos alphas de TODOS os quadros já limpos.
let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
for (const { quadro: { data, W, H } } of pecas) {
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[(y * W + x) * 4 + 3] <= 10) continue;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
}
if (maxX < 0) throw new Error('todos os quadros ficaram vazios depois da limpeza');
const box = { left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 };

let antes = null, depois = null;
for (const { saida, quadro: { data, W, H } } of pecas) {
  const recortado = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract(box).raw().toBuffer({ resolveWithObject: true });
  const corrigido = corrigirPaleta(recortado.data, 4);
  if (saida === 'garganta') {
    antes = estatistica(recortado.data, 4);
    depois = estatistica(corrigido, 4);
  }
  await sharp(corrigido, { raw: { width: box.width, height: box.height, channels: 4 } })
    .png().toFile(`public/sprites/${saida}.png`);
}

console.log(`garganta: ${pecas.length} arquivos, TODOS na caixa ${box.width}x${box.height} (de ${box.left},${box.top})`);
console.log(`  estático  antes: média ${antes.media.toFixed(1)}  pico ${antes.pico.toFixed(0)}`);
console.log(`  estático depois: média ${depois.media.toFixed(1)}  pico ${depois.pico.toFixed(0)}`);
if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140 — a peça vai gritar no quadro escuro.');
if (box.height < 170) console.log(`  ⚠️  a criatura saiu com ${box.height}px de altura, abaixo dos 191 do enquadramento.`);
```

```bash
node scripts/_cut3/_instalar-garganta.mjs <object-id> <grupo-idle> <grupo-morte> 9
```

Esperado: `19 arquivos, TODOS na caixa <largura>x<altura>`, com a altura perto de 191, e
`depois: média ~30  pico <=132`.

⚠️ **A caixa recortada é a altura REAL da peça** e pode sair alguns pixels abaixo de 191 — a
criatura raramente encosta nas quatro bordas do canvas. Está certo: sprite ancorado se recorta pela
caixa de conteúdo. A cena ancora pelo TOPO (y=8), então o que varia é só a base. **Anote a altura
medida** — o assert do passo 8 usa ela.

- [ ] **Passo 6: registrar no BootScene**

Em `src/scenes/BootScene.ts`, no mapa `FRAMES`, logo depois da linha `aguaVivaAnim: 9,`:

```typescript
  // A GARGANTA da Cutscene 3: 9 quadros por animação (o v3 do PixelLab guarda o quadro de
  // referência como frame 0, então frame_count=8 grava 9 em disco).
  gargantaIdleAnim: 9,
  gargantaMorteAnim: 9,
```

Na lista `ANIMS`, logo depois da linha do `aguaviva-drift`:

```typescript
  // ─── A GARGANTA (cutscene 3) ───
  // Ela respira a 6, a mesma cadência da água-viva: é a coisa LENTA do quadro. Pulsar rápido
  // faria dela mais um inimigo, e ela não é inimigo — ela é o LUGAR, e está ali desde o primeiro
  // quadro da cena.
  { key: 'garganta-idle', prefix: 'gargantaIdleAnim', frameRate: 6 },
  // A MORTE toca UMA vez, e mais rápido: é o único instante em que ela reage a alguma coisa.
  { key: 'garganta-morte', prefix: 'gargantaMorteAnim', frameRate: 12, loop: false },
```

No mapa `ART`, substitua o bloco inteiro do `portaoHangar` (o comentário de 3 linhas e a entrada)
por:

```typescript
  // ⚠️ A GARGANTA — a criatura que substituiu o portão (2ª volta da Fatia 6, 2026-09-04).
  //
  // O portão foi reprovado no teste jogado por DUAS coisas somadas: sem MOLDURA (colado sobre
  // parede pintada) e sem CAUSA (o entulho caía porque um banner dizia que estava caindo). A
  // garganta escapa das duas: ela não finge ser parede, ela é um CORPO dentro do hangar, na
  // frente da parede, ocluindo as janelas #4 e #5 — e é a explosão dela que derruba o teto, então
  // o banner vira legenda do que o jogador viu, não a causa.
  //
  // ⚠️ ELA EXISTE DESDE O PRIMEIRO QUADRO. Respira durante a queda, a derrapagem e o painel de
  // escolha. Surgir foi exatamente a queixa contra o portão.
  gargantaCut3: 'sprites/garganta.png',
  ...animFrames('gargantaIdleAnim', 'garganta-idle-anim'),
  ...animFrames('gargantaMorteAnim', 'garganta-morte-anim'),
```

- [ ] **Passo 7: apagar o portão do disco**

```bash
git rm -f public/sprites/portao-hangar.png
```

- [ ] **Passo 8: provar que a arte entrou**

```bash
npm run typecheck
node -e "import('sharp').then(async({default:s})=>{const f=['public/sprites/garganta.png','public/sprites/garganta-idle-anim-0.png','public/sprites/garganta-idle-anim-8.png','public/sprites/garganta-morte-anim-0.png','public/sprites/garganta-morte-anim-8.png'];const cx=[];for(const p of f){const m=await s(p).metadata();cx.push(m.width+'x'+m.height);console.log(p,m.width+'x'+m.height)}console.log(new Set(cx).size===1?'OK: caixa UNICA em todos':'FALHA: caixas diferentes -> o sprite vai tremer')})"
ls public/sprites/garganta-idle-anim-*.png public/sprites/garganta-morte-anim-*.png | wc -l
test ! -f public/sprites/portao-hangar.png && echo "OK: o portao saiu do disco"
```

Esperado: `npm run typecheck` sem saída; `OK: caixa UNICA em todos`; `18`; `OK: o portao saiu do disco`.

- [ ] **Passo 9: commit**

```bash
git add scripts/_cut3/_estilo-garganta.mjs scripts/_cut3/_instalar-garganta.mjs public/sprites/garganta.png public/sprites/garganta-idle-anim-*.png public/sprites/garganta-morte-anim-*.png src/scenes/BootScene.ts
git commit -m "feat(fatia6): a garganta nasce em 191px, com idle e morte na mesma caixa"
```

---

## Tarefa 3 · A garganta na cena, desde o primeiro quadro

**Files:**
- Modify: `src/scenes/Interlude3Scene.ts`
- Modify: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consumes: textura `gargantaCut3`, animação `garganta-idle` (Tarefa 2).
- Produces: `Interlude3Scene.GARGANTA` (`{ x: 330, topo: 8, miraY: 103, mira: 150 }`),
  `Interlude3Scene.DEPTH_GARGANTA` (75), o campo `private garganta?: Phaser.GameObjects.Sprite`, e
  o objeto de cena nomeado **`gargantaCut3`**. Consumidos pelas Tarefas 4 e 8.

- [ ] **Passo 1: escrever o assert que ainda falha**

Em `scripts/_cut3/probe-cut3-visual.mjs`, logo depois do bloco que termina com
`ok(c.usamHangar === 0, ...)`, insira:

```javascript
// ─── A GARGANTA: ela EXISTE DESDE O PRIMEIRO QUADRO, e é um corpo na frente da parede ───
//
// ⚠️ O ASSERT DE "DESDE O PRIMEIRO QUADRO" É O CORAÇÃO DESTE BLOCO. O portão foi reprovado por
// SURGIR ("apenas surge um asset sem relação nenhuma com a arte"). A leitura acontece 1,5s depois
// do start da cena — antes da queda, antes da derrapagem, antes do painel. Se ela só nascesse no
// colapso, este assert seria o que pegaria.
const garg = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
  const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
  return g
    ? { tex: g.texture.key, x: Math.round(g.x), topo: Math.round(g.y),
        w: g.width, h: g.height, sx: g.scaleX, sy: g.scaleY,
        depth: g.depth, depthParede: p ? p.depth : null,
        anim: g.anims && g.anims.currentAnim ? g.anims.currentAnim.key : null,
        tocando: !!(g.anims && g.anims.isPlaying) }
    : null;
});
console.log('garganta', JSON.stringify(garg));
ok(!!garg, 'a garganta esta em cena DESDE o comeco (nao surge no colapso, como o portao surgia)');
if (garg) {
  ok(garg.tex === 'gargantaCut3', `ela usa a arte propria (${garg.tex})`);
  ok(garg.x === 330, `centrada em x=330, cobrindo as janelas #4 e #5 (x=${garg.x})`);
  ok(garg.topo === 8, `ancorada pelo TOPO em y=8 (y=${garg.topo})`);
  // ⚠️ 1px de arte = 1px de jogo. Escala != 1 aqui e a peça inteira sai da grade.
  ok(garg.sx === 1 && garg.sy === 1, `desenhada em tamanho NATIVO (escala ${garg.sx}x${garg.sy})`);
  ok(garg.w >= 170 && garg.h >= 170, `no enquadramento aprovado, altura inteira (${garg.w}x${garg.h})`);
  ok(garg.depth > garg.depthParede, `ela e um CORPO na frente da parede (${garg.depth} > ${garg.depthParede})`);
  ok(garg.depth < 80, `e atras da nave (${garg.depth} < 80)`);
  ok(garg.anim === 'garganta-idle' && garg.tocando, `ela RESPIRA desde o comeco (${garg.anim}, tocando=${garg.tocando})`);
}
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
npm run dev &
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: `✘ a garganta esta em cena DESDE o comeco ...` e o total de falhas ≥ 1.

- [ ] **Passo 3: pôr a garganta na cena**

Em `src/scenes/Interlude3Scene.ts`, no bloco de campos, depois de `private ship!: ...`:

```typescript
  /** A criatura que substituiu o portão. Existe desde `create()`; morre no beat final. */
  private garganta?: Phaser.GameObjects.Sprite;
```

Depois da constante `JANELAS_Y`, acrescente:

```typescript
  /**
   * A GARGANTA — a geometria saiu do DESENHO do Henrique, medida nos traços vermelhos.
   *
   * A forma fechada que ele desenhou tem a borda esquerda constante em x≈350-355, de y≈8 a
   * y≈199, saindo pela borda direita: uma coluna de ALTURA INTEIRA colada na direita. As quatro
   * setas apontam y≈34, 88, 141 e 180 — teto, janela, convés e chão: ele está apontando a faixa
   * inteira, de cima a baixo.
   *
   * Com centro em 330 e 191 de largura, ela cobre x=235..426 e OCLUI POR INTEIRO as janelas #4
   * (288..321) e #5 (336..376). Isso é o certo: ela não está embutida na parede, ela está DENTRO
   * do hangar, NA FRENTE dela. Objeto ocluindo parede é render, não colagem — e é por aí que ela
   * escapa do defeito que matou o portão.
   *
   * `mira` é onde a nave RECUA para atirar, e `miraY` a altura da boca. ⚠️ O recuo não é enfeite:
   * a nave para em x=258, DENTRO da caixa da criatura, e um tiro de 56px disparado de cima do
   * alvo não se lê como tiro. Recuando para 150, o torpedo cruza 180px de tela.
   */
  private static readonly GARGANTA = { x: 330, topo: 8, miraY: 103, mira: 150 } as const;
```

No bloco das profundidades, entre `DEPTH_ENTULHO` e `DEPTH_NAVE`:

```typescript
  // A GARGANTA fica ACIMA da pintura e do entulho, e ABAIXO da nave: ela é um corpo dentro do
  // hangar, e a nave passa na frente dele.
  private static readonly DEPTH_GARGANTA = 75;
```

Em `create()`, logo depois de `this.plantarCarcacas();` (ela entra DEPOIS da parede, porque oclui
a parede):

```typescript
    this.plantarGarganta();
```

E acrescente o método, logo depois de `plantarCarcacas()`:

```typescript
  /**
   * A GARGANTA, plantada no primeiro quadro.
   *
   * ⚠️ ELA NÃO SURGE. Respira durante a queda, a derrapagem e o painel de escolha inteiro — a
   * queixa exata contra o portão foi "apenas surge um asset sem relação nenhuma com a arte".
   * Um corpo que já estava lá quando você caiu não surge: você é que chegou.
   *
   * ⚠️ ANCORADA PELO TOPO, não pelo centro. O topo (y=8) é o número que veio do desenho; a base é
   * consequência da altura real da arte instalada. Ancorar pelo centro faria o enquadramento
   * inteiro escorregar a cada reinstalação da peça.
   */
  private plantarGarganta(): void {
    if (!this.textures.exists('gargantaCut3')) return;

    this.garganta = this.add
      .sprite(Interlude3Scene.GARGANTA.x, Interlude3Scene.GARGANTA.topo, 'gargantaCut3')
      .setOrigin(0.5, 0)
      .setDepth(Interlude3Scene.DEPTH_GARGANTA)
      .setName('gargantaCut3');

    if (this.anims.exists('garganta-idle')) this.garganta.play('garganta-idle');
  }
```

- [ ] **Passo 4: a 3ª carcaça cai**

Ainda em `Interlude3Scene.ts`, em `plantarCarcacas()`, troque a linha dos `xs` e ponha o motivo
acima dela:

```typescript
    // ⚠️ ERAM TRÊS, E A TERCEIRA (x=330) CAIU EM 2026-09-04. A garganta cobre x=235..426: a peça
    // ficava 100% atrás dela, invisível — arte aprovada no teste jogado sendo desenhada para
    // ninguém. Medido em `scripts/_cut3/_mock-garganta.png`; decidido pelo Henrique com as três
    // saídas na mesa (mover a carcaça, mover a nave, ou cortar). O convés livre acaba em x≈235.
    const xs = [64, 150].filter(
```

- [ ] **Passo 5: rodar, ver passar, e ajustar o assert das carcaças**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
npm run typecheck
```

Esperado: todos os asserts do bloco `garganta` verdes. O assert das carcaças **ainda falha** (ele
cobra `>= 3`) — troque, em `scripts/_cut3/probe-cut3-visual.mjs`:

```javascript
ok(carc.n >= 3, `ha carcacas no conves (${carc.n})`);
```

por:

```javascript
// ⚠️ DUAS, NÃO TRÊS, DESDE 2026-09-04. A terceira ficava atrás da garganta — ver o comentário em
// Interlude3Scene.plantarCarcacas().
ok(carc.n >= 2, `ha carcacas no conves (${carc.n})`);
```

Rode de novo. Esperado: só o bloco do portão falhando (ele sai na Tarefa 4).

- [ ] **Passo 6: commit**

```bash
git add src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): a garganta esta na cena desde o primeiro quadro, e a 3a carcaca sai de tras dela"
```

---

## Tarefa 4 · O beat final: o tiro, a morte, a cadeia invertida e a nave engolida

Aqui o portão sai da cena e a corrente causal fecha: **você atira → ela explode → a explosão dela
derruba o teto.**

**Files:**
- Modify: `src/scenes/BootScene.ts` (o torpedo desenhado em código)
- Modify: `src/scenes/Interlude3Scene.ts`
- Modify: `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consumes: `Interlude3Scene.GARGANTA`, `this.garganta`, `garganta-morte` (Tarefas 2 e 3).
- Produces: textura `torpedoCut3`; os métodos `disparar()`, `impacto()`, `cadeia()`, `engolida()`;
  a constante `Interlude3Scene.CADEIA` (`{ n: 10, x0: 330, x1: 8, t0: 200, passo: 140 }`); os
  campos públicos `alarme: boolean` (consumido pela Tarefa 8) e `cadeiaX: number[]` (lido pela
  sonda); o objeto nomeado `torpedoCut3`. `selarBoca()` continua existindo e é reescrito na
  Tarefa 5.

- [ ] **Passo 1: escrever os asserts que ainda falham**

Em `scripts/_cut3/probe-cut3-visual.mjs`, **apague o bloco inteiro do portão** — do comentário
`// ─── O PORTÃO: a saída morre, e a cicatriz FICA ───` até a chave que fecha o
`if (port) { ... }` —, MAS **preserve** o trecho que espera o painel e joga a cena (de
`let painel = false;` até o terceiro `await page.keyboard.press('Enter');`). No lugar do bloco
apagado, escreva:

```javascript
// ─── O BEAT FINAL: o tiro, a morte, a cadeia invertida e a nave engolida ───
//
// ⚠️ A CORRENTE CAUSAL É O QUE ESTÁ SENDO PROVADO AQUI. O portão falhou por não ter causa: o
// entulho caía porque um banner dizia que estava caindo. Agora o jogador ATIRA, a criatura
// EXPLODE, e é a explosão dela que derruba o teto. Cada assert abaixo é um elo dessa corrente.

// 1. O TORPEDO. ⚠️ Ele NÃO pode ser o `bolt2` tingido — é o padrão que o Henrique já reprovou
// duas vezes ("um tiro magenta igual, sem característica nenhuma"), o mesmo defeito anotado em
// BossCapitania.ts:578. O assert cobra a TEXTURA PRÓPRIA, que é o que estava faltando.
let torp = null;
for (let i = 0; i < 40 && !torp; i++) {
  torp = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const t = s.children.list.filter((o) => o.name === 'torpedoCut3')[0];
    return t ? { tex: t.texture.key, x: Math.round(t.x) } : null;
  });
  if (!torp) await page.waitForTimeout(120);
}
console.log('torpedo ', JSON.stringify(torp));
ok(!!torp, 'a nave DISPARA no beat final');
if (torp) ok(torp.tex === 'torpedoCut3', `e o projetil tem forma PROPRIA, nao e o bolt2 tingido (${torp.tex})`);

// 2. A MORTE. A criatura reage ao tiro — é ela a causa do colapso.
let morte = null;
for (let i = 0; i < 40 && !morte; i++) {
  morte = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
    return g && g.anims && g.anims.currentAnim && g.anims.currentAnim.key === 'garganta-morte'
      ? { anim: g.anims.currentAnim.key }
      : null;
  });
  if (!morte) await page.waitForTimeout(150);
}
ok(!!morte, 'a garganta entra em garganta-morte quando o torpedo acerta');

// 3. A CADEIA NASCE NELA E CORRE PARA A ESQUERDA. ⚠️ A 1ª volta sorteava o x de cada estouro
// (`Phaser.Math.Between(8, 130)`) — uma cena que não se reproduz não se fotografa. Agora os 10 x
// são DERIVADOS do índice, e a sonda lê a lista inteira.
const cad = await page.evaluate(() => window.__game.scene.getScenes(true)[0].cadeiaX ?? null);
console.log('cadeia  ', JSON.stringify(cad));
ok(Array.isArray(cad) && cad.length === 10, `a cadeia tem 10 estouros (${cad ? cad.length : 'nenhum'})`);
if (Array.isArray(cad) && cad.length === 10) {
  ok(cad[0] > 300, `ela NASCE na garganta, a direita (x=${cad[0]})`);
  ok(cad[cad.length - 1] < 20, `e morre na boca por onde a nave entrou, a esquerda (x=${cad[cad.length - 1]})`);
  ok(cad.every((x, i) => i === 0 || x < cad[i - 1]), `e corre sempre para a ESQUERDA (${cad.join(',')})`);
}

// 4. A NAVE SOME DENTRO DA BOCA. ⚠️ Ela não escapa pela borda — ela vai MAIS PARA DENTRO, que é a
// história desta cutscene, e a Fase 4 começa exatamente onde ela sumiu.
await page.waitForTimeout(2200);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.ship
    ? { x: Math.round(s.ship.x), y: Math.round(s.ship.y),
        escala: +s.ship.scaleX.toFixed(2), alpha: +s.ship.alpha.toFixed(2) }
    : null;
});
console.log('nave-fim', JSON.stringify(fim));
ok(!!fim, 'a nave ainda existe no fim do beat');
if (fim) {
  ok(Math.abs(fim.x - 330) < 12, `ela some DENTRO da boca (x=${fim.x}, boca em 330), nao pela borda da tela`);
  ok(fim.escala <= 0.3, `encolhendo (escala ${fim.escala})`);
  ok(fim.alpha <= 0.1, `e apagando (alpha ${fim.alpha})`);
}
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: `✘ a nave DISPARA no beat final`, `✘ a garganta entra em garganta-morte ...`,
`✘ a cadeia tem 10 estouros (nenhum)`, `✘ ela some DENTRO da boca ...`.

- [ ] **Passo 3: desenhar o torpedo**

Em `src/scenes/BootScene.ts`, acrescente o método logo depois do fim de `makeShots()`:

```typescript
  /**
   * O TORPEDO DA CUTSCENE 3 — a única arma que o jogador dispara numa interlude.
   *
   * ⚠️ ELE NÃO É O `bolt2` TINGIDO, E ESSA É A RAZÃO DE ELE EXISTIR. Esse padrão — mesmo asset,
   * cor trocada — já foi reprovado duas vezes nesta campanha ("um tiro magenta igual, sem
   * característica nenhuma"), e é o defeito anotado em BossCapitania.ts:578. Um tiro carrega uma
   * informação só, e essa informação é a SILHUETA.
   *
   * ⚠️ E ELE É CIANO, NÃO MAGENTA, DE PROPÓSITO. O jogo ensina `magenta = isto te mata`; este é o
   * único tiro da campanha que sai DA nave do jogador numa cutscene, então ele veste a paleta
   * dele (`player`/`playerGlow`). O rastro laranja atrás é o motor, não a munição.
   *
   * 15×7, apontando para a DIREITA — a garganta está à direita da nave.
   */
  private makeTorpedo(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);

    // O rastro: o motor ardendo atrás, que é o que separa "torpedo" de "traço".
    g.fillStyle(COLORS.hot, 1);
    g.fillRect(0, 3, 3, 1);
    // O casco, e as duas aletas que dão a silhueta de corpo lançado.
    g.fillStyle(COLORS.metalDark, 1);
    g.fillRect(2, 2, 9, 3);
    g.fillRect(2, 1, 3, 1);
    g.fillRect(2, 5, 3, 1);
    // A ogiva.
    g.fillStyle(COLORS.player, 1);
    g.fillRect(11, 2, 2, 3);
    g.fillStyle(COLORS.playerGlow, 1);
    g.fillRect(13, 3, 2, 1);

    g.generateTexture('torpedoCut3', 15, 7);
    g.destroy();
  }
```

E chame-o na lista dos que **nunca** vêm do PixelLab, em `create()`, logo depois de
`this.makeShotsChefes();`:

```typescript
    this.makeTorpedo();
```

- [ ] **Passo 4: reescrever o beat final**

Em `src/scenes/Interlude3Scene.ts`, acrescente os campos junto dos outros:

```typescript
  /** Ligado no impacto: daí em diante as 17 lâmpadas viram alarme (ver `pulsarLampadas`). */
  alarme = false;
  /** Os x dos 10 estouros da cadeia, na ordem — a sonda lê esta lista. */
  cadeiaX: number[] = [];
```

Em `create()`, junto dos outros resets (perto de `this.done = false;`):

```typescript
    this.alarme = false;
    this.cadeiaX = [];
```

Depois da constante `GARGANTA`, acrescente:

```typescript
  /**
   * A CADEIA — 10 estouros correndo da GARGANTA até a boca por onde a nave entrou.
   *
   * ⚠️ ELA INVERTEU DE SENTIDO, E O SENTIDO É A CAUSA. Na 1ª volta a cadeia corria só na metade
   * esquerda, com x e y SORTEADOS, e nascia de um banner. Agora ela nasce NA CRIATURA que o
   * jogador acabou de estourar e corre dali até a entrada: a onda tem origem, e a origem é o tiro
   * dele.
   *
   * ⚠️ E TUDO AQUI É DERIVADO DO ÍNDICE. O sorteio saiu porque a sonda fotografa a cena — e
   * porque uma onda com jitter aleatório não lê como onda, lê como pipoca.
   */
  private static readonly CADEIA = { n: 10, x0: 330, x1: 8, t0: 200, passo: 140 } as const;
```

Agora substitua o método `colapso()` INTEIRO (do comentário `/** O COLAPSO — ...` até a chave que
o fecha, logo antes do comentário do `selarBoca`) por:

```typescript
  /**
   * O COLAPSO — em cinco tempos, e agora com CAUSA.
   *
   * A 1ª volta foi reprovada aqui: o entulho caía porque o banner dizia que estava caindo, e um
   * portão aparecia do nada para as pedras baterem em cima. A corrente agora fecha sozinha:
   *
   *   0      a nave sobe do convés, RECUA e encara a garganta
   *   +600   dispara — torpedo próprio, atravessando 180px de tela até a boca
   *   +1000  impacto: ela entra em `garganta-morte`, clarão, shake, e a cadeia nasce NELA
   *   +1200  a cadeia corre de x≈330 para x≈8 — 10 estouros, direita → esquerda
   *   +2000  a nave voa para DENTRO da boca, encolhendo, e some no miolo
   *
   * ⚠️ O BANNER VIROU LEGENDA. Ele não abre mais o beat: chega no impacto, nomeando o que o
   * jogador acabou de ver. Era a causa; virou a descrição da causa.
   *
   * ⚠️ E A SAÍDA FICA LITERAL. A nave não escapa pela borda — ela vai MAIS PARA DENTRO, que é a
   * história desta cutscene, e a Fase 4 (o interior) começa exatamente onde ela sumiu.
   */
  private colapso(): void {
    if (this.done) return;

    Music.play(this, 'boss', 600);

    // A nave sobe e RECUA. O recuo não é enfeite: ela parou em x=258, dentro da caixa da criatura,
    // e um tiro de 56px disparado de cima do alvo não se lê como tiro.
    this.tweens.add({
      targets: this.ship,
      x: Interlude3Scene.GARGANTA.mira,
      y: Interlude3Scene.GARGANTA.miraY,
      angle: 0,
      duration: 520,
      ease: 'Sine.easeOut',
    });

    this.time.delayedCall(600, () => this.disparar());
    this.time.delayedCall(1000, () => this.impacto());

    // O clarão final e a entrega, depois de a última peça de entulho assentar (ver `selarBoca`).
    this.time.delayedCall(4800, () => {
      if (this.done) return;
      this.cameras.main.flash(700, 255, 150, 80);
    });
    this.time.delayedCall(5600, () => this.avancar());
  }

  /** O tiro. Sai da boca do canhão da nave e cruza a tela até o miolo da criatura. */
  private disparar(): void {
    if (this.done || !this.textures.exists('torpedoCut3')) return;

    const g = Interlude3Scene.GARGANTA;
    const t = this.add
      .image(this.ship.x + 16, this.ship.y, 'torpedoCut3')
      .setDepth(Interlude3Scene.DEPTH_NAVE + 1)
      .setName('torpedoCut3');

    this.fx.hit(t.x, t.y);
    this.cameras.main.shake(90, 0.002);

    this.tweens.add({
      targets: t,
      x: g.x,
      y: g.miraY,
      duration: 400,
      ease: 'Quad.easeIn',
      // DESTRUIR, nunca deixar parado: objeto esquecido fora da tela é armadilha documentada.
      onComplete: () => t.destroy(),
    });
  }

  /** O impacto — e é daqui que TUDO o mais desce. */
  private impacto(): void {
    if (this.done) return;

    const g = Interlude3Scene.GARGANTA;

    if (this.garganta && this.anims.exists('garganta-morte')) this.garganta.play('garganta-morte');

    this.fx.explodeBig(g.x, g.miraY, 1.1, Interlude3Scene.DEPTH_GARGANTA + 1);
    this.cameras.main.flash(220, 255, 150, 80);
    this.cameras.main.shake(320, 0.008);

    // A legenda, não a causa.
    this.aviso('A ENTRADA ESTÁ COLAPSANDO', COLORS.enemyBright);

    this.alarme = true;
    this.cadeia();
    this.selarBoca();
    this.time.delayedCall(1000, () => this.engolida());
  }

  /** A onda: 10 estouros descendo da boca da criatura até o convés, direita → esquerda. */
  private cadeia(): void {
    const { n, x0, x1, t0, passo } = Interlude3Scene.CADEIA;

    this.cadeiaX = [];
    for (let i = 0; i < n; i++) {
      const k = i / (n - 1);
      const x = Math.round(Phaser.Math.Linear(x0, x1, k));
      const y = Math.round(Phaser.Math.Linear(24, Interlude3Scene.DECK_Y - 10, k));
      this.cadeiaX.push(x);

      this.time.delayedCall(t0 + i * passo, () => {
        if (this.done) return;
        this.fx.explode(x, y, 1.4);
      });
    }
  }

  /**
   * A NAVE ENGOLIDA. Ela voa para dentro da boca ENCOLHENDO e some no miolo.
   *
   * ⚠️ A escala aqui é MOVIMENTO, não tamanho de arte — ela termina em alpha 0. A lei "1px de
   * arte = 1px de jogo" vale para o que fica desenhado na tela, e no fim deste tween não fica
   * nada.
   */
  private engolida(): void {
    if (this.done) return;

    const g = Interlude3Scene.GARGANTA;
    this.fumaca.emitting = false;
    this.fagulhas.emitting = false;

    this.tweens.add({
      targets: this.ship,
      x: g.x,
      y: g.miraY,
      scale: 0.15,
      alpha: 0,
      angle: 0,
      duration: 1400,
      ease: 'Quad.easeIn',
    });
  }
```

- [ ] **Passo 5: tirar o portão do `selarBoca()`**

Ainda em `Interlude3Scene.ts`, no método `selarBoca()`, **apague** o bloco inteiro do portão — o
comentário `// ⚠️ O PORTÃO ENTRA PRIMEIRO ...` e o `if (this.textures.exists('portaoHangar')) { ... }`.

E troque o delay das 9 peças, que hoje começa em 1000 e não sabe da cadeia:

```typescript
      this.time.delayedCall(1000 + i * 240, () => {
```

por:

```typescript
      // ⚠️ A PILHA COMEÇA SÓ DEPOIS DE A CADEIA PASSAR (ela acaba em t≈1460 daqui). Entulho
      // caindo ANTES da onda seria a mesma mentira de antes com outra roupa: a pedra chegando
      // primeiro que a explosão que a arrancou.
      this.time.delayedCall(1700 + i * 190, () => {
```

- [ ] **Passo 6: rodar e ver passar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
npm run typecheck
```

Esperado: todos os asserts do beat final verdes, e nenhum assert do portão (o bloco saiu).

- [ ] **Passo 7: olhar a cena**

```bash
node scripts/_cut3/ver-cena.mjs
```

Abra `scripts/_cut3/cena-hoje.png`. A garganta tem que estar na direita em TODOS os 16 quadros —
inclusive no primeiro.

- [ ] **Passo 8: commit**

```bash
git add src/scenes/BootScene.ts src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): o portao sai e o beat final entra — o tiro e a causa do colapso"
```

---

## Tarefa 5 · Os destroços biomecânicos

**Files:**
- Create: `scripts/_cut3/_instalar-destrocos.mjs`
- Create: `public/sprites/destroco-1.png` … `destroco-4.png`
- Modify: `src/scenes/BootScene.ts`, `src/scenes/Interlude3Scene.ts`, `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consumes: `corrigirPaleta`, `estatistica` (Tarefa 1); `selarBoca()` (Tarefa 4).
- Produces: as texturas `destroco1..destroco4`; a constante `Interlude3Scene.ENTULHO`
  (`ReadonlyArray<readonly [x: number, yFinal: number, textura: string, angulo: number]>`); os
  objetos nomeados `entulhoCut3`.

- [ ] **Passo 1: escrever o assert que ainda falha**

Em `scripts/_cut3/probe-cut3-visual.mjs`, logo depois do bloco `4. A NAVE SOME DENTRO DA BOCA`,
acrescente:

```javascript
// ─── OS DESTROÇOS: peças da frota, não pedras genéricas, nas 9 posições MEDIDAS ───
//
// ⚠️ AS 9 POSIÇÕES NÃO MUDAM. Elas foram medidas na 1ª volta e a sonda fotografa a cena: posição
// sorteada quebra a reprodutibilidade. O que inverteu foi a ORDEM DE QUEDA.
// ⚠️ E ELES NÃO PODEM MAIS SER `asteroid` TINGIDO. A cor mora no ARQUIVO (ver _paleta.mjs) —
// `setTint` multiplicaria a peça inteira por uma cor só e apagaria a única luz que ela tem.
await page.waitForTimeout(2600);
const ent = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const es = s.children.list.filter((o) => o.name === 'entulhoCut3');
  return {
    n: es.length,
    texs: [...new Set(es.map((o) => o.texture.key))].sort(),
    tingidos: es.filter((o) => o.isTinted).length,
    escalas: [...new Set(es.map((o) => +o.scaleX.toFixed(2)))],
    xs: es.map((o) => Math.round(o.x)),
  };
});
console.log('entulho ', JSON.stringify(ent));
ok(ent.n === 9, `as 9 pecas de entulho cairam (${ent.n})`);
ok(ent.texs.every((t) => t.startsWith('destroco')), `sao destrocos biomecanicos, nao asteroides (${ent.texs.join(',')})`);
ok(ent.texs.length === 4, `as 4 pecas novas entraram em cena (${ent.texs.length})`);
ok(ent.tingidos === 0, `nenhuma peca depende de setTint — a cor esta no arquivo (${ent.tingidos} tingidas)`);
ok(ent.escalas.length === 1 && ent.escalas[0] === 1, `desenhadas em tamanho NATIVO (escalas ${ent.escalas.join(',')})`);
ok(ent.xs.every((x) => x < 140), `e todas muram a metade ESQUERDA, que e a boca (${ent.xs.join(',')})`);
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: `✘ as 9 pecas de entulho cairam (0)` — o nome `entulhoCut3` ainda não existe.

- [ ] **Passo 3: gerar as 4 peças**

```
mcp__pixellab__create_1_direction_object(
  description: "wreckage of a devoured starship hull, biomechanical: bone ribs sheathed in torn metal plating, cabling and sinew fused into the fracture, rust and dried organic matter, dark sci-fi, single piece on transparent background",
  size: 64,
  view: "sidescroller",
  item_descriptions: [
    "a buckled hull plate with a bone rib punching through it, cables trailing",
    "a torn engine cowling wrapped in sinew, one nozzle crushed",
    "a snapped wing spar, half metal half vertebra, ragged at both ends",
    "a crumpled cockpit frame with the canopy gone, ribs closing over the hole"
  ]
)
```

⚠️ `size: 64` devolve **16 candidatas numa chamada só** (custo 20–40 gerações, não 4×).
⚠️ **Sem `style_images`** — `size` e `style_images` são mutuamente exclusivos, e aqui quem manda é
o tamanho.

O objeto volta em status **review**. Rode
`mcp__pixellab__get_object(object_id: "<id>", include_preview: true)`, **olhe as 16**, e escolha
quatro que leiam como "casco com osso dentro" — não como pedra, e não como criatura inteira:

```
mcp__pixellab__select_object_frames(object_id: "<id>", indices: [<a>, <b>, <c>, <d>], common_tag: "destroco-cut3")
```

Cada índice vira um objeto de 1 direção próprio. Anote os **4 ids**, na ordem em que você quer que
virem `destroco-1..4`.

- [ ] **Passo 4: instalar as 4**

```javascript
// scripts/_cut3/_instalar-destrocos.mjs
// Instala as 4 peças de entulho biomecânico da Cutscene 3.
//
// Faz, em ordem, as quatro coisas que toda peça desta fatia precisa:
//   1. limpa o xadrez e as bordas opacas do gerador (docs/HANDOFF, lições 16-17);
//   2. recorta pela caixa de conteúdo real;
//   3. ASSA O TAMANHO no arquivo — cada peça tem a sua altura, e a variedade vem daí;
//   4. ASSA A PALETA no arquivo (ver _paleta.mjs).
//
// ⚠️ O TAMANHO É ASSADO, NÃO `setScale()`. A 1ª volta desenhava asteroides de 24px com
// `setScale(2.2..2.8)` — 24px de arte espremidos em 62px de tela, com a grade de pixel do sprite
// deixando de casar com a da tela. As alturas abaixo reproduzem os tamanhos QUE JÁ ESTAVAM na
// tela (2,2 a 2,8 × 24 = 53 a 67), agora com escala 1 no jogo.
//
// ⚠️ E A COR SAI DO `setTint`. `setTint(0x39415c)` multiplicava a peça inteira por um azul só —
// silhueta chapada, e a peça deixava de ser da família do hangar para ser da cor do tint.
//
//   node scripts/_cut3/_instalar-destrocos.mjs <id1> <id2> <id3> <id4>
import sharp from 'sharp';
import { corrigirPaleta, estatistica } from './_paleta.mjs';

const IDS = process.argv.slice(2);
if (IDS.length !== 4) {
  console.error('uso: node scripts/_cut3/_instalar-destrocos.mjs <id1> <id2> <id3> <id4>');
  process.exit(1);
}

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';
// As quatro alturas alvo, derivadas das escalas da 1ª volta (24px × 2,2 / 2,8 / 2,4 / 2,6).
const ALTURAS = [53, 67, 58, 62];

for (let k = 0; k < IDS.length; k++) {
  const url = `https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${IDS[k]}/rotations/unknown.png`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

  const { data, info } = await sharp(Buffer.from(await res.arrayBuffer()))
    .ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const A = (x, y) => data[(y * W + x) * 4 + 3];

  for (let p = 0; p < W * H; p++) {
    const [r, g, b, a] = [data[p * 4], data[p * 4 + 1], data[p * 4 + 2], data[p * 4 + 3]];
    const neutro = Math.abs(r - g) < 6 && Math.abs(g - b) < 6 && Math.abs(r - b) < 6;
    if (a > 10 && neutro && r > 140 && r < 215) data[p * 4 + 3] = 0;
  }
  const colunaCheia = (x) => { for (let y = 0; y < H; y++) if (A(x, y) < 250) return false; return true; };
  const linhaCheia = (y) => { for (let x = 0; x < W; x++) if (A(x, y) < 250) return false; return true; };
  for (const x of [0, W - 1]) if (colunaCheia(x)) for (let y = 0; y < H; y++) data[(y * W + x) * 4 + 3] = 0;
  for (const y of [0, H - 1]) if (linhaCheia(y)) for (let x = 0; x < W; x++) data[(y * W + x) * 4 + 3] = 0;

  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (A(x, y) <= 10) continue;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  if (x1 < 0) throw new Error(`${IDS[k]}: quadro vazio depois da limpeza`);

  const alvo = ALTURAS[k];
  const larg = Math.max(1, Math.round(((x1 - x0 + 1) * alvo) / (y1 - y0 + 1)));

  const red = await sharp(data, { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 })
    .resize(larg, alvo, { kernel: 'lanczos3' })
    .raw().toBuffer({ resolveWithObject: true });

  // O alpha é RELIMIARIZADO depois do lanczos: a franja parcial da borda vira contorno fantasma
  // sobre o fundo escuro do hangar (a mesma lei do reduzir-sprite.mjs).
  for (let i = 0; i < red.info.width * red.info.height; i++) {
    red.data[i * 4 + 3] = red.data[i * 4 + 3] >= 128 ? 255 : 0;
  }

  const antes = estatistica(red.data, 4);
  const corrigido = corrigirPaleta(red.data, 4);
  const depois = estatistica(corrigido, 4);

  await sharp(corrigido, { raw: { width: red.info.width, height: alvo, channels: 4 } })
    .png().toFile(`public/sprites/destroco-${k + 1}.png`);

  console.log(`destroco-${k + 1}.png  ${red.info.width}x${alvo}   media ${antes.media.toFixed(1)}->${depois.media.toFixed(1)}   pico ${antes.pico.toFixed(0)}->${depois.pico.toFixed(0)}`);
  if (depois.pico > 140) console.log('  ⚠️  o pico ainda passa de 140.');
}
```

```bash
node scripts/_cut3/_instalar-destrocos.mjs <id1> <id2> <id3> <id4>
```

Esperado: quatro linhas, alturas 53/67/58/62, e todos os picos ≤ 132.

- [ ] **Passo 5: registrar no BootScene**

Em `src/scenes/BootScene.ts`, no mapa `ART`, logo depois do bloco das `carcaca1..3`:

```typescript
  // ⚠️ OS DESTROÇOS BIOMECÂNICOS que muram a saída (cutscene 3, 2ª volta). Eles substituem
  // `asteroid`/`asteroid2`/`asteroid3` com `setTint(0x39415c)` — três pedras genéricas de 24px
  // esticadas 2,5× e pintadas de azul. Na descrição do Henrique: restos de fuselagem com traços
  // biomecânicos, ossos envoltos de tecnologia e carne, que é o padrão que a arte do jogo já tem.
  //
  // ⚠️ O TAMANHO E A COR ESTÃO ASSADOS NOS ARQUIVOS (scripts/_cut3/_instalar-destrocos.mjs): a
  // cena desenha em escala 1 e sem tint nenhum.
  destroco1: 'sprites/destroco-1.png',
  destroco2: 'sprites/destroco-2.png',
  destroco3: 'sprites/destroco-3.png',
  destroco4: 'sprites/destroco-4.png',
```

- [ ] **Passo 6: reescrever `selarBoca()`**

Em `src/scenes/Interlude3Scene.ts`, acrescente a constante logo depois de `CADEIA`:

```typescript
  /**
   * O ENTULHO QUE MURA A BOCA — [x, yFinal, textura, ângulo].
   *
   * ⚠️ AS 9 POSIÇÕES SÃO AS MEDIDAS DA 1ª VOLTA e NÃO mudam: elas foram escolhidas para empilhar
   * uma parede que fecha a abertura, e a sonda fotografa a cena — posição sorteada não se
   * reproduz.
   *
   * ⚠️ O QUE INVERTEU FOI A ORDEM, e as DUAS leis convivem. As FIADAS continuam de baixo para
   * cima (pilha que começa pelo topo é chuva, não desabamento — 2026-07-19). Dentro de cada
   * fiada, as peças agora entram da DIREITA para a ESQUERDA, acompanhando a cadeia que acabou de
   * passar por elas. Antes era esquerda → direita, contra a onda.
   *
   * ⚠️ SEM `setScale` E SEM `setTint`. O tamanho e a cor de cada peça estão assados no arquivo.
   */
  private static readonly ENTULHO: ReadonlyArray<readonly [number, number, string, number]> = [
    [112, 141, 'destroco3', 32], [66, 146, 'destroco2', -20], [22, 142, 'destroco1', 12],
    [132, 100, 'destroco4', -28], [90, 108, 'destroco1', 24], [40, 104, 'destroco2', -8],
    [108, 62, 'destroco3', -14], [58, 66, 'destroco4', 16],
    [78, 30, 'destroco2', 8],
  ];
```

E substitua o corpo de `selarBoca()` inteiro por:

```typescript
  private selarBoca(): void {
    Interlude3Scene.ENTULHO.forEach(([x, yFinal, tex, angulo], i) => {
      if (!this.textures.exists(tex)) return;

      // ⚠️ A PILHA COMEÇA SÓ DEPOIS DE A CADEIA PASSAR (ela acaba em t≈1460 daqui). Entulho
      // caindo ANTES da onda seria a mesma mentira de antes com outra roupa: a pedra chegando
      // primeiro que a explosão que a arrancou.
      this.time.delayedCall(1700 + i * 190, () => {
        if (this.done) return;

        const peca = this.add
          .image(x, -40, tex)
          .setAngle(angulo)
          // ACIMA da pintura: o entulho mura a metade esquerda NA FRENTE das janelas #1 e #2 — é
          // a vista para fora que ele existe para apagar, e é a parede que a Fase 4 pressupõe.
          .setDepth(Interlude3Scene.DEPTH_ENTULHO)
          .setName('entulhoCut3');

        this.tweens.add({
          targets: peca,
          y: yFinal,
          duration: 420,
          ease: 'Quad.easeIn',
          onComplete: () => {
            if (this.done) return;
            this.fx.hit(x, yFinal + 6);
            this.cameras.main.shake(70, 0.002);
          },
        });
      });
    });
  }
```

E troque o comentário de documentação do método por:

```typescript
  /**
   * O entulho que mura a boca. As peças caem de FORA da tela e assentam nas 9 posições medidas,
   * cada uma com um impacto curto ao encostar. São restos da frota engolida — casco com osso
   * dentro —, não pedra de cenário: a mesma leitura das carcaças do convés, agora de pé contra a
   * saída.
   *
   * ⚠️ Posições FIXAS, não sorteadas: a sonda fotografa a cena, e o quadro tem que ser
   * reproduzível.
   */
```

- [ ] **Passo 7: rodar e ver passar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
npm run typecheck
node scripts/_cut3/ver-cena.mjs
```

Esperado: os seis asserts do bloco `entulho` verdes.

- [ ] **Passo 8: commit**

```bash
git add scripts/_cut3/_instalar-destrocos.mjs public/sprites/destroco-*.png src/scenes/BootScene.ts src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): o entulho vira frota engolida, com tamanho e cor assados no arquivo"
```

---

## Tarefa 6 · A nadadeira: a arte, com referência canônica

Esta tarefa conserta a **causa 1** da reprovação. A causa 2 é a Tarefa 7, e é código.

**Files:**
- Create: `scripts/_cut3/_estilo-nadadeira.mjs`
- Modify: `public/sprites/nadadeira.png` (substituído)

**Interfaces:**
- Consumes: `public/sprites/leviathan-swim-sheet.png` (1972×116 — 17 quadros de 116×116, o tamanho
  declarado em `BootScene.SHEETS.leviathanSwimSheet`); `corrigirPaleta`/`estatistica` (Tarefa 1).
- Produces: `public/sprites/nadadeira.png` — a chave `nadadeira` no `ART` **não muda**.

- [ ] **Passo 1: montar a imagem de estilo do quadro 0**

```javascript
// scripts/_cut3/_estilo-nadadeira.mjs
// A IMAGEM DE ESTILO da nadadeira: o QUADRO 0 do `leviathan-swim-sheet`.
//
// ⚠️ POR QUE ESTA REFERÊNCIA, E POR QUE ELA NÃO É NEGOCIÁVEL. A nadadeira da 1ª volta foi gerada
// SEM referência nenhuma e reprovada no teste jogado ("ficou péssima"). Posta lado a lado com o
// `rabo-leviata.png` — canônico, aprovado depois de QUATRO reprovações —, ela não compartilhava
// um único traço: o rabo é placa escura segmentada com costura de energia; ela era ASA DE MORCEGO,
// com membrana e dedos ósseos.
//
// O quadro 0 desta sheet é o Leviatã BLINDADO do key art do Menu — o corpo que o jogo usa — e ele
// já tem a peitoral desenhada LISA, ESCURA, ARDÓSIA, sem membrana e sem dedos. É a instrução
// literal do Henrique: "baseada no corpo do leviatã usado, cor escura e nadadeira lisa".
//
// ⚠️ Gerar sem passar este quadro como estilo é repetir o erro de 02/09.
//
//   node scripts/_cut3/_estilo-nadadeira.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const SHEET = 'public/sprites/leviathan-swim-sheet.png';
const CELULA = 116; // o tamanho de quadro declarado em BootScene.SHEETS.leviathanSwimSheet

const png = await sharp(SHEET)
  .extract({ left: 0, top: 0, width: CELULA, height: CELULA })
  .png({ palette: true, colours: 48 })
  .toBuffer();

fs.writeFileSync('scripts/_cut3/_estilo-nadadeira.png', png);
fs.writeFileSync('scripts/_cut3/_estilo-nadadeira.b64.txt', png.toString('base64'));

console.log(`scripts/_cut3/_estilo-nadadeira.png  ${CELULA}x${CELULA}  ${(png.length / 1024).toFixed(1)} KB`);
console.log('⚠️  ABRA A IMAGEM antes de gerar: ela tem que mostrar o Leviatã blindado inteiro,');
console.log('    com a peitoral LISA e ESCURA. Se o quadro 0 estiver vazio ou cortado, a sheet');
console.log('    mudou de layout e a referência tem que ser re-medida.');
```

```bash
node scripts/_cut3/_estilo-nadadeira.mjs
```

**OLHE `scripts/_cut3/_estilo-nadadeira.png`** antes de seguir. Se não for o Leviatã blindado
inteiro, pare.

- [ ] **Passo 2: gerar as 4 candidatas**

```
mcp__pixellab__create_1_direction_object(
  description: "a single pectoral fin of an armoured leviathan, seen from the side: one smooth slate-dark plated blade, segmented like the creature's hull, no membrane, no bony fingers, no webbing, faint energy seam along the root, wet dark surface, dark sci-fi",
  view: "sidescroller",
  style_images: [{ base64: "<o conteúdo de _estilo-nadadeira.b64.txt>", format: "png" }]
)
```

⚠️ **Sem `size`** — a imagem de estilo (116px) fixa a saída. Como 116 ≤ 170, voltam **4
candidatas** em status review: a escolha é OLHANDO, não no escuro.
⚠️ A descrição nomeia explicitamente o que a versão reprovada TINHA (`no membrane, no bony
fingers, no webbing`). É de propósito: o defeito é o que precisa entrar no prompt.

- [ ] **Passo 3: escolher olhando**

```
mcp__pixellab__get_object(object_id: "<id>", include_preview: true)
```

Compare as 4 com `public/sprites/rabo-leviata.png` (o canônico). A escolhida tem que ser **placa
lisa e escura**, sem membrana e sem dedos. Depois:

```
mcp__pixellab__select_object_frames(object_id: "<id>", indices: [<a escolhida>], common_tag: "nadadeira-cut3")
```

Anote o id do objeto promovido.

- [ ] **Passo 4: instalar por cima da reprovada**

```bash
node scripts/install-sprite.mjs <id-promovido> - nadadeira
node scripts/_cut3/_paleta-familia.mjs public/sprites/nadadeira.png public/sprites/nadadeira.png
node -e "import('sharp').then(async({default:s})=>{const m=await s('public/sprites/nadadeira.png').metadata();console.log('nadadeira.png',m.width+'x'+m.height)})"
```

Esperado: `pico <= 132` na saída do `_paleta-familia`, e um PNG de altura entre ~90 e ~116.

⚠️ Ela vive ATRÁS da pintura e só aparece pela janela central (116×89). Se sair muito maior que
isso, reduza no arquivo — nunca com `setScale`:

```bash
node scripts/reduzir-sprite.mjs public/sprites/nadadeira.png 100
```

- [ ] **Passo 5: conferir lado a lado com o canônico**

```bash
node -e "import('sharp').then(async({default:s})=>{const a=await s('public/sprites/rabo-leviata.png').resize({height:160,kernel:'nearest'}).toBuffer();const b=await s('public/sprites/nadadeira.png').resize({height:160,kernel:'nearest'}).toBuffer();const ma=await s(a).metadata(),mb=await s(b).metadata();await s({create:{width:ma.width+mb.width+20,height:160,channels:4,background:{r:5,g:6,b:13,alpha:1}}}).composite([{input:a,left:0,top:0},{input:b,left:ma.width+20,top:0}]).png().toFile('scripts/_cut3/_nadadeira-vs-rabo.png');console.log('scripts/_cut3/_nadadeira-vs-rabo.png — rabo canonico | nadadeira nova')})"
```

**OLHE a imagem.** Se a nadadeira nova ainda não compartilha traço nenhum com o rabo, refaça o
passo 2 — a folga de orçamento existe para isso.

- [ ] **Passo 6: commit**

```bash
git add scripts/_cut3/_estilo-nadadeira.mjs public/sprites/nadadeira.png
git commit -m "feat(fatia6): a nadadeira renasce com o leviata canonico como referencia"
```

---

## Tarefa 7 · A nadadeira: o movimento, com pivô

Esta é a **causa 2** da reprovação, e ela é de código: a peça **atravessava a tela** como um
asteroide. Nadadeira presa num corpo **pivota**.

**Files:**
- Modify: `src/scenes/Interlude3Scene.ts`, `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consumes: textura `nadadeira` (Tarefa 6).
- Produces: `Interlude3Scene.NADADEIRA`
  (`{ pivoX: 440, pivoY: 260, bracoX: -320, bracoY: -120, ang0: 0, ang1: 16 }`); os objetos
  nomeados **`nadadeiraPivo`** (o `Phaser.GameObjects.Container` que gira) e **`nadadeiraCut3`**
  (a peça dentro dele).

- [ ] **Passo 1: reescrever o bloco de assert da nadadeira**

Em `scripts/_cut3/probe-cut3-visual.mjs`, substitua o bloco inteiro da nadadeira — do comentário
`// ─── A NADADEIRA: uma remada só, ...` até a chave que fecha o `if (a) { ... }` — por:

```javascript
// ─── A NADADEIRA: ela PIVOTA, não atravessa ───
//
// ⚠️ O ASSERT ANTIGO COBRAVA `x2 < x1` — a travessia — E FICAVA VERDE EM CIMA DO DEFEITO. Ele
// media a escolha de quem o escreveu, não o que o desenho exige. O Henrique jogou e leu a peça
// como "objeto perdido no espaço", justamente porque ela viajava: nadadeira presa num corpo não
// viaja, ela pivota em torno de um ombro. Agora o assert cobra o PIVÔ, e cobra que o `x` e o `y`
// LOCAIS da peça não se mexam — quem se mexe é o ângulo do braço.
const nad = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const c = s.children.list.filter((o) => o.name === 'nadadeiraPivo')[0];
    const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
    if (!c) return null;
    const peca = c.list.filter((o) => o.name === 'nadadeiraCut3')[0];
    const m = peca ? peca.getWorldTransformMatrix() : null;
    return {
      ang: +c.angle.toFixed(2),
      depth: c.depth,
      depthParede: p ? p.depth : null,
      localX: peca ? Math.round(peca.x) : null,
      localY: peca ? Math.round(peca.y) : null,
      mundoX: m ? Math.round(m.tx) : null,
      mundoY: m ? Math.round(m.ty) : null,
    };
  });

let a = null;
for (let i = 0; i < 40 && !a; i++) { a = await nad(); if (!a) await page.waitForTimeout(200); }
ok(!!a, 'a nadadeira esta em cena, pendurada num braco que pivota');
if (a) {
  await page.waitForTimeout(2500);
  const b = await nad();
  console.log('nadadeira', JSON.stringify(a), '->', JSON.stringify(b));
  ok(!!b, 'ela continua na tela 2,5s depois — a remada e LENTA e o ciclo e longo');
  if (b) {
    ok(b.ang !== a.ang, `o que se move e o ANGULO do braco (${a.ang}deg -> ${b.ang}deg)`);
    ok(b.localX === a.localX && b.localY === a.localY,
       `e a peca nao viaja: x,y locais fixos (${a.localX},${a.localY} -> ${b.localX},${b.localY})`);
    ok(b.mundoY !== a.mundoY, `no mundo ela varre a faixa das janelas (y ${a.mundoY} -> ${b.mundoY})`);
    ok(b.mundoY > 20 && b.mundoY < 175, `dentro da faixa util do quadro (y=${b.mundoY})`);
    ok(b.depth < b.depthParede,
       `e continua ATRAS da pintura (${b.depth} < ${b.depthParede}) — so existe pelo que as janelas deixam ver`);
  }
}
```

- [ ] **Passo 2: rodar e ver falhar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: `✘ a nadadeira esta em cena, pendurada num braco que pivota` — o nome `nadadeiraPivo`
ainda não existe.

- [ ] **Passo 3: trocar a travessia pelo pivô**

Em `src/scenes/Interlude3Scene.ts`, acrescente a constante logo depois de `GARGANTA`:

```typescript
  /**
   * O BRAÇO DA NADADEIRA. O pivô é o OMBRO do Leviatã, e ele fica FORA DO QUADRO, embaixo e à
   * direita — que é onde a Fase 3 já cravou que o corpo dele está (ele nada para a direita, com o
   * casco fora da tela desse lado).
   *
   * O braço (`bracoX`, `bracoY`) é medido para a peça varrer a FAIXA DAS JANELAS, que o alpha da
   * pintura põe em y=44..132: em ângulo 0 o centro dela cai em (120, 140), logo abaixo da faixa;
   * em 16° cai em (166, 56), logo acima. A remada cruza a janela inteira, de baixo para cima.
   */
  private static readonly NADADEIRA = {
    pivoX: 440, pivoY: 260,
    bracoX: -320, bracoY: -120,
    ang0: 0, ang1: 16,
  } as const;
```

Substitua o método `nadadeira()` INTEIRO (comentário de documentação incluído) por:

```typescript
  /**
   * A NADADEIRA PEITORAL — e o conserto de 2026-09-04 foi de CÓDIGO, não só de arte.
   *
   * ⚠️ ELA VIVE ATRÁS DA PINTURA, e é isso que faz a cena funcionar sem máscara nenhuma. As
   * janelas são as ÚNICAS aberturas da pintura, então ela só aparece por elas — o quadro da
   * janela a recorta sozinho, e esse recorte é o que vende que ela está do lado de fora do casco.
   * Com a garganta ocluindo as janelas #4 e #5, as que sobram são a #1, a #2 e a central #3.
   *
   * ⚠️ A 1ª VOLTA FOI REPROVADA POR DUAS COISAS SEPARADAS, e esta é a segunda. A arte estava
   * errada (asa de morcego — ver a Tarefa 6 do plano de 2026-09-04), mas o MOVIMENTO estava
   * errado sozinho: ela ATRAVESSAVA a tela num tween de `x`, da direita para a esquerda, e o
   * Henrique leu exatamente o que isso é — "um objeto perdido no espaço".
   *
   * ⚠️ NADADEIRA PRESA NUM CORPO NÃO VIAJA: ELA PIVOTA. O container mora no ombro, a peça mora na
   * ponta do braço, e o que se anima é UM ângulo. A lei antiga desta cena ("é uma linha só: o
   * `x`") continua valendo — ela só estava aplicada ao eixo errado. O eixo certo é o ângulo.
   *
   * A REMADA: 7s de ida, 9s de VOLTA — a volta é mais lenta porque a ida é a braçada de força —,
   * com pausa nos extremos, em ciclo longo e infinito. Ela é vida de fundo, não um evento que
   * passa uma vez e se perde.
   */
  private nadadeira(): void {
    if (!this.textures.exists('nadadeira')) return;

    const n = Interlude3Scene.NADADEIRA;

    const peca = this.add.image(n.bracoX, n.bracoY, 'nadadeira').setName('nadadeiraCut3');
    const braco = this.add
      .container(n.pivoX, n.pivoY, [peca])
      .setAngle(n.ang0)
      .setDepth(Interlude3Scene.DEPTH_HANGAR - 1)
      .setName('nadadeiraPivo');

    this.tweens.chain({
      targets: braco,
      loop: -1,
      tweens: [
        { angle: n.ang1, duration: 7000, ease: 'Sine.easeInOut', hold: 900 },
        { angle: n.ang0, duration: 9000, ease: 'Sine.easeInOut', hold: 700 },
      ],
    });
  }
```

- [ ] **Passo 4: rodar e ver passar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
npm run typecheck
```

Esperado: os seis asserts do bloco `nadadeira` verdes.

⚠️ Se `mundoY` sair fora de 20..175, **não afrouxe o assert**: ajuste `bracoX`/`bracoY` até a peça
cair dentro da faixa das janelas, e escreva no comentário o número medido.

- [ ] **Passo 5: olhar a remada**

```bash
node scripts/_cut3/ver-cena.mjs
```

Nos 16 quadros de `scripts/_cut3/cena-hoje.png`, a nadadeira tem que aparecer pelas janelas
#1/#2/#3 em alturas DIFERENTES ao longo da cena, e nunca sair pela borda esquerda.

- [ ] **Passo 6: commit**

```bash
git add src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): a nadadeira para de atravessar a tela e passa a remar num pivo"
```

---

## Tarefa 8 · As 17 luzes e as 3 faíscas — 100% código

**Files:**
- Modify: `src/scenes/Interlude3Scene.ts`, `scripts/_cut3/probe-cut3-visual.mjs`

**Interfaces:**
- Consumes: `this.alarme` (Tarefa 4), `Interlude3Scene.DEPTH_GARGANTA` (Tarefa 3).
- Produces: `Interlude3Scene.LAMPADAS`, `LAMPADAS_FALHAS`, `JUNCOES`, `DEPTH_LUZ` (70,5); o campo
  `private luzes: Phaser.GameObjects.Rectangle[]`; o método **público** `pulsarLampadas(): void`;
  os objetos nomeados `lampadaCut3` e `faiscaCut3`.

- [ ] **Passo 1: reconferir as medições**

```bash
node scripts/_cut3/_medir-lampadas.mjs
```

Esperado: `LÂMPADAS: 17   (186 pixels no total)` e o array pronto no fim da saída. ⚠️ Se sair outro
número, a pintura mudou — **use a saída nova, não a tabela abaixo.**

- [ ] **Passo 2: escrever os asserts que ainda falham**

Em `scripts/_cut3/probe-cut3-visual.mjs`, logo depois do bloco da nadadeira, acrescente:

```javascript
// ─── AS 17 LÂMPADAS: elas JÁ ESTÃO PINTADAS, e o que entra é intensidade ───
//
// ⚠️ "Fazer as luzes piscarem" não é arte nova nesta cena. As 17 estão dentro do
// `paint-bg-cut3.png` (186 pixels no total, medidos por `_medir-lampadas.mjs`): o código só põe
// brilho ADITIVO em cima delas, cada um na COR PRÓPRIA daquela lâmpada. Nada muda de cor.
const luz1 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ls = s.children.list.filter((o) => o.name === 'lampadaCut3');
  const p = s.children.list.filter((o) => o.name === 'paredeCut3')[0];
  const g = s.children.list.filter((o) => o.name === 'gargantaCut3')[0];
  return {
    n: ls.length,
    cores: [...new Set(ls.map((o) => o.fillColor))].length,
    depth: ls.length ? ls[0].depth : null,
    depthParede: p ? p.depth : null,
    depthGarganta: g ? g.depth : null,
    alphas: ls.map((o) => +o.alpha.toFixed(3)),
    faiscas: s.children.list.filter((o) => o.name === 'faiscaCut3').length,
  };
});
console.log('luzes   ', JSON.stringify({ ...luz1, alphas: `${luz1.alphas.length} valores` }));
ok(luz1.n === 17, `as 17 lampadas pintadas ganharam brilho (${luz1.n})`);
ok(luz1.cores >= 10, `cada uma na COR PROPRIA dela, nao numa cor so (${luz1.cores} cores distintas)`);
ok(luz1.depth > luz1.depthParede, `o brilho fica acima da pintura (${luz1.depth} > ${luz1.depthParede})`);
ok(luz1.depth < luz1.depthGarganta,
   `e ABAIXO da garganta (${luz1.depth} < ${luz1.depthGarganta}) — as que caem atras dela somem sozinhas`);
ok(new Set(luz1.alphas).size > 6, `elas respiram fora de fase umas das outras (${new Set(luz1.alphas).size} alphas distintos)`);
ok(luz1.faiscas === 3, `os 3 emissores de faisca estao nas juncoes (${luz1.faiscas})`);

// ⚠️ O DETERMINISMO, PROVADO. Fase e semente são derivadas do índice; um `Math.random()` por
// quadro faria a sonda comparar duas cenas diferentes. Chamando `pulsarLampadas()` de novo no
// MESMO tick (o `this.t` não avançou), a lista de alphas tem que sair idêntica.
const det = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ler = () => s.children.list.filter((o) => o.name === 'lampadaCut3').map((o) => +o.alpha.toFixed(6));
  const a = ler();
  s.pulsarLampadas();
  const b = ler();
  return { igual: a.length === b.length && a.every((v, i) => v === b[i]) };
});
ok(det.igual, 'o pulso e DERIVADO do tempo, nunca sorteado (duas leituras no mesmo tick batem)');
```

⚠️ O último assert exige que `pulsarLampadas()` seja **público** e função só de `this.t`. É de
propósito: é o que impede um `Math.random()` de entrar depois.

- [ ] **Passo 3: rodar e ver falhar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
```

Esperado: `✘ as 17 lampadas pintadas ganharam brilho (0)`.

- [ ] **Passo 4: acender as lâmpadas**

Em `src/scenes/Interlude3Scene.ts`, acrescente o campo:

```typescript
  /** Os 17 brilhos aditivos, um por lâmpada pintada na arte. */
  private luzes: Phaser.GameObjects.Rectangle[] = [];
```

No bloco das profundidades, entre `DEPTH_HANGAR` e `DEPTH_ENTULHO`:

```typescript
  // O brilho das lâmpadas fica logo acima da pintura e ABAIXO da garganta: as que caem atrás
  // dela somem sozinhas, sem uma linha de código pedindo.
  private static readonly DEPTH_LUZ = 70.5;
```

Depois da constante `ENTULHO`, acrescente:

```typescript
  /**
   * AS 17 LÂMPADAS QUE JÁ ESTÃO PINTADAS NA ARTE — `[x, y, w, h, cor própria]`.
   *
   * ⚠️ "FAZER AS LUZES PISCAREM" NÃO É ARTE NOVA NESTA CENA. Elas estão dentro do
   * `paint-bg-cut3.png`, e o que falta é intensidade. Medidas por
   * `node scripts/_cut3/_medir-lampadas.mjs` (2026-09-03): 17 aglomerados, **186 pixels no
   * total** — é literalmente toda a energia elétrica do quadro. A pintura é espelhada, então elas
   * saem em pares (L1↔L3, L2↔L4, L5↔L6, L7↔L12, L8↔L13, L9↔L10, L11↔L14).
   *
   * ⚠️ CADA UMA NA COR DELA. Um tint único para as 17 apagaria a variação que a pintura já tem.
   */
  private static readonly LAMPADAS: ReadonlyArray<readonly [number, number, number, number, number]> = [
    [88, 145, 10, 2, 0x962e24], [45, 19, 9, 2, 0x7f4020], [297, 145, 8, 2, 0x953025],
    [339, 19, 8, 2, 0x84431f], [30, 184, 7, 2, 0x994631], [354, 184, 7, 2, 0x9e4831],
    [353, 147, 4, 4, 0x984232], [138, 185, 4, 4, 0x9c4736], [225, 37, 6, 3, 0x914221],
    [159, 37, 5, 3, 0x93421c], [106, 47, 3, 4, 0x8a3a17], [31, 147, 3, 4, 0xaa5540],
    [246, 185, 5, 2, 0xa7573e], [278, 47, 2, 4, 0x9d4d23], [239, 146, 3, 3, 0x99461e],
    [145, 146, 2, 3, 0xa04c20], [298, 156, 5, 3, 0x651b18],
  ];

  /**
   * AS TRÊS DE MAU CONTATO — escolha FIXA por índice, gravada aqui, nunca sorteada.
   * A última delas (índice 16, `0x651b18`) é a mais escura das 17: ela já parece meio morta na
   * pintura, e é a que menos custa apagar.
   */
  private static readonly LAMPADAS_FALHAS: readonly number[] = [6, 11, 16];

  /**
   * AS TRÊS JUNÇÕES QUE FAÍSCAM. Os x saem das PAREDES entre as janelas medidas, não do olho: a
   * #2 acaba em 95 e a #3 começa em 134 → 115; a #3 acaba em 249 e a #4 começa em 288 → 268; o
   * pilar entre a #1 e a #2 vai de 48 a 63 → 55. Os y são o topo (44) e o pé (132) da faixa
   * vazada.
   */
  private static readonly JUNCOES: ReadonlyArray<readonly [number, number]> = [
    [115, 44], [268, 44], [55, 132],
  ];
```

Acrescente os três métodos, logo depois de `plantarGarganta()`:

```typescript
  /**
   * O BRILHO ADITIVO em cima de cada lâmpada pintada. O retângulo é 2px maior que a lâmpada em
   * cada eixo: o vazamento de 1px em volta é o que faz ler como BULBO em vez de adesivo.
   */
  private acenderLampadas(): void {
    this.luzes = Interlude3Scene.LAMPADAS.map(([x, y, w, h, cor]) =>
      this.add
        .rectangle(x, y, w + 2, h + 2, cor)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Interlude3Scene.DEPTH_LUZ)
        .setAlpha(0.35)
        .setName('lampadaCut3'),
    );
  }

  /**
   * O PULSO — chamado do `update`, e PÚBLICO porque a sonda o chama duas vezes no mesmo tick para
   * provar que ele é determinístico.
   *
   * ⚠️ FASE E SEMENTE SÃO DERIVADAS DO ÍNDICE, NUNCA SORTEADAS. A sonda compara quadros; um
   * `Math.random()` aqui a quebraria, e a cena deixaria de se reproduzir entre execuções.
   */
  pulsarLampadas(): void {
    for (let i = 0; i < this.luzes.length; i++) {
      const luz = this.luzes[i];

      if (this.alarme) {
        // NO COLAPSO TODAS VIRAM ALARME: pulso rápido em uníssono, e a cor sai da lâmpada e vai
        // para o `enemy`. O quadro inteiro passa a dizer a mesma coisa ao mesmo tempo.
        luz.setFillStyle(COLORS.enemy);
        luz.setAlpha(0.25 + Math.abs(Math.sin(this.t * 7)) * 0.6);
        continue;
      }

      if (Interlude3Scene.LAMPADAS_FALHAS.includes(i)) {
        // MAU CONTATO: duas senoides incomensuráveis se multiplicando. Irregular ao olho, e
        // IDÊNTICA a cada execução — que é exatamente o que a sonda precisa.
        const s = Math.sin(this.t * 11.3 + i * 2.7) * Math.sin(this.t * 4.1 + i);
        luz.setAlpha(s > 0.15 ? 0.5 : s > -0.4 ? 0.08 : 0);
        continue;
      }

      // AS 14 QUE RESPIRAM, entre alpha 0,15 e 0,55, cada uma na sua fase e no seu ritmo.
      const fase = (i * Math.PI * 2) / Interlude3Scene.LAMPADAS.length;
      const vel = 1.1 + (i % 5) * 0.13;
      luz.setAlpha(0.35 + Math.sin(this.t * vel + fase) * 0.2);
    }
  }

  /**
   * AS FAÍSCAS das três junções da parede. Curtas, laranja, caindo — é metal cedendo, não fogo.
   *
   * ⚠️ INTERVALO E QUANTIDADE DERIVADOS DO ÍNDICE (2,2s / 2,9s / 3,6s e 3 / 4 / 5 partículas). O
   * olho lê "de vez em quando, em pontos diferentes"; a sonda lê a MESMA cena toda vez.
   */
  private faiscar(): void {
    Interlude3Scene.JUNCOES.forEach(([x, y], i) => {
      const em = this.add
        .particles(x, y, 'spark', {
          lifespan: { min: 220, max: 520 },
          speedX: { min: -12, max: 12 },
          speedY: { min: 10, max: 46 },
          gravityY: 90,
          scale: { start: 1, end: 0 },
          tint: [COLORS.hot, COLORS.hotBright],
          blendMode: 'ADD',
          emitting: false,
        })
        .setDepth(Interlude3Scene.DEPTH_LUZ)
        .setName('faiscaCut3');

      this.time.addEvent({
        delay: 2200 + i * 700,
        loop: true,
        startAt: i * 400,
        callback: () => {
          if (!this.done) em.explode(3 + i, x, y);
        },
      });
    });
  }
```

Em `create()`, logo depois de `this.plantarGarganta();`:

```typescript
    this.acenderLampadas();
    this.faiscar();
```

E em `create()`, junto dos outros resets:

```typescript
    this.luzes = [];
```

Em `update()`, logo depois de `this.parallax.update(dt, 14);`:

```typescript
    this.pulsarLampadas();
```

- [ ] **Passo 5: rodar e ver passar**

```bash
node scripts/_cut3/probe-cut3-visual.mjs
npm run typecheck
```

Esperado: os sete asserts do bloco `luzes` verdes.

- [ ] **Passo 6: commit**

```bash
git add src/scenes/Interlude3Scene.ts scripts/_cut3/probe-cut3-visual.mjs
git commit -m "feat(fatia6): as 17 lampadas pintadas ganham pulso, e o colapso vira alarme"
```

---

## Tarefa 9 · O fechamento: a fatia inteira de pé, a fronteira intacta, os documentos

**Files:**
- Modify: `docs/HANDOFF.md`, `docs/ASSETS.md`
- Modify: `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md`

**Interfaces:**
- Consumes: tudo acima. Produces: nada de código — é a prova e o registro.

- [ ] **Passo 1: a fronteira com a Fase 4, provada**

```bash
git status --porcelain public/sprites/hangar.png
node -e "import('sharp').then(async({default:s})=>{const m=await s('public/sprites/hangar.png').metadata();console.log('hangar.png',m.width+'x'+m.height)})"
```

Esperado: **nenhuma linha** do `git status` (o arquivo não foi tocado) e `hangar.png 160x160`.

- [ ] **Passo 2: as sondas, UMA POR VEZ**

⚠️ Três browsers headless no mesmo Vite quebram. Uma por vez, nesta ordem:

```bash
node scripts/_cut3/probe-cut3-visual.mjs
node scripts/probe-interlude3.mjs
node scripts/probe-stage4.mjs
node scripts/probe-f3-visual.mjs
node scripts/probe-menu.mjs
```

Esperado:
- `probe-cut3-visual`: `✔ A FATIA 6 ESTA DE PE`, com `usamHangar: 0`;
- `probe-interlude3`: verde, com a nave parando em `y = 164` (`DECK_Y − 7`) — **este assert não
  muda**;
- `probe-stage4`: verde — é a fronteira;
- `probe-f3-visual`: ⚠️ **tem ruído documentado** (contagem de lança-mísseis por sorteio, faixa
  real medida 2 a 8). Se falhar por contagem, **rode de novo — não afrouxe o assert**;
- `probe-menu`: verde.

- [ ] **Passo 3: a build**

```bash
npm run build
```

Esperado: `tsc --noEmit` limpo e o bundle gerado sem erro.

- [ ] **Passo 4: a tira de conferência**

```bash
node scripts/_cut3/ver-cena.mjs
node scripts/_cut3/_ver-colapso.mjs
```

Abra `scripts/_cut3/cena-hoje.png` e `scripts/_cut3/colapso.png`. Confira, na imagem: a garganta na
direita **no primeiro quadro** · a nadadeira aparecendo pelas janelas em alturas diferentes · as 17
luzes respirando · o torpedo cruzando a tela · o entulho murando a esquerda **depois** da onda ·
nenhum portão em lugar nenhum.

- [ ] **Passo 5: `docs/ASSETS.md`**

Acrescente, no fim da seção de lições:

```markdown
### 2026-09-04 — a caixa do recorte é UMA por PEÇA, não uma por LOTE

`install-anim.mjs` calcula a caixa união **de um lote**. Uma peça com DUAS animações — a garganta
tem idle e morte — rodada duas vezes por ele ganha **duas caixas diferentes**, e o sprite SALTA no
instante da troca. Na Cutscene 3 a troca acontece no impacto do torpedo: o único quadro da cena em
que ninguém pode piscar.

`scripts/_cut3/_instalar-garganta.mjs` existe por isso: ele baixa o estático e os dois lotes,
limpa tudo, e calcula UMA caixa sobre o conjunto inteiro. **Peça com mais de uma animação precisa
de um instalador que veja todas de uma vez** — irmã da lição de 02/09 sobre a cor morar no
arquivo, e pelo mesmo motivo: o que salta na tela nasce de uma decisão tomada num lote que não
sabia do outro.
```

- [ ] **Passo 6: `docs/HANDOFF.md`**

Atualize a data do topo para **2026-09-04**, e na seção da Fatia 6 registre, com os números que
saíram nesta execução:

- a 2ª volta implementada: a garganta (arte, idle, morte, geometria), o beat final de cinco tempos,
  os 4 destroços, a nadadeira refeita com pivô, as 17 luzes e as 3 faíscas;
- **o portão saiu** — do disco, do `BootScene` e da cena;
- **a 3ª carcaça saiu**, com o motivo (a garganta cobre x=235..426) e a decisão do Henrique de
  2026-09-04;
- **o risco aberto para o próximo teste jogado:** a nave passa ~10s parada em x=258, sobre as
  tentáculas da criatura — casco escuro sobre corpo escuro. **É para ser julgado.**
- a altura real da garganta instalada e a caixa única das 19 imagens;
- as gerações do PixelLab gastas nesta rodada.

E no roadmap, mova a Fatia 6 para `🟠 2ª volta implementada — aguardando teste jogado`.

- [ ] **Passo 7: o START muda de mão pela terceira vez**

Reescreva `docs/superpowers/plans/2026-09-01-cutscene3-visual-START.md` para quem vai **TESTAR** a
2ª volta: a frase de arranque, o que olhar bloco a bloco (a garganta desde o primeiro quadro · o
beat final e a corrente causal · os destroços · a nadadeira, arte E movimento · as luzes), o risco
aberto da nave sobre as tentáculas, e a fronteira da Fatia 7 continuando de pé.

- [ ] **Passo 8: commit**

```bash
git add docs/
git commit -m "docs(fatia6): a 2a volta implementada, e o START passa para quem vai testar"
```

- [ ] **Passo 9: o relatório final**

Reporte ao Henrique, com os números medidos (não estimados): o que passou em cada sonda, a altura
real da garganta, os picos de luminância das peças novas, quantas gerações foram gastas, e
**explicitamente** o risco aberto da nave parada sobre a criatura.

⚠️ **Não faça o merge nem o push** — a branch continua local até ele jogar a cena.

---

## Auto-revisão contra o spec

| seção do spec | onde ela é implementada |
|---|---|
| 3.1 A criatura (arte, paleta, geometria, animações) | Tarefas 2 e 3 |
| 3.2 O beat final, cinco tempos, míssil próprio | Tarefa 4 |
| 3.3 Os destroços, 9 posições fixas, ordem invertida | Tarefa 5 |
| 3.4 A nadadeira: arte com referência + pivô | Tarefas 6 e 7 |
| 3.5 As luzes (17, sendo 14 + 3) e as faíscas (3 junções) | Tarefa 8 |
| 4. O que sai da árvore (portão, `nadadeira.png`) | Tarefas 2, 4 e 6 |
| 5. A sonda (cai o portão, entram 5 blocos) | Tarefas 3, 4, 5, 7, 8, 9 |
| 6. Orçamento | Tarefas 2, 5 e 6 (~120 gerações de 5.000) |
| 7. Decisões fechadas + a fronteira | Global Constraints e Tarefa 9 |

**Ponto do spec que este plano CORRIGE:** o orçamento (seção 6) diz que as gerações "zeram em
2026-09-04". Medido em 2026-09-04: o ciclo **reabasteceu para 5.000**, com a próxima virada em
**2026-10-04**. Não há pressa de calendário nenhuma.

**Ponto do spec que este plano RESOLVE por decisão do Henrique:** a colisão entre a geometria da
garganta e as posições já decididas no convés (a 3ª carcaça e o vão de parada da nave) — ver
"A DECISÃO NOVA DESTA SESSÃO", no topo.
