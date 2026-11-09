# O cenário do casco e da arena (F3) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** a F3, do casco em diante, volta a ler como "dentro da nebulosa de Kepler": a pintura do Ato 1 fica (versão
escura da arena), nuvens à deriva, a luz da nebulosa, o casco vivo, a batalha ao fundo — e a arena da luta final mais
limpa. Spec: `docs/superpowers/specs/2026-11-08-cenario-casco-arena-design.md`.

**Architecture:** tudo novo mora atrás da chave de dev `?cenario=novo` (desligada por padrão) até a aprovação dele na
rodada 4. O céu é um módulo próprio (`src/f3/ceuDoCasco.ts`) que o `Parallax` liga no preto da virada (ou no
`cascoNaProa` do treino/atalho). A Atmosfera ganha dois perfis (`faseF3Casco`, `faseF3Arena`) escolhidos pela chave da
pintura na tela. A arte é ASSADA por script a partir da pintura dele (`paint-bg-f3.png`), 1 px = 1 px.

**Tech Stack:** Phaser 3.90, TypeScript (Node 24 lê `.ts` direto nos testes), sharp, Playwright (sondas), ffmpeg.

## Global Constraints

- **Só visual e cenário.** Inimigos, aranha, props, Serpente de 3 cabeças, fusão e enguia NÃO mudam (código e
  desenho). `node scripts/test-enguia-porte.mjs` tem de passar ao fim de cada rodada.
- **Fundo pintado em 384×216, escala 1; reduzir pode, aumentar nunca.** Nada do céu novo é desenhado com `scale ≠ 1`.
- **Dark sci-fi:** casco escuro, luz só onde há energia. Nada no fundo em vermelho (aviso) nem branco-azulado (faixa
  livre dos canos).
- **Rodada a rodada:** folha com vídeo na velocidade real, ANTES × DEPOIS; ele aprova antes da próxima.
- **Não editar `src/` nem `.html` do projeto enquanto uma sonda filma** (o Vite recarrega).
- **Editar com Edit/Write** (sed/node -e falham em silêncio aqui: CRLF, `${}`); PowerShell sempre com `-Encoding utf8`.
- **Commit só quando ele pedir,** só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos e `cru/` fora.
- Conversa em pt-br; código, comentários novos e prompts em inglês (os comentários do projeto seguem o idioma do
  arquivo que se edita).

## Fatos medidos que corrigem o START (08/11)

- Os "blocos azuis" das fotos da arena NÃO são as `nebula3` (essas são `nebulosaExtra` e já apagam com a nuvem em
  t=49). São a camada `nebula` do espaço (−98, `nebula.png` 105×101 / `nebula-2.png` 99×99, `scale` 1,1–1,8), montada
  no construtor do `Parallax` para todo modo. Com a pintura opaca ficando (−96), ela e o planeta (−97) ficam atrás —
  somem sozinhos; o plano só para de emiti-los.
- **O brilho dos destroços que escurece as nuvens** vem do `ADD` do Phaser (ONE, DST_ALPHA) na `Tela` aditiva
  (`src/systems/morte/MorteDaNave.ts:103`). Ele só escurece onde o alvo tem alfa < 1, ou seja, sobre céu
  transparente. Com a pintura opaca atrás, o alfa do alvo é 1 em toda a tela e o defeito some. A rodada 1 CONFERE
  isso em foto (Task 6); a troca para o `aditivoPuro` só entra se o defeito ainda aparecer.

## Estrutura de arquivos (rodada 1)

| Arquivo | Papel |
|---|---|
| `scripts/_cenario/_f3-ceu-assar.mjs` (novo) | Assa os 3 céus da arena e as nuvens de cada nível a partir de `paint-bg-f3.png`; imprime as cores da Atmosfera |
| `public/sprites/f3casco/ceu-{1,2,3}.png`, `nuvem-longe-{1,2,3}.png`, `nuvem-perto-{1,2,3}.png` (novos) | A arte assada |
| `src/f3/numerosCeuF3.ts` (novo, puro) | Os números do céu: níveis, nuvens, profundidades, regime → chave da pintura |
| `src/f3/ceuDoCasco.ts` (novo) | As nuvens à deriva (TileSprites a 1 px), andando por vento próprio + mundo |
| `src/systems/atmosfera/perfis.ts` | `faseF3Casco`, `faseF3Arena`, as chaves novas, `MS_DA_TROCA` |
| `src/Parallax.ts` | A chave, `ligarCeuDoCasco`, `regimeDoCeu`, a pintura que fica, `pinturaNaTela` |
| `src/systems/StageDirector.ts` | O evento `ceu` (o regime da arena no silêncio, t=89) |
| `src/scenes/GameScene.ts` | Lê a chave, liga o céu no preto e no treino, trata `ceu`, o tempo da troca de perfil |
| `src/scenes/BootScene.ts` | Carrega a arte nova |
| `scripts/test-f3-ceu.mjs` (novo) | Os números, as chaves e o tamanho da arte (a lei dos fundos) |
| `scripts/_cenario/_f3-casco-filmar.mjs` (novo) | A sonda: fotos e vídeo da virada/Ato 2 (corrida real) e das lutas (atalho) |
| `scripts/_serpente/_sonda-enguia.mjs` | Ganha `--q <query>` para filmar a enguia com o céu novo |
| `docs/superpowers/folhas/2026-11-08/cenario-casco/ceu.html` (novo) | A folha da rodada 1 |

