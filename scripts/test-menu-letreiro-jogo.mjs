// O LETREIRO NO JOGO: as letras que o jogo assa (src/fonte.ts) são exatamente as do gabarito, e o neon vira textura com
// um quadro por letra. Uso: node scripts/test-menu-letreiro-jogo.mjs (com `npm run dev` rodando)
import fs from 'node:fs';
import { chromium } from 'playwright';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const gabarito = JSON.parse(fs.readFileSync('scripts/fixtures/menu/glifos-alien-world.json', 'utf8'));
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene.isActive('Menu'), null, { timeout: 30000 });
const r = await page.evaluate(async () => {
  // A MESMA cópia do módulo que o jogo usa: depois de uma edição o Vite o serve com `?t=…`, e um `import` sem a
  // marca abriria outra cópia, sem a fonte assada.
  const url = performance.getEntriesByType('resource').map((e) => e.name).find((n) => n.includes('/src/fonte.ts')) ?? '/src/fonte.ts';
  const { glifosDaFonte } = await import(url);
  const { gerarLetreiro } = await import('/src/menu/letreiro.ts');
  const cena = window.__game.scene.getScene('Menu');
  const L4 = gerarLetreiro(cena, 4);
  const L5 = gerarLetreiro(cena, 5);
  const quadros = (L) => cena.textures.get(L.chaves.olhos).getFrameNames().filter((n) => n.startsWith('L')).length;
  return {
    g: glifosDaFonte('ALIEN WORLD'),
    L4: { w: L4.w, h: L4.h, n: L4.letras.length, quadros: quadros(L4), chaves: L4.chaves },
    L5: { w: L5.w, h: L5.h },
  };
});
await browser.close();

conferir(JSON.stringify(r.g) === JSON.stringify(gabarito), 'as letras assadas pelo jogo são as do gabarito', r.g);
conferir(r.L4.w === 244 && r.L4.h === 32, `s = 4: 244×32 (${r.L4.w}×${r.L4.h})`, r.L4);
conferir(r.L4.n === 10 && r.L4.quadros === 10, 'dez letras, um quadro cada', r.L4);
conferir(r.L4.chaves.aceso === 'letreiro-aceso-4', 'as chaves levam a escala', r.L4.chaves);
conferir(r.L5.w === 58 * 5 + 12, `s = 5: o grão maior (${r.L5.w})`, r.L5);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
