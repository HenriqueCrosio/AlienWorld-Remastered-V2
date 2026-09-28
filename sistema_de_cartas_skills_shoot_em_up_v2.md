# Sistema de Cartas de Skills — Shoot'em Up

## 1. Visão geral

O sistema de skills foi desenhado para um **shoot'em up horizontal 2D em pixel art**, com fases rápidas, combate intenso e foco em movimentação, esquiva e destruição de inimigos.

O objetivo não é criar uma árvore de habilidades complexa.

O jogador deve:

1. Jogar a fase normalmente.
2. Receber algumas oportunidades de escolher uma carta.
3. Escolher rapidamente entre opções claras.
4. Perceber imediatamente o efeito da escolha.
5. Opcionalmente montar uma build através de combinações.
6. Chegar ao Boss com uma nave mais poderosa.
7. Jogar novamente para experimentar outras escolhas.

> **Princípio:** poucas cartas, efeitos diretos e escolhas que mudam a sensação da nave.

---

# 2. Filosofia do sistema

O jogo terá aproximadamente **20–25 cartas no total**.

Não existe necessidade de uma árvore visual tradicional.

O sistema funciona como um conjunto de cartas que podem aparecer durante a run.

O jogador pode:

- seguir uma build;
- misturar cartas;
- pegar apenas melhorias diretas;
- priorizar sobrevivência;
- priorizar dano;
- experimentar combinações.

Não existe uma escolha "correta".

A intenção é que o jogador pense:

> "Dessa vez vou tentar outra combinação."

E queira iniciar outra run.

---

# 3. Estrutura da run

A estrutura das fases é:

```text
FASE 1
   │
   └── BOSS
        │
        ▼
FASE 2
   │
   └── BOSS
        │
        ▼
FASE 3
   │
   ├── MINI BOSS
   │
   └── BOSS
        │
        ▼
FASE 4
   │
   ├── MINI BOSS
   │
   └── BOSS FINAL
```

As cartas aparecem durante as fases e em recompensas especiais de bosses.

A quantidade exata de escolhas por fase pode ser ajustada durante o balanceamento.

A recomendação inicial é:

- 1–2 escolhas na Fase 1;
- 1–2 escolhas na Fase 2;
- 1–2 escolhas na Fase 3;
- 1–2 escolhas na Fase 4;
- recompensas especiais nos bosses.

O objetivo é terminar uma run com aproximadamente **6–10 cartas escolhidas**, dependendo do ritmo da partida.

---

# 4. Como funciona uma escolha

Quando uma recompensa aparece, o jogador recebe **3 cartas**.

```text
┌──────────────────┐
│   🔫 TIRO DUPLO  │
│                  │
│ Dispara 2        │
│ projéteis.       │
│                  │
│    ESCOLHER      │
└──────────────────┘

┌──────────────────┐
│  💥 EXPLOSIVO    │
│                  │
│ O projétil       │
│ explode ao       │
│ atingir.         │
│                  │
│    ESCOLHER      │
└──────────────────┘

┌──────────────────┐
│  🛡️ ESCUDO +     │
│                  │
│ +20% capacidade  │
│ do escudo.       │
│                  │
│    ESCOLHER      │
└──────────────────┘
```

O jogador escolhe **1**.

As outras duas cartas desaparecem.

A nave volta imediatamente para o combate.

---

# 5. Regras de design das cartas

As cartas devem seguir algumas regras simples.

## Regra 1 — Uma ideia por carta

Uma carta deve possuir um efeito fácil de entender.

Bom:

> **TIRO DUPLO**  
> Dispara 2 projéteis.

Ruim:

> Aumenta dano, velocidade, crítico e chance de causar explosão dependendo da quantidade de inimigos.

---

## Regra 2 — O efeito precisa ser percebido

Sempre que possível, o jogador deve perceber a mudança visualmente.

Exemplos:

