# START — a enguia colossal (S2): o PASSO 5, ele joga e calibra

> ⚠️ **FECHADO EM 08/11, SEM SESSÃO PRÓPRIA:** ele jogou e aprovou a luta como está (a taxa 30, a reta final até o posto,
> o Eco final repetido), e a vida foi para o rebalanceamento (item 8 do apêndice de `docs/MAPA_TECNICO_BALANCEAMENTO.md`).
> Este arquivo fica como registro das ferramentas. O próximo item do roadmap é o CENÁRIO da luta: o START
> `plans/2026-11-09-cenario-luta-serpente-START.md`.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md` e este START. A enguia está no jogo (o passo 4), idêntica à
> maquete quadro a quadro, num worker. A sessão abre com as respostas dele sobre a folha
> `folhas/2026-11-08/enguia-jogo/jogo.html` e segue para o passo 5: ele joga e calibra a vida."**
> O roadmap vivo é o 🧭 do HANDOFF. A ordem: **a Serpente grande → o CENÁRIO da luta → H → I → J → F.**

## ▶️ ONDE ESTAMOS (fim de 08/11)

O passo 4 está feito e NÃO commitado (ele pede). O plano: `plans/2026-11-08-enguia-instalacao.md`, decisões 1–13.

**Perguntas abertas a ele (na folha):**
1. **A taxa da enguia:** 30 passos/s (o padrão; o ritmo do vídeo aprovado) ou `auto` (60 quando o worker dá conta)? Ele
   perguntou se 30 lê estranho; a folha tem a maquete, o jogo a 30 e o jogo a 60 lado a lado. O padrão vive em
   `BossSerpente` (`taxa: this.dev?.taxa ?? 30`).
2. **A reta final na volta ao posto / sob o casco:** hoje ela vai até o posto e mergulha sem os canos (a spec pedia
   meia-volta). Mudar = geometria nova no `RoteiroVivo` (provar na maquete antes).
3. **O Eco final repetido** até ela morrer (a vida só chega a 0 na pausa do Eco da reta final).

## O PASSO 5

- Ele joga: `http://localhost:5173/?serpente=fusao` (a fusão já na chegada; `&vida=20` para chegar logo na reta final).
- **A vida:** `LUTA.vida.fusao` = 120 (a de antes, calibrada com o bug dos tiros de 03/11). Alvo da spec: 2–3 voltas,
  ~60–80 s. Na sonda do motor (`node scripts/test-enguia-porte.mjs motor`) a 0,12 de dano por passo à vista ela morreu
  em ~72 s, mas um jogador real acerta mais ou menos que isso: calibrar jogando.
- **O dano:** o tiro conta pelo desenho dela no último quadro (corpo 1×, cabeça 1,5×, o lábio na frente absorve); o
  toque é pelos perigos da maquete (o corpo, a cabeça, o fogo, os gêiseres, as explosões do Eco).

## As ferramentas

- **O oráculo:** `node scripts/test-enguia-porte.mjs [efeitos|movimento|arte|roteiro|respiros|desenho|vida|motor]`.
- **A luta inteira pelo porte × a maquete:** `node scripts/_serpente/_enguia-porte.mjs <desvia|parado> <dir>` e
  `node scripts/_serpente/_enguia-maquete.mjs <desvia|parado> <dir> corpo=pele md5=1`; os `*-md5.txt` têm de ser iguais.
- **O custo:** `node scripts/_serpente/_enguia-desempenho.mjs [jogador=parado] [sem=particulas]`.
- **No jogo:** `node scripts/_serpente/_sonda-enguia.mjs <out.json> [--taxa 30|auto] [--filmar <dir> --de <s> --ate <s>]
  [--perfil <quadro>]` (com o `npm run dev`; não editar `src/` durante a sonda).
- **A maquete continua o oráculo:** qualquer mudança de comportamento nasce nela, é aprovada por ele, e o porte a segue
  (o md5 prova).

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele (sem Co-Authored-By), nunca para `legacy`. Vídeos, GIFs e `cru/` fora.
- A conversa com ele em português; código, comentários e prompts em inglês.
- A peça aprovada não se mexe: o md5 dos quadros prova.
- Edição só com Edit/Write (CRLF, `${}`, acentos).
