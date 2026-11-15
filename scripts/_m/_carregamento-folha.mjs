// BLOCK M4 (15/11) — the sheet of the loading screen, from the photos of `_carregamento-fotos.mjs`.
//   node scripts/_m/_carregamento-folha.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2];
if (!DIR) { console.error('usage: _carregamento-folha.mjs <dir>'); process.exit(1); }
const GRUPOS = [
  ['A cena', 'A sua pintura assada em 384×216. Entre um clarão e outro: a neblina em duas faixas andando, a luz quente da doca presa na névoa, as luzes pulsando e a chuva fina.', [
    ['quieta', 'Entre dois clarões'],
  ]],
  ['Os clarões atrás das nuvens', 'Seis pontos do céu, cada um no seu relógio. Não há raio desenhado: a massa de nuvens acende por dentro, mais forte onde ela é fina, e as partes grossas ficam em silhueta.', [
    ['clarao-1', ''], ['clarao-2', ''], ['clarao-3', ''], ['clarao-4', ''], ['clarao-5', ''],
  ]],
  ['O fim do carregamento', 'A barra completa, a nave acelera e sai pela direita, a cena escurece e o menu entra.', [
    ['fim-cheia', 'A barra cheia'],
    ['fim-saindo', 'A nave saindo, a cena escurecendo'],
    ['fim-menu', 'O menu'],
  ]],
  ['Com "reduzir clarões" ligado', 'A tempestade só brilha devagar, sem piscar (o quadro mais claro da filmagem).', [
    ['calma', ''],
  ]],
];
const fotos = GRUPOS.map(([t, p, fs2]) => [t, p, fs2.filter(([n]) => fs.existsSync(path.join(DIR, `${n}.png`)))]);
const dados = JSON.parse(fs.readFileSync(path.join(DIR, 'fotos.json'), 'utf8'));
const peso = fs.readdirSync('public/carregamento').map((f) => [f, fs.statSync(path.join('public/carregamento', f)).size]);
const total = peso.reduce((s, [, b]) => s + b, 0);
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bloco M4 · o carregamento</title>
<style>
body{background:#0b0d14;color:#cdd3e0;font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:1800px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 2px;color:#fff}p{margin:0 0 12px;color:#9aa3b5;max-width:900px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:16px}
figure{margin:0}img{width:100%;image-rendering:pixelated;display:block;border:1px solid #232838}
figcaption{padding:6px 2px;font-size:13px}
table{border-collapse:collapse;font-size:13px}td{padding:2px 14px 2px 0;color:#9aa3b5}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
code{background:#161a26;padding:1px 5px;border-radius:3px}
.fav{display:flex;gap:18px;align-items:end}.fav img{width:auto;border:0}
</style>
<h1>Bloco M4 · a tela de carregamento e o favicon</h1>
<p>Fotos tiradas do jogo em 15/11. <b>Para ver em movimento</b> (o carregamento local dura menos de um segundo): abra <code>http://localhost:5173/?carregamento=20</code>, que segura a tela por 20 segundos.</p>
${fotos.map(([titulo, texto, fs2]) => `<h2>${titulo}</h2><p>${texto}</p><div class="g">${fs2.map(([n, leg]) => `<figure><img src="${n}.png" alt="">${leg ? `<figcaption>${leg}</figcaption>` : ''}</figure>`).join('')}</div>`).join('\n')}
<h2>O favicon</h2><p>A nave padrão sobre o escuro do jogo, em SVG de grade de pixel (com um PNG de reserva). Abaixo, em 16, 32 e 96 px.</p>
<div class="fav"><img src="../../../../../public/favicon.svg" width="16" height="16" alt=""><img src="../../../../../public/favicon.svg" width="32" height="32" alt=""><img src="../../../../../public/favicon.svg" width="96" height="96" alt=""></div>
<h2>O peso</h2><p>${(total / 1024).toFixed(1)} KB em ${peso.length} arquivos, todos na resolução do jogo. A filmagem mediu a claridade média da tela entre ${dados.brilho.quieta} (quieta) e ${Math.max(...dados.brilho.picos)} (o clarão mais forte), de 0 a 255.</p>
<table>${peso.map(([f, b]) => `<tr><td>${f}</td><td>${(b / 1024).toFixed(1)} KB</td></tr>`).join('')}</table>
</html>`;
fs.writeFileSync(path.join(DIR, 'carregamento.html'), html);
console.log('folha:', path.join(DIR, 'carregamento.html'));
