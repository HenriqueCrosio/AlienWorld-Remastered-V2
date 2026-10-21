// BLOCO G · round 3 — the concept sheet of the F1 ground pieces: each pick at its GAME size (trimmed, reduced when the
// game box is smaller — never enlarged), planted on the stage's ground over a clean in-game backdrop (`fundo.png`,
// `_ver-f1.mjs --limpo --sem-pecas`), the front ground strip redrawn ON TOP of its foot as the game does (the props sit
// at depth −0.5, behind the strip at −0.2). Plus the contact sheet of every candidate.
//   node scripts/_g/_folha-r3.mjs [dir=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada3]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [DIR = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada3'] = process.argv.slice(2);
const CRU = path.join(DIR, 'cru');
const GROUND_Y = 206, FRENTE_Y = 201, Z = 3;
// The picks (file names in cru/<piece>/) and the GAME box of each piece (the old art's frame: same box, same hitbox).
const ESCOLHAS = JSON.parse(fs.readFileSync(path.join(DIR, 'escolhas.json'), 'utf8'));
const fundo = await sharp(path.join(DIR, 'fundo.png')).ensureAlpha().png().toBuffer();
const faixa = await sharp(fundo).extract({ left: 0, top: FRENTE_Y, width: 384, height: 216 - FRENTE_Y }).png().toBuffer();

async function preparar(arq, caixa) {
  const t = await sharp(arq).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  let { width: w, height: h } = t.info;
  const k = Math.min(1, caixa.w / w, caixa.h / h);
  let buf = t.data;
  if (k < 1) {
    w = Math.max(1, Math.round(w * k));
    h = Math.max(1, Math.round(h * k));
    const raw = await sharp(buf).resize(w, h, { kernel: 'lanczos3' }).ensureAlpha().raw().toBuffer();
    for (let i = 3; i < raw.length; i += 4) raw[i] = raw[i] >= 128 ? 255 : 0;
    buf = await sharp(raw, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  }
  return { buf, w, h };
}

fs.mkdirSync(path.join(DIR, 'folhas'), { recursive: true });
for (const [peca, cfg] of Object.entries(ESCOLHAS)) {
  const itens = [];
  for (const nome of cfg.escolhas) itens.push({ nome, ...(await preparar(path.join(CRU, cfg.pasta ?? peca, nome), cfg.caixa)) });
  // Up to 4 per backdrop, spread along the ground.
  const porTela = cfg.porTela ?? 4;
  for (let tela = 0; tela * porTela < itens.length; tela++) {
    const grupo = itens.slice(tela * porTela, (tela + 1) * porTela);
    const passo = 384 / grupo.length;
    const comp = grupo.map((it, k) => ({ input: it.buf, left: Math.round(passo * (k + 0.5) - it.w / 2), top: GROUND_Y - it.h }));
    comp.push({ input: faixa, left: 0, top: FRENTE_Y });
    const img = await sharp(fundo).composite(comp).png().toBuffer();
    const saida = path.join(DIR, 'folhas', `${peca}-${tela + 1}.png`);
    await sharp(img).resize(384 * Z, 216 * Z, { kernel: 'nearest' }).toFile(saida);
    console.log(saida, grupo.map((g) => `${g.nome} ${g.w}x${g.h}`).join(' · '));
  }
}
