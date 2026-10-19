// BLOCO E · round 7 — four BASES for his lettering of the title (the logo; his pick A: the title IS the logo, a sign
// that lights up). Each base comes unlit / lit, with and without the W's eyes (19/10, he: "o W tem a cabeça do alien,
// não dá pra fazer 2 olhos nele?").
//
// Built on the game's own Silkscreen letters (`_glifos.mjs`), so the spelling is exact and the W stays the alien head
// he likes. Grid: 1 font pixel = 4×4 lettering pixels; on the 1536 screen each lettering pixel is 2 px, so the word
// keeps today's title size. Pure pixel art, no smoothing — he paints over the one he picks.
//
//   node scripts/_menu/_letreiro.mjs <glifosDir> <subDir> <cenaPng> <outDir>
//     glifosDir/glifos.json  "ALIEN WORLD"          (from _glifos.mjs)
//     subDir/glifos.json     "R E M A S T E R E D"  (from _glifos.mjs)
//     cenaPng                a 1536×864 frame of the menu with no text (the composites)
//
// Writes, per base: <base>-{apagado,apagado-olhos,aceso,aceso-olhos}.png (1×, lettering pixels), the same ×2 (screen
// size), a ×8 zoom of the W, an in-scene composite, and letras.json (each letter's column span, for the light-up).
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [DIR, SUBDIR, CENA, OUT] = process.argv.slice(2);
fs.mkdirSync(OUT, { recursive: true });
const G = JSON.parse(fs.readFileSync(path.join(DIR, 'glifos.json'), 'utf8'));
const GS = JSON.parse(fs.readFileSync(path.join(SUBDIR, 'glifos.json'), 'utf8'));
const P = 4, PAD = 6;
const W = G.w * P + 2 * PAD, H = G.h * P + 2 * PAD;

const fonte = (fx, fy) => fy >= 0 && fy < G.h && fx >= 0 && fx < G.w && G.linhas[fy][fx] === '#';
const dentro = (x, y) => x >= PAD && y >= PAD && fonte(Math.floor((x - PAD) / P), Math.floor((y - PAD) / P));
// Chebyshev distance to the other side of the letter's edge (1 = touching it), up to 5.
const dist = (x, y, ladoDentro) => {
  for (let r = 1; r <= 5; r++)
    for (let dy = -r; dy <= r; dy++)
      for (let dx = -r; dx <= r; dx++)
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && dentro(x + dx, y + dy) !== ladoDentro) return r;
  return 6;
};
const D = [...Array(H)].map((_, y) => [...Array(W)].map((_, x) => dist(x, y, dentro(x, y))));
// The neon's hollows: inside a letter, past the 2-pixel tube. Only a BIG hollow stays dark (the W's face); the small
// ones (the N's steps) read as holes, so the tube fills them.
const OCO = [...Array(H)].map(() => Array(W).fill(false));
{
  const visto = [...Array(H)].map(() => Array(W).fill(false));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (visto[y][x] || !dentro(x, y) || D[y][x] < 3) continue;
      const fila = [[x, y]], comp = [];
      visto[y][x] = true;
      while (fila.length) {
        const [cx, cy] = fila.pop();
        comp.push([cx, cy]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= W || ny >= H || visto[ny][nx] || !dentro(nx, ny) || D[ny][nx] < 3) continue;
          visto[ny][nx] = true;
          fila.push([nx, ny]);
        }
      }
      if (comp.length >= 40) for (const [cx, cy] of comp) OCO[cy][cx] = true;
    }
}

// The eyes: in the W's face (font row 2, the 2nd and 4th columns), 2×2 lettering pixels, a hot pixel top-left.
const LW = G.letras.find((l) => l.ch === 'W');
const OLHOS = [[LW.x0 + 1, 2], [LW.x0 + 3, 2]].map(([fx, fy]) => [PAD + fx * P + 1, PAD + fy * P + 1]);
const ehOlho = (x, y) => OLHOS.some(([ox, oy]) => x >= ox && x < ox + 2 && y >= oy && y < oy + 2);
const pertoOlho = (x, y) => OLHOS.some(([ox, oy]) => x >= ox - 1 && x < ox + 3 && y >= oy - 1 && y < oy + 3);
const olho = (x, y, aceso) => {
  if (!aceso) return [72, 22, 20];
  return OLHOS.some(([ox, oy]) => x === ox && y === oy) ? [255, 200, 180] : [255, 58, 42];
};
const noW = (x) => x >= PAD + LW.x0 * P && x < PAD + (LW.x1 + 1) * P;
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
// The hull's windows: most blocks have one (half of the first try read as stray dots, and lit barely differed from
// unlit), on the 2nd or 3rd row of the block.
const JANELA = 0.72;
const ehJanela = (xx, yy) => {
  if (!dentro(xx, yy) || noW(xx)) return false;
  const gx = Math.floor((xx - PAD) / P), gy = Math.floor((yy - PAD) / P), lx = (xx - PAD) % P, ly = (yy - PAD) % P;
  return hash(gx, gy) < JANELA && ly === (hash(gy, gx) < 0.5 ? 1 : 2) && (lx === 1 || lx === 2);
};

