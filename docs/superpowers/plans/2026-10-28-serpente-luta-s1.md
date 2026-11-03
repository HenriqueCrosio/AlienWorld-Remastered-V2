# S1 — a luta da Serpente: plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** a luta da Serpente (F3) num rombo do próprio casco parado, ela mais à direita e se movendo, a investida
mirada que atravessa a tela com janela de punição em toda forma, o acerto do tamanho da cabeça, e a estrela trocada
pelas veias acesas e pelo acerto que sangra.

**Architecture:** os números e as contas puras (postos, mira, ponta da investida, o pulso) num módulo sem Phaser
(`numerosSerpente.ts`, testado em Node); o `BossSerpente` ganha o rombo (duas imagens, fundo e lábio), a freada do
mundo (`mundo`, lida pela `GameScene`), os postos, a máquina da investida com a janela, o corpo de contato que cresce, e
as veias (sobreposições assadas por script, sincronizadas ao quadro da animação). O treino repõe o casco da proa por um
método do `Parallax`. O acerto na cabeça viva solta o respingo do motor dos destroços.

**Tech Stack:** Phaser 3.90, TypeScript, Vite 6; Node 24 para os testes puros e os scripts de arte (`sharp`); sondas e
filmes com Playwright (swiftshader) contra o `npm run dev` em `:5173`; PixelLab (inpaint) para o rombo.

Spec: `docs/superpowers/specs/2026-10-28-serpente-luta-s1-design.md`.

## Global Constraints

- A arena: o casco da F3 para na luta (a freada ~3 s, 28 px/s²), com o rombo no posto; ela sobe dele; as placas
  `derelict` saem; o treino `[N]` mostra o casco da proa.
- Ela vive no terço direito, o centro entre x ~280 e ~320; a cabeça viva nunca acima de y 30 nem abaixo do lábio.
- A investida em toda forma: aviso ~0,7 s (fusão ~0,55), avanço ~420 px/s (fusão ~500) até a cabeça viva em x ~20,
  janela ~1 s, volta ~200 px/s para outro posto; B dupla (a volta mirada), C com rajada na janela.
- O círculo da cabeça = `RAIO_CABECA × escala` (16,5 px nas cabeças, 18,9 na fusão). A estrela nunca aparece.
- As veias: o matiz da cabeça viva dentro da região da cabeça e do pescoço, assado em PNG por quadro, em ADD, batendo
  como coração (~1/s; ~2,5/s no aviso e na janela); as outras cabeças com sobreposição escura.
- O acerto na cabeça viva: 2–4 pixels pequenos (as gotas orgânicas), sem faísca; na blindagem, a faísca de hoje.
- Não muda: a vida (50+50+50+60), a ordem das cabeças, os padrões de tiro de hoje, a fusão de 28/10 (mordidas, gore,
  D1), os outros chefões e fases.
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; partir das peças aprovadas
  (inpaint, nunca corte reto).
- Durante filmagem ou sonda: não editar `src/` nem `.html` do projeto. Edição com Edit (CRLF). Sem commit até ele pedir;
  no nome dele, sem `Co-Authored-By`.
- Os números fecham no filme, com ele olhando: os do código são o ponto de partida.

## Os arquivos

| arquivo | o quê |
|---|---|
| `src/entities/numerosSerpente.ts` (novo) | os números da luta e as contas puras |
| `scripts/test-serpente.mjs` (novo) | os testes em Node do módulo puro |
| `src/entities/BossSerpente.ts` | o rombo, a freada, a entrada, os postos, a investida, o corpo, o círculo, as veias |
| `src/entities/Boss.ts` | `StageBoss.mundo?` (a fração da velocidade do mundo) |
| `src/scenes/GameScene.ts` | a freada no `worldSpeed`; o treino repõe o casco; o respingo no acerto da cabeça; o raio no `bulletAbsorvedByBoss` |
| `src/Parallax.ts` | `cascoNaProa()`: o casco revelado e refeito na família da proa |
| `src/systems/morte/Destrocos.ts` | `respingo(x, y)`: as gotas pequenas do acerto |
| `src/scenes/BootScene.ts` | o rombo (2 imagens) e as veias (sobreposições por forma e quadro) |
| `scripts/_serpente/_rombo-base.mjs` (novo) | a base e as máscaras dos conceitos |
| `scripts/_serpente/_rombo-instalar.mjs` (novo) | o conceito escolhido → `public/sprites/serpente-rombo-{fundo,labio}.png` |
| `scripts/_serpente/_veias.mjs` (novo) | as sobreposições das veias + a folha das máscaras |
| `scripts/_serpente/_sonda-luta.mjs` (novo) | a sonda da arena, do alcance, da estrela, das veias e dos dois jogadores |
| `scripts/_serpente/_filmar-luta.mjs` (novo) | o filme da luta (a fase de verdade e o treino) |
| `scripts/probe-stage3.mjs`, `scripts/_inimigos/_sonda-chefes.mjs` | ajustados à entrada nova |

