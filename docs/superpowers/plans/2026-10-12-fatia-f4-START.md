# START — FRENTE B, fatia F4: a Larva Mecânica e o Tubo Pulsante (depois de 12/10/2026)

> ✅ **CUMPRIDO em 13/10/2026 — NÃO É MAIS A PORTA DE ENTRADA.** As folhas saíram, ele escolheu (as DUAS variações de
> cada elite), o plano foi escrito e executado (`2026-10-13-frente-b-fatia-f4.md`) e os dois estão no jogo. Os quatro
> itens do §5 ("a conferir no plano") foram medidos e respondidos lá. A porta agora é o
> `2026-10-13-fatia-f4-START.md`; este fica como registro das decisões de 12/10.

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `docs/superpowers/plans/2026-10-12-fatia-f4-START.md`.
> O desenho da F4 está fechado — faça as folhas de candidatas da Larva e do Tubo para eu escolher."*

## 1. 📍 O PONTO MARCADO

- **A F3 está fechada no que dependia de código:** só a lula, com gestos e a FUGA na 3ª saída, aprovados por ele
  (*"boa, ficou ótimo"*). Commitado e empurrado em 12/10 (`19edde6`, `75afad0`). Ele ainda **não jogou a F3 inteira**
  (a lula no ato 1; o ato 2 sem elite — ele diz se as ondas devolvidas bastam); ficou para quando quiser.
- **A F4 tem o DESENHO aprovado** (*"de acordo"*) e nada mais: nenhuma arte gerada, nenhum código, nenhum plano de
  implementação. A spec: `docs/superpowers/specs/2026-10-12-frente-b-fatia-f4-design.md`.
- A spec e este START estão commitados e empurrados (`243f931`, 12/10). Daqui em diante: commit só quando ele pedir,
  só no nome dele.

## 2. O que ele decidiu (sete perguntas, 12/10)

| # | A decisão |
|---|---|
| 1 | As cápsulas são o TIRO da Larva (ela "semeia" o corredor); sem rastro de minas |
| 2 | Ela faz ZIGUEZAGUE na metade direita, sem cruzar para o lado da nave |
| 3 | Ela SAI entrando num buraco que ela mesma abre no fundo — e CHEGA por um buraco também |
| — | Ela aparece uma vez na 1ª câmara e depois no duto; **na caixa torácica (o lugar do golfinho) não entra** |
| 4 | Dá para ATIRAR no que ela solta |
| 5 | Ideia dele: são **PUPAS** — atirou, corta o ciclo; deixou, viram **MOSCAS** que voam na nave. A pupa NÃO explode por proximidade |
| 6 | O Tubo é só o **PULSO em anel** (o atirador da fase); não solta moscas |
| 7 | O Tubo aparece na 1ª câmara (uma vez, sozinho) e no aperto da caixa torácica (t=50 a 68), chão e teto |

Os números, os estados e o roteiro estão na spec (§2 a §4).

## 3. O primeiro passo: AS FOLHAS

1. **Larva** — PixelLab Pro a partir do conceito nº 14 (`folhas/2026-10-12/elites/f4/conceito-larva.png`; a folha
   inteira dele em `folhas/2026-10-05/elites/conceitos/conceito-inimigos-biomas.png`). **COMPACTA**: cabeça + 3–4
   gomos enrolados, cauda em broca, ~40px, de PERFIL virada à esquerda. 3–4 candidatas.
2. **Tubo** — PixelLab Pro a partir do conceito nº 12 (recortar da mesma folha). ~36×28px, assentado numa superfície
   (a base reta embaixo); fechado. 3–4 candidatos.
3. **A folha EM JOGO:** as candidatas sobre a pintura da câmara A e do duto, ao lado da nave, em escala real; o Tubo
   encostado na borda de verdade (chão e teto). Triagem antes de mostrar.
4. Ele escolhe → a arte parada define tamanho e hitbox → **o plano de implementação** (skill `writing-plans`, com a
   spec) → comportamento → gestos (PixMiniMax) → GIF em jogo.

As peças pequenas (buraco, pupa, mosca, tiro do anel) são à mão, em pixel; podem entrar na mesma folha como rascunho.

## 4. O que já se sabe e poupa tempo

- **O caminho do PixelLab que rendeu** (`pixellab-ferramentas-testadas`): `/generate-image-v2` (Pro) pelo
  `scripts/_elites/_gerar-f3.mjs` — o recorte do conceito como assunto e um sprite aprovado como estilo. Sai virado
  para a DIREITA: espelhe. ⚠️ O conceito como assunto PRENDE a forma: se as candidatas saírem todas iguais (ou longas
  demais, como o conceito), peça a criatura em texto, sem a referência de assunto, só com o estilo.
- **O estilo de referência:** a lula (`public/sprites/elite-cacador.png`) é o elite aprovado mais recente.
- **Vocabulário:** o PixelLab recusa "gore/flesh/blood" — descreva a matéria (tecido, cartilagem, membrana).
- **Os gestos:** `scripts/_elites/_lula-base.mjs` (a base com folga), `scripts/_f4/_pl.mjs mini …` (PixMiniMax, 1–2
  gerações por clipe), `_instalar-lula-anims.mjs` (caixa por clipe, paleta do sprite aprovado, pontilhado),
  `_folha-clipes.mjs` e `_gif-clipes.mjs` (comparar takes). O que funcionou na lula: gesto no lugar, o quadro saindo
  do relógio do estado, e mostrar já em jogo.
- **A sonda:** vigiar o ciclo de DENTRO da página (`probe-elites-f3.mjs`), nunca com idas e voltas do Playwright.
- **O Tubo na parede:** a infra de "rolar com o chão" saiu com a serpente — `git show 8cbc679:src/entities/elites/tipos.ts`
  (`velChao`, `noChao`). A superfície: `Moldura.superficieChaoEm(x)` / `superficieTetoEm(x)`.

## 5. A conferir no plano (não decidido)

- O sandbox na F4 monta a borda? O Tubo precisa de parede.
- Os `t` exatos das 6 entradas e qual onda cada uma substitui (portas em t=72, 82, 94; golfinho t=40 a 49,5).
- A velocidade do fundo pintado da F4, para o buraco e a cicatriz acompanharem.
- O Tubo nascer numa placa sem mesa (o corredor planta mesas no chão e no teto).

## 6. Anotado — para depois

- Ele joga a F3 inteira; os anotados da lula de 07/10 seguem (a leitura no ato 1, a cor das agulhas, a tinta parada).
- Depois da F4: a frente C (a calibragem das cartas).
- Os concept PNGs soltos na raiz (`concept art Inimigos.png`, `concept art de Inimigos Sci‑Fi.png`) são dele: não
  commitar nem apagar sem ele mandar. Push só quando ele pedir; nunca para o remoto `legacy`.
