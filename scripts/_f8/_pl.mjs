// O CLIENTE DO PIXELLAB DA FATIA 8 (REST v2). A chave fica em `.env.pixellab` (gitignored).
// `gerar` posta, espera o job e devolve os PNGs (Buffer[]) — quadro a quadro, na ordem.
import fs from 'node:fs';
import sharp from 'sharp';

const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
if (!TOKEN) throw new Error('PIXELLAB_SECRET não encontrada em .env.pixellab');
const API = 'https://api.pixellab.ai/v2';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

export const b64 = (arq) => ({
  type: 'base64',
  base64: `data:image/png;base64,${(Buffer.isBuffer(arq) ? arq : fs.readFileSync(arq)).toString('base64')}`,
  format: 'png',
});
export const tamanho = async (arq) => {
  const m = await sharp(arq).metadata();
  return { width: m.width, height: m.height };
};

export async function gerar(endpoint, body) {
  const r = await fetch(API + endpoint, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${endpoint} HTTP ${r.status} — ${JSON.stringify(j).slice(0, 400)}`);
  const id = j.background_job_id ?? j.job_id ?? j.id;
  fs.writeFileSync('scripts/_f8/_ultimo-job.txt', `${endpoint} ${id}\n`); // o job não se perde num timeout
  process.stdout.write(`${endpoint} ${id} `);
  for (let i = 0; i < 240; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const job = await (await fetch(`${API}/background-jobs/${id}`, { headers: H })).json();
    if (job.status === 'completed') {
      const lr = job.last_response ?? {};
      const imgs = lr.images ?? (lr.image ? [lr.image] : []);
      console.log(`✔ ${imgs.length} imagem(ns), ${job.usage?.generations ?? '?'} gerações`);
      return imgs.map((im) => Buffer.from(String(im.base64).replace(/^data:[^,]+,/, ''), 'base64'));
    }
    if (job.status === 'failed') throw new Error(`job ${id} falhou: ${JSON.stringify(job).slice(0, 400)}`);
    process.stdout.write('.');
  }
  throw new Error(`job ${id}: tempo esgotado (ele segue rodando no PixelLab — ver _ultimo-job.txt)`);
}
