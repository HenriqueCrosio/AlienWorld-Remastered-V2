# START — o retorno dele jogando, e depois o bloco H (os efeitos de imersão por fase)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Tudo de 22–27/10 está commitado e empurrado.
> Primeiro o retorno dele jogando (§0); depois o bloco H, abrindo com as perguntas a ele."**
> O roadmap vivo é o 🧭 do HANDOFF (a ordem dele: G ✅ → **H** → I → J → F); este START é o mapa de entrada da sessão.

## Onde o projeto está (27/10, fim da sessão)

- **Branch `feat/cartas-preview`, empurrada para `origin`** (nunca `legacy`). Os últimos commits, de 27/10: `7132126`
  (a haste da Terminus fora do hangar), `159646a` (a destruição por pixel no jogo todo), `5b0d522` (a aranha da
  caverna), `a0e5708` (as ferramentas, os testes e as folhas, sem os vídeos) e `9ab9227` (os docs). A árvore ficou
  limpa: o material de trabalho das folhas (vídeos, GIFs, `cru/`, os quadros soltos), os `concept art …png` da raiz e
  as duas pinturas de hangar que o jogo não usa estão no `.gitignore` e seguem no disco, como backup. O `.env.pixellab`,
  nunca.
- **Desde 21/10 entraram, fora dos blocos e a pedido dele** (ver os 📍 do 🧭):
  - as naves: uma por linhagem, a cena do hangar, os nomes;
  - a morte da nave, a lasca do casco e a assinatura;
  - **a destruição por pixel no jogo todo:** os inimigos e os chefões se desfazem nos próprios pixels, cada golpe come
    a borda, o cinturão da F2 e os destroços de nave levam as marcas, o asteroide quebra como rocha e a bala passa pela
    brecha. A técnica inteira está em `docs/DESTROCOS.md` (§15, o mapa do motor; §16, a receita);
  - **a aranha da caverna da F1:** uma silhueta preta desenhada por código que sai da luz da abertura e foge para as
    sombras do salão (`docs/CENARIO-VIVO.md` §11, `ARANHA_F1`).
- **A F1 está completa** no visual: o bloco G, a caverna (com o chefão aos 84 s) e a aranha no salão.

## ▶️ COMEÇAR AQUI

0. **O retorno dele jogando vem ANTES do H.** O que espera por ele, e onde se mexe em cada coisa:
   - **o tamanho das marcas** (tiro 1–3 px pelo dano, explosão e míssil 3, bomba 4): `DESTROCOS.marca.px` em
     `src/systems/morte/numerosDestrocos.ts`; o V dos tiros seguidos é o `sulco` (3);
   - **o círculo de acerto da cabeça da Serpente:** está centrado na cabeça, com o raio de antes. Ele decide se encolhe
     até o tamanho da cabeça (a cabeça fica mais difícil de acertar): o `setCircle` em `src/entities/BossSerpente.ts`,
     e a `zona` das marcas (`RAIO_CABECA`) junto;
   - **os arcos menores e o anel em degradê da morte da nave:** `MORTE.assinatura` em `src/systems/morte/numerosMorte.ts`;
   - **a lasca do casco** (24 px, cicatriz de 1,4 s): `MORTE.golpe`;
   - **a rocha** (R2 nos grandes, R3 nos pequenos, os pedaços sumindo em ~0,5–0,9 s): `DESTROCOS.rocha`;
   - **a aranha** (os tempos e os caminhos, em px da pintura do salão): `ARANHA_F1` em `src/f1/numerosF1.ts`. Sumir no
     canto escuro é DE PROPÓSITO (ele: *"ela sai do lado mais luminoso e foge para as sombras"*);
   - e, sem pressa: a F3 inteira e a F4 da rodada de 14/10.
   
   Uma peça aprovada que ele aponta se corrige só naquilo, provando que o resto ficou igual.
1. Ler o 🧭 do `docs/HANDOFF.md` (o item H do roadmap em blocos) e a técnica do cenário vivo em `docs/CENARIO-VIVO.md`.
2. **Perguntar a ele ANTES de gerar** (a regra dele: "antes de gerar, acabe com as dúvidas"). O H, como está no 🧭:
   - **F1:** mísseis caindo do céu nas camadas de trás, e meteoros. ⚠️ O G já pôs na F1 a invasão inteira (a artilharia
     da colônia subindo em traçantes, os holofotes, as naves invasoras descendo, as explosões ao longe com fogo e
     fumaça — `src/f1/invasao.ts`). **Perguntar o que ainda falta:** os meteoros? mísseis atravessando o céu (de quem,
     para onde)? E nada disso no salão da caverna (~42–58 s): o que ficar acima do fundo do salão (depth −83) precisa da
     máscara inversa da caverna. O salão já tem a aranha (~43,7–53,4 s, no teto da abertura e no canto escuro da
     esquerda): nada de imersão disputando com ela ali.
   - **F2:** a silhueta do Leviatã novo passando ao fundo. ⚠️ O bloco D (19/10) já pôs a silhueta distante na F2 (o
     ARO, 40 → 60 px, atrás dos cascos — `LEVI_LONGE` em `src/Parallax.ts`), aprovada por ele. **Perguntar** se o item
     está cumprido ou se ele quer mais presença.
   - **F3:** o verme descartado (ou outro inimigo) como silhueta entre as nebulosas — só cenário; o elite 63-3 segue
     cancelado. Perguntar qual criatura e quando (o rabo do Leviatã vem aos 45 s: a história não deixa o bicho chegar
     antes).
   - **F4:** o golfinho como silhueta em algumas câmaras. Perguntar quais.
   - Ele disse que está aberto a mais ideias: perguntar se tem alguma.
