# A Besta refeita, passo 1 — as teclas de dev 7 e 8 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Em dev, a tecla **7** leva o chefão à próxima fase, a **8** troca a mão de cartas e reinicia no mesmo ponto da
luta, e a URL `?fase=<chefão><n>&mao=<nome>` abre direto numa fase com uma mão — a ferramenta do resto da Besta e da
medição do rebalanceamento.

**Architecture:** Cada chefão diz as próprias fases por dois membros opcionais novos do `StageBoss` (`devFaseAtual`,
`devProximaFase()`). Três módulos puros em `src/dev/` (as mãos prontas, os nomes das fases e a leitura da URL, o
"ir até a fase" quadro a quadro) e dois que tocam o navegador (o atalho da URL e o painel HTML da tecla 8). A
`GameScene` liga as teclas e recebe `devFase`/`devMao` no `create`.

**Tech Stack:** TypeScript, Phaser 3.90 (Arcade), Vite (dev em `http://localhost:5173`), testes como scripts node
(`node --experimental-transform-types` para os puros; playwright contra o `npm run dev` para os em jogo).

**Spec:** `docs/superpowers/specs/2026-11-24-besta-refeita-design.md` §7 (e §9, passo 1).

## Global Constraints

- Tudo atrás de `import.meta.env.DEV` (ou carregado por `import()` dinâmico dentro dele, como o sandbox): nada disto
  entra no build do jogador.
- Teclas de dev nunca com CTRL. As existentes ficam: **5** pula para o chefão, **6** abre uma mesa de cartas.
- Nomes de fase exatos: `torre1`, `torre2`, `capitania1`, `capitania2`, `serpenteA`, `serpenteB`, `serpenteC`, `enguia`,
  `guardiao1`, `guardiao2`, `guardiao3`, `besta1`, `besta2`, `besta3` (ver o registro da execução abaixo: era `fusao`).
- Nomes de mão exatos: `nenhuma`, `mediana`, `forte`, `sandbox`. A mediana e a forte são PROVISÓRIAS (a frente 1 do
  rebalanceamento calibra).
- Código, comentários e nomes de teste em inglês nos comentários (o padrão dos arquivos novos); a conversa e os docs em
  pt-br. Edições com a ferramenta Edit (sed/node -e falham em silêncio aqui — CRLF).
- **Nunca editar `src/` nem `.html` enquanto ele joga ou filma** (o Vite recarrega): se ele estiver jogando, trabalhar
  numa cópia na porta 5174.
- **Commit só quando ele pedir**, de autoria só dele, **sem** linha `Co-Authored-By`.

## Registro da execução (24/11, inline)

As 5 tarefas feitas e verdes. Três desvios do texto abaixo (os blocos de código abaixo são o plano ORIGINAL; o código
de verdade está em `src/`):

1. **`fusao` → `enguia`.** O teste em jogo mostrou que a cena da fusão SEMPRE termina na enguia (`devFaseAtual` passava
   de `serpenteC` direto a `enguia`). A última fase da Serpente virou `enguia`; `fusao` ficou só como nome da
   TRANSIÇÃO (como a `troca` do Guardião) e não é alvo (`estagioDaFase('fusao') === null`). A Serpente devolve
   `'enguia'` ao sair de C.
2. **O teste das fases** tinha `devProximaFase?.() ?? 'sem devProximaFase'`, que dobrava o `null` legítimo ("agora não")
   em texto; virou `b.devProximaFase ? b.devProximaFase() : 'sem devProximaFase'`.
3. **A doc** foi para a tabela "Atalhos de DEV" do `HANDOFF.md` (que ainda listava o `G` e as armas 1–4 de antes de
   03/10 — corrigida junto), não para uma citação solta.

Verificado: `test-dev-atalhos` (puro), `test-dev-fases-jogo` (as 4 fases do jogo, as transições de verdade),
`test-dev-teclas-jogo` (URL, 7, 8), `test-guardiao-vida-jogo`, `test-guardiao-coleira-jogo`, `test-cartas-regras`,
`test-sandbox-arvore`, `npm run typecheck` e `npm run build` (nenhum código de dev no bundle) — tudo OK.

## Os arquivos

| Arquivo | O que faz |
|---|---|
| Criar `src/dev/maos.ts` | puro: as mãos prontas e `maoPorNome` |
| Criar `src/dev/fasesDev.ts` | puro: as fases de cada estágio e a leitura de `?fase=&mao=` |
| Criar `src/dev/irParaFase.ts` | puro: pede ao chefão a próxima fase, quadro a quadro, até a fase-alvo |
| Criar `src/dev/atalhoFase.ts` | navegador: o atalho da URL (espera o menu, abre a fase no treino) |
| Criar `src/dev/painelMao.ts` | navegador: a lista HTML da tecla 8 |
| Modificar `src/entities/Boss.ts` | o `StageBoss` ganha os 2 membros; a Torre diz as suas fases |
| Modificar `src/entities/BossCapitania.ts` | a Capitânia diz as suas |
| Modificar `src/entities/BossSerpente.ts` | a Serpente diz as suas (as cabeças e a fusão) |
| Modificar `src/entities/BossNucleo.ts` | o Guardião (os degraus) e a passagem à Besta |
| Modificar `src/entities/Predador.ts` | a Besta diz as suas |
| Modificar `src/scenes/GameScene.ts` | `devFase`/`devMao` no `create`, o "ir até a fase" no `update`, as teclas 7 e 8 |
| Modificar `src/main.ts` | liga o atalho da URL |
| Criar `scripts/test-dev-atalhos.mjs` | teste puro |
| Criar `scripts/test-dev-fases-jogo.mjs` | em jogo: a `devProximaFase` de cada chefão |
| Criar `scripts/test-dev-teclas-jogo.mjs` | em jogo: a URL, a tecla 7, a tecla 8 |
| Modificar `docs/HANDOFF.md` | a linha das teclas de dev |

---

### Task 1: os módulos puros (as mãos, as fases, o "ir até a fase")

**Files:**
- Create: `src/dev/maos.ts`, `src/dev/fasesDev.ts`, `src/dev/irParaFase.ts`
- Test: `scripts/test-dev-atalhos.mjs`

