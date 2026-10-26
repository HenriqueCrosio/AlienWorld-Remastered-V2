// 26/10 — the pure part of the ship's death (`src/systems/morte/pedacos.ts`), in Node, on the REAL sprites of the five
// ships: every hull pixel lands in exactly one piece, the flame is found only behind the nozzle, the break-up gives a
// handful of big pieces, the burning front reaches the whole hull, the ramps step from dark to white; and the hull loss
// of a lost life (`lasca`) bites the same number of pixels off the edge on every hit.
//   node scripts/test-morte.mjs
import sharp from 'sharp';
import {
  sorte, ruido, ehChama, sementesEspalhadas, sementesNoEixo, partir, temposDeQueima, RAMPA_FOGO, RAMPA_BIO, corDaRampa, canais,
  lasca, soltarLasca,
} from '../src/systems/morte/pedacos.ts';
import { MORTE } from '../src/systems/morte/numerosMorte.ts';
const G = MORTE.golpe;

let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

async function bitmap(arq) {
  const { data, info } = await sharp(arq).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { w: info.width, h: info.height, cor: new Uint32Array(data.buffer, data.byteOffset, info.width * info.height).slice() };
}

const NAVES = {
  'a laranja': 'public/sprites/naves/humana-anim-3.png',
  'a preta': 'public/sprites/naves/humana-preta-anim-3.png',
  'a azul': 'public/sprites/naves/humana-azul-anim-3.png',
  'jato': 'public/sprites/ship-jato-anim-3.png',
  'jato osso': 'public/sprites/naves/jato-osso-anim-3.png',
  'manta': 'public/sprites/naves/alien-t2-anim-3.png',
};

