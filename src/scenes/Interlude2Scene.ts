import Phaser from 'phaser';
import { COLORS, GAME_WIDTH, GAME_HEIGHT } from '../config';
import { Starfield } from '../Starfield';
import { Parallax } from '../Parallax';
import { resetVariantCache } from '../art';
import { pixelText } from '../ui';
import { Fx } from '../systems/Fx';
import { Music } from '../systems/Music';
import { SHIPS, DEFAULT_SHIP, ROSTER_DOCA } from '../ships';
import { ShipPanel } from '../ui/ShipPanel';
import { STAGES } from '../systems/StageDirector';
import type { HandlingMode } from './GameScene';
// AS LUZES DA DOCA — medidas em `scripts/_cut2-luzes.mjs` (por SATURAÇÃO, não luminância: metal
// e rocha desta pintura leem claros mas neutros; matiz quente + saturação é o que isola uma
// lâmpada de um parafuso batendo luz). Coordenadas em espaço de ARTE — `criarLuzes()` converte.
import docaLuzes from '../data/doca-luzes.json';

/** Uma rocha ancorada: o sprite + o ponto da doca em que o cabo dela prende. */
interface Amarra {
  rocha: Phaser.GameObjects.Image;
  ancoraX: number;
  ancoraY: number;
  /** Fase da oscilação: as rochas não podem balançar em uníssono. */
  t: number;
  baseX: number;
  baseY: number;
}

/**
 * A DOCA DO CINTURÃO — a cutscene entre a Fase 2 e a Fase 3.
 *
 * ─── O QUE ELA FAZ PELA CAMPANHA ───
 *
 * A 1ª interlude era uma PERDA: você pousava na sua frota e ela implodia. Esta é um ACHADO —
 * uma estação de mineração encravada na rocha, viva, com pistas acesas, e **uma nave alienígena
 * encalhada na doca**. É aqui que o jogador põe a mão na tecnologia do inimigo pela primeira vez,
 * e é exatamente o arco de quem está indo caçar o Leviatã.
 *
 * A base explodir depois da decolagem não é repetição da Aurora: **a Aurora implodiu por dano de
 * batalha; esta some porque você tirou dela a única coisa que importava.** A campanha inteira é
 * uma queima de pontes — a cada fase, o lugar de onde você veio deixa de existir.
 *
 * ─── A DOCA É O CHÃO (o mesmo truque da Aurora) ───
 *
 * A estação não "cabe" na tela: ela entra grande, a rocha sangra para fora por baixo, e a PISTA
 * dela vira a superfície. Uma base que cabe inteira na tela parece uma maquete.
 *
 * ⚠️ A linha da pista é MEDIDA no PNG (`PAD_ROW`), nunca chutada — chutar a linha do convés da
 * Aurora já fez a nave pousar 30px abaixo da tela, no vazio (docs/HANDOFF.md, lição 13).
 *
 * ─── NÃO HÁ CHÃO AQUI (Fatia 4) ───
 *
 * Até a Fatia 4 a cena montava 33 asteroides ampliados no rodapé para a doca não parecer que
 * flutuava. Ela flutua — é uma plataforma SUSPENSA, presa pelos cabos, e é assim que a pintura
 * do cinturão desenha aquele lugar: as estações pendem de guindastes, não se fincam em chão.
 * O chão falso foi apagado; a rocha que aparece atrás da doca é a da pintura.
 */
export class Interlude2Scene extends Phaser.Scene {
  private starfield!: Starfield;
  /** Fallback do céu (o parallax pixel da Fase 2) — só existe quando a pintura NÃO existe. */
  private parallax: Parallax | null = null;
  private fx!: Fx;

  private ship!: Phaser.GameObjects.Image;
  private doca!: Phaser.GameObjects.Image;
  private cabos!: Phaser.GameObjects.Graphics;
  private banner!: Phaser.GameObjects.Text;

  private amarras: Amarra[] = [];
  private panel: ShipPanel | null = null;

  private score = 0;
  private handling: HandlingMode = 'diegetico';
  private naveId: string = DEFAULT_SHIP;
  private proxima = 3;
  private done = false;
  private t = 0;

  // ─── A GEOMETRIA DA DOCA — medida por `scripts/_cut2-doca2.mjs` na arte INTEIRA (a 2ª arte,
  // c166782d-84e8-4dca-9017-ebdbd26ef0bf: um cais em balanço no paredão de um asteroide, 256×256,
  // com TRÊS plataformas — a MAIS BAIXA e MAIOR é a pista, ver task-2-report.md) ───
  // ⚠️ Estes números saem da MEDIÇÃO, nunca do olho. Chutar a linha do convés da Aurora já fez a
  // nave pousar 30px abaixo da tela, no vazio. Se a arte mudar, rode o script de novo.
  private static readonly ART_W = 256;   // ← de `_cut2-doca2.mjs`
  private static readonly ART_H = 256;   // ← de `_cut2-doca2.mjs`
  private static readonly PAD_ROW = 175; // ← de `_cut2-doca2.mjs`
  private static readonly PAD_X0 = 26;   // ← de `_cut2-doca2.mjs`
  private static readonly PAD_X1 = 217;  // ← de `_cut2-doca2.mjs`

