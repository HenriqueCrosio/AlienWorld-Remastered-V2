// O RELÓGIO DO CENÁRIO DA F1 (spec 2026-10-20-f1-cenario-design.md §4). Uso, da raiz: node scripts/test-f1-ritmos.mjs
import fs from 'node:fs';
import { PINTURA, CHAO_F1, PLANTIO_F1, BRUMA_F1, BRASAS_F1, PROF, AGLOMERADOS_F1 } from '../src/f1/numerosF1.ts';
import { derivaPintura, brasaApagada } from '../src/f1/ritmosF1.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

// ── A PINTURA ──
conferir(PINTURA.largura === 429 && PINTURA.altura === 216, 'a pintura inteira: 1768×890 reduzida à altura 216 dá 429×216', PINTURA);
conferir(PINTURA.largura - 384 === PINTURA.derivaMax, 'a deriva é a SOBRA da pintura (429 − 384 = 45)', PINTURA.derivaMax);
conferir(PROF.pintura > -95.5, 'o horizonte fica NA FRENTE da pintura do zero-G (−95,5), que só aparece quando ele se apaga', PROF);

// ── A DERIVA ──
conferir(derivaPintura(0) === 0, 'parada no começo da fase', derivaPintura(0));
conferir(derivaPintura(-3) === 0, 'nunca anda para trás do começo', derivaPintura(-3));
conferir(derivaPintura(PINTURA.derivaSeg) === 45, 'chega a 45 px em 110 s', derivaPintura(PINTURA.derivaSeg));
conferir(derivaPintura(400) === 45, 'e para (a luta do chefão pode durar o quanto for)', derivaPintura(400));
let monotona = true, inteira = true, anterior = -1;
for (let t = 0; t <= 130; t += 0.25) {
  const d = derivaPintura(t);
  if (d < anterior) monotona = false;
  if (!Number.isInteger(d)) inteira = false;
  anterior = d;
}
conferir(monotona, 'só anda para a frente', null);
conferir(inteira, 'sempre em pixel inteiro (a grade da pintura casa com a da tela)', null);

// ── AS CAMADAS ──
const { vale, paisagem, frente, perto } = CHAO_F1;
conferir(vale.fator < paisagem.fator && paisagem.fator < 1 && 1 < frente.fator && frente.fator < perto.fator, 'Vale < Paisagem < mundo < frente < primeiro plano, em velocidade', CHAO_F1);
conferir(vale.depth < paisagem.depth && paisagem.depth < -0.53 && frente.depth > -0.5 && frente.depth < 0 && perto.depth > 0, 'Vale < Paisagem < estruturas (−0,5…−0,52) < frente < nave (0) < primeiro plano', CHAO_F1);
conferir(vale.queda < paisagem.queda && paisagem.queda < frente.queda && frente.queda < perto.queda, 'na saída, a faixa mais longe cai menos', CHAO_F1);

// ── OS AGLOMERADOS (rodada 6) ──
conferir(AGLOMERADOS_F1.depth > paisagem.depth && AGLOMERADOS_F1.depth < -84, 'os aglomerados ficam entre a Paisagem e a névoa rasteira (atrás das estruturas)', AGLOMERADOS_F1);
conferir(AGLOMERADOS_F1.fator > paisagem.fator && AGLOMERADOS_F1.fator < 1, 'e andam entre a Paisagem e o mundo (camada de trás, mais lenta)', AGLOMERADOS_F1);
const cobreDe = JSON.parse(fs.readFileSync('public/sprites/f1/chao.json', 'utf8')).frente.cobreDe;
conferir(AGLOMERADOS_F1.baseY > cobreDe, 'o pé deles fica atrás do entulho da frente', { baseY: AGLOMERADOS_F1.baseY, cobreDe });

// ── AS BRASAS ──
const terços = [0, 1, 2].map(() => ({ min: 1, max: 0 }));
let sempreNaFaixa = true, juntas = 0;
for (let t = 0; t < 60; t += 0.05) {
  const v = [0, 1, 2].map((g) => brasaApagada(t, g));
  v.forEach((x, g) => { terços[g].min = Math.min(terços[g].min, x); terços[g].max = Math.max(terços[g].max, x); if (x < 0 || x > BRASAS_F1.max) sempreNaFaixa = false; });
  if (Math.abs(v[0] - v[1]) < 0.02 && Math.abs(v[1] - v[2]) < 0.02) juntas++;
}
conferir(sempreNaFaixa, 'a brasa nunca se apaga de todo (fica entre 0 e o máximo)', null);
conferir(terços.every((g) => g.min < 0.05 && g.max > 0.4), 'cada terço passa por aceso e por quase apagado em um minuto', terços);
conferir(juntas < 12, 'os três terços quase nunca coincidem (não piscam em uníssono)', juntas);
conferir(BRUMA_F1[1].depth > vale.depth && BRUMA_F1[1].depth < paisagem.depth, 'a bruma de baixo passa ENTRE o Vale e a Paisagem', BRUMA_F1);
conferir(BRUMA_F1.every((b) => b.pico <= 0.25), 'a bruma é leve (nunca tapa o jogo)', BRUMA_F1);
const chao = JSON.parse(fs.readFileSync('public/sprites/f1/chao.json', 'utf8'));
conferir(PLANTIO_F1.fundo > chao.frente.cobreDe, 'o pé mais alto fica abaixo do topo mais baixo da faixa da frente (pé sempre escondido)', { plantio: PLANTIO_F1, cobreDe: chao.frente.cobreDe });
conferir(PLANTIO_F1.frente < 216, 'e o mais fundo ainda dentro da tela', PLANTIO_F1);
conferir(PLANTIO_F1.frente - PLANTIO_F1.fundo + 1 > 2 * PLANTIO_F1.saltoMin, 'o salto mínimo sempre deixa altura para sortear', PLANTIO_F1);
for (const n of ['vale', 'paisagem', 'frente', 'perto']) conferir(chao[n].y + chao[n].h === 216, `a faixa ${n} chega ao rodapé`, chao[n]);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
