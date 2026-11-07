# START — a enguia colossal (S2): a PARTE B do plano, os efeitos do corpo e a instalação no jogo

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A maquete, os anéis, a girada e as 6 animações
> da cabeça estão APROVADOS e commitados. A sessão abre na Parte B do plano: os efeitos do corpo (os respiros com jato;
> o pixelfx só com o ok dele) e depois a instalação da enguia no jogo."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem dele hoje: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**
> O plano é `plans/2026-11-07-serpente-grande-enguia.md` (a seção "PARTE B"); a spec,
> `specs/2026-11-03-serpente-grande-enguia-design.md`. Os STARTs anteriores têm o registro das etapas:
> `plans/2026-11-07-enguia-geracoes-START.md` (1 e 2) e `plans/2026-11-07-enguia-animacoes-START.md` (3).

## ▶️ ONDE ESTAMOS (fim de 07/11)

Tudo abaixo está APROVADO, commitado e empurrado. Tudo vive na MAQUETE (fora do jogo); o jogo ainda tem a fusão antiga.

1. **A maquete do movimento** (`folhas/2026-11-07/enguia-maquete/maquete.html`): a luta inteira, os tempos, as sondas.
2. **Os anéis = a pele contínua** (`folhas/2026-11-07/enguia-aneis/aneis.html`): a faixa da F1 dobrada pelo caminho, as
   normais, o rolar à vista, as mordidas, o rombo, os gêiseres, a morte com gore.
3. **A girada = o dorso desenhado** (`folhas/2026-11-07/enguia-girada/girada.html`): o dorso do corpo e da cabeça, a
   cabeça em 19 vistas de 10°, a fumaça do rombo no Eco.
4. **As 6 animações da cabeça** (`folhas/2026-11-07/enguia-gestos/gestos.html`), a boca variando por momento (o pedido
   dele: *"o mais variado possível"*):

   | Momento | A boca | Pasta (`enguia-gestos/`) | Função (`enguia/gestos.mjs`) |
   |---|---|---|---|
   | o Eco | fecha lendo a nave, ESTALA escancarada no cuspe, volta | `eco/` (12) | `quadroEco` |
   | os canos | abre devagar na carga, BATE fechada no fogo (+ tranco) | `canos/` (17) | `quadroCanos`, `chuteCanos` |
   | a preparação | o SIBILO: entreaberta, tensa, a brasa apagando | `prepara/` (9) | `quadroPrepara` |
   | o nadar | a RESPIRAÇÃO (cabe entre viradas e gestos, 0,8–2,4 s) | `nadar/` (12) | `quadroNadar` |
   | os mergulhos | fecha no meio da descida (e rola fechada) | (o fechar do `eco/`) | `quadroMergulho` |
   | a mordida no crânio | o GRITO (+ tranco e tremor) | `dor/` (4) | `quadroMordida`, `chuteMordida` |
   | a presa no rombo | a AGONIA: cai frouxa, a goela apaga | `agonia/` (9) | `quadroPresa` |

5. **Os consertos que valem para a instalação** (pedidos dele durante a etapa 3):
   - **A junta pela nuca:** todo quadro gerado inclina a cabeça; cada um é recolado pela nuca, rígido, contra a E3
     (`scripts/_serpente/_enguia-gesto-junta.mjs`; os originais ficam em `<pasta>/original/`).
   - **O selo da junta** (*"esses gaps em todas as gerações"*): `selaJunta` no `desenho.mjs` fecha, depois do crânio e
     da pele, todo vão do fundo preso entre partes dela até 24 px da junta. **Tem de ir para o jogo junto.**
   - **As vistas do rolar por quadro:** os quadros do fechar (eco 1–6) têm as próprias vistas (`vistasCabeca`), senão a
     boca abriria no rolar do mergulho.

## A PARTE B que falta (o plano, passos 3 a 5)

