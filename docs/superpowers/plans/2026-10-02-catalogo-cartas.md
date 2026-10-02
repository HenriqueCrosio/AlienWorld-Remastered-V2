# O catálogo de 24 cartas — Plano de implementação

> **EXECUTADO em 02/10** (as 9 tasks, com checkpoint dele em cada uma). **Desvios pedidos por ele no caminho** — o
> código vale sobre o texto abaixo onde divergirem:
> - **Explosão:** a arte aprovada já entrou (A + B: a de cada carta, variando) — `instalar-explosoes-cartas.mjs`.
> - **Míssil:** mira travada no disparo (um alvo por míssil, o 2º sai 140ms depois), perseguição com inércia e
>   amortecedor de lado, explode no ar em 2,5s — no lugar do `homing` do pool.
> - **Flare:** solto pelo JOGADOR (tecla L provisória, espera 8s), não a cada 4s.
> - **Drone:** desvia de LADO de quem anda em linha reta; o tiro dele sem o rastro teal.
> - **Dash:** espera de 8s (não 2,5s), 3 fantasmas; a HUD conta as recargas ("DASH 5s", "FLARE 6s").
> - A sonda da HUD lê "DASH Ns"/"FLARE Ns" contando, em vez de "sem DASH".

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** as 24 cartas da spec jogáveis — as 11 novas com mecânica e **arte provisória** (formas simples), os 24 ícones
aprovados na mesa, a explosão como UM sistema, a build elétrica, o dash, o drone, o míssil, o flare e a aura do Casco —
para o Henrique jogar e sentir antes de a arte aprovada entrar.

**Architecture:** o catálogo vira dado puro (`src/data/catalogoCartas.ts`) e as contas novas (raio, leque, saltos do
arco, raio em pixel, contorno, duplo toque) viram funções puras em `src/cartasRegras.ts`, as duas testadas em node. Em
jogo, `CartasEmJogo` continua sendo o único ponto que a `GameScene` chama; ela passa a delegar a subsistemas pequenos em
`src/systems/cartas/` (explosão, lançadores, drone, elétrico, aura, dash), que recebem um `Contexto` comum. Todo
projétil de carta (míssil, flare, tiro do drone, estilhaço) sai do pool da nave por `WeaponSystem.disparar`, marcado com
uma `origem` — assim ele acerta inimigo, chefão, golfinho e rocha pelos overlaps que já existem.

**Tech Stack:** Phaser 3.90 · TypeScript · Vite · Playwright (sondas) · Node 24 (roda `.ts` puro com type stripping).

**Spec:** `docs/superpowers/specs/2026-10-01-catalogo-cartas-design.md` (leia §3, §4 e §8 antes de começar).

**Fora deste plano:** a arte aprovada no lugar da provisória (spec §6.3 — drones, mísseis 16×5, tiros 6×1, estilhaço D,
explosões direcionais e as animações): vem num plano próprio **depois** de ele jogar as mecânicas. A frente B
(inimigos que atiram) e a C (números). O botão do Dash no controle (etapa 1.6).

## Global Constraints

