# Fatia 5 — Fase 3 (O Casco): plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA — use `superpowers:subagent-driven-development`
> (recomendado) ou `superpowers:executing-plans` para implementar tarefa a tarefa. Os passos usam
> caixinhas (`- [ ]`) para acompanhamento.

**Objetivo:** trocar a apresentação da Fase 3 — a nebulosa procedural dourada vira a pintura do
Henrique, os véus param de esconder o inimigo, o casco do Leviatã se anuncia antes da virada e
deixa de ser destroço genérico para virar a superfície de uma coisa viva e blindada.

**Arquitetura:** tudo acontece no `Parallax` e no `BootScene`. A cena e o `StageDirector` quase não
mudam — a única alteração de roteiro é UMA pista de cenário (ver Task 2, e a justificativa dela).
O mecanismo do casco e da nebulosa já existe (`setNebulaDensity` + as flags `nebulosaExtra`/`casco`
em `alphaFor`); esta fatia troca a arte e ajusta as curvas, não reescreve o sistema.

**Stack:** TypeScript + Phaser 3 + Vite. Arte tratada em disco com `sharp`. Verificação por sondas
Playwright + revisão a olho do Henrique.

**Spec:** `docs/superpowers/specs/2026-08-25-fase3-visual-design.md`
**Branch:** `feat/fase3-visual` (já criada, com o spec commitado)

---

## Restrições globais

- **Autoria dos commits: só o Henrique.** Nunca `Co-Authored-By`.
  `git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" commit`
- **Nenhuma onda, banner, inimigo ou hitbox muda.** Esta fatia é apresentação.
- **Escala INTEIRA em pixel art.** ×1 ou ×2, nunca fracionária.
- **Medir, nunca chutar.** Alpha, altura e limiar saem de medição ou de A/B, não do olho.
- **Toda arte nova entra com guarda de textura**, com fallback para o comportamento de hoje.
  (No `Parallax.addLayer` a guarda já existe: camada sem arte não entra.)
- **Sonda ASSERTA, não imprime.**
- **A arte precisa da aprovação do Henrique a olho** antes de a tarefa fechar.
- **Ambiente:** `export PATH="/c/Program Files/nodejs:$PATH"` antes de `node`/`npm` no Git Bash.
  O dev server já está de pé em `localhost:5173` — **NÃO suba outro**, ele pega outra porta e a
  sonda bate no servidor errado.
- Atalho de dev: **`[M]`** no menu entra direto na Fase 3; **`[N]`** vai para o treino da serpente.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade | Tarefa |
|---|---|---|
| `public/sprites/paint-bg-f3.png` | **Criar.** O céu do Ato 1, 480×270 | 1 |
| `assets/raw/casco-leviata-{1..7}.png` | **Criar.** As fontes das 7 artes, COMMITADAS | 3 |
| `public/sprites/casco-leviata{,2}.png` | **Criar.** Os 2 trechos lisos (a base) | 3 |
| `public/sprites/casco-detalhe{,2..5}.png` | **Criar.** Os 5 trechos de pontuação | 3 |
| `scripts/probe-f3-visual.mjs` | **Criar.** A sonda desta fatia | 1–4 |
| `src/scenes/BootScene.ts` | **Modificar.** Registrar as chaves novas | 1, 3 |
| `src/Parallax.ts` | **Modificar.** Pintura, véus, curva do casco, camadas do casco | 1–3 |
| `src/systems/StageDirector.ts` | **Modificar.** UMA pista de cenário em t=21 | 2 |

⚠️ **A fonte das artes vai para `assets/raw/` e é COMMITADA.** Lição da Fatia 4: enquanto a fonte
vivia num diretório gitignorado, a instrução "se a arte mudar, rode o script de novo" era
impossível fora de uma máquina, e os números medidos viravam folclore.

---

## Task 1: O Ato 1 — a pintura da nebulosa, e os véus contidos

**Arquivos:**
- Criar: `public/sprites/paint-bg-f3.png`
- Criar: `scripts/probe-f3-visual.mjs`
- Modificar: `src/scenes/BootScene.ts` (junto de `paintBgF2`, ~linha 541)
- Modificar: `src/Parallax.ts` (`buildNebula()` ~linha 854; `setNebulaDensity()` ~linha 1131; campos)

**Interfaces:**
- Produz: a chave de textura `paintBgF3`; o campo `Parallax.nebulaPainting: Phaser.GameObjects.Image[]`.
- Consome: `scripts/paint-bg.mjs` (já existe: `node scripts/paint-bg.mjs <in> <out> <W> <H>`).

