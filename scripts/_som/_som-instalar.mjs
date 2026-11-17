// BLOCK SOUND (15/11) — installs HIS choices of a sheet: copies each chosen take (.ogg + .m4a) from the sheet's v/
// folder to public/sfx/<grupo>/<nome>.*, and writes (or rewrites) its line in docs/SONS.md from the group's
// _origem.json. The catalogue entries (volume, voices, layer) are written by hand in src/som/catalogoSons.ts.
//   node scripts/_som/_som-instalar.mjs <grupo> <pasta-da-folha>      (reads assets/raw/sons/<grupo>/_escolhas.txt)
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [grupo, pasta] = process.argv.slice(2);
const raw = join('assets/raw/sons', grupo);
const origem = JSON.parse(readFileSync(join(raw, '_origem.json'), 'utf8'));
const escolhas = readFileSync(join(raw, '_escolhas.txt'), 'utf8')
  .split(/\r?\n/)
  // the version id: a letter and then letters/digits (B, C2, D2, BF1 — 16/11: "BF1" was read as "B"); `> other.name`
  // installs that take under another name (17/11: one sound, two moments — the Predador's slash A when it hits, B when
  // it misses; the heartbeat's two takes drawn in turn)
  .map((l) => /^([a-z0-9.]+):\s*([A-Z][A-Z0-9]*)\b(?:\s*>\s*([a-z][a-zA-Z0-9.]*))?/i.exec(l.trim()))
  .filter(Boolean)
  .map((m) => ({ nome: m[1], id: m[2], como: m[3] ?? m[1] }));
const destino = join('public/sfx', grupo);
mkdirSync(destino, { recursive: true });
const SONS = 'docs/SONS.md';
let creditos = readFileSync(SONS, 'utf8');
// (`daFolha` = the sound's row on the sheet, where the take lives; `nome` = the name it is installed and credited as)
for (const { nome: daFolha, id, como: nome } of escolhas) {
  const t = origem.takes.find((x) => x.nome === daFolha && x.id === id);
  if (!t) throw new Error(`${daFolha} ${id}: not in _origem.json`);
  for (const ext of ['ogg', 'm4a']) {
    const de = join(pasta, 'v', `${daFolha}-${id}.${ext}`);
    if (!existsSync(de)) throw new Error(`missing ${de}`);
    copyFileSync(de, join(destino, `${nome}.${ext}`));
  }
  const feito = [t.max ? `cortado em ${t.max} s` : '', t.tempo ? `${t.tempo}× sem mudar o tom` : '', t.limpar ? 'ruído reduzido' : '', t.laco ? 'emenda do laço' : '', 'tratado (_som-tratar)']
    .filter(Boolean)
    .join('; ');
  // (`dele`: a file HE made and handed over — 16/11, the ricochets; its credit is his, not the project's)
  const linha = t.pixellab
    ? `| \`${nome}\` | \`${grupo}/${nome}\` | PixelLab \`create_sound_effect\` (versão ${id}) | gerado na conta dele | PixelLab (conta dele) | — | prompt: "${(t.prompt ?? '').replaceAll('|', '/')}"; ${feito} |`
    : t.mistura
      ? `| \`${nome}\` | \`${grupo}/${nome}\` | PixelLab \`create_sound_effect\`, mixado no projeto (versão ${id}) | gerado na conta dele | PixelLab (conta dele) | — | ${t.mistura.replaceAll('|', '/')}; ${feito} |`
      : t.dele
      ? `| \`${nome}\` | \`${grupo}/${nome}\` | feito por ele (\`${t.local.split('/').pop()}\`) | Henrique | próprio | — | ${(t.prompt ?? '').replaceAll('|', '/')}; ${feito} |`
      : t.local
      ? `| \`${nome}\` | \`${grupo}/${nome}\` | sintetizado no projeto (versão ${id}) | o projeto | próprio | — | ${(t.prompt ?? '').replaceAll('|', '/')}; ${feito} |`
      : `| \`${nome}\` | \`${grupo}/${nome}\` | Kenney · ${t.kenney.split('/')[0]} · \`${t.kenney.split('/').pop()}\` (versão ${id}) | Kenney (kenney.nl) | CC0 1.0 | https://kenney.nl/assets/${t.kenney.split('/')[0]} | ${feito} |`;
  const velha = creditos.split('\n').find((l) => l.startsWith(`| \`${nome}\` |`));
  creditos = velha ? creditos.replace(velha, linha) : `${creditos.trimEnd()}\n${linha}\n`;
  console.log(`${nome} ← ${id}`);
}
writeFileSync(SONS, creditos);
