# S1 — a luta da Serpente: a arena, o movimento, a investida e a marca da cabeça — design

> 28/10/2026, no retorno dele jogando, depois de aprovar a fusão nova (*"ficaram ótimos"*). Ele:
> *"preciso arrumar melhor a posição da serpente, ela está muito central, sobrando pouco espaço para o player. O
> interessante será deixá-la mais para a direita da tela … a estrela não me agrada muito, o jogador precisa saber por
> outro método qual cabeça atacar. Algo que marque ela de uma forma mais orgânica. Eu senti que a avançada dela para
> frente não está fazendo muito sentido, quero deixar essa skill mais importante para a luta. É um dos bosses mais
> fáceis."* E: *"Acho o movimento da serpente de três cabeças e da maior muito engessadas. Elas ficam praticamente
> numa posição de idle a batalha toda."* E: *"o cenário do boss não condiz com a fase."*
>
> As escolhas dele (28/10):
> - **a investida:** ameaça + janela. Ela mira a altura da nave, atravessa a tela com o corpo inteiro ferindo, e quem
>   desvia ganha um instante com a cabeça viva perto;
> - **o movimento:** o corpo e os gestos. Os gestos (arte no PixelLab) são o S3;
> - **a marca:** as veias acesas, e o acerto que sangra (*"podem ser pixels pequenos, apenas para informar"*);
> - **a dificuldade:** o acerto do tamanho da cabeça, e a investida em toda forma;
> - **a fusão:** arte nova, a união das três, solta do casco. É o S2;
> - **o cenário:** ela sai de um rombo no próprio casco, e o treino mostra o casco.
>
> A divisão (aprovada): **S1** = a arena e a luta, com a arte de hoje das cabeças (só o rombo é arte nova); **S2** = a
> fusão nova; **S3** = os gestos. O roadmap: o item **S** do 🧭 do `docs/HANDOFF.md`.

## 0. O que está errado hoje (medido em 28/10)

- **A posição:** o posto é `STATION_X = 252` (de 384). O corpo das cabeças vai de ~182 a ~322 e o da fusão de 174 a
  330: a nave fica com a metade da esquerda.
- **O movimento:** cada forma só tem a animação de idle, e o corpo balança ±14 px no posto (`ONDULACAO`). Fora da
  investida, ela não sai do lugar.
- **A investida:** recua 0,6 s piscando (+34 px/s), avança a −380 px/s na MESMA altura até o centro do sprite chegar a
  x 150 (a ponta medida: o sprite em x 139, a cabeça em x 110), e volta a 180 px/s. Só as roscas (a metade de baixo,
  `ajustarCorpo`) ferem por contato: na ponta, a faixa y ~108–175 até x ~98. A nave luta na altura das cabeças, à
  esquerda: a investida passa longe. Ela existe na forma A (a cada 3,5 s), na B (a cada 5 s) e no ciclo da fusão; a C
  não tem.
- **A estrela:** o `flash` aditivo na escala 2,2 pulsando na cabeça viva (já fora da fusão desde a manhã de 28/10).
- **O acerto:** o círculo da `cabeca` tem 33 px de raio (15 × 2,2), maior que a cabeça desenhada (~16 px).
- **O cenário:** o casco rola a 84 px/s a luta inteira (`SCROLL_SPEED`, sem frenagem na F3). Ela não pode estar presa a
  nada: a base dela é escondida por 3 placas `derelict` tingidas de azul-escuro que viajam junto (e que não são a arte
  do casco). No treino (`[N]`), o `skipTo` descarta o `rabo` (o evento que revela o casco): a arena é espaço vazio.

## 1. A arena

1. **O rombo (arte nova).** Um rasgo largo (~130–150 px) no casco da PROA, na arte e nas cores dele (os dutos, o metal
   escuro com as luzes laranja), com as bordas viradas para fora, de onde ela sai. Duas camadas:
   - **o fundo do rombo** (o buraco escuro por dentro, atrás dela — depth abaixo de 30);
   - **o lábio da frente** (as chapas rasgadas na frente da base dela — depth acima de 30), que esconde as roscas como as
     placas escondem hoje.
   Nasce das peças aprovadas da proa (`casco-duto`, `casco-duto2`, `casco-placa`), por recorte e inpaint no PixelLab —
   nunca corte reto. **Antes de instalar: 3–4 conceitos numa folha, ele escolhe.**
2. **O casco para.** No evento `boss` (t=95), o rombo entra pela direita junto com o casco (a 84 px/s) e, a ~126 px do
   posto, o mundo FREIA até parar em ~3 s (a 28 px/s²), com o rombo parando no posto dela. A freada vale para tudo o que
   rola com o mundo na F3 (o `worldSpeed` de `parallax.update`, como a `frenagem` da F1). O mundo fica parado até o fim
   da luta.
3. **A entrada.** Ela não desliza mais da direita: com o casco parado, ela SOBE de dentro do rombo (o sprite nasce
   abaixo do lábio e sobe ao posto). Ela segue intocável enquanto entra (`entering`), como hoje.
