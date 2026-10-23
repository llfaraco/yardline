## Escopo

Descreva uma única tarefa objetiva.

## Agente responsável

- [ ] Codex — implementação
- [ ] Gemini — revisão somente leitura
- [ ] Manus — integração/publicação

## Arquivos alterados

Liste os arquivos e explique por que cada um é necessário.

## Design congelado

- [ ] Nenhum arquivo visual protegido foi alterado.
- [ ] Se houve autorização visual, a tarefa contém referência, viewport e evidência antes/depois.

## Integridade de dados

- [ ] Nenhum mock/fallback foi introduzido em runtime.
- [ ] Dados ausentes exibem `—` ou estado explícito.
- [ ] Fontes e proveniência permanecem identificáveis.

## Validação

- [ ] `git diff --check`
- [ ] `npm --prefix server test`
- [ ] Gemini revisou o diff sem editar arquivos.
- [ ] Manus aprovou a integração.

## Resultado da revisão Gemini

Status: `P0` / `P1` / `P2` / `P3` / `PASS`

Observações:
