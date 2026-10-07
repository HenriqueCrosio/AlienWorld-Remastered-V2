import Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { rachadura1X, rachadura2X, tentaculoAvanca, tentaculoEnraizado, type EstadoTentaculo } from '../../elitesRegras';
import { PadroesDeTiro } from '../../systems/PadroesDeTiro';
import { vestir, type ComportamentoElite, type CtxElite, type Sprite } from './tipos';

const T = ELITES.tentaculo;

interface Ponto {
  x: number;
  y: number;
}

interface Estado {
  fase: EstadoTentaculo;
  t: number;
  /** O BURACO (a raiz): é do casco — anda com o chão enquanto a rachadura existe. */
  raizX: number;
  /** O bote: de onde sai e o ponto onde a nave estava no fim do aviso (não persegue). */
  origem: Ponto;
  alvo: Ponto;
  /** O caminho da cabeça nos estados LIVRES (o mais novo primeiro): os gomos o seguem, como um verme. */
  caminho: Ponto[];
  gomos: Sprite[];
  racha: Phaser.GameObjects.Sprite;
  /** No mergulho, tudo passa para TRÁS das placas do casco (depth −75). */
  atras: boolean;
}

/** A hitbox da cabeça, fixa (a boca em anel; a arte à mão tem 24×22 com as garras). */
const CABECA = { w: 14, h: 14 };
/** A hitbox de cada gomo (13×13 na arte). */
const GOMO = { w: 9, h: 9 };
/** O primeiro gomo fica a esta distância da cabeça (o pescoço), os outros a `gomoEspaco`. */
const PESCOCO = 9;
/** As camadas: na frente das placas do casco (−75) e atrás dos props (−0,5) e dos inimigos; a rachadura sobre a placa. */
const DEPTH_FRENTE = -1;
const DEPTH_ATRAS = -76;
const DEPTH_RACHA = -74;
/** De pé, a boca olha para cima e um pouco para a nave (a arte nasce com a boca à ESQUERDA). */
const ROT_DE_PE = Math.PI / 2 - 0.3;

/** A BOLINHA da meia-lua (à mão, 06/10): 3×3, hitbox 3×3. */
const vestirBolinha = PadroesDeTiro.vestirArte('eliteTiroBolinha', { w: 3, h: 3 });

const easeOutCubic = (u: number): number => 1 - (1 - Phaser.Math.Clamp(u, 0, 1)) ** 3;

/**
 * O TENTÁCULO DO CASCO (spec F3 §3 — o desenho é DELE — e a regra do casco §3.3): uma RACHADURA chega sob a nave
 * (nasce à frente; o chão a traz) → o BOTE morde onde a nave estava → o MERGULHO passa do ponto e cai por trás das
 * placas → PAUSA → outra rachadura LONGE → ERGUE como uma torre que rola com o casco → MEIA-LUA de 6 para cima →
 * SEGURA → AFUNDA e vai embora. Só a CABEÇA fere e é ferida; os GOMOS (`ctx.corpos`) absorvem o tiro e ferem a nave.
 * O que toca o casco anda com o chão (`noChao`, até travado); o que está solto anda na tela.
 */