---

### Task 1: Os conceitos do rombo (antes de tudo)

**Files:** Create `scripts/_serpente/_rombo-base.mjs`, `scripts/_serpente/_rombo-maquete.mjs` (os conceitos no jogo, sem tocar
em `src/`); folha `docs/superpowers/folhas/2026-10-28/serpente-luta/rombo.html`.

- [x] **Step 1:** a base (as peças aprovadas da proa como a faixa as põe: `casco-duto2 | casco-duto | casco-placa`, 102 px
  de passo, 34 px de céu acima) e as quatro máscaras: A o rasgo, B a cratera, C a fenda longa, D a chapa arrancada.
- [x] **Step 2:** inpaint no PixelLab (`inpaint_image`, 318×100, ~15 gerações cada), uma por máscara.
- [x] **Step 3:** conferir cada geração AMPLIADA (a emenda com o casco, os buracos, a paleta) antes da folha.
- [x] **Step 4:** a folha: cada conceito sozinho (ampliado) e EM CENA — composto numa foto da luta de verdade, no posto
  novo (x ~300), com a serpente de hoje saindo dele (o fundo atrás dela, o lábio na frente).
- [x] **Step 5:** ele escolhe (ou pede outra rodada). Nada do S1 em `src/` antes disso só para a arena; os Tasks 3 e 4
  (o módulo puro e o círculo) não dependem da arte e podem andar.

### Task 2: O "antes" (antes de tocar em `src/`)

**Files:** Create `scripts/_serpente/_sonda-luta.mjs`, `scripts/_serpente/_filmar-luta.mjs`.

- [x] **Step 1:** a sonda com o começo determinístico (a sorte nossa e a do Phaser fixas, relógio a passos desde antes
  da fase — a lição do 28/10), no treino da F3, a luta inteira, com DOIS jogadores:
  - **parado:** a nave em x 40, na altura da cabeça viva (seguindo-a), atirando a cada 0,1 s;
  - **desvia:** igual, mas no aviso da investida (`investida === 'telegrafo'`) sai da altura em que ela travou (sobe
    ou desce 70 px, o que couber na tela) e volta depois da janela.
  Conta: golpes de contato do chefão na nave (envolver `damageShip` com a fonte), golpes de tiro, o tempo da luta, e o
  dano entregue por forma. A nave intocável (para a luta seguir), mas cada golpe contado.
- [x] **Step 2:** rodar no código de hoje e guardar `cru/sonda-antes/log.json`. Esperado: o parado leva 0 golpes de
  contato da investida.
- [x] **Step 3:** o filme da fase de verdade chegando ao chefão (t 88 → morte) e do treino, com o mesmo começo.

### Task 3: O módulo puro (TDD)

**Files:** Create `src/entities/numerosSerpente.ts`, `scripts/test-serpente.mjs`.

- [x] **Step 1: os testes primeiro** (`scripts/test-serpente.mjs`):

