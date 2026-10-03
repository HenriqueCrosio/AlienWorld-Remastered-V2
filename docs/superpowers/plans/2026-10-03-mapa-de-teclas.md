# O mapa de teclas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** trocar as teclas soltas por uma camada de AÇÕES com dois perfis (padrão Espaço/Shift/E/F e clássico Z/X/C/F), tirar o tiro automático da F1, levar as teclas de dev para 1–6 e deixar o gancho do futuro menu de controles e do gamepad.

**Architecture:** `src/controles.ts` (sem Phaser) guarda os perfis e decide o ativo (`?teclas=` → `localStorage['aw.teclas']` → padrão). O `InputReader` cria as teclas a partir do mapa, lê o `JustDown` de cada uma UMA vez por quadro e devolve o `InputState` (que ganha `dashPressed` e `flarePressed`). O Dash e o Flare deixam de escutar o teclado e passam a ler o `InputState` pelo `CartasEmJogo.tick`.

**Tech Stack:** TypeScript + Phaser 3.90 + Vite; testes puros em node (`node scripts/test-*.mjs`, que importam `.ts` direto); sondas Playwright (`node scripts/probe-*.mjs` com o `npm run dev` no ar em `localhost:5173`).

**Spec:** `docs/superpowers/specs/2026-10-03-mapa-de-teclas-design.md`

## Global Constraints

- Perfil PADRÃO: mover WASD **ou** setas · flap W / ↑ · tiro **SPACE** · bomba **SHIFT** · dash **E** · flare **F**.
- Perfil CLÁSSICO: o mesmo movimento e flap · tiro **Z** · bomba **X** · dash **C** · flare **F**.
- Nenhum perfil usa CTRL (Ctrl+W fecha a aba e não dá para bloquear).
- Escolha do perfil: `?teclas=classico|padrao` na URL grava em `localStorage['aw.teclas']`; storage inválido ou ausente = padrão; todo acesso ao storage em `try/catch`.
- O mouse NÃO atira nem faz flap no jogo (continua na mesa e nos menus).
- O tiro é manual nas DUAS conduções (o `autoFire` sai).
- Dev (só `import.meta.env.DEV`, dentro do jogo): 1 onda · 2 limpar · 3 invulnerável · 4 medidas · 5 chefão · 6 mesa. O 1–4 de equipar arma sai.
- Mesa e game over ignoram `event.repeat`.
- O texto das cartas NUNCA cita tecla.
- Comentários e textos em pt-br, no tom do código vizinho. Edite com a ferramenta Edit (sed/`node -e` falham em silêncio aqui — CRLF e `${}`).
- Commits só com a autoria do Henrique — **sem** linha `Co-Authored-By`.

---

### Task 1: `src/controles.ts` — os perfis e o perfil ativo

**Files:**
- Create: `src/controles.ts`
- Test: `scripts/test-controles.mjs`

**Interfaces:**
- Produces: `type Acao`, `type Perfil = 'padrao' | 'classico'`, `type Mapa = Record<Acao, readonly string[]>`, `ACOES: readonly Acao[]`, `PERFIS: Record<Perfil, Mapa>`, `CHAVE_STORAGE = 'aw.teclas'`, `resolverPerfil(salvo: string | null, busca: string): { perfil: Perfil; gravar: Perfil | null }`, `perfilAtivo(): Perfil`, `mapaAtivo(): Mapa`, `rotuloDaTecla(nome: string): string`. Os nomes de tecla são os do `Phaser.Input.Keyboard.KeyCodes` (`'W'`, `'UP'`, `'SPACE'`, `'SHIFT'`…).

- [ ] **Step 1: Escrever o teste que falha** — `scripts/test-controles.mjs`:

```js
// O MAPA DE TECLAS (spec 2026-10-03-mapa-de-teclas-design.md). Uso, da raiz:
// node scripts/test-controles.mjs
import { ACOES, PERFIS, resolverPerfil, rotuloDaTecla } from '../src/controles.ts';

const falhas = [];
const igual = (a, b, msg) => {
  const ok = JSON.stringify(a) === JSON.stringify(b);
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — veio ${JSON.stringify(a)}, esperado ${JSON.stringify(b)}`}`);
  if (!ok) falhas.push(msg);
};

for (const [nome, mapa] of Object.entries(PERFIS)) {
  igual(ACOES.filter((a) => !(mapa[a]?.length > 0)), [], `${nome}: as 9 ações têm tecla`);
  // Uma tecla, uma ação — fora W/↑, que são "cima" E "flap" de propósito (o flap é o "para cima" da F1).
  const dono = new Map();
  const repetidas = [];
  for (const a of ACOES) {
    for (const t of mapa[a]) {
      const par = [dono.get(t), a].sort().join('+');
      if (dono.has(t) && par !== 'cima+flap') repetidas.push(`${t}: ${par}`);
      dono.set(t, a);
    }
  }
  igual(repetidas, [], `${nome}: nenhuma tecla em duas ações (fora cima+flap)`);
  igual([...dono.keys()].filter((t) => t === 'CTRL'), [], `${nome}: sem CTRL (Ctrl+W fecha a aba)`);
}

igual([PERFIS.padrao.tiro, PERFIS.padrao.bomba, PERFIS.padrao.dash, PERFIS.padrao.flare], [['SPACE'], ['SHIFT'], ['E'], ['F']], 'padrão: Espaço · Shift · E · F');
igual([PERFIS.classico.tiro, PERFIS.classico.bomba, PERFIS.classico.dash, PERFIS.classico.flare], [['Z'], ['X'], ['C'], ['F']], 'clássico: Z · X · C · F');
igual([PERFIS.padrao.flap, PERFIS.classico.flap], [['W', 'UP'], ['W', 'UP']], 'o flap é W / ↑ nos dois (o Espaço não faz flap)');

igual(resolverPerfil(null, ''), { perfil: 'padrao', gravar: null }, 'nada salvo, nada na URL: padrão');
igual(resolverPerfil('classico', ''), { perfil: 'classico', gravar: null }, 'o salvo vale');
igual(resolverPerfil('lixo', ''), { perfil: 'padrao', gravar: null }, 'salvo inválido: padrão');
igual(resolverPerfil(null, '?teclas=classico'), { perfil: 'classico', gravar: 'classico' }, '?teclas=classico escolhe e grava');
igual(resolverPerfil('classico', '?sandbox&teclas=padrao'), { perfil: 'padrao', gravar: 'padrao' }, 'a URL vence o salvo');
igual(resolverPerfil('classico', '?teclas=xyz'), { perfil: 'classico', gravar: null }, 'URL inválida: fica o salvo');

igual([rotuloDaTecla('SPACE'), rotuloDaTecla('Z')], ['ESPAÇO', 'Z'], 'o rótulo na tela');

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node scripts/test-controles.mjs`
Expected: erro `Cannot find module '.../src/controles.ts'`.

