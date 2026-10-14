# F4 — a rodada de 14/10 (Tubo de esporos, buraco em superfície, pupa P1, mosca desorganizada) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aplicar o §9 da spec `specs/2026-10-12-frente-b-fatia-f4-design.md`: o Tubo solta ESPOROS que deixam a nave
lenta (sem dano), com um pé de raízes que o prende à borda; a Larva abre o buraco só na borda ou numa mesa, e chega e
sai por um tranco; a pupa é a P1 e treme antes de eclodir; a mosca nasce num rumo sorteado e voa tremendo.

**Architecture:** as regras novas são funções puras em `src/elitesRegras.ts`, com os números em
`src/data/numerosElites.ts` (testadas por `scripts/test-elites-regras.mjs`). O esporo é um sistema próprio
(`src/entities/elites/Esporos.ts`), com um grupo físico fora dos tiros e dos inimigos, que a cena liga à nave. A lentidão
é um fator na velocidade máxima do voo livre, aplicado em `CartasEmJogo.tick` (onde os Propulsores já mexem nela) e
respeitando o Dash. O buraco passa a seguir uma ÂNCORA (a borda ou uma mesa) que a cena oferece pelos ganchos.

**Tech Stack:** Phaser 3 (Arcade), TypeScript, Vite; scripts Node com `sharp` e `playwright`.

## ✅ Executado em 14/10 — o que saiu diferente do texto abaixo

Todos os passos feitos; os de commit seguem abertos (esperam o pedido dele). Os desvios:
- **`buraco.colunas` = `[280, 300, 320, 340, 360]`**, não `[250, …]`: o buraco anda com a superfície (84 px/s), e aberto
  em 250 ela saía em x≈174 e mergulhava em x≈145. A sonda passou a separar as duas coisas: *voando solta* ela nunca
  passa de x=200; *presa a um buraco* ela só anda com a parede.
- **O pé de raízes** (`peDoTubo`): as raízes descem mais íngremes (`cai` 0,5–0,95) e ficam carmim por mais tempo
  (até 65% do caminho). Com os números do plano elas mal entravam na placa e sumiam na cor dela.
- **A sonda da F4:** o `T.afunda` entra no `page.evaluate` como argumento (dentro da página o `T` não existe).
- **O `_folha-f4b.mjs`** redesenha o tiro do anel pelo `tiroAnel()` de `_mao-f4.mjs`, porque o PNG saiu. O
  `elite-anel.png` nunca foi commitado: o passo de commit da Task 2 não precisa do `git rm`.

## Global Constraints

- **Commit só quando ele pedir, só no nome dele** (sem `Co-Authored-By`); **push só quando pedir; nunca para
  `legacy`**. Os passos de commit abaixo trazem a mensagem pronta e ficam abertos até ele pedir. Os `concept art*.png`
  da raiz não entram.
- Os 4 `folhas/2026-10-13/elites/f4/jogo-*.gif` ficam no disco e **não entram em commit de produção** (vão para o
  repositório de backup, no final de tudo).
- Comentários do `src/` em português, no tom do arquivo vizinho; scripts novos com comentários em inglês, como os de
  `scripts/_elites/`.
- Edite com o Edit e confira. `sed`/`node -e` falham em silêncio aqui (CRLF, `${}`).
- Arte crua nunca: o que for desenhado em pixel usa a paleta do vizinho e entra na resolução nativa (escala 1).
- `npm run dev` rodando em http://localhost:5173 para as sondas e os GIFs.

## O mapa dos arquivos

| Arquivo | O que muda |
|---|---|
| `src/data/numerosElites.ts` | knobs novos: `pupa.tremeS/tremePassoS`, `mosca.tremorAcel/tremorHz`, `tubo.esporosN` (no lugar de `tirosN`), `tubo.afunda` 5, `buraco.colunas/naBordaPx/naMesaPx/folgaMesa`, `esporo`, `lentidao`; sai `tubo.velTiro` |
| `src/elitesRegras.ts` | novas: `pupaTremor`, `esporoAvanco`, `esporoBalanco`, `esporoAlfa`, `esporoVivo`, `lentidaoAte`, `fatorDeVelocidade`, `moscaTremor`, `escolherLugar`, `LugarDeBuraco`; muda `larvaAvanca` (tranco na chegada e na saída) e `tuboAngulos` (`esporosN`) |
| `scripts/test-elites-regras.mjs` | os testes das regras novas e o ciclo novo da Larva |
| `scripts/_elites/_mao-f4b.mjs` | ganha `reduzir`, `graoDeEsporo` e `peDoTubo` |
| `scripts/_elites/_instalar-f4b.mjs` (novo) | instala pupa P1, esporo G4, grão e os dois pés do Tubo |
| `scripts/_elites/_instalar-f4.mjs` | para de escrever a pupa antiga e o tiro do anel |
| `scripts/_elites/_folha-f4b.mjs` | importa `reduzir` de `_mao-f4b.mjs` |
| `src/scenes/BootScene.ts` | chaves `eliteEsporo`, `eliteEsporoGrao`, `eliteTuboPeA`, `eliteTuboPeB`; sai `eliteTiroAnel` |
| `src/systems/cartas/Dash.ts` | getter `avancando` |
| `src/systems/CartasEmJogo.ts` | `tick(…, fatorVel)`: o teto do voo livre sempre sai dele, menos durante o dash |
| `src/entities/elites/Esporos.ts` (novo) | o sistema dos esporos: soltar, pairar, andar com o cenário, sumir, tocar, os grãos grudados na nave |
| `src/entities/elites/tipos.ts` | `Ancora`, `LugarElite`; ganchos `soltarEsporo`, `lugaresDeBuraco`, `parede.faixa`; sai `velFundo` |
| `src/systems/EnemySystem.ts` | os ganchos padrão novos |
| `src/systems/Moldura.ts` | `faixaEm(xTela, teto)` |
| `src/scenes/GameScene.ts` | cria os esporos e o overlap; `lentaAte`; `lugaresDeBuraco()`; liga os ganchos novos |
| `src/entities/elites/Tubo.ts` | solta esporos; o pé de raízes |
| `src/entities/elites/Pupa.ts` | a pupa treme; a mosca nasce num rumo sorteado e treme |
| `src/entities/elites/Buraco.ts` | segue uma âncora; `depth −0,45` |
| `src/entities/elites/Larva.ts` | chegada e saída pela superfície, com tranco |
| `scripts/probe-elites-f4.mjs` | os checks novos (esporo, lentidão, buraco em superfície, ciclo novo, pé) |

---

### Task 1: Os números e as regras puras

**Files:**
- Modify: `src/data/numerosElites.ts` (blocos `larva`…`tubo`, linhas ~127–200)
- Modify: `src/elitesRegras.ts` (bloco da F4, linhas ~186–380)
- Test: `scripts/test-elites-regras.mjs`

**Interfaces:**
- Produces (em `src/elitesRegras.ts`):
  - `pupaTremor(t: number): -1 | 0 | 1`
  - `esporoAvanco(t: number): number`
  - `esporoBalanco(t: number, fase: number, periodo: number): { dx: number; dy: number }`
  - `esporoAlfa(t: number): number`, `esporoVivo(t: number): boolean`
  - `lentidaoAte(agora: number, ateAtual: number): number` (ms), `fatorDeVelocidade(agora: number, lentaAte: number): number`
  - `moscaTremor(t: number, fase: number, hz: number): number`
  - `interface LugarDeBuraco { x: number; y: number }`, `escolherLugar<T extends LugarDeBuraco>(lugares: readonly T[], sorte: () => number, perto?: { x: number; y: number }): T | null`
  - `larvaAvanca` com o ciclo novo: `abre, sai, tranco, poe, tranco, poe, tranco, poe, tranco, perfura, mergulha, foi`
  - `ELITES.esporo`, `ELITES.lentidao`, `ELITES.tubo.esporosN`, `ELITES.buraco.{colunas,naBordaPx,naMesaPx,folgaMesa}`

- [x] **Step 1: Escrever os testes que falham**

Em `scripts/test-elites-regras.mjs`, troque o import das regras por:

```js
import {
  droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escudoAbsorve, escolherPosto,
  cacadorAvanca, cacadorFugaLancada, cacadorQuadro, cacadorTangivel, tintaDoSumico,
  varianteDe, larvaAvanca, larvaTangivel, larvaQuadro, larvaPosto, pupaAngulos, pupaVoo, pupaQuadro, pupaEclode,
  moscaPersegue, buracoQuadro, distEmenda, tuboCabe, tuboAvanca, tuboQuadro, tuboAngulos,
  pupaTremor, esporoAvanco, esporoBalanco, esporoAlfa, esporoVivo, lentidaoAte, fatorDeVelocidade, moscaTremor, escolherLugar,
} from '../src/elitesRegras.ts';
```

Troque o ciclo esperado da Larva (o `const ciclo = [...]` e a mensagem dele) por:

```js
  const ciclo = ['abre', 'sai', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'perfura', 'mergulha', 'foi'];
  conferir(JSON.stringify(visto) === JSON.stringify(ciclo), `a Larva: buraco, sai, TRANCO até o 1º posto, ${L.paradas} paradas, TRANCO até a superfície, perfura, mergulha (§9.5)`, visto);
```

Troque as duas linhas do tempo à vista (`const aVista = …` e o `conferir` dela) por:

```js
const aVista = L.saiS + L.paradas * L.poeS + (L.paradas + 1) * L.trancoS + L.perfuraS + L.mergulhaS;
conferir(Math.abs(aVista - 5.4) < 0.01, 'cerca de 5,4s à vista (§9.5: um tranco a mais na chegada e outro na saída)', aVista);
```

Em todo o arquivo, troque `T.tirosN` por `T.esporosN`. Antes do `console.log(falhas.length ? …` final, acrescente:

