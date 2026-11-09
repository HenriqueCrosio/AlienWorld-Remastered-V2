// BLOCO I, etapa 1 (09/11) — THE EXPLOSION RECIPES (spec `specs/2026-11-09-bloco-i-explosoes-design.md` §3 and §4b,
// plan `plans/2026-11-09-bloco-i-explosoes.md` Task 2). He liked the four concepts — *"vamos usar todos. misturando
// alguns quando for conveniente"* — so they are cut into four PARTS (the smoke, the fire, the plasma, the shards) and
// each explosion TYPE is a mix of them in a material's palette. Pure: age → drawing on a pixelfx painter placed at the
// burst's centre (the concepts' code, `_explosoes-conceitos.mjs`, unchanged in look). Baked by `_explosoes-assar.mjs`.
//   zona 'vac' — nothing rises or falls by weight: the ball opens, shards fly straight, smoke opens in a sphere;
//   zona 'atm' — the F1: the smoke and the fire tongues rise, sparks and shards fall.
import { createFx, fit, hex, mix, WHITE, TAU, rng, clamp, noise2 } from '../../../src/fx/pixelfx/core/index.js';
import { hotFirst, firePuff, spark, ember, solid } from '../../../src/fx/pixelfx/fx/fire/_lib.js';
import * as implosionFx from '../../../src/fx/pixelfx/fx/explosions/implosion.js';

export const TIPOS = ['perigo', 'metal', 'chefeFim', 'luz', 'biomec', 'carne', 'rocha', 'carta', 'implosao'];
/** the burst's radius R (px at scale 1), its time D (s) and the sheet cell; P/M/G cover `Fx.explode` sizes ≤1.25 / ≤2 / more */
export const TAMANHOS = { P: { R: 8, D: 0.55, cel: 60 }, M: { R: 15, D: 0.8, cel: 116 }, G: { R: 38, D: 1.2, cel: 264 } };
/** the F1 (the only atmosphere) has metal and rock only: the atmosphere version exists for the A, C and D families */
export const ZONAS_DO_TIPO = {
  perigo: ['vac', 'atm'], metal: ['vac', 'atm'], chefeFim: ['vac', 'atm'], rocha: ['vac'], luz: ['vac'], biomec: ['vac'],
  carne: ['vac'], carta: ['vac'], implosao: ['vac'],
};

// ─── the palettes (light only where there is energy) ───
const FOGO = fit(['#3a120e', '#7a1c14', '#b8281c', '#e8501c', '#ff8a2a', '#ffc23d', '#ffe26b', '#fff3a6', '#ffffff'], 9);
export const H = hotFirst(FOGO);
const FAISCA = [H[0], H[1], H[3], H[5]];
const BRASA = [H[2], H[4], H[6], hex('#2a1410')];
const tons = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, hex(v)]));
export const PALETAS = {
  metal: {
    fumo: tons({ contorno: '#0b0a0f', sombra: '#121017', corpo: '#1d1a24', luz: '#2c2834', aceso: '#383340' }),
    cacos: tons({ luz: '#6a6478', corpo: '#3c3a48' }),
  },
  rocha: {
    fumo: tons({ contorno: '#0d0c0b', sombra: '#1a1816', corpo: '#2a2724', luz: '#3a3632', aceso: '#4a4540' }),
    cacos: tons({ luz: '#5c5650', corpo: '#3a3632' }),
  },
  // flesh: no fire — a dark matter cloud, reddish
  carne: {
    fumo: tons({ contorno: '#0a0405', sombra: '#160809', corpo: '#240e0e', luz: '#341816', aceso: '#44201c' }),
    cacos: null,
  },
};
export const FUMO = PALETAS.metal.fumo;
export const CASCO = PALETAS.metal.cacos;
export const ease = (x) => 1 - Math.pow(1 - clamp(x), 3);
export const hash = (x, y, s) => { let h = (x * 374761393 + y * 668265263 + s * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return (h >>> 0) / 4294967296; };
const atm = (o) => o.zona === 'atm';

// ─── the SMOKE as one mass of lobes (three rounds to get here: discs = bolinhas; the mass lit as a whole = a rock; the
// Bayer fade = a checkerboard). Each pixel takes the light of the lobe that dominates it (a lit cap up-left, shade
// down-right), the rim of the mass dark, the contour cut by noise that drifts with time, thinning by erosion and, only
// at the very end, by noise dropout. Drawn FIRST: the fire and the shards go over it.
export function fumacaDensa(p, puffs, { fio = 0, t = 0, seed = 1, resta = 1, fumo = FUMO }) {
  if (!puffs.length || resta <= 0) return;
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of puffs) { x0 = Math.min(x0, q.x - q.r); y0 = Math.min(y0, q.y - q.r); x1 = Math.max(x1, q.x + q.r); y1 = Math.max(y1, q.y + q.r); }
  const corte = 0.22 + fio * 0.7;
  const o = Math.floor(t * 30);
  p.each(Math.floor(x0), Math.floor(y0), Math.ceil(x1), Math.ceil(y1), (x, y) => {
    let f = 0, best = null, bv = 0;
    for (const q of puffs) {
      const d2 = ((x - q.x) ** 2 + (y - q.y) ** 2) / (q.r * q.r);
      if (d2 >= 1) continue;
      const v = q.w * (1 - d2) * (1 - d2);
      f += v;
      if (v > bv) { bv = v; best = q; }
    }
    if (!best) return;
    f += (noise2(x * 0.15 + seed * 7.1, y * 0.15 - t * 0.9) - 0.5) * 0.5;
    if (f < corte) return;
    if (resta < 1 && hash(x, y, seed + (o >> 2)) > resta) return;
    const dx = (x - best.x) / best.r, dy = (y - best.y) / best.r, lado = -(dx + dy) * 0.7071;
    let c;
    if (f - corte < 0.07) c = fumo.contorno;
    else if (lado > 0.55) c = fumo.aceso;
    else if (lado > 0.2) c = fumo.luz;
    else if (lado < -0.35) c = fumo.sombra;
    else c = fumo.corpo;
    p.px(x, y, c);
  });
}

