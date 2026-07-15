import Phaser from 'phaser';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { pixelText } from '../ui';
import { SHIPS } from '../ships';
import { WEAPONS } from '../systems/WeaponSystem';

/**
 * O PAINEL DE ESCOLHA DE NAVE — um terminal de hangar.
 *
 * ─── POR QUE ELE É UMA CLASSE, E NÃO CÓDIGO DENTRO DA CUTSCENE ───
 *
 * Ele nasceu dentro da 1ª interlude. Quando a 2ª chegou (a doca no cinturão, com a nave
 * alienígena), a saída preguiçosa seria copiar os 130 linhas para a cena nova. Isso teria criado
 * DUAS fichas técnicas — e no dia em que alguém rebalanceasse uma arma, uma delas passaria a
 * mentir. **Mentir sobre a única informação que o jogador usa para decidir é o pior bug possível
 * num menu de escolha**, e o pior é que ele é silencioso: o painel continua bonito e continua
 * errado.
 *
 * Agora existe um painel só, e ele recebe QUAIS naves mostrar. A 1ª interlude passa três; a 2ª
 * passa quatro. Acrescentar uma nave é acrescentar uma entrada em `SHIPS` e liberá-la numa
 * interlude — nenhuma linha aqui muda.
 *
 * ─── AS DECISÕES DE LAYOUT (não reabrir) ───
 *
 * - **O VISOR ÂMBAR é a peça central.** Sem ele a nave era um ícone de 30px perdido numa linha, e
 *   **a silhueta É a informação** (o nariz de lança, o delta largo, o casco orgânico anunciam como
 *   a nave atira). Âmbar de propósito: é a cor de um CRT técnico e não compete com o ciano do
 *   jogador nem com o magenta do inimigo.
 * - **O preview usa escala INTEIRA** (×3). Fracionária caberia com folga — e borraria a grade de
 *   pixel, que é a única coisa que o visor existe para mostrar.
 * - **As barras da ficha são RETÂNGULOS, não texto.** A 1ª versão usava blocos Unicode (`█████░░`)
 *   e a fonte monospace do jogo não os tem: saíram **caixas vazias**.
 * - **A ficha sai da `WeaponDef`.** Ela é a FONTE — ver acima.
 */
const V = { x: 272, y: 89, w: 150, h: 82 } as const;
const PREVIEW_SCALE = 3;

/** Os slots são CENTRADOS e o passo é fixo: com 3 naves ou com 4, a fileira fica no meio da tela. */
const SLOT = { y: 142, w: 78, h: 18, step: 86 } as const;

/** As barras da ficha. `max` é o teto da escala — é ele que dá sentido ao número. */
const FICHA = [
  { rotulo: 'DANO', y: 86, max: 3 },
  { rotulo: 'CADÊNCIA', y: 100, max: 7 },
  { rotulo: 'ALCANCE', y: 114, max: 5 },
] as const;

export class ShipPanel {
  private readonly objetos: Phaser.GameObjects.GameObject[] = [];
  private readonly slots: Phaser.GameObjects.Rectangle[] = [];
  private readonly barras: Phaser.GameObjects.Rectangle[][] = [];

  private preview!: Phaser.GameObjects.Image;
  private nome!: Phaser.GameObjects.Text;
  private tag!: Phaser.GameObjects.Text;
  private rodape!: Phaser.GameObjects.Text;

  private cursor = 0;
  /** Já selecionou e está no passo de CONFIRMAR? A escolha vale a campanha inteira. */
  private confirmando = false;
  private vivo = true;

  constructor(
    private readonly scene: Phaser.Scene,
    /** Quais naves este painel oferece. A 2ª interlude é a única que inclui a alienígena. */
    private readonly naves: string[],
    private readonly onAviso: (texto: string, cor: number) => void,
    private readonly onConfirmar: (id: string) => void,
    private readonly onSair: () => void,
  ) {
    this.montar();
    this.marcar();
    this.teclas();
  }

