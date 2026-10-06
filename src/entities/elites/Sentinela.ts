import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { escolherPosto, escudoAbsorve, sentinelaAvanca, sentinelaBloqueia, type EstadoSentinela } from '../../elitesRegras';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const S = ELITES.sentinela;

interface Estado {
  fase: EstadoSentinela;
  t: number;
  ciclos: number;
  posto: { x: number; y: number };
  /** A espera até o próximo tiro (fogo ou varredura). */
  cd: number;
  /** O próximo tiro do fogo é o PESADO (canhão de cima)? Senão, o leque da minigun. */
  pesado: boolean;
  escudo: Phaser.GameObjects.Image | null;
  /** A vida do escudo DESTE ciclo (`escudoAbsorve`); 0 = quebrado até o próximo ABRIR. */
  escudoHp: number;
}

/**
 * A HITBOX da forma aberta, FIXA: o quadro da S2 (63×50) inclui as chamas dos propulsores e o clarão do disparo, e a
 * hitbox não pode crescer com eles. O escudo fica a `ESCUDO_DX` à frente do centro.
 */
const CORPO = { w: 26, h: 24 };
const ESCUDO_DX = 24;
/**
 * As BOCAS, medidas na arte (o quadro 63×50 apontando para a DIREITA; em jogo ela está espelhada, virada para a nave):
 * o canhão de cima com a alma na linha 7 e a minigun com DOIS canos, nas linhas 27 e 31; as pontas em x≈43. Em
 * relação ao centro do sprite (31,5; 25). 06/10: medido de novo na arte (a de cima estava 1,5px acima do cano).
 */
const BOCA_CIMA = { dx: 13, dy: -18 };
/** Os DOIS canos da minigun, o de cima primeiro: o leque solta um tiro de cada (06/10, o desenho dele). */
const CANOS_MINIGUN = [
  { dx: 13, dy: 2 },
  { dx: 13, dy: 6 },
] as const;

const tocar = (e: Sprite, chave: string): void => {
  if (e.scene.anims.exists(chave) && e.anims.currentAnim?.key !== chave) e.play(chave);
};

/**
 * OS TIROS DESENHADOS (06/10, ele: *"mais fiel aos canos das metralhadoras — da minigun os tiros são finos e
 * vermelhos; o pesado com o aspecto dos outros, mas um balaço"*). Era a bola rosa da canhoneira e o `bolt2` magenta.
 * A minigun: 7×1, só a ponta acesa (M-C), hitbox 4×3. O balaço: 9×3 (P-A, provisório), hitbox 6×4.
 */
const vestirMinigun = PadroesDeTiro.vestirArte('eliteTiroMinigun', { w: 4, h: 3 });
const vestirPesado = PadroesDeTiro.vestirArte('eliteTiroBalaco', { w: 6, h: 4 });

/** A boca, no mundo: as medidas da arte, espelhadas quando ela está virada para a nave. */
const boca = (e: Sprite, b: { dx: number; dy: number }): { x: number; y: number } => ({
  x: e.x + (e.flipX ? -b.dx : b.dx),
  y: e.y + b.dy,
});

/**
 * A SENTINELA ORBITAL (spec frente B §3.3) — à la droideka: ROLANDO (a roda girando até um posto na metade direita)
 * → ABRIR (desdobra e ergue o ESCUDO em arco, virado para a nave) → FOGO (os DOIS tiros alternando, como o golfinho:
 * a bola pesada e lenta do canhão de cima, o leque leve da minigun) → SOBRECARGA (o escudo CAI e a minigun VARRE de
 * cima para baixo — a 2ª janela, pedido dele de 05/10) → FECHAR (sem escudo)
 * → rola para outro posto. Depois de `ciclos` fogos, vai embora rolando. O escudo segura o que vem
 * de FRENTE (`sentinelaBloqueia`); por cima, por baixo ou por trás passa. ⚠️ O elétrico NÃO o desfaz (rebalanceamento).
 */
