// BLOCK SOUND (15/11) — writes a sheet's dados.json from the group's _origem.json (the takes) and its folha json (the
// groups, what each sound is, where it plays, the place it is judged in). Each take gets its source and licence.
// `--folha <arquivo>` picks another sheet description (default _folha.json); `--rodada N` keeps only the takes of that
// round (a "refazer" sheet: only the new takes of the sounds he sent back).
//   node scripts/_som/_folha-dados.mjs <grupo> <pasta-da-folha> [--folha _folha-2b.json] [--rodada 2]
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [grupo, pasta, ...resto] = process.argv.slice(2);
const opcao = (k) => (resto.includes(k) ? resto[resto.indexOf(k) + 1] : null);
const raw = join('assets/raw/sons', grupo);
const origem = JSON.parse(readFileSync(join(raw, '_origem.json'), 'utf8'));
const folha = JSON.parse(readFileSync(join(raw, opcao('--folha') ?? '_folha.json'), 'utf8'));
const rodada = opcao('--rodada') ? Number(opcao('--rodada')) : null;
const daRodada = (t) => rodada === null || (t.rodada ?? 1) === rodada;
const fonte = (t) => (t.pixellab ? 'PixelLab (gerado)' : t.local ? 'sintetizado aqui (sem ruído)' : `Kenney · ${t.kenney.split('/').pop()}`);
const licenca = (t) => (t.pixellab ? 'conta dele' : t.local ? 'próprio' : 'CC0');
const versoesDe = (nome) =>
  origem.takes
    // a take the builder discarded (mute, broken) has no file in v/: it is not on the sheet
    .filter((t) => t.nome === nome && daRodada(t) && existsSync(join(pasta, 'v', `${t.nome}-${t.id}.ogg`)))
    .map((t) => ({ id: t.id, arquivo: `v/${t.nome}-${t.id}.ogg`, fonte: fonte(t), licenca: licenca(t), nota: t.prompt ? `"${t.prompt}"` : '' }));
const dados = {
  ...folha.cabeca,
  grupos: folha.grupos.map((g) => ({
    titulo: g.titulo,
    sons: g.sons.map((s) => {
      const versoes = versoesDe(s.nome);
      if (!versoes.length) throw new Error(`${s.nome}: no take in _origem.json`);
      return { ...s, versoes };
    }),
  })),
};
if (rodada === null) {
  const faltando = origem.takes.filter((t) => !folha.grupos.some((g) => g.sons.some((s) => s.nome === t.nome)));
  if (faltando.length) throw new Error(`takes without a row: ${[...new Set(faltando.map((t) => t.nome))].join(', ')}`);
}
writeFileSync(join(pasta, 'dados.json'), JSON.stringify(dados, null, 1));
console.log(`dados.json: ${dados.grupos.reduce((n, g) => n + g.sons.length, 0)} sons, ${dados.grupos.reduce((n, g) => n + g.sons.reduce((m, s) => m + s.versoes.length, 0), 0)} versões`);
