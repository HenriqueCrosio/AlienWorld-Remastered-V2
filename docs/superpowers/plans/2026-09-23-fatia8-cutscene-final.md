# Fatia 8 · A Cutscene Final Refeita: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** refazer a `Interlude4Scene` ("O AFASTAMENTO") nos sete capítulos da spec
`docs/superpowers/specs/2026-09-23-fatia8-cutscene-final-design.md`: a câmara D convulsiona e
rasga, a descompressão arranca a nave, o Leviatã ferido cai sobre a colônia e a luz dele se apaga
depois do sobrevoo.

**Architecture:** a `Interlude4Scene` vira uma REGENTE, com a linha do tempo, a nave, o estado
para a sonda e o `GameOver`. Os capítulos moram em `src/scenes/final/`, cada módulo com uma função
`montarX(c: CenaFinal): Capitulo` que põe as coisas na tela e devolve `limpar()` para o corte do
próximo. A costura com a luta é uma **fotografia do último quadro do `GameScene`** (sem HUD e sem
nave), usada como fundo do capítulo 1. A arte vem do PixelLab pela REST v2 (`.env.pixellab`) e de
assadores em pixel na resolução nativa.

**Tech Stack:** Phaser 3.90, TypeScript 5.7, Vite 6, Playwright (sondas), sharp (assadores),
PixelLab REST v2 (`/inpaint-v3`, `/generate-image-v2`, `/animate-with-text-v3`,
`/objects/{id}/states`).

## Global Constraints

- **Dark sci-fi:** casco escuro e dessaturado, contraste baixo, **luz SÓ onde há energia** (lava, reentrada, motor).
- **Nenhum clarão lava a tela:** proibido `fx.flash`, `explodeBig` e `cameras.main.flash` nesta cena. `setTint` não repinta arte escura.
- **Efeito de cena é ASSADO em pixel** na resolução nativa, com a paleta do vizinho. Nada de `Graphics` vetorial em tempo de jogo.
- **Fundo pintado em 384×216, escala 1.** Reduzir pode, **AUMENTAR NUNCA** (`setScale > 1` em fundo pintado é proibido).
- **A lua não muda de escala dentro de um plano.** Lua grande só por CORTE.
- **Sem tecla de pular.** Nenhum `keydown` nesta cena.
- **O biomecânico é o Leviatã certo:** objeto PixelLab `f397793a-0e59-49e2-9853-848b674b3fd7`. Costelas, lava nas rachaduras, **sem dentes**.
- **PixelLab:** vocabulário de gore é barrado (descreva a MATÉRIA: *ruptured organic tissue, torn membrane, viscous dark fluid*); não repita um pedido recusado, mude-o; a fila de review é a biblioteca dele, e **nada se descarta em massa**.
- **Arte gerada: mostrar a folha (crua + em cena) antes de instalar.** Checkpoint marcado como `🛑 CHECKPOINT` em cada tarefa de arte.
- **Commits de autoria SÓ do Henrique:** sem linha `Co-Authored-By`. Remoto `origin` (V2); **nunca** `legacy`.
- **Dev server:** `npm run dev` em `http://localhost:5173/`. As sondas rodam contra ele.
- **Texto de tela em PT-BR**, com os textos exatos da spec: `KEPLER · A COLÔNIA MORTA`, `UM JOGO DE HENRIQUE CROSIO`.

---

## Mapa de arquivos

| Arquivo | Papel |
|---|---|
| `src/scenes/final/tempos.ts` (novo) | a linha do tempo (ms) — a única fonte dos tempos |
| `src/scenes/final/tipos.ts` (novo) | `CenaFinal`, `Capitulo`, `EstadoFinal` |
| `src/scenes/final/dentro.ts` (novo) | capítulos 1–3: convulsão, rasgo, descompressão |
| `src/scenes/final/fora.ts` (novo) | capítulo 4: a ferida |
| `src/scenes/final/queda.ts` (novo) | capítulo 5: a queda |
| `src/scenes/final/sobrevoo.ts` (novo) | capítulos 6–7: o sobrevoo e a luz que se apaga |
| `src/scenes/Interlude4Scene.ts` (reescrito) | a regente |
| `src/scenes/GameScene.ts` (`victory`) | a fotografia da costura + `naveX/naveY` no payload |
| `src/entities/fimDoPredador.ts` | exportar `SOBE_ACIMA_PX` |
| `src/scenes/BootScene.ts` | as chaves `f8*` novas; sair das `leviathanWhale*` |
| `src/systems/Fx.ts` | sair da anim `leviathan-dying` da baleia |
| `scripts/_f8/_pl.mjs` (novo) | cliente REST do PixelLab (post, poll, salvar) |
| `scripts/_f8/_paleta.mjs` (novo) | corrige a cor de uma arte para a paleta de uma referência |
| `scripts/_f8/_assar-convulsao.mjs` (novo) | P1 |
| `scripts/_f8/_gerar-rasgo.mjs` (novo) | P2 |
| `scripts/_f8/_assar-succao.mjs` (novo) | P3 |
| `scripts/_f8/_gerar-leviata.mjs` (novo) | P4 + P5 |
| `scripts/_f8/_gerar-queda.mjs` (novo) | P6 |
| `scripts/_f8/_gerar-sobrevoo.mjs` (novo) | P7 |
| `scripts/_f8/_assar-apagar.mjs` (novo) | P8 |
| `scripts/_f8/_ver-final.mjs` (novo) | folha por relógio de parede |
| `scripts/probe-interlude4.mjs` (reescrita) | a sonda da cena |
| `scripts/probe-stage4.mjs` | a costura e a duração nova |

---

### Task 1: A regente, a costura e o capítulo 1 (sem as rachaduras)

**Files:**
- Create: `src/scenes/final/tempos.ts`, `src/scenes/final/tipos.ts`, `src/scenes/final/dentro.ts`
- Rewrite: `src/scenes/Interlude4Scene.ts`
- Modify: `src/scenes/GameScene.ts` (método `victory`, perto da linha 1768), `src/entities/fimDoPredador.ts:44`
- Rewrite: `scripts/probe-interlude4.mjs`
- Modify: `scripts/probe-stage4.mjs:280-305`

**Interfaces:**
- Produces:
  - `T` (em `tempos.ts`): `{ RASGO, DESCOMPRESSAO, FERIDA, QUEDA, SOBREVOO, APAGA, FADE, FIM }` em ms.
  - `CenaFinal { scene; fx; nave; estado }`, `Capitulo { update?(dt); limpar() }`, `EstadoFinal` (em `tipos.ts`).
  - `montarDentro(c: CenaFinal, fundo: 'f8Costura' | 'paintBgF4d'): Capitulo` (em `dentro.ts`).
  - Na regente: `this.estado: EstadoFinal`, `this.ship: Phaser.GameObjects.Sprite`, `this.naveId: string` — é o que a sonda lê.
  - O payload do `GameScene` para a `Interlude4` ganha `naveX: number`, `naveY: number`, `costura: boolean`.

- [ ] **Step 1: Escrever a sonda nova (falha primeiro)**

Reescrever `scripts/probe-interlude4.mjs` inteiro:

```js
// A CUTSCENE FINAL REFEITA (Fatia 8, spec 2026-09-23): a câmara D convulsiona e rasga, a
// descompressão arranca a nave, o Leviatã ferido cai na lua, o sobrevoo espelha a Fase 1 e a luz
// dele se apaga. SONDA POR ESTADO (a lição de julho): cada trecho ESPERA o estado que vai assertar.
//
// ⚠️ Sem tecla de pular: a sonda espera a timeline real (~47s de CENA).
//
//   npm run dev  noutro terminal, depois  node scripts/probe-interlude4.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') console.log(`[console:error] ${m.text()}`);
});

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || s.scene.key !== 'Interlude4') return { cena: s?.scene.key ?? '?' };
    const tex = s.textures;
    return {
      cena: s.scene.key,
      ...s.estado,
      nave: { x: Math.round(s.ship.x), y: Math.round(s.ship.y), id: s.naveId, flipX: s.ship.flipX, visivel: s.ship.visible },
      baleias: ['leviathanWhale', 'leviathanWhaleDying', 'leviathanWhaleDyingSheet', 'leviathanWhaleSplit'].filter((k) => tex.exists(k)),
    };
  });

/** Espera a cena chegar no estado que o trecho vai assertar. Devolve a última amostra. */
const espera = async (rotulo, predicado, timeoutMs = 25000) => {
  const t0 = Date.now();
  let e = await estado();
  while (!predicado(e) && Date.now() - t0 < timeoutMs) {
    await page.waitForTimeout(250);
    e = await estado();
  }
  console.log(rotulo, JSON.stringify(e));
  return e;
};

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F'); // atalho dev: direto na CUTSCENE FINAL (sem costura: fundo = paintBgF4d)
await page.waitForTimeout(800);

// ─── CAPÍTULO 1 — CONVULSÃO: a câmara D, a nave onde o jogador parou ───
const c1 = await espera('cap 1    ', (e) => e.cena === 'Interlude4' && e.capitulo === 1, 8000);
ok(c1.cena === 'Interlude4', `a cena é a Interlude4 (${c1.cena})`);
ok(c1.capitulo === 1, `abre no capítulo 1 (capitulo=${c1.capitulo})`);
ok(c1.fundo === 'paintBgF4d', `pelo menu, o fundo é a pintura da câmara D (fundo=${c1.fundo})`);
ok(c1.nave?.id === 'alien', `a nave é a escolhida (id=${c1.nave?.id})`);
ok(c1.nave?.x === 120 && c1.nave?.y === 110, `a nave está na posição padrão do menu (${c1.nave?.x},${c1.nave?.y})`);
ok(c1.baleias?.length === 0, `nenhuma baleia errada carregada (${c1.baleias?.join(',')})`);
await page.screenshot({ path: 'probe-interlude4-cap1.png' });

// ─── [CAPÍTULOS 2–7 — cada tarefa do plano insere o seu bloco AQUI, em ordem] ───

// ─── O fim: a tela de vitória da FASE 4, com o crédito ───
await espera('fim      ', (e) => e.cena === 'GameOver', 70000);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const textos = s?.children.list.filter((c) => c.type === 'Text').map((c) => c.text) ?? [];
  return { cena: s?.scene.key, textos };
});
ok(fim.cena === 'GameOver', `a cutscene final fecha na tela de vitória (cena=${fim.cena})`);
ok(fim.textos.some((t) => t.includes('FASE 4 COMPLETA')), 'a vitória é a da FASE 4 (o título não mente)');
ok(fim.textos.some((t) => t.includes('UM JOGO DE HENRIQUE CROSIO')), 'o crédito do autor está no rodapé');

console.log(falhas === 0 ? '\n✔ CUTSCENE FINAL DE PONTA A PONTA' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar a sonda e ver falhar**

Run: `node scripts/probe-interlude4.mjs` (com `npm run dev` rodando noutro terminal)
Expected: FAIL — `✘ abre no capítulo 1 (capitulo=undefined)` e `✘ nenhuma baleia errada carregada (leviathanWhale,...)`.
(A última falha fica vermelha até a Task 9, que tira as baleias do `BootScene`.)

- [ ] **Step 3: Exportar a altura da crista da poça**

Em `src/entities/fimDoPredador.ts:44`, trocar `const SOBE_ACIMA_PX = 10;` por:

```ts
export const SOBE_ACIMA_PX = 10;
```

- [ ] **Step 4: Criar `src/scenes/final/tempos.ts`**

```ts
/**
 * A LINHA DO TEMPO DA CUTSCENE FINAL (ms, relógio da CENA) — spec 2026-09-23 §3. É a ÚNICA fonte dos
 * tempos: a regente agenda os capítulos por ela, e cada capítulo mede os beats internos a partir do
 * próprio início (`T.X - T.Y`). Mexer num tempo é mexer AQUI.
 */
export const T = {
  /** Capítulo 2: a parede da câmara D rasga (e a música morre). */
  RASGO: 5000,
  /** Capítulo 3: o vácuo puxa tudo, e a nave é arrancada. */
  DESCOMPRESSAO: 9500,
  /** Capítulo 4: o corte para fora — a ferida. */
  FERIDA: 13500,
  /** Capítulo 5: o corte para perto da lua — a queda. */
  QUEDA: 21000,
  /** Capítulo 6: a superfície — o sobrevoo. */
  SOBREVOO: 29000,
  /** Capítulo 7: a câmera para sobre a carcaça, e a lava esfria. */
  APAGA: 41000,
  /** O fade para o preto começa (a última placa já apagou). */
  FADE: 45600,
  /** O `GameOver`. */
  FIM: 47000,
} as const;
```

- [ ] **Step 5: Criar `src/scenes/final/tipos.ts`**

```ts
import type Phaser from 'phaser';
import type { Fx } from '../../systems/Fx';

/** O que a sonda lê da cena (`scene.estado`). Cada capítulo escreve o seu pedaço. */
export interface EstadoFinal {
  /** 1..7 — o capítulo na tela. */
  capitulo: number;
  /** A textura do fundo do capítulo 1: a fotografia da luta ou, pelo menu, a pintura da câmara D. */
  fundo: string | null;
  /** O quadro corrente da folha de rachaduras (capítulo 1), −1 antes de ela aparecer. */
  rachadura: number;
  /** O quadro corrente da folha do rasgo (capítulo 2), −1 antes. */
  rasgo: number;
  /** true a partir do instante em que a música é cortada. */
  musicaCortada: boolean;
  /** A escala da lua a cada quadro do capítulo 4 (a sonda cobra que é UMA só). */
  escalasLua: number[];
  /** x da carcaça no sobrevoo, amostrado — a sonda cobra que o mundo anda para a DIREITA. */
  carcacaX: number | null;
  /** O alfa da camada de lava da carcaça (capítulo 7): 1 acesa, 0 apagada. */
  lavaCarcaca: number | null;
}