```js
// ── A RODADA DE 14/10 (spec F4 §9) ──
const E = ELITES.esporo, LE = ELITES.lentidao, M = ELITES.mosca, BU = ELITES.buraco;
{
  const ini = P.eclodeS - P.tremeS;
  const antes = [0, 0.5, ini - 0.01].map(pupaTremor);
  const durante = [];
  for (let t = ini; t < P.eclodeS; t += 0.005) durante.push(pupaTremor(t));
  conferir(antes.every((v) => v === 0) && pupaTremor(P.eclodeS) === 0, `a pupa só treme nos últimos ${P.tremeS}s`, antes);
  conferir(durante.every((v) => Math.abs(v) === 1) && new Set(durante).size === 2, 'tremendo: ±1px, nunca mais', [...new Set(durante)]);
  const trocasT = (de, ate) => { let n = 0; for (let t = de + 0.005; t < ate; t += 0.005) if (pupaTremor(t) !== pupaTremor(t - 0.005)) n++; return n; };
  const meio = ini + P.tremeS / 2;
  conferir(trocasT(ini, meio) < trocasT(meio, P.eclodeS), 'o tremor fica mais rápido perto de eclodir', [trocasT(ini, meio), trocasT(meio, P.eclodeS)]);
}
conferir(esporoAvanco(0) === 0 && Math.abs(esporoAvanco(E.freiaS) - (E.velInicial * E.freiaS) / 2) < 1e-9 && esporoAvanco(99) === esporoAvanco(E.freiaS), 'o esporo sai, FREIA e para no rumo do pulso', [esporoAvanco(E.freiaS), esporoAvanco(99)]);
{
  let max = 0;
  for (let t = 0; t < 10; t += 0.01) { const b = esporoBalanco(t, 1.3, 1.7); max = Math.max(max, Math.abs(b.dx), Math.abs(b.dy)); }
  conferir(max <= E.balancoPx + 1e-9 && max >= E.balancoPx * 0.9 && E.balancoPx <= 2, `o balanço é mínimo (até ${E.balancoPx}px)`, max);
}
const bal1 = esporoBalanco(1, 0, 1.5), bal2 = esporoBalanco(1, 2, 1.5);
conferir(Math.abs(bal1.dx - bal2.dx) > 0.1, 'cada esporo balança na própria fase (a nuvem não balança em bloco)', [bal1, bal2]);
conferir(esporoAlfa(0) === 1 && esporoAlfa(E.vidaS - E.someS) === 1 && esporoAlfa(E.vidaS - E.someS / 2) === 0.5 && esporoAlfa(E.vidaS) === 0, 'ele some ao longo dos últimos someS', null);
conferir(esporoVivo(E.vidaS - 0.01) && !esporoVivo(E.vidaS), `o esporo vive ${E.vidaS}s`, null);
conferir(lentidaoAte(1000, 0) === 1000 + LE.duracaoS * 1000 && lentidaoAte(2000, 1000 + LE.duracaoS * 1000) === 2000 + LE.duracaoS * 1000, 'outro toque RENOVA a lentidão (não soma)', null);
conferir(fatorDeVelocidade(0, 100) === LE.velocidade && fatorDeVelocidade(100, 100) === 1 && LE.velocidade === 0.6, 'lenta: 60% da velocidade (40% mais lenta); acabou, volta a 1', null);
conferir(tuboAngulos(0, false).length === T.esporosN && tuboAngulos(1, false).length === T.esporosN - 1 && T.esporosN === 6, '6 esporos no 1º pulso, 5 no 2º (defasado)', null);
conferir(T.afunda === 5 && T.velTiro === undefined, 'o Tubo afunda 5px na borda e não atira mais (§9.3, §9.4)', T);
{
  let max = -Infinity, min = Infinity;
  for (let t = 0; t < 3; t += 0.01) { const v = moscaTremor(t, 0.4, 2); max = Math.max(max, v); min = Math.min(min, v); }
  conferir(max <= M.tremorAcel && min >= -M.tremorAcel && max > M.tremorAcel * 0.9 && min < -M.tremorAcel * 0.9, 'a mosca treme de um lado ao outro, até tremorAcel', [min, max]);
}
const lugares = [{ x: 260, y: 200 }, { x: 330, y: 20 }, { x: 300, y: 150 }];
conferir(escolherLugar([], () => 0.5) === null, 'sem lugar de buraco: null (quem chama decide)', null);
conferir(escolherLugar(lugares, () => 0) === lugares[0] && escolherLugar(lugares, () => 0.99) === lugares[2], 'na chegada, um dos lugares, sorteado', null);
conferir(escolherLugar(lugares, () => 0.5, { x: 320, y: 40 }) === lugares[1], 'na saída, o lugar mais perto dela', null);
conferir(BU.colunas.every((x) => x >= L.postoX[0] && x <= 384 - 16), 'as colunas do buraco ficam na metade direita, dentro da tela', BU.colunas);
```

- [x] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-elites-regras.mjs`
Expected: erro de import (`pupaTremor` não existe) ou FALHAS.

- [x] **Step 3: Os números**

Em `src/data/numerosElites.ts`:

No bloco `buraco`, troque `buraco: { abreS: 0.5, fechaS: 0.25, cicatrizS: 1.0 },` por:

```ts
  buraco: {
    abreS: 0.5,
    fechaS: 0.25,
    cicatrizS: 1.0,
    /**
     * ONDE ELE ABRE (spec F4 §9.5): só na face da BORDA ou de uma MESA — nunca na pintura do fundo. As colunas de
     * tela em que a borda é candidata (na metade direita, como os postos), a profundidade do centro do buraco dentro
     * da faixa e dentro da mesa (a partir da beira que dá para o corredor), e a folga de uma mesa que tape a coluna.
     */
    colunas: [250, 280, 310, 340, 360] as const,
    naBordaPx: 14,
    naMesaPx: 18,
    folgaMesa: 16,
  },
```

No bloco `pupa`, troque a linha por:

```ts
  pupa: { hp: 1, score: 20, vooPx: 50, vooS: 0.4, eclodeS: 2.0, tremeS: 0.6, tremePassoS: [0.1, 0.03] as const },
```

e acrescente ao comentário dela: `O TREMOR (§9.2): nos últimos \`tremeS\` ela treme ±1px, o passo encurtando de 0,1 para 0,03s.`

No bloco `mosca`, troque a linha por:

```ts
  mosca: { hp: 1, score: 30, velInicial: 40, perseguicao: 110, velMax: 120, bateAsaS: 0.06, tremorAcel: 160, tremorHz: [1.5, 3] as const },
```

e acrescente ao comentário: `O TREMOR (§9.6): uma aceleração lateral de até \`tremorAcel\` px/s², num ritmo sorteado em \`tremorHz\`.`

No bloco `tubo`: troque o comentário de cima por `O TUBO PULSANTE (spec F4 §3 e §9.3): preso à parede, rola com ela → INCHA (o aviso) → PULSA uma nuvem de ESPOROS que deixam a nave lenta.`; troque o par de linhas `tirosN: 7,` / `velTiro: 70,` (e o comentário dos 7 tiros acima delas) por:

```ts
    /** Os ESPOROS de cada pulso (§9.3): 6 num meio-leque; o pulso ÍMPAR sai defasado meio passo, com um a menos. */
    esporosN: 6,
```

e troque `afunda: 2,` (e o comentário) por:

```ts
    /** O pé entra 5px na borda (§9.4: com 2 ele parecia pousado, não preso). O pé de raízes cobre o resto. */
    afunda: 5,
```

Depois do bloco `tubo`, acrescente:

```ts
  /**
   * O ESPORO do Tubo (spec F4 §9.3): sai a `velInicial` no rumo do pulso e FREIA até parar em `freiaS`; daí em diante
   * anda com o cenário, pairando (`balancoPx`, num ciclo de `balancoS`), e some nos últimos `someS` dos `vidaS`. Não
   * fere; o tiro o atravessa. `corpo` = a hitbox (quadrada, centrada).
   */
  esporo: { velInicial: 60, freiaS: 0.8, vidaS: 3, someS: 0.5, balancoPx: 1.5, balancoS: [1.2, 2.0] as const, corpo: 5 },
  /** A LENTIDÃO do esporo (§9.3): a nave voa a `velocidade` × o normal por `duracaoS`. Outro toque renova, não soma. */
  lentidao: { velocidade: 0.6, duracaoS: 2.5 },
```

- [x] **Step 4: As regras**

Em `src/elitesRegras.ts`:

Troque o corpo do `switch` de `larvaAvanca` (casos `sai`, `poe`, `tranco`) por:

```ts
    case 'sai':
      return t >= L.saiS ? 'tranco' : estado;
    case 'poe':
      return t >= L.poeS ? 'tranco' : estado;
    case 'tranco':
      if (t < L.trancoS) return estado;
      return paradas >= L.paradas ? 'perfura' : 'poe';
```

e troque o comentário de cima da função por:

```ts
/**
 * O ciclo da Larva (§2.1 e §9.5). `paradas` = quantos PÕE já COMEÇARAM, contando o atual. Ela sai do buraco e dá um
 * TRANCO até o 1º posto; entre as paradas, um tranco; depois da última, um tranco até a SUPERFÍCIE onde vai perfurar.
 * No `abre` só o buraco existe (o aviso); `foi` = mergulhou, sem pontos.
 */
```

Em `tuboAngulos`, troque as duas ocorrências de `T.tirosN` por `T.esporosN`, e no comentário dela `O MEIO-ANEL` por `O MEIO-LEQUE dos esporos`.

Depois de `moscaPersegue`, acrescente:

```ts
/** O TREMOR da pupa (§9.2): 0 até faltarem `tremeS` para eclodir; depois ±1px, alternando cada vez mais rápido. */
export function pupaTremor(t: number): -1 | 0 | 1 {
  const P = ELITES.pupa;
  const desde = t - (P.eclodeS - P.tremeS);
  if (desde < 0 || t >= P.eclodeS) return 0;
  const passo = P.tremePassoS[0] + (P.tremePassoS[1] - P.tremePassoS[0]) * (desde / P.tremeS);
  return Math.floor(desde / passo) % 2 ? 1 : -1;
}

/** O TREMOR da mosca (§9.6): a aceleração LATERAL (px/s², perpendicular ao rumo) aos `t` s, com a fase e o ritmo dela. */
export const moscaTremor = (t: number, fase: number, hz: number): number =>
  ELITES.mosca.tremorAcel * Math.sin(2 * Math.PI * hz * t + fase);
```

Depois de `tuboAngulos` (fim do bloco da F4), acrescente:

