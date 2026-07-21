// Dispara uma animação v3 (1 geração) num objeto PixelLab e aguarda o job.
// NUNCA passar `directions` em objeto de 1 direção (dá 400).
// uso: node scripts/animar.mjs <object-id> "<animation_description>" <frame_count>
import { readFileSync, writeFileSync } from 'node:fs';

const [objId, desc, frames] = process.argv.slice(2);
if (!objId || !desc || !frames) {
  console.error('uso: node scripts/animar.mjs <object-id> "<animation_description>" <frame_count>');
  process.exit(1);
}
const TOKEN = readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];

const res = await fetch(`https://api.pixellab.ai/v2/objects/${objId}/animations`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mode: 'v3',
    animation_description: desc,
    frame_count: Number(frames),
    keep_first_frame: true,
  }),
});
const corpo = await res.json();
if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(corpo)}`);
writeFileSync('scripts/_anim-resp.json', JSON.stringify(corpo, null, 2));

let animId = corpo.animation_id ?? corpo.id ?? corpo.animation?.id;
const jobId = corpo.job_id ?? corpo.background_job_id;
if (jobId) {
  process.stdout.write('animando');
  for (let i = 0; i < 180; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    process.stdout.write('.');
    const job = await (
      await fetch(`https://api.pixellab.ai/v2/background-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
    ).json();
    const status = job.status ?? job.state;
    if (['completed', 'succeeded', 'done'].includes(status)) {
      animId = animId ?? job.animation_id ?? job.result?.animation_id ?? job.result?.id;
      console.log('');
      break;
    }
    if (['failed', 'error'].includes(status)) throw new Error(`job falhou: ${JSON.stringify(job)}`);
  }
}
console.log(`ANIMATION_ID=${animId}`);
console.log(JSON.stringify(corpo).slice(0, 300));
