import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../../config';
import { Predador } from '../../entities/Predador';
import { SOBE_ACIMA_PX } from '../../entities/fimDoPredador';
import { Music } from '../../systems/Music';
import { PERFIS } from '../../systems/atmosfera/perfis';
import { T } from './tempos';
import { DEPTH, type CenaFinal, type Capitulo } from './tipos';

/**
 * DENTRO — capítulos 1 a 3 (spec §3). Abre NA CÂMARA D, sem corte: o fundo é a fotografia do último
 * quadro da luta (`f8Costura`) ou, pelo menu, a pintura dela (`paintBgF4d`). A poça do fim do predador
 * continua VIVA por cima, na mesma altura em que o `afundarNaLava` a deixou — é o que esconde a troca.
 *
 *   1 · CONVULSÃO (1,5s) — o núcleo pulsa; o tempo de reconhecer onde se está.
 *   2 · O ESTOURO — a parede da direita ARREBENTA num corte seco, escondido pelos pedaços; a música morre.
 *   3 · DESCOMPRESSÃO — o vácuo puxa tudo pelo rasgo e arranca a nave girando.
 */

/** A crista da poça: a mesma conta do `afundarNaLava` (superfície + o que ela sobe acima dela). */
const CRISTA = Predador.CHAO_APOIO - SOBE_ACIMA_PX;
const LAVA_QUADRO_MS = 110;
/** A região da parede que pulsa (256×216, o limite da v3) — a mesma de `scripts/_f8/_gerar-pulso.mjs`. */
const PULSO_X = 128;
/** Abaixo do teto da moldura da arena final: o que a cena anima é a PINTURA, nunca a borda do jogo. */
const TOPO = 32;
const PULSO_MS = 110;
/** A caixa do rasgo na tela (`scripts/_f8/_rasgo-caixa.json`, a caixa da máscara do conceito aprovado). */
// ⚠️ A caixa começa em y=38, ABAIXO do teto da moldura: o rasgo se FECHA por dentro, com um lábio de
// membrana (2ª rodada, 24/09). Antes ele ia até o topo e um recorte em y=32 o cortava numa linha reta.
const RASGO_X = 204;
const RASGO_Y = 37;
/** O fundo do buraco — onde tudo é sugado e onde a nave SOME (medido no rasgado, `_rasgado-cheio.png`). */
const BURACO_X = 292;
const BURACO_Y = 112;
/** Os quadros bons da folha das bordas (o 8 da v3 desmancha — ver `_gerar-rasgo.mjs`). */
const RASGO_QUADROS = 8;
const RASGO_MS = 95;

