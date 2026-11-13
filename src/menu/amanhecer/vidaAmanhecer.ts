import Phaser from 'phaser';
import { ALTURA, LARGURA } from '../numerosMenu';
import { lcg } from '../acaso';
import { brilho } from '../texturas';
import type { Peca } from '../cenario';
import { BRASAS, BRUMA, CAIXA_LAVA, CINZA, FOGO, FUMACA, LAVA, RAIOS, VEU } from './numerosAmanhecer';

/** Um grupo de pixels de fogo (ou de lava) da pintura, em px de jogo (`dados.json`, de `_camadas-amanhecer.mjs`). */
export interface Foco {
  x: number;
  y: number;
  w: number;
  h: number;
  /** a área, em px² de jogo */
  n: number;
}

export interface DadosAmanhecer {
  fogos: Foco[];
  lava: Foco[];
}

/** O que as peças do amanhecer recebem. */
export interface ContextoAmanhecer {
  scene: Phaser.Scene;
  /** Pixels da camada por pixel de jogo (4 na camada HD; 1 sem ela). */
  k: number;
  chave: (nome: string) => string;
  dados: DadosAmanhecer;
  /** A máscara `luz` (a claridade da pintura): o que passa por ela não cobre as silhuetas pretas. `null` sem WebGL. */
  mascara: Phaser.Display.Masks.BitmapMask | null;
  /** A máscara `nevoa` (a névoa pintada): a bruma só anda sobre ela. `null` sem WebGL. */
  mascaraNevoa: Phaser.Display.Masks.BitmapMask | null;
}

const ADD = Phaser.BlendModes.ADD;
type Faixa = readonly [number, number] | readonly number[];
const entre = (f: Faixa, r: number): number => f[0] + r * (f[1] - f[0]);
const frac = (v: number): number => v - Math.floor(v);
const centro = (f: Foco): { x: number; y: number } => ({ x: f.x + f.w / 2, y: f.y + f.h / 2 });

/** A cor entre duas (0xRRGGBB), `u` de 0 a 1. */
function misturar(a: number, b: number, u: number): number {
  const m = (d: number): number => Math.round(((a >> d) & 255) + (((b >> d) & 255) - ((a >> d) & 255)) * u);
  return (m(16) << 16) | (m(8) << 8) | m(0);
}

/**
 * A BRUMA do amanhecer: as faixas do menu da noite (`menu-fog-k`), nos cinzas da névoa pintada, mais lentas, só sobre
 * a névoa que a pintura já tem.
 */
export function montarBruma(ctx: ContextoAmanhecer): Peca {
  const { scene, k, mascaraNevoa: mascara } = ctx;
  const bandas = BRUMA.bandas.map((b, i) => {
    const sx = 1 - i * 0.095;
    const ts = scene.add.tileSprite(0, b.y, LARGURA, b.h, `menu-fog-${k}`).setOrigin(0).setDepth(2.05 + i * 0.01).setTint(b.tint).setAlpha(b.pico);
    ts.setTileScale(sx / k, b.h / 64 / k);
    if (mascara) ts.setMask(mascara);
    return { ts, vel: b.vel, sx };
  });
  return {
    atualizar(t: number): void {
      for (const b of bandas) b.ts.tilePositionX = (t * b.vel * k) / b.sx;
    },
  };
}

/**
 * OS RAIOS DE SOL: em cada abertura das nuvens, um leque de fachos (`menu-raio-k`) presos pela ponta à abertura, cada
 * um respirando no seu ritmo e balançando um nada. O acaso é o do menu (o mesmo leque a cada vez que ele abre).
 */
export function montarRaios(ctx: ContextoAmanhecer): Peca {
  const { scene, k, mascara } = ctx;
  const rnd = lcg(RAIOS.semente);
  const fachos = RAIOS.fontes.flatMap((f) =>
    Array.from({ length: f.n }, (_, i) => {
      // os ângulos repartidos pelo leque, com um desvio de até um terço do passo
      const passo = (f.ate - f.de) / (f.n - 1);
      const angulo = f.de + i * passo + (rnd() - 0.5) * passo * 0.66;
      const img = scene.add
        .image(f.x, f.y, `menu-raio-${k}`)
        .setOrigin(0, 0.5)
        .setDepth(2.07)
        .setTint(RAIOS.cor)
        .setBlendMode(ADD)
        .setScale(entre(f.comp, rnd()) / 192 / k, entre(f.larg, rnd()) / 24 / k);
      if (mascara) img.setMask(mascara);
      return { img, angulo, pico: f.pico * (0.7 + 0.3 * rnd()), dur: entre(RAIOS.respira, rnd()), fase: rnd() * Math.PI * 2, fase2: rnd() * Math.PI * 2 };
    }),
  );
  return {
    atualizar(t: number): void {
      for (const f of fachos) {
        const r = 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / f.dur + f.fase);
        f.img.setAlpha(f.pico * (RAIOS.minimo + (1 - RAIOS.minimo) * r));
        f.img.setAngle(f.angulo + RAIOS.balanco * Math.sin(t * 0.07 + f.fase2));
      }
    },
  };
}

