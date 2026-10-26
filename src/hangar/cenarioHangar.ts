import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { garantirTexturas, brilho } from '../menu/texturas';
import { lcg } from '../menu/acaso';
import { FAROIS, HALOS, LADO, LADOS, LAMPADAS, MOTOR, NEVOA, SELECAO, SETA, type Lado } from './numerosHangar';
import { alfaVeu, andamentoPintura, andamentoSeta, forcaMotor, type EstadoHangar } from './escolha';

/**
 * O CENÁRIO DO HANGAR (25/10, à noite): a pintura dele em camadas (`scripts/_hangar/_camadas.mjs`), viva no nível do
 * menu (`docs/CENARIO-VIVO.md`), com a névoa pesada que ele pediu fora do bloco — *"para parecer mais as luzes do que
 * detalhes, focar na escolha da nave e não no cenário"*:
 *   - o FUNDO já vem com a névoa assada fora do bloco; por cima dele correm faixas de bruma (atrás da baia), e as
 *     luzes de fora viram halos que respiram e tremulam; os faróis vermelhos piscam;
 *   - a BAIA (o bloco do hangar, nítido) cobre a bruma; as lâmpadas frias do teto descem cones de luz (a poeira da
 *     Atmosfera passa por eles);
 *   - a ESCOLHA: a seta sobre a nave escolhida, o anel do pad aceso, a outra nave na sombra; a pintura nova varre a
 *     nave; na confirmação o motor acende e o véu fecha.
 * Tudo em pixels de jogo; uma textura de camada tem `k` px por px de jogo e entra com `setScale(1 / k)`.
 */

export interface CaixaHangar {
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface LuzHangar extends CaixaHangar {
  tipo: 'quente' | 'farol' | 'lampada';
  noBloco: boolean;
  n: number;
  cor: [number, number, number];
}
/** O `dados.json` de `_camadas.mjs` (tudo em px de jogo, menos `w`/`h`, na densidade da camada). */
export interface DadosHangar {
  k: number;
  w: number;
  h: number;
  naves: Record<Lado, CaixaHangar & { pinturas: string[] }>;
  aneis: Record<Lado, CaixaHangar & { cx: number; cy: number; rx: number; ry: number }>;
  luzes: LuzHangar[];
}

const imagensHangar = (): string[] => [
  'fundo', 'baia', 'anel-esq', 'anel-dir',
  ...LADOS.flatMap((l) => LADO[l].pinturas.map((p) => `nave-${l}-${p}`)),
];

/** Põe na fila do `load` as camadas do hangar de uma densidade (`sprites/hangar/k4` ou `k1`); o que já está, pula. */
export function carregarCamadasHangar(load: Phaser.Loader.LoaderPlugin, prefixo: string, pasta: string): void {
  for (const n of imagensHangar()) if (!load.scene.textures.exists(`${prefixo}-${n}`)) load.image(`${prefixo}-${n}`, `${pasta}/${n}.png`);
  if (!load.scene.cache.json.exists(`${prefixo}-dados`)) load.json(`${prefixo}-dados`, `${pasta}/dados.json`);
}

const corHex = ([r, g, b]: readonly number[]): number => (r << 16) | (g << 8) | b;
/** A tinta entre branco (1) e a apagada (0). */
const tintaSelecao = (u: number): number => {
  const a = SELECAO.apagada;
  const c = (sh: number) => Math.round(((a >> sh) & 255) + (255 - ((a >> sh) & 255)) * u);
  return (c(16) << 16) | (c(8) << 8) | c(0);
};

/** A textura da seta (pixel art, 1 texel por px de jogo). */
function garantirSeta(scene: Phaser.Scene): void {
  if (scene.textures.exists('hangar-seta')) return;
  const w = SETA.desenho[0].length, h = SETA.desenho.length;
  const t = scene.textures.createCanvas('hangar-seta', w, h);
  if (!t) return;
  const hex = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
  SETA.desenho.forEach((linha, y) => [...linha].forEach((ch, x) => {
    if (ch === ' ') return;
    t.context.fillStyle = hex(ch === '+' ? SETA.borda : ch === '.' ? SETA.contorno : SETA.cor);
    t.context.fillRect(x, y, 1, 1);
  }));
  t.refresh();
}

export class CenarioHangar {
  private readonly atualizacoes: ((t: number) => void)[] = [];

