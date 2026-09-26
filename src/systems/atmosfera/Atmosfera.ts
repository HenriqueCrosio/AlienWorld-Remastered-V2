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
 *   atm.suspender();                      // ANTES de um snapshot: o próximo quadro sai sem tratamento
 *
 * A CÂMERA LIMPA: o que tem `depth >= limiteLimpo` (texto, painéis) é desenhado por uma segunda câmera, sem o shader;
 * a principal o ignora. A triagem roda em `Phaser.Scenes.Events.PRE_RENDER` (não em `update`) — depois de todo
 * spawn/física/timer do quadro e antes do render, então nada nasce "um quadro sem câmera" e o game over não a
 * atropela (o `update()` da cena pode retornar cedo; o evento da cena, não). A nave fica DENTRO do tratamento
 * (na prévia ela assentou no ar da cena; limpa, pareceria colada).
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
  /** 0–1: o quanto do flash da câmera está na tela (o halo cede). */
  flash: number;
  /** 0–1: o quanto do fade de saída já escureceu. */
  escuro: number;
  /** A costura suspendeu o tratamento (ver `Atmosfera.suspender`)? */
  suspenso: boolean;
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
  /** Ligado por `suspender()`: a costura pediu um quadro sem tratamento nenhum (ver ali). */
  private suspenso = false;
  /**
   * A TRIAGEM DAS CÂMERAS, em evento — não mais chamada de dentro de `update()`. ⚠️ 26/09 (achado do
   * review): `triar()` rodava no `update()` da `Atmosfera`, que só é chamado pelo `update()` da cena —
   * e (a) um objeto nascido DEPOIS dessa chamada no mesmo quadro (spawn, fx, colisão, timer) herdava
   * `cameraFilter = 0` por um quadro inteiro, e (b) depois do game over o `GameScene.update` retorna
   * cedo (`if (this.over) return`), então a explosão da morte e as de vitória — que nascem nos ~900ms
   * seguintes — nunca eram triadas e desenhavam por cima da câmera limpa, sem o shader.
   * `Phaser.Scenes.Events.PRE_RENDER` ("dispatched after the Scene Display List is sorted and before
   * the Scene is rendered", `PRE_RENDER_EVENT.js`) dispara TODO quadro em que a cena é visível,
   * mesmo que o `update()` dela tenha retornado cedo — é depois de todo update/timer/física do
   * quadro e antes do render, exatamente o ponto que a triagem pede.
   */
  private readonly aoPreRenderizar = (): void => this.triar();

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
    scene.events.on(Phaser.Scenes.Events.PRE_RENDER, this.aoPreRenderizar);
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
        // A POEIRA SEGUE A PINTURA (achado do review, 26/09): antes só o corte seco chamava
        // `montarPoeira` — a poeira do perfil de PARTIDA sobrevivia a toda a transição (a poeira
        // zero-G continuava no ar depois de romper a atmosfera; a poeira da câmara A da F4 seguia
        // caindo até a câmara D). Agora, ao fechar a transição, a poeira troca para o DESTINO.
        this.montarPoeira(this.para);
        this.de = null;
        this.transMs = 0;
      }
    }
    // A COSTURA (Fatia 9, achado do review): `suspender()` já escreveu `perfil = null` direto no
    // pipeline para o quadro que o snapshot captura — reescrevê-lo aqui com `this.atual` desfaria a
    // suspensão a cada quadro que ainda rodar depois dela.
    if (!this.suspenso) this.pipeline.perfil = this.atual;
    this.pipeline.tempo = this.tempo;
    // O FADE PARA O PRETO (spec da correção de 25/09): o `WebGLRenderer#postRenderCamera` desenha o fade da
    // câmera principal ANTES do shader (`postBatchCamera`), então sem repassar o progresso pro pipeline o fade
    // "final" passa por dentro da Atmosfera e vira névoa em movimento em vez de preto. `fadeEffect.progress` (não
    // `.alpha`, que o `phaser.d.ts` mantém privado) serve igual: aqui só se usa `fadeOut` — nunca `fadeIn` — e
    // nesse sentido (`direction = true`) o Phaser faz `alpha === progress` (`Fade.js#update`).
    const fade = this.scene.cameras.main.fadeEffect;
    this.pipeline.escuro = fade.isRunning || fade.isComplete ? fade.progress : 0;
    // O FLASH: `alpha` cai de 1 a 0 ao longo do flash (Phaser `Effects.Flash`, público e tipado).
    const flash = this.scene.cameras.main.flashEffect;
    this.pipeline.flash = flash.isRunning ? flash.alpha : 0;
  }

  /**
   * A COSTURA SAI LIMPA (Fatia 9, achado do review): `GameScene.fotografarCostura` chama isto ANTES
   * de pedir o `renderer.snapshot` — o snapshot só entrega a imagem depois que o quadro CORRENTE
   * termina de renderizar (`WebGLRenderer#snapshot`: "a snapshot ... will be taken after the current
   * frame is fully rendered"), e o pipeline lê `perfil` no PRÓPRIO `onPreRender` desse mesmo quadro.
   * Como isto roda antes do render (dentro do `update` que pediu a foto), zerar `perfil` aqui já vale
   * para o quadro capturado — sem isso `f8Costura` saía com a névoa/vinheta/grão do F4d por baixo, e
   * `dentro.ts` aplicava o perfil `viscera` OUTRA VEZ em cima (vinheta e grão em dobro, poeira presa).
   * A poeira soma o mesmo problema (grãos congelados no meio do ar): esconde-se o emissor junto.
   */
  suspender(): void {
    if (!this.ativo) return;
    this.suspenso = true;
    if (this.pipeline) this.pipeline.perfil = null;
    this.poeira?.setVisible(false);
  }

  /** O fade para o preto nas DUAS câmeras (o texto some junto). */
  fadeOut(ms: number): void {
    this.scene.cameras.main.fadeOut(ms, 0, 0, 0);
    this.limpa?.fadeOut(ms, 0, 0, 0);
  }

  estado(): EstadoAtmosfera {
    // ⚠️ LÊ DO PIPELINE, NÃO DE `this.atual` — é `pipeline.perfil` quem de fato pinta o quadro, e
    // `suspender()` o zera sem tocar em `this.atual` (o controlador ainda "sabe" qual era o perfil).
    // A sonda cobra exatamente essa diferença: depois de `suspender()`, o tratamento tem de ler
    // desligado por AQUI, não só pela flag `suspenso`.
    const p = this.pipeline?.perfil ?? null;
    return {
      ativo: this.ativo,
      perfil: p?.nome ?? null,
      densidade: p ? +p.nevoa.densidade.toFixed(3) : 0,
      grao: p ? +p.grao.toFixed(3) : 0,
      gradeQuente: p ? +p.gradeQuente.toFixed(3) : 0,
      limpos: this.limpos,
      flash: this.pipeline ? +this.pipeline.flash.toFixed(3) : 0,
      escuro: this.pipeline ? +this.pipeline.escuro.toFixed(3) : 0,
      suspenso: this.suspenso,
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
    // Se a costura já suspendeu o tratamento, a poeira NOVA nasce escondida — sem isto, uma
    // transição que fechasse bem no quadro da foto religaria a poeira que `suspender()` apagou.
    if (this.suspenso) this.poeira.setVisible(false);
  }

  private destruir(): void {
    this.scene.events.off(Phaser.Scenes.Events.PRE_RENDER, this.aoPreRenderizar);
    this.poeira?.destroy();
    this.poeira = null;
    // ⚠️ DESVIO (25/09): o `CameraManager` registra o PRÓPRIO `SHUTDOWN` no boot da cena, antes do nosso —
    // ele dispara primeiro, zera `cameras.main` e destrói todas as câmeras. `Camera#destroy` só chama
    // `resetFX()` (rotação/pan/shake/flash/fade), que NÃO conhece post-pipeline: sem isto, nem a câmera nem o
    // `CameraManager` jamais destruíam o `AtmosferaPipeline` — cada corrida vazava a instância e os RenderTargets.
    const main = this.scene.cameras.main;
    if (main) {
      main.removePostPipeline(CHAVE_ATMOSFERA); // já destrói a instância por dentro (`PostPipeline#removePostPipeline`)
    } else {
      this.pipeline?.destroy(); // o caso de sempre: `main` já não existe, então destrua DIRETO
    }
    if (this.limpa) this.scene.cameras.remove(this.limpa);
    this.limpa = null;
    this.pipeline = null;
  }
}
