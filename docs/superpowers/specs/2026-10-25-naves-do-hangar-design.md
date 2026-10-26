# As naves do hangar — design

> 25/10/2026, à noite. Substitui a parte da nave humana de `2026-10-25-escada-humana-conceito-design.md`, cujo topo
> dizia que a humana era a laranja "a" em duas pinturas. Ele jogou e mudou duas coisas:
> - *"aquele conceito da nave preta 'a' que tínhamos na folha, tem o melhor design. Podemos usar a preta 'a' como molde
>   para fazer a laranja"*;
> - *"na cena do hangar inicial ... uma delas vai ser a escolha da nave preta e laranja, o outro lado fica para a
>   escolha da nossa nave principal, que era a T1 da nave humana antiga ... pintar uma (com uma cor diferente das
>   outras, você decide. Obs: dica, ela é inspirada na x-wing fighter)"*.
> - A imagem nova do hangar fica com ele: *"a nova imagem do hangar eu vou fazer"*.
>
> Folha: `folhas/2026-10-25/hangar/hangar.html`.

## 1. O que é

A humana é escolhida no hangar entre **dois modelos, com duas pinturas cada**:

| escolha | textura | animação | de onde sai |
|---|---|---|---|
| `a-laranja` | `naveHumana` | `nave-humana-thrust` | a preta "a" (`preta-48x32-21-00`) repintada em cobre |
| `a-preta` | `naveHumanaPreta` | `nave-humana-preta-thrust` | a preta "a", com o grafite clareado 1,5× |
| `jato-laranja` | `shipJato` | `ship-jato-thrust` | o jato (a T1 antiga), como está |
| `jato-osso` | `naveJatoOsso` | `nave-jato-osso-thrust` | o jato repintado: osso com faixas vermelhas (o X-wing) |

Cada uma tem a variante `-azul` dos Propulsores. **Só o visual muda**: a hitbox (21×9), a arma e as cartas são as
mesmas. A escolha é de identidade, não de build, e não cria nada para balancear. A manta (alien) não muda.

## 2. A arte

- **A "a"** (`scripts/_naves/_nave-molde-preta.mjs`) é a preta "a" pixel por pixel, num quadro 44×26 (DX −2, DY −3).
  A chama pintada sai e volta à mão, em 8 quadros de 3 linhas (o bocal da preta é menor que o da laranja).
  - **A laranja:** cada tom de grafite ganha o tom de cobre da laranja "a" na mesma posição da escala (por quantil). A
    cabine volta ao ciano e as luzes da quilha viram as amarelas da laranja "a". O nariz de aço e o bocal continuam
    cinza.
  - **A preta:** o grafite multiplicado por S na própria escala, com o âmbar e as luzes intactos.
- **O jato de osso** (`scripts/_naves/_pintar-jato.mjs`) é uma troca de paleta, porque o jato bate as asas e não dá
  para pintar por posição.
  - Ficam intactos: o contorno, a chama à mão, as luzes amarelas que piscam, os cinzas e a cabine.
  - O cobre vai para a escala de osso; a família vermelha (a faixa do nariz e as bordas das pontas das asas) vai para a
    escala de vermelho.
  - As outras pinturas testadas, aço e oliva, ficam no script.

## 3. O contraste (no jogo, com a Atmosfera)

| | F1 | F2 | F3 | F3 alto | F4 |
|---|---|---|---|---|---|
| a-laranja | 2,05 | 1,99 | 1,63 | 2,67 | 2,42 |
| a-preta (S 1,5) | 2,13 | 1,71 | 1,62 | 2,15 | 2,38 |
| jato-laranja | 2,63 | 2,5 | 2,05 | 2,25 | 3,33 |
| jato-osso | 3,21 | 2,82 | 2,4 | 2,3 | 2,78 |

- S 1,5 é a preta mais escura que passa de 1,5× em todo lugar (com 1,3, a F3 dá 1,46×).
- A "a" laranja nova lê menos que a da tarde (1,86× na F3), porque o molde tem mais área escura.
- **A reparar jogando:** o osso perto dos anéis de osso da F4.

## 4. O código

- **`src/ships.ts`:**
  - os tipos `Modelo` (`'a' | 'jato'`) e `Pintura` (`'laranja' | 'preta' | 'osso'`);
  - a lista `ESCOLHAS` (a ordem do [H]; a 1ª é a de quem não escolheu);
  - `naveEscolhida(registry)` e `escolherNave(registry, escolha)`, que gravam `modeloNave` e `pinturaNave`. Sem
    `modeloNave`, vale a "a";
  - `visualDaNave(id, escolha)`.
- **A cena do hangar dele** só chama `escolherNave`.
- **Toda cena que mostra a nave do jogador** passa por `visualDaNave`:
  - a fase e a final (já passavam);
  - a chegada e a troca na Aurora, na Doca e na F3;
  - o painel de escolha (`ShipPanel`).
- **Dev:**
  - [H] no menu passa pelas quatro escolhas;
  - o `?sandbox` tem o seletor `humana` (as montagens salvas com a `pintura` da tarde viram `a-<pintura>`).
- **Teste:** `scripts/_naves/_testar-nave-unica.mjs`.

## 5. Em aberto (dele)

- Se o lado do jato tem as duas pinturas, ou só a nova (é tirar uma linha de `ESCOLHAS`).
- A cor do jato: osso, aço ou oliva.
- A aprovação jogando. Depois dela, a arte da tarde (a laranja "a" e a preta tirada dela) e a da escada vão para
  `assets/raw/naves-humana-2026-10/`.
