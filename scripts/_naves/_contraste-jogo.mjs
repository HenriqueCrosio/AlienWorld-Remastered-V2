// 23/10 — round 2a: the ships planted in the real game, MEASURED and set side by side. For one phase it reads the
// frames written by naves-plantar (<dir>/f<F>-<label>.png, the 1152×648 frame) plus the empty one (f<F>-vazio.png):
// the ship mask is what differs from the empty frame; the background is a ring around it, from the empty frame.
// Contrast = (brighter + 0.05) / (darker + 0.05) on relative luminance (the WCAG formula), and the share of the
// ship's pixels that are light (> 0.25). Writes <dir>/f<F>-grade.png (rows = lines, cols = today + the tones) and
// merges the numbers into <dir>/contraste.json.
//   node scripts/_naves/_contraste-jogo.mjs <dir> <fase> <x,y> <linhas,...> <tons,...>
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [DIR, FASE, XY, LS, TS] = process.argv.slice(2);
const [X, Y] = XY.split(',').map(Number);
const LINHAS = LS.split(','), TONS = TS.split(',');
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const L = (d, i) => 0.2126 * lin(d[i]) + 0.7152 * lin(d[i + 1]) + 0.0722 * lin(d[i + 2]);
const ler = async (rot) => (await sharp(path.join(DIR, `f${FASE}-${rot}.png`)).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
const vazio = await ler('vazio');
const FW = vazio.info.width, FH = vazio.info.height;

async function medir(rot) {
  const { data } = await ler(rot);
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1, n = 0, s = 0, claro = 0;
  // only look near the ship (the rest of the frame is identical)
  const cx = X * 3, cy = Y * 3;
  for (let y = Math.max(0, cy - 60); y < Math.min(FH, cy + 60); y++) for (let x = Math.max(0, cx - 90); x < Math.min(FW, cx + 90); x++) {
    const i = (y * FW + x) * 3;
    if (Math.abs(data[i] - vazio.data[i]) + Math.abs(data[i + 1] - vazio.data[i + 1]) + Math.abs(data[i + 2] - vazio.data[i + 2]) < 18) continue;
    const l = L(data, i); s += l; n++; if (l > 0.25) claro++;
    x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
  }
  let b = 0, m = 0;
  for (let y = Math.max(0, y0 - 30); y < Math.min(FH, y1 + 30); y++) for (let x = Math.max(0, x0 - 30); x < Math.min(FW, x1 + 30); x++) {
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1) continue;
    b += L(vazio.data, (y * FW + x) * 3); m++;
  }
  const nave = s / n, fundo = b / m;
  return { razao: +((Math.max(nave, fundo) + 0.05) / (Math.min(nave, fundo) + 0.05)).toFixed(2), claros: Math.round((100 * claro) / n), nave: +nave.toFixed(3), fundo: +fundo.toFixed(3) };
}

const CW = 252, CH = 168, LAB = 22, M = 8;
const left = Math.max(0, Math.min(FW - CW, X * 3 - CW / 2)), top = Math.max(0, Math.min(FH - CH, Y * 3 - CH / 2));
const recorte = (rot) => sharp(path.join(DIR, `f${FASE}-${rot}.png`)).extract({ left, top, width: CW, height: CH }).png().toBuffer();
const rotulo = (txt, cor = '#d9dde6') => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${CW}" height="${LAB}"><text x="2" y="16" font-family="monospace" font-size="14" fill="${cor}">${txt}</text></svg>`);
const cor = (r) => (r >= 2 ? '#6fcf97' : r >= 1.5 ? '#ffb347' : '#ff6b6b');

const todos = fs.existsSync(path.join(DIR, 'contraste.json')) ? JSON.parse(fs.readFileSync(path.join(DIR, 'contraste.json'), 'utf8')) : {};
const res = { hoje: await medir('hoje') };
const tiles = [];
const col = (c) => M + c * (CW + M), lin2 = (r) => r * (CH + LAB + M);
tiles.push({ input: await recorte('hoje'), left: col(0), top: lin2(0) + LAB });
tiles.push({ input: rotulo(`hoje  ${res.hoje.razao}×  ${res.hoje.claros}%`, cor(res.hoje.razao)), left: col(0), top: lin2(0) });
for (const [r, linha] of LINHAS.entries()) for (const [c, tom] of TONS.entries()) {
  const rot = `${linha}-${tom}`;
  res[rot] = await medir(rot);
  tiles.push({ input: await recorte(rot), left: col(c + 1), top: lin2(r) + LAB });
  tiles.push({ input: rotulo(`${linha} ${tom}  ${res[rot].razao}×  ${res[rot].claros}%`, cor(res[rot].razao)), left: col(c + 1), top: lin2(r) });
}
todos[`f${FASE}`] = res;
fs.writeFileSync(path.join(DIR, 'contraste.json'), JSON.stringify(todos, null, 1));
await sharp({ create: { width: M + (TONS.length + 1) * (CW + M), height: LINHAS.length * (CH + LAB + M), channels: 4, background: '#14161d' } })
  .composite(tiles).png().toFile(path.join(DIR, `f${FASE}-grade.png`));
console.log(`f${FASE}`, Object.entries(res).map(([k, v]) => `${k} ${v.razao}× ${v.claros}%`).join(' | '));
