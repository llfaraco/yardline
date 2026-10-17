# Auditoria técnica do YARDLINE

**Data:** 15/10/2026  
**Repositório:** `llfaraco/yardline`  
**Escopo:** frontend `yardline-app`, backend `server`, worker `news-worker`, integração Sleeper, scoring, persistência, layout e execução.

## 1. Veredito executivo

O projeto está em estado de **protótipo funcional/híbrido**, não de implementação final equivalente ao sistema auditado do Sleeper. Há uma base boa de domínio — autenticação, banco SQLite, solver combinatório, VBD e cliente Sleeper — e os testes existentes passam. Porém, a aplicação não possui ainda um fluxo fechado de produção:

```text
Sleeper -> sincronizador -> banco -> API Yardline -> React/UI
```

Na prática, existem três fontes de estado concorrentes:

1. dados estáticos grandes embutidos no frontend;
2. chamadas diretas do browser para `api.sleeper.app`;
3. backend/banco local parcialmente sincronizado.

Por isso, a tela pode exibir uma coisa, o backend armazenar outra e o scoring não ter os dados necessários para recalcular a pontuação ao vivo.

## 2. Evidências reproduzidas

- `npm test` no backend: **5 testes aprovados, 0 falhas**.
- Backend inicializa e responde `200` em `/api/health`, `/api/state/nfl`, `/api/waivers` e `/api/rankings`.
- `/api/leagues` retorna `401` sem sessão, portanto a autenticação de algumas rotas está ativa.
- Os endpoints Sleeper usados no frontend responderam `200` durante a auditoria: `state/nfl`, `stats/nfl/2026/6` e `projections/nfl/2026/6`.
- O frontend contém aproximadamente **563 KB** entre HTML, CSS e JavaScript, incluindo dados de jogadores, lineups e notícias estáticas.
- Há **27 usos de `localStorage`** e **23 chamadas `fetch`** nos scripts do frontend.
- `engines.js` contém múltiplas camadas de override para `syncRealSleeperLeagueLive`, `renderLeagueView`, `renderPlaybookView` e outras funções. A função final em torno das linhas 2274–2295 substitui as implementações anteriores.

## 3. Problemas críticos — P0

### P0.1 — UI não usa o backend como fonte principal

**Evidência:** `yardline-app/js/engines.js`, blocos de sincronização em torno das linhas 2201–2295.

A UI chama diretamente:

- `https://api.sleeper.app/v1/league/:id`
- `/users`
- `/rosters`
- `/matchups/:week`
- `/traded_picks`
- `/players/nfl`
- `/state/nfl`

Isso ignora as rotas autenticadas e a persistência do backend. A sincronização oficial existente no servidor não é o caminho normal de leitura da aplicação.

**Impacto:** cache inconsistente, duplicação de regras, CORS/dependência externa no browser, dificuldade de auditoria e impossibilidade de garantir que todos os usuários vejam o mesmo snapshot.

**Correção:** o browser deve chamar somente `/api/*`. O servidor deve consultar/cachear Sleeper e devolver um DTO estável para a UI.

### P0.2 — Scoring ao vivo não está implementado de ponta a ponta

**Evidência:** `server/src/modules/engines/vbd.engine.js` calcula VBD sobre projeções; `server/src/modules/engines/lineup.solver.js` otimiza projeções. Não existe no fluxo de sincronização um motor que leia estatísticas da semana, aplique `scoring_settings` por evento e grave o breakdown por jogador em `matchup_players`.

O frontend mostra `points`/`custom_points` retornados pelo Sleeper em alguns trechos e usa `proj`, `avgPpr` e `totalPts` de objetos estáticos em outros.

**Impacto:** a promessa de pontuação em tempo real não é cumprida. Não há explicação auditável de como cada recepção, jarda, tackle, sack, interceptação ou touchdown chegou ao total.

**Correção:** criar um `ScoringEngine` no backend com:

1. snapshot bruto de stats por jogador/semana;
2. normalização de nomes de eventos;
3. aplicação da configuração da liga;
4. breakdown por categoria;
5. total de jogador e roster;
6. comparação contra `custom_points`/`points` do Sleeper;
7. idempotência por `league_id + week + player_id + stats_hash`.

### P0.3 — Dados de transações são lidos, mas não persistidos como domínio

**Evidência:** `server/src/modules/sleeper/sleeper.sync.js`, aproximadamente linhas 496–503 e 561–600. O sincronizador busca transactions e incrementa `recordsRead`, mas o schema não possui uma tabela equivalente para transações e não há upsert completo no fluxo.

**Impacto:** Manager DNA, histórico de trades, waiver history e auditoria de FAAB não são reconstituíveis depois de uma execução. A resposta pode depender apenas de uma consulta recente ao endpoint.

**Correção:** adicionar `transactions` e `transaction_items`, com `provider_transaction_id`, semana, tipo, roster envolvidos, adds, drops, waiver bid, timestamp, payload bruto e hash idempotente.

