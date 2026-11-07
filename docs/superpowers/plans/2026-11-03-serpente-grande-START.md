# START — a fase 2 da luta da Serpente: a ENGUIA COLOSSAL (a serpente grande)

> A frase de arranque (atualizada no fim de 04/11): **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Tudo até 04/11
> está commitado e empurrado. A ARTE DA ENGUIA COLOSSAL ESTÁ APROVADA (`folhas/2026-11-04/enguia-corpo/aprovada/`).
> A sessão abre no PLANO (`superpowers:writing-plans`, a partir da spec
> `specs/2026-11-03-serpente-grande-enguia-design.md`) e depois na MAQUETE DO MOVIMENTO EM BLOCOS (spec §7.1),
> aprovada por vídeo."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele hoje: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**

## ▶️ 07/11 — O PLANO E A MAQUETE EM BLOCOS (esperam ele)

- **O plano:** `plans/2026-11-07-serpente-grande-enguia.md` — Parte A (a maquete, FEITA) e Parte B (anéis + normais,
  gestos no PixelLab, efeitos, instalação: um plano curto por parte, depois da maquete aprovada). O fim da Parte A
  registra o que mudou na execução.
- **A maquete:** `node scripts/_serpente/_enguia-maquete.mjs <desvia|parado> <dir> [fotos=1]` sobre módulos puros em
  `scripts/_serpente/enguia/` (os números em `numeros.mjs`; testes `node scripts/test-enguia.mjs`). A folha
  **`folhas/2026-11-07/enguia-maquete/maquete.html`** (gerada por `_enguia-maquete-folha.mjs`): os dois vídeos, os
  capítulos, as medidas, as fotos e três decisões para ele — **(1)** o ciclo mediu 36,8 s (a spec estimou ~27; recomendo
  uma rodada de Eco), **(2)** o pior caso da 1ª salva sobra 0,13 s (recomendo o 1º aviso em 1,8 s), **(3)** as propostas
  da maquete (o aviso pontilhado das passagens, o arco da chegada, a cabeça inclinada no posto, as velocidades, a morte).
- **Medido:** quem desvia, 0 toques; a parada é pega pelo fogo (8), pelo Eco (21), pelos gêiseres (2) e pelo corpo na
  chegada. A luta roteirizada vai da chegada à morte em 101 s.
- **O próximo:** a resposta dele na folha → rodadas da maquete até aprovar → a Parte B.
- **Rodada 2 (07/11, mesma folha refeita):** as respostas dele aplicadas — um Eco, o 1º aviso 1,8 s, o arco fica, sem
  pontilhado (gestos no lugar), o posto pelo TRUQUE do canto (20 anéis), os gêiseres só com o corpo inteiro no rombo
  (a lombada/fissura R3 do `cascoVivo.ts`), o corpo em TUBO e mais fluido, o rombo ABERTO no fim. Ciclo 35,6 s;
  desvia 0 toques. Registro no fim da Parte A do plano.
- **Rodada 2, ajuste** (ele: *"Ficou muito mais natural e fluido"*): o corpo agora TAMPA a lateral direita nos três
  postos e a faixa de baixo sempre tem cano, mesmo depois das mordidas (o enrolamento de cima é elástico). O pixelfx foi
  clonado em `Projetos folder/_referencias/pixelfx` e entra com o modelo da serpente (Parte B).
- **✅ A MAQUETE ESTÁ APROVADA** (ele: *"Boa, ficou ótimo assim."*). **O próximo é a Parte B do plano**, um plano curto
  por parte: (1) os anéis recortados da F1 + os mapas de normais → (2) os gestos da cabeça no PixelLab (a pergunta da
  boca: fecha nas passagens?) → (3) os efeitos, com o pixelfx → (4) a instalação no jogo, com a maquete como oráculo.

## ▶️ O estado no fim de 04/11 (registro)

