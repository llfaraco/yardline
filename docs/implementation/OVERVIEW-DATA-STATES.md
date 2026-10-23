# Visão geral — estados de dados e projeções

## Alterações
- Projeção incompleta tem explicação expansível por time, cobertura de titulares e nomes dos jogadores sem estimativa no formato da liga. Os nomes abrem o perfil; a situação no cadastro é mostrada somente quando recebida.
- Mantém oculto o total incompleto, sem assumir zero nem importar outra fonte. Projeções aceitam apenas as origens Sleeper reconhecidas e o formato LEAGUE.
- Ausência de confronto gera uma mensagem única e ação de atualização, sem placar ou adversário fictício.
- O indicador de atualização compartilha a mesma função entre renderização da página e polling. Offline, falha, atualização em andamento e primeira carga não se contradizem ao redesenhar as abas.

## Verificação
- 14 testes focados aprovados: projeção completa/incompleta, zero real, nomes e situação do jogador, contexto divergente, ausência de confronto, concorrência, falha e indicador de conexão após renderização.
- Suíte completa: 142 testes, 134 aprovados e 8 falhas preexistentes EPERM em arquivos temporários do command center.
- Snapshot real conferido em validacao-estados-visao-geral.json: Gengar My Balls com 19/19 titulares e projeção 199,04; 31ers com 17/19 e total oculto. Davante Adams e Mike Evans sem projeção calculável recebida, ambos com Out no cadastro. Valores representam essa captura e podem mudar.

## Aceite
O comportamento para ausência de dados externos está implementado e testado; a publicação futura de uma projeção específica não é requisito para esse comportamento funcionar. Não considero ausência um zero nem aguardo indefinidamente esse valor para tratar o estado.

A revisão visual final em viewport real permanece pendente. A ferramenta do navegador bloqueou a inspeção nesta sessão; os testes de DOM e a revisão de CSS não substituem a observação da página renderizada. Uma captura atual da Visão geral permite revisar o acabamento sem contornar esse bloqueio.

Nenhuma outra aba recebeu novas funcionalidades. Sem publicação em produção.
