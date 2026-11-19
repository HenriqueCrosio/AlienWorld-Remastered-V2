import Phaser from 'phaser';
import { ALTURA, LARGURA, NEBLINA } from './numerosMenu';
import { arcoDaTempestade } from './tempoDaTempestade';
import type { ContextoCenario, EstadoMenu, Peca } from './cenario';

/**
 * A NEBLINA DO MENU DA NOITE (spec `2026-11-19-menu-neblina-chuva-design.md` §3): um véu volumétrico sobre o QUADRO
 * INTEIRO (ele, 19/11: as torres altas também, é lá que a pintura mostra as bordas), mais denso nos vales e onde ele
 * riscou, que escorre no sentido dos traços e acende onde passa pelas janelas âmbar. Cobre as bordas desde o primeiro
 * quadro (o PISO) e cresce com a chuva da faixa de 6min16 (`NEBLINA.arco`).
 *
 * Um `Shader` desenhado direto na câmera, na profundidade 2,5 (o `setRenderToTexture` desligava as texturas grandes da
 * pintura). O ruído não é calculado: é uma textura assada sem emenda (`neblina-ruido.png`) — leve na GPU, e sem os
 * quadros perdidos que davam os quiques (19/11). Os mapas (densidade, fluxo, luz, ruído) são assados fora
 * (`scripts/_menu/_neblina-assar.mjs`). Só no WebGL: sem ele, fica a bruma de sempre.
 */

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D iChannel0; // R density, G/B flow
uniform sampler2D iChannel1; // R light
uniform sampler2D iChannel2; // R/G/B seamless noise (256 px, repeat)
uniform float uT;
uniform float uCob;
uniform float uAlfa;
uniform float uVel;
uniform float uClarao;
uniform float uLuz;
uniform float uDebug;
uniform vec3 uCorEsc;
uniform vec3 uCorClara;
uniform vec3 uCorLuz;
uniform vec3 uCorClarao;
varying vec2 fragCoord;

// The baked noise, sampled in game px: s = the size of one noise tile in game px.
vec3 ruido(vec2 p, float s) { return texture2D(iChannel2, p / s).rgb; }

// The billow: the noise with its own domain twisted by a slower noise (the rolling), drifting with time.
float rolo(vec2 p, float t, float s) {
  vec2 q = ruido(p + vec2(t * 0.9, -t * 0.35), s * 1.7).gb - 0.5;
  float a = ruido(p + q * s * 0.35, s).r;
  float b = ruido(p * 1.0 + q * s * 0.2 + vec2(-t * 0.6, t * 0.2), s * 0.45).g;
  return a * 0.72 + b * 0.28;
}
// Carried along the flow map in two phases that cross slowly (T s). Mixing two noises flattens them halfway; dividing
// the deviation by the length of the weights keeps the contrast steady: no breathing, no jump.
float levado(vec2 p, vec2 f, float t, float s, float vel) {
  float T = 22.0;
  float f0 = fract(t / T), f1 = fract(t / T + 0.5);
  float a = rolo(p - f * vel * T * f0, t, s);
  float b = rolo(p - f * vel * T * f1 + vec2(91.7, 43.1), t, s);
  float w = 0.5 - 0.5 * cos(6.2831853 * f0);
  float m = mix(a, b, 1.0 - w);
  return 0.5 + (m - 0.5) / sqrt(w * w + (1.0 - w) * (1.0 - w));
}