- [ ] **Step 3: Implementar** — `src/controles.ts`:

```ts
/**
 * O MAPA DE TECLAS (spec `2026-10-03-mapa-de-teclas-design.md`): o jogo pergunta por AÇÕES, nunca por teclas — o
 * desenho dos "action maps" das engines. As ações moram na MÃO ESQUERDA e valem igual para quem move no WASD ou nas
 * setas; os dois layouts mudam só o movimento.
 *
 * Sem Phaser (o teste roda em node): as teclas são os NOMES do `Phaser.Input.Keyboard.KeyCodes`. O Phaser não separa
 * o Shift esquerdo do direito — e é isso que queremos (a bomba vale nos dois lados).
 *
 * ⚠️ NENHUM PERFIL USA CTRL: Ctrl+W fecha a aba e nenhuma página consegue bloquear. No WASD, segurar W e apertar a
 * bomba fecharia o jogo (a repetição do W chega como Ctrl+W).
 *
 * É o gancho do MENU DE CONTROLES (spec própria, junto com o áudio): ele só vai escrever em `aw.teclas`.
 */
export type Acao = 'cima' | 'baixo' | 'esquerda' | 'direita' | 'flap' | 'tiro' | 'bomba' | 'dash' | 'flare';
export type Perfil = 'padrao' | 'classico';
export type Mapa = Record<Acao, readonly string[]>;

export const ACOES: readonly Acao[] = ['cima', 'baixo', 'esquerda', 'direita', 'flap', 'tiro', 'bomba', 'dash', 'flare'];

/** WASD OU setas. O flap é o "para cima" da F1 (W / ↑) — o Espaço não faz flap desde 03/10. */
const MOVIMENTO = {
  cima: ['W', 'UP'],
  baixo: ['S', 'DOWN'],
  esquerda: ['A', 'LEFT'],
  direita: ['D', 'RIGHT'],
  flap: ['W', 'UP'],
} as const;

export const PERFIS: Record<Perfil, Mapa> = {
  // Espaço no polegar, Shift no mindinho (os dois lados), E e F no indicador — o par clássico de habilidade no PC.
  padrao: { ...MOVIMENTO, tiro: ['SPACE'], bomba: ['SHIFT'], dash: ['E'], flare: ['F'] },
  // O old school do shmup (Z atira, X bomba) — *"para quem quer ter o prazer de jogar x/z"* (03/10).
  classico: { ...MOVIMENTO, tiro: ['Z'], bomba: ['X'], dash: ['C'], flare: ['F'] },
};

export const CHAVE_STORAGE = 'aw.teclas';

const ehPerfil = (v: unknown): v is Perfil => v === 'padrao' || v === 'classico';

/** `?teclas=` na URL vence (e é gravado); senão o salvo; senão o padrão. */
export function resolverPerfil(salvo: string | null, busca: string): { perfil: Perfil; gravar: Perfil | null } {
  const pedido = new URLSearchParams(busca).get('teclas');
  if (ehPerfil(pedido)) return { perfil: pedido, gravar: pedido };
  return { perfil: ehPerfil(salvo) ? salvo : 'padrao', gravar: null };
}

export function perfilAtivo(): Perfil {
  let salvo: string | null = null;
  try {
    salvo = localStorage.getItem(CHAVE_STORAGE);
  } catch {
    // Sem storage (aba privada, bloqueado): fica o padrão.
  }
  const { perfil, gravar } = resolverPerfil(salvo, typeof location === 'undefined' ? '' : location.search);
  if (gravar) {
    try {
      localStorage.setItem(CHAVE_STORAGE, gravar);
    } catch {
      // Idem: a escolha vale só nesta visita.
    }
  }
  return perfil;
}

export const mapaAtivo = (): Mapa => PERFIS[perfilAtivo()];

const ROTULO: Record<string, string> = { SPACE: 'ESPAÇO' };

/** O nome da tecla na tela ("ESPAÇO repete…"). */
export const rotuloDaTecla = (nome: string): string => ROTULO[nome] ?? nome;
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node scripts/test-controles.mjs`
Expected: todas as linhas `OK`, fim `TUDO OK`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/controles.ts scripts/test-controles.mjs
git commit -m "feat(teclas): os perfis padrão e clássico, e o perfil ativo pela URL e pelo storage"
```

---

### Task 2: o `InputReader` lê o mapa, e o tiro automático sai

**Files:**
- Modify: `src/input.ts` (a classe inteira)
- Modify: `src/flight/FlightController.ts` (`InputState`; o campo `autoFire` e o comentário dele saem)
- Modify: `src/flight/FlapController.ts` (`readonly autoFire = true;` sai)
- Modify: `src/flight/FreeController.ts` (`readonly autoFire = false;` sai)
- Modify: `src/scenes/GameScene.ts:~721-727` (o gatilho da arma) e `:~735-737` (o comentário da bomba)

**Interfaces:**
- Consumes: `ACOES`, `mapaAtivo`, `type Acao`, `type Mapa` (Task 1).
- Produces: `InputState` com `dashPressed: boolean` e `flarePressed: boolean` (bordas, true só no quadro em que a tecla desceu). Sem `autoFire` no `FlightController`.

- [ ] **Step 1: `InputState`** — em `src/flight/FlightController.ts`, trocar os campos `flapPressed`/`firing`/`bombPressed` e acrescentar os dois novos:

```ts
  /** FLAP (W / ↑): true apenas no frame em que a tecla desceu — o flap depende disso. */
  flapPressed: boolean;
  /** TIRO segurado (Espaço no padrão, Z no clássico). Manual nas duas conduções desde 03/10. */
  firing: boolean;
  /** BOMBA (Shift / X): true apenas no frame em que a tecla desceu. A cena decide se gasta. */
  bombPressed: boolean;
  /** DASH (E / C): borda. Quem decide se sai é a carta (`Dash`). */
  dashPressed: boolean;
  /** FLARE (F): borda. Quem decide se sai é a carta (`Lancadores`). */
  flarePressed: boolean;