// ─── the PARTS. o = { R, D, seed, zona, pal, k } (k: the type's mix) ───

/** the smoke: 'leve' (A's, opening behind the fireball) or 'densa' (C's, heavy, lingering), plus extra puffs (the shards'
 *  trails). In the atmosphere each lobe rises (u² — it gathers speed) and the whole cloud drifts up. */
function parteFumaca(p, age, o, extra = []) {
  const { R, D, seed } = o, densa = o.k.fumaca === 'densa', rf = rng(seed, densa ? 23 : 21);
  const Dc = densa ? D * 1.5 : D;
  const nS = Math.round(densa ? 12 + R * 1.0 : 10 + R * 0.8), puffs = [...extra];
  const sobeTudo = atm(o) ? R * 0.4 * (age / D) : 0;
  for (let i = 0; i < nS; i++) {
    const a = rf.range(0, TAU);
    const dist = densa ? R * Math.sqrt(rf.next()) * rf.range(0.5, 1.4) : R * rf.range(0.6, 1.5);
    const t0 = D * (densa ? rf.range(0.14, 0.3) : rf.range(0.22, 0.38));
    const life = densa ? Dc * rf.range(0.8, 1.0) : D * rf.range(0.9, 1.2);
    const sz = R * (densa ? rf.range(0.24, 0.44) : rf.range(0.26, 0.46));
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life, d = densa ? dist * (0.35 + 0.65 * ease(u * 1.2)) : R * 0.35 + dist * ease(u * 1.2);
    const sobe = atm(o) ? R * 1.1 * u * u + sobeTudo : 0;
    puffs.push({ x: Math.cos(a) * d, y: Math.sin(a) * d - sobe, r: sz * (0.8 + 0.8 * ease(u * 2)), w: (densa ? 1.4 : 1.3) - 0.4 * u });
  }
  const ug = densa ? clamp((age - 0.25 * D) / (Dc * 1.05)) : clamp((age - 0.3 * D) / (1.15 * D));
  fumacaDensa(p, puffs, { fio: ug ** (densa ? 1.2 : 1.3), t: age, seed, resta: clamp((1 - ug) * 5), fumo: o.pal.fumo });
  // C's embers glowing in the smoke (not in flesh: it has no fire)
  if (densa && o.pal !== PALETAS.carne) {
    const nE = Math.round(5 + R * 0.35);
    for (let i = 0; i < nE; i++) {
      const a = rf.range(0, TAU), d0 = R * rf.range(0.2, 1.1), t0 = D * rf.range(0.25, 0.4), life = D * rf.range(0.4, 0.8);
      if (age < t0 || age > t0 + life) continue;
      const u = (age - t0) / life;
      ember(p, Math.cos(a) * d0, Math.sin(a) * d0 - (atm(o) ? R * 0.6 * u : 0), 1 - u, R > 20 ? 2 : 1, BRASA, i * 2.3 + age * 25);
    }
  }
}

