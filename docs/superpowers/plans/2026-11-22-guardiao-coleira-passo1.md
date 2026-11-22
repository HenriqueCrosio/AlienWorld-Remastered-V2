# O Guardião preso — PASSO 1: o recorte, a corda e a investida presa (plano)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** os cabos da coleira saem do desenho do Guardião e passam a ser cordas desenhadas em jogo (a cor e a textura
amostradas da arte), presas ao teto; a investida para no alcance delas com um TRANCO e volta puxada por elas — em 2–3
variações do tranco, mostradas a ele em GIF.

**Architecture:** três módulos puros em `src/entities/guardiao/` (a corrente de nós `corda.ts`, a geometria e os tempos
da coleira `coleira.ts`, o rasterizador `desenharCorda.ts`), uma camada de pixels na resolução da tela
(`camadaCabos.ts`, CanvasTexture 384×216, atrás da moldura e do corpo), e o `BossNucleo` usando-os na investida. A arte
recortada entra com nomes novos (`guardiao-coleira*.png`): a antiga fica no disco e em `assets/raw/guardiao-com-cabos/`.

**Tech Stack:** Phaser 3.90, TypeScript, Vite; testes puros em Node (`--experimental-transform-types`), em jogo com
Playwright; arte com `sharp`.

**Spec:** `docs/superpowers/specs/2026-11-22-guardiao-coleira-design.md` (§4 e §9; os passos 2–6 ganham plano próprio
depois do veredito deste).

## Global Constraints

- A resolução nativa é 384×216 (`GAME_WIDTH`/`GAME_HEIGHT`); a corda é desenhada NELA, pixel a pixel — nunca
  `Graphics`, nunca imagem esticada.
- As cores da corda são SÓ as amostradas do cabo pintado (`src/data/cordaGuardiao.ts`, gerado).
- O recorte só APAGA: fora da máscara, cada pixel das quatro artes idêntico ao original (provado por script).
- O corpo segue fechado na investida (`corpoInteiro`); a carga (1,15 s, a trava em 0,62) não muda.
- Enquanto ele joga na 5173: editar só a cópia na 5174 (memória `filmagem-vite-recarrega`); copiar de volta quando ele
  parar.
- Commit só quando ele pedir, só no nome dele, sem `Co-Authored-By`.
- Comentários e nomes no estilo do arquivo (o `BossNucleo` é em português); scripts novos em inglês nos comentários.

## File Structure

| Arquivo | Responsabilidade |
|---|---|
| `scripts/_guardiao/_recortar-cabos.mjs` (novo) | a máscara dos cabos, o recorte das 4 artes, os originais em `assets/raw/`, a prova pixel a pixel, a folha antes/depois |
| `scripts/_guardiao/_amostrar-cabo.mjs` (novo) | a seção do cabo pintado → `src/data/cordaGuardiao.ts` (cores, período dos anéis, as raízes no casco) |
| `src/data/cordaGuardiao.ts` (gerado) | os dados da corda |
| `src/entities/guardiao/corda.ts` (novo) | a corrente de nós (Verlet), puro |
| `src/entities/guardiao/coleira.ts` (novo) | o alcance, a parada, o tranco (3 variações), a volta elástica — puro |
| `src/entities/guardiao/desenharCorda.ts` (novo) | o rasterizador da corda num `Uint32Array` — puro |
| `src/entities/guardiao/camadaCabos.ts` (novo) | a CanvasTexture e as cordas da coleira no Phaser |
| `src/entities/BossNucleo.ts` (mod.) | a investida presa, o tranco, a volta; a arte nova |
| `src/scenes/BootScene.ts` (mod.) | carregar as artes `guardiao-coleira*` |
| `scripts/test-guardiao-coleira.mjs` (novo) | os testes puros |
| `scripts/test-guardiao-coleira-jogo.mjs` (novo) | o teste em jogo |
| `scripts/_guardiao/_gif-investida.mjs` (novo) | o GIF das variações, lado a lado, na velocidade real |

