import Phaser from 'phaser';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import { EVENTO_ESCALA, escalaHD, prepararCameraHD } from '../uiHD';
import { Cenario, type CenarioDoMenu, type EstadoMenu } from './cenario';
import { CenarioAmanhecer, carregarAmanhecer } from './amanhecer/cenarioAmanhecer';
import type { QualMenu } from './qualMenu';

export const CHAVE_MENU_HD = 'MenuHD';

/**
 * O CENÁRIO DO MENU NA CAMADA HD (spec §8.1): a pintura na resolução dela, viva, sob a Atmosfera `menu` — atrás da
 * irmã do texto (`cenaDeFundoHD`). A câmera fica no zoom `s` da camada, então tudo se escreve em px de jogo; a pintura
 * (k = 4) entra com escala ¼ e filtro LINEAR. As camadas vêm do `BootHDScene`; se ainda estão chegando, ela espera.
 * O `MenuScene` a abre e a tira, e escreve o `estado` (o relógio da abertura) que ela lê.
 */
export class MenuCenaHD extends Phaser.Scene {
  /** Públicos: a sonda e o filme leem (e o filme zera `t`). */
  cenario: CenarioDoMenu | null = null;
  atm: Atmosfera | null = null;
  t = 0;
  private estado!: EstadoMenu;
  /** A noite, ou o amanhecer de quem zerou (e do resultado da campanha). */
  private qual: QualMenu = 'noite';
  private readonly aoEscala = (s: number): void => this.atm?.setEscala(s);

  constructor() {
    super(CHAVE_MENU_HD);
  }

  init(data: { estado: EstadoMenu; qual?: QualMenu }): void {
    this.estado = data.estado;
    this.qual = data.qual ?? 'noite';
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
    if (this.qual === 'amanhecer') {
      // A pintura do amanhecer vem sob demanda (só quem zerou a vê): a 1ª vez carrega aqui, as outras já a têm.
      carregarAmanhecer(this.load, 'menuAmK4', 'sprites/menu-amanhecer/k4');
      if (this.load.list.size > 0) {
        this.load.once(Phaser.Loader.Events.COMPLETE, () => this.montar());
        this.load.start();
      } else this.montar();
      return;
    }
    const boot = this.scene.get('BootHD');
    if (boot && boot.load.isLoading()) boot.load.once(Phaser.Loader.Events.COMPLETE, () => this.montar());
    else this.montar();
  }

  private montar(): void {
    // Dentro do `create` o estado é CREATING (`isActive()` ainda é falso): só desiste se a cena já saiu.
    if (this.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
    const amanhecer = this.qual === 'amanhecer';
    this.cenario = amanhecer
      ? CenarioAmanhecer.criar(this, 4, 'menuAmK4', this.estado, 50)
      : Cenario.criar(this, 4, 'menuK4', this.estado, 50);
    if (this.cenario) {
      // Nada aqui é "limpo": o texto mora em outra cena (a irmã). O véu (50) também passa pelo tratamento.
      this.atm = new Atmosfera(this, { limiteLimpo: 1000, profundidadePoeira: 1.5, escala: escalaHD() });
      this.atm.perfil(amanhecer ? PERFIS.menuAmanhecer : PERFIS.menu);
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
