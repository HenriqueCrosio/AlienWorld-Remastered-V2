# S2 — a serpente grande: a ENGUIA COLOSSAL — design

> 03/11/2026, a fase 2 da luta da Serpente (o START `plans/2026-11-03-serpente-grande-START.md`). Decidido com ele,
> pergunta a pergunta, antes de qualquer arte. A de 3 cabeças está FECHADA e não muda.
>
> As escolhas dele, na ordem em que vieram:
> - **a arte:** *outra criatura* — não a fusão de hoje (a cabeça-crânio enrolada); herda só o material e as cores;
> - **a criatura:** a **enguia colossal**, maior que a tela; e: *"a enguia precisa ser uma enguia dark sci-fi bio
>   mecânica bem desenhada"*;
> - **o movimento:** **passagens + pausas** (ela atravessa a arena em passagens avisadas; entre elas, para e ataca);
> - **o motor:** **ondulação + jatos** (o corpo ondula em S, respiros soltam jato nas curvas e arrancadas);
> - **a técnica:** **cabeça animada no PixelLab + corpo em anéis** recortados de uma enguia inteira aprovada;
> - **a chegada:** **a fusão de hoje + a 1ª passagem** (o rombo vira a TOCA dela);
> - **as habilidades:** **novas**, no desenho DELE:
>   > *"Logo depois que ela sai do buraco e o jogador vê o tamanho dela, a enguia gigante aparece com a cabeça no canto
>   > superior direito e uma parte do seu corpo no canto lateral direito até sumir da tela embaixo, por que? Pois no
>   > corpo dela vai sair pequenos canos que vão incendiar violentamente faixas da tela: as faixas serão divididas
>   > horizontalmente, cada skill dessa, uma faixa ficará livre: Ela dará uma salva de 3. A primeira terá mais tempo de
>   > ir para a faixa que não vai queimar, a segunda mais rápido e a terceira será mais rápida. A faixa que não queima
>   > ficará com uma cor mais branco azulada e as que vão queimar com um tom de vermelho aviso. Essa vai ser a hora do
>   > player dar dano nela também. Depois de acabar, ela vai cruzar a tela do canto superior direito onde está, até o
>   > meio e desaparecer para baixo. Ela vai aparecer no buraco, e vai ficar alta com a cabeça quase na borda de cima da
>   > tela, aqui você vai usar uma skill inteligente. Depois da segunda skill, ela vai voltar para o buraco e andar por
>   > baixo do casco [...], mas ela não vai aparecer, o efeito dela andar no casco vai fazer com que pequenos 'geisers'
>   > de veneno se ergam do casco, vai ter um aviso onde vai surgir, mas vai ser rápido."*
> - **a coerência dos caminhos** (ele): *"ela só consegue entrar para baixo do casco se ela estiver no buraco [...] ela
>   precisa sair do canto superior direito e cair direto no buraco, fica mais realista e visualmente atrativo"*;
> - **a ordem:** **fixa, a dele**; **4 faixas** de 54 px; a faixa livre por **sorteio com regra**; a minha habilidade
>   = **o Eco**; os gêiseres = **colunas que atravessam a crista**; o dano = **o corpo inteiro, a cabeça vale mais**; as
>   mordidas = **anéis da cauda + crânio**; a morte = **no rombo**, e (ele): *"ela precisa estar no buraco na hora da
>   morte, se ela tiver na skill do cano e morrer não vai ficar bom. Então ela já precisa estar no buraco com pouca
>   vida"* → a reta final (§6.4);
> - **o caminho de trabalho:** **o movimento em blocos primeiro**, depois a arte (§7).
>
> Os fatos que valem desde 02–03/11 (confirmados por ele): **a investida saiu de vez** (não propor de novo); **o casco
> não é chão** (a nave voa sobre ele até a borda de baixo; nada "bate no chão do casco"; o ataque que pune quem se
> esconde sob a crista ATRAVESSA a crista).

## 0. O que muda e o que fica

**Muda:** a forma `fusao` da luta. A arte de hoje (`serpente-fusao-anim`, a cabeça-crânio enrolada, 9 quadros) e o
`atacarFusao` (o leque, a rajada, o silêncio) SAEM da luta — a arte fica no disco e no git (não apagar sem pedido dele).
As três mordidas de hoje (`MORDIDAS_FUSAO`, pescoço → queixo → crânio) dão lugar às do §6.2.

