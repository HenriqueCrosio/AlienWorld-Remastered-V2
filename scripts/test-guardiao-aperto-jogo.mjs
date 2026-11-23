// THE SQUEEZE IN GAME (spec 2026-11-22-guardiao-coleira-design.md §7 and §8, step 4). npm run dev, then
//   node scripts/test-guardiao-aperto-jogo.mjs [--porta 5173]
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
  // a LIFE is a "damageShip" call outside the 1400 ms i-frames (the real ones are off here: invulnerable)
  window.__dano = 0;
  window.__tocou = false;
  window.__antes = false;
  s.damageShip = () => { window.__tocou = true; };
  g.loop.sleep();
  window.__passo = { t: g.loop.now };
  window.__step = () => {
    window.__tocou = false;
    window.__passo.t += 1000 / 60;
    g.step(window.__passo.t, 1000 / 60);
    // the game's 1400 ms of i-frames (`damageShip`): a touch inside them costs nothing
    if (window.__tocou && window.__passo.t - (window.__ultimo ?? -1e9) >= 1400) { window.__dano++; window.__ultimo = window.__passo.t; }
  };
});

// ── one squeeze at 33–0%: the ship still at (80, 110), or reading (it slides to the gap's height as the ring swells) ──
const rodar = (le) =>
  page.evaluate(({ le }) => {
    const s = window.__game.scene.getScene('Game');
    const b = s.boss;
    const C = b.constructor;
    b.hpGuardiao = C.HP_GUARDIAO * 0.2;
    b.serra?.destroy?.();
    b.serra = null;
    b.acao = 'flutua';
    b.proxima = 'aperto';
    b.acaoT = 0;
    b.cdTiro = 99;
    s.ship.setPosition(80, 110);
    window.__dano = 0;
    const balas = () => s.enemies.enemyBullets.getChildren().filter((o) => o.active).length;
    const pecas = () => s.moldura.pecasDaFaixa();
    for (let i = 0; i < 30 && b.acao !== 'aperto'; i++) window.__step();
    const a = b.borda.atual;
    const vaoY = a?.vaoY ?? null;
    const x0 = b.sprite.x;
    let quadros = 0, menorVao = Infinity, foraDoCorredor = 0, empurroes = 0, maxBalas = 0, dano = null;
    let apagadas = true, camada = true, tensa = false, maxDesl = 0, fases = [], fioCerto = 0, fioErrado = 0;
    const FIO = 0xff78b4ff;
    for (let i = 0; i < 60 * 12 && b.acao === 'aperto'; i++) {
      const at = b.borda.atual;
      if (le && at && at.fase !== 'aviso') {
        const dy = at.vaoY - s.ship.y;
        s.ship.setPosition(80, s.ship.y + Math.sign(dy) * Math.min(Math.abs(dy), 110 / 60));
      }
      const antes = { x: s.ship.x, y: s.ship.y };
      window.__step();
      quadros++;
      const ap = b.borda.atual;
      if (!ap) break;
      if (fases[fases.length - 1] !== ap.fase) fases.push(ap.fase);
      if (Math.hypot(s.ship.x - antes.x, s.ship.y - antes.y) > 0.01) empurroes++;
      for (let x = 0; x < 384; x++) {
        menorVao = Math.min(menorVao, b.borda.chaoEm(x) - b.borda.tetoEm(x));
        maxDesl = Math.max(maxDesl, b.borda.dTeto[x], b.borda.dChao[x]);
      }
      // after the push the ship's box sits inside the deformed corridor (sampled over its width)
      for (let x = Math.round(s.ship.x - 10); x <= Math.round(s.ship.x + 10); x++)
        if (s.ship.y - 4.5 < b.borda.tetoEm(x) - 0.01 || s.ship.y + 4.5 > b.borda.chaoEm(x) + 0.01) { foraDoCorredor++; break; }
      // the lit line: on the twisted surface, and nowhere else
      if (ap.fase === 'corre') {
        const buf = b.borda.buf;
        for (let x = 0; x < 384; x++) {
          for (const teto of [true, false]) {
            const torcida = b.borda.torcidaEm(x, teto);
            const y = teto ? Math.round(b.borda.tetoEm(x)) - 1 : Math.round(b.borda.chaoEm(x));
            const aceso = y >= 0 && y < 216 && buf[y * 384 + x] === FIO;
            if (torcida && aceso) fioCerto++;
            if (!torcida && aceso) fioErrado++;
          }
        }
      }
      const p = pecas();
      if (![...p.teto, ...p.chao].every((o) => o.alpha === 0)) apagadas = false;
      if (!b.borda.img.visible) camada = false;
      if (b.cabos.tensa) tensa = true;
      maxBalas = Math.max(maxBalas, balas());
      if (i === 120 && dano === null) {
        const h0 = b.hpGuardiao;
        b.damage(1);
        dano = h0 - b.hpGuardiao;
      }
    }
    for (let i = 0; i < 5; i++) window.__step();
    const p = pecas();
    return {
      fioCerto, fioErrado, vaoY, quadros, menorVao, foraDoCorredor, empurroes, maxBalas, dano, apagadas, camada, tensa, maxDesl, fases,
      maxX: Math.abs(b.sprite.x - x0),
      danoNave: window.__dano,
      acao: b.acao,
      voltou: [...p.teto, ...p.chao].every((o) => o.alpha === 1) && !b.borda.img.visible,
      soltou: !b.cabos.tensa,
      naveY: s.ship.y,
    };
  }, { le });

