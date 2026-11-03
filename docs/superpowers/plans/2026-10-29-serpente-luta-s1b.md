# S1b — a Serpente vive no casco — plano de implementação

> Spec: `docs/superpowers/specs/2026-10-29-serpente-luta-s1b-design.md`. Conceitos aprovados (29/10): o gesto ERGUER,
> a rachadura R3, a cabeça laranja com mandíbula, e O CORTE (só pescoços e cabeças saem do casco).

**Objetivo:** trocar o movimento da S1 (o desenho inteiro deslizando) por uma Serpente que vive no casco:
- a chegada que estoura o casco;
- a investida por baixo dele (rachadura, trava, bote no rasgo, janela, cura);
- a morte da de 3 cabeças voltando ao rombo, e a maior surgindo dele.

**Arquitetura:**
- **O caminho é código:** a máquina de estados do `BossSerpente`.
- **O corpo é animação:** o gesto ERGUER do PixMiniMax, instalado por quadro.
- **O mundo reage numa camada de pixels do próprio casco** (`cascoVivo.ts`):
  - uma cópia da faixa, logo acima dela, onde a lombada, a fissura, a trava, o rasgo e a cura são desenhados pixel a pixel;
  - uma máscara que recorta a Serpente na crista;
  - um degradê que a afunda no escuro dentro dos buracos.
- **Os estouros são o motor de destroços** (`Destrocos.morrer`), aplicado a sprites temporários feitos com os pixels do casco que saem.

**Restrições:**
- Commit só quando ele pedir, autoria só dele.
- Não editar `src/` nem `.html` durante filmagem.
- Edição de arquivo com CRLF por Edit ou python que preserve a quebra de linha.
- Conversa em pt-br; código, comentários e raciocínio em inglês.

## Os arquivos

| Arquivo | O quê |
| --- | --- |
| `scripts/_serpente/_erguer-instalar.mjs` (novo) | os quadros do erguer (A, B, C) → `public/sprites/serpente-erguer-<F>-<i>.png` (256², a arte no mesmo lugar do quadro 0); a CABEÇA VIVA rastreada quadro a quadro → `src/entities/gestoSerpente.ts`; as veias e a sombra de cada quadro (o matiz da cabeça viva perto dela; o das outras acima do corte) → `serpente-veias-erguer-<F>-<i>.png` / `serpente-sombra-erguer-<F>-<i>.png`; a faixa inteira → `serpente-rombo-inteiro.png`; uma folha de conferência |
| `src/entities/gestoSerpente.ts` (gerado) | por forma: o nº de quadros, a origem da arte no quadro de 256², a cabeça viva por quadro (px de arte, do centro da arte) |
| `src/entities/numerosSerpente.ts` | `LUTA` nova: `crista`, `corte` por forma, os postos só de altura, a investida por baixo (`mergulho`, `rachadura`, `segue`, `trava`, `bote`, `janela`, `afunda`, `volta`, `cura`, `bordaX`), o rasgo; funções puras: `postoY`, `alturaDoBote`, `xDoBote`, `doRombo`, `rasgoDe` |
| `scripts/test-serpente.mjs` | as contas novas |
| `src/entities/cascoVivo.ts` (novo) | a camada viva do casco (ver Arquitetura); `pecas` = as imagens da faixa (a cópia sai delas); API: `copiar()`, `lombada(x)`, `rachar(de, ate)`, `travar(x)`, `romper(cx) → Sprite` (os pixels que saem, para os destroços), `curar()`, `buracos` (rombo + rasgo) para a máscara e o degradê, `update(dt)`, `destroy()` |
| `src/Parallax.ts` | `pecasDoCasco()`: as imagens da camada do casco (para a cópia) |
| `src/entities/BossSerpente.ts` | a máquina nova; a máscara do corte; os postos de altura; o gesto (anim + origem + cabeça por quadro + veias); o corpo por modo (repouso / coluna / cabeça / nada); a chegada que estoura; a morte da C que afunda e a fusão por baixo |
| `src/scenes/BootScene.ts` | carrega os quadros do erguer, as veias/sombra deles, a faixa inteira; registra `serpente-erguer-<F>` |
| `src/scenes/GameScene.ts` | insere a faixa INTEIRA; passa ao chefão o estouro (`destrocos.morrer`) e as peças do casco |
| `scripts/_serpente/_sonda-luta.mjs` | os jogadores de sonda na luta nova (o parado; o que desvia para o LADO na trava) |
| `scripts/probe-stage3.mjs`, `_sonda-serpente-fusao.mjs`, `_sonda-chefes.mjs` | ajustados ao que mudou (a fusão por baixo) |

