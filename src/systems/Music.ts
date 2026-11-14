import Phaser from 'phaser';

export type Track = 'stage1' | 'boss';

/**
 * Trilha sonora, com transição cruzada.
 *
 * A troca para a música do chefão não pode ser um corte seco: o corte denuncia o script.
 * Uma faixa desce enquanto a outra sobe, e o jogador sente a virada sem perceber a costura.
 *
 * Navegadores BLOQUEIAM áudio antes de qualquer interação do usuário. Por isso a música só
 * começa depois da primeira tecla — e é por isso que `play()` é seguro de chamar cedo: se o
 * contexto ainda estiver suspenso, ela espera o destravamento em vez de falhar em silêncio.
 */
export class Music {
  private static current: Phaser.Sound.BaseSound | null = null;
  private static currentKey: Track | null = null;

  static readonly VOLUME = 0.45;

  /**
   * The player's volume (general × music, 0–1): `aplicarPreferencias.ts` plugs it in. `VOLUME` is the mix level of the
   * track at full volume, not the player's choice.
   */
  static fator: () => number = () => 1;
  /** The pause ducks the music while it is open (1 = not ducked). */
  private static abafo = 1;

  private static alvo(): number {
    return Music.VOLUME * Music.fator() * Music.abafo;
  }

  /** The preference changed: the playing track goes to the new level at once, without restarting. */
  static atualizarVolume(): void {
    (Music.current as unknown as { setVolume(v: number): void } | null)?.setVolume(Music.alvo());
  }

  /** Ducks the playing track to `k` of its level (the pause: 0.4) or restores it (1), in `ms`. */
  static abafar(scene: Phaser.Scene, k: number, ms: number): void {
    Music.abafo = k;
    if (!Music.current) return;
    if (ms <= 0) Music.atualizarVolume();
    else scene.tweens.add({ targets: Music.current, volume: Music.alvo(), duration: ms });
  }

  static play(scene: Phaser.Scene, key: Track, fadeMs = 800): void {
    if (Music.currentKey === key && Music.current?.isPlaying) return;
    if (!scene.cache.audio.exists(key)) return;

    const anterior = Music.current;

    const nova = scene.sound.add(key, { loop: true, volume: 0 });
    nova.play();

    // A nova entra subindo...
    scene.tweens.add({
      targets: nova,
      volume: Music.alvo(),
      duration: fadeMs,
    });

    // ...enquanto a anterior sai descendo, e só então é destruída.
    if (anterior) {
      scene.tweens.add({
        targets: anterior,
        volume: 0,
        duration: fadeMs,
        onComplete: () => anterior.destroy(),
      });
    }

    Music.current = nova;
    Music.currentKey = key;
  }

  static stop(scene: Phaser.Scene, fadeMs = 500): void {
    const atual = Music.current;
    if (!atual) return;

    Music.current = null;
    Music.currentKey = null;

    scene.tweens.add({
      targets: atual,
      volume: 0,
      duration: fadeMs,
      onComplete: () => atual.destroy(),
    });
  }
}
