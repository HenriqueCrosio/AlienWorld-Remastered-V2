import { createRequire } from 'node:module';
const sharp = createRequire('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/package.json')('sharp');
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const oklab = (r, g, b) => { r = lin(r); g = lin(g); b = lin(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s]; };
const { data, info } = await sharp('C:/Users/Henrique/Documents/Projetos folder/AlienWorld_resmater/public/sprites/serpente.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const cnt = new Map();
for (let i = 0; i < info.width * info.height; i++) if (data[i * 4 + 3] >= 128) { const k = (data[i * 4] << 16) | (data[i * 4 + 1] << 8) | data[i * 4 + 2]; cnt.set(k, (cnt.get(k) ?? 0) + 1); }
const rows = [...cnt].map(([k, n]) => { const r = k >> 16, g = (k >> 8) & 255, b = k & 255; const [L, a, bb] = oklab(r, g, b); const C = Math.hypot(a, bb); const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360; return { hex: k.toString(16).padStart(6, '0'), n, L: L.toFixed(2), C: C.toFixed(3), h: h.toFixed(0) }; });
rows.sort((p, q) => p.h - q.h);
for (const r of rows) console.log(r.hex, String(r.n).padStart(5), 'L', r.L, 'C', r.C, 'h', r.h);
