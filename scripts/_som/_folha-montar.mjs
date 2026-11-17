// BLOCK SOUND (15/11) — from a group's _origem.json: downloads the PixelLab WAVs into assets/raw/sons/<grupo>/, treats
// every take (PixelLab and Kenney) into the sheet's v/ folder, and prints one report line per take (duration, peak,
// leading silence) so a bad take is caught BEFORE he listens.
//   node scripts/_som/_folha-montar.mjs <grupo> <pasta-da-folha>
//   e.g. node scripts/_som/_folha-montar.mjs nave docs/superpowers/folhas/2026-11-15/sons/1-nave
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tratar } from './_som-tratar.mjs';
import { guardarComoFlac, original } from './_original.mjs';

const [grupo, pasta] = process.argv.slice(2);
if (!grupo || !pasta) {
  console.error('uso: node scripts/_som/_folha-montar.mjs <grupo> <pasta-da-folha>');
  process.exitCode = 1;
} else {
  const raw = join('assets/raw/sons', grupo);
  const origem = JSON.parse(readFileSync(join(raw, '_origem.json'), 'utf8'));
  const relatorio = [];
  for (const t of origem.takes) {
    let entrada;
    if (t.pixellab) {
      // a reworked take (A2 …) starts from the raw of the take it reworks (`de`)
      // (the original is KEPT AS FLAC — see _original.mjs: the WAV is downloaded, proved identical, and replaced)
      const wav = join(raw, `${t.nome}-${t.de ?? t.id}.wav`);
      if (!existsSync(wav) && !existsSync(wav.replace(/\.wav$/, '.flac'))) {
        const r = await fetch(origem.base + t.pixellab);
        if (!r.ok) throw new Error(`${t.nome} ${t.id}: HTTP ${r.status}`);
        writeFileSync(wav, Buffer.from(await r.arrayBuffer()));
      }
      entrada = guardarComoFlac(original(wav));
    } else if (t.local) {
      // a take made here (synthesized: scripts/_som/_sintetizar-*.mjs), already in assets/raw/sons/<grupo>/ — a fresh
      // synthesized WAV becomes FLAC here too
      entrada = original(t.local);
      if (entrada.replaceAll('\\', '/').startsWith('assets/raw/sons/') && !entrada.includes('_kenney')) entrada = guardarComoFlac(entrada);
    } else {
      entrada = join('assets/raw/sons/_kenney', t.kenney);
    }
    // (a loop that is ACTION — the TERMINUS's held fire — says so: it is peak-normalised, not sat at the engine's level)
    const camada = t.camada ?? (t.laco ? 'motor' : 'acao');
    // a broken generation (PixelLab gave files peaking at -72 and at -43.7 dB — a real effect peaks far above -30):
    // out of the sheet, loudly
    const descartar = (motivo) => {
      console.log(`${t.nome} ${t.id}  DESCARTADA: ${motivo}`);
      for (const ext of ['ogg', 'm4a']) rmSync(join(pasta, 'v', `${t.nome}-${t.id}.${ext}`), { force: true });
      relatorio.push({ nome: t.nome, id: t.id, descartada: motivo });
    };
    const bruto = Number(/max_volume:\s*(-?[\d.]+) dB/.exec(spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', entrada, '-af', 'volumedetect', '-f', 'null', '-'], { encoding: 'utf8' }).stderr ?? '')?.[1] ?? NaN);
    if (!(bruto > -30)) {
      descartar(`muda (pico ${bruto} dB)`);
      continue;
    }
    let r;
    try {
      // (`estereo`: a take whose point is its stereo motion — 17/11, his flybys: a pass from one side to the other)
      r = tratar(entrada, join(pasta, 'v', `${t.nome}-${t.id}`), { camada, laco: !!t.laco, max: t.max ?? 0, tempo: t.tempo ?? 1, limpar: !!t.limpar, estereo: !!t.estereo });
    } catch (e) {
      descartar(`o tratamento falhou (${String(e.message ?? e).split('\n')[0].slice(0, 80)})`);
      continue;
    }
    relatorio.push({ nome: t.nome, id: t.id, ...r });
    console.log(`${t.nome} ${t.id}  dur ${r.dur.toFixed(2)}s  pico ${r.pico.toFixed(1)} dB  início ${r.inicio.toFixed(3)}s`);
  }
  writeFileSync(join(pasta, '_relatorio.json'), JSON.stringify(relatorio, null, 1));
}
