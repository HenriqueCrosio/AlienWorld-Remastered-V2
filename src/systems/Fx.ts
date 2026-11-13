import Phaser from 'phaser';
import { claraoDe } from './clarao/Clarao';
import { COLORS } from '../config';
import { FOLHAS_EXPLOSAO, FPS_EXPLOSAO, escolheFolha } from './explosoes/folhasExplosao';
import type { TipoExplosao } from './explosoes/tipoExplosao';

/**
 * Explosões e impactos: SPRITE ANIMADO + fagulhas em partícula. (09/11, bloco I: as folhas são as explosões novas, assadas
 * em pixel por material — `scripts/_i/explosoes/receitas.mjs`; as antigas do PixelLab estão em `assets/raw/backup-explosoes/`.)
 *
 * ─── A SHEET SOZINHA NÃO BASTA, A PARTÍCULA SOZINHA NÃO BASTAVA ───
 *
 * A era anterior era só partícula aditiva: em movimento lia como clarão, mas parada (num
 * screenshot, num set-piece de cutscene) era fraquinha — uma explosão sem CORPO. A sheet
 * (`explosion`, 13f: núcleo branco-quente → chamas → fumaça escura) dá o corpo; as fagulhas
 * voando dão a energia que nenhum sheet tem (matéria arremessada). A combinação é o AAA.
 *
 * Os sprites são ONE-SHOT: `play` + `once('animationcomplete', destroy)` — sem pool, porque
 * a vida deles é a própria animação. Sem a sheet em disco, cai nas partículas de sempre
 * (arte entra asset por asset; a guarda é `anims.exists`).
 */
