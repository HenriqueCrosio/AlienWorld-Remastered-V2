import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { cenaDeFundoHD, escalaHD, EVENTO_ESCALA, irmaDe, jogoHD, removerCenaHD } from '../uiHD';
import { Music } from '../systems/Music';
import { Atmosfera } from '../systems/atmosfera/Atmosfera';
import { PERFIS } from '../systems/atmosfera/perfis';
import type { HandlingMode } from './GameScene';
import { ABERTURA, CONDUCOES, CORES_TEXTO, ITEM, JATOS, NOMES_ITENS, SUBTITULO } from '../menu/numerosMenu';
import { T_FIM, T_LISTA_POUSA, alfaItem, particulasDosJatos, posicaoLetreiro, quedaLista, subAcesa } from '../menu/abertura';
import { Cenario, carregarCamadasMenu, type EstadoMenu } from '../menu/cenario';
import { CHAVE_MENU_HD, MenuCenaHD } from '../menu/MenuCenaHD';
import { criarTitulo, tingirLetras, type TituloMenu } from '../menu/titulo';
import { Jatos } from '../menu/jatos';
import { lerConducao, salvarConducao } from '../menu/conducao';

const movimentoReduzido = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A TELA-TÍTULO — A COLÔNIA DE KEPLER À NOITE (bloco E, spec `docs/superpowers/specs/2026-10-19-menu-refeito-design.md`).
 *
 * O cenário — a pintura dele na resolução dela, viva, com perigo no ar, sob a Atmosfera `menu` — mora numa cena da
 * camada HD (`MenuCenaHD`), atrás do texto; sem a camada, ele roda aqui mesmo, na resolução do jogo (§8.3). Esta cena
 * fica com o relógio da ABERTURA (§6): alguns segundos só de cenário; o letreiro de neon entra pelo alto freando nos
 * retrofoguetes e firma; a lista desce em formação; o neon acende letra por letra; por último, os olhos do W. Tudo é
 * função do relógio (`src/menu/abertura.ts`): a sonda o para em qualquer instante (`irPara`).
 *
 * Qualquer tecla antes de a lista pousar pula para o menu pousado; 1/2/3 começam direto; o movimento reduzido abre pousado.
 */
export class MenuScene extends Phaser.Scene {
  /** Público: a sonda lê. A lista pousou (ou a abertura foi pulada): o menu aceita teclas. */
  settled = false;
  /** Público: a sonda lê o cursor. */
  cursorMenu: number = ITEM.comecar;
  /** A condução da linha do menu, lembrada entre sessões. Pública: a sonda lê. */
  conducao: HandlingMode = 'diegetico';
  /** O relógio da abertura e o que o cenário lê (o véu, a janela quieta da tempestade). Público: a sonda lê. */
  readonly estado: EstadoMenu = { tAbertura: 0, pulou: false, reduzido: false, pronto: false, congelado: false };
  /** Sem a camada HD, o cenário mora aqui. Público: a sonda lê. */
  cenario: Cenario | null = null;
  /** Público: a sonda conta as partículas. */
  jatos: Jatos | null = null;
  private atm: Atmosfera | null = null;
  private tCena = 0;
  private tCursor = 0;
  private direto = false;
  /** O texto mora na camada HD (a irmã)? Então as posições caem no pixel da tela (1/s). */
  private naCamada = false;
  private itens: Phaser.GameObjects.Text[] = [];
  private coresItens: number[] = [];
  private sub: Phaser.GameObjects.Text | null = null;
  private desc: Phaser.GameObjects.Text | null = null;
  private titulo: TituloMenu | null = null;
  private readonly aoEscala = (s: number): void => this.titulo?.trocarEscala(s);

  constructor() {
    super('Menu');
  }

  init(data: { cursor?: number; direto?: boolean } = {}): void {
    this.cursorMenu = data.cursor ?? ITEM.comecar;
    this.direto = data.direto === true;
  }

