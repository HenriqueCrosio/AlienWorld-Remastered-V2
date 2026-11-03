# As habilidades da Serpente no jogo — plano de implementação

> **Para quem executa:** SUB-SKILL OBRIGATÓRIA: use `superpowers:subagent-driven-development` (recomendado) ou
> `superpowers:executing-plans` para executar este plano tarefa por tarefa. Os passos usam caixas (`- [ ]`) para o
> acompanhamento.
>
> Spec: `docs/superpowers/specs/2026-11-02-serpente-habilidades-instalacao-design.md` (aprovada por ele em 02/11:
> *"pode seguir para o plano"*). As maquetes aprovadas (rodadas 1–14) estão em
> `docs/superpowers/folhas/2026-10-31/serpente-habilidades/`.
>
> **O ESTADO (03/11, fim da sessão): as Tarefas 1–13 estão FEITAS, aprovadas por ele em cada pausa e COMMITADAS** (a
> pedido dele: *"Pronto, agora fechamos isso"*). As notas FEITO de cada tarefa (a partir da pausa 2, abaixo da Tarefa 9)
> guardam os desvios e as medidas. A Tarefa 16 (os registros) também foi feita em 03/11: o 🧭 do HANDOFF, a seção
> "installed in the game" no `PROGRESSO-gravidade-zero.md` e a memória. **Ficaram abertas as Tarefas 14 (a troca de
> forma no meio de uma habilidade e o desempenho, medidos) e 15 (os vídeos de tudo numa folha só).** Elas não bloqueiam
> a fase 2 da luta (a serpente grande); fazer quando ele pedir os vídeos ou quando o desempenho virar assunto.
> As caixas `- [ ]` abaixo nunca foram marcadas: o estado é o desta nota e das notas FEITO.

**Objetivo:** instalar na luta da Serpente as habilidades aprovadas em maquete:
- os tiros B (agulha, veneno e brasa) com as variações mirado, leque de veneno e cerco;
- a chuva de casulos;
- o raio da azul;
- o gás + faísca, com o termômetro, o contra e a carta INCENDIÁRIO;
- a arte nova do PixelLab: o cerco na A e o gás na B, "feridas e furiosas".

A investida sai do jogo.

**Arquitetura:**
- Cada habilidade é um módulo em `src/entities/serpente/`, traduzido da maquete linha a linha para o relógio do jogo
  (`update(dt)`).
- As habilidades conversam com a Serpente por uma fachada pequena (`CorpoSerpente`): as bocas, o olho e a nave, o
  tocador dos conjuntos, a borda dela, as balas do jogador e a carta.
- Tudo o que ela solta é desenhado pixel a pixel numa camada de 384×216, como na maquete. As balas do pool de inimigos
  servem só de corpo de colisão, invisíveis.
- O `BossSerpente` fica com o ciclo de cada forma, a vida, o contra e a troca de forma.

**Pilha:** Phaser 3.90 + TypeScript (Vite). O Node 24 roda `.ts` direto, removendo os tipos, o que permite testar os
módulos puros com `node scripts/test-*.mjs`. As sondas usam Playwright contra o `npm run dev` na porta 5173. O
PixelLab é usado via MCP (`animate_image_pixminimax`).

## Restrições globais

Todas valem para todas as tarefas.

**Git e arquivos que ficam de fora:**
- **Nada de commit nem push.** Ele commita quando pedir, com autoria só dele e sem `Co-Authored-By`. Os passos de
  commit da skill viram **"relatar os arquivos mudados"**.
- Nunca empurrar para o remoto `legacy`.
- `.env.pixellab` nunca entra em commit. Vídeos, GIFs, pastas `cru/` e a arte conceitual da raiz também ficam fora.

**Durante sondas e filmagens:**
- Não editar `src/` nem `.html` do projeto: o Vite recarrega e a sonda morre.
- O servidor de dev (tarefa de fundo `bw747f26d`, porta 5173): se morrer, **perguntar a ele antes de reiniciar**.

**Edição e idioma:**
- Editar arquivos com a ferramenta Edit/Write. `sed` e `node -e` falham em silêncio aqui (CRLF, `${}`).
- Conversa com ele em pt-br. Código, comentários, prompts do PixelLab e raciocínio em inglês. Folhas e registros em
  pt-br.

**Os números e a maquete:**
- Os números são os das maquetes. Onde a spec não dá um número, vale o da maquete (`_habilidades-maquete.mjs`).
- **A maquete não é editada.** Ela é o oráculo dos testes (Tarefas 11 a 13).

**A arte:**
- Conferir toda arte AMPLIADA antes de mostrar.
- Nunca fingir movimento de criatura em código: a cabeça só se mexe pelos conjuntos do PixelLab.
- Nunca dobrar efeito para esconder parte parada.
- A fila de review do PixelLab é a biblioteca dele: nunca descartar em massa.
- Peça aprovada com defeito apontado: corrigir só aquilo e provar que o resto ficou idêntico.

**Escopo:**
- Sem som: só depois do balanceamento do jogo inteiro.
- Os módulos puros, que o Node testa, não usam `enum`, `namespace` nem propriedades de parâmetro no construtor; os
  tipos entram com `import type`.

## Como este plano trata a maquete

A maquete tem 2159 linhas e é a fonte da verdade. **Este plano não copia o código dela:** para cada função a portar,
ele dá o intervalo exato de linhas e as regras de tradução abaixo, e escreve por inteiro só o código novo (a cola, as
interfaces, os testes).

**As regras de tradução** (valem em todo porte, e cada tarefa de porte cita estas regras):

- **R1. O relógio.** A maquete usa `t` (o tempo da habilidade) e `dt = 1/FPS` com `FPS = 30`. No porte:
  - cada habilidade guarda `this.t`, e `update(dt)` chama `this.passo(this.t, dt)` e só depois faz `this.t += dt`;
  - os disparos `t >= tx && t - 1/FPS < tx` viram `cruza(t - dt, t, tx)` (`numerosHab`): dispara no primeiro quadro
    com `t ≥ tx`, como a maquete;
  - os disparos com bandeira (`t >= tf - 1e-6 && !feito`) ficam como estão.
- **R2. As quantidades por quadro** (a maquete roda a 30 quadros/s; o jogo, a ~60):
  - com `k = dt * 30` (de `porQuadro(dt)`), uma contagem por quadro `floor(n + acaso())` vira `floor(n * k + acaso())`;
  - uma chance por quadro `acaso() < p` vira `acaso() < chance(p, dt)`, que é `1 − (1 − p)^k`;
  - uma fração por quadro `x += (alvo − x) * f` vira `x += (alvo − x) * chance(f, dt)`.

  Com `dt = 1/30`, `k = 1` e o porte é a maquete, bit a bit.
- **R3. Os dados.** `acaso` (a física) e `visual` (a aparência) são dois geradores por instância de habilidade, criados
  por `gerador(semente)`, o mesmo LCG da maquete:
  - no jogo, as sementes saem de `Math.random()` no `comecar()`, e as sondas fixam o `Math.random`;
  - os oráculos passam 7 e 99, as sementes da maquete;
  - **a ordem das chamadas é a da maquete, inclusive no desenho** (o `termoDesenha` sorteia com `acaso`).
- **R4. A geometria vem da fachada.** Nenhum porte lê posição de arte direto:
  - `boca(cor)`, `labios()`, `olho()`, `ponto(chave, i, tipo)`, `nave()` e `bordaEsq(y)` vêm do `CorpoSerpente`;
  - as contagens de quadros e as `faixa` vêm de `gestosHab`;
  - `naveC()` na maquete é `nave()` no porte;
  - `naveX`, `naveY` na maquete são `nave().x + 1,5`, `nave().y`.
- **R5. A cabeça.**
  - `GCAB.q = { nome, i }` e `CABV` viram `corpo.tocador.mostrar(chave(nome), i)`;
  - `GCAB.q = null` vira `corpo.tocador.idle()`;
  - `chave(nome)` sai de `HAB.conjuntos`: ele mapeia os nomes da maquete (`abre`, `aberta`…) para as chaves por forma.
- **R6. Configuração e literais.** Os objetos de configuração nomeados (`GASCFG`, `VAPOR`, `GEL`, `PADRAO`, `TERMO`,
  `GMOV`, `VARRE`, `COR`, `BORDA`, `NUCLEO`, `GAS`, `FRIO`, `BAYER`) vão para `numerosHab.ts`. Neles, cada
  `opc.x ?? d` vira `d`, e `opc.contra` / `opc.carta` viram estado da instância. Os literais dentro das funções ficam
  como estão.
- **R7. Os tipos.** As partículas e o estado ganham interfaces locais pequenas. `any` é proibido; cor é
  `readonly number[]`.
- **R8. O que não entra:**
  - os ramos `opc.rastreia`, `console.log` e `foraDoAviso`;
  - o ramo `globos/empurra` de `acende` (linhas 820–841), que é código morto desde a rodada 7: `acende` só é
    chamado com `'nave'` e `'padrao'`, e os dois retornam antes.

**O oráculo:** o raio e o gás (Tarefas 11–13) são testados contra os registros `rastreia=` da própria maquete. O
porte roda no Node com `dt = 1/30`, as sementes 7 e 99 e uma fachada falsa que responde com as fórmulas da maquete. A
cada quadro, o estado tem de bater com o da maquete (posições até 1e-6 px). Assim "o aprovado é o que aparece" vira um
teste.

## Correções à spec que o plano descobriu (ver a mensagem a ele)

1. **A profundidade da camada (§5.1).** A nave fica na profundidade 1, de propósito: a tinta da lula, a 0,5, cobre os
   inimigos e nunca a nave. A Serpente fica a 30 e o lábio do rombo a 35. "Acima dela e abaixo da nave" é
   impossível com uma camada só.

   O plano usa **duas lonas** de 384×216, e cada pixel vai para uma delas pela máscara do corpo dela (os pixels opacos
   dela e do lábio no quadro):
   - **sobre o corpo:** a lona de cima (profundidade 36);
   - **fora dele:** a lona de baixo (0,9), sob a nave e os tiros.

   É exatamente a ordem da maquete: o fundo, ela, o lábio, os efeitos e a nave por cima de tudo.
2. **Os tiros e mísseis dela são desenhados na camada**, como na maquete. A bala do pool fica invisível e é só o
   corpo de colisão, com a textura e a escala de hoje (`GOTA`, 0,9). Assim a caixa é a de antes por construção, e o
   tiro aparece sobre o corpo dela ao sair da boca (no jogo de hoje, a 1, ele nasce por baixo dela).
3. **A salva do raio é sorteada fatia a fatia, no começo de cada uma, com a nave onde ela está.** A maquete sorteava
   as seis de uma vez, supondo o manequim. A regra é a mesma, e com a nave seguindo o manequim o resultado é idêntico
   (o oráculo prova).
4. **A chuva:** a maquete começa o vão sempre na vaga 3 e anda para a direita. O jogo sorteia a vaga de início e o
   sentido (a regra "anda uma vaga por onda" fica).
5. **As veias da cabeça viva nos conjuntos novos:** os quadros novos ganham veias e sombra como os do erguer. Sem
   isso, a marca da cabeça viva sumiria sempre que ela atacasse.
6. **As bocas da B no idle:** a maquete só mediu o idle da A, quadro a quadro. Na B vale a boca do quadro 0 em todos os
   quadros do idle. Ela só pesa antes do `abre`, quando nada sai da boca.

## Os arquivos

| Arquivo | O quê |
|---|---|
| `src/entities/serpente/tipos.ts` (novo) | `Ponto`, `RGB`, `Put`, `NomeHab`, `FormaHab`, `Variacao` |
| `src/entities/serpente/numerosHab.ts` (novo) | os números (R6) e as contas puras: `cruza`, `porQuadro`, `chance`, `gerador`, `rodizio`, `alvosDoCerco`, `angulosDoLeque`, `vagasDosCasulos`, `inicioDoVao` |
| `src/entities/serpente/gestosHab.ts` (gerado) | os conjuntos: quadros, origem, bocas, olho, crânio, faixa, quadro de ação, luzes; o idle da A e da B |
| `src/entities/serpente/projeteisHab.ts` (gerado) | os pixels dos tiros B e do casulo (RGBA), o fps e o rastro |
| `src/entities/serpente/pixels.ts` (novo, puro) | `sobre` (a mistura), `Lona` (as duas lonas + a máscara do corpo) |
| `src/entities/serpente/projetil.ts` (novo, puro) | `desenharSprite`, `caudaDe`, `chamaCor` (maquete 146–175) |
| `src/entities/serpente/particulas.ts` (novo, puro) | o gás de jato, as faíscas, a fumaça e os clarões no casco (maquete 273–349, 533–539) |
| `src/entities/serpente/geometriaRaio.ts` (novo, puro) | `feixe`, `yBorda`, `angDe`, `poseDe`, `quadroDe`, `yLPara`, `caminho`, `sorteiaFatia`, `feixeNaCaixa` |
| `src/entities/serpente/termometro.ts` (novo, puro) | o termômetro (maquete 907–1006) |
| `src/entities/serpente/geleia.ts` (novo, puro) | a geleia de plasma (maquete 540–807) |
| `src/entities/serpente/habilidade.ts` (novo) | as interfaces `CorpoSerpente`, `Habilidade` |
| `src/entities/serpente/camadaPixels.ts` (novo) | as duas lonas no Phaser (`CanvasTexture`), a máscara do corpo dela, a borda esquerda |
| `src/entities/serpente/tocador.ts` (novo) | mostra o quadro i de um conjunto, toca um clipe a N fps, volta ao idle |
| `src/entities/serpente/luzes.ts` (novo) | os sprites das máscaras de luz e o clarão quente |
| `src/entities/serpente/tiros.ts` (novo) | os tiros comuns: as variações, os gestos, o clarão, os rastros; a C com a brasa |
| `src/entities/serpente/chuva.ts` (novo) | a chuva de casulos |
| `src/entities/serpente/raio.ts` (novo) | o raio da azul |
| `src/entities/serpente/gas.ts` (novo) | o gás + faísca |
| `src/entities/serpente/atalho.ts` (novo) | `?serpente=A&hab=raio` (só em dev) |
| `src/entities/BossSerpente.ts` | a investida sai; o ciclo; o posto baixo; a fachada; a camada; o crânio por quadro; o aborto; o contra |
| `src/entities/numerosSerpente.ts` | sai o que só servia à investida |
| `src/entities/cascoVivo.ts` | sai a fissura, a ponta e o rasgo (só a investida os usava) |
| `src/entities/Boss.ts` | `morde?` opcional no `StageBoss` |
| `src/scenes/GameScene.ts` | chama o `morde`; passa `balas`, `incendiario` e o atalho à Serpente |
| `src/systems/CartasEmJogo.ts` | `temIncendiario` |
| `src/scenes/BootScene.ts` | carrega as folhas dos conjuntos, das veias, da sombra e das luzes |
| `src/main.ts` | liga o atalho (dev) |
| `scripts/_serpente/_hab-instalar.mjs` (novo) | o instalador (Tarefa 4) |
| `scripts/_serpente/_sonda-hab.mjs` (novo) | a sonda das habilidades, com um modo por tarefa |
| `scripts/_serpente/_oraculo.mjs` (novo) | a fachada falsa e o laço do oráculo (Tarefas 11–13) |
| `scripts/test-serpente-hab.mjs` (novo) | os testes puros e os oráculos |
| `scripts/test-serpente.mjs`, `scripts/probe-stage3.mjs` | sem a investida |
| `docs/superpowers/folhas/2026-11-02/serpente-instalacao/` (nova) | `cru/` (o PixelLab), a conferência, os oráculos, os vídeos e a folha `habilidades-no-jogo.html` |

**A pasta desta entrega** será chamada de `$F` nos passos: `docs/superpowers/folhas/2026-11-02/serpente-instalacao`. A
das maquetes, de `$M`: `docs/superpowers/folhas/2026-10-31/serpente-habilidades`.

---

### Tarefa 1: O cerco na A (PixelLab, 3 clipes)

**Arquivos:**
- Criar: `$F/cru/cerco-<par>/<i>.png` para `par` ∈ {`cv` azul+verde, `vl` verde+laranja, `cl` azul+laranja}.
- Criar: `$F/cru/cerco.json`, com os ids dos trabalhos, a escolha e o motivo.

**Interfaces:**
- **Produz:** três clipes de 256². Cada um começa e termina no quadro aprovado da A (`public/sprites/serpente-erguer-A-0.png`,
  o centro da arte em (137, 133)) e tem um quadro de pico com as duas bocas abertas.

**Passos:**

- [ ] **Passo 1: Subir o primeiro quadro.**
  1. `mcp__pixellab__get_upload_url`.
  2. `curl -s -X POST --data-binary @public/sprites/serpente-erguer-A-0.png "<url>"`.
  3. Guardar o `upload:<id>`.

- [ ] **Passo 2: A ida (aprovado → pico), um pedido por par**, com `animate_image_pixminimax`, sem quadro final:
  - `first_frame_url`: o `upload:<id>`;
  - `frame_count`: 8;
  - `view`: `side`;
  - `direction`: `west`;
  - `subject_description`: `a three-headed armored space serpent coiled in place, seen from the side`.

  O `description` do `cv`:

  ```
  In place, the coils tighten and the body leans forward a little. The left head and the middle head surge forward together, a short move that stays in their own places without crossing the other heads, and open their jaws wide at the same moment, holding them open at the end. The right head stays still and calm. The left head's mouth glows cyan-blue inside and the middle head's mouth glows green inside: a dark throat with a soft glow deep inside, jaws and teeth clearly drawn. The right head keeps its shape: its armored cylindrical snout with the round glowing muzzle stays closed. Nothing comes out of any mouth.
  ```

  - **`vl`:** troque as duas cabeças que avançam por "the middle head and the right head"; a quieta é "the left head". Troque
    o fim por: "The middle head's mouth glows green inside: a dark throat with a soft glow deep inside, jaws and teeth
    clearly drawn. The right head keeps its shape: its armored cylindrical snout with the round glowing muzzle stays
    closed; only its small lower jaw drops a little, and its muzzle glows orange. Nothing comes out of any mouth."
  - **`cl`:** as que avançam são "the left head and the right head"; a quieta é "the middle head". A boca da esquerda é
    a do `cv`, e a da direita é a do `vl`.

  Esperar com `wait_for_jobs` e baixar com `get_image` (as URLs com `curl`) para
  `$F/cru/cerco-<par>-ida-v<n>/<i>.png`. O índice 0 é o quadro de entrada.

- [ ] **Passo 3: Conferir a ida AMPLIADA** (3×, numa folha de contato). Descartar e gerar de novo (até 3 vezes por par)
  se acontecer qualquer um destes:
  - uma cabeça cruza outra;
  - a laranja vira bocarra de dentes;
  - sai efeito de uma boca;
  - a boca está na cor errada;
  - o corpo escurece, ou seja, `node $M/ferramentas/hab2-luz.mjs <dir>` dá as roscas abaixo de 90%.

  Escolher o quadro de pico: as duas bocas mais abertas.

- [ ] **Passo 4: A volta (pico → aprovado)**, com as duas pontas fixas:
  - `first_frame_url`: o pico subido;
  - `last_frame_url`: o `upload:<id>` do aprovado;
  - `frame_count`: 4;
  - o mesmo `subject_description`;
  - `description`: `The two open heads close their jaws and settle back to the starting pose; the body relaxes. Nothing comes out of any mouth.`