- mais projéteis;
- explosões maiores;
- projéteis maiores;
- maior cadência;
- efeito de fogo;
- efeito elétrico;
- escudo maior;
- nave mais rápida.

---

## Regra 3 — Poucos números

Evitar transformar cada carta em uma lista de atributos.

Preferir:

> **TIRO TRIPLO**  
> Dispara 3 projéteis.

Em vez de:

> +13% dano, +7% cadência e +4% velocidade.

---

## Regra 4 — As cartas podem combinar

As combinações devem acontecer naturalmente.

Exemplo:

```text
TIRO DUPLO
     +
TIRO EXPLOSIVO
     +
PERFURAÇÃO
```

Resultado:

> dois projéteis que atravessam inimigos e explodem.

Não é necessário que exista uma carta específica para essa combinação.

---

# 6. Categorias

As 20–25 cartas serão divididas em apenas **4 categorias**.

| Categoria | Função |
|---|---|
| 🔫 Armamento | Modifica o ataque |
| 💥 Efeito | Adiciona propriedades aos ataques |
| 🛡️ Defesa | Aumenta sobrevivência |
| ⚡ Movimento | Pequenas melhorias de movimentação |

A categoria **Movimento** deve ser pequena.

O gameplay não precisa de teleporte, árvores de dash ou sistemas avançados de mobilidade.

---

# 7. Chaves / IDs

Cada carta possui uma chave única.

Formato:

```text
[CATEGORIA]_[NÚMERO]
```

Exemplos:

```text
WPN_001
WPN_002
EFF_001
DEF_001
MOV_001
```

A chave existe principalmente para implementação e não precisa aparecer para o jogador.

---

# 8. Raridades

O sistema terá **4 raridades**.

| Raridade | Função |
|---|---|
| Comum | Melhorias básicas |
| Incomum | Melhorias mais fortes |
| Rara | Efeitos marcantes |
| Épica | Combinações ou efeitos muito fortes |

Não é necessário utilizar uma raridade Lendária neste momento.

Com apenas 20–25 cartas, quatro níveis são suficientes.

---

## 8.1 Comum

Cartas simples.

Exemplos:

- Tiro Duplo;
- +20% Escudo;
- +10% velocidade;
- +10% cadência.

---

## 8.2 Incomum

Cartas que começam a modificar o comportamento do ataque.

Exemplos:

- Tiro Triplo;
- Perfuração;
- Explosivo;
- Dash melhorado.

---

## 8.3 Rara

Cartas fortes ou que criam combinações.

Exemplos:

- Tiro Quádruplo;
- Explosão Maior;
- Incendiário;
- Escudo Reativo.

---

## 8.4 Épica

Cartas que podem transformar uma build.

Exemplos:

- Combustão;
- Reação em Cadeia;
- Super Tiro;
- Overdrive.

---

# 9. Lista inicial de 25 cartas

Abaixo está uma proposta de conjunto fechado para o primeiro protótipo.

---

# 🔫 ARMAMENTO

## WPN_001 — Tiro Duplo

**Raridade:** Comum

> Dispara 2 projéteis em vez de 1.

**Função:** primeira melhoria ofensiva.

---

## WPN_002 — Tiro Triplo

**Raridade:** Incomum

> Dispara 3 projéteis.

**Função:** aumenta cobertura frontal.

---

## WPN_003 — Tiro Quádruplo

**Raridade:** Rara

> Dispara 4 projéteis.

**Função:** grande aumento de cobertura.

---

## WPN_004 — Cadência

**Raridade:** Comum

> Aumenta a velocidade dos disparos.

**Função:** aumenta DPS sem modificar o projétil.

---

## WPN_005 — Cadência Máxima

**Raridade:** Rara

> Aumenta significativamente a velocidade dos disparos.

**Função:** criar builds focadas em volume de fogo.

---

## WPN_006 — Tiro Concentrado

**Raridade:** Incomum

> Reduz a quantidade de projéteis, mas aumenta o dano do disparo principal.

