import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';
import { IrmaHDScene } from './scenes/IrmaHDScene';

/**
 * A CAMADA HD — a resolução mista (spec `2026-09-29-tres-vozes-camada-hd-design.md`).
 *
 * O mundo continua em 384×216 (a arte aprovada e a Atmosfera intocadas). Por cima dele vive um SEGUNDO jogo Phaser,
 * transparente, na resolução da TELA: 384·s × 216·s, com `s` = a escala inteira em que o jogo aparece (3 numa janela
 * de 1152, 5 em 1080p). As cenas daqui têm câmera em zoom `s` a partir do canto, então continuam escritas em
 * coordenadas do mundo — só o texto (e a mesa) ganham o pixel da tela.
 *
 * ⚠️ A razão camada:tela TEM que ser inteira, ou o pixel sai irregular: por isso `s` segue a tela, e a camada se
 * refaz quando a janela muda (`alinhar`).
 *
 * Todo texto de uma cena do mundo nasce na IRMÃ dela (`irmaDe`): uma cena daqui que nasce com o 1º texto, copia o fade
 * da câmera do mundo e morre com a cena. O código das cenas não sabe de nada disso — o `pixelText` devolve o próprio
 * texto de cá, e `setText`/`setAlpha`/tweens funcionam nele igual.
 */

/**
 * AS TRÊS VOZES (ideia do Henrique): cada fonte é uma voz, e uma tela fala com UMA voz só.
 * - `jogo`   — a marca: menu, fim de fase. Silkscreen.
 * - `nave`   — o computador de bordo: a fase (HUD, alertas), as cutscenes. Chivo Mono.
 * - `piloto` — o piloto decidindo, jogo pausado: a mesa, o painel da Doca. Chakra Petch.
 */
export type Voz = 'jogo' | 'nave' | 'piloto';

const VOZ_DA_CENA: Record<string, Voz> = {
  Menu: 'jogo',
  GameOver: 'jogo',
  Cartas: 'piloto',
  Arquivo: 'piloto',
  Game: 'nave',
  Interlude: 'nave',
  Interlude2: 'nave',
  Interlude3: 'nave',
  Interlude4: 'nave',
};

export const vozDaCena = (scene: Phaser.Scene): Voz => VOZ_DA_CENA[scene.scene.key] ?? 'jogo';

let jogo: Phaser.Game | null = null;
let mundo: Phaser.Game | null = null;
let s = 3;

/** A camada, ou `null` se ela não nasceu — aí o texto fica no mundo (`ui.ts`). */
export const jogoHD = (): Phaser.Game | null => jogo;
export const ehHD = (scene: Phaser.Scene): boolean => jogo !== null && scene.game === jogo;
/** Pixels de tela por pixel do mundo. */
export const escalaHD = (): number => s;
/** Pixels de tela por pixel da interface fina: o inteiro mais perto de ⅔ do pixel do mundo. */
export const pixelFino = (): number => Math.max(1, Math.round((s * 2) / 3));

/**
 * As cenas da camada desenhadas no GRID DE PIXEL FINO (spec 2026-09-30-mesa-compacta-arte-design.md §2.4): câmera em
 * zoom = pixel fino, coordenadas em pixels finos — a arte delas cai pixel a pixel na tela em qualquer janela. Hoje,
 * só a mesa.
 */
const CENAS_FINAS = new Set(['Cartas']);

/** O zoom da câmera de uma cena da camada: `s` (coordenadas do mundo) ou o pixel fino (coordenadas finas). */
export const zoomHD = (scene: Phaser.Scene): number => (CENAS_FINAS.has(scene.scene.key) ? pixelFino() : s);

/** Emitido em `jogoHD().events` quando a escala da tela muda (janela, tela cheia) — depois das câmeras refeitas. */
export const EVENTO_ESCALA = 'escala-hd';

/** Os textos da camada e como cada um se redesenha quando `s` muda. */
const textos = new Map<Phaser.GameObjects.GameObject, (s: number) => void>();

export function registrarTextoHD(obj: Phaser.GameObjects.GameObject, restyle: (s: number) => void): void {
  textos.set(obj, restyle);
  obj.once(Phaser.GameObjects.Events.DESTROY, () => textos.delete(obj));
}

/** Cena da camada: câmera a partir do canto, no zoom dela (`zoomHD`). */
export function prepararCameraHD(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(zoomHD(scene)).setScroll(0, 0);
}

const irmas = new Map<Phaser.Scene, Phaser.Scene>();
let nIrmas = 0;

/**
 * A irmã de uma cena do mundo: nasce na 1ª chamada, morre no `shutdown` da cena (um `restart` ganha uma irmã nova).
 * `null` se a camada não existe ou ainda não acabou de nascer — o texto fica no mundo.
 */
