// 17/10 — ITEM 8 (polish block C): THE F4 VARIANT OF THE `destroco` HAZARD. Inside the leviathan the drifting wreck is
// "what it swallowed" (STAGE_4 header), but it uses the F2 fleet art: light-grey hull plates, the brightest thing in the
// F4, scaled up to 1.6 (item 7). The variant is drawn at its NATIVE size (40–80 px wide: the range the 42–52 px art
// covers today at 0.9–1.6), so the F4 can cap its scale at 1. It is a hazard: it must READ against the chambers (dark,
// but with a rim and veins of light), unlike the near-black foreground.
//   node scripts/_polimento/_gerar-destroco-f4.mjs <concept> <out dir> <seed...>
//     engolido  — /edit-image from each of the three approved `destroco` arts (start from the approved art)
//     casco     — /generate-image-v2: the same swallowed hull, generated (the edits rarely kept the hull)
//     osso      — /generate-image-v2: calcified bone/carapace plates
//     coagulo   — /generate-image-v2: hardened clots with metal shards caught inside
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const TOKEN = fs.readFileSync('.env.pixellab', 'utf8').match(/PIXELLAB_SECRET=(\S+)/)?.[1];
const API = 'https://api.pixellab.ai/v2';
const H = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };
const b64 = (buf) => ({ type: 'base64', base64: `data:image/png;base64,${buf.toString('base64')}`, format: 'png' });

async function pedir(endpoint, body) {
  const r = await fetch(API + endpoint, { method: 'POST', headers: H, body: JSON.stringify(body) });
  const j = await r.json();
  if (!r.ok) throw new Error(`${endpoint} HTTP ${r.status} — ${JSON.stringify(j).slice(0, 400)}`);
  const direto = j.images ?? (j.image ? [j.image] : null);
  if (direto) return direto.map((im) => Buffer.from(String(im.base64 ?? im).replace(/^data:[^,]+,/, ''), 'base64'));
  const id = j.background_job_id ?? j.job_id ?? j.id;
  process.stdout.write(`${endpoint} ${id} `);
  for (let i = 0; i < 240; i++) {
    await new Promise((res) => setTimeout(res, 5000));
    const job = await (await fetch(`${API}/background-jobs/${id}`, { headers: H })).json();
    if (job.status === 'completed') {
      const lr = job.last_response ?? {};
      const imgs = lr.images ?? (lr.image ? [lr.image] : []);
      console.log(`✔ ${imgs.length}, ${job.usage?.generations ?? '?'} gens`);
      return imgs.map((im) => Buffer.from(String(im.base64).replace(/^data:[^,]+,/, ''), 'base64'));
    }
    if (job.status === 'failed') throw new Error(`job ${id} failed: ${JSON.stringify(job).slice(0, 400)}`);
    process.stdout.write('.');
  }
  throw new Error(`job ${id}: timeout`);
}

const [conceito, outDir, ...seeds] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const STYLE = 'public/sprites/f4-faixa-a.png';
const LUZ =
  'Dark sci-fi palette of the leviathan interior: deep plum, wine and charcoal shadows, a thin dark-crimson rim light on ' +
  'the top edges and a few small glowing red-orange veins (the only light). No grey, no white, no bright colors. It must ' +
  'still read as a solid obstacle against a dark background. Crisp pixel art, side view, transparent background.';

if (conceito === 'engolido') {
  // /edit-image caps the description at 500 chars.
  const EDIT =
    'Same wrecked ship hull, but swallowed and half-digested inside a living creature: metal darkened to near-black ' +
    'gunmetal, corroded, overgrown by dark wine-red tissue, sinew strands and small polyps creeping over the plates and ' +
    'through the holes. Keep the shape. Deep plum and charcoal shadows, thin dark-crimson rim light on top edges, a few ' +
    'small glowing red-orange veins. No grey, no white. Crisp pixel art, side view.';
  for (const [i, f] of ['destroco', 'destroco-2', 'destroco-3'].entries()) {
    const src = `public/sprites/${f}.png`;
    const m = await sharp(src).metadata();
    // Upscaled ×1.5 nearest so the edit has room for the 60–78 px native size (reducing later is allowed).
    const w = Math.round(m.width * 1.5), h = Math.round(m.height * 1.5);
    const grande = await sharp(src).resize(w, h, { kernel: 'nearest' }).png().toBuffer();
    for (const s of seeds) {
      const imgs = await pedir('/edit-image', {
        image: b64(grande), image_size: { width: w, height: h }, description: EDIT, width: w, height: h,
        seed: Number(s), no_background: true, color_image: b64(fs.readFileSync(STYLE)),
      });
      imgs.forEach((buf, k) => fs.writeFileSync(path.join(outDir, `engolido-${i + 1}-${s}-${k}.png`), buf));
    }
  }
} else {
  const CONCEITOS = {
    osso: 'Three SEPARATE drifting chunks of CALCIFIED BONE and CARAPACE: broken plates of armored shell and vertebra, thick and heavy, with cracks, porous edges and a few torn sinew strands trailing.',
    // The `engolido` edits keep the hull only now and then (2 of 9 on the first round): the same idea, generated.
    casco: 'Three SEPARATE drifting fragments of a WRECKED SPACESHIP HULL that the creature SWALLOWED: torn near-black gunmetal armor plates with ribs and rivets, corroded, half-overgrown by dark wine-red tissue, sinew strands and small polyps creeping over the metal and through the torn holes.',
    coagulo: 'Three SEPARATE drifting HARDENED CLOTS: dense knotted lumps of dried dark tissue and sinew, with jagged shards of dark ship metal caught and half-buried inside them.',
  };
  const desc = CONCEITOS[conceito];
  if (!desc) throw new Error('concept? engolido | casco | osso | coagulo');
  for (const s of seeds) {
    const imgs = await pedir('/generate-image-v2', {
      description: `Floating obstacles for a side-scrolling shoot-em-up set INSIDE the body of a colossal space leviathan. ${desc} Each chunk is 40 to 80 pixels wide, irregular, none touching another or any edge of the image. ${LUZ}`,
      image_size: { width: 256, height: 96 },
      no_background: true,
      seed: Number(s),
      style_image: { image: b64(fs.readFileSync(STYLE)), size: { width: (await sharp(STYLE).metadata()).width, height: (await sharp(STYLE).metadata()).height } },
      style_options: { color_palette: false, outline: true, detail: true, shading: true },
    });
    imgs.forEach((buf, k) => fs.writeFileSync(path.join(outDir, `${conceito}-${s}-${k}.png`), buf));
    console.log(`${conceito} ${s}: ${imgs.length}`);
  }
}
