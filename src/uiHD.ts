import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from './config';

/**
 * PROTÓTIPO (29/09) — a CAMADA DE INTERFACE EM ALTA (resolução mista), com `?ui3x=pixel|lisa` na URL.
 *
 * O mundo continua em 384×216 (a arte aprovada e a Atmosfera intocadas). Por cima dele nasce um SEGUNDO canvas,
 * transparente, na resolução da TELA: 384·s × 216·s, onde `s` é a escala inteira em que o jogo aparece (3 numa
 * janela de 1152, 5 em 1080p). A câmera dele tem zoom `s`, então as cenas continuam escritas em coordenadas do
 * mundo — só o texto e a moldura ganham pixel mais fino.
 *
 * ⚠️ A razão camada:tela TEM que ser inteira, ou o pixel fino sai irregular. Por isso `s` acompanha a tela, e o
 * "pixel fino" da interface é o inteiro de pixels de tela mais perto de ⅔ do pixel do mundo (`pixelFino`).
 *
 * - `pixel`: a fonte pixel (Silkscreen) com o pixel fino — a identidade mantida, com mais resolução;
 * - `lisa`: uma fonte vetorial (Chakra Petch), suavizada na resolução da tela — a leitura máxima.
 */
export type EstiloHD = 'pixel' | 'lisa' | 'vozes';

/**
 * AS TRÊS VOZES (29/09, ideia do Henrique): cada fonte é uma voz, e uma tela fala com UMA voz só.
 * - `jogo`   — a marca: menu, título, fim de fase. Silkscreen no pixel da mista.
 * - `nave`   — o computador de bordo: alertas, nome da fase, legendas das cutscenes, a HUD. Monospace.
 * - `piloto` — o piloto decidindo: a mesa de cartas inteira. Chakra Petch, lisa (a leitura confortável).
 */
export type Voz = 'jogo' | 'nave' | 'piloto';

const VOZ_DA_CENA: Record<string, Voz> = {
  Menu: 'jogo',
  GameOver: 'jogo',
  Cartas: 'piloto',
  Game: 'nave',
  Interlude: 'nave',
  Interlude2: 'nave',
  Interlude3: 'nave',
  Interlude4: 'nave',
};

export const vozDaCena = (scene: Phaser.Scene): Voz => VOZ_DA_CENA[scene.scene.key] ?? 'jogo';

/**
 * A voz da nave: CHIVO MONO bold (29/09). A JetBrains foi aprovada e caiu no mesmo dia — as monos de programação
 * marcam o zero (ponto/risco) e o placar ficava "estranho" (ele). Das 18 monos livres medidas, só Azeret, B612 e
 * Chivo têm o zero limpo; a Chivo é a de proporção mais perto da aprovada. A Consolas (`?mono=consolas`) fica só
 * como referência: é da Microsoft, não pode ir no jogo publicado.
 */
export const MONOS: Record<string, { familia: string; arquivo?: string }> = {
  chivo: { familia: 'fonte-mono', arquivo: 'fonts/chivo-mono-700.woff2' },
  consolas: { familia: 'Consolas' },
};
let mono = MONOS.chivo;
export const familiaMono = (): string => mono.familia;

let jogo: Phaser.Game | null = null;
let estilo: EstiloHD | null = null;
let s = 3;

export const estiloHD = (): EstiloHD | null => estilo;
export const jogoHD = (): Phaser.Game | null => jogo;
export const ehHD = (scene: Phaser.Scene): boolean => jogo !== null && scene.game === jogo;
/** Pixels de tela por pixel do mundo, na camada HD. */
export const escalaHD = (): number => s;
/** Pixels de tela por pixel da interface fina: o inteiro mais perto de ⅔ do pixel do mundo. */
export const pixelFino = (): number => Math.max(1, Math.round((s * 2) / 3));

