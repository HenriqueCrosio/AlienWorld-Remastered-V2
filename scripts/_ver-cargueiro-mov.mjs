// O CARGUEIRO EM MOVIMENTO — o que o screenshot congelado nunca mostrou.
//
// `_probe-cargueiro.mjs` responde uma pergunta de ENGENHARIA (o drone nasce dentro da baia?) e
// para isso um quadro parado basta. Este aqui responde uma pergunta de ARTE, e essa não se
// responde parada: a baia cicla vermelho → oliva → amarelo em 13 quadros a 6fps (BootScene.ts),
// e o ciclo inteiro leva ~2,17s. Um PNG pega um instante desse ciclo e mente sobre os outros doze.
//
// Duas saídas, porque são duas perguntas diferentes:
//   -tela  câmera parada, o cargueiro atravessando: a leitura em jogo, do tamanho que ele tem.
//   -baia  câmera COLADA nele, ampliada: o ciclo da baia e os drones saindo, que é o que ele
//          tem de melhor e o que some no tamanho real.
//
// A amostragem é pelo QUADRO REAL da animação (`anims.currentFrame.index`), não pelo relógio:
// screenshot de Playwright leva o tempo que leva, e um laço com `waitForTimeout` fixo produziria
// um GIF com quadros repetidos e outros pulados. Medindo o índice, a folha de contato mostra os
// 13 quadros distintos uma vez cada — que é a única forma de ver o ciclo inteiro sem salto de cor.
//
// uso: node scripts/_ver-cargueiro-mov.mjs [prefixo]   (padrão: scripts/_cargueiro-mov)
import { chromium } from 'playwright';
import sharp from 'sharp';

const PREFIXO = process.argv[2] ?? 'scripts/_cargueiro-mov';
const DURACAO = 5000; // ~2,3 ciclos de baia
const LADO = 100; // recorte nativo em volta do cargueiro
const ZOOM = 4;
const NATIVO = 384;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V'); // fase 2
await page.waitForTimeout(1500);

// Um só, entrando pela direita. `speed` 20 px/s: de x=330 ele leva ~16s para cruzar, folga de
// sobra para os 5s de captura sem que ele saia da tela no meio.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.enemies.spawn('cargueiro', 110, 330);
});

const canvas = page.locator('canvas').first();
const quadros = [];
const t0 = Date.now();

while (Date.now() - t0 < DURACAO) {
  const png = await canvas.screenshot();
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const vivos = (s.enemies.enemies.getChildren() ?? []).filter((o) => o.active);
    const c = vivos.find((o) => o.getData('kind') === 'cargueiro');
    if (!c) return null;
    return {
      x: Number(c.x.toFixed(1)),
      y: Number(c.y.toFixed(1)),
      indice: c.anims.currentFrame?.index ?? null,
      textura: c.texture.key,
      emTela: `${c.displayWidth.toFixed(1)}x${c.displayHeight.toFixed(1)}`,
      drones: vivos.filter((o) => o.getData('kind') === 'drone').length,
    };
  });
  if (!info) break;
  quadros.push({ png, t: Date.now() - t0, ...info });
}

if (quadros.length < 4) {
  console.log(`só ${quadros.length} quadro(s) — o cargueiro não durou. Nada a montar.`);
  await browser.close();
  process.exit(1);
}

const meta = await sharp(quadros[0].png).metadata();
const escala = meta.width / NATIVO;
const indices = [...new Set(quadros.map((q) => q.indice))].sort((a, b) => a - b);

console.log(`${quadros.length} quadros em ${quadros.at(-1).t}ms (canvas ${meta.width}x${meta.height}, escala ${escala}×)`);
console.log(`cargueiro: ${quadros[0].textura}, ${quadros[0].emTela} em tela`);
console.log(`x: ${quadros[0].x} → ${quadros.at(-1).x} | drones no ar: ${Math.max(...quadros.map((q) => q.drones))}`);
console.log(`quadros de animação distintos vistos: ${indices.length} de 13 → [${indices.join(', ')}]`);

/** Recorte ampliado colado no cargueiro. */
async function colado(q) {
  const left = Math.max(0, Math.min(meta.width - LADO * escala, Math.round((q.x - LADO / 2) * escala)));
  const top = Math.max(0, Math.min(meta.height - LADO * escala, Math.round((q.y - LADO / 2) * escala)));
  const w = Math.round(LADO * escala);
  const h = Math.round(LADO * escala);
  return sharp(q.png)
    .extract({ left, top, width: w, height: h })
    .resize(LADO * ZOOM, LADO * ZOOM, { kernel: 'nearest' })
    .toBuffer();
}

/**
 * GIF animado a partir de N quadros: sharp monta animação empilhando as páginas na VERTICAL e
 * declarando a altura de página.
 *
 * `pageHeight` vai DENTRO de `raw`. No topo das opções ele é aceito e ignorado em silêncio — o
 * arquivo sai como uma tira estática de 50 andares, com extensão .gif e tudo. Por isso a
 * conferência de `pages` abaixo não é paranoia: é a única coisa que distingue os dois casos.
 */
async function gif(bufs, atrasos, saida) {
  const m = await sharp(bufs[0]).metadata();
  const cruas = await Promise.all(
    bufs.map((b) => sharp(b).ensureAlpha().raw().toBuffer()),
  );
  await sharp(Buffer.concat(cruas), {
    raw: { width: m.width, height: m.height * bufs.length, channels: 4, pageHeight: m.height },
  })
    .gif({ loop: 0, delay: atrasos })
    .toFile(saida);
  const conf = await sharp(saida, { animated: true }).metadata();
  if ((conf.pages ?? 1) !== bufs.length) {
    throw new Error(`${saida}: saiu com ${conf.pages ?? 1} página(s), esperava ${bufs.length}`);
  }
  return `${saida} — ${bufs.length} quadros, ${m.width}x${m.height}`;
}

const atrasos = quadros.map((q, i) => Math.max(20, Math.round((quadros[i + 1]?.t ?? q.t + 80) - q.t)));

// GIF que falha não pode levar a folha de contato junto: ela é a saída que se julga parada, e
// custou os mesmos 5s de captura.
console.log('');
for (const [bufs, saida] of [
  [quadros.map((q) => q.png), `${PREFIXO}-tela.gif`],
  [await Promise.all(quadros.map(colado)), `${PREFIXO}-baia.gif`],
]) {
  try {
    console.log(await gif(bufs, atrasos, saida));
  } catch (e) {
    console.log(`FALHOU ${saida}: ${e.message}`);
  }
}

// Folha de contato: um quadro por índice de animação, na ordem do ciclo. É o que se olha parado
// para julgar cor a cor, e o que prova que os 13 fecham sem salto.
const ciclo = indices.map((i) => quadros.find((q) => q.indice === i));
const cols = Math.min(7, ciclo.length);
const linhas = Math.ceil(ciclo.length / cols);
const cel = LADO * ZOOM;
await sharp({
  create: {
    width: cel * cols,
    height: cel * linhas,
    channels: 4,
    background: { r: 12, g: 16, b: 32, alpha: 1 },
  },
})
  .composite(
    await Promise.all(
      ciclo.map(async (q, i) => ({
        input: await colado(q),
        left: (i % cols) * cel,
        top: Math.floor(i / cols) * cel,
      })),
    ),
  )
  .png()
  .toFile(`${PREFIXO}-ciclo.png`);
console.log(`${PREFIXO}-ciclo.png — ${ciclo.length} quadros do ciclo, ${cols}x${linhas}`);

await browser.close();
