# Plano Definitivo de Agentes e QA — YARDLINE

## 1. Objetivo do projeto

Construir o Yardline como uma plataforma fantasy profissional, confiável e funcionalmente completa, usando Sleeper, FantasyPros, NFL e Yahoo como referências de comportamento e fontes autorizadas de dados quando aplicável.

O objetivo não é copiar identidade proprietária, logos, textos, assets ou código de terceiros. O objetivo é reproduzir as capacidades que o usuário precisa:

- navegar por ligas e semanas;
- visualizar jogadores;
- pesquisar e filtrar;
- abrir detalhes;
- comparar atletas;
- acompanhar pontuação;
- entender projeções e histórico;
- consultar notícias;
- operar lineup, waiver e trade quando autorizado;
- receber feedback claro quando algo está carregando, vazio, desatualizado ou quebrado.

A identidade visual, os componentes, os textos, a arquitetura e os cálculos do Yardline devem ser próprios.

## 2. Regra central de qualidade

Nenhuma tela será considerada pronta apenas porque “parece bonita”. Uma entrega só passa quando:

1. o dado possui fonte e contexto;
2. o comportamento funciona com clique, teclado e mobile;
3. os estados de loading, vazio, erro e stale existem;
4. o backend e o frontend usam o mesmo contrato;
5. o QA Senior reproduz a tarefa como usuário real;
6. os testes automatizados passam;
7. o Team Leader aprova a integração;
8. não existem números, status ou confirmações inventados.

## 3. Estrutura definitiva de agentes

### 3.1 Team Leader / Engineering Manager

É o dono da integração técnica e da decisão final.

Responsabilidades:

- manter o roadmap e as prioridades P0/P1/P2;
- definir contratos entre frontend, backend e banco;
- impedir que agentes implementem soluções paralelas para a mesma função;
- revisar diffs e conflitos;
- receber os relatórios dos agentes de referência;
- receber os bugs do QA Senior;
- distribuir correções aos agentes responsáveis;
- bloquear releases que tenham falhas P0 ou P1;
- decidir o que é equivalente funcionalmente e o que não precisa ser pixel-perfect;
- aprovar commit, merge e release.

O Team Leader não deve aceitar frases como “deve funcionar”. Ele exige evidência:

```text
passos executados
resultado esperado
resultado observado
URL/rota
viewport
fonte do dado
logs/testes
arquivo e linha
status: PASS | FAIL | BLOCKED
```

### 3.2 Product Owner / Requirements Agent

Converte o objetivo do produto em tarefas verificáveis.

Para cada feature, deve definir:

- usuário;
- pré-condições;
- passos;
- resultado esperado;
- estados de erro;
- permissões;
- critérios de aceite;
- prioridade.

Não deve escrever mocks para esconder requisitos faltantes.

### 3.3 Sleeper Reference Agent

Monitora a experiência Sleeper em modo somente leitura e registra comportamento observável.

Escopo:

- league shell;
- roster;
- matchup;
- players;
- score;
- standings;
- transactions;
- draft;
- player detail;
- filtros e navegação;
- estados público, login, vazio e indisponível.

Para cada fluxo, registra:

- URL;
- viewport;
- estado de autenticação;
- clique executado;
- elemento acionado;
- resultado visual;
- mudança de rota;
- comportamento de loading;
- campos exibidos;
- o que não foi possível verificar.

Não deve usar endpoint privado, contornar login, CAPTCHA ou rate limit.

### 3.4 FantasyPros Reference Agent

Monitora FantasyPros somente como referência de experiência e análise fantasy.

Escopo:

- busca de jogadores;
- filtros;
- rankings;
- projeções;
- comparação;
- player detail;
- notícias e análise;
- paywall/login;
- tabelas;
- tabs;
- tooltips;
- estados vazios;
- responsividade.

Deve separar claramente:

```text
observado
inferido
não verificável
```

Não deve afirmar que auditou FantasyPros se a aba aberta estiver em outro domínio ou em outra página.

