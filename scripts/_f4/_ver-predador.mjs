// O PREDADOR JOGANDO (B3): a troca sangrenta e o surgimento quadro a quadro, e depois um momento de cada
// coisa da luta — carga, bote, lava, teto, a saída, e o breu no pulso baixo e no alto. As caixas: CORPO
// (verde, a casca que absorve e fere) e ALVO (ciano, o peito). A sonda força a vida para chegar às fases.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-predador.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'docs/superpowers/folhas/2026-09-16/predador-em-jogo.png';
const Z = 2;

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');

await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.ship.setPosition(90, 120);
  s.ship.body.reset(90, 120);
  return true;
}, null, { timeout: 60000, polling: 100 });

const tiras = [];
const foto = async (rotulo, caixas = true) => {
  const info = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    // Depois do estouro final a cena solta o chefão: o que sobra na tela é o CORPO (uma imagem solta).
    if (!b) return { estado: 'sem chefão (o corpo fica)', corpo: null, alvo: null };
    const p = b.predador;
    const corpo = b.sprite.body;
    const core = b.core.body;
    return {
      estado: p?.estado ?? b.forma,
      fase: p?.fase ?? 0,
      hp: p?.hp ?? b.hpGuardiao,
      breu: p?.breu ?? false,
      pulso: p ? +p.pulso.toFixed(2) : null,
      trava: b.armaTravada === true,
      corpo: corpo.enable ? { x: corpo.x, y: corpo.y, w: corpo.width, h: corpo.height } : null,
      alvo: core.enable ? { x: b.core.x - core.width / 2, y: b.core.y - core.height / 2, w: core.width, h: core.height } : null,
    };
  });
  console.log(rotulo.padEnd(24), JSON.stringify({ ...info, corpo: !!info.corpo, alvo: !!info.alvo }));
  let img = sharp(await page.screenshot());
  const rect = (c, cor) =>
    c ? `<rect x="${c.x * Z}" y="${c.y * Z}" width="${c.w * Z}" height="${c.h * Z}" fill="none" stroke="${cor}" stroke-width="2"/>` : '';
  const svg = `<svg width="768" height="432">${caixas ? rect(info.corpo, '#39ff88') + rect(info.alvo, '#33e6ff') : ''}
    <text x="8" y="424" fill="#fff" font-size="16" font-family="monospace" stroke="#000" stroke-width="3" paint-order="stroke">${rotulo} · ${info.estado}${info.trava ? ' · ARMA TRAVADA' : ''}</text></svg>`;
  img = img.composite([{ input: Buffer.from(svg) }]);
  tiras.push(await img.png().toBuffer());
};
const esperar = async (fn, arg, timeout = 20000) =>
  page.waitForFunction(fn, arg, { timeout, polling: 16 }).then(() => true, () => false);

// A TROCA, quadro a quadro.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
let t0 = 0;
for (const ms of [1100, 1600, 2300, 2900, 3250, 3550, 3900]) {
  await page.waitForTimeout(ms - t0);
  t0 = ms;
  await foto(`troca +${ms}ms`, ms > 3800);
}

// FASE 1: anda no lugar, carrega, cai de quatro, galopa, salta no golpe; e a lava.
await foto('fase 1 · andando no lugar');
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'carga', null, 30000)) {
  await page.waitForTimeout(400);
  await foto('fase 1 · carga (anda, o core acelera)');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.sprite.anims?.currentAnim?.key === 'predador-quatro', null)) {
  await page.waitForTimeout(250);
  await foto('fase 1 · cai de quatro');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'bote', null)) {
  await page.waitForTimeout(120);
  await foto('fase 1 · galope');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'slash', null)) {
  await page.waitForTimeout(300);
  await foto('fase 1 · golpe no alto');
  await page.waitForTimeout(300);
  await foto('fase 1 · 2º golpe, descendo');
}
if (await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.boss.predador?.estado === 'recupera' && s.enemies.enemyBullets.getChildren().some((o) => o.active && o.getData('lava'));
}, null, 40000)) {
  await page.waitForTimeout(250);
  await foto('fase 1 · lava no ar');
}

