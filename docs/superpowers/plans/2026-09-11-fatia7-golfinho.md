# O Golfinho — Mini-chefão da Câmara B · Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O golfinho biomecânico entra em t=40 da Fase 4 como mini-chefão (aviso A→B, X com cambalhota e leque, duelo com flip e rajada), e a fase segura em t=49,5 enquanto ele vive.

**Architecture:** Uma entidade própria `src/entities/Golfinho.ts` com máquina de estados, barra e piso de vida. A `GameScene` cria a entidade no evento `miniboss` (que ganha `kind` e `seguraEm`), liga as colisões, dá os pontos e trava o `elapsed` em `seguraEm`. A arte vem das animações PixMiniMax já aprovadas, montadas em folhas por um script que apaga a bala desenhada.

**Tech Stack:** TypeScript + Phaser 3.90 + Vite · `sharp` para a arte · Playwright para as sondas.

**Spec:** `docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md`

## Global Constraints

- Commits de autoria SÓ do Henrique: **sem `Co-Authored-By`, sem "Generated with"**. Mensagens no estilo do repo (sem acento no corpo).
- Sondas de tempo real: **UMA POR VEZ** (`npm run dev` rodando em `http://localhost:5173/`).
- Resolução nativa, escala 1. Reduzir pode; ampliar nunca.
- O roteiro tem de estar em ordem crescente de `t` (o construtor do `StageDirector` lança).
- Toda peça de arte tem assert de CHAVE DE TEXTURA e de DIMENSÃO.
- Linha de base intocável: `probe-stage4` → `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}` (os vãos ficam entre 96 e 124 no assert; o número registrado é o da spec de 08/09).
- ABRA A IMAGEM: capturas de aviso, X, duelo e t=50 são olhadas, não só geradas.

---

## Mapa de arquivos

| arquivo | o quê |
|---|---|
| `assets/raw/anim-golfinho/{nado,flip,cambalhota}/N.png` | **criar** — os quadros crus da PixMiniMax (80×80) |
| `scripts/_f4/_golfinho-sheets.mjs` | **criar** — apaga a bala desenhada, monta as 3 folhas e recorta a bala 13×9 |
| `public/sprites/golfinho-{nado,flip,cambalhota}.png`, `shot-golfinho.png` | **criar** (gerados pelo script) |
| `src/scenes/BootScene.ts` | **modificar** — `SHEETS` (3 folhas) e `ART` (`shotGolfinho`) |
| `src/entities/Golfinho.ts` | **criar** — a entidade |
| `src/systems/StageDirector.ts` | **modificar** — o tipo do `miniboss` e o `STAGE_4` da câmara B |
| `src/scenes/GameScene.ts` | **modificar** — spawn, colisões, bomba, teleguiado, `G`, a trava do relógio |
| `scripts/probe-f4-golfinho.mjs` | **criar** — a sonda nova |
| `scripts/probe-f4-visual.mjs`, `scripts/probe-f4-moldura.mjs` | **modificar** — o ajudante que mata o golfinho; a trava e a mesa medidas depois de t=50 |

---

### Task 1: A arte — folhas, bala e registro no Boot

**Files:**
- Create: `assets/raw/anim-golfinho/nado/0..8.png`, `flip/0..16.png`, `cambalhota/0..16.png`
- Create: `scripts/_f4/_golfinho-sheets.mjs`
- Create (gerado): `public/sprites/golfinho-nado.png`, `golfinho-flip.png`, `golfinho-cambalhota.png`, `shot-golfinho.png`
- Modify: `src/scenes/BootScene.ts` (mapa `SHEETS` ~l.249 e mapa `ART` ~l.562)

**Interfaces:**
- Produces: texturas `golfinhoNado` (9×80×80), `golfinhoFlip` (17×80×80), `golfinhoCambalhota` (17×80×80), `shotGolfinho` (13×9, apontando para a DIREITA).

- [ ] **Step 1: Copiar os quadros crus da pasta temporária para o repositório**

```bash
S="C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/0fa81e62-dbf3-4adc-9ac1-f2d0b05c8271/scratchpad"
R="assets/raw/anim-golfinho"
mkdir -p "$R/nado" "$R/flip" "$R/cambalhota"
for i in $(seq 0 8);  do cp "$S/golfinho-nado-q$(printf %02d $i).png" "$R/nado/$i.png"; done
for i in $(seq 0 16); do cp "$S/golfinho-flip-tiro-q$(printf %02d $i).png" "$R/flip/$i.png"; done
for i in $(seq 0 16); do cp "$S/golfinho-cambalhota-v1-q$(printf %02d $i).png" "$R/cambalhota/$i.png"; done
ls "$R"/* | wc -l
```
Expected: `46` (43 arquivos + 3 cabeçalhos de pasta do `ls`).

- [ ] **Step 2: Escrever o script das folhas**

`scripts/_f4/_golfinho-sheets.mjs`:

```js
// O GOLFINHO (Fatia 7) — monta as três folhas do mini-chefão e recorta a bala dele.
//
// A arte são as animações PixMiniMax aprovadas pelo Henrique em 11/09 (nado, flip, cambalhota v1),
// 80×80 com o golfinho virado para a ESQUERDA. Os quadros crus moram em assets/raw/anim-golfinho/.
//
// ⚠️ A BALA DESENHADA É APAGADA, e é o motivo de este script existir. O flip e a cambalhota trazem
// a bala vermelha voando dentro do quadro; no jogo quem voa e fere é a bala REAL, e com as duas
// haveria dois tiros na tela e só um mataria. Em cada quadro de tiro apaga-se o que está FORA da
// silhueta da pose limpa anterior, e só à frente do focinho — o brilho da boca, que fica dentro do
// corpo, sobrevive.
//
// Uso: node scripts/_f4/_golfinho-sheets.mjs
import sharp from 'sharp';

const RAW = 'assets/raw/anim-golfinho';
const OUT = 'public/sprites';
const Q = 80;
/** Colunas à frente do focinho onde a bala desenhada mora (medido: ela vai de x=5 a x=30). */
const FRENTE = 31;

const CLIPES = [
  { nome: 'nado', n: 9, arquivo: 'golfinho-nado', tiro: null },
  // Medido em 11/09: o vermelho da bala aparece no quadro 11 do flip e no 14 da cambalhota; o
  // quadro anterior de cada um é a pose ereta, limpa.
  { nome: 'flip', n: 17, arquivo: 'golfinho-flip', tiro: { limpo: 10, primeiro: 11 } },
  { nome: 'cambalhota', n: 17, arquivo: 'golfinho-cambalhota', tiro: { limpo: 13, primeiro: 14 } },
];

const vermelho = (r, g, b) => r > 140 && g < 90 && b < 90;

async function carrega(nome, n) {
  const quadros = [];
  for (let i = 0; i < n; i++) {
    const { data, info } = await sharp(`${RAW}/${nome}/${i}.png`)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    if (info.width !== Q || info.height !== Q) {
      throw new Error(`${nome}/${i}.png tem ${info.width}x${info.height}, esperado ${Q}x${Q}`);
    }
    quadros.push(Buffer.from(data));
  }
  return quadros;
}

const alfa = (buf, x, y) => buf[(y * Q + x) * 4 + 3];

/** O focinho da pose limpa: a coluna opaca mais à esquerda na faixa da boca (y 30..50). */
function focinho(ref) {
  let min = Q;
  for (let y = 30; y <= 50; y++) {
    for (let x = 0; x < Q; x++) {
      if (alfa(ref, x, y) >= 128) {
        min = Math.min(min, x);
        break;
      }
    }
  }
  return min;
}

let balaCrua = null;

for (const clipe of CLIPES) {
  const quadros = await carrega(clipe.nome, clipe.n);

  if (clipe.tiro) {
    const ref = quadros[clipe.tiro.limpo];
    const bico = focinho(ref);
    for (let i = clipe.tiro.primeiro; i < clipe.n; i++) {
      const q = quadros[i];
      // O que for apagado do flip no quadro 12 (o maior da bala) é a própria bala: guardado.
      const guarda = clipe.nome === 'flip' && i === 12 ? Buffer.alloc(Q * Q * 4) : null;
      let apagados = 0;
      for (let y = 0; y < Q; y++) {
        for (let x = 0; x < FRENTE; x++) {
          const k = (y * Q + x) * 4;
          if (q[k + 3] > 0 && alfa(ref, x, y) < 128) {
            if (guarda) q.copy(guarda, k, k, k + 4);
            q[k] = q[k + 1] = q[k + 2] = q[k + 3] = 0;
            apagados++;
          }
        }
      }
      if (guarda) balaCrua = guarda;
      // A VERIFICAÇÃO: nenhum vermelho sobra à frente do focinho da pose limpa.
      let sobra = 0;
      for (let y = 0; y < Q; y++) {
        for (let x = 0; x < bico; x++) {
          const k = (y * Q + x) * 4;
          if (q[k + 3] >= 128 && vermelho(q[k], q[k + 1], q[k + 2])) sobra++;
        }
      }
      console.log(`${clipe.nome} q${i}: ${apagados} px apagados, vermelho à frente do focinho (x<${bico}): ${sobra}`);
      if (sobra > 0) throw new Error(`${clipe.nome} q${i}: a bala desenhada sobreviveu (${sobra} px)`);
    }
  }

  await sharp({
    create: { width: Q * clipe.n, height: Q, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(quadros.map((q, i) => ({ input: q, raw: { width: Q, height: Q, channels: 4 }, left: i * Q, top: 0 })))
    .png()
    .toFile(`${OUT}/${clipe.arquivo}.png`);
  console.log(`✔ ${OUT}/${clipe.arquivo}.png (${clipe.n} quadros de ${Q}x${Q})`);
}

// ─── A BALA: o recorte do flip, virado para a DIREITA e reduzido a 13×9 ───
//
// ⚠️ 13×9 é o quadro do `bolt2` e da `shotAranha`: a hitbox do pool de balas inimigas vem desse
// quadro (ver `EnemySystem.release`). Reduzir é permitido pela lei da resolução.
// ⚠️ PARA A DIREITA porque a munição inimiga gira com `setRotation(angulo)`, e ângulo 0 é direita.
const bruta = await sharp(balaCrua, { raw: { width: Q, height: Q, channels: 4 } }).png().toBuffer();
const aparada = await sharp(bruta).trim({ threshold: 0 }).toBuffer({ resolveWithObject: true });
console.log(`bala crua: ${aparada.info.width}x${aparada.info.height}`);
const reduzida = await sharp(aparada.data)
  .flop()
  .resize(13, 9, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
// Alfa binário: meio-transparente numa bala de 13px vira borrão.
const px = reduzida.data;
for (let k = 3; k < px.length; k += 4) px[k] = px[k] >= 96 ? 255 : 0;
await sharp(px, { raw: { width: 13, height: 9, channels: 4 } }).png().toFile(`${OUT}/shot-golfinho.png`);
console.log(`✔ ${OUT}/shot-golfinho.png (13x9)`);
```

