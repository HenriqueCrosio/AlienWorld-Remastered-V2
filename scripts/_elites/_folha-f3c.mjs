// THE TENTACLE, second round (07/10): none of 06/10 stayed. Four new HEAD species from the Pro (moray, pincers, flower,
// lamprey) + the WHOLE worm as one column (to slice the segments from its own body), on the REAL act-2 hull next to
// the ship. Picked in the triage (`_triagem-f3.mjs ... 31`). The Pro's moray/pincer/flower came out facing RIGHT
// (flopped here); the lamprey and the whole worm came out facing left.
//   node scripts/_elites/_folha-f3c.mjs   → folhas/2026-10-07/elites/folha-tentaculo-2.png + folha-tentaculo-2-inteiro.png
import sharp from 'sharp';

const D = 'docs/superpowers/folhas/2026-10-07/elites';
const FUNDO = 'docs/superpowers/folhas/2026-10-06/elites/ref/fundo-casco.png';
const NAVE = 'public/sprites/ship-jato.png';
const Z = 3;
const CRISTA = 150;

const CABECAS = [
  ...[7, 11, 19, 31, 39, 57].map((n) => [`MOREIA ${n}`, `tentaculoMoreia-31-${n}`, true]),
  ...[0, 9, 10, 17, 49].map((n) => [`PINÇA ${n}`, `tentaculoPinca-31-${n}`, true]),
  ...[0, 1, 23].map((n) => [`FLOR ${n}`, `tentaculoFlor-31-${n}`, true]),
  ...[15, 28].map((n) => [`LAMPREIA ${n} (veio com chão)`, `tentaculoLampreia-31-${n}`, false]),
];
const INTEIROS = [0, 1, 2, 3].map((n) => [`INTEIRO ${n}`, `tentaculoInteiro-31-${n}`, false]);

const rotulo = (txt, w) =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="#ffb040">${txt}</text></svg>`))
    .png()
    .toBuffer();

const nave = await sharp(NAVE).png().toBuffer();
const nm = await sharp(nave).metadata();

async function folha(lista, J, cols, out) {
  const paineis = [];
  for (const [nome, arq, flop] of lista) {
    let s = sharp(`${D}/cand/${arq}.png`);
    if (flop) s = s.flop();
    const b = await s.trim().png().toBuffer();
    const m = await sharp(b).metadata();
    // Standing on the crest: the bottom of the piece sinks 3px into the hull (it comes OUT of it).
    const cena = await sharp(FUNDO)
      .extract({ left: J.x, top: J.y, width: J.w, height: J.h })
      .composite([
        { input: nave, left: 6, top: Math.round(J.h * 0.35 - nm.height / 2) },
        { input: b, left: Math.round(J.w * 0.62 - m.width / 2), top: Math.min(J.h - m.height, CRISTA - J.y - m.height + 3) },
      ])
      .png()
      .toBuffer();
    paineis.push({
      rot: await rotulo(`TENTÁCULO · ${nome} (${m.width}×${m.height})`, J.w * Z),
      img: await sharp(cena).resize(J.w * Z, J.h * Z, { kernel: 'nearest' }).png().toBuffer(),
    });
  }
  const PW = J.w * Z, PH = J.h * Z + 24;
  const comp = paineis.flatMap((p, k) => {
    const left = (k % cols) * (PW + 6), top = Math.floor(k / cols) * (PH + 8);
    return [{ input: p.rot, left, top }, { input: p.img, left, top: top + 24 }];
  });
  await sharp({ create: { width: cols * (PW + 6), height: Math.ceil(paineis.length / cols) * (PH + 8), channels: 4, background: '#0b0d14' } })
    .composite(comp)
    .png()
    .toFile(out);
  console.log(out);
}

await folha(CABECAS, { x: 120, y: 80, w: 150, h: 96 }, 4, `${D}/folha-tentaculo-2.png`);
await folha(INTEIROS, { x: 120, y: 40, w: 150, h: 136 }, 4, `${D}/folha-tentaculo-2-inteiro.png`);