```

E apagar do `interface FlightController` o bloco do `autoFire` (o comentário "A nave atira sozinha nesta condução?…" e `readonly autoFire: boolean;`).

- [ ] **Step 2: as conduções** — apagar `readonly autoFire = true;` do `FlapController` e `readonly autoFire = false;` do `FreeController`. No cabeçalho do `FlapController`, acrescentar ao fim do comentário da classe:

```ts
 *
 * Desde 03/10 o TIRO É MANUAL aqui também (o mapa de teclas): o flap é W / ↑ e o tiro é o Espaço — cada tecla faz
 * uma coisa só no jogo inteiro. A dificuldade da F1 volta para a calibragem.
```

- [ ] **Step 3: o `InputReader`** — substituir `src/input.ts` inteiro:

```ts
import Phaser from 'phaser';
import type { InputState } from './flight/FlightController';
import { ACOES, mapaAtivo, type Acao, type Mapa } from './controles';

/**
 * Lê o teclado PELO MAPA DE TECLAS (`src/controles.ts`) e devolve um InputState neutro.
 * As conduções e as cartas recebem intenção ("subir", "dash"), nunca teclas — é o que permite plugar o gamepad
 * (etapa 1.6) somando no MESMO estado, sem tocar em quem consome.
 *
 * ⚠️ UM LEITOR SÓ, UMA LEITURA POR QUADRO: o `JustDown` do Phaser é CONSUMIDO por quem lê primeiro. Até 02/10 o Dash
 * escutava o evento por fora porque o flap já gastava o `JustDown` da tecla de cima. Aqui cada tecla é lida uma vez e
 * as bordas das ações saem dessa leitura — um toque que desce e sobe dentro do mesmo quadro continua contando (o
 * `_justDown` nasce no evento, não no `isDown`).
 *
 * O mouse não entra mais no jogo (03/10): ele atirava e fazia flap — entrada duplicada.
 */
export class InputReader {
  private readonly mapa: Mapa;
  private readonly keys = new Map<string, Phaser.Input.Keyboard.Key>();

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.mapa = mapaAtivo();
    for (const a of ACOES) {
      for (const nome of this.mapa[a]) if (!this.keys.has(nome)) this.keys.set(nome, kb.addKey(nome));
    }
  }

  read(): InputState {
    const desceu = new Set<string>();
    for (const [nome, k] of this.keys) if (Phaser.Input.Keyboard.JustDown(k)) desceu.add(nome);
    const segura = (a: Acao): boolean => this.mapa[a].some((n) => this.keys.get(n)!.isDown);
    const apertou = (a: Acao): boolean => this.mapa[a].some((n) => desceu.has(n));

    return {
      up: segura('cima'),
      down: segura('baixo'),
      left: segura('esquerda'),
      right: segura('direita'),
      // O flap dispara na BORDA da tecla, não enquanto segurada — senão vira voo contínuo.
      flapPressed: apertou('flap'),
      firing: segura('tiro'),
      // A bomba é BORDA: segurar não pode gastar o estoque inteiro.
      bombPressed: apertou('bomba'),
      dashPressed: apertou('dash'),
      flarePressed: apertou('flare'),
    };
  }
}
```

- [ ] **Step 4: a `GameScene`** — no `update`, o gatilho da arma. Trocar:

```ts
    // A condução decide se o gatilho é manual ou automático. A arma não sabe a diferença.
```

por:

```ts
    // O gatilho é manual nas duas conduções (03/10 — o tiro automático da F1 saiu com o mapa de teclas).
