// BLOCK SOUND (18/11) — HIS ambience files (`assets/raw/sons/ambiente-dele/`, royalty free, no credit needed), complements
// of what the game already has: three more far thunders for the night menu's draw, the rain heard from inside the hangar,
// the tension bed of the space stages and the six-minute storm of the night menu (kept whole: the game streams it).
//   node scripts/_som/_ambiente-dele.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tratar } from './_som-tratar.mjs';

const RAW = 'assets/raw/sons/ambiente-dele';
const SAI = 'public/sfx/ambiente';
const ff = (args) => execFileSync('ffmpeg', ['-nostdin', '-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

const tmp = mkdtempSync(join(tmpdir(), 'ambiente-dele-'));
try {
  // each thunder: the stretch of its hit, dying out on a fade (the takes go on with room noise after it)
  const TROVOES = [
    { nome: 'fx.menu.trovao.longe3', de: 'distant-thunder.mp3', ini: 2.8, fim: 10.1, some: 2.2 },
    { nome: 'fx.menu.trovao.longe4', de: 'distant-thunder.mp3', ini: 10.4, fim: 16, some: 2.5 },
    { nome: 'fx.menu.trovao.longe5', de: 'rolling-thunder.mp3', ini: 0, fim: 8.7, some: 1.5 },
  ];
  for (const t of TROVOES) {
    const a = join(tmp, `${t.nome}.wav`);
    // (compressed: a thunder is one short crack and a long quiet roll, and it is the roll that has to carry from far away)
    ff(['-i', join(RAW, t.de), '-af', `atrim=${t.ini}:${t.fim},asetpts=PTS-STARTPTS,acompressor=threshold=-30dB:ratio=6:attack=15:release=300:makeup=1,afade=t=out:st=${(t.fim - t.ini - t.some).toFixed(2)}:d=${t.some}`, a]);
    console.log(t.nome, JSON.stringify(tratar(a, join(SAI, t.nome), { camada: 'acao' })));
  }
  // the loops: only their steady stretch (the takes fade in and out)
  console.log('amb.hangar.chuva', JSON.stringify(tratar(join(RAW, 'chuva-hangar.m4a'), join(SAI, 'amb.hangar.chuva'), { camada: 'ambiente', laco: true, corte: [18, 50] })));
  console.log('amb.espaco.tensao', JSON.stringify(tratar(join(RAW, 'tensao-f2-f3.m4a'), join(SAI, 'amb.espaco.tensao'), { camada: 'ambiente', laco: true, corte: [4, 24] })));
  // the storm stays as he made it: only converted (its dynamics ARE the piece: it comes near and goes away)
  ff(['-i', join(RAW, 'tempestade.m4a'), '-ac', '2', '-ar', '44100', '-c:a', 'libvorbis', '-q:a', '3', join(SAI, 'amb.menu.tempestade.ogg')]);
  ff(['-i', join(RAW, 'tempestade.m4a'), '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', join(SAI, 'amb.menu.tempestade.m4a')]);
  console.log('amb.menu.tempestade convertida');
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
