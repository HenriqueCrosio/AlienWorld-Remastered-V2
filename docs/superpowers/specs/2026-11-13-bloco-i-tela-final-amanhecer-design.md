# Bloco I, etapa 3 — a tela final: o amanhecer sobre o Leviatã caído (item 11) · design

> 13/11 · aprovado em conversa, pergunta por pergunta (*"Boa, pode escrever a spec e implementar"*).
> Antes: a análise de 14/10 (item 11, *"a tela final não pesa o fim da campanha"*), a técnica do cenário vivo
> (`docs/CENARIO-VIVO.md`), o menu refeito (`specs/2026-10-19-menu-refeito-design.md`).

## 0. O problema e a ideia dele

Depois da cutscene final o jogador cai na `GameOverScene` em modo vitória: texto pequeno sobre preto, "FASE 4 COMPLETA",
igual ao que ele vê ao morrer. A ideia dele: uma pintura nova — o AMANHECER sobre a colônia, com o Leviatã caído no
vale (`assets/raw/Fortaleza em ruínas sob tempestade.png`, 1768×890, a mesma composição da pintura do menu) — tratada
com a técnica do cenário vivo, serve à tela final E vira o menu inicial de quem zerou.

## 1. As decisões dele (13/11)

| # | Decisão | As palavras dele |
|---|---|---|
| 1 | **Uma tela só que faz tudo** (o fim da campanha, o crédito e o resultado), não créditos rolando. | *"Eu vou com a terceira também"* |
| 2 | **É a mesma colônia.** O menu e o amanhecer são a vista REALISTA dela; as cutscenes a mostram em pixel. A pintura entra como está; a cutscene não muda. | *"é a mesma colonia, mas com uma arte diferente, mais realista para impactar"* |
| 3 | **A troca do menu fica para sempre** depois de zerar. A escolha entre os dois menus entra no menu de OPÇÕES (etapa 1.55) e **só existe depois da primeira vitória, nunca antes**. | *"a troca fica para sempre, mas pode ter a opção de escolha de menus no menu opção"* · *"só vai ficar disponivel trocar quando o jogador zera a primeira vez, nunca antes"* |
| 4 | **Uma cena só, em dois tempos:** o resultado sobre o amanhecer; na tecla, o resultado sai e o menu entra, sem corte. "Jogar de novo" é o COMEÇAR do menu. | *"Sim, a cena única em dois tempos"* · *"ele poderá fazer a run de novo buscando melhores pontos, então isso fica como o Jogar que já existe"* |
| 5 | **O que vive:** fumaça, fogo, brasas, a lava da carcaça quase apagada, os raios de sol, a bruma, a cinza. Saem o Leviatã ao fundo, o tráfego, os holofotes, os faróis, a cachoeira e a tempestade. | *"A lista serve, pode seguir"* |
| 6 | **O conteúdo do resultado:** o título "O LEVIATÃ CAIU", os pontos, a medalha, o recorde (e o "novo recorde"), uma linha de crédito, a tecla. Sem dados da run (vão para o placar online) e sem mais créditos. | *"O conteúdo serve"* |
| 7 | **O letreiro:** o mesmo, com a mesma chegada, mas AVARIADO — uma letra apagando como letreiro de motel de filme americano. Só no amanhecer. | *"o mesmo letreiro com a mesma chegada, mas avariado"* |

A derrota ("NAVE PERDIDA") e as vitórias de fase ficam na `GameOverScene`, sem mudança.

## 2. O que o jogo guarda (`localStorage`)

- `alienworld:zerou` = `'1'`, gravada na primeira vitória da campanha (nunca no treino).
- `alienworld:menu` = `'noite'` | `'amanhecer'`: a preferência. Sem ela, o menu é o do amanhecer se `zerou`, senão o
  da noite. `escolherMenu` só grava se `zerou` (a opção da 1.55 chama esta função e só aparece se `zerou()`).
- O resultado é SEMPRE sobre o amanhecer, mesmo se a preferência for a noite (é "o Leviatã caiu").

## 3. A pintura e o cenário