```

e trocar `(this.controller.autoFire || input.firing) && this.boss?.armaTravada !== true,` por `input.firing && this.boss?.armaTravada !== true,`. No comentário da bomba logo abaixo, trocar:

```ts
    // A BOMBA é da cena, não da arma: funciona nas duas conduções (no flap o K está livre,
    // já que o gatilho é automático) e independe da arma equipada.
```

por:

```ts
    // A BOMBA é da cena, não da arma: funciona nas duas conduções e independe da arma equipada.
```

- [ ] **Step 5: conferir os tipos** — o `CartasEmJogo` ainda não lê os campos novos (Task 3); isso compila.

Run: `npx tsc --noEmit`
Expected: sem erros. Se algum outro arquivo citar `autoFire`, `grep -rn autoFire src` e apagar o uso (a spec manda tiro manual em tudo).

- [ ] **Step 6: Commit**

```bash
git add src/input.ts src/flight/FlightController.ts src/flight/FlapController.ts src/flight/FreeController.ts src/scenes/GameScene.ts
git commit -m "feat(teclas): o InputReader lê o mapa, e o tiro da F1 vira manual"
```

---

### Task 3: o Dash e o Flare leem o `InputState`

**Files:**
- Modify: `src/cartasRegras.ts:139-167` (sai `Direcao` e `DuploToque`; entra `rumoDoDash`)
- Modify: `scripts/test-cartas-regras.mjs` (sai o bloco do `DuploToque`; entra o do `rumoDoDash`)
- Modify: `src/systems/cartas/Dash.ts`
- Modify: `src/systems/cartas/Lancadores.ts`
- Modify: `src/systems/CartasEmJogo.ts:177-211` (o `tick`)
- Modify: `src/scenes/GameScene.ts:~716` (a chamada do `cartas.tick`)

**Interfaces:**
- Consumes: `InputState.dashPressed`, `InputState.flarePressed`, `up/down/left/right` (Task 2).
- Produces: `rumoDoDash(cima: boolean, baixo: boolean, esquerda: boolean, direita: boolean): [number, number]`; `CartasEmJogo.tick(time, dt, elapsed, livre, body, input: InputState)`; `Dash.tick(livre, body, input: InputState)`; `Lancadores.tick(dt, flarePedido: boolean)`.

- [ ] **Step 1: o teste que falha** — em `scripts/test-cartas-regras.mjs`, trocar `DuploToque,` por `rumoDoDash,` no `import` e substituir o bloco inteiro `// DuploToque — …` (as 7 linhas do `const dt = new DuploToque(220);` até o último `igual(dt.apertou(…))`) por:

```js
// rumoDoDash — a direção SEGURADA (8 direções, normalizada); parado, para a FRENTE
const r = (v) => v.map((n) => Math.round(n * 1000) / 1000);
igual(r(rumoDoDash(false, false, false, false)), [1, 0], 'parado: o dash vai para a frente (direita)');
igual(r(rumoDoDash(true, false, false, false)), [0, -1], 'segurando cima: para cima');
igual(r(rumoDoDash(false, false, true, false)), [-1, 0], 'segurando esquerda: para trás');
igual(r(rumoDoDash(true, false, false, true)), [0.707, -0.707], 'diagonal: normalizada (mesma distância)');
igual(r(rumoDoDash(false, false, true, true)), [1, 0], 'esquerda e direita juntas se anulam: para a frente');
```

- [ ] **Step 2: rodar e ver falhar**

Run: `node scripts/test-cartas-regras.mjs`
Expected: `SyntaxError`/erro de import — `rumoDoDash` não existe em `cartasRegras.ts`.

- [ ] **Step 3: implementar** — em `src/cartasRegras.ts`, substituir o `export type Direcao …` e a classe `DuploToque` inteira (com o comentário dela) por:

```ts
/**
 * O RUMO do Dash (03/10, o mapa de teclas): a direção SEGURADA no movimento, em 8 direções e normalizada (a diagonal
 * anda a mesma distância); parado — ou com esquerda e direita juntas —, para a FRENTE. O duplo toque saiu: disparava
 * sem querer em quem corrige a posição rápido, e no analógico nem existe.
 */
export function rumoDoDash(cima: boolean, baixo: boolean, esquerda: boolean, direita: boolean): [number, number] {
  const x = (direita ? 1 : 0) - (esquerda ? 1 : 0);
  const y = (baixo ? 1 : 0) - (cima ? 1 : 0);
  if (!x && !y) return [1, 0];
  const n = Math.hypot(x, y);
  return [x / n, y / n];
}
```

Run: `node scripts/test-cartas-regras.mjs` → Expected: `TUDO OK`.

- [ ] **Step 4: o Dash** — em `src/systems/cartas/Dash.ts`:
  - imports: `import type Phaser from 'phaser';` · `import { rumoDoDash } from '../../cartasRegras';` · `import type { InputState } from '../../flight/FlightController';` · `import type { Contexto } from './contexto';`
  - apagar `const JANELA_MS = 220;`, o bloco `TECLAS` (com o comentário ⚠️ acima dele) e `const RUMO …`.
  - trocar o comentário da classe por:

```ts
/**
 * O DASH (§4.2): a ação DASH (E no padrão, C no clássico — 03/10) — um avanço curto na direção SEGURADA (parado,
 * para a frente), INVULNERÁVEL, com espera. Só existe para quem tem a carta, e só no voo livre (fora da F1). O visual
 * são IMAGENS-FANTASMA da própria sprite (vale para as 6 naves sem arte nova).
 */
```

  - apagar os campos `toque` e `pedido`, e o `constructor` inteiro vira:

