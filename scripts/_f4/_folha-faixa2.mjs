// FOLHA DE CONTATO das faixas NOVAS (12/09) — a candidata no enquadramento real da câmara.
// ⚠️ Repetida 3× (384 ÷ 128), chão e teto, sobre a pintura da própria câmara: é o PIOR CASO da
// repetição, porque no jogo ela rola e vira repetição no TEMPO. Se passar aqui, passa lá.
//   node scripts/_f4/_folha-faixa2.mjs <camara> <espessura> <faixa.png> [mais.png ...]
import sharp from 'sharp';

const W = 384, H = 216, GROUND_Y = 206, TETO_Y = 10, ZOOM = 2;
const [camara, espArg, ...faixas] = process.argv.slice(2);
const ESP = Number(espArg);

const linhas = [];
for (const f of faixas) {
  const faixa = await sharp(f).png().toBuffer();
  const fm = await sharp(faixa).metadata();
  const comp = [];
  for (let i = 0; i < 3; i++) {
    // CHÃO: a superfície da faixa em GROUND_Y − espessura; a peça desce dali.
    comp.push({ input: faixa, left: i * fm.width, top: GROUND_Y - ESP });
    // TETO: a mesma peça espelhada, a base dela em TETO_Y + espessura.
    comp.push({
      input: await sharp(faixa).flip().png().toBuffer(),
      left: i * fm.width,
      top: TETO_Y + ESP - fm.height,
    });
  }
  const quadro = await sharp('public/sprites/paint-bg-f4-' + camara + '.png')
    .composite(comp).png().toBuffer();
  // As marcas das EMENDAS, onde a repetição denuncia.
  const marcas = [0, 128, 256].map((x) => ({
    input: Buffer.from(`<svg width="3" height="10"><rect width="3" height="10" fill="#f22"/></svg>`),
    left: x, top: 0,
  }));
  linhas.push({
    buf: await sharp(quadro).composite(marcas).resize(W * ZOOM, H * ZOOM, { kernel: 'nearest' }).png().toBuffer(),
    nome: f.split('/').pop(),
  });
}

const ROT = 26;
const comp = [];
for (let i = 0; i < linhas.length; i++) {
  comp.push({ input: linhas[i].buf, left: 0, top: i * (H * ZOOM + ROT) + ROT });
  comp.push({
    input: Buffer.from(
      `<svg width="${W * ZOOM}" height="${ROT}"><text x="8" y="19" font-family="monospace" font-size="17" fill="#8fe">câmara ${camara.toUpperCase()} · espessura ${ESP}px · ${linhas[i].nome}</text></svg>`,
    ),
    left: 0, top: i * (H * ZOOM + ROT),
  });
}
await sharp({ create: { width: W * ZOOM, height: linhas.length * (H * ZOOM + ROT), channels: 3, background: { r: 10, g: 12, b: 18 } } })
  .composite(comp).png().toFile('scripts/_f4/_folha-faixa2-' + camara + '.png');
console.log('✔ scripts/_f4/_folha-faixa2-' + camara + '.png');
