# START — o SOM: REGULAR os chefões, depois a folha 5c (o Guardião e o Predador)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. Em 15–16/11 o SOM entrou antes do F (a trilha é
> dele, os efeitos são meus): as folhas 1 (a nave), 2 (as explosões), 3 (os inimigos e perigos), 4 (os elites), 5a (a
> Torre e a Capitânia) e 5b (a Serpente e a enguia) estão no jogo, commitadas e empurradas. A sessão abre PELO PEDIDO
> DELE: antes da folha nova, REGULAR os sons dos chefões — alguns estão tão abafados que quase não se ouvem (medir cada um
> no jogo antes de mexer). Depois, a 5c."**
> A spec é `specs/2026-11-15-bloco-som-design.md` — a §10 vale sobre o resto, e a **§10.7** tem as regras de 16/11.
> O registro inteiro de 16/11, na ordem em que aconteceu: `plans/2026-11-16-som-folha3-START.md`.

## ⚠️ 1. O LEMBRETE DELE — ANTES DA FOLHA NOVA, REGULAR OS SONS DOS CHEFÕES

Ele, no fim de 16/11: *"na próxima sessão, antes da nova folha, quero regular melhor alguns sons dos bosses. Alguns estão
muito abafados, tão abafados que quase não se ouve... pode ser o volume da geração do áudio ou algum outro problema, mas
vemos na nova sessão."*

**Não chutar: medir primeiro.** Os suspeitos, do mais provável ao menos:

1. **Os LAÇOS saem no nível de MOTOR.** O `_folha-montar` trata todo take com `laco: true` como `camada: 'motor'`
   (loudnorm a −24 LUFS, picos de −8 a −14 dB) a menos que o take diga `camada` — e eles entram no catálogo na camada
   `acao` com volume 0,35–0,6. Ficam baixos de nascença: `serpente.gas.sopro`, `enguia.sobCasco`, `enguia.raspa`/`2`,
   `chefe.torre.motor`, `drone.minerar`, `sentinela.rolar`, `mosca.zumbido`. (A TERMINUS rotativa resolveu isso com
   `camada: 'acao'` no take: normaliza pelo pico.)
2. **O filtro do vácuo EMPILHADO.** Na cabine (F2, F3) todo som `prioridade: 'chefe'` passa por `CHEFE_NO_VACUO`
   (passa-baixa 2,2 kHz, ×0,7, sala 8 %) — e alguns já têm passa-baixa próprio (a sobrecarga da sentinela é elite, não
   entra; mas o trava do raio 5 kHz, o gêiser 5 kHz, o desfaz 5 kHz, a convergência 5 kHz, o pavio do flak 5 kHz entram).
   Um som que já era escuro e baixo, a 2,2 kHz e 70 %, some sob a música.
3. **Os volumes de partida do catálogo** (`doChefe`, `S5B`: 0,35–0,6) × a variação × a presença da música.
4. **A geração em si** (um take PixelLab de pouca energia: a medida LUFS de cada um está nas folhas).

**O método:** um script (Playwright, o molde de `test-som-chefes-jogo.mjs`) que, em cada fase, toca cada som de chefão
SOZINHO e mede o pico e a energia (`Som.picoDaAcao`, e um LUFS curto) — uma TABELA por som × lugar, os mais baixos no
topo, comparados a uma referência que ele já aprovou (o `explosao.metalGrande`, o `nave.xaelo.tiro`). Mostrar a tabela;
corrigir pela causa (o nível do take ao instalar, o filtro, o volume do catálogo); ele confere JOGANDO (tecla 5 = vai ao
chefão; dar Ctrl+Shift+R antes). Os chefões: a Torre (F1, atmosfera — fora do filtro do vácuo), a Capitânia (F2), a
Serpente e a enguia (F3).

## 2. A FOLHA 5c — o núcleo da F4 (o Guardião e o Predador)

A lista já combinada com ele (16/11), a conferir no código antes de gerar:
- **O Guardião** (`src/entities/BossNucleo.ts`, `forma: 'guardiao'`; `acao`: `flutua` / `telegrafo` / `investe` /
  `volta` / `serra`): os glóbulos (`leque`, `gLobulo`), o telegrafar e a investida, e a SERRA (`SerraGuardiao.ts`): o
  lançar com o cabo, o giro (laço), a cravada na borda com os trancos (2× em cima, 1× embaixo).
