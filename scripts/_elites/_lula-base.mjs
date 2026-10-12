// The squid's ANIMATION BASE: the installed sprite (41×41) in a larger transparent frame, so the gestures have room
// (PixMiniMax wants slack around the sprite). The clips are generated from it and cropped back at install time.
//   node scripts/_elites/_lula-base.mjs
import sharp from 'sharp';

// Two frames, the squid at (20,20) in both (so its centre is the same): 80×80 for the gestures that stay in the pose,
// 96×96 for the ESCAPE — the tentacles stretch out to the lower right and need the extra room there.
const ORIGEM = { x: 20, y: 20 };
for (const lado of [80, 96]) {
  const saida = `docs/superpowers/folhas/2026-10-12/elites/lula/base-${lado}.png`;
  await sharp({ create: { width: lado, height: lado, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: 'public/sprites/elite-cacador.png', left: ORIGEM.x, top: ORIGEM.y }])
    .png()
    .toFile(saida);
  console.log(saida);
}
