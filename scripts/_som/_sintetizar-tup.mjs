// BLOCK SOUND (15/11) — the soft TUP synthesized by hand (the swarm drone's hit, his "refazer": the thin metal of the
// shared hit *"incomoda"*, the first soft takes did not please either). No noise: a short low sine dropping 240 → 110 Hz
// in 60 ms, a 2 ms attack, a fast decay — a hit felt more than heard, that can repeat many times a second.
//   node scripts/_som/_sintetizar-tup.mjs <saida.wav>
import { execFileSync } from 'node:child_process';

const [saida] = process.argv.slice(2);
const fase = '(130*(1-exp(-25*t))/25+110*t)';
const expr = `0.7*(1-exp(-500*t))*exp(-38*t)*sin(2*PI*${fase})`;
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=0.14`, saida]);
console.log(`tup: ${saida}`);
