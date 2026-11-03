// The serpent's skills, the pure part (`src/entities/serpente/`): the numbers, the clock sums, the dice, the shots'
// geometry, the missiles' slots. Later tasks append their own sections (the pixel layer, the beam's geometry, the
// thermometer, and the ORACLES: the port of the beam and the gas against the approved mock's own logs).
//   node scripts/test-serpente-hab.mjs
import { HAB, cruza, porQuadro, chance, gerador, rodizio, alvosDoCerco, angulosDoLeque, vagasDosCasulos, inicioDoVao } from '../src/entities/serpente/numerosHab.ts';

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

// the clock: the mock's 1.3 s lands exactly on a frame of the 0.6 + k/30 grid — it must fire once, not zero or twice
{
  let n = 0;
  for (let k = 0; k < 60; k++) { const t = k / 30 - 0.6; if (cruza(t - 1 / 30, t, 1.3 - 0.6)) n++; }
  ok(n === 1, `cruza: 0,7 s na grade da maquete dispara uma vez (${n})`);
  let m = 0;
  for (let t = 0; t < 2; t += 1 / 60) if (cruza(t - 1 / 60, t, 1.0)) m++;
  ok(m === 1, `cruza: a 60 quadros/s também uma vez (${m})`);
  // the mock's own rule fires on the first frame whose t ≥ tx: the port's (t − dt, t] window is the same frame
  let kMaquete = -1, kPorte = -1;
  for (let k = 0; k < 60; k++) {
    const t = k / 30 - 0.6, tx = 0.45;
    if (kMaquete < 0 && t >= tx - 1e-9 && t - 1 / 30 < tx - 1e-9) kMaquete = k;
    if (kPorte < 0 && cruza(t - 1 / 30, t, tx)) kPorte = k;
  }
  ok(kMaquete === kPorte, `cruza dispara no mesmo quadro que a maquete (${kPorte} = ${kMaquete})`);
}
// per-frame quantities: at dt = 1/30 they are the mock's; two 1/60 steps make one 1/30 step
ok(porQuadro(1 / 30) === 1 && chance(0.6, 1 / 30) === 0.6, 'a 30 quadros/s, o porte é a maquete');
{
  const f = 0.35, um = chance(f, 1 / 30), meio = chance(f, 1 / 60);
  ok(Math.abs(1 - (1 - meio) * (1 - meio) - um) < 1e-12, 'duas frações de 1/60 = uma de 1/30');
}
// the dice are the mock's LCG
{
  const g = gerador(7);
  let s = 7;
  const mock = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  let iguais = true;
  for (let i = 0; i < 100; i++) if (g() !== mock()) iguais = false;
  ok(iguais, 'o gerador é o LCG da maquete');
}
// the cycle: A rain → beam → gas; B rain → gas; C and the fusion keep today's patterns
ok(HAB.ciclo.A.join() === 'chuva,raio,gas' && HAB.ciclo.B.join() === 'chuva,gas' && HAB.ciclo.C.length === 0, 'o ciclo de cada forma');
ok(rodizio(['a', 'b', 'c'], 4) === 'b', 'o rodízio');
// the encirclement: two shots, 22 px above and below the ship — the middle is the safe place
{
  const [cima, baixo] = alvosDoCerco({ x: 80, y: 100 });
  ok(cima.y === 78 && baixo.y === 122 && cima.x === 80, 'o cerco mira 22 px acima e abaixo da nave');
  const meiaCaixa = HAB.tiros.caixa.h / 2, meiaNave = 4.5;
  ok(22 - meiaCaixa - meiaNave > 8, `o cerco erra quem fica no meio (folga ${(22 - meiaCaixa - meiaNave).toFixed(1)} px)`);
}
// the venom fan: 3 shots over 30°, the middle one on the aim
{
  const a = angulosDoLeque(1.0, 3, 30);
  ok(a.length === 3 && Math.abs(a[1] - 1.0) < 1e-12 && Math.abs(a[2] - a[0] - Math.PI / 6) < 1e-12, 'o leque: 3 gotas em 30°, a do meio na mira');
}
// the rain: 10 slots of 22 px in front of her, a gap of 3 that walks one slot per wave, always inside
{
  const xs = vagasDosCasulos(3);
  ok(xs.length === 7 && xs.every((x) => x <= 212) && !xs.includes(14 + 3 * 22) && !xs.includes(14 + 5 * 22), 'uma onda: 7 casulos, o vão de 3 vagas');
  let dentro = true;
  for (let s = 1; s < 500; s++) {
    const g = gerador(s), { inicio, passo } = inicioDoVao(g, 3);
    for (let j = 0; j < 3; j++) { const v = inicio + passo * j; if (v < 1 || v + 3 > 9) dentro = false; }
  }
  ok(dentro, 'o vão sorteado anda uma vaga por onda e nunca sai das vagas de dentro');
}