export class Fx {
  /**
   * A ZONA da cena (09/11, bloco I): na atmosfera (a F1) a fumaça das explosões sobe; no vácuo nada sobe nem cai. Quem
   * monta a cena diz (a `GameScene` pela zona da fase); as cutscenes ficam no vácuo.
   */
  zona: 'vac' | 'atm' = 'vac';
  /** o lado de cada estouro alterna (sem tocar no sorteio do jogo) */
  private lado = 0;
  private readonly burst: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly hitSpark: Phaser.GameObjects.Particles.ParticleEmitter;
  /** As fagulhas do `choque` — a família FRIA. Ver o construtor. */
  private readonly faisca: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor(private readonly scene: Phaser.Scene) {
    this.burst = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 180, max: 420 },
        speed: { min: 30, max: 130 },
        scale: { start: 1.5, end: 0 },
        tint: [COLORS.hotBright, COLORS.hot, COLORS.enemyBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.hitSpark = scene.add
      .particles(0, 0, 'spark', {
        lifespan: 140,
        speed: { min: 20, max: 70 },
        scale: { start: 1, end: 0 },
        tint: [COLORS.playerGlow, COLORS.playerBright],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    // A FAGULHA FRIA: a matéria arremessada pelo `choque`. O `burst` de sempre é da família do
    // FOGO (hotBright/hot/enemyBright) e num estouro elétrico ele entregaria brasa laranja
    // voando de dentro de um bicho azul.
    this.faisca = scene.add
      .particles(0, 0, 'spark', {
        lifespan: { min: 140, max: 320 },
        speed: { min: 40, max: 140 },
        scale: { start: 1.2, end: 0 },
        tint: [0xd8f4ff, 0x9fe8ff, 0x35b6ea],
        blendMode: 'ADD',
        emitting: false,
      })
      .setDepth(50);

    this.registerAnims();
  }

  /**
   * As animações das folhas (carregadas no BootScene). Registradas UMA vez — o Fx é criado
   * por cena, e `anims.create` com chave repetida gritaria; a guarda `anims.exists` resolve.
   *
   * ⚠️ 09/11 (bloco I): as explosões são as do manifesto `FOLHAS_EXPLOSAO` (uma anim por folha, a cor e a luz, a 20
   * quadros/s). As três antigas do PixelLab (`explosion`, `explosion-small`, `explosion-big` e a `implosion-big`, a grande
   * ao contrário) saíram com as folhas delas, para `assets/raw/backup-explosoes/`.
   */
  private registerAnims(): void {
    const anims = this.scene.anims;
    const tex = this.scene.textures;
    for (const f of Object.values(FOLHAS_EXPLOSAO)) {
      for (const k of [f.chave, f.luz]) {
        if (!tex.exists(k) || anims.exists(k)) continue;
        anims.create({ key: k, frames: anims.generateFrameNumbers(k, { start: 0, end: f.quadros - 1 }), frameRate: FPS_EXPLOSAO, repeat: 0 });
      }
    }
  }

  /**
   * Um sprite one-shot de uma folha qualquer: toca a animação UMA vez e se destrói (as explosões das cartas aprovadas,
   * `ExplosaoDoJogador`). Devolve o sprite para a cena ajustar profundidade/escala.
   */
  sheetSprite(
    anim: string,
    texKey: string,
    x: number,
    y: number,
    escala: number,
    depth: number,
  ): Phaser.GameObjects.Sprite | null {
    if (!this.scene.anims.exists(anim)) return null;

    const s = this.scene.add.sprite(x, y, texKey, 0).setScale(escala).setDepth(depth);
    s.play(anim);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    return s;
  }

  /**
   * A explosão de combate: a folha do material + fagulhas + shake.
   *
   * `size` é o parâmetro histórico (1 = inimigo comum, 1.5 = prop/torre, 2+ = mina/capital) e escolhe o TAMANHO da
   * folha (`escolheFolha`: ≤ 1,25 a pequena, ≤ 2 a média, mais a grande), que só reduz. `tipo` é o material de quem
   * explode (`tipoDoMaterial`); sem ele, o A (`perigo`). `depth` expõe a frente de cena das cutscenes.
   */
  explode(x: number, y: number, size = 1, depth = 50, tipo: TipoExplosao = 'perigo'): Phaser.GameObjects.Sprite | null {
    this.abalo(x, y, size);
    return this.explosao(tipo, x, y, size, depth);
  }

  /**
   * Só o ABALO de uma explosão — as fagulhas e o tremor da tela, sem o desenho. Para quem estoura com a PRÓPRIA arte
   * (as explosões das cartas, `ExplosaoDoJogador`) e quer o mesmo peso de impacto do `explode`.
   */
  abalo(x: number, y: number, size = 1): void {
    this.burst.explode(Math.floor(10 * size), x, y);
    this.scene.cameras.main.shake(90 * size, 0.004 * size);
  }

  /**
   * A DETONAÇÃO GRANDE: morte de chefão, a bomba, os clímaxes das cutscenes. Shake mais longo + um flash curto — o peso
   * do impacto. `escala` 1 = `size` 2 do `explode`.
   */
  explodeBig(x: number, y: number, escala = 1, depth = 50, tipo: TipoExplosao = 'perigo'): Phaser.GameObjects.Sprite | null {
    this.burst.explode(Math.floor(16 * escala), x, y);
    this.scene.cameras.main.shake(320 * escala, 0.006 * escala);
    claraoDe(this.scene).impacto(x, y, 0xffbe6e, { escala });
    return this.explosao(tipo, x, y, 2 * escala, depth);
  }

  /**
   * Só o PESO da detonação grande — as fagulhas, o tremor longo e o flash curto do `explodeBig` —, sem a sheet. Para quem
   * estoura com a PRÓPRIA arte (a morte da Torre da F1 com a explosão da queda do Leviatã, bloco G).
   */
  abaloGrande(x: number, y: number, escala = 1): void {
    this.burst.explode(Math.floor(16 * escala), x, y);
    this.scene.cameras.main.shake(320 * escala, 0.006 * escala);
    claraoDe(this.scene).impacto(x, y, 0xffbe6e, { escala });
  }

  /**
   * A IMPLOSÃO (o `implosion` do pixelfx, na rampa de fogo): matéria sugada para dentro. Sem flash: implodir é a tela
   * PERDER luz. (A Aurora deixou de implodir em 09/11 — ela explode; quem chama hoje é a Serpente.)
   */
  implodeBig(x: number, y: number, escala = 1, depth = 50): Phaser.GameObjects.Sprite | null {
    this.scene.cameras.main.shake(340 * escala, 0.005 * escala);
    return this.explosao('implosao', x, y, 2 * escala, depth);
  }

  /**
   * A explosão PURA, sem shake nem flash: para impactos em SILÊNCIO (a chuva de meteoros da cutscene final — lá o
   * silêncio é o preço, e o `explode` sacode a tela a cada estouro). As fagulhas ficam a cargo da cena. `escala` é a
   * da média antiga (64 px), por isso o `/ 0,6`.
   */
  sheetExplosion(
    x: number,
    y: number,
    escala: number,
    depth = 50,
  ): Phaser.GameObjects.Sprite | null {
    return this.explosao('perigo', x, y, escala / 0.6, depth);
  }

  /**
   * UMA EXPLOSÃO DO BLOCO I (09/11; spec `specs/2026-11-09-bloco-i-explosoes-design.md`): a folha do tipo na zona da cena
   * e no tamanho certo (`escolheFolha`: o jogo só REDUZ), a COR e por cima a LUZ em ADD, as duas one-shot. `size` está
   * nas unidades do `explode` (1 = inimigo comum; `explodeBig(e)` = 2e). Sem a folha em disco, `null` (quem chama cai na
   * de sempre). Só o desenho: o abalo e o flash ficam com quem chama.
   */
  explosao(tipo: TipoExplosao, x: number, y: number, size = 1, depth = 50): Phaser.GameObjects.Sprite | null {
    const e = escolheFolha(tipo, this.zona, size);
    if (!e || !this.scene.anims.exists(e.folha.chave)) return null;
    const vira = (this.lado++ & 1) === 1;
    const s = this.scene.add.sprite(x, y, e.folha.chave, 0).setScale(e.escala).setDepth(depth).setFlipX(vira);
    s.play(e.folha.chave);
    s.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => s.destroy());
    if (this.scene.anims.exists(e.folha.luz)) {
      const l = this.scene.add.sprite(x, y, e.folha.luz, 0).setScale(e.escala).setDepth(depth + 0.01).setFlipX(vira)
        .setBlendMode(Phaser.BlendModes.ADD);
      l.play(e.folha.luz);
      l.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => l.destroy());
    }
    return s;
  }

