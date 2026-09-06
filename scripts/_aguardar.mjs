// Espera objetos do PixelLab saírem de "creating". uso: node scripts/_aguardar.mjs <id> [id...]
import { readFileSync } from 'node:fs';

const TOKEN = readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)[1];
const ids = process.argv.slice(2);
const pendentes = new Set(ids);

for (let i = 0; i < 180 && pendentes.size; i++) {
  await new Promise((r) => setTimeout(r, 10000));
  for (const id of [...pendentes]) {
    const r = await fetch(`https://api.pixellab.ai/v2/objects/${id}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!r.ok) continue;
    const o = await r.json();
    const st = o.status ?? o.state;
    if (st !== 'creating' && st !== 'processing' && st !== 'pending') {
      console.log(`${id}: ${st}`);
      pendentes.delete(id);
    }
  }
}

if (pendentes.size) console.log(`ainda pendentes: ${[...pendentes].join(', ')}`);
