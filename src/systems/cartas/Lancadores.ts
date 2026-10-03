import Phaser from 'phaser';
import type { Contexto } from './contexto';
import type { ExplosaoDoJogador } from './ExplosaoDoJogador';
import { texturaDaLinhagem } from './texturasProvisorias';

/**
 * PROVISÓRIOS (calibragem). O míssil é forte e raro; o tiro leve e constante é do drone (spec §4.3).
 *
 * O míssil persegue como o INTERCEPTADOR (o kamikaze): ACELERA na direção do alvo e tem inércia — se o alvo desvia, ele
 * passa reto, faz a curva e volta (pedido dele, 02/10). As TRAVAS para não virar um míssil que orbita para sempre: a
 * velocidade máxima e a aceleração (a curva de volta é larga, sem zigue-zague) e a VIDA curta — acabou, ele explode no
 * ar onde estiver (o míssil que errou ainda entra na cadeia das explosões).
 */
const MISSIL = {
  esperaMs: 3000,
  atrasoDo2oMs: 140,
  velocidadeInicial: 80,
  velocidadeMax: 150,
  aceleracao: 420,
  /**
   * ⚠️ O AMORTECEDOR DE LADO (por segundo). Sem ele, aceleração fixa + velocidade no teto = ÓRBITA: o míssil que errou
   * gira em volta do alvo num raio de v²/a (~54px) até a vida acabar, sem nunca voltar nele — medido no GIF de 02/10.
   * Amortecer só a componente PERPENDICULAR ao alvo deixa a curva de volta larga, mas faz ela fechar NO alvo.
   */
  amortecimentoLateral: 3,
  vidaMs: 2500,
  dano: 2,
};
/**
 * O FLARE é SOLTO PELO JOGADOR (02/10, *"para não ficar muito roubado"*): a ação FLARE (F — 03/10, *"em jogos de naves
 * o flare é F"*), com espera; "FLARE" acende na HUD quando pronto. Sai para trás a 60px/s e FREIA (×0,1 por segundo)
 * até parar — fica na rota de quem persegue.
 */
const FLARE = { esperaMs: 8000, velocidade: 60, freio: 0.1, vidaMs: 3000, dano: 1 };

type Alvo = Phaser.Physics.Arcade.Sprite;

interface Missil {
  b: Phaser.Physics.Arcade.Sprite;
  id: number;
  alvo: Alvo | null;
  explodeEm: number;
}

/**
 * MÍSSIL GUIADO e FLARE — os lançadores que não são o gatilho da nave. Os dois soltam projéteis pelo pool da nave
 * (`WeaponSystem.disparar`) e EXPLODEM pela explosão única: o míssil ao acertar (ou no fim da vida), o flare ao tocar
 * alguém ou, se ninguém tocar, sozinho depois de ~3s (armadilha para quem persegue, bomba de retaguarda).
 */
export class Lancadores {
  private proximoMissil = 0;
  private flarePronto = 0;
  private serie = 0;
  private readonly misseis: Missil[] = [];
  private readonly flares: { b: Phaser.Physics.Arcade.Sprite; id: number; explodeEm: number }[] = [];

  constructor(
    private readonly c: Contexto,
    private readonly explosao: ExplosaoDoJogador,
  ) {}

  /** "FLARE" aceso na HUD: tem a carta e a espera passou. */
  get flareProntoAgora(): boolean {
    return this.c.tem('EFF_010') && this.c.h.scene.time.now >= this.flarePronto;
  }

  /** Quanto falta para o próximo flare (ms; 0 = pronto) — ou `null` sem a carta. A HUD conta a recarga. */
  get flareFalta(): number | null {
    if (!this.c.tem('EFF_010')) return null;
    return Math.max(0, this.flarePronto - this.c.h.scene.time.now);
  }

  tick(dt: number, flarePedido: boolean): void {
    const agora = this.c.h.scene.time.now;
    const n = this.c.h.nave();

    const quantos = this.c.quantas('WPN_009');
    if (quantos) {
      if (!this.proximoMissil) this.proximoMissil = agora + MISSIL.esperaMs;
      else if (agora >= this.proximoMissil) {
        this.proximoMissil = agora + MISSIL.esperaMs;
        this.salva(quantos);
      }
    }

    if (flarePedido && this.flareProntoAgora) {
      this.flarePronto = agora + FLARE.esperaMs;
      this.soltarFlare(n.x - 12, n.y, agora);
    }

    this.tickMisseis(dt, agora);
    this.tickFlares(dt, agora);
  }

  // ─── O MÍSSIL ─────────────────────────────────────────────────────────────────────────────────

  /**
   * Uma SALVA: com a carta duas vezes, dois mísseis — o 2º sai um instante depois do 1º, e CADA UM trava no seu alvo
   * (o mais próximo da nave e o 2º mais próximo). Antes os dois corriam para o mesmo, e o que sobrava "pulava" para
   * outro inimigo — lia como reação em cadeia, não como míssil.
   */
  private salva(quantos: number): void {
    for (let i = 0; i < quantos; i++) {
      if (i === 0) this.lancar(-4);
      else this.c.h.scene.time.delayedCall(MISSIL.atrasoDo2oMs * i, () => this.lancar(4));
    }
  }

