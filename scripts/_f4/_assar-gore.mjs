// O GORE DA GARGANTA — os pedaços que entram no núcleo, RECORTADOS DOS PIXELS DELA.
//
// ⚠️ RECORTAR NÃO É ECONOMIA, É A GARANTIA DE PALETA. É o mesmo princípio do
// `_assar-porta-nucleo.mjs`, onde o pico do pulso É o estático: a peça é a fonte da própria luz,
// então não existe como o destroço destoar da criatura de que ele saiu. Gerar pedaços novos
// traria outra paleta e faria o magenta brigar consigo mesmo.
//
// ⚠️ OS OITO PONTOS SÃO ESPALHADOS DE PROPÓSITO: dois do anel de dentes (o que o jogador
// reconhece), dois da goela acesa, quatro do casco escuro. Um gore só de miolo aceso lê como
// faísca; um gore só de casco lê como pedra. Os números saem do perfil medido da peça — o
// conteúdo mora em y 2..168 e a boca acesa em y 47..122.
//
//   node scripts/_f4/_assar-gore.mjs
import sharp from 'sharp';

const FONTE = 'public/sprites/garganta.png';
const SAIDA = 'public/sprites/f4-gore-sheet.png';
const LADO = 24,
  N = 8;

const { data, info } = await sharp(FONTE).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;

const PONTOS = [
  [30, 62],
  [62, 62], // o anel de dentes
  [42, 84],
  [52, 100], // a goela
  [34, 30],
  [58, 36], // o casco de cima
  [34, 130],
  [58, 138], // o casco de baixo
];

let semente = 0xc2b2ae35;
const rnd = () => {
  semente ^= semente << 13;
  semente ^= semente >>> 17;
  semente ^= semente << 5;
  return ((semente >>> 0) % 100000) / 100000;
};

const quadros = [];
for (const [cx, cy] of PONTOS) {
  const buf = Buffer.alloc(LADO * LADO * 4, 0);
  // Uma silhueta irregular dentro do quadrado: um pedaço arrancado não é um quadrado.
  const raio = 7 + rnd() * 3;
  for (let y = 0; y < LADO; y++) {
    for (let x = 0; x < LADO; x++) {
      const dx = x - LADO / 2,
        dy = y - LADO / 2;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > raio * (0.62 + rnd() * 0.5)) continue;
      const sx = cx - LADO / 2 + x,
        sy = cy - LADO / 2 + y;
      if (sx < 0 || sy < 0 || sx >= W || sy >= H) continue;
      const si = (sy * W + sx) * 4;
      if (data[si + 3] < 40) continue;
      const i = (y * LADO + x) * 4;
      buf[i] = data[si];
      buf[i + 1] = data[si + 1];
      buf[i + 2] = data[si + 2];
      buf[i + 3] = 255;
    }
  }
  quadros.push(await sharp(buf, { raw: { width: LADO, height: LADO, channels: 4 } }).png().toBuffer());
}

await sharp({
  create: { width: LADO * N, height: LADO, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
})
  .composite(quadros.map((input, i) => ({ input, left: i * LADO, top: 0 })))
  .png()
  .toFile(SAIDA);
console.log(`${SAIDA}  ${N} pedaços de ${LADO}x${LADO}`);
