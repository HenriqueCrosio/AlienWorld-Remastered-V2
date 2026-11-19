// BLOCK SOUND (15/11) — the treatment of ONE sound for the game (spec `specs/2026-11-15-bloco-som-design.md` §3.4):
// trims the silence, brings the peak to -1 dBFS (the short sounds; the long ambience goes to -24 LUFS instead), 5 ms
// fades at the ends (no click; not on a loop), mono unless --estereo or ambience, and writes the .ogg (vorbis q5) and
// the .m4a (aac 128k) side by side.
//   node scripts/_som/_som-tratar.mjs <entrada> <saida-sem-extensao> [--camada acao|interface|ambiente|motor] [--laco] [--estereo] [--max s]
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ff = (args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });
/** ffmpeg's analysis filters (volumedetect, silencedetect) print to stderr, also on success */
const stderrDe = (args) => spawnSync('ffmpeg', ['-hide_banner', '-nostats', ...args, '-f', 'null', '-'], { encoding: 'utf8' }).stderr ?? '';
const duracao = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim());
const pico = (f) => Number(/max_volume:\s*(-?[\d.]+) dB/.exec(stderrDe(['-i', f, '-af', 'volumedetect']))?.[1] ?? NaN);
/** seconds of silence at the very start (0 if the sound starts at once) */
const silencioInicial = (f) => {
  const s = stderrDe(['-i', f, '-af', 'silencedetect=n=-50dB:d=0.005']);
  const comeca = /silence_start:\s*(-?[\d.]+)/.exec(s);
  const acaba = /silence_end:\s*([\d.]+)/.exec(s);
  return comeca && Math.abs(Number(comeca[1])) < 1e-3 && acaba ? Number(acaba[1]) : 0;
};

/**
 * `max` (s): cut a long take (a Kenney thruster loop used as a one-shot) with an 80 ms fade-out.
 * A loop's seam: the last `X` seconds are crossfaded into the first `X` (equal power) and the output starts at `X` —
 * so its end flows into its own start (the PixelLab takes do not close by themselves).
 */
/**
 * `tempo` (×): faster/shorter without changing the pitch (atempo) — his "mais rápida e curta".
 * `limpar`: less noise — FFT denoise + a gentle low-pass that takes the hiss off the top — his "menos ruído".
 */
/**
 * `corte` ([ini, fim], s): keeps only that stretch of the take, before anything else — 18/11, the ambience beds: PixelLab
 * takes can open or close on ~1 s of silence, and a loop made from them drops out on every lap.
 */
export function tratar(entrada, saida, { camada = 'acao', laco = false, estereo = false, max = 0, tempo = 1, limpar = false, corte = null } = {}) {
  mkdirSync(dirname(resolve(saida)), { recursive: true });
  const tmp = mkdtempSync(join(tmpdir(), 'tratar-'));
  try {
    const canais = estereo || camada === 'ambiente' ? 2 : 1;
    const a0 = join(tmp, 'a0.wav');
    const filtros = [];
    if (corte) filtros.push(`atrim=${corte[0]}:${corte[1]}`, 'asetpts=PTS-STARTPTS');
    if (limpar) filtros.push('afftdn=nr=30:nf=-35', 'lowpass=f=5500', 'lowpass=f=5500', 'highpass=f=50');
    if (tempo !== 1) filtros.push(`atempo=${tempo}`);
    if (!laco) {
      filtros.push('silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.02,areverse');
    }
    ff(['-i', entrada, '-af', filtros.length ? filtros.join(',') : 'anull', '-ac', String(canais), '-ar', '44100', a0]);
    let a = a0;
    if (max > 0 && duracao(a0) > max) {
      a = join(tmp, 'a1.wav');
      ff(['-i', a0, '-af', `atrim=0:${max},afade=t=out:st=${Math.max(0, max - 0.08).toFixed(3)}:d=0.08`, a]);
    }
    if (laco) {
      const X = Math.min(0.5, duracao(a) / 4).toFixed(3);
      const emenda = join(tmp, 'a2.wav');
      ff(['-i', a, '-filter_complex', `[0]asplit[p][q];[p]atrim=0:${X},asetpts=PTS-STARTPTS[cabeca];[q]atrim=${X},asetpts=PTS-STARTPTS[corpo];[corpo][cabeca]acrossfade=d=${X}:c1=qsin:c2=qsin`, emenda]);
      a = emenda;
    }
    const b = join(tmp, 'b.wav');
    // loudness for what sits under the game for a long time; the peak for everything that hits
    const longo = camada === 'ambiente' || camada === 'motor';
    if (longo) ff(['-i', a, '-af', 'loudnorm=I=-24:TP=-1.5:LRA=11', '-ar', '44100', b]);
    else ff(['-i', a, '-af', `volume=${(-1 - pico(a)).toFixed(2)}dB`, b]);
    const c = join(tmp, 'c.wav');
    const d = duracao(b);
    // 1.5 ms in (a Kenney take starts ON its transient: 5 ms ate the attack), 5 ms out
    ff(['-i', b, '-af', laco ? 'anull' : `afade=t=in:d=0.0015,afade=t=out:st=${Math.max(0, d - 0.005).toFixed(4)}:d=0.005`, c]);
    ff(['-i', c, '-c:a', 'libvorbis', '-q:a', '5', `${saida}.ogg`]);
    ff(['-i', c, '-c:a', 'aac', '-b:a', '128k', `${saida}.m4a`]);
    return { dur: duracao(`${saida}.ogg`), pico: pico(c), inicio: silencioInicial(c) };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const [entrada, saida, ...resto] = process.argv.slice(2);
  if (!entrada || !saida) {
    console.error('uso: node scripts/_som/_som-tratar.mjs <entrada> <saida-sem-extensao> [--camada X] [--laco] [--estereo]');
    process.exitCode = 1;
  } else {
    const i = resto.indexOf('--camada');
    const m = resto.indexOf('--max');
    console.log(JSON.stringify(tratar(entrada, saida, { camada: i >= 0 ? resto[i + 1] : 'acao', laco: resto.includes('--laco'), estereo: resto.includes('--estereo'), max: m >= 0 ? Number(resto[m + 1]) : 0 })));
  }
}
