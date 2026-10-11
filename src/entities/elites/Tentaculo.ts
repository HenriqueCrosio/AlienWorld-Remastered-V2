import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { TENTACULO_QUADROS as Q } from '../../data/tentaculoQuadros';
import { tentaculoAfundado, tentaculoAvanca, tentaculoExposta, tentaculoMira, tentaculoRaizX, tentaculoTrio, type EstadoTentaculo } from '../../elitesRegras';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import type { ComportamentoElite, CtxElite, Sprite } from './tipos';

const T = ELITES.tentaculo;

type Corpo = Phaser.Physics.Arcade.Body;
type Gesto = 'idle' | 'espinhos' | 'bote';

interface Estado {
  fase: EstadoTentaculo;
  t: number;
  /** O relógio do balanço: só zera quando um gesto termina (os gestos voltam à pose base, o quadro 0 dele). */
  relogio: number;
  /** Onde ela está plantada: escolhido ao subir, e não muda mais (nem o tranco a arrasta). */
  raizX: number;
  /** Quantos trios de espinhos já saíram, e a mira travada no 1º. */
  trios: number;
  ang: number;
  /** A BOCA do bote: um corpo sem desenho que só existe enquanto a cabeça está lançada. */
  boca: Sprite;
}

/** ATRÁS das placas do casco (−75): quem a corta é a beirada real da placa — sem linha reta, sem fresta (11/10). */
const DEPTH = -76;
const CHAVE: Record<Gesto, string> = { idle: 'eliteTentaculoIdleAnim', espinhos: 'eliteTentaculoEspinhosAnim', bote: 'eliteTentaculoBoteAnim' };

/** O ESPINHO (à mão, 10/10): 15×3, aponta para a direita (o tiro gira para o rumo); hitbox 5×5 no meio. */
const vestirEspinho = PadroesDeTiro.vestirArte('eliteTiroEspinho', { w: 5, h: 5 });

/**
 * A SERPENTE DO CASCO — a 63-3 que ele escolheu, no posto "tentáculo" da F3 (spec §3.4; o nome dela ainda é dele: a F2
 * já tem a Sentinela Orbital). Depois de três dias de trajetórias abandonadas, o desenho é o dele de 10/10: *"uma skill
 * mais simples, que mostre o corpo dela inteiro"* — todo gesto é a própria arte animada NO LUGAR:
 * SOBE de trás da crista (metade fica dentro) → BALANÇA → os ESPINHOS acendem e saem 2 trios com o vão no meio → BALANÇA
 * → o BOTE (recua, lança a cabeça, volta; a boca FERE) → BALANÇA → AFUNDA e vai embora.
 * Os quadros vêm assados já girados a 25° e escurecidos (`scripts/_elites/_instalar-sentinela.mjs`): aqui só se troca
 * de quadro, se desliza o desenho e se acompanha a hitbox medida de cada quadro (`TENTACULO_QUADROS`).
 * ⚠️ Ela fica PARADA NA TELA, como em todos os GIFs que ele aprovou: o ciclo inteiro dura ~5,9s e o casco andaria
 * ~500px nesse tempo (a regra do casco, §3.3, segue em aberto para ela).
 */
export const TENTACULO: ComportamentoElite = {
  iniciar(e, ctx) {
    e.setFlipX(false);
    e.setDepth(DEPTH);
    e.setTexture(`${CHAVE.idle}0`);
    e.setOrigin(Q.pivo.x / Q.w, Q.pivo.y / Q.h);
    const boca = ctx.corpos.create(0, 0, 'eliteTiroEspinho') as Sprite;
    boca.setVisible(false);
    (boca.body as Corpo).setSize(T.boca.w, T.boca.h);
    (boca.body as Corpo).enable = false;
    // Antes do 1º `update` não há nave guardada (o alvo é o próprio sprite): vale o meio do terço esquerdo.
    const naveX = ctx.alvo === e ? 120 : ctx.alvo.x;
    const s: Estado = { fase: 'sobe', t: 0, relogio: 0, raizX: tentaculoRaizX(naveX), trios: 0, ang: Math.PI, boca };
    e.setData('elite', s);
    e.once('destroy', () => boca.destroy());
    posar(e, s);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    s.relogio += dt;
    (e.body as Corpo).setVelocity(0, 0);
    const prox = tentaculoAvanca(s.fase, s.t);
    if (prox !== s.fase) {
      s.fase = prox;
      s.t = 0;
      if (prox === 'balanca2' || prox === 'balanca3') s.relogio = 0;
    }
    if (s.fase === 'foi') {
      // Foi embora (sem pontos): afundou de vez.
      e.destroy();
      return;
    }
    if (s.fase === 'espinhos') espinhos(s, ctx);
    posar(e, s);
  },

  intocavel(e) {
    return !(e.body as Corpo | null)?.enable;
  },
};