const A = await rodar(false);
conferir(A.fases.join('>') === 'aviso>cresce>corre', 'as fases em jogo: aviso → cresce → corre', A.fases);
conferir(A.vaoY !== null && A.vaoY < 100, 'o 1º aperto: o vão A, alto', A.vaoY);
conferir(A.menorVao >= 50, 'o vão nunca fecha abaixo de 50 px (medido na camada, coluna a coluna, quadro a quadro)', A.menorVao);
conferir(A.maxDesl >= 60, 'a borda incha de verdade (≥ 60 px numa coluna)', A.maxDesl);
conferir(A.empurroes >= 1, 'a nave PARADA fora do vão é empurrada', A.empurroes);
conferir(A.foraDoCorredor === 0, 'depois do empurrão a nave está sempre dentro do corredor deformado', A.foraDoCorredor);
conferir(A.danoNave >= 1 && A.danoNave <= 2, 'a borda TORCIDA morde: a parada leva o toque (1 vida; os i-frames separam)', A.danoNave);
conferir(A.fioCerto > 100 && A.fioErrado === 0, 'o fio aceso só na borda torcida (o hitbox é a linha)', { certo: A.fioCerto, errado: A.fioErrado });
conferir(A.maxBalas === 0, 'sem salva nem lava durante o aperto', A.maxBalas);
conferir(A.maxX < 0.5, 'ele não sai da estação', A.maxX);
conferir(A.dano === 1, 'a janela: o miolo toma dano no aperto', A.dano);
conferir(A.apagadas && A.camada, 'enquanto aperta, a faixa original some e a camada a substitui', { a: A.apagadas, c: A.camada });
conferir(A.tensa, 'o puxão: os cabos esticam (tensos) no aperto', A.tensa);
conferir(A.acao === 'flutua' && A.voltou && A.soltou, 'no fim: volta a flutuar, a faixa original volta inteira, os cabos soltam', { acao: A.acao, voltou: A.voltou, soltou: A.soltou });
console.log(`     aperto: ${(A.quadros / 60).toFixed(1)} s de ação`);

const B = await rodar(true);
conferir(B.vaoY !== null && B.vaoY > 120, 'o 2º aperto: o vão B, baixo (alterna)', B.vaoY);
conferir(B.empurroes === 0, 'a nave que LÊ (vai para a altura do vão quando o anel incha) passa sem encostar', B.empurroes);
conferir(B.danoNave === 0 && B.foraDoCorredor === 0, 'e sem dano, dentro do corredor', { dano: B.danoNave, fora: B.foraDoCorredor });

conferir(erros.length === 0, 'sem erros na página', erros);
await browser.close();
console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
