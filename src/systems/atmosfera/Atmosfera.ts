import Phaser from 'phaser';
import { AtmosferaPipeline, CHAVE_ATMOSFERA } from './AtmosferaPipeline';
import { interpolarPerfil, type PerfilAtmosfera } from './perfis';

/**
 * A ATMOSFERA — o motor de névoa, luz e grão das cutscenes (spec 2026-09-25-atmosfera-engine-design.md §3.2).
 *
 *   const atm = new Atmosfera(scene, { limiteLimpo: DEPTH.TEXTO, profundidadePoeira: DEPTH.NAVE - 1 });
 *   atm.perfil(PERFIS.viscera);           // corte: troca seca
 *   atm.perfil(PERFIS.apagando, 4600);    // transição
 *   atm.update(dt);                       // no update da cena
 *   atm.fadeOut(ms);                      // o fade das DUAS câmeras
 *
 * A CÂMERA LIMPA: o que tem `depth >= limiteLimpo` (texto, painéis) é desenhado por uma segunda câmera, sem o shader;
 * a principal o ignora. A triagem é por profundidade, a cada quadro — os capítulos não precisam avisar nada.
 * A nave fica DENTRO do tratamento (na prévia ela assentou no ar da cena; limpa, pareceria colada).
 *
 * SEM WEBGL (renderer Canvas): nada é criado e todo método vira no-op; a cena roda como antes.
 */
export interface OpcoesAtmosfera {
  /** Daqui para cima, o objeto fica fora do tratamento. */
  limiteLimpo: number;
  /** A profundidade da poeira (abaixo da nave). */
  profundidadePoeira: number;
}

/** O que a sonda lê. */
export interface EstadoAtmosfera {
  ativo: boolean;
  perfil: string | null;
  densidade: number;
  grao: number;
  gradeQuente: number;
  /** Quantos objetos a câmera limpa está desenhando agora. */
  limpos: number;
}

const TEX_PX = 'atmPx';
/** Quanto vive cada grão de poeira (ms). */
const VIDA_POEIRA = 6000;

export class Atmosfera {
  private readonly ativo: boolean;
  private pipeline: AtmosferaPipeline | null = null;
  private limpa: Phaser.Cameras.Scene2D.Camera | null = null;
  private poeira: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private de: PerfilAtmosfera | null = null;
  private para: PerfilAtmosfera | null = null;
  private atual: PerfilAtmosfera | null = null;
  private transMs = 0;
  private transDecorrido = 0;
  private tempo = 0;
  private limpos = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly opcoes: OpcoesAtmosfera,
  ) {
    this.ativo = scene.renderer.type === Phaser.WEBGL;
    if (!this.ativo) return;

    const renderer = scene.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
    if (!renderer.pipelines.postPipelineClasses.has(CHAVE_ATMOSFERA)) {
      renderer.pipelines.addPostPipeline(CHAVE_ATMOSFERA, AtmosferaPipeline);
    }
    const cam = scene.cameras.main;
    cam.setPostPipeline(CHAVE_ATMOSFERA);
    this.pipeline = cam.getPostPipeline(CHAVE_ATMOSFERA) as AtmosferaPipeline;
    this.limpa = scene.cameras.add(0, 0, cam.width, cam.height, false, 'limpa');

    if (!scene.textures.exists(TEX_PX)) {
      const t = scene.textures.createCanvas(TEX_PX, 1, 1);
      if (t) {
        t.context.fillStyle = '#ffffff';
        t.context.fillRect(0, 0, 1, 1);
        t.refresh();
      }
    }
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destruir());
  }

  /** Troca o perfil: `ms = 0` é o corte seco; `ms > 0` interpola todos os números. */
  perfil(p: PerfilAtmosfera, ms = 0): void {
    if (!this.ativo) return;
    if (ms <= 0 || !this.atual) {
      this.de = null;
      this.para = p;
      this.atual = p;
      this.transMs = 0;
      this.montarPoeira(p);
    } else {
      this.de = this.atual;
      this.para = p;
      this.transMs = ms;
      this.transDecorrido = 0;
    }
    if (this.pipeline) this.pipeline.perfil = this.atual;
  }

  update(dt: number): void {
    if (!this.ativo || !this.pipeline) return;
    this.tempo += dt;
    if (this.de && this.para && this.transMs > 0) {
      this.transDecorrido += dt * 1000;
      const k = Math.min(1, this.transDecorrido / this.transMs);
      this.atual = interpolarPerfil(this.de, this.para, k);
      if (k >= 1) {
        this.de = null;
        this.transMs = 0;
      }
    }
    this.pipeline.perfil = this.atual;
    this.pipeline.tempo = this.tempo;
    this.triar();
  }

  /** O fade para o preto nas DUAS câmeras (o texto some junto). */
  fadeOut(ms: number): void {
    this.scene.cameras.main.fadeOut(ms, 0, 0, 0);
    this.limpa?.fadeOut(ms, 0, 0, 0);
  }

  estado(): EstadoAtmosfera {
    const p = this.atual;
    return {
      ativo: this.ativo,
      perfil: p?.nome ?? null,
      densidade: p ? +p.nevoa.densidade.toFixed(3) : 0,
      grao: p ? +p.grao.toFixed(3) : 0,
      gradeQuente: p ? +p.gradeQuente.toFixed(3) : 0,
      limpos: this.limpos,
    };
  }

  /** Cada objeto vai para UMA câmera: a limpa (texto) ou a principal (o resto, com o shader). */
  private triar(): void {
    const main = this.scene.cameras.main;
    const limpa = this.limpa;
    if (!limpa) return;
    let n = 0;
    for (const o of this.scene.children.list) {
      const obj = o as Phaser.GameObjects.GameObject & { depth: number };
      if (obj.depth >= this.opcoes.limiteLimpo) {
        obj.cameraFilter = main.id;
        n++;
      } else {
        obj.cameraFilter = limpa.id;
      }
    }
    this.limpos = n;
  }

  /** A poeira do perfil: grãos de 1 px com a própria deriva e cintilar, já espalhados pela tela. */
  private montarPoeira(p: PerfilAtmosfera): void {
    this.poeira?.destroy();
    const { width: W, height: H } = this.scene.scale;
    const [r, g, b] = p.poeira.cor;
    const { deriva, espalhar, quantidade } = p.poeira;
    this.poeira = this.scene.add
      .particles(0, 0, TEX_PX, {
        x: { min: 0, max: W },
        y: { min: 0, max: H },
        lifespan: VIDA_POEIRA,
        speedX: { min: deriva[0] - espalhar, max: deriva[0] + espalhar },
        speedY: { min: deriva[1] - espalhar, max: deriva[1] + espalhar },
        alpha: { values: [0, 0.6, 0.45, 0.6, 0], interpolation: 'linear' },
        tint: (r << 16) | (g << 8) | b,
        frequency: VIDA_POEIRA / quantidade,
      })
      .setDepth(this.opcoes.profundidadePoeira);
    this.poeira.fastForward(VIDA_POEIRA);
  }

  private destruir(): void {
    this.poeira?.destroy();
    this.poeira = null;
    // ⚠️ DESVIO (25/09): o `CameraManager` registra o PRÓPRIO `SHUTDOWN` no boot da cena, antes do nosso —
    // ele dispara primeiro, zera `cameras.main` e destrói todas as câmeras. `main` já pode não existir aqui.
    this.scene.cameras.main?.removePostPipeline(CHAVE_ATMOSFERA);
    if (this.limpa) this.scene.cameras.remove(this.limpa);
    this.limpa = null;
    this.pipeline = null;
  }
}
