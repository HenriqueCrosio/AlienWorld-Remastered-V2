# F1 · Caverna · Rodada 1 — o portal, o corredor e a saída no jogo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A F1 ganha um trecho novo de caverna aos 40 s: a montanha (o portal dele) chega, se abre quando a nave cruza a boca, a nave atravessa um corredor cujo teto e chão machucam, e sai por um buraco que se abre para o exterior enquanto a montanha se fecha atrás.

**Architecture:** As quatro imagens dele são assadas por um script (`scripts/_g/_caverna-f1.mjs`) em texturas + `caverna.json` (o contorno da boca por linha, os contornos do teto e do chão, os quadros do desfazer). Em jogo, `src/f1/cavernaF1.ts` monta as camadas e as move pela distância que o mundo andou desde o evento; a geometria (onde estão o portal, a saída, a camada da frente; a região da caverna por linha) é PURA em `src/f1/ritmosF1.ts` e testada no Node. O fundo, o teto e o chão da caverna usam uma GeometryMask redesenhada a cada quadro (a região entre as duas bordas, linha a linha); a mesma máscara, invertida, esconde o entulho e o primeiro plano do exterior dentro da caverna. A abertura e a saída disparam quando a NAVE cruza (no flap ela anda para os lados), e a mordida do teto/chão segue a lei da borda da F4 (uma medição, sem corpo físico).

**Tech Stack:** Phaser 3.90 + TypeScript + Vite; Node 24 (testes lendo `.ts` direto); sharp (assar); Playwright (sonda e filmagem).

## Global Constraints

- Pixel art: 1 px de arte = 1 px de jogo; reduzir pode, ampliar nunca; as pinturas dele entram INTEIRAS no quadro 429×216.
- Tudo o que é efeito de cena é assado em pixel (o desfazer da rocha em quadros, nunca alfa parcial).
- Profundidades da spec §5: exterior −94,6…−84; fundo da caverna −83; obstáculos/estruturas −0,5; teto e chão da caverna −0,3; entulho da frente −0,2; borda e corpo do portal −0,1; camada da frente da saída −0,05; nave 0; primeiro plano 60.
- O treino (`skipTo`) descarta eventos sem executar: saltar por cima da caverna não pode deixar nada dela na tela.
- Durante uma filmagem, não editar `src/` nem nenhum `.html` do projeto (o Vite recarrega e mata a filmagem).
- Commit só quando ele pedir, só no nome dele, sem os vídeos.

## Os números (todos em `CAVERNA_F1`)

| nome | valor | por quê |
|---|---|---|
| `inicio` | 40 s | "um pouco depois do meio"; o evento `caverna` no `STAGE_1` |
| `empurra` | 15 s | tudo a partir dos 40 s anda +15 (o chefão 68 → 83) |
| `x0` | 384 | o portal nasce na borda direita |
| `comprimento` | 640 px | do portal da entrada ao portal da saída (o buraco passa a nave ≈ 54,8 s; ≈ 9 s de corredor) — 760 passava dos 55 s (o teste pegou: faltava a largura do portal da saída) |
| `aro` | 14 px | a faixa de rocha ao longo da boca que nunca some |
| `buraco` | 80 px | a largura do buraco da saída no meio |
| `abreMs` | 600 | o desfazer da entrada e da saída |
| `quadros` | 8 | os quadros assados do desfazer |
| `tetoY` | −8 | a faixa do teto sobe 8 px (o vão mínimo é medido na sonda) |
| `mordida` | 3 | a mesma folga da borda da F4 |
| `deriva` | 45 px | o fundo da caverna deriva como a pintura |

## File Structure

