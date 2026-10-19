import Phaser from 'phaser';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import { EVENTO_ESCALA, escalaHD, prepararCameraHD } from '../uiHD';
import { Cenario, type EstadoMenu } from './cenario';

export const CHAVE_MENU_HD = 'MenuHD';

/**
 * O CENÁRIO DO MENU NA CAMADA HD (spec §8.1): a pintura na resolução dela, viva, sob a Atmosfera `menu` — atrás da
 * irmã do texto (`cenaDeFundoHD`). A câmera fica no zoom `s` da camada, então tudo se escreve em px de jogo; a pintura
 * (k = 4) entra com escala ¼ e filtro LINEAR. As camadas vêm do `BootHDScene`; se ainda estão chegando, ela espera.
 * O `MenuScene` a abre e a tira, e escreve o `estado` (o relógio da abertura) que ela lê.
 */
export class MenuCenaHD extends Phaser.Scene {
  /** Públicos: a sonda e o filme leem (e o filme zera `t`). */
  cenario: Cenario | null = null;
  atm: Atmosfera | null = null;
  t = 0;
  private estado!: EstadoMenu;
  private readonly aoEscala = (s: number): void => this.atm?.setEscala(s);

  constructor() {
    super(CHAVE_MENU_HD);
  }

  init(data: { estado: EstadoMenu }): void {
    this.estado = data.estado;
    this.cenario = null;
    this.atm = null;
    this.t = 0;
  }

  create(): void {
    prepararCameraHD(this);
    this.cameras.main.setBackgroundColor('#000000');
    this.game.events.on(EVENTO_ESCALA, this.aoEscala);
    this.events.once(Phaser.Scenes.Events.DESTROY, () => {
      this.game.events.off(EVENTO_ESCALA, this.aoEscala);
      this.atm?.liberar();
    });
    const boot = this.scene.get('BootHD');
    if (boot && boot.load.isLoading()) boot.load.once(Phaser.Loader.Events.COMPLETE, () => this.montar());
    else this.montar();
  }

  private montar(): void {
    // Dentro do `create` o estado é CREATING (`isActive()` ainda é falso): só desiste se a cena já saiu.
    if (this.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
    this.cenario = Cenario.criar(this, 4, 'menuK4', this.estado, 50);
    if (this.cenario) {
      // Nada aqui é "limpo": o texto mora em outra cena (a irmã). O véu (50) também passa pelo tratamento.
      this.atm = new Atmosfera(this, { limiteLimpo: 1000, profundidadePoeira: 1.5, escala: escalaHD() });
      this.atm.perfil(PERFIS.menu);
    }
    this.estado.pronto = true;
  }

  override update(_time: number, delta: number): void {
    if (!this.cenario) return;
    const dt = delta / 1000;
    this.t += dt;
    this.atm?.update(dt);
    this.cenario.atualizar(this.t);
  }
}
