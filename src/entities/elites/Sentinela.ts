import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { escolherPosto, sentinelaAvanca, sentinelaBloqueia, type EstadoSentinela } from '../../elitesRegras';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const S = ELITES.sentinela;

interface Estado {
  fase: EstadoSentinela;
  t: number;
  ciclos: number;
  posto: { x: number; y: number };
  rajada: number;
  rajadaT: number;
  cd: number;
  anel: boolean;
  escudo: Phaser.GameObjects.Image | null;
}

const tocar = (e: Sprite, chave: string): void => {
  if (e.scene.anims.exists(chave) && e.anims.currentAnim?.key !== chave) e.play(chave);
};

/**
 * A SENTINELA ORBITAL (spec frente B §3.3) — à la droideka: ROLANDO (a roda girando até um posto na metade direita)
 * → ABRIR (desdobra e ergue o ESCUDO em arco, virado para a nave) → FOGO (rajadas miradas e um anel) → FECHAR (sem
 * escudo: a janela) → rola para outro posto. Depois de `ciclos` fogos, vai embora rolando. O escudo segura o que vem
 * de FRENTE (`sentinelaBloqueia`); por cima, por baixo ou por trás passa. ⚠️ O elétrico NÃO o desfaz (rebalanceamento).
 */
export const SENTINELA: ComportamentoElite = {
  iniciar(e) {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    const s: Estado = { fase: 'rolando', t: 0, ciclos: 0, posto: escolherPosto(Math.random, null), rajada: 0, rajadaT: 0, cd: 0, anel: false, escudo: null };
    e.setData('elite', s);
    e.once('destroy', () => s.escudo?.destroy());
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    const body = e.body as Phaser.Physics.Arcade.Body;
    const chegou = s.fase === 'rolando' && Phaser.Math.Distance.Between(e.x, e.y, s.posto.x, s.posto.y) < 3;
    const prox = sentinelaAvanca(s.fase, s.t, { chegou, ciclos: s.ciclos });
    if (prox !== s.fase) entrar(e, s, prox);

    if (s.fase === 'rolando' || s.fase === 'saindo') {
      const vx = s.fase === 'saindo' ? -S.velSaida : 0;
      if (s.fase === 'rolando') {
        const a = Phaser.Math.Angle.Between(e.x, e.y, s.posto.x, s.posto.y);
        const d = Phaser.Math.Distance.Between(e.x, e.y, s.posto.x, s.posto.y);
        const v = Math.min(S.velRolando, d / Math.max(dt, 1e-3));
        body.setVelocity(Math.cos(a) * v, Math.sin(a) * v);
      } else {
        body.setVelocity(vx, 0);
      }
      // A RODA GIRA no sentido de quem rola para a esquerda.
      e.rotation -= Phaser.Math.DegToRad(S.giroRolando) * dt;
    } else {
      body.setVelocity(0, 0);
    }

    if (s.escudo) s.escudo.setPosition(e.x - e.displayWidth * 0.5, e.y).setAlpha(s.fase === 'abrir' ? Math.min(1, s.t / S.abrirS) : 0.75 + 0.25 * Math.sin(s.t * 18));
    if (s.fase === 'fogo') atirar(e, s, dt, ctx);
  },

  bloqueia(e, deX, deY) {
    const s = e.getData('elite') as Estado | undefined;
    return s ? sentinelaBloqueia(s.fase, e.x, e.y, deX, deY) : false;
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoSentinela): void {
  if (s.fase === 'fogo') s.ciclos++;
  s.fase = fase;
  s.t = 0;
  if (fase === 'abrir') {
    e.setRotation(0);
    vestir(e, 'eliteSentinela');
    // Virada para a nave: a arte nasce apontando para a direita.
    e.setFlipX(true);
    tocar(e, 'elite-sentinela-abrir');
    s.escudo ??= e.scene.add.image(e.x, e.y, 'eliteEscudo').setDepth(e.depth + 1);
    s.escudo.setVisible(true).setAlpha(0);
    s.cd = 0.3;
    s.anel = false;
  } else if (fase === 'fechar') {
    s.escudo?.setVisible(false);
    tocar(e, 'elite-sentinela-fechar');
  } else if (fase === 'rolando' || fase === 'saindo') {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    s.escudo?.setVisible(false);
    if (fase === 'rolando') s.posto = escolherPosto(Math.random, s.posto.y);
  }
}

/** O FOGO: rajadas miradas de `rajadaN`, uma a cada `rajadaCadaS`, e UM anel no meio do fogo. */
function atirar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  const boca = { x: e.x - e.displayWidth * 0.4, y: e.y - 2 };
  if (!s.anel && s.t >= S.fogoS / 2) {
    s.anel = true;
    ctx.tiros.anel(e.x, e.y, S.anelN, S.velTiro * 0.8, Math.random() * Math.PI);
  }
  if (s.rajada > 0) {
    s.rajadaT -= dt;
    if (s.rajadaT <= 0) {
      ctx.tiros.mirado(boca.x, boca.y, ctx.alvo.x, ctx.alvo.y, S.velTiro);
      s.rajada--;
      s.rajadaT = S.rajadaEspacoS;
    }
    return;
  }
  s.cd -= dt;
  if (s.cd <= 0) {
    s.cd = S.rajadaCadaS;
    s.rajada = S.rajadaN;
    s.rajadaT = 0;
  }
}
