// The colossal eel's mock, the pure part (`scripts/_serpente/enguia/`): the path, the choreography, the body, the
// pipes' free lane, the Echo's fairness, the geysers, the clearances. Plan `plans/2026-11-07-serpente-grande-enguia.md`.
//   node scripts/test-enguia.mjs
import { N } from './_serpente/enguia/numeros.mjs';
import { Caminho, reamostra } from './_serpente/enguia/caminho.mjs';
import { montaRoteiro } from './_serpente/enguia/roteiro.mjs';
import { medidas } from './_serpente/enguia/medidas.mjs';
import { pose, mordidas, nAneisEm } from './_serpente/enguia/corpo.mjs';
import { LCG } from './_serpente/enguia/numeros.mjs';
import { sorteiaLivre, Canos, bocasDosCanos } from './_serpente/enguia/canos.mjs';
import { duracaoCanos, duracaoEco } from './_serpente/enguia/roteiro.mjs';
import { Trilha, Eco } from './_serpente/enguia/eco.mjs';
import { geiseres, pontosGeiser } from './_serpente/enguia/geiseres.mjs';
import { folga } from './_serpente/enguia/perigos.mjs';
import { JUNTA, amplia8 } from './_serpente/enguia/arte.mjs';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ── A1 · the path
{
  const c = new Caminho([0, 0]);
  c.junta([[100, 0]]);
  ok(Math.abs(c.L - 100) <= 1, `uma reta de 100 px tem L ≈ 100 (${c.L})`);
  const m = c.ponto(50);
  ok(Math.abs(m.x - 50) < 0.6 && Math.abs(m.y) < 0.6, `ponto(50) no meio (${m.x.toFixed(2)}, ${m.y.toFixed(2)})`);
  const r = reamostra([[0, 0], [3, 4], [3, 14]], 1);
  let pior = 0;
  for (let i = 1; i < r.length; i++) pior = Math.max(pior, Math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]));
  ok(pior <= 1.05, `reamostra: passos de ≤ 1,05 px (${pior.toFixed(3)})`);
}
// ── A1 · the choreography
const med = await medidas(N);
const R = montaRoteiro(N, med);
{
  let contiguo = true, pausaParada = true, salto = 0;
  R.trechos.forEach((tr, i) => { if (i && Math.abs(tr.t0 - R.trechos[i - 1].t1) > 1e-9) contiguo = false; });
  ok(contiguo, `os ${R.trechos.length} trechos são contíguos no tempo (T = ${R.T.toFixed(1)} s)`);
  const vmax = Math.max(...Object.values(N.vel).filter((v) => v > 1));
  let antes = R.estado(0).s;
  for (let t = 1 / 120; t <= R.T; t += 1 / 120) {
    const e = R.estado(t);
    salto = Math.max(salto, Math.abs(e.s - antes) - (vmax / 120 + 1));
    if (e.trecho.tipo === 'pausa' && Math.abs(e.s - e.trecho.s0) > 1e-9) pausaParada = false;
    antes = e.s;
  }
  ok(salto <= 0, `s contínuo a 120 Hz (excesso ${salto.toFixed(2)} px)`);
  ok(pausaParada, 'nas pausas s não muda');
  // the pipes' post (2nd round, his trick): the head hangs near the top-right corner; the body climbs the right edge,
  // leaves by the top and is coiled off the canvas between the two
  const canos = R.trechos.find((t) => t.hab === 'canos');
  const sp = canos.s0, foc = R.caminho.ponto(sp), pes = R.caminho.ponto(sp - N.corpo.cabeca);
  const centro = { x: (foc.x + pes.x) / 2, y: (foc.y + pes.y) / 2 };
  ok(centro.x >= 270 && centro.y <= 40, `no posto, a cabeça perto do canto de cima à direita (centro em ${centro.x.toFixed(0)}, ${centro.y.toFixed(0)})`);
  const aneisPosto = Array.from({ length: N.corpo.aneis }, (_, k) => R.caminho.ponto(sp - N.corpo.cabeca - (k + 0.5) * N.corpo.passo));
  ok(aneisPosto.some((p) => p.y < -15), `no posto, o corpo se enrola fora da tela, em cima (o anel mais alto em y ${Math.min(...aneisPosto.map((p) => p.y)).toFixed(0)})`);
  const naBorda = aneisPosto.filter((p) => p.y > 50 && p.y < 216);
  ok(naBorda.length >= 4 && naBorda.every((p) => p.x >= 350), `no posto, os ${naBorda.length} anéis visíveis abaixo de y 50 sobem pela borda direita (x ≥ 350)`);
  // risen in the breach: the snout high, the column inside the hole
  const eco = R.trechos.find((t) => t.hab === 'eco');
  const fe = R.caminho.ponto(eco.s0);
  ok(fe.y <= 40, `erguida: o focinho em y ${fe.y.toFixed(0)} (≤ 40)`);
  let dentro = true;
  for (let k = 0; k < N.corpo.aneis; k++) {
    const p = R.caminho.ponto(eco.s0 - N.corpo.cabeca - (k + 0.5) * N.corpo.passo);
    if (p.y > 150 && p.y < 216 && (p.x < N.rombo.x0 || p.x > N.rombo.x1)) dentro = false;
  }
  ok(dentro, 'erguida: todo anel abaixo da crista fica dentro do buraco (x 245–332)');
  // the cycle: from one pipes post to the next
  const postos = R.trechos.filter((t) => t.hab === 'canos');
  const ciclo = postos[1].t0 - postos[0].t0;
  ok(ciclo >= 24 && ciclo <= 40, `o ciclo dura ${ciclo.toFixed(1)} s (a spec estimou ~27)`);
  // (2nd round, "mais fluido": no fold in the path she swims where it shows — the tightest turn on screen, over a ring)
  let raioMin = Infinity, onde = null;
  const C = R.caminho;
  for (let q = 30; q < C.L - 30; q += 2) {
    const a = C.ponto(q - 13), b = C.ponto(q), c = C.ponto(q + 13);
    if (b.y < -10 || b.y > 226 || b.x < -10 || b.x > 394) continue;
    const ab = dist(a, b), bc = dist(b, c), ac = dist(a, c), area = Math.abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2;
    const r = area > 1e-6 ? (ab * bc * ac) / (4 * area) : Infinity;
    if (r < raioMin) { raioMin = r; onde = b; }
  }
  ok(raioMin >= 15, `a curva mais fechada à vista tem ${raioMin.toFixed(1)} px de raio (em ${onde.x.toFixed(0)}, ${onde.y.toFixed(0)}; ≥ 15)`);
  ok(R.sinais.length >= 2 * N.ciclos + 1, `${R.sinais.length} sinais do rombo antes de ela sair dele`);
  ok(!R.trechos.some((t) => t.hab === 'fecha'), 'o rombo fica aberto no fim (a entrada da nave no Leviatã)');
}