- [ ] **Passo 5: Montar o clipe** em `$F/cru/cerco-<par>/`:
  1. os quadros da ida de 0 até o pico;
  2. os quadros 1–3 da volta;
  3. no fim, a cópia exata de `serpente-erguer-A-0.png`. O último quadro gerado é descartado (lição de 01/11).

  Depois:
  - `node $M/ferramentas/hab2-limpa.mjs $F/cru/cerco-<par> $F/cru/cerco-<par>` (a mancha cinza);
  - `node scripts/_elites/_continuidade.mjs $F/cru/cerco-<par>`: nenhum salto acima de 30% por quadro. Onde houver,
    gerar um intermediário de 4 quadros com as duas pontas fixas e trocar o salto por ele.

- [ ] **Passo 6: Conferir de novo ampliado** e registrar em `cerco.json`: `{ par, idaJob, voltaJob, pico, quadros, motivo }`.

---

### Tarefa 2: O gás na B, feridas e furiosas (PixelLab, 6 conjuntos)

**Arquivos:**
- Criar: `$F/cru/gasB/<conj>/<i>.png` para `conj` ∈ {abre, sopra, carga, bote, fecha, encolhe}.
- Criar: `$F/cru/gasB.json`.

**Interfaces:**
- **Produz:** os seis conjuntos encadeados como os da A:
  - `abre` termina na pose **B** (a verde aberta);
  - `sopra`, `carga`, `fecha` e `encolhe` começam em B;
  - `carga` termina na pose **C** (a laranja mirando);
  - `bote` começa em C;
  - `fecha` e `encolhe` terminam no aprovado (`public/sprites/serpente-erguer-B-0.png`).

**Passos:**

- [ ] **Passo 1: Subir o aprovado da B**, como na Tarefa 1, Passo 1. Em todos os pedidos:
  - `view: side`;
  - `direction: west`;
  - `subject_description: a two-headed armored space serpent coiled in place, seen from the side, with a burnt stump where a third head was`.

- [ ] **Passo 2: `abre`.** 8 quadros, a partir do aprovado:

  ```
  In place, the body tenses angrily. The middle head stays high in its place and, with a furious jerk, opens its jaws wide, pointing down, and holds them open. The right head stays still. The middle head's mouth: a dark throat with a soft green glow deep inside, jaws and teeth clearly drawn. The right head keeps its shape: its armored cylindrical snout with the round glowing muzzle stays closed. Nothing comes out of any mouth.
  ```

  O último quadro bom é a pose **B**. Conferir ampliado: a boca da verde não pode descer (lição de 02/11: meça a boca
  antes de aceitar).

- [ ] **Passo 3: `sopra`.** 8 quadros, a partir de B:

  ```
  The middle head, jaws held wide open and pointing down, shakes its head in short furious jerks, side to side and up and down, staying high in its place; the neck strains and the coils shudder. The right head stays still. Nothing comes out of any mouth.
  ```

- [ ] **Passo 4: `carga`.** 8 quadros, a partir de B:

  ```
  The right head slowly turns its snout like a gun turret, aiming down and to the left, and draws back a little, trembling. It keeps its shape: its armored cylindrical snout with the round glowing muzzle stays closed; only its small lower jaw drops a little, and its muzzle glows orange. The middle head holds still with its jaws open. Nothing comes out of any mouth.
  ```

  O último quadro é a pose **C**.

- [ ] **Passo 5: `bote`.** 4 quadros, a partir de C:

  ```
  The right head fires like a cannon: its snout stays aimed while the whole head snaps back in one sharp recoil and holds there. It keeps its shape: its armored cylindrical snout with the round glowing muzzle stays closed. The middle head holds still with its jaws open. Nothing comes out of any mouth.
  ```

  O pico é o recuo máximo. O tocador o usa como o pico da bicada da A: a mesma tabela de tempos, `GMOV.vai`, `pico`
  e `volta`.

- [ ] **Passo 6: `fecha`.** 8 quadros, pontas fixas, de B ao aprovado:
  `The middle head closes its jaws and settles back to the starting pose; the body relaxes. Nothing comes out of any mouth.`

  Se escurecer ou saltar, use dois pedaços de 4 quadros que passam por um quadro do meio escolhido da ida.

- [ ] **Passo 7: `encolhe`.**
  1. 12 quadros, a partir de B:

     ```
     Both heads thrash: they jerk back sharply, twist and cower, and the coils writhe, as if burned. Nothing comes out of any mouth.
     ```

  2. Depois, 4 quadros com as pontas fixas, do último quadro bom até o aprovado:
     `They settle back to the starting pose.`

- [ ] **Passo 8: Limpar e conferir cada conjunto**, como na Tarefa 1, Passos 3 e 5:
  - a mancha cinza (`hab2-limpa.mjs`);
  - o brilho (`hab2-luz.mjs`);
  - a continuidade, que entre conjuntos encadeados é medida com `_continuidade.mjs abre sopra` e assim por diante;
  - o cuspe pintado.

  Se o gerador pintar cuspe ou faísca, limpe com uma cópia de `$M/ferramentas/hab14-cuspe.mjs`
  (`$F/ferramentas/inst-cuspe-gasB.mjs`), com a tabela `LIMPA` refeita para os quadros do conjunto. Registre tudo em
  `gasB.json`.

---

### Tarefa 3: Os números e as contas puras

**Arquivos:**
- Criar: `src/entities/serpente/tipos.ts`, `src/entities/serpente/numerosHab.ts`.
- Criar: `scripts/test-serpente-hab.mjs`.

**Interfaces:**
- **Produz** (usado por todas as tarefas seguintes):

  ```ts
  // tipos.ts
  export type Cor = 'ciano' | 'verde' | 'laranja';
  export interface Ponto { x: number; y: number }
  export type RGB = readonly number[];
  export type Put = (x: number, y: number, c: RGB, a?: number) => void;
  export type NomeHab = 'chuva' | 'raio' | 'gas';
  export type FormaHab = 'A' | 'B' | 'C' | 'fusao';
  export type Variacao = 'mirado' | 'leque' | 'cerco';
  ```

  `numerosHab.ts` exporta `HAB` e as funções do Passo 3.

**Passos:**

- [ ] **Passo 1: Escrever o teste que falha.** `scripts/test-serpente-hab.mjs`:

  ```js
  // The serpent's skills, the pure part (`src/entities/serpente/`): the numbers, the clock sums, the dice, the shots'
  // geometry, the missiles' slots. Later tasks append their own sections (the pixel layer, the beam's geometry, the
  // thermometer, and the ORACLES: the port of the beam and the gas against the approved mock's own logs).
  //   node scripts/test-serpente-hab.mjs
  import { HAB, cruza, porQuadro, chance, gerador, rodizio, alvosDoCerco, angulosDoLeque, vagasDosCasulos, inicioDoVao } from '../src/entities/serpente/numerosHab.ts';

  let falhas = 0;
  const ok = (c, m) => { console.log(c ? 'ok  ' : 'FALHA', m); if (!c) falhas++; };

  // the clock: the mock's 1.3 s lands exactly on a frame of the 0.6 + k/30 grid — it must fire once, not zero or twice
  {
    let n = 0;
    for (let k = 0; k < 60; k++) { const t = k / 30 - 0.6; if (cruza(t, t + 1 / 30, 1.3 - 0.6)) n++; }
    ok(n === 1, `cruza: 0,7 s na grade da maquete dispara uma vez (${n})`);
    let m = 0;
    for (let t = 0; t < 2; t += 1 / 60) if (cruza(t, t + 1 / 60, 1.0)) m++;
    ok(m === 1, `cruza: a 60 quadros/s também uma vez (${m})`);
  }
  // per-frame quantities: at dt = 1/30 they are the mock's; two 1/60 steps make one 1/30 step
  ok(porQuadro(1 / 30) === 1 && chance(0.6, 1 / 30) === 0.6, 'a 30 quadros/s, o porte é a maquete');
  {
    const f = 0.35, um = chance(f, 1 / 30), meio = chance(f, 1 / 60);
    ok(Math.abs(1 - (1 - meio) * (1 - meio) - um) < 1e-12, 'duas frações de 1/60 = uma de 1/30');
  }
  // the dice are the mock's LCG
  {
    const g = gerador(7);
    let s = 7;
    const mock = () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
    let iguais = true;
    for (let i = 0; i < 100; i++) if (g() !== mock()) iguais = false;
    ok(iguais, 'o gerador é o LCG da maquete');
  }
  // the cycle: A rain → beam → gas; B rain → gas; C and the fusion keep today's patterns
  ok(HAB.ciclo.A.join() === 'chuva,raio,gas' && HAB.ciclo.B.join() === 'chuva,gas' && HAB.ciclo.C.length === 0, 'o ciclo de cada forma');
  ok(rodizio(['a', 'b', 'c'], 4) === 'b', 'o rodízio');
  // the encirclement: two shots, 22 px above and below the ship — the middle is the safe place
  {
    const [cima, baixo] = alvosDoCerco({ x: 80, y: 100 });
    ok(cima.y === 78 && baixo.y === 122 && cima.x === 80, 'o cerco mira 22 px acima e abaixo da nave');
    const meiaCaixa = HAB.tiros.caixa.h / 2, meiaNave = 4.5;
    ok(22 - meiaCaixa - meiaNave > 8, `o cerco erra quem fica no meio (folga ${(22 - meiaCaixa - meiaNave).toFixed(1)} px)`);
  }
  // the venom fan: 3 shots over 30°, the middle one on the aim
  {
    const a = angulosDoLeque(1.0, 3, 30);
    ok(a.length === 3 && Math.abs(a[1] - 1.0) < 1e-12 && Math.abs(a[2] - a[0] - Math.PI / 6) < 1e-12, 'o leque: 3 gotas em 30°, a do meio na mira');
  }
  // the rain: 10 slots of 22 px in front of her, a gap of 3 that walks one slot per wave, always inside
  {
    const xs = vagasDosCasulos(3);
    ok(xs.length === 7 && xs.every((x) => x <= 212) && !xs.includes(14 + 3 * 22) && !xs.includes(14 + 5 * 22), 'uma onda: 7 casulos, o vão de 3 vagas');
    let dentro = true;
    for (let s = 1; s < 500; s++) {
      const g = gerador(s), { inicio, passo } = inicioDoVao(g, 3);
      for (let j = 0; j < 3; j++) { const v = inicio + passo * j; if (v < 1 || v + 3 > 9) dentro = false; }
    }
    ok(dentro, 'o vão sorteado anda uma vaga por onda e nunca sai das vagas de dentro');
  }

  if (falhas) { console.log(`\n${falhas} falha(s)`); process.exit(1); }
  console.log('\ntudo certo');
  ```

- [ ] **Passo 2: Rodar e ver falhar.** `node scripts/test-serpente-hab.mjs`. Esperado: erro de import
  (`numerosHab.ts` não existe).

- [ ] **Passo 3: Escrever `tipos.ts` (o bloco acima) e `numerosHab.ts`:**

  ```ts
  /**
   * THE SERPENT'S SKILLS — the numbers and the pure sums (spec `2026-11-02-serpente-habilidades-instalacao-design.md`).
   * Every number is the approved mock's (`scripts/_serpente/_habilidades-maquete.mjs`, rounds 1–14) unless the spec gives
   * one. The mock runs at 30 frames/s; the port keeps its numbers and converts its per-frame quantities (`porQuadro`,
   * `chance`). Without Phaser: `scripts/test-serpente-hab.mjs` runs it in Node.
   */
  import type { Cor, FormaHab, NomeHab, Ponto, Variacao } from './tipos';

  export const FPS_MAQUETE = 30;

  export const HAB = {
    /** the skills of each form, in order (the head that dies takes its skill with it) */
    ciclo: { A: ['chuva', 'raio', 'gas'], B: ['chuva', 'gas'], C: [], fusao: [] } as Record<FormaHab, NomeHab[]>,
    /** between two skills: this long, with a common shot at each of `tiros` (s from the pause's start) */
    pausa: { dur: 2.4, tiros: [0.6, 1.6] },
    /** a skill starts on her low post (the mock's `POSTO`, y 142); she goes down to it within `desce` s */
    desce: 0.4,
    /** a skill whose head died dissolves in this long */
    aborta: 0.5,
    /** the gas counter takes this share of the form's HP */
    contra: 0.15,
    /** the pixel layer's two canvases: over her body, and under the ship (the ship is at depth 1, her at 30, the lip 35) */
    profundidade: { cima: 36, baixo: 0.9 },
    tiros: {
      variacoes: { A: ['mirado', 'leque', 'cerco'], B: ['mirado', 'leque', 'cerco'] } as Record<'A' | 'B', Variacao[]>,
      /** today's aimed shot: one head in turn, ±0.35 rad, 140 px/s */
      mirado: { vel: 140, desvio: 0.35, ordem: { A: ['ciano', 'verde', 'laranja'], B: ['verde', 'laranja'] } as Record<'A' | 'B', Cor[]> },
      leque: { n: 3, abertura: 30, vel: 105 },
      /** the pairs take turns (his: "No 'cerco' elas se revezam na dupla de ataque conjunto") */
      cerco: {
        afasta: 22,
        vel: 140,
        pares: { A: [['ciano', 'verde'], ['verde', 'laranja'], ['ciano', 'laranja']], B: [['verde', 'laranja']] } as Record<'A' | 'B', [Cor, Cor][]>,
      },
      /** the collision box: today's (`bolt2`'s 13×9 frame at 0.9) — the pool sprite keeps today's texture and scale */
      caixa: { w: 13 * 0.9, h: 9 * 0.9 },
      /** the shot leaves at the gesture's action frame (the joined clip's 2, 9, 16 = each set's frame 2), clips at 12 fps */
      acao: 2,
      fpsGesto: 12,
      /** the C (today's): the aimed burst and the fan, with the ember */
      C: { rajada: { n: 3, vel: 175, cada: 2.1, entre: 0.12 }, leque: { n: 4, abertura: 40, vel: 150, cada: 3.4 } },
    },
    chuva: {
      /** each living head spits a salvo of 9, 0.022 s apart, up and out (35° to the left, ±16°, a hair of luck) */
      salva: { n: 9, entre: 0.022, inclina: 35, abre: 4, sorte: 3, vel: 280 },
      /** the waves: 0.55 s after the spit, 0.6 s apart; 10 slots of 22 px from x 14 (all in front of her), a gap of 3 */
      ondas: { depois: 0.55, entre: 0.6, de: 14, passo: 22, vagas: 10, vao: 3 },
      /** the engine pushes them down from rest (px/s²); they burst on the hull */
      acel: 160,
      /** the box along the flight: falling 7×11, rising (diagonal) 9×9 */
      caixa: { desce: { w: 7, h: 11 }, sobe: { w: 9, h: 9 } },
      /** the A's gesture (`chuvaM2`, 16 frames at 12 fps): the salvo leaves at its strike frame */
      acaoA: 9,
    },
  } as const;

  /** this step [t0, t1) crosses the instant tx (a hair of slack: an instant on a frame boundary fires once — the mock's fix) */
  export function cruza(t0: number, t1: number, tx: number): boolean {
    return t1 >= tx - 1e-9 && t0 < tx - 1e-9;
  }

  /** how many mock frames this step is */
  export function porQuadro(dt: number): number {
    return dt * FPS_MAQUETE;
  }

  /** a per-frame chance (or fraction) of the mock, for a step of `dt` */
  export function chance(p: number, dt: number): number {
    const k = porQuadro(dt);
    return k === 1 ? p : 1 - Math.pow(1 - p, k);
  }

  /** the mock's die (an LCG): `gerador(7)` is its `acaso`, `gerador(99)` its `visual` */
  export function gerador(semente: number): () => number {
    let s = semente >>> 0;
    return () => (s = (Math.imul(s, 1103515245) + 12345) >>> 0) / 4294967296;
  }

  export function rodizio<T>(lista: readonly T[], k: number): T {
    return lista[((k % lista.length) + lista.length) % lista.length];
  }

  /** the encirclement's two aim points: above and below the ship */
  export function alvosDoCerco(nave: Ponto): [Ponto, Ponto] {
    const d = HAB.tiros.cerco.afasta;
    return [{ x: nave.x, y: nave.y - d }, { x: nave.x, y: nave.y + d }];
  }

  /** n angles over `aberturaDeg`, centred on `centro` (rad) */
  export function angulosDoLeque(centro: number, n: number, aberturaDeg: number): number[] {
    const ab = (aberturaDeg * Math.PI) / 180;
    return Array.from({ length: n }, (_, i) => centro + (n === 1 ? 0 : i / (n - 1) - 0.5) * ab);
  }

  /** one wave's missiles: the slots' x, with the gap of `vao` slots starting at slot `inicio` */
  export function vagasDosCasulos(inicio: number): number[] {
    const O = HAB.chuva.ondas, xs: number[] = [];
    for (let s = 0; s < O.vagas; s++) if (s < inicio || s >= inicio + O.vao) xs.push(O.de + s * O.passo);
    return xs;
  }

  /** the first wave's gap and the way it walks (±1 slot per wave), drawn so every wave's gap stays in the inner slots */
  export function inicioDoVao(sorte: () => number, ondas: number): { inicio: number; passo: 1 | -1 } {
    const O = HAB.chuva.ondas, max = O.vagas - 1 - O.vao; // the gap's last start (slot 9 is the edge)
    const passo: 1 | -1 = sorte() < 0.5 ? 1 : -1;
    const lo = passo === 1 ? 1 : 1 + (ondas - 1), hi = passo === 1 ? max - (ondas - 1) : max;
    return { inicio: lo + Math.floor(sorte() * (hi - lo + 1)), passo };
  }
  ```

- [ ] **Passo 4: Rodar e ver passar.** `node scripts/test-serpente-hab.mjs` → `tudo certo`. Depois `npm run typecheck` →
  sem erros.

- [ ] **Passo 5: Relatar** os arquivos criados.

---

### Tarefa 4: O instalador (os conjuntos, as medidas, as luzes, as veias, os projéteis)

**Arquivos:**
- Criar: `scripts/_serpente/_hab-instalar.mjs`.
- Gera: `public/sprites/serpente-hab/*.png`, `src/entities/serpente/gestosHab.ts`,
  `src/entities/serpente/projeteisHab.ts` e `$F/conferencia-<conj>.png`.
- Modificar: `scripts/test-serpente-hab.mjs` (a seção de `gestosHab`).

**Interfaces:**
- **Consome:**
  - os quadros de `$M/cru2/tirosK-limpo/` (0–21) e `$M/cru2/chuvaM2/` (16);
  - `$M/cru3/cabeca-raio/` e `$M/cru3/cabeca-gas/`, com o `pontos.json` de cada um;
  - os quadros das Tarefas 1 e 2;
  - `$M/projeteis/tiro-B/` e `$M/projeteis/missil-B/`;
  - os idles `public/sprites/serpente-anim-<i>.png` e `serpente-2c-anim-<i>.png`.