```ts
// ── A RODADA DE 14/10 (spec F4 §9) ──

/** Quanto o ESPORO já andou no rumo do pulso (px) aos `t` s: sai a `velInicial` e FREIA até parar em `freiaS`. */
export function esporoAvanco(t: number): number {
  const E = ELITES.esporo;
  const k = Math.min(1, Math.max(0, t / E.freiaS));
  return ((E.velInicial * E.freiaS) / 2) * (1 - (1 - k) ** 2);
}

/** O BALANÇO do esporo (§9.2): um laço lento de até `balancoPx` em x e em y. `fase` e `periodo` são de cada esporo. */
export function esporoBalanco(t: number, fase: number, periodo: number): { dx: number; dy: number } {
  const A = ELITES.esporo.balancoPx;
  const w = (2 * Math.PI) / periodo;
  return { dx: A * Math.sin(w * t + fase), dy: A * Math.cos(w * 0.77 * t + fase) };
}

/** A opacidade do esporo: inteiro até os últimos `someS`, e some ao longo deles. */
export const esporoAlfa = (t: number): number => {
  const E = ELITES.esporo;
  return Math.max(0, Math.min(1, (E.vidaS - t) / E.someS));
};

export const esporoVivo = (t: number): boolean => t < ELITES.esporo.vidaS;

/** A LENTIDÃO (§9.3): um toque em `agora` (ms) faz ela durar até `agora + duracaoS`. RENOVA, nunca soma. */
export const lentidaoAte = (agora: number, ateAtual: number): number =>
  Math.max(ateAtual, agora + ELITES.lentidao.duracaoS * 1000);

/** O fator na velocidade máxima da nave: `lentidao.velocidade` enquanto lenta, 1 fora disso. */
export const fatorDeVelocidade = (agora: number, lentaAte: number): number =>
  agora < lentaAte ? ELITES.lentidao.velocidade : 1;

/** Um lugar onde o buraco da Larva pode abrir: um ponto na face da borda ou de uma mesa (y de tela). */
export interface LugarDeBuraco {
  x: number;
  y: number;
}

/**
 * Onde o buraco abre (§9.5): só num dos `lugares` (a borda ou uma mesa, já filtrados por quem chama). Na CHEGADA,
 * sorteado; na SAÍDA, o mais perto de `perto` (onde ela está). Nenhum lugar: `null`.
 */
export function escolherLugar<T extends LugarDeBuraco>(lugares: readonly T[], sorte: () => number, perto?: { x: number; y: number }): T | null {
  if (!lugares.length) return null;
  if (!perto) return lugares[Math.min(lugares.length - 1, Math.floor(sorte() * lugares.length))];
  const d = (l: T): number => Math.hypot(l.x - perto.x, l.y - perto.y);
  return lugares.reduce((a, b) => (d(b) < d(a) ? b : a));
}
```

- [x] **Step 5: Rodar e ver passar**

Run: `node scripts/test-elites-regras.mjs`
Expected: `TUDO OK`. (O `npx tsc --noEmit` ainda acusa `Tubo.ts` por `velTiro`/`tirosN`: a Task 4 resolve.)

- [ ] **Step 6: Commit (só quando ele pedir)**

```bash
git add src/data/numerosElites.ts src/elitesRegras.ts scripts/test-elites-regras.mjs
git commit -m "feat(elites): as regras da rodada de 14/10 da F4 — o esporo (freia, paira, some), a lentidão que renova sem somar, o tremor da pupa e o da mosca, o lugar do buraco só em superfície, e o ciclo da Larva com tranco na chegada e na saída"
```

---

### Task 2: A arte da rodada (pupa P1, esporo G4, grão, pés do Tubo)

**Files:**
- Modify: `scripts/_elites/_mao-f4b.mjs` (acrescentar `reduzir`, `graoDeEsporo`, `peDoTubo`)
- Modify: `scripts/_elites/_folha-f4b.mjs` (importar `reduzir`)
- Create: `scripts/_elites/_instalar-f4b.mjs`
- Modify: `scripts/_elites/_instalar-f4.mjs:70-77`
- Modify: `src/scenes/BootScene.ts:1141-1142`
- Delete: `public/sprites/tiros/elite-anel.png`

**Interfaces:**
- Produces: as texturas `elitePupaAnim0/1` (a P1, mesmas chaves), `eliteEsporo` (G4 reduzido, ~8×9), `eliteEsporoGrao` (3×3), `eliteTuboPeA`, `eliteTuboPeB` (52×11, a linha da superfície na linha 3).

- [x] **Step 1: As peças em `_mao-f4b.mjs`**

No fim de `scripts/_elites/_mao-f4b.mjs`, acrescente:

```js
/** A generated piece brought down to `alto` px: trimmed, reduced (lanczos), alpha snapped to 0/255. Returns a PNG buffer. */
export async function reduzir(arq, alto) {
  const t = await sharp(arq).trim().png().toBuffer();
  const { data, info } = await sharp(t).resize({ height: alto, kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 3; i < data.length; i += 4) data[i] = data[i] > 110 ? 255 : 0;
  return sharp(data, { raw: info }).png().toBuffer();
}

/** A spore GRAIN clinging to the slowed ship (§9.3), 3×3, in the spore green. */
export const graoDeEsporo = () => pixel(['.S.', 'SCS', '.S.'], VERDE);

/** Deterministic PRNG (mulberry32), so the feet come out the same on every install. */
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export const PE = { W: 52, H: 11, SUP: 3 };
/**
 * THE TUBE'S ROOT FOOT (§9.4): W×H, the wall's surface line at row SUP. A fleshy collar over the Tube's flat base
 * (rows 0..SUP), and six roots spreading sideways and DOWN into the border, fading from the Tube's crimson into the
 * border's own darks (sampled from the top rows of the plate `faixaPng`) — it reads as grown there, not set down.
 * Drawn for the FLOOR; the game flips it on the ceiling.
 */
export async function peDoTubo(faixaPng, seed) {
  const { data, info } = await sharp(faixaPng).extract({ left: 0, top: 0, width: 128, height: 8 }).raw().toBuffer({ resolveWithObject: true });
  const tons = [];
  for (let i = 0; i < data.length; i += info.channels) if (info.channels < 4 || data[i + 3] > 200) tons.push([data[i], data[i + 1], data[i + 2]]);
  const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
  tons.sort((a, b) => lum(a) - lum(b));
  const pct = (p) => tons[Math.min(tons.length - 1, Math.floor(p * tons.length))];
  const C = { k: [20, 8, 12], d: [92, 22, 30], r: [140, 30, 40], b: pct(0.12), m: pct(0.45) };
  const { W, H, SUP } = PE;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const pinta = (x, y, c) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = c; };
  // The collar: covers the straight base line of the Tube (it is 22–24px wide at the foot).
  for (let y = 0; y <= SUP; y++) for (let x = 14 - y; x <= 37 + y; x++) pinta(x, y, y === 0 ? 'k' : y < SUP ? 'd' : 'r');
  const sorte = prng(seed);
  for (let i = 0; i < 6; i++) {
    const lado = i % 2 ? 1 : -1;
    let x = 26 + lado * (6 + Math.floor(sorte() * 8)), y = SUP;
    const passos = 9 + Math.floor(sorte() * 12), cai = 0.25 + sorte() * 0.4;
    for (let p = 0; p < passos; p++) {
      const fundo = p / passos > 0.45;
      pinta(Math.round(x), Math.round(y), fundo ? 'm' : 'r');
      if (p < passos * 0.4) pinta(Math.round(x), Math.round(y) + 1, fundo ? 'b' : 'd');
      pinta(Math.round(x), Math.round(y) + (p < passos * 0.4 ? 2 : 1), 'b');
      x += lado;
      y = Math.min(H - 2, y + cai);
    }
  }
  return pixel(g.map((l) => l.join('')), C);
}
```

- [x] **Step 2: A folha usa o `reduzir` daqui**

Em `scripts/_elites/_folha-f4b.mjs`: troque o import por `import { CORES_ESPORO, ESPOROS, PUPAS, reduzir as reduzirBuf } from './_mao-f4b.mjs';` e troque a função `reduzir` local inteira por:

```js
/** A generated piece brought down to `alto` px (`_mao-f4b.mjs`), as an `img`. */
const reduzir = async (arq, alto) => img(await reduzirBuf(arq, alto));
```

Run: `node scripts/_elites/_folha-f4b.mjs`
Expected: as 4 folhas reescritas, iguais às de antes.

- [x] **Step 3: O instalador da rodada**

Create `scripts/_elites/_instalar-f4b.mjs`:

```js
// 14/10 — INSTALLS the pieces of the F4 round of 14/10 (spec fatia F4 §9.2–9.4), the ones he picked on the sheets:
// the pupa P1 (hand-drawn; same keys as the old one), the spore G4 (generated, reduced), the spore grain that clings
// to the slowed ship, and the Tube's two root feet (chamber A's border and the blue ribs).
//   node scripts/_elites/_instalar-f4b.mjs
import sharp from 'sharp';
import { PUPAS, graoDeEsporo, peDoTubo, reduzir } from './_mao-f4b.mjs';

const OUT = 'public/sprites';
const [escura, acesa] = await PUPAS['P1 crisálida em anéis']();
await sharp(escura).toFile(`${OUT}/elite-pupa-0.png`);
await sharp(acesa).toFile(`${OUT}/elite-pupa-1.png`);
await sharp(await reduzir('docs/superpowers/folhas/2026-10-14/f4/cand/esporoNuvem-41-31.png', 9)).toFile(`${OUT}/elite-esporo.png`);
await sharp(await graoDeEsporo()).toFile(`${OUT}/elite-esporo-grao.png`);
await sharp(await peDoTubo(`${OUT}/f4-faixa-a.png`, 14)).toFile(`${OUT}/elite-tubo-pe-a.png`);
await sharp(await peDoTubo(`${OUT}/f4-faixa-b.png`, 21)).toFile(`${OUT}/elite-tubo-pe-b.png`);
console.log('elite-pupa-0..1 (P1), elite-esporo (G4), elite-esporo-grao, elite-tubo-pe-a, elite-tubo-pe-b');
```

Run: `node scripts/_elites/_instalar-f4b.mjs`
Expected: a linha do `console.log`; os 6 PNGs em `public/sprites/`.

- [x] **Step 4: O instalador antigo para de escrever a pupa e o anel**

Em `scripts/_elites/_instalar-f4.mjs`: troque o import para `import { mosca, buraco } from './_mao-f4.mjs';`, apague as linhas `await escrever(await pupa(), 'elite-pupa');` e `await sharp(await tiroAnel()).toFile(\`${OUT}/tiros/elite-anel.png\`);`, e troque o `console.log` delas por:

```js
console.log('peças à mão: elite-mosca-0..1, elite-buraco-0..8 (0–4 abre, 5–8 cicatriz) — a pupa e o esporo são do _instalar-f4b.mjs (14/10)');
```

Delete `public/sprites/tiros/elite-anel.png`.

- [x] **Step 5: As chaves no `BootScene`**

Em `src/scenes/BootScene.ts`, troque as duas linhas do tiro do anel (o comentário `// O TIRO DA F4 (à mão, rascunho de 13/10)…` e `eliteTiroAnel: 'sprites/tiros/elite-anel.png',`) por:

```ts
  // A RODADA DE 14/10 DA F4 (spec F4 §9): o ESPORO do Tubo (o G4, gerado e reduzido), o GRÃO que gruda na nave lenta e
  // os PÉS DE RAÍZES do Tubo (um por borda: a da câmara A e a das costelas azuis). `scripts/_elites/_instalar-f4b.mjs`.
  eliteEsporo: 'sprites/elite-esporo.png',
  eliteEsporoGrao: 'sprites/elite-esporo-grao.png',
  eliteTuboPeA: 'sprites/elite-tubo-pe-a.png',
  eliteTuboPeB: 'sprites/elite-tubo-pe-b.png',
```

