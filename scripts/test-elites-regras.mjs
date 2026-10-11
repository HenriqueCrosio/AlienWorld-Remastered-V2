// OS ELITES DA F2 (spec 2026-10-05-frente-b-elites-design.md §3). Uso, da raiz: node scripts/test-elites-regras.mjs
import { ELITES } from '../src/data/numerosElites.ts';
import {
  droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escudoAbsorve, escolherPosto,
  cacadorAvanca, cacadorTangivel, tintaDoSumico, tentaculoAvanca, tentaculoRaizX, tentaculoAfundado, tentaculoExposta, tentaculoMira, tentaculoTrio,
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
const pc = escolherPosto(() => 0.5, null, C);
conferir(pc.x >= C.postoX[0] && pc.x <= C.postoX[1] && pc.y >= C.postoY[0] && pc.y <= C.postoY[1], 'o posto do caçador cai na faixa dele (metade direita)', pc);

// ── A SERPENTE DO CASCO, no posto do Tentáculo (spec F3 §3.4, 11/10) ──
const T = ELITES.tentaculo;
const ciclo = ['sobe', 'balanca1', 'espinhos', 'balanca2', 'bote', 'balanca3', 'afunda', 'foi'];
conferir(ciclo.slice(0, -1).every((f, k) => tentaculoAvanca(f, 99) === ciclo[k + 1]), 'um ciclo por aparição, na ordem da spec (a sequência inteira)', null);
conferir(tentaculoAvanca('sobe', T.sobeS - 0.01) === 'sobe' && tentaculoAvanca('foi', 99) === 'foi', 'cada estado segura o tempo dele; foi é o fim', T.sobeS);
const gestoS = T.gestoQuadros / T.gestoQps;
conferir(tentaculoAvanca('bote', gestoS - 0.01) === 'bote' && tentaculoAvanca('bote', gestoS) === 'balanca3' && tentaculoAvanca('espinhos', gestoS) === 'balanca2', 'os gestos duram os quadros deles (17 a 12 qps)', gestoS);
conferir(tentaculoRaizX(100) === 100 + T.distNave && tentaculoRaizX(0) === T.raizX[0] && tentaculoRaizX(999) === T.raizX[1], 'sobe à frente da nave, na distância do bote, sem sair da faixa da tela', [tentaculoRaizX(100), tentaculoRaizX(0), tentaculoRaizX(999)]);
conferir(tentaculoAfundado('sobe', 0) === 1 && tentaculoAfundado('sobe', T.sobeS) === 0 && tentaculoAfundado('balanca1', 0.3) === 0 && tentaculoAfundado('afunda', T.afundaS) === 1, 'nasce sumida, fica de pé, afunda de vez', null);
conferir(!tentaculoExposta('sobe', 0) && tentaculoExposta('sobe', T.sobeS) && tentaculoExposta('bote', 0.5) && !tentaculoExposta('afunda', T.afundaS), 'só tem corpo com mais da metade para fora do casco', null);
const max = (T.miraMaxGraus * Math.PI) / 180;
conferir(Math.abs(tentaculoMira(200, 100, 100, 100) - Math.PI) < 1e-9 && Math.abs(Math.abs(tentaculoMira(200, 100, 300, 100) - Math.PI) - max) < 1e-9 &&Math.abs(Math.abs(tentaculoMira(200, 100, 200, 0) - Math.PI) - max) < 1e-9, 'a mira vai na nave, mas nunca passa do limite para trás ou para cima', [tentaculoMira(200, 100, 100, 100), tentaculoMira(200, 100, 200, 0)]);
const [baixo, cima] = [tentaculoTrio(200, 100, Math.PI, -1), tentaculoTrio(200, 100, Math.PI, 1)];
conferir(baixo.length === 3 && cima.length === 3 && baixo.every((p) => p.y > 100) && cima.every((p) => p.y < 100), 'dois trios, um de cada lado da linha da mira', { baixo, cima });
const vao = Math.min(...baixo.map((p) => p.y)) - Math.max(...cima.map((p) => p.y));
conferir(vao >= 36, 'o VÃO no meio (onde a nave está) tem pelo menos 36px', vao);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
