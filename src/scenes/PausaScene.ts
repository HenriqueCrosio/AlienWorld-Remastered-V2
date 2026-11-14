import Phaser from 'phaser';
import { mudarPref, prefs } from '../aplicarPreferencias';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { EVENTO_TECLAS, PERFIS, mapaAtivo, rotuloDaTecla } from '../controles';
import { guardaDoNavegador, zerou } from '../menu/qualMenu';
import { devolverCena, type DadosPausa } from '../pausa/abrirPausa';
import {
  JANELA, LINHAS, LINHAS_DA_ABA, ROTULO, ROTULO_ABA, ROTULO_LINHA, abasDe, alturaPequena, inicial, passo,
  type Contexto, type Estado, type Linha, type Tecla,
} from '../pausa/numerosPausa';
import type { Preferencias } from '../preferencias';
import { Music } from '../systems/Music';
import { alternarTelaCheia, emTelaCheia, escFicaNoJogo } from '../telaCheia';
import { pixelText } from '../ui';
import { COR_JANELA, texturaJanela } from '../ui/janela';
import { irmaDe, type Voz } from '../uiHD';

/**
 * THE PAUSE AND THE SETTINGS (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md`).
 *
 * One window over the frozen game, in the frame of the end-of-campaign scoreboard: SMALL for the pause list and the
 * confirmations, BIG for the settings (his words: *"ao abrir configurações, talvez ela tenha que ser maior"*).
 *
 * This scene only DRAWS the state and carries out the effects: the navigation is `pausa/numerosPausa.ts#passo` (pure,
 * tested without a browser), the preferences are `preferencias.ts` through `aplicarPreferencias.ts`.
 *
 * It belongs to the world game; what it draws goes to its sister in the HD layer (crisp text, outside the Atmosfera),
 * brought to the TOP of that layer — the card table lives there and every sister is born below it.
 */
const COR = { titulo: COR_JANELA.osso, linha: 0xd0d0dc, sel: 0xb5f7ff, fraco: 0x9a958e, barra: COLORS.player, vazio: 0x2a3040 } as const;

/** The actions of the key map, in the order shown, with the name the game uses for each. */
const ACOES_DO_MAPA = [
  ['tiro', 'TIRO'], ['bomba', 'BOMBA'], ['dash', 'DASH'], ['flare', 'FLARE'], ['missil', 'MÍSSIL'],
] as const;

const movimentoReduzido = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

type Coisa = Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown; setDepth(d: number): unknown };

export class PausaScene extends Phaser.Scene {
  private dados!: DadosPausa;
  private ctx!: Contexto;
  private estado!: Estado;
  private destino!: Phaser.Scene;
  /** what the current screen drew (destroyed and redrawn at every change) */
  private pecas: Coisa[] = [];
  /** the size of the window on screen: when it changes, the new one grows from the old */
  private tamanho: { w: number; h: number } | null = null;
  /** the frame just changed size: the content of this screen fades in behind it */
  private cresceu: Phaser.GameObjects.Image | null = null;
  private fechou = false;
  private aoTelaCheia = (): void => this.desenhar();

  constructor() {
    super('Pausa');
  }

  create(dados: DadosPausa): void {
    this.dados = dados;
    this.ctx = { tipo: dados.opts.tipo, zerou: zerou(guardaDoNavegador()) };
    this.estado = inicial(this.ctx.tipo);
    this.pecas = [];
    this.tamanho = null;
    this.fechou = false;

    const irma = irmaDe(this);
    this.destino = irma ?? this;
    irma?.scene.bringToTop();

    // The veil over what is underneath (the HUD and the menu's own text too: they live in the HD layer, below this
    // sister). From the main menu it is lighter — the painting keeps moving behind — and the music is not ducked.
    const doMenu = this.ctx.tipo === 'menu';
    this.destino.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, doMenu ? JANELA.veuMenu : JANELA.veu).setOrigin(0).setDepth(0);
    if (!doMenu) Music.abafar(this, JANELA.abafo, 200);

