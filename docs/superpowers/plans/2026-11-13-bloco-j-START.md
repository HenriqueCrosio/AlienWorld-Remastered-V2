# START — bloco J: o pós-processamento

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O bloco I FECHOU em 13/11 (as explosões, os
> clarões no lugar dos flashes de tela cheia, e a tela final = o menu do amanhecer), aprovado, commitado e empurrado. A
> sessão abre no bloco J, o pós-processamento: uma pergunta por vez (superpowers:brainstorming), antes de mexer em
> qualquer shader."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: … → H ✅ → I ✅ → **J** → F; depois o rebalanceamento e só então o som.

## ▶️ ONDE ESTAMOS (13/11, fim da sessão)

- Branch `feat/cartas-preview`, empurrada para `origin` (nunca `legacy`); a árvore igual ao remoto (fora do git só os
  vídeos `.mp4`/`.webm` e os `q/` das filmagens).
- **O que a sessão de 13/11 fechou** (o detalhe no 🧭):
  - **A etapa 2 do I — os clarões.** Os 21 `cameras.main.flash` e o clarão de tela cheia da cutscene final saíram. No
    lugar, uma forma por família: impacto e sinal = clarão LOCAL na fonte; golpe na nave = VINHETA (só dele); largada e o
    que não tem fonte = tela cheia a 28%; teto de 3 clarões por segundo. `src/systems/clarao/` (`claraoDe(scene)`).
    Spec `specs/2026-11-13-bloco-i-flashes-design.md`.
  - **A etapa 3 do I — a tela final.** A pintura dele do AMANHECER com o Leviatã caído é a tela final e o menu de quem
    zerou (para sempre). Uma cena em dois tempos (o resultado → na tecla, o menu); o placar em JANELA com a medalha em
    pixel e os pontos contando; a assinatura em Cinzel; o letreiro AVARIADO (a letra O falhando); 8 efeitos vivos sobre
    a pintura (bruma, raios de sol, fumaça, fogo, brasas, lava quase apagada, cinza, e o véu de fumaça e neblina).
    Spec `specs/2026-11-13-bloco-i-tela-final-amanhecer-design.md`.
- **Pendente dele:** nada marcado. Ele ainda não zerou a F4 de verdade com a tela nova (viu pelo atalho `[R]` do menu e
  pelas folhas). Não filmados na etapa 2, a olhar jogando: a virada da Torre da F1, a fusão da Serpente, o núcleo da
  F4, o Casco (carta), a nave rompendo a atmosfera, a bomba de pânico.
- **Ficou para a etapa 1.55 (o menu de OPÇÕES):** a escolha entre o menu da noite e o do amanhecer, que só aparece para
  quem já zerou (`zerou()` e `escolherMenu()` em `src/menu/qualMenu.ts` já existem); e a opção "reduzir clarões"
  (`CLARAO.forca` em `src/systems/clarao/claraoRegras.ts`).
- **Para o REBALANCEAMENTO (anotado antes):** as cartas fortes demais, a vida da enguia, a saída da aranha do casco.

## ▶️ O BLOCO J: o que a análise de 14/10 disse

*"O jogo já tem a Atmosfera por cena (pilar 5 do GDD). O pós-processamento deveria ser a camada final unificada sobre
ela, não um substituto. Candidatos: bloom só onde há luz (lava, núcleos, tiros), gradação de cor por fase, vinheta leve,
grão único para o jogo todo; CRT/scanlines como opção nas configurações. Os itens 5 e 13 conversam com o bloom: vale
decidir os dois juntos."* (`folhas/2026-10-14/polimento/index.html`, "Sobre o pós-processamento".)

O que já existe e pesa na decisão:

- **A Atmosfera** (`src/systems/atmosfera/`): um pipeline por cena com névoa, halo (o brilho em volta do que é quente),
  grade de cor, vinheta e grão, por perfil (`perfis.ts`). Boa parte dos "candidatos" JÁ mora nela.
- **Os clarões** (13/11): a luz aditiva local das explosões e dos sinais já faz o papel de um bloom pontual, e a
  vinheta já é usada como aviso de golpe na nave — um pós-processamento com vinheta própria não pode brigar com ela.
- **A camada HD** (o texto e os menus) fica FORA do tratamento, nítida. O pós-processamento é do mundo.
- **O item 5** da análise (as caixas pretas da F3) já foi tratado no bloco B; o 13 fechou hoje.

## As perguntas a ele (uma por vez)

1. **O que falta de verdade?** Com a Atmosfera, as explosões novas e os clarões, o que ele ainda sente que o jogo pede
   de imagem: um bloom de verdade (a luz vazando da lava, dos núcleos, dos tiros), uma unidade de cor entre as fases,
   ou nada além de uma calibragem dos perfis?
2. **O bloom:** só onde há energia (a regra do dark sci-fi: luz só onde há energia), em pixel (quantizado, como a luz
   das explosões) ou macio?
3. **O grão e a vinheta:** um só para o jogo inteiro, ou por fase como hoje?
4. **CRT/scanlines:** entra como opção (na 1.55), ou fica de fora?
5. Depois: conceitos lado a lado, em vídeo, na mesma cena com e sem (uma fase clara e uma escura).

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e conferir `git status` (limpo, fora os vídeos e os `q/`).
2. Fazer a pergunta 1 e seguir uma por vez.
3. Só então a folha de conceitos, a spec e o plano.

## As ferramentas que servem

- Filmar uma fase: `scripts/_i/_explosoes-jogo.mjs` (`--fase N --real --quadros`); uma cutscene:
  `scripts/_i/_cutscene-filmar.mjs`; hoje × conceito sem tocar em `src/` (trocando no navegador):
  `scripts/_i/_flashes-conceitos.mjs` é o modelo.
- O menu do amanhecer: `[R]` no menu ensaia o resultado sem gravar, `[T]` troca o menu, `?menu=amanhecer|noite`,
  `?vida=bruma,raios,fumaca,fogo,brasas,lava,cinza,veu` (ou `0`); filmar: `scripts/_menu/_filmar-vida.mjs`,
  `_filmar-amanhecer.mjs`; conferir os modos de reserva (`?semhd`, movimento reduzido): `_conferir-amanhecer.mjs`.
- A sonda dos perfis da Atmosfera: `scripts/probe-atmosfera-fases.mjs`.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, os
  quadros soltos (`q/`) e o `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês. Editar com Edit/Write (sed/node -e falham em silêncio
  com CRLF e `${}`; um script de edição vai num ARQUIVO e deve FALHAR quando o trecho não é achado).
- Durante uma filmagem não editar `src/` nem `.html` do projeto (o Vite recarrega).
- Testes novos terminam com `process.exitCode`. O `test-menu-letreiro-jogo.mjs` (abre o jogo no navegador, limite de
  30 s) estoura o tempo quando roda logo depois de um build ou de uma edição: rodar de novo sozinho.
- O `sharp` devolve 3 canais de um desfoque de 1 canal: `extractChannel(0)` antes de ler como máscara.
