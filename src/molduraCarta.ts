/**
 * A MOLDURA da carta compacta — a geometria MEDIDA da arte aprovada (spec 2026-09-30-mesa-compacta-arte-design.md
 * §3.1). Módulo PURO.
 *
 * Unidade: o pixel da moldura = o PIXEL FINO da camada HD (a mesa é desenhada nesse grid, §2.4). Os retângulos são
 * INTERNOS (o miolo escuro, sem a borda), com origem no canto superior esquerdo da moldura. Nenhum texto da carta
 * tem coordenada digitada: todo texto se posiciona por um destes encaixes. `scripts/test-molduras.mjs` cobra estes
 * números contra os PNGs.
 */
export interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A moldura inteira (`sprites/cartas/moldura-<raridade>.png`). */
export const MOLDURA = { w: 105, h: 141 } as const;

export const ENCAIXE: Record<'nome' | 'visor' | 'plaqueta', Caixa> = {
  /** O encaixe do topo: o nome, uma linha. */
  nome: { x: 24, y: 4, w: 57, h: 11 },
  /** O visor (contornado pela energia): o "REQUER…" no topo, o ícone no meio, a raridade no pé. */
  visor: { x: 13, y: 20, w: 78, h: 67 },
  /** A plaqueta de baixo: o efeito, uma ou duas linhas. */
  plaqueta: { x: 18, y: 105, w: 70, h: 21 },
};

/** A folga mínima entre a tinta de um texto e a borda do encaixe — e entre dois elementos do visor (§3.2). */
export const FOLGA = 2;
