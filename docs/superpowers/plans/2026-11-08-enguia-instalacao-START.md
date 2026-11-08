# START — a enguia colossal (S2): o PASSO 4, a instalação no jogo

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A Parte B passos 1–3 (os anéis, a girada, as 6
> animações da cabeça, os respiros e os 5 efeitos do pixelfx) estão APROVADOS e commitados, tudo na MAQUETE. A sessão
> abre no passo 4: escrever o PLANO NOVO da instalação da enguia no jogo (superpowers:writing-plans) e mostrar a ele
> antes de mexer no `src/`."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**
> O plano mãe é `plans/2026-11-07-serpente-grande-enguia.md` (a seção "PARTE B"); a spec,
> `specs/2026-11-03-serpente-grande-enguia-design.md` (§7.4 é a instalação). O registro das etapas anteriores:
> `plans/2026-11-07-enguia-geracoes-START.md` (1–2), `plans/2026-11-07-enguia-animacoes-START.md` (3) e
> `plans/2026-11-07-enguia-parte-b-START.md` (a Parte B, passo 3).

## ▶️ ONDE ESTAMOS (fim de 08/11)

**Tudo aprovado, commitado e empurrado. Tudo vive na MAQUETE (`scripts/_serpente/`, fora do jogo); o jogo ainda tem
a fusão antiga** (`BossSerpente.ts`, a forma `fusao`, `serpenteFusao.ts`).

| O que | A folha (o registro de cada rodada) |
|---|---|
| a maquete do movimento (a luta inteira, os tempos, as sondas) | `folhas/2026-11-07/enguia-maquete/maquete.html` |
| os anéis = a pele contínua, o rolar à vista, as mordidas, o rombo, os gêiseres, a morte com gore | `folhas/2026-11-07/enguia-aneis/aneis.html` |
| a girada = o dorso desenhado, a cabeça em 19 vistas, a fumaça do rombo no Eco | `folhas/2026-11-07/enguia-girada/girada.html` |
| as 6 animações da cabeça + o `selaJunta` | `folhas/2026-11-07/enguia-gestos/gestos.html` |
| **08/11: os respiros (jato), a fumaça da girada do início, os 5 efeitos do pixelfx** | `folhas/2026-11-08/enguia-respiros/respiros.html` |

### O que o passo 3 (08/11) acrescentou

- **Os respiros com jato** (`scripts/_serpente/enguia/respiros.mjs`, `class Respiros`): fluxo de pixels riscando, na
  cor da luz de cada anel (verde nos 4 primeiros, ciano nos 5 últimos, laranja no meio), o gás herdando a velocidade
  do bocal e nascendo na BORDA do corpo. Disparam nas curvas (lado de fora, no máximo 3), nas arrancadas/freadas, no
  rolar, nos estalos da cabeça e numa onda de repouso a cada 2,4 s. Eles também ESCONDEM os pontos fracos medidos por
  `_enguia-respiros-medir.mjs` (`medidas.json` da folha): o estalo da cabeça, o laço da volta, a coluna do posto. Ele:
  *"ficou muito bom"*.
- **A fumaça na girada do início** (a seção 3½ do `passo`, só na `chegada`, com o seu próprio dado `rndG`): esconde a
  esticada do desenho ao girar. Ele: *"Perfeito"*.
- **Os 5 efeitos do pixelfx** (ele: *"Perfeito, todos ficaram ótimos"*), em `scripts/_serpente/enguia/efeitos.mjs`
  sobre o motor COPIADO em `scripts/_serpente/enguia/pixelfx/` (MIT, com `LICENSE`, `NOTICE.md`, `ORIGEM.txt`):

  | Efeito | De | Função | Onde no desenho |
  |---|---|---|---|
  | o fogo dos canos (reto, sem ceder, sem gotas, sem tosse) | `flamethrower` | `fogoCanos` | `desenho.mjs` §3, atrás do corpo |
  | as sementes do Eco (núcleo + 4 filamentos, ciano) | `plasma-ball` | `semente` | `desenho.mjs`, no laço das sementes |
  | a implosão da fusão (as luzes chegam aos 0,8 s, estala em 1,02 s) | `implosion` | `implosaoFx` | maquete, início da fusão |
  | o vapor dos gêiseres (rampa escura de gás gasto) | `poison-cloud` | `vaporFx` | maquete, `v.para` do gêiser |
  | o estouro da cabeça (só o corpo da bola de fogo) | `big-explosion` | `bolaDeFogo` | `desenho.mjs` §7½ |

  A composição: uma `Camada` (quadro do pixelfx = cor + luz aditiva) composta sobre o quadro do jogo. O gêiser
  aprovado e o resto da morte (o crânio em pedaços, os anéis de choque, o gore) NÃO mudaram.