```ts
  constructor(private readonly c: Contexto) {}
```

  - o `tick`:

```ts
  /** Roda DEPOIS da condução e dos Propulsores: durante o dash, ele manda na velocidade. */
  tick(livre: boolean, body: Phaser.Physics.Arcade.Body, input: InputState): void {
    const agora = this.c.h.scene.time.now;
    if (input.dashPressed && livre && this.pronto) {
      this.comecar(rumoDoDash(input.up, input.down, input.left, input.right), agora, body);
    }

    if (agora < this.ate) {
```

  (o resto do `tick` fica igual) e o `comecar`:

```ts
  private comecar(rumo: [number, number], agora: number, body: Phaser.Physics.Arcade.Body): void {
    this.rumo = rumo;
```

  (o resto igual).

- [ ] **Step 5: o Flare** — em `src/systems/cartas/Lancadores.ts`:
  - o comentário e a constante:

```ts
/**
 * O FLARE é SOLTO PELO JOGADOR (02/10, *"para não ficar muito roubado"*): a ação FLARE (F — 03/10, *"em jogos de naves
 * o flare é F"*), com espera; "FLARE" acende na HUD quando pronto. Sai para trás a 60px/s e FREIA (×0,1 por segundo)
 * até parar — fica na rota de quem persegue.
 */
const FLARE = { esperaMs: 8000, velocidade: 60, freio: 0.1, vidaMs: 3000, dano: 1 };
```

  - apagar o campo `private pediuFlare = false;`, e o `constructor` perde o bloco do teclado (fica só a atribuição dos parâmetros):

```ts
  constructor(
    private readonly c: Contexto,
    private readonly explosao: ExplosaoDoJogador,
  ) {}
```

  - no `tick`, a assinatura vira `tick(dt: number, flarePedido: boolean): void {` e o bloco do flare:

```ts
    if (flarePedido && this.flareProntoAgora) {
      this.flarePronto = agora + FLARE.esperaMs;
      this.soltarFlare(n.x - 12, n.y, agora);
    }
```

- [ ] **Step 6: o `CartasEmJogo`** — `import type { InputState } from '../flight/FlightController';` junto dos imports; a assinatura do `tick` vira:

```ts
  tick(time: number, dt: number, elapsed: number, livre: boolean, body: Phaser.Physics.Arcade.Body, input: InputState): void {
```

e dentro: `this.dash.tick(livre, body, input);` e `this.lancadores.tick(dt, input.flarePressed);`.

- [ ] **Step 7: a `GameScene`** — `this.cartas.tick(time, dt, this.elapsed, this.controller.id === 'free', body, input);`

- [ ] **Step 8: conferir**

Run: `npx tsc --noEmit` → sem erros. `grep -rn "DuploToque\|Direcao\|pediuFlare\|FLARE.tecla" src scripts/test-*.mjs` → nada.

- [ ] **Step 9: Commit**

```bash
git add src/cartasRegras.ts scripts/test-cartas-regras.mjs src/systems/cartas/Dash.ts src/systems/cartas/Lancadores.ts src/systems/CartasEmJogo.ts src/scenes/GameScene.ts
git commit -m "feat(teclas): o Dash no E (na direção segurada) e o Flare no F, lidos pelo InputState"
```

---

### Task 4: a mesa e o game over — a tecla de tiro do perfil, sem repetição

**Files:**
- Modify: `src/scenes/CartasScene.ts:~154-159`
- Modify: `src/scenes/GameOverScene.ts:~96-116`

**Interfaces:**
- Consumes: `mapaAtivo`, `rotuloDaTecla` (Task 1).

- [ ] **Step 1: a mesa** — `import { mapaAtivo } from '../controles';` e trocar as seis linhas `keydown-ONE` … `keydown-J` por:

```ts
    // ⚠️ SÓ TOQUE NOVO: quem segura o TIRO (o Espaço) quando a mesa abre manda a repetição automática do sistema como
    // `keydown` — sem este filtro, a carta do cursor era escolhida sem ele ver.
    const novo = (f: () => void) => (ev: KeyboardEvent) => {
      if (!ev.repeat) f();
    };
    kb.on('keydown-ONE', novo(() => this.confirmar(0)));
    kb.on('keydown-TWO', novo(() => this.confirmar(1)));
    kb.on('keydown-THREE', novo(() => this.confirmar(2)));
    kb.on('keydown-ENTER', novo(() => this.confirmar(this.cursor)));
    // A tecla de TIRO do perfil confirma (Espaço no padrão, Z no clássico). O J saiu com o mapa de 03/10.
    for (const t of mapaAtivo().tiro) kb.on(`keydown-${t}`, novo(() => this.confirmar(this.cursor)));
```

- [ ] **Step 2: o game over** — `import { mapaAtivo, rotuloDaTecla } from '../controles';`. Antes do `this.text(` da linha de ajuda (o que hoje escreve `'ESPAÇO repete o CHEFÃO · ESC menu'`), declarar:

```ts
    const tiro = mapaAtivo().tiro[0];
    const tecla = rotuloDaTecla(tiro);
```

e o texto vira:

```ts
      practice
        ? `${tecla} repete o CHEFÃO · ESC menu`
        : victory
          ? `${tecla} joga de novo · ESC menu`
          : `${tecla} tenta a FASE ${stage} de novo · ESC menu`,
```

