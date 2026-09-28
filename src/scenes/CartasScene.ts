import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { CARTAS, COR_RARIDADE, NOME_RARIDADE, type CartaDef } from '../cartas';

/**
 * A MESA DE CARTAS — PROTÓTIPO (feat/cartas-preview, 27–28/09).
 *
 * Uma cena SOBREPOSTA (`scene.launch`), não objetos dentro da cena de baixo, por dois motivos:
 * - a fase PAUSA inteira por baixo (`scene.pause` congela física, tweens, timers e o relógio do roteiro) — escolher
 *   carta com tiro vindo na cara não é escolha, é punição;
 * - a câmera desta cena não passa pela Atmosfera da fase: a carta fica LIMPA, como a HUD.
 *
 * TRÊS LAYOUTS em avaliação (registry `layoutCartas`), depois do feedback de 28/09 (*"muito grandes e estourados"*):
 * - `cartucho` — o primeiro: 3 cartuchos de 112×160 (94% da largura);
 * - `compacto` — referência Deep Rock Galactic: Survivor: 3 cartas de 72×96 (~62% da largura), nome numa faixa na cor
 *   da raridade, ícone no tamanho nativo, etiqueta forte de raridade e o efeito em UMA linha;
 * - `lista` — referência 20 Minutes Till Dawn: uma fileira de 3 ícones + UM painel de descrição da opção em foco.
 */
export interface CartasData {
  opcoes: string[];
  titulo: string;
  onEscolha: (id: string) => void;
  /** ESC: sair do jogo. Só a cutscene passa (a fase tem o ESC dela, e ela está pausada por baixo). */
  onSair?: () => void;
}

type Layout = 'cartucho' | 'compacto' | 'lista';

/** O CARTUCHO (112×160). */
const CART = { w: 112, h: 160, passo: 124, cy: 110, visor: { x: 4, y: -44 }, nomeY: 16, textoY: 41 };
/** A CARTA COMPACTA (72×96). */
const COMP = { w: 72, h: 96, passo: 84, cy: 108 };
/** A LISTA: fileira de ícones + painel. */
const LISTA = { slot: 40, passo: 54, iy: 80, py: 148, pw: 236, ph: 52 };

const FUNDO_CARTA = 0x0d1118;
const ACO = 0x3a4252;

export class CartasScene extends Phaser.Scene {
  private opcoes: CartaDef[] = [];
  private onEscolha: (id: string) => void = () => {};
  private cursor = 1;
  private layout: Layout = 'cartucho';
  private cartas: Phaser.GameObjects.Container[] = [];
  private realces: Phaser.GameObjects.GameObject[] = [];
  private painel: Phaser.GameObjects.Container | null = null;
  private fechando = false;

  constructor() {
    super('Cartas');
  }

  create(data: CartasData): void {
    this.opcoes = data.opcoes.map((id) => CARTAS[id]).filter(Boolean);
    this.onEscolha = data.onEscolha;
    this.cursor = Math.min(1, this.opcoes.length - 1);
    this.layout = (this.registry.get('layoutCartas') as Layout | undefined) ?? 'cartucho';
    this.cartas = [];
    this.realces = [];
    this.painel = null;
    this.fechando = false;

    // O compacto e a lista deixam o jogo aparecer mais (as referências mostram a ação escurecida por trás).
    this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, this.layout === 'cartucho' ? 0.72 : 0.6).setOrigin(0);
    // A faixa do título apaga a HUD da fase por baixo: os dois textos moram na mesma altura.
    this.add.rectangle(0, 0, GAME_WIDTH, 22, COLORS.bgDeep, 0.9).setOrigin(0);
    pixelText(this, GAME_WIDTH / 2, 12, data.titulo, { size: 9, color: COLORS.playerBright });

    if (this.layout === 'lista') this.montarLista();
    else {
      const passo = this.layout === 'compacto' ? COMP.passo : CART.passo;
      const x0 = GAME_WIDTH / 2 - ((this.opcoes.length - 1) * passo) / 2;
      this.opcoes.forEach((c, i) =>
        this.layout === 'compacto' ? this.montarCompacta(c, x0 + i * passo, i) : this.montarCartucho(c, x0 + i * passo, i),
      );
    }

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

  // ─── CARTUCHO (o primeiro) ─────────────────────────────────────────────────────────────────────

