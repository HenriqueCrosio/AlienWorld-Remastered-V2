# Menu "O DESPERTAR" — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformar a tela de menu num diorama vivo com entrada cinemática, tendo o Leviatã canônico (biomecânico, lava incandescente) como cara do jogo.

**Architecture:** `MenuScene` deixa de ser um quadro estático (key art com a baleia errada pintada dentro) e passa a COMPOR camadas: uma placa de fundo sem criatura (`menuBg`) + o Leviatã canônico como sprite animado por cima + atmosfera em engine (estrelas, brasas, névoa, passagem da nave) + UI. Uma linha do tempo de abertura (~3–4s, pulável) resolve num estado de repouso em loop. Cada asset novo passa pela guarda `textures.exists`; sem ele, o menu degrada para o caminho antigo (parallax + véu) e nunca abre em tela preta.

**Tech Stack:** TypeScript + Phaser 3.90, Vite, PixelLab (REST v2 via `scripts/*.mjs`), Playwright (sondas headless), sharp (montagem de sheets).

## Global Constraints

- **Resolução nativa 384×216** (`GAME_WIDTH`/`GAME_HEIGHT` de `src/config.ts`). Escala por inteiro.
- **Todo texto** passa por `pixelText(scene, x, y, value, { size, color })` de `src/ui.ts`. Tamanho mínimo 7px.
- **Paleta** só de `COLORS` (`src/config.ts`) — sem cores cruas novas fora de partículas.
- **Guarda de asset:** todo asset novo é usado só após `this.textures.exists(<key>)` (imagens) / `this.anims.exists(<key>)` (animações). O jogo NUNCA abre em tela preta por PNG faltando.
- **Um Leviatã canônico:** PixelLab object `f397793a-0e59-49e2-9853-848b674b3fd7` ("colossal biomechanical space leviathan, side view"), USER `f7282f36-b779-4f64-832a-4693ca4cc628`. As duas versões erradas (tubarão esguio / jubarte) NÃO entram no menu.
- **Comentários em português**, na densidade e no tom do código vizinho.
- **Commits são de autoria só do Henrique** — SEM `Co-Authored-By`.
- **Sondas rodam contra o dev server:** `npm run dev` (porta 5173) tem que estar de pé; a sonda é headless com swiftshader.

---

## Estrutura de arquivos

| Arquivo | Papel | Ação |
|---------|-------|------|
| `src/scenes/MenuScene.ts` | A cena do menu — todo o diorama, a cinemática, a UI, o fallback | **Reescrever** |
| `src/scenes/BootScene.ts` | Carga de assets (`ART`, `SHEETS`) | **Modificar** (2 entradas novas) |
| `public/sprites/menu-bg.png` | Placa de fundo sem criatura (asset A) | **Criar** (PixelLab) |
| `public/sprites/leviathan-alive-sheet.png` | Sheet do Leviatã VIVO/idle (asset B) | **Criar** (PixelLab) |
| `scripts/probe-menu.mjs` | Sonda do estado montado do menu | **Reescrever** (asserts novos) |
| `scripts/probe-menu-intro.mjs` | Sonda de um frame da cinemática | **Criar** |
| `docs/HANDOFF.md` | Diário de bordo do projeto | **Modificar** (fecho da leva) |

**Chaves e caminhos fixados (usados por várias tarefas):**
- Imagem de fundo: key `menuBg` → `sprites/menu-bg.png` (mapa `ART`).
- Sheet do Leviatã vivo: key `leviathanAliveSheet` → `sprites/leviathan-alive-sheet.png` (mapa `SHEETS`).
- Animação registrada: `leviathan-alive`.

---

## Task 1: MenuScene reestruturado (diorama + fallback + reduced-motion + skip)

Reescreve a cena para COMPOR camadas com um estado de repouso (`settle`) e uma abertura (`playIntro`), pulável por qualquer tecla e curto-circuitada por `prefers-reduced-motion`. Nesta tarefa ainda NÃO há assets novos: o fundo cai no fallback de parallax e não há Leviatã — o objetivo é a espinha da cena, testável já.

**Files:**
- Modify: `src/scenes/MenuScene.ts` (reescrita completa)
- Test: `scripts/probe-menu.mjs` (reescrita — asserts do novo estado)

**Interfaces:**
- Consumes: `pixelText` (`src/ui.ts`), `Starfield`/`Parallax` (`src/`), `Music.play` (`src/systems/Music.ts`), `resetVariantCache` (`src/art.ts`), `COLORS`/`GAME_WIDTH`/`GAME_HEIGHT`/`SCROLL_SPEED` (`src/config.ts`), `HandlingMode` (`./GameScene`).
- Produces (métodos internos que as tarefas seguintes estendem):
  - `private buildBackground(): void` — monta o fundo (placa `menuBg` OU fallback parallax).
  - `private buildLeviathan(): void` — no-op nesta tarefa; a Task 3 preenche.
  - `private buildAtmosphere(): void` — no-op nesta tarefa; a Task 5 preenche.
  - `private buildUI(): void` — título, sub, CTA, conduções, hints de dev; todos criados já no estado FINAL de posição, com alpha 0.
  - `private settle(): void` — leva todos os alvos ao estado de repouso (alpha final) sem animar.
  - `private playIntro(): void` — a linha do tempo (Task 4 a preenche; aqui só chama `settle()` ao fim).
  - `private skipIntro(): void` — mata os tweens de intro e chama `settle()`.
  - campos: `reducedMotion: boolean`, `settled: boolean`, `introTweens: Phaser.Tweens.Tween[]`, `uiTargets: Phaser.GameObjects.GameObject[]`.

