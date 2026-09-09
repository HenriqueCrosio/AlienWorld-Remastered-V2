# M1 — O MOTOR DA MOLDURA (FASE 4) · Plano de Implementação

> **Para quem executa (agente ou humano):** SUB-SKILL OBRIGATÓRIA — use
> `superpowers:subagent-driven-development` (recomendado) ou `superpowers:executing-plans` para
> executar tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** fazer o chão e o teto da Fase 4 virarem uma **faixa contínua desenhada**, com a
linha do vão derivando de uma **curva** em vez de um sorteio por batida, e o obstáculo virando
uma **mesa de topo chato** que nasce dessa faixa — tudo com **arte provisória**, para descobrir
se a mudança de GEOMETRIA funciona antes de gastar as 14 peças de arte em cima dela.

**Arquitetura:** uma classe nova, `src/systems/Moldura.ts`, dona de duas coisas que andam juntas:
a **curva** (a matemática — onde está o vão e onde está a superfície da faixa, em função da
posição no mundo) e a **faixa** (os sprites — quatro segmentos de 128px por lado, reposicionados
todo frame a partir da curva, **sem corpo físico**). A `GameScene` deixa de sortear `vaoY` e passa
a perguntar à `Moldura`; a `TerrainSystem` ganha uma opção nova (`bordaVao`) que **crava a borda
que encara o corredor em vez de escalar a peça**. Nenhuma física nova entra: quem colide continua
sendo o prop do corredor, com o mesmo vão que o roteiro já manda.

**Stack:** TypeScript + Phaser 3.90 (Arcade Physics), Vite. Sem framework de teste unitário — o
teste deste projeto é **sonda**: script Node com Playwright que roda o jogo de verdade e mede
(`scripts/probe-*.mjs`), e script Node com `sharp` que mede arte (`scripts/_f4/_medir-*.mjs`).

**A spec:** `docs/superpowers/specs/2026-09-08-fatia7-moldura-fase4-design.md` (seção 14, etapa M1).
**A porta de entrada da sessão:** `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`.

---

## Global Constraints

Valem para **todas** as tarefas. Os números vêm da spec, verbatim.

- **A resolução:** `GAME_WIDTH` 384 · `GAME_HEIGHT` 216 · `GROUND_Y` 206 · `TETO_Y` 10 ·
  `SCROLL_SPEED` 84 px/s. Banda jogável: y 10 a 206.
- ⚠️ **Escala 1, sempre. Reduzir pode; AMPLIAR nunca.** Nenhum sprite desta fatia entra com
  `setScale` diferente de 1. É a lei da resolução, cravada em 06/09.
- ⚠️ **A faixa é DECORAÇÃO. Sem colisão, sem corpo físico.** Quem colide é a mesa. **Nenhuma
  física nova entra** — é onde bug de colisão mora.
- ⚠️ **A TRAVA DOS 8px:** a superfície da faixa nunca entra no corredor. Se a espessura pedida
  deixar menos de 8px de folga até a borda do vão, ela é **aparada**. O desenho cede, o vão nunca.
- ⚠️ **A LINHA DE BASE, que não pode mudar:**
  `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}` — saída de `node scripts/probe-stage4.mjs`.
  Se mudar, a mesa nova está comendo o vão: **o erro é da ARTE, não do roteiro.**
- **Peça da faixa:** 128×64 px, encaixável. `128 ÷ 84 = 1,52s` por segmento.
- **Peça da mesa:** 96×112 px, **topo CHATO**, ombros em rampa curta.
- ⚠️ **Sondas de tempo real: UMA POR VEZ.** Três browsers headless no mesmo Vite quebram. Toda
  sonda exige `npm run dev` rodando em outro terminal (`http://localhost:5173/`).
- ⚠️ **Duas fontes de acaso, e a fronteira é dura.** `Phaser.Math.*` é o fluxo do JOGO (o
  espaçamento das ondas consome dele) — usa-se para o **vão**, que é jogo. `Math.random` é o
  fluxo da ARTE — usa-se para o **relevo da faixa**, que é decoração. Arte de fundo não pode
  adiantar o dado do jogo.
- **Git:** branch `feat/fase4-visual`. ⚠️ Commits de autoria **SÓ do Henrique** — sem
  `Co-Authored-By`, sem "Generated with". `origin` = `AlienWorld-Remastered-V2`; ⚠️ **nunca**
  empurre para o remoto `legacy`.
- ⚠️ **`scripts/_f4/*.png` é IGNORADO pelo git** (`.gitignore`). `public/sprites/*.png` **não é** —
  é lá que a arte provisória tem de morar para sobreviver a um `git clean`.
- **Build limpo:** `npm run build` (roda `tsc --noEmit` antes do Vite) tem de passar ao fim de
  cada tarefa que toca `src/`.

---

## File Structure

| arquivo | responsabilidade |
|---|---|
| **Criar** `src/systems/Moldura.ts` | A curva **e** a faixa. Gera as placas (o vão e a superfície por placa de 128px), reposiciona os 8 sprites da faixa (4 chão + 4 teto) e responde `vaoEm(x)` / `superficieChaoEm(x)` / `superficieTetoEm(x)`. Curva e sprites moram juntos porque mudam juntos: mexer na curva é mexer em onde a faixa desenha. |
| **Criar** `scripts/_f4/_assar-provisoria.mjs` | Assa a arte provisória do M1 (a faixa e a mesa) a partir da receita procedural do `_mock-moldura.mjs`. Não é arte final — é arte feia **de propósito**. |
| **Criar** `scripts/probe-f4-moldura.mjs` | A sonda da moldura: a faixa existe, não tem corpo, está em escala 1, a curva é contínua, a trava dos 8px segura, e a espessura sobe ao longo da fase. |
| **Modificar** `src/scenes/GameScene.ts` | Constrói e atualiza a `Moldura`; `spawnCorredores` deixa de sortear e passa a perguntar; o evento `moldura` entra no `switch`. |
| **Modificar** `src/systems/TerrainSystem.ts` | `PropKind` ganha `mesa`; `spawn` ganha a opção `bordaVao` (crava a borda, não escala). |
| **Modificar** `src/systems/StageDirector.ts` | O tipo de evento `moldura` e as sete linhas dele no `STAGE_4`. |
| **Modificar** `src/scenes/BootScene.ts` | Registra `f4Faixa` e `f4Mesa` no `ART`. |
| **Criar** `public/sprites/f4-faixa-prov.png`, `public/sprites/f4-mesa-prov.png` | A arte provisória, versionada (é asset, não bancada). |

---

## O DESENHO, ANTES DAS TAREFAS

Vale ler uma vez — as cinco tarefas montam isto.

**A grade.** O mundo é dividido em **placas de 128px**, a mesma largura da peça da faixa. A placa
`n` cobre o mundo de `n*128` a `(n+1)*128`. Tudo — o vão, a espessura da faixa, a mesa — deriva da
placa. Uma grade só significa que **dentro de um segmento nada varia**, e é isso que faz a trava
dos 8px ser exata em vez de aproximada.

**A curva.** Cada placa carrega um `vaoY` (o centro do corredor). A placa `n` ou **SEGURA** a
altura da placa `n−1` (é assim que "placas de larguras diferentes" sai de uma peça só de 128: duas
ou três placas na mesma altura são uma placa larga) ou **ANDA** um passo curto a partir dela
(`PASSO_MAX` 14px). Nunca sorteia no alcance inteiro. É **esta** linha que mata o "sem nexo"
diagnosticado em `GameScene.ts:859`.

**A faixa.** Quatro sprites de 128×64 por lado, posicionados todo frame em
`x = i*128 − (xMundo % 128)`. Não há reciclagem, não há deriva: a posição é calculada, não
acumulada. Sem corpo físico. **Sem crop e sem escala**: a peça é ancorada pela superfície e o que
sobra dela sai da tela por baixo (chão) ou por cima (teto). Por isso `espessura + relevo ≤ 54`
— com 64px de arte, é o que garante que a peça ainda alcance a borda da tela.

**A mesa.** Nasce em **escala 1** e é **ENTERRADA** na faixa: o que varia é quanto dela sobra para
fora, nunca o tamanho do desenho. O topo dela fica exatamente na borda do vão, então o vão medido
pela sonda é o `gap` do roteiro **exato**, sem arredondamento.

---

### Task 1: A arte provisória — a faixa e a mesa, assadas

**Files:**
- Create: `scripts/_f4/_assar-provisoria.mjs`
- Create (gerados): `public/sprites/f4-faixa-prov.png` (128×64), `public/sprites/f4-mesa-prov.png` (96×112)
- Test: `scripts/_f4/_medir-faixas.mjs` e `scripts/_f4/_medir-colunas.mjs` (já existem, não mude)

**Interfaces:**
- Consome: `public/sprites/paint-bg-f4-a.png` (a pintura da câmara A, 384×216).
- Produz: os dois PNG acima. As tarefas 3 e 5 os carregam pelas chaves `f4Faixa` e `f4Mesa`.

⚠️ **Isto é arte FEIA DE PROPÓSITO.** O M1 existe para responder se a GEOMETRIA funciona antes de
gastar 14 peças em cima dela. Não melhore a arte aqui; não gere nada no PixelLab.

- [ ] **Passo 1: rodar a régua nos props de hoje, para ter a referência na tela**

```bash
node scripts/_f4/_medir-colunas.mjs
```

