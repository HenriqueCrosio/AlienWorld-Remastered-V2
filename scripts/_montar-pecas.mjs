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
console.log('ok:', fs.readdirSync(DESTINO).join(', '));