  private montar(): void {
    const s = this.scene;

    // Faixa escura ATRÁS do painel. O convés é claro e o parallax é ruidoso: sem ela, contorno
    // preto não salva texto nenhum. Ela é o FUNDO; a moldura por cima é só a borda (miolo
    // transparente). Duas coisas separadas de propósito — a legibilidade do texto não pode
    // depender da arte da moldura.
    this.objetos.push(
      s.add.rectangle(0, 44, GAME_WIDTH, 122, COLORS.bgDeep, 0.78).setOrigin(0, 0).setDepth(99),
    );

    if (s.textures.exists('uiFrame')) {
      this.objetos.push(s.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'uiFrame').setDepth(100));
    }

    // ─── O VISOR ───
    this.objetos.push(
      s.add.rectangle(V.x, V.y, V.w, V.h, 0x1a1206).setDepth(100),
      s.add.rectangle(V.x, V.y, V.w, V.h).setStrokeStyle(1, COLORS.hot, 0.7).setDepth(102),
      pixelText(s, V.x - V.w / 2 + 6, V.y - V.h / 2 + 7, 'MODELO', {
        size: 7,
        color: COLORS.hot,
        align: 'left',
      }).setDepth(102),
    );

    // Linhas de varredura: é o que faz um retângulo escuro virar uma TELA.
    for (let y = V.y - V.h / 2 + 2; y < V.y + V.h / 2; y += 3) {
      this.objetos.push(s.add.rectangle(V.x, y, V.w - 2, 1, 0x000000, 0.35).setDepth(101));
    }

    this.preview = s.add
      .image(V.x, V.y + 8, 'ship')
      .setScale(PREVIEW_SCALE)
      .setTint(COLORS.hotBright)
      .setDepth(101);
    this.objetos.push(this.preview);

    // ─── Coluna da esquerda: nome + ficha ───
    this.nome = pixelText(s, 48, 54, '', { size: 13, color: COLORS.playerBright, align: 'left' })
      .setDepth(101);
    this.tag = pixelText(s, 48, 68, '', { size: 7, color: COLORS.metalLight, align: 'left' })
      .setDepth(101);
    this.objetos.push(this.nome, this.tag);

    for (const f of FICHA) {
      this.objetos.push(
        pixelText(s, 48, f.y, f.rotulo, { size: 8, color: COLORS.metalLight, align: 'left' })
          .setDepth(101),
      );

      const celulas: Phaser.GameObjects.Rectangle[] = [];
      for (let i = 0; i < 5; i++) {
        celulas.push(s.add.rectangle(126 + i * 12, f.y, 9, 7, COLORS.metalDark).setDepth(101));
      }

      this.barras.push(celulas);
      this.objetos.push(...celulas);
    }

    // ─── Os slots ───
    //
    // CENTRADOS a partir da contagem. Com a posição cravada (`62 + i * 88`, do painel de 3), a 4ª
    // nave nasceria em x=326 — meia caixa para fora da tela.
    this.naves.forEach((id, i) => {
      const nave = SHIPS[id];
      const x = GAME_WIDTH / 2 + (i - (this.naves.length - 1) / 2) * SLOT.step;
      const tex = s.textures.exists(nave.texture) ? nave.texture : 'ship';

      const caixa = s.add
        .rectangle(x, SLOT.y, SLOT.w, SLOT.h, COLORS.bgDeep, 0.9)
        .setStrokeStyle(1, COLORS.metalMid)
        .setDepth(100);

      this.slots.push(caixa);
      this.objetos.push(caixa, s.add.image(x, SLOT.y, tex).setDepth(101));
    });