- [x] **Step 6: Conferir os pés a olho**

Abra `public/sprites/elite-tubo-pe-a.png` e `-b.png` ampliados (8×, `sharp … resize kernel nearest` para o scratchpad) e confira: a gola cobre a faixa central, as raízes descem dos dois lados, as cores de baixo são as da placa. Se uma raiz sair cortada na borda do quadro, troque a `seed` em `_instalar-f4b.mjs` e rode de novo.

- [ ] **Step 7: Commit (só quando ele pedir)**

```bash
git add scripts/_elites/_mao-f4b.mjs scripts/_elites/_folha-f4b.mjs scripts/_elites/_instalar-f4b.mjs scripts/_elites/_instalar-f4.mjs scripts/_elites/_gerar-f4.mjs src/scenes/BootScene.ts public/sprites/elite-pupa-0.png public/sprites/elite-pupa-1.png public/sprites/elite-esporo.png public/sprites/elite-esporo-grao.png public/sprites/elite-tubo-pe-a.png public/sprites/elite-tubo-pe-b.png docs/superpowers/folhas/2026-10-14/
git rm public/sprites/tiros/elite-anel.png
git commit -m "feat(elites): a arte da rodada de 14/10 da F4 — a pupa P1 (a crisálida em anéis, à mão), o esporo G4 (gerado e reduzido), o grão que gruda na nave e os pés de raízes do Tubo (um por borda); as folhas de candidatas do dia; sai o tiro do anel"
```

---

### Task 3: A lentidão no voo

**Files:**
- Modify: `src/systems/cartas/Dash.ts` (getter novo, perto de `intocavel`)
- Modify: `src/systems/CartasEmJogo.ts:202-217`
- Modify: `src/scenes/GameScene.ts` (campo `lentaAte`, o reset em ~291, a chamada em ~795)

**Interfaces:**
- Consumes: `fatorDeVelocidade(agora, lentaAte)` (Task 1).
- Produces: `GameScene.lentaAte: number` (ms de `this.time.now`; a Task 4 escreve nele), `Dash.avancando: boolean`, `CartasEmJogo.tick(time, dt, elapsed, livre, body, input, fatorVel = 1)`.

- [x] **Step 1: O Dash diz quando está avançando**

Em `src/systems/cartas/Dash.ts`, logo depois do método `intocavel`, acrescente:

```ts
  /** Avançando agora? Durante o avanço o teto de velocidade é dele — os Propulsores e a lentidão não mexem. */
  get avancando(): boolean {
    return this.c.h.scene.time.now < this.ate;
  }
```

- [x] **Step 2: O teto do voo livre sai sempre do `tick`**

Em `src/systems/CartasEmJogo.ts`, troque a assinatura do `tick` por:

```ts
  tick(time: number, dt: number, elapsed: number, livre: boolean, body: Phaser.Physics.Arcade.Body, input: InputState, fatorVel = 1): void {
```

e troque as linhas dos Propulsores:

```ts
    // PROPULSORES: só no voo livre (a F1 é impulso, e a carta nem aparece nela).
    const prop = quantas(this.reg, 'MOV_001');
    if (livre && prop) body.setMaxVelocity(VELOCIDADE_LIVRE * (1 + NUMEROS.propulsores.porCopia * prop));
```

por:

```ts
    // O TETO DO VOO LIVRE sai daqui a cada quadro: os PROPULSORES (só no voo livre — a F1 é impulso, e a carta nem
    // aparece nela) e a LENTIDÃO do esporo da F4 (`fatorVel`, spec F4 §9.3). Durante o avanço do DASH o teto é dele: ele
    // não é freado (é a saída). ⚠️ Antes, com os Propulsores, esta linha rodava também durante o dash e o teto dela
    // prendia o avanço já no 2º quadro.
    const prop = quantas(this.reg, 'MOV_001');
    if (livre && !this.dash.avancando) body.setMaxVelocity(VELOCIDADE_LIVRE * (1 + NUMEROS.propulsores.porCopia * prop) * fatorVel);
```

- [x] **Step 3: A cena guarda até quando a nave está lenta**

Em `src/scenes/GameScene.ts`:
- perto de `private corredorTimer = 0;` (~linha 162), acrescente:

```ts
  /** Até quando (ms de `time.now`) a nave voa LENTA — o esporo do Tubo (spec F4 §9.3). */
  private lentaAte = 0;
```

- no reset do `create` (logo depois de `this.corredorTimer = 0;`, ~linha 293), acrescente `this.lentaAte = 0;`
- troque a chamada `this.cartas.tick(time, dt, this.elapsed, this.controller.id === 'free', body, input);` por:

```ts
    this.cartas.tick(time, dt, this.elapsed, this.controller.id === 'free', body, input, fatorDeVelocidade(this.time.now, this.lentaAte));
```

- a cena ainda não importa das regras: crie a linha `import { fatorDeVelocidade, lentidaoAte } from '../elitesRegras';` junto dos outros imports (o `lentidaoAte` é usado na Task 4; se o lint reclamar de import sem uso até lá, ponha só o `fatorDeVelocidade` agora).

- [x] **Step 4: Conferir**

Run: `npx tsc --noEmit` — Expected: só os erros do `Tubo.ts` (`tirosN`/`velTiro`), que a Task 4 resolve.
Run: `node scripts/probe-elites.mjs` (com `npm run dev`) — Expected: verde (o dash e os Propulsores das sondas das cartas, se houver, seguem passando).

- [ ] **Step 5: Commit (só quando ele pedir)**

```bash
git add src/systems/cartas/Dash.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts
git commit -m "feat(voo): a lentidão — o teto do voo livre sai a cada quadro dos Propulsores × o fator da lentidão, e o Dash avança livre dos dois (antes o teto dos Propulsores prendia o dash no 2º quadro)"
```

---

### Task 4: Os esporos do Tubo

**Files:**
- Create: `src/entities/elites/Esporos.ts`
- Modify: `src/entities/elites/tipos.ts` (`GanchosElite`)
- Modify: `src/systems/EnemySystem.ts:286-292`
- Modify: `src/entities/elites/Tubo.ts`
- Modify: `src/scenes/GameScene.ts` (criar, ligar, overlap, atualizar)

**Interfaces:**
- Consumes: `esporoAvanco`, `esporoBalanco`, `esporoAlfa`, `esporoVivo`, `lentidaoAte` (Task 1); a textura `eliteEsporo`, `eliteEsporoGrao` (Task 2); `GameScene.lentaAte` (Task 3).
- Produces: `class Esporos { readonly grupo: Phaser.Physics.Arcade.Group; soltar(x, y, ang): void; atualizar(dt, nave, lenta): void; tocar(e): boolean }`; o gancho `GanchosElite.soltarEsporo(x: number, y: number, ang: number): void`.

- [x] **Step 1: O sistema**

Create `src/entities/elites/Esporos.ts`:

```ts
import type Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { esporoAlfa, esporoAvanco, esporoBalanco, esporoVivo } from '../../elitesRegras';

const E = ELITES.esporo;
/** Na camada dos inimigos: o esporo está no ar do corredor, na frente da borda e das mesas. */
const DEPTH = 0.2;
/** Os grãos grudados na nave lenta: quantos, e a que distância do centro dela. */
const GRAOS = 3;
const RAIO_GRAO = 7;

interface EstadoEsporo {
  t: number;
  ox: number;
  oy: number;
  ang: number;
  fase: number;
  periodo: number;
  /** Quanto o cenário já o levou para a esquerda (px). */
  deriva: number;
  tocado: boolean;
}

/**
 * OS ESPOROS do Tubo (spec F4 §9.3): saem no rumo do pulso, FREIAM e passam a andar com o cenário, pairando — uma ÁREA
 * do corredor, não um tiro. NÃO ferem: encostar deixa a nave lenta (a cena, `GameScene.tocarEsporo`). Vivem num grupo
 * PRÓPRIO, fora dos tiros dos elites (que ferem) e dos inimigos (que as cartas miram e o tiro acerta): o tiro os
 * atravessa, a bomba não os apaga, o míssil não trava neles.
 */
export class Esporos {
  readonly grupo: Phaser.Physics.Arcade.Group;
  private readonly graos: Phaser.GameObjects.Image[] = [];
  private relogio = 0;

  constructor(
    private readonly cena: Phaser.Scene,
    /** A velocidade (px/s, para a esquerda) com que o cenário rola — a da parede. */
    private readonly velCenario: () => number,
  ) {
    this.grupo = cena.physics.add.group({ allowGravity: false });
  }

  soltar(x: number, y: number, ang: number): void {
    const e = this.grupo.create(x, y, 'eliteEsporo') as Phaser.Physics.Arcade.Sprite;
    e.setDepth(DEPTH);
    (e.body as Phaser.Physics.Arcade.Body).setSize(E.corpo, E.corpo, true);
    const s: EstadoEsporo = {
      t: 0,
      ox: x,
      oy: y,
      ang,
      fase: Math.random() * Math.PI * 2,
      periodo: E.balancoS[0] + Math.random() * (E.balancoS[1] - E.balancoS[0]),
      deriva: 0,
      tocado: false,
    };
    e.setData('esporo', s);
  }

  /** Por quadro: o voo, o balanço e o sumiço de cada esporo; e os grãos grudados enquanto a nave está `lenta`. */
  atualizar(dt: number, nave: Phaser.GameObjects.Sprite, lenta: boolean): void {
    this.relogio += dt;
    for (const obj of [...this.grupo.getChildren()]) {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      const s = e.getData('esporo') as EstadoEsporo;
      s.t += dt;
      // O cenário o leva junto à medida que ele freia: parado no ar, ele anda com a parede.
      s.deriva += this.velCenario() * dt * Math.min(1, s.t / E.freiaS);
      const d = esporoAvanco(s.t);
      const b = esporoBalanco(s.t, s.fase, s.periodo);
      const x = s.ox + Math.cos(s.ang) * d - s.deriva + b.dx;
      if (!esporoVivo(s.t) || x < -16) {
        e.destroy();
        continue;
      }
      e.setPosition(Math.round(x), Math.round(s.oy + Math.sin(s.ang) * d + b.dy));
      if (!s.tocado) e.setAlpha(esporoAlfa(s.t));
    }
    this.grudar(nave, lenta);
  }

  /** A nave encostou em `e`: conta UMA vez — ele perde o corpo e se desfaz num sopro. Devolve se contou. */
  tocar(e: Phaser.Physics.Arcade.Sprite): boolean {
    const s = e.getData('esporo') as EstadoEsporo | undefined;
    if (!s || s.tocado) return false;
    s.tocado = true;
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cena.tweens.add({ targets: e, alpha: 0, duration: 150, onComplete: () => e.destroy() });
    return true;
  }

  /**
   * O SINAL DA LENTIDÃO: grãos de esporo grudados na nave, girando devagar em volta dela. ⚠️ Nunca `setTint` na nave:
   * tint sobre arte escura repinta em vez de insinuar.
   */
  private grudar(nave: Phaser.GameObjects.Sprite, lenta: boolean): void {
    if (!this.graos.length) {
      for (let i = 0; i < GRAOS; i++) this.graos.push(this.cena.add.image(0, 0, 'eliteEsporoGrao').setVisible(false));
    }
    this.graos.forEach((g, i) => {
      g.setVisible(lenta);
      if (!lenta) return;
      const a = this.relogio * 1.6 + (i * Math.PI * 2) / GRAOS;
      g.setDepth(nave.depth + 1);
      g.setPosition(Math.round(nave.x + Math.cos(a) * RAIO_GRAO), Math.round(nave.y + Math.sin(a) * RAIO_GRAO * 0.5));
    });
  }
}
```

