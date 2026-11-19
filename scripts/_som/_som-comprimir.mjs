// BLOCK SOUND (18/11) — a SPARSE take (short hits, almost no body) that even at full volume cannot stand over the music:
// compressed from its original so the body comes up, then back to a −1 dBFS peak, and installed over the game's file
// (spec §10.9: *"um take esparso não sobe só no volume"*).
//   node scripts/_som/_som-comprimir.mjs <grupo> <nome-no-jogo> <arquivo-original-em-assets/raw/sons/grupo>
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [grupo, nome, original] = process.argv.slice(2);
if (!grupo || !nome || !original) {
  console.error('uso: node scripts/_som/_som-comprimir.mjs <grupo> <nome-no-jogo> <original>');
  process.exit(1);
}
const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
const pico = (f) => Number(/max_volume:\s*(-?[\d.]+) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr)?.[1] ?? NaN);

const tmp = mkdtempSync(join(tmpdir(), 'comprimir-'));
try {
  const a = join(tmp, 'a.wav');
  const b = join(tmp, 'b.wav');
  ff(['-i', join('assets/raw/sons', grupo, original), '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,acompressor=threshold=-32dB:ratio=8:attack=4:release=140:makeup=1', '-ac', '1', '-ar', '44100', a]);
  const d = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a]).toString().trim());
  // (no fade-in: on a take that opens on its transient it ate the whole hit — the flak A came out 11 dB lower)
  ff(['-i', a, '-af', `volume=${(-1 - pico(a)).toFixed(2)}dB,afade=t=out:st=${Math.max(0, d - 0.005).toFixed(4)}:d=0.005`, b]);
  const destino = join('public/sfx', grupo, nome);
  ff(['-i', b, '-c:a', 'libvorbis', '-q:a', '5', `${destino}.ogg`]);
  ff(['-i', b, '-c:a', 'aac', '-b:a', '128k', `${destino}.m4a`]);
  console.log(`${nome}: comprimido, pico ${pico(`${destino}.ogg`).toFixed(1)} dB, ${d.toFixed(2)} s`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
