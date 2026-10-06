# START — retomada da FRENTE B: a fatia F3 dos elites (depois de 06/10/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e o `plans/2026-10-06-elites-f3-START.md`. A fatia F2
> fechou; a F3 tem spec e as folhas de arte com as duas criações (à mão e PixelLab) — vou escolher o Caçador e o
> Tentáculo."*

## 1. 📍 O PONTO MARCADO — ele ESCOLHE a arte da F3

Tudo de 06/10 está **commitado e empurrado** (`feat/cartas-preview`, sem merge). O que espera o olho dele:

1. **`folhas/2026-10-06/elites/folha-cacador.png`** (na nebulosa REAL do ato 1, com a nave para escala):
   - MÃO A (lâminas longas) e MÃO B (curtas), 38×26;
   - PRO 1, 3, 8, 12 e 13 (~40px: se escolhido, reduzir a ~70% com a paleta original, como o drone);
   - FLASH girado 90° (saiu de frente; simétrico, vira perfil);
   - os painéis de MECÂNICA: a mira travada tracejada + as 3 agulhas, e o dissolver em pontilhado (3 passos).
2. **`folhas/2026-10-06/elites/folha-tentaculo.png`** (no casco REAL do ato 2):
   - MÃO: a corrente montada (gomo A ou B + a cabeça de boca em anel) e a rachadura do aviso;
   - PRO 3, 4, 8, 13 e 24: cabeça + pescoço juntos (32×32) — para virar corrente, recortar a cabeça (e fechar o corte
     por inpaint, nunca corte reto) com os gomos embaixo;
   - PRO gomos 10/17/31 (copiam a curva da cabeça 8 — encadeiam mal); a MEIA-LUA de 6 (tiro à mão).

Pode vir MISTURA (o corpo de um com as lâminas de outro; a cabeça do PRO com o gomo à mão).

**Depois da escolha:** a arte parada final (tamanho e hitbox) → o PLANO da fatia (`superpowers:writing-plans`, a
partir da spec) → comportamento → animações → GIF em jogo → ele joga o sandbox e a F3.

## 2. A fatia F3, em uma tela (spec `specs/2026-10-06-frente-b-fatia-f3-design.md`)

- **Caçador de Vácuo** (ato 1, vida 10): ESCONDIDO (invisível e SEM corpo, 1,2s) → SURGE (0,3s) → MIRA que segue
  (0,6s) → TRAVA (0,3s, pisca) → RAJADA de 3 agulhas rápidas na linha travada → SOME (0,4s). 3 ressurgimentos, só na
  METADE DIREITA, longe da altura anterior; morto na mira não atira; vivo quando o RABO chega, some de vez.
- **Tentáculo do casco** (ato 2, vida 14) — o desenho é DELE: rachadura SOB a nave → BOTE onde a nave estava →
  MERGULHO por trás da borda do casco → rachadura LONGE (≥140px) → ergue → MEIA-LUA de 6 para cima → afunda e vai
  embora. Um ciclo por aparição. Só a CABEÇA fere/é ferida; o corpo em GOMOS (corrente em código) absorve e machuca.
- **Roteiro:** Caçador t=11 (sozinho; sai a onda de 6 drones de t=16) e t=27,5 (com o cargueiro); Tentáculo t=63,5
  (sozinho; sai a onda de batedores de t=64, kamikazes 67 → 69,5) e t=75.
- **Regra de 06/10:** elite pressiona, não pune (memória `elites-pressionam-sem-punir`).

## 3. O que a sessão de 06/10 fez

**A F2 FECHOU (aprovada por ele)** — detalhe na §0 do `plans/2026-10-05-elites-retomada-START.md`:
- menos punição (rajada do drone espaçada, 5 estilhaços, leque de 2 em 36°, varredura com ~7 tiros em 100°);
- os canos da sentinela acompanham o corpo (o instalador mede o deslocamento por quadro);
- o **escudo com VIDA** (8 por ciclo; `escudoAbsorve`; quebra e volta no próximo ABRIR);
- os **tiros desenhados**: minigun M-C (um tiro de cada um dos DOIS canos), balaço P-A, cristal C-C do drone,
  estilhaços em losango C-A (`PadroesDeTiro.vestirArte` — hitbox própria).

**A F3 começou:** brainstorming → spec → a arte em duas criações (`scripts/_elites/_mao-f3.mjs` à mão;
`_gerar-f3.mjs` no PixelLab; `_fundos-f3.mjs` captura os fundos reais; `_folha-f3.mjs` monta as folhas).

## 4. Anotado — para depois

- **Rebalanceamento (frente C):** o elétrico desfazer o escudo da sentinela (adiado por ele); a trava do elétrico
  pausar o relógio dos elites; o tranco do pesado nos elites; elétrico + pesado = "muito roubados"; a recarga do
  míssil (8s/5s).
- **Leitura dos tiros:** os tiros desenhados dos elites são pequenos e quentes como o laser laranja da nave; se ele
  confundir em jogo, clarear o miolo ou dar contorno escuro de 1px.
- **Sondas que já falhavam** (não são da frente B): `probe-stage2` e `probe-chain`.

## 5. Como testar

- `npm run dev` → `http://localhost:5173/?sandbox` (e `/` para a campanha).
- **Node:** `node scripts/test-elites-regras.mjs` (TUDO OK).
- **Sonda:** `node scripts/probe-elites.mjs` (15/15 — inclui o escudo com vida e os dois canos).
- **GIF em jogo:** `node scripts/_elites/_gif.mjs <out.gif> drone|sentinela [seg] [zoom]`, depois recodificar lendo
  com `fs.readFileSync` (o sharp segura o arquivo no Windows) com `interFrameMaxError: 24, colours: 96` (~2–3 MB).
- **Fundos reais da F3:** `node scripts/_elites/_fundos-f3.mjs <dir>` (a virada do casco é chamada direto: o tween do
  rabo não anda no relógio manual).

## 6. Lições desta sessão

- **PixelLab** (memória `pixellab-ferramentas-testadas`): o Pro (`/generate-image-v2`) com o recorte do conceito de
  ASSUNTO é o melhor e sai em perfil — mas virado à DIREITA (espelhar); o Pro Flash de objeto sai de frente mesmo com
  `view: side`; o `image_to_pixelart` fiel a partir do conceito vira borrão com fundo; peça que encadeia (gomo) não
  sai boa do gerador.
- **Arte copiada de um quadro parado** num clipe animado tem de ACOMPANHAR o corpo (medir o deslocamento por quadro).
- **A piscina de tiros é compartilhada:** tiro com arte nova precisa de hitbox própria (`vestirArte`).
- **`sed` com padrão genérico** pega mais de uma linha (mudou o centro da cabeça junto) — conferir o que mudou.
