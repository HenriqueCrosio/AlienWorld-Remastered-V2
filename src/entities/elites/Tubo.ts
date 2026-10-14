import type Phaser from 'phaser';
import { GAME_HEIGHT } from '../../config';
import { ELITES } from '../../data/numerosElites';
import { esporosDoPulso, tuboAvanca, tuboCabe, tuboQuadro, varianteDe, type EstadoTubo } from '../../elitesRegras';
import type { ComportamentoElite, CtxElite, Sprite } from './tipos';

const T = ELITES.tubo;
/** As DUAS variações que ele aprovou (13/10): C, a coroa de dentes; D, a craca dupla. Alternam pela ordem de nascimento. */
const VARIANTES = ['C', 'D'] as const;
type Variante = (typeof VARIANTES)[number];
/** A HITBOX, fixa: a arte tem 35×28 (C) e 36×27 (D); 60% × 55% dela, centrada no MIOLO. Não cresce com o inchar. */
const CORPO = { w: 22, h: 16 };
/** O miolo da craca fica a 14px do pé: o centro da hitbox e do anel. */
const MIOLO = 14;
/** Os esporos nascem a este raio do miolo, já fora da boca. */
const RAIO_BOCA = 10;
/**
 * O PÉ DE RAÍZES (spec F4 §9.4): um sprite à parte, 52×11, desenhado para o chão com a linha da superfície na linha 3
 * (`scripts/_elites/_mao-f4b.mjs` → `PE`). Na FRENTE do Tubo: a gola cobre o pé reto dele e as raízes descem para
 * dentro da borda. Um por borda — a das costelas azuis (`f4FaixaB`) tem o dela; as outras, o da câmara A.
 */
const PE_SUP = 3, PE_H = 11;
const peDaBorda = (faixa: string): string => (faixa.replace(/\d+$/, '') === 'f4FaixaB' ? 'eliteTuboPeB' : 'eliteTuboPeA');

interface Estado {
  fase: EstadoTubo;
  t: number;
  variante: Variante;
  /** Preso ao TETO (espelhado na vertical)? Senão, ao chão. */
  teto: boolean;
  /** Onde ele está plantado, em coordenada de MUNDO: a parede rola, ele vai junto. */
  xMundo: number;
  /** Pulsos já dados nesta passagem. */
  pulsos: number;
  /** Há quanto tempo espera um lugar na parede. */
  espera: number;
  /** O pé de raízes (nasce no plantio). */
  pe: Phaser.GameObjects.Image | null;
}

/**
 * O TUBO PULSANTE (spec F4 §3) — o atirador da fase: preso à superfície da parede (chão ou teto), entra pela direita
 * ROLANDO COM ELA e sai pela esquerda. INCHA (o aviso) → PULSA uma nuvem de ESPOROS para dentro do corredor (spec F4
 * §9.3: não ferem, deixam a nave lenta);
 * 2 pulsos por passagem, o segundo defasado meio passo. Leva tiro o tempo todo: morto enquanto incha, não pulsa.
 * Antes de aparecer ele AGUARDA fora da tela um lugar na parede: entre duas mesas e longe da emenda de duas placas
 * (`tuboCabe`). O gesto sai do relógio do estado (`tuboQuadro`).
 */
