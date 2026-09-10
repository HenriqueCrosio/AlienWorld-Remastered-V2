# SPEC — A MOLDURA VIRA BORDA: O PERFIL NOVO, A PAREDE QUE MORDE, E O CENÁRIO DESEMPILHADO

**Data:** 2026-09-10 · **Branch:** `feat/fase4-visual` · **Fatia 7 · pós-M1**

Aprovado pelo Henrique em 10/09/2026, depois do teste jogado do M1.

---

## 0. DE ONDE ISTO VEM

O M1 (09/09) trocou o `vaoY` sorteado por uma curva contínua e pôs a faixa desenhada na tela. O
teste jogado respondeu a pergunta que o M1 existia para fazer, e trouxe quatro veredictos:

1. **A curva contínua NÃO estragou a dificuldade.** *"as bordas ficaram boas"*, *"gostei da sua
   adição do hitbox na margem, ficou mais desafiador jogar"*. `PASSO_MAX` fica em 14.
2. **A moldura está grossa cedo demais.** Ele quer *"que elas sejam como bordas mesmo, margeando a
   fase, só ficando mais para dentro na fase do duto e abrindo no boss final"*.
3. **A parede do duto deve MATAR de encostar** — *"isso dá o desafio extra de desviar e conseguir
   sair do duto com vida"*.
4. **O cenário se repete.** *"alguns se repetem em outros tamanhos e ficou repetitivo"*, com dois
   prints anexados: a engrenagem grande pendurada no teto é boa (*"traz noção de grandeza"*), o
   coração pequeno solto no ar é ruim (*"jogado no ar da fase"*).

⚠️ **O item 1 é o que autoriza os outros três.** A geometria do M1 passou; o que muda daqui em
diante é perfil, física e povoamento — não a curva.

---

## 1. O DIAGNÓSTICO DO ITEM 4, PORQUE ELE NÃO ERA IMPRESSÃO

Os dois prints do Henrique são duas camadas do `Parallax.buildInterior()`, e o contraste que ele
leu está escrito na configuração:

| print | camada | como ela nasce | linha |
|---|---|---|---|
| **bom** — engrenagem no alto | `maquinario` | `teto: true`, `baseY: -18`, escala **0.6–1.0** | `Parallax.ts:428` |
| **ruim** — coração no ar | `orgao` | `flutua: true`, `faixa: [50,170]`, escala **0.5–0.9** | `Parallax.ts:416` |

É a mesma peça de arte (`orgao.png`, 121×118) nos dois casos — o que difere é âncora e tamanho.

⚠️ **A LEI QUE SAI DAÍ, e ela vale para todo o M2–M5:**
**peça grande ANCORADA numa borda lê como grandeza; peça pequena SOLTA no meio da tela lê como
asset jogado na cena.** É a mesma frase que abriu a Fatia 7 inteira em 08/09, agora com a linha de
código que a causa.

E a repetição tem número: **`costela` está em 3 camadas e `derelict` em 3**, com as faixas de
escala se SOBREPONDO (costela 0.3–0.48 / 0.3–0.46 / 0.42–0.6; derelict 1.1–1.5 / 1.1–1.5 /
1.0–1.4). Seis instâncias de duas peças, nos mesmos tamanhos. ⚠️ **É a sobreposição das escalas
que faz a mesma peça ler como repetição em vez de profundidade** — duas camadas da mesma arte em
tamanhos claramente diferentes leem como distância; em tamanhos parecidos, leem como cópia.

---

## 2. O PERFIL NOVO DA ESPESSURA — só números de roteiro

Nenhuma linha de código nova. Trocam-se os `espessura` do `STAGE_4`:

| t | hoje | novo | o que acontece |
|---|---|---|---|
| 1 | 16 | **16** | você entrou num lugar grande |
| 15 | 18 | **16** | a borda margeia, e é só isso |
| 37 | 26 | **16** | — |
| 43 | 36 | **16** | ⚠️ o aperto vem do **vão** (76px), não da parede |
| 55 | — | **32** ← evento novo | a parede começa a ganhar corpo |
| 63,5 | 48 | **44** | — |
| 68 | 54 | **54 + letal** | O DUTO |
| 79 | 54 | **16 + não letal** | recua durante o silêncio |

