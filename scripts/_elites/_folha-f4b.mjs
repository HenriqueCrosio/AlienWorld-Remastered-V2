// 14/10 — THE PUPA AND SPORE SHEETS: hand-drawn (`_mao-f4b.mjs`) and generated (`_gerar-f4.mjs`, reduced to the
// in-game size) candidates IN SCENE, at real scale next to the ship, the Larva and the Tube, magnified without
// smoothing. The backdrops are the F4 photos of 13/10 (`folhas/2026-10-13/elites/f4/ref`).
//   node scripts/_elites/_folha-f4b.mjs   → folhas/2026-10-14/f4/
import fs from 'node:fs';
import sharp from 'sharp';
import { CORES_ESPORO, ESPOROS, PUPAS, reduzir as reduzirBuf } from './_mao-f4b.mjs';

const REF = 'docs/superpowers/folhas/2026-10-13/elites/f4/ref';
const D = 'docs/superpowers/folhas/2026-10-14/f4';
const Z = 4;
const NAVE = 'public/sprites/ship-jato.png';
const LARVA = 'public/sprites/elite-larva-a-poe-0.png';
const TUBO = 'public/sprites/elite-tubo-c-pulso-0.png';
const PUPA_ATUAL = ['public/sprites/elite-pupa-0.png', 'public/sprites/elite-pupa-1.png'];
// The old ring shot left the game on 14/10 (the spores replaced it); it is redrawn from its hand-drawn source.
const { tiroAnel } = await import('./_mao-f4.mjs');

/** The generated finalists (triaged by hand): [label, file in cand/, target height in px]. */
const GERADAS_PUPA = JSON.parse(fs.readFileSync(`${D}/geradas.json`, 'utf8')).pupa;
const GERADAS_ESPORO = JSON.parse(fs.readFileSync(`${D}/geradas.json`, 'utf8')).esporo;

