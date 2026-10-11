// GERADO por `scripts/_elites/_instalar-sentinela.mjs` — não edite à mão: mudou a arte, o giro ou o quanto dela fica à
// mostra, reinstale. As medidas dos quadros assados da serpente do casco (o posto "tentaculo" da F3, spec §3.4).

/**
 * `pivo` = o ponto do quadro que fica na CRISTA do casco (a origem do sprite). `afundado` = quanto o pivô desce para ela
 * sumir. `peito` = de onde saem os espinhos e `boca` = a ponta da cabeça em cada quadro do bote (os dois a partir do
 * pivô; `null` = a cabeça ainda não saiu). `frente` = a borda da frente dela em cada linha acima da crista, no auge
 * do brilho (x a partir do pivô; `null` = linha vazia). `corpo` = a hitbox de cada quadro, no quadro (x, y do canto).
 */
export const TENTACULO_QUADROS = {
  "w": 179,
  "h": 129,
  "pivo": {
    "x": 95,
    "y": 68
  },
  "afundado": 54,
  "peito": {
    "x": -16,
    "y": -26
  },
  "frente": [
    null,
    30,
    28,
    27,
    26,
    26,
    25,
    24,
    15,
    15,
    14,
    14,
    13,
    12,
    11,
    11,
    10,
    10,
    10,
    9,
    8,
    5,
    0,
    -2,
    -3,
    -5,
    -6,
    -14,
    -17,
    -19,
    -19,
    -21,
    -21,
    -22,
    -22,
    -15,
    -15,
    -18,
    -20,
    -21,
    -22,
    -22,
    -4,
    -3,
    -1,
    -1,
    -1,
    -2,
    -3,
    -5,
    -6,
    -8,
    -9,
    9,
    8,
    8,
    -36,
    -39,
    -42,
    -42,
    -24,
    -21,
    -21,
    -24,
    -25,
    -34,
    -38,
    -41
  ],
  "corpo": {
    "idle": [
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 27,
        "w": 43,
        "h": 36
      },
      {
        "x": 91,
        "y": 27,
        "w": 43,
        "h": 36
      },
      {
        "x": 91,
        "y": 26,
        "w": 42,
        "h": 37
      },
      {
        "x": 90,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 90,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 90,
        "y": 26,
        "w": 44,
        "h": 37
      },
      {
        "x": 90,
        "y": 27,
        "w": 44,
        "h": 37
      },
      {
        "x": 91,
        "y": 27,
        "w": 44,
        "h": 37
      },
      {
        "x": 92,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 92,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 27,
        "w": 43,
        "h": 36
      },
      {
        "x": 91,
        "y": 27,
        "w": 43,
        "h": 36
      },
      {
        "x": 90,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 90,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 91,
        "y": 26,
        "w": 43,
        "h": 37
      }
    ],
    "espinhos": [
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 92,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 92,
        "y": 24,
        "w": 43,
        "h": 39
      },
      {
        "x": 92,
        "y": 24,
        "w": 43,
        "h": 39
      },
      {
        "x": 91,
        "y": 23,
        "w": 44,
        "h": 40
      },
      {
        "x": 94,
        "y": 25,
        "w": 43,
        "h": 38
      },
      {
        "x": 91,
        "y": 24,
        "w": 44,
        "h": 39
      },
      {
        "x": 94,
        "y": 25,
        "w": 43,
        "h": 38
      },
      {
        "x": 91,
        "y": 24,
        "w": 44,
        "h": 39
      },
      {
        "x": 91,
        "y": 24,
        "w": 44,
        "h": 39
      },
      {
        "x": 92,
        "y": 26,
        "w": 43,
        "h": 37
      },
      {
        "x": 91,
        "y": 27,
        "w": 44,
        "h": 37
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      }
    ],
    "bote": [
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      },
      {
        "x": 94,
        "y": 28,
        "w": 46,
        "h": 36
      },
      {
        "x": 97,
        "y": 27,
        "w": 48,
        "h": 37
      },
      {
        "x": 99,
        "y": 27,
        "w": 49,
        "h": 37
      },
      {
        "x": 99,
        "y": 27,
        "w": 50,
        "h": 37
      },
      {
        "x": 99,
        "y": 27,
        "w": 49,
        "h": 37
      },
      {
        "x": 99,
        "y": 27,
        "w": 50,
        "h": 37
      },
      {
        "x": 97,
        "y": 26,
        "w": 47,
        "h": 38
      },
      {
        "x": 48,
        "y": 18,
        "w": 49,
        "h": 37
      },
      {
        "x": 15,
        "y": 12,
        "w": 58,
        "h": 40
      },
      {
        "x": 16,
        "y": 12,
        "w": 57,
        "h": 40
      },
      {
        "x": 24,
        "y": 13,
        "w": 55,
        "h": 40
      },
      {
        "x": 44,
        "y": 18,
        "w": 50,
        "h": 37
      },
      {
        "x": 62,
        "y": 22,
        "w": 45,
        "h": 37
      },
      {
        "x": 74,
        "y": 24,
        "w": 43,
        "h": 38
      },
      {
        "x": 85,
        "y": 27,
        "w": 43,
        "h": 36
      },
      {
        "x": 91,
        "y": 28,
        "w": 44,
        "h": 36
      }
    ]
  },
  "boca": [
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    {
      "x": -58,
      "y": -40
    },
    {
      "x": -87,
      "y": -50
    },
    {
      "x": -87,
      "y": -50
    },
    {
      "x": -79,
      "y": -46
    },
    {
      "x": -62,
      "y": -39
    },
    {
      "x": -49,
      "y": -33
    },
    null,
    null,
    null
  ]
} as const;