**A rampa faz o resto sozinha.** `Moldura.RAMPA` é 8px/s, então:

```
t=55   16→32   2,00s   pronto em t≈57
t=63,5 32→44   1,50s   pronto em t≈65
t=68   44→54   1,25s   pronto em t≈69,25
t=79   54→16   4,75s   pronto em t≈83,75   ← o chefão entra em t=86
```

O jogador **vê** a parede recuar enquanto sai do duto, e chega na arena do núcleo com a moldura
fina. É a abertura pedida, e ela sai de graça do mecanismo que já existe.

⚠️ **UM EFEITO COLATERAL CONHECIDO QUE VIRA VANTAGEM.** Em espessura 54 o relevo é aparado a zero
(`Math.min` em `Moldura.gerar`) e a parede vira régua reta. O START de 09/09 anotou isso como
possível defeito ("se o duto parecer morto"). Com a parede matando, **régua reta é necessário**:
parede irregular e letal é ilegível, e ilegível não é dificuldade, é roubo. Não mexer.

---

## 3. A PAREDE QUE MORDE

### 3.1 Ela NÃO é um corpo físico, e essa é a decisão inteira

```
NÃO:  um Arcade Body colado no vão   →  é isto que vira morte invisível
SIM:  uma medição contra os MESMOS números que posicionam o sprite
```

A `Moldura` já expõe `superficieChaoEm(x)` / `superficieTetoEm(x)` — as linhas que a `avanca` usa
para posicionar os 8 sprites da faixa. A mordida lê a caixa da nave nas bordas esquerda e direita,
compara com essas duas linhas e chama `damageShip()`. **Sem `physics.add`, sem colisor novo, sem
grupo novo.**

⚠️ **A proibição de física nova da spec de 08/09 continua valendo, e esta é a razão de ela
continuar valendo.** Um corpo físico colado no vão é exatamente onde bug de colisão mora — e a
`probe-stage4` mede o vão a partir do MESMO número que posiciona a mesa, então ela é cega para
isso por construção (foi assim que a mesa sem textura passou por quatro sondas em 09/09).

### 3.2 As três garantias que isso compra

1. **A parede nunca mata onde não está desenhada.** O que mata é literalmente o número que
   posiciona a imagem. Não há como a hitbox e o desenho divergirem, porque são o mesmo dado.
2. **A trava dos 8px já protege o corredor.** `Moldura.FOLGA` garante que a superfície nunca entra
   no vão. Medido no regime do duto (espessura 54, gap 84, `GROUND_Y` 206, `TETO_Y` 10): a folga
   entre a borda do vão e a parede letal vai de **8px (pior caso) a 34px (melhor)**. ⚠️ **A parede
   letal não pode tornar a fase impossível, e é uma invariante que JÁ EXISTE que garante isso** —
   não uma nova promessa.
3. **`damageShip()` já tem 1400ms de i-frames.** Raspar a parede custa **uma** vida, não todas em
   três quadros. Nenhum tratamento especial é necessário.

### 3.3 A mordida de 3px

A parede só cobra depois que a nave entra **3px** nela.

⚠️ **Não é generosidade solta, é a folga que um limite conhecido exige.** `Moldura.avanca` já
documenta que `placaEm` pode discordar em uma placa na fronteira dos 128px, porque o `x` do sprite
é arredondado para a grade de pixel e `floor((xMundo + x) / 128)` pode cair uma placa atrás. Sem a
folga, esse 1px de discordância poderia ser a diferença entre viver e morrer. Com ela, é
estruturalmente incapaz de decidir uma vida — e de quebra joga como shmup deve jogar.