/** Carrega as texturas que as cenas da camada usam (a camada é outro jogo: não enxerga as do mundo). */
class BootHD extends Phaser.Scene {
  constructor() {
    super('BootHD');
  }
  preload(): void {
    const ids = ['WPN_001', 'WPN_002', 'WPN_004', 'WPN_007', 'WPN_008', 'EFF_001', 'EFF_004', 'EFF_006', 'DEF_001',
      'DEF_002', 'DEF_003', 'DEF_004', 'MOV_001'];
    ids.forEach((id) => this.load.image(`icone-${id}`, `sprites/cartas/icone-${id}.png`));
    ['comum', 'incomum', 'rara', 'epica'].forEach((r) => this.load.image(`carta-${r}`, `sprites/cartas/carta-${r}.png`));
  }
}

/** ESPELHO (só para as folhas): redesenha aqui, na camada HD, os textos de uma cena do mundo. */
export interface TextoEspelho {
  value: string;
  x: number;
  y: number;
  size: number;
  color: number;
  align: 'center' | 'left';
  stroke: number;
  ox: number;
  oy: number;
  alpha: number;
  /** A voz da cena de ORIGEM — no espelho, a cena é outra, e a voz não pode vir dela. */
  voz: Voz;
}

export async function criarCamadaHD(mundo: Phaser.Game, cenas: (typeof Phaser.Scene)[]): Promise<void> {
  const q = new URLSearchParams(location.search);
  const p = q.get('ui3x');
  if (p !== 'pixel' && p !== 'lisa' && p !== 'vozes') return;
  estilo = p;
  const carregar = async (familia: string, arquivo: string) => {
    const face = new FontFace(familia, `url(${arquivo})`);
    await face.load();
    (document.fonts as unknown as Set<FontFace>).add(face);
  };
  if (p !== 'pixel') await carregar('fonte-lisa', 'fonts/chakra-petch-600.woff2');
  if (p === 'vozes') {
    mono = MONOS[q.get('mono') ?? ''] ?? MONOS.chivo;
    if (mono.arquivo) await carregar(mono.familia, mono.arquivo);
  }

  await new Promise<void>((ok) => (mundo.isBooted ? ok() : mundo.events.once('ready', () => ok())));
  const r = mundo.canvas.getBoundingClientRect();
  s = Math.max(1, Math.round((r.width * (window.devicePixelRatio || 1)) / GAME_WIDTH));

  jogo = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: document.body,
    width: GAME_WIDTH * s,
    height: GAME_HEIGHT * s,
    transparent: true,
    pixelArt: true,
    roundPixels: true,
    scale: { mode: Phaser.Scale.NONE },
    scene: [BootHD, ...cenas],
    // Os cliques continuam no mundo (o canvas daqui não pega mouse); o teclado a cena daqui escuta na janela.
    input: { mouse: false, touch: false },
  });

  // O canvas da camada cobre EXATAMENTE o do mundo, a cada redimensionar.
  const alinhar = () => {
    const c = jogo?.canvas;
    if (!c) return;
    const m = mundo.canvas.getBoundingClientRect();
    Object.assign(c.style, {
      position: 'fixed', left: `${m.left}px`, top: `${m.top}px`, width: `${m.width}px`, height: `${m.height}px`,
      margin: '0', pointerEvents: 'none', zIndex: '2',
      imageRendering: estilo === 'lisa' ? 'auto' : 'pixelated',
    });
  };
  jogo.events.once('ready', alinhar);
  mundo.scale.on('resize', alinhar);
  window.addEventListener('resize', () => requestAnimationFrame(alinhar));
  if (import.meta.env.DEV) (window as unknown as { __gameHD: Phaser.Game }).__gameHD = jogo;
}

/** Cena da camada: a câmera em zoom `s` a partir do canto, para as coordenadas seguirem as do mundo. */
export function prepararCameraHD(scene: Phaser.Scene): void {
  scene.cameras.main.setOrigin(0, 0).setZoom(s).setScroll(0, 0);
}
