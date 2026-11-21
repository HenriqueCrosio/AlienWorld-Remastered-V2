# Bloco F — os asteroides novos e a rocha do minerador

> 20–21/11. O 2º item do F (o START `plans/2026-11-15-bloco-f-START.md`): *"a rocha do elite minerador destoa da F2 e
> é grande demais"*. Ele ampliou o pedido: analisar primeiro os asteroides de hoje.

## 1. A análise (o que estava errado)

Ele: *"alguns maiores têm angulos mais retos nas laterais"*. Os três asteroides de hoje (26×26):
1. **as formas eram blocos** — o `asteroid-2` um cubo (laterais verticais, topo reto), o `asteroid` um bloco, o
   `asteroid-3` de base reta;
2. **desenhados como se apoiados num chão**: uma sombra em cunha embaixo, que gira junto no vácuo;
3. **os grandes eram a arte pequena AMPLIADA**: a escala `[0.7, 1.9]` levava os 26 px a 49, cada pixel virava bloco e
   o giro fazia degraus (a regra dos fundos pintados vale aqui: reduzir pode, aumentar nunca).
E a **rocha do minerador** (o geodo de 80×78, vista de frente, a cratera laranja) era de outra família.

## 2. As escolhas dele

- **Os asteroides** (PixelLab, com a paleta dos de hoje): os pequenos **28, 49, 61** (24×26), os médios **4, 17**
  (26×28, 27×25), o grande **5** (32×32) com o **tom ajustado** (os grandes vieram claros demais para o cinturão:
  cada pixel descido pela paleta dos de hoje, ordenada por luminância, até a média casar; o contorno não mexe).
  Recomendação dele: *"vou com a sua recomendação"*. → `asteroid`, `asteroid2` … `asteroid6` (o sorteio
  `pickVariant`), cada um recortado no conteúdo (a hitbox sai do quadro).
- **A escala**: `[0.85, 1]` — nunca acima de 1 (*"o tamanho pode medir para ficar bom"*).
- **A rocha do minerador**: ele quis a rachadura no topo **com um pouco do cristal âmbar** e duas variações — a
  **rachadura 2·a** e o **grande 1·âmbar a** (a cratera do grande 1, que ele circulou, cheia de cristal). *"apenas
  dois está bom"*. → `eliteRocha`, `eliteRocha2`.

## 3. O tamanho da rocha do minerador (medido)

Com a pedra de 32 px o drone (31×27) ficava MAIOR que ela — lia como carregando a pedra. A medida: a rocha com ~2× a
largura do drone, ~60 px (o geodo de 80 era grande demais). As duas escolhidas foram redesenhadas a 84×84 de canvas
(`create_image_pro` com a escolhida em `reference_images`: a mesma pedra, maior e com mais detalhe), o tom ajustado
como os grandes, recortadas: 62×63 e 62×58.

## 4. O encaixe do drone

`DroneMineracao.ENCAIXE` por textura: o centro do drone a partir do centro da rocha, sobre o CENTRO DO ÂMBAR de cada
arte (os pixels quentes), o drone um pouco à direita e acima (ele olha para a esquerda): `eliteRocha` {19, −27} (na
rachadura do topo), `eliteRocha2` {−2, −15} (na cratera). O de 05/10 (o geodo) era {8, −11}.

A receita do tom (para descer as rochas, se ele pedir): a paleta dos 3 asteroides antigos (62 cores) ordenada por
luminância; cada pixel da pedra que está nela anda `delta` posições (a média do candidato até a média dos antigos;
para escurecer mais, subtrair 1–2), o contorno (as 3 mais escuras) não anda, o âmbar (fora da paleta) não muda.

## 5. Em aberto (o veredito dele, START `plans/2026-11-21-bloco-f-veredito-START.md`)

- O tom das rochas do minerador no cinturão (podem pedir 1–2 degraus mais escuras).
- O campo menor: o maior asteroide de 49 px na tela para 32 — se faltar pedra grande, 1–2 de 40–48 px gerados com o
  grande 5 como estilo.
- O drone trabalhando no âmbar e a rocha quebrando no tamanho novo (a morte de rocha R2/R3 do `DESTROCOS`).
