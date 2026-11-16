// BLOCK SOUND (16/11) — the ORIGINALS under assets/raw/sons/<grupo>/ are kept as FLAC (lossless, ~half the WAV), because
// they live in git: 2 sheets of WAV were ~30 MB. Every tool that reads an original goes through `original()`, so a path
// written as `.wav` (the PixelLab download name, the `local` of an old _origem.json) still finds its `.flac`.
//   node scripts/_som/_original.mjs <pasta>…     converts every .wav under each folder (recursively), checking each one
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/** The file that holds this original: the path itself, or its .flac / .wav twin. Throws when neither exists. */
export function original(caminho) {
  if (existsSync(caminho)) return caminho;
  const base = caminho.replace(/\.(wav|flac)$/i, '');
  for (const ext of ['.flac', '.wav']) if (existsSync(base + ext)) return base + ext;
  throw new Error(`original not found: ${caminho}`);
}

/** The decoded-PCM md5 of a file (what `-f md5` hashes is the samples, not the container). */
function md5Pcm(arquivo) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', arquivo, '-map', '0:a', '-c:a', 'pcm_s16le', '-f', 'md5', '-'], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg md5 failed on ${arquivo}: ${r.stderr}`);
  return r.stdout.trim();
}

/**
 * Turns one 16-bit WAV into FLAC beside it, PROVES the samples are identical, and only then deletes the WAV.
 * Returns the .flac path (or the input untouched when it is not a WAV).
 */
export function guardarComoFlac(wav) {
  if (!/\.wav$/i.test(wav)) return wav;
  const flac = wav.replace(/\.wav$/i, '.flac');
  const r = spawnSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-map', '0:a', '-c:a', 'flac', '-compression_level', '8', flac], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`ffmpeg flac failed on ${wav}: ${r.stderr}`);
  if (md5Pcm(wav) !== md5Pcm(flac)) {
    rmSync(flac, { force: true });
    throw new Error(`FLAC differs from WAV, kept the WAV: ${wav}`);
  }
  rmSync(wav);
  return flac;
}

function* wavs(pasta) {
  for (const nome of readdirSync(pasta)) {
    const p = join(pasta, nome);
    if (statSync(p).isDirectory()) yield* wavs(p);
    else if (/\.wav$/i.test(nome)) yield p;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  let antes = 0;
  let depois = 0;
  let n = 0;
  for (const pasta of process.argv.slice(2)) {
    for (const wav of [...wavs(pasta)]) {
      antes += statSync(wav).size;
      depois += statSync(guardarComoFlac(wav)).size;
      n++;
    }
  }
  console.log(`${n} WAV → FLAC (samples checked): ${(antes / 1e6).toFixed(1)} MB → ${(depois / 1e6).toFixed(1)} MB`);
}
