// Espera uma animação (job v3) terminar num objeto PixelLab já completo.
// uso: node scripts/_aguardar-anim.mjs <object-id>
import { readFileSync } from 'node:fs';

const TOKEN = readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)[1];
const id = process.argv[2];
if (!id) {
  console.error('uso: node scripts/_aguardar-anim.mjs <object-id>');
  process.exit(1);
}

for (let i = 0; i < 90; i++) {
  const r = await fetch(`https://api.pixellab.ai/v2/objects/${id}`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (r.ok) {
    const o = await r.json();
    const anims = o.animations ?? [];
    if (anims.length > 0) {
      console.log(`PRONTO: ${JSON.stringify(anims.map((a) => a.id ?? a.animation_group_id ?? a))}`);
      process.exit(0);
    }
  }
  await new Promise((res) => setTimeout(res, 10000));
}
console.log('TIMEOUT: animacao ainda nao apareceu apos 15min');
