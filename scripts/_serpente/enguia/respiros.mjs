// 08/11 — Part B, step 3: THE BREATHERS (spec §1.3: "respiros nos anéis soltam jato nas curvas e nas arrancadas, na
// cor da luz do anel — a causa visível da curva no vácuo"), and his ask for this step: besides the effects, effects
// that HIDE the piece's and the motion's weak points. Measured first (`_enguia-respiros-medir.mjs`):
//   - the bends in motion: a body point turns at |v·κ| rad/s — the jets fire on the OUTER side of the bend (their push
//     turns her inward), and the inner side, squeezed, breathes gas out of its closing plates (it veils the fold where
//     the skin folds on itself: the way back's coil, κ up to 0.055 rad/px);
//   - the starts and the brakes (|accel| > 260 px/s²): the joints fire backwards (start) or forwards (brake);
//   - the roll in sight (the arrival's twist, the dive's turn-over): paired jets in opposite directions (the torque);
//   - the head's snaps (the way back's whip at 11 rad/s, the dive's turn-over at 9 rad/s): the neck's green vents burst
//     and a cloud of their gas veils the neck and the jaw through the snap — looked up AHEAD on the script;
//   - the post (10 s of straight body down the right edge, where the strip's repeat shows): she breathes — a wave runs
//     down her body every 2.4 s, each joint puffing as it passes and the ring's light swelling with it.
// The look: Sprite Fusion's / pixelfx's exhaust (`_referencias/pixelfx/src/fx/scifi/jetpack.js`, MIT, Hugo Duprez's
// method): a cone of heat torn by noise streaming down it, white at its heart, dark at its rim, its puffs cooling into
// gas — redrawn here in each ring's own light (green at the neck, the orange vein, the cyan tail). In the vacuum nothing
// rises or falls: the gas flies out, slows, swells and fades ([[fisica-do-lugar-nos-ataques]]).
import { LCG } from './numeros.mjs';
import { pose } from './corpo.mjs';
import { PESCOCO } from './arte.mjs';