export function montarDentro(c: CenaFinal, fundo: 'f8Costura' | 'paintBgF4d'): Capitulo {
  const { scene, nave, estado } = c;
  const objetos: Phaser.GameObjects.GameObject[] = [];
  const eventos: Phaser.Time.TimerEvent[] = [];
  estado.capitulo = 1;
  estado.fundo = fundo;
  c.atm.perfil(PERFIS.viscera);

  objetos.push(scene.add.image(0, 0, fundo).setOrigin(0, 0).setDepth(DEPTH.FUNDO));

  // A POÇA VIVA — o mesmo TileSprite do fim do predador, parado na crista.
  const poca = scene.add
    .tileSprite(0, GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT - CRISTA, 'f4LavaSheet', 0)
    .setOrigin(0, 1)
    .setDepth(DEPTH.CENARIO);
  objetos.push(poca);
  let quadro = 0;
  eventos.push(
    scene.time.addEvent({
      delay: LAVA_QUADRO_MS,
      loop: true,
      callback: () => {
        quadro = (quadro + 1) % 8;
        poca.setFrame(quadro);
      },
    }),
  );

  // ─── 1 · CONVULSÃO: o NÚCLEO PULSA (a própria pintura animada pela v3, `_gerar-pulso.mjs`) ───
  // ⚠️ As rachas assadas foram reprovadas (*"lembram teias"*). E o tremor forte também: ele leu a 1ª versão
  // como *"só a tela tremendo"* — que era verdade, porque a folha da pulsação nem carregava (a troca no
  // BootScene tinha falhado em silêncio). Tremor agora é só um fio; quem mexe é a parede.
  const variante = new URLSearchParams(window.location.search).get('pulso') === '17' ? 'f8Pulso17' : 'f8Pulso3';
  const pulso = scene.add.image(PULSO_X, 0, variante, 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 1);
  pulso.setCrop(0, TOPO, 256, CRISTA - TOPO);
  objetos.push(pulso);
  estado.rachadura = 0;
  let qp = 0;
  let sentido = 1;
  const nPulso = pulso.texture.frameTotal - 1; // o Phaser conta o `__BASE`
  eventos.push(
    scene.time.addEvent({
      delay: PULSO_MS,
      loop: true,
      callback: () => {
        if (estado.capitulo !== 1) return;
        qp += sentido;
        if (qp >= nPulso - 1 || qp <= 0) sentido = -sentido;
        pulso.setFrame(qp);
        estado.rachadura++;
      },
    }),
  );
  const cam = scene.cameras.main;
  cam.shake(T.RASGO, 0.0015);

  // O FLUIDO escorrendo do teto — gotas escuras, sem aditivo (não é luz).
  const gotas = scene.add
    .particles(0, 0, 'puff', {
      x: { min: 20, max: GAME_WIDTH - 20 },
      y: TOPO,
      lifespan: 1400,
      speedY: { min: 60, max: 120 },
      scale: { start: 0.5, end: 0.3 },
      tint: [0x3a0508, 0x5a0a10],
      frequency: 160,
    })
    .setDepth(DEPTH.EFEITO);
  objetos.push(gotas);

  // ─── 2 · O ESTOURO ───
  // CORTE SECO no impacto: a parede rasgada do conceito aprovado entra de uma vez, e os pedaços voando
  // escondem o corte. Não há interpolação do intacto ao rasgado — a v3 inventa manchas nessa distância.
  // Depois, as BORDAS se mexem (v3 sobre o próprio rasgado, `_gerar-rasgo.mjs`, seed 21).
  const rasgo = scene.add.image(RASGO_X, RASGO_Y, 'f8Rasgo', 0).setOrigin(0, 0).setDepth(DEPTH.FUNDO + 2).setVisible(false);
  objetos.push(rasgo);
  const buracoX = BURACO_X;
  const buracoY = BURACO_Y;

  const estouro = scene.add
    .particles(buracoX, buracoY, 'f8PedacosSheet', {
      frame: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      speed: { min: 90, max: 260 },
      angle: { min: 120, max: 240 }, // para DENTRO da câmara — a parede arrebenta para cima da nave
      rotate: { min: 0, max: 360 },
      scale: { min: 0.35, max: 0.7 },
      lifespan: { min: 500, max: 1100 },
      gravityY: 80,
      emitting: false,
    })
    .setDepth(DEPTH.FRENTE);
  const lascas = scene.add
    .particles(buracoX, buracoY, 'f4Destroco', {
      frame: [0, 1, 2, 3],
      speed: { min: 120, max: 320 },
      angle: { min: 100, max: 260 },
      rotate: { min: 0, max: 360 },
      lifespan: { min: 400, max: 900 },
      gravityY: 60,
      emitting: false,
    })
    .setDepth(DEPTH.FRENTE);
  objetos.push(estouro, lascas);

  let qr = 0;
  let sr = 1;
  eventos.push(
    scene.time.delayedCall(T.RASGO, () => {
      estado.capitulo = 2;
      estado.rasgo = 0;
      // A parede rasgada foi pintada sobre a câmara ORIGINAL: a pulsação sai, senão a emenda aparece.
      pulso.setVisible(false);
      rasgo.setVisible(true);
      estouro.explode(26);
      lascas.explode(18);
      cam.shake(260, 0.012); // o SOLAVANCO — um só, curto
      estado.musicaCortada = true;
      Music.stop(scene, 120); // o vácuo entrando: a música morre no estouro
      eventos.push(
        scene.time.addEvent({
          delay: RASGO_MS,
          loop: true,
          callback: () => {
            qr += sr;
            if (qr >= RASGO_QUADROS - 1 || qr <= 0) sr = -sr;
            rasgo.setFrame(qr);
            estado.rasgo = Math.max(estado.rasgo, qr);
          },
        }),
      );
    }),
  );

  // ─── 3 · DESCOMPRESSÃO: tudo corre para o buraco (`moveToX/Y`) — o vácuo dando a direção ───
  eventos.push(
    scene.time.delayedCall(T.DESCOMPRESSAO, () => {
      estado.capitulo = 3;
      c.atm.perfil(PERFIS.visceraSuccao);
      gotas.stop();
      // Os RASTROS giram para o buraco no nascimento (a folha aponta para a direita, 0°) — sem isso eles
      // liam como TIRO, risquinhos horizontais (folha de 24/09). E os pedaços de tecido vão junto, menores.
      const paraOBuraco = (p?: Phaser.GameObjects.Particles.Particle): number =>
        p ? Phaser.Math.RadToDeg(Math.atan2(buracoY - p.y, buracoX - p.x)) : 0;
      const rastros = scene.add
        .particles(0, 0, 'f8SuccaoSheet', {
          frame: [0, 0, 1, 1, 2, 3],
          x: { min: 0, max: buracoX - 30 },
          y: { min: TOPO, max: CRISTA },
          moveToX: buracoX,
          moveToY: { min: buracoY - 30, max: buracoY + 30 },
          rotate: { onEmit: paraOBuraco },
          scale: { min: 1, max: 1.6 },
          lifespan: { min: 380, max: 900 },
          frequency: 16,
          quantity: 2,
        })
        .setDepth(DEPTH.EFEITO);
      const tecido = scene.add
        .particles(0, 0, 'f8PedacosSheet', {
          frame: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
          x: { min: 0, max: buracoX - 40 },
          y: { min: TOPO, max: CRISTA },
          moveToX: buracoX,
          moveToY: { min: buracoY - 24, max: buracoY + 24 },
          rotate: { min: 0, max: 360 },
          scale: { min: 0.25, max: 0.45 },
          lifespan: { min: 600, max: 1200 },
          frequency: 90,
        })
        .setDepth(DEPTH.EFEITO);
      objetos.push(rastros, tecido);
      cam.shake(T.FERIDA - T.DESCOMPRESSAO, 0.004);
      // A NAVE É ARRANCADA E SOME PELA FENDA (24/09: *"ela precisa ser sugada e desaparecer por entre a fenda
      // aberta"* — antes ela parava na boca do buraco, derivando). Acelera girando até o fundo do buraco e, na
      // segunda metade, ENCOLHE: está indo para longe, através dele. Some ~1s antes do corte para fora, e o
      // vácuo segue puxando o resto sem ela.
      const puxao = T.FERIDA - T.DESCOMPRESSAO - 1100;
      scene.tweens.add({ targets: nave, x: buracoX, y: buracoY, angle: 900, duration: puxao, ease: 'Quad.easeIn' });
      scene.tweens.add({
        targets: nave,
        scale: 0.1,
        delay: puxao * 0.5,
        duration: puxao * 0.5,
        ease: 'Quad.easeIn',
        onComplete: () => {
          nave.setVisible(false).setScale(1).setAngle(0);
          estado.naveSumiu = true;
        },
      });
    }),
  );

  // A nave TREME no lugar até o estouro: o jogador já não a controla.
  const baseY = nave.y;
  let t = 0;

  return {
    update(dt: number) {
      t += dt;
      if (estado.capitulo >= 3) return; // na descompressão, quem manda na nave é o tween
      nave.y = baseY + Math.sin(t * 22) * (estado.capitulo === 2 ? 2 : 0.8);
    },
    limpar() {
      eventos.forEach((e) => e.remove());
      objetos.forEach((o) => o.destroy());
    },
  };
}
