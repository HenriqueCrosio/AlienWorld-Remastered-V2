# START — O GUARDIÃO NA COLEIRA (a frente 0 do rebalanceamento, passos 2 → 6)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O Guardião está sendo refeito pela spec
> `specs/2026-11-22-guardiao-coleira-design.md` (a coleira, o leque de lava, os cabos-serpente e o próprio Leviatã),
> em 6 passos, cada um com GIF em jogo e o veredito dele. O passo 1 (o recorte, a corda, a investida presa e o tranco
> A) está APROVADO; o passo 2 foi REFEITO como bullet hell (os pulsos alternados, §1½), aprovado jogando, COMMITADO e
> EMPURRADO; as duas perguntas (§2) FECHARAM em 23/11 (o bolsão fica, o último degrau igual aos outros). Agora: o
> passo 3, os cabos-serpente."**
> Contexto maior: o START do rebalanceamento (`plans/2026-11-21-rebalanceamento-START.md`, as frentes 0–5).

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os GIFs e as pastas `q/`). Lembrar o
   **Ctrl+Shift+R**. Treino da F4 no menu (dev): `K`.
2. Dizer a ele onde paramos (§1 e §1½) e fazer a pergunta em aberto (§2) com a folha aberta (a rodada 3 no topo):
   `docs/superpowers/folhas/2026-11-22/guardiao/folha.html` (os GIFs não estão no git: se faltarem, refilmar com os
   comandos da §4).
3. Se ele for jogar enquanto eu edito: a CÓPIA na 5174 (memória `filmagem-vite-recarrega`: `src`, `index.html`, os
   configs copiados; `public` e `node_modules` por junção; nunca `rm -rf` nela).

## 1. O que está feito (22/11)

**O passo 1 — APROVADO.**
- **O recorte:** os cabos do alto saíram das 4 artes (`guardiao-coleira.png`, `-coleira-idle-sheet`,
  `-coleira-morte-sheet`, `-coleira-destruido`; o `BootScene` aponta as chaves de sempre para elas). Prova: 0 pixels
  diferentes fora da máscara. Originais em `assets/raw/guardiao-com-cabos/`. Receita: `scripts/_guardiao/_recortar-cabos.mjs`.
- **A corda:** a textura amostrada dos cabos pintados (`scripts/_guardiao/_amostrar-cabo.mjs` → `src/data/cordaGuardiao.ts`:
  as faixas ruiva e musgo, as raízes do alto e as **raízes de trás**), desenhada pixel a pixel numa CanvasTexture
  (`src/entities/guardiao/desenharCorda.ts`), Verlet com comprimento retrátil (`corda.ts`), a camada atrás do corpo e
  à frente da moldura (`camadaCabos.ts`, depth −0,4).
- **A coleira e o tranco:** a investida para no alcance das cordas (um círculo em volta da âncora; x ≈ 200 na altura
  da base, ~1/3 da tela) com o **tranco A, seco** (a escolha dele: passa 3 px, volta em 0,12 s; `TRANCOS.A`, o padrão;
  `?tranco=B|C` ainda existe para comparar), a volta elástica em 0,8 s. A morte arrebenta as cordas (no código, ainda
  não visto por ele).
- **As duas correções que ele pediu:** (a) o glitch da ENTRADA (a corda presa no máximo chegava deitada e a ponta
  saía do toco) → o máximo só segura na investida, a folga é em px, o cabo sai do toco pelo eixo (`Corda.saida`); (b)
  os **cabos de trás** (os que a arte arrasta para a direita acabavam na borda do quadro, presos em nada na parada) →
  cada ponta vira corda até o hospedeiro (fora da tela à direita, ou o teto), a raiz seguindo a respiração.

**O passo 2, a 1ª versão — SUBSTITUÍDA pelos pulsos (§1½).** (plano `plans/2026-11-22-guardiao-coleira-passo2.md`)
- **O leque de lava no tranco** (`src/entities/guardiao/lavaGuardiao.ts`, regras puras em `padroes.ts`): 5/6/7 gotas
  por degrau, gravidade 260, cruzam a metade esquerda em ~1 s; as gotas a 18 px na coluna x = 40 (8 px livres: a nave,
  de 9, não passa) e **um vão de 26 px livres**, sorteado, nunca na ponta. **Centrado na altura da nave** no tranco
  (decisão minha: com 5 gotas ele cobre 108 dos 160 px). Os arcos de cima nunca tocam o teto (o leque desce o
  necessário). Na borda, **só respingo** (decisão minha; a spec falava do estilhaço).
