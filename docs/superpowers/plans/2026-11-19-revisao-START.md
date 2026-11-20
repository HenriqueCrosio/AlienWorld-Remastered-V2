# START — a REVISÃO do que foi feito em 18–19/11, depois o F

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A sessão abre com ELE ANALISANDO tudo o que foi
> feito em 18 e 19/11 — o som fechado (a folha 8, a trilha dele, o passe de mixagem), o menu da noite (a neblina, a
> chuva, o trovão, o Leviatã em reta) e, por último, o FIM do jogo (a trilha final dele, o impacto do Leviatã, os fundos
> que ligam a cutscene final, o sobrevoo que se afasta). Ele joga e diz o que ajustar; eu ajusto, uma coisa por vez.
> Quando ele der a revisão por fechada, segue o F (a F2: os batedores — com os DOIS substitutos que ele gerou — e a rocha
> do minerador), pelo START `plans/2026-11-15-bloco-f-START.md`."**
> Tudo está commitado e empurrado (19/11). As regras do som: §10.10–10.12 da spec `specs/2026-11-15-bloco-som-design.md`;
> o menu: `specs/2026-11-19-menu-neblina-chuva-design.md` e a §3.1 de `specs/2026-10-19-menu-refeito-design.md`.

## 📍 20/11 — os pontos 1 e 2 REVISADOS por ele, os ajustes feitos, commitados e empurrados

- **1, o fim do jogo:** *"ficou muito bom com a trilha sonora do tema final"*; o flyby final e o impacto aprovados. Os
  ajustes (a §10.13 da spec do som): a trilha final ADIANTADA para a 1ª cena (a nave sugada, `T.DESCOMPRESSAO`); o rasgo e
  a descompressão −1,7 dB; o impacto −1,4 dB; o FOGO da colônia já na queda, baixo (*"a colonia já está em chamas
  antes"*), e a superfície "A e C" JUNTAS (o vento por baixo do fogo desde o impacto, à frente quando a lava esfria, o
  fogo em brasas). Ele: *"Agora tudo ficou muito bem organizado"*.
- **A decisão do hangar:** confirmada como já estava (o hangar segue a faixa do menu de onde veio).
- **2, o menu:** *"tudo ficou muito bem feito"*.
- **Novo, dele:** as CUTSCENES ENTRE AS FASES (1, 2 e 3) sem música — *"só ocorra os efeitos e ambientação. É a pausa
  que o jogador precisa entre as fases"*: a trilha sai em 1,5 s quando a cutscene abre (`SAI_A_TRILHA_MS`). Elas não têm
  fundo de ambiente próprio. **O preenchimento veio DELE no mesmo dia e está no jogo:** o espaço grave nas cutscenes 1 e
  2, o interior biomecânico + o complemento grave juntos na 3 (mais presentes, a pedido dele), e o assobio do alerta da
  cutscene 3 abafado. Aprovado: *"perfeito"*. (a §10.13 da spec do som)
- **Anotado para a limpeza da build final (ele: *"pode ser anotado agora e ajustado depois"*):** o RESULTADO/os CRÉDITOS
  repetem — do menu do amanhecer, ir a uma cutscene ou fase e voltar ao menu cai de novo na tela de créditos; deve
  disparar UMA vez por zerada. Ver o 🧭 do HANDOFF (a causa já achada).
- ✅ **A REVISÃO FECHOU (20/11):** ele revisou também o ponto 3 — *"está tudo certo com as pendencias do ponto 1 e 2,
  ponto 3"*. Segue o F (START `plans/2026-11-15-bloco-f-START.md`). (A chama azul da TERMINUS no espaço que ele
  quis na X-AELO era a carta Propulsores: descartado.)

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos e os `q/`). Lembrar o **Ctrl+Shift+R**.
2. Dizer a ele a lista abaixo e deixar que ele analise na ordem que quiser. **Enquanto ele joga, não editar `src/` nem
   `.html`** (o Vite recarrega a aba): ajustes numa cópia em outra porta (5174), levados ao projeto quando ele aprovar.
3. Cada ponto que ele trouxer: conferir no código, medir antes de mexer (as ferramentas abaixo), corrigir só aquilo.

## ✅ O QUE ELE PRECISA ANALISAR

Os atalhos de dev no menu: `[F]` a cutscene final, `[R]` o resultado (o amanhecer), `[T]` troca noite/amanhecer, `[K]`
o núcleo (a luta final), `[H]` a nave A-laranja.

