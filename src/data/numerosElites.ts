/**
 * OS NÚMEROS DOS ELITES (spec 2026-10-05-frente-b-elites-design.md §2.5) — UM endereço, como o `numerosCartas.ts`.
 * Todos são CHUTE até a calibragem no sandbox. Módulo PURO (sem Phaser): o `test-elites-regras` roda em node.
 * Tempos em segundos, distâncias em px de jogo (384×216), velocidades em px/s.
 */
export const ELITES = {
  drone: {
    hp: 10,
    score: 250,
    /** Acorda quando a nave chega a esta distância. */
    raioAlerta: 90,
    /** ...ou quando a rocha passa deste x (nunca atravessa a tela minerando). */
    acordaAteX: 190,
    /** O alerta: a broca recolhe e o OLHO ACENDE (8 quadros a 12 qps). */
    alertaS: 0.65,
    velAtaque: 55,
    /** Quão rápido ele corrige o rumo para a nave (rad/s). */
    giro: 2.5,
    rajadaCadaS: 1.4,
    rajadaN: 3,
    rajadaEspacoS: 0.12,
    velTiro: 110,
    ataqueMaxS: 5,
    raioPisca: 34,
    piscaS: 0.6,
    raioExplosao: 30,
    estilhacos: 8,
    velEstilhaco: 100,
  },
  /** O asteroide minerável (o hazard `mineravel`). */
  rocha: { hp: 8, score: 40 },
  sentinela: {
    hp: 18,
    score: 350,
    velRolando: 120,
    /** O giro da roda (graus/s). */
    giroRolando: 540,
    abrirS: 0.5,
    fogoS: 2.5,
    /**
     * A SOBRECARGA (05/10, ele: *"precisa ter mais um time vulnerável, onde ele faz mais alguma coisa e pode tomar
     * dano"*): depois do fogo o escudo CAI e a MINIGUN VARRE em leque, de cima para baixo — uma cortina com buracos.
     */
    sobrecargaS: 1.6,
    varreduraCadaS: 0.15,
    /** O arco TOTAL da varredura, centrado na esquerda. */
    varreduraArcoGraus: 70,
    velVarredura: 105,
    fecharS: 0.5,
    ciclos: 3,
    /** A abertura TOTAL do arco do escudo, centrado na esquerda. */
    escudoArcoGraus: 120,
    /**
     * O FOGO com DOIS TIROS (05/10 (2), ele: *"como o golfinho, dois tipos de tiros"*), um cano de cada vez, alternando a
     * cada `alternarCadaS`: o CANHÃO DE CIMA solta a bola PESADA (grande e LENTA, mirada — sair da linha) e a MINIGUN o
     * LEQUE leve (rápido — achar o vão). Era rajada de 3 + anel de 8 + espiral: ~50 tiros por ciclo, impossível no meio
     * da fase; agora ~18.
     */
    alternarCadaS: 0.6,
    pesadoVel: 60,
    /** A escala da bola (a `bulletOrb` da canhoneira do cinturão nasce a 0.8). */
    pesadoEscala: 1.0,
    lequeN: 3,
    lequeAberturaGraus: 24,
    lequeVel: 120,
    postoX: [230, 330] as const,
    postoY: [40, 176] as const,
    postoDistY: 50,
    velSaida: 140,
  },
};
