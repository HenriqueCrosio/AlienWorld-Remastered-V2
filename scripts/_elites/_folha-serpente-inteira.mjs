// THE WHOLE SERPENT (09/10) — step 1 of the right flow (whole creature → views → animation): the 12 Pro candidates
// (seeds 61–63, his concept sheet as subject, Pinça 49 as style), in scene on the real hull with the ship for scale.
//   node scripts/_elites/_folha-serpente-inteira.mjs   → folhas/2026-10-09/elites/folha-serpente-inteira.png
import { colar, folha, nave, painel, recorte } from './_cena-casco.mjs';
import { ler } from './_pixel-lib.mjs';

const D = 'docs/superpowers/folhas/2026-10-09/elites';
const J = { x: 92, y: 14, w: 260, h: 202 };
const paineis = [];
for (const seed of [61, 62, 63])
  for (let i = 0; i < 4; i++) {
    const s = await ler(`${D}/cand/serpenteInteira-${seed}-${i}.png`, { trim: true });
    const img = recorte(J);
    colar(img, nave, 14, 70 - nave.h / 2);
    // Over the hull on the right, the lower body sinking into the band (as when she comes out of it).
    colar(img, s, J.w - s.w - 10, 150 - J.y - s.h + 22);
    paineis.push(await painel(img, `SERPENTE ${seed}-${i} (${s.w}×${s.h})`, 2));
  }
await folha(paineis, 4, `${D}/folha-serpente-inteira.png`);