**Função:** alternativa ao estilo de múltiplos projéteis.

---

## WPN_007 — Tiro Perfurante

**Raridade:** Incomum

> Os projéteis atravessam inimigos.

**Função:** excelente contra grupos alinhados.

---

## WPN_008 — Tiro Pesado

**Raridade:** Rara

> Os projéteis causam mais dano, mas possuem menor velocidade.

**Função:** opção de alto dano.

---

# 💥 EFEITOS DE ATAQUE

## EFF_001 — Tiro Explosivo

**Raridade:** Incomum

> O projétil explode ao atingir um inimigo.

**Função:** dano em área.

---

## EFF_002 — Explosão Maior

**Raridade:** Rara

> Aumenta o tamanho das explosões.

**Função:** melhora a cobertura de área.

---

## EFF_003 — Fragmentação

**Raridade:** Rara

> Explosões lançam pequenos projéteis em várias direções.

**Função:** transformar explosões em ataques secundários.

---

## EFF_004 — Incendiário

**Raridade:** Incomum

> Os projéteis têm chance de incendiar inimigos.

**Função:** dano contínuo.

---

## EFF_005 — Fogo Intenso

**Raridade:** Rara

> Inimigos incendiados sofrem mais dano.

**Requisito:** Incendiário.

**Função:** primeira sinergia de fogo.

---

## EFF_006 — Combustão

**Raridade:** Épica

> Inimigos incendiados explodem ao morrer.

**Requisito:** Incendiário.

**Função:** transforma fogo em dano de área.

---

## EFF_007 — Reação em Cadeia

**Raridade:** Épica

> Explosões podem atingir e incendiar inimigos próximos.

**Requisito:** Incendiário + Combustão.

**Função:** criar uma build de fogo/explosão.

---

## EFF_008 — Crítico

**Raridade:** Incomum

> Chance de causar dano dobrado.

**Função:** aumentar dano sem alterar visualmente os projéteis.

---

## EFF_009 — Crítico Pesado

**Raridade:** Rara

> Ataques críticos causam dano adicional.

**Requisito:** Crítico.

**Função:** criar uma pequena build de crítico.

---

# 🛡️ DEFESA

## DEF_001 — Escudo Reforçado

**Raridade:** Comum

> Aumenta a capacidade do escudo.

**Função:** sobrevivência direta.

---

## DEF_002 — Recarga Rápida

**Raridade:** Incomum

> O escudo começa a recarregar mais rapidamente.

**Função:** reduzir o tempo vulnerável.

---

## DEF_003 — Blindagem

**Raridade:** Rara

> Aumenta a quantidade de dano que a nave pode suportar.

**Função:** sobrevivência.

---

## DEF_004 — Escudo Reativo

**Raridade:** Rara

> Quando o escudo é destruído, libera uma pequena explosão ao redor da nave.

**Função:** transformar defesa em ataque.

---

# ⚡ MOVIMENTO

Movimento deve permanecer extremamente simples.

Não criar uma árvore de mobilidade.

---

## MOV_001 — Propulsores

**Raridade:** Comum

> Aumenta a velocidade máxima da nave.

---

## MOV_002 — Controle de Voo

**Raridade:** Incomum

> A nave acelera e desacelera mais rapidamente.

---

## MOV_003 — Dash

**Raridade:** Rara

> Permite realizar um pequeno avanço rápido com cooldown.

---

## MOV_004 — Dash Rápido

**Raridade:** Épica

> Reduz o cooldown do Dash.

**Requisito:** Dash.

---

# 10. Total de cartas

```text
ARMAMENTO       8
EFEITOS         9
DEFESA          4
MOVIMENTO       4
-------------------
TOTAL          25
```

Esse deve ser o **limite inicial do sistema**.

Não adicionar mais cartas até testar as 25.

---

# 11. Builds possíveis

As builds não precisam ser declaradas pelo jogo.

Elas surgem das escolhas.

