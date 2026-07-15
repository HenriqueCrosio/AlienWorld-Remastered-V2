import Phaser from 'phaser';
import type { InputState } from './flight/FlightController';

/**
 * Lê teclado + ponteiro e devolve um InputState neutro.
 * As conduções recebem intenção ("subir"), nunca teclas — é o que permite plugar
 * touch/gamepad depois sem tocar em FlapController/FreeController.
 */
export class InputReader {
  private readonly keys: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly pointer: Phaser.Input.Pointer;

  constructor(scene: Phaser.Scene) {
    const kb = scene.input.keyboard!;
    this.keys = {
      up: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      down: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      left: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      right: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
      upArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP),
      downArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN),
      leftArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT),
      rightArrow: kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT),
      space: kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE),
      fire: kb.addKey(Phaser.Input.Keyboard.KeyCodes.J),
    };
    this.pointer = scene.input.activePointer;
  }

  read(): InputState {
    const k = this.keys;
    const up = k.up.isDown || k.upArrow.isDown;

    // O flap dispara na BORDA da tecla, não enquanto segurada — senão vira voo contínuo.
    const flapPressed =
      Phaser.Input.Keyboard.JustDown(k.space) ||
      Phaser.Input.Keyboard.JustDown(k.up) ||
      Phaser.Input.Keyboard.JustDown(k.upArrow) ||
      (this.pointer.isDown && this.pointer.getDuration() < 32);

    return {
      up,
      down: k.down.isDown || k.downArrow.isDown,
      left: k.left.isDown || k.leftArrow.isDown,
      right: k.right.isDown || k.rightArrow.isDown,
      flapPressed,
      // No Livre o Espaço não impulsiona, então serve de gatilho.
      firing: k.fire.isDown || k.space.isDown || this.pointer.isDown,
    };
  }
}
