// BLOCK SOUND (17/11) — re-levels INSTALLED takes from their originals, as ACTION (peak-normalised) instead of the
// engine's −24 LUFS: the boss loops had been installed at the engine level by default (`_folha-montar`: `laco` → motor)
// and came out 9–12 dB under the rest (measured: `_medir-chefes.mjs`). Marks `camada: 'acao'` on the take in
// `_origem.json`, so a rebuilt sheet keeps it, and rewrites public/sfx/<grupo>/<nome>.{ogg,m4a}.
//   node scripts/_som/_som-renivelar.mjs <grupo> <nome> [<nome> ...]      (the version = the one in _escolhas.txt)
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { original } from './_original.mjs';
import { tratar } from './_som-tratar.mjs';

const [grupo, ...nomes] = process.argv.slice(2);
const raw = join('assets/raw/sons', grupo);
const arqOrigem = join(raw, '_origem.json');
let texto = readFileSync(arqOrigem, 'utf8');
const origem = JSON.parse(texto);
const escolhas = new Map(
  readFileSync(join(raw, '_escolhas.txt'), 'utf8')
    .split(/\r?\n/)
    .map((l) => /^([a-z0-9.]+):\s*([A-Z][A-Z0-9]*)\b/i.exec(l.trim()))
    .filter(Boolean)
    .map((m) => [m[1], m[2]]),
);
for (const nome of nomes) {
  const id = escolhas.get(nome);
  const t = origem.takes.find((x) => x.nome === nome && x.id === id);
  if (!t) throw new Error(`${nome} ${id}: not in _origem.json`);
  const entrada = t.pixellab
    ? original(join(raw, `${t.nome}-${t.de ?? t.id}.wav`))
    : t.local
      ? original(t.local)
      : join('assets/raw/sons/_kenney', t.kenney);
  // (one take per line in the file: only this take's line changes)
  const antes = JSON.stringify(t);
  t.camada = 'acao';
  if (antes !== JSON.stringify(t)) {
    if (!texto.includes(antes)) throw new Error(`${nome} ${id}: its line was not found in _origem.json`);
    texto = texto.replace(antes, JSON.stringify(t));
  }
  const r = tratar(entrada, join('public/sfx', grupo, nome), { camada: 'acao', laco: !!t.laco, max: t.max ?? 0, tempo: t.tempo ?? 1, limpar: !!t.limpar });
  console.log(`${nome} ${id}  ← ${entrada}  dur ${r.dur.toFixed(2)}s  pico ${r.pico.toFixed(1)} dB`);
}
writeFileSync(arqOrigem, texto);
