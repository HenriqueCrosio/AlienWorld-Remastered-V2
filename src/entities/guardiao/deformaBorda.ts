/**
 * O CONTRATO DA BORDA VIVA (23/11): o que deforma a faixa da moldura coluna a coluna — o aperto (passo 4) e o teto que
 * sangra (passo 5). Quem desenha, mede e morde é `camadaBorda.ts`; quem diz quanto cada coluna anda é a fonte. Puro.
 *
 * A LEI (a do duto, e a do aperto, 23/11): onde a borda está TORCIDA (deslocada > 0) ela leva o FIO aceso e MORDE; onde
 * não está, nem fio nem mordida. Uma luz que não morde (o pulso de sangue correndo pela borda) usa OUTRA cor (`luzTeto`).
 */
export interface DeformaBorda {
  readonly acabou: boolean;
  /** a borda inteira estremece (o aviso do aperto) */
  readonly treme: boolean;
  passo(dt: number): void;
  /** quanto a coluna `x` desce (teto) e sobe (chão), em px INTEIROS, sem o estremecer; > 0 = torcida */
  deslocar(x: number, yTeto: number, yChao: number): { teto: number; chao: number };
  /** uma luz sobre a superfície do teto na coluna `x` que NÃO morde (ABGR; 0 = nenhuma) */
  luzTeto?(x: number): number;
}