Esperado: a tabela dos três props de hoje (`costela`, `orgao`, `maquinario`). Anote a linha da
`costela` — é contra ela que a mesa nova vai ser julgada. (A régua imprime os três sempre, mesmo
sem argumento.)

- [ ] **Passo 2: escrever o script que assa as duas peças**

Crie `scripts/_f4/_assar-provisoria.mjs`:

```js
// A ARTE PROVISÓRIA DO M1 (Fatia 7 · a moldura).
//
// ⚠️ ISTO É ARTE FEIA DE PROPÓSITO, e é a coisa mais importante deste arquivo. O M1 existe para
// descobrir se a mudança de GEOMETRIA funciona ANTES de gastar as 14 peças de arte em cima dela.
// Se a curva contínua estragar o jogo, o M1 é barato de desfazer; depois do M3 não é.
//
// A receita é a mesma do `_mock-moldura.mjs`, que ele aprovou em 08/09 ("o 2 ficou muito bom,
// trouxe preenchimento"): a textura é a BORDA ESQUERDA da própria pintura, ampliada e com o
// valor corrigido. Mesma mão, mesma família de cor, e uma estrutura que já É parede.
//
//   node scripts/_f4/_assar-provisoria.mjs
import sharp from 'sharp';

const FUNDO = 'public/sprites/paint-bg-f4-a.png';
const FAIXA_W = 128, FAIXA_H = 64;
const MESA_W = 96, MESA_H = 112;
const PLACA = 19;                      // a largura da nervura interna (do mock)
const BRASA = [255, 122, 60];

const rnd = (n) => { const s = Math.sin(n * 12.9898) * 43758.5453; return s - Math.floor(s); };

// A TEXTURA-MÃE: a borda esquerda da pintura, ampliada 1,3x e com o valor puxado.
// ⚠️ `brightness`/`linear` aqui reproduzem o mock; o alvo de valor DE VERDADE (média 1,3x a da
// pintura, contraste interno 1,4x) é conferido no passo 6 com `_valor-faixa.mjs`.
const tex = await sharp(FUNDO)
  .extract({ left: 0, top: 0, width: 96, height: 216 })
  .resize(Math.round(384 * 1.3), Math.round(216 * 1.3), { kernel: 'nearest' })
  .modulate({ brightness: 1.35, saturation: 1.25 })
  .linear(1.45, -26)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

const amostra = (x, y) => {
  const tw = tex.info.width, th = tex.info.height;
  const j = ((((y % th) + th) % th) * tw + (((x % tw) + tw) % tw)) * 4;
  return [tex.data[j], tex.data[j + 1], tex.data[j + 2]];
};

const clamp = (v) => Math.max(0, Math.min(255, v));

// ─── A FAIXA: 128×64, opaca de ponta a ponta, TOPO RETO ────────────────────────────────────
//
// ⚠️ TOPO RETO, e isso não é preguiça. Quem faz a parede subir e descer é o CÓDIGO, colocando
// cada placa numa altura (ver `Moldura.ts`). Uma peça com topo irregular brigaria com a curva.
//
// ⚠️ E ELA SANGRA NAS TRÊS BORDAS. Uma faixa não é um objeto, é uma PAREDE: se sobrar ar na
// esquerda, na direita ou embaixo, ela vira adesivo — que é o defeito que a moldura existe para
// matar. Foi a régua `_medir-faixas.mjs` que provou isso nas 64 candidatas de 08/09.
{
  const buf = Buffer.alloc(FAIXA_W * FAIXA_H * 4);
  for (let y = 0; y < FAIXA_H; y++) {
    for (let x = 0; x < FAIXA_W; x++) {
      const i = (y * FAIXA_W + x) * 4;
      let [r, g, b] = amostra(x + 61, y + 37);

      // A quina de 1px no topo é VOLUME, não luz; a sombra de queda logo abaixo dá a espessura.
      // ⚠️ SEM CONTORNO ACESO. Luz é PONTUAL — a primeira versão do mock desenhou um contorno na
      // borda inteira e virou neon.
      if (y < 1) { r = r * 1.45 + 10; g = g * 1.45 + 10; b = b * 1.45 + 10; }
      else if (y < 4) { r *= 0.5; g *= 0.5; b *= 0.5; }

      // A nervura entre placas internas — é ela que dá leitura de "placa", não de textura solta.
      const emenda = Math.abs((x % PLACA) - PLACA / 2) > PLACA / 2 - 1.2;
      if (emenda && y > 1 && y < 22) { r *= 0.62; g *= 0.62; b *= 0.62; }

      // A brasa: só nas emendas, e só em 1 de cada 3 delas. Contada, nunca contínua.
      if (emenda && rnd(Math.floor(x / PLACA) + 21) > 0.66 && y > 2 && y < 7) {
        const f = 0.75 * (1 - Math.abs(y - 4.5) / 2.5);
        r = r * (1 - f) + BRASA[0] * f;
        g = g * (1 - f) + BRASA[1] * f;
        b = b * (1 - f) + BRASA[2] * f;
      }

      buf[i] = clamp(r);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(b);
      buf[i + 3] = 255;                                   // OPACA — sangra nas três bordas
    }
  }
  await sharp(buf, { raw: { width: FAIXA_W, height: FAIXA_H, channels: 4 } })
    .png().toFile('public/sprites/f4-faixa-prov.png');
  console.log('✔ public/sprites/f4-faixa-prov.png  128×64  (faixa provisória — topo reto, 3 bordas sangrando)');
}

// ─── A MESA: 96×112, TOPO CHATO, ombros em rampa curta ─────────────────────────────────────
//
// ⚠️ TOPO CHATO, e isto NÃO é gosto: é a correção do defeito que custou 12 gerações em 08/09.
// A hitbox de um prop sai da LARGURA DA TEXTURA (`TerrainSystem`, `body.setSize(p.width*0.6, ...)`)
// e é um retângulo de ALTURA CHEIA. Uma silhueta de base larga e ponta fina mata numa faixa larga
// na altura da PONTA — que é justamente por onde o jogador passa. A lâmina alargada matava 46px
// no vazio. Mesa de topo chato passa por CONSTRUÇÃO, porque o desenho alcança a largura da
// textura exatamente na altura da ponta.
{
  const OMBRO = 10;                    // a rampa curta, em linhas, a partir do topo
  const buf = Buffer.alloc(MESA_W * MESA_H * 4);
  for (let y = 0; y < MESA_H; y++) {
    // A rampa só existe nas primeiras `OMBRO` linhas; abaixo disso a mesa é reta e cheia.
    const recuo = y < OMBRO ? Math.round((OMBRO - y) * 0.8) : 0;
    for (let x = 0; x < MESA_W; x++) {
      const i = (y * MESA_W + x) * 4;
      if (x < recuo || x >= MESA_W - recuo) { buf[i + 3] = 0; continue; }

      let [r, g, b] = amostra(x + 210, y + 96);
      if (y < 1) { r = r * 1.5 + 12; g = g * 1.5 + 12; b = b * 1.5 + 12; }
      else if (y < 4) { r *= 0.55; g *= 0.55; b *= 0.55; }
      // Duas nervuras verticais: dão leitura de chapa dobrada sem custar desenho.
      if (x % 31 === 0 && y > 2) { r *= 0.6; g *= 0.6; b *= 0.6; }

      buf[i] = clamp(r);
      buf[i + 1] = clamp(g);
      buf[i + 2] = clamp(b);
      buf[i + 3] = 255;
    }
  }
  await sharp(buf, { raw: { width: MESA_W, height: MESA_H, channels: 4 } })
    .png().toFile('public/sprites/f4-mesa-prov.png');
  console.log('✔ public/sprites/f4-mesa-prov.png   96×112 (mesa provisória — topo CHATO)');
}
```

- [ ] **Passo 3: assar**

```bash
node scripts/_f4/_assar-provisoria.mjs
```

Esperado: as duas linhas `✔` acima, e os dois PNG em `public/sprites/`.

- [ ] **Passo 4: a régua da FAIXA — ela sangra nas três bordas e tem topo reto?**

```bash
node scripts/_f4/_medir-faixas.mjs public/sprites/f4-faixa-prov.png
```

Esperado: `bordaE` e `bordaD` = **100%**, `base` = **100%**, `topo(dp)` = **0,0** (topo reto por
construção — a peça é um retângulo opaco). O veredicto do script tem de ser positivo
(`bordaE > 0.8 && bordaD > 0.8 && base > 0.9`).

⚠️ Se `emenda` sair alta, ignore **nesta tarefa**: a repetição da faixa é uma das duas decisões
que ficaram abertas para o Henrique (ver o START), e não bloqueia o M1.

- [ ] **Passo 5: a régua da MESA — a hitbox é honesta?**

```bash
node scripts/_f4/_medir-colunas.mjs public/sprites/f4-mesa-prov.png
```

Esperado: na faixa do **topo** (`0–10%`), a largura do desenho alcança a hitbox como a da
`costela` alcança (a `costela` faz 102px de desenho contra 71 de hitbox). A mesa é um retângulo
com ombro de 10px, então no topo ela faz ~76px de desenho contra ~58 de hitbox — **o desenho
excede a hitbox em toda a altura**, que é a definição de honesta. Se a régua acusar morte no
vazio na faixa do topo, **volte ao passo 2 e reduza `OMBRO`** — não siga para a Task 2.

- [ ] **Passo 6: conferir o valor contra a pintura da câmara A**