// ─── the pixel layer: "over" onto a transparent layer, composited onto the scene, is the mock's blend onto the scene ───
{
  const { sobre, Lona, W } = await import('../src/entities/serpente/pixels.ts');
  const g = gerador(3);
  let pior = 0;
  for (let n = 0; n < 2000; n++) {
    const fundo = [g() * 255, g() * 255, g() * 255].map(Math.round);
    const mock = [...fundo], camada = new Uint8ClampedArray(4);
    for (let k = 0; k < 4; k++) {
      const c = [g() * 255, g() * 255, g() * 255].map(Math.round), a = g() < 0.3 ? 1 : g();
      for (let q = 0; q < 3; q++) mock[q] = Math.round(a >= 1 ? c[q] : mock[q] + (c[q] - mock[q]) * a);
      sobre(camada, 0, c, a);
    }
    const la = camada[3] / 255;
    for (let q = 0; q < 3; q++) pior = Math.max(pior, Math.abs(camada[q] * la + fundo[q] * (1 - la) - mock[q]));
  }
  ok(pior <= 2, `a camada composta = a mistura da maquete (pior diferença ${pior.toFixed(2)} níveis)`);
  const l = new Lona();
  l.corpo[10 * W + 20] = 1;
  l.put(20, 10, [255, 0, 0]); l.put(21, 10, [0, 255, 0], 0.5);
  ok(l.cima[(10 * W + 20) * 4] === 255 && l.baixo[(10 * W + 20) * 4 + 3] === 0 && l.baixo[(10 * W + 21) * 4 + 1] === 255 && l.baixo[(10 * W + 21) * 4 + 3] === 128,
    'sobre o corpo dela vai para a lona de cima; fora, para a de baixo');
  l.put(-1, 5, [1, 1, 1]); l.put(384, 5, [1, 1, 1]); l.put(5.4, 2.6, [9, 9, 9]);
  ok(l.baixo[(3 * W + 5) * 4] === 9, 'arredonda x e y como a maquete, e ignora fora da tela');
}

