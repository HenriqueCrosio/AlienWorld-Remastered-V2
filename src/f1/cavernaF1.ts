import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../config';
import { CAVERNA_F1 } from './numerosF1';
import { derivaCaverna, posicoesCaverna, regiaoCaverna, salaoVisivel, type PosicoesCaverna } from './ritmosF1';
import { montarSalaoVivo, type LuzesSalao } from './salaoVivo';

/**
 * A CAVERNA DA F1 (21/10, a ideia dele — spec `2026-10-21-f1-caverna-design.md`). As quatro pinturas dele assadas por
 * `scripts/_g/_caverna-f1.mjs`:
 * - a FAIXA DE ROCHA (a "Parede de Caverna Vulcânica" que ele montou para esconder a caverna): a boca à esquerda — o lado
 *   de fora por ela, a borda ")" — e o lado direito recortado pela boca espelhada, a borda "(" — o salão depois dela.
 *   Ela passa NA FRENTE da nave, mais rápida que o mundo (uma camada perto da câmera), e cobre a tela INTEIRA por um
 *   instante: o lado de fora sai pela esquerda antes de o salão entrar pela direita, e a troca acontece atrás da rocha.
 *   A nave aparece pela AURA — a silhueta dela alargada é transparente na rocha; o resto fica sólido (a ideia dele:
 *   "isso esconde a transição e fica com uma cara mais profissional"). Nada abre, some ou esmaece;
 * - o SALÃO: o fundo, e o teto e o chão que mordem (a lei da borda da F4: uma medição, sem corpo físico) — só onde ele
 *   está à vista. É o perigo dele: rochas plantadas no salão (a rodada 2) liam flutuando e saíram ("as bordas já dão
 *   dano", ele, 21/10);
 * - a SAÍDA: a mesma faixa espelhada (o salão sai pela esquerda antes de o lado de fora entrar pela direita).
 * O fundo, o teto e o chão só aparecem no SALÃO (do meio de uma rocha ao meio da outra): uma GeometryMask redesenhada a
 * cada quadro. A mesma, invertida, esconde no salão o que do exterior fica na frente do fundo.
 * Tudo anda pela distância que o mundo andou desde o evento (`d`). A NAVE decide só o estado (no flap ela anda de lado):
 * a troca passou por ela → o tom é o da caverna e o relógio da invasão pausa; a troca da saída passou → volta.
 */

interface DadosCaverna {
  /** A largura da faixa. */
  largura: number;
  /** O fundo da boca por linha (o último x aberto da boca de fora; a borda de dentro é o espelho). */
  fundo: number[];
  fundoMeio: number;
  faixa: { chave: string };
  teto: { chave: string; w: number; h: number; contorno: number[] };
  chao: { chave: string; w: number; h: number; y: number; contorno: number[] };
  interior: { chave: string };
  /** As luzes do salão (`_luzes-caverna-f1.mjs`): as brasas por terço, as mais fortes, a abertura. */
  luzes?: LuzesSalao;
}

export const CHAVES_CAVERNA = { dados: 'f1-caverna' } as const;

export interface CavernaF1 {
  /** O evento do roteiro: a faixa da entrada começa a entrar pela direita. */
  iniciar(): void;
  /** `andado`: px que o mundo andou neste quadro; a nave: o estado e a aura. */
  atualizar(andado: number, nave: Phaser.GameObjects.Sprite): void;
  /** O teto/chão do salão morde a caixa da nave? */
  morde(esq: number, dir: number, topo: number, base: number): boolean;
  /** Aberta: da troca da entrada à troca da saída — o tom é o da caverna, o relógio da invasão pausa. */
  aberta(): boolean;
  /** Ativa: do evento até a faixa da saída passar inteira da borda esquerda. */
  ativa(): boolean;
  /** A máscara do exterior FORA do salão, para o entulho e o primeiro plano (que ficam na frente do fundo dele). */
  readonly mascaraInversa: Phaser.Display.Masks.GeometryMask;
}