// ── A2 · the body, measured on the approved art
const mord = mordidas(R, N, med);
{
  // (the rigid part is the SKULL now; the neck bends with the body — 2nd round of the rings)
  ok(Math.abs(med.cabeca.comp - (N.corpo.cabeca - JUNTA)) <= 3, `a corda do crânio na arte tem ${med.cabeca.comp.toFixed(1)} px (no caminho: ${N.corpo.cabeca - JUNTA})`);
  const t = R.trechos.find((x) => x.hab === 'canos').t0 + 0.1;
  const P = pose(R, N, med, t, { mord });
  let passo = true;
  for (let k = 1; k < P.aneis.length; k++) {
    const a = R.caminho.ponto(P.e.s - N.corpo.cabeca - (k - 0.5) * N.corpo.passo), b = R.caminho.ponto(P.e.s - N.corpo.cabeca - (k + 0.5) * N.corpo.passo);
    // (the chord: equal to the arc on a straight, a little shorter on a bend — never longer, never folded)
    const d = dist(a, b);
    if (d > N.corpo.passo + 0.5 || d < N.corpo.passo - 3) passo = false;
  }
  ok(passo, `os anéis a ${N.corpo.passo} px um do outro no caminho (a corda entre ${N.corpo.passo - 3} e ${N.corpo.passo + 0.5})`);
  ok(Math.abs(P.aneis[0].r - med.perfil(N.corpo.passo / 2) / 2) <= 1, `o anel 0 tem a meia-altura da arte (${P.aneis[0].r.toFixed(1)} px)`);
  ok(med.raio(N.corpo.aneis - 1) <= 7, `o último anel tem ${med.raio(N.corpo.aneis - 1).toFixed(1)} px (≤ 7)`);
  ok(Math.max(...P.aneis.map((a) => a.r)) <= 29, `o anel mais grosso tem ${Math.max(...P.aneis.map((a) => a.r)).toFixed(1)} px de raio`);
  const toca = P.aneis.every((a) => a.toca === (a.x >= N.rombo.x0 && a.x <= N.rombo.x1 && a.y > N.rombo.topo));
  ok(toca, 'toca só com o centro no buraco abaixo de y 150');
  ok(mord.length === 3 && mord[0].t >= mord[0].tPedido && mord[1].t >= mord[1].tPedido, `as mordidas: ${mord.map((m) => `${m.pct}% em ${m.t.toFixed(1)} s (pedida ${m.tPedido.toFixed(1)})`).join(' · ')}`);
  ok(nAneisEm(mord[0].t + 0.01, N, mord) === N.corpo.aneis - 3 && nAneisEm(mord[1].t + 0.01, N, mord) === N.corpo.aneis - 6, 'cada mordida tira 3 anéis da cauda');
  // the head never clearly upside down (Part B: the roll is the path's, with a margin — so on a vertical run it keeps
  // the side it had, but pointing well right it is mirrored and well left it is not)
  let espelhoCerto = true, viradas = 0, antes = null;
  for (let tq = 0; tq < R.T; tq += 1 / 30) {
    const q = pose(R, N, med, tq, { mord }), c = Math.cos(q.cabeca.ang), f = q.cabeca.focinho;
    const aVista = f.x > -10 && f.x < N.tela.W + 10 && f.y > -10 && f.y < N.tela.H + 10; // (off the canvas nobody sees it)
    if (aVista && ((q.cabeca.espelho && c < -0.7) || (!q.cabeca.espelho && c > 0.7))) espelhoCerto = false;
    if (antes != null && antes !== q.cabeca.espelho) viradas++;
    antes = q.cabeca.espelho;
  }
  ok(espelhoCerto, 'a cabeça nunca fica de ponta-cabeça (espelha quando aponta para a direita)');
  ok(viradas <= 40, `a cabeça vira de lado ${viradas} vezes na luta inteira (sem piscar)`);
}

