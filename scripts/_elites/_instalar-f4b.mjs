// 14/10 — INSTALLS the pieces of the F4 round of 14/10 (spec fatia F4 §9.2–9.4), the ones he picked on the sheets:
// the pupa P1 (hand-drawn; same keys as the old one), the spore G4 (generated, reduced), the spore grain that clings
// to the slowed ship, and the Tube's two root feet (chamber A's border and the blue ribs).
//   node scripts/_elites/_instalar-f4b.mjs
import sharp from 'sharp';
import { PUPAS, graoDeEsporo, peDoTubo, reduzir } from './_mao-f4b.mjs';

const OUT = 'public/sprites';
const [escura, acesa] = await PUPAS['P1 crisálida em anéis']();
await sharp(escura).toFile(`${OUT}/elite-pupa-0.png`);
await sharp(acesa).toFile(`${OUT}/elite-pupa-1.png`);
await sharp(await reduzir('docs/superpowers/folhas/2026-10-14/f4/cand/esporoNuvem-41-31.png', 9)).toFile(`${OUT}/elite-esporo.png`);
await sharp(await graoDeEsporo()).toFile(`${OUT}/elite-esporo-grao.png`);
await sharp(await peDoTubo(`${OUT}/f4-faixa-a.png`, 14)).toFile(`${OUT}/elite-tubo-pe-a.png`);
await sharp(await peDoTubo(`${OUT}/f4-faixa-b.png`, 21)).toFile(`${OUT}/elite-tubo-pe-b.png`);
console.log('elite-pupa-0..1 (P1), elite-esporo (G4), elite-esporo-grao, elite-tubo-pe-a, elite-tubo-pe-b');
