# Plano de produção — três pilares Yardline

## Autoridade

Os mentores Sleeper e FantasyPros são observadores e mentores. Eles não editam código. O Team Leader Manus é o único responsável por transformar relatórios em alterações, testes, commit e publicação.

## Ordem de execução

### Fase 1 — Contratos e proveniência

1. Fixar schemas canônicos de Dashboard, News, Matchup, Player Card e `asOf/provider/source`.
2. Remover qualquer fallback que apresente fixture como dado oficial.
3. Garantir estados `loading`, `empty`, `error`, `gated`, `stale`, `synced` e `not-verifiable`.
4. Corrigir week/scoring/precision/rostered semantics em um único contexto.

**Responsáveis:** Backend/API, Data/Sleeper, Scoring, Senior QA.

### Fase 2 — Dashboard de inteligência

1. Overview do time com record, standing, points, opponent, win probability e deltas.
2. Trend de pontos e comparação com mediana/league baseline.
3. Power/position insights e alertas de lineup, injury, bye e availability.
4. Motion curto para mudança de semana, entrada de cards e variação de delta; respeitar `prefers-reduced-motion`.
5. Tabela/summary textual equivalente para cada visualização.

**Responsáveis:** Design/UI, Frontend, Data, Scoring.

### Fase 3 — News contextualizada

1. Feed jornalístico com título, dek, autor, data, source/canonical URL.
2. Entidade ligada: liga, time, jogador, adversário, game/week.
3. Separar News/Facts, Analysis/Expert Notes, Start/Sit e Promotional.
4. Filtros por week/time/player/type, dedupe e paginação.
5. Loading/empty/error/stale explícitos e sem imagem proprietária não validada.

**Responsáveis:** NFL News, Yahoo News, Backend/API, News, Frontend, Design/UI.

### Fase 4 — Matchup da semana

1. Header com semana, status, times, logos/fotos válidos e record.
2. Side-by-side de starters/bench, posição, projected/live/final points e scoring.
3. Win probability, pace/usage, injuries/inactives, opponent context e confidence/coverage.
4. Troca de week e Current/Optimal somente se o contrato e cálculo forem reais.
5. Motion de progresso/delta/troca de lado com fallback textual e reduced-motion.
6. Dados ausentes não viram zero ou Healthy por padrão.

**Responsáveis:** Matchup/Frontend, Data/Sleeper, Scoring, Design/UI, Senior QA.

## Critérios de aceite

- Nenhuma tela deixa o usuário diante de vazio silencioso.
- Dashboard responde à liga/time selecionado e exibe dados com fonte e timestamp.
- News possui elo verificável com a liga/time e distingue fato de análise.
- Matchup usa dados reais do snapshot e fotos/assets com origem validada ou fallback textual.
- Player card/dossier mantém week, scoring, season, source e histórico consistentes.
- X, ESC, backdrop, reopen, foco e scroll lock funcionam nos modais.
- QA testa desktop e viewports móveis; limitações são `NOT_VERIFIABLE`, nunca PASS artificial.
- P0/P1, drift de semana/projeção/rostered e catálogo vazio bloqueiam release.

## Distribuição imediata

| Agente | Próximo trabalho |
|---|---|
| Design/UI | Propor tokens, layout, estados e motion para Dashboard/News/Matchup |
| Frontend | Mapear componentes e substituir views estáticas por DTOs canônicos |
| Backend/API | Consolidar contratos e endpoints com source/asOf/freshness |
| Data/Sleeper | Garantir crosswalk de IDs, fotos/logos, roster e snapshots |
| Scoring | Validar projection/live/final e breakdown explicável |
| NFL/Yahoo News | Entregar feed editorial normalizado e vinculado |
| Senior QA | Criar regressões para vazio silencioso, week drift, modais e responsividade |
| Team Leader Manus | Implementar, testar, revisar diff e publicar somente após gate |