- **A salva mirada:** a mesma abertura, número e cadência; o centro na nave; com 4, meio passo para um lado sorteado.

## 1½. O passo 2 refeito (22/11, à noite) — a spec §5 reescrita

- **A direção dele:** *"eu priorizo muito a perspectiva de bullet hell, ou seja, são formatos mais geométricos que
  induzem o jogador a ler o ataque, cobra quem demora ou não percebe o padrão"*. O leque com vão sorteado saiu.
- **Os pulsos alternados** (`angulosPulso` em `padroes.ts`; `LavaGuardiao.pulso`; `BossNucleo.dispararPulso`/`seguirPulsos`
  e o estado `segura`): raios retos em ângulos fixos, A 7 · B 8 (meio passo), o eixo no meio da borda esquerda; 2/3/3
  pulsos por degrau.
- **SEGURA** (a escolha dele no GIF lado a lado com a RECUA, que saiu do código): preso na parada, um mini-tranco por
  pulso, a volta 0,15 s depois do último.
- **A velocidade dele, jogando:** 160 px/s e 0,4 s (`?lavaVel=` e `?lavaEntre=` ficam na URL para calibrar); o último
  degrau 190 e 0,32.
- **A brasa** no vermelho do miolo, metade da densidade.
- **A lava atravessa a parede** (ele: a nave vai até a linha da tela): respinga na borda da arena e segue até sair.
- Testes: `test-guardiao-padroes.mjs` (puro) e `test-guardiao-lava-jogo.mjs` (em jogo) reescritos; o filme
  `scripts/_guardiao/_gif-pulsos.mjs` (a nave lê o padrão e conta os toques de lava).
- ⚠️ As armadilhas de medição desta noite (no script do filme, já corrigidas): o toque se conta pelo `release` + o
  `damageShip` no MESMO passo (distância perdia toques; uma marca que sobra de um quadro conta toque falso); a caixa da
  nave é 21×9; entre as cenas, a nave sai do caminho e o ciclo dele fica preso.

## 1⅞. O passo 4, o aperto (23/11) — APROVADO na rodada 2, commitado

O passo 3 FECHOU (*"aprovado"*), commitado (`563acff2`, `2c3f749a`, `b3c49063`). Plano
`plans/2026-11-23-guardiao-coleira-passo4.md`; a folha no topo: `aperto-A.gif` (vão alto) e `aperto-B.gif` (vão baixo),
a nave lendo em cima e parada embaixo.
- O código: `src/entities/guardiao/aperto.ts` (puro: o anel, as fases, o empurrão), `camadaAperto.ts` (a faixa
  redesenhada coluna a coluna), `Moldura.pecasDaFaixa()`, `BossNucleo.ts` (a ação `aperto`, `empurrarNave`, a
  `moldura` no construtor), `padroes.ts` (o rodízio 33–0 %: investida → serpentes → aperto → serra).
- Os testes: `test-guardiao-aperto.mjs` (puro), `test-guardiao-aperto-jogo.mjs`, `test-guardiao-padroes.mjs` (+ o
  rodízio). O filme: `scripts/_guardiao/_gif-aperto.mjs <out.gif> --paineis 0:le,0:parada` (0 = vão A, 1 = vão B).
- As 4 perguntas da folha: o vão alternando, inchar no lugar antes de correr, o empurrão sem custo, a cara da faixa D.
- ⚠️ **RODADA 2 (as respostas dele):** alternância e inchar no lugar FICAM; a borda torcida COBRA 1 VIDA e o hitbox é o
  FIO aceso em volta dela (`CamadaAperto.FIO`, `torcidaEm`, `BossNucleo.morde` → a cena). Folha no topo:
  `aperto-fio.png`, `aperto-r2-A.gif`, `aperto-r2-B.gif`. Os sons (e a ideia das notas de guitarra arranhando na onda)
  ficam no passo 6. APROVADO (*"aprovado, pode commitar e seguir pro passo 5"*).

## 1¾. O passo 3 (23/11) — APROVADO