- Branch `feat/cartas-preview`. Commits com autoria **só do Henrique** — **sem** linha `Co-Authored-By`.
- Mensagens de commit, comentários e docs em **pt-br**, no tom do código vizinho (identificadores em português).
- ⚠️ `sed`/`node -e` falham em silêncio aqui (CRLF, `${}`): **edite arquivo com a ferramenta Edit** e confira.
- As sondas precisam do `npm run dev` rodando (http://localhost:5173/).
- Os testes em node rodam da RAIZ do repositório: `node scripts/test-<nome>.mjs`.
- Módulo importado por teste em node (`src/data/catalogoCartas.ts`, `src/cartasRegras.ts`) é PURO: sem Phaser, só
  `import type`, sem `enum`, sem parameter properties (`constructor(private x)`), sem `namespace`.
- `tsconfig` tem `noUnusedLocals` e `noUnusedParameters`: parâmetro não usado quebra o `npm run typecheck`.
- Todos os números são **provisórios** (calibragem, frente C) — ficam em constantes nomeadas no topo de cada arquivo.
- Nenhum nome de carta passa de **14 letras**. EFF_003 se chama **FRAGMENTADO**.
- Distribuição: **5 comuns · 8 incomuns · 7 raras · 4 épicas = 24**.
- Sem recursão: **estilhaço não explode**; **Em Cadeia incendeia, não explode**; **quem leva o arco não solta arco**;
  **o pulso da Sobrecarga não eletrifica**. Chefões e minichefes **não travam** (só levam o dano).
- Checkpoint com o Henrique ao fim de cada task (a regra dele: *"eu avaliando a cada checkpoint"*): mostrar o que
  mudou e esperar o retorno antes da próxima.

---

## Mapa dos arquivos

| Arquivo | Papel |
|---|---|
| `src/data/catalogoCartas.ts` (novo) | PURO: `CartaDef`, `Categoria`, `CARTAS` (as 24), `ICONES_CARTAS` |
| `src/cartas.ts` | perde a tabela (reexporta do catálogo); mantém mão, sorteio, arma montada e mesas |
| `src/cartasRegras.ts` (novo) | PURO: `raioDaExplosao`, `angulosDoLeque`, `saltosDoArco`, `pixelsDoRaio`, `contornoDoAlfa`, `DuploToque` |
| `src/systems/cartas/contexto.ts` (novo) | os tipos `HostCartas`, `Contexto`, `Inimigo`, `Linhagem` |
| `src/systems/cartas/texturasProvisorias.ts` (novo) | as formas simples (míssil, flare, drone, tiros, estilhaço) |
| `src/systems/cartas/ExplosaoDoJogador.ts` (novo) | a explosão única + Explosão Maior + Fragmentado + Em Cadeia |
| `src/systems/cartas/Lancadores.ts` (novo) | Míssil Guiado e Flare |
| `src/systems/cartas/DroneAuxiliar.ts` (novo) | o drone: segue, desvia, atira guiado |
| `src/systems/cartas/Eletrico.ts` (novo) | eletrificado, Arco em Cadeia (raio em pixel), Sobrecarga |
| `src/systems/cartas/AuraDoCasco.ts` (novo) | o contorno da silhueta com o Casco pronto, e o estouro |
| `src/systems/cartas/Dash.ts` (novo) | o duplo toque, o avanço, a invulnerabilidade, os fantasmas |
| `src/systems/CartasEmJogo.ts` | o orquestrador: mesa, aplicar, ganchos, casco, queima — delega aos de cima |
| `src/systems/WeaponSystem.ts` | `disparar(ProjetilExtra)` e a `origem` no projétil |
| `src/systems/EnemySystem.ts` | `travar(e, ms)` e o congelamento no `update` |
| `src/scenes/GameScene.ts` | host novo, `origem` nos acertos, alvos guiados, bombas, HUD do DASH, intocável no dash |
| `public/sprites/cartas/icone-<ID>.png` | os 24 ícones aprovados (substituem os 13 antigos) |
| `scripts/test-catalogo-cartas.mjs` (novo) | o catálogo bate com a spec |
| `scripts/test-cartas-regras.mjs` (novo) | as regras puras |
| `scripts/probe-cartas-novas.mjs` (novo) | cada carta nova faz o que diz, no mundo (spec §8) |
| `scripts/probe-mesa-texto.mjs` | passa a falar em 24 cartas |

---

### Task 1: O catálogo de 24 e os ícones aprovados

**Files:**
- Create: `src/data/catalogoCartas.ts`
- Modify: `src/cartas.ts:1-73`
- Create: `scripts/test-catalogo-cartas.mjs`
- Modify: `scripts/probe-mesa-texto.mjs` (textos e nome da folha)
- Copy: `docs/superpowers/folhas/2026-10-01/pecas-novas/icones-finais/<ID>.png` → `public/sprites/cartas/icone-<ID>.png`

**Interfaces:**
- Produces: `CARTAS: Record<string, CartaDef>` (24), `ICONES_CARTAS: string[]` (os 24 ids), `CartaDef`, `Categoria` —
  exportados de `src/data/catalogoCartas.ts` e reexportados por `src/cartas.ts` (quem importa de `cartas.ts` não muda).

- [ ] **Step 1: Escrever o teste do catálogo**

`scripts/test-catalogo-cartas.mjs`:

```js
// O CATÁLOGO bate com a spec (2026-10-01-catalogo-cartas-design.md §2, §3, §4.4, §5.1d). Uso, da raiz:
// node scripts/test-catalogo-cartas.mjs
import fs from 'fs';
import { CARTAS, ICONES_CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

const ids = Object.keys(CARTAS);
const por = (r) => ids.filter((id) => CARTAS[id].raridade === r).length;
igual(ids.length, 24, '24 cartas');
igual([por('comum'), por('incomum'), por('rara'), por('epica')], [5, 8, 7, 4], 'distribuição 5·8·7·4');
igual(ids.filter((id) => CARTAS[id].id !== id), [], 'a chave é o id da carta');
igual(ids.filter((id) => CARTAS[id].nome.length > 14), [], 'nenhum nome passa de 14 letras');
igual(ids.filter((id) => CARTAS[id].requer && !CARTAS[CARTAS[id].requer]), [], 'todo requisito existe');
const CORTADAS = ['WPN_003', 'WPN_005', 'WPN_006', 'EFF_005', 'EFF_008', 'EFF_009', 'MOV_002', 'MOV_004'];
igual(ids.filter((id) => CORTADAS.includes(id)), [], 'nenhuma carta cortada volta (§2)');
igual(CARTAS.DEF_002.max, 1, 'Recarga máx. 1 (§4.4)');
igual(CARTAS.EFF_003.nome, 'FRAGMENTADO', 'o nome sem Ç (§5.1d)');
igual([CARTAS.MOV_001.semF1, CARTAS.MOV_003.semF1], [true, true], 'movimento fora da F1');
igual(
  [CARTAS.EFF_002.requer, CARTAS.EFF_003.requer, CARTAS.EFF_007.requer, CARTAS.EFF_012.requer, CARTAS.EFF_013.requer],
  ['EFF_001', 'EFF_001', 'EFF_006', 'EFF_011', 'EFF_012'],
  'as cadeias: explosões, fogo e elétrica',
);
igual([CARTAS.WPN_009.max, CARTAS.DEF_005.max], [2, 2], 'Míssil e Bomba Extra: máx. 2');
igual(ICONES_CARTAS.length, 24, 'as 24 têm ícone');
igual(ICONES_CARTAS.filter((id) => !fs.existsSync(`public/sprites/cartas/icone-${id}.png`)), [], 'todo ícone está em public/sprites/cartas');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-catalogo-cartas.mjs`
Expected: erro `ERR_MODULE_NOT_FOUND` (o `catalogoCartas.ts` não existe).

- [ ] **Step 3: Criar o catálogo puro**

`src/data/catalogoCartas.ts`:

```ts
import type { Raridade } from '../raridade';

/**
 * O CATÁLOGO — as 24 cartas (spec `2026-10-01-catalogo-cartas-design.md` §3; aprovadas em 01/10, ícones em 02/10).
 *
 * Módulo PURO (sem Phaser): o teste do catálogo (`scripts/test-catalogo-cartas.mjs`) importa daqui, em node. O jogo
 * importa de `cartas.ts`, que reexporta.
 *
 * Os números dos efeitos são PROVISÓRIOS (calibragem, frente C) e moram em quem aplica a carta, não aqui. Nenhum nome
 * passa de 14 letras: a letra da mesa é UMA só para todas (spec da mesa §3.2) — o "FRAGMENTAÇÃO" (Ç + Ã) encolhia as 24.
 */

export type Categoria = 'arma' | 'efeito' | 'defesa' | 'movimento';

export interface CartaDef {
  id: string;
  nome: string;
  /** UMA linha curta — cabe em ~16 caracteres por linha, duas linhas no máximo. */
  texto: string;
  /** O efeito em UMA linha só, em caixa alta (a carta compacta; referência: Deep Rock Galactic: Survivor). */
  curto: string;
  categoria: Categoria;
  raridade: Raridade;
  /** Quantas vezes pode ser escolhida. */
  max: number;
  /** Só aparece com esta carta já na mão. */
  requer?: string;
  /** Some da mesa quando esta outra já foi escolhida (o Duplo depois do Triplo). */
  excluiSe?: string;
  /** Não aparece na Fase 1 (voo por impulso). */
  semF1?: boolean;
}

export const CARTAS: Record<string, CartaDef> = {
  // ─── 🔫 ARMAMENTO (7) ───
  WPN_001: { id: 'WPN_001', nome: 'TIRO DUPLO', texto: 'dispara 2\nprojéteis', curto: '2 PROJÉTEIS', categoria: 'arma', raridade: 'comum', max: 1, excluiSe: 'WPN_002' },
  WPN_002: { id: 'WPN_002', nome: 'TIRO TRIPLO', texto: 'dispara 3\nem leque', curto: '3 EM LEQUE', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_004: { id: 'WPN_004', nome: 'CADÊNCIA', texto: '+15% de\ncadência', curto: '+15% CADÊNCIA', categoria: 'arma', raridade: 'comum', max: 3 },
  WPN_007: { id: 'WPN_007', nome: 'PERFURANTE', texto: 'atravessa\ninimigos', curto: 'ATRAVESSA INIMIGOS', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_008: { id: 'WPN_008', nome: 'TIRO PESADO', texto: 'dano x2,\nmais lento', curto: 'DANO x2', categoria: 'arma', raridade: 'rara', max: 1 },
  WPN_009: { id: 'WPN_009', nome: 'MÍSSIL GUIADO', texto: 'míssil que\npersegue', curto: 'MÍSSIL QUE PERSEGUE', categoria: 'arma', raridade: 'incomum', max: 2 },
  WPN_010: { id: 'WPN_010', nome: 'DRONE AUXILIAR', texto: 'drone que\natira', curto: 'DRONE QUE ATIRA', categoria: 'arma', raridade: 'epica', max: 1 },
  // ─── 💥 EFEITO (10) ───
  EFF_001: { id: 'EFF_001', nome: 'EXPLOSIVO', texto: 'explode ao\nacertar', curto: 'EXPLODE AO ACERTAR', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_002: { id: 'EFF_002', nome: 'EXPLOSÃO MAIOR', texto: 'explosões\nmaiores', curto: 'EXPLOSÕES MAIORES', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_003: { id: 'EFF_003', nome: 'FRAGMENTADO', texto: 'solta\nestilhaços', curto: 'SOLTA ESTILHAÇOS', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_004: { id: 'EFF_004', nome: 'INCENDIÁRIO', texto: 'chance de\nincendiar', curto: 'PODE INCENDIAR', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_006: { id: 'EFF_006', nome: 'COMBUSTÃO', texto: 'queimado\nexplode', curto: 'QUEIMADO EXPLODE', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_004' },
  // Requer Incendiário + Combustão: a Combustão já exige o Incendiário, então basta ela.
  EFF_007: { id: 'EFF_007', nome: 'EM CADEIA', texto: 'explosão\nincendeia', curto: 'EXPLOSÃO INCENDEIA', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_006' },
  EFF_010: { id: 'EFF_010', nome: 'FLARE', texto: 'armadilha\ntraseira', curto: 'ARMADILHA TRASEIRA', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_011: { id: 'EFF_011', nome: 'ELÉTRICO', texto: 'choque que\ntrava', curto: 'CHOQUE QUE TRAVA', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_012: { id: 'EFF_012', nome: 'ARCO EM CADEIA', texto: 'o choque\nsalta', curto: 'CHOQUE SALTA', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_011' },
  EFF_013: { id: 'EFF_013', nome: 'SOBRECARGA', texto: 'eletrificado\nexplode', curto: 'ELETRIFICADO EXPLODE', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_012' },
  // ─── 🛡️ DEFESA (5, dentro das 3 vidas) ───
  DEF_001: { id: 'DEF_001', nome: 'CASCO', texto: 'absorve 1\ngolpe', curto: 'ABSORVE 1 GOLPE', categoria: 'defesa', raridade: 'comum', max: 1 },
  DEF_002: { id: 'DEF_002', nome: 'RECARGA', texto: 'o casco\nvolta rápido', curto: 'CASCO VOLTA RÁPIDO', categoria: 'defesa', raridade: 'incomum', max: 1, requer: 'DEF_001' },
  DEF_003: { id: 'DEF_003', nome: 'VIDA EXTRA', texto: '+1 vida', curto: '+1 VIDA', categoria: 'defesa', raridade: 'rara', max: 1 },
  DEF_004: { id: 'DEF_004', nome: 'CASCO REATIVO', texto: 'casco partido\nexplode', curto: 'CASCO EXPLODE', categoria: 'defesa', raridade: 'rara', max: 1, requer: 'DEF_001' },
  DEF_005: { id: 'DEF_005', nome: 'BOMBA EXTRA', texto: '+1 bomba', curto: '+1 BOMBA', categoria: 'defesa', raridade: 'comum', max: 2 },
  // ─── ⚡ MOVIMENTO (2) ───
  MOV_001: { id: 'MOV_001', nome: 'PROPULSORES', texto: '+12% de\nvelocidade', curto: '+12% VELOCIDADE', categoria: 'movimento', raridade: 'comum', max: 2, semF1: true },
  MOV_003: { id: 'MOV_003', nome: 'DASH', texto: 'avanço\ninvulnerável', curto: 'AVANÇO INVULNERÁVEL', categoria: 'movimento', raridade: 'rara', max: 1, semF1: true },
};

/**
 * TODAS têm ícone: os 24 aprovados em 02/10 (`folhas/2026-10-01/pecas-novas/icones-finais`), instalados em
 * `sprites/cartas/icone-<id>.png`. Carregados no mundo (`BootScene`) e na camada HD (`BootHDScene`, onde a mesa mora).
 */
export const ICONES_CARTAS = Object.keys(CARTAS);
```

- [ ] **Step 4: `cartas.ts` passa a reexportar o catálogo**

Em `src/cartas.ts`, troque o cabeçalho e a tabela (linhas 1–73, de `import type Phaser` até o fim de `ICONES_CARTAS`)
por:

```ts
import type Phaser from 'phaser';
import { WEAPONS, type WeaponDef } from './systems/WeaponSystem';
import { RARIDADES, type Raridade } from './raridade';
import { CARTAS, type CartaDef } from './data/catalogoCartas';

/**
 * AS CARTAS — o sistema de cartas (branch `feat/cartas-preview`; protótipo de 27/09, catálogo de 24 em 01/10).
 *
 * Fonte: `sistema_de_cartas_skills_shoot_em_up_v2.md` (o documento do Henrique), revisado contra o jogo na spec
 * `2026-10-01-catalogo-cartas-design.md`. O CATÁLOGO mora em `data/catalogoCartas.ts` (puro, testado em node); aqui
 * ficam as regras de mão e de mesa:
 * - uma ideia por carta, efeito que se VÊ, poucos números;
 * - 3 cartas na mesa, escolhe 1;
 * - cartas com LIMITE de acúmulo (`max`) e com REQUISITO (`requer`);
 * - quem mexe na MESMA propriedade não soma: o Triplo SUBSTITUI o Duplo (§14 do documento).
 *
 * Duas adaptações ao jogo:
 * - **a Defesa vive dentro das 3 vidas** (decisão de 27/09): não há barra de escudo. O CASCO absorve 1 golpe e
 *   recarrega; a Blindagem virou VIDA EXTRA.
 * - **a Fase 1 é voo por impulso**: carta de movimento não aparece nela (`semF1`).
 *
 * O estado mora no `registry` do jogo — ele atravessa as cutscenes sem precisar de payload. A Fase N guarda um
 * CHECKPOINT das cartas na entrada: morrer e repetir a fase devolve as cartas de ENTRADA, não as ganhas nela.
 */

export { COR_RARIDADE, NOME_RARIDADE, RARIDADES, type Raridade } from './raridade';
export { CARTAS, ICONES_CARTAS, type CartaDef, type Categoria } from './data/catalogoCartas';
```

O resto do arquivo (`const ORDEM = RARIDADES;` em diante) fica como está — ele usa `CARTAS` e `CartaDef`, que agora
vêm do import.

- [ ] **Step 5: Instalar os 24 ícones aprovados**

```bash
for f in docs/superpowers/folhas/2026-10-01/pecas-novas/icones-finais/*.png; do
  cp "$f" "public/sprites/cartas/icone-$(basename "$f")"
done
ls public/sprites/cartas/icone-*.png | wc -l
```

Expected: `24`.

- [ ] **Step 6: Rodar o teste e o typecheck**

Run: `node scripts/test-catalogo-cartas.mjs`
Expected: todas as linhas `OK` e `TUDO OK`.

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 7: A sonda da mesa com as 24**

Em `scripts/probe-mesa-texto.mjs`, troque "as 13 cartas" por "as 24 cartas" nos comentários do topo e o nome da
folha `mesa-13-cartas.png` por `mesa-24-cartas.png` (nas duas linhas que o escrevem e o imprimem). A sonda já monta
`Object.keys(CARTAS)`, então as 24 entram sozinhas.

Run (com `npm run dev` rodando): `mkdir -p docs/superpowers/folhas/2026-10-02 && node scripts/probe-mesa-texto.mjs docs/superpowers/folhas/2026-10-02`
Expected: `TUDO OK` nas três janelas e a folha `docs/superpowers/folhas/2026-10-02/mesa-24-cartas.png`.
Abra a folha e olhe carta por carta (critério dele: nenhum texto fora do quadro ou do centro, em todas).

- [ ] **Step 8: Commit**

```bash
git add src/data/catalogoCartas.ts src/cartas.ts scripts/test-catalogo-cartas.mjs scripts/probe-mesa-texto.mjs public/sprites/cartas docs/superpowers/folhas/2026-10-02/mesa-24-cartas.png
git commit -m "feat(cartas): o catálogo de 24 e os ícones aprovados na mesa"
```

- [ ] **Step 9: Checkpoint** — mostrar a ele a `mesa-24-cartas.png` e esperar o retorno.

---

### Task 2: As regras puras das cartas novas

**Files:**
- Create: `src/cartasRegras.ts`
- Create: `scripts/test-cartas-regras.mjs`

**Interfaces:**
- Produces (todas exportadas de `src/cartasRegras.ts`):
  - `interface Ponto { x: number; y: number }`
  - `FATOR_EXPLOSAO_MAIOR = 1.5`; `raioDaExplosao(base: number, maior: boolean): number`
  - `angulosDoLeque(n: number, centro: number | null, abertura?: number): number[]` (graus)
  - `saltosDoArco(origem: Ponto & { id: number }, candidatos: (Ponto & { id: number })[], max: number, raio: number): number[]`
  - `pixelsDoRaio(a: Ponto, b: Ponto, aleatorio: () => number, passo?: number, desvio?: number): Ponto[]`
  - `contornoDoAlfa(alfa: ArrayLike<number>, w: number, h: number): Uint8Array` (máscara `(w+2)×(h+2)`)
  - `type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita'`; `class DuploToque { constructor(janelaMs: number); apertou(dir: Direcao, t: number): Direcao | null }`

- [ ] **Step 1: Escrever o teste**

`scripts/test-cartas-regras.mjs`:

```js
// As REGRAS PURAS das cartas novas (spec 2026-10-01-catalogo-cartas-design.md §4). Uso, da raiz:
// node scripts/test-cartas-regras.mjs
import {
  DuploToque, angulosDoLeque, contornoDoAlfa, pixelsDoRaio, raioDaExplosao, saltosDoArco,
} from '../src/cartasRegras.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

// raioDaExplosao — Explosão Maior ×1,5, arredondado
igual(raioDaExplosao(18, false), 18, 'sem Explosão Maior o raio é o base');
igual(raioDaExplosao(18, true), 27, 'com Explosão Maior: 18 → 27');

// angulosDoLeque — com rumo: leque de 120° para a frente; sem rumo: o círculo
igual(angulosDoLeque(5, 0), [-60, -30, 0, 30, 60], 'leque de 5 para a frente do tiro');
igual(angulosDoLeque(4, null), [0, 90, 180, 270], 'sem rumo, 4 fecham o círculo');
igual(angulosDoLeque(1, 45), [45], 'um só sai no rumo');

// saltosDoArco — o mais próximo ainda não atingido, até max, dentro do raio, sem voltar
const fila = [1, 2, 3, 4, 5].map((i) => ({ id: i, x: i * 20, y: 0 }));
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, fila, 3, 50), [1, 2, 3], 'salta em fila, para em 3');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 9, x: 80, y: 0 }], 3, 50), [], 'longe demais: nenhum salto');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 0, x: 5, y: 0 }, { id: 7, x: 10, y: 0 }], 3, 50), [7], 'a origem não leva o próprio arco');
igual(saltosDoArco({ id: 0, x: 0, y: 0 }, [{ id: 1, x: 40, y: 0 }, { id: 2, x: 30, y: 0 }], 3, 50), [2, 1], 'sempre o mais próximo de onde o raio está');

// pixelsDoRaio — inteiros, das pontas exatas, 8-conexos; com 0,5 é uma reta
const reta = pixelsDoRaio({ x: 0, y: 0 }, { x: 12, y: 0 }, () => 0.5);
igual(reta.length, 13, 'sem desvio: 13 pixels de 0 a 12');
igual(reta.every((p) => p.y === 0), true, 'sem desvio: tudo na mesma linha');
let semente = 7;
const lcg = () => ((semente = (semente * 1103515245 + 12345) % 2147483648) / 2147483648);
const zigue = pixelsDoRaio({ x: 3.4, y: 10 }, { x: 41, y: 27.6 }, lcg);
igual([zigue[0], zigue[zigue.length - 1]], [{ x: 3, y: 10 }, { x: 41, y: 28 }], 'as pontas são exatas (arredondadas)');
igual(zigue.every((p, i) => i === 0 || (Math.abs(p.x - zigue[i - 1].x) <= 1 && Math.abs(p.y - zigue[i - 1].y) <= 1)), true, 'cada pixel encosta no anterior (8-conexo)');
igual(zigue.every((p) => Number.isInteger(p.x) && Number.isInteger(p.y)), true, 'só pixels inteiros');

// contornoDoAlfa — 1px por fora, 4-vizinhança, máscara com 1px de moldura
igual([...contornoDoAlfa([255], 1, 1)], [0, 1, 0, 1, 0, 1, 0, 1, 0], 'um pixel: a cruz em volta, sem os cantos');
igual([...contornoDoAlfa([255, 255], 2, 1)], [0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0], 'dois pixels: o contorno não cobre a silhueta');
igual([...contornoDoAlfa([0], 1, 1)], [0, 0, 0, 0, 0, 0, 0, 0, 0], 'tudo transparente: sem contorno');

// DuploToque — dois toques na MESMA direção dentro da janela
const dt = new DuploToque(220);
igual(dt.apertou('direita', 1000), null, '1º toque: nada');
igual(dt.apertou('direita', 1150), 'direita', '2º toque a 150ms: dash para a direita');
igual(dt.apertou('direita', 1200), null, 'depois do dash, o próximo toque começa de novo');
igual(dt.apertou('direita', 1500), null, 'fora da janela (300ms): nada');
igual(dt.apertou('cima', 1600), null, 'direção diferente reinicia');
igual(dt.apertou('esquerda', 1650), null, '... e de novo diferente: nada');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-cartas-regras.mjs`
Expected: erro `ERR_MODULE_NOT_FOUND` (o `cartasRegras.ts` não existe).

- [ ] **Step 3: Implementar**

`src/cartasRegras.ts`:

```ts
/**
 * AS REGRAS PURAS das cartas novas (spec `2026-10-01-catalogo-cartas-design.md` §4) — sem Phaser, testadas em node
 * (`scripts/test-cartas-regras.mjs`). Quem desenha e mexe no mundo é `systems/cartas/*`; aqui mora só a conta.
 */

export interface Ponto {
  x: number;
  y: number;
}

/** EXPLOSÃO MAIOR multiplica o raio de TODA explosão do jogador (§4.1). */
export const FATOR_EXPLOSAO_MAIOR = 1.5;

export function raioDaExplosao(base: number, maior: boolean): number {
  return maior ? Math.round(base * FATOR_EXPLOSAO_MAIOR) : base;
}

/**
 * Os rumos (graus) dos estilhaços do FRAGMENTADO. Com `centro` (o rumo do tiro), um leque de `abertura` graus para a
 * frente — o impacto é direcional (§5.1c, a física dele). Sem rumo (morte, casco, flare, míssil), `n` rumos iguais
 * fechando o círculo.
 */
export function angulosDoLeque(n: number, centro: number | null, abertura = 120): number[] {
  if (centro === null) return Array.from({ length: n }, (_, i) => (i * 360) / n);
  if (n === 1) return [centro];
  return Array.from({ length: n }, (_, i) => centro - abertura / 2 + (i * abertura) / (n - 1));
}

/**
 * ARCO EM CADEIA (§4.1b): de onde o choque nasceu, salta para o mais próximo AINDA NÃO ATINGIDO dentro do `raio` — e
 * dali para o próximo, até `max` saltos. Devolve os ids na ordem dos saltos. Ninguém leva duas vezes (nem a origem).
 */
export function saltosDoArco(
  origem: Ponto & { id: number },
  candidatos: (Ponto & { id: number })[],
  max: number,
  raio: number,
): number[] {
  const usados = new Set<number>([origem.id]);
  const saltos: number[] = [];
  let de: Ponto = origem;
  while (saltos.length < max) {
    let melhor: (Ponto & { id: number }) | null = null;
    let menor = raio * raio;
    for (const c of candidatos) {
      if (usados.has(c.id)) continue;
      const d2 = (c.x - de.x) ** 2 + (c.y - de.y) ** 2;
      if (d2 > menor || (melhor && d2 === menor)) continue;
      menor = d2;
      melhor = c;
    }
    if (!melhor) break;
    usados.add(melhor.id);
    saltos.push(melhor.id);
    de = melhor;
  }
  return saltos;
}

/**
 * O RAIO do Arco em Cadeia, em PIXEL (§4.1b): zigue-zague entre `a` e `b` — um nó a cada ~`passo` px, cada nó do meio
 * deslocado até `desvio` px na perpendicular, e Bresenham entre os nós. Pontos inteiros e vizinhos (8-conexos): é
 * desenho na resolução do jogo, não linha vetorial (memória `efeito-de-cena-assado-em-pixel`) nem sprite esticada.
 * `aleatorio` devolve [0,1); 0,5 = sem desvio.
 */
export function pixelsDoRaio(a: Ponto, b: Ponto, aleatorio: () => number, passo = 6, desvio = 2): Ponto[] {
  const x0 = Math.round(a.x);
  const y0 = Math.round(a.y);
  const x1 = Math.round(b.x);
  const y1 = Math.round(b.y);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(dist / passo));
  // A perpendicular unitária: o desvio é para os LADOS do raio, nunca para a frente.
  const px = dist ? -(y1 - y0) / dist : 0;
  const py = dist ? (x1 - x0) / dist : 0;
  const nos: Ponto[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const d = i === 0 || i === n ? 0 : (aleatorio() * 2 - 1) * desvio;
    nos.push({ x: Math.round(x0 + (x1 - x0) * t + px * d), y: Math.round(y0 + (y1 - y0) * t + py * d) });
  }
  const pts: Ponto[] = [];
  for (let i = 0; i < nos.length - 1; i++) {
    for (const p of bresenham(nos[i], nos[i + 1])) {
      const u = pts[pts.length - 1];
      if (!u || u.x !== p.x || u.y !== p.y) pts.push(p);
    }
  }
  if (!pts.length) pts.push({ x: x0, y: y0 });
  return pts;
}