---

### Task 1: Assar o céu da arena e as nuvens

**Files:**
- Create: `scripts/_cenario/_f3-ceu-assar.mjs`
- Create: `public/sprites/f3casco/*.png` (saída do script)

**Interfaces:**
- Produces: `ceu-N.png` 384×216 opaco; `nuvem-longe-N.png` e `nuvem-perto-N.png` 768×216 com alfa, emendáveis na
  horizontal (metade direita = espelho da esquerda); no console, por nível, `nevoa [r,g,b]` e `halo [r,g,b]`.

- [ ] **Step 1: Escrever o script**

```js
// 08/11 — THE ARENA SKY (spec 2026-11-08-cenario-casco-arena §2): his Act 1 painting, kept for the casco and the arena,
// darker and flatter ("farther" by light, never by size), at 384×216; and the drifting clouds cut from the same
// painting by brightness (the rocks are dark, so they drop out). Three darkness levels for him to choose on the sheet.
// The clouds are 768 wide: the cut and its mirror side by side, so the TileSprite wraps without a seam.
//   node scripts/_cenario/_f3-ceu-assar.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/sprites/paint-bg-f3.png';
const OUT = 'public/sprites/f3casco';
const W = 384, H = 216;
// brightness × and contrast (toward the mean) per level
const NIVEIS = { 1: { brilho: 0.78, contraste: 0.9 }, 2: { brilho: 0.62, contraste: 0.8 }, 3: { brilho: 0.48, contraste: 0.7 } };
// the two cloud layers: which transform of the painting, the brightness key, the max alpha
const NUVENS = {
  longe: { espelhaH: true, espelhaV: false, desce: 60, lum0: 0.16, lum1: 0.46, aMax: 0.34 },
  perto: { espelhaH: false, espelhaV: true, desce: 0, lum0: 0.2, lum1: 0.5, aMax: 0.2 },
};

fs.mkdirSync(OUT, { recursive: true });
const { data: src } = await sharp(SRC).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const media = [0, 1, 2].map((c) => { let s = 0; for (let i = c; i < src.length; i += 3) s += src[i]; return s / (W * H); });
const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

for (const [n, { brilho, contraste }] of Object.entries(NIVEIS)) {
  const ceu = Buffer.alloc(W * H * 3);
  for (let i = 0; i < ceu.length; i++) {
    const c = i % 3;
    ceu[i] = Math.max(0, Math.min(255, Math.round((media[c] + (src[i] - media[c]) * contraste) * brilho)));
  }
  await sharp(ceu, { raw: { width: W, height: H, channels: 3 } }).png().toFile(`${OUT}/ceu-${n}.png`);

  for (const [nome, k] of Object.entries(NUVENS)) {
    const meia = Buffer.alloc(W * H * 4);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const sx = k.espelhaH ? W - 1 - x : x;
        const sy0 = (y + k.desce) % H;
        const sy = k.espelhaV ? H - 1 - sy0 : sy0;
        const j = (sy * W + sx) * 3, o = (y * W + x) * 4;
        const r = ceu[j], g = ceu[j + 1], b = ceu[j + 2];
        // the key reads the ORIGINAL painting's light (the darkened sky would key almost nothing)
        const l = lum(src[j], src[j + 1], src[j + 2]);
        const a = Math.max(0, Math.min(1, (l - k.lum0) / (k.lum1 - k.lum0))) * k.aMax;
        meia[o] = r; meia[o + 1] = g; meia[o + 2] = b; meia[o + 3] = Math.round(a * 255);
      }
    }
    const esq = sharp(meia, { raw: { width: W, height: H, channels: 4 } });
    const dir = await sharp(meia, { raw: { width: W, height: H, channels: 4 } }).flop().png().toBuffer();
    await sharp({ create: { width: 2 * W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await esq.png().toBuffer(), left: 0, top: 0 }, { input: dir, left: W, top: 0 }])
      .png().toFile(`${OUT}/nuvem-${nome}-${n}.png`);
  }

  // the Atmosfera colours, the cutscenes' recipe: fog = mean of the mid-dark tones ×1.5 + a cool touch; halo = mean of
  // what is warm and lit
  let nev = [0, 0, 0], nn = 0, hal = [0, 0, 0], nh = 0;
  for (let i = 0; i < ceu.length; i += 3) {
    const r = ceu[i], g = ceu[i + 1], b = ceu[i + 2], l = lum(r, g, b);
    if (l >= 0.08 && l <= 0.3) { nev[0] += r; nev[1] += g; nev[2] += b; nn++; }
    if (src[i] >= 150 && src[i] > src[i + 2]) { hal[0] += src[i]; hal[1] += src[i + 1]; hal[2] += src[i + 2]; nh++; }
  }
  const nevoa = nev.map((v, c) => Math.min(255, Math.round((v / Math.max(1, nn)) * 1.5 + [0, 4, 12][c])));
  const halo = hal.map((v) => Math.round(v / Math.max(1, nh)));
  console.log(`nivel ${n}: nevoa [${nevoa}] halo [${halo}] (${nn} px médios, ${nh} px quentes)`);
}
```

