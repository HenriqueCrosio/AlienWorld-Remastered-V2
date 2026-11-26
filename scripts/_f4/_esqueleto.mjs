// PixelLab animate-with-skeleton-v3 by REST from LOCAL files (24/11, the Beast's new clips): the hand-posed skeletons
// are long JSON, so they go from disk, never pasted through the chat. Saves the raw job to <outDir>/job.json before
// waiting, then the frames as <outDir>/q01.png… (q00 = the first frame copied: the job doesn't echo it).
//   node scripts/_f4/_esqueleto.mjs <first.png> <first_kp.json> <rig.json> <kp.json> <outDir> "<description>" "<action>" [dog|mannequin] [seed]
// kp files: [{label|name, x, y, z_index}] (first) and [[...], ...] (frames); rig: [{name, parent, side, estimate}].
import fs from 'node:fs';
import path from 'node:path';

const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
if (!TOKEN) throw new Error('PIXELLAB_SECRET não encontrada em .env.pixellab');
const API = 'https://api.pixellab.ai/v2';
const [first, firstKp, rigF, kpF, out, description, action, template = 'mannequin', seed] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });

// (the REST wants `label` — 24/11, its own help said `name` and the API answered 422)
const ponto = (k) => ({ label: k.label ?? k.name, x: k.x, y: k.y, z_index: k.z_index ?? 0 });
const corpo = {
  first_frame: { type: 'base64', base64: fs.readFileSync(first).toString('base64'), format: 'png' },
  first_frame_keypoints: JSON.parse(fs.readFileSync(firstKp, 'utf8')).map(ponto),
  rig: JSON.parse(fs.readFileSync(rigF, 'utf8')),
  keypoints: JSON.parse(fs.readFileSync(kpF, 'utf8')).map((f) => f.map(ponto)),
  description,
  action,
  direction: 'west',
  view: 'side',
  template_id: template,
  no_background: true,
  ...(seed ? { seed: Number(seed) } : {}),
};

const r = await fetch(`${API}/animate-with-skeleton-v3`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(corpo),
});
const j = await r.json();
fs.writeFileSync(path.join(out, 'job.json'), JSON.stringify(j, null, 1));
if (!r.ok) throw new Error(`HTTP ${r.status} — ${JSON.stringify(j).slice(0, 800)}`);
const id = j.background_job_id ?? j.job_id ?? j.id;
console.log('job', id);

let fim;
for (let i = 0; i < 240; i++) {
  const s = await (await fetch(`${API}/background-jobs/${id}`, { headers: { Authorization: `Bearer ${TOKEN}` } })).json();
  if (s.status === 'completed') { fim = s; break; }
  if (s.status === 'failed') throw new Error(`job falhou: ${JSON.stringify(s).slice(0, 800)}`);
  await new Promise((res) => setTimeout(res, 5000));
}
if (!fim) throw new Error(`timeout no job ${id}`);
fs.writeFileSync(path.join(out, 'job.json'), JSON.stringify({ ...fim, last_response: { ...fim.last_response, images: '(salvas como PNG)' } }, null, 1));
const imgs = fim.last_response?.images ?? [];
fs.copyFileSync(first, path.join(out, 'q00.png'));
let n = 0;
for (const im of imgs) {
  const b64 = typeof im === 'string' ? im.replace(/^data:image\/png;base64,/, '') : im.base64;
  if (b64) fs.writeFileSync(path.join(out, `q${String(++n).padStart(2, '0')}.png`), Buffer.from(b64, 'base64'));
  else if (im.url) fs.writeFileSync(path.join(out, `q${String(++n).padStart(2, '0')}.png`), Buffer.from(await (await fetch(im.url)).arrayBuffer()));
}
console.log(`${n} quadros em ${out}`);