```bash
node scripts/_f4/_valor-faixa.mjs public/sprites/f4-faixa-prov.png public/sprites/paint-bg-f4-a.png scripts/_f4/_prov-valor.png
```

O script imprime a média da faixa contra a da pintura. Esperado: um fator **próximo de 1,3×**.
⚠️ **Se sair acima de 2×, a faixa vai ler como adesivo branco** — foi o erro que custou as quatro
primeiras faixas em 08/09. Nesse caso, no passo 2, baixe o `brightness` de `1.35` até a régua
devolver ~1,3× e reasse. (O `_prov-valor.png` é bancada — ele é ignorado pelo git.)

- [ ] **Passo 7: commit**

```bash
git add scripts/_f4/_assar-provisoria.mjs public/sprites/f4-faixa-prov.png public/sprites/f4-mesa-prov.png
git commit -m "feat(fase4): a arte provisoria do M1 — a faixa de 128x64 e a mesa de topo chato"
```

---

### Task 2: A curva contínua substitui o sorteio do vão

**Files:**
- Create: `src/systems/Moldura.ts`
- Modify: `src/scenes/GameScene.ts` (campo novo, `create`, `update`, `runEvent`, `spawnCorredores:850-887`)
- Test: `scripts/probe-f4-moldura.mjs` (criado aqui) e `scripts/probe-stage4.mjs` (já existe)

**Interfaces:**
- Consome: `GROUND_Y`, `TETO_Y` de `./TerrainSystem`; `GAME_WIDTH` de `../config`.
- Produz, e as tarefas 3–5 dependem destas assinaturas exatas:
  - `new Moldura(scene: Phaser.Scene)`
  - `avanca(dt: number, speed: number): void`
  - `vaoEm(xTela: number): number`
  - `superficieChaoEm(xTela: number): number`
  - `superficieTetoEm(xTela: number): number`
  - `setGap(gap: number): void`
  - `setEspessura(px: number): void` *(usado só na Task 4; o campo já existe aqui)*
  - `espessura: number` *(leitura pública, para a sonda)*
  - `static readonly LARGURA = 128`, `FOLGA = 8`, `PASSO_MAX = 14`, `ESPESSURA_MAX = 54`

⚠️ **Nesta tarefa a mesa ainda NÃO existe.** O corredor continua nascendo de `costela`/`orgao`/
`maquinario` com `alturaPx`, exatamente como hoje. **A única coisa que muda é de onde vem o
`vaoY`.** É o que torna esta tarefa rejeitável sozinha: se a curva estragar a dificuldade, ela é
desfeita sem tocar em arte nenhuma.

- [ ] **Passo 1: escrever a sonda que FALHA — a curva é contínua?**

Crie `scripts/probe-f4-moldura.mjs`:

```js
// A SONDA DA MOLDURA (Fatia 7 · M1).
//
// O que só se vê rodando: se a linha do vão virou CURVA (placas vizinhas se relacionam) em vez de
// sorteio por batida, se a faixa existe e é DECORAÇÃO (sem corpo físico, escala 1), se a trava dos
// 8px segura, e se a espessura sobe ao longo da fase.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez: três browsers headless no mesmo Vite quebram.
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
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:error] ${m.text()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

// A sonda não sabe jogar: vidas e invulnerabilidade para cima — testa-se a MOLDURA.
const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});
await blindar();

// ─── A CURVA: placas vizinhas se relacionam ───
//
// ⚠️ Amostra o vão na BOCA DE CENA (x = 414, onde o corredor nasce) e guarda só as MUDANÇAS. É a
// medida direta do defeito diagnosticado em `GameScene.ts:859`: hoje cada par sorteia um `vaoY`
// novo no alcance inteiro (saltos de até 38px); a curva anda no máximo `PASSO_MAX`.
const PASSO_MAX = 14;
const serie = [];
for (let i = 0; i < 120; i++) {
  await blindar();
  const v = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s && s.moldura ? Math.round(s.moldura.vaoEm(414)) : null;
  });
  if (v !== null && v !== serie[serie.length - 1]) serie.push(v);
  await page.waitForTimeout(200);
}
const saltos = serie.slice(1).map((v, i) => Math.abs(v - serie[i]));
const maior = saltos.length ? Math.max(...saltos) : 0;
console.log('curva    ', JSON.stringify({ degraus: serie.length, serie, maior }));
ok(serie.length >= 6, `a curva ANDOU ao longo da fase (${serie.length} degraus distintos)`);
ok(maior <= PASSO_MAX + 1, `o degrau nunca salta mais que ${PASSO_MAX}px (maior=${maior})`);

console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Passo 2: rodar a sonda e confirmar que ela FALHA**

Em um terminal: `npm run dev`. Em outro:

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: **FALHA** — `curva {"degraus":0,"serie":[],"maior":0}` e os dois asserts em `✘`, porque
`s.moldura` ainda não existe.

- [ ] **Passo 3: escrever a `Moldura`**

Crie `src/systems/Moldura.ts`:

```ts
import Phaser from 'phaser';
import { GROUND_Y, TETO_Y } from './TerrainSystem';

/**
 * Uma PLACA do mundo: o pedaço de 128px que a peça da faixa cobre. Vão, espessura e mesa derivam
 * todos da MESMA placa — ver a nota da grade em `Moldura`.
 */
interface Placa {
  /** O centro do vão nesta placa, em px de tela. Já ARREDONDADO: o vão medido tem de ser inteiro. */
  vaoY: number;
  /** Quantas placas seguidas saíram nesta MESMA altura (1..3). Ver `gerar`. */
  repetida: number;
  /** A linha de cima da faixa do chão, em y de tela. Já com a trava aplicada. */
  superficieChao: number;
  /** A linha de baixo da faixa do teto, em y de tela. Já com a trava aplicada. */
  superficieTeto: number;
}

/**
 * A MOLDURA DA FASE 4 — a faixa contínua e a curva do vão.
 *
 * ⚠️ ELA EXISTE PORQUE "SEM NEXO" ERA UM FATO DO CÓDIGO, NÃO UMA IMPRESSÃO. Até 08/09 cada par de
 * colunas sorteava um `vaoY` NOVO no alcance inteiro (`GameScene.spawnCorredores`), então duas
 * colunas seguidas não tinham relação nenhuma — e foi isso que o Henrique leu como *"assets
 * jogados na cena"*. A altura do corredor agora deriva de x (a posição no mundo), não de um
 * sorteio por batida.
 *
 * ⚠️ A SEPARAÇÃO MAIS IMPORTANTE DESTE ARQUIVO: a FAIXA é decoração pura, sem corpo físico; quem
 * colide é a MESA, com o mesmo `gap` que o roteiro já manda. É por isso que a linha de base
 * `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}` da `probe-stage4` sobrevive e **nenhuma
 * física nova entra** — que é onde bug de colisão mora.
 *
 * ⚠️ A GRADE DE 128px É O QUE FAZ A TRAVA SER EXATA. O mundo é dividido em placas da largura da
 * peça da faixa, e vão, espessura e mesa derivam todos da MESMA placa. Sem a grade, a superfície
 * variaria dentro de um segmento e a trava dos 8px viraria aproximação — e aproximação em cima do
 * vão é exatamente o que come a linha de base.
 */
export class Moldura {
  /** A largura de um segmento da faixa, e da grade do mundo. 128 ÷ 84 = 1,52s por placa. */
  static readonly LARGURA = 128;

  /**
   * ⚠️ A TRAVA. A superfície da faixa nunca chega a menos de 8px da borda do vão. O desenho cede,
   * o vão nunca — é um assert da sonda, não uma boa intenção.
   */
  static readonly FOLGA = 8;

  /**
   * O passo máximo de um degrau. ⚠️ É ESTE NÚMERO que substitui o sorteio: hoje o vão pula até
   * 38px entre batidas; com 14 ele ANDA. Se o Henrique achar a fase monótona no teste jogado, é o
   * primeiro número a subir.
   */
  static readonly PASSO_MAX = 14;

  /**
   * ⚠️ O TETO DA ESPESSURA, e ele é uma conta, não um gosto: a peça tem 64px de altura e é
   * ancorada pela SUPERFÍCIE, sem crop e sem escala. Para ela ainda alcançar a borda da tela,
   * `espessura + relevo` não pode passar de 54 (206 − 54 + 64 = 216 = a base da tela; 10 + 54 − 64
   * = 0 = o topo). Passar disso abriria uma fresta entre a faixa e a borda.
   */
  static readonly ESPESSURA_MAX = 54;

  /** A margem das bordas da tela: um vão colado no teto obriga a raspar onde não se vê o que vem. */
  private static readonly MARGEM = 24;

  /**
   * O capricho da espessura, placa a placa. É o que impede a faixa de ser uma régua reta — e é
   * DECORAÇÃO, então sai do fluxo de acaso da ARTE (`Math.random`), nunca do fluxo do jogo.
   */
  private static readonly RELEVO = 10;

  /** Quantos segmentos por lado. 4 × 128 = 512 ≥ 384 + 128 de folga de rolagem. */
  private static readonly SEGMENTOS = 4;

  /** px/s com que a espessura persegue o alvo. Calibragem: o teste jogado decide. */
  private static readonly RAMPA = 8;

  /** A distância que o mundo já rolou, em px. É o eixo de tudo. */
  private xMundo = 0;

