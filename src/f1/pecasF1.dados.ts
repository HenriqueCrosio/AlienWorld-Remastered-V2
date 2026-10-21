// GERADO por scripts/_g/_instalar-pecas-f1.mjs — não editar à mão (rode o script).
// As peças do chão da F1 (rodada 6 do bloco G, 21/10): a escolha dele das estruturas no escuro. Cada chave é uma
// variante (`building`, `building2`… — ver src/art.ts); `quadros` > 1 é uma tira com as luzes assadas, tocada como
// `<chave>-luz` (`registrarPecasF1`); `boca` é a ponta do cano da torre na arte não espelhada.
export interface PecaF1 {
  chave: string;
  arquivo: string;
  fw: number;
  fh: number;
  quadros: number;
  boca?: readonly [number, number];
}

export const PECAS_F1: readonly PecaF1[] = [
  {
    "chave": "building",
    "arquivo": "sprites/f1/pecas/building.png",
    "fw": 46,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "building2",
    "arquivo": "sprites/f1/pecas/building2.png",
    "fw": 46,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "building3",
    "arquivo": "sprites/f1/pecas/building3.png",
    "fw": 46,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "building4",
    "arquivo": "sprites/f1/pecas/building4.png",
    "fw": 46,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "building5",
    "arquivo": "sprites/f1/pecas/building5.png",
    "fw": 48,
    "fh": 44,
    "quadros": 12
  },
  {
    "chave": "building6",
    "arquivo": "sprites/f1/pecas/building6.png",
    "fw": 48,
    "fh": 46,
    "quadros": 1
  },
  {
    "chave": "building7",
    "arquivo": "sprites/f1/pecas/building7.png",
    "fw": 48,
    "fh": 45,
    "quadros": 12
  },
  {
    "chave": "building8",
    "arquivo": "sprites/f1/pecas/building8.png",
    "fw": 48,
    "fh": 46,
    "quadros": 1
  },
  {
    "chave": "building9",
    "arquivo": "sprites/f1/pecas/building9.png",
    "fw": 48,
    "fh": 45,
    "quadros": 1
  },
  {
    "chave": "silo",
    "arquivo": "sprites/f1/pecas/silo.png",
    "fw": 37,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "silo2",
    "arquivo": "sprites/f1/pecas/silo2.png",
    "fw": 37,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "silo3",
    "arquivo": "sprites/f1/pecas/silo3.png",
    "fw": 37,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "silo4",
    "arquivo": "sprites/f1/pecas/silo4.png",
    "fw": 35,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "silo5",
    "arquivo": "sprites/f1/pecas/silo5.png",
    "fw": 37,
    "fh": 48,
    "quadros": 12
  },
  {
    "chave": "radar",
    "arquivo": "sprites/f1/pecas/radar.png",
    "fw": 15,
    "fh": 43,
    "quadros": 12
  },
  {
    "chave": "radar2",
    "arquivo": "sprites/f1/pecas/radar2.png",
    "fw": 20,
    "fh": 43,
    "quadros": 12
  },
  {
    "chave": "radar3",
    "arquivo": "sprites/f1/pecas/radar3.png",
    "fw": 16,
    "fh": 43,
    "quadros": 12
  },
  {
    "chave": "radar4",
    "arquivo": "sprites/f1/pecas/radar4.png",
    "fw": 21,
    "fh": 43,
    "quadros": 12
  },
  {
    "chave": "base",
    "arquivo": "sprites/f1/pecas/base.png",
    "fw": 96,
    "fh": 79,
    "quadros": 12
  },
  {
    "chave": "base2",
    "arquivo": "sprites/f1/pecas/base2.png",
    "fw": 96,
    "fh": 69,
    "quadros": 12
  },
  {
    "chave": "base3",
    "arquivo": "sprites/f1/pecas/base3.png",
    "fw": 96,
    "fh": 84,
    "quadros": 12
  },
  {
    "chave": "base4",
    "arquivo": "sprites/f1/pecas/base4.png",
    "fw": 96,
    "fh": 86,
    "quadros": 12
  },
  {
    "chave": "base5",
    "arquivo": "sprites/f1/pecas/base5.png",
    "fw": 96,
    "fh": 74,
    "quadros": 12
  },
  {
    "chave": "base6",
    "arquivo": "sprites/f1/pecas/base6.png",
    "fw": 96,
    "fh": 68,
    "quadros": 12
  },
  {
    "chave": "base7",
    "arquivo": "sprites/f1/pecas/base7.png",
    "fw": 96,
    "fh": 72,
    "quadros": 12
  },
  {
    "chave": "turret",
    "arquivo": "sprites/f1/pecas/turret.png",
    "fw": 27,
    "fh": 22,
    "quadros": 12,
    "boca": [9, 0]
  },
  {
    "chave": "turret2",
    "arquivo": "sprites/f1/pecas/turret2.png",
    "fw": 27,
    "fh": 21,
    "quadros": 12,
    "boca": [9, 0]
  },
  {
    "chave": "turret3",
    "arquivo": "sprites/f1/pecas/turret3.png",
    "fw": 27,
    "fh": 21,
    "quadros": 12,
    "boca": [10, 0]
  },
  {
    "chave": "turret4",
    "arquivo": "sprites/f1/pecas/turret4.png",
    "fw": 27,
    "fh": 22,
    "quadros": 12,
    "boca": [10, 0]
  },
  {
    "chave": "wreck",
    "arquivo": "sprites/f1/pecas/wreck.png",
    "fw": 44,
    "fh": 24,
    "quadros": 1
  },
  {
    "chave": "wreck2",
    "arquivo": "sprites/f1/pecas/wreck2.png",
    "fw": 44,
    "fh": 21,
    "quadros": 1
  },
  {
    "chave": "wreck3",
    "arquivo": "sprites/f1/pecas/wreck3.png",
    "fw": 44,
    "fh": 25,
    "quadros": 1
  },
  {
    "chave": "wreck4",
    "arquivo": "sprites/f1/pecas/wreck4.png",
    "fw": 40,
    "fh": 26,
    "quadros": 1
  },
  {
    "chave": "wreck5",
    "arquivo": "sprites/f1/pecas/wreck5.png",
    "fw": 44,
    "fh": 20,
    "quadros": 1
  },
  {
    "chave": "wreck6",
    "arquivo": "sprites/f1/pecas/wreck6.png",
    "fw": 39,
    "fh": 26,
    "quadros": 1
  },
  {
    "chave": "spire",
    "arquivo": "sprites/f1/pecas/spire.png",
    "fw": 26,
    "fh": 34,
    "quadros": 1
  },
  {
    "chave": "spire2",
    "arquivo": "sprites/f1/pecas/spire2.png",
    "fw": 26,
    "fh": 34,
    "quadros": 1
  },
  {
    "chave": "spire3",
    "arquivo": "sprites/f1/pecas/spire3.png",
    "fw": 26,
    "fh": 34,
    "quadros": 1
  },
  {
    "chave": "spire4",
    "arquivo": "sprites/f1/pecas/spire4.png",
    "fw": 26,
    "fh": 34,
    "quadros": 1
  },
  {
    "chave": "spire5",
    "arquivo": "sprites/f1/pecas/spire5.png",
    "fw": 34,
    "fh": 44,
    "quadros": 1
  },
  {
    "chave": "spire6",
    "arquivo": "sprites/f1/pecas/spire6.png",
    "fw": 33,
    "fh": 44,
    "quadros": 1
  },
  {
    "chave": "spire7",
    "arquivo": "sprites/f1/pecas/spire7.png",
    "fw": 34,
    "fh": 44,
    "quadros": 1
  },
  {
    "chave": "spire8",
    "arquivo": "sprites/f1/pecas/spire8.png",
    "fw": 34,
    "fh": 44,
    "quadros": 1
  },
  {
    "chave": "spire9",
    "arquivo": "sprites/f1/pecas/spire9.png",
    "fw": 39,
    "fh": 51,
    "quadros": 1
  },
  {
    "chave": "spire10",
    "arquivo": "sprites/f1/pecas/spire10.png",
    "fw": 40,
    "fh": 53,
    "quadros": 1
  },
  {
    "chave": "spire11",
    "arquivo": "sprites/f1/pecas/spire11.png",
    "fw": 40,
    "fh": 52,
    "quadros": 1
  },
  {
    "chave": "spire12",
    "arquivo": "sprites/f1/pecas/spire12.png",
    "fw": 40,
    "fh": 52,
    "quadros": 1
  },
  {
    "chave": "spire13",
    "arquivo": "sprites/f1/pecas/spire13.png",
    "fw": 41,
    "fh": 65,
    "quadros": 1
  },
  {
    "chave": "spire14",
    "arquivo": "sprites/f1/pecas/spire14.png",
    "fw": 41,
    "fh": 65,
    "quadros": 1
  },
  {
    "chave": "spire15",
    "arquivo": "sprites/f1/pecas/spire15.png",
    "fw": 41,
    "fh": 65,
    "quadros": 1
  },
  {
    "chave": "spire16",
    "arquivo": "sprites/f1/pecas/spire16.png",
    "fw": 41,
    "fh": 65,
    "quadros": 1
  },
  {
    "chave": "spire17",
    "arquivo": "sprites/f1/pecas/spire17.png",
    "fw": 48,
    "fh": 76,
    "quadros": 1
  },
  {
    "chave": "spire18",
    "arquivo": "sprites/f1/pecas/spire18.png",
    "fw": 48,
    "fh": 76,
    "quadros": 1
  },
  {
    "chave": "spire19",
    "arquivo": "sprites/f1/pecas/spire19.png",
    "fw": 48,
    "fh": 76,
    "quadros": 1
  },
  {
    "chave": "spire20",
    "arquivo": "sprites/f1/pecas/spire20.png",
    "fw": 48,
    "fh": 76,
    "quadros": 1
  }
];