- **Produz `gestosHab.ts`:**

  ```ts
  import type { Cor, Ponto } from './tipos';
  export type ChaveConjunto =
    | 'tiroA' | 'tiroC' | 'tiroB' | 'chuvaA' | 'cercoCV' | 'cercoVL' | 'cercoCL'
    | 'raioFechada' | 'raioAberta' | 'raioAbre' | 'raioRecupera'
    | 'gasAbreA' | 'gasSopraA' | 'gasCargaA' | 'gasBoteA' | 'gasFechaA' | 'gasEncolheA'
    | 'gasAbreB' | 'gasSopraB' | 'gasCargaB' | 'gasBoteB' | 'gasFechaB' | 'gasEncolheB';
  export interface ConjuntoHab {
    forma: 'A' | 'B';
    quadros: number;
    /** the art's centre in the 256² frame, as a fraction (the sprite's origin while the set plays) */
    origem: Ponto;
    /** art px from the art's centre, per frame (null: that frame has none — the jaws shut) */
    bocas: Partial<Record<Cor, (Ponto | null)[]>>;
    olho?: (Ponto | null)[];
    /** the VULNERABLE head's skull per frame (the hit circle and the veins follow it) */
    cranio: Ponto[];
    /** the beam sets: which frames are raised / middle / lowered */
    faixa?: { cima: number; meio: number; baixo: number };
    /** the clips' action frame (the shot or the salvo leaves there) */
    acao?: number;
    /** which heads' light masks this set has (`serpenteHabLuz_<cor>_<chave>`) */
    luzes: Cor[];
    /** the other living heads (the `Sombra` sheet exists) */
    sombra: boolean;
  }
  export const CONJUNTOS: Record<ChaveConjunto, ConjuntoHab>;
  /** the idle per form: its mouths (art px, the frame-0 ones) and, for the A, their per-frame shift (`BOCA_IDLE`) */
  export const IDLE_HAB: Record<'A' | 'B', { anim: string; bocas: Partial<Record<Cor, Ponto>>; desvio: Partial<Record<Cor, Ponto[]>>; luzes: Cor[]; quadro: { w: number; h: number } }>;
  ```

  As folhas (8 colunas, quadros de 256²) e as chaves de textura:
  - `serpente-hab/<chave>.png` → `serpenteHab_<chave>`;
  - `<chave>-veias.png` → `serpenteHabVeias_<chave>`;
  - `<chave>-sombra.png` → `serpenteHabSombra_<chave>`;
  - `<chave>-luz-<cor>.png` → `serpenteHabLuz_<cor>_<chave>`;
  - as luzes do idle: `idle<F>-luz-<cor>.png` → `serpenteHabLuz_<cor>_idle<F>`, em quadros do tamanho do idle.

- **Produz `projeteisHab.ts`:**

  ```ts
  import type { Cor } from './tipos';
  export interface SpriteRGBA { w: number; h: number; px: readonly number[] }
  export const TIROS: Record<Cor, { fps: number; rastro: 'pinga' | 'fumaca' | null; quadros: SpriteRGBA[] }>;
  export const CASULOS: Record<Cor, { fps: number; quadros: SpriteRGBA[] }>;
  ```

**Passos:**

- [ ] **Passo 1: Escrever a seção de teste que falha** (no fim de `test-serpente-hab.mjs`, antes do resumo):

  ```js
  // ─── the installed sets (`gestosHab.ts`, generated by `_hab-instalar.mjs`) ───
  {
    const { CONJUNTOS, IDLE_HAB } = await import('../src/entities/serpente/gestosHab.ts');
    const fs = await import('node:fs');
    const { default: sharp } = await import('sharp');
    for (const [k, c] of Object.entries(CONJUNTOS)) {
      const n = c.quadros;
      const tamOk = Object.values(c.bocas).every((l) => l.length === n) && c.cranio.length === n && (!c.olho || c.olho.length === n);
      const arq = `public/sprites/serpente-hab/${k}.png`;
      const meta = fs.existsSync(arq) ? await sharp(arq).metadata() : null;
      const folhaOk = meta && meta.width === 8 * 256 && meta.height === Math.ceil(n / 8) * 256;
      const c0 = c.cranio[0];
      const perto = c.cranio.every((p) => Math.hypot(p.x - c0.x, p.y - c0.y) < 70);
      ok(n > 0 && tamOk && folhaOk && perto, `${k}: ${n} quadros, as medidas por quadro, a folha ${meta?.width}×${meta?.height}, o crânio perto do quadro 0`);
      if (c.acao != null) ok(Object.values(c.bocas).some((l) => l[c.acao]), `${k}: há boca no quadro de ação ${c.acao}`);
    }
    ok(IDLE_HAB.A.desvio.ciano?.length === 9, 'o idle da A: o desvio das bocas por quadro (9)');
  }
  ```

  O arquivo vira um módulo com `await` no topo. Ele já é `.mjs`, então funciona.

- [ ] **Passo 2: Rodar e ver falhar:** o import de `gestosHab.ts` não existe.

- [ ] **Passo 3: Medir à mão o que os scripts não sabem**, na grade 3× (`$F/grade-<conj>.png`, gerada por um modo
  `grade` do instalador: o quadro ampliado com a régua a cada 8 px). Anotar no instalador, na tabela `MAO`:
  - **as bocas da `chuvaA` no quadro 9:** as três bocas, em px do quadro de 256²;
  - **o quadro de ação de cada cerco** (as duas bocas mais abertas) e as duas bocas nele;
  - **as regiões das luzes da B** (a cabeça e o pescoço da verde e da laranja, retângulos no quadro de 256² da B),
    no lugar das regiões da A, que eram:
    - azul: x < 90, y < 140;
    - verde: 80 < x < 165, y < 160;
    - laranja: x > 135, y < 150.

- [ ] **Passo 4: Escrever `_hab-instalar.mjs`.** Uso: `node scripts/_serpente/_hab-instalar.mjs [grade]`. Estrutura:

  ```js
  // 02/11 — THE SKILLS' ART INSTALLED (spec `2026-11-02-serpente-habilidades-instalacao-design.md` §4): every set of the
  // fight (the shot clips, the rain's, the encirclement's, the beam's head, the gas heads of the A and the B) as one
  // sheet per set (8 columns of 256² frames) in `public/sprites/serpente-hab/`, with, per frame: the living mouths, the
  // cyan's eye, the VULNERABLE head's skull (art px from the art's centre), the light masks (the mock's own colour tests,
  // `quadro`'s `acende`), and the live head's veins and the other heads' shadow (as `_erguer-instalar.mjs`). Also the
  // projectiles' pixels (`projeteisHab.ts`) and a zoomed check sheet per set.
  //   node scripts/_serpente/_hab-instalar.mjs [grade]
  ```

  As tabelas e as funções:

  1. **`CENTRO`:**
     - A: (137, 133);
     - B: (137, 13 + 243/2), igual a `ERGUER.B.origem` × 256.
  2. **`FONTES`**, uma linha por chave: a forma; a lista de arquivos de origem; o tipo (`'clipe' | 'raio' | 'gas'`);
     as cabeças vivas; a vulnerável.
     - `tiroA` = `tirosK-limpo/0..7`;
     - `tiroC` = `tirosK-limpo/0` + `8..14`;
     - `tiroB` = `tirosK-limpo/0` + `15..21`;
     - `chuvaA` = `chuvaM2/0..15`;
     - `cercoXX` = `$F/cru/cerco-xx/*`;
     - `raio*` = `cru3/cabeca-raio/<conj>/*`;
     - `gas*A` = `cru3/cabeca-gas/<conj>/*`;
     - `gas*B` = `$F/cru/gasB/<conj>/*`.
  3. **`segue(quadros, p0, r = 6, busca = 8)`** (o rastreador). Para cada quadro seguinte, o deslocamento ±`busca`
     que minimiza a soma das diferenças RGBA do retalho (2r+1)² em volta do ponto anterior. Depois, um ponto que salta
     mais de 10 px dos dois vizinhos vira a média deles.
  4. **As bocas e o crânio por tipo, em px de arte:**
     - **`raio`:** do `pontos.json`, `boca` e `olho` menos `CENTRO.A`. O crânio é `olho + (17, 3,5)`. Esse é o
       deslocamento olho→crânio da pose aprovada: o olho de `abre[0]`, (36; 51,5), é a arte (−101; −81,5), e o crânio
       de `ERGUER.A.cabeca[0]` é (−84; −78).
     - **`gas*A`:** a fórmula da maquete (linhas 110–118), `BOCAS[cor] + (p − p0)` com `p0 = pontos.abre[cor][0]`.
       O crânio da azul é `ERGUER.A.cabeca[0] + (boca azul − boca azul do quadro 0)`.
     - **`gas*B`:** `segue()` a partir das bocas e do crânio da verde do quadro 0. Esses vêm de
       `ERGUER.B.inicio.bocas` e `ERGUER.B.cabeca[0]`, mais o `CENTRO.B`, nas coordenadas do quadro.
     - **`clipe`:** `segue()` a partir das bocas do idle (`BOCAS` da maquete, linha 94, + `CENTRO.A`) e do crânio da
       azul (`ERGUER.A.cabeca[0]` + `CENTRO.A`). Depois, a tabela `MAO` sobrescreve o quadro de ação:
       - `tiroA`: azul (26, 84), no quadro `acao: 2`;
       - `tiroC`: laranja (106, 98), no quadro 2;
       - `tiroB`: verde (64, 85), no quadro 2;
       - `chuvaA`: as três bocas medidas, no quadro 9;
       - os cercos: as do Passo 3.
  5. **As máscaras de luz por quadro.** O teste de cor da maquete (linhas 189–206), aplicado à cor com a correção da
     maquete (`r·0,91`, `g·0,99`, `b`), dentro da região da cabeça (as da A, em px do quadro de 256²; as da B, do
     Passo 3):
     - nos `raio*`: só a azul;
     - nos `gas*`: a verde e a laranja;
     - no idle A: as três, com o idle posto num quadro com o centro em (137, 133), para as regiões baterem;
     - no idle B: a verde e a laranja.

     Saída: o pixel branco opaco onde a luz acende; o resto, transparente.
  6. **As veias e a sombra.** O laço das linhas 50–108 de `_erguer-instalar.mjs` (o `MATIZ`, `hsv`, `doMatiz`, o
     `RAIO` 40, o `CORTE` 20), com o crânio da vulnerável do quadro e as outras cabeças vivas do conjunto.
  7. **`folha(quadros, arq)`:** compõe os quadros de 256² em 8 colunas (`sharp().composite`) e grava.
  8. **`projeteisHab.ts`:** lê `tiro-B/<cor>-<i>.png` e `missil-B/<cor>-<i>.png` e o `meta.json` de cada (o fps, o
     rastro) e escreve os RGBA como listas de números.
  9. **`gestosHab.ts`:** escreve `CONJUNTOS` e `IDLE_HAB`, como no Passo 4 de `_erguer-instalar.mjs` (linhas 137–158).
     Ele tem o cabeçalho "generated by `_hab-instalar.mjs`, do not edit by hand".

     O `IDLE_HAB.A` leva:
     - as `BOCAS` da maquete (linha 94);
     - o `desvio` = `BOCA_IDLE` (linhas 101–105);
     - `anim: 'serpente-idle'`;
     - o quadro de 238×246.

     O `IDLE_HAB.B` leva:
     - as bocas do quadro 0 (`ERGUER.B.inicio.bocas`, o primeiro par);
     - o desvio zero nos 9 quadros (Correção 6);
     - `anim: 'serpente-2c-idle'`;
     - o quadro do idle da B.
  10. **`conferencia-<chave>.png`:** todos os quadros ×2, com:
      - a arte escurecida;
      - as bocas como pontos na cor da cabeça;
      - o olho branco;
      - o crânio num anel;
      - as luzes tingidas;
      - as veias em cor e a sombra em cinza.

- [ ] **Passo 5: Rodar.**
  1. `node scripts/_serpente/_hab-instalar.mjs`.
  2. **Abrir cada `conferencia-*.png` AMPLIADA:**
     - a boca segue a boca em todos os quadros;
     - o crânio fica no crânio;
     - as luzes só na cabeça certa;
     - as veias só na cabeça viva.
  3. Onde o rastreador errar, acrescentar a correção na tabela `MAO` (quadro → ponto) e rodar de novo.

- [ ] **Passo 6: Rodar o teste.** `node scripts/test-serpente-hab.mjs` → `tudo certo`.

- [ ] **Passo 7: Relatar** os arquivos. `public/sprites/serpente-hab/` é arte nova do jogo e pode entrar no commit dele.
  `$F/conferencia-*` fica com a folha.

---

### Tarefa 5: A camada de pixels

**Arquivos:**
- Criar: `src/entities/serpente/pixels.ts` (puro) e `src/entities/serpente/camadaPixels.ts`.
- Modificar: `scripts/test-serpente-hab.mjs`.

**Interfaces:**
- **Produz:**

  ```ts
  // pixels.ts
  export const W = 384, H = 216;
  export function sobre(buf: Uint8ClampedArray, i: number, c: RGB, a: number): void;
  export class Lona {
    readonly cima: Uint8ClampedArray; readonly baixo: Uint8ClampedArray; readonly corpo: Uint8Array;
    sujou: boolean;
    limpar(): void;
    put: Put; // routes each pixel by `corpo`
  }
  // camadaPixels.ts
  export class CamadaPixels {
    constructor(scene: Phaser.Scene);
    readonly put: Put;
    inicio(): void;                       // clears both canvases (only if something was drawn last frame)
    marcarCorpo(ela: Phaser.GameObjects.Sprite, extras: readonly Phaser.GameObjects.Image[]): void;
    bordaEsq(y: number): number;          // her left edge on screen row y (W when she is not on it)
    fim(): void;                          // uploads the canvases that changed
    destroy(): void;
  }
  ```

**Passos:**

- [ ] **Passo 1: Escrever o teste que falha** (a seção nova):

  ```js
  // ─── the pixel layer: "over" onto a transparent layer, composited onto the scene, is the mock's blend onto the scene ───
  {
    const { sobre, Lona, W } = await import('../src/entities/serpente/pixels.ts');
    const g = gerador(3);
    let pior = 0;
    for (let n = 0; n < 2000; n++) {
      const fundo = [g() * 255, g() * 255, g() * 255].map(Math.round);
      const mock = [...fundo], camada = new Uint8ClampedArray(4);
      for (let k = 0; k < 4; k++) {
        const c = [g() * 255, g() * 255, g() * 255].map(Math.round), a = g() < 0.3 ? 1 : g();
        for (let q = 0; q < 3; q++) mock[q] = Math.round(a >= 1 ? c[q] : mock[q] + (c[q] - mock[q]) * a);
        sobre(camada, 0, c, a);
      }
      const la = camada[3] / 255;
      for (let q = 0; q < 3; q++) pior = Math.max(pior, Math.abs(camada[q] * la + fundo[q] * (1 - la) - mock[q]));
    }
    ok(pior <= 2, `a camada composta = a mistura da maquete (pior diferença ${pior.toFixed(2)} níveis)`);
    const l = new Lona();
    l.corpo[10 * W + 20] = 1;
    l.put(20, 10, [255, 0, 0]); l.put(21, 10, [0, 255, 0], 0.5);
    ok(l.cima[(10 * W + 20) * 4] === 255 && l.baixo[(10 * W + 20) * 4 + 3] === 0 && l.baixo[(10 * W + 21) * 4 + 1] === 255 && l.baixo[(10 * W + 21) * 4 + 3] === 128,
      'sobre o corpo dela vai para a lona de cima; fora, para a de baixo');
    l.put(-1, 5, [1, 1, 1]); l.put(384, 5, [1, 1, 1]); l.put(5.4, 2.6, [9, 9, 9]);
    ok(l.baixo[(3 * W + 5) * 4] === 9, 'arredonda x e y como a maquete, e ignora fora da tela');
  }
  ```

  Ponha o import de `gerador` no topo do arquivo, junto dos da Tarefa 3.

- [ ] **Passo 2: Rodar e ver falhar** (o `pixels.ts` não existe).

- [ ] **Passo 3: Escrever `pixels.ts`:**

  ```ts
  /**
   * THE PIXEL LAYER, the pure part. The mock blends every effect onto the finished frame (`put`: out = out + (c − out)·a).
   * In the game the effects live on their own transparent canvases, composited over the scene: `sobre` is Porter-Duff
   * "over" with straight alpha, which composites to the same colour. Two canvases (see `HAB.profundidade`): a pixel over
   * HER BODY (or the breach lip) goes to the upper one, over her; any other to the lower one, under the ship — the
   * mock's order (scene, her, lip, effects, ship on top).
   */
  import type { Put, RGB } from './tipos';

  export const W = 384, H = 216;

  export function sobre(buf: Uint8ClampedArray, i: number, c: RGB, a: number): void {
    if (!(a > 0)) return;
    if (a >= 1) {
      buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
      return;
    }
    const da = buf[i + 3] / 255, oa = a + da * (1 - a);
    for (let q = 0; q < 3; q++) buf[i + q] = Math.round((c[q] * a + buf[i + q] * da * (1 - a)) / oa);
    buf[i + 3] = Math.round(oa * 255);
  }

  export class Lona {
    readonly cima = new Uint8ClampedArray(W * H * 4);
    readonly baixo = new Uint8ClampedArray(W * H * 4);
    /** 1 where her body (or the breach lip) is opaque this frame */
    readonly corpo = new Uint8Array(W * H);
    /** something was drawn since the last clear */
    sujou = false;

    limpar(): void {
      this.cima.fill(0);
      this.baixo.fill(0);
      this.sujou = false;
    }

    readonly put: Put = (x, y, c, a = 1) => {
      x = Math.round(x);
      y = Math.round(y);
      if (x < 0 || x >= W || y < 0 || y >= H) return;
      const j = y * W + x;
      sobre(this.corpo[j] ? this.cima : this.baixo, j * 4, c, a);
      this.sujou = true;
    };
  }
  ```