**Fica:** a de 3 cabeças inteira (A, B, C, as habilidades, os números); a cena da fusão até a implosão (§2.1); o rombo
e o casco vivo da arena (`cascoVivo.ts`: a lombada, a fissura R3, o rasgo que se regenera); o dano pelo desenho de 03/11
(`acertoNoCorpo`, o `tirosNoCorpo` da cena) e o `cabecaVale` 1,5; o motor dos destroços (`docs/DESTROCOS.md`).

## 1. A criatura e a técnica

### 1.1 A enguia
- **Dark sci-fi biomecânica, bem desenhada** (o pedido dele). Casco preto-oleoso de placas sobrepostas — o mesmo
  material da de 3 cabeças —, e luz só onde há energia: veias, respiros e canos acesos nas três cores das que se
  fundiram (azul, verde, laranja) (`correcao-rumo-dark-sci-fi`).
- **De PERFIL**, como o jogo. Toda vista de cima que o PixelLab der é descartada antes de mostrar
  (`pixellab-naves-saem-vista-de-cima`).
- **Maior que a tela.** Ponto de partida: ~16–20 anéis de ~30 px e uma cabeça de ~60–70 px; a maquete (§7.1) mede.

### 1.2 A cabeça e o pescoço — animados no PixelLab
A identidade dela mora aqui (`criatura-inteira-vistas-animacao`): a cabeça nasce da enguia inteira aprovada e é animada
no PixelLab — nadar/olhar (o idle), girar seguindo a nave (o Eco), abrir a boca e cuspir (o Eco), carregar os canos
(os canos), a mordida no crânio, a morte presa no rombo. As regras do PixMiniMax valem (`pixminimax-animacao`): o gesto
no lugar da arte escolhida, as cores das luzes ditas no pedido, as duas pontas fixas, clipe que escurece é descarte.

### 1.3 O corpo — anéis que seguem a cabeça
- Os anéis são RECORTADOS da enguia inteira aprovada (`partir-da-arte-aprovada`), não peças genéricas: a qualidade da
  arte vale para o corpo todo.
- Cada anel segue o CAMINHO da cabeça (o rastro dela), ondulando em S no plano da tela. As placas se sobrepõem e
  escondem as juntas.
- **Os jatos:** respiros nos anéis soltam jato nas curvas e nas arrancadas, na cor da luz do anel — a causa visível da
  curva no vácuo (`fisica-do-lugar-nos-ataques`).
- **A luz por normais:** os anéis giram com o caminho → mapa de normais em cada um; o lado que vem acende
  (`jogo-de-luz-por-normais`).
- **As peças especiais:** o anel com canos (dois estados: fechado e aberto), a cauda, o toco (depois das mordidas).
- **O contato:** o corpo está no plano da nave; encostar fere (a caixa do toque, como hoje). Nas passagens, o corpo é o
  obstáculo.

## 2. A chegada e o ciclo

### 2.1 A chegada
1. A cena da fusão de hoje até a implosão: a de 3 cabeças afunda no rombo, o silêncio, as três luzes convergem, implode,
   o lábio estoura (a S1b §4).
2. A enguia irrompe do rombo (x 300) de boca aberta.
3. **A 1ª passagem:** um arco longo sobre a arena, para mostrar o tamanho dela; a cauda sai do rombo por último.
4. Ela vai ao posto dos canos (§2.2, o lugar 1) e a luta começa.

### 2.2 Os três lugares e os caminhos (a ordem fixa)
Todo acesso a baixo do casco é pelo rombo. O ciclo:

| # | lugar / caminho | o que ela faz |
|---|---|---|
| 1 | **posto dos canos** (borda direita) | a cabeça no canto superior direito (~x 340, y 30), o corpo descendo a borda direita (~x 355–370) e saindo pela BORDA DE BAIXO da tela; os canos de fogo (§3) |
| 2 | **o mergulho** | do canto superior direito ela cruza até o meio da tela e cai DIRETO no rombo; o corpo inteiro passa atrás da cabeça, a cauda entra por último — o corpo varrendo a tela é o obstáculo |
| 3 | **erguida no rombo** | sobe do rombo alta, a cabeça quase na borda de cima (~y 30), o corpo em coluna da crista ao topo; o Eco (§4) |
| 4 | **sob o casco** | afunda no rombo e anda por baixo do casco sem aparecer; os gêiseres (§5) |
| 5 | **a volta ao posto** | sai do rombo, faz a curva, sai pela borda de baixo à direita e SOBE de volta pela borda direita até o posto (1) |

