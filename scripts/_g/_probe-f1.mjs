// BLOCO G · the round-1 probe: the F1 horizon is up, the old layers are gone, the painting drifts by the stage clock,
// the beacons blink, and the atmosphere exit fades the horizon. Needs `npm run dev` on :5173.
//   node scripts/_g/_probe-f1.mjs
import { chromium } from 'playwright';

let falhas = 0;
const ok = (c, msg, visto) => { console.log(`${c ? '✔' : '✘'} ${msg}${c ? '' : ` — visto: ${JSON.stringify(visto)}`}`); if (!c) falhas++; };
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
const erros = [];
page.on('pageerror', (e) => erros.push(e.message));
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(800);
await page.evaluate(() => window.__game.scene.getScene('Menu').scene.start('Game', { stage: 1, handling: 'free' }));
await page.waitForFunction(() => (window.__game.scene.getScene('Game')?.elapsed ?? 0) > 0.5, null, { timeout: 30000 });

const r = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const p = s.parallax;
  return {
    temHorizonte: !!p.horizonte,
    objetos: p.horizonte?.objetos.length ?? 0,
    farois: p.horizonte?.farois.length ?? 0,
    chaves: p.layers.map((l) => l.key),
    brumas: p.brumaF1.length,
    pinturaTextura: p.horizonte?.pintura.texture.key,
    pinturaLarg: p.horizonte?.pintura.width,
  };
});
ok(r.temHorizonte, 'o horizonte da F1 está montado', r);
ok(r.pinturaTextura === 'f1-pintura' && r.pinturaLarg === 429, 'a pintura inteira, 429 de largura, em escala 1', r);
ok(r.farois >= 4, 'os faróis das torres estão no rig', r.farois);
ok(r.brumas === 2, 'duas bandas de bruma entre os planos', r.brumas);
const velhas = ['skyline', 'colonyLight', 'cometSky', 'mtnMid', 'enemyScout', 'asteroid'];
ok(!r.chaves.some((k) => velhas.includes(k)), 'as camadas antigas saíram (skyline, luzes ciano, cometa, mtnMid, tráfego, entulho)', r.chaves);
// Round 5 — the ground: his two paintings as seamless strips, the cordilheira and the old tiled ground gone.
const chao = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  return {
    faixas: p.chao.faixas.map((c) => ({ chave: (c.ts.displayTexture ?? c.ts.texture).key, depth: c.ts.depth, fator: c.fator, y: c.ts.y, h: c.ts.height })),
    groundVelho: !!p.ground,
    frenteVelha: !!p.groundFront,
  };
});
ok(!r.chaves.some((k) => k.startsWith('f1Cordilheira')), 'a cordilheira recortada da pintura saiu', r.chaves);
ok(!chao.groundVelho && !chao.frenteVelha, 'o ladrilho do chão e a faixa tingida saíram', chao);
ok(chao.faixas.map((f) => f.chave).join() === 'f1-chao-vale,f1-chao-paisagem,f1-chao-frente,f1-chao-perto', 'as quatro faixas do chão, na ordem dele (Vale, Paisagem, frente) e o primeiro plano', chao.faixas);
ok(chao.faixas.every((f) => f.y + f.h === 216), 'todas chegam ao rodapé', chao.faixas);
ok(!r.chaves.includes('spire'), 'o pico de gelo tingido saiu do primeiro plano', r.chaves);

// The embers flicker by thirds (their overlays' alpha changes with the clock) and the Valle's fires smoke.
const vivo = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const p = s.parallax;
  const alfas = (t) => { p.setRelogio(t); p.update(0, 0); return p.chao.faixas.slice(0, 2).flatMap((f) => f.brasas.map((b) => +b.alpha.toFixed(3))); };
  const a = alfas(3), b = alfas(4.7);
  const fumacas = s.children.list.filter((o) => o.texture?.key === 'f1-fumaca' && o.depth > -88 && o.depth < -87.9).length;
  // The foreground strip leaves for the boss fight, like the old foreground did.
  p.setForegroundDimmed(true, 10);
  return { a, b, fumacas };
});
ok(vivo.a.length === 6 && vivo.a.some((x, i) => x !== vivo.b[i]), 'as brasas das duas pinturas tremulam (3 terços cada)', vivo);
ok(vivo.fumacas >= 2, 'os fogos das torres do Vale soltam fumaça', vivo.fumacas);
await page.waitForTimeout(300);
const pertoDim = await page.evaluate(() => { const p = window.__game.scene.getScene('Game').parallax; p.update(0, 0); const a = p.chao.faixas[3].ts.alpha; p.setForegroundDimmed(false, 10); return a; });
ok(pertoDim < 0.05, 'o primeiro plano some na luta do chefão', pertoDim);
await page.waitForTimeout(300);
await page.evaluate(() => window.__game.scene.getScene('Game').parallax.update(0, 0));