  private readonly placas = new Map<number, Placa>();
  /** O maior índice de placa já gerado. A geração é sempre para a FRENTE. */
  private ultima = -1;

  private gap = 0;
  /** A espessura pedida pelo roteiro (evento `moldura`). Ver `setEspessura`. */
  private alvo = 0;
  /** A espessura em vigor — ela persegue o alvo (ver `avanca`), porque parede não salta. */
  espessura = 0;

  private readonly chao: Phaser.GameObjects.Image[] = [];
  private readonly teto: Phaser.GameObjects.Image[] = [];

  constructor(scene: Phaser.Scene) {
    // ⚠️ SEM `physics.add`. A faixa é DECORAÇÃO: um corpo físico aqui seria a física nova que a
    // spec proibiu, e ele apareceria como morte invisível no meio do vão. A sonda cobra a ausência
    // dele.
    //
    // Sem a textura, a `Moldura` continua respondendo a curva (matemática pura) e não desenha
    // nada — a mesma lei de todo o resto: arte entra asset por asset.
    if (!scene.textures.exists('f4Faixa')) return;

    for (let i = 0; i < Moldura.SEGMENTOS; i++) {
      // Depth −0.6: atrás dos props (−0.5 — a mesa desenha por cima da faixa de onde ela nasce) e
      // à frente de tudo que é fundo (a pintura em −96, as bandas de placas em −75).
      //
      // ⚠️ Origem no TOPO no chão e na BASE no teto: a peça é ancorada pela SUPERFÍCIE, e o que
      // sobra dela sai da tela. É o que dispensa crop e escala — ver `ESPESSURA_MAX`.
      //
      // O NOME é o que torna a faixa medível: a sonda acha os segmentos por ele, como a
      // `sombraCasco` da Fase 3.
      this.chao.push(
        scene.add.image(0, 0, 'f4Faixa').setOrigin(0, 0).setDepth(-0.6).setName('faixaChao'),
      );
      this.teto.push(
        scene.add
          .image(0, 0, 'f4Faixa')
          .setOrigin(0, 1)
          .setFlipY(true) // o teto é a mesma peça de cabeça para baixo
          .setDepth(-0.6)
          .setName('faixaTeto'),
      );
    }
  }

  /** O `gap` do roteiro. A placa que nascer daqui em diante é julgada por ele. */
  setGap(gap: number): void {
    this.gap = gap;
  }

  /**
   * A espessura pedida pelo roteiro. O primeiro pedido CRAVA (a fase não pode abrir com a parede
   * crescendo na cara do jogador); os seguintes são perseguidos devagar, porque a dramaturgia da
   * fase é *as paredes vão fechando em você* — e uma parede que salta 12px num quadro não fecha,
   * pisca.
   */
  setEspessura(px: number): void {
    this.alvo = Phaser.Math.Clamp(px, 0, Moldura.ESPESSURA_MAX);
    if (this.espessura === 0) this.espessura = this.alvo;
  }

  /**
   * Roda o mundo. Chamada da `GameScene.update`, ANTES dos spawns — o corredor que nasce neste
   * frame tem de ler a curva já avançada.
   */
  avanca(dt: number, speed: number): void {
    this.xMundo += speed * dt;

    // A espessura persegue o alvo a `RAMPA` px/s, sem passar dele.
    const falta = this.alvo - this.espessura;
    const passo = Moldura.RAMPA * dt;
    this.espessura += Math.abs(falta) <= passo ? falta : Math.sign(falta) * passo;

    if (!this.chao.length) return;

    // ⚠️ A POSIÇÃO É CALCULADA, NUNCA ACUMULADA — e não há reciclagem. Um segmento que andasse
    // sozinho e fosse reposicionado ao sair da tela acumularia erro de ponto flutuante e sairia da
    // grade; fora da grade, a trava dos 8px deixa de ser exata. Aqui `x = i*128 − (xMundo % 128)`
    // por construção, todo frame.
    // ⚠️ O ÍNDICE DA PLACA VEM DO LAÇO, NUNCA DO `x` ARREDONDADO. O `x` é arredondado para a
    // grade de pixel da tela (nada de sprite em meio pixel), e esse arredondamento pode empurrar
    // `floor((xMundo + x) / 128)` uma placa para trás — o segmento passaria a desenhar a altura da
    // placa vizinha toda vez que `off` cruzasse um meio pixel. O segmento `i` É a placa `base + i`,
    // por construção.
    const base = Math.floor(this.xMundo / Moldura.LARGURA);
    const off = this.xMundo - base * Moldura.LARGURA;
    for (let i = 0; i < Moldura.SEGMENTOS; i++) {
      const p = this.placaDe(base + i);
      const x = Math.round(i * Moldura.LARGURA - off);
      this.chao[i].setPosition(x, p.superficieChao);
      this.teto[i].setPosition(x, p.superficieTeto);
    }
  }

  /** O centro do corredor na coluna `xTela` da tela. */
  vaoEm(xTela: number): number {
    return this.placaEm(xTela).vaoY;
  }

  /** A linha de cima da faixa do chão em `xTela`. */
  superficieChaoEm(xTela: number): number {
    return this.placaEm(xTela).superficieChao;
  }

  /** A linha de baixo da faixa do teto em `xTela`. */
  superficieTetoEm(xTela: number): number {
    return this.placaEm(xTela).superficieTeto;
  }

  /**
   * A placa de índice `n`, gerando as que faltam e podando as que já saíram da tela.
   *
   * ⚠️ A PODA MEDE A TELA, NUNCA A PERGUNTA — e esta distinção custou um crash garantido no
   * frame 1. A primeira versão deste plano podava `k < n - 3` com o `n` de QUEM PERGUNTOU. Mas
   * quem pergunta mais à frente é o `spawnCorredores` (`vaoEm(414)`, três a quatro placas à
   * direita do último segmento desenhado), e a poda dele apagava a placa que o segmento da
   * ESQUERDA ia pedir no frame seguinte: `placas.get(n)` devolvia `undefined` e o `!` mentia para
   * o TypeScript. O piso agora sai do `xMundo` — a borda esquerda da tela, que é a mesma para
   * todos os que perguntam.
   *
   * ⚠️ E UMA PLACA PODADA NUNCA É REGERADA. Regerar sortearia outro valor, e a parede saltaria de
   * altura. A invariante é o piso ficar sempre abaixo de qualquer consulta viva.
   */
  private placaDe(n: number): Placa {
    // A geração é sempre para a FRENTE: o mundo só rola num sentido, e cada placa deriva da
    // anterior (ver `gerar`), então gerar em ordem é o que mantém a curva contínua.
    while (this.ultima < n) {
      this.ultima++;
      this.placas.set(this.ultima, this.gerar(this.ultima));
    }

    const piso = Math.floor(this.xMundo / Moldura.LARGURA) - 1;
    for (const k of this.placas.keys()) if (k < piso) this.placas.delete(k);

    return this.placas.get(n)!;
  }

  private placaEm(xTela: number): Placa {
    return this.placaDe(Math.floor((this.xMundo + xTela) / Moldura.LARGURA));
  }

  private gerar(n: number): Placa {
    const ant = this.placas.get(n - 1);
    const meio = this.gap / 2;
    const lo = TETO_Y + Moldura.MARGEM + meio;
    const hi = GROUND_Y - Moldura.MARGEM - meio;

    // ⚠️ SEGURA OU ANDA — e é daqui que saem as "placas de larguras diferentes" da spec com uma
    // peça só de 128px: duas ou três placas na mesma altura LEEM como uma placa larga. Onda lisa
    // lê como onda; placa lê como parede.
    //
    // ⚠️ `Phaser.Math` AQUI, e não `Math.random`. O vão é JOGO, e jogo sorteia do fluxo do jogo.
    const segura = ant !== undefined && ant.repetida < 3 && Phaser.Math.FloatBetween(0, 1) < 0.45;

    let vaoY: number;
    let repetida: number;
    if (segura && ant) {
      // O `gap` pode ter mudado sob a placa: reclampa em vez de herdar cru.
      vaoY = Phaser.Math.Clamp(ant.vaoY, lo, hi);
      repetida = ant.repetida + 1;
    } else {
      const base = ant ? ant.vaoY : (lo + hi) / 2;
      vaoY = Phaser.Math.Clamp(base + Phaser.Math.FloatBetween(-1, 1) * Moldura.PASSO_MAX, lo, hi);
      repetida = 1;
    }
    // ⚠️ ARREDONDA. A mesa é ancorada em `vaoY ± gap/2`, e o vão medido pela `probe-stage4` tem de
    // dar o inteiro do roteiro — 110, não 109,7.
    vaoY = Math.round(vaoY);

    // ⚠️ `Math.random` AQUI, e não `Phaser.Math`. O relevo é ARTE, e arte de fundo não pode
    // adiantar o dado do jogo — é a mesma fronteira do plantio do casco da Fase 3.
    const eChao = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Math.random() * Moldura.RELEVO);
    const eTeto = Math.min(Moldura.ESPESSURA_MAX, this.espessura + Math.random() * Moldura.RELEVO);

    // ⚠️ ARREDONDA NA DIREÇÃO SEGURA: o chão para BAIXO (y maior), o teto para CIMA (y menor).
    // Arredondar para o lado errado devolveria 7px de folga onde a trava prometeu 8.
    let superficieChao = Math.ceil(GROUND_Y - eChao);
    let superficieTeto = Math.floor(TETO_Y + eTeto);