Por que o corpo sai pela borda de baixo no posto (e não fica enfiado no rombo): para a CAUDA aparecer — toda vez que
ela mergulha ou sai do rombo, a cauda passa à vista, e as mordidas dela (§6.2) se veem. O que entra e sai da tela usa a
BORDA (`superficie-da-camada-do-jogo`).

## 3. Os canos de fogo (a habilidade DELE)

- **As faixas:** 4, de 54 px: 0–54, 54–108, 108–162, 162–216. A de baixo inclui a crista (151) e o esconderijo sob ela
  (`casco-nao-e-chao`).
- **Os canos:** um grupo por faixa no corpo dela, que se ABREM dos anéis (o estado aberto, §1.3) apontando para a
  esquerda.
- **Uma salva:**
  - **o aviso:** a faixa livre fica **branco-azulada**; as outras, **vermelho de aviso**; os canos dessas faixas
    carregam (brilho, fagulhas) e a cabeça faz o gesto de carga;
  - **o fogo:** jatos de plasma incendiário cruzam a tela inteira da direita para a esquerda — "violentamente": uma
    frente rápida (~0,15 s), a queima (~0,6 s), e se desfazem em brasa e fumaça. Só o fogo desenhado fere. No vácuo, o
    jato é EJETADO pelo cano e segue reto (nada cai).
- **A salva de 3** (os tempos de partida; a maquete calibra): aviso **1,6 / 1,1 / 0,7 s**; queima 0,6 s; ~0,4 s entre as
  salvas.
- **A faixa livre** (sorteio com regra): nunca é a da nave; na 1ª, qualquer outra; na 2ª, a até 2 faixas da nave; na
  3ª, a vizinha. (A nave cruza 3 faixas em ~1,1–1,5 s: a regra garante tempo para quem reage.)
- **A janela de dano:** ela fica parada; o corpo ocupa a borda inteira, então de qualquer faixa o tiro acerta o corpo, e
  mirar na cabeça no canto vale 1,5×.

## 4. O Eco (a habilidade inteligente)

- **O posto:** erguida no rombo (§2.2, o lugar 3).
- **A leitura (~2 s):** a cabeça gira seguindo a nave (os gestos do PixelLab); atrás da nave, um RASTRO fraco na cor do
  olho dela marca os últimos ~2 s do caminho da nave.
- **O cuspe:** ~5 sementes de plasma saem da boca, voam RETAS até pontos do rastro (espaçados ao longo dele) e se cravam
  no lugar, pulsando.
- **A detonação:** na ORDEM em que a nave passou (do mais antigo ao mais recente), ~0,25 s uma da outra, raio ~15 px.
- **Por que é inteligente:** quem repete o próprio caminho é pego pela cadeia; quem fica PARADO encolhe o rastro num
  montinho, e todas as sementes caem em volta da nave. A esquiva é sair do próprio rastro.
- **Justa:** o ponto mais recente tem ≥ 0,4 s quando ela cospe; toda semente fica à vista ≥ 0,6 s antes de explodir.
- **Duas rodadas** por Eco, para começar.
- **O dano:** ela fica exposta (o corpo em coluna, a cabeça perto do topo).

## 5. Os gêiseres (a transição)

- **O caminho:** ela afunda no rombo; a **lombada** do casco vivo (a R3 aprovada: lombada + fissura escura) corre por
  baixo do casco, do rombo até perto da borda esquerda, e volta.
- **Um gêiser** a cada ~60 px do caminho:
  - **o aviso rápido (~0,45 s):** a fissura acende em verde, um sopro de névoa, as placas se erguem 1 px;
  - **a coluna (~0,5 s):** ~16 px de largura, do pé da tela até ~y 70, ATRAVESSANDO a crista (o veneno jorra também
    pelas fissuras da face do casco) — quem se esconde sob a crista é pego;
  - **o fim:** vapor verde que se expande e some (nada cai).
- ~6–8 gêiseres entre a ida e a volta; os da volta caem ENTRE os da ida (os pontos seguros mudam).
- **A esquiva:** para o lado. Ela não leva dano aqui (escondida).

## 6. O dano, as mordidas e a morte

### 6.1 O dano
- Tudo o que está desenhado e à vista leva dano — o acerto pelo desenho de 03/11, agora anel por anel e na cabeça; a
  cabeça vale 1,5× (`LUTA.cabecaVale`). Sob o casco, nada.
- **A vida:** um ciclo dura ~27 s; o alvo de partida é ela morrer em **2–3 voltas** (~60–80 s). Calibrar com ele jogando
  (a vida das formas de 03/11 é provisória e foi ajustada com o bug dos tiros que acertavam sozinhos, corrigido em 03/11).