### 1. O FIM DO JOGO (o mais novo, 19/11 à noite — ainda não visto por ele inteiro)
Jogar o fim com as TRÊS naves (a X-AELO, a TERMINUS e a Manta), pelo `[F]` e, uma vez, de verdade (zerar a F4).
- **A trilha final dele** (`Possível theme final.mp3`) entra na FERIDA — a nave expulsa, o Leviatã com o rombo (8 s) —
  e segue sem reiniciar até o resultado, os créditos e o menu do amanhecer. Ver se o ponto de entrada está certo e se o
  começo baixo da faixa casa com a ferida.
- **Os fundos que ligam os capítulos** (os buracos de silêncio sumiram): o interior da F4 (0–8 s) → a ferida C, o casco da
  F3 (8–16 s) → a queda A (16 s até o impacto) → a superfície A, a colônia em chamas (do impacto) → a C, o vento do
  amanhecer (quando a lava esfria, 36 s) → o mesmo fundo na tela final. **Conferir a leitura do "A e C" dele** (as duas
  em sequência, não juntas).
- **O impacto C** no estouro (a bola de fogo nasce 70 ms antes do focinho tocar). O rabo desaba ~0,55 s depois, sem som
  próprio: ver se pede uma segunda batida.
- **O sobrevoo que se afasta** nas três naves: o pico no meio da tela, o pan com a nave, o fade a partir de 1 s antes da
  saída e o motor dela sumindo ~1,5 s depois. A Manta foi ESPELHADA (o take ia da esquerda para a direita).
- ⚠️ **Os VOLUMES do impacto e dos fundos do final são CALCULADOS** (os arquivos comparados ao `amb.f4.interior`), não
  medidos na escala: se algo estiver alto ou baixo sob a trilha, medir com `_medir-chefes.mjs --cena` e ajustar em
  `catalogoSons.ts` (`FOLHA_10_FINAL`). Ouvir também com MÚSICA 0.
- **Uma decisão minha a confirmar:** saindo do menu do AMANHECER, o HANGAR continua o tema final até a F1 (a faixa do
  menu de onde se veio). Se ele preferir a orquestra no hangar, é uma linha em `HangarScene.ts`.

### 2. O MENU (19/11 — a neblina e o Leviatã já aprovados; o resto, conferir jogando)
- A **noite** com a orquestra; o **amanhecer** (`[T]` ou depois de zerar) com o tema final.
- A neblina e a chuva acompanhando a tempestade de 6min16 (aprovadas); o **trovão** do raio visível ~1 s depois do clarão.
- O **Leviatã** numa reta de 240 s, uma vez só (aprovado): conferir que, depois de sair, o céu fica vazio.

### 3. O SOM INTEIRO (18–19/11 — o balanço aprovado: *"chegamos a um nível muito bom"*)
Uma passada pelas quatro fases com MÚSICA 10 e com MÚSICA 0 (quem joga sem trilha): os fundos e os efeitos de cada fase
(a folha 8), a profundidade (o longe escuro e atrasado da luz), os motores novos. Itens guardados para o rebalanceamento,
se ele sentir falta: a mosca e o drone baixos; os canos da enguia só na 1ª salva; a cola, o ambiente cedendo aos
eventos grandes, o grave do "chassi", o `PAN_MAX` (fim de `plans/2026-11-18-som-mixagem-START.md`).

### 4. Para o F (não é revisão: é o que vem depois)
Os **dois batedores novos** que ele gerou no PixelLab (anotados no START do F): abrir com `get_object` antes da 1ª
pergunta, conferir que estão de PERFIL e no estilo da frota.

## As ferramentas para os ajustes

- `scripts/_som/_medir-mistura.mjs [porta] [--exigir]` — a trilha × o mundo, lugar a lugar.
- `scripts/_som/_medir-sobrevoo-final.mjs [porta]` — o nível do sobrevoo final a cada 250 ms, com o x da nave.
- `scripts/_som/_medir-chefes.mjs --cena` — um som no lugar dele (para os volumes do final).
- `scripts/_menu/_leviata-trilho.mjs <porta>` — o caminho do Leviatã do menu medido na tela.
- A folha 10: `http://localhost:5173/docs/superpowers/folhas/2026-11-19/sons/17-final/folha.html` (as escolhas em
  `assets/raw/sons/final/_escolhas.txt` → `node scripts/_som/_som-instalar.mjs final docs/superpowers/folhas/2026-11-19/sons/17-final`).
- Os testes: `test-som`, `test-som-jogo`, `test-som-trilha-jogo`, `test-som-cutscenes-jogo` (o fim inteiro),
  `test-som-ambiente-jogo`, `test-menu-ritmos`, `test-menu-neblina` — e o build.

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, `q/`, `cru/`
  fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write (ou um script Python em arquivo, que FALHA quando o trecho não é achado); um heredoc por comando.
