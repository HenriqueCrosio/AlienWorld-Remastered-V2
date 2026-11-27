/**
 * THE FIGHT RECORDER'S MATHS (spec 2026-11-26-medicao-das-lutas §3), pure: the denied area (the share of the field
 * within `raio` px of a threat — the `medir-capitania` ruler), the breathing room (the biggest gap without a NEW threat)
 * and the per-phase summary. No Phaser (`scripts/test-registro-contas.mjs`).
 */
export interface Caixa { l: number; r: number; t: number; b: number }

export interface Golpe {
  /** scene ms */
  t: number;
  /** what the scene's call site says: 'tiro', 'corpo', 'morde', 'perigo', 'inimigo', 'borda', 'chao', 'outro' */
  causa: string;
  /** the boss's attack then (`StageBoss.devAtaque`, or the phase) */
  ataque: string;
  /** what touched, when known (a bullet's kind: 'tracer', 'flak', 'lava'…; an enemy's kind) */
  quem: string;
  x: number;
  y: number;
  /** the cards' hull took it (no life lost) */
  absorvido: boolean;
}

export interface Trecho {
  fase: string;
  t0: number;
  t1: number;
  dano: number;
  disparos: number;
  acertos: number;
  golpes: Golpe[];
  /** every 100 ms: the threats on screen and the denied area */
  amostras: { n: number; area: number }[];
  /** scene ms of each threat that appeared */
  novas: number[];
}

export interface ResumoTrecho {
  fase: string;
  s: number;
  dano: number;
  disparos: number;
  acertos: number;
  acerto: number;
  golpes: number;
  vidas: number;
  porCausa: Record<string, number>;
  porAtaque: Record<string, number>;
  ameacasMedia: number;
  ameacasPico: number;
  areaMedia: number;
  areaPico: number;
  respiroMax: number;
}

/** The share of the field (cells of `celula` px) within `raio` px of any box. */
export function areaNegada(caixas: readonly Caixa[], largura: number, altura: number, raio = 12, celula = 4): number {
  if (!caixas.length) return 0;
  const W = Math.ceil(largura / celula), H = Math.ceil(altura / celula);
  const r2 = raio * raio;
  let negadas = 0;
  for (let j = 0; j < H; j++) {
    const y = j * celula + celula / 2;
    for (let i = 0; i < W; i++) {
      const x = i * celula + celula / 2;
      for (const c of caixas) {
        const dx = Math.max(c.l - x, 0, x - c.r);
        const dy = Math.max(c.t - y, 0, y - c.b);
        if (dx * dx + dy * dy <= r2) {
          negadas++;
          break;
        }
      }
    }
  }
  return negadas / (W * H);
}

/** The biggest gap (same unit as the times) between new threats inside [t0, t1], the ends included. */
export function respiroMax(novas: readonly number[], t0: number, t1: number): number {
  const ts = novas.filter((t) => t >= t0 && t <= t1).sort((a, b) => a - b);
  let maior = 0, antes = t0;
  for (const t of ts) {
    maior = Math.max(maior, t - antes);
    antes = t;
  }
  return Math.max(maior, t1 - antes);
}

const somar = (m: Record<string, number>, k: string): void => {
  m[k] = (m[k] ?? 0) + 1;
};

export function resumirTrecho(tr: Trecho): ResumoTrecho {
  const porCausa: Record<string, number> = {};
  const porAtaque: Record<string, number> = {};
  for (const g of tr.golpes) {
    somar(porCausa, g.quem ? `${g.causa}:${g.quem}` : g.causa);
    somar(porAtaque, g.ataque);
  }
  const n = tr.amostras.map((a) => a.n);
  const area = tr.amostras.map((a) => a.area);
  const media = (a: number[]): number => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
  return {
    fase: tr.fase,
    s: (tr.t1 - tr.t0) / 1000,
    dano: tr.dano,
    disparos: tr.disparos,
    acertos: tr.acertos,
    acerto: tr.disparos ? tr.acertos / tr.disparos : 0,
    golpes: tr.golpes.length,
    vidas: tr.golpes.filter((g) => !g.absorvido).length,
    porCausa,
    porAtaque,
    ameacasMedia: media(n),
    ameacasPico: n.length ? Math.max(...n) : 0,
    areaMedia: media(area),
    areaPico: area.length ? Math.max(...area) : 0,
    respiroMax: respiroMax(tr.novas, tr.t0, tr.t1) / 1000,
  };
}
