// OS ELITES DA F2 (spec 2026-10-05-frente-b-elites-design.md §3). Uso, da raiz: node scripts/test-elites-regras.mjs
import { ELITES } from '../src/data/numerosElites.ts';
import { droneAvanca, droneExplode, sentinelaAvanca, sentinelaBloqueia, escolherPosto } from '../src/elitesRegras.ts';

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
conferir(sentinelaAvanca('fogo', S.fogoS - 0.01, { chegou: true, ciclos: 0 }) === 'fogo' && sentinelaAvanca('fogo', S.fogoS, { chegou: true, ciclos: 0 }) === 'fechar', 'o fogo dura fogoS', S.fogoS);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: 1 }) === 'rolando', 'fechou com ciclos sobrando: rola para outro posto', null);
conferir(sentinelaAvanca('fechar', S.fecharS, { chegou: true, ciclos: S.ciclos }) === 'saindo', `depois de ${S.ciclos} ciclos: vai embora`, S.ciclos);
conferir(sentinelaAvanca('saindo', 99, { chegou: true, ciclos: S.ciclos }) === 'saindo', 'saindo não volta', null);

// O ESCUDO: arco virado para a ESQUERDA (onde está a nave), só aberta.
conferir(sentinelaBloqueia('fogo', 300, 100, 200, 100), 'fogo: tiro de frente é bloqueado', null);
conferir(sentinelaBloqueia('abrir', 300, 100, 200, 110), 'abrir: o escudo já está subindo', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 300, 40), 'fogo: tiro de CIMA passa (flanquear funciona)', null);
conferir(!sentinelaBloqueia('fogo', 300, 100, 360, 100), 'fogo: tiro de trás passa', null);
conferir(!sentinelaBloqueia('fechar', 300, 100, 200, 100) && !sentinelaBloqueia('rolando', 300, 100, 200, 100), 'fechada ou rolando: sem escudo', null);

// O POSTO: na metade direita, longe do anterior na altura.
const seq = [0.1, 0.12, 0.13, 0.9, 0.5];
let i = 0;
const sorte = () => seq[i++ % seq.length];
const p = escolherPosto(sorte, S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]));
conferir(p.x >= S.postoX[0] && p.x <= S.postoX[1] && p.y >= S.postoY[0] && p.y <= S.postoY[1], 'o posto cai na faixa', p);
conferir(Math.abs(p.y - (S.postoY[0] + 0.12 * (S.postoY[1] - S.postoY[0]))) >= S.postoDistY, 'o posto novo foge da altura do anterior', p);

console.log(falhas.length ? `\n${falhas.length} FALHA(S)` : '\nTUDO OK');
process.exit(falhas.length ? 1 : 0);
