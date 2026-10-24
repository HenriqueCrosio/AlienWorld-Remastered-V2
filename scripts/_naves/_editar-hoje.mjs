// 23/10 — THE NEW HUMAN SHIPS, round 1c: he rejected the gothic ladder (1b): "a nave humana atual tem mais detalhes,
// essa nave gótica fica muito aquém do que eu imaginava". Measured: today's T3 has ~440 drawn px in big 3-tone planes
// (glass, nose highlight, wide wings); the gothic T3 ~280, thin, flat inside. So this route STARTS FROM TODAY'S SHIPS
// (their mass, detail and tier evolution) and edits all four at once — /edit-images-v2 edits several images
// consistently, so the family stays a family:
//   texto — edit_with_text: the gothic dark-sci-fi warship in words;
//   ref   — edit_with_reference: his own dark sci-fi piece (the belt gunship: graphite plates, lit edges, red vents)
//           as the style to match.
// Today's sprites are 44×26 (the T0 52×26): all are centred on a 52×32 canvas (the endpoint's minimum is 32).
//   node scripts/_naves/_editar-hoje.mjs <texto|ref> <outDir> <seed> [<seed> ...]
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { b64, gerar } from '../_f8/_pl.mjs';

// --ref=<png> swaps the style reference (e.g. a gothic gunship candidate); --saida=WxH asks for a smaller output canvas
// (the same ships redrawn smaller — his size complaint).
const args = process.argv.slice(2);
const [modo, outDir, ...seeds] = args.filter((a) => !a.startsWith('--'));
if (!['texto', 'ref'].includes(modo) || !outDir || !seeds.length) throw new Error('usage: <texto|ref> <outDir> <seed...> [--ref=png] [--saida=WxH]');

const HOJE = ['public/sprites/naves/humana-t0.png', 'public/sprites/ship-jato.png', 'public/sprites/naves/humana-t2.png', 'public/sprites/naves/humana-t3.png'];
const REF = args.find((a) => a.startsWith('--ref='))?.slice(6) ?? 'public/sprites/enemy-gunship-cinturao.png';
const W = 52, H = 32;
const [OW, OH] = args.find((a) => a.startsWith('--saida='))?.slice(8).split('x').map(Number) ?? [W, H];
const rotulo = args.find((a) => a.startsWith('--rotulo='))?.slice(9) ?? modo;

const EDIT =
  'Turn this fighter into a GOTHIC dark sci-fi warship of a human space colony, keeping its exact silhouette, size, ' +
  'wings, engines and every detail. Repaint the hull in dark graphite and gunmetal grey: layered armor plates, each ' +
  'with a thin lighter-grey edge highlight and a dark seam, like the gothic cathedral architecture (pointed-arch ' +
  'plates, small sharp spires on the back). Warm AMBER-ORANGE light ONLY on the engine flames, the cockpit window and ' +
  'a few small lit windows. No orange paint on the hull. Crisp pixel art, clean dark outline, side view, nose right.';

const centrar = async (arq) => {
  const m = await sharp(arq).metadata();
  return sharp({ create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: arq, left: Math.floor((W - m.width) / 2), top: Math.floor((H - m.height) / 2) }]).png().toBuffer();
};

fs.mkdirSync(outDir, { recursive: true });
const fontes = await Promise.all(HOJE.map(centrar));
const mr = await sharp(REF).metadata();
for (const seed of seeds.map(Number)) {
  const imgs = await gerar('/edit-images-v2', {
    method: modo === 'texto' ? 'edit_with_text' : 'edit_with_reference',
    edit_images: fontes.map((buf) => ({ image: b64(buf), width: W, height: H })),
    image_size: { width: OW, height: OH },
    description: EDIT,
    ...(modo === 'ref' && { reference_image: { image: b64(REF), width: mr.width, height: mr.height } }),
    no_background: true,
    seed,
  });
  imgs.forEach((buf, i) => fs.writeFileSync(path.join(outDir, `${rotulo}-${seed}-t${i}.png`), buf));
  console.log(`${rotulo} seed ${seed}: ${imgs.length} (${OW}×${OH})`);
}
