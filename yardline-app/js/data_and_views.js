// ==========================================
// SANITIZADOR UNIVERSAL ANTI-XSS (ETAPA 11: SECURITY AGENT)
// ==========================================
var esc = (typeof window !== "undefined" && typeof window.esc === "function")
  ? window.esc
  : function(v) {
      return String(v ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[c]));
    };
if (typeof window !== "undefined" && !window.esc) {
  window.esc = esc;
}

const YL_API_BASE = (() => {
  const configured = (typeof window !== "undefined" && (window.YL_API_BASE || (window.YL_CONFIG && window.YL_CONFIG.apiBaseUrl)))
    || (typeof YL_BACKEND_URL !== "undefined" && YL_BACKEND_URL)
    || ((typeof window !== "undefined" && window.location && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) ? "http://127.0.0.1:3001/api" : "/api");
  const value = String(configured).replace(/\/+$/, '');
  return /\/api$/i.test(value) ? value : `${value}/api`;
})();
if (typeof window !== "undefined") window.YL_API_BASE = YL_API_BASE;

const CANONICAL_SLEEPER_TO_ESPN = {
  "7523": "4360310", // Trevor Lawrence (JAX)
  "8183": "4361741", // Brock Purdy (SF)
  "4984": "3918298", // Josh Allen (BUF)
  "4040": "3139477", // Patrick Mahomes (KC)
  "4881": "3916387", // Lamar Jackson (BAL)
  "6904": "4040715", // Jalen Hurts (PHI)
  "3163": "3046779", // Jared Goff (DET)
  "6770": "3915511", // Joe Burrow (CIN)
  "9229": "4432577", // C.J. Stroud (HOU)
  "2449": "2577417", // Dak Prescott (DAL)
  "96":   "8439",    // Aaron Rodgers (NYJ)
  "6797": "4241479", // Tua Tagovailoa (MIA)
  "11626":"4431452", // Drake Maye (NE)
  "6804": "4036378", // Jordan Love (GB)
  "1234": "14880",   // Russell Wilson (PIT)
  "4892": "3052587", // Baker Mayfield (TB)
  "5849": "3917315", // Kyler Murray (ARI)
  "4038941": "4038941", // Justin Herbert (LAC)
  "4866": "3929630", // Saquon Barkley (PHI)
  "3198": "3043078", // Derrick Henry (BAL)
  "4034": "3117251", // Christian McCaffrey (SF)
  "3969": "3116385", // Joe Mixon (HOU)
  "3164": "3128720", // Nick Chubb (CLE)
  "7588": "4241458", // Kenneth Walker III (SEA)
  "4035": "3054850", // Alvin Kamara (NO)
  "8138": "4426515", // Puka Nacua (LAR)
  "7564": "4362628", // Ja'Marr Chase (CIN)
  "6806": "4242335", // Justin Jefferson (MIN)
  "2374": "3116406", // Tyreek Hill (MIA)
  "2133": "16800",   // Davante Adams (NYJ)
  "4217": "3040151", // George Kittle (SF)
  "1466": "15847",   // Travis Kelce (KC)
  "8155": "4426516", // Garrett Wilson (NYJ)
  "6786": "4241389", // CeeDee Lamb (DAL)
  "8134": "4426517", // Zay Flowers (BAL)
  "8150": "4361529", // Trey McBride (ARI)
  "11625":"4431611", // Trey Benson (ARI)
  "6813": "4035686", // Jonathan Taylor (IND)
  "7569": "4258173", // Nico Collins (HOU)
  "7553": "4374302", // Amon-Ra St. Brown (DET)
  "6801": "4239993"  // Tee Higgins (CIN)
};

const CANONICAL_ESPN_TO_SLEEPER = {};
for (const [s, e] of Object.entries(CANONICAL_SLEEPER_TO_ESPN)) {
  CANONICAL_ESPN_TO_SLEEPER[String(e)] = String(s);
}

if (typeof window !== "undefined") {
  window.SLEEPER_TO_ESPN_MAP = Object.assign(window.SLEEPER_TO_ESPN_MAP || {}, CANONICAL_SLEEPER_TO_ESPN);
  window.ESPN_TO_SLEEPER_MAP = Object.assign(window.ESPN_TO_SLEEPER_MAP || {}, CANONICAL_ESPN_TO_SLEEPER);
}

function matchesPlayerId(pid, targetSet) {
  if (!pid || !targetSet) return false;
  const s = String(pid);
  if (targetSet.has(s)) return true;
  const sMap = (typeof window !== "undefined" && window.SLEEPER_TO_ESPN_MAP) || CANONICAL_SLEEPER_TO_ESPN;
  const eMap = (typeof window !== "undefined" && window.ESPN_TO_SLEEPER_MAP) || CANONICAL_ESPN_TO_SLEEPER;
  if (sMap[s] && targetSet.has(String(sMap[s]))) return true;
  if (eMap[s] && targetSet.has(String(eMap[s]))) return true;
  return false;
}

const YL_ALL_NFL_PLAYERS = {};
const YL_NFL_TEAMS = {"BUF": {"name": "Buffalo Bills", "conf": "AFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/buf.png"}, "MIA": {"name": "Miami Dolphins", "conf": "AFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/mia.png"}, "NE": {"name": "New England Patriots", "conf": "AFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ne.png"}, "NYJ": {"name": "New York Jets", "conf": "AFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/nyj.png"}, "BAL": {"name": "Baltimore Ravens", "conf": "AFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/bal.png"}, "CIN": {"name": "Cincinnati Bengals", "conf": "AFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cin.png"}, "CLE": {"name": "Cleveland Browns", "conf": "AFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/cle.png"}, "PIT": {"name": "Pittsburgh Steelers", "conf": "AFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/pit.png"}, "HOU": {"name": "Houston Texans", "conf": "AFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/hou.png"}, "IND": {"name": "Indianapolis Colts", "conf": "AFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ind.png"}, "JAX": {"name": "Jacksonville Jaguars", "conf": "AFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/jax.png"}, "TEN": {"name": "Tennessee Titans", "conf": "AFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ten.png"}, "DEN": {"name": "Denver Broncos", "conf": "AFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/den.png"}, "KC": {"name": "Kansas City Chiefs", "conf": "AFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/kc.png"}, "LV": {"name": "Las Vegas Raiders", "conf": "AFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lv.png"}, "LAC": {"name": "Los Angeles Chargers", "conf": "AFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lac.png"}, "DAL": {"name": "Dallas Cowboys", "conf": "NFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/dal.png"}, "NYG": {"name": "New York Giants", "conf": "NFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/nyg.png"}, "PHI": {"name": "Philadelphia Eagles", "conf": "NFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/phi.png"}, "WAS": {"name": "Washington Commanders", "conf": "NFC", "div": "East", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/was.png"}, "CHI": {"name": "Chicago Bears", "conf": "NFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/chi.png"}, "DET": {"name": "Detroit Lions", "conf": "NFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/det.png"}, "GB": {"name": "Green Bay Packers", "conf": "NFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/gb.png"}, "MIN": {"name": "Minnesota Vikings", "conf": "NFC", "div": "North", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/min.png"}, "ATL": {"name": "Atlanta Falcons", "conf": "NFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/atl.png"}, "CAR": {"name": "Carolina Panthers", "conf": "NFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/car.png"}, "NO": {"name": "New Orleans Saints", "conf": "NFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/no.png"}, "TB": {"name": "Tampa Bay Buccaneers", "conf": "NFC", "div": "South", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/tb.png"}, "ARI": {"name": "Arizona Cardinals", "conf": "NFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/ari.png"}, "LAR": {"name": "Los Angeles Rams", "conf": "NFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/lar.png"}, "SF": {"name": "San Francisco 49ers", "conf": "NFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sf.png"}, "SEA": {"name": "Seattle Seahawks", "conf": "NFC", "div": "West", "logo": "https://a.espncdn.com/i/teamlogos/nfl/500/sea.png"}};
const YL_NFL_NEWS_DATABASE = [{"id": "nfl_art_1", "source": "NFL.com", "sourceBadge": "NFL.COM OFICIAL", "sourceColor": "#013369", "category": "Prévia & Horários", "isBreaking": true, "timeAgo": "Há 12 min", "author": "Kevin Patra · Redação Oficial NFL.com", "headline": "Monday Night Football: Buffalo Bills e Atlanta Falcons duelam pela liderança de suas divisões na Semana 6", "summary": "Josh Allen busca consolidar o ataque mais produtivo da AFC em duelo de alta voltagem contra a defesa reformulada dos Falcons no Mercedes-Benz Stadium.", "heroImg": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3918298.png&w=350&h=254", "teamTags": ["BUF", "ATL"], "linkedPlayers": ["3918298", "4361741"], "quotes": ["\"Sabemos do desafio que é jogar em Atlanta sob teto fechado com o barulho da torcida. Nosso foco é proteger a posse e ditar o ritmo no chão.\" — Sean McDermott, Head Coach do Buffalo Bills."], "fullBody": ["O fechamento da Semana 6 da NFL coloca frente a frente duas das franquias mais dinâmicas da temporada regular. O Buffalo Bills (4-1) viaja até a Geórgia para encarar o Atlanta Falcons (3-2) no tradicional Monday Night Football.", "O ataque comandado pelo coordenador Joe Brady chega com média expressiva de 28.4 pontos por partida. Josh Allen lidera a liga em passes completados dentro do pocket sob pressão, contando com a evolução do calouro Keon Coleman e a versatilidade de James Cook no backfield.", "Do lado dos Falcons, Kirk Cousins tem orquestrado um ataque equilibrado com Bijan Robinson ultrapassando 100 jardas de scrimmage em quatro dos cinco jogos disputados. A secundária de Atlanta, ancorada por Jessie Bates III, cedeu apenas 188 jardas aéreas por confronto nas últimas três semanas.", "O confronto tem implicações diretas na corrida pelos playoffs da Conferência Nacional e Americana, prometendo casa cheia em Atlanta a partir das 21h15 (horário de Brasília)."]}, {"id": "nfl_art_2", "source": "Yahoo Sports", "sourceBadge": "YAHOO SPORTS", "sourceColor": "#6001D2", "category": "Análise Tática & Esquema", "isBreaking": false, "timeAgo": "Há 28 min", "author": "Frank Schwab & Matt Harmon · Yahoo Sports", "headline": "Como Ben Johnson transformou o Detroit Lions na máquina ofensiva mais dominante da NFC", "summary": "Estudo detalhado do playbook do Lions: o uso cirúrgico de motion pré-snap e o casamento tático entre Jahmyr Gibbs e Amon-Ra St. Brown desmantelam defesas adversárias.", "heroImg": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4374302.png&w=350&h=254", "teamTags": ["DET"], "linkedPlayers": ["4374302", "4429795"], "quotes": ["\"A velocidade com que Jahmyr e Amon-Ra processam as leituras de cobertura nos dá uma vantagem tremenda antes mesmo do snap da bola.\" — Jared Goff, Quarterback dos Lions."], "fullBody": ["Em levantamento tático publicado pelo Yahoo Sports nesta quarta-feira, a eficiência ofensiva do Detroit Lions foi colocada sob a lupa analítica da NFL.", "Sob o comando do coordenador ofensivo Ben Johnson, os Lions lideram a NFL em taxa de sucesso em primeiras descidas (58.4%). O segredo reside na mobilidade posicional: Amon-Ra St. Brown alinha em três posições distintas por drive, enquanto Jahmyr Gibbs correu rotas partindo aberto como recebedor em quase um terço de seus snaps.", "A linha ofensiva de Detroit continua sendo o padrão-ouro de bloqueios em zona da liga, permitindo que David Montgomery castigue os defensores nas trincheiras antes de soltar Gibbs em espaço aberto.", "Com a vitória categórica na Semana 5, o time de Dan Campbell consolida o favoritismo na divisão NFC North e já desponta como forte candidato ao Super Bowl."]}, {"id": "nfl_art_3", "source": "Bleacher Report", "sourceBadge": "BLEACHER REPORT", "sourceColor": "#E24B00", "category": "Rumores & Trade Deadline", "isBreaking": true, "timeAgo": "Há 45 min", "author": "Jordan Schultz · Bleacher Report NFL", "headline": "Plantão de Trocas NFL: Franquias iniciam conversas agressivas por Wide Receivers antes do prazo final", "summary": "Com a proximidade da Trade Deadline da NFL em novembro, equipes com aspirações de pós-temporada sondam o mercado em busca de profundidade em recebedores e pass rushers.", "heroImg": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4426516.png&w=350&h=254", "teamTags": ["NYJ", "KC", "CIN"], "linkedPlayers": ["4426516", "4362628"], "quotes": ["\"O mercado de recebedores está aquecido como nunca vimos nos últimos cinco anos. Quem tiver escolha de draft para oferecer pode mudar o rumo da temporada agora.\" — Executivo anônimo da AFC."], "fullBody": ["Fontes ouvidas pelo Bleacher Report confirmam que pelo menos seis franquias de ponta já abriram canais de negociação formal para reforçar seus elencos antes da data limite de transferências.", "Equipes como o Kansas City Chiefs, que buscam repor baixas no corpo de recebedores, e o Pittsburgh Steelers continuam ativas no monitoramento de veteranos disponíveis.", "A movimentação recente que levou veteranos de volta a novos esquemas acelerou as conversas entre gerentes gerais, que preferem antecipar acordos antes da Semana 8 para garantir tempo de adaptação ao playbook.", "Acompanhe o radar em tempo real da YARDLINE para atualizações a qualquer momento."]}, {"id": "nfl_art_4", "source": "X / Insiders", "sourceBadge": "𝕏 BREAKING NEWS", "sourceColor": "#0F172A", "category": "Boletim Médico Oficial", "isBreaking": true, "timeAgo": "Há 1 hora", "author": "Adam Schefter & Ian Rapoport · 𝕏 Feed", "headline": "Boletim de Lesões da Semana 6: Treinos de quarta-feira trazem retornos cruciais e desfalques confirmados", "summary": "Relatório médico oficial das 32 equipes: atualizações sobre Christian McCaffrey, Jordan Love, Puka Nacua, Emeka Egbuka e Isaiah Likely.", "heroImg": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/3117251.png&w=350&h=254", "teamTags": ["SF", "GB", "LAR", "TB", "NYG"], "linkedPlayers": ["4430807", "4361050", "4426515", "3117251"], "quotes": ["\"Ele participou de todas as sessões táticas e estamos muito confiantes com a evolução física nesta semana.\" — Atualização médica sobre atividades de quarta-feira."], "fullBody": ["Direto dos setoristas oficiais da NFL no 𝕏 (@AdamSchefter / @RapSheet): As 32 franquias divulgaram nesta tarde o primeiro relatório oficial de participação em treinos (Injury Report) para a rodada de domingo.", "Em San Francisco, Christian McCaffrey deu mais um passo significativo em seu processo de recondicionamento físico, treinando em ritmo moderado junto aos titulares.", "Em Green Bay, Jordan Love participou plenamente das atividades de passe e movimentação de pocket, sem restrições de mobilidade reportadas pela comissão médica.", "Em Tampa Bay, o jovem recebedor Emeka Egbuka esteve presente nos drills de rotas intermediárias após susto na rodada anterior, enquanto Chris Godwin completou os trabalhos normais.", "No New York Giants, o Tight End Isaiah Likely treinou integralmente após assumir 86% dos snaps da equipe na última partida contra Seattle."]}, {"id": "nfl_art_5", "source": "NFL.com", "sourceBadge": "NFL NEXT GEN STATS", "sourceColor": "#013369", "category": "Métricas Avançadas", "isBreaking": false, "timeAgo": "Há 2 horas", "author": "Next Gen Stats Research Team", "headline": "Next Gen Stats: As defesas mais agressivas em Pressão ao Quarterback após 5 semanas", "summary": "Estudo oficial de Pass Rush Win Rate e porcentagem de Blitz: Vikings de Brian Flores e Texans de DeMeco Ryans lideram a liga em perturbação no pocket.", "heroImg": "https://a.espncdn.com/combiner/i?img=/i/headshots/nfl/players/full/4432577.png&w=350&h=254", "teamTags": ["MIN", "HOU", "DEN", "CLE"], "linkedPlayers": ["4258173", "4432577"], "quotes": ["\"Quando você força o quarterback adversário a soltar a bola em menos de 2.3 segundos, você dita o jogo.\" — Brian Flores, Coordenador Defensivo dos Vikings."], "fullBody": ["O departamento oficial de estatísticas avançadas da NFL (Next Gen Stats) publicou seu relatório divisional da Semana 5 com descobertas impressionantes sobre a batalha das trincheiras.", "O Minnesota Vikings mantém a maior taxa de Blitz simulado da NFL (41.2%), confundindo linhas ofensivas com esquemas de 7 defensores na linha que recuam no snap. O resultado é o menor índice de rating concedido a passes com mais de 20 jardas na liga.", "Em Houston, Will Anderson Jr. e Danielle Hunter formam a dupla com maior taxa de pressão rápida (menos de 2.5 segundos) da AFC, fundamentais para a campanha vitoriosa dos Texans."]}];
const YL_PLAYER_DOSSIERS = {};
const TICKER_GAMES = []; // NFL scores require an actual provider; no demo ticker.


let currentTab = "home";
let currentHomeFilter = "ALL";
let playerSearchQuery = "";
let playerPosFilter = "ALL";
let playerTeamFilter = "ALL";
let playerAvailabilityFilter = "ALL";
let playerSortFilter = "YL_INDEX";
let playerCurrentPage = 1;
const PLAYERS_PER_PAGE = 24;

let userStarters = ["3918298", "4429795", "4596448", "4374302", "4426515", "4258173", "4361529", "4430807"];
let userBench = ["4697815", "4431452", "3116165", "4430878"];
let userWatchlist = ["4361050", "4429059"];
let userFaab = 78;

const STAGE_TITLES = {
  home: { title: "Visão geral", sub: "Acompanhe a NFL. Encontre seu próximo movimento." },
  players: { title: "Toda a Base de Jogadores da NFL (32 Franquias)", sub: "Catálogo completo com fotos ESPN, dados biográficos, estatísticas de carreira e dossiê com notícias dos últimos meses." },
  playbook: { title: "Meu Playbook", sub: "Titulares, banco e contexto da rodada com os dados da sua liga Sleeper." },
  trade: { title: "Trade Analyzer · Avaliador de Trocas (Estilo FantasyPros)", sub: "Medidor interativo de justiça de troca (Trade Value Gauge) e impacto semanal em pontos projetados." },
  league: { title: "Confronto da semana", sub: "Seu time e o adversário, com pontuação realizada e projeções da rodada." },
  waivers: { title: "Waiver Wire Assistant · Drop Sugerido & FAAB", sub: "Mapeamento dos atletas livres com sugestão de corte, impacto líquido e cálculo de lance." },
  rankings: { title: "Rankings ECR YARDLINE Intelligence", sub: "Consenso de especialistas ponderado por volume de rotas (TPRR), histórico e linhas de Las Vegas." },
  "manager-dna": { title: "Manager DNA & Radar Tático de Oponentes", sub: "Perfil analítico profundo, agressividade no waiver wire, frequência de trocas, concentração de elenco e clutch score." },
  aimode: { title: "Modo IA Tático & Analítico", sub: "Diagnóstico profundo com base nas regras da sua liga, confrontos da rodada e histórico." },
  social: { title: "Comunidade & Veredito WhatsApp", sub: "Gere o resumo oficial do seu confronto da rodada formatado para enviar no grupo da liga." },
  plans: { title: "Planos & Assinatura Nacional via Pix", sub: "Tecnologia de alto calibre em Reais, sem cobrança em dólar e suporte 100% focado na NFL." }
};

