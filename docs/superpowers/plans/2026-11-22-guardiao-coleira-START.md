# START — O GUARDIÃO NA COLEIRA (a frente 0 do rebalanceamento, passos 2 → 6)

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O Guardião está sendo refeito pela spec
> `specs/2026-11-22-guardiao-coleira-design.md` (a coleira, o leque de lava, os cabos-serpente e o próprio Leviatã),
> em 6 passos, cada um com GIF em jogo e o veredito dele. O passo 1 (o recorte, a corda, a investida presa e o tranco
> A) está APROVADO; o passo 2 (o leque de lava e a salva mirada) está no `src/`, COMMITADO, e espera o VEREDITO dele
> (§2 abaixo). Depois: o passo 3, os cabos-serpente."**
> Contexto maior: o START do rebalanceamento (`plans/2026-11-21-rebalanceamento-START.md`, as frentes 0–5).

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os GIFs e as pastas `q/`). Lembrar o
   **Ctrl+Shift+R**. Treino da F4 no menu (dev): `K`.
2. Dizer a ele onde paramos (§1) e pedir o veredito do passo 2 com a folha aberta:
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

**O passo 2 — no `src/`, ESPERANDO O VEREDITO.** (plano `plans/2026-11-22-guardiao-coleira-passo2.md`)
- **O leque de lava no tranco** (`src/entities/guardiao/lavaGuardiao.ts`, regras puras em `padroes.ts`): 5/6/7 gotas
  por degrau, gravidade 260, cruzam a metade esquerda em ~1 s; as gotas a 18 px na coluna x = 40 (8 px livres: a nave,
  de 9, não passa) e **um vão de 26 px livres**, sorteado, nunca na ponta. **Centrado na altura da nave** no tranco
  (decisão minha: com 5 gotas ele cobre 108 dos 160 px). Os arcos de cima nunca tocam o teto (o leque desce o
  necessário). Na borda, **só respingo** (decisão minha; a spec falava do estilhaço).
- **A salva mirada:** a mesma abertura, número e cadência; o centro na nave; com 4, meio passo para um lado sorteado.

## 2. As perguntas pendentes a ele (o veredito do passo 2)

1. O leque lê bem e é justo?
2. O vão (26 px livres) está largo o bastante?
3. A velocidade (~1 s para cruzar) está boa?
4. O leque centrado na nave e o respingo (em vez do estilhaço) na borda: aprova?

Registrar o veredito na spec §10 (passo 2).

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
- GIFs: `node scripts/_guardiao/_gif-investida.mjs <out.gif> --variantes A [--cenas 70:4.8,150:4.8] [--desvia]` (a
  investida; `--desvia` leva a nave ao vão do leque) e `node scripts/_guardiao/_fotos-entrada.mjs <dir> --cada 3 --gif <out.gif>`
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