/**
 * A FUMAÇA: cada coluna pintada solta baforadas escuras e macias (`menu-brilho` tingido de escuro) que sobem
 * inclinadas, crescem e se desfazem. Cada baforada é função pura do relógio (a fase dela no período).
 */
export function montarFumaca(ctx: ContextoAmanhecer): Peca {
  const { scene } = ctx;
  const rnd = lcg(FUMACA.semente);
  const baforadas = FUMACA.colunas.flatMap((c) =>
    Array.from({ length: FUMACA.porColuna }, (_, i) => ({
      c,
      img: scene.add.image(c.x, c.y, 'menu-brilho').setTint(FUMACA.cor).setDepth(2.06).setAlpha(0),
      periodo: entre(FUMACA.periodo, rnd()),
      // repartidas pelo período, para a coluna nunca ficar vazia
      fase: (i + rnd() * 0.6) / FUMACA.porColuna,
      vai: (rnd() - 0.5) * 2,
      gira: rnd() * Math.PI * 2,
    })),
  );
  return {
    atualizar(t: number): void {
      for (const b of baforadas) {
        const u = frac(t / b.periodo + b.fase);
        const c = b.c;
        b.img.setPosition(c.x + c.lean * u + b.vai * c.larg * 0.35 * u + Math.sin(u * 5 + b.gira) * 1.2, c.y - c.sobe * u);
        b.img.setScale(brilho(c.larg * (0.7 + 1.5 * u)));
        // entra depressa, some devagar
        b.img.setAlpha(FUMACA.pico * Math.min(1, u / 0.14) * Math.pow(1 - u, 1.3));
      }
    },
  };
}

/**
 * O FOGO: um clarão macio e aditivo em cada um dos maiores focos da pintura, tremulando (duas ondas rápidas somadas,
 * cada foco no seu ritmo). A chama pintada não se mexe; a luz dela, sim.
 */
export function montarFogo(ctx: ContextoAmanhecer): Peca {
  const { scene, dados } = ctx;
  const rnd = lcg(FOGO.semente);
  const D = FOGO.diam;
  const focos = dados.fogos
    .filter((f) => f.n >= FOGO.areaMin)
    .slice(0, FOGO.quantos)
    .map((f) => {
      const p = centro(f);
      const img = scene.add
        .image(p.x, p.y, 'menu-brilho')
        .setBlendMode(ADD)
        .setTint(FOGO.cor)
        .setDepth(2.08)
        .setScale(brilho(Math.min(D.teto, D.base + Math.sqrt(f.n) * D.fator)));
      return { img, base: entre(FOGO.alfa, rnd()), w1: entre(FOGO.onda1, rnd()), w2: entre(FOGO.onda2, rnd()), f1: rnd() * 7, f2: rnd() * 7 };
    });
  return {
    atualizar(t: number): void {
      for (const f of focos) f.img.setAlpha(f.base * (0.55 + 0.27 * Math.sin(t * f.w1 + f.f1) + 0.18 * Math.sin(t * f.w2 + f.f2)));
    },
  };
}

/**
 * AS BRASAS: poucas, subindo da lava da carcaça e dos focos maiores. Cada uma é função pura do relógio: a fase dela
 * na própria vida dá a altura, o balanço, a cor (esfriando) e o quanto aparece.
 */
export function montarBrasas(ctx: ContextoAmanhecer): Peca {
  const { scene, dados } = ctx;
  const rnd = lcg(BRASAS.semente);
  // de onde saem: a lava (pesada pela área) e os focos maiores
  const lava = dados.lava.flatMap((f) => Array.from({ length: Math.max(1, Math.round(f.n / 3)) }, () => f));
  const focos = dados.fogos.slice(0, BRASAS.focos);
  const brasas = Array.from({ length: BRASAS.quantas }, (_, i) => {
    const lista = i < BRASAS.daCarcaca && lava.length ? lava : focos.length ? focos : lava;
    const f = lista[Math.floor(rnd() * lista.length)];
    return {
      img: scene.add.image(0, 0, 'menu-px').setBlendMode(ADD).setDepth(2.2).setAlpha(0).setScale(entre(BRASAS.tamanho, rnd())),
      x: f ? f.x + rnd() * f.w : LARGURA / 2,
      y: f ? f.y + rnd() * f.h : ALTURA / 2,
      vida: entre(BRASAS.vida, rnd()),
      fase: rnd(),
      sobe: entre(BRASAS.sobe, rnd()),
      balanco: entre(BRASAS.balanco, rnd()),
      deriva: entre(BRASAS.deriva, rnd()),
      alfa: entre(BRASAS.alfa, rnd()),
      gira: rnd() * Math.PI * 2,
    };
  });
  const [quente, meio, fria] = BRASAS.cores;
  return {
    atualizar(t: number): void {
      for (const b of brasas) {
        const u = frac(t / b.vida + b.fase);
        // sobe depressa no começo e vai perdendo o empuxo
        const alto = 1 - Math.pow(1 - u, 1.6);
        b.img.setPosition(b.x + b.deriva * u + Math.sin(u * 7 + b.gira) * b.balanco * u, b.y - b.sobe * alto);
        b.img.setTint(u < 0.4 ? misturar(quente, meio, u / 0.4) : misturar(meio, fria, (u - 0.4) / 0.6));
        // acende num instante, cintila, apaga ao esfriar
        b.img.setAlpha(b.alfa * Math.min(1, u / 0.06) * Math.pow(1 - u, 0.8) * (0.75 + 0.25 * Math.sin(t * 9 + b.gira)));
      }
    },
  };
}

