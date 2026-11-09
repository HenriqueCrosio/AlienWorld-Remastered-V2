# O cenário do casco — RODADA 2: o casco vivo (plano de implementação)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** o casco do Leviatã (arte final, intocada) ganha vida por cima: o PULSO de luz correndo pelos traços de cobre,
o ARO da nebulosa na crista, o VAPOR saindo das grades e juntas, e as FAÍSCAS no rombo — com o Ato 2 cheio e a arena
mais limpa. Spec `specs/2026-11-08-cenario-casco-arena-design.md` §3 e §6; plano mãe `plans/2026-11-08-cenario-casco-arena.md`.

**Architecture:** uma camada de pixels só do casco (`CanvasTexture` 384×116 de y=100 a 216, `depth −74,8`: acima das
peças −75, abaixo do casco vivo da arena −74,5, que só pinta o que deforma), redesenhada a 30 Hz. Tudo é calculado na
resolução nativa a partir dos pixels das próprias peças ([[efeito-de-cena-assado-em-pixel]]): a máscara do cobre e o
contorno de cima saem da arte; o vapor e as faíscas são partículas de 1 px com pontilhado Bayer (a linguagem dos
respiros aprovados da enguia). A lógica é PURA (`src/f3/efeitosCasco.ts`, testável no Node); o Phaser só lê as peças e
sobe o buffer (`src/f3/camadaCasco.ts`). Liga junto com o céu do casco (no preto), atrás da chave `?cenario=novo`.

**Tech Stack:** Phaser 3.90, TypeScript (Node 24 lê `.ts`), sharp, Playwright, ffmpeg.

## Global Constraints

- **Só visual.** Inimigos, aranha, props, cabeças, enguia: nada muda. `node scripts/test-enguia-porte.mjs` passa.
- **A arte do casco não muda:** tudo por cima, preso às peças, andando com elas.
- **No vácuo nada sobe nem cai por peso** ([[fisica-do-lugar-nos-ataques]]): o vapor sai pelo bocal e desacelera; as
  faíscas voam retas.
- **Cores:** luz só onde há energia (o pulso, as faíscas); NADA em vermelho de aviso nem branco-azulado (a faixa livre);
  o vapor é cinza do casco, escuro.
- **Dois regimes** (spec §6): no casco (Ato 2) o pulso cheio, vapor em vários pontos, sem faíscas; na arena o pulso mais
  lento e fraco, vapor raro, faíscas só no rombo aberto. A troca no silêncio (o evento `ceu`), suave (4 s).
- **Sem editar `src/` durante filmagem**; editar com Edit/Write; commit só quando ele pedir, só no nome dele.

## Medidas (08/11)

- As 6 peças são 114×66, o topo reto (y 0–2) — a crista da faixa em y≈150. Cobre (`r>110, r−b>45, r>g>b`): placa 365 px,
  escama 160, costela 77, costela2 498, duto 671, duto2 563.
- A grade de lâminas do duto/duto2 vai de x 19 a 58 (linhas 9–23); as escadinhas da placa ficam embaixo (x 17–21 e
  92–96, linhas 44–56). O rombo (`serpenteRombo`, 318×100, topo em y=116) tem o buraco centrado em x=159 da faixa.

## Arquivos

| Arquivo | Papel |
|---|---|
| `src/f3/numerosCascoF3.ts` (novo, puro) | Os números: a camada, o pulso por regime, o cobre, o aro, os respiros por peça, o vapor, as faíscas |
| `src/f3/efeitosCasco.ts` (novo, puro) | A simulação e o desenho num `Uint8ClampedArray` (pulso, aro, vapor, faíscas) |
| `src/f3/camadaCasco.ts` (novo) | O Phaser: máscaras das texturas (cache), a `CanvasTexture`, 30 Hz |
| `src/Parallax.ts` | Liga a camada no `ligarCeuDoCasco`, passa o regime, chama o `update` |
| `scripts/test-f3-casco.mjs` (novo) | Os números, a física (nada cai), o cobre medido nas peças reais |
| `docs/superpowers/folhas/2026-11-08/cenario-casco/casco.html` (novo) | A folha da rodada 2 |

---

### Task 1: Os números e os testes (puro)

**Files:** Create `src/f3/numerosCascoF3.ts`, `scripts/test-f3-casco.mjs`

**Interfaces — Produces:**
- `type RegimeCasco = 'casco' | 'arena'`
- `CAMADA_CASCO = { y0: 100, h: 116, depth: -74.8, hz: 30 }`
- `PULSO: Record<RegimeCasco, { v: number; lambda: number; pico: number; k: number }>`, `COR_PULSO: RGB`
- `intensidadePulso(x: number, t: number, p): number` (0…pico; pico em `x = v·t`)
- `ehCobre(r, g, b): boolean`
- `ARO = { cor: RGB, mix1: number, mix2: number }`
- `RESPIROS: Record<string, readonly { x: number; y: number }[]>` (coordenadas na peça)
- `VAPOR: Record<RegimeCasco, { espera: [number, number]; sopro: [number, number]; porSeg: number }>` + `VAPOR_PARTICULA`
- `FAISCAS = { espera: [number, number]; n: [number, number]; vel: [number, number]; vida: [number, number]; rampa: RGB[]; flash: RGB }`