    this.rodape = pixelText(s, GAME_WIDTH / 2, 158, '', { size: 7, color: COLORS.metalLight })
      .setDepth(101);
    this.objetos.push(this.rodape);
  }

  private teclas(): void {
    const kb = this.scene.input.keyboard!;

    // Os slots estão lado a lado, então a mão procura ←→. As verticais valem também: brigar com o
    // jogador sobre QUAL seta é a certa é perder por nada.
    for (const k of ['LEFT', 'A', 'UP', 'W']) kb.on(`keydown-${k}`, () => this.mover(-1));
    for (const k of ['RIGHT', 'D', 'DOWN', 'S']) kb.on(`keydown-${k}`, () => this.mover(1));

    // Atalho direto: quem já sabe o que quer não deveria ter que navegar.
    const nums = ['ONE', 'TWO', 'THREE', 'FOUR'];
    this.naves.forEach((_, i) => {
      kb.on(`keydown-${nums[i]}`, () => {
        if (!this.vivo || this.confirmando) return;
        this.cursor = i;
        this.marcar();
      });
    });

    kb.on('keydown-ENTER', () => this.enter());
    kb.on('keydown-BACKSPACE', () => this.voltar());
    kb.on('keydown-ESC', () => this.onSair());
  }

  /** Move o cursor. Não circula: bater no fim da lista e voltar ao começo desorienta. */
  private mover(d: number): void {
    if (!this.vivo || this.confirmando) return;

    const antes = this.cursor;
    this.cursor = Phaser.Math.Clamp(this.cursor + d, 0, this.naves.length - 1);
    if (this.cursor !== antes) this.marcar();
  }

  /**
   * Repinta o painel para a nave selecionada.
   *
   * ⚠️ A ficha sai da `WeaponDef` — ela é a FONTE. Números escritos à mão aqui fariam a UI mentir
   * no dia em que alguém rebalanceasse uma arma.
   */
  private marcar(): void {
    const nave = SHIPS[this.naves[this.cursor]];
    const arma = WEAPONS[nave.weapon];

    this.slots.forEach((s, i) => {
      const sel = i === this.cursor;
      s.setStrokeStyle(sel ? 2 : 1, sel ? COLORS.hotBright : COLORS.metalMid);
    });

    this.nome.setText(nave.name);
    this.tag.setText(nave.tagline);

    if (this.scene.textures.exists(nave.texture)) this.preview.setTexture(nave.texture);

    // Barras de 5 casas: um número solto ("dano 3") não diz nada sem a escala. A barra é a
    // COMPARAÇÃO — e comparar é a única coisa que este painel existe para fazer.
    //
    // O ALCANCE do teleguiado é lido como TOTAL (5): ele não tem alcance curto, ele tem MIRA
    // ruim contra o que é rápido — e isso a ficha não tem como dizer em barra. Quem diz é a
    // tagline ("erra o que é rápido"), e é por isso que a tagline diz o TRADE-OFF, não o adjetivo.
    const valores = [arma.damage, arma.rate, arma.range === null ? 5 : 2];

    FICHA.forEach((f, i) => {
      const n = Phaser.Math.Clamp(Math.round((valores[i] / f.max) * 5), 1, 5);
      this.barras[i].forEach((c, j) => {
        c.setFillStyle(j < n ? COLORS.hotBright : COLORS.metalDark);
      });
    });

    this.rodape.setText(
      this.confirmando
        ? '[ENTER] confirmar  ·  [BACKSPACE] voltar  ·  [ESC] sair'
        : '[←→] escolher  ·  [ENTER] selecionar  ·  [ESC] sair',
    );
  }

  /** ENTER: primeiro SELECIONA, depois CONFIRMA. Dois passos — a escolha vale a campanha toda. */
  private enter(): void {
    if (!this.vivo) return;

    const nave = SHIPS[this.naves[this.cursor]];

    if (!this.confirmando) {
      this.confirmando = true;
      this.onAviso(`${nave.name} — CONFIRMAR?`, COLORS.hotBright);
      this.marcar();
      return;
    }

    this.vivo = false;
    this.onConfirmar(nave.id);
  }

  /** BACKSPACE: desfaz a confirmação e devolve a lista. */
  private voltar(): void {
    if (!this.vivo || !this.confirmando) return;

    this.confirmando = false;
    this.onAviso('SELECIONE SUA NAVE', COLORS.playerBright);
    this.marcar();
  }

  destroy(): void {
    this.vivo = false;
    for (const o of this.objetos) o.destroy();
  }
}
