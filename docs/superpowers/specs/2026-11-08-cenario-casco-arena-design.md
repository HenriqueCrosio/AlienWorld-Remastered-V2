# O CENÁRIO DO CASCO E DA ARENA DA SERPENTE (F3) — design

> Conversa de 08/11 (brainstorming, START `plans/2026-11-09-cenario-luta-serpente-START.md`). O pedido de origem
> (28/10): *"o cenário do boss não condiz com a fase"*. O de hoje: *"A fase 3 é dentro da nebulosa mas, no momento da
> luta, tudo escurece. Quero que o jogador sinta que ainda está dentro da nebulosa, na aproximação do leviatã."*

## 0. O escopo, e o que NÃO muda

- **Só visual e cenário, do início do casco (o preto depois do rabo) até o fim da F3.** O Ato 1 fica como está.
- **Não muda nada de:** inimigos, aranha, props do casco, a Serpente de 3 cabeças, a fusão, a enguia (comportamento,
  desenho, tempos, perigos, lonas). O oráculo `scripts/test-enguia-porte.mjs` continua batendo.
- **A única coisa fora do visual, aceita por ele (08/11, opção A):** o relógio do Ato 2 anda **+2 s** por causa do
  preto maior (§1). Os eventos são os mesmos, na mesma ordem, 2 s depois; a Serpente passa de t=95 para t=97.