- [ ] **Passo 4: Escrever `camadaPixels.ts`:**

  ```ts
  /** THE PIXEL LAYER in Phaser: the two canvases of `Lona` as CanvasTextures, and HER BODY's mask on screen each frame. */
  import Phaser from 'phaser';
  import { HAB } from './numerosHab';
  import { H, Lona, W } from './pixels';
  import type { Put } from './tipos';

  export class CamadaPixels {
    private readonly lona = new Lona();
    private readonly tex: { cima: Phaser.Textures.CanvasTexture; baixo: Phaser.Textures.CanvasTexture };
    private readonly img: Phaser.GameObjects.Image[] = [];
    private readonly dado: { cima: ImageData; baixo: ImageData };
    /** each texture frame's alpha (≥128), read once */
    private readonly alfas = new Map<string, Uint8Array>();
    private readonly esq = new Int16Array(H).fill(W);
    private sujouAntes = false;
    private caixa = { x0: 0, y0: 0, x1: 0, y1: 0 };
    readonly put: Put;

    constructor(private readonly scene: Phaser.Scene) {
      const nova = (k: string): Phaser.Textures.CanvasTexture => {
        if (scene.textures.exists(k)) scene.textures.remove(k);
        return scene.textures.createCanvas(k, W, H)!;
      };
      this.tex = { cima: nova('serpenteHabCima'), baixo: nova('serpenteHabBaixo') };
      this.dado = { cima: this.tex.cima.context.createImageData(W, H), baixo: this.tex.baixo.context.createImageData(W, H) };
      for (const [k, d] of [['serpenteHabCima', HAB.profundidade.cima], ['serpenteHabBaixo', HAB.profundidade.baixo]] as const)
        this.img.push(scene.add.image(0, 0, k).setOrigin(0, 0).setDepth(d).setScrollFactor(0));
      this.put = this.lona.put;
    }

    inicio(): void {
      if (this.lona.sujou || this.sujouAntes) this.lona.limpar();
    }

    /** her opaque pixels on screen (nearest, as `pixelArt` + `roundPixels` draws her), plus the extras (the lip) */
    marcarCorpo(ela: Phaser.GameObjects.Sprite, extras: readonly Phaser.GameObjects.Image[]): void {
      const { corpo } = this.lona, c = this.caixa;
      for (let y = c.y0; y < c.y1; y++) corpo.fill(0, y * W + c.x0, y * W + c.x1);
      this.esq.fill(W);
      c.x0 = W; c.y0 = H; c.x1 = 0; c.y1 = 0;
      const marca = (o: Phaser.GameObjects.Image | Phaser.GameObjects.Sprite, borda: boolean): void => {
        if (!o.visible || !o.active) return;
        const f = o.frame, a = this.alfa(f), sx = o.scaleX, sy = o.scaleY;
        const x0 = Math.round(o.x - o.displayOriginX * sx), y0 = Math.round(o.y - o.displayOriginY * sy);
        const w = Math.round(f.cutWidth * sx), h = Math.round(f.cutHeight * sy);
        for (let Y = Math.max(0, y0); Y < Math.min(H, y0 + h); Y++) {
          const fy = Math.floor((Y + 0.5 - y0) / sy);
          for (let X = Math.max(0, x0); X < Math.min(W, x0 + w); X++) {
            if (!a[fy * f.cutWidth + Math.floor((X + 0.5 - x0) / sx)]) continue;
            corpo[Y * W + X] = 1;
            if (borda && X < this.esq[Y]) this.esq[Y] = X;
          }
        }
        c.x0 = Math.min(c.x0, Math.max(0, x0)); c.y0 = Math.min(c.y0, Math.max(0, y0));
        c.x1 = Math.max(c.x1, Math.min(W, x0 + w)); c.y1 = Math.max(c.y1, Math.min(H, y0 + h));
      };
      marca(ela, true);
      for (const e of extras) marca(e, false);
    }

    bordaEsq(y: number): number {
      return this.esq[Math.max(0, Math.min(H - 1, Math.round(y)))];
    }

    fim(): void {
      const sujou = this.lona.sujou;
      if (sujou || this.sujouAntes) {
        for (const k of ['cima', 'baixo'] as const) {
          this.dado[k].data.set(this.lona[k]);
          this.tex[k].context.putImageData(this.dado[k], 0, 0);
          this.tex[k].refresh();
        }
      }
      this.sujouAntes = sujou;
    }

    private alfa(f: Phaser.Textures.Frame): Uint8Array {
      const chave = `${f.texture.key}:${f.name}`;
      let a = this.alfas.get(chave);
      if (a) return a;
      const cv = document.createElement('canvas');
      cv.width = f.cutWidth; cv.height = f.cutHeight;
      const ctx = cv.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(f.source.image as CanvasImageSource, f.cutX, f.cutY, f.cutWidth, f.cutHeight, 0, 0, f.cutWidth, f.cutHeight);
      const d = ctx.getImageData(0, 0, f.cutWidth, f.cutHeight).data;
      a = new Uint8Array(f.cutWidth * f.cutHeight);
      for (let i = 0; i < a.length; i++) a[i] = d[i * 4 + 3] >= 128 ? 1 : 0;
      this.alfas.set(chave, a);
      return a;
    }

    destroy(): void {
      for (const i of this.img) i.destroy();
      this.scene.textures.remove('serpenteHabCima');
      this.scene.textures.remove('serpenteHabBaixo');
    }
  }
  ```

  ⚠️ O motor de destroços troca a textura dela por uma cópia furada. A chave do cache (`textura:quadro`) é a da
  cópia, e o furo entra na máscara, o que está certo.

- [ ] **Passo 5: Rodar.** `node scripts/test-serpente-hab.mjs` → `tudo certo`. `npm run typecheck` → sem erros.

- [ ] **Passo 6: Relatar.**

---

### Tarefa 6: Carregar e tocar (BootScene, tocador, luzes) + a sonda

**Arquivos:**
- Criar: `src/entities/serpente/tocador.ts`, `src/entities/serpente/luzes.ts`, `scripts/_serpente/_sonda-hab.mjs`.
- Modificar: `src/scenes/BootScene.ts`. A lista de carga fica perto da linha 678, e o registro das animações perto da
  linha 1517.

**Interfaces:**
- **Produz:**

  ```ts
  // tocador.ts
  export class Tocador {
    constructor(sprite: Phaser.GameObjects.Sprite, idleAnim: () => string);
    mostrar(chave: ChaveConjunto, i: number): void;           // stop the idle, show frame i, origin = the set's
    clipe(chave: ChaveConjunto, fps: number, aoQuadro?: (i: number) => void, aoFim?: () => void): void;
    update(dt: number): void;                                  // advances a clip
    idle(): void;                                              // the idle anim from its frame 0, origin 0.5
    get atual(): { chave: ChaveConjunto; i: number } | null;
  }
  // luzes.ts
  export class Luzes {
    constructor(scene: Phaser.Scene);
    atualizar(ela: Phaser.GameObjects.Sprite, folha: string | null, i: number, niveis: Partial<Record<Cor, number>>, tinta: number): void;
    destroy(): void;
  }
  ```

  A sonda: `node scripts/_serpente/_sonda-hab.mjs <modo> <out.json> [--forma A|B|C|fusao] [--hab chuva|raio|gas|tiros] [--filmar <dir>] [--ate <s>]`.

**Passos:**

- [ ] **Passo 1: Escrever a sonda com o modo `carga`, que falha.** A base é `_sonda-luta.mjs`:
  - as linhas 25–60: o Playwright, o `Math.random` fixo, o relógio por passos `pisa(n)`, o registry e a cena;
  - as linhas 58–75: o `damageShip` contado, com a nave intocável.

  O `scene.start('Game', …)` ganha `serpente: { forma, hab }`. No modo `carga`, depois do Menu:

  ```js
  const r = await page.evaluate(async () => {
    const { CONJUNTOS } = await import('/src/entities/serpente/gestosHab.ts');
    const t = window.__game.textures, falta = [];
    for (const [k, c] of Object.entries(CONJUNTOS)) {
      const folhas = [`serpenteHab_${k}`, `serpenteHabVeias_${k}`, ...(c.sombra ? [`serpenteHabSombra_${k}`] : []), ...c.luzes.map((cor) => `serpenteHabLuz_${cor}_${k}`)];
      for (const f of folhas) if (!t.exists(f) || t.get(f).frameTotal - 1 < c.quadros) falta.push(f);
    }
    for (const f of ['serpenteHabLuz_ciano_idleA', 'serpenteHabLuz_verde_idleA', 'serpenteHabLuz_laranja_idleA', 'serpenteHabLuz_verde_idleB', 'serpenteHabLuz_laranja_idleB'])
      if (!t.exists(f)) falta.push(f);
    return falta;
  });
  ok(r.length === 0, `carga: todas as folhas dos conjuntos carregadas (${r.length} faltando: ${r.slice(0, 5).join(', ')})`);
  ```

  Cada modo escreve `{ ok: boolean, linhas: string[], medidas: {...} }` em `<out.json>` e sai com código 1 se falhar.

- [ ] **Passo 2: Rodar e ver falhar** (com o `npm run dev` de pé). Rode
  `node scripts/_serpente/_sonda-hab.mjs carga <scratch>/carga.json`. Esperado: `FALHA carga … faltando`.

- [ ] **Passo 3: Carregar em `BootScene.preload`** (ao lado de onde os outros assets carregam):

  ```ts
  // THE SKILLS' SETS (02/11 — `scripts/_serpente/_hab-instalar.mjs`): one sheet of 256² frames (8 columns) per set, and
  // its veins, shadow and light masks; the idles' light masks at the idle's own frame size.
  for (const [k, c] of Object.entries(CONJUNTOS)) {
    const q = { frameWidth: 256, frameHeight: 256 };
    this.load.spritesheet(`serpenteHab_${k}`, `sprites/serpente-hab/${k}.png`, q);
    this.load.spritesheet(`serpenteHabVeias_${k}`, `sprites/serpente-hab/${k}-veias.png`, q);
    if (c.sombra) this.load.spritesheet(`serpenteHabSombra_${k}`, `sprites/serpente-hab/${k}-sombra.png`, q);
    for (const cor of c.luzes) this.load.spritesheet(`serpenteHabLuz_${cor}_${k}`, `sprites/serpente-hab/${k}-luz-${cor}.png`, q);
  }
  for (const F of ['A', 'B'] as const)
    for (const cor of IDLE_HAB[F].luzes)
      this.load.spritesheet(`serpenteHabLuz_${cor}_idle${F}`, `sprites/serpente-hab/idle${F}-luz-${cor}.png`, { frameWidth: IDLE_HAB[F].quadro.w, frameHeight: IDLE_HAB[F].quadro.h });
  ```

  Importe `CONJUNTOS` e `IDLE_HAB` de `'../entities/serpente/gestosHab'`. Antes, confira com
  `grep -n "this.load.image\|load.spritesheet" src/scenes/BootScene.ts` onde o `preload` carrega.

- [ ] **Passo 4: Escrever `tocador.ts`:**

  ```ts
  /**
   * HER SETS PLAYED ON HER SPRITE (02/11). A skill shows frame i of a set (its own clock decides which, as in the mock),
   * or plays a clip at N fps; back to the idle, the idle restarts on its frame 0 (every set ends on the approved frame,
   * which is the idle's frame 0). ⚠️ The idle anim is STOPPED before the texture changes (trap 26: without the stop
   * Phaser puts the old anim's frame back). ⚠️ The debris engine may swap her texture for a holed copy: the tocador
   * remembers what IT showed and never reads the key back from the sprite.
   */
  import Phaser from 'phaser';
  import { CONJUNTOS, type ChaveConjunto } from './gestosHab';

  export class Tocador {
    private agora: { chave: ChaveConjunto; i: number } | null = null;
    private toca: { chave: ChaveConjunto; fps: number; t: number; aoQuadro?: (i: number) => void; aoFim?: () => void } | null = null;

    constructor(private readonly sprite: Phaser.GameObjects.Sprite, private readonly idleAnim: () => string) {}

    get atual(): { chave: ChaveConjunto; i: number } | null {
      return this.agora;
    }

    mostrar(chave: ChaveConjunto, i: number): void {
      const c = CONJUNTOS[chave];
      i = Math.max(0, Math.min(c.quadros - 1, Math.round(i)));
      if (this.agora?.chave === chave && this.agora.i === i) return;
      if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
      this.sprite.setTexture(`serpenteHab_${chave}`, i);
      this.sprite.setOrigin(c.origem.x, c.origem.y);
      this.agora = { chave, i };
    }

    clipe(chave: ChaveConjunto, fps: number, aoQuadro?: (i: number) => void, aoFim?: () => void): void {
      this.toca = { chave, fps, t: 0, aoQuadro, aoFim };
      this.mostrar(chave, 0);
      aoQuadro?.(0);
    }

    update(dt: number): void {
      const p = this.toca;
      if (!p) return;
      const antes = Math.floor(p.t * p.fps);
      p.t += dt;
      const n = CONJUNTOS[p.chave].quadros, agora = Math.floor(p.t * p.fps);
      for (let i = antes + 1; i <= Math.min(agora, n - 1); i++) {
        this.mostrar(p.chave, i);
        p.aoQuadro?.(i);
      }
      if (agora >= n) {
        this.toca = null;
        this.idle();
        p.aoFim?.();
      }
    }

    idle(): void {
      this.toca = null;
      this.agora = null;
      this.sprite.setOrigin(0.5, 0.5);
      const a = this.idleAnim();
      if (this.sprite.scene.anims.exists(a)) this.sprite.play(a);
    }
  }
  ```

- [ ] **Passo 5: Escrever `luzes.ts`.** Os alvos e os pesos da maquete (linhas 189–206, 208):
  - azul (215, 245, 255) × 0,6;
  - verde (214, 255, 226) × 0,7;
  - laranja (255, 236, 196) × 0,8;
  - o clarão quente (255, 226, 190) × 0,32.

  ```ts
  /**
   * HER LIGHTS POWERING UP and the HOT FLASH (spec §4.4; the mock's `quadro`: `acende` and `tom`). The mock pulls her
   * light pixels toward a target colour by k·level; here a white mask per frame (baked by `_hab-instalar.mjs` with the
   * mock's own colour tests) is drawn over her, tint-filled with the target, at alpha k·level — the same blend. The hot
   * flash is her own frame, tint-filled warm, at alpha 0.32·tinta.
   */
  import Phaser from 'phaser';
  import type { Cor } from './tipos';

  const ALVO: Record<Cor, { cor: number; k: number }> = {
    ciano: { cor: 0xd7f5ff, k: 0.6 },
    verde: { cor: 0xd6ffe2, k: 0.7 },
    laranja: { cor: 0xffecc4, k: 0.8 },
  };

  export class Luzes {
    private readonly sprites: Record<Cor, Phaser.GameObjects.Image>;
    private readonly quente: Phaser.GameObjects.Image;

    constructor(scene: Phaser.Scene) {
      const novo = (): Phaser.GameObjects.Image => scene.add.image(0, 0, '__DEFAULT').setVisible(false);
      this.sprites = { ciano: novo(), verde: novo(), laranja: novo() };
      for (const c of ['ciano', 'verde', 'laranja'] as Cor[]) this.sprites[c].setTintFill(ALVO[c].cor);
      this.quente = novo().setTintFill(0xffe2be);
    }

    /** `folha`: the set's key (`raioAberta`…) or the idle's (`idleA`); null = no masks for this frame */
    atualizar(ela: Phaser.GameObjects.Sprite, folha: string | null, i: number, niveis: Partial<Record<Cor, number>>, tinta: number): void {
      const tex = ela.scene.textures;
      for (const c of ['ciano', 'verde', 'laranja'] as Cor[]) {
        const s = this.sprites[c], v = niveis[c] ?? 0, k = folha && `serpenteHabLuz_${c}_${folha}`;
        if (!ela.visible || v < 0.01 || !k || !tex.exists(k)) {
          s.setVisible(false);
          continue;
        }
        this.copiar(s, ela).setTexture(k, i).setAlpha(ALVO[c].k * v).setDepth(ela.depth + 0.15).setVisible(true);
      }
      if (!ela.visible || tinta < 0.01) this.quente.setVisible(false);
      else this.copiar(this.quente, ela).setTexture(ela.texture.key, ela.frame.name).setAlpha(0.32 * tinta).setDepth(ela.depth + 0.2).setVisible(true);
    }

    private copiar(s: Phaser.GameObjects.Image, ela: Phaser.GameObjects.Sprite): Phaser.GameObjects.Image {
      return s.setPosition(ela.x, ela.y).setOrigin(ela.originX, ela.originY).setScale(ela.scaleX, ela.scaleY).setFlipX(ela.flipX);
    }

    destroy(): void {
      for (const s of Object.values(this.sprites)) s.destroy();
      this.quente.destroy();
    }
  }
  ```

  O alvo azul (215, 245, 255) é `0xd7f5ff`; o verde (214, 255, 226), `0xd6ffe2`; o laranja (255, 236, 196),
  `0xffecc4`; o quente (255, 226, 190), `0xffe2be`.

- [ ] **Passo 6: Rodar a sonda** → `ok carga`. `npm run typecheck` → sem erros.

- [ ] **Passo 7: Relatar.**

---

### Tarefa 7: Os ganchos da cena e o atalho de dev

**Arquivos:**
- Modificar:
  - `src/entities/Boss.ts`: o `StageBoss`, depois de `perigos`, perto da linha 46;
  - `src/scenes/GameScene.ts`: o `create(data)`, perto da linha 315; a criação do chefão, perto da 1870; a mordida,
    perto da 955;
  - `src/systems/CartasEmJogo.ts`: perto da linha 111;
  - `src/entities/BossSerpente.ts`: a `ArenaSerpente` e o construtor;
  - `src/main.ts`.
- Criar: `src/entities/serpente/atalho.ts`.
- Modificar: `scripts/_serpente/_sonda-hab.mjs` (o modo `atalho`) e `scripts/test-serpente-hab.mjs`.

**Interfaces:**
- **Produz:**
  - `StageBoss.morde?(esq: number, dir: number, topo: number, base: number): boolean`;
  - `ArenaSerpente.balas(): readonly Phaser.Physics.Arcade.Sprite[]` e `ArenaSerpente.incendiario(): boolean`;
  - `CartasEmJogo.temIncendiario: boolean`;
  - `DevSerpente { forma: FormaHab; hab: NomeHab | 'tiros' | null }`;
  - `lerAtalho(qs: URLSearchParams): DevSerpente | null`;
  - o 6º parâmetro do `BossSerpente`, `dev: DevSerpente | null`.

**Passos:**

- [ ] **Passo 1: O teste que falha** (puro, a seção nova):

  ```js
  // ─── the dev shortcut ───
  {
    const { lerAtalho } = await import('../src/entities/serpente/atalho.ts');
    const a = lerAtalho(new URLSearchParams('?serpente=B&hab=gas'));
    ok(a?.forma === 'B' && a.hab === 'gas' && lerAtalho(new URLSearchParams('?serpente=Z')) === null && lerAtalho(new URLSearchParams('?serpente=A'))?.hab === null,
      'o atalho lê a forma e a habilidade, e ignora o resto');
  }
  ```

  E o modo `atalho` na sonda:
  1. `scene.start` com `serpente: { forma: 'B', hab: 'tiros' }`;
  2. pisar até `!boss.entering` (no máximo 3000 passos);
  3. esperado: `boss.faseIdx === 1`.

- [ ] **Passo 2: Rodar e ver falhar.**

- [ ] **Passo 3: `atalho.ts`:**

  ```ts
  /** THE SERPENT'S DEV SHORTCUT (spec §5.6): `?serpente=A&hab=raio` opens the F3 straight into her fight, in that form,
   * with that skill forced. Only in dev (`main.ts` imports it dynamically under `import.meta.env.DEV`). */
  import type Phaser from 'phaser';
  import type { FormaHab, NomeHab } from './tipos';

  export interface DevSerpente {
    forma: FormaHab;
    hab: NomeHab | 'tiros' | null;
  }

  export function lerAtalho(qs: URLSearchParams): DevSerpente | null {
    const f = qs.get('serpente');
    if (f !== 'A' && f !== 'B' && f !== 'C' && f !== 'fusao') return null;
    const h = qs.get('hab');
    return { forma: f, hab: h === 'chuva' || h === 'raio' || h === 'gas' || h === 'tiros' ? h : null };
  }

  export function ligarAtalhoSerpente(game: Phaser.Game): void {
    const dev = lerAtalho(new URLSearchParams(location.search));
    if (!dev) return;
    // (waits for the menu: stopping the Boot halfway would leave the game without textures — the sandbox's rule)
    const tentar = (): void => {
      if (!game.scene.isActive('Menu')) {
        setTimeout(tentar, 100);
        return;
      }
      game.scene.getScenes(true).forEach((s) => s.scene.stop());
      game.registry.set('cartas', []);
      game.registry.set('cartasCheckpoint', {});
      game.scene.start('Game', { stage: 3, ship: 'humana', handling: 'diegetico', practice: true, serpente: dev });
    };
    tentar();
  }
  ```

  Em `main.ts`, dentro do `if (import.meta.env.DEV)`, depois do sandbox:

  ```ts
  // A SERPENTE DIRETO NA LUTA (só em dev): `?serpente=A&hab=raio` (spec das habilidades §5.6).
  void import('./entities/serpente/atalho.ts').then((m) => m.ligarAtalhoSerpente(game));
  ```

- [ ] **Passo 4: `Boss.ts`.** No `StageBoss`, depois de `perigos`:

  ```ts
  /**
   * O que fere POR MEDIÇÃO, sem corpo e sem empurrão (a Serpente da Fase 3, 02/11: o raio e a geleia de fogo): a cena
   * chama a cada quadro com a caixa da nave, a mesma lei da parede do duto e do teto da caverna (`moldura.morde`).
   * Ausente = nada fere assim.
   */
  morde?(esq: number, dir: number, topo: number, base: number): boolean;
  ```

