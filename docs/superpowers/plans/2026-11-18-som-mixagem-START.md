# START — o SOM: o PASSE DE MIXAGEM (a recomendação) ou a folha 6 (a interface) — PERGUNTAR A ORDEM

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. O SOM (os efeitos; a trilha é dele) tem as folhas
> 1 a 5 inteiras no jogo — a nave, as explosões, os inimigos e perigos, os elites e os QUATRO chefões —, a regulagem dos
> chefões no vácuo e o limitador de segurança, tudo aprovado por ele jogando (17/11). A sessão abre PERGUNTANDO A ORDEM:
> o PASSE DE MIXAGEM agora (a recomendação) ou a folha 6 (a interface) antes."**
> A spec é `specs/2026-11-15-bloco-som-design.md` — a §10 vale sobre o resto; a **§10.8** tem as regras de 17/11.
> O registro de 17/11: o fim de `plans/2026-11-17-som-chefes-START.md`.

## 1. A PERGUNTA DA ABERTURA — a ordem

A recomendação de 17/11 (a análise do guia de áudio dele): **o passe de mixagem AGORA**, porque o conteúdo de combate
está completo (as folhas 1–5) e a mixagem feita antes seria refeita a cada folha nova; as folhas 6 (interface) e 7
(cutscenes) são menos densas, e a 8 (o ambiente) é a BASE que o abaixar dinâmico vai precisar abaixar. Mas a decisão é
dele — perguntar.

## 2. O PASSE DE MIXAGEM (§10.6 da spec; a análise de 17/11)

Medir antes e depois (o `_medir-chefes.mjs` é o molde: um medidor de MISTURA, várias fontes juntas, no fim da cadeia,
depois do `LIMITADOR` — `Som.picoDaSaida`). E ele julga por GIF/jogando, em cena cheia (o sandbox com muitos inimigos).

- **A COLA** — uma compressão suave no barramento do mundo (o `acao`, antes da acústica): razão 2–3, ataque 10–30 ms,
  soltura 100–200 ms, limiar onde a cena cheia passa (medir). NÃO é o limitador (esse fica, é segurança).
- **O ABAIXAR DINÂMICO por prioridade** (o "ducking" do guia): um evento grande (a explosão de chefão, a nave atingida,
  a morte, os momentos) abaixa por 150–250 ms o motor, o ambiente e os inimigos comuns, 2–4 dB, e volta. A trilha:
  perguntar se ela abaixa junto (hoje só no estrondo da F1 e na pausa).
- **O GRAVE DO "CHASSI" no vácuo** — os impactos grandes na cabine ganham corpo abaixo de ~150 Hz (o casco vibrando),
  sem trazer o agudo de volta: combina com o *"não podem perder o efeito do espaço"* dele.
- A largura do pan (`PAN_MAX` 0,4): testar 0,5–0,6 (o guia pedia 0,8 — largo demais para 384 px, sobretudo em fone).

**Onde discordamos do guia** (já dito a ele, 17/11): o corte de 850 Hz em TUDO no espaço (a nave dele é a cabine, limpa —
só o mundo e os chefões passam pelo casco); o compressor −12 dB / razão 8 como limitador (bombearia); hitstop em
ricochete (toca a cada 110 ms, travaria o jogo); o pan 0,8. **O que já seguimos:** a variação por disparo, a polifonia e o
anti-spam, a acústica por lugar, os barramentos com a interface e a trilha fora do filtro, o catálogo declarativo, o
desbloqueio do áudio. **Para depois de tudo:** a base de ambiente (a folha 8), as explosões em camadas em tempo real e o
tremor de tela ligado à força do som (sensação de jogo: o rebalanceamento/polimento).

## 3. Se for a folha 6 — a interface

Os menus, a pausa, as configurações, a nave perdida, o hangar, o arquivo de cartas, as cartas (escolher, a raridade).
Conferir no código cada toque antes de gerar; a camada `interface` não passa pela acústica nem pelo limitador de cena
(passa pelo `LIMITADOR` — ele está na saída de tudo dos efeitos).

## Guardado para depois

- **Os FLYBYS dele** (`assets/raw/sons/dele/flybys/`) — folha 7 (cutscenes) / 8 (ambiente); perguntar onde cada um passa.
- **Os canos da enguia** só avisam na 1ª salva (as outras não têm o som da carga — o worker teria que mandar os avisos).
- **Dois elites muito baixos** (medidos em 17/11, não mexidos — não eram chefões): o zumbido da mosca (−35 LUFS no
  interior) e a broca do drone (−27): o mesmo caso dos laços no nível de motor → `_som-renivelar.mjs elites
  mosca.zumbido drone.minerar` (e `sentinela.rolar`, −24) e medir.
- A escolha dele no giro da serra (A) e no estilhaço da lava (B): as duas quase todas acima de 5 kHz (54 % e 87 %) —
  aprovadas jogando; se um dia cansarem no ×8, é por aí.

## As ferramentas (scripts/_som/)

As de antes (ver o START de 17/11) + `_medir-chefes.mjs` (`--comparar`, `--sugerir`, `--porta`, `--json`) ·
`_som-renivelar.mjs <grupo> <nome>…` · `_sintetizar-folha5c.mjs` · o `_som-instalar` com `nome: ID > outro.nome`.
Os testes do som: `test-som`, `test-som-tratar`, `test-som-jogo` (+ o limitador), `test-som-nave-jogo`,
`test-som-inimigos-jogo`, `test-som-elites-jogo`, `test-som-chefes-jogo`, `test-som-nucleo-jogo` e o build.
O PixelLab: ~3.520 gerações em 17/11 (conferir com `get_balance`), renova em 04/12.

## Como abrir a sessão

1. `npm run dev` (http://localhost:5173) e `git status`; lembrar o **Ctrl+Shift+R**.
2. Perguntar a ordem (o item 1).
3. **Enquanto ele joga, não editar `src/`** (o Vite recarrega a aba dele): trabalhar numa cópia em outra porta (17/11:
   `src`, `index.html`, os configs copiados + `public` e `node_modules` por junção, `npx vite --port 5174 --open false`).

## As leis de sempre

- Commit e push só quando ele pedir, só no nome dele (sem `Co-Authored-By`), nunca para `legacy`; vídeos, `q/`, `cru/`
  fora. A ordem: o jogo (`feat`), as ferramentas e as folhas (`chore`), os docs.
- A conversa em português; código, prompts e raciocínio em inglês.
- Editar com Edit/Write; um heredoc por comando; PowerShell sem `-Encoding utf8` corrompe acentos.
