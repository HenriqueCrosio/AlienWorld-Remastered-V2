# A fusão da Serpente: pescoço, queixo, crânio — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** na fusão da Serpente, tirar a estrela e trocar as duas mordidas no crânio por três mordidas orgânicas
(pescoço → queixo → crânio, a 22/13/5% da vida), com jato de carne e fluido, sem fogo.

**Architecture:** a Serpente declara onde morder (os três pontos da fusão) e que não tem estrela; o `CHEFOES` declara
os limiares próprios e o estilo `organica`; o motor dos destroços (`Destrocos`) segue sendo o único caminho da mordida
e ganha o estilo: rasgo mais torto, jato misturado, pedaço que pinga, ferida que pinga sem fumo.

**Tech Stack:** Phaser 3.90, TypeScript, Vite 6; testes em Node 24 (`node scripts/test-morte.mjs`, que importa `.ts`
direto); sondas e filmes com Playwright (swiftshader) contra o `npm run dev` em `:5173`.

Spec: `docs/superpowers/specs/2026-10-28-serpente-fusao-mordidas-design.md`.

## Global Constraints

- Limiares da Serpente: `[0.22, 0.13, 0.05]` da vida total (a fusão começa em 60/210 = 0,286).
- Pontos da fusão (px de arte a partir do centro do sprite, escala 0,63), na ordem: pescoço `(-18, -2)`, queixo
  `(-54, 2)`, crânio `(-52, -75.6)`.
- Estrela: some SÓ na fusão; a hitbox (`cabeca`, círculo de raio 15 na escala 2,2) e a `zona` das marcas ficam.
- Estilo orgânico: sem `estouro` (a folha de explosão), sem faísca de metal, sem fumo; o tremor de câmera da carne;
  `torto` ≈ 3 (hoje 1,4); jato metade `RAMPA_CARNE` (escura), metade `RAMPA_FLUIDO` (escuro oleoso, reflexo laranja).
- Nada muda nas formas de 3, 2 e 1 cabeça, na morte D1, na cena da fusão, nos outros chefões e no golfinho.
- Durante uma filmagem ou sonda, NÃO editar `src/` nem `.html` do projeto (o Vite recarrega).
- Sem commit: ele pede quando quiser, no nome dele, sem `Co-Authored-By`.
- Edição com Edit (sed/node -e falham em silêncio aqui, CRLF).

## Os arquivos

| arquivo | o que muda |
|---|---|
| `src/entities/serpenteFusao.ts` (novo) | os três pontos da fusão, sem Phaser (o teste em Node os lê) |
| `src/entities/BossSerpente.ts` | `FaseSerpente.mordidas`/`semEstrela`; a fusão os declara; `vestirFase` esconde a estrela; `destrocos.mira` vira a lista |
| `src/systems/morte/pedacos.ts` | `RAMPA_FLUIDO` |
| `src/systems/morte/numerosDestrocos.ts` | `Mordida`; `CHEFOES.serpente.limiares/mordida`; `DESTROCOS.organica` |
| `src/systems/morte/Destrocos.ts` | `vigiar` com `limiares`/`estilo`; `morder` orgânico; a `amp` guardada no golpe; a ferida e o pedaço que pingam; a gota pinta pela própria rampa |
| `src/scenes/GameScene.ts` | `atualizarDestrocos` passa `limiares` e `estilo` |
| `scripts/test-morte.mjs` | os testes da fusão |
| `scripts/_inimigos/_sonda-serpente-fusao.mjs` (novo) | a sonda (estrela, mordidas, folhas, recortes A–C) |
| `scripts/_inimigos/_filmar-serpente-fusao.mjs` (novo) | o filme da fusão, antes/depois, lado a lado |
| `scripts/_inimigos/_sonda-chefes.mjs` | a Serpente: três pedaços na fusão |
| `docs/superpowers/folhas/2026-10-28/serpente/serpente.html` (novo) | a folha |

---

### Task 1: O "antes" (antes de tocar em `src/`)

**Files:**
- Create: `scripts/_inimigos/_filmar-serpente-fusao.mjs`, `scripts/_inimigos/_sonda-serpente-fusao.mjs`

