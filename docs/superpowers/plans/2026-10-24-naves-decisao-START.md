# START — decidir a nave humana (os concepts dele) e voltar ao roadmap

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A sessão abre na folha
> `naves-conceito.html`: decidir a nave humana com ele e voltar ao roadmap (H → I → J → F)."**
> O roadmap vivo é o 🧭 do HANDOFF; este START é o mapa de entrada da sessão.

## Onde o projeto está (24/10, fim da sessão)

- **Branch `feat/cartas-preview`, empurrada para `origin`** (nunca `legacy`). Os commits das naves:
  - `a246573`: o jogo (a humana vai até a T2, peças só se a nave ainda evolui, a T0 mais enxuta);
  - `bf18db6`: as ferramentas, os testes e as folhas, sem o `cru/`;
  - mais os docs (este START e o HANDOFF).
- **Fora do git, de propósito:**
  - os vídeos (`*.webm`) e GIFs das folhas;
  - as pastas `cru/`. Os concepts dele e as 72 candidatas estão em `folhas/2026-10-22/naves/cru/conceito/`, só no
    disco;
  - os `concept art …png` da raiz;
  - o `.env.pixellab`.
- **No jogo:**
  - a humana é **T0 → T1 → T2** (a T3 saiu; os PNGs dela seguem na pasta);
  - **só há peças se a nave ainda pode evoluir** (`podeEvoluir` em `src/pecas.ts`): a humana no T2 cruza a F3 sem
    peças, e a manta (T1 na Doca) segue para o T2 pela F3;
  - **a T0 laranja tem 33×15** (era 35×16), encolhida sem redesenho.
- **Guardado, NÃO instalado:**
  - a pintura preta (o extra) em `naves/encolher/preta/` e `preta-t0-33x15/`;
  - a T0 32×14 de alternativa em `naves/encolher/t0-32x14/`;
  - as candidatas dos concepts.

## ▶️ COMEÇAR AQUI

1. **Abrir a folha com ele:** http://localhost:5173/docs/superpowers/folhas/2026-10-22/naves-conceito.html. Se o
   servidor não estiver de pé, `npm run dev`; se cair por falta de memória, perguntar a ele antes de subir de novo.
   - A folha anterior, `naves-encolher.html`, tem o que já está no jogo e a pintura preta. Ela tem um link no topo
     da `naves-conceito.html`.
2. **As quatro decisões que esperam por ele**, nesta ordem:
   - **A. Os concepts são o caminho? Qual candidata de cada pintura?**
     - As escolhidas da folha são a, b, c e d, que são estes arquivos em `naves/cru/conceito/gerado/`:
       - laranja: `laranja-48x32-21-00`, `-12`, `-18` e `-24`;
       - preta: `preta-48x32-21-00`, `-12`, `-18` e `-26`.
     - As 72 estão no `<details>` da folha (`todas-laranja.png`, `todas-preta.png`), e o número de cada uma é o `NN`
       do arquivo.
     - Ficaram de fora por pixel solto: `laranja-30`, `preta-11` e `preta-17`.
   - **B. Onde ela entra:**
     - no lugar da T2 de hoje (a T0 e a T1 ficam), ou
     - como base da escada inteira: uma T0 e uma T1 tiradas dela, menores e com menos peças.
   - **C. A T0 leve (33×15), já no jogo:** ele confirma jogando, ou pede a 32×14.
   - **D. Como a pintura preta entra:**
     - guardada por enquanto;
     - uma opção de pintura no menu ou na Doca;
     - um prêmio (por exemplo, ao terminar o jogo).
3. **O que fazer com cada resposta:**
   - **Se os concepts NÃO forem o caminho:** fica a nave de hoje, e só C e D seguem. Volta ao roadmap (passo 5).
   - **Se uma candidata for no lugar da T2:**
     1. Encaixar no quadro 44×26 da T2, com o centro da caixa no mesmo lugar.
     2. Limpar os pixels soltos, ampliado.
     3. Conferir a régua de hoje: a hitbox (21×9) e a boca do tiro, desenhadas na 2a (`_silhuetas.mjs`).
     4. Animar o motor: os 8 quadros e a variante azul dos Propulsores (`humana-t2-anim-*` e `-azul-anim-*`).
        - ⚠️ Os quadros de hoje não mudam só a chama. Medido em 24/10: cerca de 110 px mudam por quadro, espalhados
          pelo casco todo, de x 1 a 41 e de y 2 a 23 (luzes e brilho).
        - Medir o que cada quadro faz antes de escolher o caminho:
          - transplantar a diferença para o casco novo (chama no bocal novo, luzes à mão), ou
          - animar no PixelLab com a candidata parada como quadro: o gesto no lugar da arte escolhida segura a
            identidade (a lição do PixMiniMax, 10/10). O redesenho nativo quadro a quadro está reprovado: engorda
            e ferve.
     5. Plantar no jogo, nas fases em que a T2 voa, e medir com `_plantar.mjs` e `_contraste-jogo.mjs`.
     6. Montar a folha e esperar a aprovação dele, por GIF em velocidade real.
   - **Se for a base da escada inteira:** tirar a T0 e a T1 da candidata com MENOS peças, não só menores.
     - A lição de 23/10: com o tier vizinho de assunto, sai a mesma nave; usar a de cima de ESTILO para gerar a de
       baixo copia ela inteira. O que funcionou foi descrever cada tier inteiro, contando as peças, sem assunto e só
       com um estilo.
     - Outro caminho é tirar peças à mão (aleta, bocal) e acertar o tamanho com `_encolher.mjs`.
     - 3–4 opções numa folha, plantadas e medidas, antes de instalar.
   - **Se a preta seguir:** a das candidatas mede 1,03–1,13× na F3, escura demais. Clarear um ou dois tons do casco
     sem mexer no desenho e medir de novo (alvo: perto da laranja, 1,5× ou mais). A preta de hoje (família A) mede 1,3×.
   - **A pintura nova nunca substitui a laranja sem ele dizer:** a laranja é a original, a preta é extra.
