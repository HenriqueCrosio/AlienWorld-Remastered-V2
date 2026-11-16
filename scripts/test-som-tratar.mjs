// BLOCK SOUND (15/11) — the treatment script on a synthetic file: the leading silence goes, the peak lands at
// -1 dBFS, both outputs exist, a short sound comes out mono; a loop keeps its length.
//   node scripts/test-som-tratar.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tratar } from './_som/_som-tratar.mjs';

let falhas = 0;
const ok = (c, m, extra) => { console.log(`${c ? '✔' : '✘'} ${m}${!c && extra !== undefined ? `  ${JSON.stringify(extra)}` : ''}`); if (!c) falhas++; };

const dir = mkdtempSync(join(tmpdir(), 'som-'));
const cru = join(dir, 'cru.wav');
// 0.4 s of silence, then 0.5 s of a quiet stereo sine
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo:d=0.4', '-f', 'lavfi', '-i', 'sine=f=330:d=0.5:r=44100',
  '-filter_complex', '[1]volume=0.2,aformat=channel_layouts=stereo[s];[0][s]concat=n=2:v=0:a=1', cru]);
const r = tratar(cru, join(dir, 'saida'), { camada: 'acao' });
ok(existsSync(join(dir, 'saida.ogg')) && existsSync(join(dir, 'saida.m4a')), 'ogg and m4a written');
ok(r.inicio < 0.02, 'the leading silence is gone', r);
ok(r.dur > 0.45 && r.dur < 0.6, 'the sound itself stays', r);
ok(Math.abs(r.pico - -1) < 0.6, 'the peak at -1 dBFS', r);
const canais = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', join(dir, 'saida.ogg')]).toString().trim();
ok(canais === '1', 'a short sound comes out mono', canais);

const laco = join(dir, 'laco.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=f=110:d=4:r=44100', laco]);
const rl = tratar(laco, join(dir, 'laco-saida'), { camada: 'motor', laco: true });
ok(Math.abs(rl.dur - 3.5) < 0.05, 'a loop loses only its 0.5 s seam (crossfaded into its start), no trim', rl);

const longo = join(dir, 'longo.wav');
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=f=220:d=5:r=44100', longo]);
const rm = tratar(longo, join(dir, 'longo-saida'), { camada: 'acao', max: 1 });
ok(Math.abs(rm.dur - 1) < 0.03 && Math.abs(rm.pico - -1) < 0.6, '--max cuts a long take and it still peaks at -1 dBFS', rm);
const r3 = tratar(longo, join(dir, 'longo-acao'), { camada: 'acao' });
ok(Math.abs(r3.pico - -1) < 0.6, 'a long ACTION take (the sonic boom) is peak-normalised, not loudness-normalised', r3);

console.log(falhas ? `\n${falhas} falha(s)` : '\ntudo certo');
process.exitCode = falhas ? 1 : 0;