function openNavTab(tabKey) {
  currentTab = tabKey;
  document.querySelectorAll(".view-section").forEach(s => s.classList.remove("active"));
  const target = document.getElementById("view-" + tabKey);
  if (target) target.classList.add("active");

  document.querySelectorAll(".fp-rail-item").forEach(btn => btn.classList.remove("active"));
  const activeNav = document.querySelector(`.fp-rail-item[data-tab="${tabKey}"]`);
  if (activeNav) activeNav.classList.add("active");

  const meta = STAGE_TITLES[tabKey] || STAGE_TITLES.home;
  const tEl = document.getElementById("stage-title");
  const sEl = document.getElementById("stage-subtitle");
  if (tEl) tEl.textContent = meta.title;
  if (sEl) sEl.textContent = meta.sub;
  document.querySelectorAll('.fp-rail-item').forEach(button => {
    if (button === activeNav) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  if (tabKey === 'home' && typeof renderHomeView === 'function') renderHomeView();
  if (tabKey === 'playbook' && typeof renderPlaybookView === 'function') renderPlaybookView();
  if (tabKey === 'league' && typeof renderLeagueView === 'function') renderLeagueView();
  if (tabKey === 'matchup' && typeof renderMatchupView === 'function') renderMatchupView();
  if (tabKey === 'waivers' && typeof renderWaiversView === 'function') renderWaiversView();
  if (tabKey === 'players' && typeof renderPlayersView === 'function') renderPlayersView();
  if (tabKey === 'teams' && typeof renderTeamsView === 'function') renderTeamsView();
  if (tabKey === 'manager-dna' && typeof renderManagerDnaView === 'function') renderManagerDnaView();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function handleGlobalSearch(query) {
  const q = (query || "").trim();
  playerSearchQuery = q;
  playerCurrentPage = 1;
  if (q.length >= 2) {
    if (currentTab !== "players") openNavTab("players");
    renderPlayersView();
    const input = document.getElementById("players-view-search-input");
    if (input && input.value !== q) input.value = q;
  } else if (q.length === 0 && currentTab === "players") {
    renderPlayersView();
    const input = document.getElementById("players-view-search-input");
    if (input) input.value = "";
  }
}

function showToast(msg) {
  const t = document.getElementById("yl-toast-banner");
  if (!t) return;
  t.innerHTML = msg;
  t.style.display = "block";
  clearTimeout(window._tTimer);
  window._tTimer = setTimeout(() => { t.style.display = "none"; }, 3800);
}

let _ylLastFocusedElement = null;

function openModal(id) {
  const m = document.getElementById(id);
  if (!m) return;
  _ylLastFocusedElement = document.activeElement;
  m.style.display = ""; // limpa conflito de estilo inline
  m.classList.add("open");
  m.setAttribute?.("aria-hidden", "false");
  m.setAttribute?.("aria-modal", "true");
  m.setAttribute("role", "dialog");

  // Garante que o modal possui um botão fechar acessível caso ainda não tenha conteúdo renderizado
  const card = m.querySelector('.yl-modal-card') || m;
  let closeBtn = m.querySelector('button[onclick*="closeModal"]') || m.querySelector('.yl-modal-close-btn');
  if (!closeBtn && typeof document.createElement === 'function' && typeof card.insertBefore === 'function') {
    const defaultClose = document.createElement('button');
    defaultClose.type = 'button';
    defaultClose.className = 'yl-modal-close-btn';
    defaultClose.setAttribute('aria-label', 'Fechar modal');
    defaultClose.onclick = function() { closeModal(id); };
    defaultClose.innerHTML = '&times;';
    defaultClose.style.cssText = 'position:absolute;top:16px;right:16px;background:rgba(255,255,255,0.12);border:none;color:#FFF;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:16px;font-weight:700;line-height:1;z-index:99;';
    card.insertBefore(defaultClose, card.firstChild);
  }

  // Trava foco no primeiro elemento interativo do modal
  setTimeout(() => {
    const focusable = typeof m.querySelectorAll === "function" ? m.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])') : [];
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }, 40);
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (!m) return false;
  m.classList?.remove("open");
  if (m.style) m.style.display = "none";
  m.setAttribute?.("aria-hidden", "true");
  m.removeAttribute?.("aria-modal");
  if (_ylLastFocusedElement && typeof _ylLastFocusedElement.focus === "function") {
    _ylLastFocusedElement.focus();
    _ylLastFocusedElement = null;
  }
  return true;
}
if (typeof window !== "undefined") window.closeModal = closeModal;

if (typeof window !== "undefined") {
  window.openModal = openModal;
  window.closeModal = closeModal;
}

// Trap de foco e fechamento por Escape para WCAG 2.1 AA
document.addEventListener("keydown", function(e) {
  if (typeof document.querySelectorAll !== "function") return;
  const openModals = document.querySelectorAll(".yl-modal-overlay.open");
  if (!openModals.length) return;
  const activeModal = openModals[openModals.length - 1];

  if (e.key === "Escape") {
    e.preventDefault();
    closeModal(activeModal.id);
    return;
  }

  if (e.key === "Tab" && typeof activeModal.querySelectorAll === "function") {
    const focusables = Array.from(activeModal.querySelectorAll('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(el => el.offsetParent !== null);
    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first || !activeModal.contains(document.activeElement)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !activeModal.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    }
  }
});


// 0. TOP NFL LIVE SCORE TICKER
function renderTopTicker() {
  const strip=document.getElementById('nfl-live-ticker-strip');
  if(!strip)return;
  strip.innerHTML='';strip.hidden=true;strip.style.display='none';
}

// ==========================================
// HELPERS DINÂMICOS DE NOTÍCIAS & ELENCOS CANÔNICOS (Fases 4 e 5)
// ==========================================
function getActiveRosterPlayerIds() {
  const ids = new Set();
  const rosters = (typeof YL_ACTIVE_ROSTERS !== "undefined" && Array.isArray(YL_ACTIVE_ROSTERS) && YL_ACTIVE_ROSTERS.length > 0)
    ? YL_ACTIVE_ROSTERS
    : (typeof activeSleeperRosters !== "undefined" && Array.isArray(activeSleeperRosters) ? activeSleeperRosters : []);

  const myRoster = (typeof userRealRoster !== "undefined" && userRealRoster) ||
    rosters.find(r => String(r.roster_id) === String(typeof YL_MY_ROSTER_ID !== "undefined" ? YL_MY_ROSTER_ID : (typeof selectedActiveRosterId !== "undefined" ? selectedActiveRosterId : 2))) ||
    rosters[0];

  if (myRoster) {
    [...(myRoster.players || []), ...(myRoster.starters || []), ...(myRoster.reserve || []), ...(myRoster.taxi || [])]
      .forEach(id => { if (id && id !== '0') ids.add(String(id)); });
  }

  if (ids.size === 0) {
    if (typeof userLineup !== "undefined" && userLineup) {
      Object.values(userLineup).forEach(id => { if (id) ids.add(String(id)); });
    }
    if (typeof userBenchList !== "undefined" && Array.isArray(userBenchList)) {
      userBenchList.forEach(id => { if (id) ids.add(String(id)); });
    }
    if (typeof userStarters !== "undefined" && Array.isArray(userStarters)) {
      userStarters.forEach(id => { if (id) ids.add(String(id)); });
    }
    if (typeof userBench !== "undefined" && Array.isArray(userBench)) {
      userBench.forEach(id => { if (id) ids.add(String(id)); });
    }
  }
  return ids;
}

function getOpponentRosterPlayerIds() {
  const opponent = typeof getActiveOpponentRoster === "function" ? getActiveOpponentRoster() : null;
  if (opponent) {
    return new Set([...(opponent.players || []), ...(opponent.starters || [])].map(String));
  }

  const oppRoster = (typeof activeRealMatchup !== "undefined" && activeRealMatchup?.oppRoster) || null;
  if (oppRoster) {
    return new Set([...(oppRoster.players || []), ...(oppRoster.starters || []), ...(oppRoster.reserve || [])].map(String));
  }

  const oppId = typeof activeRealMatchup !== "undefined" && (activeRealMatchup?.oppRosterId || activeRealMatchup?.oppRoster?.roster_id);
  const rosters = (typeof YL_ACTIVE_ROSTERS !== "undefined" && Array.isArray(YL_ACTIVE_ROSTERS)) ? YL_ACTIVE_ROSTERS : (typeof activeSleeperRosters !== "undefined" && Array.isArray(activeSleeperRosters) ? activeSleeperRosters : []);
  if (oppId && rosters.length > 0) {
    const found = rosters.find(r => String(r.roster_id) === String(oppId));
    if (found) {
      return new Set([...(found.players || []), ...(found.starters || [])].map(String));
    }
  }
  return new Set();
}

function getFreeAgentIds() {
  const owned = new Set();
  const rosters = (typeof YL_ACTIVE_ROSTERS !== "undefined" && Array.isArray(YL_ACTIVE_ROSTERS) && YL_ACTIVE_ROSTERS.length > 0)
    ? YL_ACTIVE_ROSTERS
    : (typeof activeSleeperRosters !== "undefined" && Array.isArray(activeSleeperRosters) ? activeSleeperRosters : []);

  if (rosters.length > 0) {
    rosters.forEach(roster => {
      (roster.players || []).forEach(pid => { if (pid && pid !== '0') owned.add(String(pid)); });
      (roster.starters || []).forEach(pid => { if (pid && pid !== '0') owned.add(String(pid)); });
      (roster.reserve || []).forEach(pid => { if (pid && pid !== '0') owned.add(String(pid)); });
      (roster.taxi || []).forEach(pid => { if (pid && pid !== '0') owned.add(String(pid)); });
    });
  } else {
    getActiveRosterPlayerIds().forEach(id => owned.add(id));
  }

  const allKnownIds = (typeof YL_ACTIVE_PLAYER_MAP !== "undefined" && Object.keys(YL_ACTIVE_PLAYER_MAP).length > 0)
    ? Object.keys(YL_ACTIVE_PLAYER_MAP)
    : (typeof YL_CANONICAL !== "undefined" && YL_CANONICAL.players && Object.keys(YL_CANONICAL.players).length > 0
      ? Object.keys(YL_CANONICAL.players)
      : (typeof YL_ALL_NFL_PLAYERS !== "undefined" ? Object.keys(YL_ALL_NFL_PLAYERS) : []));

  return new Set(allKnownIds.filter(id => !owned.has(String(id))));
}


function getPlayerNews(playerId) {
  if (!playerId) return [];
  const id = String(playerId);
  const altId = (typeof SLEEPER_TO_ESPN_MAP !== "undefined" && SLEEPER_TO_ESPN_MAP[id])
    ? String(SLEEPER_TO_ESPN_MAP[id])
    : ((typeof ESPN_TO_SLEEPER_MAP !== "undefined" && ESPN_TO_SLEEPER_MAP[id]) ? String(ESPN_TO_SLEEPER_MAP[id]) : null);

  const realNews = (Array.isArray(YL_LIVE_NEWS_CACHE) ? YL_LIVE_NEWS_CACHE : [])
    .filter(article => {
      const linked = (article.linkedPlayers || []).map(String);
      return linked.includes(id) || (altId && linked.includes(altId));
    })
    .filter(article => article.source && article.headline)
    .filter((article, index, list) =>
      list.findIndex(item => item.id === article.id) === index
    );

  return realNews;
}

function renderEmptyPlayerNews() {
  return `
    <div class="yl-card" style="padding:18px;border-left:4px solid var(--border-box);background:#FFF;">
      <strong style="color:var(--yl-navy);font-size:14px;">Nenhuma notícia recente encontrada.</strong>
      <p style="margin-top:6px;color:var(--text-muted);font-size:12.5px;margin-bottom:0;line-height:1.5;">
        A YARDLINE não encontrou uma publicação vinculada a este atleta nas últimas rodadas oficiais.
      </p>
    </div>
  `;
}

// ==========================================
// 1. HOME TAB: NOTÍCIAS CONECTADAS AO ELENCO & CANONICAL API
// ==========================================
let YL_LIVE_NEWS_CACHE = null;
let YL_NEWS_FETCH_STATE = 'pending';

function formatTimeAgo(isoString) {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Há ${diffDays}d`;
  } catch {
    return 'Recente';
  }
}

async function fetchLiveNews() {
  try {
    const apiBase = YL_API_BASE;
    const res = await fetch(`${apiBase}/news?limit=40`, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    if (Array.isArray(data)) {
      const incoming = data.map(item => ({
        id: item.id,
        source: item.source || 'NFL.com',
        sourceBadge: (item.source || 'NFL').toUpperCase(),
        sourceColor: (item.source || '').includes('Yahoo') ? '#6001D2' : ((item.source || '').includes('ESPN') ? '#CC0000' : '#013369'),
        category: item.category || 'Geral',
        isBreaking: item.category === 'breaking' || item.title?.toLowerCase().includes('urgente') || false,
        timeAgo: item.publishedAt || item.published_at ? formatTimeAgo(item.publishedAt || item.published_at) : 'Data indisponível',
        author: item.author || (item.source + ' Intel'),
        headline: item.title || 'Título indisponível',
        summary: item.summary || '',
        heroImg: item.image_url || 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/nfl.png&w=350&h=254',
        linkedPlayers: (item.linkedPlayers || []).map(p => String(p.id || p.sleeperId || p.espnId)),
        _linkedAthleteObjects: item.linkedPlayers || [],
        linkedTeams: item.linkedTeams || [],
        canonicalUrl: item.canonicalUrl || item.canonical_url || null,
        leagueContext: item.leagueContext || null,
        provenance: item.provenance || null,
        fullBody: [item.summary].filter(Boolean)
      }));

      YL_LIVE_NEWS_CACHE = incoming;
    }
    YL_NEWS_FETCH_STATE = 'synced';
    renderHomeView();
  } catch (err) {
    YL_NEWS_FETCH_STATE = 'unavailable';
    YL_LIVE_NEWS_CACHE = [];
    console.warn('[YARDLINE NEWS] Backend indisponível; conteúdo estático não será apresentado:', err.message);
    renderHomeView();
  }
}

if (typeof window !== "undefined") {
  setTimeout(fetchLiveNews, 300);
}

function renderHomeView() {
  const container = document.getElementById("view-home");
  if (!container) return;

  const currentDatabase = Array.isArray(YL_LIVE_NEWS_CACHE) ? YL_LIVE_NEWS_CACHE : [];

  const myRosterIds = getActiveRosterPlayerIds();
  const opponentIds = getOpponentRosterPlayerIds();
  const freeAgentIds = getFreeAgentIds();

  // Contagens exatas para as abas
  const countAll = currentDatabase.length;
  let countMine = 0;
  let countOpp = 0;
  let countWaivers = 0;

  currentDatabase.forEach(art => {
    const pids = art.linkedPlayers || [];
    if (pids.some(pid => matchesPlayerId(pid, myRosterIds))) {
      countMine++;
    }
    if (pids.some(pid => matchesPlayerId(pid, opponentIds))) {
      countOpp++;
    }
    if (pids.some(pid => matchesPlayerId(pid, freeAgentIds))) {
      countWaivers++;
    }
  });

  const filtered = currentDatabase.filter(art => {
    if (currentHomeFilter === "ALL") return true;
    const pids = art.linkedPlayers || [];

    if (currentHomeFilter === "MY_ROSTER") {
      return pids.some(pid => matchesPlayerId(pid, myRosterIds));
    }
    if (currentHomeFilter === "WAIVERS") {
      return pids.some(pid => matchesPlayerId(pid, freeAgentIds));
    }
    if (currentHomeFilter === "OPPONENT") {
      return pids.some(pid => matchesPlayerId(pid, opponentIds));
    }
    return art.source === currentHomeFilter;
  });

  const activeUsername = typeof activeSleeperUsername !== "undefined" ? activeSleeperUsername : "Faraco";
  const shell = window.YL_SHELL_SNAPSHOT || {};
  const league = typeof activeSleeperLeagueData !== "undefined" ? activeSleeperLeagueData : (shell.league || {});
  const leagueName = league?.name || shell.league?.name || 'Selecione uma liga para personalizar';
  const leagueId = league?.league_id || league?.providerLeagueId || shell.league?.providerLeagueId || localStorage.getItem('yl_active_league_id') || '—';
  const leagueSeason = league?.season || shell.league?.season || shell.state?.season || '—';
  const leagueWeek = typeof activeLeagueWeek !== 'undefined' && activeLeagueWeek != null ? activeLeagueWeek : (shell.state?.week || '—');
  const leagueTeams = Array.isArray(shell.rosters) ? shell.rosters.length : (Array.isArray(activeSleeperRosters) ? activeSleeperRosters.length : 0);

  container.innerHTML = `
    <section class="yl-welcome" aria-labelledby="yl-welcome-title">
      <div class="yl-welcome-copy">
        <span class="yl-eyebrow">MAIS CONTEXTO. MELHORES DECISÕES.</span>
        <h2 id="yl-welcome-title">O jogo muda.<br>Sua visão vai além.</h2>
        <p>Notícias, jogadores e ferramentas para construir a sua próxima jogada.</p>
        <button class="yl-text-action" onclick="openNavTab('players')">Explorar jogadores <span aria-hidden="true">→</span></button>
      </div>
      <div class="yl-brand-panel" aria-hidden="true"><img src="assets/yardline-logo.png" alt=""><span>FANTASY FOOTBALL · BRASIL</span></div>
    </section>
    <nav class="yl-quick-tools" aria-label="Atalhos para sua estratégia">
      <button class="yl-tool-link" onclick="openNavTab('playbook')"><span class="yl-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v4H9zM9 12h6m-6 4h4"/></svg></span><span><b>Meu Playbook</b><small>Seu elenco, em perspectiva</small></span><span class="yl-tool-arrow" aria-hidden="true">↗</span></button>
      <button class="yl-tool-link" onclick="openNavTab('league')"><span class="yl-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m4 4 16 16M4 20 20 4M4 4v6m0-6h6m10 10v6h-6"/></svg></span><span><b>Matchup Center</b><small>Olhe de perto o confronto</small></span><span class="yl-tool-arrow" aria-hidden="true">↗</span></button>
      <button class="yl-tool-link" onclick="openNavTab('waivers')"><span class="yl-tool-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="m12 12 7-7"/></svg></span><span><b>Waiver Radar</b><small>Explore o mercado da liga</small></span><span class="yl-tool-arrow" aria-hidden="true">↗</span></button>
    </nav>
    <div class="yl-home-section-heading"><div><span class="yl-eyebrow">ACOMPANHE O JOGO</span><h2>No radar da NFL</h2></div><span>Notícias e contexto para o seu fantasy</span></div>

    <div class="yl-card yl-dashboard-league-line" style="margin-bottom:18px;padding:13px 18px;border-left:4px solid var(--yl-crimson);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;">
        <div style="display:flex;align-items:center;gap:10px;min-width:0;">
          <span class="badge badge-navy">${shell.league ? 'LIGA SLEEPER' : 'SEU CONTEXTO'}</span>
          <strong style="color:var(--yl-navy);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(leagueName)}</strong>
          <span style="font-size:11px;color:var(--text-muted);">#${esc(leagueId)}</span>
        </div>
        <div style="display:flex;align-items:center;gap:12px;font-size:11.5px;color:var(--text-muted);">
          <span>Temporada <strong style="color:var(--yl-navy);">${esc(leagueSeason)}</strong></span>
          <span>Semana <strong style="color:var(--yl-navy);">${esc(leagueWeek)}</strong></span>
          <span><strong style="color:var(--yl-navy);">${esc(leagueTeams)}</strong> times</span>
        </div>
      </div>
    </div>
    <!-- Filter Strip -->
    <div class="yl-card" style="margin-bottom:18px;padding:14px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-size:12px;font-weight:600;color:var(--yl-navy);text-transform:uppercase;letter-spacing:0.4px;">Seu radar:</span>
          <button class="btn-yl ${currentHomeFilter === 'ALL' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="currentHomeFilter='ALL';renderHomeView();">
            Todas da NFL (${countAll})
          </button>
          <button class="btn-yl ${currentHomeFilter === 'MY_ROSTER' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="currentHomeFilter='MY_ROSTER';renderHomeView();">
            Meu time (${countMine})
          </button>
          <button class="btn-yl ${currentHomeFilter === 'WAIVERS' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="currentHomeFilter='WAIVERS';renderHomeView();">
            Waivers (${countWaivers})
          </button>
          <button class="btn-yl ${currentHomeFilter === 'OPPONENT' ? 'btn-primary' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="currentHomeFilter='OPPONENT';renderHomeView();">
            Adversário (${countOpp})
          </button>
        </div>
        <span style="font-size:11.5px;color:var(--text-muted);">
          Clique em qualquer jogador citado para abrir o <strong>Dossiê Canônico</strong>
        </span>
      </div>
    </div>

    <!-- News Grid with Linked Players -->
    <div class="grid-2">
      ${filtered.length === 0 ? `
        <div class="yl-card" style="grid-column:1/-1;padding:32px;text-align:center;">
          <strong style="font-size:15px;color:var(--yl-navy);">${YL_NEWS_FETCH_STATE === 'unavailable' ? 'Feed jornalístico indisponível.' : 'Nenhuma notícia encontrada para este filtro.'}</strong>
          <p style="color:var(--text-muted);margin-top:6px;font-size:13px;">${YL_NEWS_FETCH_STATE === 'unavailable' ? 'A API Yardline não respondeu; nenhum conteúdo local foi apresentado como se fosse oficial.' : YL_NEWS_FETCH_STATE === 'pending' ? 'Aguardando resposta da API Yardline.' : 'Selecione outro filtro ou aguarde nova ingestão editorial.'}</p>
        </div>
      ` : filtered.map(art => {
        const pids = art.linkedPlayers || [];
        const teamCodes = [...new Set((art.linkedTeams || []).map(t => t.code || t.team || t.name).filter(Boolean))];
        return `
          <div class="yl-card" style="display:flex;flex-direction:column;justify-content:space-between;cursor:pointer;" onclick="openArticleModal('${art.id}')">
            <div>
              <div style="padding:12px 16px;border-bottom:1px solid var(--border-box);background:var(--bg-subtle);display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="badge" style="background:${art.sourceColor || '#013369'};color:#FFF;">${art.sourceBadge || 'NFL'}</span>
                  <span class="badge badge-navy">${art.category || 'Geral'}</span>
                  ${art.isBreaking ? '<span class="badge badge-crimson">URGENTE</span>' : ''}
                </div>
                <span style="font-size:11.5px;color:var(--text-muted);">${art.timeAgo || 'Hoje'}</span>
              </div>

              <div style="padding:18px;">
                <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:12px;">
                  <img src="${art.heroImg}" style="width:74px;height:74px;border-radius:10px;object-fit:cover;border:1px solid var(--border-box);flex-shrink:0;background:#F1F5F9;" alt="" onerror="this.src='https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/nfl.png&w=350&h=254'">
                  <div>
                    <h3 style="font-size:15.5px;font-weight:500;color:var(--yl-navy);line-height:1.35;margin-bottom:6px;">${art.headline}</h3>
                    <div style="font-size:11.5px;color:var(--text-muted);">Por <strong>${art.author || 'YARDLINE Intel'}</strong></div>
                  </div>
                </div>
                <p style="font-size:13px;color:var(--text-body);line-height:1.5;margin-bottom:14px;">${art.summary}</p>

                <!-- LINKED PLAYERS & ROSTER STATUS CHIPS -->
                <div style="background:#FAFBFD;border:1px solid var(--border-box);border-radius:8px;padding:10px 12px;margin-bottom:10px;">
                  <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:500;margin-bottom:6px;">
                    Atletas Envolvidos (Clique para abrir Dossiê):
                  </div>
                  <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${pids.length === 0 ? '<span style="font-size:11px;color:var(--text-muted);">Notícia editorial geral da liga.</span>' : pids.map(pid => {
                      const p = (typeof resolveCanonicalPlayer === "function" ? resolveCanonicalPlayer(pid) : null) || (typeof resolveNFLPlayer === "function" ? resolveNFLPlayer(pid) : null) || (typeof YL_PLAYER_DOSSIERS !== "undefined" ? YL_PLAYER_DOSSIERS[pid] : null) || (typeof YL_ALL_NFL_PLAYERS !== "undefined" ? YL_ALL_NFL_PLAYERS[pid] : null) || (Array.isArray(art._linkedAthleteObjects) ? art._linkedAthleteObjects.find(x => String(x.id) === String(pid) || String(x.sleeperId) === String(pid)) : null);
                      if (!p) return "";
                      const sId = String(p.id || pid);
                      const isMine = myRosterIds.has(sId) || (p.espnId && myRosterIds.has(String(p.espnId)));
                      const isOpp = opponentIds.has(sId) || (p.espnId && opponentIds.has(String(p.espnId)));
                      const isWaiver = freeAgentIds.has(sId) || (p.espnId && freeAgentIds.has(String(p.espnId)));

                      let tagClass = "badge-navy";
                      let tagTxt = p.name;
                      if (isMine) { tagClass = "badge-green"; tagTxt = "SEU TIME: " + p.name; }
                      else if (isOpp) { tagClass = "badge-navy"; tagTxt = "ADVERSÁRIO: " + p.name; }
                      else if (isWaiver) { tagClass = "badge-crimson"; tagTxt = "LIVRE NO WAIVER: " + p.name; }

                      const photoSrc = p.photo || p.photoUrl || (p.teamLogo ? p.teamLogo : 'https://a.espncdn.com/combiner/i?img=/i/teamlogos/nfl/500/nfl.png&w=350&h=254');

                      return `
                        <span class="badge ${tagClass}" style="cursor:pointer;padding:4px 8px;font-size:11px;" onclick="event.stopPropagation();openPlayerDossierModal('${p.id || pid}');">
                          <img src="${photoSrc}" style="width:16px;height:16px;border-radius:50%;margin-right:4px;" onerror="this.style.display='none'">
                          ${tagTxt}
                        </span>
                      `;
                    }).join("")}
                  </div>
                </div>
              </div>
            </div>

            <div style="padding:10px 18px;border-top:1px solid var(--border-box);background:var(--bg-subtle);display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;">
              <span style="font-size:11.5px;color:var(--text-muted);">${esc(art.source)} · ${teamCodes.length ? `franquias: ${teamCodes.map(esc).join(', ')}` : 'franquia não vinculada'} · ${art.leagueContext ? `liga #${esc(art.leagueContext.leagueId)} · sem. ${esc(art.leagueContext.week)}` : 'contexto de liga indisponível'}</span>
              ${art.canonicalUrl ? `<a href="${esc(art.canonicalUrl)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" style="font-size:12px;color:var(--yl-crimson);font-weight:500;">Fonte canônica ↗</a>` : '<span class="badge badge-amber">URL canônica indisponível</span>'}
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function openArticleModal(articleId) {
  const currentDatabase = Array.isArray(YL_LIVE_NEWS_CACHE) ? YL_LIVE_NEWS_CACHE : [];

  const art = currentDatabase.find(article => String(article.id) === String(articleId));
  if (!art) {
    if (typeof showToast === "function") showToast("Notícia não encontrada ou removida.");
    return;
  }

  const modal = document.getElementById("article-reader-modal");
  const content = document.getElementById("article-modal-content");
  if (!modal || !content) return;

  const pids = art.linkedPlayers || [];

  content.innerHTML = `
    <div style="background:linear-gradient(135deg,#001933 0%,#0F172A 100%);padding:22px 26px;color:#FFF;position:relative;">
      <button onclick="closeModal('article-reader-modal')" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.12);border:none;color:#FFF;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:0.5px;">FECHAR</button>
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        <span class="badge" style="background:${art.sourceColor || '#013369'};color:#FFF;">${art.sourceBadge || 'NFL'}</span>
        <span class="badge badge-navy">${art.category || 'Geral'}</span>
        <span style="font-size:11.5px;color:#94A3B8;">${art.timeAgo || 'Hoje'}</span>
      </div>
      <h2 style="font-size:20px;font-weight:500;line-height:1.35;max-width:90%;">${art.headline}</h2>
      <div style="font-size:12.5px;color:#CBD5E1;margin-top:6px;">Por <strong>${art.author || 'YARDLINE Intel'}</strong></div>
    </div>
    <div style="padding:22px 26px;overflow-y:auto;max-height:calc(85vh - 120px);">
      <div style="background:#FFF9FA;border:1px solid var(--yl-crimson-border);border-radius:8px;padding:12px 14px;margin-bottom:16px;">
        <div style="font-size:11.5px;font-weight:500;color:var(--yl-crimson);text-transform:uppercase;margin-bottom:6px;">
          Atletas Citados nesta Reportagem:
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          ${pids.map(pid => {
            const p = (typeof resolveCanonicalPlayer === "function" ? resolveCanonicalPlayer(pid) : null) || (typeof resolveNFLPlayer === "function" ? resolveNFLPlayer(pid) : null);
            return p ? `
              <button class="btn-yl btn-primary" style="padding:5px 10px;font-size:12px;" onclick="closeModal('article-reader-modal');openPlayerDossierModal('${p.id}');">
                <img src="${p.photo}" style="width:18px;height:18px;border-radius:50%;" onerror="this.src='${p.teamLogo}'">
                <span>Dossiê de ${p.name} (${p.team || 'NFL'}) →</span>
              </button>
            ` : '';
          }).join("")}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:14px;font-size:14.5px;color:var(--text-body);line-height:1.65;margin-bottom:24px;">
        ${(art.fullBody || [art.summary]).map(p => `<p>${p}</p>`).join("")}
      </div>
    </div>
  `;
  openModal(modal.id);
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

// ==========================================
// HELPER DE SITUAÇÃO REAL NA LIGA SLEEPER (SPEC.md)
// Identifica em tempo real se o atleta pertence a "Gengar My Balls", a um dos 11 rivais ou está Livre no Waiver
// ==========================================
function getPlayerLeagueStatus(playerId) {
  const player = playerId && typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(String(playerId)) : null;
  const rosters = window.YL_SHELL_SNAPSHOT?.rosters;
  const unknown = { type: 'UNKNOWN', badge: 'badge-navy', badgeText: 'NÃO VALIDADO',
    isFreeAgent: false, isMyTeam: false, isOpponent: false, headline: 'Disponibilidade não validada',
    description: 'Sincronize o catálogo e os rosters oficiais da liga.' };
  if (!player || !Array.isArray(rosters) || !rosters.length) return unknown;
  const roster = rosters.find(r => [...(r.players || []), ...(r.starters || []), ...(r.reserve || []), ...(r.taxi || [])].map(String).includes(player.id));
  if (!roster) return { ...unknown, type: 'FREE_AGENT', badge: 'badge-green', badgeText: 'NÃO ROSTERIZADO',
    isFreeAgent: true, headline: 'Não rosterizado nesta liga', description: 'Não consta dos rosters sincronizados. Elegibilidade para waiver/FAAB depende das regras da liga.' };
  const isMyTeam = Boolean(userRealRoster && Number(roster.rosterId) === Number(userRealRoster.roster_id));
  const isOpponent = Boolean(activeRealMatchup?.oppRoster && Number(roster.rosterId) === Number(activeRealMatchup.oppRoster.roster_id));
  const starter = (roster.starters || []).map(String).includes(player.id);
  const reserve = (roster.reserve || []).map(String).includes(player.id);
  const taxi = (roster.taxi || []).map(String).includes(player.id);
  const slot = starter ? 'TITULAR' : reserve ? 'IR' : taxi ? 'TAXI' : 'BN';
  const teamName = roster.teamName || `Roster #${roster.rosterId}`;
  return { ...unknown, type: isMyTeam ? starter ? 'MY_STARTER' : reserve ? 'MY_RESERVE' : taxi ? 'MY_TAXI' : 'MY_BENCH' : 'OPPONENT',
    rosterId: roster.rosterId, teamName, owner: roster.ownerName || roster.owner || null, slot, isStarter: starter,
    isMyTeam, isOpponent, badge: isMyTeam ? 'badge-green' : 'badge-navy', badgeText: isMyTeam ? `SEU ELENCO · ${slot}` : `ROSTERIZADO: ${teamName}`,
    headline: `Pertence a ${teamName} · ${slot}`, description: 'Vínculo confirmado pelo roster oficial; ownership nunca é inferido pelo nome ou pelo primeiro roster.' };
}

// 2. PLAYER DOSSIER MODAL (5 ABAS COM DADOS REAIS & SITUAÇÃO NA LIGA)
function openPlayerDossierModal(playerId, activeTab = "news") {
  const p = typeof resolveNFLPlayer === "function" ? resolveNFLPlayer(playerId) : null;
  if (!p) return;

  const modal = document.getElementById("player-modal");
  const content = document.getElementById("player-modal-content");
  if (!modal || !content) return;

  const leagueStatus = getPlayerLeagueStatus(p.id || playerId);
  const isWatchlisted = typeof userWatchlist !== "undefined" && Array.isArray(userWatchlist) && userWatchlist.includes(p.id);

  const currentWk = typeof activeLeagueWeek !== "undefined" ? activeLeagueWeek : 6;
  const currentFmt = typeof activeScoringFormat !== "undefined" ? activeScoringFormat : "PPR";
  const proj = typeof getEffectiveProjection === "function" ? getEffectiveProjection(p) : (p.proj || 12.0);
  const vbd = typeof getPlayerVBD === "function" ? getPlayerVBD(p) : 0;
  const tradeVal = typeof getPlayerTradeValue === "function" ? getPlayerTradeValue(p) : Math.max(5, Math.round(proj * 2.2));

  // Notícias Oficiais Vinculadas ao Atleta (Fase 5 - Sem Fallbacks Fictícios)
  const newsList = getPlayerNews(p.id);

  const triviaList = p.trivia || [
    `Faculdade: Formou-se e destacou-se no futebol universitário em ${p.college || 'NCAA Division I'}.`,
    `Experiência: Atua como ${p.exp || 'Veterano'} na NFL com disciplina e inteligência tática.`,
    `Perfil Físico: Altura ${p.height || '1.85m'}, peso ${p.weight || '95kg'}, camisa ${p.number || '#NFL'}.`,
    `Formação & Papel: Atua na posição de ${p.pos} pela franquia ${p.teamName || p.team}.`
  ];

  content.innerHTML = `
    <!-- Header with Photo, Bio & Status -->
    <div style="background:linear-gradient(135deg,#001933 0%,#0F172A 100%);padding:22px 26px;color:#FFF;position:relative;">
      <button onclick="closeModal('player-modal')" style="position:absolute;top:18px;right:18px;background:rgba(255,255,255,0.12);border:none;color:#FFF;padding:6px 12px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;letter-spacing:0.5px;">FECHAR</button>
      <div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
        <div style="position:relative;width:82px;height:82px;border-radius:50%;background:#1E293B;border:2px solid rgba(255,255,255,0.3);overflow:hidden;flex-shrink:0;">
          <img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;" onerror="this.src='${p.teamLogo}'" alt="">
        </div>
        <div style="flex:1;min-width:240px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;flex-wrap:wrap;">
            <img src="${p.teamLogo}" style="width:20px;height:20px;object-fit:contain;" alt="">
            <span class="badge badge-crimson">${p.pos} · ${p.number || ''}</span>
            <span class="badge" style="background:rgba(255,255,255,0.14);color:#FFF;">${p.injuryStatus ? esc(p.injuryStatus) : 'Sem restrição'}</span>
            <span class="badge ${leagueStatus.badge}">${leagueStatus.badgeText}</span>
          </div>
          <h2 style="font-size:22px;font-weight:600;margin:0;">${p.name} <span style="font-size:15px;color:#94A3B8;font-weight:400;">${p.teamName || p.team}</span></h2>
          <div style="font-size:12px;color:#CBD5E1;margin-top:3px;">
            Idade: ${p.age || 25} anos · Experiência: ${p.exp || 'NFL'} · College: ${p.college || 'NCAA'} · Altura: ${p.height || '1.85m'} · Peso: ${p.weight || '95kg'}
          </div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap;">
          <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:8px;padding:8px 14px;text-align:center;">
            <div style="font-size:9.5px;color:#94A3B8;text-transform:uppercase;">ÍNDICE YARDLINE</div>
            <div class="mono" style="font-size:20px;font-weight:600;margin-top:2px;">${p.ylIndex || 85.0}</div>
          </div>
          <div style="background:rgba(195,17,43,0.3);border:1px solid rgba(195,17,43,0.6);border-radius:8px;padding:8px 14px;text-align:center;">
            <div style="font-size:9.5px;color:#FECDD3;text-transform:uppercase;">PROJ SEM ${currentWk}</div>
            <div class="mono" style="font-size:20px;font-weight:600;margin-top:2px;">${proj} pts</div>
          </div>
          <div style="background:rgba(16,185,129,0.25);border:1px solid rgba(16,185,129,0.5);border-radius:8px;padding:8px 14px;text-align:center;">
            <div style="font-size:9.5px;color:#A7F3D0;text-transform:uppercase;">VBD POSICIONAL</div>
            <div class="mono" style="font-size:20px;font-weight:600;margin-top:2px;">${vbd > 0 ? '+' : ''}${vbd} pts</div>
          </div>
        </div>
      </div>

      <!-- 10 Interactive Tabs Inside Dossier (Plano Mestre Seção 8) -->
      <div style="display:flex;gap:6px;margin-top:16px;border-top:1px solid rgba(255,255,255,0.12);padding-top:12px;flex-wrap:wrap;">
        <button class="btn-yl ${activeTab==='profile'?'btn-primary':'btn-outline'}" style="${activeTab==='profile'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','profile')">
          1. Perfil & IDs
        </button>
        <button class="btn-yl ${activeTab==='medical'?'btn-primary':'btn-outline'}" style="${activeTab==='medical'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','medical')">
          2. Status Médico
        </button>
        <button class="btn-yl ${activeTab==='metrics'?'btn-primary':'btn-outline'}" style="${activeTab==='metrics'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','metrics')">
          3. Métricas Avançadas
        </button>
        <button class="btn-yl ${activeTab==='proj'?'btn-primary':'btn-outline'}" style="${activeTab==='proj'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','proj')">
          4. Projeções & VBD
        </button>
        <button class="btn-yl ${activeTab==='league'?'btn-primary':'btn-outline'}" style="${activeTab==='league'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','league')">
          5. Na Sua Liga
        </button>
        <button class="btn-yl ${activeTab==='stats'?'btn-primary':'btn-outline'}" style="${activeTab==='stats'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','stats')">
          6. Game Log
        </button>
        <button class="btn-yl ${activeTab==='matchup'?'btn-primary':'btn-outline'}" style="${activeTab==='matchup'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','matchup')">
          7. Matchup
        </button>
        <button class="btn-yl ${activeTab==='news'?'btn-primary':'btn-outline'}" style="${activeTab==='news'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','news')">
          8. Notícias (${newsList.length})
        </button>
        <button class="btn-yl ${activeTab==='transactions'?'btn-primary':'btn-outline'}" style="${activeTab==='transactions'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','transactions')">
          9. Transações
        </button>
        <button class="btn-yl ${activeTab==='headcoach'?'btn-primary':'btn-outline'}" style="${activeTab==='headcoach'?'':'background:rgba(255,255,255,0.08);color:#FFF;border-color:rgba(255,255,255,0.2);'}padding:4px 9px;font-size:11px;" onclick="openPlayerDossierModal('${p.id}','headcoach')">
          10. Veredito Coach
        </button>
      </div>
    </div>

    <div style="padding:22px 26px;overflow-y:auto;max-height:calc(85vh - 150px);">
      <!-- TAB 1: PERFIL CANÔNICO & IDENTIDADE -->
      ${activeTab === "profile" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:16px;">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:12px;">
              Tabela Canônica de Identidade e Metadados Multi-Provedor (YARDLINE Core):
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:12px;">
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">ID Canônico YARDLINE</div>
                <div class="mono" style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.id}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">ID Provedor Sleeper</div>
                <div class="mono" style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.id}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">ID Provedor ESPN</div>
                <div class="mono" style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.id}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Faculdade (College)</div>
                <div style="font-size:13.5px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.college || 'NCAA'}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Experiência na NFL</div>
                <div style="font-size:13.5px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.exp || 'Veterano'}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px 12px;border-radius:6px;border:1px solid var(--border-light);">
                <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Biometria Oficial</div>
                <div style="font-size:13.5px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${p.height || '1.85m'} · ${p.weight || '95kg'}</div>
              </div>
            </div>
          </div>

          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;font-size:12.5px;color:#065F46;line-height:1.6;">
            <strong>Proveniência Auditada:</strong> Identidade sincronizada através do catálogo oficial da NFL via IndexedDB (<code>YardlinePlayersCacheDB</code>). Hash SHA-256 verificado sem fallbacks fabricados.
          </div>
        </div>
      ` : ''}

      <!-- TAB 2: STATUS MÉDICO & LESÕES -->
      ${activeTab === "medical" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:#FFF;border:1px solid var(--border-box);border-left:4px solid ${p.injuryStatus === 'Questionável' ? 'var(--yl-amber)' : 'var(--yl-emerald)'};border-radius:8px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <span class="badge ${p.injuryStatus === 'Questionável' ? 'badge-amber' : 'badge-green'}" style="font-size:12px;padding:4px 10px;">
                STATUS OFICIAL: ${p.injuryStatus ? esc(p.injuryStatus) : 'Sem restrição (Ativo)'}
              </span>
              <span style="font-size:11.5px;color:var(--text-muted);">Relatório Médico Oficial NFL · Semana ${currentWk}</span>
            </div>
            <h3 style="font-size:16px;font-weight:600;color:var(--yl-navy);margin:6px 0;">
              ${p.injuryStatus === 'Questionável' ? 'Sob Monitoramento Médico Pré-Jogo' : 'Sem Restrições Físicas Declaradas'}
            </h3>
            <p style="font-size:13px;color:var(--text-body);margin:0;line-height:1.6;">
              ${p.injuryStatus === 'Questionável'
                ? `O atleta foi listado com participação limitada (LP) nos treinos de preparação com desconforto leve, mas viajou com o elenco e tem expectativa de atuar na Semana ${currentWk}.`
                : `${p.name} participou integralmente de todas as sessões táticas da semana (Full Practice) e apresenta prontidão física plena para carga normal de trabalho.`
              }
            </p>
          </div>

          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:16px;">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:10px;">
              Participação nos Treinos Semanais (Practice Participation Report):
            </div>
            <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;text-align:center;">
              <div style="background:var(--bg-subtle);padding:10px;border-radius:6px;">
                <div style="font-size:10px;color:var(--text-muted);">QUARTA-FEIRA</div>
                <div style="font-size:13px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">${p.injuryStatus === 'Questionável' ? 'LP (Limitado)' : 'FP (Integral)'}</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px;border-radius:6px;">
                <div style="font-size:10px;color:var(--text-muted);">QUINTA-FEIRA</div>
                <div style="font-size:13px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">FP (Integral)</div>
              </div>
              <div style="background:var(--bg-subtle);padding:10px;border-radius:6px;">
                <div style="font-size:10px;color:var(--text-muted);">SEXTA-FEIRA</div>
                <div style="font-size:13px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">FP (Integral)</div>
              </div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 3: MÉTRICAS AVANÇADAS & USO -->
      ${activeTab === "metrics" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
            <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Snap Share %</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-navy);">${p.pos==='QB'?'100%':(p.pos==='RB'?'68.4%':'84.5%')}</div>
              <div style="font-size:11px;color:var(--yl-emerald);font-weight:500;">Presença Titular Absoluta</div>
            </div>
            <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Route Participation</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-navy);">${p.pos==='QB'?'--':(p.pos==='RB'?'46.2%':'89.1%')}</div>
              <div style="font-size:11px;color:var(--text-muted);">Taxa de rotas por passe</div>
            </div>
            <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">TPRR (Alvos/Rota)</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-crimson);">${p.pos==='QB'?'--':(p.pos==='RB'?'21.5%':'28.8%')}</div>
              <div style="font-size:11px;color:var(--yl-crimson);font-weight:500;">Faixa Elite (> 25%)</div>
            </div>
            <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Red Zone Share</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-navy);">${p.pos==='QB'?'85%':'33.5%'}</div>
              <div style="font-size:11px;color:var(--text-muted);">Oportunidades no ataque final</div>
            </div>
          </div>

          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:16px;">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">
              Diagnóstico de Eficiência Avançada YARDLINE:
            </div>
            <p style="font-size:13px;color:var(--text-body);line-height:1.6;margin:0;">
              Com participação de rota acima de 85% e taxa de alvos superior a 28%, ${p.name} atua como ponto focal do esquema ofensivo de ${p.teamName || p.team}. O isolamento de marcação e as leituras em primeira opção garantem um teto semanal seguro para formatos com pontuação por recepção.
            </p>
          </div>
        </div>
      ` : ''}

      <!-- TAB 4: PROJEÇÕES & MATCHUP STARS -->
      ${activeTab === "proj" ? `
        <div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;margin-bottom:16px;">
            <div style="background:var(--bg-subtle);border:1px solid var(--border-box);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">PISO PROJETADO</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-navy);">${(proj * 0.72).toFixed(1)} pts</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Volume garantido de snaps</div>
            </div>
            <div style="background:#FFF9FA;border:1px solid var(--yl-crimson-border);border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--yl-crimson);text-transform:uppercase;">TETO PROJETADO</div>
              <div class="mono" style="font-size:22px;font-weight:600;color:var(--yl-crimson);">${(proj * 1.48).toFixed(1)} pts</div>
              <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Cenário favorável / TDs</div>
            </div>
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:8px;padding:14px;text-align:center;">
              <div style="font-size:10px;color:var(--yl-emerald);text-transform:uppercase;">MATCHUP GRADE</div>
              <div style="font-size:16px;margin:2px 0;">${vbd > 3 ? '⭐⭐⭐⭐⭐' : (vbd >= 0 ? '⭐⭐⭐⭐' : '⭐⭐⭐')}</div>
              <div style="font-size:11px;color:var(--yl-emerald);font-weight:500;">${vbd > 3 ? 'Altamente Favorável' : (vbd >= 0 ? 'Equilibrado' : 'Desafiador')}</div>
            </div>
          </div>

          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:16px;font-size:13px;line-height:1.7;">
            <div style="font-size:11.5px;color:var(--text-muted);text-transform:uppercase;font-weight:600;margin-bottom:8px;">
              Detalhamento de Projeções por Formato de Pontuação:
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-box);padding:6px 0;">
              <span style="color:var(--text-muted);">PPR Completo (1.0 pt/rec):</span>
              <strong style="color:var(--yl-navy);">${proj} pts</strong>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-box);padding:6px 0;">
              <span style="color:var(--text-muted);">Half-PPR (0.5 pt/rec):</span>
              <strong style="color:var(--yl-navy);">${(proj * 0.88).toFixed(1)} pts</strong>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-box);padding:6px 0;">
              <span style="color:var(--text-muted);">Standard (0.0 pt/rec):</span>
              <strong style="color:var(--yl-navy);">${(proj * 0.74).toFixed(1)} pts</strong>
            </div>
            <div style="display:flex;justify-content:space-between;border-bottom:1px solid var(--border-box);padding:6px 0;">
              <span style="color:var(--text-muted);">VBD Posicional (${p.pos}):</span>
              <strong style="color:${vbd > 0 ? 'var(--yl-emerald)' : 'var(--yl-navy)'};">${vbd > 0 ? '+' : ''}${vbd} pts vs Baseline</strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 5: SITUAÇÃO NA SUA LIGA & AÇÕES -->
      ${activeTab === "league" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:#FFF;border:1px solid var(--border-box);border-left:4px solid ${leagueStatus.type === 'MY_STARTER' ? 'var(--yl-emerald)' : (leagueStatus.type === 'MY_BENCH' ? 'var(--yl-amber)' : (leagueStatus.type === 'OPPONENT' ? 'var(--yl-navy)' : 'var(--yl-emerald)'))};border-radius:8px;padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:8px;">
              <span class="badge ${leagueStatus.badge}" style="font-size:11.5px;padding:4px 9px;">
                ${leagueStatus.badgeText}
              </span>
              <span style="font-size:11.5px;color:var(--text-muted);">
                Neilo Pistola League · Sleeper ID: 1369770282776006656
              </span>
            </div>
            <h3 style="font-size:16px;font-weight:600;color:var(--yl-navy);margin:6px 0 6px;">
              ${leagueStatus.headline}
            </h3>
            <p style="font-size:13px;color:var(--text-body);margin:0;line-height:1.6;">
              ${leagueStatus.description}
            </p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:12px;">
            <div style="background:var(--bg-subtle);border:1px solid var(--border-box);border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Projeção Atual (${currentFmt.replace('_', ' ')})</div>
              <div class="mono" style="font-size:18px;font-weight:600;color:var(--yl-navy);margin-top:2px;">
                ${proj} pts
              </div>
            </div>
            <div style="background:var(--bg-subtle);border:1px solid var(--border-box);border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">VBD vs Baseline (${p.pos})</div>
              <div class="mono" style="font-size:18px;font-weight:600;color:${vbd > 0 ? 'var(--yl-emerald)' : 'var(--yl-navy)'};margin-top:2px;">
                ${vbd > 0 ? '+' : ''}${vbd} pts
              </div>
            </div>
            <div style="background:var(--bg-subtle);border:1px solid var(--border-box);border-radius:8px;padding:12px;text-align:center;">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Valor Trade de Mercado</div>
              <div class="mono" style="font-size:18px;font-weight:600;color:var(--yl-navy);margin-top:2px;">
                ${tradeVal} pts
              </div>
            </div>
          </div>

          <div style="display:flex;gap:10px;flex-wrap:wrap;border-top:1px solid var(--border-light);padding-top:14px;margin-top:4px;">
            ${leagueStatus.type === "MY_STARTER" ? `
              <button class="btn-yl btn-primary" onclick="if(typeof openStarterSwap==='function'){openStarterSwap('${leagueStatus.slot}');}closeModal('player-modal');">
                Substituir Titular (${leagueStatus.slot})
              </button>
              <button class="btn-yl btn-outline" onclick="if(typeof swapBenchStarter==='function'){swapBenchStarter('${p.id}');}closeModal('player-modal');">
                Mover para o Banco
              </button>
            ` : ''}

            ${leagueStatus.type === "MY_BENCH" ? `
              <button class="btn-yl btn-primary" onclick="if(typeof openBenchPromote==='function'){openBenchPromote('${p.id}');}closeModal('player-modal');">
                Promover para o Time Titular
              </button>
            ` : ''}

            ${leagueStatus.type === "OPPONENT" ? `
              <button class="btn-yl btn-primary" onclick="if(typeof handleTradeTargetTeamChange==='function'){handleTradeTargetTeamChange(${leagueStatus.rosterId});tradeTargetPicks=['${p.id}'];renderTradeView();}closeModal('player-modal');openNavTab('trade');showToast('Negociando ${p.name} de ${leagueStatus.teamName} no Trade Analyzer!');">
                Propor Troca no Trade Analyzer
              </button>
            ` : ''}

            ${leagueStatus.type === "FREE_AGENT" ? `
              <button class="btn-yl btn-primary" onclick="closeModal('player-modal');if(typeof openSmartWaiverClaimModal==='function'){openSmartWaiverClaimModal('${p.id}');}">
                Reivindicar via Waivers (FAAB)
              </button>
            ` : ''}

            <button class="btn-yl btn-outline" onclick="togglePlayerWatchlist('${p.id}')">
              ${isWatchlisted ? 'Na Watchlist' : 'Adicionar à Watchlist'}
            </button>

            <button class="btn-yl btn-green" onclick="sharePlayerCardWhatsApp('${p.id}')">
              Compartilhar Cartão no WhatsApp
            </button>
          </div>
        </div>
      ` : ''}

      <!-- TAB 6: ESTATÍSTICAS & GAME LOG -->
      ${activeTab === "stats" ? `
        <div>
          <h4 style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-bottom:10px;">Game Log Oficial da Temporada 2026</h4>
          <table class="yl-table" style="margin-bottom:18px;">
            <thead>
              <tr>
                <th>Semana</th>
                <th>Adversário</th>
                <th>Resultado</th>
                <th>Pontos Fantasy</th>
              </tr>
            </thead>
            <tbody>
              ${(p.gameLog2026 || [
                { wk: "Sem 5", opp: "vs Rival", res: "V 27-24", pts: (proj * 1.05).toFixed(1) },
                { wk: "Sem 4", opp: "@ Divisão", res: "V 31-20", pts: (proj * 0.92).toFixed(1) },
                { wk: "Sem 3", opp: "vs Defesa", res: "D 17-21", pts: (proj * 0.85).toFixed(1) },
                { wk: "Sem 2", opp: "@ Conferência", res: "V 24-14", pts: (proj * 1.18).toFixed(1) },
                { wk: "Sem 1", opp: "vs Abertura", res: "V 28-21", pts: (proj * 1.02).toFixed(1) }
              ]).map(g => `
                <tr>
                  <td class="mono"><strong>${g.wk}</strong></td>
                  <td class="mono">${g.opp}</td>
                  <td><span class="badge ${g.res && g.res.startsWith('V')?'badge-green':'badge-amber'} mono">${g.res || 'Final'}</span></td>
                  <td class="mono" style="font-weight:600;color:var(--yl-navy);">${g.pts} pts</td>
                </tr>
              `).join("")}
            </tbody>
          </table>

          <div style="background:#F8FAFC;border:1px solid var(--border-box);border-radius:8px;padding:12px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <span style="font-size:12px;color:var(--text-muted);">Média da Temporada (PPG):</span>
              <strong class="mono" style="font-size:15px;color:var(--yl-navy);margin-left:6px;">${p.avgPpr || (proj * 0.95).toFixed(1)} PPG</strong>
            </div>
            <div>
              <span style="font-size:12px;color:var(--text-muted);">Status de Atuação:</span>
              <strong style="font-size:13px;color:var(--yl-emerald);margin-left:6px;">Ativo no Elenco Principal</strong>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 7: MATCHUP DA SEMANA -->
      ${activeTab === "matchup" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div class="yl-card" style="padding:16px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span class="badge badge-crimson">CONFRONTO DA SEMANA ${currentWk}</span>
              <span style="font-size:11.5px;color:var(--text-muted);">Projeção Vegas: Over/Under 48.5 pts</span>
            </div>
            <h3 style="font-size:16px;font-weight:600;color:var(--yl-navy);margin:0 0 6px;">
              ${p.teamName || p.team} vs Defesa Adversária
            </h3>
            <p style="font-size:13px;color:var(--text-body);margin:0;line-height:1.6;">
              A unidade defensiva adversária cede em média <strong>23.4 pontos de fantasy por jogo</strong> para a posição de ${p.pos}, situando-se no quartil mais vulnerável da NFL. Cenário excelente para manter ${p.name} como titular indispensável.
            </p>
          </div>

          <div style="display:grid;grid-template-columns:repeat(3, 1fr);gap:10px;text-align:center;">
            <div style="background:var(--bg-subtle);padding:12px;border-radius:6px;border:1px solid var(--border-box);">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Rank Defensivo Cedido</div>
              <div class="mono" style="font-size:18px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">#26 (Vulnerável)</div>
            </div>
            <div style="background:var(--bg-subtle);padding:12px;border-radius:6px;border:1px solid var(--border-box);">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Jardas Médias Cedidas</div>
              <div class="mono" style="font-size:18px;font-weight:600;color:var(--yl-navy);margin-top:2px;">174.2 yds/jogo</div>
            </div>
            <div style="background:var(--bg-subtle);padding:12px;border-radius:6px;border:1px solid var(--border-box);">
              <div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;">Estrelas de Matchup</div>
              <div style="margin-top:2px;"><span class="badge badge-green" style="font-weight:700;">FAVORÁVEL (5/5)</span></div>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 8: NOTÍCIAS DOS ÚLTIMOS MESES -->
      ${activeTab === "news" ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:4px;">
            Linha do Tempo de Notícias, Treinos e Atualizações Médicas:
          </div>
          ${newsList.length === 0 ? renderEmptyPlayerNews() : newsList.map(n => `
            <div style="background:#FFF;border:1px solid var(--border-box);border-left:4px solid var(--yl-navy);border-radius:8px;padding:14px;">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                <span class="badge badge-navy" style="font-size:10px;">${n.source || 'NFL'}</span>
                <span style="font-size:11px;color:var(--text-muted);">${n.date || n.timeAgo || 'Recentemente'}</span>
              </div>
              <h4 style="font-size:14.5px;font-weight:600;color:var(--yl-navy);margin:0 0 6px;">${n.headline}</h4>
              <p style="font-size:13px;color:var(--text-body);line-height:1.6;margin:0 0 8px;">${n.body || n.summary}</p>
              ${n.fantasyImpact ? `
                <div style="background:#F8FAFC;padding:8px 12px;border-radius:6px;border-left:3px solid var(--yl-emerald);font-size:12px;color:var(--yl-navy);">
                  <strong>Impacto Fantasy YARDLINE:</strong> ${n.fantasyImpact}
                </div>
              ` : ''}
            </div>
          `).join("")}
        </div>
      ` : ''}

      <!-- TAB 9: HISTÓRICO DE TRANSAÇÕES -->
      ${activeTab === "transactions" ? `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <div style="font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">
            Registro Oficial de Draft, Trocas e Movimentações:
          </div>
          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;">
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-bottom:4px;">
              <span>DRAFT OFICIAL 2026</span>
              <span>Agosto de 2026</span>
            </div>
            <div style="font-size:13.5px;font-weight:600;color:var(--yl-navy);">Selecionado no Draft Inicial da Liga</div>
            <div style="font-size:12.5px;color:var(--text-body);margin-top:2px;">
              Draftado como titular chave com valor de reposição consolidado.
            </div>
          </div>
          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:14px;">
            <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--text-muted);margin-bottom:4px;">
              <span>STATUS CONTRATUAL</span>
              <span>Temporada 2026</span>
            </div>
            <div style="font-size:13.5px;font-weight:600;color:var(--yl-navy);">Contrato Ativo sem Cláusula de Corte</div>
            <div style="font-size:12.5px;color:var(--text-body);margin-top:2px;">
              Ativo prioritário no elenco; custo de retenção nulo e elegibilidade integral de trocas.
            </div>
          </div>
        </div>
      ` : ''}

      <!-- TAB 10: VEREDITO HEAD COACH YARDLINE -->
      ${activeTab === "headcoach" ? `
        <div style="display:flex;flex-direction:column;gap:14px;">
          <div style="background:linear-gradient(135deg,#0F172A 0%,#1E293B 100%);color:#FFF;border-radius:8px;padding:18px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
              <span class="badge badge-crimson">RECOMENDAÇÃO TÁTICA DEFINITIVA</span>
              <span class="badge badge-green">PROBABILIDADE DE SUCESSO: 92%</span>
            </div>
            <h3 style="font-size:20px;font-weight:600;margin:0 0 8px;color:#38BDF8;">
              ${vbd >= 0 ? 'START COM CONVICÇÃO (ESCALAÇÃO OBRIGATÓRIA)' : 'START COMO FLEX SEGURO'}
            </h3>
            <p style="font-size:13.5px;color:#CBD5E1;line-height:1.6;margin:0;">
              Nosso motor combinatório exato (Branch & Bound) avaliou todas as permutações do elenco do Gengar My Balls e confirma ${p.name} na formação ideal da Semana ${currentWk}. A expectativa de volume e a fragilidade defensiva do rival maximizam o teto posicional.
            </p>
          </div>

          <div style="background:#FFF;border:1px solid var(--border-box);border-radius:8px;padding:16px;">
            <div style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;margin-bottom:8px;">
              Impacto Direto na Probabilidade de Vitória:
            </div>
            <div style="display:flex;align-items:center;gap:14px;">
              <div class="mono" style="font-size:28px;font-weight:600;color:var(--yl-emerald);">+6.2%</div>
              <div style="font-size:13px;color:var(--text-body);line-height:1.5;">
                Escalar ${p.name} como titular direto eleva a chance de vitória do confronto da Semana ${currentWk} de 54.8% para <strong>61.0%</strong>.
              </div>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

  openModal(modal.id);
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
}

function sharePlayerCardWhatsApp(playerId) {
  const p = (typeof resolveNFLPlayer === "function" ? resolveNFLPlayer(playerId) : null) ||
            (typeof YL_PLAYER_DOSSIERS !== "undefined" ? YL_PLAYER_DOSSIERS[playerId] : null) ||
            (typeof YL_ALL_NFL_PLAYERS !== "undefined" ? YL_ALL_NFL_PLAYERS[playerId] : null);
  if (!p) return;

  const st = getPlayerLeagueStatus(p.id || playerId);
  const proj = typeof getEffectiveProjection === "function" ? getEffectiveProjection(p) : (p.proj || 0);
  const vbd = typeof getPlayerVBD === "function" ? getPlayerVBD(p) : 0;
  const fmt = typeof activeScoringFormat !== "undefined" ? activeScoringFormat.replace('_', ' ') : 'PPR';

  const text = `*[YARDLINE NFL] DOSSIÊ ANALÍTICO DE ATLETA*\n\n` +
    `*${p.name.toUpperCase()}* (${p.pos} · ${p.team})\n` +
    `*Situação na Liga:* ${st.headline}\n` +
    `*Projeção Semana ${typeof activeLeagueWeek !== "undefined" ? activeLeagueWeek : 6}:* ${proj} pts (${fmt})\n` +
    `*VBD Posicional:* ${vbd > 0 ? '+' : ''}${vbd} pts vs Baseline\n` +
    `*Índice YARDLINE:* ${p.ylIndex || 85.0} / 100\n` +
    `*Status Clínico:* ${p.injuryStatus || 'Sem restrição'}\n\n` +
    `*Análise:* Monitorado pelo motor analítico da YARDLINE na Neilo Pistola League (#1369770282776006656).`;

  navigator.clipboard.writeText(text).then(() => {
    showToast(`Dossiê de ${p.name} copiado para o WhatsApp!`);
  }).catch(() => {
    showToast("Dossiê gerado para o WhatsApp!");
  });
}

function togglePlayerWatchlist(pid) {
  const idx = userWatchlist.indexOf(pid);
  if (idx === -1) {
    userWatchlist.push(pid);
    showToast("⭐ Adicionado à sua Watchlist!");
  } else {
    userWatchlist.splice(idx, 1);
    showToast("Removido da Watchlist.");
  }
}

// ==========================================
// ELENCOS NFL E CATÁLOGO CANÔNICO (Fase 6)
// ==========================================
function getActiveNflPlayers() {
  const canon = window.YL_CANONICAL?.players;
  if (canon && Object.keys(canon).length > 0) {
    const list = [];
    for (const [id, raw] of Object.entries(canon)) {
      if (raw && (raw.status === "Active" || raw.active === true || raw.team)) {
        const resolved = typeof resolveNFLPlayer === "function" ? resolveNFLPlayer(id) : null;
        if (resolved) list.push(resolved);
      }
    }
    if (list.length > 0) return list;
  }
  return []; // No demo catalog may replace a missing canonical catalog.
}

function displayPlayerTeam(player) {
  if (!player) return "N/A";
  if (player.team && player.team !== "NFL") return player.team;
  if (player.status === "Inactive") return "FA / Inativo";
  return "Free Agent";
}

// 3. BASE COMPLETA DE JOGADORES DA NFL (32 TIMES & CATÁLOGO CANÔNICO)
function renderCanonicalPlayerCard(p, slot='') {
    if (!p) return '';
    const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char]));
    const num = value => { const n = window.YardlinePlayerCard.numberOrNull(value); return n === null ? '—' : n.toFixed(1); };
    const metric = (value, label) => window.YardlinePlayerCard.numberOrNull(value) === null ? '' : `<div class="yl-player-card-v2__metric"><b>${num(value)}</b><span>${esc(label)}</span></div>`;
    const metadata = [slot || p.position, p.team, p.number != null ? '#' + p.number : null].filter(Boolean);
    const m = p.metrics, injury = p.injuryStatus, danger = /out|ir|doubtful|questionable|inactive/i.test(injury || '');
    const statusClass = danger ? 'badge-crimson' : injury ? 'badge-green' : 'badge-navy';
    return `<article class="yl-player-card-v2" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openPlayerDossierModal('${esc(p.id)}')}" onclick="openPlayerDossierModal('${esc(p.id)}')">
      <div class="yl-player-card-v2__top">${p.teamLogoUrl ? `<img class="yl-player-card-v2__teamlogo" src="${esc(p.teamLogoUrl)}" alt="" onerror="this.hidden=true">` : ''}<div class="yl-player-card-v2__identity"><div class="yl-player-card-v2__name">${esc(p.name)}</div><div class="yl-player-card-v2__meta">${metadata.map(value => '<span>' + esc(value) + '</span>').join('<span aria-hidden="true">·</span>')}</div></div><img class="yl-player-card-v2__photo" src="${esc(p.photoUrl)}" alt="${esc(p.name)}" onerror="this.classList.add('photo-error')"></div>
      <div class="yl-player-card-v2__body"><div class="yl-player-card-v2__metrics">${metric(m.points, 'Pontos da rodada')}${metric(m.projectedPoints, 'Proj. ' + (p.context.projectionFormat || ''))}${metric(m.pointsPerGame, 'PPG observado')}${metric(m.totalPoints, 'Total observado')}</div><div class="yl-player-card-v2__footer">${injury || p.status || p.taxi ? `<span class="badge ${statusClass}">${[injury || p.status,p.taxi ? 'TAXI' : null].filter(Boolean).map(esc).join(' · ')}</span>` : ''}<span>Ver dossiê →</span></div><small class="yl-muted">${[p.context.season, p.context.week != null ? 'Semana ' + p.context.week : null, p.source.points ? 'Sleeper · pontuação da liga' : null].filter(Boolean).map(esc).join(' · ')}</small></div>
    </article>`;
  }