- [x] **Step 1:** escrever os dois scripts (o filme: as cabeças rápidas e sem filme, a fusão filmada do primeiro quadro
  livre até 4 s depois da morte, tiros de verdade 5/s, recorte 288×216 a 3×; a sonda: a luta inteira com tiros a cada
  0,1 s e dreno de 8/s, recortes das formas A–C no começo e 1,5 s depois, cada mordida com forma/vida/onde começou em px
  de arte, a estrela por quadro, as folhas de explosão nascidas dentro de `morder`).
- [x] **Step 2:** rodar em sequência, com o servidor de pé:

```bash
F=docs/superpowers/folhas/2026-10-28/serpente
node scripts/_inimigos/_sonda-serpente-fusao.mjs $F/cru/sonda-antes
node scripts/_inimigos/_filmar-serpente-fusao.mjs $F antes
node scripts/_inimigos/_sonda-chefes.mjs
```

Esperado: a sonda mostra duas mordidas na forma 3 (≈14% e ≈6%) começando no alto do crânio, a estrela visível em todos
os quadros (cabeças e fusão), e folhas de explosão > 0 nas mordidas; o filme sai em `$F/antes.webm` com os quadros em
`$F/cru/antes/`; a `_sonda-chefes` passa como em 27/10.

### Task 2: Os testes (falhando)

**Files:**
- Modify: `scripts/test-morte.mjs` (bloco novo antes do fim)

- [x] **Step 1:** o bloco da fusão (já escrito): `RAMPA_FLUIDO` sobe do escuro ao claro e acaba laranja; os três
  limiares da Serpente decrescentes e abaixo de 60/210; `mordida: 'organica'` com `DESTROCOS.organica.torto` maior que
  `DESTROCOS.lasca.torto`; nenhum outro chefão com `limiares`/`mordida`; `MORDIDAS_FUSAO` com três pontos; nos 9
  quadros reduzidos a 0,63, a `lasca` mirada em cada ponto (com `torto` 1,4 e com o orgânico) começa na parte certa
  (pescoço x −26…−10, y −10…10; queixo x −66…−46, y −14…10; crânio x ≤ −60, y ≤ −82, em px de arte), tem o alvo exato
  e é uma peça só (busca por 4-vizinhos dentro da máscara).
- [x] **Step 2:** `node scripts/test-morte.mjs` → esperado: 5 FALHAS (a rampa ×2, os limiares, o estilo, os pontos).

### Task 3: Os números, a rampa e os pontos

**Files:**
- Create: `src/entities/serpenteFusao.ts`
- Modify: `src/systems/morte/pedacos.ts` (junto da `RAMPA_CARNE`), `src/systems/morte/numerosDestrocos.ts`
  (`CHEFOES`, `DESTROCOS`)

- [x] **Step 1:** `src/entities/serpenteFusao.ts`:

```ts
/**
 * WHERE THE FUSION IS BITTEN (28/10, him: *"o pedaço da cabeça saindo é ótimo, mas numa luta isso já deixaria qualquer
 * inimigo muito fraco, o que pode sair é outro tipo de pedaço: Queixo, pedaço do pescoço e, ai sim, aquele pedaço da
 * cabeça"*; his order: neck, chin, skull). Art px from the sprite's centre, like the phase's `cabeca` and `boca`. A bite
 * starts on one of the 6 edge pixels nearest its point (`lasca`): the point only picks the edge. Measured on the 9
 * frames of `serpente-fusao-anim` (spec 2026-10-28, §2):
 *   neck   the front of the neck, the right side of the gap under the jaw      (−19…−16, −3…+2)
 *   chin   the jaw's bottom (−53, 0…4); where the mouth opens wider, its front (−61…−57, −10…−3)
 *   skull  the old point (the phase's `cabeca`): the forehead's top-left        (−74…−66, −95…−88) — the piece he approved
 * Its own file, without Phaser: the Node test reads it (`scripts/test-morte.mjs`).
 */
export const MORDIDAS_FUSAO: readonly { x: number; y: number }[] = [
  { x: -18, y: -2 },
  { x: -54, y: 2 },
  { x: -52, y: -75.6 },
];
```

