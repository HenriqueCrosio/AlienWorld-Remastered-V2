// Cria um ESTADO (variante editada) de um objeto PixelLab — ex: versão intacta do Leviatã.
// uso: node scripts/estado.mjs <object-id> "<edit_description>"
import { readFileSync, writeFileSync } from 'node:fs';

const [objId, edit] = process.argv.slice(2);
if (!objId || !edit) {
  console.error('uso: node scripts/estado.mjs <object-id> "<edit_description>"');
  process.exit(1);
}
const TOKEN = readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];

const res = await fetch(`https://api.pixellab.ai/v2/objects/${objId}/states`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ edit_description: edit }),
});
const corpo = await res.json();
if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(corpo)}`);
writeFileSync('scripts/_estado-resp.json', JSON.stringify(corpo, null, 2));

let objectId = corpo.object_id ?? corpo.id ?? corpo.created_object_ids?.[0];
const jobId = corpo.job_id ?? corpo.background_job_id;
if (!objectId && jobId) {
  process.stdout.write('editando');
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    process.stdout.write('.');
    const job = await (
      await fetch(`https://api.pixellab.ai/v2/background-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
    ).json();
    const status = job.status ?? job.state;
    if (['completed', 'succeeded', 'done'].includes(status)) {
      objectId = job.object_id ?? job.result?.object_id ?? job.result?.id ?? job.created_object_ids?.[0];
      console.log('');
      break;
    }
    if (['failed', 'error'].includes(status)) throw new Error(`job falhou: ${JSON.stringify(job)}`);
  }
}
console.log(`OBJECT_ID=${objectId}`);
console.log(JSON.stringify(corpo).slice(0, 300));
