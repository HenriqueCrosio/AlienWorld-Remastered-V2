// A BOLA de energia da canhoneira do cinturão, em VOO — o que a folha de contato não mostra.
//
// O defeito que esta sonda existe para pegar: a animação nasceu com DERIVA (o desenho escorregava
// 5.6px para a esquerda ao longo do ciclo). Num projétil isso soma à velocidade e vira solavanco.
// Corrigido em disco por `scripts/centrar-anim.mjs`; aqui se confere o resultado EM JOGO.
//
// Ela recorta a MESMA janela da tela a cada passo, sempre centrada na posição REPORTADA da bola.
// Se o desenho estiver centrado, ele fica parado no meio dos recortes enquanto pulsa; se derivar,
// ele passeia dentro deles. É o teste que o número em disco não substitui.
//
// uso: node scripts/_probe-orb.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';
import sharp from 'sharp';

const URL = process.env.URL ?? 'http://localhost:5173/';
const JANELA = 46; // lado do recorte, em pixels de tela do jogo
const PASSOS = 8;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 2, handling: 'free' });
});
await page.waitForTimeout(800);

// O jogador fica parado e imortal: a canhoneira precisa de um alvo para MIRAR, e a sonda
// precisa que ninguém morra no meio da medição.
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 60;
      s.ship.y = 100;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

// A onda de canhoneira sai lá pelos t=56s. Empurrar o relógio na mão é mais rápido que esperar
// (e `skipTo` só anda para a frente — ver a sonda da canhoneira).
await page.evaluate(() => {
  window.__s.elapsed = 54;
  window.__s.director.skipTo(54);
});

/** A escala do canvas na página: o jogo é 768 de largura, o elemento pode estar maior. */
const escala = await page.evaluate(() => {
  const c = document.querySelector('canvas');
  return c.getBoundingClientRect().width / window.__game.scale.width;
});

const acharBola = () =>
  page.evaluate(() =>
    window.__s.enemies.enemyBullets
      .getChildren()
      // ⚠️ `texture.key` NÃO é 'bulletOrb' enquanto a animação toca: cada quadro é uma textura
      // própria ('bulletOrbAnim0'...'bulletOrbAnim6', ver `animFrames` no BootScene), e tocar a
      // animação troca a textura do sprite pela do quadro. Por isso o prefixo, não a igualdade.
      .filter((b) => b.active && b.texture.key.startsWith('bulletOrb'))
      .map((b) => ({
        x: b.x,
        y: b.y,
        w: +b.displayWidth.toFixed(1),
        h: +b.displayHeight.toFixed(1),
        quadro: b.anims?.currentFrame?.textureKey ?? '(estático)',
        tocando: !!b.anims?.isPlaying,
        // A HITBOX em pixels de TELA — é ela que o balanceamento sente, não a do canvas.
        corpo: b.body.isCircle
          ? `círculo ø${(b.body.radius * 2 * b.scaleX).toFixed(1)}`
          : `retângulo ${(b.body.width * b.scaleX).toFixed(1)}x${(b.body.height * b.scaleY).toFixed(1)}`,
      }))
      .at(0),
  );

let bola = null;
for (let i = 0; i < 150 && !bola; i++) {
  await page.waitForTimeout(150);
  bola = await acharBola();
}

if (!bola) {
  console.log('FALHOU: nenhuma bola no ar em ~22s — a guarda de textura caiu para o bolt2?');
  await page.screenshot({ path: 'probe-orb-falha.png' });
  await browser.close();
  process.exit(1);
}

console.log(
  `bola: ${bola.w}x${bola.h} em tela · hitbox ${bola.corpo} · animação ${bola.tocando ? 'TOCANDO' : 'PARADA'} · quadro ${bola.quadro}`,
);

// ─── A tira: N recortes seguidos, cada um centrado na posição reportada da bola ───
const recortes = [];
const vistos = new Set();
for (let i = 0; i < PASSOS; i++) {
  const b = await acharBola();
  if (!b) break;
  vistos.add(b.quadro);
  const png = await page.screenshot();
  const meta = await sharp(png).metadata();
  const left = Math.round(b.x * escala - (JANELA * escala) / 2);
  const top = Math.round(b.y * escala - (JANELA * escala) / 2);
  const lado = Math.round(JANELA * escala);
  if (left >= 0 && top >= 0 && left + lado <= meta.width && top + lado <= meta.height) {
    recortes.push(
      await sharp(png)
        .extract({ left, top, width: lado, height: lado })
        .resize(JANELA * 8, JANELA * 8, { kernel: 'nearest' })
        .toBuffer(),
    );
  }
  await page.waitForTimeout(70);
}

if (recortes.length) {
  const L = JANELA * 8;
  const GAP = 6;
  const camadas = recortes.map((buf, i) => ({ input: buf, left: i * (L + GAP), top: 0 }));
  // A MIRA no centro exato de cada recorte: é contra ela que se julga a deriva.
  for (let i = 0; i < recortes.length; i++) {
    camadas.push({
      input: Buffer.from(
        `<svg width="2" height="${L}"><rect width="2" height="${L}" fill="#00ff78" fill-opacity="0.8"/></svg>`,
      ),
      left: i * (L + GAP) + L / 2,
      top: 0,
    });
    camadas.push({
      input: Buffer.from(
        `<svg width="${L}" height="2"><rect width="${L}" height="2" fill="#00ff78" fill-opacity="0.8"/></svg>`,
      ),
      left: i * (L + GAP),
      top: L / 2,
    });
  }
  await sharp({
    create: {
      width: recortes.length * (L + GAP),
      height: L,
      channels: 4,
      background: { r: 14, g: 14, b: 20, alpha: 1 },
    },
  })
    .composite(camadas)
    .png()
    .toFile('probe-orb-tira.png');
  console.log(`tira: ${recortes.length} recortes em probe-orb-tira.png · quadros distintos vistos: ${vistos.size}`);
}

await page.screenshot({ path: 'probe-orb.png' });
await browser.close();
