# Auditoria e estabilização — 20/10/2026

Base: `97fa2d6ca0c4dcc1bf9994f096de1fd44a06a866`, branch `audit/stabilization`.
Esta entrega é o primeiro lote de estabilização. Não homologa produção, UX completa ou integrações autenticadas.

## Arquitetura e fluxos encontrados

- Frontend: SPA sem framework/bundler em `yardline-app/index.html`, `css/styles.css`, `js/data_and_views.js` e `js/engines.js`. Navegação por views, funções globais, modais e estado em localStorage. Há código legado desativado e implementações analíticas duplicadas.
- Contrato compartilhado de cards: `yardline-app/js/player-card-contract.js`, importado também pelo backend. DTOs em `server/src/contracts/dtos.js`; o contrato já distingue official/derived/cached/stale/unavailable/simulation e valores nulos.
- Backend: Express 5, ESM, Node >=22.13, SQLite nativo `node:sqlite`, CORS. Sem ORM. `server/src/server.js` reúne rotas de auth, Sleeper, catálogo/busca/perfil/histórico, ligas/elencos/confrontos/classificação, ferramentas, notícias, chat, cobrança e health; serve a SPA e o Command Center na porta padrão 3000. README ainda menciona 3001.
- Banco: users/external_accounts/sessions em memória; league_memberships, leagues, rosters, matchups/matchup_players; players/player_identities/player_stats/projections; transactions/traded_picks/drafts/draft_picks; news e vínculos; plans/subscriptions/payments/audit_events; sync_runs/sync_payloads/source_provenance. Esquema e migrações aditivas em `server/src/db/`.
- Dados NFL: conector Sleeper → normalização/sincronização → SQLite e payloads capturados → DTOs/cards → views. Catálogo tem TTL de 24h, refresh compartilhado em andamento e recuperação de catálogo persistido como stale.
- Notícias: `news-worker/nfl-news-worker.mjs` consulta NFL.com, mantém JSON e expõe HTTP na porta 8787; serviço de notícias importa/deduplica e associa atletas no SQLite. Worker é processo separado, não iniciado pelo backend.
- Operação: Command Center tem rotas/serviços/store JSON, checks de referências, JSDOM, ciclos finitos e scripts de monitoramento. Quinze papéis configurados não significam quinze agentes LLM ativos. Nenhum monitor contínuo foi instalado nesta auditoria.
- Protótipos alternativos: `sleeper-single-file.ts` e `sleeper-single-file-manus.ts`, snapshot JSON de aproximadamente 21 MB e dados locais de liga. Não constituem a mesma aplicação que o backend principal.
- Entrega: Dockerfile Node 22 com `npm ci --omit=dev`. O lockfile já era rastreado, mas declarava jsdom como devDependency enquanto o manifesto o exige em produção. Foi sincronizado, preservando versões resolvidas; a regra global que ignorava lockfiles foi removida.
- Não há pipeline de build do frontend nem configuração de CI versionada nesta base. Os testes usam `node:test`; vários exercitam DOM/serviços/fixtures, não um navegador real.

## Problemas corrigidos e evidências

| Problema | Evidência / correção | Regressão |
|---|---|---|
| Poda inválida no solver | A escolha gulosa de jogadores distintos para slots restantes era uma solução factível, não um limite superior. Caso determinístico 37: original 117, ótimo 119. Agora cada slot toma seu máximo entre jogadores ainda disponíveis, relaxando exclusividade entre slots futuros. Toda conclusão factível é limitada por essa soma. | `lineup-regression.test.js`: comparação com busca exaustiva independente em 500 grafos e verificação de exclusividade/elegibilidade. |
| Webhook permitia forjar pagamento | Rota supria `sandbox_test_signature` quando ausente e provider aceitava essa constante ou um segredo padrão público. Removidos ambos. HMAC-SHA256 agora exige segredo configurado e comparação constante; HTTP verifica bytes originais do JSON. | `billing-security.test.js`, `api-stabilization.test.js`; callback ausente/forjado não ativa plano, assinatura de bytes com espaços funciona. |
| Pagamentos fictícios apresentados como reais | Frontend gerava checkout offline e ativava plano local mesmo após callback falhar; havia referências a `plan`/`priceFormatted` fora do escopo. Removido fluxo e confirmação local. UI mostra indisponibilidade. Provider mock exige `PAYMENT_SANDBOX=true`, proíbe produção e identifica simulação. | Testes do provider e HTTP; sintaxe dos arquivos frontend/backend. |
| Estatísticas fixas de DNA/draft sem proveniência | Endpoints genéricos retornavam métricas de Faraco e ADPs fixos de atletas como dados correntes. Agora retornam indisponível, sem números inventados; rota contextual de DNA e persistência de drafts permanecem. | `api-stabilization.test.js`. |
| Filtro de elenco vazio retornava catálogo inteiro | `my_roster`, `opponent` e `rostered` só aplicavam restrição quando o conjunto tinha IDs. Agora conjunto vazio produz resultado vazio. | `search-empty-roster.test.js`. |
| Exaustão HTTP silenciosa no Sleeper | 429/5xx faziam `continue` até sair sem retorno/erro; falhas não abriam circuito. Agora rejeitam e contam falhas. Timer é limpo em finally e permanece ativo durante consumo JSON. | `sleeper-connector.test.js`: 429/500/503, circuito, timeout no corpo, 404. |
| Entradas de auth frágeis | Tipos incorretos/credenciais grandes alcançavam funções de string/scrypt; hash corrompido podia causar exceção de tamanho em timingSafeEqual. Validação anterior ao hash e validação de formato do hash. | Novos testes em `security.test.js`. |
| Comando de testes dependia de shell POSIX | `DATABASE_PATH=:memory:` não funciona no shell padrão Windows. Runner Node define ambiente e cwd; root passa a expor `npm test`. | Execução pela raiz no Windows com SQLite em memória. |