4. **As placas `derelict` saem.** O lábio do rombo faz o papel delas.
5. **O treino (`[N]`) mostra a mesma arena.** O salto repõe o estado que o `rabo` teria deixado: o casco revelado, a
   régua do percurso já na PROA (a família `cascoDuto` — o `cascoDist` do jogo real em t=94), as peças da tela refeitas
   nessa família, a nebulosa em 0. A mesma regra do `aplicaCorredorEMoldura` (o treino recebe o estado que o roteiro
   deixaria, sem número cravado).

## 2. A posição e o movimento (as formas A, B e C)

- **Ela vive dentro do rombo**, no terço direito: o centro dela entre x ~280 e ~320 (o rombo a ~300). Os números
  fecham no filme.
- **Os postos:** três alturas — **baixa** (afundada: só as cabeças e o pescoço acima do lábio), **média** (a de hoje,
  BASE_Y 124) e **alta** (erguida: as roscas de cima à vista). Ela troca de posto entre os ataques, deslizando por
  dentro do rombo (x e y juntos, por velocidade, nunca tween — armadilha nº 2).
- **O ritmo:** ela SOBE (para o posto alto ou médio) antes de atacar e AFUNDA (para o baixo) para se recuperar depois
  da investida. A ondulação de ±14 px segue por cima de tudo, mais curta afundada.
- A cabeça viva nunca passa da faixa da barra do chefão (y ≥ 30) nem desce abaixo do lábio.

## 3. A investida (em toda forma)

As fases, numa máquina de estados (hoje `investida: 'nao' | 'telegrafo' | 'indo' | 'voltando'`, que ganha `'janela'`):

1. **O aviso (~0,7 s).** Ela leva a CABEÇA VIVA para a altura da nave (o sprite vai para `nave.y − cabeça.y × escala`,
   limitado à tela) e se ENCOLHE no rombo (recua alguns px, como hoje), piscando. As veias da cabeça viva aceleram
   (§5). **No último terço a altura TRAVA e ela fica BRANCA e parada** — é o sinal de sair da linha, e é isso que torna
   desviar possível. *(28/10, na implementação: a 1ª versão travava no fim e avançava no mesmo quadro — não havia
   instante para reagir.)*
2. **O avanço.** Ela sai inteira do rombo e atravessa a tela até a cabeça viva chegar à borda esquerda (x ~20), a
   ~420 px/s. **A frente dela fere** durante o avanço e a janela: o corpo de contato cresce para as cabeças, o pescoço e
   o alto das roscas — do topo até **45 px abaixo da cabeça viva** —, e volta às roscas quando ela está no rombo.
   *(28/10, na implementação: a silhueta inteira, 90% da altura, era uma parede de ~140 px; com a nave no alto da tela
   não havia fuga nem por cima nem por baixo. Medida pela cabeça, a fuga é ~40 px para cima ou ~50 para baixo, igual
   em toda forma.)*
3. **A janela (~1 s).** Da borda ela RECUA até a cabeça viva ficar em x ~140 — na frente da nave — e segura ali,
   esticada e quase parada (ondulação mínima). As veias pulsam rápido. É a melhor hora de bater. *(28/10, na
   implementação: parada na borda, a cabeça ficava ATRÁS da nave, que só atira para a direita: a janela não servia.)*
4. **A volta.** Ela recua ao rombo (~200 px/s) para um posto diferente do que saiu.

**Por forma** (a investida é o eixo; o resto pressiona em volta dela):

| forma | a investida | em volta |
|---|---|---|
| **A** (3 cabeças, ciano) | simples, a cada ~4 s | os tiros esparsos de hoje |
| **B** (2 cabeças, verde) | **dupla:** depois de uma janela curta (~0,5 s) ela RECUA (~240 px/s, para o avanço ter percurso), mira a altura da nave de novo, trava e avança outra vez. *(28/10: a 1ª ideia, a volta mirada, não passava pela nave — ela volta para a direita, e a nave fica à esquerda.)* | o leque em metrônomo de hoje |
| **C** (1 cabeça, laranja) | com **rajada na janela:** esticada, ela cospe uma rajada mirada de perto | o leque de 4 de hoje |
| **fusão** (a arte de hoje até o S2) | a mais rápida (aviso ~0,55 s, avanço ~500 px/s), no ciclo da fúria | o ciclo de hoje |

**Medido em 28/10** (`scripts/_serpente/_sonda-luta.mjs`, o treino, dois jogadores de sonda — o **parado**, na altura
da cabeça viva atirando, e o **que desvia**, que sai da linha quando ela trava e volta quando ela passou):

| | a luta | golpes da investida | tiros levados |
|---|---|---|---|
| hoje, parado | 24,9 s | 0 | 8 |
| hoje, desviando | 35,1 s | 0 | 17 |
| S1, parado | 39,7 s | 5 de 5 | 8 |
| S1, desviando | 41,4 s | 0 | 2 |

Hoje desviar só custava; agora ficar parado custa um golpe em cada investida e desviar funciona sempre.