  hit(x: number, y: number): void {
    this.hitSpark.explode(3, x, y);
  }

  /**
   * ─── O CHOQUE ─── a assinatura elétrica da água-viva (Fase 3, Ato 1).
   *
   * Pedido do Henrique depois do 3º teste: *"gostei do mini caos que elas trazem... só preciso do
   * efeito de choque que não vi ainda, algo que pareça que ela dá choque, ao morrer o efeito de
   * explosão de choque."* A criatura já ACENDIA (o `innerStrength` pulsando em `EnemySystem`),
   * mas acender não é dar choque: luz é estado, arco é EVENTO.
   *
   * ⚠️ DESENHADO, NÃO GERADO — e pelo mesmo motivo de sempre nesta fatia. "Um raio irregular
   * entre dois pontos" cabe numa frase de geometria, e foi exatamente esse tipo de frase que o
   * PixelLab leu como HÉLICE no rabo. Raio é polilinha com ruído: uma dúzia de linhas aqui, e
   * não tem como sair errado.
   *
   * ⚠️ ADITIVO E EM DUAS PASSADAS. Um traço só, de uma cor só, lê como risco de caneta. A passada
   * grossa em ciano médio é o halo; a fina em quase-branco por cima é o núcleo. É a mesma
   * gramática do traçante da Capitânia (halo + núcleo), na escala de um bicho de 25px.
   */
  private raio(g: Phaser.GameObjects.Graphics, x0: number, y0: number, x1: number, y1: number, caos: number, N = 4): void {
    const pts: [number, number][] = [[x0, y0]];
    for (let i = 1; i < N; i++) {
      const t = i / N;
      // O desvio é máximo no MEIO e zero nas pontas — um raio nasce e morre onde foi ancorado.
      const peso = Math.sin(t * Math.PI);
      pts.push([
        x0 + (x1 - x0) * t + Phaser.Math.FloatBetween(-caos, caos) * peso,
        y0 + (y1 - y0) * t + Phaser.Math.FloatBetween(-caos, caos) * peso,
      ]);
    }
    pts.push([x1, y1]);

    // ⚠️ O HALO PRECISA SER MAIS LARGO QUE 2px, e a captura ampliada foi quem disse. Com 2/1 o
    // núcleo cobria quase todo o halo e o arco saía BRANCO CHAPADO — um risco de caneta, não uma
    // descarga. 3/1 deixa um pixel de ciano assomando de cada lado, que é onde a cor vive. (O
    // aditivo satura para branco onde as duas passadas se somam: o miolo é branco de verdade,
    // como num arco elétrico, e só as beiradas ficam azuis.)
    for (const [largura, cor, alpha] of [
      [3, 0x35b6ea, 0.5],
      [1, 0xcdf0ff, 0.95],
    ] as const) {
      g.lineStyle(largura, cor, alpha);
      g.beginPath();
      g.moveTo(pts[0][0], pts[0][1]);
      for (const [px, py] of pts.slice(1)) g.lineTo(px, py);
      g.strokePath();
    }
  }