- [ ] **Passo 1: Gerar o PNG do céu**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
node scripts/paint-bg.mjs assets/raw/paint-bg-f3-original.png public/sprites/paint-bg-f3.png 480 270
```

Esperado: `public/sprites/paint-bg-f3.png: 480x270 (crop central 1625x914 de 1625x968)`

⚠️ **Recorte central, e só.** Custa 5,6% da altura — MEDIDO. **NÃO use `scripts/alargar-16x9.mjs`**:
ele existe para pinturas QUADRADAS (a da Cutscene 2 perdia 44%), e as laterais que ele inventa são
mancha borrada, não arte. Aqui não é preciso.

- [ ] **Passo 2: Registrar a chave no BootScene**

Em `src/scenes/BootScene.ts`, logo abaixo da linha `paintBgF2: 'sprites/paint-bg-f2.png',`:

```ts
  // O céu do ATO 1 da FASE 3 — a nebulosa de Kepler, pintada pelo Henrique. Mesma receita do
  // paintBgF2: 480×270, posicionada em y=-27. Ela SEGUE o nebulaDim (some quando a nuvem abre).
  paintBgF3: 'sprites/paint-bg-f3.png',
```

- [ ] **Passo 3: Escrever a sonda que FALHA**

Criar `scripts/probe-f3-visual.mjs`:

```js
// A FATIA 5 — a apresentação da Fase 3. Entra pelo atalho [M] do menu.
// Ela ASSERTA (não só fotografa): cada achado desta fatia vira uma condição que reprova.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

let falhas = 0;
const ok = (cond, msg) => {
  console.log((cond ? '✔ ' : '✘ ') + msg);
  if (!cond) falhas++;
};

/** Mantém a nave viva: a sonda não sabe jogar, e uma sonda morta testa o GameOver. */
const respirar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s.lives !== undefined) s.lives = 9;
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const p = s.parallax;
    const acha = (k) => s.children.list.filter((o) => o.texture && o.texture.key === k);
    const pint = acha('paintBgF3');
    return {
      cena: s.scene.key,
      t: Number((s.elapsed ?? 0).toFixed(1)),
      nebulaDim: p ? Number(p.nebulaDim.toFixed(2)) : null,
      pintura: pint.length
        ? { n: pint.length, y: Math.round(pint[0].y), d: pint[0].depth, a: Number(pint[0].alpha.toFixed(2)) }
        : null,
      // As camadas do Parallax, por chave: quantos sprites e o alpha do primeiro.
      camadas: (p?.layers ?? []).map((l) => ({
        key: l.key,
        n: l.sprites.length,
        alpha: l.sprites[0] ? Number(l.sprites[0].alpha.toFixed(3)) : null,
        primeiroPlano: !!l.primeiroPlano,
        casco: !!l.casco,
      })),
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);
await respirar();

const e = await estado();
console.log('t=' + e.t, JSON.stringify(e.camadas.map((c) => c.key)));

ok(e.cena === 'Game', 'está na fase');
ok(e.pintura !== null, 'a PINTURA da nebulosa está na cena');
ok(e.pintura !== null && e.pintura.n === 2, 'a pintura entra em DUAS cópias (rolagem sem buraco)');
ok(e.pintura !== null && e.pintura.y === -27, 'a pintura está em y=-27 (centrada na janela)');

// A camada procedural mais profunda da nuvem saiu; a do meio ficou.
const nebulas = e.camadas.filter((c) => c.key === 'nebula3');
ok(nebulas.length === 2, `restam 2 camadas de nebula3 procedural (achei ${nebulas.length})`);
ok(nebulas.some((c) => c.primeiroPlano), 'os VÉUS (primeiroPlano) continuam existindo');

await page.screenshot({ path: 'scripts/_f3/probe-ato1.png' });

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO VERDE');
process.exit(falhas ? 1 : 0);
```

- [ ] **Passo 4: Rodar a sonda e ver que ela REPROVA**

```bash
mkdir -p scripts/_f3
node scripts/probe-f3-visual.mjs
```

Esperado: FALHA. `✘ a PINTURA da nebulosa está na cena` e
`✘ restam 2 camadas de nebula3 procedural (achei 3)`.

- [ ] **Passo 5: Instalar a pintura no `buildNebula()`**

Em `src/Parallax.ts`, nos campos da classe (junto de `private nebulaDim = 1;`, ~linha 131):

```ts
  /**
   * A pintura do céu da FASE 3. Ela NÃO é uma `ScatterLayer` — é uma placa fixa, como o
   * `paintBgF2` — então o alpha dela não passa por `alphaFor`. Quem a apaga é o
   * `setNebulaDensity`, à mão. Ver o comentário lá.
   */
  private nebulaPainting: Phaser.GameObjects.Image[] = [];
