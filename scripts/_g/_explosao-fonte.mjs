// BLOCO G · the Leviathan crash explosion of the final cutscene (`f8-explosao-sheet.png`, 48 frames of 384×216) as the
// SOURCE of the game's explosions (the F1 boss: takeoff, chain, death).
//
// ⚠️ THE WALL. In the cutscene the cloud runs past the screen's right edge: frames 10–42 touch x = 383 (up to 65 rows).
// Cut there, every bake of it ended in a straight vertical WALL — and the game flips the explosion half the time, so the
// wall showed on the left too (he, 20/10: "a fumaça esbarra numa parede e isso faz com que o efeito seja cortado"). Here
// the cloud DISSOLVES towards that side before the edge: the alpha fades over the last `FADE` px, broken by value noise
// (two octaves) so it thins out like smoke, not like a gradient. The same mask on every frame, but it only COMES IN over
// frames 7–10 (the cloud reaches the edge at 10): the fireball of the first frames (x 230–289, centred at ~260) is never
// touched. The crop box is taken AFTER the fade; `centro` is where the fireball is born (frame 0's centre) as a fraction
// of the box, so the game anchors the explosion on it and not on the box's middle.
import sharp from 'sharp';

export const FONTE = { src: 'public/sprites/f8-explosao-sheet.png', fw: 384, fh: 216, cols: 6, quadros: 48 };
const FADE = 70;
const ENTRA = { de: 6, ate: 10 };

let semente = 3131;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function ruido(passo) {
  const gw = Math.ceil(FONTE.fw / passo) + 2, gh = Math.ceil(FONTE.fh / passo) + 2;
  const g = Array.from({ length: gw * gh }, rnd);
  return (x, y) => {
    const gx = x / passo, gy = y / passo, x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const v = (i, j) => g[(y0 + j) * gw + x0 + i];
    return (v(0, 0) * (1 - sx) + v(1, 0) * sx) * (1 - sy) + (v(0, 1) * (1 - sx) + v(1, 1) * sx) * sy;
  };
}

/** The sheet with the dissolve applied, and the crop box (frame coords) of the faded cloud over all frames. */
export async function fonteDaExplosao() {
  const { data, info } = await sharp(FONTE.src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width;
  const n1 = ruido(22), n2 = ruido(8);
  const mascara = new Float32Array(FONTE.fw * FONTE.fh);
  for (let y = 0; y < FONTE.fh; y++) for (let x = 0; x < FONTE.fw; x++) {
    const d = (FONTE.fw - 1 - x) / FADE; // 0 at the cut edge, 1 FADE px inside
    let m = d + (0.65 * n1(x, y) + 0.35 * n2(x, y) - 0.5) * 1.1;
    m = Math.max(0, Math.min(1, m));
    mascara[y * FONTE.fw + x] = m * m * (3 - 2 * m);
  }
  let bx0 = 1e9, by0 = 1e9, bx1 = -1, by1 = -1;
  let cx0 = 1e9, cy0 = 1e9, cx1 = -1, cy1 = -1; // frame 0: the fireball
  for (let f = 0; f < FONTE.quadros; f++) {
    const ox = (f % FONTE.cols) * FONTE.fw, oy = Math.floor(f / FONTE.cols) * FONTE.fh;
    const u = Math.max(0, Math.min(1, (f - ENTRA.de) / (ENTRA.ate - ENTRA.de)));
    const forca = u * u * (3 - 2 * u);
    for (let y = 0; y < FONTE.fh; y++) for (let x = 0; x < FONTE.fw; x++) {
      const i = ((oy + y) * W + ox + x) * 4 + 3;
      data[i] = Math.round(data[i] * (1 - forca * (1 - mascara[y * FONTE.fw + x])));
      if (data[i] > 40) {
        bx0 = Math.min(bx0, x); by0 = Math.min(by0, y); bx1 = Math.max(bx1, x); by1 = Math.max(by1, y);
        if (f === 0) { cx0 = Math.min(cx0, x); cy0 = Math.min(cy0, y); cx1 = Math.max(cx1, x); cy1 = Math.max(cy1, y); }
      }
    }
  }
  const centro = { x: ((cx0 + cx1) / 2 - bx0) / (bx1 - bx0 + 1), y: ((cy0 + cy1) / 2 - by0) / (by1 - by0 + 1) };
  return { data, w: W, h: info.height, caixa: { bx0, by0, bx1, by1 }, centro };
}

/** One frame of the faded sheet, cropped to the box and reduced to `ew × eh` (raw RGBA). */
export async function quadroReduzido(fonte, f, ew, eh) {
  const { caixa: c } = fonte;
  const ox = (f % FONTE.cols) * FONTE.fw, oy = Math.floor(f / FONTE.cols) * FONTE.fh;
  return sharp(fonte.data, { raw: { width: fonte.w, height: fonte.h, channels: 4 } })
    .extract({ left: ox + c.bx0, top: oy + c.by0, width: c.bx1 - c.bx0 + 1, height: c.by1 - c.by0 + 1 })
    .resize(ew, eh, { kernel: 'lanczos3' })
    .raw()
    .toBuffer();
}
