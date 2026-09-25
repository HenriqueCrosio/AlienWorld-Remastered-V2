import Phaser from 'phaser';
import type { PerfilAtmosfera } from './perfis';

/**
 * O SHADER DA ATMOSFERA (spec 2026-09-25-atmosfera-engine-design.md §3.1) — a transcrição da prévia C aprovada
 * (`scripts/_f8/_preview-atmos-mov.mjs`) para GLSL. Roda na câmera principal, na resolução NATIVA (384×216: o
 * `Scale.FIT` só amplia o canvas), então cada termo age num pixel do jogo.
 *
 * ⚠️ A LIÇÃO DE 17/09 (`efeito-de-cena-assado-em-pixel`): degradê liso lê como "gerado". Por isso a NÉVOA e o HALO
 * saem quantizados em Bayer 4×4 — como a prévia. Só a correção de cor, a vinheta e o grão são contínuos (a C).
 *
 * Não conhece cena nem capítulo: lê `perfil` e `tempo`, que o controlador (`Atmosfera`) escreve a cada quadro.
 */
export const CHAVE_ATMOSFERA = 'Atmosfera';

const FRAG = `
#define SHADER_NAME ATMOSFERA_FS
precision highp float;

uniform sampler2D uMainSampler;
uniform vec2 uResolucao;
uniform float uTempo;
uniform float uQuadroGrao;
uniform float uDensidade;
uniform vec3 uCorNevoa;
uniform float uAltura;
uniform vec2 uVelTras;
uniform vec2 uVelFrente;
uniform float uEvolucao;
uniform float uForcaHalo;
uniform float uLimiarHalo;
uniform vec3 uCorHalo;
uniform float uGrade;
uniform float uGradeQuente;
uniform float uVinheta;
uniform float uGrao;
uniform float uEscuro;

varying vec2 outTexCoord;

// Bayer 4x4 em [0,1) — o mesmo papel da matriz da prévia.
float bayer2(vec2 a) { a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
float bayer4(vec2 a) { return bayer2(0.5 * a) * 0.25 + bayer2(a) + 1.0 / 32.0; }

// hash sem seno (Hoskins): estável em qualquer GPU.
float hash(vec2 p, float s) {
  vec3 p3 = fract(vec3(p.xyx + s * vec3(113.5, 271.9, 57.3)) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float ruido(vec2 p, float s) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i, s);
  float b = hash(i + vec2(1.0, 0.0), s);
  float c = hash(i + vec2(0.0, 1.0), s);
  float d = hash(i + vec2(1.0, 1.0), s);
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p, float s) {
  return 0.55 * ruido(p, s) + 0.3 * ruido(p * 2.1, s + 1.0) + 0.15 * ruido(p * 4.3, s + 2.0);
}

void main() {
  vec2 px = floor(outTexCoord * uResolucao);
  // y de TELA (0 = topo): a textura do framebuffer vem com y de baixo para cima.
  vec2 tela = vec2(px.x, uResolucao.y - 1.0 - px.y);
  vec3 cor = texture2D(uMainSampler, (px + 0.5) / uResolucao).rgb;
  float d = bayer4(px);

  // 1 · NÉVOA — duas camadas; a velocidade é a da TELA (a amostra anda ao contrário).
  float baixo = pow(tela.y / uResolucao.y, uAltura);
  float f1 = fbm((tela - uVelTras * uTempo) / vec2(70.0, 26.0) + vec2(3.0, uTempo * uEvolucao), 3.0);
  float f2 = fbm((tela - uVelFrente * uTempo) / vec2(45.0, 18.0) + vec2(9.0, 0.0), 5.0);
  float f = clamp(((f1 * 0.6 + f2 * 0.4) - 0.35) * 1.6 * (0.35 + baixo), 0.0, 1.0);
  cor = mix(cor, uCorNevoa, floor(f * 3.0 + d) / 3.0 * 0.42 * uDensidade);

  // 2 · HALO — o que é quente e aceso, amostrado 7x7 com passo 2 na imagem ORIGINAL; respira em 2,4s.
  float soma = 0.0;
  for (int j = -3; j <= 3; j++) {
    for (int i = -3; i <= 3; i++) {
      vec3 s = texture2D(uMainSampler, (px + 0.5 + vec2(float(i), float(j)) * 2.0) / uResolucao).rgb;
      soma += step(uLimiarHalo, s.r) * step(s.g * 1.3, s.r);
    }
  }
  float v = floor(min(1.0, soma / 49.0 * 2.4) * 4.0 + d - 0.5) / 4.0;
  float respira = 0.8 + 0.2 * sin(uTempo * 6.2831853 / 2.4);
  cor += uCorHalo * max(v, 0.0) * uForcaHalo * respira;
  cor = clamp(cor, 0.0, 1.0);

  // 3 · CORREÇÃO DE COR — sombra para o petróleo, luz para o âmbar.
  float l = dot(clamp(cor, 0.0, 1.0), vec3(0.299, 0.587, 0.114));
  float sombra = 1.0 - l;
  float q = l * uGradeQuente;
  cor += uGrade * vec3(-6.0 * sombra + 10.0 * q, 3.0 * sombra + 3.0 * q, 8.0 * sombra - 8.0 * q) / 255.0;

  // 4 · VINHETA
  vec2 c = (tela - uResolucao * 0.5) / (uResolucao * 0.5);
  float vin = clamp((length(vec2(c.x, c.y * 0.9)) - 0.55) / 0.6, 0.0, 1.0);
  cor *= 1.0 - vin * uVinheta;

  // 5 · GRÃO — gaussiano aproximado, monocromático, semente trocada a 12 fps.
  float g = hash(px, uQuadroGrao) + hash(px + 17.0, uQuadroGrao + 0.3) + hash(px + 43.0, uQuadroGrao + 0.7) - 1.5;
  cor += g * uGrao * 9.0 / 255.0;

  // 6 · O FADE PARA O PRETO — por CIMA de tudo (névoa, grade, grão). O Phaser desenha o fade da câmera
  // ANTES do postBatchCamera (WebGLRenderer#postRenderCamera), então sem isto o fade final passava pelo
  // shader e virava névoa cinza-azulada em movimento em vez de chegar ao preto (a lição de 25/09).
  cor *= 1.0 - uEscuro;

  gl_FragColor = vec4(clamp(cor, 0.0, 1.0), 1.0);
}
`;

