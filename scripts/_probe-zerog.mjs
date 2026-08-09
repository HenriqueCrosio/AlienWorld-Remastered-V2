// O TRECHO DE ZERO-G: os ~6.5s entre a Torre morrer e a cutscene 1 entrar.
//
// É o momento em que a nave rompe a atmosfera e chega ao espaço — e hoje ele acontece contra o
// CENÁRIO DA FASE 1 (o gradiente de céu e o fundo pintado da colônia continuam lá; só o terreno
// desce e some, ver `Parallax.breakAtmosphere`). A sonda existe para fotografar essa passagem
// quadro a quadro, que é a única forma de julgar uma transição.
//
// uso: node scripts/_probe-zerog.mjs [sufixo]   (com `npm run dev` no ar)
import { chromium } from 'playwright';

const SUFIXO = process.argv[2] ? `-${process.argv[2]}` : '';
const URL = process.env.URL ?? 'http://localhost:5173/';

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage();
page.on('pageerror', (e) => console.log(`[ERRO DE PÁGINA] ${e.message}`));

await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => {
  window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' });
});
await page.waitForTimeout(600);

await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  window.__s = s;
  setInterval(() => {
    s.invulnerableUntil = 1e12;
    if (s.ship) {
      s.ship.x = 90;
      s.ship.y = 120;
      s.ship.body?.setVelocity?.(0, 0);
    }
  }, 40);
});

// Atalho DEV para a luta do chefão.
await page.keyboard.press('g');

// Espera a ATMOSFERA ROMPER — o instante que interessa. Sem isso a sonda fotografa por relógio
// e pega um momento diferente a cada execução.
//
// ⚠️ O `hp = 2` tem que ser INSISTIDO, não escrito uma vez:
//   - escrever cedo demais não faz nada (o chefão ainda não existe quando o 'G' é pressionado);
//   - a Torre tem DUAS fases e a aérea entra com vida própria, então um único empurrão só mata
//     a de solo e a sonda fica esperando a segunda pelo caminho longo;
//   - e escrever no CAMPO não chama `damage()`, então é sempre o golpe SEGUINTE que conta.
// Manter a vida no chão a cada volta resolve os três de uma vez.
let rompeu = false;
for (let i = 0; i < 200; i++) {
  await page.waitForTimeout(100);
  const d = await page.evaluate(() => {
    const s = window.__s;
    // `damage()` e não `hp = ...`: escrever no campo não conta como golpe, e a sonda não sabe
    // acertar a fase AÉREA (ela voa baixo, e o tiro horizontal passa por baixo do chefão no ar —
    // foi assim que esta sonda ficou esperando uma Torre que ela nunca ia matar). O método
    // devolve false sozinho enquanto ele está entrando ou decolando, que é a imunidade correta.
    //
    // 25 por volta, não 3: a Torre tem 150 de vida e a janela da sonda é curta. O que se testa
    // aqui é a TRANSIÇÃO, não a luta.
    //
    // ⚠️ E o RETORNO tem que ser obedecido. `damage()` não mata: ele devolve `true` e quem
    // conduz a morte (explosões → romper a atmosfera) é `GameScene.killBoss`, exatamente como
    // no `onBulletHitBoss`. Ignorar isso deixa a Torre com hp 0 parada na tela para sempre —
    // que foi o que esta sonda ficou fotografando.
    if (s?.boss && !s.boss.isDead && s.boss.damage(25)) s.killBoss();
    return { zona: s?.zone, hp: s?.boss?.hp ?? null };
  });
  if (i % 20 === 0) console.log(`  ...zona=${d.zona} hpChefao=${d.hp}`);
  if (d.zona === 'vacuo') {
    rompeu = true;
    break;
  }
}

if (!rompeu) {
  console.log('FALHOU: a atmosfera não rompeu em 20s — a Torre não morreu.');
  await page.screenshot({ path: `probe-zerog${SUFIXO}-falha.png` });
  await browser.close();
  process.exit(1);
}

console.log('atmosfera rompida — fotografando a subida');

// Os marcos da transição: o terreno desce/some em 2.5s, a lua entra em 2s (delay 600ms) e o
// Leviatã em 3.5s (delay 1400ms). As fotos cercam esses tempos.
const marcos = [0, 800, 1600, 2600, 4000, 5600];
let anterior = 0;
for (const t of marcos) {
  await page.waitForTimeout(t - anterior);
  anterior = t;
  const cena = await page.evaluate(() => window.__game.scene.getScenes(true)[0]?.scene.key);
  await page.screenshot({ path: `probe-zerog${SUFIXO}-${String(t).padStart(4, '0')}ms.png` });
  console.log(`  +${t}ms  cena=${cena}`);
}

await browser.close();