// the light ramps: dark rim → the ring's light → white heart
export const RAMPAS = {
  verde: [[8, 28, 18], [20, 70, 40], [40, 140, 76], [96, 240, 136], [190, 255, 210], [245, 255, 248]],
  laranja: [[60, 16, 10], [140, 40, 20], [224, 80, 26], [255, 138, 42], [255, 214, 120], [255, 248, 220]],
  ciano: [[8, 24, 44], [18, 70, 110], [40, 140, 200], [88, 200, 255], [190, 236, 255], [245, 252, 255]],
};
// the spent gas: the ring's light gone grey
const GAS = {
  verde: [[96, 124, 112], [62, 80, 74]],
  laranja: [[116, 102, 94], [76, 66, 62]],
  ciano: [[96, 116, 134], [62, 76, 90]],
};
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const hash = (a, b, c) => { let h = (a * 374761393 + b * 668265263 + c * 2246822519) >>> 0; h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
// value noise, smooth, 0…1
function ruido(x, y, s) {
  const xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(xi, yi, s), b = hash(xi + 1, yi, s), c = hash(xi, yi + 1, s), d = hash(xi + 1, yi + 1, s);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

// the head's snaps along the fight, from the script (the game knows its path ahead too)
export function estalosDaCabeca(R, N, med, mord) {
  const dt = 1 / N.tela.fps, spans = [];
  let antes = null, a = null;
  for (let t = 0; t <= R.T; t += dt) {
    const C = pose(R, N, med, t, { mord }).cabeca;
    const vis = C.focinho.x > -2 && C.focinho.x < N.tela.W + 2 && C.focinho.y > -2 && C.focinho.y < N.tela.H + 2;
    let forte = false;
    if (antes && vis) {
      const giro = Math.abs(Math.atan2(Math.sin(C.ang - antes.ang), Math.cos(C.ang - antes.ang))) / dt;
      const rola = Math.abs(C.fi - antes.fi) / dt;
      forte = giro > 2.5 || rola > 3;
    }
    if (forte) { if (a && t - a.t1 < 0.2) a.t1 = t; else { a = { t0: t, t1: t }; spans.push(a); } }
    antes = C;
  }
  return spans.map((s) => ({ t0: s.t0 - 0.12, t1: s.t1 + 0.1 }));
}

export class Respiros {
  constructor(R, N, med, mord, { girada = true } = {}) {
    Object.assign(this, { R, N, med, mord, girada });
    this.jatos = []; this.gas = []; this.fluxo = []; this.espera = new Map(); this.rnd = LCG(20261108); this.rndG = LCG(811);
    this.estalos = estalosDaCabeca(R, N, med, mord);
    this.onda = null; this.ondaProx = 0; this.P = null; this.t = 0;
  }

  // the ring's light at body arc u (rings of 26 px: the neck's green vents, the orange vein, the cyan tail)
  rampa(u, nAneis) {
    const k = Math.floor(u / this.N.corpo.passo);
    return k < 4 ? 'verde' : k > nAneis - 5 ? 'ciano' : 'laranja';
  }

  amostra(u) {
    const T = this.P.tubo, i = Math.round((u + PESCOCO) / this.N.tubo.passo);
    return i >= 0 && i < T.length ? { q: T[i], i } : null;
  }

  visivel(q) { const N = this.N; return q && !q.toca && q.x > -4 && q.x < N.tela.W + 4 && q.y > -4 && q.y < N.tela.H + 4; }

  curvatura(i) {
    const T = this.P.tubo, a = T[i - 5], b = T[i + 5];
    if (!a || !b) return 0;
    const cr = a.dx * b.dy - a.dy * b.dx, dot = a.dx * b.dx + a.dy * b.dy;
    return Math.atan2(cr, dot) / (b.u - a.u);
  }

  // a jet's nozzle and heading now (it rides its spot on the body)
  onde(j) {
    const m = this.amostra(j.u);
    if (!m || !this.visivel(m.q)) return null;
    const q = m.q, nx = -q.dy, ny = q.dx;
    const cb = Math.cos(j.b), sb = Math.sin(j.b), tx = q.dx * j.sg, ty = q.dy * j.sg;
    let dx = nx * j.lado * cb - tx * sb, dy = ny * j.lado * cb - ty * sb;
    const m2 = Math.hypot(dx, dy) || 1; dx /= m2; dy /= m2;
    const r = Math.max(2, q.r - 1.5);
    return { x: q.x + nx * j.lado * r, y: q.y + ny * j.lado * r, dx, dy };
  }

  jato(u, lado, b, sg, len, vida, rampa, larg = 1.9, rng = null) {
    this.jatos.push({ u, lado, b, sg, len, vida, idade: 0, rampa, larg, semente: Math.floor((rng ?? this.rnd)() * 1e6), rng });
  }

  sopro(x, y, vx, vy, r0, r1, vida, rampa, a = 0.45) {
    this.gas.push({ x, y, vx, vy, r0, r1, vida, idade: 0, rampa, a });
  }

  pronto(chave, t) { return (this.espera.get(chave) ?? -1) <= t; }

  passo(t, dt, P) {
    const { R, N } = this, rnd = this.rnd;
    this.P = P; this.t = t;
    const s0 = R.estado(Math.max(0, t - dt)).s, s1 = R.estado(t).s, s2 = R.estado(t + dt).s;
    const v = (s2 - s0) / (2 * dt), acel = ((s2 - s1) - (s1 - s0)) / (dt * dt), sg = v >= 0 ? 1 : -1;
    const n = P.nAneis, passo = N.corpo.passo;
    const juntas = [];
    for (let k = 1; k < n; k++) { const m = this.amostra(k * passo); if (m && this.visivel(m.q)) juntas.push({ k, u: k * passo, ...m }); }

    // 1 · the bends in motion: outer side jets, inner side squeezed gas
    // (5th look: many vents firing weakly at once read as grass — a jet reads when it is FEW and strong: at most 3 bend
    // jets at a time, on the joints turning hardest)
    const nCurva = this.jatos.filter((j) => j.tipo === 'curva').length;
    const curvas = Math.abs(v) > 20 ? juntas.map((J) => ({ J, kap: this.curvatura(J.i) })).map((c) => ({ ...c, w: Math.abs(v * c.kap) })).filter((c) => c.w >= 1.2).sort((a, b) => b.w - a.w) : [];
    let vagas = 3 - nCurva;
    for (const { J, kap, w } of curvas) {
      const ch = `c${J.k}`;
      if (vagas > 0 && this.pronto(ch, t) && rnd() < Math.min(0.5, w * 0.12)) {
        const vida = 0.3 + rnd() * 0.2;
        this.jato(J.u, kap > 0 ? -1 : 1, 0.35, sg, 9 + 9 * Math.min(1, w / 3.5), vida, this.rampa(J.u, n));
        this.jatos.at(-1).tipo = 'curva';
        this.espera.set(ch, t + vida + 0.25 + rnd() * 0.3);
        vagas--;
      }
      if (Math.abs(kap) > 0.04 && rnd() < 0.35) { // the fold: the inner plates close and breathe out
        const q = J.q, li = kap > 0 ? 1 : -1, nx = -q.dy * li, ny = q.dx * li, r = q.r - 2;
        this.sopro(q.x + nx * r, q.y + ny * r, nx * (14 + rnd() * 14) + (rnd() - 0.5) * 10, ny * (14 + rnd() * 14) + (rnd() - 0.5) * 10, 2, 7 + rnd() * 4, 0.8 + rnd() * 0.5, this.rampa(J.u, n), 0.42);
      }
    }
    // 2 · the starts (backwards) and the brakes (forwards)
    const arranca = acel * sg > 260 && Math.abs(v) > 15, freia = acel * sg < -260 && Math.abs(v) > 15;
    if (arranca || freia) for (const J of juntas) {
      if (J.k % 3 !== (arranca ? 1 : 2)) continue; // (every 3rd joint, both sides)
      const ch = `a${J.k}`;
      if (!this.pronto(ch, t)) continue;
      const vida = arranca ? 0.45 + rnd() * 0.15 : 0.3 + rnd() * 0.1;
      for (const lado of [-1, 1]) this.jato(J.u, lado, arranca ? 0.75 : -0.7, sg, arranca ? 14 + rnd() * 5 : 10 + rnd() * 4, vida, this.rampa(J.u, n));
      this.espera.set(ch, t + 0.8);
    }
    // 3 · the roll in sight: paired jets in opposite directions
    if (Math.abs(v) > 30) for (const J of juntas) {
      const fi = J.q.fi;
      if (fi < 0.35 || fi > Math.PI - 0.35 || J.k % 2) continue;
      const ch = `r${J.k}`;
      if (!this.pronto(ch, t) || rnd() > 0.3) continue;
      for (const lado of [-1, 1]) this.jato(J.u, lado, lado * 0.6, sg, 5 + rnd() * 3, 0.2, this.rampa(J.u, n), 1.6);
      this.espera.set(ch, t + 0.3);
    }
    // 3½ · (8 Nov, his note on the 1st round: "mais fumaça ou efeito na girada do início, para esconder um pouco a
    // esticada que o desenho faz ao girar" — ONLY the arrival's roll) where her body is mid-roll (the back sliding
    // across her face, where the drawing stretches), the vents there pour thick gas out of both edges and fire in pairs.
    // Its own dice (`rndG`, and the jets carry it), so the rest of the fight draws exactly as approved
    if (this.girada && P.e.trecho.cap === 'chegada' && Math.abs(v) > 30) {
      const r2 = this.rndG, T = P.tubo;
      for (let i = 0; i < T.length; i += 3) {
        const q = T[i];
        if (!this.visivel(q)) continue;
        const m = Math.sin(q.fi);
        if (m < 0.35 || r2() > 0.16 * m) continue;
        const lado = r2() < 0.5 ? -1 : 1, nx = -q.dy * lado, ny = q.dx * lado, vv = 12 + r2() * 22, tr = -sg * (10 + r2() * 20);
        this.sopro(q.x + nx * (q.r - 1), q.y + ny * (q.r - 1), nx * vv + q.dx * tr, ny * vv + q.dy * tr, 3, 9 + r2() * 6, 1.1 + r2() * 0.6, this.rampa(q.u, n), 0.62);
      }
      for (const J of juntas) {
        const m = Math.sin(J.q.fi);
        if (m < 0.5) continue;
        const ch = `g${J.k}`;
        if (!this.pronto(ch, t) || r2() > 0.5) continue;
        for (const lado of [-1, 1]) { this.jato(J.u, lado, lado * 0.6, sg, 9 + r2() * 4, 0.28, this.rampa(J.u, n), 1.8, r2); }
        this.espera.set(ch, t + 0.2);
      }
    }
    // 4 · the head's snaps: the neck's vents burst and veil it
    const estalo = this.estalos.find((e) => t >= e.t0 && t <= e.t1);
    if (estalo) {
      const ini = t - estalo.t0 < dt * 1.5;
      for (const u of [-16, 20]) {
        const m = this.amostra(u);
        if (!m) continue;
        const q = m.q;
        if (ini) for (const lado of [-1, 1]) this.jato(u, lado, 0.2, sg, 14 + rnd() * 4, estalo.t1 - estalo.t0 + 0.1, 'verde', 2.2); // (one jet held through the snap)
        const k = Math.min(1, (t - estalo.t0) / 0.12) * Math.min(1, (estalo.t1 - t) / 0.12 + 0.3);
        // (7th look: puffs born on her middle read as dirt on the plates — they leave her OUTLINE, outward)
        if (rnd() < 0.8 * k) {
          const lado = rnd() < 0.5 ? -1 : 1, nx = -q.dy * lado, ny = q.dx * lado, vv = 20 + rnd() * 30;
          this.sopro(q.x + nx * q.r, q.y + ny * q.r, nx * vv + (rnd() - 0.5) * 16, ny * vv + (rnd() - 0.5) * 16, 2.5, 7 + rnd() * 4, 0.6 + rnd() * 0.4, 'verde', 0.5);
        }
      }
    }
    // 5 · at rest (the post): she breathes — a wave down her body, each joint puffing as it passes
    const parada = Math.abs(v) < 30 && juntas.length >= 3;
    if (parada && !this.onda && t >= this.ondaProx) this.onda = { t0: t, ultimo: 0 };
    if (this.onda) {
      const U = -30 + 150 * (t - this.onda.t0);
      for (const J of juntas) if (J.k > this.onda.ultimo && J.u <= U) {
        this.onda.ultimo = J.k;
        for (const lado of [J.k % 2 ? 1 : -1]) {
          this.jato(J.u, lado, 0.15, 1, 7 + rnd() * 3, 0.3, this.rampa(J.u, n), 1.5);
          const q = J.q, nx = -q.dy * lado, ny = q.dx * lado;
          this.sopro(q.x + nx * q.r, q.y + ny * q.r, nx * (16 + rnd() * 10), ny * (16 + rnd() * 10), 1.5, 6 + rnd() * 3, 0.9 + rnd() * 0.4, this.rampa(J.u, n), 0.38);
        }
      }
      if (U > n * passo + 20) { this.onda = null; this.ondaProx = t + 2.4; }
    }
    this.onda && (this.onda.U = -30 + 150 * (t - this.onda.t0));

    // the jets are emitters (3rd look: any still shape this small read as a spike or a crystal — the motion is what sells
    // a jet): each frame a stream of pixels leaves the vent along its heading, hot as it leaves, cooling to gas; the
    // spent stream sheds a puff at its end
    for (const j of this.jatos) {
      j.idade += dt;
      const o = this.onde(j);
      if (!o) continue;
      // (6th look: the nozzle rides her at up to 230 px/s and the stream left behind combed out in parallel streaks — in
      // the vacuum the gas leaves with the nozzle's own velocity plus the jet's, so the plume travels WITH her; the
      // streak is drawn along the jet's own heading)
      let bx = j.ox != null ? (o.x - j.ox) / dt : 0, by = j.oy != null ? (o.y - j.oy) / dt : 0;
      if (Math.hypot(bx, by) > 600) bx = by = 0; // (back in sight after a gap: no jump)
      j.ox = o.x; j.oy = o.y;
      const d = j.rng ?? rnd; // (the arrival roll's jets roll their own dice)
      const env = this.envelope(j), vel = j.len * 9, nq = Math.round((2 + j.len / 3) * env * (0.7 + d() * 0.6));
      for (let i = 0; i < nq; i++) {
        const ab = (d() - 0.5) * 0.25, c = Math.cos(ab), s = Math.sin(ab), ux = o.dx * c - o.dy * s, uy = o.dx * s + o.dy * c, vv = vel * (0.6 + d() * 0.6);
        const a0 = d() * dt; // (spread over the frame, so the stream has no gaps)
        this.fluxo.push({ x: o.x + ux * vv * a0, y: o.y + uy * vv * a0, vx: ux * vv + bx, vy: uy * vv + by, ex: ux * vv, ey: uy * vv, idade: a0, vida: 0.1 + d() * 0.12, rampa: j.rampa });
      }
      if (j.idade / j.vida > 0.4 && d() < 0.35) { const L = j.len; this.sopro(o.x + o.dx * L, o.y + o.dy * L, o.dx * (25 + d() * 20) + (d() - 0.5) * 12, o.dy * (25 + d() * 20) + (d() - 0.5) * 12, 1.2, 3.5 + d() * 2.5, 0.45 + d() * 0.35, j.rampa, 0.4); }
    }
    for (const p of this.fluxo) { p.idade += dt; p.x += p.vx * dt; p.y += p.vy * dt; const k = Math.max(0, 1 - 3 * dt); p.vx *= k; p.vy *= k; p.ex *= k; p.ey *= k; }
    this.fluxo = this.fluxo.filter((p) => p.idade < p.vida);
    this.jatos = this.jatos.filter((j) => j.idade < j.vida && j.u < n * passo + 4);
    for (const g of this.gas) {
      g.idade += dt; g.x += g.vx * dt; g.y += g.vy * dt;
      const k = Math.max(0, 1 - 2.2 * dt); g.vx *= k; g.vy *= k; // (slowing, never falling)
    }
    this.gas = this.gas.filter((g) => g.idade < g.vida);
  }

  // the light swelling on the ring under a firing jet, and the rest wave's glow
  luz(u) {
    let g = 0;
    for (const j of this.jatos) {
      const d = Math.abs(u - j.u);
      if (d < 12) g += 0.9 * this.envelope(j) * (1 - d / 12);
    }
    if (this.onda?.U != null) g += 0.7 * Math.exp(-(((u - this.onda.U) / 16) ** 2));
    return 1 + Math.min(1.2, g);
  }

  envelope(j) { const k = j.idade / j.vida; return j.idade < 0.04 ? j.idade / 0.04 : k > 0.6 ? Math.max(0, 1 - (k - 0.6) / 0.4) : 1; }

  desenha(put) {
    const t = this.t;
    // the gas: loose pixels, not a sheet (1st look: a translucent disc read as a tint laid over her — the "cover on top"
    // he vetoed): each puff is a scatter that thins from its middle out and over its life, lit up-left, near grey
    for (const g of this.gas) {
      const k = g.idade / g.vida, r = g.r0 + (g.r1 - g.r0) * (1 - (1 - k) ** 2), dens = g.a * 1.6 * (1 - k) ** 1.2;
      const [claro, escuro] = GAS[g.rampa], sem = Math.floor(g.x * 7 + g.y * 13) & 1023;
      for (let y = Math.floor(g.y - r); y <= g.y + r; y++) for (let x = Math.floor(g.x - r); x <= g.x + r; x++) {
        const dx = x + 0.5 - g.x, dy = y + 0.5 - g.y, d = Math.hypot(dx, dy) / r;
        if (d > 1) continue;
        const nz = ruido((x + t * 3) / 2.2, (y - t * 2) / 2.2, sem);
        if (nz * (1 - d * 0.7) * dens < 0.07 + 0.2 * BAYER[(y & 3) * 4 + (x & 3)]) continue;
        put(x, y, dx + dy < 0 ? claro : escuro, 0.75);
      }
    }
    // the stream: each pixel hot as it leaves the vent, cooling down the light's ramp to gas; the young ones drag a
    // 1–2 px streak along their flight
    for (const p of this.fluxo) {
      const k = p.idade / p.vida, R = RAMPAS[p.rampa], [gc, ge] = GAS[p.rampa];
      const c = k < 0.18 ? R[5] : k < 0.36 ? R[4] : k < 0.55 ? R[3] : k < 0.72 ? R[2] : k < 0.86 ? gc : ge;
      const a = k < 0.72 ? 1 : 0.7;
      put(p.x, p.y, c, a);
      // (4th look: dots stepping ~3 px a frame read as glitter — each one streaks the way it flew this frame, so the
      // stream is a continuous line near the vent, breaking up as it cools)
      if (k < 0.6) { const v = Math.hypot(p.ex, p.ey) || 1, cauda = Math.min(6, v / 30); for (let q = 1; q <= cauda; q++) put(p.x - (p.ex / v) * q, p.y - (p.ey / v) * q, k < 0.3 ? R[4] : R[3], 0.85 - (q / (cauda + 1)) * 0.4); }
    }
    // the vents' mouths: lit while they fire
    for (const j of this.jatos) {
      const o = this.onde(j);
      if (!o) continue;
      const env = this.envelope(j), R = RAMPAS[j.rampa];
      put(o.x, o.y, R[env > 0.6 ? 5 : 4], env); put(o.x + o.dx, o.y + o.dy, R[4], env * 0.9);
      // the nozzle's glow on her plates
      for (let y = Math.floor(o.y - 4); y <= o.y + 4; y++) for (let x = Math.floor(o.x - 4); x <= o.x + 4; x++) {
        const d = Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y);
        if (d < 4) put(x, y, R[3], 0.22 * env * (1 - d / 4));
      }
    }
  }
}
