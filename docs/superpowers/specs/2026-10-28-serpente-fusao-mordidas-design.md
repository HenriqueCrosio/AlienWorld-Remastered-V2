# A fusão da Serpente: pescoço, queixo, crânio — design

> 28/10/2026, no retorno dele jogando. Ele: *"na serpente, existe uma estrela que fica em cada cabeça e, na serpente
> grande da segunda fase dela, a estrela fica e quando o pedaço da cabeça sai, a estrela fica no meio disso tudo,
> causando um efeito estranho e mal acabado."* E: *"Os pedaços que saem da serpente fundida podem ser mais orgânicos,
> do ponto de vista gore, o pedaço da cabeça saindo é ótimo, mas numa luta isso já deixaria qualquer inimigo muito
> fraco, o que pode sair é outro tipo de pedaço: Queixo, pedaço do pescoço e, ai sim, aquele pedaço da cabeça."*
>
> As escolhas dele (28/10): três mordidas na fusão, na ordem **pescoço → queixo → crânio**; o gore é **carne e fluido
> misturados, sem fogo**; a estrela **sai só da fusão**; o encaixe é o **A** (a Serpente diz onde morder, o motor dos
> destroços segue sendo o único caminho da mordida).
>
> Folha: `folhas/2026-10-28/serpente/serpente.html`. A técnica dos destroços: `docs/DESTROCOS.md` (§14, §15, §16).

## 0. O que estava errado (medido)

- **A estrela** é o `flash` aditivo da cabeça vulnerável (`BossSerpente.cabeca`, escala 2,2, alpha pulsando 0,06–0,34):
  o aviso de qual cabeça leva dano. Ele mora num ponto fixo da arte (`fase.cabeca`).
- **Na fusão, as duas mordidas do chefão** (os limiares da classe, 15% e 6% da vida total; a fusão começa em 28,6%)
  miram esse mesmo ponto: as duas arrancam o alto do crânio, e a estrela segue pulsando no buraco. A sonda de 28/10
  (o treino da F3, tiros de verdade) pegou as duas a 14,4% e 5,8%, com a estrela por cima do vazio.
- Nas formas de 3, 2 e 1 cabeça não há mordida nenhuma (os limiares caem todos na fusão), e a estrela lá está certa.

## 1. A estrela

- **Some na fusão:** a fase da fusão declara que não tem estrela, e o `vestirFase` a esconde. A troca acontece atrás
  do preto cheio da cena da fusão, então ninguém vê a estrela sumir.
- **A hitbox fica:** a `cabeca` segue ativa e com o mesmo círculo (escondida, ela continua colidindo). O alvo das
  marcas (`zona`) também fica igual.
- **Nas formas de 3, 2 e 1 cabeça, nada muda:** lá a estrela diz qual das cabeças leva dano.

## 2. Os três pedaços

**Quando:** a Serpente ganha limiares próprios, que substituem os da classe só para ela: **22%, 13% e 5%** da vida
total. Os três caem na fusão, mais ou menos um a cada terço dela (a 23%, 55% e 82% da vida da fusão).

**Onde:** a fusão declara três pontos, em px da arte a partir do centro do sprite (como os da `cabeca` e da `boca`), e
cada mordida mira o seu, na ordem:

| | ponto | onde a mordida começa (medido nos 9 quadros da `serpente-fusao-anim`) |
|---|---|---|
| 1. pescoço | (−18, −2) | a frente do pescoço, o lado direito do vão abaixo da mandíbula: (−19…−16, −3…+2) |
| 2. queixo | (−54, 2) | o fundo da mandíbula, (−53, 0…4); nos quadros em que a boca abre mais, a frente dela, (−61…−57, −10…−3) |
| 3. crânio | (−52, −75,6) | o mesmo ponto de hoje, que puxa a mordida para a testa no alto à esquerda, (−74…−66, −95…−88): o pedaço que ele aprovou |

A mordida começa num dos 6 pixels de borda mais próximos do ponto (`lasca`); o ponto só escolhe a borda. A folha
mostra os três pontos marcados na arte antes do filme.

**O tamanho:** o de hoje (o teto do chefão, 240 px por mordida).

## 3. O gore (só nestas três mordidas)

Um estilo de mordida novo, **orgânico**, que o `CHEFOES` da Serpente declara. Os outros chefões não mudam.

- **Sem fogo, sem faísca de metal, sem fumaça:** saem o `estouro` (a bola de fogo pequena), as faíscas de metal e o fumo
  da ferida. O tremor de câmera fica o da carne (curto).
