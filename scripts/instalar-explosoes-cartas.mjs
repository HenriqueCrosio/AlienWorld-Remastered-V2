// AS EXPLOSÕES APROVADAS DAS CARTAS (spec 2026-10-01-catalogo-cartas-design.md §5.1b/§5.1c) → spritesheets do jogo.
// Os quadros vêm das pastas aprovadas (PixMiniMax, quadros numerados) e saem lado a lado num PNG só, em
// public/sprites/cartas/fx/<nome>.png, no tamanho NATIVO (pixel não se amplia). Uso, da raiz:
// node scripts/instalar-explosoes-cartas.mjs
import fs from 'fs';
import sharp from 'sharp';

const P = 'docs/superpowers/folhas/2026-10-01/pecas-novas';
const OUT = 'public/sprites/cartas/fx';
// [nome, pasta, quadros usados]
const SHEETS = [
  // O impacto DIRECIONAL humano: pequeno (#3 a 75%) e grande (#15 a 75%) — o leque aponta para a DIREITA.
  ['exp-hum-peq', `${P}/explosoes-anim/anim-exp-hum-peq`, [0, 1, 2, 3, 4, 5, 6, 7]],
  ['exp-hum-grande', `${P}/explosoes-anim/anim-exp-hum-grande`, [0, 1, 2, 3, 4, 5, 6, 7]],
  // O cone de ENERGIA da manta (#15 a 75%) — também aponta para a direita.
  ['exp-alien', `${P}/explosoes-anim/anim-exp-alien`, [0, 1, 2, 3, 4, 5, 6, 7]],
  // A REDONDA #53 (o míssil chega de qualquer ângulo). ⚠️ Só os 4 primeiros: do 5º em diante o gerador desenhou o
  // próprio míssil no meio da fumaça.
  ['exp-missil', `${P}/explosoes-anim/anim-exp-missil`, [0, 1, 2, 3]],
  // A COMBUSTÃO #11 (fogo em X) e o PULSO da Sobrecarga #4.
  ['exp-fogo', `${P}/rodada4/anim/anim-fogo`, [0, 1, 2, 3, 4, 5, 6, 7, 8]],
  ['exp-pulso', `${P}/rodada4/anim/anim-pulso`, [0, 1, 2, 3, 4, 5, 6, 7, 8]],
];

fs.mkdirSync(OUT, { recursive: true });
for (const [nome, pasta, quadros] of SHEETS) {
  const m = await sharp(`${pasta}/${quadros[0]}.png`).metadata();
  const comp = await Promise.all(
    quadros.map(async (q, i) => ({ input: await sharp(`${pasta}/${q}.png`).ensureAlpha().png().toBuffer(), left: i * m.width, top: 0 })),
  );
  await sharp({ create: { width: m.width * quadros.length, height: m.height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(comp)
    .png()
    .toFile(`${OUT}/${nome}.png`);
  console.log(`${OUT}/${nome}.png  ${quadros.length} quadros de ${m.width}×${m.height}`);
}

// A REDONDA DO MÍSSIL ALIEN (§5.1c: *"a mesma, repintada na manta"*). Pixel a pixel, sem mexer no desenho: a FUMAÇA
// (os marrons pouco saturados) vira o casco escuro da manta; o FOGO (laranja e amarelo saturados, e os quase-brancos)
// vira a energia ciano-verde do cone alien. Cada parte cai na sua rampa pela luminância, então a forma e o
// sombreado são os da redonda aprovada.
const hex = (s) => [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
const CASCO = ['0a1917', '162327', '1e3030', '2c4948', '3f5e5c', '5b6e6c'].map(hex); // alien-t1.png
const ENERGIA = ['0e6b7a', '0d8f9c', '10ad9f', '47ba9d', '52d1b4', '54fad2', 'a9ffe2', 'f2fefd'].map(hex); // exp-alien.png
const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
const naRampa = (rampa, t) => rampa[Math.min(rampa.length - 1, Math.max(0, Math.round(t * (rampa.length - 1))))];
{
  const { data, info } = await sharp(`${OUT}/exp-missil.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const l = lum(r, g, b);
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / Math.max(1, Math.max(r, g, b));
    const fogo = (l >= 95 && sat >= 0.6) || l >= 200;
    // Fumaça: luminância ~25–160 → o casco. Fogo: ~95–255 → a energia.
    const cor = fogo ? naRampa(ENERGIA, (l - 95) / 160) : naRampa(CASCO, (l - 25) / 135);
    [data[i], data[i + 1], data[i + 2]] = cor;
  }
  await sharp(data, { raw: info }).png().toFile(`${OUT}/exp-missil-alien.png`);
  console.log(`${OUT}/exp-missil-alien.png  a redonda repintada na manta`);
}