    // ⚠️ A TRAVA DOS 8px. Só existe quando há corredor: em `gap 0` (o silêncio antes do chefão) não
    // há vão para proteger, e travar contra um vão que não existe apagaria a parede justamente
    // onde ela é o cenário inteiro.
    if (this.gap > 0) {
      superficieChao = Math.max(superficieChao, vaoY + meio + Moldura.FOLGA);
      superficieTeto = Math.min(superficieTeto, vaoY - meio - Moldura.FOLGA);
    }

    return { vaoY, repetida, superficieChao, superficieTeto };
  }
}
```

- [ ] **Passo 4: ligar a `Moldura` na `GameScene`**

Em `src/scenes/GameScene.ts`, junto dos outros imports de sistema:

```ts
import { Moldura } from '../systems/Moldura';
```

Junto do campo `private parallax!: Parallax;` (perto da linha 63, onde moram os outros sistemas):

```ts
  /** A moldura da F4: a curva do vão e a faixa contínua. Ver `Moldura`. */
  private moldura!: Moldura;
```

Em `create()`, logo depois de `this.terrain = new TerrainSystem(this, this.enemies.enemyBullets);`:

```ts
    // A MOLDURA é construída sempre — a curva é matemática pura e não custa nada nas outras fases.
    // Os SPRITES dela só nascem se a textura existir (o construtor devolve cedo sem ela), que é a
    // mesma lei de todo o resto: arte entra asset por asset.
    this.moldura = new Moldura(this);
```

Em `update()`, logo depois de `this.parallax.update(dt, SCROLL_SPEED * frenagem);`:

```ts
    // ⚠️ ANTES dos spawns. O corredor que nasce neste frame pergunta à curva onde está o vão, e ela
    // tem de estar já avançada — senão o obstáculo nasce uma placa atrás do desenho.
    this.moldura.avanca(dt, SCROLL_SPEED * frenagem);
```

No `switch (e.type)` do `runEvent`, no `case 'corredor'`:

```ts
      case 'corredor':
        this.corredorRate = e.rate;
        this.corredorGap = e.gap;
        // A curva precisa do `gap` para clampar o vão dentro da margem e para a trava dos 8px.
        this.moldura.setGap(e.gap);
        break;
```

- [ ] **Passo 5: trocar o sorteio pela curva em `spawnCorredores`**

Em `src/scenes/GameScene.ts`, substitua estas três linhas (dentro de `spawnCorredores`):

```ts
    const margem = 24;
    const meio = this.corredorGap / 2;
    const vaoY = Phaser.Math.Between(TETO_Y + margem + meio, GROUND_Y - margem - meio);
```

por:

```ts
    const meio = this.corredorGap / 2;
    // ⚠️ A LINHA QUE MATA O "SEM NEXO". O `vaoY` deixa de ser sorteado por batida e passa a sair da
    // CURVA — a altura do corredor deriva de x (a posição no mundo), então duas colunas seguidas
    // têm relação. A margem das bordas mudou de casa: agora ela vive na `Moldura` (`MARGEM`), que
    // é quem clampa o vão.
    const vaoY = this.moldura.vaoEm(GAME_WIDTH + 30);
```

⚠️ Depois disso, `TETO_Y` e `GROUND_Y` ainda são usados nas duas linhas de altura logo abaixo
(`const alturaChao = GROUND_Y - (vaoY + meio);`) — **não remova os imports nesta tarefa.**

- [ ] **Passo 6: rodar a sonda e confirmar que ela PASSA**

Com `npm run dev` rodando:

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: `✔ a curva ANDOU ao longo da fase`, `✔ o degrau nunca salta mais que 14px`, e
`✔ A MOLDURA ESTÁ DE PÉ`.

- [ ] **Passo 7: a LINHA DE BASE não pode ter mudado**

```bash
node scripts/probe-stage4.mjs
```

Esperado, na linha `corredores`: `{"chao":3,"teto":3,"vaos":[110,110,110]}` e todos os asserts em
`✔`. ⚠️ Se os vãos saírem diferentes de 110, **pare**: a curva está clampando o vão de forma que
encolhe o corredor. Confira `MARGEM` (24) e o clamp em `gerar`.

- [ ] **Passo 8: build limpo e commit**

```bash
npm run build
git add src/systems/Moldura.ts src/scenes/GameScene.ts scripts/probe-f4-moldura.mjs
git commit -m "feat(fase4): a linha do vao deixa de ser sorteada e vira uma curva de placas"
```

---

### Task 3: A faixa contínua entra na tela, com a trava dos 8px

**Files:**
- Modify: `src/scenes/BootScene.ts` (o mapa `ART`, junto do bloco da Fase 4)
- Modify: `scripts/probe-f4-moldura.mjs` (asserts novos)
- Test: `scripts/probe-f4-moldura.mjs`, `scripts/probe-stage4.mjs`

**Interfaces:**
- Consome: `public/sprites/f4-faixa-prov.png` (Task 1) e a `Moldura` (Task 2).
- Produz: a chave de textura `f4Faixa`, e os sprites nomeados `faixaChao` / `faixaTeto` — é por
  esses nomes que a sonda os encontra.

⚠️ O código da faixa **já foi escrito na Task 2** (o construtor e o `avanca` da `Moldura`). Ele
está dormindo porque a textura `f4Faixa` não existe. Esta tarefa acorda ele e prova as três
propriedades que fazem dele decoração honesta.

- [ ] **Passo 1: acrescentar os asserts que FALHAM na sonda**

Em `scripts/probe-f4-moldura.mjs`, **antes** da linha
`console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : ...)`, cole:

```js
// ─── A FAIXA: ela existe, é DECORAÇÃO, e está em escala 1 ───
const faixa = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const pega = (nome) => s.children.list.filter((o) => o.name === nome);
  const chao = pega('faixaChao');
  const teto = pega('faixaTeto');
  const todos = [...chao, ...teto];
  return {
    chao: chao.length,
    teto: teto.length,
    comCorpo: todos.filter((o) => o.body).length,
    escalas: [...new Set(todos.flatMap((o) => [o.scaleX, o.scaleY]))],
    cobre: chao.length
      ? Math.min(...chao.map((o) => o.x)) <= 0 &&
        Math.max(...chao.map((o) => o.x)) + 128 >= 384
      : false,
  };
});
console.log('faixa    ', JSON.stringify(faixa));
ok(faixa.chao === 4, `a faixa do CHÃO tem os 4 segmentos (${faixa.chao})`);
ok(faixa.teto === 4, `a faixa do TETO tem os 4 segmentos (${faixa.teto})`);
// ⚠️ O assert mais importante desta sonda: a faixa é DECORAÇÃO. Um corpo físico aqui seria a
// física nova que a spec proibiu, e ele apareceria como morte invisível no meio do vão.
ok(faixa.comCorpo === 0, `a faixa NÃO tem corpo físico — é decoração (${faixa.comCorpo} com corpo)`);
ok(
  faixa.escalas.length === 1 && faixa.escalas[0] === 1,
  `a faixa é desenhada em escala 1 (${JSON.stringify(faixa.escalas)})`,
);
ok(faixa.cobre, 'os 4 segmentos cobrem a largura da tela sem buraco');

// ─── A TRAVA DOS 8px: a superfície nunca entra no corredor ───
//
// ⚠️ Mede a tela inteira, coluna a coluna, e durante um trecho longo — a trava só MORDE quando a
// espessura cresce, então uma amostra curta passaria sem testar nada.
let pior = Infinity;
let amostras = 0;
for (let i = 0; i < 60; i++) {
  await blindar();
  const f = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura || s.corredorRate <= 0) return null;
    const meio = s.corredorGap / 2;
    let min = Infinity;
    for (let x = 0; x <= 384; x += 10) {
      const v = s.moldura.vaoEm(x);
      min = Math.min(
        min,
        s.moldura.superficieChaoEm(x) - (v + meio),
        v - meio - s.moldura.superficieTetoEm(x),
      );
    }
    return min;
  });
  if (f !== null) { pior = Math.min(pior, f); amostras++; }
  await page.waitForTimeout(250);
}
console.log('trava    ', JSON.stringify({ folgaMinima: pior, amostras }));
// ⚠️ O `amostras` NÃO É ENFEITE. Sem ele o assert passa quando NUNCA MEDIU: `pior` fica em
// `Infinity` se toda iteração cair fora da janela de corredor, e `Infinity >= 8` é verdadeiro — o
// guard-rail que protege o vão ficaria verde justamente no caso em que perdeu a capacidade de
// testar. Um assert que não distingue "sempre teve folga" de "nunca olhou" não é um assert.
ok(
  amostras >= 10 && pior >= 8,
  `a superfície da faixa nunca entra no corredor (${amostras} amostras, folga mínima ${pior}px, mínimo 8)`,
);
```

- [ ] **Passo 2: rodar a sonda e confirmar que os asserts novos FALHAM**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: `faixa {"chao":0,"teto":0,...}` e os cinco asserts da faixa em `✘` (a textura `f4Faixa`
ainda não está registrada). O assert da trava já pode passar neste passo — ignore-o aqui; ele é
cobrado no passo 4.

- [ ] **Passo 3: registrar as texturas**

Em `src/scenes/BootScene.ts`, no bloco da Fase 4, logo **depois** da linha
`maquinario: 'sprites/maquinario.png',`:

```ts
  // ─── A MOLDURA DA FASE 4 (Fatia 7 · M1) ───
  //
  // ⚠️ ARTE PROVISÓRIA, E FEIA DE PROPÓSITO (`scripts/_f4/_assar-provisoria.mjs`). O M1 existe para
  // descobrir se a mudança de GEOMETRIA funciona ANTES de gastar as 14 peças de arte em cima dela.
  // A arte de verdade entra nas etapas M2–M5, uma câmara por vez.
  //
  // ⚠️ A FAIXA É 128×64 E ENTRA EM ESCALA 1, ancorada pela SUPERFÍCIE — o que sobra dela sai da
  // tela. É por isso que `Moldura.ESPESSURA_MAX` é 54 e não 64.
  // Sem placeholder: sem o PNG, a `Moldura` não constrói sprite nenhum e a fase roda como antes.
  f4Faixa: 'sprites/f4-faixa-prov.png',
  // A MESA: 96×112, TOPO CHATO. A hitbox sai da largura da TEXTURA, então topo chato é o que a
  // torna honesta por construção (`scripts/_f4/_medir-colunas.mjs`).
  f4Mesa: 'sprites/f4-mesa-prov.png',