```

No topo de `buildNebula()`, ANTES da primeira `addLayer`, acrescentar:

```ts
    // A PINTURA DO HENRIQUE é o corpo da nuvem. Ela SUBSTITUI a camada procedural mais profunda
    // (a de baixo, `factor 0.05`) — as outras duas continuam, e é isso que mantém o movimento:
    // uma placa parada atrás + nuvem procedural derivando por cima lê como "voar dentro"; a placa
    // sozinha leria como papel de parede.
    //
    // ⚠️ Ela é uma PLACA, não uma ScatterLayer: o alpha dela não passa por `alphaFor`, e por isso
    // o `setNebulaDensity` a apaga à mão. Sem isso ela ficaria de pé depois de t=42 e o ATO 2
    // teria nebulosa no céu — a fase inteira perderia a virada.
    //
    // −27 = (270−216)/2: centraliza a pintura de 480×270 na janela de 384×216. Duas cópias
    // lado a lado, como o `paintBgF2`, para a rolagem nunca mostrar buraco.
    const temPintura = this.scene.textures.exists('paintBgF3');
    if (temPintura) {
      const w = (this.scene.textures.get('paintBgF3').getSourceImage() as { width: number }).width;
      for (let i = 0; i < 2; i++) {
        this.nebulaPainting.push(
          this.scene.add
            .image(i * w, -27, 'paintBgF3')
            .setOrigin(0, 0)
            .setDepth(-97)
            .setData('bgFactor', 0.02),
        );
      }
      this.paintedBg.push(...this.nebulaPainting);
    }
```

E a primeira `addLayer` de `buildNebula()` (a de `factor: 0.05`, `depth: -96`) passa a ser
condicional — ela é a que a pintura substitui:

```ts
    // O corpo da nuvem: grande, sobreposto (gap < largura), quase parado. É ele que diz
    // "estamos DENTRO" — nuvem espaçada é nuvem vista de fora.
    // ⚠️ SÓ ENTRA SEM A PINTURA. Com ela, esta é a camada substituída (fallback = o visual antigo).
    if (!temPintura) {
      this.addLayer({
        key: 'nebula3',
        factor: 0.05,
        baseY: 0,
        depth: -96,
        tint: 0xffffff,
        tints: [0xffffff, 0xe8d8c0, 0xb8c4e8],
        alpha: 0.85,
        scale: [1.8, 3.0],
        gap: [95, 160],
        terreno: false,
        flutua: true,
        nebulosaExtra: true,
      });
    }
```

- [ ] **Passo 6: Fazer a pintura seguir o `nebulaDim`**

Em `setNebulaDensity()`, dentro do `onUpdate`, logo depois do laço das camadas:

```ts
        // A pintura não é ScatterLayer, então ela não passa por `alphaFor` — some aqui, à mão.
        for (const img of this.nebulaPainting) img.setAlpha(this.nebulaDim);
```

- [ ] **Passo 7: Rodar a sonda e ver que ela PASSA**

```bash
node scripts/probe-f3-visual.mjs
```

Esperado: `TUDO VERDE`.

- [ ] **Passo 8: A/B dos véus — MEDIR, não chutar**

O critério não é a névoa ser bonita: é **o inimigo ler**. Escrever um script descartável em
`scripts/_f3/` que entra na fase, força um drone escuro para uma posição fixa, e fotografa a mesma
cena com o alpha dos véus em `0.38` (hoje), `0.26` e `0.16`:

```js
// scripts/_f3/ab-veus.mjs — descartável, não commitar.
import { chromium } from 'playwright';
import sharp from 'sharp';
const b = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const p = await b.newPage();
await p.setViewportSize({ width: 384, height: 216 });
await p.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1500);
await p.keyboard.press('m');
await p.waitForTimeout(6000);

const tiros = [];
for (const a of [0.38, 0.26, 0.16]) {
  await p.evaluate((alpha) => {
    const s = window.__game.scene.getScenes(true)[0];
    s.lives = 9;
    for (const l of s.parallax.layers) {
      if (l.primeiroPlano && l.key === 'nebula3') {
        l.alpha = alpha;
        for (const sp of l.sprites) sp.setAlpha(alpha);
      }
    }
  }, a);
  await p.waitForTimeout(400);
  const f = `scripts/_f3/veu-${String(a).replace('.', '')}.png`;
  await p.screenshot({ path: f });
  tiros.push(await sharp(f).resize(768, 432, { kernel: 'nearest' }).toBuffer());
}
await b.close();
await sharp({ create: { width: 768, height: 1320, channels: 4, background: { r: 24, g: 24, b: 30, alpha: 1 } } })
  .composite(tiros.map((t, i) => ({ input: t, top: i * 440, left: 0 })))
  .png()
  .toFile('scripts/_f3/veus-ab.png');
