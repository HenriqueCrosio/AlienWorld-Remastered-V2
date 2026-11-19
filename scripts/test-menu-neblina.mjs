// A NEBLINA E A CHUVA DO MENU DA NOITE (spec 2026-11-19-menu-neblina-chuva-design.md §1–2, §6): o arco preso à faixa da
// tempestade e o atraso do trovão. Uso, da raiz: node scripts/test-menu-neblina.mjs
import { NEBLINA, CHUVA } from '../src/menu/numerosMenu.ts';
import { arcoDaTempestade, DURACAO_TEMPESTADE } from '../src/menu/tempoDaTempestade.ts';
import { TROVAO } from '../src/som/regrasAmbiente.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const neb = (t) => NEBLINA.piso + (1 - NEBLINA.piso) * arcoDaTempestade(NEBLINA.arco, t);
const chuva = (t) => arcoDaTempestade(CHUVA.arco, t);
const amostra = (a, b, passo = 0.5) => { const r = []; for (let t = a; t <= b; t += passo) r.push(t); return r; };

// ── A NEBLINA: o piso desde o primeiro quadro, densa no pico, de volta ao piso no fim ──
conferir(neb(0) === NEBLINA.piso && NEBLINA.piso > 0.5, 'o menu abre com o piso da neblina (já cobre as bordas)', neb(0));
conferir(amostra(100, 240).every((t) => neb(t) > 0.99), 'densa no pico e depois da chuva (1:40–4:00)', neb(150));
conferir(amostra(0, DURACAO_TEMPESTADE).every((t) => neb(t) >= NEBLINA.piso - 1e-9), 'nunca abaixo do piso', null);
conferir(Math.abs(neb(DURACAO_TEMPESTADE - 0.01) - neb(0)) < 0.01, 'a volta da faixa (6:16 → 0:00) não dá salto', [neb(DURACAO_TEMPESTADE - 0.01), neb(0)]);
conferir(Math.abs(neb(DURACAO_TEMPESTADE + 30) - neb(30)) < 1e-9, 'em laço com a faixa', null);
const saltoNeb = Math.max(...amostra(0, DURACAO_TEMPESTADE, 1 / 30).map((t) => Math.abs(neb(t + 1 / 30) - neb(t))));
conferir(saltoNeb < 0.005, 'cresce e abre devagar (< 0,5% por quadro)', saltoNeb);

// ── A CHUVA: acompanha o som ──
conferir(amostra(0, 46).every((t) => chuva(t) === 0), 'nenhum pingo enquanto a chuva da faixa está longe (até 0:46)', chuva(30));
conferir(amostra(78, 130).every((t) => chuva(t) > 0.99), 'o mais visível em 1:18–2:10', chuva(100));
conferir(amostra(240, DURACAO_TEMPESTADE - 0.1).every((t) => chuva(t) === 0), 'some de 4:00 ao fim', chuva(300));

// ── O TROVÃO: o raio visível soa ~1 s depois do clarão; o sem raio, depois ainda ──
conferir(TROVAO.perto.atraso[0] >= 900 && TROVAO.perto.atraso[1] <= 1200, 'o trovão do raio visível vem ~1 s depois do clarão', TROVAO.perto.atraso);
conferir(TROVAO.longe.atraso[0] > TROVAO.perto.atraso[1], 'o trovão sem raio chega depois do com raio', [TROVAO.perto.atraso, TROVAO.longe.atraso]);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