- [ ] **Step 1: Reescrever a sonda para o novo estado (o teste que falha primeiro)**

Substituir `scripts/probe-menu.mjs` inteiro por:

```javascript
// Sonda do MENU "O DESPERTAR": o diorama vivo montado (estado de REPOUSO).
//
// O que ela prova: o fundo está na cena (placa `menuBg` OU o fallback de parallax), o TÍTULO
// existe e é grande (≥20px) e visível (alpha ≥0.8), o subtítulo, o CTA e as TRÊS conduções
// estão lá no terço de baixo, e o menu chegou ao estado montado (settled) — nada preso no meio
// de um fade. Fotografa parada: a primeira impressão se mede em repouso.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// A cinemática dura ~3–4s. Esperar folgado: fotografar no meio mede o fade, não o menu.
await page.waitForTimeout(5000);
await page.screenshot({ path: 'probe-menu.png' });

const estado = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const filhos = s.children.list;

  const fundoPlaca = filhos.find((c) => c.type === 'Image' && c.texture?.key === 'menuBg');
  const temFallback = !!s.parallax; // o campo público do fallback

  const textos = filhos.filter((c) => c.type === 'Text').map((c) => ({
    valor: c.text,
    alpha: +c.alpha.toFixed(2),
    y: Math.round(c.y),
    tamanho: parseInt(c.style.fontSize, 10),
  }));
  const texto = (trecho) => textos.find((t) => t.valor.replace(/ /g, '').includes(trecho));

  return {
    settled: s.settled,
    fundo: fundoPlaca ? 'placa' : temFallback ? 'fallback' : null,
    titulo: texto('ALIENWORLD'),
    subtitulo: texto('REMASTERED'),
    cta: texto('ENTER'),
    opcoes: [texto('[1]'), texto('[2]'), texto('[3]')].map((t) => t ?? null),
  };
});

console.log(JSON.stringify(estado, null, 1));

ok(estado.settled === true, 'o menu chegou ao estado montado (settled)');
ok(estado.fundo !== null, `há um fundo na cena (${estado.fundo})`);
ok(!!estado.titulo, 'o título ALIEN WORLD existe');
ok(estado.titulo && estado.titulo.alpha >= 0.8, `o título está VISÍVEL (alpha ${estado.titulo?.alpha})`);
ok(estado.titulo && estado.titulo.tamanho >= 20, `o título tem tratamento de TÍTULO (${estado.titulo?.tamanho}px ≥ 20)`);
ok(!!estado.subtitulo, 'o subtítulo REMASTERED existe');
ok(!!estado.cta, 'o CTA "ENTER · COMEÇAR" existe');
ok(estado.opcoes.every((o) => o !== null), 'as TRÊS conduções estão no menu ([1] [2] [3])');
ok(estado.opcoes.every((o) => o && o.y > 148), `as opções estão no terço de baixo (y: ${estado.opcoes.map((o) => o?.y)})`);

console.log('screenshot: probe-menu.png');
console.log(falhas === 0 ? '\n✔ MENU DE PONTA A PONTA' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar a sonda e ver falhar**

Com o dev server rodando em outro terminal (`npm run dev`), rodar:

```bash
node scripts/probe-menu.mjs
```

Esperado: FALHA — o `MenuScene` atual não expõe `settled`, não tem `menuBg`, e o título tem 20px de tamanho mas o assert de `settled` quebra (`s.settled` é `undefined`). Confirma que a sonda mede o comportamento NOVO.

- [ ] **Step 3: Reescrever `src/scenes/MenuScene.ts`**

Substituir o arquivo inteiro por:

```typescript
import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH, SCROLL_SPEED } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Music } from '../systems/Music';
import type { HandlingMode } from './GameScene';

/**
 * A TELA-TÍTULO — "O DESPERTAR".
 *
 * Não é mais um quadro parado: é um DIORAMA que compõe camadas (fundo sem criatura + o Leviatã
 * canônico animado por cima + atmosfera em engine + UI) e ACORDA numa cinemática curta que
 * assenta num loop de repouso. Qualquer tecla pula a abertura; `prefers-reduced-motion` vai
 * direto ao repouso.
 *
 * Cada asset é OPCIONAL e passa pela guarda `textures.exists`: sem a placa `menuBg`, o fundo cai
 * no parallax da fase (o layout antigo); sem a sheet do Leviatã vivo, o menu simplesmente não
 * mostra a criatura. O jogo nunca abre em tela preta.
 */
export class MenuScene extends Phaser.Scene {
  // Públicos: a sonda lê estes campos.
  parallax: Parallax | null = null;
  settled = false;

  private starfield: Starfield | null = null;
  private leviatan: Phaser.GameObjects.Sprite | null = null;
  private reducedMotion = false;
  private introTweens: Phaser.Tweens.Tween[] = [];
  /** Tudo que a abertura faz surgir (fade de 0→alvo). O `settle` os fixa no alvo. */
  private uiTargets: { obj: Phaser.GameObjects.GameObject & { alpha: number }; alpha: number }[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    resetVariantCache();
    this.settled = false;
    this.introTweens = [];
    this.uiTargets = [];
    this.reducedMotion =
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.buildBackground();
    this.buildLeviathan();
    this.buildAtmosphere();
    this.buildUI();

    // A faixa atravessa a transição de cena sem corte (Music.play não reinicia se já toca).
    Music.play(this, 'stage1');

    this.bindKeys();

    if (this.reducedMotion) this.settle();
    else this.playIntro();
  }

  // ─── Camadas ────────────────────────────────────────────────────────────────

