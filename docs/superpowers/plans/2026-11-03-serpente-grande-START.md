# START — a fase 2 da luta da Serpente: a serpente grande entra

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Tudo até 03/11 está commitado e empurrado. A
> sessão abre na fase 2 da luta da Serpente: a serpente grande (a fusão refeita, o S2) surge do rombo quando a de 3
> cabeças morre, se solta do casco e luta móvel. Primeiro as perguntas a ele (§2), antes de gerar qualquer arte."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele hoje: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**

## Onde o projeto está (03/11, fim da sessão)

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

## ▶️ COMEÇAR AQUI

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

## 2. As perguntas a ele (antes de qualquer arte)

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