### 3.5 NFL News Reference Agent

Monitora fontes públicas e autorizadas de notícias NFL.

Responsabilidades:

- identificar estrutura de feed;
- título;
- resumo;
- autor;
- fonte;
- timestamp;
- imagem;
- canonical URL;
- categorias;
- paginação;
- estado de notícia indisponível;
- duplicação e dedupe.

Não deve copiar conteúdo editorial integral. O Yardline deve armazenar apenas o necessário, atribuir a fonte e apontar para a notícia original.

### 3.6 Yahoo News Reference Agent

Faz o mesmo trabalho para Yahoo, verificando:

- feed;
- cards;
- destaque;
- fontes;
- timestamps;
- agrupamento;
- links;
- filtros;
- paginação;
- comportamento mobile;
- diferenças em relação ao feed NFL.

Não deve misturar automaticamente uma notícia Yahoo com uma notícia NFL sem preservar `source`, `canonicalUrl` e `publishedAt`.

### 3.7 Senior QA / E2E Tester

Este é o agente mais importante depois do Team Leader.

Ele atua como um usuário real. Não faz uma inspeção superficial de HTML. Ele:

- abre o sistema;
- clica nos botões;
- troca abas;
- pesquisa jogadores;
- aplica filtros;
- abre dossiers;
- compara jogadores;
- muda semana;
- abre notícias;
- testa voltar/avançar do navegador;
- recarrega a página;
- testa mobile;
- testa teclado;
- força respostas vazias;
- testa timeout, erro e stale;
- compara o resultado com a matriz de comportamento;
- registra exatamente onde está diferente ou quebrado.

O QA Senior tem autoridade para bloquear uma entrega.

Ele deve responder de forma objetiva:

```text
PASSOU
FALHOU
BLOQUEADO
NÃO VERIFICÁVEL
```

Nunca deve suavizar um erro com “quase igual”.

### 3.8 Backend / API Lead

Responsável por:

- gateway Yardline;
- integração Sleeper;
- ingestão de notícias;
- autenticação;
- autorização;
- rate limit;
- retry;
- cache;
- snapshots;
- DTOs;
- health checks;
- logs;
- erros HTTP;
- contratos versionados.

Regra: o browser não chama diretamente Sleeper, NFL ou Yahoo no fluxo principal. O browser chama o backend Yardline.

### 3.9 Data Engineer / Database Lead

Responsável por:

- schema;
- migrations;
- snapshots;
- raw payloads;
- dados normalizados;
- proveniência;
- índices;
- retenção;
- dedupe;
- idempotência;
- histórico;
- crosswalk Sleeper/ESPN/GSIS/nflverse.

Separar sempre:

```text
raw provider data
normalized data
derived metrics
simulation data
user preferences
Yardline messages
```

### 3.10 Scoring and Fantasy Rules Engineer

Responsável por:

- Standard;
- Half PPR;
- PPR;
- IDP;
- kicking;
- defensive scoring;
- bônus;
- penalidades;
- custom points;
- titular versus banco;
- taxi/reserve;
- breakdown auditável.

Se uma regra não for suportada, deve retornar:

```json
{
  "points": null,
  "status": "unsupported",
  "reason": "regra não implementada"
}
```

Zero observado é diferente de dado indisponível.

### 3.11 Frontend Lead

Responsável por:

- shell;
- rotas;
- tabs;
- cards;
- dossier;
- matchup;
- standings;
- players;
- trends;
- trades;
- waivers;
- chat;
- busca;
- filtros;
- URL state;
- loading/error/empty/stale;
- responsividade.

Não deve criar uma segunda fonte de dados no JavaScript.

### 3.12 Design System / UI Lead

Responsável por:

- tokens;
- tipografia;
- cores;
- espaçamento;
- ícones SVG;
- densidade;
- hierarquia;
- cards;
- tabelas;
- modais;
- tabs;
- responsive grid;
- estados visuais.

Critério visual:

> Profissional, sóbrio, denso, claro e orientado à decisão. Nunca infantil, improvisado ou dependente de emojis para navegação.