- A chave de comparação: `respiros=0` e `pixelfx=0` na maquete voltam à versão anterior; `md5=1` grava a impressão de
  cada quadro cru (`<nome>-md5.txt`), a prova de que o resto da luta ficou idêntico.

## O PASSO 4 — o que a próxima sessão faz

**1. Escrever o plano** (superpowers:writing-plans), `plans/2026-11-0X-enguia-instalacao.md`, a partir da maquete, que
é o ORÁCULO do porte. Mostrar a ele antes de tocar no `src/` (a lei: plano antes do `src/`).

**2. O inventário do porte** (o plano tem de cobrir tudo isto):

| Da maquete (`scripts/_serpente/enguia/`) | Para o jogo (proposta do plano mãe) |
|---|---|
| `numeros.mjs` (47 linhas) | `src/entities/serpente/numerosEnguia.ts` |
| `caminho.mjs`, `roteiro.mjs`, `corpo.mjs` (o caminho, o roteiro, a pose, as mordidas) | `enguia.ts` |
| `canos.mjs`, `eco.mjs`, `geiseres.mjs`, `perigos.mjs` | `canos.ts`, `eco.ts`, `geiseres.ts` (+ os perigos na colisão) |
| `gestos.mjs` (puro: o tempo de cada gesto) | porta direto; os quadros viram folhas de sprite |
| `respiros.mjs` (301 linhas, puro salvo o `pose`) | `respiros.ts`, pintando na camada de pixels |
| `efeitos.mjs` + `pixelfx/` | `efeitos.ts` + o pixelfx MOVIDO para o `src/` (com a licença) |
| `desenho.mjs` (608 linhas: a pele no cilindro, o dorso, as normais, as vistas, o `selaJunta`, a ordem das camadas) | a parte de desenho de `enguia.ts` (o maior risco) |
| `arte.mjs` (lê PNGs por `sharp` em Node) | ASSAR antes: faixa, dorso, normais, as 19 vistas, os gestos → `public/sprites/` |

O que a etapa 3 e o passo 3 obrigam a levar junto: **o `selaJunta`** (os vãos na junta, pedido dele), **as vistas do
rolar por quadro** (os quadros do fechar do Eco têm as próprias), **os quadros já recolados pela nuca** (as pastas de
`folhas/2026-11-07/enguia-gestos/`, nunca os `original/`), **a fumaça da girada só na chegada** e **o `luzCorpo`** (o
ganho de luz que preserva o tom, teto 235).

**3. As decisões que o plano tem de tomar (e trazer para ele quando forem de gosto):**
- **O pixelfx em TypeScript:** o `tsconfig` não tem `allowJs`, então importar os `.js` copiados quebra o
  `npx tsc --noEmit` (TS7016). Opções: `.d.ts` mínimos ao lado, `allowJs` só para a pasta, ou portar os 6 arquivos
  usados para `.ts`. Recomendação a medir: `.d.ts` (o código de fora fica intacto, a licença também).
- **A camada de pixels:** o jogo já tem `CamadaPixels` (`src/entities/serpente/camadaPixels.ts`, a `Lona` da S1b, duas
  telas 384×216 acima e abaixo da nave, com a máscara do corpo). Os respiros, o fogo, as sementes e o vapor pintam
  nela; ver se a cor + luz aditiva do pixelfx cabem na `Lona` ou pedem uma segunda.
- **O corpo:** a maquete pinta a enguia inteira por pixel a cada quadro (a pele no cilindro). No jogo isso é uma
  textura de tela atualizada por quadro ou fatias de sprite; medir o custo antes de escolher.
