// 27/10 — THE MARKS UNDER REAL FIRE (his report from play: on the guardian the marks gather in one stain inside the
// body; on the tower he sees none; on the serpent the shots after the first head's death land on its stump). The
// probes before shot from a point OUTSIDE the body; here the ship parks on the left and the game's own bullets fly,
// overlap the boss's own hitboxes and call `bulletHitBoss` with the real `de`. It logs where each shot hit, where its
// mark went (bitmap px), how often the scar was reset, and photographs the boss.
//   node scripts/_inimigos/_sonda-tiro-real.mjs <torre|serpente|guardiao> <out-prefix> [tiros=60] [ate: then down to this life, the big bite]
import { chromium } from 'playwright';
import sharp from 'sharp';

const [QUEM, OUT, TIROS = '60', ATE] = process.argv.slice(2);
const STAGE = { torre: 1, serpente: 3, guardiao: 4 }[QUEM];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1152, height: 648 } });
const erros = [];
page.on('pageerror', (e) => { erros.push(String(e)); console.log('ERRO DE PÁGINA', String(e)); });
await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => window.__game?.scene?.isActive('Menu'), null, { timeout: 60000 });
await page.waitForTimeout(1200);
await page.evaluate((stage) => {
  const g = window.__game;
  g.scene.getScenes(true).forEach((s) => s.scene.stop());
  const velha = g.scene.getScene('Game');
  if (velha) velha.cartas = null;
  g.registry.set('cartas', []);
  g.registry.set('cartasCheckpoint', {});
  g.registry.set('destrocosVariantes', undefined);
  g.scene.start('Game', { stage, ship: 'humana', handling: 'diegetico', practice: true });
}, STAGE);
for (let k = 0; k < 600; k++) {
  const pronto = await page.evaluate(() => {
    const g = window.__game, s = g.scene.getScene('Game');
    if (!s?.cartas) return false;
    s.cartas.abrirMesa = () => {};
    if (g.scene.isActive('Cartas')) g.scene.stop('Cartas');
    if (g.scene.isPaused('Game')) g.scene.resume('Game');
    s.invulnerableUntil = 1e12;
    s.lives = 99;
    s.victory = () => {};
    return !!s.boss && !s.boss.entering;
  });
  if (pronto) break;
  if (k === 599) throw new Error('o chefão não chegou');
  await page.waitForTimeout(100);
}
const geo = await page.evaluate(() => {
  const r = window.__game.canvas.getBoundingClientRect();
  return { k: r.width / 384, l: r.left, t: r.top };
});

