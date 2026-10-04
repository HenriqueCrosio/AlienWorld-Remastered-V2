import Phaser from 'phaser';
import { COLORS, GAME_WIDTH } from '../config';
import { CARTAS, type CartaDef, type Categoria } from '../data/catalogoCartas';
import { numerosDaCarta } from '../data/numerosCartas';
import { COR_RARIDADE, NOME_RARIDADE } from '../raridade';
import { mapaAtivo, rotuloDaTecla, type Acao } from '../controles';
import { Starfield } from '../Starfield';
import { pixelText } from '../ui';
import { escalaHD, irmaDe, registrarTextoHD } from '../uiHD';

/** Os grupos da grade, na ordem do catálogo. */
const GRUPOS: { cat: Categoria; nome: string }[] = [
  { cat: 'arma', nome: 'ARMAMENTO' },
  { cat: 'efeito', nome: 'EFEITO' },
  { cat: 'defesa', nome: 'DEFESA' },
  { cat: 'movimento', nome: 'MOVIMENTO' },
];
const NOME_CATEGORIA: Record<Categoria, string> = { arma: 'ARMAMENTO', efeito: 'EFEITO', defesa: 'DEFESA', movimento: 'MOVIMENTO' };
/** As cartas ATIVAS e a ação do mapa de teclas de cada uma: a ficha mostra a tecla do perfil ativo. */
const TECLA_DA_CARTA: Partial<Record<string, Acao>> = { WPN_009: 'missil', EFF_010: 'flare', MOV_003: 'dash' };

/**
 * A GEOMETRIA (px do mundo, 384×216). A grade à esquerda (7 por linha, células de 29px, título de grupo de 9px); à
 * direita, a caixa do clipe (160×90) e a ficha embaixo dela.
 */
const GRADE = { x: 8, y: 20, cel: 29, porLinha: 7, titulo: 9 };
const CLIPE = { x: 216, y: 20, w: 160, h: 90 };
const FICHA = { x: 216, y: 116, w: 160, base: 204 };
/** O ícone na grade: no máximo isto em px do mundo (a célula tem 29). */
const ICONE_MAX = 27;
/** O ícone grande na caixa do clipe (quando a carta não tem clipe): no máximo isto. */
const ICONE_GRANDE_MAX = 64;

/**
 * Pixels de TELA por pixel do ícone: o maior INTEIRO que não passa de `max` px do mundo — o ícone cai pixel a pixel na
 * tela em qualquer janela (como a mesa no pixel fino). Os ícones são 40px de largura.
 */
const kDoIcone = (s: number, max: number): number => Math.max(1, Math.floor((max * s) / 40));
/** Arredonda para o pixel de TELA (coordenadas do mundo × s inteiras). */
const naTela = (v: number, s: number): number => Math.round(v * s) / s;

interface Celula {
  id: string;
  linha: number;
  coluna: number;
  x: number;
  y: number;
}

/**
 * O ARQUIVO DE CARTAS — a wiki das 24 cartas, aberta do menu (spec `2026-10-04-arquivo-de-cartas-design.md`).
 *
 * Esta cena é do MUNDO: desenha o fundo (o céu do menu sob um véu) e o realce da célula. O texto vai para a irmã HD
 * pelo `pixelText` de sempre; os ÍCONES também vão para a irmã, em `k` px de tela por pixel do ícone (`kDoIcone`) —
 * no mundo, um ícone de 40px seria grosso demais e não caberia.
 *
 * Teclas: setas / WASD andam na grade (←→ na linha, ↑↓ entre as linhas, atravessando os grupos; nas bordas, para);
 * ESC / Backspace voltam ao menu.
 */
