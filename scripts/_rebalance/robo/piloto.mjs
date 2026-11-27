// THE PILOTO (spec 2026-11-26-medicao-das-lutas §4.2): a good player. The ship takes real damage; every frame the robot
// decides on the world as it was REACAO ms ago (a threat born after that is not seen yet), extrapolates each threat in a
// straight line by its velocity for 0.5 s, and moves toward the safest reachable spot that keeps it level with the
// boss's weak point — never passing behind the boss (the ship only shoots forward). It fires only with the weak point
// on its line (and never into the Beast's open thirst). A death does not end the fight: it is counted, the lives come
// back, and the fight goes on to the end.
//   node scripts/_rebalance/robo/piloto.mjs --chefe capitania|guardiao|torre|serpente --mao nenhuma|mediana|forte
//        [--reacao 550] [--porta 5173] [--teto 900] [--saida file.json] [--parado]
import fs from 'node:fs';
import { abrirLuta, arg, imprimir, olhar } from './comum.mjs';

const chefe = arg('--chefe', 'capitania');
const mao = arg('--mao', 'mediana');
const porta = arg('--porta', '5173');
// the reaction, calibrated on the Capitânia (26/11, spec §5), with the ship kept to the back (x ≤ 90) and the velocity
// measured frame to frame: 550 ms = 1 life per fight with the median hand, in the fury (400: 0.7; 700: 2.3, deaths).
// Frozen for every fight.
const REACAO = Number(arg('--reacao', '550'));
const TETO = Number(arg('--teto', '900'));
const saida = arg('--saida', '');
const PARADO = process.argv.includes('--parado');
// --fotos <dir>: a photo at each blow (at most 16 per fight) + what it was (fotos.json) — the sheet's "onde ele apanha"
const FOTOS = arg('--fotos', '');