## Build 1 — Metralhadora

```text
Tiro Duplo
    ↓
Tiro Triplo
    ↓
Cadência
    ↓
Cadência Máxima
```

Resultado:

> Muitos projéteis e alta cadência.

---

## Build 2 — Artilharia

```text
Tiro Concentrado
       ↓
Tiro Pesado
       ↓
Crítico
       ↓
Crítico Pesado
```

Resultado:

> Poucos disparos, mas cada disparo é muito poderoso.

---

## Build 3 — Explosiva

```text
Tiro Explosivo
       ↓
Explosão Maior
       ↓
Fragmentação
```

Resultado:

> Grande dano em grupos.

---

## Build 4 — Fogo

```text
Incendiário
     ↓
Fogo Intenso
     ↓
Combustão
     ↓
Reação em Cadeia
```

Resultado:

> Inimigos queimam, explodem e podem iniciar novas explosões.

---

## Build 5 — Híbrida

Nada impede o jogador de fazer:

```text
Tiro Triplo
    +
Tiro Perfurante
    +
Tiro Explosivo
    +
Escudo Reforçado
    +
Propulsores
```

Essa também é uma build válida.

O sistema não deve obrigar o jogador a seguir um arquétipo.

---

# 12. Sinergias

As sinergias devem ser simples.

Não existe necessidade de uma árvore de talentos.

Uma carta pode simplesmente exigir que outra carta já tenha sido escolhida.

Exemplo:

```text
Incendiário
     ↓
Fogo Intenso
     ↓
Combustão
     ↓
Reação em Cadeia
```

Isso cria uma progressão perceptível sem criar um sistema complexo.

---

# 13. Regras para cartas repetidas

Algumas cartas podem aparecer mais de uma vez.

Quando isso acontecer, o efeito pode acumular.

Exemplo:

### Cadência

Primeira escolha:

> +15% cadência.

Segunda escolha:

> +15% cadência.

Terceira escolha:

> +15% cadência.

Porém, cada carta deve possuir um limite.

Exemplo:

```text
Max Stack: 3
```

Cartas muito fortes devem ser únicas.

```text
Max Stack: 1
```

---

# 14. Cartas incompatíveis

Algumas cartas podem ser incompatíveis entre si.

Exemplo:

**Tiro Concentrado**

e

**Tiro Triplo**

Podem coexistir se o jogo suportar isso, mas a recomendação inicial é evitar combinações que causem comportamento confuso.

Se uma carta modificar diretamente a mesma propriedade de outra, o sistema deve definir claramente a regra.

Exemplo:

```text
Tiro Triplo
+
Tiro Quádruplo
```

Pode resultar em:

> 4 projéteis.

Em vez de:

> 7 projéteis.

A regra deve ser simples e previsível.

---

# 15. Recompensas dos bosses

Os bosses devem ser momentos importantes de progressão.

## Boss Fase 1

Oferece:

> 3 cartas, com pelo menos 1 opção Incomum ou Rara.

Objetivo:

> começar a definir a build.

---

## Boss Fase 2

Oferece:

> 3 cartas, com pelo menos 1 opção Rara.

Objetivo:

> fortalecer a direção escolhida.

---

## Mini Boss Fase 3

Oferece:

> 3 cartas de efeito/sinergia.

Objetivo:

> melhorar a build existente.

---

## Boss Fase 3

Oferece:

> 3 cartas, incluindo possibilidade de Épica.

Objetivo:

> grande salto de poder.

---

## Mini Boss Fase 4

Oferece:

> 3 cartas fortes relacionadas à build atual ou opções gerais.

---

## Boss Final

O objetivo é testar a build construída.

Não é necessário criar um sistema de recompensa complexo.

---

# 16. Exemplo de uma run

## Começo

Carta:

> **Tiro Duplo**

A nave passa a disparar dois projéteis.

---

## Próxima escolha

```text
Tiro Triplo
Escudo Reforçado
Propulsores
```

