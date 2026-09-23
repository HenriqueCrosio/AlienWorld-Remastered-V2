import Phaser from 'phaser';
import { GAME_WIDTH } from '../config';
import type { Fx } from '../systems/Fx';

/**
 * A SERRA DO GUARDIÃO — a skill nova da 1ª forma (design dele, 19/09/2026, depois do teste jogado que
 * disse *"a luta com o guardião está a mais fácil de todas"*). Spec:
 * `docs/superpowers/specs/2026-09-19-fase4-luta-guardiao-design.md`.
 *
 * > *"Aciona uma serra grande que ricocheteia nas paredes até sair do cenário, não segue o jogador, o
 * > jogador precisa esquivar… sobe na diagonal até bater na borda de cima, vai ter um efeito de cravar na
 * > borda, vai fazer um movimento de tentar girar travada 2x e depois vai descer na diagonal até a borda de
 * > baixo, fazer o mesmo movimento 1x agora e subir na diagonal, até sair da fase."*
 * > *"A serra vai ser lançada com um cabo parecido com os que prendem o guardião."*
 *
 * ─── POR QUE ELA EXISTE, E POR QUE A CRAVADA É O CORAÇÃO ───
 * A nave atira para a DIREITA (`WeaponSystem`, ângulos em torno de 0°), então o guardião só é acertável
 * parado e à direita dela. A investida não serve de janela de dano: ele passa e termina ATRÁS da nave.
 * ENQUANTO A SERRA ESTÁ CRAVADA ele está segurando o cabo — ancorado, exposto — e é aí que se machuca ele.
 * `cravada` é o que o `BossNucleo` lê para abrir o miolo. O beat de arte e o de mecânica são o mesmo.
 *
 * ─── AS DUAS LEIS QUE ESTE ARQUIVO PAGA ───
 *  1. A BALA ATRAVESSA. A serra fere quem encostar e ignora o tiro — é isso que mantém a linha de tiro
 *     limpa durante a cravada. Por isso ela vive num grupo SÓ DE PERIGO (`BossNucleo.perigos`), contra o
 *     qual ninguém registra as balas do jogador.
 *  2. NADA DE TRAÇO VETORIAL. O aviso e o cabo são quadradinhos de cor chapada em posição INTEIRA, nunca
 *     `Graphics` com linha — traço antisserrilhado não pertence a um jogo de pixel (a lei que a 1ª versão
 *     do fim do predador pagou caro, 17/09).
 */
export class SerraGuardiao {
  /** Diâmetro na tela: a arte é 96² e o vão jogável tem 160px — a serra ocupa ~28% dele. */
  static readonly ESCALA = 0.46;
  /** Velocidade da diagonal. A nave anda a 110px/s: a serra é mais rápida, mas o caminho é anunciado. */
  static readonly VEL = 150;
  /** A faixa do ângulo SORTEADO da primeira diagonal, em graus acima da horizontal. */
  static readonly ANG_MIN = 24;
  static readonly ANG_MAX = 48;
  /** A conjuração: quanto tempo o fio de aviso fica na tela antes de a serra sair. */
  static readonly AVISO_MS = 700;
  /**
   * Um "tentar girar travada". Ele pediu 2 na cravada de cima e 1 nas de baixo — e como a cravada É a
   * janela de dano da luta, esta é a duração que decide quanto dá para machucá-lo. Com 340ms a de baixo
   * durava um terço de segundo, curto demais para virar e atirar.
   */
  static readonly GIRO_MS = 520;
  static readonly GIROS = [2, 1, 1, 1];
  /**
   * O passo dos quadradinhos, em px de tela. O CABO é denso (elo colado no elo) para ler como corda; o
   * AVISO é esparso de propósito, para os dois nunca serem confundidos na tela ao mesmo tempo.
   */
  static readonly PASSO_CABO = 3;
  static readonly PASSO_AVISO = 7;
  /** A espessura de cada elo do cabo. O aviso é sempre 2 — fio fino, não corda. */
  static readonly GROSSURA_CABO = 3;

  /**
   * ⚠️ A COR SAI DOS CABOS DELE, MEDIDA NO PNG, e é a CLARA das duas. O feixe do guardião tem 0x282018
   * (sombra) e 0x604838 (o lado aceso); a primeira captura usou o tom escuro e o cabo SUMIU contra a
   * pintura da arena, que também é quase preta. Um cabo que não se vê não liga a serra a ninguém.
   */
  private static readonly COR_CABO = 0x604838;
  private static readonly COR_CABO_SOMBRA = 0x282018;
  private static readonly COR_AVISO = 0xff6a2a;
  private static readonly DEPTH_SERRA = 7;
  /** O cabo passa ATRÁS da nave (decisão dele: *"só visual — passa por trás e não fere"*). */
  private static readonly DEPTH_CABO = -0.5;

