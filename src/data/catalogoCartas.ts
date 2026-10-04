import type { Raridade } from '../raridade';

/**
 * O CATÁLOGO — as 24 cartas (spec `2026-10-01-catalogo-cartas-design.md` §3; aprovadas em 01/10, ícones em 02/10).
 *
 * Módulo PURO (sem Phaser): o teste do catálogo (`scripts/test-catalogo-cartas.mjs`) importa daqui, em node. O jogo
 * importa de `cartas.ts`, que reexporta.
 *
 * Os números dos efeitos são PROVISÓRIOS (calibragem, frente C) e moram em quem aplica a carta, não aqui. Nenhum nome
 * passa de 14 letras: a letra da mesa é UMA só para todas (spec da mesa §3.2) — o "FRAGMENTAÇÃO" (Ç + Ã) encolhia as 24.
 */

export type Categoria = 'arma' | 'efeito' | 'defesa' | 'movimento';

export interface CartaDef {
  id: string;
  nome: string;
  /** UMA linha curta — cabe em ~16 caracteres por linha, duas linhas no máximo. */
  texto: string;
  /** O efeito em UMA linha só, em caixa alta (a carta compacta; referência: Deep Rock Galactic: Survivor). */
  curto: string;
  /** O texto da FICHA do Arquivo, para o jogador: até 3 linhas, sem número — os números vêm de `numerosCartas` (spec
   * 2026-10-04-arquivo-de-cartas §4.1). */
  descricao: string;
  categoria: Categoria;
  raridade: Raridade;
  /** Quantas vezes pode ser escolhida. */
  max: number;
  /** Só aparece com esta carta já na mão. */
  requer?: string;
  /** Some da mesa quando esta outra já foi escolhida (o Duplo depois do Triplo). */
  excluiSe?: string;
  /** Não aparece na Fase 1 (voo por impulso). */
  semF1?: boolean;
}

