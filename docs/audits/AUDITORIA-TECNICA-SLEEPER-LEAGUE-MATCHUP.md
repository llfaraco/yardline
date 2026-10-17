# Auditoria técnica — Sleeper League Matchup

**URL auditada:** `https://sleeper.com/leagues/1369770282776006656/matchup`  
**Liga:** Neilo Pistola League  
**Temporada:** 2026 NFL, semana 6, 16 times, Keeper PPR com IDP  
**Data da observação:** 15/10/2026  

---

## 1. O que foi observado

A página é uma aplicação web de uma única experiência de liga, com uma navegação interna que troca a rota sem abandonar o shell da aplicação. O layout tem três regiões persistentes:

1. **Barra lateral esquerda:** marca, mensagens diretas, inbox, lista de ligas e usuário atual.
2. **Painel central:** conteúdo da rota atual da liga.
3. **Painel direito:** League Chat persistente, com feed de mensagens e campo para envio.

### Rotas observadas

| Função | Rota observada | Papel |
| :--- | :--- | :--- |
| **Matchup** | `/leagues/{league_id}/matchup` | Compara dois rosters em uma semana e mostra titulares, banco, projeções e pontuação. |
| **Team** | `/leagues/{league_id}/team` | Exibe o roster do usuário, slots, percentuais de posse/escalação, waivers, picks e opções de montagem. |
| **League** | `/leagues/{league_id}/league` | Mostra todos os confrontos, classificação, atividade recente, configurações e scoring. |
| **Players** | `/leagues/{league_id}/players` | Lista jogadores, filtros por posição, busca, projeção/estatísticas, free agents, watchlist e rookies. |
| **Trend** | `/leagues/{league_id}/trend` | Lista jogadores em alta e em baixa, com variação de tendência e percentual de posse. |
| **Trades** | `/leagues/{league_id}/trades` | Mostra negociações ativas, pendentes, enviadas e trade block. |
| **Scores** | `/leagues/{league_id}/scores` | Game Center da semana, jogos por horário e líderes por posição após os jogos começarem. |

---

## 2. Modelo de dados central

A API pública retorna uma entidade `league` e entidades relacionadas. O payload real da liga confirmou estes campos principais:

- `league_id`: `1369770282776006656`
- `name`: `Neilo Pistola League`
- `status`: `in_season`
- `sport`: `nfl`
- `season`: `2026`
- `season_type`: `regular`
- `total_rosters`: `16`
- `settings.leg`: `6`
- `settings.playoff_teams`: `6`
- `settings.playoff_week_start`: `15`
- `settings.trade_deadline`: `13`
- `settings.waiver_clear_days`: `2`
- `settings.waiver_day_of_week`: `2`
- `settings.pick_trading`: `1`
- `settings.reserve_slots`: `1`
- `settings.taxi_slots`: `2`
- `roster_positions`: `QB`, `RB`, `3 WR`, `TE`, `2 FLEX`, `K`, `3 DL`, `3 LB`, `3 DB`, `1 IDP FLEX` e `11 BN`.
- `scoring_settings`: mapa de regras de pontuação, incluindo passing, rushing, receiving, kicking, defesa e IDP.

Para implementar um sistema semelhante, trate `league` como configuração imutável durante a renderização da tela, e derive os demais componentes a partir de `users`, `rosters`, `matchups`, `transactions`, `players` e estado esportivo.

---

## 3. Comportamento de cada tela

### Matchup
A tela divide o confronto em dois lados: **Gengar My Balls** contra **Curitiba Red Fox**. Cada lado mostra proprietário, campanha, pontos atuais, percentual de vitória e quantidade de jogadores ainda não iniciados.

Cada linha de jogador contém:
- Nome abreviado;
- Posição e time NFL;
- Status de jogo, como Q, P, BYE ou Yet to play;
- Data e horário do jogo;
- Casa/fora e adversário;
- Projeção;
- Pontuação atual ou placeholder enquanto o jogo não começou.

O banco é renderizado separado dos titulares. O componente precisa manter a ordem dos starters enviada pela API; o banco pode ser obtido removendo os starters da lista total de jogadores, conforme a documentação oficial.

### Team
A tela apresenta o roster do usuário com colunas semelhantes a:
- Posição efetiva do slot;
- Jogador;
- Adversário e horário;
- `OWN %`;
- `START %`;
- `PTS`.

Foi observado o texto *"Click on position buttons to update your lineup"*. Isso indica que os botões de slot são controles de montagem de escalação. Não foi executada nenhuma troca para evitar alteração de estado da liga.

