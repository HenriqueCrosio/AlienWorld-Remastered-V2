// 08/11 — THE EEL'S PORT AGAINST THE APPROVED MOCK (plan `plans/2026-11-08-enguia-instalacao.md`): every module of
// `src/entities/serpente/enguia/` fed the same inputs as its `.mjs` in `scripts/_serpente/enguia/`, and their outputs
// compared exactly ("the approved is what shows", made a test). One section per task of the plan.
//   node scripts/test-enguia-porte.mjs [section …]      (no section: all)
import { pathToFileURL } from 'node:url';
import path from 'node:path';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const iguais = (a, b) => a.length === b.length && Array.prototype.every.call(a, (v, i) => v === b[i]);
const M = (p) => import(pathToFileURL(path.resolve(`scripts/_serpente/enguia/${p}`)).href);
const P = (p) => import(pathToFileURL(path.resolve(`src/entities/serpente/enguia/${p}`)).href);
const secoes = process.argv.slice(2);
const roda = (nome) => !secoes.length || secoes.includes(nome);

// ── Task 2 · the pixelfx effects
if (roda('efeitos')) {
  const em = await M('efeitos.mjs'), ep = await P('efeitos.ts');
  const fx = await M('pixelfx/core/index.js');
  const par = (pinta, nome) => {
    const a = fx.createFrame(384, 216), b = fx.createFrame(384, 216);
    pinta(em, fx.painterFor(a)); pinta(ep, fx.painterFor(b));
    const tem = a.color.some((v) => v) || a.light.some((v) => v);
    ok(tem && iguais(a.color, b.color) && iguais(a.light, b.light), nome);
  };
  for (const [t, frente, fim] of [[0.1, 0.3, 1], [0.4, 1, 1], [0.7, 1, 0.4]])
    par((m, p) => m.fogoCanos(p, t, { x: 352, y: 27, meia: 26, alcance: 358, frente, fim, semente: 7 }), `fogoCanos t=${t} frente=${frente} fim=${fim}`);
  for (const k of [1, 0.4]) par((m, p) => m.semente(p, 1.3, { x: 120, y: 90, r: 4.5, semente: 20, k }), `semente k=${k}`);
  for (const age of [0.05, 0.3, 0.9]) par((m, p) => m.bolaDeFogo(p, age, { x: 300, y: 170, semente: 5 }), `bolaDeFogo age=${age}`);
  for (const [nome, cria] of [['implosaoFx', (m) => m.implosaoFx(290, 178)], ['vaporFx', (m) => m.vaporFx(165, 168, 165)]]) {
    const ia = cria(em), ib = cria(ep);
    let todos = true, algum = false;
    for (let k = 0; k < 40; k++) {
      ia.update(1 / 30); ib.update(1 / 30);
      if (k === 20) { ia.stop(); ib.stop(); }
      if (k % 5) continue;
      const a = fx.createFrame(384, 216), b = fx.createFrame(384, 216);
      ia.draw(a); ib.draw(b);
      if (a.color.some((v) => v) || a.light.some((v) => v)) algum = true;
      if (!iguais(a.color, b.color) || !iguais(a.light, b.light)) todos = false;
    }
    ok(algum && todos && ia.done() === ib.done(), `${nome}: 40 passos iguais`);
  }
  // the layer's compose onto an opaque frame
  {
    const out1 = new Uint8Array(384 * 216 * 4).map((_, i) => (i * 37) & 255), out2 = Uint8Array.from(out1);
    const ca = new em.Camada(384, 216), cb = new ep.Camada(384, 216);
    em.fogoCanos(ca.pintor(), 0.4, { x: 352, y: 27, meia: 26, alcance: 358, frente: 1, fim: 1, semente: 7 });
    ep.fogoCanos(cb.pintor(), 0.4, { x: 352, y: 27, meia: 26, alcance: 358, frente: 1, fim: 1, semente: 7 });
    ca.compoe(out1); cb.compoe(out2);
    ok(iguais(out1, out2), 'Camada.compoe igual');
  }
}

