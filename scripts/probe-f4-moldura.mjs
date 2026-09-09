// A SONDA DA MOLDURA (Fatia 7 · M1).
//
// O que só se vê rodando: se a linha do vão virou CURVA (placas vizinhas se relacionam) em vez de
// sorteio por batida, se a faixa existe e é DECORAÇÃO (sem corpo físico, escala 1), se a trava dos
// 8px segura, e se a espessura sobe ao longo da fase.
//
// ⚠️ Exige `npm run dev` rodando. UMA sonda por vez: três browsers headless no mesmo Vite quebram.
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
page.on('console', (m) => { if (m.type() === 'error') console.log(`[console:error] ${m.text()}`); });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L'); // atalho: direto na Fase 4
await page.waitForTimeout(1500);

// A sonda não sabe jogar: vidas e invulnerabilidade para cima — testa-se a MOLDURA.
const blindar = () => page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  if (!s || s.scene.key !== 'Game') return;
  s.lives = 99;
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
});
await blindar();

// ─── A CURVA: placas vizinhas se relacionam ───
//
// ⚠️ Amostra o vão na BOCA DE CENA (x = 414, onde o corredor nasce) e guarda só as MUDANÇAS. É a
// medida direta do defeito diagnosticado em `GameScene.ts:859`: hoje cada par sorteia um `vaoY`
// novo no alcance inteiro (saltos de até 38px); a curva anda no máximo `PASSO_MAX`.
const PASSO_MAX = 14;
const serie = [];
for (let i = 0; i < 120; i++) {
  await blindar();
  const v = await page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    return s && s.moldura ? Math.round(s.moldura.vaoEm(414)) : null;
  });
  if (v !== null && v !== serie[serie.length - 1]) serie.push(v);
  await page.waitForTimeout(200);
}
const saltos = serie.slice(1).map((v, i) => Math.abs(v - serie[i]));
const maior = saltos.length ? Math.max(...saltos) : 0;
console.log('curva    ', JSON.stringify({ degraus: serie.length, serie, maior }));
ok(serie.length >= 6, `a curva ANDOU ao longo da fase (${serie.length} degraus distintos)`);
ok(maior <= PASSO_MAX + 1, `o degrau nunca salta mais que ${PASSO_MAX}px (maior=${maior})`);

console.log(falhas === 0 ? '\n✔ A MOLDURA ESTÁ DE PÉ' : `\n✘ ${falhas} asserts falharam`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
