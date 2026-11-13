# Bloco I, etapa 2 — os flashes de tela cheia (item 13) · design

> 13/11 · aprovado em conversa e pela folha `folhas/2026-11-13/flashes/flashes.html` (*"Boa, aprovado"*).
> Antes: a análise de 14/10 (item 13), o START `plans/2026-11-09-bloco-i-etapa2-START.md`, a spec da etapa 1
> (`2026-11-09-bloco-i-explosoes-design.md` §0).

## 0. O problema e a decisão

Hoje 21 chamadas de `cameras.main.flash` pintam a tela INTEIRA de uma cor, começando em 100% de opacidade. Funcionam
como golpe, mas escondem o jogo no instante em que ele mais importa, e em cadeia (a Aurora, a doca) piscam várias vezes
por segundo.

As respostas dele:

1. **O alcance:** o jogo inteiro, os 21.
2. **A forma:** uma por FAMÍLIA.
3. **Os sinais:** ficam com a cor de hoje, em clarão local no emissor.
4. **A fotossensibilidade:** um teto global em código agora; a opção de menu só na etapa 1.55.

Nenhuma chamada de `cameras.main.flash` sobra no `src/`.

## 1. As quatro formas

| família | a forma | o que se vê |
|---|---|---|
| **impacto** | clarão LOCAL | um disco de luz aditiva em volta da explosão; a tela não muda de cor |
| **sinal** | clarão LOCAL no emissor | o mesmo disco, na cor do sinal, em volta de quem mudou (a nave, o chefão) |
| **golpe na nave** | VINHETA | as bordas da tela acendem na cor; o meio fica legível |
| **largada** | TELA fraca | a tela inteira, a 28% de opacidade, mais curta |

A vinheta é EXCLUSIVA do golpe na nave: bordas acesas querem dizer "você foi atingido" e nada mais. (O magenta das
viradas de chefão é vizinho do rosa da perda de casco; por isso as viradas são clarão local.)

Tudo em pixel na resolução nativa (384×216), sem `Graphics` vetorial: o disco e a vinheta são texturas com a queda de
luz quantizada em 4 níveis pelo Bayer 4×4, e o apagar são 6 quadros (a luz encolhe pelos níveis), não um alpha contínuo.
A TELA fraca é um retângulo liso com alpha contínuo (não há forma para pontilhar).

## 2. Os números (os da folha aprovada)

| | valor |
|---|---|
| clarão local, impacto | raio = 56 × `escala` do `explodeBig`, entre 40 e 120 px; pico 0,6; dura max(ms × 1,5, 220) |
| clarão local, clímax (os de ≥ 400 ms hoje) | raio 150 px; pico 0,6; dura os ms de hoje |
| clarão local, a bomba de pânico | raio 120 px, no centro da tela |
| clarão local, sinal na nave | raio 56 px; pico 0,7; 300 ms |
| clarão local, sinal no chefão / na fusão | raio 100 px; pico 0,7; 300 ms |
| vinheta | começa a 0,7 do raio da elipse da tela e enche até a borda; pico 0,75; dura max(ms × 2, 180) |
| tela fraca | pico 0,28; dura ms × 0,75 |
| o teto | 3 clarões por segundo, somando TODAS as formas; do 4º em diante o pico × 0,35 |
| a força geral | `CLARAO.forca = 1`, multiplica todo pico (o gancho da opção "reduzir clarões" da 1.55) |

As cores são as de hoje, chamada por chamada.

## 3. As 21 chamadas

| onde | hoje (ms, cor) | família | a fonte da luz |
|---|---|---|---|
| `Fx.explodeBig` | 120, laranja | impacto | o (x, y) da explosão, o raio pela `escala` |
| `Fx.abaloGrande` | 120, laranja | impacto | o (x, y) do abalo, o raio pela `escala` |
| `sangue.ts` (o núcleo da F4) | 260, vermelho escuro | impacto | o ponto da explosão sangrenta |
| `GameScene` a bomba de pânico | 220, creme | impacto | o centro da tela |
| `InterludeScene` a explosão final da Aurora | 500, creme | impacto (clímax) | o meio do casco, onde a `explodeBig` final estoura |
| `Interlude2Scene` a doca explodindo | 800, laranja | impacto (clímax) | a doca |
| `Interlude3Scene` o clarão final | 700, laranja | largada | (tela) — não há fonte: a boca já está selada, a cena entrega 0,8 s depois |
| `Interlude3Scene` o impacto na garganta | 140, laranja | impacto | o ponto do impacto |
| `GameScene` a perda de casco | 90, rosa | golpe | (vinheta) |
| `CartasEmJogo` o Casco absorvendo | 70, ciano | golpe | (vinheta) |
| `MorteDaNave.clarao` | `MORTE.clarao` | golpe | (vinheta) |
| `Interlude{,2,3}Scene` "nave armada" (3) | 200, ciano | sinal | a nave |
| `Boss` a virada da Torre da F1 | 160, magenta | sinal | o chefão |
| `BossCapitania` a fúria | 180, magenta | sinal | o chefão |
| `BossSerpente` a fusão | 220, branco | sinal | o ponto da fusão |
| `Interlude{,2,3}Scene` a largada (3) | 160, âmbar / âmbar / vermelho | largada | (tela) |
| `GameScene` a nave rompendo a atmosfera | 400, branco-azulado | largada | (tela) |