Também aparecem:
- `WAIVER` e `TRADE`;
- Titulares e banco;
- Injured reserve;
- Taxi squad;
- Draft picks futuros por ano e rodada.

### League
A tela reúne três conjuntos de dados:
1. **Matchups da semana:** todos os oito confrontos da liga.
2. **Standings:** posição, time, proprietário, campanha, pontos feitos, pontos contra e posição de waiver.
3. **League Settings:** número de times, roster, playoffs, waivers, deadline de trades, slots de IR, permissão de troca de picks e scoring.

A classificação observada é derivada principalmente de `rosters[].settings.wins`, `losses`, `fpts`, `fpts_against` e `waiver_position`, enriquecida com nome do time e usuário.

### Players
A tela possui filtros de posição:
- `ALL`;
- `QB`;
- `RB`;
- `WR`;
- `TE`;
- `DL`;
- `LB`;
- `MORE`.

Há um campo de busca com atalho visual `Ctrl + U`, e alternância entre `Projection` e `Stats`. Também aparecem controles de temporada, semana e listas como `Free agents`, `Watchlist` e `Rookies`.

A tabela observada contém as métricas:
- `PTS`;
- `ATT`, `YD`, `TD` de rushing;
- `REC`, `TAR`, `YD`, `TD` de receiving;
- `CMP`, `ATT`, `YD`, `TD` de passing.

O desenho sugere que o frontend recebe um dataset de jogadores/estatísticas e filtra localmente por posição, status e texto de busca, enquanto projeções e estatísticas podem ser fontes ou consultas diferentes.

### Trend
A tela é dividida em `Trending up` e `Trending down`, cada uma com filtro `ALL`. Cada linha contém ranking, jogador, posição, proprietário quando aplicável, jogo da semana, variação numérica e percentual de posse.

A variação não é uma pontuação de fantasy: é um indicador de movimento/trending. Portanto, no sistema próprio, mantenha `trend_delta` separado de `projected_points` e `fantasy_points`.

### Trades
A tela mostra:
- Contador de trades ativos;
- Botão principal `TRADE`;
- Negociações `PROCESSES`, `PENDING`, `OUTGOING`;
- Data relativa;
- Participantes;
- Jogadores e picks envolvidos;
- Coluna de `Trade Block` com jogador, posição, time e proprietário.

O feed observável também mostra negociações completas anteriores e cards de atividade. A API documenta trades como transações, com `roster_ids`, `adds`, `drops`, `draft_picks`, `consenter_ids`, `creator`, `status` e timestamps.

### Scores
A tela é um Game Center da semana. Ela lista os jogos por dia e horário, com filtros:
`All`, `QB`, `RB`, `WR`, `TE`, `DL`, `LB`, `DB`, `K`.

Enquanto nenhum jogo começou, o estado vazio é *"Players have yet to play"*. Após o início dos jogos, o mesmo painel pode ser preenchido com líderes por posição. Isso é um bom exemplo de componente orientado a estado: `pre_game`, `live` e `final`.

### League Chat
O chat é persistente entre as rotas. O componente contém:
- Feed cronológico;
- Avatar e autor;
- Eventos de free agent, waiver, trade e report semanal;
- Botão de resposta por item;
- Campo `Enter Message`;
- Botão `GIF`;
- Controles visuais de minimizar/pin/áudio.

Nenhuma mensagem foi enviada e nenhum controle potencialmente mutável foi acionado. O chat deve ser modelado como um fluxo independente do conteúdo principal da liga, com atualização em tempo real ou polling.

---

## 4. Endpoints públicos confirmados

A documentação oficial descreve uma API REST pública, somente leitura e sem token. Ela recomenda limitar a frequência de chamadas.

Para esta liga, os endpoints confirmados e consultados foram:

```http
GET https://api.sleeper.app/v1/league/1369770282776006656
GET https://api.sleeper.app/v1/league/1369770282776006656/rosters
GET https://api.sleeper.app/v1/league/1369770282776006656/users
GET https://api.sleeper.app/v1/league/1369770282776006656/matchups/6
GET https://api.sleeper.app/v1/league/1369770282776006656/transactions/6
GET https://api.sleeper.app/v1/league/1369770282776006656/traded_picks
GET https://api.sleeper.app/v1/state/nfl
```

Todos responderam HTTP 200 durante a auditoria. A quantidade de registros retornada foi:
- `league`: objeto;
- `rosters`: 16;
- `users`: 16;
- `matchups/6`: 16 objetos, um por time;
- `transactions/6`: 14;
- `traded_picks`: 18;
- `state/nfl`: objeto de estado.

