// Gera as 4 molduras da carta (uma por raridade) e o canto do realce, a partir da arte APROVADA
// (spec 2026-09-30-mesa-compacta-arte-design.md §2.3). Reprodutível: rode de novo se a base ou a paleta mudarem.
// Uso: node scripts/gerar-molduras.mjs
import sharp from 'sharp';
import { COR_RARIDADE, RARIDADES } from '../src/raridade.ts';

const BASE = 'docs/superpowers/folhas/2026-09-30/moldura-final-base.png';
const DESTINO = 'public/sprites/cartas';

/** A ENERGIA da moldura é o azul dominante (o filete do visor e o feixe do pé). */
const ehEnergia = (r, g, b) => b > r + 35 && b > 90;

const { data, info } = await sharp(BASE).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
for (const r of RARIDADES) {
  const cor = COR_RARIDADE[r];
  const alvo = [(cor >> 16) & 255, (cor >> 8) & 255, cor & 255];
  const out = Buffer.from(data);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0 || !ehEnergia(data[i], data[i + 1], data[i + 2])) continue;
    // Troca a cor e mantém o BRILHO do pixel (o miolo do feixe continua mais aceso que a borda dele).
    const k = Math.min(1.35, data[i + 2] / 200);
    for (let c = 0; c < 3; c++) out[i + c] = Math.min(255, Math.round(alvo[c] * k));
  }
  await sharp(out, { raw: info }).png().toFile(`${DESTINO}/moldura-${r}.png`);
  console.log(`${DESTINO}/moldura-${r}.png`);
}

// O CANTO DO REALCE (8×8): um L de 2px no amarelo do foco (hotBright 0xffd447) com 1px de contorno escuro. Este é o
// canto SUPERIOR ESQUERDO; a cena usa quatro cópias espelhadas (setFlip).
const C = 8;
const AMARELO = [0xff, 0xd4, 0x47, 255];
const ESCURO = [5, 6, 13, 255];
const canto = Buffer.alloc(C * C * 4);
const noL = (x, y) => x >= 1 && y >= 1 && (x <= 2 || y <= 2);
for (let y = 0; y < C; y++) for (let x = 0; x < C; x++) {
  if (noL(x, y)) { canto.set(AMARELO, (y * C + x) * 4); continue; }
  let vizinho = false;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (noL(x + dx, y + dy)) vizinho = true;
  if (vizinho) canto.set(ESCURO, (y * C + x) * 4);
}
await sharp(canto, { raw: { width: C, height: C, channels: 4 } }).png().toFile(`${DESTINO}/realce-canto.png`);
console.log(`${DESTINO}/realce-canto.png`);