export const SENTINELA: ComportamentoElite = {
  iniciar(e) {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    const s: Estado = { fase: 'rolando', t: 0, ciclos: 0, posto: escolherPosto(Math.random, null), cd: 0, pesado: true, escudo: null, escudoHp: S.escudoHp };
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

    if (s.escudo) {
      // Gasto, ele fica mais fraco e treme mais rápido: a leitura de "está quase quebrando".
      const resta = s.escudoHp / S.escudoHp;
      const pulso = 0.75 + 0.25 * Math.sin(s.t * (18 + 30 * (1 - resta)));
      s.escudo.setPosition(e.x - ESCUDO_DX, e.y).setAlpha(s.fase === 'abrir' ? Math.min(1, s.t / S.abrirS) : pulso * (0.5 + 0.5 * resta));
    }
    if (s.fase === 'fogo') {
      // Pairando (as chamas piscam) entre um disparo e outro; o DISPARO toca inteiro antes de voltar.
      const disparando = e.anims.isPlaying && e.anims.currentAnim?.key === 'elite-sentinela-disparo';
      if (!disparando) tocar(e, 'elite-sentinela-pairar');
      atirar(e, s, dt, ctx);
    }
    if (s.fase === 'sobrecarga') varrer(e, s, dt, ctx);
  },

  bloqueia(e, deX, deY, dano) {
    const s = e.getData('elite') as Estado | undefined;
    if (!s || !sentinelaBloqueia(s.fase, e.x, e.y, deX, deY, s.escudoHp)) return false;
    const r = escudoAbsorve(s.escudoHp, dano);
    s.escudoHp = r.hp;
    if (r.quebrou) quebrarEscudo(e, s);
    else if (s.escudo) {
      // O golpe acende o escudo (pisca branco), como o pisca do inimigo ferido.
      s.escudo.setTintFill(0xffffff);
      e.scene.time.delayedCall(40, () => s.escudo?.clearTint());
    }
    return true;
  },
};

/**
 * O ESCUDO QUEBRA: some, e o arco estoura em lascas vermelhas que voam para trás — a sentinela fica exposta até o
 * próximo ABRIR (o fogo e a sobrecarga deste ciclo seguem, agora sem defesa).
 */
function quebrarEscudo(e: Sprite, s: Estado): void {
  const esc = s.escudo;
  if (!esc) return;
  esc.setVisible(false);
  const cena = e.scene;
  for (let i = 0; i < 9; i++) {
    const y = esc.y + (i - 4) * 4;
    const lasca = cena.add.image(esc.x, y, 'spark').setDepth(esc.depth).setTint(i % 3 ? 0xd62c28 : 0xff8870);
    const ang = Math.PI + (i - 4) * 0.18 + (Math.random() - 0.5) * 0.3;
    const v = 18 + Math.random() * 22;
    cena.tweens.add({
      targets: lasca,
      x: lasca.x + Math.cos(ang) * v,
      y: lasca.y + Math.sin(ang) * v,
      alpha: 0,
      duration: 380 + Math.random() * 200,
      ease: 'Quad.easeOut',
      onComplete: () => lasca.destroy(),
    });
  }
}

function entrar(e: Sprite, s: Estado, fase: EstadoSentinela): void {
  if (s.fase === 'fogo') s.ciclos++;
  s.fase = fase;
  s.t = 0;
  if (fase === 'abrir') {
    e.setRotation(0);
    vestir(e, 'eliteSentinela', CORPO);
    // Virada para a nave: a arte nasce apontando para a direita.
    e.setFlipX(true);
    tocar(e, 'elite-sentinela-abrir');
    s.escudo ??= e.scene.add.image(e.x, e.y, 'eliteEscudo').setDepth(e.depth + 1);
    s.escudo.setVisible(true).setAlpha(0).clearTint();
    // Cada ciclo ergue um escudo NOVO, inteiro.
    s.escudoHp = S.escudoHp;
    s.cd = 0.3;
    s.pesado = true;
  } else if (fase === 'sobrecarga') {
    // O escudo cai; a varredura começa no alto.
    s.escudo?.setVisible(false);
    s.cd = 0;
    tocar(e, 'elite-sentinela-sobrecarga');
  } else if (fase === 'fechar') {
    s.escudo?.setVisible(false);
    e.setTint(e.getData('tint') as number);
    tocar(e, 'elite-sentinela-fechar');
  } else if (fase === 'rolando' || fase === 'saindo') {
    vestir(e, 'eliteSentinelaRoda');
    e.setFlipX(false);
    s.escudo?.setVisible(false);
    if (fase === 'rolando') s.posto = escolherPosto(Math.random, s.posto.y);
  }
}