```js
// 28/10 — the serpent's fight, the pure part (`src/entities/numerosSerpente.ts`): the posts sit in the breach and below
// the boss bar; the charge's aim keeps the live head on screen for any ship height; its tip brings the live head to the
// left edge in every form; the heartbeat stays within 0..1 and beats faster when asked.
//   node scripts/test-serpente.mjs
import { LUTA, POSTOS, FORMAS, miraDaInvestida, pontaDaInvestida, pulso } from '../src/entities/numerosSerpente.ts';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

ok(POSTOS.length === 3 && POSTOS.every((p) => Math.abs(p.x - LUTA.rombo.x) <= LUTA.rombo.meio - 20), 'os três postos ficam dentro do rombo');
for (const [nome, f] of Object.entries(FORMAS)) {
  for (const p of POSTOS) {
    const cy = p.y + f.cabeca.y * f.escala;
    ok(cy >= LUTA.tetoCabeca && cy <= LUTA.chaoCabeca, `${nome}: no posto ${p.nome}, a cabeça viva em y ${cy.toFixed(0)} (entre ${LUTA.tetoCabeca} e ${LUTA.chaoCabeca})`);
  }
  let fora = 0;
  for (let naveY = 0; naveY <= 216; naveY += 4) {
    const sy = miraDaInvestida(naveY, f);
    const cy = sy + f.cabeca.y * f.escala;
    if (cy < LUTA.tetoCabeca - 0.01 || cy > LUTA.chaoInvestida + 0.01) fora++;
  }
  ok(fora === 0, `${nome}: a mira leva a cabeça viva para a altura da nave sem sair da tela (${fora} fora)`);
  const px = pontaDaInvestida(f);
  ok(Math.abs(px + f.cabeca.x * f.escala - LUTA.investida.bordaCabeca) < 0.01, `${nome}: na ponta, a cabeça viva chega a x ${LUTA.investida.bordaCabeca}`);
}
const a = [...Array(100)].map((_, i) => pulso(i / 100, 1));
ok(a.every((v) => v >= 0 && v <= 1) && Math.max(...a) > 0.9 && Math.min(...a) < 0.1, 'o pulso vai de ~0 a ~1');
ok(pulso(0.3, 2.5) !== pulso(0.3, 1), 'o pulso acelera');

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
```

- [x] **Step 2:** `node scripts/test-serpente.mjs` → FALHA (o módulo não existe).
- [x] **Step 3: o módulo** (`src/entities/numerosSerpente.ts`):

```ts
/**
 * THE SERPENT'S FIGHT — the numbers and the pure sums (28/10, S1: spec `2026-10-28-serpente-luta-s1-design.md`). Him:
 * *"ela está muito central … a avançada dela para frente não está fazendo muito sentido … É um dos bosses mais
 * fáceis"*, *"muito engessadas"*. Game px of the native 384×216 (y down), seconds. Starting values: they close in the
 * film, with him watching. Without Phaser: `scripts/test-serpente.mjs` runs it in Node.
 */
export interface FormaLuta {
  /** the live head's offset from the sprite's centre, in ART px (as the phase's `cabeca`), and the display scale */
  cabeca: { x: number; y: number };
  escala: number;
  /** the charge: warning, speed */
  aviso: number;
  vel: number;
  /** seconds between charges (the form's main beat); 0 = the fury cycle decides */
  cada: number;
  /** B: the way back is aimed too; C: a burst in the window */
  variacao: 'simples' | 'dupla' | 'rajada' | 'furia';
}

export const LUTA = {
  /** the breach: its centre x, half its width, the y of its crest (the hull band's top, 150) */
  rombo: { x: 300, meio: 72, crista: 150 },
  /** the live head never above this (the boss bar is at 19) nor below this at a post */
  tetoCabeca: 30,
  chaoCabeca: 130,
  /** in the charge the live head may go as low as the ship flies */
  chaoInvestida: 200,
  /** the world brakes to a stop with the breach under her post (px/s²), from the full scroll */
  freada: 28,
  /** she rises out of the breach at this speed (px/s) */
  subida: 60,
  /** a post change every this many seconds (outside the charge) */
  trocaPosto: [2.2, 3.2] as [number, number],
  /** after a charge she sinks to the low post for this long, to recover */
  recupera: 1.2,
  investida: {
    /** where the live head stops: the left edge */
    bordaCabeca: 20,
    /** the window: stretched, almost still, the live head close */
    janela: 1.0,
    janelaDupla: 0.5,
    volta: 200,
    voltaMirada: 320,
    /** in the warning she pulls back into the breach (px/s) */
    recuo: 30,
  },
  /** the heartbeat (beats per second): at rest, in the warning and the window */
  coracao: { calmo: 1.0, alerta: 2.5 },
} as const;

export const POSTOS = [
  { nome: 'baixo', x: 292, y: 142 },
  { nome: 'medio', x: 300, y: 126 },
  { nome: 'alto', x: 310, y: 110 },
] as const;

/** Per form (offsets measured, see `BossSerpente.FASES`). */
export const FORMAS: Record<'A' | 'B' | 'C' | 'fusao', FormaLuta> = {
  A: { cabeca: { x: -63.1, y: -43.3 }, escala: 0.55, aviso: 0.7, vel: 420, cada: 4.0, variacao: 'simples' },
  B: { cabeca: { x: -10.1, y: -55.4 }, escala: 0.55, aviso: 0.7, vel: 420, cada: 5.0, variacao: 'dupla' },
  C: { cabeca: { x: 46.4, y: -62.0 }, escala: 0.55, aviso: 0.7, vel: 420, cada: 5.5, variacao: 'rajada' },
  fusao: { cabeca: { x: -52.0, y: -75.6 }, escala: 0.63, aviso: 0.55, vel: 500, cada: 0, variacao: 'furia' },
};

/** The sprite's y that puts the live head at the ship's height, kept on screen. */
export function miraDaInvestida(naveY: number, f: FormaLuta): number {
  const cy = Math.min(LUTA.chaoInvestida, Math.max(LUTA.tetoCabeca, naveY));
  return cy - f.cabeca.y * f.escala;
}

/** The sprite's x at the charge's tip: the live head at the left edge. */
export function pontaDaInvestida(f: FormaLuta): number {
  return LUTA.investida.bordaCabeca - f.cabeca.x * f.escala;
}

/**
 * The heartbeat, 0..1: a strong beat and a weaker one right after it, then rest (lub-dub). `t` in seconds, `bpm` in
 * beats per second.
 */
export function pulso(t: number, porSegundo: number): number {
  const u = (t * porSegundo) % 1;
  const batida = (c: number, l: number): number => Math.exp(-(((u - c) / l) ** 2));
  return Math.min(1, batida(0.08, 0.07) + 0.6 * batida(0.3, 0.07));
}
```

