// 14/10 — THE HOLE WITH LAVA CRACKS, before × after: the 9 frames (open 0–4, scar 5–8) magnified, and the open hole
// IN SCENE on chamber A's floor border and on the duct's ceiling wall (the 13/10 photos), at real scale ×4.
//   node scripts/_elites/_folha-buraco-lava.mjs   → folhas/2026-10-14/f4/folha-buraco-lava.png
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import sharp from 'sharp';

const REF = 'docs/superpowers/folhas/2026-10-13/elites/f4/ref';
const OUT = 'docs/superpowers/folhas/2026-10-14/f4/folha-buraco-lava.png';
const Z = 4, ZQ = 6;
const depois = Array.from({ length: 9 }, (_, i) => fs.readFileSync(`public/sprites/elite-buraco-${i}.png`));
// BEFORE = the committed frames (HEAD).
const antes = depois.map((_, i) => execSync(`git show HEAD:public/sprites/elite-buraco-${i}.png`, { maxBuffer: 1 << 20 }));
const rotulo = (txt, w) =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${txt}</text></svg>`)).png().toBuffer();
const cena = (nome) => ({ png: `${REF}/${nome}.png`, ...JSON.parse(fs.readFileSync(`${REF}/${nome}.json`, 'utf8')) });
const A = cena('fundo-camara-a'), DUTO = cena('fundo-duto');

async function emCena(c, quadro, teto) {
  const X = 300, sup = teto ? c.teto[X] : c.chao[X];
  const y = teto ? sup - 14 : sup + 14;
  const J = { x: X - 60, y: Math.max(0, Math.min(216 - 70, y - 35)), w: 120, h: 70 };
  const img = await sharp(c.png).extract({ left: J.x, top: J.y, width: J.w, height: J.h })
    .composite([{ input: quadro, left: X - 16 - J.x, top: y - 14 - J.y }]).png().toBuffer();
  return sharp(img).resize(J.w * Z, J.h * Z, { kernel: 'nearest' }).png().toBuffer();
}

const W = 2 * 120 * Z + 12, comp = [];
let y = 0;
for (const [nome, q] of [['ANTES (13/10)', antes], ['DEPOIS — rachaduras de lava', depois]]) {
  comp.push({ input: await rotulo(`${nome} · os 9 quadros (abre 0–4, cicatriz 5–8)`, W), left: 0, top: y });
  y += 26;
  for (const [i, b] of q.entries()) comp.push({ input: await sharp(b).resize(32 * ZQ, 28 * ZQ, { kernel: 'nearest' }).png().toBuffer(), left: i * (32 * ZQ + 4) % (W - 32 * ZQ), top: y + Math.floor((i * (32 * ZQ + 4)) / (W - 32 * ZQ)) * (28 * ZQ + 4) });
  y += 2 * (28 * ZQ + 4) + 6;
  comp.push({ input: await rotulo(`${nome} · câmara A (borda do chão) | duto (parede do teto) — escala real ×${Z}`, W), left: 0, top: y });
  y += 26;
  comp.push({ input: await emCena(A, q[4], false), left: 0, top: y }, { input: await emCena(DUTO, q[4], true), left: 120 * Z + 12, top: y });
  y += 70 * Z + 14;
}
await sharp({ create: { width: W, height: y, channels: 4, background: '#14161e' } }).composite(comp).png().toFile(OUT);
console.log(OUT);
