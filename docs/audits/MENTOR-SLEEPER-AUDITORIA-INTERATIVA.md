# Mentor Sleeper — Auditoria interativa para Yardline

**Data:** 2026-10-17 · **Modo:** somente leitura · **Viewport observado:** 1280×1100

## Limites

A auditoria foi pública, sem login, sem credenciais, sem envio de dados e sem mutações. A rota autenticada da liga `1369770282776006656/matchup` permaneceu vazia no acesso público; isso é evidência de estado de acesso/ambiente, não motivo para inventar conteúdo.

## Achados essenciais

| Área | Observação | Requisito Yardline | Classificação |
|---|---|---|---|
| Shell | Header sticky, rail de esportes, cards compactos, estados LIVE/FINAL/POSTPONED | Shell próprio, status inequívoco, rail responsivo e acessível | OBSERVED |
| Menus | Popover Fantasy agrupado por contexto; fechamento precisa ser perceptível | Menus ancorados, foco, ESC, backdrop e rota preservada | OBSERVED |
| Score | Times, placar por período, top performers, Team Stats, Recent Plays e links de atletas | Contrato de score/fatos com fonte, timestamp, estado e feed temporal | OBSERVED |
| Dossier | Hero com foto/time/posição/idade/rank/rostered; gamelog por temporada; sort asc/desc; depth chart; notícias | Dossier contextual com proveniência, filtros persistentes, tabela acessível e dados faltantes explícitos | OBSERVED |
| Notícias | News ao lado das stats, título, data, texto, reações/comentários e CTA | Feed ligado a liga/time/jogador/adversário, fonte/canonical URL/timestamp e fallback | OBSERVED |
| Loading | Score e dossier exibiram primeiro vazio/skeleton e depois conteúdo | Skeleton estável, `aria-busy`, timeout, retry e erro acionável | OBSERVED |
| Liga pública | URL da liga fornecida ficou azul-marinho vazia, sem shell, matchup ou erro | Nunca deixar tela vazia; mostrar loading, acesso, empty ou erro com ação | OBSERVED |
| Responsive | Rail/scroll horizontal observados; mobile e tablet não foram validados | Breakpoints, drawer, tabela responsiva, touch-safe tooltips e teclado | NOT_VERIFIABLE |
| Auth | Modal central com overlay/blur, X/ESC/backdrop não foram todos validados | Auth não deve destruir contexto; X/ESC/backdrop/reopen/focus obrigatório | OBSERVED / NOT_VERIFIABLE |

## Mandato de produção

### Dashboard
Combinar Overview, Trend, Scores, Matchup, Trades e News com filtros de temporada/semana/time. Usar cards analíticos densos, delta, tendência, status live/final/postponed, skeleton e motion curto. Motion é enriquecimento; toda informação deve existir em tabela/texto acessível.

### News
Modelar `league → team → player → game/week`. Separar fato, análise, opinião e conteúdo promocional. Persistir `source`, `canonicalUrl`, `publishedAt`, `updatedAt`, entidade relacionada, relevância e freshness. Sem artigos: estado vazio explícito.

### Matchup
Contrato versionado para `week`, `status`, `rosters`, `starters`, `bench`, `projectedPoints`, `livePoints`, `finalPoints`, `scoringSettings`, `winnerProbability`, `news`, `source` e `asOf`. Fotos/logos devem usar IDs/assets validados e fallback textual; nunca substituir dado real por fixture silencioso.

## Matriz para os agentes

- **Design/UI:** tokens próprios, dark/navy ou claro conforme Yardline, densidade, hierarquia, skeleton, active/focus/disabled/error e motion com `prefers-reduced-motion`.
- **Frontend:** tabs e filtros deep-linkable, sort determinístico, modal robusto, tabela fallback para gráficos, rail responsivo e estados de acesso.
- **Backend/API:** schemas de league/week/matchup/player/news, timeout/error tipados, freshness e proveniência obrigatórias.
- **Data/Sleeper:** crosswalk de fotos/logos, factual vs projetado, bye/postponed/missing e snapshot versionado.
- **News:** ingestão, dedupe, canonical URL, entidade e classificação factual/analysis.
- **Matchup:** eliminar tela vazia e expor dados reais de roster, pontos, status, probabilidade e contexto.
- **Player Dossier:** preservar rota, entidade, temporada, sort, game logs, depth chart e notícias.
- **Senior QA:** testar tela vazia, timeout/retry, live→final/postponed, X/ESC/backdrop/reopen/foco e viewports 320/768/1280.

## Itens não comprovados

Login autenticado, matchup da liga privada, mobile real, hover tooltips, foco restaurado, backdrop/reopen e motion por pixel não foram declarados como PASS. Devem permanecer `NOT_VERIFIABLE` até teste real.