# START — o SOM: a FOLHA 8 (o ambiente e os sons de cada fase) e o PASSE DE MIXAGEM — PERGUNTAR A ORDEM

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O SOM (os efeitos; a trilha é dele) tem as folhas
> 1 a 7 inteiras no jogo — a nave, as explosões, os inimigos e perigos, os elites, os QUATRO chefões, a INTERFACE e as
> CUTSCENES (com os flybys dele e as versões por nave) —, a regulagem dos chefões no vácuo e o limitador, tudo aprovado
> por ele (17/11), commitado e empurrado. Falta a FOLHA 8 — o ambiente E os sons de cada fase — e o PASSE DE MIXAGEM.
> A sessão abre PERGUNTANDO A ORDEM (a recomendação: a 8 primeiro)."**
> A spec é `specs/2026-11-15-bloco-som-design.md` — a §10 vale sobre o resto; a **§10.8** e a **§10.9** têm as regras de
> 17/11; a **§6, item 8**, tem o pedido dele para a folha 8. O registro de 17/11: o fim de `plans/2026-11-17-som-chefes-START.md`.

## 1. A PERGUNTA DA ABERTURA — a ordem

**A recomendação (revista em 17/11, com as folhas 6 e 7 fechadas): a FOLHA 8 primeiro, depois o passe de mixagem.** A
mixagem abaixa a BASE (o ambiente) por baixo dos eventos grandes — sem a base, o abaixar dinâmico não tem o que abaixar,
e a cola se calibra numa cena que ainda vai mudar. Mas a decisão é dele — perguntar.

## 2. A FOLHA 8 — o ambiente e OS SONS DE CADA FASE

O pedido dele (17/11): *"barulhos, efeitos, em cada fase. Não precisa ser muita coisa por fase, mas sons e efeitos que
ajudem a dar a imersão que pretendemos"*. Duas camadas por lugar:
- **O FUNDO** — um laço longo por lugar (`camada: 'ambiente'`, preso ao ajuste automático: sobe quando ele tira a música,
  `PISO_PRESENCA`), a troca presa ao que a tela muda (a caverna da F1, a câmara B de água da F4, a virada dos atos da F3).
- **2–4 EFEITOS PONTUAIS por fase**, presos a algo que a tela JÁ mostra (o cenário vivo, o roteiro) — nunca um som sem
  causa visível (a física do lugar).

Os lugares, a conferir no código antes de gerar (a lista de partida está na spec §6, item 8):
- **O menu:** a tempestade da noite (OS TROVÕES — presos aos relâmpagos do cenário vivo) e o amanhecer (a tela final).
- **O hangar** (a cena da escolha antes da F1).
- **A F1:** o vento; o trovão; **a INVASÃO do horizonte** (`src/f1/invasao.ts`: as naves descendo das nuvens, a artilharia
  da defesa, as explosões ao longe) — **OS FLYBYS DELE nas naves da invasão** (`assets/raw/sons/dele/flybys/`, já
  usados na saída da atmosfera e no sobrevoo: o falcon, a variação, o jato ao longe — perguntar quais aqui); a caverna
  gotejando.
- **A F2:** o cinturão ouvido pelo casco (as rochas se chocando ao longe, a cabine rangendo).
- **A F3 = DOIS LUGARES** (ele: *"ela não é só o casco, ela se inicia dentro da nebulosa"*): o Ato 1, **a NEBULOSA** (o
  gás denso, a estática, a carga elétrica, o que vive nela) e o Ato 2, **o CASCO** do Leviatã (o casco gemendo, o metal
  sob tensão, o canto dele ao longe) — cada um com o seu fundo e os seus efeitos.
- **A F4:** a criatura viva (a respiração, o coração, os borbulhos); a água abafada da câmara B.
- O lugar `fundo` no vácuo cai abaixo de 150 Hz (`AO_FUNDO.cabine`): o ambiente do espaço é quase só sentido.

O método de sempre: conferir no código → a lista → PixelLab A/B (+ C sintetizado onde o tempo é do jogo) → a folha
(`_folha-montar` / `_folha-dados` / `_folha-sons` / `_folha-conferir`) → as escolhas → instalar → os ganchos → MEDIR
(`_medir-chefes.mjs`: acrescentar um modo `--ambiente`; a trilha dele fica ≈ −20 LUFS) → um teste em jogo.

## 3. O PASSE DE MIXAGEM (§10.6 da spec; a análise de 17/11 do guia de áudio dele)

