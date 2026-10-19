// BLOCO D — the menu MOONLIGHT, shared by `_menu-luz.mjs` (the still) and `_menu-nado.mjs` (every swim frame).
// The new Leviathan is near-black and the menu's cold tint, veil and mist sink it, so the light of the place is baked
// in pixel: a pale steel rim on every top edge (light from above and to the right), a softer second row, the hull
// lifted. Loose specks are dropped first (they would catch the rim and read as sparks).
export const ERGUE = 1.45;
export const ARO = [132, 148, 172];
export const ARO2 = [78, 89, 110];

/** In place: drops every opaque island smaller than `min` px (8-connected). */
export function semIlhas(data, W, H, min = 8) {
  const visto = new Uint8Array(W * H);
  for (let p = 0; p < W * H; p++) {
    if (visto[p] || !data[p * 4 + 3]) continue;
    const ilha = [p];
    visto[p] = 1;
    for (let k = 0; k < ilha.length; k++) {
      const q = ilha[k], x = q % W, y = (q / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const xx = x + dx, yy = y + dy, r = yy * W + xx;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H || visto[r] || !data[r * 4 + 3]) continue;
        visto[r] = 1; ilha.push(r);
      }
    }
    if (ilha.length < min) for (const q of ilha) data[q * 4 + 3] = 0;
  }
}

/** Returns a new RGBA buffer with the moonlight baked in (alpha must already be 0/255). */
export function iluminar(data, W, H) {
  const a = (x, y) => (x < 0 || y < 0 || x >= W || y >= H ? 0 : data[(y * W + x) * 4 + 3]);
  const out = Buffer.from(data);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4;
    if (!data[i + 3]) continue;
    const lava = data[i] > 120 && data[i] > data[i + 2] * 1.8;
    const aro1 = !a(x, y - 1) || !a(x + 1, y - 1);
    const aro2 = !aro1 && (!a(x, y - 2) || !a(x + 1, y - 2));
    let c = [data[i], data[i + 1], data[i + 2]];
    if (aro1) c = ARO;
    else if (aro2) c = c.map((v, k) => Math.max(Math.round(v * ERGUE), ARO2[k]));
    else if (!lava) c = c.map((v) => Math.min(255, Math.round(v * ERGUE)));
    [out[i], out[i + 1], out[i + 2]] = c;
  }
  return out;
}