function bresenham(a: Ponto, b: Ponto): Ponto[] {
  const pts: Ponto[] = [];
  let x = a.x;
  let y = a.y;
  const dx = Math.abs(b.x - a.x);
  const dy = -Math.abs(b.y - a.y);
  const sx = a.x < b.x ? 1 : -1;
  const sy = a.y < b.y ? 1 : -1;
  let err = dx + dy;
  for (;;) {
    pts.push({ x, y });
    if (x === b.x && y === b.y) return pts;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

/**
 * A AURA DO CASCO (§4.3b): o contorno de 1px por FORA da silhueta. Recebe o alfa (`w×h`, um valor por pixel) e
 * devolve uma máscara `(w+2)×(h+2)` — a moldura de 1px a mais é onde cabe o contorno de quem encosta na borda do
 * quadro. Contorno = pixel transparente com um vizinho opaco em cima, embaixo ou do lado (4-vizinhança: o canto não
 * engrossa a linha).
 */
export function contornoDoAlfa(alfa: ArrayLike<number>, w: number, h: number): Uint8Array {
  const W = w + 2;
  const H = h + 2;
  const opaco = (x: number, y: number): boolean => x >= 0 && y >= 0 && x < w && y < h && alfa[y * w + x] > 0;
  const out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const sx = x - 1;
      const sy = y - 1;
      if (opaco(sx, sy)) continue;
      if (opaco(sx - 1, sy) || opaco(sx + 1, sy) || opaco(sx, sy - 1) || opaco(sx, sy + 1)) out[y * W + x] = 1;
    }
  }
  return out;
}

export type Direcao = 'cima' | 'baixo' | 'esquerda' | 'direita';

/**
 * O DUPLO TOQUE do Dash (§4.2): dois toques na MESMA direção, até `janelaMs` entre eles. Quem chama passa só a
 * DESCIDA da tecla e já descarta a repetição do sistema (tecla segurada) — "vale só se foi solta e apertada de novo".
 * Fechado o duplo toque, a contagem recomeça: um 3º toque não emenda outro dash.
 */
export class DuploToque {
  private readonly janela: number;
  private ultimo: { dir: Direcao; t: number } | null = null;

  constructor(janelaMs: number) {
    this.janela = janelaMs;
  }

  apertou(dir: Direcao, t: number): Direcao | null {
    if (this.ultimo && this.ultimo.dir === dir && t - this.ultimo.t <= this.janela) {
      this.ultimo = null;
      return dir;
    }
    this.ultimo = { dir, t };
    return null;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node scripts/test-cartas-regras.mjs`
Expected: todas as linhas `OK` e `TUDO OK`.

Run: `npm run typecheck`
Expected: sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/cartasRegras.ts scripts/test-cartas-regras.mjs
git commit -m "feat(cartas): as regras puras — raio, leque, arco, raio em pixel, contorno e duplo toque"
```

(Sem checkpoint visual: é só conta. Siga para a Task 3.)

---

### Task 3: A explosão única — Explosão Maior, Fragmentado e Em Cadeia

**Files:**
- Create: `src/systems/cartas/contexto.ts`
- Create: `src/systems/cartas/texturasProvisorias.ts`
- Create: `src/systems/cartas/ExplosaoDoJogador.ts`
- Modify: `src/systems/CartasEmJogo.ts` (reescrita inteira)
- Modify: `src/systems/WeaponSystem.ts` (`disparar`, `origem`)
- Modify: `src/scenes/GameScene.ts` (host, acertos com `origem`)
- Create: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `raioDaExplosao`, `angulosDoLeque` (Task 2).
- Produces:
  - `WeaponSystem`: `type OrigemProjetil = 'missil' | 'flare' | 'drone' | 'estilhaco'`; `interface ProjetilExtra { x; y; angulo /*graus*/; textura; velocidade; dano; origem; alcance?: number | null; homing?: HomingDef; tint?: number }`; `disparar(p: ProjetilExtra): Phaser.Physics.Arcade.Sprite | null`. Todo projétil tem `getData('origem')`: `OrigemProjetil | null` (null = tiro da nave).
  - `contexto.ts`: `type Inimigo = Phaser.Physics.Arcade.Sprite`; `type Linhagem = 'humana' | 'alien'`; `interface HostCartas`; `interface Contexto { h; tem(id); quantas(id); ferir(e, dano); incendiar(e); noRaio(x, y, raio): Inimigo[]; depois(fn) }`.
  - `ExplosaoDoJogador`: `type FonteExplosao = 'explosivo' | 'combustao' | 'reativo' | 'missil' | 'flare'`; `explodir(fonte, x, y, angulo: number | null, exceto: Inimigo | null): void`.
  - `CartasEmJogo`: `readonly explosao: ExplosaoDoJogador`; `aoAcertar(x, y, alvo, origem: OrigemProjetil | null, angulo: number /*rad*/)`; `aoAcertarChefe(x, y, origem: OrigemProjetil | null)`.
  - Texturas: `carta-estilhaco`, `carta-missil`, `carta-flare`, `carta-tiro-drone`, `carta-drone`.

- [ ] **Step 1: Escrever a sonda (falha: não há `explosao` nem estilhaço)**

`scripts/probe-cartas-novas.mjs`:

```js
// AS CARTAS NOVAS EM JOGO (spec 2026-10-01-catalogo-cartas-design.md §8): cada carta aplicada faz o que diz.
// Cada caso abre a F2 LIMPA (humana, voo livre, roteiro desligado, nave intocável), aplica as cartas e mede no próprio
// mundo. Uso: node scripts/probe-cartas-novas.mjs [dir-das-fotos]   (com `npm run dev` rodando)
import { chromium } from 'playwright';

const OUT = process.argv[2] ?? '.';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// Ajudantes NO MUNDO (sobrevivem à troca de cena: moram na página).
await page.evaluate(() => {
  window.__teste = {
    cena: () => window.__game.scene.getScene('Game'),
    dormir: (ms) => new Promise((r) => setTimeout(r, ms)),
    /** Um inimigo PARADO de `kind` em (x, y), com `hp`. */
    alvo(kind, x, y, hp) {
      const s = window.__game.scene.getScene('Game');
      s.enemies.spawn(kind, y, x);
      const kids = s.enemies.enemies.getChildren();
      const e = kids[kids.length - 1];
      e.setPosition(x, y);
      e.body.setVelocity(0, 0);
      e.setData('baseY', y);
      e.setData('hp', hp);
      return e;
    },
    /** Os projéteis ativos de uma origem de carta. */
    projeteis(origem) {
      return window.__game.scene.getScene('Game').weapons.bullets.getChildren().filter((b) => b.active && b.getData('origem') === origem);
    },
    /** Espia as explosões: devolve a lista de fontes, que cresce a cada `explodir`. */
    espiarExplosoes() {
      const ex = window.__game.scene.getScene('Game').cartas.explosao;
      const fontes = [];
      const orig = ex.explodir.bind(ex);
      ex.explodir = (f, ...resto) => {
        fontes.push(f);
        orig(f, ...resto);
      };
      return fontes;
    },
  };
});

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

/** A F2 limpa, com as cartas dadas: sem roteiro (nenhuma onda no meio da medida) e com a nave intocável. */
async function fase(cartas) {
  await page.evaluate(() => {
    const g = window.__game;
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.registry.set('cartas', []);
    g.registry.set('cartasCheckpoint', {});
    g.scene.start('Game', { stage: 2, ship: 'humana', handling: 'diegetico' });
  });
  await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas);
  await page.waitForTimeout(400);
  await page.evaluate((cartas) => {
    const s = window.__game.scene.getScene('Game');
    s.director.update = () => [];
    s.enemies.enemies.clear(true, true);
    s.invulnerableUntil = s.time.now + 1e9;
    for (const id of cartas) s.cartas.aplicar(id);
  }, cartas);
}

/** Foto do mundo em volta de (x, y) do jogo, para a folha dele. */
async function foto(nome, x, y, w = 120, h = 70) {
  const z = await page.evaluate(() => {
    const c = window.__game.canvas.getBoundingClientRect();
    return { k: c.width / 384, left: c.left, top: c.top };
  });
  await page.screenshot({ path: `${OUT}/${nome}.png`, clip: { x: z.left + (x - w / 2) * z.k, y: z.top + (y - h / 2) * z.k, width: w * z.k, height: h * z.k } });
}

// ─── OS CASOS ───

// ── A EXPLOSÃO ÚNICA (§4.1) ──
for (const [cartas, esperado, nome] of [
  [['EFF_001'], 99, 'sem Explosão Maior, o vizinho a 24px escapa (raio 18)'],
  [['EFF_001', 'EFF_002'], 98, 'com Explosão Maior, o vizinho a 24px leva o dano (raio 27)'],
]) {
  await fase(cartas);
  const hp = await page.evaluate(async () => {
    const t = window.__teste;
    const viz = t.alvo('drone', 224, 100, 99);
    t.cena().cartas.explosao.explodir('explosivo', 200, 100, 0, null);
    await t.dormir(150);
    return viz.getData('hp');
  });
  conferir(hp === esperado, nome, hp);
}

await fase(['EFF_001', 'EFF_003']);
const estilhacos = await page.evaluate(async () => {
  const t = window.__teste;
  t.cena().cartas.explosao.explodir('explosivo', 200, 100, 0, null);
  await t.dormir(60);
  return t.projeteis('estilhaco').length;
});
conferir(estilhacos >= 4 && estilhacos <= 6, 'Fragmentado solta 4–6 estilhaços', estilhacos);
await foto('fragmentado', 200, 100);

const fontes = await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  const fontes = t.espiarExplosoes();
  const e = t.alvo('drone', 250, 120, 99);
  s.cartas.aoAcertar(250, 120, e, 'estilhaco', 0);
  s.cartas.aoAcertar(250, 120, e, null, 0);
  return fontes;
});
conferir(JSON.stringify(fontes) === '["explosivo"]', 'o estilhaço não explode; o tiro da nave com Explosivo explode', fontes);

await fase(['EFF_004', 'EFF_006', 'EFF_007', 'EFF_001']);
const queima = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('drone', 210, 100, 99);
  s.cartas.explosao.explodir('explosivo', 200, 100, 0, null);
  await t.dormir(100);
  return (e.getData('queimaAte') ?? 0) > s.time.now;
});
conferir(queima, 'Em Cadeia: quem está no raio da explosão pega fogo', queima);

// ─── FIM ───

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run (com `npm run dev` rodando): `mkdir -p docs/superpowers/folhas/2026-10-02/cartas-novas && node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas`
Expected: `FALHA` nos casos (erro de página `Cannot read properties of undefined (reading 'explodir')`).

- [ ] **Step 3: O projétil de carta no pool da nave**

Em `src/systems/WeaponSystem.ts`, logo depois da interface `HomingDef`, acrescente:

```ts
/**
 * QUEM soltou o projétil, quando não foi o gatilho da nave (o catálogo de cartas, 01/10). `null` = tiro da nave.
 * A cena lê no acerto: o tiro da nave dispara os efeitos de carta (Explosivo, Incendiário, Elétrico); o míssil e o
 * flare explodem; o tiro do drone e o estilhaço só fazem o dano — o estilhaço NÃO explode de novo (sem recursão).
 */
export type OrigemProjetil = 'missil' | 'flare' | 'drone' | 'estilhaco';

/** Um projétil de CARTA. Sai do MESMO pool da nave: acerta inimigo, chefão, golfinho e rocha pelos overlaps de sempre. */
export interface ProjetilExtra {
  x: number;
  y: number;
  /** Graus; 0 = para a direita. */
  angulo: number;
  textura: string;
  velocidade: number;
  dano: number;
  origem: OrigemProjetil;
  /** Alcance em px; ausente = infinito. */
  alcance?: number | null;
  homing?: HomingDef;
  tint?: number;
}
```

Em `shoot()`, logo depois de `b.setData('damage', damage);`, acrescente:

```ts
      // O pool é um só: um slot que foi míssil de carta tem que voltar a ser tiro da NAVE.
      b.setData('origem', null);
```

E acrescente o método público, logo antes de `release(b)`:

```ts
  /**
   * Um projétil de CARTA (míssil, flare, tiro do drone, estilhaço). Não passa por cadência, munição nem calor: quem
   * decide quando sai é a carta. Tudo o que o `shoot()` seta por disparo é setado aqui também — o pool é um só.
   */
  disparar(p: ProjetilExtra): Phaser.Physics.Arcade.Sprite | null {
    const b = this.bullets.get(p.x, p.y) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) {
      if (import.meta.env.DEV) console.warn('[armas] pool cheio, projétil de carta descartado');
      return null;
    }
    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    b.anims.stop();
    b.setTexture(p.textura);
    b.setScale(1);
    if (p.tint !== undefined) b.setTint(p.tint);
    else b.clearTint();
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setAlpha(1);
    b.setData('glow', false);
    b.setData('glowKind', null);
    // O piso de 3px do traçante vale aqui: o tiro do drone é 6×1 e atravessaria inimigo sem tocar.
    b.body!.setSize(Math.max(b.width, 3), Math.max(b.height, 3));
    b.setData('damage', p.dano);
    b.setData('pierce', false);
    b.setData('hits', null);
    b.setData('ox', p.x);
    b.setData('oy', p.y);
    b.setData('range', p.alcance ?? null);
    b.setData('homing', p.homing);
    b.setData('speed', p.velocidade);
    b.setData('origem', p.origem);
    const rad = Phaser.Math.DegToRad(p.angulo);
    b.setVelocity(Math.cos(rad) * p.velocidade, Math.sin(rad) * p.velocidade);
    b.setRotation(rad);
    return b;
  }
```

- [ ] **Step 4: O contexto dos subsistemas**

`src/systems/cartas/contexto.ts`:

```ts
import type Phaser from 'phaser';
import type { Fx } from '../Fx';
import type { WeaponSystem } from '../WeaponSystem';

export type Inimigo = Phaser.Physics.Arcade.Sprite;
/** A linhagem da nave: o tiro do drone (e, depois, a arte das peças) segue ela (spec §4.3). */
export type Linhagem = 'humana' | 'alien';

/** O que a `GameScene` entrega às cartas. As cartas nunca tocam a cena por outro caminho. */
export interface HostCartas {
  scene: Phaser.Scene;
  fx: Fx;
  weapons: WeaponSystem;
  inimigos: () => Inimigo[];
  /** Os tiros inimigos em voo — o drone desvia deles. */
  tirosInimigos: () => Phaser.Physics.Arcade.Sprite[];
  nave: () => Phaser.Physics.Arcade.Sprite;
  matar: (e: Inimigo) => void;
  baseDaNave: string;
  fase: number;
  linhagem: Linhagem;
  ganharVida: () => void;
  ganharBomba: () => void;
}

/** O que cada subsistema de `systems/cartas/` recebe de `CartasEmJogo`. */
export interface Contexto {
  h: HostCartas;
  tem: (id: string) => boolean;
  quantas: (id: string) => number;
  /** Tira vida; zerou, mata pelo caminho único da cena (`matarInimigo`). */
  ferir: (e: Inimigo, dano: number) => void;
  incendiar: (e: Inimigo) => void;
  /** Os inimigos VIVOS a até `raio` px de (x, y) — uma cópia, pode matar no meio do laço. */
  noRaio: (x: number, y: number, raio: number) => Inimigo[];
  /**
   * Adia para o próximo quadro. ⚠️ Morte acontece DENTRO do laço de colisão, e matar vizinhos ali mexe no grupo que o
   * Arcade ainda está percorrendo — todo dano em área passa por aqui.
   */
  depois: (fn: () => void) => void;
}
```

- [ ] **Step 5: As formas provisórias**

`src/systems/cartas/texturasProvisorias.ts`:

```ts
import type Phaser from 'phaser';

/**
 * A ARTE PROVISÓRIA das cartas novas (spec §6.2): formas simples para ele JOGAR e sentir a mecânica. A arte aprovada
 * (drones, mísseis 16×5, tiros 6×1, estilhaço D, explosões) entra no lugar destas num plano próprio — com as MESMAS
 * chaves de textura, para nada mais mudar.
 */
export function criarTexturasProvisorias(scene: Phaser.Scene): void {
  const fazer = (chave: string, w: number, h: number, desenhar: (g: Phaser.GameObjects.Graphics) => void): void => {
    if (scene.textures.exists(chave)) return;
    const g = scene.make.graphics({}, false);
    desenhar(g);
    g.generateTexture(chave, w, h);
    g.destroy();
  };
  fazer('carta-estilhaco', 2, 2, (g) => g.fillStyle(0xffb040).fillRect(0, 0, 2, 2));
  fazer('carta-missil', 7, 3, (g) => g.fillStyle(0x8a93a6).fillRect(0, 0, 6, 3).fillStyle(0xff6a20).fillRect(6, 1, 1, 1));
  fazer('carta-flare', 3, 3, (g) => g.fillStyle(0xff3a2a).fillRect(0, 0, 3, 3).fillStyle(0xffe0a0).fillRect(1, 1, 1, 1));
  // Branco: o tiro do drone é TINGIDO na cor da linhagem.
  fazer('carta-tiro-drone', 6, 1, (g) => g.fillStyle(0xffffff).fillRect(0, 0, 6, 1));
  fazer('carta-drone', 5, 5, (g) => g.fillStyle(0x5a6270).fillCircle(2.5, 2.5, 2.5).fillStyle(0x3ee0f0).fillRect(2, 2, 1, 1));
}
```

- [ ] **Step 6: A explosão única**

`src/systems/cartas/ExplosaoDoJogador.ts`:

```ts
import { angulosDoLeque, raioDaExplosao } from '../../cartasRegras';
import type { Contexto, Inimigo } from './contexto';

export type FonteExplosao = 'explosivo' | 'combustao' | 'reativo' | 'missil' | 'flare';

/** Raio (px do mundo), dano e o tamanho do `Fx.explode` de cada fonte — PROVISÓRIOS (calibragem). */
const EXPLOSAO: Record<FonteExplosao, { raio: number; dano: number; visual: number }> = {
  explosivo: { raio: 18, dano: 1, visual: 0.45 },
  combustao: { raio: 26, dano: 2, visual: 0.9 },
  reativo: { raio: 40, dano: 3, visual: 1.2 },
  missil: { raio: 20, dano: 1, visual: 0.6 },
  flare: { raio: 22, dano: 2, visual: 0.6 },
};
const VISUAL_MAIOR = 1.3;
const ESTILHACOS = { n: 5, velocidade: 150, alcance: 36, dano: 1 };

/**
 * A EXPLOSÃO DO JOGADOR É UM SISTEMA (§4.1). Explosivo, Combustão, Casco Reativo, Flare e Míssil chamam a MESMA
 * função, e nela se penduram as cartas de explosão — assim as cadeias se cruzam (o Míssil com Fragmentado, o Flare com
 * Em Cadeia) sem carta nova:
 * - EXPLOSÃO MAIOR → multiplica o raio;
 * - FRAGMENTADO → solta os estilhaços (projéteis comuns: NÃO explodem de novo);
 * - EM CADEIA → incendeia quem está no raio (incendeia, não explode: quem explode é a Combustão, quando o queimado
 *   morre).
 */
export class ExplosaoDoJogador {
  constructor(private readonly c: Contexto) {}

