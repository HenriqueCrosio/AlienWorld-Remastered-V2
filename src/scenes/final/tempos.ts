/**
 * A LINHA DO TEMPO DA CUTSCENE FINAL (ms, relógio da CENA) — spec 2026-09-23 §3. É a ÚNICA fonte dos
 * tempos: a regente agenda os capítulos por ela, e cada capítulo mede os beats internos a partir do
 * próprio início (`T.X - T.Y`). Mexer num tempo é mexer AQUI.
 */
export const T = {
  /** Capítulo 2: a parede da câmara D rasga (e a música morre). */
  RASGO: 5000,
  /** Capítulo 3: o vácuo puxa tudo, e a nave é arrancada. */
  DESCOMPRESSAO: 9500,
  /** Capítulo 4: o corte para fora — a ferida. */
  FERIDA: 13500,
  /** Capítulo 5: o corte para perto da lua — a queda. */
  QUEDA: 21000,
  /** Capítulo 6: a superfície — o sobrevoo. */
  SOBREVOO: 29000,
  /** Capítulo 7: a câmera para sobre a carcaça, e a lava esfria. */
  APAGA: 41000,
  /** O fade para o preto começa (a última placa já apagou). */
  FADE: 45600,
  /** O `GameOver`. */
  FIM: 47000,
} as const;