// ─── The four bases. Each returns [r, g, b, a?] or null (transparent) for a lettering pixel. ────────────────────────
const BASES = {
  // A · the colony's hull: dark metal with the cold rim of the city's silhouettes, panel seams, and amber windows that
  // light up like the city's. The W has no windows: it is the face.
  casco(x, y, aceso, olhos) {
    if (!dentro(x, y)) return D[y][x] === 1 ? [6, 8, 12] : null;
    if (olhos && ehOlho(x, y)) return olho(x, y, aceso);
    const lx = (x - PAD) % P, ly = (y - PAD) % P;
    if (ehJanela(x, y)) return aceso ? (lx === 1 ? [255, 226, 160] : [255, 176, 90]) : [20, 22, 28];
    // The warm spill of a lit window on the metal around it.
    if (aceso && [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => ehJanela(x + dx, y + dy)))) return [74, 58, 50];
    if (!dentro(x, y - 1)) return [96, 112, 142];
    if (!dentro(x, y + 1)) return [14, 17, 26];
    if (!dentro(x - 1, y)) return [56, 64, 84];
    if (!dentro(x + 1, y)) return [22, 26, 36];
    if (ly === 0) return [28, 33, 45];
    return [34, 40, 54];
  },
  // B · neon: glass tubes running along each letter's outline (the W becomes the outline of a head), a white-hot core,
  // the cyan of the game; lit, they glow into the air around them.
  neon(x, y, aceso, olhos) {
    const d = D[y][x];
    if (olhos && ehOlho(x, y)) return olho(x, y, aceso);
    if (dentro(x, y)) {
      if (d === 1) return aceso ? [40, 200, 232] : [62, 72, 88];
      if (d === 2 || !OCO[y][x]) return aceso ? [214, 252, 255] : [100, 114, 134];
      if (aceso && olhos && pertoOlho(x, y)) return [255, 58, 42, 45];
      return aceso ? [20, 110, 130, d === 3 ? 110 : 60] : [10, 12, 18, 150];
    }
    if (aceso) return d === 1 ? [40, 200, 232, 120] : d === 2 ? [40, 200, 232, 64] : d === 3 ? [40, 200, 232, 28] : null;
    return d === 1 ? [6, 8, 12, 210] : null;
  },
  // C · the cut plate: a sign of dark beveled metal, bolted, the letters cut through it; lit, amber light shines through
  // the cuts and spills on their lower lips.
  placa(x, y, aceso, olhos) {
    if (olhos && ehOlho(x, y)) return olho(x, y, aceso);
    if (dentro(x, y)) {
      if (!aceso) return !dentro(x, y - 1) ? [4, 5, 8] : [8, 10, 15];
      const fy = Math.floor((y - PAD) / P);
      return fy === 0 ? [255, 214, 150] : fy === 4 ? [214, 120, 56] : [255, 170, 80];
    }
    if (dentro(x, y - 1)) return aceso ? [110, 78, 52] : [44, 50, 66];
    if (dentro(x, y + 1)) return [16, 19, 27];
    const parafuso = (y === 3 || y === H - 4) && (x === 3 || x === W - 4 || (x - 3) % 48 === 0);
    if (parafuso) return [118, 128, 148];
    if ((y === 4 || y === H - 3) && (x === 4 || x === W - 3 || (x - 4) % 48 === 0)) return [12, 14, 20];
    if (y === 0) return [86, 100, 128];
    if (y === H - 1) return [10, 12, 18];
    if (x === 0) return [60, 70, 90];
    if (x === W - 1) return [14, 16, 24];
    if (y === 1) return [56, 64, 82];
    if (y === H - 2) return [18, 21, 30];
    return [30, 35, 47];
  },
  // D · today's cyan, cut like a gem: a bright top facet, a darker bottom, a dark outline and a drop shadow. Unlit,
  // the same letter in slate.
  ciano(x, y, aceso, olhos) {
    if (!dentro(x, y)) {
      if (D[y][x] === 1) return [6, 9, 16];
      if (dentro(x - 2, y - 2)) return [4, 6, 10, 200];
      return null;
    }
    if (olhos && ehOlho(x, y)) return olho(x, y, aceso);
    if (!dentro(x, y - 1)) return aceso ? [230, 255, 255] : [100, 116, 146];
    if (!dentro(x, y - 2)) return aceso ? [190, 248, 255] : [80, 94, 120];
    if (!dentro(x, y + 1)) return aceso ? [48, 170, 200] : [34, 40, 54];
    if (!dentro(x + 1, y)) return aceso ? [96, 206, 228] : [48, 58, 76];
    return aceso ? [140, 232, 248] : [64, 76, 98];
  },
};