  /**
   * `angulo` (graus) é o rumo do tiro que causou a explosão: os estilhaços saem em leque para a frente dele. `null` =
   * sem rumo (morte, casco, flare, míssil), e o leque fecha o círculo. `exceto` é quem já levou o dano do projétil.
   */
  explodir(fonte: FonteExplosao, x: number, y: number, angulo: number | null, exceto: Inimigo | null): void {
    const base = EXPLOSAO[fonte];
    const maior = this.c.tem('EFF_002');
    const raio = raioDaExplosao(base.raio, maior);
    this.c.h.fx.explode(x, y, base.visual * (maior ? VISUAL_MAIOR : 1));
    this.c.depois(() => {
      for (const e of this.c.noRaio(x, y, raio)) {
        // EM CADEIA incendeia TODO mundo no raio — inclusive quem levou o tiro.
        if (this.c.tem('EFF_007')) this.c.incendiar(e);
        if (e !== exceto) this.c.ferir(e, base.dano);
      }
      if (this.c.tem('EFF_003')) this.estilhacos(x, y, angulo);
    });
  }

  private estilhacos(x: number, y: number, angulo: number | null): void {
    for (const a of angulosDoLeque(ESTILHACOS.n, angulo)) {
      this.c.h.weapons.disparar({
        x,
        y,
        angulo: a,
        textura: 'carta-estilhaco',
        velocidade: ESTILHACOS.velocidade,
        dano: ESTILHACOS.dano,
        alcance: ESTILHACOS.alcance,
        origem: 'estilhaco',
      });
    }
  }
}
```

- [ ] **Step 7: `CartasEmJogo` sobre a explosão única**

Substitua `src/systems/CartasEmJogo.ts` inteiro por:

```ts
import Phaser from 'phaser';
import { COLORS } from '../config';
import type { OrigemProjetil } from './WeaponSystem';
import { CARTAS, adicionar, montarArma, quantas, sortear, tem, type Mesa } from '../cartas';
import type { Contexto, HostCartas, Inimigo } from './cartas/contexto';
import { ExplosaoDoJogador } from './cartas/ExplosaoDoJogador';
import { criarTexturasProvisorias } from './cartas/texturasProvisorias';

export type { HostCartas } from './cartas/contexto';

/**
 * AS CARTAS DENTRO DA FASE (feat/cartas-preview; o catálogo de 24 é de 01/10 — spec `2026-10-01-catalogo-cartas`).
 *
 * A `GameScene` só chama os GANCHOS (acerto, morte, dano, tick); tudo o que as cartas fazem em jogo mora aqui e nos
 * subsistemas de `systems/cartas/`, que recebem um `Contexto` comum:
 * - as MESAS no meio da fase (quando abrir, pausar a fase, aplicar a escolha);
 * - a EXPLOSÃO ÚNICA (`ExplosaoDoJogador`): Explosivo, Combustão, Casco Reativo, Flare e Míssil chamam a mesma;
 * - INCENDIÁRIO (no acerto) e a queima;
 * - o CASCO, a RECARGA e o CASCO REATIVO (no dano à nave);
 * - os PROPULSORES (no teto de velocidade do voo livre).
 *
 * As cartas de ARMAMENTO de número (Duplo, Triplo, Cadência, Perfurante, Pesado) não passam por aqui depois de
 * escolhidas: viram a `WeaponDef` montada (`montarArma`), e a arma não sabe que existe carta. Míssil e Drone, que são
 * lançadores PRÓPRIOS, passam — e não copiam Duplo, Triplo nem Cadência da nave (spec §4.3).
 */

/** Onde cada fase abre a mesa do MEIO (segundos do roteiro): o silêncio antes do chefão. */
const MESA_NO_TEMPO: Record<number, number> = { 1: 63, 2: 70 };

/** Segundos até o Casco voltar: sem Recarga · com Recarga (máx. 1 — com 2 chegava a 3,5s, quase invulnerável; §4.4). */
const CASCO_RECARGA = [8, 5.5];
const VELOCIDADE_LIVRE = 110;
const QUEIMA_MS = 2000;
const COR_QUEIMANDO = 0xff9a50;

export class CartasEmJogo {
  readonly explosao: ExplosaoDoJogador;
  private readonly c: Contexto;
  private readonly abertas = new Set<string>();
  private cascoPronto = false;
  private cascoVoltaEm = 0;
  private queimaTick = 0;

  // ⚠️ O CASCO NÃO TEM DESENHO EM VOLTA DA NAVE (28/09). Era uma elipse ciano de 30px, do tamanho das naves antigas:
  // nas de 44px ela sumia atrás do casco e só o arco de cima aparecia, sobre a barbatana — lia como um "feixe de luz"
  // saindo da nave. O estado mora na HUD (`cascoAtivo`) e a nave pisca ciano quando ele volta.
  constructor(private readonly h: HostCartas) {
    criarTexturasProvisorias(h.scene);
    this.c = {
      h,
      tem: (id) => tem(this.reg, id),
      quantas: (id) => quantas(this.reg, id),
      ferir: (e, dano) => this.ferir(e, dano),
      incendiar: (e) => this.incendiar(e),
      noRaio: (x, y, raio) =>
        h.inimigos().filter((e) => e.active && Phaser.Math.Distance.Between(x, y, e.x, e.y) <= raio),
      depois: (fn) => {
        h.scene.time.delayedCall(0, fn);
      },
    };
    this.explosao = new ExplosaoDoJogador(this.c);
    this.cascoPronto = tem(this.reg, 'DEF_001');
  }

  /** O Casco está pronto para absorver o próximo golpe? (a HUD mostra) */
  get cascoAtivo(): boolean {
    return this.cascoPronto;
  }

  /** O aviso de que o Casco voltou: a nave pisca ciano, rápido. */
  private piscarCasco(): void {
    const nave = this.h.nave();
    nave.setTint(COLORS.playerBright);
    this.h.scene.time.delayedCall(120, () => nave.active && nave.clearTint());
  }

  private get reg(): Phaser.Data.DataManager {
    return this.h.scene.registry;
  }

  /** A arma da nave com as cartas de armamento já aplicadas. */
  arma(): string {
    return montarArma(this.reg, this.h.baseDaNave);
  }

  /** Vidas extras da mão, para a vida inicial da fase. */
  vidasExtras(): number {
    return quantas(this.reg, 'DEF_003');
  }

  // ─── A MESA ───────────────────────────────────────────────────────────────────────────────────

  /**
   * Abre uma mesa de 3 cartas e PAUSA a fase. `chave` impede a mesma mesa de abrir duas vezes (a aranha morre uma
   * vez, mas o relógio passa pelo mesmo segundo em vários quadros).
   */
  abrirMesa(chave: string, titulo: string, mesa: Partial<Mesa> = {}): void {
    if (this.abertas.has(chave)) return;
    this.abertas.add(chave);
    const opcoes = sortear(this.reg, { fase: this.h.fase, ...mesa });
    if (!opcoes.length) return;

    const s = this.h.scene;
    s.scene.pause();
    s.scene.launch('Cartas', {
      opcoes,
      titulo,
      onEscolha: (id: string) => {
        this.aplicar(id);
        // ⚠️ SOLTA AS TECLAS: a fase pausada não viu o keyup de quem soltou a seta durante a escolha, e a nave
        // voltaria andando sozinha.
        s.input.keyboard?.resetKeys();
        s.scene.resume();
      },
    });
  }

  aplicar(id: string): void {
    adicionar(this.reg, id);
    const c = CARTAS[id];
    if (c.categoria === 'arma') this.h.weapons.setBase(this.arma());
    if (id === 'DEF_003') this.h.ganharVida();
    if (id === 'DEF_001') {
      this.cascoPronto = true;
      this.piscarCasco();
    }
  }

  // ─── GANCHOS ──────────────────────────────────────────────────────────────────────────────────

  tick(time: number, dt: number, elapsed: number, livre: boolean, body: Phaser.Physics.Arcade.Body): void {
    const t = MESA_NO_TEMPO[this.h.fase];
    if (t !== undefined && elapsed >= t) this.abrirMesa('meio', 'SUPRIMENTO ENCONTRADO');

    // O CASCO: volta sozinho depois da recarga.
    if (tem(this.reg, 'DEF_001') && !this.cascoPronto && time >= this.cascoVoltaEm) {
      this.cascoPronto = true;
      this.piscarCasco();
    }

    // PROPULSORES: só no voo livre (a F1 é impulso, e a carta nem aparece nela).
    const prop = quantas(this.reg, 'MOV_001');
    if (livre && prop) body.setMaxVelocity(VELOCIDADE_LIVRE * (1 + 0.12 * prop));

    // A QUEIMA: 1 de dano a cada 0.4s enquanto durar.
    this.queimaTick -= dt;
    if (this.queimaTick <= 0) {
      this.queimaTick = 0.4;
      for (const e of this.h.inimigos()) {
        const ate = e.getData('queimaAte') as number | undefined;
        if (!e.active || !ate) continue;
        if (time > ate) {
          e.setData('queimaAte', 0);
          e.setTint(e.getData('tint') as number);
          continue;
        }
        this.h.fx.hit(e.x + Phaser.Math.Between(-4, 4), e.y + Phaser.Math.Between(-4, 4));
        this.ferir(e, 1);
      }
    }
  }