    this.ligarTeclas();
    document.addEventListener('fullscreenchange', this.aoTelaCheia);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => document.removeEventListener('fullscreenchange', this.aoTelaCheia));
    this.desenhar();
  }

  /** For the probes: the state on screen. */
  diagnostico(): { estado: Estado; textos: string[] } {
    return { estado: this.estado, textos: this.pecas.map((p) => (p as unknown as { text?: string }).text).filter((t): t is string => !!t) };
  }

  // ─── the keys ───

  private ligarTeclas(): void {
    const kb = this.input.keyboard!;
    const vistos = new WeakSet<KeyboardEvent>();
    /** `repete`: the arrows accept the system's key repeat (holding ← walks the volume); OK and ESC only a new press */
    const tecla = (nomes: readonly string[], t: Tecla, repete: boolean): void => {
      for (const n of nomes) {
        kb.on(`keydown-${n}`, (ev: KeyboardEvent) => {
          // older than what opened the window: that key press was not for it (`pausa/abrirPausa.ts`)
          if (this.fechou || vistos.has(ev) || ev.timeStamp <= this.dados.carimbo || (ev.repeat && !repete)) return;
          vistos.add(ev);
          this.aplicar(t, ev.timeStamp);
        });
      }
    };
    tecla(['UP', 'W'], 'cima', true);
    tecla(['DOWN', 'S'], 'baixo', true);
    tecla(['LEFT', 'A'], 'esquerda', true);
    tecla(['RIGHT', 'D'], 'direita', true);
    tecla(['Q'], 'abaAnt', false);
    tecla(['E'], 'abaProx', false);
    tecla(['ESC'], 'esc', false);
    // the fire key of the profile confirms, as in every menu of the game (when it is not one of the keys above)
    const ocupadas = new Set(['UP', 'W', 'DOWN', 'S', 'LEFT', 'A', 'RIGHT', 'D', 'Q', 'E', 'ESC', 'ENTER']);
    tecla(['ENTER', ...mapaAtivo().tiro.filter((n) => !ocupadas.has(n))], 'ok', false);
  }

  private aplicar(t: Tecla, carimbo: number): void {
    const { estado, efeito } = passo(this.estado, t, this.ctx);
    this.estado = estado;
    if (efeito.tipo === 'fechar') {
      this.fechar(carimbo);
      return;
    }
    if (efeito.tipo === 'acao') {
      const { opts } = this.dados;
      const fazer = efeito.acao === 'reiniciar' ? opts.reiniciar : efeito.acao === 'pular' ? opts.pular : opts.sair;
      this.fechar(carimbo);
      fazer?.();
      return;
    }
    if (efeito.tipo === 'mudar') this.mudar(efeito.linha, efeito.d);
    this.desenhar();
  }

  private mudar(linha: Linha, d: -1 | 1): void {
    if (linha === 'telaCheia') {
      // A state of the browser, not a recorded preference (it only grants fullscreen on a gesture). The redraw comes
      // with `fullscreenchange`.
      alternarTelaCheia();
      return;
    }
    mudarPref(linha, d);
    // every live `InputReader` re-reads the map (the scene underneath is paused, not restarted)
    if (linha === 'teclas') this.game.events.emit(EVENTO_TECLAS);
  }

  private fechar(carimbo: number): void {
    if (this.fechou) return;
    this.fechou = true;
    if (this.ctx.tipo !== 'menu') Music.abafar(this, 1, 0);
    this.scene.stop();
    devolverCena(this.dados, carimbo);
  }

  // ─── the drawing ───

  private limpar(): void {
    // only the tweens of what is leaving (the music duck is a tween of this scene too)
    this.tweens.killTweensOf(this.pecas);
    for (const p of this.pecas) p.destroy();
    this.pecas = [];
  }

  private txt(x: number, y: number, s: string, cor: number, size = 8, voz: Voz = 'jogo', lado: 'e' | 'c' | 'd' = 'c'): Phaser.GameObjects.Text {
    const o = pixelText(this, x, y, s, { size, color: cor, voz, align: lado === 'c' ? 'center' : 'left' }).setDepth(3);
    if (lado === 'd') o.setOrigin(1, 0.5);
    this.pecas.push(o as unknown as Coisa);
    return o;
  }

  private caixa(x: number, y: number, w: number, h: number, cor: number, alfa = 1): void {
    this.pecas.push(this.destino.add.rectangle(x, y, w, h, cor, alfa).setOrigin(0).setDepth(2) as unknown as Coisa);
  }

  /** The frame, centred on (cx, cy). When the size changed since the last screen, it grows (or shrinks) from the old one. */
  private janela(cx: number, cy: number, w: number, h: number, fundo = 0.94): void {
    const img = this.destino.add.image(cx, cy, texturaJanela(this.destino, `pausa-janela-${w}x${h}-${fundo}`, w, h, undefined, fundo)).setDepth(1);
    this.pecas.push(img as unknown as Coisa);
    const antes = this.tamanho;
    this.tamanho = { w, h };
    if (!antes || (antes.w === w && antes.h === h) || movimentoReduzido()) return;
    img.setScale(antes.w / w, antes.h / h);
    this.tweens.add({ targets: img, scaleX: 1, scaleY: 1, duration: JANELA.cresce, ease: 'Quad.easeOut' });
    this.cresceu = img;
  }

  private desenhar(): void {
    if (this.fechou) return;
    this.limpar();
    this.cresceu = null;
    const e = this.estado;
    if (e.tela === 'lista') this.desenharLista(e.cursor);
    else if (e.tela === 'confirma') this.desenharConfirma(e.acao, e.sim);
    else this.desenharConfig(e.aba, e.linha);
    // the frame is growing (or shrinking): the content comes in when it has (almost) arrived
    if (this.cresceu) {
      const conteudo = this.pecas.filter((p) => p !== (this.cresceu as unknown as Coisa));
      for (const p of conteudo) p.setAlpha(0);
      this.tweens.add({ targets: conteudo, alpha: 1, duration: 90, delay: JANELA.cresce * 0.6 });
    }
  }

  private desenharLista(cursor: number): void {
    if (this.ctx.tipo === 'menu') return;
    const linhas = LINHAS[this.ctx.tipo];
    const P = JANELA.pequena;
    const h = alturaPequena(linhas.length);
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const y0 = Math.round(cy - h / 2);
    this.janela(cx, cy, P.w, h);
    this.txt(cx, y0 + 11, 'PAUSA', COR.titulo, 7);
    linhas.forEach((a, i) => {
      const y = y0 + 27 + i * P.hLinha;
      if (i === cursor) this.caixa(cx - P.w / 2 + 7, y - 6, P.w - 14, 11, COR.barra, 0.3);
      this.txt(cx, y, ROTULO[a], i === cursor ? COR.sel : COR.linha);
    });
  }

  private desenharConfirma(acao: 'reiniciar' | 'sair', sim: boolean): void {
    const C = JANELA.confirma;
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const y0 = Math.round(cy - C.h / 2);
    this.janela(cx, cy, C.w, C.h);
    this.txt(cx, y0 + 13, 'TEM CERTEZA?', COR.titulo);
    this.txt(cx, y0 + 26, acao === 'reiniciar' ? 'a fase recomeça do início' : 'a partida em curso se perde', COR.fraco, 6, 'piloto');
    const opcao = (x: number, s: string, sel: boolean): void => {
      if (sel) this.caixa(x - 18, y0 + 36, 36, 11, COR.barra, 0.3);
      this.txt(x, y0 + 42, s, sel ? COR.sel : COR.linha);
    };
    opcao(cx - 26, 'NÃO', !sim);
    opcao(cx + 26, 'SIM', sim);
  }

  private desenharConfig(abaI: number, linhaI: number): void {
    const G = JANELA.grande;
    const p = prefs();
    const abas = abasDe(this.ctx.zerou);
    const aba = abas[Math.min(abaI, abas.length - 1)];
    // opaque: the big window holds lines of text, and the neon title of the menu showed through it as a ghost
    this.janela(G.x + G.w / 2, G.y + G.h / 2, G.w, G.h, 1);

    // the tab strip
    const passoAba = (G.w - 40) / abas.length;
    abas.forEach((a, i) => {
      const x = Math.round(G.x + 20 + passoAba * (i + 0.5));
      const ativa = a === aba;
      if (ativa && linhaI === -1) this.caixa(x - passoAba / 2 + 4, G.y + 8, passoAba - 8, 11, COR.barra, 0.3);
      this.txt(x, G.y + 14, ROTULO_ABA[a], ativa ? COR.sel : COR.fraco);
      if (ativa) this.caixa(x - 22, G.y + 22, 44, 1, COR.sel, 0.9);
    });
    this.caixa(G.x + 10, G.y + 24, G.w - 20, 1, COR_JANELA.osso, 0.25);

    // the lines of the tab
    const xRot = G.x + 20, xVal = G.x + G.w - 20;
    LINHAS_DA_ABA[aba].forEach((l, i) => {
      const y = G.y + 42 + i * 16;
      const sel = i === linhaI;
      if (sel) this.caixa(G.x + 10, y - 7, G.w - 20, 13, COR.barra, 0.3);
      this.txt(xRot, y, ROTULO_LINHA[l], sel ? COR.sel : COR.linha, 8, 'jogo', 'e');
      if (l === 'volume.geral' || l === 'volume.musica' || l === 'volume.efeitos') this.volume(xVal, y, valorDoVolume(p, l), sel);
      else this.txt(xVal, y, sel ? `<  ${this.valor(l, p)}  >` : this.valor(l, p), sel ? COR.sel : COR.linha, 8, 'jogo', 'd');
    });

    if (aba === 'audio') this.txt(xRot, G.y + 42 + 3 * 16 + 4, 'os efeitos sonoros chegam numa versão futura', COR.fraco, 6, 'piloto', 'e');
    if (aba === 'controles') this.mapaDeTeclas(G.y + 66, p);
    // where the browser cannot hand the ESC to the game (Firefox, Safari), say so instead of looking broken
    if (aba === 'video' && !escFicaNoJogo()) this.txt(xRot, G.y + 42 + 2 * 16 + 4, 'neste navegador, o ESC sai da tela cheia antes de chegar ao jogo', COR.fraco, 6, 'piloto', 'e');
    if (aba === 'jogo') this.txt(xRot, G.y + 42 + 16 + 4, 'a tela de abertura: a colônia à noite ou ao amanhecer', COR.fraco, 6, 'piloto', 'e');

    // ASCII only: the fonts do not have ← →
    this.txt(G.x + G.w / 2, G.y + G.h - 11, '[<  >] MUDAR     [Q  E] ABA     [ESC] VOLTAR', COR.fraco, 6, 'piloto');
  }

  private valor(l: Linha, p: Preferencias): string {
    if (l === 'teclas') return p.teclas === 'padrao' ? 'PADRÃO' : 'CLÁSSICO';
    if (l === 'telaCheia') return emTelaCheia() ? 'LIGADA' : 'DESLIGADA';
    if (l === 'reduzirClaroes') return p.reduzirClaroes ? 'LIGADO' : 'DESLIGADO';
    return p.menu === 'noite' ? 'NOITE' : 'AMANHECER';
  }

  /** Ten blocks, filled up to the value, and the number. */
  private volume(xDir: number, y: number, v: number, sel: boolean): void {
    this.txt(xDir, y, String(v), sel ? COR.sel : COR.linha, 8, 'nave', 'd');
    const x0 = xDir - 18 - 10 * 7;
    for (let i = 0; i < 10; i++) this.caixa(x0 + i * 7, y - 3, 5, 6, i < v ? (sel ? COR.sel : COR.barra) : COR.vazio);
  }

  /** The key map of the chosen profile, in two columns, for reading (remapping key by key is block M2). */
  private mapaDeTeclas(y0: number, p: Preferencias): void {
    const G = JANELA.grande;
    const mapa = PERFIS[p.teclas];
    const linhas: [string, string][] = [
      ['MOVER', 'W A S D  ou  SETAS'],
      ...ACOES_DO_MAPA.map(([a, nome]): [string, string] => [nome, mapa[a].map(rotuloDaTecla).join(' / ')]),
      ['PAUSA', 'ESC'],
    ];
    const meio = Math.ceil(linhas.length / 2);
    linhas.forEach(([nome, tecla], i) => {
      const col = i < meio ? 0 : 1;
      const x = G.x + 20 + col * ((G.w - 40) / 2 + 6);
      const y = y0 + (i - col * meio) * 14;
      this.txt(x, y, nome, COR.fraco, 7, 'jogo', 'e');
      this.txt(x + 46, y, tecla, COR.linha, 8, 'nave', 'e');
    });
  }
}

function valorDoVolume(p: Preferencias, l: 'volume.geral' | 'volume.musica' | 'volume.efeitos'): number {
  return l === 'volume.geral' ? p.volume.geral : l === 'volume.musica' ? p.volume.musica : p.volume.efeitos;
}
