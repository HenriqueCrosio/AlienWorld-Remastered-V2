# START — FATIA 8 · A CUTSCENE FINAL: ONDE A PRÓXIMA SESSÃO PEGA

> ⚠️ **SUPERADO EM 25/09.** Este START abriu a fatia (brainstorming → spec → plano) e foi executado. A retomada é
> **`docs/superpowers/plans/2026-09-25-fatia8-retomada-START.md`**. O que está abaixo fica como registro.

**⬜ A FATIA 8 NÃO COMEÇOU.** Sem spec, sem plano, sem branch. É a **última fatia do passe visual**:
depois dela vêm a calibragem, o balanceamento, o playtest de todas as fases, o placar e o deploy
(o roadmap inteiro está no 🧭 do topo do `docs/HANDOFF.md`).

**Estado do repositório (23/09):** `main` = `origin/main` (V2), com a Fatia 7 mergeada `--no-ff` em
`5be4b2a`. Nenhuma branch aberta. O remoto é o **V2**; NUNCA o `legacy`. Commits de autoria SÓ dele.

---

## 🔑 A FRASE DE ARRANQUE

> **"Leia `docs/superpowers/plans/2026-09-23-fatia8-cutscene-final-START.md`. A Fatia 7 fechou e
> está na `main`. Vamos abrir a Fatia 8 — a cutscene final — pelo brainstorming."**

⚠️ **A PRÓXIMA SESSÃO NÃO ABRE ESCREVENDO CÓDIGO NEM GERANDO ARTE.** O fluxo de toda fatia é
**brainstorming → spec → plano → implementação → teste jogado → merge `--no-ff`**. O 1º passo
concreto: criar a branch `feat/cutscene-final-visual` a partir da `main`, subir o localhost, e ele
**assistir a cena como ela está hoje** (`[F]` no menu) antes de qualquer proposta — o veredito de
julho é de antes de SETE fatias mudarem o jogo em volta dela.

---

## 🎬 O QUE A CENA É HOJE

`src/scenes/Interlude4Scene.ts` (869 linhas) · **"O AFASTAMENTO"** · ~42s · `[F]` no menu ·
sonda `node scripts/probe-interlude4.mjs` (20 asserts, um screenshot por beat). A `probe-stage4`
atravessa a cena depois de matar o chefão final, até o `GameOver`.

**As decisões FECHADAS com ele em 20/07** (não reabrir sem ele pedir):
- **Vitória AMARGA.** A colônia na lua de Kepler já estava morta antes da decolagem: a campanha foi
  vingança, não resgate. Os fragmentos do bicho caem como meteoros sobre a colônia morta, e **a
  música CALA na chuva**.
- **Sem painel e sem tecla de pular.** Não há próxima fase para armar; e o jogador chega martelando
  o ESPAÇO — uma tecla de pular comeria a cena no 1º quadro.
- **A câmera recua pela 1ª vez.** A campanha foi uma APROXIMAÇÃO contada por escala (a lua encolhe,
  o Leviatã cresce); aqui o número roda ao contrário. O beat 1 é o único voo para a ESQUERDA do jogo.
- **Crédito mínimo:** o `GameOver` ganha `UM JOGO DE HENRIQUE CROSIO` só com `victory && stage === 4`.

**Os 6 beats** (ms): DE DENTRO (fuga para a esquerda, o hangar desabando) → **RUPTURA** 8200 →
**AFASTAMENTO** (o Leviatã morrendo, grande) → **PARTIÇÃO** 16200 (as duas metades) → **RETORNO**
19400 (a lua cresce, banner `KEPLER · A COLÔNIA MORTA`) → **CHUVA** 23400 → **BEAT 6** 35800 (a
nave que ELE escolheu, pequena, contra a lua) → fadeOut 41800 → `GameOver`.

**O veredito dele (julho):** *"interessante no conceito, fraca no visual e design"*. Virou uma leva
de explosões por sheet em 20/07 — mas **a cena nunca passou por uma fatia do passe visual**. Ela é a
única peça do jogo ainda na arte de julho.

---

## ⚠️ O QUE JÁ SE SABE, E QUE O BRAINSTORMING PRECISA TER NA MESA

**1 · AS BALEIAS ERRADAS SÃO DESTA CENA, E SÓ DELA.** `leviathanWhale`, `leviathanWhaleDying`,
`leviathanWhaleDyingSheet` e `leviathanWhaleSplit` (`BootScene`, `public/sprites/leviathan-whale*`)
só são usados na `Interlude4Scene` — conferido no código em 25/08 e de novo em 23/09. A F3 e a F4
NÃO têm baleia errada (o registro antigo que dizia "F3/F4" foi corrigido no HANDOFF).

**2 · QUAL LEVIATÃ ENTRA — a regra dos dois, escolha narrativa dele:**
- **Armored** (PixelLab `e9f7e0dc`) = o VIVO e FORTE, o do auge;
- **Biomecânico sem armadura** (PixelLab `f397793a`, lava nas rachaduras das costelas) = o
  **ENFRAQUECIDO — o da cena final.** Arco: blindado e imponente no começo → exposto no fim.