- [x] **Step 2: O gancho**

Em `src/entities/elites/tipos.ts`, dentro de `GanchosElite`, depois de `velFundo`, acrescente:

```ts
  /** Solta um ESPORO em (x, y) no rumo `ang` (o Tubo, spec F4 §9.3). Ele não é tiro nem inimigo: vive nos `Esporos`. */
  soltarEsporo: (x: number, y: number, ang: number) => void;
```

Em `src/systems/EnemySystem.ts`, no objeto `ganchos` padrão (~linha 291), acrescente `soltarEsporo: () => {},` depois de `velFundo: () => 0,`.

- [x] **Step 3: O Tubo solta esporos**

Em `src/entities/elites/Tubo.ts`:
- tire `PadroesDeTiro` do import e as linhas do `vestirArteAnel`/`vestirAnel` (o comentário `A BOLHA do anel…` e as duas constantes);
- troque o comentário de cima do `TUBO` (a frase `INCHA (o aviso) → PULSA um meio-anel de tiros lentos para dentro do corredor;`) por `INCHA (o aviso) → PULSA uma nuvem de ESPOROS para dentro do corredor (spec F4 §9.3: não ferem, deixam a nave lenta);`;
- troque a função `pulsar` inteira por:

```ts
/** O PULSO: o meio-leque de esporos sai do miolo, para dentro do corredor (`tuboAngulos`). */
function pulsar(e: Sprite, s: Estado, ctx: CtxElite): void {
  const cy = e.y + (s.teto ? MIOLO : -MIOLO);
  for (const ang of tuboAngulos(s.pulsos, s.teto)) {
    ctx.ganchos.soltarEsporo(e.x + Math.cos(ang) * RAIO_BOCA, cy + Math.sin(ang) * RAIO_BOCA, ang);
  }
  s.pulsos++;
}
```

- troque `/** Os tiros nascem a este raio do miolo, já fora da boca. */` por `/** Os esporos nascem a este raio do miolo, já fora da boca. */`.

- [x] **Step 4: A cena liga tudo**

Em `src/scenes/GameScene.ts`:
- import: `import { Esporos } from '../entities/elites/Esporos';` e confira que o `lentidaoAte` está no import de `../elitesRegras` (criado na Task 3);
- campo, perto de `lentaAte`: `private esporos!: Esporos;`
- logo depois de `this.moldura = new Moldura(this, this.stage.id === 4);` (~linha 350): 

```ts
    // Os ESPOROS do Tubo da F4 (spec F4 §9.3) andam com a parede, à velocidade do cenário.
    this.esporos = new Esporos(this, () => SCROLL_SPEED);
```

- no objeto passado a `this.enemies.ligarElites({ … })`, depois de `velFundo: …,`, acrescente:

```ts
      soltarEsporo: (x, y, ang) => this.esporos.soltar(x, y, ang),
```

- depois de `this.physics.add.overlap(this.ship, this.enemies.enemies, () => this.damageShip());` (~linha 564):

```ts
    // O ESPORO NÃO FERE (spec F4 §9.3): encostar deixa a nave lenta. Nenhum overlap com os tiros do jogador — o tiro
    // atravessa.
    this.physics.add.overlap(this.ship, this.esporos.grupo, (_s, e) => this.tocarEsporo(e as Phaser.Physics.Arcade.Sprite));
```

- depois de `this.enemies.update(dt, this.ship);` (~linha 848):

```ts
    this.esporos.atualizar(dt, this.ship, this.time.now < this.lentaAte);
```

- perto de `damageShip` (~linha 2439), acrescente o método:

```ts
  /**
   * Um ESPORO tocou a nave (spec F4 §9.3): sem dano — ela voa lenta por `lentidao.duracaoS`, e outro toque renova (não
   * soma). Durante o dash a nave é intocável e o esporo não pega: o dash é a saída.
   */
  private tocarEsporo(e: Phaser.Physics.Arcade.Sprite): void {
    if (this.over || this.cartas.intocavel(this.time.now)) return;
    if (this.esporos.tocar(e)) this.lentaAte = lentidaoAte(this.time.now, this.lentaAte);
  }
```

- [x] **Step 5: Conferir**

Run: `npx tsc --noEmit` — Expected: limpo. Run: `node scripts/test-elites-regras.mjs` — Expected: `TUDO OK`.
No navegador (`?sandbox`, fase 4, `tubo` 1): o Tubo incha e solta uma nuvem verde que freia e anda com a parede; encostar deixa a nave lenta, com os grãos girando nela, sem perder vida.

- [ ] **Step 6: Commit (só quando ele pedir)**

```bash
git add src/entities/elites/Esporos.ts src/entities/elites/tipos.ts src/systems/EnemySystem.ts src/entities/elites/Tubo.ts src/scenes/GameScene.ts
git commit -m "feat(elites): o Tubo de ESPOROS — o pulso solta uma nuvem que freia e anda com o cenário, pairando; encostar não fere, deixa a nave 40% mais lenta por 2,5s (renova, não soma), com os grãos grudados nela; o tiro atravessa o esporo"
```

---

### Task 5: O Tubo preso à borda (o pé de raízes)

**Files:**
- Modify: `src/systems/Moldura.ts` (método público novo, perto de `superficieTetoEm`, ~linha 742)
- Modify: `src/entities/elites/tipos.ts` (`ParedeElite`)
- Modify: `src/systems/EnemySystem.ts:290`
- Modify: `src/scenes/GameScene.ts` (o objeto `parede` dos ganchos, ~linha 381)
- Modify: `src/entities/elites/Tubo.ts`

**Interfaces:**
- Consumes: as texturas `eliteTuboPeA`/`eliteTuboPeB` (Task 2), `PE.SUP = 3`, `PE.H = 11`; `ELITES.tubo.afunda = 5` (Task 1).
- Produces: `Moldura.faixaEm(xTela: number, teto: boolean): string`; `ParedeElite.faixa(xTela: number, teto: boolean): string`.

- [x] **Step 1: A borda diz qual é a placa**

Em `src/systems/Moldura.ts`, depois de `superficieTetoEm`, acrescente:

```ts
  /** A BORDA (a chave da textura) da placa em `xTela`, a do chão ou a do teto — o pé do Tubo veste a cor dela. */
  faixaEm(xTela: number, teto: boolean): string {
    const p = this.placaEm(xTela);
    return teto ? p.faixaTeto : p.faixaChao;
  }
```

- [x] **Step 2: O gancho**

Em `src/entities/elites/tipos.ts`, dentro de `ParedeElite`, depois de `superficie`, acrescente:

```ts
  /** A chave da borda da placa em `xTela` (`f4FaixaA`, `f4FaixaB`…): o pé do Tubo veste a cor dela (spec F4 §9.4). */
  faixa: (xTela: number, teto: boolean) => string;
```

Em `src/systems/EnemySystem.ts`, no `parede` padrão, acrescente `faixa: () => '',` depois de `superficie: …,`.
Em `src/scenes/GameScene.ts`, no `parede` dos ganchos, depois de `superficie: …,`, acrescente:

```ts
        faixa: (x, teto) => this.moldura.faixaEm(x, teto),
```

- [x] **Step 3: O Tubo ganha o pé**

Em `src/entities/elites/Tubo.ts`:
- acrescente, depois de `const RAIO_BOCA = 10;`:

```ts
/**
 * O PÉ DE RAÍZES (spec F4 §9.4): um sprite à parte, 52×11, desenhado para o chão com a linha da superfície na linha 3
 * (`scripts/_elites/_mao-f4b.mjs` → `PE`). Na FRENTE do Tubo: a gola cobre o pé reto dele e as raízes descem para
 * dentro da borda. Um por borda — a das costelas azuis (`f4FaixaB`) tem o dela; as outras, o da câmara A.
 */
const PE_SUP = 3, PE_H = 11;
const peDaBorda = (faixa: string): string => (faixa.replace(/\d+$/, '') === 'f4FaixaB' ? 'eliteTuboPeB' : 'eliteTuboPeA');
```

- na interface `Estado`, acrescente: `/** O pé de raízes (nasce no plantio). */ pe: Phaser.GameObjects.Image | null;`
- no `iniciar`, no objeto `s`, acrescente `pe: null,`; e depois de `e.setData('elite', s);`, acrescente `e.once('destroy', () => s.pe?.destroy());`
- no `noChao`, troque a última linha `e.setPosition(x, s.teto ? sup - T.afunda : sup + T.afunda);` por:

```ts
    e.setPosition(x, s.teto ? sup - T.afunda : sup + T.afunda);
    s.pe?.setPosition(x, sup);
```

- na função `plantar`, antes de `TUBO.noChao!(e, 0, ctx);`, acrescente:

```ts
  const xTela = ctx.ganchos.parede.telaDe(xMundo);
  s.pe = e.scene.add
    .image(xTela, 0, peDaBorda(ctx.ganchos.parede.faixa(xTela, s.teto)))
    .setFlipY(s.teto)
    .setOrigin(0.5, s.teto ? 1 - PE_SUP / PE_H : PE_SUP / PE_H)
    .setDepth(e.depth + 0.01);
```

- [x] **Step 4: Conferir**

Run: `npx tsc --noEmit` — Expected: limpo.
No sandbox (fase 4, `tubo`): o pé aparece sob o Tubo, no chão e no teto, e rola com ele.

- [ ] **Step 5: Commit (só quando ele pedir)**

```bash
git add src/systems/Moldura.ts src/entities/elites/tipos.ts src/systems/EnemySystem.ts src/scenes/GameScene.ts src/entities/elites/Tubo.ts
git commit -m "feat(elites): o Tubo preso à borda — afunda 5px e ganha o pé de raízes à mão (um por borda, a cor da placa onde ele nasce), que cobre o pé reto e desce para dentro da faixa"
```