- [ ] **Step 3: Rodar e conferir que a verificação passa**

Run: `node scripts/_f4/_golfinho-sheets.mjs`
Expected: 9 linhas `flip qN` e 3 `cambalhota qN`, todas com `vermelho à frente do focinho (...): 0`, e 4 linhas `✔`.

- [ ] **Step 4: ABRIR a folha do flip, a da cambalhota e a bala ampliadas**

```bash
node --input-type=module -e "
import sharp from 'sharp';
const S='C:/Users/Henrique/AppData/Local/Temp/claude/C--Users-Henrique-Documents-Projetos-folder-AlienWorld-resmater/0fa81e62-dbf3-4adc-9ac1-f2d0b05c8271/scratchpad';
for (const n of ['golfinho-flip','golfinho-cambalhota']) {
  const m = await sharp('public/sprites/'+n+'.png').metadata();
  await sharp('public/sprites/'+n+'.png').extract({left:80*9,top:0,width:m.width-80*9,height:80}).resize((m.width-720)*3,240,{kernel:'nearest'}).flatten({background:'#1e344e'}).toFile(S+'/conf-'+n+'.png');
}
await sharp('public/sprites/shot-golfinho.png').resize(13*16,9*16,{kernel:'nearest'}).flatten({background:'#1e344e'}).toFile(S+'/conf-shot.png');
"
```
Olhar `conf-golfinho-flip.png`, `conf-golfinho-cambalhota.png` e `conf-shot.png`: sem bala à frente do focinho nos quadros de tiro; o brilho da boca continua; a bala é um traço vermelho apontando para a direita.

- [ ] **Step 5: Registrar no Boot**

Em `src/scenes/BootScene.ts`, no fim do mapa `SHEETS` (depois de `menuLogoSheet`):

```ts
  // O GOLFINHO BIOMECÂNICO — o mini-chefão da câmara B da Fase 4 (spec 2026-09-11). Animações
  // PixMiniMax aprovadas pelo Henrique, 80×80 com o bicho virado para a ESQUERDA (o sentido dos
  // inimigos). ⚠️ O QUADRO NÃO É O CORPO: o golfinho ocupa ~42×30 do quadro, e a hitbox é fixada à
  // mão no `Golfinho`. ⚠️ A bala que as animações traziam desenhada foi APAGADA por
  // `scripts/_f4/_golfinho-sheets.mjs` — rodar de novo a cada reinstalação.
  golfinhoNado: { path: 'sprites/golfinho-nado.png', w: 80, h: 80 },
  golfinhoFlip: { path: 'sprites/golfinho-flip.png', w: 80, h: 80 },
  golfinhoCambalhota: { path: 'sprites/golfinho-cambalhota.png', w: 80, h: 80 },
```

E no mapa `ART`, logo depois de `paintBgF4d`:

```ts

  // A BALA DO GOLFINHO: o tiro vermelho que o Henrique aprovou na animação do flip, recortado,
  // virado para a direita e reduzido a 13×9 — o quadro do `bolt2`, de onde a hitbox do pool vem.
  shotGolfinho: 'sprites/shot-golfinho.png',
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: termina sem erro de TypeScript.

- [ ] **Step 7: Commit**

```bash
git add assets/raw/anim-golfinho scripts/_f4/_golfinho-sheets.mjs public/sprites/golfinho-nado.png public/sprites/golfinho-flip.png public/sprites/golfinho-cambalhota.png public/sprites/shot-golfinho.png src/scenes/BootScene.ts
git commit -m "feat(fase4): a arte do golfinho — tres folhas sem a bala desenhada, e a bala dele"
```

---

### Task 2: O golfinho em jogo — a sonda, a entidade, o roteiro e a cena

**Files:**
- Create: `scripts/probe-f4-golfinho.mjs`
- Create: `src/entities/Golfinho.ts`
- Modify: `src/systems/StageDirector.ts:19` (tipo) e `:421-447` (`STAGE_4`)
- Modify: `src/scenes/GameScene.ts` (imports, campos, `create`, atalho `G`, `update`, `homingTargets`, `runEvent`, `useBomb`, métodos novos)

**Interfaces:**
- Consumes: texturas da Task 1; `Moldura.superficieTetoEm(x)`, `superficieChaoEm(x)`; `EnemySystem.enemyBullets`.
- Produces:
  - `export type SentidoGolfinho = 'sobe' | 'desce'`
  - `export type EstadoGolfinho = 'aviso' | 'espera' | 'x1' | 'intervalo' | 'x2' | 'entrada' | 'duelo' | 'morto'`
  - `class Golfinho { static HP=50; static PISO=25; static SCORE=500; readonly sprite; readonly sentido; readonly yA; readonly yB; readonly bar; get estado(); get hp(); get vivo(); get vulneravel(); update(dt, nave); damage(n): boolean; destroy() }`
  - `GameScene`: `golfinho: Golfinho | null`, `spawnGolfinho(sentido?, seguraEm?)`, `matarGolfinho()`, `encerrarGolfinho()`
  - Evento: `{ t; type: 'miniboss'; kind?: 'aranha' | 'golfinho'; seguraEm?: number }`

- [ ] **Step 1: Escrever a sonda (ela tem de falhar agora)**

`scripts/probe-f4-golfinho.mjs`:

```js
// A SONDA DO GOLFINHO (Fatia 7) — o mini-chefão da câmara B da Fase 4.
//
// O que só se vê rodando: se ele nasce com o evento de t=40, se A e B caem em paredes opostas nos
// DOIS sorteios, se o aviso é intocável, se o X fere e o piso segura em 25, se a fase SEGURA em
// t=49,5 com o mundo rolando, se o duelo cospe rajada, e se a morte solta a fase.
//
// ⚠️ TODO DANO É BALA REAL (a lição da Fase 3: sonda que pula a balística não testa a luta). Os
// únicos atalhos são baixar a vida antes de atirar, para a sonda não depender de mira.
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez.
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

const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});

/** Espera por ESTADO do jogo, nunca por relógio de parede. */
const esperar = async (fn, max = 600) => {
  for (let i = 0; i < max; i++) {
    await blindar();
    const r = await page.evaluate(fn);
    if (r) return r;
    await page.waitForTimeout(100);
  }
  return null;
};