  /** O fundo: a placa nova sem criatura, OU o parallax da fase como fallback. */
  private buildBackground(): void {
    if (this.textures.exists('menuBg')) {
      this.add.image(0, 0, 'menuBg').setOrigin(0, 0).setDepth(0).setName('menuBgPlate');
      // Estrelas de cintilação sobre a placa (a placa é um quadro parado; elas devolvem o vivo).
      this.twinkleStars();
      return;
    }

    // FALLBACK: o parallax da fase rolando atrás de um véu escuro — nunca uma tela preta.
    this.starfield = new Starfield(this);
    this.parallax = new Parallax(this);
    this.add
      .rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, 0.55)
      .setOrigin(0, 0)
      .setDepth(5);
  }

  /** O Leviatã VIVO. Preenchido na Task 3; sem a sheet, não há criatura. */
  private buildLeviathan(): void {
    // (Task 3)
  }

  /** Brasas, névoa e a passagem da nave. Preenchido na Task 5. */
  private buildAtmosphere(): void {
    // (Task 5)
  }

  /**
   * Título, subtítulo, CTA e conduções — criados JÁ na posição final, com alpha 0. A abertura
   * (ou o `settle`) é quem os revela. Registrados em `uiTargets` com o alpha de repouso de cada um.
   */
  private buildUI(): void {
    const titulo = this.t(GAME_WIDTH / 2, 122, 'ALIEN WORLD', 20, COLORS.playerGlow);
    const sub = this.t(GAME_WIDTH / 2, 139, 'R E M A S T E R E D', 8, COLORS.player);
    const cta = this.t(GAME_WIDTH / 2, 157, 'ENTER · COMEÇAR', 8, COLORS.playerGlow);
    const rot = this.t(GAME_WIDTH / 2, 170, '— CONDUÇÃO —', 7, COLORS.metalLight);
    const c1 = this.t(GAME_WIDTH / 2, 182, '[1]  DIEGÉTICA · a gravidade decide · recomendado', 8, COLORS.playerBright);
    const c2 = this.t(GAME_WIDTH / 2, 194, '[2]  LEGACY · flap sempre · score ×1.25', 8, COLORS.hot);
    const c3 = this.t(GAME_WIDTH / 2, 206, '[3]  LIVRE · voo livre sempre · acessível', 8, COLORS.player);

    for (const obj of [titulo, sub, cta, rot, c1, c2, c3]) {
      obj.setAlpha(0);
      this.uiTargets.push({ obj, alpha: 1 });
    }
    // O título repousa um degrau abaixo do branco puro (o pulso da Task 4 vai de 0.82↔1).
    this.uiTargets[0].alpha = 1;

    if (import.meta.env.DEV) {
      const d1 = this.t(GAME_WIDTH / 2, 8, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, COLORS.metalMid);
      const d2 = this.t(GAME_WIDTH / 2, 16, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, COLORS.metalMid);
      for (const obj of [d1, d2]) {
        obj.setAlpha(0);
        this.uiTargets.push({ obj, alpha: 1 });
      }
    }
  }

  // ─── Estados: repouso e abertura ─────────────────────────────────────────────

  /** Fixa tudo no estado de repouso, sem animar. É o destino da abertura e do reduced-motion. */
  private settle(): void {
    for (const { obj, alpha } of this.uiTargets) obj.setAlpha(alpha);
    const plate = this.children.getByName('menuBgPlate') as Phaser.GameObjects.Image | null;
    plate?.setAlpha(1);
    this.leviatan?.setAlpha(1);
    this.settled = true;
  }

  /** A abertura. A coreografia entra na Task 4; por ora, assenta imediatamente. */
  private playIntro(): void {
    // (Task 4 preenche a linha do tempo; ao fim dela, chamar this.settle())
    this.settle();
  }

  /** Pula a abertura: mata os tweens em curso e vai ao repouso. */
  private skipIntro(): void {
    if (this.settled) return;
    for (const tw of this.introTweens) tw.remove();
    this.introTweens = [];
    this.settle();
  }

  /**
   * Estrelas que CINTILAM sobre a placa. Posições a dedo no céu livre (a mesma lógica do menu
   * antigo). Sem custo de animação de pintura — só uma dúzia de pontos piscando.
   */
  private twinkleStars(): void {
    const PONTOS: [number, number][] = [
      [18, 30], [58, 12], [95, 55], [115, 20], [255, 18], [280, 48],
      [310, 14], [370, 22], [375, 105], [250, 100], [70, 85], [30, 110],
    ];
    for (const [x, y] of PONTOS) {
      const estrela = this.add
        .rectangle(x, y, 1, 1, Math.random() < 0.5 ? COLORS.starBright : COLORS.starMid)
        .setDepth(1)
        .setAlpha(0.15);
      if (this.reducedMotion) {
        estrela.setAlpha(0.7);
        continue;
      }
      this.tweens.add({
        targets: estrela,
        alpha: Phaser.Math.FloatBetween(0.6, 1),
        duration: Phaser.Math.Between(900, 2300),
        delay: Phaser.Math.Between(0, 2000),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  // ─── Teclas ─────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard!;

    // Qualquer tecla durante a abertura pula direto ao menu montado.
    kb.on('keydown', () => {
      if (!this.settled) this.skipIntro();
    });

    kb.on('keydown-ENTER', () => this.start('diegetico'));
    kb.on('keydown-SPACE', () => this.start('diegetico'));
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    if (import.meta.env.DEV) {
      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () =>
        this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-M', () => this.scene.start('Game', { stage: 3, handling: 'diegetico' }));
      kb.on('keydown-N', () =>
        this.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-I', () =>
        this.scene.start('Interlude', { score: 4820, handling: 'diegetico' }),
      );
      kb.on('keydown-O', () =>
        this.scene.start('Interlude2', {
          score: 9140,
          handling: 'diegetico',
          ship: 'cinza',
          stage: 3,
        }),
      );
      kb.on('keydown-L', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', ship: 'alien' }),
      );
      kb.on('keydown-K', () =>
        this.scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }),
      );
      kb.on('keydown-P', () =>
        this.scene.start('Interlude3', {
          score: 15200,
          handling: 'diegetico',
          ship: 'alien',
          stage: 4,
        }),
      );
      kb.on('keydown-F', () =>
        this.scene.start('Interlude4', {
          score: 21000,
          handling: 'diegetico',
          ship: 'alien',
          stage: null,
          stageDone: 4,
          practice: false,
          baseScore: 15200,
        }),
      );
    }
  }

  override update(_time: number, delta: number): void {
    if (!this.starfield || !this.parallax) return;
    const dt = delta / 1000;
    this.starfield.update(dt);
    this.parallax.update(dt, SCROLL_SPEED * 0.5);
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }
}
```

- [ ] **Step 4: Verificar tipos**

```bash
npm run typecheck
```

Esperado: PASS (sem erros de TypeScript). Se acusar `window.matchMedia` ou `import.meta.env.DEV`, confirmar que o `tsconfig`/`vite-env` já os declara (o projeto usa ambos hoje).

- [ ] **Step 5: Rodar a sonda e ver passar**

Com `npm run dev` de pé:

```bash
node scripts/probe-menu.mjs
```

Esperado: PASS — `settled=true`, `fundo=fallback` (a placa `menuBg` ainda não existe), título 20px visível, subtítulo/CTA/3 conduções presentes no terço de baixo.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.ts scripts/probe-menu.mjs
git commit -m "feat(menu): reestrutura o menu em diorama — settle/intro/skip + reduced-motion + fallback"
```

