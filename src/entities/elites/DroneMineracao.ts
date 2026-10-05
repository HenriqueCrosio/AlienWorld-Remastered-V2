import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { droneAvanca, droneExplode, type EstadoDrone } from '../../elitesRegras';
import type { ComportamentoElite, CtxElite, Sprite } from './tipos';

const D = ELITES.drone;

interface Estado {
  fase: EstadoDrone;
  t: number;
  rocha: Sprite | null;
  hpMax: number;
  /** Onde ele fica em relação ao centro da rocha (à esquerda dela, encaixado). */
  dx: number;
  rumo: number;
  cd: number;
  rajada: number;
  rajadaT: number;
}

/** As animações, se a arte já as registrou (a provisória é estática). */
const tocar = (e: Sprite, chave: string): void => {
  if (e.scene.anims.exists(chave) && e.anims.currentAnim?.key !== chave) e.play(chave);
};

/**
 * O DRONE DE MINERAÇÃO (spec frente B §3.2): nasce TRABALHANDO, encaixado num asteroide minerável. MINERANDO (não
 * ataca — a janela de matar antes) → ALERTA (recolhe a broca, vira para a nave) → ATAQUE (vem de encontro atirando
 * rajadas) → PISCA (o núcleo pisca) → explode em raio com estilhaços em anel. ⚠️ Morto no pisca, não explode: a
 * explosão só sai daqui, quando o pisca termina (`droneExplode`).
 */
export const DRONE_MINERACAO: ComportamentoElite = {
  iniciar(e, ctx) {
    const rocha = ctx.ganchos.criarRocha(e.x + 24, e.y);
    // De frente para a ROCHA (à direita dele): os sprites nascem apontando para a direita.
    e.setFlipX(false);
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const dx = rocha ? -(rocha.displayWidth / 2 + e.displayWidth * 0.3) : 0;
    const s: Estado = { fase: 'minerando', t: 0, rocha, hpMax: e.getData('hp') as number, dx, rumo: Math.PI, cd: D.rajadaCadaS * 0.5, rajada: 0, rajadaT: 0 };
    e.setData('elite', s);
    if (rocha) e.setPosition(rocha.x + dx, rocha.y);
    tocar(e, 'elite-drone-minerar');
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    const dist = Phaser.Math.Distance.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
    const rochaViva = s.rocha?.active === true;
    const prox = droneAvanca(s.fase, s.t, {
      dist,
      ferido: (e.getData('hp') as number) < s.hpMax,
      rochaViva,
      rochaX: rochaViva ? s.rocha!.x : -999,
    });
    if (prox !== s.fase) {
      s.fase = prox;
      s.t = 0;
      if (prox === 'alerta') tocar(e, 'elite-drone-alerta');
      if (prox === 'ataque') {
        s.rumo = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
        tocar(e, 'elite-drone-voo');
      }
    }

    if (s.fase === 'minerando' && rochaViva) {
      // Encaixado: anda com a rocha (que anda no scroll).
      body.setVelocity(0, 0);
      e.setPosition(s.rocha!.x + s.dx, s.rocha!.y);
    } else if (s.fase === 'alerta') {
      body.setVelocity(0, 0);
      e.setFlipX(ctx.alvo.x < e.x);
    } else if (s.fase === 'ataque') {
      voar(e, s, dt, ctx);
      atirar(e, s, dt, ctx);
    } else if (s.fase === 'pisca') {
      body.setVelocity(body.velocity.x * 0.9, body.velocity.y * 0.9);
      // O NÚCLEO PISCA: branco-quente e normal, rápido — o telégrafo da explosão.
      if (Math.floor(s.t * 16) % 2 === 0) e.setTintFill(0xffd27a);
      else e.setTint(e.getData('tint') as number);
      if (droneExplode(s.fase, s.t)) {
        ctx.tiros.anel(e.x, e.y, D.estilhacos, D.velEstilhaco, Math.random() * Math.PI);
        ctx.ganchos.explodir(e.x, e.y, D.raioExplosao);
        e.destroy();
      }
    }
  },
};

/** Vem de encontro: o rumo vira para a nave a `giro` rad/s (não teleguia na hora — dá para desviar). */
function voar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  const alvo = Phaser.Math.Angle.Between(e.x, e.y, ctx.alvo.x, ctx.alvo.y);
  s.rumo = Phaser.Math.Angle.RotateTo(s.rumo, alvo, D.giro * dt);
  (e.body as Phaser.Physics.Arcade.Body).setVelocity(Math.cos(s.rumo) * D.velAtaque, Math.sin(s.rumo) * D.velAtaque);
  e.setFlipX(Math.cos(s.rumo) < 0);
}

/** A RAJADA: `rajadaN` tiros mirados, `rajadaEspacoS` entre eles, uma a cada `rajadaCadaS`. */
function atirar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  if (s.rajada > 0) {
    s.rajadaT -= dt;
    if (s.rajadaT <= 0) {
      ctx.tiros.mirado(e.x, e.y, ctx.alvo.x, ctx.alvo.y, D.velTiro);
      s.rajada--;
      s.rajadaT = D.rajadaEspacoS;
    }
    return;
  }
  s.cd -= dt;
  if (s.cd <= 0) {
    s.cd = D.rajadaCadaS;
    s.rajada = D.rajadaN;
    s.rajadaT = 0;
  }
}