// ─── O SALTO: 1s antes da câmara B, com o estado que o roteiro teria deixado ───
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.elapsed = 39;
  s.director.skipTo(39);
  s.aplicaCorredorEMoldura(39);
  s.hazardRate = 0;
  s.propRate = 0;
});

// ─── NASCE COM O ROTEIRO ───
const nasceu = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.golfinho ? { t: Math.round(s.elapsed * 10) / 10, sentido: s.golfinho.sentido, segura: s.golfinhoSeguraEm } : null;
}, 100);
console.log('nasceu   ', JSON.stringify(nasceu));
ok(nasceu !== null && nasceu.t >= 40, `o golfinho nasce com o evento de t=40 (${JSON.stringify(nasceu)})`);
ok(nasceu?.segura === 49.5, `o roteiro manda a fase segurar em 49,5 (${nasceu?.segura})`);

// ─── A ARTE: chave de textura e dimensão (a lei 1 do M1) ───
const arte = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const folha = (k) => {
    if (!s.textures.exists(k)) return null;
    const f = s.textures.getFrame(k, 0);
    return { quadros: s.textures.get(k).getFrameNames().length, dim: `${f.width}x${f.height}` };
  };
  const shot = s.textures.exists('shotGolfinho') ? s.textures.get('shotGolfinho').getSourceImage() : null;
  return {
    nado: folha('golfinhoNado'),
    flip: folha('golfinhoFlip'),
    camb: folha('golfinhoCambalhota'),
    shot: shot ? `${shot.width}x${shot.height}` : null,
  };
});
console.log('arte     ', JSON.stringify(arte));
ok(arte.nado?.quadros === 9 && arte.nado?.dim === '80x80', `folha do NADO: 9 quadros de 80×80 (${JSON.stringify(arte.nado)})`);
ok(arte.flip?.quadros === 17 && arte.flip?.dim === '80x80', `folha do FLIP: 17 quadros de 80×80 (${JSON.stringify(arte.flip)})`);
ok(arte.camb?.quadros === 17 && arte.camb?.dim === '80x80', `folha da CAMBALHOTA: 17 quadros de 80×80 (${JSON.stringify(arte.camb)})`);
ok(arte.shot === '13x9', `a bala do golfinho é 13×9, o quadro do bolt2 (${arte.shot})`);

// ─── OS DOIS SORTEIOS: A e B em paredes opostas ───
const sorteios = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const meio = (s.moldura.superficieTetoEm(320) + s.moldura.superficieChaoEm(320)) / 2;
  const r = { meio };
  for (const sentido of ['desce', 'sobe']) {
    s.spawnGolfinho(sentido, 49.5);
    r[sentido] = { yA: s.golfinho.yA, yB: s.golfinho.yB };
  }
  return r;
});
console.log('sorteios ', JSON.stringify(sorteios));
ok(sorteios.desce.yA < sorteios.meio && sorteios.desce.yB > sorteios.meio, `DESCE: A no teto, B no chão (${JSON.stringify(sorteios.desce)})`);
ok(sorteios.sobe.yA > sorteios.meio && sorteios.sobe.yB < sorteios.meio, `SOBE: A no chão, B no teto (${JSON.stringify(sorteios.sobe)})`);

// ─── O AVISO: intocável, sem barra, hitbox do CORPO ───
const aviso = await page.evaluate(() => {
  const g = window.__game.scene.getScenes(true)[0].golfinho;
  return {
    estado: g.estado,
    tex: g.sprite.texture.key,
    dims: `${g.sprite.displayWidth}x${g.sprite.displayHeight}`,
    escala: g.sprite.scaleX,
    corpo: `${g.sprite.body.width}x${g.sprite.body.height}`,
    corpoLigado: g.sprite.body.enable,
    vulneravel: g.vulneravel,
    barra: g.bar.visible,
    angulo: g.sprite.angle,
  };
});
console.log('aviso    ', JSON.stringify(aviso));
ok(aviso.estado === 'aviso', `começa no AVISO (${aviso.estado})`);
ok(aviso.tex === 'golfinhoNado', `nada com a folha certa, não a textura de erro (${aviso.tex})`);
ok(aviso.dims === '80x80' && aviso.escala === 1, `escala 1, quadro 80×80 (${aviso.dims}, ${aviso.escala})`);
// ⚠️ O ASSERT QUE PEGA A HITBOX DO QUADRO INTEIRO: com a regra padrão ela seria 80×80 e mataria no vazio.
ok(aviso.corpo === '34x20', `a hitbox é do CORPO, 34×20 — não do quadro (${aviso.corpo})`);
ok(aviso.corpoLigado === false && aviso.vulneravel === false, `no aviso ele é intocável (corpo=${aviso.corpoLigado}, vulnerável=${aviso.vulneravel})`);
ok(aviso.barra === false, `no aviso a barra está escondida (${aviso.barra})`);
ok(Math.abs(aviso.angulo) === 90, `a travessia vertical gira 90°, sem serrilhar (${aviso.angulo})`);
await page.screenshot({ path: 'probe-f4-golfinho-aviso.png' });

// ─── A BALA ATRAVESSA O AVISO (na espera em B, parado) ───
await esperar(() => window.__game.scene.getScenes(true)[0].golfinho?.estado === 'espera', 100);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  s.ship.body.reset(g.sprite.x - 90, g.sprite.y);
});
await page.keyboard.down('Space');
await page.waitForTimeout(900);
const atravessa = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  return {
    estado: g.estado,
    hp: g.hp,
    alem: s.weapons.bullets.getChildren().filter((b) => b.active && b.x > g.sprite.x + 30).length,
  };
});
await page.keyboard.up('Space');
console.log('atravessa', JSON.stringify(atravessa));
ok(atravessa.hp === 50, `a bala do jogador não fere o aviso (hp=${atravessa.hp})`);
ok(atravessa.alem > 0, `a bala ATRAVESSA o golfinho no aviso (${atravessa.alem} balas além dele)`);

// ─── O X: fere, barra aparece, leque de 3 na metade direita, piso em 25 ───
const x1 = await esperar(() => {
  const g = window.__game.scene.getScenes(true)[0].golfinho;
  return g && g.estado === 'x1' ? { barra: g.bar.visible, corpo: g.sprite.body.enable, vulneravel: g.vulneravel } : null;
}, 100);
console.log('x1       ', JSON.stringify(x1));
ok(x1 !== null && x1.barra && x1.corpo && x1.vulneravel, `no X a barra aparece e ele passa a ferir e apanhar (${JSON.stringify(x1)})`);

await page.evaluate(() => { window.__game.scene.getScenes(true)[0].golfinho._hp = 27; });
let leque = null;
let dimsBala = [];
let hpX = null;
let capturouX = false;
await page.keyboard.down('Space');
for (let i = 0; i < 120; i++) {
  await blindar();
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return null;
    if (g.sprite.x > 120) s.ship.body.reset(Math.max(24, g.sprite.x - 100), g.sprite.y);
    const bs = s.enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'shotGolfinho');
    const grupos = {};
    for (const b of bs) {
      const k = `${Math.round(b.getData('ox'))},${Math.round(b.getData('oy'))}`;
      grupos[k] = (grupos[k] ?? 0) + 1;
    }
    return { estado: g.estado, hp: g.hp, grupos, dims: [...new Set(bs.map((b) => `${b.displayWidth}x${b.displayHeight}`))] };
  });
  if (!r || (r.estado !== 'x1' && r.estado !== 'intervalo' && r.estado !== 'x2')) break;
  hpX = r.hp;
  for (const [k, n] of Object.entries(r.grupos)) if (n >= 3 && !leque) leque = { k, n };
  if (r.dims.length) dimsBala = r.dims;
  if (leque && !capturouX) {
    await page.screenshot({ path: 'probe-f4-golfinho-x.png' });
    capturouX = true;
  }
  await page.waitForTimeout(80);
}
await page.keyboard.up('Space');
console.log('X        ', JSON.stringify({ leque, dimsBala, hpX }));
ok(leque !== null && leque.n === 3, `a cambalhota cospe um LEQUE de 3 (${JSON.stringify(leque)})`);
ok(leque !== null && Number(leque.k.split(',')[0]) > 192, `o leque sai na METADE DIREITA da tela (origem ${leque?.k})`);
ok(dimsBala.length === 1 && dimsBala[0] === '13x9', `a bala em tela é 13×9 (${JSON.stringify(dimsBala)})`);
ok(hpX === 25, `o PISO segura: o X não derruba a vida abaixo de 25 (hp=${hpX})`);

