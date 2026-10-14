import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { escolherLugar, larvaAvanca, larvaPosto, larvaQuadro, larvaTangivel, pupaAngulos, varianteDe, type ClipeLarva, type EstadoLarva } from '../../elitesRegras';
import { abrirBuraco, type Buraco } from './Buraco';
import { lancarPupa } from './Pupa';
import { vestir, type Ancora, type ComportamentoElite, type CtxElite, type LugarElite, type Sprite } from './tipos';

const L = ELITES.larva;
/** As DUAS variações que ele aprovou (13/10): A, a do conceito; D, a broca. Alternam pela ordem de nascimento. */
const VARIANTES = ['A', 'D'] as const;
type Variante = (typeof VARIANTES)[number];
/**
 * A HITBOX, fixa: a arte recortada tem 36×35 (A) e 37×32 (D); 60% × 55% dela, a regra do róster. Os quadros dos gestos
 * são caixas de 35 a 51px (o centro dela no centro): a hitbox não cresce com a cauda esticada.
 */
const CORPO = { w: 22, h: 20 };
const CLIPE: Record<ClipeLarva, string> = { poe: 'Poe', tranco: 'Tranco', sai: 'Sai', perfura: 'Perfura', mergulha: 'Mergulha' };

interface Estado {
  fase: EstadoLarva;
  t: number;
  variante: Variante;
  /** Quantos PÕE já começaram (o último vai ao PERFURA). */
  paradas: number;
  /** O posto atual (ou o de chegada, no TRANCO) e o de partida do tranco. */
  posto: { x: number; y: number };
  de: { x: number; y: number };
  /** As pupas desta parada já saíram? */
  pupasPostas: boolean;
  /** O buraco ABERTO agora: o de chegada, depois o de saída. */
  buraco: Buraco | null;
  /** A superfície do buraco em uso (o de chegada, depois o de saída): ela a segue enquanto sai ou entra nele. */
  ancora: Ancora | null;
}

/**
 * A LARVA MECÂNICA (spec F4 §2 e §9.5): um BURACO abre numa SUPERFÍCIE — a face da borda ou de uma mesa, nunca a
 * pintura — (o aviso) → ela SAI dele → TRANCO até o 1º posto → PÕE 2 pupas na direção da nave → TRANCO para o posto
 * seguinte, em ziguezague na metade direita e sempre dentro do vão → (3 paradas) → TRANCO até a superfície mais perto
 * → PERFURA ali e MERGULHA. Não atira: o perigo é o campo de pupas (`Pupa.ts`). Saiu viva: sem pontos. Ela VOA; só
 * enquanto sai ou entra num buraco ela segue a superfície dele (que rola com o mundo). O gesto de cada estado sai do
 * relógio dele (`larvaQuadro`), sem animação do Phaser — travada pelo elétrico, ela congela na pose.
 */
