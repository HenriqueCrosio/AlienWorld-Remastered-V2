// OS ELITES DA F2 (spec 2026-10-05-frente-b-elites-design.md §3). Uso, da raiz: node scripts/test-elites-regras.mjs
import { ELITES } from '../src/data/numerosElites.ts';
import {
  droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escudoAbsorve, escolherPosto,
  cacadorAvanca, cacadorFugaLancada, cacadorQuadro, cacadorTangivel, tintaDoSumico,
} from '../src/elitesRegras.ts';

const falhas = [];
const conferir = (ok, msg, visto) => {
  console.log(`${ok ? 'OK  ' : 'FALHA'} ${msg}${ok ? '' : ` — visto: ${JSON.stringify(visto)}`}`);
  if (!ok) falhas.push(msg);
};
const D = ELITES.drone;
const S = ELITES.sentinela;
const calmo = { dist: 300, ferido: false, rochaViva: true, rochaX: 300 };

// ── O DRONE ──
conferir(droneAvanca('minerando', 5, calmo) === 'minerando', 'longe, intacto e com a rocha: segue minerando', calmo);
conferir(droneAvanca('minerando', 0, { ...calmo, dist: D.raioAlerta }) === 'alerta', 'a nave chegou perto: acorda', D.raioAlerta);
conferir(droneAvanca('minerando', 0, { ...calmo, ferido: true }) === 'alerta', 'levou tiro: acorda', null);
conferir(droneAvanca('minerando', 0, { ...calmo, rochaViva: false }) === 'alerta', 'a rocha quebrou: acorda na hora', null);
conferir(droneAvanca('minerando', 0, { ...calmo, rochaX: D.acordaAteX }) === 'alerta', 'a rocha passou do meio da tela: acorda (nunca sai minerando)', D.acordaAteX);
conferir(droneAvanca('alerta', D.alertaS - 0.01, calmo) === 'alerta' && droneAvanca('alerta', D.alertaS, calmo) === 'ataque', 'o alerta dura alertaS e vira ataque', D.alertaS);
conferir(droneAvanca('ataque', 1, calmo) === 'ataque', 'atacando, longe: segue atacando', null);
conferir(droneAvanca('ataque', 1, { ...calmo, dist: D.raioPisca }) === 'pisca', 'chegou perto: pisca', D.raioPisca);
conferir(droneAvanca('ataque', D.ataqueMaxS, calmo) === 'pisca', 'atacou tempo demais: pisca mesmo longe', D.ataqueMaxS);
conferir(droneAvanca('pisca', 99, calmo) === 'pisca', 'o pisca não volta atrás', null);
conferir(!droneExplode('pisca', D.piscaS - 0.01) && droneExplode('pisca', D.piscaS), 'explode quando o pisca TERMINA', D.piscaS);
conferir(!droneExplode('ataque', 99) && !droneExplode('minerando', 99), 'fora do pisca nunca explode', null);

// ── A SENTINELA ──
conferir(sentinelaAvanca('rolando', 9, { chegou: false, ciclos: 0 }) === 'rolando', 'rola até chegar ao posto', null);
conferir(sentinelaAvanca('rolando', 0, { chegou: true, ciclos: 0 }) === 'abrir', 'chegou: abre', null);
conferir(sentinelaAvanca('abrir', S.abrirS, { chegou: true, ciclos: 0 }) === 'fogo', 'abriu: fogo', S.abrirS);
conferir(sentinelaAvanca('fogo', S.fogoS - 0.01, { chegou: true, ciclos: 0 }) === 'fogo' && sentinelaAvanca('fogo', S.fogoS, { chegou: true, ciclos: 0 }) === 'sobrecarga', 'o fogo dura fogoS e vira SOBRECARGA', S.fogoS);
conferir(sentinelaAvanca('sobrecarga', S.sobrecargaS - 0.01, { chegou: true, ciclos: 1 }) === 'sobrecarga' && sentinelaAvanca('sobrecarga', S.sobrecargaS, { chegou: true, ciclos: 1 }) === 'fechar', 'a sobrecarga dura sobrecargaS e fecha', S.sobrecargaS);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: 1 }) === 'rolando', 'fechou com ciclos sobrando: rola para outro posto', null);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: S.ciclos }) === 'saindo', `depois de ${S.ciclos} ciclos: vai embora`, S.ciclos);
conferir(sentinelaAvanca('saindo', 99, { chegou: true, ciclos: S.ciclos }) === 'saindo', 'saindo não volta', null);

// O ESCUDO: arco virado para a ESQUERDA (onde está a nave), só aberta.
conferir(sentinelaBloqueia('fogo', 300, 100, 200, 100), 'fogo: tiro de frente é bloqueado', null);
conferir(sentinelaBloqueia('abrir', 300, 100, 200, 110), 'abrir: o escudo já está subindo', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 300, 40), 'fogo: tiro de CIMA passa (flanquear funciona)', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 360, 100), 'fogo: tiro de trás passa', null);
conferir(!sentinelaBloqueia('fechar', 300, 100, 200, 100) && !sentinelaBloqueia('rolando', 300, 100, 200, 100), 'fechada ou rolando: sem escudo', null);
conferir(!sentinelaBloqueia('sobrecarga', 300, 100, 200, 100), 'SOBRECARGA: o escudo caiu — o tiro de frente passa (a 2ª janela)', null);
// A VIDA DO ESCUDO (06/10): segura até zerar; o golpe que zera ainda é segurado; quebrado, o tiro de frente passa.
const HP = ELITES.sentinela.escudoHp;
conferir(escudoAbsorve(HP, 1).hp === HP - 1 && !escudoAbsorve(HP, 1).quebrou, 'o escudo gasta o dano do golpe', HP);
conferir(escudoAbsorve(1, 2).hp === 0 && escudoAbsorve(1, 2).quebrou, 'o golpe que zera QUEBRA o escudo (e não fica negativo)', null);
conferir(!escudoAbsorve(0, 1).quebrou, 'um escudo já quebrado não quebra de novo', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 200, 100, 0), 'quebrado: o tiro de frente passa no fogo', null);
conferir(sentinelaBloqueia('fogo', 300, 100, 200, 100, 1), 'com 1 de vida: ainda segura', null);