### P0.4 — `matchup_players` e projeções não fecham o ciclo

**Evidência:** `server/src/db/schema.sql` possui `matchup_players` e `projections`, mas o sincronizador não demonstra um preenchimento completo dessas tabelas a partir de `matchups/:week`, `stats` e `projections`.

**Impacto:** o schema sugere granularidade por atleta, mas as rotas de matchup trabalham sobretudo com score agregado de cada roster.

**Correção:** persistir cada atleta do matchup, slot, titularidade, pontos oficiais, pontos recalculados, projeção, status e breakdown.

## 4. Problemas altos — P1

### P1.1 — Estado mockado ainda é parte do runtime

**Evidência:** `server/src/modules/engines.js`, início do arquivo, define lineup inicial, bench e reserve estáticos. `data_and_views.js` possui fallback para `YL_ALL_NFL_PLAYERS`, `YL_PLAYER_DOSSIERS`, nomes de liga, Semana 6 e usuário Faraco. O HTML/JS embute grande quantidade de dados de jogadores e notícias.

Mesmo quando a sincronização real falha, a tela pode continuar parecendo preenchida.

**Correção:** remover dados de domínio do bundle; manter somente estado vazio explícito (`loading`, `not_synced`, `error`). Dados de demonstração devem ficar em fixture/teste separado.

### P1.2 — Múltiplos overrides tardios tornam o comportamento não determinístico

**Evidência:** `engines.js` atribui várias vezes `window.syncRealSleeperLeagueLive` e também reatribui renders em blocos V2, V3, P0/P1 e FIX. A última definição determina o comportamento e torna as anteriores parcialmente mortas.

**Impacto:** correções em uma função podem não surtir efeito; callbacks capturam versões antigas; bugs são difíceis de reproduzir.

**Correção:** uma função por responsabilidade, módulos ES, store único e composição explícita. Remover patches sequenciais.

### P1.3 — Seleção da semana foi corrigida apenas em uma camada

A implementação final usa `state/nfl.week`, mas camadas anteriores usam `league.settings.leg` ou `last_scored_leg`, e há variáveis/fallbacks com `activeRealMatchupWeek6`. Isso permite que componentes diferentes renderizem semanas diferentes.

**Correção:** `activeNflState` deve ser a fonte para semana global; uma liga pode ter leg/week próprio, que deve ser resolvido uma vez no backend e enviado em um DTO.

### P1.4 — Rota de sincronização depende de pré-condição implícita

O servidor tem fluxo de sincronização de liga que pressupõe que a liga já foi registrada/encontrada no banco. O onboarding e o botão de sync não deixam essa pré-condição clara.

**Correção:** tornar o comando idempotente: `upsert league -> users -> rosters -> matchups -> transactions -> stats`, retornando etapas e erros por etapa.

### P1.5 — Rotas de leitura têm política de autenticação inconsistente

O smoke test confirmou `/api/leagues` como `401`, mas `/api/waivers` e `/api/rankings` responderam `200` sem sessão. Isso pode ser intencional para catálogo público, mas não está separado por política/documentação.

**Correção:** marcar rotas explicitamente como `public`, `authenticated` ou `league-member`; nunca deixar isso implícito no middleware.

### P1.6 — Layout não corresponde ao shell de referência

A referência auditada é orientada a liga, com navegação de liga, tabs de Matchup/Team/League/Players/Trend/Trades/Scores, conteúdo central e chat lateral persistente. O projeto atual tem um produto diferente:

- tema claro em estilo dashboard/FantasyPros;
- rail com Dashboard, Playbook, Waivers, Trade Analyzer, Rankings, IA, Planos;
- banners de marketing e Planos Pix na navegação principal;
- não há um painel persistente equivalente ao League Chat do Sleeper;
- não há correspondência 1:1 das tabs de liga;
- `view-home`, `view-playbook`, `view-trade`, `view-plans` etc. são rotas internas do YARDLINE, não as telas do shell auditado.

**Correção:** separar o produto em `LeagueShell` e módulos de inteligência. O shell deve ter:

1. rail global;
2. seletor de liga;
3. header contextual com temporada/semana;
4. tabs Matchup, Team, League, Players, Trend, Trades, Scores;
5. coluna central responsiva;
6. chat da liga em coluna direita;
7. drawers/modals para player details, trade e waiver.

## 5. Problemas médios — P2

### P2.1 — Persistência local conflita com estado remoto

`localStorage` grava lineup e bench. Isso é adequado para preferências temporárias, mas não pode ser a fonte de verdade para escalação de uma liga sincronizada. Após troca de dispositivo, o usuário pode ver uma escalação diferente da registrada no Sleeper.

**Correção:** usar localStorage somente para filtros e preferências; lineup oficial vem do roster sincronizado. Alterações reais devem usar uma operação de escrita suportada ou ser declaradas como simulação.

### P2.2 — Trades/waivers são parcialmente simulados