---

## Task 2: Placa de fundo sem criatura (asset A)

Gera e instala a placa de fundo do menu (horizonte lunar + lua morta + céu, SEM criatura) e liga o `buildBackground` a preferi-la.

**Files:**
- Create: `public/sprites/menu-bg.png`
- Modify: `src/scenes/BootScene.ts` (1 entrada em `ART`)
- Modify: `scripts/probe-menu.mjs` (assert do fundo = placa)

**Interfaces:**
- Consumes: `buildBackground()` da Task 1 (já prefere `menuBg` quando existe).
- Produces: textura `menuBg` (384×216) carregada no Boot.

- [ ] **Step 1: Gerar a placa no PixelLab**

Gerar um fundo 384×216 do horizonte lunar com a lua morta, SEM nenhuma criatura, na paleta Deep Void. Usar a key art atual como referência de estilo (paleta/tratamento), recortando fora a baleia se preciso, ou gerar do zero:

```bash
node scripts/gerar.mjs "desolate alien lunar horizon at night, huge dead cratered moon low in a starry sky, jagged dark mountain ridges in layered depth, deep void palette dark blue and teal, cinematic wide establishing shot, NO creatures NO animals NO whale, pixel art" 384 side
```

Esperado: imprime um `object-id`. Julgar AMPLIADO com `node scripts/sheet.mjs <object-id>` e regenerar até o Henrique aprovar (checkpoint de arte — a placa é a cara do jogo).

> **Nota:** a geração é iterativa e revisada pelo Henrique. Não avançar sem o "ok" dele na placa.

- [ ] **Step 2: Instalar a placa aprovada**

Instalar o PNG aprovado como `public/sprites/menu-bg.png` (via `node scripts/install-sprite.mjs <object-id> menu-bg` — o pipeline de sempre, que limpa xadrez/bordas). Confirmar dimensão:

```bash
node -e "import('sharp').then(s=>s.default('public/sprites/menu-bg.png').metadata().then(m=>console.log(m.width+'x'+m.height)))"
```

Esperado: `384x216`. Se a saída do gerador vier menor, reescalar por inteiro no install e remedir.

- [ ] **Step 3: Registrar a textura no Boot**

Em `src/scenes/BootScene.ts`, no mapa `ART`, logo abaixo da linha `menuKeyart: 'sprites/menu-keyart.png',` (por volta da linha 375), adicionar:

```typescript
  // A PLACA DE FUNDO DO MENU (passe visual "O DESPERTAR"): horizonte lunar + lua morta + céu,
  // SEM criatura — o Leviatã canônico é composto por cima como sprite animado (MenuScene).
  // Sem placeholder: sem ela, o menu cai no fundo antigo (parallax + véu).
  menuBg: 'sprites/menu-bg.png',
```

- [ ] **Step 4: Endurecer o assert do fundo na sonda**

Em `scripts/probe-menu.mjs`, trocar a linha do assert do fundo para exigir a PLACA (agora que ela existe):

```javascript
ok(estado.fundo === 'placa', `o fundo é a placa nova sem criatura (${estado.fundo})`);
```

- [ ] **Step 5: Rodar a sonda e ver passar**

Com `npm run dev` de pé:

```bash
node scripts/probe-menu.mjs
```

Esperado: PASS — `fundo=placa`. Abrir `probe-menu.png` e confirmar a olho: horizonte lunar, lua morta, céu — e NENHUMA baleia pintada.

- [ ] **Step 6: Commit**

```bash
git add public/sprites/menu-bg.png src/scenes/BootScene.ts scripts/probe-menu.mjs
git commit -m "feat(menu): placa de fundo sem criatura (asset A) — o palco limpo do diorama"
```

