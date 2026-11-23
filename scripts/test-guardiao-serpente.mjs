// THE CABLE-SERPENTS — the pure rules of step 3 (spec 2026-11-22-guardiao-coleira-design.md §6; his drawing of 23/11:
// they leave HIS body in wide arcs — over the top near the ceiling, under near the floor — and the heads stand in front of
// him, facing the ship). From the root:
//   node --experimental-transform-types scripts/test-guardiao-serpente.mjs
import { SERPENTE, caminhoSerpente, Serpente, passoSerpentes, prefixo } from '../src/entities/guardiao/serpente.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const DT = 1 / 60;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const compr = (p) => p.reduce((a, q, i) => (i ? a + dist(q, p[i - 1]) : 0), 0);
// the largest turn of the body, in degrees, between chords 4 px long (a corner shows up as a big turn)
const dobraMax = (pts) => {
  const r = [pts[0]];
  for (const p of pts) if (dist(p, r[r.length - 1]) >= 4) r.push(p);
  let m = 0;
  for (let i = 2; i < r.length; i++) {
    const a = Math.atan2(r[i - 1].y - r[i - 2].y, r[i - 1].x - r[i - 2].x), b = Math.atan2(r[i].y - r[i - 1].y, r[i].x - r[i - 1].x);
    let d = Math.abs(b - a);
    if (d > Math.PI) d = 2 * Math.PI - d;
    m = Math.max(m, (d * 180) / Math.PI);
  }
  return m;
};
// his drawing, measured on the 384×216 screen
const CIMA = { raiz: { x: 303, y: 53 }, c1: { x: 245, y: -2 }, c2: { x: 223, y: 54 }, posto: { x: 183, y: 54 }, atraso: 0, botes: 2, ensaio: 1.1, fintas: 2 };
const BAIXO = { raiz: { x: 334, y: 136 }, c1: { x: 330, y: 240 }, c2: { x: 218, y: 128 }, posto: { x: 178, y: 128 }, atraso: 0.5, botes: 2, ensaio: 1.1, fintas: 2 };

// ── the path: from his body, a wide arc, to the post in front of him ──
{
  const t = caminhoSerpente(CIMA.raiz, CIMA.c1, CIMA.c2, CIMA.posto);
  conferir(dist(t.pts[0], CIMA.raiz) < 1e-9, 'o arco nasce na raiz (no corpo dele)', t.pts[0]);
  conferir(dist(t.pts[t.pts.length - 1], CIMA.posto) < 1e-9, 'e termina no posto, à frente dele', t.pts[t.pts.length - 1]);
  let gap = 0;
  for (let i = 1; i < t.pts.length; i++) gap = Math.max(gap, dist(t.pts[i], t.pts[i - 1]));
  conferir(gap <= 4, 'amostrado a ≤ 4 px', gap);
  const yMin = Math.min(...t.pts.map((p) => p.y));
  conferir(yMin > 26 && yMin < 34, 'o de cima sobe quase até o teto (a borda em 30)', yMin);
  const b = caminhoSerpente(BAIXO.raiz, BAIXO.c1, BAIXO.c2, BAIXO.posto);
  const yMax = Math.max(...b.pts.map((p) => p.y));
  conferir(yMax > 176 && yMax < 190, 'o de baixo desce quase até o chão (a borda em 190)', yMax);
  conferir(Math.abs(t.comp - t.pts.reduce((a, p, i) => (i ? a + dist(p, t.pts[i - 1]) : 0), 0)) < 1e-6, 'comp é o comprimento do arco', t.comp);
}