// O POSTO: na metade direita, longe do anterior na altura.
const seq = [0.1, 0.12, 0.13, 0.9, 0.5];
let i = 0;
const sorte = () => seq[i++ % seq.length];
const p = escolherPosto(sorte, S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]));
conferir(p.x >= S.postoX[0] && p.x <= S.postoX[1] && p.y >= S.postoY[0] && p.y <= S.postoY[1], 'o posto cai na faixa', p);
conferir(Math.abs(p.y - (S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]))) >= S.postoDistY, 'o posto novo foge da altura do anterior', p);

// ── O CAÇADOR (a lula, spec F3 §2 + emenda de 07/10) ──
const C = ELITES.cacador;
conferir(cacadorAvanca('escondido', C.escondidoS - 0.01, 0) === 'escondido' && cacadorAvanca('escondido', C.escondidoS, 0) === 'surge', 'escondido dura escondidoS e surge', C.escondidoS);
conferir(['surge', 'mira', 'trava', 'rajada'].every((f, k) => cacadorAvanca(f, 99, 1) === ['mira', 'trava', 'rajada', 'some'][k]), 'surge → mira → trava → rajada → some', null);
conferir(cacadorAvanca('mira', C.miraS - 0.01, 1) === 'mira', 'a mira segura o tempo dela (segue a nave)', C.miraS);
conferir(cacadorAvanca('some', C.someS, 1) === 'escondido' && cacadorAvanca('some', C.someS, C.ressurgimentos) === 'foi', `depois do ${C.ressurgimentos}º sumiço vai embora`, null);
conferir(!cacadorTangivel('escondido') && !cacadorTangivel('foi') && ['surge', 'mira', 'trava', 'rajada', 'some'].every(cacadorTangivel), 'escondido não tem corpo; visível, tem', null);
conferir(tintaDoSumico(1) === 'sopro' && tintaDoSumico(C.ressurgimentos - 1) === 'sopro' && tintaDoSumico(C.ressurgimentos) === 'cortina', 'a tinta: sopro, sopro, CORTINA na saída', null);
// Os GESTOS (12/10): o quadro sai do relógio do estado.
conferir(cacadorQuadro('escondido', 0.5) === null && cacadorQuadro('foi', 0) === null, 'escondida ou ida, não se desenha', null);
const qd = (f, t) => { const q = cacadorQuadro(f, t); return `${q.clipe}${q.quadro}`; };
conferir(qd('surge', 0) === 'foge8' && qd('surge', C.surgeS - 0.001) === 'foge0', 'o SURGE é a fuga de trás para a frente e acaba na pose parada', [qd('surge', 0), qd('surge', C.surgeS - 0.001)]);
conferir(qd('mira', 0) === 'idle0' && qd('mira', C.miraS / 2) === 'idle3', 'a MIRA paira: sai da pose parada e vai ao auge no meio', [qd('mira', 0), qd('mira', C.miraS / 2)]);
conferir(qd('trava', C.travaS - 0.001) === 'ataque6' && qd('rajada', 0) === 'ataque7', 'a TRAVA acaba com os tentáculos abertos e a RAJADA segue dali', [qd('trava', C.travaS - 0.001), qd('rajada', 0)]);
conferir(qd('some', C.someS - 0.001) === 'foge8' && qd('some', 99) === 'foge8' && qd('mira', -1) === 'idle0', 'o SOME acaba desfeito; fora do tempo, o quadro não estoura', qd('some', 99));
// A FUGA (12/10): a última saída troca o SOME pelo impulso + voo.
conferir(cacadorAvanca('rajada', C.rajadaS, C.ressurgimentos - 2) === 'some' && cacadorAvanca('rajada', C.rajadaS, C.ressurgimentos - 1) === 'fuga', 'só a ÚLTIMA saída é a FUGA; as outras seguem no SOME', null);
conferir(cacadorAvanca('fuga', C.fugaS - 0.01, C.ressurgimentos) === 'fuga' && cacadorAvanca('fuga', C.fugaS, C.ressurgimentos) === 'foi', 'a fuga dura fugaS e ela vai embora', C.fugaS);
conferir(cacadorTangivel('fuga') && !cacadorFugaLancada(C.fugaImpulsoS - 0.01) && cacadorFugaLancada(C.fugaImpulsoS), 'no impulso ela ainda está ali; depois dispara', C.fugaImpulsoS);
conferir(qd('fuga', C.fugaImpulsoS - 0.001) === 'escapa8' && qd('fuga', C.fugaImpulsoS) === 'escapa12' && qd('fuga', 99) === 'escapa19', 'a fuga: enrolada até disparar, esticada no voo, desfeita no fim', [qd('fuga', C.fugaImpulsoS - 0.001), qd('fuga', C.fugaImpulsoS), qd('fuga', 99)]);
const pc = escolherPosto(() => 0.5, null, C);
conferir(pc.x >= C.postoX[0] && pc.x <= C.postoX[1] && pc.y >= C.postoY[0] && pc.y <= C.postoY[1], 'o posto do caçador cai na faixa dele (metade direita)', pc);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
