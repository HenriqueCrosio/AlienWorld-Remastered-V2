import Phaser from 'phaser';
import { ALTURA, LARGURA } from '../numerosMenu';
import { alfaVeu } from '../abertura';
import { garantirTexturas } from '../texturas';
import type { CenarioDoMenu, EstadoMenu, Peca } from '../cenario';
import { efeitosLigados, type Efeito } from './numerosAmanhecer';
import {
  montarBrasas, montarBruma, montarCinza, montarFogo, montarFumaca, montarLava, montarRaios, montarVeu,
  type ContextoAmanhecer, type DadosAmanhecer,
} from './vidaAmanhecer';

/**
 * O CENÁRIO DO MENU DO AMANHECER (13/11, bloco I etapa 3 — spec `2026-11-13-bloco-i-tela-final-amanhecer-design.md` §3):
 * a pintura dele da colônia depois da queda, o Leviatã caído no vale. É o menu de quem zerou a campanha e o fundo do
 * resultado dela. UMA camada só (nada passa por trás desta pintura), assada fora do jogo
 * (`scripts/_menu/_camadas-amanhecer.mjs`) nas densidades `k4` (a camada HD) e `k1`, com o mesmo corte do menu da noite,
 * mais duas máscaras tiradas dela: `luz` (a claridade: os raios não cobrem silhueta preta) e `nevoa` (a névoa pintada:
 * a bruma só anda sobre ela, e a carcaça, o osso e o fogo ficam limpos).
 * Tudo aqui se escreve em PIXELS DE JOGO; a textura tem `k` pixels por pixel de jogo e entra com `setScale(1 / k)`.
 *
 * As peças vivas (`vidaAmanhecer.ts`, os números em `numerosAmanhecer.ts`): a bruma, os raios de sol, a fumaça, o
 * fogo, as brasas, a lava quase apagada, a cinza e o véu de fumaça e neblina sobre tudo. `dados.json` traz os focos de fogo e de lava medidos na pintura, e
 * `lava-apagada.png` a carcaça sem a lava.
 */

/** Põe na fila do `load` a pintura e a máscara do amanhecer de uma densidade (`sprites/menu-amanhecer/k4` ou `k1`). */
export function carregarAmanhecer(load: Phaser.Loader.LoaderPlugin, prefixo: string, pasta: string): void {
  const tex = load.scene.textures;
  if (!tex.exists(`${prefixo}-pintura`)) load.image(`${prefixo}-pintura`, `${pasta}/pintura.png`);
  for (const m of ['luz', 'nevoa']) if (!tex.exists(`${prefixo}-${m}`)) load.image(`${prefixo}-${m}`, `${pasta}/${m}.png`);
  if (!tex.exists(`${prefixo}-lava`)) load.image(`${prefixo}-lava`, `${pasta}/lava-apagada.png`);
  if (!load.scene.cache.json.exists(`${prefixo}-dados`)) load.json(`${prefixo}-dados`, `${pasta}/dados.json`);
}

/** `?vida=bruma,raios` na URL: só esses efeitos (as maquetes de cada rodada); sem o parâmetro, todos. */
function efeitosDaUrl(): Efeito[] {
  const q = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('vida');
  return efeitosLigados(q);
}

const MONTAR: Record<Efeito, (ctx: ContextoAmanhecer) => Peca> = {
  bruma: montarBruma, raios: montarRaios, fumaca: montarFumaca, fogo: montarFogo, brasas: montarBrasas, lava: montarLava, cinza: montarCinza,
  veu: montarVeu,
};

export class CenarioAmanhecer implements CenarioDoMenu {
  private readonly pecas: Peca[];
  private readonly veu: Phaser.GameObjects.Rectangle;
  /** O amanhecer não tem tempestade. */
  relampagos: () => number = () => 0;
  /** Para a sonda: os efeitos montados. */
  readonly efeitos: Efeito[];

  private constructor(scene: Phaser.Scene, k: number, prefixo: string, private readonly estado: EstadoMenu, profundidadeVeu: number) {
    const pintura = `${prefixo}-pintura`;
    // A pintura é a única coisa que a camada AMPLIA (21% em Full HD): suave, não em blocos (a camada é `pixelArt`).
    if (k > 1) scene.textures.get(pintura).setFilter(Phaser.Textures.FilterMode.LINEAR);
    scene.add.image(0, 0, pintura).setOrigin(0).setScale(1 / k).setDepth(0);
    garantirTexturas(scene, k);
    // As máscaras (só no WebGL, como a nuvem da tempestade da noite): assadas em meia resolução na camada HD.
    const mascara = (nome: string): Phaser.Display.Masks.BitmapMask | null => {
      const chave = `${prefixo}-${nome}`;
      if (!scene.textures.exists(chave) || scene.game.renderer.type !== Phaser.WEBGL) return null;
      const fonte = scene.textures.get(chave).getSourceImage();
      if (k > 1) scene.textures.get(chave).setFilter(Phaser.Textures.FilterMode.LINEAR);
      return scene.make.image({ x: 0, y: 0, key: chave }, false).setOrigin(0).setScale(LARGURA / fonte.width).createBitmapMask();
    };
    this.efeitos = efeitosDaUrl();
    const dados = (scene.cache.json.get(`${prefixo}-dados`) as DadosAmanhecer | undefined) ?? { fogos: [], lava: [] };
    const ctx: ContextoAmanhecer = { scene, k, chave: (nome) => `${prefixo}-${nome}`, dados, mascara: mascara('luz'), mascaraNevoa: mascara('nevoa') };
    this.pecas = this.efeitos.map((e) => MONTAR[e](ctx));
    this.veu = scene.add.rectangle(0, 0, LARGURA, ALTURA, 0x000000, 1).setOrigin(0).setDepth(profundidadeVeu);
  }

  /** Monta o cenário com a pintura `prefixo` já carregada; `null` se ela não está lá. */
  static criar(scene: Phaser.Scene, k: number, prefixo: string, estado: EstadoMenu, profundidadeVeu: number): CenarioAmanhecer | null {
    if (!scene.textures.exists(`${prefixo}-pintura`)) {
      console.warn('[menu] a pintura do amanhecer não chegou — o menu abre sem ela');
      return null;
    }
    return new CenarioAmanhecer(scene, k, prefixo, estado, profundidadeVeu);
  }

  atualizar(t: number): void {
    for (const p of this.pecas) p.atualizar(t);
    // No resultado (o 1º tempo) o véu tem o relógio dele (`tVeu`): a abertura ainda está parada.
    const e = this.estado;
    this.veu.setAlpha(e.tVeu !== undefined ? alfaVeu(e.tVeu) : e.pulou ? 0 : alfaVeu(e.tAbertura));
  }
}