export const TENTACULO: ComportamentoElite = {
  iniciar(e, ctx) {
    vestir(e, 'eliteTentaculoCabeca', CABECA);
    e.setFlipX(false);
    e.setDepth(DEPTH_FRENTE);
    // Antes do 1º `update` não há nave guardada (o alvo é o próprio sprite): a rachadura nasce no meio do terço esquerdo.
    const naveX = ctx.alvo === e ? 120 : ctx.alvo.x;
    const raizX = rachadura1X(naveX, ctx.velChao);
    const cena = e.scene;
    const racha = cena.add.sprite(raizX, T.chaoY, 'eliteRachaduraAnim0').setDepth(DEPTH_RACHA);
    if (cena.anims.exists('elite-rachadura')) racha.play('elite-rachadura');
    const gomos: Sprite[] = [];
    for (let i = 0; i < T.gomos; i++) {
      const g = ctx.corpos.create(raizX, T.chaoY + 20, 'eliteTentaculoGomo') as Sprite;
      g.setDepth(DEPTH_FRENTE - 0.001 * (i + 1));
      (g.body as Phaser.Physics.Arcade.Body).setSize(GOMO.w, GOMO.h);
      gomos.push(g);
    }
    const s: Estado = {
      fase: 'aviso1',
      t: 0,
      raizX,
      origem: { x: raizX, y: T.chaoY + 8 },
      alvo: { x: naveX, y: 100 },
      caminho: [],
      gomos,
      racha,
      atras: false,
    };
    e.setData('elite', s);
    e.once('destroy', () => {
      for (const g of gomos) g.destroy();
      racha.destroy();
    });
    enterrar(s);
    esconderTudo(e, s);
  },

  noChao(e, dt, ctx) {
    const s = e.getData('elite') as Estado | undefined;
    if (!s) return;
    const dx = ctx.velChao * dt;
    if (tentaculoEnraizado(s.fase) || s.fase === 'bote') {
      s.raizX -= dx;
      s.racha.x = s.raizX;
    }
    if (tentaculoEnraizado(s.fase)) {
      // A torre é RÍGIDA no casco: a cabeça e os gomos andam junto (vale também com ela travada pelo elétrico).
      e.x -= dx;
      for (const g of s.gomos) g.x -= dx;
    } else if (s.fase === 'bote') {
      // A raiz é o buraco enquanto os gomos passam por ele: o que ainda está DENTRO do casco anda com o chão.
      for (const p of s.caminho) if (p.y >= T.chaoY - 1) p.x -= dx;
    }
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    s.t += dt;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    const prox = tentaculoAvanca(s.fase, s.t);
    if (prox !== s.fase) entrar(e, s, prox, ctx);
    if (s.fase === 'foi') {
      // Foi embora (sem pontos): afundou de vez.
      e.destroy();
      return;
    }
    if (s.fase === 'bote') {
      const u = easeOutCubic(s.t / T.boteS);
      moverCabeca(e, s, { x: Phaser.Math.Linear(s.origem.x, s.alvo.x, u), y: Phaser.Math.Linear(s.origem.y, s.alvo.y, u) });
    } else if (s.fase === 'mergulho') {
      // O arco PASSA do ponto (sobe um pouco) e cai acelerando para trás, por trás das placas.
      const u = Math.min(1, s.t / T.mergulhoS);
      const y = s.alvo.y - 16 * Math.sin(Math.PI * u) + (T.chaoY + 50 - s.alvo.y) * u * u;
      moverCabeca(e, s, { x: s.alvo.x + T.mergulhoDX * u, y });
    } else if (s.fase === 'ergue' || s.fase === 'meiaLua' || s.fase === 'segura' || s.fase === 'afunda') {
      deP(e, s);
    }
    recortar(e, s);
  },

  intocavel(e) {
    return !(e.body as Phaser.Physics.Arcade.Body | null)?.enable;
  },
};

function entrar(e: Sprite, s: Estado, fase: EstadoTentaculo, ctx: CtxElite): void {
  s.fase = fase;
  s.t = 0;
  if (fase === 'bote') {
    // A mordida vai ao ponto onde a nave está AGORA (o fim do aviso) — e não a persegue.
    s.origem = { x: s.raizX, y: T.chaoY + 8 };
    s.alvo = { x: ctx.alvo.x, y: Phaser.Math.Clamp(ctx.alvo.y, T.tetoBoteY, T.chaoY - 10) };
    enterrar(s);
    e.setVisible(true);
  } else if (fase === 'mergulho') {
    s.atras = true;
    e.setDepth(DEPTH_ATRAS);
    s.gomos.forEach((g, i) => g.setDepth(DEPTH_ATRAS - 0.001 * (i + 1)));
    s.racha.setVisible(false);
  } else if (fase === 'pausa') {
    esconderTudo(e, s);
    s.atras = false;
    e.setDepth(DEPTH_FRENTE);
    s.gomos.forEach((g, i) => g.setDepth(DEPTH_FRENTE - 0.001 * (i + 1)));
  } else if (fase === 'aviso2') {
    // LONGE da nave, perto da borda direita — e de lá ela rola com o chão na direção da nave.
    s.raizX = rachadura2X(ctx.alvo.x);
    s.racha.setPosition(s.raizX, T.chaoY).setVisible(true);
  } else if (fase === 'ergue') {
    e.setVisible(true);
    e.setPosition(s.raizX, T.chaoY + 10);
  } else if (fase === 'meiaLua') {
    meiaLua(e, ctx);
  } else if (fase === 'aviso1') {
    s.racha.setVisible(true);
  }
}

/** O caminho começa DENTRO do casco, uma coluna sob o buraco: o primeiro gomo a sair é o pescoço. */
function enterrar(s: Estado): void {
  s.caminho = Array.from({ length: 48 }, (_, k) => ({ x: s.raizX, y: T.chaoY + 8 + k * 2 }));
}

function esconderTudo(e: Sprite, s: Estado): void {
  e.setVisible(false);
  (e.body as Phaser.Physics.Arcade.Body).enable = false;
  for (const g of s.gomos) {
    g.setVisible(false);
    (g.body as Phaser.Physics.Arcade.Body).enable = false;
  }
}