const img = async (buf) => {
  const m = await sharp(buf).metadata();
  return { buf: await sharp(buf).png().toBuffer(), w: m.width, h: m.height };
};
/** A generated piece brought down to `alto` px (`_mao-f4b.mjs`), as an `img`. */
const reduzir = async (arq, alto) => img(await reduzirBuf(arq, alto));
const curto = (nome) => nome.replace(/ \(reduzida.*/, '');
const rotulo = (txt, w, cor = '#ffb040') =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="${cor}">${txt}</text></svg>`))
    .png()
    .toBuffer();

async function painel(fundo, J, pecas, titulo, cor) {
  const comp = pecas.map((p) => ({ input: p.buf, left: Math.round(p.x - J.x), top: Math.round(p.y - J.y) }));
  const cena = await sharp(fundo).extract({ left: J.x, top: J.y, width: J.w, height: J.h }).composite(comp).png().toBuffer();
  return { rot: await rotulo(titulo, J.w * Z, cor), img: await sharp(cena).resize(J.w * Z, J.h * Z, { kernel: 'nearest' }).png().toBuffer(), w: J.w * Z, h: J.h * Z };
}
async function folha(paineis, cols, arq) {
  const PW = paineis[0].w, PH = paineis[0].h + 24, comp = [];
  paineis.forEach((p, k) => {
    const left = (k % cols) * (PW + 6), top = Math.floor(k / cols) * (PH + 8);
    comp.push({ input: p.rot, left, top }, { input: p.img, left, top: top + 24 });
  });
  await sharp({ create: { width: cols * (PW + 6), height: Math.ceil(paineis.length / cols) * (PH + 8), channels: 4, background: '#0b0d14' } })
    .composite(comp).png().toFile(arq);
  console.log(arq);
}

fs.mkdirSync(D, { recursive: true });
const cena = (nome) => ({ png: `${REF}/${nome}.png`, ...JSON.parse(fs.readFileSync(`${REF}/${nome}.json`, 'utf8')) });
const A = cena('fundo-camara-a'), B = cena('fundo-camara-b'), DUTO = cena('fundo-duto');
const nave = await img(fs.readFileSync(NAVE));
const larva = await img(fs.readFileSync(LARVA));
const tubo = await img(fs.readFileSync(TUBO));

// ── THE PUPAS: the Larva at the right laying them; the pupas in front of her, dark and lit, toward the ship ──
{
  const meio = (c, x) => Math.round((c.teto[x] + c.chao[x]) / 2);
  const cands = [['ATUAL (13/10) — a bolha', await Promise.all(PUPA_ATUAL.map((f) => img(fs.readFileSync(f))))]];
  for (const [nome, f] of Object.entries(PUPAS)) cands.push([`À MÃO ${nome}`, await Promise.all((await f()).map(img))]);
  for (const [nome, arq, alto] of GERADAS_PUPA) {
    const r = await reduzir(`${D}/cand/${arq}.png`, alto);
    cands.push([`GERADA ${nome} (reduzida · e a original do PixelLab)`, [r, r, await img(await sharp(`${D}/cand/${arq}.png`).trim().png().toBuffer())]]);
  }
  const paineis = [];
  for (const [nome, quadros] of cands) {
    for (const [c, lugar] of [[A, 'câmara A'], [DUTO, 'duto']]) {
      const J = { x: 170, y: meio(c, 300) - 38, w: 150, h: 76 };
      const lx = J.x + J.w - larva.w - 6, ly = J.y + J.h / 2 - larva.h / 2;
      const [q0, q1] = quadros;
      paineis.push(await painel(c.png, J, [
        { ...nave, x: J.x + 8, y: J.y + J.h / 2 - nave.h / 2 },
        { ...larva, x: lx, y: ly },
        { ...q0, x: lx - 22, y: ly - 4 },
        { ...q1, x: lx - 26, y: ly + 30 },
        { ...q1, x: lx - 50, y: ly + 12 },
      ], `${curto(nome)} · ${lugar} (${q0.w}×${q0.h})`, nome.startsWith('ATUAL') ? '#8a8f9c' : '#ffb040'));
    }
  }
  await folha(paineis, 2, `${D}/folha-pupas.png`);
  await detalhe(cands, `${D}/detalhe-pupas.png`);
}

/** The DRAWING itself: each candidate's frames (dark, lit) magnified ×10 on the F4 dark, one row each. */
async function detalhe(cands, arq) {
  const ZD = 10, W = 760, comp = [];
  let y = 0;
  for (const [nome, quadros] of cands) {
    comp.push({ input: await rotulo(nome, W), left: 0, top: y });
    y += 24;
    let x = 8, alto = 0;
    for (const q of quadros) {
      comp.push({ input: await sharp(q.buf).resize(q.w * ZD, q.h * ZD, { kernel: 'nearest' }).png().toBuffer(), left: x, top: y + 6 });
      x += q.w * ZD + 24;
      alto = Math.max(alto, q.h * ZD);
    }
    y += alto + 16;
  }
  await sharp({ create: { width: W, height: y, channels: 4, background: '#14161e' } }).composite(comp).png().toFile(arq);
  console.log(arq);
}

// ── THE SPORES: the Tube on the floor, a drifting fan of spores coming out of it, on chamber A and chamber B (blue) ──
{
  const X = 262;
  const anel = await img(await tiroAnel());
  const cands = [['ATUAL (13/10) — o tiro do anel', [anel, anel]]];
  for (const [nome, f] of Object.entries(ESPOROS)) cands.push([`À MÃO ${nome} · verde`, await Promise.all((await f(CORES_ESPORO.verde)).map(img))]);
  for (const nome of ['E1 grão espinhoso', 'E3 nuvem pontilhada'])
    for (const cor of ['lilas', 'cinza'])
      cands.push([`À MÃO ${nome} · ${cor}`, await Promise.all((await ESPOROS[nome](CORES_ESPORO[cor])).map(img))]);
  for (const [nome, arq, alto] of GERADAS_ESPORO) {
    const r = await reduzir(`${D}/cand/${arq}.png`, alto);
    cands.push([`GERADA ${nome} (reduzida · e a original do PixelLab)`, [r, r, await img(await sharp(`${D}/cand/${arq}.png`).trim().png().toBuffer())]]);
  }
  // A fan of 7, as if blown out of the mouth and drifting up-left (the 0.5 s, 1 s and 1.5 s marks of the puff).
  const LEQUE = [[-14, -18], [-4, -26], [8, -22], [-28, -30], [-12, -40], [10, -38], [-40, -46]];
  const paineis = [];
  for (const [nome, [q0, q1]] of cands) {
    for (const [c, lugar] of [[A, 'câmara A'], [B, 'câmara B']]) {
      const J = { x: 170, y: c.chao[X] + 12 - 76, w: 150, h: 76 };
      const boca = { x: X, y: c.chao[X] + 2 - tubo.h + 10 };
      paineis.push(await painel(c.png, J, [
        { ...nave, x: J.x + 8, y: J.y + J.h / 2 - nave.h / 2 - 12 },
        { ...tubo, x: X - tubo.w / 2, y: c.chao[X] + 2 - tubo.h },
        ...LEQUE.map(([dx, dy], i) => ({ ...(i % 2 ? q1 : q0), x: boca.x + dx - q0.w / 2, y: boca.y + dy - q0.h / 2 })),
      ], `${curto(nome)} · ${lugar} (${q0.w}×${q0.h})`, nome.startsWith('ATUAL') ? '#8a8f9c' : '#c8e070'));
    }
  }
  await folha(paineis, 2, `${D}/folha-esporos.png`);
  await detalhe(cands, `${D}/detalhe-esporos.png`);
}