/** O quadro de agora: os gestos tocam uma vez; o balanço vai e volta. */
function quadro(s: Estado): { gesto: Gesto; i: number } {
  const n = T.gestoQuadros - 1;
  if (s.fase === 'espinhos' || s.fase === 'bote') return { gesto: s.fase, i: Math.min(n, Math.floor(s.t * T.gestoQps)) };
  const k = Math.floor(s.relogio * T.balancaQps) % (2 * n);
  return { gesto: 'idle', i: k <= n ? k : 2 * n - k };
}

/** O desenho, a altura (o pivô na crista, ou abaixo dela enquanto sobe e afunda) e as duas hitboxes do quadro. */
function posar(e: Sprite, s: Estado): void {
  const { gesto, i } = quadro(s);
  const chave = `${CHAVE[gesto]}${i}`;
  if (e.texture.key !== chave) e.setTexture(chave);
  e.setPosition(s.raizX, T.cristaY + Math.round(Q.afundado * tentaculoAfundado(s.fase, s.t)));

  const b = e.body as Corpo;
  const c = Q.corpo[gesto][i];
  b.setSize(c.w, c.h, false);
  b.setOffset(c.x, c.y);
  const exposta = tentaculoExposta(s.fase, s.t);
  if (exposta !== b.enable) {
    b.enable = exposta;
    if (exposta) b.reset(e.x, e.y);
  }

  const m = gesto === 'bote' && T.boteFere ? Q.boca[i] : null;
  const bb = s.boca.body as Corpo;
  if (m) {
    s.boca.setPosition(s.raizX + m.x, T.cristaY + m.y);
    if (!bb.enable) {
      bb.enable = true;
      bb.reset(s.boca.x, s.boca.y);
    }
  } else bb.enable = false;
}

/** Os 2 TRIOS: o de baixo, e `trioAtrasoS` depois o de cima — retos, paralelos, com a linha da mira no vão entre eles. */
function espinhos(s: Estado, ctx: CtxElite): void {
  const ox = s.raizX + Q.peito.x, oy = T.cristaY + T.origemEspinhosY;
  while (s.trios < 2 && s.t >= T.trio1S + s.trios * T.trioAtrasoS) {
    // A mira trava onde a nave está no 1º trio — o 2º segue a mesma linha, senão o vão fecharia.
    if (s.trios === 0) s.ang = tentaculoMira(ox, oy, ctx.alvo.x, ctx.alvo.y);
    const trio = tentaculoTrio(ox, oy, s.ang, s.trios === 0 ? -1 : 1);
    // Recua (ou avança) o trio AO LONGO da mira até a borda dela: a fileira não sai do lugar, e o vão não fecha.
    const ux = Math.cos(s.ang), uy = Math.sin(s.ang);
    const k = (bordaDaFrente(s, trio[1].y) - trio[1].x) / ux;
    for (const p of trio) ctx.tiros.disparar(p.x + ux * k, p.y + uy * k, s.ang, T.velEspinho, vestirEspinho);
    s.trios++;
  }
}

/** O trio sai DELA, não do ar: a borda da frente do corpo na altura `y` (ou na linha ocupada mais próxima abaixo). */
function bordaDaFrente(s: Estado, y: number): number {
  let linha = Phaser.Math.Clamp(Math.round(y - T.cristaY) + Q.pivo.y, 0, Q.frente.length - 1);
  while (linha < Q.frente.length - 1 && Q.frente[linha] === null) linha++;
  return s.raizX + (Q.frente[linha] ?? Q.peito.x) + 4;
}
