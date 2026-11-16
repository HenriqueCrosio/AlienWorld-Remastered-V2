// BLOCK SOUND (15/11) — builds a sound sheet's folha.html from its dados.json (spec §6). The page itself is the
// shared template in docs/superpowers/folhas/_sons/ (players, the place, repeat ×8, the music under, the choice).
// Open it through Vite: http://localhost:5173/docs/superpowers/folhas/<dia>/sons/<n>-<grupo>/folha.html
//   node scripts/_som/_folha-sons.mjs <pasta-da-folha>
import { readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const pasta = process.argv[2];
if (!pasta) {
  console.error('uso: node scripts/_som/_folha-sons.mjs <pasta-da-folha>');
  process.exitCode = 1;
} else {
  const dados = JSON.parse(readFileSync(join(pasta, 'dados.json'), 'utf8'));
  const molde = relative(pasta, 'docs/superpowers/folhas/_sons').replaceAll('\\', '/');
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  writeFileSync(join(pasta, 'folha.html'), `<!doctype html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(dados.titulo)}</title>
<link rel="stylesheet" href="${molde}/folha-sons.css">
</head>
<body>
<script type="application/json" id="dados">${JSON.stringify(dados).replaceAll('</', '<\\/')}</script>
<main id="folha"></main>
<script type="module" src="${molde}/folha-sons.js"></script>
</body>
</html>
`);
  console.log(`folha.html escrita em ${pasta}`);
}
