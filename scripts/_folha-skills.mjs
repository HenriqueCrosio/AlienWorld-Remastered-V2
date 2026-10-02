// A FOLHA DAS SKILLS: as 24 cartas, por categoria — o ícone aprovado, a raridade, o que a carta faz (com os números
// provisórios de hoje) e o GIF dela em jogo (ou, nas de número puro, por que não tem GIF). Uma página HTML ao lado dos
// GIFs, que a amplia 2× sem suavizar (os GIFs saem no pixel nativo: `scripts/_gifs-das-cartas.sh`).
// Uso, da raiz: node scripts/_folha-skills.mjs <pasta-dos-gifs>
import fs from 'fs';
import sharp from 'sharp';
import { CARTAS } from '../src/data/catalogoCartas.ts';
import { COR_RARIDADE, NOME_RARIDADE } from '../src/raridade.ts';

const PASTA = process.argv[2] ?? 'docs/superpowers/folhas/2026-10-02/skills';
const ICONES = '../../2026-10-01/pecas-novas/icones-finais';
const AMPLIA = 2;

/** O que a carta faz EM JOGO, hoje. Sem GIF = efeito de número (não há o que filmar). */
const COMO = {
  WPN_001: 'Dois tiros paralelos. No GIF: em cima, a nave sem a carta; embaixo, com ela.',
  WPN_002: 'Três tiros em leque curto (±5°). Substitui o Duplo.',
  WPN_004: '+15% de tiros por segundo por carta (até ×3, +52%).',
  WPN_007: 'O tiro atravessa inimigos — cada um leva o dano uma vez. Rocha ainda para o tiro.',
  WPN_008: 'Dano ×2; o tiro sai 30% mais lento e 30% maior.',
  WPN_009: 'A cada 3s. Trava a mira no disparo; ×2 = um alvo para cada, o 2º sai 140ms depois. Persegue com inércia: erra, faz a curva e volta. No fim da vida (2,5s) explode no ar.',
  WPN_010: 'Segue a nave e dá um tiro próprio — fraco, guiado, a cada 1,2s, até 160px —, laranja na humana, ciano na manta. Não copia as cartas da nave. Desvia de LADO de quem passa.',
  EFF_001: 'O tiro explode ao acertar (raio 18px, 1 de dano). O leque abre para o lado de onde o tiro veio.',
  EFF_002: 'Toda explosão do jogador fica 50% maior (18 → 27px) — e o impacto troca para o leque grande.',
  EFF_003: 'Toda explosão solta 5 estilhaços: em leque para a frente, se veio de um tiro; em círculo, se não. Estilhaço não explode de novo.',
  EFF_004: '25% de chance de pôr fogo: 1 de dano a cada 0,4s por 2s.',
  EFF_006: 'O queimado que morre explode em fogo (raio 26px, 2 de dano).',
  EFF_007: 'Toda explosão incendeia quem está no raio — com a Combustão, um queimado puxa o outro.',
  EFF_010: 'O jogador solta (tecla L, provisória; espera de 8s; "FLARE 6s" contando na HUD). Fica para trás, freando: explode em quem tocar, ou sozinho em 3s.',
  EFF_011: '20% de chance de eletrificar: o inimigo trava 0,4s — não anda, não atira. Chefões e a aranha levam o choque mas não travam.',
  EFF_012: 'O choque salta para até 3 próximos (50px), um por vez, sem voltar. O raio é desenhado em pixel.',
  EFF_013: 'O eletrificado que morre solta um pulso (30px, 2 de dano). O pulso não eletrifica.',
  DEF_001: 'Absorve 1 golpe e volta em 8s. A aura é o contorno de 1px da silhueta da nave; no golpe, estoura.',
  DEF_002: 'Sem GIF (número): o Casco volta em 5,5s em vez de 8s. Máx. 1.',
  DEF_003: 'Sem GIF (número): +1 vida (um ♦ a mais na HUD).',
  DEF_004: 'O casco partido explode (raio 40px, 3 de dano).',
  DEF_005: 'Sem GIF (número): +1 bomba por vida — "B×4" na HUD (×2: "B×5").',
  MOV_001: 'Sem GIF (número): +12% de velocidade no voo livre, por carta. Fora da F1.',
  MOV_003: 'Dois toques numa direção: ~40px em 0,15s, invulnerável por 0,2s, com imagens-fantasma. Espera de 8s ("DASH 5s" contando na HUD). Fora da F1.',
};
const CATEGORIAS = [['arma', '🔫 Armamento'], ['efeito', '💥 Efeito'], ['defesa', '🛡️ Defesa'], ['movimento', '⚡ Movimento']];
const hex = (n) => `#${n.toString(16).padStart(6, '0')}`;

