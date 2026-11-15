// BLOCK M3 (15/11) — the sheet of the SHIP LOST window, from the photos of `_derrota-fotos.mjs`.
//   node scripts/_m/_derrota-folha.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2];
if (!DIR) { console.error('usage: _derrota-folha.mjs <dir>'); process.exit(1); }
const GRUPOS = [
  ['A janela nas quatro fases', 'A morte da nave corre inteira; quando termina, a fase para no último quadro, escurece e a janela entra. Os pontos e o recorde já parados; a medalha só quando há uma.', [
    ['f1-sem-medalha', 'F1: abaixo do bronze, a linha da medalha não existe e a janela fica mais baixa'],
    ['f2-recorde-prata', 'F2: o recorde batido (o rótulo acende) e a medalha de prata'],
    ['f3-ouro', 'F3, a fase clara: a medalha de ouro, sem bater o recorde'],
    ['f4-bronze', 'F4: a medalha de bronze'],
  ]],
  ['As três linhas', 'O cursor nasce em TENTAR DE NOVO: um toque no tiro recomeça a fase. Nenhuma linha pede confirmação; o ESC vai direto ao menu.', [
    ['f2-cursor-config', 'O cursor em CONFIGURAÇÕES'],
    ['f2-config', 'A janela grande das configurações por cima; o ESC volta para a NAVE PERDIDA'],
    ['f2-cursor-sair', 'O cursor em SAIR PARA O MENU'],
  ]],
  ['A dica pelo aparelho em uso', 'Embaixo da janela: a tecla de tiro e o ESC no teclado, os botões no controle.', [
    ['controle-xbox', 'Com um controle de Xbox (simulado)'],
    ['controle-ps', 'Com um controle de PlayStation (simulado)'],
  ]],
  ['A reserva, sem a camada de texto nítido', 'O modo de reserva (?semhd): tudo legível, na fonte de pixel.', [
    ['semhd-recorde-ouro', 'O recorde batido e a medalha de ouro'],
  ]],
];
const falta = GRUPOS.flatMap((g) => g[2]).filter(([n]) => !fs.existsSync(path.join(DIR, `${n}.png`))).map(([n]) => n);
if (falta.length) { console.error('missing photos:', falta.join(', ')); process.exit(1); }
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bloco M3 · a NAVE PERDIDA</title>
<style>
body{background:#0b0d14;color:#cdd3e0;font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:1800px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 2px;color:#fff}p{margin:0 0 12px;color:#9aa3b5;max-width:900px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:16px}
figure{margin:0}img{width:100%;image-rendering:pixelated;display:block;border:1px solid #232838}
figcaption{padding:6px 2px;font-size:13px}
</style>
<h1>Bloco M3 · a janela da NAVE PERDIDA</h1>
<p>Fotos tiradas do jogo em 15/11. Para jogar: perca a nave em qualquer fase. A "FASE COMPLETA" do treino de dev ficou como estava.</p>
${GRUPOS.map(([titulo, texto, fotos]) => `<h2>${titulo}</h2><p>${texto}</p><div class="g">${fotos.map(([n, leg]) => `<figure><img src="${n}.png" alt=""><figcaption>${leg}</figcaption></figure>`).join('')}</div>`).join('\n')}
</html>`;
fs.writeFileSync(path.join(DIR, 'nave-perdida.html'), html);
console.log('folha:', path.join(DIR, 'nave-perdida.html'));