A documentação informa ainda estes endpoints relacionados:

```http
GET /v1/league/{league_id}/winners_bracket
GET /v1/league/{league_id}/losers_bracket
GET /v1/league/{league_id}/drafts
GET /v1/draft/{draft_id}
GET /v1/draft/{draft_id}/picks
GET /v1/draft/{draft_id}/traded_picks
GET /v1/players/nfl
GET /v1/user/{user_id}
GET /v1/user/{user_id}/leagues/nfl/{season}
GET /v1/state/{sport}
```

A página visual, entretanto, também possui recursos internos de aplicação para chat, projeções, tendências e alguns cards agregados. Esses recursos não devem ser inferidos como endpoints públicos sem observar o tráfego de rede autenticado.

---

## 5. Arquitetura recomendada para um sistema semelhante

### Camada de ingestão
Crie um cliente que faça cache por chave composta:
```
league:{league_id}
rosters:{league_id}
users:{league_id}
matchups:{league_id}:{week}
transactions:{league_id}:{week}
traded_picks:{league_id}
state:{sport}
players:{sport}:{season}
```
Use `league` como fonte de configuração. Não replique regras de pontuação manualmente na UI; leia `scoring_settings` e derive os cálculos a partir delas.

### Camada de normalização
Normalize jogadores em um objeto comum:
```typescript
type PlayerView = {
  playerId: string;
  name: string;
  position: string;
  team: string | null;
  status?: string;
  opponent?: string;
  gameTime?: string;
  projection?: number;
  points?: number;
  rosterId?: number;
  slot?: string;
};
```

Normalize rosters separando:
- Starters ordenados;
- Bench;
- Reserve/IR;
- Taxi;
- Picks;
- Owner.

### Camada de estado da interface
Mantenha no estado da rota:
```typescript
type LeagueUiState = {
  leagueId: string;
  week: number;
  route: 'matchup' | 'team' | 'league' | 'players' | 'trend' | 'trades' | 'scores';
  playerPosition: string;
  playerList: 'all' | 'free_agents' | 'watchlist' | 'rookies';
  playerView: 'projection' | 'stats';
  search: string;
  chatOpen: boolean;
};
```
O URL deve ser a fonte de verdade da rota e da liga. Filtros de jogador podem ficar em query parameters se você quiser links reproduzíveis.

### Atualização e consistência
Separe claramente:
- **Dados estáticos ou semiestáticos:** `league`, `users`, `players`;
- **Dados por semana:** `matchups`, `transactions`, `scores`;
- **Dados em tempo real:** chat, jogos ao vivo, status de jogadores.

Use cache com invalidação por evento. Uma mudança de lineup deve invalidar roster, matchup e totais da semana. Uma transação deve invalidar roster, trades, standings e atividade recente.

### Segurança
A API pública é somente leitura. Para ações como enviar chat, alterar lineup, adicionar jogador ou propor trade, você precisará de um backend próprio com autenticação, autorização por liga e trilha de auditoria. Não exponha credenciais no browser e não confie em `roster_id` recebido do cliente sem validar que o usuário autenticado pode operar aquele roster.

---

## 6. O que não é possível concluir apenas pela página

A auditoria da página permite descrever a interface, o modelo exibido e os endpoints públicos. Ela não revela, por si só:
- Código-fonte do backend da Sleeper;
- Tabelas internas e regras de persistência;
- Endpoints privados autenticados usados pelo frontend;
- Filas, websocket, rate limiting interno ou jobs de cálculo;
- Regras exatas de autorização para cada ação;
- Implementação do algoritmo de tendências e do relatório semanal;
- Payloads de mutação de lineup, trade, waiver e chat.

Esses itens exigiriam uma inspeção autorizada do tráfego de rede da sessão ou acesso ao código/ambiente do sistema. Durante esta auditoria, ações de mutação não foram executadas.

---

## 7. Checklist de implementação

- [x] Shell persistente com sidebar, conteúdo central e chat.
- [x] Roteamento por `league_id` e seção.
- [x] Cache por liga/semana.
- [x] Normalização de users, rosters, players e matchups.
- [x] Renderização de starters preservando ordem da API.
- [x] Derivação do banco removendo starters da lista total.
- [x] Filtros de posição, status, lista e texto.
- [x] Projeção separada de pontuação real.
- [x] Configuração de scoring dirigida por dados.
- [x] Estados `pre_game`, `live`, `final` para scores.
- [x] Feed de transações e trade block.
- [x] Chat com mensagens, replies, GIF e anexos como recursos separados.
- [x] Permissões server-side para todas as mutações.
- [x] Auditoria de eventos e idempotência em ações de lineup/trade/waiver.
- [x] Rate limiting e retry com backoff nos endpoints públicos.

