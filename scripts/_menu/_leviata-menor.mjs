// BLOCO E — the approved menu swim (PixMiniMax 92, `leviathan-swim-sheet.png`, 16 frames of 176×80) baked SMALLER for
// the menu "B" treatment: each frame reduced once (lanczos) to the width the game draws, alpha re-thresholded, the
// body darkened toward the night (he: far away) and the lava kept lit (B at 0.4 turned into a smudge because the
// tint darkened the lava too). Never scaled by the engine (a scaled swim "boils").
//   node scripts/_menu/_leviata-menor.mjs <outDir> [aro] <escala> [<escala>...]
//   (aro = the block D "arolava" finish: a cold 1 px rim on the back, the body sunk toward the night)
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [OUT, ...ARGS] = process.argv.slice(2);
const ARO_LIGADO = ARGS[0] === 'aro';
const ESCALAS = ARO_LIGADO ? ARGS.slice(1) : ARGS;
// The F1/F2 silhouette palette (`_leviata/_silhueta.mjs`): the cold rim and the night the body sinks into.
const ARO = [92, 108, 138];
const NOITE = [12, 15, 26];
const FONTE = 'public/sprites/leviathan-swim-sheet.png';
const FW = 176, FH = 80, QUADROS = 16;
// The body goes toward the night sky (the B tint of the mock, 0x4a5470); the lava keeps 90% of its light.
const CORPO = [74 / 255, 84 / 255, 112 / 255];
const LAVA = 0.9;
fs.mkdirSync(OUT, { recursive: true });

const ehLava = (r, g, b) => r > 120 && r > g * 1.3 && r > b * 1.6;

for (const e of ESCALAS.map(Number)) {
  const w = Math.round(FW * e), h = Math.round(FH * e);
  const folha = Buffer.alloc(w * QUADROS * h * 4);
  for (let q = 0; q < QUADROS; q++) {
    // Darken at FULL size (the thin lava lines are still separable there), and keep a lava map to reduce alongside:
    // after the reduction a pixel that is 30% lava would read as dull brown, so it is lifted back to the lava colour.
    const cheio = await sharp(FONTE).extract({ left: q * FW, top: 0, width: FW, height: FH }).ensureAlpha().raw().toBuffer();
    const mapa = Buffer.alloc(FW * FH * 4);
    for (let i = 0; i < FW * FH; i++) {
      const r = cheio[i * 4], g = cheio[i * 4 + 1], b = cheio[i * 4 + 2];
      const lava = cheio[i * 4 + 3] >= 128 && ehLava(r, g, b);
      const k = lava ? [LAVA, LAVA, LAVA] : CORPO;
      for (let c = 0; c < 3; c++) cheio[i * 4 + c] = Math.round(cheio[i * 4 + c] * k[c]);
      if (lava) { mapa[i * 4] = r; mapa[i * 4 + 1] = g; mapa[i * 4 + 2] = b; mapa[i * 4 + 3] = 255; }
    }
    const red = (buf) => sharp(buf, { raw: { width: FW, height: FH, channels: 4 } }).resize(w, h, { kernel: 'lanczos3' }).raw().toBuffer();
    const quadro = await red(cheio);
    const lavaRed = await red(mapa);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, o = (y * w * QUADROS + q * w + x) * 4;
      if (quadro[i + 3] < 128) continue;
      const f = lavaRed[i + 3] / 255; // share of lava under this pixel
      for (let c = 0; c < 3; c++) {
        // sharp resizes with premultiplied alpha and hands back straight colour: this IS the lava colour.
        const corLava = lavaRed[i + c];
        folha[o + c] = f >= 0.22 ? Math.round(corLava * LAVA * Math.min(1, 0.55 + f)) : quadro[i + c];
      }
      folha[o + 3] = 255;
    }
    if (!ARO_LIGADO) continue;
    // "arolava" (block D): the dark body vanished against the dark sky in the game, only the embers were left (a
    // swarm of lights, not a creature). The cold 1 px rim on the top edges gives the shape back, and the body sinks
    // further toward the night, so it is darker than the sky it crosses.
    const opaco = (x, y) => x >= 0 && y >= 0 && x < w && y < h && folha[(y * w * QUADROS + q * w + x) * 4 + 3] > 0;
    const copia = Buffer.from(folha);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const o = (y * w * QUADROS + q * w + x) * 4;
      if (!copia[o + 3]) continue;
      const lava = copia[o] > 110 && copia[o] > copia[o + 2] * 1.8;
      const c = !opaco(x, y - 1) || !opaco(x + 1, y - 1) ? ARO
        : lava ? [copia[o], copia[o + 1], copia[o + 2]]
          : [0, 1, 2].map((k) => Math.round(copia[o + k] * 0.55 + NOITE[k] * 0.45));
      folha[o] = c[0]; folha[o + 1] = c[1]; folha[o + 2] = c[2];
    }
  }
  const f = path.join(OUT, `leviata-${e}${ARO_LIGADO ? '-aro' : ''}.png`);
  await sharp(folha, { raw: { width: w * QUADROS, height: h, channels: 4 } }).png().toFile(f);
  console.log(f, `${w}x${h}`, QUADROS, 'quadros');
}