/** flesh's burst (1st bake: it began empty and only grew as a blot): A's flung puffs in a dark MATTER ramp — no flash,
 *  no glow, no sparks: matter thrown out, not fire */
const MATERIA = hotFirst(fit(['#100506', '#220a0b', '#3a1212', '#561c18', '#702a22', '#86382a'], 6));
function parteMateria(p, age, o) {
  const { R, D, seed } = o, r = rng(seed, 13);
  const kc = 1 - age / (0.3 * D);
  if (kc > 0) firePuff(p, 0, 0, kc, R * 0.6, 0.2, MATERIA, 0, 0, 0);
  const n = Math.round(8 + R * 0.8);
  for (let i = 0; i < n; i++) {
    const a = r.range(0, TAU), dist = R * r.range(0.6, 1.6), life = D * r.range(0.25, 0.5), sz = R * r.range(0.16, 0.34);
    if (age > life) continue;
    const d = dist * (1 - Math.exp((-age * 5) / D));
    firePuff(p, Math.cos(a) * d, Math.sin(a) * d, 1 - age / life, sz, r.next() * 0.4, MATERIA, 0, Math.cos(a), Math.sin(a));
  }
}

/** the fire: the flash, the core, the flung flames (A's), the sparks. k.fogo scales it (0.2 = a rock's spark of fire). */
function parteFogo(p, age, o) {
  const { R, D, seed } = o, kf = o.k.fogo, r = rng(seed, 9);
  if (age < 0.07 && kf >= 0.5) { p.circle(0, 0, R * 0.5 * (1 + age * 8) * Math.min(1, kf), WHITE); p.glow(0, 0, R * 2.8, H[1], 0.9 * (1 - age / 0.07)); }
  const kc = 1 - age / (0.4 * D);
  if (kc > 0) firePuff(p, 0, atm(o) ? -R * 0.3 * (1 - kc) : 0, kc, R * 0.8 * Math.sqrt(kf), 0, H, 0.3, 0, atm(o) ? -1 : 0);
  const nF = Math.round((10 + R * 1.1) * kf);
  for (let i = 0; i < nF; i++) {
    const a = r.range(0, TAU), dist = R * r.range(0.7, 2.0), life = D * r.range(0.3, 0.65), sz = R * r.range(0.18, 0.42), d0 = R * r.range(0, 0.45);
    if (age > life) continue;
    const u = age / life, d = d0 + dist * (1 - Math.exp((-age * 4) / D));
    const y = Math.sin(a) * d - (atm(o) ? R * 0.5 * u * u : 0);
    firePuff(p, Math.cos(a) * d, y, 1 - u, sz, r.next() * 0.6, H, 0.2, atm(o) ? 0 : Math.cos(a), atm(o) ? -1 : Math.sin(a));
  }
  const nK = Math.round((8 + R * 0.8) * Math.max(0.4, kf));
  for (let i = 0; i < nK; i++) {
    const a = r.range(0, TAU), v = (R * r.range(5, 12)) / D, life = D * r.range(0.18, 0.45);
    if (age > life) continue;
    const d = v * age * (1 - (0.3 * age) / life), cai = atm(o) ? R * 2 * (age / D) ** 2 : 0;
    spark(p, Math.cos(a) * d, Math.sin(a) * d + cai, Math.cos(a) * v, Math.sin(a) * v + (atm(o) ? R * 4 * age / (D * D) : 0), 1 - age / life, FAISCA);
  }
  if (age < 0.5 * D) p.glow(0, 0, R * 3, H[3], 0.55 * kf * (1 - age / (0.5 * D)));
}

