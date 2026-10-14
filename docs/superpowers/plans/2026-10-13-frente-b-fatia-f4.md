# FRENTE B · Fatia F4 (Larva Mecânica + Tubo Pulsante) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **ESTADO (13/10/2026): EXECUTADO no mesmo dia**, tarefa por tarefa, nesta ordem. Os passos marcados `[x]` foram feitos e
> conferidos; os de **commit** seguem abertos — nada foi commitado (ele pede). O que mudou durante a execução está
> escrito no lugar: a sonda lê os pontos em `s.score` (Task 7), o buraco foi para a frente do cenário (`depth −0,7`) e
> a cicatriz ficou mais clara, os dois depois de olhar o GIF em jogo (Task 9). Ele ainda NÃO testou: a porta de
> entrada da próxima sessão é o `2026-10-13-fatia-f4-START.md`.

**Goal:** os dois elites da F4 jogáveis — a Larva Mecânica (buraco, pupas, moscas) e o Tubo Pulsante (preso à parede,
o pulso em meio-anel), cada um com as DUAS variações de arte aprovadas — no roteiro da Fase 4 e no sandbox.

**Architecture:** a da F2/F3 (spec-mãe §2): regras PURAS em `src/elitesRegras.ts` (testadas em node), números em
`src/data/numerosElites.ts`, um `ComportamentoElite` por peça em `src/entities/elites/`, todo dano pelo
`GameScene.ferirInimigo`, tiros por `PadroesDeTiro`. Novidades na infraestrutura: o elite pode FAZER NASCER outro
inimigo (`ctx.nascer` — a pupa, a mosca), andar preso à PAREDE da F4 (`ganchos.parede` + o gancho `noChao`, que roda
até travado), ler o VÃO do corredor (`ganchos.vao`) e a velocidade do FUNDO pintado (`ganchos.velFundo`). Os gestos
seguem a lula: o quadro sai do relógio do estado, sem animação do Phaser.

**Tech Stack:** Phaser 3 (Arcade), TypeScript, Vite; sharp (scripts de arte); playwright (sonda e GIF).

**Spec:** `docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md` + as decisões de 13/10 (abaixo).

## As decisões de 13/10 (depois da spec)

- **As duas variações ficam, nos dois elites** (ele: *"ficaram ótimos, podemos deixar as duas variações"*; e da Larva:
  *"Eu gostei dos dois… podemos usar a variação, como vamos fazer com o tubo"*). Larva **A** (`larva-31-16`, do
  conceito) e **D** (`larvaBroca-31-6`, a broca); Tubo **C** (`tuboCraca-31-0`, coroa de dentes) e **D**
  (`tuboCraca-31-21`, craca dupla). **Como se distribuem (decisão deste plano): alternam pela ordem de nascimento na
  fase** — a 1ª Larva é A, a 2ª D, a 3ª A; o 1º Tubo é C, o 2º D, o 3º C. Assim as duas aparecem em toda partida e o
  par do aperto (chão + teto) nunca sai igual.
