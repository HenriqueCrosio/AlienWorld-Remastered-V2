// BLOCO I, etapa 3 (13/11) — the two fallbacks of the dawn menu, checked in the real game:
//   semhd    — without the HD layer (`?semhd`, dev): the scenery and the text live in the world, at 384×216;
//   reduzido — with `prefers-reduced-motion`: the result opens already in place, the key lands on the settled menu.
// For each: the dawn menu opens, then the end-of-campaign result (the dev rehearsal: nothing is recorded), then the key.
//   node scripts/_menu/_conferir-amanhecer.mjs <outDir>          (with `npm run dev` running)
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const OUT = process.argv[2];
fs.mkdirSync(OUT, { recursive: true });
let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

for (const caso of ['semhd', 'reduzido']) {
  const page = await browser.newPage({ viewport: { width: 1536, height: 864 } });
  const erros = [];
  page.on('pageerror', (e) => erros.push(String(e)));
  if (caso === 'reduzido') await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`http://localhost:5173/?menu=amanhecer${caso === 'semhd' ? '&semhd' : ''}`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__game?.scene.getScene('Menu')?.estado?.pronto, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  const cenario = () => page.evaluate(() => {
    const m = window.__game.scene.getScene('Menu');
    const c = m.cenario ?? window.__gameHD?.scene.getScene('MenuHD')?.cenario ?? null;
    return { qual: m.qual, temHD: !!window.__gameHD, efeitos: c?.efeitos ?? null, settled: m.settled, emResultado: m.emResultado, reduzido: m.estado.reduzido, resultado: m.diagnosticoResultado() };
  });
  const menu = await cenario();
  ok(menu.qual === 'amanhecer' && menu.efeitos?.length === 8, `${caso}: o menu do amanhecer abre com os 8 efeitos (${menu.efeitos?.length ?? 'sem cenário'})`);
  ok(caso === 'semhd' ? !menu.temHD : menu.temHD && menu.reduzido && menu.settled, caso === 'semhd' ? 'semhd: a camada HD não existe' : 'reduzido: o menu abre pousado');
  await page.screenshot({ path: path.join(OUT, `${caso}-menu.png`) });

  // the result (the rehearsal), then the key
  await page.evaluate(() => window.__game.scene.start('Menu', { resultado: { score: 21000, handling: 'diegetico', ensaio: true } }));
  await page.waitForFunction(() => { const m = window.__game.scene.getScene('Menu'); return m.emResultado && m.estado.pronto; }, null, { timeout: 60000 });
  await page.waitForTimeout(caso === 'reduzido' ? 1200 : 6500);
  const res = await cenario();
  const visiveis = res.resultado.filter((p) => p.alfa > 0.5).length;
  ok(res.emResultado && res.resultado.length >= 9 && visiveis >= res.resultado.length - 1, `${caso}: o resultado inteiro na tela (${visiveis}/${res.resultado.length} peças visíveis)`);
  ok(res.resultado.some((p) => p.texto === 'HENRIQUE CROSIO' || p.texto === 'Henrique Crosio'), `${caso}: a assinatura está lá`);
  ok(res.resultado.some((p) => p.texto === '21000'), `${caso}: os pontos chegaram ao valor`);
  await page.screenshot({ path: path.join(OUT, `${caso}-resultado.png`) });
  await page.keyboard.press('Space');
  await page.waitForTimeout(caso === 'reduzido' ? 1500 : 12000);
  const fim = await cenario();
  ok(!fim.emResultado && fim.settled && fim.resultado.length === 0, `${caso}: na tecla o resultado sai e o menu pousa`);
  await page.screenshot({ path: path.join(OUT, `${caso}-depois.png`) });
  ok(erros.length === 0, `${caso}: sem erro de página ${erros.join(' | ')}`);
  await page.close();
}
await browser.close();
console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo ok');
process.exitCode = falhas ? 1 : 0;
