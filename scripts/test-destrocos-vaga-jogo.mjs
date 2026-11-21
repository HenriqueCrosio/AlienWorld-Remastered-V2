// THE ROOM AT BIRTH, IN THE GAME (21/11). npm run dev, then node scripts/test-destrocos-vaga-jogo.mjs [--porta 5174]
// F2 with a field far denser than the stage's (an asteroid every 0.35 s) and a miner drone every 3 s; every 100 ms it
// looks for two pieces of rock overlapping on screen (the visible radius, no slack).
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };
const porta = process.argv.includes('--porta') ? process.argv[process.argv.indexOf('--porta') + 1] : '5173';
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 2, ship: 'interceptor' }));
await page.waitForFunction(() => { const s = window.__game.scene.getScene('Game'); return window.__game.scene.isActive('Game') && s.ship?.active; }, null, { timeout: 30000 });
await page.waitForTimeout(600);
await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  s.director.next = s.director.script.length;
  s.waves = [];
  for (const e of [...s.enemies.enemies.getChildren()]) e.destroy();
  for (const h of [...s.debris.hazards.getChildren()]) h.destroy();
  s.ship.setPosition(30, 20);
  s.hazardRate = 0.35;
  s.hazardMix = ['asteroid'];
});

const r = await page.evaluate(async () => {
  const s = window.__game.scene.getScene('Game');
  const raio = (h) => 0.45 * Math.max(h.displayWidth, h.displayHeight);
  let amostras = 0, sobreposicoes = 0, comRocha = 0, rochas = 0, maxVivos = 0;
  const vistos = [];
  const fim = performance.now() + 30000;
  let proxDrone = 0;
  while (performance.now() < fim) {
    if (performance.now() > proxDrone) {
      s.enemies.spawn('droneMineracao', 40 + Math.random() * 140);
      rochas++;
      proxDrone = performance.now() + 3000;
    }
    await new Promise((res) => setTimeout(res, 100));
    const hs = s.debris.hazards.getChildren().filter((h) => h.active);
    maxVivos = Math.max(maxVivos, hs.length);
    amostras++;
    for (let i = 0; i < hs.length; i++)
      for (let j = i + 1; j < hs.length; j++) {
        const a = hs[i], b = hs[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < raio(a) + raio(b)) {
          sobreposicoes++;
          if (a.getData('kind') === 'mineravel' || b.getData('kind') === 'mineravel') comRocha++;
          if (vistos.length < 5) vistos.push([a.getData('kind'), Math.round(a.x), Math.round(a.y), b.getData('kind'), Math.round(b.x), Math.round(b.y)]);
        }
      }
  }
  return { amostras, sobreposicoes, comRocha, rochas, maxVivos, vistos };
});
ok(r.amostras > 200, 'sampled the field for 30 s', r.amostras);
ok(r.maxVivos >= 8, 'the field was dense (live hazards at once)', r.maxVivos);
ok(r.sobreposicoes === 0, 'no two pieces of rock ever overlapped', { sobreposicoes: r.sobreposicoes, comRocha: r.comRocha, vistos: r.vistos });
ok(r.rochas >= 9, 'miner rocks born in the middle of it', r.rochas);
ok(erros.length === 0, 'no page errors', erros);
await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo OK');
process.exit(falhas ? 1 : 0);
