import { PERFIS } from '../../systems/atmosfera/perfis';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * FORA — capítulo 4, A FERIDA (spec §3). O arranjo que ele escolheu na folha de 24/09 (*"D com a lua espelhada
 * igual à lua do B"*): o biomecânico INTEIRO por cima da lua da colônia, que aparece PERTO, embaixo, com a
 * atmosfera acesa. O fundo é o céu do zero-G espelhado (`f8-fundo-ferida.png`) — a pintura da decolagem
 * reaproveitada, mas não igual ao começo. A queda do capítulo 5 vira consequência do que se vê: o corpo já está
 * sobre ela.
 *
 * O Leviatã é RECORTADO do conceito aprovado (`scripts/_f8/_recortar-leviata.mjs`), não gerado de novo. O corpo
 * vem com a lava APAGADA; a camada de lava por cima ESMORECE devagar, sem pulso — ele já está ABATIDO (24/09:
 * *"podemos manter o leviatã imovel e deixá-lo com o aspecto de já estar abatido"*). ⚠️ Tentei animar a região da
 * ferida pela v3 (o corpo inteiro não cabe nos 256): a emenda entre a parte animada e a cabeça parada QUEBRAVA —
 * ele reprovou. O movimento do plano é o que sai da ferida (*"já temos um movimento, que são expelidos do rasgo"*).
 * A nuvem que vinha no
 * conceito se desfaz em pontilhado (sobre este céu ela lia como mancha); o vazamento segue em partículas.
 *
 * ⚠️ A LUA É FIXA: ela é o próprio fundo, parado o plano todo (a regra física da spec — astro não cresce sem a
 * câmera ir até ele). A sonda cobra `escalasLua` com UM valor só.
 */
//
// ⚠️ 18/10 (bloco D) — O LEVIATÃ NOVO, no mesmo ângulo, com o mesmo rombo e o mesmo estado do de 24/09: o conceito
// aprovado EDITADO com a base nova de referência (casco de placas, cabeça de mandíbula, guelras), a edit-73 escolhida
// por ele, com o miolo amarelo da boca contido nos laranjas da lava antiga (`scripts/_leviata/_final-conceito.mjs`,
// `_recortar-novo.mjs`, `_conter-brilho.mjs`; folha `folhas/2026-10-18/leviata/angulo2/`). O recorte novo tem outra
// caixa no quadro (22, 33 em vez de 19, 41): a posição andou junto e a ferida ficou no MESMO ponto da tela (218, 75).
// O antigo está em `assets/raw/f8-leviata*-original.png`.
const LEV_X = 15;
const LEV_Y = -2;
/** A ferida, na tela: o rombo no meio da carcaça, de onde a nave sai (medida no recorte: x=203, y=77). */
const FERIDA_X = LEV_X + 203;
const FERIDA_Y = LEV_Y + 77;
/** A deriva do corpo no plano todo: devagar, para baixo e para a direita — rumo à lua (a queda começa aqui). */
const DERIVA_X = 10;
const DERIVA_Y = 16;
/** A lava das rachaduras: do corte ao fim do plano, esmorecendo. */
const LAVA_INICIO = 0.85;
const LAVA_FIM = 0.5;
/**
 * O tamanho da nave ao sair (18/10, ele: *"diminua a nave na animação de ser expelida ... vai melhorar a percepção
 * de tamanho entre a nave e o monstro"*). Fator ÚNICO sobre o sprite da nave (a humana em qualquer pintura, ou a
 * manta); só a distância até a câmera muda.
 */
const NAVE_ESCALA = 0.5;

export function montarFora(c: CenaFinal): Capitulo {
  const { scene, nave, estado } = c;
  estado.capitulo = 4;
  c.atm.perfil(PERFIS.vacuo);
  scene.cameras.main.resetFX();

  const fundo = scene.add.image(0, 0, 'f8FundoFerida').setOrigin(0, 0).setDepth(DEPTH.FUNDO);
  const corpo = scene.add.image(LEV_X, LEV_Y, 'f8Leviata').setOrigin(0, 0).setDepth(DEPTH.CENARIO);
  const lava = scene.add.image(LEV_X, LEV_Y, 'f8LeviataLava').setOrigin(0, 0).setDepth(DEPTH.CENARIO + 1);

  // O VAZAMENTO: o que ainda sai da ferida, devagar, sem gravidade (é vácuo) — fluido escuro e gotas de lava.
  const fluido = scene.add
    .particles(FERIDA_X + 10, FERIDA_Y, 'puff', {
      speedX: { min: 8, max: 26 },
      speedY: { min: -8, max: 8 },
      scale: { start: 0.6, end: 1.4 },
      alpha: { start: 0.55, end: 0 },
      tint: [0x2a0a10, 0x3a1016, 0x1a0c12],
      lifespan: 2600,
      frequency: 90,
    })
    .setDepth(DEPTH.CENARIO + 2);
  const gotas = scene.add
    .particles(FERIDA_X + 10, FERIDA_Y, 'f8SuccaoSheet', {
      frame: [2, 4, 5],
      speedX: { min: 10, max: 34 },
      speedY: { min: -12, max: 12 },
      rotate: { min: 0, max: 360 },
      lifespan: 3000,
      frequency: 260,
    })
    .setDepth(DEPTH.CENARIO + 2);

  const dur = T.QUEDA - T.FERIDA;
  // A LAVA ESMORECE: acesa no corte e cada vez mais fraca — o anúncio do capítulo 7, quando ela se apaga de vez.
  lava.setAlpha(LAVA_INICIO);
  scene.tweens.add({ targets: lava, alpha: LAVA_FIM, duration: dur, ease: 'Sine.easeIn' });
  scene.tweens.add({ targets: [corpo, lava, fluido, gotas], x: `+=${DERIVA_X}`, y: `+=${DERIVA_Y}`, duration: dur, ease: 'Sine.easeIn' });

  // A NAVE sai DA FERIDA rolando e CRESCENDO — o espelho de quando sumiu pela fenda, encolhendo (capítulo 3):
  // lá ela foi para dentro, aqui vem de dentro para fora. Estabiliza e se afasta, para cima e para a direita.
  nave.setVisible(true).setScale(0.15 * NAVE_ESCALA).setFlipX(false).setAngle(-540).setPosition(FERIDA_X, FERIDA_Y);
  scene.tweens.add({ targets: nave, scale: NAVE_ESCALA, duration: 1300, ease: 'Quad.easeOut' });
  scene.tweens.add({ targets: nave, angle: 0, x: FERIDA_X + 60, y: FERIDA_Y - 14, duration: 2200, ease: 'Cubic.easeOut' });
  scene.tweens.add({ targets: nave, x: 360, y: 26, delay: 2400, duration: dur - 2400, ease: 'Sine.easeInOut' });

  return {
    update() {
      estado.escalasLua.push(+fundo.scaleX.toFixed(3));
    },
    limpar() {
      [fundo, corpo, lava, fluido, gotas].forEach((o) => o.destroy());
    },
  };
}
