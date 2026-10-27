// 25/10 (night) — HIS hangar painting, cleaned where he asked: the left ship (the jato, X-wing style) was parked with
// its turbine LIT and two thin rods sticking out of the engine ("ela está com a turbina ligada e tem umas estruturas
// finas saindo do motor, você consegue retirar isso?"). Only those pixels change (original resolution; measured on a
// colour dump of the rear — wall lum p50 ≈ 4, p90 ≈ 9):
//   - the upper rod (rows 424–426) → the wall behind it, copied from the same rows further left (plain dark wall);
//   - the lower rod (rows 437–439, x 457–475: it runs INTO the nozzle mouth) → the wall left of the nozzle, and inside
//     the nozzle the dark lower body, interpolated between the rows above and below the rod;
//   - the lit nozzle (the orange/red mouth, x 470–479, y 430–436) → unlit dark metal at 0,4× its luminance;
//   - the red glow it threw on the underside (y 441–444) → the same dark, without the red.
// And the right ship (the "a", the Terminus), 26/10 at night: the thin rod out of its engine's tail (step 4).
// Everything else is his painting, untouched. `_camadas.mjs` calls `limparNave`; alone it writes a PNG to compare:
//   node scripts/_hangar/_limpar-nave.mjs <out.png>
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export const ORIGINAL = 'assets/raw/Hangar Futurista com Caças Estacionados.png';

/** Cleans the RGB buffer (3 channels, width W) in place; returns how many pixels changed and their box. */
export function limparNave(data, W) {
  const at = (x, y) => (y * W + x) * 3;
  const lumDe = (b, i) => 0.299 * b[i] + 0.587 * b[i + 1] + 0.114 * b[i + 2];
  const satDe = (b, i) => { const mx = Math.max(b[i], b[i + 1], b[i + 2]); return mx ? (mx - Math.min(b[i], b[i + 1], b[i + 2])) / mx : 0; };
  const fonte = Buffer.from(data);
  const PAREDE = 12; // brighter than this is not wall

  let mudou = 0, bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  const marcar = (x, y) => { mudou++; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); };
  const metal = (i, f) => { const v = lumDe(fonte, i) * f; data[i] = Math.round(v * 1.05); data[i + 1] = Math.round(v * 0.97); data[i + 2] = Math.round(v * 0.92); };

  // 1. The lit nozzle mouth: the saturated warm pixels → dark metal.
  for (let y = 430; y <= 436; y++) for (let x = 470; x <= 479; x++) {
    const i = at(x, y);
    if (fonte[i] > fonte[i + 2] && satDe(fonte, i) > 0.45) { metal(i, 0.4); marcar(x, y); }
  }

  // 2. The rods → the wall (left of the nozzle), copied from `doador` px to the left on the same row; the rod + its
  // 1 px fringe inside the box.
  const HASTES = [
    { x0: 462, x1: 499, y0: 422, y1: 426, doador: -42 }, // the upper rod, over the engine top
    { x0: 452, x1: 469, y0: 436, y1: 440, doador: -40 }, // the lower rod, left of the nozzle
  ];
  for (const h of HASTES) {
    const haste = (x, y) => x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1 && lumDe(fonte, at(x, y)) > PAREDE;
    for (let y = h.y0; y <= h.y1; y++) for (let x = h.x0; x <= h.x1; x++) {
      let perto = false;
      for (let dy = -1; dy <= 1 && !perto; dy++) for (let dx = -1; dx <= 1 && !perto; dx++) perto = haste(x + dx, y + dy);
      if (!perto) continue;
      const i = at(x, y), j = at(x + h.doador, y);
      for (let c = 0; c < 3; c++) data[i + c] = fonte[j + c];
      marcar(x, y);
    }
  }
  // The lower rod inside the nozzle mouth (x 470–476, rows 437–439): the dark body between row 436 (already unlit)
  // and row 440.
  for (let x = 470; x <= 476; x++) {
    const a = at(x, 436), b = at(x, 440);
    for (let y = 437; y <= 439; y++) {
      const u = (y - 436) / 4, i = at(x, y);
      for (let c = 0; c < 3; c++) data[i + c] = Math.round(data[a + c] * (1 - u) + data[b + c] * u);
      marcar(x, y);
    }
  }

  // 3. The red glow on the underside → the same dark, without the red.
  for (let y = 441; y <= 444; y++) for (let x = 466; x <= 478; x++) {
    const i = at(x, y);
    if (fonte[i] > fonte[i + 1] * 1.5 && fonte[i] > 20) { metal(i, 1); marcar(x, y); }
  }

  // 4. 26/10 (night), he: "pode tirar a haste do motor da Terminus também". The "a" (right) has a thin rod out of the
  // engine's tail, rows 443–449, from x 1284 (the short collar at the nozzle, x 1273–1283, stays: it reads as the
  // engine's tail) to its tip at x ≈ 1327, with a dark halo around it that cuts the bay's door pillar (x 1319–1329).
  // The wall comes back from 8 rows up, same columns: the pillar and the panel lines run straight through.
  const HASTE_A = { x0: 1284, x1: 1331, y0: 443, y1: 449, doadorY: -8 };
  for (let y = HASTE_A.y0; y <= HASTE_A.y1; y++) for (let x = HASTE_A.x0; x <= HASTE_A.x1; x++) {
    const i = at(x, y), j = at(x, y + HASTE_A.doadorY);
    for (let c = 0; c < 3; c++) data[i + c] = fonte[j + c];
    marcar(x, y);
  }
  return { mudou, caixa: [bx0, by0, bx1, by1] };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [OUT = 'hangar-limpo.png'] = process.argv.slice(2);
  const { data, info } = await sharp(ORIGINAL).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const r = limparNave(data, info.width);
  await sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } }).png().toFile(OUT);
  console.log(OUT, `${r.mudou} px changed, box x${r.caixa[0]}-${r.caixa[2]} y${r.caixa[1]}-${r.caixa[3]}`);
}