  /**
   * Um projétil acertou um inimigo (depois do dano normal). `origem` diz quem soltou (`null` = o gatilho da nave) e
   * `angulo` (rad) é o rumo do projétil — a explosão do tiro é direcional (§5.1c).
   */
  aoAcertar(x: number, y: number, alvo: Inimigo, origem: OrigemProjetil | null, angulo: number): void {
    if (origem === 'missil' || origem === 'flare') {
      this.explosao.explodir(origem, x, y, null, alvo);
      return;
    }
    // O tiro do drone e o estilhaço só fazem o dano deles (o drone não copia as cartas da nave; o estilhaço não
    // explode de novo).
    if (origem) return;
    if (tem(this.reg, 'EFF_004') && alvo.active && Math.random() < 0.25) this.incendiar(alvo);
    if (tem(this.reg, 'EFF_001')) this.explosao.explodir('explosivo', x, y, Phaser.Math.RadToDeg(angulo), alvo);
  }

  /** Um projétil de carta acertou o CHEFÃO ou o golfinho: o míssil e o flare explodem ali também. */
  aoAcertarChefe(x: number, y: number, origem: OrigemProjetil | null): void {
    if (origem === 'missil' || origem === 'flare') this.explosao.explodir(origem, x, y, null, null);
  }

  /** Um inimigo morreu. */
  aoMorrer(e: Inimigo): void {
    const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > this.h.scene.time.now;
    if (queimando && tem(this.reg, 'EFF_006')) this.explosao.explodir('combustao', e.x, e.y, null, e);
    if (e.getData('kind') === 'aranha') {
      this.h.scene.time.delayedCall(250, () => this.abrirMesa('aranha', 'DESTROÇOS DA ARANHA', { garante: 'incomum' }));
    }
  }

  /** O golfinho (o guardião da F4) morreu. */
  aoMorrerGuardiao(): void {
    this.h.scene.time.delayedCall(400, () => this.abrirMesa('guardiao', 'O NÚCLEO DO GUARDIÃO', { garante: 'rara' }));
  }

  /**
   * A nave ia tomar dano. Devolve `true` se o CASCO absorveu (a vida fica intacta).
   */
  absorver(time: number): boolean {
    if (!this.cascoPronto) return false;
    this.cascoPronto = false;
    this.cascoVoltaEm = time + CASCO_RECARGA[Math.min(quantas(this.reg, 'DEF_002'), 1)] * 1000;
    const n = this.h.nave();
    this.h.fx.hit(n.x, n.y);
    this.h.scene.cameras.main.flash(70, 62, 224, 240);
    if (tem(this.reg, 'DEF_004')) this.explosao.explodir('reativo', n.x, n.y, null, null);
    return true;
  }

  // ─── O DANO DAS CARTAS ────────────────────────────────────────────────────────────────────────

  private incendiar(e: Inimigo): void {
    if (!e.active) return;
    e.setData('queimaAte', this.h.scene.time.now + QUEIMA_MS);
    e.setTint(COR_QUEIMANDO);
  }

  private ferir(e: Inimigo, dano: number): void {
    if (!e.active) return;
    const hp = (e.getData('hp') as number) - dano;
    e.setData('hp', hp);
    if (hp <= 0) this.h.matar(e);
  }
}
```

- [ ] **Step 8: A `GameScene` entrega o host novo e a origem dos acertos**

Em `src/scenes/GameScene.ts`:

1. Junto dos outros imports do topo, acrescente `import type { OrigemProjetil } from '../systems/WeaponSystem';`
   (se já houver um import desse arquivo, some `type OrigemProjetil` à lista dele em vez de duplicar a linha).
2. Na criação de `this.cartas = new CartasEmJogo({ ... })`, deixe o objeto assim:

```ts
    this.cartas = new CartasEmJogo({
      scene: this,
      fx: this.fx,
      weapons: this.weapons,
      inimigos: () => this.enemies.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[],
      tirosInimigos: () => this.enemies.enemyBullets.getChildren() as Phaser.Physics.Arcade.Sprite[],
      nave: () => this.ship,
      matar: (e) => this.matarInimigo(e),
      baseDaNave: nave.weapon,
      fase: this.stage.id,
      linhagem: this.shipId === 'alienigena' ? 'alien' : 'humana',
      ganharVida: () => this.lives++,
      ganharBomba: () => this.bombs++,
    });
```

3. Em `bulletHitEnemy`, logo depois da primeira linha (`if (!bullet.active || !enemy.active) return;`), acrescente:

```ts
    // Quem soltou e para onde ia: lido ANTES de o projétil voltar ao pool.
    const origem = bullet.getData('origem') as OrigemProjetil | null;
    const angulo = bullet.rotation;
```

e troque as duas chamadas `this.cartas.aoAcertar(bx, by, enemy);` por `this.cartas.aoAcertar(bx, by, enemy, origem, angulo);`.

4. Em `bulletHitBoss`, troque o corpo depois das guardas por:

```ts
    const origem = bullet.getData('origem') as OrigemProjetil | null;
    this.weapons.release(bullet);
    this.fx.hit(bullet.x, bullet.y);
    this.cartas.aoAcertarChefe(bullet.x, bullet.y, origem);

    if (this.boss.damage(bullet.getData('damage') as number)) this.killBoss();
```

5. Em `bulletHitGolfinho`, troque o corpo depois das guardas por:

```ts
    const origem = bullet.getData('origem') as OrigemProjetil | null;
    this.weapons.release(bullet);
    // A fagulha sai mesmo no PISO: o jogador vê que acertou, e só a barra para.
    this.fx.hit(bullet.x, bullet.y);
    this.cartas.aoAcertarChefe(bullet.x, bullet.y, origem);
    if (g.damage(bullet.getData('damage') as number)) this.matarGolfinho();
```

- [ ] **Step 9: Typecheck, testes e a sonda**

Run: `npm run typecheck`
Expected: sem erros.

Run: `node scripts/test-cartas-regras.mjs && node scripts/test-catalogo-cartas.mjs`
Expected: `TUDO OK` nos dois.

Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas`
Expected: 5 linhas `OK` (Explosão Maior ×2, Fragmentado, estilhaço não explode, Em Cadeia), `nenhum erro no console`,
`TUDO OK`, e `cartas-novas/fragmentado.png`.

Run: `node scripts/probe-cartas.mjs docs/superpowers/folhas/2026-10-02`
Expected: o JSON com `erros: []`, `arma: "naveMontada"`, `bocas: 3` (o Triplo + Explosivo + Casco de sempre).

- [ ] **Step 10: Commit**

```bash
git add src/systems/cartas src/systems/CartasEmJogo.ts src/systems/WeaponSystem.ts src/scenes/GameScene.ts scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas
git commit -m "feat(cartas): a explosão única — Explosão Maior, Fragmentado e Em Cadeia"
```

- [ ] **Step 11: Checkpoint** — ele joga a F2 com Explosivo + Explosão Maior + Fragmentado (a mesa de teste do dev,
tecla C, ou `__game.scene.getScene('Game').cartas.aplicar('EFF_002')` no console) e vê a `fragmentado.png`.

---

### Task 4: Míssil Guiado e Flare

**Files:**
- Create: `src/systems/cartas/Lancadores.ts`
- Modify: `src/systems/CartasEmJogo.ts`
- Modify: `src/scenes/GameScene.ts` (`homingTargets`)
- Modify: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `WeaponSystem.disparar`, `ExplosaoDoJogador.explodir`, `Contexto` (Task 3).
- Produces: `class Lancadores { constructor(c: Contexto, explosao: ExplosaoDoJogador); tick(dt: number): void }`;
  `CartasEmJogo.lancadores`; `CartasEmJogo.temGuiado: boolean` (getter; Míssil OU Drone na mão).

- [ ] **Step 1: Os casos na sonda (falham)**

Em `scripts/probe-cartas-novas.mjs`, logo ANTES da linha `// ─── FIM ───`, acrescente:

```js
// ── MÍSSIL GUIADO (WPN_009) ──
await fase(['WPN_009']);
const missil = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('drone', s.ship.x + 140, s.ship.y - 30, 99);
  let visto = 0;
  for (let i = 0; i < 50 && e.getData('hp') === 99; i++) {
    visto = Math.max(visto, t.projeteis('missil').length);
    await t.dormir(100);
  }
  return { visto, hp: e.getData('hp') };
});
conferir(missil.visto >= 1 && missil.hp < 99, 'o míssil sai, persegue e acerta', missil);

// ── FLARE (EFF_010) ──
await fase(['EFF_010']);
const flare = await page.evaluate(async () => {
  const t = window.__teste;
  const fontes = t.espiarExplosoes();
  let solto = false;
  for (let i = 0; i < 90 && !fontes.includes('flare'); i++) {
    solto ||= t.projeteis('flare').length > 0;
    await t.dormir(100);
  }
  return { solto, fontes };
});
conferir(flare.solto && flare.fontes.includes('flare'), 'o flare sai para trás e explode sozinho', flare);

await fase(['EFF_010']);
const toque = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const fontes = t.espiarExplosoes();
  const e = t.alvo('drone', s.ship.x - 30, s.ship.y, 99);
  for (let i = 0; i < 60 && !fontes.includes('flare'); i++) await t.dormir(100);
  return { fontes, hp: e.getData('hp') };
});
conferir(toque.fontes.includes('flare') && toque.hp < 99, 'o flare explode no inimigo que toca', toque);
```

Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas`
Expected: as 3 linhas novas em `FALHA` (nada lança míssil nem flare); as da Task 3 continuam `OK`.

- [ ] **Step 2: Os lançadores**

`src/systems/cartas/Lancadores.ts`:

```ts
import type Phaser from 'phaser';
import type { Contexto } from './contexto';
import type { ExplosaoDoJogador } from './ExplosaoDoJogador';

/** PROVISÓRIOS (calibragem). O míssil é forte e raro; o tiro leve e constante é do drone (spec §4.3). */
const MISSIL = { esperaMs: 3000, velocidade: 140, dano: 2, homing: { turn: 200, range: 260 } };
/** O flare sai para trás a 60px/s e FREIA (×0,1 por segundo) até parar: fica na rota de quem persegue. */
const FLARE = { esperaMs: 4000, velocidade: 60, freio: 0.1, vidaMs: 3000, dano: 1 };

/**
 * MÍSSIL GUIADO e FLARE — os lançadores que não são o gatilho da nave. Os dois soltam projéteis pelo pool da nave
 * (`WeaponSystem.disparar`) e EXPLODEM pela explosão única: o míssil ao acertar, o flare ao tocar alguém ou, se ninguém
 * tocar, sozinho depois de ~3s (armadilha para quem persegue, bomba de retaguarda para quem escapou).
 */
export class Lancadores {
  private proximoMissil = 0;
  private proximoFlare = 0;
  private serie = 0;
  private readonly flares: { b: Phaser.Physics.Arcade.Sprite; id: number; explodeEm: number }[] = [];

  constructor(
    private readonly c: Contexto,
    private readonly explosao: ExplosaoDoJogador,
  ) {}

  tick(dt: number): void {
    const agora = this.c.h.scene.time.now;
    const n = this.c.h.nave();

    const misseis = this.c.quantas('WPN_009');
    if (misseis) {
      if (!this.proximoMissil) this.proximoMissil = agora + MISSIL.esperaMs;
      else if (agora >= this.proximoMissil) {
        this.proximoMissil = agora + MISSIL.esperaMs;
        // MÁX. 2: a 2ª cópia é um 2º míssil na MESMA salva, um pouco abaixo.
        for (let i = 0; i < misseis; i++) {
          this.c.h.weapons.disparar({
            x: n.x + 6,
            y: n.y + (i === 0 ? -4 : 4),
            angulo: 0,
            textura: 'carta-missil',
            velocidade: MISSIL.velocidade,
            dano: MISSIL.dano,
            origem: 'missil',
            homing: MISSIL.homing,
          });
        }
      }
    }

    if (this.c.tem('EFF_010')) {
      if (!this.proximoFlare) this.proximoFlare = agora + FLARE.esperaMs;
      else if (agora >= this.proximoFlare) {
        this.proximoFlare = agora + FLARE.esperaMs;
        this.soltarFlare(n.x - 12, n.y, agora);
      }
    }
    this.tickFlares(dt, agora);
  }

  private soltarFlare(x: number, y: number, agora: number): void {
    const b = this.c.h.weapons.disparar({
      x,
      y,
      angulo: 180,
      textura: 'carta-flare',
      velocidade: FLARE.velocidade,
      dano: FLARE.dano,
      origem: 'flare',
    });
    if (!b) return;
    const id = ++this.serie;
    b.setData('flare', id);
    this.flares.push({ b, id, explodeEm: agora + FLARE.vidaMs });
  }

  private tickFlares(dt: number, agora: number): void {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      // O slot pode ter sido reciclado (o flare tocou alguém e voltou ao pool): o id confere que ainda é ESTE flare.
      const vivo = f.b.active && f.b.getData('origem') === 'flare' && f.b.getData('flare') === f.id;
      if (!vivo) {
        this.flares.splice(i, 1);
        continue;
      }
      const body = f.b.body as Phaser.Physics.Arcade.Body;
      body.velocity.x *= Math.pow(FLARE.freio, dt);
      if (agora < f.explodeEm) continue;
      this.flares.splice(i, 1);
      const { x, y } = f.b;
      this.c.h.weapons.release(f.b);
      this.explosao.explodir('flare', x, y, null, null);
    }
  }
}
```

- [ ] **Step 3: Ligar os lançadores em `CartasEmJogo`**

Em `src/systems/CartasEmJogo.ts`:

1. Acrescente o import: `import { Lancadores } from './cartas/Lancadores';`
2. Logo abaixo de `readonly explosao: ExplosaoDoJogador;`, acrescente `readonly lancadores: Lancadores;`
3. No construtor, logo depois de `this.explosao = new ExplosaoDoJogador(this.c);`, acrescente
   `this.lancadores = new Lancadores(this.c, this.explosao);`
4. Logo depois do getter `cascoAtivo`, acrescente:

```ts
  /**
   * Há projétil GUIADO de carta na mão (Míssil ou Drone)? A cena só monta a lista de alvos da perseguição quando
   * alguém persegue (`GameScene.homingTargets`) — sem isto o míssil voaria reto.
   */
  get temGuiado(): boolean {
    return tem(this.reg, 'WPN_009') || tem(this.reg, 'WPN_010');
  }
```

5. No fim de `tick(...)`, depois do bloco da queima, acrescente:

```ts
    this.lancadores.tick(dt);
```

- [ ] **Step 4: A cena entrega alvos ao míssil**

Em `src/scenes/GameScene.ts`, em `homingTargets()`, troque `if (!this.weapons.current.homing) return [];` por:

```ts
    if (!this.weapons.current.homing && !this.cartas.temGuiado) return [];
```

- [ ] **Step 5: Typecheck e sonda**

Run: `npm run typecheck`
Expected: sem erros.

Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas`
Expected: todas `OK` (Task 3 + míssil + flare ×2), `TUDO OK`.

- [ ] **Step 6: Commit**

```bash
git add src/systems/cartas/Lancadores.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts scripts/probe-cartas-novas.mjs
git commit -m "feat(cartas): Míssil Guiado e Flare pela explosão única"
```