---

## 8. Catálogo de endpoints para sincronização NFL

Os endpoints abaixo são os recursos públicos documentados pela Sleeper. Eles são somente leitura, não exigem token e não permitem criar ou alterar escalações, trades, waivers ou mensagens. A sincronização deve ser feita pelo seu backend, nunca diretamente pelo navegador do usuário.

### Identidade, avatares e ligas
```http
GET /v1/user/{username}
GET /v1/user/{user_id}
GET /v1/user/{user_id}/leagues/{sport}/{season}
GET /v1/league/{league_id}
GET /v1/league/{league_id}/users
GET /v1/league/{league_id}/rosters
```
Use `user_id` como chave persistente. O username pode mudar. Para avatar:
```
https://sleepercdn.com/avatars/{avatar_id}
https://sleepercdn.com/avatars/thumbs/{avatar_id}
```

### Estado da liga, semana e confrontos
```http
GET /v1/state/{sport}
GET /v1/league/{league_id}/matchups/{week}
GET /v1/league/{league_id}/winners_bracket
GET /v1/league/{league_id}/losers_bracket
```
`/state/nfl` é a referência para week, leg, season, season_type, display_week e temporada ativa. Não assuma que a semana exibida na UI é sempre a mesma semana atual do calendário; a própria API expõe display_week separadamente.

Em `matchups/{week}`, cada objeto representa um roster. Os dois times do confronto compartilham o mesmo `matchup_id`. `starters` é uma lista ordenada; `players` contém titulares e banco; `points` é o total calculado pela configuração da liga; `custom_points` permite uma pontuação manual quando a liga sobrescreve o cálculo.

### Transações, waivers, trades e picks
```http
GET /v1/league/{league_id}/transactions/{round}
GET /v1/league/{league_id}/traded_picks
GET /v1/league/{league_id}/drafts
GET /v1/draft/{draft_id}
GET /v1/draft/{draft_id}/picks
GET /v1/draft/{draft_id}/traded_picks
GET /v1/user/{user_id}/drafts/{sport}/{season}
```
Em futebol americano, o parâmetro `round` do endpoint de transactions corresponde à semana/leg. O payload pode conter `type` (`trade`, `free_agent`, `waiver`), `status`, `adds`, `drops`, `draft_picks`, `roster_ids`, `consenter_ids`, `creator`, `created`, `status_updated` e `waiver_budget`.

Para sincronizar sem duplicação, use `transaction_id` como chave idempotente. Para picks, a identidade lógica deve combinar season, round, `roster_id` original e owner atual.

### Jogadores e tendências
```http
GET /v1/players/nfl
GET /v1/players/nfl/trending/add?lookback_hours={hours}&limit={limit}
GET /v1/players/nfl/trending/drop?lookback_hours={hours}&limit={limit}
```
`/players/nfl` é um catálogo grande e deve ser armazenado localmente, com atualização periódica, em vez de consultado durante cada renderização. O catálogo fornece IDs, nome, posição, time, status e metadados necessários para resolver as listas de IDs presentes em rosters e matchups.

As rotas de trending devem alimentar a tela Trend, mas o delta de trending não é pontuação fantasy. Armazene-o em tabela própria com `player_id`, `direction`, `delta`, `lookback_hours`, `captured_at` e `source`.

### Endpoints que não devem ser inventados
Não há, na documentação pública consultada, endpoints de mutação para lineup, trade, waiver, chat, projeções proprietárias, pontuação play-by-play ou líderes ao vivo. Também não se deve inferir que a UI usa somente os endpoints públicos: o frontend pode consumir recursos privados ou agregados que não fazem parte da API pública.

---

## 9. Estratégia de sincronização no backend

### Cargas iniciais
Para uma liga, execute nesta ordem:
1. `state/{sport}` para descobrir a temporada e a semana ativa.
2. `league/{league_id}` para gravar configurações, roster positions e scoring settings.
3. `users` para resolver proprietários e nomes de times.
4. `rosters` para jogadores, titulares, reservas e métricas acumuladas.
5. `matchups/{week}` para a semana corrente e, opcionalmente, semanas históricas.
6. `players/nfl` para resolver IDs de jogadores.
7. `transactions/{week}` e `traded_picks` para histórico e estado de ativos.
8. `drafts` e endpoints de draft quando a liga usa histórico de draft.

