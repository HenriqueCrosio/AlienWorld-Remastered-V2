// UM ARREMESSO DE LAVA, QUADRO A QUADRO EM JOGO — a prova de que a garra NÃO TROCA no meio do gesto
// (*"começa com a de trás e acaba com a da frente"*, 18/09) e de que a bola sai DA MÃO. Recorta o predador e o
// caminho da bola. Rotulado pelo QUADRO do clipe, nunca por ms: cada screenshot custa 100–300ms e contar mente.
//
//   npm run dev  noutro terminal, depois:
//   node scripts/_f4/_ver-arremesso.mjs [saida.png]            o pendurado (rodada 6)
//   ONDE=chao node scripts/_f4/_ver-arremesso.mjs [saida.png]  o do chão, tirado do core (rodada 7)
import { chromium } from 'playwright';
import sharp from 'sharp';

const ONDE = process.env.ONDE === 'chao' ? 'chao' : 'teto';
const saida = process.argv[2] ?? `docs/superpowers/folhas/2026-09-18/${ONDE}-lava-em-jogo.png`;
const Z = 2; // a tela é 384x216 desenhada em 768x432
// Em px de tela. Pendurado ele fica no alto; no chão, na faixa de baixo.
const REC = ONDE === 'teto' ? { x: 120, y: 0, w: 264, h: 200 } : { x: 100, y: 60, w: 284, h: 156 };

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
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
  s.ship.setPosition(90, 150);
  s.ship.body.reset(90, 150);
  return true;
}, null, { timeout: 60000, polling: 100 });

// Direto para a 2ª fase (é dela em diante que ele sobe no teto), sem breu.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'chao', null, { timeout: 60000, polling: 50 });
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.boss.damage(Math.ceil(s.boss.predador.hp - 180 * 0.6));
});

const esperar = async (fn, arg = null, timeout = 90000) => page.waitForFunction(fn, arg, { timeout, polling: 16 }).then(() => true, () => false);
const tiras = [];
const foto = async () => {
  // ⚠️ O rótulo sai do JOGO, não do relógio da sonda: cada screenshot custa 100–300ms, então contar ms aqui
  // mente. O que importa é o QUADRO do clipe — é nele que a garra troca (ou não).
  const rotulo = await page.evaluate(() => {
    const b = window.__game.scene.getScenes(true)[0].boss;
    const a = b.sprite.anims;
    const balas = b.scene.enemies.enemyBullets.getMatching('active', true).length;
    return `q${a.currentFrame?.index ?? '?'} · ${Math.round((a.getProgress?.() ?? 0) * 100)}%${balas ? ` · ${balas} bola(s)` : ''}`;
  });
  const png = await page.screenshot();
  const img = await sharp(png)
    .extract({ left: REC.x * Z, top: REC.y * Z, width: REC.w * Z, height: REC.h * Z })
    .composite([{ input: Buffer.from(`<svg width="${REC.w * Z}" height="${REC.h * Z}"><text x="6" y="${REC.h * Z - 8}" fill="#ffd166" font-size="18" font-family="monospace" stroke="#000" stroke-width="4" paint-order="stroke">${rotulo}</text></svg>`) }])
    .png().toBuffer();
  tiras.push(img);
  console.log(rotulo);
};

// Espera o arremesso do TETO começar e fotografa o gesto inteiro (TETO_LAVA_MS = 1100).
const ok = await esperar((onde) => {
  const p = window.__game.scene.getScenes(true)[0].boss.predador;
  return p?.estado === 'telegLava' && p.ancora.lado === onde;
}, ONDE);
if (!ok) { console.log(`não peguei o arremesso (${ONDE})`); await browser.close(); process.exit(1); }
for (let i = 0; i < 12; i++) {
  await foto();
  await page.waitForTimeout(20);
}
await browser.close();

const COLS = 4, PAD = 6, W = REC.w * Z, H = REC.h * Z;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + linhas * (H + PAD), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: PAD + (i % COLS) * (W + PAD), top: PAD + Math.floor(i / COLS) * (H + PAD) })))
  .png().toFile(saida);
console.log(saida, `${tiras.length} fotos`);
