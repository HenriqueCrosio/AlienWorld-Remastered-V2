// 23/10 — HIS CONCEPTS of the human ship (two renders of the same jet on a hangar pad: copper-orange and graphite
// with amber glow): "veja se você acha interessante esses concepts que eu fiz. Será que conseguiríamos recriar no
// pixellab?". The proven recipe (F3 elites, memory pixellab-ferramentas-testadas): /generate-image-v2 (Pro) with
// HIS concept crop as the SUBJECT (it locks the shape — here that is the point) and today's approved ship as the
// pixel STYLE (its palette, outline and detail density), at game size. The orange crop is mirrored: nose right.
//   node scripts/_naves/_gerar-conceito.mjs <laranja|preta> <outDir> <seed> [<seed> ...] [--size=WxH]
import fs from 'node:fs';
import path from 'node:path';
import { b64, gerar, tamanho } from '../_f8/_pl.mjs';

const args = process.argv.slice(2);
const [pintura, outDir, ...seeds] = args.filter((a) => !a.startsWith('--'));
const [W, H] = args.find((a) => a.startsWith('--size='))?.slice(7).split('x').map(Number) ?? [48, 32];
const C = 'docs/superpowers/folhas/2026-10-22/naves/cru/conceito';

const SIDE =
  'Seen EXACTLY from the side, like an airplane silhouette in a side-scrolling shoot-em-up: nose pointing RIGHT, ' +
  'belly at the bottom, cockpit on top, wings seen edge-on; nothing seen from above, no top-down view.';
const NAVE =
  'A sleek human jet fighter: a long sharp needle NOSE cone, a bubble cockpit canopy, a big swept-back main wing, ' +
  'two swept tail fins (a tall one and a smaller one), a round engine nozzle at the rear with a hot flame, landing ' +
  'gear RETRACTED (it is flying). Layered armor plates with panel lines.';
const PINTURAS = {
  laranja: {
    style: 'public/sprites/naves/humana-t2.png',
    hull: 'Worn copper-orange armor plates, darker rust seams, a dark tinted canopy, steel-grey nose tip.',
  },
  preta: {
    style: 'docs/superpowers/folhas/2026-10-22/naves/encolher/preta/humana-t2.png',
    hull: 'Dark graphite and gunmetal armor plates with thin lighter-grey edges, warm AMBER lights glowing on the ' +
      'belly vents and the canopy, steel-grey nose tip; amber only where there is energy.',
  },
};

const p = PINTURAS[pintura];
if (!p) throw new Error(`paint? ${Object.keys(PINTURAS).join(' | ')}`);
const assunto = path.join(C, `assunto-${pintura}.png`);
fs.mkdirSync(outDir, { recursive: true });
for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/generate-image-v2', {
    description: `${NAVE} ${p.hull} ${SIDE} Crisp pixel art, clean dark outline, transparent background, empty margin around it.`,
    image_size: { width: W, height: H },
    no_background: true,
    seed,
    reference_images: [{
      image: b64(assunto), size: await tamanho(assunto),
      usage_description: 'the subject: this exact jet fighter — its needle nose, canopy, swept wing and two tail fins',
    }],
    style_image: { image: b64(p.style), size: await tamanho(p.style) },
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${pintura}-${W}x${H}-${seed}-${String(i).padStart(2, '0')}.png`), buf));
  console.log(`${pintura} ${W}x${H} seed ${seed}: ${imgs.length}`);
}
