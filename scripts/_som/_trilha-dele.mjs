// BLOCK SOUND (18/11) — HIS soundtrack and HIS lightning. The five tracks are only converted (their dynamics are his); the
// game streams them (`src/systems/Music.ts`). The lightning file holds two strikes: each becomes one take of the bolt.
//   node scripts/_som/_trilha-dele.mjs
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tratar } from './_som-tratar.mjs';

const ORIGEM_TRILHA = 'C:/Users/Henrique/Music/Trilha sonora Alienworld';
const ORIGEM_RAIO = 'C:/Users/Henrique/Music/Ambientação/Complemento para o menu inicial da noite/raio.mp3';
const RAW_TRILHA = 'assets/raw/sons/trilha';
const RAW_AMBIENTE = 'assets/raw/sons/ambiente-dele';
const SAI_TRILHA = 'public/audio/trilha';
const SAI_AMBIENTE = 'public/sfx/ambiente';
const ff = (args) => execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

const FAIXAS = {
  menu: 'Intro Menu Inicial.mp3',
  f1: 'Fase 1 theme.mp3',
  f2: 'Fase 2 theme.mp3',
  f3: 'Fase 3 theme.mp3',
  f4: 'Fase 4 theme 1.mp3',
};
mkdirSync(RAW_TRILHA, { recursive: true });
mkdirSync(SAI_TRILHA, { recursive: true });
for (const [nome, arquivo] of Object.entries(FAIXAS)) {
  const raw = join(RAW_TRILHA, `${nome}.mp3`);
  copyFileSync(join(ORIGEM_TRILHA, arquivo), raw);
  ff(['-i', raw, '-vn', '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '5', join(SAI_TRILHA, `${nome}.ogg`)]);
  ff(['-i', raw, '-vn', '-map_metadata', '-1', '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '160k', join(SAI_TRILHA, `${nome}.m4a`)]);
  console.log('faixa', nome);
}

const tmp = mkdtempSync(join(tmpdir(), 'raio-dele-'));
try {
  const raw = join(RAW_AMBIENTE, 'raio.mp3');
  copyFileSync(ORIGEM_RAIO, raw);
  // each strike keeps the short tearing that announces it (~0.45 s) and dies on its own tail
  const RAIOS = [
    { nome: 'fx.menu.trovao.perto', ini: 1.25, fim: 10.3, some: 1.6 },
    { nome: 'fx.menu.trovao.perto2', ini: 11.25, fim: 17.4, some: 0.8 },
  ];
  for (const r of RAIOS) {
    const a = join(tmp, `${r.nome}.wav`);
    ff(['-i', raw, '-af', `atrim=${r.ini}:${r.fim},asetpts=PTS-STARTPTS,afade=t=out:st=${(r.fim - r.ini - r.some).toFixed(2)}:d=${r.some}`, a]);
    console.log(r.nome, JSON.stringify(tratar(a, join(SAI_AMBIENTE, r.nome), { camada: 'acao', estereo: true })));
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