// ─── O DUELO: a fase segura em 49,5, o mundo rola, nada nasce, rajada de 3 ───
const d0 = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const g = s.golfinho;
  if (!g || g.estado !== 'duelo') return null;
  return {
    now: s.time.now,
    faixa: s.children.list.filter((o) => o.name === 'faixaChao').map((o) => Math.round(o.x)).join(','),
    inimigos: s.enemies.enemies.countActive(),
  };
}, 300);
ok(d0 !== null, 'o golfinho chega ao DUELO');
let dFim = null;
let rajada = null;
let yFora = 0;
for (let i = 0; d0 && i < 300; i++) {
  await blindar();
  const r = await page.evaluate((now0) => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return null;
    s.ship.body.reset(60, 108);
    const bs = s.enemies.enemyBullets.getChildren().filter((b) => b.active && b.texture.key === 'shotGolfinho');
    const grupos = {};
    for (const b of bs) {
      const k = `${Math.round(b.getData('ox'))},${Math.round(b.getData('oy'))}`;
      grupos[k] = (grupos[k] ?? 0) + 1;
    }
    return {
      dt: s.time.now - now0,
      t: s.elapsed,
      estado: g.estado,
      y: g.sprite.y,
      teto: s.moldura.superficieTetoEm(300) + 22,
      chao: s.moldura.superficieChaoEm(300) - 22,
      grupos,
      faixa: s.children.list.filter((o) => o.name === 'faixaChao').map((o) => Math.round(o.x)).join(','),
      props: s.terrain.props.countActive(),
      perigos: s.debris.hazards.countActive(),
      inimigos: s.enemies.enemies.countActive(),
    };
  }, d0.now);
  if (!r) break;
  if (r.y < r.teto - 1 || r.y > r.chao + 1) yFora++;
  for (const [k, n] of Object.entries(r.grupos)) if (n >= 3 && !rajada) rajada = { k, n };
  dFim = r;
  if (r.dt >= 4000 && rajada) break;
  await page.waitForTimeout(100);
}
console.log('duelo    ', JSON.stringify({ dFim, rajada, yFora }));
await page.screenshot({ path: 'probe-f4-golfinho-duelo.png' });
ok(dFim?.t === 49.5, `a fase SEGURA em t=49,5 durante o duelo (t=${dFim?.t})`);
ok(dFim && dFim.faixa !== d0.faixa, `mas o MUNDO continua rolando — a faixa andou (${d0?.faixa} → ${dFim?.faixa})`);
ok(dFim?.props === 0 && dFim?.perigos === 0, `na arena não nasce mesa nem mina (props=${dFim?.props}, perigos=${dFim?.perigos})`);
ok(dFim && dFim.inimigos <= d0.inimigos, `nenhum inimigo novo entra na arena (${d0?.inimigos} → ${dFim?.inimigos})`);
ok(rajada !== null && rajada.n === 3, `o flip cospe uma RAJADA de 3 (${JSON.stringify(rajada)})`);
ok(yFora === 0, `a altura dele fica presa entre as paredes (${yFora} amostras fora)`);

// ─── PERDER UMA VIDA NO DUELO: ele continua ───
const perda = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.invulnerableUntil = 0;
  const antes = s.lives;
  s.damageShip();
  return { antes, depois: s.lives, estado: s.golfinho?.estado };
});
await blindar();
ok(perda.depois === perda.antes - 1 && perda.estado === 'duelo', `perder uma vida no duelo não o encerra (${JSON.stringify(perda)})`);

// ─── A MORTE POR BALA REAL: +500, e a fase segue de 49,5 ───
const score0 = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.golfinho._hp = 4;
  return s.score;
});
let morto = null;
await page.keyboard.down('Space');
for (let i = 0; i < 100; i++) {
  await blindar();
  const r = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const g = s.golfinho;
    if (!g) return { score: s.score };
    s.ship.body.reset(g.sprite.x - 120, g.sprite.y);
    return null;
  });
  if (r) { morto = r; break; }
  await page.waitForTimeout(100);
}
await page.keyboard.up('Space');
ok(morto !== null, 'a bala real mata o golfinho');
ok(morto && morto.score - score0 >= 500, `a morte paga 500 pontos (${score0} → ${morto?.score})`);
const solto = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.elapsed >= 50.4 ? { t: Math.round(s.elapsed * 10) / 10, gap: s.corredorGap, rate: s.corredorRate } : null;
}, 100);
console.log('solto    ', JSON.stringify(solto));
ok(solto !== null, 'morto o golfinho, a fase volta a andar');
ok(solto?.gap === 76 && solto?.rate === 1.9, `o evento de t=50 disparou: o aperto voltou (${JSON.stringify(solto)})`);
await esperar(() => window.__game.scene.getScenes(true)[0].elapsed >= 53, 100);
await page.screenshot({ path: 'probe-f4-golfinho-t50.png' });

// ─── O ESCAPE `G`: a pausa nunca prende a fase ───
const preso = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.spawnGolfinho('desce', s.elapsed);
  return s.elapsed;
});
await page.waitForTimeout(700);
const presoDepois = await page.evaluate(() => window.__game.scene.getScenes(true)[0].elapsed);
ok(presoDepois === preso, `com o golfinho vivo o relógio não passa do teto (${preso} → ${presoDepois})`);
await page.keyboard.press('G');
const escape = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.boss ? { semGolfinho: s.golfinho === null, t: Math.round(s.elapsed) } : null;
}, 150);
console.log('escape   ', JSON.stringify(escape));
ok(escape !== null && escape.semGolfinho, `o G no meio da arena encerra o golfinho e a fase chega ao chefão (${JSON.stringify(escape)})`);