- **A densidade do tiro do Tubo se decide jogando** (ele: *"vamos ter que testar para saber se durante a fase não vai
  ser muita coisa"*). Os knobs: `tubo.tirosN`, `tubo.pulsos`, `tubo.velTiro`.
- Os gestos aprovados nos GIFs encenados (`folhas/2026-10-13/elites/f4/gif-larva-ciclo.gif`, `gif-tubo-C-D.gif`)
  entram como foram vistos: **quadros crus do PixMiniMax, só recortados** (sem encaixe de paleta — o inchar do Tubo e
  a brasa da broca acendem cores que a arte parada não tem).

## Global Constraints

- Tempos em segundos, distâncias em px de jogo (384×216), velocidades em px/s; todo número em `numerosElites.ts`.
- `elitesRegras.ts` e `numerosElites.ts` ficam PUROS (sem Phaser), importáveis em node com a extensão `.ts`.
- Elite pressiona, não pune (memória `elites-pressionam-sem-punir`): vão > tiro; a pupa é o aviso, a mosca a ameaça.
- A Larva nunca entra na caixa torácica (t=38,8 a 68); nada entra na arena do golfinho (t=40 a 49,5) nem no silêncio
  de t=106.
- Cada entrada toma o lugar de UMA onda comum — a fase não incha (spec §4).
- Criatura inteira, gesto no lugar; nada de partes coladas (memória `criatura-inteira-vistas-animacao`).
- Peça ≲10px e efeito de cena: à mão, em pixel, assados em quadros (memórias `pecas-minusculas-em-pixel`,
  `efeito-de-cena-assado-em-pixel`). O buraco, a pupa, a mosca e o tiro do anel entram como RASCUNHO até ele aprovar.
- Comentários de `src/` em português, como o código em volta; os de `scripts/` em inglês, como os scripts recentes.
- Editar com Edit, não com `sed`/`node -e` (CRLF — memória `edicao-por-script-falha-crlf`).
- **Commit só quando ele pedir**, com a autoria só do Henrique, sem trailer de co-autoria (memória `git-autoria`). As
  mensagens de commit abaixo ficam prontas para esse momento. Push só quando ele pedir; nunca para `legacy`.
- Os PNGs soltos na raiz (`concept art*.png`) não entram em commit nenhum.

## O que se mediu antes de escrever (13/10, no jogo rodando)

| A conferir (START §5) | A resposta |
|---|---|
| O sandbox na F4 monta a borda? | Monta os 4 segmentos, mas com **espessura 0** (o roteiro está desligado): a superfície fica em y≈197 (chão) e ≈15 (teto), quase fora da tela. A Task 3 crava 16px no sandbox da F4. |
| A velocidade do fundo pintado | `bgFactor` 0,02 × 84 = **1,68 px/s** (`Parallax.buildInterior`). O buraco anda com ela. |
| O Tubo numa placa sem mesa | A mesa tem **94px** de largura e nasce em x=414 a cada `corredorRate` s (185px na 1ª câmara, 160px no aperto). O Tubo (36px) cabe no MEIO da batida, com 9px de folga de cada lado — a regra `tuboCabe`. |
| O degrau da parede | A borda é uma escada de placas de 128px; no aperto, depois de t≈57, o degrau chega a 14px. O Tubo nasce a ≥22px de uma emenda (`distEmenda`), e anda na mesma grade de pixel das placas (`Moldura.telaDe`). |
| As costelas do cenário | Há costelas e maquinário (`depth −85`, fator 0,4) passando no corredor. ⚠️ A 1ª versão punha o buraco NA PINTURA (`depth −95,9`) e, no GIF em jogo do duto, uma peça do cenário TAPOU o buraco de chegada. Ficou na FRENTE do cenário (`depth −0,7`, atrás da borda, das mesas e dos inimigos); o preço é uma costela deslizar por trás dele. |

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `src/data/numerosElites.ts` | + `larva`, `buraco`, `pupa`, `mosca`, `tubo` |
| `src/elitesRegras.ts` | + as regras puras da F4 (ver Task 1, **Produces**) |
| `scripts/test-elites-regras.mjs` | + os casos da F4 |
| `scripts/_elites/_mao-f4.mjs` | as peças à mão (pupa, mosca, tiro do anel, buraco), compartilhadas |
| `scripts/_elites/_gif-f4.mjs` | passa a importar as peças da lib (sem mudar o GIF) |
| `scripts/_elites/_instalar-f4.mjs` | instala os gestos das 4 variações e as peças à mão em `public/sprites` |
| `src/scenes/BootScene.ts` | `FRAMES` + as chaves novas no mapa de PNGs |
| `src/entities/elites/tipos.ts` | `ParedeElite`; `GanchosElite.vao/parede/velFundo`; `CtxElite.nascer`; `noChao?` |
| `src/systems/Moldura.ts` | `mundoDe`, `telaDe` |
| `src/Parallax.ts` | `fatorPintura` |
| `src/systems/PadroesDeTiro.ts` | o giro do tiro passa para ANTES do `vestir` (o tiro redondo o zera) |
| `src/systems/EnemySystem.ts` | `spawn` devolve o sprite e numera a `ordem`; `nascer`; `noChao`; `miudo`; os 4 DEFS |
| `src/scenes/GameScene.ts` | os ganchos novos; a borda de 16px no sandbox da F4; a pupa morre sem estouro; o teleguiado ignora o intocável |
| `src/entities/elites/Pupa.ts` | `PUPA` e `MOSCA` |
| `src/entities/elites/Buraco.ts` | o buraco: sprite de quadros assados, com vida própria |
| `src/entities/elites/Larva.ts` | `LARVA` |
| `src/entities/elites/Tubo.ts` | `TUBO` |
| `src/sandbox/config.ts` | `mosca`, `larva`, `tubo` na montagem |
| `src/systems/StageDirector.ts` | as 6 entradas no `STAGE_4` |
| `scripts/probe-elites-f4.mjs` | a sonda em jogo real |
| `scripts/_elites/_gif-f4-jogo.mjs` | o GIF em jogo, na velocidade real |

---

### Task 1: Números e regras puras (TDD)

**Files:** Modify `src/data/numerosElites.ts`, `src/elitesRegras.ts`, `scripts/test-elites-regras.mjs`

**Interfaces — Produces** (tudo exportado de `src/elitesRegras.ts`):

- `varianteDe<T>(ordem: number, lista: readonly T[]): T`
- `type EstadoLarva = 'abre' | 'sai' | 'poe' | 'tranco' | 'perfura' | 'mergulha' | 'foi'`
- `larvaAvanca(estado: EstadoLarva, t: number, paradas: number): EstadoLarva` — `paradas` = quantos PÕE já
  COMEÇARAM, contando o atual.
- `larvaTangivel(estado: EstadoLarva, t: number): boolean`
- `type ClipeLarva = 'poe' | 'tranco' | 'sai' | 'perfura' | 'mergulha'`
- `larvaQuadro(estado: EstadoLarva, t: number): { clipe: ClipeLarva; quadro: number } | null`
- `interface Vao { teto: number; chao: number }`
- `larvaPosto(sorte: () => number, yAnterior: number | null, vaoEm: (x: number) => Vao): { x: number; y: number }`
- `pupaAngulos(base: number, n?: number): number[]`, `pupaVoo(t: number): number`, `pupaQuadro(t: number): 0 | 1`,
  `pupaEclode(t: number): boolean`, `moscaPersegue(x: number, alvoX: number): boolean`
- `buracoQuadro(fase: 'abre' | 'fecha', t: number): number | null` — o índice do quadro assado (0–4 abrindo, 5–8
  cicatriz); `null` = sumiu.
- `type EstadoTubo = 'aguarda' | 'rola' | 'incha' | 'pulsa'`
- `distEmenda(xMundo: number): number`
- `interface PlantioMesas { timer: number; rate: number; vel: number }`
- `tuboCabe(xMundo: number, mesas: PlantioMesas): boolean`
- `tuboAvanca(estado: EstadoTubo, t: number, x: number, pulsos: number): EstadoTubo`
- `tuboQuadro(estado: EstadoTubo, t: number): number` — o índice no clipe `pulso` (17 quadros).
- `tuboAngulos(pulso: number, teto: boolean): number[]`

- [x] **Step 1: os testes** — em `scripts/test-elites-regras.mjs`, acrescentar ao `import` de `../src/elitesRegras.ts`:

```js
  varianteDe, larvaAvanca, larvaTangivel, larvaQuadro, larvaPosto, pupaAngulos, pupaVoo, pupaQuadro, pupaEclode,
  moscaPersegue, buracoQuadro, distEmenda, tuboCabe, tuboAvanca, tuboQuadro, tuboAngulos,
```

e, antes da linha `console.log(falhas.length ? …`, o bloco:

```js
// ── A F4 (spec 2026-10-12-frente-b-fatia-f4-design.md) ──
const L = ELITES.larva, B = ELITES.buraco, P = ELITES.pupa, T = ELITES.tubo;
conferir(varianteDe(0, ['A', 'D']) === 'A' && varianteDe(1, ['A', 'D']) === 'D' && varianteDe(2, ['A', 'D']) === 'A', 'as duas variações se alternam pela ordem de nascimento', null);

// A LARVA (§2.1)
{
  let f = 'abre', paradas = 0;
  const visto = [f];
  while (f !== 'foi' && visto.length < 20) {
    f = larvaAvanca(f, 99, paradas);
    if (f === 'poe') paradas++;
    visto.push(f);
  }
  const ciclo = ['abre', 'sai', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'perfura', 'mergulha', 'foi'];
  conferir(JSON.stringify(visto) === JSON.stringify(ciclo), `a Larva: buraco, sai, ${L.paradas} paradas com tranco entre elas, perfura, mergulha`, visto);
}
conferir(larvaAvanca('abre', B.abreS - 0.01, 0) === 'abre' && larvaAvanca('abre', B.abreS, 0) === 'sai', 'o buraco abre ANTES de ela existir (o aviso)', B.abreS);
conferir(larvaAvanca('poe', L.poeS - 0.01, 1) === 'poe', 'o PÕE segura o tempo dele', L.poeS);
const aVista = L.saiS + L.paradas * L.poeS + (L.paradas - 1) * L.trancoS + L.perfuraS + L.mergulhaS;
conferir(Math.abs(aVista - 4.7) < 0.01, 'cerca de 4,7s à vista (§2.1)', aVista);
conferir(!larvaTangivel('abre', 0.2) && !larvaTangivel('foi', 0) && !larvaTangivel('sai', 0) && larvaTangivel('sai', L.miudaS) && ['poe', 'tranco', 'perfura'].every((f) => larvaTangivel(f, 0.1)) && larvaTangivel('mergulha', 0) && !larvaTangivel('mergulha', L.mergulhaS - L.miudaS), 'sem corpo enquanto é um ponto no buraco; com corpo no resto', null);
const ql = (f, t) => { const q = larvaQuadro(f, t); return q && `${q.clipe}${q.quadro}`; };
conferir(ql('abre', 0.1) === null && ql('foi', 0) === null, 'antes de sair e depois de mergulhar, não se desenha', null);
conferir(ql('sai', 0) === 'mergulha8' && ql('sai', L.saiS - 0.001) === 'sai8', 'o SAI é o mergulho de trás para a frente e a bola estourando', [ql('sai', 0), ql('sai', L.saiS - 0.001)]);
conferir(ql('poe', 0) === 'poe0' && ql('poe', L.poeS - 0.001) === 'poe16' && ql('tranco', 0) === 'tranco0' && ql('perfura', L.perfuraS - 0.001) === 'perfura16', 'cada estado toca o clipe dele inteiro', null);
conferir(ql('mergulha', 0) === 'mergulha0' && ql('mergulha', 99) === 'mergulha8' && ql('poe', -1) === 'poe0', 'o MERGULHA acaba num ponto; fora do tempo, o quadro não estoura', ql('mergulha', 99));

// OS POSTOS: na metade direita, DENTRO do vão, em ziguezague. O vão de teste é o duto mais fechado (68px).
const vaoFalso = () => ({ teto: 60, chao: 128 });
{
  const seq = [0.5, 0.1, 0.12, 0.13, 0.11, 0.9, 0.14, 0.5, 0.52];
  let k = 0, ant = null;
  const sorteL = () => seq[k++ % seq.length];
  const postos = [0, 1, 2].map(() => {
    const p = larvaPosto(sorteL, ant, vaoFalso);
    const r = { ...p, ant };
    ant = p.y;
    return r;
  });
  conferir(postos.every((p) => p.x >= L.postoX[0] && p.x <= L.postoX[1]), 'os postos ficam na metade direita', postos);
  conferir(postos.every((p) => p.y >= 60 + L.postoMargem && p.y <= 128 - L.postoMargem), 'os postos ficam DENTRO do vão, com margem', postos);
  conferir(postos.slice(1).every((p) => Math.abs(p.y - p.ant) >= L.postoDistY), 'cada posto foge da altura do anterior (o ziguezague)', postos);
}
const semSorte = larvaPosto(() => 0.5, 94, vaoFalso);
conferir(Math.abs(semSorte.y - 94) >= L.postoDistY && semSorte.y <= 128 - L.postoMargem, 'sem sorte no sorteio, vai à ponta da faixa mais longe do anterior', semSorte);

// A PUPA E A MOSCA (§2.2)
const angs = pupaAngulos(Math.PI);
const leque = (L.pupaLequeGraus * Math.PI) / 180;
conferir(angs.length === L.pupasPorParada && Math.abs((angs[0] + angs.at(-1)) / 2 - Math.PI) < 1e-9 && Math.abs(angs.at(-1) - angs[0] - 2 * leque) < 1e-9, `${L.pupasPorParada} pupas por parada, num leque curto em volta da direção da nave`, angs);
conferir(pupaAngulos(1, 1)[0] === 1, 'uma pupa só sai reta', pupaAngulos(1, 1));
conferir(pupaVoo(0) === 0 && pupaVoo(P.vooS) === P.vooPx && pupaVoo(99) === P.vooPx, `a pupa voa ${P.vooPx}px e PARA`, [pupaVoo(0), pupaVoo(P.vooS), pupaVoo(99)]);
conferir(!pupaEclode(P.eclodeS - 0.01) && pupaEclode(P.eclodeS), `a pupa eclode em ${P.eclodeS}s`, null);
const trocas = (de, ate) => { let n = 0; for (let t = de + 0.01; t < ate; t += 0.01) if (pupaQuadro(t) !== pupaQuadro(t - 0.01)) n++; return n; };
conferir(trocas(0, 0.5 * P.eclodeS) < trocas(0.8 * P.eclodeS, P.eclodeS), 'a pupa pulsa cada vez mais rápido', [trocas(0, 0.5 * P.eclodeS), trocas(0.8 * P.eclodeS, P.eclodeS)]);
conferir(moscaPersegue(200, 70) && !moscaPersegue(60, 70), 'a mosca persegue até passar da nave; depois segue reto', null);
conferir(P.hp === 1 && ELITES.mosca.hp === 1 && ELITES.mosca.perseguicao < 150 && ELITES.mosca.velMax < 190, 'pupa e mosca de 1 de vida; a mosca mais lenta que o kamikaze (150 / 190)', ELITES.mosca);

// O BURACO
conferir(buracoQuadro('abre', 0) === 0 && buracoQuadro('abre', B.abreS) === 4 && buracoQuadro('abre', 99) === 4, 'o buraco abre em 5 quadros e fica aberto', null);
conferir(buracoQuadro('fecha', 0) === 2 && buracoQuadro('fecha', B.fechaS - 0.001) === 0 && buracoQuadro('fecha', B.fechaS) === 5 && buracoQuadro('fecha', B.fechaS + B.cicatrizS - 0.001) === 8 && buracoQuadro('fecha', B.fechaS + B.cicatrizS) === null, 'fecha, deixa a cicatriz e ela some', null);

// O TUBO (§3)
conferir(tuboAvanca('rola', 0, T.pulsoX[0] + 1, 0) === 'rola' && tuboAvanca('rola', 0, T.pulsoX[0], 0) === 'incha', 'o Tubo incha ao chegar ao 1º ponto', T.pulsoX);
conferir(tuboAvanca('incha', T.inchaS - 0.01, 300, 0) === 'incha' && tuboAvanca('incha', T.inchaS, 300, 0) === 'pulsa' && tuboAvanca('pulsa', T.pulsaS, 300, 1) === 'rola', 'incha (o aviso) → pulsa → volta a rolar', null);
conferir(tuboAvanca('rola', 0, T.pulsoX[1] + 1, 1) === 'rola' && tuboAvanca('rola', 0, T.pulsoX[1], 1) === 'incha' && tuboAvanca('rola', 0, 0, T.pulsos) === 'rola', `${T.pulsos} pulsos por passagem, e só`, null);
const a0 = tuboAngulos(0, false), a1 = tuboAngulos(1, false), aTeto = tuboAngulos(0, true);
const passo = Math.PI / (T.tirosN - 1);
conferir(a0.length === T.tirosN && a0.every((a) => Math.sin(a) <= 1e-9), 'no chão, o meio-anel abre para CIMA (para dentro do corredor)', a0);
conferir(aTeto.length === T.tirosN && aTeto.every((a) => Math.sin(a) >= -1e-9), 'no teto, para BAIXO', aTeto);
conferir(a1.length === T.tirosN - 1 && a1.every((a, i) => Math.abs(a - (a0[i] + a0[i + 1]) / 2) < 1e-9), 'o 2º pulso sai DEFASADO meio passo: cada tiro no vão do 1º', a1);
conferir(60 * passo > 21 + 5, 'a 60px o vão entre dois tiros é maior que a nave (21) mais o tiro (5)', 60 * passo);
conferir(tuboQuadro('rola', 3) === 0 && tuboQuadro('aguarda', 0) === 0 && tuboQuadro('incha', 0) === 0 && tuboQuadro('incha', T.inchaS - 0.001) === 9 && tuboQuadro('pulsa', 0) === 10 && tuboQuadro('pulsa', 99) === 16, 'o gesto: fechado rolando, incha em 10 quadros, estala e assenta', null);
conferir(distEmenda(0) === 0 && distEmenda(64) === 64 && distEmenda(130) === 2 && distEmenda(-2) === 2, 'a distância à emenda de duas placas', null);
const batida = { timer: 1.1, rate: 1.9, vel: 84 };
conferir(tuboCabe(64, batida) && !tuboCabe(64, { ...batida, timer: 0.2 }) && !tuboCabe(64, { ...batida, timer: 1.8 }), 'o Tubo nasce ENTRE duas mesas, nunca em cima de uma', null);
conferir(!tuboCabe(10, batida) && tuboCabe(10 + 128 * 3 + 54, batida), 'e longe da emenda de duas placas (a parede tem degrau ali)', null);
conferir(tuboCabe(64, { timer: 0, rate: 0, vel: 84 }), 'sem mesas (o sandbox), só a emenda conta', null);
```

- [x] **Step 2: ver falhar**

Run: `node scripts/test-elites-regras.mjs`
Expected: `SyntaxError: The requested module '../src/elitesRegras.ts' does not provide an export named 'buracoQuadro'`
(ou outro dos nomes novos).

- [x] **Step 3: os números** — em `src/data/numerosElites.ts`, dentro de `ELITES`, depois do bloco `tinta`:

```ts
  /**
   * A LARVA MECÂNICA (spec F4 §2): abre um BURACO no fundo e sai dele → PÕE pupas → TRANCO para o posto seguinte →
   * (`paradas` vezes) → PERFURA e MERGULHA no buraco. Não atira: o tiro dela são as pupas. O tempo do buraco abrindo
   * (o aviso, antes de ela existir) é o `buraco.abreS`.
   */
  larva: {
    hp: 12,
    score: 350,
    saiS: 0.4,
    poeS: 0.9,
    trancoS: 0.35,
    perfuraS: 0.5,
    mergulhaS: 0.4,
    /** No começo do SAI e no fim do MERGULHA ela é um ponto dentro do buraco: sem corpo (nem fere, nem é ferida). */
    miudaS: 0.18,
    paradas: 3,
    /** O knob principal (§2.2): o pior caso é `pupasPorParada × paradas` moscas por aparição. */
    pupasPorParada: 2,
    /** As pupas saem neste instante do PÕE (a cauda abre no meio do clipe). */
    pupaSaiS: 0.5,
    /** O leque das pupas: o meio-ângulo em volta da direção da nave. */
    pupaLequeGraus: 17,
    /** Os postos: só na metade direita (decisão dele: ziguezague, sem cruzar para o lado da nave). */
    postoX: [230, 340] as const,
    /** Do posto às bordas do vão: meio corpo + folga — ela nunca encosta em mesa nem em parede. */
    postoMargem: 14,
    /**
     * Cada posto fica pelo menos a isto da altura do anterior. O duto mais fechado (vão de 68) deixa 68 − 2×14 = 40px
     * de faixa: com 20, a ponta mais longe do anterior sempre serve.
     */
    postoDistY: 20,
  },
  /**
   * O BURACO da Larva: abre em `abreS` (5 quadros), fecha em `fechaS` (3 quadros, de trás para a frente) e deixa uma
   * cicatriz que some em `cicatrizS` (4 quadros, perdendo pixels). Quadros ASSADOS por `scripts/_elites/_instalar-f4.mjs`.
   */
  buraco: { abreS: 0.5, fechaS: 0.25, cicatrizS: 1.0 },
  /** A PUPA (§2.2): voa `vooPx` em `vooS` e PARA no ar; pulsa cada vez mais rápido; eclode em `eclodeS`. */
  pupa: { hp: 1, score: 20, vooPx: 50, vooS: 0.4, eclodeS: 2.0 },
  /** A MOSCA (§2.2): mais lenta que o kamikaze (ele: velocidade 45, perseguição 150, teto 190). */
  mosca: { hp: 1, score: 30, velInicial: 40, perseguicao: 110, velMax: 120, bateAsaS: 0.06 },
  /**
   * O TUBO PULSANTE (spec F4 §3): preso à parede, rola com ela → INCHA (o aviso) → PULSA um meio-anel de tiros lentos.
   * ⚠️ A densidade do anel se decide jogando (13/10, ele: *"vamos ter que testar para saber se durante a fase não vai
   * ser muita coisa"*): os knobs são `tirosN`, `pulsos` e `velTiro`.
   */
  tubo: {
    hp: 10,
    score: 300,
    inchaS: 0.6,
    pulsaS: 0.35,
    pulsos: 2,
    /** O x de tela em que cada INCHA começa (ele vem da direita com a parede). Um por pulso. */
    pulsoX: [310, 190] as const,
    /**
     * 7 tiros em 180° = um a cada 30°: a 60px o vão mede ~31px e a hitbox da nave tem 21×9. O pulso ÍMPAR sai
     * defasado meio passo, com um tiro a menos — a faixa segura muda de lugar.
     */
    tirosN: 7,
    velTiro: 70,
    /** Onde ele nasce (fora da tela) e onde as mesas nascem (`TerrainSystem.spawn`: `GAME_WIDTH + 30`). */
    nasceX: 428,
    mesaX: 414,
    /** A mesa (`f4-mesa*.png`, 94px) e a arte dele (35–36px). */
    larguraMesa: 94,
    largura: 36,
    folgaMesa: 6,
    folgaEmenda: 4,
    /** A largura de uma placa da borda (`Moldura.LARGURA`): a parede tem degrau nas emendas. */
    placa: 128,
    /** As raízes entram 2px na parede (a folha de 13/10). */
    afunda: 2,
    /** Esperou isto sem caber: nasce assim mesmo — uma entrada do roteiro não some em silêncio. */
    esperaMaxS: 8,
  },
```

- [x] **Step 4: as regras** — no fim de `src/elitesRegras.ts`:

```ts
// ── A FATIA F4 (spec 2026-10-12-frente-b-fatia-f4-design.md): a Larva Mecânica e o Tubo Pulsante ──

/** As VARIAÇÕES (13/10: a Larva A e D e o Tubo C e D ficam as duas): alternam pela ordem de nascimento na fase. */
export const varianteDe = <T>(ordem: number, lista: readonly T[]): T => lista[ordem % lista.length];

export type EstadoLarva = 'abre' | 'sai' | 'poe' | 'tranco' | 'perfura' | 'mergulha' | 'foi';

/**
 * O ciclo da Larva (§2.1). `paradas` = quantos PÕE já COMEÇARAM, contando o atual: o último vai ao PERFURA. No `abre`
 * só o buraco existe (o aviso); `foi` = mergulhou, sem pontos.
 */
export function larvaAvanca(estado: EstadoLarva, t: number, paradas: number): EstadoLarva {
  const L = ELITES.larva;
  switch (estado) {
    case 'abre':
      return t >= ELITES.buraco.abreS ? 'sai' : estado;
    case 'sai':
      return t >= L.saiS ? 'poe' : estado;
    case 'poe':
      if (t < L.poeS) return estado;
      return paradas >= L.paradas ? 'perfura' : 'tranco';
    case 'tranco':
      return t >= L.trancoS ? 'poe' : estado;
    case 'perfura':
      return t >= L.perfuraS ? 'mergulha' : estado;
    case 'mergulha':
      return t >= L.mergulhaS ? 'foi' : estado;
    default:
      return 'foi';
  }
}

/** Ela tem CORPO? Não enquanto é um ponto dentro do buraco: o começo do SAI e o fim do MERGULHA. */
export function larvaTangivel(estado: EstadoLarva, t: number): boolean {
  const L = ELITES.larva;
  if (estado === 'abre' || estado === 'foi') return false;
  if (estado === 'sai') return t >= L.miudaS;
  if (estado === 'mergulha') return t < L.mergulhaS - L.miudaS;
  return true;
}

export type ClipeLarva = 'poe' | 'tranco' | 'sai' | 'perfura' | 'mergulha';
type PoseLarva = readonly [clipe: ClipeLarva, quadro: number];
type EstadoLarvaVisivel = Exclude<EstadoLarva, 'abre' | 'foi'>;
const filaLarva = (clipe: ClipeLarva, de: number, ate: number): PoseLarva[] =>
  Array.from({ length: Math.abs(ate - de) + 1 }, (_, k): PoseLarva => [clipe, de + Math.sign(ate - de) * k]);

/**
 * Os GESTOS da Larva (13/10, os dos GIFs que ele aprovou): a fila de quadros de cada estado, ESTICADA pela duração
 * dele. Os quadros são os dos clipes instalados por `scripts/_elites/_instalar-f4.mjs` (iguais nas duas variações).
 * SAI: o mergulho de trás para a frente (o ponto cresce até virar a bola) e a bola estourando aberta.
 */
const GESTOS_LARVA: Record<EstadoLarvaVisivel, readonly PoseLarva[]> = {
  sai: [...filaLarva('mergulha', 8, 0), ...filaLarva('sai', 0, 8)],
  poe: filaLarva('poe', 0, 16),
  tranco: filaLarva('tranco', 0, 16),
  perfura: filaLarva('perfura', 0, 16),
  mergulha: filaLarva('mergulha', 0, 8),
};
const DURACAO_LARVA = { sai: 'saiS', poe: 'poeS', tranco: 'trancoS', perfura: 'perfuraS', mergulha: 'mergulhaS' } as const;

/** O quadro da Larva aos `t` segundos do estado; `null` = não se desenha (só o buraco existe, ou ela já foi). */
export function larvaQuadro(estado: EstadoLarva, t: number): { clipe: ClipeLarva; quadro: number } | null {
  if (estado === 'abre' || estado === 'foi') return null;
  const fila = GESTOS_LARVA[estado];
  const k = Math.min(fila.length - 1, Math.max(0, Math.floor((t / ELITES.larva[DURACAO_LARVA[estado]]) * fila.length)));
  return { clipe: fila[k][0], quadro: fila[k][1] };
}

/** As bordas do vão numa coluna da tela (y de tela). */
export interface Vao {
  teto: number;
  chao: number;
}

/**
 * O próximo POSTO da Larva: x na metade direita, y DENTRO do vão daquele x (com margem), e longe da altura do anterior
 * — o ziguezague. Sem sorte em 8 sorteios (ou com o vão curto), vai à ponta da faixa mais longe do anterior.
 */
export function larvaPosto(sorte: () => number, yAnterior: number | null, vaoEm: (x: number) => Vao): { x: number; y: number } {
  const L = ELITES.larva;
  const x = Math.round(L.postoX[0] + sorte() * (L.postoX[1] - L.postoX[0]));
  const v = vaoEm(x);
  const lo = v.teto + L.postoMargem;
  const hi = Math.max(lo, v.chao - L.postoMargem);
  let y = lo + sorte() * (hi - lo);
  for (let i = 0; i < 8 && yAnterior !== null && Math.abs(y - yAnterior) < L.postoDistY; i++) y = lo + sorte() * (hi - lo);
  if (yAnterior !== null && Math.abs(y - yAnterior) < L.postoDistY) y = Math.abs(lo - yAnterior) > Math.abs(hi - yAnterior) ? lo : hi;
  return { x, y: Math.round(y) };
}

/** Os rumos das `n` pupas de uma parada: um leque curto em volta de `base` (a direção da nave). */
export function pupaAngulos(base: number, n: number = ELITES.larva.pupasPorParada): number[] {
  const leque = (ELITES.larva.pupaLequeGraus * Math.PI) / 180;
  return Array.from({ length: n }, (_, i) => (n === 1 ? base : base - leque + (2 * leque * i) / (n - 1)));
}

/** Quanto a pupa já voou (px) aos `t` segundos: rápida no começo, assentando — e PARA. */
export function pupaVoo(t: number): number {
  const P = ELITES.pupa;
  const k = Math.min(1, Math.max(0, t / P.vooS));
  return P.vooPx * (1 - (1 - k) ** 2);
}

/** O quadro da pupa (0 apagada, 1 acesa): pulsa cada vez mais rápido até eclodir — o relógio que o jogador lê. */
export function pupaQuadro(t: number): 0 | 1 {
  const P = ELITES.pupa;
  const bate = t < P.eclodeS * 0.5 ? 0.5 : t < P.eclodeS * 0.8 ? 0.25 : 0.1;
  return (Math.floor(Math.max(0, t) / bate) % 2) as 0 | 1;
}

export const pupaEclode = (t: number): boolean => t >= ELITES.pupa.eclodeS;

/** A mosca persegue enquanto a nave está à frente dela; passou, segue reto e sai da tela (§2.2). */
export const moscaPersegue = (x: number, alvoX: number): boolean => x > alvoX;

/**
 * O quadro assado do BURACO aos `t` segundos da fase: `abre` = os quadros 0–4, e fica no 4; `fecha` = a boca volta
 * (2, 1, 0), depois a cicatriz (5–8) perdendo pixels; `null` = sumiu.
 */
export function buracoQuadro(fase: 'abre' | 'fecha', t: number): number | null {
  const B = ELITES.buraco;
  if (fase === 'abre') return Math.min(4, Math.max(0, Math.floor((t / B.abreS) * 5)));
  if (t < B.fechaS) return 2 - Math.min(2, Math.max(0, Math.floor((t / B.fechaS) * 3)));
  const u = (t - B.fechaS) / B.cicatrizS;
  return u < 1 ? 5 + Math.floor(u * 4) : null;
}

export type EstadoTubo = 'aguarda' | 'rola' | 'incha' | 'pulsa';

/** A distância (px) da coordenada de mundo `xMundo` à emenda de placas mais próxima — a parede tem degrau ali. */
export function distEmenda(xMundo: number): number {
  const placa = ELITES.tubo.placa;
  const m = ((xMundo % placa) + placa) % placa;
  return Math.min(m, placa - m);
}

/** O plantio das mesas do corredor: falta `timer` s para a próxima, nasce uma a cada `rate` s (0 = nenhuma), a `vel` px/s. */
export interface PlantioMesas {
  timer: number;
  rate: number;
  vel: number;
}

/**
 * O Tubo CABE na parede agora, na coluna de mundo `xMundo`? Longe da emenda de duas placas e ENTRE duas mesas: a
 * anterior já andou `(rate − timer) × vel` desde que nasceu em `mesaX`, e a seguinte nasce lá daqui a `timer` s.
 */
export function tuboCabe(xMundo: number, mesas: PlantioMesas): boolean {
  const T = ELITES.tubo;
  if (distEmenda(xMundo) < T.largura / 2 + T.folgaEmenda) return false;
  if (mesas.rate <= 0) return true;
  const folga = T.larguraMesa / 2 + T.largura / 2 + T.folgaMesa;
  const d = T.nasceX - T.mesaX;
  return (mesas.rate - mesas.timer) * mesas.vel + d >= folga && mesas.timer * mesas.vel - d >= folga;
}

/** O ciclo do Tubo plantado (§3): rola com a parede; ao chegar ao ponto do pulso, INCHA e PULSA. `pulsos` = os já dados. */
export function tuboAvanca(estado: EstadoTubo, t: number, x: number, pulsos: number): EstadoTubo {
  const T = ELITES.tubo;
  if (estado === 'rola') return pulsos < T.pulsos && x <= T.pulsoX[pulsos] ? 'incha' : estado;
  if (estado === 'incha') return t >= T.inchaS ? 'pulsa' : estado;
  if (estado === 'pulsa') return t >= T.pulsaS ? 'rola' : estado;
  return estado;
}

/** O quadro do clipe `pulso` (17 quadros): 0 = fechado; 0–9 incha; 10–16 estala e assenta. */
export function tuboQuadro(estado: EstadoTubo, t: number): number {
  const T = ELITES.tubo;
  if (estado === 'incha') return Math.min(9, Math.max(0, Math.floor((t / T.inchaS) * 10)));
  if (estado === 'pulsa') return 10 + Math.min(6, Math.max(0, Math.floor((t / T.pulsaS) * 7)));
  return 0;
}

/**
 * Os rumos do MEIO-ANEL (rad; na tela o y cresce para baixo): no chão ele abre para CIMA, no teto para BAIXO — sempre
 * para dentro do corredor. O pulso ímpar sai defasado meio passo, com um tiro a menos (o que cairia dentro da parede).
 */
export function tuboAngulos(pulso: number, teto: boolean): number[] {
  const T = ELITES.tubo;
  const passo = Math.PI / (T.tirosN - 1);
  const fase = pulso % 2 === 1 ? 0.5 : 0;
  return Array.from({ length: fase ? T.tirosN - 1 : T.tirosN }, (_, i) => (teto ? 1 : -1) * (i + fase) * passo);
}
```

- [x] **Step 5: ver passar**

Run: `node scripts/test-elites-regras.mjs` → a última linha é `TUDO OK`.
Run: `npx tsc --noEmit` → sem saída.

- [ ] **Step 6: commit** (quando ele pedir) — `git add src/data/numerosElites.ts src/elitesRegras.ts scripts/test-elites-regras.mjs` ·
  `feat(elites): as regras e os números da F4 — a Larva (buraco, postos no vão, pupas que eclodem) e o Tubo (cabe entre as mesas, o meio-anel defasado)`

---

### Task 2: A arte instalada (os gestos das 4 variações e as peças à mão)

**Files:** Create `scripts/_elites/_mao-f4.mjs`, `scripts/_elites/_instalar-f4.mjs`; Modify
`scripts/_elites/_gif-f4.mjs`, `src/scenes/BootScene.ts`.

**Interfaces — Produces (chaves de textura):**

| Prefixo / chave | Quadros | Arquivo |
|---|---|---|
| `eliteLarvaAPoeAnim`, `eliteLarvaATrancoAnim`, `eliteLarvaASaiAnim`, `eliteLarvaAPerfuraAnim` | 17 cada | `sprites/elite-larva-a-<gesto>-N.png` |
| `eliteLarvaAMergulhaAnim` | 9 | `sprites/elite-larva-a-mergulha-N.png` |
| os mesmos cinco com `D` | 17/17/17/17/9 | `sprites/elite-larva-d-<gesto>-N.png` |
| `eliteTuboCPulsoAnim`, `eliteTuboDPulsoAnim` | 17 cada | `sprites/elite-tubo-<c\|d>-pulso-N.png` |
| `eliteBuracoAnim` | 9 (0–4 abre, 5–8 cicatriz) | `sprites/elite-buraco-N.png` |
| `elitePupaAnim` | 2 | `sprites/elite-pupa-N.png` |
| `eliteMoscaAnim` | 2 | `sprites/elite-mosca-N.png` |
| `eliteTiroAnel` | — | `sprites/tiros/elite-anel.png` |

A textura de um quadro é `<prefixo><n>` (ex.: `eliteLarvaDPoeAnim9`). **Larva:** cada clipe numa caixa quadrada com o
centro da criatura no centro (a caixa muda de clipe para clipe, o centro não). **Tubo:** todos os quadros de uma
variação na MESMA caixa, com o PÉ na última linha e a coluna do meio no meio — o jogo ancora pelo pé.

- [x] **Step 1: a lib das peças à mão** — criar `scripts/_elites/_mao-f4.mjs`, movendo para ela o que hoje mora no
  `_gif-f4.mjs` (`pixel`, `CORES`, a pupa, o tiro, o buraco) e acrescentando a mosca:

```js
// THE F4 HAND-DRAWN PIECES (spec fatia F4 §5), shared by the staged GIF (`_gif-f4.mjs`) and the installer
// (`_instalar-f4.mjs`): the pupa, the fly, the ring shot and the hole. All of them are DRAFTS until he approves them.
import sharp from 'sharp';

/** A tiny sprite drawn by hand: rows of characters, one colour per character. Returns a PNG buffer. */
export const pixel = (linhas, cores) => {
  const w = linhas[0].length, h = linhas.length, buf = Buffer.alloc(w * h * 4);
  linhas.forEach((l, y) => [...l].forEach((c, x) => {
    const cor = cores[c];
    if (cor) buf.set([...cor, 255], (y * w + x) * 4);
  }));
  return sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
};
/** The elites' reds, dark to bright; `w` = the fly's wing. */
export const CORES = { k: [20, 8, 12], d: [92, 22, 30], r: [168, 36, 44], o: [236, 72, 56], y: [255, 168, 96], w: [214, 132, 120] };

/** The PUPA, 7×8: dark, and lit (it pulses between the two). */
export const pupa = () => Promise.all([
  pixel(['..kkk..', '.kdrdk.', 'kdrrrdk', 'kdrorrk', 'kdrrrdk', 'kdrrrdk', '.kdrdk.', '..kkk..'], CORES),
  pixel(['..kkk..', '.krork.', 'kroyork', 'koyyyok', 'kroyork', 'krrorrk', '.krrrk.', '..kkk..'], CORES),
]);

/** The FLY, 9×6, facing LEFT (the lit eye in front): wings up, wings swept back. */
export const mosca = () => Promise.all([
  pixel(['....ww...', '...www...', '.kkkwkk..', 'kyrrrddk.', 'krrrdddk.', '.kkkkkk..'], CORES),
  pixel(['.........', '.........', '.kkkkkwww', 'kyrrrddww', 'krrrdddk.', '.kkkkkk..'], CORES),
]);

/** The RING SHOT, 5×5: round, a lit core in a dark rim (of the family of the other elites' shots). */
export const tiroAnel = () => pixel(['.kkk.', 'krook', 'koyok', 'krook', '.kkk.'], CORES);

export const BW = 32, BH = 28;
/**
 * THE HOLE: a torn mouth in the painting — the palette is sampled from the duct's own red wall (the neighbour), the
 * steps joined by a 2×2 Bayer dither. Returns { abre: 5 buffers (opening), cicatriz: 4 buffers (the scar, losing pixels) }.
 */
export async function buraco(fotoDoDuto) {
  const parede = await sharp(fotoDoDuto).extract({ left: 0, top: 14, width: 384, height: 60 }).raw().toBuffer({ resolveWithObject: true });
  const vermelhos = [];
  for (let i = 0; i < parede.data.length; i += parede.info.channels) {
    const [r, g, b] = [parede.data[i], parede.data[i + 1], parede.data[i + 2]];
    if (r > 36 && r > g * 1.7) vermelhos.push([r, g, b]);
  }
  vermelhos.sort((a, b) => a[0] - b[0]);
  const tom = (p) => vermelhos[Math.floor(p * (vermelhos.length - 1))];
  const PAL = { fundo: [6, 3, 5], breu: tom(0.04).map((c) => c >> 1), garganta: tom(0.12), labio: tom(0.6), luz: tom(0.93) };
  const RX = 12, RY = 10;
  const BAYER = [[0, 2], [3, 1]];
  const RACHAS = [[0.35, 6], [1.5, 4], [2.6, 7], [3.7, 5], [4.6, 6], [5.6, 4]]; // [angle, length]
  const borda = (ang) => 1 + 0.13 * Math.sin(3 * ang + 1.3) + 0.08 * Math.sin(7 * ang + 0.4) + 0.05 * Math.sin(11 * ang + 2.1);
  const quadro = (s, resto = 1) => {
    const buf = Buffer.alloc(BW * BH * 4);
    const pinta = (x, y, cor) => {
      if (x < 0 || y < 0 || x >= BW || y >= BH) return;
      if (resto < 1 && (BAYER[y & 1][x & 1] + 0.5) / 4 > resto) return;
      buf.set([...cor, 255], (y * BW + x) * 4);
    };
    const cx = BW / 2, cy = BH / 2;
    // The cracks first: they are what is left when the mouth is shut — and then they are the SCAR, in the lip's red
    // (dark cracks vanish on the dark painting: the scar of the 1st draft, 13/10, could not be seen in game).
    const fechada = s <= 0.02;
    for (const [ang, comp] of RACHAS) {
      const r0 = Math.max(0, s) * (RX * 0.9), n = Math.round(comp * (0.5 + 0.5 * Math.min(1, s + 0.5)));
      for (let k = 0; k < n; k++) {
        const r = r0 + k, quebra = k > 2 ? Math.sin(ang * 5) * 0.25 : 0;
        pinta(Math.round(cx + Math.cos(ang + quebra) * r), Math.round(cy + Math.sin(ang + quebra) * r * (RY / RX)), fechada ? (k < n - 2 ? PAL.labio : PAL.garganta) : k < n - 2 ? PAL.breu : PAL.garganta);
      }
    }
    if (fechada) {
      // Shut: the lips pressed together, a jagged seam still lit.
      for (let x = -7; x <= 7; x++) pinta(Math.round(cx + x), Math.round(cy + Math.sin(x * 1.7) * 1.2), Math.abs(x) % 3 === 0 ? PAL.luz : PAL.labio);
      return sharp(buf, { raw: { width: BW, height: BH, channels: 4 } }).png().toBuffer();
    }
    const dentro = (x, y) => {
      const dx = (x + 0.5 - cx) / (RX * s), dy = (y + 0.5 - cy) / (RY * s);
      return Math.hypot(dx, dy) / borda(Math.atan2(dy, dx));
    };
    for (let y = 0; y < BH; y++)
      for (let x = 0; x < BW; x++) {
        const d = dentro(x, y), limiar = (BAYER[y & 1][x & 1] + 0.5) / 4;
        if (d >= 1) {
          // The dark outline: one pixel around the lip.
          if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => dentro(x + a, y + b) < 1)) pinta(x, y, PAL.breu);
          continue;
        }
        const cima = y + 0.5 < cy && x + 0.5 < cx + 3; // the light comes from the upper left, as in the painting
        let cor;
        if (d > 0.84) cor = cima && d > 0.9 ? PAL.luz : PAL.labio;
        else if (d > 0.66) cor = (d - 0.66) / 0.18 > limiar ? PAL.labio : PAL.garganta;
        else if (d > 0.46) cor = (d - 0.46) / 0.2 > limiar ? PAL.garganta : PAL.fundo;
        else cor = PAL.fundo;
        pinta(x, y, cor);
      }
    return sharp(buf, { raw: { width: BW, height: BH, channels: 4 } }).png().toBuffer();
  };
  return {
    abre: await Promise.all([0.12, 0.38, 0.72, 1.1, 1].map((s) => quadro(s))),
    cicatriz: await Promise.all([1, 0.75, 0.5, 0.25].map((r) => quadro(0, r))),
  };
}
```

- [x] **Step 2: o GIF encenado passa a usar a lib** — em `scripts/_elites/_gif-f4.mjs`:
  1. acrescentar `import { pixel, CORES, pupa, tiroAnel, buraco, BW, BH } from './_mao-f4.mjs';` e apagar as
     definições locais de `pixel` e `CORES`;
  2. no bloco `larva`: `const PUPA = await pupa();` no lugar do array à mão; apagar tudo de
     `const parede = await sharp(fundo)…` até a definição de `CICATRIZ` e pôr
     `const { abre: ABRE, cicatriz: CICATRIZ } = await buraco(fundo);`;
  3. no bloco `tubo`: `const TIRO = await tiroAnel();`.

  Run: `node scripts/_elites/_gif-f4.mjs larva && node scripts/_elites/_gif-f4.mjs tubo`
  Expected: os dois GIFs saem (`gif-larva-ciclo.gif 134 quadros`; `gif-tubo-C-D.gif 96 quadros`), e
  a única diferença visível é a cicatriz mais clara.

- [x] **Step 3: o instalador** — criar `scripts/_elites/_instalar-f4.mjs`:

```js
// INSTALLS THE F4 ELITES' ART (13/10) into public/sprites: the PixMiniMax gestures of the FOUR approved variations
// (Larva A and D, Tube C and D — he kept both of each) and the hand-drawn pieces (`_mao-f4.mjs`).
// The clips are 80×80 frames generated from `anim/base-*.png` (the creature centred at 40,40; the Tube's foot on row 60).
// They go in RAW, only cropped: these are the frames he approved in the staged GIFs, and the swell of the Tube and
// the ember of the drill light colours the still art does not have (no palette snap, unlike the squid's).
//   LARVA — every clip in ONE square box centred on the creature's centre (the game only swaps textures).
//   TUBE  — every frame of a variation in ONE box: the middle column in the middle, the FOOT on the last row.
//   node scripts/_elites/_instalar-f4.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { pupa, mosca, tiroAnel, buraco } from './_mao-f4.mjs';

const FOLHA = 'docs/superpowers/folhas/2026-10-13/elites/f4';
const OUT = 'public/sprites';
const CENTRO = 40, PE = 60;
/** The take of each gesture (folders in FOLHA/anim) — the ones staged in `gif-larva-ciclo.gif`. */
const LARVA = {
  a: { poe: 'larva-A-poe', tranco: 'larva-A-tranco', sai: 'larva-A-sai-1', perfura: 'larva-A-perfura-2', mergulha: 'larva-A-mergulha-1' },
  d: { poe: 'larva-D-poe', tranco: 'larva-D-tranco', sai: 'larva-D-sai-2', perfura: 'larva-D-perfura-1', mergulha: 'larva-D-mergulha-2' },
};
const TUBO = { c: 'tubo-C-pulso', d: 'tubo-D-pulso' };

const ler = async (arq) => {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { d: Buffer.from(data), w: info.width, h: info.height };
};
const lerClipe = async (dir) => {
  const n = fs.readdirSync(`${FOLHA}/anim/${dir}`).filter((f) => /^\d+\.png$/.test(f)).length;
  const q = [];
  for (let i = 0; i < n; i++) q.push(await ler(`${FOLHA}/anim/${dir}/${i}.png`));
  return q;
};
/** Crops the box [x0, x0+w) × [y0, y0+h) out of a frame and writes it. */
const recortar = (q, x0, y0, w, h, arq) => sharp(q.d, { raw: { width: q.w, height: q.h, channels: 4 } }).extract({ left: x0, top: y0, width: w, height: h }).png().toFile(arq);
/** The opaque pixels of a list of frames: how far they reach from the centre column/row, and their top row. */
function medir(quadros) {
  let kx = 0, ky = 0, topo = Infinity, base = -1;
  for (const q of quadros)
    for (let y = 0; y < q.h; y++)
      for (let x = 0; x < q.w; x++) {
        if (q.d[(y * q.w + x) * 4 + 3] < 128) continue;
        kx = Math.max(kx, Math.abs(x - CENTRO));
        ky = Math.max(ky, Math.abs(y - CENTRO));
        topo = Math.min(topo, y);
        base = Math.max(base, y);
      }
  return { kx, ky, topo, base };
}

const frames = [];
for (const [v, gestos] of Object.entries(LARVA))
  for (const [gesto, dir] of Object.entries(gestos)) {
    const q = await lerClipe(dir);
    const { kx, ky } = medir(q);
    const k = Math.max(kx, ky), lado = 2 * k + 1;
    for (const [i, f] of q.entries()) await recortar(f, CENTRO - k, CENTRO - k, lado, lado, `${OUT}/elite-larva-${v}-${gesto}-${i}.png`);
    console.log(`larva ${v.toUpperCase()} ${gesto} (${dir}): ${q.length} quadros, caixa ${lado}×${lado}`);
    frames.push(`eliteLarva${v.toUpperCase()}${gesto[0].toUpperCase()}${gesto.slice(1)}Anim: ${q.length}`);
  }
for (const [v, dir] of Object.entries(TUBO)) {
  const q = await lerClipe(dir);
  const { kx, topo, base } = medir(q);
  if (base >= PE) throw new Error(`tubo ${v}: pixels abaixo do pé (linha ${base}) — a base saiu do lugar`);
  const w = 2 * kx + 1, h = PE - topo;
  for (const [i, f] of q.entries()) await recortar(f, CENTRO - kx, topo, w, h, `${OUT}/elite-tubo-${v}-pulso-${i}.png`);
  console.log(`tubo ${v.toUpperCase()} pulso (${dir}): ${q.length} quadros, caixa ${w}×${h}, o pé na última linha`);
  frames.push(`eliteTubo${v.toUpperCase()}PulsoAnim: ${q.length}`);
}

// The hand-drawn pieces (drafts until he approves them).
const escrever = async (bufs, nome) => { for (const [i, b] of bufs.entries()) await sharp(b).toFile(`${OUT}/${nome}-${i}.png`); };
await escrever(await pupa(), 'elite-pupa');
await escrever(await mosca(), 'elite-mosca');
await sharp(await tiroAnel()).toFile(`${OUT}/tiros/elite-anel.png`);
const b = await buraco(`${FOLHA}/ref/fundo-duto.png`);
await escrever([...b.abre, ...b.cicatriz], 'elite-buraco');
console.log('peças à mão: elite-pupa-0..1, elite-mosca-0..1, tiros/elite-anel, elite-buraco-0..8 (0–4 abre, 5–8 cicatriz)');
console.log(`BootScene FRAMES: ${frames.join(', ')}, eliteBuracoAnim: 9, elitePupaAnim: 2, eliteMoscaAnim: 2`);
```

- [x] **Step 4: instalar**

Run: `node scripts/_elites/_instalar-f4.mjs`
Expected: 12 linhas de clipe (10 da Larva com caixas de 35×35 a 51×51, 2 do Tubo com `caixa 39×40` e `47×40`), a linha
das peças à mão e a linha `BootScene FRAMES: eliteLarvaAPoeAnim: 17, …, eliteTuboDPulsoAnim: 17, eliteBuracoAnim: 9,
elitePupaAnim: 2, eliteMoscaAnim: 2`. Em `public/sprites` nascem 201 PNGs `elite-larva-*`/`elite-tubo-*`/`elite-buraco-*`/
`elite-pupa-*`/`elite-mosca-*` e `tiros/elite-anel.png`.

- [x] **Step 5: a `BootScene`** — em `src/scenes/BootScene.ts`:

  (a) em `FRAMES`, depois de `eliteTintaCortinaAnim: 38,`:

```ts
  // Os ELITES DA F4 (13/10): os gestos PixMiniMax das DUAS variações de cada um (Larva A e D, Tubo C e D) e as peças
  // à mão, instalados por `scripts/_elites/_instalar-f4.mjs` (a Larva numa caixa por clipe, o centro no centro; o Tubo
  // com o pé na última linha).
  eliteLarvaAPoeAnim: 17,
  eliteLarvaATrancoAnim: 17,
  eliteLarvaASaiAnim: 17,
  eliteLarvaAPerfuraAnim: 17,
  eliteLarvaAMergulhaAnim: 9,
  eliteLarvaDPoeAnim: 17,
  eliteLarvaDTrancoAnim: 17,
  eliteLarvaDSaiAnim: 17,
  eliteLarvaDPerfuraAnim: 17,
  eliteLarvaDMergulhaAnim: 9,
  eliteTuboCPulsoAnim: 17,
  eliteTuboDPulsoAnim: 17,
  // O buraco da Larva (0–4 abre, 5–8 cicatriz), a pupa (apagada, acesa) e a mosca (asa para cima, asa para trás).
  eliteBuracoAnim: 9,
  elitePupaAnim: 2,
  eliteMoscaAnim: 2,
```

  (b) no mapa de PNGs, depois de `...animFrames('eliteTintaCortinaAnim', 'elite-tinta-cortina'),`:

```ts
  // OS ELITES DA F4 (13/10): a Larva Mecânica (A e D) e o Tubo Pulsante (C e D) — ver `FRAMES`.
  ...animFrames('eliteLarvaAPoeAnim', 'elite-larva-a-poe'),
  ...animFrames('eliteLarvaATrancoAnim', 'elite-larva-a-tranco'),
  ...animFrames('eliteLarvaASaiAnim', 'elite-larva-a-sai'),
  ...animFrames('eliteLarvaAPerfuraAnim', 'elite-larva-a-perfura'),
  ...animFrames('eliteLarvaAMergulhaAnim', 'elite-larva-a-mergulha'),
  ...animFrames('eliteLarvaDPoeAnim', 'elite-larva-d-poe'),
  ...animFrames('eliteLarvaDTrancoAnim', 'elite-larva-d-tranco'),
  ...animFrames('eliteLarvaDSaiAnim', 'elite-larva-d-sai'),
  ...animFrames('eliteLarvaDPerfuraAnim', 'elite-larva-d-perfura'),
  ...animFrames('eliteLarvaDMergulhaAnim', 'elite-larva-d-mergulha'),
  ...animFrames('eliteTuboCPulsoAnim', 'elite-tubo-c-pulso'),
  ...animFrames('eliteTuboDPulsoAnim', 'elite-tubo-d-pulso'),
  ...animFrames('eliteBuracoAnim', 'elite-buraco'),
  ...animFrames('elitePupaAnim', 'elite-pupa'),
  ...animFrames('eliteMoscaAnim', 'elite-mosca'),
```

  (c) depois de `eliteTiroAgulha: 'sprites/tiros/elite-agulha.png',`:

```ts
  // O TIRO DA F4 (à mão, rascunho de 13/10): a bolha do meio-anel do Tubo, 5×5, redonda (não gira).
  eliteTiroAnel: 'sprites/tiros/elite-anel.png',
```

  Se a contagem impressa no Step 4 diferir de 17/9, vale a impressa.

- [x] **Step 6: conferir** — `npx tsc --noEmit` limpo; com `npm run dev` rodando, abrir `http://localhost:5173/` e
  conferir no console do navegador que não há 404 de `elite-larva`/`elite-tubo`/`elite-buraco`/`elite-pupa`/`elite-mosca`.

- [ ] **Step 7: commit** (quando ele pedir) — `git add scripts/_elites/_mao-f4.mjs scripts/_elites/_instalar-f4.mjs scripts/_elites/_gif-f4.mjs src/scenes/BootScene.ts public/sprites/elite-larva-* public/sprites/elite-tubo-* public/sprites/elite-buraco-* public/sprites/elite-pupa-* public/sprites/elite-mosca-* public/sprites/tiros/elite-anel.png` ·
  `feat(elites): a arte da F4 instalada — os gestos das duas variações da Larva (A, D) e do Tubo (C, D), e as peças à mão (buraco, pupa, mosca, tiro do anel) como rascunho`

---

### Task 3: A infraestrutura (nascer, a parede, o vão, o fundo, o miúdo)

**Files:** Modify `src/entities/elites/tipos.ts`, `src/systems/Moldura.ts`, `src/Parallax.ts`,
`src/systems/PadroesDeTiro.ts`, `src/systems/EnemySystem.ts`, `src/scenes/GameScene.ts`

**Interfaces — Produces:**

- `interface ParedeElite { mundoDe(xTela): number; telaDe(xMundo): number; superficie(xTela, teto: boolean): number; mesas(): PlantioMesas }`
- `GanchosElite.vao: (x: number) => Vao`, `GanchosElite.parede: ParedeElite`, `GanchosElite.velFundo: () => number`
- `CtxElite.nascer: (kind: EnemyKind, x: number, y: number) => Sprite`
- `ComportamentoElite.noChao?(e: Sprite, dt: number, ctx: CtxElite): void` — chamado SEMPRE, até travado.
- `Moldura.mundoDe(xTela: number): number`, `Moldura.telaDe(xMundo: number): number`
- `Parallax.fatorPintura: number` (getter)
- `EnemySystem.spawn(kind, y, x?): Phaser.Physics.Arcade.Sprite` (devolvia `void`); `e.getData('ordem')` = quantos do
  mesmo tipo nasceram antes dele nesta cena; `EnemyDef.miudo?: boolean`.

- [x] **Step 1: `tipos.ts`** — trocar o cabeçalho e as três interfaces por:

```ts
import type Phaser from 'phaser';
import type { PlantioMesas, Vao } from '../../elitesRegras';
import type { EnemyKind } from '../../systems/EnemySystem';
import type { PadroesDeTiro } from '../../systems/PadroesDeTiro';

export type Sprite = Phaser.Physics.Arcade.Sprite;

/** A PAREDE da F4 (a `Moldura`), para o que vive preso a ela — o Tubo (spec F4 §3). */
export interface ParedeElite {
  /** A coordenada de MUNDO da coluna `xTela` (o mundo rola para a esquerda)… */
  mundoDe: (xTela: number) => number;
  /** …e a volta: onde a coordenada de mundo está na tela, na MESMA grade de pixel das placas da borda. */
  telaDe: (xMundo: number) => number;
  /** A linha da superfície na coluna `xTela`: a de cima do chão, ou a de baixo do teto. ⚠️ Só para `xTela >= -128`. */
  superficie: (xTela: number, teto: boolean) => number;
  /** O plantio das mesas do corredor agora (`tuboCabe`). */
  mesas: () => PlantioMesas;
}

/** O que a cena entrega aos elites — as únicas portas para fora do `EnemySystem`. */
export interface GanchosElite {
  /** Cria o asteroide minerável em (x, y) (`DebrisSystem.spawnEm('mineravel', …)`). */
  criarRocha: (x: number, y: number) => Sprite | null;
  /** A explosão INIMIGA em raio: o estouro e, se a nave estiver a `raio` px, o dano nela. */
  explodir: (x: number, y: number, raio: number) => void;
  /** As bordas do VÃO na coluna x: o corredor da F4 (entre as mesas); sem corredor, as superfícies da borda. */
  vao: (x: number) => Vao;
  parede: ParedeElite;
  /** A velocidade (px/s, para a esquerda) com que a PINTURA de fundo rola agora — o buraco da Larva anda com ela. */
  velFundo: () => number;
}

export interface CtxElite {
  scene: Phaser.Scene;
  /** A nave. */
  alvo: Sprite;
  tiros: PadroesDeTiro;
  ganchos: GanchosElite;
  /** Faz NASCER outro inimigo em (x, y) — a pupa da Larva, a mosca da pupa. Ele entra no grupo dos inimigos. */
  nascer: (kind: EnemyKind, x: number, y: number) => Sprite;
}
```

  e, dentro de `ComportamentoElite`, depois do `aoRabo?`:

```ts
  /**
   * O que ANDA COM A PAREDE (o Tubo da F4), chamado SEMPRE — inclusive com o elite travado pelo elétrico: a parede não
   * para, e um Tubo parado sobre uma parede correndo descola dela.
   */
  noChao?(e: Sprite, dt: number, ctx: CtxElite): void;
```

- [x] **Step 2: a `Moldura`** — em `src/systems/Moldura.ts`, logo antes do comentário `⚠️ O CONTRATO DAS TRÊS CONSULTAS ABAIXO`:

```ts
  /** A coordenada de MUNDO da coluna `xTela` — o que o Tubo (frente B, F4) guarda para andar com a parede. */
  mundoDe(xTela: number): number {
    return this.xMundo + xTela;
  }

  /**
   * Onde a coordenada de mundo `xMundo` está NA TELA — pela mesma conta do `avanca`: quem é arredondado para a grade de
   * pixel é a PLACA, e a coluna vai dentro dela. Arredondar a coluna sozinha a faria tremer 1px contra a parede.
   */
  telaDe(xMundo: number): number {
    const base = Math.floor(this.xMundo / Moldura.LARGURA);
    const off = this.xMundo - base * Moldura.LARGURA;
    const n = Math.floor(xMundo / Moldura.LARGURA);
    return Math.round((n - base) * Moldura.LARGURA - off) + (xMundo - n * Moldura.LARGURA);
  }

```

- [x] **Step 3: o `Parallax`** — em `src/Parallax.ts`, logo antes de `update(dt: number, worldSpeed: number): void {`:

```ts
  /**
   * A fração da velocidade do mundo com que a PINTURA de fundo rola (o `bgFactor` dela; 0 sem pintura). O buraco da
   * Larva (frente B, F4) mora na pintura e anda com ela.
   */
  get fatorPintura(): number {
    const bg = this.paintedBg[0];
    return bg ? ((bg.getData('bgFactor') as number | undefined) ?? 0.04) : 0;
  }

```

- [x] **Step 4: `PadroesDeTiro.disparar`** — o giro passa para ANTES do `vestir`, para um tiro redondo poder zerá-lo.
  Trocar

```ts
    vestir(b);
    // Origem: a carência contra o relevo (ver GameScene).
    b.setData('ox', x);
    b.setData('oy', y);
    b.setVelocity(Math.cos(angulo) * vel, Math.sin(angulo) * vel);
    b.setRotation(angulo);
    return true;
```

  por

```ts
    // O giro ANTES do `vestir`: um tiro redondo (o do anel do Tubo) o zera ali — girado, o pixel dele entorta.
    b.setRotation(angulo);
    vestir(b);
    // Origem: a carência contra o relevo (ver GameScene).
    b.setData('ox', x);
    b.setData('oy', y);
    b.setVelocity(Math.cos(angulo) * vel, Math.sin(angulo) * vel);
    return true;
```

- [x] **Step 5: o `EnemySystem`** — em `src/systems/EnemySystem.ts`:

  (a) em `EnemyDef`, depois do campo `elite?`:

```ts
  /**
   * MIÚDO: dirigido por um `ComportamentoElite`, mas NÃO é um elite — a pupa e a mosca da Larva (F4). Não atenua o
   * primeiro plano (`temElite`).
   */
  miudo?: boolean;
```

  (b) o valor inicial de `ganchos` (o campo privado) passa a ser:

```ts
  private ganchos: GanchosElite = {
    criarRocha: () => null,
    explodir: () => {},
    vao: () => ({ teto: 10, chao: GAME_HEIGHT - 10 }),
    parede: { mundoDe: (x) => x, telaDe: (x) => x, superficie: (_x, teto) => (teto ? 10 : GAME_HEIGHT - 10), mesas: () => ({ timer: 0, rate: 0, vel: 0 }) },
    velFundo: () => 0,
  };
  /** Quantos de cada tipo já nasceram nesta cena — a `ordem` de cada um (as variações da F4 alternam por ela). */
  private readonly nascidos = new Map<EnemyKind, number>();
```

  (c) em `temElite`, a condição do `return` ganha o `miudo`:

```ts
      const def = DEFS[e.getData('kind') as EnemyKind];
      return e.active && def?.elite !== undefined && !def.miudo && e.x < GAME_WIDTH + 40;
```

  (d) `ctxElite` passa a entregar o `nascer`:

```ts
  private ctxElite(alvo: Phaser.Physics.Arcade.Sprite): CtxElite {
    return { scene: this.scene, alvo, tiros: this.tiros, ganchos: this.ganchos, nascer: (kind, x, y) => this.spawn(kind, y, x) };
  }
```

  (e) a assinatura do `spawn` devolve o sprite — `spawn(kind: EnemyKind, y: number, x = GAME_WIDTH + 16): Phaser.Physics.Arcade.Sprite {`
  — e o fim do método (as duas últimas linhas, o comentário do elite e o `if (def.elite)`) vira:

```ts
    // A ORDEM de nascimento do tipo (0, 1, 2…): as variações de arte da F4 alternam por ela (`varianteDe`).
    const ordem = this.nascidos.get(kind) ?? 0;
    this.nascidos.set(kind, ordem + 1);
    e.setData('ordem', ordem);

    // O ELITE monta o próprio estado (e o drone, a rocha dele). Antes do 1º `update` não há nave guardada — o
    // `iniciar` não mira ninguém, então o próprio sprite serve de alvo nesse instante.
    if (def.elite) def.elite.iniciar(e, this.ctxElite(this.alvo ?? e));
    return e;
  }
```

  (f) no `update`, logo depois do bloco do TRANCO e ANTES do comentário `// TRAVADO (eletrificado)`:

```ts
      // O que anda COM A PAREDE anda sempre — até travado (ver `ComportamentoElite.noChao`). Ele pode sair da tela ali.
      def.elite?.noChao?.(e, dt, this.ctxElite(target));
      if (!e.active) continue;

```

- [x] **Step 6: a `GameScene`** — em `src/scenes/GameScene.ts`:

  (a) logo depois de `this.moldura = new Moldura(this, this.stage.id === 4);`:

```ts
    // O SANDBOX da F4 não roda o roteiro, e sem ele a borda fica com espessura 0 (a superfície quase fora da tela). O
    // Tubo Pulsante (frente B) vive preso a ela: a borda de margem da fase (16px) nasce cravada.
    if (this.sandbox && this.stage.id === 4) this.moldura.setEspessura(16);
```

  (b) o `this.enemies.ligarElites({ … })` ganha três portas, depois do `explodir`:

```ts
      // A F4: o VÃO do corredor (a Larva nunca sai dele), a PAREDE (o Tubo vive preso a ela) e o FUNDO (o buraco).
      vao: (x) => {
        const meio = this.corredorGap / 2;
        if (meio <= 0) return { teto: this.moldura.superficieTetoEm(x), chao: this.moldura.superficieChaoEm(x) };
        const centro = this.moldura.vaoEm(x);
        return { teto: centro - meio, chao: centro + meio };
      },
      parede: {
        mundoDe: (x) => this.moldura.mundoDe(x),
        telaDe: (x) => this.moldura.telaDe(x),
        superficie: (x, teto) => (teto ? this.moldura.superficieTetoEm(x) : this.moldura.superficieChaoEm(x)),
        // No duto não nasce mesa (`spawnCorredores`): para o Tubo, é como não haver plantio.
        mesas: () => ({ timer: this.corredorTimer, rate: this.moldura.duto ? 0 : this.corredorRate, vel: SCROLL_SPEED }),
      },
      velFundo: () => SCROLL_SPEED * this.parallax.fatorPintura,
```

  (c) em `homingTargets`, o filtro dos inimigos ignora o intocável (a lula escondida, a Larva ainda no buraco, o Tubo
  esperando fora da tela — o teleguiado voava para um alvo que não existe):

```ts
    const alvos = (this.enemies.enemies.getChildren() as Phaser.Physics.Arcade.Sprite[]).filter(
      (e) => e.active && !this.enemies.intocavel(e),
    );
```

  (d) em `matarInimigo`, o estouro ganha o caso da pupa:

```ts
    const kind = e.getData('kind') as string;
    if (kind === 'aguaViva') {
      this.fx.choque(e.x, e.y, e.scale);
    } else if (kind === 'pupa') {
      // A pupa SOME sem explodir (spec F4 §2.2): só a faísca do acerto — quem ameaça é a mosca.
      this.fx.hit(e.x, e.y);
    } else {
      this.fx.explode(e.x, e.y, e.scale);
    }
```

- [x] **Step 7: conferir que nada da F2/F3 mudou**

Run: `npx tsc --noEmit` → sem saída.
Run (com `npm run dev` rodando): `node scripts/probe-elites.mjs` → `TUDO OK`; `node scripts/probe-elites-f3.mjs` →
`TUDO OK`; `node scripts/probe-f4-moldura.mjs` → como antes da mudança (rodar uma vez ANTES do Step 2 para ter a linha
de base).

- [ ] **Step 8: commit** (quando ele pedir) — `git add src/entities/elites/tipos.ts src/systems/Moldura.ts src/Parallax.ts src/systems/PadroesDeTiro.ts src/systems/EnemySystem.ts src/scenes/GameScene.ts` ·
  `feat(elites): a infraestrutura da F4 — o elite faz nascer outro inimigo, anda preso à parede (até travado), lê o vão e o fundo; o sandbox da F4 ganha a borda de 16px; o teleguiado ignora o intocável`

---

### Task 4: A pupa e a mosca

**Files:** Create `src/entities/elites/Pupa.ts`; Modify `src/systems/EnemySystem.ts`, `src/sandbox/config.ts`

**Interfaces:**
- Consumes: `pupaVoo`, `pupaQuadro`, `pupaEclode`, `moscaPersegue` (Task 1); `ctx.nascer` (Task 3); as texturas
  `elitePupaAnim0..1`, `eliteMoscaAnim0..1` (Task 2).
- Produces: `PUPA`, `MOSCA: ComportamentoElite`; `lancarPupa(e: Sprite, ang: number): void`; os tipos `'pupa'` e
  `'mosca'` no `EnemyKind`; `mosca` na montagem do sandbox.

- [x] **Step 1: `Pupa.ts`**

```ts
import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { moscaPersegue, pupaEclode, pupaQuadro, pupaVoo } from '../../elitesRegras';
import { vestir, type ComportamentoElite, type Sprite } from './tipos';

const M = ELITES.mosca;
/** As hitboxes, fixas: o miolo da pupa (7×8) e o corpo da mosca (9×6, sem as asas). */
const CORPO_PUPA = { w: 5, h: 6 };
const CORPO_MOSCA = { w: 6, h: 4 };

interface EstadoPupa {
  t: number;
  /** De onde saiu (a Larva) e para onde. */
  ox: number;
  oy: number;
  ang: number;
}

/** A Larva dá o rumo da pupa que acabou de pôr (o `iniciar` não o conhece: ela nasce pelo `ctx.nascer`). */
export function lancarPupa(e: Sprite, ang: number): void {
  (e.getData('elite') as EstadoPupa).ang = ang;
}

/**
 * A PUPA (spec F4 §2.2, a ideia dele: *"se o jogador explodir, corta o ciclo… se deixar elas viram moscas"*): sai da
 * Larva, voa um pouco e PARA no ar; pulsa cada vez mais rápido e eclode numa MOSCA. Um tiro a mata (1 de vida) e some
 * sem estouro (`GameScene.matarInimigo`). Não explode por proximidade — encostar nela fere, como em qualquer inimigo.
 * Travada pelo elétrico, o relógio dela para (o `atualizar` não roda).
 */
export const PUPA: ComportamentoElite = {
  iniciar(e) {
    e.setFlipX(false);
    vestir(e, 'elitePupaAnim0', CORPO_PUPA);
    const s: EstadoPupa = { t: 0, ox: e.x, oy: e.y, ang: Math.PI };
    e.setData('elite', s);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoPupa;
    s.t += dt;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (pupaEclode(s.t)) {
      // Eclodiu: a mosca nasce no lugar; a pupa some sem pontos (não é o caminho de morte).
      ctx.nascer('mosca', e.x, e.y);
      e.destroy();
      return;
    }
    const d = pupaVoo(s.t);
    e.setPosition(s.ox + Math.cos(s.ang) * d, s.oy + Math.sin(s.ang) * d);
    const chave = `elitePupaAnim${pupaQuadro(s.t)}`;
    if (e.texture.key !== chave) vestir(e, chave, CORPO_PUPA);
  },
};

/**
 * A MOSCA (spec F4 §2.2): nasce da pupa e voa em curva na direção da nave — a perseguição do kamikaze (aceleração,
 * com inércia), mais lenta. Passou da nave sem acertar: para de perseguir, segue reto e sai da tela. A arte é
 * pequena demais para girar: ela só bate a asa, virada para a esquerda.
 */
export const MOSCA: ComportamentoElite = {
  iniciar(e, ctx) {
    e.setFlipX(false);
    vestir(e, 'eliteMoscaAnim0', CORPO_MOSCA);
    e.setData('elite', { t: 0 });
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(M.velMax, M.velMax);
    // Antes do 1º `update` do sistema o alvo é o próprio sprite (ver `EnemySystem.spawn`): aí ela parte para a esquerda.
    const ang = ctx.alvo === e ? Math.PI : Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
    body.setVelocity(Math.cos(ang) * M.velInicial, Math.sin(ang) * M.velInicial);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as { t: number };
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    if (moscaPersegue(e.x, ctx.alvo.x)) {
      const ang = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
      body.setAcceleration(Math.cos(ang) * M.perseguicao, Math.sin(ang) * M.perseguicao);
    } else {
      body.setAcceleration(0, 0);
    }
    const chave = `eliteMoscaAnim${Math.floor(s.t / M.bateAsaS) % 2}`;
    if (e.texture.key !== chave) vestir(e, chave, CORPO_MOSCA);
  },
};
```

- [x] **Step 2: os DEFS** — em `src/systems/EnemySystem.ts`: `import { MOSCA, PUPA } from '../entities/elites/Pupa';`;
  no `EnemyKind`, depois de `| 'cacador'` (o `;` passa para a última linha):

```ts
  // A F4 (spec 2026-10-12-frente-b-fatia-f4-design.md): os MIÚDOS da Larva — a pupa que ela põe e a mosca que nasce dela.
  | 'pupa'
  | 'mosca';
```

  e em `DEFS`, depois da linha do `cacador`:

```ts
  // A F4: os MIÚDOS da Larva. Nascem pelo `ctx.nascer` (a pupa, da Larva; a mosca, da pupa) — e, por morarem neste
  // grupo, todas as cartas funcionam neles sem código novo (o míssil trava na pupa, o elétrico prende a mosca).
  pupa: { texture: 'elitePupaAnim0', hp: ELITES.pupa.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.pupa.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0, elite: PUPA, miudo: true },
  mosca: { texture: 'eliteMoscaAnim0', hp: ELITES.mosca.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.mosca.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0, elite: MOSCA, miudo: true },
```

- [x] **Step 3: o sandbox** — em `src/sandbox/config.ts`: `'mosca'` entra em `INIMIGOS` antes de `'aranha'`;
  `NOME_INIMIGO.mosca = 'mosca da larva (F4)'`; `MAX_POR_ONDA.mosca = 20`; `PADRAO.inimigos.mosca = 0`. (A pupa não
  entra na montagem: ela só existe posta pela Larva.)

- [x] **Step 4: conferir** — `npx tsc --noEmit` limpo. No navegador, `http://localhost:5173/?sandbox`, fase 4, 6 moscas
  por onda: elas entram pela direita, curvam para a nave, morrem com um tiro, e a que erra sai pela esquerda.

- [ ] **Step 5: commit** (quando ele pedir) — `git add src/entities/elites/Pupa.ts src/systems/EnemySystem.ts src/sandbox/config.ts` ·
  `feat(elites): a pupa e a mosca — a pupa voa, para, pulsa e eclode; a mosca persegue mais lenta que o kamikaze e, se erra, sai da tela`

---

### Task 5: A Larva Mecânica

**Files:** Create `src/entities/elites/Buraco.ts`, `src/entities/elites/Larva.ts`; Modify
`src/systems/EnemySystem.ts`, `src/sandbox/config.ts`

**Interfaces:**
- Consumes: `larvaAvanca`, `larvaTangivel`, `larvaQuadro`, `larvaPosto`, `pupaAngulos`, `varianteDe`, `buracoQuadro`
  (Task 1); `ganchos.vao`, `ganchos.velFundo`, `ctx.nascer`, `e.getData('ordem')` (Task 3); `lancarPupa` (Task 4); as
  texturas `eliteLarva<A|D><Poe|Tranco|Sai|Perfura|Mergulha>Anim<n>` e `eliteBuracoAnim0..8` (Task 2).
- Produces: `abrirBuraco(cena, x, y, velFundo): Buraco` com `Buraco.fechar(): void`; `LARVA: ComportamentoElite`; o
  tipo `'larva'`. O estado em `e.getData('elite')`: `{ fase: EstadoLarva; t; variante: 'A' | 'D'; paradas; posto }`.
  O buraco é uma `Image` com `getData('buraco')` = `'abre'` ou `'fecha'` (a sonda conta por aí).

- [x] **Step 1: `Buraco.ts`**

```ts
import type Phaser from 'phaser';
import { buracoQuadro } from '../../elitesRegras';

export interface Buraco {
  /** Fecha (uma vez só): a boca volta, fica a cicatriz, e ela some sozinha. */
  fechar(): void;
}

const PREFIXO = 'eliteBuracoAnim';
/**
 * NA FRENTE DE TODO O CENÁRIO DE FUNDO, atrás da borda (−0,6), das mesas (−0,5) e dos inimigos (spec F4 §6).
 * ⚠️ A 1ª versão (13/10) o punha colado na pintura (−95,9), atrás das costelas e do maquinário: no duto uma peça do
 * cenário TAPAVA o buraco de chegada, e ele é o aviso de que ela vem. O preço de estar na frente: uma costela que passe
 * por trás desliza sob ele (ela rola a 40% do mundo; ele, com a pintura, a 2%).
 */
const DEPTH = -0.7;

/**
 * O BURACO da Larva (spec F4 §2.1, pedido dele: *"quero que a saída dela seja ela entrando num buraco"*): quadros
 * assados em pixel com a paleta da parede do duto (`scripts/_elites/_mao-f4.mjs`), o quadro saindo do relógio dele
 * (`buracoQuadro`). Tem VIDA PRÓPRIA — sobrevive à Larva (a cicatriz some ~1s depois de ela mergulhar, ou morrer) — e
 * anda com o fundo pintado enquanto existe. Não fere, não bloqueia.
 */
export function abrirBuraco(cena: Phaser.Scene, x: number, y: number, velFundo: () => number): Buraco {
  const img = cena.add.image(x, y, `${PREFIXO}0`).setDepth(DEPTH);
  img.setData('buraco', 'abre');
  let fase: 'abre' | 'fecha' = 'abre';
  let t = 0;
  const passo = (_agora: number, dms: number): void => {
    const dt = dms / 1000;
    t += dt;
    img.x -= velFundo() * dt;
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

- [x] **Step 2: `Larva.ts`**

```ts
import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { larvaAvanca, larvaPosto, larvaQuadro, larvaTangivel, pupaAngulos, varianteDe, type ClipeLarva, type EstadoLarva } from '../../elitesRegras';
import { abrirBuraco, type Buraco } from './Buraco';
import { lancarPupa } from './Pupa';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const L = ELITES.larva;
/** As DUAS variações que ele aprovou (13/10): A, a do conceito; D, a broca. Alternam pela ordem de nascimento. */
const VARIANTES = ['A', 'D'] as const;
type Variante = (typeof VARIANTES)[number];
/**
 * A HITBOX, fixa: a arte recortada tem 36×35 (A) e 37×32 (D); 60% × 55% dela, a regra do róster. Os quadros dos gestos
 * são caixas de 35 a 51px (o centro dela no centro): a hitbox não cresce com a cauda esticada.
 */
const CORPO = { w: 22, h: 20 };
const CLIPE: Record<ClipeLarva, string> = { poe: 'Poe', tranco: 'Tranco', sai: 'Sai', perfura: 'Perfura', mergulha: 'Mergulha' };

interface Estado {
  fase: EstadoLarva;
  t: number;
  variante: Variante;
  /** Quantos PÕE já começaram (o último vai ao PERFURA). */
  paradas: number;
  /** O posto atual (ou o de chegada, no TRANCO) e o de partida do tranco. */
  posto: { x: number; y: number };
  de: { x: number; y: number };
  /** As pupas desta parada já saíram? */
  pupasPostas: boolean;
  /** O buraco ABERTO agora: o de chegada, depois o de saída. */
  buraco: Buraco | null;
}

/**
 * A LARVA MECÂNICA (spec F4 §2): um BURACO abre no fundo (o aviso) → ela SAI dele → PÕE 2 pupas na direção da nave →
 * TRANCO para o posto seguinte, em ziguezague na metade direita e sempre dentro do vão → (3 paradas) → PERFURA e
 * MERGULHA no buraco que abriu atrás dela. Não atira: o perigo é o campo de pupas (`Pupa.ts`). Saiu viva: sem pontos.
 * Ela VOA (não rola com o cenário); o buraco anda com o fundo pintado. O gesto de cada estado sai do relógio dele
 * (`larvaQuadro`), sem animação do Phaser — travada pelo elétrico, ela congela na pose.
 */
export const LARVA: ComportamentoElite = {
  iniciar(e, ctx) {
    const variante = varianteDe((e.getData('ordem') as number | undefined) ?? 0, VARIANTES);
    // O `x`/`y` do roteiro não valem para ela: nasce no 1º posto, ainda dentro do buraco.
    const posto = larvaPosto(Math.random, null, ctx.ganchos.vao);
    const s: Estado = { fase: 'abre', t: 0, variante, paradas: 0, posto, de: posto, pupasPostas: false, buraco: null };
    e.setData('elite', s);
    // A arte já nasce virada para a esquerda: nada de espelhar.
    e.setFlipX(false);
    e.setPosition(posto.x, posto.y);
    vestir(e, `eliteLarva${variante}PoeAnim0`, CORPO);
    e.setVisible(false);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    s.buraco = abrirBuraco(e.scene, posto.x, posto.y, ctx.ganchos.velFundo);
    // Morta em qualquer estado, o buraco que estiver aberto fecha (o de saída, se ela morrer perfurando).
    e.once('destroy', () => s.buraco?.fechar());
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    const prox = larvaAvanca(s.fase, s.t, s.paradas);
    if (prox !== s.fase) entrar(e, s, prox, ctx);
    if (s.fase === 'foi') {
      // Mergulhou: sem pontos (não é o caminho de morte). O buraco fecha pelo `destroy`.
      e.destroy();
      return;
    }
    if (s.fase === 'tranco') {
      // O tranco não é ataque, é reposicionamento: arranca e assenta (§2.1).
      const u = Math.min(1, s.t / L.trancoS);
      const m = u * u * (3 - 2 * u);
      e.setPosition(s.de.x + (s.posto.x - s.de.x) * m, s.de.y + (s.posto.y - s.de.y) * m);
    }
    if (s.fase === 'poe' && !s.pupasPostas && s.t >= L.pupaSaiS) porPupas(e, s, ctx);
    // O CORPO só existe enquanto ela tem tamanho: um ponto dentro do buraco não fere nem é ferido.
    const tangivel = larvaTangivel(s.fase, s.t);
    if (body.enable !== tangivel) {
      body.enable = tangivel;
      if (tangivel) body.reset(e.x, e.y);
    }
    posar(e, s);
  },

  intocavel(e) {
    const s = e.getData('elite') as Estado | undefined;
    return !s || !larvaTangivel(s.fase, s.t);
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoLarva, ctx: CtxElite): void {
  s.fase = fase;
  s.t = 0;
  if (fase === 'sai') {
    e.setVisible(true);
  } else if (fase === 'poe') {
    s.paradas++;
    s.pupasPostas = false;
    e.setPosition(s.posto.x, s.posto.y);
    // Saiu inteira do buraco de chegada: ele fecha atrás dela.
    if (s.paradas === 1) {
      s.buraco?.fechar();
      s.buraco = null;
    }
  } else if (fase === 'tranco') {
    // Parte de onde ESTÁ (o tranco do Tiro Pesado pode tê-la empurrado), fugindo da altura do posto que deixa.
    s.de = { x: e.x, y: e.y };
    s.posto = larvaPosto(Math.random, s.posto.y, ctx.ganchos.vao);
  } else if (fase === 'perfura') {
    // O buraco de SAÍDA abre atrás dela enquanto ela gira.
    s.buraco = abrirBuraco(e.scene, e.x, e.y, ctx.ganchos.velFundo);
  }
}

/** As pupas da parada: um leque curto na direção da nave (`pupaAngulos`), saindo do corpo dela. */
function porPupas(e: Sprite, s: Estado, ctx: CtxElite): void {
  s.pupasPostas = true;
  const base = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
  for (const ang of pupaAngulos(base)) lancarPupa(ctx.nascer('pupa', e.x, e.y), ang);
}

/** O GESTO: o quadro sai do relógio do estado. A hitbox é refeita a cada troca (o corpo do Arcade não acompanha a textura). */
function posar(e: Sprite, s: Estado): void {
  const q = larvaQuadro(s.fase, s.t);
  if (!q) return;
  const chave = `eliteLarva${s.variante}${CLIPE[q.clipe]}Anim${q.quadro}`;
  if (e.texture.key !== chave && e.scene.textures.exists(chave)) vestir(e, chave, CORPO);
}
```

- [x] **Step 3: o DEF e o sandbox** — em `src/systems/EnemySystem.ts`: `import { LARVA } from '../entities/elites/Larva';`;
  `| 'larva'` no `EnemyKind` (antes de `| 'pupa'`); em `DEFS`, antes da linha da `pupa`:

```ts
  // A F4: a LARVA MECÂNICA nasce dentro de um buraco, num posto — o `x`/`y` do roteiro não valem para ela (ver `Larva.ts`).
  larva: { texture: 'eliteLarvaAPoeAnim0', hp: ELITES.larva.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.larva.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0, elite: LARVA },
```

  Em `src/sandbox/config.ts`: `'larva'` em `INIMIGOS` depois de `'cacador'`; `NOME_INIMIGO.larva = 'larva mecânica (elite)'`;
  `MAX_POR_ONDA.larva = 5`; `PADRAO.inimigos.larva = 0`.

- [x] **Step 4: conferir** — `npx tsc --noEmit` limpo. No sandbox, fase 4, 1 larva por onda, intervalo 9: o buraco
  abre, ela sai, põe 2 pupas por parada em 3 postos, perfura e mergulha; as pupas viram moscas; a 2ª larva é a D.
  Sandbox na fase 2 com 1 larva: funciona igual (os postos usam as bordas da tela).

- [ ] **Step 5: commit** (quando ele pedir) — `git add src/entities/elites/Buraco.ts src/entities/elites/Larva.ts src/systems/EnemySystem.ts src/sandbox/config.ts` ·
  `feat(elites): a Larva Mecânica — chega e sai por um buraco no fundo, ziguezague dentro do vão, 2 pupas por parada; as duas variações (A, D) alternando`

---

### Task 6: O Tubo Pulsante

**Files:** Create `src/entities/elites/Tubo.ts`; Modify `src/systems/EnemySystem.ts`, `src/sandbox/config.ts`

**Interfaces:**
- Consumes: `tuboAvanca`, `tuboCabe`, `tuboQuadro`, `tuboAngulos`, `varianteDe` (Task 1); `ganchos.parede`, o gancho
  `noChao`, `e.getData('ordem')`, o giro antes do `vestir` (Task 3); as texturas `eliteTubo<C|D>PulsoAnim<n>` e
  `eliteTiroAnel` (Task 2).
- Produces: `TUBO: ComportamentoElite`; o tipo `'tubo'`. O `y` do roteiro escolhe a parede: `y < GAME_HEIGHT / 2` =
  TETO (espelhado na vertical), senão CHÃO. O estado em `e.getData('elite')`:
  `{ fase: EstadoTubo; t; variante: 'C' | 'D'; teto: boolean; xMundo; pulsos; espera }`.

- [x] **Step 1: `Tubo.ts`**

```ts
import type Phaser from 'phaser';
import { GAME_HEIGHT } from '../../config';
import { ELITES } from '../../data/numerosElites';
import { tuboAngulos, tuboAvanca, tuboCabe, tuboQuadro, varianteDe, type EstadoTubo } from '../../elitesRegras';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import type { ComportamentoElite, CtxElite, Sprite } from './tipos';

const T = ELITES.tubo;
/** As DUAS variações que ele aprovou (13/10): C, a coroa de dentes; D, a craca dupla. Alternam pela ordem de nascimento. */
const VARIANTES = ['C', 'D'] as const;
type Variante = (typeof VARIANTES)[number];
/** A HITBOX, fixa: a arte tem 35×28 (C) e 36×27 (D); 60% × 55% dela, centrada no MIOLO. Não cresce com o inchar. */
const CORPO = { w: 22, h: 16 };
/** O miolo da craca fica a 14px do pé: o centro da hitbox e do anel. */
const MIOLO = 14;
/** Os tiros nascem a este raio do miolo, já fora da boca. */
const RAIO_BOCA = 10;

/** A BOLHA do anel (à mão, 13/10): 5×5, redonda — não gira (o `disparar` gira o tiro antes de vesti-lo); hitbox 3×3. */
const vestirArteAnel = PadroesDeTiro.vestirArte('eliteTiroAnel', { w: 3, h: 3 });
const vestirAnel = (b: Phaser.Physics.Arcade.Sprite): void => {
  vestirArteAnel(b);
  b.setRotation(0);
};

interface Estado {
  fase: EstadoTubo;
  t: number;
  variante: Variante;
  /** Preso ao TETO (espelhado na vertical)? Senão, ao chão. */
  teto: boolean;
  /** Onde ele está plantado, em coordenada de MUNDO: a parede rola, ele vai junto. */
  xMundo: number;
  /** Pulsos já dados nesta passagem. */
  pulsos: number;
  /** Há quanto tempo espera um lugar na parede. */
  espera: number;
}

/**
 * O TUBO PULSANTE (spec F4 §3) — o atirador da fase: preso à superfície da parede (chão ou teto), entra pela direita
 * ROLANDO COM ELA e sai pela esquerda. INCHA (o aviso) → PULSA um meio-anel de tiros lentos para dentro do corredor;
 * 2 pulsos por passagem, o segundo defasado meio passo. Leva tiro o tempo todo: morto enquanto incha, não pulsa.
 * Antes de aparecer ele AGUARDA fora da tela um lugar na parede: entre duas mesas e longe da emenda de duas placas
 * (`tuboCabe`). O gesto sai do relógio do estado (`tuboQuadro`).
 */
export const TUBO: ComportamentoElite = {
  iniciar(e) {
    const s: Estado = {
      fase: 'aguarda',
      t: 0,
      variante: varianteDe((e.getData('ordem') as number | undefined) ?? 0, VARIANTES),
      // O `y` do roteiro só escolhe a parede: metade de cima = teto, metade de baixo = chão.
      teto: (e.getData('baseY') as number) < GAME_HEIGHT / 2,
      xMundo: 0,
      pulsos: 0,
      espera: 0,
    };
    e.setData('elite', s);
    // Ancorado pelo PÉ (a última linha do quadro): no teto, espelhado, o pé é a linha de cima.
    e.setFlipX(false).setFlipY(s.teto).setOrigin(0.5, s.teto ? 0 : 1);
    vestirTubo(e, s, 0);
    e.setPosition(T.nasceX, e.y);
    e.setVisible(false);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
  },

  // A parede não para — nem com ele travado pelo elétrico. A posição sai SEMPRE da parede (o tranco do Tiro Pesado não o arranca).
  noChao(e, _dt, ctx) {
    const s = e.getData('elite') as Estado;
    if (s.fase === 'aguarda') return;
    const x = ctx.ganchos.parede.telaDe(s.xMundo);
    // Saiu pela esquerda. ⚠️ Antes de perguntar pela superfície: ela só responde para `xTela >= -128` (ver `Moldura`).
    if (x < -40) {
      e.destroy();
      return;
    }
    const sup = ctx.ganchos.parede.superficie(x, s.teto);
    e.setPosition(x, s.teto ? sup - T.afunda : sup + T.afunda);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (s.fase === 'aguarda') {
      s.espera += dt;
      const xMundo = Math.round(ctx.ganchos.parede.mundoDe(T.nasceX));
      if (s.espera >= T.esperaMaxS || tuboCabe(xMundo, ctx.ganchos.parede.mesas())) plantar(e, s, xMundo, ctx);
      return;
    }
    s.t += dt;
    const prox = tuboAvanca(s.fase, s.t, e.x, s.pulsos);
    if (prox !== s.fase) {
      s.fase = prox;
      s.t = 0;
      if (prox === 'pulsa') pulsar(e, s, ctx);
    }
    vestirTubo(e, s, tuboQuadro(s.fase, s.t));
  },

  intocavel(e) {
    const s = e.getData('elite') as Estado | undefined;
    return !s || s.fase === 'aguarda';
  },
};

/** Achou lugar: planta-se na parede (fora da tela, à direita) e passa a rolar com ela. */
function plantar(e: Sprite, s: Estado, xMundo: number, ctx: CtxElite): void {
  s.xMundo = xMundo;
  s.fase = 'rola';
  s.t = 0;
  e.setVisible(true);
  TUBO.noChao!(e, 0, ctx);
  const body = e.body as Phaser.Physics.Arcade.Body;
  body.enable = true;
  body.reset(e.x, e.y);
}

/** O PULSO: o meio-anel sai do miolo, para dentro do corredor (`tuboAngulos`). */
function pulsar(e: Sprite, s: Estado, ctx: CtxElite): void {
  const cy = e.y + (s.teto ? MIOLO : -MIOLO);
  for (const ang of tuboAngulos(s.pulsos, s.teto)) {
    ctx.tiros.disparar(e.x + Math.cos(ang) * RAIO_BOCA, cy + Math.sin(ang) * RAIO_BOCA, ang, T.velTiro, vestirAnel);
  }
  ctx.tiros.clarao(e.x, cy, 6);
  s.pulsos++;
}

/**
 * Veste o quadro `quadro` do clipe `pulso` e põe a hitbox no MIOLO. O corpo do Arcade não espelha com o `flipY`: no
 * teto o pé é a linha de CIMA do quadro, e o miolo fica a `MIOLO` px abaixo dela.
 */
function vestirTubo(e: Sprite, s: Estado, quadro: number): void {
  const chave = `eliteTubo${s.variante}PulsoAnim${quadro}`;
  if (e.texture.key !== chave && e.scene.textures.exists(chave)) e.setTexture(chave);
  const b = e.body as Phaser.Physics.Arcade.Body;
  b.setSize(CORPO.w, CORPO.h, false);
  b.setOffset((e.width - CORPO.w) / 2, s.teto ? MIOLO - CORPO.h / 2 : e.height - MIOLO - CORPO.h / 2);
}
```

- [x] **Step 2: o DEF e o sandbox** — em `src/systems/EnemySystem.ts`: `import { TUBO } from '../entities/elites/Tubo';`;
  `| 'tubo'` no `EnemyKind` (depois de `| 'larva'`); em `DEFS`, depois da linha da `larva`:

```ts
  // A F4: o TUBO PULSANTE vive preso à parede — o `y` do roteiro só escolhe qual (metade de cima = teto), e ele espera
  // fora da tela um lugar entre duas mesas (ver `Tubo.ts`).
  tubo: { texture: 'eliteTuboCPulsoAnim0', hp: ELITES.tubo.hp, speed: 0, wave: 0, fireRate: 0, score: ELITES.tubo.score, scale: 1, tint: 0xffffff, homing: 0, spawnRate: 0, elite: TUBO },
```

  Em `src/sandbox/config.ts`: `'tubo'` em `INIMIGOS` depois de `'larva'`; `NOME_INIMIGO.tubo = 'tubo pulsante (elite, F4)'`;
  `MAX_POR_ONDA.tubo = 5`; `PADRAO.inimigos.tubo = 0`.

- [x] **Step 3: conferir** — `npx tsc --noEmit` limpo. No sandbox, fase 4, 2 tubos por onda, intervalo 9: um nasce no
  chão e outro no teto (a arena espalha a altura), colados na borda de 16px, rolando com ela; cada um incha e pulsa 2
  vezes (7 tiros, depois 6 defasados), para dentro do corredor; o 1º é o C, o 2º o D.

- [ ] **Step 4: commit** (quando ele pedir) — `git add src/entities/elites/Tubo.ts src/systems/EnemySystem.ts src/sandbox/config.ts` ·
  `feat(elites): o Tubo Pulsante — preso à parede (chão ou teto), rola com ela, incha e pulsa um meio-anel com vãos, 2 vezes, o segundo defasado; as duas variações (C, D) alternando`

---

### Task 7: A sonda em jogo real

**Files:** Create `scripts/probe-elites-f4.mjs`

**Interfaces — Consumes:** o estado em `e.getData('elite')` (Tasks 4–6), `getData('buraco')` nas imagens (Task 5),
`s.enemies.spawn`, `s.ferirInimigo`, `s.moldura`, `s.parallax.pinturaF4` (campo privado, visível em runtime).

- [x] **Step 1: a sonda** — criar `scripts/probe-elites-f4.mjs`:

```js
// THE F4 ELITES IN THE REAL GAME (spec 2026-10-12-frente-b-fatia-f4-design.md §7): the Larva (hole, posts inside the
// gap, pupae, flies) and the Tube (rooted on the wall, the half ring). Sandbox, stage 4, untouchable ship.
// Every cycle is watched FROM INSIDE the page, frame by frame (the lesson of the squid's probe). Points are read from
// `s.score` (the kills): `totalScore()` also adds 10 per second of clock, which is not what is being asked here.
//   node scripts/probe-elites-f4.mjs   (npm run dev running)
import { chromium } from 'playwright';
import { ELITES } from '../src/data/numerosElites.ts';

const L = ELITES.larva, T = ELITES.tubo;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
await page.addInitScript(() => {
  localStorage.setItem('alienworld.sandbox', JSON.stringify({
    fase: 4, repetir: false, intervalo: 999,
    inimigos: { drone: 0, batedor: 0, canhoneira: 0, kamikaze: 0, cargueiro: 0, aguaViva: 0, aranha: 0, droneMineracao: 0, sentinela: 0, cacador: 0, larva: 0, tubo: 0, mosca: 0 },
  }));
});
await page.goto('http://localhost:5173/?sandbox', { waitUntil: 'networkidle' });
await page.waitForSelector('#sandbox:not([hidden]) .no', { timeout: 30000 });
await page.click('button[data-acao="jogar"]');
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').arena, null, { timeout: 30000 });
await page.keyboard.press('Digit3'); // untouchable

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const espera = (ms) => page.waitForTimeout(ms);
const semTipo = (kind, ms) =>
  page.waitForFunction((kind) => !window.__game.scene.getScene('Game').enemies.enemies.getChildren().some((x) => x.active && x.getData('kind') === kind), kind, { timeout: ms });

// Counts what is BORN (by kind), the shots, and the holes (images with `data.buraco`).
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__nascidos = [];
  const spawn = s.enemies.spawn.bind(s.enemies);
  s.enemies.spawn = (kind, y, x) => {
    const e = spawn(kind, y, x);
    window.__nascidos.push(kind);
    return e;
  };
  window.__disparos = [];
  const t = s.enemies.tiros;
  const disparar = t.disparar.bind(t);
  t.disparar = (x, y, ang, vel, vestir) => {
    window.__disparos.push({ ang, vel });
    return disparar(x, y, ang, vel, vestir);
  };
  window.__buracos = [];
  const image = s.add.image.bind(s.add);
  s.add.image = (...a) => {
    const im = image(...a);
    queueMicrotask(() => im.getData('buraco') && window.__buracos.push(im));
    return im;
  };
  window.__um = (kind) => s.enemies.enemies.getChildren().find((x) => x.active && x.getData('kind') === kind);
});

