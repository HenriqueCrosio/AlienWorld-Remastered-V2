// THE F3 ELITES' ART SHEETS (spec fatia F3 §5): every candidate IN SCENE — the hunter on the real act-1 nebula, the
// tentacle on the real act-2 hull — at real scale next to the ship, magnified without smoothing. Hand-drawn (MÃO) and
// PixelLab (PRO = generate-image-v2 with his concept as subject; FLASH = create_object_pro_flash) side by side.
//   node scripts/_elites/_folha-f3.mjs   → folhas/2026-10-06/elites/
import fs from 'node:fs';
import sharp from 'sharp';

const D = 'docs/superpowers/folhas/2026-10-06/elites';
const Z = 4;
const NAVE = 'public/sprites/ship-jato.png';

const img = async (arq, op = {}) => {
  let s = sharp(arq);
  if (op.flop) s = s.flop();
  if (op.rot) s = s.rotate(op.rot);
  return s.png().toBuffer();
};
const meta = async (buf) => sharp(buf).metadata();
const rotulo = (txt, w, cor = '#ffb040') =>
  sharp(Buffer.from(`<svg width="${w}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="${cor}">${txt}</text></svg>`))
    .png()
    .toBuffer();

async function painel(fundo, janela, pecas, titulo, cor) {
  const comp = [];
  for (const p of pecas) comp.push({ input: p.buf, left: Math.round(p.x), top: Math.round(p.y) });
  const cena = await sharp(fundo).extract({ left: janela.x, top: janela.y, width: janela.w, height: janela.h }).composite(comp).png().toBuffer();
  const grande = await sharp(cena).resize(janela.w * Z, janela.h * Z, { kernel: 'nearest' }).png().toBuffer();
  return { rot: await rotulo(titulo, janela.w * Z, cor), img: grande };
}

