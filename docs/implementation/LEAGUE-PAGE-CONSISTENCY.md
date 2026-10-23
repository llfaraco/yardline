# Integração das páginas e cards — 20/10/2026

## Alterações
- Novo adaptador league-experience.js reúne Visão geral, Meu Playbook e Confronto da semana no mesmo snapshot. Identifica o adversário pelo par de roster IDs e valida semana e temporada. As páginas deixam de recorrer a exemplos históricos da semana 6.
- Elenco sem identificação exige selecionar a conta/time; nenhuma página assume o primeiro roster. Notícias do elenco e adversário usam o mesmo contexto.
- Titulares, banco, reserva e taxi usam o catálogo canônico. Cards fora da liga/semana/temporada são rejeitados no Playbook.
- Cards exibem somente métricas recebidas, com logo do time. Dossiê omite ferramentas sem dados, biografia ausente e métricas vazias; logs apresentam apenas campos recebidos. Histórico de carreira mantém indicação de cobertura parcial.
- Consolidação de pontos mescla semanas estatísticas e confrontos; o confronto prevalece na mesma semana sem apagar as anteriores. Histórico e carreira reconhecem a mesma pontuação de confronto.
- Sincronização respeita players_points, starters_points e custom_points. Estatísticas ausentes não geram zero. Consulta de confrontos no shell filtra também a temporada.

## Verificação
- 27 testes focados aprovados: seleção do confronto em orientação invertida, zero real, ausência de placar, contexto divergente, atualização das três páginas, DOM real do dossiê, preservação do histórico e integração HTTP/SQLite.
- Suíte geral: 125 testes, 117 aprovados e 8 falhas preexistentes por EPERM em rename de arquivos temporários do command center. Ver logs de testes.
- Sincronização real respondeu HTTP 200: 15.329 registros lidos, 1.038 escritos, semana 7/2026. Shell posterior: 16 elencos, 8 confrontos. Fonte Sleeper; banco local de desenvolvimento da porta 3002.
- Verificações de sintaxe JavaScript e diff sem erros.

## Limitações e próximas prioridades
- Sem validação visual interativa nesta rodada: o navegador recusou a inspeção anteriormente. Testes de interface usam JSDOM, além de HTTP real.
- A sincronização real demorou aproximadamente 198 segundos, acima do timeout de 90 segundos do cliente. Separar sincronização em job e persistir o núcleo de confrontos antes de recursos opcionais é a próxima prioridade técnica. Não é correto prometer atualização instantânea com esse fluxo atual.
- Horários/status de jogos NFL e projeções não recebidos não são inferidos a partir de placares zero. A tela não afirma que um jogo começou ou terminou sem esses dados.
- Código legado ainda existe no monólito; o módulo carregado por último é a entrada ativa destas três páginas. A extração incremental reduz o risco de reescrita, mas é preciso consolidar módulos em etapas posteriores.
- Totais anuais históricos usam as regras atuais selecionadas, com cobertura informada. Retratos/logos continuam dependendo de disponibilidade externa.
- Nenhuma publicação em produção, alteração de credenciais ou exclusão de dados reais.
