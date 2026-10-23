# Cards, escalações e monitores públicos — 20/10/2026

## Entrega
- Playbook e confronto usam os titulares capturados em matchup.players, ordenados por STARTER_n; usam a escalação atual somente quando não há escalação observada da rodada.
- As duas páginas validam liga, temporada e semana dos cards, priorizando playerCards do próprio snapshot.
- Playbook identifica os slots oficiais, incluindo FLEX e banco. Metadados ausentes não geram separadores ou badges vazios.
- Grades dos cards/dossiê se adaptam à quantidade de métricas. Cabeçalhos, nomes e confronto recebem regras para telas estreitas; foco de teclado permanece visível. Paleta Yardline preservada.
- Monitor público compara owners, jogadores, titulares e placares da Sleeper com o snapshot da mesma semana. Usa a semana NFL somente quando a temporada coincide; evita comparar semana 6 fechada com semana 7 atual.
- Monitor diferencia PASS, FAIL e NOT_VERIFIABLE. Não cria contas, faz login, POST de sincronização, altera dados, copia rankings licenciados ou alega validar o visual pelo HTML.
- Script: node server/scripts/check-league-references.js ../../outputs. API_URL precisa apontar ao backend local; padrão da prévia 127.0.0.1:3002.
- Conferência automática horária ativa nesta conversa; avisa somente mudanças relevantes. Depende do computador/app e servidor local disponíveis. Sem publicação em produção.
- Runner de testes do monitor usa Node diretamente, evitando executar npm.cmd como binário no Windows.

## Evidências
- Primeira execução real: 8 verificações aprovadas; Sleeper state, league, drafts, rosters, matchups, FantasyPros rankings/projections públicos e paridade local. Arquivo referencias-2026-10-20T14-42-50-180Z.json.
- 31 testes focados aprovados. Suíte geral: 129 testes, 121 aprovados e 8 falhas preexistentes por EPERM em rename temporário do command center.
- Revisão independente do código identificou e orientou as correções de escalação, contexto, slots e marcação vazia.

## Limitações
- Aprovação visual em navegador continua pendente: a ferramenta bloqueou a inspeção nesta sessão. JSDOM e revisão de CSS não substituem viewport, fotografias e interação reais. Não considero o acabamento visual encerrado.
- Comparação é pontual; diferenças futuras podem refletir atraso de sincronização e devem ser investigadas. Conferência horária não é atualização em tempo real.
- O script de referência evita o armazenamento do command center que apresenta EPERM; produz relatórios independentes com nomes únicos. As falhas antigas permanecem documentadas.
- Continuam prioritários: tornar a sincronização longa assíncrona, avaliar visualmente as três abas e consolidar componentes legados.