### Frequências sugeridas

| Recurso | Estratégia sugerida |
| :--- | :--- |
| **Catálogo de jogadores** | Cache diário ou sob demanda com TTL longo. |
| **Liga, usuários e regras** | Ao iniciar a liga e depois a cada 15–60 minutos. |
| **Rosters** | A cada 1–5 minutos durante janela de lineup; menos fora dela. |
| **Matchups** | A cada 1–5 minutos durante jogos; armazenar snapshots. |
| **Transactions** | A cada 1–5 minutos na semana corrente; histórico pode ser diário. |
| **State NFL** | A cada 1–5 minutos durante o dia de jogos. |
| **Trending** | Conforme a tela for acessada, com cache por parâmetros. |

Respeite a recomendação pública de permanecer abaixo de 1000 chamadas por minuto e use cache, jitter, retry com backoff e coalescência de requests. O backend deve fazer uma chamada compartilhada por recurso, mesmo que muitos usuários estejam vendo a mesma liga.

### Modelo mínimo de persistência
```sql
leagues(league_id, season, sport, raw_json, scoring_hash, synced_at)
league_users(league_id, user_id, display_name, username, team_name, raw_json)
rosters(league_id, roster_id, owner_id, players_json, starters_json, settings_json, synced_at)
matchups(league_id, week, matchup_id, roster_id, points, custom_points, players_json, synced_at)
transactions(league_id, transaction_id, week, type, status, raw_json, created_at)
traded_picks(league_id, season, round, original_roster_id, owner_roster_id, raw_json)
players(player_id, sport, name, position, team, status, raw_json, synced_at)
player_stats(league_id, week, player_id, stats_json, source, observed_at)
player_scores(league_id, week, player_id, score, breakdown_json, calculated_at)
```
O `raw_json` é útil para reprocessamento quando a Sleeper acrescentar campos. O `breakdown_json` deve guardar cada parcela da pontuação, permitindo explicar ao usuário por que um atleta recebeu determinado total.

---

## 10. Motor de scoring em tempo real

### Limite importante da API pública
A API pública da Sleeper fornece a configuração `scoring_settings` e os resultados de matchups, mas não é documentada como um feed completo de eventos ao vivo de cada jogador. Portanto, o motor deve separar:
1. **Regras:** vêm de `league.scoring_settings`.
2. **Roster e elegibilidade:** vêm de `rosters`, `matchups` e `players`.
3. **Estatísticas ao vivo:** precisam vir de um feed de estatísticas autorizado/licenciado, de um coletor próprio ou de snapshots compatíveis disponíveis no seu ambiente.

Não apresente um cálculo local como “pontuação oficial Sleeper” sem comparar o resultado com `matchups/{week}.points` quando a API disponibilizar o valor.

### Mapeamento das regras

| Regra Sleeper | Estatística normalizada | Exemplo |
| :--- | :--- | :--- |
| `pass_yd` | passing_yards | 0.05 |
| `pass_td` | passing_touchdowns | 4 |
| `pass_2pt` | passing_2pt | 2 |
| `pass_int` | interceptions_thrown | -2 |
| `pass_int_td` | pick_sixes_thrown | -4 |
| `pass_sack` | sacks_taken | -1 |
| `rush_yd` | rushing_yards | 0.1 |
| `rush_td` | rushing_touchdowns | 6 |
| `rush_2pt` | rushing_2pt | 2 |
| `rec` | receptions | 1 |
| `rec_yd` | receiving_yards | 0.1 |
| `rec_td` | receiving_touchdowns | 6 |
| `rec_2pt` | receiving_2pt | 2 |
| `fgm_0_19 … fgm_60p` | field_goals_made_by_distance | 2 … 6 |
| `xpm` | extra_points_made | 1 |
| `xpmiss` | extra_points_missed | -2 |
| `fgmiss_0_19 … fgmiss_30_39` | field_goals_missed_by_distance | -3 … -1 |
| `def_td` | defensive_touchdowns | 6 |
| `pts_allow_*` | points_allowed_bucket | 10, 7, 4, 1, -1, -4 |
| `sack` | defensive_sacks | 1 |
| `int` | defensive_interceptions | 2 |
| `fum_rec` | fumble_recoveries | 2 |
| `safe` | safeties | 2 |
| `ff` | forced_fumbles | 1 |
| `blk_kick` | blocked_kicks | 2 |
| `idp_def_td` | idp_touchdowns | 6 |
| `idp_sack` | idp_sacks | 4 |
| `idp_qb_hit` | qb_hits | 0.5 |
| `idp_tkl_loss` | tackles_for_loss | 1 |
| `idp_int` | idp_interceptions | 6 |
| `idp_fum_rec` | idp_fumble_recoveries | 2 |
| `idp_ff` | idp_forced_fumbles | 4 |
| `idp_safe` | idp_safeties | 4 |
| `idp_tkl_ast` | assisted_tackles | 0.5 |
| `idp_tkl_solo` | solo_tackles | 1 |
| `idp_pass_def` | passes_defended | 1 |
| `bonus_fd_te` | first_downs_as_tight_end | 0.5 |
| `fum_lost` | fumbles_lost | -2 |
| `fum_rec_td` | fumble_recovery_touchdowns | 6 |

