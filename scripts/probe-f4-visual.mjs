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

// ─── O INTERIOR: a pintura entrou e o hangar SUMIU ───
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

const interior = await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  const imgs = s.children.list.filter((o) => o.type === 'Image');
  const chaves = imgs.map((o) => o.texture?.key).filter(Boolean);
  return {
    modo: s.parallax?.mode,
    usamHangar: chaves.filter((k) => k === 'hangar').length,
    pintura: chaves.filter((k) => String(k).startsWith('paintBgF4')).length,
    escalas: [
      ...new Set(
        imgs
          .filter((o) => String(o.texture?.key).startsWith('paintBgF4'))
          .map((o) => o.scaleX),
      ),
    ],
  };
});
console.log('interior ', JSON.stringify(interior));
ok(interior.modo === 'interior', `o fundo é o modo interior (${interior.modo})`);
ok(interior.usamHangar === 0, `o hangar SUMIU do interior (${interior.usamHangar} imagens usam)`);
ok(interior.pintura === 2, `a pintura entrou com as DUAS cópias (${interior.pintura})`);
ok(
  interior.escalas.length === 1 && interior.escalas[0] === 1,
  `a pintura é desenhada em escala 1 (${JSON.stringify(interior.escalas)})`,
);
console.log(falhas === 0 ? '\n✔ A FATIA 7 (BLOCO A) ESTÁ DE PÉ' : `\n✘ ${falhas} FALHA(S)`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
