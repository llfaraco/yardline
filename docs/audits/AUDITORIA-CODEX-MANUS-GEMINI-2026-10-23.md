# Auditoria do Yardline no GitHub — Codex, Manus e Gemini

**Data:** 2026-10-23  
**Repositório auditado:** https://github.com/llfaraco/yardline  
**Escopo:** somente leitura; nenhum push, merge ou alteração no GitHub foi executado.

## 1. Estado do GitHub

A `main` continua em `97fa2d6` (`fix: extend sync window and establish yardline visual identity`). A branch mais avançada encontrada é `fix/three-tabs-review`, em `c80bc1b`, com nove branches de trabalho abertas entre 20/10/2026 e a `main`.

A branch mais avançada **não está mesclada na main**. Portanto, o trabalho que o Codex produziu nas branches não é automaticamente o código que deve ser publicado ou monitorado como produção.

As branches formam uma sequência acumulativa aparente:

- `audit/stabilization` — preview local e banco isolado;
- `design/visual-foundation` — shell visual e navegação responsiva;
- `feature/player-career-dossier` — dossiê/histórico de atleta;
- `fix/league-page-consistency` — consistência de liga e reconciliação de pontos;
- `fix/league-monitor-and-cards` — lineups e monitor de paridade;
- `design/player-dossier-readability` — matchup e projeções da liga;
- `fix/overview-auto-refresh` — refresh coordenado;
- `fix/overview-data-states` — estados de disponibilidade/freshness;
- `fix/three-tabs-review` — revisão das três abas e remoção do ticker NFL simulado.

Os commits aparecem assinados pelo usuário `Lucas Faraco`; o metadata Git não prova se cada commit foi produzido pelo Codex, Gemini ou manualmente.

## 2. Validação executada

| Referência | Testes | Node check | Diff check |
|---|---:|---|---|
| `main` | 97/97 PASS | PASS | PASS |
| `fix/three-tabs-review` | 145/145 PASS | PASS | PASS |

Os testes são úteis, mas não equivalem a homologação visual real em navegador nem comprovam que todas as integrações externas estão disponíveis.

## 3. O que a linha de trabalho adicionou

A branch mais avançada adicionou um Command Center com política versionada para 15 papéis, handoffs, ciclos de monitoramento, gate de release e referências públicas. Também adicionou refresh automático da liga, comparação de paridade Sleeper contra snapshot local, histórico de jogador, projeções, estados `stale/offline/refreshing`, layouts de dossier e regressões adicionais.

A governança codificada é boa em pontos importantes: agentes observam e escrevem relatórios/handoffs; Manus é a única autoridade de implementação/publicação; o monitor não deve fazer push automático; ausência de dados deve ser `NOT_VERIFIABLE` ou `—`.

## 4. Riscos P0/P1 encontrados

### 4.1 As branches não chegam à produção

O risco operacional principal é trabalhar no Codex em uma branch enquanto a produção e a `main` permanecem em outra. Sem uma branch de integração controlada, o usuário pode olhar uma build e o Codex analisar outra.

### 4.2 Ainda existem legados de dados simulados no frontend/backend

A própria auditoria versionada do repositório registra mocks de produção e fallbacks inseguros em áreas como Start/Sit, Trade, Manager DNA, projections, rankings e matchup. A branch mais avançada removeu o ticker NFL simulado, mas isso não significa que todo o legado foi removido.

Há referências explícitas a `WEEK6_*`, `Semana 6`, valores fixos, `Manager DNA` e fórmulas que podem transformar ausência em zero ou em percentuais aparentando consenso externo. Esses pontos precisam ser tratados por superfície, não apenas por teste unitário.

### 4.3 Histórico do jogador usa endpoint não documentado

`player-history.service.js` usa `https://api.sleeper.com/stats/nfl/player/...`, descrito no próprio código como endpoint observado/não documentado. Deve permanecer rotulado como `observed_undocumented_endpoint`, com fallback honesto e sem ser apresentado como contrato público garantido.

### 4.4 Há defaults fixos que podem reintroduzir dados errados

Foram observados defaults como semana 6 em rotas de matchup e IDs/roster padrão em endpoints do Command Center. Mesmo que úteis para a liga atual, eles são perigosos quando a liga, temporada ou semana mudar. O backend deve exigir contexto explícito ou retornar indisponibilidade.

### 4.5 O auto-refresh existe, mas é polling, não integração contínua

O frontend usa refresh com intervalo inicial de 60 segundos e backoff até 5 minutos; o backend tem deduplicação/cooldown de 30 segundos para refresh automático. Isso é razoável para uma sessão aberta, mas não significa que agentes ou monitoramento estejam rodando 24/7. O daemon só funciona enquanto o runtime estiver ligado.

### 4.6 Não há integração real com Codex, Gemini ou OpenAI no código

A busca no repositório não encontrou cliente OpenAI/Codex, Gemini API, `GEMINI_API_KEY`, `OPENAI_API_KEY` ou um conector de modelo. O projeto tem modelos locais de domínio e texto `Coach AI` como UI/estado, mas não existe uma ponte técnica entre os três assistentes.

## 5. Decisão recomendada

Não fazer merge cego de `fix/three-tabs-review` na `main`. Criar uma branch de integração controlada, por exemplo `integration/codex-review-2026-10-23`, e selecionar os commits em ordem. Após cada bloco: testes, `node --check`, `git diff --check`, smoke HTTP e revisão de proveniência.

A ordem recomendada é:

1. infraestrutura e persistência;
2. sincronização Sleeper e estados stale/offline;
3. contratos de player card/histórico;
4. matchup e três abas;
5. frontend/design;
6. Command Center e monitor;
7. remoção final de mocks/fallbacks;
8. QA visual em navegador.

## 6. Integração sem explodir créditos

### Manus — autoridade e integração

Manus deve fazer auditoria de diffs, seleção de commits, execução de testes, revisão de proveniência, merge e publicação. Manus não precisa chamar outro modelo para cada arquivo.

### Codex — implementação sob demanda

Codex deve trabalhar somente em uma branch por tarefa, com escopo fechado e arquivos permitidos. Deve produzir PR/diff e rodar testes locais. Não deve publicar nem alterar `main` diretamente.

### Gemini — segunda opinião seletiva

Gemini deve atuar como revisor de alto nível em lotes: arquitetura, UX, segurança ou diff completo. Não deve ser chamado por arquivo, por polling ou a cada ciclo de refresh.

### Regra de custo

- Um modelo implementa.
- Um modelo revisa apenas mudanças de risco alto.
- Manus integra e decide.
- Monitoramento, testes e sincronização Sleeper são código determinístico, não chamadas de LLM.
- Nenhum modelo deve ser executado a cada minuto ou a cada atualização da liga.

## 7. Fluxo proposto

```text
Codex branch/PR
      ↓
GitHub Actions: tests + node check + diff policy
      ↓
Manus: provenance/security/release review
      ↓
Gemini: revisão seletiva (opcional, somente P0/P1 ou design)
      ↓
Manus merge na integration branch
      ↓
QA local e smoke
      ↓
Manus publica após aprovação explícita
```

Não existe integração automática entre as contas ChatGPT/Codex, Gemini e Manus nesta sessão. Ela pode ser construída por GitHub Actions, comentários/PR e artefatos versionados, ou por APIs/conectores autorizados. A alternativa mais segura e econômica é GitHub como barramento de colaboração, sem transmitir segredos ou snapshots privados aos modelos.