void main() {
  vec2 escala = resolution / vec2(${LARGURA.toFixed(1)}, ${ALTURA.toFixed(1)});
  vec2 g = vec2(fragCoord.x, resolution.y - fragCoord.y) / escala;
  vec2 uv = g / vec2(${LARGURA.toFixed(1)}, ${ALTURA.toFixed(1)});
  vec4 m = texture2D(iChannel0, uv);
  // the pools narrowed to a ring near each window: the veil glows close to the light, cold everywhere else
  float luz = pow(texture2D(iChannel1, uv).r, 1.4);
  vec2 f = m.gb * 2.0 - 1.0;
  float d = m.r;

  // Two depths: the far sheet (wide, slow) and the near billows (tighter, faster).
  float nLonge = levado(g, f, uT, 150.0, uVel * 0.55);
  float nPerto = levado(g + vec2(57.0, 23.0), f, uT * 1.15, 80.0, uVel);
  float n = clamp(mix(nLonge, nPerto, 0.55), 0.0, 1.0);

  // a thin even haze (it hides the painting's edges) plus the billows, which thicken and spread as the cover grows
  float c = d * uCob;
  float a = clamp(c * (0.32 + 0.95 * smoothstep(0.2, 0.75, n + 0.6 * (c - 0.5))), 0.0, 1.0);
  a *= uAlfa;
  vec3 cor = mix(uCorEsc, uCorClara, smoothstep(0.35, 0.85, n));
  vec3 aceso = uCorLuz * luz * uLuz * (0.35 + 0.65 * a) + uCorClarao * uClarao * n;
  gl_FragColor = vec4(cor * a + aceso * a, a);
  if (uDebug > 0.5) gl_FragColor = vec4(d, n, luz, 1.0);
}
`;

/** As texturas da neblina (na fila do `load`; o que já está, pula). */
export function carregarNeblina(load: Phaser.Loader.LoaderPlugin): void {
  const tex = load.scene.textures;
  if (!tex.exists('menu-neblina-mapa')) load.image('menu-neblina-mapa', `${NEBLINA.pasta}/neblina-mapa.png`);
  if (!tex.exists('menu-neblina-luz')) load.image('menu-neblina-luz', `${NEBLINA.pasta}/neblina-luz.png`);
  if (!tex.exists('menu-neblina-ruido')) load.image('menu-neblina-ruido', `${NEBLINA.pasta}/neblina-ruido.png`);
}


export function montarNeblina(ctx: ContextoCenario, estado: EstadoMenu, clarao: () => number): Peca | null {
  const { scene } = ctx;
  // `?neblina=nenhuma` (dev): the menu as it was, for comparing
  if (new URLSearchParams(location.search).get('neblina') === 'nenhuma') return null;
  if (!(scene.game.renderer instanceof Phaser.Renderer.WebGL.WebGLRenderer)) return null;
  if (!['menu-neblina-mapa', 'menu-neblina-luz', 'menu-neblina-ruido'].every((c) => scene.textures.exists(c))) {
    console.warn('[menu] os mapas da neblina não chegaram — o menu abre sem ela');
    return null;
  }
  const N = NEBLINA;
  // Phaser's '3f' uniforms take {x, y, z}, not an array.
  const rgb = (c: number): { x: number; y: number; z: number } => ({ x: ((c >> 16) & 255) / 255, y: ((c >> 8) & 255) / 255, z: (c & 255) / 255 });
  const base = new Phaser.Display.BaseShader('menu-neblina', FRAG, undefined, {
    uT: { type: '1f', value: 0 },
    uCob: { type: '1f', value: N.piso },
    uAlfa: { type: '1f', value: N.alfa },
    uVel: { type: '1f', value: N.vel },
    uClarao: { type: '1f', value: 0 },
    uLuz: { type: '1f', value: N.forcaLuz },
    // `?neblinaDebug` (dev): R density, G noise, B light
    uDebug: { type: '1f', value: new URLSearchParams(location.search).has('neblinaDebug') ? 1 : 0 },
    uCorEsc: { type: '3f', value: rgb(N.corEscura) },
    uCorClara: { type: '3f', value: rgb(N.corClara) },
    uCorLuz: { type: '3f', value: rgb(N.corLuz) },
    uCorClarao: { type: '3f', value: rgb(N.corClarao) },
  });
  const sh = scene.add.shader(base, 0, 0, LARGURA, ALTURA).setOrigin(0).setDepth(-1);
  const amostra = { wrapS: 'clamp_to_edge', wrapT: 'clamp_to_edge', minFilter: 'linear', magFilter: 'linear' };
  sh.setSampler2D('iChannel0', 'menu-neblina-mapa', 0, { ...amostra });
  sh.setSampler2D('iChannel1', 'menu-neblina-luz', 1, { ...amostra });
  // 256 px (a power of two): it may repeat, even on WebGL1
  sh.setSampler2D('iChannel2', 'menu-neblina-ruido', 2, { wrapS: 'repeat', wrapT: 'repeat', minFilter: 'linear', magFilter: 'linear' });
  // Drawn straight in the camera (setRenderToTexture left the painting's big textures unbound: 19/11).
  sh.setDisplaySize(LARGURA, ALTURA).setDepth(N.profundidade);

  return {
    atualizar(t: number): void {
      const arco = arcoDaTempestade(N.arco, t);
      sh.setUniform('uT.value', estado.reduzido ? t * 0.5 : t);
      sh.setUniform('uCob.value', N.piso + (1 - N.piso) * arco);
      sh.setUniform('uClarao.value', clarao() * N.forcaClarao);
    },
  };
}
