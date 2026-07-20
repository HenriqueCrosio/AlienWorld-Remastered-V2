// Sonda do SISTEMA DE EXPLOSÕES ANIMADAS (o passe visual do Fx, 2026-07-20).
//
// O que ela prova: matar um inimigo de verdade faz nascer um SPRITE da sheet `explosion`
// (não só fagulha de partícula), a animação dele está TOCANDO, e ele SOME sozinho quando a
// animação completa (o `once('animationcomplete', destroy)` — sem ele, sprites de explosão
// vazariam pela fase inteira).
//
// O inimigo morre pela VIA REAL: a sonda alinha a nave na altura do primeiro inimigo vivo e
// segura o gatilho (a Fase 2 é voo livre, tiro manual no J) — a bala sai, viaja, acerta, e o
// `bulletHitEnemy` dispara o fx.explode. Nada de `scene.fx.explode()` na mão: sonda que chama
// o efeito direto prova que o efeito funciona, não que a MORTE o dispara (armadilha 19).
import { chromium } from 'playwright';

let falhas = 0;
const ok = (cond, msg) => {
  console.log(`${cond ? '✔' : '✘ FALHOU'} ${msg}`);
  if (!cond) falhas++;
};

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const explosoes = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    if (!s) return { cena: null, sprites: [], inimigos: 0 };
    // Sprites VIVOS da sheet de explosão na display list da cena.
    const sprites = s.children.list
      .filter((c) => c.type === 'Sprite' && c.texture?.key === 'explosionSheet')
      .map((c) => ({
        anim: c.anims?.currentAnim?.key ?? null,
        tocando: c.anims?.isPlaying ?? false,
        quadro: c.anims?.currentFrame?.index ?? null,
        escala: +c.scaleX.toFixed(2),
      }));
    const inimigos = s.enemies.enemies.getChildren().filter((e) => e.active);
    return {
      cena: s.scene.key,
      sprites,
      inimigos: inimigos.length,
      primeiroY: inimigos[0] ? Math.round(inimigos[0].y) : null,
    };
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V'); // Fase 2 do início: voo livre, inimigos desde os primeiros segundos
await page.waitForTimeout(1200);

await page.evaluate(() => {
  window.__game.scene.getScene('Game').lives = 99; // mede-se o FX, não a habilidade da sonda
});
await page.keyboard.down('J'); // gatilho (voo livre = tiro manual)

// Mata de verdade: alinha a nave na altura do 1º inimigo vivo a cada 250ms e espera a bala
// fazer o trabalho. Quando um sprite da sheet aparecer, fotografa — a explosão DURA ~720ms,
// então uma amostragem de 250ms não a perde (armadilha 21: o teste roda tempo suficiente).
let visto = null;
let completou = false;
for (let i = 0; i < 120; i++) {
  const e = await explosoes();
  if (e.cena !== 'Game') break;

  if (e.primeiroY !== null) {
    await page.evaluate((y) => {
      const s = window.__game.scene.getScene('Game');
      s.ship.y = y; // mira pelo eixo: a bala viaja reta e o overlap faz o resto
    }, e.primeiroY);
  }

  if (!visto && e.sprites.length > 0) {
    visto = e.sprites[0];
    console.log('explosão vista:', JSON.stringify(e.sprites));
    await page.screenshot({ path: 'probe-fx.png' });
  } else if (visto && e.sprites.length === 0) {
    completou = true;
    break;
  }

  await page.waitForTimeout(250);
}

await page.keyboard.up('J');

ok(!!visto, 'uma explosão da SHEET apareceu quando o inimigo morreu (não só fagulha)');
ok(visto?.anim === 'explosion', `a animação é a ` + `'explosion' (${visto?.anim})`);
ok(visto?.tocando === true, 'a animação está TOCANDO (isPlaying)');
ok(
  visto && visto.escala > 0.3 && visto.escala < 1.0,
  `a escala é a de inimigo comum (~0.5-0.8: ${visto?.escala})`,
);
ok(completou, 'o sprite se DESTRUIU ao completar a animação (one-shot, sem vazamento)');

console.log('screenshot: probe-fx.png');
console.log(falhas === 0 ? '\n✔ EXPLOSÃO ANIMADA DE PONTA A PONTA' : `\n✘ ${falhas} FALHAS`);
await browser.close();
process.exit(falhas === 0 ? 0 : 1);