export class ArquivoScene extends Phaser.Scene {
  /** Público: a sonda `probe-arquivo` lê e escolhe. */
  selecionada = 'WPN_001';
  private starfield: Starfield | null = null;
  private celulas: Celula[] = [];
  private realce!: Phaser.GameObjects.Graphics;
  private irma: Phaser.Scene | null = null;
  private iconeGrande: Phaser.GameObjects.Image | null = null;
  private ficha: Phaser.GameObjects.Text[] = [];
  /** O clipe tocando (público: a sonda confere) e o véu da emenda do loop. */
  clipe: Phaser.GameObjects.Sprite | null = null;
  private veu!: Phaser.GameObjects.Rectangle;

  constructor() {
    super('Arquivo');
  }

  preload(): void {
    // O índice dos clipes (`_gif-cartas.mjs --clipes`); as folhas de quadros carregam sob demanda (`tocarClipe`).
    if (!this.cache.json.exists('clipes')) this.load.json('clipes', 'sprites/cartas/clipes/clipes.json');
  }

  create(): void {
    this.irma = irmaDe(this);
    if (!this.irma) {
      // Sem a camada HD o menu nem mostra o item; se chegar aqui assim, volta.
      this.scene.start('Menu', { cursor: 1, direto: true });
      return;
    }
    this.celulas = [];
    this.ficha = [];
    this.iconeGrande = null;
    this.clipe = null;

    this.montarFundo();
    pixelText(this, GAME_WIDTH / 2, 9, 'ARQUIVO DE CARTAS', { size: 8, color: COLORS.playerGlow, voz: 'jogo' });
    pixelText(this, GAME_WIDTH / 2, 209, '[SETAS] ESCOLHER   [ESC] VOLTAR', { size: 7, color: COLORS.metalMid, voz: 'piloto' });
    this.realce = this.add.graphics().setDepth(10);
    this.montarGrade();
    // A moldura da caixa do clipe (sem clipe — as 4 sem movimento, ou enquanto carrega —, o ícone grande).
    this.add
      .rectangle(CLIPE.x - 1, CLIPE.y - 1, CLIPE.w + 2, CLIPE.h + 2)
      .setOrigin(0, 0)
      .setStrokeStyle(1, COLORS.metalDark)
      .setFillStyle(COLORS.bgDeep, 0.7)
      .setDepth(8);
    // O VÉU da emenda: o fim do clipe não pula seco para o começo — escurece e clareia num instante.
    this.veu = this.add.rectangle(CLIPE.x, CLIPE.y, CLIPE.w, CLIPE.h, 0x000000, 1).setOrigin(0, 0).setDepth(10).setAlpha(0);
    this.ligarTeclas();
    this.selecionar(this.selecionada);
  }

  override update(_t: number, delta: number): void {
    this.starfield?.update(delta / 1000);
  }

  // ─── O fundo ────────────────────────────────────────────────────────────────

  /** O céu do menu (estrelas à deriva e as nebulosas) sob um véu escuro: a ficha é o foco. */
  private montarFundo(): void {
    this.starfield = new Starfield(this);
    const neb = (key: string, x: number, y: number, escala: number, tint: number, alpha: number): void => {
      if (this.textures.exists(key)) this.add.image(x, y, key).setScale(escala).setTint(tint).setAlpha(alpha);
    };
    neb('nebula', 306, 44, 1.8, 0x5e4a8c, 0.5);
    neb('nebula2', 64, 30, 2.0, 0x3d6a80, 0.42);
    this.add.rectangle(0, 0, GAME_WIDTH, 216, COLORS.bgDeep, 0.6).setOrigin(0, 0).setDepth(5);
  }

  // ─── A grade ────────────────────────────────────────────────────────────────

  private montarGrade(): void {
    let y = GRADE.y;
    let linha = 0;
    for (const g of GRUPOS) {
      pixelText(this, GRADE.x, y + 3, g.nome, { size: 7, color: COLORS.metalMid, align: 'left', voz: 'piloto' });
      y += GRADE.titulo;
      const ids = Object.values(CARTAS).filter((c) => c.categoria === g.cat).map((c) => c.id);
      ids.forEach((id, i) => {
        const coluna = i % GRADE.porLinha;
        if (i > 0 && coluna === 0) {
          y += GRADE.cel;
          linha++;
        }
        const x = GRADE.x + coluna * GRADE.cel;
        this.celulas.push({ id, linha, coluna, x, y });
        this.icone(id, x + GRADE.cel / 2, y + GRADE.cel / 2, ICONE_MAX);
      });
      y += GRADE.cel;
      linha++;
    }
  }

