// where the cut Guardian art's cables END at the frame: opaque runs on the right column (x=255) and on the cut row (y=46,
// x≥215), per frame of the still art and the idle sheet — the cable ends the leash ropes must continue (22/11)
import sharp from 'sharp';
const corridas = (lado, get) => {
  const out = [];
  let ini = -1;
  for (let i = 0; i <= lado.n; i++) {
    const op = i < lado.n && get(lado.a + i);
    if (op && ini < 0) ini = i;
    if (!op && ini >= 0) { out.push([lado.a + ini, lado.a + i - 1]); ini = -1; }
  }
  return out;
};
for (const [nome, quadros] of [['public/sprites/guardiao-coleira.png', 1], ['public/sprites/guardiao-coleira-idle-sheet.png', 9]]) {
  const { data, info } = await sharp(nome).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let f = 0; f < quadros; f++) {
    const a = (x, y) => data[(y * info.width + x + f * 256) * 4 + 3] > 0;
    const dir = corridas({ a: 0, n: 256 }, (y) => a(255, y));
    const topo = corridas({ a: 215, n: 41 }, (x) => a(x, 46));
    console.log(nome.split('/').pop(), f, 'x=255:', JSON.stringify(dir), ' y=46:', JSON.stringify(topo));
  }
}