export const CARTAS: Record<string, CartaDef> = {
  // ─── 🔫 ARMAMENTO (7) ───
  WPN_001: { id: 'WPN_001', nome: 'TIRO DUPLO', texto: 'dispara 2\nprojéteis', curto: '2 PROJÉTEIS', descricao: 'Dispara dois tiros paralelos.', categoria: 'arma', raridade: 'comum', max: 1, excluiSe: 'WPN_002' },
  WPN_002: { id: 'WPN_002', nome: 'TIRO TRIPLO', texto: 'dispara 3\nem leque', curto: '3 EM LEQUE', descricao: 'Três tiros em leque.', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_004: { id: 'WPN_004', nome: 'CADÊNCIA', texto: '+15% de\ncadência', curto: '+15% CADÊNCIA', descricao: 'Aumenta a cadência de tiro. Acumula.', categoria: 'arma', raridade: 'comum', max: 3 },
  WPN_007: { id: 'WPN_007', nome: 'PERFURANTE', texto: 'atravessa\ninimigos', curto: 'ATRAVESSA INIMIGOS', descricao: 'O tiro atravessa inimigos, perdendo força a cada um.', categoria: 'arma', raridade: 'incomum', max: 1 },
  WPN_008: { id: 'WPN_008', nome: 'TIRO PESADO', texto: 'dano x2,\nmais lento', curto: 'DANO x2', descricao: 'Tiro mais lento e mais forte, que empurra o inimigo para trás.', categoria: 'arma', raridade: 'rara', max: 1 },
  WPN_009: { id: 'WPN_009', nome: 'MÍSSIL GUIADO', texto: 'míssil que\npersegue', curto: 'MÍSSIL QUE PERSEGUE', descricao: 'Lança um míssil que trava no inimigo mais próximo e explode no impacto.', categoria: 'arma', raridade: 'incomum', max: 2 },
  WPN_010: { id: 'WPN_010', nome: 'DRONE AUXILIAR', texto: 'drone que\natira', curto: 'DRONE QUE ATIRA', descricao: 'Um drone escolta a nave e atira nos inimigos próximos.', categoria: 'arma', raridade: 'epica', max: 1 },
  // ─── 💥 EFEITO (10) ───
  EFF_001: { id: 'EFF_001', nome: 'EXPLOSIVO', texto: 'explode ao\nacertar', curto: 'EXPLODE AO ACERTAR', descricao: 'Os tiros explodem no impacto e causam dano em área.', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_002: { id: 'EFF_002', nome: 'EXPLOSÃO MAIOR', texto: 'explosões\nmaiores', curto: 'EXPLOSÕES MAIORES', descricao: 'Aumenta o raio das suas explosões.', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_003: { id: 'EFF_003', nome: 'FRAGMENTADO', texto: 'solta\nestilhaços', curto: 'SOLTA ESTILHAÇOS', descricao: 'As explosões lançam estilhaços para a frente.', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_001' },
  EFF_004: { id: 'EFF_004', nome: 'INCENDIÁRIO', texto: 'chance de\nincendiar', curto: 'PODE INCENDIAR', descricao: 'Os tiros podem incendiar o inimigo, causando dano contínuo.', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_006: { id: 'EFF_006', nome: 'COMBUSTÃO', texto: 'queimado\nexplode', curto: 'QUEIMADO EXPLODE', descricao: 'Inimigos que morrem em chamas explodem.', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_004' },
  // Requer Incendiário + Combustão: a Combustão já exige o Incendiário, então basta ela.
  EFF_007: { id: 'EFF_007', nome: 'EM CADEIA', texto: 'explosão\nincendeia', curto: 'EXPLOSÃO INCENDEIA', descricao: 'As explosões incendeiam todos os atingidos.', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_006' },
  // Solto pelo JOGADOR (02/10). O texto não cita a tecla: o mapa de teclas ainda vai ser decidido.
  EFF_010: { id: 'EFF_010', nome: 'FLARE', texto: 'solta\narmadilha', curto: 'SOLTA ARMADILHA', descricao: 'Solta para trás uma armadilha que explode ao contato.', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_011: { id: 'EFF_011', nome: 'ELÉTRICO', texto: 'choque que\ntrava', curto: 'CHOQUE QUE TRAVA', descricao: 'Os tiros podem eletrificar o inimigo, paralisando-o.', categoria: 'efeito', raridade: 'incomum', max: 1 },
  EFF_012: { id: 'EFF_012', nome: 'ARCO EM CADEIA', texto: 'o choque\nsalta', curto: 'CHOQUE SALTA', descricao: 'O choque salta para os inimigos próximos.', categoria: 'efeito', raridade: 'rara', max: 1, requer: 'EFF_011' },
  EFF_013: { id: 'EFF_013', nome: 'SOBRECARGA', texto: 'eletrificado\nexplode', curto: 'ELETRIFICADO EXPLODE', descricao: 'Inimigos eletrificados soltam um pulso ao morrer.', categoria: 'efeito', raridade: 'epica', max: 1, requer: 'EFF_012' },
  // ─── 🛡️ DEFESA (5, dentro das 3 vidas) ───
  DEF_001: { id: 'DEF_001', nome: 'CASCO', texto: 'absorve 1\ngolpe', curto: 'ABSORVE 1 GOLPE', descricao: 'Absorve um golpe sem perder vida. Recarrega com o tempo.', categoria: 'defesa', raridade: 'comum', max: 1 },
  DEF_002: { id: 'DEF_002', nome: 'RECARGA', texto: 'o casco\nvolta rápido', curto: 'CASCO VOLTA RÁPIDO', descricao: 'O casco recarrega mais rápido.', categoria: 'defesa', raridade: 'incomum', max: 1, requer: 'DEF_001' },
  DEF_003: { id: 'DEF_003', nome: 'VIDA EXTRA', texto: '+1 vida', curto: '+1 VIDA', descricao: 'Concede uma vida extra.', categoria: 'defesa', raridade: 'rara', max: 1 },
  DEF_004: { id: 'DEF_004', nome: 'CASCO REATIVO', texto: 'casco partido\nexplode', curto: 'CASCO EXPLODE', descricao: 'Ao quebrar, o casco explode e fere os inimigos próximos.', categoria: 'defesa', raridade: 'rara', max: 1, requer: 'DEF_001' },
  DEF_005: { id: 'DEF_005', nome: 'BOMBA EXTRA', texto: '+1 bomba', curto: '+1 BOMBA', descricao: 'Uma bomba a mais no estoque, renovada a cada vida.', categoria: 'defesa', raridade: 'comum', max: 2 },
  // ─── ⚡ MOVIMENTO (2) ───
  MOV_001: { id: 'MOV_001', nome: 'PROPULSORES', texto: '+12% de\nvelocidade', curto: '+12% VELOCIDADE', descricao: 'Aumenta a velocidade no voo livre. Acumula.', categoria: 'movimento', raridade: 'comum', max: 2, semF1: true },
  MOV_003: { id: 'MOV_003', nome: 'DASH', texto: 'avanço\ninvulnerável', curto: 'AVANÇO INVULNERÁVEL', descricao: 'Avanço rápido em que a nave fica intocável.', categoria: 'movimento', raridade: 'rara', max: 1, semF1: true },
};

/**
 * TODAS têm ícone: os 24 aprovados em 02/10 (`folhas/2026-10-01/pecas-novas/icones-finais`), instalados em
 * `sprites/cartas/icone-<id>.png`. Carregados no mundo (`BootScene`) e na camada HD (`BootHDScene`, onde a mesa mora).
 */
export const ICONES_CARTAS = Object.keys(CARTAS);
