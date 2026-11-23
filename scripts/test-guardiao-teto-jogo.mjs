// THE BLEEDING CEILING IN GAME (spec 2026-11-22-guardiao-coleira-design.md §7 and §8, step 5). npm run dev, then
//   node scripts/test-guardiao-teto-jogo.mjs [--porta 5173]
import { chromium } from 'playwright';

const arg = (k, d) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : d);
const porta = arg('--porta', '5173');
const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => erros.push(String(e)));
await page.goto(`http://localhost:${porta}/`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 120000 });
await page.evaluate(() => window.__game.scene.getScenes(true)[0].scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
await page.waitForFunction(() => {
  const g = window.__game.scene;
  if (g.isActive('Cartas')) { g.stop('Cartas'); g.resume('Game'); }
  const s = g.getScene('Game');
  return g.isActive('Game') && s.boss && s.boss.forma === 'guardiao' && !s.boss.entering && s.boss.acao === 'flutua';
}, null, { timeout: 120000, polling: 250 });
await page.evaluate(() => {
  const g = window.__game;
  const s = g.scene.getScene('Game');
  s.invulnerableUntil = Number.MAX_SAFE_INTEGER;
  // a LIFE is a "damageShip" call outside the game's 1400 ms i-frames (the real ones are off here: invulnerable)
  window.__vidas = 0;
  s.damageShip = () => {
    const t = window.__passo.t;
    if (t - (window.__ultimo ?? -1e9) >= 1400) { window.__vidas++; window.__ultimo = t; }
  };
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = () => {
    window.__passo.t += 1000 / 60;
    g.step(window.__passo.t, 1000 / 60);
  };
});

// ── one bleeding at 33–0%: the ship still at `casa`, or reading (a gap of the 1st wave, then its old column) ──
const rodar = (casa, le) =>
  page.evaluate(({ casa, le }) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    const C = b.constructor;
    b.hpGuardiao = C.HP_GUARDIAO * 0.2;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'teto';
    b.acaoT = 0;
    b.cdTiro = 99;
    s.ship.setPosition(casa.x, casa.y);
    window.__vidas = 0;
    window.__ultimo = -1e9;
    const balas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active).length;
    for (let i = 0; i < 30 && b.acao !== 'teto'; i++) window.__step();
    const x0 = b.sprite.x;
    const vistas = new Map();
    let quadros = 0, maxBalas = 0, dano = null, pulsou = false, apagadas = true, tortas = 0, freou = 0, fases = [];
    const A = [32, 96, 160, 224], B = [64, 128, 192, 256];
    for (let i = 0; i < 60 * 12 && b.acao === 'teto'; i++) {
      const a = b.teto;
      if (le && a) {
        const T = a.constructor;
        const perto = (xs) => xs.reduce((m, x) => (Math.abs(x - s.ship.x) < Math.abs(m - s.ship.x) ? x : m), xs[0]);
        const passou = a.t >= T.ultima(0) + T.queda(36, s.ship.y + 8.5);
        if (a.t >= T.inicio(0)) {
          const alvo = passou ? perto(A) : perto(B);
          const dx = alvo - s.ship.x;
          s.ship.setPosition(s.ship.x + Math.sign(dx) * Math.min(Math.abs(dx), 110 / 60), casa.y);
        }
      }
      window.__step();
      quadros++;
      if (b.teto && fases[fases.length - 1] !== b.teto.fase) fases.push(b.teto.fase);
      if (b.cabos.pulsoK !== null) pulsou = true;
      if (b.teto && !b.teto.acabou) {
        const p = s.moldura.pecasDaFaixa();
        if (![...p.teto, ...p.chao].every((o) => o.alpha === 0)) apagadas = false;
      }
      for (const g of b.sangue.lista) {
        const v = vistas.get(g);
        const vy = g.body.velocity.y;
        if (!v) vistas.set(g, { x: g.x, vy });
        else {
          if (Math.abs(g.x - v.x) > 1e-6) tortas++;
          if (vy < v.vy - 1e-6) freou++;
          v.vy = vy;
        }
      }
      maxBalas = Math.max(maxBalas, balas());
      if (i === 90 && dano === null) {
        const h0 = b.hpGuardiao;
        b.damage(1);
        dano = h0 - b.hpGuardiao;
      }
    }
    for (let i = 0; i < 5; i++) window.__step();
    const p = s.moldura.pecasDaFaixa();
    const xs = [...new Set([...vistas.values()].map((v) => Math.round(v.x)))].sort((p, q) => p - q);
    return {
      gotas: vistas.size, xs, tortas, freou, quadros, maxBalas, dano, pulsou, apagadas, fases,
      maxX: Math.abs(b.sprite.x - x0),
      vidas: window.__vidas,
      acao: b.acao,
      voltou: [...p.teto, ...p.chao].every((o) => o.alpha === 1) && !b.borda.img.visible,
      apagouPulso: b.cabos.pulsoK === null,
      noAr: b.sangue.lista.length,
    };
  }, { casa, le });

const P = await rodar({ x: 96, y: 110 }, false);
conferir(P.fases.join('>') === 'sobe>espalha>sangra>fim', 'as fases em jogo: sobe → espalha → sangra → fim', P.fases);
conferir(P.pulsou, 'o pulso sobe pelos cabos', P.pulsou);
conferir(P.apagadas, 'enquanto sangra, a faixa original some e a camada a substitui (os pontos incham nela)', P.apagadas);
conferir(P.gotas === 24, '24 gotas: 4 pontos × 3, nas duas ondas', P.gotas);
conferir(P.xs.join(',') === '32,64,96,128,160,192,224,256', 'as colunas nos 8 pontos (A e B alternados, a 32 px)', P.xs);
conferir(P.tortas === 0, 'cada gota cai RETA (o x nunca muda)', P.tortas);
conferir(P.freou === 0, 'e acelera (gravidade), nunca freia', P.freou);
conferir(P.vidas === 1, 'a nave PARADA debaixo de uma coluna perde 1 vida (os i-frames separam)', P.vidas);
conferir(P.maxBalas === 0, 'sem salva nem lava durante o teto', P.maxBalas);
conferir(P.maxX < 0.5, 'ele não sai da estação', P.maxX);
conferir(P.dano === 1, 'a janela: o miolo toma dano no teto', P.dano);
conferir(P.acao === 'flutua' && P.voltou && P.apagouPulso && P.noAr === 0, 'no fim: volta a flutuar, a faixa inteira, o pulso apagado, nenhuma gota no ar', P);
console.log(`     teto que sangra: ${(P.quadros / 60).toFixed(1)} s de ação`);

const L = await rodar({ x: 100, y: 110 }, true);
conferir(L.vidas === 0, 'a nave que LÊ (no vão da 1ª onda, depois na coluna velha dela) passa sem perder vida', L.vidas);

// hiding in the ceiling band, right under a swollen point: the lit point bites (the wall doesn't protect)
const E = await rodar({ x: 32, y: 26 }, false);
conferir(E.vidas >= 1, 'escondida na faixa do teto, debaixo de um ponto inchado: o fio aceso morde', E.vidas);

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