// the stepped clock, the instruments
await page.evaluate(() => {
  const g = window.__game, s = g.scene.getScene('Game'), d = s.destrocos;
  g.loop.sleep();
  window.__t = g.loop.now;
  window.__log = { acertos: [], resets: 0, marcas: [] };
  const cic0 = d.cicatrizDe.bind(d);
  let ultima = null;
  d.cicatrizDe = (sp, vis, m, c) => {
    const r = cic0(sp, vis, m, c);
    if (sp === s.boss?.sprite) {
      if (ultima && r !== ultima) window.__log.resets++;
      ultima = r;
    }
    return r;
  };
  const hit0 = s.bulletHitBoss.bind(s);
  s.bulletHitBoss = (b) => {
    if (b.active) window.__log.acertos.push({ x: Math.round(b.x), y: Math.round(b.y), de: s.deOndeVeio(b) });
    return hit0(b);
  };
  // where a mark's time goes (per inner step, summed over the whole run)
  window.__partes = {};
  for (const nome of ['emDia', 'aplicar', 'corpoDoSprite', 'visto', 'primeiroDaFaixa', 'anelUnido', 'cicatrizDe', 'furarNaCopia']) {
    const f0 = d[nome].bind(d);
    d[nome] = (...a) => {
      const t0 = performance.now();
      const r = f0(...a);
      const p = (window.__partes[nome] ??= { n: 0, ms: 0, max: 0 });
      const dt = performance.now() - t0;
      p.n++;
      p.ms += dt;
      p.max = Math.max(p.max, dt);
      return r;
    };
  }
  const marcar0 = d.marcar.bind(d);
  d.marcar = (sp, px, de, cl, mat, furo, o) => {
    const quadro = () => d.cicatrizes.get(sp)?.desgastes.get(d.idDoQuadro(sp));
    const antes = quadro()?.comido.slice();
    const t0 = performance.now();
    const onde = marcar0(sp, px, de, cl, mat, furo, o);
    (window.__log.ms ??= []).push(performance.now() - t0);
    const cic = d.cicatrizes.get(sp), q = quadro();
    if (!cic || !q) return onde;
    const novos = [];
    let naBorda = 0, dentro = 0;
    for (let k = 0; k < q.comido.length; k++) {
      if (!q.comido[k] || (antes && antes[k])) continue;
      const x = k % cic.w, y = Math.floor(k / cic.w);
      novos.push([x, y, q.comido[k]]);
      if (q.comido[k] !== 1) continue;
      // on the edge: the pixel on the shooter's side (the left) was not body before this hit
      const v = k - 1;
      const vivoAntes = x > 0 && q.bmp.cor[v] >>> 24 >= 128 && !(antes && antes[v]);
      if (vivoAntes) dentro++;
      else naBorda++;
    }
    const z = o?.zona;
    window.__log.marcas.push({
      de: { x: Math.round(de.x), y: Math.round(de.y) }, novos, w: cic.w, h: cic.h, naBorda, dentro,
      onde: onde && { x: Math.round(onde.x), y: Math.round(onde.y) },
      foraDaZona: z && onde ? Math.hypot(onde.x - z.x, onde.y - z.y) > z.r + 1 : false,
    });
    return onde;
  };
  // the floating bits in the frame shown now: 8-connected parts of the live body, away from the border, under 24 px
  window.__soltos = () => {
    const b = s.boss, sp = b.sprite, cic = d.cicatrizes.get(sp);
    const q = cic?.desgastes.get(d.idDoQuadro(sp));
    const bmp = q?.bmp ?? d.visto(sp);
    const w = bmp.w, h = bmp.h;
    const vivo = (k) => bmp.cor[k] >>> 24 >= 128 && !(q && q.comido[k]);
    const visto = new Uint8Array(w * h);
    let partes = 0, px = 0;
    for (let i = 0; i < w * h; i++) {
      if (visto[i] || !vivo(i)) continue;
      const pilha = [i], parte = [];
      visto[i] = 1;
      let borda = false;
      while (pilha.length) {
        const j = pilha.pop();
        parte.push(j);
        const x = j % w, y = (j - x) / w;
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) borda = true;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx, yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const u = yy * w + xx;
          if (!visto[u] && vivo(u)) { visto[u] = 1; pilha.push(u); }
        }
      }
      if (!borda && parte.length < 24) { partes++; px += parte.length; }
    }
    return { partes, px };
  };
  window.__passo = (n, mira) => {
    for (let i = 0; i < n; i++) {
      s.enemies.enemyBullets?.clear(true, true);
      s.enemies.enemies.clear(true, true);
      s.ship.setPosition(70, mira);
      s.ship.body.setVelocity(0, 0);
      if (i % 6 === 0) s.weapons.shoot(s.ship.x + 10, s.ship.y);
      window.__t += 1000 / 60;
      g.step(window.__t, 1000 / 60);
    }
  };
});

