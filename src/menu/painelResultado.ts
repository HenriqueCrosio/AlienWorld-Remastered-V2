import Phaser from 'phaser';
import { COLORS } from '../config';
import { pixelText } from '../ui';
import { escalaHD, irmaDe, registrarTextoHD, type Voz } from '../uiHD';
import { mapaAtivo, rotuloDaTecla } from '../controles';
import type { Medalha } from '../placar';
import { RESULTADO } from './numerosMenu';
import { alfaResultado, pontosMostrados, type ParteResultado } from './resultado';

/**
 * O PAINEL DO RESULTADO do fim da campanha (13/11, bloco I etapa 3). Ele, vendo a rodada 1: *"achei muito simples, quero
 * um visual baseado em grandes sucessos de snes [...] visualmente agradável e que, claro, fique no estilo do jogo"*; e
 * o crédito: *"meu nome pode ir para o lado direito, um pouco menor a fonte. Eu quero uma fonte um pouco diferente,
 * mais sofisticada do que o restante do game [...] 'Um jogo de' e na linha de baixo meu nome. Como se fosse uma
 * assinatura"*. Da rodada 2 (três placares, três fontes) ficaram a JANELA (a caixa de borda dupla dos placares de fim
 * de fase, o pontilhado do rótulo até o valor) e a CINZEL na assinatura, *"um pouquinho"* menor; e o placar desceu,
 * para se destacar do título (*"desça ele mais um pouco"*).
 *
 * Tudo em pixel de JOGO, na irmã da camada HD (ou no mundo, sem ela): a moldura e a medalha são texturas desenhadas
 * pixel a pixel (1 texel = 1 px de jogo), o texto nas vozes do jogo, e a ASSINATURA na fonte só dela. Os pontos CONTAM
 * até o valor. Cada peça entra com a sua parte (`alfaResultado`).
 */
export interface DadosResultado {
  score: number;
  recorde: number;
  novo: boolean;
  medalha: { medal: Medalha; color: number } | null;
}

export interface PainelResultado {
  /** Desenha no instante `t` do 1º tempo (`tSai`: quando a tecla o tirou; `posto`: o movimento reduzido). */
  atualizar(t: number, tSai: number, posto: boolean): void;
  destruir(): void;
  /** Para a sonda: o que está na tela. */
  diagnostico(): { parte: ParteResultado; texto: string; alfa: number }[];
}

type Coisa = Phaser.GameObjects.GameObject & { setAlpha(a: number): unknown; alpha: number; text?: string };
interface Peca {
  parte: ParteResultado;
  o: Coisa;
  /** pisca (o "novo recorde") */
  pisca?: boolean;
}

/** A fonte da assinatura: a Cinzel 500 (OFL, `public/fonts/OFL-cinzel.txt`), em maiúsculas espaçadas. */
const ASSINATURA = { arquivo: 'fonts/cinzel-500.woff2', familia: 'fonte-assinatura' } as const;
let fonteAssinatura: Promise<boolean> | null = null;

/** Carrega a fonte da assinatura na 1ª vez; `false` se não veio (a assinatura cai para a voz do piloto). */
function carregarAssinatura(): Promise<boolean> {
  fonteAssinatura ??= new FontFace(ASSINATURA.familia, `url(${ASSINATURA.arquivo})`)
    .load()
    .then((face) => {
      (document.fonts as unknown as Set<FontFace>).add(face);
      return true;
    })
    .catch(() => false);
  return fonteAssinatura;
}

const css = (c: number, a = 1): string => `rgba(${(c >> 16) & 255},${(c >> 8) & 255},${c & 255},${a})`;
const escuro = (c: number, k: number): number =>
  (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k);
const claro = (c: number, k: number): number => {
  const m = (v: number): number => Math.round(v + (255 - v) * k);
  return (m((c >> 16) & 255) << 16) | (m((c >> 8) & 255) << 8) | m(c & 255);
};

/** Uma textura desenhada pixel a pixel (1 texel = 1 px de jogo), uma vez por jogo. */
function textura(scene: Phaser.Scene, chave: string, w: number, h: number, desenhar: (c: CanvasRenderingContext2D) => void): string {
  if (!scene.textures.exists(chave)) {
    const t = scene.textures.createCanvas(chave, w, h);
    if (t) {
      desenhar(t.context);
      t.refresh();
    }
  }
  return chave;
}

