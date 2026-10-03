import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { FAMILIA, fontesOk } from '../fonte';
import { EVENTO_ESCALA, ehHD, escalaHD, jogoHD, mouseHD, pixelFino, prepararCameraHD, registrarTextoHD } from '../uiHD';
import { CARTAS, COR_RARIDADE, NOME_RARIDADE, type CartaDef } from '../cartas';
import { mapaAtivo } from '../controles';
import { ENCAIXE, FOLGA, MOLDURA, type Caixa } from '../molduraCarta';
import { medidorDaFonte, posicionar, quebrar, tamanhoUnico, type Medir } from '../textoNoEncaixe';

/**
 * A MESA DE CARTAS — o COMPACTO (decisão de 29/09: *"traz mais foco no conteúdo, deixa mais o background do jogo à
 * vista"*), com a arte de 30/09 (spec `2026-09-30-mesa-compacta-arte-design.md`): a moldura M2 + o feixe da M3, a
 * raridade na moldura (o filete do visor, o feixe do pé e a palavra), os ícones nas cores reais.
 *
 * Uma cena SOBREPOSTA (`scene.launch`), não objetos dentro da cena de baixo, por dois motivos:
 * - a fase PAUSA inteira por baixo (`scene.pause` congela física, tweens, timers e o relógio do roteiro) — escolher
 *   carta com tiro vindo na cara não é escolha, é punição;
 * - a mesa não passa pela Atmosfera da fase: a carta fica LIMPA, como a HUD.
 *
 * Ela MORA NA CAMADA HD (`uiHD.ts`) e fala com a voz do PILOTO. A cena 'Cartas' do mundo continua sendo a que a fase
 * lança: ela fica viva e vazia (a fase segue vendo 'Cartas' ativa) e repassa a mesa para a 'Cartas' da camada, que
 * desenha e responde — teclado e mouse. Sem a camada, a mesa roda no próprio mundo.
 *
 * ⚠️ O GRID DE PIXEL FINO: na camada, esta cena tem câmera em zoom = pixel fino (`zoomHD`), e TODA coordenada daqui é
 * em pixels finos. A carta tem o tamanho nativo da moldura (105×141): cai pixel a pixel em qualquer janela, e o
 * texto que cabe numa cabe em todas. (Sem a camada, 1 pixel fino = 1 pixel do mundo.)
 *
 * ⚠️ NENHUM TEXTO TEM COORDENADA DIGITADA: tudo sai de um ENCAIXE da moldura (`molduraCarta.ts`) e é centrado pela
 * TINTA (`textoNoEncaixe.ts`). A sonda `probe-mesa-texto` cobra folga e centro nas 13 cartas.
 */
export interface CartasData {
  opcoes: string[];
  titulo: string;
  onEscolha: (id: string) => void;
  /** ESC: sair do jogo. Só a cutscene passa (a fase tem o ESC dela, e ela está pausada por baixo). */
  onSair?: () => void;
}

type TipoGrupo = 'nome' | 'efeito' | 'requer' | 'raridade' | 'icone';

/** Um elemento da carta e a caixa em que ele tem de caber — relativa ao canto da carta, em px finos. */
interface Grupo {
  tipo: TipoGrupo;
  objs: Phaser.GameObjects.GameObject[];
  caixa: Caixa;
  centrarX: boolean;
  centrarY: boolean;
  /** Topo e pé da tinta (calculados), para empilhar o visor. */
  tinta: { topo: number; pe: number };
}

/** O vão entre duas cartas (px finos). */
const VAO = 12;
/** Folga de DESENHO além da cobrada (`FOLGA`): o navegador desenha a letra com até ½px de diferença da medida. */
const MARGEM = 0.5;
/** O texto da carta não passa disto (px finos): acima, a carta vira cartaz. */
const MAX_PX = 10;
/** Título e ajuda, fora da carta (px finos — em 1152 são os 9 e 7 do mundo de antes). */
const PX_TITULO = 13;
const PX_AJUDA = 10;

interface Tamanhos {
  nome: number;
  efeito: number;
  raridade: number;
  requer: number;
}

const textoRequer = (c: CartaDef): string => `REQUER ${CARTAS[c.requer!].nome}`;