// ─── 03/11: where a player shot lands on her (the whole body takes damage; the breach lip covers her coils) ───
{
  const { acertoNoCorpo } = await import('../src/entities/serpente/pixels.ts');
  // her: a 10×10 frame at scale 2 from (100, 50): only the frame's column 4 is opaque (screen x 108–109, y 50–69)
  const a = new Uint8Array(100);
  for (let y = 0; y < 10; y++) a[y * 10 + 4] = 1;
  const ela = { a, w: 10, h: 10, x0: 100, y0: 50, sx: 2, sy: 2 };
  // the lip: opaque over screen y 60–69 (a 20×10 frame at scale 1 from (100, 60))
  const labio = { a: new Uint8Array(200).fill(1), w: 20, h: 10, x0: 100, y0: 60, sx: 1, sy: 1 };
  ok(acertoNoCorpo(ela, labio, 107, 52, 112, 55) === 'corpo', 'o tiro no desenho dela, acima do lábio, fere');
  ok(acertoNoCorpo(ela, labio, 107, 62, 112, 65) === 'casco', 'onde o lábio do rombo cobre as roscas, o casco absorve');
  ok(acertoNoCorpo(ela, labio, 101, 52, 106, 55) === null, 'na caixa dela mas fora do desenho, o tiro passa');
  ok(acertoNoCorpo(ela, null, 107, 62, 112, 65) === 'corpo', 'sem o lábio, o mesmo tiro fere');
  ok(acertoNoCorpo(ela, labio, 109.6, 52, 110.4, 53) === 'corpo', 'caixa menor que um pixel ainda toca o pixel em que está');
  // the head about to fall: the drawn pixels inside it (the capsule skull → mouth: the snout sticks out of the skull's
  // circle) are the head, worth more; a box touching head and body counts as head
  const { naCabeca } = await import('../src/entities/serpente/pixels.ts');
  const cabeca = (X, Y) => naCabeca(X + 0.5, Y + 0.5, { x: 109, y: 50 }, { x: 109, y: 54 }, 2);
  ok(acertoNoCorpo(ela, labio, 107, 51, 112, 52, cabeca) === 'cabeca', 'o desenho dentro da cabeça (até a boca) é a cabeça');
  ok(acertoNoCorpo(ela, labio, 107, 58, 112, 59, cabeca) === 'corpo', 'abaixo dela, o pescoço é corpo');
  ok(acertoNoCorpo(ela, labio, 107, 54, 112, 59, cabeca) === 'cabeca', 'a caixa que toca cabeça e pescoço conta como cabeça');
  // the head: from the skull (a round back) to a bit past the mouth (a straight cut — a round end there spilled onto
  // the dead cyan's neck next to the green's mouth, in the B)
  const A = { x: 0, y: 0 }, B = { x: 10, y: 0 };
  ok(naCabeca(5, 5, A, B, 5) && !naCabeca(5, 5.1, A, B, 5), 'ao longo dela: o raio');
  ok(naCabeca(-3, 0, A, B, 5) && naCabeca(-3, 3.9, A, B, 5) && !naCabeca(-4, 4, A, B, 5), 'atrás do crânio: a ponta redonda');
  ok(naCabeca(12, 4, A, B, 5) && !naCabeca(12.1, 0, A, B, 5) && !naCabeca(13, 1, A, B, 5), 'passando da boca: corta reto a 20% do comprimento');
}

// ─── the shots' sprites drawn as the game turns them (`projetil.ts`, the mock's `sprite`) ───
{
  const { desenharSprite, caudaDe } = await import('../src/entities/serpente/projetil.ts');
  const { TIROS, CASULOS } = await import('../src/entities/serpente/projeteisHab.ts');
  const s = TIROS.verde.quadros[0], pts = new Map();
  desenharSprite((x, y, c) => pts.set(`${x},${y}`, c), s, 100, 50, 1, 0);
  let opacos = 0;
  for (let i = 0; i < s.w * s.h; i++) if (s.px[i * 4 + 3] > 8) opacos++;
  ok(pts.size === opacos, `apontando para a direita, o sprite sai inteiro (${pts.size} de ${opacos} px)`);
  const giro = new Map();
  desenharSprite((x, y, c) => giro.set(`${x},${y}`, c), s, 100, 50, 0, 1);
  ok(Math.abs(giro.size - opacos) <= 2, `de nariz para baixo, o mesmo tamanho (${giro.size})`);
  // the cocoon nose-down: the flame's root is the pixel right above its drawn tail, on its middle column
  const m = CASULOS.verde.quadros[0], desenho = new Set();
  desenharSprite((x, y) => desenho.add(`${x},${y}`), m, 50, 60, 0, 1);
  const c = caudaDe(m, 50, 60);
  ok(!desenho.has(`${c.x},${c.y}`) && desenho.has(`${c.x},${c.y + 1}`), `a cauda do casulo de nariz para baixo: a chama nasce colada (${c.x},${c.y})`);
}

// ─── the dev shortcut ───
{
  const { lerAtalho } = await import('../src/entities/serpente/atalho.ts');
  const a = lerAtalho(new URLSearchParams('?serpente=B&hab=gas'));
  ok(a?.forma === 'B' && a.hab === 'gas' && lerAtalho(new URLSearchParams('?serpente=Z')) === null && lerAtalho(new URLSearchParams('?serpente=A'))?.hab === null,
    'o atalho lê a forma e a habilidade, e ignora o resto');
}

