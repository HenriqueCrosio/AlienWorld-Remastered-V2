// BLOCK M2 (14/11) — the sheet of the controller, from the photos of `_controle-fotos.mjs`.
//   node scripts/_m/_controle-folha.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';

const DIR = process.argv[2];
const GRUPOS = [
  ['A aba CONTROLES no teclado', 'O perfil de cada aparelho no topo; abaixo, as cinco ações com uma tecla e um botão cada. Sem controle ligado, a coluna dele fica apagada.', [
    ['teclado-controles', 'A aba, com o perfil PADRÃO'],
    ['teclado-linha-tiro', 'O cursor numa célula da tabela'],
    ['teclado-captura', 'Confirmar abre a captura: "aperte a nova tecla"'],
    ['teclado-recusa', 'Uma tecla do jogo (W) é recusada'],
    ['teclado-personalizado', 'O tiro no K: o perfil vira PERSONALIZADO'],
    ['restaurar-confirma', 'RESTAURAR O PADRÃO pede confirmação'],
  ]],
  ['Com um controle de Xbox (simulado)', 'As dicas viram botões assim que o controle é tocado. Os ícones são do pacote "Input Prompts Pixel" da Kenney (CC0, domínio público).', [
    ['xbox-aviso-conectado', 'O aviso ao conectar, no canto'],
    ['xbox-controles', 'A aba com a coluna do controle e os ícones'],
    ['xbox-captura', 'A captura de um botão'],
    ['xbox-personalizado', 'O tiro no Y'],
    ['xbox-hangar', 'O hangar: as dicas no controle'],
    ['xbox-pausa', 'START abre a pausa'],
    ['xbox-nave-perdida', 'A tela de nave perdida: as dicas no controle'],
  ]],
  ['Com um controle de PlayStation (simulado)', 'O jogo reconhece a família pelo nome do aparelho e troca os nomes e os ícones.', [
    ['ps-controles', 'A aba com os botões do PlayStation'],
  ]],
];
const falta = GRUPOS.flatMap((g) => g[2]).filter(([n]) => !fs.existsSync(path.join(DIR, `${n}.png`))).map(([n]) => n);
if (falta.length) { console.error('missing photos:', falta.join(', ')); process.exit(1); }
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bloco M2 · os controles</title>
<style>
body{background:#0b0d14;color:#cdd3e0;font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:1800px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 2px;color:#fff}p{margin:0 0 12px;color:#9aa3b5;max-width:900px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:16px}
figure{margin:0}img{width:100%;image-rendering:pixelated;display:block;border:1px solid #232838}
figcaption{padding:6px 2px;font-size:13px}
</style>
<h1>Bloco M2 · os controles</h1>
<p>Fotos tiradas do jogo em 14/11 com um controle SIMULADO (o navegador automático não tem controle de verdade). Para conferir com o seu: ligue o controle, aperte qualquer botão, e abra CONFIGURAÇÕES → CONTROLES.</p>
${GRUPOS.map(([titulo, texto, fotos]) => `<h2>${titulo}</h2><p>${texto}</p><div class="g">${fotos.map(([n, leg]) => `<figure><img src="${n}.png" alt=""><figcaption>${leg}</figcaption></figure>`).join('')}</div>`).join('\n')}
</html>`;
fs.writeFileSync(path.join(DIR, 'controles.html'), html);
console.log('folha:', path.join(DIR, 'controles.html'));