- [x] **Step 4:** `node scripts/test-serpente.mjs` → tudo ok (ajustar só os números que um teste mostrar fora da tela,
  nunca o teste).

### Task 4: O acerto do tamanho da cabeça, e a estrela sai

**Files:** `src/entities/BossSerpente.ts` (construtor, `vestirFase`, `sincronizarCabeca`, `FaseSerpente`),
`src/scenes/GameScene.ts` (`bulletAbsorvedByBoss`).

- [x] **Step 1:** um método que crava o círculo pela forma, chamado no construtor e no `vestirFase`:

```ts
  /** O círculo de acerto do TAMANHO DA CABEÇA desenhada (28/10, S1): `RAIO_CABECA × escala` em px de tela (16,5 nas
   * cabeças, 18,9 na fusão), no corpo do `flash` (escala 2,2), centrado nele. Antes eram 33 px, maior que a cabeça. */
  private cravarCirculo(): void {
    const raio = (BossSerpente.RAIO_CABECA * this.fase.escala) / this.cabeca.scaleX;
    const b = this.cabeca.body as Phaser.Physics.Arcade.Body;
    b.setCircle(raio, this.cabeca.frame.width / 2 - raio, this.cabeca.frame.height / 2 - raio);
  }
```

- [x] **Step 2:** a estrela: `this.cabeca.setVisible(false)` no construtor; sai a linha do alpha de `sincronizarCabeca`;
  sai o `semEstrela` (campo e uso em `vestirFase`).
- [x] **Step 3:** `bulletAbsorvedByBoss`: o raio de cada alvo em vez dos 22 fixos —
  `Phaser.Math.Distance.Between(bullet.x, bullet.y, alvo.x, alvo.y) < (alvo.body as Phaser.Physics.Arcade.Body).halfWidth`.
- [x] **Step 4:** `npx tsc --noEmit -p .`; `node scripts/test-morte.mjs`.

### Task 5: A arena — o rombo, a freada, a entrada, o treino

Depende da escolha do Task 1.

**Files:** Create `scripts/_serpente/_rombo-instalar.mjs`; Modify `BootScene.ts`, `Boss.ts`, `BossSerpente.ts`,
`GameScene.ts`, `Parallax.ts`.

- [x] **Step 1:** instalar o conceito escolhido em duas camadas, recortadas por máscara desenhada sobre ele (nunca reta):
  `serpente-rombo-fundo.png` (o buraco e as bordas de trás) e `serpente-rombo-labio.png` (as chapas da frente, que
  cobrem a base dela). Registrar as duas no `BootScene`.
- [x] **Step 2:** `StageBoss.mundo?: number` (0–1, a fração da velocidade do mundo que o chefão deixa; ausente = 1). Na
  `GameScene`, nos dois cálculos de `frenagem`: `* (this.boss?.mundo ?? 1)`.
- [x] **Step 3:** no `BossSerpente`: as placas `brecha` saem; entram `romboFundo` (depth −74, logo acima da faixa do
  casco) e `romboLabio` (depth 35), na crista (`LUTA.rombo.crista`). A entrada: o rombo nasce fora da tela à direita e
  anda com o mundo (`SCROLL_SPEED × mundo`); a `PARTIR` de `x = LUTA.rombo.x + v²/(2·freada)` o `mundo` cai a 28 px/s²
  até 0, com o rombo parando em `LUTA.rombo.x`. O sprite dela nasce escondido atrás do lábio (y da crista + meia altura)
  e, com o mundo parado, SOBE (`LUTA.subida`) até o posto médio; `entering` acaba lá.
