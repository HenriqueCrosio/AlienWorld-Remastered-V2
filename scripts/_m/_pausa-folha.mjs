// BLOCK M1 (14/11) — the sheet of the pause and the settings, from the photos of `_pausa-fotos.mjs`.
//   node scripts/_m/_pausa-folha.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';
const DIR = process.argv[2];
const GRUPOS = [
  ['A pausa (a janela pequena)', 'O ESC congela a cena, escurece o que está atrás e abre a janela. As linhas mudam conforme o lugar.', [
    ['f1-pausa', 'Numa fase escura (F1): as quatro linhas'],
    ['f3-pausa', 'Numa fase clara (F3, a nebulosa)'],
    ['cutscene-pausa', 'Numa cutscene: PULAR A CENA no lugar de REINICIAR'],
    ['hangar-pausa', 'No hangar da escolha: sem REINICIAR'],
    ['f1-confirma', 'REINICIAR e SAIR pedem confirmação, o cursor no NÃO'],
  ]],
  ['As CONFIGURAÇÕES (a janela grande)', 'Abas no topo; Q e E trocam de aba, as setas andam e mudam o valor; tudo é gravado na hora.', [
    ['f1-audio', 'ÁUDIO'],
    ['f1-audio-musica7', 'ÁUDIO: a música em 7'],
    ['f1-controles', 'CONTROLES: o perfil padrão com o mapa'],
    ['f1-controles-classico', 'CONTROLES: o perfil clássico'],
    ['f1-video', 'VÍDEO'],
    ['f1-faixa-das-abas', 'O cursor na faixa das abas'],
    ['f3-audio', 'Sobre a fase clara'],
  ]],
  ['No menu principal', 'A lista ganhou a quarta linha; a janela abre sobre a pintura, que segue viva atrás.', [
    ['menu-noite-lista', 'O menu da noite com CONFIGURAÇÕES'],
    ['menu-noite-config', 'A janela sobre o menu da noite'],
    ['menu-amanhecer-lista', 'O menu do amanhecer'],
    ['menu-amanhecer-config', 'A janela sobre o amanhecer'],
    ['menu-aba-jogo', 'A aba JOGO, só para quem zerou'],
  ]],
  ['A reserva, sem a camada de texto nítido', 'O modo de reserva (?semhd): tudo legível, na fonte de pixel.', [
    ['semhd-pausa', 'A pausa'],
    ['semhd-controles', 'CONTROLES'],
  ]],
];
const falta = GRUPOS.flatMap((g) => g[2]).filter(([n]) => !fs.existsSync(path.join(DIR, `${n}.png`))).map(([n]) => n);
if (falta.length) { console.error('missing photos:', falta.join(', ')); process.exit(1); }
const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Bloco M1 · a pausa e as configurações</title>
<style>
body{background:#0b0d14;color:#cdd3e0;font:14px/1.5 system-ui,sans-serif;margin:24px;max-width:1800px}
h1{font-size:20px;margin:0 0 4px}h2{font-size:16px;margin:32px 0 2px;color:#fff}p{margin:0 0 12px;color:#9aa3b5;max-width:900px}
.g{display:grid;grid-template-columns:repeat(auto-fill,minmax(520px,1fr));gap:16px}
figure{margin:0}img{width:100%;image-rendering:pixelated;display:block;border:1px solid #232838}
figcaption{padding:6px 2px;font-size:13px}
</style>
<h1>Bloco M1 · a pausa e as CONFIGURAÇÕES</h1>
<p>Fotos tiradas do jogo em 14/11. Para jogar: ESC em qualquer fase, cutscene, na mesa de cartas ou no hangar; no menu principal, a linha CONFIGURAÇÕES.</p>
${GRUPOS.map(([titulo, texto, fotos]) => `<h2>${titulo}</h2><p>${texto}</p><div class="g">${fotos.map(([n, leg]) => `<figure><img src="${n}.png" alt=""><figcaption>${leg}</figcaption></figure>`).join('')}</div>`).join('\n')}
</html>`;
fs.writeFileSync(path.join(DIR, 'pausa.html'), html);
console.log('folha:', path.join(DIR, 'pausa.html'));