/** O que todo capítulo recebe da regente. */
export interface CenaFinal {
  scene: Phaser.Scene;
  fx: Fx;
  /** A nave que ELE escolheu — uma só, que atravessa os capítulos. */
  nave: Phaser.GameObjects.Sprite;
  estado: EstadoFinal;
}

/** Um capítulo montado. `limpar` destrói tudo o que ele pôs na tela: é o corte do próximo. */
export interface Capitulo {
  update?(dt: number): void;
  limpar(): void;
}

/** Profundidades da cena, comuns aos capítulos. */
export const DEPTH = {
  FUNDO: 0,
  CENARIO: 10,
  EFEITO: 40,
  NAVE: 80,
  FRENTE: 90,
  TEXTO: 100,
} as const;
```

- [ ] **Step 6: Criar `src/scenes/final/dentro.ts` (só o capítulo 1)**

```ts
import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { Predador } from '../../entities/Predador';
import { SOBE_ACIMA_PX } from '../../entities/fimDoPredador';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * DENTRO — capítulos 1 a 3 (spec §3). Abre NA CÂMARA D, sem corte: o fundo é a fotografia do último
 * quadro da luta (`f8Costura`) ou, pelo menu, a pintura dela (`paintBgF4d`). A poça do fim do predador
 * continua VIVA por cima, na mesma altura em que o `afundarNaLava` a deixou — é o que esconde a troca.
 */

/** A crista da poça: a mesma conta do `afundarNaLava` (superfície + o que ela sobe acima dela). */
const CRISTA = Predador.CHAO_APOIO - SOBE_ACIMA_PX;
const LAVA_QUADRO_MS = 110;

export function montarDentro(c: CenaFinal, fundo: 'f8Costura' | 'paintBgF4d'): Capitulo {
  const { scene, nave, estado } = c;
  const objetos: Phaser.GameObjects.GameObject[] = [];
  estado.capitulo = 1;
  estado.fundo = fundo;

  objetos.push(scene.add.image(0, 0, fundo).setOrigin(0, 0).setDepth(DEPTH.FUNDO));

  // A POÇA VIVA — o mesmo TileSprite do fim do predador, parado na crista.
  const poca = scene.add
    .tileSprite(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT - CRISTA, 'f4LavaSheet', 0)
    .setOrigin(0, 1)
    .setDepth(DEPTH.CENARIO);
  objetos.push(poca);
  let quadro = 0;
  const lava = scene.time.addEvent({
    delay: LAVA_QUADRO_MS,
    loop: true,
    callback: () => {
      quadro = (quadro + 1) % 8;
      poca.setFrame(quadro);
    },
  });

  // O TREMOR CRESCE em três degraus até o rasgo: o bicho morrendo em volta da nave.
  const cam = scene.cameras.main;
  cam.shake(1600, 0.002);
  scene.time.delayedCall(1600, () => cam.shake(1600, 0.004));
  scene.time.delayedCall(3200, () => cam.shake(T.RASGO - 3200, 0.007));

  // O FLUIDO escorrendo do teto — gotas escuras, uma a uma, sem aditivo (não é luz).
  const gotas = scene.add
    .particles(0, 0, 'puff', {
      x: { min: 20, max: GAME_WIDTH - 20 },
      y: -4,
      lifespan: 1400,
      speedY: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0.3 },
      tint: [0x3a0508, 0x5a0a10],
      frequency: 180,
    })
    .setDepth(DEPTH.EFEITO);
  objetos.push(gotas);

  // A nave TREME no lugar: o jogador já não a controla.
  const baseY = nave.y;
  let t = 0;

  return {
    update(dt: number) {
      t += dt;
      const k = Math.min(1, (t * 1000) / T.RASGO);
      nave.y = baseY + Math.sin(t * 22) * (0.5 + 1.5 * k);
    },
    limpar() {
      lava.remove();
      objetos.forEach((o) => o.destroy());
    },
  };
}
```

- [ ] **Step 7: Reescrever `src/scenes/Interlude4Scene.ts` (a regente)**

```ts
import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { SHIPS, DEFAULT_SHIP } from '../ships';
import type { HandlingMode } from './GameScene';
import { T } from './final/tempos';
import { DEPTH, type CenaFinal, type Capitulo, type EstadoFinal } from './final/tipos';
import { montarDentro } from './final/dentro';

/**
 * O AFASTAMENTO — a cutscene FINAL, refeita na Fatia 8 (spec 2026-09-23-fatia8-cutscene-final-design.md).
 *
 * VITÓRIA AMARGA (decisão de 20/07, reafirmada em 23/09): a colônia já estava morta; a campanha foi
 * vingança. Agora ela é VISCERAL (pedido dele): o bicho se abre em volta da nave, jorra no vácuo, cai
 * sobre a colônia e a luz dele se apaga em cima dela.
 *
 * Esta classe é a REGENTE: a linha do tempo (`final/tempos.ts`), a nave, o estado da sonda e o
 * `GameOver`. Os capítulos moram em `src/scenes/final/`, e cada um devolve `limpar()` — o corte.
 *
 * ⚠️ SEM TECLA DE PULAR — o jogador chega da luta martelando o ESPAÇO.
 */
export class Interlude4Scene extends Phaser.Scene {
  private fx!: Fx;
  private ship!: Phaser.GameObjects.Sprite;
  private cena!: CenaFinal;
  private capitulo: Capitulo | null = null;

  /** Lido pela sonda. */
  private estado!: EstadoFinal;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  private faseConcluida = 4;
  private practice = false;
  private baseScore = 0;
  private done = false;

  constructor() {
    super('Interlude4');
  }

  create(data: {
    score?: number;
    handling?: HandlingMode;
    ship?: string;
    stage?: number | null;
    stageDone?: number;
    practice?: boolean;
    baseScore?: number;
    /** Onde a nave estava no último quadro da luta (a costura). Pelo menu: o padrão. */
    naveX?: number;
    naveY?: number;
    /** true quando o `GameScene` deixou a fotografia do último quadro em `f8Costura`. */
    costura?: boolean;
  }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.faseConcluida = data.stageDone ?? 4;
    this.practice = data.practice ?? false;
    this.baseScore = data.baseScore ?? 0;
    this.done = false;
    this.capitulo = null;
    this.estado = {
      capitulo: 0,
      fundo: null,
      rachadura: -1,
      rasgo: -1,
      musicaCortada: false,
      escalasLua: [],
      carcacaX: null,
      lavaCarcaca: null,
    };

    resetVariantCache();
    this.fx = new Fx(this);

    const nave = SHIPS[this.naveId];
    const naveTex = this.textures.exists(nave.texture) ? nave.texture : 'ship';
    this.ship = this.add
      .sprite(Math.round(data.naveX ?? 120), Math.round(data.naveY ?? 110), naveTex)
      .setDepth(DEPTH.NAVE);
    const naveAnim = naveTex === nave.texture ? (nave.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(naveAnim)) this.ship.play(naveAnim);

    this.cena = { scene: this, fx: this.fx, nave: this.ship, estado: this.estado };

    const costura = data.costura === true && this.textures.exists('f8Costura');
    this.troca(montarDentro(this.cena, costura ? 'f8Costura' : 'paintBgF4d'));
    this.placar();

    this.time.delayedCall(T.FADE, () => {
      if (!this.done) this.cameras.main.fadeOut(T.FIM - T.FADE, 0, 0, 0);
    });
    this.time.delayedCall(T.FIM, () => this.terminar());
  }

  /** O CORTE: o capítulo que sai limpa a tela dele, e o novo entra. */
  private troca(novo: Capitulo): void {
    this.capitulo?.limpar();
    this.capitulo = novo;
  }

  /** Agenda um capítulo no instante `ms` da cena. */
  private aos(ms: number, montar: () => Capitulo): void {
    this.time.delayedCall(ms, () => {
      if (!this.done) this.troca(montar());
    });
  }

  override update(_time: number, delta: number): void {
    this.capitulo?.update?.(delta / 1000);
  }

  private placar(): void {
    const banda = this.add.rectangle(0, 64, GAME_WIDTH, 78, COLORS.bgDeep, 0.72).setOrigin(0, 0).setDepth(DEPTH.TEXTO - 1);
    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(DEPTH.TEXTO);
    const linhas = [
      t(74, 'FASE 4 · O INTERIOR', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];
    // Sai ANTES do rasgo: o placar não pode estar na tela quando a parede abre.
    this.tweens.add({
      targets: [banda, ...linhas],
      alpha: 0,
      duration: 700,
      delay: 2200,
      onComplete: () => {
        banda.destroy();
        linhas.forEach((l) => l.destroy());
      },
    });
  }

  /** O fim da campanha, com o MESMO payload que a GameScene montaria. */
  private terminar(): void {
    if (this.done) return;
    this.done = true;
    this.capitulo?.limpar();
    this.scene.start('GameOver', {
      score: this.score,
      handling: this.handling,
      practice: this.practice,
      victory: true,
      stage: this.faseConcluida,
      ship: this.naveId,
      baseScore: this.baseScore,
    });
  }
}
```

(`aos` fica sem uso até a Task 3. Se o `tsc` reclamar de membro privado não usado, ele não reclama: `noUnusedLocals` não cobre membros de classe. Confira com o Step 9.)

- [ ] **Step 8: A fotografia da costura no `GameScene`**

Em `src/scenes/GameScene.ts`, no `victory()`, trocar o bloco `if (interlude) { this.scene.start(interlude, {...}); return; }` por:

```ts
    if (interlude) {
      const payload = {
        // A fase SEGUINTE (null na final — a Interlude4 sabe que não há próxima) e a
        // COMPLETADA (é com ela que a interlude final monta o GameOver).
        stage: next,
        stageDone: this.stage.id,
        handling: this.handling,
        // O total corrido viaja como `score`: a próxima fase soma o dela por cima (scoreBase).
        score: this.totalScore(),
        ship: this.shipId,
        // A interlude final entrega o GameOver — ela precisa do checkpoint e do treino
        // para montar o MESMO payload que esta cena montaria.
        practice: this.practice,
        baseScore: this.scoreBase,
        // A COSTURA DA CUTSCENE FINAL (Fatia 8): onde a nave estava no último quadro.
        naveX: this.ship.x,
        naveY: this.ship.y,
      };
      if (interlude === 'Interlude4') {
        this.fotografarCostura(() => this.scene.start(interlude, { ...payload, costura: true }));
        return;
      }
      this.scene.start(interlude, payload);
      return;
    }
```

E acrescentar o método logo depois de `victory()`:

```ts
  /**
   * A COSTURA DA CUTSCENE FINAL (spec 2026-09-23 §5): a cena abre NA câmara D, sem corte. Esconde o HUD
   * (depth ≥ 100) e a nave, fotografa o próximo quadro e guarda em `f8Costura` — a pintura, a borda e a
   * lava exatamente como o jogador as deixou. A nave volta como sprite da cutscene, no mesmo lugar.
   */
  private fotografarCostura(pronto: () => void): void {
    for (const o of this.children.list) {
      if (o.depth >= 100 && 'setVisible' in o) (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false);
    }
    this.ship.setVisible(false);
    this.game.renderer.snapshot((img) => {
      if (img instanceof HTMLImageElement) {
        if (this.textures.exists('f8Costura')) this.textures.remove('f8Costura');
        this.textures.addImage('f8Costura', img);
      }
      pronto();
    });
  }
```

- [ ] **Step 9: Typecheck**

Run: `npm run typecheck`
Expected: sem erros. Se reclamar de import sem uso no `GameScene` ou na regente, remova o import (a regente velha importava `Starfield`, `Parallax` e `Music`; a nova não).

- [ ] **Step 10: Rodar a sonda**

Run: `node scripts/probe-interlude4.mjs`
Expected: `✔` em todos, **exceto** `✘ nenhuma baleia errada carregada` (fica para a Task 9). A cena chega ao `GameOver` depois de ~47s de preto (os capítulos 2–7 ainda não existem).

- [ ] **Step 11: A costura na `probe-stage4`**

Em `scripts/probe-stage4.mjs`, logo depois de `ok(meio.cena === 'Interlude4', ...)`, inserir:

```js
// A COSTURA (Fatia 8): a cutscene abre na FOTOGRAFIA do último quadro da luta, com a nave no mesmo lugar.
const costura = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const src = s.textures.exists('f8Costura') ? s.textures.get('f8Costura').getSourceImage() : null;
  return { fundo: s.estado?.fundo, w: src?.width, h: src?.height };
});
console.log('costura  ', JSON.stringify(costura));
ok(costura.fundo === 'f8Costura', `a cutscene abre na fotografia da luta (fundo=${costura.fundo})`);
ok(costura.w === 384 && costura.h === 216, `a fotografia tem a resolução nativa (${costura.w}×${costura.h})`);
```

E trocar o laço de espera `for (let i = 0; i < 55; i++)` por `for (let i = 0; i < 65; i++)` (a cena passou de ~42s para ~47s).

⚠️ Se a fotografia sair maior que 384×216 (o `Scale.FIT` pode dar ao canvas o tamanho da janela), use no `fotografarCostura` o `snapshotArea(0, 0, GAME_WIDTH * zoom, GAME_HEIGHT * zoom, ...)` e reduza para 384×216 com `textures.createCanvas` + `drawImage`. Não afrouxe o assert.

- [ ] **Step 12: Rodar a `probe-stage4`**

Run: `node scripts/probe-stage4.mjs`
Expected: `✔ FASE 4 DE PONTA A PONTA (com o PREDADOR)`. Abrir `probe-stage4-cutscene-final.png` e conferir: a câmara D com a borda e a lava, **sem HUD**, a nave no lugar.

- [ ] **Step 13: Commit**

```bash
git add src/scenes/final src/scenes/Interlude4Scene.ts src/scenes/GameScene.ts src/entities/fimDoPredador.ts scripts/probe-interlude4.mjs scripts/probe-stage4.mjs
git commit -m "feat(f8): a regente da cutscene final e a costura — ela abre NA câmara D, na fotografia da luta"
```

---

### Task 2: P1 — as rachaduras da convulsão (assadas) no capítulo 1

**Files:**
- Create: `scripts/_f8/_assar-convulsao.mjs` → `public/sprites/f8-convulsao-sheet.png`
- Modify: `src/scenes/BootScene.ts` (tabela `SHEETS`, perto da linha 357), `src/scenes/final/dentro.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `montarDentro`, `EstadoFinal.rachadura` (Task 1).
- Produces: textura `f8ConvulsaoSheet` (8 quadros de 384×216, transparente).

