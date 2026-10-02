import type Phaser from 'phaser';
import { DuploToque, type Direcao } from '../../cartasRegras';
import type { Contexto } from './contexto';

/** PROVISÓRIOS (calibragem) — a ESPERA é o número que segura "dash invulnerável + Casco" (§4.2). */
const JANELA_MS = 220;
const DISTANCIA = 40;
const DURACAO_MS = 150;
const INTOCAVEL_MS = 200;
const ESPERA_MS = 2500;
/** Um fantasma a cada 50ms: 3 no avanço de 150ms (a spec: "3 cópias que somem"). */
const FANTASMA_MS = 50;
const VELOCIDADE = DISTANCIA / (DURACAO_MS / 1000);

/** ⚠️ As teclas são as de MOVIMENTO de hoje; o mapa inteiro de teclas (e o controle, etapa 1.6) ainda vai ser feito. */
const TECLAS: Record<string, Direcao> = {
  KeyW: 'cima',
  ArrowUp: 'cima',
  KeyS: 'baixo',
  ArrowDown: 'baixo',
  KeyA: 'esquerda',
  ArrowLeft: 'esquerda',
  KeyD: 'direita',
  ArrowRight: 'direita',
};
const RUMO: Record<Direcao, [number, number]> = { cima: [0, -1], baixo: [0, 1], esquerda: [-1, 0], direita: [1, 0] };

/**
 * O DASH (§4.2): DOIS TOQUES na mesma direção (W/A/S/D ou setas) — um avanço curto para lá, INVULNERÁVEL, com espera.
 * Só existe para quem tem a carta, e só no voo livre (fora da F1). O visual são IMAGENS-FANTASMA da própria sprite
 * (vale para as 6 naves sem arte nova).
 *
 * ⚠️ O DUPLO TOQUE LÊ O EVENTO DA TECLA, NÃO O `isDown` DO QUADRO. Um toque rápido desce e sobe dentro do mesmo
 * quadro e o `isDown` nunca o veria; e o `JustDown` é consumido pelo `InputReader` (o flap usa o da tecla de cima).
 * A repetição do sistema (tecla segurada) é descartada: o 2º toque exige soltar e apertar de novo.
 */
export class Dash {
  private readonly toque = new DuploToque(JANELA_MS);
  private pedido: { dir: Direcao; t: number } | null = null;
  private ate = 0;
  private intocavelAte = 0;
  private prontoEm = 0;
  private proximoFantasma = 0;
  private rumo: [number, number] = [0, 0];
  private salvo: { max: Phaser.Math.Vector2; drag: Phaser.Math.Vector2 } | null = null;

  constructor(private readonly c: Contexto) {
    const kb = c.h.scene.input.keyboard;
    if (!kb) return;
    const aoApertar = (ev: KeyboardEvent): void => {
      if (ev.repeat) return;
      const dir = TECLAS[ev.code];
      if (!dir) return;
      const agora = c.h.scene.time.now;
      if (this.toque.apertou(dir, agora)) this.pedido = { dir, t: agora };
    };
    kb.on('keydown', aoApertar);
    c.h.scene.events.once('shutdown', () => kb.off('keydown', aoApertar));
  }

  /** Tem a carta, está fora da F1 e a espera passou — a HUD acende "DASH". */
  get pronto(): boolean {
    return this.c.tem('MOV_003') && this.c.h.fase > 1 && this.c.h.scene.time.now >= this.prontoEm;
  }

  intocavel(agora: number): boolean {
    return agora < this.intocavelAte;
  }

  /** Roda DEPOIS da condução e dos Propulsores: durante o dash, ele manda na velocidade. */
  tick(livre: boolean, body: Phaser.Physics.Arcade.Body): void {
    const agora = this.c.h.scene.time.now;
    const p = this.pedido;
    this.pedido = null;
    // Pedido velho (feito com a fase pausada na mesa) não dispara na volta.
    if (p && livre && agora - p.t < 100 && this.pronto) this.comecar(p.dir, agora, body);

    if (agora < this.ate) {
      body.setVelocity(this.rumo[0] * VELOCIDADE, this.rumo[1] * VELOCIDADE);
      if (agora >= this.proximoFantasma) {
        this.fantasma();
        this.proximoFantasma = agora + FANTASMA_MS;
      }
    } else if (this.salvo) {
      // Acabou: devolve o teto e o arrasto da condução (o drag alto é a "parada seca" do voo livre).
      body.setMaxVelocity(this.salvo.max.x, this.salvo.max.y);
      body.setDrag(this.salvo.drag.x, this.salvo.drag.y);
      this.salvo = null;
    }
  }

  private comecar(dir: Direcao, agora: number, body: Phaser.Physics.Arcade.Body): void {
    this.rumo = RUMO[dir];
    this.ate = agora + DURACAO_MS;
    this.intocavelAte = agora + INTOCAVEL_MS;
    this.prontoEm = agora + ESPERA_MS;
    this.proximoFantasma = agora;
    if (!this.salvo) this.salvo = { max: body.maxVelocity.clone(), drag: body.drag.clone() };
    body.setMaxVelocity(VELOCIDADE * 2, VELOCIDADE * 2);
    body.setDrag(0, 0);
  }

  /** Uma cópia da sprite NO QUADRO ATUAL, que some em 200ms. */
  private fantasma(): void {
    const n = this.c.h.nave();
    const s = this.c.h.scene;
    const f = s.add
      .image(n.x, n.y, n.texture.key, n.frame.name)
      .setAngle(n.angle)
      .setFlip(n.flipX, n.flipY)
      .setScale(n.scaleX, n.scaleY)
      .setDepth(n.depth - 1)
      .setAlpha(0.5);
    s.tweens.add({ targets: f, alpha: 0, duration: 200, onComplete: () => f.destroy() });
  }
}
