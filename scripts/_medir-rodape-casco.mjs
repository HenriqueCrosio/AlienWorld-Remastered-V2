// MEDIÇÃO PONTUAL (revisão da Fatia 5): a faixa do casco chega ao rodapé da tela?
// A arte é 72x72 mas o conteúdo OPACO dela para na linha 58-64 do quadro — com origem na base
// em GAME_HEIGHT+6, isso pode deixar uma tira transparente no fundo da tela.
import { chromium } from 'playwright';
import sharp from 'sharp';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
await page.setViewportSize({ width: 384, height: 216 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('m');
await page.waitForTimeout(4000);

// Revela o casco JÁ (sem esperar t=42) e congela a cena para medir um quadro limpo.
const geo = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  s.lives = 9;
  s.parallax.setNebulaDensity(0, 50);
  await new Promise((r) => setTimeout(r, 900));
  const p = s.parallax;
  const casco = p.layers.filter((l) => l.casco);
  return casco.map((l) => ({
    key: l.key,
    baseY: l.baseY,
    n: l.sprites.length,
    alpha: l.sprites[0]?.alpha,
    // caixa de cada sprite na TELA
    caixas: l.sprites.slice(0, 4).map((sp) => ({
      tex: sp.texture.key,
      topo: Math.round(sp.y - sp.displayHeight),
      base: Math.round(sp.y),
      h: Math.round(sp.displayHeight),
    })),
  }));
});
console.log(JSON.stringify(geo, null, 1));

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.cameras.main.resetFX();
  s.scene.pause();
});
await page.waitForTimeout(300);
await page.screenshot({ path: 'scripts/_f3/rodape-casco.png' });
await browser.close();

// Onde está a última linha ESCURA-SÓLIDA do casco? Varre as linhas de baixo para cima e mede
// quanto da linha é quase-preta (o fundo do espaço) vs. tem cor do casco.
const { data, info } = await sharp('scripts/_f3/rodape-casco.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
console.log('\nlinha | luminância média da linha (últimas 30 linhas da tela)');
for (let y = info.height - 30; y < info.height; y++) {
  let lum = 0;
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    lum += (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255;
  }
  console.log(String(y).padStart(4), (lum / W).toFixed(4));
}
