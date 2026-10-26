// 26/10 — the X-Aelo (the jato) moves ONLY its flame: in every animation frame, every pixel outside the exhaust flame
// (`ehChama`, the hand-drawn flame palettes behind the nozzle) is identical to frame 0. The "a" (Terminus) too.
//   node scripts/_naves/_testar-so-chama.mjs
import sharp from 'sharp';
import { ehChama } from '../../src/systems/morte/pedacos.ts';
let falhas = 0;
const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };
const ler = async (f) => { const { data, info } = await sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true }); return { w: info.width, cor: new Uint32Array(data.buffer, data.byteOffset, info.width * info.height).slice() }; };
const SERIES = [['X-Aelo', 'public/sprites/ship-jato-anim', 9], ['X-Aelo azul', 'public/sprites/ship-jato-azul-anim', 9],
  ['X-Aelo osso', 'public/sprites/naves/jato-osso-anim', 9], ['X-Aelo osso azul', 'public/sprites/naves/jato-osso-azul-anim', 9],
  ['Terminus', 'public/sprites/naves/humana-anim', 8], ['Terminus preta', 'public/sprites/naves/humana-preta-anim', 8]];
for (const [nome, pre, n] of SERIES) {
  const q0 = await ler(`${pre}-0.png`);
  const casco = (c, x) => (c >>> 24 < 128 || ehChama(c, x) ? 0 : c);
  let dif = 0, chamaMuda = 0;
  for (let i = 1; i < n; i++) {
    const q = await ler(`${pre}-${i}.png`);
    for (let k = 0; k < q.cor.length; k++) {
      const x = k % q.w;
      if (casco(q0.cor[k], x) !== casco(q.cor[k], x)) dif++;
      if (q0.cor[k] !== q.cor[k]) chamaMuda++;
    }
  }
  ok(dif === 0 && chamaMuda > 0, `${nome}: o casco é o mesmo nos ${n} quadros (${dif} px diferentes), só a chama anda`);
}
console.log(falhas ? `\n${falhas} FALHA(S)` : '\ntudo ok');
process.exit(falhas ? 1 : 0);
