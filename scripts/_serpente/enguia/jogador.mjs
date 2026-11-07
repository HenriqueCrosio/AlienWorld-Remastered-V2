// 07/11 — the two probe players (spec §7.1): `parado` parks at (70, 100) and never moves; `desvia` plays at the ship's
// real speed (110 px/s). Every frame it weighs plans "go this way for d seconds, then hold" (16 headings × d of 0.12 /
// 0.3 / 0.6 / 1.0 s, plus holding still) over the next 1.0 s (samples every 0.1 s) against everything KNOWN to hurt by
// then — her body's future pose is a lookup; the pipes' free lane once drawn; the seeds once spat — and takes the safest,
// pulled toward a goal: the free lane during the pipes' warning, a slow 30 px circle around home while she reads the
// Echo (a player who keeps moving), home otherwise. (The first version only had full-second runs: next to home every
// run went too far, and the step clamp then left it stuck inside the Echo's ring — 07/11.)
import { folga, perigos } from './perigos.mjs';

const PLANOS = [{ u: [0, 0], d: 0 }];
for (let i = 0; i < 16; i++) for (const d of [0.12, 0.3, 0.6, 1.0]) PLANOS.push({ u: [Math.cos((i * Math.PI) / 8), Math.sin((i * Math.PI) / 8)], d });

export class Jogador {
  constructor(tipo, N) { this.tipo = tipo; this.N = N; this.x = N.nave.casa.x; this.y = N.nave.casa.y; this.ultimo = 0; }
  meta(t, M) {
    const N = this.N, casa = N.nave.casa;
    for (const C of M.canos) {
      const q = C.estado(t);
      if (q && (q.fase === 'aviso' || q.fase === 'fogo') && q.livre != null) {
        const F = N.canos.faixas;
        return { x: casa.x, y: (F[q.livre] + F[q.livre + 1]) / 2, peso: 2.5 };
      }
    }
    for (const E of M.ecos) if (E.estado(t).lendo) return { x: casa.x + 30 * Math.cos(1.7 * t), y: casa.y + 30 * Math.sin(1.7 * t), peso: 1 };
    return { x: casa.x, y: casa.y, peso: 0.6 };
  }
  passo(t, dt, M) {
    if (this.tipo === 'parado') return;
    const N = this.N, L = N.nave.lim, v = N.nave.vel, hit = N.nave.hit;
    const prende = (x, y) => ({ x: Math.min(L.x1, Math.max(L.x0, x)), y: Math.min(L.y1, Math.max(L.y0, y)) });
    // every frame for the first 0.4 s (a 0.2 s blast fits between two 0.1 s samples — the probe walked through one),
    // then every 0.1 s to 1.0 s
    const amostras = [];
    for (let j = 1; j <= 12; j++) amostras.push({ tau: j * dt, P: perigos(M, t + j * dt) });
    for (let j = 5; j <= 10; j++) amostras.push({ tau: j * 0.1, P: perigos(M, t + j * 0.1) });
    const g = this.meta(t, M);
    let melhor = -Infinity, escolha = 0;
    PLANOS.forEach(({ u: [ux, uy], d }, i) => {
      let risco = 0, p = { x: this.x, y: this.y };
      for (const { tau, P } of amostras) {
        p = prende(this.x + ux * v * Math.min(tau, d), this.y + uy * v * Math.min(tau, d));
        let f = Infinity;
        for (const h of P) f = Math.min(f, folga(p, hit, h.forma));
        if (f < 5) risco = Math.max(risco, (5 - f) * (1.6 - tau));
      }
      const nota = -1000 * risco - g.peso * Math.hypot(p.x - g.x, p.y - g.y) - (i === this.ultimo ? 0 : 0.3) - d * 0.5;
      if (nota > melhor) { melhor = nota; escolha = i; }
    });
    const { u: [ux, uy], d } = PLANOS[escolha];
    if (d > 0) {
      // a step never overshoots the goal when it walks straight at it
      const gx = g.x - this.x, gy = g.y - this.y, dg = Math.hypot(gx, gy);
      const reto = dg > 1e-6 && (ux * gx + uy * gy) / dg > 0.92;
      const k = reto ? Math.min(v * dt, dg) : v * dt;
      const q = prende(this.x + ux * k, this.y + uy * k);
      this.x = q.x; this.y = q.y;
    }
    this.ultimo = escolha;
  }
}
