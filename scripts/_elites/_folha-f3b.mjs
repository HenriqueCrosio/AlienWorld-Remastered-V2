// THE HUNTER, second round (07/10): he liked none of the crescents — new silhouettes from the Pro, picked out of the
// triage (`_triagem-f3.mjs`), on the real act-1 nebula next to the ship. The squid and the mantis came out facing
// LEFT already (no flop); the manta came out top-down and the wasp two-per-frame — both discarded before the sheet.
//   node scripts/_elites/_folha-f3b.mjs   → folhas/2026-10-07/elites/folha-cacador-2.png
import sharp from 'sharp';

const D = 'docs/superpowers/folhas/2026-10-07/elites';
const FUNDO = 'docs/superpowers/folhas/2026-10-06/elites/ref/fundo-nebulosa.png';
const NAVE = 'public/sprites/ship-jato.png';
const Z = 4;
const J = { x: 150, y: 70, w: 150, h: 76 };

// `tamanho`: his two picks (13 and 15) at 100 / 85 / 70% (`_tratar.mjs reduzir`) → folha-cacador-3.png
const TAMANHO = process.argv[2] === 'tamanho';
const TAMANHOS = [13, 15].flatMap((n) => [
  [`LULA ${n} · 100%`, `cacadorLula-21-${n}`],
  [`LULA ${n} · 85%`, `cacadorLula-21-${n}-085`],
  [`LULA ${n} · 70%`, `cacadorLula-21-${n}-070`],
]);

const ESCOLHIDOS = TAMANHO ? TAMANHOS : [
  ['LULA 0', 'cacadorLula-21-0'],
  ['LULA 4', 'cacadorLula-21-4'],
  ['LULA 7', 'cacadorLula-21-7'],
  ['LULA 11', 'cacadorLula-21-11'],
  ['LULA 13', 'cacadorLula-21-13'],
  ['LULA 15', 'cacadorLula-21-15'],
  ['LOUVA-A-DEUS 3', 'cacadorLouva-21-3'],
  ['LOUVA-A-DEUS 7', 'cacadorLouva-21-7'],
  ['LOUVA-A-DEUS 12', 'cacadorLouva-21-12'],
  ['LOUVA-A-DEUS 14', 'cacadorLouva-21-14'],
];

const rotulo = (txt, w) =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${txt}</text></svg>`))
    .png()
    .toBuffer();

const nave = await sharp(NAVE).png().toBuffer();
const nm = await sharp(nave).metadata();
const paineis = [];
for (const [nome, arq] of ESCOLHIDOS) {
  const b = await sharp(`${D}/cand/${arq}.png`).trim().png().toBuffer(); // trim: real size, not the 48 canvas
  const m = await sharp(b).metadata();
  const cena = await sharp(FUNDO)
    .extract({ left: J.x, top: J.y, width: J.w, height: J.h })
    .composite([
      { input: nave, left: 6, top: Math.round(J.h / 2 - nm.height / 2) },
      { input: b, left: J.w - m.width - 8, top: Math.round(J.h / 2 - m.height / 2) },
    ])
    .png()
    .toBuffer();
  paineis.push({
    rot: await rotulo(`CAÇADOR · ${nome} (${m.width}×${m.height})`, J.w * Z),
    img: await sharp(cena).resize(J.w * Z, J.h * Z, { kernel: 'nearest' }).png().toBuffer(),
  });
}

const PW = J.w * Z, PH = J.h * Z + 24, COLS = TAMANHO ? 3 : 2;
const comp = paineis.flatMap((p, k) => {
  const left = (k % COLS) * (PW + 6), top = Math.floor(k / COLS) * (PH + 8);
  return [{ input: p.rot, left, top }, { input: p.img, left, top: top + 24 }];
});
const out = `${D}/folha-cacador-${TAMANHO ? 3 : 2}.png`;
await sharp({ create: { width: COLS * (PW + 6), height: Math.ceil(paineis.length / COLS) * (PH + 8), channels: 4, background: '#0b0d14' } })
  .composite(comp)
  .png()
  .toFile(out);
console.log(out);
