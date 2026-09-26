// P3 · O QUE O VÁCUO PUXA (capítulo 3) — 6 partículas 16×16 assadas em pixel, com a paleta da câmara D.
// Os rastros apontam para a DIREITA (0°): o emissor gira cada uma para a direção do buraco.
//
//   node scripts/_f8/_assar-succao.mjs  →  public/sprites/f8-succao-sheet.png (96×16)
import sharp from 'sharp';

const S = 16, N = 6;
const C = { escuro: [22, 4, 8], fluido: [58, 8, 14], carne: [96, 18, 24], osso: [168, 150, 128], ossoSombra: [104, 88, 74], brasa: [196, 52, 26], fio: [255, 150, 60] };
const buf = Buffer.alloc(S * N * S * 4, 0);
const por = (q, x, y, c) => {
  if (x < 0 || y < 0 || x >= S || y >= S) return;
  const i = (y * S * N + q * S + x) * 4;
  buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
};
// 0 · rastro de fluido longo (cabeça grossa à direita, cauda fina à esquerda)
for (let x = 1; x < 15; x++) { por(0, x, 8, x > 10 ? C.fluido : C.escuro); if (x > 9) por(0, x, 7, C.escuro); }
// 1 · rastro curto e grosso
for (let x = 5; x < 14; x++) { por(1, x, 7, C.escuro); por(1, x, 8, C.fluido); if (x > 10) por(1, x, 9, C.escuro); }
// 2 · gota de lava com rastro (a ÚNICA acesa)
for (let x = 3; x < 11; x++) por(2, x, 8, C.brasa);
por(2, 11, 8, C.fio); por(2, 12, 8, C.fio); por(2, 12, 7, C.brasa); por(2, 12, 9, C.brasa);
// 3 · tendão arrebentado (fio ondulado)
for (let x = 1; x < 15; x++) por(3, x, 8 + Math.round(Math.sin(x * 0.9)), x % 4 === 0 ? C.carne : C.fluido);
// 4 · lasca de osso
for (let x = 5; x < 12; x++) { por(4, x, 7, C.osso); por(4, x, 8, C.ossoSombra); }
por(4, 12, 7, C.osso);
// 5 · naco de tecido
for (let y = 6; y < 11; y++) for (let x = 6; x < 11; x++) por(5, x, y, (x + y) % 3 === 0 ? C.escuro : C.carne);
await sharp(buf, { raw: { width: S * N, height: S, channels: 4 } }).png().toFile('public/sprites/f8-succao-sheet.png');
console.log('f8-succao-sheet.png 96x16');