let corpo = '';
for (const [cat, titulo] of CATEGORIAS) {
  corpo += `<h2>${titulo}</h2><div class="grade">`;
  for (const c of Object.values(CARTAS).filter((x) => x.categoria === cat)) {
    const gif = `${PASTA}/${c.id}.gif`;
    let midia = '<div class="sem">sem GIF — efeito de número</div>';
    if (fs.existsSync(gif)) {
      const m = await sharp(gif).metadata();
      midia = `<img class="gif" src="${c.id}.gif" width="${m.width * AMPLIA}" height="${(m.pageHeight ?? m.height) * AMPLIA}" alt="${c.nome} em jogo">`;
    }
    const cor = hex(COR_RARIDADE[c.raridade]);
    corpo += `<article style="--cor:${cor}">
  <header><img class="icone" src="${ICONES}/${c.id}.png" alt=""><div><h3>${c.nome}</h3><p class="meta"><span class="rar">${NOME_RARIDADE[c.raridade]}</span> · ${c.id} · máx. ${c.max}${c.requer ? ` · requer ${CARTAS[c.requer].nome}` : ''}</p><p class="curto">${c.curto}</p></div></header>
  <p class="como">${COMO[c.id] ?? ''}</p>
  ${midia}
</article>`;
  }
  corpo += '</div>';
}

const html = `<!doctype html>
<html lang="pt-br"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>As 24 cartas em jogo</title>
<style>
  :root { --fundo:#0b0d14; --cartao:#141824; --texto:#d8deea; --fraco:#8a93a6; --ouro:#ffb040; }
  body { margin:0; padding:24px 16px 48px; background:var(--fundo); color:var(--texto); font:15px/1.45 system-ui, sans-serif; }
  h1 { margin:0 0 4px; font-size:24px; } .sub { color:var(--fraco); margin:0 0 24px; max-width:900px; }
  h2 { margin:32px 0 12px; color:var(--ouro); font-size:19px; }
  .grade { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 580px), 1fr)); gap:16px; }
  article { background:var(--cartao); border:1px solid #232a3a; border-left:4px solid var(--cor); border-radius:8px; padding:14px; min-width:0; }
  header { display:flex; gap:12px; align-items:center; }
  .icone { width:80px; height:80px; image-rendering:pixelated; flex:none; }
  h3 { margin:0; font-size:17px; letter-spacing:.02em; } .meta { margin:2px 0 0; color:var(--fraco); font-size:13px; }
  .rar { color:var(--cor); font-weight:600; } .curto { margin:4px 0 0; font-weight:600; font-size:13px; }
  .como { margin:10px 0; } .gif { image-rendering:pixelated; max-width:100%; height:auto; display:block; border-radius:4px; }
  .sem { color:var(--fraco); font-style:italic; padding:16px; border:1px dashed #2c3446; border-radius:4px; text-align:center; }
</style></head><body>
<h1>As 24 cartas em jogo</h1>
<p class="sub">Cada skill na F2, com a nave atirando (ou o lançador disparando) em alvos postos à mão. Os números são os provisórios de hoje (calibragem é a frente C). A explosão já é a arte aprovada (A + B); o resto da arte das peças — drones, mísseis, tiros finos, estilhaço, faísca, eletrificado — ainda é provisória. GIFs em 20 qps, velocidade real, ampliados 2× sem suavizar.</p>
${corpo}
</body></html>`;
fs.writeFileSync(`${PASTA}/index.html`, html);
console.log(`${PASTA}/index.html`);