  /** Um ícone na irmã HD, centrado em (x, y), em `k` px de tela por pixel (ver `kDoIcone`). */
  private icone(id: string, x: number, y: number, max: number): Phaser.GameObjects.Image | null {
    const irma = this.irma!;
    const chave = `icone-${id}`;
    if (!irma.textures.exists(chave)) return null;
    const img = irma.add.image(0, 0, chave);
    const ajustar = (s: number): void => {
      img.setScale(kDoIcone(s, max) / s).setPosition(naTela(x, s), naTela(y, s));
    };
    ajustar(escalaHD());
    registrarTextoHD(img, ajustar);
    return img;
  }

  // ─── A ficha ────────────────────────────────────────────────────────────────

  /** Troca a carta selecionada: o realce, o ícone grande e a ficha. */
  selecionar(id: string): void {
    const carta = CARTAS[id];
    const cel = this.celulas.find((c) => c.id === id);
    if (!carta || !cel) return;
    this.selecionada = id;

    const cor = COR_RARIDADE[carta.raridade];
    this.realce.clear();
    this.realce.fillStyle(cor, 0.18).fillRect(cel.x, cel.y, GRADE.cel, GRADE.cel);
    this.realce.lineStyle(1, cor, 1).strokeRect(cel.x + 0.5, cel.y + 0.5, GRADE.cel - 1, GRADE.cel - 1);

    this.iconeGrande?.destroy();
    this.iconeGrande = this.icone(id, CLIPE.x + CLIPE.w / 2, CLIPE.y + CLIPE.h / 2, ICONE_GRANDE_MAX);
    this.montarFicha(carta);
    this.tocarClipe(id);
  }

  // ─── O clipe ────────────────────────────────────────────────────────────────