  create(): void {
    // Cada partida nova sorteia as variantes de arte de novo (como o menu antigo fazia).
    resetVariantCache();
    this.settled = false;
    Object.assign(this.estado, { tAbertura: 0, pulou: false, pronto: false, congelado: false, reduzido: movimentoReduzido() });
    this.cenario = null;
    this.atm = null;
    this.jatos = null;
    this.titulo = null;
    this.tCena = 0;
    this.tCursor = 0;
    this.itens = [];
    this.coresItens = [];
    this.conducao = lerConducao();
    this.cameras.main.setBackgroundColor('#000000');

    this.montarCenario();
    this.montarTexto();
    // A faixa atravessa a transição de cena sem corte (Music.play não reinicia se já toca).
    Music.play(this, 'stage1');
    this.bindKeys();
    if (this.direto || this.estado.reduzido) this.pular();

    const hd = jogoHD();
    hd?.events.on(EVENTO_ESCALA, this.aoEscala);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      hd?.events.off(EVENTO_ESCALA, this.aoEscala);
      removerCenaHD(CHAVE_MENU_HD);
      this.titulo?.destruir();
      this.jatos?.destruir();
    });
  }

  // ─── O cenário e o texto ────────────────────────────────────────────────────

  private montarCenario(): void {
    if (cenaDeFundoHD(CHAVE_MENU_HD, MenuCenaHD, { estado: this.estado })) return;
    // Sem a camada HD: o cenário na resolução do jogo, aqui mesmo (§8.3).
    carregarCamadasMenu(this.load, 'menuK1', 'sprites/menu/k1');
    this.load.once(Phaser.Loader.Events.COMPLETE, () => {
      if (!this.sys.isActive()) return;
      this.cenario = Cenario.criar(this, 1, 'menuK1', this.estado, 18);
      if (this.cenario) {
        // O texto, o título e os jatos ficam em 19+: fora do tratamento.
        this.atm = new Atmosfera(this, { limiteLimpo: 19, profundidadePoeira: 1.5 });
        this.atm.perfil(PERFIS.menu);
      }
      this.estado.pronto = true;
    });
    this.load.start();
  }

  private montarTexto(): void {
    const L = ABERTURA.layout;
    this.sub = this.t(L.x, -40, SUBTITULO, 8, CORES_TEXTO.subApagado).setAlpha(0);
    // O ARQUIVO desenha os ícones na camada HD: sem ela, a lista é só COMEÇAR e a condução.
    const n = jogoHD() ? NOMES_ITENS.length : NOMES_ITENS.length - 1;
    this.cursorMenu = Math.min(this.cursorMenu, n - 1);
    for (let i = 0; i < n; i++) {
      this.itens.push(this.t(L.x, L.lista[i] - 40, NOMES_ITENS[i], 8, CORES_TEXTO.item).setAlpha(0));
      this.coresItens.push(CORES_TEXTO.item);
    }
    this.desc = this.t(L.x, L.desc, ' ', 7, CONDUCOES[0].cor).setAlpha(0);
    if (import.meta.env.DEV) {
      this.t(GAME_WIDTH / 2, 8, '[B] chefão 1  [C] capitânia  [N] serpente  [V] f2  [M] f3', 7, CORES_TEXTO.dev);
      this.t(GAME_WIDTH / 2, 16, '[I][O][P][F] cutscenes  [L] f4  [K] núcleo', 7, CORES_TEXTO.dev);
    }
    const irma = irmaDe(this);
    this.naCamada = irma !== null;
    this.titulo = criarTitulo(this, irma, escalaHD());
    this.jatos = new Jatos(irma ?? this, 19, JATOS.max);
  }

  // ─── A abertura ─────────────────────────────────────────────────────────────

  /** Vai direto ao menu pousado (uma tecla, a volta do Arquivo, o movimento reduzido). O relógio segue (o repouso). */
  private pular(): void {
    if (this.estado.pulou) return;
    this.estado.pulou = true;
    if (this.estado.tAbertura < T_FIM) this.estado.tAbertura = T_FIM;
    if (!this.settled) {
      this.settled = true;
      this.tCursor = this.estado.tAbertura;
    }
  }

  /** Para a sonda: o relógio da abertura parado no instante `t` (s), já desenhado. */
  irPara(t: number): void {
    this.estado.congelado = true;
    this.estado.pulou = false;
    this.estado.tAbertura = t;
    this.settled = t >= T_LISTA_POUSA;
    this.desenhar(t);
  }

  /** Para a sonda: onde está cada coisa agora. */
  diagnostico(): {
    titulo: { x: number; y: number; acesas: number; olhos: boolean } | null;
    sub: { y: number; alfa: number } | null;
    jatos: number;
    lista: { texto: string; y: number; alfa: number }[];
    desc: { texto: string; alfa: number } | null;
  } {
    return {
      titulo: this.titulo?.estado() ?? null,
      sub: this.sub ? { y: this.sub.y, alfa: this.sub.alpha } : null,
      jatos: this.jatos?.quantos ?? 0,
      lista: this.itens.map((o) => ({ texto: o.text, y: o.y, alfa: +o.alpha.toFixed(3) })),
      desc: this.desc ? { texto: this.desc.text, alfa: this.desc.alpha } : null,
    };
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    if (this.cenario) {
      this.tCena += dt;
      this.atm?.update(dt);
      this.cenario.atualizar(this.tCena);
    }
    if (!this.estado.pronto) return;
    if (!this.estado.congelado) this.estado.tAbertura += dt;
    const t = this.estado.tAbertura;
    if (!this.settled && t >= T_LISTA_POUSA) {
      this.settled = true;
      this.tCursor = t;
    }
    this.desenhar(t);
  }

  private desenhar(t: number): void {
    const s = this.naCamada ? escalaHD() : 1;
    const q = (v: number): number => Math.round(v * s) / s;
    const L = ABERTURA.layout;
    const p = posicaoLetreiro(t - ABERTURA.letreiro.t0);
    const cx = q(p.x);
    const cy = q(p.y);
    this.titulo?.atualizar(t, cx, cy);
    if (this.sub) {
      this.sub.setPosition(cx, q(p.y + L.sub - L.titulo)).setAlpha(1);
      tingirLetras(this.sub, (i) => (subAcesa(i, t) ? CORES_TEXTO.subAceso : CORES_TEXTO.subApagado));
    }
    this.jatos?.desenhar(this.estado.pulou ? [] : particulasDosJatos(t), s);
    this.desenharLista(t, q);
  }

  private desenharLista(t: number, q: (v: number) => number): void {
    const L = ABERTURA.layout;
    const c = CONDUCOES.find((x) => x.id === this.conducao) ?? CONDUCOES[0];
    this.itens.forEach((o, i) => {
      const nome = i === ITEM.conducao ? `CONDUÇÃO: ${c.nome}` : NOMES_ITENS[i];
      const sel = i === this.cursorMenu;
      const txt = sel ? `> ${nome} <` : nome;
      if (o.text !== txt) o.setText(txt);
      const cor = sel ? CORES_TEXTO.selecionado : CORES_TEXTO.item;
      if (this.coresItens[i] !== cor) {
        o.setColor(Phaser.Display.Color.IntegerToColor(cor).rgba);
        this.coresItens[i] = cor;
      }
      const { dy, alfa } = quedaLista(i, t);
      o.setPosition(L.x, q(L.lista[i] + dy));
      o.setAlpha(alfa * alfaItem(sel, t, this.tCursor, this.settled));
    });
    if (this.desc) {
      const mostra = this.settled && this.cursorMenu === ITEM.conducao;
      if (mostra && this.desc.text !== c.desc) {
        this.desc.setText(c.desc);
        this.desc.setColor(Phaser.Display.Color.IntegerToColor(c.cor).rgba);
      }
      this.desc.setAlpha(mostra ? 1 : 0);
    }
  }

  // ─── Teclas ─────────────────────────────────────────────────────────────────

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    // Antes de a lista pousar, qualquer tecla só PULA a abertura. O Phaser emite `keydown-X` ANTES de `keydown`:
    // os handlers da lista se guardam com `settled` (e não agem), e este pula. Os atalhos 1/2/3 e os de dev começam
    // direto, como sempre (as sondas contam com isso).
    kb.on('keydown', () => {
      if (!this.settled) this.pular();
    });
    // ⚠️ UM EVENTO, UMA VEZ (a lição da mesa, 03/10): o Phaser reprocessa a fila de teclas a cada evento novo, e o ↓
    // andava duas casas.
    const vistos = new WeakSet<KeyboardEvent>();
    const umaVez = (f: () => void) => (ev: KeyboardEvent): void => {
      if (vistos.has(ev)) return;
      vistos.add(ev);
      f();
    };
    for (const k of ['UP', 'W']) kb.on(`keydown-${k}`, umaVez(() => this.mover(-1)));
    for (const k of ['DOWN', 'S']) kb.on(`keydown-${k}`, umaVez(() => this.mover(1)));
    for (const k of ['LEFT', 'A']) kb.on(`keydown-${k}`, umaVez(() => this.trocar(-1)));
    for (const k of ['RIGHT', 'D']) kb.on(`keydown-${k}`, umaVez(() => this.trocar(1)));
    for (const k of ['ENTER', 'SPACE']) kb.on(`keydown-${k}`, umaVez(() => this.confirmar()));
    kb.on('keydown-ONE', () => this.start('diegetico'));
    kb.on('keydown-TWO', () => this.start('flap'));
    kb.on('keydown-THREE', () => this.start('free'));

    if (import.meta.env.DEV) {
      kb.on('keydown-B', () => this.scene.start('Game', { handling: 'diegetico', practice: true }));
      // O SANDBOX de dev (`src/sandbox/`): monte a build, os inimigos e o fundo, e jogue.
      kb.on('keydown-X', () => this.game.events.emit('sandbox:montagem'));
      kb.on('keydown-V', () => this.scene.start('Game', { stage: 2, handling: 'diegetico' }));
      kb.on('keydown-C', () => this.scene.start('Game', { stage: 2, handling: 'diegetico', practice: true }));
      kb.on('keydown-M', () => this.scene.start('Game', { stage: 3, handling: 'diegetico' }));
      kb.on('keydown-N', () => this.scene.start('Game', { stage: 3, handling: 'diegetico', practice: true }));
      kb.on('keydown-I', () => this.scene.start('Interlude', { score: 4820, handling: 'diegetico' }));
      kb.on('keydown-O', () => this.scene.start('Interlude2', { score: 9140, handling: 'diegetico', ship: 'humana', stage: 3 }));
      kb.on('keydown-L', () => this.scene.start('Game', { stage: 4, handling: 'diegetico', ship: 'humana' }));
      kb.on('keydown-K', () => this.scene.start('Game', { stage: 4, handling: 'diegetico', practice: true }));
      kb.on('keydown-P', () => this.scene.start('Interlude3', { score: 15200, handling: 'diegetico', ship: 'humana', stage: 4 }));
      kb.on('keydown-F', () =>
        this.scene.start('Interlude4', {
          score: 21000, handling: 'diegetico', ship: 'humana', stage: null, stageDone: 4, practice: false, baseScore: 15200,
        }),
      );
    }
  }

  private mover(d: number): void {
    if (!this.settled || this.itens.length < 2) return;
    this.cursorMenu = Phaser.Math.Wrap(this.cursorMenu + d, 0, this.itens.length);
    this.tCursor = this.estado.tAbertura;
  }

  /** ←→ (e Enter) na linha da condução trocam o valor, e ele fica lembrado. */
  private trocar(d: number): void {
    if (!this.settled || this.cursorMenu !== ITEM.conducao) return;
    const i = CONDUCOES.findIndex((c) => c.id === this.conducao);
    this.conducao = CONDUCOES[Phaser.Math.Wrap(i + d, 0, CONDUCOES.length)].id;
    salvarConducao(this.conducao);
  }

  private confirmar(): void {
    if (!this.settled) return;
    if (this.cursorMenu === ITEM.comecar) this.start(this.conducao);
    else if (this.cursorMenu === ITEM.conducao) this.trocar(1);
    else if (this.cursorMenu === ITEM.arquivo) this.scene.start('Arquivo');
  }

  private start(handling: HandlingMode): void {
    this.scene.start('Game', { handling });
  }

  private t(x: number, y: number, value: string, size: number, color: number): Phaser.GameObjects.Text {
    return pixelText(this, x, y, value, { size, color }).setDepth(20);
  }
}
