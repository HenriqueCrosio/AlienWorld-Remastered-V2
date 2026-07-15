import type Phaser from 'phaser';
import type { FlightController, InputState } from './FlightController';

/**
 * Condução NEW — voo livre em 8 direções, sem gravidade. O shmup clássico.
 * É aqui que o level design é calibrado.
 */
export class FreeController implements FlightController {
  readonly id = 'free' as const;
  readonly label = 'LIVRE (NEW)';
  readonly scoreMultiplier = 1;
  readonly autoFire = false;

  private static readonly SPEED = 110;
  /** Drag alto = parada seca. Controle direto, sem inércia de nave espacial "realista". */
  private static readonly DRAG = 1200;
  private static readonly ACCEL = 900;

  setup(body: Phaser.Physics.Arcade.Body): void {
    body.setAllowGravity(false);
    body.setGravityY(0);
    body.setDrag(FreeController.DRAG, FreeController.DRAG);
    body.setMaxVelocity(FreeController.SPEED, FreeController.SPEED);
  }

  update(body: Phaser.Physics.Arcade.Body, input: InputState): void {
    const h = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const v = (input.down ? 1 : 0) - (input.up ? 1 : 0);

    // Normaliza a diagonal — senão andar na diagonal é 41% mais rápido.
    const len = Math.hypot(h, v) || 1;
    body.setAcceleration(
      (h / len) * FreeController.ACCEL,
      (v / len) * FreeController.ACCEL,
    );
  }
}