- [ ] **Step 7: Checkpoint** — ele joga a F2 com Míssil (×2) + Flare + Fragmentado e diz o que sentiu (frequência,
força, se o flare atrás "pega" quem persegue).

---

### Task 5: O Drone Auxiliar

**Files:**
- Create: `src/systems/cartas/DroneAuxiliar.ts`
- Modify: `src/systems/CartasEmJogo.ts`
- Modify: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `Contexto` (com `h.tirosInimigos`, `h.linhagem`), `WeaponSystem.disparar` (Task 3); `temGuiado` (Task 4,
  já inclui `WPN_010`).
- Produces: `class DroneAuxiliar { sprite: Phaser.GameObjects.Image | null; constructor(c: Contexto); tick(dt: number): void }`;
  `CartasEmJogo.drone`.

- [ ] **Step 1: Os casos na sonda (falham)**

Antes de `// ─── FIM ───`:

```js
// ── DRONE AUXILIAR (WPN_010) — e ele NÃO copia Triplo nem Cadência da nave ──
await fase(['WPN_010', 'WPN_002', 'WPN_004', 'WPN_004']);
const drone = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  await t.dormir(800);
  const d = s.cartas.drone.sprite;
  const dist = d ? Math.hypot(d.x - s.ship.x, d.y - s.ship.y) : null;
  const tiros = [];
  const orig = s.weapons.disparar.bind(s.weapons);
  s.weapons.disparar = (p) => {
    if (p.origem === 'drone') tiros.push(p.angulo);
    return orig(p);
  };
  const e = t.alvo('drone', s.ship.x + 110, s.ship.y - 12, 99);
  await t.dormir(2600);
  return { existe: !!d, dist, tiros: tiros.length, hp: e.getData('hp') };
});
conferir(drone.existe && drone.dist < 30, 'o drone acompanha a nave de perto', drone);
conferir(drone.tiros >= 1 && drone.tiros <= 3 && drone.hp < 99, 'o drone atira guiado, devagar, um tiro por vez, e acerta', drone);

const desvio = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  s.enemies.enemies.clear(true, true);
  const d = s.cartas.drone.sprite;
  const e = t.alvo('drone', d.x + 8, d.y, 99);
  await t.dormir(400);
  return Math.hypot(d.x - e.x, d.y - e.y);
});
conferir(desvio > 14, 'o drone se afasta de um inimigo encostado', desvio);
// A foto: o drone atirando num alvo à frente. (O evaluate devolve só números — um sprite não se serializa.)
const fd = await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  t.alvo('drone', s.ship.x + 90, s.ship.y, 99);
  return { x: s.ship.x + 30, y: s.ship.y };
});
await page.waitForTimeout(700);
await foto('drone', fd.x, fd.y, 140, 70);
```

Run a sonda. Expected: os 3 casos do drone em `FALHA` (`s.cartas.drone` não existe).

- [ ] **Step 2: O drone**

`src/systems/cartas/DroneAuxiliar.ts`:

```ts
import type Phaser from 'phaser';
import type { Contexto, Inimigo } from './contexto';

/** PROVISÓRIOS (calibragem). Posição de descanso: atrás e acima da nave. */
const DRONE = {
  dx: -14,
  dy: -12,
  /** Quanto puxa de volta para o descanso (por segundo): o "atraso curto" da spec. */
  mola: 6,
  raioDesvio: 24,
  forcaDesvio: 400,
  /** Passou disto da nave, o desvio desliga e a mola traz de volta. */
  longe: 60,
  esperaS: 1.2,
  alcance: 160,
  velocidade: 170,
  dano: 1,
  homing: { turn: 180, range: 160 },
};
const COR_TIRO = { humana: 0xffa040, alien: 0x5ef2d8 };

/**
 * O DRONE AUXILIAR (spec §4.3 e §5.1c): discreto, segue a nave com atraso curto e dá um tiro PRÓPRIO — fraco,
 * guiado ao inimigo mais próximo, cadência baixa. NÃO copia Duplo, Triplo nem Cadência da nave: é conforto (limpa
 * quem você não está mirando), não um segundo canhão.
 *
 * O DESVIO (pedido dele): todo inimigo e todo tiro inimigo a menos de ~24px empurra o drone para longe; passou de
 * ~60px da nave, o empurrão desliga e ele volta. Sem vida — ele não morre; o desvio é charme.
 */
export class DroneAuxiliar {
  sprite: Phaser.GameObjects.Image | null = null;
  private espera = DRONE.esperaS;

  constructor(private readonly c: Contexto) {}

  tick(dt: number): void {
    if (!this.c.tem('WPN_010')) return;
    const n = this.c.h.nave();
    if (!this.sprite) {
      this.sprite = this.c.h.scene.add.image(n.x + DRONE.dx, n.y + DRONE.dy, 'carta-drone').setDepth(n.depth);
    }
    const d = this.sprite;
    let vx = (n.x + DRONE.dx - d.x) * DRONE.mola;
    let vy = (n.y + DRONE.dy - d.y) * DRONE.mola;
    if (Math.hypot(d.x - n.x, d.y - n.y) <= DRONE.longe) {
      for (const o of [...this.c.h.inimigos(), ...this.c.h.tirosInimigos()]) {
        if (!o.active) continue;
        const dist = Math.hypot(d.x - o.x, d.y - o.y);
        if (dist === 0 || dist >= DRONE.raioDesvio) continue;
        const f = ((DRONE.raioDesvio - dist) / DRONE.raioDesvio) * DRONE.forcaDesvio;
        vx += ((d.x - o.x) / dist) * f;
        vy += ((d.y - o.y) / dist) * f;
      }
    }
    d.setPosition(d.x + vx * dt, d.y + vy * dt);

    this.espera -= dt;
    if (this.espera > 0) return;
    const alvo = this.maisProximo(d.x, d.y);
    if (!alvo) return;
    this.espera = DRONE.esperaS;
    this.c.h.weapons.disparar({
      x: d.x,
      y: d.y,
      angulo: (Math.atan2(alvo.y - d.y, alvo.x - d.x) * 180) / Math.PI,
      textura: 'carta-tiro-drone',
      velocidade: DRONE.velocidade,
      dano: DRONE.dano,
      alcance: DRONE.alcance * 1.5,
      origem: 'drone',
      homing: DRONE.homing,
      tint: COR_TIRO[this.c.h.linhagem],
    });
  }

  private maisProximo(x: number, y: number): Inimigo | null {
    let melhor: Inimigo | null = null;
    let menor = DRONE.alcance;
    for (const e of this.c.h.inimigos()) {
      if (!e.active) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < menor) {
        menor = d;
        melhor = e;
      }
    }
    return melhor;
  }
}
```

- [ ] **Step 3: Ligar o drone**

Em `src/systems/CartasEmJogo.ts`:

1. Import: `import { DroneAuxiliar } from './cartas/DroneAuxiliar';`
2. Campo, abaixo de `readonly lancadores: Lancadores;`: `readonly drone: DroneAuxiliar;`
3. Construtor, depois de criar os lançadores: `this.drone = new DroneAuxiliar(this.c);`
4. No fim de `tick(...)`, depois de `this.lancadores.tick(dt);`: `this.drone.tick(dt);`

- [ ] **Step 4: Typecheck e sonda**

Run: `npm run typecheck` → sem erros.
Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas` → todas `OK`, `TUDO OK`,
e `cartas-novas/drone.png`.

- [ ] **Step 5: Commit**

```bash
git add src/systems/cartas/DroneAuxiliar.ts src/systems/CartasEmJogo.ts scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas/drone.png
git commit -m "feat(cartas): o Drone Auxiliar — segue, desvia e atira guiado por conta própria"
```

- [ ] **Step 6: Checkpoint** — ele joga com o Drone (na humana e na manta: o tiro muda de cor) e vê a `drone.png`.

---

### Task 6: A build elétrica — Elétrico, Arco em Cadeia e Sobrecarga

**Files:**
- Create: `src/systems/cartas/Eletrico.ts`
- Modify: `src/systems/cartas/contexto.ts` (`travar` no host)
- Modify: `src/systems/EnemySystem.ts` (`travar` e o congelamento)
- Modify: `src/systems/CartasEmJogo.ts`
- Modify: `src/scenes/GameScene.ts` (host)
- Modify: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `saltosDoArco`, `pixelsDoRaio`, `Ponto` (Task 2); `Contexto` (Task 3).
- Produces: `EnemySystem.travar(e: Phaser.Physics.Arcade.Sprite, ms: number): void`; `HostCartas.travar`;
  `class Eletrico { aoAcertar(alvo); eletrificar(e, saltar: boolean, dano: number); aoMorrer(e); tick(): void }`;
  `CartasEmJogo.eletrico`. Dados no inimigo: `eletrificadoAte` (ms), `travadoAte` (ms), `velAntes` ({x, y}).

- [ ] **Step 1: Os casos na sonda (falham)**

Antes de `// ─── FIM ───`:

```js
// ── ELÉTRICO (EFF_011): trava movimento e tiro ──
await fase(['EFF_011']);
const trava = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('canhoneira', 300, 90, 99);
  e.body.setVelocity(-40, 0);
  await t.dormir(100);
  e.setData('cooldown', 0.25);
  s.cartas.eletrico.eletrificar(e, false, 0);
  const x0 = e.x;
  await t.dormir(250);
  const travado = { dx: Math.abs(e.x - x0), cd: e.getData('cooldown'), tiros: s.enemies.enemyBullets.countActive(true) };
  await t.dormir(400);
  return { travado, vx: e.body.velocity.x };
});
conferir(trava.travado.dx < 0.5 && trava.travado.cd === 0.25 && trava.travado.tiros === 0, 'eletrificado não anda nem atira', trava);
conferir(trava.vx === -40, 'ao destravar, volta a andar no rumo de antes', trava);

// ── ARCO EM CADEIA (EFF_012): no máximo 3 saltos, sem recursão ──
await fase(['EFF_011', 'EFF_012']);
const arco = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const fila = [0, 1, 2, 3, 4, 5].map((i) => t.alvo('drone', 200 + i * 20, 60, 99));
  s.cartas.eletrico.eletrificar(fila[0], true, 0);
  await t.dormir(60);
  return fila.map((e) => (e.getData('eletrificadoAte') ?? 0) > s.time.now);
});
conferir(arco[0] && arco.filter(Boolean).length === 4, 'o arco salta para no máximo 3 e não recursa', arco);
await foto('arco-em-cadeia', 250, 60, 140, 50);

// ── SOBRECARGA (EFF_013): o pulso fere e NÃO eletrifica ──
await fase(['EFF_011', 'EFF_012', 'EFF_013']);
const pulso = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const a = t.alvo('drone', 200, 150, 99);
  const b = t.alvo('drone', 215, 150, 99);
  s.cartas.eletrico.eletrificar(a, false, 0);
  s.matarInimigo(a);
  await t.dormir(120);
  return { hp: b.getData('hp'), eletrificado: (b.getData('eletrificadoAte') ?? 0) > s.time.now };
});
conferir(pulso.hp === 97 && !pulso.eletrificado, 'o pulso da Sobrecarga fere e não eletrifica', pulso);

// ── MINICHEFE leva o choque mas não trava ──
const aranha = await page.evaluate(() => {
  const t = window.__teste;
  const s = t.cena();
  const e = t.alvo('aranha', 300, 170, 99);
  s.cartas.eletrico.eletrificar(e, false, 0);
  return { travado: (e.getData('travadoAte') ?? 0) > s.time.now, eletrificado: (e.getData('eletrificadoAte') ?? 0) > s.time.now };
});
conferir(!aranha.travado && aranha.eletrificado, 'a minichefe leva o choque mas não trava', aranha);
```

Run a sonda. Expected: os 5 casos elétricos em `FALHA` (`s.cartas.eletrico` não existe).

- [ ] **Step 2: O congelamento no `EnemySystem`**

Em `src/systems/EnemySystem.ts`, acrescente o método público logo antes de `update(dt, target)`:

```ts
  /**
   * O ELETRIFICADO (carta Elétrico, spec §4.1b): congela movimento E tiro por `ms`. Chamado de novo enquanto travado,
   * só ESTENDE — a velocidade guardada é a de antes do 1º choque, não o zero do travamento.
   */
  travar(e: Phaser.Physics.Arcade.Sprite, ms: number): void {
    const agora = this.scene.time.now;
    const ate = (e.getData('travadoAte') as number | undefined) ?? 0;
    const body = e.body as Phaser.Physics.Arcade.Body;
    if (ate <= agora) e.setData('velAntes', { x: body.velocity.x, y: body.velocity.y });
    e.setData('travadoAte', Math.max(ate, agora + ms));
    body.setVelocity(0, 0);
    body.setAcceleration(0, 0);
  }
```

E no `update`, logo depois de `const def = DEFS[e.getData('kind') as EnemyKind];`, acrescente:

```ts
      // TRAVADO (eletrificado): nada anda, nada atira, nenhum relógio de tiro corre — o `continue` pula tudo abaixo.
      // Ao destravar, volta a velocidade de antes (a do roteiro, ou a da deriva vertical da água-viva).
      const travadoAte = e.getData('travadoAte') as number | undefined;
      if (travadoAte) {
        const body = e.body as Phaser.Physics.Arcade.Body;
        if (this.scene.time.now < travadoAte) {
          body.setVelocity(0, 0);
          body.setAcceleration(0, 0);
          continue;
        }
        e.setData('travadoAte', 0);
        const v = e.getData('velAntes') as { x: number; y: number } | undefined;
        if (v) body.setVelocity(v.x, v.y);
      }
```

- [ ] **Step 3: O host ganha `travar`**

Em `src/systems/cartas/contexto.ts`, na `HostCartas`, logo depois de `matar: (e: Inimigo) => void;`, acrescente:

```ts
  /** Congela o inimigo por `ms` (`EnemySystem.travar`). */
  travar: (e: Inimigo, ms: number) => void;
```

Em `src/scenes/GameScene.ts`, no objeto do `new CartasEmJogo({ ... })`, logo depois de `matar: (e) => this.matarInimigo(e),`,
acrescente:

```ts
      travar: (e, ms) => this.enemies.travar(e, ms),
```

- [ ] **Step 4: O elétrico**

`src/systems/cartas/Eletrico.ts`:

```ts
import type Phaser from 'phaser';
import { pixelsDoRaio, saltosDoArco, type Ponto } from '../../cartasRegras';
import type { Contexto, Inimigo } from './contexto';

/** PROVISÓRIOS (calibragem). */
const CHANCE = 0.2;
const TRAVA_MS = 400;
const ARCO = { saltos: 3, raio: 50, dano: 1 };
const PULSO = { raio: 30, dano: 2 };
const COR_CHOQUE = 0x9ff6ff;
const COR_QUEIMANDO = 0xff9a50;
/** O raio vive 3 quadros de 40ms, redesenhado a cada um (o zigue-zague treme). */
const RAIO_MS = 120;
const QUADRO_MS = 40;
/**
 * Chefões e minichefes levam o dano, mas NÃO travam — travar chefão quebra a luta (§4.1b). Os chefões nem passam por
 * aqui (não são do grupo de inimigos); a aranha (minichefe da F3) é.
 */
const NAO_TRAVA = new Set(['aranha']);

/**
 * A BUILD ELÉTRICA (§4.1b). O fogo mata em área; o elétrico CONTROLA: o eletrificado não anda nem atira por ~0,4s — a
 * resposta direta aos atiradores da frente B.
 * - ELÉTRICO: chance de o tiro da nave eletrificar.
 * - ARCO EM CADEIA: o choque salta para até 3 próximos, um por vez, sem voltar; quem leva o arco é eletrificado mas NÃO
 *   solta arco novo.
 * - SOBRECARGA: o eletrificado que morre solta um pulso que FERE em volta; o pulso NÃO eletrifica.
 *
 * O raio é desenhado em PIXEL na resolução do jogo (`pixelsDoRaio`) — não sprite esticada, não linha vetorial.
 * Provisório: o tint ciano e o `Fx.estalo`; a faísca e o eletrificado do PixelLab (#17, #29) entram depois.
 */
export class Eletrico {
  private readonly g: Phaser.GameObjects.Graphics;
  private readonly raios: { a: Ponto; b: Ponto; ate: number; troca: number; pts: Ponto[] }[] = [];
  private readonly tingidos = new Set<Inimigo>();

  constructor(private readonly c: Contexto) {
    this.g = c.h.scene.add.graphics().setDepth(45);
  }

  /** O tiro da NAVE acertou. */
  aoAcertar(alvo: Inimigo): void {
    if (!this.c.tem('EFF_011') || !alvo.active || Math.random() >= CHANCE) return;
    this.eletrificar(alvo, true, 0);
  }

  eletrificar(e: Inimigo, saltar: boolean, dano: number): void {
    if (!e.active) return;
    e.setData('eletrificadoAte', this.c.h.scene.time.now + TRAVA_MS);
    if (!NAO_TRAVA.has(e.getData('kind') as string)) this.c.h.travar(e, TRAVA_MS);
    this.c.h.fx.estalo(e.x, e.y, e.displayWidth * 0.42);
    if (dano) this.c.depois(() => this.c.ferir(e, dano));
    if (saltar && this.c.tem('EFF_012')) this.arco(e);
  }

  /** Um inimigo morreu: se estava eletrificado e há Sobrecarga, o pulso. */
  aoMorrer(e: Inimigo): void {
    const ate = (e.getData('eletrificadoAte') as number | undefined) ?? 0;
    if (!this.c.tem('EFF_013') || ate <= this.c.h.scene.time.now) return;
    const { x, y } = e;
    this.c.h.fx.choque(x, y, 0.8);
    this.c.depois(() => {
      for (const o of this.c.noRaio(x, y, PULSO.raio)) if (o !== e) this.c.ferir(o, PULSO.dano);
    });
  }

  tick(): void {
    const agora = this.c.h.scene.time.now;

    // O TINT do eletrificado, reescrito todo quadro: o flash de dano (40ms) restauraria o tint do tipo por cima dele.
    for (const e of this.c.h.inimigos()) {
      if (!e.active) continue;
      const ligado = ((e.getData('eletrificadoAte') as number | undefined) ?? 0) > agora;
      if (ligado) {
        e.setTint(COR_CHOQUE);
        this.tingidos.add(e);
      } else if (this.tingidos.delete(e)) {
        const queimando = ((e.getData('queimaAte') as number | undefined) ?? 0) > agora;
        e.setTint(queimando ? COR_QUEIMANDO : (e.getData('tint') as number));
      }
    }
    for (const e of this.tingidos) if (!e.active) this.tingidos.delete(e);

    this.g.clear();
    for (let i = this.raios.length - 1; i >= 0; i--) {
      const r = this.raios[i];
      if (agora >= r.ate) {
        this.raios.splice(i, 1);
        continue;
      }
      if (agora >= r.troca) {
        r.pts = pixelsDoRaio(r.a, r.b, Math.random);
        r.troca = agora + QUADRO_MS;
      }
      r.pts.forEach((p, k) => {
        this.g.fillStyle(k % 3 ? COR_CHOQUE : 0xffffff);
        this.g.fillRect(p.x, p.y, 1, 1);
      });
    }
  }

  private arco(origem: Inimigo): void {
    const vivos = this.c.h.inimigos().filter((e) => e.active && e !== origem);
    const saltos = saltosDoArco(
      { id: -1, x: origem.x, y: origem.y },
      vivos.map((e, i) => ({ id: i, x: e.x, y: e.y })),
      ARCO.saltos,
      ARCO.raio,
    );
    let de: Ponto = { x: origem.x, y: origem.y };
    for (const i of saltos) {
      const alvo = vivos[i];
      this.raios.push({ a: de, b: { x: alvo.x, y: alvo.y }, ate: this.c.h.scene.time.now + RAIO_MS, troca: 0, pts: [] });
      // Quem leva o arco é eletrificado, mas NÃO solta arco novo (sem recursão).
      this.eletrificar(alvo, false, ARCO.dano);
      de = { x: alvo.x, y: alvo.y };
    }
  }
}
```

- [ ] **Step 5: Ligar o elétrico em `CartasEmJogo`**

Em `src/systems/CartasEmJogo.ts`:

1. Import: `import { Eletrico } from './cartas/Eletrico';`
2. Campo, abaixo de `readonly drone: DroneAuxiliar;`: `readonly eletrico: Eletrico;`
3. Construtor, depois de criar o drone: `this.eletrico = new Eletrico(this.c);`
4. No fim de `tick(...)`, depois de `this.drone.tick(dt);`: `this.eletrico.tick();`
5. Em `aoAcertar`, logo depois da linha do Incendiário (`if (tem(this.reg, 'EFF_004') ...`), acrescente:
   `this.eletrico.aoAcertar(alvo);`
6. Em `aoMorrer`, logo depois da linha da Combustão, acrescente: `this.eletrico.aoMorrer(e);`
7. No cabeçalho da classe (o comentário grande), acrescente o item
   `* - a BUILD ELÉTRICA (`Eletrico`): Elétrico, Arco em Cadeia e Sobrecarga;`

- [ ] **Step 6: Typecheck e sonda**

Run: `npm run typecheck` → sem erros.
Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas` → todas `OK`, `TUDO OK`,
e `cartas-novas/arco-em-cadeia.png`.

- [ ] **Step 7: Commit**

```bash
git add src/systems/cartas src/systems/EnemySystem.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas/arco-em-cadeia.png
git commit -m "feat(cartas): a build elétrica — eletrificado trava, o arco salta em pixel, a Sobrecarga pulsa"
```

- [ ] **Step 8: Checkpoint** — ele joga a F3 (onde há canhoneiras e a aranha) com a build elétrica inteira e vê a
`arco-em-cadeia.png` ampliada (o raio é pixel na resolução do jogo).

---

### Task 7: A aura do Casco, a Recarga máx. 1 e a Bomba Extra

**Files:**
- Create: `src/systems/cartas/AuraDoCasco.ts`
- Modify: `src/systems/CartasEmJogo.ts`
- Modify: `src/scenes/GameScene.ts` (bombas)
- Modify: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `contornoDoAlfa` (Task 2); `Contexto` (Task 3). A Recarga máx. 1 já está no catálogo (Task 1) e no
  `CASCO_RECARGA` de dois valores (Task 3).
- Produces: `class AuraDoCasco { readonly img: Phaser.GameObjects.Image; get visivel(): boolean; mostrar(); quebrar(); tick(time: number) }`;
  `CartasEmJogo.aura`; `CartasEmJogo.bombasExtras(): number`.

- [ ] **Step 1: Os casos na sonda (falham)**

Antes de `// ─── FIM ───`:

```js
// ── BOMBA EXTRA (DEF_005 ×2): 3 + 2 na hora, e de novo a cada vida ──
await fase(['DEF_005', 'DEF_005']);
const bombas = await page.evaluate(() => {
  const s = window.__teste.cena();
  const agora = s.bombs;
  s.bombs = 0;
  s.invulnerableUntil = 0;
  s.damageShip();
  return { agora, naVidaNova: s.bombs };
});
conferir(bombas.agora === 5 && bombas.naVidaNova === 5, 'Bomba Extra ×2: 5 bombas, e 5 de novo na vida nova', bombas);

// ── A AURA DO CASCO (§4.3b) ──
await fase(['DEF_001']);
await page.waitForTimeout(300);
const naveCasco = await page.evaluate(() => ({ x: window.__teste.cena().ship.x, y: window.__teste.cena().ship.y }));
await foto('aura-do-casco', naveCasco.x, naveCasco.y, 70, 40);
const aura = await page.evaluate(async () => {
  const t = window.__teste;
  const s = t.cena();
  const antes = s.cartas.aura.visivel && s.cartas.aura.img.visible;
  const vidas = s.lives;
  s.invulnerableUntil = 0;
  s.damageShip();
  await t.dormir(100);
  return { antes, depois: s.cartas.aura.img.visible, vidas, vidasDepois: s.lives };
});
conferir(aura.antes && !aura.depois && aura.vidas === aura.vidasDepois, 'a aura aparece com o Casco pronto e some quando ele quebra', aura);
```

Run a sonda. Expected: os 2 casos em `FALHA`.

- [ ] **Step 2: A aura**

`src/systems/cartas/AuraDoCasco.ts`:

```ts
import type Phaser from 'phaser';
import { contornoDoAlfa } from '../../cartasRegras';
import type { Contexto } from './contexto';

const COR = [0x3e, 0xe0, 0xf0];
const PULSO_MS = 1600;

/**
 * A AURA DO CASCO (§4.3b) — volta, de outro jeito. Em 28/09 o desenho em volta da nave saiu: era uma ELIPSE de 30px
 * que, nas naves de 44px, sumia atrás do casco e lia como "feixe de luz". Agora é o CONTORNO de 1px da SILHUETA da
 * própria nave (tirado do alfa do quadro atual, em cada tier e nas duas linhagens), ciano, pulsando devagar — sem forma
 * própria para "virar feixe". O "CASCO" continua na HUD: *"o jogador precisa saber que tem só de olhar a aura"* (ele).
 *
 * O contorno de cada quadro é calculado UMA vez e guardado como textura (`aura|<textura>|<quadro>`).
 * Provisório: o estouro ao quebrar (o contorno cresce e some); o efeito do PixelLab entra depois.
 */
export class AuraDoCasco {
  readonly img: Phaser.GameObjects.Image;
  private ligada = false;

  constructor(private readonly c: Contexto) {
    this.img = c.h.scene.add.image(0, 0, '__WHITE').setVisible(false);
  }

  get visivel(): boolean {
    return this.ligada;
  }

  mostrar(): void {
    this.ligada = true;
  }

  quebrar(): void {
    this.ligada = false;
    if (!this.img.visible) return;
    const s = this.c.h.scene;
    const eco = s.add
      .image(this.img.x, this.img.y, this.img.texture.key)
      .setAngle(this.img.angle)
      .setFlip(this.img.flipX, this.img.flipY)
      .setScale(this.img.scaleX, this.img.scaleY)
      .setDepth(this.img.depth);
    s.tweens.add({
      targets: eco,
      scaleX: eco.scaleX * 1.3,
      scaleY: eco.scaleY * 1.3,
      alpha: 0,
      duration: 220,
      onComplete: () => eco.destroy(),
    });
    this.img.setVisible(false);
  }

  tick(time: number): void {
    const n = this.c.h.nave();
    if (!this.ligada || !n.active) {
      this.img.setVisible(false);
      return;
    }
    this.img
      .setTexture(this.textura(n))
      .setPosition(n.x, n.y)
      .setAngle(n.angle)
      .setFlip(n.flipX, n.flipY)
      .setScale(n.scaleX, n.scaleY)
      .setDepth(n.depth + 1)
      // Pisca junto com a nave nos i-frames: a aura não pode ficar acesa no lugar de uma nave apagada.
      .setVisible(n.visible)
      .setAlpha(0.55 + 0.25 * Math.sin((time / PULSO_MS) * Math.PI * 2));
  }

  private textura(n: Phaser.GameObjects.Sprite): string {
    const chave = `aura|${n.texture.key}|${n.frame.name}`;
    const s = this.c.h.scene;
    if (s.textures.exists(chave)) return chave;
    const f = n.frame;
    const w = f.cutWidth;
    const h = f.cutHeight;
    const tela = document.createElement('canvas');
    tela.width = w;
    tela.height = h;
    const ctx = tela.getContext('2d')!;
    ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, w, h, 0, 0, w, h);
    const rgba = ctx.getImageData(0, 0, w, h).data;
    const alfa = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) alfa[i] = rgba[i * 4 + 3];
    const borda = contornoDoAlfa(alfa, w, h);
    const t = s.textures.createCanvas(chave, w + 2, h + 2)!;
    const img = t.context.createImageData(w + 2, h + 2);
    borda.forEach((b, i) => {
      if (!b) return;
      img.data[i * 4] = COR[0];
      img.data[i * 4 + 1] = COR[1];
      img.data[i * 4 + 2] = COR[2];
      img.data[i * 4 + 3] = 255;
    });
    t.context.putImageData(img, 0, 0);
    t.refresh();
    return chave;
  }
}
```

- [ ] **Step 3: Ligar a aura e a Bomba Extra em `CartasEmJogo`**

Em `src/systems/CartasEmJogo.ts`:

1. Import: `import { AuraDoCasco } from './cartas/AuraDoCasco';`
2. Campo, abaixo de `readonly eletrico: Eletrico;`: `readonly aura: AuraDoCasco;`
3. Construtor: depois de `this.cascoPronto = tem(this.reg, 'DEF_001');`, acrescente:

```ts
    this.aura = new AuraDoCasco(this.c);
    if (this.cascoPronto) this.aura.mostrar();
```

4. Troque o comentário `// ⚠️ O CASCO NÃO TEM DESENHO EM VOLTA DA NAVE (28/09). ...` (as 3 linhas acima do construtor)
   por:

```ts
  // O CASCO tem AURA de novo (01/10, spec §4.3b): não a elipse de 28/09 (que lia como "feixe de luz"), e sim o
  // contorno de 1px da silhueta da nave — ver `AuraDoCasco`. A HUD continua dizendo "CASCO".
```

5. Logo depois de `vidasExtras()`, acrescente:

```ts
  /** Bombas a mais por vida (Bomba Extra, máx. 2) — somam às 3 de cada vida (§4.4). */
  bombasExtras(): number {
    return quantas(this.reg, 'DEF_005');
  }
```

6. Em `aplicar`, troque o bloco do `DEF_001` e acrescente o `DEF_005`:

```ts
    if (id === 'DEF_001') {
      this.cascoPronto = true;
      this.aura.mostrar();
      this.piscarCasco();
    }
    if (id === 'DEF_005') this.h.ganharBomba();
```

7. Em `tick`, no bloco "O CASCO: volta sozinho", acrescente `this.aura.mostrar();` antes de `this.piscarCasco();`; e no
   fim de `tick`, depois de `this.eletrico.tick();`: `this.aura.tick(time);`
8. Em `absorver`, logo depois de `this.cascoPronto = false;`, acrescente `this.aura.quebrar();`