As chaves podem variar por esporte e configuração. O engine deve ignorar chaves desconhecidas com log de alerta, nunca quebrar o cálculo inteiro.

### Fórmula genérica
Para eventos lineares:
$$\text{score}(player) = \sum (\text{normalized\_stat}[event] \times \text{scoring\_settings}[rule\_key])$$

Para regras por faixa, como field goals por distância e pontos permitidos, selecione a chave do bucket antes de multiplicar. Não aplique simultaneamente `fgm` genérico e `fgm_40_49`; isso causaria dupla contagem.

### Implementação TypeScript
```typescript
type Stats = Record<string, number | undefined>;
type Scoring = Record<string, number | undefined>;

type Rule = {
  key: string;
  stat: string;
  label: string;
  transform?: (stats: Stats) => number;
};

const RULES: Rule[] = [
  { key: 'pass_yd', stat: 'passing_yards', label: 'Passing yards' },
  { key: 'pass_td', stat: 'passing_touchdowns', label: 'Passing TD' },
  { key: 'pass_2pt', stat: 'passing_2pt', label: 'Passing 2PT' },
  { key: 'pass_int', stat: 'interceptions_thrown', label: 'Interceptions' },
  { key: 'pass_int_td', stat: 'pick_sixes_thrown', label: 'Pick six thrown' },
  { key: 'pass_sack', stat: 'sacks_taken', label: 'Sacks taken' },
  { key: 'rush_yd', stat: 'rushing_yards', label: 'Rushing yards' },
  { key: 'rush_td', stat: 'rushing_touchdowns', label: 'Rushing TD' },
  { key: 'rush_2pt', stat: 'rushing_2pt', label: 'Rushing 2PT' },
  { key: 'rec', stat: 'receptions', label: 'Receptions' },
  { key: 'rec_yd', stat: 'receiving_yards', label: 'Receiving yards' },
  { key: 'rec_td', stat: 'receiving_touchdowns', label: 'Receiving TD' },
  { key: 'rec_2pt', stat: 'receiving_2pt', label: 'Receiving 2PT' },
  { key: 'fum_lost', stat: 'fumbles_lost', label: 'Fumbles lost' },
  { key: 'fum_rec_td', stat: 'fumble_recovery_touchdowns', label: 'Fumble recovery TD' },
  { key: 'idp_tkl_solo', stat: 'solo_tackles', label: 'Solo tackles' },
  { key: 'idp_tkl_ast', stat: 'assisted_tackles', label: 'Assisted tackles' },
  { key: 'idp_qb_hit', stat: 'qb_hits', label: 'QB hits' },
  { key: 'idp_tkl_loss', stat: 'tackles_for_loss', label: 'Tackles for loss' },
  { key: 'idp_pass_def', stat: 'passes_defended', label: 'Passes defended' },
  { key: 'idp_int', stat: 'idp_interceptions', label: 'IDP interceptions' },
  { key: 'idp_sack', stat: 'idp_sacks', label: 'IDP sacks' },
  { key: 'idp_ff', stat: 'idp_forced_fumbles', label: 'IDP forced fumbles' },
  { key: 'idp_fum_rec', stat: 'idp_fumble_recoveries', label: 'IDP fumble recoveries' },
  { key: 'idp_safe', stat: 'idp_safeties', label: 'IDP safeties' },
  { key: 'idp_def_td', stat: 'idp_touchdowns', label: 'IDP TD' },
  { key: 'bonus_fd_te', stat: 'tight_end_first_downs', label: 'TE first downs' },
];

function value(stats: Stats, key: string): number {
  const n = Number(stats[key] ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function calculatePlayerScore(stats: Stats, scoring: Scoring) {
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const rule of RULES) {
    const multiplier = Number(scoring[rule.key] ?? 0);
    const quantity = rule.transform ? rule.transform(stats) : value(stats, rule.stat);
    const points = quantity * multiplier;
    if (points !== 0) breakdown[rule.key] = points;
    total += points;
  }

  total += calculateKickingBuckets(stats, scoring, breakdown);
  total += calculateDefenseBuckets(stats, scoring, breakdown);

  return { total: roundHalfPoint(total), breakdown };
}

function roundHalfPoint(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
```