console.log('veus-ab.png: 0.38 (hoje) / 0.26 / 0.16, de cima para baixo');
```

```bash
node scripts/_f3/ab-veus.mjs
```

**Parar aqui e mostrar `scripts/_f3/veus-ab.png` ao controlador**, que leva ao Henrique. O valor
escolhido é o que ele apontar. Não fixe um número sem esse aval.

- [ ] **Passo 9: Aplicar o alpha escolhido**

Em `src/Parallax.ts`, na terceira `addLayer` de `buildNebula()` (a `primeiroPlano`, `depth: 60`),
trocar `alpha: 0.38` pelo valor aprovado, com o porquê:

```ts
      // ⚠️ ALPHA MEDIDO EM A/B COM INIMIGO ESCURO NA TELA (Fatia 5), não escolhido no olho. O
      // critério é o inimigo LER através do véu — numa fase que põe minas em cachos na névoa, não
      // ver a mina não é problema estético, é morte. Era 0.38 e escondia demais.
      alpha: 0.24,
```

⚠️ **`0.24` é o ponto de partida, não a resposta.** Ele é o meio do A/B (0.38 / 0.26 / 0.16). O
valor que VALE é o que o Henrique apontar no Passo 8 — se ele escolher outro, use o dele e diga no
relatório. Se ele escolher 0.38 (o de hoje), não mexa em nada e registre que o véu não era o
problema.

- [ ] **Passo 10: Fallback e build**

```bash
mv public/sprites/paint-bg-f3.png /tmp/pf3.png
node scripts/probe-f3-visual.mjs ; mv /tmp/pf3.png public/sprites/paint-bg-f3.png
npm run build
```

Esperado: com o PNG fora, a sonda reprova nos asserts da pintura **mas a fase SOBE** e não há
`[ERRO DE PÁGINA]` — ela caiu nas três camadas procedurais. Build limpo.

- [ ] **Passo 11: Commit**

```bash
git add public/sprites/paint-bg-f3.png scripts/probe-f3-visual.mjs src/scenes/BootScene.ts src/Parallax.ts
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(fase3): a nebulosa vira a pintura do Henrique, e os veus param de esconder"
```

---

## Task 2: O casco se anuncia antes da virada

**Arquivos:**
- Modificar: `src/systems/StageDirector.ts` (`STAGE_3`, ~linha 186)
- Modificar: `scripts/probe-f3-visual.mjs`

**Interfaces:**
- Consome: `Parallax.setNebulaDensity(density, durationMs)` e a flag `casco` em `alphaFor`
  (`a *= 1 - this.nebulaDim`) — ambos já existem, nada a criar.

**O beat:** o `HANDOFF` diz que *"na METADE do tempo, o Leviatã começa a aparecer → Ato 2"*. Hoje o
casco fica em alpha 0 até t=42 e salta. Não há aproximação.

⚠️ **DIVERGÊNCIA CONSCIENTE DO SPEC.** O spec diz "a curva é do `Parallax`, não do `StageDirector`".
Na prática o `nebulaDim` só se move por `setNebulaDensity`, e quem o chama é o roteiro — então a
única forma honesta é uma pista a mais no roteiro. **Isso não é mudança de gameplay:** nenhuma
onda, banner, inimigo, hitbox ou tempo de spawn muda. É uma pista de cenário, e ela usa o mecanismo
exatamente como ele foi desenhado.

**Efeito colateral desejado:** `density 0.75` também afina a nuvem em 25%. Isso é melhor do que o
casco aparecer através de uma nuvem inalterada — a nuvem abrindo é o que MOTIVA o casco aparecer.

- [ ] **Passo 1: Acrescentar o assert (vai REPROVAR)**

Em `scripts/probe-f3-visual.mjs`, antes do `browser.close()`:

```js
// O CASCO SE ANUNCIA: em t≈25s ele já existe e já tem alpha, mas BAIXO.
while ((await estado()).t < 25) {
  await page.waitForTimeout(1500);
  await respirar();
}
const meio = await estado();
const cascoMeio = meio.camadas.filter((c) => c.casco);
console.log('t=' + meio.t, 'nebulaDim=' + meio.nebulaDim, JSON.stringify(cascoMeio));

ok(cascoMeio.length > 0, 'a camada do casco existe');
ok(
  cascoMeio.some((c) => c.alpha !== null && c.alpha > 0.05),
  'o casco JÁ SE VÊ na metade do Ato 1 (alpha > 0.05)',
);
ok(
  cascoMeio.every((c) => c.alpha === null || c.alpha < 0.5),
  'mas ele é só uma INSINUAÇÃO (alpha < 0.5) — a virada em t=42 ainda tem o que revelar',
);
await page.screenshot({ path: 'scripts/_f3/probe-anuncio.png' });
```

- [ ] **Passo 2: Rodar e ver que REPROVA**

```bash
node scripts/probe-f3-visual.mjs
```

Esperado: FALHA em `o casco JÁ SE VÊ na metade do Ato 1` — hoje o alpha dele é 0 até t=42.

- [ ] **Passo 3: A pista de cenário**

Em `src/systems/StageDirector.ts`, dentro de `STAGE_3`, entre o evento `{ t: 20, ... kamikaze ... }`
e o `{ t: 24, ... batedor ... }`:

```ts
  // ⚠️ O LEVIATÃ COMEÇA A APARECER NA METADE DO ATO 1 (Fatia 5). O `HANDOFF` sempre pediu isso —
  // "na metade do tempo, o Leviatã começa a aparecer" — e o código nunca fez: o casco ficava em
  // alpha 0 até a virada em t=42 e SALTAVA para visível.
  //
  // `density 0.75` faz duas coisas de uma vez, e as duas são desejadas: afina a nuvem em 25% e
  // sobe o casco a 0.25 (o alpha dele é `1 − nebulaDim`). A nuvem abrindo é o que MOTIVA o casco
  // aparecer — melhor do que ele surgir através de uma nuvem inalterada.
  //
  // ⚠️ É UMA INSINUAÇÃO, NÃO UMA REVELAÇÃO. Se der para LER a estrutura do casco antes dos 42s, a
  // virada perde o efeito e este número está alto demais. O critério é "sentir que há algo por
  // baixo", não "ver o casco".
  { t: 21, type: 'nebula', density: 0.75 },