// ─── the installed sets (`gestosHab.ts`, generated by `_hab-instalar.mjs`) ───
{
  const { CONJUNTOS, IDLE_HAB } = await import('../src/entities/serpente/gestosHab.ts');
  const fs = await import('node:fs');
  const { default: sharp } = await import('sharp');
  for (const [k, c] of Object.entries(CONJUNTOS)) {
    const n = c.quadros;
    const tamOk = Object.values(c.bocas).every((l) => l.length === n) && c.cranio.length === n && (!c.olho || c.olho.length === n);
    const arq = `public/sprites/serpente-hab/${k}.png`;
    const meta = fs.existsSync(arq) ? await sharp(arq).metadata() : null;
    const folhaOk = meta && meta.width === 8 * 256 && meta.height === Math.ceil(n / 8) * 256;
    const c0 = c.cranio[0];
    const perto = c.cranio.every((p) => Math.hypot(p.x - c0.x, p.y - c0.y) < 70);
    const extras = [`${k}-veias`, `${k}-sombra`, ...c.luzes.map((cor) => `${k}-luz-${cor}`)].every((f) => fs.existsSync(`public/sprites/serpente-hab/${f}.png`));
    ok(n > 0 && tamOk && folhaOk && perto && extras, `${k}: ${n} quadros, as medidas por quadro, a folha ${meta?.width}×${meta?.height}, veias/sombra/luzes, o crânio perto do quadro 0`);
    if (c.acao != null) ok(Object.values(c.bocas).some((l) => l[c.acao]), `${k}: há boca no quadro de ação ${c.acao}`);
  }
  ok(IDLE_HAB.A.desvio.ciano?.length === 9 && IDLE_HAB.B.desvio.verde?.length === 9, 'o idle: o desvio das bocas por quadro (9) na A e na B');
  const { TIROS, CASULOS } = await import('../src/entities/serpente/projeteisHab.ts');
  ok(TIROS.verde.quadros.length === 4 && TIROS.verde.rastro === 'pinga' && TIROS.laranja.rastro === 'fumaca' && CASULOS.ciano.quadros[0].w === 11,
    'os projéteis: a gota de veneno pinga, a brasa solta fumaça, o casulo tem 11 px');
}

// ─── the beam's geometry (`geometriaRaio.ts`, the mock 1436–1453, 1473–1495, 1519–1530) ───
{
  const G = await import('../src/entities/serpente/geometriaRaio.ts');
  const fx = G.feixe({ x: 240, y: 100 }, Math.PI); // straight left
  ok(Math.abs(fx.x1) < 1e-9 && Math.abs(fx.y1 - 100) < 1e-9 && !fx.bate, 'o feixe vai da boca à borda esquerda');
  const desce = G.feixe({ x: 240, y: 100 }, Math.PI - 0.6);
  ok(desce.bate && Math.abs(desce.y1 - 150) < 1e-9, 'o feixe que desce para no casco (y 150) e marca que bateu');
  ok(G.feixeNaCaixa(fx, 6, 50, 71, 104, 113) && !G.feixeNaCaixa(fx, 6, 50, 71, 107, 116), 'a faixa do feixe fere a caixa que ela toca, e só ela');
  const faixa = { cima: 0, meio: 12, baixo: 18 };
  ok(G.poseDe(faixa, 75) === 12 && G.poseDe(faixa, -10) === 0 && G.poseDe(faixa, 150) === 18, 'a pose: a borda em 75 é o meio, −10 é a cabeça erguida, 150 a baixada');
  ok(G.quadroDe(19, -3) === 0 && G.quadroDe(19, 7.6) === 8 && G.quadroDe(19, 40) === 18, 'o quadro: arredondado e preso ao conjunto');
  // the beam's band at the ship's column, solved with the mouth moving with the head (here, a mouth that slides with yL)
  const boca = (yL) => ({ x: 230, y: 80 + yL * 0.1 });
  const yL = G.yLPara(85, 60, boca), b = boca(yL);
  ok(Math.abs(b.y + ((yL - b.y) * (b.x - 85)) / b.x - 60) < 1e-6, `yLPara: o feixe que termina em ${yL.toFixed(2)} passa por (85, 60)`);
  // the salvo's rule: every slice covers the ship (it must move) and leaves a way out ≤ 25 px, on screen
  let ruins = 0;
  for (let semente = 1; semente <= 200; semente++) {
    const sorte = gerador(semente);
    let P = 50;
    for (let i = 0; i < 6; i++) {
      const s = G.sorteiaFatia(P, 83.5, sorte, boca);
      if (!(s.lo <= P && P <= s.hi) || Math.abs(s.para - P) > 25 || s.para < 30 || s.para > 143) ruins++;
      P = s.para;
    }
  }
  ok(ruins === 0, `a salva: em 200 sorteios × 6 fatias, cada fatia cobre a nave e deixa saída ≤ 25 px na tela (${ruins} ruins)`);
  const u = G.caminho({ de: 60, ate: 90 }, boca, 6);
  // (the far end sweeps 60 → 90 at the left edge: at x 10 the band runs about there)
  ok(u.length === 384 * 216 && u[75 * 384 + 10] < Infinity && u[20 * 384 + 10] === Infinity && u[120 * 384 + 10] === Infinity, 'o caminho avisado: cobre por onde o feixe passa, e só ali');
}