for (const [nome, arq] of Object.entries(NAVES)) {
  const img = await bitmap(arq);
  const casco = { ...img, cor: img.cor.map((c, i) => (ehChama(c, i % img.w) ? 0 : c)) };
  const chama = img.cor.filter((c, i) => ehChama(c, i % img.w)).length;
  const cheios = casco.cor.filter((c) => c >>> 24 >= 128).length;
  const manta = nome === 'manta';
  ok(manta ? chama === 0 : chama >= 8 && chama <= 20, `${nome}: a chama tem ${chama} px (só atrás do bocal)`);
  // ...and after it is gone, nothing warm and bright is left behind the nozzle (only the hull's own lights, further up)
  const sobra = casco.cor.filter((c, i) => i % img.w <= 9 && c >>> 24 >= 128 && ['fe0101', 'ffac0c', 'f9ab03', 'ea4a1f', '0378fa', '041ef7']
    .some((h) => (c & 0xffffff) === (parseInt(h.slice(4, 6) + h.slice(2, 4) + h.slice(0, 2), 16)))).length;
  ok(sobra === 0, `${nome}: nada da chama sobra no casco`);

  const rnd = sorte(7);
  const torto = ruido(img.w, img.h, 4, rnd);
  for (const [modo, sementes, amp] of [
    ['estilhaços', sementesEspalhadas(casco, 11, 6, rnd), 2.5],
    ['ruptura', sementesNoEixo(casco, rnd), 3.5],
  ]) {
    const pedacos = partir(casco, sementes, torto, amp);
    const soma = pedacos.reduce((s, p) => s + p.n, 0);
    const grandes = pedacos.filter((p) => p.n >= 12).length;
    ok(soma === cheios, `${nome} / ${modo}: os ${cheios} px do casco caem em ${pedacos.length} pedaços, cada um uma vez`);
    if (modo === 'estilhaços') ok(grandes >= 7 && grandes <= 14, `${nome} / estilhaços: ${grandes} pedaços de 12 px ou mais`);
    else ok(sementes.length >= 3 && grandes >= 3 && grandes <= 6, `${nome} / ruptura: ${grandes} pedaços grandes (${sementes.length} sementes)`);
    const comCorte = pedacos.filter((p) => p.corte.some((c) => c === 2)).length;
    ok(comCorte >= pedacos.filter((p) => p.n >= 12).length, `${nome} / ${modo}: todo pedaço grande tem a borda do corte`);
  }
  const t = temposDeQueima(casco, { x: 10, y: 13 }, 0.9, torto, 3);
  const fin = [...t].filter(Number.isFinite);
  ok(fin.length === cheios && Math.max(...fin) <= 0.9 + 1e-6 && Math.min(...fin) >= 0, `${nome}: a frente de queima chega a todo o casco em 0,9 s`);

  // THE HULL LOSS (`lasca`, with the numbers of `MORTE.golpe`): 40 hits, each one bite of the same size off the edge, never
  // the flame, never the nose tip, always with a rim and pieces that keep every pixel of the bite.
  let xs = [];
  casco.cor.forEach((c, i) => c >>> 24 >= 128 && xs.push(i % img.w));
  const x0 = Math.min(...xs), x1 = Math.max(...xs);
  const tamanhos = [];
  let foraDaFaixa = 0, semBorda = 0, semAro = 0, somaErrada = 0, semCorte = 0, nulas = 0;
  for (let s = 1; s <= 40; s++) {
    const r = sorte(s);
    const tt = ruido(img.w, img.h, 3, r);
    const l = lasca(casco, G.faixa, G.pixels, tt, G.torto, r);
    if (!l) { nulas++; continue; }
    tamanhos.push(l.n);
    const cx = Math.floor(l.centro.x), cy = Math.floor(l.centro.y);
    if (cx < x0 + (x1 - x0) * G.faixa[0] - 1 || cx > x0 + (x1 - x0) * G.faixa[1] + 1) foraDaFaixa++;
    const vazio = (x, y) => x < 0 || y < 0 || x >= img.w || y >= img.h || casco.cor[y * img.w + x] >>> 24 < 128;
    if (![[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => vazio(cx + dx, cy + dy))) semBorda++;
    if (!l.mascara.some((m) => m === 1)) semAro++;
    const partes = soltarLasca(casco, l.mascara, sementesEspalhadas({ ...casco, cor: casco.cor.map((c, i) => (l.mascara[i] === 2 ? c : 0)) }, 3, 2, r), tt, 1.5);
    if (partes.reduce((a, p) => a + p.n, 0) !== l.n) somaErrada++;
    if (!partes.every((p) => p.corte.some((c) => c === 2))) semCorte++;
  }
  const min = Math.min(...tamanhos), max = Math.max(...tamanhos);
  ok(nulas === 0, `${nome} / lasca: os 40 golpes acham borda na faixa`);
  ok(min === G.pixels && max === G.pixels, `${nome} / lasca: toda mordida tem ${min === max ? min : `${min}–${max}`} px (a mesma medida em todo golpe)`);
  ok(foraDaFaixa === 0 && semBorda === 0, `${nome} / lasca: o centro está na borda do casco, entre 22% e 72% do comprimento`);
  ok(semAro === 0, `${nome} / lasca: toda mordida tem o aro queimado em volta`);
  ok(somaErrada === 0 && semCorte === 0, `${nome} / lasca: as partes somam a mordida e todas têm a borda rasgada`);
}

const lum = (c) => { const [r, g, b] = canais(c); return 0.3 * r + 0.59 * g + 0.11 * b; };
for (const [nome, r] of [['fogo', RAMPA_FOGO], ['bio', RAMPA_BIO]]) {
  // (the fire's coldest stop is the ASH, a grey-brown a little lighter than the dark red before it: the climb starts at 1)
  ok(r.every((c, i) => i <= 1 || lum(c) >= lum(r[i - 1])), `a rampa ${nome} sobe do escuro ao branco`);
  ok(corDaRampa(r, 1) === r[r.length - 1] && corDaRampa(r, 0) === r[0], `a rampa ${nome}: 1 = o branco, 0 = a brasa apagada`);
}

console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