- [ ] **Step 1: O assert (falha primeiro)**

No `probe-interlude4.mjs`, logo antes de `await page.screenshot({ path: 'probe-interlude4-cap1.png' });`, inserir:

```js
const c1b = await espera('cap 1 rachas', (e) => (e.rachadura ?? -1) >= 5, 8000);
ok(c1b.rachadura >= 5, `as rachaduras avançam pela pintura (quadro=${c1b.rachadura})`);
```

Run: `node scripts/probe-interlude4.mjs` → Expected: `✘ as rachaduras avançam pela pintura (quadro=-1)`.

- [ ] **Step 2: O assador**

Criar `scripts/_f8/_assar-convulsao.mjs`:

```js
// P1 · AS RACHADURAS DA CONVULSÃO (Fatia 8, capítulo 1) — assadas em pixel, 384×216, escala 1.
// A paleta sai da PRÓPRIA câmara D (`paint-bg-f4-d.png`): o núcleo da racha é o escuro dela, a borda é
// o vermelho dela e só o fio do meio acende (lava) — a lei do dark sci-fi: luz só onde há energia.
//
//   node scripts/_f8/_assar-convulsao.mjs
//
// Sai: public/sprites/f8-convulsao-sheet.png  (8 quadros × 384×216, lado a lado; o quadro k contém as
// rachaduras dos estágios 0..k — elas só crescem)
import sharp from 'sharp';

const W = 384, H = 216, N = 8;
const P = { nucleo: [6, 2, 4], borda: [58, 8, 12], brasa: [132, 20, 14], fio: [226, 92, 30] };

// Aleatório determinístico: a mesma folha a cada rodada (a sonda fotografa).
let semente = 20260923;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

/** Uma racha: passeio que ramifica. Devolve os pontos por estágio (em que estágio cada pixel nasce). */
const rachas = [];
const semear = (x, y, ang, vida, estagio) => {
  for (let i = 0; i < vida; i++) {
    ang += (rnd() - 0.5) * 0.7;
    x += Math.cos(ang);
    y += Math.sin(ang);
    if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return;
    const e = Math.min(N - 1, estagio + Math.floor((i / vida) * 3));
    rachas.push({ x: Math.round(x), y: Math.round(y), e, grossa: i < vida * 0.4 });
    if (rnd() < 0.035 && vida > 20) semear(x, y, ang + (rnd() < 0.5 ? 1 : -1) * (0.6 + rnd() * 0.6), Math.floor(vida * 0.5), e);
  }
};
// As rachas nascem nas PAREDES (não no núcleo do meio) e correm para as bordas — o bicho se partindo por fora.
for (let k = 0; k < 14; k++) {
  const lado = k % 2 === 0 ? 40 + rnd() * 90 : 250 + rnd() * 110;
  semear(lado, 20 + rnd() * 150, rnd() * Math.PI * 2, 60 + Math.floor(rnd() * 90), Math.floor(k / 3));
}

const folha = Buffer.alloc(W * N * H * 4, 0);
const por = (q, x, y, cor, a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W * N + q * W + x) * 4;
  if (folha[i + 3] >= a) return;
  folha[i] = cor[0]; folha[i + 1] = cor[1]; folha[i + 2] = cor[2]; folha[i + 3] = a;
};
for (let q = 0; q < N; q++) {
  for (const p of rachas) {
    if (p.e > q) continue;
    // a borda (sombra vermelha) → o núcleo escuro → o fio aceso, só nas rachas grossas e maduras
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) por(q, p.x + dx, p.y + dy, P.borda, 200);
    por(q, p.x, p.y, P.nucleo);
    if (p.grossa && q - p.e >= 2) por(q, p.x, p.y, (p.x + p.y) % 3 === 0 ? P.fio : P.brasa);
  }
}
await sharp(folha, { raw: { width: W * N, height: H, channels: 4 } }).png().toFile('public/sprites/f8-convulsao-sheet.png');
console.log('f8-convulsao-sheet.png', W * N, 'x', H, '·', rachas.length, 'pontos de racha');
```

Run: `node scripts/_f8/_assar-convulsao.mjs`
Expected: `f8-convulsao-sheet.png 3072 x 216 · <n> pontos de racha`.

- [ ] **Step 3: Registrar no `BootScene`**

Na tabela `SHEETS` de `src/scenes/BootScene.ts`, depois da linha do `f4LavaSheet`:

```ts
  // FATIA 8 · A CUTSCENE FINAL. P1: as rachaduras da convulsão, assadas com a paleta da câmara D
  // (`scripts/_f8/_assar-convulsao.mjs`). 8 estágios cumulativos sobre a pintura inteira.
  f8ConvulsaoSheet: { path: 'sprites/f8-convulsao-sheet.png', w: 384, h: 216 },
```

- [ ] **Step 4: A folha no capítulo 1**

Em `src/scenes/final/dentro.ts`, depois do bloco da poça (antes do `// O TREMOR CRESCE`), inserir:

```ts
  // AS RACHADURAS (P1): a PINTURA rachando, estágio a estágio, até o rasgo. Por cima do fundo, atrás da poça.
  const rachas = scene.add.image(0, 0, 'f8ConvulsaoSheet', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  objetos.push(rachas);
  estado.rachadura = 0;
  scene.tweens.addCounter({
    from: 0,
    to: 7.99,
    duration: T.RASGO - 400,
    ease: 'Quad.easeIn',
    onUpdate: (tw) => {
      const q = Math.floor(tw.getValue() ?? 0);
      if (q !== estado.rachadura) {
        estado.rachadura = q;
        rachas.setFrame(q);
      }
    },
  });
```

- [ ] **Step 5: Sonda, olho e checkpoint**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs`
Expected: o novo `✔ as rachaduras avançam pela pintura (quadro=5..7)`.

Montar a folha para ele: `probe-interlude4-cap1.png` + a folha crua ampliada 2×:
`node -e "require('sharp')('public/sprites/f8-convulsao-sheet.png').resize(6144,432,{kernel:'nearest'}).toFile('docs/superpowers/folhas/2026-09-23/p1-convulsao-crua.png')"`

🛑 **CHECKPOINT:** mostrar `p1-convulsao-crua.png` e `probe-interlude4-cap1.png`. O critério é que *lê como a PINTURA rachando, não como traço por cima*. Se ele reprovar, ajustar a paleta, a espessura ou a quantidade no assador e rodar de novo, **sem mexer no código da cena**.

- [ ] **Step 6: Commit**

```bash
git add scripts/_f8/_assar-convulsao.mjs public/sprites/f8-convulsao-sheet.png src/scenes/BootScene.ts src/scenes/final/dentro.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p1-convulsao-crua.png
git commit -m "feat(f8): a câmara D racha — as rachaduras da convulsão assadas com a paleta dela"
```

---

### Task 3: P2 — o rasgo da parede e o corte da música (capítulo 2)

**Files:**
- Create: `scripts/_f8/_pl.mjs`, `scripts/_f8/_paleta.mjs`, `scripts/_f8/_gerar-rasgo.mjs` → `public/sprites/f8-rasgo-sheet.png`
- Modify: `src/scenes/BootScene.ts`, `src/scenes/final/dentro.ts`, `src/scenes/Interlude4Scene.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `T.RASGO`, `EstadoFinal.rasgo`, `EstadoFinal.musicaCortada`.
- Produces: `scripts/_f8/_pl.mjs` exporta `b64(path)`, `tamanho(path)`, `gerar(endpoint, body) → Promise<Buffer[]>`. `scripts/_f8/_paleta.mjs` exporta `paletaDe(refPath, max = 48) → Promise<number[][]>` e `naPaleta(buf, paleta) → Promise<Buffer>`. Textura `f8RasgoSheet` (quadros de `RASGO_W × RASGO_H`) e as constantes `RASGO_X`, `RASGO_Y` em `dentro.ts`.

- [ ] **Step 1: O assert (falha primeiro)**

No `probe-interlude4.mjs`, no marcador `// ─── [CAPÍTULOS 2–7 ...`, inserir logo abaixo:

```js
// ─── CAPÍTULO 2 — O RASGO: a parede abre, e a música morre ───
const c2 = await espera('cap 2    ', (e) => e.capitulo === 2 && (e.rasgo ?? -1) >= 3, 15000);
ok(c2.capitulo === 2, `o rasgo começou (capitulo=${c2.capitulo})`);
ok(c2.rasgo >= 3, `a parede está abrindo (quadro=${c2.rasgo})`);
ok(c2.musicaCortada === true, 'a música MORRE no rasgo');
await page.screenshot({ path: 'probe-interlude4-cap2.png' });
```

Run → Expected: `✘ o rasgo começou (capitulo=1)`.

- [ ] **Step 2: O cliente REST `scripts/_f8/_pl.mjs`**

```js
// O CLIENTE DO PIXELLAB DA FATIA 8 (REST v2). A chave fica em `.env.pixellab` (gitignored).
// `gerar` posta, espera o job e devolve os PNGs (Buffer[]) — quadro a quadro, na ordem.
import fs from 'node:fs';
import sharp from 'sharp';

const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
if (!TOKEN) throw new Error('PIXELLAB_SECRET não encontrada em .env.pixellab');
const API = 'https://api.pixellab.ai/v2';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export const b64 = (arq) => ({
  type: 'base64',
  base64: `data:image/png;base64,${(Buffer.isBuffer(arq) ? arq : fs.readFileSync(arq)).toString('base64')}`,
  format: 'png',
});
export const tamanho = async (arq) => {
  const m = await sharp(arq).metadata();
  return { width: m.width, height: m.height };
};

export async function gerar(endpoint, body) {
  const r = await fetch(API + endpoint, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${endpoint} HTTP ${r.status} — ${JSON.stringify(j).slice(0, 400)}`);
  const id = j.background_job_id ?? j.job_id ?? j.id;
  fs.writeFileSync('scripts/_f8/_ultimo-job.txt', `${endpoint} ${id}\n`); // o job não se perde num timeout
  process.stdout.write(`${endpoint} ${id} `);
  for (let i = 0; i < 240; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const job = await (await fetch(`${API}/background-jobs/${id}`, { headers: H })).json();
    if (job.status === 'completed') {
      const lr = job.last_response ?? {};
      const imgs = lr.images ?? (lr.image ? [lr.image] : []);
      console.log(`✔ ${imgs.length} imagem(ns), ${job.usage?.generations ?? '?'} gerações`);
      return imgs.map((im) => Buffer.from(String(im.base64).replace(/^data:[^,]+,/, ''), 'base64'));
    }
    if (job.status === 'failed') throw new Error(`job ${id} falhou: ${JSON.stringify(job).slice(0, 400)}`);
    process.stdout.write('.');
  }
  throw new Error(`job ${id}: tempo esgotado (ele segue rodando no PixelLab — ver _ultimo-job.txt)`);
}
```

- [ ] **Step 3: A correção de paleta `scripts/_f8/_paleta.mjs`**

```js
// PÕE UMA ARTE NA PALETA DE UMA REFERÊNCIA (cor mais próxima, sem dither). O PixMiniMax e a v3 CLAREIAM —
// é a regra do projeto corrigir cada clipe para a paleta do vizinho antes de instalar.
import sharp from 'sharp';

/** As até `max` cores da referência (quantização do próprio sharp). */
export async function paletaDe(refPath, max = 48) {
  const { data, info } = await sharp(refPath).removeAlpha().png({ palette: true, colors: max }).toBuffer({ resolveWithObject: true })
    .then(({ data }) => sharp(data).raw().toBuffer({ resolveWithObject: true }));
  const vistas = new Map();
  for (let i = 0; i < data.length; i += info.channels) vistas.set(`${data[i]},${data[i + 1]},${data[i + 2]}`, [data[i], data[i + 1], data[i + 2]]);
  return [...vistas.values()];
}