- Create `scripts/_g/_emenda.mjs` — o *quilting* (emenda sem costura) tirado de `_camadas-chao-f1.mjs`, compartilhado.
- Create `scripts/_g/_caverna-f1.mjs` — o assado: recorte, portal (borda/corpo/extensão + 8 quadros do desfazer), teto e chão sem emenda com os contornos, o interior, `public/sprites/f1/caverna.json`.
- Modify `src/f1/numerosF1.ts` — `CAVERNA_F1`.
- Modify `src/f1/ritmosF1.ts` — a geometria pura: `posicoesCaverna(d)`, `regiaoCaverna(posicoes, fundo, y)`, `quadroDoDesfazer(t, t0)`, `derivaCaverna(d)`.
- Create `scripts/test-f1-caverna.mjs` — os testes da geometria.
- Create `src/f1/cavernaF1.ts` — `montarCaverna(scene)` → `{ iniciar, atualizar, morde, aberta, pintura, mascaraInversa, destroy }`.
- Modify `src/systems/StageDirector.ts` — o evento `caverna`; o `STAGE_1` empurrado.
- Modify `src/Parallax.ts` — dono da caverna (como do chão): `iniciarCaverna`, a atualização, `pinturaNaTela`, a máscara inversa no entulho e no primeiro plano.
- Modify `src/scenes/GameScene.ts` — o evento, a nave para a caverna, a mordida, a pausa do relógio da invasão.
- Modify `src/systems/atmosfera/perfis.ts` — o perfil `faseCaverna` e a chave `paintBgCaverna`.
- Modify `src/scenes/BootScene.ts` — as texturas e o json.
- Modify `scripts/_g/_probe-f1.mjs`, `scripts/_g/_filmar-f1.mjs` (`--desde`).

---

### Task 1: O quilting compartilhado

**Files:** Create `scripts/_g/_emenda.mjs`; Modify `scripts/_g/_camadas-chao-f1.mjs` (importar em vez de definir).

- [ ] **Step 1:** Mover a função `emendar(A, w, h, sobra)` de `_camadas-chao-f1.mjs` para `_emenda.mjs` como `export function emendar(...)`, idêntica, e importar no `_camadas-chao-f1.mjs`.
- [ ] **Step 2:** Rodar `node scripts/_g/_camadas-chao-f1.mjs "$TEMP/emenda-check"` e comparar `chao-vale.png`/`chao-paisagem.png` com os de `public/sprites/f1/` (`cmp`): IDÊNTICOS (o mesmo algoritmo).

### Task 2: Os números e a geometria pura (TDD)

**Files:** Modify `src/f1/numerosF1.ts`, `src/f1/ritmosF1.ts`; Create `scripts/test-f1-caverna.mjs`.

**Interfaces — Produces:**
```ts
export const CAVERNA_F1 = { inicio: 40, empurra: 15, x0: 384, comprimento: 760, aro: 14, buraco: 80, abreMs: 600,
  quadros: 8, tetoY: -8, mordida: 3, deriva: 45, largura: 429, depth: { fundo: -83, bordas: -0.3, portal: -0.1, frente: -0.05 } } as const;
export interface PosicoesCaverna { portal: number; saida: number; frente: number; }
export function posicoesCaverna(d: number, fundoMeio: number): PosicoesCaverna;
export function regiaoCaverna(p: PosicoesCaverna, fundoY: number): [number, number]; // [de, ate) em x de tela
export function quadroDoDesfazer(agoraMs: number, t0Ms: number | null): number; // 0 (inteiro) … quadros−1 (sumiu)
export function derivaCaverna(d: number): number; // px inteiros, 0 → −deriva
```

