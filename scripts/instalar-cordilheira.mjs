// INSTALA as três cristas da CADEIA DO MEIO da Fase 1 (`mtnMid` no `Parallax.buildSurface`) —
// a arte nova de 2026-08-31, gerada como CONJUNTO a pedido do Henrique.
//
// ⚠️ O QUE ESTAVA ERRADO NA ARTE ANTIGA, MEDIDO. As três variantes não eram um conjunto: a
// `mtn-mid-2` não é uma cordilheira, é um BLOCO preenchido cortado reto na borda. Medida a
// altura da coluna nas duas bordas do quadro, em % da altura do pico:
//
//     mtn-mid-2 (antiga)   esquerda  84%   direita  96%   ← cortada quase inteira
//     picos     (nova)     esquerda  42%   direita  26%
//     maciço    (nova)     esquerda  13%   direita  11%
//     agulhas   (nova)     esquerda  25%   direita  25%
//
// Uma crista que chega à borda em 96% da altura do pico emenda com a vizinha numa PAREDE
// VERTICAL. É isso que se via, e é o único defeito que dava para apontar com o dedo — o
// Henrique tinha aprovado a cadeia jogando ("ficou boa"), então o resto da arte não estava em
// discussão.
//
// ⚠️ AS TRÊS SÃO UM CONJUNTO, E ISSO SE MEDE. Luminância média dos pixels opacos: 33 (picos),
// 34 (maciço), 35 (agulhas) — a mesma família. A `novo[2]` da mesma leva media 43 e a `novo[3]`
// media 24; as duas foram descartadas por isso, não por desenho.
//
// ⚠️ RECORTA PELA CAIXA OPACA E PRESERVA A ALTURA NA TELA. O Henrique aprovou a cadeia na
// ALTURA que ela tem hoje, então a arte nova não pode chegar mais alta de carona: o script
// imprime a altura recortada de cada peça contra a antiga, e é essa razão que diz se o `scale`
// da camada em `Parallax.buildSurface()` precisa de ajuste.
//
// ⚠️ LÊ DO PIXELLAB E ESCREVE EM `public/sprites/`. Rodar duas vezes dá o mesmo resultado.
import sharp from 'sharp';

const USER = 'f7282f36-b779-4f64-832a-4693ca4cc628';

/** objeto do PixelLab → sprite do jogo. A ordem é a do `pickVariant`. */
const PECAS = [
  ['5f07af17-f60e-44d5-aedf-36d928c80003', 'mtn-mid.png', 'picos'],
  ['02396904-cde9-4f4e-be6c-284bb1da086c', 'mtn-mid-2.png', 'maciço'],
  ['4f53e7c1-90af-496d-b961-98260514999a', 'mtn-mid-3.png', 'agulhas'],
];

const caixa = async (buf) => {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1;
  for (let y = 0; y < info.height; y++)
    for (let x = 0; x < info.width; x++)
      if (data[(y * info.width + x) * 4 + 3] > 60) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  return { left: x0, top: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
};

console.log('peça      antiga      nova        altura');
for (const [id, saida, nome] of PECAS) {
  const antes = await sharp(`public/sprites/${saida}`).metadata().catch(() => null);
  const r = await fetch(`https://backblaze.pixellab.ai/file/pixellab-characters/objects/${USER}/${id}/rotations/unknown.png`);
  if (!r.ok) throw new Error(`HTTP ${r.status} em ${nome}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const box = await caixa(buf);
  await sharp(buf).extract(box).png().toFile(`public/sprites/${saida}`);
  const razao = antes ? (box.height / antes.height).toFixed(2) : '—';
  console.log(
    `${nome.padEnd(9)} ${antes ? `${antes.width}x${antes.height}`.padEnd(11) : '—'.padEnd(11)}` +
      `${`${box.width}x${box.height}`.padEnd(11)} ${razao}x`,
  );
}
