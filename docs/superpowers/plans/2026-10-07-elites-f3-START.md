# START — retomada da FRENTE B: a fatia F3 dos elites, JOGÁVEL (depois de 07/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-07-elites-f3-START.md`. A F3 está
> jogável — a lula com a tinta e o Tentáculo com a regra do casco; vou ver os GIFs, escolher a arte do Tentáculo e
> jogar a F3."*

## 1. 📍 O PONTO MARCADO — o que espera o olho dele

1. **Os GIFs em jogo** (`folhas/2026-10-07/elites/`):
   - `gif-cacador.gif` — a lula nos 3 ressurgimentos: a mira que segue, a trava piscando, as 3 agulhas na linha
     travada (a nave sai dela), e a tinta: SOPRO, SOPRO, CORTINA.
   - `gif-tentaculo.gif` — a rachadura chegando sob a nave (o chão a traz), o BOTE no ponto, o MERGULHO por trás das
     placas, a rachadura 2 longe, a torre rolando com o casco, a MEIA-LUA, os gomos absorvendo o tiro.
2. **A arte do Tentáculo** — a leva nova (nenhuma de 06/10 ficou): `folha-tentaculo-2.png` (cabeças: MOREIA 7/11/19/
   31/39/57, PINÇA 0/9/10/17/49, FLOR 0/1/23, LAMPREIA 15/28 — esta veio com chão) e `folha-tentaculo-2-inteiro.png`
   (o verme INTEIRO em coluna, 4 — para cortar os gomos do próprio corpo). O jogo usa a provisória à mão de 06/10 até
   ele escolher; depois: instalar pelo `_instalar-f3.mjs` (as mesmas chaves `eliteTentaculoCabeca`/`eliteTentaculoGomo`).
3. **Jogar:** o sandbox (`?sandbox`, fase 3, "caçador de vácuo" e/ou "tentáculo do casco" — com o tentáculo, a F3 abre
   no casco) e a F3 inteira.

## 2. O que a sessão de 07/10 decidiu (com ele)

- **Caçador = a LULA** (Pro nº 15, a 85% — 41×41; ele escolheu entre 10 da `folha-cacador-2.png` e o tamanho na
  `folha-cacador-3.png`). O ciclo de 06/10 NÃO mudou; surge e some em pontilhado (camuflagem).
- **A TINTA** (*"a tinta precisa ser algo criado mesmo, com fade, no local que ela joga"*): em TODO sumiço — o SOPRO
  (só a tampa) no 1º e 2º, a CORTINA (a nuvem grande) na saída. À MÃO, assada em quadros; a vetorial ficou de plano B
  (ele gostou das duas no teste `tinta-lula.gif`). Camada: por cima dos inimigos, por baixo de todo tiro e da nave.
- **A REGRA DO CASCO** (a pergunta dele: *"se a fase corre, o chão também corre, como ele vai surgir do casco sem ser
  arrastado?"*): o que toca o casco anda com o chão; o solto anda na tela. A rachadura 1 nasce À FRENTE da nave (o chão
  a traz); o bote sai INTEIRO do buraco; a meia-lua é uma torre que rola com o casco (*"qualquer coisa mudamos depois"*).

Spec: a emenda de 07/10 em `specs/2026-10-06-frente-b-fatia-f3-design.md` (§2.3, §3.3). Plano:
`plans/2026-10-07-frente-b-fatia-f3.md`.

## 3. O que foi feito (plano, Tasks 1–7)

1. Números (`cacador`, `tinta`, `tentaculo`) e regras puras (`cacadorAvanca`, `tintaDoSumico`, `tentaculoAvanca`,
   `rachadura1X/2X`, `tentaculoEnraizado`; `escolherPosto` com a faixa) — `test-elites-regras` TUDO OK.
2. A arte instalada (`scripts/_elites/_instalar-f3.mjs`): a lula (os grupos de pixel soltos da margem saem; o pixel
   claro que ele viu a redução a 85% já tinha levado), 6+6 quadros de camuflagem, a tinta assada (sopro 18 q 54×54,
   cortina 38 q 74×74, de `_tinta-lib.mjs`), a provisória do Tentáculo e os tiros (agulha, bolinha).
3. A infraestrutura: `intocavel` (a bomba e a queima também respeitam), `aoRabo`, `noChao` (chamado até travado pelo
   elétrico — o casco não para), `ctx.velChao`, `EnemySystem.corposElite` (absorvem o tiro, ferem a nave); nave e
   tiros em depth 1, a tinta em 0,5.
4. `Cacador.ts`; 5. `Tentaculo.ts` (a cabeça é o inimigo; 8 gomos seguem o CAMINHO dela; abaixo da crista o gomo é
   cortado com `setCrop`; no mergulho tudo vai para depth −76, atrás das placas em −75).
6. O roteiro da F3 (§4): Caçador t=11 (banner) e 27,5; Tentáculo t=63,5 (banner) e 75. Saíram os 6 drones de t=16, os
   batedores de t=64 e os kamikazes de t=67. `probe-stage3`: FASE 3 DE PONTA A PONTA.
7. `probe-elites-f3` (20/20; o tentáculo no relógio manual) e os GIFs (`_gif.mjs cacador|tentaculo`).

## 4. Anotado — para depois

- **A leitura no ato 1:** a lula é escura e os véus da nebulosa passam na frente dela (todo inimigo do ato 1 é assim, é
  o tema "visibilidade curta"); se ele achar que some demais, um aro/brilho no olho resolve antes de mexer nos véus.
- **As agulhas:** a arte de 06/10 (5×1) foi feita para o caçador de lâminas; no GIF (paleta de 96 cores) ela aparece
  meio ciano — conferir em jogo.
- **A tinta fica parada na tela** (no ato 1 não há chão; o fundo quase não corre). Se ele quiser, ela pode derivar com
  o mundo.
- Os da frente C (rebalanceamento) e as sondas que já falhavam (`probe-stage2`, `probe-chain`) seguem do START de 06/10.

## 5. Como testar

- `npm run dev` → `http://localhost:5173/?sandbox` (fase 3) e `/` para a campanha.
- `node scripts/test-elites-regras.mjs` · `node scripts/probe-elites.mjs` (F2, TUDO OK) ·
  `node scripts/probe-elites-f3.mjs [cacador|tentaculo]` (20/20) · `node scripts/probe-stage3.mjs`.
- GIF: `node scripts/_elites/_gif.mjs <out.gif> cacador|tentaculo [seg] [zoom]`, depois recodificar lendo com
  `fs.readFileSync` com `interFrameMaxError: 24, colours: 96` (~3,5 MB). Quadros para revisar: `_quadros-gif2.mjs`.
- A tinta: `node scripts/_elites/_tinta-f3.mjs` (o teste com os 4 painéis) e `_instalar-f3.mjs` (reassa os quadros
  depois de mexer em `ELITES.tinta`).

## 6. Lições desta sessão

- **PixelLab Pro sem referência de assunto** quando o conceito prende a forma (as lâminas saíam sempre iguais): saiu
  variedade (lula, louva-a-deus). A arraia saiu vista de CIMA; a vespa, dois bichos por quadro. As cabeças moreia/
  pinça/flor saíram viradas à DIREITA (espelhar); a lampreia e o verme inteiro, à esquerda.
- **Sonda de estado curto** (o bote de 0,7s) não roda no relógio real com o software renderer: use o relógio manual
  (`loop.sleep()` + `step`), como o GIF.
- **O "arrastado"** é uma parte presa à tela e outra ao chão ao mesmo tempo — a regra resolve, e o hook `noChao` roda
  até com o elite travado.