  /**
   * ×1: escala INTEIRA. A doca antiga era ×1.5 — fracionária, e ela BORRA a grade de pixel, que é
   * a única coisa que faz o jogo parecer feito de pixels (o mesmo defeito que tirou o cargueiro
   * de 1.9× na Fatia 3). Se o tamanho em tela não fechar, o que muda é o RECORTE, não a escala.
   */
  private static readonly SCALE = 1;

  // ─── AS PROFUNDIDADES, E POR QUE ELAS SÃO ALTAS ───
  //
  // ⚠️ O PRIMEIRO PLANO DO PARALLAX VIVE NO DEPTH 60 e passa **na frente da nave** (é ele que mais
  // vende profundidade numa FASE — ver Parallax.ts). Numa CUTSCENE ele faz o contrário: pedras
  // quase pretas cruzam a tela e **tapam a pista de pouso**, e o pouso é a única coisa que a cena
  // existe para mostrar. Na sonda, duas delas cobriam metade da plataforma.
  //
  // A doca inteira sobe para CIMA dele. As pedras à deriva continuam existindo — só que agora
  // passam ATRÁS da estação, que é onde um detrito distante deveria passar mesmo.
  // ⚠️ O CABO PASSA POR TRÁS DE TUDO QUE ELE LIGA (Henrique, 2026-08-25). Ele era 67, ACIMA das
  // rochas (66) — e a linha branca cruzava por cima da pedra, como se estivesse pintada nela em
  // vez de amarrada nela. Um cabo que some atrás do que ele prende lê como PRESO; um que passa
  // por cima lê como risco.
  //
  // Por isso ele é o MENOR dos três: abaixo da rocha (66) e abaixo da doca (70). Perto do convés
  // ele desaparece atrás da plataforma e reaparece no vazio à direita — que é exatamente o
  // caminho de um cabo que nasce sob a laje.
  private static readonly DEPTH_CABO = 65;
  private static readonly DEPTH_ROCHA = 66;
  private static readonly DEPTH_DOCA = 70;
  private static readonly DEPTH_NAVE = 80;

  // ⚠️ AS LUZES FICAM NA FRENTE DA DOCA (>70) — senão a arte por cima delas apaga o próprio
  // brilho que elas existem para acrescentar. O HALO/FACHO nasce um degrau ATRÁS do núcleo
  // pontual (70.3 < 71): ele é a "névoa" ao redor da lâmpada, e a névoa fica atrás do próprio
  // ponto de luz, nunca na frente dele.
  private static readonly DEPTH_LUZ_HALO = Interlude2Scene.DEPTH_DOCA + 0.3;
  private static readonly DEPTH_LUZ = Interlude2Scene.DEPTH_DOCA + 1;

  /** A altura da pista NA TELA. Baixa: a doca é grande e sangra para fora por baixo. */
  private static readonly PAD_Y = 150;
  /**
   * X do centro do sprite: a arte fica COLADA NA BORDA ESQUERDA DA TELA.
   *
   * A 2ª arte (c166782d) não é um cutout independente do céu — é um cais entalhado num paredão de
   * asteroide, pensado para nascer na margem da tela, não flutuando no meio dela. Com origem no
   * centro e `SCALE = 1`, colar a borda ESQUERDA do sprite em x=0 é `DOCA_X − ART_W/2 = 0`, ou
   * seja `DOCA_X = ART_W/2`. Metade da arte (o lado esquerdo) fica fora da tela.
   *
   * ⚠️ A arte NÃO leva feather em borda nenhuma (`_cut2-doca2.mjs`, bloco 3). Feather é remédio
   * para CORTE — servia à arte anterior, que era um recorte retangular. Esta já vem com cutout e
   * silhueta próprios, e a rampa de alpha só comia as pontas das antenas e dos conveses.
   */
  private static readonly DOCA_X = Interlude2Scene.ART_W / 2;

  /** Y do centro do sprite que põe a linha da pista exatamente em PAD_Y. */
  private static get docaY(): number {
    const meio = Interlude2Scene.ART_H / 2;
    return Interlude2Scene.PAD_Y + (meio - Interlude2Scene.PAD_ROW) * Interlude2Scene.SCALE;
  }

  /** Converte um X da arte para o X da tela. */
  private static artToScreenX(ax: number): number {
    return Interlude2Scene.DOCA_X + (ax - Interlude2Scene.ART_W / 2) * Interlude2Scene.SCALE;
  }

  /** Converte um Y da arte para o Y da tela (mesma conta de `docaY`, para um Y qualquer da arte). */
  private static artToScreenY(ay: number): number {
    return Interlude2Scene.docaY + (ay - Interlude2Scene.ART_H / 2) * Interlude2Scene.SCALE;
  }

  constructor() {
    super('Interlude2');
  }