- **O rasgo mais irregular:** o `torto` da mordida passa de 1,4 para cerca de 3, para a borda sair rasgada e não
  redonda. O número fecha no filme.
- **O jato:** no rasgo, um jato de gotas misturadas, metade da carne (`RAMPA_CARNE`, vermelho-escuro quase preto) e
  metade de um **fluido** novo (`RAMPA_FLUIDO`: escuro, oleoso, com reflexo laranja, as cores das costuras dela).
- **O pedaço pinga enquanto gira:** cada pedaço que voa solta gotas dos dois fluidos durante a vida dele.
- **A ferida pinga até a morte:** os dois fluidos, sem fumaça, no ritmo da ferida do chefão (`ferida`).
- **A borda do buraco** segue a regra de 27/10 (os chefões de carne não guardam vermelho: ela escurece na cor do bicho).

## 4. Como se encaixa (o A)

- **`BossSerpente`:** a fusão ganha `mordidas` (os três pontos) e `semEstrela`. O `destrocos` devolve como `mira` a
  lista dos três pontos em px de mundo (centro do sprite + ponto × escala, como o `posCabeca`) quando a fase os
  declara; nas outras formas devolve a cabeça viva, como hoje. O comentário dos "seis limiares" sai (está velho).
  Os três pontos moram em `src/entities/serpenteFusao.ts` (`MORDIDAS_FUSAO`), sem Phaser: o teste em Node os lê.
- **`numerosDestrocos`:** o `CHEFOES.serpente` ganha `limiares: [0.22, 0.13, 0.05]` e `mordida: 'organica'`; os números
  do estilo ficam num bloco próprio (`DESTROCOS.organica`). A `RAMPA_FLUIDO` fica em `pedacos.ts`, ao lado da
  `RAMPA_CARNE`.
- **`Destrocos`:** o `vigiar` aceita `limiares` (no lugar dos da classe) e `estilo`. O `morder` com o estilo orgânico
  troca o `torto`, tira o estouro e as faíscas, e solta o jato misturado. Os pedaços ganham o pingo, e a cicatriz guarda
  o estilo, para a ferida pingar sem fumo. A lista de miras segue a vez de hoje (a 1ª mordida = o 1º ponto); como
  nenhuma mordida cai antes da fusão, a vez começa nela.
- **`GameScene.atualizarDestrocos`:** passa `limiares` e `estilo` do `CHEFOES`.

## 5. O que não muda (e a prova)

- As formas de 3, 2 e 1 cabeça, com a estrela, a hitbox e as marcas. **Prova:** os recortes da sonda nessas formas,
  com a mesma semente, idênticos pixel a pixel antes e depois.
- A morte final (a D1), as marcas de tiro e a cena da fusão.
- Os outros chefões (a Capitânia, a Torre, o Guardião, o Predador) e o golfinho: os limiares da classe e o estilo de
  hoje. **Prova:** os testes, e a `_sonda-chefes` antes e depois.

## 6. Os testes e a folha

- **`scripts/test-morte.mjs`** (Node, nas artes de verdade):
  - a `RAMPA_FLUIDO` sobe do escuro ao claro;
  - os limiares da Serpente são três, decrescentes, e todos abaixo do começo da fusão (60/210);
  - em cada um dos 9 quadros da fusão, a `lasca` mirada em cada ponto morde exatamente o alvo, numa peça só, com o
    centro na parte certa (o pescoço à direita do vão, o queixo no fundo ou na frente da mandíbula, o crânio no alto à
    esquerda);
  - com o `torto` do estilo orgânico, a mordida segue com o alvo exato e numa peça só.
- **A sonda** (a de 28/10, levada para `scripts/_inimigos/_sonda-serpente-fusao.mjs`): no jogo, as três mordidas caem
  na fusão, na ordem, cada uma perto do seu ponto; a estrela some na fusão e fica nas outras formas; nenhuma folha de
  explosão nasce nessas mordidas. ⚠️ Para a prova pixel a pixel, a sonda (e o filme) começam DETERMINÍSTICOS: a sorte
  fixa (a nossa e a do Phaser, `Phaser.Math.RND`, que o parallax usa para as tintas das camadas) e o relógio a passos
  ANTES de a fase começar. A 1ª versão deixava o jogo correr 800 ms de tempo real antes, e duas rodadas do mesmo código
  saíam um passo defasadas.
- **A folha** `folhas/2026-10-28/serpente/serpente.html`: os três pontos na arte, e o filme da fusão em velocidade
  real, ampliado, com o antes (gravado antes de mexer, com o `_filmar-destrocos serpente`) e o depois lado a lado. Ele
  julga olhando, e o `torto` e a quantidade de gotas fecham ali.
