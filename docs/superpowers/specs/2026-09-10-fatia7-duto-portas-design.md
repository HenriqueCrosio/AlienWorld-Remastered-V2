# SPEC — O DUTO VIRA DUTO: A PAREDE COLADA, AS TRÊS PORTAS, E A FASE DE 113s

**Data:** 2026-09-10 (2ª rodada) · **Branch:** `feat/fase4-visual` · **Fatia 7 · M1.5**

Aprovado pelo Henrique em 10/09/2026, depois do teste jogado da 1ª rodada.

⚠️ **Esta spec SUPERA parcialmente a `2026-09-10-fatia7-moldura-borda-letal-design.md`** — ver a
seção 6 para o que morreu lá.

---

## 0. OS TRÊS VEREDICTOS

1. **O fio foi aprovado.** *"O fio ficou interessante, isso subconscientemente avisa perigo."* O
   telégrafo fica como está.
2. **O duto não lê como duto.** *"Só que o duto precisa ser mais duto"*, com um desenho hachurado:
   parede cheia em cima e embaixo, um canal estreito no meio. E: *"dentro do duto precisa ter as
   portas que a nave precisa destruir para passar, senão fica apenas uma passagem estreita"*.
   Autorizou explicitamente alongar a fase.
3. **O fundo do chefão parecia ampliado.** Investigado — **não está**. Ver a seção 5.

---

## 1. POR QUE O DUTO NÃO LIA COMO DUTO — a medição

O roteiro pedia espessura 54 no duto. Medido em jogo, 180 amostras entre t=69 e t=78:

| | medido | pedido |
|---|---|---|
| parede do **chão** | 52,3px de média | 54 |
| parede do **teto** | **16,6px** de média (min 16) | 54 |
| **banda aberta** | **127px** de média | o vão é 84 |

⚠️ **A TRAVA NÃO ERA UM PISO DA PAREDE, ERA UM TETO DELA.** `superficieChao = max(GROUND_Y − esp,
vaoY + gap/2 + FOLGA)` só sabe AFASTAR a superfície do corredor. Quando o corredor sobe, o `min` do
teto vence a espessura e a parede do teto encolhe; a do chão engorda. O resultado é uma parede
assimétrica e **43px de espaço aberto que não é nem corredor nem parede** — e é esse espaço solto
que faz o trecho ler como "passagem estreita" em vez de duto.

**A causa não era a espessura ser pequena. Era a espessura mandar.**

---

## 2. A PAREDE COLA NO CORREDOR

Dentro do duto a superfície deixa de sair da espessura:

```
fora do duto   superficieChao = max(GROUND_Y − espessura, vaoY + gap/2 + FOLGA)
DENTRO do duto superficieChao =                           vaoY + gap/2 + FOLGA     ← exato
```

A banda aberta passa a ser **sempre `gap + 2×FOLGA`** e todo o resto é parede. Medido depois:
**100px exatos para um vão de 84**, com folga de 8 dos dois lados, nas três colunas amostradas.

⚠️ **A FOLGA NÃO MUDA DE VALOR.** Trocar `max` por `=` só APERTA a parede contra o corredor, nunca
dentro dele — a invariante que a sonda cobra (`folga >= 8`) continua exata. A fase não pode ficar
impossível por construção, pelo mesmo motivo de sempre.

### 2.1 O ENCHIMENTO — e por que ele é obrigatório

A peça da faixa tem 64px. Fora do duto `ESPESSURA_MAX` é 54 exatamente para ela sempre alcançar a
borda da tela; **dentro do duto a parede colada chega perto de 120px**, e a peça sozinha deixaria
uma tira de FUNDO aparecendo no topo e no rodapé — um buraco no meio de uma parede que acabou de
virar letal.

O enchimento é um retângulo por segmento, da borda da peça até a borda da tela. ⚠️ **A cor dele é
MEDIDA na última linha da própria peça, não escolhida.** Um literal escolhido hoje contra a arte
provisória vermelha ficaria errado no dia em que a arte final entrar, e ninguém lembraria de voltar
lá; medir a linha que ENCOSTA no enchimento faz a emenda sumir com qualquer arte, inclusive a que
ainda não existe.

### 2.2 A MESA SAI DO DUTO

Com a parede colada, a mesa nasceria com o topo 8px acima da superfície — uma protuberância
invisível contra a parede, que não somaria obstáculo mas somaria **8px de vão comido sem ninguém
ver de onde**. A spec de 06/09 já previa: *"C é o duto (parede cheia, sem mesa — quem fecha o
caminho são as portas)"*.

⚠️ O `corredorRate` do roteiro continua valendo no duto: quem lê o `gap` é a curva, e é ele que a
parede colada persegue. O que sai é só o SPAWN.

### 2.3 `duto` É UM CAMPO SÓ, e substitui `letal`

Estar no duto é **um** estado dramatúrgico com duas consequências (a parede cola, a parede morde).
Dois booleanos permitiriam a combinação inválida — parede colada que não morde — sem ganhar nada.
Continua valendo a lei da rodada anterior: **quem manda é o roteiro, nunca a espessura.**

---

## 3. AS TRÊS PORTAS

A comporta biomecânica que a spec de 06/09 (§C2) já desenhava, agora instalada. **Ela tapa o vão
inteiro; não tem como passar sem destruir.**

| porta | t | vão vigente | HP | peça |
|---|---|---|---|---|
| 1 | 72 | 84 | 6 | 64×112, sobra 14px em cima e embaixo |
| 2 | 82 | 76 | 8 | idem |
| 3 | 94 | 68 | 10 | idem |

