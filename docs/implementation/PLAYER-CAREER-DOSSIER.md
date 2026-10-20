# Player Dossier — histórico e identidade Yardline

## Entrega de 20/10/2026

O shell mantém a composição da etapa visual anterior, agora respeitando a identidade indicada pelo usuário: navy `#002244`, vermelho `#C60C30`, prata `#B0B7BC` e branco. O logo foi recuperado integralmente do próprio repositório, commit `97fa2d6`, e salvo como asset; nenhuma nova marca foi criada. Referências: [história oficial dos uniformes](https://www.patriots.com/press-room/history-logo-uniform), [valores digitais consultados](https://usteamcolors.com/new-england-patriots-team-colors/).

Os cards abertos pelo catálogo e pelo Playbook usam o mesmo contrato de atleta: retrato por identidade ESPN/Sleeper, logo da franquia atual no fundo, posição, idade, altura, peso, experiência, universidade e status. O dossiê ganha composição responsiva própria, seletor dinâmico de temporada, game logs e quadro de carreira por ano, incluindo times observados, semanas com pontuação, total observado e média.

## Fluxo dos dados

`GET /api/players/:id/career?season=2024&leagueId=<liga>` devolve imediatamente o cache e o progresso. Uma fila compartilhada consulta no máximo três temporadas em paralelo e doze carreiras simultâneas, com deduplicação por jogador. O cliente acompanha o progresso sem trocar o atleta ou a aba selecionada por causa de respostas antigas. Ao fechar o modal, cessa a atualização da UI; o job finito pode terminar o cache.

Fonte observada e testada: `https://api.sleeper.com/stats/nfl/player/<id>?season_type=regular&season=<ano>&grouping=week`. Esse endpoint não integra o catálogo público documentado consultado em `docs.sleeper.com`; o serviço registra essa limitação e a URL de origem. Não há contrato externo de disponibilidade de 100%.

O catálogo persistido define o intervalo de temporadas. `rookieYear`/`rookie_year`, quando fornecido, prevalece; na ausência desse campo, experiência do cadastro determina um intervalo **estimado**, explicitado na interface. Se ambos faltarem, são exibidas temporadas consultadas/persistidas, sem alegar carreira completa. Cadastro de aposentados pode não fornecer metadados suficientes para descobrir todos os anos. Anos sem resposta ou sem registros são identificados; nunca recebem pontuação zero por ausência de dados.

`player_history_sync` guarda estado por jogador/ano, URL, timestamp e erro. Temporadas históricas usam TTL de 24 h; ano corrente, 10 min; falhas, 5 min. Estatísticas válidas anteriores são preservadas quando há erro ou payload incompatível. O endpoint observado usa `null` em semanas de folga: esses registros são ignorados, com teste de regressão. Payloads de outro jogador/ano ou pós-temporada são rejeitados. Esta entrega cobre temporada regular.

Os totais são recalculados a partir dos stats brutos para as **regras atuais da liga selecionada**. Não representam necessariamente regras históricas daquela liga. Sem liga, o preset PPR da fonte é identificado explicitamente; não é substituto para custom scoring ou IDP. Totais e médias abrangem somente semanas com pontuação recebida/calculável. Cobertura parcial é indicada mesmo quando o restante do ano está disponível.

## Correções associadas

- Reconciliar histórico por `temporada:semana` em vez de apenas semana; semanas iguais de anos diferentes não se sobrescrevem.
- Contadores granulares Sleeper para IDP, field goals por distância, pontos sofridos, bônus posicionais e descontos de sacks. Interceptações de D/ST (`int`) não entram como interceptações lançadas pelo QB (`pass_int`). Regras desconhecidas continuam indisponíveis.
- Persistir membros/elencos antes de esperar analytics e drafts opcionais, mantendo o elenco consultável durante o restante da sincronização.
- Usar o catálogo fresco já persistido após restart, evitando download repetido a cada mudança do backend.
- Corrigir URLs do chat com prefixo `/api/api` duplicado.
- Substituir script de histórico que inseria notícias fabricadas por CLI explícita, sem seeds editoriais. Exige `DATABASE_PATH` e IDs conhecidos do catálogo.
- Isolar o SQLite de desenvolvimento por porta (`yardline-<PORT>.db`). A cópia de desenvolvimento da porta 3002 foi feita com o backup nativo SQLite; o banco anterior foi preservado. Bancos locais não entram no Git.

## Evidências e verificação

- Catálogo real: **10.471 registros** recebidos, incluindo ativos e inativos; não se afirma que todos estejam jogando atualmente.
- Sincronização completa em SQLite em memória com API real: **16 rosters**, semana 7/2026, 15.329 registros lidos e 1.038 escritos. Na prévia persistente, o shell devolveu 16 rosters por HTTP 200 após a persistência antecipada do núcleo da liga. Durante desenvolvimento houve abortos de conexão em restarts e locks com processos antigos compartilhando o banco; a prévia passou a usar banco separado por porta.
- Histórico real consultado para Josh Allen, George Kittle e Fred Warner. Para semana 1 de 2024, regras da Neilo Pistola League retornaram **31,5 / 8,5 / 10,0** pontos, respectivamente. Não são presets PPR apresentados como pontuação de liga.
- Josh Allen 2024: 17 registros semanais, 16 pontuações calculáveis, total parcial 403,35. Semana 18 tem participação mas não contadores/preset suficientes para afirmar pontuação; não foi preenchida com zero. Kittle: 260,60 em 15 semanas observadas; Warner: 154,50 em 17 semanas observadas, pelas regras atuais daquela liga.
- **30/30 testes focados passaram**, cobrindo ingestão/cache, mudança de regras sem novo download, respostas vazias/inválidas, zeros observados, bye nulo, separação de anos, HTTP e contrato frontend de foto/logo/seleção de anos.
- Suíte completa: **119 testes, 111 passaram, 8 falharam**, mantendo as falhas anteriores de rename/EPERM no store operacional do Command Center. Sintaxe e `git diff --check` passaram.
- Inspeção visual autenticada de Sleeper/FantasyPros ou homologação do layout em navegador real não foi alegada. A política do navegador integrado bloqueou a inspeção nesta sessão. A prévia está disponível ao usuário em `http://127.0.0.1:3002/`.

## Operação local e limites

O trabalho permanece nas branches de desenvolvimento, sem deploy ou mudança de credenciais. O novo histórico fica disponível ao abrir um jogador e é compartilhado entre catálogo e Playbook. Para carregar uma carreira pela CLI: defina `DATABASE_PATH` explicitamente e execute `node server/scripts/sync-historical-stats.cjs 4984`. O jogador precisa constar do catálogo.

Antes de produção: homologar viewports/fluxos reais, estabilizar autorização das operações mutáveis já identificadas, supervisionar jobs e versões do endpoint observado, testar regras adicionais de outras ligas e ampliar descoberta de temporadas para cadastros incompletos. Não se declara funcionamento de 100% para todos os atletas, anos, formatos ou disponibilidade externa.