console.log(falhas === 0 ? '\n✔ O GOLFINHO ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
```

- [ ] **Step 2: Rodar a sonda e ver falhar**

Run: `node scripts/probe-f4-golfinho.mjs`
Expected: FAIL — `✘ o golfinho nasce com o evento de t=40 (null)` (e erros de página ao chamar `spawnGolfinho`).

- [ ] **Step 3: O tipo do evento e o roteiro**

Em `src/systems/StageDirector.ts`, trocar a linha 19:

```ts
  /** O MINI-BOSS do Ato 2 (a aranha que anda no casco). Um por fase, roteirizado. */
  | { t: number; type: 'miniboss' }
```

por:

```ts
  /**
   * O MINI-CHEFÃO de uma fase, roteirizado — um por fase.
   *
   * `kind` ausente é a ARANHA (Fase 3): o `STAGE_3` não muda uma linha. `golfinho` é o da câmara B
   * da Fase 4 (spec 2026-09-11), e ele traz a ARENA: `seguraEm` é o `t` que o relógio da fase não
   * passa enquanto ele viver.
   *
   * ⚠️ O TETO É DO ROTEIRO, NÃO DA ENTIDADE, e é "não passa de", não "para quando o duelo começa".
   * O X do golfinho não tem duração exata — cada cambalhota o freia — e, se a pausa esperasse o
   * estado de duelo, um X mais longo deixaria os eventos seguintes nascerem DENTRO da arena.
   */
  | { t: number; type: 'miniboss'; kind?: 'aranha' | 'golfinho'; seguraEm?: number }
```

E no `STAGE_4`, substituir o trecho que vai de `{ t: 38, type: 'hazard', rate: 0, mix: [] },` até `{ t: 54, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 90 },` (inclusive) por:

```ts
  { t: 38, type: 'hazard', rate: 0, mix: [] },
  // A ARENA ABRE. O corredor para de nascer 1,5s antes da câmara: as últimas mesas saem da tela em
  // 384 ÷ 84 = 4,6s, ou seja, em t≈43,1 — antes de o X do golfinho começar (t≈43,5).
  { t: 38.5, type: 'corredor', rate: 0, gap: 104 },

  // A CÂMARA 2 — a caixa torácica. Azul frio contra o vermelho da câmara 1: é a troca de
  // PALETA que faz "estou indo fundo" ser lido. Duas câmaras vermelhas seguidas leriam como o
  // mesmo lugar. Cai no RESPIRO (sem onda no ar), não no meio de uma.
  { t: 40, type: 'cenario', key: 'paintBgF4b' },
  // ─── O GOLFINHO: o motivo de a câmara mudar (spec 2026-09-11). ───
  //
  // O Henrique, depois de jogar o M1.5: *"quero que tenha um porquê de mudar o fundo"*. Antes daqui
  // os inimigos, as minas e a mesa eram os mesmos dos dois lados da troca. Agora a pintura azul chega
  // junto com o primeiro habitante do Leviatã: aviso A→B, o X, e o duelo em arena.
  //
  // ⚠️ `seguraEm: 49.5`: o relógio não passa daqui enquanto ele viver, e entre 41 e 50 o roteiro
  // não tem NADA marcado — é isso que faz a arena ser só o jogador e o golfinho.
  { t: 40, type: 'miniboss', kind: 'golfinho', seguraEm: 49.5 },
  { t: 41, type: 'banner', text: 'AS PROFUNDEZAS' },

  // ─── O APERTO: o coração da fase. Vão 76px (a nave tem ~22 de hitbox: passa com folga
  // CURTA), minas nos vãos, cargueiro cuspindo drones no corredor. Posição sob pressão. ───
  //
  // ⚠️ ENCOLHEU DE 20s PARA 13s (e a onda de batedores de t=46 saiu) para o golfinho caber sem
  // empurrar o duto aprovado para fora de t=68.
  { t: 50, type: 'banner', text: 'A GARGANTA APERTA' },
  { t: 50, type: 'corredor', rate: 1.9, gap: 76 },
  // ⚠️ O APERTO NÃO É DA PAREDE, É DO VÃO. A borda continua em 16 aqui: quem cobra posição é o
  // `corredor` de 76px acima, e empilhar parede grossa em cima do vão mais estreito da fase era
  // justamente o que fazia a moldura deixar de ler como borda.
  { t: 50, type: 'moldura', espessura: 16 },
  { t: 50.5, type: 'hazard', rate: 2.6, mix: ['sensor', 'mina', 'destroco'] },
  { t: 52, type: 'banner', text: 'CARGUEIRO NO CORREDOR' },
  { t: 52.5, type: 'wave', kind: 'cargueiro', count: 1, spacing: 0, y: 100 },
  { t: 54, type: 'wave', kind: 'kamikaze', count: 4, spacing: 0.6, y: 90 },
```

- [ ] **Step 4: A entidade**

`src/entities/Golfinho.ts`:

```ts
import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import type { EnemySystem } from '../systems/EnemySystem';
import type { Moldura } from '../systems/Moldura';

/** Para onde o AVISO nada. `sobe`: A no chão e B no teto. `desce`: o contrário. */
export type SentidoGolfinho = 'sobe' | 'desce';

export type EstadoGolfinho =
  | 'aviso'
  | 'espera'
  | 'x1'
  | 'intervalo'
  | 'x2'
  | 'entrada'
  | 'duelo'
  | 'morto';

/**
 * O GOLFINHO BIOMECÂNICO — o mini-chefão da câmara B da Fase 4 (spec 2026-09-11).
 *
 * Ele é o MOTIVO de a câmara mudar. O Henrique jogou o M1.5 e perguntou por que o fundo troca, e
 * a resposta estava num protótipo que ele mesmo tinha criado no PixelLab sem uso pensado.
 *
 *   AVISO    nada de A até B, em paredes OPOSTAS (sorteio por partida). Intocável. B marca de onde
 *            o ataque sai — *"a marcação do ataque é a posição B, independente de onde seja"*.
 *   X        duas diagonais, da direita para a esquerda: a 1ª sai de B, a 2ª de A. Em cada uma,
 *            UMA cambalhota e o LEQUE de 3. A barra aparece; a vida não desce de 25.
 *   DUELO    pela direita, de frente, até morrer: flip subindo + RAJADA de 3, flip descendo +
 *            rajada. Sem piso.
 *
 * ⚠️ QUEM SEGURA A FASE NÃO É ESTA CLASSE. O teto do relógio é do roteiro (`seguraEm`) e quem o
 * aplica é a `GameScene`; aqui só se diz se o bicho está vivo.
 *
 * ⚠️ POSIÇÃO ESCRITA À MÃO, SEM VELOCIDADE. As trajetórias são segmentos com paradas (a cambalhota
 * FREIA, o flip anda 36px e para), e integrar velocidade faria a parada depender do `dt` do quadro.
 */
export class Golfinho {
  static readonly HP = 50;
  /** O X conta, mas o duelo sempre acontece: antes dele a vida não desce daqui (decisão dele). */
  static readonly PISO = 25;
  static readonly SCORE = 500;

  /** A coluna de A e B. */
  private static readonly COLUNA_AB = 320;
  /** O centro do corpo, em px para DENTRO da faixa jogável a partir da superfície da parede. */
  private static readonly DENTRO = 4;
  private static readonly AVISO_DUR = 2;
  private static readonly ESPERA_DUR = 1.5;
  private static readonly INTERVALO_DUR = 0.4;
  private static readonly VEL_X = 190;
  /**
   * ⚠️ A CAMBALHOTA É AQUI, E ELE FREIA NELA. A animação dura 1,4s e o tiro sai no fim; em
   * movimento a 190px/s o leque sairia em x≈100, nas COSTAS de quem joga. Parado em 280, sai na
   * metade direita da tela.
   */
  private static readonly X_CAMBALHOTA = 280;
  private static readonly SAIDA_X = -40;
  private static readonly ENTRADA_X = GAME_WIDTH + 30;
  private static readonly DUELO_X = 300;
  private static readonly VEL_ENTRADA = 120;
  private static readonly FLIP_PASSO = 36;
  private static readonly MARGEM_DUELO = 22;
  /** Os quadros 1–10 do flip são a rolagem; o deslocamento vertical acontece dentro deles. */
  private static readonly ROLAGEM_DUR = 10 / 12;
  private static readonly PAUSA_FLIP = 0.35;
  /** O quadro em que o vermelho da bala aparecia na animação (medido em 11/09). */
  private static readonly QUADRO_TIRO_FLIP = 11;
  private static readonly QUADRO_TIRO_CAMBALHOTA = 14;
  private static readonly LEQUE_ABERTURA = Phaser.Math.DegToRad(13);
  private static readonly VEL_LEQUE = 110;
  private static readonly VEL_RAJADA = 130;
  private static readonly RAJADA_TIROS = 3;
  private static readonly RAJADA_INTERVALO = 0.09;
  /** O focinho, a partir do centro do quadro 80×80 (medido: a bala nascia em (28, 41)). */
  private static readonly BOCA_X = -12;
  private static readonly BOCA_Y = 1;
  private static readonly BARRA_W = 100;

  readonly sprite: Phaser.Physics.Arcade.Sprite;
  readonly yA: number;
  readonly yB: number;
  readonly bar: Phaser.GameObjects.Rectangle;
  private readonly barBg: Phaser.GameObjects.Rectangle;

  private _estado: EstadoGolfinho = 'aviso';
  private _hp = Golfinho.HP;
  private t = 0;
  private vy = 0;
  private nave: Phaser.Physics.Arcade.Sprite | null = null;
  private cambalhotaFeita = false;
  private girando = false;
  /** O tiro da animação em curso já saiu? Rede para quadro pulado num `dt` grande. */
  private disparou = false;
  private flipSobe = true;
  private flipT = 0;
  private flipY0 = 0;
  private flipY1 = 0;
  private pausa = 0;
  private rajadaRestante = 0;
  private rajadaT = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly enemies: EnemySystem,
    private readonly moldura: Moldura,
    readonly sentido: SentidoGolfinho,
  ) {
    Golfinho.registrarAnims(scene);

    const teto = moldura.superficieTetoEm(Golfinho.COLUNA_AB) + Golfinho.DENTRO;
    const chao = moldura.superficieChaoEm(Golfinho.COLUNA_AB) - Golfinho.DENTRO;
    this.yA = sentido === 'sobe' ? chao : teto;
    this.yB = sentido === 'sobe' ? teto : chao;

    this.sprite = scene.physics.add.sprite(Golfinho.COLUNA_AB, this.yA, 'golfinhoNado');
    const body = this.body;
    body.setAllowGravity(false);
    // ⚠️ A HITBOX É DO CORPO, NÃO DO QUADRO. O golfinho ocupa ~42×30 de 80×80 (medido na pose de
    // nado: x=20..60, y=27..56). Com a regra padrão do jogo (tamanho da textura) ela mataria 38px
    // de vazio — a armadilha da mesa e da lamina, paga de novo se alguém trocar isto.
    body.setSize(34, 20, false);
    body.setOffset(40 - 17, 41 - 10);
    body.enable = false;

    // A travessia do aviso é VERTICAL: nariz para onde nada. 90° é o único giro que não serrilha.
    this.sprite.setAngle(sentido === 'sobe' ? 90 : -90);
    this.sprite.play('golfinho-nado');

    this.sprite.on(
      Phaser.Animations.Events.ANIMATION_UPDATE,
      (anim: Phaser.Animations.Animation, frame: Phaser.Animations.AnimationFrame) =>
        this.aoTrocarQuadro(anim.key, Number(frame.textureFrame)),
    );
    this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) =>
      this.aoCompletar(anim.key),
    );

    // A barra tem a cara da do chefão, mais curta: a promessa de que esta luta é menor que a final.
    this.barBg = scene.add
      .rectangle(GAME_WIDTH / 2, 16, Golfinho.BARRA_W, 4, COLORS.enemyDark)
      .setDepth(100)
      .setVisible(false);
    this.bar = scene.add
      .rectangle(GAME_WIDTH / 2 - Golfinho.BARRA_W / 2, 16, Golfinho.BARRA_W, 4, COLORS.enemyBright)
      .setOrigin(0, 0.5)
      .setDepth(101)
      .setVisible(false);
  }

  private static registrarAnims(scene: Phaser.Scene): void {
    const a = scene.anims;
    // Vai-e-volta: o nado da PixMiniMax não fecha o ciclo (salto 8→0 de 3,91 contra 2,8 entre
    // vizinhos), e em loop direto daria um tranco.
    if (!a.exists('golfinho-nado')) {
      a.create({
        key: 'golfinho-nado',
        frames: a.generateFrameNumbers('golfinhoNado', { start: 0, end: 8 }),
        frameRate: 10,
        repeat: -1,
        yoyo: true,
      });
    }
    if (!a.exists('golfinho-flip')) {
      a.create({
        key: 'golfinho-flip',
        frames: a.generateFrameNumbers('golfinhoFlip', { start: 0, end: 16 }),
        frameRate: 12,
        repeat: 0,
      });
    }
    if (!a.exists('golfinho-cambalhota')) {
      a.create({
        key: 'golfinho-cambalhota',
        frames: a.generateFrameNumbers('golfinhoCambalhota', { start: 0, end: 16 }),
        frameRate: 12,
        repeat: 0,
      });
    }
  }

  get estado(): EstadoGolfinho {
    return this._estado;
  }

  get hp(): number {
    return this._hp;
  }

  get vivo(): boolean {
    return this._estado !== 'morto' && this.sprite.active;
  }

  /** Fere e apanha: do X em diante. O aviso, a espera em B e o intervalo fora da tela, não. */
  get vulneravel(): boolean {
    return (
      this._estado === 'x1' || this._estado === 'x2' || this._estado === 'entrada' || this._estado === 'duelo'
    );
  }

  private get body(): Phaser.Physics.Arcade.Body {
    return this.sprite.body as Phaser.Physics.Arcade.Body;
  }

  update(dt: number, nave: Phaser.Physics.Arcade.Sprite): void {
    if (!this.vivo) return;
    this.nave = nave;
    this.t += dt;
    this.tickRajada(dt);

    switch (this._estado) {
      case 'aviso': {
        const p = Phaser.Math.Easing.Sine.InOut(Math.min(1, this.t / Golfinho.AVISO_DUR));
        this.sprite.y = Phaser.Math.Linear(this.yA, this.yB, p);
        if (this.t >= Golfinho.AVISO_DUR) {
          this.sprite.setAngle(0);
          this.mudar('espera');
        }
        break;
      }
      case 'espera':
        if (this.t >= Golfinho.ESPERA_DUR) this.iniciarDiagonal('x1');
        break;
      case 'x1':
      case 'x2':
        this.nadarDiagonal(dt);
        break;
      case 'intervalo':
        if (this.t >= Golfinho.INTERVALO_DUR) this.iniciarDiagonal('x2');
        break;
      case 'entrada':
        this.sprite.x = Math.max(Golfinho.DUELO_X, this.sprite.x - Golfinho.VEL_ENTRADA * dt);
        if (this.sprite.x <= Golfinho.DUELO_X) {
          this.pausa = Golfinho.PAUSA_FLIP;
          this.mudar('duelo');
        }
        break;
      case 'duelo':
        this.duelar(dt);
        break;
      case 'morto':
        break;
    }
  }

  /** @returns true se este dano o matou. */
  damage(amount: number): boolean {
    if (!this.vulneravel) return false;

    const piso = this._estado === 'x1' || this._estado === 'x2' ? Golfinho.PISO : 0;
    this._hp = Math.max(piso, this._hp - amount);
    this.bar.width = Golfinho.BARRA_W * (this._hp / Golfinho.HP);

    this.sprite.setTint(0xffb0b0);
    this.scene.time.delayedCall(40, () => {
      if (this.sprite.active) this.sprite.clearTint();
    });

    if (this._hp > 0) return false;
    this._estado = 'morto';
    return true;
  }

  destroy(): void {
    this._estado = 'morto';
    this.sprite.destroy();
    this.bar.destroy();
    this.barBg.destroy();
  }

  // ─── O X ─────────────────────────────────────────────────────────────────────

  private mudar(estado: EstadoGolfinho): void {
    this._estado = estado;
    this.t = 0;
  }

  /** A 1ª diagonal sai de B e termina na altura de A; a 2ª entra pela direita em A e termina em B. */
  private iniciarDiagonal(qual: 'x1' | 'x2'): void {
    const deX = qual === 'x1' ? Golfinho.COLUNA_AB : Golfinho.ENTRADA_X;
    const deY = qual === 'x1' ? this.yB : this.yA;
    const paraY = qual === 'x1' ? this.yA : this.yB;

    this.sprite.setPosition(deX, deY).setAngle(0).setVisible(true);
    this.vy = (paraY - deY) / ((deX - Golfinho.SAIDA_X) / Golfinho.VEL_X);
    this.cambalhotaFeita = false;
    this.body.enable = true;
    this.barBg.setVisible(true);
    this.bar.setVisible(true);
    this.mudar(qual);
  }

  private nadarDiagonal(dt: number): void {
    if (this.girando) return;

    this.sprite.x -= Golfinho.VEL_X * dt;
    this.sprite.y += this.vy * dt;

    if (!this.cambalhotaFeita && this.sprite.x <= Golfinho.X_CAMBALHOTA) {
      this.cambalhotaFeita = true;
      this.girar('golfinho-cambalhota');
      return;
    }

    if (this.sprite.x > Golfinho.SAIDA_X) return;

    if (this._estado === 'x1') {
      this.body.enable = false;
      this.sprite.setVisible(false);
      this.mudar('intervalo');
    } else {
      this.iniciarDuelo();
    }
  }

  // ─── O DUELO ─────────────────────────────────────────────────────────────────

  private iniciarDuelo(): void {
    const meio =
      (this.moldura.superficieTetoEm(Golfinho.DUELO_X) + this.moldura.superficieChaoEm(Golfinho.DUELO_X)) / 2;
    this.sprite.setPosition(Golfinho.ENTRADA_X, meio).setVisible(true);
    this.body.enable = true;
    this.mudar('entrada');
  }

  private duelar(dt: number): void {
    const teto = this.moldura.superficieTetoEm(Golfinho.DUELO_X) + Golfinho.MARGEM_DUELO;
    const chao = this.moldura.superficieChaoEm(Golfinho.DUELO_X) - Golfinho.MARGEM_DUELO;

    if (this.girando) {
      this.flipT += dt;
      const p = Phaser.Math.Easing.Sine.InOut(Math.min(1, this.flipT / Golfinho.ROLAGEM_DUR));
      this.sprite.y = Phaser.Math.Clamp(Phaser.Math.Linear(this.flipY0, this.flipY1, p), teto, chao);
      return;
    }

    this.sprite.y = Phaser.Math.Clamp(this.sprite.y, teto, chao);
    this.pausa -= dt;
    if (this.pausa > 0) return;

    // Bateu no limite: inverte. Um flip que não sai do lugar lê como engasgo.
    let destino = this.sprite.y + (this.flipSobe ? -1 : 1) * Golfinho.FLIP_PASSO;
    if (destino < teto || destino > chao) {
      this.flipSobe = !this.flipSobe;
      destino = this.sprite.y + (this.flipSobe ? -1 : 1) * Golfinho.FLIP_PASSO;
    }
    this.flipY0 = this.sprite.y;
    this.flipY1 = Phaser.Math.Clamp(destino, teto, chao);
    this.flipT = 0;
    this.girar('golfinho-flip');
  }

  // ─── AS ANIMAÇÕES E OS TIROS ────────────────────────────────────────────────

  private girar(chave: string): void {
    this.girando = true;
    this.disparou = false;
    this.sprite.play(chave);
  }

  private aoTrocarQuadro(chave: string, quadro: number): void {
    if (this.disparou) return;
    if (chave === 'golfinho-cambalhota' && quadro === Golfinho.QUADRO_TIRO_CAMBALHOTA) this.dispararDaAnimacao(chave);
    if (chave === 'golfinho-flip' && quadro === Golfinho.QUADRO_TIRO_FLIP) this.dispararDaAnimacao(chave);
  }

  private aoCompletar(chave: string): void {
    if (chave !== 'golfinho-cambalhota' && chave !== 'golfinho-flip') return;
    if (!this.vivo) return;
    // Rede: se um `dt` grande pulou o quadro do tiro, ele sai no fim — nunca some.
    if (!this.disparou) this.dispararDaAnimacao(chave);
    this.girando = false;
    if (chave === 'golfinho-flip') {
      this.flipSobe = !this.flipSobe;
      this.pausa = Golfinho.PAUSA_FLIP;
    }
    this.sprite.play('golfinho-nado');
  }

  private dispararDaAnimacao(chave: string): void {
    this.disparou = true;
    if (chave === 'golfinho-cambalhota') {
      // O LEQUE: *ache o buraco*.
      const centro = this.mira();
      for (const d of [-1, 0, 1]) this.atirar(centro + d * Golfinho.LEQUE_ABERTURA, Golfinho.VEL_LEQUE);
    } else {
      // A RAJADA: *saia da linha*. Três em fila, cada um mirado de novo.
      this.rajadaRestante = Golfinho.RAJADA_TIROS;
      this.rajadaT = 0;
    }
  }

  private tickRajada(dt: number): void {
    if (this.rajadaRestante <= 0) return;
    this.rajadaT -= dt;
    if (this.rajadaT > 0) return;
    this.atirar(this.mira(), Golfinho.VEL_RAJADA);
    this.rajadaRestante--;
    this.rajadaT = Golfinho.RAJADA_INTERVALO;
  }

  private mira(): number {
    const bx = this.sprite.x + Golfinho.BOCA_X;
    const by = this.sprite.y + Golfinho.BOCA_Y;
    return this.nave ? Phaser.Math.Angle.Between(bx, by, this.nave.x, this.nave.y) : Math.PI;
  }

  private atirar(angulo: number, velocidade: number): void {
    const bx = this.sprite.x + Golfinho.BOCA_X;
    const by = this.sprite.y + Golfinho.BOCA_Y;
    const b = this.enemies.enemyBullets.get(bx, by) as Phaser.Physics.Arcade.Sprite | null;
    if (!b) return;

    b.setActive(true).setVisible(true);
    b.body!.enable = true;
    // ⚠️ SEM TINT E BLEND NORMAL: a bala já nasce vermelha, e o slot do pool pode ter herdado o
    // aditivo de outro atirador. A hitbox do slot é o quadro do `bolt2` (13×9) — o mesmo da arte.
    b.setTexture('shotGolfinho').setScale(1).clearTint().setFlipX(false);
    b.setBlendMode(Phaser.BlendModes.NORMAL);
    b.setData('ox', bx);
    b.setData('oy', by);
    b.setVelocity(Math.cos(angulo) * velocidade, Math.sin(angulo) * velocidade);
    b.setRotation(angulo);
  }
}
```

- [ ] **Step 5: A cena**

Em `src/scenes/GameScene.ts`:

(a) Import, depois de `import { BossNucleo } from '../entities/BossNucleo';`:

```ts
import { Golfinho, type SentidoGolfinho } from '../entities/Golfinho';
```

(b) Campos, depois de `private boss: StageBoss | null = null;`:

```ts
  /** O mini-chefão da câmara B da Fase 4 (spec 2026-09-11). `null` fora da arena dele. */
  private golfinho: Golfinho | null = null;
  /** O `t` que o relógio da fase não passa enquanto o golfinho viver (`seguraEm` do roteiro). */
  private golfinhoSeguraEm = Infinity;
  private golfinhoColliders: Phaser.Physics.Arcade.Collider[] = [];
