// THE TOWER'S FIREBALL AGAINST THE SHIP (27/11, the rebalance, step 2). Him: "sempre me incomodou eu poder 'relar'
// parte da nave nas bolas de fogo que ela solta em leque ... não sei se são as bolas de fogo que têm o hitbox ruim ou é
// essa permissividade dos bosses".
// Pure geometry (no browser): the comet's wounding circle as the game sets it (`Boss.shoot`: radius 4.5 frame px at
// scale 1.1, centred on the FRAME centre (9, 8.5), the sprite rotated so its ball points along the flight) against
// where the solid BALL really is (frame (11.7, 10.7), measured in the PNG — `Boss.COMET_ART_ANGLE`), and the ship's 21×9
// box against its hull (2 px of forgiveness). A sweep of comet centres around the ship, five flight angles of the fan.
// The TRUTH = the hull against the ball's circle (the tail does not wound, by design). Usage: node scripts/_hitbox/_torre-cometa.mjs
import { createRequire } from 'module';

const sharp = createRequire(import.meta.url)('sharp');
const ESCALA = 1.1;
const R = 4.5 * ESCALA;
const QUADRO = { cx: 9, cy: 8.5 }; // the frame centre (18×17): the sprite's pivot
const BOLA = { x: 11.7, y: 10.7 }; // the solid ball's centre in the frame (Boss.ts comment, measured)
const ARTE = (40 * Math.PI) / 180; // COMET_ART_ANGLE
const CAIXA = { w: 21, h: 9 };
const PERDAO = 2;

async function casco(pre, n) {
  const qs = [];
  for (let i = 0; i < n; i++) {
    const { data, info } = await sharp(`${pre}-${i}.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    qs.push({ d: data, w: info.width, h: info.height });
  }
  const { w, h } = qs[0];
  let m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) m[p] = qs.every((q) => q.d[p * 4 + 3] >= 128) ? 1 : 0;
  for (let k = 0; k < PERDAO; k++) {
    const o = new Uint8Array(w * h);
    for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      o[i] = m[i] && m[i - 1] && m[i + 1] && m[i - w] && m[i + w] ? 1 : 0;
    }
    m = o;
  }
  // the hull's pixel centres, relative to the ship's centre (the frame centre)
  const pts = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (m[y * w + x]) pts.push({ x: x + 0.5 - w / 2, y: y + 0.5 - h / 2 });
  return pts;
}

const circuloNaCaixa = (cx, cy, r) => {
  const qx = Math.max(-CAIXA.w / 2, Math.min(CAIXA.w / 2, cx));
  const qy = Math.max(-CAIXA.h / 2, Math.min(CAIXA.h / 2, cy));
  return (cx - qx) ** 2 + (cy - qy) ** 2 < r * r;
};
const circuloNoCasco = (pts, cx, cy, r) => pts.some((p) => (p.x - cx) ** 2 + (p.y - cy) ** 2 < r * r);

for (const [nome, pre, n] of [['Terminus', 'public/sprites/naves/humana-anim', 8], ['X-Aelo', 'public/sprites/ship-jato-anim', 9]]) {
  const pts = await casco(pre, n);
  const t = { verdade: 0, hoje: 0, soNave: 0, soBola: 0, hojeSem: 0, hojeNao: 0, n: 0 };
  for (const voo of [140, 160, 180, 200, 220]) {
    const rot = (voo * Math.PI) / 180 - ARTE;
    // where the ball sits relative to the sprite centre, in the world (scaled, rotated)
    const dx = (BOLA.x - QUADRO.cx) * ESCALA, dy = (BOLA.y - QUADRO.cy) * ESCALA;
    const bx = dx * Math.cos(rot) - dy * Math.sin(rot), by = dx * Math.sin(rot) + dy * Math.cos(rot);
    for (let y = -24; y <= 24; y += 0.5)
      for (let x = -34; x <= 34; x += 0.5) {
        t.n++;
        // (x, y) = the sprite centre = today's circle centre; the ball at (x + bx, y + by)
        const v = circuloNoCasco(pts, x + bx, y + by, R);
        const hoje = circuloNaCaixa(x, y, R);
        if (v) t.verdade++;
        if (hoje) t.hoje++;
        if (hoje && !v) t.hojeSem++;
        if (v && !hoje) t.hojeNao++;
        if (circuloNoCasco(pts, x, y, R) !== v) t.soNave++;
        if (circuloNaCaixa(x + bx, y + by, R) !== v) t.soBola++;
      }
  }
  const pct = (k) => `${Math.round((100 * k) / t.verdade)}%`;
  console.log(`${nome}: a bola encosta no casco em ${t.verdade} posições (de ${t.n}).`);
  console.log(`  HOJE (caixa × círculo no centro do quadro): fere em ${t.hoje}; NÃO feria com a bola encostando em ${t.hojeNao} (${pct(t.hojeNao)}); feria sem encostar em ${t.hojeSem} (${pct(t.hojeSem)})`);
  console.log(`  consertando SÓ A BOLA (o círculo na bola, a caixa da nave): erra ${t.soBola} (${pct(t.soBola)})`);
  console.log(`  consertando SÓ A NAVE (o casco, o círculo no centro): erra ${t.soNave} (${pct(t.soNave)})`);
  console.log(`  a bola fica ${Math.hypot((BOLA.x - QUADRO.cx) * ESCALA, (BOLA.y - QUADRO.cy) * ESCALA).toFixed(1)} px À FRENTE do círculo que fere (raio ${R.toFixed(2)})`);
}