/** A MEDALHA em pixel: a fita em duas pernas (a cor da nave e a do inimigo) e o disco com aro, brilho e miolo. */
function texturaMedalha(scene: Phaser.Scene, cor: number): string {
  // (ele: *"a medalha pode diminuir de tamanho, coisa de alguns pixels apenas"* — era raio 5 e fita 5, 13×17)
  const r = 4, fita = 4;
  return textura(scene, `res-medalha-${cor}`, 2 * r + 3, fita + 2 * r + 2, (c) => {
    const px = (x: number, y: number, cor2: number): void => {
      c.fillStyle = css(cor2);
      c.fillRect(x, y, 1, 1);
    };
    const cx = r + 1;
    const cy = fita + r;
    for (let y = 0; y < fita + 2; y++) {
      const abre = Math.round(((fita + 2 - y) / (fita + 2)) * 2);
      for (let k = 0; k < 2; k++) {
        px(cx - 1 - abre - k, y, k === 0 ? COLORS.playerBright : COLORS.player);
        px(cx + 1 + abre + k, y, k === 0 ? COLORS.enemyBright : COLORS.enemy);
      }
    }
    for (let y = -r; y <= r; y++) {
      for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y);
        if (d > r + 0.35) continue;
        const aro = d > r - 1.2;
        const luz = x + y < -r * 0.55 && !aro;
        px(cx + x, cy + y, aro ? escuro(cor, 0.5) : luz ? claro(cor, 0.6) : x + y > r * 0.7 ? escuro(cor, 0.75) : cor);
      }
    }
    // o miolo: um losango escuro
    for (let y = -1; y <= 1; y++) for (let x = -(1 - Math.abs(y)); x <= 1 - Math.abs(y); x++) px(cx + x, cy + y, escuro(cor, 0.45));
  });
}

const OSSO = RESULTADO.cores.titulo;
const FUNDO = 0x07080f;

/** A JANELA dos placares de fim de fase: a caixa escura de borda dupla, as linhas com pontilhado até o valor. */
function texturaJanela(scene: Phaser.Scene, w: number, h: number, linhas: readonly number[]): string {
  return textura(scene, `res-janela-${w}x${h}`, w, h, (c) => {
    c.fillStyle = css(FUNDO, 0.78);
    c.fillRect(1, 1, w - 2, h - 2);
    const borda = (m: number, cor: number, a: number): void => {
      c.fillStyle = css(cor, a);
      c.fillRect(m + 1, m, w - 2 * m - 2, 1);
      c.fillRect(m + 1, h - 1 - m, w - 2 * m - 2, 1);
      c.fillRect(m, m + 1, 1, h - 2 * m - 2);
      c.fillRect(w - 1 - m, m + 1, 1, h - 2 * m - 2);
    };
    borda(0, OSSO, 0.95);
    borda(1, 0x000000, 0.9);
    borda(2, COLORS.player, 0.7);
    // os cantos: um pixel de brilho
    c.fillStyle = css(0xffffff);
    for (const [x, y] of [[1, 1], [w - 2, 1], [1, h - 2], [w - 2, h - 2]]) c.fillRect(x, y, 1, 1);
    // o pontilhado de cada linha, do rótulo mais longo ("★ NOVO RECORDE") até antes dos algarismos
    c.fillStyle = css(OSSO, 0.35);
    for (const y of linhas) for (let x = 84; x < w - 54; x += 3) c.fillRect(x, y, 1, 1);
  });
}