### 3b. A cutscene final (fora do `cameras.main.flash`) — decidido em 13/11

A queda do Leviatã (`src/scenes/final/queda.ts`) tem luz de tela cheia feita à mão: os QUADROS DE IMPACTO (uma chapa
laranja-clara com tudo em silhueta preta, e o inverso) e, depois do choque, um retângulo aditivo de tela cheia a 60%
que apaga em 280 ms. Ele escolheu: **o retângulo vira clarão local grande (clímax, raio 150, a cor 0xffc890, 280 ms) no
focinho (`NARIZ`)**; **os quadros de impacto FICAM como estão** (linguagem da cena, uma alternância só) e contam no
teto (`Clarao.conta()`, sem desenhar nada). As outras cenas (Hangar, menu, game over, o sobrevoo, o interior) só têm
fades para o preto: fora.

O clarão final da cutscene 3 (sem fonte na tela) é da família da largada: ele confirmou o véu fraco.

## 4. A arquitetura

Um módulo novo, `src/systems/clarao/`, com três peças:

- **`claraoRegras.ts`** (puro, sem Phaser): os números da §2 (`CLARAO`), a queda de luz do disco e da vinheta
  (`forcaDisco`, `forcaVinheta`), a quantização (`nivel(v, x, y)` pelo Bayer), o raio do impacto pela escala, e o teto
  (`tetoDeClaroes(instantes, agora)` devolve o fator 1 ou 0,35 e a janela atualizada). É o que os testes cobrem.
- **`texturasClarao.ts`**: assa, uma vez por jogo, as texturas em canvas (`clarao-<raio>` e `clarao-vinheta`, 6 quadros
  cada), a partir das funções puras.
- **`Clarao.ts`**: a interface que o resto do jogo chama, uma instância por cena, obtida por `claraoDe(scene)`:
  - `impacto(x, y, cor, { escala?, raio?, ms })`
  - `sinal(x, y, cor, { raio })`
  - `golpe(cor, ms)`
  - `largada(cor, ms)`

  Cada método pergunta ao teto o fator, cria a imagem (ADD para o disco e a vinheta), toca os 6 quadros por um
  `time.addEvent` da cena e a destrói. O teto vive no módulo (um por jogo), contado no relógio do jogo
  (`game.loop.time`), para valer entre cenas.

As profundidades: o disco em 90 e a vinheta e a tela em 98, abaixo da HUD (99+), que fica limpa. A vinheta e a tela
têm `scrollFactor` 0.

As 21 chamadas trocam `cameras.main.flash(…)` pelo método da família (§3). `Fx.explodeBig` e `Fx.abaloGrande` passam
o (x, y) e a `escala` que já recebem. Os chefões passam o próprio sprite.

**A Atmosfera:** `Atmosfera.ts` lê o `flashEffect` da câmera para o halo ceder durante o flash. Sem flash de câmera esse
valor fica em 0 para sempre; a leitura, o campo `flash` e o `uFlash` do shader saem. (Na folha aprovada os clarões novos
já passavam pela Atmosfera sem isso.)

## 5. O que NÃO muda

- Os tremores de câmera (`shake`), as fagulhas, as explosões e as folhas `-luz` da etapa 1.
- Os véus pretos de transição (`Predador`, `cenarioHangar`, `escurecerParaOCasco`).
- Mecânica, dano, tempos de cena: só o clarão troca.
- O menu de OPÇÕES: fica para a 1.55 (aqui só nasce o `CLARAO.forca`).

## 6. Os testes e a prova

- **`scripts/test-claroes.mjs`** (puro, termina com `process.exitCode`): o teto (3 passam inteiros, o 4º dentro do mesmo
  segundo sai a 0,35, depois de 1 s volta a 1); o raio do impacto (os limites 40 e 120); a vinheta (0 no meio da tela,
  cheia no canto); o disco (0 fora do raio); a quantização nunca passa de 4 níveis.
- **Nenhum flash de câmera:** o mesmo teste falha se `cameras.main.flash` aparecer em qualquer arquivo de `src/`.
- **Build e os testes de hoje** seguem passando.
- **A prova visual:** as três filmagens da folha aprovada refeitas com o jogo de verdade (a sonda no modo `hoje`, que não
  troca nada) e comparadas quadro a quadro com as do conceito; e, numa folha nova para ele, os que não foram filmados
  no conceito: a fusão da Serpente, a virada da Torre da F1, o núcleo da F4, o Casco (carta), a atmosfera e as
  cutscenes 2 e 3.

## 7. Fora do alcance

A opção de fotossensibilidade no menu (1.55); a tela final (a etapa 3 do bloco I); qualquer recalibragem de cor dos
clarões (a vinheta da morte da nave é fraca com o marrom de hoje: fica como está, a rever só se ele pedir).
