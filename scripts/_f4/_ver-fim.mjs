// O FIM DA MORTE EM JOGO, no CHÃO (rodada 7) — fotos da sequência e, em cada uma, a ORDEM DAS CAMADAS que
// estão na faixa da poça. É a prova do que fica na frente de quem (19/09: *"bom verificar se afunda atrás
// da lava, afundar na frente dá impressão de estar caindo para outro local"*).
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-fim.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'docs/superpowers/folhas/2026-09-19/fim-em-jogo.png';
const Z = 2;

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
  s.ship.setPosition(60, 60);
  s.ship.body.reset(60, 60);
  return true;
}, null, { timeout: 60000, polling: 100 });

// Troca para o predador e mata-o NO CHÃO.
await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss.damage(999));
await page.waitForFunction(() => window.__game.scene.getScenes(true)[0].boss.predador?.estado === 'chao', null, { timeout: 60000, polling: 50 });
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (s.boss && !s.boss.isDead && s.boss.damage(999)) s.killBoss();
});

// ⚠️ O relógio da sonda MENTE: cada screenshot custa 100–300ms, então `waitForTimeout(alvo - acumulado)` acumula
// atraso. O tempo e a geometria saem do JOGO.
const t0 = await page.evaluate(() => window.__game.loop.time);
const tiras = [];
const foto = async () => {
  const geo = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const corpo = s.children.list.find((o) => o.type === 'Image' && o.texture?.key === 'predadorMorteSheet');
    // ⚠️ Pelo NOME: o cenário também é `TileSprite`, e o do Phaser troca a `texture` por um canvas de UUID.
    const poca = s.children.list.find((o) => o.name === 'pocaFim');
    return {
      t: Math.round(window.__game.loop.time),
      // ⚠️ `getBounds` devolve o QUADRO de 256², quase todo transparente. A arte do último quadro da morte
      // começa em y=178 — o topo VISÍVEL do corpo é esse, e é ele que a lava tem de cobrir.
      corpoY: corpo ? Math.round(corpo.getBounds().top + 178 * corpo.scaleY) : null,
      corpoBase: corpo ? Math.round(corpo.getBounds().bottom) : null,
      pocaTopo: poca ? Math.round(poca.y - poca.height) : null,
    };
  });
  const ms = geo.t - t0;
  const camadas = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    // Só o que cruza a faixa de baixo da tela (a poça), na ordem em que é desenhado.
    return s.children.list
      .filter((o) => o.visible && o.alpha > 0.02 && typeof o.depth === 'number')
      .filter((o) => {
        const b = o.getBounds?.();
        return b ? b.bottom > 170 && b.top < 216 && b.width > 8 : false;
      })
      .map((o) => `${o.type}${o.texture?.key ? `:${o.texture.key}` : ''}@${o.depth}`);
  });
  const cobre = geo.corpoY != null && geo.pocaTopo != null ? (geo.pocaTopo <= geo.corpoY ? 'CORPO COBERTO' : `corpo ${geo.corpoY - geo.pocaTopo}px acima da lava`) : '';
  console.log(`+${ms}ms`.padEnd(9), `topo do corpo=${geo.corpoY} base=${geo.corpoBase} topo da lava=${geo.pocaTopo}  ${cobre}`);
  console.log('  camadas:', camadas.join('  '));
  const png = await page.screenshot();
  tiras.push(await sharp(png)
    .extract({ left: 0, top: 120 * Z, width: 384 * Z, height: 96 * Z })
    .composite([{ input: Buffer.from(`<svg width="${384 * Z}" height="${96 * Z}"><text x="6" y="${96 * Z - 8}" fill="#ffd166" font-size="18" font-family="monospace" stroke="#000" stroke-width="4" paint-order="stroke">+${ms}ms</text></svg>`) }])
    .png().toBuffer());
};

for (let i = 0; i < 19; i++) {
  await foto();
  await page.waitForTimeout(240);
}
await browser.close();

const COLS = 2, PAD = 6, W = 384 * Z, H = 96 * Z;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + linhas * (H + PAD), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: PAD + (i % COLS) * (W + PAD), top: PAD + Math.floor(i / COLS) * (H + PAD) })))
  .png().toFile(saida);
console.log(saida, `${tiras.length} fotos`);
