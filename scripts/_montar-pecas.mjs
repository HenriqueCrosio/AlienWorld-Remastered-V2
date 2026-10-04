// A ARTE APROVADA DAS PEÇAS (spec 2026-10-01-catalogo-cartas-design.md §5.1b–c) → `public/sprites/cartas/pecas/`.
// Copia as peças de tamanho já aprovado e monta as TIRAS de quadros dos drones animados (PixMiniMax, 9 quadros 32×32).
// Uso, da raiz: node scripts/_montar-pecas.mjs
import fs from 'fs';
import sharp from 'sharp';

const ORIGEM = 'docs/superpowers/folhas/2026-10-01/pecas-novas';
const DESTINO = 'public/sprites/cartas/pecas';
fs.mkdirSync(DESTINO, { recursive: true });

// As peças paradas, à mão, no tamanho aprovado.
const COPIAS = {
  'missil-humano.png': 'rodada5/missil-humano-pequeno.png', // 16×5 à mão
  'missil-alien.png': 'rodada5/missil-alien-pequeno.png', // 16×5, o alien B
  'tiro-drone-humano.png': 'rodada4/tiro-humano-A.png', // 6×1, fino como "–"
  'tiro-drone-alien.png': 'rodada4/tiro-alien-A.png', // 6×1
  'estilhaco.png': 'rodada4/estilhaco-D.png', // o D, 2×3
};
for (const [destino, origem] of Object.entries(COPIAS)) fs.copyFileSync(`${ORIGEM}/${origem}`, `${DESTINO}/${destino}`);

// Os drones: os 9 quadros lado a lado (32×32 cada).
const TIRAS = {
  'drone-humano.png': 'rodada4/anim/anim-r2', // esfera #26 + a animação 622e8130
  'drone-alien.png': 'rodada4/anim/anim-agua', // água-viva #60 + a animação 2832d22a
};
for (const [destino, pasta] of Object.entries(TIRAS)) {
  const quadros = fs
    .readdirSync(`${ORIGEM}/${pasta}`)
    .filter((f) => /^\d+\.png$/.test(f))
    .sort((a, b) => parseInt(a) - parseInt(b));
  await sharp({ create: { width: 32 * quadros.length, height: 32, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(quadros.map((f, i) => ({ input: `${ORIGEM}/${pasta}/${f}`, left: i * 32, top: 0 })))
    .png()
    .toFile(`${DESTINO}/${destino}`);
  console.log(destino, quadros.length, 'quadros');
}

// As ANIMADAS no tamanho que ele escolheu (04/10, folha `folhas/2026-10-03/pecas/pecas-animadas-tamanhos.gif`).
// A redução da casa (`_reduzir.mjs`): vizinho mais próximo + alfa binário, com o recorte pela UNIÃO dos quadros —
// recortar quadro a quadro faria a peça pular. O tamanho do quadro sai no console: é o que o `BootScene` carrega.
const ANIMADAS = {
  'flare.png': ['flare-loop', 0.75], // o loop aceso da PixMiniMax (c95f2927)
  // (a faísca #17 a 50% saiu em 04/10: na comparação em jogo ele ficou com o raio em código)
  'eletrificado.png': ['rodada4/anim/anim-eletrificado', 0.75], // #29 + ea51cd0a
  'queimando.png': ['rodada4/anim/anim-queimando', 0.75], // #12 + 6a04f01c
};
for (const [destino, [pasta, f]] of Object.entries(ANIMADAS)) {
  const nomes = fs
    .readdirSync(`${ORIGEM}/${pasta}`)
    .filter((n) => /^\d+\.png$/.test(n))
    .sort((a, b) => parseInt(a) - parseInt(b));
  const brutos = await Promise.all(nomes.map((n) => sharp(`${ORIGEM}/${pasta}/${n}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
  for (const { data, info } of brutos)
    for (let y = 0; y < info.height; y++)
      for (let x = 0; x < info.width; x++)
        if (data[(y * info.width + x) * 4 + 3] > 40) [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
  const w = x1 - x0 + 1, h = y1 - y0 + 1;
  const W = Math.max(1, Math.round(w * f)), H = Math.max(1, Math.round(h * f));
  const quadros = await Promise.all(brutos.map(async ({ data, info }) => {
    const c = await sharp(data, { raw: info }).extract({ left: x0, top: y0, width: w, height: h }).resize(W, H, { kernel: 'nearest' }).raw().toBuffer({ resolveWithObject: true });
    for (let i = 3; i < c.data.length; i += 4) c.data[i] = c.data[i] > 110 ? 255 : 0;
    return sharp(c.data, { raw: c.info }).png().toBuffer();
  }));
  await sharp({ create: { width: W * quadros.length, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(quadros.map((input, i) => ({ input, left: i * W, top: 0 })))
    .png()
    .toFile(`${DESTINO}/${destino}`);
  console.log(destino, `${quadros.length} quadros de ${W}×${H}`, `(${f * 100}%)`);
}
console.log('ok:', fs.readdirSync(DESTINO).join(', '));
