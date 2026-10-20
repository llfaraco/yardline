# YARDLINE — Portal Oficial NFL & Camada de Inteligência Operacional

## Desenvolvimento local com atualização automática

Na raiz do repositório, execute `npm run dev` e abra `http://127.0.0.1:3000/`.
Frontend e API usam a mesma origem. Alterações salvas no frontend recarregam a
página automaticamente; alterações em `server/src` reiniciam o backend.
O banco local fica em `server/data/local-development/yardline.db`, ignorado pelo
Git e separado do banco padrão. Para outra porta, defina `PORT` antes de iniciar.
Encerre com Ctrl+C. A prévia depende do processo local continuar em execução.
As rotas de atualização automática são habilitadas somente pelo runner `dev`.

Plataforma unificada de análise, inteligência tática, sincronização em tempo real com ligas Sleeper e monitoramento contínuo da NFL.

---

## 🏗️ Arquitetura do Projeto

O repositório é composto pelos seguintes subsistemas integrados:

```
├── yardline-app/               # Frontend Principal (SPA estática de alta performance)
│   ├── index.html              # Shell 3-colunas estilo FantasyPros/Sleeper
│   ├── css/styles.css          # Design System completo e responsivo
│   └── js/
│       ├── data_and_views.js   # Catálogos, Command Center e views
│       └── engines.js          # Motores de domínio, scoring PPR+IDP e Sleeper API
│
├── server/                     # Backend Core em Node.js / Express
│   ├── src/
│   │   ├── server.js           # API REST em porta 3001
│   │   ├── db/                 # Banco SQLite persistente (yardline.db)
│   │   └── services/           # Ingestão de rosters, waivers e notícias
│   └── package.json
│
├── news-worker/                # Coletor Dedicado NFL.com/news
│   ├── nfl-news-worker.mjs     # Monitoramento editorial a cada 5m (Porta 8787)
│   └── data/nfl-news.json      # Armazenamento canônico de notícias e capas
│
├── sleeper-single-file.ts      # Standalone Sleeper Single File Stack (Porta 3000)
│   └── sleeper-snapshot.json   # Cache snapshot da Neilo Pistola League
│
├── docs/                         # Auditorias, planos, governança e implementação
│   ├── audits/
│   ├── plans/
│   ├── governance/
│   └── implementation/
└── .gitignore
```

---

## 🚀 Como Executar

### 1. Frontend Web (Live Server)
```bash
cd yardline-app
npx live-server --port=8080
```
Acesse em: `http://localhost:8080/`

### 2. Backend Core de Produção
```bash
cd server
npm install
node src/server.js
```
Acesse a saúde em: `http://localhost:3001/api/health`

### 3. Coletor Oficial de Notícias NFL.com
```bash
node news-worker/nfl-news-worker.mjs
```
Acesse em: `http://127.0.0.1:8787/api/news`

### 4. Sleeper Single File Stack
```bash
npx tsx sleeper-single-file.ts
```
Acesse a SPA em: `http://localhost:3000/`

---

## 🏈 Liga Ativa (Configuração Padrão)
- **ID da Liga:** `1369770282776006656` (*Neilo Pistola League*)
- **Formato:** 16 Times, Keeper PPR com IDP (3 DL, 3 LB, 3 DB, 1 IDP FLEX)
- **Semana:** 6
- **Time do Usuário:** Gengar My Balls (Roster 2 · Faraco)

## Agent Command Center: telemetria real e decisão do Team Leader Manus

O painel `/agent-command-center/` mostra ciclo, commit, atividade, QA, bugs, referências e alterações com estados `LIVE/STALE`. Veja [a documentação do painel](docs/README.md) e [o contrato operacional](server/AGENT-ORCHESTRATION.md). Ciclo único: `cd server && npm run monitor:once`. Serviço contínuo enquanto o runtime estiver ativo: `npm run monitor:continuous`. **Somente o Team Leader Manus autoriza e executa alterações de código**; observadores externos entregam evidências e não publicam.