export const TUBO: ComportamentoElite = {
  iniciar(e) {
    const s: Estado = {
      fase: 'aguarda',
      t: 0,
      variante: varianteDe((e.getData('ordem') as number | undefined) ?? 0, VARIANTES),
      // O `y` do roteiro só escolhe a parede: metade de cima = teto, metade de baixo = chão.
      teto: (e.getData('baseY') as number) < GAME_HEIGHT / 2,
      xMundo: 0,
      pulsos: 0,
      espera: 0,
      pe: null,
    };
    e.setData('elite', s);
    e.once('destroy', () => s.pe?.destroy());
    // Ancorado pelo PÉ (a última linha do quadro): no teto, espelhado, o pé é a linha de cima.
    e.setFlipX(false).setFlipY(s.teto).setOrigin(0.5, s.teto ? 0 : 1);
    vestirTubo(e, s, 0);
    e.setPosition(T.nasceX, e.y);
    e.setVisible(false);
    (e.body as Phaser.Physics.Arcade.Body).enable = false;
  },

  // A parede não para — nem com ele travado pelo elétrico. A posição sai SEMPRE da parede (o tranco do Tiro Pesado não o arranca).
  noChao(e, _dt, ctx) {
    const s = e.getData('elite') as Estado;
    if (s.fase === 'aguarda') return;
    const x = ctx.ganchos.parede.telaDe(s.xMundo);
    // Saiu pela esquerda. ⚠️ Antes de perguntar pela superfície: ela só responde para `xTela >= -128` (ver `Moldura`).
    if (x < -40) {
      e.destroy();
      return;
    }
    const sup = ctx.ganchos.parede.superficie(x, s.teto);
    e.setPosition(x, s.teto ? sup - T.afunda : sup + T.afunda);
    s.pe?.setPosition(x, sup);
  },

  atualizar(e, dt, ctx) {
    const s = e.getData('elite') as Estado;
    (e.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
    if (s.fase === 'aguarda') {
      s.espera += dt;
      const xMundo = Math.round(ctx.ganchos.parede.mundoDe(T.nasceX));
      if (s.espera >= T.esperaMaxS || tuboCabe(xMundo, ctx.ganchos.parede.mesas())) plantar(e, s, xMundo, ctx);
      return;
    }
    s.t += dt;
    const prox = tuboAvanca(s.fase, s.t, e.x, s.pulsos);
    if (prox !== s.fase) {
      s.fase = prox;
      s.t = 0;
      if (prox === 'pulsa') pulsar(e, s, ctx);
    }
    vestirTubo(e, s, tuboQuadro(s.fase, s.t));
  },

  intocavel(e) {
    const s = e.getData('elite') as Estado | undefined;
    return !s || s.fase === 'aguarda';
  },
};

/** Achou lugar: planta-se na parede (fora da tela, à direita) e passa a rolar com ela. */
function plantar(e: Sprite, s: Estado, xMundo: number, ctx: CtxElite): void {
  s.xMundo = xMundo;
  s.fase = 'rola';
  s.t = 0;
  e.setVisible(true);
  const xTela = ctx.ganchos.parede.telaDe(xMundo);
  s.pe = e.scene.add
    .image(xTela, 0, peDaBorda(ctx.ganchos.parede.faixa(xTela, s.teto)))
    .setFlipY(s.teto)
    .setOrigin(0.5, s.teto ? 1 - PE_SUP / PE_H : PE_SUP / PE_H)
    .setDepth(e.depth + 0.01);
  TUBO.noChao!(e, 0, ctx);
  const body = e.body as Phaser.Physics.Arcade.Body;
  body.enable = true;
  body.reset(e.x, e.y);
}

/** O PULSO: uma nuvem de esporos sai do miolo, para dentro do corredor (`esporosDoPulso`: orgânica, não um arco). */
function pulsar(e: Sprite, s: Estado, ctx: CtxElite): void {
  const cy = e.y + (s.teto ? MIOLO : -MIOLO);
  for (const solta of esporosDoPulso(s.teto, Math.random)) {
    ctx.ganchos.soltarEsporo(e.x + Math.cos(solta.ang) * RAIO_BOCA, cy + Math.sin(solta.ang) * RAIO_BOCA, solta);
  }
  s.pulsos++;
}

/**
 * Veste o quadro `quadro` do clipe `pulso` e põe a hitbox no MIOLO. O corpo do Arcade não espelha com o `flipY`: no
 * teto o pé é a linha de CIMA do quadro, e o miolo fica a `MIOLO` px abaixo dela.
 */
function vestirTubo(e: Sprite, s: Estado, quadro: number): void {
  const chave = `eliteTubo${s.variante}PulsoAnim${quadro}`;
  if (e.texture.key !== chave && e.scene.textures.exists(chave)) e.setTexture(chave);
  const b = e.body as Phaser.Physics.Arcade.Body;
  b.setSize(CORPO.w, CORPO.h, false);
  b.setOffset((e.width - CORPO.w) / 2, s.teto ? MIOLO - CORPO.h / 2 : e.height - MIOLO - CORPO.h / 2);
}