Plano `plans/2026-11-23-guardiao-coleira-passo3.md`; a folha na rodada 5 (o topo): `serpentes-r5-d1.gif` (66–33%, duas,
2 botes cada) e `serpentes-r5-d2.gif` (33–0%, as mesmas duas, 3 botes cada), a nave lendo em cima e parada embaixo.
- ⚠️ **A RODADA 5 (23/11):** a raiz de baixo DENTRO DA CARCAÇA, (58, 40) = (186, 168) do PNG — a corda sai de baixo da
  borda dela (o traço dele, (332, 148) na tela), não da faixa de tentáculos (opaca, mas escura como o fundo: *"quero que
  ela saia de trás do guardião, como eu disse"*). As respostas dele: cabeça fica, tom fica, a 3ª SAIU (duas com mais
  botes: `SERPENTE_BOTES = [2, 3]`). Em aberto: só o 3 do último degrau (decisão minha). Fotos: `_raiz-verde.mjs`
  (+ `--sem-verde`, o tom de verdade).
- ⚠️ **A RODADA 6 (23/11):** as raízes acompanham o corpo (`Serpente.desvio`, antes pregadas na saída) e ele segue
  balançando reduzido nas serpentes (`SERPENTE_BALANCO` 0,35); `SERPENTE_BOTES = [2, 2]` (ele: *"duas serpentes, 2 botes
  cada"*). Folha no topo: `serpentes-acompanham.png`, `serpentes-r6-d1.gif`, `serpentes-r6-d2.gif`. Nada em aberto no
  passo 3 além do veredito.
- O código: `src/entities/guardiao/serpente.ts` (puro), `camadaSerpentes.ts`, `padroes.ts` (`proximaAcao`, o rodízio),
  `desenharCorda.ts` (+ `pontaPx`, `escurecerFaixa`), `BossNucleo.ts` (a ação `serpentes`, `SERPENTES`, `paramSerpentes`).
- Os testes: `test-guardiao-serpente.mjs` (puro), `test-guardiao-padroes.mjs` (+ o rodízio), `test-guardiao-serpente-jogo.mjs`.
  O filme: `scripts/_guardiao/_gif-serpentes.mjs <out.gif> --paineis 1:le,1:parada [--fotos <dir>]`.
- ⚠️ Armadilhas do filme (corrigidas): o robô fugindo na perpendicular do bote entrava no limite da tela ou na cara da
  outra cabeça; a fuga certa é DE LADO (em x) — o bote vem da borda, íngreme. E sem teto em x ele encostava no corpo dele.
- ⚠️ **A RODADA 2 (o desenho dele, 23/11):** *"as serpentes saem do próprio guardião"* — a corrida pela borda SAIU; cada
  uma sai do corpo num ARCO LARGO (cúbica raiz → posto, os controles na altura do arco) e a cabeça fica POSTADA, fixa, à
  frente dele: (183, 54) e (178, 128), medidos no desenho (`SERPENTE_CIMA`/`SERPENTE_BAIXO` em `BossNucleo.ts`). O
  desvio do robô (teste e filme): na perpendicular do bote, para o lado com folga, as outras cabeças contando como parede.
- ⚠️ **A RODADA 3 (23/11, ele: mais finas, sem quina, "comportamento de serpente, mais natural e fluido"):** 5 px
  (`CamadaSerpentes.FINA`); o corpo é uma curva só (arco + pescoço em cúbica com a tangente contínua, controles que crescem
  com a virada); os arcos chegam ao posto na horizontal (`c2` na altura do posto); o enrolar é PARA DENTRO do corpo (contra
  a nave virava laço); serpenteia, onda no corpo todo, tangente da cabeça suavizada, recolher ondulando. Regra: ≤ 40° a
  cada 4 px (`DOBRA_MAX`, no teste puro); a medida por fase: `node --experimental-transform-types scripts/_guardiao/_dobra.mjs`.
- ⚠️ **RODADA 4 (23/11):** ele *"gostei desse"* — e a de baixo *"sai do nada"*: a raiz caía num pixel TRANSPARENTE da
  arte; agora `RAIZ_BAIXO` (84, 67), dentro da faixa de tentáculos opaca nos 9 quadros. Prova em verde:
  `node scripts/_guardiao/_raiz-verde.mjs <out.png> [--quadros 60,90,130] [--recorte x,y,w,h]`.
- As perguntas (na folha, rodada 2): a cabeça (a ponta afilada × recorte × PixelLab), a 3ª serpente (fora do
  desenho: feixe de trás, posto (150, 90)) ou só duas com mais botes, os números, o tom do corpo (75 %).

## 2. As duas perguntas — FECHADAS em 23/11

- **O bolsão FICA** (ele: *"deixa como está, é muito arriscado ir para esse spot pequeno"*): 7 raios.
- **O último degrau IGUAL aos outros**, 160 px/s · 0,4 s (ele: *"tem que manter igual aos outros, exatamente por conta da
  dificuldade da parede. Mesmo do jeito que está hoje, está difícil desviar"*): `LAVA_VEL`/`LAVA_ENTRE` em `BossNucleo.ts`.
  Testes verdes. **O passo 2 FECHOU → o passo 3 (os cabos-serpente).**

O registro das perguntas como foram feitas:

1. **O bolsão colado nele:** a figura de 7 raios cobre a tela inteira até x ≈ 80 (fio seguro ≤ 7 px), mas de x ≈ 90 em
   diante os cantos de cima e de baixo da tela ficam fora dela (um bolsão parado de 10–39 px na cara dele). Duas
   opções: (a) **deixar** — encostar nele na investida já é risco; (b) **abrir o leque para 9 raios** — fecha o canto, mas
   cada pulso fica com mais gotas.
2. **O último degrau (33–0%):** 190 px/s e 0,32 s entre pulsos — decisão MINHA (a proporção de antes: +20% de velocidade,
   −20% de intervalo sobre os 160/0,4 dele). Confirmar, ou o último fica igual aos outros? Para ele testar sem eu mexer
   no código: `?lavaVel=` e `?lavaEntre=` valem para TODOS os degraus (para o último, forçar a vida baixa no treino).

Registrar na spec §5 / §10 (passo 2). Se a (b) do 1 for escolhida: `LAVA_RAIOS = 9` em `BossNucleo.ts`, refazer as contas
do teste puro (o fio parado e o vão lendo) e refilmar com `_gif-pulsos.mjs`.

## 3. O que vem (a spec §6–§12)

| Passo | O quê | A spec |
|---|---|---|
| 3 | **Os cabos-serpente** (de 66% em diante): saem DO Guardião (o feixe do alto e os tentáculos de baixo), correm pelas bordas, ensaiam como cobra e dão o bote (trava 0,4 s, reto até onde a nave estava). A mesma corda. | §6 |
| 4 | **O aperto** (de 33%): a peristalse da borda, um vão ≥ 50 px correndo da direita para a esquerda; empurra, não fere. | §7 |
| 5 | **O teto que sangra** (de 33%): duas ondas alternadas de colunas retas de gotas do sangue do hospedeiro. | §7 |
| 6 | Os sons e ele jogando a luta inteira; `scripts/_rebalance/medir-guardiao.mjs` (o molde é o `medir-capitania`). | §8, §11 |

Cada passo: plano próprio (`plans/2026-11-22-guardiao-coleira-passoN.md`), GIF em jogo na velocidade real, o veredito.
Também: o **rodízio por degrau** e a **janela de dano** (§8: toda ação na estação abre o miolo). Depois do Guardião, a
BESTA (o START do rebalanceamento, §4.3).

## 4. As ferramentas

- Testes puros: `node --experimental-transform-types scripts/test-guardiao-coleira.mjs` e `… scripts/test-guardiao-padroes.mjs`.
- Em jogo (com o `npm run dev`): `node scripts/test-guardiao-coleira-jogo.mjs [--porta 5173] [--fotos <dir>]` e
  `node scripts/test-guardiao-lava-jogo.mjs [--porta 5173]`.
- GIFs: `node scripts/_guardiao/_gif-pulsos.mjs <out.gif> [--degrau 1] [--cenas 100:5,10:5] [--variantes <query>,…]
  [--rotulos …] [--parada]` (os pulsos; a nave lê o padrão e o script imprime os toques de lava),
  `node scripts/_guardiao/_gif-investida.mjs <out.gif> --variantes A [--cenas 70:4.8,150:4.8]` (a investida; o `--desvia`
  era do leque antigo e não faz mais nada) e `node scripts/_guardiao/_fotos-entrada.mjs <dir> --cada 3 --gif <out.gif>`
  (a entrada, com a camada das cordas sozinha ao lado).
- A arte: `_recortar-cabos.mjs [--folha]`, `_amostrar-cabo.mjs`, `_bordas-tras.mjs` (as pontas na borda direita por
  quadro), `_grade.mjs` (recorte ampliado com grade).

## 5. Observações

- `scripts/probe-stage4.mjs` tem um ✘ VELHO: espera a tela de vitória no fim da campanha, e desde 13/11 o fim é o menu
  do amanhecer (cena=Menu). O Guardião, a troca e o Predador passam. Atualizar a sonda quando der.
- Refinamento possível da corda: a textura ainda lê um pouco listrada de perto.

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, `q/`,
  `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Enquanto ele joga, não editar `src/` nem `.html` (a cópia na 5174).