{
  // ── THE LARVA: the whole cycle, watched from inside ──
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 108);
    window.__nascidos = [];
    const antes = s.score;
    s.enemies.spawn('larva', 100);
    const e = window.__um('larva');
    const V = (window.__larva = { fases: [], postos: [], pupasNoPoe: [], foraDoVao: 0, cruzou: 0, pontos: null, textura: null, abre: null });
    const st0 = e.getData('elite');
    V.abre = { fase: st0.fase, visivel: e.visible, corpo: e.body.enable, r: s.ferirInimigo(e, 5, 'probe', { x: e.x - 30, y: e.y }), hp: e.getData('hp'), buracos: s.children.list.filter((o) => o.getData && o.getData('buraco')).length };
    const olhar = () => {
      if (!e.active) {
        V.pontos = s.score - antes;
        s.events.off('postupdate', olhar);
        return;
      }
      const st = e.getData('elite');
      if (V.fases.at(-1) !== st.fase) {
        V.fases.push(st.fase);
        if (st.fase === 'poe') {
          const m = s.moldura;
          V.postos.push({ x: e.x, y: e.y, teto: m.superficieTetoEm(e.x), chao: m.superficieChaoEm(e.x) });
        }
        if (st.fase === 'tranco' || st.fase === 'perfura') V.pupasNoPoe.push(window.__nascidos.filter((k) => k === 'pupa').length);
        if (st.fase === 'poe' && !V.textura) V.textura = e.texture.key;
      }
      if (e.visible && e.x < 200) V.cruzou++;
    };
    s.events.on('postupdate', olhar);
  });
  await page.waitForFunction(() => window.__larva.pontos !== null, null, { timeout: 15000 });
  const V = await page.evaluate(() => window.__larva);
  conferir(V.abre.fase === 'abre' && !V.abre.visivel && !V.abre.corpo && V.abre.r === 'bloqueado' && V.abre.hp === L.hp && V.abre.buracos === 1, 'antes de sair: só o BURACO existe — ela invisível, sem corpo, intocável', V.abre);
  conferir(JSON.stringify(V.fases) === JSON.stringify(['abre', 'sai', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'perfura', 'mergulha']), 'o ciclo: buraco, sai, 3 paradas com tranco, perfura, mergulha', V.fases);
  conferir(V.postos.length === 3 && V.postos.every((p) => p.x >= L.postoX[0] && p.x <= L.postoX[1] && p.y >= p.teto + L.postoMargem - 1 && p.y <= p.chao - L.postoMargem + 1), 'os 3 postos: na metade direita e DENTRO do vão', V.postos);
  conferir(V.postos.slice(1).every((p, k) => Math.abs(p.y - V.postos[k].y) >= L.postoDistY - 1), 'o ziguezague: cada posto longe da altura do anterior', V.postos.map((p) => p.y));
  conferir(V.cruzou === 0, 'ela nunca cruza para o lado da nave', V.cruzou);
  conferir(JSON.stringify(V.pupasNoPoe) === JSON.stringify([2, 4, 6]), `${L.pupasPorParada} pupas por parada`, V.pupasNoPoe);
  conferir(V.pontos === 0, 'mergulhou viva: sem pontos', V.pontos);
  conferir(V.textura.startsWith('eliteLarvaAPoeAnim'), 'a 1ª Larva é a variação A', V.textura);

  // The two holes (arrival, exit) open and go away by themselves.
  const nBuracos = await page.evaluate(() => window.__buracos.length);
  await espera(1600);
  const vivos = await page.evaluate(() => window.__buracos.filter((b) => b.active).length);
  conferir(nBuracos === 2 && vivos === 0, 'dois buracos (chegada e saída), e a cicatriz some', { nBuracos, vivos });

  // The pupae left alone hatch into flies, which chase the ship.
  await page.waitForFunction(() => window.__nascidos.filter((k) => k === 'mosca').length >= 6, null, { timeout: 6000 });
  const moscas = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const m = s.enemies.enemies.getChildren().filter((x) => x.active && x.getData('kind') === 'mosca');
    return { pupas: window.__nascidos.filter((k) => k === 'pupa').length, moscas: window.__nascidos.filter((k) => k === 'mosca').length, indo: m.every((x) => x.body.velocity.x < 0), hp: m[0]?.getData('hp') };
  });
  conferir(moscas.pupas === 6 && moscas.moscas === 6 && moscas.indo && moscas.hp === 1, 'deixadas, as pupas viram MOSCAS que voam para a nave (1 de vida)', moscas);
  await page.keyboard.press('Digit2'); // clear
  await espera(200);

  // A pupa that is shot does not become a fly.
  const tiro = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    window.__nascidos = [];
    const antes = s.score;
    const p = s.enemies.spawn('pupa', 100, 250);
    const r = s.ferirInimigo(p, 1, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(2600);
  const depois = await page.evaluate(() => window.__nascidos.filter((k) => k === 'mosca').length);
  conferir(tiro.r === 'morto' && tiro.pontos === ELITES.pupa.score && depois === 0, 'a pupa atirada morre com 1 tiro e NÃO vira mosca (o ciclo cortado)', { ...tiro, moscas: depois });

  // The hole rides the painting.
  const fundo = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    s.enemies.spawn('larva', 100);
    await new Promise((r) => setTimeout(r, 100));
    const b = window.__buracos.at(-1), p = s.parallax.pinturaF4[0];
    const b0 = b.x, p0 = p.x;
    await new Promise((r) => setTimeout(r, 300));
    const viva = window.__um('larva');
    const textura = viva.texture.key;
    return { buraco: b0 - b.x, pintura: p0 - p.x, textura };
  });
  conferir(Math.abs(fundo.buraco - fundo.pintura) < 0.15 && fundo.buraco > 0, 'o buraco anda com o fundo pintado', fundo);
  conferir(fundo.textura.startsWith('eliteLarvaD'), 'a 2ª Larva é a variação D (as duas alternam)', fundo.textura);

  // Killed while drilling: the exit hole still closes.
  await page.waitForFunction(() => window.__um('larva')?.getData('elite').fase === 'perfura', null, { timeout: 8000 });
  const morta = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const antes = s.score;
    const r = s.ferirInimigo(window.__um('larva'), 99, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(1600);
  const restam = await page.evaluate(() => window.__buracos.filter((b) => b.active).length);
  conferir(morta.r === 'morto' && morta.pontos === L.score && restam === 0, 'morta perfurando: vale os pontos, e o buraco aberto fecha', { ...morta, restam });
  await page.keyboard.press('Digit2');
  await espera(200);
}