---

### Task 1: O recorte dos cabos e a amostra da corda

**Files:** Create `scripts/_guardiao/_recortar-cabos.mjs`, `scripts/_guardiao/_amostrar-cabo.mjs`,
`src/data/cordaGuardiao.ts`, `public/sprites/guardiao-coleira.png`, `guardiao-coleira-idle-sheet.png`,
`guardiao-coleira-morte-sheet.png`, `guardiao-coleira-destruido.png`; copy originals to `assets/raw/guardiao-com-cabos/`.

**Interfaces — Produces:** `CORDA_GUARDIAO = { cores: number[] /* 0xRRGGBB, borda→borda, já na escala 0,7 */;
anel: { periodo: number; escuro: number }; raizes: { x: number; y: number }[] /* px do PNG, a partir do centro */ }`.

- [ ] **Step 1:** ampliar ×4 o alto das quatro artes (os 9 quadros das duas folhas) e marcar quais cabos são a coleira (o
  feixe do alto que sobe para a borda) e quais ficam (os tentáculos da direita e de baixo, as torretas).
- [ ] **Step 2:** escrever a máscara: um polígono por cabo acima da linha do casco + a regra de cor (cabo = marrom/
  laranja; casco = cinza-esverdeado) para não comer o casco nem as torretas. A MESMA máscara para os 20 quadros (as
  folhas são alinhadas no mesmo 256²); se um quadro da respiração mover um cabo, a máscara cresce para cobrir os dois.
- [ ] **Step 3:** rodar `node scripts/_guardiao/_recortar-cabos.mjs` — grava as 4 artes `-coleira`, copia os originais,
  imprime `fora da máscara: 0 pixels diferentes` para cada arte (FALHA se ≠ 0) e grava a folha
  `docs/superpowers/folhas/2026-11-22/guardiao/recorte.png` (antes/depois ×3, quadros 0, 4, 7 e o estático).
- [ ] **Step 4:** conferir a folha AMPLIADA (memória `conferir-ampliado-antes-de-mostrar`): sem toco de cabo solto, sem
  buraco no casco, as raízes terminando DENTRO do contorno do casco.
- [ ] **Step 5:** `_amostrar-cabo.mjs`: uma varredura atravessando um cabo quase vertical (o grosso, com musgo) em várias
  linhas → a seção mediana (contorno, corpo, borda acesa), reduzida a 0,7 pelo vizinho mais próximo; o período dos anéis
  pela autocorrelação do brilho ao longo do cabo; as raízes = o ponto de cada cabo cortado na linha do casco. Grava
  `src/data/cordaGuardiao.ts`.

### Task 2: Os módulos puros (corda, coleira, rasterizador) — TDD

**Files:** Create `src/entities/guardiao/corda.ts`, `coleira.ts`, `desenharCorda.ts`; Test `scripts/test-guardiao-coleira.mjs`.

**Interfaces — Produces:**
```ts
// corda.ts
export interface Ponto { x: number; y: number }
export class Corda {
  constructor(a: Ponto, b: Ponto, comprimento: number, nos?: number);  // nos = 14
  readonly comprimento: number;
  passo(dt: number, a: Ponto, b: Ponto, gravidade: number): void;      // Verlet, pontas presas em a e b
  esticada(a: Ponto, b: Ponto): boolean;                                // |a→b| ≥ comprimento − 0,5
  golpe(forca: number): void;                                           // chute transversal nos nós do meio
  pontos(): Ponto[];
}
// coleira.ts
export function xDaParada(ancora: Ponto, raiz: Ponto, L: number, yCorpo: number): number; // x do corpo onde a raiz atinge L
export interface Tranco { passa: number; volta: number; vibra: number; tremor: number; molas: number }
export const TRANCOS: Record<'A' | 'B' | 'C', Tranco>;   // A seco · B elástico · C vibrante
export function deslocTranco(t: number, tr: Tranco): number; // px além da parada no tempo t (s) desde o tranco
export function voltaElastica(k: number): number;            // 0→1, rápido no começo, assenta no fim
// desenharCorda.ts
export interface Secao { cores: number[]; anel: { periodo: number; escuro: number } }
export function desenharCorda(buf: Uint32Array, W: number, H: number, pts: Ponto[], secao: Secao): void;
```

