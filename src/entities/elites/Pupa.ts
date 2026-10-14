import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { moscaPersegue, moscaTremor, pupaEclode, pupaQuadro, pupaTremor, pupaVoo } from '../../elitesRegras';
import { vestir, type ComportamentoElite, type Sprite } from './tipos';

const M = ELITES.mosca;
/** As hitboxes, fixas: o miolo da pupa P1 (7×12; 14/10) e o corpo da mosca (9×6, sem as asas). */
const CORPO_PUPA = { w: 5, h: 7 };
const CORPO_MOSCA = { w: 6, h: 4 };

interface EstadoPupa {
  t: number;
  /** De onde saiu (a Larva) e para onde. */
  ox: number;
  oy: number;
  ang: number;
}

/** A Larva dá o rumo da pupa que acabou de pôr (o `iniciar` não o conhece: ela nasce pelo `ctx.nascer`). */
export function lancarPupa(e: Sprite, ang: number): void {
  (e.getData('elite') as EstadoPupa).ang = ang;
}

/**
 * A PUPA (spec F4 §2.2, a ideia dele: *"se o jogador explodir, corta o ciclo… se deixar elas viram moscas"*): sai da
 * Larva, voa um pouco e PARA no ar; pulsa cada vez mais rápido e eclode numa MOSCA. Um tiro a mata (1 de vida) e some
 * sem estouro (`GameScene.matarInimigo`). Não explode por proximidade — encostar nela fere, como em qualquer inimigo.
 * Travada pelo elétrico, o relógio dela para (o `atualizar` não roda).
 */
export const PUPA: ComportamentoElite = {
  iniciar(e) {
    e.setFlipX(false);
    vestir(e, 'elitePupaAnim0', CORPO_PUPA);
    const s: EstadoPupa = { t: 0, ox: e.x, oy: e.y, ang: Math.PI };
    e.setData('elite', s);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoPupa;
    s.t += dt;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (pupaEclode(s.t)) {
      // Eclodiu: a mosca nasce no lugar; a pupa some sem pontos (não é o caminho de morte).
      ctx.nascer('mosca', e.x, e.y);
      e.destroy();
      return;
    }
    const d = pupaVoo(s.t);
    // O TREMOR (spec F4 §9.2): nos últimos instantes ela treme ±1px — o aviso de que vai eclodir. Ela não sai do lugar.
    e.setPosition(s.ox + Math.cos(s.ang) * d + pupaTremor(s.t), s.oy + Math.sin(s.ang) * d);
    const chave = `elitePupaAnim${pupaQuadro(s.t)}`;
    if (e.texture.key !== chave) vestir(e, chave, CORPO_PUPA);
  },
};

interface EstadoMosca {
  t: number;
  /** A fase e o ritmo do tremor DESTA mosca (§9.6): cada uma voa desorganizada do seu jeito. */
  fase: number;
  hz: number;
}

/**
 * A MOSCA (spec F4 §2.2 e §9.6): nasce da pupa num rumo SORTEADO e voa em curva na direção da nave — a perseguição do
 * kamikaze (aceleração, com inércia), mais lenta — com um TREMOR lateral, cada uma no seu ritmo: chega, mas
 * desorganizada. Passou da nave sem acertar: para de perseguir, segue reto e sai da tela. A arte é pequena demais
 * para girar: ela só bate a asa, virada para a esquerda.
 */
export const MOSCA: ComportamentoElite = {
  iniciar(e) {
    e.setFlipX(false);
    vestir(e, 'eliteMoscaAnim0', CORPO_MOSCA);
    const s: EstadoMosca = { t: 0, fase: Math.random() * Math.PI * 2, hz: M.tremorHz[0] + Math.random() * (M.tremorHz[1] - M.tremorHz[0]) };
    e.setData('elite', s);
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setMaxVelocity(M.velMax, M.velMax);
    const ang = Math.random() * Math.PI * 2;
    body.setVelocity(Math.cos(ang) * M.velInicial, Math.sin(ang) * M.velInicial);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as EstadoMosca;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    if (moscaPersegue(e.x, ctx.alvo.x)) {
      const ang = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
      const lado = moscaTremor(s.t, s.fase, s.hz);
      body.setAcceleration(Math.cos(ang) * M.perseguicao - Math.sin(ang) * lado, Math.sin(ang) * M.perseguicao + Math.cos(ang) * lado);
    } else {
      body.setAcceleration(0, 0);
    }
    const chave = `eliteMoscaAnim${Math.floor(s.t / M.bateAsaS) % 2}`;
    if (e.texture.key !== chave) vestir(e, chave, CORPO_MOSCA);
  },
};