---

## Task 3: Leviatã VIVO / idle (asset B)

Cria a animação de idle do Leviatã canônico (lava respirando + ondulação), monta a sheet, registra a anim e compõe o sprite no diorama.

**Files:**
- Create: `public/sprites/leviathan-alive-sheet.png`
- Modify: `src/scenes/BootScene.ts` (1 entrada em `SHEETS`)
- Modify: `src/scenes/MenuScene.ts` (`registerLeviathanAlive` + `buildLeviathan`)
- Modify: `scripts/probe-menu.mjs` (assert do Leviatã)

**Interfaces:**
- Consumes: object canônico `f397793a-...`; `buildLeviathan()` (stub da Task 1).
- Produces:
  - textura `leviathanAliveSheet` (sheet de N células W×H).
  - animação `leviathan-alive` (loop, yoyo).
  - `private registerLeviathanAlive(): void` (registra a anim com guarda `anims.exists`).
  - `this.leviatan: Phaser.GameObjects.Sprite` posicionado no céu do diorama.

- [ ] **Step 1: Gerar a animação de idle no PixelLab**

Animar o objeto canônico com uma descrição de ESTAR VIVO (sem morte, sem explosões):

```bash
node scripts/animar.mjs f397793a-0e59-49e2-9853-848b674b3fd7 "the biomechanical leviathan hovers alive and menacing, the glowing lava cracks along its ribs and spine pulse slowly like a heartbeat, the body and tail undulate gently, calm and ominous, no explosions" 8
```

Esperado: imprime o `animation_id` (salvo em `scripts/_anim-resp.json`). Julgar os quadros e regerar até o Henrique aprovar (checkpoint de arte).

- [ ] **Step 2: Montar a sheet a partir dos quadros**

```bash
node scripts/anim-sheet.mjs f397793a-0e59-49e2-9853-848b674b3fd7 <animation_id> leviathan-alive
```

Esperado: cria `public/sprites/leviathan-alive-sheet.png` e imprime `N quadros de WxH (sheet …)`. **Anotar o W×H impresso** — é o tamanho de célula que vai no `SHEETS` (Step 3). Revisar `scripts/_anim-leviathan-alive-review.png`.

- [ ] **Step 3: Registrar a sheet no Boot**

Em `src/scenes/BootScene.ts`, no mapa `SHEETS` (por volta da linha 159, junto do `leviathanWhaleDyingSheet`), adicionar. O objeto canônico é 116×116, então o esperado é `w: 116, h: 116` — **confirmar contra o `W×H` impresso no Step 2 e ajustar se diferir**:

```typescript
  // O LEVIATÃ VIVO (menu "O DESPERTAR"): o objeto canônico biomecânico com a lava das costelas
  // pulsando num ritmo cardíaco e o corpo ondulando. É a cara do jogo. Célula quadrada 116×116
  // (o tamanho impresso por anim-sheet.mjs); 8 quadros lado a lado.
  leviathanAliveSheet: { path: 'sprites/leviathan-alive-sheet.png', w: 116, h: 116 },
```

- [ ] **Step 4: Registrar a animação e compor o sprite no MenuScene**

Em `src/scenes/MenuScene.ts`:

(a) Adicionar a chamada de registro no início de `create()`, logo após `resetVariantCache();`:

```typescript
    this.registerLeviathanAlive();
```

(b) Preencher o método `buildLeviathan` (substituir o stub) — **substituir `N-1` pelo índice do último quadro** (nº de quadros do Step 2 menos 1):

```typescript
  /**
   * O Leviatã VIVO: a estrela do diorama. Sprite animado (`leviathan-alive`) pairando no céu,
   * a lava pulsando. Sem a sheet, o método é um no-op — o menu roda sem a criatura.
   */
  private buildLeviathan(): void {
    if (!this.anims.exists('leviathan-alive')) return;

    // Posto no céu livre, acima do horizonte, à esquerda da lua. Escala calibrada para ele ler
    // IMPONENTE sem cobrir o título (que mora em y≈122).
    this.leviatan = this.add
      .sprite(150, 78, 'leviathanAliveSheet', 0)
      .setDepth(10)
      .setScale(1.6);
    this.leviatan.play('leviathan-alive');

    // Um bob vertical lentíssimo — "pairando", não voando. Desligado no reduced-motion.
    if (!this.reducedMotion) {
      this.tweens.add({
        targets: this.leviatan,
        y: '+=4',
        duration: 3200,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }
```

(c) Adicionar o método de registro (perto de `twinkleStars`). Com 8 quadros gerados, o último índice é `7` — **ajustar `end` para (nº de quadros do Step 2) − 1 se você gerou uma contagem diferente**:

```typescript
  /**
   * Registra a animação do Leviatã vivo UMA vez (a cena recria a cada entrada; `anims.exists`
   * evita o grito de chave repetida). Yoyo: a respiração da lava tem que ser um loop sem salto.
   */
  private registerLeviathanAlive(): void {
    if (this.textures.exists('leviathanAliveSheet') && !this.anims.exists('leviathan-alive')) {
      this.anims.create({
        key: 'leviathan-alive',
        frames: this.anims.generateFrameNumbers('leviathanAliveSheet', { start: 0, end: 7 }),
        frameRate: 6,
        repeat: -1,
        yoyo: true,
      });
    }
  }
```

- [ ] **Step 5: Fixar o Leviatã no `settle`**

Já coberto na Task 1 (`settle()` faz `this.leviatan?.setAlpha(1)`). Confirmar que a linha existe.

- [ ] **Step 6: Adicionar o assert do Leviatã na sonda**

