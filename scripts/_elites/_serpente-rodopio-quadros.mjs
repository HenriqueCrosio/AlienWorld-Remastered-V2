// THE RIGHT FLOW, step 3 (09/10): the WHOLE serpent (Pro 63-3, his pick) animated in FRAMES by PixMiniMax — like the
// dolphin's roll. Two outputs:
//   1. the three roll takes side by side at the dolphin's speed (12 fps), magnified;
//   2. take A in scene: ONE animated sprite carried along the parabola he approved (behind the hull → around the
//      ship → down IN FRONT of the hull), the code only moves it (path, depth scale, the brake at the top while it
//      spins — the dolphin's GIRO_FREIO), the body motion is the drawn frames. His 3 groups of 3 spines ride along.
//   node scripts/_elites/_serpente-rodopio-quadros.mjs   → folhas/2026-10-09/elites/
import fs from 'node:fs';
import sharp from 'sharp';
import { ampliar, colar, girar, ler, novo } from './_pixel-lib.mjs';
import { CRISTA, P, mapa, nave, px, recorte } from './_cena-casco.mjs';

const D = 'docs/superpowers/folhas/2026-10-09/elites';
const V = `${D}/vistas`;
const quadros = async (dir) => {
  const n = fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).length;
  return Promise.all([...Array(n).keys()].map((i) => ler(`${dir}/${i}.png`)));
};
const CLIPES = { A: await quadros(`${V}/rodopio-a`), B: await quadros(`${V}/rodopio-b`), C: await quadros(`${V}/rodopio-c`) };
// 09/10 (2): the free rolls were rejected (*"mudanças bruscas de posição, parecem espelhados"* — ~49% of the drawing
// changed every frame). The GIRO pinned on the real views (side → front → back → side, `vistas/giro-completo`, max 26%
// per frame) is the one in scene now. `--clipe <dir>` picks another.
const ci = process.argv.indexOf('--clipe');
const CLIPE_CENA = await quadros(ci > 0 ? process.argv[ci + 1] : `${V}/giro-completo`);
const SAIDA = ci > 0 ? 'serpente-rodopio-quadros-demo.gif' : 'serpente-giro-demo.gif';

// ── 1. the three takes side by side, 12 fps (one loop = 17 frames ≈ 1.4s, the dolphin's roll) ──
{
  const W = 160, Z = 2, LH = 22;
  const rot = await Promise.all(['A', 'B', 'C'].map((k) => sharp(Buffer.from(`<svg width="${W * Z}" height="${LH}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#0b0d14"/><text x="6" y="16" font-family="Consolas" font-size="15" fill="#ffb040">RODOPIO ${k}</text></svg>`)).png().toBuffer()));
  const out = [];
  for (let i = 0; i < 17 * 2; i++) {
    const comp = [];
    for (const [k, nome] of ['A', 'B', 'C'].entries()) {
      const q = CLIPES[nome][i % CLIPES[nome].length];
      comp.push({ input: rot[k], left: k * W * Z, top: 0 }, { input: await ampliar(q, Z), left: k * W * Z, top: LH });
    }
    out.push(await sharp({ create: { width: 3 * W * Z, height: W * Z + LH, channels: 4, background: '#3a4660' } }).composite(comp).png().toBuffer());
  }
  await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(Math.round(1000 / 12)), loop: 0 }).toFile(`${D}/serpente-rodopios-lado-a-lado.gif`);
  console.log(`${D}/serpente-rodopios-lado-a-lado.gif`);
}