// ─── the ORACLE of the beam: the port, run with the mock's clock, dice and points, against the approved mock's own log ───
{
  const { rodarOraculo } = await import('./_serpente/_oraculo.mjs');
  const r = await rodarOraculo({
    hab: 'raio',
    log: 'docs/superpowers/folhas/2026-11-02/serpente-instalacao/oraculo/raio.json',
    pontos: 'docs/superpowers/folhas/2026-10-31/serpente-habilidades/cru3/cabeca-raio/pontos.json',
    semente: 11,
  });
  ok(r.quadros > 300 && r.piorPosicao < 1e-6 && r.raioFora === 0 && r.cabFora === 0,
    `o raio portado = a maquete aprovada, quadro a quadro (${r.quadros} quadros; pior ${r.piorPosicao.toExponential(1)} px; ${r.raioFora} de raio e ${r.cabFora} de cabeça fora${r.primeiro ? '; o 1º: ' + r.primeiro : ''})`);
}

// ─── the thermometer (`termometro.ts`, the mock 912–1006) ───
{
  const { Termometro } = await import('../src/entities/serpente/termometro.ts');
  const T = new Termometro(gerador(7));
  let cheio = -1;
  for (let i = 1; i <= 14 && cheio < 0; i++) if (T.esquenta(i * 0.12, 1 / 12)) cheio = i;
  ok(cheio === 12, `12 tiros de gás cheio enchem o termômetro (${cheio})`);
  const U = new Termometro(gerador(7));
  U.esquenta(0, 0.5);
  for (let t = 0; t < 5; t += 1 / 60) U.passo(t, 1 / 60, true, []);
  ok(Math.abs(U.v - 0.3) < 0.01, `esfria 0,04 por segundo (${U.v.toFixed(3)})`);
  U.zera(5);
  ok(U.v === 0 && U.estado === 'zera', 'a faísca zera');
  const C = new Termometro(gerador(7)), est = [];
  C.acender(0);
  for (let t = 0; t < 0.5; t += 1 / 60) C.passo(t, 1 / 60, true, est);
  ok(C.estado === 'estourado' && est.length === 1 && C.cacos.length === 14, 'a carta: ele pega fogo e estoura em cacos');
}

// ─── the ORACLES of the gas: the port against the approved mock's three logs (round 13: the dodges, the counter, the card) ───
for (const modo of ['padroes', 'contra', 'carta']) {
  const { rodarOraculo } = await import('./_serpente/_oraculo.mjs');
  const r = await rodarOraculo({
    hab: 'gas', modo,
    log: `docs/superpowers/folhas/2026-11-02/serpente-instalacao/oraculo/gas-${modo}.json`,
    pontos: 'docs/superpowers/folhas/2026-10-31/serpente-habilidades/cru3/cabeca-gas/pontos.json',
  });
  ok(r.quadros > 150 && r.gelFora === 0 && r.termoFora === 0 && r.cabFora === 0 && (modo === 'padroes' ? r.contras === 0 : modo === 'contra' ? r.contras === 1 : true),
    `o gás portado (${modo}) = a maquete aprovada, quadro a quadro (${r.quadros} quadros; fora: geleia ${r.gelFora}, termômetro ${r.termoFora}, cabeça ${r.cabFora}; contras ${r.contras}${r.primeiro ? '; o 1º: ' + r.primeiro : ''})`);
}

if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
console.log('\ntudo certo');
