import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { ehHD, jogoHD, mouseHD, prepararCameraHD } from '../uiHD';
import { CARTAS, COR_RARIDADE, NOME_RARIDADE, type CartaDef } from '../cartas';

/**
 * A MESA DE CARTAS — o COMPACTO (decisão de 29/09: *"traz mais foco no conteúdo, deixa mais o background do jogo à
 * vista"*). O cartucho (112×160, *"muito grande e estourado"*) e a lista saíram. A arte é PROVISÓRIA até a spec 2
 * (a arte nova do compacto, no pixel fino da camada HD).
 *
 * Uma cena SOBREPOSTA (`scene.launch`), não objetos dentro da cena de baixo, por dois motivos:
 * - a fase PAUSA inteira por baixo (`scene.pause` congela física, tweens, timers e o relógio do roteiro) — escolher
 *   carta com tiro vindo na cara não é escolha, é punição;
 * - a mesa não passa pela Atmosfera da fase: a carta fica LIMPA, como a HUD.
 *
 * Ela MORA NA CAMADA HD (`uiHD.ts`) e fala com a voz do PILOTO. A cena 'Cartas' do mundo continua sendo a que a fase
 * lança: ela fica viva e vazia (a fase segue vendo 'Cartas' ativa) e repassa a mesa para a 'Cartas' da camada, que
 * desenha e responde — teclado e mouse. Sem a camada, a mesa roda no próprio mundo.
 */
export interface CartasData {
  opcoes: string[];
  titulo: string;
  onEscolha: (id: string) => void;
  /** ESC: sair do jogo. Só a cutscene passa (a fase tem o ESC dela, e ela está pausada por baixo). */
  onSair?: () => void;
}

/** A CARTA COMPACTA (72×96). */
const COMP = { w: 72, h: 96, passo: 84, cy: 108 };

const FUNDO_CARTA = 0x0d1118;
const ACO = 0x3a4252;

export class CartasScene extends Phaser.Scene {
  private opcoes: CartaDef[] = [];
  private onEscolha: (id: string) => void = () => {};
  private cursor = 1;
  private cartas: Phaser.GameObjects.Container[] = [];
  private realces: Phaser.GameObjects.GameObject[] = [];
  private fechando = false;

  constructor() {
    super('Cartas');
  }

  create(data: CartasData): void {
    const hd = jogoHD();
    if (hd && !ehHD(this)) {
      this.repassar(hd, data);
      return;
    }
    if (ehHD(this)) {
      prepararCameraHD(this);
      mouseHD(true);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => mouseHD(false));
    }

    this.opcoes = data.opcoes.map((id) => CARTAS[id]).filter(Boolean);
    this.onEscolha = data.onEscolha;
    this.cursor = Math.min(1, this.opcoes.length - 1);
    this.cartas = [];
    this.realces = [];
    this.fechando = false;