**O que a sessão de 04/11 fez: a arte da enguia, da cabeça ao corpo, APROVADA por ele em quatro passos.**
1. **A cabeça, rodada 1 respondida** (`folhas/2026-11-03/enguia-cabeca/cabecas.html`): ele gostou da D1 e da B5 e
   ficou com a **B5**, *"mas com a cabeça maior e mais larga"*, mantendo ~3× a nave na tela.
2. **A cabeça, rodada 2** (`folhas/2026-11-04/enguia-b5/cabecas-b5.html`, `scripts/_serpente/_enguia-cabeca-b5.mjs`):
   21 candidatas partindo da própria B5 (editar × conceito, quadros 96×64 e 112×76). Ele escolheu a **E3**
   (`b5-editar-96x64-2-0`, *"me lembra a cabeça do Alien"*) com UM ajuste desenhado por ele: o pescoço terminava num
   corte reto 10 px antes da borda, com um degrau atrás da cúpula → as duas linhas dele levam o pescoço até a borda.
   Feito por inpaint só entre as linhas (`_enguia-pescoco-e3.mjs`, a seed 11): fora da faixa, 0 de 5.491 px mudou.
   *"Boa, gostei. Pode seguir para o corpo."*
3. **O corpo, rodada 1** (`folhas/2026-11-04/enguia-corpo/corpo.html`, `_enguia-corpo.mjs`): a cabeça CONGELADA à
   esquerda de 384×80 e o inpaint pinta só corpo + cauda à direita (máscara a partir de x 90), as cores puxadas para a
   paleta da cabeça. Quatro conceitos × 2 (costelas, barbatana, canos, espinhos). Ele escolheu a **A2**
   (`costelas-22`, a caixa de costelas acesa por dentro) com dois ajustes:
   - **N1** — *"na junção da cabeça com o pescoço existe um desnível, é só subir um pouco"*: o corpo saiu 6 px mais
     BAIXO que o pescoço, exatamente na coluna onde a máscara começava → o corpo inteiro (x ≥ 90) subiu 6 px como
     peça rígida (testados 3–7; o 6 casa o topo e dá o menor salto de cor).
   - **N2** — *"a ponta da cauda, onde eu quero que as ranhuras e painéis sejam azuis. Assim traz mais da serpente de
     cabeça azul"*: inpaint só da ponta (x ≥ 322), a silhueta presa à da A2, linhas ciano nas ranhuras; o painel da
     ponta ficou cinza em todas as seeds e teve os entalhes acesos à mão nos cianos do gerador
     (`_enguia-corpo-ajuste.mjs`, inclusive `--painel`).
4. **APROVADA: a F1** (seed 32), *"Boa, eu vou de F1 também"*. Conferido: cabeça 0 px diferente, corpo idêntico (só
   6 px acima), fora da ponta 0 px, silhueta da cauda 0 px.

**A arte aprovada (no git):**
- `folhas/2026-11-04/enguia-corpo/aprovada/enguia-f1.png` — a enguia INTEIRA, 384×80 (a cabeça em x 0–95, y 8–71;
  ~10 anéis de costela até a cauda azul). É dela que saem os anéis e os mapas de normais (spec §1.3).
- `folhas/2026-11-04/enguia-corpo/aprovada/cabeca-e3-pescoco.png` — a cabeça sozinha, 96×64 (a base dos gestos no
  PixelLab, spec §1.2).

**Fatos para o plano (medidos nesta sessão):**
- A cabeça desenhada tem ~76×61 px no quadro 96×64; a nave tem ~40 px de comprimento. O corpo, ~35–45 px de altura,
  afinando até a cauda. Na F1 ela tem a largura da tela (~10 anéis); a spec pede 16–20 no jogo → os anéis do MEIO se
  repetem (cortar pelas costelas, que já marcam os segmentos).
- A boca da B5/E3 é ABERTA (a brasa laranja no fundo). Os gestos de boca (fechar nas passagens? abrir no cuspe do Eco)
  são pergunta para a etapa de animação, não para a maquete.