// The planting: spawned props land with their foot inside the strip and are drawn by depth.
const plantio = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const antes = new Set(s.terrain.props.getChildren());
  for (let i = 0; i < 12; i++) s.terrain.spawn(['building', 'silo', 'radar', 'turret', 'spire', 'wreck'][i % 6]);
  const novos = s.terrain.props.getChildren().filter((o) => !antes.has(o));
  return novos.map((o) => ({ y: Math.round(o.y), depth: o.depth }));
});

// Round 6 — the dark structures: 40 spawns of each kind, each on frame 0 of its strip (the hitbox from the FRAME, not
// the strip), the lit ones playing their `-luz`, inside the box of their kind, the rock at scale 1 on a baked height,
// and every turret's measured muzzle inside its art.
const pecas = await page.evaluate(() => {
  const s = window.__game.scene.getScene('Game');
  const CAIXA = { building: [64, 64], silo: [63, 64], radar: [64, 57], base: [128, 128], turret: [32, 30], wreck: [58, 34], spire: [54, 76] };
  const antes = new Set(s.terrain.props.getChildren());
  for (const k of Object.keys(CAIXA)) for (let i = 0; i < 40; i++) s.terrain.spawn(k);
  const novos = s.terrain.props.getChildren().filter((o) => !antes.has(o));
  const ruins = [];
  const alturas = new Set(), texturas = new Set();
  let comLuz = 0;
  for (const o of novos) {
    const k = o.getData('kind'), [cw, ch] = CAIXA[k];
    texturas.add(o.texture.key);
    if (o.frame.width > cw || o.frame.height > ch) ruins.push(`${o.texture.key} ${o.frame.width}×${o.frame.height} fora da caixa ${cw}×${ch}`);
    if (o.texture.frameTotal > 2 && !/^\d+$/.test(String(o.frame.name))) ruins.push(`${o.texture.key} nasceu fora do quadro 0 (${o.frame.name})`);
    if (s.anims.exists(`${o.texture.key}-luz`)) { comLuz++; if (!o.anims.isPlaying) ruins.push(`${o.texture.key} sem a luz tocando`); }
    if (k === 'spire') { alturas.add(o.displayHeight); if (o.scaleY !== 1) ruins.push(`pilar esticado (${o.scaleY})`); }
    if (Math.abs(o.body.width - o.frame.width * 0.6) > 1 || Math.abs(o.body.height - o.frame.height) > 1) ruins.push(`${o.texture.key}: corpo ${o.body.width}×${o.body.height} não sai do quadro`);
    const b = o.getData('bocaArte');
    if (k === 'turret' && (!b || Math.abs(b[0]) > o.frame.width / 2 || b[1] < 0 || b[1] >= o.frame.height)) ruins.push(`${o.texture.key}: boca ${b} fora da arte`);
  }
  for (const o of novos) o.destroy();
  return { ruins, alturas: [...alturas].sort((a, b) => a - b), texturas: texturas.size, comLuz };
});
ok(pecas.ruins.length === 0, 'as peças novas: no quadro 0, dentro da caixa, com o corpo do quadro, a luz tocando e a boca da torre na arte', pecas.ruins.slice(0, 6));
ok(pecas.alturas[0] >= 34 && pecas.alturas[pecas.alturas.length - 1] <= 76 && pecas.alturas.length >= 4, 'o pilar em alturas assadas de 34 a 76 px (sem esticar)', pecas.alturas);
ok(pecas.texturas >= 30 && pecas.comLuz > 0, 'as variantes aparecem e as luzes tocam', pecas);
const pes = plantio.map((p) => p.y);
ok(pes.every((y) => y >= 204 && y <= 213), 'o pé de toda estrutura fica na faixa de plantio (204–213), escondido atrás da frente', pes);
ok(pes.every((y, i) => i === 0 || Math.abs(y - pes[i - 1]) >= 4), 'nunca dois vizinhos na mesma altura (salto mínimo de 4)', pes);
ok(plantio.every((p) => Math.abs(p.depth - (-0.5 - (213 - p.y) * 0.002)) < 1e-9), 'e quem está plantado mais à frente desenha por cima', plantio);
ok(new Set(pes).size >= 3, 'as alturas variam de verdade', pes);

