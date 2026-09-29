# START — retomada das cartas, linhagens e peças (depois de 28/09/2026)

> **Frase de arranque:** *"Leia o 🧭 do `docs/HANDOFF.md` e este START. O protótipo das cartas, linhagens e peças
> está na `feat/cartas-preview`; vamos analisar os mockups da mesa de cartas e seguir com as implementações."*

Spec: `docs/superpowers/specs/2026-09-27-cartas-linhagens-pecas-design.md` (as decisões fechadas e as EM ABERTO).

## 1. Onde está

- **Branch `feat/cartas-preview`**, empurrada para o `origin` (V2). **Não mergeada** — o fluxo dele é jogar antes.
- **Tudo jogável:** `npm run dev` → http://localhost:5173/.
- **Atalhos de dev (no jogo):** `C` abre uma mesa de cartas; **`L` alterna o layout da mesa** (cartucho → compacto →
  lista); `G` pula para o chefão. **No menu:** `V` F2 · `M` F3 · `L` F4 · `O` Doca · `P` Hangar · `F` cutscene final
  (todas com a nave humana).
- **Sondas:** `scripts/probe-cartas.mjs` (mesas + reset da Doca), `probe-pecas.mjs` (portador → peça → evolução +
  1-UP), `probe-tiers.mjs` (textura/animação/hitbox de cada tier), `probe-layout-cartas.mjs` (os 3 layouts).

## 2. O que já foi feito (27–28/09)

- **Cartas:** 13 cartas, mesas no meio da fase e nas conquistas, reset da alien na Doca, Casco na HUD.
- **Naves:** duas linhagens com tiers **todos animados** (motor nos humanos; nado nas mantas). Hitbox fixa 21×9.
- **Peças:** 3 portadores por fase (F1–F3), evolução + 1-UP na fase seguinte; HMG/Shotgun não caem mais.
- **Mesa de cartas:** 3 layouts implementados para comparar — ver a folha `folhas/2026-09-28/mockups-cartas.png`.

## 3. Próximos passos (na ordem combinada)

1. ✅ 29/09 — **o layout da mesa: o COMPACTO** (cartucho e lista saíram do código).
2. ✅ 29/09 — **o texto nítido: as TRÊS VOZES numa camada HD** (spec `specs/2026-09-29-tres-vozes-camada-hd-design.md`,
   plano `plans/2026-09-29-tres-vozes-camada-hd.md`). Implementado; **falta ele jogar para aprovar**.
3. **A spec 2: a arte nova do compacto** e dos **ícones**, no pixel fino da camada HD (as referências usam ícone
   simples, de uma cor, legível num relance; os nossos são coloridos e detalhados). As molduras do cartucho ficaram no
   disco (`sprites/cartas/carta-*.png`) como material. Lista de peças + divisão dele × PixelLab ANTES de gerar.
4. **Arte da peça** (hoje um losango dourado desenhado em código).
5. **Tier certo nas cutscenes do meio** (Aurora/Doca/Hangar mostram a nave parada na forma de entrada da linhagem).
6. **EM ABERTO com ele:** o que a F4 dá (não tem peças porque não há tier depois dela).
7. Depois disso: a **calibragem** e o **balanceamento** do 🧭 (os números do protótipo são chute).

## 4. Lições desta rodada (as caras)

- **Nave do PixelLab sai vista de cima.** O jogo é perfil: referência lateral + descartar as simétricas ANTES de mostrar.
- **Animação de nadadeira de perfil quebra quando cruza a linha do corpo.** O que funcionou na manta T2: herdar o
  movimento da animação aprovada pela REST `/transfer-outfit-v2` (`scripts/_f4/_pl2.mjs`; a imagem vai aninhada em
  `{image, size}`), e consertar no disco (travar os chifres de UM quadro; apagar a nadadeira extra seguindo o contorno).
- **Base64 copiado à mão corrompe imagem.** Mande do disco pela REST (`scripts/_f4/_pl.mjs` e `scripts/_f4/_pl2.mjs`).
- **Testar método novo na peça PENDENTE**, nunca na aprovada. E só a conversa com ele é pt-br.