```

- [ ] **Passo 4: rodar a sonda e confirmar que ela PASSA**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: os asserts da curva e da faixa em `✔`, `comCorpo` = 0, `escalas` = `[1]`, e
`folgaMinima` ≥ 8.

⚠️ Se `folgaMinima` sair **abaixo de 8**, a trava está furada: confira que `gerar` aplica
`Math.max`/`Math.min` **depois** do `Math.round` do `vaoY`, e que a superfície do chão usa
`Math.ceil` e a do teto `Math.floor` (arredondar para o lado errado devolve 7px onde a trava
prometeu 8).

- [ ] **Passo 5: olhar a tela — é o único jeito de ver a moldura**

```bash
node scripts/probe-stage4.mjs
```

Esperado: `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}`, todos os asserts em `✔`, e o
arquivo `probe-stage4-corredor.png` gerado. **Abra esse PNG.** Você tem de ver uma faixa contínua
no chão e no teto, com degraus, e as colunas de hoje nascendo do vão. Se a faixa aparecer **na
frente** da nave, o depth está errado (tem de ser −0.6).

- [ ] **Passo 6: build limpo e commit**

```bash
npm run build
git add src/scenes/BootScene.ts scripts/probe-f4-moldura.mjs
git commit -m "feat(fase4): a faixa continua entra na tela — decoracao, escala 1, trava de 8px"
```

---

### Task 4: A espessura por trecho — a dramaturgia da fase

**Files:**
- Modify: `src/systems/StageDirector.ts` (o tipo `StageEvent`, e o `STAGE_4`)
- Modify: `src/scenes/GameScene.ts` (o `switch` do `runEvent`)
- Modify: `scripts/probe-f4-moldura.mjs` (asserts novos)
- Test: `scripts/probe-f4-moldura.mjs`, `scripts/probe-stage4.mjs`

**Interfaces:**
- Consome: `Moldura.setEspessura(px)` e `Moldura.espessura` (Task 2).
- Produz: o evento `{ t, type: 'moldura', espessura }` no roteiro.

⚠️ **Por que um evento NOVO em vez de um campo no `corredor`.** O `gap` manda na COLISÃO; a
espessura manda no DESENHO — é a separação central da spec, e juntá-los num evento só a desfaria.
E, na prática: a batida `t=68` (a espessura cheia, o duto) **não tem** evento `corredor`.

- [ ] **Passo 1: acrescentar os asserts que FALHAM**

Em `scripts/probe-f4-moldura.mjs`, **antes** do `console.log` final, cole:

```js
// ─── A ESPESSURA SOBE AO LONGO DA FASE ───
//
// ⚠️ Espera por ESTADO (o relógio da fase), nunca por relógio de parede: um assert novo que gaste
// tempo faria a espera cega derivar. Foi assim que quatro quadros de conferência da Fatia 7
// saíram todos já no chefão, em 06/09.
const espessuraEm = async (ate) => {
  for (let i = 0; i < 900; i++) {
    const e = await page.evaluate(() => {
      const s = window.__game.scene.getScenes(true)[0];
      if (!s || s.scene.key !== 'Game') return null;
      s.lives = 99;
      s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
      return { t: Math.round((s.elapsed ?? 0) * 10) / 10, e: Math.round(s.moldura?.espessura ?? -1) };
    });
    if (!e) return null;
    if (e.t >= ate) return e;
    await page.waitForTimeout(100);
  }
  return null;
};

const e10 = await espessuraEm(10);
const e40 = await espessuraEm(40);
const e60 = await espessuraEm(60);
const e70 = await espessuraEm(70);
console.log('espessura', JSON.stringify([e10, e40, e60, e70]));
ok(e10 && e10.e >= 15 && e10.e <= 17, `t=10s: a fase abre com a faixa fina (${e10 && e10.e}px, esperado 16)`);
ok(e40 && e10 && e40.e > e10.e, `t=40s: as paredes ganharam corpo (${e10 && e10.e} → ${e40 && e40.e}px)`);
ok(e60 && e40 && e60.e > e40.e, `t=60s: o aperto (${e40 && e40.e} → ${e60 && e60.e}px)`);
ok(e70 && e60 && e70.e > e60.e, `t=70s: o duto — a faixa cheia (${e60 && e60.e} → ${e70 && e70.e}px)`);
```

⚠️ Este bloco atravessa a fase inteira (~70s) e tem de ser **o último** da sonda: ele consome o
relógio, e o que vier depois dele já estaria no chefão.

- [ ] **Passo 2: rodar e confirmar que FALHA**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: `espessura [{"t":10,"e":0},...]` — os quatro asserts em `✘`, porque ninguém chama
`setEspessura`.

- [ ] **Passo 3: o tipo de evento**

Em `src/systems/StageDirector.ts`, logo **depois** da linha
`| { t: number; type: 'corredor'; rate: number; gap: number }`:

```ts
  /**
   * A ESPESSURA DA FAIXA da moldura (Fase 4), em px — do `GROUND_Y` para cima no chão e do
   * `TETO_Y` para baixo no teto, as mesmas âncoras que o `TerrainSystem` já usa.
   *
   * ⚠️ É UM EVENTO SEPARADO DO `corredor`, DE PROPÓSITO. O `gap` manda na COLISÃO; a espessura
   * manda no DESENHO — é a separação que protege a fase de virar um conserto de colisão. E, na
   * prática: a batida do duto (t=68) não tem evento `corredor` nenhum.
   *
   * A fase inteira vira uma frase: **as paredes vão fechando em você.**
   *
   * ⚠️ Os números são CHUTE CALIBRADO até o playtest, com a mesma etiqueta dos vãos e dos HP das
   * portas. O que não é chute é a CURVA: ela tem de subir monotonicamente.
   */
  | { t: number; type: 'moldura'; espessura: number }
```

- [ ] **Passo 4: as sete linhas no `STAGE_4`**

Em `src/systems/StageDirector.ts`, dentro de `STAGE_4`, acrescente uma linha `moldura` **logo
depois** de cada linha indicada (mantendo a ordem por `t`):

```ts
  { t: 1, type: 'corredor', rate: 2.2, gap: 110 },
  // ⚠️ A ESPESSURA É A DRAMATURGIA DA FASE — e ela já estava escrita nos vãos desde a Fatia 7, só
  // não estava visível. A moldura é o que faz o jogador ENXERGAR o que os números já faziam com
  // ele. 16px: você entrou num lugar grande.
  { t: 1, type: 'moldura', espessura: 16 },
```

```ts
  { t: 15, type: 'corredor', rate: 2.4, gap: 96 },
  { t: 15, type: 'moldura', espessura: 18 },        // ele começa a se estreitar
```

```ts
  { t: 37, type: 'corredor', rate: 2.6, gap: 104 },
  { t: 37, type: 'moldura', espessura: 26 },        // as paredes ganharam corpo
```

```ts
  { t: 43, type: 'corredor', rate: 1.9, gap: 76 },
  { t: 43, type: 'moldura', espessura: 36 },        // o aperto
```

```ts
  { t: 63.5, type: 'corredor', rate: 1.7, gap: 84 },
  { t: 63.5, type: 'moldura', espessura: 48 },      // não é mais câmara
```

```ts
  { t: 68, type: 'cenario', key: 'paintBgF4c' },
  // O DUTO: a faixa CHEIA. 54 é o teto da peça de 64px ancorada pela superfície
  // (`Moldura.ESPESSURA_MAX`), e a partir daqui a mesa vira parede — a trava dos 8px apara o
  // resto sozinha enquanto o corredor existir.
  { t: 68, type: 'moldura', espessura: 54 },
```

```ts
  { t: 79, type: 'corredor', rate: 0, gap: 0 },
  // O silêncio antes do chefão: sem corredor, a trava desliga e a parede fica cheia de verdade.
  { t: 79, type: 'moldura', espessura: 54 },
```

- [ ] **Passo 5: o `case` na `GameScene`**

Em `src/scenes/GameScene.ts`, no `switch (e.type)`, logo depois do `case 'corredor'`:

```ts
      case 'moldura':
        // A espessura da faixa (decoração). O `gap` do `corredor` continua mandando na colisão —
        // esta linha não encosta em física nenhuma.
        this.moldura.setEspessura(e.espessura);
        break;