/**
 * A VARREDURA da sobrecarga: a minigun varre o arco `varreduraArcoGraus` de CIMA para BAIXO durante a sobrecarga, um
 * tiro leve a cada `varreduraCadaS` — uma cortina com buracos (~10 tiros). O canhão de cima fica quieto, esquentando.
 * (Sem a arte da sobrecarga, o corpo pulsa quente em código.)
 */
function varrer(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  s.cd -= dt;
  if (s.cd <= 0) {
    s.cd = S.varreduraCadaS;
    const arco = Phaser.Math.DegToRad(S.varreduraArcoGraus);
    // π é a esquerda; π + arco/2 aponta para cima-esquerda (o y cresce para baixo) e desce até π − arco/2.
    const ang = Math.PI + arco / 2 - arco * Math.min(1, s.t / S.sobrecargaS);
    // Os dois canos se revezam na varredura.
    const m = boca(e, CANOS_MINIGUN[Math.floor(s.t / S.varreduraCadaS) % 2]);
    ctx.tiros.disparar(m.x, m.y, ang, S.velVarredura, vestirMinigun);
    ctx.tiros.clarao(m.x, m.y, 2);
  }
  if (!e.scene.anims.exists('elite-sentinela-sobrecarga')) e.setTint(Math.floor(s.t * 12) % 2 ? 0xffb894 : (e.getData('tint') as number));
}

/**
 * O FOGO: um cano de cada vez, alternando a cada `alternarCadaS` — a BOLA PESADA do canhão de cima (lenta, mirada) e o
 * LEQUE da minigun (`lequeN` tiros leves e rápidos). Cada disparo toca o DISPARO da arte.
 */
function atirar(e: Sprite, s: Estado, dt: number, ctx: CtxElite): void {
  s.cd -= dt;
  if (s.cd > 0) return;
  s.cd = S.alternarCadaS;
  if (s.pesado) {
    const c = boca(e, BOCA_CIMA);
    ctx.tiros.mirado(c.x, c.y, ctx.alvo.x, ctx.alvo.y, S.pesadoVel, vestirPesado);
  } else {
    // O LEQUE sai dos DOIS canos: mirado do meio deles, o tiro que sobe sai do cano de cima e o que desce, do de baixo.
    const meio = boca(e, { dx: CANOS_MINIGUN[0].dx, dy: (CANOS_MINIGUN[0].dy + CANOS_MINIGUN[1].dy) / 2 });
    const ang = Phaser.Math.Angle.Between(meio.x, meio.y, ctx.alvo.x, ctx.alvo.y);
    const abertura = Phaser.Math.DegToRad(S.lequeAberturaGraus);
    const angs = Array.from({ length: S.lequeN }, (_, i) => (S.lequeN === 1 ? ang : ang - abertura / 2 + (abertura * i) / (S.lequeN - 1)));
    angs.sort((a, b) => Math.sin(a) - Math.sin(b));
    angs.forEach((a, i) => {
      const m = boca(e, CANOS_MINIGUN[i < S.lequeN / 2 ? 0 : 1]);
      ctx.tiros.disparar(m.x, m.y, a, S.lequeVel, vestirMinigun);
      ctx.tiros.clarao(m.x, m.y, 2);
    });
  }
  s.pesado = !s.pesado;
  if (e.scene.anims.exists('elite-sentinela-disparo')) e.play('elite-sentinela-disparo');
}