### 3.13 Accessibility and Interaction Agent

Valida:

- teclado;
- foco;
- leitores de tela;
- `aria-*`;
- semântica;
- focus trap;
- Escape;
- contraste;
- zoom 200%;
- touch target;
- reduced motion;
- mensagens anunciáveis.

### 3.14 Security and Privacy Agent

Valida:

- ownership da liga;
- autorização de escrita;
- chat;
- PII;
- tokens;
- cookies;
- CORS;
- rate limit;
- enumeração de ligas;
- logs;
- exposição de dados de terceiros.

### 3.15 DevOps / Release Agent

Responsável por:

- build;
- CI;
- migrations;
- health check;
- deploy;
- rollback;
- secrets;
- backup;
- logs;
- banco operacional fora do Git.

## 4. Fluxo obrigatório de trabalho

Nenhum agente deve trabalhar de forma indefinida ou editar o mesmo arquivo sem coordenação.

```text
Reference Agent observa
        ↓
Product Owner transforma em requisito
        ↓
Team Leader prioriza
        ↓
Backend/Data implementam contrato e dados
        ↓
Frontend/Design implementam a superfície
        ↓
Senior QA usa a feature de ponta a ponta
        ↓
QA registra bugs reproduzíveis
        ↓
Team Leader distribui correções
        ↓
QA reexecuta os testes
        ↓
Security/Accessibility revisam quando aplicável
        ↓
CI passa
        ↓
Team Leader aprova release
```

## 5. Matriz de equivalência

“Estar igual” será medido por quatro dimensões.

### 5.1 Igualdade funcional

A mesma tarefa deve ser possível com quantidade de passos equivalente ou melhor:

- encontrar um jogador;
- abrir seus detalhes;
- entender seu status;
- ver projeção e histórico;
- comparar jogadores;
- filtrar resultados;
- navegar por semana;
- voltar sem perder contexto;
- entender erro ou ausência de dados.

### 5.2 Igualdade comportamental

O Yardline deve ter estados equivalentes, mas com identidade própria:

- loading;
- carregado;
- vazio;
- erro;
- stale;
- login necessário;
- ação em andamento;
- ação concluída;
- ação falha;
- dado oficial;
- dado derivado;
- simulação.

### 5.3 Igualdade de informação

Os campos necessários devem existir e estar contextualizados:

- jogador;
- posição;
- time;
- status;
- liga;
- temporada;
- semana;
- scoring format;
- projeção;
- pontuação;
- PPG;
- histórico;
- fonte;
- atualização;
- cobertura.

### 5.4 Identidade visual própria

Não é requisito copiar pixel por pixel:

- marca;
- logo;
- mascote;
- fonte proprietária;
- ícone proprietário;
- texto editorial;
- imagem;
- CSS;
- layout proprietário.

A referência serve para entender o fluxo. O Yardline terá sua própria linguagem visual.

## 6. Teste padrão do QA Senior

Para cada fluxo, o QA deve executar:

### Entrada

- abrir rota;
- verificar estado inicial;
- registrar URL e viewport;
- verificar console;
- verificar network do Yardline.

### Uso

- clicar em cada ação visível;
- usar teclado;
- preencher busca;
- mudar filtros;
- trocar semana;
- abrir detalhe;
- voltar;
- recarregar;
- testar ação repetida;
- testar estado lento.

### Dados

- confirmar fonte;
- confirmar timestamp;
- confirmar temporada;
- confirmar semana;
- confirmar formato;
- confirmar que `null` não virou zero;
- confirmar que ausência não virou “Saudável”.

### Responsividade

Executar em:

```text
360 × 800
390 × 844
768 × 1024
1024 × 768
1280 × 1100
1440 × 900
```

### Resultado

Cada teste termina com:

```text
Status: PASS | FAIL | BLOCKED | NOT_VERIFIABLE
Severidade: P0 | P1 | P2 | P3
Passos:
Esperado:
Observado:
Evidência:
Arquivo/rota afetada:
Owner:
Próximo teste:
```

