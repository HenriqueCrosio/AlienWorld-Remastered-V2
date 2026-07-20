// Gera um objeto no PixelLab (REST v2, create-1-direction-object) e imprime o object-id.
//
// A chave fica em `.env.pixellab` (NUNCA no repositório — o arquivo está no .gitignore).
// Depois de gerar: julgar AMPLIADO com sheet.mjs, promover com select-frames e instalar
// com install-sprite.mjs (o pipeline de sempre — ver docs/HANDOFF.md §PixelLab).
//
// uso: node scripts/gerar.mjs "<description>" <size> <view> [ref.png ...]
import { readFileSync, writeFileSync } from 'node:fs';

const [description, sizeArg, view, ...refs] = process.argv.slice(2);
if (!description || !sizeArg || !view) {
  console.error('uso: node scripts/gerar.mjs "<description>" <size> <view> [ref.png ...]');
  process.exit(1);
}

const env = readFileSync('.env.pixellab', 'utf8');
const TOKEN = env.match(/PIXELLAB_SECRET=(\S+)/)?.[1];
if (!TOKEN) throw new Error('PIXELLAB_SECRET não encontrada em .env.pixellab');

// StyleReferenceImage: objeto { type, base64 (data URL), format } — NÃO uma string solta.
// E `size` NÃO pode vir junto de style_images: a MAIOR ref define o tamanho de saída (lição 17).
const style_images = refs.map((p) => ({
  type: 'base64',
  base64: `data:image/png;base64,${readFileSync(p).toString('base64')}`,
  format: 'png',
}));

const res = await fetch('https://api.pixellab.ai/v2/create-1-direction-object', {
  method: 'POST',
  headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    description,
    ...(style_images.length ? { style_images } : { size: Number(sizeArg) }),
    view,
  }),
});

const corpo = await res.json();
if (!res.ok) throw new Error(`HTTP ${res.status} — ${JSON.stringify(corpo)}`);
// Salva a resposta inicial: se o Bash estourar o timeout, o job_id não se perde.
writeFileSync('scripts/_gen-resp.json', JSON.stringify(corpo, null, 2));

// A geração é assíncrona: pode vir um job para poll, ou o objeto direto.
let objectId = corpo.object_id ?? corpo.id ?? corpo.object?.id;
const jobId = corpo.job_id ?? corpo.background_job_id;

if (!objectId && jobId) {
  process.stdout.write('gerando');
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    process.stdout.write('.');
    const job = await (
      await fetch(`https://api.pixellab.ai/v2/background-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${TOKEN}` },
      })
    ).json();
    const status = job.status ?? job.state;
    if (status === 'completed' || status === 'succeeded' || status === 'done') {
      objectId = job.object_id ?? job.result?.object_id ?? job.result?.id ?? job.output?.object_id;
      console.log('');
      break;
    }
    if (status === 'failed' || status === 'error') {
      throw new Error(`job falhou: ${JSON.stringify(job)}`);
    }
  }
}

if (!objectId) throw new Error(`sem object_id na resposta: ${JSON.stringify(corpo).slice(0, 400)}`);
console.log(`OBJECT_ID=${objectId}`);
console.log(`próximo passo: node scripts/sheet.mjs ${objectId} scripts/_sheet-<nome>.png <índices...>`);