## As tarefas

### 1. A arte instalada (o erguer, as cabeças por quadro, as veias, a faixa inteira)
- [x] `_erguer-instalar.mjs`:
  - copia os 17 quadros de cada forma para `public/sprites`;
  - rastreia a cabeça viva por correlação de bloco, quadro a quadro, a partir do offset medido (`FASES.cabeca`);
  - assa as veias e a sombra;
  - copia a base do `_rombo-base.mjs` como `serpente-rombo-inteiro.png`;
  - escreve o `gestoSerpente.ts`;
  - faz a folha de conferência com a cabeça marcada em cada quadro.
- [x] Conferir a folha AMPLIADA: a cabeça marcada em todos os quadros, as veias só na cabeça viva.
- [x] `BootScene`: carregar e registrar (`serpente-erguer-A/B/C`, 12 quadros/s, sem repetir).

### 2. Os números e as contas puras
- [x] `LUTA` nova e as funções; `test-serpente.mjs` cobrindo:
  - os postos com o corte na crista ou abaixo;
  - a altura do bote, limitada pelo corte;
  - o x do bote, com a cabeça viva no x travado e o limite da borda;
  - o rombo-ou-rachadura;
  - o rasgo do tamanho das roscas.
- [x] `node scripts/test-serpente.mjs` → tudo ok.

### 3. O casco vivo
- [x] `cascoVivo.ts`:
  - a cópia da faixa (das imagens do casco, com espelho e origem);
  - a lombada (as colunas sobem e enfraquecem com a fundura, como no conceito);
  - a fissura R3 com os ramos;
  - a ponta branca pulsando;
  - o rasgo, com o interior do rombo, a borda escura e as placas dobradas;
  - a cura de fora para dentro com ruído e o aro escuro;
  - o degradê dos buracos na frente dela;
  - a máscara do corte.
- [x] `Parallax.pecasDoCasco()`.

### 4. A Serpente nova
- [x] Os estados: `nao`, `mergulho`, `rachadura`, `segue`, `trava`, `bote`, `janela`, `afunda`, `volta` e `emerge`. A B volta ao `mergulho` do rasgo; a C cospe na janela.
- [x] O corte: a máscara na crista mais os buracos, aplicada a ela, às veias e à sombra.
- [x] O gesto:
  - toca `serpente-erguer-<F>` no bote;
  - a origem da arte no quadro de 256²;
  - a cabeça viva pelo quadro do gesto;
  - as veias do gesto;
  - volta ao idle quando afunda.
- [x] O corpo por modo:
  - **nada** (escondida): o corpo e a cabeça desligados;
  - **coluna** (subindo): a coluna da cabeça até o pé da tela;
  - **cabeça** (janela): uma caixa na cabeça;
  - **repouso** (no rombo): do pescoço visível até o corte, abaixo da linha da cabeça viva.
- [x] A chegada: a faixa inteira para; o casco treme (lombada e pó); estoura (os destroços); vira o rombo; o lábio aparece; ela sobe.
- [x] A morte da C: a cadeia de hoje, depois ela afunda no rombo e fica o silêncio. As três luzes convergem no buraco, um clarão por dentro, o lábio estoura e a fusão sobe, sem véu.

### 5. A cena
- [x] `GameScene`: a faixa inteira, `destrocos.morrer` como o estouro, `pecasDoCasco`.
- [x] `npx tsc --noEmit` limpo.

### 6. As provas e a folha
- [x] A sonda da luta (o parado leva o bote; o que desvia não leva) e o tempo de luta.
- [x] As sondas de sempre: `probe-stage3`, `_sonda-serpente-fusao`, `_sonda-chefes`, `test-morte`.
- [x] Os filmes: a chegada; a investida A, B e C; a morte da C com a fusão surgindo.
- [x] Conferir ampliado antes de mostrar.
- [x] A folha `folhas/2026-10-29/serpente-casco/luta.html`, o HANDOFF e a memória.