```

- [ ] **Passo 4: Rodar e ver que PASSA**

```bash
node scripts/probe-f3-visual.mjs
```

Esperado: `TUDO VERDE`, incluindo os dois asserts novos do casco.

- [ ] **Passo 5: A regressão da fase inteira**

```bash
npm run build
node scripts/probe-stage3.mjs
```

Esperado: build limpo e `✔ FASE 3 DE PONTA A PONTA` — a virada, a aranha, as 4 formas da serpente e
a entrega do hangar. Se a `probe-stage3` reprovar, a pista nova mexeu em algo que não devia.

- [ ] **Passo 6: Mostrar `scripts/_f3/probe-anuncio.png`** ao controlador. A pergunta ao Henrique é
uma só: *dá para sentir que há algo por baixo, sem dar para ler o que é?* Se der para ler, baixar o
`0.75` para `0.85` e repetir.

- [ ] **Passo 7: Commit**

```bash
git add src/systems/StageDirector.ts scripts/probe-f3-visual.mjs
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(fase3): o casco do Leviata comeca a aparecer na metade do Ato 1"
```

---

## Task 3: O Ato 2 — as sete artes do casco

**Arquivos:**
- Criar: `assets/raw/casco-leviata-{1..7}.png` (as fontes, COMMITADAS)
- Criar: `public/sprites/casco-leviata.png`, `casco-leviata2.png`
- Criar: `public/sprites/casco-detalhe.png`, `casco-detalhe{2..5}.png`
- Modificar: `src/scenes/BootScene.ts`
- Modificar: `src/Parallax.ts` (a `addLayer` do casco no fim de `buildNebula()`, ~linha 905)
- Modificar: `scripts/probe-f3-visual.mjs`

**Interfaces:**
- Consome: `pickVariant` (`src/art.ts`), que descobre `chave`, `chave2`, `chave3`… e sorteia
  UNIFORME entre elas. **É por isso que há DUAS camadas e não uma** — ver abaixo.
- Produz: as chaves `cascoLeviata`/`cascoLeviata2` e `cascoDetalhe`/`cascoDetalhe2..5`.

⚠️ **POR QUE DUAS CAMADAS.** O spec pede que os dois trechos LISOS sejam a **maioria** da faixa: um
casco em que cada metro tem uma engrenagem lê como brinquedo, e são os trechos vazios que fazem o
maquinário significar alguma coisa (mesma lógica do SILÊNCIO no ciclo da Capitânia). Mas o
`pickVariant` sorteia uniforme — 1/7 para cada. Em vez de inventar peso, a distribuição sai da
GEOMETRIA: uma camada contínua só com as lisas (`gap` menor que a largura ⇒ sobrepostas) e uma
camada de pontuação com as outras cinco (`gap` grande). Zero mecanismo novo.

⚠️ **SPRITES ESPALHADOS, NÃO TileSprite.** As artes mostram emenda vertical quando ladrilhadas —
conferido. A regra da casa para isso é a das montanhas do parallax: *"gap MENOR que a largura;
sobrepostos, a emenda some"*. É o mecanismo que a camada do casco já usa, então a arquitetura não
muda — só a arte.

- [ ] **Passo 1: Baixar as sete fontes**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
B="https://backblaze.pixellab.ai/file/pixellab-characters/objects/f7282f36-b779-4f64-832a-4693ca4cc628"
i=1
for id in dbf118cb-b432-4985-8d4f-9cdf501fa745 \
          52fc70f1-85d0-4cf0-afc6-62afdc885e6c \
          9ef2a6ad-09d4-4937-9d61-46483537aea7 \
          4b783ba1-76f0-4831-88ff-b4ec949a5314 \
          6ab04e22-7a73-486c-a137-49475c9c098f \
          49296b98-4d97-4ec0-83ce-5688152c46a8 \
          acc4cb05-c7c3-4096-b27a-945cab932ede ; do
  curl -s -o "assets/raw/casco-leviata-$i.png" "$B/$id/rotations/unknown.png"
  i=$((i+1))
done
node -e "
const sharp=require('sharp');
(async()=>{ for(let i=1;i<=7;i++){ const m=await sharp('assets/raw/casco-leviata-'+i+'.png').metadata();
  console.log(i, m.width+'x'+m.height); } })();
"
```