  /** Um Graphics de vida curta, aditivo, que se apaga sozinho. */
  private lampejo(duracao: number, depth: number): Phaser.GameObjects.Graphics {
    const g = this.scene.add.graphics().setDepth(depth).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({
      targets: g,
      alpha: 0,
      duration: duracao,
      ease: 'Quad.easeIn',
      onComplete: () => g.destroy(),
    });
    return g;
  }

  /**
   * O ESTALO da criatura VIVA: um arco curto atravessando o sino, de tempos em tempos. É o que
   * transforma "bicho que brilha" em "bicho que dá choque" — o jogador aprende a evitá-la antes
   * de encostar nela, que é a informação que o brilho sozinho não dava.
   *
   * ⚠️ CURTO DE PROPÓSITO (90ms). Um arco que dura lê como cabo aceso; o que faz ler como
   * DESCARGA é ele já ter sumido quando o olho chega.
   */
  estalo(x: number, y: number, raio: number): void {
    const g = this.lampejo(90, 46);
    const a = Phaser.Math.FloatBetween(0, Math.PI * 2);
    // Ponta a ponta ATRAVESSANDO o corpo, não em volta dele: o arco é interno, como o glow.
    // ⚠️ CAOS ALTO (0,85 do raio) E 5 SEGMENTOS. Com 0,45/4 a captura a 8× mostrou o que o
    // tamanho do jogo escondia: numa criatura de 15px o desvio dava ~3px e o arco saía quase
    // RETO — lia como arranhão, não como raio. O que faz um raio ler como raio é ele mudar de
    // direção mais do que avança.
    this.raio(
      g,
      x + Math.cos(a) * raio,
      y + Math.sin(a) * raio * 0.7,
      x + Math.cos(a + Math.PI) * raio,
      y + Math.sin(a + Math.PI) * raio * 0.7,
      raio * 0.85,
      5,
    );
  }

  /**
   * A MORTE ELÉTRICA: a carga que a criatura guardava sendo solta de uma vez.
   *
   * ⚠️ ELA NÃO USA A SHEET DE EXPLOSÃO, E ISSO É O PONTO. As sheets do jogo são FOGO — núcleo
   * branco-quente, chamas, fumaça escura. Uma água-viva não pega fogo no vácuo: ela descarrega.
   * Usar a mestra aqui diria "mais um inimigo estourou" e apagaria a única criatura da campanha
   * que mata por contato elétrico.
   *
   * Três coisas, e cada uma faz um trabalho:
   *   os RAIOS      a descarga (7 arcos saindo do centro, o dobro do alcance do bicho)
   *   o ANEL        a frente de choque expandindo — é ele que dá TAMANHO ao estouro
   *   as FAGULHAS   matéria arremessada, na cor da criatura e não na do fogo
   */
  choque(x: number, y: number, escala = 1): void {
    // ⚠️ NÃO É PROPORCIONAL PURO. `26 × escala` dava 15,6px na água-viva (que entra em `scale`
    // 0,6) — uma descarga do tamanho da criatura, que some junto com ela. O piso de 16 é o que
    // faz a morte dela ser um EVENTO na tela e não o apagar de um sprite pequeno.
    const alcance = 16 + 22 * escala;

    const g = this.lampejo(240, 51);
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Phaser.Math.FloatBetween(-0.3, 0.3);
      const r = alcance * Phaser.Math.FloatBetween(0.6, 1.2);
      this.raio(g, x, y, x + Math.cos(a) * r, y + Math.sin(a) * r, alcance * 0.28);
    }

    // O ANEL: nasce apertado e abre. O `Quad.easeOut` é o que o faz ler como FRENTE DE CHOQUE
    // (rápido no começo, freando) em vez de bolha inflando.
    const anel = this.scene.add.graphics().setDepth(50).setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 260,
      ease: 'Quad.easeOut',
      onUpdate: (tw) => {
        const p = tw.getValue() ?? 1;
        anel.clear();
        anel.lineStyle(1, 0x9fe8ff, 1 - p);
        anel.strokeCircle(x, y, 3 + p * alcance);
      },
      onComplete: () => anel.destroy(),
    });

    this.faisca.explode(12, x, y);
    // Sacode MENOS que um estouro comum (`explode` faria 90ms/0.004): o choque é agudo, não
    // pesado — o que ele empurra é luz, não massa.
    this.scene.cameras.main.shake(70, 0.003);
  }
}