const { browser, page, erros } = await abrirLuta({ porta, chefe, mao });
const fotos = [];
if (FOTOS) {
  fs.mkdirSync(FOTOS, { recursive: true });
  await page.exposeFunction('__fotoGolpe', async (g) => {
    if (fotos.length >= 16) return;
    const nome = `golpe-${String(fotos.length).padStart(2, '0')}.png`;
    fotos.push({ nome, ...g });
    await page.screenshot({ path: `${FOTOS}/${nome}` });
  });
  await page.evaluate(() => {
    const r = window.__registro;
    const golpe = r.golpe.bind(r);
    r.golpe = (causa, absorvido, quem) => {
      golpe(causa, absorvido, quem);
      const g = r.golpes().at(-1);
      const sc = window.__game.scene.getScene('Game');
      if (g) window.__fotoGolpe({ ...g, fase: sc.boss?.devFaseAtual ?? '' });
    };
  });
}
await page.evaluate(({ REACAO, PARADO }) => {
  const sc = window.__game.scene.getScene('Game');
  const HORIZONTE = 0.5;
  const TAUS = [0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5];
  const MARGEM = 8;
  const FUNDO = 90;
  const X0 = 8, X1 = 376, Y0 = 12, Y1 = 204;
  const hist = [];
  window.__mortes = 0;
  window.__golpesParado = 0;
  // a death does not end the measurement: counted, lives back
  sc.gameOver = () => {
    window.__mortes++;
    sc.lives = 3;
  };
  let atirando = false;
  const tecla = (tipo) => {
    const ev = new KeyboardEvent(tipo, { key: ' ', code: 'Space', bubbles: true, cancelable: true });
    Object.defineProperty(ev, 'keyCode', { get: () => 32 });
    Object.defineProperty(ev, 'which', { get: () => 32 });
    window.dispatchEvent(ev);
  };
  const atirar = (sim) => {
    if (sim === atirando) return;
    atirando = sim;
    tecla(sim ? 'keydown' : 'keyup');
  };
  // the velocity a player SEES: measured from the box's own motion frame to frame (a body moved by a tween — her bote,
  // her slash, the Guardian's lunge — has a zero physics velocity), smoothed; the physics velocity when it is new
  let antes = new Map();
  const ameacasAgora = (agora) => {
    const out = [];
    const agoraMap = new Map();
    const pegar = (o, c, corpo) => {
      const x = (c.left + c.right) / 2, y = (c.top + c.bottom) / 2;
      const a = antes.get(o);
      let vx = c.velocity.x, vy = c.velocity.y;
      if (a && agora > a.t) {
        const dt = (agora - a.t) / 1000;
        const mx = (x - a.x) / dt, my = (y - a.y) / dt;
        // a jump (a pooled sprite reborn elsewhere) is not a velocity
        if (Math.hypot(mx, my) < 900) { vx = a.vx * 0.5 + mx * 0.5; vy = a.vy * 0.5 + my * 0.5; }
      }
      agoraMap.set(o, { x, y, t: agora, vx, vy });
      out.push({ l: c.left, r: c.right, t: c.top, b: c.bottom, vx, vy, corpo });
    };
    for (const g of [sc.enemies.enemyBullets, sc.enemies.enemies, sc.boss?.perigos]) {
      if (!g) continue;
      for (const o of g.getChildren()) {
        if (!o.active) continue;
        const c = o.body;
        if (!c || !c.enable) continue;
        pegar(o, c, false);
      }
    }
    const b = sc.boss;
    const c = b?.sprite?.body;
    if (b && !b.isDead && c && c.enable && b.sprite.active && b.sprite.visible) pegar(b.sprite, c, true);
    // what the boss's warning promises (spec §4.2, his "com certeza"): a player who knows the fight reads it — seen with
    // the same delay as everything else, standing still
    if (b && !b.isDead && b.devAvisos) {
      const nb = sc.ship.body;
      for (const a of b.devAvisos({ x: nb.x + nb.width / 2, y: nb.y + nb.height / 2 })) out.push({ ...a, vx: 0, vy: 0, aviso: true });
    }
    antes = agoraMap;
    return out;
  };
  const ponto = (b) => {
    const s = sc.ship;
    const t = (b.targets ?? []).filter((o) => o.active && o.body?.enable);
    if (t.length) {
      t.sort((a, c) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(c.x - s.x, c.y - s.y));
      return { x: t[0].x, y: t[0].y };
    }
    const c = b.sprite?.body;
    if (c && b.sprite.active && b.sprite.visible) return { x: c.left + 12, y: c.y + c.height / 2 };
    return null;
  };
  // distance between two boxes (negative = overlapping)
  const folga = (sl, sr, st, sb, a) => {
    const dx = Math.max(a.l - sr, 0, sl - a.r);
    const dy = Math.max(a.t - sb, 0, st - a.b);
    if (dx === 0 && dy === 0) return -1;
    return Math.hypot(dx, dy);
  };
  const morde = (l, r, t, b) =>
    !!(sc.boss?.morde?.(l, r, t, b) || sc.moldura?.morde?.(l, r, t, b) || sc.parallax?.cavernaMorde?.(l, r, t, b));
  sc.events.on('postupdate', (_t, dt) => {
    const agora = sc.time.now;
    hist.push({ t: agora, a: ameacasAgora(agora) });
    while (hist.length > 2 && hist[1].t <= agora - REACAO) hist.shift();
    const b = sc.boss;
    if (!b || b.isDead) return atirar(false);
    const snap = hist[0];
    const idade = (agora - snap.t) / 1000;
    const nb = sc.ship.body;
    const hw = nb.width / 2, hh = nb.height / 2;
    const cx = nb.x + hw, cy = nb.y + hh;
    // the ship's reach: free flight = the same speed every way; the F1's FLAP (the Tower) = 55 px/s across, a climb by
    // impulses and a fall under gravity (the FlapController's numbers: impulse 170, max fall 260) — never hovering free
    const flap = sc.controller?.id === 'flap';
    const v = flap ? 55 : nb.maxVelocity?.x || 110;
    const vSobe = flap ? 150 : v, vDesce = flap ? 220 : v;
    const p = ponto(b);
    const corpoChefe = b.sprite?.body;
    const atras = corpoChefe && b.sprite.visible ? corpoChefe.left - 10 : X1;
    // a good player keeps to the back of the screen (an aimed shot takes longer to arrive), level with the weak point
    const gx = p ? Math.min(Math.max(20, p.x - 110), Math.max(20, p.x - 40), FUNDO) : 60;
    const gy = p ? Math.min(Y1, Math.max(Y0, p.y)) : 108;
    // the candidates: stay, 16 directions × 2 reaches in the horizon, and the goal itself
    const cands = [[cx, cy], [gx, gy]];
    for (let k = 0; k < 16; k++) {
      const ang = (k * Math.PI) / 8;
      for (const f of [0.35, 1]) {
        const sy = Math.sin(ang);
        cands.push([cx + Math.cos(ang) * v * HORIZONTE * f, cy + sy * (sy < 0 ? vSobe : vDesce) * HORIZONTE * f]);
      }
    }
    let melhor = null, custoMin = Infinity;
    for (const [qx0, qy0] of cands) {
      const qx = Math.min(X1 - hw, Math.max(X0 + hw, qx0));
      const qy = Math.min(Y1 - hh, Math.max(Y0 + hh, qy0));
      // free flight moves straight at one speed (the euclidean time); the flap's axes are independent (the slower one)
      const tChega = flap ? Math.max(Math.abs(qx - cx) / v, Math.abs(qy - cy) / (qy < cy ? vSobe : vDesce)) : Math.hypot(qx - cx, qy - cy) / v;
      let perigo = 0;
      for (const tau of TAUS) {
        const k = tChega > 0 ? Math.min(1, tau / tChega) : 1;
        const sx = cx + (qx - cx) * k, sy = cy + (qy - cy) * k;
        const sl = sx - hw, sr = sx + hw, st = sy - hh, sb = sy + hh;
        const dtA = idade + tau;
        for (const a of snap.a) {
          const ox = a.vx * dtA, oy = a.vy * dtA;
          const f = folga(sl, sr, st, sb, { l: a.l + ox, r: a.r + ox, t: a.t + oy, b: a.b + oy });
          if (f < MARGEM) perigo += (MARGEM - f) * (MARGEM - f) * (1 + (HORIZONTE - tau) * 2);
        }
      }
      if (morde(qx - hw, qx + hw, qy - hh, qy + hh)) perigo += 1e5;
      const custo = perigo * 10 + Math.abs(qy - gy) * 1 + Math.abs(qx - gx) * 0.3 + (qx + hw > atras ? 500 : 0);
      if (custo < custoMin) {
        custoMin = custo;
        melhor = [qx, qy];
      }
    }
    if (!PARADO && melhor) {
      const dx = melhor[0] - cx, dy = melhor[1] - cy;
      const px = (v * dt) / 1000, py = ((dy < 0 ? vSobe : vDesce) * dt) / 1000;
      const mx = flap ? Math.max(-px, Math.min(px, dx)) : dx, my = flap ? Math.max(-py, Math.min(py, dy)) : dy;
      const h = Math.hypot(mx, my), passo = (v * dt) / 1000;
      const k = flap ? 1 : h > passo ? passo / h : 1;
      sc.ship.setPosition(sc.ship.x + mx * k, sc.ship.y + my * k);
      nb.setVelocity(0, 0);
    }
    // fire with the weak point on the line, never into the Beast's open thirst
    const sede = !!b.predador?.sedeAberta;
    atirar(!!p && p.x > cx && Math.abs(cy - p.y) < 12 && !sede);
  });
}, { REACAO, PARADO });
let teto = false;
for (;;) {
  const o = await olhar(page);
  if (o.morto) break;
  if (o.t > TETO) { teto = true; break; }
  await page.waitForTimeout(500);
}
await page.waitForTimeout(300);
const { resumo, mortes } = await page.evaluate(() => ({ resumo: window.__registro.resumo(), mortes: window.__mortes }));
imprimir(`piloto${PARADO ? ' PARADO' : ''} · ${chefe} · ${mao} · reação ${REACAO} ms`, resumo);
console.log(`mortes: ${mortes}`);
if (erros.length) console.log('ERROS NO CONSOLE:', erros.slice(0, 3));
if (FOTOS) fs.writeFileSync(`${FOTOS}/fotos.json`, JSON.stringify(fotos, null, 1));
if (saida) fs.writeFileSync(saida, JSON.stringify({ robo: PARADO ? 'parado' : 'piloto', chefe, mao, reacao: REACAO, teto, mortes, resumo, erros: erros.slice(0, 5) }, null, 1));
await browser.close();
process.exit(0);