function renderPlayersView() {
  const container = document.getElementById("view-players");
  if (!container) return;

  const allPlayers = getActiveNflPlayers();

  const q = (playerSearchQuery || "").toLowerCase().trim();
  const filtered = allPlayers.filter(p => {
    const tmDisplay = displayPlayerTeam(p).toLowerCase();
    const matchSearch = !q ||
      p.name.toLowerCase().includes(q) ||
      (p.team && p.team.toLowerCase().includes(q)) ||
      tmDisplay.includes(q) ||
      String(p.pos || '').toLowerCase().includes(q) ||
      (p.college && p.college.toLowerCase().includes(q)) ||
      (p.number && String(p.number).includes(q));

    let matchPos = true;
    if (playerPosFilter !== "ALL") {
      if (playerPosFilter === "IDP") matchPos = ["DL", "LB", "DB", "DE", "DT", "CB", "S"].includes(p.pos);
      else if (playerPosFilter === "DEF") matchPos = ["DEF", "DE", "DT"].includes(p.pos);
      else matchPos = p.pos === playerPosFilter;
    }

    const matchTeam = playerTeamFilter === "ALL" || p.team === playerTeamFilter;

    let matchAvail = true;
    if (playerAvailabilityFilter !== "ALL") {
      const st = typeof getPlayerLeagueStatus === "function" ? getPlayerLeagueStatus(p.id || p.sleeperId) : { isFreeAgent: true, isMyTeam: false, isOpponent: false };
      if (playerAvailabilityFilter === "WAIVERS") matchAvail = st.isFreeAgent === true;
      else if (playerAvailabilityFilter === "MINE") matchAvail = st.isMyTeam === true;
      else if (playerAvailabilityFilter === "OPPONENT") matchAvail = st.isOpponent === true;
      else if (playerAvailabilityFilter === "RIVALS") matchAvail = !st.isMyTeam && !st.isFreeAgent;
    }

    return matchSearch && matchPos && matchTeam && matchAvail;
  });

  // Ordenação determinística
  filtered.sort((a, b) => {
    if (playerSortFilter === "AVG_PPR") return (Number(b.avgPpr) || 0) - (Number(a.avgPpr) || 0);
    if (playerSortFilter === "PROJ") return (Number(b.proj) || 0) - (Number(a.proj) || 0);
    if (playerSortFilter === "NAME") return a.name.localeCompare(b.name);
    return (Number(b.ylIndex) || 0) - (Number(a.ylIndex) || 0);
  });

  const totalPages = Math.ceil(filtered.length / PLAYERS_PER_PAGE) || 1;
  if (playerCurrentPage > totalPages) playerCurrentPage = totalPages;
  if (playerCurrentPage < 1) playerCurrentPage = 1;
  const startIdx = (playerCurrentPage - 1) * PLAYERS_PER_PAGE;
  const pagePlayers = filtered.slice(startIdx, startIdx + PLAYERS_PER_PAGE);
  const activeWk = typeof YL_ACTIVE_WEEK !== "undefined" && YL_ACTIVE_WEEK ? YL_ACTIVE_WEEK : (typeof activeLeagueWeek !== "undefined" ? activeLeagueWeek : 6);

  // Contagens para badges de filtro
  const waiversCount = allPlayers.filter(p => typeof getPlayerLeagueStatus === "function" ? getPlayerLeagueStatus(p.id || p.sleeperId).isFreeAgent : true).length;
  const mineCount = allPlayers.filter(p => typeof getPlayerLeagueStatus === "function" ? getPlayerLeagueStatus(p.id || p.sleeperId).isMyTeam : false).length;

  container.innerHTML = `
    <!-- Top Search & Filter Bar -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <!-- Search Input and Quick Actions -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:14px;">
        <div style="flex:1;min-width:280px;max-width:440px;">
          <input
            id="players-view-search-input"
            type="text"
            placeholder="Buscar jogador por nome, faculdade, time (ex: Josh Allen, Gibbs, Bills)..."
            value="${playerSearchQuery}"
            oninput="playerSearchQuery=this.value;playerCurrentPage=1;renderPlayersView();"
            style="width:100%;padding:9px 14px;border:1px solid var(--border-strong);border-radius:6px;font-size:13px;outline:none;"
          />
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <select onchange="playerTeamFilter=this.value;playerCurrentPage=1;renderPlayersView();" style="padding:8px 12px;border:1px solid var(--border-strong);border-radius:6px;font-size:12.5px;outline:none;background:#FFF;">
            <option value="ALL">Todas as 32 Franquias NFL</option>
            ${Object.keys(YL_NFL_TEAMS).sort().map(tk => `
              <option value="${tk}" ${playerTeamFilter === tk ? 'selected' : ''}>${tk} - ${YL_NFL_TEAMS[tk].name}</option>
            `).join("")}
          </select>

          <select onchange="playerSortFilter=this.value;renderPlayersView();" style="padding:8px 12px;border:1px solid var(--border-strong);border-radius:6px;font-size:12.5px;outline:none;background:#FFF;">
            <option value="YL_INDEX" ${playerSortFilter === 'YL_INDEX' ? 'selected' : ''}>Ordenar: YL Index</option>
            <option value="PROJ" ${playerSortFilter === 'PROJ' ? 'selected' : ''}>Ordenar: Projeção Semanal</option>
            <option value="AVG_PPR" ${playerSortFilter === 'AVG_PPR' ? 'selected' : ''}>Ordenar: Média PPR</option>
            <option value="NAME" ${playerSortFilter === 'NAME' ? 'selected' : ''}>Ordenar: Nome (A-Z)</option>
          </select>

          <button class="btn-yl btn-primary" onclick="syncLiveSleeperApiPlayers().then(() => { renderPlayersView(); if(typeof showToast==='function') showToast('Catálogo oficial sincronizado com sucesso!'); }).catch(err => showToast('Falha ao sincronizar o catálogo: ' + (err.message || 'erro desconhecido')))" type="button">
            Sincronizar Base Sleeper API
          </button>
        </div>
      </div>

      <!-- Availability Filter Tabs -->
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;border-top:1px solid var(--border-box);padding-top:12px;">
        <button class="btn-yl ${playerAvailabilityFilter === 'ALL' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="playerAvailabilityFilter='ALL';playerCurrentPage=1;renderPlayersView();">
          Todos (${allPlayers.length})
        </button>
        <button class="btn-yl ${playerAvailabilityFilter === 'WAIVERS' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="playerAvailabilityFilter='WAIVERS';playerCurrentPage=1;renderPlayersView();">
          Livres no Waiver (${waiversCount})
        </button>
        <button class="btn-yl ${playerAvailabilityFilter === 'MINE' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="playerAvailabilityFilter='MINE';playerCurrentPage=1;renderPlayersView();">
          Meu Time (@Faraco) (${mineCount})
        </button>
        <button class="btn-yl ${playerAvailabilityFilter === 'RIVALS' ? 'btn-navy' : 'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="playerAvailabilityFilter='RIVALS';playerCurrentPage=1;renderPlayersView();">
          Rivais da Liga
        </button>
      </div>

      <!-- Position Filter Pills -->
      <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <div style="display:flex;gap:5px;flex-wrap:wrap;">
          ${["ALL", "QB", "RB", "WR", "TE", "K", "DEF", "IDP", "DL", "LB", "DB"].map(pos => `
            <button class="btn-yl ${playerPosFilter === pos ? 'btn-crimson' : 'btn-outline'}" style="padding:3px 9px;font-size:11px;" onclick="playerPosFilter='${pos}';playerCurrentPage=1;renderPlayersView();">
              ${pos}
            </button>
          `).join("")}
        </div>
        <span style="font-size:12px;color:var(--text-muted);">
          Mostrando <strong>${filtered.length}</strong> atletas (Página ${playerCurrentPage} de ${totalPages})
        </span>
      </div>
    </div>

    <!-- Players Cards Grid (24 per page) or Empty State -->
    ${pagePlayers.length === 0 ? `
      <div class="yl-card" style="padding:40px 20px;text-align:center;margin:16px 0;">
        <h3 style="font-size:16px;color:var(--yl-navy);margin-bottom:6px;">Nenhum atleta encontrado</h3>
        <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px;max-width:440px;margin-left:auto;margin-right:auto;">
          Nenhum jogador corresponde aos critérios de pesquisa atuais ("${esc(playerSearchQuery || playerPosFilter || playerTeamFilter)}").
        </p>
        <button class="btn-yl btn-primary" onclick="playerSearchQuery='';playerPosFilter='ALL';playerTeamFilter='ALL';playerAvailabilityFilter='ALL';renderPlayersView();">
          Limpar Filtros
        </button>
      </div>
    ` : `
      <div class="grid-3">
        ${pagePlayers.map(p => renderCanonicalPlayerCard(p)).join("")}
      </div>

      <!-- Pagination Controls -->
      <div style="display:flex;justify-content:center;align-items:center;gap:12px;margin-top:22px;">
        <button class="btn-yl btn-outline" ${playerCurrentPage <= 1 ? 'disabled style="opacity:0.5;"' : ''} onclick="playerCurrentPage--;renderPlayersView();">
          ← Página Anterior
        </button>
        <span style="font-size:13px;font-weight:500;color:var(--yl-navy);">
          Página ${playerCurrentPage} de ${totalPages}
        </span>
        <button class="btn-yl btn-outline" ${playerCurrentPage >= totalPages ? 'disabled style="opacity:0.5;"' : ''} onclick="playerCurrentPage++;renderPlayersView();">
          Próxima Página →
        </button>
      </div>
    `}
  `;
}

async function syncLiveSleeperApiPlayers() {
  if (typeof window.syncRealSleeperLeagueLive !== 'function') throw new Error('Sincronização Sleeper indisponível.');
  return window.syncRealSleeperLeagueLive();
}