/**
 * A AURA: a silhueta do quadro da nave alargada, assada uma vez por quadro numa textura de canvas. A máscara INVERTIDA dela
 * deixa a rocha a (1 − alfa da aura): até `dentro` px da silhueta, a rocha a `rocha[0]`; num anel de mais `anel` px, a
 * `rocha[1]` — a rocha continua pintada por cima da nave (ela lê como ATRÁS), em dois degraus de pixel, sem degradê.
 */
function texturaDaAura(scene: Phaser.Scene, frame: Phaser.Textures.Frame): string {
  const A = CAVERNA_F1.aura;
  const margem = A.dentro + A.anel;
  const chave = `aura:${frame.texture.key}:${frame.name}:${A.dentro}:${A.anel}:${A.rocha.join(':')}`;
  if (scene.textures.exists(chave)) return chave;
  const rw = frame.realWidth, rh = frame.realHeight;
  const w = rw + 2 * margem, h = rh + 2 * margem;
  const tex = scene.textures.createCanvas(chave, w, h);
  if (!tex) return '__WHITE';
  const ctx = tex.getContext();
  // `frame.x/y`: o deslocamento do recorte num quadro aparado (0 num quadro inteiro)
  ctx.drawImage(frame.source.image as CanvasImageSource, frame.cutX, frame.cutY, frame.cutWidth, frame.cutHeight, margem + frame.x, margem + frame.y, frame.cutWidth, frame.cutHeight);
  const de = ctx.getImageData(0, 0, w, h);
  const para = ctx.createImageData(w, h);
  // discos (o +r arredonda as diagonais): a distância ao pixel mais perto da nave decide o degrau
  const r2 = (r: number): number => r * r + r;
  const alfa = A.rocha.map((o) => Math.round(255 * (1 - o)));
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let melhor = Infinity;
    for (let dy = -margem; dy <= margem; dy++) for (let dx = -margem; dx <= margem; dx++) {
      const sx = x + dx, sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h || de.data[(sy * w + sx) * 4 + 3] === 0) continue;
      melhor = Math.min(melhor, dx * dx + dy * dy);
    }
    const a = melhor <= r2(A.dentro) ? alfa[0] : melhor <= r2(margem) ? alfa[1] : 0;
    if (a) para.data.set([255, 255, 255, a], (y * w + x) * 4);
  }
  ctx.putImageData(para, 0, 0);
  tex.refresh();
  return chave;
}