const estado = () => page.evaluate(() => {
  const s = window.__game.scene.getScene('Game'), b = s.boss, sp = b.sprite, bd = sp.body;
  const alvos = (b.targets ?? []).map((t) => ({ x: Math.round(t.body.center.x), y: Math.round(t.body.center.y), r: Math.round(t.body.halfWidth) }));
  return {
    sprite: { x: Math.round(sp.x), y: Math.round(sp.y), w: Math.round(sp.displayWidth), h: Math.round(sp.displayHeight), ox: sp.originX, oy: sp.originY, quadro: `${sp.frame.texture.key}:${sp.frame.name}`, fw: sp.frame.width, fh: sp.frame.height },
    corpo: { x: Math.round(bd.x), y: Math.round(bd.y), w: Math.round(bd.width), h: Math.round(bd.height), on: bd.enable },
    alvos,
    vida: b.destrocos?.vida,
    forma: b.destrocos?.forma,
    quem: b.destrocos?.quem,
  };
});

const foto = async (nome) => {
  const e = await estado();
  const L = Math.min(216, Math.max(e.sprite.w, e.sprite.h) * 1.15);
  const x = Math.max(0, Math.min(384 - L, e.sprite.x - L / 2)), y = Math.max(0, Math.min(216 - L, e.sprite.y - L / 2));
  const png = await page.screenshot({ clip: { x: geo.l + x * geo.k, y: geo.t + y * geo.k, width: L * geo.k, height: L * geo.k } });
  await sharp(png).resize(Math.round(L * 4), Math.round(L * 4), { kernel: 'nearest' }).png().toFile(`${OUT}-${nome}.png`);
};

if (QUEM === 'serpente') {
  // to the second head: the first one's life gone, the transition played out
  await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game');
    s.boss.damage(49.5);
  });
  for (let k = 0; k < 40; k++) {
    await page.evaluate(() => {
      const s = window.__game.scene.getScene('Game');
      const b = s.boss;
      if (b.destrocos.forma === 0) b.damage(1);
      window.__passo(10, 108);
    });
    if ((await estado()).forma === 1) break;
  }
  await page.evaluate(() => window.__passo(120, 108));
}
if (QUEM === 'guardiao' || QUEM === 'torre') await page.evaluate(() => window.__passo(30, 108));