export const LARVA: ComportamentoElite = {
  iniciar(e, ctx) {
    const variante = varianteDe((e.getData('ordem') as number | undefined) ?? 0, VARIANTES);
    // O `x`/`y` do roteiro não valem para ela: nasce dentro de um buraco, numa superfície.
    const lugar = lugarDoBuraco(ctx, null);
    const p = { x: lugar.x, y: lugar.y };
    const s: Estado = { fase: 'abre', t: 0, variante, paradas: 0, posto: p, de: p, pupasPostas: false, buraco: null, ancora: lugar.ancora };
    e.setData('elite', s);
    // A arte já nasce virada para a esquerda: nada de espelhar.
    e.setFlipX(false);
    e.setPosition(p.x, p.y);
    vestir(e, `eliteLarva${variante}PoeAnim0`, CORPO);
    e.setVisible(false);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    s.buraco = abrirBuraco(e.scene, lugar.ancora);
    // Morta em qualquer estado, o buraco que estiver aberto fecha (o de saída, se ela morrer perfurando).
    e.once('destroy', () => s.buraco?.fechar());
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    const prox = larvaAvanca(s.fase, s.t, s.paradas);
    if (prox !== s.fase) entrar(e, s, prox, ctx);
    if (s.fase === 'foi') {
      // Mergulhou: sem pontos (não é o caminho de morte). O buraco fecha pelo `destroy`.
      e.destroy();
      return;
    }
    // Saindo ou entrando num buraco, ela segue a superfície dele: a borda e a mesa rolam com o mundo.
    if (s.ancora && (s.fase === 'abre' || s.fase === 'sai' || s.fase === 'perfura' || s.fase === 'mergulha')) {
      const p = s.ancora();
      if (p) e.setPosition(p.x, p.y);
    }
    if (s.fase === 'tranco') {
      // O tranco não é ataque, é reposicionamento: arranca e assenta (§2.1). O da SAÍDA persegue o lugar do buraco,
      // que rola com a superfície.
      const alvo = (s.paradas >= L.paradas && s.ancora?.()) || s.posto;
      const u = Math.min(1, s.t / L.trancoS);
      const m = u * u * (3 - 2 * u);
      e.setPosition(s.de.x + (alvo.x - s.de.x) * m, s.de.y + (alvo.y - s.de.y) * m);
    }
    if (s.fase === 'poe' && !s.pupasPostas && s.t >= L.pupaSaiS) porPupas(e, s, ctx);
    // O CORPO só existe enquanto ela tem tamanho: um ponto dentro do buraco não fere nem é ferido.
    const tangivel = larvaTangivel(s.fase, s.t);
    if (body.enable !== tangivel) {
      body.enable = tangivel;
      if (tangivel) body.reset(e.x, e.y);
    }
    posar(e, s);
  },

  intocavel(e) {
    const s = e.getData('elite') as Estado | undefined;
    return !s || !larvaTangivel(s.fase, s.t);
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoLarva, ctx: CtxElite): void {
  s.fase = fase;
  s.t = 0;
  if (fase === 'sai') {
    e.setVisible(true);
  } else if (fase === 'tranco') {
    // Parte de onde ESTÁ (o tranco do Tiro Pesado pode tê-la empurrado).
    s.de = { x: e.x, y: e.y };
    if (s.paradas === 0) {
      // Saiu inteira do buraco de chegada: ele fecha atrás dela, e ela arranca para o 1º posto.
      s.buraco?.fechar();
      s.buraco = null;
      s.ancora = null;
      s.posto = larvaPosto(Math.random, null, ctx.ganchos.vao);
    } else if (s.paradas >= L.paradas) {
      // A última parada acabou: o tranco a leva à SUPERFÍCIE mais perto, onde ela vai perfurar.
      const lugar = lugarDoBuraco(ctx, { x: e.x, y: e.y });
      s.ancora = lugar.ancora;
      s.posto = { x: lugar.x, y: lugar.y };
    } else {
      // Fugindo da altura do posto que deixa: o ziguezague.
      s.posto = larvaPosto(Math.random, s.posto.y, ctx.ganchos.vao);
    }
  } else if (fase === 'poe') {
    s.paradas++;
    s.pupasPostas = false;
    e.setPosition(s.posto.x, s.posto.y);
  } else if (fase === 'perfura') {
    // O buraco de SAÍDA abre na superfície aonde o tranco a levou, enquanto ela gira.
    const x = e.x, y = e.y;
    s.buraco = abrirBuraco(e.scene, s.ancora ?? (() => ({ x, y })));
  }
}

/**
 * Onde abre um buraco (spec F4 §9.5): só num lugar que a cena oferece (a borda ou uma mesa) — sorteado na chegada, o
 * mais perto dela na saída. Sem lugar nenhum (fora da F4, num sandbox sem borda): no chão do vão daquela coluna,
 * parado.
 */
function lugarDoBuraco(ctx: CtxElite, perto: { x: number; y: number } | null): LugarElite {
  const l = escolherLugar(ctx.ganchos.lugaresDeBuraco(), Math.random, perto ?? undefined);
  if (l) return l;
  const x = perto?.x ?? 300, y = ctx.ganchos.vao(x).chao;
  return { x, y, ancora: () => ({ x, y }) };
}

/** As pupas da parada: um leque curto na direção da nave (`pupaAngulos`), saindo do corpo dela. */
function porPupas(e: Sprite, s: Estado, ctx: CtxElite): void {
  s.pupasPostas = true;
  const base = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
  for (const ang of pupaAngulos(base)) lancarPupa(ctx.nascer('pupa', e.x, e.y), ang);
}

/** O GESTO: o quadro sai do relógio do estado. A hitbox é refeita a cada troca (o corpo do Arcade não acompanha a textura). */
function posar(e: Sprite, s: Estado): void {
  const q = larvaQuadro(s.fase, s.t);
  if (!q) return;
  const chave = `eliteLarva${s.variante}${CLIPE[q.clipe]}Anim${q.quadro}`;
  if (e.texture.key !== chave && e.scene.textures.exists(chave)) vestir(e, chave, CORPO);
}
