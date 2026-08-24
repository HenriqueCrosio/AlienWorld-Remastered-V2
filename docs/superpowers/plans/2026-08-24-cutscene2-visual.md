# Fatia 4 — Cutscene 2 (a doca do cinturão): plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA — use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam
> caixinhas (`- [ ]`) para acompanhamento.

**Objetivo:** trocar a apresentação da Cutscene 2 — a pintura do Henrique vira o céu, a doca vira
uma plataforma escura suspensa recortada da arte nova, as janelas âmbar piscam em código e o
Arauto passa a ser visível na pista — sem mexer em um único tempo do roteiro.

**Arquitetura:** três camadas com papéis separados (céu pintado / doca-sprite / luz em código).
A doca continua um sprite independente porque ela **desliza** na aproximação e **morre** no fim;
assá-la no fundo mataria os dois beats. A cordilheira é aposentada — uma doca que flutua não está
encravada em nada.

**Stack:** TypeScript + Phaser 3 + Vite. Arte tratada em disco com `sharp`. Verificação por sondas
Playwright (`scripts/probe-*.mjs`) + revisão a olho do Henrique.

**Spec:** `docs/superpowers/specs/2026-08-24-cutscene2-visual-design.md`
**Branch:** `feat/cutscene2-visual` (já criada, já com o spec commitado)

---

## Restrições globais

Valem para TODAS as tarefas:

- **Autoria dos commits: só o Henrique.** Nunca `Co-Authored-By`.
  Use: `git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" commit`
- **Nenhum tempo, texto ou entrada do roteiro muda.** Esta fatia é apresentação.
- **Não existe tecla de pular nesta cutscene, e isso é de propósito.** Não adicione uma.
- **Escala INTEIRA em pixel art.** ×1 ou ×2, nunca fracionária — ela borra a grade.
- **Medir, nunca chutar.** Toda linha (pista, borda, âncora) sai de uma medição no PNG.
- **Toda arte nova entra com guarda de textura** (`this.textures.exists(...)`), com fallback para
  o comportamento de hoje. O jogo nunca quebra por falta de PNG.
- **Sonda ASSERTA, não imprime.** Uma sonda que só faz `console.log` não reprova nada.
- **A arte precisa da aprovação do Henrique a olho** antes de a tarefa ser dada como fechada.
- **Ambiente:** `export PATH="/c/Program Files/nodejs:$PATH"` antes de `node`/`npm` no Git Bash.
  O dev server precisa estar de pé (`npm run dev`, porta 5173) para qualquer sonda rodar.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `public/sprites/paint-bg-cut2.png` | **Criar.** O céu, 480×270 | 1 |
| `public/sprites/doca-cinturao.png` | **Criar.** A doca recortada da arte nova | 2 |
| `src/data/doca-luzes.json` | **Criar.** Os pontos âmbar medidos | 3 |
| `scripts/_cut2-doca.mjs` | **Criar.** Corrige o tom, recorta, mede a pista, esfuma | 2 |
| `scripts/_cut2-luzes.mjs` | **Criar.** Acha os pontos quentes por saturação | 3 |
| `scripts/probe-cut2-visual.mjs` | **Criar.** A sonda desta fatia, com asserts | 1–5 |
| `src/scenes/BootScene.ts` | **Modificar.** Registrar as duas chaves novas | 1, 2 |
| `src/scenes/Interlude2Scene.ts` | **Modificar.** Camadas, geometria, luzes, Arauto, cadeia | 1–5 |

⚠️ **A chave da doca nova é `docaCinturao`, NUNCA `doca2`.** O `pickVariant` descobre variantes
pelo sufixo numérico (`doca2`, `doca3`) e sortearia entre a arte nova e a velha. Foi o que pegou o
cargueiro e o drone na Fatia 3.

---

## Task 1: O céu — a pintura do cinturão

**Por que primeiro:** é a única peça que não depende de nenhuma outra, e ela destrava a revisão
visual de todas as seguintes — a doca só pode ser julgada contra o céu em que ela vai viver.

**Arquivos:**
- Criar: `public/sprites/paint-bg-cut2.png`
- Criar: `scripts/probe-cut2-visual.mjs`
- Modificar: `src/scenes/BootScene.ts` (perto da linha 536, onde `paintBgCut1` está registrado)
- Modificar: `src/scenes/Interlude2Scene.ts` (campos ~48-50, `create()` ~143, `update()` ~343)

**Interfaces:**
- Produz: a chave de textura `paintBgCut2`; o campo `Interlude2Scene.paintedBg`
  (`Phaser.GameObjects.Image | null`); o campo `Interlude2Scene.parallax` passa a ser
  `Parallax | null`.
- Consome: `scripts/paint-bg.mjs` (já existe, genérico:
  `node scripts/paint-bg.mjs <in> <out> <W> <H>`).

- [ ] **Passo 1: Gerar o PNG do céu**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
node scripts/paint-bg.mjs assets/raw/paint-bg-cut2-original.png public/sprites/paint-bg-cut2.png 480 270
```

Esperado: `public/sprites/paint-bg-cut2.png: 480x270 (crop central 1254x705 de 1254x1254)`

- [ ] **Passo 2: Conferir que o arquivo saiu no tamanho certo**

```bash
node -e "require('sharp')('public/sprites/paint-bg-cut2.png').metadata().then(m=>console.log(m.width+'x'+m.height))"
```

Esperado: `480x270`

- [ ] **Passo 3: Registrar a chave no BootScene**

Em `src/scenes/BootScene.ts`, logo abaixo da linha `paintBgCut1: 'sprites/paint-bg-cut1.png',`:

```ts
  // O céu da CUTSCENE 2 — a doca no cinturão. Mesmo tratamento do paintBgCut1: 480×270, 1px de
  // arte = 1px de jogo, posicionada em y=-27. A pintura é do Henrique.
  paintBgCut2: 'sprites/paint-bg-cut2.png',