**Amostragem:** nas bordas **esquerda E direita** da caixa da nave, tomando a superfície mais
perigosa das duas. A nave tem ~22px e a parede é uma escada de 128px: amostrar só o centro daria
até 11px de placa errada ao cruzar um degrau. O nariz encosta antes do corpo, e é assim que tem de
ser.

### 3.4 `letal` é um campo do ROTEIRO

```ts
| { t: number; type: 'moldura'; espessura: number; letal?: boolean }
```

⚠️ **Deduzir a letalidade da espessura seria mágica implícita** — um roteiro futuro que pedisse 54
por outro motivo ganharia parede assassina sem ninguém ter escrito isso. O roteiro manda,
explicitamente, como já manda na espessura.

⚠️ **`aplicaCorredorEMoldura` PRECISA aplicar `letal` à mão.** É exatamente a classe de bug que já
mordeu esta fase uma vez: o commit `bb1018c` existe porque o modo treino descartava o corredor e a
moldura que o `skipTo` pulava. Um campo novo no mesmo evento tem o mesmo buraco esperando.

### 3.5 O TELÉGRAFO — a parede tem de avisar

Uma parede que foi cenário por 68 segundos e de repente cobra é **sonegação**, não dificuldade. É a
mesma regra que o `STAGE_4` já aplica na abertura: *"o jogador precisa descobrir que o teto mata
ANTES de o vão apertar. Aprender a regra nova no aperto é sonegação, não dificuldade."*

O aviso cai junto com a troca de pintura do duto (`paintBgF4c`, t=68) e com o banner que já existe.
A regra passa a ser **lida**, não descoberta na morte.

⚠️ **O TELÉGRAFO É UM FIO ACESO, E NÃO UM TINT — E ISSO FOI UMA MEDIÇÃO, NÃO UMA PREFERÊNCIA.** A
primeira implementação apostava em `setTint` nos 8 sprites da faixa. Medido em t=74, a luminância
média da banda da parede foi:

```
inerte   rgb(24,8 · 16,8 · 22,2)   lum 18,9
letal    rgb(23,5 · 15,3 · 20,7)   lum 17,4
delta                              lum −1,5   ← o telégrafo não existia
```

Tint no Phaser é **multiplicativo**, e a faixa é quase preta na banda que importa. Multiplicar
preto por qualquer cor devolve preto. ⚠️ E isto **não é um defeito da arte provisória que a arte
final conserte**: o rumo desta fase é casco escuro com *luz só onde há energia*, então a parede
final também será escura — a aposta no tint teria falhado de novo, mais tarde e mais caro.

A saída é luz **aditiva desenhada por cima**: um fio de 2px na superfície da parede, na cor
`0xffb478`, visível só enquanto ela morde. Medido no mesmo instante e no mesmo lugar:

```
delta   lum +16,2   ·   pico +37,1
```

⚠️ **O fio sai da MESMA placa que a faixa e que a mordida** — os três leem `superficieChao` /
`superficieTeto` da placa `base + i`. A luz cai exatamente na linha que cobra o encosto. Um fio
deslocado ensinaria o jogador a mirar numa borda que não é a que mata, e isso é pior que não ter
telégrafo nenhum.

O tint fica, porque esquenta o que já tem luz — mas quem anuncia a parede é o fio, e é o fio que a
sonda cobra.

---

## 4. O CENÁRIO DESEMPILHADO

| camada | hoje | novo | por quê |
|---|---|---|---|
| `orgao` | `flutua`, faixa 50–170, escala 0.5–0.9 | **ancorado no CHÃO**, escala 0.9–1.3, `gap` maior | a lei da seção 1 |
| `costela` | **3** camadas, escalas 0.3–0.6 sobrepostas | **2** camadas: teto 0.28–0.38 (longe), chão 0.5–0.7 (perto) | separa as escalas |
| `derelict` | 3 camadas, escalas 1.0–1.5 quase idênticas | chão+teto mantidos; **viga de primeiro plano vai a 1.6–1.9** | separa as escalas |