E o `kb.once('keydown-SPACE', …)` vira:

```ts
    // ⚠️ SÓ TOQUE NOVO: quem morre segurando o tiro manda a repetição do sistema — e a fase recomeçaria sozinha.
    let saiu = false;
    kb.on(`keydown-${tiro}`, (ev: KeyboardEvent) => {
      if (ev.repeat || saiu) return;
      saiu = true;
      this.scene.start('Game', { stage, handling, practice, ship, score: baseScore });
    });
```

(o comentário "No treino, ESPAÇO volta direto…" acima fica, trocando "ESPAÇO" por "o TIRO").

- [ ] **Step 3: conferir** — `npx tsc --noEmit` → sem erros.

- [ ] **Step 4: Commit**

```bash
git add src/scenes/CartasScene.ts src/scenes/GameOverScene.ts
git commit -m "feat(teclas): a mesa e o game over pela tecla de tiro, sem a repetição do sistema"
```

---

### Task 5: as teclas de dev em 1–6

**Files:**
- Modify: `src/scenes/GameScene.ts:~597-638` (o bloco `if (import.meta.env.DEV)` do `create`) e o comentário `(tecla I)` em `~2283`
- Modify: `src/systems/SandboxArena.ts:43-46`
- Modify: `src/sandbox/montagem.ts:166` (a linha de ajuda)

- [ ] **Step 1: a `GameScene`** — no bloco DEV:
  - `kb.on('keydown-G', () => {` vira `kb.on('keydown-FIVE', () => {` e o comentário acima vira `// 5: pula da fase direto para o chefão, sem reiniciar (era o G até 03/10 — as teclas de dev foram para 1–6).` (os comentários ⚠️ de dentro, que citam "apertar `G`", ganham "(hoje o 5)" na primeira menção).
  - apagar as quatro linhas `keydown-ONE`…`keydown-FOUR` (`weapons.equip`) com os dois comentários delas ("Troca de arma…" e "O ENXAME…"): as naves não dão mais arma desde a etapa 1.5, e o 1–4 agora é do sandbox.
  - `kb.on('keydown-C', () => {` vira `kb.on('keydown-SIX', () => {` e o comentário vira `// PROTÓTIPO DAS CARTAS: o 6 abre uma mesa a qualquer hora (era o C — que hoje é o dash do perfil clássico).`
  - no comentário `// O INVULNERÁVEL do sandbox (tecla I)`, trocar `(tecla I)` por `(tecla 3)`.

- [ ] **Step 2: o `SandboxArena`**:

```ts
    // As teclas de dev nos NÚMEROS (03/10): as letras de antes (N, X, I, M) colidiam com o perfil clássico (Z/X/C).
    const kb = scene.input.keyboard!;
    kb.on('keydown-ONE', () => this.onda());
    kb.on('keydown-TWO', () => this.limpar());
    kb.on('keydown-THREE', () => (this.invulneravel = !this.invulneravel));
    kb.on('keydown-FOUR', () => (this.painel.hidden = !this.painel.hidden));
```

- [ ] **Step 3: a ajuda do sandbox** — a linha `<div class="teclas">…</div></div>` vira:

```html
    <div class="teclas">no jogo: <kbd>ESPAÇO</kbd> tiro · <kbd>SHIFT</kbd> bomba · <kbd>E</kbd> dash · <kbd>F</kbd> flare · <kbd>ESC</kbd> montagem — dev: <kbd>1</kbd> onda · <kbd>2</kbd> limpar · <kbd>3</kbd> invulnerável · <kbd>4</kbd> medidas · <kbd>5</kbd> chefão · <kbd>6</kbd> mesa</div></div>
```

- [ ] **Step 4: conferir** — `npx tsc --noEmit` → sem erros; `grep -n "keydown-[GCNXIM]'" src/scenes/GameScene.ts src/systems/SandboxArena.ts` → nada.

- [ ] **Step 5: Commit**

```bash
git add src/scenes/GameScene.ts src/systems/SandboxArena.ts src/sandbox/montagem.ts
git commit -m "feat(teclas): as teclas de dev do jogo e do sandbox vão para 1–6"
```

---

### Task 6: as sondas no mapa novo + a `probe-teclas`

**Files:**
- Modify: as sondas da tabela abaixo
- Create: `scripts/probe-teclas.mjs`

Com o `npm run dev` no ar (`localhost:5173`). ⚠️ Atalhos do MENU (B, C, V, M, L, O, P, F, X, 1–3 no menu) **não mudam** — só o que é apertado DENTRO do jogo.

- [ ] **Step 1: as trocas** (Edit, uma por uma):

