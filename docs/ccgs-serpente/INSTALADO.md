# O CCGS instalado no projeto — TEMPORÁRIO, só para a Serpente da fase 3

> 30/10/2026. Ele: *"Precisamos rever o boss da fase 3 inteiro. Dos modelos, animações, skills etc.… eu quero usá-la
> para fazer isso no boss da fase 3, mas somente para ela. Depois de finalizarmos, voltamos ao desenvolvimento normal."*
> As escolhas dele: **instalar temporário** e a **equipe completa**. E: *"E você, que já sabe o projeto, monitore
> qualquer coisa que afete o jogo todo"* (a regra está no `CLAUDE.md`, na seção GUARDRAIL).

Origem: `C:\Users\Henrique\Documents\Projetos folder\Variados\04_Claude-Code-Game-Studios\repositorio-oficial`
(CCGS 1.2.0, 19/10/2026).

## O que foi copiado (remover tudo no fim)

| Caminho no projeto | O que é |
| --- | --- |
| `.claude/agents/` | os 49 agentes |
| `.claude/skills/` | os 74 comandos |
| `.claude/docs/` | os documentos de apoio e os modelos |
| `.claude/scripts/` | os scripts auxiliares dos comandos |
| `.claude/rules/` | as regras por pasta |
| `.claude/hooks/yaml-helper.sh` | só o leitor de configuração (os comandos o chamam) |
| `CLAUDE.md` | o do CCGS, adaptado para este projeto e para a Serpente (Phaser, as regras dele, o GUARDRAIL) |
| `project.yaml` | a configuração do CCGS, sem engine (rigor `minimal`) |
| `project.local.yaml` | `team.size: small`, a equipe completa |
| `design/` | `CLAUDE.md` e `registry/` do CCGS; o GDD da Serpente nasce aqui |
| `production/` | `session-state/active.md`, o ponto de partida; o que a equipe produzir |
| `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md` | o protocolo de colaboração, que o `CLAUDE.md` cita |

## O que NÃO foi copiado, de propósito

- **Os hooks** (o `settings.json` do CCGS não entrou). O `validate-commit` barraria os commits dele por regras do CCGS,
  e o `validate-read` recusa ler documentos de mais de 40 KB (o HANDOFF tem mais). Também ficaram de fora o
  `statusline.sh` e as permissões dele.
- **`src/CLAUDE.md`**: são as regras de código do Godot.
- **`docs/engine-reference/`**: as referências de Godot, Unity e Unreal. O jogo é Phaser.

O `.claude/settings.json` e o `.claude/settings.local.json` do projeto continuam os mesmos de antes.

## O git

Tudo o que foi copiado está no `.git/info/exclude` (o bloco "CCGS"). Fica fora dos commits, e o `.gitignore` do projeto
não foi tocado.

## Para remover (no fim)

1. Guardar o que a equipe produziu: `design/` (o brief e o GDD), `production/` e **`docs/architecture/`** (os esboços de
   arquitetura do `/team-combat`, criados em 30/10) → `docs/ccgs-serpente/` (o registro).
2. Apagar a lista acima: `.claude/agents`, `.claude/skills`, `.claude/docs`, `.claude/scripts`, `.claude/rules`,
   `.claude/hooks`, `CLAUDE.md`, `project.yaml`, `project.local.yaml`, `design/`, `production/` e
   `docs/COLLABORATIVE-DESIGN-PRINCIPLE.md`.
3. Tirar o bloco "CCGS" do `.git/info/exclude`.
4. Reabrir o Claude Code (os comandos e os agentes somem da lista).

## REMOVIDO (31/10/2026)

Ele parou a experiência depois do M1: *"Foram mais de 40 agentes e nenhum me perguntou quais seriam as skills"*; o M1
entregou o modelo da S1b de novo, com defeitos de acabamento que ele circulou (o vão embaixo dela no rombo, a emenda do
casco atravessando o buraco, ela atrás da camada do buraco). A escolha dele: *"Tirar e manter o que serviu"*.

- **A instalação saiu toda** (a lista acima) e o bloco "CCGS" do `.git/info/exclude`. O `.claude/` voltou a ter só
  `settings.json` e `settings.local.json`.
- **O registro** está em `registro/`: `design/` (o brief e o GDD aprovado), `production/` (o rascunho do designer e o
  `active.md`) e `architecture/` (os dois esboços).
- **O código do M1** está em `m1/`, restaurável:
  - `m1-mudancas.patch`: o diff dos 5 arquivos sobre o backup da S1b;
  - `m1-novos.tar`: os 84 arquivos novos, isto é, `src/entities/serpente/` (o cérebro, o corpo, os dados), os scripts
    e as 66 imagens da emergência e da toca H1.
- **A Serpente voltou à S1b** (o branch `backup/serpente-s1b`, commit 99bad1c), com o que serviu:
  - o **aviso de nave atingida** (`GameScene.damageShip` → `ship.setData('golpeEm')`);
  - o **teto de dano por golpe** (`golpeMax` em `numerosSerpente.ts`, aplicado no `damage()` da Serpente);
  - **as regras do GDD**, que valem para o desenho novo: o aviso mínimo antes de cada ameaça (0,59 s coluna /
    0,56 s faixa), a linguagem de cores do perigo (cinza inofensivo, âmbar não é você, branco é você), o respiro de
    0,8 s depois de um acerto na nave, o espaço de desvio à esquerda, e o vão da chuva sempre alcançável.

  O cérebro testável (as regras checadas sozinhas, sem Phaser) está no `m1-novos.tar` e volta quando servir às
  habilidades novas; hoje ele testava a investida, que saiu.
- As sondas da fase 3, da fusão e dos chefões passam depois da remoção.