- [x] **Step 2:** `RAMPA_FLUIDO` em `pedacos.ts`, logo depois da `RAMPA_CARNE`:

```ts
/**
 * THE SERPENT'S FLUID (28/10, the fusion's organic bites): dark and oily, with an orange glint — her own seams' colours
 * (sampled from `serpente-fusao-anim`: 1a0b06, 2c0b04, 4a1d05, 5c2300, 7d2900, 913300), from an oily black up to one
 * step brighter than the brightest seam (the glint).
 */
export const RAMPA_FLUIDO = ['b5500c', '913300', '7d2900', '5c2300', '4a1d05', '2c0b04', '1a0b06', '140a0a', '0a0608'].reverse().map(hex);
```

- [x] **Step 3:** `numerosDestrocos.ts`: o tipo `Mordida`, os campos opcionais no `CHEFOES` e a linha da Serpente:

```ts
/** A bite's own style (28/10): `organica` = flesh and fluid, no fire (the serpent's fusion — `DESTROCOS.organica`). */
export type Mordida = 'organica';

export const CHEFOES: Record<string, { classe: Classe; material: Material; morte: boolean; furo: boolean; limiares?: number[]; mordida?: Mordida }> = {
  // ...
  serpente: { classe: 'chefe', material: 'biomec', morte: true, furo: true, limiares: [0.22, 0.13, 0.05], mordida: 'organica' },
  // ...
};
```

e o bloco `DESTROCOS.organica` (depois do `lasca`):

```ts
  organica: {
    /** the tear's bend (the class's is 1.4): ragged, not round */
    torto: 3,
    /** droplets at the tear: 6 + this × the bitten px, half flesh, half fluid, in a cone out of the tear */
    jato: 1 / 3,
    cone: 1.4,
    vel: [40, 110] as [number, number],
    /** the droplets' brightness at birth (ramp position): flesh dark red, the fluid dark and oily; a share glints */
    brilhoCarne: [0.3, 0.6] as [number, number],
    brilhoFluido: [0.25, 0.55] as [number, number],
    reflexo: 0.25,
    brilhoReflexo: [0.8, 0.95] as [number, number],
    /** a flying piece drips this many droplets a second (a piece of 30 px or more) */
    pingo: 12,
    /** the wound drips this many droplets per tick of the class's `ferida` (no smoke) */
    ferida: 1,
  },
```

- [x] **Step 4:** `node scripts/test-morte.mjs` → esperado: os 5 testes novos passam (o da parte, do alvo e da peça
  também), nenhum velho cai.

### Task 4: O motor dos destroços aprende o estilo

**Files:**
- Modify: `src/systems/morte/Destrocos.ts` — imports; `RAMPAS`; `Corpo` (`pinga`); `Golpe` mordida (`amp`);
  `Cicatriz.feridas` (`org`); `vigiar`; `morder`; o replay em `emDia`; `update` (o pingo); `feridas`; `desenharBrasas`
  (a gota pela própria rampa); `gotasOrganicas` (novo).

- [x] **Step 1:** imports e rampas:

```ts
import { ..., RAMPA_CARNE, RAMPA_ROCHA, RAMPA_FLUIDO, ... } from './pedacos';
import { DESTROCOS, type Classe, type Estilo, type Material, type Mordida, type VarianteRocha } from './numerosDestrocos';
const RAMPAS = [RAMPA_FOGO, RAMPA_MEDUSA, RAMPA_CARNE, RAMPA_ROCHA, RAMPA_FLUIDO];
/** the serpent's fluid (the organic bite's droplets): its ramp in `RAMPAS` */
const FLUIDO = 4;
```

- [x] **Step 2:** os tipos: `Corpo.pinga?: boolean` (o pedaço da mordida orgânica pinga carne e fluido em vez de soltar
  brasa e fumo); no `Golpe` da mordida, `amp?: number` (o `torto` com que foi mordida — o replay em cada quadro usa o
  mesmo); `Cicatriz.feridas: (Ponto & { org?: boolean })[]`.
- [x] **Step 3:** `vigiar` aceita `limiares` e `estilo`:

```ts
    o: { mira?: Ponto | Ponto[]; furo?: boolean; limiares?: number[]; estilo?: Mordida } = {},
  ): void {
    ...
    const limiares = o.limiares ?? DESTROCOS.lasca[classe].limiares(Infinity);
    const cruzou = limiares.filter((f) => antes > f && fracao <= f).length;
    ...
      this.morder(s, classe, material, de, m ? (bmp: Bitmap) => this.noBitmap(s, bmp, m) : undefined, o.furo ?? true, o.estilo);
```

- [x] **Step 4:** `morder(..., furo = true, estilo?: Mordida)`:

```ts
    const org = estilo === 'organica';
    const amp = org ? DESTROCOS.organica.torto : DESTROCOS.lasca.torto;
    const l = lasca(atual, [0, 1], alvo, torto, amp, sorte(semente), alvoPonto);
    ...
      cic.golpes.push({ tipo: 'mordida', alvo, perto: ..., torto, amp, semente, t: this.t });
      cic.feridas.push({ x: ..., y: ..., org });
    ...
      r.fumacaAte = org ? 0 : p.n >= 12 ? this.t + 0.4 : 0;
      r.pinga = org;
    ...
    if (org) {
      // THE ORGANIC BITE (28/10): no fire, no metal sparks — the flesh's short shake and the jet of flesh and fluid
      this.estouro('carne', wx, wy, DESTROCOS.lasca.estouro[classe], false);
      this.jato(wx, wy, base.vx, base.vy, ux, uy, 6 + alvo * DESTROCOS.organica.jato);
      return;
    }
    (as três linhas de hoje)
```

e no replay (`emDia`): `lasca(img, [0, 1], g.alvo, g.torto, g.amp ?? DESTROCOS.lasca.torto, ...)`.

- [x] **Step 5:** as gotas orgânicas e o jato (perto de `gotas`):

```ts
  /** One organic droplet (28/10): flesh (dark red, almost black) or the dark oily fluid, half and half; some fluid glints. */
  private gotaOrganica(x: number, y: number, vx: number, vy: number): void {
    const C = DESTROCOS.carne, O = DESTROCOS.organica;
    const fluido = this.rnd() < 0.5;
    const h0 = fluido && this.rnd() < O.reflexo ? this.entre(O.brilhoReflexo) : this.entre(fluido ? O.brilhoFluido : O.brilhoCarne);
    this.brasas.add(x + (this.rnd() - 0.5) * 2, y + (this.rnd() - 0.5) * 2, vx, vy, this.entre(C.vidaGota), h0, 0, 2, fluido ? FLUIDO : RAMPA_DO.carne, this.rnd(), C.gravidadeGota);
  }

  /** Organic droplets out of a point, every way (a wound, a dripping piece). */
  private gotasOrganicas(x: number, y: number, vx: number, vy: number, n: number): void {
    const C = DESTROCOS.carne;
    for (let i = 0; i < Math.round(n); i++) {
      const a = this.rnd() * Math.PI * 2, v = this.entre(C.velGota);
      this.gotaOrganica(x, y, vx + Math.cos(a) * v, vy + Math.sin(a) * v);
    }
  }

  /** The organic bite's JET: droplets in a cone out of the tear (`ux`, `uy`: from the body's centre through the bite). */
  private jato(x: number, y: number, vx: number, vy: number, ux: number, uy: number, n: number): void {
    const O = DESTROCOS.organica;
    const base = Math.atan2(uy, ux);
    for (let i = 0; i < Math.round(n); i++) {
      const a = base + (this.rnd() - 0.5) * O.cone, v = this.entre(O.vel);
      this.gotaOrganica(x, y, vx + Math.cos(a) * v, vy + Math.sin(a) * v);
    }
  }
```

- [x] **Step 6:** o pedaço que pinga (`update`, no laço dos corpos, antes do "hot cut sheds embers"):