```

(c) No `create`, depois de `this.boss = null;`:

```ts
    this.golfinho = null;
    this.golfinhoSeguraEm = Infinity;
    this.golfinhoColliders = [];
```

(d) No atalho `G`, logo depois de `if (this.boss || this.over) return;`:

```ts
        // ⚠️ A ARENA NUNCA PRENDE A FASE: pular para o chefão encerra o golfinho primeiro, senão o
        // teto do relógio seguraria o `elapsed` que esta linha acabou de escrever.
        this.encerrarGolfinho();
```

(e) No `update`, trocar `this.elapsed += dt;` por:

```ts
    // A ARENA DO GOLFINHO: enquanto ele viver, o relógio da fase não passa do `seguraEm` do roteiro.
    // O mundo continua rolando (fundo, parede, física, armas) — só o roteiro, a aproximação, a barra
    // de progresso e os pontos por tempo esperam. `Math.max` porque o teto nunca faz o relógio VOLTAR.
    this.elapsed = this.golfinho?.vivo
      ? Math.min(this.elapsed + dt, Math.max(this.elapsed, this.golfinhoSeguraEm))
      : this.elapsed + dt;
```

(f) No `update`, trocar `this.boss?.update(dt, this.ship);` por:

```ts
    this.boss?.update(dt, this.ship);
    this.golfinho?.update(dt, this.ship);
    // Rede: se ele deixou de viver por um caminho que não passou por `matarGolfinho`, a arena solta.
    if (this.golfinho && !this.golfinho.vivo) this.encerrarGolfinho();
