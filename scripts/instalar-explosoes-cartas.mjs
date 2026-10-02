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
