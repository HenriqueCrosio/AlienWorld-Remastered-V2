// PÕE UMA ARTE NA PALETA DE UMA REFERÊNCIA (cor mais próxima, sem dither). O PixMiniMax e a v3 CLAREIAM —
// é a regra do projeto corrigir cada clipe para a paleta do vizinho antes de instalar.
import sharp from 'sharp';

/** As até `max` cores da referência (quantização do próprio sharp). */
export async function paletaDe(refPath, max = 48) {
  const { data, info } = await sharp(refPath).removeAlpha().png({ palette: true, colors: max }).toBuffer({ resolveWithObject: true })
    .then(({ data }) => sharp(data).raw().toBuffer({ resolveWithObject: true }));
  const vistas = new Map();
  for (let i = 0; i < data.length; i += info.channels) vistas.set(`${data[i]},${data[i + 1]},${data[i + 2]}`, [data[i], data[i + 1], data[i + 2]]);
  return [...vistas.values()];
}

/** Cada pixel opaco vai para a cor mais próxima da paleta; o alfa fica. Devolve PNG. */
export async function naPaleta(buf, paleta) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let melhor = paleta[0], d0 = Infinity;
    for (const c of paleta) {
      const d = (c[0] - data[i]) ** 2 + (c[1] - data[i + 1]) ** 2 + (c[2] - data[i + 2]) ** 2;
      if (d < d0) { d0 = d; melhor = c; }
    }
    data[i] = melhor[0]; data[i + 1] = melhor[1]; data[i + 2] = melhor[2];
  }
  return sharp(data, { raw: info }).png().toBuffer();
}