export class AtmosferaPipeline extends Phaser.Renderer.WebGL.Pipelines.PostFXPipeline {
  /** Escrito pelo controlador a cada quadro. `null` = passa a imagem sem tratamento. */
  perfil: PerfilAtmosfera | null = null;
  /** Segundos desde que a Atmosfera nasceu. */
  tempo = 0;
  /** O fade da câmera principal (0 = nada, 1 = tela toda preta). Escrito pelo controlador a cada quadro. */
  escuro = 0;

  constructor(game: Phaser.Game) {
    super({ game, name: CHAVE_ATMOSFERA, fragShader: FRAG });
  }

  override onPreRender(): void {
    const p = this.perfil;
    this.set2f('uResolucao', this.renderer.width, this.renderer.height);
    this.set1f('uTempo', this.tempo);
    this.set1f('uQuadroGrao', Math.floor(this.tempo * 12));
    this.set1f('uEscuro', this.escuro);
    if (!p) {
      this.set1f('uDensidade', 0);
      this.set1f('uForcaHalo', 0);
      this.set1f('uGrade', 0);
      this.set1f('uVinheta', 0);
      this.set1f('uGrao', 0);
      return;
    }
    const [nr, ng, nb] = p.nevoa.cor;
    const [hr, hg, hb] = p.halo.cor;
    this.set1f('uDensidade', p.nevoa.densidade);
    this.set3f('uCorNevoa', nr / 255, ng / 255, nb / 255);
    this.set1f('uAltura', p.nevoa.altura);
    this.set2f('uVelTras', p.nevoa.velTras[0], p.nevoa.velTras[1]);
    this.set2f('uVelFrente', p.nevoa.velFrente[0], p.nevoa.velFrente[1]);
    this.set1f('uEvolucao', p.nevoa.evolucao);
    this.set1f('uForcaHalo', p.halo.forca);
    this.set1f('uLimiarHalo', p.halo.limiar);
    this.set3f('uCorHalo', hr / 255, hg / 255, hb / 255);
    this.set1f('uGrade', p.grade);
    this.set1f('uGradeQuente', p.gradeQuente);
    this.set1f('uVinheta', p.vinheta);
    this.set1f('uGrao', p.grao);
  }
}