/** Monta o painel do resultado na cena do menu. */
export function montarPainelResultado(scene: Phaser.Scene, d: DadosResultado): PainelResultado {
  const destino = irmaDe(scene) ?? scene;
  const pecas: Peca[] = [];
  const C = RESULTADO.cores;
  const L = RESULTADO.layout;
  let mostrado = -1;
  let morto = false;

  const txt = (parte: ParteResultado, x: number, y: number, s: string, size: number, color: number, voz: Voz, lado: 'e' | 'c' | 'd' = 'e'): Phaser.GameObjects.Text => {
    const o = pixelText(scene, x, y, s, { size, color, voz, align: lado === 'c' ? 'center' : 'left' }).setDepth(20).setAlpha(0);
    if (lado === 'd') o.setOrigin(1, 0.5);
    pecas.push({ parte, o: o as unknown as Coisa });
    return o;
  };
  // As texturas são do jogo que as DESENHA (o da camada HD, quando ela existe): `destino`, não `scene`.
  const img = (parte: ParteResultado, x: number, y: number, chave: string): void => {
    pecas.push({ parte, o: destino.add.image(x, y, chave).setOrigin(0, 0).setDepth(19.5).setAlpha(0) as unknown as Coisa });
  };

  txt('titulo', L.x, L.titulo, 'O LEVIATÃ CAIU', 16, C.titulo, 'jogo');

  // A JANELA: os pontos (contando), o recorde, a medalha.
  const J = L.janela;
  const dir = J.x + J.w - 8;
  img('pontos', J.x, J.y, texturaJanela(destino, J.w, J.h, [12, 24]));
  txt('pontos', J.x + 8, J.y + 10, 'PONTOS', 7, C.rotulo, 'jogo');
  const contador = txt('pontos', dir, J.y + 10, '0', 12, C.pontos, 'nave', 'd');
  // O rótulo do recorde: batido nesta partida, ele vira "NOVO RECORDE", aceso e piscando.
  txt('recorde', J.x + 8, J.y + 22, d.novo ? '★ NOVO RECORDE' : 'RECORDE', 7, d.novo ? COLORS.hotBright : C.rotulo, 'jogo');
  if (d.novo) pecas[pecas.length - 1].pisca = true;
  txt('recorde', dir, J.y + 22, String(d.recorde), 8, d.novo ? COLORS.hotBright : C.credito, 'nave', 'd');
  if (d.medalha) img('recorde', J.x + 8, J.y + 30, texturaMedalha(destino, d.medalha.color));
  txt('recorde', J.x + (d.medalha ? 22 : 8), J.y + 38, d.medalha ? `MEDALHA DE ${d.medalha.medal.toUpperCase()}` : 'SEM MEDALHA', 7, d.medalha ? d.medalha.color : C.rotulo, 'jogo');

  txt('tecla', L.xTecla, L.tecla, `${rotuloDaTecla(mapaAtivo().tiro[0])} continua`, 6, C.rotulo, 'jogo', 'c');

  // A ASSINATURA, embaixo à direita: "Um jogo de" e, na linha de baixo, o nome — na fonte só dela.
  void carregarAssinatura().then((veio) => {
    if (morto) return;
    const linha = (y: number, s: string, tam: number, cor: number): void => {
      if (!veio) {
        txt('credito', L.xAssinatura, y, s, tam, cor, 'piloto', 'd');
        return;
      }
      const o = destino.add
        .text(L.xAssinatura, y, s, { fontFamily: ASSINATURA.familia, fontSize: `${tam}px`, color: css(cor) })
        .setOrigin(1, 0.5)
        .setResolution(escalaHD())
        .setShadow(0, 1, '#05060d', 2, true, true)
        .setLetterSpacing(tam >= 6 ? 1 : 0.6)
        .setDepth(20)
        .setAlpha(0);
      registrarTextoHD(o, (s2) => o.setResolution(s2));
      pecas.push({ parte: 'credito', o: o as unknown as Coisa });
    };
    linha(L.assinatura[0], 'UM JOGO DE', L.tamAssinatura[0], C.rotulo);
    linha(L.assinatura[1], 'HENRIQUE CROSIO', L.tamAssinatura[1], C.titulo);
  });

  return {
    atualizar(t, tSai, posto) {
      for (const p of pecas) {
        const a = alfaResultado(p.parte, t, tSai, posto);
        p.o.setAlpha(p.pisca ? a * (0.55 + 0.45 * Math.cos((2 * Math.PI * t) / RESULTADO.pisca)) : a);
      }
      const v = posto ? d.score : pontosMostrados(d.score, t);
      if (v !== mostrado && contador.active) {
        mostrado = v;
        contador.setText(String(v));
      }
    },
    destruir() {
      morto = true;
      for (const p of pecas) p.o.destroy();
      pecas.length = 0;
    },
    diagnostico: () => pecas.map((p) => ({ parte: p.parte, texto: p.o.text ?? '(desenho)', alfa: +p.o.alpha.toFixed(3) })),
  };
}