| Sonda | Troca |
|---|---|
| `probe-cartas-novas.mjs` | `'KeyL'` → `'KeyF'` (3×; o comentário "tecla provisória L" → "tecla F"); a função `duploToque(tecla)` vira `dash(tecla)` = `down(tecla)` · `press('KeyE')` · `up(tecla)`; as 4 chamadas `duploToque(` → `dash(`; as mensagens "dois toques:" → "E:" e "o duplo toque não dispara" → "o E não dispara" |
| `probe-sandbox.mjs` | `'KeyI'` → `'Digit3'` · `'KeyX'` → `'Digit2'` · `'KeyN'` → `'Digit1'`; mensagens "X limpa" → "2 limpa", "I liga… N chama" → "3 liga… 1 chama", o comentário "(tecla I)" → "(tecla 3)" |
| `probe-cartas.mjs` | o `press('c')` dentro do jogo → `press('6')` |
| `probe-bomba.mjs` | `down('k')`/`up('k')` → `down('Shift')`/`up('Shift')` |
| `probe-chain.mjs` | no `voar`: `down('Space')` antes do laço, `press('KeyW')` no lugar do `press('Space')`, `up('Space')` depois do laço; o comentário do `voar` ganha "(W faz o flap; o Espaço segurado atira — o tiro da F1 é manual desde 03/10)"; `press('G')` → `press('5')`; o comentário "o tiro automático do flap termina o serviço" → "o tiro termina o serviço" |
| `probe-stage4.mjs`, `probe-f4-agua.mjs`, `probe-f4-atalho-g.mjs`, `probe-f4-golfinho.mjs`, `probe-flak.mjs` | o `press('G')` DENTRO do jogo → `press('5')` (o `press('L')` do menu fica) |
| `probe-capitania.mjs`, `probe-fx.mjs`, `probe-hmg.mjs`, `probe-mina.mjs`, `probe-stage2.mjs` | `down('J')`/`up('J')` → `down('Space')`/`up('Space')` (o `C` do menu na `probe-stage2` fica) |
| `_gif-cartas.mjs` | o cenário do dash: no lugar do duplo toque (`down/up` duas vezes), `down(tecla)` · `press('KeyE')` · `up(tecla)` |
| `probe-enxame.mjs`, `probe-enxame-taxa.mjs`, `probe-armas.mjs` | primeira linha: `// ⚠️ OBSOLETA (03/10): equipava arma pelo 1–4 dentro do jogo, que saiu com o mapa de teclas — as naves não dão mais arma desde a etapa 1.5.` (`probe-armas` só se apertar dígito DENTRO do jogo; se o `'3'` dela for no menu, troque só `J` → `Space` se houver) |

Depois: `grep -nE "keyboard\.(press|down|up)\('(J|j|k|K|KeyL|KeyN|KeyX|KeyI|g)'\)" scripts/probe-*.mjs scripts/_gif-cartas.mjs` → nada fora das obsoletas.

- [ ] **Step 2: a sonda nova** — `scripts/probe-teclas.mjs`, no molde da `probe-cartas-novas` (mesmo `chromium.launch`, `window.__teste`, `conferir`). Casos:

```js
// O MAPA DE TECLAS (spec 2026-10-03-mapa-de-teclas-design.md). Com o `npm run dev` no ar:
// node scripts/probe-teclas.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

/** Abre a fase `stage` com as `cartas` na mão, a nave imortal e o roteiro parado (só a nave na tela). */
async function fase(stage, cartas, url = 'http://localhost:5173/') {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__game?.scene.isActive('Menu'));
  await page.evaluate(({ stage, cartas }) => {
    const g = window.__game;
    g.registry.set('cartas', cartas);
    g.scene.getScenes(true).forEach((s) => s.scene.stop());
    g.scene.start('Game', { stage, handling: 'diegetico', ship: 'humana' });
  }, { stage, cartas });
  await page.waitForFunction(() => window.__game.scene.getScene('Game')?.cartas);
  await page.waitForTimeout(600);
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.lives = 99;
    s.semMesas = true;
  });
}
const cena = (f) => page.evaluate(f);
const tirosVivos = () => cena(() => window.__game.scene.getScene('Game').weapons.bullets.countActive(true));

// ── 1. F1: o Espaço ATIRA e não faz flap; o W faz o flap ──
await fase(1, []);
const vy0 = await cena(() => window.__game.scene.getScene('Game').ship.body.velocity.y);
await page.keyboard.down('Space');
await page.waitForTimeout(400);
const f1 = await cena(() => ({ vy: window.__game.scene.getScene('Game').ship.body.velocity.y }));
const tirosF1 = await tirosVivos();
await page.keyboard.up('Space');
conferir(tirosF1 > 0 && f1.vy >= vy0, 'F1: o Espaço atira e não impulsiona a nave', { tirosF1, vy0, vy: f1.vy });
await page.waitForTimeout(800);
const semTiro = await tirosVivos();
conferir(semTiro === 0, 'F1: sem o Espaço, a nave não atira sozinha (o tiro automático saiu)', semTiro);
await page.keyboard.press('KeyW');
await page.waitForTimeout(30);
const vyFlap = await cena(() => window.__game.scene.getScene('Game').ship.body.velocity.y);
conferir(vyFlap < -100, 'F1: o W faz o flap', vyFlap);

// ── 2. Shift solta a bomba ──
await fase(2, []);
const bombas0 = await cena(() => window.__game.scene.getScene('Game').bombs);
await page.keyboard.press('Shift');
await page.waitForTimeout(100);
const bombas1 = await cena(() => window.__game.scene.getScene('Game').bombs);
conferir(bombas1 === bombas0 - 1, 'Shift solta uma bomba', { bombas0, bombas1 });

// ── 3. E faz o dash parado → para a FRENTE; F solta o flare ──
await fase(2, ['MOV_003', 'EFF_010']);
const x0 = await cena(() => window.__game.scene.getScene('Game').ship.x);
await page.keyboard.press('KeyE');
await page.waitForTimeout(300);
const x1 = await cena(() => window.__game.scene.getScene('Game').ship.x);
conferir(x1 - x0 >= 30, 'E parado: o dash avança ~40px para a frente', { x0, x1 });
await page.keyboard.press('KeyF');
await page.waitForTimeout(150);
const flares = await cena(() => window.__teste.projeteis('flare').length);
conferir(flares > 0, 'F solta o flare', flares);

// ── 4. Segurar o Espaço com a mesa abrindo NÃO escolhe carta ──
await fase(2, []);
await page.keyboard.down('Space');
await page.waitForTimeout(300);
await cena(() => window.__game.scene.getScene('Game').cartas.abrirMesa('teste', 'MESA DE TESTE'));
await page.waitForTimeout(1200); // a repetição automática do sistema chega nesse meio-tempo
const mesa = await cena(() => {
  const c = (window.__gameHD ?? window.__game).scene.getScene('Cartas');
  return { ativa: c.scene.isActive(), fechando: c.fechando };
});
await page.keyboard.up('Space');
conferir(mesa.ativa && !mesa.fechando, 'segurar o Espaço quando a mesa abre não escolhe a carta', mesa);
await page.keyboard.press('Space');
await page.waitForTimeout(600);
const escolheu = await cena(() => (window.__gameHD ?? window.__game).scene.getScene('Cartas').fechando === true || !(window.__gameHD ?? window.__game).scene.isActive('Cartas'));
conferir(escolheu, 'um toque NOVO no Espaço confirma', escolheu);

// ── 5. ?teclas=classico: Z atira, Espaço não ──
await fase(2, [], 'http://localhost:5173/?teclas=classico');
await page.keyboard.down('Space');
await page.waitForTimeout(400);
const comEspaco = await tirosVivos();
await page.keyboard.up('Space');
await page.waitForTimeout(800);
await page.keyboard.down('KeyZ');
await page.waitForTimeout(400);
const comZ = await tirosVivos();
await page.keyboard.up('KeyZ');
const salvo = await cena(() => localStorage.getItem('aw.teclas'));
conferir(comEspaco === 0 && comZ > 0 && salvo === 'classico', '?teclas=classico: o Z atira, o Espaço não, e a escolha fica gravada', { comEspaco, comZ, salvo });
await page.goto('http://localhost:5173/?teclas=padrao', { waitUntil: 'networkidle' }); // devolve o padrão a quem vier depois

conferir(erros.length === 0, 'nenhum erro no console', erros);
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
await browser.close();
process.exit(falhas.length ? 1 : 0);
```