Em `scripts/probe-menu.mjs`, dentro do `page.evaluate`, adicionar ao objeto retornado:

```javascript
    leviatan: (() => {
      const s2 = window.__game.scene.getScene('Menu');
      const lev = s2.children.list.find(
        (c) => c.type === 'Sprite' && c.texture?.key === 'leviathanAliveSheet',
      );
      return lev ? { anim: lev.anims?.currentAnim?.key ?? null, alpha: +lev.alpha.toFixed(2) } : null;
    })(),
```

E, após os outros `ok(...)`, adicionar:

```javascript
ok(!!estado.leviatan, 'o Leviatã VIVO está na cena');
ok(estado.leviatan?.anim === 'leviathan-alive', `o Leviatã está tocando o idle (${estado.leviatan?.anim})`);
ok(estado.leviatan?.alpha >= 0.9, `o Leviatã está visível (alpha ${estado.leviatan?.alpha})`);
```

- [ ] **Step 7: Verificar tipos, rodar a sonda**

```bash
npm run typecheck
node scripts/probe-menu.mjs
```

Esperado: typecheck PASS; sonda PASS com o Leviatã tocando `leviathan-alive`. Conferir `probe-menu.png` a olho: o bicho biomecânico com a lava, imponente, sem cobrir o título.

- [ ] **Step 8: Commit**

```bash
git add public/sprites/leviathan-alive-sheet.png src/scenes/BootScene.ts src/scenes/MenuScene.ts scripts/probe-menu.mjs
git commit -m "feat(menu): Leviatã VIVO/idle (asset B) — o canônico biomecânico como cara do jogo"
```

---

## Task 4: A cinemática de abertura + tratamento de tipografia

Preenche `playIntro()` com a linha do tempo dos beats e o pulso do título/CTA. Adiciona uma sonda de um frame do meio da abertura.

**Files:**
- Modify: `src/scenes/MenuScene.ts` (`playIntro` + pulsos)
- Create: `scripts/probe-menu-intro.mjs`

**Interfaces:**
- Consumes: `buildBackground`/`buildLeviathan`/`buildUI` (camadas já montadas com alpha 0), `settle()`, `introTweens`.
- Produces: `playIntro()` completo que termina chamando `settle()`; pulsos de repouso no título e no CTA.

- [ ] **Step 1: Escrever a sonda da cinemática (o teste que falha primeiro)**

Criar `scripts/probe-menu-intro.mjs`:

```javascript
// Sonda da ABERTURA do menu: fotografa um frame NO MEIO da cinemática e prova que ela existe
// (o menu ainda NÃO está montado) e que a tecla PULA para o estado montado.
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// 700ms: dentro da janela da abertura (~3–4s), longe do fim. O menu NÃO deve estar montado.
await page.waitForTimeout(700);
await page.screenshot({ path: 'probe-menu-intro.png' });
const meio = await page.evaluate(() => window.__game.scene.getScene('Menu').settled);
ok(meio === false, 'a 700ms a cinemática ainda ESTÁ rodando (settled=false)');

// Uma tecla PULA a abertura: em seguida o menu tem que estar montado.
await page.keyboard.press('X');
await page.waitForTimeout(150);
const depois = await page.evaluate(() => window.__game.scene.getScene('Menu').settled);
ok(depois === true, 'qualquer tecla PULA a abertura (settled=true após a tecla)');

console.log('screenshot: probe-menu-intro.png');
console.log(falhas === 0 ? '\n✔ ABERTURA OK' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
node scripts/probe-menu-intro.mjs
```

Esperado: FALHA no primeiro assert — hoje `playIntro()` chama `settle()` na hora, então a 700ms `settled` já é `true`. Confirma que a sonda mede a cinemática que ainda não existe.

- [ ] **Step 3: Preencher `playIntro()`**

Em `src/scenes/MenuScene.ts`, substituir o corpo do método `playIntro` por:

```typescript
  /**
   * A ABERTURA — "O DESPERTAR". Os beats (ver docs/superpowers/specs): a placa acorda, o Leviatã
   * respira, o título BATE, a UI surge. Cada tween entra em `introTweens` para o skip poder
   * matá-los. O último beat chama `settle()` — a fonte única do estado de repouso.
   */
  private playIntro(): void {
    const plate = this.children.getByName('menuBgPlate') as Phaser.GameObjects.Image | null;

    // Beat 1: a placa acorda (fade ~1s). Sem placa (fallback), começa já visível.
    if (plate) {
      plate.setAlpha(0);
      this.introTweens.push(
        this.tweens.add({ targets: plate, alpha: 1, duration: 1000, ease: 'Cubic.easeOut' }),
      );
    }

    // Beat 2: o Leviatã desliza entrando e pousa (o bob contínuo já roda por baixo).
    if (this.leviatan) {
      const alvoX = this.leviatan.x;
      this.leviatan.setAlpha(0).setX(alvoX - 40);
      this.introTweens.push(
        this.tweens.add({ targets: this.leviatan, alpha: 1, duration: 900, delay: 1100, ease: 'Cubic.easeOut' }),
      );
      this.introTweens.push(
        this.tweens.add({ targets: this.leviatan, x: alvoX, duration: 1400, delay: 1100, ease: 'Cubic.easeOut' }),
      );
    }

    // Beat 3: o título BATE (surge com um leve overshoot de escala) e o resto da UI surge atrás.
    const titulo = this.uiTargets[0]?.obj as Phaser.GameObjects.Text | undefined;
    if (titulo) {
      titulo.setScale(1.14);
      this.introTweens.push(
        this.tweens.add({ targets: titulo, alpha: 1, duration: 500, delay: 2200, ease: 'Cubic.easeOut' }),
      );
      this.introTweens.push(
        this.tweens.add({ targets: titulo, scale: 1, duration: 600, delay: 2200, ease: 'Back.easeOut' }),
      );
    }
    for (let i = 1; i < this.uiTargets.length; i++) {
      const { obj, alpha } = this.uiTargets[i];
      this.introTweens.push(
        this.tweens.add({ targets: obj, alpha, duration: 500, delay: 2600 + i * 40, ease: 'Cubic.easeOut' }),
      );
    }

    // Fecho: aos ~3.3s o estado montado é oficial (e liga os pulsos de repouso).
    this.time.delayedCall(3300, () => {
      if (!this.settled) {
        this.settle();
        this.startRestPulses();
      }
    });
  }

  /** Os pulsos do estado de repouso: o brilho vivo do título e o pisca-pisca do CTA. */
  private startRestPulses(): void {
    if (this.reducedMotion) return;
    const titulo = this.uiTargets[0]?.obj as Phaser.GameObjects.Text | undefined;
    const cta = this.uiTargets[2]?.obj as Phaser.GameObjects.Text | undefined;
    if (titulo) {
      this.tweens.add({
        targets: titulo, alpha: 0.82, duration: 2600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
    if (cta) {
      this.tweens.add({
        targets: cta, alpha: 0.4, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    }
  }
```

