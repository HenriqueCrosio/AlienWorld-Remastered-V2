// 25/10 — the sheet images of the new ladder cut from the orange "a" (`_escada-recorte.mjs`):
//   opcoes.png  — the T1 and T0 options ×8, the "a" at the head of the T1 row;
//   escadas.png — today's ladder and the new options ×5 (how they read on a 1080p screen), on the dark of the game.
//   node scripts/_naves/_montar-escada.mjs <opcoesDir> <outDir>
import path from 'node:path';
import sharp from 'sharp';
import { BASE, RECEITAS } from './escada-receitas.mjs';

const [DIR, OUT] = process.argv.slice(2);
const M = 16, LAB = 26, BG = '#0d0f15', CHIP = { r: 20, g: 24, b: 34, alpha: 1 };

const texto = (t, w, size = 15, cor = '#d9dde6') => Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${LAB}"><text x="2" y="18" font-family="monospace" font-size="${size}" fill="${cor}">${t}</text></svg>`);

// The sprite cropped to its drawn box, ×Z (nearest), centred on a chip of fixed size.
async function chip(f, Z, cw, ch) {
  const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (data[(y * info.width + x) * 4 + 3] > 40) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const img = await sharp(f).extract({ left: x0, top: y0, width: w, height: h }).resize(w * Z, h * Z, { kernel: 'nearest' }).png().toBuffer();
  const W = cw * Z, H = ch * Z;
  const fundo = await sharp({ create: { width: W, height: H, channels: 4, background: CHIP } }).png().toBuffer();
  return { buf: await sharp(fundo).composite([{ input: img, left: Math.floor((W - w * Z) / 2), top: Math.floor((H - h * Z) / 2) }]).png().toBuffer(), w: W, h: H, medida: `${w}x${h}` };
}

// Rows of [label, file]; every chip in a sheet has the same size (cw×ch drawn px) so sizes compare by eye.
async function folha(saida, Z, cw, ch, linhas) {
  const tiles = [];
  let top = M, largura = 0;
  for (const [titulo, itens] of linhas) {
    tiles.push({ input: texto(titulo, 900, 17), left: M, top });
    top += LAB;
    let left = M;
    for (const [rot, f] of itens) {
      const c = await chip(f, Z, cw, ch);
      tiles.push({ input: texto(`${rot} · ${c.medida}`, c.w, 13, '#9aa3b5'), left, top });
      tiles.push({ input: c.buf, left, top: top + LAB });
      left += c.w + M;
    }
    largura = Math.max(largura, left);
    top += LAB + ch * Z + M * 1.5;
  }
  await sharp({ create: { width: largura, height: Math.round(top), channels: 4, background: BG } }).composite(tiles).png().toFile(saida);
  console.log(saida, `${largura}x${Math.round(top)}`);
}

const RODADA = process.argv.find((a) => a.startsWith('--rodada='))?.slice(9) ?? '1';
const de = (r) => (r.rodada ?? '1') === RODADA;
const rot = (r) => (RODADA === '1' ? `opção ${r.id.slice(-1)}` : r.id.slice(3));
const op = (tier) => RECEITAS.filter((r) => r.tier === tier && de(r)).map((r) => [rot(r), path.join(DIR, `${r.id}.png`)]);
const HOJE = ['a escada de hoje', [['T0', 'public/sprites/naves/humana-t0.png'], ['T1 (o jato)', 'public/sprites/ship-jato.png'], ['T2', 'public/sprites/naves/humana-t2.png']]];
const sufixo = RODADA === '1' ? '' : `-${RODADA}`;

if (RODADA === '1') {
  await folha(path.join(OUT, 'opcoes.png'), 8, 44, 24, [
    ['T1 · a "a" e as 4 opções', [['a "a" (T2)', BASE], ...op(1)]],
    ['T0 · as 4 opções', op(0)],
  ]);
  await folha(path.join(OUT, 'escadas.png'), 5, 44, 24, [HOJE, ['T0 nova · as opções', op(0)], ['T1 nova · as opções', op(1)], ['T2 nova', [['a "a"', BASE]]]]);
} else {
  // 1b: the picked T0 c against its smaller turbines; the T1 b against the new T1s; the "a" closing each ladder.
  const c = ['c (a escolhida)', path.join(DIR, 't0-c.png')], b = ['b (a que ficou boa)', path.join(DIR, 't1-b.png')];
  await folha(path.join(OUT, `opcoes${sufixo}.png`), 8, 44, 24, [
    ['T0 c · a turbina menor', [c, ...op(0)]],
    ['T1 · a b e as novas, a partir dela', [b, ...op(1)]],
    ['T2 · a "a"', [['a "a"', BASE]]],
  ]);
  await folha(path.join(OUT, `escadas${sufixo}.png`), 5, 44, 24, [HOJE, ['T0 c · a turbina menor', [c, ...op(0)]], ['T1 · as novas', [b, ...op(1)]], ['T2 nova', [['a "a"', BASE]]]]);
}
