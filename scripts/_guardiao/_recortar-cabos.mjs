// THE GUARDIAN'S LEASH CABLES, CUT OUT OF THE ART (spec 2026-11-22-guardiao-coleira-design.md §9). From the root:
//   node scripts/_guardiao/_recortar-cabos.mjs [--folha]
// The cables that climb to the top edge (the leash) are ERASED above the hull's top contour — nothing is redrawn. The
// same mask for the four arts (the still, the 9 breathing frames, the 9 death frames, the wreck: all on the same 256²
// grid). Kept inside the mask: the turret on top of the dome and the bright sparks of the death sheet. Writes the
// `-coleira` arts next to the originals (which stay), copies the originals to assets/raw/guardiao-com-cabos/, and
// PROVES that every pixel outside the mask is identical. --folha also writes the before/after sheet (×3).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = path.resolve(import.meta.dirname, '../..');
const SPR = path.join(RAIZ, 'public/sprites');
const CRU = path.join(RAIZ, 'assets/raw/guardiao-com-cabos');
const ARTES = [
  ['guardiao.png', 'guardiao-coleira.png'],
  ['guardiao-idle-sheet.png', 'guardiao-coleira-idle-sheet.png'],
  ['guardiao-morte-sheet.png', 'guardiao-coleira-morte-sheet.png'],
  ['guardiao-destruido.png', 'guardiao-coleira-destruido.png'],
];

/**
 * The hull's top contour, in PNG px (x, y): above it, in [X_INI, 256), is cable. Measured on the ×5 grid
 * (scripts/_guardiao/_grade.mjs). Right of x = 215 the dome falls steeply and the cables wrap it as the side tentacles:
 * there the cut is a flat line (the rising part goes, the tentacles stay, and their top end is the rope's root).
 */
export const CONTORNO = [
  [36, 80], [50, 72], [62, 64], [80, 60], [92, 57], [120, 53], [135, 55], [150, 55], [165, 57], [180, 60], [195, 63],
  [210, 66], [214, 66], [215, 46], [256, 46],
];
export const X_INI = 36;
/** kept inside the mask: the turret on top of the dome (x0, y0, x1, y1, inclusive) */
const PRESERVAR = [[93, 45, 119, 57]];

export function yCorte(x) {
  if (x < X_INI) return 0;
  for (let i = 0; i < CONTORNO.length - 1; i++) {
    const [x0, y0] = CONTORNO[i], [x1, y1] = CONTORNO[i + 1];
    if (x >= x0 && x < x1) return Math.round(x1 === x0 ? y1 : y0 + ((y1 - y0) * (x - x0)) / (x1 - x0));
  }
  return CONTORNO[CONTORNO.length - 1][1];
}
const preservado = (x, y) => PRESERVAR.some(([a, b, c, d]) => x >= a && x <= c && y >= b && y <= d);
/**
 * The CABLE PALETTE: every colour the cables have above the contour in the still and the breathing sheet. In the death
 * sheet only these colours are erased — the sparks (and their orange tails) flying over the cables are new colours and
 * stay whole.
 */
const PALETA = new Set();
async function colherPaleta() {
  for (const f of ['guardiao.png', 'guardiao-idle-sheet.png']) {
    const { data, info } = await sharp(path.join(SPR, f)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let y = 0; y < info.height; y++)
      for (let X = 0; X < info.width; X++) {
        const i = (y * info.width + X) * 4;
        if (data[i + 3] && naMascara(X % 256, y)) PALETA.add((data[i] << 16) | (data[i + 1] << 8) | data[i + 2]);
      }
  }
}
export const naMascara = (x, y) => y < yCorte(x) && !preservado(x, y);

async function recortar(orig, nova) {
  const { data, info } = await sharp(path.join(SPR, orig)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  let apagados = 0;
  for (let y = 0; y < info.height; y++)
    for (let X = 0; X < info.width; X++) {
      const x = X % 256, i = (y * info.width + X) * 4;
      if (!naMascara(x, y) || data[i + 3] === 0) continue;
      // the sparks exist only in the death sheet; elsewhere a bright pixel up here is a cable's lit edge
      if (orig.includes('morte') && !PALETA.has((data[i] << 16) | (data[i + 1] << 8) | data[i + 2])) continue;
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      apagados++;
    }
  // the proof: outside the mask, byte for byte
  let diferentes = 0;
  for (let y = 0; y < info.height; y++)
    for (let X = 0; X < info.width; X++) {
      if (naMascara(X % 256, y)) continue;
      const i = (y * info.width + X) * 4;
      for (let c = 0; c < 4; c++) if (out[i + c] !== data[i + c]) { diferentes++; break; }
    }
  await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(path.join(SPR, nova));
  fs.mkdirSync(CRU, { recursive: true });
  if (!fs.existsSync(path.join(CRU, orig))) fs.copyFileSync(path.join(SPR, orig), path.join(CRU, orig));
  console.log(`${diferentes === 0 ? 'OK  ' : 'FALHA'} ${nova}: ${apagados} px apagados; fora da máscara: ${diferentes} pixels diferentes`);
  return diferentes === 0;
}

const principal = path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.slice(1)).replaceAll('%20', ' ');
const ok = [];
if (principal) {
  await colherPaleta();
  for (const [o, n] of ARTES) ok.push(await recortar(o, n));
}

if (principal && process.argv.includes('--folha')) {
  const DIR = path.join(RAIZ, 'docs/superpowers/folhas/2026-11-22/guardiao');
  fs.mkdirSync(DIR, { recursive: true });
  const Z = 3, fundo = { r: 40, g: 30, b: 34, alpha: 1 };
  const quadros = [['guardiao', 0], ['guardiao-idle-sheet', 0], ['guardiao-idle-sheet', 4], ['guardiao-idle-sheet', 7], ['guardiao-morte-sheet', 4], ['guardiao-destruido', 0]];
  const cel = async (arq, f) => sharp(path.join(SPR, arq)).extract({ left: f * 256, top: 0, width: 256, height: 256 })
    .resize(256 * Z, 256 * Z, { kernel: 'nearest' }).flatten({ background: fundo }).png().toBuffer();
  const comp = [];
  for (let k = 0; k < quadros.length; k++) {
    const [a, f] = quadros[k];
    const nova = a.replace('guardiao', 'guardiao-coleira');
    comp.push({ input: await cel(`${a}.png`, f), left: k * 256 * Z, top: 0 });
    comp.push({ input: await cel(`${nova}.png`, f), left: k * 256 * Z, top: 256 * Z });
  }
  await sharp({ create: { width: quadros.length * 256 * Z, height: 512 * Z, channels: 4, background: fundo } })
    .composite(comp).png().toFile(path.join(DIR, 'recorte.png'));
  console.log('folha: docs/superpowers/folhas/2026-11-22/guardiao/recorte.png');
}
if (ok.includes(false)) process.exit(1);