- ⚠️ Já existem no disco, **SEM uso** (conferido em 23/09 — nenhuma é carregada pelo `BootScene`):
  `leviathan-dying.png`, `leviathan-split.png` e `leviathan-dying-sheet.png` (9f, 116²). **Conferir
  com ele se são o biomecânico certo antes de gerar qualquer coisa** — pode ser que metade da troca
  já esteja pronta. ⚠️ Armadilha de nome: a ANIMAÇÃO `leviathan-dying` que a cena toca é montada no
  `Fx.ts` a partir da sheet da BALEIA (`leviathanWhaleDyingSheet`), não do PNG de nome igual.
- O menu usa `leviathan-alive-sheet.png` (9f, 116²); o parallax tem `leviathan.png` e
  `leviathan-swim-sheet.png`.

**3 · A CENA FICOU DESATUALIZADA EM RELAÇÃO À FASE 4, que mudou inteira na Fatia 7:**
- o comentário e o roteiro falam em *"matar o coração"* — **o coração saiu em 16/09**; o chefão
  final hoje é GUARDIÃO → **PREDADOR**, e a morte dele termina com o piso rachando e a lava subindo
  (`src/entities/fimDoPredador.ts`);
- o beat 1 reusa **o hangar da Cutscene 3** (`hangar.png`, régua da `Interlude3`) — mas o lugar de
  onde o jogador sai agora é a **câmara D do núcleo**, com a pintura e as bordas da Fatia 7;
- o entulho do beat 1 vem do `selarBoca`, de antes da garganta/esfíncter existir.
**Pergunta de brainstorming, não decisão minha:** o beat 1 continua o jogo que ele acabou de jogar?

**4 · A LUA DE KEPLER já tem arte nova no menu** (`menu-moon.png`, PixelLab `77acaa1d`, Fatia 0),
e o beat 4 ainda cresce a lua do parallax — que *"fica feia acima de ~2,2 de escala"* (registro de
20/07). É a mesma lua da primeira e da última tela do jogo: vale a pergunta de ela ser a MESMA arte.

---

## 📐 AS LEIS DO PASSE VISUAL QUE VALEM AQUI (pagas nas fatias 0–7)

- **Dark sci-fi:** casco escuro e dessaturado, contraste baixo, **luz SÓ onde há energia**. Arte
  bonita mas clara lê como outro jogo; `setTint` sobre arte escura REPINTA; flash e `explodeBig`
  lavam a tela e apagam o que deveriam anunciar.
- **Fundo pintado:** assado em 384×216, escala 1. Reduzir pode, **AUMENTAR nunca**.
- **Efeito de cena se ASSA em pixel** na resolução nativa, com a paleta do vizinho. `Graphics`
  vetorial em tempo de jogo lê como "gerado" — a 1ª versão do fim do predador foi reprovada na hora
  por isso (*"ficou gerado e sem custos"*).
- **Arte com direção clara: gere 3–4 conceitos DISTINTOS e mostre a folha** (crua + em cena), sem
  brainstorming de arte antes. Mas o COMPORTAMENTO (roteiro, beats, tempos) se decide com ele antes.
- **Lote de peças: a LISTA primeiro**, com tamanho e função, e a divisão proposta — ele fica com as
  peças de mão (as que ficam na tela e precisam parecer da mão dos fundos dele); a máquina fica com
  as de restrição mecânica. Ofereça prompts em inglês para as dele.
- **PixelLab:** a fila de review é a BIBLIOTECA dele (nunca descartar em massa); `animate_object`
  ignora "nunca branco" e o vocabulário de gore é barrado — **mude o pedido, não repita**; rotação
  8-dir alisa o estilo (tire a vista nova da original por animação v3).
- **Beat de explosão só se julga em movimento.** As sondas fotografam; a folha por instante de relógio
  de parede (`scripts/_f4/_ver-lenta.mjs` é o molde mais novo) é o mínimo. A sonda de vídeo segue
  como dívida de ferramenta.
- **Uma cena com clarão:** o efeito novo não compete com o velho — ele espera o velho sair
  (lição do sangue do esfíncter, 22/09).

---

## 🚦 O QUE FAZER, EM ORDEM

1. `git checkout -b feat/cutscene-final-visual` a partir da `main`; `npm run dev`.
2. **Ele assiste a cena como está** — do menu `[F]`, e de preferência também chegando nela pela
   morte do predador (`L` → Fase 4), porque a costura com o jogo é metade da pergunta.
3. **Brainstorming** (skill `superpowers:brainstorming`), com as quatro coisas do ⚠️ acima na mesa.
   As perguntas que eu levaria, uma de cada vez:
   - o conceito (vitória amarga, a câmera que recua, a chuva sobre a colônia) **fica**?
   - o que é *"fraco no visual e design"* hoje, beat a beat — quais beats sobrevivem?
   - o beat 1 continua a Fase 4 nova (câmara D, predador) ou o hangar da Cutscene 3?
   - `leviathan-dying.png` / `leviathan-split.png` são o biomecânico certo, ou regera?
   - a lua do fim é a do menu?
4. **Spec** em `docs/superpowers/specs/2026-09-XX-fatia8-cutscene-final-design.md`, **plano** em
   `docs/superpowers/plans/`, e só então arte e código.
5. Fechamento: teste assistido por ele → `probe-interlude4` + `probe-stage4` verdes → atualizar o 🧭
   do HANDOFF (a etapa 1 do roadmap vira ✅) → merge `--no-ff` em `main`.

⚠️ **Ao fechar a 8, o PASSE VISUAL ACABA** — a próxima frente é a CALIBRAGEM (etapa 2 do 🧭).