3. Uma fase por rodada, cada uma no jogo, filmada, com a folha HTML e o vídeo; ele julga olhando.

## As regras que valem aqui

- **Imersão é só visual:** sem corpo, sem dano, fora de todo grupo de colisão (como o rabo da F3).
- **Silhueta colossal ao fundo** (19/10): pequena, atrás das camadas de objetos grandes (a régua de escala), quase
  parada, só sombra + um aro frio de 1 px, e a sombra mais escura que o fundo MEDIDO no jogo (numa folha de fundo
  diferente ela sumia). Não aparecer onde a história não deixa.
- **Efeito de cenário se assa em pixel** na resolução nativa, com a paleta do vizinho (Graphics vetorial lê como
  "gerado"); tudo função do relógio (o mesmo instante dá sempre o mesmo quadro: dá para filmar e sondar).
- **Troca de cenário** (se aparecer uma): a arte dele na frente da nave, sólida, a nave pela aura (a peça
  semitransparente POR CIMA dela), a tela inteira coberta por um instante — nunca fade, dissolve, íris ou cortina
  (o caminho da caverna, 21/10).
- **Nada escondido atrás de uma peça na frente de tudo:** nenhum inimigo, tiro ou peça na tela quando ela cobre; a
  sonda confere quadro a quadro (`scripts/_g/_probe-caverna-f1.mjs` é o modelo).
- **Trecho cujas bordas pintadas já mordem não ganha obstáculo plantado** (as rochas do salão liam flutuando).
- **Toda cena passa pela Atmosfera** com perfil próprio (`src/systems/atmosfera/perfis.ts`).

## As ferramentas e as peças que servem

- **O cenário vivo num fundo de fase:** `src/f1/salaoVivo.ts` (brasas por terço, bruma em faixas, fachos, halos,
  poeira — tudo preso a uma máscara) e `src/f1/invasao.ts` (efeitos presos ao relógio da fase); as texturas macias em
  `src/menu/texturas.ts` (`menu-brilho`, `menu-raio-1`, `menu-fog-1`, `menu-cone`); o acaso determinístico em
  `src/menu/acaso.ts`.
- **As luzes de uma pintura:** `scripts/_cenario/luzes.mjs` (detectar, tirar por difusão, agrupar) — usado pelo menu,
  pelo chão da F1 (`_luzes-chao-f1.mjs`) e pelo salão (`_luzes-caverna-f1.mjs`).
- **Filmar a F1 a passos:** `node scripts/_g/_filmar-f1.mjs <dir> <segundos> --limpo --desde=38 --nave=70,120
  --fotos=… [--so-fotos] [--janelas=a-b,c-d --manter]`. Para F2–F4, adaptar o mesmo modelo (relógio a passos,
  `loop.sleep` + `game.step`, `page.screenshot`).
- **Mostrar uma peça no jogo sem tocar em `src/`:** `scripts/_g/_aranha-maquete.mjs` roda a fase numa página de teste,
  injeta a textura e a põe na profundidade certa, com a máscara e a Atmosfera (o modelo para mostrar uma silhueta ou
  um efeito antes de instalar). Um bicho ou efeito desenhado por código: `scripts/_g/_aranha-silhueta.mjs`.
- **Os destroços:** as sondas e os filmes em `scripts/_inimigos/` (a receita no §16 do `docs/DESTROCOS.md`);
  `_quadros-filme.mjs` tira quadros de um filme pronto para conferir antes de mostrar.
- **As armadilhas da filmagem e das sondas:**
  - durante uma filmagem, NÃO editar `src/` nem nenhum `.html` do projeto (as folhas em `docs/` também): o Vite
    recarrega e a filmagem morre;
  - uma sonda que troca de fase na mesma página (parar e começar no mesmo tique) deixa a fase nova carregando para
    sempre: uma página por fase;
  - no `sharp`, um segundo `resize` na mesma cadeia SUBSTITUI o primeiro (recorte em dois passos);
  - um efeito que reage a golpes se confere com a nave e as balas do jogo, nunca com um golpe de mentira vindo de fora;
  - o `director.skipTo` DESCARTA os eventos pulados (o `_filmar-f1` repõe o último `terrain`);
  - a nave intocável PISCA (o filme força ela visível);
  - a `TileSprite` do Phaser 3.60+ guarda a textura de origem em `displayTexture`;
  - a mesa de cartas do meio PAUSA a fase (a da F1 abre aos 79 s; a sonda que passar disso tem de escolher uma
    carta);
  - o Node às vezes sai com `Assertion failed … async.c` depois de gravar: inofensivo.
- **O servidor de dev** fica em `:5173` (`npm run dev`). Se cair por falta de memória, pedir a ele antes de subir de
  novo.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, `cru/`
  e os `concept art` da raiz fora do commit (o `.gitignore` já cuida); o `.env.pixellab` nunca. O padrão dos commits:
  o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`, sem os vídeos) e os docs, nessa ordem.
- Antes de commitar: conferir que todo arquivo que o jogo carrega está no git, e que nada aprovado ficou de fora.
- A conversa com ele em português; código, prompts e raciocínio em inglês.
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; criatura animada nasce inteira
  no PixelLab; fundo pintado em 384×216 (o menu é a única exceção); reduzir pode, ampliar nunca; a fila de review do
  PixelLab é a biblioteca dele (nunca descartar em massa).
- Avaliar mecânica e efeito por vídeo/GIF em velocidade real.
