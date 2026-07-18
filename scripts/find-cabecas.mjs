// Acha as CABEÇAS da serpente pela COR — no molde do find-pad.mjs (lição 13: offsets de arte
// se MEDEM no PNG, nunca se chutam). Cada cabeça tem uma assinatura de cor:
//   LARANJA (visor)  r>150 && 70<g<140 && b<80
//   CIANO   (crânio) b>180 && g>140 && r<120
//   VERDE   (centro) g>150 && r<100 && b<140
// Só as REGIÕES SUPERIORES contam (y < 60% da altura): o corpo tem escamas verdes que
// contaminariam o centroide da cabeça verde.
// Imprime o centroide de cada cor RELATIVO AO CENTRO da arte — são esses números que entram
// em BossSerpente.ts (comentados com a origem).
import sharp from 'sharp';

const ARQUIVOS = ['serpente', 'serpente-2c', 'serpente-1c', 'serpente-fusao'];

const CORES = {
  laranja: (r, g, b) => r > 150 && g > 70 && g < 140 && b < 80,
  ciano: (r, g, b) => b > 180 && g > 140 && r < 120,
  verde: (r, g, b) => g > 150 && r < 100 && b < 140,
};

for (const nome of ARQUIVOS) {
  const { data, info } = await sharp(`public/sprites/${nome}.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = info;
  const yMax = Math.floor(H * 0.6); // só a região superior — as cabeças moram lá

  console.log(`\n── ${nome}.png (${W}x${H}, centro ${(W / 2).toFixed(1)},${(H / 2).toFixed(1)}, y<${yMax}) ──`);

  // Para a FUSÃO (cabeça única com as feições das três), o centroide COMBINADO é o que vale.
  let cx = 0, cy = 0, cn = 0;

  for (const [cor, match] of Object.entries(CORES)) {
    let sx = 0, sy = 0, n = 0;
    let minX = 1e9, maxX = -1, minY = 1e9, maxY = -1;

    for (let y = 0; y < yMax; y++) {
      for (let x = 0; x < W; x++) {
        const i = (y * W + x) * 4;
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
        if (a < 60 || !match(r, g, b)) continue;
        sx += x; sy += y; n++;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }

    if (n === 0) {
      console.log(`  ${cor.padEnd(8)} ausente`);
      continue;
    }

    cx += sx; cy += sy; cn += n;
    const mx = sx / n, my = sy / n;
    console.log(
      `  ${cor.padEnd(8)} ${n}px  centroide ${mx.toFixed(1)},${my.toFixed(1)}  ` +
        `offset do centro ${(mx - W / 2).toFixed(1)},${(my - H / 2).toFixed(1)}  ` +
        `caixa x=${minX}..${maxX} y=${minY}..${maxY}`,
    );
  }

  if (cn > 0) {
    console.log(
      `  COMBINADO offset do centro ${(cx / cn - W / 2).toFixed(1)},${(cy / cn - H / 2).toFixed(1)} (${cn}px)`,
    );
  }
}