- [ ] **Passo 5: `GameScene.ts`.**

  1. Em `create(data)`, acrescente `serpente?: DevSerpente;` ao tipo de `data`; guarde-o em
     `private serpenteDev: DevSerpente | null = null` (`this.serpenteDev = data.serpente ?? null;`). Use
     `import type { DevSerpente } from '../entities/serpente/atalho';`.
  2. Depois da linha da caverna (`if (this.parallax.cavernaMorde(...)) this.damageShip();`):

     ```ts
     // O QUE O CHEFÃO FERE POR MEDIÇÃO (02/11, a Serpente: o raio e a geleia de fogo) — a mesma lei acima, sem corpo e
     // sem empurrão; os i-frames do `damageShip` separam os toques.
     if (this.boss?.morde && !this.boss.isDead && this.boss.morde(body.left, body.right, body.top, body.bottom)) this.damageShip();
     ```

  3. Na criação da Serpente, a arena ganha:

     ```ts
     // (o gás: as balas ativas do jogador aquecem o que atravessam; a carta acende na hora — spec §5.4)
     balas: () => this.weapons.bullets.getChildren().filter((b) => b.active) as Phaser.Physics.Arcade.Sprite[],
     incendiario: () => this.cartas.temIncendiario,
     ```

     E o 6º argumento é `this.serpenteDev`.

- [ ] **Passo 6: `CartasEmJogo.ts`.** Depois de `temGuiado`:

  ```ts
  /** INCENDIÁRIO na mão? O gás da Serpente (02/11) acende no primeiro tiro que o toca (spec das habilidades §3.4). */
  get temIncendiario(): boolean {
    return tem(this.reg, 'EFF_004');
  }
  ```

- [ ] **Passo 7: `BossSerpente.ts`.**
  1. A `ArenaSerpente` ganha os dois membros:

     ```ts
     balas: () => readonly Phaser.Physics.Arcade.Sprite[];
     incendiario: () => boolean;
     ```

  2. O construtor ganha o parâmetro `private readonly dev: DevSerpente | null = null`.
  3. No fim da `chegar()`, onde ela termina de subir (`this.entering = false;`), acrescente:

     ```ts
     // O ATALHO DE DEV (spec §5.6): a forma pedida já na chegada
     if (this.dev && this.dev.forma !== 'A') this.vestirFase({ A: 0, B: 1, C: 2, fusao: 3 }[this.dev.forma]);
     ```

- [ ] **Passo 8: Rodar.**
  1. `node scripts/test-serpente-hab.mjs` → ok.
  2. `npm run typecheck` → sem erros.
  3. A sonda `atalho` → ok.
  4. Abrir `http://localhost:5173/?serpente=B` no navegador da sonda (uma foto): ela chega na B.

- [ ] **Passo 9: Relatar.**

---

### Tarefa 8: A investida sai, e o ciclo novo (com o tiro de hoje nas pausas)

**Arquivos:**
- Criar: `src/entities/serpente/habilidade.ts`.
- Modificar:
  - `src/entities/BossSerpente.ts`;
  - `src/entities/numerosSerpente.ts`;
  - `src/entities/cascoVivo.ts`;
  - `scripts/test-serpente.mjs`;
  - `scripts/probe-stage3.mjs` (a linha 158);
  - `scripts/_serpente/_sonda-hab.mjs` (os modos `investida` e `ciclo`).

**Interfaces:**
- **Produz:**

  ```ts
  // habilidade.ts
  import type Phaser from 'phaser';
  import type { EnemySystem } from '../../systems/EnemySystem';
  import type { ChaveConjunto } from './gestosHab';
  import type { Luzes } from './luzes';
  import type { Tocador } from './tocador';
  import type { Cor, FormaHab, NomeHab, Ponto, Put } from './tipos';

  /** What a skill may ask of her and of the scene (the mock's globals, R4). Every point is on SCREEN. */
  export interface CorpoSerpente {
    readonly scene: Phaser.Scene;
    readonly enemies: EnemySystem;
    readonly forma: FormaHab;
    readonly cores: readonly Cor[];
    readonly tocador: Tocador;
    readonly luzes: Luzes;
    /** a mouth now: of the set frame shown, of the erguer, or of the idle frame */
    boca(cor: Cor): Ponto;
    /** where the green's breath leaves: the front of her open jaws (the mock's `labios`) */
    labios(): Ponto;
    /** a point of a set's frame ('boca' of the vulnerable head, or 'olho'); null when that frame has none */
    ponto(chave: ChaveConjunto, i: number, tipo: 'boca' | 'olho'): Ponto | null;
    /** the ship's hitbox centre */
    nave(): Ponto;
    /** her left edge on a screen row */
    bordaEsq(y: number): number;
    /** the screen kick this frame (integer px) */
    treme(x: number, y: number): void;
    balas(): readonly Phaser.Physics.Arcade.Sprite[];
    incendiario(): boolean;
    /** the gas counter's hit (15% of the form) */
    contra(): void;
    /** the erguer gesture (the B and the C): the action when the jaws open, 0.25 s in (today's `comGesto`) */
    gesto(acao: () => void): void;
    /** the lights and the hot flash this frame */
    luz(niveis: Partial<Record<Cor, number>>, tinta?: number): void;
  }

  export interface Habilidade {
    readonly nome: NomeHab;
    /** running (the cycle waits for it; no common shots meanwhile) */
    readonly viva: boolean;
    comecar(): void;
    update(dt: number): void;
    desenhar(put: Put): void;
    morde?(esq: number, dir: number, topo: number, base: number): boolean;
    /** her head died: it dissolves over `HAB.aborta` s and does not hurt meanwhile */
    abortar(): void;
  }
  ```

  No `BossSerpente`:
  - `private habs: Partial<Record<NomeHab, Habilidade>>`;
  - `private ciclo`;
  - `private camada`, `tocador`, `luzes`;
  - `private corpoHab: CorpoSerpente`;
  - `morde(...)`, que delega à habilidade viva.

**Passos:**

- [ ] **Passo 1: Os testes que falham.**

  1. **`test-serpente.mjs`:** apague as asserções da investida (`alturaDoBote`, `travaX`, `xDoBote`, `doRombo`, as
     linhas 37–49 e 51–52, e o import delas). Acrescente:

     ```js
     ok(!('investida' in LUTA), 'a investida saiu dos números');
     ```

  2. **O modo `investida` da sonda:** 3 minutos da luta inteira, a nave intocável, atirando a cada 0,1 s (como o
     `parado` de `_sonda-luta.mjs`). Ele mede:
     - o `x` dela a cada passo: tem de ficar a ±2 px do rombo (ela nunca sai dele);
     - `boss.investida === undefined`;
     - o ciclo visto: a sequência dos estados `ciclo.estado`.

     Esperado com o código de hoje: FALHA (a investida acontece).

- [ ] **Passo 2: Rodar e ver falhar** os dois.

- [ ] **Passo 3: Tirar a investida.**

  **No `BossSerpente.ts`, sai:**
  - o tipo `Investida`;
  - os campos `investida`, `investidaT`, `ponta`, `travada`, `boteY`, `noRombo`, `rasgo`, `fissura`, `voltaX`,
    `segunda`, `cuspiu`, `cortada`, `cdInvestida`, `furiaPasso` (volta no ciclo da fusão), `chuva`, `chuvaT`,
    `chuvaOnda`, `chuvaVao`, `cdChuva`;
  - as funções `partir`, `limitarRachadura`, `correrFrente`, `travar`, `romper`, `iniciarVolta`, `voltar`,
    `comecarInvestida`, `recolher`, `comecarChuva`, `chover`;
  - os casos de `mover` que não são o `'nao'`.

  **Muda:**
  - `fundoDeAgora()` vira `escondidaRombo(this.forma)`;
  - na `fusao()`, ela está sempre visível: o passo é sempre `'afundando'`, e o `'volta'` sai do `colapsar`;
  - em `colapsar` `'afundando'`, sai o que mexia em rasgo e fissura;
  - `aplicarCorte()` fica só com o ramo do rombo: ela aparece inteira e o lábio fica na frente. A linha do corte e o
    `cortarParaAMorte` saem, junto com `this.cortada`.

  **`definirCorpo`:**
  - ficam `'nada'` e `'repouso'`;
  - em `aplicarCorpo`, sai o `'coluna'` e o `'cabeca'`;
  - no listener do `ANIMATION_COMPLETE` (linha 225), a condição vira só `a.key.startsWith('serpente-erguer')`.

  **Em `numerosSerpente.ts`, sai:**
  - `LUTA.investida`;
  - `alturaDoBote`, `travaX`, `xDoBote`, `doRombo`;
  - `ondaDaChuva`, `vagasDaChuva` e `LUTA.chuva` (a chuva nova está em `numerosHab`);
  - nos `FORMAS`: `cada`, `variacao`, `chuva` e `erguida`, e o comentário deles.

  Antes de apagar cada um, confira com `grep -rn "<nome>" src scripts --include=*.ts --include=*.mjs`. O
  `_sonda-luta.mjs` (histórico) e o `_bote-maquete.mjs` podem ficar quebrados: anote no relatório.

  ⚠️ O `colapsar` `'surgindo'` usa `LUTA.investida.bote * 0,5` = 350 px/s. Troque por um número próprio,
  `LUTA.surge: 350`, com o comentário "the fusion bursts out of the breach (half the old charge's 700 px/s)".

  **Em `cascoVivo.ts`, sai o que só a investida usava:**
  - `fissuras`, `ponta`, `rasgos` e os tipos `Fissura`, `Rasgo`;
  - o desenho deles, nas linhas 340–360, 411–460 e 483 em diante (confira cada bloco antes);
  - o `LUTA.investida.cura`.

  **Fica:** `lombada` (a chegada), `cascalhoDoRasgo` (a fusão a chama com um objeto literal: troque o tipo do
  parâmetro por `{ cx: number; meia: number; fundo: number }`), `estouroDoRombo`, `copiar` e `frente`.

- [ ] **Passo 4: O ciclo novo.** Os campos:

  ```ts
  /** THE CYCLE (spec §2): a pause with common shots, then the form's next skill on her low post. */
  private ciclo: { estado: 'pausa' | 'desce' | 'espera' | 'hab'; t: number; passo: number; hab: NomeHab | null } =
    { estado: 'pausa', t: 0, passo: 0, hab: null };
  private readonly habs: Partial<Record<NomeHab, Habilidade>> = {};
  /** a skill whose head died, dissolving (`HAB.aborta`): still stepped and drawn until it is gone */
  private abortando: Habilidade | null = null;
  ```

  Os imports novos do `BossSerpente`: `HAB`, `cruza`, `rodizio` de `./serpente/numerosHab`; `CONJUNTOS`, `IDLE_HAB` de
  `./serpente/gestosHab`; `CamadaPixels`, `Tocador`, `Luzes`; e os tipos `CorpoSerpente`, `Habilidade`, `NomeHab`,
  `Ponto`.

  `atacar(dt, target)` passa a ser:

  ```ts
  private atacar(dt: number, target: Phaser.Physics.Arcade.Sprite): void {
    if (this.imune > 0) return;
    const l = this.fase.luta;
    if (l === 'C') return this.atacarC(dt, target);
    if (l === 'fusao') return this.atacarFusao(dt, target);
    const c = this.ciclo, lista = this.dev?.hab === 'tiros' ? [] : this.dev?.hab ? [this.dev.hab] : HAB.ciclo[l];
    c.t += dt;
    switch (c.estado) {
      case 'pausa': {
        const k = HAB.pausa.tiros.findIndex((tt) => cruza(c.t - dt, c.t, tt));
        if (k >= 0) this.tiroComum(target);
        if (c.t < HAB.pausa.dur) return;
        const nome = lista.length ? rodizio(lista, c.passo) : null;
        c.passo++;
        c.t = 0;
        if (!nome || !this.habs[nome]) return; // (no module for it yet: another pause)
        c.hab = nome;
        c.estado = 'desce';
        this.posto = 0;
        return;
      }
      case 'desce':
        // she goes down to the low post (the mock's), then waits for the idle's frame 0 (the sets start from it)
        if (Math.abs(this.sprite.y - romboY(0)) < 1 || c.t >= HAB.desce) {
          this.sprite.y = romboY(0);
          this.body.setVelocity(0, 0);
          c.estado = 'espera';
        }
        return;
      case 'espera':
        return; // the idle's ANIMATION_REPEAT starts it (constructor)
      case 'hab': {
        const h = c.hab ? this.habs[c.hab] : undefined;
        if (!h || !h.viva) {
          c.estado = 'pausa';
          c.t = 0;
          c.hab = null;
        }
        return;
      }
    }
  }
  ```

  No construtor, depois do listener do `ANIMATION_COMPLETE`:

  ```ts
  // a skill starts as her idle comes back to its frame 0 (the mock: every set starts on the approved frame)
  this.sprite.on(Phaser.Animations.Events.ANIMATION_REPEAT, () => {
    const c = this.ciclo;
    if (c.estado !== 'espera' || !c.hab) return;
    this.habs[c.hab]?.comecar();
    c.estado = 'hab';
    c.t = 0;
  });
  ```

  **Em `mover()` (só o caso `'nao'` sobrou):**
  - a troca de posto e a ondulação só correm com `this.ciclo.estado === 'pausa'`;
  - fora da pausa: `posto = 0` e ondulação 0;
  - em `'hab'` e `'espera'`, a posição é fixa:

    ```ts
    this.sprite.setPosition(this.romboX(), romboY(0)); this.body.setVelocity(0, 0);
    ```

  **`tiroComum(target)`** (nesta tarefa, o tiro de hoje; a Tarefa 9 o troca): o bloco `case 0` antigo, linhas
  868–875, com `HAB.tiros.mirado`:

  ```ts
  private tiroComum(target: Phaser.Physics.Arcade.Sprite): void {
    const cor = rodizio(this.fase.cores, this.vezDaCabeca++);
    this.comGesto(() => {
      const b = this.posBoca(cor);
      this.tiro(b.x, b.y, Phaser.Math.Angle.Between(b.x, b.y, target.x, target.y) + Phaser.Math.FloatBetween(-HAB.tiros.mirado.desvio, HAB.tiros.mirado.desvio), HAB.tiros.mirado.vel, cor);
    });
  }
  ```

  **`atacarC`:** o `case 2` antigo sem a investida, com `HAB.tiros.C`.

  **`atacarFusao`:** o `case 3` sem a investida, num ciclo de 3 passos:
  1. leque (7, 64°, 170), espera 0,9;
  2. rajada (4, 190), espera 1,0;
  3. silêncio, espera 0,8.

  O passo usa `this.vezDaCabeca` como contador.

  Em `comGesto`, a condição do atraso vira `if (!this.dead && !this.colapso) acao();`.

- [ ] **Passo 5: A fachada, a camada, o tocador e as luzes, no construtor.**

  ```ts
  this.camada = new CamadaPixels(scene);
  this.tocador = new Tocador(this.sprite, () => this.fase.anim);
  this.luzes = new Luzes(scene);
  const naTela = (o: Ponto): Ponto => this.naTela(o);
  this.corpoHab = {
    scene, enemies, tocador: this.tocador, luzes: this.luzes,
    get forma() { return self.fase.luta; },
    get cores() { return self.fase.cores; },
    boca: (cor) => this.posBoca(cor),
    labios: () => { const b = this.posBoca('verde'); return { x: b.x - 3, y: b.y + 1.5 }; },
    ponto: (chave, i, tipo) => {
      const c = CONJUNTOS[chave], p = tipo === 'olho' ? c.olho?.[i] : Object.values(c.bocas)[0]?.[i];
      return p ? naTela(p) : null;
    },
    nave: () => ({ x: this.alvo.x, y: this.alvo.y }),
    bordaEsq: (y) => this.camada.bordaEsq(y),
    treme: (x, y) => { this.chute.x = x; this.chute.y = y; },
    balas: () => this.arena?.balas() ?? [],
    incendiario: () => this.arena?.incendiario() ?? false,
    contra: () => { this.damage(this.fase.hp * HAB.contra); },
    gesto: (acao) => this.comGesto(acao),
    luz: (niveis, tinta = 0) => { this.niveisLuz = niveis; this.tinta = tinta; },
  };
  ```

  (`const self = this;` antes do objeto, para os getters.) `this.alvo` é o `target` guardado no `update`. O
  `ponto(..., 'boca')` dos conjuntos do raio é a boca da azul: só ela tem `bocas` nesses conjuntos.

  **`posBoca(cor)` e `posCabeca()`, nesta ordem:**
  1. com `this.tocador.atual`, `CONJUNTOS[chave].bocas[cor][i]` / `.cranio[i]`;
  2. no gesto do erguer, o de hoje;
  3. no idle das formas A e B, `IDLE_HAB[F].bocas[cor] + desvio[cor][quadro do idle]`, com o quadro do idle por
     `this.sprite.anims.currentFrame.index - 1`.

  ⚠️ Confira no Phaser 3.90 se `AnimationFrame.index` começa em 1:

  ```
  grep -n "index" node_modules/phaser/src/animations/AnimationFrame.js | head
  ```

  **`sincronizarVeias`:** o quadro vem do tocador quando há um. A chave é `serpenteHabVeias_<chave>`, quadro `i`, e
  a sombra igual. Com o tocador ativo, o `setTexture(k, i)` usa o índice; sem ele, o regex de hoje.

  **`update(dt, target)`, depois de `sincronizarCabeca()`:**

  ```ts
  this.alvo = target;
  this.tocador.update(dt);
  const h = this.ciclo.estado === 'hab' && this.ciclo.hab ? this.habs[this.ciclo.hab] : undefined;
  h?.update(dt);
  this.abortando?.update(dt);
  if (this.abortando && !this.abortando.viva) this.abortando = null;
  this.camada.inicio();
  this.camada.marcarCorpo(this.sprite, this.romboLabio ? [this.romboLabio] : []);
  h?.desenhar(this.camada.put);
  this.abortando?.desenhar(this.camada.put);
  this.camada.fim();
  this.luzes.atualizar(this.sprite, this.folhaDeLuz(), this.quadroDeLuz(), this.niveisLuz, this.tinta);
  this.niveisLuz = {};
  this.tinta = 0;
  // the screen kick (the beam's 2 px, the peck's 1 px, the counter's shake): this frame only
  this.scene.cameras.main.setScroll(-this.chute.x, -this.chute.y);
  this.chute.x = this.chute.y = 0;
  ```

  Os auxiliares:
  - `folhaDeLuz()`: a chave do tocador, ou `idleA` / `idleB` no idle;
  - `quadroDeLuz()`: o `i` do tocador, ou o quadro do idle.

  ⚠️ **Antes de usar `setScroll`:** `grep -rn "setScroll\|scrollX\|scrollY" src/` não pode achar outro uso na cena da
  F3. Se achar, o chute vai para `cameras.main.setScroll(base + chute)`.

  **`morde(...)`:**

  ```ts
  morde(esq: number, dir: number, topo: number, base: number): boolean {
    const h = this.ciclo.hab ? this.habs[this.ciclo.hab] : undefined;
    return !!h && h.viva && !!h.morde && h.morde(esq, dir, topo, base);
  }
  ```

  **`transicao()`, logo no começo:**

  ```ts
  // the skill dies with its head (spec §2.5): it dissolves in 0.5 s, still stepped and drawn, hurting nothing
  const h = this.ciclo.hab ? this.habs[this.ciclo.hab] : undefined;
  if (h?.viva) {
    h.abortar();
    this.abortando = h;
  }
  this.tocador.idle();
  this.ciclo = { estado: 'pausa', t: 0, passo: 0, hab: null };
  ```

  O ciclo da forma nova começa por uma pausa de 2,4 s, então a mesma instância (o gás da A e o da B) nunca é
  recomeçada enquanto se desfaz.

  **`die()` e `destroy()`:** abortam e destroem a camada e as luzes.