### Passo 3 — os efeitos do corpo (na maquete, folha antes de instalar)
- **Os respiros com jato** (spec §1.3: *"respiros nos anéis soltam jato nas curvas e nas arrancadas, na cor da luz do
  anel — a causa visível da curva no vácuo"*). Hoje são pontinhos de 0,3 s nas curvas
  (`_enguia-maquete.mjs`, "the looks: jets on the bends"), sem saída desenhada no anel e sem arrancada.
  - Medir antes: onde ficam os respiros na arte (as luzes dos anéis da faixa), quantos por curva, e as arrancadas (os
    `para0` do roteiro).
  - Assar em pixel na resolução nativa ([[efeito-de-cena-assado-em-pixel]]), na cor da luz de cada anel; nada cai no
    vácuo ([[fisica-do-lugar-nos-ataques]]).
- **O pixelfx** (`Projetos folder/_referencias/pixelfx`, MIT, clonado só para leitura): **pedir o ok dele antes de rodar
  qualquer coisa** ([[pixelfx-referencia-efeitos]]). Os candidatos: fire breath (o fogo dos canos), geyser (os
  gêiseres), poison cloud (o vapor), plasma ball/energy core (as sementes do Eco), big explosion (a cabeça explodindo).
  Mostrar lado a lado com os efeitos de hoje da maquete; o que entrar é redesenhado na paleta e na regra do jogo.
- A entrega: uma folha com vídeo na velocidade real, antes × agora ([[avaliar-skill-por-gif]]).

### Passo 4 — a instalação no jogo (spec §7.4; um PLANO NOVO antes de mexer no `src/`)
- É a maior parte. Escrever o plano (superpowers:writing-plans) a partir da maquete, que é o ORÁCULO do porte.
- O que o plano já prevê: um módulo por habilidade em `src/entities/serpente/` (`enguia.ts` com o caminho e o corpo,
  `canos.ts`, `eco.ts`, `geiseres.ts`), os números em `numerosEnguia.ts` (de `scripts/_serpente/enguia/numeros.mjs`), a
  forma `fusao` trocada pela enguia (`BossSerpente.ts`), as mordidas novas (`serpenteFusao.ts` → as do spec §6.2), a reta
  final e a morte no rombo.
- O que a etapa 3 acrescenta: os quadros dos gestos viram folhas de sprite (os quadros já recolados + as normais), o
  tempo dos gestos (`gestos.mjs` é puro: porta direto), as vistas do rolar por quadro, e o `selaJunta`.
- As provas: o porte conferido contra os módulos puros da maquete; as sondas `_sonda-hab.mjs`/`_sonda-luta.mjs` com a
  enguia; `npx tsc --noEmit`, `node scripts/test-serpente.mjs`, `node scripts/test-serpente-hab.mjs`,
  `node scripts/test-enguia.mjs`; o desempenho (p95 ≤ 4 ms, o risco do spec §8).
- O atalho de dev `?serpente=fusao` abre direto nela.

### Passo 5 — ele joga
- Calibra a vida (o alvo: 2–3 voltas, ~60–80 s). ⚠️ A vida dobrada das formas foi calibrada com o bug dos tiros de 03/11
  (`b38f2c7`): rever jogando.

## As ferramentas
- **A maquete:** `node scripts/_serpente/_enguia-maquete.mjs desvia <dir> corpo=pele fotos=1`.
  - `gestos=0`: a E3 parada (para comparar); `vaos=1`: a sonda dos vãos na junta (`<nome>-vaos.json`);
  - `em=<t>,<t>…`: fotos em instantes escolhidos, com a junta em `<nome>-juntas.json`;
  - `de=`/`ate=` (um trecho), `luz=0`, `parado`; `ENGUIA_DORSO=0` / `ENGUIA_VISTAS=0`.
  - ⚠️ Uma rodada só de fotos (`de=999`) sobrescreve o vídeo da mesma pasta: use outra pasta.
- **Os vídeos:** `_enguia-segue-cabeca.mjs <antes.mp4> <agora.mp4> <saida.mp4> <t0:dur>…` (a câmera segue a cabeça).
- **Os gestos:** `_enguia-gestos-medir.mjs` (o rolar em cada gesto), `_enguia-gesto-medir-clipe.mjs` (luz, junta,
  salto por quadro), `_enguia-gesto-junta.mjs` (recolar pela nuca), `_enguia-gesto-limpa.mjs` (apagar efeito pintado),
  `_enguia-gesto-vaos.mjs` (os vãos no quadro, sem a cena).
- **O PixelLab:** `scripts/_f4/_pl.mjs mini|anim …` (PixMiniMax/v3), `_achar-loop.mjs` (o laço num clipe); as normais
  de um gesto numa chamada só (`create_normal_map` lite com um GIF animado; tira >1024 px é recusada).
- **Os testes:** `node scripts/test-enguia.mjs` (tudo ok em 07/11).

## As leis que seguem valendo
- **Commit e push só quando ele pedir,** só no nome dele (sem Co-Authored-By), nunca para `legacy`. Vídeos, GIFs e
  `cru/` ficam fora.
- **A conversa com ele em português;** código, comentários e prompts em inglês.
- **A arte:** conferida AMPLIADA antes de mostrar; a peça aprovada não se mexe (o teste é na pendente); ele julga por
  vídeo em velocidade real; defeito apontado em peça aprovada se corrige só ali, provando que o resto ficou igual.
- **PixMiniMax** ([[pixminimax-animacao]]): nomear um efeito, mesmo negando ("no sparks"), pinta o efeito; descreva só
  o corpo; recole pela nuca; confira os vãos.
- **Edição por script corrompe** (CRLF; PowerShell sem `-Encoding utf8` estraga os acentos): editar com Edit.
- **O servidor** fica em `:5173` (`npm run dev`). As folhas abrem por ele.