- Assada como a do menu (`scripts/_menu/_camadas-amanhecer.mjs`): o MESMO corte (186 px saem da esquerda, 1582×890),
  nas densidades k4 (1536×864, a camada HD) e k1 (384×216). Uma camada só (`pintura.png`): nada passa por trás dela.
  Em `public/sprites/menu-amanhecer/k{4,1}/`.
- `CenarioAmanhecer` (`src/menu/amanhecer/`), com a mesma interface do `Cenario` da noite (`criar`, `atualizar(t)`), o
  véu da abertura e as peças vivas (a parte B). A `MenuCenaHD` (e o `MenuScene` sem a camada) monta um ou outro.
- A Atmosfera com o perfil `menuAmanhecer`, tirado da pintura (névoa cinza quente, halo do fogo, a cinza caindo).
- A lava da pintura não é repintada: a "brasa que respira" é uma peça por cima (parte B).

## 4. A cena em dois tempos (`MenuScene`)

- A `Interlude4Scene.terminar` abre `Menu` com `{ resultado: { score, handling } }` (no treino segue para a `GameOver`,
  como hoje). O recorde e a medalha saem de um módulo puro (`src/placar.ts`), que a `GameOverScene` também usa.
- **1º tempo — o resultado.** O véu abre no amanhecer; o relógio da abertura fica parado (o letreiro ainda acima da
  tela). Entram, nesta ordem: o título (1,6 s), os pontos com a medalha (2,6 s), o recorde (3,1 s), o crédito (3,9 s) e
  a tecla (4,7 s). A tecla só vale depois de tudo entrar (`RESULTADO.pronto`). No movimento reduzido tudo já abre posto.
- **2º tempo — o menu.** Na tecla, o resultado some em 0,6 s e o relógio da abertura parte do instante em que o
  letreiro entra (pula os segundos de cenário sozinho, já vistos): o letreiro chega freando, a lista desce, o neon
  acende. Daí em diante é o menu de sempre.
- O layout do resultado (px de jogo, a conferir na maquete): o título no céu escuro de cima à esquerda; os pontos, a
  medalha e o recorde abaixo dele; o crédito e a tecla no primeiro plano escuro de baixo. Nada sobre a carcaça.
- As vozes: o título e os rótulos na voz do JOGO (Silkscreen); os números na da NAVE (Chivo Mono); o crédito na do
  PILOTO (Chakra Petch).

## 5. O letreiro avariado

Uma função pura do relógio (`letraFalha(i, t)` em `abertura.ts`, números em `AVARIA`): UMA letra do título, depois de o
neon acender inteiro, falha em rajadas — algumas piscadas curtas a cada 6–10 s e, de vez em quando, um apagão de 1–2 s
que volta com um zumbido (duas piscadas). Nunca durante a chegada. Só no menu do amanhecer; o da noite passa
`avariado = false` e é idêntico ao de hoje. Qual letra e o ritmo: ele escolhe por vídeo.

## 6. As duas partes

- **A — o esqueleto jogável** (plano `plans/2026-11-13-tela-final-parte-a.md`): a pintura parada assada e tratada, as
  marcas gravadas, a cena em dois tempos, o letreiro avariado, os atalhos de dev (`[R]` abre o resultado, `[T]` troca
  o menu; `?menu=amanhecer|noite` na URL). No fim dá para zerar e ver o caminho inteiro.
- **B — a vida:** os sete efeitos, um por rodada, cada um numa maquete filmada no jogo. Plano próprio depois da A.

## 7. Os testes e a prova

- `scripts/test-menu-amanhecer.mjs` (puro): as marcas (antes de zerar o menu é a noite e a escolha não grava; depois,
  o amanhecer e a escolha grava); o placar (as faixas de medalha, o recorde, o treino não grava); a avaria (só a letra
  escolhida, nunca antes de o neon acender, a mesma a cada vez, apagada numa fração pequena do tempo); a ordem de
  entrada do resultado e a tecla só depois de tudo.
- Os testes do menu de hoje seguem passando (a noite não muda).
- A prova: uma folha com vídeo do caminho inteiro (o fim da cutscene → o resultado → a tecla → o menu) e do letreiro
  avariado, filmados no jogo num relógio a passos.

## 8. Fora do alcance

A opção no menu de OPÇÕES (1.55); o placar online e os dados da run; a derrota e as vitórias de fase; o som.