- As três cores no corpo: laranja (as costelas por dentro), verde (dois respiros no pescoço/corpo), azul (o olho e a
  ponta da cauda). O anel com canos (spec §1.3, os canos de fogo) ainda NÃO existe: desenhar a partir de um anel da
  F1 quando chegar a arte das peças especiais.
- Lição da técnica (vale para todo inpaint com parte congelada): o gerador pode deslocar o que pinta em relação à
  parte presa — **medir o contorno coluna a coluna na borda da máscara** antes de mostrar (o N1 passou por não medir).

**O próximo, na ordem:**
1. **O plano** (`superpowers:writing-plans`) a partir da spec + a arte aprovada.
2. **A maquete do movimento em blocos** (spec §7.1): a luta inteira com silhuetas sobre a foto da arena, em vídeo na
   velocidade real, no molde da `_habilidades-maquete.mjs`; ele aprova o movimento e as habilidades antes do resto da
   arte.
3. Depois: os anéis recortados + normais, os gestos da cabeça no PixelLab, os efeitos, a instalação (spec §7.2–7.4).

## O estado no fim de 03/11 (registro)

**O que a sessão de 03/11 (2) fez:**
1. **Um bug do jogo, consertado** (`b38f2c7`): ele notou, jogando a Serpente, que *"os tiros somem no início e não
   aparecem mais"*. Eram os tiros da NAVE: a bala reusada do pool nascia com a caixa de colisão onde a anterior morreu,
   e o acerto pelo desenho de 03/11 (`tirosNoCorpo`) a lia no mesmo quadro — ela "acertava" o corpo dela na boca do
   canhão e sumia, em cadeia (e todo tiro acertava, mirado ou não). O `body.reset` no `shoot` e no `disparar`
   (`src/systems/WeaponSystem.ts`). Medido: 51 balas mortas em x 80 antes, nenhuma depois. ⚠️ A vida dobrada das
   formas (provisória) foi calibrada COM o bug: rever com ele jogando.
2. **As perguntas do §2 respondidas, uma a uma, e a SPEC escrita** (`specs/2026-11-03-serpente-grande-enguia-design.md`,
   `4549868`; ele aprovou as 7 partes). Em resumo: a grande é **outra criatura, a ENGUIA COLOSSAL**, dark sci-fi
   biomecânica bem desenhada; **passagens + pausas**; **ondulação + jatos**; **cabeça animada no PixelLab + corpo em
   anéis** recortados da enguia inteira aprovada; a **fusão de hoje + a 1ª passagem** (o rombo vira a toca); três
   habilidades na ORDEM FIXA — os **canos de fogo** (o desenho DELE: 4 faixas, uma livre, salva de 3), **o Eco** (a
   minha: o rastro da nave e as sementes que detonam na ordem do caminho) e os **gêiseres** sob o casco (colunas que
   atravessam a crista); o corpo inteiro leva dano, a cabeça 1,5×; as mordidas na cauda (22/13%) e no crânio (5%); a
   **reta final** a 5% (ela só morre no rombo, presa na boca dele). Os caminhos são coerentes: todo acesso a baixo do
   casco é pelo rombo (*"ela só consegue entrar para baixo do casco se ela estiver no buraco"*).
3. **A 1ª rodada da arte: as CABEÇAS** — ele pediu antes da maquete: *"crie primeiro o modelo no pixellab para vermos
   como vai sair essa cabeça. Assim escolhemos antes"*. Quatro conceitos distintos no Pro (`/generate-image-v2`), 9
   candidatas cada, 40 gerações, a cabeça azul da de 3 cabeças como ESTILO e sem referência de forma
   (`scripts/_serpente/_enguia-cabeca.mjs`; a folha por `_enguia-cabeca-folha.mjs`). Todas de perfil, à esquerda.
   - A moreia blindada · B a engolidora · C a lança · **D a fusão das três** (olho azul, guelras verdes, canhão laranja
     na garganta).
   - Escolhidas e mostradas: A3, A6, B0, B5, C0, C7, D1, **D4** (a minha recomendação; a 2ª é a B0).
   - As escolhidas, nativas (96×64) e limpas, estão em `folhas/2026-11-03/enguia-cabeca/escolhidas/` (no git); os 36
     quadros crus em `cru/` (fora do git, no disco). A barra branca solta que o gerador pôs embaixo de algumas foi
     apagada (só pixels quase brancos nas 6 últimas linhas).

