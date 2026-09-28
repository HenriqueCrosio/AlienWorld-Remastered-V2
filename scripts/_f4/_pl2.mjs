// PixelLab REST v2 from LOCAL files (no base64 through the chat): transfer-outfit, edit-animation, interpolation, inpaint.
//   node scripts/_f4/_pl2.mjs transfer <ref.png> <framesDir> <outDir> <seed> "<instructions>"
//   node scripts/_f4/_pl2.mjs editanim <framesDir> <outDir> <seed> "<description>"
//   node scripts/_f4/_pl2.mjs interp <start.png> <end.png> <outDir> <seed> "<action>"
//   node scripts/_f4/_pl2.mjs inpaint <image.png> <mask.png> <outDir> <seed> "<description>"
import fs from 'node:fs';
import path from 'node:path';

// Run from the repo root: the key lives in `.env.pixellab` (gitignored), like `_pl.mjs`.
const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
const API = 'https://api.pixellab.ai/v2';
const b64 = (f) => ({ type: 'base64', base64: fs.readFileSync(f).toString('base64'), format: 'png' });
const size = (f) => {
  const b = fs.readFileSync(f);
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
};
const post = async (rota, corpo) => {
  const r = await fetch(`${API}${rota}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`${rota}: HTTP ${r.status} — ${JSON.stringify(j).slice(0, 600)}`);
  return j;
};
const esperar = async (id) => {
  for (let i = 0; i < 240; i++) {
    const j = await (await fetch(`${API}/background-jobs/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
    if (j.status === 'completed') return j;
    if (j.status === 'failed') throw new Error(`job failed: ${JSON.stringify(j).slice(0, 600)}`);
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error('timeout');
};
const imagens = (no, out = []) => {
  if (!no || typeof no !== 'object') return out;
  if (Array.isArray(no)) { no.forEach((x) => imagens(x, out)); return out; }
  if (typeof no.base64 === 'string' && no.base64.length > 100) out.push(no.base64);
  for (const [k, v] of Object.entries(no)) if (k !== 'base64') imagens(v, out);
  return out;
};
const quadros = (dir) =>
  fs.readdirSync(dir).filter((f) => /^\d+\.png$/.test(f)).sort((a, b) => parseInt(a) - parseInt(b)).map((f) => path.join(dir, f));

const [cmd, ...a] = process.argv.slice(2);
let r, outDir;
if (cmd === 'transfer') {
  const [ref, fdir, out, seed, instr] = a; outDir = out;
  const fr = quadros(fdir);
  r = await post('/transfer-outfit-v2', {
    reference_image: { image: b64(ref), size: size(ref) }, frames: fr.map((f) => ({ image: b64(f), size: size(f) })),
    image_size: size(fr[0]), seed: Number(seed), no_background: true, additional_instructions: instr,
  });
} else if (cmd === 'editanim') {
  const [fdir, out, seed, desc] = a; outDir = out;
  const fr = quadros(fdir);
  r = await post('/edit-animation-v2', {
    description: desc, frames: fr.map((f) => ({ image: b64(f), size: size(f) })),
    image_size: size(fr[0]), seed: Number(seed), no_background: true,
  });
} else if (cmd === 'interp') {
  const [s0, s1, out, seed, action] = a; outDir = out;
  r = await post('/interpolation-v2', {
    start_image: { image: b64(s0), size: size(s0) }, end_image: { image: b64(s1), size: size(s1) }, action, image_size: size(s0), seed: Number(seed), no_background: true,
  });
} else if (cmd === 'inpaint') {
  const [img, mask, out, seed, desc] = a; outDir = out;
  r = await post('/inpaint-v3', {
    description: desc, inpainting_image: { image: b64(img), size: size(img) }, mask_image: { image: b64(mask), size: size(mask) }, seed: Number(seed), no_background: true, crop_to_mask: true,
  });
} else {
  console.error('usage: transfer|editanim|interp|inpaint ...'); process.exit(1);
}
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'job.json'), JSON.stringify(r, null, 2));
const direto = imagens(r);
const fim = direto.length ? r : await esperar(r.background_job_id ?? r.job_id);
const imgs = imagens(fim);
if (!imgs.length) throw new Error(`no images: ${JSON.stringify(fim).slice(0, 600)}`);
imgs.forEach((b, i) => fs.writeFileSync(path.join(outDir, `${i}.png`), Buffer.from(b.replace(/^data:image\/\w+;base64,/, ''), 'base64')));
console.log(outDir, `${imgs.length} images`, JSON.stringify(fim.usage ?? {}));
