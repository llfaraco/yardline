# Yardline — Governança de agentes

Este repositório usa três papéis complementares. Nenhum agente deve duplicar o trabalho de outro.

## Papéis

### Manus — Team Leader, integrador e publicador

Manus define escopo, prioridade e critérios de aceite. Manus decide conflitos, revisa a proveniência dos dados, executa a suíte completa, integra branches, cria checkpoints e publica. Manus é o único agente autorizado a fazer merge em `main` e publicar WebDev.

### Codex — implementador

Codex implementa uma tarefa delimitada em uma branch própria. Deve receber arquivos-alvo, comportamento esperado, restrições e comando de validação. Codex pode editar código, testes e documentação necessários à tarefa, mas não deve ampliar escopo nem modificar o design congelado sem autorização explícita.

### Gemini — revisor

Gemini opera por padrão em modo somente leitura. Analisa diffs, testes, segurança, acessibilidade, proveniência e regressões. Deve classificar achados como `P0`, `P1`, `P2`, `P3` ou `PASS`. Gemini não deve editar o mesmo diff que revisou.

## Design congelado

O design atual desenvolvido pelo Codex está congelado. Sem uma tarefa explícita aprovada por Manus, é proibido alterar:

- `yardline-app/css/**`
- `yardline-app/index.html`
- `yardline-app/assets/**`
- `yardline-app/js/visual-shell.js`
- `yardline-app/js/player-dossier-presentation.js`
- `yardline-app/css/visual-shell.css`
- `yardline-app/css/player-profile.css`
- `yardline-app/css/player-dossier.css`

Uma auditoria visual pode apontar problemas, mas não pode aplicar correções automaticamente. Toda alteração visual autorizada deve conter antes/depois, viewport avaliado, arquivos afetados e justificativa.

## Regras de dados

É proibido fabricar liga, roster, jogador, semana, placar, projeção, histórico, notícia ou avatar. Quando a fonte oficial estiver ausente, usar `—`, estado indisponível ou estado stale explícito. Fixtures só podem existir em testes e devem ser claramente identificadas.

## Fluxo obrigatório

1. Manus abre ou descreve a tarefa com escopo fechado.
2. Codex implementa em `codex/<slug>`.
3. Gemini revisa somente o diff da branch e não edita.
4. Manus corrige ou solicita correção dos achados válidos.
5. A suíte `npm --prefix server test` e `git diff --check` devem passar.
6. Manus integra em `main` e, quando aplicável, publica WebDev.

Branches de agentes nunca devem fazer force-push, alterar histórico ou publicar diretamente.

## Política de tokens

Começar sempre pela menor operação que resolve o problema. Não pedir uma nova auditoria completa do repositório quando os arquivos e o diff já foram delimitados. Gemini deve receber o diff, os testes relevantes e os critérios de aceite, não o projeto inteiro. Codex deve editar somente os arquivos necessários. Manus deve fazer pesquisa ampla apenas quando a tarefa exigir fontes externas ou decisão arquitetural.
