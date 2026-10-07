import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { cacadorAvanca, cacadorTangivel, escolherPosto, tintaDoSumico, type EstadoCacador } from '../../elitesRegras';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const C = ELITES.cacador;

interface Estado {
  fase: EstadoCacador;
  t: number;
  /** Quantos SOME já começaram (o 3º termina em `foi`). */
  sumicos: number;
  posto: { x: number; y: number };
  /** O ângulo da linha TRAVADA (a rajada sai nele). */
  ang: number;
  /** Agulhas já disparadas nesta rajada. */
  agulhas: number;
  /** A linha da mira (telégrafo 1px, como na folha de 06/10). */
  mira: Phaser.GameObjects.Graphics;
}

/**
 * A HITBOX, fixa: o quadro (41×41) é a lula na DIAGONAL — tentáculos e ponta da carapaça deixam muito vazio na caixa.
 * O miolo (o manto e a base dos tentáculos) é o que fere e é ferido.
 */
const CORPO = { w: 22, h: 22 };
/** A BOCA, medida na arte: o olho vermelho fica em (22, 25) do quadro 41×41; as agulhas saem da base dos tentáculos. */
const BOCA = { dx: 0, dy: 5 };
/** A tinta: um pouco atrás e abaixo do centro (o jato sai do sifão, junto da base dos tentáculos). */
const TINTA = { dx: 3, dy: 2 };

/** A AGULHA (à mão, 06/10): 5×1, aponta para a direita (o tiro gira para o rumo); hitbox 4×3. */
const vestirAgulha = PadroesDeTiro.vestirArte('eliteTiroAgulha', { w: 4, h: 3 });

const boca = (e: Sprite): { x: number; y: number } => ({ x: e.x + BOCA.dx, y: e.y + BOCA.dy });

/**
 * O CAÇADOR DE VÁCUO — a LULA (spec F3 §2 + emenda de 07/10): ESCONDIDA (invisível e sem corpo) → SURGE em pontilhado
 * num posto da metade direita → MIRA (a linha segue a nave) → TRAVA (a linha para e pisca) → RAJADA de 3 agulhas na
 * linha travada → SOME soltando TINTA no lugar (sopro, sopro, e a cortina na saída). Morta na mira, não atira.
 */
