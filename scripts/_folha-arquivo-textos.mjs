// A FOLHA DOS TEXTOS DO ARQUIVO, para ele revisar (descrição, números, tecla) — plano 2026-10-04-arquivo-de-cartas,
// Task 2. Uso, da raiz: node scripts/_folha-arquivo-textos.mjs
import fs from 'fs';
import { CARTAS } from '../src/data/catalogoCartas.ts';
import { numerosDaCarta } from '../src/data/numerosCartas.ts';

const OUT = 'docs/superpowers/folhas/2026-10-04/arquivo';
const RAIZ = '../../../../..';
const GRUPO = { arma: 'ARMAMENTO', efeito: 'EFEITO', defesa: 'DEFESA', movimento: 'MOVIMENTO' };
const COR = { comum: '#a8b0bc', incomum: '#4fc85a', rara: '#4f8fe8', epica: '#b06ae0' };
const TECLA = { WPN_009: 'tecla Q (clássico: V)', EFF_010: 'tecla F', MOV_003: 'tecla E (clássico: C)' };

fs.mkdirSync(OUT, { recursive: true });
const cartao = (c) => `<article style="--cor:${COR[c.raridade]}">
  <div class="ic"><img class="g" src="${RAIZ}/public/sprites/cartas/icone-${c.id}.png" alt=""></div>
  <div class="tx"><h3>${c.nome}</h3>
  <p class="meta"><b>${c.raridade.toUpperCase()}</b> · ${GRUPO[c.categoria]} · máx. ${c.max} · na mesa: “${c.curto}”</p>
  <p class="d">${c.descricao}</p>
  <p class="n">${[numerosDaCarta(c.id), TECLA[c.id]].filter(Boolean).join(' · ') || '— sem números —'}</p></div>
</article>`;
const grupos = Object.keys(GRUPO)
  .map((g) => `<h2>${GRUPO[g]}</h2>${Object.values(CARTAS).filter((c) => c.categoria === g).map(cartao).join('\n')}`)
  .join('\n');
fs.writeFileSync(
  `${OUT}/descricoes.html`,
  `<!doctype html><html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Arquivo: os textos</title>
<style>
  body { background:#0b0d14; color:#d8deea; font:15px/1.45 system-ui, sans-serif; margin:0 auto; padding:24px 16px 48px; max-width:920px; }
  h1 { margin:0 0 4px; font-size:22px; } .sub { color:#8a93a6; margin:0 0 16px; }
  h2 { color:#ffb040; margin:28px 0 8px; font-size:18px; }
  article { display:flex; gap:16px; background:#141824; border-left:4px solid var(--cor); border-radius:8px; padding:12px; margin:8px 0; }
  .ic { display:flex; gap:12px; align-items:center; flex:none; } img { image-rendering:pixelated; }
  .g { width:120px; } .tx { min-width:0; }
  h3 { margin:0; font-size:16px; } .meta { color:#8a93a6; font-size:13px; margin:2px 0; } .meta b { color:var(--cor); }
  .d { margin:6px 0; font-size:16px; } .n { font-family:Consolas, monospace; color:#7fe0ff; margin:0; font-size:13px; }
  @media (max-width:600px) { article { flex-direction:column; } }
</style></head><body>
<h1>Arquivo de cartas — os textos para revisar</h1>
<p class="sub">Para cada carta: o ícone (ampliado 3×); a descrição que o jogador lê — direta, sem número; e, logo abaixo, os números (saem do código e acompanham a calibragem) e a tecla nas ativas. Rodada 2 (04/10), no estilo direto.</p>
${grupos}
</body></html>`,
);
console.log(`${OUT}/descricoes.html`);