- [ ] **Step 2: Rodar e conferir**

Run: `node scripts/_cenario/_f3-ceu-assar.mjs`
Expected: 3 linhas `nivel N: nevoa [...] halo [...]` e 9 PNGs em `public/sprites/f3casco/`. Abrir AMPLIADOS
`ceu-2.png` e `nuvem-longe-2.png` (Read) e conferir: o céu é a pintura dele escurecida (sem borrão, sem corte), as
rochas sumiram das nuvens, a emenda do meio (x=384) não aparece. Anotar as cores do nível 2.

### Task 2: Os números do céu e a lei dos fundos (teste primeiro)

**Files:**
- Create: `scripts/test-f3-ceu.mjs`
- Create: `src/f3/numerosCeuF3.ts`

**Interfaces:**
- Produces:
  - `type NivelCeuF3 = 1 | 2 | 3`, `type RegimeCeuF3 = 'ato1' | 'casco' | 'arena'`
  - `NUVENS_F3: readonly { chave: 'f3NuvemLonge' | 'f3NuvemPerto'; depth: number; deriva: number; fator: number; x0: number }[]`
  - `chaveCeuF3(n: NivelCeuF3): string` → `'f3Ceu1'…`
  - `chavePinturaF3(r: RegimeCeuF3): 'paintBgF3' | 'paintBgF3Casco' | 'paintBgF3Arena'`
  - `PROFUNDIDADES_OCUPADAS_F3: readonly number[]` (as que existem entre a pintura e o casco)

- [ ] **Step 1: Escrever o teste**

```js
// The F3 casco sky's numbers (spec 2026-11-08-cenario-casco-arena): the keys, the depths and the baked art's size —
// the background law (384×216, scale 1; the clouds 768×216 wrap).   node scripts/test-f3-ceu.mjs
import sharp from 'sharp';
import { NUVENS_F3, chaveCeuF3, chavePinturaF3, PROFUNDIDADES_OCUPADAS_F3 } from '../src/f3/numerosCeuF3.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };

ok(chavePinturaF3('ato1') === 'paintBgF3', 'ato 1: the old painting key (its profile unchanged)');
ok(chavePinturaF3('casco') === 'paintBgF3Casco', 'casco: its own key');
ok(chavePinturaF3('arena') === 'paintBgF3Arena', 'arena: its own key');
ok([1, 2, 3].every((n) => chaveCeuF3(n) === `f3Ceu${n}`), 'sky keys f3Ceu1..3');

for (const n of NUVENS_F3) {
  ok(n.depth > -96 && n.depth < -75, `${n.chave}: between the painting (−96) and the casco (−75): ${n.depth}`);
  ok(!PROFUNDIDADES_OCUPADAS_F3.includes(n.depth), `${n.chave}: no tie with an existing depth`);
  ok(n.deriva < 0, `${n.chave}: drifts left on its own wind (${n.deriva} px/s)`);
}
ok(NUVENS_F3[0].depth < NUVENS_F3[1].depth && NUVENS_F3[0].fator < NUVENS_F3[1].fator, 'the far layer is behind and slower');

for (const n of [1, 2, 3]) {
  const c = await sharp(`public/sprites/f3casco/ceu-${n}.png`).metadata();
  ok(c.width === 384 && c.height === 216, `ceu-${n}: 384×216 (${c.width}×${c.height})`);
  for (const k of ['longe', 'perto']) {
    const m = await sharp(`public/sprites/f3casco/nuvem-${k}-${n}.png`).metadata();
    ok(m.width === 768 && m.height === 216 && m.hasAlpha, `nuvem-${k}-${n}: 768×216 with alpha`);
  }
}
if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-f3-ceu.mjs`
Expected: FAIL — `Cannot find module .../src/f3/numerosCeuF3.ts`.