/** the plasma: B — a white core, a shell with a ragged edge running out and thinning, crackling arcs, floating embers */
function partePlasma(p, age, o) {
  const { R, D, seed } = o, r = rng(seed, 5), k = age / D;
  if (age < 0.06) { p.circle(0, 0, R * 0.7, WHITE); p.glow(0, 0, R * 3.2, H[1], 1); }
  const kc = 1 - k / 0.35;
  if (kc > 0) { solid(p, 0, 0, R * 0.55 * kc + 1, kc > 0.5 ? WHITE : H[1]); p.glow(0, 0, R * 1.8, H[2], 0.6 * kc); }
  const rs = R * (0.4 + 1.7 * ease(k * 1.3)), w = Math.max(0.8, R * 0.28 * (1 - k)), fade = clamp(1.25 - k * 1.25);
  if (fade > 0) {
    const ext = rs + w + 3;
    p.each(-ext, -ext, ext, ext, (x, y) => {
      const d = Math.hypot(x, y), th = Math.atan2(y, x);
      const re = rs * (1 + 0.14 * (noise2(Math.cos(th) * 2 + seed, Math.sin(th) * 2 + age * 3) - 0.5) * 2);
      const e = Math.abs(d - re);
      if (e > w) return;
      const heat = clamp(k * 1.3 + (e / w) * 0.35);
      p.dot(x, y, H[Math.min(H.length - 1, 1 + Math.floor(heat * (H.length - 3)))], fade * (1 - (e / w) * 0.5));
    });
    p.glowRing(0, 0, rs, w + 3, H[3], 0.35 * fade);
  }
  if (k < 0.6) {
    const q = Math.floor(age * 15), ra = rng(seed * 31 + q, 3), n = 3 + Math.round(R / 10);
    for (let i = 0; i < n; i++) {
      let a = ra.range(0, TAU), x0 = 0, y0 = 0;
      const steps = 4, len = rs * ra.range(0.6, 1);
      for (let s = 1; s <= steps; s++) {
        a += ra.range(-0.5, 0.5);
        const x1 = Math.cos(a) * (len * s) / steps, y1 = Math.sin(a) * (len * s) / steps;
        p.line(x0, y0, x1, y1, s < 3 ? H[1] : H[3]);
        x0 = x1; y0 = y1;
      }
    }
  }
  const nE = Math.round(6 + R * 0.4);
  for (let i = 0; i < nE; i++) {
    const a = r.range(0, TAU), v = (R * r.range(1.2, 2.4)) / D, t0 = D * r.range(0.2, 0.4), life = D * r.range(0.4, 0.7);
    if (age < t0 || age > t0 + life) continue;
    const d = R * 0.5 + v * (age - t0);
    ember(p, Math.cos(a) * d, Math.sin(a) * d, 1 - (age - t0) / life, R > 20 ? 2 : 1, BRASA, i * 1.7 + age * 30);
  }
}

/** the shards' state (D): where each one is, and its trail (puffs left behind, for the smoke) — falling in the atmosphere */
function estadoCacos(age, o) {
  const { R, D, seed } = o, r = rng(seed, 11), rf = rng(seed, 25);
  const nP = Math.round(5 + R * 0.35), trilhas = [], cacos = [];
  const cai = (t) => (atm(o) ? R * 3 * (t / D) ** 2 : 0);
  for (let i = 0; i < nP; i++) {
    const a = r.range(0, TAU), v = (R * r.range(2.2, 4.5)) / D, life = D * r.range(0.7, 1.1), s = Math.max(1, R * r.range(0.07, 0.14)), va = r.range(-9, 9), a0 = r.range(0, TAU);
    if (age > life) continue;
    const u = age / life, d = R * 0.3 + v * age;
    for (let j = 1; j <= 6; j++) {
      const ta = age - j * 0.05;
      if (ta < 0.08) break;
      const dd = R * 0.3 + v * ta;
      trilhas.push({ x: Math.cos(a) * dd, y: Math.sin(a) * dd + cai(ta), r: s * (1.5 + j * 0.3), w: clamp(1 - u * 0.7 - j * 0.08) * 1.3 });
    }
    cacos.push({ x: Math.cos(a) * d, y: Math.sin(a) * d + cai(age), s, ang: a0 + va * age, u, i });
  }
  // D's own small cloud (when the type has no smoke of its own, the trails still need a mass to belong to)
  const nS = Math.round(5 + R * 0.3);
  for (let i = 0; i < nS; i++) {
    const a = rf.range(0, TAU), dist = R * rf.range(0.5, 1.2), t0 = D * rf.range(0.22, 0.35), life = D * rf.range(0.7, 0.95), sz = R * rf.range(0.35, 0.55);
    if (age < t0 || age > t0 + life) continue;
    const u = (age - t0) / life;
    trilhas.push({ x: Math.cos(a) * dist * ease(u), y: Math.sin(a) * dist * ease(u) - (atm(o) ? R * 0.8 * u * u : 0), r: sz * (0.8 + 0.7 * ease(u * 2)), w: 1.3 - 0.4 * u });
  }
  return { trilhas, cacos };
}