- [ ] **Step 1: o teste que falha** — `scripts/test-f1-caverna.mjs`:
```js
// A CAVERNA DA F1 (spec 2026-10-21-f1-caverna-design.md): a geometria pura. Uso: node scripts/test-f1-caverna.mjs
import { CAVERNA_F1 as C } from '../src/f1/numerosF1.ts';
import { posicoesCaverna, regiaoCaverna, quadroDoDesfazer, derivaCaverna } from '../src/f1/ritmosF1.ts';
const falhas = [];
const conferir = (ok, msg, visto) => { console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`); if (!ok) falhas.push(msg); };
const FM = 140; // um fundo de boca típico (o real vem do caverna.json)
const p0 = posicoesCaverna(0, FM), p100 = posicoesCaverna(100, FM);
conferir(p0.portal === C.x0, 'o portal nasce na borda direita', p0);
conferir(p0.portal - p100.portal === 100 && p0.saida - p100.saida === 100 && p0.frente - p100.frente === 100, 'tudo anda com o mundo, 1 px por px', [p0, p100]);
conferir(p0.saida - p0.portal === C.comprimento, 'a saída fica a `comprimento` do portal', p0);
// a frente: a boca dela (portal sem espelhar: fundo à esquerda) fica `buraco` px depois da borda de fora da saída
const bordaFora = p0.saida + (C.largura - 1 - FM), bocaFrente = p0.frente + FM;
conferir(bocaFrente - bordaFora === C.buraco, 'o buraco da saída tem `buraco` px no meio', { bordaFora, bocaFrente });
const [de, ate] = regiaoCaverna(p0, FM);
conferir(de === p0.portal + FM + C.aro / 2 && ate === p0.saida + (C.largura - 1 - FM) - C.aro / 2, 'a região da caverna vai do meio da borda da entrada ao meio da borda da saída', [de, ate]);
conferir(quadroDoDesfazer(1000, null) === 0, 'sem disparo, a rocha está inteira', null);
conferir(quadroDoDesfazer(1000, 1000) === 0 && quadroDoDesfazer(1000 + C.abreMs, 1000) === C.quadros - 1, 'o desfazer vai do quadro 0 ao último em `abreMs`', null);
let mono = true; for (let t = 0; t <= C.abreMs + 200; t += 10) if (quadroDoDesfazer(1000 + t + 10, 1000) < quadroDoDesfazer(1000 + t, 1000)) mono = false;
conferir(mono, 'e só avança', null);
conferir(derivaCaverna(0) === 0 && derivaCaverna(1e9) === -C.deriva && Number.isInteger(derivaCaverna(333)), 'o fundo deriva até `deriva` px, em pixel inteiro', [derivaCaverna(0), derivaCaverna(333)]);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```
- [ ] **Step 2:** `node scripts/test-f1-caverna.mjs` → FALHA (`CAVERNA_F1`/`posicoesCaverna` não existem).
- [ ] **Step 3: a implementação** — em `numerosF1.ts`, o `CAVERNA_F1` da tabela acima (com o comentário que aponta a spec); em `ritmosF1.ts`:
```ts
export interface PosicoesCaverna { portal: number; saida: number; frente: number; }
/** Onde estão as peças da caverna (x de tela, a borda ESQUERDA de cada imagem de 429 px) `d` px de mundo após o evento. */
export function posicoesCaverna(d: number, fundoMeio: number): PosicoesCaverna {
  const C = CAVERNA_F1;
  const portal = C.x0 - d;
  const saida = portal + C.comprimento;
  // a frente é o portal SEM espelhar: a boca dela (fundo à esquerda) fica `buraco` px depois da borda de fora da saída
  const frente = saida + (C.largura - 1 - fundoMeio) + C.buraco - fundoMeio;
  return { portal, saida, frente };
}
/** A região da caverna na linha de fundo `fundoY` (o fundo da boca nessa linha): [de, ate) em x de tela. */
export function regiaoCaverna(p: PosicoesCaverna, fundoY: number): [number, number] {
  const C = CAVERNA_F1;
  return [p.portal + fundoY + C.aro / 2, p.saida + (C.largura - 1 - fundoY) - C.aro / 2];
}
/** O quadro do desfazer (0 = rocha inteira … quadros−1 = sumiu) `agoraMs` depois do disparo em `t0Ms`. */
export function quadroDoDesfazer(agoraMs: number, t0Ms: number | null): number {
  const C = CAVERNA_F1;
  if (t0Ms === null) return 0;
  const u = Math.min(1, Math.max(0, (agoraMs - t0Ms) / C.abreMs));
  return Math.round(u * (C.quadros - 1));
}
/** A deriva do fundo da caverna (px inteiros): de 0 a −`deriva` ao longo da caverna. */
export function derivaCaverna(d: number): number {
  const C = CAVERNA_F1;
  return -Math.round(Math.min(1, Math.max(0, d / (C.comprimento + C.x0))) * C.deriva);
}
```
- [ ] **Step 4:** `node scripts/test-f1-caverna.mjs` → TUDO OK; `node scripts/test-f1-ritmos.mjs` → TUDO OK.

### Task 3: O assado

**Files:** Create `scripts/_g/_caverna-f1.mjs`.

**Interfaces — Produces** `public/sprites/f1/caverna.json`:
```json
{ "largura": 429, "fundo": [216 inteiros], "fundoMeio": 140,
  "aro": { "chave": "f1-cav-aro" },
  "corpo": { "chave": "f1-cav-corpo", "fw": 685, "fh": 216, "quadros": 8, "colunas": 2 },
  "teto": { "chave": "f1-cav-teto", "w": 381, "h": 0, "contorno": [w inteiros] },
  "chao": { "chave": "f1-cav-chao", "w": 0, "h": 0, "y": 0, "contorno": [w inteiros] },
  "interior": { "chave": "f1-cav-interior" }, "nevoa": [r, g, b] }