- [ ] **Step 1: os testes que falham** (`scripts/test-guardiao-coleira.mjs`, no formato de `test-sonda-regras.mjs`):
  - `xDaParada`: com a âncora em (300, −4), a raiz (0, −60), L = 160, yCorpo = 104 → `(x + 0 − 300)² + (104 − 60 + 4)² = 160²`
    com x < 300; e y mais longe da âncora → parada mais à direita (o alcance é um círculo).
  - `Corda`: com |a→b| < L, depois de 2 s de passos a 1/60 o nó do meio fica ABAIXO da reta (frouxa, cede à gravidade);
    com |a→b| = L, todos os nós a < 1 px da reta (`esticada` = true); o comprimento total nunca passa de L + 1 %.
  - `deslocTranco`: em t = 0 vale 0; o máximo ≤ `passa` (+ 0,5); em t ≥ 0,6 s volta a |d| < 0,5; a B oscila (troca de
    sinal ≥ 2 vezes), a A não troca.
  - `voltaElastica`: 0 → 0, 1 → 1, monotônica, e `voltaElastica(0,3) > 0,5` (rápido no começo).
  - `desenharCorda`: uma corda a 45° e uma vertical — toda linha atravessada tem um trecho contínuo, sem buraco, de
    largura `cores.length` ± 1; todo pixel escrito tem cor de `cores` (ou a versão escurecida do anel).
- [ ] **Step 2:** `node --experimental-transform-types scripts/test-guardiao-coleira.mjs` → FALHA (módulos não existem).
- [ ] **Step 3: a implementação mínima.**
  - `Corda`: posições atuais e anteriores em `Float32Array`; `passo` = Verlet (`x += (x − xAnt)·0,985 + g·dt²`), 10
    iterações de restrição de segmento (`comprimento / (nos − 1)`), as pontas fixadas em a e b a cada iteração.
  - `xDaParada`: `ancora.x − raiz.x − sqrt(L² − (yCorpo + raiz.y − ancora.y)²)` (o lado esquerdo do círculo; se o radicando
    for < 0, devolve `ancora.x − raiz.x`).
  - `TRANCOS`: A `{ passa: 3, volta: 0.12, vibra: 6, tremor: 0.004, molas: 0 }`, B `{ passa: 8, volta: 0.45, vibra: 4,
    tremor: 0.003, molas: 2 }`, C `{ passa: 4, volta: 0.15, vibra: 14, tremor: 0.007, molas: 0 }`; `deslocTranco` = subida
    em ¼ de `volta` até `passa` e descida; com `molas` > 0, um seno amortecido de `molas` ciclos dentro de `volta`.
  - `voltaElastica(k) = 1 − (1 − k)³`.
  - `desenharCorda`: percorrer a polilinha a passos de 0,35 px; a normal de cada trecho; deslocamentos de −w/2 a +w/2 a
    passos de 0,5 px, cada um com a cor `cores[floor(i/2)]`, escurecida (× `anel.escuro`) quando
    `(s mod periodo) < 1`; pixel arredondado, fora da tela ignorado; ABGR para o `ImageData` (little-endian).
- [ ] **Step 4:** rodar de novo → todos `OK`.

### Task 3: A camada dos cabos e a investida presa no jogo

