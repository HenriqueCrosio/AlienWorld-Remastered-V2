// O RASTRO DO GLÓBULO E O AVISO DA INVESTIDA (20/09) — as duas mudanças pedidas depois do teste de 19/09.
//
// Duas tiras numa folha só:
//   1. a SALVA no ar, para ver o rastro (fumaça fria + brasa) nascer e sumir;
//   2. o TELÉGRAFO da investida, rotulado pelo `k` da carga E pelo `timeScale` da respiração — o aviso
//      dura 0,7s e cada screenshot custa 100–300ms, então aqui NÃO se fotografa por relógio de parede:
//      cada foto carrega o estado que o JOGO tinha no instante em que ela saiu.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-aviso.mjs [saida.png]
import { chromium } from 'playwright';
import sharp from 'sharp';

const saida = process.argv[2] ?? 'docs/superpowers/folhas/2026-09-20/aviso-e-rastro.png';
const Z = 2;

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');
// A nave fica PRESA em (70,110): as duas leituras precisam ser comparáveis entre rodadas, e uma nave
// que anda muda a mira da salva e o desvio da investida.
await page.waitForFunction(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s.boss || s.boss.entering) return false;
  s.lives = 999;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.ship.setPosition(70, 110);
  s.ship.body.reset(70, 110);
  return true;
}, null, { timeout: 60000, polling: 100 });

const tiras = [];
const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const b = s.boss;
    const glob = s.enemies.enemyBullets
      .getChildren()
      .filter((x) => x.active && x.texture.key === 'globuloGuardiao')
      .map((x) => ({ x: Math.round(x.x), y: Math.round(x.y) }));
    return {
      acao: b.acao,
      degrau: b.degrau,
      acaoT: Math.round((b.acaoT ?? 0) * 1000) / 1000,
      respiro: Math.round((b.sprite.anims.timeScale ?? 1) * 100) / 100,
      globulos: glob.length,
      // A PROVA de que a camada existe, e não só de que a foto ficou bonita: as partículas VIVAS de
      // cada emissor no instante do disparo. Rastro invisível numa foto escura é fácil de confundir
      // com rastro que não foi emitido.
      // ⚠️ `emitter.alive` é a LISTA de partículas, não o número: somar duas devolvia uma tripa de
      // `[object Object]` no rótulo. O número vem de `getAliveParticleCount()`.
      rastro: b.fumaca.getAliveParticleCount() + b.brasa.getAliveParticleCount(),
      cargaViva: b.carga.getAliveParticleCount(),
    };
  });

const foto = async (prefixo) => {
  const i = await estado();
  const k = i.acao === 'telegrafo' ? Math.max(0, Math.min(1, 1 - i.acaoT / 0.7)) : null;
  const rot =
    `${prefixo} · ${i.acao}` +
    (k !== null ? ` · carga ${Math.round(k * 100)}% (${i.cargaViva} vivas) · respiro ${i.respiro}x` : '') +
    (i.globulos ? ` · ${i.globulos} glóbulos · rastro ${i.rastro}` : '') +
    ` · degrau ${i.degrau}`;
  console.log(rot);
  const png = await page.screenshot();
  tiras.push(
    await sharp(png)
      .composite([
        {
          input: Buffer.from(
            `<svg width="${384 * Z}" height="${216 * Z}"><text x="8" y="${216 * Z - 10}" fill="#ffd166" font-size="17" font-family="monospace" stroke="#000" stroke-width="4" paint-order="stroke">${rot}</text></svg>`,
          ),
        },
      ])
      .png()
      .toBuffer(),
  );
};

const esperar = (fn, ms = 60000) =>
  page.waitForFunction(fn, null, { timeout: ms, polling: 16 }).then(() => true, () => false);

// ─── 1. A SALVA: o rastro nascendo, no meio do voo e apagando ───
const temSalva = await esperar(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return s.enemies.enemyBullets.getChildren().filter((x) => x.active && x.texture.key === 'globuloGuardiao').length >= 3;
});
if (!temSalva) {
  console.log('não peguei a salva');
  await browser.close();
  process.exit(1);
}
for (let i = 0; i < 6; i++) {
  await foto('RASTRO');
  await page.waitForTimeout(90);
}

// ─── 2. O TELÉGRAFO: o casco esfria, a respiração acelera, o anel fecha ───
// Sem `waitForTimeout` entre as fotos: 0,7s de aviso não comportam espera nenhuma.
const temAviso = await esperar(() => window.__game.scene.getScenes(true)[0].boss?.acao === 'telegrafo');
if (!temAviso) {
  console.log('não peguei o telégrafo');
  await browser.close();
  process.exit(1);
}
// Medido: cada foto sai em ~60ms, então 12 cobrem os 0,7s do aviso; as 4 últimas pegam o ESTALO
// (a coroa que o `glow` solta) e a investida já saindo — o aviso só se julga contra o que ele promete.
let depois = 0;
for (let i = 0; i < 16; i++) {
  await foto('AVISO');
  const acabou = await page.evaluate(() => window.__game.scene.getScenes(true)[0].boss?.acao !== 'telegrafo');
  if (acabou && ++depois >= 4) break;
}
await browser.close();

const COLS = 2,
  PAD = 6,
  W = 384 * Z,
  H = 216 * Z;
const linhas = Math.ceil(tiras.length / COLS);
await sharp({ create: { width: PAD + COLS * (W + PAD), height: PAD + linhas * (H + PAD), channels: 4, background: '#231c24' } })
  .composite(tiras.map((t, i) => ({ input: t, left: PAD + (i % COLS) * (W + PAD), top: PAD + Math.floor(i / COLS) * (H + PAD) })))
  .png()
  .toFile(saida);
console.log(saida, `${tiras.length} fotos`);