export const CACADOR: ComportamentoElite = {
  iniciar(e) {
    vestir(e, 'eliteCacador', CORPO);
    // A arte já nasce virada para a esquerda (a carapaça para cima-esquerda): nada de espelhar.
    e.setFlipX(false);
    const s: Estado = {
      fase: 'escondido',
      t: 0,
      sumicos: 0,
      posto: escolherPosto(Math.random, null, C),
      ang: Math.PI,
      agulhas: 0,
      mira: e.scene.add.graphics().setDepth(0.6),
    };
    e.setData('elite', s);
    e.once('destroy', () => s.mira.destroy());
    esconder(e, s);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const prox = cacadorAvanca(s.fase, s.t, s.sumicos);
    if (prox !== s.fase) entrar(e, s, prox, ctx);
    if (s.fase === 'foi') {
      // Foi embora: sem pontos (não é o caminho de morte).
      e.destroy();
      return;
    }
    desenharMira(e, s, ctx);
    if (s.fase === 'rajada') rajada(e, s, ctx);
  },

  intocavel(e) {
    const s = e.getData('elite') as Estado | undefined;
    return !s || !cacadorTangivel(s.fase);
  },

  // O RABO (§2.2): viva quando ele chega, ela some DE VEZ — se estiver à vista, no sopro; sem pontos.
  aoRabo(e) {
    const s = e.getData('elite') as Estado | undefined;
    if (s && cacadorTangivel(s.fase)) soltarTinta(e, 'sopro');
    e.destroy();
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoCacador, ctx: CtxElite): void {
  s.fase = fase;
  s.t = 0;
  if (fase === 'surge') {
    mostrar(e);
    if (e.scene.anims.exists('elite-cacador-surge')) e.play('elite-cacador-surge');
  } else if (fase === 'mira') {
    if (e.texture.key !== 'eliteCacador') e.setTexture('eliteCacador');
  } else if (fase === 'trava') {
    // A linha CONGELA onde a nave estava — desviar é sair dela agora.
    const b = boca(e);
    s.ang = Phaser.Math.Angle.Between(b.x, b.y, ctx.alvo.x, ctx.alvo.y);
  } else if (fase === 'rajada') {
    s.agulhas = 0;
  } else if (fase === 'some') {
    s.sumicos++;
    soltarTinta(e, tintaDoSumico(s.sumicos));
    if (e.scene.anims.exists('elite-cacador-some')) e.play('elite-cacador-some');
  } else if (fase === 'escondido') {
    esconder(e, s);
  }
}

/** Escondida: invisível e SEM CORPO (o tiro atravessa) — e já no próximo posto, longe da altura do anterior. */
function esconder(e: Sprite, s: Estado): void {
  e.anims.stop();
  e.setVisible(false);
  (e.body as Phaser.Physics.Arcade.Body).enable = false;
  s.posto = escolherPosto(Math.random, s.fase === 'escondido' && s.sumicos > 0 ? s.posto.y : null, C);
  e.setPosition(s.posto.x, s.posto.y);
  s.mira.clear();
}

function mostrar(e: Sprite): void {
  e.setVisible(true);
  const b = e.body as Phaser.Physics.Arcade.Body;
  b.enable = true;
  b.reset(e.x, e.y);
  vestir(e, 'eliteCacador', CORPO);
}

/**
 * A TINTA (§2.3): parada NO LUGAR onde foi solta, em depth 0,5 — por cima dos inimigos, por baixo de todo tiro e da nave
 * (depth 1). Os quadros são assados (`_instalar-f3.mjs`); o sprite se apaga sozinho no fim. Não fere, não bloqueia.
 */
function soltarTinta(e: Sprite, tipo: 'sopro' | 'cortina'): void {
  const cena = e.scene;
  const anim = `elite-tinta-${tipo}`;
  if (!cena.anims.exists(anim)) return;
  const prefixo = tipo === 'sopro' ? 'eliteTintaSoproAnim' : 'eliteTintaCortinaAnim';
  const t = cena.add.sprite(e.x + TINTA.dx, e.y + TINTA.dy, `${prefixo}0`).setDepth(0.5);
  t.setData('tinta', tipo);
  t.play(anim);
  t.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => t.destroy());
}

/**
 * A LINHA DA MIRA: 1px tracejado (4 acesos, 2 apagados) da boca até a borda da tela. Na MIRA ela segue a nave, fraca;
 * na TRAVA ela para e PISCA forte — o aviso final. Fora disso, nada.
 */
function desenharMira(e: Sprite, s: Estado, ctx: CtxElite): void {
  const g = s.mira;
  g.clear();
  if (s.fase !== 'mira' && s.fase !== 'trava') return;
  const b = boca(e);
  const ang = s.fase === 'mira' ? Phaser.Math.Angle.Between(b.x, b.y, ctx.alvo.x, ctx.alvo.y) : s.ang;
  const acesa = s.fase === 'mira' || Math.floor(s.t / 0.06) % 2 === 0;
  if (!acesa) return;
  g.fillStyle(s.fase === 'trava' ? 0xff5a4a : 0xc0302a, s.fase === 'trava' ? 0.95 : 0.55);
  const cx = Math.cos(ang), cy = Math.sin(ang);
  for (let d = 4; d < 460; d++) {
    if (d % 6 >= 4) continue;
    const x = Math.round(b.x + cx * d), y = Math.round(b.y + cy * d);
    if (x < -2 || y < -2 || x > 386 || y > 218) break;
    g.fillRect(x, y, 1, 1);
  }
}

/** A RAJADA: `agulhaN` agulhas rápidas, uma a cada `agulhaEspacoS`, NA LINHA TRAVADA (não persegue). */
function rajada(e: Sprite, s: Estado, ctx: CtxElite): void {
  while (s.agulhas < C.agulhaN && s.t >= s.agulhas * C.agulhaEspacoS) {
    const b = boca(e);
    ctx.tiros.disparar(b.x, b.y, s.ang, C.velAgulha, vestirAgulha);
    ctx.tiros.clarao(b.x, b.y, 2);
    s.agulhas++;
  }
}
