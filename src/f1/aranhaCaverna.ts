import Phaser from 'phaser';
import { ARANHA_F1 } from './numerosF1';

/**
 * A ARANHA DA CAVERNA DA F1 (27/10 — ver `ARANHA_F1`): uma silhueta preta no teto do salão que olha a nave, vira para a
 * câmera, corre por trás das estalactites e some. Os quadros vêm numa fileira (`aranha.png`, a célula e os grupos no
 * `aranha.json`); o RECORTE das estalactites (`cav-aranha-frente.png`, a pintura do salão só na rocha) vai por cima
 * dela. As duas peças seguem a pintura do salão (`fundoX`) e a máscara dele.
 */

interface DadosAranha {
  /** A célula de cada quadro. */
  w: number;
  h: number;
  /** A origem do desenho (o meio da cabeça) na célula. */
  ox: number;
  oy: number;
  /** A linha dos pés no teto, na célula (o topo do quadro 0). */
  topo: number;
  quadros: number;
  grupos: Record<'parada' | 'olha' | 'vira' | 'encara' | 'anda', [number, number]>;
  /** px de tela que ela anda num ciclo das pernas. */
  passoTela: number;
}

export interface AranhaCaverna {
  /** O evento da caverna (`true`: do começo do roteiro) e o fim dela. */
  mostrar(v: boolean): void;
  /** `agora`: o relógio da cena (s); `d`: px de mundo desde o evento; `fundoX`: o x da pintura do salão. */
  atualizar(agora: number, d: number, fundoX: number): void;
}

interface Caminho {
  pts: readonly (readonly [number, number])[];
  /** A distância acumulada até cada ponto. */
  acum: number[];
  total: number;
}

function medir(pts: readonly (readonly [number, number])[]): Caminho {
  const acum = [0];
  for (let i = 1; i < pts.length; i++) acum.push(acum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, acum, total: acum[acum.length - 1] };
}

function noCaminho(c: Caminho, s: number): [number, number] {
  let i = 1;
  while (i < c.pts.length - 1 && c.acum[i] < s) i++;
  const a = c.pts[i - 1], b = c.pts[i];
  const u = Math.min(1, Math.max(0, (s - c.acum[i - 1]) / Math.max(1e-6, c.acum[i] - c.acum[i - 1])));
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
}

export function montarAranhaCaverna(scene: Phaser.Scene, mascara: Phaser.Display.Masks.GeometryMask): AranhaCaverna | null {
  const A = ARANHA_F1;
  const D = scene.cache.json.get(A.dados) as DadosAranha | undefined;
  if (!D || !scene.textures.exists(A.chave)) return null;
  // os quadros: recortes da fileira
  const tex = scene.textures.get(A.chave);
  if (!tex.has('q0')) for (let q = 0; q < D.quadros; q++) tex.add(`q${q}`, 0, q * D.w, 0, D.w, D.h);
  const aranha = scene.add.image(0, 0, A.chave, 'q0').setOrigin(0, 0).setDepth(A.depth).setMask(mascara).setVisible(false);
  const frente = scene.textures.exists(A.chaveFrente)
    ? scene.add.image(0, 0, A.chaveFrente).setOrigin(0, 0).setDepth(A.depthFrente).setMask(mascara).setVisible(false)
    : null;
  const caminhos = A.caminhos.map(medir);
  const duracao = (p: (typeof A.roteiro)[number]): number => ('s' in p ? p.s : caminhos[p.caminho].total / p.vel);

  let ligada = false;
  let inicio: number | null = null;

  const quadro = (q: number): void => {
    const nome = `q${q}`;
    if (aranha.frame.name !== nome) aranha.setFrame(nome);
  };
  const laco = (g: [number, number], t: number): number => g[0] + (Math.floor(t * A.fps) % (g[1] - g[0] + 1));
  const giro = (g: [number, number], u: number, volta: boolean): number => {
    const i = Math.min(g[1] - g[0], Math.floor(u * (g[1] - g[0] + 1)));
    return volta ? g[1] - i : g[0] + i;
  };

  return {
    mostrar(v: boolean): void {
      ligada = v;
      inicio = null;
      aranha.setVisible(v);
      frente?.setVisible(v);
      quadro(D.grupos.parada[0]);
    },
    atualizar(agora: number, d: number, fundoX: number): void {
      if (!ligada) return;
      let [x, y]: [number, number] = [A.inicio[0], A.inicio[1]];
      if (inicio === null && d >= A.comecaEm) inicio = agora;
      if (inicio !== null) {
        let t = agora - inicio;
        let fim = true;
        for (const p of A.roteiro) {
          const dur = duracao(p);
          if (p.faz === 'corre') {
            const c = caminhos[p.caminho];
            const u = Math.min(1, t / dur);
            // sai e chega devagar; as pernas seguem a distância andada
            const s = c.total * u * u * (3 - 2 * u);
            [x, y] = noCaminho(c, s);
            if (t < dur) {
              const g = D.grupos.anda;
              quadro(g[0] + (Math.floor(s / (D.passoTela / (g[1] - g[0] + 1))) % (g[1] - g[0] + 1)));
              fim = false;
              break;
            }
          } else if (t < dur) {
            if (p.faz === 'olha') quadro(laco(D.grupos.olha, t));
            else if (p.faz === 'encara') quadro(laco(D.grupos.encara, t));
            else quadro(giro(D.grupos.vira, t / dur, p.faz === 'desvira'));
            fim = false;
            break;
          }
          t -= dur;
        }
        // o fim do roteiro: ela sumiu atrás da última estalactite
        if (fim) {
          aranha.setVisible(false);
          frente?.setVisible(false);
          return;
        }
      }
      aranha.setPosition(Math.round(fundoX + x - D.ox), Math.round(y - D.topo));
      frente?.setPosition(fundoX, 0);
    },
  };
}
