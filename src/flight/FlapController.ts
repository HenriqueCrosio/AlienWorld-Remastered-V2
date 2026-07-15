import type Phaser from 'phaser';
import type { FlightController, InputState } from './FlightController';

/**
 * Condução LEGACY — a física do Alien World v2.
 *
 * Gravidade constante puxa a nave para baixo; o input aplica um impulso vertical.
 * No v2 isso era `Rigidbody2D.AddForce` no FixedUpdate; aqui é o Arcade Physics,
 * que também roda em passo fixo. A nave nunca para no ar.
 */
export class FlapController implements FlightController {
  readonly id = 'flap' as const;
  readonly label = 'FLAP (LEGACY)';
  readonly scoreMultiplier = 1.25;
  readonly autoFire = true;

  private static readonly GRAVITY = 420;
  private static readonly IMPULSE = 170;
  private static readonly MAX_FALL = 260;
  /** No flap a mão está ocupada com a altitude: o movimento horizontal é reduzido. */
  private static readonly H_SPEED = 55;

  setup(body: Phaser.Physics.Arcade.Body): void {
    body.setAllowGravity(true);
    body.setGravityY(FlapController.GRAVITY);
    // Drag zero nos DOIS eixos: a queda é regida pela gravidade, não amortecida.
    body.setDrag(0, 0);
    body.setMaxVelocity(FlapController.H_SPEED, FlapController.MAX_FALL);
  }

  update(body: Phaser.Physics.Arcade.Body, input: InputState): void {
    if (input.flapPressed) {
      body.setVelocityY(-FlapController.IMPULSE);
    }

    const h = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    body.setVelocityX(h * FlapController.H_SPEED);
  }
}