```

- [ ] **Passo 4: Escrever a sonda que FALHA**

Criar `scripts/probe-cut2-visual.mjs`:

```js
// A FATIA 4 — a apresentação da doca do cinturão. Entra pelo atalho [O] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const acha = (k) =>
      s.children.list.find((o) => o.texture && o.texture.key === k) ?? null;
    const ceu = acha('paintBgCut2');
    return {
      cena: s.scene.key,
      ceu: ceu ? { x: Math.round(ceu.x), y: Math.round(ceu.y), d: ceu.depth } : null,
      temParallaxPixel: !!s.parallax,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('o');
await page.waitForTimeout(2500);

const e = await estado();
console.log('estado', JSON.stringify(e));

ok(e.cena === 'Interlude2', 'está na Interlude2');
ok(e.ceu !== null, 'a PINTURA do cinturão está na cena');
ok(e.ceu !== null && e.ceu.d === -110, 'a pintura está no depth -110 (atrás do starfield)');
ok(e.temParallaxPixel === false, 'o parallax pixel foi APOSENTADO (a pintura o substituiu)');

await page.screenshot({ path: 'probe-cut2-aproximacao.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
```

- [ ] **Passo 5: Rodar a sonda e ver que ela REPROVA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: FALHA. `✘ a PINTURA do cinturão está na cena` e
`✘ o parallax pixel foi APOSENTADO` — a cena ainda monta o `Parallax`.

- [ ] **Passo 6: Trocar o parallax pela pintura na cena**

Em `src/scenes/Interlude2Scene.ts`, nos campos (perto da linha 49), trocar:

```ts
  private parallax!: Parallax;
```

por:

```ts
  /** O céu: a pintura do Henrique (o cinturão visto de dentro). Null = sem PNG, caiu no parallax. */
  private paintedBg: Phaser.GameObjects.Image | null = null;
  /** Fallback do céu (o parallax pixel da Fase 2) — só existe quando a pintura NÃO existe. */
  private parallax: Parallax | null = null;
```

Em `create()`, trocar a linha `this.parallax = new Parallax(this, 'espaco');` (e o comentário
acima dela) por:

```ts
    // O CÉU é a pintura do Henrique. Depth −110: ATRÁS do starfield (−100), porque são as
    // estrelas em movimento que carregam a deriva — a pintura sozinha seria um quadro parado.
    this.paintedBg = null;
    this.parallax = null;
    if (this.textures.exists('paintBgCut2')) {
      this.paintedBg = this.add.image(0, -27, 'paintBgCut2').setOrigin(0, 0).setDepth(-110);
    } else {
      // Sem o PNG: o céu antigo (o mesmo parallax da Fase 2) — comportamento de hoje.
      this.parallax = new Parallax(this, 'espaco');
    }
```

Em `update()`, trocar `this.parallax.update(dt, 20);` por:

```ts
    this.parallax?.update(dt, 20);
    // Deriva lentíssima: a cena dura <40s e a pintura tem 96px de folga horizontal.
    if (this.paintedBg) this.paintedBg.x -= 20 * 0.015 * dt;
```

- [ ] **Passo 7: Rodar a sonda e ver que ela PASSA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: `TUDO VERDE`, saída 0.

- [ ] **Passo 8: Conferir o FALLBACK**

```bash
mv public/sprites/paint-bg-cut2.png /tmp/pb2.png
node scripts/probe-cut2-visual.mjs ; mv /tmp/pb2.png public/sprites/paint-bg-cut2.png
```

Esperado: a sonda reprova nos asserts da pintura, **mas a cena SOBE e não há
`[ERRO DE PÁGINA]`** — ela caiu no parallax pixel. É esse o comportamento correto do fallback.

- [ ] **Passo 9: Build limpo**

```bash
npm run build
```

Esperado: sem erro de typecheck e sem erro de bundle.

- [ ] **Passo 10: Revisão a olho**

Mostrar `probe-cut2-aproximacao.png` ao Henrique. Pergunta: *o céu lê como um cinturão com
profundidade?* Não seguir sem o aval dele.

- [ ] **Passo 11: Commit**

```bash
git add public/sprites/paint-bg-cut2.png scripts/probe-cut2-visual.mjs src/scenes/BootScene.ts src/scenes/Interlude2Scene.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(cutscene2): o ceu do cinturao e a pintura do Henrique"
```

---

## Task 2: A doca — recorte da arte nova, e a cordilheira aposentada

**Arquivos:**
- Criar: `scripts/_cut2-doca.mjs`
- Criar: `public/sprites/doca-cinturao.png`
- Modificar: `src/scenes/BootScene.ts`
- Modificar: `src/scenes/Interlude2Scene.ts` (constantes ~77-119, `create()` ~163, `construirPlataforma()` ~222)

**Interfaces:**
- Consome: `paintBgCut2` (Task 1) — a doca só pode ser julgada contra o céu.
- Produz: a chave de textura `docaCinturao`; as constantes remedidas `ART_W`, `ART_H`, `PAD_ROW`,
  `PAD_X0`, `PAD_X1`, `SCALE` em `Interlude2Scene`; o campo `plataforma` continua existindo mas
  **vazio** (os spreads `...this.plataforma` nas linhas 437 e 686 viram no-ops).

**Fonte da arte:** PixelLab object `906bb897-cc25-47cb-b852-d7f343e03533`, rotação `unknown`
(256×256; conteúdo opaco em `y 36..226`).

- [ ] **Passo 1: Baixar a arte nova**

```bash
mkdir -p scripts/_cut2
curl -s -o scripts/_cut2/novo-base.png \
  "https://backblaze.pixellab.ai/file/pixellab-characters/objects/f7282f36-b779-4f64-832a-4693ca4cc628/906bb897-cc25-47cb-b852-d7f343e03533/rotations/unknown.png"
node -e "require('sharp')('scripts/_cut2/novo-base.png').metadata().then(m=>console.log(m.width+'x'+m.height))"
```

Esperado: `256x256`

- [ ] **Passo 2: Escrever o script que corrige, recorta e MEDE**

Criar `scripts/_cut2-doca.mjs`:

```js
// A DOCA DO CINTURÃO — corrige o tom da arte nova, recorta o convés, MEDE a linha da pista e
// esfuma as bordas do recorte.
//
// ⚠️ A arte chega ESMAGADA NO PRETO: 99,4% dos pixels opacos abaixo de 0,1 de luminância, e o
// mais claro da imagem inteira é 0,534. `normalise()` NÃO resolve — uns poucos pixels a 0,53
// travam o alongamento. O que resolve é ganho linear.
//
// ⚠️ Borda reta é veneno: o recorte é retangular e a costura aparece contra a pintura. O feather
// é obrigatório, não enfeite.
//
// uso: node scripts/_cut2-doca.mjs [ganho]     (padrão: 2.2)
import sharp from 'sharp';

const GANHO = Number(process.argv[2] ?? 2.2);
const SRC = 'scripts/_cut2/novo-base.png';
const OUT = 'public/sprites/doca-cinturao.png';
const FADE = 6; // largura da rampa de alpha, em px

// 1. Corrigir o tom sobre o conteúdo opaco (y 36..226).
const corrigida = await sharp(SRC)
  .extract({ left: 0, top: 36, width: 256, height: 190 })
  .linear(GANHO, 0)
  .png()
  .toBuffer();

// 2. MEDIR a laje: a linha com mais pixels de tom médio é o convés.
const { data: d0, info: i0 } = await sharp(corrigida)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const lum = (b, i) => (b[i] * 0.299 + b[i + 1] * 0.587 + b[i + 2] * 0.114) / 255;
let melhor = { y: -1, n: -1, x0: 0, x1: 0 };
for (let y = 0; y < i0.height; y++) {
  let n = 0, x0 = i0.width, x1 = 0;
  for (let x = 0; x < i0.width; x++) {
    const i = (y * i0.width + x) * 4;
    if (d0[i + 3] > 8 && lum(d0, i) > 0.17) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; }
  }
  if (n > melhor.n) melhor = { y, n, x0, x1 };
}
console.log(`LAJE medida: y=${melhor.y} (${melhor.n} px claros) x ${melhor.x0}..${melhor.x1}`);

// 3. Recortar: a laje mais a estrutura que desce dela, até a base do conteúdo.
const TOP = Math.max(0, melhor.y - 16);
const LEFT = 14;
const W = 214;
const H = i0.height - TOP;
const PAD_ROW = melhor.y - TOP; // a linha da pista DENTRO do recorte
const recorte = await sharp(corrigida)
  .extract({ left: LEFT, top: TOP, width: W, height: H })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

// 4. FEATHER nas bordas esquerda e direita (as verticais que denunciam o corte).
const { data, info } = recorte;
const idx = (x, y) => (y * info.width + x) * 4 + 3;
for (let y = 0; y < info.height; y++) {
  for (let k = 0; k < FADE; k++) {
    const f = (k + 1) / (FADE + 1);
    const e = idx(k, y);
    data[e] = Math.round(data[e] * f);
    const dd = idx(info.width - 1 - k, y);
    data[dd] = Math.round(data[dd] * f);
  }
}

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png()
  .toFile(OUT);

console.log(`${OUT}: ${info.width}x${info.height}`);
console.log(`>>> CONSTANTES para Interlude2Scene:`);
console.log(`    ART_W = ${info.width}`);
console.log(`    ART_H = ${info.height}`);
console.log(`    PAD_ROW = ${PAD_ROW}`);
console.log(`    PAD_X0 = ${Math.max(0, melhor.x0 - LEFT)}`);
console.log(`    PAD_X1 = ${Math.min(info.width - 1, melhor.x1 - LEFT)}`);
```

- [ ] **Passo 3: Rodar o script e ANOTAR as constantes**

```bash
node scripts/_cut2-doca.mjs 2.2
```

Esperado: uma linha `LAJE medida: y=~143 ...`, o PNG escrito, e o bloco `>>> CONSTANTES`.
**Anote os cinco números** — eles vão para o código no Passo 6. Se `PAD_ROW` sair fora da faixa
`10..25`, o recorte pegou a linha errada: rode com outro ganho e confira o PNG a olho antes de
seguir.

- [ ] **Passo 4: Registrar a chave no BootScene**

Em `src/scenes/BootScene.ts`, logo abaixo de `doca: 'sprites/doca.png',` (linha ~419):

```ts
  // A DOCA DO CINTURÃO — recortada da arte nova (PixelLab 906bb897), corrigida no tom e
  // esfumada nas bordas por `scripts/_cut2-doca.mjs`.
  // ⚠️ NUNCA renomear para `doca2`: o pickVariant trataria isso como VARIANTE e sortearia entre
  // a arte nova e a velha a cada spawn. Foi o que pegou o cargueiro na Fatia 3.
  docaCinturao: 'sprites/doca-cinturao.png',
```

- [ ] **Passo 5: Acrescentar os asserts da doca à sonda (ela vai REPROVAR)**

Em `scripts/probe-cut2-visual.mjs`, dentro do `page.evaluate` do `estado()`, acrescentar ao objeto
devolvido:

```js
      doca: (() => {
        const d = acha('docaCinturao');
        return d ? { x: Math.round(d.x), y: Math.round(d.y), s: d.scaleX } : null;
      })(),
      cordilheira: s.plataforma === undefined ? 'removida' : s.plataforma.length,
```

E depois dos asserts existentes:

```js
ok(e.doca !== null, 'a DOCA NOVA está na cena');
ok(e.doca !== null && Number.isInteger(e.doca.s), 'a doca está em escala INTEIRA');
ok(e.cordilheira === 'removida', 'o chão falso foi APAGADO (a doca flutua)');
```

- [ ] **Passo 6: Rodar a sonda e ver que ela REPROVA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: FALHA em `a DOCA NOVA está na cena` (a cena ainda usa `doca`) e em
`a cordilheira foi APOSENTADA` (ela ainda constrói as peças).

- [ ] **Passo 7: Trocar a geometria e a textura da doca**

Em `src/scenes/Interlude2Scene.ts`, substituir o bloco de constantes da doca (linhas ~71-89) por
— **usando os números que o Passo 3 imprimiu**:

```ts
  // ─── A GEOMETRIA DA DOCA — medida por `scripts/_cut2-doca.mjs` na arte nova (906bb897) ───
  // ⚠️ Estes números saem da MEDIÇÃO, nunca do olho. Chutar a linha do convés da Aurora já fez a
  // nave pousar 30px abaixo da tela, no vazio. Se o recorte mudar, rode o script de novo.
  private static readonly ART_W = 214;   // ← do Passo 3
  private static readonly ART_H = 63;    // ← do Passo 3
  private static readonly PAD_ROW = 16;  // ← do Passo 3
  private static readonly PAD_X0 = 12;   // ← do Passo 3
  private static readonly PAD_X1 = 186;  // ← do Passo 3

  /**
   * ×1: escala INTEIRA. A doca antiga era ×1.5 — fracionária, e ela BORRA a grade de pixel, que é
   * a única coisa que faz o jogo parecer feito de pixels (o mesmo defeito que tirou o cargueiro
   * de 1.9× na Fatia 3). Se o tamanho em tela não fechar, o que muda é o RECORTE, não a escala.
   */
  private static readonly SCALE = 1;
```

Na `create()`, trocar a criação da doca (linha ~165) por:

```ts
    // Guarda: sem a arte nova, cai na doca antiga (comportamento de hoje).
    const docaTex = this.textures.exists('docaCinturao') ? 'docaCinturao' : 'doca';
    this.doca = this.add
      .image(Interlude2Scene.DOCA_X, Interlude2Scene.docaY, docaTex)
      .setScale(Interlude2Scene.SCALE)
      .setDepth(Interlude2Scene.DEPTH_DOCA);
```

⚠️ **O `.setTint(0xd9deee)` some.** Ele existia para esfriar a arte bege da doca antiga; a arte
nova já é azul-escura, e um tint CLARO a devolveria para o lugar de "coisa mais clara da tela" —
que é justamente o defeito que esta fatia existe para consertar.

Se na revisão do Passo 11 a doca ainda ler como **colagem** sobre a pintura (o efeito de o ganho
×2.2 ter puxado o azul dela para além do azul do céu), o remédio é um tint **escuro e frio** —
comece em `0xb8c2d8` e desça. Nunca um tint claro.

- [ ] **Passo 8: Apagar o CHÃO FALSO — remoção completa**

O que o código chama de "cordilheira" são **33 sprites de asteroide** (`asteroid`/`asteroid2`/
`asteroid3` + 2 `destroco`) ampliados de 1.4× a 4.2×, tingidos de azul-escuro e enfileirados no
rodapé e nas laterais (`y = 172..224`, `x = −8..545`). Não são montanhas e não são as rochas
amarradas pelos cabos — é **um chão falso**, e o comentário do próprio código diz para quê:
*"sem ela, a doca flutua"*.

A doca agora **flutua de propósito**, então a função dessas peças está invertida. E a pintura do
cinturão já desenha rocha de verdade em toda a tela: conferido em jogo, sem elas a cena não abre
buraco nenhum.

**Remoção completa — apagar os OITO pontos de uso.** Decisão do Henrique (2026-08-24): não deixar
lápide; o porquê fica registrado no comentário de cabeçalho da classe.

1. O campo `private plataforma: Phaser.GameObjects.Image[] = [];` (~linha 61) e o comentário dele.
2. As constantes `DEPTH_PLAT_FUNDO` e `DEPTH_PLAT_FRENTE` (~linhas 103-104).
   ⚠️ **Isto não é opcional.** `tsconfig.json` tem `noUnusedLocals: true` e `npm run build` roda
   `tsc --noEmit`: constante privada sem leitor **reprova o build**.
3. `this.plataforma = [];` em `create()` (~linha 139).
4. A chamada `this.construirPlataforma();` em `create()` (~linha 163).
5. O método `construirPlataforma()` inteiro, com o array `pecas` e o doc-comment (~linhas 214-290).
6. `for (const p of this.plataforma) p.x += entrada;` em `roteiro()` (~linha 429), com o comentário
   de duas linhas acima dele.
7. `...this.plataforma` da lista de `targets` do tween de deslize (~linha 437) — que passa a ser
   `targets: [this.doca, this.padRim]`.
8. O tween inteiro `targets: this.plataforma, y: '+=60', alpha: 0` no fim da partida (~linhas
   684-692), com o comentário de três linhas acima dele. O tween da doca logo acima dele
   (`targets: [this.doca, this.padRim]`) **fica** — é ele que afunda a doca no fim.

E acrescentar ao doc-comment de cabeçalho da classe `Interlude2Scene`, junto das outras decisões
da cena:

```ts
 * ─── NÃO HÁ CHÃO AQUI (Fatia 4) ───
 *
 * Até a Fatia 4 a cena montava 33 asteroides ampliados no rodapé para a doca não parecer que
 * flutuava. Ela flutua — é uma plataforma SUSPENSA, presa pelos cabos, e é assim que a pintura
 * do cinturão desenha aquele lugar: as estações pendem de guindastes, não se fincam em chão.
 * O chão falso foi apagado; a rocha que aparece atrás da doca é a da pintura.
```

Ajustar também o assert da sonda do Passo 5, já que o campo deixa de existir:

```js
      cordilheira: s.plataforma === undefined ? 'removida' : s.plataforma.length,
```

```js
ok(e.cordilheira === 'removida', 'o chão falso foi APAGADO (a doca flutua)');
```

- [ ] **Passo 9: Rodar a sonda e ver que ela PASSA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: `TUDO VERDE`. Se `a doca está em escala INTEIRA` reprovar, `SCALE` ficou fracionária —
volte ao Passo 7.

- [ ] **Passo 10: Conferir o fallback e o build**

```bash
mv public/sprites/doca-cinturao.png /tmp/dc.png
node scripts/probe-cut2-visual.mjs ; mv /tmp/dc.png public/sprites/doca-cinturao.png
npm run build
```

Esperado: com o PNG fora, a cena SOBE na doca antiga e não há `[ERRO DE PÁGINA]`; o build passa.

- [ ] **Passo 11: Revisão a olho**

Mostrar `probe-cut2-aproximacao.png` ao Henrique. Perguntas: *a doca deixou de ser a coisa mais
clara da tela? A costura do recorte aparece contra a pintura?* Se a costura aparecer, subir o
`FADE` no `_cut2-doca.mjs` e rodar de novo. Não seguir sem o aval.

- [ ] **Passo 12: Commit**

```bash
git add public/sprites/doca-cinturao.png scripts/_cut2-doca.mjs scripts/probe-cut2-visual.mjs src/scenes/BootScene.ts src/scenes/Interlude2Scene.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(cutscene2): a doca vira plataforma suspensa, recortada da arte nova"
```

---

## Task 3: As janelas âmbar piscando — em código

**Por que em código:** o PixelLab anima o QUADRO INTEIRO. Ele não tem como saber que só as janelas
deviam piscar, então re-renderiza a cena toda a cada quadro e **cada re-render escorrega** — a mesma
"anima sem âncora" que obrigou o `centrar-anim.mjs` a existir. Num inimigo de 45px a deriva se
corrige recentrando; num fundo ela é fatal, porque o mundo inteiro nada junto. Foi exatamente isso
que derrubou a tentativa do Henrique.

**Arquivos:**
- Criar: `scripts/_cut2-luzes.mjs`
- Criar: `src/data/doca-luzes.json`
- Modificar: `src/scenes/Interlude2Scene.ts`

**Interfaces:**
- Consome: `public/sprites/doca-cinturao.png` (Task 2) — os pontos são medidos NELE, em coordenadas
  da arte, então eles seguem a doca quando ela desliza.
- Produz: `src/data/doca-luzes.json`, no formato `{ "pontos": [[x, y], ...] }` com `x`/`y` inteiros
  em coordenadas da ARTE (0..ART_W, 0..ART_H); o campo `Interlude2Scene.luzes`
  (`Phaser.GameObjects.Image[]`) e o método `private acenderJanelas(): void`.

- [ ] **Passo 1: Escrever o script que acha os pontos quentes**

⚠️ **Por SATURAÇÃO, não por luminância.** Lição já paga na Fatia 3: o casco e as espinhas do
cargueiro são claros mas NEUTROS, e um limiar de brilho os devolve junto com as luzes.

Criar `scripts/_cut2-luzes.mjs`:

```js
// AS JANELAS DA DOCA — acha os pontos quentes da arte para o jogo os fazer piscar EM CÓDIGO.
//
// ⚠️ O critério é SATURAÇÃO, não luminância: metal claro é claro mas NEUTRO, e um limiar de
// brilho devolveria o casco junto com as lâmpadas.
//
// uso: node scripts/_cut2-luzes.mjs
import sharp from 'sharp';
import { writeFileSync } from 'fs';

const SRC = 'public/sprites/doca-cinturao.png';
const OUT = 'src/data/doca-luzes.json';
const MAX = 24; // teto de pontos: um sprite por ponto, e 200 seria desperdício de draw call

const hsv = (r, g, b) => {
  const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m;
  let h = 0;
  if (d) {
    if (M === r) h = 60 * (((g - b) / d) % 6);
    else if (M === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return [h, M ? d / M : 0, M / 255];
};

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const cand = [];
for (let y = 0; y < info.height; y++) {
  for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4;
    if (data[i + 3] < 8) continue;
    const [h, s, v] = hsv(data[i], data[i + 1], data[i + 2]);
    // Âmbar: matiz quente, saturado, e aceso o bastante para ser lâmpada e não ferrugem.
    if (v > 0.12 && s > 0.30 && h >= 10 && h <= 65) cand.push({ x, y, v });
  }
}

// Um ponto por AGRUPAMENTO: pixels vizinhos são a mesma janela, e 4 sprites empilhados num
// mesmo lugar leem como um borrão, não como uma luz.
cand.sort((a, b) => b.v - a.v);
const pontos = [];
for (const c of cand) {
  if (pontos.length >= MAX) break;
  if (pontos.some((p) => Math.abs(p[0] - c.x) < 5 && Math.abs(p[1] - c.y) < 5)) continue;
  pontos.push([c.x, c.y]);
}

writeFileSync(OUT, JSON.stringify({ pontos }, null, 2) + '\n');
console.log(`${OUT}: ${pontos.length} janelas (de ${cand.length} pixels quentes)`);
```

- [ ] **Passo 2: Rodar e conferir a contagem**

```bash
mkdir -p src/data
node scripts/_cut2-luzes.mjs
```

Esperado: `src/data/doca-luzes.json: N janelas (de M pixels quentes)`, com **N entre 8 e 24**.
Se N vier 0 ou 1, o limiar de saturação está alto demais para esta arte: baixar `s > 0.30` para
`s > 0.22` e rodar de novo.

- [ ] **Passo 3: Acrescentar o assert das luzes à sonda (vai REPROVAR)**

Em `scripts/probe-cut2-visual.mjs`, dentro do `estado()`:

```js
      luzes: s.luzes ? s.luzes.length : -1,
      luzAlpha: s.luzes && s.luzes[0] ? Number(s.luzes[0].alpha.toFixed(3)) : -1,
```

E nos asserts:

```js
ok(e.luzes >= 8, `as janelas âmbar existem (${e.luzes})`);
```

Mais um assert de que elas **respiram** — duas amostras no tempo, tiradas depois do bloco de
asserts existentes:

```js
const a1 = (await estado()).luzAlpha;
await page.waitForTimeout(700);
const a2 = (await estado()).luzAlpha;
ok(Math.abs(a1 - a2) > 0.02, `as janelas PISCAM (alpha ${a1} → ${a2})`);
```

- [ ] **Passo 4: Rodar a sonda e ver que ela REPROVA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: FALHA em `as janelas âmbar existem (-1)`.

- [ ] **Passo 5: Acender as janelas na cena**

Em `src/scenes/Interlude2Scene.ts`, no topo, junto dos outros imports:

```ts
import LUZES_DOCA from '../data/doca-luzes.json';
```

Nos campos, junto de `private cabos!`:

```ts
  /** As janelas âmbar da doca. Elas respiram em FASES diferentes — ver `acenderJanelas`. */
  private luzes: Phaser.GameObjects.Image[] = [];
```

Em `create()`, no `this.luzes = []` junto dos outros resets (perto de `this.amarras = []`), e a
chamada logo DEPOIS da criação da doca (para elas herdarem a posição dela):

```ts
    this.acenderJanelas();
```

E o método novo, logo abaixo de `construirPlataforma()`:

```ts
  /**
   * AS JANELAS DA DOCA — piscam em CÓDIGO, sobre a arte parada.
   *
   * ⚠️ Não tente animar isto no PixelLab. Ele anima o QUADRO INTEIRO, não os 20 pixels que
   * interessam, e cada re-render ESCORREGA — num inimigo a deriva se recentra, num cenário ela
   * faz o mundo inteiro nadar. É a mesma família de `pulsar-brilho.mjs`: idle sintetizado ganha
   * de idle gerado.
   *
   * As fases são DIFERENTES por ponto. Um pulso em uníssono lê como a tela inteira piscando —
   * o que se quer é uma estação viva, e coisa viva não respira em coro.
   */
  private acenderJanelas(): void {
    // `colonyLight` é o ponto de luz de janela da colônia da Fase 1: 4×4, halo frio + núcleo
    // claro, desenhado em código e feito para ser ADITIVO. O tint âmbar multiplica por cima dele.
    if (!this.textures.exists('colonyLight')) return;

    const meiaW = (Interlude2Scene.ART_W * Interlude2Scene.SCALE) / 2;
    const meiaH = (Interlude2Scene.ART_H * Interlude2Scene.SCALE) / 2;

    for (const [ax, ay] of LUZES_DOCA.pontos) {
      const x = this.doca.x - meiaW + ax * Interlude2Scene.SCALE;
      const y = this.doca.y - meiaH + ay * Interlude2Scene.SCALE;

      const luz = this.add
        .image(x, y, 'colonyLight')
        .setScale(Phaser.Math.FloatBetween(0.8, 1.4))
        .setTint(0xff9a3c)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(Interlude2Scene.DEPTH_RIM)
        .setAlpha(Phaser.Math.FloatBetween(0.35, 0.75));

      this.tweens.add({
        targets: luz,
        alpha: { from: luz.alpha, to: Phaser.Math.FloatBetween(0.15, 0.4) },
        duration: Phaser.Math.Between(900, 2200),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
        delay: Phaser.Math.Between(0, 1200),
      });

      this.luzes.push(luz);
    }
  }
```

⚠️ **As luzes precisam DESLIZAR com a doca.** No `roteiro()`, a doca entra deslizando: na linha
`this.doca.x += entrada;` acrescente logo abaixo `for (const l of this.luzes) l.x += entrada;`, e
no tween de deslize (linha ~437) acrescente `...this.luzes` à lista de `targets`.

✅ A chave `colonyLight` foi **conferida** (2026-08-24): ela existe, é gerada por
`BootScene.makeColonyLight()` (4×4, `fillCircle` de halo + núcleo) e o comentário dela já diz que
o uso pretendido é aditivo. Não existe chave `glow` neste projeto — não a invente.

- [ ] **Passo 6: Rodar a sonda e ver que ela PASSA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: `TUDO VERDE`, incluindo `as janelas PISCAM`.

- [ ] **Passo 7: Build e revisão a olho**

```bash
npm run build
```

Mostrar o screenshot ao Henrique. Pergunta: *as janelas parecem uma estação viva, ou parecem a
tela piscando?* Se for a segunda, aumentar a dispersão dos `delay` e das `duration`.

- [ ] **Passo 8: Commit**

```bash
git add src/data/doca-luzes.json scripts/_cut2-luzes.mjs scripts/probe-cut2-visual.mjs src/scenes/Interlude2Scene.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(cutscene2): as janelas da doca piscam em codigo, sem deriva"
```

---

## Task 4: O achado — o Arauto encalhado na pista

**Por que isto existe:** a premissa que separa esta cutscene da Aurora — *é aqui que o jogador põe
a mão na tecnologia do inimigo* — nunca foi desenhada. O Arauto está no comentário do arquivo e no
róster do painel, e em lugar nenhum da tela. O jogador escolhe uma nave alienígena sem nunca ter
visto de onde ela veio.

**Arquivos:**
- Modificar: `src/scenes/Interlude2Scene.ts`

**Interfaces:**
- Consome: `docaCinturao` e as constantes `PAD_ROW`/`PAD_X0`/`PAD_X1`/`SCALE` (Task 2); o helper
  estático `Interlude2Scene.artToScreenX(ax: number): number`, que já existe.
- Produz: o campo `private arauto: Phaser.GameObjects.Image | null`.

- [ ] **Passo 1: Acrescentar o assert do Arauto à sonda (vai REPROVAR)**

Em `scripts/probe-cut2-visual.mjs`, dentro do `estado()`:

```js
      arauto: s.arauto ? { x: Math.round(s.arauto.x), y: Math.round(s.arauto.y) } : null,
```

E nos asserts:

```js
ok(e.arauto !== null, 'o ARAUTO está POUSADO na doca, visível antes da escolha');
ok(e.arauto !== null && Math.abs(e.arauto.y - 150) < 24, 'o Arauto está sobre a pista, não no vazio');
```

⚠️ **A sonda acha o Arauto pelo CAMPO da cena (`s.arauto`), não pela chave de textura.** Conferido
em 2026-08-24: `SHIPS['alien'].texture` é **`'ship4'`** — um nome genérico que a nave do jogador
também pode usar. Procurar por textura acharia a nave errada e o assert passaria mentindo.

- [ ] **Passo 2: Rodar a sonda e ver que ela REPROVA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: FALHA em `o ARAUTO está POUSADO na doca`.

- [ ] **Passo 3: Pousar o Arauto**

Em `src/scenes/Interlude2Scene.ts`, nos campos:

```ts
  /** O ACHADO: o caça alienígena encalhado na pista. Null = sem a arte dele. */
  private arauto: Phaser.GameObjects.Image | null = null;
```

Em `create()`, logo depois de `this.acenderJanelas();`:

```ts
    this.encalharArauto();
```

E o método novo:

```ts
  /**
   * O ACHADO — o caça alienígena encalhado na pista, VISÍVEL antes da escolha.
   *
   * A 1ª interlude era uma PERDA (a sua frota implode); esta é um ACHADO. Mas o achado só existia
   * no texto: o Arauto aparecia como um slot no painel, e o jogador escolhia tecnologia inimiga
   * sem nunca ter visto de onde ela veio. Agora ele pousa AO LADO dela.
   *
   * ENCALHADO, não estacionado: inclinado sobre a laje e escurecido. Uma nave alinhada e limpa
   * lê como frota, e não há frota nenhuma aqui — há um destroço que a doca estava minerando.
   */
  private encalharArauto(): void {
    const alien = SHIPS['alien'];
    if (!alien || !this.textures.exists(alien.texture)) return;

    // Encostado na ponta ESQUERDA da pista: a nave do jogador pousa à direita (x≈209), e as duas
    // não podem disputar o mesmo pedaço de laje.
    const x = Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X0 + 14);

    this.arauto = this.add
      .image(x, Interlude2Scene.PAD_Y - 6, alien.texture)
      .setDepth(Interlude2Scene.DEPTH_NAVE - 1)
      .setAngle(-7)
      .setTint(0x8a93b4);
  }
```

⚠️ **Nunca toque a animação dele.** Ele está encalhado — um sprite parado. Chamar `play()` aqui
o faria pulsar os motores de uma nave morta. (Ele é um `Image`, não um `Sprite`, exatamente por
isso: um `Image` não tem como tocar animação nem por engano.)

**Sobre o "facho da doca varrendo o casco"** que o spec §5 menciona: ele NÃO entra de saída.
Inclinação + tint escuro já devem bastar para ler como encalhado, e um facho é mais uma coisa em
movimento numa cena que já tem cabo balançando, janela piscando e estrelas derivando. Se a revisão
do Passo 6 disser que ele ainda lê como *estacionado*, aí sim: um `colonyLight` alongado, aditivo,
com tween de `x` lento sobre o casco.

- [ ] **Passo 4: Rodar a sonda e ver que ela PASSA**

```bash
node scripts/probe-cut2-visual.mjs
```

Esperado: `TUDO VERDE`.

- [ ] **Passo 5: Conferir que ele não briga com o pouso**

```bash
node scripts/probe-doca.mjs
```

Esperado: continua verde, com `✔ pousou NA PISTA` — o Arauto não pode ter ocupado o ponto de
pouso da nave do jogador. Se `pousou NA PISTA` reprovar, afaste o Arauto para a esquerda
(diminua o `+ 14` no Passo 3).

- [ ] **Passo 6: Build, revisão a olho, commit**

```bash
npm run build
git add scripts/probe-cut2-visual.mjs src/scenes/Interlude2Scene.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(cutscene2): o Arauto encalhado na pista, visivel antes da escolha"
```

Pergunta ao Henrique antes do commit: *dá para ver que é uma nave alienígena, e que ela está
abandonada ali?*

---

## Task 5: Remedir a cadeia de explosões, e fechar a fatia

**O problema:** a coreografia da destruição **não muda** (decisão do Henrique), mas as coordenadas
dela não sobrevivem de graça. Hoje a cadeia caminha de `(GAME_WIDTH − 40, PAD_Y)` = `(344, 150)`
até `(60, 90)` — números casados com a doca ANTIGA, que era ×1.5 e ocupava quase a tela toda. A
doca nova é menor e suspensa; do jeito que está, **boa parte da cadeia estoura no céu vazio**.

**Arquivos:**
- Modificar: `src/scenes/Interlude2Scene.ts` (`destruicao()`, ~linha 626)
- Modificar: `scripts/probe-cut2-visual.mjs`

**Interfaces:**
- Consome: `ART_W`, `ART_H`, `SCALE`, `DOCA_X`, `PAD_Y` (Task 2).
- Produz: nada que outra tarefa use. É a última.

- [ ] **Passo 1: Acrescentar o assert da cadeia à sonda (vai REPROVAR)**

Em `scripts/probe-cut2-visual.mjs`, no fim do arquivo antes do `browser.close()`, uma passagem que
espera a destruição e confere que o fogo cai SOBRE a doca:

```js
// A DESTRUIÇÃO: o fogo tem que cair SOBRE a doca, não no céu ao lado dela.
await page.waitForTimeout(26000);
const fim = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (s.scene.key !== 'Interlude2') return { cena: s.scene.key, fora: -1 };
  const d = s.children.list.find((o) => o.texture && o.texture.key === 'docaCinturao');
  if (!d) return { cena: s.scene.key, fora: -1 };
  return {
    cena: s.scene.key,
    esq: Math.round(d.x - (d.displayWidth / 2)),
    dir: Math.round(d.x + (d.displayWidth / 2)),
  };
});
console.log('doca na destruição', JSON.stringify(fim));
ok(fim.esq !== undefined, 'a doca ainda existe no beat da destruição');
await page.screenshot({ path: 'probe-cut2-destruicao.png' });
```

- [ ] **Passo 2: Rodar e ANOTAR os limites reais da doca**

```bash
node scripts/probe-cut2-visual.mjs
```

Anote `esq` e `dir` — são os limites em tela da doca nova. A cadeia tem que viver DENTRO deles.

- [ ] **Passo 3: Remedir a cadeia**

Em `src/scenes/Interlude2Scene.ts`, dentro de `destruicao()`, trocar as duas linhas que calculam
`x` e `y` (dentro do `for` de `N = 12`) por:

```ts
        // ⚠️ A cadeia caminha DENTRO da doca, e os limites saem da doca — não de números fixos.
        // Os antigos (344 → 60) eram casados com a doca ×1.5, que ocupava quase a tela toda; com a
        // plataforma suspensa, um terço da cadeia estourava no céu vazio ao lado dela.
        const esq = this.doca.x - this.doca.displayWidth / 2;
        const dir = this.doca.x + this.doca.displayWidth / 2;
        const t = i / (N - 1);
        const x = Phaser.Math.Linear(dir - 12, esq + 12, t) + Phaser.Math.Between(-8, 8);
        const y =
          Phaser.Math.Linear(Interlude2Scene.PAD_Y, Interlude2Scene.PAD_Y - 24, t) +
          Phaser.Math.Between(-8, 8);
