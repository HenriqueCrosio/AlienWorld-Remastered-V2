// 07/11 — the eel's choreography (spec §2): the arrival, then the fixed cycle — the pipes' post, the dive straight into
// the breach, the rise in the breach (the Echo), the trip under the hull (the geysers), the way back up the right
// edge — twice, then the third cycle's pipes until the 5% bite, the last dive, the last Echo and the death in the
// breach. Waypoints are the SNOUT's; the body follows the same path behind it. `s(t)` is analytic, so the probe
// players can look ahead.
// 2nd round (his answers): the post is a TRICK — the body climbs the right edge and leaves by the top-right corner;
// off the canvas she coils and comes back with only the neck and head hanging near that corner. Before the geysers
// the WHOLE body sinks into the breach. The breach stays open at the end (the ship's way into the Leviathan). No dotted
// warning: before leaving rest she prepares (`prepara`).
import { Caminho } from './caminho.mjs';

// a move's duration and position: cruising at v, with smooth (cosine-shaped) pushes of `a` s at the rest ends — the
// same distance as a linear ramp (v·a/2), without the corner in the speed
function perfil(L, v, a, para0, para1) {
  const n = (para0 ? 1 : 0) + (para1 ? 1 : 0);
  if (L <= 0) return { D: 0, pos: () => 0 };
  if (n && L < ((v * a * n) / 2) * 1.2) { // too short for full pushes: one cosine ease
    const D = (L / v) * 1.6;
    return { D, pos: (t) => (L * (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, t / D))))) / 2 };
  }
  const D = L / v + (a / 2) * n;
  const rampa = (u) => v * (u / 2 - (a / (2 * Math.PI)) * Math.sin((Math.PI * u) / a)); // distance after u s of push
  return {
    D,
    pos: (t) => {
      t = Math.min(D, Math.max(0, t));
      const ta = para0 ? a : 0, tb = para1 ? D - a : D;
      if (t < ta) return rampa(t);
      let s = para0 ? (v * a) / 2 : 0;
      if (t < tb) return s + v * (t - ta);
      s += v * (tb - ta);
      const u = t - tb;
      return s + (v * a) / 2 - rampa(a - u);
    },
  };
}

// the eco pause's length (eco.mjs plays inside it): per round the reading, the flight, the seeds in sight, the chain,
// the last blast; rounds `entre` apart
export const duracaoEco = (E, final = false) => {
  const leitura = final ? E.final.leitura : E.leitura, intervalo = final ? E.final.intervalo : E.intervalo;
  const rodadas = final ? E.final.rodadas : E.rodadas;
  const r = leitura + E.voo + E.vista + (E.sementes - 1) * intervalo + E.fere + 0.3;
  return rodadas * r + (rodadas - 1) * E.entre;
};
// the pipes pause: the pipes open, three salvos (warning + front + burn), `entre` between, the embers
export const duracaoCanos = (C) => C.antes + C.aviso.reduce((a, b) => a + b, 0) + 3 * (C.frente + C.queima) + 2 * C.entre + C.brasa;
// where the 5% bite cuts the third cycle's pipes: after the 2nd salvo's burn
export const corteCanos = (C) => C.antes + C.aviso[0] + C.aviso[1] + 2 * (C.frente + C.queima) + C.entre;

// the post (the trick): up the right edge, out by the top-right corner, coiled off the canvas, back down with the head
// (the coil above the canvas is a round turn — never a fold.) 2nd round (2), his note: at the pipes the body must COVER
// the whole right side, so the fire visibly leaves her pipes — and after the bites (a shorter body) the bottom lane
// still needs its pipe. So the coil is ELASTIC: `h` px taller or shorter, solved per post for the rings she still has,
// so that her thick body (not the thin tail) runs down the right edge past the bottom of the screen.
// The column straight up x 372 (the body's own running wave keeps it alive; the swimming S would pull it off the edge),
// an arch over the top (off the canvas, radius ~25) down to x 322, then the neck bends left into the hanging head.
// `h` lengthens both legs of the arch: more body to spend → a taller arch.
const postoPontos = (h) => {
  const topo = -12 - h, cx = 347, R = 25;
  const arco = [0.25, 0.5, 0.75].map((k) => [Math.round(cx + R * Math.cos(Math.PI * k)), Math.round(topo - R * Math.sin(Math.PI * k))]);
  return [[372, 180], [372, 96], [372, 30], [372, topo], ...arco, [322, topo], [322, Math.max(topo + 8, -4)], [318, 16], [300, 30], [262, 38]];
};
// how far down the body must reach: the stump after a bite (it is thick), or where the tail gets thin (radius < 16 px)
// — that point must be well below the screen (y ≥ 236) at the post
export function alcanceNoPosto(N, med, nAneis) {
  const comp = nAneis * N.corpo.passo;
  if (nAneis < N.corpo.aneis) return N.corpo.cabeca + comp - 4;
  let u = comp;
  while (u > 0 && med.raioU(u) < 16) u -= 2;
  return N.corpo.cabeca + u;
}
function resolvePosto(N, alcance, dirEntrada) {
  const cabe = (h) => {
    const c = new Caminho([372, 620]); // (deep: the measured point must fall on the column, never past its start)
    c.dir = dirEntrada;
    c.junta(postoPontos(h));
    return c.ponto(c.L - alcance).y >= 236; // (with a margin: the running wave lifts the end a few px)
  };
  let lo = 0, hi = 220;
  if (!cabe(lo)) return lo; // even the tightest coil is short: the test catches it
  for (let i = 0; i < 24; i++) { const m = (lo + hi) / 2; if (cabe(m)) lo = m; else hi = m; }
  return lo;
}