- [ ] **Passo 6: `probe-stage3.mjs` linha 158:** troque `s.boss.investida !== 'nao'` por
  `s.boss.ciclo?.estado !== 'pausa'` (espera ela estar numa pausa). O arquivo já tem mudanças dele na árvore: edite
  só essa linha e mostre o diff.

- [ ] **Passo 7: Rodar.**
  1. `node scripts/test-serpente.mjs` → ok.
  2. `node scripts/test-serpente-hab.mjs` → ok.
  3. `npm run typecheck`.
  4. A sonda `investida` → ok (ela nunca sai do rombo; o ciclo só tem pausas, porque não há módulos ainda).
  5. `node scripts/probe-stage3.mjs` → passa como antes.

- [ ] **Passo 8: Relatar** os arquivos e os scripts antigos que ficaram quebrados.

---

### Tarefa 9: Os tiros comuns

**Arquivos:**
- Criar: `src/entities/serpente/projetil.ts` (puro), `src/entities/serpente/particulas.ts` (puro),
  `src/entities/serpente/tiros.ts`.
- Modificar: `BossSerpente.ts` (o `tiroComum`, o `atacarC`, o update e o desenho dos tiros),
  `scripts/test-serpente-hab.mjs` e `_sonda-hab.mjs` (o modo `tiros`).

**Interfaces:**
- **Produz:**

  ```ts
  // projetil.ts (mock 146–175, R1–R7)
  export function desenharSprite(put: Put, s: SpriteRGBA, x: number, y: number, ux: number, uy: number, alfa?: number): void;
  export function caudaDe(s: SpriteRGBA, x: number, y: number): Ponto;
  export function chamaCor(put: Put, x: number, y: number, ux: number, uy: number, f: number, k: number, cor: Cor, alfa?: number): void;
  // numerosHab.ts gains HAB.cores: COR, BORDA, NUCLEO (mock 123–125), GAS, METAL, METAL_LUZ (273–274), FRIO (364), BAYER (517)
  // particulas.ts (mock 273–349, 364, 533–539)
  export class Particulas {
    constructor(acaso: () => number);
    jato(x: number, y: number, ux: number, uy: number, forca: number, vxB: number, vyB: number, dt: number, taxa?: number, cor?: Cor): void;
    faiscas(x: number, y: number, n: number, cor: RGB): void;
    fumaca(x: number, y: number, n: number, vx?: number, vy?: number): void;
    clarao(x: number, y: number, cor: Cor): void;      // a missile's burst on the hull (`claroes`)
    push(p: Particula): void;                          // the raw push the ports use (`gas.push({...})`)
    passo(dt: number): void;                           // `passoGas`
    desenhar(put: Put, alfa?: number): void;           // `desenhaGas`
  }
  // tiros.ts
  export class Tiros {
    constructor(corpo: CorpoSerpente);
    /** one common shot of the pause (A/B): the variation in turn, its gesture, the shot(s) at the action frame */
    comum(): void;
    /** the C's: an aimed burst / a fan, with the ember */
    rajadaC(): void;
    lequeC(): void;
    update(dt: number): void;
    desenhar(put: Put): void;
    limpar(): void; // her death or the fusion: the shots in the air vanish with their bodies
  }
  ```

  `jato` recebe `dt`: a maquete usa `forca * taxa / FPS`, que no porte vira `forca * taxa * dt`.

**Passos:**

- [ ] **Passo 1: Os testes que falham.**

  **No teste puro**, o sprite girado como o Phaser gira:

  ```js
  // ─── the shots' sprites drawn as the game turns them (`projetil.ts`, the mock's `sprite`) ───
  {
    const { desenharSprite } = await import('../src/entities/serpente/projetil.ts');
    const { TIROS } = await import('../src/entities/serpente/projeteisHab.ts');
    const s = TIROS.verde.quadros[0], pts = new Map();
    desenharSprite((x, y, c) => pts.set(`${x},${y}`, c), s, 100, 50, 1, 0);
    let opacos = 0;
    for (let i = 0; i < s.w * s.h; i++) if (s.px[i * 4 + 3] > 8) opacos++;
    ok(pts.size === opacos, `apontando para a direita, o sprite sai inteiro (${pts.size} de ${opacos} px)`);
    const giro = new Map();
    desenharSprite((x, y, c) => giro.set(`${x},${y}`, c), s, 100, 50, 0, 1);
    ok(Math.abs(giro.size - opacos) <= 2, `de nariz para baixo, o mesmo tamanho (${giro.size})`);
  }
  ```

  **O modo `tiros` da sonda**, com a forma A e `hab: 'tiros'` (só pausas). A nave fica estacionada em x 80; a cada
  passo, `s.ship.setPosition(80, y)` e a velocidade 0. Ele mede:
  - **a caixa:** todo tiro dela vivo (`enemyBullets` ativos com `getData('serpTiro')`) tem `body.width ≈ 11,7` e
    `body.height ≈ 8,1` (±0,05), e `visible === false`;
  - **o mirado:** com a nave parada, 30 s de pausas: os tiros miram nela (≥ 1 acerto contado);
  - **o leque:** com a nave no vão entre a gota do meio e a de cima (`y` calculado pelo ângulo do leque na distância
    dela à boca da verde), 0 acertos nos leques;
  - **o cerco:** com a nave parada no meio, 0 acertos nos cercos; com a nave 22 px acima, ≥ 1;
  - **o rodízio:** as variações vistas seguem `mirado, leque, cerco`, e as duplas do cerco seguem `cv, vl, cl`.

  Para atribuir os acertos, use o registro de cada tiro em `window.__tiros` (a variação, a hora) e o `damageShip`
  contado.

- [ ] **Passo 2: Rodar e ver falhar.**

- [ ] **Passo 3: Portar `projetil.ts` e `particulas.ts`.**
  - **`HAB.cores`** em `numerosHab.ts`: `COR`, `BORDA`, `NUCLEO` (maquete 123–125), `GAS`, `METAL`, `METAL_LUZ`
    (273–274), `FRIO` (364) e `BAYER` (517), copiados como estão. O raio e o gás também os usam.
  - **`projetil.ts`:** maquete 146–175 (`sprite` vira `desenharSprite`; `caudaDe`; `chamaCor`). O `alfa` opcional
    multiplica o `a` de cada `put` (o aborto).
  - **`particulas.ts`:** maquete 277–349 (`jato`, `chama`, `faiscas`, `passoGas` = `passo`, `desenhaGas` =
    `desenhar`) e 533–539 (`fumaca`). A lista `gas` e a `claroes` viram campos da instância, com o
    tipo `Particula`, que tem os campos que a maquete usa: `x, y, vx, vy, idade, vida, faisca?, rasto?, fumaca?,
    frio?, flash?, cor?`.

  Regras R1–R7: `1 / FPS` vira `dt`, e o `acaso` vem do construtor.

- [ ] **Passo 4: Escrever `tiros.ts`.**

  1. **`disparar(cor, x, y, ang, vel)`** — a bala do pool com o figurino de hoje (a caixa por construção), invisível:

     ```ts
     private disparar(cor: Cor, x: number, y: number, ang: number, vel: number): void {
       const b = this.corpo.enemies.enemyBullets.get(x, y) as Phaser.Physics.Arcade.Sprite | null;
       if (!b) return;
       b.setActive(true).setVisible(false);
       b.body!.enable = true;
       (b.body as Phaser.Physics.Arcade.Body).reset(x, y); // (the reused slot's body keeps the old place: `BossSerpente.tiro`)
       b.anims.stop();
       // today's texture and scale = today's box, by construction; the LAYER draws it (it shows over her body, as in the mock)
       b.setTexture(GOTA[cor]).setScale(0.9).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
       b.setData('flak', false);
       const token = ++this.n;
       b.setData('serpTiro', token);
       b.setVelocity(Math.cos(ang) * vel, Math.sin(ang) * vel);
       b.setRotation(ang);
       this.vivos.push({ b, token, cor, t0: this.t });
       if (cor !== 'ciano') this.claroDaBoca(cor, x, y, Math.cos(ang), Math.sin(ang));
     }
     ```

     `GOTA` é o de `BossSerpente` (`shotVenenoAzul` / `shotVeneno` / `shotVenenoAmbar`). Mova-o para `tiros.ts` e
     exporte-o.

     ⚠️ Antes: `grep -rn "\.visible" src/scenes/GameScene.ts src/systems/EnemySystem.ts src/systems/Bombas.ts`. Nada pode
     usar `visible` para decidir colisão ou limpeza de bala inimiga. Se algo usar, anote e ajuste o critério para
     `active`.

  2. **`claroDaBoca`:** maquete 2027–2041, o clarão e os pedaços (as fagulhas, as gotinhas e o fio de fumaça), com o
     `visual`.
  3. **`update(dt)`:**
     - descarta os registros com `!b.active || b.getData('serpTiro') !== token`;
     - roda os rastros de cada tiro vivo (maquete 2044–2053, com R2: o `visual() < 0.22` vira `chance(0.22, dt)`, e
       assim por diante, com a posição e a velocidade lidas da bala);
     - roda os rastros soltos (2054–2055);
     - roda o relógio do gesto (o `Tocador` já roda no boss).
  4. **`desenhar(put)`:** maquete 2104–2116 (os clarões, os rastros) e 2138–2142 (o tiro):
     `desenharSprite(put, Q[floor((t − t0)·fps) % n], b.x, b.y, vx/v, vy/v)`.
  5. **`comum()`** — a variação `rodizio(HAB.tiros.variacoes[F], this.k++)`:
     - **mirado:** a cabeça é `rodizio(HAB.tiros.mirado.ordem[F], this.kMirado++)`, entre as vivas.
       - Na A, `tocador.clipe('tiro' + {ciano:'A', laranja:'C', verde:'B'}[cor], 12, (i) => i === HAB.tiros.acao && fogo())`.
       - Na B, o `comGesto` de hoje (exponha um `gesto(acao)` no corpo, que é o `comGesto`).
       - `fogo` = um tiro da boca de quem atira, `ângulo à nave ± desvio·(visual()·2−1)`, a 140.
     - **leque:** a verde, `tiroB` na A (o erguer na B). Na ação, 3 tiros em `angulosDoLeque(ângulo à nave, 3, 30)`, a
       105.
     - **cerco:** o par `rodizio(pares[F], this.kCerco++)`, o clipe `cerco` + o código do par na A (o erguer na B). Na
       ação, cada cabeça do par mira o seu alvo de `alvosDoCerco(nave)`: a de boca mais alta mira o de cima. Os dois
       saem a 140.
  6. **`rajadaC()` / `lequeC()`:** o `rajada`/`leque` de hoje com a brasa (`laranja`) e `HAB.tiros.C`. Cada tiro da
     rajada re-mira (o `delayedCall` de hoje).
  7. **`limpar()`:** solta as balas vivas dele (`enemies.release`) e zera as listas.

  **No `BossSerpente`:**
  - `tiroComum` vira `this.tiros.comum()`;
  - o `atacarC` chama `rajadaC` e `lequeC`;
  - o `update` chama `this.tiros.update(dt)` sempre;
  - o `desenhar` da camada chama `this.tiros.desenhar(put)` depois da habilidade;
  - o `die()` e a `fusao()` chamam `this.tiros.limpar()`.

  A fusão fica com o `tiro()` de hoje (a gota visível).

- [ ] **Passo 5: Rodar.** O teste puro → ok; `npm run typecheck`; a sonda `tiros` → ok. Filmar 20 s
  (`--filmar $F/sonda/tiros-A`) e olhar ampliado:
  - o tiro aparece sobre o corpo dela ao sair;
  - o clarão é discreto;
  - a verde pinga e a laranja solta fumaça.

- [ ] **Passo 6: Relatar.**

---

### Entre a 9 e a 10 (02–03/11, a pausa 2): a consistência da arte e a emenda da spec — FEITO

Ele, na pausa 2: a tela preta em volta dela, o sobe-e-desce irreal, o acerto no corpo; e, mexendo nas folhas, a boca
"de carne" da laranja e o encolhe da verde que troca de cabeça (*"Eu preciso mesmo de uma consistência nas criações"*).
Folha: `$F/consistencia.html`.

- **A arte:** a boca da laranja recolorida só na mandíbula (cerco vl/cl, carga e bote 0 da B; `ferramentas/boca-laranja.mjs`
  com `sementes=` na B); o encolhe da B refeito com as pontas fixas (v9; registros em `cru/gasB.json`); o CRANIO dele
  relido no `_hab-instalar.mjs`. Conferidor novo `scripts/_serpente/_consistencia.mjs` (a cor de cada cabeça, quadro a
  quadro, nos 23 conjuntos; 23/23 ok).
- **A tela preta:** as veias com aditivo puro `[ONE, ONE]` (o ADD do Phaser é `[ONE, DST_ALPHA]` e escurecia a nuvem).
- **A emenda da spec (as escolhas dele, com opções):**
  - ela FIXA no posto (`LUTA.posto` 142; saíram `trocaPosto`, `postosRombo`, a respiração, o estado `desce`, `HAB.desce`,
    o `subirAntes`; a chegada e a fusão sobem até o posto);
  - O CORPO INTEIRO LEVA DANO: `StageBoss.acertoNoCorpo` + `valeAlvo` (`Boss.ts`); `pixels.ts` `acertoNoCorpo`/`naCabeca`
    (testados); `CamadaPixels.mascara`; a cena mede os tiros contra o desenho a cada quadro (`tirosNoCorpo`), a cabeça
    (crânio → um pouco depois da boca, 1,25 × o raio) vale `LUTA.cabecaVale` 1,5; o lábio do rombo absorve; a bomba fere
    o corpo; `LUTA.vida` dobrada (100/100/100/120, provisória); o clarão rosa só no acerto da cabeça (`damage(…, onde)`);
  - a sonda `_sonda-hab.mjs corpo [--mapa <png>] [--filmar]` prova tudo nas 4 formas; `probe-stage3` espera o menu
    (o `networkidle` estourava) e passa de ponta a ponta.

---

### Tarefa 10: A chuva de casulos

> **FEITO (03/11)** — `chuva.ts` registrado; a chuva é dona do movimento (a ordem da maquete a cada quadro) e estaciona o
> corpo do pool no casulo desenhado (velocidade 0). Os tokens seguem entre rodadas, e tiros/casulos limpam a marca um do
> outro ao reaproveitar a vaga. Se o gesto nunca chegar ao quadro de ataque, a salva sai aos 3 s. A sonda `chuva` passa
> na A e na B; `corpo`, `tiros` e os testes seguem passando. Folha da pausa 3: `$F/chuva.html`.
>
> **As respostas dele na pausa 3** ("pode limpar"; "A boca vermelha de carne destoa do restante das animações"):
> - o cuspe pintado do `chuvaM2` (quadros 10–11) saiu: `ferramentas/cuspe-chuva.mjs` → `$F/cru/chuvaA-limpo` (o
>   instalador lê dali); a garganta acesa volta do quadro vizinho; as pintas soltas são uma lista explícita, conferida
>   contra os quadros 9 e 12 (a varredura automática de "pedaço pequeno" levava dentes e contorno da arte);
> - a boca da laranja no ERGUER da B (1–10) e da C (4–10) foi para a brasa: `ferramentas/boca-erguer.mjs` (carne
>   vermelha → rampa pelo brilho; olho, focinho, aberturas e a faixa do pescoço ficam) → `$F/cru/erguer/`, reinstalado
>   com `_erguer-instalar.mjs $F/cru/erguer`. Hash antes/depois: mudaram só esses quadros, as veias da C e a sombra da
>   B; a A, o `gestoSerpente.ts` e o casco idênticos. O erguer da A (rosa nas 3 bocas) não aparece mais na luta.

**Arquivos:**
- Criar: `src/entities/serpente/chuva.ts`.
- Modificar: `BossSerpente.ts` (registra `this.habs.chuva`) e `_sonda-hab.mjs` (o modo `chuva`).

**Interfaces:**
- **Consome:** `CorpoSerpente`, `Particulas`, `desenharSprite`, `caudaDe`, `chamaCor`, `CASULOS`, `HAB.chuva`,
  `vagasDosCasulos`, `inicioDoVao`, `cruza`.
- **Produz:** `class Chuva implements Habilidade` (`nome = 'chuva'`).

**Passos:**

- [ ] **Passo 1: O modo `chuva` da sonda, que falha.** Com `hab: 'chuva'`, na A e na B:
  - **as ondas:** conta as ondas que entram (`hab.ondas` incrementa a cada onda): A 3, B 2, cada uma com 7 casulos;
  - **o manequim:** a nave em y 100, no meio do vão de cada onda. A sonda lê `hab.vaos[j]`, o x do centro do vão, e
    vai até ele a 110 px/s a partir da hora de cada onda (como a maquete, linhas 2008–2010). Esperado: 0 acertos;
  - **o parado:** a nave fixa em x 14 + 22·(o primeiro casulo da 1ª onda), ≥ 1 acerto;
  - **a caixa:** casulo descendo com `body` 7×11 e subindo com 9×9 (±0,05);
  - **o estouro:** nenhum casulo vivo abaixo de y 151 + 2.

- [ ] **Passo 2: Rodar e ver falhar** (ainda não há `chuva`: o ciclo pula).

- [ ] **Passo 3: Escrever `chuva.ts`.** Porte da maquete 1964–2007 e 2117–2128, com as regras R1–R7:

  1. **`comecar()`:**
     - zera o estado e cria `acaso`/`visual` com sementes de `Math.random`;
     - sorteia `inicioDoVao(acaso, ondas)`, com `ondas` = as cabeças vivas na ordem da forma (A ciano, verde,
       laranja; B verde, laranja);
     - na A, `tocador.clipe('chuvaA', 12, (i) => i === HAB.chuva.acaoA && this.lancar())`;
     - na B, o gesto do erguer: `corpo.gesto(() => this.lancar())`, que lança com as bocas abertas, aos 0,25 s.

     `tAcao` = o `this.t` do lançamento.
  2. **`lancar`:** guarda `tAcao` e, por cabeça viva `j` e por míssil `i` (0–8), agenda o lançamento em
     `tAcao + i·0,022`. Cada um nasce da boca do quadro de ação (`corpo.boca(cor)` naquela hora), no ângulo
     `inclina + ((i−4)·4 + (acaso()−0,5)·3)°`, a 280. A bala do pool é invisível (como os tiros), tem a caixa 9×9
     centrada (`body.setSize(9, 9, true)`) e a textura `bolt2`. A onda `j` sai em `tAcao + 0,55 + j·0,6`: 7
     casulos em `vagasDosCasulos(inicio + passo·j)`, em y −6 e parados, com a caixa 7×11.
  3. **`update(dt)`:**
     - nos que descem: `vy += 160·dt` (no corpo: `body.velocity.y += …`);
     - o jato na cauda: `p.jato(cauda.x, cauda.y − 1, 0, −1, 1,3, vx, vy, dt, 200, cor)`, com `cauda = caudaDe(quadro, x, y)`;
     - o estouro: `y + 3 >= 151` → solta a bala, chama `p.clarao(x, 149, cor)` e `p.faiscas(x, 150, 6, COR[cor])`;
     - quem sobe e passa de y −12 morre (o pool já solta em −8);
     - `p.passo(dt)`.

     `viva` é falso depois da última onda, sem casulo vivo e sem partícula.
  4. **`desenhar(put)`:** as partículas, depois cada casulo (maquete 2119–2127):
     - descendo: `chamaCor` na cauda + o sprite de nariz para baixo;
     - subindo: o sprite na direção do voo;
     - o quadro: `floor((t + x·0,013)·6) % 2`.
  5. **`abortar()`:** solta todas as balas na hora (não ferem mais); os desenhos seguem andando e somem em 0,5 s
     (o `alfa` de cada `put` × `1 − tAborto/0,5`). Depois, `viva = false`.

  ⚠️ Os ids dos casulos: `b.setData('serpCasulo', token)`, conferido no `update`, como nos tiros.