**Interfaces:**
- Consumes: `mao(n: Niveis): string[]` e `type Niveis` de `src/sandbox/arvore.ts`; `CARTAS` de `src/data/catalogoCartas.ts` (só no teste).
- Produces:
  - `NOMES_MAO: readonly ['nenhuma','mediana','forte','sandbox']`, `type NomeMao`, `MAOS: Record<'nenhuma'|'mediana'|'forte', readonly string[]>`, `ehNomeMao(s: string | null): s is NomeMao`, `maoPorNome(nome: NomeMao, niveisSandbox?: Niveis): string[]`
  - `FASES_DEV: Record<1|2|3|4, readonly string[]>`, `type Estagio = 1|2|3|4`, `estagioDaFase(fase: string): Estagio | null`, `interface AtalhoFase { stage: Estagio; fase: string; mao: NomeMao | null }`, `lerAtalhoFase(qs: URLSearchParams): AtalhoFase | null`
  - `interface ComFases { readonly devFaseAtual?: string; devProximaFase?(): string | null }`, `class IrParaFase { constructor(alvo: string, limiteS?: number); readonly alvo: string; passo(chefe: ComFases | null, dt: number): boolean }`

- [ ] **Step 1: Escrever o teste que falha**

`scripts/test-dev-atalhos.mjs`:

```js
// THE DEV SHORTCUTS, the pure rules (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): the ready hands are
// legal hands, the phase names and the URL, and the frame-by-frame jump to a phase.
//   node --experimental-transform-types scripts/test-dev-atalhos.mjs
import { MAOS, NOMES_MAO, ehNomeMao, maoPorNome } from '../src/dev/maos.ts';
import { FASES_DEV, estagioDaFase, lerAtalhoFase } from '../src/dev/fasesDev.ts';
import { IrParaFase } from '../src/dev/irParaFase.ts';
import { CARTAS } from '../src/data/catalogoCartas.ts';

const falhas = [];
const conferir = (ok, nome, info) => {
  console.log(`${ok ? 'OK  ' : 'FALHOU'} ${nome}${ok ? '' : ` → ${JSON.stringify(info)}`}`);
  if (!ok) falhas.push(nome);
};

// ── the hands ──
conferir(NOMES_MAO.join(',') === 'nenhuma,mediana,forte,sandbox', 'os 4 nomes de mão, nesta ordem (as teclas 1–4 do painel)', NOMES_MAO);
conferir(MAOS.nenhuma.length === 0, 'a "nenhuma" não tem carta', MAOS.nenhuma);
for (const nome of ['mediana', 'forte']) {
  const m = MAOS[nome];
  const conta = (id) => m.filter((c) => c === id).length;
  conferir(m.every((id) => CARTAS[id]), `${nome}: toda carta existe no catálogo`, m.filter((id) => !CARTAS[id]));
  conferir(m.every((id) => conta(id) <= CARTAS[id].max), `${nome}: nenhuma carta passa do limite (max)`, m.filter((id) => conta(id) > CARTAS[id].max));
  conferir(m.every((id) => !CARTAS[id].requer || m.includes(CARTAS[id].requer)), `${nome}: todo requisito (requer) está na mão`, m.filter((id) => CARTAS[id].requer && !m.includes(CARTAS[id].requer)));
  conferir(m.every((id) => !CARTAS[id].excluiSe || !m.includes(CARTAS[id].excluiSe)), `${nome}: nenhuma carta com a que a exclui (excluiSe)`, null);
}
conferir(MAOS.forte.length > MAOS.mediana.length, 'a forte tem mais cartas que a mediana', [MAOS.mediana.length, MAOS.forte.length]);
conferir(maoPorNome('mediana') !== MAOS.mediana && maoPorNome('mediana').join() === MAOS.mediana.join(), 'maoPorNome devolve uma CÓPIA (o registry não pode segurar a constante)', null);
conferir(maoPorNome('sandbox', { WPN_004: 2, DEF_001: 1 }).sort().join() === ['DEF_001', 'WPN_004', 'WPN_004'].join(), 'a "sandbox" é a mão dos níveis da montagem', maoPorNome('sandbox', { WPN_004: 2, DEF_001: 1 }));
conferir(maoPorNome('sandbox').length === 0, 'a "sandbox" sem montagem é vazia', null);
conferir(ehNomeMao('forte') && !ehNomeMao('Forte') && !ehNomeMao(null), 'ehNomeMao só aceita os 4 nomes exatos', null);

// ── the phases and the URL ──
conferir(FASES_DEV[4].join(',') === 'guardiao1,guardiao2,guardiao3,besta1,besta2,besta3', 'as fases da F4: os 3 degraus do Guardião e as 3 da Besta', FASES_DEV[4]);
conferir(FASES_DEV[1].join() === 'torre1,torre2' && FASES_DEV[2].join() === 'capitania1,capitania2' && FASES_DEV[3].join() === 'serpenteA,serpenteB,serpenteC,fusao', 'as fases da F1–F3', FASES_DEV);
conferir(estagioDaFase('besta3') === 4 && estagioDaFase('torre1') === 1 && estagioDaFase('fusao') === 3 && estagioDaFase('enguia') === null, 'cada fase sabe o seu estágio (a enguia não é fase de dev)', null);
const u = (s) => lerAtalhoFase(new URLSearchParams(s));
conferir(JSON.stringify(u('?fase=besta3&mao=mediana')) === JSON.stringify({ stage: 4, fase: 'besta3', mao: 'mediana' }), '?fase=besta3&mao=mediana', u('?fase=besta3&mao=mediana'));
conferir(JSON.stringify(u('?fase=capitania2')) === JSON.stringify({ stage: 2, fase: 'capitania2', mao: null }), 'sem mão: a mão fica a do registry', u('?fase=capitania2'));
conferir(u('?fase=besta3&mao=xx').mao === null, 'mão desconhecida = sem mão', u('?fase=besta3&mao=xx'));
conferir(u('?fase=besta9') === null && u('?mao=forte') === null && u('') === null, 'fase desconhecida ou ausente = nenhum atalho', null);

// ── the jump to a phase ──
{
  // a fake boss: 3 phases; it refuses the jump for 2 frames after each one (a transition)
  const nomes = ['x1', 'x2', 'x3'];
  let i = 0, espera = 0, pedidos = 0;
  const chefe = {
    get devFaseAtual() { return nomes[i]; },
    devProximaFase() { pedidos++; if (espera > 0) { espera--; return null; } if (i >= 2) return null; i++; espera = 2; return nomes[i]; },
  };
  const ir = new IrParaFase('x3');
  let quadros = 0;
  while (!ir.passo(chefe, 1 / 60) && quadros < 100) quadros++;
  conferir(chefe.devFaseAtual === 'x3', 'chega à fase-alvo, esperando as transições', { fase: chefe.devFaseAtual, quadros, pedidos });
  conferir(quadros <= 8, `em poucos quadros (${quadros})`, quadros);
  const pedidosAntes = pedidos;
  conferir(ir.passo(chefe, 1 / 60) === true && pedidos === pedidosAntes, 'na fase-alvo, não pede mais nada', pedidos);
}
{
  const ir = new IrParaFase('x1');
  conferir(ir.passo(null, 1 / 60) === false, 'sem chefão ainda (antes do spawn): espera', null);
  conferir(ir.passo({}, 1 / 60) === false, 'chefão sem fases: espera (até o limite)', null);
  const desiste = new IrParaFase('nunca', 1);
  let fim = false;
  for (let k = 0; k < 70 && !fim; k++) fim = desiste.passo({ devFaseAtual: 'a', devProximaFase: () => null }, 1 / 60);
  conferir(fim, 'uma fase que nunca chega: desiste depois do limite', null);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-transform-types scripts/test-dev-atalhos.mjs`
