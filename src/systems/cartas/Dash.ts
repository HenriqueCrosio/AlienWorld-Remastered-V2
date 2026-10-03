import type Phaser from 'phaser';
import { rumoDoDash } from '../../cartasRegras';
import type { InputState } from '../../flight/FlightController';
import type { Contexto } from './contexto';

/** PROVISÓRIOS (calibragem) — a ESPERA é o número que segura "dash invulnerável + Casco" (§4.2). */
const DISTANCIA = 40;
const DURACAO_MS = 150;
const INTOCAVEL_MS = 200;
/**
 * 8s (02/10, ele: *"precisa ter um cooldown que justifique a raridade e o uso"*). Com 2,5s o dash era invulnerabilidade
 * de graça; com 10s+ viraria uma mini-bomba esquecida (a bomba já faz esse papel melhor). Em 8s ele é um SALVAMENTO —
 * guardado para o tiro que não dá para desviar —, e a janela de 0,2s ainda cobra o momento certo.
 */
const ESPERA_MS = 8000;
/** Um fantasma a cada 50ms: 3 no avanço de 150ms (a spec: "3 cópias que somem"). */
const FANTASMA_MS = 50;
const VELOCIDADE = DISTANCIA / (DURACAO_MS / 1000);

/**
 * O DASH (§4.2): a ação DASH (E no padrão, C no clássico — 03/10) — um avanço curto na direção SEGURADA (parado,
 * para a frente), INVULNERÁVEL, com espera. Só existe para quem tem a carta, e só no voo livre (fora da F1). O visual
 * são IMAGENS-FANTASMA da própria sprite (vale para as 6 naves sem arte nova).
 */
export class Dash {
  private ate = 0;
  private intocavelAte = 0;
  private prontoEm = 0;
  private proximoFantasma = 0;
  private rumo: [number, number] = [0, 0];
  private salvo: { max: Phaser.Math.Vector2; drag: Phaser.Math.Vector2 } | null = null;

  constructor(private readonly c: Contexto) {}

  /** Tem a carta, está fora da F1 e a espera passou — a HUD acende "DASH". */
  get pronto(): boolean {
    return this.c.tem('MOV_003') && this.c.h.fase > 1 && this.c.h.scene.time.now >= this.prontoEm;
  }

  /** Quanto falta para o próximo (ms; 0 = pronto) — ou `null` sem a carta ou na F1. A HUD conta a recarga. */
  get falta(): number | null {
    if (!this.c.tem('MOV_003') || this.c.h.fase <= 1) return null;
    return Math.max(0, this.prontoEm - this.c.h.scene.time.now);
  }

  intocavel(agora: number): boolean {
    return agora < this.intocavelAte;
  }

  /** Roda DEPOIS da condução e dos Propulsores: durante o dash, ele manda na velocidade. */
  tick(livre: boolean, body: Phaser.Physics.Arcade.Body, input: InputState): void {
    const agora = this.c.h.scene.time.now;
    if (input.dashPressed && livre && this.pronto) {
      this.comecar(rumoDoDash(input.up, input.down, input.left, input.right), agora, body);
    }

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

  private comecar(rumo: [number, number], agora: number, body: Phaser.Physics.Arcade.Body): void {
    this.rumo = rumo;
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
