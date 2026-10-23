# Auditoria PR #10 — Proveniência e segurança

**PR:** https://github.com/llfaraco/yardline/pull/10
**Base:** `main`
**Head:** `integration/yardline-manus`
**Checks:** 2/2 PASS; a aprovação do CI não equivale a aprovação de produto.

## P0 — Contexto fixo da liga/semana no produto

Evidências na branch do PR:

- `server/src/server.js:622` — `week = 6` em `/api/leagues/:leagueId/matchups/current`.
- `server/src/server.js:637-638` — `leagueId` padrão `1369770282776006656` e `rosterId` padrão `2` em Command Center.
- `server/src/server.js:766-768` — `/api/news` usa defaults de liga, roster e semana.
- `server/src/modules/sleeper/sleeper.sync.js:660` — `buildFantasyMatchup` usa `week = 6`.
- `server/src/modules/players/players.service.js:14,63` — liga/roster/oponente default.
- `yardline-app/js/engines.js:951-959` — ID da liga e semana 6 ativos no cliente.
- `yardline-app/js/data_and_views.js:3908-4099` — arrays `WEEK6_SLOTS`, `REAL_WEEK6_TRANSACTIONS`, `WEEK6_ALL_MATCHUPS` e mapas de elencos hardcoded.
- `yardline-app/js/data_and_views.js:4179-4535` — rendering usa fixtures Semana 6 como fallback operacional.

**Risco:** outra liga, semana ou roster pode receber dados de Neilo Pistola/Gengar My Balls; ausência pode virar fallback histórico em vez de `—`/unavailable.

**Correção exigida:** contexto ativo explícito; quando faltar leagueId/rosterId/week, retornar `unavailable`/400; fixtures só podem existir em testes/fixtures e nunca no caminho de produção.

## P0 — Conteúdo editorial hardcoded apresentado como notícia

`yardline-app/js/data_and_views.js:95-96` contém `YL_NFL_NEWS_DATABASE` com artigos, autores, `timeAgo`, citações, textos completos, estatísticas e imagens externas. A UI transforma esse conteúdo em notícia através de `realNews` em torno das linhas 374-445.

`yardline-app/js/data_and_views.js:96` também contém `YL_PLAYER_DOSSIERS` com histórico de carreira, game logs, projeções, verdicts e notícias de atletas.

**Risco:** conteúdo possivelmente inventado aparece com aparência de notícia oficial. O backend possui `newsService`, canonical URLs e proveniência, mas o cliente ainda tem uma fonte paralela que contorna o contrato.

**Correção exigida:** produção deve consumir `/api/news`/dossiê persistido; sem registro oficial, mostrar estado indisponível. Dados demonstrativos devem ficar fora do bundle produtivo e ser marcados como fixture.

## P1 — Rotas mutáveis sem `requireAuth`

Sem guard explícito em `server/src/server.js`:

- `POST /api/integrations/sleeper/sync-league` — linha 165;
- `POST /api/lineups/simulate` — linha 743 (pode ser intencionalmente público, revisar rate-limit);
- `POST /api/news/sync-worker` — linha 830;
- `POST /api/news/ingest` — linha 840;
- `POST /api/leagues/:leagueId/messages` — linha 859;
- `POST /api/command-center/sync` — no router do Command Center, apenas handoff PATCH tem token.

**Risco:** visitantes podem disparar ingestão, sync, mensagens ou ciclos de monitoramento. O token específico do PATCH não cobre o POST `/sync`.

**Correção exigida:** separar endpoints públicos de leitura, mutações autenticadas do produto e operações de operador; aplicar `requireAuth`/token de operador, rate-limit e testes 401/403.

## P1 — CORS irrestrito

`server/src/server.js:44` usa `app.use(cors())` sem allowlist.

**Correção exigida:** allowlist configurável por ambiente, incluindo somente localhost/preview/domínio de produção necessários; rejeitar `Origin` desconhecida e testar preflight.

## P1 — Endpoint Sleeper observado não documentado

`server/src/modules/sleeper/sleeper.connector.js:131-143` usa `/stats/nfl/...`, `/stats/nfl/player/...` e `/projections/nfl/...` em `api.sleeper.com`. O código marca projections como observed, mas o DTO/consumidor deve preservar esse status e nunca certificá-lo como official.

## Ordem recomendada de correção

1. Criar testes de regressão que falhem se fixtures Semana 6 entrarem no bundle/runtime de produção.
2. Remover defaults implícitos de API e exigir contexto.
3. Fazer Dashboard, matchup e cards consumirem o shell/DTO oficial.
4. Remover ou isolar banco editorial hardcoded.
5. Proteger mutações e Command Center sync.
6. Fechar CORS.
7. Reexecutar testes, smoke API e QA visual.
8. Somente então considerar retirar o Draft do PR.
