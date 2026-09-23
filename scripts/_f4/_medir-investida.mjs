// A JANELA DA INVESTIDA (20/09) — a prova de que a mira TRAVA antes do arranque, e de quanto tempo de
// desvio isso dá. A captura mostra a coreografia; esta sonda mostra que a mecânica dele existe.
//
// O discriminador: a nave espera em y=170 (embaixo), que com o guardião em y≈104 dá vy = +70 (o clamp).
// Assim que a mira trava, a sonda TELEPORTA a nave para y=40 (o canto de cima), que daria vy = −70 se
// ele ainda estivesse lendo. Se o arranque sair com +70, a mira está cravada de verdade; se sair com
// −70, ela ainda segue a nave e a jogada dele — atrair para um lado e desviar — não existe.
//
//   npm run dev  noutro terminal, depois  node scripts/_f4/_medir-investida.mjs
import { chromium } from 'playwright';

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 768, height: 432 } });
page.on('pageerror', (e) => console.log(`[ERRO] ${e.message}`));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('L');
await page.waitForTimeout(900);
await page.keyboard.press('G');

const ISCA_Y = 170;
const FUGA_Y = 40;

await page.waitForFunction(
  (y) => {
    const s = window.__game.scene.getScenes(true)[0];
    if (!s.boss || s.boss.entering) return false;
    s.lives = 999;
    s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
    s.ship.setPosition(70, y);
    s.ship.body.reset(70, y);
    return true;
  },
  ISCA_Y,
  { timeout: 60000, polling: 100 },
);

const ok = await page
  .waitForFunction(() => window.__game.scene.getScenes(true)[0].boss?.acao === 'telegrafo', null, { timeout: 90000, polling: 16 })
  .then(() => true, () => false);
if (!ok) {
  console.log('não peguei o telégrafo');
  await browser.close();
  process.exit(1);
}

// ⚠️ O relógio é do JOGO e a nave é movida DENTRO da página: fazer isso daqui custaria um round-trip de
// 100–300ms por passo, e a janela inteira tem 0,44s. O laço abaixo roda no navegador, num rAF.
const r = await page.evaluate(
  ({ fuga }) =>
    new Promise((resolve) => {
      const s = window.__game.scene.getScenes(true)[0];
      const b = s.boss;
      const t0 = performance.now();
      let tTrava = null;
      let yNaTrava = null;
      let vyTrava = null;
      const passo = () => {
        if (b.vyTravado !== null && tTrava === null) {
          tTrava = performance.now();
          yNaTrava = Math.round(s.ship.y);
          vyTrava = Math.round(b.vyTravado);
          // A FUGA: no quadro seguinte à trava, para o canto oposto.
          s.ship.setPosition(70, fuga);
          s.ship.body.reset(70, fuga);
        }
        if (b.acao === 'investe') {
          resolve({
            travou: tTrava !== null,
            yNaTrava,
            vyTrava,
            yNoArranque: Math.round(s.ship.y),
            vyNoArranque: Math.round(b.sprite.body.velocity.y),
            bossY: Math.round(b.sprite.y),
            janelaMs: tTrava === null ? null : Math.round(performance.now() - tTrava),
            cargaMs: Math.round(performance.now() - t0),
          });
          return;
        }
        requestAnimationFrame(passo);
      };
      passo();
    }),
  { fuga: FUGA_Y },
);

await browser.close();

const VEL_NAVE = 110; // FreeController.SPEED
const travessiaMs = Math.round(((298 - 70) / 300) * 1000);
console.log(JSON.stringify(r, null, 2));

let falhas = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘'} ${msg}`);
  if (!cond) falhas++;
};

check(r.travou, 'a mira TRAVA antes do arranque (vyTravado deixa de ser null durante o telégrafo)');
check(
  r.vyNoArranque === r.vyTrava,
  `o arranque usa a mira da TRAVA e não a posição nova da nave (vy ${r.vyNoArranque} = travado ${r.vyTrava}; a nave fugiu de y=${r.yNaTrava} para y=${r.yNoArranque})`,
);
check(
  r.vyNoArranque > 0,
  `e ele vai para BAIXO, onde a nave estava na isca — não para cima, onde ela está agora (vy ${r.vyNoArranque})`,
);
check(
  r.janelaMs >= 350,
  `a janela de fuga ANTES do arranque dá ${r.janelaMs}ms (~${Math.round((r.janelaMs / 1000) * VEL_NAVE)}px a ${VEL_NAVE}px/s)`,
);

const totalMs = r.janelaMs + travessiaMs;
console.log(
  `\ntempo de desvio TOTAL: ${r.janelaMs}ms de janela + ${travessiaMs}ms de travessia = ${totalMs}ms ` +
    `(~${Math.round((totalMs / 1000) * VEL_NAVE)}px, num vão de 160px com um corpo de 133px)`,
);

console.log(falhas === 0 ? '\n✔ A MIRA TRAVA E A JANELA EXISTE' : `\n✘ ${falhas} falha(s)`);
process.exit(falhas === 0 ? 0 : 1);