- **O desempenho:** p95 ≤ 4 ms (spec §8). O pixelfx simula a 120 Hz: medir o fogo dos canos (o mais caro) e o
  estouro no navegador.
- **Os dados da maquete:** a maquete tem `LCG` com sementes fixas para provar quadro a quadro; o jogo pode sortear
  livre, mas o porte deve ser conferido com as mesmas sementes contra o oráculo.

**4. As provas que o plano prevê:** o porte conferido contra os módulos puros da maquete (mesmas entradas → mesmas
saídas); as sondas `scripts/_serpente/_sonda-hab.mjs`/`_sonda-luta.mjs` com a enguia; `npx tsc --noEmit`,
`node scripts/test-serpente.mjs`, `node scripts/test-serpente-hab.mjs`, `node scripts/test-enguia.mjs`,
`node scripts/test-morte.mjs` (lê o `serpenteFusao.ts`); o desempenho; e a entrega por vídeo/GIF em jogo, na velocidade
real, lado a lado com a maquete ([[avaliar-skill-por-gif]]). O atalho de dev `?serpente=fusao` abre direto nela
(`src/entities/serpente/atalho.ts`).

**Depois, o passo 5:** ele joga e calibra a vida (o alvo: 2–3 voltas, ~60–80 s). ⚠️ A vida dobrada das formas foi
calibrada com o bug dos tiros de 03/11 (`b38f2c7`): rever jogando.

## As ferramentas
- **A maquete:** `node scripts/_serpente/_enguia-maquete.mjs desvia <dir> corpo=pele fotos=1`. As chaves:
  `gestos=0`, `respiros=0`, `pixelfx=0`, `girada=0` (comparar com o antes), `md5=1` (a impressão dos quadros crus),
  `vaos=1` (os vãos na junta), `em=<t>,<t>…` (fotos em instantes, precisa de `fotos=1`), `de=`/`ate=`, `luz=0`,
  `chegada`, `rolagem`, `arena`, `parado`; `ENGUIA_DORSO=0`/`ENGUIA_VISTAS=0`.
  ⚠️ Uma rodada só de fotos sobrescreve o vídeo da mesma pasta: use outra pasta.
- **Os vídeos:** `_enguia-segue-cabeca.mjs` (a câmera segue a cabeça); ffmpeg para recortar trechos lado a lado.
- **Os gestos:** `_enguia-gestos-medir.mjs`, `_enguia-gesto-medir-clipe.mjs`, `_enguia-gesto-junta.mjs`,
  `_enguia-gesto-limpa.mjs`, `_enguia-gesto-vaos.mjs`. Os pontos fracos: `_enguia-respiros-medir.mjs`.
- **O pixelfx original** (só leitura): `Projetos folder/_referencias/pixelfx` (0.3.0, `a841596`). Rodar qualquer coisa
  de lá ou trazer efeito NOVO pede o ok dele ([[pixelfx-referencia-efeitos]]); os 5 já copiados estão liberados.
- **Os testes:** `node scripts/test-enguia.mjs` (tudo ok em 08/11).

## As leis que seguem valendo
- **Plano antes do `src/`.** Durante filmagem/gravação, não editar `src/` nem `.html` (o Vite recarrega).
- **Commit e push só quando ele pedir,** só no nome dele (sem Co-Authored-By), nunca para `legacy`. Vídeos, GIFs e
  `cru/` ficam fora.
- **A conversa com ele em português;** código, comentários e prompts em inglês.
- **No vácuo nada cai nem cede ao peso** ([[fisica-do-lugar-nos-ataques]]); efeito assado em pixel na resolução nativa.
- **A peça aprovada não se mexe:** defeito apontado se corrige só ali, provando que o resto ficou igual (o `md5=1`).
  Ao trocar partículas por um efeito novo, manter os sorteios do dado comum (no-op), senão o resto muda.
- **Edição por script corrompe** (CRLF; PowerShell sem `-Encoding utf8` estraga os acentos): editar com Edit.
- **O servidor** fica em `:5173` (`npm run dev`). As folhas abrem por ele.
