# Backup da Serpente — a forma atual (30/10/2026)

Ele (30/10, antes da revisão inteira com o CCGS): *"Livre para reestruturar, mas mantenha a forma atual como backup"*.

Isto guarda a luta da Serpente **como estava no disco** em 30/10: a fusão nova (as três mordidas), a S1, a S1b e as
correções da revisão de 29/10 à noite. Nada disso está commitado; a base é o commit `14a6bcc`.

| Arquivo | O que é |
| --- | --- |
| `versionados.patch` | o diff (`git diff --binary 14a6bcc`) dos arquivos versionados de `src/`, `scripts/` e do `docs/DESTROCOS.md` |
| `novos.tar` | os 203 arquivos novos da Serpente: o código (`cascoVivo`, `gestoSerpente`, `numerosSerpente`, `serpenteFusao`), os sprites `serpente-*` e os scripts `_serpente/`, `test-serpente`, as sondas da fusão |
| `novos.txt` | a lista dos arquivos do `novos.tar` |

O que está fora: as folhas (`docs/superpowers/folhas/…`, que ficam onde estão) e o `docs/HANDOFF.md`.

## Para voltar a esta forma

A partir de um checkout limpo do `14a6bcc`, ou de qualquer estado em que os arquivos da Serpente tenham sido refeitos:

```bash
git checkout 14a6bcc -- src scripts docs/DESTROCOS.md    # volta os versionados ao commit-base
git apply docs/ccgs-serpente/backup-2026-10-30/versionados.patch
tar -xf docs/ccgs-serpente/backup-2026-10-30/novos.tar     # na raiz do projeto
npx tsc --noEmit && node scripts/test-serpente.mjs && node scripts/test-morte.mjs
```

⚠️ O primeiro comando apaga as mudanças que estiverem no disco nesses caminhos. Rodar só com ele de acordo.

Conferido em 30/10: `git apply --check -R versionados.patch` passa contra o disco daquele momento.
