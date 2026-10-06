// THE F2 ELITES' SHOTS (06/10, his note on the v4 GIF, a drawing over the sentinel: *"o estilo de tiro pode ser mais
// fiel aos canos das metralhadoras — da minigun os tiros são finos e vermelhos ou cor de tiro traçante. O tiro pesado
// também vai ter o aspecto dos outros, mas um balaço menor. E no drone mantenho a ideia dos cristais, mas pequenos"*).
// Drawn pixel by pixel (a piece ≲8px is drawn, never generated), placed IN SCENE: the real F2 background, the elite,
// and the shots leaving the right muzzles (the minigun has TWO barrels: one shot of the fan from each), magnified
// without smoothing. Each concept is also saved alone, ready to install.
//   node scripts/_elites/_folha-tiros-elites.mjs   → folhas/2026-10-06/elites/tiros/
import fs from 'node:fs';
import sharp from 'sharp';

const OUT = 'docs/superpowers/folhas/2026-10-06/elites/tiros';
fs.mkdirSync(OUT, { recursive: true });
const Z = 4;
const _ = null;
const rep = (cor, n) => Array(n).fill(cor);
/** A shot from ROWS of pixels, drawn POINTING RIGHT (the game rotates it to its heading). */
const tiro = (linhas) => ({ w: Math.max(...linhas.map((l) => l.length)), h: linhas.length, linhas });

// RED — the sentinel's own light (the shield's ramp, `_escudo.mjs`): it is not the ship's orange tracer.
const R = { aro: '4a0c0e', cauda: '7a1418', corpo: 'd62c28', quente: 'ff8870', nucleo: 'ffd6c4' };
// TRACER — the ship's own colours (`makeTracerRound`), for comparison: the same hue as the player's shot.
const T = { aro: '6e1a10', cauda: 'b2321e', corpo: 'ff7a2a', quente: 'ffd9a0', nucleo: 'fff3e0' };
// ORANGE CRYSTAL — sampled from the drone's rock (`elite-rocha.png`), plus a white glint.
const O = { esc: '5e2a12', med: '984415', corpo: 'cb601a', claro: 'ee984c', brilho: 'fcb577', lume: 'fff0d8' };

const MINIGUN = [
  { id: 'M-A', nome: 'FIO 8×1 vermelho', t: tiro([[R.aro, R.cauda, R.cauda, R.corpo, R.corpo, R.quente, R.quente, R.nucleo]]) },
  { id: 'M-B', nome: 'RISCO 11×1 vermelho', t: tiro([[...rep(R.aro, 2), ...rep(R.cauda, 3), ...rep(R.corpo, 3), R.quente, R.quente, R.nucleo]]) },
  { id: 'M-C', nome: 'BRASA 7×1 vermelho (só a ponta acesa)', t: tiro([[...rep(R.aro, 3), R.cauda, R.corpo, R.quente, R.nucleo]]) },
  { id: 'M-D', nome: 'FIO 8×1 traçante (= cor da nave)', t: tiro([[T.aro, T.cauda, T.cauda, T.corpo, T.corpo, T.quente, T.quente, T.nucleo]]) },
];
const PESADO = [
  {
    id: 'P-A',
    nome: 'BALA 9×3',
    t: tiro([
      [_, _, _, R.aro, R.cauda, R.corpo, R.corpo, R.quente, _],
      [R.aro, R.cauda, R.cauda, R.corpo, R.corpo, R.quente, R.quente, R.nucleo, R.nucleo],
      [_, _, _, R.aro, R.cauda, R.corpo, R.corpo, R.quente, _],
    ]),
  },
  {
    id: 'P-B',
    nome: 'OGIVA 7×3 (curta)',
    t: tiro([
      [_, R.aro, R.cauda, R.corpo, R.quente, R.quente, _],
      [R.aro, R.cauda, R.corpo, R.quente, R.nucleo, R.nucleo, R.quente],
      [_, R.aro, R.cauda, R.corpo, R.quente, R.quente, _],
    ]),
  },
  {
    id: 'P-C',
    nome: 'TRAÇANTE GROSSO 12×3',
    t: tiro([
      [...rep(_, 7), R.aro, R.corpo, R.quente, R.quente, _],
      [R.aro, R.aro, R.cauda, R.cauda, R.cauda, R.corpo, R.corpo, R.corpo, R.quente, R.nucleo, R.nucleo, R.nucleo],
      [...rep(_, 7), R.aro, R.corpo, R.quente, R.quente, _],
    ]),
  },
];
const CRISTAL = [
  { id: 'C-A', nome: 'LOSANGO 5×3', t: tiro([[_, _, O.claro, _, _], [O.esc, O.corpo, O.brilho, O.lume, O.claro], [_, _, O.med, _, _]]) },
  {
    id: 'C-B',
    nome: 'LASCA 6×3 (torta)',
    t: tiro([[_, _, _, O.claro, O.brilho, _], [O.esc, O.med, O.corpo, O.claro, O.lume, O.brilho], [_, O.esc, O.med, O.corpo, _, _]]),
  },
  { id: 'C-C', nome: 'GRÃO 3×3 + rastro', t: tiro([[_, _, _, O.claro, _], [O.med, O.corpo, O.claro, O.lume, O.brilho], [_, _, _, O.corpo, _]]) },
  {
    id: 'C-D',
    nome: 'GEMA 4×4',
    t: tiro([[_, O.claro, O.brilho, _], [O.corpo, O.brilho, O.lume, O.claro], [O.med, O.corpo, O.claro, O.corpo], [_, O.esc, O.med, _]]),
  },
];

