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
     * dano"*): depois do fogo o escudo CAI e ela gira o canhão cuspindo uma ESPIRAL — perigosa, mas aberta.
     */
    sobrecargaS: 1.6,
    espiralCadaS: 0.09,
    /** O giro da espiral (rad/s). */
    espiralGiro: 6.5,
    velEspiral: 90,
    fecharS: 0.5,
    ciclos: 3,
    /** A abertura TOTAL do arco do escudo, centrado na esquerda. */
    escudoArcoGraus: 120,
    rajadaCadaS: 0.8,
    rajadaN: 3,
    rajadaEspacoS: 0.1,
    anelN: 8,
    velTiro: 110,
    postoX: [230, 330] as const,
    postoY: [40, 176] as const,
    postoDistY: 50,
    velSaida: 140,
  },
};