---

### Task 6: A pupa que treme e a mosca desorganizada

**Files:**
- Modify: `src/entities/elites/Pupa.ts`

**Interfaces:**
- Consumes: `pupaTremor`, `moscaTremor` (Task 1); `ELITES.mosca.tremorHz`.

- [x] **Step 1: A pupa**

Em `src/entities/elites/Pupa.ts`:
- import: `import { moscaPersegue, moscaTremor, pupaEclode, pupaQuadro, pupaTremor, pupaVoo } from '../../elitesRegras';`
- troque `const CORPO_PUPA = { w: 5, h: 6 };` e o comentário das hitboxes por:

```ts
/** As hitboxes, fixas: o miolo da pupa P1 (7×12; 14/10) e o corpo da mosca (9×6, sem as asas). */
const CORPO_PUPA = { w: 5, h: 7 };
```

- no `atualizar` da PUPA, troque `e.setPosition(s.ox + Math.cos(s.ang) * d, s.oy + Math.sin(s.ang) * d);` por:

```ts
    // O TREMOR (spec F4 §9.2): nos últimos instantes ela treme ±1px — o aviso de que vai eclodir. Ela não sai do lugar.
    e.setPosition(s.ox + Math.cos(s.ang) * d + pupaTremor(s.t), s.oy + Math.sin(s.ang) * d);
```

- [x] **Step 2: A mosca**

Ainda em `Pupa.ts`, troque o `MOSCA` inteiro por:

```ts
interface EstadoMosca {
  t: number;
  /** A fase e o ritmo do tremor DESTA mosca (§9.6): cada uma voa desorganizada do seu jeito. */
  fase: number;
  hz: number;
}

/**
 * A MOSCA (spec F4 §2.2 e §9.6): nasce da pupa num rumo SORTEADO e voa em curva na direção da nave — a perseguição do
 * kamikaze (aceleração, com inércia), mais lenta — com um TREMOR lateral, cada uma no seu ritmo: chega, mas
 * desorganizada. Passou da nave sem acertar: para de perseguir, segue reto e sai da tela. A arte é pequena demais
 * para girar: ela só bate a asa, virada para a esquerda.
 */
export const MOSCA: ComportamentoElite = {
  iniciar(e) {
    e.setFlipX(false);
    vestir(e, 'eliteMoscaAnim0', CORPO_MOSCA);
    const s: EstadoMosca = { t: 0, fase: Math.random() * Math.PI * 2, hz: M.tremorHz[0] + Math.random() * (M.tremorHz[1] - M.tremorHz[0]) };
    e.setData('elite', s);
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(M.velMax, M.velMax);
    const ang = Math.random() * Math.PI * 2;
    body.setVelocity(Math.cos(ang) * M.velInicial, Math.sin(ang) * M.velInicial);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoMosca;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    if (moscaPersegue(e.x, ctx.alvo.x)) {
      const ang = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
      const lado = moscaTremor(s.t, s.fase, s.hz);
      body.setAcceleration(Math.cos(ang) * M.perseguicao - Math.sin(ang) * lado, Math.sin(ang) * M.perseguicao + Math.cos(ang) * lado);
    } else {
      body.setAcceleration(0, 0);
    }
    const chave = `eliteMoscaAnim${Math.floor(s.t / M.bateAsaS) % 2}`;
    if (e.texture.key !== chave) vestir(e, chave, CORPO_MOSCA);
  },
};
```

- [x] **Step 3: Conferir**

Run: `npx tsc --noEmit` — Expected: limpo.

- [ ] **Step 4: Commit (só quando ele pedir)**

```bash
git add src/entities/elites/Pupa.ts
git commit -m "feat(elites): a pupa treme ±1px nos últimos 0,6s antes de eclodir; a mosca nasce num rumo sorteado e persegue com um tremor lateral, cada uma no seu ritmo"
```

---

### Task 7: O buraco só em superfície, e a Larva que chega e sai por um tranco

**Files:**
- Modify: `src/entities/elites/tipos.ts` (`Ancora`, `LugarElite`, gancho `lugaresDeBuraco`; sai `velFundo`)
- Modify: `src/systems/EnemySystem.ts:286-292`
- Modify: `src/scenes/GameScene.ts` (ganchos; método `lugaresDeBuraco`)
- Modify: `src/entities/elites/Buraco.ts`
- Modify: `src/entities/elites/Larva.ts`

**Interfaces:**
- Consumes: `escolherLugar`, `LugarDeBuraco`, `larvaAvanca` novo, `ELITES.buraco.{colunas,naBordaPx,naMesaPx,folgaMesa}` (Task 1).
- Produces: `type Ancora = () => { x: number; y: number } | null`; `interface LugarElite extends LugarDeBuraco { ancora: Ancora }`; `GanchosElite.lugaresDeBuraco(): LugarElite[]`; `abrirBuraco(cena, ancora: Ancora): Buraco`.

- [x] **Step 1: Os tipos e o gancho**

Em `src/entities/elites/tipos.ts`:
- troque o import das regras por `import type { LugarDeBuraco, PlantioMesas, Vao } from '../../elitesRegras';`
- antes de `GanchosElite`, acrescente:

```ts
/** Onde algo preso a uma superfície está AGORA (y de tela); `null` = a superfície sumiu (a mesa saiu da tela). */
export type Ancora = () => { x: number; y: number } | null;

/** Um lugar de buraco da Larva (spec F4 §9.5) com a superfície dele: a borda ou uma mesa, que rolam com o mundo. */
export interface LugarElite extends LugarDeBuraco {
  ancora: Ancora;
}
```

- em `GanchosElite`, troque o `velFundo` (o comentário e a linha) por:

```ts
  /**
   * Onde o buraco da Larva pode abrir AGORA (spec F4 §9.5): a face da borda (chão e teto) e a de cada mesa, na metade
   * direita. Nunca a pintura do fundo. Vazio fora da F4.
   */
  lugaresDeBuraco: () => LugarElite[];
```

Em `src/systems/EnemySystem.ts`, no `ganchos` padrão, troque `velFundo: () => 0,` por `lugaresDeBuraco: () => [],`.

- [x] **Step 2: A cena oferece os lugares**

Em `src/scenes/GameScene.ts`:
- imports (a cena ainda não tem nenhum dos dois): `import type { LugarElite } from '../entities/elites/tipos';` e `import { ELITES } from '../data/numerosElites';`;
- nos ganchos, troque `velFundo: () => SCROLL_SPEED * this.parallax.fatorPintura,` por `lugaresDeBuraco: () => this.lugaresDeBuraco(),`;
- perto de `tocarEsporo`, acrescente:

```ts
  /**
   * Onde o buraco da Larva pode abrir agora (spec F4 §9.5, ele: *"o verme tem que sair da borda"*): a face da BORDA,
   * no chão e no teto, nas colunas da metade direita que nenhuma mesa tapa, e a face de cada MESA na metade direita, a
   * `naMesaPx` da beira que dá para o corredor. Nunca a pintura do fundo — nem no duto, onde a borda é a parede grossa.
   * Cada lugar leva a sua ÂNCORA: a borda segue a grade de mundo das placas (`telaDe`), a mesa segue o sprite dela.
   */
  private lugaresDeBuraco(): LugarElite[] {
    const B = ELITES.buraco;
    const mesas = (this.terrain.props.getChildren() as Phaser.Physics.Arcade.Sprite[]).filter(
      (p) => p.active && (p.getData('kind') === 'mesa' || p.getData('kind') === 'mesaMar'),
    );
    const lugares: LugarElite[] = [];
    for (const x of B.colunas) {
      if (mesas.some((m) => Math.abs(m.x - x) < m.displayWidth / 2 + B.folgaMesa)) continue;
      const xMundo = this.moldura.mundoDe(x);
      for (const teto of [false, true]) {
        const ancora = (): { x: number; y: number } | null => {
          const xt = this.moldura.telaDe(xMundo);
          if (xt < -128) return null;
          const sup = teto ? this.moldura.superficieTetoEm(xt) : this.moldura.superficieChaoEm(xt);
          return { x: xt, y: teto ? sup - B.naBordaPx : sup + B.naBordaPx };
        };
        const p = ancora();
        if (p) lugares.push({ ...p, ancora });
      }
    }
    for (const m of mesas) {
      if (m.x < B.colunas[0] || m.x > B.colunas[B.colunas.length - 1]) continue;
      // A mesa do teto é ancorada pelo topo (origem y = 0); a do chão, pelo pé.
      const teto = m.originY === 0;
      const ancora = (): { x: number; y: number } | null =>
        m.active ? { x: m.x, y: teto ? m.y + m.displayHeight - B.naMesaPx : m.y - m.displayHeight + B.naMesaPx } : null;
      lugares.push({ ...ancora()!, ancora });
    }
    return lugares;
  }
```

- [x] **Step 3: O buraco segue a âncora**

Em `src/entities/elites/Buraco.ts`: import `import type { Ancora } from './tipos';`; troque o `DEPTH` e o comentário dele por:

```ts
/**
 * NA FRENTE DA SUPERFÍCIE onde ele abre — a borda (−0,6) ou a mesa (−0,5) —, atrás dos inimigos (spec F4 §9.5).
 * ⚠️ Até 13/10 ele abria na PINTURA do fundo e andava com ela; ele cortou (14/10): *"deixar que ele saia na imagem de
 * fundo é fazer a animação no layer do jogador, mas tendo como base o fundo que é o último layer"*.
 */
const DEPTH = -0.45;
```

e troque a função `abrirBuraco` inteira (e o comentário dela) por:

```ts
/**
 * O BURACO da Larva (spec F4 §2.1 e §9.5): quadros assados em pixel (`scripts/_elites/_mao-f4.mjs`), o quadro saindo
 * do relógio dele (`buracoQuadro`). Abre numa SUPERFÍCIE (a borda ou uma mesa) e a segue pela `ancora` enquanto
 * existe; sumiu a superfície (a mesa saiu da tela), ele fica onde estava. Tem VIDA PRÓPRIA — a cicatriz some ~1s
 * depois de ela mergulhar, ou morrer. Não fere, não bloqueia.
 */
export function abrirBuraco(cena: Phaser.Scene, ancora: Ancora): Buraco {
  const p0 = ancora() ?? { x: -999, y: -999 };
  const img = cena.add.image(Math.round(p0.x), Math.round(p0.y), `${PREFIXO}0`).setDepth(DEPTH);
  img.setData('buraco', 'abre');
  let fase: 'abre' | 'fecha' = 'abre';
  let t = 0;
  const passo = (_agora: number, dms: number): void => {
    t += dms / 1000;
    const p = ancora();
    if (p) img.setPosition(Math.round(p.x), Math.round(p.y));
    const q = buracoQuadro(fase, t);
    if (q === null) {
      soltar();
      img.destroy();
      return;
    }
    img.setTexture(`${PREFIXO}${q}`);
  };
  const soltar = (): void => {
    cena.events.off('update', passo);
    cena.events.off('shutdown', soltar);
  };
  cena.events.on('update', passo);
  cena.events.once('shutdown', soltar);
  return {
    fechar() {
      if (fase === 'fecha') return;
      fase = 'fecha';
      t = 0;
      img.setData('buraco', 'fecha');
    },
  };
}
```