/** Cada pixel opaco vai para a cor mais próxima da paleta; o alfa fica. Devolve PNG. */
export async function naPaleta(buf, paleta) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let melhor = paleta[0], d0 = Infinity;
    for (const c of paleta) {
      const d = (c[0] - data[i]) ** 2 + (c[1] - data[i + 1]) ** 2 + (c[2] - data[i + 2]) ** 2;
      if (d < d0) { d0 = d; melhor = c; }
    }
    data[i] = melhor[0]; data[i + 1] = melhor[1]; data[i + 2] = melhor[2];
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
```

- [ ] **Step 4: O gerador do rasgo `scripts/_f8/_gerar-rasgo.mjs`**

```js
// P2 · O RASGO DA PAREDE (capítulo 2). O quadro FINAL já existe: o inpaint aprovado sobre a câmara D
// real (`docs/superpowers/folhas/2026-09-23/conceito-2-rasgo-22.png`, máscara `mask-rasgo.png`). Aqui:
//   1. o recorte = a caixa da máscara (cabe nos 256 do animate-with-text-v3);
//   2. a v3 anima do recorte INTACTO da câmara D até o recorte RASGADO (first_frame → last_frame);
//   3. cada quadro vai para a paleta da câmara D e ganha a MÁSCARA como alfa — fora do rasgo, a
//      pintura de baixo continua sendo a de baixo (casa pixel a pixel).
//
//   node scripts/_f8/_gerar-rasgo.mjs [seed]
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const seed = Number(process.argv[2] ?? 7);

// 1 · a caixa da máscara (branco = rasgo), com 2px de folga
const { data: m, info: mi } = await sharp(`${F}/mask-rasgo.png`).greyscale().raw().toBuffer({ resolveWithObject: true });
let x0 = mi.width, y0 = mi.height, x1 = 0, y1 = 0;
for (let y = 0; y < mi.height; y++) for (let x = 0; x < mi.width; x++) if (m[y * mi.width + x] > 127) {
  x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
}
x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(383, x1 + 2); y1 = Math.min(215, y1 + 2);
const caixa = { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
console.log('caixa do rasgo', caixa);

const inteira = await sharp('public/sprites/paint-bg-f4-d.png').extract(caixa).png().toBuffer();
const rasgada = await sharp(`${F}/conceito-2-rasgo-22.png`).extract(caixa).png().toBuffer();

// 2 · a animação entre os dois
const quadros = await gerar('/animate-with-text-v3', {
  first_frame: b64(inteira),
  last_frame: b64(rasgada),
  action: 'the organic wall slowly tears open from the middle: membranes stretch thin and snap, ribs bend and splay outward, the tear widens to reveal black space, glowing lava seeping along the torn edges',
  frame_count: 8,
  seed,
  no_background: false,
});

// 3 · paleta da câmara D + a máscara como alfa; o 1º quadro é o intacto, o último é o aprovado
const paleta = await paletaDe('public/sprites/paint-bg-f4-d.png', 64);
const alfa = await sharp(`${F}/mask-rasgo.png`).extract(caixa).greyscale().raw().toBuffer();
const todos = [inteira, ...quadros.slice(1), rasgada]; // o índice 0 da v3 é a própria entrada
const prontos = [];
for (const q of todos) {
  const cor = await naPaleta(await sharp(q).resize(caixa.width, caixa.height, { kernel: 'nearest' }).png().toBuffer(), paleta);
  const { data, info } = await sharp(cor).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < alfa.length; i++) data[i * 4 + 3] = alfa[i] > 127 ? 255 : 0;
  prontos.push(await sharp(data, { raw: info }).png().toBuffer());
}
const W = caixa.width, H = caixa.height;
await sharp({ create: { width: W * prontos.length, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(prontos.map((input, i) => ({ input, left: i * W, top: 0 })))
  .png()
  .toFile('public/sprites/f8-rasgo-sheet.png');
fs.writeFileSync('scripts/_f8/_rasgo-caixa.json', JSON.stringify({ ...caixa, quadros: prontos.length }));
console.log(`f8-rasgo-sheet.png: ${prontos.length} quadros de ${W}×${H} — RASGO_X=${caixa.left} RASGO_Y=${caixa.top}`);
```

Run: `node scripts/_f8/_gerar-rasgo.mjs`
Expected: `f8-rasgo-sheet.png: <9 ou 10> quadros de <W>×<H> — RASGO_X=<n> RASGO_Y=<n>`. Anotar W, H, RASGO_X, RASGO_Y e o número de quadros (também em `scripts/_f8/_rasgo-caixa.json`).

- [ ] **Step 5: 🛑 CHECKPOINT — a folha do rasgo**

`node -e "const s=require('sharp');s('public/sprites/f8-rasgo-sheet.png').metadata().then(m=>s('public/sprites/f8-rasgo-sheet.png').resize(m.width*2,m.height*2,{kernel:'nearest'}).toFile('docs/superpowers/folhas/2026-09-23/p2-rasgo-crua.png'))"`

Mostrar a ele. O critério: *o último quadro casa pixel a pixel com a pintura em volta*, e o movimento é de RASGAR, não de dissolver. Reprovado: rodar de novo com outra seed (`node scripts/_f8/_gerar-rasgo.mjs 21`), e mudar o `action` se duas seeds falharem.

- [ ] **Step 6: Registrar no `BootScene`**

Na tabela `SHEETS`, abaixo do `f8ConvulsaoSheet` (usar W e H do Step 4):

```ts
  // P2: o rasgo da parede da câmara D (v3 do recorte intacto ao inpaint aprovado; a máscara é o alfa).
  f8RasgoSheet: { path: 'sprites/f8-rasgo-sheet.png', w: /* W do Step 4 */ 0, h: /* H do Step 4 */ 0 },
```

⚠️ Substituir os dois `0` pelos números do Step 4 **antes** de salvar: com `w: 0`, o Phaser não fatia a folha.

- [ ] **Step 7: O capítulo 2 em `dentro.ts`**

No topo de `dentro.ts`, depois de `LAVA_QUADRO_MS`, acrescentar (com os números do Step 4):

```ts
/** A caixa do rasgo na tela (a caixa da máscara — `scripts/_f8/_rasgo-caixa.json`). */
const RASGO_X = 0; // ← caixa.left
const RASGO_Y = 0; // ← caixa.top
const RASGO_QUADROS = 0; // ← quadros
```

E acrescentar `import { Music } from '../../systems/Music';` aos imports. Dentro de `montarDentro`, antes do `return`, inserir:

```ts
  // ─── CAPÍTULO 2 · O RASGO (T.RASGO) ───
  const rasgo = scene.add.image(RASGO_X, RASGO_Y, 'f8RasgoSheet', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 2).setVisible(false);
  objetos.push(rasgo);
  scene.time.delayedCall(T.RASGO, () => {
    estado.capitulo = 2;
    estado.rasgo = 0;
    rasgo.setVisible(true);
    scene.tweens.addCounter({
      from: 0,
      to: RASGO_QUADROS - 0.01,
      duration: T.DESCOMPRESSAO - T.RASGO - 800,
      ease: 'Cubic.easeIn', // resiste, e então CEDE
      onUpdate: (tw) => {
        const q = Math.floor(tw.getValue() ?? 0);
        if (q === estado.rasgo) return;
        estado.rasgo = q;
        rasgo.setFrame(q);
        // A MÚSICA MORRE quando a parede cede de verdade (o vácuo entrando) — corte, não fade longo.
        if (q >= 3 && !estado.musicaCortada) {
          estado.musicaCortada = true;
          Music.stop(scene, 120);
        }
      },
    });
  });
```

- [ ] **Step 8: Sonda**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs`
Expected: `✔` no bloco do capítulo 2. Conferir `probe-interlude4-cap2.png`: o rasgo no lugar certo, sem emenda.

- [ ] **Step 9: Commit**

```bash
git add scripts/_f8/_pl.mjs scripts/_f8/_paleta.mjs scripts/_f8/_gerar-rasgo.mjs scripts/_f8/_rasgo-caixa.json public/sprites/f8-rasgo-sheet.png src/scenes/BootScene.ts src/scenes/final/dentro.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p2-rasgo-crua.png
git commit -m "feat(f8): a parede da câmara D rasga para o vácuo — e a música morre no rasgo"
```

---

### Task 4: P3 — a descompressão (capítulo 3) e a folha em movimento

**Files:**
- Create: `scripts/_f8/_assar-succao.mjs` → `public/sprites/f8-succao-sheet.png`; `scripts/_f8/_ver-final.mjs`
- Modify: `src/scenes/BootScene.ts`, `src/scenes/final/dentro.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `RASGO_X/RASGO_Y` e a caixa do rasgo (Task 3), `T.DESCOMPRESSAO`, `T.FERIDA`.
- Produces: `f8SuccaoSheet` (6 quadros de 16×16: 0–1 rastros de fluido, 2 gota de lava, 3 tendão, 4 lasca de osso, 5 naco de tecido). `scripts/_f8/_ver-final.mjs <ms,...> <saida.png>` fotografa a cena pelos instantes de relógio de parede pedidos.

- [ ] **Step 1: O assert (falha primeiro)**

Inserir depois do bloco do capítulo 2:

```js
// ─── CAPÍTULO 3 — DESCOMPRESSÃO: tudo é sugado, a nave é arrancada girando ───
const c3 = await espera('cap 3    ', (e) => e.capitulo === 3, 12000);
ok(c3.capitulo === 3, `a descompressão começou (capitulo=${c3.capitulo})`);
await page.waitForTimeout(1500);
const c3b = await estado();
ok(c3b.nave.x > c3.nave.x, `a nave é PUXADA para o rasgo (x ${c3.nave.x} → ${c3b.nave.x})`);
await page.screenshot({ path: 'probe-interlude4-cap3.png' });
```

Run → Expected: `✘ a descompressão começou (capitulo=2)`.

- [ ] **Step 2: O assador das partículas**

Criar `scripts/_f8/_assar-succao.mjs`:

```js
// P3 · O QUE O VÁCUO PUXA (capítulo 3) — 6 partículas 16×16 assadas em pixel, com a paleta da câmara D.
// Os rastros apontam para a DIREITA (0°): o emissor gira cada uma para a direção do buraco.
//
//   node scripts/_f8/_assar-succao.mjs  →  public/sprites/f8-succao-sheet.png (96×16)
import sharp from 'sharp';

const S = 16, N = 6;
const C = { escuro: [22, 4, 8], fluido: [58, 8, 14], carne: [96, 18, 24], osso: [168, 150, 128], ossoSombra: [104, 88, 74], brasa: [196, 52, 26], fio: [255, 150, 60] };
const buf = Buffer.alloc(S * N * S * 4, 0);
const por = (q, x, y, c) => {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S * N + q * S + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
};
// 0 · rastro de fluido longo (cabeça grossa à direita, cauda fina à esquerda)
for (let x = 1; x < 15; x++) { por(0, x, 8, x > 10 ? C.fluido : C.escuro); if (x > 9) por(0, x, 7, C.escuro); }
// 1 · rastro curto e grosso
for (let x = 5; x < 14; x++) { por(1, x, 7, C.escuro); por(1, x, 8, C.fluido); if (x > 10) por(1, x, 9, C.escuro); }
// 2 · gota de lava com rastro (a ÚNICA acesa)
for (let x = 3; x < 11; x++) por(2, x, 8, C.brasa);
por(2, 11, 8, C.fio); por(2, 12, 8, C.fio); por(2, 12, 7, C.brasa); por(2, 12, 9, C.brasa);
// 3 · tendão arrebentado (fio ondulado)
for (let x = 1; x < 15; x++) por(3, x, 8 + Math.round(Math.sin(x * 0.9)), x % 4 === 0 ? C.carne : C.fluido);
// 4 · lasca de osso
for (let x = 5; x < 12; x++) { por(4, x, 7, C.osso); por(4, x, 8, C.ossoSombra); }
por(4, 12, 7, C.osso);
// 5 · naco de tecido
for (let y = 6; y < 11; y++) for (let x = 6; x < 11; x++) por(5, x, y, (x + y) % 3 === 0 ? C.escuro : C.carne);
await sharp(buf, { raw: { width: S * N, height: S, channels: 4 } }).png().toFile('public/sprites/f8-succao-sheet.png');
console.log('f8-succao-sheet.png 96x16');
```

Run: `node scripts/_f8/_assar-succao.mjs` → Expected: `f8-succao-sheet.png 96x16`.

- [ ] **Step 3: Registrar no `BootScene`**

```ts
  // P3: o que o vácuo puxa pelo rasgo — rastros, gota de lava, tendão, osso, tecido (16×16, assadas).
  f8SuccaoSheet: { path: 'sprites/f8-succao-sheet.png', w: 16, h: 16 },
```

- [ ] **Step 4: O capítulo 3 em `dentro.ts`**

Antes do `return` de `montarDentro`, inserir:

```ts
  // ─── CAPÍTULO 3 · DESCOMPRESSÃO (T.DESCOMPRESSAO) ───
  // O BURACO: o centro da caixa do rasgo. Tudo corre para ele (`moveToX/Y`): o vácuo dando a direção.
  const buracoX = RASGO_X + rasgo.width / 2;
  const buracoY = RASGO_Y + rasgo.height / 2;
  scene.time.delayedCall(T.DESCOMPRESSAO, () => {
    estado.capitulo = 3;
    gotas.stop();
    const succao = scene.add
      .particles(0, 0, 'f8SuccaoSheet', {
        frame: [0, 0, 1, 1, 2, 3, 4, 5],
        x: { min: 0, max: buracoX - 20 },
        y: { min: 10, max: 200 },
        moveToX: buracoX,
        moveToY: { min: buracoY - 30, max: buracoY + 30 },
        lifespan: { min: 380, max: 900 },
        rotate: { onEmit: (p) => Phaser.Math.RadToDeg(Math.atan2(buracoY - (p?.y ?? 0), buracoX - (p?.x ?? 0))) },
        frequency: 12,
        quantity: 3,
      })
      .setDepth(DEPTH.EFEITO);
    objetos.push(succao);
    scene.cameras.main.shake(T.FERIDA - T.DESCOMPRESSAO, 0.01);
    // A NAVE É ARRANCADA: acelera para o buraco girando (o C3 da folha: ela perde o controle).
    scene.tweens.add({
      targets: nave,
      x: buracoX + 12,
      y: buracoY,
      angle: 720,
      duration: T.FERIDA - T.DESCOMPRESSAO - 300,
      ease: 'Quad.easeIn',
    });
  });
```

E no `update` do capítulo trocar o corpo por:

```ts
    update(dt: number) {
      t += dt;
      if (estado.capitulo >= 3) return; // na descompressão, quem manda na nave é o tween
      const k = Math.min(1, (t * 1000) / T.RASGO);
      nave.y = baseY + Math.sin(t * 22) * (0.5 + 1.5 * k);
    },
```

⚠️ Se o `rotate.onEmit` não aceitar o tipo `(p) => number` no Phaser 3.90, use `rotate: 0` e troque o frame dos rastros para os quadros 2–5 (que não dependem de direção). Não desenhe a direção com `Graphics`.

- [ ] **Step 5: A folha por relógio de parede `scripts/_f8/_ver-final.mjs`**

```js
// A CUTSCENE FINAL EM RELÓGIO DE PAREDE — o que a pessoa vê em cada instante real. Beat de ruptura
// só se julga em movimento; isto é o mínimo até existir a sonda de vídeo.
//
//   npm run dev  noutro terminal, depois
//   node scripts/_f8/_ver-final.mjs 9500,9800,10200,10700,11300,12000,12700,13300 scripts/_f8/_folha-descompressao.png
import { chromium } from 'playwright';
import sharp from 'sharp';

const INSTANTES = (process.argv[2] ?? '5000,6000,7000,8000,9500,10500,11500,13000').split(',').map(Number);
const saida = process.argv[3] ?? 'scripts/_f8/_folha.png';
const L = 768, A = 432, COLS = 4;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: L, height: A } });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('F');
const t0 = Date.now();
const fotos = [];
for (const ms of INSTANTES) {
  const falta = ms - (Date.now() - t0);
  if (falta > 0) await page.waitForTimeout(falta);
  fotos.push({ ms, buf: await page.screenshot() });
}
await browser.close();
const lin = Math.ceil(fotos.length / COLS);
const tiras = await Promise.all(fotos.map(async ({ ms, buf }) =>
  sharp(buf).resize(384, 216).composite([{ input: Buffer.from(`<svg width="384" height="20"><rect width="70" height="18" fill="#000"/><text x="4" y="14" font-family="monospace" font-size="13" fill="#fc6">${ms}ms</text></svg>`), left: 0, top: 0 }]).png().toBuffer()));