  create(data: { score?: number; handling?: HandlingMode; ship?: string; stage?: number }): void {
    this.score = data.score ?? 0;
    this.handling = data.handling ?? 'diegetico';
    // A nave com que ele CHEGOU. Se ele não trocar nada, é com ela que ele segue — a escolha
    // anterior não pode ser apagada por uma cutscene que ele só assistiu.
    this.naveId = SHIPS[data.ship ?? ''] ? data.ship! : DEFAULT_SHIP;
    this.proxima = data.stage ?? 3;
    this.done = false;
    this.panel = null;
    this.amarras = [];
    this.t = 0;

    resetVariantCache();

    this.starfield = new Starfield(this);
    // O CÉU é a pintura do Henrique. Depth −110: ATRÁS do starfield (−100), porque são as
    // estrelas em movimento que carregam a deriva — a pintura sozinha seria um quadro parado.
    // Ela é ESTÁTICA (não guardamos referência em `this`: nada mais precisa mexer nela depois de
    // criada — quem chega é a nave, não o céu, ver `roteiro()`).
    this.parallax = null;
    if (this.textures.exists('paintBgCut2')) {
      this.add.image(0, -27, 'paintBgCut2').setOrigin(0, 0).setDepth(-110);
    } else {
      // Sem o PNG: o céu antigo (o mesmo parallax da Fase 2) — comportamento de hoje.
      this.parallax = new Parallax(this, 'espaco');
    }
    this.fx = new Fx(this);

    // O PLANETA PARTIDO FOI RETIRADO DAQUI (decisão do Henrique): a pintura do céu já tem uma
    // lua, e a arte nova da doca também tem a dela — com o `planetShattered` a cena mostrava TRÊS
    // luas no mesmo quadro. A textura continua registrada em `BootScene` para quem mais usar; só
    // esta cena parou de desenhá-la.

    // Guarda: sem a arte nova, cai na doca antiga (comportamento de hoje).
    const docaTex = this.textures.exists('docaCinturao') ? 'docaCinturao' : 'doca';
    this.doca = this.add
      .image(Interlude2Scene.DOCA_X, Interlude2Scene.docaY, docaTex)
      .setScale(Interlude2Scene.SCALE)
      .setDepth(Interlude2Scene.DEPTH_DOCA);

    // A RISCA DA PISTA DESENHADA EM CÓDIGO FOI REMOVIDA (2ª arte, c166782d): a arte nova já traz
    // suas próprias marcações pintadas no convés (chevrons vermelhos e luzes de borda) — uma
    // segunda marcação por cima seria a MESMA duplicação que a troca de arte existe para corrigir
    // ("usar duas imagens sobrepostas e parecidas causa estranheza", diagnóstico do Henrique).

    // AS LUZES PISCAM — a cena é estática, e depois da composição aprovada isto é o que sobra
    // para manter o quadro vivo ("faça as luzes piscarem, trazer um pouco de volumetria",
    // Henrique). Ver `criarLuzes()`.
    this.criarLuzes();

    // OS CABOS. Desenhados em código, e não como sprite, porque eles precisam LIGAR duas coisas:
    // uma ponta na doca, a outra numa rocha que balança. Um sprite de cabo ficaria parado
    // enquanto a rocha se move, e a amarra viraria uma decoração solta no meio do vazio.
    this.cabos = this.add.graphics().setDepth(Interlude2Scene.DEPTH_CABO);
    this.amarrarRochas();

    // A nave que chega é a ESCOLHIDA na Aurora (this.naveId) — a doca não pode desmentir a
    // escolha que o jogador fez uma fase atrás.
    const chegada = SHIPS[this.naveId];
    const chegadaTex = this.textures.exists(chegada.texture) ? chegada.texture : 'ship';
    this.ship = this.add.sprite(-30, 70, chegadaTex).setDepth(Interlude2Scene.DEPTH_NAVE);
    const chegadaAnim = chegadaTex === chegada.texture ? (chegada.anim ?? 'ship-thrust') : 'ship-thrust';
    if (this.anims.exists(chegadaAnim)) (this.ship as Phaser.GameObjects.Sprite).play(chegadaAnim);

    this.banner = pixelText(this, GAME_WIDTH / 2, 26, '', { size: 11, color: COLORS.hotBright })
      .setDepth(100)
      .setAlpha(0);

    this.roteiro();

    // ⚠️ SEM TECLA DE PULAR — a mesma lição que custou a 1ª cutscene inteira (docs/HANDOFF.md).
    // O jogador chega aqui com o dedo no ESPAÇO (é o gatilho da Fase 2), e uma tecla de pular
    // seria consumida no primeiro frame.
  }