// ── A3 · the pipes' free lane
{
  const rnd = LCG(7);
  let nunca = true, segunda = true, terceira = true;
  for (let i = 0; i < 10000; i++) {
    const nave = Math.floor(rnd() * 4), n = i % 3, f = sorteiaLivre(n, nave, rnd);
    if (f === nave) nunca = false;
    if (n === 1 && Math.abs(f - nave) > 2) segunda = false;
    if (n === 2 && Math.abs(f - nave) !== 1) terceira = false;
  }
  ok(nunca && segunda && terceira, 'a faixa livre: nunca a da nave; a 2ª até 2 faixas; a 3ª a vizinha (10.000 sorteios)');
  // time to reach the free lane (centre to centre at 110 px/s) vs the warning of that salvo, the worst case per salvo
  const pior = [3, 2, 1].map((d, i) => ({ precisa: (d * 54) / N.nave.vel, tem: N.canos.aviso[i] }));
  ok(pior.every((p) => p.precisa <= p.tem), `dá tempo de chegar à faixa livre: ${pior.map((p) => `${p.precisa.toFixed(2)} ≤ ${p.tem} s`).join(' · ')}`);
  const C = new Canos(10, N, LCG(3));
  C.atualiza(10 + N.canos.antes + 0.01, 100);
  const q = C.estado(10 + N.canos.antes + 0.5);
  ok(q.fase === 'aviso' && q.i === 0 && q.livre !== 1, `a 1ª salva avisa com a faixa livre ${q.livre} (a nave na 1)`);
  const f = C.estado(C.t0 + C.salvas[0].tFogo + 0.05);
  ok(f.fase === 'fogo' && f.frente > 0.3 && f.frente < 0.4, `o fogo: a frente a ${(f.frente * 100).toFixed(0)}% em 0,05 s`);
  const fim = C.estado(C.t0 + duracaoCanos(N.canos) - 0.01);
  ok(fim.fase === 'brasa', `a pausa dos canos termina na brasa (${fim.fase})`);
}
// ── round 2 (2), his note: at EVERY pipes' post — the 2nd and the 3rd with the tail bitten off — the body covers the
// whole right side (every row from y 10 to 215 has her body from x ≤ 360 to the edge) and every lane has its pipe on her
{
  const postos = R.trechos.filter((t) => t.hab === 'canos');
  ok(mord[0].t < postos[1].t0 && mord[1].t < postos[2].t0, `as mordidas da cauda caem antes do posto seguinte (${mord[0].t.toFixed(1)} < ${postos[1].t0.toFixed(1)} · ${mord[1].t.toFixed(1)} < ${postos[2].t0.toFixed(1)})`);
  postos.forEach((tr, i) => {
    const instantes = [];
    for (let q = tr.t0 + 0.1; q < tr.t1; q += 0.5) instantes.push(q);
    let pior = null;
    for (const t of instantes) {
      const P = pose(R, N, med, t, { mord });
      const falta = [];
      for (let y = 10; y < 216; y++) {
        const cobre = P.tubo.some((a) => Math.abs(y - a.y) <= a.r * 0.85 && a.x - a.r <= 360 && a.x + a.r >= 383);
        if (!cobre) falta.push(y);
      }
      const bocas = bocasDosCanos(P, N);
      const semCano = bocas.map((b, l) => (b.anel < 0 || b.x < 330 ? l + 1 : 0)).filter(Boolean);
      if ((falta.length || semCano.length) && !pior) pior = `t ${t.toFixed(1)}: ${falta.length ? `FALTAM as linhas ${falta[0]}…${falta.at(-1)} (${falta.length})` : ''} ${semCano.length ? `faixas SEM cano: ${semCano.join(', ')}` : ''}`;
    }
    const n = pose(R, N, med, tr.t0 + 0.1, { mord }).nAneis;
    ok(!pior, `posto ${i + 1} (${n} anéis): a lateral direita coberta e as 4 faixas com cano nos ${instantes.length} instantes da pausa${pior ? ` — ${pior}` : ''}`);
  });
  ok(R.postos.length === 3, `o enrolamento de cima se ajusta: ${R.postos.map((p) => `${p.aneis} anéis → ${p.h.toFixed(0)} px`).join(' · ')}`);
}
// ── A3 · the Echo's fairness
{
  const parada = new Trilha(), reta = new Trilha();
  for (let t = 0; t <= 3; t += 1 / 30) { parada.grava(t, 70, 100); reta.grava(t, 40 + 50 * t, 100); }
  const boca = { x: 240, y: 40 };
  const E1 = new Eco(1.0 - N.eco.leitura + 2.0, N); // spits at t = 3.0
  E1.rodadas.length = 1;
  E1.atualiza(3.0, parada, boca);
  const s1 = E1.rodadas[0].sementes;
  ok(s1.length === 5 && s1.every((s) => Math.hypot(s.x - 70, s.y - 100) <= 3), 'parada: as 5 sementes caem na nave');
  const E2 = new Eco(1.0, N); E2.rodadas.length = 1; E2.atualiza(3.0, reta, boca);
  const s2 = E2.rodadas[0].sementes, gaps = s2.slice(1).map((s, i) => s.x - s2[i].x);
  ok(gaps.every((g) => Math.abs(g - gaps[0]) < 1) && gaps[0] > 15, `em linha reta: espaçadas no arco (${gaps.map((g) => g.toFixed(1)).join(', ')} px)`);
  const j = E2.justica()[0];
  ok(j.idadeMaisNova >= N.eco.minIdade - 1e-6, `o ponto mais novo tem ${j.idadeMaisNova.toFixed(2)} s (≥ ${N.eco.minIdade})`);
  ok(j.vistaMin >= N.eco.vista - 1e-6, `toda semente cravada ${j.vistaMin.toFixed(2)} s antes de detonar (≥ ${N.eco.vista})`);
  ok(j.ordem, 'as detonações na ordem do caminho');
  const dur = duracaoEco(N.eco), E3 = new Eco(0, N);
  ok(Math.abs(E3.rodadas.at(-1).fim - dur) < 1e-6, `a pausa do Eco (${dur.toFixed(2)} s) cobre as ${N.eco.rodadas} rodadas`);
}
// ── A3 · the geysers
const geis = geiseres(R, N);
{
  const { ida, volta } = pontosGeiser(N.geiser);
  ok(ida.length + volta.length >= 6 && ida.length + volta.length <= 8, `${ida.length + volta.length} gêiseres por passagem (ida ${ida.join(', ')} · volta ${volta.join(', ')})`);
  ok(volta.every((x) => ida.some((a, i) => i && x > Math.min(a, ida[i - 1]) && x < Math.max(a, ida[i - 1]))), 'os da volta caem ENTRE os da ida');
  const c1 = geis.filter((g) => g.ciclo === 1);
  ok(c1.length === ida.length + volta.length, `no ciclo 1 os ${c1.length} gêiseres disparam`);
  // (2nd round, his "o corpo inteiro precisa sumir no rombo, para depois rolar a animação dela embaixo do casco")
  let escondida = true;
  for (const tr of R.trechos.filter((x) => x.sob === 'ida')) {
    const P = pose(R, N, med, tr.t0, { mord });
    if (P.tubo.some((a) => a.y - a.r < 216)) escondida = false;
  }
  ok(escondida, 'quando a lombada parte, o corpo inteiro já sumiu no rombo');
  let perto = 0;
  for (const a of geis) for (const b of geis) if (a !== b && a.tColuna < b.tFim && b.tColuna < a.tFim && Math.abs(a.x - b.x) < 25) perto++;
  ok(perto === 0, 'nenhum gêiser a menos de 25 px de outro ativo ao mesmo tempo');
}
// ── A3 · clearances
{
  const hit = N.nave.hit, nave = { x: 100, y: 100 };
  ok(Math.abs(folga(nave, hit, { c: { x: 130, y: 100, r: 5 } }) - (30 - 10.5 - 5)) < 1e-6, 'folga a um círculo à direita');
  ok(folga(nave, hit, { c: { x: 100, y: 100, r: 3 } }) < -3, 'círculo dentro da caixa: folga negativa');
  ok(Math.abs(folga(nave, hit, { r: { x0: 0, x1: 384, y0: 110, y1: 160 } }) - 5.5) < 1e-6, 'folga a uma faixa abaixo');
  ok(folga(nave, hit, { r: { x0: 0, x1: 384, y0: 102, y1: 160 } }) < 0, 'faixa que pega a caixa: negativa');
}

// ── B1 · turning pixel art: the 8× map (Scale2x ×3) only ever copies source pixels, and a straight line stays straight
{
  const w = 6, h = 4, rgba = new Uint8Array(w * h * 4);
  for (let x = 0; x < w; x++) { const i = (1 * w + x) * 4; rgba.set([200, 40, 40, 255], i); } // a red row
  const m = amplia8(rgba, w, h);
  ok(m.w === 48 && m.h === 32, `amplia8: ${w}×${h} → ${m.w}×${m.h}`);
  const fontes = new Set(m.idx);
  ok([...fontes].every((p) => p === -1 || (rgba[p * 4 + 3] > 128)), 'amplia8 só copia pixels da própria arte (nenhuma cor inventada)');
  let reta = true;
  for (let X = 0; X < m.w; X++) for (let Y = 0; Y < m.h; Y++) if ((m.idx[Y * m.w + X] >= 0) !== (Y >= 8 && Y < 16)) reta = false;
  ok(reta, 'amplia8: a linha reta continua reta e com a mesma espessura');
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
