// FATIA 7 · A FASE 4 — a sonda do passe visual do interior.
//
// O que só se vê rodando: se as quatro pinturas entraram na resolução do jogo, se o hangar
// SUMIU do modo interior, e se o cenário TROCA nas batidas que o roteiro manda.
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

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);

// ─── As quatro pinturas, na resolução EXATA do jogo ───
const pinturas = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  return ['paintBgF4a', 'paintBgF4b', 'paintBgF4c', 'paintBgF4d'].map((k) => {
    if (!s.textures.exists(k)) return { k, existe: false };
    const img = s.textures.get(k).getSourceImage();
    return { k, existe: true, w: img.width, h: img.height };
  });
});
console.log('pinturas ', JSON.stringify(pinturas));
for (const p of pinturas) {
  ok(p.existe, `${p.k} existe`);
  ok(p.existe && p.w === 384 && p.h === 216, `${p.k} está em 384×216 (${p.w}×${p.h})`);
}

console.log(falhas === 0 ? '\n✔ A FATIA 7 (BLOCO A) ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