export function montarCaverna(scene: Phaser.Scene): CavernaF1 | null {
  const D = scene.cache.json.get(CHAVES_CAVERNA.dados) as DadosCaverna | undefined;
  if (!D) return null;
  if (![D.faixa.chave, D.teto.chave, D.chao.chave, D.interior.chave].every((k) => scene.textures.exists(k))) return null;
  const C = CAVERNA_F1;
  const L = D.largura;

  const interior = scene.add.image(0, 0, D.interior.chave).setOrigin(0, 0).setDepth(C.depth.fundo);
  const teto = scene.add.tileSprite(0, C.tetoY, GAME_WIDTH, D.teto.h, D.teto.chave).setOrigin(0, 0).setDepth(C.depth.bordas);
  const chao = scene.add.tileSprite(0, D.chao.y, GAME_WIDTH, D.chao.h, D.chao.chave).setOrigin(0, 0).setDepth(C.depth.bordas);
  const entrada = scene.add.image(0, 0, D.faixa.chave).setOrigin(0, 0).setDepth(C.depth.rocha);
  const saida = scene.add.image(0, 0, D.faixa.chave).setOrigin(0, 0).setDepth(C.depth.rocha).setFlipX(true);
  const todas = [interior, teto, chao, entrada, saida];
  for (const o of todas) o.setVisible(false);

  // O salão (do meio de uma rocha ao meio da outra — retas: a faixa é simétrica).
  const g = scene.make.graphics({}, false);
  const mascara = g.createGeometryMask();
  const mascaraInversa = g.createGeometryMask();
  mascaraInversa.setInvertAlpha(true);
  interior.setMask(mascara);
  teto.setMask(mascara);
  chao.setMask(mascara);
  // O SALÃO VIVO: as brasas, a bruma, os fachos, os halos e a poeira — presos à mesma máscara.
  const vida = montarSalaoVivo(scene, D.luzes, mascara, teto, chao);

  // A aura: uma imagem FORA da lista de exibição que copia a nave; a máscara invertida dela fura as duas faixas.
  const aura = scene.make.image({ x: 0, y: 0, key: '__WHITE' }, false);
  const mascaraAura = aura.createBitmapMask();
  mascaraAura.invertAlpha = true;
  entrada.setMask(mascaraAura);
  saida.setMask(mascaraAura);
  const seguirNave = (nave: Phaser.GameObjects.Sprite): void => {
    const chave = texturaDaAura(scene, nave.frame);
    if (aura.texture.key !== chave) aura.setTexture(chave);
    const margem = C.aura.dentro + C.aura.anel;
    aura
      .setOrigin((nave.displayOriginX + margem) / aura.width, (nave.displayOriginY + margem) / aura.height)
      .setPosition(nave.x, nave.y)
      .setRotation(nave.rotation)
      .setScale(nave.scaleX, nave.scaleY)
      .setFlip(nave.flipX, nave.flipY);
  };

  const linha = (y: number): number => D.fundo[Math.max(0, Math.min(D.fundo.length - 1, Math.round(y)))];
  const mod = (v: number, m: number): number => ((v % m) + m) % m;

  let ativa = false;
  let d = 0;
  let entrou = false;
  let saiu = false;

  /** Tudo no lugar para `d` (também no quadro do evento: sem isso as rochas piscavam UM quadro em x 0 — a sonda pegou). */
  const colocar = (p: PosicoesCaverna): void => {
    const [de, ate] = regiaoCaverna(p, L);
    entrada.setPosition(Math.round(p.entrada), 0);
    saida.setPosition(Math.round(p.saida), 0);
    interior.setPosition(derivaCaverna(d, (C.x0 + (p.saida - p.entrada) + L) / C.paralaxe), 0);
    teto.tilePositionX = Math.round(d);
    chao.tilePositionX = Math.round(d);
    g.clear();
    g.fillStyle(0xffffff, 1);
    const a = Math.max(0, Math.round(de)), b = Math.min(GAME_WIDTH, Math.round(ate));
    if (b > a) g.fillRect(a, 0, b - a, GAME_HEIGHT);
    vida?.atualizar(scene.time.now / 1000, d, interior.x);
  };

  return {
    mascaraInversa,
    iniciar(): void {
      ativa = true;
      d = 0;
      entrou = false;
      saiu = false;
      colocar(posicoesCaverna(0, D.fundoMeio, L));
      for (const o of todas) o.setVisible(true);
      vida?.mostrar(true);
    },
    atualizar(andado: number, nave: Phaser.GameObjects.Sprite): void {
      if (!ativa) return;
      d += andado;
      const p = posicoesCaverna(d, D.fundoMeio, L);
      const [de, ate] = regiaoCaverna(p, L);
      // O ESTADO: a troca da entrada / a da saída passou pela nave.
      if (!entrou && nave.x >= de) entrou = true;
      if (entrou && !saiu && nave.x >= ate) saiu = true;
      colocar(p);
      seguirNave(nave);

      // O FIM: a faixa da saída inteira passou da borda esquerda.
      if (p.saida + L < 0) {
        ativa = false;
        for (const o of todas) o.setVisible(false);
        vida?.mostrar(false);
        g.clear();
      }
    },
    morde(esq: number, dir: number, topo: number, base: number): boolean {
      if (!ativa || !entrou || saiu) return false;
      const p = posicoesCaverna(d, D.fundoMeio, L);
      // só onde o salão está À VISTA (atrás da rocha o teto e o chão não aparecem — não mordem)
      const [de, ate] = salaoVisivel(p, linha((topo + base) / 2), L);
      const td = Math.round(d);
      for (const x of [esq, dir]) {
        if (x < de || x > ate) continue;
        const tetoBaixo = C.tetoY + D.teto.contorno[mod(Math.floor(x) + td, D.teto.w)];
        const chaoAlto = D.chao.contorno[mod(Math.floor(x) + td, D.chao.w)];
        if (topo + C.mordida <= tetoBaixo || base - C.mordida >= chaoAlto) return true;
      }
      return false;
    },
    aberta(): boolean {
      return ativa && entrou && !saiu;
    },
    ativa(): boolean {
      return ativa;
    },
  };
}