- **A troca** (`trocarParaPredador`): a casca estourando e o Predador saindo.
- **O Predador** (`src/entities/Predador.ts`): o urro (`surgir`), a carga do peito (`carregar`) e o bote com o golpe
  (`bote`, `golpear`), a lava (`telegrafarLava`, `arremessar`, `lancarLava` — bola/gota/metal —, `estilhacar`), o galope e
  a garra no teto (`irPara`, `pousar`, `sair`, `reentrar`), o rasgo do chão com o metal incandescente (`rasgar`,
  `lancarMetal`) e o BREU da fase 3.
- A F4 é o `interior` (não a cabine): o filtro do vácuo NÃO se aplica; ver se a dor e a morte (a folha 2) já cobrem.

## As leis do som (as de sempre + as de 16/11)

- Nada isolado; o que repete é macio (medir o agudo > 5 kHz contra o corpo antes de mostrar); um som por SALVA; o aviso
  tem a duração do piscar do jogo; pressionar sem punir; nenhum som atravessa a troca de cena (só `ponte`).
- Recusado DUAS vezes sem nota: perguntar a DIREÇÃO. Com nota, gerar na direção dele.
- Licença: só CC0, PixelLab (a conta dele), próprio (sintetizado ou FEITO POR ELE — perguntar a origem de arquivo dele).
  Referência de terceiros só se MEDE.
- Os chefões no vácuo: contidos (`CHEFE_NO_VACUO`); um som gravado "de céu aberto" que precisa soar no espaço ganha
  versão própria tratada.
- A folha: 2–3 versões por som (PixelLab A/B + C sintetizado nos avisos de tempo exato), ×8 no que repete; ele cola as
  escolhas; instalar com `_som-instalar`, o catálogo à mão, os ganchos no código, um TESTE em jogo que prova o momento.
- Antes de commitar: enxugar as folhas de rodada (só o que o `dados.json` mostra; o `_folha-montar` copia todas).

## As ferramentas (scripts/_som/)

`_folha-montar.mjs <grupo> <pasta>` · `_folha-dados.mjs` (`--folha`, `--rodada`) · `_folha-sons.mjs` ·
`_folha-conferir.mjs` · `_som-instalar.mjs <grupo> <pasta>` (versões `BF1`/`D2`; créditos `dele`, `mistura`) ·
`_som-tratar.mjs` · `_original.mjs` (o FLAC) · os sintetizadores (`_sintetizar-folha3/4/5`, `-ricochete`, `-zing`,
`-tup`, `-estalo`, `-minigun`, `_compor-terminus`). Os grupos de 16/11: `inimigos`, `dele`, `elites`,
`chefes-maquinas`, `chefes-serpente`, `momentos` (+ `ricochetes`, só registro — reprovado).
Os testes do som: `test-som`, `test-som-tratar`, `test-som-jogo`, `test-som-nave-jogo`, `test-som-inimigos-jogo`,
`test-som-elites-jogo`, `test-som-chefes-jogo` (+ os oráculos `test-serpente-hab`, `test-enguia-porte`, `test-enguia`,
`test-serpente` quando mexer na Serpente/enguia) e o build.
O PixelLab: ~3.440 gerações em 16/11 à noite (conferir com `get_balance`), renova em 04/12. Limite de 10 jobs juntos.

## Guardado para depois

- **Os FLYBYS dele** (`assets/raw/sons/dele/flybys/`: `flyby_jet_far`, `flyby_spaceship_falconstyle`,
  `flyby_spaceship_variation`) — *"para encher com mais imersão"*: folha 7 (cutscenes) / 8 (ambiente); perguntar onde
  cada um passa.
- **O passe de mixagem** (§10.6 da spec): ele decidiu "depois da folha 3" — ainda não feito.
- O canos da enguia só avisa na 1ª salva (`hab` → `canos`); as outras salvas (1,1 s e 0,7 s de aviso) não têm o som da
  carga — o worker teria que mandar os avisos.

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status`.
2. Lembrar a ele de dar **Ctrl+Shift+R** na aba do jogo.
3. O item 1 (a regulagem): medir → a tabela → corrigir pela causa → ele joga.
4. Só então a 5c: conferir no código, listar, gerar, medir, a folha, as escolhas, os ganchos, o teste.

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, `q/`, `cru/`
  fora. A ordem: o jogo (`feat`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write; um heredoc por comando (comando longo com aspas: escrever o script num arquivo); PowerShell sem
  `-Encoding utf8` corrompe acentos.