4. **A rodada 3, as mantas menores** (a decisão de 22/10: a nave alienígena redesenhada menor a partir da arte
   aprovada). Ainda não abriu. **Perguntar a ele** se ela vem agora ou depois do roadmap.
5. **De volta ao roadmap:** o **bloco H**, pelo START `plans/2026-10-21-bloco-h-START.md` (abrir com as perguntas a
   ele, antes de gerar), depois I → J → F.

## O que já está decidido (não reabrir)

- A humana é T0 → T1 → T2; a T3 saiu (*"ele é o mais grosseiro"*; os tiers são cosméticos).
- A T2 fica no tamanho original. A T2 menor foi testada e recusada (*"a humana T2 está ok com o tamanho"*).
- A laranja é a original; a preta é um extra (*"a pintura preta é um extra, a laranja é a original"*).
- O vidro da T1 preta é âmbar, como o da T0 e o da T2.
- Nave sempre de perfil. Nave conhecida serve de referência (o princípio), nunca de cópia, e nenhuma imagem de
  terceiros entra no repo.
- Uma observação dele, sem tarefa: da 2a, a **pesada T0/T1 ficou "muito boa"**, e a T2/T3 dela, estranhas com o motor
  embaixo.

## As peças e as ferramentas

- **As folhas, em ordem** (`folhas/2026-10-22/`):
  - `naves.html` (rodada 1);
  - `naves-escada.html` (1b, a gótica em escada, recusada);
  - `naves-detalhe.html` (1c, recusada);
  - `naves-silhuetas.html` (2a, forma primeiro);
  - `naves-encolher.html` (o que ficou);
  - **`naves-conceito.html`** (a decidir).
- **`scripts/_naves/`** (o uso de cada uma está na primeira linha do arquivo):
  - `_gerar-conceito.mjs <laranja|preta> <outDir> <seed...> [--size=WxH]`: o recorte do concept de ASSUNTO
    (`cru/conceito/assunto-<pintura>.png`, a laranja já espelhada de nariz à direita) e a T2 de ESTILO (a preta usa a
    T2 preta).
    - 48×32 dá 36 candidatas por chamada, por 10 gerações.
    - Conferir o saldo antes (`mcp__pixellab__get_balance`).
  - `_triagem.mjs`: o mosaico numerado, com o placar de "vista de cima".
  - `_montar-conceito.mjs`: a imagem `escolhidas.png` da folha.
  - `_plantar.mjs <out> <fase> <t> <tier> <x,y> label=png…`: planta candidatas no jogo de verdade, com a Atmosfera.
  - `_contraste-jogo.mjs`: o número de contraste das folhas.
  - `_testar-tiers.mjs`: confere peças e textura por fase e tier no jogo.
  - `_encolher.mjs <outDir> <W>x<H> <still> [frames…]`: encolhe por costuras, com o mesmo corte em todos os quadros.
  - `_pintar-preta.mjs`: leva a pintura da família A aos quadros animados.
  - `_vidro-ambar-t1.mjs`: o vidro da T1 preta.
  - `_montar-encolher.mjs`: a montagem da `naves-encolher.html`.
- **O jogo:**
  - `TIERS` em `src/ships.ts` (`visualDaNave` prende ao tier que existe);
  - `TIER_MAX` e `podeEvoluir` em `src/pecas.ts`;
  - o carregamento dos quadros em `src/scenes/BootScene.ts`;
  - `TIERS` do sandbox em `src/sandbox/config.ts`.

## As armadilhas

- O PixelLab desenha nave **vista de cima** se o pedido não força o perfil; o concept de assunto resolveu.
- O assunto PRENDE a forma: aqui era o que se queria; para variedade, tirar o assunto.
- O grafite sai mais escuro que a referência de estilo: medir NO JOGO antes de mostrar.
- Os quadros do jato (T1) balançam 0–2 px na vertical: uma correção que só vale na parada pisca no jogo.
- Defeito apontado em peça aprovada: corrigir só aquilo e provar que o resto ficou idêntico, contando os pixels.
- Durante uma filmagem, NÃO editar `src/` nem `.html` do projeto (as folhas em `docs/` também): o Vite recarrega.
- `sed` e `node -e` falham em silêncio aqui (CRLF, `${}`): editar com Edit e conferir.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`.
  - Ficam fora do commit: os vídeos, os GIFs, as pastas `cru/` e os `concept art` da raiz.
  - O `.env.pixellab`, nunca.
- A conversa com ele em português; código, prompts e raciocínio em inglês.
- Arte:
  - 3–4 opções numa folha antes de instalar;
  - abrir cada geração ampliada antes de mostrar;
  - a fila de review do PixelLab é a biblioteca dele (nunca descartar em massa).
- Avaliar mecânica e efeito por vídeo ou GIF em velocidade real.