// ── one serpent, a still ship: grows, rehearses at the post, locks 0.4 s, strikes straight where the ship WAS, goes home ──
{
  const s = new Serpente(CIMA);
  const nave = { x: 80, y: 110 };
  const fases = [];
  let travaQ = 0, travaMove = 0, hT = null, alvoTrava = null, maxPasso = 0, maxBuraco = 0, fim1 = null;
  let maxDobra = 0, ultTrava = null;
  let postoMax = 0, cabecaPrimeira = true, fereBote = true, fereEnsaio = true, prev = { ...s.cabeca }, apontaMin = 1;
  const bote = [];
  let h0 = null, travaEsta = 0;
  for (let i = 0; i < 60 * 20 && !s.acabou; i++) {
    // the ship moves AFTER the lock: the strike must not follow it
    if (s.fase === 'trava' && travaEsta > 3) nave.y = 160;
    passoSerpentes([s], DT, nave);
    if (fases[fases.length - 1] !== s.fase) fases.push(s.fase);
    if (s.fase !== 'espera') maxPasso = Math.max(maxPasso, dist(prev, s.cabeca));
    prev = { ...s.cabeca };
    const c = s.corpo();
    if (c.length) {
      if (dist(c[0], s.cabeca) > 1e-6) cabecaPrimeira = false;
      for (let k = 1; k < c.length; k++) maxBuraco = Math.max(maxBuraco, dist(c[k], c[k - 1]));
      maxDobra = Math.max(maxDobra, dobraMax(c));
    }
    if (s.fase === 'ensaio') {
      postoMax = Math.max(postoMax, dist(s.cabeca, CIMA.posto));
      if (s.trechoQueFere().length !== 1) fereEnsaio = false;
      // the head's last stretch points at the ship (once raised)
      if (c.length > 3 && dist(s.cabeca, CIMA.posto) > 6) {
        const tx = c[0].x - c[3].x, ty = c[0].y - c[3].y, nx = nave.x - c[0].x, ny = nave.y - c[0].y;
        apontaMin = Math.min(apontaMin, (tx * nx + ty * ny) / (Math.hypot(tx, ty) * Math.hypot(nx, ny)));
      }
    }
    if (s.fase === 'trava') {
      travaEsta++;
      if (!hT) { hT = { ...s.cabeca }; alvoTrava = { ...s.alvo }; }
      travaQ++;
      if (!fim1) travaMove = Math.max(travaMove, dist(hT, s.cabeca));
      ultTrava = { ...s.cabeca };
    } else travaEsta = 0;
    if (s.fase === 'bote' && !fim1) {
      const f = s.trechoQueFere();
      // the hurting stretch: from the head back along the body, at least the lunge so far
      if (f.length < 2 || dist(f[0], s.cabeca) > 1e-6 || compr(f) + 1e-6 < dist(ultTrava, s.cabeca)) fereBote = false;
      if (!h0) h0 = ultTrava;
      bote.push({ ...s.cabeca });
    }
    // the strike ends in the step that turns it to `recolhe`: the head is at its end there
    if (s.fase === 'recolhe' && bote.length && !fim1) { fim1 = { ...s.cabeca }; nave.y = 110; }
  }
  conferir(fases.join(',') === 'cresce,ensaio,trava,bote,recolhe,ensaio,trava,bote,recolhe,volta,fim', 'as fases, com 2 botes', fases);
  conferir(Math.abs(travaQ / 2 - SERPENTE.TRAVA * 60) <= 1, 'a trava dura 0,4 s (por bote)', travaQ / 2);
  conferir(travaMove <= SERPENTE.RECUO + 1e-6, 'na trava a cabeça só recua (enrijece)', travaMove);
  conferir(alvoTrava && alvoTrava.x === 80 && alvoTrava.y === 110, 'o alvo é a nave NA TRAVA', alvoTrava);
  conferir(fim1 && dist(fim1, { x: 80, y: 110 }) < 1, 'o 1º bote termina onde a nave estava, não onde ela foi', fim1);
  const reto = fim1 && h0 && bote.every((p) => {
    const ax = fim1.x - h0.x, ay = fim1.y - h0.y, bx = p.x - h0.x, by = p.y - h0.y;
    return Math.abs(ax * by - ay * bx) / Math.hypot(ax, ay) < 0.01;
  });
  conferir(reto, 'o bote é RETO', null);
  conferir(postoMax <= SERPENTE.ARMA + SERPENTE.BALANCO + SERPENTE.FINTA + 0.5, 'no ensaio a cabeça fica no posto (arma, balança, finta)', postoMax);
  conferir(apontaMin > 0.8, 'erguida, a cabeça aponta para a nave', apontaMin);
  conferir(maxPasso <= SERPENTE.BOTE * DT + 1.5, 'a cabeça nunca salta (≤ o bote por quadro)', maxPasso);
  conferir(maxBuraco <= 6, 'o corpo sem buraco (pontos a ≤ 6 px)', maxBuraco);
  conferir(maxDobra <= SERPENTE.DOBRA_MAX, `o corpo NUNCA quebra em quina (≤ ${SERPENTE.DOBRA_MAX}° a cada 4 px)`, maxDobra);
  conferir(cabecaPrimeira, 'o corpo começa na cabeça (a ponta afina ali)', null);
  conferir(fereEnsaio && fereBote, 'fere: só a cabeça no ensaio; cabeça + trecho esticado no bote', { fereEnsaio, fereBote });
  conferir(s.acabou && s.corpo().length === 0 && s.trechoQueFere().length === 0, 'no fim ela entrou: nada desenhado, nada fere', s.fase);
}

