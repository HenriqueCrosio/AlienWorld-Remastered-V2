// O TEMPO DO CENÁRIO DO MENU (spec 2026-10-19-menu-refeito-design.md §3–4). Uso, da raiz: node scripts/test-menu-ritmos.mjs
import { lcg, hash4, suave } from '../src/menu/acaso.ts';
import { TRAVESSIA, FAROIS, TRAFEGO, TEMPESTADE, HOLOFOTES } from '../src/menu/numerosMenu.ts';
import {
  janelaApagada, farolApagado, torres, travessia, pontoTrafego, luzesDaNave, anguloHolofote, forcaPropulsor,
  alfaEstrela, brilhoRelampago,
} from '../src/menu/ritmos.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};

// ── O ACASO ──
const a = lcg(23), b = lcg(23);
const sa = [a(), a(), a()], sb = [b(), b(), b()];
conferir(JSON.stringify(sa) === JSON.stringify(sb), 'o LCG é determinístico (a mesma semente, a mesma sequência)', [sa, sb]);
conferir(sa.every((v) => v >= 0 && v < 1), 'o LCG fica em [0, 1)', sa);
// O primeiro sorteio da semente 23 nas maquetes (window.__rnd(23)): o mesmo número aqui.
conferir(Math.abs(lcg(23)() - (((23 * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)) < 1e-12, 'é o LCG das maquetes', null);
conferir(hash4(1, 2, 3, 4) === hash4(1, 2, 3, 4) && hash4(1, 2, 3, 4) !== hash4(1, 2, 3, 5), 'o hash é estável e muda com a entrada', null);
conferir(suave(0, 1, -1) === 0 && suave(0, 1, 2) === 1 && suave(0, 1, 0.5) === 0.5, 'o smoothstep', null);

// ── OS NÚMEROS ──
conferir(TRAVESSIA.seg === 120 && TRAVESSIA.pausa === 6, "a travessia (22/10): 120 s, 6 s de pausa", TRAVESSIA);
conferir(FAROIS.ciclo === 2.3 && FAROIS.acesoAte === 1.4, 'o farol: 1,4 s aceso a cada 2,3 s', FAROIS);
conferir(TRAFEGO.pontes.length === 5, 'cinco pontes', TRAFEGO.pontes.length);
conferir(TEMPESTADE.focos.length === 3 && TEMPESTADE.raios.length === 3, 'três focos e três raios', null);
conferir(HOLOFOTES.length === 3, 'três holofotes', HOLOFOTES.length);

// ── AS JANELAS E OS FARÓIS (§3.2) ──
const jan = { ciclo: 5, fora: 1, fase: 0, falha: false };
conferir(janelaApagada(jan, 0.5) && !janelaApagada(jan, 2), 'a janela apaga `fora` s a cada ciclo', null);
const falha = { ...jan, falha: true };
conferir(janelaApagada(falha, 0.05) && !janelaApagada(falha, 0.1), 'com falha, ela pisca a 12 Hz antes de apagar', null);
conferir(!farolApagado(0, 0.5) && farolApagado(0, 1.5) && !farolApagado(0, 2.4), 'o farol: aceso até 1,4 s, apagado até 2,3 s', null);
const raizes = torres([{ x: 10, y: 10, w: 1, h: 1 }, { x: 10.5, y: 18, w: 1, h: 1 }, { x: 40, y: 10, w: 1, h: 1 }]);
conferir(raizes[0] === raizes[1] && raizes[2] !== raizes[0], 'dois faróis na mesma coluna são uma torre; o longe é outra', raizes);

// ── A TRAVESSIA EM LOOP (§3.1) ──
// 22/10: quando o título acende (9 s), ele está onde estava na travessia de 45 s aprovada em 19/10 (x ≈ 254,4).
const antigoNoTitulo = 200 + (204 * (9 + 3)) / 45;
conferir(Math.abs(travessia(9).x - antigoNoTitulo) < 0.3, 'no título, o Leviatã está no lugar de 19/10', [travessia(9).x, antigoNoTitulo]);
const fim = TRAVESSIA.seg - (TRAVESSIA.noTitulo.u * TRAVESSIA.seg - TRAVESSIA.noTitulo.t); // o instante em que u = 1
conferir(travessia(fim + 0.01).x === 404 && travessia(fim + 5.9).x === 404, 'sai pela direita e o céu fica vazio por 6 s', [travessia(fim + 0.01).x, travessia(fim + 5.9).x]);
conferir(travessia(fim + 6.1).x < 201, 'e volta a sair da nuvem: loop de seg + 6 s', travessia(fim + 6.1));
conferir(Math.abs(travessia(fim + 0.01).y - 42) < 1e-6 && Math.abs(travessia(fim + 6.01).y - 30) < 0.01, 'a onda zera nas pontas (chega e sai no mesmo lugar)', [travessia(fim + 0.01).y, travessia(fim + 6.01).y]);
{
  // Sem degraus nem trancos: de 1/30 s em 1/30 s, a posição exata anda pouco e sempre (o arredondamento é do desenho).
  let maxDy = 0, maxDx = 0;
  for (let t = 0; t < fim - 1 / 30; t += 1 / 30) {
    const p = travessia(t), q = travessia(t + 1 / 30);
    maxDy = Math.max(maxDy, Math.abs(q.y - p.y));
    maxDx = Math.max(maxDx, Math.abs(q.x - p.x));
  }
  conferir(maxDy < 0.05 && maxDx < 0.1 && maxDx > 0, 'contínua: < 0,05 px em y e < 0,1 px em x por quadro', { maxDy, maxDx });
}
conferir(travessia(1).quadro === 6 % 16, 'nada a 6 quadros/s', travessia(1).quadro);

// ── O TRÁFEGO (§3.3) ──
const ponte = [0, 0, 100, 0];
conferir(pontoTrafego(ponte, 0, 0, 0, 0).alfa === 0, 'na ponta do deque a luz some (não atravessa a parede)', null);
const meio = pontoTrafego(ponte, 0.5, 0, 0, 0);
conferir(meio.alfa > 0.3 && Math.abs(meio.x - 50.5) < 1e-9, 'no meio, acesa e no centro do pixel', meio);
conferir(TRAFEGO.pontes.every(([x0, , x1]) => x1 > x0), 'as pontes vão da esquerda para a direita', null);

// ── A NAVE E OS HOLOFOTES (§3.4, §4) ──
const n0 = luzesDaNave(0);
conferir(n0.fileira[0] === 1 && n0.fileira.slice(1).every((a) => a === 0.35), 'a fileira corre: uma acesa, as outras a 0,35', n0.fileira);
conferir(luzesDaNave(0.1).topo && !luzesDaNave(0.5).topo, 'o farol do topo pisca 0,25 s a cada 1,6 s', null);
const h = HOLOFOTES[0];
conferir(anguloHolofote(h, 0) === h.base, 'o holofote começa na base', anguloHolofote(h, 0));
const angs = Array.from({ length: 200 }, (_, i) => anguloHolofote(h, i * 0.37));
conferir(angs.every((a) => Math.abs(a - h.base) <= h.amp * 1.25 + 1e-9), 'e varre só dentro da faixa dele', null);
conferir(Array.from({ length: 50 }, (_, i) => forcaPropulsor(1, i * 0.03)).every((f) => f >= 0.5 && f <= 1), 'o propulsor treme entre 0,5 e 1', null);
conferir(Array.from({ length: 50 }, (_, i) => alfaEstrela(1.2, 0.3, i * 0.1)).every((a) => a >= 0.35 && a <= 1), 'a estrela cintila entre 0,35 e 1', null);

// ── O RELÂMPAGO (§4.3) ──
const r0 = brilhoRelampago(0.01), r1 = brilhoRelampago(0.08), r2 = brilhoRelampago(0.12);
conferir(r0.v === 1 && r0.raio === 1, 'o 1º golpe: clarão inteiro, com o raio', r0);
conferir(r1.raio === 0 && r1.v > 0 && r1.v < 1, 'entre os golpes, o raio some e o clarão decai', r1);
conferir(r2.raio === 0.5, 'o 2º golpe é mais fraco', r2);
conferir(brilhoRelampago(2).v === 0 && brilhoRelampago(-0.1).v === 0, 'fora do relâmpago, nada', null);
const golpesPorSegundo = TEMPESTADE.golpes.length / (TEMPESTADE.golpes.at(-1)[0] + TEMPESTADE.golpes.at(-1)[2]);
conferir(TEMPESTADE.golpes.length <= 3, `no máximo 3 clarões por relâmpago (${golpesPorSegundo.toFixed(1)}/s num instante)`, null);
conferir(FAROIS.margem === 3, 'a peça do farol leva o halo (3 px)', FAROIS.margem);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