Medir antes e depois (um medidor de MISTURA, várias fontes juntas, no fim da cadeia, depois do `LIMITADOR` —
`Som.picoDaSaida`). E ele julga por GIF/jogando, em cena cheia (o sandbox com muitos inimigos).
- **A COLA** — uma compressão suave no barramento do mundo (o `acao`, antes da acústica): razão 2–3, ataque 10–30 ms,
  soltura 100–200 ms, limiar onde a cena cheia passa (medir). NÃO é o limitador (esse fica, é segurança).
- **O ABAIXAR DINÂMICO por prioridade** (o "ducking" do guia): um evento grande (a explosão de chefão, a nave atingida,
  a morte, os momentos) abaixa por 150–250 ms o motor, o AMBIENTE e os inimigos comuns, 2–4 dB, e volta. A trilha:
  perguntar se ela abaixa junto (hoje só no estrondo da F1 e na pausa).
- **O GRAVE DO "CHASSI" no vácuo** — os impactos grandes na cabine ganham corpo abaixo de ~150 Hz (o casco vibrando),
  sem trazer o agudo de volta: combina com o *"não podem perder o efeito do espaço"* dele.
- A largura do pan (`PAN_MAX` 0,4): testar 0,5–0,6 (o guia pedia 0,8 — largo demais para 384 px, sobretudo em fone).

**Onde discordamos do guia** (já dito a ele, 17/11): o corte de 850 Hz em TUDO no espaço (a nave dele é a cabine, limpa —
só o mundo e os chefões passam pelo casco); o compressor −12 dB / razão 8 como limitador (bombearia); hitstop em
ricochete (toca a cada 110 ms, travaria o jogo); o pan 0,8. **Para depois de tudo:** as explosões em camadas em tempo
real e o tremor de tela ligado à força do som (sensação de jogo: o rebalanceamento/polimento).

## Guardado para depois

- **A saída da atmosfera da MANTA** (`momento.f1.saida.charybdis`, a AP) está instalada e não toca: ela só aparece na Doca
  (ele: *"deixe guardado, pode ser que eu implemente algo com ela depois"*).
- **Os canos da enguia** só avisam na 1ª salva (as outras não têm o som da carga — o worker teria que mandar os avisos).
- **Dois elites muito baixos** (medidos em 17/11, não mexidos): o zumbido da mosca (−35 LUFS no interior) e a broca do
  drone (−27) — o mesmo caso dos laços no nível de motor → `_som-renivelar.mjs elites mosca.zumbido drone.minerar` (e
  `sentinela.rolar`, −24) e medir.
- A escolha dele no giro da serra (A) e no estilhaço da lava (B): as duas quase todas acima de 5 kHz — aprovadas; se um
  dia cansarem no ×8, é por aí.

## As ferramentas (scripts/_som/)

As de antes + `_medir-chefes.mjs` (`--comparar`, `--sugerir`, `--interface`, `--cena`, `--porta`, `--json`) ·
`_som-renivelar.mjs <grupo> <nome>…` · `_sintetizar-folha5c.mjs` · `_sintetizar-folha6.mjs` (os toques retrô) · o
`_som-instalar` com `nome: ID > outro.nome` · o `_folha-montar` com `"estereo": true` no take · `Som.emSequencia`,
`Som.duracao`, `Som.calar` · `daNaveNaCena`.
Os testes do som (10): `test-som`, `test-som-tratar`, `test-som-jogo`, `test-som-nave-jogo`, `test-som-inimigos-jogo`,
`test-som-elites-jogo`, `test-som-chefes-jogo`, `test-som-nucleo-jogo`, `test-som-interface-jogo`,
`test-som-cutscenes-jogo` — e o build. 291 verificações verdes em 17/11.
O PixelLab: 3.347 gerações em 17/11 à noite (conferir com `get_balance`), renova em 04/12. Limite de 10 jobs juntos.

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status`; lembrar o **Ctrl+Shift+R**.
2. Perguntar a ordem (o item 1).
3. **Enquanto ele joga, não editar `src/`** (o Vite recarrega a aba dele): trabalhar numa cópia em outra porta
   (`src`, `index.html`, os configs copiados + `public` e `node_modules` por junção, `npx vite --port 5174 --open false`;
   nunca `rm -rf` na cópia — as junções apontam para o projeto).

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, `q/`, `cru/`
  fora. A ordem: o jogo (`feat`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write; um heredoc por comando (e nada de `\` de regex dentro de heredoc — escrever o script com Write);
  PowerShell sem `-Encoding utf8` corrompe acentos.
