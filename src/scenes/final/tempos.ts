/**
 * A LINHA DO TEMPO DA CUTSCENE FINAL (ms, relógio da CENA) — spec 2026-09-23 §3. É a ÚNICA fonte dos
 * tempos: a regente agenda os capítulos por ela, e cada capítulo mede os beats internos a partir do
 * próprio início (`T.X - T.Y`). Mexer num tempo é mexer AQUI.
 *
 * ⚠️ 24/09 — O CAPÍTULO 1 ENCOLHEU de 5s para 1,5s, a pedido dele depois de assistir: *"podemos até mostrar
 * a camara D inicialmente, mas o rasgo na estrutura tem que vir logo depois"*. A câmara D é só o tempo de
 * reconhecer onde se está; a cena é sobre a coisa EXPLODIR dali. O resto andou junto (~42s no total).
 */
export const T = {
  /** Capítulo 2: a parede ESTOURA (e a música morre). */
  RASGO: 1500,
  /** Capítulo 3: o vácuo puxa tudo, e a nave é arrancada. */
  DESCOMPRESSAO: 3500,
  /** Capítulo 4: o corte para fora — a ferida. */
  FERIDA: 8000,
  /** Capítulo 5: o corte para perto da lua — a queda. */
  QUEDA: 16000,
  /** Capítulo 6: a superfície — o sobrevoo. */
  SOBREVOO: 24000,
  /** Capítulo 7: a câmera para sobre a carcaça, e a lava esfria. */
  APAGA: 36000,
  /** O fade para o preto começa (a última placa já apagou). */
  FADE: 40600,
  /** O `GameOver`. */
  FIM: 42000,
} as const;