// ── Task 3 · the pure motion (the path, the pipes, the Echo, the geysers, the clearances, the pose)
const igualObj = (a, b) => JSON.stringify(a) === JSON.stringify(b);
if (roda('movimento')) {
  const Nm = (await M('numeros.mjs')).N, Np = (await P('numeros.ts')).N;
  ok(igualObj(Nm, Np), 'N igual ao da maquete');
  const LCGm = (await M('numeros.mjs')).LCG, LCGp = (await P('numeros.ts')).LCG;
  { const a = LCGm(77), b = LCGp(77); let s = true; for (let i = 0; i < 1000; i++) if (a() !== b()) s = false; ok(s, 'LCG igual'); }
  const cm = await M('caminho.mjs'), cp = await P('caminho.ts');
  const pernas = [
    [[[300, 150], [288, 72], [252, 38], [196, 26], [158, 30]], { onda: Nm.onda }],
    [[[126, 44], [102, 66], [88, 96], [82, 128]], {}],
    [[[86, 168], [96, 214], [108, 262]], {}],
    [[[150, 330], [260, 360], [350, 330], [372, 262]], {}],
    [[[226, 50], [198, 74], [192, 104], [210, 130], [244, 154], [276, 182], [290, 216], [294, 300]], { onda: Nm.onda, calma0: true }],
  ];
  const a = new cm.Caminho([300, 600]), b = new cp.Caminho([300, 600]);
  a.junta([[300, 300]]); b.junta([[300, 300]]);
  for (const [pts, o] of pernas) { const ra = a.junta(pts, o), rb = b.junta(pts, o); ok(igualObj(ra, rb), `junta → [${rb}]`); }
  ok(iguais(a.xs, b.xs) && iguais(a.ys, b.ys), `Caminho: xs/ys iguais (${b.L + 1} pontos)`);
  { const g = LCGm(3); let s = true; for (let i = 0; i < 500; i++) { const q = g() * a.L; if (!igualObj(a.ponto(q), b.ponto(q)) || !igualObj(a.rumo(q), b.rumo(q))) s = false; } ok(s, 'ponto/rumo iguais em 500 s'); }
  ok(igualObj(cm.reamostra([[0, 0], [3, 4], [3, 14]], 1), cp.reamostra([[0, 0], [3, 4], [3, 14]], 1)), 'reamostra igual');

  const km = await M('canos.mjs'), kp = await P('canos.ts');
  { const ga = LCGm(9), gb = LCGp(9); let s = true; for (let r = 0; r < 50; r++) for (let n = 0; n < 3; n++) for (let f = 0; f < 4; f++) if (km.sorteiaLivre(n, f, ga) !== kp.sorteiaLivre(n, f, gb)) s = false; ok(s, 'sorteiaLivre igual'); }
  for (const corte of [null, 3.7]) {
    const A = new km.Canos(2, Nm, LCGm(20261107), corte), B = new kp.Canos(2, Np, LCGp(20261107), corte);
    let s = true;
    for (let t = 0; t < 12; t += 1 / 60) {
      const y = 108 + 90 * Math.sin(t * 1.3);
      A.atualiza(t, y); B.atualiza(t, y);
      if (!igualObj(A.estado(t), B.estado(t)) || !igualObj(A.brasas(t), B.brasas(t))) s = false;
    }
    ok(s && igualObj(A.salvas, B.salvas), `Canos (corte ${corte}): estado e brasas iguais a cada 1/60 s`);
  }
  const em = await M('eco.mjs'), ep = await P('eco.ts');
  for (const final of [false, true]) {
    const ta = new em.Trilha(), tb = new ep.Trilha(), A = new em.Eco(3, Nm, final), B = new ep.Eco(3, Np, final);
    let s = true;
    for (let t = 0; t < 10; t += 1 / 60) {
      const x = 80 + 40 * Math.cos(t * 1.7), y = 100 + 40 * Math.sin(t * 1.7);
      A.atualiza(t, ta, { x: 260, y: 40 }); B.atualiza(t, tb, { x: 260, y: 40 });
      ta.grava(t, x, y); tb.grava(t, x, y);
      if (!igualObj(A.estado(t), B.estado(t))) s = false;
    }
    ok(s && igualObj(A.justica(), B.justica()), `Eco (final ${final}): estado e justiça iguais`);
  }
  const gm = await M('geiseres.mjs'), gp = await P('geiseres.ts');
  ok(igualObj([...gm.trilhaFissura(Nm).trilha], [...gp.trilhaFissura(Np).trilha]) && igualObj(gm.trilhaFissura(Nm).ramos, gp.trilhaFissura(Np).ramos), 'trilhaFissura igual');
  ok(igualObj(gm.pontosGeiser(Nm.geiser), gp.pontosGeiser(Np.geiser)), 'pontosGeiser igual');
  const fm = await M('perigos.mjs'), fp = await P('perigos.ts');
  { const g = LCGm(11); let s = true; for (let i = 0; i < 2000; i++) {
    const nave = { x: g() * 384, y: g() * 216 }, f = g() < 0.5 ? { c: { x: g() * 384, y: g() * 216, r: 2 + g() * 20 } } : { r: { x0: g() * 300, x1: 0, y0: g() * 200, y1: 0 } };
    if (f.r) { f.r.x1 = f.r.x0 + g() * 80; f.r.y1 = f.r.y0 + g() * 50; }
    if (fm.folga(nave, Nm.nave.hit, f) !== fp.folga(nave, Np.nave.hit, f)) s = false;
  } ok(s, 'folga igual em 2000 casos'); }
  // the pose and the hazards, on the mock's own choreography and measures
  const { montaRoteiro } = await M('roteiro.mjs'), { medidas } = await M('medidas.mjs');
  const med = await medidas(Nm), R = montaRoteiro(Nm, med);
  const om = await M('corpo.mjs'), op = await P('corpo.ts');
  const mord = om.mordidas(R, Nm, med);
  ok(igualObj(mord, op.mordidas(R, Np, med)), 'mordidas (o roteiro da maquete) iguais');
  { const g = LCGm(21); let s = true, sc = true, sp = true;
    const M0 = { R, N: Nm, med, mord, canos: [], ecos: [], geis: gm.geiseres(R, Nm) }, M1 = { ...M0, N: Np, geis: gp.geiseres(R, Np) };
    ok(igualObj(M0.geis, M1.geis), `geiseres iguais (${M1.geis.length})`);
    for (let i = 0; i < 300; i++) {
      const t = g() * R.T, giro = (g() - 0.5) * 0.6, treme = g() < 0.3 ? { x: 1, y: -1 } : null;
      const pa = om.pose(R, Nm, med, t, { mord, giro, treme }), pb = op.pose(R, Np, med, t, { mord, giro, treme });
      if (!igualObj(pa, pb)) s = false;
      if (!igualObj(pa.cabeca, op.poseCabeca(R, Np, med, t, { giro, treme }).cabeca)) sc = false;
      if (!igualObj(fm.perigos(M0, t, pa), fp.perigos(M1, t, pb))) sp = false;
    }
    ok(s, 'pose igual em 300 instantes'); ok(sc, 'poseCabeca = a cabeça da pose'); ok(sp, 'perigos iguais em 300 instantes'); }
  { let s = true; for (const t of [10, 40, 70, 100]) for (const n of [20, 17]) if (om.nAneisEm(t, Nm, mord) !== op.nAneisEm(t, Np, mord)) s = false; ok(s, 'nAneisEm igual'); }
}

