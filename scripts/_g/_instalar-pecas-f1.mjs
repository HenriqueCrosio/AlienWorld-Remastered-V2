// BLOCO G · round 6 — INSTALLS his picks of the dark structures (21/10) as the F1 props, keeping the game's boxes:
//   each pick (re-toned, `rodada6/tom/`) is trimmed and REDUCED to fit the box of its kind (the old art filled exactly
//   these boxes, so the hitbox — 0.6·width × height of the frame — keeps its scale), never enlarged, alpha binary;
//   the LIGHTS are baked into frames (`QUADROS` per piece, played as `<key>-luz`): every amber window group flickers on
//   its own sequence, the magenta pulses, the red tip of the antenna blinks — replacing `building-lights`, `base-lights`,
//   `radar-scan` and `turret-idle`; the rock and the wreck have no light (one frame);
//   the ROCK is baked at 5 heights (34–76 px, the range of the old `setScale(1, 0.55–1.25)`), from the 64-px picks for the
//   low ones and from the tall ones (`pilarAlto`) for the high ones — pixel art is never stretched;
//   the TURRET's muzzle is measured on each variant (the barrel tip: the opaque pixel farthest up-and-right).
// Writes public/sprites/f1/pecas/*.png and src/f1/pecasF1.dados.ts (the texture list BootScene loads).
//   node scripts/_g/_instalar-pecas-f1.mjs [escolhas=docs/superpowers/folhas/2026-10-20/f1-cenario/rodada6/instalar.json]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const [LISTA = 'docs/superpowers/folhas/2026-10-20/f1-cenario/rodada6/instalar.json'] = process.argv.slice(2);
const R = path.dirname(LISTA);
const TOM = path.join(R, 'tom');
const OUT = 'public/sprites/f1/pecas';
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const INST = JSON.parse(fs.readFileSync(LISTA, 'utf8'));
const QUADROS = 12;
// THE SCALE (21/10, he: "a escala de tamanho dos assets no cenário está grande. Eles podem diminuir"): every box is
// multiplied by its kind's factor (`escala` in the list, default ESCALA). The rock keeps its heights — they ARE the flap
// corridor, and shrinking them would change the difficulty (gameplay is block F).
const ESCALA = 0.75;
let semente = 2121;
const rnd = () => ((semente = (semente * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const vermelho = (r, g, b) => r > 140 && g < r * 0.35 && b < r * 0.4;
const magenta = (r, g, b) => r > 120 && b > 90 && g < r * 0.6;
const ambar = (r, g, b) => r >= 90 && r > b + 40 && r > g * 1.1;

/** Trim, then reduce to fit `w×h` (never enlarge); alpha binary. Raw RGBA + size. */
async function caber(arq, w, h) {
  const t = await sharp(arq).trim({ threshold: 1 }).png().toBuffer({ resolveWithObject: true });
  let { width: tw, height: th } = t.info;
  const k = Math.min(1, w / tw, h / th);
  let pipe = sharp(t.data);
  if (k < 1) { tw = Math.max(1, Math.round(tw * k)); th = Math.max(1, Math.round(th * k)); pipe = pipe.resize(tw, th, { kernel: 'lanczos3' }); }
  const raw = await pipe.ensureAlpha().raw().toBuffer();
  for (let i = 3; i < raw.length; i += 4) raw[i] = raw[i] >= 128 ? 255 : 0;
  return { raw, w: tw, h: th };
}

/** The light frames: a strip of QUADROS frames (or 1 when the piece has no light). */
function luzes(raw, w, h) {
  const tipo = new Uint8Array(w * h); // 1 amber, 2 magenta, 3 red
  for (let s = 0; s < w * h; s++) {
    const i = s * 4; if (raw[i + 3] === 0) continue;
    const [r, g, b] = [raw[i], raw[i + 1], raw[i + 2]];
    tipo[s] = vermelho(r, g, b) ? 3 : magenta(r, g, b) ? 2 : ambar(r, g, b) ? 1 : 0;
  }
  if (!tipo.some((t) => t)) return { tira: raw, quadros: 1 };
  // the amber windows by group (8-connected), each with its own sequence: mostly lit, a dip now and then
  const grupo = new Int32Array(w * h).fill(-1);
  const seq = [];
  for (let s = 0; s < w * h; s++) {
    if (tipo[s] !== 1 || grupo[s] >= 0) continue;
    const id = seq.length, fila = [s]; grupo[s] = id;
    while (fila.length) {
      const c = fila.pop(), x = c % w, y = (c / w) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx; if (tipo[q] === 1 && grupo[q] < 0) { grupo[q] = id; fila.push(q); }
      }
    }
    const v = Array(QUADROS).fill(1);
    if (rnd() < 0.55) { const f0 = Math.floor(rnd() * QUADROS); v[f0] = rnd() < 0.5 ? 0.45 : 0.2; v[(f0 + 1) % QUADROS] = 0.6; }
    if (rnd() < 0.15) for (let f = 0; f < QUADROS; f++) v[f] = Math.min(v[f], f < QUADROS / 2 ? 0.2 : 1); // a dead-ish one
    seq.push(v);
  }
  const fase = rnd() * Math.PI * 2;
  const tira = Buffer.alloc(w * QUADROS * h * 4);
  for (let f = 0; f < QUADROS; f++) {
    const pulso = 0.55 + 0.45 * (0.5 + 0.5 * Math.cos((2 * Math.PI * f) / QUADROS + fase));
    const pisca = f < 3 ? 1 : 0.25;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const s = y * w + x, i = s * 4, o = (y * w * QUADROS + f * w + x) * 4;
      const k = tipo[s] === 1 ? seq[grupo[s]][f] : tipo[s] === 2 ? pulso : tipo[s] === 3 ? pisca : 1;
      for (let c = 0; c < 3; c++) tira[o + c] = Math.round(raw[i + c] * k);
      tira[o + 3] = raw[i + 3];
    }
  }
  return { tira, quadros: QUADROS };
}

/** The barrel tip of a turret (unflipped art: the barrel points up and right): [x from the centre, y from the top]. */
function boca(raw, w, h) {
  let melhor = -1e9, bx = 0, by = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (raw[(y * w + x) * 4 + 3] === 0) continue;
    const v = x - 1.15 * y;
    if (v > melhor) { melhor = v; bx = x; by = y; }
  }
  return [Math.round(bx + 0.5 - w / 2), by];
}