O ponto de partida dos números (tempos, velocidades, cadências, os postos) e as contas da mira e do alvo da investida
ficam em `src/entities/numerosSerpente.ts`, puro (sem Phaser, testável em Node, como o `serpenteFusao.ts`), e se
fecham no filme com ele olhando.

## 4. O acerto do tamanho da cabeça

- O círculo da `cabeca` passa a ter o raio da cabeça desenhada: `RAIO_CABECA × escala da forma` (30 × 0,55 = 16,5 px
  nas cabeças; 30 × 0,63 = 18,9 px na fusão), em vez de 33. A `zona` das marcas já usa esse raio.
- O `bulletAbsorvedByBoss` (que deixa a bala perto da cabeça para a cabeça) usa o mesmo raio, em vez dos 22 px fixos.
- **A estrela sai de todas as formas:** a `cabeca` fica sempre invisível (a hitbox segue). O `semEstrela` da fusão fica
  sem uso e sai.

## 5. As veias acesas (a marca da cabeça viva)

- **O que acende:** os pixels de acento da PRÓPRIA cabeça viva — o ciano das costuras do crânio e do pescoço (A), o
  verde da boca e do pescoço (B), a lente e as luzes laranja (C). Medido em 28/10: a cor sozinha não separa as cabeças
  (as costuras ciano também correm pelo corpo e pela cabeça verde; o laranja da C é mais escuro que o `#ff9040`). A
  máscara de cada cabeça é **o matiz dela dentro da região da cabeça e do pescoço dela**, desenhada por forma.
- **Como:** um script assa, para cada forma e cada um dos 9 quadros, um PNG de sobreposição só com esses pixels (um tom
  mais claro da cor deles) — pixel exato, na arte (a regra do efeito assado em pixel). No jogo, um sprite por cima da
  serpente, no mesmo quadro da animação dela, em ADD, com o alpha batendo como um coração (tum-tum, pausa; ~1 por
  segundo; ~2,5 por segundo no aviso e na janela).
- **As outras apagam:** as veias das cabeças blindadas (as que não levam dano) ganham, do mesmo jeito, uma sobreposição
  escura (NORMAL) — a cabeça viva é a única acesa.
- **Antes de instalar:** a folha mostra as máscaras pintadas sobre os 9 quadros de cada forma.
- A fusão (uma cabeça só) não ganha veias no S1.

## 6. O acerto que sangra

- Tiro na cabeça viva: 2–4 pixels pequenos de carne e do fluido dela (as gotas orgânicas da fusão, com pouca velocidade
  e vida curta), no ponto do acerto, no lugar da faísca. Só para informar.
- Tiro na blindagem (o corpo absorvendo): a faísca de metal de hoje.

## 7. O que não muda

- A vida (50 + 50 + 50 + 60), a ordem das cabeças (ciano → verde → laranja), os padrões de tiro de hoje (o leque, a
  rajada, os tiros esparsos, o ciclo da fúria) fora do que o §3 acrescenta.
- A fusão de 28/10: as três mordidas (pescoço → queixo → crânio a 22/13/5%), o gore orgânico, a morte D1, a cena da
  fusão (que passa a acontecer dentro do rombo).
- Os outros chefões e fases: a freada do mundo é só da F3 na luta.

## 8. As provas e a folha

- **Testes em Node** (no arquivo puro dos números): a cabeça viva mirada fica dentro da tela em toda altura de nave; a
  investida leva a cabeça à borda esquerda em toda forma; os postos ficam dentro do rombo e acima da barra.
- **A sonda** (`scripts/_inimigos/`): a arena (o casco para, o rombo no posto, ela sobe dele; o treino com o mesmo casco
  na família da proa); a cabeça alcançável por BALA REAL em cada forma, com o círculo novo (a lição da
  `probe-stage3`); a estrela nunca visível; as veias no quadro certo da animação.
- **A dificuldade, medida antes e depois:** dois jogadores de sonda na luta inteira — o **parado** (fica à esquerda, na
  altura da cabeça, atirando) e o **que desvia** (sai da altura travada durante o aviso). Hoje o parado não leva golpe
  da investida; depois, ele leva, e o que desvia não. Mais o tempo da luta de cada um.
- **O que não muda:** `_sonda-chefes`, `_sonda-serpente-fusao` (as mordidas da fusão no lugar), `test-morte`,
  `probe-stage3`.
- **A folha** `folhas/2026-10-28/serpente-luta/`: os conceitos do rombo (antes de tudo); as máscaras das veias; o
  filme da luta inteira em velocidade real, ampliado, com a fase de verdade chegando ao chefão e o treino lado a lado.

## 9. Fora do S1

- **S2 — a fusão nova:** a arte (a união das três, a partir da de hoje, corpo inteiro com cauda), nadando solta pela
  metade direita, o bote atravessando a tela, a cena da fusão arrancando-a do rombo, e os pontos das mordidas medidos de
  novo na arte nova.
- **S3 — os gestos** das formas A, B e C no PixelLab (recuar no aviso da investida, cuspir antes do leque e da rajada),
  encaixados nos estados do §3.