- [ ] **Step 3: Escrever o módulo**

```ts
/**
 * THE F3 CASCO SKY, IN NUMBERS (spec 2026-11-08-cenario-casco-arena §2, §7). Pure: the probes and tests read it.
 *
 * From the black of the turn on, his Act 1 painting stays (a darker bake, `ceu-N.png`) and two thin cloud layers cut
 * from it drift on their own wind (they keep moving when the world stops for the fight). Everything at scale 1.
 */
export type NivelCeuF3 = 1 | 2 | 3;
export type RegimeCeuF3 = 'ato1' | 'casco' | 'arena';

/** The depths already taken between the painting (−96) and the casco band (−75): moon, ruins, silhouette, masks. */
export const PROFUNDIDADES_OCUPADAS_F3: readonly number[] = [-95.5, -95, -94, -93.5];

/** Far layer first. `deriva` px/s of its own wind; `fator` × the world's speed (the Act 2 scroll); `x0` its start. */
export const NUVENS_F3 = [
  { chave: 'f3NuvemLonge', depth: -92, deriva: -2, fator: 0.03, x0: 0 },
  { chave: 'f3NuvemPerto', depth: -91, deriva: -4.5, fator: 0.06, x0: 211 },
] as const;

export function chaveCeuF3(n: NivelCeuF3): string {
  return `f3Ceu${n}`;
}

export function chavePinturaF3(r: RegimeCeuF3): 'paintBgF3' | 'paintBgF3Casco' | 'paintBgF3Arena' {
  return r === 'ato1' ? 'paintBgF3' : r === 'casco' ? 'paintBgF3Casco' : 'paintBgF3Arena';
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node scripts/test-f3-ceu.mjs`
Expected: todas ✔, `tudo certo`.

### Task 3: Os perfis da Atmosfera

**Files:**
- Modify: `src/systems/atmosfera/perfis.ts` (`ChavePintura`, `PERFIS_FASE`, `PERFIL_DA_PINTURA`, novo `MS_DA_TROCA`)
- Test: `scripts/test-atmosfera-perfis.mjs` (já existente) + `scripts/test-f3-ceu.mjs`

**Interfaces:**
- Produces: `PERFIS_FASE.faseF3Casco`, `PERFIS_FASE.faseF3Arena`; `ChavePintura` com `'paintBgF3Casco' | 'paintBgF3Arena'`;
  `MS_DA_TROCA: Partial<Record<ChavePintura, number>>` (`paintBgF3Casco: 0`, `paintBgF3Arena: 4000`).

- [ ] **Step 1: Acrescentar ao teste** (fim de `scripts/test-f3-ceu.mjs`, antes do `if (falhas)`)

```js
const { PERFIS_FASE, PERFIL_DA_PINTURA, MS_DA_TROCA } = await import('../src/systems/atmosfera/perfis.ts');
ok(PERFIL_DA_PINTURA.paintBgF3Casco === PERFIS_FASE.faseF3Casco, 'paintBgF3Casco → faseF3Casco');
ok(PERFIL_DA_PINTURA.paintBgF3Arena === PERFIS_FASE.faseF3Arena, 'paintBgF3Arena → faseF3Arena');
ok(PERFIS_FASE.faseF3Arena.poeira.quantidade <= PERFIS_FASE.faseF3Casco.poeira.quantidade
  && PERFIS_FASE.faseF3Arena.grao < PERFIS_FASE.faseF3Casco.grao, 'the arena is cleaner (grain lower, no more dust)');
ok(MS_DA_TROCA.paintBgF3Casco === 0, 'the casco profile cuts in behind the black');
ok(MS_DA_TROCA.paintBgF3Arena > 0, 'the arena profile eases in during the silence');
```

- [ ] **Step 2: Rodar e ver falhar** — `node scripts/test-f3-ceu.mjs` → ✘ nas linhas novas.