Expected: erro `Cannot find module '.../src/dev/maos.ts'`.

- [ ] **Step 3: Escrever os três módulos**

`src/dev/maos.ts`:

```ts
import { mao as maoDaArvore, type Niveis } from '../sandbox/arvore.ts';

/**
 * THE DEV HANDS (spec 2026-11-24-besta-refeita §7 — key 8 and `?mao=`): ready card hands to fight a boss with.
 * ⚠️ PROVISIONAL: front 1 of the rebalancing (START 2026-11-21) calibrates the three reference hands (weak, median,
 * strong). Until then 'mediana' is what a run usually holds by the F4, and 'forte' a lucky one.
 */
export const NOMES_MAO = ['nenhuma', 'mediana', 'forte', 'sandbox'] as const;
export type NomeMao = (typeof NOMES_MAO)[number];

export const MAOS: Record<Exclude<NomeMao, 'sandbox'>, readonly string[]> = {
  nenhuma: [],
  // double shot, rate ×2, hull, incendiary, extra bomb, thrusters
  mediana: ['WPN_001', 'WPN_004', 'WPN_004', 'DEF_001', 'EFF_004', 'DEF_005', 'MOV_001'],
  // triple, rate ×3, heavy, explosive + bigger, the drone, hull + recharge, dash
  forte: ['WPN_002', 'WPN_004', 'WPN_004', 'WPN_004', 'WPN_008', 'EFF_001', 'EFF_002', 'WPN_010', 'DEF_001', 'DEF_002', 'MOV_003'],
};

export function ehNomeMao(s: string | null): s is NomeMao {
  return s !== null && (NOMES_MAO as readonly string[]).includes(s);
}

/** The hand as the registry keeps it (`cartas`), always a fresh copy. 'sandbox' = the levels of the last `?sandbox` build. */
export function maoPorNome(nome: NomeMao, niveisSandbox: Niveis = {}): string[] {
  return nome === 'sandbox' ? maoDaArvore(niveisSandbox) : [...MAOS[nome]];
}
```

`src/dev/fasesDev.ts`:

```ts
import { ehNomeMao, type NomeMao } from './maos.ts';

/**
 * THE BOSS PHASES THE DEV KEYS KNOW (spec 2026-11-24-besta-refeita §7), per stage, in fight order. Each boss says
 * which one it is in (`StageBoss.devFaseAtual`) and jumps to the next (`devProximaFase`). The eel is not here: she has
 * her own shortcut (`?serpente=fusao&vida=`).
 */
export type Estagio = 1 | 2 | 3 | 4;
export const FASES_DEV: Record<Estagio, readonly string[]> = {
  1: ['torre1', 'torre2'],
  2: ['capitania1', 'capitania2'],
  3: ['serpenteA', 'serpenteB', 'serpenteC', 'fusao'],
  4: ['guardiao1', 'guardiao2', 'guardiao3', 'besta1', 'besta2', 'besta3'],
};

export function estagioDaFase(fase: string): Estagio | null {
  for (const st of [1, 2, 3, 4] as const) if (FASES_DEV[st].includes(fase)) return st;
  return null;
}

export interface AtalhoFase {
  stage: Estagio;
  fase: string;
  /** null = keep the registry's hand */
  mao: NomeMao | null;
}

/** `?fase=besta3&mao=mediana`. No (or an unknown) `fase` = no shortcut; an unknown `mao` = keep the hand. */
export function lerAtalhoFase(qs: URLSearchParams): AtalhoFase | null {
  const fase = qs.get('fase');
  if (fase === null) return null;
  const stage = estagioDaFase(fase);
  if (stage === null) return null;
  const m = qs.get('mao');
  return { stage, fase, mao: ehNomeMao(m) ? m : null };
}
```

`src/dev/irParaFase.ts`:

```ts
/** What a boss shows the dev jump (the optional part of `StageBoss`). */
export interface ComFases {
  readonly devFaseAtual?: string;
  devProximaFase?(): string | null;
}

/**
 * THE JUMP TO A PHASE (`?fase=`, and key 8 restarting at the same phase — spec 2026-11-24-besta-refeita §7): every
 * frame, while the boss is not in the target phase, ask it for the next one. A boss that can't jump now (entering, a
 * head dying, the Beast surging) answers null and is asked again next frame. Before the boss exists it just waits. It
 * gives up after `limiteS` of play (a target this boss never reaches — or one behind it).
 */
export class IrParaFase {
  private t = 0;

  constructor(
    readonly alvo: string,
    private readonly limiteS = 60,
  ) {}

  /** @returns true when done: reached, or gave up */
  passo(chefe: ComFases | null, dt: number): boolean {
    this.t += dt;
    if (chefe?.devFaseAtual === this.alvo) return true;
    if (this.t > this.limiteS) {
      console.warn(`[dev] a fase ${this.alvo} não chegou em ${this.limiteS} s (está em ${chefe?.devFaseAtual ?? 'nenhum chefão'})`);
      return true;
    }
    chefe?.devProximaFase?.();
    return false;
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --experimental-transform-types scripts/test-dev-atalhos.mjs`
Expected: todas as linhas `OK`, e `TODOS OK` no fim.

Run: `npm run typecheck`
Expected: sem erros.

---

### Task 2: cada chefão diz as suas fases

