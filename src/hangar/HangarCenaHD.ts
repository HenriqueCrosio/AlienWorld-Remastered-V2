import Phaser from 'phaser';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import { EVENTO_ESCALA, escalaHD, prepararCameraHD } from '../uiHD';
import { CenarioHangar } from './cenarioHangar';
import type { EstadoHangar } from './escolha';

export const CHAVE_HANGAR_HD = 'HangarHD';

/**
 * O CENÁRIO DO HANGAR NA CAMADA HD (como o do menu, `MenuCenaHD`): a pintura na resolução dela, viva, sob a Atmosfera
 * `escolha` — atrás da irmã do texto (`cenaDeFundoHD`). A câmera fica no zoom `s` da camada, então tudo se escreve em
 * px de jogo; as camadas (k = 4) vêm do `BootHDScene`. O `HangarScene` a abre, a tira e escreve o `estado`.
 */
export class HangarCenaHD extends Phaser.Scene {
  /** Públicos: a sonda lê. */
  cenario: CenarioHangar | null = null;
  atm: Atmosfera | null = null;
  private estado!: EstadoHangar;
  private ultimo = 0;
  private readonly aoEscala = (s: number): void => this.atm?.setEscala(s);

  constructor() {
    super(CHAVE_HANGAR_HD);
  }

  init(data: { estado: EstadoHangar }): void {
    this.estado = data.estado;
    this.cenario = null;
    this.atm = null;
    this.ultimo = 0;
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
    if (this.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
    this.cenario = CenarioHangar.criar(this, 4, 'hangarK4', this.estado, 50);
    if (this.cenario) {
      // Nada aqui é "limpo": o texto mora na irmã. O véu (50) também passa pelo tratamento.
      this.atm = new Atmosfera(this, { limiteLimpo: 1000, profundidadePoeira: 2.3, escala: escalaHD() });
      this.atm.perfil(PERFIS.escolha);
    }
    this.estado.pronto = true;
  }

  override update(): void {
    if (!this.cenario) return;
    // O relógio é o do estado (o `HangarScene` anda com ele); a Atmosfera anda com a diferença.
    const dt = Math.max(0, Math.min(0.1, this.estado.t - this.ultimo));
    this.ultimo = this.estado.t;
    this.atm?.update(dt);
    this.cenario.atualizar();
  }
}
