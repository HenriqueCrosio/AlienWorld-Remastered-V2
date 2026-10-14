import type Phaser from 'phaser';
import { ELITES } from '../../data/numerosElites';
import { esporoAlfa, esporoAvanco, esporoBalanco, esporoVivo, type SoltaEsporo } from '../../elitesRegras';

const E = ELITES.esporo;
/** Na camada dos inimigos: o esporo está no ar do corredor, na frente da borda e das mesas. */
const DEPTH = 0.2;
/** Os grãos grudados na nave lenta: quantos, e a que distância do centro dela. */
const GRAOS = 3;
const RAIO_GRAO = 7;

interface EstadoEsporo extends SoltaEsporo {
  /** O relógio dele: começa NEGATIVO (`-atrasoS`) — até zero ele ainda está na boca do Tubo, sem corpo. */
  t: number;
  ox: number;
  oy: number;
  fase: number;
  periodo: number;
  /** Quanto o cenário já o levou para a esquerda (px). */
  deriva: number;
  /** Quanto já subiu depois de frear (px, para dentro do corredor). */
  subida: number;
  tocado: boolean;
}

/**
 * OS ESPOROS do Tubo (spec F4 §9.3): cada um sai no rumo dele (`esporosDoPulso`: uma nuvem, não um arco), FREIA e passa
 * a andar com o cenário, pairando e subindo devagar — uma ÁREA do corredor, não um tiro. NÃO ferem: encostar deixa a nave lenta (a cena, `GameScene.tocarEsporo`). Vivem num grupo
 * PRÓPRIO, fora dos tiros dos elites (que ferem) e dos inimigos (que as cartas miram e o tiro acerta): o tiro os
 * atravessa, a bomba não os apaga, o míssil não trava neles.
 */
export class Esporos {
  readonly grupo: Phaser.Physics.Arcade.Group;
  private readonly graos: Phaser.GameObjects.Image[] = [];
  private relogio = 0;

  constructor(
    private readonly cena: Phaser.Scene,
    /** A velocidade (px/s, para a esquerda) com que o cenário rola — a da parede. */
    private readonly velCenario: () => number,
  ) {
    this.grupo = cena.physics.add.group({ allowGravity: false });
  }

  soltar(x: number, y: number, solta: SoltaEsporo): void {
    const e = this.grupo.create(x, y, 'eliteEsporo') as Phaser.Physics.Arcade.Sprite;
    e.setDepth(DEPTH);
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setSize(E.corpo, E.corpo, true);
    const s: EstadoEsporo = {
      ...solta,
      t: -solta.atrasoS,
      ox: x,
      oy: y,
      fase: Math.random() * Math.PI * 2,
      periodo: E.balancoS[0] + Math.random() * (E.balancoS[1] - E.balancoS[0]),
      deriva: 0,
      subida: 0,
      tocado: false,
    };
    e.setData('esporo', s);
    if (s.t < 0) {
      e.setVisible(false);
      body.enable = false;
    }
  }

  /** Por quadro: o voo, o balanço e o sumiço de cada esporo; e os grãos grudados enquanto a nave está `lenta`. */
  atualizar(dt: number, nave: Phaser.GameObjects.Sprite, lenta: boolean): void {
    this.relogio += dt;
    for (const obj of [...this.grupo.getChildren()]) {
      const e = obj as Phaser.Physics.Arcade.Sprite;
      const s = e.getData('esporo') as EstadoEsporo;
      s.t += dt;
      if (s.t < 0) {
        // Ainda na boca, esperando a vez dele no sopro: rola com a parede, como o Tubo.
        s.deriva += this.velCenario() * dt;
        continue;
      }
      if (!e.visible) {
        e.setVisible(true);
        (e.body as Phaser.Physics.Arcade.Body).enable = true;
      }
      // O cenário o leva junto à medida que ele freia: parado no ar, ele anda com a parede — e sobe devagar.
      const parado = Math.min(1, s.t / s.freiaS);
      s.deriva += this.velCenario() * dt * parado;
      s.subida += E.sobe * dt * parado;
      const d = esporoAvanco(s.t, s.vel, s.freiaS);
      const b = esporoBalanco(s.t, s.fase, s.periodo);
      const x = s.ox + Math.cos(s.ang) * d - s.deriva + b.dx;
      if (!esporoVivo(s.t) || x < -16) {
        e.destroy();
        continue;
      }
      // "Subir" é para dentro do corredor: o sinal do rumo dele (no chão, para cima; no teto, para baixo).
      const y = s.oy + Math.sin(s.ang) * d + Math.sign(Math.sin(s.ang)) * s.subida + b.dy;
      e.setPosition(Math.round(x), Math.round(y));
      if (!s.tocado) e.setAlpha(esporoAlfa(s.t));
    }
    this.grudar(nave, lenta);
  }

  /** A nave encostou em `e`: conta UMA vez — ele perde o corpo e se desfaz num sopro. Devolve se contou. */
  tocar(e: Phaser.Physics.Arcade.Sprite): boolean {
    const s = e.getData('esporo') as EstadoEsporo | undefined;
    if (!s || s.tocado) return false;
    s.tocado = true;
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
    this.cena.tweens.add({ targets: e, alpha: 0, duration: 150, onComplete: () => e.destroy() });
    return true;
  }

  /**
   * O SINAL DA LENTIDÃO: grãos de esporo grudados na nave, girando devagar em volta dela. ⚠️ Nunca `setTint` na nave:
   * tint sobre arte escura repinta em vez de insinuar.
   */
  private grudar(nave: Phaser.GameObjects.Sprite, lenta: boolean): void {
    if (!this.graos.length) {
      for (let i = 0; i < GRAOS; i++) this.graos.push(this.cena.add.image(0, 0, 'eliteEsporoGrao').setVisible(false));
    }
    this.graos.forEach((g, i) => {
      g.setVisible(lenta);
      if (!lenta) return;
      const a = this.relogio * 1.6 + (i * Math.PI * 2) / GRAOS;
      g.setDepth(nave.depth + 1);
      g.setPosition(Math.round(nave.x + Math.cos(a) * RAIO_GRAO), Math.round(nave.y + Math.sin(a) * RAIO_GRAO * 0.5));
    });
  }
}