⚠️ Antes de rodar, conferir no código os nomes que a sonda supõe e ajustar a SONDA (não o jogo) se diferirem: o grupo de tiros do `WeaponSystem` (`weapons.bullets`?), o estoque de bombas da cena (`bombs`?), o `window.__teste` (é instalado pela `probe-cartas-novas` ou pelo jogo? — se for da sonda, copie o instalador dela) e o campo `fechando` da `CartasScene`.

- [ ] **Step 3: rodar tudo**

Run (cada uma; todas com exit 0):
```bash
node scripts/test-controles.mjs
node scripts/test-cartas-regras.mjs
node scripts/test-catalogo-cartas.mjs
node scripts/test-sandbox-arvore.mjs
node scripts/test-texto-encaixe.mjs
node scripts/test-molduras.mjs
npm run build
node scripts/probe-teclas.mjs
node scripts/probe-cartas-novas.mjs
node scripts/probe-sandbox.mjs
node scripts/probe-cartas.mjs
node scripts/probe-mesa-texto.mjs
node scripts/probe-bomba.mjs
node scripts/probe-chain.mjs
node scripts/probe-stage2.mjs
node scripts/probe-stage4.mjs
node scripts/probe-f4-atalho-g.mjs
```
Expected: `TUDO OK` / sem `FALHA`. Uma sonda que falhar por depender do TIRO AUTOMÁTICO da F1 (a nave não mata o que matava): segure o Espaço nela — é a sonda que muda, não o jogo.

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "test(teclas): as sondas no mapa novo e a probe-teclas"
```

---

### Task 7: a documentação

**Files:**
- Modify: `docs/HANDOFF.md` (o 🧭: a frase de arranque e o ponto marcado)
- Modify: `docs/superpowers/plans/2026-10-02-cartas-sandbox-retomada-START.md` (a §2 "Como testar": as teclas)
- Modify: `docs/superpowers/specs/2026-10-03-mapa-de-teclas-design.md` (topo: "✅ implementada em 03/10")
- Modify: memória `mapa-de-teclas-pendente.md` → reescrever como "mapa de teclas FECHADO em 03/10" (Espaço/Shift/E/F, clássico Z/X/C/F, dev 1–6, tiro manual na F1; próximo: o menu de controles + áudio) e o ponteiro no `MEMORY.md`

- [ ] **Step 1:** no START de 02/10, a linha das teclas vira: `No jogo: **Espaço** tiro · **Shift** bomba · **E** dash · **F** flare · **ESC** montagem — dev: **1** onda · **2** limpar · **3** invulnerável · **4** medidas · **5** chefão · **6** mesa. Perfil clássico: `?teclas=classico` (Z/X/C/F).`
- [ ] **Step 2:** no 🧭, o 📍 ganha a linha de 03/10: o mapa de teclas fechado e implementado (spec + plano de 03/10), o tiro da F1 manual (a dificuldade da F1 vai para a calibragem) e o próximo passo: ele jogar a F1 e o sandbox; depois a arte aprovada das peças. Os itens novos do roadmap: **o menu de OPÇÕES (controles com remapeamento + áudio)** antes da 1.6.
- [ ] **Step 3: Commit**

```bash
git add docs/
git commit -m "docs(teclas): o mapa de teclas fechado — HANDOFF, START e a spec"
```
