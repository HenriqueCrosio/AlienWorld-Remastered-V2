// AS PEÇAS RESPIRANDO, NO JOGO. Congela o mundo e fotografa a MESMA peça em quatro momentos da
// batida — é a única forma de julgar uma animação de FUNDO, que nunca aparece inteira num print.
//
// ⚠️ O MUNDO É CONGELADO, A ANIMAÇÃO NÃO. Sem congelar, a peça sai da tela entre um quadro e o
// outro e a folha compara peças diferentes; com o `worldSpeed` em zero e as anims tocando, os
// quatro retratos são do mesmo objeto.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_ver-respiro.mjs
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(6000);

// Empurra o mundo até um coração estar bem no meio da tela, depois trava tudo.
await page.evaluate(async () => {
  const s = window.__game.scene.getScenes(true)[0];
  s.lives = 999; s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  const alvo = () => s.children.list.find((o) => o.texture?.key === 'orgaoAnimSheet');
  for (let i = 0; i < 400 && !(alvo() && alvo().x > 120 && alvo().x < 260); i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  s.propRate = 0; s.hazardRate = 0; s.corredorRate = 0;
  s.enemies?.clear?.(true, true);
  s.scene.scene.physics.world.pause();
  s.parallax.update = () => {};      // o mundo para
  s.update = () => {};               // e o roteiro junto
});

const tiros = [];
for (let i = 0; i < 4; i++) {
  const q = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const o = s.children.list.find((x) => x.texture?.key === 'orgaoAnimSheet');
    const m = s.children.list.find((x) => x.texture?.key === 'maquinarioAnimSheet');
    return { orgao: o?.anims?.currentFrame?.index, maq: m?.anims?.currentFrame?.index };
  });
  console.log(`retrato ${i}: coração q${q.orgao}   maquinário q${q.maq}`);
  tiros.push(await page.screenshot());
  await page.waitForTimeout(420);
}
await browser.close();

const PAD = 8;
await sharp({ create: { width: 768 + PAD * 2, height: tiros.length * (432 + PAD) + PAD,
  channels: 4, background: { r: 24, g: 24, b: 28, alpha: 1 } } })
  .composite(tiros.map((b, i) => ({ input: b, left: PAD, top: PAD + i * (432 + PAD) })))
  .png().toFile('scripts/_f4/_folha-respiro.png');
console.log('\nscripts/_f4/_folha-respiro.png');
