// THE F4 ELITES' ART SHEETS (spec fatia F4 §5): the triaged candidates IN SCENE — the Larva on the real painting of
// chamber A and of the duct, the Tube sitting on the REAL edge (floor of chamber A, floor and ceiling of chamber B) —
// at real scale next to the ship, magnified without smoothing. The backdrops and the surface of the wall per column
// come from `_fundos-f4.mjs`.
//   node scripts/_elites/_folha-f4.mjs   → folhas/2026-10-13/elites/f4/
import fs from 'node:fs';
import sharp from 'sharp';

const D = 'docs/superpowers/folhas/2026-10-13/elites/f4';
const Z = 4;
const NAVE = 'public/sprites/ship-jato.png';
/** How deep the Tube sinks into the wall: the roots merge with the border instead of standing on it. */
const AFUNDA = 2;

const LARVAS = [
  ['A — do conceito: chifre, olho, luzes nos gomos', 'larva-31-16'],
  ['B — do conceito: as luzes fortes no dorso', 'larva-31-42'],
  ['C — o verme: olho grande, ventre de tecido', 'larvaGrub-31-20'],
  ['D — a broca: atarracada, a broca em brasa', 'larvaBroca-31-6'],
];
const TUBOS = [
  ['A — do conceito: cano blindado + tronco', 'tubo-31-20'],
  ['B — craca: boca fechada, anel com luzes', 'tuboCraca-31-2'],
  ['C — craca: coroa de dentes', 'tuboCraca-31-0'],
  ['D — craca dupla: duas bocas', 'tuboCraca-31-21'],
];

const recorte = async (id, op = {}) => {
  let s = sharp(await sharp(`${D}/cand/${id}.png`).trim().png().toBuffer());
  if (op.flip) s = s.flip();
  const buf = await s.png().toBuffer();
  const m = await sharp(buf).metadata();
  return { buf, w: m.width, h: m.height };
};
const rotulo = (txt, w, cor = '#ffb040') =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="${cor}">${txt}</text></svg>`))
    .png()
    .toBuffer();

async function painel(fundo, janela, pecas, titulo, cor) {
  const comp = pecas.map((p) => ({ input: p.buf, left: Math.round(p.x - janela.x), top: Math.round(p.y - janela.y) }));
  const cena = await sharp(fundo).extract({ left: janela.x, top: janela.y, width: janela.w, height: janela.h }).composite(comp).png().toBuffer();
  const grande = await sharp(cena).resize(janela.w * Z, janela.h * Z, { kernel: 'nearest' }).png().toBuffer();
  return { rot: await rotulo(titulo, janela.w * Z, cor), img: grande, w: janela.w * Z, h: janela.h * Z };
}

async function folha(paineis, cols, arq) {
  const PW = paineis[0].w;
  const PH = paineis[0].h + 24;
  const comp = [];
  paineis.forEach((p, k) => {
    const left = (k % cols) * (PW + 6);
    const top = Math.floor(k / cols) * (PH + 8);
    comp.push({ input: p.rot, left, top }, { input: p.img, left, top: top + 24 });
  });
  const rows = Math.ceil(paineis.length / cols);
  await sharp({ create: { width: cols * (PW + 6), height: rows * (PH + 8), channels: 4, background: '#0b0d14' } }).composite(comp).png().toFile(arq);
  console.log(arq);
}

const nave = { buf: await sharp(NAVE).png().toBuffer(), w: 44, h: 26 };
const cena = (nome) => ({
  png: `${D}/ref/${nome}.png`,
  ...JSON.parse(fs.readFileSync(`${D}/ref/${nome}.json`, 'utf8')),
});
const A = cena('fundo-camara-a'), B = cena('fundo-camara-b'), DUTO = cena('fundo-duto');
// Screen coordinates throughout; the window only crops.
const naveEm = (J, dy = 0) => ({ buf: nave.buf, x: J.x + 8, y: J.y + J.h / 2 - nave.h / 2 + dy });

// ── THE LARVA: flying, in the middle of the gap ──
{
  const meio = (c, x) => (c.teto[x] + c.chao[x]) / 2;
  const JA = { x: 170, y: Math.round(meio(A, 300)) - 38, w: 150, h: 76 };
  const JD = { x: 170, y: Math.round(meio(DUTO, 300)) - 38, w: 150, h: 76 };
  const paineis = [];
  for (const [nome, id] of LARVAS) {
    const l = await recorte(id);
    for (const [c, J, lugar] of [[A, JA, 'câmara A'], [DUTO, JD, 'duto']])
      paineis.push(
        await painel(c.png, J, [naveEm(J), { buf: l.buf, x: J.x + J.w - l.w - 14, y: J.y + J.h / 2 - l.h / 2 }],
          `LARVA ${nome} · ${lugar} (${l.w}×${l.h})`),
      );
  }
  await folha(paineis, 2, `${D}/folha-larva.png`);
}

// ── THE TUBE: rooted on the real edge — floor, and ceiling (flipped) ──
{
  const X = 262; // the Tube's centre column; the surface is flat under it in the three photos
  const paineis = [];
  for (const [nome, id] of TUBOS) {
    const chao = await recorte(id), teto = await recorte(id, { flip: true });
    const noChao = (c) => ({ buf: chao.buf, x: X - chao.w / 2, y: c.chao[X] + AFUNDA - chao.h });
    const noTeto = (c) => ({ buf: teto.buf, x: X - teto.w / 2, y: c.teto[X] - AFUNDA });
    const JA = { x: 170, y: A.chao[X] + 12 - 76, w: 150, h: 76 };
    const JB = { x: 170, y: B.chao[X] + 12 - 76, w: 150, h: 76 };
    const JT = { x: 170, y: B.teto[X] - 12, w: 150, h: 76 };
    paineis.push(
      await painel(A.png, JA, [naveEm(JA, -12), noChao(A)], `TUBO ${nome} (${chao.w}×${chao.h})`),
      await painel(B.png, JB, [naveEm(JB, -12), noChao(B)], 'câmara B · no chão'),
      await painel(B.png, JT, [naveEm(JT, 12), noTeto(B)], 'câmara B · no teto (espelhado)'),
    );
  }
  await folha(paineis, 3, `${D}/folha-tubo.png`);
}