## Dados e limitações da integração

| Categoria | Tratamento observado |
|---|---|
| Origem externa | Ligas, usuários públicos, catálogo, elencos, matchups, transações e drafts recebidos da Sleeper; notícia com URL de origem. Origem não garante atualidade. |
| Derivado | Scoring por regras da liga, agregações semanais, VBD e DNA. Scoring existente rejeita chaves não suportadas em vez de completar com números fictícios. VBD ainda tem baselines heurísticas fixas. |
| Cache / histórico | SQLite, sync_payloads, catálogo em memória, snapshot JSON e relatórios históricos versionados. Snapshot não é evidência de estado atual. |
| Simulação | Escalação/localStorage, projeções customizadas, ferramentas locais e provider de pagamento opt-in. Não escrevem escalação no Sleeper. |
| Indisponível | Ausência de estatísticas/projeções ou regras não suportadas deve permanecer null/unavailable. DNA genérico, draft genérico e contratação agora explicitam indisponibilidade. |

A [documentação Sleeper](https://docs.sleeper.com/) consultada em 20/10/2026 declara API somente leitura, sem token, uso gratuito não comercial e necessidade de contato para licença comercial. Recomenda ficar abaixo de 1.000 chamadas/minuto e obter o catálogo no máximo uma vez/dia. O produto não pode prometer movimentações oficiais por essa API. Os métodos `/stats/nfl/...` e `/projections/nfl/...` no conector não fazem parte do catálogo público documentado consultado; sua estabilidade e autorização de uso não estão homologadas. Não foram tratados como contratos comerciais garantidos.

## Riscos confirmados ainda pendentes

1. **P1 — autorização de escrita:** ingestão de notícias, sync-league, POST de chat e disparo de ciclo operacional ainda têm superfícies públicas; chat aceita autor/providerUserId do cliente. Conectar um username Sleeper público não prova titularidade. É necessário definir identidade própria, associação verificada e autorização por recurso antes de expor essas operações.
2. **P1 — custo computacional:** solver síncrono recebe arrays sem orçamento de busca/limite de trabalho. Esta correção prova a admissibilidade da poda; não prova todos os contratos de entrada, pontuações negativas, escalação incompleta ou tempo de execução em elencos grandes.
3. **P1 — paridade analítica:** navegador ainda tem otimizador guloso independente e mensagens de “pontuação máxima”. Não deve ser homologado como equivalente ao backend. Simulações de escalação continuam locais.
4. **P1 — contexto de pontuação:** rankings/perfil genérico consultam projeção mais recente sem contexto completo de liga/formato; rankings numeram resultados sem ordenação explícita por projeção. A origem da projeção não equivale à pontuação oficial daquele formato.
5. **P1 — sessões/autenticação:** sessões em memória, scrypt síncrono, ausência de rate limit e política de senha mínima; falta recuperação, verificação de e-mail e persistência/revogação distribuída. Validação básica implementada não substitui estes requisitos.
6. **P1 — dados/UI legados:** semana/time/usuário/plano e alguns estados de disponibilidade ainda têm defaults fixos no shell. Texto “NFL Oficial” não comprova afiliação. A busca de waivers pode apresentar catálogo como livre quando não há dados de liga. Não houve declaração de limpeza completa de simulações.
7. **P1 — sandbox financeiro:** provider real não existe; mock não é um processador Pix válido. Transações atômicas e idempotência normalizada de eventos precisam ser reforçadas antes de um gateway real.
8. **P2 — robustez operacional:** política de Retry-After, retry de erros 4xx e limitação global de chamadas ainda precisam revisão. JSON operacional depende de replace atômico; EPERM foi reproduzido neste sandbox Windows até com dois arquivos mínimos.
9. Licenças/termos: repositório não tem licença declarada; direitos de conteúdo, imagens e fornecedores precisam revisão antes da comercialização.

## Referências de experiência e sequência seguinte

Somente pesquisa documental pública nesta etapa; nenhuma interação autenticada Sleeper/FantasyPros ou inspeção visual mobile foi alegada. Documentação do Sleeper descreve [estados de cards/notícias](https://support.sleeper.com/en/articles/4584482-league-legend) e [breakdown por card/confronto](https://support.sleeper.com/en/articles/4126744-how-can-i-see-my-player-s-points-breakdown). FantasyPros documenta [ferramentas por liga](https://www.fantasypros.com/nfl/myplaybook/intro) e [Start/Sit](https://www.fantasypros.com/nfl/myplaybook/football-start-sit-assistant.php). Isso orienta investigação posterior, não comprova paridade visual.

Próxima etapa de estabilização: fechar autorização de mutações, unificar solver e contexto de scoring, resolver execução de QA operacional no ambiente-alvo e adicionar CI. Depois: Player Dossier 2.0 com proveniência/freshness, estados de loading/erro/vazio, acessibilidade e design system próprio; gerenciamento de ligas/elencos; Matchup Center; Start/Sit; Trade; Waiver; rankings/projeções; dashboard. Evolução visual deve preservar o contrato compartilhado e ser validada em navegador real.

## Reprodução

Resultados neste ambiente:

- Baseline com os três arquivos de runtime restaurados temporariamente do commit base: oito falhas operacionais de replace atômico (`EPERM`); não foram convertidas em skips/PASS. A versão inicial do teste aleatório estava incluída nessa execução; a versão fortalecida reproduziu separadamente 117 versus 119 no solver original.
- Suíte final pela raiz: **109 testes, 101 PASS, 8 FAIL**, as mesmas oito falhas operacionais. Os logs incluem stack e arquivos de origem; um exemplo mínimo independente também retornou EPERM ao renomear sobre destino existente no temporário do sandbox.
- Regressões focadas finais: **17 testes, 17 PASS**, incluindo HTTP real em loopback, ausência/forja de assinatura, bytes originais, dados indisponíveis, auth, busca, Sleeper e solver.
- Instalação: 107 pacotes auditados, zero vulnerabilidades conhecidas reportadas pelo npm. Isso não substitui análise de autorização ou revisão manual de segurança.
- `node --check` passou nos arquivos alterados de servidor, conector e frontend; `git diff --check` passou.
- A tentativa inicial de validar `npm ci` no diretório existente encontrou EPERM; as dependências foram restauradas e todos os testes acima foram reexecutados após a restauração. A validação de instalação de produção foi separada para um diretório limpo.
- Não houve build de frontend (não há script), execução Docker, navegador real ou homologação de produção.

Arquivos de implementação modificados: `.gitignore`, `package.json`, `server/package.json`, `server/package-lock.json`, `server/scripts/test.js`, `server/src/server.js`, `server/src/modules/auth/auth.service.js`, `server/src/modules/billing/billing.service.js`, `server/src/modules/engines/lineup.solver.js`, `server/src/modules/players/players.service.js`, `server/src/modules/sleeper/sleeper.connector.js`, `yardline-app/js/data_and_views.js`.

Testes modificados/adicionados: `server/test/api.test.js`, `server/test/security.test.js`, `server/test/api-stabilization.test.js`, `server/test/billing-security.test.js`, `server/test/lineup-regression.test.js`, `server/test/search-empty-roster.test.js`, `server/test/sleeper-connector.test.js`. Este relatório também integra o PR.

```sh
npm --prefix server install --ignore-scripts
npm test
# Executado em Windows/PowerShell com Node v24.14.0 e npm 11.9.0.
# O runner isola DATABASE_PATH=:memory:; não usar scripts de seed/limpeza contra banco real.
```

Nenhuma implantação, alteração de credencial, migração sobre dados reais ou processo recorrente foi executado.
