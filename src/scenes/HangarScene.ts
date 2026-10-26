import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { cenaDeFundoHD, removerCenaHD } from '../uiHD';
import { Music } from '../systems/Music';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import { escolherNave, naveEscolhida } from '../ships';
import type { HandlingMode } from './GameScene';
import { LADO, NOME_PINTURA, TEXTO } from '../hangar/numerosHangar';
import { acabou, confirmar, escolhaDoEstado, mudarLado, mudarPintura, novoEstado, type EstadoHangar } from '../hangar/escolha';
import { CenarioHangar, carregarCamadasHangar } from '../hangar/cenarioHangar';
import { CHAVE_HANGAR_HD, HangarCenaHD } from '../hangar/HangarCenaHD';

/**
 * O HANGAR — a cena antes da F1, onde o jogador escolhe a nave (25/10, à noite; ele: *"uma cena de pré abertura, que
 * será o início e a escolha inicial das naves ... com uma seta que o jogador muda para a esquerda ou direita e escolhe
 * a nave ... o nível de vida existente na cena do menu, mas ... bastante fog no cenário atrás"*).
 *
 * A pintura dele ("Hangar Futurista com Caças Estacionados"): o jato à esquerda, a "a" à direita. ←→ leva a seta de
 * uma nave à outra; ↑↓ troca a pintura da escolhida (a nave estacionada é repintada na hora); ENTER confirma — o motor
 * acende, o véu fecha e a F1 começa com a escolha no registry (`escolherNave`). ESC volta ao menu.
 *
 * Como o menu: o cenário mora numa cena da camada HD (`HangarCenaHD`), atrás do texto; sem a camada, aqui mesmo, em
 * 384×216. Esta cena fica com o relógio, as teclas e o texto (na voz do piloto: ele está decidindo).
 */
export class HangarScene extends Phaser.Scene {
  /** Público: a sonda lê e escreve (`t`, a seta, a pintura). */
  estado!: EstadoHangar;
  /** Sem a camada HD, o cenário mora aqui. Público: a sonda lê. */
  cenario: CenarioHangar | null = null;
  private atm: Atmosfera | null = null;
  private handling: HandlingMode = 'diegetico';
  private nome: Phaser.GameObjects.Text | null = null;
  private pintura: Phaser.GameObjects.Text | null = null;
  /** A sonda para o relógio (para fotografar um instante). */
  congelado = false;
  private saiu = false;

  constructor() {
    super('Hangar');
  }

  init(data: { handling?: HandlingMode } = {}): void {
    this.handling = data.handling ?? 'diegetico';
  }

  create(): void {
    this.estado = novoEstado(naveEscolhida(this.registry));
    this.cenario = null;
    this.atm = null;
    this.saiu = false;
    this.congelado = false;
    this.cameras.main.setBackgroundColor('#000000');
    this.montarCenario();
    this.montarTexto();
    Music.play(this, 'stage1');
    this.teclas();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => removerCenaHD(CHAVE_HANGAR_HD));
  }

  private montarCenario(): void {
    if (cenaDeFundoHD(CHAVE_HANGAR_HD, HangarCenaHD, { estado: this.estado })) return;
    // Sem a camada HD: o cenário na resolução do jogo, aqui mesmo.
    carregarCamadasHangar(this.load, 'hangarK1', 'sprites/hangar/k1');
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (this.sys.settings.status >= Phaser.Scenes.SHUTDOWN) return;
      this.cenario = CenarioHangar.criar(this, 1, 'hangarK1', this.estado, 18);
      if (this.cenario) {
        // O texto fica em 20: fora do tratamento.
        this.atm = new Atmosfera(this, { limiteLimpo: 19, profundidadePoeira: 2.3 });
        this.atm.perfil(PERFIS.escolha);
      }
      this.estado.pronto = true;
    });
    this.load.start();
  }

  private montarTexto(): void {
    const T = TEXTO;
    this.t(GAME_WIDTH / 2, T.titulo.y, T.titulo.texto, T.titulo.tamanho, T.cor);
    this.nome = this.t(GAME_WIDTH / 2, T.nome.y, '', T.nome.tamanho, T.corDestaque);
    this.pintura = this.t(GAME_WIDTH / 2, T.pintura.y, '', T.pintura.tamanho, T.cor);
    this.t(GAME_WIDTH / 2, T.dica.y, T.dica.texto, T.dica.tamanho, T.corDica);
    this.escreverEscolha();
  }

  /** O nome e a pintura da escolhida: lidos do estado a cada quadro (a sonda também o muda), escritos só se mudam. */
  private escreverEscolha(): void {
    const e = escolhaDoEstado(this.estado);
    const L = LADO[this.estado.lado];
    const n = L.pinturas.length;
    const pintura = `PINTURA  ${NOME_PINTURA[e.pintura]}   ${this.estado.pinturas[this.estado.lado] + 1}/${n}`;
    if (this.nome && this.nome.text !== L.nome) this.nome.setText(L.nome);
    if (this.pintura && this.pintura.text !== pintura) this.pintura.setText(pintura);
  }

  private teclas(): void {
    const kb = this.input.keyboard!;
    // UM EVENTO, UMA VEZ (a lição da mesa, 03/10): o Phaser reprocessa a fila de teclas a cada evento novo.
    const vistos = new WeakSet<KeyboardEvent>();
    const umaVez = (f: () => void) => (ev: KeyboardEvent): void => {
      if (vistos.has(ev)) return;
      vistos.add(ev);
      f();
    };
    const e = this.estado;
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, umaVez(() => mudarLado(e, -1)));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, umaVez(() => mudarLado(e, 1)));
    for (const k of ['UP', 'W']) kb.on(`keydown-${k}`, umaVez(() => mudarPintura(e, -1)));
    for (const k of ['DOWN', 'S']) kb.on(`keydown-${k}`, umaVez(() => mudarPintura(e, 1)));
    for (const k of ['ENTER', 'SPACE']) {
      kb.on(`keydown-${k}`, umaVez(() => {
        if (confirmar(e)) escolherNave(this.registry, escolhaDoEstado(e));
      }));
    }
    kb.on('keydown-ESC', umaVez(() => {
      if (e.tConfirmou === null) this.scene.start('Menu', { direto: true });
    }));
  }

  override update(_time: number, delta: number): void {
    const dt = Math.min(0.1, delta / 1000);
    if (!this.congelado) this.estado.t += dt;
    this.atm?.update(dt);
    this.cenario?.atualizar();
    this.escreverEscolha();
    if (!this.saiu && acabou(this.estado)) {
      this.saiu = true;
      this.scene.start('Game', { handling: this.handling });
    }
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }
}