  private constructor(
    private readonly scene: Phaser.Scene,
    private readonly k: number,
    private readonly chave: (n: string) => string,
    private readonly D: DadosHangar,
    private readonly estado: EstadoHangar,
    profundidadeVeu: number,
  ) {
    const A = scene.add;
    A.image(0, 0, chave('fundo')).setOrigin(0).setScale(1 / k).setDepth(0);
    this.nevoa();
    this.luzesDeFora();
    A.image(0, 0, chave('baia')).setOrigin(0).setScale(1 / k).setDepth(2);
    this.luzesDaBaia();
    this.escolha();
    // A bruma rala da frente, só embaixo do deque.
    const f = NEVOA.frente;
    const frente = A.tileSprite(0, f.y, GAME_WIDTH, f.h, `menu-fog-${k}`).setOrigin(0).setDepth(2.6).setTint(NEVOA.cor).setAlpha(f.pico);
    frente.setTileScale(1 / k, f.h / 64 / k);
    this.atualizacoes.push((t) => (frente.tilePositionX = t * f.vel * k * -1));
    const veu = A.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1).setOrigin(0).setDepth(profundidadeVeu);
    this.atualizacoes.push(() => veu.setAlpha(alfaVeu(estado)));
  }

  /** Monta o cenário com as camadas `prefixo` já carregadas; `null` se elas não estão lá. */
  static criar(scene: Phaser.Scene, k: number, prefixo: string, estado: EstadoHangar, profundidadeVeu: number): CenarioHangar | null {
    const chave = (n: string): string => `${prefixo}-${n}`;
    const faltam = imagensHangar().filter((n) => !scene.textures.exists(chave(n)));
    const D = scene.cache.json.get(chave('dados')) as DadosHangar | undefined;
    if (faltam.length || !D) {
      console.warn('[hangar] as camadas não chegaram — a cena abre sem o cenário', faltam);
      return null;
    }
    garantirTexturas(scene, k);
    garantirSeta(scene);
    // A pintura é a única coisa que a camada AMPLIA: suave, não em blocos (a camada é `pixelArt`).
    if (k > 1) for (const n of imagensHangar()) scene.textures.get(chave(n)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    return new CenarioHangar(scene, k, chave, D, estado, profundidadeVeu);
  }

  atualizar(): void {
    const t = this.estado.t;
    for (const f of this.atualizacoes) f(t);
  }

  // ─── a névoa e as luzes de fora ──────────────────────────────────────────────────────────────────────────────────

  private nevoa(): void {
    const { scene, k } = this;
    NEVOA.bandas.forEach((b, i) => {
      const sx = 1 - i * 0.11;
      const ts = scene.add.tileSprite(0, b.y, GAME_WIDTH, b.h, `menu-fog-${k}`).setOrigin(0).setDepth(1 + i * 0.05).setTint(NEVOA.cor).setAlpha(b.pico);
      ts.setTileScale(sx / k, b.h / 64 / k);
      this.atualizacoes.push((t) => (ts.tilePositionX = (-t * b.vel * k) / sx));
    });
  }

  private luzesDeFora(): void {
    const { scene, D } = this;
    const ADD = Phaser.BlendModes.ADD;
    const r = lcg(HALOS.semente);
    const fora = D.luzes.filter((l) => l.tipo === 'quente' && !l.noBloco).slice(0, HALOS.quantidade);
    for (const l of fora) {
      const d = Math.min(HALOS.max, Math.max(HALOS.min, HALOS.fator * Math.max(l.w, l.h)));
      const o = scene.add.image(l.x, l.y, 'menu-brilho').setBlendMode(ADD).setTint(corHex(l.cor)).setDepth(1.4)
        .setScale(brilho(d * (l.w > l.h * 2 ? 1.5 : 1)), brilho(d * (l.h > l.w * 2 ? 1.5 : 1)));
      const base = HALOS.alfa.base + r() * HALOS.alfa.var;
      const per = HALOS.per.min + r() * HALOS.per.var;
      const fase = r() * 6;
      const tremula = d < 8 && r() < HALOS.tremula;
      this.atualizacoes.push((t) => {
        let a = base * (0.75 + 0.25 * Math.sin((t * 2 * Math.PI) / per + fase));
        if (tremula) a *= 0.6 + 0.4 * Math.abs(Math.sin(t * 7.3 + fase * 3));
        o.setAlpha(a);
      });
    }
    this.farois(false);
  }

  /** Os faróis (de fora, ou os do bloco): os vizinhos piscam juntos. */
  private farois(noBloco: boolean): void {
    const { scene, D } = this;
    const r = lcg(noBloco ? 0xfa201 : 0xfa202);
    const lista = D.luzes.filter((l) => l.tipo === 'farol' && l.noBloco === noBloco);
    const fases: { x: number; y: number; f: number }[] = [];
    for (const l of lista) {
      const viz = fases.find((p) => Math.abs(p.x - l.x) <= 12 && Math.abs(p.y - l.y) <= 4);
      const fase = viz ? viz.f : r() * FAROIS.ciclo;
      if (!viz) fases.push({ x: l.x, y: l.y, f: fase });
      const o = scene.add.image(l.x, l.y, 'menu-brilho').setBlendMode(Phaser.BlendModes.ADD).setTint(FAROIS.cor)
        .setDepth(noBloco ? 2.06 : 1.45).setScale(brilho(FAROIS.diametro));
      this.atualizacoes.push((t) => o.setAlpha((t + fase) % FAROIS.ciclo < FAROIS.aceso ? FAROIS.alfa : 0));
    }
  }

  // ─── a baia ──────────────────────────────────────────────────────────────────────────────────────────────────────

  private luzesDaBaia(): void {
    const { scene, D } = this;
    const ADD = Phaser.BlendModes.ADD;
    // As faixas âmbar mais fortes do bloco ganham um halo baixo, respirando devagar (volume, não detalhe).
    const r = lcg(0xba1a);
    for (const l of D.luzes.filter((x) => x.tipo === 'quente' && x.noBloco).slice(0, 12)) {
      const d = Math.min(26, Math.max(6, 2.4 * Math.max(l.w, l.h)));
      const o = scene.add.image(l.x, l.y, 'menu-brilho').setBlendMode(ADD).setTint(corHex(l.cor)).setDepth(2.05)
        .setScale(brilho(l.w > l.h ? d * 1.4 : d * 0.7), brilho(l.h > l.w ? d * 1.4 : d * 0.7));
      const fase = r() * 6, per = 3 + r() * 3;
      this.atualizacoes.push((t) => o.setAlpha(0.16 + 0.06 * Math.sin((t * 2 * Math.PI) / per + fase)));
    }
    this.farois(true);
    // Os cones das lâmpadas frias, para baixo.
    D.luzes.filter((l) => l.tipo === 'lampada').forEach((l, i) => {
      const o = scene.add.image(l.x, l.y + 1, 'menu-cone').setOrigin(0, 0.5).setAngle(90).setBlendMode(ADD).setTint(LAMPADAS.cor)
        .setDepth(2.1).setScale(LAMPADAS.comprimento / 256, LAMPADAS.largura);
      this.atualizacoes.push((t) => o.setAlpha(LAMPADAS.alfa * (1 - LAMPADAS.tremor * (1 + Math.sin(t * 17 + i * 2.1)) - (Math.sin(t * 0.7 + i) > 0.985 ? 0.4 : 0))));
    });
  }

  // ─── a escolha ───────────────────────────────────────────────────────────────────────────────────────────────────

  private escolha(): void {
    const { scene, D, k, chave, estado } = this;
    const ADD = Phaser.BlendModes.ADD;
    for (const lado of LADOS) {
      const N = D.naves[lado];
      const A = D.aneis[lado];
      // O pad aceso: o brilho macio e o próprio anel somado de novo.
      const pad = scene.add.image(A.cx, A.cy, 'menu-brilho').setBlendMode(ADD).setTint(SELECAO.pad.cor).setDepth(2.2)
        .setScale(brilho(A.rx * SELECAO.pad.largura), brilho(A.ry * SELECAO.pad.altura));
      const anel = scene.add.image(A.x, A.y, chave(`anel-${lado}`)).setOrigin(0).setScale(1 / k).setBlendMode(ADD).setDepth(2.21);
      // A nave: a pintura atual por baixo; a de antes por cima, recortada, enquanto a nova varre.
      const pinturas = LADO[lado].pinturas;
      const atual = scene.add.image(N.x, N.y, chave(`nave-${lado}-${pinturas[0]}`)).setOrigin(0).setScale(1 / k).setDepth(2.4);
      const antes = scene.add.image(N.x, N.y, chave(`nave-${lado}-${pinturas[0]}`)).setOrigin(0).setScale(1 / k).setDepth(2.41).setVisible(false);
      // A linha da varredura: só na altura do casco (não desce no deque).
      const varredura = scene.add.image(N.x, N.y + N.h * 0.42, 'menu-px').setOrigin(0.5).setBlendMode(ADD).setTint(0xfff1c9).setDepth(2.42)
        .setDisplaySize(1, N.h * 0.5).setVisible(false);
      // O motor (só acende na confirmação).
      const B = LADO[lado].bocal;
      const chama = scene.add.image(B.x, B.y, `menu-raio-${k}`).setOrigin(B.dir < 0 ? 1 : 0, 0.5).setBlendMode(ADD).setTint(MOTOR.chama).setDepth(2.45).setAlpha(0);
      const nucleo = scene.add.image(B.x, B.y, 'menu-brilho').setBlendMode(ADD).setTint(MOTOR.nucleo).setDepth(2.46).setAlpha(0);
      const largura = (scene.textures.get(chave(`nave-${lado}-${pinturas[0]}`)).getSourceImage() as HTMLImageElement).width;

      this.atualizacoes.push((t) => {
        const escolhido = estado.lado === lado;
        // A seleção acende em `TEMPO.seta`: a nova sobe de 0 a 1, a de antes desce.
        const u = andamentoSeta(estado);
        const luz = escolhido ? (estado.ladoAntes === lado ? 1 : u) : estado.ladoAntes === lado ? 1 - u : 0;
        const S = SELECAO.anel;
        const flare = estado.tConfirmou !== null && escolhido ? 1 + 1.5 * Math.max(0, 1 - (t - estado.tConfirmou) / 0.5) : 1;
        anel.setAlpha(luz * Math.min(1, (S.base + S.amp * Math.sin((t * 2 * Math.PI) / S.per)) * flare));
        pad.setAlpha(luz * SELECAO.pad.alfa * flare);
        atual.setTexture(chave(`nave-${lado}-${pinturas[estado.pinturas[lado]]}`)).setTint(tintaSelecao(luz));
        // A pintura nova varre a nave da ponta da esquerda para a direita.
        const v = andamentoPintura(estado);
        const varrendo = estado.ladoPintura === lado && v < 1;
        antes.setVisible(varrendo);
        varredura.setVisible(varrendo);
        if (varrendo) {
          const corte = Math.round(largura * v);
          antes.setTexture(chave(`nave-${lado}-${pinturas[estado.pinturaAntes]}`)).setTint(tintaSelecao(luz)).setCrop(corte, 0, largura - corte, 9999);
          varredura.setX(N.x + corte / k).setAlpha(0.8 * Math.sin(Math.PI * v));
        }
        // O motor.
        const m = escolhido ? forcaMotor(estado) : 0;
        const tremor = 0.85 + 0.15 * Math.sin(t * 41) * Math.sin(t * 23);
        chama.setAlpha(m * 0.9 * tremor).setScale(((MOTOR.comprimento / 192) * m) / k, 0.5 / k);
        nucleo.setAlpha(m * tremor).setScale(brilho(MOTOR.diametro * (0.6 + 0.4 * m)));
      });
    }
    // A seta: desliza de um lado ao outro e balança devagar, com um brilho âmbar atrás.
    const brilhoSeta = scene.add.image(0, 0, 'menu-brilho').setBlendMode(ADD).setTint(SETA.cor).setDepth(2.99)
      .setScale(brilho(SETA.brilho.diametro)).setAlpha(SETA.brilho.alfa);
    const seta = scene.add.image(0, 0, 'hangar-seta').setOrigin(0.5, 0).setDepth(3);
    const centro = (l: Lado) => D.naves[l].x + D.naves[l].w / 2;
    this.atualizacoes.push((t) => {
      const u = andamentoSeta(estado);
      const x = centro(estado.ladoAntes) + (centro(estado.lado) - centro(estado.ladoAntes)) * u;
      const y = D.naves[estado.lado].y - SETA.acima + SETA.balanco.px * Math.sin((t * 2 * Math.PI) / SETA.balanco.per);
      const pisca = estado.tConfirmou !== null ? (Math.floor((t - estado.tConfirmou) * 12) % 2 === 0 ? 1 : 0.25) : 1;
      seta.setPosition(Math.round(x), Math.round(y)).setAlpha(pisca);
      brilhoSeta.setPosition(Math.round(x), Math.round(y) + 3).setAlpha(SETA.brilho.alfa * pisca);
    });
  }
}