- [ ] **Step 1:** escrever `scripts/test-f3-casco.mjs` (o código final está no arquivo; ele cobre): o pulso tem pico
  `pico` em `x = v·t` e é 0 a meio comprimento; a arena é mais lenta e mais fraca; `ehCobre` aceita o cobre do duto
  (`[196, 128, 72]`) e recusa o osso (`[214, 208, 186]`) e a chapa escura (`[40, 50, 60]`); todo respiro cai dentro de
  114×66 e só nas peças que existem; o cobre medido nas PNGs reais bate com as medidas acima (±0); nenhuma cor de faísca
  ou vapor é branco-azulada (`b > r` e `l > 0,8`) nem vermelho de aviso (`r > 200, g < 80`).
- [ ] **Step 2:** rodar `node scripts/test-f3-casco.mjs` → FALHA (módulo ausente).
- [ ] **Step 3:** escrever `src/f3/numerosCascoF3.ts`.
- [ ] **Step 4:** rodar → passa.

### Task 2: A simulação e o desenho (puro)

**Files:** Create `src/f3/efeitosCasco.ts`; acrescentar ao `scripts/test-f3-casco.mjs`

**Interfaces — Produces:**
```ts
export interface PecaNaTela { key: string; x0: number; y0: number; mascara: Mascara }   // x0,y0 = canto de cima à esquerda, na tela
export interface Mascara { w: number; h: number; cobre: Int16Array /* x,y,r,g,b… */; topo: Int16Array /* y por coluna, −1 */; px: Uint8ClampedArray /* RGBA da peça */ }
export class EfeitosCasco {
  constructor(semente: number);
  regime(r: RegimeCasco, ms?: number): void;              // a troca suave
  passo(dt: number, pecas: PecaNaTela[], rombo: { x0: number; y0: number; buraco: [number, number] } | null): void;
  desenhar(out: Uint8ClampedArray): void;                 // 384 × CAMADA_CASCO.h, RGBA, limpo antes
}
```
- [ ] **Step 1 (teste):** a física: rodar 10 s de passos de 1/30 com uma peça `cascoDuto` falsa e o rombo; afirmar que
  nenhuma partícula de vapor ganha velocidade para BAIXO (vy nunca cresce) e nenhuma faísca muda de direção; que no regime
  `casco` não nasce faísca e no `arena` nascem só com o rombo aberto; que `desenhar` não escreve fora do buffer.
- [ ] **Step 2:** FALHA. **Step 3:** implementar. **Step 4:** passa.

### Task 3: A camada no Phaser e a ligação

**Files:** Create `src/f3/camadaCasco.ts`; Modify `src/Parallax.ts` (`ligarCeuDoCasco`, `regimeDoCeu`, `update`)

- [ ] **Step 1:** `CamadaCasco` — `constructor(scene, pecas: () => Image[])`: a `CanvasTexture` 384×116 em (0, 100),
  `depth −74,8`; `mascara(key)` lê a textura (canvas 2D, uma vez por chave) e monta cobre/topo/px; `update(dt)` junta as
  peças visíveis (as do casco e o rombo, que está na mesma lista), acha o buraco do rombo aberto (`serpenteRombo`: a
  linha `crista+4` da faixa, de x=159 para fora até a luminância ≥ 34, como o `cascoVivo`), chama `passo` e, a cada
  1/30 s, `desenhar` + `putImageData` + `refresh`.
- [ ] **Step 2:** no `Parallax`: o campo `private camadaCasco: CamadaCasco | null`; `ligarCeuDoCasco` cria com
  `() => this.pecasDoCasco()`; `regimeDoCeu('arena')` → `camadaCasco.regime('arena', 4000)`; `update` →
  `this.camadaCasco?.update(dt)`; o treino (`regimeDoCeu` logo depois de ligar) entra seco (`ms = 0` quando a camada
  acabou de nascer).
- [ ] **Step 3:** `npx tsc --noEmit`; os testes (`test-f3-casco`, `test-f3-ceu`, `test-atmosfera-perfis`, `test-enguia-porte`).

### Task 4: A folha da rodada 2

- [ ] **Step 1:** filmar (sem editar `src/`): a corrida real 56–72 s (o casco no Ato 2) ANTES (só o céu: a camada
  desligada por `&casco=0`, a chave de dev desta rodada) × DEPOIS; as 3 cabeças (`?serpente=A&cenario=novo`) e a enguia
  (`_sonda-enguia --q "cenario=novo"`) ANTES × DEPOIS; fotos ampliadas 4× de um trecho do casco com o pulso no pico, o
  vapor e as faíscas.
- [ ] **Step 2:** conferir AMPLIADO (o pulso só no cobre, o aro sem degrau nas emendas das peças, o vapor sem cair, as
  faíscas pequenas); medir o custo (a linha do jogo na sonda, antes × depois).
- [ ] **Step 3:** a folha `casco.html` com as perguntas: a força e a velocidade do pulso; a cor do aro (violeta) ; a
  quantidade de vapor; as faíscas; o vapor na arena (pouco ou nenhum).
- [ ] **Step 4:** mostrar; registrar a resposta no 🧭.
