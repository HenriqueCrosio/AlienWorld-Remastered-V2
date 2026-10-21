// BLOCO G · the fog colour the F1 treatment takes from HIS painting, for perfis.ts (faseF1) and numerosF1.ts (COR.nevoa).
// The usual sum of the phases (the mean of the mid-dark tones, luminance percentile 40–70, ×1.5, plus a cold touch on
// blue) is printed for the record, but this painting is far darker than the others and it gives a near-black fog
// (20/10: [18, 30, 49]). So the fog is the painting's own MIST: the mean of the mist-lit pixels (luminance 30–70) of
// the lower half, with the same cold touch.
//   node scripts/_g/_cor-nevoa-f1.mjs
import sharp from 'sharp';
import { lum } from '../_cenario/luzes.mjs';

const { data: p, info } = await sharp('public/sprites/f1/pintura.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const px = [];
for (let i = 0; i < p.length; i += 4) px.push([lum(p[i], p[i + 1], p[i + 2]), p[i], p[i + 1], p[i + 2], (i / 4 / info.width) | 0]);
const hex = (c) => '0x' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
const frio = (m, k) => m.map((v, c) => Math.min(255, Math.round(v * k + (c === 2 ? 6 : 0))));

const ord = [...px].sort((a, b) => a[0] - b[0]);
const meio = ord.slice(Math.round(ord.length * 0.4), Math.round(ord.length * 0.7));
const contaDeSempre = frio([1, 2, 3].map((c) => meio.reduce((a, v) => a + v[c], 0) / meio.length), 1.5);
console.log('a conta de sempre', `[${contaDeSempre.join(', ')}]`, hex(contaDeSempre));

const bruma = px.filter((v) => v[4] >= info.height / 2 && v[0] >= 30 && v[0] <= 70);
const nevoa = frio([1, 2, 3].map((c) => bruma.reduce((a, v) => a + v[c], 0) / bruma.length), 1);
console.log('névoa (a da pintura)', `[${nevoa.join(', ')}]`, hex(nevoa), `(${bruma.length} px)`);