- [ ] **Passo 4: Registrar.** No construtor do `BossSerpente`: `this.habs.chuva = new Chuva(this.corpoHab);`.

- [ ] **Passo 5: Rodar.** A sonda `chuva` na A e na B → ok. Filmar a A e a B e olhar ampliado:
  - a chama na cor da cabeça, presa à cauda;
  - o casulo gira na subida;
  - o estouro no casco.

- [ ] **Passo 6: Relatar.**

---

### Tarefa 11: O raio da azul

> **FEITO (03/11)** — `geometriaRaio.ts` + `raio.ts` + `_oraculo.mjs`; o ORÁCULO bate de primeira: 470 quadros, 0 px no
> raio, 0 quadros de cabeça (e acusa 58 px / 99 quadros com a semente errada — ele pega diferença). Sonda `raio`: o
> manequim 0 mordidas; a nave parada mordida nas 8 fatias; a regra da salva com a boca real em 200 sementes (maior saída
> 24,5 px). Desvios do plano:
> - o relógio começa em `inicio − 9/8` (`HAB.raio.cicloIdle`): a cabeça sai do idle no quadro 0, como na maquete (`PRE`);
> - o caminho das 2 fatias grandes custa ~50 ms de uma vez (um tranco): ele é feito aos poucos (`caminhoPorPartes`, 24
>   posições por passo) no ciclo de idle antes da 1ª leitura, e guardado entre rodadas (ela não sai do posto);
> - a marca no casco esfria por segundos depois do fim: `Habilidade.restos` + o `rescaldo` do `BossSerpente` (a
>   habilidade acabada segue desenhada sem o ciclo esperar);
> - o `fechada` não tem boca (como o `pontos.json` da maquete): `ponto(…, 'boca')` dá null nele;
> - a sonda filma com a nave sempre visível (a invulnerável pisca; os vídeos de antes piscavam).

**Arquivos:**
- Criar: `src/entities/serpente/geometriaRaio.ts` (puro), `src/entities/serpente/raio.ts`, `scripts/_serpente/_oraculo.mjs`.
- Modificar: `BossSerpente.ts` (registra `this.habs.raio`, só na A), `scripts/test-serpente-hab.mjs` (o oráculo do
  raio) e `_sonda-hab.mjs` (o modo `raio`).

**Interfaces:**
- **Produz:**

  ```ts
  // geometriaRaio.ts (mock 1436–1444, 1449–1453, 1473–1495, 1513–1538)
  export interface Feixe { x0: number; y0: number; x1: number; y1: number; bate: boolean }
  export function feixe(b: Ponto, a: number): Feixe;
  export function yBorda(p: Ponto, x: number, y: number): number;
  export function angDe(p: Ponto, yL: number): number;
  export function poseDe(faixa: { cima: number; meio: number; baixo: number }, yL: number): number;
  export function quadroDe(n: number, x: number): number;
  export function yLPara(x: number, y: number, bocaPara: (yL: number) => Ponto): number;
  export function caminho(f: Fatia, bocaPara: (yL: number) => Ponto, meiaPadrao: number): Float32Array;
  /** one salvo slice, drawn at its own start with the ship where it is (`sorteiaSalva`'s loop body) */
  export function sorteiaFatia(P: number, x: number, sorte: () => number, bocaPara: (yL: number) => Ponto): { lo: number; hi: number; de: number; ate: number; para: number };
  /** the beam's band (half-width `meia`) touches the box */
  export function feixeNaCaixa(fx: Feixe, meia: number, esq: number, dir: number, topo: number, base: number): boolean;
  // raio.ts
  export class Raio implements Habilidade { /* nome = 'raio' */ }
  ```

  `_oraculo.mjs` exporta `rodarOraculo({ hab, log, pontos, idle, ... }) → { piorPosicao, diferencas[] }`: a fachada
  falsa e o laço.

**Passos:**

- [ ] **Passo 1: Gerar o registro da maquete (o oráculo).**

  ```
  node scripts/_serpente/_habilidades-maquete.mjs varredura docs/superpowers/folhas/2026-10-29/serpente-casco/cru - <scratchpad>/oraculo-raio.webm pose=$M/cru3/cabeca-raio rastreia=$F/oraculo/raio.json
  ```

  O clipe (`-`) não é usado no `varredura`. Guarde a semente da salva (11, a padrão).

- [ ] **Passo 2: Os testes que falham.**

  **A geometria:**

  ```js
  // ─── the beam's geometry ───
  {
    const G = await import('../src/entities/serpente/geometriaRaio.ts');
    const fx = G.feixe({ x: 240, y: 100 }, Math.PI); // straight left
    ok(fx.x1 === 0 && fx.y1 === 100 && !fx.bate, 'o feixe vai da boca à borda esquerda');
    const desce = G.feixe({ x: 240, y: 100 }, Math.PI - 0.6);
    ok(desce.bate && Math.abs(desce.y1 - 150) < 1e-9, 'o feixe que desce para no casco (y 150) e marca que bateu');
    ok(G.feixeNaCaixa(fx, 6, 50, 71, 104, 113) && !G.feixeNaCaixa(fx, 6, 50, 71, 107, 116), 'a faixa do feixe fere a caixa que ela toca, e só ela');
  }
  ```

  **O oráculo do raio:** o porte rodado com a fachada falsa, contra `$F/oraculo/raio.json`. A cada quadro:
  - `raio` igual (x0, y0, x1, y1 e meia até 1e-6, e `bate`);
  - `cab` igual (o nome e o quadro).

  Na leitura, a maquete usa `naveX` (o centro do desenho da nave). O porte usa `nave().x + 1,5` ali, pela R4, e por
  isso bate exato.

  ```js
  {
    const { rodarOraculo } = await import('./_serpente/_oraculo.mjs');
    const r = await rodarOraculo({ hab: 'raio', log: '$F/oraculo/raio.json', pontos: '$M/cru3/cabeca-raio/pontos.json', semente: 11 });
    ok(r.piorPosicao < 1e-6 && r.cabFora === 0, `o raio portado = a maquete aprovada, quadro a quadro (pior ${r.piorPosicao.toExponential(1)} px; ${r.cabFora} quadros de cabeça fora)`);
  }
  ```

  (Troque `$F`/`$M` pelos caminhos reais no arquivo.)

  **`_oraculo.mjs`** — a fachada falsa do raio:
  - **`ponto(chave, i, tipo)`:** `{ x: ORIG.x + p[0]·KC, y: ORIG.y + p[1]·KC }`, a fórmula da maquete (linhas 59,
    1446–1447), com `ORIG = round(300 − 137·0,55, 142 − 133·0,55)`, `KC = 141/256` e o `p` do `pontos.json` da
    maquete pelo nome do conjunto (`raioAberta` → `aberta`). As bocas e o olho em px do quadro vêm do `pontos.json`,
    não do `gestosHab`, para os números serem os da maquete.
  - **`nave()`:** o `nave` do registro no quadro k.
  - **`tocador`:** um falso que guarda o `{ chave, i }` mostrado (`mostrar`) e `null` no `idle()`.
  - **`treme`, `luz`, `contra`:** guardados, para conferir.
  - **o laço:** para k = 0…N−1:

    ```js
    hab.t = k / 30 - PRE;
    hab.update(1 / 30);
    hab.desenhar(() => {});
    ```

    e compara com o `log[k]`. `PRE = 9/8 − 0,3` (maquete 1804).

- [ ] **Passo 3: Rodar e ver falhar** (os módulos não existem).

- [ ] **Passo 4: Escrever `geometriaRaio.ts`.** Porte das linhas:
  - 1436–1444 (`yBorda`, `angDe`, `feixe`, com `CRISTA = 151`);
  - 1449–1453 (`poseDe` recebe a `faixa`; `quadroDe` recebe o `n`);
  - 1473–1480 (`yNaColuna`, `yLPara`, com `bocaPara` injetado);
  - 1481–1495 (`caminho`, com `W`/`H` de `pixels.ts`).

  **`sorteiaFatia`:** o corpo do laço das linhas 1519–1530, sem o relógio. Ele consome 4 `sorte()` na mesma ordem
  (`d`, `h`, `sobe`, `desce`) e devolve `de`, `ate` e o `para` (o `Q`).

  **`feixeNaCaixa`:** amostra o segmento a cada 1 px; algum ponto dentro da caixa crescida de `meia`:

  ```ts
  export function feixeNaCaixa(fx: Feixe, meia: number, esq: number, dir: number, topo: number, base: number): boolean {
    const L = Math.hypot(fx.x1 - fx.x0, fx.y1 - fx.y0);
    if (L < 1e-6 || meia <= 0) return false;
    const n = Math.ceil(L);
    for (let s = 0; s <= n; s++) {
      const x = fx.x0 + ((fx.x1 - fx.x0) * s) / n, y = fx.y0 + ((fx.y1 - fx.y0) * s) / n;
      // the band is perpendicular to the beam: distance from the box to the point ≤ meia
      const dx = Math.max(esq - x, 0, x - dir), dy = Math.max(topo - y, 0, y - base);
      if (Math.hypot(dx, dy) <= meia) return true;
    }
    return false;
  }
  ```

- [ ] **Passo 5: Os números do raio em `numerosHab`.** Acrescente ao `HAB`:
  - `raio`: o `VARRE` da maquete (linhas 1419–1434), sem os campos de estado (`feixe`, `foraDoAviso`) e sem a
    `semente`;
  - `conjuntos.raio`: `{ fechada: 'raioFechada', aberta: 'raioAberta', abre: 'raioAbre', recupera: 'raioRecupera' }`.

  `npm run typecheck`.

- [ ] **Passo 6: Escrever `raio.ts`.** Porte das linhas da maquete, com R1–R8:

  | Linhas | O quê |
  |---|---|
  | 1419–1434 | `VARRE`, de `HAB` |
  | 1435 | `FX` |
  | 1455–1471 | `CABV`, `cabAgora`, `pontoCab`, `vira` |
  | 1496–1512 | o `DREC` e a linha do tempo das 2 fatias grandes |
  | 1540–1603 | `varrePasso`, sem o 1604–1611 |
  | 1613–1643 | `efeitosPasso` |
  | 1645–1650 | `varreTreme` → `corpo.treme` |
  | 1652–1661 | `anel`, `brilho` |
  | 1662–1795 | `varreDesenha` |

  **O que muda:**
  - `CAB[nome].length` → `CONJUNTOS[chave].quadros`; `PONTOS[nome].faixa` → `CONJUNTOS[chave].faixa`;
  - `naTela(PONTOS.x.boca[i])` → `corpo.ponto(chave, i, 'boca')`, e o mesmo com `olho`;
  - `CABV.nome/x` → depois do passo, `corpo.tocador.mostrar(chave, quadroDe(...))`, ou `corpo.tocador.idle()` quando
    `CABV.nome === null`. O `idle()` só é chamado na transição: guarde o último estado;
  - `FX.luz` → `corpo.luz({ ciano: FX.luz })` a cada passo;
  - `faiscas`/`gas.push` → a `Particulas` da instância; `gas` → `this.p`.

  **A salva, fatia a fatia** (Correção 3). Em vez de `sorteiaSalva` no começo:
  - a linha do tempo da salva (1513–1538, sem o sorteio) cria as 6 fatias com `de`/`ate` pendentes;
  - no `passo`, quando `t` cruza o `t0` de uma fatia pendente, ela é sorteada com a nave de agora:

    ```ts
    const n = this.corpo.nave();
    const s = sorteiaFatia(n.y, n.x, this.sorteSalva, (yL) => this.bocaPara(yL));
    f.de = s.de; f.ate = s.ate;
    ```

  - `this.sorteSalva = gerador(semente)`, com a semente do `comecar()`: `Math.random` no jogo, 11 no oráculo, por
    um campo `sementeSalva`.

  **O resto:**
  - **`morde`:** `!this.abortando && this.feixe && feixeNaCaixa(this.feixe, this.feixe.meia, esq, dir, topo, base)`;
  - **`viva`:** `this.t < this.fimRec` ou partículas vivas. O `fimRec` (o fim da última recuperação, linha 1537) só
    depende dos tempos das fatias, não do sorteio: calcule-o no `comecar()`;
  - **`abortar`:** o feixe apaga na hora; o resto some em 0,5 s, como na chuva.

- [ ] **Passo 7: Registrar:** `this.habs.raio = new Raio(this.corpoHab);`. O ciclo da B não tem `raio`.

- [ ] **Passo 8: Rodar.** O teste puro e o oráculo → ok. Se o oráculo falhar, ache a primeira linha diferente: o
  `_oraculo.mjs` imprime o primeiro quadro e o campo. Corrija o porte (nunca o oráculo) até bater.

- [ ] **Passo 9: O modo `raio` da sonda.** A forma A com `hab: 'raio'`, a nave intocável e o `morde` contado
  (envolva o `boss.morde` como o `damageShip`):
  - **quem fica:** na 1ª fatia, a nave parada em y 60; na 2ª, em y 130. Esperado: ≥ 1 mordida em cada;
  - **quem sai:** a nave segue o manequim da maquete (linhas 1846–1852), com a regra da salva na hora de cada
    fatia: vai de `de` a `para` em `[t1 − 0,32, t1 − 0,06]`. Esperado: 0 mordidas;
  - **a salva sempre tem saída:** 200 sorteios com sementes diferentes (`hab.sementeSalva`), em todos `|para − de| ≤
    25` e `30 ≤ para ≤ 143`.

  Rodar → ok. Filmar a A inteira e olhar ampliado:
  - a cabeça mira;
  - o raio em camadas, com a frente de energia;
  - o casco cortado esfriando;
  - o tranco.

- [ ] **Passo 10: Relatar.**

---

### Tarefa 12: O gás + faísca (a mecânica, a geleia, o termômetro, o contra, a carta)

> **FEITO (03/11)** — `termometro.ts`, `geleia.ts`, `gas.ts` + a fachada do gás no `_oraculo.mjs`. Os TRÊS oráculos
> batem de primeira (padrões 466, contra 418, carta 184 quadros: 0 diferença na geleia, no termômetro e na cabeça); com
> a semente física errada eles acusam (255 quadros de geleia), com a visual errada não (só aparência). Sonda na A:
> esquivas certas com folga 16,8 / 17,9 / 16,3 px; erradas mordidas; o contra enche o termômetro (t 10,0), tira 15%
> num toque, as três se encolhem; a carta acende 0,09 s depois do 1º toque. Desvios:
> - a esquiva ERRADA dos trilhos é subir para um trilho (ficar parada é a certa nos trilhos); leque e fila: parada;
> - os tiros do jogador: o gás segue cada bala ativa (`corpo.balas()` só dá as ativas) e conta quando ela chega à borda
>   dela OU some antes (morreu no corpo); a centelha da maquete na morte do tiro saiu (a cena já desenha o acerto);
> - `HAB.cicloIdle` (9/8) passou a ser comum ao raio e ao gás; `HAB.conjuntos.gas.B` já entra (a B usa o padrão da A
>   até a Tarefa 13);
> - o fim do gás: `tVolta`, ou o fim do encolhe no contra; a nuvem que ainda se desfaz é `restos` (o rescaldo).

**Arquivos:**
- Criar: `src/entities/serpente/termometro.ts` (puro), `src/entities/serpente/geleia.ts` (puro),
  `src/entities/serpente/gas.ts`.
- Modificar:
  - `BossSerpente.ts` (registra `this.habs.gas`);
  - `_oraculo.mjs` (a fachada do gás);
  - `test-serpente-hab.mjs` (o termômetro e os oráculos do gás);
  - `_sonda-hab.mjs` (os modos `gas`, `contra` e `carta`).

**Interfaces:**
- **Produz:**

  ```ts
  // termometro.ts (mock 907–1006)
  export class Termometro {
    v: number; mostra: number; alfa: number; estado: 'sobe' | 'cheio' | 'zera' | 'fogo' | 'estourado'; t0: number; pisca: number;
    constructor(acaso: () => number);
    esquenta(t: number, q: number): boolean;      // true when it just filled (the caller lights the flashback)
    zera(t: number): void;
    acender(t: number): void;                     // the card
    passo(t: number, dt: number, ativo: boolean, estouros: Estouro[]): void;
    desenhar(put: Put, t: number): void;
  }
  // geleia.ts (mock 540–807): the jelly blobs, their threads, their step and their one-field draw
  export class Geleias {
    constructor(acaso: () => number, visual: () => number, boca: (cor: Cor) => Ponto, nave: () => Ponto);
    readonly lista: Geleia[];
    nova(x: number, y: number, vx: number, vy: number, R: number, origem: string, extra?: Partial<Geleia>): Geleia;
    deforma(g: Geleia, l: number, psi: number, amp: number, empurrao?: boolean): void;
    passo(t: number, dt: number): void;
    desenhar(put: Put): void;
    /** the burning jelly (alight) touches the box — what hurts (spec §3.4) */
    toca(esq: number, dir: number, topo: number, base: number): boolean;
  }
  // gas.ts
  export class Gas implements Habilidade { /* nome = 'gas'; contra; carta */ }
  ```

**Passos:**

- [ ] **Passo 1: Gerar os registros da maquete** (os três modos da rodada 13, com as cabeças):

  ```
  node scripts/_serpente/_habilidades-maquete.mjs gas docs/superpowers/folhas/2026-10-29/serpente-casco/cru - <scratchpad>/g.webm pose=$M/cru3/cabeca-gas rastreia=$F/oraculo/gas-padroes.json
  … contra=1 rastreia=$F/oraculo/gas-contra.json
  … carta=1 rastreia=$F/oraculo/gas-carta.json
  ```

- [ ] **Passo 2: Os testes que falham.**

  **O termômetro** (puro):

  ```js
  // ─── the thermometer ───
  {
    const { Termometro } = await import('../src/entities/serpente/termometro.ts');
    const T = new Termometro(gerador(7));
    let cheio = -1;
    for (let i = 1; i <= 14 && cheio < 0; i++) if (T.esquenta(i * 0.12, 1 / 12)) cheio = i;
    ok(cheio === 12, `12 tiros de gás cheio enchem o termômetro (${cheio})`);
    const U = new Termometro(gerador(7));
    U.esquenta(0, 0.5);
    for (let t = 0; t < 5; t += 1 / 60) U.passo(t, 1 / 60, true, []);
    ok(Math.abs(U.v - 0.3) < 0.01, `esfria 0,04 por segundo (${U.v.toFixed(3)})`);
    U.zera(5);
    ok(U.v === 0 && U.estado === 'zera', 'a faísca zera');
  }
  ```

  **Os oráculos do gás**, os três registros:
  - por quadro, cada geleia: `id`, `x`, `y` e `r` até 1e-6;
  - `termo.mostra` até 1e-9;
  - `cab` igual.

  **A fachada falsa do gás em `_oraculo.mjs`:**
  - **`boca(cor)`:** a fórmula da maquete (linhas 110–121), com o `pontos.json` de `cabeca-gas`, os `BOCAS` e o
    `BOCA_IDLE`:
    - no conjunto mostrado, `{ x: 300 + BOCAS[cor][0]·0,55 + (p[0] − p0[0])·141/256, y: … }`;
    - no idle, `POSTO + (BOCAS + BOCA_IDLE[idle])·0,55`, com `idle = floor((t − tIdle)·8) % 9` e o `tIdle`
      guardado no `idle()` (começa em −PRE).
  - **`labios()`:** `boca('verde')` − (3, −1,5).
  - **`nave()`:** o `nave` do registro.
  - **`bordaEsq(y)`:** a da maquete (linhas 86–92). A fachada lê `public/sprites/serpente-anim-0.png` reduzido a
    0,55 com o vizinho mais perto.
  - **`balas()`:** nos registros `contra` e `carta`, os tiros da maquete (linhas 1088–1090). Antes de cada passo, a
    fachada cria `{ x: nave.x + 1,5 + 26, y: nave.y + 1, active: true }` quando `t − ultimo ≥ 0,12 && t > 0,3`, e
    move todos `320·dt`. A bala que passa de `bordaEsq` fica `active = false` no passo seguinte (no jogo, ela morre
    no corpo dela).
  - **`incendiario()`:** verdadeiro no registro `carta`.

  `PRE = 0,6 + ceil((9/8 − tAbre − 0,6)·30)/30`, com `tAbre = 0,2 − 1,0` (maquete 1804).