{
  // ── THE TUBE on the FLOOR: rooted, rolling with the wall, two pulses ──
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.ship.setPosition(60, 108);
    window.__disparos = [];
    s.enemies.spawn('tubo', 190);
    const e = window.__um('tubo');
    const V = (window.__tubo = { desvio: 0, amostras: 0, salvas: [], fases: [e.getData('elite').fase], x0: null, textura: null, fim: false, teto: e.getData('elite').teto, esperando: { visivel: e.visible, corpo: e.body.enable, r: s.ferirInimigo(e, 5, 'probe') } });
    let vistos = 0;
    const olhar = () => {
      if (!e.active) {
        V.fim = true;
        s.events.off('postupdate', olhar);
        return;
      }
      const st = e.getData('elite');
      if (V.fases.at(-1) !== st.fase) V.fases.push(st.fase);
      if (st.fase === 'aguarda') return;
      if (V.x0 === null) { V.x0 = e.x; V.textura = e.texture.key; }
      if (e.x >= -40) {
        V.desvio = Math.max(V.desvio, Math.abs(e.y - (s.moldura.superficieChaoEm(e.x) + 2)));
        V.amostras++;
      }
      if (window.__disparos.length > vistos) {
        V.salvas.push(window.__disparos.slice(vistos));
        vistos = window.__disparos.length;
      }
    };
    s.events.on('postupdate', olhar);
  });
  await page.waitForFunction(() => window.__tubo.fim, null, { timeout: 20000 });
  const V = await page.evaluate(() => window.__tubo);
  conferir(!V.teto && !V.esperando.visivel && !V.esperando.corpo && V.esperando.r === 'bloqueado', 'esperando lugar na parede: fora da tela, invisível, intocável', V.esperando);
  conferir(V.x0 > 384 + 18 && V.amostras > 60 && V.desvio === 0, 'plantado fora da tela e, a passagem inteira, o pé na linha da parede (2px dentro)', { x0: V.x0, amostras: V.amostras, desvio: V.desvio });
  conferir(JSON.stringify(V.fases) === JSON.stringify(['aguarda', 'rola', 'incha', 'pulsa', 'rola', 'incha', 'pulsa', 'rola']), 'rola → incha → pulsa, duas vezes', V.fases);
  const [s1 = [], s2 = []] = V.salvas;
  conferir(V.salvas.length === 2 && s1.length === T.tirosN && s2.length === T.tirosN - 1, `2 pulsos: ${T.tirosN} tiros e ${T.tirosN - 1} tiros`, V.salvas.map((s) => s.length));
  conferir([...s1, ...s2].every((d) => Math.sin(d.ang) <= 1e-6 && d.vel === T.velTiro), 'o meio-anel do chão abre para CIMA, a 70 px/s', s1.map((d) => d.ang.toFixed(2)));
  const passo = Math.PI / (T.tirosN - 1);
  conferir(s2.every((d, i) => Math.abs(d.ang - (s1[i].ang + s1[i + 1].ang) / 2) < 1e-6) && Math.abs(Math.abs(s1[1].ang - s1[0].ang) - passo) < 1e-6, 'o 2º pulso sai defasado meio passo', s2.map((d) => d.ang.toFixed(2)));
  conferir(V.textura.startsWith('eliteTuboCPulsoAnim'), 'o 1º Tubo é a variação C', V.textura);

  // ── On the CEILING: flipped, the ring opens downwards; and the 2nd Tube is variation D ──
  const teto = await page.evaluate(async () => {
    const s = window.__game.scene.getScene('Game');
    window.__disparos = [];
    s.enemies.spawn('tubo', 30);
    const e = window.__um('tubo');
    await new Promise((ok) => {
      const olhar = () => { if (e.getData('elite').fase === 'pulsa' || !e.active) { s.events.off('postupdate', olhar); ok(); } };
      s.events.on('postupdate', olhar);
    });
    return { teto: e.getData('elite').teto, flipY: e.flipY, desvio: Math.abs(e.y - (s.moldura.superficieTetoEm(e.x) - 2)), textura: e.texture.key, angs: window.__disparos.map((d) => d.ang) };
  });
  conferir(teto.teto && teto.flipY && teto.desvio === 0 && teto.angs.length === T.tirosN && teto.angs.every((a) => Math.sin(a) >= -1e-6), 'no TETO: espelhado, o pé na linha do teto, o anel abre para BAIXO', teto);
  conferir(teto.textura.startsWith('eliteTuboDPulsoAnim'), 'o 2º Tubo é a variação D (as duas alternam)', teto.textura);
  await page.keyboard.press('Digit2');
  await espera(200);

  // ── Killed while swelling: it does not pulse ──
  await page.evaluate(() => {
    window.__disparos = [];
    window.__game.scene.getScene('Game').enemies.spawn('tubo', 190);
  });
  await page.waitForFunction(() => window.__um('tubo')?.getData('elite').fase === 'incha', null, { timeout: 15000 });
  const morto = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const antes = s.score;
    const r = s.ferirInimigo(window.__um('tubo'), 99, 'probe');
    return { r, pontos: s.score - antes };
  });
  await espera(1200);
  const tiros = await page.evaluate(() => window.__disparos.length);
  conferir(morto.r === 'morto' && morto.pontos === T.score && tiros === 0, 'morto enquanto incha, ele não pulsa', { ...morto, tiros });
}