O jogador escolhe:

> Tiro Triplo.

Agora:

> 3 projéteis.

---

## Boss Fase 1

```text
Tiro Explosivo
Cadência
Blindagem
```

O jogador escolhe:

> Tiro Explosivo.

Agora possui:

```text
Tiro Triplo
+
Explosivo
```

---

## Fase 2

Surge:

```text
Explosão Maior
Tiro Perfurante
Crítico
```

Escolhe:

> Explosão Maior.

A build começa a ficar claramente focada em área.

---

## Boss Fase 2

Surge:

```text
Fragmentação
Tiro Pesado
Escudo Reativo
```

Escolhe:

> Fragmentação.

Agora o jogador tem:

```text
TRIPLO
  +
EXPLOSIVO
  +
EXPLOSÃO MAIOR
  +
FRAGMENTAÇÃO
```

A nave já está muito diferente da nave inicial.

---

# 17. O jogador não precisa montar uma build

Essa é uma característica importante.

Um jogador pode simplesmente pegar:

```text
Tiro Duplo
Escudo
Propulsores
Tiro Perfurante
Blindagem
Cadência
```

E terminar a fase.

Outro jogador pode tentar:

```text
Incendiário
Fogo Intenso
Combustão
Reação em Cadeia
Explosivo
Explosão Maior
```

Os dois estilos são válidos.

---

# 18. O que não faz parte do sistema

Para manter o projeto pequeno, o sistema não terá inicialmente:

- árvore visual de habilidades;
- teleport;
- árvores complexas de dash;
- drones orbitando a nave;
- equipamentos;
- inventário;
- crafting;
- moedas específicas para upgrades;
- dezenas de atributos;
- sistema de classes;
- dezenas de pré-requisitos;
- sistema de XP separado para skills;
- raridade Lendária;
- habilidades com múltiplos efeitos complexos.

O jogador deve olhar para uma carta e entender imediatamente o que ela faz.

---

# 19. Interface da carta

A carta deve mostrar somente:

```text
┌─────────────────────────┐
│                         │
│       🔫               │
│                         │
│      TIRO DUPLO         │
│                         │
│  Dispara 2 projéteis.   │
│                         │
│      COMUM              │
│                         │
└─────────────────────────┘
```

Para cartas com requisito:

```text
┌─────────────────────────┐
│         🔥              │
│                         │
│       COMBUSTÃO         │
│                         │
│ Inimigos incendiados    │
│ explodem ao morrer.     │
│                         │
│        ÉPICA            │
│                         │
└─────────────────────────┘
```

O requisito pode ser mostrado de forma pequena:

> Requer: Incendiário

---

# 20. Objetivo de balanceamento

O jogador deve sentir uma progressão aproximada:

```text
INÍCIO
│
│  Nave básica
│
▼
PRIMEIRA ESCOLHA
│
│  Pequena melhoria
│
▼
SEGUNDA ESCOLHA
│
│  Começa a aparecer uma direção
│
▼
BOSS 1
│
│  Grande melhoria
│
▼
FASE 2
│
│  Build começa a aparecer
│
▼
BOSS 2
│
│  Build fica forte
│
▼
FASE 3
│
│  Sinergias
│
▼
FASE 4
│
│  Build no auge
│
▼
BOSS FINAL
```

---

# 21. Princípio final

O sistema deve ser **simples de implementar, simples de explicar e divertido de experimentar**.

A complexidade deve surgir das combinações, não da quantidade de regras.

```text
25 CARTAS
    ↓
3 OPÇÕES
    ↓
1 ESCOLHA
    ↓
COMBINAÇÕES
    ↓
BUILD
    ↓
BOSS
    ↓
NOVA RUN
```

O jogador não precisa dominar o sistema.

Ele precisa apenas pensar:

> **"Essa carta parece boa. Vou testar."**

E, depois da run:

> **"Agora quero tentar aquela outra."**