/** A tinta (pixels visíveis) de cada textura de ícone, medida uma vez (`CartasScene.tintaDaImagem`). */
const tintasDeImagem = new Map<string, Caixa>();

/** UM tamanho por tipo de texto, para as 13 cartas (spec §3.2): calculado uma vez, pelo texto mais longo de cada. */
let tamanhos: Tamanhos | null = null;
function calcularTamanhos(medir: Medir): Tamanhos {
  const todas = Object.values(CARTAS);
  const f = FOLGA + MARGEM;
  const nome = tamanhoUnico(todas.map((c) => c.nome), ENCAIXE.nome, 1, medir, MAX_PX, f);
  return {
    nome,
    efeito: tamanhoUnico(todas.map((c) => c.curto), ENCAIXE.plaqueta, 2, medir, nome, f),
    raridade: tamanhoUnico(Object.values(NOME_RARIDADE), ENCAIXE.visor, 1, medir, nome, f),
    requer: tamanhoUnico(todas.filter((c) => c.requer).map(textoRequer), ENCAIXE.visor, 1, medir, nome - 1, f),
  };
}

export class CartasScene extends Phaser.Scene {
  private opcoes: CartaDef[] = [];
  private onEscolha: (id: string) => void = () => {};
  private cursor = 1;
  private cartas: Phaser.GameObjects.Container[] = [];
  private grupos: Grupo[][] = [];
  private realces: Phaser.GameObjects.Image[][] = [];
  private zonas: Phaser.GameObjects.Zone[] = [];
  private fechando = false;
  private familia = 'monospace';
  private medir!: Medir;
  private escurecer!: Phaser.GameObjects.Rectangle;
  private faixa!: Phaser.GameObjects.Rectangle;
  private titulo!: Phaser.GameObjects.Text;
  private ajuda!: Phaser.GameObjects.Text;

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
      this.game.events.on(EVENTO_ESCALA, this.posicionar, this);
      this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
        mouseHD(false);
        this.game.events.off(EVENTO_ESCALA, this.posicionar, this);
      });
    }

    this.opcoes = data.opcoes.map((id) => CARTAS[id]).filter(Boolean);
    this.onEscolha = data.onEscolha;
    this.cursor = Math.min(1, this.opcoes.length - 1);
    this.cartas = [];
    this.grupos = [];
    this.realces = [];
    this.zonas = [];
    this.fechando = false;
    this.familia = fontesOk().piloto ? FAMILIA.piloto : 'monospace';
    this.medir = medidorDaFonte(this.familia);
    if (!tamanhos) tamanhos = calcularTamanhos(this.medir);

    // O jogo aparece por trás, escurecido (as referências mostram a ação por baixo da escolha). A faixa do título
    // apaga a HUD da fase por baixo: os dois textos moram na mesma altura.
    this.escurecer = this.add.rectangle(0, 0, 1, 1, COLORS.bgDeep, 0.6).setOrigin(0);
    this.faixa = this.add.rectangle(0, 0, 1, 1, COLORS.bgDeep, 0.9).setOrigin(0);
    this.titulo = this.criarTexto(data.titulo.toUpperCase(), PX_TITULO, COLORS.playerBright);
    this.ajuda = this.criarTexto('[<-  ->] ESCOLHER   [ENTER] CONFIRMAR', PX_AJUDA, COLORS.metalMid);

    this.opcoes.forEach((c, i) => this.montarCarta(c, i));
    this.posicionar();

    const kb = this.input.keyboard!;
    // ⚠️ UM EVENTO, UMA VEZ: o Phaser reprocessa a fila INTEIRA de teclas a cada evento novo e só a limpa no fim do
    // quadro (o filtro de duplicata dele compara só com o evento anterior). Dois toques no mesmo quadro — soltar o
    // Espaço e apertar → — faziam o → andar duas casas (a `probe-teclas` pegou, 03/10).
    const vistos = new WeakSet<KeyboardEvent>();
    const uma = (f: () => void) => (ev: KeyboardEvent) => {
      if (vistos.has(ev)) return;
      vistos.add(ev);
      f();
    };
    const mover = (d: number) => {
      this.cursor = Phaser.Math.Wrap(this.cursor + d, 0, this.opcoes.length);
      this.marcar();
    };
    kb.on('keydown-LEFT', uma(() => mover(-1)));
    kb.on('keydown-A', uma(() => mover(-1)));
    kb.on('keydown-RIGHT', uma(() => mover(1)));
    kb.on('keydown-D', uma(() => mover(1)));
    // ⚠️ SÓ TOQUE NOVO: quem segura o TIRO (o Espaço) quando a mesa abre manda a repetição automática do sistema como
    // `keydown` — sem este filtro, a carta do cursor era escolhida sem ele ver.
    const novo = (f: () => void) => {
      const g = uma(f);
      return (ev: KeyboardEvent) => {
        if (!ev.repeat) g(ev);
      };
    };
    kb.on('keydown-ONE', novo(() => this.confirmar(0)));
    kb.on('keydown-TWO', novo(() => this.confirmar(1)));
    kb.on('keydown-THREE', novo(() => this.confirmar(2)));
    kb.on('keydown-ENTER', novo(() => this.confirmar(this.cursor)));
    // A tecla de TIRO do perfil confirma (Espaço no padrão, Z no clássico). O J saiu com o mapa de 03/10.
    for (const t of mapaAtivo().tiro) kb.on(`keydown-${t}`, novo(() => this.confirmar(this.cursor)));
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

    // Entrada: as cartas sobem para a mesa, uma depois da outra (e terminam em pixel inteiro).
    this.cartas.forEach((k, i) => {
      const y = k.y;
      k.y += 16;
      k.alpha = 0;
      this.tweens.add({ targets: k, y, alpha: 1, duration: 200, delay: 50 * i, ease: 'Quad.easeOut' });
    });
  }

  /** A geometria da mesa, para a sonda `probe-mesa-texto` (px finos; as caixas são relativas à carta). */
  geometria(): { moldura: { w: number; h: number }; cartas: { id: string; x: number; y: number; grupos: Omit<Grupo, 'objs'>[] }[] } {
    return {
      moldura: { w: MOLDURA.w, h: MOLDURA.h },
      cartas: this.cartas.map((k, i) => ({
        id: this.opcoes[i].id,
        x: k.x,
        y: k.y,
        grupos: this.grupos[i].map(({ tipo, caixa, centrarX, centrarY, tinta }) => ({ tipo, caixa, centrarX, centrarY, tinta })),
      })),
    };
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
    // ⚠️ O MUNDO SOLTA AS TECLAS ENQUANTO A MESA ESTÁ ABERTA (03/10). Os dois jogos escutam a MESMA janela, e o do
    // mundo bloqueia (`preventDefault`) as teclas que a fase captura — Espaço, setas, WASD. O Phaser da camada HD
    // ignora evento já bloqueado: a mesa nunca via ← → nem A/D (o cursor não andava) nem o tiro (não confirmava).
    const kb = this.input.keyboard;
    kb?.disableGlobalCapture();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      kb?.enableGlobalCapture();
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

  // ─── O GRID ────────────────────────────────────────────────────────────────────────────────────

  /** Unidades do mundo → unidades desta cena (px finos na camada; o próprio mundo sem ela). */
  private get fino(): number {
    return ehHD(this) ? escalaHD() / pixelFino() : 1;
  }

  /**
   * Põe a mesa no lugar — na criação e quando a janela muda de escala (o pixel fino muda, e a tela passa a ter outra
   * largura em px finos). A carta por dentro NÃO muda: só o lugar dela na tela.
   */
  private posicionar(): void {
    if (ehHD(this)) prepararCameraHD(this);
    const f = this.fino;
    const L = Math.round(GAME_WIDTH * f);
    const A = Math.round(GAME_HEIGHT * f);
    this.escurecer.setSize(L, A);
    const faixaH = Math.ceil(22 * f);
    this.faixa.setSize(L, faixaH);
    this.colocar(this.titulo, PX_TITULO, { x: 0, y: 0, w: L, h: faixaH });
    this.colocar(this.ajuda, PX_AJUDA, { x: 0, y: Math.round(209 * f) - 8, w: L, h: 16 });

    const n = this.cartas.length;
    const total = n * MOLDURA.w + (n - 1) * VAO;
    const x0 = Math.round((L - total) / 2);
    const y = Math.round(108 * f - MOLDURA.h / 2);
    this.cartas.forEach((k, i) => {
      const x = x0 + i * (MOLDURA.w + VAO);
      this.tweens.killTweensOf(k);
      k.setPosition(x, y).setAlpha(1).setScale(1);
      this.zonas[i].setPosition(x, y);
      // O realce: um L de 2px a 2px da borda — o canto de 8×8 tem 1px de contorno antes do L.
      const [a, b, c, d] = this.realces[i];
      a.setPosition(x - 5, y - 5);
      b.setPosition(x + MOLDURA.w - 3, y - 5);
      c.setPosition(x - 5, y + MOLDURA.h - 3);
      d.setPosition(x + MOLDURA.w - 3, y + MOLDURA.h - 3);
    });
  }

  // ─── O TEXTO ───────────────────────────────────────────────────────────────────────────────────

  /** Um objeto de texto na voz do piloto, SEM contorno (dentro da moldura o fundo já é escuro e liso). */
  private criarTexto(texto: string, px: number, cor: number): Phaser.GameObjects.Text {
    const t = this.add
      .text(0, 0, texto, {
        fontFamily: this.familia,
        fontSize: `${px}px`,
        color: Phaser.Display.Color.IntegerToColor(cor).rgba,
      })
      .setOrigin(0, 0);
    if (ehHD(this)) {
      t.setResolution(pixelFino());
      registrarTextoHD(t, () => t.setResolution(pixelFino()));
    }
    return t;
  }

  /** Põe um texto com a linha de base em `base`: o Phaser desenha a base em `y + round(ascent)` (Text.updateText). */
  private assentar(t: Phaser.GameObjects.Text, x: number, base: number): void {
    t.setPosition(x, base - Math.round(t.getTextMetrics().ascent));
  }

  /** Um texto solto (título, ajuda) centrado pela tinta numa caixa. */
  private colocar(t: Phaser.GameObjects.Text, px: number, caixa: Caixa): void {
    const [p] = posicionar([t.text], px, this.medir, caixa, 'centro', 0);
    this.assentar(t, p.x, p.base);
  }

  /** Um grupo de texto DENTRO da carta: as linhas no encaixe, pela tinta. */
  private textoNaCarta(
    k: Phaser.GameObjects.Container,
    tipo: TipoGrupo,
    linhas: string[],
    px: number,
    cor: number,
    caixa: Caixa,
    vertical: 'centro' | 'topo' | 'pe',
  ): Grupo {
    const pos = posicionar(linhas, px, this.medir, caixa, vertical, FOLGA + MARGEM);
    const objs = linhas.map((l, i) => {
      const t = this.criarTexto(l, px, cor);
      this.assentar(t, pos[i].x, pos[i].base);
      k.add(t);
      return t;
    });
    const primeira = this.medir(linhas[0], px);
    const ultima = this.medir(linhas[linhas.length - 1], px);
    return {
      tipo,
      objs,
      caixa,
      centrarX: true,
      centrarY: vertical === 'centro',
      tinta: { topo: pos[0].base - primeira.asc, pe: pos[pos.length - 1].base + ultima.desc },
    };
  }

  // ─── A CARTA ───────────────────────────────────────────────────────────────────────────────────

  private montarCarta(c: CartaDef, i: number): void {
    const t = tamanhos!;
    const v = ENCAIXE.visor;
    const k = this.add.container(0, 0);
    k.add(this.add.image(0, 0, `moldura-${c.raridade}`).setOrigin(0));
    const grupos: Grupo[] = [];

    grupos.push(this.textoNaCarta(k, 'nome', [c.nome], t.nome, COLORS.metalLight, ENCAIXE.nome, 'centro'));
    const efeito = quebrar(c.curto, t.efeito, this.medir, ENCAIXE.plaqueta.w - 2 * (FOLGA + MARGEM), 2)!;
    grupos.push(this.textoNaCarta(k, 'efeito', efeito, t.efeito, COLORS.metalLight, ENCAIXE.plaqueta, 'centro'));
    const requer = c.requer
      ? this.textoNaCarta(k, 'requer', [textoRequer(c)], t.requer, COLORS.metalMid, v, 'topo')
      : null;
    if (requer) grupos.push(requer);
    const raridade = this.textoNaCarta(k, 'raridade', [NOME_RARIDADE[c.raridade]], t.raridade, COR_RARIDADE[c.raridade], v, 'pe');
    grupos.push(raridade);

    // O ÍCONE: no meio do espaço que sobra entre o "requer" (ou o topo do visor) e a raridade.
    const topo = requer ? Math.ceil(requer.tinta.pe) + FOLGA : v.y + FOLGA;
    const pe = Math.floor(raridade.tinta.topo) - FOLGA;
    const icone = `icone-${c.id}`;
    if (this.textures.exists(icone)) {
      // Pela TINTA, como o texto: o PNG pode ter margem transparente torta (o do Casco tinha 7px a mais de um lado).
      const b = this.tintaDaImagem(icone);
      const img = this.add.image(0, 0, icone).setOrigin(0);
      img.setPosition(
        Math.round(v.x + (v.w - b.w) / 2 - b.x),
        Math.round(topo + (pe - topo - b.h) / 2 - b.y),
      );
      k.add(img);
      grupos.push({ tipo: 'icone', objs: [img], caixa: v, centrarX: true, centrarY: false, tinta: { topo: img.y + b.y, pe: img.y + b.y + b.h } });
    } else {
      const g = this.textoNaCarta(k, 'icone', [SIGLA[c.categoria]], t.nome, COR_RARIDADE[c.raridade], { x: v.x, y: topo, w: v.w, h: pe - topo }, 'centro');
      grupos.push({ ...g, caixa: v, centrarY: false });
    }

    this.cartas.push(k);
    this.grupos.push(grupos);
    this.realces.push(this.cantos());
    this.zonas.push(this.zona(i));
  }

  /** O retângulo dos pixels VISÍVEIS de uma textura (alfa > 0), relativo ao canto dela. Medido uma vez por textura. */
  private tintaDaImagem(chave: string): Caixa {
    const tem = tintasDeImagem.get(chave);
    if (tem) return tem;
    const fonte = this.textures.get(chave).getSourceImage();
    let x0 = Infinity, y0 = Infinity, x1 = -1, y1 = -1;
    for (let y = 0; y < fonte.height; y++) {
      for (let x = 0; x < fonte.width; x++) {
        if (this.textures.getPixelAlpha(x, y, chave) === 0) continue;
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    }
    const caixa = x1 < 0 ? { x: 0, y: 0, w: fonte.width, h: fonte.height } : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
    tintasDeImagem.set(chave, caixa);
    return caixa;
  }

  /** Os 4 CANTOS do realce (o mesmo L de 8×8, espelhado) — pixel, não Graphics. */
  private cantos(): Phaser.GameObjects.Image[] {
    const canto = (fx: boolean, fy: boolean) => this.add.image(0, 0, 'realce-canto').setOrigin(0).setFlip(fx, fy).setVisible(false);
    return [canto(false, false), canto(true, false), canto(false, true), canto(true, true)];
  }

  private zona(i: number): Phaser.GameObjects.Zone {
    const z = this.add.zone(0, 0, MOLDURA.w, MOLDURA.h).setOrigin(0).setInteractive({ useHandCursor: true });
    z.on('pointerover', () => {
      this.cursor = i;
      this.marcar();
    });
    z.on('pointerdown', () => this.confirmar(i));
    return z;
  }

  private marcar(): void {
    this.realces.forEach((r, i) => r.forEach((c) => c.setVisible(i === this.cursor)));
  }

  private confirmar(i: number): void {
    if (this.fechando || i < 0 || i >= this.opcoes.length) return;
    this.fechando = true;
    const escolhida = this.opcoes[i];

    this.cartas.forEach((k, j) => {
      // O "pulo" da escolhida cresce a partir do MEIO (a carta é posicionada pelo canto).
      if (j === i) this.tweens.add({ targets: k, x: k.x - MOLDURA.w * 0.05, y: k.y - MOLDURA.h * 0.05, scale: 1.1, duration: 140, yoyo: true });
      else this.tweens.add({ targets: k, alpha: 0, y: k.y + 12, duration: 180 });
    });
    this.realces.forEach((r) => r.forEach((c) => c.setVisible(false)));

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