// FASE 2: a ronda.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const p = s.boss.predador;
  p.recuperando = false;
  s.boss.damage(Math.ceil(p.hp - 180 * 0.6));
});
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.sprite.anims?.currentAnim?.key === 'predador-agarra' && window.__game.scene.getScenes(true)[0].boss.sprite.anims.getProgress() > 0.45, null, 60000)) {
  await foto('fase 2 · pula e agarra o teto');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'teto', null, 30000)) {
  await page.waitForTimeout(400);
  await foto('fase 2 · pendurado por uma garra');
}
if (await esperar(() => {
  const p = window.__game.scene.getScenes(true)[0].boss.predador;
  return p?.estado === 'telegLava' && p.ancora.lado === 'teto';
}, null, 60000)) {
  await page.waitForTimeout(550);
  await foto('fase 2 · arremesso pendurado');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'aviso', null, 40000)) {
  await foto('fase 2 · aviso da reentrada');
}
// A VOLTA QUE ATACA (17/09): galopa até o meio, rasga o chão, o metal sobe em arco.
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'entrada', null, 20000)) {
  await page.waitForTimeout(250);
  await foto('fase 2 · volta galopando');
}
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'rasgo', null, 20000)) {
  await page.waitForTimeout(250);
  await foto('fase 2 · rasgo (prepara)');
  await page.waitForTimeout(300);
  await foto('fase 2 · rasgo (solta)');
  await page.waitForTimeout(350);
  await foto('fase 2 · metal no ar', false);
}

// FASE 3: o breu. ⚠️ O dano é recusado no aviso/fora (ele não está na tela): insiste até a vida baixar.
await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const p = s.boss.predador;
  if (p.fase === 3) return true;
  p.recuperando = false;
  s.boss.damage(Math.ceil(p.hp - 180 * 0.3));
  return p.fase === 3;
}, null, 20000);
if (await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.breu === true, null, 40000)) {
  await page.waitForTimeout(1600);
  if (await esperar(() => { const p = window.__game.scene.getScenes(true)[0].boss.predador; return p.pulso < 0.05 && ['chao', 'teto'].includes(p.estado); }, null)) await foto('breu · pulso baixo', false);
  if (await esperar(() => { const p = window.__game.scene.getScenes(true)[0].boss.predador; return p.pulso > 0.9 && ['chao', 'teto'].includes(p.estado); }, null)) await foto('breu · pulso alto', false);
  if (await esperar(() => { const p = window.__game.scene.getScenes(true)[0].boss.predador; return p.estado === 'carga' && p.pulso > 0.8; }, null, 30000)) await foto('breu · carga', false);
  if (await esperar(() => window.__game.scene.getScenes(true)[0].enemies.enemyBullets.getChildren().some((o) => o.active && o.getData('lava')), null, 40000)) {
    await page.waitForTimeout(350);
    await foto('breu · a lava brilha', false);
  }
}

// A MORTE — no TETO, para ver o corpo CAIR até a borda.
await esperar(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'teto', null, 60000);
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (s.boss && !s.boss.isDead && s.boss.damage(999)) s.killBoss();
});
let tm = 0;
for (const ms of [500, 1000, 1500, 1900, 2200, 2700, 3200, 3900, 4600]) {
  await page.waitForTimeout(ms - tm);
  tm = ms;
  await foto(`morte no teto +${ms}ms`, false);
}
await browser.close();

const COLS = 2, W = 768, H = 432, PAD = 8;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + linhas * (H + PAD), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: PAD + (i % COLS) * (W + PAD), top: PAD + Math.floor(i / COLS) * (H + PAD) })))
  .png()
  .toFile(saida);
console.log(saida, `${tiras.length} fotos`);
