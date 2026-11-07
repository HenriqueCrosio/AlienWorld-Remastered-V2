// 07/11 — the eel's pose at a time: the head as a rigid chord neck → snout on the path (mirrored when she heads
// right, turned toward the ship in the Echo), the rings behind it every 26 px of arc with a 2 px breathing running down
// them, which rings sit in the den (behind the breach's lip), and the bites (rings off the tail) — all pure.

const visivel = (p, N, m = 0) => p.x >= -m && p.x < N.tela.W + m && p.y >= -m && p.y < N.tela.H + m;
export const naToca = (p, N) => p.x >= N.rombo.x0 && p.x <= N.rombo.x1 && p.y > N.rombo.topo;

// the mock's scripted life (plan, the proposals): when each threshold falls, and — for the tail's bites — the first
// moment from then on when the three rings to go are in sight (spec §6.2: if the tail is off screen, it WAITS)
export function mordidas(R, N, med) {
  const tr = (nome, ciclo) => R.trechos.find((t) => t.nome === nome && t.ciclo === ciclo);
  const ultimo = R.trechos.filter((t) => t.hab === 'canos').at(-1);
  const pedidos = [
    { pct: 22, tPedido: tr('volta', 1).t0 },
    { pct: 13, tPedido: tr('mergulho', 2).t0 + 1.0 },
  ];
  const out = [];
  let n = N.corpo.aneis;
  for (const p of pedidos) {
    let t = p.tPedido;
    for (; t < R.T; t += 1 / 60) {
      const e = R.estado(t);
      const vistos = [n - 3, n - 2, n - 1].filter((k) => {
        const q = R.caminho.ponto(e.s - N.corpo.cabeca - (k + 0.5) * N.corpo.passo);
        return visivel(q, N) && !naToca(q, N);
      });
      if (vistos.length >= 2) break;
    }
    out.push({ ...p, t, de: n - N.mordida.aneis, ate: n });
    n -= N.mordida.aneis;
  }
  out.push({ pct: 5, tPedido: ultimo.t0 + ultimo.corte, t: ultimo.t0 + ultimo.corte, cranio: true });
  return out;
}

export function nAneisEm(t, N, mord) {
  let n = N.corpo.aneis;
  for (const m of mord) if (!m.cranio && t >= m.t) n -= N.mordida.aneis;
  return n;
}

// a point of the head art (art px) → the screen, through the pose's chord (mirrored across the art's own axis when
// she heads right); `deTela` is the inverse, for drawing pixel by pixel
export function cabecaParaTela(C, med, p) {
  const H = med.cabeca, a = { x: Math.cos(H.ang), y: Math.sin(H.ang) };
  let vx = p.x - H.pescoco.x, vy = p.y - H.pescoco.y;
  if (C.espelho) { const d = vx * a.x + vy * a.y; vx = 2 * d * a.x - vx; vy = 2 * d * a.y - vy; }
  const r = C.ang - H.ang, c = Math.cos(r), s = Math.sin(r);
  return { x: C.pescoco.x + vx * c - vy * s, y: C.pescoco.y + vx * s + vy * c };
}
export function telaParaCabeca(C, med, q) {
  const H = med.cabeca, a = { x: Math.cos(H.ang), y: Math.sin(H.ang) };
  const r = -(C.ang - H.ang), c = Math.cos(r), s = Math.sin(r);
  const dx = q.x - C.pescoco.x, dy = q.y - C.pescoco.y;
  let vx = dx * c - dy * s, vy = dx * s + dy * c;
  if (C.espelho) { const d = vx * a.x + vy * a.y; vx = 2 * d * a.x - vx; vy = 2 * d * a.y - vy; }
  return { x: H.pescoco.x + vx, y: H.pescoco.y + vy };
}

import { PESCOCO, JUNTA } from './arte.mjs';

// the pose. `giro` (rad): the Echo turns the head about the neck; `treme` {x, y}: the stuck head's struggle
export function pose(R, N, med, t, { giro = 0, treme = null, mord = [] } = {}) {
  const e = R.estado(t);
  // L: from the snout to the strip's u = 0 (the old joint, x 96); Lc: the rigid SKULL only (to x 66) — the neck between
  // them is the tube's u < 0 and bends with the body (2nd round of the rings)
  const C = R.caminho, sH = e.s, L = N.corpo.cabeca, Lc = L - JUNTA;
  const pesc = C.ponto(sH - Lc), foc0 = C.ponto(sH);
  let ang = Math.atan2(foc0.y - pesc.y, foc0.x - pesc.x) + giro;
  const tx = treme ? treme.x : 0, ty = treme ? treme.y : 0;
  const pescoco = { x: pesc.x + tx, y: pesc.y + ty };
  const focinho = { x: pescoco.x + Math.cos(ang) * Lc, y: pescoco.y + Math.sin(ang) * Lc };
  // (the roll is the path's: the head shows the other side once the middle of its chord has rolled past half)
  const fiC = R.rola ? R.rola(sH - Lc / 2) : Math.cos(ang) > 0 ? Math.PI : 0; // (the head's roll: picks its view)
  const espelho = fiC > Math.PI / 2;
  const ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
  // the art's circles sit off the chord by `dy` (its "down"); mirrored, the side flips
  const lado = espelho ? -1 : 1;
  const circulos = med.circulosCabeca.map((c) => ({
    x: pescoco.x + ux * c.u - nx * c.dy * lado, y: pescoco.y + uy * c.u - ny * c.dy * lado, r: c.r,
  }));
  const nAneis = nAneisEm(t, N, mord);
  // the slither: a wave running down the body all the time (none at the neck, full from `ate` px on)
  const R2 = N.respira;
  const ponto = (u) => {
    const p = C.ponto(sH - L - u), d = C.rumo(sH - L - u);
    const o = R2.A * Math.sin((2 * Math.PI * u) / R2.lambda - R2.w * t) * Math.max(0, Math.min(1, u / R2.ate));
    const k = Math.max(0, Math.min(1, 1 - (u + PESCOCO) / 40)); // (the struggle shakes the neck, fading down it)
    return { x: p.x - d.y * o + tx * k, y: p.y + d.x * o + ty * k, dx: d.x, dy: d.y };
  };
  const aneis = [];
  for (let k = 0; k < nAneis; k++) {
    const q = ponto((k + 0.5) * N.corpo.passo);
    aneis.push({ k, x: q.x, y: q.y, r: med.raio(k), toca: naToca(q, N), dx: q.dx, dy: q.dy });
  }
  // the tube (drawn and touched): a sample every `passo` px from the neck to the tail, its ring index for the joints
  const comp = nAneis * N.corpo.passo, tubo = [];
  for (let u = -PESCOCO; u <= comp; u += N.tubo.passo) {
    const q = ponto(u), fimK = Math.min(1, (comp - u) / 10);
    tubo.push({ u, x: q.x, y: q.y, dx: q.dx, dy: q.dy, fi: R.rola ? R.rola(sH - L - u) : 0, r: med.raioU(u) * (nAneis < N.corpo.aneis ? 0.55 + 0.45 * fimK : 1), seg: Math.floor(u / N.corpo.passo) + 2, toca: naToca(q, N) });
  }
  return { e, cabeca: { pescoco, focinho, ang, espelho, fi: fiC, circulos }, aneis, tubo, nAneis };
}