## 7. Severidade dos bugs

### P0 — bloqueia release

- tela não abre;
- erro JavaScript fatal;
- dados de outro roster aparecem como meu time;
- pontuação oficial é falsa;
- ação informa sucesso quando falhou;
- autorização quebrada;
- dados pessoais expostos;
- sync destrói snapshot válido;
- card inventa projeção ou status médico.

### P1 — bloqueia feature

- busca não funciona;
- filtro não mantém contexto;
- dossier mostra dados errados;
- tabs quebradas;
- mobile inutilizável;
- histórico com formato errado;
- notícia sem fonte ou link incorreto;
- erro sem retry.

### P2 — degrada qualidade

- desalinhamento;
- hierarquia visual fraca;
- tooltip inconsistente;
- espaçamento irregular;
- tabela pouco densa ou pouco legível.

### P3 — melhoria futura

- animação;
- microinteração;
- otimização não crítica;
- refinamento visual sem impacto funcional.

## 8. Contratos obrigatórios

Toda tela deve consumir DTOs canônicos.

### PlayerCardDTO

```json
{
  "id": "sleeper-player-id",
  "identity": {
    "sleeper": "...",
    "espn": "...",
    "gsis": "..."
  },
  "name": "Nome",
  "position": "WR",
  "team": "KC",
  "injuryStatus": null,
  "rosterContext": [],
  "metrics": {
    "points": null,
    "projectedPoints": null,
    "pointsPerGame": null,
    "totalPoints": null
  },
  "source": {
    "catalog": "sleeper",
    "points": null,
    "projection": null
  },
  "context": {
    "season": "2026",
    "week": 6,
    "seasonType": "regular",
    "scoringFormat": "LEAGUE",
    "pointsUnavailableReason": "stats_unavailable"
  },
  "dataStatus": "partial"
}
```

### Estados permitidos

```text
not_synced
loading
synced
partial
stale
empty
unavailable
error
simulation
```

## 9. Critérios de aceite da primeira fase

A primeira fase só passa quando:

- existe um único resolver ativo;
- não há fallback para roster 2 ou primeiro roster;
- `injuryStatus: null` permanece desconhecido;
- `projection: null` permanece desconhecida;
- stats vazias não viram zero;
- zero observado continua zero;
- ESPN ID ausente não usa Sleeper ID como ESPN;
- taxi e reserve são preservados;
- card e dossier usam o mesmo DTO;
- season type não é alterado silenciosamente;
- stats/projections têm status de disponibilidade;
- sync falho não substitui último snapshot bom;
- os testes automatizados passam;
- o QA Senior executa os fluxos de player card e dossier;
- nenhum P0 permanece aberto.

## 10. Critérios de aceite final

O Yardline só será considerado pronto quando:

- todas as rotas principais passarem no smoke test;
- Sleeper, FantasyPros, NFL News e Yahoo News tiverem matrizes de referência documentadas;
- o Senior QA executar os fluxos críticos em desktop, tablet e mobile;
- frontend não fizer chamadas diretas indevidas a provedores;
- dados tiverem proveniência;
- scoring tiver breakdown e cobertura das regras suportadas;
- falhas forem explícitas e recuperáveis;
- acessibilidade básica passar;
- segurança e permissões forem revisadas;
- CI passar;
- banco operacional não estiver versionado no Git;
- Team Leader aprovar a release.

## 11. Regra final para o Team Leader

O Team Leader deve preferir:

```text
correto e honesto
```

em vez de:

```text
preenchido e falso
```

Se o Sleeper não fornece uma projeção, o Yardline deve mostrar “Indisponível” ou uma projeção própria claramente identificada como derivada. Se uma notícia não puder ser atribuída, ela não deve ser apresentada como oficial. Se uma ação falhar, o sistema deve dizer que falhou.

A plataforma será considerada superior quando for mais confiável, explicável, fluida e consistente — não quando for apenas uma cópia visual.