/**
 * A LAVA QUASE APAGADA: a carcaça SEM a lava (a peça `lava-apagada`, assada por difusão dos vizinhos) fica por cima da
 * pintura, recortada em faixas, e cada faixa respira no seu ritmo: quanto mais opaca, mais fria. A lava da pintura
 * aparece por baixo, como brasa.
 */
export function montarLava(ctx: ContextoAmanhecer): Peca {
  const { scene, k, chave } = ctx;
  if (!scene.textures.exists(chave('lava'))) return { atualizar: () => {} };
  if (k > 1) scene.textures.get(chave('lava')).setFilter(Phaser.Textures.FilterMode.LINEAR);
  const rnd = lcg(LAVA.semente);
  const C = CAIXA_LAVA;
  const larg = (C.w * k) / LAVA.zonas;
  const zonas = Array.from({ length: LAVA.zonas }, (_, i) => ({
    // abaixo da bruma e de tudo o que vive: é a própria pintura que muda
    img: scene.add.image(C.x, C.y, chave('lava')).setOrigin(0).setScale(1 / k).setDepth(0.5).setCrop(Math.floor(i * larg), 0, Math.ceil(larg), C.h * k),
    periodo: entre(LAVA.periodo, rnd()),
    fase: rnd() * Math.PI * 2,
  }));
  return {
    atualizar(t: number): void {
      for (const z of zonas) z.img.setAlpha(entre(LAVA.apagada, 0.5 + 0.5 * Math.sin((2 * Math.PI * t) / z.periodo + z.fase)));
    },
  };
}

/**
 * O VÉU DE FUMAÇA E NEBLINA: lençóis largos da textura de bruma, esticados, sobre a tela inteira e na frente de tudo
 * (sem máscara: é o ar entre o olho e a colônia), cada um na sua velocidade, engrossando e afinando devagar.
 */
export function montarVeu(ctx: ContextoAmanhecer): Peca {
  const { scene, k } = ctx;
  const lencois = VEU.lencois.map((l, i) => {
    const ts = scene.add.tileSprite(0, l.y, LARGURA, l.h, `menu-fog-${k}`).setOrigin(0).setDepth(2.61 + i * 0.005).setTint(l.tint);
    ts.setTileScale(l.largura / k, l.h / 64 / k);
    return { ts, l, fase: i * 1.7 };
  });
  return {
    atualizar(t: number): void {
      for (const { ts, l, fase } of lencois) {
        ts.tilePositionX = (t * l.vel * k) / l.largura + fase * 97 * k;
        ts.setAlpha(l.pico * (VEU.minimo + (1 - VEU.minimo) * (0.5 + 0.5 * Math.sin((2 * Math.PI * t) / l.respira + fase))));
      }
    },
  };
}

/**
 * A CINZA: flocos claros caindo devagar pela tela inteira, na frente de tudo. Cada floco é função pura do relógio (cai,
 * deriva para a esquerda com o vento da bruma, balança, e dá a volta na tela).
 */
export function montarCinza(ctx: ContextoAmanhecer): Peca {
  const { scene } = ctx;
  const rnd = lcg(CINZA.semente);
  const ALTO = ALTURA + 12;
  const flocos = Array.from({ length: CINZA.quantos }, () => ({
    img: scene.add.image(0, 0, 'menu-px').setTint(CINZA.cor).setDepth(2.65).setAlpha(entre(CINZA.alfa, rnd())).setScale(entre(CINZA.tamanho, rnd())),
    x: rnd() * LARGURA,
    y: rnd() * ALTO,
    cai: entre(CINZA.cai, rnd()),
    deriva: entre(CINZA.deriva, rnd()),
    balanco: entre(CINZA.balanco, rnd()),
    ritmo: 0.4 + rnd() * 0.6,
    gira: rnd() * Math.PI * 2,
  }));
  return {
    atualizar(t: number): void {
      for (const f of flocos) {
        const x = f.x + f.deriva * t + Math.sin(t * f.ritmo + f.gira) * f.balanco;
        f.img.setPosition(frac(x / LARGURA) * LARGURA, frac((f.y + f.cai * t) / ALTO) * ALTO - 6);
      }
    },
  };
}