- [x] **Step 4:** `Parallax.cascoNaProa()`: o casco revelado (`revealCasco(1, 0)`), `cascoDist` no fim do percurso
  (3500, a PROA) e as peças da camada do casco refeitas (destruídas e emitidas de novo, agora na família da proa). A
  `GameScene`, no treino, chama-o se o roteiro tinha um `rabo` antes do salto (varrendo o roteiro, como o
  `aplicaCorredorEMoldura`), junto com a tira da frente acesa.
- [x] **Step 5:** a sonda (Task 2) confere: o mundo em 0 depois da chegada; o rombo em x 300 ±1; ela sobe dele; no treino,
  as peças do casco são da família da proa (`cascoDuto*`, `cascoPlaca`, `cascoCostela*`).

### Task 6: Os postos e a investida

**Files:** `src/entities/BossSerpente.ts` (`mover`, `atacar`, `comecarInvestida`, `ajustarCorpo`).

- [x] **Step 1:** os postos: um `posto` atual (0–2) e um relógio (`LUTA.trocaPosto`); `mover` puxa o sprite ao posto por
  velocidade (`(alvo − pos) × 3`), com a ondulação por cima (mais curta no posto baixo). Antes do ataque principal
  (leque, rajada) ela vai ao posto alto ou médio; depois da investida, ao baixo por `LUTA.recupera`.
- [x] **Step 2:** a máquina da investida, `'nao' | 'aviso' | 'indo' | 'janela' | 'mirandoVolta' | 'voltando'`:
  - `aviso` (`f.aviso` s): y → `miraDaInvestida(nave.y, f)` (por velocidade), x recua `LUTA.investida.recuo`; no fim,
    o y TRAVA;
  - `indo`: `setVelocityX(−f.vel)` até `x ≤ pontaDaInvestida(f)`; o corpo de contato CHEIO (`ajustarCorpo(true)`);
  - `janela` (`LUTA.investida.janela`; B: `janelaDupla`): parada; C solta `rajada(boca, nave, 3, 190)` ao entrar;
  - B: `mirandoVolta` (0,35 s, y → mira de novo) e volta a `voltaMirada`; os outros: `voltando` a `LUTA.investida.volta`
    até o x do posto escolhido (um diferente do de saída); lá, `ajustarCorpo(false)` e o posto baixo por `recupera`.
- [x] **Step 3:** `ajustarCorpo(cheio)`: fora da investida, as roscas (como hoje); cheio, a silhueta (largura 0,8,
  altura 0,9 a partir de 0,08 do topo).
- [x] **Step 4:** a cadência por forma (`FORMAS.*.cada`): A troca o `cdPrincipal` de 3,5 s por `cada`; B troca o
  `cdSecundario` (5 s) por `cada`; C ganha um terceiro relógio para a investida; a fusão segue no passo 2 do ciclo.
- [x] **Step 5:** `npx tsc --noEmit -p .`; a sonda (Task 2) com `--depois`: a investida aparece nas quatro formas, a
  cabeça chega a x ~20, a janela dura o que diz.

### Task 7: As veias

**Files:** Create `scripts/_serpente/_veias.mjs`; Modify `BootScene.ts`, `BossSerpente.ts`.

- [x] **Step 1:** o script: para `serpente`, `serpente-2c`, `serpente-1c` × 9 quadros, a região de cada cabeça (um
  polígono em px de arte, cabeça + pescoço, desenhado sobre a arte) e o matiz dela (ciano: b > 150, g > 150, r < 120;
  verde: g > 150, g > r + 40, g > b + 20; laranja: r > 140, r > g + 40, g > b, b < 90). Saída:
  `public/sprites/serpente-veias-{forma}-{i}.png` (os pixels da cabeça viva, um tom mais claro) e
  `serpente-sombra-{forma}-{i}.png` (os das outras, ~55% mais escuros). E a folha das máscaras sobre os 9 quadros.
- [x] **Step 2:** **ele confere a folha das máscaras** antes de instalar.
- [x] **Step 3:** no `BossSerpente`, dois sprites (`veias` em ADD, depth 30.1; `sombra` em NORMAL, depth 30.05) que
  copiam posição, escala e o ÍNDICE do quadro da animação dela (`sprite.anims.currentFrame.index`) a cada update e na
  troca de forma; o alpha das veias = `0.25 + 0.75 × pulso(t, ritmo)`, com o ritmo `alerta` no aviso e na janela.
  Na fusão os dois somem.
