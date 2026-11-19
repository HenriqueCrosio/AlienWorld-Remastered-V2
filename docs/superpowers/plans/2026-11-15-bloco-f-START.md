# START — bloco F: a Fase 2, a frota de batedores e a rocha do minerador

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Em 15/11 fechou o bloco M inteiro (M3 a janela
> da NAVE PERDIDA, M4 a tela de carregamento e o favicon), aprovado, commitado e empurrado. A sessão abre no F, a Fase
> 2: os batedores da frota e a rocha do minerador. É jogabilidade: uma pergunta por vez (superpowers:brainstorming),
> conferir no código antes de perguntar, e ele avalia JOGANDO e por GIF."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem MUDOU em 15/11 (o som veio antes): … → J ✅ → M ✅ → o SOM ✅ (16–19/11) →
> **F** → o rebalanceamento. **19/11:** o som fechou e está commitado; o F vem DEPOIS da revisão dele (START `plans/2026-11-19-revisao-START.md`). O que
> segue abaixo é o estado de 15/11 e continua valendo para o F.

## ▶️ ONDE ESTAMOS (15/11, fim da sessão)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`). Os commits do dia: `7d84a73` (M3), `f13a64f`
  (M4), `78c1ace` (testes, ferramentas, folhas, a pintura), `d805a0c` (docs). Fora do git só os vídeos e os `q/`.
- **O bloco M (a MOLDURA do jogo) FECHOU:** M1 a pausa e as CONFIGURAÇÕES, M2 os controles, M3 a NAVE PERDIDA (um tipo
  novo da pausa, sobre a fase parada; spec `specs/2026-11-15-bloco-m3-nave-perdida-design.md`), M4 o carregamento (a
  pintura dele do hangar na tempestade no `index.html`, a X-AELO pequena em silhueta na barra, o favicon transparente;
  spec `specs/2026-11-15-bloco-m4-carregamento-design.md`; ver com `?carregamento=20`).
- **Pendente dele, sem pressa:** o controle de Xbox DE VERDADE; zerar a F4 com a tela final; jogar a F3 e a F4
  inteiras; os clarões não filmados.
- **Guardado para depois:** a zona morta ajustável e um 2º controle; a conta do usuário sincronizando as preferências;
  os ícones de botão fora das CONFIGURAÇÕES.
- **Para o REBALANCEAMENTO (depois do F):** as cartas fortes demais, a vida da enguia, a saída da aranha do casco.

## ▶️ O F: o que está anotado (do 🧭, o item "F — Fase 2: a frota e o minerador")

1. **Os batedores da frota** (as naves finas da pele do cinturão):
   - menos naves por frota;
   - voo de NAVE (inclinar, fazer curva) no lugar da senóide;
   - atirar contra o jogador; manobra de evasão;
   - passar pelo jogador e sair pela esquerda se não forem abatidos;
   - são difíceis de acertar por serem finas: avaliar a hitbox;
   - ⚠️ o `batedor` também voa na F3: decidir se a mudança vale só para a F2;
   - medir o tiro para pressionar sem punir.
   - **19/11 — ELE GEROU DOIS POSSÍVEIS SUBSTITUTOS no PixelLab** (ele: *"os outros são pequenos e difíceis de atirar"*):
     https://www.pixellab.ai/create-object/3f3bd97d-cd0f-4f5c-b937-ef69bdfb6664 e
     https://www.pixellab.ai/create-object/a606e9d2-b3eb-4833-8fba-1297772a5802 — abrir os dois (`get_object`) ANTES da
     pergunta 3: o tamanho maior responde em parte o "difíceis de acertar". Conferir que estão de PERFIL (o PixelLab tende a
     dar vista de cima) e no estilo da frota; a escolha entre eles é dele.
2. **A rocha do elite minerador** destoa da F2 e é grande demais: diminuir, ou prendê-la a um canto ou a um pedaço
   maior de asteroide (arte nova). Fazer junto com o `asteroid` da F2/F3.
3. Anotações soltas que caíram no F: a silhueta do batedor do cinturão; os alvos da F1 ficaram menores depois da
   rodada 6 do G (a antena virou agulha) — conferir se ainda incomoda.

## As leis que pesam aqui (da memória e do HANDOFF)

- **Elite e inimigo pressionam sem punir:** a fase já tem inimigos, obstáculos e kamikazes; vão > tiro.
- **A fila de inimigos colada é DE PROPÓSITO** (a carta de reação em cadeia): "menos naves por frota" não é espaçar a
  fila sem perguntar.
- **Reclamação de movimento se resolve no corpo e no caminho**, nunca só nos números; nada de movimento fingido.
- **Peça de cenário nasce do vizinho** (a rocha: estilo e paleta do `asteroid` e do cinturão; comparar antes de mexer
  em cor); peça solta se resolve escondendo o pé (borda da tela), não com base nova.
- **Arte:** listar antes de gerar; ele fica com as peças de mão; conferir cada geração AMPLIADA antes da folha; a
  peça aprovada não se toca (teste na pendente).
- **Ele avalia mecânica por GIF em jogo** (velocidade real, painéis lado a lado) e jogando; o `?sandbox` é a
  ferramenta de calibragem.

## As perguntas a ele (uma por vez, depois de conferir o código)

1. Por onde começar: os batedores (jogabilidade) ou a rocha do minerador (arte)?
2. Os batedores: a mudança vale só para a F2 ou também para a F3?
3. O que mais incomoda hoje neles: a quantidade, o voo em senóide, ou serem difíceis de acertar?
4. A rocha: diminuir, prender a um canto, ou um asteroide maior com ela encaixada?

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos e os `q/`).
2. Ler no código: o `batedor` (o inimigo, as ondas dele na F2 e na F3 em `src/systems/StageDirector.ts`), o elite
   minerador e a rocha dele, e o `asteroid`. Atalhos de dev no menu: `V` = F2, `C` = o chefão da F2, `M` = F3.
3. Fazer a pergunta 1 e seguir uma por vez; só então a spec e o plano.

## As ferramentas e as leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, os
  `q/` e o `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs. Antes de
  commitar as folhas: `scripts/_i/_folha-emagrecer.mjs <dia> --lista <arquivo>` e `git add --pathspec-from-file`.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write; script de edição num ARQUIVO, que FALHA quando o trecho não é achado; um heredoc por comando.
- Durante uma filmagem não editar `src/` nem `.html` do projeto (o Vite recarrega).
- Testes novos terminam com `process.exitCode`; no navegador automático, um toque espera QUADROS do jogo.
- Os testes do M seguem valendo: `test-pausa`, `test-pausa-jogo` (o `igual` oscila pelo carregamento: repetir antes de
  culpar a mudança), `test-controle-jogo`, `test-derrota-jogo`, `test-carregamento`.