  private montarCartucho(c: CartaDef, x: number, i: number): void {
    const cor = COR_RARIDADE[c.raridade];
    const k = this.add.container(x, CART.cy);
    const moldura = `carta-${c.raridade}`;
    if (this.textures.exists(moldura)) k.add(this.add.image(0, 0, moldura));
    else k.add(this.add.rectangle(0, 0, CART.w, CART.h, 0x10141c).setStrokeStyle(2, ACO));
    this.icone(k, c, CART.visor.x, CART.visor.y, 1.5, cor);
    k.add(pixelText(this, 0, CART.nomeY, c.nome, { size: 8, color: COLORS.metalLight }));
    k.add(pixelText(this, 0, CART.textoY, c.texto, { size: 7, color: 0xa8b0c2, stroke: 2 }).setAlign('center'));
    k.add(pixelText(this, 0, CART.h / 2 + 7, NOME_RARIDADE[c.raridade], { size: 7, color: cor, stroke: 2 }));
    if (c.requer) k.add(pixelText(this, 0, -CART.h / 2 - 6, `requer ${CARTAS[c.requer].nome.toLowerCase()}`, { size: 7, color: COLORS.metalMid, stroke: 2 }));
    this.realces.push(this.add.rectangle(x, CART.cy, CART.w + 6, CART.h + 6).setStrokeStyle(2, COLORS.hotBright).setVisible(false));
    this.zona(x, CART.cy, CART.w, CART.h, i);
    this.cartas.push(k);
  }

  // ─── COMPACTO (referência: Deep Rock Galactic: Survivor) ───────────────────────────────────────

  private montarCompacta(c: CartaDef, x: number, i: number): void {
    const cor = COR_RARIDADE[c.raridade];
    const { w, h } = COMP;
    const k = this.add.container(x, COMP.cy);
    k.add(this.add.rectangle(0, 0, w, h, FUNDO_CARTA, 0.96).setStrokeStyle(1, ACO));
    // O NOME numa faixa na cor da raridade: é a primeira coisa que o olho lê.
    // (Texto CLARO com contorno escuro: texto escuro sobre a cor, como no Deep Rock, borra a 7px.)
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

  // ─── LISTA (referência: 20 Minutes Till Dawn) ──────────────────────────────────────────────────

  private montarLista(): void {
    const { slot, passo, iy } = LISTA;
    const x0 = GAME_WIDTH / 2 - ((this.opcoes.length - 1) * passo) / 2;
    this.opcoes.forEach((c, i) => {
      const cor = COR_RARIDADE[c.raridade];
      const x = x0 + i * passo;
      const k = this.add.container(x, iy);
      k.add(this.add.rectangle(0, 0, slot, slot, FUNDO_CARTA, 0.96).setStrokeStyle(1, cor));
      this.icone(k, c, 0, 0, 1, cor);
      // A seta embaixo do ícone em foco.
      this.realces.push(this.add.triangle(x, iy + slot / 2 + 7, 0, 0, 8, 0, 4, 5, COLORS.hotBright).setVisible(false));
      this.zona(x, iy, slot, slot, i);
      this.cartas.push(k);
    });
    this.painel = this.add.container(GAME_WIDTH / 2, LISTA.py);
  }

  /** O painel ÚNICO da lista: só a opção em foco é lida, então o texto pode ser maior. */
  private preencherPainel(): void {
    if (!this.painel) return;
    const c = this.opcoes[this.cursor];
    const cor = COR_RARIDADE[c.raridade];
    const { pw, ph } = LISTA;
    this.painel.removeAll(true);
    this.painel.add(this.add.rectangle(0, 0, pw, ph, FUNDO_CARTA, 0.96).setStrokeStyle(1, cor));
    this.painel.add(pixelText(this, -pw / 2 + 8, -ph / 2 + 11, c.nome, { size: 9, color: cor, align: 'left' }));
    this.painel.add(this.add.rectangle(pw / 2 - 30, -ph / 2 + 11, 50, 10, cor, 0.85));
    this.painel.add(pixelText(this, pw / 2 - 30, -ph / 2 + 11, NOME_RARIDADE[c.raridade], { size: 7, color: COLORS.metalLight, stroke: 3 }));
    this.painel.add(pixelText(this, -pw / 2 + 8, 4, c.texto.replace('\n', ' '), { size: 8, color: COLORS.metalLight, align: 'left', stroke: 2 }));
    if (c.requer) this.painel.add(pixelText(this, -pw / 2 + 8, 17, `requer ${CARTAS[c.requer].nome.toLowerCase()}`, { size: 7, color: COLORS.metalMid, align: 'left', stroke: 2 }));
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
    if (this.layout === 'cartucho') this.cartas.forEach((c, i) => c.setScale(i === this.cursor ? 1.04 : 1));
    if (this.layout === 'lista') {
      this.cartas.forEach((c, i) => c.setScale(i === this.cursor ? 1.15 : 1));
      this.preencherPainel();
    }
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

// ASCII puro: a fonte monospace do jogo não tem os símbolos Unicode (o ShipPanel já tomou caixas vazias assim).
const SIGLA: Record<CartaDef['categoria'], string> = {
  arma: 'ARMA',
  efeito: 'EFEITO',
  defesa: 'DEFESA',
  movimento: 'MOV',
};