**A divisão que os prints dele pedem:** máquina pendurada em cima (`maquinario`, teto), carne
ancorada embaixo (`orgao`, chão), **as duas grandes**. O teto e o chão passam a ter cada um a sua
peça-assinatura, e nenhuma das duas flutua.

⚠️ **A viga de primeiro plano não é cortada, e de propósito.** O comentário do `Parallax.ts` registra
que ela é dificuldade de leitura deliberada (as silhuetas que passam na frente da nave, apagadas
no chefão pelo `setForegroundDimmed`). O que muda é só a escala, para ela ler como *perto* em vez
de *igual*. ⚠️ E ela não vai além de 1.9: a revisão visual anterior já mediu que a placa girada a
2.1 lia como borrão preto tapando um canto da tela.

---

## 5. AS SONDAS

**`probe-f4-moldura`** ganha:

- O perfil novo, em cinco instantes: **t=50 → 16** (a margem sobrevive à fase inteira), **t=60 →
  32**, **t=66 → 44**, **t=74 → 54**, **t=84 → ≤20** (reabriu). ⚠️ Os instantes são amostrados
  DEPOIS do fim de cada rampa, nunca no instante do evento — em t=55 a espessura ainda é 16 e
  subindo, e um assert cravado ali mediria a rampa, não o alvo.
- **A mordida:** uma caixa de nave posta dentro da parede em t≥68 é cobrada; a mesma caixa em t<68
  não é; e a superfície que cobra é a mesma que desenha.

**`probe-stage4`** continua cobrando `corredores {"chao":3,"teto":3,"vaos":[110,110,110]}`.
⚠️ **Este número não pode mudar.** A mordida não toca a mesa nem o vão; se a linha de base mexer, a
mordida vazou para onde não devia.

---

## 5.1 A INVARIANTE QUE ESTA ETAPA DESCOBRIU: O ROTEIRO TEM DE ESTAR ORDENADO

⚠️ **`StageDirector.update` caminha com um CURSOR MONOTÔNICO (`next`).** Um evento fora de ordem
crescente de `t` não dispara no instante que ele declara: dispara quando o cursor chega nele, ou
seja, no `t` do vizinho anterior. Ele fica escrito no roteiro com um número e acontece com outro.

**Como isto apareceu:** o evento novo `{ t: 55, moldura 32 }` foi inserido depois de um
`{ t: 58, wave }`, e a parede só começava a engrossar em t=58.

⚠️ **A SONDA PASSOU VERDE.** Ela amostrava a espessura em t=60, e a rampa de 2s a partir de t=58
terminava justo a tempo de entregar 32. Quem pegou foi uma **captura de tela em t=58** — mais uma
para a conta da regra *ABRA A IMAGEM*, que já respondia por três dos cinco achados sérios do M1.

**O conserto:** um guard no construtor do `StageDirector` que lança na carga da fase, com o índice,
os dois `t` e os dois tipos. Ele lança em vez de ordenar sozinho — ordenar em silêncio faria o
roteiro rodar diferente do que está escrito no arquivo, que é exatamente o defeito que se quer
impedir. ⚠️ Ele vale para as QUATRO fases (conferidas: todas já em ordem), e não depende de
instante amostrado, que é a fraqueza da sonda que deixou isto passar.

---

## 6. O QUE ESTA SPEC NÃO FAZ

- **As 4 faixas continuam sendo dele e continuam sem aprovação.** `_faixa-{A,B,C,D}-v.png` seguem
  no disco esperando ele pintar por cima.
- **Os 906 objetos do PixelLab não são garimpados aqui.** Decidido em 10/09: corte de camadas
  agora, escolha de peças depois que ele jogar isto.
- **A decisão da repetição da faixa** (duas variantes por câmara vs. uma mais neutra) continua
  aberta.
- **Os 4 objetos em `awaiting-selection`** continuam parados.
- **`PASSO_MAX` não muda.** O teste jogado aprovou a curva.
