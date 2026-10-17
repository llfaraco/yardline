# Documentação do Yardline

## Estrutura

- `audits/`: auditorias técnicas, de integridade de dados e de referências externas.
- `plans/`: planos de QA, agentes e execução do Team Leader.
- `governance/`: regras de autoridade, escrita, handoffs e integração externa.
- `implementation/`: notas de implementação e contratos de trabalho.
- `player-dossier-team-leader-handoff.md`: contrato do dossier de jogador.

## Command Center

A página operacional fica em `yardline-app/agent-command-center/` e é servida pelo backend em:

```text
http://127.0.0.1:3001/agent-command-center/
```

Quando o frontend está na porta 8080, o acesso equivalente é:

```text
http://127.0.0.1:8080/agent-command-center/
```

A página atualiza a telemetria a cada 15 segundos enquanto está aberta. O monitor recorrente roda no backend com:

```bash
cd server
npm run monitor:continuous
```

O painel distingue `LIVE`, `STALE`, `PASS`, `FAIL`, `BLOCKED` e `NOT_VERIFIABLE`. A política é deliberadamente conservadora: agentes observadores produzem evidências; **somente o Team Leader Manus autoriza e executa alterações de código**.
