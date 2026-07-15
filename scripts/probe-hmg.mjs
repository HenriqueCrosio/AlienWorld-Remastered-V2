// A MINI-GUN: o giro, o calor e a TRAVA — e o exploit que eles têm que fechar.
//
// A promessa do nerf é uma só: **tamborilar o gatilho ADIA o travamento, nunca o evita.** Se o
// calor caísse depressa fora do gatilho, metralhar em toques curtos daria fogo cheio de graça e o
// nerf inteiro seria decorativo. Isso não se verifica lendo o código — o calor sobe por TIRO e
// cai por SEGUNDO, e quem decide o resultado é a razão entre as duas taxas no ritmo real do jogo.
//
// A sonda faz o que o jogador faria para trapacear, e mede.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

const arma = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const w = s?.weapons;
    return {
      arma: w?.current?.name,
      municao: w?.ammoLeft,
      giro: Number(w?.spoolPct?.toFixed(2)),
      calor: Number(w?.heatPct?.toFixed(2)),
      travada: w?.overheated,
    };
  });

/** Mantém o jogador vivo: o que se mede aqui é a ARMA, não a perícia da sonda. */
const imortal = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    if (s) {
      s.lives = 9;
      s.invulnerableUntil = s.time.now + 5000;
    }
  });

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('B'); // treino do chefão da Fase 1
await page.waitForTimeout(2000);
await imortal();

// No FLAP o tiro é automático: para medir o gatilho, força a condução LIVRE.
await page.evaluate(() => {
  const s = window.__game.scene.getScenes(true)[0];
  s.controller = s.controllers.free;
  s.controller.setup(s.ship.body);
  s.weapons.equip('hmg');
});

console.log('── 1. GATILHO SEGURADO: ela gira, esquenta e TRAVA ──');
await page.keyboard.down('J');
for (let i = 0; i < 10; i++) {
  await imortal();
  await page.waitForTimeout(500);
  console.log(`t=${((i + 1) * 0.5).toFixed(1)}s`, JSON.stringify(await arma()));
}
await page.keyboard.up('J');

console.log('\n── 2. SOLTOU: o giro cai rápido, o calor cai DEVAGAR ──');
for (let i = 0; i < 6; i++) {
  await imortal();
  await page.waitForTimeout(500);
  console.log(`t=${((i + 1) * 0.5).toFixed(1)}s`, JSON.stringify(await arma()));
}

// ─── O EXPLOIT ───
// Recarrega a arma e tamborila: 0.4s atirando, 0.4s solto, sem parar. Se o calor não subir,
// o nerf está furado.
console.log('\n── 3. O EXPLOIT: tamborilar o gatilho (0.4s liga / 0.4s desliga) ──');
await page.evaluate(() => window.__game.scene.getScenes(true)[0].weapons.equip('hmg'));

let travouTamborilando = false;

// 20 ciclos = 16s de tamborilada. Com 12 a sonda parava UM ciclo antes do travamento e gritava
// "exploit aberto" quando ele estava fechado — um teste que erra por chegar cedo demais é pior
// do que não ter teste, porque ele manda consertar o que não está quebrado.
for (let i = 0; i < 20; i++) {
  await page.keyboard.down('J');
  await imortal();
  await page.waitForTimeout(400);
  await page.keyboard.up('J');
  await page.waitForTimeout(400);

  const e = await arma();
  if (e.travada) travouTamborilando = true;
  console.log(`ciclo ${String(i + 1).padStart(2)}`, JSON.stringify(e));
}

console.log(
  travouTamborilando
    ? '\n✔ TAMBORILAR TAMBÉM TRAVA — o exploit está fechado.'
    : '\n✘ TAMBORILAR NUNCA TRAVOU — o calor dissipa rápido demais (exploit ABERTO).',
);

await browser.close();