- [x] **Step 4: A Larva chega e sai pela superfície**

Em `src/entities/elites/Larva.ts`:
- imports:

```ts
import { escolherLugar, larvaAvanca, larvaPosto, larvaQuadro, larvaTangivel, pupaAngulos, varianteDe, type ClipeLarva, type EstadoLarva } from '../../elitesRegras';
import { abrirBuraco, type Buraco } from './Buraco';
import { lancarPupa } from './Pupa';
import { vestir, type Ancora, type ComportamentoElite, type CtxElite, type LugarElite, type Sprite } from './tipos';
```

- na interface `Estado`, depois de `buraco`, acrescente:

```ts
  /** A superfície do buraco em uso (o de chegada, depois o de saída): ela a segue enquanto sai ou entra nele. */
  ancora: Ancora | null;
```

- troque o comentário de cima do `LARVA` por:

```ts
/**
 * A LARVA MECÂNICA (spec F4 §2 e §9.5): um BURACO abre numa SUPERFÍCIE — a face da borda ou de uma mesa, nunca a
 * pintura — (o aviso) → ela SAI dele → TRANCO até o 1º posto → PÕE 2 pupas na direção da nave → TRANCO para o posto
 * seguinte, em ziguezague na metade direita e sempre dentro do vão → (3 paradas) → TRANCO até a superfície mais perto
 * → PERFURA ali e MERGULHA. Não atira: o perigo é o campo de pupas (`Pupa.ts`). Saiu viva: sem pontos. Ela VOA; só
 * enquanto sai ou entra num buraco ela segue a superfície dele (que rola com o mundo). O gesto de cada estado sai do
 * relógio dele (`larvaQuadro`), sem animação do Phaser — travada pelo elétrico, ela congela na pose.
 */
```

- troque o `iniciar` inteiro por:

```ts
  iniciar(e, ctx) {
    const variante = varianteDe((e.getData('ordem') as number | undefined) ?? 0, VARIANTES);
    // O `x`/`y` do roteiro não valem para ela: nasce dentro de um buraco, numa superfície.
    const lugar = lugarDoBuraco(ctx, null);
    const p = { x: lugar.x, y: lugar.y };
    const s: Estado = { fase: 'abre', t: 0, variante, paradas: 0, posto: p, de: p, pupasPostas: false, buraco: null, ancora: lugar.ancora };
    e.setData('elite', s);
    // A arte já nasce virada para a esquerda: nada de espelhar.
    e.setFlipX(false);
    e.setPosition(p.x, p.y);
    vestir(e, `eliteLarva${variante}PoeAnim0`, CORPO);
    e.setVisible(false);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    s.buraco = abrirBuraco(e.scene, lugar.ancora);
    // Morta em qualquer estado, o buraco que estiver aberto fecha (o de saída, se ela morrer perfurando).
    e.once('destroy', () => s.buraco?.fechar());
  },
```

- no `atualizar`, troque o bloco do tranco:

```ts
    if (s.fase === 'tranco') {
      // O tranco não é ataque, é reposicionamento: arranca e assenta (§2.1).
      const u = Math.min(1, s.t / L.trancoS);
      const m = u * u * (3 - 2 * u);
      e.setPosition(s.de.x + (s.posto.x - s.de.x) * m, s.de.y + (s.posto.y - s.de.y) * m);
    }
```

por:

```ts
    // Saindo ou entrando num buraco, ela segue a superfície dele: a borda e a mesa rolam com o mundo.
    if (s.ancora && (s.fase === 'abre' || s.fase === 'sai' || s.fase === 'perfura' || s.fase === 'mergulha')) {
      const p = s.ancora();
      if (p) e.setPosition(p.x, p.y);
    }
    if (s.fase === 'tranco') {
      // O tranco não é ataque, é reposicionamento: arranca e assenta (§2.1). O da SAÍDA persegue o lugar do buraco,
      // que rola com a superfície.
      const alvo = (s.paradas >= L.paradas && s.ancora?.()) || s.posto;
      const u = Math.min(1, s.t / L.trancoS);
      const m = u * u * (3 - 2 * u);
      e.setPosition(s.de.x + (alvo.x - s.de.x) * m, s.de.y + (alvo.y - s.de.y) * m);
    }
```

- troque a função `entrar` inteira por:

```ts
function entrar(e: Sprite, s: Estado, fase: EstadoLarva, ctx: CtxElite): void {
  s.fase = fase;
  s.t = 0;
  if (fase === 'sai') {
    e.setVisible(true);
  } else if (fase === 'tranco') {
    // Parte de onde ESTÁ (o tranco do Tiro Pesado pode tê-la empurrado).
    s.de = { x: e.x, y: e.y };
    if (s.paradas === 0) {
      // Saiu inteira do buraco de chegada: ele fecha atrás dela, e ela arranca para o 1º posto.
      s.buraco?.fechar();
      s.buraco = null;
      s.ancora = null;
      s.posto = larvaPosto(Math.random, null, ctx.ganchos.vao);
    } else if (s.paradas >= L.paradas) {
      // A última parada acabou: o tranco a leva à SUPERFÍCIE mais perto, onde ela vai perfurar.
      const lugar = lugarDoBuraco(ctx, { x: e.x, y: e.y });
      s.ancora = lugar.ancora;
      s.posto = { x: lugar.x, y: lugar.y };
    } else {
      // Fugindo da altura do posto que deixa: o ziguezague.
      s.posto = larvaPosto(Math.random, s.posto.y, ctx.ganchos.vao);
    }
  } else if (fase === 'poe') {
    s.paradas++;
    s.pupasPostas = false;
    e.setPosition(s.posto.x, s.posto.y);
  } else if (fase === 'perfura') {
    // O buraco de SAÍDA abre na superfície aonde o tranco a levou, enquanto ela gira.
    const x = e.x, y = e.y;
    s.buraco = abrirBuraco(e.scene, s.ancora ?? (() => ({ x, y })));
  }
}

/**
 * Onde abre um buraco (spec F4 §9.5): só num lugar que a cena oferece (a borda ou uma mesa) — sorteado na chegada, o
 * mais perto dela na saída. Sem lugar nenhum (fora da F4, num sandbox sem borda): no chão do vão daquela coluna,
 * parado.
 */
function lugarDoBuraco(ctx: CtxElite, perto: { x: number; y: number } | null): LugarElite {
  const l = escolherLugar(ctx.ganchos.lugaresDeBuraco(), Math.random, perto ?? undefined);
  if (l) return l;
  const x = perto?.x ?? 300, y = ctx.ganchos.vao(x).chao;
  return { x, y, ancora: () => ({ x, y }) };
}
```

- [x] **Step 5: Conferir**

Run: `npx tsc --noEmit` — Expected: limpo (nenhum uso restante de `velFundo`: `grep -rn velFundo src` vazio).
Run: `node scripts/test-elites-regras.mjs` — Expected: `TUDO OK`.

- [ ] **Step 6: Commit (só quando ele pedir)**

```bash
git add src/entities/elites/tipos.ts src/systems/EnemySystem.ts src/scenes/GameScene.ts src/entities/elites/Buraco.ts src/entities/elites/Larva.ts
git commit -m "feat(elites): o buraco da Larva só abre numa superfície de verdade — a face da borda (chão e teto) ou de uma mesa, na metade direita, nunca a pintura do fundo, nem no duto — e anda com ela; a Larva sai dele e dá um tranco até o 1º posto, e depois da última parada um tranco até a superfície mais perto, onde perfura"
```

---

### Task 8: A sonda da F4 e as de sempre

**Files:**
- Modify: `scripts/probe-elites-f4.mjs`

- [x] **Step 1: Os registros de dentro da página**

No `page.evaluate` que instala os registros (o que cria `window.__disparos`), troque o bloco do `window.__disparos` por:

```js
  window.__esporos = [];
  const soltar = s.esporos.soltar.bind(s.esporos);
  s.esporos.soltar = (x, y, ang) => {
    window.__esporos.push({ x, y, ang });
    return soltar(x, y, ang);
  };
```

e troque o bloco do `window.__buracos` por (cada buraco guarda, ao nascer, as duas superfícies da coluna dele):

```js
  window.__buracos = [];
  const image = s.add.image.bind(s.add);
  s.add.image = (...a) => {
    const im = image(...a);
    queueMicrotask(() => {
      if (!im.getData('buraco')) return;
      window.__buracos.push(im);
      im.__nasceu = { x: im.x, y: im.y, chao: s.moldura.superficieChaoEm(im.x), teto: s.moldura.superficieTetoEm(im.x) };
    });
    return im;
  };
```

Em todo o arquivo, troque `window.__disparos` por `window.__esporos` e `T.tirosN` por `T.esporosN`.

- [x] **Step 2: O ciclo novo da Larva e o buraco na superfície**

Troque o `conferir` do ciclo por:

```js
  conferir(JSON.stringify(V.fases) === JSON.stringify(['abre', 'sai', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'perfura', 'mergulha']), 'o ciclo: buraco, sai, tranco ao 1º posto, 3 paradas, tranco à superfície, perfura, mergulha (§9.5)', V.fases);
```

Troque `if (st.fase === 'tranco' || st.fase === 'perfura') V.pupasNoPoe.push(…)` por (o 1º tranco é antes de qualquer pupa):

```js
        if ((st.fase === 'tranco' && V.fases.includes('poe')) || st.fase === 'perfura') V.pupasNoPoe.push(window.__nascidos.filter((k) => k === 'pupa').length);
```

e o esperado de `pupasNoPoe` passa a ser `[2, 4, 6, 6]` (o tranco da saída e o perfura veem as 6):

```js
  conferir(JSON.stringify(V.pupasNoPoe) === JSON.stringify([2, 4, 6, 6]), `${L.pupasPorParada} pupas por parada`, V.pupasNoPoe);
```

Depois do check `dois buracos (chegada e saída)…`, acrescente:

```js
  const lugares = await page.evaluate(() => window.__buracos.map((b) => b.__nasceu));
  conferir(lugares.length >= 2 && lugares.every((l) => l.y >= l.chao || l.y <= l.teto), 'todo buraco nasce NA BORDA (dentro da faixa do chão ou do teto), nunca no meio do vão (§9.5)', lugares);
```