const pintar = (fn) => {
  const buf = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = fn(x, y);
      if (!c) continue;
      const i = (y * W + x) * 4;
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = c[3] ?? 255;
    }
  return buf;
};
const png = (buf, w, h) => sharp(buf, { raw: { width: w, height: h, channels: 4 } }).png();
const ampliar = (buf, k) => sharp(buf, { raw: { width: W, height: H, channels: 4 } }).resize(W * k, H * k, { kernel: 'nearest' }).png();

// REMASTERED as the game draws it: Silkscreen 8 px, 1 font pixel = 4 screen px, the player's cyan, a 1-pixel outline.
const subPng = async (cor) => {
  const sw = GS.w + 2, sh = GS.h + 2, buf = Buffer.alloc(sw * sh * 4);
  const f = (x, y) => y >= 0 && y < GS.h && x >= 0 && x < GS.w && GS.linhas[y][x] === '#';
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (f(x - 1, y - 1)) { [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]] = [...cor, 255]; continue; }
      const viz = [-1, 0, 1].some((dy) => [-1, 0, 1].some((dx) => f(x - 1 + dx, y - 1 + dy)));
      if (viz) [buf[i], buf[i + 1], buf[i + 2], buf[i + 3]] = [6, 9, 16, 255];
    }
  return { buf: await sharp(buf, { raw: { width: sw, height: sh, channels: 4 } }).resize(sw * 4, sh * 4, { kernel: 'nearest' }).png().toBuffer(), w: sw * 4, h: sh * 4 };
};

// Where the title block sits on the 1536 screen (round 7: game y 58 → 232; REMASTERED 13 game px below).
const CX = 768, CY = 232, SUB_DY = 52;
const sub = { aceso: await subPng([23, 166, 189]), apagado: await subPng([47, 60, 80]) };

for (const [nome, fn] of Object.entries(BASES)) {
  const vers = {};
  for (const aceso of [false, true])
    for (const olhos of [false, true]) {
      const k = `${aceso ? 'aceso' : 'apagado'}${olhos ? '-olhos' : ''}`;
      vers[k] = pintar((x, y) => fn(x, y, aceso, olhos));
      await png(vers[k], W, H).toFile(path.join(OUT, `${nome}-${k}.png`));
      await ampliar(vers[k], 2).toFile(path.join(OUT, `${nome}-${k}-x2.png`));
    }
  // The W, ×8: lit without and with the eyes, side by side.
  const wx = PAD + LW.x0 * P - 4, ww = (LW.x1 - LW.x0 + 1) * P + 8;
  const zoom = async (k) => sharp(vers[k], { raw: { width: W, height: H, channels: 4 } })
    .extract({ left: wx, top: 0, width: ww, height: H }).resize(ww * 8, H * 8, { kernel: 'nearest' }).png().toBuffer();
  const [z1, z2] = [await zoom('aceso'), await zoom('aceso-olhos')];
  await sharp({ create: { width: ww * 16 + 16, height: H * 8, channels: 4, background: { r: 13, g: 15, b: 21, alpha: 1 } } })
    .composite([{ input: z1, left: 0, top: 0 }, { input: z2, left: ww * 8 + 16, top: 0 }]).png().toFile(path.join(OUT, `${nome}-w-x8.png`));
  // In the scene: lit with the eyes, and unlit, over the menu with no text.
  for (const k of ['aceso-olhos', 'apagado']) {
    const l2 = await ampliar(vers[k], 2).toBuffer();
    const s = k === 'apagado' ? sub.apagado : sub.aceso;
    await sharp(CENA).composite([
      { input: l2, left: CX - W, top: CY - H },
      { input: s.buf, left: Math.round(CX - s.w / 2), top: Math.round(CY + SUB_DY - s.h / 2) },
    ]).png().toFile(path.join(OUT, `${nome}-cena-${k}.png`));
  }
}
// Each letter's column span in lettering pixels (boundaries halfway between letters, so the glow goes with its letter).
const letras = G.letras.map((l, i, a) => {
  const ini = i === 0 ? 0 : Math.round(PAD + ((a[i - 1].x1 + 1 + l.x0) / 2) * P);
  const fim = i === a.length - 1 ? W : Math.round(PAD + ((l.x1 + 1 + a[i + 1].x0) / 2) * P);
  return { ch: l.ch, ini, fim };
});
fs.writeFileSync(path.join(OUT, 'letras.json'), JSON.stringify({ w: W, h: H, letras, olhos: OLHOS }, null, 1));
console.log(OUT, W, H, Object.keys(BASES).join(' '));