O código acima é o núcleo; implemente `calculateKickingBuckets` para escolher `fgm_0_19`, `fgm_20_29`, `fgm_30_39`, `fgm_40_49`, `fgm_50_59` e `fgm_60p` por distância, e `calculateDefenseBuckets` para escolher uma única faixa `pts_allow_*`. A mesma regra vale para misses de field goal.

### Cálculo de roster e matchup
```typescript
function calculateRosterScore(
  starters: string[],
  playerStats: Record<string, Stats>,
  scoring: Scoring,
  customPoints?: number | null,
) {
  if (customPoints != null) return { total: customPoints, source: 'custom_points' };

  const playerScores = starters.map((playerId) => {
    const result = calculatePlayerScore(playerStats[playerId] ?? {}, scoring);
    return { playerId, ...result };
  });

  return {
    total: roundHalfPoint(playerScores.reduce((sum, p) => sum + p.total, 0)),
    playerScores,
    source: 'calculated',
  };
}
```
O cálculo deve considerar somente `starters`, nunca todos os jogadores do roster. O banco não pontua. Se existir `custom_points` no matchup, preserve-o como fonte oficial para aquele time e marque a diferença entre `official_points` e `calculated_points`.

### Atualização em tempo real
Use este fluxo:
1. O worker busca ou recebe um snapshot de estatísticas.
2. Normaliza nomes do provedor para o vocabulário interno de `Stats`.
3. Calcula o jogador com a versão da configuração identificada por `scoring_hash`.
4. Recalcula apenas rosters que possuem aquele jogador como titular.
5. Publica um evento interno `player_score.updated`.
6. O backend atualiza matchup, standings e leaders.
7. O frontend recebe o delta via SSE ou WebSocket e atualiza somente os cards afetados.

Eventos recomendados:
```
player_stats.updated
player_score.updated
roster_score.updated
matchup_score.updated
game_status.changed
```
Use `source_event_id` ou `(provider, game_id, play_id, revision)` como chave idempotente. Estatísticas ao vivo podem sofrer correções; portanto, trate snapshots como revisáveis e reprocesse o período afetado em vez de apenas somar eventos cegamente.

---

## 11. Especificação detalhada de layout

### Estrutura visual
O layout observado é um shell de três colunas em desktop:

```
┌──────────────┬──────────────────────────────────┬──────────────────────┐
│ Sidebar      │ Header da liga + tabs            │ League Chat          │
│ persistente  ├──────────────────────────────────┤ persistente          │
│              │ Conteúdo da rota                 │                      │
│              │ matchup/team/league/...          │                      │
└──────────────┴──────────────────────────────────┴──────────────────────┘
```

Estrutura recomendada:
```tsx
<AppShell>
  <Sidebar />
  <MainColumn>
    <LeagueHeader />
    <LeagueNavigationTabs />
    <RouteContent />
  </MainColumn>
  <ChatPanel />
</AppShell>
```

### Design tokens
```css
:root {
  --bg-app: #171b2a;
  --bg-panel: #232a3d;
  --bg-panel-soft: #2b3348;
  --bg-input: #1d2435;
  --text-primary: #f5f7fb;
  --text-secondary: #9aa5bb;
  --text-muted: #6f7b91;
  --border: rgba(255,255,255,.08);
  --accent: #19e6c1;
  --positive: #39d98a;
  --warning: #f6c85f;
  --danger: #ff7182;
  --radius-sm: 6px;
  --radius-md: 10px;
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 24px;
  --space-6: 32px;
}
```
Use fundo escuro, painéis ligeiramente mais claros, texto primário de alto contraste e acento turquesa para tab ativa e ações principais. Status de atleta deve usar texto e ícone, não somente cor: Q para questionável, P para provável, OUT para fora e BYE para folga.

### Sidebar
No desktop, a sidebar deve ser fixa, estreita e rolável independentemente. Ela contém logo, mensagens, inbox, seção de ligas, liga ativa e perfil. A liga ativa precisa ter estado visual distinto e exibir resumo compacto do matchup atual.

No mobile, a sidebar vira drawer. O botão de abertura deve ser acessível por teclado, fechar com Escape e devolver foco ao botão que a abriu.