  /**
   * O CLIPE da carta (spec §4.3): a folha de quadros gravada em jogo, em pixel nativo, em loop. Carrega SOB DEMANDA —
   * as 20 folhas somam alguns MB e o boot não paga por elas. Enquanto carrega (ou sem clipe), fica o ícone grande.
   */
  private tocarClipe(id: string): void {
    this.clipe?.destroy();
    this.clipe = null;
    this.veu.setAlpha(0);
    const indice = this.cache.json.get('clipes') as
      | { w: number; h: number; fps: number; cartas: Record<string, { quadros: number }> }
      | undefined;
    const dados = indice?.cartas[id];
    if (!indice || !dados) return;
    const chave = `clipe-${id}`;
    const tocar = (): void => {
      if (this.selecionada !== id || !this.scene.isActive()) return;
      if (!this.anims.exists(chave)) {
        this.anims.create({
          key: chave,
          frames: this.anims.generateFrameNumbers(chave, { start: 0, end: dados.quadros - 1 }),
          frameRate: indice.fps,
          repeat: -1,
        });
      }
      this.iconeGrande?.destroy();
      this.iconeGrande = null;
      this.clipe = this.add.sprite(CLIPE.x, CLIPE.y, chave, 0).setOrigin(0, 0).setDepth(9).play(chave);
      this.clipe.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
        this.tweens.killTweensOf(this.veu);
        this.veu.setAlpha(1);
        this.tweens.add({ targets: this.veu, alpha: 0, duration: 120, ease: 'Quad.easeOut' });
      });
    };
    if (this.textures.exists(chave)) {
      tocar();
      return;
    }
    this.load.spritesheet(chave, `sprites/cartas/clipes/${id}.png`, { frameWidth: indice.w, frameHeight: indice.h });
    this.load.once(`filecomplete-spritesheet-${chave}`, tocar);
    this.load.start();
  }

  private montarFicha(carta: CartaDef): void {
    for (const t of this.ficha) t.destroy();
    this.ficha = [];
    let y = FICHA.y;
    const linha = (texto: string, size: number, color: number, voz: 'piloto' | 'nave', folga: number): void => {
      if (!texto) return;
      const t = pixelText(this, FICHA.x, y, texto, { size, color, align: 'left', voz }).setOrigin(0, 0);
      // A quebra é em px do MUNDO: o texto da irmã mora nas coordenadas do mundo (só a fonte é da tela). 4px de folga:
      // o contorno da voz da nave entra na largura medida e passava 3px da área.
      (t as Partial<Phaser.GameObjects.Text>).setWordWrapWidth?.(FICHA.w - 4);
      this.ficha.push(t);
      y += t.getBounds().height + folga;
    };
    linha(carta.nome, 8, COLORS.playerGlow, 'piloto', 1);
    const meta = `${NOME_RARIDADE[carta.raridade]} · ${NOME_CATEGORIA[carta.categoria]} · máx. ${carta.max}`;
    linha(meta, 7, COR_RARIDADE[carta.raridade], 'piloto', 4);
    linha(carta.descricao, 7, COLORS.metalLight, 'piloto', 4);
    linha(numerosDaCarta(carta.id), 7, COLORS.playerBright, 'nave', 2);
    const acao = TECLA_DA_CARTA[carta.id];
    if (acao) linha(`TECLA ${rotuloDaTecla(mapaAtivo()[acao][0])}`, 7, COLORS.hot, 'nave', 0);
  }

  /** A geometria para a sonda: as caixas de texto da ficha (px do mundo) e a área permitida. */
  geometria(): { id: string; area: { x: number; y: number; w: number; h: number }; caixas: { x: number; y: number; w: number; h: number }[] } {
    return {
      id: this.selecionada,
      area: { x: FICHA.x, y: FICHA.y, w: FICHA.w, h: FICHA.base - FICHA.y },
      caixas: this.ficha.map((t) => {
        const b = t.getBounds();
        return { x: b.x, y: b.y, w: b.width, h: b.height };
      }),
    };
  }

  // ─── As teclas ──────────────────────────────────────────────────────────────

  private ligarTeclas(): void {
    const kb = this.input.keyboard!;
    // ⚠️ UM EVENTO, UMA VEZ (a lição da mesa, 03/10): o Phaser reprocessa a fila de teclas a cada evento novo.
    const vistos = new WeakSet<KeyboardEvent>();
    const uma = (f: () => void) => (ev: KeyboardEvent) => {
      if (vistos.has(ev)) return;
      vistos.add(ev);
      f();
    };
    const pares: [string[], () => void][] = [
      [['LEFT', 'A'], () => this.mover(-1, 0)],
      [['RIGHT', 'D'], () => this.mover(1, 0)],
      [['UP', 'W'], () => this.mover(0, -1)],
      [['DOWN', 'S'], () => this.mover(0, 1)],
      [['ESC', 'BACKSPACE'], () => this.scene.start('Menu', { cursor: 1, direto: true })],
    ];
    for (const [teclas, f] of pares) for (const t of teclas) kb.on(`keydown-${t}`, uma(f));
  }

  /** ←→ na mesma linha; ↑↓ para a linha vizinha, na coluna mais perto. Nas bordas, para. */
  private mover(dx: number, dy: number): void {
    const atual = this.celulas.find((c) => c.id === this.selecionada)!;
    let alvo: Celula | undefined;
    if (dx) alvo = this.celulas.find((c) => c.linha === atual.linha && c.coluna === atual.coluna + dx);
    else {
      const linha = this.celulas.filter((c) => c.linha === atual.linha + dy);
      alvo = linha.find((c) => c.coluna === Math.min(atual.coluna, linha.length - 1));
    }
    if (alvo) this.selecionar(alvo.id);
  }
}