// `med` (the art's measures) sizes the post's coil to the body she has left
export function montaRoteiro(N, med) {
  const V = N.vel, CORPO = N.corpo.cabeca + N.corpo.aneis * N.corpo.passo;
  // the rings at each post: the mock's scripted bites take 3 off the tail during the way back of cycle 1 and the dive
  // of cycle 2 (`corpo.mjs`, `mordidas`; the test checks they land before the next post)
  const aneisNoPosto = (c) => N.corpo.aneis - N.mordida.aneis * Math.min(c - 1, 2);
  const postos = [];
  const POSTO = (c) => {
    const h = resolvePosto(N, alcanceNoPosto(N, med, aneisNoPosto(c)), [0, -1]);
    postos.push({ ciclo: c, aneis: aneisNoPosto(c), h });
    return postoPontos(h);
  };
  const FUNDO = 216 + CORPO + 40; // the snout this deep = the whole body below the screen
  const cam = new Caminho([300, 216 + CORPO + 260]);
  const trechos = [];
  let t = 0;
  let sRecuo = null; // after the death's sinking, the pauses stand where she stopped, not at the path's end
  const s = () => sRecuo ?? cam.L;
  const pausa = (nome, cap, dur, extra = {}) => { trechos.push({ nome, cap, tipo: 'pausa', t0: t, t1: t + dur, s0: s(), s1: s(), ...extra }); t += dur; };
  const move = (nome, cap, pontos, v, { para0 = false, para1 = false, onda = false, ...extra } = {}) => {
    const [s0, s1] = cam.junta(pontos, { onda: onda ? N.onda : null, calma0: para0, calma1: para1 });
    const p = perfil(s1 - s0, v, V.rampa, para0, para1);
    trechos.push({ nome, cap, tipo: 'move', t0: t, t1: t + p.D, s0, s1, pos: p.pos, ...extra });
    t += p.D;
  };
  // backwards along the path already drawn (the death: she sinks back into her den)
  const recua = (nome, cap, ate, v, extra = {}) => {
    const s0 = s(), p = perfil(s0 - ate, v, V.rampa, true, true);
    trechos.push({ nome, cap, tipo: 'move', t0: t, t1: t + p.D, s0, s1: ate, pos: p.pos, recua: true, ...extra });
    t += p.D;
    sRecuo = ate;
    return ate;
  };
  const prepara = (cap, ciclo) => pausa('prepara', cap, N.prepara.dur, { prepara: true, ciclo });

  // the prologue: the whole body hidden in the den, straight up under the breach (no time passes)
  cam.junta([[300, 300]]);

  // ── the arrival (§2.1): the fusion scene's end stands in as a flash; she bursts out, arcs over the arena toward the
  // ship's side and out by the bottom edge while her tail still leaves the breach, then climbs the right edge to the post
  pausa('fusao', 'chegada', 1.6, { hab: 'fusao' });
  move('arco', 'chegada', [[300, 150], [288, 72], [252, 38], [190, 28], [130, 40], [96, 78], [92, 130], [104, 190], [120, 262]], N.vel.chegada, { onda: true, emerge: true });
  move('arco-fora', 'chegada', [[150, 330], [260, 360], [350, 330], [372, 262]], N.vel.chegada);
  move('posto', 'chegada', POSTO(1), N.vel.chegada, { para1: true });

  const ciclo = (c, final = false) => {
    // 1 · the pipes (§3) — the third cycle's are cut by the 5% bite
    pausa('canos', 'canos', final ? corteCanos(N.canos) + 0.3 : duracaoCanos(N.canos), { hab: 'canos', ciclo: c, corte: final ? corteCanos(N.canos) : null });
    // 2 · the dive: from the top-right corner to the middle, straight down into the breach; the tail goes in last
    prepara('mergulho', c);
    move('mergulho', 'mergulho', [[226, 50], [196, 74], [186, 104], [200, 132], [232, 158], [264, 184], [278, 216], [282, 300]], V.passagem, { para0: true, onda: true, ciclo: c });
    move('mergulho-cauda', 'mergulho', [[282, FUNDO]], V.passagem, { para1: true, ciclo: c });
    // (hidden: nothing of her on screen) the U-turn under the breach
    move('volta-escondida', 'mergulho', [[296, FUNDO + 40], [312, FUNDO], [312, 300]], V.escondido, { para1: true, ciclo: c });
    // 3 · the rise in the breach: the head almost at the top edge, the body a swaying column from the crest up
    prepara('erguida', c);
    move('erguida', 'erguida', [[312, 216], [312, 92], [305, 52], [282, 34], [240, 30]], V.rombo, { para0: true, para1: true, onda: true, ciclo: c, emerge: true });
    pausa('eco', 'erguida', duracaoEco(N.eco, final), { hab: 'eco', ciclo: c, final });
    if (final) return;
    // 4 · under the hull: the WHOLE body sinks into the breach first; then the bump runs left under the hull and back
    prepara('sob', c);
    move('afunda', 'sob', [[222, 38], [210, 60], [216, 94], [242, 126], [270, 164], [278, 216], [278, FUNDO]], V.afunda, { para0: true, onda: true, ciclo: c });
    move('sob-ida', 'sob', [[262, FUNDO + 26], [230, FUNDO + 36], [N.geiser.fim, FUNDO + 36]], V.sob, { ciclo: c, sob: 'ida' });
    move('sob-volta', 'sob', [[N.geiser.fim - 18, FUNDO + 48], [N.geiser.fim, FUNDO + 60], [300, FUNDO + 60]], V.sob, { ciclo: c, sob: 'volta' });
    // (hidden) up under the breach, fast, to where she breaks out
    move('sobe-escondida', 'volta', [[306, FUNDO + 30], [306, 300]], V.escondido, { ciclo: c });
    // 5 · the way back: out of the breach, the curve, out by the bottom edge on the right, up the right edge to the post
    move('volta', 'volta', [[306, 216], [306, 150], [320, 122], [342, 128], [350, 170], [352, 216], [350, 330], [362, 400], [374, 330]], V.passagem, { onda: true, ciclo: c, emerge: true });
    move('volta-borda', 'volta', [[372, 216]], V.passagem, { ciclo: c }); // (straight: this is the post's column)
    move('posto', 'volta', POSTO(c + 1), V.passagem, { para1: true, ciclo: c });
  };
  for (let c = 1; c <= N.ciclos; c++) ciclo(c);
  ciclo(N.ciclos + 1, true);

  // ── the death (§6.3): she sinks back down her own path until the neck is in the breach's mouth — the head jams,
  // comes undone in its own pixels; what is left of her slides down into the den, and the breach STAYS OPEN
  {
    let alvo = s();
    for (let q = s(); q > 0; q -= 1) { const p = cam.ponto(q - N.corpo.cabeca); if (p.y >= 168) { alvo = q; break; } }
    recua('afunda-morte', 'morte', alvo, V.recua);
    pausa('presa', 'morte', 0.9, { hab: 'presa' });
    pausa('desfaz', 'morte', 1.3, { hab: 'desfaz' });
    recua('resto', 'morte', alvo - 320, 180, { hab: 'resto' });
    pausa('fim', 'morte', 1.8, { hab: 'fim' });
  }

  const T = t;
  const estado = (tq) => {
    let lo = 0, hi = trechos.length - 1;
    if (tq <= 0) return { s: trechos[0].s0, trecho: trechos[0], tl: 0 };
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (trechos[m].t0 <= tq) lo = m; else hi = m - 1; }
    const tr = trechos[lo], tl = Math.min(tq, tr.t1) - tr.t0;
    let sq = tr.s0;
    if (tr.tipo === 'move') sq = tr.recua ? tr.s0 - tr.pos(tl) : tr.s0 + tr.pos(tl);
    return { s: sq, trecho: tr, tl };
  };

  // the breach's tell: before she breaks out of it, the hull trembles and breathes dust, her eye's glow down in the
  // hole — `prepara.dur` before the snout comes into sight on the legs that emerge from it
  const sinais = [];
  const naTela = (p) => p.x >= 0 && p.x < N.tela.W && p.y >= 0 && p.y < N.tela.H;
  for (const tr of trechos) {
    if (!tr.emerge) continue;
    for (let tq = tr.t0; tq < tr.t1; tq += 1 / 240) {
      const p = cam.ponto(estado(tq).s);
      if (naTela(p)) { if (p.x >= N.rombo.x0 - 20 && p.x <= N.rombo.x1 + 20) sinais.push({ t0: tq - N.prepara.dur, t1: tq, x: p.x }); break; }
    }
  }

  return { caminho: cam, trechos, estado, sinais, postos, T, CORPO };
}