### Header e navegação
O header do conteúdo central deve exibir avatar da liga, nome, temporada/formato e um botão de configurações. A navegação usa tabs horizontais com rota persistente:
```
MATCHUP | TEAM | LEAGUE | PLAYERS | TREND | TRADES | SCORES
```
Em viewport estreito, as tabs devem ter rolagem horizontal sem quebrar linha. A tab ativa deve ser identificável por cor, sublinhado e `aria-current="page"`.

### Matchup cards
O card de confronto deve ter cabeçalho com dois times, owner, campanha, pontuação, percentual de vitória e indicador VS. A lista de jogadores deve usar linhas densas, com agrupadores de posição e separação entre starters e bench.

Cada linha deve ter esta hierarquia:
```
[avatar] [nome + posição/time] [status + jogo] [projeção] [pontos]
```
Em telas pequenas, adversário e horário ficam numa segunda linha; pontos permanecem alinhados à direita. Utilize skeleton loading por linha e estado vazio específico quando não houver jogadores.

### Team table
Use tabela semântica no desktop e cards empilhados no mobile. As colunas mínimas são slot, jogador, jogo, own percentage, start percentage e points. Os slots devem ser botões somente quando o usuário tem autorização para alterar lineup; caso contrário, renderize como texto.

### League page
Organize a tela em cards independentes: Matchups, Standings, Recent Activity e League Settings. Em desktop, matchups e standings podem ficar lado a lado; scoring settings deve usar grupos recolhíveis por categoria: Passing, Rushing, Receiving, Kicking, Defense, Special Teams, Misc e IDP.

### Players e Trend
Players deve ter toolbar fixa no topo do painel com posição, semana, Projection/Stats, lista e busca. A tabela precisa manter cabeçalho sticky, virtualização para milhares de jogadores e debounce de 150–250 ms na busca.

Trend deve usar duas colunas no desktop e uma coluna no mobile. O sinal da variação precisa ficar visualmente separado do valor de pontos projetados. Cada card deve permitir abrir o detalhe do jogador sem perder filtros.

### Trades
Trades deve usar cards de status. Diferencie visualmente PENDING, PROCESSES, OUTGOING e concluídas. Um trade card deve agrupar participantes, assets recebidos/enviados, picks e data. A ação TRADE precisa abrir uma etapa de revisão antes de qualquer submissão.

### Scores/Game Center
Use uma coluna lateral ou faixa horizontal de jogos por horário e um painel de líderes. Filtros de posição devem ser chips. Estados obrigatórios:
```
loading → pre_game → live → final → delayed/postponed
```
O componente deve mostrar última atualização e permitir atualizar manualmente sem recarregar a página inteira.

### Chat
O chat deve ocupar a altura disponível e ter rolagem interna. O composer permanece fixo no rodapé. Mensagens de sistema e mensagens de usuário devem ter componentes diferentes. Replies devem mostrar contexto da mensagem original. Anexos e GIFs devem carregar com fallback e limite de tamanho.

No mobile, o chat deve ser uma tela ou bottom sheet, não uma terceira coluna comprimida.

### Responsividade
Use três faixas de layout como ponto de partida:
```css
/* Desktop */
.app-shell {
  grid-template-columns: 152px minmax(520px, 1fr) 360px;
}

/* Tablet */
@media (max-width: 1100px) {
  .app-shell {
    grid-template-columns: 88px minmax(0, 1fr);
  }
  .chat-panel {
    position: fixed;
    inset: auto 16px 16px auto;
    width: min(420px, calc(100vw - 32px));
  }
}

/* Mobile */
@media (max-width: 720px) {
  .app-shell {
    display: block;
  }
  .sidebar {
    transform: translateX(-100%);
  }
  .main-column {
    width: 100%;
  }
  .chat-panel {
    inset: 0;
    width: 100%;
    border-radius: 0;
  }
}
```

### Acessibilidade e performance
- Navegação de tabs com `ArrowLeft`, `ArrowRight`, `Home` e `End`.
- `aria-live="polite"` para atualizações de pontuação, sem anunciar cada tick excessivamente.
- Contraste mínimo WCAG AA.
- Virtualização em Players e Activity.
- Imagens de avatar com lazy loading e dimensões reservadas.
- Atualizações por delta no WebSocket/SSE, evitando rerender da página inteira.
- Error boundary por painel, para que uma falha no chat não esconda o matchup.
- Data freshness visível em scores e pontuações ao vivo.

---

## Referências
- [Sleeper API Documentation](https://docs.sleeper.com/)