- [ ] **Step 3: Implementar** em `perfis.ts`:
  - em `ChavePintura`, depois de `| 'paintBgF3'`: `| 'paintBgF3Casco'` e `| 'paintBgF3Arena'` (comentário: o céu do casco,
    spec 2026-11-08);
  - em `PERFIS_FASE`, depois de `faseF3`, com as cores do nível escolhido (nível 2 até ele escolher, Task 1):
    ```ts
      // O CÉU DO CASCO (08/11, spec 2026-11-08-cenario-casco-arena §5): a pintura do Ato 1 fica, escurecida; a névoa e
      // o halo amostrados dela (`_f3-ceu-assar.mjs`). A ARENA é a mesma luz, mais limpa (ABERTA: menos névoa e grão).
      faseF3Casco: perfilDeFase('faseF3Casco', DENSA, NEVOA_F3_CASCO, HALO_F3_CASCO),
      faseF3Arena: perfilDeFase('faseF3Arena', ABERTA, NEVOA_F3_CASCO, HALO_F3_CASCO),
    ```
    com `const NEVOA_F3_CASCO: Cor = [<nevoa do nível 2>]; const HALO_F3_CASCO: Cor = [<halo do nível 2>];` acima de
    `PERFIS_FASE` (os números impressos na Task 1, Step 2);
  - em `PERFIL_DA_PINTURA`: `paintBgF3Casco: PERFIS_FASE.faseF3Casco, paintBgF3Arena: PERFIS_FASE.faseF3Arena,`;
  - no fim:
    ```ts
    /** How long the switch INTO a painting's profile takes (ms); the rest use the default 1500. The casco cuts in
     *  behind the black of the turn; the arena eases in during the silence before the Serpent. */
    export const MS_DA_TROCA: Partial<Record<ChavePintura, number>> = { paintBgF3Casco: 0, paintBgF3Arena: 4000 };
    ```
  - Nota: `perfilDeFase` com `ABERTA` dá poeira 60 nos dois (igual) e grão menor: o teste aceita `<=` na poeira.

- [ ] **Step 4: Rodar os dois testes**

Run: `node scripts/test-f3-ceu.mjs; node scripts/test-atmosfera-perfis.mjs`
Expected: os dois terminam sem ✘.

### Task 4: As nuvens à deriva e o céu no `Parallax`

**Files:**
- Create: `src/f3/ceuDoCasco.ts`
- Modify: `src/Parallax.ts` (campos; `setNebulaDensity` ~1919; `update` ~1506; `pinturaNaTela` ~2087; métodos novos
  perto de `cascoNaProa` ~1977)
- Modify: `src/scenes/BootScene.ts` (a tabela de assets, perto de `paintBgF3` ~1400)

**Interfaces:**
- Consumes: `NUVENS_F3`, `chaveCeuF3`, `chavePinturaF3`, `NivelCeuF3`, `RegimeCeuF3` (Task 2).
- Produces: `Parallax.cenarioNovo: boolean`, `Parallax.nivelCeu: NivelCeuF3`, `Parallax.ligarCeuDoCasco(): void`,
  `Parallax.regimeDoCeu(r: 'arena'): void`; `class CeuDoCasco { constructor(scene, nivel); atualizar(dt, worldSpeed); destroy() }`.

- [ ] **Step 1: `src/f3/ceuDoCasco.ts`**

```ts
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { NUVENS_F3, type NivelCeuF3 } from './numerosCeuF3';

/**
 * THE DRIFTING CLOUDS OF THE CASCO SKY (spec 2026-11-08-cenario-casco-arena §2): two thin layers cut from his painting
 * (`_f3-ceu-assar.mjs`), each a full-screen TileSprite at scale 1, moving on their own wind plus a share of the world's
 * speed. Whole pixels only: a fractional tilePosition shimmers the art.
 */
export class CeuDoCasco {
  private readonly nuvens: { ts: Phaser.GameObjects.TileSprite; deriva: number; fator: number; x: number }[] = [];

  constructor(scene: Phaser.Scene, nivel: NivelCeuF3) {
    for (const n of NUVENS_F3) {
      const key = `${n.chave}${nivel}`;
      if (!scene.textures.exists(key)) continue;
      const ts = scene.add.tileSprite(0, 0, GAME_WIDTH, GAME_HEIGHT, key).setOrigin(0, 0).setDepth(n.depth);
      ts.tilePositionX = n.x0;
      this.nuvens.push({ ts, deriva: n.deriva, fator: n.fator, x: n.x0 });
    }
  }

  atualizar(dt: number, worldSpeed: number): void {
    for (const n of this.nuvens) {
      n.x -= (n.deriva - worldSpeed * n.fator) * dt;
      n.ts.tilePositionX = Math.round(n.x);
    }
  }

  destroy(): void {
    for (const n of this.nuvens) n.ts.destroy();
    this.nuvens.length = 0;
  }
}
```
(Sinal: `deriva` < 0 é para a esquerda na tela, então o `tilePositionX` CRESCE; o mundo também empurra para a
esquerda, então soma.)

- [ ] **Step 2: BootScene** — logo depois de `paintBgF3: 'sprites/paint-bg-f3.png',`:

```ts
  // O CÉU DO CASCO (08/11, spec 2026-11-08-cenario-casco-arena): a pintura do Ato 1 escurecida (3 níveis, ele escolhe)
  // e as nuvens à deriva recortadas dela (`scripts/_cenario/_f3-ceu-assar.mjs`). Atrás da chave `?cenario=novo`.
  f3Ceu1: 'sprites/f3casco/ceu-1.png',
  f3Ceu2: 'sprites/f3casco/ceu-2.png',
  f3Ceu3: 'sprites/f3casco/ceu-3.png',
  f3NuvemLonge1: 'sprites/f3casco/nuvem-longe-1.png',
  f3NuvemLonge2: 'sprites/f3casco/nuvem-longe-2.png',
  f3NuvemLonge3: 'sprites/f3casco/nuvem-longe-3.png',
  f3NuvemPerto1: 'sprites/f3casco/nuvem-perto-1.png',
  f3NuvemPerto2: 'sprites/f3casco/nuvem-perto-2.png',
  f3NuvemPerto3: 'sprites/f3casco/nuvem-perto-3.png',
```

- [ ] **Step 3: Parallax** — imports no topo:

```ts
import { CeuDoCasco } from './f3/ceuDoCasco';
import { chaveCeuF3, chavePinturaF3, type NivelCeuF3, type RegimeCeuF3 } from './f3/numerosCeuF3';
```

campos, ao lado de `private nebulaPainting`:

```ts
  /** O CÉU DO CASCO (08/11, spec 2026-11-08-cenario-casco-arena): a chave de dev `?cenario=novo` (a rodada 4 a tira)
   *  e o nível de escuro da pintura da arena (`?ceu=1|2|3`, ele escolhe na folha). */
  cenarioNovo = false;
  nivelCeu: NivelCeuF3 = 2;
  private ceuCasco: CeuDoCasco | null = null;
  private regimeCeu: RegimeCeuF3 = 'ato1';
```

em `setNebulaDensity`, a linha da pintura passa a ser:

```ts
        // A pintura não é ScatterLayer, então ela não passa por `alphaFor` — some aqui, à mão. COM O CÉU DO CASCO
        // (08/11) ela FICA: a bruma abre e a nebulosa continua lá (o preto da virada a troca pela versão da arena).
        if (!this.cenarioNovo) for (const img of this.nebulaPainting) img.setAlpha(this.nebulaDim);
```

métodos novos, logo antes de `cascoNaProa()`:

```ts
  /**
   * O CÉU DO CASCO LIGA (08/11, spec 2026-11-08-cenario-casco-arena §1–2): chamado ATRÁS do preto da virada (ou no
   * `cascoNaProa` do treino). A pintura troca para a versão escura da arena, as nuvens à deriva nascem, e a camada
   * `nebula` do espaço e o planeta param de nascer (já ficariam atrás da pintura opaca). Só com a chave.
   */
  ligarCeuDoCasco(): void {
    if (!this.cenarioNovo || this.mode !== 'nebulosa' || this.ceuCasco) return;
    const key = chaveCeuF3(this.nivelCeu);
    if (this.scene.textures.exists(key)) for (const img of this.nebulaPainting) img.setTexture(key).setAlpha(1);
    for (const l of this.layers) {
      if (l.key !== 'nebula' && l.key !== 'planet' && l.key !== 'planetBroken') continue;
      l.gap = [1e9, 1e9];
      l.alpha = 0;
      for (const s of l.sprites) s.setAlpha(0);
    }
    this.ceuCasco = new CeuDoCasco(this.scene, this.nivelCeu);
    this.regimeCeu = 'casco';
  }

  /** A ARENA (o silêncio antes da Serpente): a mesma luz, mais limpa. Só depois de o céu do casco ligar. */
  regimeDoCeu(r: 'arena'): void {
    if (this.ceuCasco) this.regimeCeu = r;
  }
```

em `update`, logo depois do bloco `if (this.paintedBg.length) { ... }`:

```ts
    this.ceuCasco?.atualizar(dt, worldSpeed);
```

em `pinturaNaTela`, `case 'nebulosa': return chavePinturaF3(this.regimeCeu);`

- [ ] **Step 4: Tipos** — Run: `npx tsc --noEmit` → Expected: sem erro.

### Task 5: A chave, o preto e o evento da arena

**Files:**
- Modify: `src/systems/StageDirector.ts` (a união `StageEvent`, perto do tipo `nebula` ~17; o `STAGE_3`, t=89)
- Modify: `src/scenes/GameScene.ts` (depois de `this.parallax = new Parallax(` ~389; o ramo `practice` ~503;
  `escurecerParaOCasco` ~1531; o `switch` dos eventos ~1295; a troca de perfil ~861)