const e0 = await estado();
console.log('antes', JSON.stringify(e0));
// aim: the serpent's live head; the guardian's eye; the tower in three heights
const miras = QUEM === 'serpente' ? [e0.alvos[0].y] : QUEM === 'guardiao' ? [e0.sprite.y - 10, e0.sprite.y, e0.sprite.y + 10] : [e0.sprite.y - 30, e0.sprite.y, e0.sprite.y + 25];
await foto('0-antes');
const soltos0 = await page.evaluate(() => window.__soltos());
let soltos2 = null;
const tiros = Number(TIROS);
for (let i = 0; i < tiros; i++) {
  await page.evaluate((m) => window.__passo(6, m), miras[i % miras.length]);
  if (i === Math.floor(tiros / 2)) await foto('1-meio');
}
await page.evaluate((m) => window.__passo(20, m), miras[0]);
await foto('2-fim');
const soltos1 = await page.evaluate(() => window.__soltos());
// the map of what is gone, over the frame shown now (4×): red = a mark, yellow = what fell, magenta = a bite
const mapa = async (nome) => {
  const m = await page.evaluate(() => {
    const s = window.__game.scene.getScene('Game'), d = s.destrocos, sp = s.boss.sprite;
    const q = d.cicatrizes.get(sp)?.desgastes.get(d.idDoQuadro(sp));
    if (!q) return null;
    return { w: q.bmp.w, h: q.bmp.h, cor: Array.from(q.bmp.cor), comido: Array.from(q.comido), quadro: d.idDoQuadro(sp), dx: q.dx, dy: q.dy };
  });
  if (!m) return;
  const raw = Buffer.alloc(m.w * m.h * 4);
  for (let k = 0; k < m.w * m.h; k++) {
    const c = m.cor[k] >>> 0, a = c >>> 24;
    let r = c & 255, g = (c >>> 8) & 255, b = (c >>> 16) & 255;
    const tipo = m.comido[k];
    if (tipo === 1) [r, g, b] = [255, 40, 40];
    else if (tipo === 2) [r, g, b] = [255, 230, 0];
    else if (tipo === 3) [r, g, b] = [255, 0, 255];
    const o = k * 4;
    raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; raw[o + 3] = tipo ? 255 : a >= 128 ? Math.round(a * 0.55) : 0;
  }
  await sharp(raw, { raw: { width: m.w, height: m.h, channels: 4 } }).resize(m.w * 4, m.h * 4, { kernel: 'nearest' }).flatten({ background: '#202830' }).png().toFile(`${OUT}-${nome}.png`);
  console.log(`mapa ${nome}: quadro ${m.quadro}, deslocado (${m.dx}, ${m.dy})`);
};
await mapa('mapa-fim');
if (ATE) {
  // down past the first big bite (the boss's first threshold), shooting on
  await page.evaluate((ate) => {
    const b = window.__game.scene.getScene('Game').boss;
    const d = b.destrocos;
    if (d.vida > ate) b.damage(b.hp !== undefined && b.maxHp ? (d.vida - ate) * b.maxHp : 1);
  }, Number(ATE));
  for (let k = 0; k < 60; k++) {
    const v = await page.evaluate(() => {
      const b = window.__game.scene.getScene('Game').boss;
      window.__passo(6, 108);
      return b.destrocos.vida;
    });
    if (v <= Number(ATE)) break;
    await page.evaluate(() => window.__game.scene.getScene('Game').boss.damage(1));
  }
  await page.evaluate(() => window.__passo(30, 108));
  await foto('3-mordida');
  await mapa('mapa-mordida');
  soltos2 = await page.evaluate(() => window.__soltos());
}
const e1 = await estado();
const log = await page.evaluate(() => window.__log);
const partes = await page.evaluate(() => window.__partes);
console.log('por dentro do motor (n, ms somados, máx):', Object.entries(partes).map(([k, p]) => `${k} ${p.n}× ${p.ms.toFixed(1)} máx ${p.max.toFixed(1)}`).join(' · '));
console.log('depois', JSON.stringify(e1));
console.log(`acertos ${log.acertos.length}, marcas ${log.marcas.length}, resets da cicatriz ${log.resets}`);
console.log('primeiras marcas (px do quadro, x y tipo)', JSON.stringify(log.marcas.slice(0, 6).map((m) => ({ de: m.de, onde: m.onde, novos: m.novos }))));
// where the marks gathered, in the drawn frame (columns × rows)
const xs = log.marcas.flatMap((m) => m.novos.map((p) => p[0])), ys = log.marcas.flatMap((m) => m.novos.map((p) => p[1]));
if (xs.length) console.log(`marcas em x ${Math.min(...xs)}–${Math.max(...xs)} e y ${Math.min(...ys)}–${Math.max(...ys)} de ${log.marcas[0].w}×${log.marcas[0].h}`);
const borda = log.marcas.reduce((a, m) => a + m.naBorda, 0), dentro = log.marcas.reduce((a, m) => a + m.dentro, 0);
console.log(`na borda ${borda}, por dentro ${dentro}; fora da zona ${log.marcas.filter((m) => m.foraDaZona).length}`);
const lentas = (log.ms ?? []).map((v, i) => [i, v]).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log('as marcas mais lentas (ordem, ms):', lentas.map(([i, v]) => `#${i} ${v.toFixed(1)}`).join(', '));
const ms = [...(log.ms ?? [])].sort((a, b) => a - b);
if (ms.length) console.log(`custo de uma marca: média ${(ms.reduce((a, b) => a + b, 0) / ms.length).toFixed(2)} ms, p95 ${ms[Math.floor(ms.length * 0.95)].toFixed(2)}, máx ${ms.at(-1).toFixed(2)}`);
console.log(`pixels soltos (partes < 24 px longe da borda do quadro): antes ${JSON.stringify(soltos0)}, depois das marcas ${JSON.stringify(soltos1)}${soltos2 ? `, depois da mordida ${JSON.stringify(soltos2)}` : ''}`);
await browser.close();
console.log(erros.length ? `ERROS: ${erros.join(' | ')}` : 'sem erro de página');