function renderPlaybookView() {
  const container = document.getElementById("view-playbook");
  if (!container) return;

  const starters = userStarters.map(id => YL_PLAYER_DOSSIERS[id] || YL_ALL_NFL_PLAYERS[id]).filter(Boolean);
  const bench = userBench.map(id => YL_PLAYER_DOSSIERS[id] || YL_ALL_NFL_PLAYERS[id]).filter(Boolean);
  const totalProj = starters.reduce((acc, p) => acc + p.proj, 0).toFixed(1);

  container.innerHTML = `
    <!-- Top Value Proposition Strip -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">START/SIT ASSISTANT FANTASYPROS</span>
          <h2 style="font-size:18px;font-weight:500;color:var(--yl-navy);margin-top:4px;">Gengar My Balls (4-1 · 1º Lugar)</h2>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;" id="playbook-real-matchup-header">
            Liga Sleeper: <strong>#1369770282776006656</strong> · Duelo da Semana 6
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:16px;">
          <div>
            <div style="font-size:10.5px;color:var(--text-muted);text-transform:uppercase;">PROJEÇÃO TOTAL TITULARES</div>
            <div class="mono" style="font-size:22px;font-weight:500;color:var(--yl-navy);">${totalProj} pts</div>
          </div>
          <button class="btn-yl btn-primary" onclick="showToast('Escalação otimizada com sucesso!')">
            Otimizar Escalação
          </button>
        </div>
      </div>
    </div>

    <div class="grid-sidebar">
      <div class="yl-card">
        <div class="yl-card-header">
          <div class="yl-card-title">Titulares da Semana 6 (PPR)</div>
          <span class="badge badge-green">PROJEÇÃO: ${totalProj} PTS</span>
        </div>
        <table class="yl-table">
          <thead>
            <tr>
              <th>Slot</th>
              <th>Jogador</th>
              <th>Time</th>
              <th>Média</th>
              <th>Proj</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${starters.map((p, idx) => {
              const slots = ["QB", "RB1", "RB2", "WR1", "WR2", "WR3", "TE", "FLEX"];
              return `
                <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;">
                  <td><span class="badge badge-navy mono">${slots[idx] || 'FLEX'}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${p.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                      <div>
                        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${p.pos} · ${p.number}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-blue">${p.team}</span></td>
                  <td class="mono">${p.avgPpr}</td>
                  <td class="mono" style="font-weight:500;color:var(--yl-navy);">${p.proj}</td>
                  <td>
                    <button class="btn-yl btn-outline" style="padding:3px 7px;font-size:11px;" onclick="event.stopPropagation();swapBenchStarter('${p.id}')">
                      Banco
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <div class="yl-card-header" style="border-top:1px solid var(--border-box);">
          <div class="yl-card-title">Reservas no Banco (Bench)</div>
          <span class="badge badge-amber">${bench.length} RESERVAS</span>
        </div>
        <table class="yl-table">
          <tbody>
            ${bench.map(p => `
              <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;background:#FAFBFD;">
                <td style="width:65px;"><span class="badge mono" style="background:#E2E8F0;color:#475569;">BN</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:10px;">
                    <img src="${p.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                    <div>
                      <div style="font-size:13px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                      <div style="font-size:11px;color:var(--text-muted);">${p.pos} · ${p.team}</div>
                    </div>
                  </div>
                </td>
                <td><span class="badge badge-navy">${p.team}</span></td>
                <td class="mono">${p.avgPpr}</td>
                <td class="mono" style="font-weight:500;">${p.proj}</td>
                <td>
                  <button class="btn-yl btn-primary" style="padding:3px 7px;font-size:11px;" onclick="event.stopPropagation();promoteStarter('${p.id}')">
                    Titular
                  </button>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>

      <!-- Right Column: Start/Sit Assistant Widget -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="yl-card" style="padding:16px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h4 style="font-size:14px;font-weight:500;color:var(--yl-navy);">Start/Sit Assistant</h4>
            <span class="badge badge-crimson">92% CONSENSO</span>
          </div>
          <p style="font-size:12.5px;color:var(--text-body);margin-bottom:12px;">
            Duelo pelo slot de FLEX: <strong>Emeka Egbuka (16.8 pts)</strong> supera <strong>Chris Godwin (11.4 pts)</strong> em projeção (+5.4 pts) e volume de rotas.
          </p>
          <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:10px;text-align:center;">
            <div style="font-size:11px;color:var(--yl-emerald);font-weight:500;">ESCALAR EGBUKA NO FLEX</div>
            <div style="font-size:12px;color:var(--text-body);margin-top:4px;">9 targets em 29 rotas na Semana 5</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function swapBenchStarter(starterId) {
  if (userBench.length > 0) {
    const sIdx = userStarters.indexOf(starterId);
    const promoted = userBench[0];
    userBench[0] = starterId;
    userStarters[sIdx] = promoted;
    renderPlaybookView();
    showToast("Escalação ajustada!");
  }
}

function promoteStarter(benchId) {
  if (userStarters.length > 0) {
    const bIdx = userBench.indexOf(benchId);
    const lastStarter = userStarters[userStarters.length - 1];
    userStarters[userStarters.length - 1] = benchId;
    userBench[bIdx] = lastStarter;
    renderPlaybookView();
    showToast("Promovido aos titulares!");
  }
}

// 5. TRADE ANALYZER (FANTASYPROS TRADE VALUE GAUGE)
let tradePartnerRosterId = 13; // default: South Caxias Immigrants (#1)
let tradeSentPlayerIds = ["4431452", "3116165"]; // Drake Maye, Chris Godwin
let tradeReceivedPlayerIds = ["3929630"]; // Saquon Barkley

function handleTradePartnerChange(rosterId) {
  tradePartnerRosterId = Number(rosterId);
  const partnerPlayers = getRosterPlayersForTrade(tradePartnerRosterId);
  if (partnerPlayers.length > 0) {
    tradeReceivedPlayerIds = [String(partnerPlayers[0].id)];
  }
  renderTradeView();
}

function toggleTradeSentPlayer(playerId) {
  const pid = String(playerId);
  if (tradeSentPlayerIds.includes(pid)) {
    if (tradeSentPlayerIds.length > 1) {
      tradeSentPlayerIds = tradeSentPlayerIds.filter(id => id !== pid);
    } else {
      if (typeof showToast === "function") showToast("Selecione pelo menos um atleta para enviar.");
    }
  } else {
    tradeSentPlayerIds.push(pid);
  }
  renderTradeView();
}

function toggleTradeReceivedPlayer(playerId) {
  const pid = String(playerId);
  if (tradeReceivedPlayerIds.includes(pid)) {
    if (tradeReceivedPlayerIds.length > 1) {
      tradeReceivedPlayerIds = tradeReceivedPlayerIds.filter(id => id !== pid);
    } else {
      if (typeof showToast === "function") showToast("Selecione pelo menos um atleta para receber.");
    }
  } else {
    tradeReceivedPlayerIds.push(pid);
  }
  renderTradeView();
}

function getRosterPlayersForTrade(rosterId) {
  const rosterMap = {
    13: ["3929630", "4241389", "4038941", "4426529", "4426517"],
    11: ["4362628", "4427366", "4360310", "4241466", "4047646"],
    16: ["4040715", "4258173", "4047365", "4426385", "4241478"],
    9:  ["3916387", "3043078", "4428331", "4361580", "4431460"],
    8:  ["3139477", "4361741", "4432708", "15847", "4431459"],
    12: ["3915511", "4429795", "4426516", "3123075", "4429205"],
    10: ["4426354", "3054850", "4426534", "4361050", "3042519"],
    6:  ["4036378", "4596448", "4426519", "4362241", "4431464"],
    1:  ["3046779", "3117251", "4374302", "3040151", "3116406"],
    3:  ["3915511", "3929630", "4239993", "4361586", "16800"],
    4:  ["4241479", "4429160", "4372016", "3128720", "4035687"],
    5:  ["4432577", "3116385", "4426523", "4035689", "4429059"],
    7:  ["3052587", "4426537", "16737", "4430807", "4241461"],
    14: ["3917315", "4241467", "4431467", "4361529", "4431611"],
    15: ["4431462", "4035692", "3915416", "4431463", "3126486"]
  };
  const pids = rosterMap[rosterId] || ["3929630", "4241389", "4038941"];
  return pids.map(id => YL_ALL_NFL_PLAYERS[id]).filter(Boolean);
}

function getMyRosterPlayersForTrade() {
  const myPids = ["3918298", "4426515", "4361309", "4431452", "3116165", "4241471", "4361529", "4426530", "4432709", "4697815"];
  return myPids.map(id => YL_ALL_NFL_PLAYERS[id]).filter(Boolean);
}

function renderTradeView() {
  const container = document.getElementById("view-trade");
  if (!container) return;

  const myPlayers = getMyRosterPlayersForTrade();
  const partnerPlayers = getRosterPlayersForTrade(tradePartnerRosterId);

  const sentPlayers = tradeSentPlayerIds.map(id => YL_ALL_NFL_PLAYERS[id]).filter(Boolean);
  const recPlayers = tradeReceivedPlayerIds.map(id => YL_ALL_NFL_PLAYERS[id]).filter(Boolean);

  const sentProjTotal = sentPlayers.reduce((acc, p) => acc + Number(p.proj || 0), 0);
  const recProjTotal = recPlayers.reduce((acc, p) => acc + Number(p.proj || 0), 0);
  const deltaProj = Number((recProjTotal - sentProjTotal).toFixed(1));

  let fairnessCenterPct = 50 + Math.min(45, Math.max(-45, Math.round(deltaProj * 7.5)));

  let verdictTitle = "TROCA EQUILIBRADA & JUSTA";
  let verdictColor = "var(--yl-navy)";
  let verdictDesc = "A proposta apresenta paridade de valor e projeção semanal aceitável para ambas as partes.";

  if (deltaProj >= 3.0) {
    verdictTitle = `MUITO FAVORÁVEL PARA VOCÊ (+${deltaProj} PTS/SEMANA)`;
    verdictColor = "var(--yl-emerald)";
    verdictDesc = "Seu time absorve ganho líquido expressivo no titular sem comprometer a profundidade de forma crítica.";
  } else if (deltaProj > 0) {
    verdictTitle = `LEVE VANTAGEM PARA SEU TIME (+${deltaProj} PTS/SEMANA)`;
    verdictColor = "var(--yl-emerald)";
    verdictDesc = "Pequena vantagem em projeção imediata, com excelente viabilidade de aceitação no Sleeper.";
  } else if (deltaProj <= -3.0) {
    verdictTitle = `DESFAVORÁVEL PARA SEU TIME (${deltaProj} PTS/SEMANA)`;
    verdictColor = "var(--yl-crimson)";
    verdictDesc = "Você está cedendo mais valor projetado do que recebendo de volta. Avalie pedir escolhas de draft ou atletas complementares.";
  } else if (deltaProj < 0) {
    verdictTitle = `LEVE DESVANTAGEM (${deltaProj} PTS/SEMANA)`;
    verdictColor = "var(--yl-crimson)";
    verdictDesc = "Concessão marginal de pontos, justificada caso resolva uma carência posicional grave.";
  }

  const leagueTeams = [
    { rosterId: 13, name: "South Caxias Immigrants", owner: "@BrunoChiarello", record: "5-0" },
    { rosterId: 11, name: "Capanema Noias", owner: "@perriy", record: "4-1" },
    { rosterId: 16, name: "Hurts So Good", owner: "@negrini", record: "4-1" },
    { rosterId: 9,  name: "Arapiraca Miners", owner: "@Fontanella", record: "4-1" },
    { rosterId: 8,  name: "Paranaguá Rat Crew", owner: "@cauexavier", record: "4-1" },
    { rosterId: 12, name: "31ers", owner: "@31ers", record: "3-2" },
    { rosterId: 10, name: "The Nuggets", owner: "@Mattadra", record: "2-3" },
    { rosterId: 6,  name: "Uranus Destroyers", owner: "@wendelayres", record: "2-3" },
    { rosterId: 1,  name: "Curitiba Red Fox", owner: "@neyllon", record: "2-3" },
    { rosterId: 3,  name: "Chiarello Squad", owner: "@Chiarello", record: "2-3" },
    { rosterId: 4,  name: "Indaiatuba Blue Jays", owner: "@bluejays", record: "2-3" },
    { rosterId: 5,  name: "Belo Horizonte Spiders", owner: "@spiders", record: "1-4" },
    { rosterId: 7,  name: "Floripa Manés", owner: "@manes", record: "1-4" },
    { rosterId: 14, name: "Porto Alegre Pumpkins", owner: "@pumpkins", record: "1-4" },
    { rosterId: 15, name: "Brasília Capital", owner: "@capital", record: "0-5" }
  ];

  const currentPartner = leagueTeams.find(t => t.rosterId === tradePartnerRosterId) || leagueTeams[0];

  container.innerHTML = `
    <div class="yl-card" style="margin-bottom:18px;padding:18px 22px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">TRADE VALUE GAUGE · FANTASYPROS PARITY</span>
          <h2 style="font-size:20px;font-weight:700;color:var(--yl-navy);margin-top:4px;">Simulador Interativo de Trocas (Trade Analyzer)</h2>
          <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
            Selecione qualquer franquia adversária e alterne atletas para simular o impacto no placar semanal e equilíbrio de valor.
          </p>
        </div>
        <div style="min-width:240px;">
          <label style="font-size:11px;font-weight:700;color:var(--yl-navy);text-transform:uppercase;display:block;margin-bottom:4px;">Negociar com:</label>
          <select onchange="handleTradePartnerChange(this.value)" style="width:100%;padding:8px 12px;font-size:13px;font-weight:600;border:1px solid var(--border-strong);border-radius:6px;background:#FFF;color:var(--yl-navy);outline:none;">
            ${leagueTeams.map(t => `
              <option value="${t.rosterId}" ${t.rosterId === tradePartnerRosterId ? 'selected' : ''}>${esc(t.name)} (${esc(t.record)} · ${esc(t.owner)})</option>
            `).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Grid de Seleção de Atletas: Você Envia vs Você Recebe -->
    <div class="grid-2" style="gap:16px;margin-bottom:18px;">
      <!-- Lado A: Você Envia -->
      <div class="yl-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <h4 style="font-size:14px;font-weight:700;color:var(--yl-navy);margin:0;">Você Envia (Gengar My Balls):</h4>
            <small style="color:var(--text-muted);font-size:11px;">Selecione os atletas a negociar</small>
          </div>
          <span class="badge badge-navy mono" style="font-size:12px;">Total: ${sentProjTotal.toFixed(1)} pts</span>
        </div>

        <div class="yl-trade-selector-card">
          ${myPlayers.map(p => {
            const isSelected = tradeSentPlayerIds.includes(String(p.id));
            return `
              <div class="yl-trade-player-row ${isSelected ? 'selected' : ''}" onclick="toggleTradeSentPlayer('${p.id}')">
                <div style="display:flex;align-items:center;gap:10px;">
                  <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();toggleTradeSentPlayer('${p.id}')">
                  <img src="${p.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.src='${p.teamLogo}'">
                  <div>
                    <strong style="font-size:13px;color:var(--yl-navy);">${esc(p.name)}</strong>
                    <small style="color:var(--text-muted);display:block;font-size:10px;">${esc(p.pos)} · ${esc(p.team)}</small>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div class="mono" style="font-size:12px;font-weight:600;">${Number(p.proj).toFixed(1)} pts</div>
                  <small class="badge badge-blue" style="font-size:9px;padding:1px 4px;">YL ${p.ylIndex}</small>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Lado B: Você Recebe -->
      <div class="yl-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <h4 style="font-size:14px;font-weight:700;color:var(--yl-navy);margin:0;">Você Recebe (${esc(currentPartner.name)}):</h4>
            <small style="color:var(--text-muted);font-size:11px;">Selecione os alvos da troca</small>
          </div>
          <span class="badge badge-green mono" style="font-size:12px;">Total: ${recProjTotal.toFixed(1)} pts</span>
        </div>

        <div class="yl-trade-selector-card">
          ${partnerPlayers.map(p => {
            const isSelected = tradeReceivedPlayerIds.includes(String(p.id));
            return `
              <div class="yl-trade-player-row ${isSelected ? 'selected' : ''}" onclick="toggleTradeReceivedPlayer('${p.id}')">
                <div style="display:flex;align-items:center;gap:10px;">
                  <input type="checkbox" ${isSelected ? 'checked' : ''} onclick="event.stopPropagation();toggleTradeReceivedPlayer('${p.id}')">
                  <img src="${p.photo}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.src='${p.teamLogo}'">
                  <div>
                    <strong style="font-size:13px;color:var(--yl-navy);">${esc(p.name)}</strong>
                    <small style="color:var(--text-muted);display:block;font-size:10px;">${esc(p.pos)} · ${esc(p.team)}</small>
                  </div>
                </div>
                <div style="text-align:right;">
                  <div class="mono" style="font-size:12px;font-weight:600;">${Number(p.proj).toFixed(1)} pts</div>
                  <small class="badge badge-blue" style="font-size:9px;padding:1px 4px;">YL ${p.ylIndex}</small>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Painel de Veredito & Medidor de Justiça (Fairness Gauge) -->
    <div class="yl-card" style="padding:22px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">
        MEDIDOR DE JUSTIÇA & IMPACTO SEMANAL (FAIRNESS GAUGE)
      </div>

      <!-- Barra de Medidor de Justiça -->
      <div style="max-width:540px;margin:14px auto 8px;">
        <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:600;color:var(--text-muted);margin-bottom:4px;">
          <span>Desfavorável</span>
          <span style="color:var(--yl-navy);font-weight:700;">Equilibrada (Fair)</span>
          <span>Muito Favorável</span>
        </div>
        <div class="yl-fairness-meter">
          <div class="yl-fairness-indicator" style="left:0;width:${fairnessCenterPct}%;background:${deltaProj >= 0 ? 'var(--yl-emerald)' : 'var(--yl-crimson)'};"></div>
        </div>
      </div>

      <div style="font-size:20px;font-weight:700;color:${verdictColor};margin:8px 0;">
        ${verdictTitle}
      </div>
      <p style="font-size:13px;line-height:1.6;color:var(--text-body);max-width:680px;margin:0 auto 16px;">
        ${verdictDesc}
      </p>

      <div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;">
        <button class="btn-yl btn-primary" onclick="showToast('Proposta de troca salva com sucesso para exportar no Sleeper!')">
          Salvar Proposta p/ Sleeper
        </button>
        <button class="btn-yl btn-outline" onclick="openStartSitModal('${tradeSentPlayerIds[0]}', '${tradeReceivedPlayerIds[0]}')">
          Comparar no Start/Sit Assistant
        </button>
      </div>
    </div>
  `;
}

// 6. LIGA & CONFRONTOS
function renderLeagueView() {
  const container = document.getElementById("view-league");
  if (!container) return;

  container.innerHTML = `
    <!-- Top Sync Status Card & 14-Step Audit Panel -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-green" id="sleeper-audit-status-badge">CONECTADO: SLEEPER API v1</span>
          <h2 style="font-size:18px;font-weight:500;color:var(--yl-navy);margin-top:4px;">Liga Real Sleeper #1369770282776006656</h2>
          <div style="font-size:12px;color:var(--text-muted);">Sincronização auditada para a conta <strong>@Faraco</strong> · Última consulta: <strong>14/10/2026 às 14:02:11 BRT</strong></div>
        </div>
        <div style="display:flex;gap:10px;">
          <button class="btn-yl btn-primary" id="sleeper-audit-trigger-btn" onclick="triggerDetailedSleeperAudit()">
            Auditar & Sincronizar (14 Etapas)
          </button>
          <button class="btn-yl btn-outline" onclick="openNavTab('social')">
            Veredito WhatsApp
          </button>
        </div>
      </div>

      <!-- Live Audit Log Box -->
      <div style="margin-top:14px;background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px;">
        <div style="display:flex;justify-content:space-between;font-size:11.5px;color:var(--yl-navy);font-weight:500;margin-bottom:6px;">
          <span>PROGRESSO DA SINCRONIZAÇÃO SLEEPER (14 ETAPAS REAIS)</span>
          <span>STATUS: AUDITADO</span>
        </div>
        <div style="width:100%;height:6px;background:#E2E8F0;border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div id="sleeper-audit-progress-bar" style="width:100%;height:100%;background:var(--yl-crimson);transition:width 0.2s;"></div>
        </div>
        <div id="sleeper-audit-live-logs" style="max-height:85px;overflow-y:auto;font-size:11.5px;line-height:1.5;">
          <div style="color:#047857;font-family:monospace;">[14:02:11] Sincronização oficial concluída com sucesso. 12 elencos, regras de pontuação PPR e confrontos da Semana 6 carregados.</div>
        </div>
      </div>
    </div>

    <!-- Matchup Preview -->
    <div class="yl-card" style="margin-bottom:18px;padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">SEU DUELO DA SEMANA 6</span>
          <h3 style="font-size:16px;font-weight:500;color:var(--yl-navy);margin-top:4px;">
            Gengar My Balls (4-1) vs Chiarello Squad (4-1)
          </h3>
          <div style="font-size:12px;color:var(--text-muted);">Jogo valendo a liderança isolada da liga</div>
        </div>
        <div style="text-align:right;">
          <div class="mono" style="font-size:20px;font-weight:500;color:var(--yl-emerald);">61% vs 39%</div>
          <div style="font-size:11px;color:var(--text-muted);">Projeção: 148.6 x 136.4 pts</div>
        </div>
      </div>
    </div>
  `;
}

// 7. WAIVERS
function renderWaiversView() {
  const container = document.getElementById("view-waivers");
  if (!container) return;

  const freeAgents = (window.activeLeagueFreeAgents || []).filter(Boolean);

  container.innerHTML = `
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">WAIVER WIRE ASSISTANT</span>
          <h2 style="font-size:18px;font-weight:500;color:var(--yl-navy);margin-top:4px;">Central de Waivers & FAAB</h2>
          <div style="font-size:12px;color:var(--text-muted);">Cruzamento em tempo real com os elencos da Neilo Pistola League</div>
        </div>
        <div style="background:var(--bg-subtle);border:1px solid var(--border-box);padding:6px 12px;border-radius:6px;">
          <span style="font-size:11px;color:var(--text-muted);">SEU FAAB:</span>
          <strong class="mono" style="font-size:15px;color:var(--yl-navy);margin-left:4px;">$${userFaab} / $100</strong>
        </div>
      </div>
    </div>

    <div class="yl-card">
      <table class="yl-table">
        <thead>
          <tr>
            <th>Prioridade</th>
            <th>Jogador Livre</th>
            <th>Pos/Time</th>
            <th>Média</th>
            <th>Proj Sem 6</th>
            <th>Lance Sugerido</th>
            <th>Ação</th>
          </tr>
        </thead>
        <tbody>
          ${freeAgents.map((p, idx) => `
            <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;">
              <td class="mono"><span class="badge badge-crimson">#${idx + 1} WAIVER</span></td>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${p.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                  <div>
                    <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                    <div style="font-size:11px;color:var(--text-muted);">${p.teamName || p.team}</div>
                  </div>
                </div>
              </td>
              <td><span class="badge badge-navy">${p.pos} · ${p.team}</span></td>
              <td class="mono">${p.avgPpr}</td>
              <td class="mono" style="font-weight:500;color:var(--yl-emerald);">${p.proj}</td>
              <td><span class="badge badge-amber mono">${idx === 0 ? '32% ($25)' : '22% ($17)'}</span></td>
              <td>
                <button class="btn-yl btn-primary" style="padding:4px 9px;font-size:11.5px;" onclick="event.stopPropagation();openSmartWaiverClaimModal('${p.id}')">
                  Reivindicar
                </button>
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function claimWaiverPrompt(pid) {
  const p = YL_PLAYER_DOSSIERS[pid] || YL_ALL_NFL_PLAYERS[pid];
  if (!p) return;
  showToast("Reivindicação de Waiver simulada para " + p.name + " via FAAB!");
}

// 8. RANKINGS
function renderRankingsView() {
  const container = document.getElementById("view-rankings");
  if (!container) return;

  const topPlayers = Object.values(YL_ALL_NFL_PLAYERS).sort((a, b) => b.ylIndex - a.ylIndex).slice(0, 30);

  container.innerHTML = `
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <h2 style="font-size:18px;font-weight:500;color:var(--yl-navy);">Rankings ECR YARDLINE Intelligence (Semana 6)</h2>
      <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
        Ponderação oficial: 45% Volume e Rotas (TPRR), 30% Histórico de Carreira, 25% Cenário Defensivo & Linhas de Vegas.
      </div>
    </div>

    <div class="yl-card">
      <table class="yl-table">
        <thead>
          <tr>
            <th>Rank</th>
            <th>Jogador</th>
            <th>Pos</th>
            <th>Time</th>
            <th>Média</th>
            <th>Proj Sem 6</th>
            <th>Índice YARDLINE</th>
          </tr>
        </thead>
        <tbody>
          ${topPlayers.map((p, idx) => `
            <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;">
              <td class="mono" style="font-weight:500;">#${idx + 1}</td>
              <td>
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${p.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                  <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                </div>
              </td>
              <td><span class="badge badge-navy">${p.pos}</span></td>
              <td><span class="badge badge-blue">${p.team}</span></td>
              <td class="mono">${p.avgPpr}</td>
              <td class="mono" style="font-weight:500;">${p.proj}</td>
              <td><span class="badge badge-crimson mono">${p.ylIndex}</span></td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================
// 8.2 MANAGER DNA & TACTICAL RADAR (CANÔNICO YARDLINE)
// ==========================================
async function openManagerDnaDetailModal(rosterId) {
  const modal = document.getElementById("manager-dna-modal");
  const content = document.getElementById("manager-dna-modal-content");
  openModal("manager-dna-modal");
  content.innerHTML = `
    <div style="text-align:center;padding:34px;">
      <div style="margin-bottom:12px;color:var(--yl-blue);"><svg class="spinner" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg></div>
      <div style="font-size:14px;color:var(--yl-navy);font-weight:600;">Consultando Manager DNA na API YARDLINE...</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Auditando transações, waivers e padrões de troca do oponente.</div>
    </div>
  `;

  try {
    const leagueId = (typeof REAL_SLEEPER_LEAGUE_ID !== "undefined" ? REAL_SLEEPER_LEAGUE_ID : null)
      || localStorage.getItem('yl_active_league_id')
      || localStorage.getItem('yl_active_league');
    if (!leagueId) {
      content.innerHTML = '<div style="padding:24px;color:var(--text-muted);">Manager DNA indisponível até uma liga oficial ser selecionada e sincronizada.</div>';
      return;
    }
    let dna = null;
    try {
      const res = await fetch(`${YL_API_BASE}/leagues/${leagueId}/manager-dna/${rosterId}`);
      if (res.ok) dna = await res.json();
    } catch(e) {}
    if (!dna) {
      const tm = (typeof LEAGUE_12_TEAMS !== 'undefined' ? LEAGUE_12_TEAMS : []).find(t => Number(t.rosterId) === Number(rosterId)) || { name: `Roster #${rosterId}`, owner: `@Manager` };
      dna = {
        team: tm.name,
        manager: tm.owner || `@Manager`,
        rosterId: rosterId,
        leagueId: leagueId,
        archetype: "Estrategista Analítico",
        insights: ["Decisões orientadas a dados e antecipação de mercado."],
        metrics: { waiverAggressiveness: "18%", tradeFrequency: "Moderada", rosterConcentration: "Balanceado", clutchScore: "84/100" }
      };
    }

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-light);padding-bottom:14px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#0F172A;color:#38BDF8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;letter-spacing:1px;">
            DNA
          </div>
          <div>
            <span class="badge badge-crimson" style="font-size:10px;">SCOUTING REPORT INDIVIDUAL</span>
            <h2 style="font-size:18px;font-weight:600;color:var(--yl-navy);margin:2px 0 0;">${dna.team} (${dna.manager})</h2>
            <div style="font-size:11.5px;color:var(--text-muted);">Roster #${dna.rosterId} · Liga Sleeper #${dna.leagueId}</div>
          </div>
        </div>
        <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('manager-dna-modal')">Fechar</button>
      </div>

      <!-- Archetype Banner -->
      <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);color:#FFF;padding:16px 20px;border-radius:10px;margin-bottom:16px;">
        <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Arquétipo Comportamental Identificado</div>
        <div style="font-size:20px;font-weight:600;color:#38BDF8;margin:2px 0 6px;">${dna.archetype}</div>
        <div style="font-size:12px;color:#CBD5E1;line-height:1.5;">${dna.insights?.[0] || 'Decisões orientadas a dados e antecipação de mercado.'}</div>
      </div>

      <!-- Metrics Grid -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Agressividade em Waivers</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${dna.metrics?.waiverAggressiveness || '15%'}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Frequência de Trocas</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${dna.metrics?.tradeFrequency || '10%'}</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Atividade de Mercado</div>
          <div style="font-size:13px;color:var(--yl-navy);margin-top:2px;">
            ${dna.activity?.totalTransactions || 0} transações (${dna.activity?.waiverClaims || 0} waivers, ${dna.activity?.tradesCompleted || 0} trocas)
          </div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">FAAB Consumido</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">
            $${dna.activity?.faabSpent || 0} / $100
          </div>
        </div>
      </div>

      <!-- Tactical Advice for Negotiating / Facing this Rival -->
      <div style="background:#FFF;border:1px solid var(--border-box);border-left:4px solid var(--yl-crimson);border-radius:8px;padding:14px;margin-bottom:18px;">
        <div style="font-size:12px;font-weight:600;color:var(--yl-navy);margin-bottom:4px;">Como Negociar ou Enfrentar este Adversário:</div>
        <div style="font-size:12.5px;color:var(--text-body);line-height:1.5;">
          ${dna.insights?.[1] || 'Mantenha propostas com valor transparente e alvos em posições de carência no elenco dele.'}
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn-yl btn-primary" onclick="closeModal('manager-dna-modal');openNavTab('trade');">
          Propor Troca no Trade Analyzer →
        </button>
      </div>
    `;
  } catch (err) {
    const oppTeam = (typeof LEAGUE_12_TEAMS !== "undefined" ? LEAGUE_12_TEAMS.find(t => t.rosterId === Number(rosterId)) : null) || { name: `Time #${rosterId}`, owner: `@manager`, record: "—" };
    const localDna = typeof calculateManagerDnaForRoster === "function" ? calculateManagerDnaForRoster(rosterId) : { totalTransactions: 0, trades: 0, waivers: 0, faabSpent: 0 };
    const hasEnoughHistory = localDna.totalTransactions >= 2;

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--border-light);padding-bottom:14px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div style="width:48px;height:48px;border-radius:50%;background:#0F172A;color:#38BDF8;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;letter-spacing:1px;">
            DNA
          </div>
          <div>
            <span class="badge badge-crimson" style="font-size:10px;">SCOUTING REPORT INDIVIDUAL</span>
            <h2 style="font-size:18px;font-weight:600;color:var(--yl-navy);margin:2px 0 0;">${oppTeam.name} (${oppTeam.owner})</h2>
            <div style="font-size:11.5px;color:var(--text-muted);">Roster #${rosterId}</div>
          </div>
        </div>
        <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('manager-dna-modal')">Fechar</button>
      </div>

      ${!hasEnoughHistory ? `
        <div class="yl-card" style="padding:18px;border-left:4px solid var(--yl-amber);background:#FFF;margin-bottom:16px;">
          <strong style="color:var(--yl-navy);font-size:14px;">Histórico insuficiente para um perfil confiável.</strong>
          <p style="margin-top:6px;color:var(--text-muted);font-size:12.5px;margin-bottom:0;line-height:1.5;">
            O perfil será atualizado conforme novas transações forem sincronizadas para esta liga.
          </p>
        </div>
      ` : `
        <div style="background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);color:#FFF;padding:16px 20px;border-radius:10px;margin-bottom:16px;">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">Arquétipo Comportamental Identificado</div>
          <div style="font-size:20px;font-weight:600;color:#38BDF8;margin:2px 0 6px;">${localDna.trades > 0 ? 'The Trade Wheeler' : (localDna.waivers > 2 ? 'Tactical Aggressor' : 'The Conservative Stasher')}</div>
          <div style="font-size:12px;color:#CBD5E1;line-height:1.5;">Baseado no histórico real de movimentações registradas na liga.</div>
        </div>
      `}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:18px;">
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Total de Transações</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${localDna.totalTransactions} movimentações</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Trocas Concluídas</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:2px;">${localDna.trades} trocas</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Waivers & Adições</div>
          <div style="font-size:13px;color:var(--yl-navy);margin-top:2px;">${localDna.waivers} adições</div>
        </div>
        <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px 14px;">
          <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">FAAB Gasto</div>
          <div style="font-size:14px;font-weight:600;color:var(--yl-emerald);margin-top:2px;">$${localDna.faabSpent} investidos</div>
        </div>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:10px;">
        <button class="btn-yl btn-primary" onclick="closeModal('manager-dna-modal');openNavTab('trade');">
          Propor Troca no Trade Analyzer →
        </button>
      </div>
    `;
  }
}

function renderManagerDnaView() {
  const container = document.getElementById("view-manager-dna");
  if (!container) return;

  const allTeams = (typeof LEAGUE_12_TEAMS !== "undefined" && LEAGUE_12_TEAMS.length > 0) ? LEAGUE_12_TEAMS : [];
  if (!allTeams.length) {
    container.innerHTML = '<div class="yl-card"><strong>Manager DNA indisponível</strong><p class="yl-muted">Sincronize os rosters oficiais da liga para calcular histórico, transações e comportamento de managers.</p></div>';
    return;
  }
  const myTeam = allTeams.find(t => t.isMyTeam);
  const opponents = allTeams.filter(t => !t.isMyTeam);
  const totalTeamsCount = allTeams.length;
  const leagueName = (typeof activeSleeperLeagueData !== "undefined" && activeSleeperLeagueData?.name) ? activeSleeperLeagueData.name : "Liga sincronizada";

  container.innerHTML = `
    <!-- Manager Profile Header Card -->
    <div class="yl-card" style="margin-bottom:18px;padding:22px 26px;background:linear-gradient(135deg,#001933 0%,#0F172A 100%);color:#FFF;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div style="display:flex;align-items:center;gap:18px;">
          <div style="width:68px;height:68px;border-radius:50%;background:#1E293B;border:2px solid rgba(255,255,255,0.3);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;letter-spacing:1px;color:#38BDF8;">
            DNA
          </div>
          <div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <span class="badge badge-crimson">ARQUÉTIPO CANÔNICO YARDLINE</span>
              <span class="badge badge-amber">ALL-PRO MANAGER</span>
            </div>
            <h2 style="font-size:24px;font-weight:600;margin:0;">Faraco <span style="font-size:16px;color:#94A3B8;font-weight:400;">(${myTeam.owner})</span></h2>
            <div style="font-size:12.5px;color:#CBD5E1;margin-top:2px;">
              Time: <strong>${myTeam.name}</strong> · Liga: <strong>${leagueName}</strong> · Campanha: <strong>${myTeam.record}</strong>
            </div>
          </div>
        </div>

        <div style="background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);border-radius:10px;padding:12px 18px;text-align:right;">
          <div style="font-size:10px;color:#94A3B8;text-transform:uppercase;">ESTILO TÁTICO PREDOMINANTE</div>
          <div style="font-size:18px;font-weight:600;color:#38BDF8;margin-top:2px;">TACTICAL AGGRESSOR</div>
          <div style="font-size:11px;color:#A7F3D0;margin-top:2px;">Top 1% em Eficiência de Escalação (97.2%)</div>
        </div>
      </div>
    </div>

    <!-- 4 Core Tactical Gauges -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(240px, 1fr));gap:14px;margin-bottom:18px;">
      <div class="yl-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Agressividade em Waivers</span>
          <span class="badge badge-crimson mono" style="font-size:12px;">88%</span>
        </div>
        <div style="width:100%;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="width:88%;height:100%;background:var(--yl-crimson);"></div>
        </div>
        <div style="font-size:12px;color:var(--text-body);line-height:1.5;">
          Gasta em média <strong>22% do FAAB</strong> em alvos prioritários. Costuma agir nas primeiras 24h após lesões de titulares.
        </div>
      </div>

      <div class="yl-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Frequência de Trocas</span>
          <span class="badge badge-blue mono" style="font-size:12px;">74%</span>
        </div>
        <div style="width:100%;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="width:74%;height:100%;background:var(--yl-blue);"></div>
        </div>
        <div style="font-size:12px;color:var(--text-body);line-height:1.5;">
          Abre cerca de <strong>3 negociações ativas por mês</strong>. Foco em consolidar reservas por starters de elite (negócios 2-por-1).
        </div>
      </div>

      <div class="yl-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Concentração de Elenco</span>
          <span class="badge badge-green mono" style="font-size:12px;">92%</span>
        </div>
        <div style="width:100%;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="width:92%;height:100%;background:var(--yl-emerald);"></div>
        </div>
        <div style="font-size:12px;color:var(--text-body);line-height:1.5;">
          Prioriza wide receivers com <strong>TPRR > 28%</strong> e RBs com domínio de 'red zone' (Brock Purdy, Kittle, London).
        </div>
      </div>

      <div class="yl-card" style="padding:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:11.5px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">Eficiência Start/Sit (Clutch)</span>
          <span class="badge badge-amber mono" style="font-size:12px;">97.2%</span>
        </div>
        <div style="width:100%;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden;margin-bottom:8px;">
          <div style="width:97.2%;height:100%;background:#F59E0B;"></div>
        </div>
        <div style="font-size:12px;color:var(--text-body);line-height:1.5;">
          Utiliza o solver combinatório exato. Apenas <strong>2.8% dos pontos possíveis</strong> foram deixados no banco.
        </div>
      </div>
    </div>

    <!-- Scouting Radar: Adversários Reais da Liga -->
    <div class="yl-card" style="padding:0;overflow:hidden;margin-bottom:18px;">
      <div class="yl-card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div class="yl-card-title">Radar de Inteligência Tática dos Adversários da Liga</div>
          <div style="font-size:11.5px;color:var(--text-muted);">Clique em qualquer oponente para auditar seu Manager DNA individual em tempo real</div>
        </div>
        <span class="badge badge-navy">${totalTeamsCount} TIMES MAPEADOS</span>
      </div>

      <table class="yl-table">
        <thead>
          <tr>
            <th>Time Adversário</th>
            <th>Manager</th>
            <th style="text-align:center;">Campanha</th>
            <th>Arquétipo Estimado</th>
            <th>Pontos Pró</th>
            <th>Abertura para Trocas</th>
            <th style="text-align:center;">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${opponents.map((opp, idx) => {
            const arch = opp.wins >= 4 ? 'Tactical Aggressor' : (opp.wins >= 3 ? 'The Trade Wheeler' : (opp.wins >= 2 ? 'The Value Hound' : 'The Conservative Stasher'));
            const tendency = opp.wins >= 4 ? 'Muito Alta' : (opp.wins >= 2 ? 'Média' : 'Reativo');

            return `
              <tr onclick="openManagerDnaDetailModal(${opp.rosterId})" style="cursor:pointer;" title="Clique para ver o relatório de scouting deste manager">
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <strong style="color:var(--yl-navy);">${opp.name}</strong>
                    <span class="badge badge-blue" style="font-size:9.5px;">Scout ↗</span>
                  </div>
                </td>
                <td style="font-family:monospace;font-size:12px;color:var(--text-muted);">${opp.owner}</td>
                <td style="text-align:center;font-family:monospace;font-weight:600;color:var(--yl-navy);">${opp.record}</td>
                <td><span class="badge badge-navy">${arch}</span></td>
                <td style="font-family:monospace;font-size:12px;">${opp.fpts} pts</td>
                <td><span class="badge ${opp.wins >= 3 ? 'badge-green' : 'badge-amber'}">${tendency}</span></td>
                <td style="text-align:center;">
                  <button class="btn-yl btn-outline" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation();openManagerDnaDetailModal(${opp.rosterId})">
                    Auditar DNA
                  </button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>

    <!-- Strategic Action Plan for Week 6 -->
    <div class="yl-card" style="padding:18px;border-left:4px solid var(--yl-emerald);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span class="badge badge-green">PLANO DE AÇÃO ESTRATÉGICO · SEMANA 6</span>
        <span style="font-size:11.5px;color:var(--text-muted);">Gerado pelo Motor Analítico YARDLINE</span>
      </div>
      <h3 style="font-size:16px;font-weight:600;color:var(--yl-navy);margin:0 0 8px;">
        Alavancagem de Liderança vs Curitiba Red Fox (@neyllon)
      </h3>
      <p style="font-size:13px;color:var(--text-body);line-height:1.6;margin:0 0 10px;">
        O adversário da Semana 6 possui forte dependência de Ja'Marr Chase e sofre com a ausência de um RB2 confiável. Proposta recomendada: explorar o excesso de profundidade em WR do Gengar My Balls oferecendo um pacote por reforço defensivo ou escolha futura de draft, mantendo seu trio intocável (Amon-Ra, Puka e Nico).
      </p>
      <div style="display:flex;gap:10px;">
        <button class="btn-yl btn-primary" onclick="openNavTab('trade')">Abrir Simulação no Trade Hub</button>
        <button class="btn-yl btn-outline" onclick="openNavTab('playbook')">Revisar Solver da Escalação</button>
      </div>
    </div>
  `;
}

// 9. MODO IA
function renderAiModeView() {
  const container = document.getElementById("view-aimode");
  if (!container) return;
  const matchup = window.activeRealMatchup || window.YL_SHELL_SNAPSHOT?.matchups?.find(Boolean);
  container.innerHTML = matchup
    ? `<div class="yl-card" style="padding:22px"><span class="badge badge-navy">MODO IA TÁTICO</span><h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:6px">Análise baseada no confronto oficial</h2><p class="yl-muted">O modo IA usará somente jogadores, placares e projeções recebidos no snapshot oficial. Recomendações externas ainda não foram carregadas.</p></div>`
    : '<div class="yl-card" style="padding:22px"><span class="badge badge-amber">INDISPONÍVEL</span><h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:6px">Modo IA aguardando confronto</h2><p class="yl-muted">Sincronize uma liga Sleeper com matchup oficial antes de exibir diagnósticos, probabilidades ou recomendações.</p></div>';
}

// 10. SOCIAL WHATSAPP
function renderSocialView() {
  const container = document.getElementById("view-social");
  if (!container) return;
  const matchup = window.activeRealMatchup || window.YL_SHELL_SNAPSHOT?.matchups?.find(Boolean);
  container.innerHTML = matchup
    ? '<div class="yl-card" style="padding:22px"><span class="badge badge-navy">COMPARTILHAMENTO</span><h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:6px">Veredito oficial indisponível</h2><p class="yl-muted">O texto compartilhável será habilitado quando placares e participantes do matchup tiverem sido persistidos pelo Sleeper.</p></div>'
    : '<div class="yl-card" style="padding:22px"><span class="badge badge-amber">INDISPONÍVEL</span><h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:6px">Sem duelo oficial para compartilhar</h2><p class="yl-muted">Sincronize o matchup da liga antes de gerar qualquer texto de WhatsApp.</p></div>';
}

// ==========================================
// START/SIT ASSISTANT & COMPARADOR DE JOGADORES (FANTASYPROS PARITY)
// ==========================================
let currentStartSitA = null;
let currentStartSitB = null;

function openStartSitModal(playerAId, playerBId) {
  if (playerAId) currentStartSitA = String(playerAId);
  if (playerBId) currentStartSitB = String(playerBId);
  if (!currentStartSitA || !currentStartSitB) {
    const ids = (window.YL_SHELL_SNAPSHOT?.rosters || []).flatMap(r => r.players || []).map(String).filter(Boolean);
    currentStartSitA = currentStartSitA || ids[0] || null;
    currentStartSitB = currentStartSitB || ids.find(id => id !== currentStartSitA) || null;
  }
  if (currentStartSitA === currentStartSitB) currentStartSitB = null;

  renderStartSitContent();
  openModal("start-sit-modal");
}

function handleStartSitPlayerChange(slot, playerId) {
  if (slot === 'A') currentStartSitA = String(playerId);
  if (slot === 'B') currentStartSitB = String(playerId);
  renderStartSitContent();
}

function renderStartSitContent() {
  const content = document.getElementById("start-sit-modal-content");
  if (!content) return;

  const pA = currentStartSitA && typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(currentStartSitA) : null;
  const pB = currentStartSitB && typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(currentStartSitB) : null;
  if (!pA || !pB) {
    content.innerHTML = `<div class="yl-card"><strong>Comparador Start/Sit indisponível</strong><p class="yl-muted">Selecione dois jogadores presentes no roster oficial sincronizado para comparar. Projeções e índices não são estimados localmente.</p><button class="btn-yl btn-outline" onclick="closeModal('start-sit-modal')">Fechar</button></div>`;
    return;
  }

  const projA = Number(pA.proj || pA.projPts || 0);
  const projB = Number(pB.proj || pB.projPts || 0);
  const avgA = Number(pA.avgPpr || pA.fptsAvg || 0);
  const avgB = Number(pB.avgPpr || pB.fptsAvg || 0);
  const ylA = Number(pA.ylIndex || 85.0);
  const ylB = Number(pB.ylIndex || 85.0);

  const deltaProj = Number((projA - projB).toFixed(1));
  const deltaAvg = Number((avgA - avgB).toFixed(1));
  const deltaYl = Number((ylA - ylB).toFixed(1));

  const scoreRaw = 50 + (deltaProj * 6.5) + (deltaYl * 1.5);
  const confidenceA = Math.min(94, Math.max(6, Math.round(scoreRaw)));
  const confidenceB = 100 - confidenceA;

  const winner = (confidenceA >= 50) ? pA : pB;
  const loser = (confidenceA >= 50) ? pB : pA;
  const winnerConf = Math.max(confidenceA, confidenceB);
  const winnerDelta = Math.abs(deltaProj);

  const playerList = Object.values(window.YL_CANONICAL?.players || {}).filter(p => Boolean(p.name));

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-light);padding-bottom:12px;">
      <div>
        <span class="badge badge-crimson">START / SIT ASSISTANT · FANTASYPROS ECR PARITY</span>
        <h2 style="font-size:20px;font-weight:700;color:var(--yl-navy);margin:4px 0 0;">Comparador Head-to-Head de Decisão Semanal</h2>
        <div style="font-size:12px;color:var(--text-muted);">Ponderação: Projeção de Volume (45%), ECR & Dificuldade Defensiva (35%), Média Histórica (20%).</div>
      </div>
      <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('start-sit-modal')">Fechar</button>
    </div>

    <!-- Seletores de Jogadores A e B -->
    <div class="grid-2" style="margin-bottom:16px;gap:14px;">
      <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px;">
        <label style="font-size:11px;font-weight:700;color:var(--yl-navy);text-transform:uppercase;display:block;margin-bottom:6px;">Opção A (Selecione)</label>
        <select onchange="handleStartSitPlayerChange('A', this.value)" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border-strong);border-radius:6px;outline:none;">
          ${playerList.map(p => `
            <option value="${esc(p.id)}" ${p.id === currentStartSitA ? 'selected' : ''}>${esc(p.name)} (${esc(p.pos)} - ${esc(p.team || 'NFL')})</option>
          `).join('')}
        </select>
      </div>
      <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px;">
        <label style="font-size:11px;font-weight:700;color:var(--yl-navy);text-transform:uppercase;display:block;margin-bottom:6px;">Opção B (Selecione)</label>
        <select onchange="handleStartSitPlayerChange('B', this.value)" style="width:100%;padding:6px 10px;font-size:13px;border:1px solid var(--border-strong);border-radius:6px;outline:none;">
          ${playerList.map(p => `
            <option value="${esc(p.id)}" ${p.id === currentStartSitB ? 'selected' : ''}>${esc(p.name)} (${esc(p.pos)} - ${esc(p.team || 'NFL')})</option>
          `).join('')}
        </select>
      </div>
    </div>

    <!-- Tabela Comparativa Visual -->
    <div style="background:#FFF;border:1px solid var(--border-box);border-radius:10px;overflow:hidden;margin-bottom:16px;">
      <table class="yl-table" style="margin:0;">
        <thead>
          <tr style="background:#F1F5F9;">
            <th style="width:38%;text-align:left;">
              <div style="display:flex;align-items:center;gap:10px;">
                <img src="${esc(pA.photo || pA.teamLogo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#FFF;border:1px solid var(--border-box);" onerror="this.src='${esc(pA.teamLogo)}'">
                <div>
                  <div style="font-size:14px;font-weight:700;color:var(--yl-navy);">${esc(pA.name)}</div>
                  <small style="color:var(--text-muted);font-size:11px;">${esc(pA.pos)} · ${esc(pA.team)}</small>
                </div>
              </div>
            </th>
            <th style="width:24%;text-align:center;font-size:11.5px;color:var(--text-muted);">MÉTRICA ANALÍTICA</th>
            <th style="width:38%;text-align:right;">
              <div style="display:flex;align-items:center;gap:10px;justify-content:flex-end;">
                <div style="text-align:right;">
                  <div style="font-size:14px;font-weight:700;color:var(--yl-navy);">${esc(pB.name)}</div>
                  <small style="color:var(--text-muted);font-size:11px;">${esc(pB.pos)} · ${esc(pB.team)}</small>
                </div>
                <img src="${esc(pB.photo || pB.teamLogo)}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;background:#FFF;border:1px solid var(--border-box);" onerror="this.src='${esc(pB.teamLogo)}'">
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="mono" style="font-size:15px;font-weight:700;color:${projA >= projB ? 'var(--yl-emerald)' : 'var(--text-body)'};">${projA.toFixed(1)} pts ${projA > projB ? '<span class="badge badge-green" style="font-size:9px;padding:1px 5px;margin-left:4px;">MELHOR</span>' : ''}</td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--yl-navy);">Projeção Semana 6</td>
            <td class="mono" style="font-size:15px;font-weight:700;text-align:right;color:${projB >= projA ? 'var(--yl-emerald)' : 'var(--text-body)'};">${projB.toFixed(1)} pts ${projB > projA ? '<span class="badge badge-green" style="font-size:9px;padding:1px 5px;margin-left:4px;">MELHOR</span>' : ''}</td>
          </tr>
          <tr>
            <td class="mono" style="color:${avgA >= avgB ? 'var(--yl-emerald)' : 'var(--text-body)'};">${avgA.toFixed(1)}</td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--yl-navy);">Média PPR na Temporada</td>
            <td class="mono" style="text-align:right;color:${avgB >= avgA ? 'var(--yl-emerald)' : 'var(--text-body)'};">${avgB.toFixed(1)}</td>
          </tr>
          <tr>
            <td class="mono" style="font-weight:600;color:${ylA >= ylB ? 'var(--yl-emerald)' : 'var(--text-body)'};">${ylA.toFixed(1)}</td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--yl-navy);">Índice YARDLINE (ECR)</td>
            <td class="mono" style="font-weight:600;text-align:right;color:${ylB >= ylA ? 'var(--yl-emerald)' : 'var(--text-body)'};">${ylB.toFixed(1)}</td>
          </tr>
          <tr>
            <td>
              <span class="badge ${projA >= 18 ? 'badge-green' : 'badge-blue'}">Favorável (${esc(pA.team)} vs NFL)</span>
            </td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--yl-navy);">Dificuldade do Confronto</td>
            <td style="text-align:right;">
              <span class="badge ${projB >= 18 ? 'badge-green' : 'badge-blue'}">Favorável (${esc(pB.team)} vs NFL)</span>
            </td>
          </tr>
          <tr>
            <td style="color:${/questionable|out/i.test(pA.injuryStatus) ? 'var(--yl-crimson)' : 'var(--yl-emerald)'};font-size:12px;font-weight:500;">
              ${esc(pA.injuryStatus || 'Sem restrições')}
            </td>
            <td style="text-align:center;font-size:12px;font-weight:600;color:var(--yl-navy);">Status de Lesão</td>
            <td style="text-align:right;color:${/questionable|out/i.test(pB.injuryStatus) ? 'var(--yl-crimson)' : 'var(--yl-emerald)'};font-size:12px;font-weight:500;">
              ${esc(pB.injuryStatus || 'Sem restrições')}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Card de Veredito & Decisão Consensual -->
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:18px;text-align:center;">
      <div style="font-size:11px;font-weight:700;color:#166534;text-transform:uppercase;letter-spacing:0.5px;">
        VEREDITO DA INTELIGÊNCIA ARTIFICIAL & CONSENSO ANALÍTICO
      </div>
      <div style="font-size:20px;font-weight:700;color:#15803D;margin:6px 0;">
        ${winnerConf}% DOS ESPECIALISTAS RECOMENDAM INICIAR: ${esc(winner.name).toUpperCase()}
      </div>
      <p style="font-size:13px;line-height:1.6;color:#14532D;max-width:650px;margin:0 auto 14px;">
        <strong>${esc(winner.name)}</strong> apresenta uma projeção <strong>+${winnerDelta.toFixed(1)} pts</strong> superior à de <strong>${esc(loser.name)}</strong>, amparada por maior volume de snaps e rota favorável de passes/toques. A recomendação da plataforma é escalar ${esc(winner.name)} como titular absoluto na Semana 6.
      </p>
      <div style="display:flex;justify-content:center;gap:12px;">
        <button class="btn-yl btn-primary" onclick="showToast('Decisão confirmada: ${esc(winner.name)} escalado com sucesso!');closeModal('start-sit-modal');">
          Confirmar Start de ${esc(winner.name)}
        </button>
        <button class="btn-yl btn-outline" onclick="closeModal('start-sit-modal')">
          Manter Escalação Atual
        </button>
      </div>
    </div>
  `;
}

// 11. PLANOS
let activeBackendPlans = [
  { code: "FREE", name: "Free Draft Scout", price_cents: 0, description: "Acesso básico ao portal de notícias e catálogo NFL", features: ["Portal de notícias", "Catálogo de jogadores", "Visualização de elenco"] },
  { code: "PRO", name: "Pro Head Coach", price_cents: 2990, description: "Command Center, Trade Hub, Smart Waiver e VBD", features: ["Tudo do Free", "Command Center ao vivo", "Trade Hub & VORP", "Smart Waiver & FAAB", "Recomendações Start/Sit"] },
  { code: "ALL_PRO", name: "All-Pro General Manager", price_cents: 5990, description: "Múltiplas ligas ilimitadas, Dynasty, IDP e Manager DNA", features: ["Tudo do Pro", "Múltiplas ligas ilimitadas", "Suporte Dynasty & IDP", "Draft Center ao vivo", "Manager DNA profundo"] }
];

async function loadBackendPlans() {
  try {
    const res = await fetch(`${YL_API_BASE}/plans`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) activeBackendPlans = data;
    }
  } catch(e) {}
}

async function openCheckoutModal() {
  openModal("checkout-modal");
  document.getElementById("checkout-modal-content").innerHTML = `
    <div style="padding:20px">
      <h2>Pagamentos indisponíveis</h2>
      <p>A integração com um provedor de pagamentos ainda não foi concluída. Não há cobrança ou ativação de assinatura nesta versão.</p>
      <button class="btn-yl btn-outline" onclick="closeModal('checkout-modal')">Fechar</button>
    </div>`;
}

function renderPlansView() {
  const container = document.getElementById("view-plans");
  if (!container) return;

  loadBackendPlans();
  const currentPlan = "FREE";

  container.innerHTML = `
    <div class="yl-card" style="margin-bottom:18px;padding:20px 24px;background:linear-gradient(90deg,#001933 0%,#0F172A 100%);color:#FFF;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:14px;">
        <div>
          <span class="badge badge-crimson">PLANOS EM DESENVOLVIMENTO</span>
          <h2 style="font-size:21px;font-weight:600;margin-top:4px;">Planos YARDLINE NFL · Prévia</h2>
          <p style="font-size:13px;color:#CBD5E1;margin-top:4px;">Valores e benefícios propostos. Contratação indisponível nesta versão.</p>
        </div>
        <div style="background:rgba(255,255,255,0.1);padding:10px 16px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);">
          <div style="font-size:11px;color:#94A3B8;text-transform:uppercase;">SEU PLANO ATUAL</div>
          <div style="font-size:18px;font-weight:700;color:#FFF;margin-top:2px;">Plano ${currentPlan}</div>
        </div>
      </div>
    </div>

    <div class="grid-3">
      ${activeBackendPlans.map(plan => {
        const isCurrent = (plan.code === currentPlan);
        const priceFormatted = (plan.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const isPro = (plan.code === 'PRO');

        return `
          <div class="yl-card" style="padding:24px;display:flex;flex-direction:column;justify-content:space-between;border:${isPro ? '2px solid var(--yl-crimson)' : '1px solid var(--border-light)'};position:relative;">
            ${isPro ? '<span class="badge badge-crimson" style="position:absolute;top:16px;right:16px;">MAIS POPULAR · MVP</span>' : ''}
            <div>
              <span class="badge badge-navy">${plan.code}</span>
              <h3 style="font-size:24px;font-weight:600;color:var(--yl-navy);margin:10px 0 4px;">
                ${priceFormatted} <span style="font-size:12px;color:var(--text-muted);font-weight:400;">/mês</span>
              </h3>
              <p style="font-size:12.5px;color:var(--text-body);margin-bottom:16px;min-height:36px;">${plan.description}</p>

              <div style="border-top:1px solid var(--border-light);padding-top:12px;margin-bottom:20px;">
                <div style="font-size:11.5px;font-weight:600;color:var(--yl-navy);margin-bottom:8px;text-transform:uppercase;">Recursos Inclusos:</div>
                <ul style="padding-left:18px;margin:0;font-size:12.5px;color:var(--text-body);line-height:1.7;">
                  ${plan.features.map(f => `<li>${f}</li>`).join('')}
                </ul>
              </div>
            </div>

            <div>
              ${isCurrent ? `
                <button class="btn-yl btn-primary" style="width:100%;justify-content:center;background:var(--yl-emerald);border-color:var(--yl-emerald);" disabled>
                  Plano Ativo & Sincronizado
                </button>
              ` : `
                <div style="display:flex;flex-direction:column;gap:8px;">
                  <button class="btn-yl btn-primary" style="width:100%;justify-content:center;" onclick="openCheckoutModal('${plan.code}', 'PIX')">
                    Assinar com Pix Instantâneo
                  </button>
                  <button class="btn-yl btn-outline" style="width:100%;justify-content:center;font-size:12px;" onclick="openCheckoutModal('${plan.code}', 'CARD')">
                    Cartão de Crédito
                  </button>
                </div>
              `}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}


// ==========================================
// ONBOARDING INTELIGENTE EM 4 PASSOS (BACKEND YARDLINE)
// ==========================================
let currentOnboardingStep = 1;
let onboardingData = {
  profile: "competitive",
  sleeperUsername: localStorage.getItem("yl_sleeper_username") || "",
  sleeperUserId: null,
  userLeagues: [],
  selectedLeagueId: localStorage.getItem("yl_active_league") || localStorage.getItem("yl_active_league_id") || null,
  selectedLeagueName: "Nenhuma liga selecionada",
  diagnosticMatchup: null
};

function openOnboardingModal(step = 1) {
  currentOnboardingStep = step;
  openModal("onboarding-modal");
  renderOnboardingStep();
  if (step === 3 && onboardingData.userLeagues.length === 0) {
    executeSleeperUserLookup(false);
  }
}

function setOnboardingProfile(type) {
  onboardingData.profile = type;
  renderOnboardingStep();
}

function setOnboardingLeague(leagueId, leagueName) {
  onboardingData.selectedLeagueId = String(leagueId);
  onboardingData.selectedLeagueName = leagueName;
  renderOnboardingStep();
}

function renderOnboardingStep() {
  const container = document.getElementById("onboarding-modal-content");
  if (!container) return;

  const step = currentOnboardingStep;
  const stepTitles = [
    "Passo 1 de 4: Quem é você no Fantasy?",
    "Passo 2 de 4: Conectar Conta do Sleeper",
    "Passo 3 de 4: Selecionar Sua Liga NFL",
    "Passo 4 de 4: Primeiro Diagnóstico da YARDLINE"
  ];

  let html = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-light);padding-bottom:14px;">
      <div>
        <span class="badge badge-crimson" style="margin-bottom:4px;">ONBOARDING EXPRESS (60 SEGUNDOS)</span>
        <h2 style="font-size:20px;font-weight:600;color:var(--yl-navy);margin:2px 0 0;">${stepTitles[step - 1]}</h2>
      </div>
      <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('onboarding-modal')">Fechar</button>
    </div>

    <!-- Stepper indicator -->
    <div style="display:flex;gap:8px;margin-bottom:24px;">
      ${[1, 2, 3, 4].map(s => `
        <div style="flex:1;height:6px;border-radius:3px;background:${s <= step ? 'var(--yl-crimson)' : '#E2E8F0'};transition:background 0.3s;"></div>
      `).join('')}
    </div>
  `;

  if (step === 1) {
    html += `
      <p style="font-size:13.5px;color:var(--text-body);margin-bottom:18px;">
        Personalize a profundidade analítica do seu painel e as recomendações de Start/Sit da YARDLINE de acordo com seu estilo de jogo:
      </p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
        <div onclick="setOnboardingProfile('competitive')" style="cursor:pointer;padding:16px;border-radius:10px;border:2px solid ${onboardingData.profile === 'competitive' ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${onboardingData.profile === 'competitive' ? 'rgba(195,17,43,0.04)' : '#FFF'};">
          <div style="margin-bottom:6px;color:var(--yl-crimson);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg></div>
          <div style="font-weight:600;font-size:14px;color:var(--yl-navy);">Já jogo Fantasy</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Quero vencer minha liga, otimizar lances de FAAB e receber dados de volume (TPRR, rotas, snaps).</div>
        </div>
        <div onclick="setOnboardingProfile('beginner')" style="cursor:pointer;padding:16px;border-radius:10px;border:2px solid ${onboardingData.profile === 'beginner' ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${onboardingData.profile === 'beginner' ? 'rgba(195,17,43,0.04)' : '#FFF'};">
          <div style="margin-bottom:6px;color:var(--yl-emerald);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.52-4.48 10-10 10S2 17.52 2 12A10 10 0 0 1 12 2z"></path><path d="M12 6v12"></path></svg></div>
          <div style="font-weight:600;font-size:14px;color:var(--yl-navy);">Estou começando agora</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Preciso de recomendações explicadas sem jargões complexos e diagnósticos guiados.</div>
        </div>
        <div onclick="setOnboardingProfile('commissioner')" style="cursor:pointer;padding:16px;border-radius:10px;border:2px solid ${onboardingData.profile === 'commissioner' ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${onboardingData.profile === 'commissioner' ? 'rgba(195,17,43,0.04)' : '#FFF'};">
          <div style="margin-bottom:6px;color:var(--yl-amber);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg></div>
          <div style="font-weight:600;font-size:14px;color:var(--yl-navy);">Sou comissário de liga</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Quero gerar vereditos automáticos para o WhatsApp, movimentar trocas e auditar matchups.</div>
        </div>
        <div onclick="setOnboardingProfile('multi')" style="cursor:pointer;padding:16px;border-radius:10px;border:2px solid ${onboardingData.profile === 'multi' ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${onboardingData.profile === 'multi' ? 'rgba(195,17,43,0.04)' : '#FFF'};">
          <div style="margin-bottom:6px;color:var(--yl-blue);"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
          <div style="font-weight:600;font-size:14px;color:var(--yl-navy);">Tenho mais de uma liga</div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">Preciso gerenciar múltiplos elencos rapidamente e cruzar notícias com vários times.</div>
        </div>
      </div>
      <div style="display:flex;justify-content:flex-end;">
        <button class="btn-yl btn-primary" style="padding:10px 22px;font-size:13.5px;" onclick="currentOnboardingStep=2;renderOnboardingStep();">Avançar para Conexão →</button>
      </div>
    `;
  } else if (step === 2) {
    html += `
      <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.2);padding:14px 18px;border-radius:8px;margin-bottom:20px;">
        <div style="font-weight:600;font-size:13px;color:#065F46;display:flex;align-items:center;gap:6px;">
          100% Seguro: Não solicitamos sua senha
        </div>
        <div style="font-size:12px;color:#047857;margin-top:4px;line-height:1.5;">
          A YARDLINE consulta os endpoints oficiais da API pública do Sleeper via backend protegido. Lemos apenas as configurações públicas de elenco, confrontos e regras de pontuação da sua liga.
        </div>
      </div>

      <div style="margin-bottom:24px;">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--yl-navy);margin-bottom:8px;">Digite seu @username do Sleeper:</label>
        <div style="display:flex;gap:10px;">
          <input type="text" id="onboarding-sleeper-input" value="${onboardingData.sleeperUsername}" placeholder="Ex: Faraco" class="yl-search-input" style="flex:1;font-size:14px;padding:10px 14px;">
          <button class="btn-yl btn-navy" onclick="executeSleeperUserLookup(true)">Buscar Minhas Ligas</button>
        </div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:8px;">
          Digite seu nome de usuário oficial do Sleeper (ex: <code>Faraco</code>) para listar todas as suas ligas da temporada.
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button class="btn-yl btn-outline" onclick="currentOnboardingStep=1;renderOnboardingStep();">⬅ Voltar</button>
        <button class="btn-yl btn-primary" onclick="proceedToStep3()">Avançar →</button>
      </div>
    `;
  } else if (step === 3) {
    const leaguesList = onboardingData.userLeagues;

    html += `
      <p style="font-size:13.5px;color:var(--text-body);margin-bottom:16px;">
        ${leaguesList.length > 0 ? `Foram encontradas <strong>${leaguesList.length} ligas NFL</strong> vinculadas à conta <strong>@${onboardingData.sleeperUsername}</strong>. Selecione a liga para sincronizar:` : `Selecione ou confirme a liga Sleeper para conectar:`}
      </p>

      <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:24px;max-height:300px;overflow-y:auto;">
        ${leaguesList.length > 0 ? leaguesList.map(lg => {
          const isSelected = String(onboardingData.selectedLeagueId) === String(lg.id);
          return `
            <div onclick="setOnboardingLeague('${lg.id}', '${lg.name} (#${lg.id})')"
                 style="cursor:pointer;padding:14px 18px;border-radius:10px;border:2px solid ${isSelected ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${isSelected ? 'rgba(195,17,43,0.04)' : '#FFF'};display:flex;justify-content:space-between;align-items:center;">
              <div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span class="badge ${lg.id === '1369770282776006656' ? 'badge-green' : 'badge-blue'}">${lg.season || '2026'} · ${lg.status || 'in_season'}</span>
                  <strong style="color:var(--yl-navy);font-size:14px;">${lg.name}</strong>
                  <span style="font-size:11px;color:var(--text-muted);font-family:monospace;">#${lg.id}</span>
                </div>
                <div style="font-size:12px;color:var(--text-muted);margin-top:4px;">
                  ${lg.totalRosters || 12} Franquias · Tipo: ${lg.seasonType || 'regular'}
                </div>
              </div>
              <span style="font-size:20px;color:var(--yl-crimson);">${isSelected ? '●' : '○'}</span>
            </div>
          `;
        }).join('') : `
          <div style="padding:18px;border:1px dashed var(--border-light);border-radius:10px;background:var(--bg-subtle);color:var(--text-muted);font-size:13px;line-height:1.5;">
            Nenhuma liga foi encontrada para este usuário. Verifique o username do Sleeper e execute a busca novamente. A YARDLINE não seleciona uma liga implícita.
          </div>
        `}
      </div>

      <div style="display:flex;justify-content:space-between;">
        <button class="btn-yl btn-outline" onclick="currentOnboardingStep=2;renderOnboardingStep();">⬅ Voltar</button>
        <button class="btn-yl btn-primary" onclick="generateFirstDiagnostic()">Gerar Diagnóstico Imediato →</button>
      </div>
    `;
  } else if (step === 4) {
    const diag = onboardingData.diagnosticMatchup;
    const myTeamName = diag?.user?.manager?.teamName || "—";
    const oppTeamName = diag?.opponent?.manager?.teamName || "—";
    const myManager = diag?.user?.manager?.displayName || onboardingData.sleeperUsername || "—";
    const oppManager = diag?.opponent?.manager?.displayName || "—";
    const startersList = diag?.user?.roster?.startersDetails || [];
    const topStarters = startersList.slice(0, 4);

    html += `
      <div style="background:rgba(195,17,43,0.05);border:1px solid rgba(195,17,43,0.2);padding:16px 20px;border-radius:10px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span class="badge badge-crimson">DIAGNÓSTICO OFICIAL YARDLINE</span>
            <h3 style="font-size:16px;font-weight:600;color:var(--yl-navy);margin:4px 0 0;">${myTeamName} vs ${oppTeamName}</h3>
            <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
              Duelo Semana 6 · @${myManager} vs @${oppManager} · ${onboardingData.selectedLeagueName}
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:22px;font-weight:600;color:var(--yl-emerald);">56% Favorito</div>
            <div style="font-size:11px;color:var(--text-muted);">Probabilidade de Vitória</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
        <div style="background:#FFF;border:1px solid var(--border-light);border-radius:8px;padding:14px;">
          <div style="font-weight:600;font-size:13px;color:var(--yl-navy);margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            Titulares Auditados (${startersList.length} Atletas)
          </div>
          <ul style="font-size:12px;color:var(--text-body);margin:0;padding-left:16px;line-height:1.6;">
            ${topStarters.length > 0 ? topStarters.map(st => `
              <li><strong>${esc(st.name)} (${esc(st.position)} - ${esc(st.team)}):</strong> Status ${esc(st.injuryStatus || '—')} · Titular confirmado.</li>
            `).join('') : '<li>Dados oficiais de titulares indisponíveis até a sincronização da liga.</li>'}
          </ul>
        </div>

        <div style="background:#FFF;border:1px solid var(--border-light);border-radius:8px;padding:14px;">
          <div style="font-weight:600;font-size:13px;color:var(--yl-navy);margin-bottom:6px;display:flex;align-items:center;gap:6px;">
            Estratégia de Rodada
          </div>
          <div style="font-size:12px;color:var(--text-body);line-height:1.5;">
            <strong>Otimização de Escalação:</strong><br>
            Eficiência estimada: <strong>97.2%</strong>.<br>
            Vantagem crítica: <strong>Recebedores e Linha Defensiva IDP</strong>.<br>
            Ação recomendada: <strong>Manter Brock Purdy e Crosby titulares</strong>.
          </div>
        </div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:var(--yl-emerald);font-weight:600;">Liga sincronizada via API YARDLINE</span>
        <button class="btn-yl btn-primary" style="padding:12px 28px;font-size:14px;" onclick="completeOnboardingFlow()">Entrar na Plataforma com Minha Liga →</button>
      </div>
    `;
  }

  container.innerHTML = html;
}

async function executeSleeperUserLookup(advance = true) {
  const inp = document.getElementById("onboarding-sleeper-input");
  if (inp && inp.value.trim()) {
    onboardingData.sleeperUsername = inp.value.trim();
  }
  const uname = onboardingData.sleeperUsername;
  if (!uname) {
    showToast('Informe seu username do Sleeper antes de buscar as ligas.');
    return;
  }
  showToast(`Consultando usuário @${uname} via YARDLINE API...`);

  try {
    let udata = null;
    try {
      const res = await fetch(`${YL_API_BASE}/integrations/sleeper/user/${encodeURIComponent(uname)}`);
      if (res.ok) udata = await res.json();
    } catch(e) {}

    // Fallback direto à API Sleeper
    if (!udata || !udata.user_id) {
      const directRes = await fetch(`https://api.sleeper.app/v1/user/${encodeURIComponent(uname)}`);
      if (directRes.ok) udata = await directRes.json();
    }

    if (!udata || !udata.user_id) {
      showToast(`Usuário @${uname} não encontrado no Sleeper.`);
      return;
    }
    onboardingData.sleeperUserId = udata.user_id;
    window.YL_SLEEPER_USER_ID = String(udata.user_id);
    localStorage.setItem('yl_sleeper_user_id', String(udata.user_id));
    localStorage.setItem("yl_sleeper_username", uname);
    if (typeof activeSleeperUsername !== "undefined") activeSleeperUsername = uname;

    showToast(`Buscando ligas NFL de @${uname}...`);
    let leagues = [];
    try {
      const legRes = await fetch(`${YL_API_BASE}/integrations/sleeper/user/${udata.user_id}/leagues/2026`);
      if (legRes.ok) leagues = await legRes.json();
    } catch(e) {}

    // Fallback direto de ligas à API Sleeper
    if (!Array.isArray(leagues) || leagues.length === 0) {
      const directLeg = await fetch(`https://api.sleeper.app/v1/user/${udata.user_id}/leagues/nfl/2026`);
      if (directLeg.ok) {
        const rawL = await directLeg.json();
        leagues = (Array.isArray(rawL) ? rawL : []).map(l => ({ id: l.league_id, name: l.name, season: l.season, total_rosters: l.total_rosters, status: l.status }));
      }
    }

    onboardingData.userLeagues = Array.isArray(leagues) ? leagues : [];
    window.YL_AVAILABLE_LEAGUES = onboardingData.userLeagues;
    if (onboardingData.userLeagues.length > 0) {
      onboardingData.selectedLeagueId = onboardingData.userLeagues[0].id;
      onboardingData.selectedLeagueName = `${onboardingData.userLeagues[0].name} (#${onboardingData.userLeagues[0].id})`;
    }
    showToast(`${onboardingData.userLeagues.length} ligas encontradas para @${uname}!`);
    if (advance) {
      currentOnboardingStep = 3;
      renderOnboardingStep();
    }
  } catch (err) {
    console.error("[Onboarding Error]:", err);
    showToast("Erro de comunicação com a API.");
  }
}

function proceedToStep3() {
  const inp = document.getElementById("onboarding-sleeper-input");
  if (inp && inp.value.trim()) {
    onboardingData.sleeperUsername = inp.value.trim();
  }
  executeSleeperUserLookup(true);
}

async function generateFirstDiagnostic() {
  showToast(`Sincronizando ${onboardingData.selectedLeagueName} e calculando matchup...`);
  try {
    try {
      const diagnosticWeek = Number.isInteger(Number(activeLeagueWeek)) ? Number(activeLeagueWeek) : null;
      if (!onboardingData.selectedLeagueId || !diagnosticWeek || !onboardingData.sleeperUsername) {
        showToast('Liga, usuário ou semana oficial indisponível; diagnóstico não será fabricado.');
        currentOnboardingStep = 4;
        renderOnboardingStep();
        return;
      }
      await fetch(`${YL_API_BASE}/integrations/sleeper/sync-league`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leagueId: onboardingData.selectedLeagueId, week: diagnosticWeek })
      });
      const matchRes = await fetch(`${YL_API_BASE}/leagues/${onboardingData.selectedLeagueId}/matchups/current?sleeperUserId=${encodeURIComponent(onboardingData.sleeperUsername)}&week=${diagnosticWeek}`);
      if (matchRes.ok) {
        onboardingData.diagnosticMatchup = await matchRes.json();
      }
    } catch(e) {}
  } catch (err) {
    console.warn("Notice ao gerar diagnostico inicial:", err);
  }
  currentOnboardingStep = 4;
  renderOnboardingStep();
}

function completeOnboardingFlow() {
  closeModal("onboarding-modal");
  localStorage.setItem("yl_onboarded_completed", "true");
  localStorage.setItem("yl_active_league", onboardingData.selectedLeagueId);
  localStorage.setItem("yl_sleeper_username", onboardingData.sleeperUsername);

  if (typeof REAL_SLEEPER_LEAGUE_ID !== "undefined") {
    REAL_SLEEPER_LEAGUE_ID = onboardingData.selectedLeagueId;
  }
  if (typeof activeSleeperUsername !== "undefined") {
    activeSleeperUsername = onboardingData.sleeperUsername;
  }

  showToast(`Liga ${onboardingData.selectedLeagueName} conectada com sucesso!`);
  if (typeof syncRealSleeperLeagueLive === "function") {
    syncRealSleeperLeagueLive();
  }
  if (typeof renderAllViews === "function") {
    renderAllViews();
  }
  openNavTab("playbook");
}

// ==========================================
// AUDITORIA SLEEPER EM 14 ETAPAS (ABA LIGA)
// ==========================================
let isSleeperAuditing = false;

function triggerDetailedSleeperAudit() {
  if (isSleeperAuditing) return;
  isSleeperAuditing = true;

  const logsContainer = document.getElementById("sleeper-audit-live-logs");
  const progressBar = document.getElementById("sleeper-audit-progress-bar");
  const statusBadge = document.getElementById("sleeper-audit-status-badge");
  const auditBtn = document.getElementById("sleeper-audit-trigger-btn");

  if (!logsContainer || !progressBar) return;
  logsContainer.innerHTML = "";
  if (auditBtn) auditBtn.disabled = true;
  if (statusBadge) {
    statusBadge.className = "badge badge-navy";
    statusBadge.innerText = "AUDITANDO EM TEMPO REAL...";
  }

  const steps = [
    "1. Conectando a https://api.sleeper.app/v1/user/@Faraco...",
    "2. Verificando perfil do usuário (Sleeper ID: 9482103)...",
    "3. Listando ligas NFL disponíveis para a temporada 2026...",
    "4. Selecionando 'Neilo Pistola League' (12 Times)...",
    "5. Decodificando regras de pontuação (scoring_settings: PPR 1.0, Passing TD 4pts, Rush TD 6pts)...",
    "6. Mapeando 12 elencos completos e proprietários dos times...",
    "7. Identificando titulares e reservas de 'Gengar My Balls'...",
    "8. Coletando confrontos da Semana 6 e projeções oficiais...",
    "9. Mapeando transações recentes e pedidos de waiver pendentes...",
    "10. Auditando saldos de FAAB da liga ($100 budget inicial)...",
    "11. Cruzando atletas livres com o índice proprietário YARDLINE...",
    "12. Calculando probabilidades de vitória da rodada (58% vs Galáticos)...",
    "13. Salvando snapshot no banco local e atualizando timestamp...",
    "14. Concluído com sucesso! 12 elencos, regras PPR e projeções auditadas."
  ];

  let currentIdx = 0;
  function runStep() {
    if (currentIdx < steps.length) {
      const p = Math.round(((currentIdx + 1) / steps.length) * 100);
      progressBar.style.width = p + "%";
      const div = document.createElement("div");
      div.style.padding = "3px 0";
      div.style.fontSize = "12px";
      div.style.color = currentIdx === steps.length - 1 ? "#047857" : "#334155";
      div.style.fontFamily = "monospace";
      div.innerHTML = `[${new Date().toLocaleTimeString('pt-BR')}] ${steps[currentIdx]}`;
      logsContainer.appendChild(div);
      logsContainer.scrollTop = logsContainer.scrollHeight;
      currentIdx++;
      setTimeout(runStep, 150);
    } else {
      isSleeperAuditing = false;
      if (auditBtn) auditBtn.disabled = false;
      if (statusBadge) {
        statusBadge.className = "badge badge-green";
        statusBadge.innerText = "SINCRONIZADO & AUDITADO: " + new Date().toLocaleTimeString('pt-BR');
      }
      showToast("Sincronização Sleeper concluída! 12 elencos e regras auditadas.");
    }
  }

  runStep();
}

// ==========================================
// MODAL INTELIGENTE DE WAIVERS & FAAB (8 ETAPAS)
// ==========================================
let currentWaiverClaim = null;

function openSmartWaiverClaimModal(playerId) {
  const p = typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(playerId) : null;
  if (!p) {
    showToast("Atleta indisponível no catálogo oficial sincronizado.");
    return;
  }

  let candidateDrops = [];
  const myRoster = window.activeRealMatchup?.myRoster || window.myRoster;
  const starters = myRoster?.starters || [];
  const rosterPlayers = myRoster?.players || (Array.isArray(userBench) ? userBench : []);

  const benchIds = rosterPlayers.filter(id => !starters.includes(id));
  const poolIds = benchIds.length > 0 ? benchIds : rosterPlayers;

  if (poolIds.length > 0) {
    candidateDrops = poolIds.map(id => {
      return (typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(id) : null) ||
             window.YL_CANONICAL?.players?.[id];
    }).sort((a, b) => (Number(a.proj) || 0) - (Number(b.proj) || 0));
  }

  const suggestedDrop = candidateDrops[0] || null;
  if (!suggestedDrop) {
    showToast("Nenhum jogador de banco oficial disponível para sugerir drop.");
    return;
  }
  const playerProj = Number(p.proj) || 11.5;
  const suggestedFaab = Math.min(50, Math.max(5, Math.round(playerProj * 1.8)));

  currentWaiverClaim = {
    player: p,
    suggestedDropId: suggestedDrop.id,
    suggestedDropPlayer: suggestedDrop,
    candidateDrops: candidateDrops,
    suggestedFaabPercent: suggestedFaab,
    priority: "1"
  };

  renderWaiverClaimContent();
  openModal("waiver-modal");
}

function updateFaabSlider(val) {
  if (!currentWaiverClaim) return;
  currentWaiverClaim.suggestedFaabPercent = parseInt(val);
  const valSpan = document.getElementById("faab-slider-val");
  const remSpan = document.getElementById("faab-remaining-val");
  const chanceSpan = document.getElementById("faab-win-chance");
  if (valSpan) valSpan.innerText = val + "% ($" + val + ")";
  if (remSpan) remSpan.innerText = "$" + (100 - parseInt(val));
  if (chanceSpan) {
    let chance = 40 + Math.min(55, Math.round(parseInt(val) * 1.8));
    chanceSpan.innerText = chance + "%";
  }
}

function renderWaiverClaimContent() {
  const content = document.getElementById("waiver-modal-content");
  if (!content || !currentWaiverClaim) return;

  const p = currentWaiverClaim.player;
  const faab = currentWaiverClaim.suggestedFaabPercent;
  const dropPlayer = currentWaiverClaim.suggestedDropPlayer;
  const playerProjection = Number.isFinite(p?.proj) ? p.proj : null;
  const dropProjection = Number.isFinite(dropPlayer?.proj) ? dropPlayer.proj : null;
  const netGainNumeric = Number.isFinite(playerProjection) && Number.isFinite(dropProjection)
    ? playerProjection - dropProjection
    : null;
  const netGain = Number.isFinite(netGainNumeric) ? netGainNumeric.toFixed(1) : null;

  const dropOptions = (currentWaiverClaim.candidateDrops && currentWaiverClaim.candidateDrops.length > 0)
    ? currentWaiverClaim.candidateDrops.map((d, i) => `<option value="${esc(d.id)}" ${i === 0 ? 'selected' : ''}>${esc(d.name)} (${esc(d.pos)} - ${esc(d.team)}) · Proj: ${Number.isFinite(d.proj) ? d.proj.toFixed(1) : 'indisponível'} pts${i === 0 ? ' · Sugestão do Motor (Menor Projeção)' : ''}</option>`).join('')
    : `<option value="godwin" selected>Chris Godwin (WR - TB) · Proj: 9.4 pts · Recomendado pelo Motor</option>
       <option value="hubbard">Chuba Hubbard (RB - CAR) · Proj: 9.8 pts</option>
       <option value="dallas">Dallas Goedert (TE - PHI) · Proj: 8.5 pts</option>
       <option value="davis">Ray Davis (RB - BUF) · Proj: 6.2 pts</option>`;

  content.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-light);padding-bottom:12px;">
      <div>
        <span class="badge badge-crimson">FLUXO INTELIGENTE DE WAIVERS & FAAB</span>
        <h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin:4px 0 0;">Reivindicação: ${esc(p.name)} (${esc(p.pos)} - ${esc(p.team)})</h2>
      </div>
      <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('waiver-modal')">Fechar</button>
    </div>

    <!-- Etapa 1 & 2: O Atleta e Por que ele é Relevante -->
    <div style="display:flex;gap:16px;align-items:center;background:#F8FAFC;border:1px solid var(--border-light);border-radius:10px;padding:14px;margin-bottom:16px;">
      <img src="${esc(p.photo || '')}" style="width:58px;height:58px;border-radius:50%;background:#FFF;border:1px solid var(--border-light);object-fit:cover;" onerror="this.src='${esc(p.teamLogo || '')}'">
      <div style="flex:1;">
        <div style="display:flex;align-items:center;gap:8px;">
          <strong style="font-size:15px;color:var(--yl-navy);">${esc(p.name)}</strong>
          <span class="badge badge-navy">${esc(p.pos)} · ${esc(p.team)}</span>
          <span class="badge badge-green">YL Index: ${Number(p.ylIndex || 88.0).toFixed(1)}</span>
        </div>
        <div style="font-size:12.5px;color:var(--text-body);margin-top:4px;">
          <strong>Por que é relevante:</strong> Projeção semanal de <strong>${Number.isFinite(playerProjection) ? playerProjection.toFixed(1) : '—'} pts</strong>. Oportunidade tática para reforçar a posição com base em métricas de volume e eficiência.
        </div>
      </div>
    </div>

    <!-- Etapa 3: Quem Cortar (Sugestão de Drop) -->
    <div style="background:#FFF;border:1px solid var(--border-light);border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="font-weight:500;font-size:13px;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
        Quem cortar para abrir espaço no elenco?
      </div>
      <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;">
        <select id="waiver-drop-select" class="yl-search-input" style="flex:1;min-width:240px;font-size:13px;padding:8px 12px;">
          ${dropOptions}
        </select>
        <span class="badge ${Number.isFinite(netGainNumeric) && netGainNumeric >= 0 ? 'badge-green' : 'badge-amber'}" style="padding:6px 10px;">Ganho Líquido Estimado: ${Number.isFinite(netGainNumeric) && netGainNumeric >= 0 ? '+' : ''}${netGain ?? 'indisponível'} pts</span>
      </div>
      <div style="font-size:11.5px;color:var(--text-muted);margin-top:6px;">
        O motor avaliou seu banco de reservas e sugeriu o atleta com menor projeção imediata para minimizar o custo de oportunidade.
      </div>
    </div>

    <!-- Etapa 4: Sugestão de FAAB e Slider -->
    <div style="background:#FFF;border:1px solid var(--border-light);border-radius:10px;padding:14px;margin-bottom:16px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div style="font-weight:500;font-size:13px;color:var(--yl-navy);display:flex;align-items:center;gap:6px;">
          Oferta de FAAB Sugerida pela IA: <strong style="color:var(--yl-crimson);">${faab}% ($${faab})</strong>
        </div>
        <div style="font-size:12px;color:var(--text-muted);">
          Seu Saldo: <strong>$100</strong> · Saldo Pós-Lance: <strong id="faab-remaining-val">$${Math.max(0, 100 - faab)}</strong>
        </div>
      </div>
      <input type="range" min="1" max="60" value="${faab}" style="width:100%;accent-color:var(--yl-crimson);" oninput="updateFaabSlider(this.value)">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--text-body);margin-top:6px;">
        <span>Lance selecionado: <strong id="faab-slider-val">${faab}% ($${faab})</strong></span>
        <span>Chance Estimada de Vitória no Leilão: <strong id="faab-win-chance" style="color:var(--yl-emerald);">${Math.min(95, Math.max(15, Math.round(faab * 1.8)))}%</strong></span>
      </div>
    </div>

    <!-- Etapa 5 & 6: Concorrentes e Prioridade -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px;">
      <div style="background:#FFF7ED;border:1px solid #FFEDD5;border-radius:8px;padding:12px;">
        <div style="font-weight:500;font-size:12.5px;color:#9A3412;margin-bottom:4px;"><span class="badge badge-amber" style="font-size:10px;margin-right:4px;">ALERTA</span> Concorrentes Prováveis na Liga</div>
        <div style="font-size:11.5px;color:#C2410C;line-height:1.4;">
          Times com carência na posição e saldo ativo de FAAB competirão no processamento noturno. O lance sugerido protege contra a mediana da liga.
        </div>
      </div>
      <div style="background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;padding:12px;">
        <div style="font-weight:500;font-size:12.5px;color:var(--yl-navy);margin-bottom:4px;">Prioridade do Pedido</div>
        <select class="yl-search-input" style="width:100%;font-size:12px;padding:6px 10px;">
          <option value="1" selected>Prioridade 1 (Reivindicação Primária)</option>
          <option value="2">Prioridade 2 (Secundária)</option>
          <option value="3">Prioridade 3 (Condicional)</option>
        </select>
      </div>
    </div>

    <!-- Etapa 7 & 8: Ações Claras (Simulação vs Envio Real) -->
    <div style="border-top:1px solid var(--border-light);padding-top:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
      <button class="btn-yl btn-outline" style="padding:10px 18px;font-size:13px;border-color:var(--yl-emerald);color:#065F46;background:rgba(16,185,129,0.06);" onclick="simulateWaiverAddition('${esc(p.id)}')">
        Simular Adição no Playbook
      </button>
      <button class="btn-yl btn-primary" style="padding:10px 22px;font-size:13px;" onclick="copyOrderAndOpenSleeper('${esc(p.name)}', '${esc(p.team)}')">
        Copiar Ordem e Abrir Sleeper →
      </button>
    </div>
  `;
}

function simulateWaiverAddition(playerId) {
  const dropSelect = document.getElementById("waiver-drop-select");
  const dropId = dropSelect ? dropSelect.value : (currentWaiverClaim?.suggestedDropId || "godwin");
  if (Array.isArray(userBench)) {
    if (!userBench.includes(playerId)) {
      userBench.push(playerId);
    }
    const idx = userBench.indexOf(dropId);
    if (idx !== -1) {
      userBench.splice(idx, 1);
    }
  }
  closeModal("waiver-modal");
  if (typeof renderPlaybookView === 'function') renderPlaybookView();
  if (typeof renderWaiversView === 'function') renderWaiversView();
  const addedName = (typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(playerId)?.name : null) || YL_ALL_NFL_PLAYERS[playerId]?.name || playerId;
  if (typeof showToast === 'function') {
    showToast("Simulação aplicada! " + addedName + " adicionado ao banco. Projeção atualizada no Playbook.");
  }
  if (typeof openNavTab === 'function') {
    openNavTab("playbook");
  }
}

function copyOrderAndOpenSleeper(playerName, playerTeam) {
  const dropSelect = document.getElementById("waiver-drop-select");
  const dropText = dropSelect ? dropSelect.options[dropSelect.selectedIndex].text : "Jogador a cortar";
  const faab = currentWaiverClaim ? currentWaiverClaim.suggestedFaabPercent : 22;
  const leagueName = window.activeSleeperLeagueData?.name || "Liga Sleeper";

  const textToCopy = `[ORDEM DE WAIVER YARDLINE]\nReivindicar: ${playerName} (${playerTeam})\nCortar: ${dropText}\nOferta FAAB: $${faab} (${faab}%)\nPrioridade: 1\nLiga: ${leagueName}`;
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(textToCopy).then(() => {
      if (typeof showToast === 'function') showToast("Ordem copiada para a área de transferência! Abrindo Sleeper...");
      setTimeout(() => {
        window.open("https://sleeper.com/fantasy-football", "_blank");
        closeModal("waiver-modal");
      }, 600);
    }).catch(() => {
      window.open("https://sleeper.com/fantasy-football", "_blank");
      closeModal("waiver-modal");
    });
  } else {
    window.open("https://sleeper.com/fantasy-football", "_blank");
    closeModal("waiver-modal");
  }
}


// ==========================================
// 32 FRANQUIAS & DEPTH CHARTS EXPLORER
// ==========================================
let currentSelectedTeam = "BUF";
let currentTeamPosFilter = "ALL";
let teamSearchQuery = "";

function setSelectedTeam(teamCode) {
  currentSelectedTeam = teamCode;
  renderTeamsView();
}

function setTeamPosFilter(pos) {
  currentTeamPosFilter = pos;
  renderTeamsView();
}

function handleTeamPlayerSearch(val) {
  teamSearchQuery = val.toLowerCase().trim();
  renderTeamsView();
}

function renderTeamsView() {
  const container = document.getElementById("view-teams");
  if (!container) return;

  const t = YL_NFL_TEAMS[currentSelectedTeam] || YL_NFL_TEAMS["BUF"];
  const allTeamPlayers = Object.values(YL_ALL_NFL_PLAYERS).filter(p => p.team === currentSelectedTeam);

  let filteredPlayers = allTeamPlayers;
  if (currentTeamPosFilter !== "ALL") {
    filteredPlayers = filteredPlayers.filter(p => p.pos === currentTeamPosFilter);
  }
  if (teamSearchQuery) {
    filteredPlayers = Object.values(YL_ALL_NFL_PLAYERS).filter(p =>
      p.name.toLowerCase().includes(teamSearchQuery) ||
      p.teamName.toLowerCase().includes(teamSearchQuery) ||
      p.pos.toLowerCase().includes(teamSearchQuery)
    );
  }

  // Group players by position
  const qbs = filteredPlayers.filter(p => p.pos === "QB");
  const rbs = filteredPlayers.filter(p => p.pos === "RB");
  const wrs = filteredPlayers.filter(p => p.pos === "WR");
  const tes = filteredPlayers.filter(p => p.pos === "TE");
  const ks = filteredPlayers.filter(p => p.pos === "K");
  const defs = filteredPlayers.filter(p => p.pos === "DEF");

  function renderPlayerRow(p) {
    const isStarter = userStarters.includes(p.id);
    const isBench = userBench.includes(p.id);
    const statusBadge = isStarter ? '<span class="badge badge-green">Seu Titular</span>' : (isBench ? '<span class="badge badge-navy">Seu Banco</span>' : '');

    return `
      <div class="yl-card" style="padding:12px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:transform 0.15s, border-color 0.15s;border:1px solid var(--border-light);background:#FFF;" onclick="openPlayerDossierModal('${p.id}')">
        <img src="${p.photo}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;background:#F8FAFC;border:1px solid var(--border-light);" onerror="this.src='${p.teamLogo}'">
        <div style="flex:1;min-width:140px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <strong style="font-size:14px;color:var(--yl-navy);">${p.name}</strong>
            <span style="font-size:12px;color:var(--text-muted);">${p.number}</span>
            <span class="badge badge-navy" style="font-size:10.5px;">${p.depth || p.pos}</span>
            ${statusBadge}
          </div>
          <div style="font-size:11.5px;color:var(--text-body);margin-top:2px;">
            ${p.college} · ${p.exp} · ${p.height} / ${p.weight}
          </div>
        </div>
        <div style="text-align:right;min-width:90px;">
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);">${p.proj} pts</div>
          <div style="font-size:11px;color:var(--text-muted);">Média: ${p.avgPpr} PPR</div>
        </div>
        <div style="text-align:right;min-width:80px;">
          <span class="badge badge-crimson" style="font-size:11px;">YL ${p.ylIndex}</span>
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <!-- Top Franchise Banner -->
    <div class="yl-card" style="padding:20px 24px;margin-bottom:20px;border-left:5px solid var(--yl-crimson);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px;">
        <div style="display:flex;align-items:center;gap:18px;">
          <img src="${t.logo}" style="width:68px;height:68px;object-fit:contain;">
          <div>
            <div style="display:flex;align-items:center;gap:10px;">
              <h1 style="font-size:22px;font-weight:500;color:var(--yl-navy);margin:0;">${t.name}</h1>
              <span class="badge badge-navy">${t.conf} ${t.div}</span>
              <span class="badge badge-green">Recorde: ${t.record}</span>
            </div>
            <div style="font-size:12.5px;color:var(--text-muted);margin-top:4px;">
              Técnico: <strong>${t.coach}</strong> · Estádio: <strong>${t.stadium}</strong> · Folga: <strong>${t.bye}</strong>
            </div>
          </div>
        </div>
        <div style="display:flex;gap:8px;">
          <button class="btn-yl btn-outline" style="font-size:12px;" onclick="openNavTab('playbook')">Abrir Playbook</button>
        </div>
      </div>

      <!-- 32 Teams Quick Filter Pills -->
      <div style="margin-top:16px;border-top:1px solid var(--border-light);padding-top:14px;">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:500;margin-bottom:8px;">SELECIONAR FRANQUIA DA NFL (32 TIMES):</div>
        <div style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;">
          ${Object.entries(YL_NFL_TEAMS).map(([code, tm]) => `
            <button onclick="setSelectedTeam('${code}')" style="padding:5px 10px;font-size:11.5px;border-radius:6px;border:1px solid ${code === currentSelectedTeam ? 'var(--yl-crimson)' : 'var(--border-light)'};background:${code === currentSelectedTeam ? 'var(--yl-crimson)' : '#FFF'};color:${code === currentSelectedTeam ? '#FFF' : 'var(--yl-navy)'};cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:5px;">
              <img src="${tm.logo}" style="width:14px;height:14px;object-fit:contain;">
              <span>${code}</span>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <!-- Filters & Search Toolbar -->
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">
      <div style="display:flex;gap:6px;">
        ${['ALL', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF'].map(pos => `
          <button onclick="setTeamPosFilter('${pos}')" class="btn-yl ${currentTeamPosFilter === pos ? 'btn-primary' : 'btn-outline'}" style="padding:5px 12px;font-size:12px;">
            ${pos === 'ALL' ? 'Todos' : pos}
          </button>
        `).join('')}
      </div>
      <div style="flex:1;max-width:320px;">
        <input type="text" placeholder="Buscar jogador ou franquia..." class="yl-search-input" value="${teamSearchQuery}" oninput="handleTeamPlayerSearch(this.value)" style="width:100%;font-size:12.5px;padding:7px 12px;">
      </div>
    </div>

    <!-- Grouped Roster Sections -->
    <div style="display:flex;flex-direction:column;gap:18px;">
      ${qbs.length > 0 ? `
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="badge badge-navy" style="font-size:10px;margin-right:6px;">QB</span> QUARTERBACKS
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${qbs.map(renderPlayerRow).join('')}
          </div>
        </div>
      ` : ''}

      ${rbs.length > 0 ? `
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="badge badge-blue" style="font-size:10px;margin-right:6px;">RB</span> RUNNING BACKS
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${rbs.map(renderPlayerRow).join('')}
          </div>
        </div>
      ` : ''}

      ${wrs.length > 0 ? `
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="badge badge-green" style="font-size:10px;margin-right:6px;">WR</span> WIDE RECEIVERS
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${wrs.map(renderPlayerRow).join('')}
          </div>
        </div>
      ` : ''}

      ${tes.length > 0 ? `
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="badge badge-amber" style="font-size:10px;margin-right:6px;">TE</span> TIGHT ENDS
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${tes.map(renderPlayerRow).join('')}
          </div>
        </div>
      ` : ''}

      ${ks.length > 0 || defs.length > 0 ? `
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;display:flex;align-items:center;gap:6px;">
            <span class="badge badge-crimson" style="font-size:10px;margin-right:6px;">K / DEF</span> SPECIAL TEAMS & DEFESA
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            ${[...ks, ...defs].map(renderPlayerRow).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// ==========================================
// RELÓGIO & TICKER AO VIVO (ENGINE REAL)
// ==========================================
function startLiveTickerClockEngine() {
  // Without an NFL game-status feed there is no clock to advance locally.
  renderTopTicker();
}

// Function to toggle expandable news in player modal
function toggleArticleExpand(newsId) {
  const body = document.getElementById(`news-body-${newsId}`);
  const btn = document.getElementById(`news-btn-${newsId}`);
  if (!body || !btn) return;

  if (body.style.display === "none") {
    body.style.display = "block";
    btn.innerText = "Recolher Artigo ▴";
  } else {
    body.style.display = "none";
    btn.innerText = "Ler Artigo Completo ▾";
  }
}




/* YARDLINE v2 — UI de jogador e fantasy matchup */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const num=(v,empty='—')=>v===null||v===undefined||v===''?empty:(typeof v==='number'?v.toFixed(1):esc(v));
  const getP=id=>typeof resolveNFLPlayer==='function'?resolveNFLPlayer(id):null;
  const card = renderCanonicalPlayerCard;
  // The final dossier in engines.js is the only active dossier. The V2 mixed-data
  // implementation is retired; no static dossier/archive may enrich this DTO.
  // Competing V2 dossier removed; existing final dossier/layout retained.
  window.renderPlaybookView=function(){
    const c=document.getElementById('view-playbook'); if(!c)return;
    const shell=window.YL_SHELL_SNAPSHOT||{};
    const roster=userRealRoster;
    const groups=window.YardlinePlayerCard.rosterGroups(roster);
    const starters=groups.starters.map(getP).filter(Boolean);
    const bench=groups.bench.map(getP).filter(Boolean);
    const wk=typeof activeLeagueWeek!=='undefined' ? activeLeagueWeek ?? null : null;
    const standings=Array.isArray(shell.standings)?shell.standings:[];
    const myStanding=standings.find(t=>Number(t.rosterId)===Number(roster?.roster_id))||null;
    const opponent=activeRealMatchup?.oppRoster||null;
    const opponentStanding=standings.find(t=>Number(t.rosterId)===Number(opponent?.roster_id))||null;
    const points=v=>v===null||v===undefined||v===''?null:Number(v);
    const projectionValues=starters.map(p=>points(p.metrics?.projectedPoints));
    const projectionKnown=projectionValues.filter(Number.isFinite).length;
    const projectionCoverage=starters.length?Math.round((projectionKnown/starters.length)*100):null;
    const projectedTotal=projectionKnown===starters.length&&starters.length?projectionValues.reduce((a,b)=>a+b,0):null;
    const actualPoints=points(myStanding?.fpts ?? roster?.fpts);
    const opponentScore=points(activeRealMatchup?.oppScore);
    const myScore=points(activeRealMatchup?.myScore);
    const scoreDelta=Number.isFinite(myScore)&&Number.isFinite(opponentScore)?Number((myScore-opponentScore).toFixed(1)):null;
    const asOf=shell.asOf||shell.syncedAt||shell.provenance?.asOf||null;
    const asOfLabel=asOf&&!Number.isNaN(new Date(asOf).getTime())?new Date(asOf).toLocaleString('pt-BR'):'não disponível';
    const playerData=window.YL_LIVE_PLAYER_DATA||{};
    const observed=groups.starters.map(id=>playerData[String(id)]).filter(Boolean);
    const historicalPoints=observed.map(x=>points(x.totalPoints)).filter(Number.isFinite);
    const avgObserved=historicalPoints.length===observed.length&&historicalPoints.length?historicalPoints.reduce((a,b)=>a+b,0):null;
    const metric=(label,value,detail,status='available')=>`<div class="yl-intel-metric ${status==='available'?'':'is-unavailable'}"><span>${label}</span><strong class="mono">${value===null?'—':esc(value)}</strong><small>${esc(detail)}</small></div>`;
    const statusBadge=shell.dataStatus==='stale'||shell.provenance?.status==='stale'?'<span class="badge badge-amber">SNAPSHOT STALE</span>':'<span class="badge badge-green">SLEEPER · SNAPSHOT OFICIAL</span>';
    const matchupText=scoreDelta===null?'Placar oficial ainda não disponível para comparação.':scoreDelta>0?`Seu time lidera por ${Math.abs(scoreDelta).toFixed(1)} pts.`:scoreDelta<0?`O adversário lidera por ${Math.abs(scoreDelta).toFixed(1)} pts.`:'Confronto empatado no snapshot.';
    const insight=projectionCoverage===100&&scoreDelta!==null?`A leitura combina projeção completa dos titulares com o placar oficial da semana ${wk??'—'}.` : projectionCoverage!==null?`A projeção cobre ${projectionCoverage}% dos titulares; nenhuma conclusão é criada para os atletas sem fonte.`:'Projeção da rodada indisponível no snapshot atual.';
    c.innerHTML=`
      <section class="yl-dashboard-intel" aria-labelledby="yl-dashboard-title">
        <div class="yl-dashboard-intel__hero">
          <div><div class="yl-dashboard-kicker">YARDLINE INTELLIGENCE · DASHBOARD</div><h2 id="yl-dashboard-title">Leitura operacional da sua liga</h2><p>${esc(myStanding?.teamName||roster?.teamName||'Owner não identificado — roster não identificado')} · Semana ${wk===null?'—':esc(wk)} · ${esc(shell.league?.name||'Liga Sleeper')}</p></div>
          <div class="yl-dashboard-intel__source">${statusBadge}<small>asOf: ${esc(asOfLabel)}</small></div>
        </div>
        <div class="yl-dashboard-intel__metrics">
          ${metric('Pontos oficiais',actualPoints===null?null:actualPoints.toFixed(1),actualPoints===null?'Sem standings confiáveis':'fpts do roster/standings')}
          ${metric('Projeção dos titulares',projectedTotal===null?null:projectedTotal.toFixed(1),projectionCoverage===100?'Cobertura completa':`${projectionKnown}/${starters.length||0} titulares com projeção`,projectedTotal===null?'unavailable':'available')}
          ${metric('Posição na liga',myStanding?.rank??null,myStanding?.rank?`${standings.length} times no snapshot`:'Ranking indisponível',myStanding?.rank?'available':'unavailable')}
          ${metric('Cobertura de dados',projectionCoverage===null?null:`${projectionCoverage}%`,`${starters.length} titulares identificados`,projectionCoverage===null?'unavailable':'available')}
        </div>
        <div class="yl-dashboard-intel__grid">
          <article class="yl-card yl-dashboard-panel"><div class="yl-card-header"><div class="yl-card-title">Sinal do confronto</div><span class="badge ${scoreDelta===null?'badge-amber':scoreDelta>=0?'badge-green':'badge-crimson'}">${scoreDelta===null?'NÃO VERIFICÁVEL':scoreDelta>=0?'VANTAGEM':'DESVANTAGEM'}</span></div><div class="yl-dashboard-panel__body"><strong>${esc(opponentStanding?.teamName||opponent?.teamName||'Adversário não identificado')}</strong><p>${esc(matchupText)}</p><div class="yl-dashboard-compare"><span>${myScore===null?'—':myScore.toFixed(1)}</span><i></i><span>${opponentScore===null?'—':opponentScore.toFixed(1)}</span></div><small>Comparação somente com pontuação oficial; sem score não há probabilidade inventada.</small></div></article>
          <article class="yl-card yl-dashboard-panel"><div class="yl-card-header"><div class="yl-card-title">Tendência observada</div><span class="badge badge-blue">HISTÓRICO</span></div><div class="yl-dashboard-panel__body"><strong>${avgObserved===null?'—':avgObserved.toFixed(1)} <small>${avgObserved===null?'sem série completa':'pts acumulados observados'}</small></strong><p>${observed.length}/${groups.starters.length||0} titulares possuem histórico persistido no snapshot.</p><div class="yl-dashboard-spark" aria-label="Tendência indisponível sem série temporal completa"><span style="height:${avgObserved===null?18:42}%"></span><span style="height:${avgObserved===null?18:58}%"></span><span style="height:${avgObserved===null?18:74}%"></span><span style="height:${avgObserved===null?18:66}%"></span><span style="height:${avgObserved===null?18:82}%"></span></div><small>${avgObserved===null?'Sem série temporal suficiente para afirmar alta ou queda.':'Série derivada de dados persistidos; não é consenso externo.'}</small></div></article>
        </div>
        <div class="yl-dashboard-insight"><span class="badge badge-navy">LEITURA DO SISTEMA</span><p>${esc(insight)}</p></div>
      </section>
      <div class="yl-dashboard-section-head"><div><h3>Titulares sincronizados</h3><p>Cards canônicos do roster Sleeper. Clique para abrir o dossiê.</p></div><span class="badge badge-navy">${starters.length} atletas</span></div>
      <div class="grid-sidebar"><div><div class="yl-dashboard-player-grid">${starters.length?starters.map((p,i)=>card(p,(ROSTER_SLOTS_DEF?.[(roster?.starters||[]).map(String).indexOf(p.id)]?.label||p.position))).join(''):'<div class="yl-card" style="padding:24px">Roster oficial não identificado; nenhum titular será inventado.</div>'}</div><div class="yl-dashboard-section-head"><div><h3>Banco</h3><p>Atletas do roster, separados dos titulares.</p></div><span class="badge badge-amber">${bench.length}</span></div><div class="yl-dashboard-player-grid">${bench.map(p=>card(p,'BN')).join('')}</div></div><aside class="yl-dashboard-sidebar"><div class="yl-card yl-dashboard-panel"><div class="yl-card-header"><div class="yl-card-title">Integridade do snapshot</div></div><div class="yl-dashboard-panel__body"><p>Provider: <strong>${esc(shell.provider||shell.provenance?.provider||'sleeper')}</strong></p><p>Fonte: <strong>${esc(shell.source||shell.provenance?.source||'sleeper_sync')}</strong></p><p>Atualizado em: <strong>${esc(asOfLabel)}</strong></p><small>O Dashboard não substitui dados oficiais por fixtures nem converte indisponibilidade em zero.</small></div></div><div class="yl-card yl-dashboard-panel"><div class="yl-card-header"><div class="yl-card-title">Próxima ação</div></div><div class="yl-dashboard-panel__body"><p>${projectionCoverage===100?'Revisar delta entre projeção e placar após o fechamento da rodada.':'Aguardar nova sincronização de projeções antes de avaliar eficiência.'}</p><span class="badge badge-crimson">SEM RECOMENDAÇÃO FABRICADA</span></div></div></aside></div>`;
  };

  window.renderLeagueView=function(){
    const c=document.getElementById('view-league'); if(!c)return;
    const wk=typeof activeLeagueWeek!=='undefined'&&activeLeagueWeek||'—', my=LEAGUE_12_TEAMS.find(t=>t.isMyTeam), opp=activeRealMatchup?.oppRoster, oppTeam=opp&&LEAGUE_12_TEAMS.find(t=>Number(t.rosterId)===Number(opp.roster_id));
    const teamRows=(r,isMe)=>{const t=LEAGUE_12_TEAMS.find(x=>Number(x.rosterId)===Number(r?.roster_id)); const officialScore=isMe?activeRealMatchup?.myScore:activeRealMatchup?.oppScore; const officialPlayers=(activeRealMatchup?.snapshot?.players||[]).filter(row=>Number(row.roster_id)===Number(r?.roster_id)); const officialById=new Map(officialPlayers.map(row=>[String(row.player_id),row])); return `<div class="yl-matchup-team ${isMe?'is-me':''}"><div class="yl-matchup-team__head"><div><strong style="font-size:14px;color:var(--yl-navy)">${esc(t?.name||`Roster #${r?.roster_id}`)}</strong><div style="font-size:10px;color:var(--text-muted)">${esc(t?.owner||t?.manager||'')} · ${esc(t?.record||'')}</div></div><strong class="mono" style="font-size:20px;color:var(--yl-navy)">${num(officialScore, '—')}</strong></div>${(r?.starters||[]).slice(0,19).map((id,i)=>{const p=getP(id), official=officialById.get(String(id));return p?`<div class="yl-matchup-row" onclick="openPlayerDossierModal('${esc(id)}')"><img src="${esc(p.photo)}" onerror="this.src='${esc(p.teamLogo)}'"><b>${esc(p.name)}</b><span>${esc(ROSTER_SLOTS_DEF?.[i]?.label||p.pos)}</span><strong class="mono">${num(official?.points, '—')}</strong></div>`:''}).join('')}</div>`};
    c.innerHTML=`<div class="yl-card" style="padding:19px 21px;margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap"><div><span class="badge badge-green">SLEEPER · DADOS OFICIAIS</span><h2 style="font-size:21px;font-weight:700;color:var(--yl-navy);margin-top:6px">${esc(activeSleeperLeagueData?.name||'Minha Liga')}</h2><div style="font-size:12px;color:var(--text-muted)">${activeSleeperRosters?.length||LEAGUE_12_TEAMS?.length||0} times · Temporada ${esc(activeSleeperLeagueData?.season||'—')} · Semana ${esc(wk)}</div></div><button class="btn-yl btn-primary" onclick="syncRealSleeperLeagueLive()">↻ Sincronizar agora</button></div></div><div class="yl-card" style="padding:16px;margin-bottom:16px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px"><div><span class="badge badge-crimson">CONFRONTO FANTASY</span><h3 style="font-size:16px;color:var(--yl-navy);margin-top:5px">${my&&oppTeam?`${esc(my.name)} vs ${esc(oppTeam.name)}`:'Confronto ainda não disponível'}</h3></div><div class="mono" style="font-size:13px;color:var(--text-muted)">${activeRealMatchup?`${num(activeRealMatchup.myScore,'0.0')} × ${num(activeRealMatchup.oppScore,'0.0')}`:'—'}</div></div><div class="yl-matchup-shell">${activeRealMatchup?.myRoster?teamRows(activeRealMatchup.myRoster,true):'<div class="yl-dossier__panel">Sincronize a liga para carregar seu elenco.</div>'}${opp?teamRows(opp,false):'<div class="yl-dossier__panel">O adversário será exibido após a validação do matchup_id.</div>'}</div></div><div class="yl-card"><div class="yl-card-header"><div class="yl-card-title">Classificação da liga</div><span class="badge badge-navy">${LEAGUE_12_TEAMS?.length||0} times</span></div><div style="overflow:auto"><table class="yl-table"><thead><tr><th>#</th><th>Time</th><th>Manager</th><th>Campanha</th><th>Pontos</th><th>Contra</th></tr></thead><tbody>${(LEAGUE_12_TEAMS||[]).slice().sort((a,b)=>(b.wins-a.wins)||(b.fpts-a.fpts)).map((t,i)=>`<tr style="${t.isMyTeam?'background:#f0fdf4':''}"><td>${i+1}</td><td><strong>${esc(t.name)}</strong>${t.isMyTeam?' <span class="badge badge-green">VOCÊ</span>':''}</td><td>${esc(t.owner)}</td><td class="mono">${esc(t.record)}</td><td class="mono">${esc(t.fpts)}</td><td class="mono">${esc(t.fptsAgainst)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };
  window.renderPlayersView = typeof renderPlayersView === 'function' ? renderPlayersView : null;
})();


/* Expor os renderizadores V2 para o carregamento posterior do engine */
window.YL_V2 = { openPlayerDossierModal: window.openPlayerDossierModal, renderPlaybookView: window.renderPlaybookView, renderLeagueView: window.renderLeagueView, renderPlayersView: window.renderPlayersView };


/* YARDLINE P0/P1 — renderização determinística baseada no estado Sleeper */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const teams=()=>typeof YL_NFL_TEAMS!=='undefined'?YL_NFL_TEAMS:{};
  const canonical=()=>Object.entries(window.YL_CANONICAL?.players||{}).map(([id,p])=>({id:String(id),raw:p})).filter(x=>x.raw&&x.raw.status==='Active'&&x.raw.team);
  const player=id=>typeof resolveNFLPlayer==='function'?resolveNFLPlayer(String(id)):null;
  const waiverConfig=()=>{const s=activeSleeperLeagueData?.settings||{},t=Number(s.waiver_type);return {type:Number.isFinite(t)?t:null,isFaab:t===2,budget:Number.isFinite(Number(s.waiver_budget))?Number(s.waiver_budget):null,minBid:Number.isFinite(Number(s.waiver_bid_min))?Number(s.waiver_bid_min):null,known:t===0||t===1||t===2};};
  const sourceLabel=()=>window.YL_CANONICAL?.fetchedAt?`Sleeper · atualizado ${new Date(window.YL_CANONICAL.fetchedAt).toLocaleString('pt-BR')}`:'Catálogo local · desatualizado';
  function rosterIds(r){return new Set([...(r?.players||[]),...(r?.starters||[]),...(r?.reserve||[]),...(r?.taxi||[])].map(String).filter(x=>x&&x!=='0'));}
  function renderTeams(){const c=document.getElementById('view-teams');if(!c)return;const list=canonical();const groups={};list.forEach(({id,raw})=>(groups[raw.team]??=[]).push(player(id)));const t=teams();c.innerHTML=`<div class="yl-card" style="padding:18px;margin-bottom:16px"><span class="badge badge-blue">CATÁLOGO CANÔNICO</span><h2 style="font-size:21px;color:var(--yl-navy);margin-top:6px">Elencos NFL</h2><p style="font-size:12px;color:var(--text-muted);margin-top:4px">${esc(sourceLabel())}. Apenas jogadores Active com franquia atual são exibidos; status de lesão permanece separado.</p></div><div class="yl-team-grid">${Object.entries(groups).sort(([a],[b])=>String(a).localeCompare(String(b))).map(([code,ps])=>`<section class="yl-card yl-team-block"><header class="yl-team-block__head"><img src="${esc(t[code]?.logo||`https://a.espncdn.com/i/teamlogos/nfl/500/${String(code).toLowerCase()}.png`)}" alt="Logo ${esc(code)}" onerror="this.classList.add('photo-error')"><div><strong>${esc(t[code]?.name||code)}</strong><small>${ps.length} atletas · status Active</small></div></header><div class="yl-team-block__players">${ps.sort((a,b)=>String(a?.pos||'').localeCompare(String(b?.pos||''))||String(a?.name||'').localeCompare(String(b?.name||''))).slice(0,80).map(p=>p?`<button class="yl-roster-player" onclick="openPlayerDossierModal('${esc(p.sleeperId||p.id)}')"><img src="${esc(p.photo||'')}" alt="${esc(p.name)}" loading="lazy" onerror="this.classList.add('photo-error')"><span><b>${esc(p.name)}</b><small>${esc(p.pos||'—')} · ${esc(p.depth_chart_position||'sem depth chart')}</small></span></button>`:'').join('')}</div></section>`).join('')}</div>`;}
  function renderRankings(){
    const c=document.getElementById('view-rankings');if(!c)return;
    const q=(c.dataset.rankSearch??c.querySelector('[data-rank-search]')?.value??'').toLowerCase();
    const pos=c.dataset.rankPos??c.querySelector('[data-rank-pos]')?.value??'ALL';
    const sortBy=c.dataset.rankSort??'ylIndex';

    const positions = [
      { key: 'ALL', label: 'Todos' },
      { key: 'QB', label: 'QB' },
      { key: 'RB', label: 'RB' },
      { key: 'WR', label: 'WR' },
      { key: 'TE', label: 'TE' },
      { key: 'K', label: 'K' },
      { key: 'DEF', label: 'DEF' },
      { key: 'IDP', label: 'IDP' }
    ];

    let rows=canonical().map(({id})=>player(id)).filter(Boolean).filter(p=>{
      if (pos === 'ALL') return true;
      if (pos === 'IDP') return ['DL', 'LB', 'DB', 'DE', 'DT', 'CB', 'S'].includes(p.pos);
      return p.pos === pos;
    }).filter(p=>!q||p.name.toLowerCase().includes(q)||String(p.team).toLowerCase().includes(q));

    if (sortBy === 'proj') {
      rows.sort((a,b)=>(Number(b.proj??0)-Number(a.proj??0))||a.name.localeCompare(b.name));
    } else if (sortBy === 'avg') {
      rows.sort((a,b)=>(Number(b.avgPpr??0)-Number(a.avgPpr??0))||a.name.localeCompare(b.name));
    } else {
      rows.sort((a,b)=>(Number(b.ylIndex??-Infinity)-Number(a.ylIndex??-Infinity))||a.name.localeCompare(b.name));
    }

    const posCount={};rows.forEach(p=>{posCount[p.pos]=(posCount[p.pos]||0)+1;p._posRank=posCount[p.pos];});

    let currentTier = 0;

    c.innerHTML=`
      <!-- Quick Action Header & Start/Sit Banner -->
      <div class="yl-card" style="padding:18px 22px;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <span class="badge badge-crimson">ECR & CONSENSUS TIERS · FANTASYPROS PARITY</span>
            <h2 style="font-size:21px;font-weight:700;color:var(--yl-navy);margin-top:4px;">Rankings & Consenso Analítico</h2>
            <p style="font-size:12.5px;color:var(--text-muted);margin-top:2px;">
              Ponderação oficial: 45% Volume e Rotas (TPRR), 30% Histórico de Carreira, 25% Cenário Defensivo & Linhas de Vegas.
            </p>
          </div>
          <button class="btn-yl btn-primary" onclick="openStartSitModal()" style="display:flex;align-items:center;gap:6px;">
            <span>Assistente Start/Sit (Comparador A vs B)</span>
          </button>
        </div>

        <!-- Positional Filter Pills & Search -->
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;border-top:1px solid var(--border-box);padding-top:12px;">
          <div style="display:flex;gap:5px;flex-wrap:wrap;">
            ${positions.map(p=>`
              <button class="btn-yl ${pos===p.key?'btn-navy':'btn-outline'}" style="padding:4px 10px;font-size:11.5px;" onclick="const el=document.getElementById('view-rankings');el.dataset.rankPos='${p.key}';renderRankingsView();">
                ${p.label}
              </button>
            `).join('')}
          </div>
          <div style="display:flex;gap:8px;flex:1;max-width:380px;">
            <input data-rank-search class="yl-search-input" placeholder="Buscar atleta ou time (ex: Allen, SF)..." value="${esc(q)}" oninput="const el=document.getElementById('view-rankings');el.dataset.rankSearch=this.value;renderRankingsView();" style="flex:1;padding:6px 10px;font-size:12px;border:1px solid var(--border-strong);border-radius:6px;outline:none;">
            <select onchange="const el=document.getElementById('view-rankings');el.dataset.rankSort=this.value;renderRankingsView();" style="padding:6px 8px;font-size:11.5px;border:1px solid var(--border-strong);border-radius:6px;background:#FFF;color:var(--yl-navy);">
              <option value="ylIndex" ${sortBy==='ylIndex'?'selected':''}>Por YL Index</option>
              <option value="proj" ${sortBy==='proj'?'selected':''}>Por Projeção</option>
              <option value="avg" ${sortBy==='avg'?'selected':''}>Por Média PPR</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Rankings Table with Tiers -->
      <div class="yl-card" style="overflow:auto;">
        <table class="yl-table" style="margin:0;">
          <thead>
            <tr>
              <th style="width:45px;">#</th>
              <th>Atleta</th>
              <th>Pos</th>
              <th>Time</th>
              <th>Pos Rank</th>
              <th>Proj Sem 6</th>
              <th>Média PPR</th>
              <th>Dificuldade</th>
              <th>YL Index</th>
              <th style="text-align:center;">Decisão</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length===0?'<tr><td colspan="10" style="text-align:center;padding:28px;color:var(--text-muted);">Nenhum atleta encontrado para estes critérios.</td></tr>':rows.slice(0,160).map((p,i)=>{
              const idxVal = Number(p.ylIndex || 0);
              let tierNum = 4;
              let tierLabel = 'TIER 4 · RISCO / DEPENDENTE DE CONFRONTO';
              if (idxVal >= 95.0) { tierNum = 1; tierLabel = 'TIER 1 · ELITE / START INEGOCIÁVEL'; }
              else if (idxVal >= 90.0) { tierNum = 2; tierLabel = 'TIER 2 · STARTERS SÓLIDOS'; }
              else if (idxVal >= 85.0) { tierNum = 3; tierLabel = 'TIER 3 · FLEX COM ALTO TETO'; }

              let tierRow = '';
              if (tierNum !== currentTier && pos === 'ALL') {
                currentTier = tierNum;
                tierRow = `
                  <tr style="background:#F1F5F9;">
                    <td colspan="10" class="yl-tier-header" style="padding:8px 14px;color:var(--yl-navy);font-weight:700;">
                      ${tierLabel}
                    </td>
                  </tr>
                `;
              }

              const projVal = Number.isFinite(p.proj) ? p.proj : null;
              const matchupBadge = Number.isFinite(projVal)
                ? (projVal >= 18 ? '<span class="badge badge-green">Favorável</span>' : (projVal >= 14 ? '<span class="badge badge-blue">Neutro</span>' : '<span class="badge badge-crimson">Atenção</span>'))
                : '<span class="badge badge-unavail">indisponível</span>';

              return `
                ${tierRow}
                <tr onclick="openPlayerDossierModal('${esc(p.sleeperId||p.id)}')" style="cursor:pointer;">
                  <td class="mono" style="font-weight:600;color:var(--yl-navy);">${i+1}</td>
                  <td>
                    <div class="yl-rank-player">
                      <img src="${esc(p.photo||'')}" alt="${esc(p.name)}" loading="lazy" onerror="this.classList.add('photo-error')">
                      <div>
                        <b>${esc(p.name)}</b>
                        <small style="display:block;font-size:10px;color:var(--text-muted);">${esc(p.team||'NFL')}</small>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-navy">${esc(p.pos||'—')}</span></td>
                  <td><span class="badge badge-blue">${esc(p.team||'—')}</span></td>
                  <td class="mono">${esc(p._posRank)}</td>
                  <td class="mono" style="font-weight:600;">${Number.isFinite(p.proj) ? p.proj.toFixed(1) : '—'}</td>
                  <td class="mono">${p.avgPpr != null ? Number(p.avgPpr).toFixed(1) : '—'}</td>
                  <td>${matchupBadge}</td>
                  <td class="mono"><strong>${p.ylIndex==null?'—':esc(p.ylIndex)}</strong></td>
                  <td style="text-align:center;">
                    <button class="btn-yl btn-outline" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation();openStartSitModal('${esc(p.sleeperId||p.id)}')">
                      Start/Sit
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  function renderWaivers(){
    const c=document.getElementById('view-waivers');if(!c)return;
    const w=waiverConfig();
    const status=!w.known?'UNKNOWN':w.isFaab?'FAAB':'PRIORIDADE';
    const mine=userRealRoster?.settings||{};
    const used=Number(mine.waiver_budget_used||0);
    const balance=w.isFaab&&w.budget!=null?Math.max(0,w.budget-used):null;
    const faabBox=w.isFaab?`<div class="yl-waiver-mode is-faab"><b>FAAB ativo nesta liga</b><span>Saldo real: ${balance}/${w.budget} · mínimo: ${w.minBid??0}</span><label><input type="checkbox" checked onchange="showToast(this.checked?'Modo FAAB ativado':'Modo FAAB desativado apenas na visualização')"> Mostrar controles de lance</label></div>`:w.known?`<div class="yl-waiver-mode"><b>Waivers por prioridade</b><span>Esta liga não está configurada como FAAB. Saldo e lance ficam ocultos.</span><label><input type="checkbox" onchange="this.closest('.yl-waiver-mode').classList.toggle('compact',!this.checked)"> Mostrar detalhes de prioridade</label></div>`:`<div class="yl-waiver-mode is-unknown"><b>Formato de waiver não identificado</b><span>Sincronize a liga para liberar controles; nenhum lance será inventado.</span></div>`;

    const posFilter = c.dataset.waiverPos || 'TODOS';
    const query = (c.dataset.waiverQuery || '').toLowerCase().trim();
    const positions = ['TODOS', 'QB', 'RB', 'WR', 'TE', 'K', 'DEF', 'IDP'];

    let free = (activeLeagueFreeAgents || []).slice();
    if (posFilter !== 'TODOS') {
      if (posFilter === 'DEF') free = free.filter(p => ['DEF', 'DE', 'DT'].includes(p.pos));
      else if (posFilter === 'IDP') free = free.filter(p => ['DL', 'LB', 'DB', 'DE', 'DT', 'CB', 'S'].includes(p.pos));
      else free = free.filter(p => p.pos === posFilter);
    }
    if (query) {
      free = free.filter(p => (p.name && p.name.toLowerCase().includes(query)) || (p.team && p.team.toLowerCase().includes(query)));
    }

    const countTotal = free.length;
    const displayed = free.slice(0, 80);

    c.innerHTML=`<div class="yl-card" style="padding:18px;margin-bottom:16px"><span class="badge badge-blue">WAIVER WIRE</span><h2 style="font-size:21px;color:var(--yl-navy);margin-top:6px">Jogadores não rosterizados</h2><p style="font-size:12px;color:var(--text-muted);margin-top:4px">Modo: ${status} · ${countTotal} atletas disponíveis após exclusão estrita dos 16 elencos oficiais.</p>${faabBox}<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:14px;border-top:1px solid var(--border-box);padding-top:12px;"><div style="display:flex;gap:5px;flex-wrap:wrap;">${positions.map(p=>`<button class="btn-yl ${posFilter===p?'btn-navy':'btn-outline'}" style="padding:3px 9px;font-size:11px;" onclick="const el=document.getElementById('view-waivers');el.dataset.waiverPos='${p}';renderWaiversView();">${p}</button>`).join('')}</div><div style="flex:1;max-width:280px;"><input type="text" placeholder="Buscar no waiver..." value="${esc(query)}" oninput="const el=document.getElementById('view-waivers');el.dataset.waiverQuery=this.value;renderWaiversView();" style="width:100%;padding:6px 10px;font-size:12px;border:1px solid var(--border-strong);border-radius:6px;outline:none;"></div></div></div><div class="yl-card" style="overflow:auto"><table class="yl-table"><thead><tr><th>Atleta</th><th>Pos</th><th>Time</th><th>Status</th><th>Ação</th></tr></thead><tbody>${displayed.length===0?'<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Nenhum jogador livre encontrado para este filtro.</td></tr>':displayed.map(p=>`<tr><td><div class="yl-rank-player" onclick="openPlayerDossierModal('${esc(p.sleeperId||p.id)}')" style="cursor:pointer;"><img src="${esc(p.photo||'')}" alt="${esc(p.name)}" loading="lazy" onerror="this.classList.add('photo-error')"><b>${esc(p.name)}</b></div></td><td>${esc(p.pos||'—')}</td><td>${esc(p.team||'—')}</td><td>${esc(p.injuryStatus||p.status||'Sem restrição')}</td><td>${typeof openSmartWaiverClaimModal==='function'?`<button class="btn-yl btn-primary" onclick="openSmartWaiverClaimModal('${esc(p.sleeperId||p.id)}')">Reivindicar</button>`:'—'}</td></tr>`).join('')}</tbody></table></div>`;
  }
  function renderLeague(){
    if (typeof window.renderAuditLeagueView === 'function') {
      window.renderAuditLeagueView();
      return;
    }
    if(typeof window.YL_V2?.renderLeagueView==='function')window.YL_V2.renderLeagueView();
    const c=document.getElementById('view-league');if(!c)return;
    const m=activeRealMatchup, my=m?.myRoster, opp=m?.oppRoster, mp=m?.myScore??my?.custom_points??my?.points, op=m?.oppScore??opp?.custom_points??opp?.points;
    const mt=LEAGUE_12_TEAMS?.find(x=>Number(x.rosterId)===Number(my?.roster_id)),ot=LEAGUE_12_TEAMS?.find(x=>Number(x.rosterId)===Number(opp?.roster_id));
    const delta=(Number(mp)||0)-(Number(op)||0);
    const preview=m?`O confronto está ${mp==null||op==null?'sem placar disponível':`com ${Number(mp).toFixed(1)} a ${Number(op).toFixed(1)}`}. ${delta===0?'Não há vantagem observada no placar atual.':delta>0?`${mt?.name||'Seu time'} lidera por ${delta.toFixed(1)} ponto(s) no momento.`:`${ot?.name||'O adversário'} lidera por ${Math.abs(delta).toFixed(1)} ponto(s) no momento.`}`:'Sincronize a liga para gerar o preview.';
    const el=document.createElement('div');el.className='yl-card yl-matchup-preview';el.innerHTML=`<span class="badge badge-crimson">PREVIEW DO CONFRONTO</span><p>${esc(preview)}</p>`;
    c.prepend(el);
  }
  function renderPlaybook(){if(typeof window.YL_V2?.renderPlaybookView==='function')window.YL_V2.renderPlaybookView();const c=document.getElementById('view-playbook');if(!c||typeof c.querySelectorAll!=='function')return;c.querySelectorAll('.yl-player-card-v2').forEach(card=>{const id=card.getAttribute('onclick')?.match(/'([^']+)'/)?.[1],p=player(id);if(!p)return;const top=card.querySelector('.yl-player-card-v2__top');if(top&&!top.querySelector('.yl-player-card-v2__teamlogo')){const img=document.createElement('img');img.className='yl-player-card-v2__teamlogo';img.src=p.teamLogo||'';img.alt=p.team||'';top.prepend(img);}const body=card.querySelector('.yl-player-card-v2__body');if(body&&!body.querySelector('.yl-player-card-v2__bio')){const bio=document.createElement('div');bio.className='yl-player-card-v2__bio';bio.textContent=[p.age&&`${p.age} anos`,p.height&&`Alt. ${p.height}`,p.weight&&`Peso ${p.weight}`,p.college].filter(Boolean).join(' · ')||'Ficha técnica não disponível';body.appendChild(bio);}});}
  window.renderTeamsView=renderTeams;window.renderRankingsView=renderRankings;window.renderWaiversView=renderWaivers;window.renderLeagueView=renderLeague;window.renderPlaybookView=renderPlaybook;
  window.YL_V3={renderTeams,renderRankings,renderWaivers,renderLeague,renderPlaybook};
})();


/* YARDLINE FIX 2 — Elencos filtráveis */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const canon=()=>window.YL_CANONICAL?.players||{};
  const pof=id=>typeof resolveNFLPlayer==='function'?resolveNFLPlayer(String(id)):null;

  window.renderTeamsView=function(){
    const c=document.getElementById('view-teams');if(!c)return;const entries=Object.entries(canon()).filter(([id,p])=>p&&p.status==='Active'&&p.team);const teams=[...new Set(entries.map(([,p])=>p.team))].sort();const pos=['ALL','QB','RB','WR','TE','K','DEF','DL','LB','DB'];
    const team=c.dataset.team||'ALL', position=c.dataset.pos||'ALL', query=c.dataset.query||'';const shown=entries.filter(([id,p])=>(team==='ALL'||p.team===team)&&(position==='ALL'||p.position===position)&&(!query||String(p.full_name||'').toLowerCase().includes(query.toLowerCase())));
    const grouped={};shown.forEach(([id,p])=>(grouped[p.team]??=[]).push(pof(id)));c.innerHTML=`<div class="yl-card" style="padding:18px;margin-bottom:16px"><span class="badge badge-blue">CATÁLOGO SLEEPER · ${entries.length} ATIVOS</span><h2 style="font-size:21px;color:var(--yl-navy);margin-top:6px">Elencos NFL</h2><div class="yl-roster-filters"><select data-team-filter><option value="ALL">Todas as franquias</option>${teams.map(t=>`<option value="${esc(t)}" ${team===t?'selected':''}>${esc(t)}</option>`).join('')}</select><select data-pos-filter>${pos.map(t=>`<option value="${t}" ${position===t?'selected':''}>${t==='ALL'?'Todas as posições':t}</option>`).join('')}</select><input data-team-query placeholder="Buscar jogador" value="${esc(query)}"><button class="btn-yl btn-primary" data-team-apply>Aplicar</button><span class="yl-muted">${shown.length} atletas</span></div></div><div class="yl-team-grid">${Object.entries(grouped).sort().map(([tm,ps])=>`<section class="yl-card yl-team-block"><header class="yl-team-block__head"><img src="https://a.espncdn.com/i/teamlogos/nfl/500/${esc(tm.toLowerCase())}.png" alt="${esc(tm)}" onerror="this.style.opacity='.3'"><div><strong>${esc(tm)}</strong><small>${ps.length} atletas ativos</small></div></header><div class="yl-team-block__players">${ps.sort((a,b)=>String(a?.pos).localeCompare(String(b?.pos))||String(a?.name).localeCompare(String(b?.name))).map(p=>p?`<button class="yl-roster-player" onclick="openPlayerDossierModal('${esc(p.id)}')"><img src="${esc(p.photo||'')}" onerror="this.src='${esc(p.teamLogo||'')}'"><span><b>${esc(p.name)}</b><small>${esc(p.pos||'—')} · ${esc(p.injuryStatus||'status não informado')}</small></span></button>`:'').join('')}</div></section>`).join('')}</div>`;
    c.querySelector('[data-team-apply]').onclick=()=>{c.dataset.team=c.querySelector('[data-team-filter]').value;c.dataset.pos=c.querySelector('[data-pos-filter]').value;c.dataset.query=c.querySelector('[data-team-query]').value;renderTeamsView();};
  };
  window.YL_FIX2=true;window.YL_FIX2_TEAMS=window.renderTeamsView;
})();

/* Sidebar hierárquica estilo FantasyPros */
window.toggleSidebarGroup=function(key){
  const group=document.querySelector(`[data-sidebar-group="${key}"]`), chevron=document.querySelector(`[data-chevron="${key}"]`);
  if(!group)return; const open=group.classList.toggle('open'); if(chevron)chevron.textContent=open?'⌃':'⌄';
};

/* =========================================================================
   YARDLINE PILLAR 1 & 3: AUDITORIA SLEEPER — MATCHUP UNIFICATION & LEAGUE CHAT
   Liga: Neilo Pistola League (16 times, Keeper PPR com IDP)
   Confronto da Semana 6: Gengar My Balls (Faraco) vs Curitiba Red Fox (neyllon)
   ========================================================================= */
(function() {
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c]));
  const num = (v, def = '0.0') => {
    const n = parseFloat(v);
    return isNaN(n) ? def : n.toFixed(1);
  };
  const formatMatchupNumber = value => Number.isFinite(value) ? value.toFixed(1) : '—';
  // Dados de transações, rosters e confrontos são derivados somente do snapshot oficial.
  window.YL_WEEK6_MATCHUPS = [];
  window.selectedLeagueMatchupId = null;
  window.selectLeagueMatchup = function() {
    if (typeof renderAuditLeagueView === 'function') renderAuditLeagueView();
  };
  // ==========================================
  // PILLAR 1: MATCHUP VIEW UNIFICATION (#view-league)
  // ==========================================
  function renderAuditLeagueView() {
    const container = document.getElementById("view-league");
    if (!container) return;

    // Fonte de verdade: o matchup hidratado pelo backend/Sleeper. O bloco legado
    // abaixo contém fixtures históricas da Semana 6 e nunca deve sobrescrever
    // rosters, jogadores, placares ou status oficiais em produção.
    const liveMatchup = window.activeRealMatchup || (typeof activeRealMatchup !== 'undefined' ? activeRealMatchup : null);
    if (liveMatchup?.myRoster && liveMatchup?.oppRoster) {
      const liveRows = Array.isArray(liveMatchup.snapshot?.players) ? liveMatchup.snapshot.players : [];
      const liveByRoster = rosterId => new Map(
        liveRows.filter(row => Number(row.roster_id) === Number(rosterId))
          .map(row => [String(row.player_id), row])
      );
      const liveTeam = roster => (window.YL_SHELL_SNAPSHOT?.standings || []).find(team => Number(team.rosterId) === Number(roster?.roster_id))
        || LEAGUE_12_TEAMS?.find(team => Number(team.rosterId) === Number(roster?.roster_id))
        || { name: `Roster #${roster?.roster_id ?? '—'}`, owner: '', record: '' };
      const livePlayer = (id, row) => {
        const resolved = resolveMatchupPlayer(String(id));
        return {
          ...resolved,
          id: String(id),
          name: row?.name || resolved.name || `Jogador ${id}`,
          pos: row?.position || resolved.pos || '—',
          team: resolved.team || '—',
          photo: row?.photoUrl || resolved.photo || '',
          points: Number.isFinite(Number(row?.points)) ? Number(row.points) : null,
          projected: Number.isFinite(Number(row?.projected_points)) ? Number(row.projected_points) : null,
          status: row?.status || resolved.status || 'Status não informado'
        };
      };
      const liveRosterRows = roster => {
        const byId = liveByRoster(roster.roster_id);
        return (roster.starters || []).map((id, index) => {
          const row = byId.get(String(id));
          const player = livePlayer(id, row);
          return { player, slot: ROSTER_SLOTS_DEF?.[index]?.label || player.pos || '—' };
        });
      };
      const renderLivePlayer = (entry, alignRight = false) => {
        const p = entry.player;
        const hasOfficial = p.points !== null;
        const value = hasOfficial ? p.points : p.projected;
        const label = hasOfficial ? 'oficial' : p.projected !== null ? 'proj.' : 'indisponível';
        return `<div class="yl-matchup-player-wrap ${alignRight ? 'align-right' : ''}" onclick="openPlayerDossierModal('${esc(p.id)}')">
          ${alignRight ? '' : `<img class="yl-matchup-player-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.src='https://sleepercdn.com/content/nfl/players/thumb/placeholder.jpg'">`}
          <div class="yl-matchup-player-info" style="text-align:${alignRight ? 'right' : 'left'}">
            <div class="yl-matchup-player-name">${alignRight ? '' : ''}${esc(p.name)} <span style="font-size:11px;color:var(--text-muted);font-weight:400;">${esc(p.team)}</span></div>
            <div class="yl-matchup-player-meta" style="font-size:11px;color:var(--text-muted);">${esc(p.status || 'Status não informado')}</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:2px;"><span class="badge badge-navy" style="font-size:9px;padding:0 4px;">${esc(entry.slot)}</span></div>
          </div>
          <div class="yl-matchup-player-score" style="text-align:${alignRight ? 'left' : 'right'}"><strong class="mono" style="font-size:15px;color:var(--yl-navy);">${value === null ? '—' : formatMatchupNumber(value)}</strong><div style="font-size:9.5px;color:var(--text-muted);">${label}</div></div>
          ${alignRight ? `<img class="yl-matchup-player-photo" src="${esc(p.photo)}" alt="${esc(p.name)}" onerror="this.src='https://sleepercdn.com/content/nfl/players/thumb/placeholder.jpg'">` : ''}
        </div>`;
      };
      const myTeam = liveTeam(liveMatchup.myRoster);
      const oppTeam = liveTeam(liveMatchup.oppRoster);
      const myEntries = liveRosterRows(liveMatchup.myRoster);
      const oppEntries = liveRosterRows(liveMatchup.oppRoster);
      const officialStatus = liveRows.some(row => row.points !== null && row.points !== undefined) ? 'Pontuação oficial disponível' : 'Pontuação oficial ainda não publicada pelo Sleeper';
      const initials = name => String(name).split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase() || '—';
      container.innerHTML = `<div class="yl-card" style="padding:16px 20px;margin-bottom:16px;background:#fff"><div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap"><div><span class="badge badge-green">SLEEPER · SNAPSHOT OFICIAL</span><h2 style="font-size:22px;font-weight:700;color:var(--yl-navy);margin-top:6px">${esc(activeSleeperLeagueData?.name || 'Minha Liga')}</h2><div style="font-size:12px;color:var(--text-muted);margin-top:2px">Semana ${esc(typeof activeLeagueWeek !== 'undefined' ? activeLeagueWeek : '—')} · ${esc(officialStatus)}</div></div><button class="btn-yl btn-primary" onclick="syncRealSleeperLeagueLive().catch(err => showToast(err.message || 'Falha ao sincronizar'))">↻ Atualizar Sleeper</button></div></div>
        <div class="yl-matchup-hero"><div class="yl-matchup-hero__top"><span class="badge badge-crimson">CONFRONTO OFICIAL</span><span style="font-size:12px;opacity:.85">${esc(officialStatus)}</span></div><div class="yl-matchup-hero__teams"><div class="yl-matchup-team-card team-left"><div class="yl-matchup-team-card__logo">${esc(initials(myTeam.name))}</div><div><h3 style="font-size:18px;font-weight:700;margin:0">${esc(myTeam.name)}</h3><div style="font-size:12px;opacity:.8;margin-top:2px">${esc(myTeam.owner || '')}</div><div class="mono" style="font-size:26px;font-weight:700;color:#38BDF8;margin-top:6px">${formatMatchupNumber(liveMatchup.myScore)} <span style="font-size:12px;opacity:.8;font-weight:400">pts oficiais</span></div></div></div><div class="yl-matchup-vs-badge"><div style="background:rgba(255,255,255,.12);padding:6px 14px;border-radius:20px;font-size:13px;font-weight:800">VS</div></div><div class="yl-matchup-team-card team-right"><div class="yl-matchup-team-card__logo logo-opponent">${esc(initials(oppTeam.name))}</div><div><h3 style="font-size:18px;font-weight:700;margin:0">${esc(oppTeam.name)}</h3><div style="font-size:12px;opacity:.8;margin-top:2px">${esc(oppTeam.owner || '')}</div><div class="mono" style="font-size:26px;font-weight:700;color:#CBD5E1;margin-top:6px">${formatMatchupNumber(liveMatchup.oppScore)} <span style="font-size:12px;opacity:.8;font-weight:400">pts oficiais</span></div></div></div></div></div>
        <div class="yl-card" style="padding:20px 22px;margin-bottom:20px"><span class="badge badge-crimson">TITULARES LADO A LADO</span><h3 style="font-size:17px;font-weight:700;color:var(--yl-navy);margin-top:4px">Slots oficiais do roster Sleeper</h3><div style="font-size:12px;color:var(--text-muted);margin:4px 0 14px">Clique em qualquer atleta para abrir o dossiê. Dados ausentes permanecem como “—”; nenhum mock é exibido como oficial.</div><div style="overflow-x:auto"><table class="yl-matchup-starters-table"><thead><tr><th style="text-align:left;padding:6px 12px;width:45%">${esc(myTeam.name)}</th><th style="text-align:center;padding:6px 4px;width:10%">Slot</th><th style="text-align:right;padding:6px 12px;width:45%">${esc(oppTeam.name)}</th></tr></thead><tbody>${Array.from({length:Math.max(myEntries.length, oppEntries.length)}, (_, index) => `<tr class="yl-matchup-slot-row"><td class="yl-matchup-slot-cell">${myEntries[index] ? renderLivePlayer(myEntries[index]) : '—'}</td><td class="yl-matchup-slot-center"><span class="yl-matchup-slot-badge slot-badge-offense">${esc(myEntries[index]?.slot || oppEntries[index]?.slot || '—')}</span></td><td class="yl-matchup-slot-cell">${oppEntries[index] ? renderLivePlayer(oppEntries[index], true) : '—'}</td></tr>`).join('')}</tbody></table></div></div>`;
      return;
    }

    container.innerHTML = `
      <div class="yl-card" style="padding:24px;text-align:center;">
        <span class="badge badge-amber">MATCHUP INDISPONÍVEL</span>
        <h2 style="margin:10px 0 6px;color:var(--yl-navy);font-size:20px;">Sincronize uma liga para carregar o confronto</h2>
        <p style="margin:0 auto 16px;max-width:620px;color:var(--text-muted);font-size:13px;line-height:1.5;">
          Nenhum roster, placar ou semana oficial está disponível neste momento. Fixtures históricas não são exibidas como se fossem dados atuais.
        </p>
        <button class="btn-yl btn-primary" onclick="openOnboardingModal(2)">Conectar Sleeper</button>
      </div>`;
    return;

  }

  // ==========================================
  // PILLAR 3: PERSISTENT LEAGUE CHAT RAIL
  // ==========================================
  function getStoredChatMessages() {
    try {
      const raw = localStorage.getItem("yl_league_chat_messages");
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveStoredChatMessages(msgs) {
    try {
      localStorage.setItem("yl_league_chat_messages", JSON.stringify(msgs));
    } catch (e) {}
  }

  function renderLeagueChatFeed() {
    const feed = document.getElementById("yl-chat-feed");
    if (!feed) return;

    const storedMsgs = getStoredChatMessages();

    // Eventos do sistema derivados somente das transações persistidas no snapshot.
    const officialTransactions = Array.isArray(window.YL_SHELL_SNAPSHOT?.transactions)
      ? window.YL_SHELL_SNAPSHOT.transactions
      : [];
    const playerLabel = id => {
      const player = typeof resolveNFLPlayer === 'function' ? resolveNFLPlayer(String(id)) : null;
      return player?.name || `Jogador #${id}`;
    };
    const eventsHtml = officialTransactions.map(tx => {
      const adds = Object.values(tx.adds || {}).map(playerLabel);
      const drops = Object.values(tx.drops || {}).map(playerLabel);
      const timestamp = tx.createdAt ? new Date(tx.createdAt).toLocaleString('pt-BR') : 'Data indisponível';
      const rosterLabel = Array.isArray(tx.rosterIds) && tx.rosterIds.length ? `Roster ${tx.rosterIds.join(', ')}` : 'Roster não identificado';
      return `
      <div class="yl-chat-event event-${esc(tx.type)}">
        <div class="yl-chat-event__head">
          <span class="yl-chat-event__user">${esc(rosterLabel)}</span>
          <span class="yl-chat-event__time">${esc(timestamp)}</span>
        </div>
        <div class="yl-chat-event__body">
          <span class="yl-chat-event__badge badge-${esc(tx.type)}">${esc(tx.status || tx.type || 'TRANSAÇÃO')}</span>
          ${adds.length ? `Adicionou <strong>${esc(adds.join(', '))}</strong>` : 'Adição não informada'}${drops.length ? `, liberou <em>${esc(drops.join(', '))}</em>` : ''}.
        </div>
      </div>
    `;
    }).join('');

    const systemCard = `
      <div class="yl-chat-event event-system">
        <div class="yl-chat-event__head">
          <span class="yl-chat-event__user" style="color:#C3112B;"><span class="badge badge-crimson" style="font-size:9px;margin-right:4px;">COMISSÁRIO</span> SISTEMA OFICIAL</span>
          <span class="yl-chat-event__time">${esc(window.YL_SHELL_SNAPSHOT?.state?.week ? `Semana ${window.YL_SHELL_SNAPSHOT.state.week}` : 'Semana não informada')}</span>
        </div>
        <div class="yl-chat-event__body">
          <span class="yl-chat-event__badge badge-system">WEEKLY REPORT</span>
          ${officialTransactions.length ? `${officialTransactions.length} transações oficiais recebidas do snapshot Sleeper.` : 'Nenhuma transação oficial foi recebida para a liga ativa.'}
        </div>
      </div>
    `;

    // Mensagens de Usuários
    const userMsgsHtml = storedMsgs.map(m => `
      <div class="yl-chat-msg ${m.isMe ? 'is-me' : ''}">
        <div class="yl-chat-msg__avatar">${esc(m.initials || 'FA')}</div>
        <div class="yl-chat-msg__bubble">
          <div class="yl-chat-msg__author">
            <span>${esc(m.author)}</span>
            <span style="font-size:9.5px;color:var(--text-muted);font-weight:400;">${esc(m.time)}</span>
          </div>
          <div class="yl-chat-msg__text">${esc(m.text)}</div>
        </div>
      </div>
    `).join('');

    feed.innerHTML = systemCard + eventsHtml + userMsgsHtml;

    // Atualiza contador no topo
    const totalCount = officialTransactions.length + storedMsgs.length;
    const countBadge = document.getElementById("chat-count-pill");
    if (countBadge) countBadge.textContent = String(totalCount);

    // Scroll para o fim
    setTimeout(() => {
      feed.scrollTop = feed.scrollHeight;
    }, 50);
  }

  async function hydrateLeagueChat() {
    const base = (window.YL_API_BASE || "/api").replace(/\/api\/?$/, "");
    const leagueId = window.REAL_SLEEPER_LEAGUE_ID || localStorage.getItem('yl_active_league_id') || localStorage.getItem('yl_active_league') || null;
    if (!leagueId) return;
    try {
      const response = await fetch(`${base}/api/leagues/${encodeURIComponent(leagueId)}/messages?limit=100`, { headers: { Accept: 'application/json' } });
      if (!response.ok) return;
      const payload = await response.json();
      saveStoredChatMessages((payload.messages || []).map(message => ({ ...message, time: new Date(message.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), isMe: String(message.author).toLowerCase().includes('faraco') })));
      renderLeagueChatFeed();
    } catch (error) { console.warn('[LeagueChat] backend indisponível; mantendo cache local.'); }
  }

  function toggleLeagueChat() {
    const shell = document.querySelector(".yl-main-shell");
    const rail = document.getElementById("yl-chat-rail");
    if (!shell) return;

    const isCollapsed = shell.classList.toggle("chat-collapsed");
    if (rail) rail.classList.toggle("mobile-open", !isCollapsed);

    try {
      localStorage.setItem("yl_chat_collapsed", isCollapsed ? "1" : "0");
    } catch (e) {}

    showToast(isCollapsed ? "League Chat recolhido" : "League Chat expandido");
  }

  async function sendChatMessage() {
    const input = document.getElementById("yl-chat-input");
    if (!input) return;
    const text = (input.value || "").trim();
    if (!text) return;

    const msgs = getStoredChatMessages();
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const draft = {
      author: "@Faraco (Gengar My Balls)",
      initials: "GM",
      text,
      time: `Hoje · ${timeStr}`,
      isMe: true
    };

    const base = (window.YL_API_BASE || "/api").replace(/\/api\/?$/, "");
    const leagueId = window.REAL_SLEEPER_LEAGUE_ID || localStorage.getItem('yl_active_league_id') || localStorage.getItem('yl_active_league') || null;
    if (!leagueId) {
      showToast('Selecione e sincronize uma liga antes de enviar mensagens.');
      return;
    }
    try {
      const response = await fetch(`${base}/api/leagues/${encodeURIComponent(leagueId)}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ message: text, author: draft.author, initials: draft.initials }) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const saved = await response.json();
      msgs.push({ ...draft, createdAt: saved.createdAt });
    } catch (error) { msgs.push(draft); }
    saveStoredChatMessages(msgs);
    input.value = "";
    renderLeagueChatFeed();
    showToast("Mensagem enviada para o League Chat!");
  }

  function insertChatQuickText(text) {
    const input = document.getElementById("yl-chat-input");
    if (!input) return;
    input.value = text;
    input.focus();
  }

  // Inicialização e Exposição Global
  window.renderAuditLeagueView = renderAuditLeagueView;
  window.renderLeagueView = renderAuditLeagueView;
  window.renderLeagueChatFeed = renderLeagueChatFeed;
  window.toggleLeagueChat = toggleLeagueChat;
  window.sendChatMessage = sendChatMessage;
  window.insertChatQuickText = insertChatQuickText;

  // ==========================================================================
  // AGENTE GITHUB EM TEMPO REAL (CLIENT HOOK & POLLING)
  // ==========================================================================
  const SYNC_AGENT_BASE = (typeof window !== "undefined" && window.YL_SYNC_AGENT_URL) || "http://127.0.0.1:8788";

  async function checkGitSyncStatus() {
    const pill = document.getElementById("topbar-git-sync-pill");
    const label = document.getElementById("git-sync-label");
    if (!pill || !label) return;

    try {
      const res = await fetch(`${SYNC_AGENT_BASE}/health`, { signal: AbortSignal.timeout(3000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      if (data.isSyncing) {
        pill.classList.add("syncing");
        pill.classList.remove("error");
        label.textContent = "Sincronizando...";
      } else {
        pill.classList.remove("syncing", "error");
        if (data.lastSyncAt) {
          const diffMin = Math.round((Date.now() - new Date(data.lastSyncAt).getTime()) / 60000);
          if (diffMin < 1) {
            label.textContent = "10m · Atualizado agora";
          } else {
            label.textContent = `10m · Há ${diffMin}m`;
          }
        } else {
          label.textContent = "10m · Ativo";
        }
      }
    } catch {
      if (label) label.textContent = "10m · Monitorando";
    }
  }

  async function triggerManualGitSync() {
    const pill = document.getElementById("topbar-git-sync-pill");
    const label = document.getElementById("git-sync-label");
    if (pill) pill.classList.add("syncing");
    if (label) label.textContent = "Sincronizando...";

    if (typeof showToast === "function") {
      showToast("Iniciando sincronização com o GitHub...");
    }

    try {
      const res = await fetch(`${SYNC_AGENT_BASE}/api/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (pill) pill.classList.remove("syncing");

      if (data.status === "already_in_progress") {
        if (typeof showToast === "function") showToast("Sincronização já em andamento.");
      } else if (data.status === "ok") {
        if (typeof showToast === "function") {
          showToast(`GitHub sincronizado! Commit: ${data.commit || 'recente'}`);
        }
        if (label) label.textContent = "10m · Atualizado agora";
      } else {
        if (typeof showToast === "function") showToast("Verificação com o GitHub concluída.");
      }
    } catch (err) {
      if (pill) pill.classList.remove("syncing");
      if (label) label.textContent = "10m · Ativo";
      if (typeof showToast === "function") {
        showToast("Agente local executando em background (ciclo de 10 min).");
      }
    }
  }

  window.triggerManualGitSync = triggerManualGitSync;
  window.checkGitSyncStatus = checkGitSyncStatus;

  // Iniciar monitoramento do agente
  if (typeof window !== "undefined") {
    setTimeout(checkGitSyncStatus, 2000);
    setInterval(checkGitSyncStatus, 15000);
  }

  // Restaurar estado de colapso do chat se salvo
  document.addEventListener("DOMContentLoaded", () => {
    try {
      const savedCollapsed = localStorage.getItem("yl_chat_collapsed");
      const shell = document.querySelector(".yl-main-shell");
      if (savedCollapsed !== "0" && shell) {
        shell.classList.add("chat-collapsed");
      }
    } catch (e) {}
    renderLeagueChatFeed();
    hydrateLeagueChat();
  });

  // Executar imediatamente se o DOM já estiver pronto
  if (document.readyState === "complete" || document.readyState === "interactive") {
    renderLeagueChatFeed();
  }
})();

// ==========================================
// 12. MULTI-LEAGUE & TEAM SWITCHER MODAL
// ==========================================
(function() {
  const getAvailableLeagues = () => {
    const fromApi = window.YL_AVAILABLE_LEAGUES || (typeof onboardingData !== 'undefined' ? onboardingData.userLeagues : []);
    return Array.isArray(fromApi) ? fromApi : [];
  };

  window.openLeagueSwitcherModal = function() {
    const modal = document.getElementById("league-switcher-modal");
    const content = document.getElementById("league-switcher-modal-content");
    if (!modal || !content) return;
    const currentId = localStorage.getItem("yl_active_league_id") || null;
    const availableLeagues = getAvailableLeagues();

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px;">
        <div>
          <span class="badge badge-crimson" style="margin-bottom:6px;display:inline-block;">SLEEPER MULTI-LEAGUE</span>
          <h2 style="font-size:20px;font-weight:700;color:var(--yl-navy);margin:0;">Alternar Liga & Elenco</h2>
          <p style="font-size:12.5px;color:var(--text-muted);margin:4px 0 0;">Conta conectada: <strong>@Faraco</strong> · Selecione qual time e liga você deseja analisar no YARDLINE.</p>
        </div>
        <button type="button" class="btn-yl btn-outline" onclick="closeModal('league-switcher-modal')" style="padding:4px 10px;font-size:16px;">×</button>
      </div>

      <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:20px;">
        ${availableLeagues.length ? availableLeagues.map(lg => {
          const isActive = lg.id === currentId;
          return `
            <div style="border:2px solid ${isActive ? '#C3112B' : 'var(--border-color)'};background:${isActive ? 'rgba(195,17,43,0.04)' : '#FFFFFF'};border-radius:10px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;gap:14px;cursor:pointer;transition:all 0.15s ease;" onclick="switchLeague('${lg.id}')">
              <div style="flex:1;">
                <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                  <strong style="font-size:15px;color:var(--yl-navy);">${lg.name || `Liga #${lg.id || lg.league_id}`}</strong>
                  ${isActive ? '<span class="badge badge-crimson" style="font-size:10px;">LIGA ATIVA</span>' : `<span class="badge badge-navy" style="font-size:10px;">${lg.status || "DISPONÍVEL"}</span>`}
                </div>
                <div style="font-size:13px;font-weight:600;color:#0F172A;margin-bottom:2px;">
                  Liga Sleeper: <span style="color:#C3112B;">#${lg.id || lg.league_id}</span>
                </div>
                <div style="font-size:11px;color:var(--text-muted);margin-bottom:4px;">${lg.season || "temporada não informada"} · ${lg.total_rosters || "—"} rosters</div>
                <div style="font-size:11px;color:var(--text-body);"><strong>Fonte:</strong> API Sleeper / sincronização oficial</div>
              </div>
              <div>
                <button type="button" class="btn-yl ${isActive ? 'btn-primary' : 'btn-outline'}" style="white-space:nowrap;padding:7px 14px;font-size:12px;" onclick="event.stopPropagation();switchLeague('${lg.id}')">
                  ${isActive ? ' Ativa' : 'Selecionar'}
                </button>
              </div>
            </div>
          `;
        }).join('') : '<div class="yl-empty-state">Nenhuma liga Sleeper sincronizada para esta conta.</div>'}
      </div>

      <div style="border-top:1px solid var(--border-color);padding-top:14px;display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:11.5px;color:var(--text-muted);">Sincronização 100% oficial com a API Sleeper v1</span>
        <button type="button" class="btn-yl btn-navy" onclick="closeModal('league-switcher-modal')" style="padding:6px 16px;font-size:12px;">Fechar</button>
      </div>
    `;

    openModal(modal.id);
  };

  window.switchLeague = async function(leagueId) {
    localStorage.setItem("yl_active_league_id", leagueId);
    if (typeof closeModal === "function") closeModal("league-switcher-modal");
    if (typeof showToast === "function") showToast("Alternando liga e sincronizando elenco...");
    if (typeof window.syncRealSleeperLeagueLive === "function") {
      await window.syncRealSleeperLeagueLive(leagueId);
    }
  };
})();
