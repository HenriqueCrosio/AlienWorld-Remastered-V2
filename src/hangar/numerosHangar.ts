import { NOME_MODELO, type Modelo, type Pintura } from '../ships.ts';

/**
 * OS NÚMEROS DO HANGAR (25/10, à noite — a cena antes da F1 onde o jogador escolhe a nave, sobre a pintura dele
 * "Hangar Futurista com Caças Estacionados"). Posições em PIXELS DE JOGO (384×216); tempos em segundos. As caixas das
 * naves, dos anéis e as luzes vêm do `dados.json` das camadas (`scripts/_hangar/_camadas.mjs`); aqui ficam as
 * escolhas de cena. Módulo puro: os testes o leem no Node.
 */

/** Os dois lados do hangar: o jato estacionado à esquerda, a "a" à direita (como ele pintou). */
export type Lado = 'esq' | 'dir';
export const LADOS: readonly Lado[] = ['esq', 'dir'];

/** O modelo de cada lado, as pinturas na ordem do ↑↓ (a 1ª é a que está na pintura dele) e o nome na tela. */
export const LADO: Record<Lado, { modelo: Modelo; pinturas: readonly Pintura[]; nome: string; bocal: { x: number; y: number; dir: -1 | 1 } }> = {
  // O bocal: a boca do motor (medida na pintura) e para onde a chama sai (o jato aponta o nariz para a direita).
  // Os nomes são os dele (26/10): `NOME_MODELO` em ships.ts.
  esq: { modelo: 'jato', pinturas: ['osso', 'laranja'], nome: NOME_MODELO.jato, bocal: { x: 90.8, y: 105.9, dir: -1 } },
  dir: { modelo: 'a', pinturas: ['laranja', 'preta'], nome: NOME_MODELO.a, bocal: { x: 285.9, y: 108.9, dir: 1 } },
};

/**
 * O nome de cada pintura na tela (26/10, os nomes dele): a laranja é a CLÁSSICA nas duas naves; o osso da X-Aelo é a
 * REBELD (*"singela referência ao Luke Skywalker"*) e a preta da Terminus é a MORDUR. Grafados como ele escreveu.
 */
export const NOME_PINTURA: Record<Pintura, string> = { laranja: 'CLÁSSICA', preta: 'MORDUR', osso: 'REBELD' };

/** O relógio da cena. */
export const TEMPO = {
  /** O véu abre (s). */
  entrada: 0.9,
  /** A seta desliza de um lado ao outro. */
  seta: 0.28,
  /** A pintura nova varre a nave da frente para trás. */
  pintura: 0.32,
  /** Confirmou: o motor acende, o anel estoura, o véu fecha e a fase começa. */
  motor: 0.55,
  veuFecha: 0.75,
  fim: 1.35,
};

/** A SETA sobre a nave escolhida: pixel art em px de jogo, balançando devagar. */
export const SETA = {
  /** Linhas da seta ('#' = cheio, '+' = a borda clara de cima, '.' = o contorno escuro), de cima para baixo. */
  desenho: ['+++++++++', '#########', '.#######.', ' .#####. ', '  .###.  ', '   .#.   ', '    .    '],
  cor: 0xffb347,
  borda: 0xfff1c9,
  contorno: 0x3a1c08,
  /** Quanto acima do topo da caixa da nave (a caixa começa ~2 px acima da ponta da asa). */
  acima: 9,
  balanco: { px: 1.5, per: 1.1 },
  /** O brilho âmbar atrás dela. */
  brilho: { diametro: 16, alfa: 0.35 },
};

/** A seleção: o anel do pad aceso, a nave de fora apagada. */
export const SELECAO = {
  anel: { base: 0.55, amp: 0.3, per: 1.6 },
  /** O brilho macio do pad (elipse do `menu-brilho`), âmbar. */
  pad: { cor: 0xffa040, alfa: 0.16, largura: 2.3, altura: 3.4 },
  /** A tinta da nave que não está escolhida (o painel inteiro escurece um pouco, como luz que sai dela). */
  apagada: 0x7d8494,
};

/** A NÉVOA VIVA, atrás do bloco do hangar (as faixas passam entre o fundo e a baia; a baia as cobre). */
export const NEVOA = {
  cor: 0x8a9bb5,
  bandas: [
    { y: -6, h: 52, pico: 0.22, vel: -3.2 },
    { y: 24, h: 40, pico: 0.16, vel: -5.5 },
    { y: 128, h: 44, pico: 0.2, vel: -2.6 },
    { y: 160, h: 60, pico: 0.24, vel: -4.4 },
    { y: 70, h: 70, pico: 0.12, vel: -1.8 },
  ],
  /** Uma faixa rala NA FRENTE, só embaixo do deque (o ar entre o jogador e a torre). */
  frente: { y: 168, h: 52, pico: 0.1, vel: -7 },
};

/** As luzes de fora do bloco viram halos que respiram (a névoa come os detalhes; as luzes atravessam). */
export const HALOS = {
  quantidade: 26,
  /** Diâmetro = este fator × o maior lado da luz, entre min e max. */
  fator: 3.2,
  min: 4,
  max: 22,
  alfa: { base: 0.32, var: 0.18 },
  per: { min: 3, var: 4 },
  /** Uma fração das pequenas tremula (cidade ao longe). */
  tremula: 0.35,
  semente: 0x4a11,
};

/** Os faróis vermelhos piscam (o halo acende e some). */
export const FAROIS = { ciclo: 2.3, aceso: 1.4, diametro: 7, alfa: 0.75, cor: 0xff3030 };

/** As lâmpadas frias do teto da baia: um cone de luz para baixo, com poeira dentro (a da Atmosfera). */
export const LAMPADAS = { comprimento: 46, largura: 0.9, alfa: 0.13, cor: 0xbcd6ff, tremor: 0.02 };

/** O motor que acende na confirmação. */
export const MOTOR = { nucleo: 0xfff1d0, chama: 0xff8a2a, diametro: 18, comprimento: 22 };

/** O texto (a voz do piloto: ele está decidindo). */
export const TEXTO = {
  titulo: { y: 14, texto: 'ESCOLHA A SUA NAVE', tamanho: 9 },
  nome: { y: 172, tamanho: 11 },
  pintura: { y: 186, tamanho: 8 },
  // As setas da mesa e do painel (`< >`): a Chakra Petch não tem ←→↑↓ (item 16, 17/10).
  dica: { y: 205, texto: '[<  >] NAVE     [^  v] PINTURA     [ENTER] DECOLAR     [ESC] VOLTAR', tamanho: 6 },
  cor: 0xe8dcc8,
  corDica: 0x8d97aa,
  corDestaque: 0xffb347,
};
