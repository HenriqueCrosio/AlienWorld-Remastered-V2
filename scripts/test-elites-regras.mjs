// OS ELITES DA F2 (spec 2026-10-05-frente-b-elites-design.md §3). Uso, da raiz: node scripts/test-elites-regras.mjs
import { ELITES } from '../src/data/numerosElites.ts';
import {
  droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escudoAbsorve, escolherPosto,
  cacadorAvanca, cacadorFugaLancada, cacadorQuadro, cacadorTangivel, tintaDoSumico,
  varianteDe, larvaAvanca, larvaTangivel, larvaQuadro, larvaPosto, pupaAngulos, pupaVoo, pupaQuadro, pupaEclode,
  moscaPersegue, buracoQuadro, distEmenda, tuboCabe, tuboAvanca, tuboQuadro, esporosDoPulso,
  pupaTremor, esporoAvanco, esporoBalanco, esporoAlfa, esporoVivo, lentidaoAte, fatorDeVelocidade, moscaTremor, escolherLugar,
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

// ── A F4 (spec 2026-10-12-frente-b-fatia-f4-design.md) ──
const L = ELITES.larva, B = ELITES.buraco, P = ELITES.pupa, T = ELITES.tubo;
conferir(varianteDe(0, ['A', 'D']) === 'A' && varianteDe(1, ['A', 'D']) === 'D' && varianteDe(2, ['A', 'D']) === 'A', 'as duas variações se alternam pela ordem de nascimento', null);

// A LARVA (§2.1)
{
  let f = 'abre', paradas = 0;
  const visto = [f];
  while (f !== 'foi' && visto.length < 20) {
    f = larvaAvanca(f, 99, paradas);
    if (f === 'poe') paradas++;
    visto.push(f);
  }
  const ciclo = ['abre', 'sai', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'poe', 'tranco', 'perfura', 'mergulha', 'foi'];
  conferir(JSON.stringify(visto) === JSON.stringify(ciclo), `a Larva: buraco, sai, TRANCO até o 1º posto, ${L.paradas} paradas, TRANCO até a superfície, perfura, mergulha (§9.5)`, visto);
}
conferir(larvaAvanca('abre', B.abreS - 0.01, 0) === 'abre' && larvaAvanca('abre', B.abreS, 0) === 'sai', 'o buraco abre ANTES de ela existir (o aviso)', B.abreS);
conferir(larvaAvanca('poe', L.poeS - 0.01, 1) === 'poe', 'o PÕE segura o tempo dele', L.poeS);
const aVista = L.saiS + L.paradas * L.poeS + (L.paradas + 1) * L.trancoS + L.perfuraS + L.mergulhaS;
conferir(Math.abs(aVista - 5.4) < 0.01, 'cerca de 5,4s à vista (§9.5: um tranco a mais na chegada e outro na saída)', aVista);
conferir(!larvaTangivel('abre', 0.2) && !larvaTangivel('foi', 0) && !larvaTangivel('sai', 0) && larvaTangivel('sai', L.miudaS) && ['poe', 'tranco', 'perfura'].every((f) => larvaTangivel(f, 0.1)) && larvaTangivel('mergulha', 0) && !larvaTangivel('mergulha', L.mergulhaS - L.miudaS), 'sem corpo enquanto é um ponto no buraco; com corpo no resto', null);
const ql = (f, t) => { const q = larvaQuadro(f, t); return q && `${q.clipe}${q.quadro}`; };
conferir(ql('abre', 0.1) === null && ql('foi', 0) === null, 'antes de sair e depois de mergulhar, não se desenha', null);
conferir(ql('sai', 0) === 'mergulha8' && ql('sai', L.saiS - 0.001) === 'sai8', 'o SAI é o mergulho de trás para a frente e a bola estourando', [ql('sai', 0), ql('sai', L.saiS - 0.001)]);
conferir(ql('poe', 0) === 'poe0' && ql('poe', L.poeS - 0.001) === 'poe16' && ql('tranco', 0) === 'tranco0' && ql('perfura', L.perfuraS - 0.001) === 'perfura16', 'cada estado toca o clipe dele inteiro', null);
conferir(ql('mergulha', 0) === 'mergulha0' && ql('mergulha', 99) === 'mergulha8' && ql('poe', -1) === 'poe0', 'o MERGULHA acaba num ponto; fora do tempo, o quadro não estoura', ql('mergulha', 99));

// OS POSTOS: na metade direita, DENTRO do vão, em ziguezague. O vão de teste é o duto mais fechado (68px).
const vaoFalso = () => ({ teto: 60, chao: 128 });
{
  const seq = [0.5, 0.1, 0.12, 0.13, 0.11, 0.9, 0.14, 0.5, 0.52];
  let k = 0, ant = null;
  const sorteL = () => seq[k++ % seq.length];
  const postos = [0, 1, 2].map(() => {
    const p = larvaPosto(sorteL, ant, vaoFalso);
    const r = { ...p, ant };
    ant = p.y;
    return r;
  });
  conferir(postos.every((p) => p.x >= L.postoX[0] && p.x <= L.postoX[1]), 'os postos ficam na metade direita', postos);
  conferir(postos.every((p) => p.y >= 60 + L.postoMargem && p.y <= 128 - L.postoMargem), 'os postos ficam DENTRO do vão, com margem', postos);
  conferir(postos.slice(1).every((p) => Math.abs(p.y - p.ant) >= L.postoDistY), 'cada posto foge da altura do anterior (o ziguezague)', postos);
}
const semSorte = larvaPosto(() => 0.5, 94, vaoFalso);
conferir(Math.abs(semSorte.y - 94) >= L.postoDistY && semSorte.y <= 128 - L.postoMargem, 'sem sorte no sorteio, vai à ponta da faixa mais longe do anterior', semSorte);

// A PUPA E A MOSCA (§2.2)
const angs = pupaAngulos(Math.PI);
const leque = (L.pupaLequeGraus * Math.PI) / 180;
conferir(angs.length === L.pupasPorParada && Math.abs((angs[0] + angs.at(-1)) / 2 - Math.PI) < 1e-9 && Math.abs(angs.at(-1) - angs[0] - 2 * leque) < 1e-9, `${L.pupasPorParada} pupas por parada, num leque curto em volta da direção da nave`, angs);
conferir(pupaAngulos(1, 1)[0] === 1, 'uma pupa só sai reta', pupaAngulos(1, 1));
conferir(pupaVoo(0) === 0 && pupaVoo(P.vooS) === P.vooPx && pupaVoo(99) === P.vooPx, `a pupa voa ${P.vooPx}px e PARA`, [pupaVoo(0), pupaVoo(P.vooS), pupaVoo(99)]);
conferir(!pupaEclode(P.eclodeS - 0.01) && pupaEclode(P.eclodeS), `a pupa eclode em ${P.eclodeS}s`, null);
const trocas = (de, ate) => { let n = 0; for (let t = de + 0.01; t < ate; t += 0.01) if (pupaQuadro(t) !== pupaQuadro(t - 0.01)) n++; return n; };
conferir(trocas(0, 0.5 * P.eclodeS) < trocas(0.8 * P.eclodeS, P.eclodeS), 'a pupa pulsa cada vez mais rápido', [trocas(0, 0.5 * P.eclodeS), trocas(0.8 * P.eclodeS, P.eclodeS)]);
conferir(moscaPersegue(200, 70) && !moscaPersegue(60, 70), 'a mosca persegue até passar da nave; depois segue reto', null);
conferir(P.hp === 1 && ELITES.mosca.hp === 1 && ELITES.mosca.perseguicao < 150 && ELITES.mosca.velMax < 190, 'pupa e mosca de 1 de vida; a mosca mais lenta que o kamikaze (150 / 190)', ELITES.mosca);

// O BURACO
conferir(buracoQuadro('abre', 0) === 0 && buracoQuadro('abre', B.abreS) === 4 && buracoQuadro('abre', 99) === 4, 'o buraco abre em 5 quadros e fica aberto', null);
conferir(buracoQuadro('fecha', 0) === 2 && buracoQuadro('fecha', B.fechaS - 0.001) === 0 && buracoQuadro('fecha', B.fechaS) === 5 && buracoQuadro('fecha', B.fechaS + B.cicatrizS - 0.001) === 8 && buracoQuadro('fecha', B.fechaS + B.cicatrizS) === null, 'fecha, deixa a cicatriz e ela some', null);

// O TUBO (§3)
conferir(tuboAvanca('rola', 0, T.pulsoX[0] + 1, 0) === 'rola' && tuboAvanca('rola', 0, T.pulsoX[0], 0) === 'incha', 'o Tubo incha ao chegar ao 1º ponto', T.pulsoX);
conferir(tuboAvanca('incha', T.inchaS - 0.01, 300, 0) === 'incha' && tuboAvanca('incha', T.inchaS, 300, 0) === 'pulsa' && tuboAvanca('pulsa', T.pulsaS, 300, 1) === 'rola', 'incha (o aviso) → pulsa → volta a rolar', null);
conferir(tuboAvanca('rola', 0, T.pulsoX[1] + 1, 1) === 'rola' && tuboAvanca('rola', 0, T.pulsoX[1], 1) === 'incha' && tuboAvanca('rola', 0, 0, T.pulsos) === 'rola', `${T.pulsos} pulsos por passagem, e só`, null);
conferir(tuboQuadro('rola', 3) === 0 && tuboQuadro('aguarda', 0) === 0 && tuboQuadro('incha', 0) === 0 && tuboQuadro('incha', T.inchaS - 0.001) === 9 && tuboQuadro('pulsa', 0) === 10 && tuboQuadro('pulsa', 99) === 16, 'o gesto: fechado rolando, incha em 10 quadros, estala e assenta', null);
conferir(distEmenda(0) === 0 && distEmenda(64) === 64 && distEmenda(130) === 2 && distEmenda(-2) === 2, 'a distância à emenda de duas placas', null);
const batida = { timer: 1.1, rate: 1.9, vel: 84 };
conferir(tuboCabe(64, batida) && !tuboCabe(64, { ...batida, timer: 0.2 }) && !tuboCabe(64, { ...batida, timer: 1.8 }), 'o Tubo nasce ENTRE duas mesas, nunca em cima de uma', null);
conferir(!tuboCabe(10, batida) && tuboCabe(10 + 128 * 3 + 54, batida), 'e longe da emenda de duas placas (a parede tem degrau ali)', null);
conferir(tuboCabe(64, { timer: 0, rate: 0, vel: 84 }), 'sem mesas (o sandbox), só a emenda conta', null);

// ── A RODADA DE 14/10 (spec F4 §9) ──
const E = ELITES.esporo, LE = ELITES.lentidao, M = ELITES.mosca, BU = ELITES.buraco;
{
  const ini = P.eclodeS - P.tremeS;
  const antes = [0, 0.5, ini - 0.01].map(pupaTremor);
  const durante = [];
  for (let t = ini; t < P.eclodeS; t += 0.005) durante.push(pupaTremor(t));
  conferir(antes.every((v) => v === 0) && pupaTremor(P.eclodeS) === 0, `a pupa só treme nos últimos ${P.tremeS}s`, antes);
  conferir(durante.every((v) => Math.abs(v) === 1) && new Set(durante).size === 2, 'tremendo: ±1px, nunca mais', [...new Set(durante)]);
  const trocasT = (de, ate) => { let n = 0; for (let t = de + 0.005; t < ate; t += 0.005) if (pupaTremor(t) !== pupaTremor(t - 0.005)) n++; return n; };
  const meio = ini + P.tremeS / 2;
  conferir(trocasT(ini, meio) < trocasT(meio, P.eclodeS), 'o tremor fica mais rápido perto de eclodir', [trocasT(ini, meio), trocasT(meio, P.eclodeS)]);
}
conferir(esporoAvanco(0, 80, 1) === 0 && Math.abs(esporoAvanco(1, 80, 1) - 40) < 1e-9 && esporoAvanco(99, 80, 1) === esporoAvanco(1, 80, 1), 'o esporo sai, FREIA e para no rumo dele (cada um com a sua velocidade e a sua freada)', [esporoAvanco(1, 80, 1), esporoAvanco(99, 80, 1)]);

// A SOLTURA ORGÂNICA (calibragem de 14/10, o desenho dele): uma nuvem para dentro do corredor, não um arco.
{
  let a = 7;
  const sorte = () => ((a = (a * 1103515245 + 12345) % 2147483648) / 2147483648);
  const cone = (E.coneGraus * Math.PI) / 180;
  const chao = esporosDoPulso(false, sorte), teto = esporosDoPulso(true, sorte);
  conferir(chao.length === T.esporosN && teto.length === T.esporosN, `${T.esporosN} esporos em CADA pulso`, [chao.length, teto.length]);
  conferir(chao.every((s) => Math.abs(s.ang + Math.PI / 2) <= cone + 1e-9) && teto.every((s) => Math.abs(s.ang - Math.PI / 2) <= cone + 1e-9), `no chão sobem, no teto descem — num cone de ±${E.coneGraus}° (para dentro do corredor)`, chao.map((s) => s.ang.toFixed(2)));
  const fatias = [...chao].sort((x, y) => x.ang - y.ang).map((s) => Math.floor(((s.ang + Math.PI / 2 + cone) / (2 * cone)) * T.esporosN));
  conferir(JSON.stringify(fatias) === JSON.stringify([...Array(T.esporosN).keys()]), 'espalhados pelo cone inteiro: um por fatia, numa posição sorteada dentro dela (sem bolo, sem arco)', fatias);
  const todos = Array.from({ length: 40 }, () => esporosDoPulso(false, sorte)).flat();
  const dist = todos.map((s) => esporoAvanco(99, s.vel, s.freiaS));
  conferir(Math.min(...dist) < 20 && Math.max(...dist) > 55, 'cada um para numa altura: a nuvem vai de perto da boca a ~70px dela', [Math.min(...dist).toFixed(1), Math.max(...dist).toFixed(1)]);
  conferir(todos.every((s) => s.vel >= E.vel[0] && s.vel <= E.vel[1] && s.freiaS >= E.freiaS[0] && s.freiaS <= E.freiaS[1] && s.atrasoS >= 0 && s.atrasoS <= E.soproS), `velocidade, freada e atraso sorteados nas faixas; o sopro se espalha por ${E.soproS}s`, null);
  conferir(new Set(todos.map((s) => s.atrasoS.toFixed(3))).size > todos.length / 2, 'não saem todos no mesmo quadro', null);
}
{
  let max = 0;
  for (let t = 0; t < 10; t += 0.01) { const b = esporoBalanco(t, 1.3, 1.7); max = Math.max(max, Math.abs(b.dx), Math.abs(b.dy)); }
  conferir(max <= E.balancoPx + 1e-9 && max >= E.balancoPx * 0.9 && E.balancoPx <= 2, `o balanço é mínimo (até ${E.balancoPx}px)`, max);
}
const bal1 = esporoBalanco(1, 0, 1.5), bal2 = esporoBalanco(1, 2, 1.5);
conferir(Math.abs(bal1.dx - bal2.dx) > 0.1, 'cada esporo balança na própria fase (a nuvem não balança em bloco)', [bal1, bal2]);
conferir(esporoAlfa(0) === 1 && esporoAlfa(E.vidaS - E.someS) === 1 && esporoAlfa(E.vidaS - E.someS / 2) === 0.5 && esporoAlfa(E.vidaS) === 0, 'ele some ao longo dos últimos someS', null);
conferir(esporoVivo(E.vidaS - 0.01) && !esporoVivo(E.vidaS), `o esporo vive ${E.vidaS}s`, null);
conferir(lentidaoAte(1000, 0) === 1000 + LE.duracaoS * 1000 && lentidaoAte(2000, 1000 + LE.duracaoS * 1000) === 2000 + LE.duracaoS * 1000, 'outro toque RENOVA a lentidão (não soma)', null);
conferir(fatorDeVelocidade(0, 100) === LE.velocidade && fatorDeVelocidade(100, 100) === 1 && LE.velocidade === 0.4, 'lenta: 40% da velocidade (60% mais lenta, punitiva — calibragem de 14/10); acabou, volta a 1', null);
conferir(T.afunda === 5 && T.velTiro === undefined, 'o Tubo afunda 5px na borda e não atira mais (§9.3, §9.4)', T);
{
  let max = -Infinity, min = Infinity;
  for (let t = 0; t < 3; t += 0.01) { const v = moscaTremor(t, 0.4, 2); max = Math.max(max, v); min = Math.min(min, v); }
  conferir(max <= M.tremorAcel && min >= -M.tremorAcel && max > M.tremorAcel * 0.9 && min < -M.tremorAcel * 0.9, 'a mosca treme de um lado ao outro, até tremorAcel', [min, max]);
}
const lugares = [{ x: 260, y: 200 }, { x: 330, y: 20 }, { x: 300, y: 150 }];
conferir(escolherLugar([], () => 0.5) === null, 'sem lugar de buraco: null (quem chama decide)', null);
conferir(escolherLugar(lugares, () => 0) === lugares[0] && escolherLugar(lugares, () => 0.99) === lugares[2], 'na chegada, um dos lugares, sorteado', null);
conferir(escolherLugar(lugares, () => 0.5, { x: 320, y: 40 }) === lugares[1], 'na saída, o lugar mais perto dela', null);
conferir(BU.colunas.every((x) => x >= L.postoX[0] && x <= 384 - 16), 'as colunas do buraco ficam na metade direita, dentro da tela', BU.colunas);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