  /**
   * Os dois clipes. ⚠️ Nada de `setRotation` para girar a serra: rotação em tempo de jogo reamostra o
   * pixel e alisa o traço — a mesma lição que o giro de 8 direções do predador pagou. O giro é ARTE.
   * Sem as folhas, o motor cai no estático, como no resto do projeto.
   */
  static registrarAnims(scene: Phaser.Scene): void {
    for (const [chave, folha, ms] of [
      ['serra-giro', 'serraGiroSheet', 520],
      ['serra-travada', 'serraTravadaSheet', SerraGuardiao.GIRO_MS],
    ] as const) {
      if (!scene.textures.exists(folha) || scene.anims.exists(chave)) continue;
      const total = scene.textures.get(folha).frameTotal - 1; // o `__BASE` conta
      scene.anims.create({
        key: chave,
        frames: scene.anims.generateFrameNumbers(folha, { start: 0, end: total - 1 }),
        frameRate: (total * 1000) / ms,
        repeat: -1,
      });
    }
  }

  readonly sprite: Phaser.Physics.Arcade.Sprite;

  private estado: 'aviso' | 'voo' | 'crava' | 'fora' = 'aviso';
  private t = 0;
  /** O raio na tela, para a serra cravar com a BORDA na parede e não com o centro. */
  private readonly raio: number;
  private readonly ang: number;
  /** +1 desce, −1 sobe. A primeira perna sobe, como ele desenhou. */
  private dir: -1 | 1 = -1;
  private cravadasFeitas = 0;
  private readonly pontos: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    grupo: Phaser.Physics.Arcade.Group,
    private readonly fx: Fx,
    /** Onde o cabo nasce — o guardião FLUTUA, então isto é lido a cada quadro, não copiado. */
    private readonly ancora: () => { x: number; y: number },
    private readonly topo: number,
    private readonly base: number,
    /** Quantas cravadas antes de sair. 2 nos dois primeiros degraus de vida, 3 no último. */
    private readonly cravadas: number,
  ) {
    const o = ancora();
    this.ang = Phaser.Math.DegToRad(Phaser.Math.FloatBetween(SerraGuardiao.ANG_MIN, SerraGuardiao.ANG_MAX));

    this.sprite = grupo.create(o.x, o.y, 'serraGuardiao') as Phaser.Physics.Arcade.Sprite;
    this.sprite.setScale(SerraGuardiao.ESCALA).setDepth(SerraGuardiao.DEPTH_SERRA);
    this.raio = (this.sprite.displayWidth / 2) * 0.8; // 0,8: os dentes não são disco cheio
    this.sprite.setCircle(
      this.sprite.width * 0.4,
      this.sprite.width * 0.1,
      this.sprite.height * 0.1,
    );
    // Na conjuração ela ainda não existe para o jogo: só o aviso está na tela.
    this.sprite.setVisible(false);
    this.sprite.body!.enable = false;
    this.tocar('serra-giro');
  }

  /** O guardião está ancorado segurando o cabo — é a janela de dano. */
  get cravada(): boolean {
    return this.estado === 'crava';
  }

  get viva(): boolean {
    return this.estado !== 'fora';
  }

  update(dt: number): void {
    if (this.estado === 'fora') return;
    this.t += dt;
    const o = this.ancora();

    switch (this.estado) {
      case 'aviso': {
        this.desenharAviso(o);
        if (this.t * 1000 >= SerraGuardiao.AVISO_MS) {
          this.limparPontos();
          this.estado = 'voo';
          this.t = 0;
          this.sprite.setPosition(o.x, o.y).setVisible(true);
          this.sprite.body!.enable = true;
        }
        break;
      }

      case 'voo': {
        const vx = -SerraGuardiao.VEL * Math.cos(this.ang);
        const vy = this.dir * SerraGuardiao.VEL * Math.sin(this.ang);
        this.sprite.x += vx * dt;
        this.sprite.y += vy * dt;

        // Já deu todas as cravadas: esta perna é a saída, e ela só acaba fora da tela.
        if (this.cravadasFeitas >= this.cravadas) {
          if (this.sprite.x < -this.raio || this.sprite.y < this.topo - this.raio * 2) this.sair();
          break;
        }
        const alvo = this.dir < 0 ? this.topo + this.raio : this.base - this.raio;
        const chegou = this.dir < 0 ? this.sprite.y <= alvo : this.sprite.y >= alvo;
        if (chegou) {
          this.sprite.y = alvo;
          this.cravar();
        } else if (this.sprite.x < -this.raio) {
          // Saiu pela esquerda antes de alcançar a borda (ângulo raso): não fica presa no limbo.
          this.sair();
        }
        break;
      }

      case 'crava': {
        const giros = SerraGuardiao.GIROS[Math.min(this.cravadasFeitas - 1, SerraGuardiao.GIROS.length - 1)];
        if (this.t * 1000 >= giros * SerraGuardiao.GIRO_MS) {
          this.dir = this.dir < 0 ? 1 : -1;
          this.estado = 'voo';
          this.t = 0;
          this.tocar('serra-giro');
        }
        break;
      }
    }

    this.desenharCabo(o);
  }

  private cravar(): void {
    this.cravadasFeitas += 1;
    this.estado = 'crava';
    this.t = 0;
    this.tocar('serra-travada');
    // A mordida na borda: faíscas e um tranco de câmera. A serra fica onde cravou.
    this.fx.explode(this.sprite.x, this.sprite.y, 0.5);
    this.scene.cameras.main.shake(90, 0.004);
  }

  private sair(): void {
    this.estado = 'fora';
    this.limparPontos();
    this.sprite.destroy();
  }

  private tocar(chave: string): void {
    if (this.scene.anims.exists(chave)) this.sprite.play(chave, true);
  }

  /** O fio da PRIMEIRA diagonal, da âncora até a borda de cima: é ele que torna o sorteio justo. */
  private desenharAviso(o: { x: number; y: number }): void {
    const alvoY = this.topo + this.raio;
    const dist = (o.y - alvoY) / Math.sin(this.ang);
    const n = Math.floor(dist / SerraGuardiao.PASSO_AVISO);
    // Pisca no ritmo do telégrafo da investida, para o jogador ler as duas coisas com o mesmo olho.
    const aceso = Math.floor(this.t * 12) % 2 === 0;
    this.pontosAte(n, (i) => ({
      x: o.x - Math.cos(this.ang) * i * SerraGuardiao.PASSO_AVISO,
      y: o.y - Math.sin(this.ang) * i * SerraGuardiao.PASSO_AVISO,
      cor: SerraGuardiao.COR_AVISO,
      lado: 2,
      alpha: aceso ? 0.85 : 0.35,
      depth: SerraGuardiao.DEPTH_CABO,
    }));
  }

  /** O cabo: da âncora até a serra, com uma barriga de corda frouxa. Só visual. */
  private desenharCabo(o: { x: number; y: number }): void {
    if (this.estado === 'aviso' || this.estado === 'fora') return;
    const dx = this.sprite.x - o.x;
    const dy = this.sprite.y - o.y;
    const dist = Math.hypot(dx, dy);
    const n = Math.floor(dist / SerraGuardiao.PASSO_CABO);
    // A barriga é máxima no meio e some nas pontas — corda pesada, não linha reta de vetor.
    const barriga = Math.min(18, dist * 0.12);
    this.pontosAte(n, (i) => {
      const k = i / Math.max(1, n);
      return {
        x: o.x + dx * k,
        y: o.y + dy * k + Math.sin(k * Math.PI) * barriga,
        // Um elo em três é a sombra: o cabo lê como corda torcida, e não como pontilhado regular.
        cor: i % 3 === 2 ? SerraGuardiao.COR_CABO_SOMBRA : SerraGuardiao.COR_CABO,
        lado: SerraGuardiao.GROSSURA_CABO,
        alpha: 1,
        depth: SerraGuardiao.DEPTH_CABO,
      };
    });
  }

  /**
   * Mantém EXATAMENTE `n` quadradinhos, reaproveitando os que já existem — criar e destruir dezenas de
   * `Rectangle` por quadro é o tipo de coisa que só aparece como engasgo depois, no hardware dele.
   */
  private pontosAte(
    n: number,
    onde: (i: number) => { x: number; y: number; cor: number; lado: number; alpha: number; depth: number },
  ): void {
    for (let i = this.pontos.length; i < n; i++) {
      this.pontos.push(this.scene.add.rectangle(0, 0, 2, 2, 0xffffff).setOrigin(0.5, 0.5));
    }
    for (let i = 0; i < this.pontos.length; i++) {
      const p = this.pontos[i];
      if (i >= n) {
        p.setVisible(false);
        continue;
      }
      const d = onde(i);
      // ⚠️ POSIÇÃO INTEIRA: meio pixel num retângulo de 2px vira uma borda cinza — o serrilhado que a
      // arte toda evita. Arredondar aqui é o que faz o cabo parecer desenhado e não traçado.
      p.setVisible(true)
        .setPosition(Math.round(d.x), Math.round(d.y))
        .setSize(d.lado, d.lado)
        .setFillStyle(d.cor, d.alpha)
        .setDepth(d.depth);
    }
  }

  private limparPontos(): void {
    for (const p of this.pontos) p.destroy();
    this.pontos.length = 0;
  }

  destroy(): void {
    this.limparPontos();
    if (this.sprite.active) this.sprite.destroy();
    this.estado = 'fora';
  }

  /** A serra nasce na boca do cabo do guardião e some quando passa da borda esquerda. */
  static foraDaTela(x: number): boolean {
    return x < -64 || x > GAME_WIDTH + 64;
  }
}
