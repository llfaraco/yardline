# Auditoria de referências e plano Yardline

**Escopo:** correção do pipeline canônico Sleeper, cards/dossiê e estados de UI no repositório atual. A documentação separa evidência de hipótese e não substitui observabilidade de produção.

## Achados confirmados

### OBSERVADO (reproduzido no código/testes)

- `numberOrNull`/persistência de projeções aceitavam containers ou strings vazias por coerção numérica; métricas indisponíveis viravam `0`. O contrato agora mantém **`null` para vazio/malformado** e preserva `0` somente quando a fonte o envia como número válido.
- `renderPlaybook` chamava `querySelectorAll` sem verificar DOM parcial. O renderer agora renderiza a base e ignora apenas o enriquecimento opcional quando a API DOM não existe.
- O catch de `getNflStats` transformava rejeição upstream em `{}`. O sync agora registra status por métrica (`available`, `empty`, `failed`) e o shell expõe `stats_fetch_failed` no DTO quando apropriado.
- Resposta de catálogo vazia não substitui catálogo persistido válido; o retorno preservado fica marcado como `stale`.
- O botão de atualização do catálogo usa `syncLiveSleeperApiPlayers`, que delega ao sync do shell canônico.
- `closeModal` agora é global, remove a classe `.open`, força `style.display = 'none'` e marca `aria-hidden=true`. Os testes cobrem player, article, onboarding, lineup-swap, waiver, checkout e manager-dna.
- O Playbook não usa nome de equipe legado quando não há roster canônico carregado; IDs e estado do shell permanecem a fonte de verdade.

### INFERIDO (decisão técnica baseada nos sintomas)

- Falha de métricas não deve falhar a sincronização completa de liga: o catálogo, rosters e histórico já persistidos devem continuar disponíveis enquanto a métrica recebe estado `failed` e retry posterior.
- Estados de loading/erro/retry e filtros de temporada/semana/métrica devem continuar no estado explícito do shell; o frontend não deve fazer fallback silencioso para dados estáticos.
- Pontos, projeções, IDs Sleeper/ESPN e notícia canônica precisam manter proveniência separada para que cards e dossiês não enriqueçam o DTO com heurísticas.

### NÃO VERIFICÁVEL neste sandbox

- Disponibilidade, latência e formato atual dos endpoints oficiais Sleeper em produção.
- Execução do worker NFL.com e freshness real do feed de notícias.
- Autorização do remoto GitHub neste ambiente: `git fetch origin main`/`git push` requerem credencial que não está disponível no processo não interativo.

## Backlog priorizado

### P0

1. Adicionar monitoramento/alerta para `metric_status_json=failed`, idade do último sync e divergência entre catálogo em memória e banco.
2. Exercitar em ambiente autenticado o sync real, retry/backoff e fallback de mídia; verificar estados PRE/LIVE/FINAL e freshness da fonte.
3. Remover gradualmente dados de demonstração restantes do frontend quando cada tela tiver um payload canônico equivalente, sem apagar o fluxo funcional atual.

### P1

1. Persistir e exibir filtros explícitos de season/week/metric no shell e nas rotas de histórico.
2. Acrescentar retry acionável e mensagens de erro por recurso nas telas pesadas, preservando o último snapshot válido.
3. Completar comparação explicável com consensus/projection/matchup/confidence apenas quando houver fonte/licença e proveniência verificáveis.
4. Expandir testes de contrato do shell para news canonical, media fallback, estados de matchup e concorrência de duas sincronizações.

## Evidência de validação desta alteração

- `npm test` no servidor: **22/22 passando**.
- `node --check` deve ser executado nos JavaScript alterados antes do commit.
- `git diff --check` deve permanecer limpo.