```

- [ ] **Step 1:** Escrever o script (a lógica da maquete `_caverna-portal-maquete.mjs`, agora gravando as peças):
  - recorte e redução com `chaveXadrez`/`reduzir` (`_xadrez.mjs`) da Parede, do Teto e da Moldura; o interior por `resize(429, 216)`;
  - **a boca:** inundação a partir da coluna 0 pelos pixels transparentes; `fundo[y]` = o x mais à direita inundado; as linhas sem abertura herdam a vizinha;
  - **a borda:** os pixels opacos com `x ≤ fundo[y] + aro` → `f1-cav-aro.png` (429×216);
  - **o corpo largo:** os opacos além da borda + a extensão de 256 px (a rocha da direita ESPELHADA: a coluna `j` da extensão = a coluna `428 − j` da Parede, emenda contínua por construção) = 685×216; o limiar de cada pixel = `clamp((x − fundo[y]) / 380 + (ruído − 0,5) · 0,18)`; o quadro `k` mostra os pixels com limiar ≥ `k / 7`; os 8 quadros numa grade de 2 colunas → `f1-cav-corpo.png` (1370×864);
  - **o teto:** as linhas do Teto até a última opaca, emendadas com `emendar(…, 48)`; `contorno[x]` = a última linha opaca da coluna (a ponta da estalactite) → `f1-cav-teto.png`;
  - **o chão:** a parte aberta da Moldura (antes da parede fechada, `x < paredeMol − 10`), das linhas `chaoY − 6` até 216, emendada; `contorno[x]` = a primeira linha opaca; `y` = `chaoY − 6` → `f1-cav-chao.png`;
  - **a névoa:** a mediana das cores do interior nas linhas 140–175 → `nevoa`;
  - uma folha `folhas/2026-10-21/caverna/rodada1/pecas.png` (a borda, 4 quadros do corpo, o teto e o chão duas vezes cada com o tique da emenda).
- [ ] **Step 2:** `node scripts/_g/_caverna-f1.mjs` → imprime as caixas, `fundoMeio`, o vão mínimo estático (`min(chao.y + contornoChao) − max(tetoY + contornoTeto)` no ladrilho) e a névoa. Olhar a folha ampliada: a emenda do teto e do chão invisível, o desfazer andando da boca para a direita, nenhum pixel de xadrez.

### Task 4: As peças em jogo

**Files:** Create `src/f1/cavernaF1.ts`; Modify `src/scenes/BootScene.ts`.

**Interfaces — Consumes:** `CAVERNA_F1`, `posicoesCaverna`, `regiaoCaverna`, `quadroDoDesfazer`, `derivaCaverna`; o `caverna.json`. **Produces:**
```ts
export interface CavernaF1 {
  /** O evento do roteiro: a montanha começa a entrar pela direita. */
  iniciar(): void;
  /** `andado`: px que o mundo andou neste quadro; `agoraMs`: o relógio da cena; a nave para os disparos. */
  atualizar(andado: number, agoraMs: number, naveX: number, naveY: number): void;
  /** O teto/chão morde a caixa da nave? (só com a caverna aberta, antes da saída) */
  morde(esq: number, dir: number, topo: number, base: number): boolean;
  /** A caverna está aberta (entre o disparo da entrada e o da saída) — a pintura na tela e a pausa do relógio. */
  aberta(): boolean;
  /** A máscara inversa (o exterior fora da caverna), para o entulho e o primeiro plano do Parallax. */
  readonly mascaraInversa: Phaser.Display.Masks.GeometryMask;
}
export function montarCaverna(scene: Phaser.Scene): CavernaF1 | null;
```
- [ ] **Step 1:** `BootScene`: `'f1-cav-aro'`, `'f1-cav-corpo'`, `'f1-cav-teto'`, `'f1-cav-chao'`, `'f1-cav-interior'` no `ART` e `this.load.json('f1-caverna', 'sprites/f1/caverna.json')`.
- [ ] **Step 2:** `cavernaF1.ts`:
  - as camadas (invisíveis até `iniciar`): o interior (Image, −83), o teto e o chão (TileSprite 384 de largura, −0,3), a borda e o corpo da entrada (Image/Sprite, −0,1), a borda e o corpo da saída (os MESMOS, `setFlipX(true)`, −0,1; o corpo da saída começa no último quadro = sumido), a borda e o corpo da frente (os mesmos sem espelhar, −0,05). Os quadros do corpo cortados da grade uma vez (`tex.add`).
  - a máscara: um `Graphics` fora da lista de exibição; a cada quadro `clear()` e uma `fillRect` por linha da `regiaoCaverna`; `createGeometryMask()` no interior, no teto e no chão; uma segunda `createGeometryMask()` do mesmo Graphics com `setInvertAlpha(true)` = `mascaraInversa`.
  - o estado: `d` (px desde `iniciar`, somando `andado`), `abriu` (ms do disparo da entrada | null), `saiu` (ms do disparo da saída | null). Disparo da entrada: `naveX ≥ portal + fundo[linha da nave] + aro`. Disparo da saída: `naveX ≥ saida + (largura − 1 − fundo[linha da nave])`.
  - a cada quadro: as posições pela `posicoesCaverna(d, fundoMeio)`; o corpo da entrada no `quadroDoDesfazer(agora, abriu)`; o corpo da frente no `quadroDoDesfazer(agora, saiu)`; o corpo da saída no `quadros − 1 − quadroDoDesfazer(agora, saiu)` (fecha ao contrário) e visível só depois do disparo; o teto e o chão com `tilePositionX = round(d)`, o teto em `CAVERNA_F1.tetoY`; o interior em `derivaCaverna(d)`. Quando a saída inteira passou da borda esquerda (`saida + 685 < 0`), tudo invisível e a máscara vazia.
  - `morde`: nas colunas `esq` e `dir` (x de tela), `teto = tetoY + contornoTeto[(x + round(d)) mod w]`, `chao = chao.y + contornoChao[(x + round(d)) mod w]`; morde se `topo + mordida ≤ teto` ou `base − mordida ≥ chao`; só com `abriu !== null && saiu === null`.
- [ ] **Step 3:** `npx tsc --noEmit -p .` limpo.

### Task 5: No roteiro e na cena

**Files:** Modify `src/systems/StageDirector.ts`, `src/Parallax.ts`, `src/scenes/GameScene.ts`, `src/systems/atmosfera/perfis.ts`, `scripts/test-f1-ritmos.mjs` (nada muda nele), `scripts/test-atmosfera-perfis.mjs` (se ele contar as chaves).

- [ ] **Step 1: o evento.** `StageEvent` ganha `| { t: number; type: 'caverna' }`. No `STAGE_1`: `{ t: 37, type: 'terrain', rate: 0, mix: [] }` (o exterior para de plantar: o que nasceu antes sai da tela antes de a caverna abrir), `{ t: 40, type: 'caverna' }`, dois `wave` de drones pequenos dentro (`t: 46, count: 3, y: 100` e `t: 50, count: 3, y: 120`), e TODOS os eventos que estavam em `t ≥ 40` com `t + 15` (o coração 56, o fogo cruzado 62/62,5, o silêncio 78, o alerta 80, o chefão 83). O cursor monotônico do diretor reclama de evento fora de ordem: conferir a ordem.
- [ ] **Step 2: o Parallax.** Campo `caverna: CavernaF1 | null` montado no `buildSurface` (depois do chão); `iniciarCaverna()` → `caverna.iniciar()` e a `mascaraInversa` aplicada nas faixas `frente` e `perto` do chão (`chao.faixas`); no `update`, `caverna.atualizar(worldSpeed·dt, scene.time.now, naveX, naveY)` — a nave chega por `setNave(x, y)` chamado pelo `GameScene` antes do `update`; `pinturaNaTela()` devolve `'paintBgCaverna'` se `caverna?.aberta()`; `caverna()` para o GameScene morder.
- [ ] **Step 3: o GameScene.** `runEvent` `case 'caverna': this.parallax.iniciarCaverna(); break;`. No `update`, antes do `parallax.update`: `this.parallax.setNave(this.ship.x, this.ship.y)`; o relógio do horizonte: `this.tempoNaCaverna += dt` enquanto `parallax.cavernaAberta()`, e `setRelogio(this.elapsed − this.tempoNaCaverna)`; depois da mordida da borda da F4: `if (this.parallax.cavernaMorde(body.left, body.right, body.top, body.bottom)) this.damageShip();` (sem empurrão: teto e chão próximos — a mesma razão da F4).
- [ ] **Step 4: a Atmosfera.** `ChavePintura` ganha `'paintBgCaverna'`; `PERFIS_FASE.faseCaverna = perfilDeFase('faseCaverna', DENSA, <nevoa do json>, [230, 120, 50])`; `PERFIL_DA_PINTURA.paintBgCaverna`.
- [ ] **Step 5:** `npx tsc --noEmit -p .`; `node scripts/test-f1-caverna.mjs`; `node scripts/test-f1-ritmos.mjs`; `node scripts/test-atmosfera-perfis.mjs`; `npm run build`.

### Task 6: A sonda, a filmagem e a folha

**Files:** Modify `scripts/_g/_probe-f1.mjs`, `scripts/_g/_filmar-f1.mjs`; Create `docs/superpowers/folhas/2026-10-21/caverna/rodada1.html`.

- [ ] **Step 1: a sonda** (com o `npm run dev`): pular para 38 s (`s.elapsed = 38; s.director.skipTo(38)`), andar o relógio em passos, nave parada em x 70 no meio do vão, e conferir: o portal nasce à direita aos 40 s; antes da nave cruzar, `aberta()` é falso e o corpo está no quadro 0; depois de cruzar, `aberta()` é verdadeiro, o corpo chega ao último quadro em ≤ 700 ms e a `pinturaNaTela` é `paintBgCaverna`; com a nave encostada no teto, `cavernaMorde` é verdadeiro, e no meio do vão é falso; ao cruzar a saída, `aberta()` volta a falso e a frente se desfaz; o chefão nasce aos 83 s (o roteiro empurrado); o treino (que salta para o chefão) não deixa nada da caverna visível; nenhum erro de página.
- [ ] **Step 2: a filmagem.** `_filmar-f1.mjs` ganha `--desde=38` (pula o relógio antes de filmar) e a nave fica no meio do vão da caverna (y 110) em vez do alto (y 40). Filmar 20 s a partir de 38 s → `rodada1/caverna.webm` + fotos nos instantes da entrada, do corredor e da saída.
- [ ] **Step 3: a folha** `rodada1.html` (o vídeo, as fotos, as peças, o vão mínimo medido, o que ele decide), escrita ANTES de filmar ou depois de a filmagem acabar.
- [ ] **Step 4:** o registro desta rodada no fim deste plano (desvios e lições) e o 🧭 do HANDOFF.

## Self-review

- Spec §3 (entrada, dentro, saída) → Tasks 3–5; §4 (a máscara) → Task 4; §5 (profundidades) → Task 4; §6 (o perigo: teto/chão nesta rodada; obstáculos e drones de verdade na rodada 2) → Tasks 4–5; §7 (o tempo, a pausa, o perfil) → Task 5; §9 rodada 1 → Task 6.
- O "+14 s" da spec virou +15 (a conta da geometria: o buraco da saída passa a nave ≈ 54,8 s); a pausa do relógio da invasão só cobre o tempo com o exterior escondido (~9 s) — anotar na spec.

## Execução (21/10) — desvios e lições

1. **`comprimento` 760 → 640.** O teste da geometria pegou: com 760 o buraco da saída passava a nave aos 56,2 s, depois de
   o roteiro voltar (55 s) — a conta tinha esquecido a largura do portal da saída. Com 640: o buraco ≈ 54,8 s, o
   corredor ≈ 9,2 s.
2. **`tetoY` −8 → 0.** O assado mede o vão mínimo sem deslocar o teto: 100 px (a ponta mais baixa em y 76, o topo do
   chão em y 176) — folgado para o flap, e a arte dele aparece inteira.
3. **A extensão do corpo** (a rocha que continua depois do portal) era a rocha ESPELHADA: fazia uma "borboleta"
   simétrica bem onde a montanha enche a tela. Virou uma COSTURA de menor diferença entre o fim do portal e a rocha da
   própria imagem (`EXT` 256 → 180 px, que ainda cobre a tela com a nave em qualquer x ≥ 10).
4. **Furos na rocha:** o recorte do xadrez semeava em qualquer pixel claro e neutro — os núcleos brancos das brasas
   viravam "céu". Agora a inundação só parte da BORDA da imagem (`_xadrez.mjs`).
5. **O chão** cortado na mediana do topo achatava as pedras mais altas: agora começa acima da mais alta.
6. **A filmagem com `--desde`:** o `skipTo` DESCARTA os eventos pulados, e o "pare de plantar" dos 37 s não rodava — o
   primeiro vídeo tinha pilares do exterior dentro da caverna. O `_filmar-f1` repõe o estado do último evento de terreno
   pulado; e a nave intocável PISCA, então a filmagem a mantém visível.
7. **O teste da Atmosfera** contava 8 pinturas; agora 9 (a caverna).

**Conferências:** `tsc`; `test-f1-caverna` (a geometria, a conta do tempo); `test-f1-ritmos`; `test-atmosfera-perfis`;
`npm run build`; `scripts/_g/_probe-caverna-f1.mjs` (a montanha aos 40 s; fechada até a nave cruzar a boca; aberta
~45,6 s com o desfazer completo em < 1 s e o tom de caverna; a mordida no teto e no chão, nada no meio; a saída ~54,8 s;
a pausa do relógio ~9 s; o fim; o chefão aos 83 s; o treino sem nada da caverna) — TUDO OK.

## Depois da rodada 1 (21/10, a mesma sessão) — o que mudou e por quê

A rodada 1 foi o ponto de partida; o que está no jogo saiu de cinco voltas com ele (a spec foi revista a cada uma):

1. **O desfazer foi recusado** ("quero uma transição mais orgânica, usada em jogos"). Ele pediu para VER três, lado a
   lado (folha `caverna/transicoes.html`): a cortina de rocha, os olhos no escuro, a íris. **As três foram recusadas**
   ("sem a parede sumir ou pular… sem esmaecer, corte") e o código delas apagado.
2. **1b — a faixa de rocha** (a opção A dele, `caverna/faixa.html`): o portal com a boca dos dois lados (a borda de
   dentro é a boca espelhada, costurada pelo contorno; a rocha do meio é a dele, sem espelhar — um meio espelhado vira
   "borboleta"), que nunca abre: anda com o mundo e a troca fica atrás da rocha. O buraco da saída e a camada da frente
   saíram. Ele aprovou o ponto ("passagem livre").
3. **1c — a rocha da frente** (o print dele com o "Aqui" e o "obs.", `caverna/frente.html`): a faixa passa NA FRENTE da
   nave, sólida, 2,5× o mundo, e cobre a tela INTEIRA por um instante (709 px, ~380 de rocha na cintura) — o lado de
   fora sai antes de o salão entrar. A nave aparece pela AURA. ⚠️ A primeira aura era um BURACO na rocha e a nave
   parecia passar na frente: virou a rocha semitransparente POR CIMA da nave (50%, anel a 75%: o alfa parcial de uma
   BitmapMask invertida). Aprovada ("perfeito").
4. **1d — o salão vivo** (`caverna/vida.html`, `src/f1/salaoVivo.ts`, `_luzes-caverna-f1.mjs`): as brasas, a bruma em
   três faixas, os fachos frios da abertura medida, os halos, a poeira. Aprovado ("perfeito, pode seguir").
5. **Rodada 2 — as rochas do salão: RECUSADA e retirada** (`caverna/rochas.html`): "as bordas (cima e baixo) já dão
   dano. E os obstáculos que você adicionou estão flutuando". O salão ficou só com o teto e o chão que mordem.

**Lições:**
- Uma peça na frente de TUDO obriga a mudar o roteiro: nenhum inimigo, tiro ou peça pode estar na tela quando ela cobre
  (a canhoneira 35 → 31,5 s, os batedores 39 → 36 s, os drones do salão 44,5/46,5/48,5 s). A sonda confere quadro a
  quadro.
- **Dois bugs da rodada 1** apareceram pela sonda: a MESA DE CARTAS do meio da F1 estava presa nos 63 s (o roteiro foi
  empurrado e ela caía no fogo cruzado — agora `63 + CAVERNA_F1.empurra`, aos 79 s) e as peças da caverna piscavam UM
  quadro em x 0 no evento (agora nascem no lugar).
- Na sonda: a `TileSprite` do Phaser 3.60+ guarda a textura de origem em `displayTexture` (a `texture` é a dela).
- O Node às vezes sai com `Assertion failed … async.c` DEPOIS de a filmagem gravar: inofensivo.

**Conferências finais:** `tsc`; `test-f1-caverna` (a geometria e o tempo da rocha da frente); `test-f1-ritmos`;
`test-f1-invasao`; `test-atmosfera-perfis`; `npm run build`; `_probe-caverna-f1` (a rocha na frente, a aura, a tela
inteira coberta na entrada e na saída, nada escondido atrás da rocha, o salão sem peça, os tempos, o chefão aos 84 s,
o treino) e `_probe-f1` — TUDO OK. Commitado e empurrado: `9864f46` (o jogo e a limpeza das peças antigas), `4476e9f`
(ferramentas, testes e folhas sem os vídeos) e os docs.