```

(g) No `homingTargets`, antes de `return alvos;`:

```ts
    if (this.golfinho?.vulneravel) alvos.push(this.golfinho.sprite);
```

(h) No `runEvent`, trocar o `case 'miniboss':` inteiro por:

```ts
      case 'miniboss':
        // O mini-chefão da fase. Sem `kind`, a ARANHA do casco (Fase 3, Ato 2): um inimigo do
        // roteiro, não um StageBoss — a fase continua correndo por baixo dela. O GOLFINHO (Fase 4)
        // é outra coisa: ele traz a ARENA, e o relógio segura em `seguraEm` enquanto ele viver.
        if (e.kind === 'golfinho') this.spawnGolfinho(undefined, e.seguraEm);
        else this.enemies.spawn('aranha', 0);
        break;
```

(i) No `useBomb`, depois de `if (this.boss && !this.boss.isDead && this.boss.damage(12)) this.killBoss();`:

```ts
    if (this.golfinho?.vulneravel && this.golfinho.damage(12)) this.matarGolfinho();
```

(j) Métodos novos, logo antes de `/**` do `bulletAbsorvedByBoss`:

```ts
  /**
   * O GOLFINHO entra (evento `miniboss` de kind `golfinho`). O sorteio de A e B é daqui, não do
   * roteiro: *"para o jogador ter a surpresa de estar na segunda run e se deparar com um ataque em
   * lugar diferente"*. A sonda passa o `sentido` para testar os dois.
   */
  private spawnGolfinho(sentido?: SentidoGolfinho, seguraEm = Infinity): void {
    // Arte entra asset por asset: sem a folha, a câmara segue sem ele — e sem arena presa.
    if (!this.textures.exists('golfinhoNado')) return;
    this.encerrarGolfinho();

    const g = new Golfinho(this, this.enemies, this.moldura, sentido ?? (Math.random() < 0.5 ? 'sobe' : 'desce'));
    this.golfinho = g;
    this.golfinhoSeguraEm = seguraEm;

    // ⚠️ SPRITE PRIMEIRO: `overlap(sprite, grupo)` entrega (sprite, projétil) — ver `spawnBoss`.
    this.golfinhoColliders = [
      this.physics.add.overlap(g.sprite, this.ship, () => {
        if (g.vulneravel) this.damageShip();
      }),
      this.physics.add.overlap(g.sprite, this.weapons.bullets, (_g, b) =>
        this.bulletHitGolfinho(b as Phaser.Physics.Arcade.Sprite),
      ),
    ];
  }

  private bulletHitGolfinho(bullet: Phaser.Physics.Arcade.Sprite): void {
    if (!this.weapons.bullets.contains(bullet)) return;
    const g = this.golfinho;
    // No aviso ele é intocável: a bala ATRAVESSA (não é devolvida ao pool).
    if (!bullet.active || !g || !g.vulneravel) return;

    this.weapons.release(bullet);
    // A fagulha sai mesmo no PISO: o jogador vê que acertou, e só a barra para.
    this.fx.hit(bullet.x, bullet.y);
    if (g.damage(bullet.getData('damage') as number)) this.matarGolfinho();
  }

  /** A morte: explosão grande, 500 pontos, SEM hitstop (a pausa dramática é dos chefões). */
  private matarGolfinho(): void {
    const g = this.golfinho;
    if (!g) return;
    this.fx.explodeBig(g.sprite.x, g.sprite.y, 0.8);
    this.score += Golfinho.SCORE;
    this.encerrarGolfinho();
  }

  /** Tira o golfinho de cena por QUALQUER caminho, e solta a arena junto. */
  private encerrarGolfinho(): void {
    for (const c of this.golfinhoColliders) c.destroy();
    this.golfinhoColliders = [];
    this.golfinho?.destroy();
    this.golfinho = null;
    this.golfinhoSeguraEm = Infinity;
  }
