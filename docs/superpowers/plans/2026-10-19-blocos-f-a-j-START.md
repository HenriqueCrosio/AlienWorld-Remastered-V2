# START — os blocos F a J (depois do menu)

> ⏭️ **SUPERADO em 20/10 — NÃO É MAIS A PORTA DE ENTRADA.** A ordem mudou (decisão dele: o visual primeiro): G ✅ → H
> → I → J → F. O F ficou para depois do J. A porta agora é o `plans/2026-10-21-bloco-h-START.md`; este fica como
> registro.

> A frase de arranque: **"Leia o 🧭 do `docs/HANDOFF.md`. O bloco E fechou; vamos começar o bloco F."**
> O roadmap vivo é o 🧭 do HANDOFF; este START é o mapa de entrada da sessão.

## ▶️ COMEÇAR AQUI

1. Ler o 🧭 do `docs/HANDOFF.md` (o roadmap em blocos) e a memória `roadmap-blocos-d-a-j`.
2. Abrir o **bloco F** com as perguntas a ele ANTES de mexer (é jogabilidade: ele testa jogando):
   - **os batedores da frota (F2):** quantas naves por frota; o voo de NAVE (inclinar, curvar) no lugar da senóide;
     atirar contra ele sem punir (medir); a manobra de evasão; passar e sair pela esquerda se não forem abatidos; a
     hitbox das naves finas. ⚠️ O `batedor` também voa na F3: a mudança vale só para a F2?
   - **a rocha do elite minerador:** destoa e é grande demais — diminuir, ou prender a um canto ou a um pedaço maior
     de asteroide (arte nova), junto com o `asteroid` do item 7.
3. Depois do F, o **G** (a arte do cenário da F1: perguntar a referência da cordilheira ANTES de gerar; refazer arte e
   composição), o **H** (os efeitos de imersão por fase, só visuais), o **I** (os itens 9, 11, 13 e 14 da análise
   de 14/10; o 12, o subtítulo do menu, foi resolvido no E; o 13, os flashes, decide-se junto com o bloom do J) e o
   **J** (o pós-processamento, por último).

## O que vem do bloco E e serve aqui

- **`docs/CENARIO-VIVO.md`** — a técnica completa do cenário vivo (camadas, luzes que apagam limpas, tráfego,
  volume, perigo, texto por cima, objetos com física, a auditoria, as armadilhas da implementação). O G (as camadas da
  F1) e o H (mísseis caindo, meteoros, silhuetas ao fundo) partem dela.
- **As peças reutilizáveis** em `src/menu/`: `ritmos.ts` (o tempo das luzes, do tráfego, dos holofotes, do relâmpago),
  `texturas.ts` (o brilho, a bruma, o facho, o cone), `perigo.ts` (holofotes e tempestade), `acaso.ts` (o LCG).
- **As ferramentas** em `scripts/_menu/`: `_maquete2.mjs` (a maquete no jogo, filmada a passos), `_webm.mjs`,
  `_camadas.mjs`, `_tempestade.mjs`, `_auditar-luzes.mjs`, `_ver-cenario.mjs`, `_filmar-menu.mjs`.
- **Para quem testa pelo menu:** durante a abertura, qualquer tecla (Enter também) só PULA para o menu pousado; para
  entrar no jogo direto, use o atalho `1` (diegética), `2` ou `3`, ou os atalhos de dev. `?semhd` abre sem a camada HD.

## As leis que seguem valendo

- Commit e push só quando ele pedir, só no nome dele, nunca para `legacy`; GIFs, vídeos e os `concept art` da raiz
  fora do commit.
- Arte: 3–4 conceitos numa folha antes de instalar; conferir ampliado antes de mostrar; criatura animada nasce inteira
  no PixelLab; fundo pintado em 384×216 (o menu é a única exceção).
- Avaliar mecânica e efeito por vídeo/GIF em velocidade real.
