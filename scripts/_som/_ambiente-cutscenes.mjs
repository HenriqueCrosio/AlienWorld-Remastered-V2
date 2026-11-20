// BLOCK SOUND (20/11) — HIS beds for the cutscenes BETWEEN stages, which lost the music (him: "só ocorra os efeitos e
// ambientação"). From `assets/raw/sons/ambiente-dele/`:
//   - cutscene-espaco: the deep space hum under cutscenes 1 and 2 ("dá essa vibração bem grave para complementar os
//     efeitos");
//   - interior-biomecanico + complemento-interior: the Leviathan's inside in cutscene 3, the TWO together ("o interior
//     biomecanico traz batidas de coração [...] o complemento é o som grave mais baixo continuo").
// Each loop is a steady stretch of its take, cut at a quiet valley (50 ms RMS minima — the biomechanical one between
// beats, so the seam does not double a heartbeat); `tratar` crossfades the seam and sets −24 LUFS.
//   node scripts/_som/_ambiente-cutscenes.mjs
import { join } from 'node:path';
import { tratar } from './_som-tratar.mjs';

const RAW = 'assets/raw/sons/ambiente-dele';
const SAI = 'public/sfx/ambiente';
const LACOS = [
  { nome: 'amb.cut.espaco', de: 'cutscene-espaco.mp3', corte: [7.0, 40.3] },
  { nome: 'amb.cut.leviata', de: 'interior-biomecanico.mp3', corte: [4.85, 45.5] },
  { nome: 'amb.cut.leviata2', de: 'complemento-interior.mp3', corte: [96.15, 132.4] },
];
for (const l of LACOS) {
  console.log(l.nome, JSON.stringify(tratar(join(RAW, l.de), join(SAI, l.nome), { camada: 'ambiente', laco: true, corte: l.corte })));
}