const png = async (t, espelhar = false) => {
  const buf = Buffer.alloc(t.w * t.h * 4);
  t.linhas.forEach((l, y) =>
    l.forEach((hex, x) => {
      if (!hex) return;
      const k = (y * t.w + (espelhar ? t.w - 1 - x : x)) * 4;
      buf[k] = parseInt(hex.slice(0, 2), 16);
      buf[k + 1] = parseInt(hex.slice(2, 4), 16);
      buf[k + 2] = parseInt(hex.slice(4, 6), 16);
      buf[k + 3] = 255;
    }),
  );
  return sharp(buf, { raw: { width: t.w, height: t.h, channels: 4 } }).png().toBuffer();
};

// THE BACKGROUND: the real F2 (frame 0 of the sentinel v4 GIF, 2×) back to 1×; an empty stretch of the belt.
const fundo = await sharp(fs.readFileSync('docs/superpowers/folhas/2026-10-06/elites/sentinela-orbital-v4.gif'), { page: 0 })
  .resize(384, 216, { kernel: 'nearest' })
  .png()
  .toBuffer();
const JANELA = { x: 150, y: 120, w: 130, h: 56 };

// The sentinel FACING THE SHIP (mirrored, as in game). Muzzles measured on the art (63×50, facing right): the barrels
// end at x=43; the minigun bores are rows 27 and 31, the upper cannon's bore row 7 — mirrored, the tips sit at x=19.
const sent = await sharp('public/sprites/elite-sentinela.png').flop().png().toBuffer();
const SENT = { x: JANELA.w - 63 - 2, y: 3 };
const PONTA = SENT.x + 19;
const drone = await sharp('public/sprites/elite-drone-voo-0.png').png().toBuffer();
const dm = await sharp(drone).metadata();

const cena = async (comp) => {
  const c = await sharp(fundo).extract({ left: JANELA.x, top: JANELA.y, width: JANELA.w, height: JANELA.h }).composite(comp).png().toBuffer();
  return sharp(c).resize(JANELA.w * Z, JANELA.h * Z, { kernel: 'nearest' }).png().toBuffer();
};
const rotulo = (txt, cor = '#ffb040') =>
  sharp(Buffer.from(`<svg width="${JANELA.w * Z}" height="24" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="17" font-family="Consolas, monospace" font-size="15" fill="${cor}">${txt}</text></svg>`))
    .png()
    .toBuffer();

const paineis = [];
// MINIGUN: the fan of 2, one shot from each barrel, the upper one rising and the lower one falling (28° → a 1-in-4
// slope), three of each in flight.
for (const c of MINIGUN) {
  const img = await png(c.t, true);
  const comp = [{ input: sent, left: SENT.x, top: SENT.y }];
  for (const [boca, sobe] of [[27, -1], [31, 1]])
    for (const d of [6, 38, 70]) comp.push({ input: img, left: PONTA - d - c.t.w, top: SENT.y + boca + sobe * Math.round(d / 4) });
  paineis.push({ rot: `MINIGUN · ${c.id} · ${c.nome}`, img: await cena(comp) });
  await sharp(await png(c.t)).toFile(`${OUT}/${c.id}.png`);
}
// HEAVY: from the upper cannon, straight at the ship; one in flight and one leaving.
for (const c of PESADO) {
  const img = await png(c.t, true);
  const comp = [{ input: sent, left: SENT.x, top: SENT.y }];
  for (const d of [4, 50]) comp.push({ input: img, left: PONTA - d - c.t.w, top: SENT.y + 7 - Math.floor(c.t.h / 2) });
  paineis.push({ rot: `PESADO · ${c.id} · ${c.nome}`, img: await cena(comp) });
  await sharp(await png(c.t)).toFile(`${OUT}/${c.id}.png`);
}
// DRONE: one burst of 3 at the new spacing (0.3s at 110px/s ≈ 33px), heading left.
for (const c of CRISTAL) {
  const img = await png(c.t, true);
  const dx = JANELA.w - dm.width - 8;
  const dy = Math.round((JANELA.h - dm.height) / 2);
  const comp = [{ input: drone, left: dx, top: dy }];
  for (const d of [4, 37, 70]) comp.push({ input: img, left: dx - d - c.t.w, top: dy + Math.round(dm.height / 2) - Math.floor(c.t.h / 2) });
  paineis.push({ rot: `DRONE · ${c.id} · cristal ${c.nome}`, img: await cena(comp) });
  await sharp(await png(c.t)).toFile(`${OUT}/${c.id}.png`);
}

// A grid of 4 columns: minigun / heavy / crystal, one row each.
const COLS = 4;
const PW = JANELA.w * Z;
const PH = JANELA.h * Z + 24;
const linhas = [MINIGUN.length, PESADO.length, CRISTAL.length];
const comp = [];
let k = 0;
for (const [r, n] of linhas.entries())
  for (let i = 0; i < n; i++, k++) {
    comp.push({ input: await rotulo(paineis[k].rot), left: i * (PW + 6), top: r * (PH + 10) });
    comp.push({ input: paineis[k].img, left: i * (PW + 6), top: r * (PH + 10) + 24 });
  }
await sharp({ create: { width: COLS * (PW + 6), height: linhas.length * (PH + 10), channels: 4, background: '#0b0d14' } })
  .composite(comp)
  .png()
  .toFile(`${OUT}/tiros-elites.png`);
console.log(`${OUT}/tiros-elites.png`);
