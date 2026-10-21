import sharp from 'sharp';
const R = 'assets/raw/';
const V = R + 'Valle Industrial Devastado sob Céu Transparente.png';
const P = R + 'Paisagem Montanhosa Sombria com Brasas.png';
const out = process.argv[2];
// 1. artifacts in the Valle: crops at 1:1 around the left smoke and the cyan band
for (const [n, l, t, w, h] of [['v-fumaca-esq', 0, 460, 420, 260], ['v-banda', 380, 600, 500, 160], ['v-torre-dir', 1380, 470, 388, 330]]) {
  await sharp(V).extract({ left: l, top: t, width: w, height: h }).flatten({ background: '#ff00ff' }).toFile(`${out}/${n}.png`);
}
await sharp(P).extract({ left: 0, top: 520, width: 500, height: 260 }).toFile(`${out}/p-borda.png`);
// alpha stats of the Valle in the smoke region
const { data, info } = await sharp(V).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const hist = new Array(11).fill(0);
for (let i = 3; i < data.length; i += 4) hist[Math.round(data[i] / 25.5)]++;
console.log('valle alpha hist (0..10):', hist.join(' '));
// Paisagem: checker sample
const p = await sharp(P).raw().toBuffer({ resolveWithObject: true });
const s = [];
for (let y = 0; y < 40; y += 3) { const row = []; for (let x = 0; x < 60; x += 3) { const i = (y * p.info.width + x) * 3; row.push(p.data[i]); } s.push(row.join(',')); }
console.log('checker sample R:\n' + s.slice(0, 6).join('\n'));
