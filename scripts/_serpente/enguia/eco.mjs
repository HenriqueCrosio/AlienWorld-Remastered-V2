// 07/11 — the Echo (spec §4, the clever skill): she reads the ship (~2 s, a faint trail in her eye's colour marks the
// ship's last ~2 s), spits ~5 plasma seeds that fly STRAIGHT to points spaced along that trail and stick, pulsing; they
// blow in the order the ship passed (oldest first), 0.25 s apart, radius 15. Who repeats its own path is caught by the
// chain; who stays still shrinks the trail to a heap and every seed lands on it. Fair: the newest point is ≥ 0.4 s old
// when she spits; every seed is in sight ≥ 0.6 s before it blows.

// the ship's trail, shared by the run (one sample per frame)
export class Trilha {
  constructor() { this.p = []; }
  grava(t, x, y) { this.p.push({ t, x, y }); }
  entre(t0, t1) { return this.p.filter((q) => q.t >= t0 - 1e-9 && q.t <= t1 + 1e-9); }
}

// `n` points spaced evenly along a polyline's arc, first to last (a still trail → all on the same spot)
export function espacaNoArco(pts, n) {
  if (!pts.length) return [];
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const L = acc.at(-1), out = [];
  for (let j = 0; j < n; j++) {
    const alvo = n === 1 ? L : (L * j) / (n - 1);
    let i = 1;
    while (i < pts.length - 1 && acc[i] < alvo) i++;
    const a = pts[i - 1] ?? pts[0], b = pts[i] ?? pts[0], seg = acc[i] - acc[i - 1] || 1, k = Math.min(1, Math.max(0, (alvo - acc[i - 1]) / seg));
    out.push({ x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, t: a.t + (b.t - a.t) * k });
  }
  return out;
}

export class Eco {
  constructor(t0, N, final = false) {
    const E = N.eco;
    this.N = N; this.t0 = t0;
    this.leitura = final ? E.final.leitura : E.leitura;
    this.intervalo = final ? E.final.intervalo : E.intervalo;
    const rodadas = final ? E.final.rodadas : E.rodadas;
    const dur = this.leitura + E.voo + E.vista + (E.sementes - 1) * this.intervalo + E.fere + 0.3;
    this.rodadas = [];
    for (let r = 0; r < rodadas; r++) {
      const ini = t0 + r * (dur + E.entre), cospe = ini + this.leitura, crava = cospe + E.voo, det0 = crava + E.vista;
      this.rodadas.push({ r, ini, cospe, crava, det0, fim: ini + dur, sementes: null });
    }
  }
  // at the spit: the seeds, from the mouth to points along the ship's last reading (newest ≥ minIdade old)
  atualiza(t, trilha, boca) {
    const E = this.N.eco;
    for (const r of this.rodadas) if (!r.sementes && t >= r.cospe) {
      const pts = trilha.entre(r.cospe - this.leitura, r.cospe - E.minIdade);
      const alvos = espacaNoArco(pts.length ? pts : [trilha.p.at(-1)], E.sementes);
      r.sementes = alvos.map((a, i) => ({ i, x0: boca.x, y0: boca.y, x: a.x, y: a.y, tPasso: a.t, tDetona: r.det0 + i * this.intervalo }));
      r.idadeMaisNova = r.cospe - Math.max(...alvos.map((a) => a.t));
    }
  }
  // { lendo: rodada|null, sementes: [{x, y, voo (0–1), detonada}], explosoes: [{x, y, r, k (0–1), fere}] }
  estado(t) {
    const E = this.N.eco, out = { lendo: null, sementes: [], explosoes: [] };
    for (const r of this.rodadas) {
      if (t >= r.ini && t < r.cospe) out.lendo = r;
      if (!r.sementes) continue;
      for (const s of r.sementes) {
        if (t < r.cospe) continue;
        if (t < s.tDetona) {
          const voo = Math.min(1, (t - r.cospe) / E.voo);
          out.sementes.push({ x: s.x0 + (s.x - s.x0) * voo, y: s.y0 + (s.y - s.y0) * voo, voo, i: s.i, falta: s.tDetona - t });
        } else if (t < s.tDetona + 0.35) {
          const k = (t - s.tDetona) / 0.35;
          out.explosoes.push({ x: s.x, y: s.y, r: E.raio, k, fere: t < s.tDetona + E.fere });
        }
      }
    }
    return out;
  }
  // the spec's fairness, per round: the newest point's age at the spit, the shortest time a seed sat in sight
  justica() {
    const E = this.N.eco;
    return this.rodadas.filter((r) => r.sementes).map((r) => ({
      idadeMaisNova: r.idadeMaisNova,
      vistaMin: Math.min(...r.sementes.map((s) => s.tDetona - r.crava)),
      ordem: r.sementes.every((s, i) => !i || s.tPasso >= r.sementes[i - 1].tPasso - 1e-9),
      E,
    }));
  }
}
