// Quanto VÃO o leque do chefão da Fase 1 deixa, medido onde importa: na faixa em que o jogador
// está, não na boca do canhão (lá todos os tiros saem do mesmo pixel).
//
// A queixa do Henrique é que o leque "não tem espaço entre os tiros" e, com o flap, isso vira
// punição. Este número é a régua: o vão vertical entre cometas vizinhos quando eles cruzam a
// coluna do jogador, contra a altura da nave (~14px). Menos que ~2 naves de vão e não há esquiva
// de flap possível — o flap sobe em degraus, não em milímetros.
//
// uso: node scripts/_probe-leque.mjs   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene
    .getScene('Menu')
    .scene.start('Game', { stage: 1, handling: 'free', practice: true });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 46;
      s.ship.y = 120;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

/** Cometas cruzando a COLUNA do jogador (x 40..95), de cima para baixo. */
const faixa = () =>
  page.evaluate(() => {
    const b = window.__s.boss;
    const ys = window.__s.enemies.enemyBullets
      .getChildren()
      .filter((x) => x.active && x.getData('missile') !== true && x.x > 40 && x.x < 95)
      .map((x) => Math.round(x.y))
      .sort((a, b) => a - b);
    return { ys, airborne: !!b?.airborne, hp: b?.hp ?? 0, entering: !!b?.entering };
  });

const vaos = (ys) => {
  const g = [];
  for (let i = 1; i < ys.length; i++) g.push(ys[i] - ys[i - 1]);
  return g;
};

async function amostrar(rotulo, segundos) {
  const melhores = [];
  for (let i = 0; i < segundos * 10; i++) {
    await page.waitForTimeout(100);
    const f = await faixa();
    // Só interessa a leva CHEIA — leques pela metade (já saindo da faixa) mentem para melhor.
    if (f.ys.length >= 4) melhores.push(f.ys);
  }
  if (!melhores.length) {
    console.log(`${rotulo}: nenhuma leva cheia na faixa`);
    return;
  }
  const maior = melhores.sort((a, b) => b.length - a.length)[0];
  const g = vaos(maior);
  console.log(
    `${rotulo}: ${maior.length} cometas na coluna do jogador · y=${maior.join(',')}\n` +
      `   vãos: ${g.join(', ')} · MENOR ${Math.min(...g)}px · nave tem ~14px de altura`,
  );
}

for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const f = await faixa();
  if (!f.entering) break;
}

await amostrar('POUSADA ', 9);

await page.evaluate(() => {
  const b = window.__s.boss;
  while (b.hp > b.maxHp / 2) b.damage(5);
});
await page.waitForTimeout(2000);

await amostrar('AÉREA   ', 12);

await browser.close();
