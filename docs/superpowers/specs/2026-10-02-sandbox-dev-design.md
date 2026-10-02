# Spec — O sandbox de dev: montar a build, os inimigos e o fundo, e jogar (02/10/2026)

> Estado: **desenho aprovado com o Henrique em 02/10** (três partes, uma a uma). Branch `feat/cartas-preview`.
> Por quê (ele): *"para facilitar o teste … isso é bom para testarmos de forma mais crítica e focada. Facilita o
> balanceamento futuro."* Ferramenta de DEV: não entra no jogo do jogador.

## 1. O que é

Uma tela de **montagem** antes do play — a build (árvore de skills), a nave, os inimigos e o fundo — e a **fase real**
rodando em modo sandbox: o roteiro desligado, as ondas que se montou, teclas de dev e um painel de medidas.

**Abordagem (A, escolhida):** a montagem é uma camada **HTML/CSS** por cima do canvas (só no `npm run dev`); o JOGAR
abre a `GameScene` de verdade com `sandbox` nos dados. Nada é simulado: cartas, dano, colisão e HUD são os do jogo.

**Acesso:** `localhost:5173/?sandbox`, e um atalho no menu que só existe em dev.

## 2. A árvore (estilo WoW clássico: 4 árvores por categoria)

```
 NAVE [HUMANA ▾] T[2 ▾]     PONTOS 5/7     [LIVRE ☐]   [RESET]   atalhos: [FOGO] [ELÉTRICA] [EXPLOSÕES] [CASCO]

 ARMAMENTO (2)        EFEITO (2)                      DEFESA (1)        MOVIMENTO (0)
 [Dup][Tri][Cad 1/3]  [Expl]      [Ince]   [Elét]     [Casco]  [Vida]   [Prop 0/2]
 [Perf]  [Pes]         │  │         │        │         │   │    [Bomba 0/2] [Dash]
 [Míss 0/2] [Drone]  [Maior][Frag] [Comb]  [Arco]    [Rec][Reat]
                                    │        │
                      [Flare]     [Cadeia] [Sobrec]
```

- Cada carta é um **nó**: o ícone aprovado, a borda na cor da raridade, o nível ("1/3"). **Clique = +1, botão direito
  = −1.** Passar o mouse mostra nome, efeito, requisito e os números de hoje.
- **As regras são as do JOGO** (não há "gaste X pontos para abrir o andar"): o requisito acende o nó (setas = as
  cadeias); não se tira ponto de quem segura outro; o Triplo tranca o Duplo; com o fundo da F1, Dash e Propulsores
  apagam (`semF1`).
- **Pontos:** o máximo REAL da campanha acompanha a nave — **7 na humana, 8 na alien** (7 mesas: F1 meio, Torre, F2
  meio, Capitânia, aranha, Serpente, guardião; a troca para a alien na Doca dá +1). **LIVRE** tira o limite.
  **RESET** zera. Cada árvore mostra quantos pontos recebeu.
- **Atalhos de build:** FOGO (Incendiário→Combustão→Em Cadeia), ELÉTRICA (Elétrico→Arco→Sobrecarga), EXPLOSÕES
  (Explosivo→Maior+Fragmentado), CASCO (Casco→Recarga+Reativo) — somam por cima do que já está.
- A montagem fica salva no navegador (volta igual depois do ESC ou de recarregar).

## 3. Inimigos, ondas e fundo

```
 FUNDO  (•) F1  ( ) F2  ( ) F3  ( ) F4        [☐ começar no chefão da fase]
 INIMIGOS POR ONDA                              ONDA
 drone [−] 6 [+]  batedor [−] 0 [+]  …          intervalo [ 8s ] (3–30s)   [☑ repetir]
 aranha (minichefe) [☐]                                                    [ JOGAR ]
```

- **Fundo** F1–F4: a pintura e o parallax da fase, e a condução dela (F1 = flap; F2+ = voo livre). A arena é LIMPA —
  sem rochas, paredes do corredor ou destroços (o roteiro está desligado): mede-se a carta contra o inimigo.
- **Ondas:** quantidade por tipo (0–20; a aranha é 0/1). A onda entra pela direita, espalhada na altura e escalonada em
  ~1,5s; a água-viva faz a travessia vertical; a aranha anda no casco. **Repetir** = uma onda a cada intervalo; sem
  ele, uma só.
- **Chefão:** "começar no chefão" abre a fase na luta (como o treino); **G** chama o chefão a qualquer hora. As ondas
  continuam valendo junto.

## 4. Durante o teste

| Tecla | Faz |
|---|---|
| ESC | volta à montagem com tudo como estava |
| N | chama uma onda agora |
| X | limpa a tela (inimigos e tiros deles) |
| I | invulnerável liga/desliga ("INVULN." na HUD) |
| G | chama o chefão da fase |
| M | mostra/esconde o painel de medidas |

**Painel de medidas** (4×/s): tempo; onda N e o tempo para limpar cada uma (e a média); dano total, DPS (médio e dos
últimos 5s) e **dano por fonte** (tiro, explosão, queima, choque, pulso, míssil, drone, estilhaço); abates por tipo;
recebidos (golpes, casco gasto, vidas, bombas); **[copiar medidas]** = build + inimigos + números na área de
transferência.

## 5. Código

| Arquivo | Papel |
|---|---|
| `src/sandbox/arvore.ts` | PURO: layout das 4 árvores, pontos máximos, pode somar/tirar, atalhos — testado em node |
| `src/sandbox/montagem.ts` + `montagem.css` | a tela HTML (só em dev) |
| `src/sandbox/config.ts` | o tipo `ConfigSandbox` e o salvar/carregar (localStorage) |
| `src/systems/SandboxArena.ts` | as ondas, as teclas de dev, o invulnerável |
| `src/systems/Medidas.ts` | o registro de dano por fonte, abates e recebidos; o painel |
| `src/scenes/GameScene.ts` | o modo `sandbox`: roteiro desligado, sem mesa no meio da fase, ESC volta à montagem |

## 6. Testes

- `scripts/test-sandbox-arvore.mjs` (node): limites 7/8, LIVRE, requisito, não tirar quem segura, Triplo×Duplo, `semF1`.
- `scripts/probe-sandbox.mjs`: monta uma build pela tela, joga, confere ondas com as quantidades certas, cartas
  valendo, dano por fonte contando e ESC voltando com a montagem intacta.

## 7. Fora

Obstáculos da fase na arena; as pinturas internas da F4 (B–D); controle/gamepad (etapa 1.6).
