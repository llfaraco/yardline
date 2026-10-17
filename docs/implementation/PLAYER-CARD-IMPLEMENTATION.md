# PLAYER CARD — rodada de confiabilidade

## Auditoria e plano (antes da implementação)

Base: `257fa16` / `95fd079`; working tree limpo. Layout preservado.

1. Contrato compartilhado: normalizar catálogo Sleeper e construir um único DTO para catálogo, shell, card e dossier; ausência é `null`, não zero nem dado demonstrativo.
2. Persistência incremental: migração idempotente para lesão, catálogo normalizado e taxi; gravar identidades Sleeper/ESPN verificadas. Testes exclusivamente em memória.
3. Shell: métricas por temporada até a semana selecionada, proveniência/formato explícitos; projection-only não causa TypeError e payload vazio não cria métricas. Posse usa owner ID/nome exato, sem escolher silenciosamente roster 2/primeiro.
4. UI: conservar card e layout do dossier final; retirar mistura com dossiers estáticos, projeção heurística e zeros de matchup. Desativar os resolvers/pipelines diretos concorrentes, sem outro override global.
5. Validar contrato, persistência, shell HTTP e scripts reais em VM com fixtures saneadas do snapshot local; executar `node --check`, `npm test`, novos testes e `git diff --check` antes de commit/push.

## Estrutura

- `yardline-app/js/player-card-contract.js`: contrato puro compartilhado (CommonJS no Node, namespace no browser).
- `server/src/modules/players/player-card.service.js`: leitura persistida, métricas e contexto de liga/histórico.
- `server/src/modules/sleeper/sleeper.sync.js` e `server/src/db`: ingestão e migração.
- `yardline-app/js/data_and_views.js` e `engines.js`: renderers existentes e carregamento do shell.
- `server/test`: fixtures e regressões isoladas.

## Decisões e limites

- Pontos derivados usam regras da liga **somente quando o engine suporta todas as regras não-zero**; caso contrário permanecem indisponíveis. `pts_ppr` não é pontuação customizada da liga.
- PPG é média de semanas com estatística observada, não uma alegação de jogos completos; total é parcial até a semana selecionada. Contexto e UI indicam essa cobertura.
- Projeções publicadas Sleeper mantêm seu próprio formato (PPR/HALF_PPR/STANDARD); não são convertidas heuristicamente para a liga.
- O dossier visual final é conservado. O dossier V2 concorrente e resolvers diretos/heurísticos ficam inativos. Superfícies legadas de trade/AI/onboarding permanecem para migração separada; não podem enriquecer cards/dossier.
- Snapshot atômico de toda a liga e reconciliação completa do scoring são uma próxima rodada: este recorte não afirma resolvê-los. O shell deve expor falha recente honestamente.
- Nenhum navegador, redesign, endpoint externo de escrita ou edição do DB rastreado.
