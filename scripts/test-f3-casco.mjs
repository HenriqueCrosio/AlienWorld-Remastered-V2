// The living casco of the F3 (round 2, plan `plans/2026-11-08-cenario-casco-rodada2.md`): the numbers, the physics (in
// the vacuum nothing falls) and the copper measured on the real pieces.   node scripts/test-f3-casco.mjs
import sharp from 'sharp';
import { PULSO, intensidadePulso, ehCobre, RESPIROS, VAPOR, FAISCAS, VAPOR_PARTICULA, COR_PULSO, COR_BRILHO } from '../src/f3/numerosCascoF3.ts';

let falhas = 0;
const ok = (c, m) => { console.log(`${c ? '✔' : '✘'} ${m}`); if (!c) falhas++; };
const perto = (a, b) => Math.abs(a - b) < 1e-9;

// ── the pulse
for (const r of ['casco', 'arena']) {
  const p = PULSO[r];
  ok(perto(intensidadePulso(p.v * 3, 3, p), p.pico), `${r}: the peak at x = v·t (${p.pico})`);
  ok(intensidadePulso(p.v * 3 + p.lambda / 2, 3, p) === 0, `${r}: dark half a wavelength away`);
}
ok(PULSO.arena.v < PULSO.casco.v && PULSO.arena.pico < PULSO.casco.pico, 'the arena pulse is slower and weaker');

// ── the copper
ok(ehCobre(196, 128, 72), 'copper is copper');
ok(!ehCobre(214, 208, 186), 'bone is not copper');
ok(!ehCobre(40, 50, 60), 'the dark plate is not copper');
const MEDIDO = { placa: 365, escama: 160, costela: 77, costela2: 498, duto: 671, duto2: 563 };
for (const [f, n] of Object.entries(MEDIDO)) {
  const { data } = await sharp(`public/sprites/casco-${f}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let c = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128 && ehCobre(data[i], data[i + 1], data[i + 2])) c++;
  ok(c === n, `casco-${f}: ${c} copper px (measured ${n})`);
}

// ── the vents
const PECAS = ['cascoPlaca', 'cascoEscama', 'cascoCostela', 'cascoCostela2', 'cascoDuto', 'cascoDuto2'];
for (const [k, vs] of Object.entries(RESPIROS)) {
  ok(PECAS.includes(k), `vents on a real piece: ${k}`);
  ok(vs.every((v) => v.x >= 0 && v.x < 114 && v.y >= 0 && v.y < 66), `${k}: every vent inside 114×66`);
}
ok(VAPOR.arena.porSeg === 0, 'no vapour in the final fight (round 2: "pode sumir na luta final")');

// ── the colours: no warning red, no free-lane white-blue
const lum = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const proibida = (c) => (c[0] > 200 && c[1] < 80) || (c[2] > c[0] && lum(c) > 0.8);
for (const [nome, c] of [['pulse', COR_PULSO], ['glow', COR_BRILHO],['flash', FAISCAS.flash], ...FAISCAS.rampa.map((c, i) => [`spark ${i}`, c]), ...VAPOR_PARTICULA.rampa.map((c, i) => [`vapour ${i}`, c])]) {
  ok(!proibida(c), `${nome} [${c}] is neither warning red nor free-lane white-blue`);
}

// ── the simulation (task 2)
let Efeitos = null;
try { ({ EfeitosCasco: Efeitos } = await import('../src/f3/efeitosCasco.ts')); } catch { ok(false, 'efeitosCasco.ts exists'); }
if (Efeitos) {
  const { CAMADA_CASCO } = await import('../src/f3/numerosCascoF3.ts');
  const W = 384, H = CAMADA_CASCO.h;
  // a fake duto piece: plate pixels, a copper row, a flat top
  const mascara = (() => {
    const w = 114, h = 66, px = new Uint8ClampedArray(w * h * 4), cobre = [], topo = new Int16Array(w);
    for (let i = 0; i < w * h; i++) { px[i * 4] = 40; px[i * 4 + 1] = 50; px[i * 4 + 2] = 60; px[i * 4 + 3] = 255; }
    for (let x = 0; x < w; x++) { cobre.push(x, 30, 196, 128, 72); topo[x] = 0; }
    return { w, h, px, cobre: Int16Array.from(cobre), topo };
  })();
  const pecas = [0, 1, 2, 3].map((i) => ({ id: i, key: 'cascoDuto', x0: i * 100 - 10, y0: 150, mascara }));
  const rombo = { buraco: [140, 178], crista: 151 };
  const ef = new Efeitos(7);
  const out = new Uint8ClampedArray(W * H * 4);
  let cai = 0, torta = 0, faiscasCasco = 0, faiscasArena = 0, faiscasFechado = 0, vapores = 0;
  const olha = (fase) => {
    // (in the hull's frame: the jet only slows — it never turns down, never speeds up)
    for (const p of ef.vapor) { if (p.vy > 0 || Math.hypot(p.vx, p.vy) > p.v0 + 1e-9) cai++; vapores++; }
    for (const f of ef.faiscas) { if (Math.abs(Math.atan2(f.vy, f.vx) - f.ang) > 1e-6) torta++; }
    if (fase === 'casco') faiscasCasco += ef.faiscas.length;
    if (fase === 'arena') faiscasArena += ef.faiscas.length;
    if (fase === 'fechado') faiscasFechado += ef.faiscas.length;
  };
  for (let i = 0; i < 300; i++) { ef.passo(1 / 30, pecas, rombo); ef.desenhar(out); olha('casco'); }
  ef.regime('arena', 0);
  for (let i = 0; i < 300; i++) { ef.passo(1 / 30, pecas, rombo); ef.desenhar(out); olha('arena'); }
  for (let i = 0; i < 60; i++) ef.passo(1 / 30, pecas, rombo);
  ef.faiscas.length = 0;
  for (let i = 0; i < 300; i++) { ef.passo(1 / 30, pecas, null); olha('fechado'); }
  ok(vapores > 0, `vapour breathed (${vapores} particle-frames)`);
  ok(cai === 0, `no vapour particle ever turns down or speeds up (${cai})`);
  ok(torta === 0, `every spark flies straight (${torta})`);
  ok(faiscasCasco === 0, 'no sparks on the casco (Act 2)');
  ok(faiscasArena > 0, `sparks at the open breach in the arena (${faiscasArena})`);
  ok(faiscasFechado === 0, 'no sparks without the open breach');
  let lit = 0;
  for (let i = 3; i < out.length; i += 4) if (out[i]) lit++;
  ok(lit > 0 && out.length === W * H * 4, `draws inside the buffer (${lit} px lit)`);
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