await sharp({ create: { width: 384 * COLS, height: 216 * lin, channels: 4, background: '#111' } })
  .composite(tiras.map((input, i) => ({ input, left: (i % COLS) * 384, top: Math.floor(i / COLS) * 216 })))
  .png().toFile(saida);
console.log('folha:', saida);
```

- [ ] **Step 6: Sonda + folha + checkpoint**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs`
Expected: `✔` no bloco do capítulo 3.

Run: `node scripts/_f8/_ver-final.mjs 5000,6200,7400,8600,9500,10500,11500,13000 docs/superpowers/folhas/2026-09-23/p2p3-rasgo-descompressao.png`

🛑 **CHECKPOINT:** mostrar a folha. O critério: *direção inequívoca para o buraco*, com a nave arrancada girando e **sem clarão**.

- [ ] **Step 7: Commit**

```bash
git add scripts/_f8/_assar-succao.mjs scripts/_f8/_ver-final.mjs public/sprites/f8-succao-sheet.png src/scenes/BootScene.ts src/scenes/final/dentro.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p2p3-rasgo-descompressao.png
git commit -m "feat(f8): a descompressão — o vácuo puxa tudo pelo rasgo e arranca a nave girando"
```

---

### Task 5: P4 + P5 — o Leviatã ferido e a nuvem (capítulo 4)

**Files:**
- Create: `scripts/_f8/_gerar-leviata.mjs` → `public/sprites/f8-leviata-sheet.png`, `public/sprites/f8-nuvem-sheet.png`; `src/scenes/final/fora.ts`
- Modify: `src/scenes/BootScene.ts` (tabelas `SHEETS` e `SHEET_ANIMS`), `src/Starfield.ts` (ganha `destroy`), `src/scenes/Interlude4Scene.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `T.FERIDA`, `T.QUEDA`, `EstadoFinal.escalasLua`, `b64`, `gerar`, `paletaDe`, `naPaleta` (Task 3).
- Produces: `montarFora(c: CenaFinal): Capitulo`; texturas `f8LeviataSheet` (quadros `LEV_W×LEV_H`) e `f8NuvemSheet` (96×96); anims `f8-leviata-deriva` e `f8-nuvem`.

- [ ] **Step 1: O assert (falha primeiro)**

Inserir depois do bloco do capítulo 3:

```js
// ─── CAPÍTULO 4 — A FERIDA: fora, o biomecânico aberto; a lua PARADA ───
const c4 = await espera('cap 4    ', (e) => e.capitulo === 4, 12000);
ok(c4.capitulo === 4, `o corte para fora (capitulo=${c4.capitulo})`);
await page.waitForTimeout(3000);
const c4b = await estado();
const escalas = [...new Set(c4b.escalasLua ?? [])];
ok(escalas.length === 1, `a lua NÃO muda de escala no plano (${escalas.join(',')})`);
ok(c4b.nave.visivel && c4b.nave.flipX === false, 'a nave está lá fora, apontando para a direita');
await page.screenshot({ path: 'probe-interlude4-cap4.png' });
```

Run → Expected: `✘ o corte para fora (capitulo=3)`.

- [ ] **Step 2: O gerador `scripts/_f8/_gerar-leviata.mjs`**

```js
// P4 + P5 · O LEVIATÃ FERIDO, VISTO DE FORA, E A NUVEM QUE VAZA DELE (capítulo 4).
// O bicho é o BIOMECÂNICO canônico (objeto f397793a — a regra dos dois Leviatãs: este é o enfraquecido).
// Parte do `leviathan-dying.png` (o biomecânico já no disco, 115×47): o estilo do conceito 4★ aprovado
// (`conceito-4-ferida-11.png`) entra como style, e o Leviatã do disco como referência de sujeito.
//
//   node scripts/_f8/_gerar-leviata.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar, tamanho } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const LEV = 'public/sprites/leviathan-dying.png';
const W = 240, H = 112;

// 1 · o quadro-base: o biomecânico FERIDO, em 240×112, transparente
const [base] = await gerar('/generate-image-v2', {
  description: 'The colossal biomechanical whale-like space leviathan from the reference, seen from the side facing left, dark charcoal hide cracked with glowing orange lava veins, pale exposed ribs along its back, NO teeth. Its flank is ruptured by a huge wound torn open from the inside, ragged edges of dark crimson tissue curling outward. Dark sci-fi pixel art, desaturated, low contrast, light only from the lava.',
  image_size: { width: W, height: H },
  no_background: true,
  seed: 11,
  reference_images: [{ image: b64(LEV), size: await tamanho(LEV), usage_description: 'this exact creature design: biomechanical whale, ribs, lava cracks, no teeth' }],
  style_image: { image: b64(`${F}/conceito-4-ferida-11.png`), size: { width: 384, height: 216 } },
  style_options: { color_palette: true, outline: true, detail: true, shading: true },
});
fs.writeFileSync(`${F}/p4-leviata-base.png`, base);

// 2 · a deriva: o corpo se contorcendo devagar, a lava pulsando (v3, 8 quadros)
const deriva = await gerar('/animate-with-text-v3', {
  first_frame: b64(base),
  action: 'dying creature drifting in space, slow weak convulsion of the body, tail sagging, lava cracks pulsing dimly',
  frame_count: 8,
  seed: 11,
  no_background: true,
});

// 3 · a nuvem: 96×96, o que vaza da ferida (v3 a partir de um quadro gerado)
const [nuvem0] = await gerar('/generate-image-v2', {
  description: 'A drifting cloud of dark viscous fluid globules, small tissue fragments and a few glowing lava droplets, spreading out in zero gravity. Dark sci-fi pixel art, desaturated, light only from the lava droplets.',
  image_size: { width: 96, height: 96 },
  no_background: true,
  seed: 5,
  style_image: { image: b64(`${F}/conceito-4-ferida-11.png`), size: { width: 384, height: 216 } },
  style_options: { color_palette: true, outline: false, detail: true, shading: true },
});
const nuvem = await gerar('/animate-with-text-v3', {
  first_frame: b64(nuvem0),
  action: 'the cloud slowly expands and drifts to the right, globules separating, lava droplets cooling and dimming',
  frame_count: 8,
  seed: 5,
  no_background: true,
});