**Files:**
- Modify: `src/entities/Boss.ts` (o `StageBoss`, ~linha 16–98; a classe `Boss`, perto do `damage`, ~linha 690)
- Modify: `src/entities/BossCapitania.ts` (perto do `damage`, ~linha 676)
- Modify: `src/entities/BossSerpente.ts` (perto do `damage`, ~linha 1041)
- Modify: `src/entities/BossNucleo.ts` (perto do `damage`, ~linha 1266)
- Modify: `src/entities/Predador.ts` (perto do `damage`, ~linha 1175)
- Test: `scripts/test-dev-fases-jogo.mjs`

**Interfaces:**
- Consumes: os campos privados de cada classe (os nomes conferidos em 24/11): `Boss` — `hp`, `maxHp`, `entering`, `dead`, `airborne`, `takingOff`, `bar`, `startTakeoff()`; `BossCapitania` — `hp`, `maxHp`, `entering`, `dead`, `bar`, `enraged`; `BossSerpente` — `emEnguia`, `dead`, `entering`, `imune`, `corpo`, `faseIdx`, `FASES`, `hpFase`, `hpTotal`, `maxHpTotal`, `bar`, `transicao()`; `BossNucleo` — `predador`, `dead`, `entering`, `trocando`, `hpGuardiao`, `HP_GUARDIAO`, `DEGRAUS`, `degrau`, `vistas`, `atualizarBarra()`, `damage()`; `Predador` — `hp`, `HP`, `fase`, `dead`, `estado`, `aoMudarVida`.
- Produces: em `StageBoss`, `readonly devFaseAtual?: string` e `devProximaFase?(): string | null` — implementados nos 5. O `Predador` (que não é `StageBoss`) ganha os mesmos dois, e o `BossNucleo` delega a ele.

- [ ] **Step 1: Escrever o teste em jogo que falha**

`scripts/test-dev-fases-jogo.mjs`:

```js
// THE BOSS PHASES FOR THE DEV KEYS (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): every boss says the
// phase it is in and jumps to the next one, through its own real transition (the Tower takes off, a Serpent head dies,
// the Guardian swaps to the Beast, she roars and goes dark).
//   npm run dev, then  node scripts/test-dev-fases-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));

async function abrir(stage) {
  await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
  await page.evaluate((st) => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: st, handling: 'diegetico', practice: true }), stage);
  await page.waitForFunction(() => {
    const g = window.__game.scene;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const s = g.getScene('Game');
    return g.isActive('Game') && s.boss && !s.boss.entering;
  }, null, { timeout: 180000, polling: 250 });
  await page.evaluate(() => { const s = window.__game.scene.getScene('Game'); s.invulnerableUntil = Number.MAX_SAFE_INTEGER; s.damageShip = () => {}; });
}
const fase = () => page.evaluate(() => window.__game.scene.getScene('Game').boss.devFaseAtual);
const proxima = () => page.evaluate(() => window.__game.scene.getScene('Game').boss.devProximaFase());
// asks until the boss accepts (it refuses during a transition), up to `s` seconds
async function proximaAceita(s = 30) {
  for (let i = 0; i < s * 10; i++) {
    const r = await proxima();
    if (r !== null) return r;
    await page.waitForTimeout(100);
  }
  return null;
}
const chegar = (alvo, s = 30) =>
  page.waitForFunction((a) => window.__game.scene.getScene('Game').boss.devFaseAtual === a, alvo, { timeout: s * 1000, polling: 100 }).then(() => true, () => false);

// ── F1, the Tower ──
await abrir(1);
conferir((await fase()) === 'torre1', 'a Torre começa em torre1', await fase());
conferir((await proxima()) === 'torre2', 'a próxima é torre2', null);
const torre = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { k: b.hp / b.maxHp, decolando: b.takingOff || b.airborne }; });
conferir(torre.k <= 0.5 && torre.decolando, 'na metade da vida, decolando (a transição de verdade)', torre);
conferir((await fase()) === 'torre2' && (await proxima()) === null, 'em torre2 não há próxima', await fase());

// ── F2, the Capitânia ──
await abrir(2);
conferir((await fase()) === 'capitania1', 'a Capitânia começa em capitania1', await fase());
conferir((await proxima()) === 'capitania2', 'a próxima é capitania2', null);
const cap = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { k: b.hp / b.maxHp, furia: b.enraged }; });
conferir(cap.k === 0.5 && cap.furia, 'na metade da vida, em fúria', cap);
conferir((await proxima()) === null, 'em capitania2 não há próxima', null);

// ── F3, the Serpent ──
await abrir(3);
conferir((await fase()) === 'serpenteA', 'a Serpente começa em serpenteA', await fase());
for (const [de, para] of [['serpenteA', 'serpenteB'], ['serpenteB', 'serpenteC'], ['serpenteC', 'fusao']]) {
  const r = await proximaAceita();
  conferir(r === para, `${de} → ${para}`, r);
  conferir(await chegar(para, 40), `a cabeça cai e ela chega a ${para}`, await fase());
}
conferir((await proximaAceita(3)) === null, 'na fusão não há próxima (a enguia tem o atalho dela)', await fase());

// ── F4, the Guardian and the Beast ──
await abrir(4);
conferir((await fase()) === 'guardiao1', 'o Guardião começa em guardiao1', await fase());
conferir((await proxima()) === 'guardiao2', 'guardiao1 → guardiao2', null);
let g = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { degrau: b.degrau }; });
conferir(g.degrau === 1 && (await fase()) === 'guardiao2', 'no degrau 1', g);
conferir((await proxima()) === 'guardiao3', 'guardiao2 → guardiao3', null);
g = await page.evaluate(() => { const b = window.__game.scene.getScene('Game').boss; return { degrau: b.degrau, serpentes: b.vistas.has('serpentes') }; });
conferir(g.degrau === 2 && g.serpentes, 'no degrau 2, a trava das serpentes dada como cumprida', g);
conferir((await proxima()) === 'besta1', 'guardiao3 → besta1 (a troca)', null);
conferir(await chegar('besta1', 60), 'a fera surge (besta1)', await fase());
conferir((await proximaAceita(40)) === 'besta2', 'depois de surgir, besta1 → besta2', await fase());
conferir((await fase()) === 'besta2', 'em besta2', await fase());
conferir((await proximaAceita(10)) === 'besta3', 'besta2 → besta3', null);
const breu = await page.waitForFunction(() => window.__game.scene.getScene('Game').boss.predador.fasePassada === 3, null, { timeout: 15000, polling: 100 }).then(() => true, () => false);
conferir(breu, 'e ela entra no breu (a transição dela, pousada)', null);
conferir((await proxima()) === null, 'em besta3 não há próxima', null);

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Com o `npm run dev` de pé: `node scripts/test-dev-fases-jogo.mjs`
Expected: `FALHA a Torre começa em torre1 — visto: undefined` (e as seguintes; o script não quebra porque `devProximaFase` ausente vira `TypeError` — se quebrar com `devProximaFase is not a function`, também é a falha esperada).

- [ ] **Step 3: O contrato no `StageBoss`**

Em `src/entities/Boss.ts`, dentro de `export interface StageBoss`, logo antes de `update(dt: number, target: ...)`:

```ts
  /**
   * DEV (spec 2026-11-24-besta-refeita §7 — key 7, `?fase=`, key 8): the phase the fight is in now, by the names of
   * `src/dev/fasesDev.ts` ('torre1', 'besta2'…). Absent = the boss has no phases for the dev keys.
   */
  readonly devFaseAtual?: string;
  /**
   * DEV: to the START of the next phase, through the boss's own transition, with the current phase's lock counted as
   * met. Returns the new phase's name, or null when there is no next one or the boss can't jump now (entering, a
   * transition running) — `IrParaFase` asks again next frame.
   */
  devProximaFase?(): string | null;