**O próximo, na ordem (03/11 — os passos 1 e 2 CUMPRIDOS em 04/11, ver acima):**
1. **A resposta dele à `cabecas.html`:** qual cabeça segue (ou uma mistura numa 2ª rodada: ex. a D4 com a crista da
   C7) e o tamanho na tela (hoje ~3× a nave no posto dos canos).
2. **A enguia INTEIRA a partir da cabeça escolhida** (de perfil, corpo e cauda), de onde saem os anéis (spec §1.3,
   §7.2). Conferir ampliado antes de mostrar.
3. **O plano** (`superpowers:writing-plans`) a partir da spec, e a **maquete do movimento em blocos** (spec §7.1)
   aprovada por vídeo — a ordem que ele escolheu: o movimento antes do resto da arte. (Ele pediu a cabeça antes, para
   ter noção de como ela fica; a ordem da spec para o resto segue.)

## Onde o projeto estava (03/11, a 1ª sessão — registro)

- **Branch `feat/cartas-preview`, empurrada para `origin`** (nunca `legacy`). Os commits de 03/11 levaram tudo o que
  ele aprovou de 28/10 a 03/11: a luta da Serpente de 3 cabeças (S1 → S1b → a instalação das habilidades), a fusão
  sem a estrela e com as três mordidas, as ferramentas, as folhas (sem vídeos, GIFs e quadros crus) e os docs.
- **A luta da de 3 cabeças está FECHADA** (*"Pronto, agora fechamos isso"*). Ela chega estourando o casco, fica FIXA
  no rombo (y 142) e só as animações a mexem. O corpo inteiro leva dano (a cabeça que vai cair vale 1,5×) e a cabeça
  que cai leva a habilidade dela:
  - **A** (3 cabeças): chuva → raio → gás, com os tiros comuns entre elas;
  - **B** (verde + laranja): chuva → gás, este com a SUA sequência (rasteira → cortina → fila funda);
  - **C** (só a laranja): a rajada e o leque com a brasa.

  O resumo está no 📍 de 02–03/11 do 🧭; os detalhes, na spec e no plano de 02/11 (abaixo).
