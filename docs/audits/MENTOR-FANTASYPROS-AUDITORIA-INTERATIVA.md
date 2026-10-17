# Mentor FantasyPros — Auditoria interativa para Yardline

**Data:** 2026-10-17 · **Modo:** somente leitura · **Viewport observado:** aproximadamente 893×766

## Limites

Foram observadas páginas públicas de rankings, projections, start/sit, player, depth chart, news, articles e matchup. Não houve login, assinatura, formulário enviado, alteração de favoritos ou download. Mobile real, motion por pixel e leitor de tela não foram verificáveis.

## Achados essenciais

| Área | Observação | Requisito Yardline | Classificação |
|---|---|---|---|
| Navegação | Rail vertical com Home, Feed, Playbook, Rankings, Coach, Research, DFS, Draft e More; busca `ctrl + K` | Navegação própria, dashboard como destino primário e busca jogador/time/liga | OBSERVED |
| Rankings | Filtros Weekly/Draft/ADP/ROS/Dynasty, scoring Standard/PPR/Half, views Overview/Ranks/Notes/Stats, experts e comparação por linha | Views substituíveis sobre dados canônicos, filtros persistentes e fonte/freshness visíveis | OBSERVED |
| Tabelas | Colunas de rank, player, opponent, upside, bust, matchup, start/sit e projection; overflow horizontal | Coluna de identidade sticky, scroll anunciado, checkbox acessível e comparação limitada | OBSERVED |
| Gating | Blocos premium/free account e lacunas com cadeado | Diferenciar sem dado, não calculado, gated e erro; jamais preencher com mock | OBSERVED |
| Busca | Overlay com input, atalhos, Escape e estado de ferramentas | Busca com loading, nenhum resultado, erro, ESC e foco restaurado | OBSERVED |
| Player card | Headshot/uniforme/time, posição, bye, rostered, idade, ECR, projeção, matchup, ROS e scoring | Header do dossier com entidade canônica, week/scoring/source/asOf e skeleton estável | OBSERVED |
| Dossier | Tabs Latest News, Game Logs, Season Stats, Outlook, News & Analysis, Depth Chart, Leagues, Full Profile | Tabs reais, conteúdo por entidade, deep-link e estado ativo acessível | OBSERVED |
| Game Logs | Gráfico Projected vs Actual vs Avg Actual, View as data table, export menu e tabela por semana | Gráfico opcional; tabela equivalente obrigatória; dados projected/actual separados | OBSERVED |
| Outlook | Tile time vs adversário, horário, ECR, projection, matchup e game total | Contexto de decisão com origem e timestamp; sem copiar marca/arte | OBSERVED |
| News | News/Articles/Expert Notes com título, resumo, autor, timestamp, foto e categoria | Separar fato, análise, expert note e promocional; ligar player/team/league/week | OBSERVED |
| Depth chart | Time, offense/defense, posições, rank ECR e aviso de divergência | Fonte, timestamp, provider e divergência oficial explícitos | OBSERVED |
| Matchup | Página pública exibiu gate premium; não houve dados reais suficientes para declarar paridade | Yardline deve entregar baseline factual público e separar análise derivada | OBSERVED / NOT_VERIFIABLE |
| Consistência | Projection 21.1/21.2, rostered 65%/100%, heading Week 1 em sessão Week 6 | Contrato único de week/scoring/precision/semântica de rostered | OBSERVED |
| Loading | Player card começou branco; League Availability exibiu spinner e depois gate | Skeleton dimensionalmente estável, timeout, retry, empty e gated explícitos | OBSERVED |

## Mandato de produção

### Dashboard analítico
Usar view switcher, filtros persistentes, projection/history, projected-vs-actual, comparação e deltas. Começar por tabela acessível e adicionar gráficos/motion. Toda métrica deve trazer definição, provider, `asOf` e precision.

### News jornalística
Feed por liga/time/jogador/week com título, dek, autor, data, fonte e impacto fantasy separado do fato. Taxonomia: News/Facts, Analysis/Expert Notes, Start/Sit e Sponsored/Promotional. Dedupe e paginação/cursor.

### Matchup
Não copiar o gate premium. Entregar fatos de matchup: opponent, allowance, pace/usage, injuries/inactives, game total, histórico comparável e confidence/coverage. Motion deve comunicar troca de semana/lado/delta, com reduced-motion e fallback textual.

## Matriz para os agentes

- **Design/UI:** sistema próprio de tokens, densidade ajustável, filtros sempre visíveis, contraste, hierarquia e separação de produto/promocional.
- **Frontend:** componentes de views/tabs, URL state, sticky identity columns, overflow anunciado, modal/foco, tabela para chart e selectors estáveis.
- **Backend/API:** contratos versionados de projection/matchup/injuries/depth/news com `provider`, `asOf`, `season`, `week`, `source` e `freshness`.
- **Data/Sleeper:** reconciliar precision, week, rostered semantics, source e histórico; estados disconnected/syncing/empty/error.
- **News:** CMS/entity linking, dedupe, paginação, factual vs analysis, timestamp e canonical URL.
- **Matchup:** facts + context + confidence, fotos/logos validados, fallback de asset e reduced-motion.
- **Player Dossier:** tabs com conteúdo real, header consistente, game logs, season stats, outlook, news, depth e leagues.
- **Senior QA:** P0 para week mismatch, projection drift e rostered drift; testar busca, dropdowns, tooltips, modais, tabs, reabertura e viewports.

## Riscos que bloqueiam release

Projection drift, rostered drift e week mismatch não podem ser escondidos por arredondamento ou fallback. Devem gerar evidência e contrato explícito antes de qualquer PASS de paridade.