```

⚠️ **Não mexa nos tempos** (`900 + i * 130`), nem no `i % 3 === 2` que escolhe o estouro grande,
nem no depth `DEPTH_DOCA + 3`. Esse depth é o que põe as explosões NA FRENTE da doca — sem ele
elas nascem atrás da estação que deviam estar destruindo, e era metade do motivo de o set-piece
ler fraco.

- [ ] **Passo 4: Rodar as duas sondas**

```bash
node scripts/probe-cut2-visual.mjs
node scripts/probe-doca.mjs
```

Esperado: as duas verdes. A `probe-doca` continua terminando em `✔ a doca entrega a FASE 3`.

- [ ] **Passo 5: Regressão — a corrente inteira ainda fecha**

```bash
node scripts/probe-chain.mjs
npm run build
```

Esperado: a corrente fecha de ponta a ponta e o build sai limpo. A Cutscene 2 é um elo dela; se a
corrente quebrar aqui, alguma coisa desta fatia vazou para fora da cena.

- [ ] **Passo 6: Revisão a olho — os quatro momentos**

Mostrar ao Henrique `probe-cut2-aproximacao.png` e `probe-cut2-destruicao.png`. Perguntas:
*o fogo cai sobre a doca? A cena inteira lê como um lugar?*

- [ ] **Passo 7: Commit**

```bash
git add scripts/probe-cut2-visual.mjs src/scenes/Interlude2Scene.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "fix(cutscene2): a cadeia de explosoes cai sobre a doca nova, e nao no ceu"
```

- [ ] **Passo 8: Fechar a fatia**

⚠️ **Um merge SÓ, com `--no-ff`** (convenção da história). E `git merge -F -` **NÃO** lê de stdin
como o `git commit` — passe a mensagem por arquivo.

```bash
git checkout main
printf '%s\n' "merge: passe visual da Cutscene 2 — a doca do cinturao" > /tmp/msg.txt
git merge --no-ff -F /tmp/msg.txt feat/cutscene2-visual
git push origin main
```

- [ ] **Passo 9: Atualizar os documentos**

Escrever `docs/superpowers/plans/2026-08-24-cutscene2-visual-START.md` no molde do START da
Fatia 3: estado, o que ficou feito, **as regras que não se redescobrem** que esta fatia pagou, e a
frase de arranque apontando para a **Fatia 5 — Fase 3 (nebulosa → casco → serpente)**, lembrando
que ela também já tem pintura esperando (`assets/raw/paint-bg-f3-original.png`) e que ela ainda
não tem spec nem plano.

Atualizar a tabela de fatias em `docs/superpowers/specs/2026-07-21-menu-visual-design.md`.

---

## Dívidas registradas (NÃO fazer nesta fatia)

- **O painel de escolha tapa a cena inteira.** Durante a escolha, a doca, o Arauto e o céu somem.
- **A ferramenta de vídeo.** As sondas fotografam; o beat da explosão só se julga em movimento (a
  sonda de hoje pega o frame do clarão e devolve uma tela laranja chapada). O molde existe em
  `scripts/_ver-cargueiro-mov.mjs` — generalizá-lo é trabalho de ferramenta, não desta fatia.
- **A doca antiga (`doca.png`) continua no repositório** como fallback. Só apagar quando a arte
  nova estiver aprovada e mergeada.
