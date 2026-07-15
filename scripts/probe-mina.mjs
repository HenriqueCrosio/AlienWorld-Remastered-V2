// A MINA SENSORA: a promessa dela, testada dos dois lados.
//
// A peça só vale se as DUAS coisas forem verdade:
//   1. quem passa perto e NÃO atira leva o leque de estilhaços na cara;
//   2. quem ATIRA nela primeiro não leva nada.
//
// Se (1) falhar, ela é um enfeite. Se (2) falhar, atirar e não atirar dão no mesmo — e a única
// decisão que a peça oferece deixa de existir. As duas se verificam RODANDO, nunca lendo.
import { chromium } from 'playwright';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
await page.keyboard.press('V'); // Fase 2
await page.waitForTimeout(1500);

/** Limpa a tela e planta UMA mina sensora ao lado da nave. O teste é sobre ela, não sobre a fase. */
const plantar = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];

    // Fase parada: sem ondas, sem outros destroços — nada que suje a medição.
    s.hazardRate = 0;
    s.waves = [];
    for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
    for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
    for (const b of [...s.enemies.enemyBullets.getChildren()]) s.enemies.release(b);

    s.lives = 9;
    s.invulnerableUntil = 0;

    s.debris.spawn('sensor');
    const m = s.debris.hazards.getChildren().at(-1);

    // Na frente da nave, fora do raio (46px): ela ainda tem que estar DORMINDO.
    m.body.reset(s.ship.x + 70, s.ship.y);
    m.setVelocity(0, 0);

    return { minaX: Math.round(m.x), minaY: Math.round(m.y), naveX: Math.round(s.ship.x) };
  });

const estado = () =>
  page.evaluate(() => {
    const s = window.__game.scene.getScenes(true)[0];
    const minas = s.debris.hazards.getChildren().filter((h) => h.active && h.getData('kind') === 'sensor');
    const estilhacos = s.enemies.enemyBullets.getChildren().filter((b) => b.active);

    return {
      minasVivas: minas.length,
      pavio: minas[0] ? Number(minas[0].getData('fuse').toFixed(2)) : null,
      estilhacosNoAr: estilhacos.length,
      vidas: s.lives,
    };
  });

// ─── 1. NÃO ATIRAR: chegar perto tem que doer ───────────────────────────────
//
// ⚠️ A NAVE NÃO PODE ENCOSTAR NA MINA. A 1ª versão desta sonda segurava o `D` até bater nela: o
// jogador perdia uma vida por COLISÃO, antes de existir um único estilhaço, e a sonda cantava
// vitória ("estilhaçou e acertou") sem ter testado o leque. Ela provava que bater numa mina dói —
// o que nunca esteve em dúvida.
//
// Agora ela entra no RAIO (46px) e PARA fora do alcance do casco. O único jeito de perder vida
// aqui é levando o leque.
console.log('── 1. ENTRAR NO RAIO SEM ATIRAR (e sem encostar) ──');
console.log('plantada  ', JSON.stringify(await plantar()));
console.log('dormindo  ', JSON.stringify(await estado()));

await page.keyboard.down('D');
await page.waitForTimeout(300);
await page.keyboard.up('D');
await page.waitForTimeout(250);

const acordada = await estado();
console.log('acordou   ', JSON.stringify(acordada));

// A vida TEM que estar intacta aqui: se caiu, foi colisão, e o teste não vale.
if (acordada.vidas < 9) {
  console.log('\n✘ SONDA INVÁLIDA: a nave ENCOSTOU na mina. O dano medido seria de colisão, não do leque.');
  await browser.close();
  process.exit(1);
}

await page.waitForTimeout(600);
const estourada = await estado();
console.log('estourou  ', JSON.stringify(estourada));

await page.waitForTimeout(700);
const dano = await estado();
console.log('dano      ', JSON.stringify(dano));

// O leque nasceu E cobrou: a mina morreu sozinha (pavio), cuspiu estilhaços, e a vida caiu.
const puniu = estourada.estilhacosNoAr > 0 && dano.vidas < 9;

// ─── 2. ATIRAR: matá-la antes tem que ser SEGURO ────────────────────────────
console.log('\n── 2. ATIRAR NELA ANTES ──');
console.log('plantada  ', JSON.stringify(await plantar()));

await page.keyboard.down('J'); // gatilho (voo LIVRE)
await page.waitForTimeout(2500);
const abatida = await estado();
console.log('abatida   ', JSON.stringify(abatida));
await page.keyboard.up('J');

const seguro = abatida.minasVivas === 0 && abatida.estilhacosNoAr === 0 && abatida.vidas === 9;

console.log('\n─────────────────────────────────────────────');
console.log(puniu ? '✔ NÃO atirar CUSTA CARO (estilhaçou e acertou)' : '✘ passar perto não puniu — a mina é um enfeite');
console.log(seguro ? '✔ ATIRAR nela é SEGURO (morreu sem cuspir leque)' : '✘ atirar nela também estilhaçou — a decisão não existe');

await browser.close();
