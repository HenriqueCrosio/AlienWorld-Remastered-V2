# START — o bloco H (os efeitos de imersão por fase)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A caverna da F1 fechou em 21/10, commitada e
> empurrada; o próximo é o bloco H — abrir com as perguntas a ele."**
> O roadmap vivo é o 🧭 do HANDOFF (a ordem dele: G ✅ → **H** → I → J → F); este START é o mapa de entrada da sessão.

## Onde o projeto está (21/10, fim da sessão)

- **Branch `feat/cartas-preview`, empurrada para `origin`** (nunca `legacy`). Os últimos commits: `9864f46` (a caverna
  da F1 e a limpeza das peças antigas), `4476e9f` (as ferramentas, os testes e as folhas da caverna, sem os vídeos) e os
  docs. O que segue fora do git DE PROPÓSITO: os vídeos (`*.webm`) e GIFs das folhas, as pastas `cru/`/`gif/` de
  sessões antigas, os `concept art …png` da raiz e o `.env.pixellab`.
- **A F1 está completa** no visual: o bloco G (a pintura viva, a invasão, o chão, as estruturas, o chefão) e a caverna
  (spec `specs/2026-10-21-f1-caverna-design.md`; a folha atual `folhas/2026-10-21/caverna/vida.html`). O chefão está
  aos 84 s.
- **Pendente dele, sem pressa:** jogar a F1 com a caverna; a F4 da rodada de 14/10; a F3 inteira. Se ele voltar com
  algo do teste, isso vem ANTES do H.

## ▶️ COMEÇAR AQUI

1. Ler o 🧭 do `docs/HANDOFF.md` (o item H do roadmap em blocos) e a técnica do cenário vivo em `docs/CENARIO-VIVO.md`.
2. **Perguntar a ele ANTES de gerar** (a regra dele: "antes de gerar, acabe com as dúvidas"). O H, como está no 🧭:
   - **F1:** mísseis caindo do céu nas camadas de trás, e meteoros. ⚠️ O G já pôs na F1 a invasão inteira (a artilharia
     da colônia subindo em traçantes, os holofotes, as naves invasoras descendo, as explosões ao longe com fogo e
     fumaça — `src/f1/invasao.ts`). **Perguntar o que ainda falta:** os meteoros? mísseis atravessando o céu (de quem,
     para onde)? E nada disso no salão da caverna (~42–58 s): o que ficar acima do fundo do salão (depth −83) precisa da
     máscara inversa da caverna.
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
- **As armadilhas da filmagem e das sondas:**
  - durante uma filmagem, NÃO editar `src/` nem nenhum `.html` do projeto (as folhas em `docs/` também): o Vite
    recarrega e a filmagem morre;
  - o `director.skipTo` DESCARTA os eventos pulados (o `_filmar-f1` repõe o último `terrain`);
  - a nave intocável PISCA (o filme força ela visível);
  - a `TileSprite` do Phaser 3.60+ guarda a textura de origem em `displayTexture`;
  - a mesa de cartas do meio PAUSA a fase (a da F1 abre aos 79 s; a sonda que passar disso tem de escolher uma
    carta);
  - o Node às vezes sai com `Assertion failed … async.c` depois de gravar: inofensivo.
- **O servidor de dev** fica em `:5173` (`npm run dev`). Se cair por falta de memória, pedir a ele antes de subir de
  novo.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs e os
  `concept art` da raiz fora do commit; o `.env.pixellab` nunca.
- A conversa com ele em português; código, prompts e raciocínio em inglês.
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; criatura animada nasce inteira
  no PixelLab; fundo pintado em 384×216 (o menu é a única exceção); reduzir pode, ampliar nunca; a fila de review do
  PixelLab é a biblioteca dele (nunca descartar em massa).
- Avaliar mecânica e efeito por vídeo/GIF em velocidade real.
