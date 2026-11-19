// BLOCK SOUND (19/11) — the Manta's flyover of the final cutscene, MIRRORED: its take (BP, sheet 7 round 2) was panned
// from the left to the right, and over the fallen Leviathan the ship crosses from the RIGHT to the LEFT
// (`final/sobrevoo.ts`). The two channels swap, and it is treated again exactly as installed (the same level).
//   node scripts/_som/_sobrevoo-manta-espelhar.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tratar } from './_som-tratar.mjs';

const ORIGEM = 'assets/raw/sons/cutscenes/fim.sobrevoo.charybdis-BP.flac';
const SAIDA = 'public/sfx/cutscenes/fim.sobrevoo.charybdis';
const tmp = mkdtempSync(join(tmpdir(), 'manta-espelho-'));
try {
  const wav = join(tmp, 'espelhada.wav');
  execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', '-i', ORIGEM, '-af', 'pan=stereo|c0=c1|c1=c0', wav]);
  console.log('fim.sobrevoo.charybdis (espelhada)', JSON.stringify(tratar(wav, SAIDA, { camada: 'acao', estereo: true })));
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