Esperado: sete linhas `72x72`.

Qual é qual (medido em 2026-08-25 — luminância média entre 0,142 e 0,176, a família inteira já
nasce escura e **não precisa de tint**):

| # | O que é | Papel |
|---|---|---|
| 1 | Placa com veios alaranjados acesos | pontuação |
| 2 | Escamas densas sobrepostas | pontuação |
| 3 | Placas com rebites e uma luz azul | pontuação |
| 4 | Escamas com garras pálidas embaixo | pontuação ⚠️ |
| 5 | Carapaça lisa | **BASE** |
| 6 | Cilindro mecânico e engrenagens | pontuação |
| 7 | Carapaça lisa | **BASE** |

⚠️ A **nº 4** é a única com o problema do pálido que derrubou as levas anteriores de casco. Ela
entra, mas é a primeira a sair se em jogo ela puxar o olho.

- [ ] **Passo 2: Instalar nos nomes de variante**

```bash
cp assets/raw/casco-leviata-5.png public/sprites/casco-leviata.png
cp assets/raw/casco-leviata-7.png public/sprites/casco-leviata2.png
cp assets/raw/casco-leviata-1.png public/sprites/casco-detalhe.png
cp assets/raw/casco-leviata-2.png public/sprites/casco-detalhe2.png
cp assets/raw/casco-leviata-3.png public/sprites/casco-detalhe3.png
cp assets/raw/casco-leviata-4.png public/sprites/casco-detalhe4.png
cp assets/raw/casco-leviata-6.png public/sprites/casco-detalhe5.png
ls -1 public/sprites/casco-*.png
```

- [ ] **Passo 3: Registrar as chaves no BootScene**

Em `src/scenes/BootScene.ts`, junto das outras entradas de cenário:

```ts
  // O CASCO DO LEVIATÃ (Fase 3, Ato 2) — 7 artes do PixelLab (Henrique, 2026-08-25), 72×72.
  // Fontes em `assets/raw/casco-leviata-{1..7}.png`.
  //
  // DUAS famílias de propósito: `cascoLeviata` são os trechos LISOS (a base contínua da faixa) e
  // `cascoDetalhe` são os trechos com maquinário/veios/escamas (a pontuação). O `pickVariant`
  // sorteia UNIFORME dentro de cada família — a proporção entre elas sai do `gap` das duas
  // camadas no Parallax, não de peso. Ver `buildNebula()`.
  cascoLeviata: 'sprites/casco-leviata.png',
  cascoLeviata2: 'sprites/casco-leviata2.png',
  cascoDetalhe: 'sprites/casco-detalhe.png',
  cascoDetalhe2: 'sprites/casco-detalhe2.png',
  cascoDetalhe3: 'sprites/casco-detalhe3.png',
  cascoDetalhe4: 'sprites/casco-detalhe4.png',
  cascoDetalhe5: 'sprites/casco-detalhe5.png',
```

- [ ] **Passo 4: Acrescentar os asserts (vão REPROVAR)**

Em `scripts/probe-f3-visual.mjs`, depois dos asserts da Task 2:

```js
// O ATO 2: a nuvem abriu e o casco é a superfície.
while ((await estado()).t < 47) {
  await page.waitForTimeout(1500);
  await respirar();
}
const ato2 = await estado();
const casco2 = ato2.camadas.filter((c) => c.casco);
console.log('t=' + ato2.t, JSON.stringify(casco2));

ok(
  casco2.some((c) => c.key === 'cascoLeviata'),
  'a BASE do casco usa a arte nova (cascoLeviata)',
);
ok(
  casco2.some((c) => c.key === 'cascoDetalhe'),
  'a PONTUAÇÃO do casco existe (cascoDetalhe)',
);
ok(
  !casco2.some((c) => c.key === 'derelict'),
  'o destroço genérico saiu da camada do casco',
);
// A base é a MAIORIA: mais sprites que a pontuação, por construção do gap.
const base = casco2.find((c) => c.key === 'cascoLeviata');
const det = casco2.find((c) => c.key === 'cascoDetalhe');
ok(
  base && det && base.n > det.n,
  `os trechos lisos são a MAIORIA da faixa (base ${base?.n} > pontuação ${det?.n})`,
);
await page.screenshot({ path: 'scripts/_f3/probe-ato2.png' });
```

- [ ] **Passo 5: Rodar e ver que REPROVA**

```bash
node scripts/probe-f3-visual.mjs
```

Esperado: FALHA nos quatro asserts do Ato 2 — a camada ainda é `derelict`.