- [ ] **Passo 3: Rodar e ver falhar.**

- [ ] **Passo 4: Os números do gás em `numerosHab`.** Acrescente ao `HAB`:
  - `gas`: o `GASCFG` (linhas 502–515, sem `contra` e `carta`, que viram estado), o `VAPOR` (516), o `GEL` (551, sem
    o `modo`, que fica `'pinga'`), o `PADRAO` como `padroes: { A: PADRAO, B: PADRAO }` (868–874), o `TERMO` (912), o
    `RAMPA` (950) e o `GMOV` (1263);
  - `conjuntos.gas.A`: `{ abre: 'gasAbreA', sopra: 'gasSopraA', carga: 'gasCargaA', bote: 'gasBoteA', fecha: 'gasFechaA', encolhe: 'gasEncolheA' }`.

  `npm run typecheck`.

- [ ] **Passo 5: Escrever `termometro.ts`:** maquete 912–1006 com R1–R7.
  - o `acende(x, y, t, 'nave')` da linha 918 sai daqui: `esquenta` devolve `true` e o `gas.ts` acende;
  - o estouro do vidro empurra para a lista `estouros` do gás.

- [ ] **Passo 6: Escrever `geleia.ts`:** maquete 540–807 com R1–R7. `boca(g.alvo)` e `boca(g.preso)` vêm do
  construtor.

  **`toca`:** uma geleia acesa (`calor > 0,3`, que é o mesmo limiar das faíscas, linha 1144) cujo contorno visível
  alcança a caixa. A conta é a do raio do registro `rastreia`:

  ```
  raioDe(g)·(0,85 + 0,15·calor)·(1 + |A01| + |A23|)
  ```

  e o teste é a distância do centro à caixa ≤ esse raio. É a mesma medida das sondas das rodadas 7 e 13 (a folga
  ≥ 12 px).

- [ ] **Passo 7: Escrever `gas.ts`.** Porte da maquete, com R1–R8:

  | Linhas | O quê |
  |---|---|
  | 489–491 | a grade |
  | 518–531 | o estado, `labios` → `corpo.labios()`, `naveC` → `corpo.nave()`, `celula`, `linha` |
  | 808–819 | `acende`, sem o ramo morto |
  | 843–856 | `naCara`, `respinga` |
  | 875–906 | `bolsao`, `golpeia` |
  | 1007–1156 | `gasPasso` |
  | 1157–1253 | `estouroDesenha`, `gasDesenha` |
  | 1254–1391 | `GMOV`, `ATAQUES`, `gasCabPasso`, `FXG`, `gasFxPasso`, `gasKick`, `gasFxDesenha` |

  E a ordem de cada quadro da maquete (linhas 1812–1842 e 2059–2066):

  ```ts
  private passo(t: number, dt: number): void {
    this.cabPasso(t);          // gasCabPasso (R5)
    this.gasPasso(t, dt);
    this.fxPasso(t, dt);       // gasFxPasso
    this.p.passo(dt);          // passoGas
    // the screen: the counter's shake (the physics die, as the mock's `quadro` call), else the peck's kick (the looks die)
    if (this.sacode > 0) this.corpo.treme(Math.round((this.acaso() - 0.5) * 4 * this.sacode), Math.round((this.acaso() - 0.5) * 4 * this.sacode));
    else { const k = this.kick(t); if (k) this.corpo.treme(k.x, k.y); }
    this.corpo.luz({ verde: this.FXG.luzV, laranja: this.FXG.luzL }, this.tinta);
  }
  ```

  **O que muda:**
  - **as balas do jogador** (maquete 1084–1104). Sai o laço de `disparos`; entra o laço sobre `corpo.balas()`. O
    estado de cada bala (`dmax`, `ox`, `oy`, `contada`) fica num `WeakMap<object, …>`. A bala conta quando chega a
    `x ≥ corpo.bordaEsq(round(y))` ou quando fica inativa depois de ter cruzado gás, uma vez só;
  - **o contra:** `GASCFG.contra` e `GASCFG.carta` vêm de `corpo.incendiario()` (a carta). O contra acontece quando o
    termômetro enche;
  - **o dano:** no primeiro `naCara` do contra, `corpo.contra()` uma vez (15%);
  - **`respinga`:** só para as cabeças vivas (na B não há azul);
  - **os conjuntos:** `CAB[nome]` → `CONJUNTOS[HAB.conjuntos.gas[forma][nome]]`, com `forma` = `corpo.forma`;
  - **`GCAB.tIdle`:** sai. O porte chama `corpo.tocador.idle()` onde a maquete faz `GCAB.tIdle = t`;
  - **`golpe`:** sai (só valia sem os conjuntos, linha 65 do trecho da geleia), e `sacode` fica.

  **Os outros membros:**
  - **`morde`:** `!this.abortando && this.geleias.toca(esq, dir, topo, base)`. Só a geleia acesa fere (spec §3.4).
    O lampejo do gás queimando é só visual: na rodada 6, o gás fino do lado da nave "só pisca, e nada volta para a
    nave", e as folgas das rodadas 7 e 13 foram medidas contra a geleia;
  - **`viva`:** até `tVolta` (ou o fim do `encolhe` no contra), e sem geleia nem queima;
  - **`abortar`:** como os outros.

- [ ] **Passo 8: Registrar:** `this.habs.gas = new Gas(this.corpoHab);`.

- [ ] **Passo 9: Rodar os oráculos.** Os três devem bater. Corrija o porte, nunca o oráculo.

- [ ] **Passo 10: Os modos da sonda, na forma A.**

  **`gas`:** a nave faz as esquivas certas da maquete (o `CAM.padroes` das linhas 1820–1824: os tempos são do relógio
  da habilidade, `hab.t`; a nave segue em x 85, com o y interpolado). Medidas:
  - mordidas: 0;
  - a folga mínima entre o contorno de cada geleia e a caixa da nave: ≥ 12 px em cada padrão;
  - a 2ª volta, com `--esquiva errada` (a nave parada em y 100): ≥ 1 mordida em cada padrão.

  **`contra`:** o `CAM.contra`, atirando de verdade (o fogo do jogador ligado na sonda, como no `_sonda-luta`).
  Esperado:
  - o termômetro enche (`hab.termo.estado === 'cheio'`);
  - a vida da forma cai 15% (±1 de arredondamento) num toque só;
  - as três se encolhem (o tocador passa pelo `gasEncolheA`).

  **`carta`:** `arena.incendiario = () => true` (troque a função no objeto da arena pela sonda). Esperado: acende no
  primeiro tiro que toca o gás (`termo.estado === 'fogo'` em ≤ 0,2 s depois do 1º toque).

- [ ] **Passo 11: Filmar** os três e olhar ampliado. Relatar.

---

### Tarefa 13: O gás na B, e as esquivas medidas de novo

> **FEITO (03/11), sem ajuste:** com os conjuntos da B no mapa e o padrão da A, as esquivas certas da B passam de
> primeira com folga 16,4 / 18,4 / 15,7 px (≥ 12) e as erradas são mordidas; o contra enche o termômetro (t 9,4), tira
> 15% num toque e elas se encolhem (`gasEncolheB`); a carta acende 0,01 s depois do 1º toque. `HAB.gas.padroes.B`
> segue igual ao da A (fica separado para calibrar jogando). A sonda passou a aceitar o encolhe de qualquer forma.
>
> **As respostas dele na pausa 5 (03/11)** — o gás aprovado; *"pode fazer contar como cabeça"*; e *"a sequência dos 3
> tiros na de 2 cabeças precisa mudar [...] uma das novas variações precisa pegar também a parte de baixo, o instinto do
> jogador para escapar dos tiros pode ser ir para baixo rente ao casco"*:
> - **a boca aberta é cabeça nos gestos:** num quadro de conjunto, o corte reto da cápsula vai `ALEM_GESTO` (10 px) além
>   da boca, e a luz da cabeça perto da boca também conta (`BossSerpente.acertoNoCorpo`). Mapa por quadro: `sonda-hab
>   mapa-gestos --quadros …` — no gás da B a cabeça de frente passa de 2–4 linhas para 11–17, o toco segue corpo; na A
>   nenhuma outra cabeça entra; a C (o erguer) não muda. A sonda `corpo` mede o alcance numa pausa (`emPausa`);
> - **a sequência da B é outra** (`HAB.gas.ordem.B`, `padroes.B`; um alvo de golpe pode ser um objeto com `dy`, `rente`
>   — rente ao casco na coluna da nave — e o próprio `R`/`v`/`corte`/`tRacha`): RASTEIRA (uma no rumo da nave, que
>   rasga em três, + um trem rente ao casco → suba), CORTINA (três trens: 54 px acima, na linha, rente ao casco → meio
>   passo para o vão), FILA RASTEIRA (na nave, no casco, na nave → continue subindo). Sonda B (3 voltas: certa, parada,
>   MERGULHO no casco depois de cada golpe): a certa passa com folga 18,1 / 14,0 / 13,8 px; parada e mergulho são
>   mordidos nas três. Ajustes: a cortina de −48 para −54 (11,7 → 14,0 px); a esquiva certa da fila começa de 118.
> - **a correção dele (03/11):** *"Você está considerando o casco com o chão [...] A nave não bate no casco, então ela pode
>   se esconder embaixo dele [...] o último tiro da leva B eu quero que cruze o casco para baixo"*. O casco é FUNDO (a nave
>   desce até ~211). A 3ª da B virou a FILA FUNDA: na nave, depois dois leques que ATRAVESSAM a crista (`cruza`, herdado
>   pelos pedaços) mirando y 168 e 196, R 9,5/10,5, a 135 px/s (mais lentos chegavam frios na beira esquerda e deixavam
>   cantos seguros). Medido em Node com o módulo do jogo (o servidor caiu por falta de memória; a sonda ganhou a volta
>   `escondida` em y 185 para provar no jogo): a certa com folga 15,7 / 13,9 / 61 px; parada e rente à crista mordidas
>   nas três; escondida escapa da rasteira e da cortina e é mordida na fila funda; 0 de 100 pontos sob a crista seguros.
>   Com o servidor de volta (um só, na 5173: o Vite antigo tinha ficado vivo, órfão, e foi encerrado), a sonda do jogo
>   confirma tudo: certa 18,1 / 14,0 / 61,2 px; escondida 0 / 0 / 19 quadros mordida. O limite da sonda do gás subiu
>   para caber as 4 voltas da B (a 4ª era cortada); `--volta <nome>` filma uma volta específica.

**Arquivos:**
- Modificar: `numerosHab.ts` (`HAB.conjuntos.gas.B` e, se precisar, `HAB.gas.PADRAO_B`), `gas.ts` (o `PADRAO` por
  forma) e `_sonda-hab.mjs`.

**Passos:**

- [ ] **Passo 1: Os conjuntos da B no mapa.** `HAB.conjuntos.gas.B = { abre: 'gasAbreB', sopra: 'gasSopraB', … }`. O
  `gas.ts` lê o `PADRAO` por forma: `HAB.gas.padroes[forma]`, e a B começa como uma cópia do da A.

- [ ] **Passo 2: A sonda na B** (`--forma B --hab gas`, modos `gas`, `contra` e `carta`). Esperado antes de ajustar:
  - o contra e a carta funcionam;
  - as esquivas podem ficar abaixo de 12 px: a boca da verde da B está noutro lugar.

- [ ] **Passo 3: Ajustar só os alvos da B**, até as três esquivas certas passarem com folga ≥ 12 px e as erradas
  levarem dano. Os alvos são:
  - os `alvos` dos trilhos (±30);
  - o `R` e o `v` de cada padrão;
  - os `dt` da fila.

  Ajuste um número de cada vez, rodando a sonda a cada mudança, e anote cada tentativa no relatório. Os da A não
  mudam: rode a sonda da A no fim para provar.

- [ ] **Passo 4: Filmar** a B (os três padrões, o contra e a carta) e olhar ampliado:
  - a verde sacode a cabeça e solta o gás aos solavancos, alta;
  - a laranja gira como torre e recua como canhão;
  - as duas se debatem no contra.

- [ ] **Passo 5: Relatar** os números da B e as medidas.

---

### Tarefa 14: A troca de forma no meio, o desempenho, e o resto do jogo

**Arquivos:**
- Modificar: `_sonda-hab.mjs` (os modos `troca` e `desempenho`).

**Passos:**

- [ ] **Passo 1: O modo `troca`.** Para cada habilidade (A: chuva, raio, gás; B: chuva, gás):
  1. espera 1,5 s depois do `comecar()`;
  2. zera a vida da forma: `boss.hpFase = 1; boss.damage(1)`;
  3. 0,6 s depois, confere:
     - nenhuma habilidade `viva`;
     - nenhuma bala com `serpTiro` ou `serpCasulo` ativa;
     - a camada sem pixel desenhado (`camada.lona.sujou === false` no quadro);
     - o `morde` falso;
     - o ciclo na pausa da forma nova.

- [ ] **Passo 2: O modo `desempenho`.** Um ciclo inteiro da A e um da B. A cada passo, mede o tempo de JS de
  `boss.update` (com a camada), envolvendo-o com `performance.now()`.
  - **Esperado:** p95 ≤ 4 ms e máximo ≤ 12 ms.
  - **Se o gás passar:** a grade passa a 30 Hz (o `gasPasso` da densidade a cada 2 quadros, com `dt` dobrado), sem
    mudar o desenho, como diz a spec §7.
  - **Se o pico for no começo de uma fatia do raio** (o `caminho`): calcule-o em 4 pedaços nos 4 primeiros quadros
    da fatia. Antes do `tE`, o aviso usa o pedaço já pronto.

- [ ] **Passo 3: O resto do jogo.**
  1. Todos os `node scripts/test-*.mjs`.
  2. `npm run build` (o `tsc` + o vite).
  3. `node scripts/probe-stage2.mjs`, `probe-stage3.mjs` e `probe-stage4.mjs`, e
     `node scripts/_inimigos/_sonda-chefes.mjs` (com o uso de hoje de cada um, olhe a linha 1 de cada).

  Esperado: passam como antes da entrega. Qualquer diferença vai para o relatório com a causa.

- [ ] **Passo 4: Relatar** as medidas.

---

### Tarefa 15: Os vídeos no jogo e a folha

**Arquivos:**
- Criar: `$F/habilidades-no-jogo.html`; `$F/video-<forma>-<hab>.webm`; `$F/cerco.png`, `$F/gasB.png` (a arte nova
  ampliada) e os GIFs dos gestos novos.

**Passos:**

- [ ] **Passo 1: Gravar no jogo** (o `--filmar` da sonda, 30 quadros/s, ×2; depois `ffmpeg` para webm, como o
  `_sonda-luta.mjs`). Com a nave fazendo a esquiva certa:
  - **A:** tiros (as três variações), chuva, raio, gás (padrões), contra e carta;
  - **B:** tiros, chuva, gás, contra e carta;
  - **C:** a rajada e o leque com a brasa.

  ⚠️ Durante a gravação, nada de editar `src/` nem `.html`.

- [ ] **Passo 2: A arte nova, ampliada:** os três cercos e os seis conjuntos da B, em fitas 2× e GIFs na velocidade
  do jogo (12 quadros/s).

- [ ] **Passo 3: A folha `habilidades-no-jogo.html`.** O estilo é o de `projeteis.html` (o mesmo `<style>`). Em
  pt-br, curta, com o resultado primeiro:
  - **"O que entrou no jogo":** a lista do que mudou na luta (as formas, a investida fora, o contra de 15%);
  - **um item por habilidade:** o vídeo no jogo, ao lado do vídeo da maquete aprovada da mesma habilidade (`$M/…webm`);
    abaixo, as medidas da sonda (acertos, folgas);
  - **"A arte nova":** os cercos e a B, ampliados;
  - **"O que eu decidi no caminho":** as Correções 1–6, em uma linha cada;
  - **"Para você decidir":** jogar e dizer o que ajustar.

  Confira a folha com `node $M/ferramentas/verifica-folha.mjs $F/habilidades-no-jogo.html` (veja a linha 1 para o
  uso): 0 erros, largura 1280.

- [ ] **Passo 4: Relatar** o caminho da folha.

---

### Tarefa 16: Os registros

**Arquivos:**
- Modificar:
  - `docs/HANDOFF.md`: o bullet de 02/11 (4), a instalação feita, esperando ele jogar;
  - `$M/PROGRESSO-gravidade-zero.md`: a seção "02/11 (4): instalado no jogo", com o que foi portado, os oráculos, as
    sondas, os números da B e as correções;
  - a memória `roadmap-blocos-d-a-j.md` e o `MEMORY.md`: a linha do roadmap. O próximo é o retorno dele jogando.

**Passos:**

- [ ] **Passo 1:** escrever os três, curtos, com os números medidos.
- [ ] **Passo 2:** a lição nova, se houver, na memória certa:
  - no PixelLab, na `pixminimax-animacao`;
  - no porte, uma memória nova `porte-de-maquete-com-oraculo`, se o método se provar: a maquete como oráculo do
    porte.
- [ ] **Passo 3: Relatar a ele.** O resultado primeiro, o link da folha, e as correções à spec. **Sem commit:** ele
  pede.

---

## Revisão do plano contra a spec

| Spec | Tarefa |
|---|---|
| §2.1 o ciclo da A, a pausa com 2 tiros, o posto baixo (o desce saiu na emenda de 03/11: ela fica fixa no posto) | 8 (ciclo), 9 (tiros), emenda 03/11 |
| §2.2 o ciclo da B, os gestos da B, as esquivas ≥ 12 px | 2, 8, 13 |
| §2.3 a C com a brasa, sem investida | 8, 9 |
| §2.4 a fusão sem investida, com a gota de hoje | 8 |
| §2.5 a investida sai | 8 |
| §2.5 o contra de 15% | 12 |
| §2.5 o aborto em 0,5 s | 8, 10–12, 14 |
| §3.1 os sprites B, a caixa, o clarão, os gestos, as variações | 4, 9 |
| §3.2 a chuva de casulos, a chama e a fumaça na cor, o gesto, as caixas | 4, 10 |
| §3.3 o raio: a sequência, a salva, os gestos, os efeitos, só o desenhado fere | 11 |
| §3.4 o gás: a mecânica, o termômetro, a carta, os gestos e efeitos da A e da B | 12, 13 |
| §4.1 a arte existente | 4 |
| §4.2 o PixelLab | 1, 2 |
| §4.3 as medidas | 4 |
| §4.4 as luzes | 4, 6 |
| §5.1 a camada | 5 (com a Correção 1) |
| §5.2 os módulos | 3–12 |
| §5.3 o que fere | 7, 9–12 |
| §5.4 as balas e a carta | 7, 12 |
| §5.5 o código compartilhado | 6, 7 |
| §5.6 o atalho | 7 |
| §6 as sondas | 6–14 |
| §6 os vídeos | 15 |
| §7 os riscos: a B, o peso, as esquivas | 2, 14, 13 |