// ── Task 4 · the art at load (the measures, the strip, the normals, the views, the gestures, the 8× on demand)
export async function leitorNode() {
  const { createRequire } = await import('node:module');
  const sharp = createRequire(import.meta.url)('sharp');
  const { ARQUIVOS_ENGUIA } = await P('arquivos.ts'), { normaliza } = await P('fonte.ts');
  const cache = new Map();
  for (const [k, f] of Object.entries(ARQUIVOS_ENGUIA)) {
    const { data, info } = await sharp(`public/sprites/enguia/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    cache.set(k, normaliza({ data: new Uint8Array(data), w: info.width, h: info.height }));
  }
  return (k) => { const v = cache.get(k); if (!v) throw new Error(`sem ${k}`); return v; };
}
// (the colour of a fully transparent pixel: the PNGs keep some, the canvas drops it — the mock never reads it, so both
// sides compare with it zeroed; every map built from the pixels is compared exactly below)
const iguaisRGBA = (a, b) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 4) {
    if (a[i + 3] !== b[i + 3]) return false;
    if (a[i + 3] && (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2])) return false;
  }
  return true;
};
if (roda('arte')) {
  const Nm = (await M('numeros.mjs')).N, Np = (await P('numeros.ts')).N;
  const am = await M('arte.mjs'), ap = await P('arte.ts'), { Ampliado } = await P('ampliado.ts');
  const ler = await leitorNode();
  let t0 = performance.now();
  const Am = await am.carregaArte(Nm);
  const tm = performance.now() - t0; t0 = performance.now();
  const Ap = ap.carregaArte(Np, ler);
  const tp = performance.now() - t0;
  ok(iguaisRGBA(Am.faixa.data, Ap.faixa.data) && iguais(Am.faixa.topo, Ap.faixa.topo) && iguais(Am.faixa.base, Ap.faixa.base) && igualObj(Am.faixa.cols, Ap.faixa.cols), `faixa igual (${Ap.faixa.w}×${Ap.faixa.h})`);
  ok(iguais(Am.nFaixa, Ap.nFaixa), 'nFaixa igual');
  ok(igualObj(Am.luzFaixa, Ap.luzFaixa) && igualObj(Am.luzCabeca, Ap.luzCabeca), 'as luzes ajustadas iguais');
  ok(iguais(Am.nCabeca, Ap.nCabeca) && iguais(Am.cabeca.data, Ap.cabeca.data), 'a cabeça e as normais iguais');
  ok(iguais(Am.dorso.topo, Ap.dorso.topo) && iguais(Am.dorso.meio, Ap.dorso.meio) && iguais(Am.dorso.meia, Ap.dorso.meia), 'o dorso igual');
  {
    let s = true;
    for (let k = 0; k < Am.vistas.lista.length; k++) {
      const a = Am.vistas.lista[k], b = Ap.vistas.lista[k];
      if (!a !== !b) { s = false; continue; }
      if (a && !(iguais(a.data, b.data) && iguais(a.n, b.n) && iguais(a.n0, b.n0))) s = false;
    }
    ok(s, `as ${Ap.vistas.lista.length} vistas iguais`);
  }
  // the 8× map: every 8× pixel, and 20 000 fractional positions, against the mock's whole map
  const exaustivo = (rgba, w, h, nome) => {
    const m = am.amplia8(rgba, w, h), p = new Ampliado(rgba, w, h);
    let s = m.w === p.w && m.h === p.h;
    for (let Y = 0; Y < m.h && s; Y++) for (let X = 0; X < m.w; X++) if (p.fonte(X / 8 + 1 / 16, Y / 8 + 1 / 16) !== m.idx[Y * m.w + X]) { s = false; console.log('  difere em', X, Y); break; }
    const g = (await_LCG)(31);
    for (let i = 0; i < 20000 && s; i++) { const ax = g() * (w + 2) - 1, ay = g() * (h + 2) - 1; if (p.fonte(ax, ay) !== am.fonte8(m, ax, ay)) s = false; }
    ok(s, `Ampliado = amplia8, exaustivo (${nome})`);
  };
  const await_LCG = (await M('numeros.mjs')).LCG;
  exaustivo(Am.cabeca.data, Am.cabeca.w, Am.cabeca.h, 'E3');
  exaustivo(Am.faixa.data, Am.faixa.w, Am.faixa.h, 'a faixa');
  // the gestures
  const gm = await M('gestos.mjs'), gp = await P('gestos.ts');
  t0 = performance.now();
  const Gm = await gm.carregaGestos();
  const tgm = performance.now() - t0; t0 = performance.now();
  const Gp = gp.carregaGestos(ler, Ap.dorsoCabeca);
  const tgp = performance.now() - t0;
  {
    let s = true, sv = true;
    for (const pasta of Object.keys(Gm)) for (let k = 0; k < Gm[pasta].length; k++) {
      const a = Gm[pasta][k], b = Gp[pasta][k];
      if (!(iguaisRGBA(a.data, b.data) && iguais(a.n, b.n) && igualObj(a.boca, b.boca) && a.oy === b.oy)) { s = false; console.log('  difere', pasta, k); }
      if (!!a.vistas !== !!b.vistas) sv = false;
      if (a.vistas) for (let q = 0; q < a.vistas.lista.length; q++) { const x = a.vistas.lista[q], y = b.vistas.lista[q]; if (x && !(iguais(x.data, y.data) && iguais(x.n, y.n) && iguais(x.n0, y.n0))) sv = false; }
    }
    ok(s, 'os quadros dos gestos iguais (dados, normais, boca)');
    ok(sv, 'as vistas do fechar do Eco iguais');
  }
  exaustivo(Gm.eco[6].data, Gm.eco[6].w, Gm.eco[6].h, 'eco/q06');
  exaustivo(Gm.canos[8].data, Gm.canos[8].w, Gm.canos[8].h, 'canos/q08');
  exaustivo(Gm.eco[3].vistas.lista[9].data, 96, 64, 'a vista 90° do eco/q03');
  console.log(`  tempos: maquete arte ${tm.toFixed(0)} ms + gestos ${tgm.toFixed(0)} ms; porte arte ${tp.toFixed(0)} ms + gestos ${tgp.toFixed(0)} ms`);
  // the measures
  const mm = await (await M('medidas.mjs')).medidas(Nm), mp = (await P('medidas.ts')).medidas(Np, ler('enguiaCabeca'), ler('enguiaF1'));
  ok(igualObj({ ...mm.cabeca, mascara: [...mm.cabeca.mascara] }, { ...mp.cabeca, mascara: [...mp.cabeca.mascara] }) && igualObj(mm.circulosCabeca, mp.circulosCabeca), 'medidas: a cabeça igual');
  { let s = true; for (let u = -30; u <= 560; u += 0.5) if (mm.perfil(u) !== mp.perfil(u) || mm.raioU(u) !== mp.raioU(u)) s = false; for (let k = 0; k < 20; k++) if (mm.raio(k) !== mp.raio(k)) s = false; ok(s, 'medidas: perfil, raio, raioU iguais'); }
  // the timing functions, on the mock's own choreography
  const { montaRoteiro } = await M('roteiro.mjs'), R = montaRoteiro(Nm, mm);
  const km = await M('canos.mjs'), em = await M('eco.mjs');
  {
    let s = true;
    const canos = R.trechos.filter((t) => t.hab === 'canos').map((tr) => { const C = new km.Canos(tr.t0, Nm, (await_LCG)(5), tr.corte); for (const sv of C.salvas) sv.livre = sv.i % 4; return C; });
    const ecos = R.trechos.filter((t) => t.hab === 'eco').map((tr) => new em.Eco(tr.t0, Nm, tr.final));
    const rodadas = ecos.flatMap((E) => E.rodadas);
    const st1 = {}, st2 = {}, jan = (t) => 0.8 + (Math.floor(t * 7) % 3) * 0.5;
    for (let t = 0; t < R.T; t += 1 / 60) {
      const e = R.estado(t), C = canos.find((c) => t >= c.t0 && t < c.t0 + 12);
      const a = [gm.quadroEco(t, rodadas), gm.quadroCanos(t, C), gm.quadroPrepara(t, R.trechos), gm.quadroMergulho(t, e.trecho, R.trechos, 1.3), gm.quadroMordida(t, 50), gm.chuteMordida(t, 50), gm.quadroPresa(t, e.trecho), gm.chuteCanos(t, C), gm.quadroNadar(t, st1, jan)];
      const b = [gp.quadroEco(t, rodadas), gp.quadroCanos(t, C), gp.quadroPrepara(t, R.trechos), gp.quadroMergulho(t, e.trecho, R.trechos, 1.3), gp.quadroMordida(t, 50), gp.chuteMordida(t, 50), gp.quadroPresa(t, e.trecho), gp.chuteCanos(t, C), gp.quadroNadar(t, st2, jan)];
      if (!igualObj(a, b)) { s = false; break; }
    }
    ok(s, 'as funções de tempo dos gestos iguais a cada 1/60 s');
  }
}

// ── Task 5 · the live choreography, composed in the mock's order, is the mock's
export async function roteiroComoMaquete(Np, med) {
  const rp = await P('roteiro.ts');
  const R = new rp.RoteiroVivo(Np, med, { aneisNoPosto: (c) => Np.corpo.aneis - Np.mordida.aneis * Math.min(c - 1, 2) });
  R.chegada();
  for (let c = 1; c <= Np.ciclos; c++) { R.mergulhoErguida(c, false); R.sobVolta(c); R.posto(c + 1); }
  R.cortaCanos(rp.corteCanos(Np.canos));
  R.mergulhoErguida(Np.ciclos + 1, true);
  R.morte();
  return R;
}
if (roda('roteiro')) {
  const Nm = (await M('numeros.mjs')).N, Np = (await P('numeros.ts')).N;
  const { montaRoteiro } = await M('roteiro.mjs'), { medidas } = await M('medidas.mjs');
  const med = await medidas(Nm), Rm = montaRoteiro(Nm, med);
  const Rp = await roteiroComoMaquete(Np, med);
  ok(iguais(Rm.caminho.xs, Rp.caminho.xs) && iguais(Rm.caminho.ys, Rp.caminho.ys), `o caminho igual (${Rp.caminho.L + 1} pontos)`);
  ok(Rm.trechos.length === Rp.trechos.length && Rm.trechos.every((a, i) => { const b = Rp.trechos[i]; return a.nome === b.nome && a.t0 === b.t0 && a.t1 === b.t1 && a.s0 === b.s0 && a.s1 === b.s1 && a.cap === b.cap && (a.ciclo ?? null) === (b.ciclo ?? null) && !!a.final === !!b.final && (a.corte ?? null) === (b.corte ?? null); }), `os ${Rp.trechos.length} trechos iguais (nome, t0, t1, s0, s1)`);
  ok(Rm.T === Rp.T, `T igual (${Rp.T.toFixed(3)})`);
  { let s = true; for (let q = 0; q <= Rm.caminho.L; q++) if (Rm.rola(q) !== Rp.rola(q)) { s = false; console.log('  rola difere em', q, Rm.rola(q), Rp.rola(q)); break; } ok(s, 'a rolagem igual em todo s'); }
  ok(igualObj(Rm.sinais, Rp.sinais), `os sinais iguais (${Rp.sinais.length})`);
  ok(igualObj(Rm.postos, Rp.postos), 'os postos (a espiral) iguais');
  { let s = true; for (let t = 0; t <= Rm.T; t += 1 / 240) { const a = Rm.estado(t), b = Rp.estado(t); if (a.s !== b.s || a.tl !== b.tl || a.trecho.nome !== b.trecho.nome) { s = false; break; } } ok(s, 'estado(t) igual a cada 1/240 s'); }
  // the cut: the pipes of cycle 1 cut 3 s in — the next block starts there, the path the same
  {
    const rp = await P('roteiro.ts');
    const R = new rp.RoteiroVivo(Np, med, { aneisNoPosto: () => 20 });
    R.chegada();
    const canos = R.ultimo, L0 = R.caminho.L;
    R.cortaCanos(3.0);
    R.mergulhoErguida(1, true);
    const merg = R.trechos.find((t) => t.nome === 'prepara' && t.cap === 'mergulho');
    ok(canos.corte === 3 && Math.abs(merg.t0 - (canos.t0 + 3.3)) < 1e-12 && R.caminho.L > L0, 'o corte dos canos: o mergulho começa no fim do apagar');
    const Rref = new rp.RoteiroVivo(Np, med, { aneisNoPosto: () => 20 });
    Rref.chegada(); Rref.mergulhoErguida(1, true);
    ok(iguais(R.caminho.xs, Rref.caminho.xs), 'o corte não muda o caminho');
    // the final Echo again, then the death cutting it halfway
    const eco1 = R.ultimo;
    R.ecoFinal(1);
    const eco2 = R.ultimo, meio = (eco2.t0 + eco2.t1) / 2;
    R.corta(meio); R.morte();
    let enc = true;
    for (let i = 1; i < R.trechos.length; i++) if (R.trechos[i].t0 !== R.trechos[i - 1].t1) enc = false;
    ok(eco1.final && eco2.final && eco2.t1 === meio && enc && R.ultimo.hab === 'fim', 'o Eco final repetido e a morte cortando o Eco: encadeados');
  }
}

// ── Task 6 · the breathers
if (roda('respiros')) {
  const Nm = (await M('numeros.mjs')).N, Np = (await P('numeros.ts')).N;
  const { montaRoteiro } = await M('roteiro.mjs'), { medidas } = await M('medidas.mjs');
  const med = await medidas(Nm), Rm = montaRoteiro(Nm, med);
  const om = await M('corpo.mjs'), mord = om.mordidas(Rm, Nm, med);
  const rm = await M('respiros.mjs'), rp = await P('respiros.ts');
  // the snaps: block by block on the live choreography (scanned up to each block's last pause), = the mock's list
  {
    const Rp = await roteiroComoMaquete(Np, med);
    const E = new rp.Estalos(Rp, Np, med);
    for (const tr of Rp.trechos) if (tr.tipo === 'pausa') E.avanca(tr.t0);
    E.avanca(Rp.T);
    const lista = E.spans.map((s) => ({ t0: s.t0 - 0.12, t1: s.t1 + 0.1 }));
    ok(igualObj(lista, rm.estalosDaCabeca(Rm, Nm, med, mord)), `os estalos da cabeça iguais (${lista.length})`);
  }
  const A = new rm.Respiros(Rm, Nm, med, mord), B = new rp.Respiros(Rm, Np, med);
  B.estalos.avanca(Rm.T);
  const dt = 1 / Nm.tela.fps;
  let s = true, sd = true, sl = true, quadros = 0, maxJ = 0;
  for (let f = 0; f * dt <= Rm.T; f++) {
    const t = f * dt, Pz = om.pose(Rm, Nm, med, t, { mord });
    A.passo(t, dt, Pz); B.passo(t, dt, Pz);
    quadros++;
    maxJ = Math.max(maxJ, B.jatos.length);
    if (!igualObj(A.jatos, B.jatos) || !igualObj(A.gas, B.gas) || !igualObj(A.fluxo, B.fluxo)) { if (s) console.log('  difere no quadro', f, t.toFixed(3)); s = false; break; }
    if (f % 30 === 0) {
      const la = [], lb = [];
      A.desenha((x, y, c, a) => la.push(x, y, ...c, a)); B.desenha((x, y, c, a) => lb.push(x, y, ...c, a));
      if (!iguais(la, lb)) sd = false;
      for (let u = -30; u <= 560; u += 7) if (A.luz(u) !== B.luz(u)) sl = false;
    }
  }
  ok(s, `os respiros (jatos, gás, fluxo) iguais em ${quadros} quadros (até ${maxJ} jatos)`);
  ok(sd, 'o desenho dos respiros igual (a cada 30 quadros)');
  ok(sl, 'a luz dos anéis igual');
}

// ── Task 7 · the frame: the port in the oracle's target = the mock's frame (md5); the game's two canvases ≈ it
export async function lerRaw(arq) {
  const { createRequire } = await import('node:module');
  const sharp = createRequire(import.meta.url)('sharp');
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data: new Uint8Array(data), w: info.width, h: info.height };
}
export const ARENA = 'docs/superpowers/folhas/2026-10-29/serpente-casco/cru';
if (roda('desenho')) {
  const { createHash } = await import('node:crypto');
  const md5 = (b) => createHash('md5').update(b).digest('hex');
  const Nm = (await M('numeros.mjs')).N, Np = (await P('numeros.ts')).N;
  const { montaRoteiro } = await M('roteiro.mjs'), { medidas } = await M('medidas.mjs');
  const med = await medidas(Nm), R = montaRoteiro(Nm, med);
  const om = await M('corpo.mjs'), mord = om.mordidas(R, Nm, med);
  const dm = await M('desenho.mjs'), dp = await P('desenho.ts'), am = await M('arte.mjs'), ap = await P('arte.ts');
  const efm = await M('efeitos.mjs'), efp = await P('efeitos.ts'), alv = await P('alvos.ts');
  const km = await M('canos.mjs'), em = await M('eco.mjs'), gmo = await M('geiseres.mjs'), gpo = await P('gestos.ts');
  const ler = await leitorNode();
  const Dm = await dm.preparaDesenho(Nm, med, ARENA); Dm.arte = await am.carregaArte(Nm);
  const Ap = ap.carregaArte(Np, ler), Gp = gpo.carregaGestos(ler, Ap.dorsoCabeca), Gm = await (await M('gestos.mjs')).carregaGestos();
  const fundo = (await lerRaw(`${ARENA}/arena-semnave.png`)).data, labio = await lerRaw('public/sprites/serpente-rombo-labio.png');
  const Dp = dp.preparaDesenho(Np, med, Ap, { fundo, labio });
  const labioFoto = new Uint8Array(384 * 216 * 4);
  for (let p = 0; p < 384 * 216; p++) if (Dp.naFrente[p]) { labioFoto.set(fundo.subarray(p * 4, p * 4 + 3), p * 4); labioFoto[p * 4 + 3] = 255; }
  ok(iguais(Dm.naFrente, Dp.naFrente) && iguais(Dm.bordaLabio, Dp.bordaLabio) && iguais(Dm.pertoBorda, Dp.pertoBorda), 'o lábio, a borda e a faixa de raspa iguais');
  const geis = gmo.geiseres(R, Nm);
  const canos = R.trechos.filter((t) => t.hab === 'canos').map((tr) => new km.Canos(tr.t0, Nm, (await_LCG2)(20261107), tr.corte));
  const ecos = R.trechos.filter((t) => t.hab === 'eco').map((tr) => new em.Eco(tr.t0, Nm, tr.final));
  const trilha = new em.Trilha();
  for (let t = 0; t <= R.T; t += 1 / 30) trilha.grava(t, 70 + 30 * Math.cos(t), 100 + 30 * Math.sin(1.3 * t));
  for (let t = 0; t <= R.T; t += 1 / 30) { for (const C of canos) C.atualiza(t, 100 + 60 * Math.sin(t)); for (const E of ecos) E.atualiza(t, trilha, { x: 250, y: 40 }); }
  function await_LCG2(s) { let a = s >>> 0; return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296; }; }
  const g = await_LCG2(99);
  const momentos = [];
  const tr = (f) => R.trechos.find(f);
  momentos.push(tr((t) => t.nome === 'arco').t0 + 2.2, tr((t) => t.hab === 'canos').t0 + Nm.canos.antes + 0.9, tr((t) => t.hab === 'canos').t0 + Nm.canos.antes + Nm.canos.aviso[0] + 0.3,
    tr((t) => t.nome === 'mergulho').t0 + 1.3, tr((t) => t.hab === 'eco').t0 + Nm.eco.leitura + Nm.eco.voo + 0.35, tr((t) => t.hab === 'eco').t0 + 1.2,
    geis[2].tColuna + 0.15, geis[2].tAviso + 0.2, tr((t) => t.nome === 'volta').t0 + 1.4, mord[0].t + 0.35, mord[1].t + 1.5, tr((t) => t.sob === 'ida').t0 + 0.9,
    tr((t) => t.hab === 'presa').t0 + 0.8, tr((t) => t.nome === 'mergulho-cauda').t0 + 1.2, tr((t) => t.hab === 'desfaz').t0 + 0.12, tr((t) => t.hab === 'desfaz').t0 + 1.2,
    R.trechos.filter((t) => t.hab === 'eco').at(-1).t0 + 1.0, tr((t) => t.hab === 'fim').t0 + 0.6, R.sinais[1].t0 + 0.3, tr((t) => t.hab === 'fusao').t0 + 0.5);
  for (let i = 0; i < 20; i++) momentos.push(g() * R.T);
  let iguaisMd5 = 0, lonasOk = 0, solidosOk = 0, mascOk = 0, piorDif = 0;
  const pastas = ['eco', 'canos', 'prepara', 'nadar', 'dor', 'agonia'];
  momentos.forEach((t, n) => {
    const e = R.estado(t), hab = e.trecho.hab;
    const giro = n % 3 === 0 ? (g() - 0.5) * 0.5 : 0, treme = n % 5 === 0 ? { x: 1, y: 0 } : null;
    const Pz = om.pose(R, Nm, med, t, { mord, giro, treme });
    const pasta = pastas[n % 6], kq = n % 4 === 0 ? null : Math.floor(g() * Gm[pasta].length);
    const lomb = gmo.lombada(R, Nm, t);
    const canosAgora = canos.map((C) => C.estado(t)).find((q) => q && q.fase !== 'fecha') ?? null;
    const ecoAgora = ecos.find((E) => t >= E.t0 && t < E.rodadas.at(-1).fim + 0.4);
    let eco = null;
    if (ecoAgora) { const q = ecoAgora.estado(t); eco = { ...q, rastro: q.lendo ? trilha.entre(t - ecoAgora.leitura, t) : null }; }
    const particulas = n % 2 ? [
      { x: 120, y: 80, vx: 30, vy: -10, idade: 0.1, vida: 0.5, tam: 1, cor: [255, 200, 120], gota: true },
      { x: 200, y: 120, vx: 0, vy: 0, idade: 0.2, vida: 0.6, tam: 6, cor: [255, 150, 60], anel: true, a: 0.6 },
      { x: 150, y: 60, idade: 0.3, vida: 1, tam: 4, cor: [52, 48, 52], cresce: true, a: 0.5 },
      { x: 90, y: 150, idade: 0.1, vida: 0.4, tam: 1, cor: [255, 240, 180] },
      { x: 300, y: 100, idade: 0.5, vida: 1.2, tam: 1, pedaco: [{ dx: 0, dy: 0, c: [80, 80, 90], borda: true, brasa: true }, { dx: 1, dy: 0, c: [60, 60, 70] }] },
    ] : [];
    const luz = n % 3 === 1 ? (u) => 1 + 0.6 * Math.max(0, Math.sin(u / 9)) : null;
    const base = {
      t, f: Math.round(t * 30), pose: Pz, geis, lombada: lomb, canos: canosAgora, brasas: canos.flatMap((C) => C.brasas(t)), eco,
      sinais: R.sinais.filter((a) => t >= a.t0 && t < a.t1), fissuras: gmo.fissuras(R, Nm, t), particulas,
      semCabeca: ['desfaz', 'resto', 'fim'].includes(hab), morta: hab === 'fusao', mordida: n % 4 === 1 ? { x: 48, y: 4, r: 7 } : null,
      olhoAceso: !!eco?.lendo, decapitada: ['desfaz', 'resto', 'fim'].includes(hab), luzCorpo: luz, respiros: null,
    };
    const fxm = n % 5 === 2 ? efm.implosaoFx(290, 178) : null, fxp = n % 5 === 2 ? efp.implosaoFx(290, 178) : null;
    if (fxm) for (let k = 0; k < 20; k++) { fxm.update(1 / 30); fxp.update(1 / 30); }
    const sm = { ...base, tiros: [], nave: { x: -500, y: -500 }, gesto: kq == null ? null : Gm[pasta][kq], modoCorpo: 'pele', pfx: { mod: efm, camada: new efm.Camada(384, 216), vivos: fxm ? [fxm] : [], estouro: n % 7 === 3 ? { t: t - 0.2, x: 280, y: 160 } : null } };
    const sp = { ...base, gesto: kq == null ? null : Gp[pasta][kq], cascoProprio: true, pfx: { mod: efp, camada: new efp.Camada(384, 216), vivos: fxp ? [fxp] : [], estouro: sm.pfx.estouro, fusao: null } };
    const a = dm.quadro(Dm, sm);
    const Q = new alv.AlvoQuadro(fundo); dp.quadro(Dp, sp, Q);
    if (md5(a) === md5(Q.out)) iguaisMd5++;
    else console.log(`  difere em t=${t.toFixed(2)} (${e.trecho.nome})`);
    // the game's two canvases, composed over the photo
    // (the photo's lip went through the game's Atmosfera; the texture is raw — in the game both canvases and the lip get
    // the same grade, so here the lip comes from the photo, to compare the routing alone)
    const L = new alv.AlvoLonas(); L.defineLabio(labioFoto);
    const sp2 = { ...sp, cascoProprio: true, pfx: { ...sp.pfx, camada: new efp.Camada(384, 216) } };
    if (process.env.DEPURA_PX && Math.abs(t - Number(process.env.DEPURA_T)) < 0.01) {
      const [px, py] = process.env.DEPURA_PX.split(',').map(Number), alvoLog = L;
      const put0 = alvoLog.put.bind(alvoLog), fx0 = alvoLog.compoeFx.bind(alvoLog);
      alvoLog.put = (x, y, r, g2, b, al, parte) => { if (Math.round(x) === px && Math.round(y) === py) console.log('  put', [r, g2, b].map(Math.round), al.toFixed(3), parte, new Error().stack.split('\n')[2].trim()); put0(x, y, r, g2, b, al, parte); };
      alvoLog.compoeFx = (f) => { const p = py * 384 + px; console.log('  fx cor', (f.color[p] >>> 0).toString(16), 'luz', (f.light[p] >>> 0).toString(16)); fx0(f); };
    }
    dp.quadro(Dp, sp2, L);
    const comp = Uint8Array.from(fundo);
    const sobre = (buf, i, c, al) => { for (let q = 0; q < 3; q++) comp[i + q] = Math.round(comp[i + q] + (buf[i + q] - comp[i + q]) * al); };
    let pior = 0, sol = true;
    for (let p = 0; p < 384 * 216; p++) {
      const i = p * 4;
      if (L.baixo[i + 3]) sobre(L.baixo, i, null, L.baixo[i + 3] / 255);
      if (L.luz[i + 3]) for (let q = 0; q < 3; q++) comp[i + q] = Math.min(255, comp[i + q] + L.luz[i + q]);
      if (L.cima[i + 3]) sobre(L.cima, i, null, L.cima[i + 3] / 255);
      const d = Math.max(Math.abs(comp[i] - a[i]), Math.abs(comp[i + 1] - a[i + 1]), Math.abs(comp[i + 2] - a[i + 2]));
      if (d > pior && d > 2 && process.env.DEPURA) console.log(`  t=${t.toFixed(2)} (${e.trecho.nome}) px ${p % 384},${Math.floor(p / 384)} maquete ${[a[i], a[i + 1], a[i + 2]]} lonas ${[comp[i], comp[i + 1], comp[i + 2]]} baixo ${[...L.baixo.subarray(i, i + 4)]} luz ${[...L.luz.subarray(i, i + 4)]} cima ${[...L.cima.subarray(i, i + 4)]} foto ${[...fundo.subarray(i, i + 3)]}`);
      pior = Math.max(pior, d);
      if (L.solida[p] && d) sol = false;
    }
    piorDif = Math.max(piorDif, pior);
    if (pior <= 2) lonasOk++;
    if (sol) solidosOk++;
    if (iguais(L.mascara, Q.mascara)) mascOk++;
  });
  ok(iguaisMd5 === momentos.length, `o quadro do porte = o da maquete (md5) em ${iguaisMd5}/${momentos.length} instantes`);
  ok(solidosOk === momentos.length, `as lonas: os pixels sólidos idênticos em ${solidosOk}/${momentos.length}`);
  ok(lonasOk === momentos.length, `as lonas compostas sobre a foto: diferença ≤ 2 em ${lonasOk}/${momentos.length} (pior ${piorDif})`);
  ok(mascOk === momentos.length, `a máscara do acerto igual nos dois alvos em ${mascOk}/${momentos.length}`);
}

// ── Task 8 · the life rules (the whole fight is proven by `_enguia-porte.mjs` against the mock's md5 list)
if (roda('vida')) {
  const { VidaEnguia } = await P('vida.ts');
  const fora = { podeMorrer: false, imune: false }, rombo = { podeMorrer: true, imune: false };
  const v = new VidaEnguia(120);
  const r1 = v.fere(120 * 0.79, fora);
  ok(r1.mordidas.join() === '22' && !r1.morreu, `22 % uma vez (${r1.mordidas})`);
  ok(v.fere(1, fora).mordidas.length === 0, 'não repete');
  const r2 = v.fere(120 * 0.2, fora);
  ok(r2.mordidas.join() === '13,5' && v.retaFinal, `um golpe que cruza dois limiares dá as duas (${r2.mordidas})`);
  v.fere(500, fora);
  ok(v.hp === 1, `fora da pausa do Eco da reta final, o piso é 1 (${v.hp})`);
  ok(v.fere(5, { podeMorrer: true, imune: true }).morreu === false && v.hp === 1, 'imune não leva dano');
  const r3 = v.fere(5, rombo);
  ok(r3.morreu && v.hp === 0, 'na pausa do Eco final, chega a 0 e morre');
  const b = new VidaEnguia(120, 0.1);
  ok(b.fere(1, fora).mordidas.join() === '22,13', 'começando baixa (o atalho vida=): os limiares acima mordem no primeiro golpe');
}

// ── Task 10 · the engine the worker runs: the mock's script, and a fight decided by the life
if (roda('motor')) {
  const { MotorEnguia } = await P('motor.ts'), { VidaEnguia } = await P('vida.ts'), { ARQUIVOS_ENGUIA } = await P('arquivos.ts');
  const ler = await leitorNode();
  const imgs = Object.fromEntries(Object.keys(ARQUIVOS_ENGUIA).map((k) => [k, ler(k)]));
  const labio = await lerRaw('public/sprites/serpente-rombo-labio.png');
  {
    const m = new MotorEnguia({ imgs, labio, maquete: true });
    let k = 0, r;
    for (; k < 30 * 130; k++) { r = m.passo({ t: k / 30, dt: 1 / 30, nave: { x: 70, y: 100 }, eventos: [] }); if (r.estado.acabou) break; }
    ok(r.estado.acabou && Math.abs(k / 30 - 110.03) < 0.1, `o roteiro da maquete: ela morre e acaba em ${(k / 30).toFixed(2)} s`);
  }
  // the life decides: 1 point per step while she is on screen and hittable (≈ a player who keeps shooting her)
  for (const [nome, dano] of [['dano contínuo', 0.12], ['dano forte', 0.5]]) {
    const m = new MotorEnguia({ imgs, labio, maquete: false });
    const v = new VidaEnguia(120);
    const caps = [], mordidas = [];
    let eventos = [], k = 0, r, morreuEm = null;
    for (; k < 30 * 400; k++) {
      r = m.passo({ t: k / 30, dt: 1 / 30, nave: { x: 70, y: 100 + 50 * Math.sin(k / 40) }, eventos });
      eventos = [];
      const e = r.estado, vis = e.cabeca.x > 0 && e.cabeca.x < 384 && e.cabeca.y > 0 && e.cabeca.y < 216;
      if (caps.at(-1) !== e.trecho) caps.push(e.trecho);
      if (vis) {
        const res = v.fere(dano, { podeMorrer: e.podeMorrer, imune: e.imune });
        for (const p of res.mordidas) { eventos.push({ tipo: 'mordida', pct: p }); mordidas.push(`${p}@${e.t.toFixed(1)}(${e.trecho})`); }
        if (res.morreu) { eventos.push({ tipo: 'mata' }); morreuEm = `${e.t.toFixed(1)} (${e.trecho})`; }
      }
      if (e.acabou) break;
    }
    console.log(`  ${nome}: mordidas ${mordidas.join(', ')} · morreu ${morreuEm} · acabou ${r.estado.acabou} em ${(k / 30).toFixed(1)} s · anéis ${m.luta.nAneis}`);
    console.log(`    trechos: ${caps.join(' → ').slice(0, 900)}`);
    ok(r.estado.acabou && mordidas.length === 3 && m.luta.nAneis === 14, `${nome}: as três mordidas, a cauda 2× mais curta, a morte no rombo e o fim`);
  }
}

console.log(falhas ? `${falhas} FALHA(S)` : 'tudo ok');
process.exit(falhas ? 1 : 0);