**Interfaces:**
- Consumes: `Parallax.cenarioNovo`, `nivelCeu`, `ligarCeuDoCasco()`, `regimeDoCeu()` (Task 4); `MS_DA_TROCA` (Task 3).
- Produces: o evento `{ t: number; type: 'ceu'; regime: 'arena' }`.

- [ ] **Step 1: StageDirector** — na união, depois do `nebula`:

```ts
  /** O REGIME DO CÉU DO CASCO (08/11, spec 2026-11-08-cenario-casco-arena §6): a arena, mais limpa, entra no silêncio
   *  antes da Serpente. Só visual; sem a chave `?cenario=novo` não faz nada. */
  | { t: number; type: 'ceu'; regime: 'arena' }
```

no `STAGE_3`, logo depois de `{ t: 89, type: 'terrain', rate: 0, mix: [] },`:

```ts
  { t: 89, type: 'ceu', regime: 'arena' },
```

- [ ] **Step 2: GameScene** — logo depois de construir o `Parallax`:

```ts
    // O CÉU DO CASCO (08/11, spec 2026-11-08-cenario-casco-arena): só em dev, `?cenario=novo` (+ `&ceu=1|2|3`, o nível
    // de escuro da pintura da arena) até ele aprovar na folha; a rodada 4 tira a chave.
    if (import.meta.env.DEV) {
      const q = new URLSearchParams(location.search);
      if (q.get('cenario') === 'novo') {
        this.parallax.cenarioNovo = true;
        const n = Number(q.get('ceu'));
        if (n === 1 || n === 2 || n === 3) this.parallax.nivelCeu = n;
      }
    }
```

no ramo `practice`, a linha do `cascoNaProa` vira:

```ts
      if (this.stage.script.some((e) => e.type === 'rabo' && e.t < this.elapsed)) {
        this.parallax.cascoNaProa();
        // (o treino salta o preto e o silêncio: o céu do casco já nasce no regime da arena)
        this.parallax.ligarCeuDoCasco();
        this.parallax.regimeDoCeu('arena');
      }
```

em `escurecerParaOCasco`, no `onComplete` do escurecer, logo depois de `this.parallax.revealCasco(1, 60);`:

```ts
        this.parallax.ligarCeuDoCasco();
```

no `switch` dos eventos, depois do `case 'nebula'`:

```ts
      case 'ceu':
        this.parallax.regimeDoCeu(e.regime);
        break;
```

na troca de perfil:

```ts
      this.atm.perfil(PERFIL_DA_PINTURA[pintura], this.pinturaAtm ? (MS_DA_TROCA[pintura] ?? 1500) : 0);
```

(e `MS_DA_TROCA` entra no import de `../systems/atmosfera/perfis`).

- [ ] **Step 3: Conferir** — Run: `npx tsc --noEmit; node scripts/test-f3-ceu.mjs; node scripts/test-atmosfera-perfis.mjs; node scripts/test-enguia-porte.mjs`
  Expected: sem erro de tipo, os três testes sem falha.

- [ ] **Step 4: Fumaça no navegador** — abrir `http://localhost:5173/?serpente=A&cenario=novo&ceu=2` e, sem a chave,
  `?serpente=A`: com a chave, a pintura escura da nebulosa atrás do casco e as nuvens andando; sem a chave, o céu de
  hoje (nada mudou). Sem erro no console.

### Task 6: A sonda e a folha da rodada 1

**Files:**
- Create: `scripts/_cenario/_f3-casco-filmar.mjs`
- Modify: `scripts/_serpente/_sonda-enguia.mjs` (o `--q`)
- Create: `docs/superpowers/folhas/2026-11-08/cenario-casco/ceu.html` (+ `cru/` com as fotos e vídeos, fora do git)

- [ ] **Step 1: A sonda** — `_f3-casco-filmar.mjs <out-dir> --q "<query>" [--real] [--de s] [--ate s] [--fotos s,s,…]`:
  - `--real`: abre `/?<query>`, espera o Menu e começa a F3 do zero como `_fase-real.mjs` (sorte fixa 20261026,
    relógio em passos de 1/60 s, nave intocável em (60, 90), `lives = 3`, as cartas sem mesa); os inimigos FICAM (é
    para ler o cenário com o jogo em cima);
  - sem `--real`: abre `/?<query>` (o atalho da Serpente) e espera `Game.cartas`;
  - o tempo é o `elapsed` da fase (`--real`) ou os segundos desde o início (atalho); entre `--de` e `--ate`, uma foto a
    cada 2 passos (30 qps) em `<out>/q/00000.png…`; `--fotos` tira só fotos nativas nos instantes dados;
  - no fim, `ffmpeg -y -framerate 30 -i q/%05d.png -vf scale=768:432:flags=neighbor -c:v libx264 -pix_fmt yuv420p video.mp4`;
  - imprime os erros de página (ou `sem erro de página`).
