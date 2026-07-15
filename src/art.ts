import Phaser from 'phaser';

/**
 * Variantes de arte.
 *
 * Um lote do PixelLab devolve dezenas de candidatos pelo mesmo preço. Quando mais de um
 * fica bom, todos entram: `spire`, `spire2`, `spire3` são o mesmo objeto de jogo com
 * silhuetas diferentes. Variedade que já foi paga.
 *
 * A regra é só de nomenclatura: `<base>`, `<base>2`, `<base>3`… Quem não existe é ignorado,
 * então acrescentar uma variante nova é copiar um PNG e registrá-lo no ART da BootScene —
 * nenhum código muda.
 */
const cache = new Map<string, string[]>();

function keysFor(scene: Phaser.Scene, base: string): string[] {
  const hit = cache.get(base);
  if (hit) return hit;

  const keys = [base];
  for (let i = 2; scene.textures.exists(`${base}${i}`); i++) keys.push(`${base}${i}`);

  cache.set(base, keys);
  return keys;
}

/** Sorteia uma variante da textura. Se não houver variante, devolve a própria base. */
export function pickVariant(scene: Phaser.Scene, base: string): string {
  return Phaser.Utils.Array.GetRandom(keysFor(scene, base));
}

/** As variantes são por cena: limpar ao trocar de cena evita apontar para texturas mortas. */
export function resetVariantCache(): void {
  cache.clear();
}