- **A arena da luta final (3 cabeças + enguia) é MAIS LIMPA que o Ato 2** (ele: *"manter o apelo visual mas sem poluir
  demais, até tirar algum efeito que tinha antes da chegada da luta"*). Ver §6.

## 1. A virada: o preto

Hoje (`GameScene.escurecerParaOCasco`, pedido dele de 29/08): 350 ms escurecendo, 420 ms de preto com
"O CASCO DO LEVIATÃ", 350 ms clareando (~1,1 s). O casco nasce pronto atrás do preto (`revealCasco(1, 60)`).

**Novo:** **500 ms escurecendo → 1.500 ms de preto cheio com o nome → 500 ms clareando** (~2,5 s). Atrás do preto
cheio, num só quadro, o cenário novo inteiro liga (§2–§5). Nada dele aparece em fade fora do preto.

**Nenhum dano às cegas:**
1. No preto cheio, todo tiro inimigo na tela some.
2. A nave fica intocável do início do escurecer até o fim do clarear.
3. Nada nasce antes da tela clara: **todo evento do `STAGE_3` de t=55 em diante anda +2 s** (55→57 … 95→97). Conferir
   a conta do clarear contra o 1º spawn (a nota da onda de drones de `escurecerParaOCasco`) e reescrever os comentários
   de horário que citam os números antigos.

**Prova:** a sonda filma a virada e afirma: 0 inimigos nascidos e 0 danos entre o início do escurecer e o fim do
clarear; o 1º inimigo do Ato 2 nasce depois do clarear.

## 2. O céu

- **A pintura do Ato 1 (`paintBgF3`) FICA até o fim da fase.** Em t=49 a bruma e os véus abrem como hoje (a batida da
  "liberdade" continua); o `setNebulaDensity` deixa de apagar a pintura.
- **No preto ela troca para a VERSÃO DA ARENA:** a mesma imagem, mais escura e com menos contraste ("afastada" pela
  luz, nunca pelo tamanho). Assada em 384×216, escala 1 (a lei [[fundos-pintados-resolucao-nativa]]). O nível é
  escolhido por ele na folha da rodada 1, entre 3, medido contra a enguia, as 3 cabeças, o fogo dos canos e os avisos.
- **Nuvens à deriva:** 2 camadas finas RECORTADAS da própria pintura (trechos de nuvem, sem as rochas), semitransparentes,
  1 px = 1 px, com vento próprio lento (continuam andando quando o mundo para na luta). Ficam NA FRENTE da batalha
  (§4) e atrás do casco (a ordem inteira em §7).
- **Saem depois do preto:** as `nebula3` ampliadas (as camadas −96 do fallback e −89; a −89 é a dos blocos das fotos) e
  o planeta (`mundo`, −97; ficaria escondido atrás da pintura de qualquer forma). Os véus de primeiro plano (60) já
  apagam com a nuvem.
- **Fica no Ato 1:** a `nebula3` −89 continua lá (aprovada naquele trecho). Dívida anotada: trocá-la também, se ele
  quiser, num item à parte.
- **A camada de brilho dos destroços que escurece as nuvens** (anotado em 03/11): conferir com as nuvens novas e
  corrigir na rodada 1.

## 3. O casco vivo

A arte do casco é final e NÃO muda. Tudo entra POR CIMA dela, preso às placas, rolando junto no Ato 2. Efeito de
cenário assado em pixel com a paleta do vizinho ([[efeito-de-cena-assado-em-pixel]]); a biblioteca é o pixelfx
(`_referencias/pixelfx`, a mesma família aprovada na enguia).

- **Pulso biomecânico:** os traços cor de cobre do casco viram uma máscara tirada do próprio desenho; uma onda de luz
  âmbar corre por eles devagar (poucos segundos por onda) e apaga limpa. É a luz forte do casco (é energia). Sem
  vermelho.
- **Vapor:** jatos curtos e intermitentes nas grades e juntas, cada ponto no seu ritmo; cinza-escuro na paleta do
  casco, nunca branco-azulado; longe da fissura (os gêiseres verdes são da luta).
- **Faíscas:** estalos rápidos (`spark-arc`/`electrified`/`hit-spark` do pixelfx, reduzidos) só nas bordas do rombo e
  nas rachaduras perto dele. Só existem com o rombo (a arena).
- **Aro de luz:** um fio fino no contorno de CIMA do casco (o lado da nebulosa), tirado do desenho. Se ler chapado, luz
  por mapa de normais ([[jogo-de-luz-por-normais]]).
- **Fora:** tecido vivo/carne exposta (é o Leviatã forte; carne lê como o biomecânico do final).

## 4. A batalha ao fundo (os restos da frota)

Ficção: o jogador é "a última nave de uma frota destruída" (GDD). Ao fundo, os últimos aliados caem.

- **Onde:** atrás das nuvens à deriva (elas passam na frente e afastam a batalha). Pequeno, escuro, lento
  ([[camada-de-tras-diminui]]).
- **Clarões:** explosões distantes, brilho âmbar/laranja que acende e some.
- **Traços de laser:** finos (1 px), curtos, longe.
- **Silhuetas:** 1–3 naves humanas de perfil (8–14 px, desenhadas em pixel, [[pecas-minusculas-em-pixel]]) perseguidas
  por silhuetas de criaturas; numa passagem de 4–6 s uma é abatida (clarão + queda). Conceitos (3–4) numa folha antes
  ([[gerar-arte-direto-e-mostrar]]).
- **Nada no fundo usa vermelho (o aviso) nem branco-azulado (a faixa livre dos canos).**

## 5. A luz da nebulosa

- **Perfil novo da Atmosfera `faseF3Casco`**, ligado no preto (corte seco): névoa e correção puxando o roxo da pintura,
  halo puxando o laranja dela (cores amostradas da versão da arena, a mesma conta de `PERFIS_FASE`). A cena inteira,
  enguia incluída, lê como iluminada por aquele céu, SEM mexer no desenho dela.
- **`faseF3Arena`:** o mesmo, mais limpo (menos poeira e grão), interpolado no silêncio antes da Serpente (§6).
- **Um aro desenhado NA enguia não entra aqui** (ela é aprovada; seria um pedido à parte).

## 6. Dois regimes: o Ato 2 e a arena

| | Ato 2 (do preto ao alerta da Serpente) | Arena (do silêncio, t≈91, até o fim) |
|---|---|---|
| Pintura + nuvens à deriva | sim | sim |
| Atmosfera | `faseF3Casco` | `faseF3Arena` (mais limpa) |
| Pulso | sim | mais lento e mais fraco |
| Vapor | vários pontos | poucos pontos, longe dela (ou nenhum: decidir na folha) |
| Faíscas | — | só no rombo, raras |
| Aro do casco | sim | sim |
| Batalha: clarões | raros (1 a cada 6–10 s) | raros |
| Batalha: traços de laser | não | não |
| Batalha: silhuetas | não | só nas janelas calmas da luta |

- **A troca é suave e no silêncio** (o `terrain rate 0` antes do alerta): os jatos de vapor que acabam não recomeçam, o
  pulso desacelera, a Atmosfera interpola. Nada "desliga" na frente dele.
- **As janelas calmas** (só para as silhuetas) saem do roteiro das duas lutas, medidas pela sonda: ela sob o casco ou
  mergulhando, longe dos canos, do Eco, do gás, do raio, da chuva e de todo aviso. Fora delas, nenhuma passagem.

## 7. As profundidades

Do fundo para a frente: a pintura (−96) → a batalha → as nuvens à deriva → o casco e as peças da proa → o casco vivo
(−74,5) + os efeitos do casco (§3) logo acima dele → a luta (a nave 1, a enguia 0,9/0,95/36, o lábio 35) → a
Atmosfera. Os números exatos entre −96 e −74,5 ficam no plano, sem empate com camada existente. Nada do cenário
novo passa na frente da nave nem da luta.

## 8. O caminho

**Construído no próprio jogo, atrás de uma chave** (`?cenario=novo`, desligada por padrão até a aprovação), para a
folha mostrar a luta de verdade (as 3 cabeças e a enguia) sobre o cenário novo, filmada pela sonda, sem tocar nelas.
Cada rodada = uma folha com GIF/vídeo na velocidade real, ANTES × DEPOIS lado a lado; ele aprova e vem a próxima
([[avaliar-skill-por-gif]]). Nada de editar `src/` durante uma filmagem ([[filmagem-vite-recarrega]]).

1. **O céu e a luz:** a versão da arena (3 níveis), as nuvens à deriva, as `nebula3` e o planeta fora, a Atmosfera
   `faseF3Casco`/`faseF3Arena`, o brilho dos destroços.
2. **O casco vivo:** pulso, vapor, faíscas, aro.
3. **A batalha:** a folha de conceitos das silhuetas → os clarões, traços e passagens; as janelas calmas medidas.
4. **A virada e a instalação:** o preto de 2,5 s, os +2 s do `STAGE_3`, as garantias; a chave sai (o novo vira o
   padrão).

**As provas antes do ok final:**
- a enguia idêntica (`test-enguia-porte` passa) e as 3 cabeças sem mudança de código;
- a sonda da virada (§1);
- a leitura medida em número: o contraste da enguia, das cabeças e dos avisos contra o céu novo;
- o desempenho: o cenário novo custa no máximo +1 ms por quadro na linha do jogo (p95);
- o tranco do `cascoVivo.copiar()` medido num navegador de verdade; se aparecer, resolvido junto.

## 9. As leis

[[correcao-rumo-dark-sci-fi]] · [[arena-chefao-so-fundo]] (só pintura e efeito, zero peça de cenário nova na luta) ·
[[fundos-pintados-resolucao-nativa]] · [[conferir-ampliado-antes-de-mostrar]] · [[partir-da-arte-aprovada]] ·
[[tratamento-de-imagem-obrigatorio]] · [[superficie-da-camada-do-jogo]]. Commit só quando ele pedir, só no nome dele;
vídeos, GIFs e `cru/` fora.
