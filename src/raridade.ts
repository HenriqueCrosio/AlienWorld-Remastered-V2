/**
 * A RARIDADE das cartas — a cor e o nome (spec 2026-09-30-mesa-compacta-arte-design.md §2.1).
 *
 * Módulo PURO (sem Phaser): o script que gera as molduras (`scripts/gerar-molduras.mjs`) e o teste delas importam
 * daqui, em node. O resto do jogo continua importando de `cartas.ts`, que reexporta.
 */
export type Raridade = 'comum' | 'incomum' | 'rara' | 'epica';

/** Da mais baixa para a mais alta. */
export const RARIDADES: Raridade[] = ['comum', 'incomum', 'rara', 'epica'];

/**
 * A paleta P1 — a convenção (WoW/Borderlands/Destiny), a que o jogador já traz: cinza · verde · azul · roxo. O
 * LARANJA fica livre para uma futura lendária. O azul é FUNDO de propósito: o ciano `0x3ee0f0` é da nave e da HUD.
 * (Até 30/09 era cinza/ciano/roxo/laranja — folha `folhas/2026-09-30/raridade-paletas.png`.)
 */
export const COR_RARIDADE: Record<Raridade, number> = {
  comum: 0xa8b0bc,
  incomum: 0x4fc85a,
  rara: 0x3f7bff,
  epica: 0xa45cff,
};

export const NOME_RARIDADE: Record<Raridade, string> = {
  comum: 'COMUM',
  incomum: 'INCOMUM',
  rara: 'RARA',
  epica: 'ÉPICA',
};