Observação: no reduced-motion, `create()` chama `settle()` direto (sem `playIntro`), então os pulsos não ligam — correto.

- [ ] **Step 3b: Religar os pulsos ao PULAR a abertura**

Ainda em `src/scenes/MenuScene.ts`, no método `skipIntro` (criado na Task 1), acrescentar a chamada dos pulsos após o `settle()`, para que pular a abertura não deixe o CTA e o título estáticos:

```typescript
  private skipIntro(): void {
    if (this.settled) return;
    for (const tw of this.introTweens) tw.remove();
    this.introTweens = [];
    this.settle();
    this.startRestPulses();
  }
```

- [ ] **Step 4: Rodar a sonda da abertura e ver passar**

```bash
node scripts/probe-menu-intro.mjs
```

Esperado: PASS — a 700ms `settled=false`; após a tecla, `settled=true`.

- [ ] **Step 5: Rodar a sonda do estado montado (não regrediu)**

```bash
node scripts/probe-menu.mjs
```

Esperado: PASS — a sonda espera 5s (> 3.3s da abertura), então mede o estado montado normalmente.

- [ ] **Step 6: Verificar tipos + commit**

```bash
npm run typecheck
git add src/scenes/MenuScene.ts scripts/probe-menu-intro.mjs
git commit -m "feat(menu): cinemática de abertura O DESPERTAR + pulsos de repouso + sonda da intro"
```

---

## Task 5: Atmosfera — brasas, névoa e a passagem da nave

Preenche `buildAtmosphere()`: partículas de brasa/esporo subindo, uma névoa baixa sutil e passagens ocasionais da nave-jogador. Tudo desligado no reduced-motion.

**Files:**
- Modify: `src/scenes/MenuScene.ts` (`buildAtmosphere` + `shipPass`)
- Modify: `scripts/probe-menu.mjs` (assert de que reduced-motion NÃO cria partículas)

**Interfaces:**
- Consumes: texturas `spark` (2×2, aditiva) e `ship` (ambas geradas no Boot); `reducedMotion`.
- Produces: `buildAtmosphere()` completo; `private shipPass(): void` (uma travessia agendada em loop).

- [ ] **Step 1: Preencher `buildAtmosphere()`**

Em `src/scenes/MenuScene.ts`, substituir o stub por:

```typescript
  /**
   * A atmosfera do diorama: brasas subindo (o Leviatã sangra luz), uma névoa baixa no horizonte,
   * e a nave-jogador cruzando ao longe de vez em quando. Puro engine — nada de PixelLab. No
   * reduced-motion, NADA disto entra: a cena fica um quadro parado e legível.
   */
  private buildAtmosphere(): void {
    if (this.reducedMotion) return;

    // Brasas/esporos: fagulhas quentes subindo devagar da faixa baixa, aditivas (viram brilho).
    this.add
      .particles(0, 0, 'spark', {
        x: { min: 0, max: GAME_WIDTH },
        y: { min: 150, max: GAME_HEIGHT },
        lifespan: 4200,
        speedY: { min: -14, max: -5 },
        speedX: { min: -4, max: 4 },
        scale: { min: 0.5, max: 1.4 },
        alpha: { start: 0, end: 0 }, // sobe do escuro e some no escuro
        tint: [COLORS.hot, COLORS.hotBright, COLORS.player],
        frequency: 320,
        blendMode: 'ADD',
      })
      .setDepth(12);

    // Névoa baixa: uma faixa translúcida bem sutil no horizonte, respirando de leve.
    const nevoa = this.add
      .rectangle(0, 138, GAME_WIDTH, 24, COLORS.bgFar, 0.12)
      .setOrigin(0, 0)
      .setDepth(6);
    this.tweens.add({
      targets: nevoa, alpha: 0.2, duration: 4000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
    });

    // A nave: primeira passagem depois da abertura, e daí em loop espaçado.
    this.time.delayedCall(4500, () => this.shipPass());
  }

  /**
   * Uma travessia da nave-jogador: entra pela esquerda, cruza o céu ao longe (pequena, com o
   * rastro azul) e sai pela direita. Reagenda a próxima em intervalo aleatório e amplo — evento
   * pontual, não tráfego.
   */
  private shipPass(): void {
    if (!this.scene.isActive()) return;

    const y = Phaser.Math.Between(96, 116);
    // A `ship` estática (com o rastro azul já desenhado) basta ao longe — sem custo de sprite
    // animado no menu.
    const nave = this.add.image(-20, y, 'ship').setDepth(14).setScale(0.7).setAlpha(0.85);

    this.tweens.add({
      targets: nave,
      x: GAME_WIDTH + 20,
      duration: Phaser.Math.Between(7000, 9000),
      ease: 'Linear',
      onComplete: () => nave.destroy(),
    });

    this.time.delayedCall(Phaser.Math.Between(11000, 18000), () => this.shipPass());
  }
```