export function irmaDe(cena: Phaser.Scene): Phaser.Scene | null {
  if (!jogo || !jogo.isBooted) return null;
  const tem = irmas.get(cena);
  if (tem) return tem;
  const chave = `irma:${cena.scene.key}:${nIrmas++}`;
  const irma = jogo.scene.add(chave, IrmaHDScene, true, { mundo: cena }) as Phaser.Scene | null;
  if (!irma) return null;
  // A MESA fica sempre por cima: a irmã nasce logo abaixo dela (a ordem de desenho é a ordem das cenas, e uma irmã
  // nova entraria no topo — a HUD e o alerta da fase saíam por cima das cartas). Entre as irmãs, a mais nova fica em
  // cima, como no mundo, onde a cena lançada por último desenha por cima.
  jogo.scene.moveBelow('Cartas', chave);
  prepararCameraHD(irma);
  irmas.set(cena, irma);
  const soltar = () => {
    if (irmas.get(cena) !== irma) return;
    irmas.delete(cena);
    jogo?.scene.remove(chave);
  };
  cena.events.once(Phaser.Scenes.Events.SHUTDOWN, soltar);
  cena.events.once(Phaser.Scenes.Events.DESTROY, soltar);
  return irma;
}

/** O mouse vai para a camada só enquanto uma tela de decisão DELA (a mesa) está aberta; no resto, para o mundo. */
export function mouseHD(ligado: boolean): void {
  if (jogo?.canvas) jogo.canvas.style.pointerEvents = ligado ? 'auto' : 'none';
}

function medirEscala(): number {
  const r = mundo!.canvas.getBoundingClientRect();
  return Math.max(1, Math.round((r.width * (window.devicePixelRatio || 1)) / GAME_WIDTH));
}

/** Cobre EXATAMENTE o canvas do mundo; se a escala da tela mudou, refaz a camada nela. */
function alinhar(): void {
  if (!jogo?.canvas || !mundo?.canvas) return;
  const novo = medirEscala();
  if (novo !== s) {
    s = novo;
    jogo.scale.resize(GAME_WIDTH * s, GAME_HEIGHT * s);
    for (const cena of jogo.scene.getScenes(false)) {
      // Cena parada ainda não tem câmera — quando abrir, já nasce na escala nova (`prepararCameraHD`).
      if (!cena.cameras?.main) continue;
      cena.cameras.main.setSize(GAME_WIDTH * s, GAME_HEIGHT * s);
      prepararCameraHD(cena);
    }
    for (const restyle of textos.values()) restyle(s);
    jogo.events.emit(EVENTO_ESCALA, s);
  }
  const m = mundo.canvas.getBoundingClientRect();
  Object.assign(jogo.canvas.style, {
    position: 'fixed', left: `${m.left}px`, top: `${m.top}px`, width: `${m.width}px`, height: `${m.height}px`,
    margin: '0', zIndex: '2',
  });
  // Os limites novos do canvas: é deles que o mouse tira a posição.
  jogo.scale.refresh();
}

/** Liga a camada por cima do mundo. Se ela falhar, o jogo segue com o texto no mundo. */
export async function criarCamadaHD(mundoJogo: Phaser.Game, cenas: (typeof Phaser.Scene)[]): Promise<void> {
  mundo = mundoJogo;
  await new Promise<void>((ok) => (mundo!.isBooted ? ok() : mundo!.events.once(Phaser.Core.Events.READY, () => ok())));
  s = medirEscala();
  try {
    jogo = new Phaser.Game({
      type: Phaser.AUTO,
      parent: document.body,
      width: GAME_WIDTH * s,
      height: GAME_HEIGHT * s,
      transparent: true,
      pixelArt: true,
      roundPixels: true,
      scale: { mode: Phaser.Scale.NONE },
      scene: cenas,
      banner: false,
    });
  } catch (e) {
    console.warn('[camada HD] não nasceu — o texto fica no mundo', e);
    jogo = null;
    return;
  }
  await new Promise<void>((ok) => jogo!.events.once(Phaser.Core.Events.READY, () => ok()));
  // A camada nasce surda ao mouse (o clique é do mundo); a mesa o liga enquanto está aberta.
  mouseHD(false);
  alinhar();
  mundo.scale.on(Phaser.Scale.Events.RESIZE, () => requestAnimationFrame(alinhar));
  window.addEventListener('resize', () => requestAnimationFrame(alinhar));
  document.addEventListener('fullscreenchange', () => requestAnimationFrame(alinhar));
  if (import.meta.env.DEV) (window as unknown as { __gameHD: Phaser.Game }).__gameHD = jogo;
}