```

- [ ] **Step 4: A Torre**

Em `src/entities/Boss.ts`, na classe `Boss`, logo antes de `damage(amount: number): boolean {`:

```ts
  /** DEV (spec 2026-11-24 §7): grounded = 'torre1'; from the takeoff on = 'torre2'. */
  get devFaseAtual(): string {
    return this.airborne || this.takingOff ? 'torre2' : 'torre1';
  }

  /** DEV: to half life and the takeoff — the same beat a hit at 50 % triggers. */
  devProximaFase(): string | null {
    if (this.dead || this.entering || this.airborne || this.takingOff) return null;
    this.hp = Math.min(this.hp, this.maxHp / 2);
    this.bar.width = 160 * (this.hp / this.maxHp);
    this.startTakeoff();
    return 'torre2';
  }
```

- [ ] **Step 5: A Capitânia**

Em `src/entities/BossCapitania.ts`, logo antes de `damage(amount: number): boolean {`:

```ts
  /** DEV (spec 2026-11-24 §7): above half life = 'capitania1'; enraged = 'capitania2'. */
  get devFaseAtual(): string {
    return this.enraged ? 'capitania2' : 'capitania1';
  }

  /** DEV: to half life (the `update` sees the fury turn on, with its sound, next frame). */
  devProximaFase(): string | null {
    if (this.dead || this.entering || this.enraged) return null;
    this.hp = this.maxHp / 2;
    this.bar.width = 160 * (this.hp / this.maxHp);
    return 'capitania2';
  }
```

- [ ] **Step 6: A Serpente**

Em `src/entities/BossSerpente.ts`, logo antes de `damage(amount: number, onde?: 'alvo' | 'corpo'): boolean {`:

```ts
  /** DEV (spec 2026-11-24 §7): the forms by name; the eel is outside the dev keys (`?serpente=fusao&vida=`). */
  private static readonly FASES_DEV = ['serpenteA', 'serpenteB', 'serpenteC', 'fusao'] as const;

  get devFaseAtual(): string {
    return this.emEnguia ? 'enguia' : BossSerpente.FASES_DEV[this.faseIdx];
  }

  /** DEV: the current head dies (its real chain of blasts, `transicao`); from C it is the fusion scene. */
  devProximaFase(): string | null {
    if (this.emEnguia || this.dead || this.entering || this.imune > 0 || this.corpo === 'nada') return null;
    if (this.faseIdx >= BossSerpente.FASES.length - 1) return null;
    const proxima = BossSerpente.FASES_DEV[this.faseIdx + 1];
    this.hpTotal -= this.hpFase;
    this.hpFase = 0;
    this.bar.width = 160 * Math.max(0, this.hpTotal / this.maxHpTotal);
    this.transicao();
    return proxima;
  }
```

- [ ] **Step 7: A Besta**

Em `src/entities/Predador.ts`, logo antes de `damage(amount: number): boolean {`:

```ts
  /** DEV (spec 2026-11-24 §7): 'besta1'…'besta3', by life (the same `fase` the fight reads). */
  get devFaseAtual(): string {
    return `besta${this.fase}`;
  }

  /**
   * DEV: to just below the next phase's threshold; her own beats run in `update` (the roar at phase 2, the dark at
   * phase 3 once she is grounded). ⚠️ When the per-phase LOCKS arrive (the Beast's step 3), this is where the current
   * phase's signature is marked as seen.
   */
  devProximaFase(): string | null {
    if (this.dead || this.estado === 'surgindo' || this.estado === 'fora' || this.estado === 'aviso') return null;
    const f = this.fase;
    if (f >= 3) return null;
    // (floor − 1: 180 × 0.66 in floating point is 118.80000000000001, a hair ABOVE the threshold)
    this.hp = Math.min(this.hp, Math.floor(Predador.HP * (f === 1 ? 0.66 : 0.33)) - 1);
    this.aoMudarVida();
    return `besta${f + 1}`;
  }
```

- [ ] **Step 8: O Guardião e a troca**

Em `src/entities/BossNucleo.ts`, logo antes de `damage(amount: number): boolean {`:

```ts
  /** DEV (spec 2026-11-24 §7): the Guardian's steps, 'troca' during the swap, then the Beast's phases. */
  get devFaseAtual(): string {
    if (this.predador) return this.predador.devFaseAtual;
    return this.trocando || this.hpGuardiao <= 0 ? 'troca' : `guardiao${this.degrau + 1}`;
  }

  /**
   * DEV: the next step, with the lock of the one before counted as met (the serpents before 33 %; the squeeze and the
   * ceiling before he dies); from the last step, the one-shot (a hit ≥ his whole life skips the lock) and the Beast.
   */
  devProximaFase(): string | null {
    if (this.predador) return this.predador.devProximaFase();
    if (this.dead || this.entering || this.trocando) return null;
    const H = BossNucleo.HP_GUARDIAO;
    // (floor − 1: just below the threshold, never a floating-point hair above it)
    if (this.degrau === 0) {
      this.hpGuardiao = Math.min(this.hpGuardiao, Math.floor(H * BossNucleo.DEGRAUS[0]) - 1);
      this.atualizarBarra();
      return 'guardiao2';
    }
    this.vistas.add('serpentes');
    if (this.degrau === 1) {
      this.hpGuardiao = Math.min(this.hpGuardiao, Math.floor(H * BossNucleo.DEGRAUS[1]) - 1);
      this.atualizarBarra();
      return 'guardiao3';
    }
    this.vistas.add('aperto');
    this.vistas.add('teto');
    this.damage(H);
    return 'besta1';
  }
```

- [ ] **Step 9: Rodar e ver passar**

Run: `npm run typecheck` → sem erros.
Run: `node scripts/test-dev-fases-jogo.mjs` → `TODOS OK`.
Run (sem regressão no Guardião): `node scripts/test-guardiao-vida-jogo.mjs` → `TODOS OK`.

---

### Task 3: a tecla 7, o `devFase`/`devMao` da cena e o atalho da URL

**Files:**
- Create: `src/dev/atalhoFase.ts`
- Modify: `src/scenes/GameScene.ts` (o tipo do `create`, ~linha 353; depois do `entrarNaFase`, ~linha 688; o bloco DEV das teclas, ~linha 952; o `update`, logo depois do bloco do HITSTOP, ~linha 1000)
- Modify: `src/main.ts` (o bloco DEV, ~linha 54)
- Test: `scripts/test-dev-teclas-jogo.mjs` (as partes da URL e da tecla 7)

**Interfaces:**
- Consumes: `IrParaFase` (Task 1), `lerAtalhoFase`, `maoPorNome`, `carregar()` de `src/sandbox/config.ts` (a montagem salva, `niveis`), `StageBoss.devFaseAtual`/`devProximaFase` (Task 2).
- Produces: `GameScene.create(data)` aceita `devFase?: string` e `devMao?: string[]` (a Task 4 reinicia a cena com eles); `ligarAtalhoFase(game: Phaser.Game): void`.

- [ ] **Step 1: Escrever o teste em jogo que falha (URL + tecla 7)**

`scripts/test-dev-teclas-jogo.mjs`:

```js
// THE DEV KEYS IN THE GAME (24/11, the Beast's step 1 — spec 2026-11-24-besta-refeita §7): the URL opens a boss phase
// with a hand, key 7 goes to the next phase, key 8 swaps the hand and restarts at the same phase.
//   npm run dev, then  node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';
import { MAOS } from '../src/dev/maos.ts';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
// (the F4 opens a card table at the start of the practice: close it, as the other in-game tests do)
const naFase = (alvo, s = 120) =>
  page.waitForFunction((a) => {
    const g = window.__game?.scene;
    if (!g) return false;
    if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
    const sc = g.getScene('Game');
    if (!g.isActive('Game') || !sc?.boss) return false;
    sc.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    sc.damageShip = () => {};
    return sc.boss.devFaseAtual === a;
  }, alvo, { timeout: s * 1000, polling: 200 }).then(() => true, () => false);
const mao = () => page.evaluate(() => window.__game.registry.get('cartas'));
const igual = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// ── the URL ──
await page.goto(`http://localhost:${porta}/?fase=besta2&mao=forte`, { waitUntil: 'domcontentloaded' });
conferir(await naFase('besta2', 180), '?fase=besta2 abre a F4 e chega à Besta fase 2', null);
conferir(igual(await mao(), MAOS.forte), '&mao=forte: a mão é a forte', await mao());
const arma = await page.evaluate(() => window.__game.scene.getScene('Game').cartas.arma());
conferir(typeof arma === 'string' && arma.length > 0, 'a arma nasceu da mão (montarArma)', arma);

// ── key 7 ──
await page.keyboard.press('7');
conferir(await naFase('besta3', 15), 'a tecla 7 leva à besta3', await page.evaluate(() => window.__game.scene.getScene('Game').boss.devFaseAtual));

// ── the URL on the F1 (the F1 entry zeroes the hand: devMao comes after it) ──
await page.goto(`http://localhost:${porta}/?fase=torre2&mao=mediana`, { waitUntil: 'domcontentloaded' });
conferir(await naFase('torre2', 180), '?fase=torre2 chega à Torre no ar', null);
conferir(igual(await mao(), MAOS.mediana), 'e com a mediana, mesmo na F1', await mao());

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs`
Expected: `FALHA ?fase=besta2 abre a F4 e chega à Besta fase 2` (a URL ainda não faz nada: o jogo fica no menu).

- [ ] **Step 3: O atalho da URL**

`src/dev/atalhoFase.ts`:

```ts
import type Phaser from 'phaser';
import { lerAtalhoFase } from './fasesDev.ts';
import { maoPorNome } from './maos.ts';
import { carregar } from '../sandbox/config.ts';

/**
 * `?fase=besta3&mao=mediana` (dev — spec 2026-11-24-besta-refeita §7): the boss's stage opens straight into the fight
 * (the practice), the scene walks the boss to that phase (`devFase` → `IrParaFase`), with that hand (`devMao`). Only in
 * dev: `main.ts` imports this under `import.meta.env.DEV`.
 */
export function ligarAtalhoFase(game: Phaser.Game): void {
  const a = lerAtalhoFase(new URLSearchParams(location.search));
  if (!a) return;
  // (waits for the menu: stopping the Boot halfway would leave the game without textures — the sandbox's rule)
  const tentar = (): void => {
    if (!game.scene.isActive('Menu')) {
      setTimeout(tentar, 100);
      return;
    }
    game.scene.getScenes(true).forEach((s) => s.scene.stop());
    const devMao = a.mao ? maoPorNome(a.mao, carregar().niveis) : undefined;
    game.scene.start('Game', {
      stage: a.stage,
      ship: a.stage === 1 ? undefined : 'humana',
      handling: 'diegetico',
      practice: true,
      devFase: a.fase,
      devMao,
    });
  };
  tentar();
}
```

Em `src/main.ts`, no bloco `if (import.meta.env.DEV) {`, depois da linha do `ligarAtalhoSerpente`:

```ts
  // A FASE DE UM CHEFÃO DIRETO (só em dev): `?fase=besta3&mao=mediana` (spec 2026-11-24-besta-refeita §7).
  void import('./dev/atalhoFase.ts').then((m) => m.ligarAtalhoFase(game));
```

- [ ] **Step 4: A cena — `devFase`, `devMao`, o "ir até a fase" e a tecla 7**

Em `src/scenes/GameScene.ts`:

(a) No topo, junto dos outros imports:

```ts
import { IrParaFase } from '../dev/irParaFase';
```

(b) Nos campos da classe (perto de `private practice = false;`, ~linha 186):

```ts
  /** DEV (spec 2026-11-24-besta-refeita §7): walks the boss to the phase of `?fase=` or of key 8's restart. */
  private devIrPara: IrParaFase | null = null;
```

(c) No tipo do `create(data: { … })`, depois de `decolou?: boolean;`:

```ts
    /** DEV: the boss phase to walk to as soon as the boss is up (`?fase=`, key 8's restart). */
    devFase?: string;
    /** DEV: the card hand of this entry (`?mao=`, key 8) — set after `entrarNaFase`, which zeroes the F1. */
    devMao?: string[];
```

(d) Logo depois de `this.serpenteDev = data.serpente ?? null;`:

```ts
    this.devIrPara = import.meta.env.DEV && data.devFase ? new IrParaFase(data.devFase) : null;
```

(e) Logo depois de `if (!this.sandbox) entrarNaFase(this.registry, this.stage.id);`:

```ts
    // DEV (key 8, `?mao=`): the chosen hand IS this stage's entry hand — a death-retry gives it back too
    if (import.meta.env.DEV && data.devMao) {
      const cps = (this.registry.get('cartasCheckpoint') as Record<number, string[]> | undefined) ?? {};
      this.registry.set('cartas', [...data.devMao]);
      this.registry.set('cartasCheckpoint', { ...cps, [this.stage.id]: [...data.devMao] });
    }
```

(f) No bloco `if (import.meta.env.DEV) {` das teclas (~linha 952), depois do `kb.on('keydown-SIX', …)`:

```ts
      // 7: the boss's next phase (spec 2026-11-24-besta-refeita §7) — the Guardian's steps, then the Beast's phases
      kb.on('keydown-SEVEN', () => {
        if (this.over || !this.boss?.devProximaFase) return;
        const f = this.boss.devProximaFase();
        console.info(`[dev] 7 → ${f ?? `fica em ${this.boss.devFaseAtual} (sem próxima, ou numa transição)`}`);
      });
```

(g) No `update`, logo depois do bloco do HITSTOP (o `if (this.hitstopAte > 0) { … }`):

```ts
    // DEV: walking to the phase of `?fase=` / key 8 (one jump per frame; the boss refuses during its transitions)
    if (import.meta.env.DEV && this.devIrPara?.passo(this.boss, delta / 1000)) this.devIrPara = null;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run typecheck` → sem erros.
Run: `node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs` → `TODOS OK`.

---

### Task 4: a tecla 8 (o painel das mãos)

**Files:**
- Create: `src/dev/painelMao.ts`
- Modify: `src/scenes/GameScene.ts` (o bloco DEV das teclas, depois da tecla 7)
- Test: `scripts/test-dev-teclas-jogo.mjs` (acrescentar a parte da tecla 8)

**Interfaces:**
- Consumes: `NOMES_MAO`, `maoPorNome`, `type NomeMao` (Task 1); `carregar()` de `src/sandbox/config.ts`; `devFase`/`devMao` do `create` (Task 3).
- Produces: `abrirPainelMao(scene: Phaser.Scene, escolher: (cartas: string[], nome: NomeMao) => void): void`; o painel é `#dev-mao`, um botão por mão com `data-mao="<nome>"`; o método privado `GameScene.devTrocarMao(cartas: string[]): void`.

- [ ] **Step 1: Acrescentar ao teste a parte da tecla 8 (falha)**

Em `scripts/test-dev-teclas-jogo.mjs`, logo depois do bloco `// ── key 7 ──` (e antes do `// ── the URL on the F1`):

```js
// ── key 8 ──
await page.keyboard.press('8');
const aberto = await page.waitForSelector('#dev-mao', { timeout: 5000 }).then(() => true, () => false);
conferir(aberto, 'a tecla 8 abre o painel das mãos', null);
const botoes = await page.$$eval('#dev-mao button', (bs) => bs.map((b) => b.dataset.mao));
conferir(botoes.join() === 'nenhuma,mediana,forte,sandbox', 'um botão por mão, na ordem das teclas 1–4', botoes);
conferir(await page.evaluate(() => window.__game.scene.isPaused('Game')), 'com o painel aberto, a fase pausa', null);
await page.keyboard.press('Escape');
const fechou = await page.evaluate(() => !document.getElementById('dev-mao') && !window.__game.scene.isPaused('Game'));
conferir(fechou, 'o ESC fecha o painel e a fase volta', null);
await page.keyboard.press('8');
await page.waitForSelector('#dev-mao', { timeout: 5000 });
await page.keyboard.press('1');
conferir(await naFase('besta3', 180), 'a mão "nenhuma" reinicia a luta na mesma fase (besta3)', null);
conferir((await mao()).length === 0, 'e sem cartas', await mao());
```

Run: `node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs`
Expected: `FALHA a tecla 8 abre o painel das mãos`.

- [ ] **Step 2: O painel**

`src/dev/painelMao.ts`:

```ts
import type Phaser from 'phaser';
import { NOMES_MAO, maoPorNome, type NomeMao } from './maos.ts';
import { carregar } from '../sandbox/config.ts';

const ROTULO: Record<NomeMao, string> = { nenhuma: 'sem cartas', mediana: 'mediana', forte: 'forte', sandbox: 'a do sandbox' };

/**
 * KEY 8 (dev — spec 2026-11-24-besta-refeita §7): a small HTML list of the ready hands over the game. The scene pauses
 * while it is open (its keys stop: the sandbox's 1–4 never fire under it); 1–4 or a click picks, ESC closes and resumes.
 * The keys are caught on `window` in the CAPTURE phase and stopped there, so Phaser's own listener never sees them.
 */
export function abrirPainelMao(scene: Phaser.Scene, escolher: (cartas: string[], nome: NomeMao) => void): void {
  if (document.getElementById('dev-mao')) return;
  const niveis = carregar().niveis;
  scene.scene.pause();

  const caixa = document.createElement('div');
  caixa.id = 'dev-mao';
  caixa.style.cssText =
    'position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:9999;display:flex;flex-direction:column;' +
    'gap:6px;padding:12px 16px;background:#0d0f14ee;border:1px solid #6a6f80;color:#e4e4e8;font:14px monospace';
  const titulo = document.createElement('b');
  titulo.textContent = 'MÃO (dev) — 1–4 ou clique, ESC fecha';
  caixa.appendChild(titulo);

  const fechar = (): void => {
    window.removeEventListener('keydown', tecla, true);
    caixa.remove();
  };
  const pegar = (nome: NomeMao): void => {
    fechar();
    escolher(maoPorNome(nome, niveis), nome);
  };
  NOMES_MAO.forEach((nome, i) => {
    const b = document.createElement('button');
    b.dataset.mao = nome;
    b.textContent = `${i + 1}  ${ROTULO[nome]} (${maoPorNome(nome, niveis).length} cartas)`;
    b.style.cssText = 'text-align:left;font:inherit;padding:4px 8px;cursor:pointer';
    b.onclick = () => pegar(nome);
    caixa.appendChild(b);
  });

  function tecla(e: KeyboardEvent): void {
    const i = Number(e.key) - 1;
    if (e.key === 'Escape') {
      e.stopImmediatePropagation();
      e.preventDefault();
      fechar();
      scene.input.keyboard?.resetKeys();
      scene.scene.resume();
    } else if (Number.isInteger(i) && i >= 0 && i < NOMES_MAO.length) {
      e.stopImmediatePropagation();
      e.preventDefault();
      pegar(NOMES_MAO[i]);
    }
  }
  window.addEventListener('keydown', tecla, true);
  document.body.appendChild(caixa);
}
```

- [ ] **Step 3: Ligar a tecla 8 e o reinício com a mão**

Em `src/scenes/GameScene.ts`:

(a) No bloco DEV das teclas, logo depois da tecla 7. O import é DINÂMICO: o painel puxa `sandbox/config.ts` (código só
de dev), e a `GameScene` é do build do jogador — um import estático o levaria para o build.

```ts
      // 8: choose the card hand — the stage restarts at the same boss phase with it (spec 2026-11-24-besta-refeita §7)
      kb.on('keydown-EIGHT', () => {
        if (this.over) return;
        void import('../dev/painelMao').then((m) => m.abrirPainelMao(this, (cartas) => this.devTrocarMao(cartas)));
      });
```

(b) Um método privado novo, perto de `voltarMontagem` (ou no fim da classe):

```ts
  /**
   * DEV, key 8 (spec 2026-11-24-besta-refeita §7): the chosen hand becomes this stage's entry hand and the stage restarts
   * in the practice at the boss phase it was in — the extra life, the hull, the drone and the gun are born from the hand,
   * as at a real stage entry.
   */
  private devTrocarMao(cartas: string[]): void {
    this.scene.start('Game', {
      stage: this.stage.id,
      handling: this.handling,
      practice: true,
      ship: this.shipId,
      score: this.scoreBase,
      devFase: this.boss?.devFaseAtual,
      devMao: cartas,
    });
  }
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run typecheck` → sem erros.
Run: `node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs` → `TODOS OK`.
Run: `npm run build` e depois `grep -l "dev-mao" dist/assets/*.js` → **nenhum arquivo** (o painel ficou fora do build do jogador). Se aparecer, o import não está dinâmico.

---

### Task 5: a regressão, a doc e a prova com ele

**Files:**
- Modify: `docs/HANDOFF.md` (a linha das teclas de dev)
- Modify: a memória `mapa-de-teclas-pendente.md` (o "dev 1–6" vira "dev 5–8")

- [ ] **Step 1: A regressão**

Com o `npm run dev` de pé, rodar e conferir `TODOS OK` em cada um:

```bash
node --experimental-transform-types scripts/test-dev-atalhos.mjs
node scripts/test-dev-fases-jogo.mjs
node --experimental-transform-types scripts/test-dev-teclas-jogo.mjs
node scripts/test-guardiao-vida-jogo.mjs
node scripts/test-guardiao-coleira-jogo.mjs
node --experimental-transform-types scripts/test-cartas-regras.mjs
node --experimental-transform-types scripts/test-sandbox-arvore.mjs
npm run typecheck
```

(As duas falhas antigas conhecidas, `test-som.mjs` e `probe-stage4.mjs`, não são deste passo.)

- [ ] **Step 2: A doc**

Em `docs/HANDOFF.md`, onde estão as teclas de dev (procurar "teclas de dev"), acrescentar:

```markdown
> **Teclas de dev (24/11, passo 1 da Besta — spec `2026-11-24-besta-refeita` §7):** **5** pula para o chefão, **6** abre
> uma mesa, **7** leva o chefão à próxima fase (`torre1/2`, `capitania1/2`, `serpenteA/B/C`→`fusao`, `guardiao1/2/3`,
> `besta1/2/3`), **8** escolhe a mão (sem cartas / mediana / forte / a do sandbox) e reinicia no mesmo ponto da luta. Pela
> URL: `?fase=besta3&mao=mediana`. A mediana e a forte são PROVISÓRIAS (a frente 1 do rebalanceamento as calibra).
```

E na memória `mapa-de-teclas-pendente.md`, trocar `dev 1–6` por `dev 5–8 (5 chefão, 6 mesa, 7 próxima fase do chefão, 8
escolher a mão; ?fase=&mao= na URL)`, e a linha correspondente do `MEMORY.md`.

- [ ] **Step 3: A prova com ele**

Mostrar a ele, no jogo: abrir `http://localhost:5173/?fase=besta1&mao=mediana`, apertar **7** duas vezes (fase 2, o
urro; fase 3, o breu), apertar **8** e escolher a forte (reinicia na fase 3). Ele aprova ou pede ajuste.

- [ ] **Step 4: Commit — só quando ele pedir**

```bash
git add src/dev/ src/entities/Boss.ts src/entities/BossCapitania.ts src/entities/BossSerpente.ts src/entities/BossNucleo.ts src/entities/Predador.ts src/scenes/GameScene.ts src/main.ts scripts/test-dev-atalhos.mjs scripts/test-dev-fases-jogo.mjs scripts/test-dev-teclas-jogo.mjs docs/HANDOFF.md docs/superpowers/specs/2026-11-24-besta-refeita-design.md docs/superpowers/plans/2026-11-24-besta-passo1-teclas-dev.md
git commit -m "feat(dev): as teclas 7 (a próxima fase do chefão) e 8 (escolher a mão, reinicia no mesmo ponto da luta) e o atalho ?fase=&mao= — o passo 1 da Besta refeita"
```

(Sem `Co-Authored-By`. A spec, as folhas leves do dia — só JPEG/HTML, nunca os GIFs — e os scripts de análise
`_ver-slash-hitbox.mjs` / `_ver-besta-movimentos.mjs` podem ir num commit `docs:`/`chore:` separado, se ele quiser.)