// 4 · paleta (a do conceito aprovado) e as folhas
const paleta = await paletaDe(`${F}/conceito-4-ferida-11.png`, 48);
const folha = async (quadros, w, h, saida) => {
  const prontos = [];
  for (const q of quadros) prontos.push(await naPaleta(await sharp(q).resize(w, h, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer(), paleta));
  await sharp({ create: { width: w * prontos.length, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(prontos.map((input, i) => ({ input, left: i * w, top: 0 }))).png().toFile(saida);
  console.log(saida, `${prontos.length} quadros de ${w}×${h}`);
};
await folha(deriva, W, H, 'public/sprites/f8-leviata-sheet.png');
await folha(nuvem, 96, 96, 'public/sprites/f8-nuvem-sheet.png');
```

Run: `node scripts/_f8/_gerar-leviata.mjs`
Expected: `public/sprites/f8-leviata-sheet.png 9 quadros de 240×112` e `public/sprites/f8-nuvem-sheet.png 9 quadros de 96×96`. Se o `/generate-image-v2` recusar a descrição (vocabulário), trocar `ragged edges of dark crimson tissue` por `ragged torn edges of dark red organic membrane` e rodar de novo. **Não repetir o mesmo pedido.**

- [ ] **Step 3: 🛑 CHECKPOINT — o Leviatã**

`node -e "const s=require('sharp');for(const f of ['f8-leviata-sheet','f8-nuvem-sheet'])s('public/sprites/'+f+'.png').metadata().then(m=>s('public/sprites/'+f+'.png').resize(m.width*2,m.height*2,{kernel:'nearest'}).toFile('docs/superpowers/folhas/2026-09-23/p4p5-'+f+'-crua.png'))"`

Mostrar. O critério: *é o biomecânico, com costelas, lava nas rachaduras e SEM DENTES*, e a ferida lê à distância. Reprovado: mudar a seed do passo 1 (a deriva e a paleta seguem), e mudar o pedido se duas seeds falharem.

- [ ] **Step 4: Registrar no `BootScene`**

Na tabela `SHEETS`:

```ts
  // P4/P5: o Leviatã ferido de fora (o BIOMECÂNICO, a partir do `leviathan-dying.png`) e a nuvem da ferida.
  f8LeviataSheet: { path: 'sprites/f8-leviata-sheet.png', w: 240, h: 112 },
  f8NuvemSheet: { path: 'sprites/f8-nuvem-sheet.png', w: 96, h: 96 },
```

Na tabela `SHEET_ANIMS` (linha ~215; o formato é `{ key, sheet, frames, frameRate, loop? }`, e sem `loop` o laço é infinito), usando o número de quadros que o Step 2 imprimiu:

```ts
  // FATIA 8 · o Leviatã ferido derivando e a nuvem da ferida. ⚠️ A v3 não fecha o laço (o último quadro
  // não encosta no primeiro): a 5 e 6 fps o salto some na convulsão; se aparecer, o conserto é na folha
  // (acrescentar os quadros de volta, 7→1), nunca aqui.
  { key: 'f8-leviata-deriva', sheet: 'f8LeviataSheet', frames: 9, frameRate: 5 },
  { key: 'f8-nuvem', sheet: 'f8NuvemSheet', frames: 9, frameRate: 6 },
```

- [ ] **Step 4b: `Starfield.destroy()`**

O `Starfield` não tem `destroy`, e as estrelas dele não podem atravessar o corte para o capítulo 5. Em `src/Starfield.ts`, depois do `update`:

```ts
  /** Tira as estrelas da tela: o corte de um plano de espaço para outro que não tem estrelas. */
  destroy(): void {
    this.gfx.destroy();
    this.stars.length = 0;
  }
```

(Se `stars` for `readonly` no tipo, o `length = 0` continua valendo: `readonly` protege a referência, não o conteúdo.)

- [ ] **Step 5: Criar `src/scenes/final/fora.ts`**

```ts
import Phaser from 'phaser';
import { GAME_WIDTH } from '../../config';
import { Starfield } from '../../Starfield';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * FORA — capítulo 4, A FERIDA (spec §3): o plano do A4. O biomecânico inteiro no meio da tela, com o
 * flanco aberto vazando a nuvem; a nave sai rolando da ferida, estabiliza e se afasta.
 *
 * ⚠️ A LUA É FIXA: posição e escala constantes do primeiro ao último quadro do plano (a regra física
 * da spec — astro não cresce sem a câmera ir até ele). A sonda cobra `escalasLua` com UM valor só.
 */
const LEV_X = 170;
const LEV_Y = 104;
/** A ferida, em relação ao centro do Leviatã (medir no quadro 0 da folha e ajustar). */
const FERIDA_DX = 22;
const FERIDA_DY = 6;
const LUA_X = 334;
const LUA_Y = 40;
const LUA_ESCALA = 0.3;

export function montarFora(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 4;
  scene.cameras.main.resetFX();

  const estrelas = new Starfield(scene);
  const lua = scene.add.image(LUA_X, LUA_Y, 'menuMoon').setScale(LUA_ESCALA).setDepth(DEPTH.FUNDO + 1);
  const lev = scene.add.sprite(LEV_X, LEV_Y, 'f8LeviataSheet', 0).setDepth(DEPTH.CENARIO);
  lev.play('f8-leviata-deriva');
  const nuvem = scene.add
    .sprite(LEV_X + FERIDA_DX + 30, LEV_Y + FERIDA_DY, 'f8NuvemSheet', 0)
    .setDepth(DEPTH.CENARIO + 1)
    .setAlpha(0.9);
  nuvem.play({ key: 'f8-nuvem', repeat: -1 });

  // O corpo deriva, devagar, para a direita e para baixo — rumo à lua (a queda começa aqui).
  scene.tweens.add({ targets: [lev, nuvem], x: '+=26', y: '+=8', duration: T.QUEDA - T.FERIDA, ease: 'Sine.easeIn' });

  // A NAVE sai da ferida rolando, estabiliza e se afasta (o C3 → C4 da folha).
  nave.setPosition(LEV_X + FERIDA_DX, LEV_Y + FERIDA_DY).setAngle(-540).setFlipX(false).setVisible(true);
  scene.tweens.add({ targets: nave, angle: 0, x: LEV_X + 92, y: LEV_Y - 10, duration: 2200, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: nave, x: GAME_WIDTH - 40, y: 70, delay: 2400, duration: T.QUEDA - T.FERIDA - 2400, ease: 'Sine.easeInOut' });

  return {
    update(dt: number) {
      estrelas.update(dt);
      estado.escalasLua.push(+lua.scaleX.toFixed(3));
    },
    limpar() {
      estrelas.destroy();
      [lua, lev, nuvem].forEach((o) => o.destroy());
    },
  };
}
```

- [ ] **Step 6: Agendar na regente**

Em `src/scenes/Interlude4Scene.ts`: `import { montarFora } from './final/fora';` e, no `create`, logo depois de `this.placar();`:

```ts
    this.aos(T.FERIDA, () => montarFora(this.cena));
```

- [ ] **Step 7: Sonda e olho**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs`
Expected: `✔` no bloco do capítulo 4. Em `probe-interlude4-cap4.png`, medir onde a ferida caiu e ajustar `FERIDA_DX/FERIDA_DY` para a nave sair **de dentro dela**. Rodar de novo.

- [ ] **Step 8: Commit**

```bash
git add scripts/_f8/_gerar-leviata.mjs public/sprites/f8-leviata-sheet.png public/sprites/f8-nuvem-sheet.png src/scenes/final/fora.ts src/Starfield.ts src/scenes/Interlude4Scene.ts src/scenes/BootScene.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p4*
git commit -m "feat(f8): a ferida — o biomecânico aberto vazando no vácuo, a nave saindo de dentro dele"
```

---

### Task 6: P6 — a queda (capítulo 5)

**Files:**
- Create: `scripts/_f8/_gerar-queda.mjs` → `public/sprites/f8-lua-perto.png`, `public/sprites/f8-reentrada-sheet.png`; `src/scenes/final/queda.ts`
- Modify: `src/scenes/BootScene.ts` (`ART`, `SHEETS`, `SHEET_ANIMS`), `src/entities/Predador.ts` (extrai `garantirLuzRadial`), `src/scenes/Interlude4Scene.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `T.QUEDA`, `T.SOBREVOO`, `gerar`, `b64`, `tamanho`, `paletaDe`, `naPaleta`.
- Produces: `montarQueda(c: CenaFinal): Capitulo`; `f8LuaPerto` (384×216), `f8ReentradaSheet` (quadros de 128×96), anim `f8-reentrada`.

- [ ] **Step 1: O assert (falha primeiro)**

```js
// ─── CAPÍTULO 5 — A QUEDA: o corpo em brasa entra na atmosfera ───
const c5 = await espera('cap 5    ', (e) => e.capitulo === 5, 15000);
ok(c5.capitulo === 5, `o corte para a queda (capitulo=${c5.capitulo})`);
ok(c5.nave.visivel === false, 'na queda, a câmera está com o CORPO: a nave fora do plano');
await page.waitForTimeout(3500);
await page.screenshot({ path: 'probe-interlude4-cap5.png' });
```

Run → Expected: `✘ o corte para a queda (capitulo=4)`.

- [ ] **Step 2: O gerador `scripts/_f8/_gerar-queda.mjs`**

```js
// P6 · A QUEDA (capítulo 5). Duas peças, a partir do conceito 5★ (`conceito-5-queda-11.png`):
//   f8-lua-perto.png       384×216 — o fundo: o preto e a curva da lua de perto, SEM o corpo;
//   f8-reentrada-sheet.png 128×96 × 8 — o corpo caindo de cabeça, com o casco em brasa.
// ⚠️ POLIMENTO DA SPEC: a borda em brasa não pode ser o ponto mais claro da cena. Depois da paleta, a
// peça passa por `amansar` — os 4 tons mais claros descem um degrau.
//
//   node scripts/_f8/_gerar-queda.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar, tamanho } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const C5 = `${F}/conceito-5-queda-11.png`;
const LEV = 'public/sprites/leviathan-dying.png';

const [fundo] = await gerar('/generate-image-v2', {
  description: 'Very close to a dead grey moon: its curved cratered horizon fills the lower third of the frame, black empty space above with sparse stars. No creatures, no objects. Dark sci-fi pixel art, desaturated, low contrast.',
  image_size: { width: 384, height: 216 },
  no_background: false,
  seed: 11,
  reference_images: [{ image: b64('public/sprites/menu-moon.png'), size: await tamanho('public/sprites/menu-moon.png'), usage_description: 'this exact dead grey moon surface, seen very close' }],
  style_image: { image: b64(C5), size: { width: 384, height: 216 } },
  style_options: { color_palette: true, outline: true, detail: true, shading: true },
});

const [corpo] = await gerar('/generate-image-v2', {
  description: 'The biomechanical whale-like leviathan from the reference, lifeless, falling head first diagonally down to the right, its hide glowing with dull orange reentry heat along the lower edge, fragments peeling off, a short smoke trail behind. NO teeth. Dark sci-fi pixel art, desaturated.',
  image_size: { width: 128, height: 96 },
  no_background: true,
  seed: 11,
  reference_images: [{ image: b64(LEV), size: await tamanho(LEV), usage_description: 'this exact creature design' }],
  style_image: { image: b64(C5), size: { width: 384, height: 216 } },
  style_options: { color_palette: true, outline: true, detail: true, shading: true },
});
const queda = await gerar('/animate-with-text-v3', {
  first_frame: b64(corpo),
  action: 'falling body burning on atmospheric entry, heat flickering along its underside, small burning fragments breaking off and trailing behind',
  frame_count: 8,
  seed: 11,
  no_background: true,
});

const paleta = await paletaDe(C5, 48);
// amansar: os 4 tons mais claros da paleta descem para o 5º mais claro (a brasa não lava a cena)
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
const ordem = [...paleta].sort((a, b) => lum(b) - lum(a));
const teto = ordem[4];
const mansa = paleta.map((c) => (ordem.indexOf(c) < 4 ? teto : c));

fs.writeFileSync('public/sprites/f8-lua-perto.png', await naPaleta(fundo, paleta));
const prontos = [];
for (const q of queda) prontos.push(await naPaleta(await sharp(q).resize(128, 96, { kernel: 'nearest' }).png().toBuffer(), mansa));
await sharp({ create: { width: 128 * prontos.length, height: 96, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(prontos.map((input, i) => ({ input, left: i * 128, top: 0 }))).png().toFile('public/sprites/f8-reentrada-sheet.png');
console.log(`f8-lua-perto.png 384×216 · f8-reentrada-sheet.png ${prontos.length} quadros de 128×96`);
```

Run: `node scripts/_f8/_gerar-queda.mjs` → Expected: `f8-lua-perto.png 384×216 · f8-reentrada-sheet.png 9 quadros de 128×96`.

- [ ] **Step 3: 🛑 CHECKPOINT** — folha crua 2× (`p6-queda-crua.png`, mesmo comando das tasks anteriores) + o fundo. O critério: *a brasa é energia, mas não é o ponto mais claro*, e o corpo é o biomecânico.

- [ ] **Step 4: Registrar no `BootScene`**

Na tabela `ART` (perto da linha 432): `f8LuaPerto: 'sprites/f8-lua-perto.png',`
Na `SHEETS`: `f8ReentradaSheet: { path: 'sprites/f8-reentrada-sheet.png', w: 128, h: 96 },`
Na `SHEET_ANIMS`: `{ key: 'f8-reentrada', sheet: 'f8ReentradaSheet', frames: 9, frameRate: 8 },` (sem `loop` = laço infinito; `frames` = o que o Step 2 imprimiu).

- [ ] **Step 4b: A `luzRadial` sem o predador**

A textura `luzRadial` só nasce no construtor do `Predador` (`src/entities/Predador.ts:261`). Pelo atalho `F` do menu, a queda a pediria sem ela existir. Extrair o bloco para uma função exportada no mesmo arquivo, acima da classe:

```ts
/**
 * A LUZ REDONDA de verdade: degradê radial que chega a ZERO antes da borda do quadro. ⚠️ A 1ª versão
 * (anéis de alpha somados) tinha alpha > 0 na borda — em ADD e ampliada, lia como RETÂNGULO (16/09).
 * Exportada porque a cutscene final (queda) usa a mesma luz sem haver predador na cena.
 */
export function garantirLuzRadial(scene: Phaser.Scene): void {
  if (scene.textures.exists('luzRadial')) return;
  const tex = scene.textures.createCanvas('luzRadial', 64, 64);
  if (!tex) return;
  const ctx = tex.getContext();
  const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.15)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  tex.refresh();
}
```

E, no construtor do `Predador`, trocar o bloco `if (!scene.textures.exists('luzRadial')) { ... }` por `garantirLuzRadial(scene);`. Rodar `node scripts/probe-stage4.mjs` antes do commit desta task: o predador ainda acende.

- [ ] **Step 5: Criar `src/scenes/final/queda.ts`**

```ts
import Phaser from 'phaser';
import { garantirLuzRadial } from '../../entities/Predador';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * A QUEDA — capítulo 5 (spec §3). OUTRO PLANO, POR CORTE: a câmera está junto do corpo, perto da lua.
 * A lua é grande porque a câmera está perto dela, e não porque cresceu (a regra física da spec). O corpo
 * entra de cabeça, some atrás do horizonte, e o impacto é CONTIDO: um brilho baixo, sem lavar a tela.
 */
const HORIZONTE_Y = 150;

export function montarQueda(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 5;
  nave.setVisible(false);

  const fundo = scene.add.image(0, 0, 'f8LuaPerto').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  // O corpo passa ATRÁS da borda da lua: a máscara é a própria linha do horizonte (acima dela, visível).
  const corpo = scene.add.sprite(60, 20, 'f8ReentradaSheet', 0).setDepth(DEPTH.CENARIO);
  corpo.play({ key: 'f8-reentrada', repeat: -1 });
  const mascara = scene.make.graphics({}, false).fillRect(0, 0, 384, HORIZONTE_Y + 6).createGeometryMask();
  corpo.setMask(mascara);

  const fumaca = scene.add
    .particles(0, 0, 'puff', { lifespan: 1600, speed: { min: 4, max: 14 }, scale: { start: 0.6, end: 1.6 }, alpha: { start: 0.5, end: 0 }, tint: 0x1a1418, frequency: 60, follow: corpo, followOffset: { x: -30, y: -20 } })
    .setDepth(DEPTH.CENARIO - 1);

  const queda = T.SOBREVOO - T.QUEDA - 2200;
  scene.tweens.add({ targets: corpo, x: 250, y: HORIZONTE_Y + 60, duration: queda, ease: 'Quad.easeIn' });

  // O IMPACTO atrás do horizonte: uma luz baixa que sobe e morre. ADD em alfa baixo — nunca flash.
  garantirLuzRadial(scene);
  const brilho = scene.add.image(262, HORIZONTE_Y + 4, 'luzRadial').setBlendMode(Phaser.BlendModes.ADD).setTint(0xc4341a).setScale(3, 1.2).setAlpha(0).setDepth(DEPTH.CENARIO + 1);
  scene.time.delayedCall(queda - 200, () => {
    fumaca.stop();
    scene.tweens.add({ targets: brilho, alpha: 0.28, duration: 350, yoyo: true, hold: 500 });
    scene.cameras.main.shake(500, 0.003);
  });

  return {
    limpar() {
      mascara.destroy();
      [fundo, corpo, fumaca, brilho].forEach((o) => o.destroy());
    },
  };
}
```

- [ ] **Step 6: Agendar na regente**

`import { montarQueda } from './final/queda';` e, abaixo do `aos(T.FERIDA, ...)`: `this.aos(T.QUEDA, () => montarQueda(this.cena));`

- [ ] **Step 7: Sonda**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs` → Expected: `✔` no bloco do capítulo 5. Ver `probe-interlude4-cap5.png`.

- [ ] **Step 8: Commit**

```bash
git add scripts/_f8/_gerar-queda.mjs public/sprites/f8-lua-perto.png public/sprites/f8-reentrada-sheet.png src/scenes/final/queda.ts src/entities/Predador.ts src/scenes/Interlude4Scene.ts src/scenes/BootScene.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p6*
git commit -m "feat(f8): a queda — o corpo em brasa entra na lua, por corte e sem clarão"
```

---

### Task 7: P7 — o sobrevoo da colônia (capítulo 6)

**Files:**
- Create: `scripts/_f8/_gerar-sobrevoo.mjs` → `public/sprites/f8-sobrevoo-fundo.png` (384×216), `f8-sobrevoo-meio.png` (768×120, emenda em x), `f8-sobrevoo-frente.png` (768×40), `f8-carcaca.png` (~300×90); `src/scenes/final/sobrevoo.ts`
- Modify: `src/scenes/BootScene.ts` (`ART`), `src/scenes/Interlude4Scene.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `T.SOBREVOO`, `T.APAGA`, `EstadoFinal.carcacaX`, o cliente e a paleta (Task 3).
- Produces: `montarSobrevoo(c: CenaFinal): Capitulo` (os capítulos 6 e 7 — a Task 8 completa o 7); `CARCACA_FINAL_X` exportado; texturas `f8SobrevooFundo`, `f8SobrevooMeio`, `f8SobrevooFrente`, `f8Carcaca`.

- [ ] **Step 1: O assert (falha primeiro)**

```js
// ─── CAPÍTULO 6 — O SOBREVOO: a colônia da F1 em ruínas, a nave voltando para a ESQUERDA ───
const c6 = await espera('cap 6    ', (e) => e.capitulo === 6 && e.carcacaX !== null, 15000);
ok(c6.capitulo === 6, `a superfície (capitulo=${c6.capitulo})`);
ok(c6.nave.flipX === true && c6.nave.visivel, 'a nave voa para a ESQUERDA (o caminho da F1 ao contrário)');
await page.waitForTimeout(2000);
const c6b = await estado();
ok(c6b.carcacaX > c6.carcacaX, `o mundo corre para a DIREITA sob ela (carcaça ${c6.carcacaX} → ${c6b.carcacaX})`);
await page.screenshot({ path: 'probe-interlude4-cap6.png' });
```

Run → Expected: `✘ a superfície (capitulo=5)`.

- [ ] **Step 2: O gerador `scripts/_f8/_gerar-sobrevoo.mjs`**

```js
// P7 · O SOBREVOO (capítulo 6): o espelho da Fase 1, em ruínas, com a carcaça atravessada. Quatro peças
// a partir do conceito 6★ (`conceito-6-sobrevoo-22.png`) e do fundo da F1 (`paint-bg-f1.png`):
//   f8-sobrevoo-fundo.png   384×216 — céu e montanhas da F1 (parado: é longe)
//   f8-sobrevoo-meio.png    768×120 — a colônia em ruínas, fogo baixo, fumaça; EMENDA EM X (rola)
//   f8-sobrevoo-frente.png  768×40  — entulho escuro em primeiro plano; emenda em x
//   f8-carcaca.png          ~300×90 — a carcaça, SEPARADA do meio (a lava dela se apaga no cap. 7)
// ⚠️ POLIMENTO DA SPEC: a carcaça PARTIDA, AFUNDADA no terreno, COM CRATERA — o conceito a deixou inteira.
//
//   node scripts/_f8/_gerar-sobrevoo.mjs
import fs from 'node:fs';
import sharp from 'sharp';
import { b64, gerar, tamanho } from './_pl.mjs';
import { paletaDe, naPaleta } from './_paleta.mjs';

const F = 'docs/superpowers/folhas/2026-09-23';
const C6 = `${F}/conceito-6-sobrevoo-22.png`;
const F1 = 'public/sprites/paint-bg-f1.png';
const LEV = 'public/sprites/leviathan-dying.png';
const estilo = { image: b64(C6), size: { width: 384, height: 216 } };
const tudo = { color_palette: true, outline: true, detail: true, shading: true };

const [fundo] = await gerar('/generate-image-v2', {
  description: 'The same dark moon night sky and jagged blue-grey mountains from the reference, far background only, faint smoke columns rising on the horizon. No buildings in the foreground, no creatures. Dark sci-fi pixel art, desaturated, low contrast.',
  image_size: { width: 384, height: 216 }, no_background: false, seed: 22,
  reference_images: [{ image: b64(F1), size: await tamanho(F1), usage_description: 'this exact sky, mountains and palette' }],
  style_image: estilo, style_options: tudo,
});
const [meio] = await gerar('/generate-image-v2', {
  description: 'Side view strip of a DESTROYED moon colony at night: crushed domes, broken towers, collapsed walls, small low fires, dark smoke, scattered debris, dark ground. Seamless horizontal strip, transparent sky. Dark sci-fi pixel art, desaturated, light only from the small fires.',
  image_size: { width: 768, height: 120 }, no_background: true, seed: 22,
  reference_images: [{ image: b64(F1), size: await tamanho(F1), usage_description: 'the colony buildings and palette of this moon' }],
  style_image: estilo, style_options: tudo,
});
const [frente] = await gerar('/generate-image-v2', {
  description: 'Side view seamless strip of dark rubble, broken metal beams and rocks in the immediate foreground, almost black silhouettes. Transparent above. Dark sci-fi pixel art.',
  image_size: { width: 768, height: 40 }, no_background: true, seed: 22,
  style_image: estilo, style_options: tudo,
});
const [carcaca] = await gerar('/generate-image-v2', {
  description: 'The colossal biomechanical whale-like leviathan from the reference lying DEAD on the ground, side view: its body BROKEN in two uneven parts, half SUNK into the terrain inside a fresh impact crater with a raised rim of rubble, ribs snapped open, hide cracked with still-glowing orange lava veins, smoke rising from the breaks. NO teeth. Dark sci-fi pixel art, desaturated, light only from the lava.',
  image_size: { width: 300, height: 90 }, no_background: true, seed: 22,
  reference_images: [{ image: b64(LEV), size: await tamanho(LEV), usage_description: 'this exact creature design, now a broken carcass' }],
  style_image: estilo, style_options: tudo,
});

const paleta = await paletaDe(C6, 56);
const emendar = async (buf, w, h) => {
  // fecha a emenda em x: os últimos 24px se fundem com os primeiros (mistura por coluna)
  const { data, info } = await sharp(buf).resize(w, h, { kernel: 'nearest' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const B = 24;
  for (let y = 0; y < h; y++) for (let k = 0; k < B; k++) {
    const a = (y * w + (w - B + k)) * 4, b = (y * w + k) * 4, t = k / B;
    if (t > 0.5) for (let ch = 0; ch < 4; ch++) data[a + ch] = data[b + ch];
  }
  return sharp(data, { raw: info }).png().toBuffer();
};
fs.writeFileSync('public/sprites/f8-sobrevoo-fundo.png', await naPaleta(fundo, paleta));
fs.writeFileSync('public/sprites/f8-sobrevoo-meio.png', await naPaleta(await emendar(meio, 768, 120), paleta));
fs.writeFileSync('public/sprites/f8-sobrevoo-frente.png', await naPaleta(await emendar(frente, 768, 40), paleta));
fs.writeFileSync('public/sprites/f8-carcaca.png', await naPaleta(carcaca, paleta));
console.log('f8-sobrevoo-fundo/meio/frente + f8-carcaca prontos');
```

Run: `node scripts/_f8/_gerar-sobrevoo.mjs` → Expected: `f8-sobrevoo-fundo/meio/frente + f8-carcaca prontos`. Se o `/generate-image-v2` recusar 768 de largura, gerar o meio e a frente em 384 e montar 768 com a imagem + ela espelhada (`sharp().flop()`) lado a lado. A emenda passa a ser a do espelho.

- [ ] **Step 3: 🛑 CHECKPOINT — o sobrevoo**

Compor uma prévia estática (fundo + meio em y=100 + carcaça em x=150,y=110 + frente em y=176) e salvar `docs/superpowers/folhas/2026-09-23/p7-sobrevoo-previa.png`:

`node -e "const s=require('sharp');s('public/sprites/f8-sobrevoo-fundo.png').composite([{input:'public/sprites/f8-sobrevoo-meio.png',left:0,top:100},{input:'public/sprites/f8-carcaca.png',left:150,top:110},{input:'public/sprites/f8-sobrevoo-frente.png',left:0,top:176}]).toBuffer().then(b=>s(b).extract({left:0,top:0,width:384,height:216}).resize(768,432,{kernel:'nearest'}).toFile('docs/superpowers/folhas/2026-09-23/p7-sobrevoo-previa.png'))"`

(⚠️ O `composite` do sharp recusa camada maior que a base. Se reclamar, recortar o meio e a frente em 384 antes, com `.extract({left:0,top:0,width:384,height:...})`.)

Mostrar. Os critérios: *reconhece a colônia da F1*, a carcaça está **partida, afundada e com cratera**, e só o fogo e a lava acendem. **Este é o fundo que ele pode assumir** (*"caso os fundos precisem da minha criação, eu posso fazer"*). Se ele quiser pintar, a prévia é a base dele: pare aqui e retome com os PNGs que ele entregar, nos mesmos nomes e tamanhos.

- [ ] **Step 4: Registrar no `BootScene`** (tabela `ART`)

```ts
  // P7: o sobrevoo da colônia (Fatia 8, capítulo 6) — o espelho da F1 em ruínas, e a carcaça à parte.
  f8SobrevooFundo: 'sprites/f8-sobrevoo-fundo.png',
  f8SobrevooMeio: 'sprites/f8-sobrevoo-meio.png',
  f8SobrevooFrente: 'sprites/f8-sobrevoo-frente.png',
  f8Carcaca: 'sprites/f8-carcaca.png',
```

- [ ] **Step 5: Criar `src/scenes/final/sobrevoo.ts`**

```ts
import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../../config';
import { pixelText } from '../../ui';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * O SOBREVOO — capítulos 6 e 7 (spec §3). O ESPELHO DA FASE 1: o mesmo céu, as mesmas montanhas, a
 * colônia em ruínas — e a nave VOLTANDO, para a esquerda (o mundo corre para a direita sob ela). A
 * carcaça está atravessada sobre a colônia; o rolamento freia até ela parar no meio da tela, onde a
 * luz dela se apaga (capítulo 7, completado na Task 8).
 */
const MEIO_Y = 100;
const FRENTE_Y = 176;
const CARCACA_Y = 112;
/** Onde a carcaça PARA, no meio da tela, para o capítulo 7. */
export const CARCACA_FINAL_X = 192;
/** Velocidade do meio no começo (px/s); o fundo não rola (é longe); a frente anda 2× o meio. */
const V0 = 42;

export function montarSobrevoo(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 6;

  const fundo = scene.add.image(0, 0, 'f8SobrevooFundo').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const meio = scene.add.tileSprite(0, MEIO_Y, GAME_WIDTH, 120, 'f8SobrevooMeio').setOrigin(0, 0).setDepth(DEPTH.CENARIO);
  const frente = scene.add.tileSprite(0, FRENTE_Y, GAME_WIDTH, 40, 'f8SobrevooFrente').setOrigin(0, 0).setDepth(DEPTH.FRENTE);

  // A carcaça entra pela ESQUERDA e anda para a direita com o meio, até parar em CARCACA_FINAL_X no
  // instante T.APAGA: x(t) = FINAL − distância restante. A distância total é a integral da velocidade.
  const dur = (T.APAGA - T.SOBREVOO) / 1000;
  const percurso = (V0 * dur) / 2; // a velocidade cai linear de V0 a 0 → área do triângulo
  const carcaca = scene.add.image(CARCACA_FINAL_X - percurso, CARCACA_Y, 'f8Carcaca').setDepth(DEPTH.CENARIO + 1);
  estado.carcacaX = Math.round(carcaca.x);

  const fumaca = scene.add
    .particles(0, 0, 'puff', { lifespan: 2200, speedY: { min: -14, max: -6 }, speedX: { min: -3, max: 3 }, scale: { start: 0.5, end: 1.8 }, alpha: { start: 0.45, end: 0 }, tint: 0x16141a, frequency: 140, follow: carcaca, followOffset: { x: 0, y: -24 } })
    .setDepth(DEPTH.CENARIO + 2);

  // A nave: da direita para a esquerda, rasante, VIRADA para a esquerda. Sai da tela antes do cap. 7.
  nave.setVisible(true).setAngle(0).setFlipX(true).setPosition(GAME_WIDTH + 20, 78);
  scene.tweens.add({ targets: nave, x: -30, duration: T.APAGA - T.SOBREVOO + 1200, ease: 'Linear' });
  scene.tweens.add({ targets: nave, y: 84, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  const banner = pixelText(scene, GAME_WIDTH / 2, 26, 'KEPLER · A COLÔNIA MORTA', { size: 11, color: COLORS.metalLight })
    .setDepth(DEPTH.TEXTO)
    .setAlpha(0);
  scene.tweens.add({ targets: banner, alpha: 1, delay: 1500, duration: 900, hold: 2600, yoyo: true });

  let t = 0;
  return {
    update(dt: number) {
      t += dt;
      const v = Math.max(0, V0 * (1 - t / dur));
      meio.tilePositionX -= v * dt;
      frente.tilePositionX -= v * 2 * dt;
      carcaca.x = CARCACA_FINAL_X - (percurso - (V0 * t - (V0 * t * t) / (2 * dur)));
      if (t >= dur) carcaca.x = CARCACA_FINAL_X;
      estado.carcacaX = Math.round(carcaca.x);
    },
    limpar() {
      [fundo, meio, frente, carcaca, fumaca, banner].forEach((o) => o.destroy());
    },
  };
}
```

- [ ] **Step 6: Agendar na regente**

`import { montarSobrevoo } from './final/sobrevoo';` e `this.aos(T.SOBREVOO, () => montarSobrevoo(this.cena));`

- [ ] **Step 7: Sonda**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs` → Expected: `✔` no bloco do capítulo 6. Ver `probe-interlude4-cap6.png`.

- [ ] **Step 8: Commit**

```bash
git add scripts/_f8/_gerar-sobrevoo.mjs public/sprites/f8-sobrevoo-*.png public/sprites/f8-carcaca.png src/scenes/final/sobrevoo.ts src/scenes/Interlude4Scene.ts src/scenes/BootScene.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p7*
git commit -m "feat(f8): o sobrevoo — a colônia da F1 em ruínas, a carcaça atravessada, a nave voltando"
```

---

### Task 8: P8 — a luz se apaga (capítulo 7)

**Files:**
- Create: `scripts/_f8/_assar-apagar.mjs` → `public/sprites/f8-carcaca-lava-sheet.png`
- Modify: `src/scenes/BootScene.ts` (`SHEETS`), `src/scenes/final/sobrevoo.ts`, `scripts/probe-interlude4.mjs`

**Interfaces:**
- Consumes: `f8Carcaca` e `CARCACA_FINAL_X` (Task 7), `T.APAGA`, `T.FADE`, `EstadoFinal.lavaCarcaca`.
- Produces: `f8CarcacaLavaSheet` — 8 quadros do tamanho de `f8-carcaca.png`. O quadro 0 é a lava inteira acesa; o 7 tem **uma placa só**, a última luz.

- [ ] **Step 1: O assert (falha primeiro)**

```js
// ─── CAPÍTULO 7 — A LUZ SE APAGA: a lava da carcaça esfria placa por placa até o breu ───
const c7 = await espera('cap 7    ', (e) => e.capitulo === 7, 20000);
ok(c7.capitulo === 7, `a câmera parou sobre a carcaça (capitulo=${c7.capitulo})`);
await page.screenshot({ path: 'probe-interlude4-cap7a.png' });
const c7b = await espera('cap 7 fim', (e) => e.lavaCarcaca === 0, 9000);
ok(c7b.lavaCarcaca === 0, `a última luz se apagou (lavaCarcaca=${c7b.lavaCarcaca})`);
await page.screenshot({ path: 'probe-interlude4-cap7b.png' });
```

Run → Expected: `✘ a câmera parou sobre a carcaça (capitulo=6)`.

- [ ] **Step 2: O assador `scripts/_f8/_assar-apagar.mjs`**

```js
// P8 · A LUZ SE APAGA (capítulo 7). Separa, da carcaça, os pixels QUENTES (a lava das rachaduras) numa
// camada própria, agrupa-os em PLACAS (vizinhança) e assa 8 estágios em que as placas esfriam uma a uma,
// da cauda para a cabeça, até restar UMA — a última luz. A carcaça em si fica com esses pixels trocados
// pelo tom frio mais próximo (a camada acesa é que dá a cor).
//
//   node scripts/_f8/_assar-apagar.mjs
import sharp from 'sharp';

const SRC = 'public/sprites/f8-carcaca.png';
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const quente = (i) => data[i + 3] > 0 && data[i] > 120 && data[i] > data[i + 2] * 1.8 && data[i] > data[i + 1] * 1.3;

// 1 · as placas: componentes conexos dos pixels quentes (8-vizinhança, com ponte de 1px)
const placa = new Int32Array(W * H).fill(-1);
let n = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const p = y * W + x;
  if (placa[p] !== -1 || !quente(p * 4)) continue;
  const pilha = [p]; placa[p] = n;
  while (pilha.length) {
    const q = pilha.pop(), qx = q % W, qy = (q / W) | 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const vx = qx + dx, vy = qy + dy, v = vy * W + vx;
      if (vx < 0 || vy < 0 || vx >= W || vy >= H || placa[v] !== -1 || !quente(v * 4)) continue;
      placa[v] = n; pilha.push(v);
    }
  }
  n++;
}
// 2 · a ordem de apagar: pelo x médio (da cauda — direita — para a cabeça — esquerda)
const soma = new Float64Array(n), cont = new Float64Array(n);
for (let p = 0; p < W * H; p++) if (placa[p] >= 0) { soma[placa[p]] += p % W; cont[placa[p]]++; }
const ordem = [...Array(n).keys()].sort((a, b) => soma[b] / cont[b] - soma[a] / cont[a]);
const ultima = ordem[ordem.length - 1];
// estágio em que cada placa apaga: 0..6 espalhadas; a última só no 7
const apagaEm = new Int32Array(n);
ordem.forEach((pl, k) => { apagaEm[pl] = pl === ultima ? 7 : Math.min(6, Math.floor((k / Math.max(1, n - 1)) * 7)); });

// 3 · a folha: 8 quadros; num quadro q, a placa acesa se q < apagaEm, e esfriando (escurecida) em q == apagaEm
const N = 8, folha = Buffer.alloc(W * N * H * 4, 0);
for (let q = 0; q < N; q++) for (let p = 0; p < W * H; p++) {
  const pl = placa[p]; if (pl < 0) continue;
  const i = p * 4, o = ((p / W | 0) * W * N + q * W + (p % W)) * 4;
  const k = q < apagaEm[pl] ? 1 : q === apagaEm[pl] ? 0.45 : 0;
  if (q === 7 && pl !== ultima) continue;
  if (k === 0) continue;
  folha[o] = Math.round(data[i] * k); folha[o + 1] = Math.round(data[i + 1] * k); folha[o + 2] = Math.round(data[i + 2] * k); folha[o + 3] = 255;
}
await sharp(folha, { raw: { width: W * N, height: H, channels: 4 } }).png().toFile('public/sprites/f8-carcaca-lava-sheet.png');

// 4 · a carcaça FRIA: os quentes viram o cinza-azulado escuro da crosta
for (let p = 0; p < W * H; p++) if (placa[p] >= 0) { const i = p * 4; data[i] = 22; data[i + 1] = 20; data[i + 2] = 28; }
await sharp(data, { raw: info }).png().toFile('public/sprites/f8-carcaca-fria.png');
console.log(`f8-carcaca-lava-sheet.png ${N} × ${W}×${H} · ${n} placas · f8-carcaca-fria.png`);
```

Run: `node scripts/_f8/_assar-apagar.mjs` → Expected: `f8-carcaca-lava-sheet.png 8 × <W>×<H> · <n> placas · f8-carcaca-fria.png`, com n ≥ 6. Com menos de 6 placas, o apagar não tem "placa por placa": baixar o limiar `data[i] > 120` para `> 100` e rodar de novo.

- [ ] **Step 3: Registrar no `BootScene`**

Na `SHEETS` (W e H do Step 2): `f8CarcacaLavaSheet: { path: 'sprites/f8-carcaca-lava-sheet.png', w: <W>, h: <H> },`
Na `ART`: trocar `f8Carcaca: 'sprites/f8-carcaca.png'` por `f8Carcaca: 'sprites/f8-carcaca-fria.png'` (a cor da lava passa a morar só na camada que se apaga).

- [ ] **Step 4: O capítulo 7 em `sobrevoo.ts`**

Em `montarSobrevoo`, depois de criar a `carcaca`, inserir:

```ts
  // A LAVA DA CARCAÇA (P8) — camada própria, colada na carcaça; no capítulo 7 ela esfria placa por placa.
  const lava = scene.add.image(carcaca.x, CARCACA_Y, 'f8CarcacaLavaSheet', 0).setDepth(DEPTH.CENARIO + 1.5);
  estado.lavaCarcaca = 1;
  scene.time.delayedCall(T.APAGA - T.SOBREVOO, () => {
    estado.capitulo = 7;
    fumaca.stop();
    scene.tweens.addCounter({
      from: 0,
      to: 7.99,
      duration: T.FADE - T.APAGA - 900,
      ease: 'Sine.easeIn',
      onUpdate: (tw) => lava.setFrame(Math.floor(tw.getValue() ?? 0)),
      onComplete: () => {
        // A ÚLTIMA LUZ: a placa que sobrou segura um instante… e apaga.
        scene.tweens.add({
          targets: lava,
          alpha: 0,
          delay: 500,
          duration: 380,
          onUpdate: () => (estado.lavaCarcaca = +lava.alpha.toFixed(2)),
          onComplete: () => (estado.lavaCarcaca = 0),
        });
      },
    });
  });
```

No `update`, depois de ajustar `carcaca.x`: `lava.x = carcaca.x;`. No `limpar`, incluir `lava` na lista.

- [ ] **Step 5: Sonda + folha + checkpoint**

Run: `npm run typecheck && node scripts/probe-interlude4.mjs`
Expected: `✔` no capítulo 7 e no fim (menos o assert das baleias, que fecha na Task 9).

Run: `node scripts/_f8/_ver-final.mjs 41000,42000,43000,44000,44800,45300,45800,46500 docs/superpowers/folhas/2026-09-23/p8-apagar.png`

🛑 **CHECKPOINT:** o critério é *a última luz é uma placa só, e depois o preto*.

- [ ] **Step 6: Commit**

```bash
git add scripts/_f8/_assar-apagar.mjs public/sprites/f8-carcaca-lava-sheet.png public/sprites/f8-carcaca-fria.png src/scenes/BootScene.ts src/scenes/final/sobrevoo.ts scripts/probe-interlude4.mjs docs/superpowers/folhas/2026-09-23/p8-apagar.png
git commit -m "feat(f8): a luz se apaga — a lava da carcaça esfria placa por placa até a última"
```

---

### Task 9: Tirar as baleias erradas e o que a cena velha deixou

**Files:**
- Modify: `src/scenes/BootScene.ts` (linhas ~386-389 e ~979-985), `src/systems/Fx.ts` (~79 e ~123-126)
- Delete: `public/sprites/leviathan-whale.png`, `leviathan-whale-dying.png`, `leviathan-whale-dying-sheet.png`, `leviathan-whale-split.png`

- [ ] **Step 1: Confirmar que só a cena velha usava**

Run: `git grep -n "leviathanWhale\|leviathan-whale\|'leviathan-dying'" -- src scripts`
Expected: só `BootScene.ts`, `Fx.ts` e `scripts/probe-interlude4.mjs` (a lista de baleias da sonda nova). **Qualquer outro arquivo: parar e perguntar a ele.**

- [ ] **Step 2: Remover as chaves e a animação**

Em `BootScene.ts`, apagar a entrada `leviathanWhaleDyingSheet` da `SHEETS` e o comentário acima dela (linhas ~383-389); apagar `leviathanWhale`, `leviathanWhaleDying`, `leviathanWhaleSplit` da `ART` e o comentário acima (linhas ~976-985). Em `Fx.ts`, apagar o bloco `if (tex.exists('leviathanWhaleDyingSheet') && !anims.exists('leviathan-dying')) { ... }` e a linha do comentário que o documenta (~79).

- [ ] **Step 3: Apagar os PNGs**

```bash
git rm public/sprites/leviathan-whale.png public/sprites/leviathan-whale-dying.png public/sprites/leviathan-whale-dying-sheet.png public/sprites/leviathan-whale-split.png
```

- [ ] **Step 4: Build e as duas sondas**

Run: `npm run build && node scripts/probe-interlude4.mjs && node scripts/probe-stage4.mjs`
Expected: `✔ CUTSCENE FINAL DE PONTA A PONTA` (agora com `✔ nenhuma baleia errada carregada`) e `✔ FASE 4 DE PONTA A PONTA (com o PREDADOR)`.

Também: `node scripts/probe-menu.mjs`. O menu usa `leviathan-alive-sheet`, não baleia, mas é a outra cena com Leviatã, então conferir que continua verde.

- [ ] **Step 5: Commit**

```bash
git add -A src/scenes/BootScene.ts src/systems/Fx.ts
git commit -m "chore(f8): as baleias erradas saem do jogo — a última dívida do Leviatã canônico"
```

---

### Task 10: O teste assistido e o fechamento

**Files:**
- Modify: `docs/HANDOFF.md` (o 🧭), `docs/superpowers/plans/2026-09-23-fatia8-cutscene-final-START.md` (marcar como feito)

- [ ] **Step 1: Ele assiste**

Com `npm run dev` no ar, pedir a ele: `L` → Fase 4 → matar o predador → a cena inteira. Depois, `F` no menu. Anotar o veredito **com as palavras dele**. Os pontos em aberto da spec a perguntar: *o corte de ~1,5s no M4 entre os capítulos 3 e 4 entra?* e *os tempos*. Cada ajuste de tempo é em `src/scenes/final/tempos.ts`, e cada ajuste de arte é no assador ou gerador daquela peça.

- [ ] **Step 2: Sondas finais**

Run: `npm run build && node scripts/probe-interlude4.mjs && node scripts/probe-stage4.mjs`
Expected: os dois `✔ ... DE PONTA A PONTA`.

- [ ] **Step 3: O 🧭 do HANDOFF**

Em `docs/HANDOFF.md`, na seção 🧭:
- tabela do roadmap: a linha 1 vira `✅ **0–8 fechadas** (a 8 em <data>)`, e a 2 (Calibragem) vira `🟠 **PRÓXIMA**`;
- "O estado em uma linha": trocar `GUARDIÃO → PREDADOR → O AFASTAMENTO` pela mesma sequência, com a nota de que a cena final foi refeita;
- tabela das fatias: a linha 8 vira `✅ <hash do merge>` com a porta `specs/2026-09-23-fatia8-cutscene-final-design.md`;
- a frase de arranque passa a apontar para a CALIBRAGEM;
- a seção "O que mora em cada etapa · 1" vira registro curto do que a Fatia 8 fez.

- [ ] **Step 4: Commit e merge**

```bash
git add docs/HANDOFF.md docs/superpowers/plans/2026-09-23-fatia8-cutscene-final-START.md
git commit -m "docs(f8): a Fatia 8 fecha — o passe visual acabou, a próxima frente é a calibragem"
git checkout main
git merge --no-ff feat/cutscene-final-visual -m "Merge branch 'feat/cutscene-final-visual' — Fatia 8: a cutscene final refeita"
```

⚠️ `git push origin main` **só com o OK dele**. Nunca para o `legacy`.
