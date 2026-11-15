import Phaser from 'phaser';
import { mapaDoControle, mapaDoTeclado, mudarPref, prefs, remapearPref, restaurarPref } from '../aplicarPreferencias';
import { COLORS, GAME_HEIGHT, GAME_WIDTH } from '../config';
import { EVENTO_TECLAS, mapaAtivo } from '../controles';
import {
  aoConectar, aoMudarAparelho, aoQuadro, aparelhoAtivo, botoesQueDesceram, controleConectado, desceuBotao, familiaDoControle,
  pararVibracao, quadroDoControle, vibracaoDisponivel, vibrarTeste,
} from '../entrada/controle';
import { montarIndicadores } from '../entrada/indicadores';
import { ACOES_REMAP, BOTAO, NOME_DA_ACAO, botaoPermitido, rotuloDaTecla, rotuloDoBotao, teclaPermitida, type AcaoRemap } from '../entrada/mapas';
import { escalaDoIcone, ladoDoIcone, quadroDoBotao, texturaDosBotoes } from '../entrada/icones';
import { controleNoMenu } from '../entrada/menu';
import { guardaDoNavegador, zerou } from '../menu/qualMenu';
import { devolverCena, type DadosPausa } from '../pausa/abrirPausa';
import {
  DERROTA, JANELA, LINHAS, LINHAS_DA_ABA, ROTULO, ROTULO_ABA, abasDe, acaoDaLinha, alturaPequena, fimDaCaptura, inicial, layoutDerrota, passo,
  rotuloDaAcao, rotuloDaLinha,
  type Contexto, type Estado, type Linha, type Tecla,
} from '../pausa/numerosPausa';
import { texturaMedalha } from '../menu/painelResultado';
import type { Campo, Preferencias } from '../preferencias';
import { Music } from '../systems/Music';
import { alternarTelaCheia, emTelaCheia, escFicaNoJogo } from '../telaCheia';
import { pixelText } from '../ui';
import { COR_JANELA, texturaJanela } from '../ui/janela';
import { irmaDe, type Voz } from '../uiHD';

