import type Phaser from 'phaser';
import type { Contexto, Inimigo } from './contexto';

/** PROVISÓRIOS (calibragem). Posição de descanso: atrás e acima da nave. */
const DRONE = {
  dx: -14,
  dy: -12,
  /** Quanto puxa de volta para o descanso (por segundo): o "atraso curto" da spec. */
  mola: 6,
  raioDesvio: 24,
  forcaDesvio: 400,
  /** Abaixo disto (px/s) o inimigo conta como PARADO: sem rumo para desviar de lado, ele empurra para longe. */
  rumoMinimo: 10,
  /** Passou disto da nave, o desvio desliga e a mola traz de volta. */
  longe: 60,
  esperaS: 1.2,
  alcance: 160,
  velocidade: 170,
  dano: 1,
  homing: { turn: 180, range: 160 },
};
const COR_TIRO = { humana: 0xffa040, alien: 0x5ef2d8 };

/**
 * O DRONE AUXILIAR (spec §4.3 e §5.1c): discreto, segue a nave com atraso curto e dá um tiro PRÓPRIO — fraco,
 * guiado ao inimigo mais próximo, cadência baixa. NÃO copia Duplo, Triplo nem Cadência da nave: é conforto (limpa
 * quem você não está mirando), não um segundo canhão.
 *
 * O DESVIO (pedido dele): todo inimigo e todo tiro inimigo a menos de ~24px empurra o drone para longe; passou de
 * ~60px da nave, o empurrão desliga e ele volta. Sem vida — ele não morre; o desvio é charme.
 */
export class DroneAuxiliar {
  sprite: Phaser.GameObjects.Image | null = null;
  private espera = DRONE.esperaS;

  constructor(private readonly c: Contexto) {}

  tick(dt: number): void {
    if (!this.c.tem('WPN_010')) return;
    const n = this.c.h.nave();
    if (!this.sprite) {
      this.sprite = this.c.h.scene.add.image(n.x + DRONE.dx, n.y + DRONE.dy, 'carta-drone').setDepth(n.depth);
    }
    const d = this.sprite;
    let vx = (n.x + DRONE.dx - d.x) * DRONE.mola;
    let vy = (n.y + DRONE.dy - d.y) * DRONE.mola;
    if (Math.hypot(d.x - n.x, d.y - n.y) <= DRONE.longe) {
      for (const o of [...this.c.h.inimigos(), ...this.c.h.tirosInimigos()]) {
        if (!o.active) continue;
        const dist = Math.hypot(d.x - o.x, d.y - o.y);
        if (dist === 0 || dist >= DRONE.raioDesvio) continue;
        const f = ((DRONE.raioDesvio - dist) / DRONE.raioDesvio) * DRONE.forcaDesvio;
        const [ex, ey] = this.saida(d, o, dist);
        vx += ex * f;
        vy += ey * f;
      }
    }
    d.setPosition(d.x + vx * dt, d.y + vy * dt);

    this.espera -= dt;
    if (this.espera > 0) return;
    const alvo = this.maisProximo(d.x, d.y);
    if (!alvo) return;
    this.espera = DRONE.esperaS;
    this.c.h.weapons.disparar({
      x: d.x,
      y: d.y,
      angulo: (Math.atan2(alvo.y - d.y, alvo.x - d.x) * 180) / Math.PI,
      textura: 'carta-tiro-drone',
      velocidade: DRONE.velocidade,
      dano: DRONE.dano,
      alcance: DRONE.alcance * 1.5,
      origem: 'drone',
      homing: DRONE.homing,
      tint: COR_TIRO[this.c.h.linhagem],
    });
  }

  /**
   * Para ONDE o drone sai da frente de `o` (vetor unitário). ⚠️ NÃO É "PARA LONGE" (02/10, ele): os inimigos andam em
   * linha reta, e fugir para longe de quem vem da direita EMPURRA O DRONE PARA TRÁS, até ele se afastar demais da nave.
   * Quem ANDA é desviado de LADO — perpendicular ao rumo dele, para o lado da trajetória em que o drone já está: um
   * passo para o lado, o inimigo passa, a mola traz de volta. Só quem está PARADO (sem rumo) empurra para longe.
   */
  private saida(d: Phaser.GameObjects.Image, o: Phaser.Physics.Arcade.Sprite, dist: number): [number, number] {
    const v = (o.body as Phaser.Physics.Arcade.Body | null)?.velocity;
    const vel = v ? Math.hypot(v.x, v.y) : 0;
    if (!v || vel < DRONE.rumoMinimo) return [(d.x - o.x) / dist, (d.y - o.y) / dist];
    // A perpendicular ao rumo, virada para o lado em que o drone está (no empate exato, para cima).
    let px = -v.y / vel;
    let py = v.x / vel;
    if ((d.x - o.x) * px + (d.y - o.y) * py < 0 || ((d.x - o.x) * px + (d.y - o.y) * py === 0 && py > 0)) {
      px = -px;
      py = -py;
    }
    return [px, py];
  }

  private maisProximo(x: number, y: number): Inimigo | null {
    let melhor: Inimigo | null = null;
    let menor = DRONE.alcance;
    for (const e of this.c.h.inimigos()) {
      if (!e.active) continue;
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < menor) {
        menor = d;
        melhor = e;
      }
    }
    return melhor;
  }
}