- **A fusão (a "serpente grande") ainda é a de antes, de propósito.** A spec das habilidades a deixou de fora (*"a
  serpente maior (a fusão refeita)"* não entrou). Hoje ela:
  - surge do rombo pela cena da fusão de 29/10: a de 3 cabeças afunda, as três luzes convergem, implode, e a maior
    irrompe do rombo de boca aberta;
  - fica PARADA no rombo, com a arte de 2026-09-01 (`serpente-fusao-anim`, 9 quadros, escala 0,63);
  - atira o leque, a rajada e o silêncio (`atacarFusao`), com a gota de hoje e sem a investida;
  - leva as três mordidas (pescoço → queixo → crânio, a 22/13/5% da vida total), sem a estrela;
  - tem vida 120 (provisória).

## O começo da 1ª sessão (registro — CUMPRIDO em 03/11)

1. **Ler** o 🧭 do HANDOFF (os 📍 de 28/10 a 03/11) e, nesta ordem, o que já foi dito sobre a maior:
   - `specs/2026-10-28-serpente-luta-s1-design.md` §9 (o S2 como foi definido);
   - `specs/2026-10-29-serpente-luta-s1b-design.md`, a citação do topo e o §9;
   - `specs/2026-10-28-serpente-fusao-mordidas-design.md` (as mordidas e a estrela);
   - `specs/2026-11-02-serpente-habilidades-instalacao-design.md` §1 e §2.4 (o que ficou de fora) e as duas emendas.
2. **Ver a fusão como está**, no jogo: `?serpente=fusao` (o atalho de dev abre a F3 direto nela, na arena de treino) e
   o filme `node scripts/_inimigos/_filmar-serpente-fusao.mjs` (a linha 1 diz o uso). Isso serve de "antes" para a
   folha.
3. **Perguntar a ele, com opções, ANTES de gerar** (a regra: *"antes de gerar, acabe com as dúvidas"*; e a lição do
   CCGS: *"nenhum me perguntou quais seriam as skills"*). O §2 abaixo lista as perguntas.
4. **Depois, o caminho que funcionou na de 3 cabeças:** brainstorming → spec → plano → execução INLINE com pausas.
   Conceitos e maquetes numa folha HTML antes de instalar (3–4 conceitos; conferidos ampliados antes de mostrar). Cada
   habilidade nasce numa MAQUETE aprovada por vídeo, e a maquete vira o ORÁCULO do porte para o jogo.

## 2. As perguntas a ele (antes de qualquer arte) — RESPONDIDAS em 03/11: as respostas estão na spec da enguia

O que ele já disse: *"Ai chega a serpente maior, quando a serpente de 3 cabeças morre, o interessante é ela voltar
para o buraco e depois a serpente maior surge dele. A serpente maior, decidimos que ela se desgarra da forma imóvel e
se torna mais móvel, esse é o desafio dessa nova batalha"* (29/10). E o S2 de 28/10: *"a arte (a união das três, a
partir da de hoje, corpo inteiro com cauda), nadando solta pela metade direita, o bote atravessando a tela, a cena da
fusão arrancando-a do rombo, e os pontos das mordidas medidos de novo na arte nova"*.

Mudou desde então (03/11, confirmado por ele: são FATOS, não perguntas):
- **a investida saiu de vez, de todas as formas** (02/11). Ela não servia para o que a luta precisava e dava mais
  trabalho do que valia; outras habilidades entraram no lugar. O "bote atravessando a tela" do S2 de 28/10 caiu junto.
  Não propor investida de novo;
- **o dano no corpo inteiro é a regra da de 3 cabeças** (03/11): o corpo todo leva dano, e as cabeças levam dano
  aumentado. A de 3 cabeças NÃO nada: fica fixa no rombo, e só as animações a mexem. A grande ainda não existe, então
  ainda não se sabe se ela vai nadar; isso se decide nas perguntas abaixo;
- **o casco não é chão** (03/11): foi uma correção ao agente anterior, que tratava o casco como um chão em que a nave
  batia e fazia as habilidades estourarem na borda dele. A nave não colide com o casco e voa sobre ele até a borda de
  baixo; nenhum ataque "bate no chão do casco" (`casco-nao-e-chao`).

As perguntas (uma de cada vez, com opções e a recomendação):
1. **A arte:** a maior parte da fusão de hoje (a união das três, corpo inteiro com cauda) ou é outra criatura? Ela é
   vista de PERFIL, como o jogo (o PixelLab tende a dar vista de cima).
2. **O movimento:** por onde ela nada (a metade direita? a tela toda, passando atrás ou na frente da nave?), e com que
   "motor" no vácuo: ondulando como serpente, ou com nadadeiras? A nadadeira define o movimento (`nadadeira-define-movimento`).
3. **A saída do rombo:** a cena da fusão de hoje fica até "a maior irrompe"? E como ela se desgarra: rasga o lábio,
   arrasta casco junto, deixa o rombo vazio?
4. **As habilidades (o centro da luta):** ela herda as três (raio da azul, gás da verde, faísca da laranja, a chuva),
   ganha habilidades próprias de uma criatura móvel, ou mistura as duas? Lembrar: tudo com causa visível no vácuo
   (`fisica-do-lugar-nos-ataques`), e o estilo Cuphead que ele pediu (padrões legíveis, aviso, esquiva).
5. **As mordidas:** as três (pescoço → queixo → crânio) ficam na arte nova, medidas de novo?
6. **A morte e o fim da fase:** a morte de hoje fica, ou a maior morre de outro jeito?

## As regras que valem aqui (as memórias)

- **Criatura animada nasce INTEIRA no PixelLab:** gerar inteira → as vistas → animar lá. Nunca partes coladas com
  movimento fingido em código. Reclamação de movimento se resolve no CORPO e num caminho apoiado no mundo, nunca só nos
  números (`criatura-inteira-vistas-animacao`).
- **Arte que errou duas vezes:** silhuetas em blocos, plantadas e medidas, antes do detalhe (`forma-antes-do-detalhe`).
  A substituta parte da arte de HOJE (o ângulo, a composição); o desenho novo é só referência
  (`troca-de-arte-no-angulo-da-existente`, `partir-da-arte-aprovada`).
- **PixMiniMax** (`pixminimax-animacao`): o gesto NO LUGAR da arte escolhida; peça o CORPO junto e diga a cor de cada
  boca; intermediários com as duas pontas fixas; verbo de efeito vira efeito pintado ("nothing comes out of any
  mouth"); clipe que escurece = descarte. O conferidor de identidade é `scripts/_serpente/_consistencia.mjs`.
- **O PixelLab recusa "gore/flesh/blood":** descreva a matéria (`pixellab-barra-vocabulario-gore`).
- **A arena é só pintura** (+ o rombo, que é da luta): nenhuma peça de cenário (`arena-chefao-so-fundo`).
- **No vácuo nada cai nem quica por gravidade;** toda curva precisa de causa visível. Feixe é reto: a cabeça é que
  gira (`fisica-do-lugar-nos-ataques`).
- **O casco não é chão** (`casco-nao-e-chao`): a sonda precisa de uma volta com a nave escondida sob a crista (y ~185).
- **Elite e chefão pressionam sem punir à toa:** vão > tiro (`elites-pressionam-sem-punir`).
- **Dark sci-fi:** casco escuro, luz só onde há energia (`correcao-rumo-dark-sci-fi`). Efeito de cena assado em pixel
  na resolução nativa (`efeito-de-cena-assado-em-pixel`). Parte que não deve aparecer: animação cortada + buraco de
  verdade, nunca sombra por cima (`esconder-com-arte-nao-com-cobertura`).
- **Som:** só depois do balanceamento do jogo inteiro.

## O código e as ferramentas que servem

- **A luta:** `src/entities/BossSerpente.ts`:
  - as formas (`FASES`, a fusão na linha da `serpenteFusao`), `atacarFusao`, a cena `fusao()` e o `fusaoPasso`;
  - `acertoNoCorpo` (o dano pelo desenho), o `rescaldo` e o registro das habilidades;
  - o casco vivo da arena: `src/entities/cascoVivo.ts`.
- **Os números:** `src/entities/numerosSerpente.ts` (`LUTA.vida`, `FORMAS.fusao`), `src/entities/serpente/numerosHab.ts`.
- **As mordidas:** `src/entities/serpenteFusao.ts` (`MORDIDAS_FUSAO`) e o motor dos destroços (`docs/DESTROCOS.md` §14–16).
- **As habilidades** (o molde para as da maior): `src/entities/serpente/`:
  - uma classe por habilidade (`chuva.ts`, `raio.ts`, `gas.ts`) atrás da fachada `CorpoSerpente` (`habilidade.ts`);
  - a camada de pixels em duas lonas (`camadaPixels.ts`), o tocador dos conjuntos (`tocador.ts`), as luzes (`luzes.ts`).
- **A maquete e o oráculo:**
  - `scripts/_serpente/_habilidades-maquete.mjs` (a maquete das habilidades, na foto da arena);
  - `scripts/_serpente/_oraculo.mjs` + `node scripts/test-serpente-hab.mjs` (o porte conferido quadro a quadro).
- **As sondas no jogo:**
  - `scripts/_serpente/_sonda-hab.mjs <modo>` (`--forma`, `--volta`, `--filmar`);
  - `_sonda-luta.mjs` (a luta inteira, parado × desviando);
  - `_fase-real.mjs` (a F3 de verdade até a arena) e `_arena-foto.mjs` (a foto limpa da arena para maquetes);
  - `scripts/_inimigos/_sonda-serpente-fusao.mjs`, `_filmar-serpente-fusao.mjs` e `_pontos-fusao.mjs` (a fusão e as
    mordidas). São de 28/10: com a vida ×2 e o dano no corpo de 03/11, conferir se ainda derrubam as três cabeças antes
    de confiar nelas;
  - de sempre: `scripts/probe-stage3.mjs`, `node scripts/test-serpente.mjs`, `node scripts/test-morte.mjs`, `npx tsc --noEmit`.
- **A arte instalada:** `_erguer-instalar.mjs` e `_hab-instalar.mjs` (os conjuntos, as medidas por quadro, as veias,
  a sombra); `_veias.mjs` (a marca da cabeça viva).
- **As armadilhas:**
  - durante uma filmagem, NÃO editar `src/` nem `.html` (o Vite recarrega);
  - o servidor fica em `:5173`. Se cair por falta de memória, PEDIR a ele antes de subir de novo. Um Vite antigo pode
    ficar vivo, órfão, depois que a tarefa dele para: conferir a porta e encerrar o processo node;
  - `sed`/`node -e` falham em silêncio aqui (CRLF, `${}`): editar com Edit e conferir;
  - o Node roda `.ts` direto só sem propriedade-parâmetro no construtor e com `import type`.

## O que ficou da entrega de 02–03/11 (não bloqueia)

- **As Tarefas 14 e 15 do plano** `plans/2026-11-02-serpente-habilidades-instalacao.md`: a troca de forma no meio de
  uma habilidade e o desempenho (p95 ≤ 4 ms), medidos; os vídeos de tudo numa folha só. Fazer quando ele pedir, ou
  junto com os vídeos da maior.
- **Anotado, sem pedido dele:** a boca cor de pêssego no quadro 4 do `tiroC`; a garganta vermelho-escura da verde no
  erguer da B; o erguer da A (rosa) que a luta não usa mais.
- **Para o CENÁRIO da luta** (o próximo depois da maior, pedido dele): a camada de brilho dos destroços escurece todas
  as nuvens semitransparentes.
- **A vida das formas dobrou (provisória),** e o contra tira 15%: calibrar com ele jogando.

## As leis que seguem valendo

- **Commit e push só quando ele pedir:** só no nome dele (sem `Co-Authored-By`), nunca para `legacy`. Ficam fora:
  vídeos, GIFs, `cru/`, `cru2/`, `cru3/` e os `concept art` da raiz (o `.gitignore` cuida). O `.env.pixellab`, nunca.
  A ordem dos commits: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- **Antes de commitar:** todo arquivo que o jogo carrega está no git, e nada aprovado ficou de fora.
- **A conversa com ele em português;** código, comentários, prompts e raciocínio em inglês.
- **A arte:**
  - 3–4 conceitos numa folha antes de instalar, conferidos ampliados antes de mostrar;
  - fundo pintado em 384×216 (reduzir pode, ampliar nunca);
  - a fila de review do PixelLab é a biblioteca dele: nunca descartar em massa;
  - teste na peça PENDENTE, nunca na aprovada. Defeito apontado em peça aprovada: corrigir só aquilo e provar que o
    resto ficou idêntico.
- **Mecânica e efeito** ele julga por vídeo em velocidade real, no jogo.