- [ ] **Passo 6: Trocar a camada do casco por DUAS**

Em `src/Parallax.ts`, no fim de `buildNebula()`, substituir o bloco inteiro da camada do casco
(hoje `key: 'derelict'`, `baseY: GAME_HEIGHT + 26`, `depth: -75`, `tint: 0x2f3a55`,
`scale: [1.1, 1.5]`, `gap: [78, 108]`) por:

```ts
    // ─── O CASCO DO LEVIATÃ (Fatia 5) ───
    //
    // Até aqui o casco era uma fileira de `derelict` — o destroço GENÉRICO da Fase 2 — tingido de
    // azul. A fase se chama "O CASCO", e a promessa do GDD é que o Leviatã VIROU O CHÃO; uma tira
    // de sucata reaproveitada não cumpre isso.
    //
    // A arte nova é biomecânica de propósito: ela ANUNCIA o interior. A Fase 4 é costela, órgão e
    // maquinário, e entre as duas a nave é engolida por uma cutscene. Se o casco fosse placa lisa
    // de metal, a Fase 4 chegaria como surpresa desconexa; assim ela chega como confirmação.
    //
    // ⚠️ DUAS CAMADAS, E A PROPORÇÃO SAI DO `gap`. Os trechos LISOS são a base contínua e a
    // MAIORIA; o maquinário é pontuação. Um casco em que cada metro tem uma engrenagem lê como
    // brinquedo — são os trechos vazios que fazem o maquinário significar alguma coisa (a mesma
    // lógica do SILÊNCIO no ciclo da Capitânia). O `pickVariant` sorteia UNIFORME, então a
    // proporção não pode vir dele: vem daqui.
    //
    // ⚠️ ESCALA 1, INTEIRA. As artes são 72×72 e 72 de 216 é exatamente um terço da tela — a
    // proporção que o GDD pede ("corredor amplo, TETO ABERTO"): a faixa cresce só para cima a
    // partir do rodapé, e o céu fica livre.
    //
    // ⚠️ SEM TINT. Luminância média medida entre 0,142 e 0,176 — a família já nasce escura. Um
    // tint aqui seria a terceira vez nesta campanha que se escurece arte que já estava escura.
    //
    // `gap` MENOR que a largura (72) na base: sobrepostos, a emenda vertical some. É a regra das
    // montanhas do parallax, e é por isso que isto NÃO é um TileSprite.
    this.addLayer({
      key: 'cascoLeviata',
      factor: 1.0,
      baseY: GAME_HEIGHT + 6,
      depth: -75,
      tint: 0xffffff,
      alpha: 1,
      scale: [1, 1],
      gap: [56, 68],
      terreno: true,
      casco: true,
    });

    this.addLayer({
      key: 'cascoDetalhe',
      factor: 1.0,
      baseY: GAME_HEIGHT + 6,
      depth: -74,
      tint: 0xffffff,
      alpha: 1,
      scale: [1, 1],
      gap: [200, 340],
      terreno: true,
      casco: true,
    });
```

- [ ] **Passo 7: Rodar e ver que PASSA**

```bash
node scripts/probe-f3-visual.mjs
```

Esperado: `TUDO VERDE`. Se `os trechos lisos são a MAIORIA` reprovar, o `gap` das duas camadas
ficou próximo demais — a base tem que ser bem menor que a pontuação.

- [ ] **Passo 8: Regressão e fallback**

```bash
npm run build
node scripts/probe-stage3.mjs
mkdir -p /tmp/casco && mv public/sprites/casco-*.png /tmp/casco/
node scripts/probe-f3-visual.mjs ; mv /tmp/casco/*.png public/sprites/
```

Esperado: build limpo; `✔ FASE 3 DE PONTA A PONTA`; e com as artes fora, **a fase SOBE** sem
`[ERRO DE PÁGINA]` (o `addLayer` já não entra sem textura — a faixa some, e isso é o fallback).

- [ ] **Passo 9: Revisão a olho**

Mostrar `scripts/_f3/probe-ato2.png` ao controlador. As perguntas ao Henrique:
*o casco lê como a superfície de uma coisa viva e blindada? Ele é a coisa mais clara da tela?
A arte nº 4 (garras pálidas) puxa o olho?*

- [ ] **Passo 10: Commit**

```bash
git add assets/raw/casco-leviata-*.png public/sprites/casco-*.png \
        src/scenes/BootScene.ts src/Parallax.ts scripts/probe-f3-visual.mjs
git -c user.name="HenriqueCrosio" -c user.email="henrique.crosio.dev@gmail.com" \
  commit -m "feat(fase3): o casco do Leviata vira arte propria, e anuncia o interior"
```

---

## Task 4: A luz condicional, a regressão e o fechamento

