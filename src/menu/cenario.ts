import Phaser from 'phaser';
import { ALTURA, LARGURA, TRAVESSIA } from './numerosMenu';
import { alfaVeu } from './abertura';
import { garantirTexturas, lerPixels } from './texturas';
import { montarLeviata } from './leviata';
import { montarVida } from './vida';
import { montarVolume } from './volume';
import { montarPerigo } from './perigo';

/**
 * O CENÁRIO DO MENU (spec `2026-10-19-menu-refeito-design.md` §2–5): a pintura dele em camadas, viva e com perigo no
 * ar. As camadas são assadas fora do jogo (`scripts/_menu/_camadas.mjs`, `_tempestade.mjs`) em duas densidades: `k4`
 * (a camada HD, onde o menu mora) e `k1` (sem a camada). Tudo aqui se escreve em PIXELS DE JOGO; uma textura de
 * camada tem `k` pixels por pixel de jogo e entra com `setScale(1 / k)`.
 */

/** Uma caixa em pixels. */
export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Um grupo de luz da pintura (`dados.json`): caixa e área em px de jogo. */
export interface GrupoLuz extends Caixa {
  tipo: 'janela' | 'farol';
  n: number;
}

/** O `dados.json` de `_camadas.mjs`: `w`/`h` e os quadros da água na densidade da camada; o resto em px de jogo. */
export interface DadosCamadas {
  k: number;
  w: number;
  h: number;
  nave: Caixa;
  agua: Caixa & { quadros: number; fw: number; fh: number };
  grupos: GrupoLuz[];
}

/** O `tempestade.json` de `_tempestade.mjs`: as caixas em px da camada (resolução cheia); `reducao` = 2. */
export interface DadosTempestade {
  reducao: number;
  flashes: Caixa[];
  raios: Caixa[];
  nuvem: Caixa;
}

/** O estado da abertura que o cenário lê (o `MenuScene` escreve). */
export interface EstadoMenu {
  /** O relógio da abertura (s). */
  tAbertura: number;
  /** A abertura foi pulada (uma tecla, a volta do Arquivo, o movimento reduzido). */
  pulou: boolean;
  /** `prefers-reduced-motion`: sem relâmpagos. */
  reduzido: boolean;
  /** O cenário montou: a abertura pode correr. */
  pronto: boolean;
  /** A sonda parou o relógio (`MenuScene.irPara`). */
  congelado: boolean;
}

/** Uma peça viva do cenário. */
export interface Peca {
  atualizar(t: number): void;
}

/** O que as peças recebem. */
export interface ContextoCenario {
  scene: Phaser.Scene;
  /** Pixels da camada por pixel de jogo (4 na camada HD; 1 sem ela). */
  k: number;
  chave: (nome: string) => string;
  dados: DadosCamadas;
  tempestade: DadosTempestade;
  /** Os pixels do céu e da cidade (as estrelas nascem onde a cidade é transparente e o céu é escuro). */
  pixelsCeu: Uint8ClampedArray;
  pixelsCidade: Uint8ClampedArray;
}

export const IMAGENS_CAMADAS = ['ceu', 'cidade', 'apagadas', 'nave', 'cachoeira', 'leviata'] as const;
export const IMAGENS_TEMPESTADE = ['flash0', 'flash1', 'flash2', 'raio0', 'raio1', 'raio2', 'nuvem'] as const;

/** Põe na fila do `load` as camadas do menu de uma densidade (`sprites/menu/k4` ou `k1`); o que já está, pula. */
export function carregarCamadasMenu(load: Phaser.Loader.LoaderPlugin, prefixo: string, pasta: string): void {
  const tex = load.scene.textures;
  const json = load.scene.cache.json;
  for (const n of IMAGENS_CAMADAS) if (!tex.exists(`${prefixo}-${n}`)) load.image(`${prefixo}-${n}`, `${pasta}/${n}.png`);
  for (const n of IMAGENS_TEMPESTADE) {
    if (!tex.exists(`${prefixo}-${n}`)) load.image(`${prefixo}-${n}`, `${pasta}/tempestade/${n}.png`);
  }
  if (!json.exists(`${prefixo}-dados`)) load.json(`${prefixo}-dados`, `${pasta}/dados.json`);
  if (!json.exists(`${prefixo}-tempestade`)) load.json(`${prefixo}-tempestade`, `${pasta}/tempestade/tempestade.json`);
}