/** A cabeça LIVRE: vai ao ponto, aponta a boca para onde anda, e os gomos seguem o caminho dela. */
function moverCabeca(e: Sprite, s: Estado, p: Ponto): void {
  const dx = p.x - e.x, dy = p.y - e.y;
  // A arte tem a boca à ESQUERDA: rumo 0 (direita) pede meia-volta.
  if (dx * dx + dy * dy > 0.01) e.setRotation(Math.atan2(dy, dx) - Math.PI);
  e.setPosition(p.x, p.y);
  s.caminho.unshift({ x: p.x, y: p.y });
  // Os gomos: a `PESCOCO + i × gomoEspaco` px da cabeça, medidos AO LONGO do caminho.
  let i = 0, acum = 0, alvo = PESCOCO;
  for (let k = 1; k < s.caminho.length && i < s.gomos.length; k++) {
    const a = s.caminho[k - 1], b = s.caminho[k];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    while (i < s.gomos.length && acum + seg >= alvo) {
      const u = seg > 0 ? (alvo - acum) / seg : 0;
      s.gomos[i].setPosition(a.x + (b.x - a.x) * u, a.y + (b.y - a.y) * u);
      i++;
      alvo = PESCOCO + i * T.gomoEspaco;
    }
    acum += seg;
    if (i >= s.gomos.length) s.caminho.length = k + 1;
  }
  // Caminho curto demais (o começo do bote): os que sobram ficam na raiz, dentro do casco.
  for (; i < s.gomos.length; i++) s.gomos[i].setPosition(s.raizX, T.chaoY + 12 + i * T.gomoEspaco);
}

/** DE PÉ: a torre rígida sobre a raiz (que rola com o chão). Ergue, segura e afunda pela altura da cabeça. */
function deP(e: Sprite, s: Estado): void {
  let h = T.alturaErgue;
  if (s.fase === 'ergue') h = T.alturaErgue * easeOutCubic(s.t / T.ergueS) - 10 * (1 - easeOutCubic(s.t / T.ergueS));
  else if (s.fase === 'afunda') {
    const u = Math.min(1, s.t / T.afundaS);
    h = T.alturaErgue - (T.alturaErgue + PESCOCO + T.gomos * T.gomoEspaco) * u * u;
  }
  const yCab = T.chaoY - h;
  e.setRotation(ROT_DE_PE);
  e.setPosition(s.raizX, yCab);
  s.gomos.forEach((g, i) => {
    const sway = Math.sin(s.t * 5 + i * 0.7) * 1.2 * (1 - i / s.gomos.length);
    g.setPosition(s.raizX + sway, yCab + PESCOCO + i * T.gomoEspaco);
  });
}

/**
 * O CASCO ESCONDE o que está dentro dele. Na frente das placas, a parte do gomo abaixo da crista é CORTADA (e sem corpo
 * quando mais da metade está dentro); atrás das placas (o mergulho), quem esconde é a própria placa. A cabeça só tem
 * corpo — só fere e só é ferida — fora do casco.
 */
function recortar(e: Sprite, s: Estado): void {
  const escondido = s.fase === 'aviso1' || s.fase === 'aviso2' || s.fase === 'pausa';
  for (const g of s.gomos) {
    const b = g.body as Phaser.Physics.Arcade.Body;
    if (escondido) {
      g.setVisible(false);
      b.enable = false;
      continue;
    }
    const h = g.height;
    const topo = g.y - h / 2;
    const vis = s.atras ? h : Phaser.Math.Clamp(T.chaoY - topo, 0, h);
    g.setVisible(vis > 0);
    if (vis > 0 && vis < h) g.setCrop(0, 0, g.width, vis);
    else g.setCrop();
    const fora = s.atras ? g.y < T.chaoY : vis > h / 2;
    b.enable = fora;
    if (fora) b.reset(g.x, g.y);
  }
  const corpo = e.body as Phaser.Physics.Arcade.Body;
  if (escondido) return;
  const fora = e.y < T.chaoY - 4;
  e.setVisible(s.atras || e.y < T.chaoY + 6);
  if (fora !== corpo.enable) {
    corpo.enable = fora;
    if (fora) corpo.reset(e.x, e.y);
  }
}

/** A MEIA-LUA (decisão dele: B): 6 tiros num arco de 140° para CIMA, da boca — cobre área, não mira. */
function meiaLua(e: Sprite, ctx: CtxElite): void {
  const arco = Phaser.Math.DegToRad(T.meiaLuaArcoGraus);
  const bx = e.x - 3, by = e.y - 8;
  for (let i = 0; i < T.meiaLuaN; i++) {
    const a = -Math.PI / 2 - arco / 2 + (arco * i) / (T.meiaLuaN - 1);
    ctx.tiros.disparar(bx, by, a, T.velMeiaLua, vestirBolinha);
  }
  ctx.tiros.clarao(bx, by, 5);
}