**Arquivos:**
- Modificar (CONDICIONAL): `src/Parallax.ts`
- Criar: `docs/superpowers/plans/2026-08-26-fase3-visual-START.md`
- Modificar: `docs/HANDOFF.md`, `docs/superpowers/specs/2026-07-21-menu-visual-design.md`

- [ ] **Passo 1: Decidir sobre a luz quente — NÃO a implemente antes de olhar**

⚠️ Esta é a única parte da fatia que pode não acontecer, e isso é de propósito. A arte nº 1 já traz
veios alaranjados e a nº 3 uma luz azul: pode ser que a faixa já respire sozinha. **Perguntar ao
Henrique, com o Ato 2 na tela:** *falta luz no casco?*

Se a resposta for não, pular para o Passo 3 e registrar a decisão no START.

- [ ] **Passo 2 (SÓ SE ELE PEDIR): a costura acesa em código**

**PARE E PEÇA UM PLANO.** Isto não é um passo de 5 minutos: é medir sete artes, escolher limiares,
emitir sprites e calibrar em A/B — do tamanho de uma tarefa inteira, e foi assim que ela custou na
Fatia 4. Reporte `DONE_WITH_CONCERNS` dizendo que o Henrique pediu a luz, e deixe o controlador
escrever a tarefa. Não improvise aqui.

O que a tarefa vai reusar, para quem a escrever:

- **A implementação de referência é `Interlude2Scene.criarLuzes()`** (branch `main`, commit
  `88b80c4`) e o script que a alimenta é `scripts/_cut2-luzes.mjs`. Os dois estão prontos e
  aprovados; o trabalho é adaptá-los às sete artes do casco, não inventar de novo.
- ⚠️ Achar os pontos **por SATURAÇÃO, não por luminância** — metal e pedra leem claros mas
  NEUTROS, e um limiar de brilho devolve o casco junto com a lâmpada.
- A textura é **`colonyLight`** (4×4, gerada em `BootScene.makeColonyLight()`).
  **Não existe textura `glow` neste projeto — não a invente.**
- Duração, atraso e alpha sorteados **por ponto**: pulso em uníssono lê como a tela piscando.
- ⚠️ Contenção é requisito: esta campanha já rejeitou duas artes por virarem a coisa mais clara da
  tela. Na dúvida, mais fraco.

- [ ] **Passo 3: A regressão completa**

```bash
export PATH="/c/Program Files/nodejs:$PATH"
npm run build
node scripts/probe-f3-visual.mjs
node scripts/probe-stage3.mjs
node scripts/probe-chain.mjs > /dev/null 2>&1 ; echo "chain EXIT=$?"
node scripts/probe-cut2-visual.mjs
node scripts/probe-doca.mjs
```

Esperado: build limpo, todas verdes, `chain EXIT=0`. As duas últimas são da Fatia 4 — elas entram
porque o `Parallax` é compartilhado, e uma mudança nele pode vazar para a Cutscene 2.

- [ ] **Passo 4: O documento de retomada**

Escrever `docs/superpowers/plans/2026-08-26-fase3-visual-START.md` no molde do START da Fatia 4
(`2026-08-25-cutscene2-visual-START.md`): estado, o que a fatia entregou, **as regras que não se
redescobrem** que ela pagou, o que ficou aberto de propósito, e a frase de arranque apontando para
a **Fatia 6 — Cutscene 3 (o hangar do Leviatã)**.

⚠️ Se o spec ou este plano tiverem divergido do código durante a execução (aconteceu seis vezes na
Fatia 4), **marcá-los como arqueologia no topo**, listando item por item o que neles é falso. Um
documento que mente é pior que documento nenhum.

Subir para o `docs/HANDOFF.md` só o que é DURÁVEL — as lições, não o diário. E atualizar a tabela
de fatias em `docs/superpowers/specs/2026-07-21-menu-visual-design.md`.

- [ ] **Passo 5: Fechar a fatia**

⚠️ **Um merge SÓ, com `--no-ff`.** E `git merge -F -` **NÃO** lê de stdin como o `git commit` —
passar a mensagem por arquivo.

```bash
git checkout main
printf '%s\n' "merge: passe visual da Fase 3 — o casco do Leviata" > /tmp/msg-f5.txt
git merge --no-ff -F /tmp/msg-f5.txt feat/fase3-visual
git push origin main
```

---

## Dívidas registradas (NÃO fazer nesta fatia)

- **As baleias erradas.** ⚠️ Conferido no código: `leviathanWhale`, `leviathanWhaleDying` e
  `leviathanWhaleSplit` são usados **somente** na `Interlude4Scene`. A dívida é da **Fatia 8**, não
  desta nem da 7 — registros anteriores diziam "fatias 5–8" e estavam errados.
- **A ferramenta de vídeo.** As sondas fotografam; beats em movimento só se julgam vendo. O molde
  existe em `scripts/_ver-cargueiro-mov.mjs`.
- **O painel de escolha da Cutscene 2 tapa a cena inteira.**
