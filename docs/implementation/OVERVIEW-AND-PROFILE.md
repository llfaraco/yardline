# Visão geral e perfil do jogador — 20/10/2026

## Escopo
Foco mantido na Visão geral e no componente compartilhado do confronto com Meu Playbook. Não considero o bloco encerrado em 100%: faltam validar o acabamento por viewport real e obter projeção completa do adversário sem inventar valores.

## Implementado
- Caixa de confronto dividida em duas metades: time selecionado à esquerda, adversário à direita. Cada lado usa o avatar real recebido da liga como fundo e separa projeção dos pontos realizados.
- Destaque da Visão geral recebe a marca original Yardline, azul-marinho, vermelho e prata; substitui a ilustração genérica de campo.
- Projeções vêm da produção projetada recebida da Sleeper, calculada pelas regras atuais da liga. Não usa valores do FantasyPros nem trata PPR como pontuação customizada.
- Nova tabela aditiva player_projection_stats guarda produção projetada bruta. Normalização valida temporada, semana, esporte, tipo de temporada e categoria.
- O total do time só aparece quando todos os titulares têm projeções calculáveis no formato da liga. Zero numérico recebido é preservado; ausência continua ausente.
- Atualização coreOnly para essas páginas dispensa drafts, transações e picks. Não apaga dados opcionais já persistidos.
- Removida a regravação redundante de todo o catálogo na sincronização: getNflPlayers já persiste catálogo novo. Isso também evita renovar indevidamente o TTL do catálogo sem uma nova consulta.
- Gravação dos confrontos agrupada em transação; logs repetitivos de sucesso desativados apenas na prévia de desenvolvimento.
- Perfil com foto maior sem moldura quadrada, fundo nas cores do time, hierarquia tipográfica e abas em português.
- Histórico tabular separado por passe, corrida, recepção, defesa e chutes. Corrige a apresentação ambígua de tentativas de corrida ao lado de passes completos. Detalhes expansíveis preservam estatísticas parciais sem células numéricas vazias.
- Carreira com cobertura, estatísticas acumuladas por grupo e quantidade de semanas de cada campo. Ficha inclui altura, peso e experiência quando disponíveis. Explicações detalham média, pontos, cobertura, projeção e situação atual no elenco.

## Validação
- 33 testes focados aprovados; suíte geral: 134 testes, 126 aprovados e 8 falhas preexistentes EPERM em arquivos temporários do command center.
- Atualização real coreOnly HTTP 200 em 1.841 ms: 17.096 registros lidos, 557 escritos, semana 7/2026. Shell com 1.099 atletas com projeção calculável no formato LEAGUE.
- Gengar My Balls: 19/19 titulares com projeção; total 196,30. Adversário 31ers: 18/19; total completo omitido. Davante Adams (2133) tem apenas adp_dd_ppr no registro projetado, sem produção calculável. A API individual retorna null; não foi presumido zero.
- Testes cobrem orientação invertida, fonte Sleeper, formato da liga, zero real, normalização de projeções, histórico alinhado, cores SF e abertura dos detalhes de jogo.

## Referências e limites
- https://www.fantasypros.com/nfl/players/brock-purdy.php
- https://www.fantasypros.com/nfl/games/brock-purdy.php
- https://docs.sleeper.com/
- Endpoint observado de projeções: https://api.sleeper.com/projections/nfl/2026/7?season_type=regular (não documentado no contrato público v1; sujeito a mudanças).
- Fonte e cálculo foram conferidos por HTTP/SQLite/DOM; não foi comprovada igualdade com uma tela autenticada da Sleeper nem aprovação visual em navegador.
- Durante a investigação ocorreram reinicializações da prévia e bloqueio concorrente de SQLite; a validação final é a execução coreOnly bem-sucedida acima.
- Nenhum deploy, alteração de credenciais ou exclusão de dados reais.