### 6.2 As mordidas
(As porcentagens são da vida DELA, a enguia — não da luta inteira.)
- **22% e 13%:** um trecho da CAUDA (~3 anéis) estoura nos próprios pixels (o motor dos destroços); ela fica mais curta, e
  o toco solta jato.
- **5%:** o CRÂNIO é mordido — e é o sinal da reta final (§6.4).
- Se a cauda estiver fora da tela na hora da mordida, o estouro ESPERA ela aparecer (o próximo mergulho sempre a mostra).

### 6.3 A morte no rombo
Com a vida zerada (só erguida no rombo, §6.4), ela tenta afundar na toca: o corpo entra, mas a cabeça fica PRESA na boca
do rombo; a cabeça se desfaz no lugar (o motor dos destroços) e o rombo se FECHA sobre o resto (o casco se regenera, como
o rasgo da S1b). Depois, a vitória.

### 6.4 A reta final (ela só morre no rombo)
- **A partir de 5%** (com a mordida do crânio), ela abandona o que está fazendo e vai para a toca pelo caminho:
  - **nos canos:** o fogo apaga e ela mergulha (o caminho 2);
  - **no mergulho:** segue;
  - **erguida no rombo:** já está lá;
  - **na volta ao posto:** dá meia-volta para o rombo;
  - **sob o casco:** não acontece (ali ela não leva dano).
- Ela SOBE erguida no rombo para **um último Eco**, mais rápido (a maquete calibra quanto).
- **Fora do rombo, a vida não passa de 1:** os tiros seguem marcando os pixels (os destroços), mas não matam. Erguida no
  rombo, a vida desce até 0 e vem a morte (§6.3).

## 7. A ordem de trabalho e as provas

### 7.1 A maquete em blocos (PRIMEIRO)
A luta inteira com a SILHUETA (anéis cinzas, cabeça simples) sobre a foto da arena (`_arena-foto.mjs`), em vídeo na
velocidade real, no molde da `_habilidades-maquete.mjs`: a chegada, os cinco caminhos, os canos, o Eco, os gêiseres, a
reta final e a morte no rombo. Medido: as folgas de cada esquiva, os tempos, o contato do corpo nas passagens, e dois
jogadores de sonda (parado × desviando) — quem desvia escapa de tudo, quem fica parado é pego. Ele aprova o MOVIMENTO e
as habilidades por vídeo antes de qualquer arte (`forma-antes-do-detalhe`, `avaliar-skill-por-gif`).

### 7.2 A arte
3–4 conceitos da enguia INTEIRA, de perfil, dark sci-fi biomecânica, numa folha, conferidos AMPLIADOS antes de mostrar
(`conferir-ampliado-antes-de-mostrar`, `gerar-arte-direto-e-mostrar`). Da aprovada: os anéis recortados + os mapas de
normais; a cabeça e os gestos no PixelLab. O PixelLab recusa "gore/flesh/blood": descrever a matéria.

### 7.3 Os efeitos
O fogo dos canos, o rastro e as sementes do Eco, os gêiseres e o vapor, os jatos — assados em pixel na resolução nativa
(`efeito-de-cena-assado-em-pixel`), na camada de pixels de hoje (`camadaPixels.ts`).

### 7.4 A instalação
No jogo, com a maquete como ORÁCULO do porte (`_oraculo.mjs`); as sondas (`_sonda-hab.mjs`, `_sonda-luta.mjs`); o atalho
de dev `?serpente=fusao` abre direto nela. Um módulo por habilidade em `src/entities/serpente/`, os números num arquivo
próprio. O plano detalha.

### 7.5 Fora
O som (só depois do balanceamento do jogo inteiro). O cenário da arena (o próximo item dele, depois desta luta).

## 8. Riscos
- **As juntas dos anéis** podem ler como "peças coladas": a sobreposição das placas, a luz por normais e o jato nas
  curvas existem por isso; a maquete em blocos já mostra o ritmo da ondulação antes da arte.
- **O PixelLab de perfil:** tende a dar vista de cima — referência lateral e descarte antes de mostrar.
- **O desempenho:** o acerto pelo desenho anel por anel (16–20 máscaras) a cada quadro; medir na instalação (o p95 ≤ 4 ms
  da Tarefa 14 de 02/11).
- **O corpo saindo pela borda de baixo** passa NA FRENTE da pintura do casco (o plano da nave): conferir na maquete que
  isso lê como "vindo de baixo da tela", não "saindo do casco".