/** O contexto das peças, ou `null` se as camadas não estão carregadas. */
function contexto(scene: Phaser.Scene, k: number, prefixo: string): ContextoCenario | null {
  const chave = (nome: string): string => `${prefixo}-${nome}`;
  const faltam = [...IMAGENS_CAMADAS, ...IMAGENS_TEMPESTADE].filter((n) => !scene.textures.exists(chave(n)));
  const dados = scene.cache.json.get(chave('dados')) as DadosCamadas | undefined;
  const tempestade = scene.cache.json.get(chave('tempestade')) as DadosTempestade | undefined;
  if (faltam.length || !dados || !tempestade) {
    console.warn('[menu] as camadas do cenário não chegaram — o menu abre sem ele', faltam);
    return null;
  }
  garantirTexturas(scene, k);
  const quadros = (nome: string, n: number, fw: number, fh: number): void => {
    const tex = scene.textures.get(chave(nome));
    if (tex.has('0')) return;
    for (let i = 0; i < n; i++) tex.add(i, 0, i * fw, 0, fw, fh);
  };
  quadros('cachoeira', dados.agua.quadros, dados.agua.fw, dados.agua.fh);
  const levi = scene.textures.get(chave('leviata')).getSourceImage();
  quadros('leviata', TRAVESSIA.quadros, levi.width / TRAVESSIA.quadros, levi.height);
  // A pintura é a única coisa que a camada AMPLIA (21% em Full HD): suave, não em blocos (a camada é `pixelArt`).
  if (k > 1) {
    for (const n of [...IMAGENS_CAMADAS, ...IMAGENS_TEMPESTADE]) {
      scene.textures.get(chave(n)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    }
  }
  return {
    scene, k, chave, dados, tempestade,
    pixelsCeu: lerPixels(scene, chave('ceu')),
    pixelsCidade: lerPixels(scene, chave('cidade')),
  };
}

/**
 * O CENÁRIO montado numa cena (a `MenuCenaHD`, ou o próprio `MenuScene` sem a camada): o céu, a cidade, as peças
 * vivas e o véu da abertura. `atualizar(t)` com o relógio do cenário.
 */
export class Cenario {
  private readonly pecas: Peca[];
  private readonly veu: Phaser.GameObjects.Rectangle;
  private readonly estado: EstadoMenu;
  /** Para a sonda: quantos relâmpagos já caíram. */
  relampagos: () => number = () => 0;

  private constructor(ctx: ContextoCenario, estado: EstadoMenu, profundidadeVeu: number) {
    const { scene, k, chave } = ctx;
    this.estado = estado;
    scene.add.image(0, 0, chave('ceu')).setOrigin(0).setScale(1 / k).setDepth(0);
    scene.add.image(0, 0, chave('cidade')).setOrigin(0).setScale(1 / k).setDepth(2);
    const perigo = montarPerigo(ctx, estado);
    this.pecas = [montarLeviata(ctx), montarVida(ctx), montarVolume(ctx), perigo];
    this.relampagos = perigo.contagem;
    this.veu = scene.add.rectangle(0, 0, LARGURA, ALTURA, 0x000000, 1).setOrigin(0).setDepth(profundidadeVeu);
  }

  /** Monta o cenário com as camadas `prefixo` já carregadas; `null` se elas não estão lá. */
  static criar(scene: Phaser.Scene, k: number, prefixo: string, estado: EstadoMenu, profundidadeVeu: number): Cenario | null {
    const ctx = contexto(scene, k, prefixo);
    return ctx ? new Cenario(ctx, estado, profundidadeVeu) : null;
  }

  atualizar(t: number): void {
    for (const p of this.pecas) p.atualizar(t);
    this.veu.setAlpha(this.estado.pulou ? 0 : alfaVeu(this.estado.tAbertura));
  }
}