// ── a far ship: the strike stops at its reach ──
{
  const s = new Serpente({ ...CIMA, botes: 1 });
  const nave = { x: -120, y: 210 };
  let max = 0, h0 = null, ult = null;
  for (let i = 0; i < 60 * 10 && !s.acabou; i++) {
    passoSerpentes([s], DT, nave);
    if (s.fase === 'trava') ult = { ...s.cabeca };
    if (s.fase === 'bote' || s.fase === 'recolhe') {
      h0 ??= ult;
      max = Math.max(max, dist(h0, s.cabeca));
    }
  }
  conferir(max <= SERPENTE.BOTE_MAX + 1e-6 && max > SERPENTE.BOTE_MAX - 1, 'o bote para no alcance', max);
  // the reach covers the whole left of the arena from either post (the screen corners included)
  const longe = Math.max(...[CIMA.posto, BAIXO.posto].flatMap((p) => [{ x: 8, y: 8 }, { x: 8, y: 208 }].map((c) => dist(p, c))));
  conferir(longe + SERPENTE.ARMA + SERPENTE.RECUO < SERPENTE.BOTE_MAX, 'o alcance cobre os cantos da esquerda', longe);
}

// ── two serpents: one strike at a time, alternating, 4 in all ──
{
  const A = new Serpente(CIMA), B = new Serpente(BAIXO);
  const nave = { x: 80, y: 110 };
  let juntas = 0;
  const ordem = [];
  const antes = new Map([[A, ''], [B, '']]);
  for (let i = 0; i < 60 * 30 && !(A.acabou && B.acabou); i++) {
    passoSerpentes([A, B], DT, nave);
    if (A.atacando && B.atacando) juntas++;
    for (const [s, nome] of [[A, 'A'], [B, 'B']]) {
      if (s.fase === 'bote' && antes.get(s) !== 'bote') ordem.push(nome);
      antes.set(s, s.fase);
    }
  }
  conferir(juntas === 0, 'nunca duas atacando ao mesmo tempo', juntas);
  conferir(ordem.join('') === 'ABAB', 'os botes alternam: A, B, A, B', ordem);
  conferir(A.acabou && B.acabou, 'as duas voltam para dentro', { A: A.fase, B: B.fase });
}

// ── the body follows HIM: the root moves with the whole offset, the head at the post does not ──
{
  const sp = new Serpente(BAIXO);
  const nave = { x: 80, y: 110 };
  for (let i = 0; i < 60 * 10 && sp.fase !== 'ensaio'; i++) sp.passo(DT, nave, false);
  const antes = sp.corpo();
  sp.desvio = { x: 0, y: -6 };
  const depois = sp.corpo();
  const ra = antes[antes.length - 1], rd = depois[depois.length - 1];
  conferir(Math.abs(rd.y - ra.y + 6) < 1e-6 && Math.abs(rd.x - ra.x) < 1e-6, 'desvio: a raiz vai junto com o corpo dele, inteira', { ra, rd });
  conferir(dist(depois[0], antes[0]) < 1e-9, 'desvio: a cabeça no posto não se mexe', { a: antes[0], d: depois[0] });
  let pior = 0;
  for (let i = 2; i < depois.length; i++) {
    const a = depois[i - 2], b = depois[i - 1], c = depois[i];
    const u = { x: b.x - a.x, y: b.y - a.y }, v = { x: c.x - b.x, y: c.y - b.y };
    const nu = Math.hypot(u.x, u.y), nv = Math.hypot(v.x, v.y);
    if (nu < 1e-6 || nv < 1e-6) continue;
    const ang = Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y) / (nu * nv)))) * 180 / Math.PI;
    const ang0 = (() => { const a0 = antes[i - 2], b0 = antes[i - 1], c0 = antes[i]; const u0 = { x: b0.x - a0.x, y: b0.y - a0.y }, v0 = { x: c0.x - b0.x, y: c0.y - b0.y }; const n0 = Math.hypot(u0.x, u0.y) * Math.hypot(v0.x, v0.y); return n0 < 1e-9 ? 0 : Math.acos(Math.max(-1, Math.min(1, (u0.x * v0.x + u0.y * v0.y) / n0))) * 180 / Math.PI; })();
    pior = Math.max(pior, ang - ang0);
  }
  conferir(pior < 3, 'desvio: o arraste não cria dobra (≤ 3° a mais entre pontos vizinhos)', pior.toFixed(2));
}

// ── the cut ──
{
  const p = prefixo([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }], 15);
  conferir(p.length === 3 && dist(p[2], { x: 10, y: 5 }) < 1e-9, 'prefixo corta a polilinha no comprimento', p);
}

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTODOS OK');
process.exit(falhas.length ? 1 : 0);