```

- [ ] **Passo 6: rodar a sonda e confirmar que PASSA**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: os quatro asserts de espessura em `✔`, com uma série parecida com `16 → 26 → 48 → 54`.
⚠️ Se `t=10s` não der 16, o `setEspessura` não cravou o primeiro valor (confira o
`if (this.espessura === 0)` em `setEspessura`).

- [ ] **Passo 7: a LINHA DE BASE, de novo**

```bash
node scripts/probe-stage4.mjs
```

Esperado: `{"chao":3,"teto":3,"vaos":[110,110,110]}`. ⚠️ A espessura não pode ter mexido no vão —
se mexeu, a trava está aparando o lado errado.

- [ ] **Passo 8: build limpo e commit**

```bash
npm run build
git add src/systems/StageDirector.ts src/scenes/GameScene.ts scripts/probe-f4-moldura.mjs
git commit -m "feat(fase4): a espessura da faixa por trecho — as paredes vao fechando"
```

---

### Task 5: A mesa — o obstáculo deixa de ser prop sorteado

**Files:**
- Modify: `src/systems/TerrainSystem.ts` (`PropKind`, `PROPS`, `spawn`)
- Modify: `src/scenes/GameScene.ts` (`spawnCorredores:850-887`)
- Modify: `scripts/probe-f4-moldura.mjs` (asserts novos)
- Test: `scripts/probe-f4-moldura.mjs`, `scripts/probe-stage4.mjs`, `scripts/probe-f4-visual.mjs`,
  `scripts/_f4/_medir-colunas.mjs`

**Interfaces:**
- Consome: `Moldura.vaoEm(x)` (Task 2), a textura `f4Mesa` (Tasks 1 e 3).
- Produz: o `PropKind` `'mesa'` e a opção `spawn(kind, { bordaVao })`. As etapas M2–M5 vão trocar
  só a **textura** — a geometria fica pronta aqui.

- [ ] **Passo 1: os asserts que FALHAM — a mesa entra em escala 1**

Em `scripts/probe-f4-moldura.mjs`, **antes** do bloco da espessura (que tem de continuar sendo o
último), cole:

```js
// ─── A MESA: escala 1, enterrada na faixa, topo na borda do vão ───
//
// ⚠️ `alturaPx` ESTICAVA a peça. Uma mesa de 112px espremida em 30 vira mingau, e ampliar é
// proibido pela lei da resolução. A mesa nasce em escala 1 e é ENTERRADA: o que varia é quanto
// dela sobra para fora, nunca o tamanho do desenho.
const mesas = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const ps = s.terrain.props.getChildren().filter((p) => p.active);
  const chao = ps.filter((p) => !p.flipY);
  const teto = ps.filter((p) => p.flipY);

  // ⚠️ MEDE O PAR, NUNCA O PROP CONTRA A CURVA. O prop anda pela FÍSICA (`setVelocityX`) e a curva
  // anda pelo `xMundo`: as duas correm a 84px/s, mas um prop pousado em cima de uma fronteira de
  // placa pode cair do outro lado por meio pixel de deriva, e o assert piscaria. O par é imune —
  // as duas mesas nasceram do MESMO `vaoY`, e a distância entre elas é o `gap` do roteiro, exato.
  const vaos = [];
  for (const t of teto) {
    const par = chao.find((c) => Math.abs(c.x - t.x) < 8);
    if (par) vaos.push(Math.round(par.y - par.displayHeight - (t.y + t.displayHeight)));
  }
  return {
    total: ps.length,
    gap: s.corredorGap,
    kinds: [...new Set(ps.map((p) => p.getData('kind')))],
    escalas: [...new Set(ps.flatMap((p) => [p.scaleX, p.scaleY]))],
    vaos,
  };
});
console.log('mesa     ', JSON.stringify(mesas));
ok(mesas.total > 0, `há corredor na tela para medir (${mesas.total} props)`);
ok(mesas.kinds.length === 1 && mesas.kinds[0] === 'mesa', `o corredor é feito de MESA (${mesas.kinds})`);
ok(
  mesas.escalas.length === 1 && mesas.escalas[0] === 1,
  `a mesa entra em escala 1, nunca esticada (${JSON.stringify(mesas.escalas)})`,
);
// ⚠️ EXATO, não uma janela. O `bordaVao` crava o topo em `vaoY ± gap/2` sem escalar nada, então o
// vão medido é o número do roteiro sem arredondamento — é a prova de que a mesa não come o vão.
ok(
  mesas.vaos.length >= 2 && mesas.vaos.every((v) => v === mesas.gap),
  `o vão medido é o do roteiro, EXATO (gap=${mesas.gap}, medidos=[${mesas.vaos}])`,
);
```

- [ ] **Passo 2: rodar e confirmar que FALHA**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: `mesa {"kinds":["costela",...],"escalas":[0.4...],...}` — os asserts de `kinds`,
`escalas` e do vão exato em `✘` (hoje o `alturaPx` escala a peça, e o vão medido sai com
arredondamento em vez do número redondo do roteiro).

- [ ] **Passo 3: o `PropKind` novo**

Em `src/systems/TerrainSystem.ts`, no `export type PropKind`, substitua o bloco final:

```ts
  // O interior ORGÂNICO do Leviatã (Fase 4): costela biônica, pedaço de órgão, maquinário
  // pesado. Terreno indestrutível como a rocha — existe para ser desviado.
  | 'costela'
  | 'orgao'
  | 'maquinario';
```

por:

```ts
  // O interior ORGÂNICO do Leviatã (Fase 4): costela biônica, pedaço de órgão, maquinário
  // pesado. Terreno indestrutível como a rocha — existe para ser desviado.
  //
  // ⚠️ DESDE A MOLDURA (09/09) ELES NÃO SÃO MAIS O CORREDOR. O `spawnCorredores` sorteava entre os
  // três, e nomes soltos sorteados por batida eram metade da causa do "assets jogados na cena".
  // Continuam registrados porque viram DECORAÇÃO PLANTADA NA FAIXA nas etapas M2–M5 — que é o que
  // a faixa 4 do mock mostrou e ele aprovou.
  | 'costela'
  | 'orgao'
  | 'maquinario'
  /**
   * A MESA (Fase 4, a moldura): a saliência de TOPO CHATO que fecha o caminho — a parede
   * avançando, não um prop pousado no vazio.
   *
   * ⚠️ TOPO CHATO NÃO É GOSTO. A hitbox sai da LARGURA DA TEXTURA (`body.setSize(p.width*0.6, ...)`)
   * e é um retângulo de ALTURA CHEIA: uma silhueta de base larga e ponta fina mata numa faixa larga
   * na altura da PONTA, que é por onde o jogador passa. A lâmina alargada de 08/09 matava 46px no
   * vazio, e foi o que enterrou a Task 4. Mesa de topo chato passa por construção.
   */
  | 'mesa';
```

E, no `PROPS`, logo depois de `maquinario: { hp: Infinity, score: 0, shoots: false },`:

```ts
  // Indestrutível como a rocha: a parede existe para ser desviada, não abatida.
  mesa: { hp: Infinity, score: 0, shoots: false },