- [ ] **Step 4: A cena conta a Bomba Extra**

Em `src/scenes/GameScene.ts`:

1. Logo depois da linha `this.lives = 3 + this.cartas.vidasExtras() + ...;`, acrescente:

```ts
    // BOMBA EXTRA: 3 por vida (GDD §5) + as da mão.
    this.bombs = 3 + this.cartas.bombasExtras();
```

2. Em `damageShip`, troque `this.bombs = 3;` (o da vida nova) por `this.bombs = 3 + this.cartas.bombasExtras();` e o
   comentário de cima por `// 3 por vida (GDD §5) + a Bomba Extra: a vida nova vem com o estoque cheio.`

- [ ] **Step 5: Typecheck e sonda**

Run: `npm run typecheck` → sem erros.
Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas` → todas `OK`, `TUDO OK`,
e `cartas-novas/aura-do-casco.png`. Abra a foto: o contorno ciano segue a silhueta, 1px, sem caixa em volta.

- [ ] **Step 6: Commit**

```bash
git add src/systems/cartas/AuraDoCasco.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas/aura-do-casco.png
git commit -m "feat(cartas): a aura do Casco pela silhueta e a Bomba Extra"
```

- [ ] **Step 7: Checkpoint** — ele vê a `aura-do-casco.png` e joga com Casco nas duas linhagens (o contorno muda com
a nave e com o tier), conferindo que a aura lê como "tenho escudo" sem tampar a nave.

---

### Task 8: O Dash

**Files:**
- Create: `src/systems/cartas/Dash.ts`
- Modify: `src/systems/CartasEmJogo.ts`
- Modify: `src/scenes/GameScene.ts` (intocável, HUD)
- Modify: `scripts/probe-cartas-novas.mjs`

**Interfaces:**
- Consumes: `DuploToque`, `Direcao` (Task 2); `Contexto` (Task 3).
- Produces: `class Dash { get pronto(): boolean; intocavel(agora: number): boolean; tick(livre: boolean, body: Phaser.Physics.Arcade.Body): void }`;
  `CartasEmJogo.dash`, `CartasEmJogo.dashPronto: boolean`, `CartasEmJogo.intocavel(agora: number): boolean`.

- [ ] **Step 1: Os casos na sonda (falham)**

Antes de `// ─── FIM ───`:

```js
// ── DASH (MOV_003): dois toques, avanço curto, invulnerável, espera ──
async function duploToque(tecla) {
  await page.keyboard.down(tecla);
  await page.waitForTimeout(40);
  await page.keyboard.up(tecla);
  await page.waitForTimeout(60);
  await page.keyboard.down(tecla);
  await page.waitForTimeout(40);
  await page.keyboard.up(tecla);
}
const xDaNave = () => page.evaluate(() => window.__teste.cena().ship.x);

await fase([]);
let x0 = await xDaNave();
await duploToque('KeyD');
await page.waitForTimeout(300);
const semCarta = (await xDaNave()) - x0;

await fase(['MOV_003']);
x0 = await xDaNave();
await duploToque('KeyD');
await page.waitForTimeout(20);
const naveDash = await page.evaluate(() => ({ x: window.__teste.cena().ship.x, y: window.__teste.cena().ship.y }));
await foto('dash-fantasmas', naveDash.x - 15, naveDash.y, 90, 40);
await page.waitForTimeout(280);
const comDash = (await xDaNave()) - x0;
conferir(semCarta < 15 && comDash >= 30, 'dois toques: o dash avança ~40px (sem a carta, nada)', { semCarta, comDash });

const hud = await page.evaluate(() => window.__teste.cena().hud.text.includes('DASH'));
x0 = await xDaNave();
await duploToque('KeyD');
await page.waitForTimeout(300);
const naEspera = (await xDaNave()) - x0;
conferir(!hud && naEspera < 15, 'na espera, o duplo toque não dispara e a HUD não mostra DASH', { hud, naEspera });
await page.waitForTimeout(2500);
const hudDepois = await page.evaluate(() => window.__teste.cena().hud.text.includes('DASH'));
conferir(hudDepois, 'passada a espera, "DASH" acende na HUD', hudDepois);

await duploToque('KeyW');
const inv = await page.evaluate(() => {
  const s = window.__teste.cena();
  s.invulnerableUntil = 0;
  const antes = s.lives;
  s.damageShip();
  return { antes, depois: s.lives };
});
conferir(inv.antes === inv.depois, 'durante o dash a nave não leva dano', inv);
```

Run a sonda. Expected: os 4 casos do dash em `FALHA`.

- [ ] **Step 2: O dash**

`src/systems/cartas/Dash.ts`:

```ts
import type Phaser from 'phaser';
import { DuploToque, type Direcao } from '../../cartasRegras';
import type { Contexto } from './contexto';

/** PROVISÓRIOS (calibragem) — a ESPERA é o número que segura "dash invulnerável + Casco" (§4.2). */
const JANELA_MS = 220;
const DISTANCIA = 40;
const DURACAO_MS = 150;
const INTOCAVEL_MS = 200;
const ESPERA_MS = 2500;
const FANTASMA_MS = 30;
const VELOCIDADE = DISTANCIA / (DURACAO_MS / 1000);

const TECLAS: Record<string, Direcao> = {
  KeyW: 'cima',
  ArrowUp: 'cima',
  KeyS: 'baixo',
  ArrowDown: 'baixo',
  KeyA: 'esquerda',
  ArrowLeft: 'esquerda',
  KeyD: 'direita',
  ArrowRight: 'direita',
};
const RUMO: Record<Direcao, [number, number]> = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };

/**
 * O DASH (§4.2): DOIS TOQUES na mesma direção (W/A/S/D ou setas) — um avanço curto para lá, INVULNERÁVEL, com espera.
 * Só existe para quem tem a carta, e só no voo livre (fora da F1). O visual são IMAGENS-FANTASMA da própria sprite
 * (vale para as 6 naves sem arte nova).
 *
 * ⚠️ O DUPLO TOQUE LÊ O EVENTO DA TECLA, NÃO O `isDown` DO QUADRO. Um toque rápido desce e sobe dentro do mesmo
 * quadro e o `isDown` nunca o veria; e o `JustDown` é consumido pelo `InputReader` (o flap usa o da tecla de cima).
 * A repetição do sistema (tecla segurada) é descartada: o 2º toque exige soltar e apertar de novo.
 */
export class Dash {
  private readonly toque = new DuploToque(JANELA_MS);
  private pedido: { dir: Direcao; t: number } | null = null;
  private ate = 0;
  private intocavelAte = 0;
  private prontoEm = 0;
  private proximoFantasma = 0;
  private rumo: [number, number] = [0, 0];
  private salvo: { max: Phaser.Math.Vector2; drag: Phaser.Math.Vector2 } | null = null;

  constructor(private readonly c: Contexto) {
    const kb = c.h.scene.input.keyboard;
    if (!kb) return;
    const aoApertar = (ev: KeyboardEvent): void => {
      if (ev.repeat) return;
      const dir = TECLAS[ev.code];
      if (!dir) return;
      const agora = c.h.scene.time.now;
      if (this.toque.apertou(dir, agora)) this.pedido = { dir, t: agora };
    };
    kb.on('keydown', aoApertar);
    c.h.scene.events.once('shutdown', () => kb.off('keydown', aoApertar));
  }

  /** Tem a carta, está fora da F1 e a espera passou — a HUD acende "DASH". */
  get pronto(): boolean {
    return this.c.tem('MOV_003') && this.c.h.fase > 1 && this.c.h.scene.time.now >= this.prontoEm;
  }

  intocavel(agora: number): boolean {
    return agora < this.intocavelAte;
  }

  /** Roda DEPOIS da condução e dos Propulsores: durante o dash, ele manda na velocidade. */
  tick(livre: boolean, body: Phaser.Physics.Arcade.Body): void {
    const agora = this.c.h.scene.time.now;
    const p = this.pedido;
    this.pedido = null;
    // Pedido velho (feito com a fase pausada na mesa) não dispara na volta.
    if (p && livre && agora - p.t < 100 && this.pronto) this.comecar(p.dir, agora, body);

    if (agora < this.ate) {
      body.setVelocity(this.rumo[0] * VELOCIDADE, this.rumo[1] * VELOCIDADE);
      if (agora >= this.proximoFantasma) {
        this.fantasma();
        this.proximoFantasma = agora + FANTASMA_MS;
      }
    } else if (this.salvo) {
      // Acabou: devolve o teto e o arrasto da condução (o drag alto é a "parada seca" do voo livre).
      body.setMaxVelocity(this.salvo.max.x, this.salvo.max.y);
      body.setDrag(this.salvo.drag.x, this.salvo.drag.y);
      this.salvo = null;
    }
  }

  private comecar(dir: Direcao, agora: number, body: Phaser.Physics.Arcade.Body): void {
    this.rumo = RUMO[dir];
    this.ate = agora + DURACAO_MS;
    this.intocavelAte = agora + INTOCAVEL_MS;
    this.prontoEm = agora + ESPERA_MS;
    this.proximoFantasma = agora;
    if (!this.salvo) this.salvo = { max: body.maxVelocity.clone(), drag: body.drag.clone() };
    body.setMaxVelocity(VELOCIDADE * 2, VELOCIDADE * 2);
    body.setDrag(0, 0);
  }

  /** Uma cópia da sprite NO QUADRO ATUAL, que some em 200ms. */
  private fantasma(): void {
    const n = this.c.h.nave();
    const s = this.c.h.scene;
    const f = s.add
      .image(n.x, n.y, n.texture.key, n.frame.name)
      .setAngle(n.angle)
      .setFlip(n.flipX, n.flipY)
      .setScale(n.scaleX, n.scaleY)
      .setDepth(n.depth - 1)
      .setAlpha(0.5);
    s.tweens.add({ targets: f, alpha: 0, duration: 200, onComplete: () => f.destroy() });
  }
}
```

- [ ] **Step 3: Ligar o dash**

Em `src/systems/CartasEmJogo.ts`:

1. Import: `import { Dash } from './cartas/Dash';`
2. Campo, abaixo de `readonly aura: AuraDoCasco;`: `readonly dash: Dash;`
3. Construtor, depois da aura: `this.dash = new Dash(this.c);`
4. Logo depois do getter `temGuiado`, acrescente:

```ts
  /** "DASH" aceso na HUD. */
  get dashPronto(): boolean {
    return this.dash.pronto;
  }

  /** Durante o dash a nave não leva dano (nem o Casco gasta). */
  intocavel(agora: number): boolean {
    return this.dash.intocavel(agora);
  }
```

5. Em `tick`, logo DEPOIS da linha dos Propulsores (`if (livre && prop) body.setMaxVelocity(...)`), acrescente:

```ts
    // O DASH depois dos Propulsores: durante o avanço, o teto de velocidade é dele.
    this.dash.tick(livre, body);
```

- [ ] **Step 4: A cena respeita o dash**

Em `src/scenes/GameScene.ts`:

1. Em `damageShip`, troque a 1ª linha por:

```ts
    if (this.over || this.time.now < this.invulnerableUntil || this.cartas.intocavel(this.time.now)) return;
```

2. Em `updateHud`, troque `${this.cartas.cascoAtivo ? ' CASCO' : ''}` por
   `${this.cartas.cascoAtivo ? ' CASCO' : ''}${this.cartas.dashPronto ? ' DASH' : ''}`.

- [ ] **Step 5: Typecheck e sonda**

Run: `npm run typecheck` → sem erros.
Run: `node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas` → todas `OK`, `TUDO OK`,
e `cartas-novas/dash-fantasmas.png` (a nave com os fantasmas atrás).

- [ ] **Step 6: Commit**

```bash
git add src/systems/cartas/Dash.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas/dash-fantasmas.png
git commit -m "feat(cartas): o Dash — dois toques, avanço invulnerável, espera e imagens-fantasma"
```

- [ ] **Step 7: Checkpoint** — ele joga com o Dash (teclado: dois toques em D/A/W/S ou setas) e diz se a janela de
220ms, a distância e a espera de 2,5s estão boas.

---

### Task 9: O fechamento — tudo verde, a folha e o ponto marcado

**Files:**
- Modify: `docs/HANDOFF.md` (o 📍 do 🧭)
- Modify: `docs/superpowers/specs/2026-10-01-catalogo-cartas-design.md` (o estado no topo)

- [ ] **Step 1: Rodar tudo**

```bash
npm run typecheck
node scripts/test-catalogo-cartas.mjs
node scripts/test-cartas-regras.mjs
node scripts/test-texto-encaixe.mjs
node scripts/test-molduras.mjs
node scripts/probe-cartas-novas.mjs docs/superpowers/folhas/2026-10-02/cartas-novas
node scripts/probe-cartas.mjs docs/superpowers/folhas/2026-10-02
node scripts/probe-mesa-texto.mjs docs/superpowers/folhas/2026-10-02
npm run build
```

Expected: typecheck e build sem erro; os quatro testes em `TUDO OK`; `probe-cartas-novas` e `probe-mesa-texto` em
`TUDO OK`; `probe-cartas` com `erros: []`. Se algo falhar, NÃO siga: diagnostique (superpowers:systematic-debugging).

- [ ] **Step 2: O estado na spec**

No topo de `docs/superpowers/specs/2026-10-01-catalogo-cartas-design.md`, troque a linha `> Estado: **desenho aprovado
com o Henrique em 01/10** (a revisar no arquivo).` por:

```markdown
> Estado: **desenho aprovado em 01/10; ícones em 02/10; mecânicas implementadas com arte provisória** (plano
> `plans/2026-10-02-catalogo-cartas.md`). Falta a arte aprovada no lugar da provisória (§6.3), num plano próprio.
```

- [ ] **Step 3: O ponto marcado no HANDOFF**

Em `docs/HANDOFF.md`, no 🧭, troque o parágrafo `> 📍 **29/09 — O PONTO MARCADO:** ...` (as duas linhas) por:

```markdown
> 📍 **02/10 — O PONTO MARCADO:** as **24 cartas** jogáveis na `feat/cartas-preview` (sem merge): catálogo, os 24
> ícones aprovados, a explosão única (Explosão Maior, Fragmentado, Em Cadeia), Míssil, Flare, Drone, a build elétrica,
> a aura do Casco, a Bomba Extra e o Dash — com **arte provisória**. Próximo: a arte aprovada no lugar da provisória
> (plano novo, a partir da §5 da spec do catálogo), depois a frente B (inimigos que atiram) e a C (calibragem).
```

- [ ] **Step 4: Commit**

```bash
git add docs/HANDOFF.md docs/superpowers/specs/2026-10-01-catalogo-cartas-design.md docs/superpowers/folhas/2026-10-02
git commit -m "docs(cartas): as 24 cartas jogáveis — o ponto marcado"
```

- [ ] **Step 5: Checkpoint final** — mandar a ele: as fotos de `folhas/2026-10-02/cartas-novas/`, a
`mesa-24-cartas.png` e o roteiro para jogar (F2 com a mesa de teste do dev; a F3 para a build elétrica), e pedir o
aval para começar o plano da arte aprovada.