- [ ] **Step 2: `--q` na sonda da enguia** — `const Q = val('--q', '')` e o `goto` passa a
  `...&taxa=${TAXA}${Q ? `&${Q}` : ''}`.
- [ ] **Step 3: Filmar** (com o `npm run dev` rodando, sem editar `src/` durante): em `folhas/2026-11-08/cenario-casco/cru/`
  - fotos dos 3 níveis + ANTES em três momentos: o Ato 2 logo depois do preto (`--real --fotos 58`), as 3 cabeças
    (`?serpente=A`, `--fotos` no erguer e numa salva), a enguia (`_sonda-enguia --filmar` nos instantes das fotos de hoje:
    Eco, canos, sob);
  - vídeos ANTES × nível 2: a virada e o Ato 2 (`--real --de 52 --ate 66`), as 3 cabeças (`?serpente=A`, 30 s), a enguia
    (`_sonda-enguia --q "cenario=novo&ceu=2" --filmar … --de 0 --ate 40`).
- [ ] **Step 4: Conferir AMPLIADO antes da folha:** as nuvens sem emenda nem tremor, as rochas fora das nuvens, a enguia
  e as cabeças lendo contra o céu, os avisos (vermelho) e a faixa livre (branco-azulado) sem disputa; o brilho dos
  destroços (as mordidas na enguia) SEM escurecer as nuvens — se escurecer, trocar o `ADD` da `Tela` aditiva
  (`MorteDaNave.ts:103`) pelo `aditivoPuro` (`src/entities/serpente/aditivo.ts`) e refilmar esse trecho.
- [ ] **Step 5: Medir a leitura em número** — para cada nível, o contraste de luminância médio entre a enguia (as fotos
  com a máscara da lona `cima`) e o céu atrás dela, e o mesmo para as 3 cabeças; anotar na folha.
- [ ] **Step 6: A folha** `ceu.html` (o padrão das folhas anteriores: escura, título, o que mudou, a pergunta): os 3
  níveis lado a lado com o ANTES nos três momentos, os números da leitura, os vídeos ANTES × nível 2, e as perguntas:
  1) qual nível; 2) as nuvens (quantidade, velocidade); 3) a luz (o perfil) — e o vapor na arena fica para a rodada 2.
- [ ] **Step 7: Mostrar a ele** e registrar a resposta no 🧭 do HANDOFF.

### Task 7: Fechar a rodada 1 (depois do ok dele)

- [ ] Se ele escolher outro nível que não o 2: trocar `nivelCeu` padrão em `Parallax` e as cores `NEVOA_F3_CASCO` /
  `HALO_F3_CASCO` pelas impressas para esse nível; rodar `node scripts/test-f3-ceu.mjs; npx tsc --noEmit`.
- [ ] Apagar os níveis não escolhidos (PNGs e linhas do BootScene) só quando ele aprovar.
- [ ] Atualizar o 🧭 do HANDOFF; commit só se ele pedir.

---

## Rodadas 2–4 (cada uma ganha o plano detalhado quando a anterior for aprovada)

O que ele escolher na folha (o nível do céu, a luz) muda os números e a arte das rodadas seguintes; escrever o código
delas agora seria escrever às cegas. O escopo e as provas de cada uma estão fixados na spec:

- **Rodada 2 — o casco vivo** (spec §3, §6): pulso nos traços de cobre (máscara tirada das peças do casco), vapor nas
  grades/juntas (o `poison-cloud` adaptado da enguia, rampa cinza do casco), faíscas no rombo (`spark-arc`/`electrified`/
  `hit-spark` do pixelfx), aro no contorno de cima; os dois regimes. Folha com GIF.
- **Rodada 3 — a batalha ao fundo** (spec §4, §6): folha de 3–4 conceitos de silhueta (pixel, 8–14 px) → clarões,
  traços, passagens; as janelas calmas medidas pela sonda nas duas lutas. Folha com GIF.
- **Rodada 4 — a virada e a instalação** (spec §1, §8): o preto de 500/1500/500 ms, o `STAGE_3` +2 s de t=55 em diante,
  os tiros somem e a nave intocável no preto; a sonda da virada (0 nascimentos, 0 danos); o desempenho (+≤1 ms p95); o
  tranco do `cascoVivo.copiar()` num navegador de verdade; a chave sai.