```

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: sem erro.

- [ ] **Step 7: Rodar a sonda e ver passar**

Run: `node scripts/probe-f4-golfinho.mjs`
Expected: `✔ O GOLFINHO ESTÁ DE PÉ`.

- [ ] **Step 8: ABRIR as quatro capturas**

`probe-f4-golfinho-aviso.png`, `-x.png`, `-duelo.png`, `-t50.png`. Conferir: o golfinho em escala 1 e girado no aviso; UMA bala por tiro no X (nenhuma desenhada à frente do focinho); a barra curta no topo; no duelo, só ele e a nave; em t≈53, as mesas de volta.

- [ ] **Step 9: Commit**

```bash
git add src/entities/Golfinho.ts src/systems/StageDirector.ts src/scenes/GameScene.ts scripts/probe-f4-golfinho.mjs
git commit -m "feat(fase4): o golfinho — aviso, X e duelo, e a fase segura em t=49,5"
```

---

### Task 3: As sondas antigas atravessam a arena

**Files:**
- Modify: `scripts/probe-f4-visual.mjs:73-79` (`pinturaEm`)
- Modify: `scripts/probe-f4-moldura.mjs:190-220` (a trava), `:296-310` (`espessuraEm`), `:517-545` (a porta)

- [ ] **Step 1: Rodar as duas e ver a `f4-visual` falhar presa**

Run: `node scripts/probe-f4-visual.mjs`
Expected: FAIL em `t=70s: TROCOU para o duto` (o relógio travado em 49,5).

- [ ] **Step 2: `probe-f4-visual` — o ajudante**

No `pinturaEm`, depois de `s.invulnerableUntil = Number.MAX_SAFE_INTEGER;`:

```js
      // ⚠️ A ARENA DO GOLFINHO (t=40–49,5) SEGURA O RELÓGIO enquanto ele vive, e esta sonda não
      // sabe matá-lo. Ela testa o CENÁRIO; quem testa o golfinho é a probe-f4-golfinho.
      if (s.golfinho) s.matarGolfinho();
```

- [ ] **Step 3: `probe-f4-moldura` — o ajudante em `espessuraEm` e na busca da porta**

Em `espessuraEm`, depois de `s.invulnerableUntil = Number.MAX_SAFE_INTEGER;`, e na busca da porta, depois de `s.lives = 99; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;`:

```js
      if (s.golfinho) s.matarGolfinho(); // a arena segura o relógio; esta sonda mede a MOLDURA
```

- [ ] **Step 4: `probe-f4-moldura` — a trava mede até depois da arena**

Substituir o laço da trava (`let pior = Infinity;` até o `console.log('trava ...`) por:

```js
// ⚠️ ESPERA POR ESTADO E ATRAVESSA A ARENA. Até 11/09 eram 60 leituras fixas; com o corredor
// parando em t=38,5 (a arena do golfinho) e voltando em t=50, leituras cegas cairiam quase todas
// fora da janela de corredor. O laço segue até ter amostras dos DOIS lados da arena e para em
// t=54,5 — antes de a parede engrossar em t=55, que o assert de espessura logo abaixo lê como 16.
let pior = Infinity;
let amostras = 0;
for (let i = 0; i < 600; i++) {
  await blindar();
  const f = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s || !s.moldura) return null;
    if (s.golfinho) s.matarGolfinho(); // a arena segura o relógio; esta sonda mede a MOLDURA
    const t = s.elapsed ?? 0;
    if (s.corredorRate <= 0) return { t, min: null };
    let min = Infinity;
    for (let x = 0; x <= 384; x += 10) {
      const p = s.moldura.placaEm(x);
      if (p.gap <= 0) continue; // sem corredor nesta placa, não há o que proteger
      const meio = p.gap / 2;
      min = Math.min(min, p.superficieChao - (p.vaoY + meio), (p.vaoY - meio) - p.superficieTeto);
    }
    return { t, min: min === Infinity ? null : min };
  });
  if (f && f.min !== null) {
    pior = Math.min(pior, f.min);
    amostras++;
  }
  if (f && f.t >= 54 && amostras >= 10) break;
  await page.waitForTimeout(250);
}
console.log('trava    ', JSON.stringify({ folgaMinima: pior, amostras }));
```

(O `ok(amostras >= 10 && pior >= 8, ...)` logo abaixo continua igual.)

> **Desvio registrado na execução (11/09):** em t≈54 havia UM par de mesas na tela, não dois — o
> cronômetro do corredor fica congelado no meio da contagem quando ele para em t=38,5, e ao voltar
> em t=50 termina essa contagem antes do primeiro par. O bloco da MESA passou a esperar por estado
> até ter dois pares (`lerMesas` em laço), e a leitura `e50` subiu para ANTES dele, ainda na margem.

- [ ] **Step 5: Atualizar o comentário dos instantes da espessura**

No bloco `// ⚠️ ESTES INSTANTES SÃO AMOSTRADOS DEPOIS DO FIM DE CADA RAMPA`, trocar a linha `//   t=50 → 16 (a margem, estável desde t=1)   t=60 → 32 (rampa fecha em ~57)` por:

```js
//   t≈54 → 16 (a margem; a sonda chega aqui depois da trava, que para em 54)   t=60 → 32 (rampa fecha em ~57)
```

- [ ] **Step 6: Rodar as duas, UMA POR VEZ**

Run: `node scripts/probe-f4-visual.mjs` → Expected: `✔ A FATIA 7 (BLOCO A) ESTÁ DE PÉ`
Run: `node scripts/probe-f4-moldura.mjs` → Expected: `✔ A MOLDURA ESTÁ DE PÉ`

- [ ] **Step 7: A regressão restante, UMA POR VEZ**

Run: `node scripts/probe-stage4.mjs` → Expected: `✔ FASE 4 DE PONTA A PONTA (com o NÚCLEO)` e `corredores` com todos os vãos entre 96 e 124.
Run: `node scripts/probe-stage3.mjs` → Expected: todos `✔` (a aranha continua nascendo pelo `miniboss` sem `kind`).
Run: `npm run build` → Expected: limpo.

- [ ] **Step 8: Commit**

```bash
git add scripts/probe-f4-visual.mjs scripts/probe-f4-moldura.mjs
git commit -m "test(fase4): as sondas da moldura e do cenario atravessam a arena do golfinho"
```

---

### Task 4: A porta de entrada para o teste jogado

**Files:**
- Modify: `docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md` §1.1 (a frase do `DENTRO`)
- Modify: `docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md` (o bloco de 11/09)

- [ ] **Step 1: Corrigir a spec**

Em §1.1, trocar o item que começa com `- A altura em cada parede sai da \`Moldura\`` por:

```markdown
- A altura em cada parede sai da `Moldura` (`superficieTetoEm`/`superficieChaoEm`), com o centro do
  corpo **4px para dentro** da faixa jogável: colado na parede, girado, metade do comprimento dele
  sobre a faixa. Como o aviso é intocável, a distância não cobra nada — ela é leitura.
```

- [ ] **Step 2: O que ver no teste jogado, no START**

No bloco `### 🆕 11/09`, acrescentar ao fim:

```markdown
>
> **O QUE VER NO TESTE JOGADO DO GOLFINHO** (`npm run dev` → `L` → ~40s de fase):
> 1. **O aviso lê como aviso?** Ele nada de uma parede à outra na coluna x=320 e para em B.
> 2. **O X é justo?** A cambalhota freia em x=280 e o leque sai de lá. Knobs: `Golfinho.VEL_X`
>    (190), `X_CAMBALHOTA` (280), `LEQUE_ABERTURA` (13°).
> 3. **O duelo dura quanto?** Knobs: `Golfinho.HP` (50) e `PISO` (25).
> 4. **A fase ficou longa?** O roteiro continua com 113s; o tempo real cresce o que o duelo durar.
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-11-fatia7-golfinho-miniboss-design.md docs/superpowers/plans/2026-09-08-fatia7-moldura-START.md docs/superpowers/plans/2026-09-11-fatia7-golfinho.md
git commit -m "docs(fatia7): o golfinho esta de pe — o que ver no teste jogado"
```