Troque o bloco inteiro `// The hole rides the painting.` (o `page.evaluate` e os dois `conferir` dele) por:

```js
  // The hole rides its surface (the border here: the sandbox has no tables).
  const sup = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('larva', 100);
    await new Promise((r) => setTimeout(r, 100));
    const b = window.__buracos.at(-1);
    const xMundo = s.moldura.mundoDe(b.x);
    await new Promise((r) => setTimeout(r, 300));
    const textura = window.__um('larva').texture.key;
    return { desvio: Math.abs(b.x - Math.round(s.moldura.telaDe(xMundo))), andou: b.__nasceu.x - b.x, textura };
  });
  conferir(sup.desvio <= 1 && sup.andou > 15, 'o buraco anda com a borda onde abriu', sup);
  conferir(sup.textura.startsWith('eliteLarvaD'), 'a 2ª Larva é a variação D (as duas alternam)', sup.textura);
```

- [x] **Step 3: O Tubo de esporos, o pé e a lentidão**

No bloco do Tubo no chão: troque `(s.moldura.superficieChaoEm(e.x) + 2)` por `(s.moldura.superficieChaoEm(e.x) + T.afunda)` e a mensagem `(2px dentro)` por `(${T.afunda}px dentro)`; no do teto, `(s.moldura.superficieTetoEm(e.x) - 2)` por `(s.moldura.superficieTetoEm(e.x) - T.afunda)`.
Troque os dois `conferir` dos tiros (o `2 pulsos: … tiros` e o `o meio-anel do chão abre para CIMA, a 70 px/s`) por:

```js
  conferir(V.salvas.length === 2 && s1.length === T.esporosN && s2.length === T.esporosN - 1, `2 pulsos: ${T.esporosN} esporos e ${T.esporosN - 1}`, V.salvas.map((s) => s.length));
  conferir([...s1, ...s2].every((d) => Math.sin(d.ang) <= 1e-6), 'o leque do chão abre para CIMA', s1.map((d) => d.ang.toFixed(2)));
```

e, no teto, troque `'no TETO: espelhado, o pé na linha do teto, o anel abre para BAIXO'` por `'no TETO: espelhado, o pé na linha do teto, o leque abre para BAIXO'`. Antes do bloco `// ── Killed while swelling…`, acrescente:

```js
  // ── The root foot: born with the plant, under the Tube, on the surface line ──
  const pe = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('tubo', 190);
    await new Promise((ok) => {
      const olhar = () => { const e = window.__um('tubo'); if (!e || e.getData('elite').fase !== 'aguarda') { s.events.off('postupdate', olhar); ok(); } };
      s.events.on('postupdate', olhar);
    });
    await new Promise((r) => setTimeout(r, 200));
    const e = window.__um('tubo'), p = e.getData('elite').pe;
    return { tem: !!p?.active, dx: Math.abs(p.x - e.x), dy: Math.abs(p.y - s.moldura.superficieChaoEm(e.x)), textura: p.texture.key, frente: p.depth > e.depth };
  });
  conferir(pe.tem && pe.dx === 0 && pe.dy === 0 && pe.textura.startsWith('eliteTuboPe') && pe.frente, 'o Tubo tem o PÉ DE RAÍZES: colado nele, na linha da superfície, na frente (§9.4)', pe);
  await page.keyboard.press('Digit2');
  await espera(200);

  // ── The spore: no damage, the ship slows down (renews, never stacks); the shot goes through it ──
  const lento = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    const vidas = s.lives;
    s.esporos.soltar(s.ship.x, s.ship.y, 0);
    await new Promise((r) => setTimeout(r, 120));
    const ate1 = s.lentaAte;
    const max = s.ship.body.maxVelocity.x;
    s.esporos.soltar(s.ship.x, s.ship.y, 0);
    await new Promise((r) => setTimeout(r, 120));
    return { vidas: s.lives - vidas, lenta: s.lentaAte > s.time.now, max, renovou: s.lentaAte > ate1, dura: s.lentaAte - s.time.now };
  });
  conferir(lento.vidas === 0 && lento.lenta && Math.abs(lento.max - 110 * ELITES.lentidao.velocidade) < 0.5, 'o esporo NÃO fere: a nave fica lenta (60% do teto)', lento);
  conferir(lento.renovou && lento.dura <= ELITES.lentidao.duracaoS * 1000, 'outro esporo RENOVA a lentidão, sem somar', lento);
  await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return s.time.now > s.lentaAte + 100; }, null, { timeout: 5000 });
  const voltou = await page.evaluate(() => window.__game.scene.getScene('Game').ship.body.maxVelocity.x);
  conferir(Math.abs(voltou - 110) < 0.5, 'acabou a lentidão: o teto volta ao normal', voltou);
  // A spore in front of the ship, the trigger held for 0.4 s: the bullets go through and it lives on.
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.esporos.soltar(s.ship.x + 150, s.ship.y, 0);
    window.__alvoEsporo = s.esporos.grupo.getChildren().at(-1);
    window.__tirosAntes = s.weapons.bullets.countActive(true);
  });
  await page.keyboard.down('Space');
  await espera(400);
  const atravessa = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    return { vivo: window.__alvoEsporo.active, alfa: window.__alvoEsporo.alpha, tiros: s.weapons.bullets.countActive(true) };
  });
  await page.keyboard.up('Space');
  conferir(atravessa.tiros > 0 && atravessa.vivo && atravessa.alfa > 0.5, 'o tiro ATRAVESSA o esporo (ele não se destrói)', atravessa);

- [x] **Step 4: Rodar tudo**

Run (com `npm run dev`): `node scripts/probe-elites-f4.mjs` — Expected: todas `OK`, `TUDO OK`.
Run: `node scripts/test-elites-regras.mjs` — Expected: `TUDO OK`.
Run: `node scripts/probe-elites.mjs`, `node scripts/probe-elites-f3.mjs`, `node scripts/probe-stage4.mjs`, `node scripts/probe-f4-esfincter.mjs` — Expected: verdes.
Run: `npm run build` — Expected: build sem erro.
(⚠️ `probe-f4-moldura.mjs` e `probe-f4-golfinho.mjs` já quebravam antes da F4 — não são régua.)

- [ ] **Step 5: Commit (só quando ele pedir)**

```bash
git add scripts/probe-elites-f4.mjs
git commit -m "test(elites): a sonda da F4 na rodada de 14/10 — o esporo não fere e deixa a nave lenta (renova, não soma, e passa), o tiro o atravessa, o leque de 6 e 5, o pé de raízes, o buraco sempre na borda e andando com ela, o ciclo da Larva com os dois trancos novos"
```

---

### Task 9: Os GIFs para ele, a conferência do buraco nas superfícies e os docs

**Files:**
- Modify: `scripts/_elites/_gif-f4-jogo.mjs` (só se precisar: ele já grava `larva | tubo | tubos`)
- Create: `docs/superpowers/folhas/2026-10-14/f4/jogo-*.gif`
- Modify: `docs/HANDOFF.md` (o 🧭), `docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md` (estado do §9)
- Create: `docs/superpowers/plans/2026-10-14-f4-rodada-START.md`

- [x] **Step 1: Os GIFs em jogo, MENORES**

Os de 13/10 pesavam 31–44 MB. Grave em zoom 1 (e menos segundos onde der):

```bash
node scripts/_elites/_gif-f4-jogo.mjs docs/superpowers/folhas/2026-10-14/f4/jogo-tubo-camara-a.gif tubo 10 6 1
node scripts/_elites/_gif-f4-jogo.mjs docs/superpowers/folhas/2026-10-14/f4/jogo-tubos-aperto.gif tubos 57.5 8 1
node scripts/_elites/_gif-f4-jogo.mjs docs/superpowers/folhas/2026-10-14/f4/jogo-larva-camara-a.gif larva 21 6 1
node scripts/_elites/_gif-f4-jogo.mjs docs/superpowers/folhas/2026-10-14/f4/jogo-larva-duto.gif larva 75 6 1
```

Expected: 4 GIFs; confira o tamanho (`ls -la`). Tire 6 quadros de cada (o `frames.mjs` do scratchpad desta sessão, ou `sharp(gif, { page })`) e confira a olho, antes de mostrar: o pé do Tubo agarrado à borda (câmara A e costelas azuis), a nuvem verde pairando e andando com a parede, o buraco abrindo na borda (no duto, na parede grossa do teto ou do chão), a Larva dando o tranco para fora e para dentro, a pupa tremendo, as moscas espalhadas.

- [x] **Step 2: A conferência do buraco em cada superfície**

Nos quadros dos GIFs, olhe o buraco na borda da câmara A, nas costelas azuis (se aparecer), numa mesa e no duto. Anote para ele onde a cor não casa ou onde o buraco (32×28) não cabe na faixa (a da câmara A tem ~26–30px). **Não faça variações sem ele** (§9.5: entram se a cor não casar — a decisão é dele, olhando).

- [x] **Step 3: Os docs**

- `docs/HANDOFF.md`, no 🧭: um ponto 📍 14/10 novo (a rodada aplicada, o que espera por ele: os 4 GIFs novos, o sandbox, a F4; a decisão do Dash não freado para ele confirmar; a conferência do buraco), o de 13/10 marcado como cumprido, e a frase de arranque nova apontando para o START de 14/10.
- Spec F4, cabeçalho: `**14/10: ele testou; a rodada nova (§9) foi implementada no mesmo dia** (plano \`plans/2026-10-14-f4-rodada-esporos.md\`).`
- Create `docs/superpowers/plans/2026-10-14-f4-rodada-START.md` no molde do de 13/10: o ponto marcado, como subir o servidor, o que está no jogo (tabela), as perguntas dele com o knob de cada uma (`esporo.*`, `lentidao.*`, `tubo.esporosN`, `pupa.tremeS`, `mosca.tremorAcel/tremorHz`, `buraco.colunas/naBordaPx/naMesaPx`), como se confere, e a lista do que está sem commit.
- Marque os passos executados deste plano.

- [ ] **Step 4: Commit (só quando ele pedir)**

```bash
git add docs/HANDOFF.md docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md docs/superpowers/plans/2026-10-14-f4-rodada-esporos.md docs/superpowers/plans/2026-10-14-f4-rodada-START.md docs/GDD.md
git commit -m "docs: a rodada de 14/10 da F4 — o ponto marcado no HANDOFF, o START novo, o estado da spec e o modo competitivo anotado no GDD"
```

(Os GIFs de 14/10 seguem a regra dos de 13/10: ficam no disco e vão para o repositório de backup, salvo se ele disser outra coisa.)