conferir(erros.length === 0, 'sem erros no console', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [x] **Step 2: rodar**

Run (com `npm run dev` rodando): `node scripts/probe-elites-f4.mjs`
Expected: todas as linhas `OK`, e `TUDO OK` no fim (~1 min). Uma `FALHA` aqui é defeito do jogo ou da sonda: usar a
skill `superpowers:systematic-debugging` antes de mexer em número.

- [x] **Step 3: as outras seguem passando** — `node scripts/probe-elites.mjs`, `node scripts/probe-elites-f3.mjs` →
  `TUDO OK`.

- [ ] **Step 4: commit** (quando ele pedir) — `git add scripts/probe-elites-f4.mjs` ·
  `test(elites): a sonda da F4 — a Larva nasce do buraco, fica no vão, põe 2 pupas por parada e mergulha; a pupa atirada não vira mosca; o Tubo segue a parede, pulsa 2 vezes e, morto inchando, não pulsa`

---

### Task 8: O roteiro da F4 (spec §4)

**Files:** Modify `src/systems/StageDirector.ts` (`STAGE_4`)

As 6 entradas, cada uma no lugar de UMA onda comum:

| Entrada | `t` | Sai a onda | Por quê ali |
|---|---|---|---|
| Tubo (chão), sozinho | 10 (banner em 9) | batedores de t=9 | o vão ainda é o de 126; os drones de t=5 já saíram quando ele pulsa (~t=12,4) |
| Larva, sozinha | 21 (banner em 20) | batedores de t=21 | à vista até ~t=26,2; os kamikazes de t=27 chegam com as últimas pupas |
| Tubo (chão) | 57,5 | drones de t=58 | o aperto, depois do golfinho (o relógio não passa de 49,5 com ele vivo) |
| Tubo (teto) | 60,5 | kamikazes de t=64 | 3s depois do do chão: os dois anéis se cruzam sem sair juntos |
| Larva | 75 | drones de t=74 | entre a 1ª porta (t=72, já em x≈160) e a 2ª (t=82): os postos ficam à direita da porta |
| Larva | 97,5 | batedores de t=97 | o pico final; ela mergulha em ~t=102,7 e as últimas moscas saem antes do silêncio de t=106 |

- [x] **Step 1: a 1ª câmara** — trocar a linha `{ t: 9, type: 'wave', kind: 'batedor', count: 4, spacing: 0.38, y: 120 },` por:

```ts
  // O TUBO PULSANTE, cedo e SOZINHO (frente B, fatia F4 §4): a 1ª vez com o vão de 126, para o meio-anel ser lido com
  // espaço. No lugar dos batedores de t=9. ⚠️ O `y` dele só escolhe a parede: metade de baixo = CHÃO, de cima = TETO.
  { t: 9, type: 'banner', text: 'TUBO PULSANTE' },
  { t: 10, type: 'wave', kind: 'tubo', count: 1, spacing: 0, y: 190 },
```

  e a linha `{ t: 21, type: 'wave', kind: 'batedor', count: 5, spacing: 0.3, y: 140 },` por:

```ts
  // A LARVA MECÂNICA, SOZINHA (F4 §4): a 1ª vez do buraco e das pupas. No lugar dos batedores de t=21. O `y` não vale
  // para ela — nasce num posto, dentro do buraco que abre no fundo.
  { t: 20, type: 'banner', text: 'LARVA MECÂNICA' },
  { t: 21, type: 'wave', kind: 'larva', count: 1, spacing: 0, y: 100 },
```

- [x] **Step 2: o aperto** — trocar a linha `{ t: 58, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 110 },` por:

```ts
  // OS DOIS TUBOS DO APERTO (F4 §4): um no CHÃO e, 3s depois, um no TETO — a parede ainda não mata, então errar o vão
  // do anel custa um tiro, não a nave. No lugar dos drones de t=58 e dos kamikazes de t=64. ⚠️ A Larva NÃO entra aqui:
  // a caixa torácica é o lugar do golfinho (decisão dele, 12/10).
  { t: 57.5, type: 'wave', kind: 'tubo', count: 1, spacing: 0, y: 190 },
  { t: 60.5, type: 'wave', kind: 'tubo', count: 1, spacing: 0, y: 30 },
```

  e APAGAR a linha `{ t: 64, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.55, y: 70 },`.

- [x] **Step 3: o duto** — trocar a linha `{ t: 74, type: 'wave', kind: 'drone', count: 7, spacing: 0.22, y: 60 },` por:

```ts
  // A LARVA NO DUTO (F4 §4): o trecho mais apertado da campanha — é ela quem dá ao jogador algo para atirar além das
  // portas. Entre a 1ª e a 2ª porta, no lugar dos drones de t=74 (a porta de t=72 já passou dos postos dela).
  { t: 75, type: 'wave', kind: 'larva', count: 1, spacing: 0, y: 100 },
```

  e a linha `{ t: 97, type: 'wave', kind: 'batedor', count: 5, spacing: 0.28, y: 100 },` por:

```ts
  // A ÚLTIMA LARVA, no pico (F4 §4), no lugar dos batedores de t=97: ela mergulha em ~t=102,7 e as últimas moscas
  // saem antes do silêncio de t=106.
  { t: 97.5, type: 'wave', kind: 'larva', count: 1, spacing: 0, y: 100 },
```

- [x] **Step 4: conferir** — `npx tsc --noEmit` limpo (o construtor do `StageDirector` lança se o roteiro sair de
  ordem: abrir a F4 no navegador e ver que carrega). Rodar as sondas da fase — `node scripts/probe-stage4.mjs`,
  `node scripts/probe-f4-moldura.mjs`, `node scripts/probe-f4-golfinho.mjs`, `node scripts/probe-f4-esfincter.mjs` — e
  comparar com a linha de base tirada ANTES do Step 1 (as mesmas linhas `OK`; se alguma contar ondas por `t`, ajustar
  a contagem e anotar no commit).

- [ ] **Step 5: commit** (quando ele pedir) — `git add src/systems/StageDirector.ts` ·
  `feat(elites): a F4 no roteiro — o Tubo e a Larva sozinhos na 1ª câmara, dois Tubos (chão e teto) no aperto, duas Larvas no duto; cada um no lugar de uma onda`

---

### Task 9: Os GIFs em jogo, o teste dele e a papelada

**Files:** Create `scripts/_elites/_gif-f4-jogo.mjs`; Modify `docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md`,
`docs/HANDOFF.md`; Create `docs/superpowers/plans/2026-10-13-fatia-f4-START.md`.

- [x] **Step 1: o gravador** — criar `scripts/_elites/_gif-f4-jogo.mjs` (a receita do `_gif.mjs`: o relógio do Phaser
  parado e avançado à mão, 1/60 s por passo, uma foto a cada 3 passos = 20 qps):

```js
// A GIF of an F4 elite IN GAME, at real speed, in the REAL chamber: stage 4 jumped to `t` (the wall, the corridor and
// its tables as the script leaves them), then the script is frozen and the elite is spawned alone.
//   node scripts/_elites/_gif-f4-jogo.mjs <out.gif> <larva|tubo|tubos> <t> [seconds] [zoom]   (npm run dev running)
//   larva @ t=20 (chamber A) or 75 (duct) · tubo @ t=9 (chamber A) · tubos @ t=57 (the squeeze: floor + ceiling)
import { chromium } from 'playwright';
import sharp from 'sharp';

const [OUT, CENA = 'larva', T0 = '20', SEG = '9', ZOOM_ARG = '2'] = process.argv.slice(2);
const ZOOM = Number(ZOOM_ARG);
const QUADRO = 1000 / 60;
const POR_FOTO = 3;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.stack}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__game?.scene, null, { timeout: 30000 });
await page.waitForTimeout(1500);
await page.evaluate(() => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.scene.start('Game', { stage: 4, ship: 'humana', handling: 'diegetico' });
});
await page.waitForFunction(() => window.__game.scene.isActive('Game') && window.__game.scene.getScene('Game').cartas, null, { timeout: 30000 });
await page.waitForTimeout(600);

await page.evaluate((t) => {
  const s = window.__game.scene.getScene('Game');
  s.damageShip = () => {};
  if (s.golfinho) s.encerrarGolfinho(false);
  s.elapsed = t;
  s.director.skipTo(t);
  s.aplicaCorredorEMoldura(t);
  s.director.update = () => []; // the script stops here: the chamber stays as it is
  s.spawnHazards = () => {};
}, Number(T0));
// The wall chases its target at 8px/s; 7s cover the worst jump (the `_fundos-f4` recipe).
await page.waitForTimeout(7000);

await page.evaluate((cena) => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.enemies.enemies.clear(true, true);
  s.debris.hazards.clear(true, true);
  s.tweens.killTweensOf([s.banner, s.bannerFaixa]);
  s.banner.setAlpha(0);
  s.bannerFaixa.setAlpha(0);
  s.invulnerableUntil = 0;
  s.ship.setPosition(70, 108);
  // Fixed luck: same posts every recording.
  let a = 20261013;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  if (cena === 'larva') s.enemies.spawn('larva', 100);
  if (cena === 'tubo' || cena === 'tubos') s.enemies.spawn('tubo', 190);
  if (cena === 'tubos') s.time.delayedCall(3000, () => s.enemies.spawn('tubo', 30));
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
}, CENA);

const geo = await page.evaluate(() => {
  const c = window.__game.canvas.getBoundingClientRect();
  return { k: c.width / 384, left: c.left, top: c.top };
});
const passo = (n) =>
  page.evaluate(({ n, QUADRO }) => {
    const g = window.__game;
    for (let i = 0; i < n; i++) {
      window.__passo.t += QUADRO;
      g.step(window.__passo.t, QUADRO);
    }
  }, { n, QUADRO });

// The staging: the ship holds the middle of the gap in front of it and does not fire — the pupae hatch, the rings pass.
const quadros = [];
const total = Math.round((Number(SEG) * 60) / POR_FOTO);
for (let i = 0; i < total; i++) {
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    const meio = (s.moldura.superficieTetoEm(70) + s.moldura.superficieChaoEm(70)) / 2;
    s.ship.setPosition(70, s.ship.y + Math.sign(meio - s.ship.y) * Math.min(1.5, Math.abs(meio - s.ship.y)));
  });
  await passo(POR_FOTO);
  const foto = await page.screenshot({ clip: { x: geo.left, y: geo.top, width: 384 * geo.k, height: 216 * geo.k } });
  quadros.push(await sharp(foto).resize(384 * ZOOM, 216 * ZOOM, { kernel: 'nearest' }).png().toBuffer());
}
await browser.close();
await sharp(quadros, { join: { animated: true } })
  .gif({ delay: Array(quadros.length).fill(Math.round(QUADRO * POR_FOTO)), loop: 0 })
  .toFile(OUT);
console.log(OUT, quadros.length, 'quadros');
```

- [x] **Step 2: gravar** (com `npm run dev` rodando), para `docs/superpowers/folhas/2026-10-13/elites/f4/`:

```bash
F=docs/superpowers/folhas/2026-10-13/elites/f4
node scripts/_elites/_gif-f4-jogo.mjs $F/jogo-larva-camara-a.gif larva 20 10
node scripts/_elites/_gif-f4-jogo.mjs $F/jogo-larva-duto.gif larva 75 10
node scripts/_elites/_gif-f4-jogo.mjs $F/jogo-tubo-camara-a.gif tubo 9 9
node scripts/_elites/_gif-f4-jogo.mjs $F/jogo-tubos-aperto.gif tubos 57 12
```

  Expected: 4 GIFs (200, 200, 180 e 240 quadros). **Antes de mostrar, olhar cada um** (ler o GIF, quadro a quadro
  onde for preciso) e conferir: o buraco aparece ANTES dela e não fica escondido atrás de uma peça do cenário (foi o que
  aconteceu no duto com o buraco na pintura — por isso o `DEPTH` do `Buraco.ts` é −0,7); a cicatriz se lê nas duas pinturas; a Larva não
  encosta em mesa; o Tubo não nasce em cima de mesa nem torto num degrau; os dois anéis do aperto deixam passagem.

- [x] **Step 3: mostrar a ele** — abrir os 4 GIFs na tela dele e relatar, em pt-br: o que está no jogo, o que é
  rascunho (buraco, pupa, mosca, tiro do anel), e as três perguntas que só ele responde jogando: (1) a densidade do
  anel do Tubo na fase; (2) se 2 pupas × 3 paradas é muita mosca; (3) se os dois elites sozinhos na 1ª câmara leem bem.
  Ele testa no sandbox (`?sandbox`, fase 4: `larva`, `tubo`, `mosca`) e depois a F4 inteira.

- [x] **Step 4: a papelada**
  - **A spec** (`2026-10-12-frente-b-fatia-f4-design.md`): no cabeçalho, trocar o "Estado" por *desenho aprovado em
    12/10; arte e implementação em 13/10 (plano `plans/2026-10-13-frente-b-fatia-f4.md`)*; acrescentar um **§8 — As
    decisões de 13/10**: as duas variações de cada elite e a alternância pela ordem de nascimento; o tiro do Tubo a
    decidir jogando; os gestos crus do PixMiniMax; o que este plano fixou e a spec deixava em aberto — os `t` das 6
    entradas e a onda que cada uma substitui (a tabela da Task 8), o Tubo que espera um lugar entre duas mesas e
    longe da emenda, o buraco na frente do cenário de fundo (`depth −0,7`), a borda de 16px no sandbox da F4, a mosca sem girar, o
    posto pelo VÃO do corredor (e não pelas superfícies da borda) com `postoDistY` 20.
  - **O START novo** (`plans/2026-10-13-fatia-f4-START.md`), no molde do de 12/10: o ponto marcado (o que está no
    jogo, o que ele ainda não testou), os knobs por pergunta (`tubo.tirosN/pulsos/velTiro/pulsoX`,
    `larva.pupasPorParada/paradas`, `pupa.eclodeS`, `mosca.perseguicao/velMax`, os `t` do roteiro), as peças à mão
    que esperam aprovação, e a frase de arranque.
  - **O HANDOFF** (`docs/HANDOFF.md`, o 🧭): o ponto 📍 13/10 — a F4 com arte e código, à espera do teste dele; o
    de 12/10 marcado como cumprido.
  - **A memória** (`frente-b-elites.md` + a linha do `MEMORY.md`): o estado novo e o que ELE disser dos GIFs.

- [ ] **Step 5: commit** (quando ele pedir) — `git add scripts/_elites/_gif-f4-jogo.mjs scripts/_elites/_base-f4.mjs scripts/_elites/_folha-f4.mjs scripts/_elites/_fundos-f4.mjs scripts/_elites/_gerar-f4.mjs docs/superpowers/folhas/2026-10-13 docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md docs/superpowers/plans/2026-10-13-frente-b-fatia-f4.md docs/superpowers/plans/2026-10-13-fatia-f4-START.md docs/HANDOFF.md` ·
  `docs: a fatia F4 de 13/10 — as folhas e os GIFs (as duas variações de cada elite), o plano, a emenda da spec (§8), o START e o ponto marcado`

---

## Fora deste plano (anotado)

- **A arte final das peças à mão** (buraco, pupa, mosca, tiro do anel): entram como rascunho; o que ele pedir depois
  de ver em jogo vira uma rodada própria em `_mao-f4.mjs` + reinstalar.
- **O clipe `idle` da Larva** (gerado em 13/10) não é instalado: no ciclo da spec ela nunca fica parada sem fazer nada.
- **A calibragem** (densidade do anel, quantas pupas, os `t`): é dele, jogando — os números estão num endereço só.
- **O tranco do Tiro Pesado** não desloca a pupa nem o Tubo (a posição deles sai da origem e da parede); os dois têm
  vida curta. Se ele sentir falta, é uma linha em cada.
- Ele ainda joga a F3 inteira (pendência de 12/10); depois da F4, a frente C.