A interface contém ações como “reivindicação simulada”, exportação de proposta e simulador de trade. Isso é válido como produto analítico, mas deve ficar visualmente separado de ações oficiais. A API pública do Sleeper é essencialmente usada como leitura no projeto.

**Correção:** usar estados `simulation`, `draft`, `submitted` e `official`; nunca apresentar simulação como mutação efetivada.

### P2.3 — Dados de notícias têm caminho independente

O dossier de jogador consulta `http://127.0.0.1:8787/api/news` diretamente do browser. Em produção isso falha para qualquer cliente que não esteja no mesmo host.

**Correção:** publicar o worker atrás do backend (`/api/news`) ou configurar uma URL pública por ambiente; nunca hardcodar loopback no frontend.

### P2.4 — Imagens dependem de ESPN/Sleeper diretamente

Logos e fotos são montados em URLs externas no browser. Falhas de CDN, hotlink e mudanças de URL quebram a UI.

**Correção:** criar camada de asset resolver e fallback; opcionalmente cachear/servir imagens próprias.

### P2.5 — Cobertura de testes não cobre o contrato do sistema

Os cinco testes atuais cobrem auth/billing, solver, VBD e news. Não há testes de contrato para:

- sync idempotente;
- payload real Sleeper;
- matchup com dois rosters;
- scoring por posição/IDP;
- cálculo de week/state;
- auth de cada rota;
- renderização do DTO consumido pela UI.

## 6. Arquitetura recomendada

```text
[Sleeper API]
   | polling com backoff + rate limit
   v
[SleeperSyncService]
   | raw payload + normalização + hash idempotente
   v
[(leagues, users, rosters, players, matchups, matchup_players,
  transactions, traded_picks, stats, projections)]
   |
   +--> [ScoringEngine] --> [score_breakdowns / roster scores]
   |
   +--> [Analytics: VBD, lineup solver, trends, manager DNA]
   v
[YARDLINE API - DTOs por liga/semana]
   v
[React LeagueShell]
```

Regras importantes:

- O backend é a única fonte de dados do frontend.
- Cada sync grava `source`, `fetched_at`, `season`, `week` e `payload_hash`.
- Toda tela recebe `dataStatus`: `loading`, `synced`, `stale`, `error`.
- Pontuação oficial e pontuação recalculada ficam lado a lado.
- O frontend não contém dados de liga, jogador ou notícia hardcoded.

## 7. Plano de correção em ordem

### Fase 1 — eliminar inconsistência

1. Criar `GET /api/leagues/:id/shell?week=current` como DTO único.
2. Substituir fetch direto do frontend por cliente `yardlineApi`.
3. Remover os overrides duplicados de `engines.js`.
4. Retirar lineup/mock de runtime e mover para fixtures.
5. Corrigir news para rota do backend.

### Fase 2 — completar sincronização

1. Upsert de players/catalog e estado NFL.
2. Upsert de rosters/users/matchups.
3. Persistência de `matchup_players`.
4. Persistência de transações e picks negociadas.
5. Persistência de stats/projections com cache por temporada/semana.
6. Lock/idempotência para impedir duas sincronizações concorrentes.

### Fase 3 — scoring real

1. Implementar eventos ofensivos, kicking, DST e IDP.
2. Usar `scoring_settings` da liga, sem hardcode PPR.
3. Calcular breakdown por jogador.
4. Calcular roster e confronto.
5. Validar contra pontuação oficial do Sleeper com tolerância documentada.
6. Adicionar testes com fixtures reais anonimizadas.

### Fase 4 — reconstruir o shell

1. Implementar tabs equivalentes à referência.
2. Criar chat lateral e estado de liga.
3. Fazer layout responsivo desktop/tablet/mobile.
4. Separar IA/analytics em módulos dentro das telas de liga.
5. Remover marketing/plano da navegação principal do shell.

## 8. Critério de aceite

O sistema só deve ser considerado alinhado quando:

- recarregar a página em outro dispositivo reproduz o mesmo roster sincronizado;
- o browser não chama `api.sleeper.app` diretamente;
- uma execução de sync repetida não duplica linhas;
- um matchup mostra score oficial, score recalculado e breakdown por atleta;
- mudar a semana altera todas as telas de forma consistente;
- transactions, traded picks, players e projections aparecem com timestamp da fonte;
- cada tab da referência tem uma rota/componente equivalente;
- uma falha da API mostra estado de erro/stale, e não dados antigos apresentados como atuais;
- os testes incluem contratos de sync, scoring e autenticação das rotas.

## Conclusão

O código atual não está “quase igual” por uma diferença visual pequena. Ele mistura um dashboard analítico YARDLINE com uma réplica parcial do shell Sleeper. A próxima etapa correta é **refatorar a fronteira de dados e o shell**, não continuar adicionando patches no `engines.js`. Depois disso, o scoring e as telas passam a consumir o mesmo estado e o comportamento deixa de depender de mocks, `localStorage` e overrides de ordem de carregamento.