const lista = [];
async function gravar(chave, raw, w, h, extra = {}) {
  const { tira, quadros } = extra.semLuz ? { tira: raw, quadros: 1 } : luzes(raw, w, h);
  const arquivo = `${chave}.png`;
  await sharp(tira, { raw: { width: w * quadros, height: h, channels: 4 } }).png().toFile(path.join(OUT, arquivo));
  lista.push({ chave, arquivo: `sprites/f1/pecas/${arquivo}`, fw: w, fh: h, quadros, ...(extra.boca ? { boca: extra.boca } : {}) });
}
const chaveDe = (tipo, n) => (n === 1 ? tipo : `${tipo}${n}`);

for (const [tipo, def] of Object.entries(INST)) {
  let n = 0;
  if (tipo === 'spire') {
    // the heights: every shape of a band at every height of that band (equal counts per height)
    for (const banda of def.bandas) for (const alt of banda.alturas) for (const f of banda.fontes) {
      const c = await caber(path.join(TOM, banda.pasta, f), def.larguraMax, alt);
      await gravar(chaveDe(tipo, ++n), c.raw, c.w, c.h, { semLuz: true });
    }
  } else {
    const k = def.escala ?? ESCALA;
    for (const f of def.fontes) {
      const [pasta, arq] = f.split('/');
      const c = await caber(path.join(TOM, pasta, arq), Math.round(def.caixa[0] * k), Math.round(def.caixa[1] * k));
      await gravar(chaveDe(tipo, ++n), c.raw, c.w, c.h, { semLuz: !!def.semLuz, boca: def.boca ? boca(c.raw, c.w, c.h) : null });
    }
  }
  console.log(tipo.padEnd(8), n, 'variantes', lista.filter((l) => l.chave === tipo || l.chave.match(new RegExp(`^${tipo}\\d+$`))).map((l) => `${l.fw}×${l.fh}`).join(' '));
}

const ts = `// GERADO por scripts/_g/_instalar-pecas-f1.mjs — não editar à mão (rode o script).
// As peças do chão da F1 (rodada 6 do bloco G, 21/10): a escolha dele das estruturas no escuro. Cada chave é uma
// variante (\`building\`, \`building2\`… — ver src/art.ts); \`quadros\` > 1 é uma tira com as luzes assadas, tocada como
// \`<chave>-luz\` (\`registrarPecasF1\`); \`boca\` é a ponta do cano da torre na arte não espelhada.
export interface PecaF1 {
  chave: string;
  arquivo: string;
  fw: number;
  fh: number;
  quadros: number;
  boca?: readonly [number, number];
}

export const PECAS_F1: readonly PecaF1[] = ${JSON.stringify(lista, null, 2).replace(/"boca": \[\s*(-?\d+),\s*(-?\d+)\s*\]/g, '"boca": [$1, $2]')};
`;
fs.writeFileSync('src/f1/pecasF1.dados.ts', ts);
console.log(lista.length, 'texturas →', OUT, '+ src/f1/pecasF1.dados.ts');