```

- [ ] **Passo 4: a opção `bordaVao` no `spawn`**

Em `src/systems/TerrainSystem.ts`, troque a assinatura do `spawn`:

```ts
  spawn(
    kind: PropKind,
    opts?: { anchor?: 'chao' | 'teto'; alturaPx?: number; tint?: number; angle?: number },
  ): void {
```

por:

```ts
  spawn(
    kind: PropKind,
    opts?: {
      anchor?: 'chao' | 'teto';
      alturaPx?: number;
      tint?: number;
      angle?: number;
      /**
       * A borda que ENCARA O CORREDOR, em y de tela: o TOPO de um prop de chão, a BASE de um
       * pendurado no teto.
       *
       * ⚠️ ELE CRAVA A BORDA E NÃO ESCALA A PEÇA — é o oposto do `alturaPx`, e é a diferença
       * entre a mesa e a coluna velha. `alturaPx` estica: uma mesa de 112px espremida em 30 vira
       * mingau, e ampliar é proibido (a lei da resolução, 06/09). Com `bordaVao` a peça nasce em
       * ESCALA 1 e é ENTERRADA na faixa — quem varia é o quanto dela sobra para fora, nunca o
       * tamanho do desenho.
       *
       * ⚠️ E É ELE QUE PRESERVA A LINHA DE BASE. Com a borda cravada em `vaoY ± gap/2`, o vão
       * medido pela `probe-stage4` é o `gap` do roteiro EXATO — sem o arredondamento de escala que
       * o `alturaPx` introduzia.
       */
      bordaVao?: number;
    },
  ): void {
```

E, **logo depois** do bloco do `alturaPx` (o `if (opts?.alturaPx !== undefined) { ... }` inteiro) e
**antes** de `if (opts?.tint !== undefined)`, acrescente:

```ts
    // ⚠️ DEPOIS do `alturaPx` e ANTES do `body.reset` lá embaixo — o corpo é sincronizado com a
    // posição final, e sincronizá-lo antes faria o prop FLUTUAR (a armadilha do
    // `updateFromGameObject`, documentada no `reset()`).
    //
    // A origem do prop de chão é a BASE (`p.y` é o pé), então cravar o TOPO é somar a altura;
    // a do prop de teto é o TOPO (`p.y` é o alto do quadro), então cravar a BASE é subtrair.
    if (opts?.bordaVao !== undefined) {
      p.y = teto ? opts.bordaVao - p.height : opts.bordaVao + p.height;
    }
```

- [ ] **Passo 5: `spawnCorredores` para de sortear**

Em `src/scenes/GameScene.ts`, substitua **todo o corpo** de `spawnCorredores` a partir da linha
`const meio = this.corredorGap / 2;` até o fim do método por:

```ts
    const meio = this.corredorGap / 2;
    // ⚠️ A LINHA QUE MATA O "SEM NEXO". O `vaoY` deixa de ser sorteado por batida e passa a sair da
    // CURVA — a altura do corredor deriva de x (a posição no mundo), então duas colunas seguidas
    // têm relação. A margem das bordas vive na `Moldura` (`MARGEM`), que é quem clampa o vão.
    const vaoY = this.moldura.vaoEm(GAME_WIDTH + 30);

    // ⚠️ MORREU AQUI O `sorteiaKind`. Não há mais nomes soltos para sortear: o obstáculo desta fase
    // é UM — a mesa — e o que troca entre as câmaras é a TEXTURA dela (etapas M2–M5), não o nome.
    // Sem a arte, cai na `costela`: mais larga e mais feia, mas a fase roda (arte entra asset por
    // asset, e a guarda é sempre `textures.exists`).
    const kind: PropKind = this.textures.exists('f4Mesa') ? 'mesa' : 'costela';

    // ⚠️ MORREU AQUI TAMBÉM O FUNIL (o `angle` por coluna). Ele existia para as costelas fecharem
    // em funil; uma mesa inclinada tem o topo em DIAGONAL, e topo em diagonal é exatamente a
    // silhueta que faz a hitbox mentir.
    //
    // ⚠️ E MORREU A REGRA DOS 14px. Ela pulava a coluna baixa demais para ler como obstáculo — mas
    // agora há uma FAIXA desenhada atrás dela, e a trava dos 8px garante que a mesa sempre sobra
    // pelo menos 8px para fora da parede. Pular uma delas quebraria o PAR, e par quebrado é vão não
    // medido: é o que a `probe-stage4` cobra em `vaos:[110,110,110]`.
    this.terrain.spawn(kind, { bordaVao: vaoY + meio });
    this.terrain.spawn(kind, { anchor: 'teto', bordaVao: vaoY - meio });
```

⚠️ Depois disso, `TETO_Y` e/ou `GROUND_Y` podem ter ficado sem uso em `GameScene.ts`. O
`tsc --noEmit` do `npm run build` acusa — **remova do import só o que ele acusar**, nada mais.

- [ ] **Passo 6: rodar a sonda e confirmar que PASSA**

```bash
node scripts/probe-f4-moldura.mjs
```

Esperado: `mesa {"kinds":["mesa"],"escalas":[1],"gap":110,"vaos":[110,110,110]}` e os quatro
asserts da mesa em `✔`, além de todos os anteriores.

- [ ] **Passo 7: a LINHA DE BASE — o teste que decide se a mesa come o vão**

```bash
node scripts/probe-stage4.mjs
```

Esperado, **exatamente**: `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}`, e todos os
asserts em `✔` — inclusive `bater no TETO dói` (a mesa pendurada tem de colidir como a coluna
colidia).

⚠️ Se os vãos saírem diferentes de 110: a mesa está comendo o vão, e **o erro é da ARTE, não do
roteiro**. Rode `node scripts/_f4/_medir-colunas.mjs public/sprites/f4-mesa-prov.png` e confira a
faixa do topo. **Não mexa no `STAGE_4`.**

- [ ] **Passo 8: a sonda do Bloco A continua verde**

```bash
node scripts/probe-f4-visual.mjs
```

Esperado: os 16 asserts do Bloco A em `✔` — as quatro pinturas em 384×216, o `hangar` fora do modo
`interior`, e as trocas de cenário em t=45/70/84.

- [ ] **Passo 9: build limpo e commit**

```bash
npm run build
git add src/systems/TerrainSystem.ts src/scenes/GameScene.ts scripts/probe-f4-moldura.mjs
git commit -m "feat(fase4): a mesa de topo chato substitui a coluna sorteada, em escala 1"
```

---

### Task 6: O fechamento — as quatro sondas e o teste jogado

**Files:**
- Modify: `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md` (marcar o M1 como feito)
- Test: as quatro sondas, e o Henrique com o controle na mão.

**Interfaces:**
- Consome: tudo o que as Tasks 1–5 entregaram.
- Produz: a resposta à única pergunta que sonda nenhuma responde.

- [ ] **Passo 1: build limpo, do zero**

```bash
npm run build
```

Esperado: sem erro de `tsc` e sem erro do Vite.

- [ ] **Passo 2: as quatro sondas, UMA POR VEZ**

⚠️ Três browsers headless no mesmo Vite quebram. Rode em sequência, com `npm run dev` de pé:

```bash
node scripts/probe-f4-moldura.mjs
node scripts/probe-stage4.mjs
node scripts/probe-f4-visual.mjs
node scripts/_f4/_medir-colunas.mjs public/sprites/f4-mesa-prov.png
```

Esperado: as três primeiras terminam em `✔` e saem com código 0; a quarta mostra a mesa alcançando
a hitbox na faixa do topo como a `costela` alcança.

- [ ] **Passo 3: o TESTE JOGADO — e a pergunta que o M1 existe para responder**

⚠️ **Este passo não é opcional e não é automatizável.** A sonda cobre o **vão**; ela não cobre a
**espessura**, nem o **ritmo**, nem a dificuldade na horizontal. Isso só o controle na mão julga.

```bash
npm run dev
```

Abra `http://localhost:5173/`, aperte **`L`** (atalho para a Fase 4) e **jogue até o chefão**.

A pergunta principal, e a única que decide se o M2 acontece:

> **A curva contínua estragou a dificuldade?** O vão deixou de saltar, e saltar era parte do
> desafio. Ficou fácil demais? Monótono?

Se ficou monótono, o número a mexer é **um só**: `Moldura.PASSO_MAX` (14 → 18 ou 22). Se ficou
injusto, é o mesmo número para baixo.

As outras quatro coisas para olhar, na ordem:

1. **A espessura.** As paredes fecham? Os seis números (16 / 18 / 26 / 36 / 48 / 54) são chute
   calibrado — moram no `STAGE_4`, uma linha `moldura` por trecho.
2. **A repetição da faixa.** 384 ÷ 128 = 3 cópias idênticas na tela ao mesmo tempo, e a mesma volta
   a cada 1,5s. ⚠️ **É uma das duas decisões que ficaram abertas** (duas variantes por câmara ×
   uma variante mais neutra). O M1 é onde ela fica visível pela primeira vez.
3. **A nave entrando na parede desenhada.** Entre uma mesa e outra a faixa é decoração — a nave
   pode afundar no desenho. A spec aceitou isso de propósito (nenhuma física nova). Se incomodar,
   o conserto é barato e conhecido: prender o `y` da nave na superfície, como o chão da atmosfera
   já faz na `GameScene.update`.
4. **As bandas velhas de `derelict`** (o chão e o teto procedurais do `Parallax`, depth −75).
   Elas continuam lá, atrás da faixa. Se aparecerem por baixo dela e sujarem, some com elas no
   `buildInterior` — não foram tocadas no M1 de propósito.

- [ ] **Passo 4: atualizar a porta de entrada**

Em `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md`, na tabela "O QUE VEM DEPOIS, NA
ORDEM", troque a linha do M1 de `⬜ ◄ PEGUE AQUI (plano ainda não escrito)` para `✅` e mova o
`◄ PEGUE AQUI` para o **M2 — A CÂMARA A**. Registre na mesma edição o veredicto do teste jogado
(o que ele disse sobre a curva) e qualquer número que tenha mudado.

- [ ] **Passo 5: commit e push**

```bash
git add docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md
git commit -m "docs(fatia7): o M1 esta de pe — o motor da moldura, com arte provisoria"
git push origin feat/fase4-visual
```

⚠️ `origin` = `AlienWorld-Remastered-V2`. **Nunca** empurre para o remoto `legacy`.

---

## O QUE O M1 NÃO FAZ, DE PROPÓSITO

- **Nenhuma das 14 peças de arte.** A faixa e a mesa deste plano são provisórias e feias por
  decisão. As peças de verdade entram nas etapas M2–M5, uma câmara por vez, com julgamento dele
  no meio.
- **A troca de peças por câmara.** O evento `cenario` continua trocando só a pintura. Trocar o
  jogo de peças junto é o M2.
- **Os `f4Veu` (o primeiro plano).** O `Parallax` já tem camada de primeiro plano; a peça não.
- **As 3 portas do Bloco C.** Continuam valendo como a spec da Fatia 7 as escreveu, HP incluídos.
- **O Bloco B (o chefão).** Inalterado pela moldura. ⚠️ Continua de pé com a arte nova do guardião
  em `assets/raw/anim-guardiao-novo/` e o aviso de que `G_CORE_OFF_X/Y` e `G_MUZZLE_X/Y` **têm que
  ser remedidos** (a arte nova é 256×256 contra 256×227).
- **A calibragem dos números novos.** Vai com a calibragem geral do passe visual, depois das fatias.
- **A limpeza dos 4 objetos no PixelLab** (`review:awaiting-selection`). É uma decisão dele, e está
  no START com os quatro `object_id`.