function desenhaCacos(p, age, o, cacos) {
  const c0 = o.pal.cacos ?? CASCO;
  for (const c of cacos) {
    if (c.u > 0.75 && hash(c.i, Math.floor(age * 20), 3) > (1 - c.u) * 4) continue;
    const pts = [0, 2.1, 4.2].map((ofs, k) => [c.x + Math.cos(c.ang + ofs) * c.s * (k === 0 ? 1.4 : 1), c.y + Math.sin(c.ang + ofs) * c.s * (k === 0 ? 1.4 : 1)]);
    p.tri(pts[0][0], pts[0][1], pts[1][0], pts[1][1], pts[2][0], pts[2][1], Math.cos(c.ang) > 0 ? c0.luz : c0.corpo);
    if (c.u < 0.6 && o.k.fogo > 0.3) ember(p, c.x, c.y, 1 - c.u / 0.6, 1, BRASA, c.i * 1.3 + age * 30);
  }
}

// ─── the TYPES (spec §4b), drawn smoke → fire → plasma → shards ───
const RECEITAS = {
  perigo: { fumaca: 'leve', fogo: 1, plasma: false, cacos: false, pal: 'metal' }, // A
  metal: { fumaca: null, fogo: 0.6, plasma: false, cacos: true, pal: 'metal' }, // D (+ A's fire)
  chefeFim: { fumaca: 'densa', fogo: 1.2, plasma: false, cacos: true, pal: 'metal' }, // C closing A + D
  luz: { fumaca: null, fogo: 0, plasma: true, cacos: false, pal: 'metal' }, // B
  carta: { fumaca: null, fogo: 0, plasma: true, cacos: false, pal: 'metal' }, // B
  biomec: { fumaca: 'densa', fogo: 0, plasma: true, cacos: false, pal: 'metal' }, // B → C
  carne: { fumaca: 'densa', fogo: 0, plasma: false, cacos: false, pal: 'carne', materia: true }, // C of matter, no fire
  rocha: { fumaca: null, fogo: 0.2, plasma: false, cacos: true, pal: 'rocha' }, // D in stone
};

/** the implosion (the Aurora's death): the vendored `implosion`, in the fire ramp, stepped to `age`. Its `draw` takes
 *  the FRAME and places its own painter at opts.x/y, so the painter's current origin goes in. */
function implosao(p, age, o) {
  const fx = createFx(implosionFx, { x: p.tx, y: p.ty, palette: ['#3a120e', '#b8281c', '#ff8a2a', '#ffc23d', '#fff3a6', '#ffffff'], seed: o.seed });
  if (age > 0) fx.update(age);
  fx.draw(p.frame);
}

/** the drawing of a type in a zone: (p, age, { R, D, seed }) → void, at the painter's origin */
export function receita(tipo, zona) {
  if (tipo === 'implosao') return implosao;
  const k = RECEITAS[tipo];
  if (!k) throw new Error(`explosão sem receita: ${tipo}`);
  const pal = PALETAS[k.pal];
  return (p, age, o) => {
    const oo = { ...o, zona, pal, k };
    const cacos = k.cacos ? estadoCacos(age, oo) : null;
    if (k.fumaca) parteFumaca(p, age, oo, cacos?.trilhas ?? []);
    else if (cacos) fumacaDensa(p, cacos.trilhas, { fio: clamp((age - 0.25 * o.D) / o.D) ** 1.2, t: age, seed: o.seed, resta: clamp((1 - clamp((age - 0.25 * o.D) / o.D)) * 5), fumo: pal.fumo });
    if (k.materia) parteMateria(p, age, oo);
    if (k.fogo > 0) parteFogo(p, age, oo);
    if (k.plasma) partePlasma(p, age, oo);
    if (cacos) desenhaCacos(p, age, oo, cacos.cacos);
  };
}