- [x] **Step 4:** a sonda confere o quadro das veias = o quadro dela, em toda forma.

### Task 8: O acerto que sangra

**Files:** `src/systems/morte/Destrocos.ts`, `src/scenes/GameScene.ts` (`bulletHitBoss`).

- [x] **Step 1:** `Destrocos.respingo(x, y)`:

```ts
  /**
   * THE HIT THAT BLEEDS (28/10, S1 — him: *"podem ser pixels pequenos, apenas para informar"*): a shot on the serpent's
   * live head sheds 2–4 tiny droplets of flesh and her fluid, slow and short-lived — it says "this is the right head",
   * nothing more. (The armour keeps the spark.)
   */
  respingo(x: number, y: number): void {
    const n = 2 + Math.floor(this.rnd() * 3);
    for (let i = 0; i < n; i++) {
      const a = this.rnd() * Math.PI * 2, v = 15 + this.rnd() * 25;
      this.gotaOrganica(x, y, Math.cos(a) * v, Math.sin(a) * v - 10);
    }
  }
```

- [x] **Step 2:** `bulletHitBoss`: com chefão multi-parte (`this.boss.targets`), `this.destrocos.respingo(onde.x, onde.y)`
  no lugar do `this.fx.hit(...)`; sem ele, o de hoje.

### Task 9: As provas, o filme e a folha

- [x] **Step 1:** `node scripts/test-serpente.mjs`, `node scripts/test-morte.mjs`, `npx tsc --noEmit -p .`.
- [x] **Step 2:** `_sonda-luta.mjs --depois`: a arena, o alcance por bala real em cada forma com o círculo novo, a
  estrela nunca visível, as veias no quadro certo, e os dois jogadores (esperado: o parado leva golpes de contato da
  investida; o que desvia, ~0); o tempo da luta antes e depois.
- [x] **Step 3:** `probe-stage3` (a entrada nova: ela sobe do rombo; a alcançabilidade por bala real), `_sonda-chefes`,
  `_sonda-serpente-fusao --novo` (as mordidas da fusão seguem no lugar) — ajustados à entrada e verdes.
- [x] **Step 4:** o filme (a fase de verdade de t 88 à morte; o treino), conferido ampliado antes de mostrar; a folha
  `folhas/2026-10-28/serpente-luta/luta.html` com o filme, as medidas e o antes/depois dos dois jogadores.

## Os desvios da implementação (28/10, à noite)

O que o jogo ensinou no caminho (a spec §3 foi atualizada com eles):

- **A janela recua para a frente da nave.** Parada na borda, a cabeça ficava ATRÁS da nave, que só atira para a direita.
  Da ponta ela recua até a cabeça viva ficar em x ~140 (`LUTA.investida.janelaCabeca`, `janelaDaInvestida`).
- **A mira trava no último terço do aviso** (`trava` 0,35), com ela branca e parada. Travada no fim, ela avançava no
  mesmo quadro: não havia instante para reagir.
- **O que fere na investida é a frente dela**, do topo até 45 px abaixo da cabeça viva (`abaixoCabeca`). A silhueta
  inteira (90%) era uma parede de ~140 px sem fuga com a nave no alto da tela.
- **A dupla da B é uma segunda investida**, com recuo antes (`recuoDupla` 240 px/s): a volta mirada da 1ª ideia não
  passava pela nave.
- **O rombo é uma peça da faixa do casco** (`Parallax.inserirNoCasco`), não um adesivo por cima dela: sem emenda.
- **As veias da forma C** contam também as luzes quase brancas dos canos (nos quadros 3, 5 e 7 a cabeça se abre).
- **As máscaras das veias** foram instaladas antes da conferência dele: estão na folha da luta, junto com o filme.
- **A `probe-stage3`** esperava a serpente por 6,5 s fixos e testava o alcance no meio de uma investida: agora espera ela
  chegar e segura os padrões durante o teste de bala (o que ele mede é o corpo bloqueando o caminho da cabeça).

Medido (a sonda dos dois jogadores, o treino): hoje o parado matava em 24,9 s sem levar golpe da investida; no S1 o
parado leva 5 de 5 e a luta dura 39,7 s; o que desvia leva 0 e 2 tiros, em 41,4 s.