**Files:** Create `src/entities/guardiao/camadaCabos.ts`; Modify `src/entities/BossNucleo.ts` (o construtor, o
`case 'telegrafo'` na trava, os `case 'investe'`/`'volta'`, `trocarParaPredador`, `destroy`), `src/scenes/BootScene.ts`.

**Interfaces — Consumes:** Task 1 (`CORDA_GUARDIAO`), Task 2 (todos). **Produces:** `class CamadaCabos { constructor(scene,
ancoras: Ponto[], raizesPng: Ponto[], escala: number, comprimentos: number[]); atualizar(dt, corpo: { x: number; y:
number }): void; golpe(forca: number): void; arrebentar(): void; get esticada(): boolean; destroy(): void }`.

- [ ] **Step 1:** `CamadaCabos`: CanvasTexture `guardiaoCabos` 384×216, imagem em depth −0,61 (atrás das placas da
  moldura, −0,6, e do corpo; à frente da pintura); uma `Corda` por raiz; a âncora de cada uma na borda de cima acima da
  estação (`y = −4`, x = a raiz na estação), o comprimento = a distância âncora–raiz na PARADA (então elas esticam
  exatamente no tranco) e, na estação, ficam frouxas. Cada quadro: `passo`, limpar o buffer, `desenharCorda` de cada,
  `putImageData`, `refresh()`.
- [ ] **Step 2:** `BootScene`: carregar `guardiao-coleira*` com as chaves `guardiaoColeira`, `guardiaoColeiraIdleSheet`,
  `guardiaoColeiraMorteSheet`, `guardiaoColeiraDestruido`; o `BossNucleo` usa as `-coleira` quando existirem (a antiga é
  a rede).
- [ ] **Step 3:** a investida: na saída do telégrafo, calcular `xParada = xDaParada(...)` com a altura mirada; no
  `case 'investe'`, ao cruzar `xParada` → posição na parada, velocidade 0, `acao = 'tranco'`, `cabos.golpe(tr.vibra)`,
  `cameras.main.shake(90, tr.tremor)`. O `case 'tranco'` (novo) aplica `deslocTranco` por `tr.volta` s; depois
  `acao = 'volta'` com a posição por `voltaElastica` da parada à estação em 0,8 s (sem `setVelocity`: posição direta,
  `body.reset` no fim). A variação pela URL: `?tranco=A|B|C` (padrão A).
- [ ] **Step 4:** a morte: `trocarParaPredador` chama `cabos.arrebentar()` — as âncoras soltam, a corda chicoteia com a
  gravidade e some em 0,8 s (alpha da imagem).
- [ ] **Step 5:** `npx tsc --noEmit` → sem erro.

### Task 4: O teste em jogo, o GIF e a folha

**Files:** Create `scripts/test-guardiao-coleira-jogo.mjs`, `scripts/_guardiao/_gif-investida.mjs`, a folha
`docs/superpowers/folhas/2026-11-22/guardiao/folha.html`.

- [ ] **Step 1:** o teste em jogo (o treino `{ stage: 4, practice: true }`, a nave invulnerável e parada em (70, 108)):
  forçar `acaoT = 0` com `proxima = 'investida'`; conferir que (a) o corpo nunca passa de `xParada − passa − 1`, (b) as
  cordas estão `esticada` no quadro do tranco, (c) ele volta a `G_STATION_X` em ≤ 1,5 s depois do tranco, (d) nenhum erro
  de página. `node scripts/test-guardiao-coleira-jogo.mjs [--porta 5174]` → `OK` em todas.
- [ ] **Step 2:** o GIF: a receita do `_sonda/_gif-sonda-jogo.mjs` (o relógio em passos, uma foto a cada 3 quadros), as
  três variações A/B/C lado a lado, duas investidas cada (uma alta, uma baixa), ×2.
- [ ] **Step 3:** a folha com o GIF, a prova do recorte e as perguntas a ele (qual tranco; o ponto de parada; a corda lê
  como o cabo pintado?). Mostrar e esperar o veredito.