  /**
   * AS ROCHAS AMARRADAS — "grandes cabos saem para segurar os asteroides em volta".
   *
   * Elas são a razão de a doca existir: isto é uma MINA. Os cabos dizem, sem uma linha de texto,
   * que aquela gente estava ARRASTANDO pedra — e que parou.
   *
   * ⚠️ AS ROCHAS FICAM NO CÉU ABERTO, não coladas na estrutura. A 1ª versão ancorava e soltava as
   * rochas em coordenadas tiradas da arte, e elas nasceram enterradas dentro do desenho da rocha
   * (invisíveis) ou fora da tela — só UM dos três cabos aparecia. O cabo só conta a história se as
   * DUAS pontas dele forem visíveis: uma na máquina, a outra na pedra, com vácuo no meio.
   *
   * Por isso a âncora sai da ARTE (é uma peça da doca) e a rocha vai para a TELA (o vazio à
   * direita e acima da pista, que é a única região grande sem nada em cima).
   */
  /**
   * Quanto acima da linha da pista (PAD_ROW) as âncoras dos cabos sentam, em px de arte — igual
   * em px de tela, já que SCALE é 1.
   *
   * ⚠️ É **ZERO**, e isso não é preguiça: a âncora tem que cair EXATAMENTE na superfície da laje.
   * Com 12 (a versão anterior) ela subia para o VÃO ABERTO entre a plataforma de baixo e a do
   * meio, e o cabo nascia no ar — o Henrique circulou justamente essa ponta solta, em (185, 138).
   *
   * "Um pouco acima do convés" parece mais natural no papel e é errado na tela: acima do convés
   * não há convés. Numa arte com plataformas em balanço, o único ponto garantidamente sólido na
   * vertical é a própria linha medida.
   */
  private static readonly ANCHOR_LIFT = 0;

  private amarrarRochas(): void {
    // ⚠️ Re-ancorado para a 2ª arte (256×256, c166782d). As âncoras seguem duas regras medidas,
    // nunca chutadas:
    //
    //  1. ESPALHAR: ax vem dos TERÇOS DO VÃO DA PISTA (PAD_X0..PAD_X1), não de ART_W — a laje é
    //     só uma faixa dentro da arte inteira agora, então espalhar pelos terços da arte toda
    //     poria âncoras fora da estrutura da doca. Espalhar pelo vão da pista mantém as três
    //     "sobre" a plataforma, e não em qualquer ponto do céu ao redor.
    //  2. SUBIR: ay = PAD_ROW − ANCHOR_LIFT, sempre relativo à linha da pista MEDIDA — nunca um
    //     número solto — para que o cabo puxe pra CIMA (fisicamente o que sustenta algo
    //     pendurado) a partir de um ponto logo acima do convés, não do topo da imagem.
    const vaoPista = Interlude2Scene.PAD_X1 - Interlude2Scene.PAD_X0;
    const ax = (frac: number) => Interlude2Scene.PAD_X0 + vaoPista * frac;
    const ay = Interlude2Scene.PAD_ROW - Interlude2Scene.ANCHOR_LIFT;
    const pontos = [
      // âncora (coords da ARTE, terço esquerdo/centro/direito do vão da pista, rente à laje) →
      // rocha (coords da TELA, no vazio à direita/alto — as rochas NÃO mudam de lugar, só de
      // onde o cabo nasce).
      { ax: ax(1 / 6), ay, rx: 300, ry: 34, escala: 1.4 },
      { ax: ax(1 / 2), ay, rx: 352, ry: 104, escala: 1.0 },
      { ax: ax(5 / 6), ay, rx: 298, ry: 96, escala: 0.85 },
    ];

    for (const p of pontos) {
      const ancoraX = Interlude2Scene.artToScreenX(p.ax);
      const ancoraY =
        Interlude2Scene.docaY + (p.ay - Interlude2Scene.ART_H / 2) * Interlude2Scene.SCALE;

      const rocha = this.add
        .image(p.rx, p.ry, 'asteroid')
        .setScale(p.escala)
        // Clara o bastante para LER contra o espaço. A tint escura de cenário (0x232c4a) as fazia
        // sumir no fundo — e uma pedra invisível na ponta de um cabo é um cabo que não segura nada.
        .setTint(0x8fa0c0)
        .setDepth(Interlude2Scene.DEPTH_ROCHA);

      this.amarras.push({
        rocha,
        ancoraX,
        ancoraY,
        t: Phaser.Math.FloatBetween(0, Math.PI * 2),
        baseX: rocha.x,
        baseY: rocha.y,
      });
    }
  }