  private lancar(dy: number): void {
    const n = this.c.h.nave();
    if (!n.active) return;
    const b = this.c.h.weapons.disparar({
      x: n.x + 6,
      y: n.y + dy,
      angulo: 0,
      textura: texturaDaLinhagem(this.c.h.scene, 'carta-missil', this.c.h.linhagem),
      velocidade: MISSIL.velocidadeInicial,
      dano: MISSIL.dano,
      origem: 'missil',
    });
    if (!b) return;
    const id = ++this.serie;
    b.setData('missil', id);
    this.misseis.push({ b, id, alvo: this.alvoLivre(n.x, n.y), explodeEm: this.c.h.scene.time.now + MISSIL.vidaMs });
  }

  /** O alvo vivo mais próximo de (x, y) que NENHUM outro míssil está perseguindo; se todos estão, o mais próximo. */
  private alvoLivre(x: number, y: number): Alvo | null {
    const ocupados = new Set(this.misseis.filter((m) => m.alvo?.active).map((m) => m.alvo));
    const vivos = this.c.h.alvos().filter((a) => a.active);
    const porDistancia = (a: Alvo, b: Alvo): number =>
      Phaser.Math.Distance.Squared(x, y, a.x, a.y) - Phaser.Math.Distance.Squared(x, y, b.x, b.y);
    const livres = vivos.filter((a) => !ocupados.has(a)).sort(porDistancia);
    return livres[0] ?? vivos.sort(porDistancia)[0] ?? null;
  }

  private tickMisseis(dt: number, agora: number): void {
    for (let i = this.misseis.length - 1; i >= 0; i--) {
      const m = this.misseis[i];
      // O slot pode ter sido reciclado (o míssil acertou e voltou ao pool): o id confere que ainda é ESTE míssil.
      const vivo = m.b.active && m.b.getData('origem') === 'missil' && m.b.getData('missil') === m.id;
      if (!vivo) {
        this.misseis.splice(i, 1);
        continue;
      }
      if (agora >= m.explodeEm) {
        // A VIDA ACABOU: explode no ar — o que errou ainda vale (e ainda solta estilhaço, ainda incendeia).
        this.misseis.splice(i, 1);
        const { x, y } = m.b;
        this.c.h.weapons.release(m.b);
        this.explosao.explodir('missil', x, y, null, null);
        continue;
      }
      // O alvo morreu antes (o tiro da nave chegou primeiro): pega o livre mais próximo DO MÍSSIL.
      if (!m.alvo?.active) m.alvo = this.alvoLivre(m.b.x, m.b.y);

      const body = m.b.body as Phaser.Physics.Arcade.Body;
      if (m.alvo) {
        const ang = Math.atan2(m.alvo.y - m.b.y, m.alvo.x - m.b.x);
        const ux = Math.cos(ang);
        const uy = Math.sin(ang);
        // A velocidade em duas partes: NA DIREÇÃO do alvo (intocada) e DE LADO (amortecida — ver `amortecimentoLateral`).
        const naDirecao = body.velocity.x * ux + body.velocity.y * uy;
        const amortece = Math.exp(-MISSIL.amortecimentoLateral * dt);
        const ladoX = (body.velocity.x - naDirecao * ux) * amortece;
        const ladoY = (body.velocity.y - naDirecao * uy) * amortece;
        body.velocity.x = naDirecao * ux + ladoX + ux * MISSIL.aceleracao * dt;
        body.velocity.y = naDirecao * uy + ladoY + uy * MISSIL.aceleracao * dt;
      }
      const v = body.velocity.length();
      if (v > MISSIL.velocidadeMax) body.velocity.scale(MISSIL.velocidadeMax / v);
      m.b.setRotation(Math.atan2(body.velocity.y, body.velocity.x));
    }
  }

  // ─── O FLARE ──────────────────────────────────────────────────────────────────────────────────

  private soltarFlare(x: number, y: number, agora: number): void {
    const b = this.c.h.weapons.disparar({
      x,
      y,
      angulo: 180,
      textura: 'carta-flare',
      velocidade: FLARE.velocidade,
      dano: FLARE.dano,
      origem: 'flare',
    });
    if (!b) return;
    const id = ++this.serie;
    b.setData('flare', id);
    this.flares.push({ b, id, explodeEm: agora + FLARE.vidaMs });
  }

  private tickFlares(dt: number, agora: number): void {
    for (let i = this.flares.length - 1; i >= 0; i--) {
      const f = this.flares[i];
      // O slot pode ter sido reciclado (o flare tocou alguém e voltou ao pool): o id confere que ainda é ESTE flare.
      const vivo = f.b.active && f.b.getData('origem') === 'flare' && f.b.getData('flare') === f.id;
      if (!vivo) {
        this.flares.splice(i, 1);
        continue;
      }
      const body = f.b.body as Phaser.Physics.Arcade.Body;
      body.velocity.x *= Math.pow(FLARE.freio, dt);
      if (agora < f.explodeEm) continue;
      this.flares.splice(i, 1);
      const { x, y } = f.b;
      this.c.h.weapons.release(f.b);
      this.explosao.explodir('flare', x, y, null, null);
    }
  }
}