    // O jogo aparece por trás, escurecido (as referências mostram a ação por baixo da escolha).
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, 0.6).setOrigin(0);
    // A faixa do título apaga a HUD da fase por baixo: os dois textos moram na mesma altura.
    this.add.rectangle(0, 0, GAME_WIDTH, 22, COLORS.bgDeep, 0.9).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 12, data.titulo, { size: 9, color: COLORS.playerBright });

    const x0 = GAME_WIDTH / 2 - ((this.opcoes.length - 1) * COMP.passo) / 2;
    this.opcoes.forEach((c, i) => this.montarCompacta(c, x0 + i * COMP.passo, i));

    pixelText(this, GAME_WIDTH / 2, 209, '[<-  ->] escolher   [ENTER] confirmar', { size: 7, color: COLORS.metalMid });

    const kb = this.input.keyboard!;
    const mover = (d: number) => {
      this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.opcoes.length);
      this.marcar();
    };
    kb.on('keydown-LEFT', () => mover(-1));
    kb.on('keydown-A', () => mover(-1));
    kb.on('keydown-RIGHT', () => mover(1));
    kb.on('keydown-D', () => mover(1));
    kb.on('keydown-ONE', () => this.confirmar(0));
    kb.on('keydown-TWO', () => this.confirmar(1));
    kb.on('keydown-THREE', () => this.confirmar(2));
    kb.on('keydown-ENTER', () => this.confirmar(this.cursor));
    kb.on('keydown-SPACE', () => this.confirmar(this.cursor));
    kb.on('keydown-J', () => this.confirmar(this.cursor));
    const sair = data.onSair;
    if (sair) {
      kb.on('keydown-ESC', () => {
        if (this.fechando) return;
        this.fechando = true;
        this.scene.stop();
        sair();
      });
    }

    this.marcar();

    // Entrada: as cartas sobem para a mesa, uma depois da outra.
    this.cartas.forEach((c, i) => {
      const y = c.y;
      c.y += 16;
      c.alpha = 0;
      this.tweens.add({ targets: c, y, alpha: 1, duration: 200, delay: 50 * i, ease: 'Quad.easeOut' });
    });
  }

  /**
   * No MUNDO, com a camada viva: a mesa vai para a 'Cartas' de lá. Esta fica vazia até a de lá decidir, e fecha
   * junto — e se a fase fechar esta primeiro (ESC, dev), fecha a de lá.
   */
  private repassar(hd: Phaser.Game, data: CartasData): void {
    let fechada = false;
    const fechar = () => {
      fechada = true;
      this.scene.stop();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (!fechada) hd.scene.stop('Cartas');
    });
    // ⚠️ NA FILA, não `hd.scene.start`: a mesa de lá fecha com `this.scene.stop()`, que o Phaser ENFILEIRA, e o
    // `start` do gerenciador roda NA HORA. Os dois jogos têm cada um o seu laço — no reset da alien (mesas
    // encadeadas), a mesa nova abria antes do `stop` pendente da anterior, e o `stop` a matava. Na fila, o `start`
    // espera atrás do `stop`.
    // (`queueOp` é público no Phaser, só não está no `phaser.d.ts`; a fila chama `start(keyA, keyB)`.)
    const fila = hd.scene as unknown as { queueOp(op: 'start', chave: string, dados: CartasData): void };
    fila.queueOp('start', 'Cartas', {
      ...data,
      onEscolha: (id: string) => {
        fechar();
        data.onEscolha(id);
      },
      onSair:
        data.onSair &&
        (() => {
          fechar();
          data.onSair!();
        }),
    });
  }

  // ─── A CARTA COMPACTA (referência: Deep Rock Galactic: Survivor) ───────────────────────────────

  private montarCompacta(c: CartaDef, x: number, i: number): void {
    const cor = COR_RARIDADE[c.raridade];
    const { w, h } = COMP;
    const k = this.add.container(x, COMP.cy);
    k.add(this.add.rectangle(0, 0, w, h, FUNDO_CARTA, 0.96).setStrokeStyle(1, ACO));
    // O NOME numa faixa na cor da raridade: é a primeira coisa que o olho lê.
    k.add(this.add.rectangle(0, -h / 2 + 7, w, 14, cor, 0.85));
    k.add(pixelText(this, 0, -h / 2 + 7, c.nome, { size: 7, color: COLORS.metalLight, stroke: 3 }));
    // O ÍCONE no tamanho nativo (32px): escala inteira, nítido.
    this.icone(k, c, 0, -12, 1, cor);
    // A RARIDADE numa etiqueta cheia — não um filete.
    k.add(this.add.rectangle(0, 14, 50, 10, cor, 0.85));
    k.add(pixelText(this, 0, 14, NOME_RARIDADE[c.raridade], { size: 7, color: COLORS.metalLight, stroke: 3 }));
    // O EFEITO em UMA linha.
    k.add(pixelText(this, 0, 30, c.curto, { size: 7, color: COLORS.metalLight, stroke: 2 }));
    // O REQUISITO mora acima da carta: dentro, ele não cabia na largura.
    if (c.requer) k.add(pixelText(this, 0, -h / 2 - 7, `requer ${CARTAS[c.requer].nome.toLowerCase()}`, { size: 7, color: COLORS.metalMid, stroke: 2 }));
    this.realces.push(this.cantos(x, COMP.cy, w + 6, h + 6));
    this.zona(x, COMP.cy, w, h, i);
    this.cartas.push(k);
  }

  // ─── comum ─────────────────────────────────────────────────────────────────────────────────────

  private icone(k: Phaser.GameObjects.Container, c: CartaDef, x: number, y: number, escala: number, cor: number): void {
    const icone = `icone-${c.id}`;
    if (this.textures.exists(icone)) k.add(this.add.image(x, y, icone).setScale(escala));
    else k.add(pixelText(this, x, y, SIGLA[c.categoria], { size: 9, color: cor }));
  }

  /** Os CANTOS de realce (colchetes) em volta da carta em foco — o realce do Deep Rock. */
  private cantos(x: number, y: number, w: number, h: number): Phaser.GameObjects.Graphics {
    const g = this.add.graphics().lineStyle(2, COLORS.hotBright, 1);
    const l = 8, x0 = x - w / 2, y0 = y - h / 2, x1 = x + w / 2, y1 = y + h / 2;
    g.lineBetween(x0, y0, x0 + l, y0).lineBetween(x0, y0, x0, y0 + l);
    g.lineBetween(x1, y0, x1 - l, y0).lineBetween(x1, y0, x1, y0 + l);
    g.lineBetween(x0, y1, x0 + l, y1).lineBetween(x0, y1, x0, y1 - l);
    g.lineBetween(x1, y1, x1 - l, y1).lineBetween(x1, y1, x1, y1 - l);
    return g.setVisible(false);
  }

  private zona(x: number, y: number, w: number, h: number, i: number): void {
    const z = this.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => {
      this.cursor = i;
      this.marcar();
    });
    z.on('pointerdown', () => this.confirmar(i));
  }

  private marcar(): void {
    this.realces.forEach((r, i) => (r as Phaser.GameObjects.Graphics).setVisible(i === this.cursor));
  }

  private confirmar(i: number): void {
    if (this.fechando || i < 0 || i >= this.opcoes.length) return;
    this.fechando = true;
    const escolhida = this.opcoes[i];

    this.cartas.forEach((c, j) => {
      if (j === i) this.tweens.add({ targets: c, scale: c.scale * 1.1, duration: 140, yoyo: true });
      else this.tweens.add({ targets: c, alpha: 0, y: c.y + 12, duration: 180 });
    });
    this.realces.forEach((r) => (r as Phaser.GameObjects.Graphics).setVisible(false));

    // ⚠️ FECHA ANTES DE AVISAR: o reset da alien encadeia mesas, e a próxima relança ESTA cena. Avisar primeiro
    // faria o `launch` bater numa cena ainda viva — e o `stop` logo depois mataria a mesa nova.
    const cb = this.onEscolha;
    this.time.delayedCall(420, () => {
      this.scene.stop();
      cb(escolhida.id);
    });
  }
}

// ASCII puro: a fonte pode não ter os símbolos Unicode (o ShipPanel já tomou caixas vazias assim).
const SIGLA: Record<CartaDef['categoria'], string> = {
  arma: 'ARMA',
  efeito: 'EFEITO',
  defesa: 'DEFESA',
  movimento: 'MOV',
};