## Desvios (29/10, na implementação)

- **Pedidos dele no meio:** a CHUVA TRIPLA (o ataque em conjunto das cabeças vivas) e UMA COR POR CABEÇA:
  - a gota azul (`shotVenenoAzul`, um azul fundo, porque o ciano é o tiro da nave) e a âmbar (`shotVenenoAmbar`), no mesmo quadro 13×9;
  - cada tiro sai da BOCA de quem atira (as bocas medidas, `gestoSerpente.ts`).

  A spec ganhou o §3b.
- **As cabeças, medidas à mão na grade:**
  - a correlação de blocos seguia o PESCOÇO (a cabeça muda de forma ao abrir a boca), então o crânio e a boca foram lidos na pose inicial e na segurada, e levados entre elas pelo ritmo do clipe (`_erguer-instalar.mjs`);
  - ⚠️ isso revelou que o círculo de acerto da S1 (os offsets de julho, pelo centro da COR) caía no pescoço da ciano e da verde, 25–35 px de arte abaixo do crânio. `FORMAS.cabeca` agora é o crânio.
- **O bote mira a cabeça ERGUIDA** (`FORMAS.erguida`): a laranja da C varre 39 px para a esquerda ao se erguer e mordia quem desviava.
- **O corpo "escondido" não colide** (`checkCollision.none`), em vez de `enable = false`: ela anda pela velocidade do corpo, e com ele desligado a chegada travou.
- **Os tiros dela:** `body.reset(x, y)` ao reaproveitar a vaga do pool. O corpo guardava a posição velha, e a física devolvia a gota para lá; 9 de 10 gotas azuis da 1ª onda sumiam. Já valia para a S1.
- **As texturas temporárias dos estouros têm nome que nunca se repete:** o motor de destroços guarda os pixels pelo nome, e o estouro do rasgo saía com o desenho do estouro da chegada, em vermelho, sobre o rombo.
- **O estouro do bote NÃO é o motor de destroços.** As quatro tentativas (metal, biomec, biomec em fatias, rocha) cobriam os pescoços por um segundo, porque o motor desenha acima dela. Ficaram o CASCALHO (os pixels da crista do rasgo, por trás dela, `cascoVivo.cascalhoDoRasgo`), o clarão branco na crista e o pó. A chegada e o lábio da fusão seguem no motor (biomec), com um empurrão nos pedaços (`estourar`).
- **A morte corta o quadro na linha do corte** antes da ruptura (`cortarParaAMorte`): as roscas escondidas saíam em pedaços por cima do casco.
- **A cadência:** a chuva ALTERNA com o bote, vindo 1 s depois de cada volta ao rombo, e a de 2 cabeças abre com ela. A de 3 cabeças abre com o bote (com a chuva primeiro, ou com o bote a 2,5 s, quem joga bem a matava antes do 2º ataque).
- **O "corte" não usa máscara de stencil** (risco com o shader da Atmosfera). É um `setCrop` em `crista + escuro`, mais uma tira de 7 px pintada NA FRENTE dela só na largura dela: o casco inteiro fora dos buracos, o degradê para o escuro dentro deles. Uma faixa do casco inteira na frente esconderia a nave (profundidade 1).

**Medido** (`_sonda-luta.mjs`, treino):

| | a luta | contatos | tiros levados |
| --- | --- | --- | --- |
| parado | 42,0 s | 7 | 10 |
| desviando | 41,7 s | 0 | 15 |

Na S1 eram 39,7 s (parado) e 41,4 s (desviando), com 5 e 0 contatos.

A fase de verdade: a faixa chega aos 95 s, o mundo freia aos 98, o casco treme aos 101 e estoura aos 102 (`_fase-real.mjs`).

**As sondas de sempre passam:** `tsc`, `test-serpente`, `test-morte`, `probe-stage3` (FASE 3 DE PONTA A PONTA), `_sonda-serpente-fusao --novo` e `_sonda-chefes`.

**A folha:** `folhas/2026-10-29/serpente-casco/luta.html`.
