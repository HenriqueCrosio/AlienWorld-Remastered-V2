# START — o VEREDITO do bloco F (a sonda e os asteroides novos), depois o rebalanceamento

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O bloco F está feito: a SONDA (aprovada em
> 20/11) e os ASTEROIDES novos com a rocha do minerador (instalados em 20–21/11, ainda sem o veredito dele). A sessão
> abre com ELE analisando as folhas e jogando a F2 e a F3, e dando o veredito; eu ajusto uma coisa por vez. Quando ele
> fechar o F, segue o rebalanceamento."**
> Tudo está commitado e empurrado (21/11). A spec dos asteroides: `specs/2026-11-20-bloco-f-asteroides-design.md`; a da
> sonda: `specs/2026-11-20-bloco-f-sonda-design.md`.

## ✅ O VEREDITO (21/11) — O F FECHOU

Ele jogou a F2 e a F3: *"O restante ficou bom"*. Entraram duas coisas, aprovadas (*"está tudo ok"*), commitadas e
empurradas — o registro na §5 da spec dos asteroides:
- **Um asteroide nascia em cima do outro** (sobretudo junto com a rocha do minerador) → a vaga conferida no
  nascimento, a travessia inteira com a deriva (`src/systems/vagaDosDestrocos.ts`; testes `test-destrocos-vaga`,
  `test-destrocos-vaga-jogo`).
- **O cristal de âmbar da F3** (o pedido dele) → o P17 e o M2, variantes só visuais do asteroide na F3 (um em quatro).

**A próxima sessão abre no §3 abaixo (o rebalanceamento).** As seções 1 e 2 ficam como registro.

## ▶️ Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status` (limpo, fora os vídeos, os GIFs e as pastas `q/`). Lembrar o
   **Ctrl+Shift+R**. ⚠️ Em 21/11 o Claude Code derrubou os servidores por falta de memória com a sessão parada: só
   subir o que for usar (a 5173; a cópia da 5174 só se ele for jogar enquanto eu edito).
2. Dizer a ele a lista abaixo; ele analisa na ordem que quiser. **Enquanto ele joga, não editar `src/` nem `.html`**
   (a cópia na 5174, reiniciando o servidor dela depois de editar vários arquivos: o Vite duplica módulos).

## ✅ O QUE ELE PRECISA ANALISAR

### 1. A folha dos asteroides — `http://localhost:5173/docs/superpowers/folhas/2026-11-20/asteroides/folha.html`
(⚠️ as imagens moram nas pastas `q/`, fora do git: a folha abre nesta máquina, não num clone novo.)
- **As escolhas dele, já no jogo:** os pequenos **28, 49, 61** (24–26 px), os médios **4, 17** (26–28 px), o grande
  **5** com o tom ajustado (32 px) — `public/sprites/asteroid.png`, `asteroid-2` … `asteroid-6`.
- **A rocha do minerador:** a **rachadura 2·a** (`elite-rocha.png`, 62×63) e o **grande 1·âmbar a**
  (`elite-rocha-2.png`, 62×58), sorteadas; o drone sobre o âmbar (`DroneMineracao.ENCAIXE` por textura).
- Os antigos (os 3 asteroides de 26 px e o geodo de 80 px) em `assets/raw/asteroides-antigos/`.

### 2. Jogando a F2 (`V`) e a F3 (`M`) — o que conferir
- **Os asteroides novos girando no cinturão e na nebulosa**: nenhum lado reto, nenhum blocado (a escala agora é
  0,85–1,0, nunca ampliada — era 0,7–1,9 sobre a arte de 26 px).
- ⚠️ **O TOM das rochas do minerador:** elas têm o tom da família, que no cinturão já lê claro; numa pedra de 60 px a
  superfície clara pesa mais (o grande 1·âmbar, de topo claro, mais ainda). Se ele achar que destoa: descer 1–2
  degraus da paleta só nas duas (o `tom()` de `scripts/_asteroides/montar-minerador.py`, a receita na spec dos
  asteroides §4; os scripts de lá rodaram na scratchpad — os caminhos são receita, ajustar).
- ⚠️ **O campo ficou menor:** o maior asteroide passou de 49 px na tela para 32. Se ele sentir falta de pedra grande:
  gerar 1–2 de verdade maiores (40–48 px), com o grande 5 como estilo (spec §5).
- **O drone no âmbar** das duas rochas (o encaixe medido na arte, não em jogo com ele trabalhando: conferir que a
  broca cai no cristal, e que a rocha quebrando — a morte de rocha R2/R3 — lê bem no tamanho novo).
- **A sonda** (já aprovada, *"Agora melhorou"*): só se ele quiser rever o balanço jogando.

### 3. Depois do veredito do F: o REBALANCEAMENTO
As cartas fortes demais, a vida da enguia, a saída da aranha do casco; o guardado do som (o fim de
`plans/2026-11-18-som-mixagem-START.md`): a mosca e o drone baixos, os canos da enguia só na 1ª salva, a cola, o
ambiente cedendo aos eventos grandes, o grave do "chassi", o `PAN_MAX`. E o que ficou anotado para a build final (o
🧭): o resultado/os créditos que repetem ao voltar ao menu.

## As ferramentas

- Os testes: `test-sonda-regras`, `test-sonda-ondas` (`node --experimental-transform-types …`), `test-sonda-jogo`,
  `test-elites-regras`, `test-som-elites-jogo`, `test-morte`, e o build.
- O GIF da sonda em jogo: `scripts/_sonda/_gif-sonda-jogo.mjs` (`FOGO=1`, `SEMENTES=…`); a morte filmada:
  `scripts/_inimigos/_filmar-destrocos.mjs <out.webm> sonda`.
- Arte no PixelLab: `create_image_pro_from_style` copia demais as referências (os pequenos saíram clones dos de hoje);
  `create_image_pro` com canvas explícito encolhe a pedra para ~2/3 do quadro; para a mesma pedra maior, ela como
  `reference_images` (deu certo nas rochas do minerador).

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, GIFs, `q/`,
  `cru/` fora. A ordem: o jogo (`feat`/`fix`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write (ou script Python em arquivo que FALHA quando o trecho não é achado); um heredoc por comando.