async function folha(paineis, cols, arq) {
  const m = await meta(paineis[0].img);
  const PW = m.width;
  const PH = m.height + 24;
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

const nave = await img(NAVE);
const nm = await meta(nave);

// ── THE HUNTER on the nebula ──
{
  const fundo = `${D}/ref/fundo-nebulosa.png`;
  const J = { x: 150, y: 70, w: 150, h: 76 };
  const cands = [
    ['MÃO A — lâminas longas', `${D}/mao/cacador-A.png`, {}],
    ['MÃO B — lâminas curtas', `${D}/mao/cacador-B.png`, {}],
    ['PRO 1', `${D}/cand/pro/cacador-11-1.png`, { flop: true }],
    ['PRO 3', `${D}/cand/pro/cacador-11-3.png`, { flop: true }],
    ['PRO 8', `${D}/cand/pro/cacador-11-8.png`, { flop: true }],
    ['PRO 12', `${D}/cand/pro/cacador-11-12.png`, { flop: true }],
    ['PRO 13', `${D}/cand/pro/cacador-11-13.png`, { flop: true }],
    ['FLASH (girado 90°: saiu de frente)', `${D}/cand/outros/cacador-proflash.png`, { rot: 270 }],
  ];
  const paineis = [];
  for (const [nome, arq, op] of cands) {
    const b = await img(arq, op);
    const m = await meta(b);
    paineis.push(
      await painel(fundo, J, [
        { buf: nave, x: 6, y: J.h / 2 - nm.height / 2 },
        { buf: b, x: J.w - m.width - 8, y: J.h / 2 - m.height / 2 },
      ], `CAÇADOR · ${nome} (${m.width}×${m.height})`),
    );
  }
  // The MECHANICS panel: surging (the dither), the aim line locked on the ship, the 3-needle burst on that line.
  const a = await img(`${D}/mao/cacador-A.png`);
  const am = await meta(a);
  const agulha = await img(`${D}/mao/tiro-cacador-agulha.png`, { flop: true });
  const hx = J.w - am.width - 8;
  const hy = J.h / 2 - am.height / 2;
  const boca = { x: hx + 3, y: hy + 13 };
  const alvo = { x: 6 + nm.width / 2, y: J.h / 2 - 12 };
  const linha = Buffer.alloc(J.w * J.h * 4);
  for (let i = 0; i <= 200; i++) {
    const t = i / 200;
    const x = Math.round(boca.x + (alvo.x - boca.x) * t);
    const y = Math.round(boca.y + (alvo.y - boca.y) * t);
    if (Math.floor(t * 200) % 6 >= 4) continue; // dashed
    const k = (y * J.w + x) * 4;
    [linha[k], linha[k + 1], linha[k + 2], linha[k + 3]] = [226, 48, 60, 255];
  }
  const linhaPng = await sharp(linha, { raw: { width: J.w, height: J.h, channels: 4 } }).png().toBuffer();
  const ag = [0.25, 0.32, 0.39].map((t) => ({ buf: agulha, x: boca.x + (alvo.x - boca.x) * t, y: boca.y + (alvo.y - boca.y) * t }));
  paineis.push(
    await painel(fundo, J, [
      { buf: nave, x: 6, y: J.h / 2 - nm.height / 2 - 12 },
      { buf: linhaPng, x: 0, y: 0 },
      { buf: a, x: hx, y: hy },
      ...ag,
    ], 'MECÂNICA · a mira TRAVADA (tracejada) + as 3 agulhas na linha', '#8fd0ff'),
  );
  const pass = [];
  for (const [i, p] of [1, 2, 3].entries()) {
    const d = await img(`${D}/mao/cacador-A-dissolver-${p}.png`);
    pass.push({ buf: d, x: 8 + i * 46, y: J.h / 2 - am.height / 2 });
  }
  paineis.push(await painel(fundo, J, pass, 'MECÂNICA · o DISSOLVER à mão (pontilhado em 3 passos)', '#8fd0ff'));
  await folha(paineis, 2, `${D}/folha-cacador.png`);
}

// ── THE TENTACLE on the hull ── the crest of the hull sits at y≈150 (the band 150–216).
{
  const fundo = `${D}/ref/fundo-casco.png`;
  const J = { x: 120, y: 96, w: 150, h: 76 };
  const CRISTA = 150 - J.y;
  const paineis = [];
  // HAND: the chain assembled — gomos rising from the crest, the head on top turning to the ship.
  for (const g of ['A', 'B']) {
    const gomo = await img(`${D}/mao/tentaculo-gomo-${g}.png`);
    const cab = await img(`${D}/mao/tentaculo-cabeca.png`);
    const gm = await meta(gomo);
    const pecas = [{ buf: nave, x: 6, y: 14 }];
    const bx = 92;
    for (let i = 0; i < 6; i++) pecas.push({ buf: gomo, x: bx + Math.round(Math.sin(i * 0.5) * 2), y: CRISTA - 4 - i * 6 - gm.height / 2 });
    pecas.push({ buf: cab, x: bx - 9, y: CRISTA - 4 - 6 * 6 - 14 });
    const r = await img(`${D}/mao/rachadura-2.png`);
    pecas.push({ buf: r, x: 30, y: CRISTA - 3 });
    paineis.push(await painel(fundo, J, pecas, `TENTÁCULO · MÃO (cabeça + gomo ${g}) e a rachadura`));
  }
  for (const n of [3, 4, 8, 13, 24]) {
    const b = await img(`${D}/cand/pro/tentaculoCabeca-11-${n}.png`, { flop: true });
    const m = await meta(b);
    paineis.push(await painel(fundo, J, [{ buf: nave, x: 6, y: 14 }, { buf: b, x: 90, y: CRISTA - m.height + 6 }], `TENTÁCULO · PRO ${n} (cabeça + pescoço, ${m.width}×${m.height})`));
  }
  // The PRO segments that came out usable (a red light, matching head 8's armour).
  const gs = [];
  for (const [i, n] of [10, 17, 31].entries()) gs.push({ buf: await img(`${D}/cand/pro/tentaculoGomo2-12-${n}.png`, { flop: true }), x: 40 + i * 26, y: CRISTA - 30 });
  paineis.push(await painel(fundo, J, [{ buf: nave, x: 6, y: 14 }, ...gs], 'TENTÁCULO · PRO gomos 10 / 17 / 31 (feitos da cabeça 8)'));
  // The crescent volley (hand pellets), fanning up from a head near the crest.
  const bol = await img(`${D}/mao/tiro-tentaculo-bolinha-B.png`);
  const cab = await img(`${D}/mao/tentaculo-cabeca.png`, { rot: 90 });
  const cx = 100;
  const cy = CRISTA - 18;
  const meia = [];
  for (let i = 0; i < 6; i++) {
    const a = Math.PI + (Math.PI * 0.11) + (i / 5) * (Math.PI * 0.78);
    meia.push({ buf: bol, x: cx + Math.cos(a) * 30, y: cy + Math.sin(a) * 30 });
  }
  paineis.push(await painel(fundo, J, [{ buf: nave, x: 6, y: 14 }, { buf: cab, x: cx - 11, y: cy - 6 }, ...meia], 'MECÂNICA · a MEIA-LUA de 6 (tiro à mão)', '#8fd0ff'));
  await folha(paineis, 2, `${D}/folha-tentaculo.png`);
}