```ts
      if (c.pinga) {
        if (this.t < c.some && this.rnd() < DESTROCOS.organica.pingo * Math.min(1, c.n / 30) * dt) {
          const p = c.bordas.length ? c.bordas[Math.floor(this.rnd() * c.bordas.length)] : -1;
          const [wx, wy] = p >= 0 ? this.noMundo(c, p % c.bmp.w, Math.floor(p / c.bmp.w)) : [c.x, c.y];
          this.gotasOrganicas(wx, wy, c.vx * 0.6, c.vy * 0.6, 1);
        }
      } else if (c.bordas.length && this.t < c.some) { (o de hoje) }
```

- [x] **Step 7:** a ferida (`feridas`): se `f.org`, `this.gotasOrganicas(wx, wy, base.vx, base.vy + 10, DESTROCOS.organica.ferida)` e
  `continue` (sem fumo, sem brasa); senão, o de hoje.
- [x] **Step 8:** `desenharBrasas`: a gota pinta pela própria rampa — `corDaRampa(rampa, ...)` no lugar de
  `corDaRampa(RAMPA_CARNE, ...)` (toda gota de hoje nasce com a rampa 2, a `RAMPA_CARNE`: nada muda nelas).
- [x] **Step 9:** `npx tsc --noEmit -p .` → sem erro; `node scripts/test-morte.mjs` → tudo ok.

### Task 5: A Serpente declara, a cena passa

**Files:**
- Modify: `src/entities/BossSerpente.ts` (`FaseSerpente`, `FASES[3]`, `vestirFase`, `destrocos`),
  `src/scenes/GameScene.ts` (`atualizarDestrocos`)

- [x] **Step 1:** `FaseSerpente` ganha:

```ts
  /** Where the destroços bite this form (art px, in order — `serpenteFusao.ts`). Absent = the live head. */
  mordidas?: readonly { x: number; y: number }[];
  /** No star on the live head (28/10: the fusion — the hitbox stays, hidden). */
  semEstrela?: boolean;
```

e a fusão: `{ ..., escala: 0.63, mordidas: MORDIDAS_FUSAO, semEstrela: true }`.
- [x] **Step 2:** `vestirFase`, depois do `ajustarCorpo()`: `this.cabeca.setVisible(!f.semEstrela);` (a troca da fusão
  acontece atrás do preto cheio).
- [x] **Step 3:** o getter `destrocos`: `mira` = a lista dos pontos em mundo quando a fase os declara
  (`{ x: sprite.x + p.x * f.escala, y: sprite.y + p.y * f.escala }`), senão a cabeça viva; o tipo de `mira` vira
  `{x,y} | {x,y}[]`; o comentário velho dos "seis limiares" sai.
- [x] **Step 4:** `GameScene.atualizarDestrocos`: `{ mira: d.mira, furo: c.furo, limiares: c.limiares, estilo: c.mordida }`.
- [x] **Step 5:** `npx tsc --noEmit -p .` → sem erro.

### Task 6: A prova

- [x] **Step 1:** `_sonda-chefes.mjs`: a linha da Serpente passa a esperar três pedaços na fusão (`mordidas === 3`).
- [x] **Step 2:** rodar, nesta ordem (sem editar `src/` enquanto rodam):

```bash
node scripts/test-morte.mjs
node scripts/_inimigos/_sonda-serpente-fusao.mjs $F/cru/sonda-depois --novo
node scripts/_inimigos/_sonda-serpente-fusao.mjs --comparar=$F/cru/sonda-antes,$F/cru/sonda-depois
node scripts/_inimigos/_sonda-chefes.mjs
node scripts/_inimigos/_filmar-serpente-fusao.mjs $F depois
node scripts/_inimigos/_filmar-serpente-fusao.mjs $F --lado=antes,depois
```

Esperado: tudo ok; três mordidas na fusão, em ordem, cada uma no seu ponto; a estrela fora só da fusão; zero folhas
de explosão; os seis recortes das formas A–C idênticos; os outros chefões como antes.
- [x] **Step 3:** conferir quadros do `lado.webm` ampliados (o rasgo, o jato, o pingo) antes de mostrar.

### Task 7: A folha

- [x] **Step 1:** `serpente.html`: os três pontos marcados na arte (os 9 quadros, a semente de cada mordida), o
  `lado.webm` em velocidade real, e as medidas (os limiares, a sonda). Ele julga o `torto` e a quantidade de gotas.