- [ ] **Step 2: Verificar tipos**

```bash
npm run typecheck
```

Esperado: PASS.

- [ ] **Step 3: Rodar a sonda do estado montado (não regrediu)**

```bash
node scripts/probe-menu.mjs
```

Esperado: PASS. Conferir `probe-menu.png`: brasas quentes subindo, névoa sutil (a nave pode ou não estar no quadro — é pontual).

- [ ] **Step 4: Provar o reduced-motion**

Adicionar ao final de `scripts/probe-menu.mjs`, ANTES do `await browser.close();`, um segundo passe que emula reduced-motion numa página nova:

```javascript
// ─── Reduced-motion: a cena tem que montar DIRETO e SEM partículas ───
const page2 = await browser.newPage();
await page2.emulateMedia({ reducedMotion: 'reduce' });
await page2.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page2.waitForTimeout(800); // sem cinemática, monta quase na hora
const rm = await page2.evaluate(() => {
  const s = window.__game.scene.getScene('Menu');
  const particulas = s.children.list.filter((c) => c.type === 'ParticleEmitter').length;
  return { settled: s.settled, particulas };
});
ok(rm.settled === true, `reduced-motion monta DIRETO (settled=${rm.settled})`);
ok(rm.particulas === 0, `reduced-motion NÃO cria partículas (${rm.particulas})`);
await page2.close();
```

- [ ] **Step 5: Rodar a sonda completa e ver passar**

```bash
node scripts/probe-menu.mjs
```

Esperado: PASS em todos os asserts, incluindo os dois do reduced-motion.

- [ ] **Step 6: Commit**

```bash
git add src/scenes/MenuScene.ts scripts/probe-menu.mjs
git commit -m "feat(menu): atmosfera do diorama — brasas, névoa e a passagem da nave (reduced-motion respeitado)"
```

---

## Task 6: Fecho — verificação completa e HANDOFF

Roda a bateria inteira, confere o build e registra a leva no diário do projeto.

**Files:**
- Modify: `docs/HANDOFF.md`

**Interfaces:** nenhuma nova.

- [ ] **Step 1: Verificação completa**

Com `npm run dev` de pé:

```bash
npm run typecheck
node scripts/probe-menu.mjs
node scripts/probe-menu-intro.mjs
npm run build
```

Esperado: typecheck PASS, ambas as sondas PASS, `npm run build` conclui sem erro. Se qualquer uma falhar, corrigir antes de seguir (NÃO registrar no HANDOFF um estado que não passou).

- [ ] **Step 2: Conferência visual final**

Abrir o jogo (`npm run dev`, http://localhost:5173/) e, a olho:
1. A abertura toca: placa acorda → Leviatã entra respirando → título bate → UI surge.
2. Apertar uma tecla no meio da abertura PULA para o menu montado.
3. Recarregar com reduced-motion ligado (DevTools → Rendering → Emulate CSS `prefers-reduced-motion: reduce`): a cena monta direto, sem partículas, 100% legível.
4. ENTER começa a partida (diegético). As teclas 1/2/3 e os atalhos de DEV continuam funcionando.

- [ ] **Step 3: Registrar no HANDOFF**

Em `docs/HANDOFF.md`, adicionar uma seção no topo (o padrão do arquivo) resumindo: fatia 0 do passe visual entregue — menu "O DESPERTAR" (diorama vivo + cinemática pulável + reduced-motion), Leviatã canônico eleito (object `f397793a-...`), assets novos `menuBg` e `leviathanAliveSheet`, sondas `probe-menu.mjs` (reescrita) e `probe-menu-intro.mjs` (nova). Anotar a decisão: as versões erradas do Leviatã (tubarão esguio do menu antigo e jubarte) saíram do menu; a correção DENTRO do jogo/cutscene é fatia 7/8.

- [ ] **Step 4: Commit**

```bash
git add docs/HANDOFF.md
git commit -m "docs: HANDOFF — fatia 0 do passe visual (menu O DESPERTAR) entregue"
```

---

## Notas de execução

- **Ordem das tarefas:** 1 → 2 → 3 → 4 → 5 → 6. A Task 1 é 100% testável sem arte nova (usa o fallback). As Tasks 2 e 3 têm **checkpoints de arte** (o Henrique aprova a placa e o idle do Leviatã antes de instalar) — não são automáticas.
- **Dev server:** todas as sondas exigem `npm run dev` (porta 5173) rodando em paralelo.
- **PixelLab:** as gerações consomem créditos/saldo (ver `mcp__pixellab__get_balance` / docs/HANDOFF.md). Gerar com parcimônia e julgar ampliado antes de instalar.
- **Valores a resolver na execução (não são placeholders do plano, são medidas):** o `W×H` da célula da sheet do Leviatã (impresso por `anim-sheet.mjs`, Task 3 Step 2) e o índice `N-1` do último quadro (nº de quadros − 1). Ambos vêm da saída real do pipeline e são copiados para o código.
