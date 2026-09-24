// OS PEDAÇOS DO ESTOURO (capítulo 2) — as formas das vísceras da F4 (`f4-viscera-sheet.png`, 22/09), sem os
// dois anéis de dentes (são da garganta), REPINTADAS na paleta da câmara D. A folha da F4 é ROXA (é a matéria
// do esfíncter); na câmara D carmim ela lia como outra coisa voando (folha de 24/09).
//
//   node scripts/_f8/_repintar-pedacos.mjs  →  public/sprites/f8-pedacos-sheet.png (11 × 39×61)
import sharp from 'sharp';
import { paletaDe } from './_paleta.mjs';

const W = 39, H = 61, DE = 2, ATE = 12; // quadros 2..12 da folha da F4
const paleta = await paletaDe('public/sprites/paint-bg-f4-d.png', 64);
const lum = (c) => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];
// a rampa da câmara: só os tons VERMELHOS dela (r bem acima de g e b), do escuro ao claro
const rampa = paleta.filter((c) => c[0] > c[1] * 1.4 && c[0] > c[2] * 1.2).sort((a, b) => lum(a) - lum(b));
const { data, info } = await sharp('public/sprites/f4-viscera-sheet.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const n = ATE - DE + 1;
const out = Buffer.alloc(W * n * H * 4, 0);
for (let q = 0; q < n; q++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = (y * info.width + (DE + q) * W + x) * 4;
  if (data[i + 3] === 0) continue;
  // a LUMINOSIDADE do roxo escolhe o degrau da rampa vermelha — a forma e o volume ficam, a cor muda
  const k = Math.min(rampa.length - 1, Math.floor((lum([data[i], data[i + 1], data[i + 2]]) / 150) * rampa.length));
  const c = rampa[k];
  const o = (y * W * n + q * W + x) * 4;
  out[o] = c[0]; out[o + 1] = c[1]; out[o + 2] = c[2]; out[o + 3] = data[i + 3];
}
await sharp(out, { raw: { width: W * n, height: H, channels: 4 } }).png().toFile('public/sprites/f8-pedacos-sheet.png');
console.log(`f8-pedacos-sheet.png ${n} × ${W}×${H} · rampa de ${rampa.length} vermelhos`);