/**
 * THE PAUSE AND THE SETTINGS (14/11, block M1 — spec `2026-11-14-bloco-m1-pausa-configuracoes-design.md`; the
 * CONTROLS tab and the controller of block M2 — spec `2026-11-14-bloco-m2-controles-design.md`).
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
const COR = {
  titulo: COR_JANELA.osso, linha: 0xd0d0dc, sel: 0xb5f7ff, fraco: 0x9a958e, apagado: 0x5a6070, barra: COLORS.player, vazio: 0x2a3040,
  aviso: COLORS.hotBright,
} as const;

const movimentoReduzido = (): boolean =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** The Phaser name of a key code (`'SPACE'`, `'K'`), or `null` for a key Phaser has no name for. */
const NOME_POR_CODIGO = new Map<number, string>();
function nomeDaTecla(codigo: number): string | null {
  if (NOME_POR_CODIGO.size === 0) {
    for (const [nome, c] of Object.entries(Phaser.Input.Keyboard.KeyCodes)) if (!NOME_POR_CODIGO.has(c)) NOME_POR_CODIGO.set(c, nome);
  }
  return NOME_POR_CODIGO.get(codigo) ?? null;
}

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
  /** the first screen of the SHIP LOST window fades in (once) */
  private entrando = false;
  /** the controller frame in which the capture opened: the press that opened it is not the new button */
  private quadroDaCaptura = -1;
  /** the capture refused a key ("that one is the game's") */
  private recusa = '';
  private aoTelaCheia = (): void => this.desenhar();

  constructor() {
    super('Pausa');
  }

  create(dados: DadosPausa): void {
    this.dados = dados;
    this.ctx = { tipo: dados.opts.tipo, zerou: zerou(guardaDoNavegador()), temControle: controleConectado() };
    this.estado = inicial(this.ctx.tipo);
    this.pecas = [];
    this.tamanho = null;
    this.fechou = false;
    this.recusa = '';

    const irma = irmaDe(this);
    this.destino = irma ?? this;
    irma?.scene.bringToTop();

    // The veil over what is underneath (the HUD and the menu's own text too: they live in the HD layer, below this
    // sister). From the main menu it is lighter — the painting keeps moving behind — and the music is not ducked.
    const doMenu = this.ctx.tipo === 'menu';
    const veu = this.destino.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, COLORS.bgDeep, doMenu ? JANELA.veuMenu : JANELA.veu).setOrigin(0).setDepth(0);
    // THE SHIP LOST window (block M3) comes in softly over the last frame of the stage: nobody asked for it
    this.entrando = this.ctx.tipo === 'derrota' && !movimentoReduzido();
    if (this.entrando) {
      veu.setAlpha(0);
      this.tweens.add({ targets: veu, alpha: JANELA.veu, duration: DERROTA.entra });
    }
    if (!doMenu) Music.abafar(this, JANELA.abafo, 200);
    pararVibracao();

    // the three device symbols in the top left corner (lit = connected)
    montarIndicadores(this, 5, 4, 4);

    this.ligarTeclas();
    this.ligarControle();
    document.addEventListener('fullscreenchange', this.aoTelaCheia);
    // the hints follow the device in use, and the controller column follows the controller coming and going
    const soltas = [aoMudarAparelho(() => this.desenhar()), aoConectar(() => this.desenhar())];
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('fullscreenchange', this.aoTelaCheia);
      for (const s of soltas) s();
    });
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
          // waiting for a new key: every key but ESC belongs to the capture (the generic handler below)
          if (this.estado.tela === 'captura' && t !== 'esc') return;
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

    // THE CAPTURE of a new key (Phaser emits `keydown-X` before `keydown`: the key that OPENED the capture is already
    // in `vistos` when it gets here).
    kb.on('keydown', (ev: KeyboardEvent) => {
      const e = this.estado;
      if (this.fechou || e.tela !== 'captura' || vistos.has(ev) || ev.repeat || ev.timeStamp <= this.dados.carimbo) return;
      vistos.add(ev);
      if (e.coluna !== 0) return; // waiting for a BUTTON
      const nome = nomeDaTecla(ev.keyCode);
      const acao = acaoDaLinha(this.linhaDe(e.aba, e.linha));
      if (!acao) return;
      const troca = nome ? this.avisoDaTroca('teclado', acao, nome) : '';
      if (!nome || !teclaPermitida(nome) || !remapearPref('teclado', acao, nome)) {
        this.recusa = 'essa tecla é do jogo: escolha outra';
        this.desenhar();
        return;
      }
      // every live `InputReader` re-reads the map (the scene underneath is paused, not restarted)
      this.game.events.emit(EVENTO_TECLAS);
      this.recusa = troca;
      this.estado = fimDaCaptura(e);
      this.desenhar();
    });
  }

  private ligarControle(): void {
    const agora = (): number => performance.now();
    // (the stamp is in the future while the SHIP LOST window holds its first moments: `abrirPausa`'s `guarda`)
    const livre = (): boolean => !this.fechou && this.estado.tela !== 'captura' && agora() > this.dados.carimbo;
    controleNoMenu(this, {
      cima: () => this.aplicar('cima', agora()),
      baixo: () => this.aplicar('baixo', agora()),
      esquerda: () => this.aplicar('esquerda', agora()),
      direita: () => this.aplicar('direita', agora()),
      ok: () => this.aplicar('ok', agora()),
      voltar: () => this.aplicar('esc', agora()),
      abaAnt: () => this.aplicar('abaAnt', agora()),
      abaProx: () => this.aplicar('abaProx', agora()),
      start: () => this.aplicar('esc', agora()),
    }, livre);

    // THE CAPTURE of a new button: the first one that goes down after the frame the capture opened in.
    const soltar = aoQuadro(() => {
      const e = this.estado;
      if (this.fechou || e.tela !== 'captura' || quadroDoControle() === this.quadroDaCaptura) return;
      if (desceuBotao(BOTAO.START)) {
        this.recusa = '';
        this.estado = fimDaCaptura(e);
        this.desenhar();
        return;
      }
      const b = botoesQueDesceram()[0];
      if (e.coluna !== 1 || b === undefined) return; // waiting for a KEY, or nothing went down
      const acao = acaoDaLinha(this.linhaDe(e.aba, e.linha));
      if (!acao) return;
      const troca = this.avisoDaTroca('controle', acao, b);
      if (!botaoPermitido(b) || !remapearPref('controle', acao, b)) {
        this.recusa = 'esse botão é do jogo: escolha outro';
        this.desenhar();
        return;
      }
      this.recusa = troca;
      this.estado = fimDaCaptura(e);
      this.desenhar();
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, soltar);
  }

  /**
   * THE SWAP IS ANNOUNCED (14/11, his feedback: *"um aviso que diz que a tecla está sendo usada para outra coisa e vai
   * ser reescrita"*): the key that already had an action changes hands, and the screen says which two swapped.
   */
  private avisoDaTroca(aparelho: 'teclado' | 'controle', acao: AcaoRemap, nova: string | number): string {
    const mapa: Record<AcaoRemap, string | number> = aparelho === 'teclado' ? mapaDoTeclado() : mapaDoControle();
    const dona = ACOES_REMAP.find((a) => a !== acao && mapa[a] === nova);
    if (!dona) return '';
    const nome = aparelho === 'teclado' ? rotuloDaTecla(String(nova)) : rotuloDoBotao(Number(nova), familiaDoControle());
    return `${nome} era do ${NOME_DA_ACAO[dona]}: ${NOME_DA_ACAO[acao]} e ${NOME_DA_ACAO[dona]} trocaram de ${aparelho === 'teclado' ? 'tecla' : 'botão'}`;
  }

  private linhaDe(abaI: number, linhaI: number): Linha {
    const abas = abasDe(this.ctx.zerou);
    const linhas = LINHAS_DA_ABA[abas[Math.min(abaI, abas.length - 1)]];
    return linhas[Math.max(0, Math.min(linhaI, linhas.length - 1))];
  }

  private aplicar(t: Tecla, carimbo: number): void {
    this.ctx.temControle = controleConectado();
    const antes = this.estado.tela;
    // the note of the last capture (a refusal, a swap) leaves with the next key
    this.recusa = '';
    const { estado, efeito } = passo(this.estado, t, this.ctx);
    this.estado = estado;
    if (estado.tela === 'captura' && antes !== 'captura') {
      this.quadroDaCaptura = quadroDoControle();
      this.recusa = '';
    }
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
    if (efeito.tipo === 'restaurar') {
      restaurarPref();
      this.game.events.emit(EVENTO_TECLAS);
    }
    this.desenhar();
  }

  private mudar(linha: Campo | 'telaCheia', d: -1 | 1): void {
    if (linha === 'telaCheia') {
      // A state of the browser, not a recorded preference (it only grants fullscreen on a gesture). The redraw comes
      // with `fullscreenchange`.
      alternarTelaCheia();
      return;
    }
    const p = mudarPref(linha, d);
    // every live `InputReader` re-reads the map (the scene underneath is paused, not restarted)
    if (linha === 'teclas') this.game.events.emit(EVENTO_TECLAS);
    // turned ON: one pulse, so the player feels it working — or reads why it is not
    if (linha === 'vibracao' && p.vibracao) {
      vibrarTeste();
      if (controleConectado() && !vibracaoDisponivel()) this.recusa = 'este navegador não oferece vibração para este controle';
    }
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
    else this.desenharConfig(e.aba, e.linha, e.coluna, e.tela === 'captura');
    // the frame is growing (or shrinking): the content comes in when it has (almost) arrived
    if (this.cresceu) {
      const conteudo = this.pecas.filter((p) => p !== (this.cresceu as unknown as Coisa));
      for (const p of conteudo) p.setAlpha(0);
      this.tweens.add({ targets: conteudo, alpha: 1, duration: 90, delay: JANELA.cresce * 0.6 });
    }
    if (this.entrando) {
      this.entrando = false;
      // each piece comes in up to ITS alpha (the cursor bar and the rules are translucent)
      for (const p of this.pecas) {
        const a = (p as unknown as { alpha: number }).alpha;
        p.setAlpha(0);
        this.tweens.add({ targets: p, alpha: a, duration: DERROTA.entra, delay: DERROTA.entra * 0.5 });
      }
    }
  }

  /**
   * THE SHIP LOST WINDOW (15/11, block M3 — spec `2026-11-15-bloco-m3-nave-perdida-design.md`): a sober scoreboard of
   * "try again" over the last frame of the stage — the title, the points and the record already standing (no
   * counting: the player sees it many times), the pixel medal of the final screen when there is one, and the three
   * lines with the cursor on TRY AGAIN.
   */
  private desenharDerrota(cursor: number): void {
    const d = this.dados.opts.derrota;
    if (!d) return;
    const L = layoutDerrota(!!d.medalha);
    const w = DERROTA.w;
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const y0 = Math.round(cy - L.h / 2), x0 = cx - w / 2;
    const xe = x0 + 12, xd = x0 + w - 12;
    this.janela(cx, cy, w, L.h);
    this.txt(cx, y0 + L.titulo, 'NAVE PERDIDA', COLORS.enemyBright, 10);
    this.txt(cx, y0 + L.sub, `a fase ${d.fase} continua esperando`, COR.fraco, 6, 'piloto');
    this.caixa(x0 + 8, y0 + L.regua1, w - 16, 1, COR_JANELA.osso, 0.25);

    this.txt(xe, y0 + L.pontos, 'PONTOS', COR.fraco, 7, 'jogo', 'e');
    this.txt(xd, y0 + L.pontos, String(d.score), COR.titulo, 8, 'nave', 'd');
    const corRecorde = d.novo ? COR.aviso : COR.fraco;
    this.txt(xe, y0 + L.recorde, d.novo ? '★ NOVO RECORDE' : 'RECORDE', corRecorde, 7, 'jogo', 'e');
    this.txt(xd, y0 + L.recorde, String(d.recorde), d.novo ? COR.aviso : COR.linha, 8, 'nave', 'd');
    if (d.medalha && L.medalha !== null) {
      const img = this.destino.add.image(xe, y0 + L.medalha, texturaMedalha(this.destino, d.medalha.color)).setOrigin(0, 0.5).setDepth(3);
      this.pecas.push(img as unknown as Coisa);
      this.txt(xe + 15, y0 + L.medalha, `MEDALHA DE ${d.medalha.medal.toUpperCase()}`, d.medalha.color, 7, 'jogo', 'e');
    }
    this.caixa(x0 + 8, y0 + L.regua2, w - 16, 1, COR_JANELA.osso, 0.25);

    LINHAS.derrota.forEach((a, i) => {
      const y = y0 + L.linhas[i];
      if (i === cursor) this.caixa(x0 + 7, y - 6, w - 14, 11, COR.barra, 0.3);
      this.txt(cx, y, rotuloDaAcao('derrota', a), i === cursor ? COR.sel : COR.linha);
    });

    // the hint under the window follows the device in use: the fire key confirms, as on every scoreboard of the game
    const noControle = aparelhoAtivo() === 'controle';
    this.linhaDeDica(
      cx,
      y0 + L.h + 9,
      noControle ? [BOTAO.A, ' CONFIRMA     ', BOTAO.B, ' MENU'] : [`[${rotuloDaTecla(mapaDoTeclado().tiro)}] CONFIRMA     [ESC] MENU`],
      COR.fraco,
    );
  }

  private desenharLista(cursor: number): void {
    if (this.ctx.tipo === 'menu') return;
    if (this.ctx.tipo === 'derrota') {
      this.desenharDerrota(cursor);
      return;
    }
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

  private desenharConfirma(acao: 'reiniciar' | 'sair' | 'restaurar', sim: boolean): void {
    const C = JANELA.confirma;
    const cx = GAME_WIDTH / 2, cy = GAME_HEIGHT / 2;
    const y0 = Math.round(cy - C.h / 2);
    this.janela(cx, cy, C.w, C.h);
    this.txt(cx, y0 + 13, 'TEM CERTEZA?', COR.titulo);
    const aviso = acao === 'reiniciar' ? 'a fase recomeça do início' : acao === 'sair' ? 'a partida em curso se perde' : 'teclado e controle voltam ao padrão';
    this.txt(cx, y0 + 26, aviso, COR.fraco, 6, 'piloto');
    const opcao = (x: number, s: string, sel: boolean): void => {
      if (sel) this.caixa(x - 18, y0 + 36, 36, 11, COR.barra, 0.3);
      this.txt(x, y0 + 42, s, sel ? COR.sel : COR.linha);
    };
    opcao(cx - 26, 'NÃO', !sim);
    opcao(cx + 26, 'SIM', sim);
  }

  private desenharConfig(abaI: number, linhaI: number, coluna: 0 | 1, capturando: boolean): void {
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

    const xRot = G.x + 20, xVal = G.x + G.w - 20;
    if (aba === 'controles') this.desenharControles(linhaI, coluna, capturando, p);
    else {
      LINHAS_DA_ABA[aba].forEach((l, i) => {
        const y = G.y + 42 + i * 16;
        const sel = i === linhaI;
        if (sel) this.caixa(G.x + 10, y - 7, G.w - 20, 13, COR.barra, 0.3);
        this.txt(xRot, y, rotuloDaLinha(l), sel ? COR.sel : COR.linha, 8, 'jogo', 'e');
        if (l === 'volume.geral' || l === 'volume.musica' || l === 'volume.efeitos') this.volume(xVal, y, valorDoVolume(p, l), sel);
        else this.txt(xVal, y, sel ? `<  ${this.valor(l, p)}  >` : this.valor(l, p), sel ? COR.sel : COR.linha, 8, 'jogo', 'd');
      });
    }

    if (aba === 'audio') this.txt(xRot, G.y + 42 + 3 * 16 + 4, 'os efeitos sonoros chegam numa versão futura', COR.fraco, 6, 'piloto', 'e');
    // where the browser cannot hand the ESC to the game (Firefox, Safari), say so instead of looking broken
    if (aba === 'video' && !escFicaNoJogo()) this.txt(xRot, G.y + 42 + 2 * 16 + 4, 'neste navegador, o ESC sai da tela cheia antes de chegar ao jogo', COR.fraco, 6, 'piloto', 'e');
    if (aba === 'jogo') this.txt(xRot, G.y + 42 + 16 + 4, 'a tela de abertura: a colônia à noite ou ao amanhecer', COR.fraco, 6, 'piloto', 'e');

    this.linhaDeDica(G.x + G.w / 2, G.y + G.h - 10, this.rodape(capturando, coluna), capturando ? COR.sel : COR.fraco);
  }

  /**
   * One button of the controller: its ICON (Kenney's CC0 prompts, `entrada/icones.ts`) or, while the strip has not
   * arrived, its name. Returns the width it took, in game px.
   */
  private botao(x: number, y: number, indice: number, cor: number, size = 6, voz: Voz = 'piloto'): number {
    const f = familiaDoControle();
    const chave = texturaDosBotoes(this.destino);
    const quadro = quadroDoBotao(indice, f);
    if (!chave || quadro === null) return this.txt(x, y, rotuloDoBotao(indice, f), cor, size, voz, 'e').width;
    const img = this.destino.add.image(x, y, chave, quadro).setOrigin(0, 0.5).setScale(escalaDoIcone(this.destino)).setDepth(3);
    this.pecas.push(img as unknown as Coisa);
    return ladoDoIcone(this.destino);
  }

  /** A centred row of hints: strings are text, numbers are controller buttons (icons). */
  private linhaDeDica(cx: number, y: number, partes: readonly (string | number)[], cor: number): void {
    const postas: { x: number }[] = [];
    let x = 0;
    for (const p of partes) {
      const antes = this.pecas.length;
      x += typeof p === 'number' ? this.botao(x, y, p, cor) + 1 : this.txt(x, y, p, cor, 6, 'piloto', 'e').width;
      for (const o of this.pecas.slice(antes)) postas.push(o as unknown as { x: number });
    }
    const dx = Math.round(cx - x / 2);
    for (const o of postas) o.x += dx;
  }

  /** The hint line follows the device in use (ASCII only: the fonts do not have ← →). */
  private rodape(capturando: boolean, coluna: 0 | 1): (string | number)[] {
    const noControle = aparelhoAtivo() === 'controle';
    if (capturando) {
      const pedido = `${coluna === 0 ? 'APERTE A NOVA TECLA' : 'APERTE O NOVO BOTÃO'}     `;
      return noControle ? [pedido, BOTAO.START, ' CANCELA'] : [pedido, '[ESC] CANCELA'];
    }
    if (noControle) return ['[<  >] MUDAR     ', BOTAO.LB, BOTAO.RB, ' ABA     ', BOTAO.A, ' CONFIRMA     ', BOTAO.B, ' VOLTA'];
    return ['[<  >] MUDAR     [Q  E] ABA     [ENTER] CONFIRMA     [ESC] VOLTA'];
  }

  /**
   * THE CONTROLS TAB (block M2): the profile of each device, the remap table (one key and one button per action), the
   * vibration, and RESTORE. The movement is fixed and only described.
   */
  private desenharControles(linhaI: number, coluna: 0 | 1, capturando: boolean, p: Preferencias): void {
    const G = JANELA.grande;
    const xRot = G.x + 20, xVal = G.x + G.w - 20;
    const colunas = [G.x + 128, G.x + 222] as const;
    const tem = controleConectado();
    const f = familiaDoControle();
    const mt = mapaDoTeclado(), mc = mapaDoControle();
    // 9 lines: the two profiles, the table header, the five actions, the vibration, RESTORE
    const ys = [38, 51, 78, 90, 102, 114, 126, 141, 154].map((y) => G.y + y);

    this.txt(colunas[0], G.y + 66, 'TECLADO', COR.fraco, 6, 'piloto', 'e');
    this.txt(colunas[1], G.y + 66, tem ? `CONTROLE · ${f === 'ps' ? 'PLAYSTATION' : 'XBOX'}` : 'CONTROLE · NENHUM CONECTADO', COR.fraco, 6, 'piloto', 'e');

    LINHAS_DA_ABA.controles.forEach((l, i) => {
      const y = ys[i];
      const sel = i === linhaI;
      const acao = acaoDaLinha(l);
      const cor = sel ? COR.sel : COR.linha;
      if (acao) {
        // one cell per device; the cursor is on ONE of them
        this.txt(xRot, y, rotuloDaLinha(l), cor, 8, 'jogo', 'e');
        const celulas = [rotuloDaTecla(mt[acao]), rotuloDoBotao(mc[acao], f)];
        celulas.forEach((texto, c) => {
          const aqui = sel && c === coluna;
          if (aqui) this.caixa(colunas[c] - 6, y - 6, 88, 12, capturando ? COR.aviso : COR.barra, capturando ? 0.28 : 0.3);
          const apagada = c === 1 && !tem;
          const corCelula = apagada ? COR.apagado : aqui ? COR.sel : COR.linha;
          if (aqui && capturando) {
            this.txt(colunas[c], y, '. . .', corCelula, 8, 'nave', 'e');
            return;
          }
          // the controller cell: the icon of the button, then its name
          let x = colunas[c];
          if (c === 1 && tem && texturaDosBotoes(this.destino)) x += this.botao(x, y, mc[acao], corCelula) + 3;
          this.txt(x, y, texto, corCelula, 8, 'nave', 'e');
        });
        return;
      }
      if (sel) this.caixa(G.x + 10, y - 6, G.w - 20, 12, COR.barra, 0.3);
      this.txt(xRot, y, rotuloDaLinha(l), cor, 8, 'jogo', 'e');
      if (l !== 'restaurar') this.txt(xVal, y, sel ? `<  ${this.valor(l, p)}  >` : this.valor(l, p), cor, 8, 'jogo', 'd');
    });

    const nota = this.recusa || 'mover (fixo): WASD ou setas · analógico ou direcional     Fase 1: o botão do DASH dá o impulso';
    this.txt(xRot, G.y + 165, nota, this.recusa ? COR.aviso : COR.apagado, 6, 'piloto', 'e');
  }

  private valor(l: Linha, p: Preferencias): string {
    if (l === 'teclas') return p.teclas === 'padrao' ? 'PADRÃO' : p.teclas === 'classico' ? 'CLÁSSICO' : 'PERSONALIZADO';
    if (l === 'controle') return p.controle === 'moderno' ? 'MODERNO' : p.controle === 'arcade' ? 'ARCADE' : 'PERSONALIZADO';
    if (l === 'vibracao') return p.vibracao ? 'LIGADA' : 'DESLIGADA';
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
}

function valorDoVolume(p: Preferencias, l: 'volume.geral' | 'volume.musica' | 'volume.efeitos'): number {
  return l === 'volume.geral' ? p.volume.geral : l === 'volume.musica' ? p.volume.musica : p.volume.efeitos;
}