⚠️ **ANCORADA PELO CENTRO DO VÃO** — é o único prop da fase assim, e tem de ser: um anteparo preso
a uma das bordas deixaria passagem pela outra, e porta que dá para contornar não é porta. Ela
pergunta a curva no MESMO x em que nasce (`GAME_WIDTH + 30`); perguntar em outro ponto a faria
nascer numa altura que não é a do corredor onde vai chegar.

⚠️ **O HP VIVE NO ROTEIRO, não na tabela de props.** A progressão 6 → 8 → 10 contra vãos 84 → 76 →
68 é o que dá começo, meio e fim ao duto — e é ela, não a duração, que faz o trecho ter forma.

**Falhar custa uma vida e ela passa.** Os 1400ms de i-frames do `damageShip` impedem que a mesma
porta cobre duas vezes, e a fase nunca trava. Zero código novo de colisão: `overlap(ship,
terrain.props)` e `overlap(weapons.bullets, terrain.props)` já existiam.

**O núcleo aceso** diz duas coisas que nenhum tutorial diria: *sou destrutível* (num duto onde toda
parede mata de encostar, o obstáculo abatível precisa se anunciar) e *mire aqui*.

---

## 4. A FASE VAI A 113s

O duto sai de 11s para 38s. Uma porta chega em quem voa em ~3,5s; três coladas viravam fila.

```
t=68   entra o duto (parede cola + morde, o fio acende, a pintura troca)
t=72   PORTA 1 (hp 6)          t=74  onda de drones
t=78   o vão aperta: 76        t=82  PORTA 2 (hp 8)      t=84  kamikazes
t=88   banner ESFÍNCTER FINAL  t=89  o vão aperta: 68    t=94  PORTA 3 (hp 10)
t=97   pico: batedor + drone + kamikaze
t=106  silêncio · a parede recua (54→16 em 4,75s, pronta em t≈110,75)
t=109  a câmara do núcleo · ALERTA
t=113  CHEFÃO
```

⚠️ **O PRIMEIRO PLANO SAI DE CENA AO ENTRAR NO DUTO**, pela mesma lei que já o tira no chefão. É
medível: a viga tem **84px de altura opaca** e o canal do duto tem **100px** — uma silhueta que
cobre 84% da passagem, num trecho em que encostar cobra uma vida. Dificuldade é não caber; não
enxergar onde cabe é roubo. Não volta depois: o que vem é o silêncio e o chefão, e o chefão a apaga
de novo.

---

## 5. O FUNDO DO CHEFÃO NÃO ESTÁ AMPLIADO — a investigação

Três medições independentes:

1. **O sprite está em escala 1**, 384×216 nativo (despejo de todos os objetos visíveis em t=84).
2. **O PNG não foi assado de uma fonte menor** — 2,2% de pixels iguais ao vizinho, a mesma faixa
   das outras três pinturas da F4 (1,5–3,3%) e da Fase 3 (3,0%). Um bake ampliado dá blocos
   uniformes e sobe muito acima disso.
3. **As nebulosas contribuem 0,00%** — ver abaixo.

**O que mudou foi a ABERTURA.** Com a borda do chefão em 16 em vez de 54, o jogador vê **184px da
pintura em vez de 108** — 70% a mais. O chefão, que antes era recortado pela parede, aparece
inteiro. Não é o fundo que cresceu; é a moldura que abriu, e foi ele quem pediu. ⚠️ Se ficar grande
demais, **o número é a espessura do chefão, não a pintura.**

### 5.1 Um erro meu de método, registrado porque a lição vale

A primeira medição das nebulosas deu **71% da tela mudando** ao escondê-las — e estava errada. Eu
pausei `physics.world`, mas o parallax rola pelo `update` da CENA: os 71% eram o mundo tendo rolado
entre as duas capturas. Com `scene.pause()` o número é **0,00%**.

⚠️ **Um diff entre dois quadros de um jogo que rola não mede o que se pediu, mede o tempo passando.**

### 5.2 O achado colateral

`nebula`, `nebula2`, `nebula3` e `planetBroken` continuam sendo criados e renderizados na Fase 4,
atrás de uma pintura opaca, contribuindo 0,00%. O comentário do `Parallax.buildInterior` afirma que
a `nebula3` *"saiu junto"*. **Ela não saiu.** É desperdício, não defeito — e não foi tocado nesta
rodada para não misturar limpeza com o que o teste jogado pediu.

---

## 6. O QUE MORREU DA SPEC ANTERIOR (mesma data, 1ª rodada)

- **`letal` como campo** → virou `duto`, que faz as duas coisas. A seção 3.4 de lá vale, com o nome
  trocado.
- **"A folga vai de 8 a 34px no duto"** (seção 3.2, item 2) → agora é **sempre 8**, porque a parede
  cola. A garantia é a mesma; o número mudou.
- **O perfil `t=79 → 16 + não letal`** → foi para **t=106**, com o duto crescendo.
- **Tudo o mais continua de pé:** a borda de margem até t=55, a mordida por medição e não por corpo
  físico, os 3px de perdão, o fio como telégrafo, e o cenário desempilhado.

---

## 7. O QUE ESTA SPEC NÃO FAZ

- **A arte da porta é PROVISÓRIA** (`f4-porta-prov.png`, assada pelo mesmo script da faixa e da
  mesa). A peça final `f4PortaC` + estado destruído continua na lista das minhas.
- **A parede do duto é uma cor chapada** onde o enchimento cobre. Ela lê como sólida, que é o que se
  queria, mas é lisa — a arte final da faixa é que resolve.
- **As 4 faixas continuam dele e sem aprovação.**
- **Os 906 objetos do PixelLab continuam sem garimpo.**
- **As nebulosas mortas continuam lá.**
