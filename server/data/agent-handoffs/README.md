# Fila operacional Antigravity

`handoffs.json` é criado/atualizado atomicamente pelo monitor no próprio repositório, com permissão 0600 e lock. É operacional e ignorado por Git para não publicar evidência/URL/telemetria sem revisão; **não significa que não persista em disco**. Antigravity no runtime compartilhado deve ler este arquivo ou GET `/api/command-center/handoffs`, e usar a CLI de ACK/IN_PROGRESS/VERIFIED. O schema e as políticas são versionados.

Handoffs não implementam código, não retomam escritores pausados e não fazem push. Se Antigravity estiver em outra máquina, o operador precisa transferir/exportar a fila revisada ou hospedar a API de forma autenticada; esta intervenção não configurou um conector remoto. Consulte [o contrato operacional](../../AGENT-ORCHESTRATION.md).

Nunca remover locks/handoffs sem revisão do operador. `VERIFIED` exige o ciclo mais recente com evidência PASS do check exato, após a última falha, no commit/árvore atuais.

`RETRACTED` retira um falso positivo específico do harness da fila ativa, preservando evidência anterior em `reviewHistory`/`retraction`. Não é VERIFIED de produto. Recorrência real reabre o mesmo `sourceAgent + checkId`/ID. A CLI `list` exclui VERIFIED/RETRACTED; `list --all` serve à revisão histórica. Team Leader deve conferir `harnessCorrections` e [o handoff do dossier](../../../docs/player-dossier-team-leader-handoff.md) antes de distribuir; não reenviar os 27 itens do ciclo anterior cegamente.