// The drift, by the clock (not by real time).
const deriva = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const x = (t) => { p.setRelogio(t); p.update(0, 0); return p.horizonte.pintura.x; };
  return { t0: x(0), t55: x(55), t110: x(110), t300: x(300) };
});
ok(deriva.t0 === 0 && deriva.t110 === -45 && deriva.t300 === -45 && deriva.t55 < 0 && deriva.t55 > -45, 'a pintura deriva 45 px pelo relógio da fase e para', deriva);

// The beacons blink (1.4 s on every 2.3 s): over one cycle each one is seen both lit and off.
const pisca = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const vistos = p.horizonte.farois.map(() => new Set());
  for (let t = 0; t < 2.3; t += 0.05) {
    p.setRelogio(t);
    p.update(0, 0);
    p.horizonte.farois.forEach((f, i) => vistos[i].add(f.visible));
  }
  return vistos.every((v) => v.size === 2);
});
ok(pisca, 'cada farol acende e apaga dentro de um ciclo', pisca);

// Round 2 — the invasion: its pieces are up; by the silence (63 s) every window is off, and none is off at the start.
const inv = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  const apagadas = (t) => { p.setRelogio(t); p.update(0, 0); return p.horizonte.janelas.filter((j) => j.visible).length; };
  return { contagem: p.horizonte.invasao?.contagem, total: p.horizonte.janelas.length, em5: apagadas(5), em66: apagadas(66) };
});
ok(inv.contagem && inv.contagem.naves === 5 && inv.contagem.explosoes === 10 && inv.contagem.holofotes === 3 && inv.contagem.magenta >= 40, 'a invasão está montada (5 naves, 10 explosões, 3 holofotes, o magenta)', inv.contagem);
ok(inv.em5 === 0 && inv.em66 === inv.total, 'a colônia acesa aos 5 s e toda apagada aos 66 s', inv);

// The exit: the horizon fades out, the zero-G painting comes in.
await page.evaluate(() => window.__game.scene.getScene('Game').breakAtmosphere());
await page.waitForTimeout(2300);
const saida = await page.evaluate(() => {
  const p = window.__game.scene.getScene('Game').parallax;
  return { pintura: p.horizonte.pintura.alpha, bruma: p.brumaF1[0].ts.alpha, zeroG: p.zeroGBg?.alpha, chao: p.chao.faixas.map((c) => ({ a: c.ts.alpha, y: c.ts.y })) };
});
ok(saida.pintura < 0.05 && saida.bruma < 0.05 && saida.zeroG > 0.9, 'a saída apaga o horizonte e a bruma, e acende o zero-G', saida);
await page.waitForTimeout(400);
const caiu = await page.evaluate(() => window.__game.scene.getScene('Game').parallax.chao.faixas.map((c) => ({ a: c.ts.alpha, desceu: c.ts.y })));
const quedas = caiu.map((c, i) => c.desceu - chao.faixas[i].y);
ok(caiu.every((c) => c.a < 0.02), 'o chão some na saída', caiu);
ok(quedas[0] < quedas[1] && quedas[1] < quedas[2] && quedas[2] < quedas[3], 'e cai em parallax: o Vale desce menos que a Paisagem, que desce menos que a frente', quedas);
ok(erros.length === 0, 'nenhum erro de página', erros);

await browser.close();
console.log(falhas ? `\n${falhas} FALHA(S)` : '\nTUDO OK');
process.exit(falhas ? 1 : 0);
