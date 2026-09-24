// FOLHA DE ARRANJOS DO CAPÍTULO 4 (24/09): ele pediu a lua da colônia MAIS PERTO e talvez um fundo que já temos.
// Cada arranjo = fundo (recorte 384×216 em escala 1 dos pintados, ou espelhado) + o Leviatã recortado (inteiro
// ou reduzido fora do jogo) + a nave saindo da ferida. PRÉVIA: nada disto entra no jogo sem a escolha dele.
import sharp from 'sharp';

const SP = 'public/sprites/';
const W = 384, H = 216;
const lev = SP + 'f8-leviata.png', lava = SP + 'f8-leviata-lava.png';
const levComLava = await sharp(lev).composite([{ input: lava }]).png().toBuffer();
const levM = await sharp(levComLava).resize({ width: 250, kernel: 'nearest' }).png().toBuffer(); // prévia: reduzido
const nave = await sharp(SP + 'ship-alien2.png').png().toBuffer().catch(() => sharp(SP + 'ship.png').png().toBuffer());

const recorte = (f, left, top, espelha = false) => {
  let s = sharp(SP + f).extract({ left, top, width: W, height: H });
  if (espelha) s = s.flop();
  return s.png().toBuffer();
};
const espaco = await sharp({ create: { width: W, height: H, channels: 4, background: { r: 6, g: 7, b: 12, alpha: 1 } } }).png().toBuffer();
const luaGrande = await sharp(SP + 'menu-moon.png').resize({ width: 150, kernel: 'lanczos3' }).png().toBuffer();

const arranjos = [
  ['A · zero-G: a lua embaixo (a decolagem ao contrário)', await recorte('paint-bg-zerog.png', 0, 54), levM, 70, 20, 175, 70],
  ['B · zero-G espelhado: a lua embaixo à direita', await recorte('paint-bg-zerog.png', 96, 54, true), levM, 20, 16, 125, 66],
  ['C · Aurora espelhada: a borda da lua grande à direita', await recorte('paint-bg-cut1.png', 0, 27, true), levM, 14, 60, 119, 110],
  ['D · zero-G, o bicho INTEIRO por cima da lua', await recorte('paint-bg-zerog.png', 0, 54), levComLava, 12, 6, 213, 56],
  ['E · espaço + a lua do menu GRANDE atrás', espaco, levM, 20, 70, 125, 120, 'lua'],
  ['F · Aurora espelhada, o bicho INTEIRO', await recorte('paint-bg-cut1.png', 0, 27, true), levComLava, 4, 44, 205, 94],
];

const tiles = [];
for (const [nome, fundo, bicho, bx, by, nx, ny, extra] of arranjos) {
  const camadas = [];
  if (extra === 'lua') camadas.push({ input: luaGrande, left: 222, top: 20 });
  camadas.push({ input: bicho, left: bx, top: by }, { input: nave, left: nx, top: ny });
  const img = await sharp(fundo).composite(camadas).png().toBuffer();
  const rot = Buffer.from(`<svg width="${W}" height="20"><rect width="${W}" height="20" fill="#000" opacity=".75"/><text x="5" y="14" font-family="monospace" font-size="12" fill="#fc6">${nome}</text></svg>`);
  tiles.push(await sharp(img).composite([{ input: rot, left: 0, top: 0 }]).png().toBuffer());
}
const folha = await sharp({ create: { width: W * 2 + 8, height: H * 3 + 16, channels: 4, background: '#16161c' } })
  .composite(tiles.map((input, i) => ({ input, left: (i % 2) * (W + 8), top: Math.floor(i / 2) * (H + 8) })))
  .png().toBuffer();
await sharp(folha).resize((W * 2 + 8) * 2, (H * 3 + 16) * 2, { kernel: 'nearest' }).toFile('docs/superpowers/folhas/2026-09-23/p4-arranjos.png');
console.log('folha: docs/superpowers/folhas/2026-09-23/p4-arranjos.png');
