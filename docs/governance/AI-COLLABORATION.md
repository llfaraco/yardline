# Política de colaboração de IA — Yardline

## Objetivo

Reduzir consumo de tokens, evitar edição concorrente e preservar integralmente o design atual enquanto Manus, Codex e Gemini trabalham no mesmo repositório.

## Matriz de responsabilidade

| Atividade | Manus | Codex | Gemini |
|---|---|---|---|
| Prioridade e escopo | Responsável | Consultado | Consultado |
| Implementação local | Aprova | Responsável | Não executa |
| Revisão do diff | Responsável final | Pode explicar | Responsável independente |
| Pesquisa externa | Responsável | Apenas quando solicitado | Apenas quando solicitado |
| Testes focados | Executa ou delega | Executa durante implementação | Confere cobertura |
| Suíte completa | Responsável | Pode executar | Não substitui |
| Merge em main | Único autorizado | Proibido | Proibido |
| Publicação WebDev | Único autorizado | Proibido | Proibido |
| Design | Diretor e aprovador | Implementa apenas com ordem | Audita sem editar |

## Prompt mínimo para Codex

> Tarefa: [uma mudança objetiva]. Arquivos permitidos: [lista]. Arquivos proibidos: [lista]. Não altere o design congelado. Preserve Zero Mocks. Teste: [comando]. Mostre resumo, diff e resultado dos testes. Não faça commit nem push sem instrução.

## Prompt mínimo para Gemini

> Revise somente o diff desta branch. Não edite arquivos. Verifique regressões, segurança, acessibilidade, proveniência e cobertura de testes. Classifique cada achado como P0/P1/P2/P3/PASS, cite arquivo e linha e não proponha mudanças fora do escopo.

## Critérios de bloqueio

`P0` ou `P1` bloqueia merge. `P2` exige decisão de Manus. `P3` pode entrar como follow-up documentado. `PASS` só pode ser usado quando os critérios verificáveis foram realmente observados.

## Proteção de design

O design só pode ser alterado em uma tarefa dedicada. A tarefa deve declarar a referência visual, os viewports, os arquivos permitidos, o impacto esperado e a validação antes/depois. O simples apontamento de um problema visual não autoriza edição.
