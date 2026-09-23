// P1 · AS RACHADURAS DA CONVULSÃO (Fatia 8, capítulo 1) — assadas em pixel, 384×216, escala 1.
// A paleta sai da PRÓPRIA câmara D (`paint-bg-f4-d.png`): o núcleo da racha é o escuro dela, a borda é
// o vermelho dela e só o fio do meio acende (lava) — a lei do dark sci-fi: luz só onde há energia.
//
//   node scripts/_f8/_assar-convulsao.mjs
//
// Sai: public/sprites/f8-convulsao-sheet.png  (8 quadros × 384×216, lado a lado; o quadro k contém as
// rachaduras dos estágios 0..k — elas só crescem)
import sharp from 'sharp';

const W = 384, H = 216, N = 8;
const P = { nucleo: [6, 2, 4], borda: [58, 8, 12], brasa: [132, 20, 14], fio: [226, 92, 30] };

// Aleatório determinístico: a mesma folha a cada rodada (a sonda fotografa).
let semente = 20260923;
const rnd = () => ((semente = (semente * 1664525 + 1013904223) >>> 0) / 4294967296);

/** Uma racha: passeio que ramifica. Devolve os pontos por estágio (em que estágio cada pixel nasce). */
// ⚠️ 1ª RODADA REPROVADA NO OLHO (23/09): 14 sementes espalhadas, passeio nervoso (±0,35 rad por passo) e
// borda VERMELHA em volta de tudo — ~7800 pontos que liam como uma MALHA DE FIOS por cima da pintura, não
// como a pintura rachando. Agora: poucas rachas, grossas e quase retas, nascendo do PONTO DO RASGO (a parede
// da direita, onde o capítulo 2 abre) e crescendo para fora com o tempo — a convulsão anuncia o rasgo.
const RASGO = { x: 285, y: 100 };
const DIST_MAX = 230;
const rachas = [];
const semear = (x, y, ang, vida, grossa) => {
  for (let i = 0; i < vida; i++) {
    ang += (rnd() - 0.5) * 0.3;
    x += Math.cos(ang);
    y += Math.sin(ang);
    if (x < 1 || y < 1 || x > W - 2 || y > H - 2) return;
    // o estágio é a DISTÂNCIA do rasgo: perto racha primeiro, longe racha por último
    const d = Math.hypot(x - RASGO.x, y - RASGO.y);
    const e = Math.min(N - 1, Math.floor((d / DIST_MAX) * N));
    rachas.push({ x: Math.round(x), y: Math.round(y), e, grossa: grossa && i < vida * 0.6, ang });
    if (rnd() < 0.018 && vida > 30) semear(x, y, ang + (rnd() < 0.5 ? 1 : -1) * (0.5 + rnd() * 0.5), Math.floor(vida * 0.45), false);
  }
};
// 9 troncos saindo do rasgo em leque
for (let k = 0; k < 9; k++) semear(RASGO.x, RASGO.y, (k / 9) * Math.PI * 2 + rnd() * 0.4, 90 + Math.floor(rnd() * 110), true);

const folha = Buffer.alloc(W * N * H * 4, 0);
const por = (q, x, y, cor, a = 255) => {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W * N + q * W + x) * 4;
  if (folha[i + 3] >= a) return;
  folha[i] = cor[0]; folha[i + 1] = cor[1]; folha[i + 2] = cor[2]; folha[i + 3] = a;
};
for (let q = 0; q < N; q++) {
  for (const p of rachas) {
    if (p.e > q) continue;
    // SOMBRA escura em volta (não vermelha: vermelho em volta era o que fazia a malha de fios) → o núcleo
    // preto (2px no tronco) → a brasa e o fio aceso, só no tronco maduro, e esparsos.
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) por(q, p.x + dx, p.y + dy, P.nucleo, 140);
    por(q, p.x, p.y, P.nucleo);
    if (p.grossa) por(q, p.x + Math.round(-Math.sin(p.ang)), p.y + Math.round(Math.cos(p.ang)), P.nucleo);
    if (p.grossa && q - p.e >= 1) por(q, p.x, p.y, (p.x * 7 + p.y * 3) % 5 === 0 ? P.fio : P.brasa);
  }
}
await sharp(folha, { raw: { width: W * N, height: H, channels: 4 } }).png().toFile('public/sprites/f8-convulsao-sheet.png');
console.log('f8-convulsao-sheet.png', W * N, 'x', H, '·', rachas.length, 'pontos de racha');