  /**
   * AS LUZES QUE JÁ ESTÃO PINTADAS — não pintamos luz nova, achamos a que a arte já tem (janelas
   * âmbar/laranja nas torres, luzes vermelhas e âmbar na borda das plataformas — medidas por
   * SATURAÇÃO em `scripts/_cut2-luzes.mjs`, ver o doc-comment de lá) e a fazemos RESPIRAR.
   *
   * ⚠️ FASES DIFERENTES POR LUZ. Um pulso em uníssono lê como a TELA INTEIRA piscando — o que
   * este quadro pede é uma estação viva, com cada lâmpada no seu próprio relógio. Por isso
   * duração, atraso e faixa de alfa são sorteados por ponto, não um único tween compartilhado.
   *
   * ⚠️ RESTRIÇÃO É O PEDIDO. A pintura anterior foi rejeitada duas vezes por virar a coisa mais
   * clara da tela — a regra da casa é luz só onde há energia, e aqui "onde há energia" já está
   * marcado no PNG. O halo grande e o facho (a "volumetria") só nascem nas poucas luzes mais
   * fortes, nunca em todas — senão a doca inteira vira um brilho só.
   */
  private criarLuzes(): void {
    // GUARDA: sem a textura, a cena não quebra — só fica sem o efeito (a mesma regra de guarda
    // que `chegadaTex`/`docaTex` já seguem nesta cena).
    if (!this.textures.exists('colonyLight')) return;

    const pontos = docaLuzes.pontos;
    if (pontos.length === 0) return;

    // AS MAIS FORTES: pelo brilho da própria amostra (não por ordem de medição). São elas que
    // recebem o halo grande-e-fraco; um facho de `godRay` vai só nas 2 primeiras — a volumetria
    // é um tempero, não o prato.
    const porBrilho = [...pontos].sort(
      (a, b) => Interlude2Scene.luminanciaHex(b.cor) - Interlude2Scene.luminanciaHex(a.cor),
    );
    const fortes = new Set(porBrilho.slice(0, Math.min(5, pontos.length)));

    // O FACHO só vale a pena numa luz que sobra QUADRO — a arte tem lâmpadas rentes à borda de
    // cima (uma baliza de antena, por exemplo), e um facho ali nasce quase todo fora da tela.
    // Filtra por margem antes de pegar as 2 mais fortes, sem mudar quem recebe o halo.
    const MARGEM = 14;
    const visiveis = porBrilho.filter((p) => {
      const sy = Interlude2Scene.artToScreenY(p.y);
      const sx = Interlude2Scene.artToScreenX(p.x);
      return sy > MARGEM && sy < GAME_HEIGHT - MARGEM && sx > MARGEM && sx < GAME_WIDTH - MARGEM;
    });
    const maisFortes = new Set(visiveis.slice(0, Math.min(2, visiveis.length)));

    const temGodRay = this.textures.exists('godRay');

    for (const p of pontos) {
      // O mapeamento de arte→tela é o mesmo de `artToScreenX`/`Y`: com DOCA_X = ART_W/2 e
      // SCALE = 1, screenX = artX e screenY = artY − 25.
      const sx = Interlude2Scene.artToScreenX(p.x);
      const sy = Interlude2Scene.artToScreenY(p.y);
      const tint = p.familia === 'red' ? 0xff4433 : 0xffb066;

      // A VOLUMETRIA, primeiro (para nascer ATRÁS do núcleo pontual): um halo bem maior e bem
      // mais fraco, só nas luzes mais fortes — o núcleo é a lâmpada, o halo é o AR ao redor dela.
      if (fortes.has(p)) {
        const halo = this.add
          .image(sx, sy, 'colonyLight')
          .setBlendMode(Phaser.BlendModes.ADD)
          .setTint(tint)
          .setDepth(Interlude2Scene.DEPTH_LUZ_HALO)
          .setScale(Phaser.Math.FloatBetween(6, 9));

        const haloBase = Phaser.Math.FloatBetween(0.1, 0.16);
        const haloPiso = haloBase * 0.4;
        halo.setAlpha(haloPiso);

        this.tweens.add({
          targets: halo,
          alpha: { from: haloPiso, to: haloBase },
          duration: Phaser.Math.Between(1800, 3200),
          delay: Phaser.Math.Between(0, 2000),
          yoyo: true,
          repeat: -1,
          ease: 'Sine.easeInOut',
        });

        // Um facho raríssimo saindo da lâmpada mais forte — só 1 ou 2 no quadro inteiro, sutil,
        // baixo alfa, a mesma receita do `Parallax.ts` (ADD, tint âmbar frio, ângulo, escala
        // esticada) — cena escura, luz só onde há energia.
        if (temGodRay && maisFortes.has(p)) {
          this.add
            .image(sx, sy, 'godRay')
            .setBlendMode(Phaser.BlendModes.ADD)
            .setTint(0xffcf9a)
            .setAlpha(Phaser.Math.FloatBetween(0.05, 0.09))
            .setAngle(Phaser.Math.Between(-70, -110))
            .setScale(Phaser.Math.FloatBetween(0.22, 0.32), Phaser.Math.FloatBetween(0.5, 0.7))
            .setDepth(Interlude2Scene.DEPTH_LUZ_HALO);
        }
      }

      // O NÚCLEO: a lâmpada em si, piscando. Todo ponto medido recebe um.
      const nucleo = this.add
        .image(sx, sy, 'colonyLight')
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(tint)
        .setDepth(Interlude2Scene.DEPTH_LUZ)
        .setScale(Phaser.Math.FloatBetween(0.8, 1.4));

      const alphaMin = Phaser.Math.FloatBetween(0.15, 0.35);
      const alphaMax = Phaser.Math.FloatBetween(0.55, 0.85);
      nucleo.setAlpha(alphaMin);

      this.tweens.add({
        targets: nucleo,
        alpha: { from: alphaMin, to: alphaMax },
        duration: Phaser.Math.Between(700, 2200),
        delay: Phaser.Math.Between(0, 1800),
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  /** Luminância aproximada (0–255) de um "#rrggbb" — usada só para ranquear as luzes mais fortes. */
  private static luminanciaHex(hex: string): number {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 0xff;
    const g = (n >> 8) & 0xff;
    const b = n & 0xff;
    return r * 0.299 + g * 0.587 + b * 0.114;
  }

  override update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.t += dt;

    this.starfield.update(dt);
    // Devagar: a nave está em aproximação, não em fuga. (Só roda de fato sem a pintura — é o
    // fallback do parallax pixel; com a pintura carregada é um no-op, porque `this.parallax`
    // fica null.)
    this.parallax?.update(dt, 20);
    // A PINTURA NÃO ANDA — a cena é estática, só a nave chega (ver comentário em `roteiro()`).

    // As rochas BALANÇAM na ponta do cabo — e é o balanço que prova que o cabo está sob tensão.
    // Pedra parada pendurada num fio é um adesivo.
    this.cabos.clear();

    for (const a of this.amarras) {
      a.rocha.x = a.baseX + Math.sin(this.t * 0.5 + a.t) * 3;
      a.rocha.y = a.baseY + Math.cos(this.t * 0.4 + a.t) * 2;
      a.rocha.angle += dt * 4;

      this.desenharCabo(a);
    }
  }

  /**
   * UM CABO DE ARRASTO — grosso, com barriga, e com um fio de luz em cima.
   *
   * ⚠️ **NÃO é um sprite, e não pode ser.** Um cabo liga a doca (parada) a uma rocha que BALANÇA
   * na ponta, e um PNG esticado entre elas seria uma barra rígida — ou pior, um adesivo parado
   * enquanto a rocha anda. O que vende o cabo é ele ACOMPANHAR o balanço, e só o desenho por
   * frame faz isso.
   *
   * Três coisas o fazem parecer um cabo de mineração e não um fio:
   *  1. **BARRIGA** (catenária). Uma reta perfeita entre dois pontos lê como viga, não como cabo.
   *     A barriga cai perpendicular ao vão, e ela é o que diz "isto é flexível e está pesado".
   *  2. **ESPESSURA** de 3px com um realce de 1px por cima — a mesma aresta de luz que dá volume
   *     ao pico e ao asteroide (docs/HANDOFF.md: silhueta chapada não tem volume).
   *  3. **SEGMENTOS**: a curva é desenhada em pedaços, então ela dobra.
   */
  private desenharCabo(a: Amarra): void {
    const SEG = 10;
    const dx = a.rocha.x - a.ancoraX;
    const dy = a.rocha.y - a.ancoraY;

    // A barriga é perpendicular ao vão e proporcional a ele: um cabo curto quase não cede.
    const vao = Math.hypot(dx, dy);
    const sag = vao * 0.12;
    const nx = -dy / (vao || 1);
    const ny = dx / (vao || 1);

    const ponto = (i: number) => {
      const t = i / SEG;
      // Parábola: zero nas pontas (o cabo está PRESO nas duas), máxima no meio.
      const barriga = Math.sin(t * Math.PI) * sag;
      return {
        x: a.ancoraX + dx * t + nx * barriga,
        y: a.ancoraY + dy * t + ny * barriga,
      };
    };

    for (const [largura, cor, alpha] of [
      [3, 0x2e2e38, 1],
      [1, 0x9a9aab, 0.7],
    ] as const) {
      this.cabos.lineStyle(largura, cor, alpha);
      this.cabos.beginPath();

      const p0 = ponto(0);
      this.cabos.moveTo(p0.x, p0.y);
      for (let i = 1; i <= SEG; i++) {
        const p = ponto(i);
        this.cabos.lineTo(p.x, p.y);
      }

      this.cabos.strokePath();
    }
  }

  // ─── O roteiro ──────────────────────────────────────────────────────────────

  private roteiro(): void {
    this.placar();

    this.time.delayedCall(2300, () => {
      if (this.done) return;
      this.aviso('PILOTO AUTOMÁTICO · ENGATADO', COLORS.hotBright);
      this.cameras.main.flash(160, 255, 212, 71);
    });

    // A CENA É ESTÁTICA — quem chega é a NAVE, não a doca. A doca (e as âncoras/rochas que
    // dependem dela) usada a deslizar da direita a cada início de cena; o Henrique cortou isso:
    // "a imagem precisa estar estatica e a nave que chega". Os números de posição logo acima
    // (DOCA_X, amarrarRochas) já são as posições FINAIS (pós-deslize) — a doca só
    // PRECISAVA nascer nelas, o deslize inteiro era um passo redundante que a câmera não pede
    // mais. Removido o offset de entrada, o tween que desfazia o offset, e o addCounter que
    // arrastava as âncoras (números, não objetos) atrás do tween — os três só existiam para
    // sustentar um movimento que não deve mais acontecer.

    this.tweens.add({
      targets: this.ship,
      x: 120,
      duration: 3800,
      ease: 'Sine.easeOut',
      delay: 2600,
    });

    this.time.delayedCall(6200, () => this.pouso());
  }

  private placar(): void {
    const t = (y: number, v: string, size: number, color: number) =>
      pixelText(this, GAME_WIDTH / 2, y, v, { size, color }).setDepth(100);

    const linhas = [
      t(74, 'FASE 2 · FROTA MORTA', 11, COLORS.playerBright),
      t(92, 'CONCLUÍDA', 8, COLORS.metalLight),
      t(116, String(this.score), 17, COLORS.hotBright),
      t(132, 'PONTOS', 7, COLORS.metalLight),
    ];

    this.tweens.add({
      targets: linhas,
      alpha: 0,
      duration: 900,
      delay: 2400,
      onComplete: () => linhas.forEach((l) => l.destroy()),
    });
  }

  /**
   * O POUSO — na PISTA, e não em qualquer lugar do sprite.
   *
   * X e Y são tweens SEPARADOS, com curvas diferentes: é isso que faz um ARCO em vez de uma
   * diagonal. O X desacelera (ela perde avanço), o Y acelera e assenta.
   */
  private pouso(): void {
    if (this.done) return;

    this.aviso('DOCA KEPLER-9 · MINERAÇÃO', COLORS.hot);

    // O alvo é o MEIO DA PISTA, calculado da arte — não um número escolhido a olho.
    const alvoX =
      (Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X0) +
        Interlude2Scene.artToScreenX(Interlude2Scene.PAD_X1)) /
      2;

    this.tweens.add({ targets: this.ship, x: alvoX, duration: 2200, ease: 'Sine.easeOut' });

    this.tweens.add({
      targets: this.ship,
      y: Interlude2Scene.PAD_Y - 6,
      duration: 2200,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        this.fx.hit(this.ship.x, this.ship.y + 6);
        this.cameras.main.shake(140, 0.004);
        this.escolha();
      },
    });
  }

  /**
   * A ESCOLHA — agora com QUATRO naves.
   *
   * O painel é o MESMO da 1ª interlude (src/ui/ShipPanel.ts). A diferença é só o róster: aqui
   * entra o ARAUTO, a nave alienígena encalhada nesta doca.
   */
  private escolha(): void {
    if (this.done) return;

    this.aviso('DOCA KEPLER-9 · SELECIONE SUA NAVE', COLORS.playerBright);

    this.panel = new ShipPanel(
      this,
      ROSTER_DOCA,
      (t, c) => this.aviso(t, c),
      (id) => this.escolher(id),
      () => this.sair(),
    );
  }

  private sair(): void {
    if (this.done) return;
    this.done = true;
    this.scene.start('Menu');
  }

  /**
   * TROCA A NAVE NA DOCA — e PARA A ANIMAÇÃO antes, senão a troca não acontece.
   *
   * ⚠️ **A ANIMAÇÃO SOBRESCREVE A TEXTURA A CADA FRAME.** A nave da cutscene é um sprite tocando
   * `ship-thrust` (o motor aceso — é ele que diz que ela está sob potência). Um `setTexture()`
   * solto dura exatamente até o próximo quadro da animação, e aí o Phaser repõe `shipAnim*` por
   * cima. O jogador escolhia o ARAUTO, via o letreiro "ARMADA", e decolava no Interceptor.
   *
   * Era um bug SILENCIOSO: a escolha funcionava (a nave certa ia para a Fase 3), só a IMAGEM
   * mentia — e mentia justamente no instante em que a cutscene existe para mostrar o que ele
   * acabou de armar. Achado pela sonda, que compara a textura DEPOIS da escolha; a olho nu, num
   * sprite de 30px que decola em 1,7s, ninguém pega isso.
   *
   * É a mesma armadilha das variantes de arte (src/art.ts): animação e textura brigam pelo mesmo
   * campo, e quem toca por último ganha.
   */
  private trocarNave(id: string): void {
    const nave = SHIPS[id];
    if (!this.textures.exists(nave.texture)) return;

    const s = this.ship as Phaser.GameObjects.Sprite;
    s.anims?.stop();
    s.setTexture(nave.texture);
  }

  private escolher(id: string): void {
    if (this.done) return;

    this.naveId = id;
    this.panel?.destroy();
    this.panel = null;

    this.trocarNave(id);

    const nave = SHIPS[id];
    this.aviso(`${nave.name} · ARMADA`, COLORS.hotBright);
    this.cameras.main.flash(200, 62, 224, 240);

    this.time.delayedCall(1400, () => this.destruicao());
  }

  /**
   * A DOCA MORRE.
   *
   * A nave DECOLA ANTES do clarão final: quem sai voando de uma explosão é herói, quem sai depois
   * é sobrevivente — e o tempo entre as duas coisas é a única diferença entre as duas leituras.
   *
   * OS CABOS ARREBENTAM, e as rochas que eles seguravam saem à deriva. É o detalhe que fecha a
   * imagem: a doca existia para segurar aquilo, e sem ela o cinturão volta a ser cinturão.
   */
  private destruicao(): void {
    if (this.done) return;

    this.aviso('SOBRECARGA · A DOCA VAI CAIR', COLORS.enemyBright);
    Music.play(this, 'boss', 600);

    this.time.delayedCall(600, () => {
      if (this.done) return;

      // A nave sai para a DIREITA e para CIMA: é para lá que a Fase 3 corre.
      this.tweens.add({ targets: this.ship, x: GAME_WIDTH + 40, duration: 1700, ease: 'Sine.easeIn' });
      this.tweens.add({ targets: this.ship, y: 44, duration: 1700, ease: 'Cubic.easeOut' });
    });

    // A cadeia sobe pela estrutura, da pista para a rocha — agora com CORPO: a cadeia comum
    // racha a estrutura, e a cada 3 estouros um GRANDE (a sheet de 128px) arranca um bloco
    // inteiro. ⚠️ DEPTH NA FRENTE DA DOCA (73 > 70): os emissores do Fx vivem no depth 50, e
    // sem o parâmetro as explosões nasciam ATRÁS da estação que deviam estar destruindo — era
    // metade do motivo de o set-piece ler fraco.
    const N = 12;
    for (let i = 0; i < N; i++) {
      this.time.delayedCall(900 + i * 130, () => {
        if (this.done) return;

        const t = i / (N - 1);
        const x = Phaser.Math.Linear(GAME_WIDTH - 40, 60, t) + Phaser.Math.Between(-16, 16);
        const y =
          Phaser.Math.Linear(Interlude2Scene.PAD_Y, 90, t) + Phaser.Math.Between(-12, 12);
        if (i % 3 === 2) this.fx.explodeBig(x, y - 10, 0.9, Interlude2Scene.DEPTH_DOCA + 3);
        else this.fx.explode(x, y, 1.6, Interlude2Scene.DEPTH_DOCA + 3);
      });
    }

    // OS CABOS ARREBENTAM: as rochas se soltam e derivam para fora.
    this.time.delayedCall(2300, () => {
      if (this.done) return;

      this.amarras.forEach((a, i) => {
        this.fx.explode(a.ancoraX, a.ancoraY, 1.2, Interlude2Scene.DEPTH_DOCA + 3);

        this.tweens.add({
          targets: a.rocha,
          x: a.rocha.x + Phaser.Math.Between(-90, -30),
          y: a.rocha.y + Phaser.Math.Between(-40, 40),
          angle: a.rocha.angle + Phaser.Math.Between(-120, 120),
          duration: 2600,
          ease: 'Sine.easeOut',
          delay: i * 120,
        });
      });

      // Sem doca, não há amarra: os cabos param de ser desenhados.
      this.amarras = [];
      this.cabos.clear();
    });

    this.time.delayedCall(3000, () => {
      if (this.done) return;

      this.cameras.main.flash(800, 255, 170, 90);
      // O estouro FINAL, na barriga da estação: a detonação de 128px em escala grande — é ela
      // que apaga a doca, não mais um clarão genérico de partícula.
      this.fx.explodeBig(
        Interlude2Scene.DOCA_X + 40,
        Interlude2Scene.PAD_Y - 20,
        1.6,
        Interlude2Scene.DEPTH_DOCA + 3,
      );

      this.tweens.add({
        targets: this.doca,
        y: '+=60',
        alpha: 0,
        duration: 1200,
        ease: 'Quad.easeIn',
      });
    });

    this.time.delayedCall(4400, () => this.avancar());
  }

  private aviso(texto: string, cor: number): void {
    this.banner
      .setText(texto)
      .setColor(Phaser.Display.Color.IntegerToColor(cor).rgba)
      .setAlpha(1)
      .setScale(1);

    this.tweens.add({ targets: this.banner, alpha: 0, duration: 1600, delay: 700 });
  }

  /**
   * ⚠️ A FASE SEGUINTE PODE NÃO EXISTIR AINDA.
   *
   * A `GameScene` cai na Fase 1 quando recebe uma fase desconhecida (`STAGES[x] ?? STAGES[1]`) —
   * é uma rede de segurança boa para um link velho, e seria um DESASTRE silencioso aqui: o jogador
   * terminaria a Fase 2, veria a cutscene inteira, e cairia na Fase 1 sem nenhuma explicação.
   *
   * A Fase 3 EXISTE (2026-07-18): a doca entrega o jogador à SERPENTE. A guarda de STAGES
   * continua — se um dia a `proxima` apontar para uma fase que não existe (a 4, hoje), a
   * campanha termina na vitória em vez de despejar o jogador na Fase 1 pela rede de segurança.
   */
  private avancar(): void {
    if (this.done) return;
    this.done = true;

    if (!STAGES[this.proxima]) {
      this.scene.start('GameOver', {
        score: this.score,
        handling: this.handling,
        victory: true,
        // A fase COMPLETADA — sem ela a tela de vitória cai no título padrão ("FASE 1").
        stage: this.proxima - 1,
      });
      return;
    }

    this.scene.start('Game', {
      stage: this.proxima,
      handling: this.handling,
      score: this.score,
      ship: this.naveId,
    });
  }
}
