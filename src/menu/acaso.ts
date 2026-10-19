/**
 * O ACASO DO MENU, determinístico: o mesmo menu a cada vez que ele abre (as mesmas janelas piscam, os mesmos raios).
 * O LCG é o das maquetes (`scripts/_menu/_maquete2.mjs`, `window.__rnd`), para as escolhas saírem as aprovadas.
 * Módulo puro: os testes (`scripts/test-menu-*.mjs`) o leem direto no Node.
 */

/** O gerador das maquetes: `s = (s·1103515245 + 12345) & 0x7fffffff`, devolvendo [0, 1). */
export function lcg(semente: number): () => number {
  let s = semente;
  return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** Um número em [0, 1) para (a, b, c, d), sem estado: o acaso dos jatos, que são função pura do tempo. */
export function hash4(a: number, b: number, c: number, d: number): number {
  const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719 + d * 4.581) * 43758.5453;
  return s - Math.floor(s);
}

/** O smoothstep de `a` a `b`. */
export function suave(a: number, b: number, x: number): number {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
}