// ── 2. take A in scene, on the approved parabola ──
{
  const FPS = 20, J = { x: 92, y: 14, w: 260, h: 202 }, cr = CRISTA - J.y;
  const NAVE = { x: 92, y: 98 };
  // The approved path (window px) with depth z: from behind the hull on the right, around the ship, down in front.
  const PONTOS = [[226, 270, -1], [220, 170, -0.8], [212, 120, -0.4], [196, 80, -0.1], [168, 50, 0.1], [128, 40, 0.3], [88, 52, 0.55], [58, 84, 0.8], [46, 128, 1], [52, 178, 1], [62, 280, 1]];
  const cr3 = (p0, p1, p2, p3, u) => 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3);
  const curva = [];
  for (let i = 0; i < PONTOS.length - 1; i++) {
    const [a, b, c, d] = [PONTOS[Math.max(0, i - 1)], PONTOS[i], PONTOS[i + 1], PONTOS[Math.min(PONTOS.length - 1, i + 2)]];
    for (let k = 0; k < 60; k++) curva.push([0, 1, 2].map((j) => cr3(a[j], b[j], c[j], d[j], k / 60)));
  }
  curva.push(PONTOS.at(-1));
  const S = [0];
  for (let i = 1; i < curva.length; i++) S.push(S[i - 1] + Math.hypot(curva[i][0] - curva[i - 1][0], curva[i][1] - curva[i - 1][1]));
  const noS = (s) => {
    s = Math.max(0, Math.min(S.at(-1), s));
    const k = S.findIndex((x) => x >= s);
    return { x: curva[k][0], y: curva[k][1], z: curva[k][2] };
  };
  // Speed: out of the hull fast; the BRAKE over the ship while she spins (the dolphin brakes to 35% in its roll);
  // fast again down at the camera.
  const S_GIRO = [S[3 * 60], S[7 * 60]];
  // The brake lasts EXACTLY the turn (its frames at 12 fps): she spins once over the ship and goes on.
  const VEL_GIRO = (S_GIRO[1] - S_GIRO[0]) / (CLIPE_CENA.length / 12);
  const vel = (s) => (s < S_GIRO[0] ? 170 : s < S_GIRO[1] ? VEL_GIRO : 170);
  const posS = [0];
  const dt = 1 / 240;
  for (let t = dt; t < 8; t += dt) posS.push(posS.at(-1) + vel(posS.at(-1)) * dt);
  const sEm = (t) => posS[Math.min(posS.length - 1, Math.max(0, Math.round(t / dt)))];
  const T0 = 0.4;
  const tGiro0 = posS.findIndex((s) => s >= S_GIRO[0]) * dt + T0;
  // The frames: idle = frame 0 (the side pose) until the brake; the roll plays ONCE at 12 fps while braked.
  const clipe = CLIPE_CENA;
  const quadroEm = (t) => (t < tGiro0 ? 0 : Math.min(clipe.length - 1, Math.floor((t - tGiro0) * 12)));
  // His spines: 3 groups of 3, straight at the ship, released while she rises through the ship's heights.
  const AGULHA = mapa(['.......OOO.', 'OFRMMhhsssO', '.OOOOOOOO..']);
  const esp = [];
  {
    const alvos = [NAVE.y + 30, NAVE.y, NAVE.y - 30];
    let yAnt = null;
    for (let t = T0; t < 6 && alvos.length; t += dt) {
      const q = noS(sEm(t - T0));
      if (yAnt !== null && yAnt > alvos[0] && q.y <= alvos[0]) {
        const yc = alvos.shift();
        for (const d of [-6, 0, 6]) esp.push({ t0: t, x: q.x - 30, y: yc + d });
      }
      yAnt = q.y;
    }
  }
  const out = [];
  for (let f = 0; f < Math.round(6.5 * FPS); f++) {
    const t = f / FPS;
    const img = recorte(J);
    const ny = NAVE.y + (NAVE.y - 15 - NAVE.y) * Math.min(1, Math.max(0, (t - 1.2) / 0.35));
    const q = t >= T0 ? noS(sEm(t - T0)) : null;
    const desenharSerpente = () => {
      if (!q) return;
      const prof = 0.75 + 0.35 * (q.z + 1) / 2; // far smaller, near bigger
      const k = 0.7 + 0.3 * (q.z + 1) / 2;
      const src = clipe[quadroEm(t)];
      const W = Math.round(src.w * prof), H = Math.round(src.h * prof);
      const esc = novo(W, H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const sx = Math.floor((x / W) * src.w), sy = Math.floor((y / H) * src.h);
          const kk = (sy * src.w + sx) * 4, o = (y * W + x) * 4;
          esc.d[o] = Math.round(src.d[kk] * k);
          esc.d[o + 1] = Math.round(src.d[kk + 1] * k);
          esc.d[o + 2] = Math.round(src.d[kk + 2] * k);
          esc.d[o + 3] = src.d[kk + 3];
        }
      if (q.z < 0) {
        // Behind the hull: only above the crest.
        const tmp = novo(img.w, img.h);
        colar(tmp, esc, q.x - W / 2, q.y - H / 2);
        for (let y = 0; y < Math.min(cr, img.h); y++)
          for (let x = 0; x < img.w; x++) {
            const kk = (y * img.w + x) * 4;
            if (tmp.d[kk + 3]) px(img, x, y, [tmp.d[kk], tmp.d[kk + 1], tmp.d[kk + 2]], tmp.d[kk + 3] / 255);
          }
      } else colar(img, esc, q.x - W / 2, q.y - H / 2);
    };
    if (!q || q.z < 0.3) desenharSerpente();
    colar(img, nave, NAVE.x - nave.w / 2, ny - nave.h / 2);
    for (const e of esp) {
      const x = e.x - 55 * (t - e.t0);
      if (t < e.t0 || x < -12) continue;
      const g = girar(AGULHA, Math.PI);
      colar(img, g, x - g.w / 2, e.y - g.h / 2);
    }
    if (q && q.z >= 0.3) desenharSerpente();
    out.push(await ampliar(img, 3));
  }
  await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(1000 / FPS), loop: 0 }).toFile(`${D}/${SAIDA}`);
  console.log(`${D}/${SAIDA}`, out.length);
}

// ── 3. the pinned turn alone, at 12 fps, magnified ──
{
  const out = [];
  for (let i = 0; i < CLIPE_CENA.length * 2; i++) out.push(await ampliar(CLIPE_CENA[i % CLIPE_CENA.length], 2));
  await sharp(out, { join: { animated: true } }).gif({ delay: Array(out.length).fill(Math.round(1000 / 12)), loop: 0 }).toFile(`${D}/serpente-giro-sozinho.gif`);
  console.log(`${D}/serpente-giro-sozinho.gif`);
}
void P;
