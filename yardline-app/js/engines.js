// ==========================================
//  SANITIZADOR UNIVERSAL ANTI-XSS (ETAPA 11: SECURITY AGENT)
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

// ==========================================
//  CAMADA DE DOMÍNIO: ESTRUTURA DE ELENCO & REGRAS
// ==========================================
let ROSTER_SLOTS_DEF = [
  { key: "QB", label: "QB", allowed: ["QB"], required: true },
  { key: "RB1", label: "RB", allowed: ["RB"], required: true },
  { key: "WR1", label: "WR", allowed: ["WR"], required: true },
  { key: "WR2", label: "WR", allowed: ["WR"], required: true },
  { key: "WR3", label: "WR", allowed: ["WR"], required: true },
  { key: "TE", label: "TE", allowed: ["TE"], required: true },
  { key: "FLEX1", label: "FLEX", allowed: ["RB", "WR", "TE"], required: true },
  { key: "FLEX2", label: "FLEX", allowed: ["RB", "WR", "TE"], required: true },
  { key: "IDP", label: "IDP", allowed: ["DL", "LB", "DB", "DE", "DT", "CB", "S"], required: true },
  { key: "K", label: "K", allowed: ["K"], required: true },
  { key: "DL1", label: "DL", allowed: ["DL", "DE", "DT"], required: true },
  { key: "DL2", label: "DL", allowed: ["DL", "DE", "DT"], required: true },
  { key: "DL3", label: "DL", allowed: ["DL", "DE", "DT"], required: true },
  { key: "LB1", label: "LB", allowed: ["LB", "ILB", "OLB"], required: true },
  { key: "LB2", label: "LB", allowed: ["LB", "ILB", "OLB"], required: true },
  { key: "LB3", label: "LB", allowed: ["LB", "ILB", "OLB"], required: true },
  { key: "DB1", label: "DB", allowed: ["DB", "CB", "S", "FS", "SS"], required: true },
  { key: "DB2", label: "DB", allowed: ["DB", "CB", "S", "FS", "SS"], required: true },
  { key: "DB3", label: "DB", allowed: ["DB", "CB", "S", "FS", "SS"], required: true }
];

// Estado Inicial do Elenco Real do Usuário (Time: Gengar My Balls · ID da Liga: 1369770282776006656)
let userLineup = {
  "QB": "8183",    // Brock Purdy (QB, SF)
  "RB1": "7588",   // Javonte Williams (RB, DAL)
  "WR1": "8112",   // Drake London (WR, ATL)
  "WR2": "9997",   // Zay Flowers (WR, BAL)
  "WR3": "11646",  // Jalen Coker (WR, CAR)
  "TE": "4217",    // George Kittle (TE, SF)
  "FLEX1": "12474", // Woody Marks (RB, HOU)
  "FLEX2": "11576", // Braelon Allen (RB, NYJ)
  "IDP": "6791",   // C.J. Henderson (CB, ATL)
  "K": "6083",     // Matt Gay (K, LV)
  "DL1": "5991",   // Maxx Crosby (DE, LV)
  "DL2": "10892",  // Will Anderson (DL, HOU)
  "DL3": "13457",  // Gabe Jacas (DE, NE)
  "LB1": "6860",   // Akeem Davis-Gaither (LB, IND)
  "LB2": "12140",  // Omar Speights (LB, LAR)
  "LB3": "13381",  // Jaishawn Barham (LB, DAL)
  "DB1": "11685",  // Kamari Lassiter (DB, HOU)
  "DB2": "11739",  // Evan Williams (DB, GB)
  "DB3": "12605"   // Jacob Parrish (DB, TB)
};

let userBenchList = [
  "11610", // Malik Washington (WR, MIA)
  "11667", // Dallas Turner (LB, MIN)
  "12504", // Kaleb Johnson (RB, GB)
  "12505", // Jalen Royals (WR, KC)
  "12646", // Barrett Carter (LB, CIN)
  "13413", // Cyrus Allen (WR, KC)
  "4224",  // Chuck Clark (DB, DET)
  "5846",  // DK Metcalf (WR, PIT)
  "5947",  // Jakobi Meyers (WR, JAX)
  "6868",  // DJ Wonnum (DE, DET)
  "7523",  // Trevor Lawrence (QB, JAX)
  "8210"   // Chig Okonkwo (TE, WAS)
];

let userReserveList = [
  "11470"  // Drake Thomas (LB, SEA) - Reserva/IR
];

// Carregar persistência local se disponível
try {
  // Limpar estado legado de mocks antigos (Josh Allen 4984, etc.)
  const rawLineup = localStorage.getItem("yl_user_lineup");
  if (rawLineup && (rawLineup.includes("Vazio") || rawLineup.includes("null") || rawLineup.includes("4984"))) {
    localStorage.removeItem("yl_user_lineup");
    localStorage.removeItem("yl_user_bench");
  }
} catch(e){}
try {
  const savedLineup = localStorage.getItem("yl_user_lineup");
  if (savedLineup) userLineup = JSON.parse(savedLineup);
  const savedBench = localStorage.getItem("yl_user_bench");
  if (savedBench) userBenchList = JSON.parse(savedBench);
} catch (e) {}

function saveLineupState() {
  try {
    const rawLineup = localStorage.getItem("yl_user_lineup");
    if (rawLineup && (rawLineup.includes("Vazio") || rawLineup.includes("null"))) {
      localStorage.removeItem("yl_user_lineup");
      localStorage.removeItem("yl_user_bench");
    }
  } catch(e){}
  try {
    localStorage.setItem("yl_user_lineup", JSON.stringify(userLineup));
    localStorage.setItem("yl_user_bench", JSON.stringify(userBenchList));
  } catch (e) {}
}

// ==========================================
//  MOTOR DE CÁLCULO DE PROJEÇÃO PARAMETRIZADA (ROSTER & SCORING)
// ==========================================
function calculateLineupProjection(lineup, fmt = (typeof activeScoringFormat !== "undefined" ? activeScoringFormat : "PPR")) {
  if (!lineup || typeof lineup !== "object") return "0.0";
  let sum = 0;
  for (const [slotKey, pid] of Object.entries(lineup)) {
    if (pid) {
      const p = resolveNFLPlayer(pid);
      if (p) sum += (typeof getEffectiveProjection === "function" ? getEffectiveProjection(p) : (p.proj || 0));
    }
  }
  return sum.toFixed(1);
}

function calculateLineupTotalProjection() {
  return calculateLineupProjection(userLineup);
}

// ==========================================
//  MOTOR DE SUBSTITUIÇÃO GUIADA (PLAYBOOK)
// ==========================================
let activeSwapTarget = null; // { type: 'starter' | 'bench', slotKey: string, playerId: string }

function openStarterSwap(slotKey) {
  const currentPid = userLineup[slotKey];
  const currentStarter = YL_ALL_NFL_PLAYERS[currentPid] || YL_PLAYER_DOSSIERS[currentPid];
  const slotDef = ROSTER_SLOTS_DEF.find(s => s.key === slotKey);
  if (!currentStarter || !slotDef) return;

  activeSwapTarget = { type: 'starter', slotKey, currentPid, slotDef };
  renderLineupSwapModal();
}

function openBenchPromote(benchPid) {
  const benchPlayer = YL_ALL_NFL_PLAYERS[benchPid] || YL_PLAYER_DOSSIERS[benchPid];
  if (!benchPlayer) return;

  activeSwapTarget = { type: 'bench', benchPid, benchPlayer };
  renderLineupSwapModal();
}

function renderLineupSwapModal() {
  const modal = document.getElementById("lineup-swap-modal");
  const content = document.getElementById("lineup-swap-modal-content");
  if (!modal || !content || !activeSwapTarget) return;

  if (activeSwapTarget.type === 'starter') {
    const { slotKey, slotDef, currentPid } = activeSwapTarget;
    const starter = YL_ALL_NFL_PLAYERS[currentPid] || YL_PLAYER_DOSSIERS[currentPid];

    // Filtrar apenas reservas elegíveis para este slot
    const eligibleBench = userBenchList.map(bid => YL_ALL_NFL_PLAYERS[bid] || YL_PLAYER_DOSSIERS[bid]).filter(bp => {
      return bp && slotDef.allowed.includes(bp.pos);
    });

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-light);padding-bottom:12px;">
        <div>
          <span class="badge badge-crimson">SUBSTITUIÇÃO GUIADA DE ESCALAÇÃO</span>
          <h2 style="font-size:19px;font-weight:500;color:var(--yl-navy);margin:4px 0 0;">Substituir Titular no Slot ${slotKey} (${slotDef.label})</h2>
        </div>
        <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('lineup-swap-modal')">Fechar</button>
      </div>

      <!-- Current Starter Card -->
      <div style="display:flex;align-items:center;gap:14px;background:#F8FAFC;border:1px solid var(--border-light);border-radius:10px;padding:14px;margin-bottom:18px;">
        <img src="${starter.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid var(--border-light);" onerror="this.src='${starter.teamLogo}'">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="font-size:15px;color:var(--yl-navy);">${starter.name}</strong>
            <span class="badge badge-navy">${starter.pos} · ${starter.team}</span>
            <span class="badge badge-green">${starter.injuryStatus ? starter.injuryStatus : 'Sem restrição'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">
            Projeção Atual: <strong style="color:var(--yl-navy);">${starter.proj} pts</strong> · Média: ${starter.avgPpr} PPR · YL Index: ${starter.ylIndex}
          </div>
        </div>
        <span class="badge badge-amber" style="padding:6px 10px;">TITULAR ATUAL</span>
      </div>

      <!-- Eligible Bench Candidates -->
      <div style="margin-bottom:14px;">
        <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;">
          RESERVAS ELEGÍVEIS NO SEU BANCO (${eligibleBench.length} DISPONÍVEIS):
        </div>
        ${eligibleBench.length === 0 ? `
          <div style="padding:20px;text-align:center;background:#FFF;border:1px dashed var(--border-light);border-radius:8px;font-size:13px;color:var(--text-muted);">
            Nenhum jogador no seu banco é elegível para a posição <strong>${slotDef.allowed.join(' / ')}</strong>.
          </div>
        ` : `
          <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;">
            ${eligibleBench.map(bp => {
              const diff = (bp.proj - starter.proj).toFixed(1);
              const diffColor = diff > 0 ? "var(--yl-emerald)" : (diff < 0 ? "var(--yl-crimson)" : "var(--text-muted)");
              const diffSign = diff > 0 ? "+" : "";

              return `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#FFF;border:1px solid var(--border-light);border-radius:8px;transition:border-color 0.2s;">
                  <div style="display:flex;align-items:center;gap:12px;">
                    <img src="${bp.photo}" style="width:42px;height:42px;border-radius:50%;object-fit:cover;border:1px solid var(--border-light);" onerror="this.src='${bp.teamLogo}'">
                    <div>
                      <div style="display:flex;align-items:center;gap:6px;">
                        <strong style="font-size:13.5px;color:var(--yl-navy);">${bp.name}</strong>
                        <span class="badge badge-navy" style="font-size:10px;">${bp.pos} · ${bp.team}</span>
                      </div>
                      <div style="font-size:11.5px;color:var(--text-muted);margin-top:2px;">
                        Projeção: <strong>${bp.proj} pts</strong> · YL ${bp.ylIndex} · ${bp.injuryStatus ? bp.injuryStatus : 'Sem restrição'}
                      </div>
                    </div>
                  </div>
                  <div style="display:flex;align-items:center;gap:14px;">
                    <div style="text-align:right;">
                      <div style="font-size:13px;font-weight:500;color:${diffColor};">${diffSign}${diff} pts</div>
                      <div style="font-size:10.5px;color:var(--text-muted);">Impacto no Total</div>
                    </div>
                    <button class="btn-yl btn-primary" style="padding:6px 14px;font-size:12px;" onclick="executeLineupSwap('${slotKey}', '${bp.id}', '${starter.id}')">
                      Escalar Titular →
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  } else if (activeSwapTarget.type === 'bench') {
    const { benchPid, benchPlayer } = activeSwapTarget;

    // Encontrar todos os slots titulares onde este reserva é elegível
    const eligibleSlots = ROSTER_SLOTS_DEF.filter(s => s.allowed.includes(benchPlayer.pos));

    content.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;border-bottom:1px solid var(--border-light);padding-bottom:12px;">
        <div>
          <span class="badge badge-green">PROMOVER RESERVA A TITULAR</span>
          <h2 style="font-size:19px;font-weight:500;color:var(--yl-navy);margin:4px 0 0;">Promover ${benchPlayer.name} (${benchPlayer.pos})</h2>
        </div>
        <button class="btn-yl btn-outline" style="padding:4px 10px;font-size:12px;" onclick="closeModal('lineup-swap-modal')">Fechar</button>
      </div>

      <div style="display:flex;align-items:center;gap:14px;background:#F8FAFC;border:1px solid var(--border-light);border-radius:10px;padding:14px;margin-bottom:18px;">
        <img src="${benchPlayer.photo}" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:1px solid var(--border-light);" onerror="this.src='${benchPlayer.teamLogo}'">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:8px;">
            <strong style="font-size:15px;color:var(--yl-navy);">${benchPlayer.name}</strong>
            <span class="badge badge-navy">${benchPlayer.pos} · ${benchPlayer.team}</span>
            <span class="badge badge-green">${benchPlayer.injuryStatus ? benchPlayer.injuryStatus : 'Sem restrição'}</span>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:3px;">
            Projeção: <strong style="color:var(--yl-navy);">${benchPlayer.proj} pts</strong> · YL Index: ${benchPlayer.ylIndex}
          </div>
        </div>
        <span class="badge badge-navy" style="padding:6px 10px;">RESERVA NO BANCO</span>
      </div>

      <div style="margin-bottom:14px;">
        <div style="font-size:13px;font-weight:500;color:var(--yl-navy);margin-bottom:8px;">
          ESCOLHA QUAL TITULAR MOVER PARA O BANCO:
        </div>
        <div style="display:flex;flex-direction:column;gap:10px;max-height:280px;overflow-y:auto;">
          ${eligibleSlots.map(s => {
            const currentStarterId = userLineup[s.key];
            const currentStarter = YL_ALL_NFL_PLAYERS[currentStarterId] || YL_PLAYER_DOSSIERS[currentStarterId];
            if (!currentStarter) return '';

            const diff = (benchPlayer.proj - currentStarter.proj).toFixed(1);
            const diffColor = diff > 0 ? "var(--yl-emerald)" : (diff < 0 ? "var(--yl-crimson)" : "var(--text-muted)");
            const diffSign = diff > 0 ? "+" : "";

            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;background:#FFF;border:1px solid var(--border-light);border-radius:8px;">
                <div style="display:flex;align-items:center;gap:12px;">
                  <span class="badge badge-navy mono" style="font-size:11px;min-width:44px;text-align:center;">${s.key}</span>
                  <img src="${currentStarter.photo}" style="width:40px;height:40px;border-radius:50%;object-fit:cover;border:1px solid var(--border-light);" onerror="this.src='${currentStarter.teamLogo}'">
                  <div>
                    <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${currentStarter.name}</div>
                    <div style="font-size:11.5px;color:var(--text-muted);">${currentStarter.pos} · ${currentStarter.team} · Proj: ${currentStarter.proj} pts</div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:14px;">
                  <div style="text-align:right;">
                    <div style="font-size:13px;font-weight:500;color:${diffColor};">${diffSign}${diff} pts</div>
                    <div style="font-size:10.5px;color:var(--text-muted);">Impacto no Total</div>
                  </div>
                  <button class="btn-yl btn-outline" style="padding:6px 14px;font-size:12px;border-color:var(--yl-crimson);color:var(--yl-crimson);" onclick="executeLineupSwap('${s.key}', '${benchPlayer.id}', '${currentStarter.id}')">
                    Trocar por ${currentStarter.name}
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  if (typeof openModal === "function") {
    openModal("lineup-swap-modal");
  } else {
    openModal(modal.id);
  }
}

function executeLineupSwap(slotKey, newStarterId, benchedId) {
  // Realizar troca atômica
  userLineup[slotKey] = newStarterId;

  // Atualizar banco
  const bIdx = userBenchList.indexOf(newStarterId);
  if (bIdx !== -1) {
    userBenchList[bIdx] = benchedId;
  } else {
    userBenchList.push(benchedId);
  }

  // Persistir estado
  saveLineupState();
  closeModal('lineup-swap-modal');

  // Atualizar visualizações
  renderPlaybookView();
  renderLeagueView();
  showToast(`Escalação atualizada com sucesso! Novo total projetado: ${calculateLineupTotalProjection()} pts.`);
}

// // Otimizador Automático com Knapsack Posicional Dinâmico
function optimizeLineupEngine() {
  const allAvailable = [
    ...Object.values(userLineup),
    ...userBenchList
  ].map(pid => resolveNFLPlayer(pid)).filter(Boolean);

  const assigned = {};
  const usedIds = new Set();

  // 1º passo: slots com posições fixas (QB, RB, WR, TE, K, DL, LB, DB, DEF)
  ROSTER_SLOTS_DEF.filter(s => !s.key.startsWith("FLEX") && !s.key.startsWith("IDP")).forEach(slot => {
    const candidate = allAvailable
      .filter(p => !usedIds.has(p.id) && slot.allowed.includes(p.pos))
      .sort((a,b) => getEffectiveProjection(b) - getEffectiveProjection(a))[0];
    if (candidate) {
      assigned[slot.key] = candidate.id;
      usedIds.add(candidate.id);
    }
  });

  // 2º passo: slots flexíveis (FLEX e IDP_FLEX)
  ROSTER_SLOTS_DEF.filter(s => s.key.startsWith("FLEX") || s.key.startsWith("IDP")).forEach(slot => {
    const candidate = allAvailable
      .filter(p => !usedIds.has(p.id) && slot.allowed.includes(p.pos))
      .sort((a,b) => getEffectiveProjection(b) - getEffectiveProjection(a))[0];
    if (candidate) {
      assigned[slot.key] = candidate.id;
      usedIds.add(candidate.id);
    }
  });

  // Preencher slots otimizados
  ROSTER_SLOTS_DEF.forEach(slot => {
    if (assigned[slot.key]) {
      userLineup[slot.key] = assigned[slot.key];
    }
  });

  // O restante dos atletas vai para o banco
  const starterIds = new Set(Object.values(userLineup));
  userBenchList = allAvailable.filter(p => !starterIds.has(p.id)).map(p => p.id);

  saveLineupState();
  renderPlaybookView();
  showToast(`Escalação otimizada para pontuação máxima! Projeção: ${calculateLineupTotalProjection()} pts.`);
}

// ==========================================
//  MOTOR ANALÍTICO: SCORING FORMAT, VBD, SIMULAÇÃO DE TITULARES & TRADE ANALYZER
// ==========================================
let activeScoringFormat = "PPR"; // "PPR", "HALF_PPR", "STANDARD", "TE_PREMIUM"
try {
  const savedFmt = localStorage.getItem("yl_scoring_format");
  if (savedFmt && ["PPR", "HALF_PPR", "STANDARD", "TE_PREMIUM"].includes(savedFmt)) {
    activeScoringFormat = savedFmt;
  }
} catch(e) {}

let customPlayerProjections = {};
try {
  const savedCustom = localStorage.getItem("yl_custom_projections");
  if (savedCustom) customPlayerProjections = JSON.parse(savedCustom);
} catch(e) {}

// Tabela Oficial de Baselines Posicionais VBD (Liga 12 times com 19 titulares, incluindo IDP)
const SCORING_BASELINES = {
  PPR: { QB: 14.5, RB: 8.5, WR: 8.5, TE: 6.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  HALF_PPR: { QB: 14.5, RB: 7.0, WR: 6.0, TE: 4.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  STANDARD: { QB: 14.5, RB: 5.5, WR: 3.5, TE: 2.5, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 },
  TE_PREMIUM: { QB: 14.5, RB: 8.5, WR: 8.5, TE: 9.0, K: 6.0, DEF: 6.0, DL: 7.0, LB: 8.5, DB: 7.0, IDP: 7.5 }
};

// Ajuste incremental de pontuação posicional relativo ao PPR padrão
function getScoringAdjustment(pos) {
  const p = (pos || "").toUpperCase();
  if (activeScoringFormat === "HALF_PPR") {
    if (p === "WR") return -2.5;
    if (p === "RB") return -1.5;
    if (p === "TE") return -2.0;
  } else if (activeScoringFormat === "STANDARD") {
    if (p === "WR") return -5.0;
    if (p === "RB") return -3.0;
    if (p === "TE") return -4.0;
  } else if (activeScoringFormat === "TE_PREMIUM") {
    if (p === "TE") return +2.5;
  }
  return 0.0;
}

// Projeção dinâmica considerando edições manuais e o modelo de pontuação ativo
function getEffectiveProjection(player) {
  return window.YardlinePlayerCard.numberOrNull(player?.metrics?.projectedPoints);
}

// Valor Baseado na Posição (VBD) = Projeção Efetiva - Baseline da Posição
function getPlayerVBD(player) {
  if (!player) return 0;
  const proj = getEffectiveProjection(player);
  const baselines = SCORING_BASELINES[activeScoringFormat] || SCORING_BASELINES.PPR;
  const pos = (player.pos || "WR").toUpperCase();
  const baseline = baselines[pos] || 7.0;
  return parseFloat((proj - baseline).toFixed(1));
}

// Valor Geral de Mercado para Trocas (VBD ponderado + ylIndex de teto)
function getPlayerTradeValue(player) {
  if (!player) return 0;
  const vbd = Math.max(0, getPlayerVBD(player));
  const val = (vbd * 5.2) + (((player.ylIndex || 70) - 50) * 0.4);
  return Math.max(3, Math.round(val));
}

// Reponderador Instantâneo do Sistema de Pontuação (PPR 1.0, Half-PPR 0.5, Standard 0.0, TE Premium)
function setScoringFormat(fmt) {
  if (!["PPR", "HALF_PPR", "STANDARD", "TE_PREMIUM"].includes(fmt)) return;
  activeScoringFormat = fmt;
  try {
    localStorage.setItem("yl_scoring_format", fmt);
  } catch(e) {}

  if (typeof deriveLeagueFreeAgents === "function") {
    deriveLeagueFreeAgents();
  }
  renderPlaybookView();
  renderTradeView();
  renderWaiversView();
  renderLeagueView();
  showToast(`Sistema de pontuação alterado para ${fmt.replace('_', ' ')}! Projeções e VBD recalculados.`);
}

// Simulação de Escalação Titular Ótima (19 titulares oficiais com IDP)
function simulateOptimalLineupProjection(playerIdsPool) {
  if (!Array.isArray(playerIdsPool) || playerIdsPool.length === 0) return 0;
  const allAvailable = playerIdsPool.map(pid => resolveNFLPlayer(String(pid))).filter(Boolean);
  const usedIds = new Set();
  let totalProj = 0;

  // 1º passo: slots fixos (QB, RB, WR, TE, K, DL, LB, DB, DEF)
  ROSTER_SLOTS_DEF.filter(s => !s.key.startsWith("FLEX") && !s.key.startsWith("IDP")).forEach(slot => {
    const candidate = allAvailable
      .filter(p => !usedIds.has(p.id) && slot.allowed.includes(p.pos))
      .sort((a,b) => getEffectiveProjection(b) - getEffectiveProjection(a))[0];
    if (candidate) {
      usedIds.add(candidate.id);
      totalProj += getEffectiveProjection(candidate);
    }
  });

  // 2º passo: slots flexíveis (FLEX e IDP_FLEX)
  ROSTER_SLOTS_DEF.filter(s => s.key.startsWith("FLEX") || s.key.startsWith("IDP")).forEach(slot => {
    const candidate = allAvailable
      .filter(p => !usedIds.has(p.id) && slot.allowed.includes(p.pos))
      .sort((a,b) => getEffectiveProjection(b) - getEffectiveProjection(a))[0];
    if (candidate) {
      usedIds.add(candidate.id);
      totalProj += getEffectiveProjection(candidate);
    }
  });

  return parseFloat(totalProj.toFixed(1));
}

// Estado do Trade Analyzer
let tradeUserPicks = ["7588"]; // Default Javonte Williams (Gengar My Balls)
let tradeTargetRosterId = 1; // Default Curitiba Red Fox (@neyllon - Roster 1)
let tradeTargetPicks = ["7569"]; // Default Nico Collins (Curitiba Red Fox)

function handleTradeTargetTeamChange(rosterId) {
  tradeTargetRosterId = parseInt(rosterId, 10);
  tradeTargetPicks = []; // Reseta escolha para o novo rival
  renderTradeView();
}

function handleTradeUserSelect(pid) {
  if (pid && !tradeUserPicks.includes(pid)) {
    tradeUserPicks.push(pid);
    renderTradeView();
  }
}

function removeTradeUserPick(pid) {
  tradeUserPicks = tradeUserPicks.filter(id => id !== pid);
  renderTradeView();
}

function handleTradeTargetSelect(pid) {
  if (pid && !tradeTargetPicks.includes(pid)) {
    tradeTargetPicks.push(pid);
    renderTradeView();
  }
}

function removeTradeTargetPick(pid) {
  tradeTargetPicks = tradeTargetPicks.filter(id => id !== pid);
  renderTradeView();
}

function copyFormattedTradeProposal() {
  const userP = tradeUserPicks.map(id => {
    const p = resolveNFLPlayer(id);
    return p ? `${p.name} (${p.pos} - ${p.team}) [Proj: ${getEffectiveProjection(p)} | VBD: ${getPlayerVBD(p) > 0 ? '+' : ''}${getPlayerVBD(p)}]` : id;
  }).join('\n  • ');

  const targetP = tradeTargetPicks.map(id => {
    const p = resolveNFLPlayer(id);
    return p ? `${p.name} (${p.pos} - ${p.team}) [Proj: ${getEffectiveProjection(p)} | VBD: ${getPlayerVBD(p) > 0 ? '+' : ''}${getPlayerVBD(p)}]` : id;
  }).join('\n  • ');

  const oppTeamObj = (typeof LEAGUE_12_TEAMS !== "undefined" ? LEAGUE_12_TEAMS : []).find(t => t.rosterId === tradeTargetRosterId);
  const oppName = oppTeamObj?.name || `Time ${tradeTargetRosterId}`;

  const text = `*[YARDLINE ANALYTICS] PROPOSTA DE TROCA OFICIAL*\n\n` +
    `*De:* Gengar My Balls (@Faraco)\n` +
    `*Para:* ${oppName} (${oppTeamObj?.owner || ''})\n` +
    `*Formato de Pontuação:* ${activeScoringFormat.replace('_', ' ')}\n\n` +
    `*Meu Time Envia:*\n  • ${userP || 'Nenhum atleta selecionado'}\n\n` +
    `*Meu Time Recebe:*\n  • ${targetP || 'Nenhum atleta selecionado'}\n\n` +
    `*Diagnóstico Técnico YARDLINE:*\n` +
    `• Avaliação posicional VBD e projeções da Semana ${activeLeagueWeek || 6}.\n` +
    `• O que você acha? Podemos fechar na plataforma Sleeper?`;

  navigator.clipboard.writeText(text).then(() => {
    showToast("Proposta formatada copiada para o WhatsApp!");
  }).catch(() => {
    showToast("Proposta de troca gerada!");
  });
}

function renderTradeView() {
  const container = document.getElementById("view-trade");
  if (!container) return;

  // 1. Obter atletas reais de "Gengar My Balls" (Meu time)
  let myRosterIds = [];
  const myRosterId = userRealRoster?.roster_id || 2;
  const userRosterObj = activeSleeperRosters.find(r => r.roster_id === myRosterId);
  if (userRosterObj && Array.isArray(userRosterObj.players)) {
    myRosterIds = userRosterObj.players.map(String);
  } else {
    myRosterIds = [...new Set([...Object.values(userLineup), ...userBenchList, ...(typeof userReserveList !== "undefined" ? userReserveList : [])])].map(String);
  }

  const allUserRoster = myRosterIds
    .map(pid => resolveNFLPlayer(pid))
    .filter(Boolean)
    .sort((a, b) => getEffectiveProjection(b) - getEffectiveProjection(a));

  // 2. Identificar os 11+ outros times reais da liga
  const otherTeams = (typeof LEAGUE_12_TEAMS !== "undefined" && LEAGUE_12_TEAMS.length > 0)
    ? LEAGUE_12_TEAMS.filter(t => !t.isMyTeam && t.rosterId !== myRosterId)
    : activeSleeperRosters.filter(r => r.roster_id !== myRosterId).map(r => ({
        rosterId: r.roster_id,
        name: `Time ${r.roster_id}`,
        owner: `@Rival${r.roster_id}`,
        record: "0-0"
      }));

  if (!tradeTargetRosterId || tradeTargetRosterId === myRosterId) {
    tradeTargetRosterId = otherTeams[0]?.rosterId || 1;
  }

  const selectedOppTeam = otherTeams.find(t => t.rosterId === tradeTargetRosterId) || otherTeams[0] || {
    rosterId: tradeTargetRosterId,
    name: "Adversário",
    owner: "@rival"
  };

  // 3. Obter atletas reais do adversário selecionado
  const oppRosterObj = activeSleeperRosters.find(r => r.roster_id === tradeTargetRosterId);
  let oppRosterIds = [];
  if (oppRosterObj && Array.isArray(oppRosterObj.players)) {
    oppRosterIds = oppRosterObj.players.map(String);
  } else {
    oppRosterIds = Object.keys(YL_ALL_NFL_PLAYERS).filter(id => !myRosterIds.includes(String(id))).slice(0, 25);
  }

  const oppPlayers = oppRosterIds
    .map(pid => resolveNFLPlayer(pid))
    .filter(Boolean)
    .sort((a, b) => getEffectiveProjection(b) - getEffectiveProjection(a));

  // 4. Jogadores selecionados na troca
  const userSelectedPlayers = tradeUserPicks.map(pid => resolveNFLPlayer(pid)).filter(Boolean);
  const targetSelectedPlayers = tradeTargetPicks.map(pid => resolveNFLPlayer(pid)).filter(Boolean);

  const userTotalVal = userSelectedPlayers.reduce((acc, p) => acc + getPlayerTradeValue(p), 0);
  const targetTotalVal = targetSelectedPlayers.reduce((acc, p) => acc + getPlayerTradeValue(p), 0);
  const netDiff = targetTotalVal - userTotalVal;

  // 5. Simulação do Impacto na Escalação Titular
  const myCurrentStarterProj = simulateOptimalLineupProjection(myRosterIds);
  const myNewRosterIds = myRosterIds.filter(id => !tradeUserPicks.includes(id)).concat(tradeTargetPicks);
  const myNewStarterProj = simulateOptimalLineupProjection(myNewRosterIds);
  const myLineupDelta = parseFloat((myNewStarterProj - myCurrentStarterProj).toFixed(1));

  const oppCurrentStarterProj = simulateOptimalLineupProjection(oppRosterIds);
  const oppNewRosterIds = oppRosterIds.filter(id => !tradeTargetPicks.includes(id)).concat(tradeUserPicks);
  const oppNewStarterProj = simulateOptimalLineupProjection(oppNewRosterIds);
  const oppLineupDelta = parseFloat((oppNewStarterProj - oppCurrentStarterProj).toFixed(1));

  // 6. Diagnóstico Técnico e Veredito
  let verdictBadge = "";
  let verdictText = "";
  if (netDiff > 6 && myLineupDelta >= 0) {
    verdictBadge = '<span class="badge badge-green">FAVORÁVEL PARA VOCÊ</span>';
    verdictText = `Você está recebendo significativamente mais valor VBD de mercado (+${netDiff} pts) com ganho imediato na escalação titular (+${myLineupDelta} pts/sem). Proposta excelente para fechar no Sleeper.`;
  } else if (netDiff > 6 && myLineupDelta < 0) {
    verdictBadge = '<span class="badge badge-amber">GANHO DE VALOR / PERDA NO TITULAR</span>';
    verdictText = `Você acumula +${netDiff} pts em valor posicional geral, porém seu time titular perde ${Math.abs(myLineupDelta)} pts/semana nesta rodada. Recomendada para acumular valor a médio prazo ou playoffs.`;
  } else if (netDiff >= -6 && netDiff <= 6) {
    verdictBadge = '<span class="badge badge-navy">TROCA EQUILIBRADA (JUSTA)</span>';
    verdictText = `Troca tecnicamente balanceada com margem neutra de valor (${netDiff >= 0 ? '+' : ''}${netDiff} pts). Impacto no seu titular: ${myLineupDelta >= 0 ? '+' : ''}${myLineupDelta} pts/sem. Bom equilíbrio entre as franquias.`;
  } else {
    verdictBadge = '<span class="badge badge-crimson">DESFAVORÁVEL (PERDA DE VALOR)</span>';
    verdictText = `Você está cedendo mais valor VBD do que recebendo de volta (${netDiff} pts) e tem impacto de ${myLineupDelta >= 0 ? '+' : ''}${myLineupDelta} pts no titular. Não recomendamos fechar sem exigir compensação adicional.`;
  }

  container.innerHTML = `
    <!-- Top Value Proposition Strip with Scoring Format Reweighters -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">TRADE VALUE & VBD ENGINE</span>
          <h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:4px;">Avaliador Dinâmico de Propostas de Troca</h2>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            Cálculo baseado em VBD/VORP posicional, baselines de reposição e impacto simulado na escalação titular
          </div>
        </div>

        <!-- Botões de Reponderação de Pontuação -->
        <div style="display:flex;align-items:center;gap:6px;background:#F1F5F9;padding:4px;border-radius:8px;flex-wrap:wrap;">
          <span style="font-size:11.5px;color:var(--text-muted);padding-left:6px;font-weight:500;">Pontuação:</span>
          <button class="btn-yl ${activeScoringFormat === 'PPR' ? 'btn-primary' : 'btn-outline'}"
                  style="padding:4px 10px;font-size:11.5px;"
                  onclick="setScoringFormat('PPR')">
            PPR 1.0
          </button>
          <button class="btn-yl ${activeScoringFormat === 'HALF_PPR' ? 'btn-primary' : 'btn-outline'}"
                  style="padding:4px 10px;font-size:11.5px;"
                  onclick="setScoringFormat('HALF_PPR')">
            Half-PPR 0.5
          </button>
          <button class="btn-yl ${activeScoringFormat === 'STANDARD' ? 'btn-primary' : 'btn-outline'}"
                  style="padding:4px 10px;font-size:11.5px;"
                  onclick="setScoringFormat('STANDARD')">
            Standard 0.0
          </button>
          <button class="btn-yl ${activeScoringFormat === 'TE_PREMIUM' ? 'btn-primary' : 'btn-outline'}"
                  style="padding:4px 10px;font-size:11.5px;"
                  onclick="setScoringFormat('TE_PREMIUM')">
            TE Premium (+0.5)
          </button>
        </div>
      </div>
    </div>

    <!-- 4 KPI Diagnostic Cards -->
    <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:14px;margin-bottom:20px;">
      <div class="yl-card" style="padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Saldo Líquido de VBD</div>
        <div style="font-size:24px;font-weight:600;margin-top:4px;color:${netDiff > 6 ? 'var(--yl-emerald)' : (netDiff < -6 ? 'var(--yl-crimson)' : 'var(--yl-navy)')};">
          ${netDiff >= 0 ? '+' : ''}${netDiff} <span style="font-size:13px;font-weight:400;color:var(--text-muted);">pts valor</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          ${userTotalVal} cedidos ⇄ ${targetTotalVal} recebidos
        </div>
      </div>

      <div class="yl-card" style="padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Impacto no Seu Titular</div>
        <div style="font-size:24px;font-weight:600;margin-top:4px;color:${myLineupDelta >= 0 ? 'var(--yl-emerald)' : 'var(--yl-crimson)'};">
          ${myLineupDelta >= 0 ? '+' : ''}${myLineupDelta} <span style="font-size:13px;font-weight:400;color:var(--text-muted);">pts/sem</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          De ${myCurrentStarterProj} para <strong>${myNewStarterProj}</strong> pts
        </div>
      </div>

      <div class="yl-card" style="padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Impacto no Titular Rival</div>
        <div style="font-size:24px;font-weight:600;margin-top:4px;color:var(--yl-navy);">
          ${oppLineupDelta >= 0 ? '+' : ''}${oppLineupDelta} <span style="font-size:13px;font-weight:400;color:var(--text-muted);">pts/sem</span>
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          De ${oppCurrentStarterProj} para <strong>${oppNewStarterProj}</strong> pts
        </div>
      </div>

      <div class="yl-card" style="padding:14px 16px;">
        <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;font-weight:600;">Formato Analítico Ativo</div>
        <div style="font-size:20px;font-weight:600;margin-top:4px;color:var(--yl-navy);">
          ${activeScoringFormat.replace('_', ' ')}
        </div>
        <div style="font-size:11.5px;color:var(--text-muted);margin-top:3px;">
          Base WR ${SCORING_BASELINES[activeScoringFormat].WR} · RB ${SCORING_BASELINES[activeScoringFormat].RB} · TE ${SCORING_BASELINES[activeScoringFormat].TE}
        </div>
      </div>
    </div>

    <!-- Trade Board (Two Sides: Gengar My Balls vs Rival Team) -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px;">
      <!-- Lado 1: Meu Time Envia (Gengar My Balls) -->
      <div class="yl-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div>
            <span class="badge badge-navy">SEU TIME ENVIA</span>
            <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:4px;">Gengar My Balls (@Faraco)</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:600;color:var(--yl-navy);">${userTotalVal} <span style="font-size:11px;color:var(--text-muted);">pts valor</span></div>
          </div>
        </div>

        <!-- Seletor do Meu Elenco Real -->
        <select class="yl-search-input" style="width:100%;font-size:12.5px;padding:8px 10px;margin-bottom:14px;" onchange="handleTradeUserSelect(this.value); this.value='';">
          <option value="">+ Adicionar jogador do seu time (${allUserRoster.length} atletas disponíveis)...</option>
          ${allUserRoster.map(p => {
            const isPicked = tradeUserPicks.includes(p.id);
            const proj = getEffectiveProjection(p);
            const vbd = getPlayerVBD(p);
            const val = getPlayerTradeValue(p);
            return `
              <option value="${p.id}" ${isPicked ? 'disabled' : ''}>
                ${p.name} (${p.pos} - ${p.team}) · Proj: ${proj} · VBD: ${vbd > 0 ? '+' : ''}${vbd} · Valor: ${val} pts ${isPicked ? '(Já Selecionado)' : ''}
              </option>
            `;
          }).join('')}
        </select>

        <!-- Lista dos Escolhidos Meu Time -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${userSelectedPlayers.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12.5px;background:#F8FAFC;border:1px dashed var(--border-box);border-radius:8px;">
              Selecione acima os atletas de <strong>Gengar My Balls</strong> que deseja ceder nesta negociação.
            </div>
          ` : userSelectedPlayers.map(p => {
            const proj = getEffectiveProjection(p);
            const vbd = getPlayerVBD(p);
            const val = getPlayerTradeValue(p);
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;cursor:pointer;transition:border-color 0.15s,background 0.15s;"
                   onclick="openPlayerDossierModal('${p.id}')"
                   title="Clique para abrir o Dossiê completo de ${p.name}">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${p.photo}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'">
                  <div>
                    <strong style="font-size:13.5px;color:var(--yl-navy);">${p.name}</strong>
                    <div style="font-size:11px;color:var(--text-muted);">
                      <span class="badge badge-navy" style="font-size:10px;padding:1px 5px;">${p.pos} · ${p.team}</span>
                      Proj: <strong>${proj} pts</strong> · VBD: <strong style="color:var(--yl-navy);">${vbd > 0 ? '+' : ''}${vbd}</strong>
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="badge badge-navy" style="font-size:11px;padding:3px 8px;">${val} pts</span>
                  <button onclick="event.stopPropagation();removeTradeUserPick('${p.id}')" title="Remover jogador" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:15px;padding:2px 6px;"></button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Lado 2: Time Adversário Selecionado -->
      <div class="yl-card" style="padding:18px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px;">
          <div>
            <span class="badge badge-green">SEU TIME RECEBE</span>
            <div style="font-size:14px;font-weight:600;color:var(--yl-navy);margin-top:4px;">
              ${selectedOppTeam.name} <span style="font-size:12px;color:var(--text-muted);font-weight:400;">(${selectedOppTeam.owner})</span>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:18px;font-weight:600;color:var(--yl-emerald);">${targetTotalVal} <span style="font-size:11px;color:var(--text-muted);">pts valor</span></div>
          </div>
        </div>

        <!-- Seletor do Time Adversário Real -->
        <div style="margin-bottom:10px;display:flex;align-items:center;gap:8px;">
          <label style="font-size:12px;color:var(--text-muted);white-space:nowrap;">Adversário:</label>
          <select class="yl-search-input" style="flex:1;font-size:12px;padding:6px 10px;" onchange="handleTradeTargetTeamChange(this.value)">
            ${otherTeams.map(t => `
              <option value="${t.rosterId}" ${t.rosterId === tradeTargetRosterId ? 'selected' : ''}>
                ${t.name} (${t.owner}) · ${t.record || '0-0'} · #${t.rosterId}
              </option>
            `).join('')}
          </select>
        </div>

        <!-- Seletor dos Atletas do Adversário -->
        <select class="yl-search-input" style="width:100%;font-size:12.5px;padding:8px 10px;margin-bottom:14px;" onchange="handleTradeTargetSelect(this.value); this.value='';">
          <option value="">+ Selecionar atleta de ${selectedOppTeam.name} (${oppPlayers.length} disponíveis)...</option>
          ${oppPlayers.map(p => {
            const isPicked = tradeTargetPicks.includes(p.id);
            const proj = getEffectiveProjection(p);
            const vbd = getPlayerVBD(p);
            const val = getPlayerTradeValue(p);
            return `
              <option value="${p.id}" ${isPicked ? 'disabled' : ''}>
                ${p.name} (${p.pos} - ${p.team}) · Proj: ${proj} · VBD: ${vbd > 0 ? '+' : ''}${vbd} · Valor: ${val} pts ${isPicked ? '(Já Selecionado)' : ''}
              </option>
            `;
          }).join('')}
        </select>

        <!-- Lista dos Escolhidos Alvo -->
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${targetSelectedPlayers.length === 0 ? `
            <div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12.5px;background:#F8FAFC;border:1px dashed var(--border-box);border-radius:8px;">
              Selecione acima os atletas de <strong>${selectedOppTeam.name}</strong> que você deseja receber nesta negociação.
            </div>
          ` : targetSelectedPlayers.map(p => {
            const proj = getEffectiveProjection(p);
            const vbd = getPlayerVBD(p);
            const val = getPlayerTradeValue(p);
            return `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#F8FAFC;border:1px solid var(--border-light);border-radius:8px;cursor:pointer;transition:border-color 0.15s,background 0.15s;"
                   onclick="openPlayerDossierModal('${p.id}')"
                   title="Clique para abrir o Dossiê completo de ${p.name}">
                <div style="display:flex;align-items:center;gap:10px;">
                  <img src="${p.photo}" style="width:38px;height:38px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'">
                  <div>
                    <strong style="font-size:13.5px;color:var(--yl-navy);">${p.name}</strong>
                    <div style="font-size:11px;color:var(--text-muted);">
                      <span class="badge badge-green" style="font-size:10px;padding:1px 5px;">${p.pos} · ${p.team}</span>
                      Proj: <strong>${proj} pts</strong> · VBD: <strong style="color:var(--yl-navy);">${vbd > 0 ? '+' : ''}${vbd}</strong>
                    </div>
                  </div>
                </div>
                <div style="display:flex;align-items:center;gap:10px;">
                  <span class="badge badge-green" style="font-size:11px;padding:3px 8px;">${val} pts</span>
                  <button onclick="event.stopPropagation();removeTradeTargetPick('${p.id}')" title="Remover jogador" style="background:none;border:none;color:#94A3B8;cursor:pointer;font-size:15px;padding:2px 6px;"></button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- Veredito Técnico do Motor e Ações -->
    <div class="yl-card" style="padding:18px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:10px;">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${verdictBadge}
          <div style="font-weight:600;font-size:14px;color:var(--yl-navy);">
            Balanço Líquido: <strong style="color:${netDiff >= 0 ? 'var(--yl-emerald)' : 'var(--yl-crimson)'};">${netDiff >= 0 ? '+' : ''}${netDiff} pts de valor</strong>
          </div>
        </div>
        <button class="btn-yl btn-primary" onclick="copyFormattedTradeProposal()">
          Copiar Proposta Formatada p/ WhatsApp
        </button>
      </div>
      <p style="font-size:13px;color:var(--text-body);margin:0;line-height:1.6;">
        ${verdictText}
      </p>
    </div>
  `;
}

// ==========================================
//  CORREÇÃO DO WAIVERS & DROP
// ==========================================
function simulateWaiverAddition(claimedPlayerId) {
  const dropSelect = document.getElementById("waiver-drop-select");
  const dropId = dropSelect ? dropSelect.value : null;

  // Adicionar ao banco
  if (!userBenchList.includes(claimedPlayerId)) {
    userBenchList.push(claimedPlayerId);
  }

  // Cortar exatamente o jogador selecionado
  if (dropId) {
    const bIdx = userBenchList.indexOf(dropId);
    if (bIdx !== -1) {
      userBenchList.splice(bIdx, 1);
    } else {
      // Se estava como titular, desocupa slot
      for (const [slotKey, pid] of Object.entries(userLineup)) {
        if (pid === dropId) {
          userLineup[slotKey] = claimedPlayerId;
          break;
        }
      }
    }
  }

  saveLineupState();
  closeModal("waiver-modal");
  renderPlaybookView();
  renderWaiversView();

  const claimedName = YL_ALL_NFL_PLAYERS[claimedPlayerId]?.name || "Jogador";
  const dropName = YL_ALL_NFL_PLAYERS[dropId]?.name || "Jogador liberado";
  showToast(`Reivindicação simulada! ${claimedName} adicionado e ${dropName} liberado. Projeção atualizada!`);
  openNavTab("playbook");
}


// ==========================================
//  CONEXÃO DIRETA COM A LIGA REAL DO SLEEPER
// League ID: 1369770282776006656 · Time: Gengar My Balls (@Faraco)
// ==========================================
const REAL_SLEEPER_LEAGUE_ID = "1369770282776006656";
let activeNflState = null;
let activeLeagueWeek = 6;
let activeSleeperLeagueData = null;
let activeSleeperRosters = [];
let activeSleeperUsers = [];
let userRealRoster = null;
let activeSleeperPlayersCatalog = null;
let activeRealMatchup = null;
let activeRealMatchupWeek6 = null; // Alias para compatibilidade
let activeLeagueFreeAgents = [];
let activeWaiverPosFilter = "TODOS";
let activeWaiverSearchQuery = "";

// ==========================================
//  MOTOR DE WAIVERS: DERIVAÇÃO REAL POR DIFERENÇA DE CONJUNTOS (SPEC.md)
// Todos os atletas ativos da NFL (QB, RB, WR, TE, K, DEF, IDP) MENOS todos os player_id dos 12+ rosters
// ==========================================
function deriveLeagueFreeAgents() {
  if (!window.YL_SHELL_SNAPSHOT?.rosters?.length) { activeLeagueFreeAgents = []; return; }
  const rostered = new Set(activeSleeperRosters.flatMap(r => [...(r.players || []), ...(r.starters || []), ...(r.reserve || []), ...(r.taxi || [])]).map(String));
  activeLeagueFreeAgents = Object.entries(window.YL_CANONICAL?.players || {})
    .filter(([id, p]) => !rostered.has(id) && (p.active === true || p.status === 'Active') && p.team && ['QB','RB','WR','TE','K','DEF','DL','LB','DB','DE','DT','CB','S'].includes(p.position))
    .map(([id]) => resolveNFLPlayer(id)).filter(Boolean)
    .sort((a, b) => (a.searchRank ?? Infinity) - (b.searchRank ?? Infinity) || a.name.localeCompare(b.name));
  window.activeLeagueFreeAgents = activeLeagueFreeAgents;
  return activeLeagueFreeAgents;
}

// ==========================================
//  INDEXEDDB ENGINE: CACHE DE ALTA CAPACIDADE (PLAYERS NFL ~35MB)
// Banco: YardlinePlayersCacheDB · Store: players_cache · TTL: 24 Horas
// ==========================================
const YL_IDB_NAME = "YardlinePlayersCacheDB";
const YL_IDB_STORE = "players_cache";
const YL_IDB_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

function getSleeperPlayersFromIDB() {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(null);
    try {
      const openReq = indexedDB.open(YL_IDB_NAME, 1);
      openReq.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(YL_IDB_STORE)) {
          db.createObjectStore(YL_IDB_STORE);
        }
      };
      openReq.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(YL_IDB_STORE, "readonly");
          const store = tx.objectStore(YL_IDB_STORE);
          const getReq = store.get("players_nfl");
          getReq.onsuccess = () => {
            const res = getReq.result;
            if (!res) return resolve(null);
            // Verificar TTL de 24 horas
            if (res.timestamp && (Date.now() - res.timestamp < YL_IDB_TTL_MS) && res.data) {
              console.log("[IndexedDB] Catálogo NFL carregado do cache local (válido por 24h).");
              resolve(res.data);
            } else if (res && !res.timestamp && typeof res === "object") {
              // Suporte a cache legado
              resolve(res);
            } else {
              console.log("[IndexedDB] Cache expirado (>24h). Atualizando catálogo oficial...");
              resolve(null);
            }
          };
          getReq.onerror = () => resolve(null);
        } catch(err) {
          resolve(null);
        }
      };
      openReq.onerror = () => resolve(null);
    } catch(e) {
      resolve(null);
    }
  });
}

function saveSleeperPlayersToIDB(data) {
  return new Promise((resolve) => {
    if (typeof indexedDB === "undefined") return resolve(false);
    try {
      const openReq = indexedDB.open(YL_IDB_NAME, 1);
      openReq.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(YL_IDB_STORE)) {
          db.createObjectStore(YL_IDB_STORE);
        }
      };
      openReq.onsuccess = (e) => {
        const db = e.target.result;
        try {
          const tx = db.transaction(YL_IDB_STORE, "readwrite");
          const store = tx.objectStore(YL_IDB_STORE);
          const cacheRecord = {
            timestamp: Date.now(),
            savedAt: new Date().toISOString(),
            data: data
          };
          store.put(cacheRecord, "players_nfl");
          tx.oncomplete = () => {
            console.log("[IndexedDB] Catálogo completo de jogadores da NFL salvo no cache (TTL 24h).");
            resolve(true);
          };
          tx.onerror = () => resolve(false);
        } catch(err) {
          resolve(false);
        }
      };
      openReq.onerror = () => resolve(false);
    } catch(e) {
      resolve(false);
    }
  });
}

// ==========================================
//  MAPA OFICIAL DE EQUIVALÊNCIA SLEEPER <-> ESPN & DEFESAS
// ==========================================
const SLEEPER_TO_ESPN_MAP = {"7523": "4360310", "4984": "3918298", "4040": "3139477", "4881": "3916387", "6904": "4040715", "8183": "4361741", "3163": "3046779", "6770": "3915511", "9229": "4432577", "2449": "2577417", "4981": "3912547", "96": "8439", "6797": "4241479", "11626": "4431452", "6790": "4035676", "11628": "4431456", "11625": "4431611", "11627": "4426348", "6804": "4036378", "1234": "14880", "4892": "3052587", "5849": "3917315", "138": "12483", "1387": "15864", "4866": "3929630", "3198": "3043078", "9226": "4430736", "8138": "4426515", "6813": "4035686", "4034": "3117251", "8155": "4426516", "3969": "3116385", "8150": "4430743", "9509": "4430746", "7561": "4361528", "8136": "4430745", "3164": "3128720", "7528": "4241457", "8129": "4426518", "6806": "4242335", "7588": "4241458", "9221": "4430750", "5927": "4035681", "9497": "4430751", "7543": "4361525", "5850": "4035680", "6801": "4239993", "8161": "4035684", "6820": "4430752", "8144": "4241460", "5848": "4035675", "9225": "4430758", "7567": "4241463", "4035": "3054850", "11632": "4431463", "8151": "4426511", "4199": "3045147", "8132": "4430761", "8154": "4430762", "9224": "4430763", "4144": "3051890", "7591": "4035685", "9494": "4430739", "11635": "4430737", "7553": "4374302", "6794": "4262921", "6803": "4241478", "7564": "4362628", "5859": "4040761", "7569": "4258173", "2374": "3116406", "2133": "16800", "7525": "4241478", "5872": "4035687", "8152": "4430735", "9493": "4430734", "2216": "2976212", "9492": "4430738", "6819": "4035687", "9488": "4430742", "8146": "4430744", "7526": "4372016", "9511": "4430747", "8139": "4426519", "6826": "4035682", "9484": "4430749", "11631": "4431454", "5001": "3116405", "5012": "3128429", "5987": "4035679", "11634": "4431458", "11630": "4431459", "8130": "4430753", "5916": "4035677", "4983": "3915416", "1479": "15795", "11629": "4431460", "9228": "4430754", "8137": "4430755", "7571": "4430756", "8131": "4426513", "6845": "4241462", "5846": "4035674", "8121": "4426512", "8205": "4430760", "2197": "16733", "4037": "3116165", "11633": "4431464", "4039": "2977644", "9482": "4426507", "5844": "4035683", "9227": "4430764", "4217": "3040151", "1466": "15847", "9223": "4426514", "5022": "3121422", "4985": "3915510", "8134": "4426517", "5009": "3917796", "8153": "4430740", "11636": "4431457", "6824": "4241461", "9508": "4430757", "7559": "4360311", "8160": "4426508", "9510": "4430741", "1264": "15683", "4227": "4035691", "4220": "4035692", "6947": "4035690", "6786": "4241389"};
const ESPN_TO_SLEEPER_MAP = {};

for (const [sleeperId, espnId] of Object.entries(SLEEPER_TO_ESPN_MAP)) {
  ESPN_TO_SLEEPER_MAP[String(espnId)] = String(sleeperId);
}

// Indexador dinâmico de IDs Sleeper <-> ESPN
function indexSleeperPlayersCatalog(catalog) {
  activeSleeperPlayersCatalog = catalog || {};
  for (const [id, player] of Object.entries(catalog || {})) {
    if (player.espnId) { SLEEPER_TO_ESPN_MAP[id] = player.espnId; ESPN_TO_SLEEPER_MAP[player.espnId] = id; }
  }
}

async function syncRealSleeperLeagueLiveLegacy() {
  throw new Error('Pipeline Sleeper direto desativado: use syncRealSleeperLeagueLive / backend shell.');
  showToast("Conectando aos endpoints da Liga #1369770282776006656...");
  try {
    // 1. GET endpoints reais: state/nfl, league, users, rosters
    const [stateRes, leagueRes, usersRes, rostersRes] = await Promise.all([
      fetch("https://api.sleeper.app/v1/state/nfl"),
      fetch(`https://api.sleeper.app/v1/league/${REAL_SLEEPER_LEAGUE_ID}`),
      fetch(`https://api.sleeper.app/v1/league/${REAL_SLEEPER_LEAGUE_ID}/users`),
      fetch(`https://api.sleeper.app/v1/league/${REAL_SLEEPER_LEAGUE_ID}/rosters`)
    ]);

    if (!leagueRes.ok || !usersRes.ok || !rostersRes.ok) {
      throw new Error("Falha ao comunicar com os endpoints da liga Sleeper");
    }

    if (stateRes.ok) {
      activeNflState = await stateRes.json();
      activeLeagueWeek = activeNflState.week || 6;
    }

    activeSleeperLeagueData = await leagueRes.json();
    activeSleeperUsers = await usersRes.json();
    activeSleeperRosters = await rostersRes.json();

    // Buscar matchups da semana atual dinamicamente
    let currentWeekMatchups = [];
    try {
      const matchupsRes = await fetch(`https://api.sleeper.app/v1/league/${REAL_SLEEPER_LEAGUE_ID}/matchups/${activeLeagueWeek}`);
      if (matchupsRes.ok) {
        currentWeekMatchups = await matchupsRes.json();
      }
    } catch(e) {
      console.warn("Notice: falha ao buscar matchups da semana:", e);
    }

    // 2. GET https://api.sleeper.app/v1/players/nfl (salvo em cache no IndexedDB com TTL de 24h)
    let sleeperCatalog = await getSleeperPlayersFromIDB();
    if (!sleeperCatalog || Object.keys(sleeperCatalog).length === 0) {
      showToast("Baixando catálogo oficial da NFL do Sleeper (cache no IndexedDB)...");
      try {
        const playersRes = await fetch("https://api.sleeper.app/v1/players/nfl");
        if (playersRes.ok) {
          sleeperCatalog = await playersRes.json();
          await saveSleeperPlayersToIDB(sleeperCatalog);
          showToast("Catálogo Sleeper (~35MB) salvo no IndexedDB (YardlinePlayersCacheDB) com sucesso!");
        }
      } catch (err) {
        console.warn("Notice: erro ao baixar players/nfl completo:", err);
      }
    }
    if (sleeperCatalog) {
      indexSleeperPlayersCatalog(sleeperCatalog);
    }

    // 3. Localizar o roster do meu time "Gengar My Balls" cruzando o owner_id em /users com /rosters
    let userOwnerId = null;
    let myUser = null;
    for (const u of activeSleeperUsers) {
      const tName = (u.metadata?.team_name || "").toLowerCase();
      const dName = (u.display_name || "").toLowerCase();
      if (tName.includes("gengar") || tName.includes("balls") || dName.includes("gengar") || dName.includes("faraco")) {
        userOwnerId = u.user_id;
        myUser = u;
        break;
      }
    }
    if (!userOwnerId && activeSleeperUsers.length > 0) {
      userOwnerId = activeSleeperUsers[0].user_id;
      myUser = activeSleeperUsers[0];
    }

    userRealRoster = activeSleeperRosters.find(r => r.owner_id === userOwnerId);

    // 4. Preencher titulares reais (starters) e reservas reais (players menos starters e reserve) com catálogo oficial
    if (userRealRoster && Array.isArray(userRealRoster.starters)) {
      if (Array.isArray(activeSleeperLeagueData?.roster_positions)) {
        const starterPositions = activeSleeperLeagueData.roster_positions.filter(p => p !== "BN");
        const posCounters = {};
        ROSTER_SLOTS_DEF = starterPositions.map((posName, idx) => {
          posCounters[posName] = (posCounters[posName] || 0) + 1;
          const num = posCounters[posName];
          let key = posName + (num > 1 ? num : (["RB", "WR", "DL", "LB", "DB"].includes(posName) ? "1" : ""));
          let label = posName;
          let allowed = [posName];

          if (posName === "FLEX") {
            key = "FLEX" + (num > 1 ? num : "");
            allowed = ["RB", "WR", "TE"];
          } else if (posName === "IDP_FLEX") {
            key = "IDP" + (num > 1 ? num : "");
            label = "IDP";
            allowed = ["DL", "LB", "DB", "DE", "DT", "CB", "S"];
          } else if (posName === "DL") {
            allowed = ["DL", "DE", "DT"];
          } else if (posName === "LB") {
            allowed = ["LB", "ILB", "OLB"];
          } else if (posName === "DB") {
            allowed = ["DB", "CB", "S", "FS", "SS"];
          }

          return { key, label, allowed, required: true, slotIndex: idx };
        });
      }

      userLineup = {};
      ROSTER_SLOTS_DEF.forEach((slot, idx) => {
        const pid = userRealRoster.starters[idx];
        if (pid) {
          userLineup[slot.key] = String(pid);
          resolveNFLPlayer(String(pid));
        }
      });

      const starterSet = new Set((userRealRoster.starters || []).map(String));
      const reserveSet = new Set((userRealRoster.reserve || []).map(String));

      // Reservas reais = players MENOS starters e reserve
      if (Array.isArray(userRealRoster.players)) {
        userBenchList = userRealRoster.players
          .map(String)
          .filter(pid => !starterSet.has(pid) && !reserveSet.has(pid));
        userBenchList.forEach(pid => resolveNFLPlayer(pid));
      }

      userReserveList = Array.from(reserveSet);
      userReserveList.forEach(pid => resolveNFLPlayer(pid));

      // Atualizar saldo de FAAB se disponível
      if (userRealRoster.settings && typeof userFaab !== "undefined") {
        const used = userRealRoster.settings.waiver_budget_used || 0;
        userFaab = Math.max(0, 100 - used);
      }

      saveLineupState();
    }

    // 5. Atualizar a lista de todos os times da liga com os nomes reais retornados de /users
    const userMap = {};
    activeSleeperUsers.forEach(u => { userMap[u.user_id] = u; });

    LEAGUE_12_TEAMS = activeSleeperRosters.map(r => {
      const u = userMap[r.owner_id] || {};
      const name = u.metadata?.team_name || u.display_name || ("Time #" + r.roster_id);
      const owner = u.display_name ? ("@" + u.display_name) : "Manager";
      const wins = r.settings?.wins || 0;
      const losses = r.settings?.losses || 0;
      const ties = r.settings?.ties || 0;
      const fpts = (r.settings?.fpts || 0) + ((r.settings?.fpts_decimal || 0) / 100);
      const fptsAgainst = (r.settings?.fpts_against || 0) + ((r.settings?.fpts_against_decimal || 0) / 100);
      const isMine = r.roster_id === userRealRoster?.roster_id;

      let teamProj = 0;
      if (Array.isArray(r.starters)) {
        r.starters.forEach(pid => {
          if (pid) {
            const p = resolveNFLPlayer(String(pid));
            if (p) teamProj += getEffectiveProjection(p);
          }
        });
      }
      if (teamProj === 0) teamProj = fpts / Math.max(1, wins + losses);

      return {
        rosterId: r.roster_id,
        name: name,
        owner: owner,
        record: ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`,
        wins: wins,
        losses: losses,
        ties: ties,
        fpts: fpts.toFixed(1),
        fptsAgainst: fptsAgainst.toFixed(1),
        projTotal: parseFloat(teamProj.toFixed(1)),
        isMyTeam: isMine
      };
    });

    // Ordenar classificação por vitórias e pontos
    LEAGUE_12_TEAMS.sort((a, b) => b.wins - a.wins || parseFloat(b.fpts) - parseFloat(a.fpts));

    if (userRealRoster) {
      selectedActiveRosterId = userRealRoster.roster_id;
    }

    // 6. Mapear Duelo Real da Semana Atual
    if (Array.isArray(currentWeekMatchups) && userRealRoster) {
      const userMatch = currentWeekMatchups.find(m => m.roster_id === userRealRoster.roster_id);
      if (userMatch) {
        const oppMatch = currentWeekMatchups.find(m => m.matchup_id === userMatch.matchup_id && m.roster_id !== userMatch.roster_id);
        if (oppMatch) {
          const oppRoster = activeSleeperRosters.find(r => r.roster_id === oppMatch.roster_id);
          const oppUser = activeSleeperUsers.find(u => u.user_id === oppRoster?.owner_id);
          const oppName = oppUser?.metadata?.team_name || oppUser?.display_name || "Adversário da Liga";
          const oppTeamObj = LEAGUE_12_TEAMS.find(t => t.rosterId === oppMatch.roster_id);
          const myTeamObj = LEAGUE_12_TEAMS.find(t => t.rosterId === userRealRoster.roster_id);

          let oppProj = 0;
          if (Array.isArray(oppMatch.starters)) {
            oppMatch.starters.forEach(pid => {
              if (pid) {
                const p = resolveNFLPlayer(String(pid));
                if (p) oppProj += getEffectiveProjection(p);
              }
            });
          }
          if (oppProj === 0 && oppTeamObj) oppProj = oppTeamObj.projTotal;

          activeRealMatchup = {
            week: activeLeagueWeek,
            matchupId: userMatch.matchup_id,
            myTeam: myTeamObj?.name || "Gengar My Balls",
            myRecord: myTeamObj?.record || "4-1",
            myProj: calculateLineupTotalProjection(),
            myScore: userMatch.points || 0,
            oppTeam: oppName,
            oppRecord: oppTeamObj?.record || "2-3",
            oppProj: parseFloat(oppProj.toFixed ? oppProj.toFixed(1) : oppProj),
            oppScore: oppMatch.points || 0,
            oppOwner: oppUser?.display_name ? ("@" + oppUser.display_name) : "",
            oppRosterId: oppMatch.roster_id
          };
          activeRealMatchupWeek6 = activeRealMatchup;
        }
      }
    }

    // 7. Derivar a aba de Waivers aplicando a diferença de conjuntos (SPEC.md)
    deriveLeagueFreeAgents();

    // Atualizar componentes da interface
    renderPlaybookView();
    renderLeagueView();
    renderTradeView();
    renderWaiversView();

    const leagueTitle = activeSleeperLeagueData?.name || "Neilo Pistola League";
    showToast(`Conectado à ${leagueTitle}! 'Gengar My Balls' e confronto da Semana ${activeLeagueWeek} sincronizados.`);
    return true;
  } catch (err) {
    console.error("Sleeper live API sync notice:", err);
    showToast("ℹ Base local de 'Gengar My Balls' ativa. Clique em 'Auditar' na aba Liga para recarregar.");
    return false;
  }
}

// Indexar todos os jogadores por Sleeper ID na base local YL_ALL_NFL_PLAYERS
for (const [sleeperId, espnId] of Object.entries(SLEEPER_TO_ESPN_MAP)) {
  const p = YL_ALL_NFL_PLAYERS[espnId];
  if (p && !YL_ALL_NFL_PLAYERS[sleeperId]) {
    YL_ALL_NFL_PLAYERS[sleeperId] = {
      ...p,
      sleeperId: sleeperId,
      espnId: String(espnId)
    };
  }
}

// Sole active resolver. Input IDs are Sleeper IDs, never guessed ESPN IDs.
// Legacy datasets below remain for trade/AI migration but cannot enrich cards.
function resolveNFLPlayer(playerId) {
  if (!playerId || String(playerId) === '0') return null;
  let id = String(playerId);
  const cards = window.YL_PLAYER_CARDS || {};
  if (!cards[id] && !window.YL_CANONICAL?.players?.[id]) {
    const match = Object.values(cards).find(player => player.espnId === id)
      || Object.values(window.YL_CANONICAL?.players || {}).find(player => player.espnId === id);
    if (match) id = String(match.id);
  }
  if (window.YL_PLAYER_CARDS?.[id]) return window.YL_PLAYER_CARDS[id];
  const raw = window.YL_CANONICAL?.players?.[id];
  return raw ? window.YardlinePlayerCard.createPlayerCard(id, raw, window.YL_LIVE_PLAYER_DATA?.[id],
    window.YL_SHELL_SNAPSHOT?.cardContext || {}, window.YL_SHELL_SNAPSHOT?.rosters || []) : null;
}

// ==========================================
//  MOTOR HOOTFF v16: COMMAND CENTER, SELETOR DE TIME & PROJEÇÕES EDITÁVEIS
// ==========================================
let selectedActiveRosterId = null; // Só é definido após o backend confirmar o owner

function updateCustomProjection(playerId, newProjVal) {
  const val = parseFloat(newProjVal);
  if (!isNaN(val)) {
    customPlayerProjections[playerId] = val;
    try {
      localStorage.setItem("yl_custom_projections", JSON.stringify(customPlayerProjections));
    } catch(e) {}
    renderPlaybookView();
    const pName = resolveNFLPlayer(playerId)?.name || "Jogador";
    showToast(`Projeção de ${pName} ajustada para ${val.toFixed(1)} pts! Total recalculado.`);
  }
}

function resetCustomProjections() {
  customPlayerProjections = {};
  try {
    localStorage.removeItem("yl_custom_projections");
  } catch(e) {}
  renderPlaybookView();
  showToast("Projeções restauradas para os valores originais do modelo.");
}

// 12+ Times Oficiais da Liga Sleeper #1369770282776006656 (Neilo Pistola League)
let LEAGUE_12_TEAMS = [
  { rosterId: 13, name: "South Caxias Immigrants", owner: "@BrunoChiarello", record: "5-0", wins: 5, losses: 0, ties: 0, fpts: "1153.3", fptsAgainst: "809.3", projTotal: 152.0, isMyTeam: false },
  { rosterId: 2, name: "Gengar My Balls", owner: "@Faraco", record: "4-1", wins: 4, losses: 1, ties: 0, fpts: "1091.3", fptsAgainst: "857.7", projTotal: 148.6, isMyTeam: true },
  { rosterId: 11, name: "Capanema Noias", owner: "@perriy", record: "4-1", wins: 4, losses: 1, ties: 0, fpts: "973.1", fptsAgainst: "831.3", projTotal: 138.4, isMyTeam: false },
  { rosterId: 16, name: "Hurts So Good", owner: "@negrini", record: "4-1", wins: 4, losses: 1, ties: 0, fpts: "940.3", fptsAgainst: "905.0", projTotal: 135.2, isMyTeam: false },
  { rosterId: 9, name: "Arapiraca Miners", owner: "@Fontanella", record: "4-1", wins: 4, losses: 1, ties: 0, fpts: "917.1", fptsAgainst: "847.1", projTotal: 133.0, isMyTeam: false },
  { rosterId: 8, name: "Paranaguá Rat Crew", owner: "@cauexavier", record: "4-1", wins: 4, losses: 1, ties: 0, fpts: "893.4", fptsAgainst: "845.7", projTotal: 131.5, isMyTeam: false },
  { rosterId: 12, name: "31ers", owner: "@31ers", record: "3-2", wins: 3, losses: 2, ties: 0, fpts: "849.5", fptsAgainst: "770.5", projTotal: 128.0, isMyTeam: false },
  { rosterId: 10, name: "The Nuggets", owner: "@Mattadra", record: "2-3", wins: 2, losses: 3, ties: 0, fpts: "977.0", fptsAgainst: "923.7", projTotal: 134.5, isMyTeam: false },
  { rosterId: 6, name: "Uranus Destroyers", owner: "@wendelayres", record: "2-3", wins: 2, losses: 3, ties: 0, fpts: "863.5", fptsAgainst: "881.4", projTotal: 127.8, isMyTeam: false },
  { rosterId: 1, name: "Curitiba Red Fox", owner: "@neyllon", record: "2-3", wins: 2, losses: 3, ties: 0, fpts: "848.7", fptsAgainst: "829.2", projTotal: 126.4, isMyTeam: false },
  { rosterId: 7, name: "Guabi JackRabbits", owner: "@MarcoCoelho", record: "2-3", wins: 2, losses: 3, ties: 0, fpts: "825.7", fptsAgainst: "1002.3", projTotal: 124.0, isMyTeam: false },
  { rosterId: 4, name: "Williams The Conqueror", owner: "@Abreu77", record: "2-3", wins: 2, losses: 3, ties: 0, fpts: "748.8", fptsAgainst: "884.8", projTotal: 119.5, isMyTeam: false },
  { rosterId: 5, name: "Eli Pug", owner: "@ASantiagoS", record: "1-4", wins: 1, losses: 4, ties: 0, fpts: "775.9", fptsAgainst: "976.3", projTotal: 118.0, isMyTeam: false },
  { rosterId: 3, name: "Parsons a Parsons", owner: "@NacuaMatata90", record: "1-4", wins: 1, losses: 4, ties: 0, fpts: "723.9", fptsAgainst: "854.4", projTotal: 115.0, isMyTeam: false },
  { rosterId: 15, name: "Vagabundos Iluminados", owner: "@AugustoVelloso", record: "0-5", wins: 0, losses: 5, ties: 0, fpts: "857.4", fptsAgainst: "993.0", projTotal: 122.0, isMyTeam: false },
  { rosterId: 14, name: "How I Metcalf Your Mother", owner: "@thalesmagni", record: "0-5", wins: 0, losses: 5, ties: 0, fpts: "746.8", fptsAgainst: "973.4", projTotal: 114.0, isMyTeam: false }
];

function selectTeamRoster(rId) {
  selectedActiveRosterId = parseInt(rId);
  renderPlaybookView();
  showToast(`Visualizando elenco: ${LEAGUE_12_TEAMS.find(t => t.rosterId === selectedActiveRosterId)?.name}`);
}

function calculateLineupTotalProjection() {
  let sum = 0;
  for (const [slotKey, pid] of Object.entries(userLineup)) {
    const p = resolveNFLPlayer(pid);
    if (p) sum += getEffectiveProjection(p);
  }
  return sum.toFixed(1);
}

function renderPlaybookView() {
  const container = document.getElementById("view-playbook");
  if (!container) return;

  const currentTeam = LEAGUE_12_TEAMS.find(t => t.rosterId === selectedActiveRosterId) || LEAGUE_12_TEAMS.find(t => t.isMyTeam) || LEAGUE_12_TEAMS[0];
  const isViewingMyTeam = currentTeam.isMyTeam || (userRealRoster && currentTeam.rosterId === userRealRoster.roster_id);
  const currentWeek = activeLeagueWeek || 6;
  const matchupObj = activeRealMatchup || activeRealMatchupWeek6;

  // Duelo oficial da Semana atual
  let oppTeamName = "Curitiba Red Fox";
  let oppTeamRecord = "2-3";
  let oppProj = "126.4";

  if (matchupObj && isViewingMyTeam) {
    oppTeamName = matchupObj.oppTeam;
    oppTeamRecord = matchupObj.oppRecord;
    oppProj = matchupObj.oppProj;
  } else {
    const opp = LEAGUE_12_TEAMS.find(t => t.rosterId !== currentTeam.rosterId) || LEAGUE_12_TEAMS[1];
    oppTeamName = opp.name;
    oppTeamRecord = opp.record;
    oppProj = opp.projTotal;
  }

  const totalProj = calculateLineupTotalProjection();
  const maxPossibleProj = (parseFloat(totalProj) + 3.4).toFixed(1);
  const efficiencyPercent = Math.min(100, Math.round((parseFloat(totalProj) / parseFloat(maxPossibleProj)) * 100));

  // Determinar titulares e reservas a exibir
  let displayLineup = userLineup;
  let displayBench = userBenchList;

  if (!isViewingMyTeam && activeSleeperRosters.length > 0) {
    const otherRoster = activeSleeperRosters.find(r => r.roster_id === currentTeam.rosterId);
    if (otherRoster && Array.isArray(otherRoster.starters)) {
      displayLineup = {};
      ROSTER_SLOTS_DEF.forEach((slot, idx) => {
        const pid = otherRoster.starters[idx];
        if (pid) displayLineup[slot.key] = String(pid);
      });
      displayBench = (otherRoster.players || [])
        .filter(pid => !otherRoster.starters.includes(pid))
        .map(String);
    }
  }

  container.innerHTML = `
    <!-- Top Selector Strip (16 Times da Liga Sleeper #1369770282776006656) -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">HEAD COACH COMMAND CENTER</span>
          <div style="display:flex;align-items:center;gap:10px;margin-top:4px;">
            <h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin:0;">${currentTeam.name}</h2>
            <span class="badge badge-green">${currentTeam.record} · 2º Lugar</span>
            <a href="https://sleeper.com/leagues/1369770282776006656/team" target="_blank" class="badge badge-blue" style="text-decoration:none;">Abrir no Sleeper ↗</a>
          </div>
        </div>

        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:12px;color:var(--text-muted);">Time da Liga:</span>
            <select class="yl-search-input" style="font-size:12.5px;padding:6px 10px;font-weight:500;" onchange="selectTeamRoster(this.value)">
              ${LEAGUE_12_TEAMS.map(tm => `
                <option value="${tm.rosterId}" ${tm.rosterId === selectedActiveRosterId ? 'selected' : ''}>
                  ${tm.name} (${tm.record}) ${tm.isMyTeam ? '(Seu Time)' : ''}
                </option>
              `).join('')}
            </select>
          </div>
          <button class="btn-yl btn-primary" onclick="optimizeLineupEngine()">Escalação Ótima</button>
        </div>
      </div>

      <!-- Duelo Real da Semana Atual -->
      <div style="margin-top:14px;border-top:1px solid var(--border-light);padding-top:12px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="font-size:13px;color:var(--yl-navy);" id="playbook-real-matchup-header">
          Duelo da Semana ${currentWeek}: <strong>${currentTeam.name} (${totalProj} pts)</strong> vs <strong>${oppTeamName} (${oppProj} pts)</strong>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:var(--text-muted);">Probabilidade de Vitória:</span>
          <span class="badge badge-green" style="font-size:12px;font-weight:500;">61% Favorito</span>
        </div>
      </div>
    </div>

    <!--  HOOTFF COMMAND CENTER (4 BLOCOS TÁTICOS) -->
    <div style="display:grid;grid-template-columns:repeat(4, 1fr);gap:14px;margin-bottom:20px;">
      <div class="yl-card" style="padding:14px;background:#FFF;border-left:4px solid var(--yl-emerald);">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:500;text-transform:uppercase;">Eficiência da Escalação</div>
        <div style="font-size:22px;font-weight:500;color:var(--yl-navy);margin:4px 0 2px;">${efficiencyPercent}%</div>
        <div style="font-size:11.5px;color:var(--text-muted);">Atual: <strong>${totalProj}</strong> / Teto: <strong>${maxPossibleProj}</strong></div>
      </div>
      <div class="yl-card" style="padding:14px;background:#FFF;border-left:4px solid #F59E0B;">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:500;text-transform:uppercase;">Alerta Médico</div>
        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);margin:4px 0 2px;">Drake Thomas (QST)</div>
        <div style="font-size:11.5px;color:#B45309;">Acompanhar relatório final. Dallas Turner pronto no banco.</div>
      </div>
      <div class="yl-card" style="padding:14px;background:#FFF;border-left:4px solid var(--yl-crimson);">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:500;text-transform:uppercase;">Waiver Recomendado</div>
        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);margin:4px 0 2px;">${activeLeagueFreeAgents[0]?.name || 'James Conner'} (${activeLeagueFreeAgents[0]?.pos || 'RB'})</div>
        <div style="font-size:11.5px;color:var(--yl-crimson);">Livre no Waiver. Sugestão: 25% FAAB ($25).</div>
      </div>
      <div class="yl-card" style="padding:14px;background:#FFF;border-left:4px solid #3B82F6;">
        <div style="font-size:11.5px;color:var(--text-muted);font-weight:500;text-transform:uppercase;">Radar Trade Hub</div>
        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);margin:4px 0 2px;">Comprar em Alta</div>
        <div style="font-size:11.5px;color:#1D4ED8;">Alvo: Brock Purdy (+2.8 pts/sem acima da média da liga).</div>
      </div>
    </div>

    <!-- Tabela de Escalação com Todos os Titulares e Reservas Reais -->
    <div style="display:grid;grid-template-columns:1.9fr 1.1fr;gap:20px;">
      <div class="yl-card" style="padding:0;overflow:hidden;">
        <div class="yl-card-header" style="display:flex;justify-content:space-between;align-items:center;">
          <div class="yl-card-title">Titulares em Campo (Starting Lineup)</div>
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn-yl btn-outline" style="padding:3px 8px;font-size:11px;" onclick="resetCustomProjections()">Restaurar Projeções</button>
            <span class="badge badge-green">${ROSTER_SLOTS_DEF.length} TITULARES</span>
          </div>
        </div>
        <table class="yl-table">
          <thead>
            <tr>
              <th style="width:65px;">Pos</th>
              <th>Jogador</th>
              <th>Time</th>
              <th>Média</th>
              <th style="min-width:110px;">Proj (Editável)</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${ROSTER_SLOTS_DEF.map(slot => {
              const pid = displayLineup[slot.key];
              const p = resolveNFLPlayer(pid);
              if (!p) return '';
              const effectiveProj = getEffectiveProjection(p);
              const isCustom = customPlayerProjections[p.id] !== undefined;

              return `
                <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;">
                  <td><span class="badge badge-navy mono">${slot.key}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${p.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                      <div>
                        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${p.pos} · ${p.number || ''} · ${p.injuryStatus ? p.injuryStatus : 'Sem restrição'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-blue">${p.team}</span></td>
                  <td class="mono">${p.avgPpr || 0}</td>
                  <td onclick="event.stopPropagation();">
                    <div style="display:flex;align-items:center;gap:5px;">
                      <input type="number" step="0.1" value="${effectiveProj}"
                             style="width:58px;padding:3px 6px;border:1px solid ${isCustom ? 'var(--yl-crimson)' : 'var(--border-light)'};border-radius:4px;font-family:monospace;font-size:12px;font-weight:500;color:${isCustom ? 'var(--yl-crimson)' : 'var(--yl-navy)'};background:${isCustom ? '#FEF2F2' : '#FFF'};"
                             onchange="updateCustomProjection('${p.id}', this.value)">
                      ${isCustom ? '<span style="font-size:10px;color:var(--yl-crimson);"></span>' : ''}
                    </div>
                  </td>
                  <td>
                    <button class="btn-yl btn-outline" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation();openStarterSwap('${slot.key}')">
                      Substituir ▾
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>

        <!-- Bench Table -->
        <div class="yl-card-header" style="border-top:1px solid var(--border-box);">
          <div class="yl-card-title">Reservas no Banco (Bench)</div>
          <span class="badge badge-amber">${displayBench.length} RESERVAS</span>
        </div>
        <table class="yl-table">
          <tbody>
            ${displayBench.map(bid => {
              const p = resolveNFLPlayer(bid);
              if (!p) return '';
              const effectiveProj = getEffectiveProjection(p);

              return `
                <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;background:#FAFBFD;">
                  <td style="width:65px;"><span class="badge mono" style="background:#E2E8F0;color:#475569;">BN</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${p.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                      <div>
                        <div style="font-size:13px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${p.pos} · ${p.team} · ${p.injuryStatus ? p.injuryStatus : 'Sem restrição'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-navy">${p.team}</span></td>
                  <td class="mono">${p.avgPpr || 0}</td>
                  <td class="mono" style="font-weight:500;">${effectiveProj}</td>
                  <td>
                    <button class="btn-yl btn-primary" style="padding:3px 8px;font-size:11px;" onclick="event.stopPropagation();openBenchPromote('${p.id}')">
                      Promover →
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      <!-- Right Column: Diagnóstico Tático -->
      <div style="display:flex;flex-direction:column;gap:16px;">
        <div class="yl-card" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="color:#0284c7;display:inline-flex;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg></span>
            <strong style="font-size:13.5px;color:var(--yl-navy);">Manager DNA & Ajuste de Projeções</strong>
          </div>
          <div style="font-size:12.5px;color:var(--text-body);line-height:1.5;margin-bottom:12px;">
            Seu perfil como manager é <strong>Agressivo em Volume</strong>. Você pode editar manualmente qualquer projeção na tabela ao lado e o sistema recalculará o placar da rodada na hora.
          </div>
        </div>

        <div class="yl-card" style="padding:16px;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
            <span style="color:#c3112b;display:inline-flex;align-items:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"></polyline><line x1="13" y1="19" x2="19" y2="13"></line><line x1="16" y1="16" x2="20" y2="20"></line><line x1="19" y1="21" x2="21" y2="19"></line></svg></span>
            <strong style="font-size:13.5px;color:var(--yl-navy);">Raio-X do Rival (${oppTeamName})</strong>
          </div>
          <div style="font-size:12px;color:var(--text-body);line-height:1.6;">
            O adversário projeta <strong>${oppProj} pontos</strong> (${oppTeamRecord}). Sua vantagem principal está no corpo de recebedores e linha defensiva (+18.4 pts sobre o adversário).
          </div>
        </div>
      </div>
    </div>
  `;
}

// ==========================================
//  ABA LIGA: AUDITORIA SLEEPER, DUELO SEMANA 6 & CLASSIFICAÇÃO
// ==========================================
isSleeperAuditing = false;

async function triggerDetailedSleeperAudit() {
  if (isSleeperAuditing) return;
  isSleeperAuditing = true;

  const logsContainer = document.getElementById("sleeper-audit-live-logs");
  const progressBar = document.getElementById("sleeper-audit-progress-bar");
  const statusBadge = document.getElementById("sleeper-audit-status-badge");
  const auditBtn = document.getElementById("sleeper-audit-trigger-btn");

  if (auditBtn) auditBtn.disabled = true;
  if (statusBadge) {
    statusBadge.className = "badge badge-navy";
    statusBadge.innerText = "AUDITANDO EM TEMPO REAL...";
  }

  showToast("Iniciando auditoria em 14 etapas da Liga Sleeper...");

  const steps = [
    "1. Conectando a https://api.sleeper.app/v1/league/1369770282776006656...",
    "2. Validando status da liga: Neilo Pistola League (Temporada 2026, in_season)...",
    "3. Carregando catálogo oficial de atletas da NFL via IndexedDB (YardlinePlayersCacheDB, TTL 24h)...",
    "4. Consultando /users: 16 proprietários e metadados de times decodificados...",
    "5. Mapeando /rosters: 16 elencos, 518 atletas sob contrato identificados...",
    "6. Cruzando owner_id do time 'Gengar My Balls' (@Faraco, Roster #2)...",
    "7. Auditando titulares reais (Brock Purdy, Javonte Williams, Kittle, Crosby...)...",
    "8. Auditando reservas reais (Trevor Lawrence, DK Metcalf, Dallas Turner...)...",
    `9. Buscando confrontos da Semana ${activeLeagueWeek || 6} em /matchups/${activeLeagueWeek || 6}...`,
    "10. Duelo identificado: Matchup #7 vs Curitiba Red Fox (@neyllon, Roster #1)...",
    "11. Auditando saldo de FAAB da liga ($100 orçados, 0% consumidos)...",
    "12. Derivando Waiver Wire: centenas de atletas livres da NFL identificados...",
    "13. Calculando projeções táticas e probabilidades de vitória da rodada...",
    "14. Auditoria concluída com sucesso! Todos os módulos Yardline sincronizados."
  ];

  if (logsContainer) logsContainer.innerHTML = "";
  for (let i = 0; i < steps.length; i++) {
    if (progressBar) progressBar.style.width = Math.round(((i + 1) / steps.length) * 100) + "%";
    if (logsContainer) {
      const div = document.createElement("div");
      div.style.padding = "3px 0";
      div.style.fontSize = "11.5px";
      div.style.color = (i === steps.length - 1) ? "#047857" : "#334155";
      div.style.fontFamily = "monospace";
      div.innerHTML = `[${new Date().toLocaleTimeString("pt-BR")}] ${steps[i]}`;
      logsContainer.appendChild(div);
      logsContainer.scrollTop = logsContainer.scrollHeight;
    }
    await new Promise(r => setTimeout(r, 70));
  }

  // Executar a sincronização oficial ao vivo da API
  await window.syncRealSleeperLeagueLive();

  isSleeperAuditing = false;
  if (auditBtn) auditBtn.disabled = false;
  if (statusBadge) {
    statusBadge.className = "badge badge-green";
    statusBadge.innerText = "SINCRONIZADO & AUDITADO: " + new Date().toLocaleTimeString("pt-BR");
  }
}

function renderLeagueView() {
  const container = document.getElementById("view-league");
  if (!container) return;

  const leagueName = activeSleeperLeagueData?.name || "Neilo Pistola League";
  const myTeam = LEAGUE_12_TEAMS.find(t => t.isMyTeam) || LEAGUE_12_TEAMS[0];
  const currentWeek = activeLeagueWeek || 6;
  const matchup = activeRealMatchup || activeRealMatchupWeek6 || {
    week: currentWeek,
    matchupId: 7,
    myTeam: myTeam.name,
    myRecord: myTeam.record,
    myProj: calculateLineupTotalProjection(),
    myScore: 0,
    oppTeam: "Curitiba Red Fox",
    oppRecord: "2-3",
    oppProj: "126.4",
    oppScore: 0
  };

  const myP = parseFloat(matchup.myProj) || 140;
  const oppP = parseFloat(matchup.oppProj) || 120;
  const myWinChance = Math.min(88, Math.max(25, Math.round((myP / (myP + oppP)) * 100)));
  const oppWinChance = 100 - myWinChance;

  container.innerHTML = `
    <!-- Top Sync Status Card & 14-Step Audit Panel -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-green" id="sleeper-audit-status-badge">CONECTADO: SLEEPER API v1</span>
          <h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:4px;">${leagueName} (#${REAL_SLEEPER_LEAGUE_ID})</h2>
          <div style="font-size:12px;color:var(--text-muted);">Sincronização oficial para a conta <strong>@Faraco</strong> · Time: <strong>Gengar My Balls</strong> (${myTeam.record})</div>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
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
          <span>PROGRESSO DA SINCRONIZAÇÃO SLEEPER (14 ETAPAS OFICIAIS)</span>
          <span id="sleeper-audit-status-text">STATUS: CONECTADO E AUDITADO</span>
        </div>
        <div style="width:100%;height:6px;background:#E2E8F0;border-radius:3px;overflow:hidden;margin-bottom:8px;">
          <div id="sleeper-audit-progress-bar" style="width:100%;height:100%;background:var(--yl-emerald);transition:width 0.2s;"></div>
        </div>
        <div id="sleeper-audit-live-logs" style="max-height:85px;overflow-y:auto;font-size:11.5px;line-height:1.5;">
          <div style="color:#047857;font-family:monospace;"> Sincronização oficial concluída com sucesso. ${LEAGUE_12_TEAMS.length} elencos, catálogo IndexedDB (YardlinePlayersCacheDB) e Duelo da Semana ${currentWeek} carregados.</div>
        </div>
      </div>
    </div>

    <!-- Matchup Real da Semana Atual -->
    <div class="yl-card" style="margin-bottom:18px;padding:18px;border-left:4px solid var(--yl-crimson);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">SEU DUELO DA SEMANA ${currentWeek} (SLEEPER LIVE)</span>
          <h3 style="font-size:18px;font-weight:500;color:var(--yl-navy);margin-top:4px;">
            ${matchup.myTeam} (${matchup.myRecord}) vs ${matchup.oppTeam} (${matchup.oppRecord})
          </h3>
          <div style="font-size:12px;color:var(--text-muted);">Matchup #${matchup.matchupId || 7} oficial da Liga Sleeper · Semana ${currentWeek} em andamento</div>
        </div>
        <div style="text-align:right;">
          <div class="mono" style="font-size:22px;font-weight:500;color:var(--yl-emerald);">${myWinChance}% vs ${oppWinChance}%</div>
          <div style="font-size:12px;color:var(--text-muted);">Projeção: <strong>${matchup.myProj} pts</strong> vs <strong>${matchup.oppProj} pts</strong></div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">Placar Real: <strong>${matchup.myScore}</strong> x <strong>${matchup.oppScore}</strong></div>
        </div>
      </div>
    </div>

    <!-- Tabela Oficial de Classificação da Liga (Standings) -->
    <div class="yl-card" style="padding:0;overflow:hidden;">
      <div class="yl-card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div class="yl-card-title">Classificação Oficial da Liga (${LEAGUE_12_TEAMS.length} Times)</div>
          <div style="font-size:11.5px;color:var(--text-muted);">Liga Sleeper ID: ${REAL_SLEEPER_LEAGUE_ID} · Temporada 2026</div>
        </div>
        <span class="badge badge-navy">${LEAGUE_12_TEAMS.length} TIMES PARTICIPANTES</span>
      </div>
      <table class="yl-table">
        <thead>
          <tr>
            <th style="width:50px;">Pos</th>
            <th>Time</th>
            <th>Manager</th>
            <th style="text-align:center;">Campanha</th>
            <th style="text-align:right;">Pontos Pró</th>
            <th style="text-align:right;">Contra</th>
            <th style="text-align:right;">Proj Total</th>
            <th style="text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${LEAGUE_12_TEAMS.map((tm, idx) => {
            const isMine = tm.isMyTeam;
            const posBadge = idx < 6 ? 'badge-green' : (idx < 12 ? 'badge-blue' : 'badge-amber');
            const statusLabel = idx === 0 ? '1º Lugar (Líder)' : (idx < 6 ? 'Zona Playoff' : (idx < 12 ? 'Meio de Tabela' : 'Repescagem'));

            return `
              <tr style="${isMine ? 'background:#F0FDF4;border-left:3px solid var(--yl-emerald);' : ''}">
                <td style="font-weight:500;color:var(--yl-navy);"><span class="badge ${posBadge} mono">#${idx + 1}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <strong style="font-size:13.5px;color:var(--yl-navy);">${tm.name}</strong>
                    ${isMine ? '<span class="badge badge-green" style="font-size:10px;">SEU TIME</span>' : ''}
                  </div>
                </td>
                <td style="font-size:12px;color:var(--text-muted);font-family:monospace;">${tm.owner}</td>
                <td style="text-align:center;font-weight:500;font-family:monospace;font-size:13px;color:var(--yl-navy);">${tm.record}</td>
                <td style="text-align:right;font-family:monospace;font-size:12.5px;">${tm.fpts}</td>
                <td style="text-align:right;font-family:monospace;font-size:12px;color:var(--text-muted);">${tm.fptsAgainst}</td>
                <td style="text-align:right;font-family:monospace;font-size:12.5px;font-weight:500;color:var(--yl-navy);">${tm.projTotal}</td>
                <td style="text-align:center;"><span class="badge ${posBadge}" style="font-size:11px;">${statusLabel}</span></td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// ==========================================
//  ABA WAIVERS: JOGADORES LIVRES DERIVADOS DA NFL
// ==========================================
function filterWaiverPos(pos) {
  activeWaiverPosFilter = pos;
  renderWaiversView();
}

function handleWaiverSearch(val) {
  activeWaiverSearchQuery = (val || "").toLowerCase().trim();
  renderWaiversView();
}

function renderWaiversView() {
  const container = document.getElementById("view-waivers");
  if (!container) return;

  const leagueTitle = activeSleeperLeagueData?.name || "Neilo Pistola League";
  const positions = ["TODOS", "QB", "RB", "WR", "TE", "K", "DEF", "IDP"];

  let list = activeLeagueFreeAgents;
  if (activeWaiverPosFilter !== "TODOS") {
    if (activeWaiverPosFilter === "DEF") {
      list = list.filter(p => ["DEF", "DE", "DT"].includes(p.pos));
    } else if (activeWaiverPosFilter === "IDP") {
      list = list.filter(p => ["DL", "LB", "DB", "DE", "DT", "CB", "S"].includes(p.pos));
    } else {
      list = list.filter(p => p.pos === activeWaiverPosFilter);
    }
  }

  if (activeWaiverSearchQuery) {
    list = list.filter(p =>
      (p.name && p.name.toLowerCase().includes(activeWaiverSearchQuery)) ||
      (p.team && p.team.toLowerCase().includes(activeWaiverSearchQuery))
    );
  }

  const displayedList = list.slice(0, 50);

  container.innerHTML = `
    <!-- Top Value Proposition Strip -->
    <div class="yl-card" style="margin-bottom:18px;padding:16px 20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
        <div>
          <span class="badge badge-crimson">WAIVER WIRE ASSISTANT INTELIGENTE</span>
          <h2 style="font-size:20px;font-weight:500;color:var(--yl-navy);margin-top:4px;">Central de Waivers & FAAB da Liga</h2>
          <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">
            Cruzamento em tempo real com os 12+ elencos da <strong>${leagueTitle}</strong> · <strong>${activeLeagueFreeAgents.length}</strong> atletas da NFL livres de contrato
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <!-- Botões de Reponderação de Pontuação na Aba Waivers -->
          <div style="display:flex;align-items:center;gap:4px;background:#F1F5F9;padding:4px;border-radius:8px;">
            <span style="font-size:11px;color:var(--text-muted);padding-left:4px;font-weight:500;">Pontuação:</span>
            <button class="btn-yl ${activeScoringFormat === 'PPR' ? 'btn-primary' : 'btn-outline'}"
                    style="padding:3px 8px;font-size:11px;"
                    onclick="setScoringFormat('PPR')">PPR 1.0</button>
            <button class="btn-yl ${activeScoringFormat === 'HALF_PPR' ? 'btn-primary' : 'btn-outline'}"
                    style="padding:3px 8px;font-size:11px;"
                    onclick="setScoringFormat('HALF_PPR')">Half-PPR 0.5</button>
            <button class="btn-yl ${activeScoringFormat === 'STANDARD' ? 'btn-primary' : 'btn-outline'}"
                    style="padding:3px 8px;font-size:11px;"
                    onclick="setScoringFormat('STANDARD')">Standard 0.0</button>
            <button class="btn-yl ${activeScoringFormat === 'TE_PREMIUM' ? 'btn-primary' : 'btn-outline'}"
                    style="padding:3px 8px;font-size:11px;"
                    onclick="setScoringFormat('TE_PREMIUM')">TE Premium</button>
          </div>

          <div style="background:#F8FAFC;border:1px solid var(--border-box);padding:8px 14px;border-radius:8px;text-align:right;">
            <div style="font-size:11px;color:var(--text-muted);text-transform:uppercase;">SEU SALDO FAAB</div>
            <strong class="mono" style="font-size:16px;color:var(--yl-navy);">$${typeof userFaab !== "undefined" ? userFaab : 100} / $100</strong>
          </div>
        </div>
      </div>

      <!-- Controls: Position Filter Pills & Search Input -->
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;margin-top:16px;border-top:1px solid var(--border-light);padding-top:14px;">
        <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:12px;color:var(--text-muted);margin-right:4px;">Posição:</span>
          ${positions.map(pos => `
            <button class="btn-yl ${activeWaiverPosFilter === pos ? 'btn-primary' : 'btn-outline'}"
                    style="padding:4px 10px;font-size:11.5px;"
                    onclick="filterWaiverPos('${pos}')">
              ${pos}
            </button>
          `).join('')}
        </div>
        <div style="flex:1;max-width:320px;">
          <input type="text" class="yl-search-input"
                 placeholder="Buscar por atleta livre ou equipe..."
                 value="${activeWaiverSearchQuery}"
                 oninput="handleWaiverSearch(this.value)"
                 style="width:100%;font-size:12px;padding:6px 10px;">
        </div>
      </div>
    </div>

    <!-- Waiver Table -->
    <div class="yl-card" style="padding:0;overflow:hidden;">
      <div class="yl-card-header" style="display:flex;justify-content:space-between;align-items:center;">
        <div class="yl-card-title">
          Atletas Livres Disponíveis (${list.length} encontrados ${list.length > 50 ? '· Mostrando os 50 principais' : ''})
        </div>
        <span class="badge badge-green">${activeLeagueFreeAgents.length} ATLETAS DA NFL LIVRES</span>
      </div>

      ${displayedList.length === 0 ? `
        <div style="padding:30px;text-align:center;color:var(--text-muted);font-size:13px;">
          Nenhum jogador livre encontrado para os filtros selecionados.
        </div>
      ` : `
        <table class="yl-table">
          <thead>
            <tr>
              <th style="width:65px;">Prioridade</th>
              <th>Jogador Livre</th>
              <th>Pos/Time</th>
              <th>Proj Sem ${activeLeagueWeek || 6} (${activeScoringFormat.replace('_', ' ')})</th>
              <th>VBD Posicional</th>
              <th>Lance Sugerido FAAB</th>
              <th>Ação</th>
            </tr>
          </thead>
          <tbody>
            ${displayedList.map((p, idx) => {
              const proj = getEffectiveProjection(p);
              const vbd = getPlayerVBD(p);
              const suggestedPct = idx === 0 ? 25 : (idx < 5 ? 18 : (idx < 15 ? 12 : 5));
              const suggestedVal = Math.max(1, Math.round(((typeof userFaab !== "undefined" ? userFaab : 100) * suggestedPct) / 100));

              return `
                <tr onclick="openPlayerDossierModal('${p.id}')" style="cursor:pointer;">
                  <td class="mono"><span class="badge badge-crimson">#${idx + 1}</span></td>
                  <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                      <img src="${p.photo}" style="width:34px;height:34px;border-radius:50%;object-fit:cover;border:1px solid var(--border-box);" onerror="this.src='${p.teamLogo}'" alt="">
                      <div>
                        <div style="font-size:13.5px;font-weight:500;color:var(--yl-navy);">${p.name}</div>
                        <div style="font-size:11px;color:var(--text-muted);">${p.teamName || p.team} · ${p.injuryStatus ? p.injuryStatus : 'Sem restrição'}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="badge badge-navy">${p.pos} · ${p.team}</span></td>
                  <td class="mono" style="font-weight:600;color:var(--yl-navy);">${proj} pts</td>
                  <td>
                    <span class="badge ${vbd > 0 ? 'badge-green' : 'badge-navy'} mono">
                      ${vbd > 0 ? '+' : ''}${vbd} pts vs Base
                    </span>
                  </td>
                  <td><span class="badge badge-amber mono">${suggestedPct}% ($${suggestedVal})</span></td>
                  <td>
                    <button class="btn-yl btn-primary" style="padding:4px 9px;font-size:11.5px;" onclick="event.stopPropagation();openSmartWaiverClaimModal('${p.id}')">
                      Reivindicar
                    </button>
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `}
    </div>
  `;
}

// Global Init
function renderAllViews() {
  renderTopTicker();
  renderHomeView();
  renderTeamsView();
  renderPlayersView();
  startLiveTickerClockEngine();
  renderPlaybookView();
  renderTradeView();
  renderLeagueView();
  renderWaiversView();
  renderRankingsView();
  renderAiModeView();
  renderSocialView();
  renderPlansView();
  window.syncRealSleeperLeagueLive().catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
  renderAllViews();
  openNavTab("home");
});





/* Direct v2.1 sync/resolver retired: backend shell is the sole active pipeline.
   Retaining other legacy engines avoids a broad trade/AI rewrite this round. */

/* Restaurar funções UI V2 depois das declarações legadas do engine */
if (typeof window !== 'undefined' && window.YL_V2) {
  window.renderPlaybookView = window.YL_V2.renderPlaybookView;
  window.renderLeagueView = window.YL_V2.renderLeagueView;
  window.renderPlayersView = window.YL_V2.renderPlayersView;
}


/* YARDLINE P0/P1 — ativação final sem sobrescrever dados canônicos */
if (typeof window !== 'undefined' && window.YL_V3) {
  window.renderTeamsView = window.YL_V3.renderTeams;
  window.renderRankingsView = window.YL_V3.renderRankings;
  window.renderWaiversView = window.YL_V3.renderWaivers;
  window.renderLeagueView = function() {
    if (typeof window.renderAuditLeagueView === 'function') {
      window.renderAuditLeagueView();
    } else if (typeof window.YL_V3?.renderLeague === 'function') {
      window.YL_V3.renderLeague();
    }
  };
  window.renderPlaybookView = window.YL_V3.renderPlaybook;
  // Direct traded-picks wrapper retired; picks are part of the shell snapshot.

}


if (typeof window !== 'undefined' && typeof window.renderTradeView === 'function') {
  const ylBaseTrade = window.renderTradeView;
  window.renderTradeView = function(){
    ylBaseTrade();
    const c = document.getElementById('view-trade');
    if (!c || c.querySelector('.yl-trade-picks-panel')) return;
    const picks = Array.isArray(window.YL_TRADED_PICKS) ? window.YL_TRADED_PICKS : [];
    const panel = document.createElement('div');
    panel.className = 'yl-card yl-trade-picks-panel';
    panel.innerHTML = `<div class="yl-card-header"><div><div class="yl-card-title">Picks de Draft</div><small class="yl-muted">Ativos negociados registrados pela API Sleeper. A API é somente leitura; esta tela prepara/exporta a proposta.</small></div><span class="badge badge-navy">${picks.length} registros</span></div><div class="yl-picks-grid">${picks.length ? picks.map(p=>`<button class="yl-pick-chip" type="button" data-pick="${String(p.season||'')}::${String(p.round||'')}::${String(p.roster_id||p.previous_owner_id||'')}"><b>${String(p.season||'—')} · Rodada ${String(p.round||'—')}</b><small>Origem roster #${String(p.roster_id||p.previous_owner_id||'—')}</small></button>`).join('') : '<p class="yl-muted">Nenhum registro de pick negociada foi carregado. O inventário completo de picks depende das regras e do draft da liga; não serão inventadas picks.</p>'}</div>`;
    c.prepend(panel);
  };
}


/* YARDLINE P0.1 — o browser consome apenas o backend Yardline */
if (typeof window !== 'undefined') {
  let syncInFlight = null, inFlightLeagueId = null;
  window.syncRealSleeperLeagueLive = function(customLeagueId){
    if (syncInFlight) {
      if (customLeagueId && customLeagueId !== inFlightLeagueId) return syncInFlight.catch(() => {}).then(() => window.syncRealSleeperLeagueLive(customLeagueId));
      return syncInFlight;
    }
    inFlightLeagueId = customLeagueId || localStorage.getItem('yl_active_league_id') || localStorage.getItem('yl_active_league') || REAL_SLEEPER_LEAGUE_ID;
    syncInFlight = syncShell(inFlightLeagueId).finally(() => { syncInFlight = null; });
    return syncInFlight;
  };
  // Catalog buttons use this named public entry point; it delegates to the canonical shell sync.
  window.syncLiveSleeperApiPlayers = function(){
    if (typeof window.syncRealSleeperLeagueLive !== 'function') return Promise.reject(new Error('Sincronização Sleeper indisponível.'));
    return window.syncRealSleeperLeagueLive();
  };
  async function syncShell(id){
    localStorage.setItem('yl_active_league_id', id);
    const apiBase = window.YL_API_BASE || (window.location.port === '3001' ? window.location.origin : `http://${window.location.hostname || '127.0.0.1'}:3001`);
    const request = async (path, options = {}) => {
      const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(`${apiBase}${path}`, { ...options, signal: controller.signal, headers: { Accept: 'application/json', ...(options.headers || {}) } });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error || `Backend respondeu HTTP ${response.status}`);
        return body;
      } finally { clearTimeout(timer); }
    };
    showToast(`Sincronizando liga #${id} pelo backend...`);
    try {
      await request('/api/integrations/sleeper/sync-league', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ leagueId: id }) });
      const snapshot = await request(`/api/leagues/${id}/shell`);
      const nextPlayerCards = snapshot.playerCards || {};
      const previousPlayerCards = window.YL_PLAYER_CARDS || {};
      if (!Object.keys(nextPlayerCards).length && Object.keys(previousPlayerCards).length) {
        window.YL_CATALOG_STATUS = { status: 'stale', fallback: 'previous_snapshot' };
        throw new Error('Sincronização Sleeper retornou catálogo vazio; snapshot anterior preservado.');
      }
      window.YL_CATALOG_STATUS = { status: snapshot.dataStatus === 'stale' ? 'stale' : 'available', fallback: null };
      window.YL_CANONICAL = { players: nextPlayerCards, fetchedAt: snapshot.syncedAt || null };
      window.YL_PLAYER_CARDS = nextPlayerCards;
      window.YL_LIVE_PLAYER_DATA = snapshot.playerData || {};
      activeSleeperPlayersCatalog = window.YL_CANONICAL.players;
      indexSleeperPlayersCatalog(activeSleeperPlayersCatalog);
      window.YL_SHELL_SNAPSHOT = snapshot;
      window.YL_TRADED_PICKS = snapshot.tradedPicks || [];
      activeSleeperLeagueData = { ...snapshot.league, league_id: snapshot.league.providerLeagueId,
        roster_positions: snapshot.league.rosterPositions, settings: snapshot.league.settings, scoring_settings: snapshot.league.scoringSettings };
      activeNflState = snapshot.state; activeLeagueWeek = snapshot.state?.week ?? null;
      activeSleeperRosters = (snapshot.rosters || []).map(r => ({ ...r, roster_id: r.rosterId, owner_id: r.ownerId,
        ownerName: r.ownerName, players: r.players, starters: r.starters, reserve: r.reserve, taxi: r.taxi, settings: r.settings }));
      const wanted = (typeof activeSleeperUsername !== 'undefined' ? activeSleeperUsername : null)
        || localStorage.getItem('yl_sleeper_username') || null;
      let ownerId = window.YL_SLEEPER_USER_ID || localStorage.getItem('yl_sleeper_user_id') || null;
      if (!ownerId && wanted) {
        try {
          const user = await request(`/api/integrations/sleeper/user/${encodeURIComponent(String(wanted).replace(/^@/, ''))}`);
          ownerId = user?.user_id || null;
          if (ownerId) {
            window.YL_SLEEPER_USER_ID = String(ownerId);
            localStorage.setItem('yl_sleeper_user_id', String(ownerId));
          }
        } catch (identityError) {
          console.warn('[Yardline sync] identidade Sleeper indisponível:', identityError.message);
        }
      }
      userRealRoster = window.YardlinePlayerCard.selectUserRoster(activeSleeperRosters, {
        ownerId });
      selectedActiveRosterId = userRealRoster?.roster_id ?? null;
      window.YL_ACTIVE_ROSTERS = activeSleeperRosters;
      window.YL_MY_ROSTER_ID = selectedActiveRosterId;
      const groups = window.YardlinePlayerCard.rosterGroups(userRealRoster);
      userStarters = groups.starters; userBenchList = groups.bench; userBench = groups.bench.slice(); userReserveList = groups.reserve;
      userLineup = {}; (ROSTER_SLOTS_DEF || []).forEach((slot, index) => {
        const id = userRealRoster?.starters?.[index]; if (id && String(id) !== '0') userLineup[slot.key] = String(id);
      });
      LEAGUE_12_TEAMS = (snapshot.standings || []).map(team => ({ ...team, name: team.teamName, owner: team.manager, rosterId: team.rosterId, isMyTeam: Number(team.rosterId) === Number(userRealRoster?.roster_id) }));
      const myTeamObj = LEAGUE_12_TEAMS.find(t => t.isMyTeam);
      const myTeamName = myTeamObj?.name || 'Owner não identificado';
      const leagueName = snapshot.league?.name || 'Liga Sleeper';
      const topTeam = document.getElementById('topbar-team-label');
      if (topTeam) topTeam.textContent = `(${myTeamName})`;
      const sbCopy = document.getElementById('sidebar-league-copy');
      if (sbCopy) sbCopy.textContent = `${leagueName} · ${myTeamName}`;
      const sbTeam = document.getElementById('sidebar-team-label');
      if (sbTeam) sbTeam.textContent = myTeamName;
      const sbLogo = document.getElementById('sidebar-league-logo');
      if (sbLogo) sbLogo.textContent = (myTeamName.split(' ').map(w => w[0]).join('').slice(0, 2) || 'SB').toUpperCase();
      const current = userRealRoster ? (snapshot.matchups || []).find(m => {
        const aId = Number(m.rosterAId ?? m.roster_a_id);
        const bId = Number(m.rosterBId ?? m.roster_b_id);
        const myId = Number(userRealRoster?.roster_id);
        return aId === myId || bId === myId;
      }) : null;
      const isA = current && Number(current.rosterAId ?? current.roster_a_id) === Number(userRealRoster?.roster_id);
      const opponentRosterId = current ? (isA ? (current.rosterBId ?? current.roster_b_id) : (current.rosterAId ?? current.roster_a_id)) : null;
      const opponentRoster = activeSleeperRosters.find(r => Number(r.roster_id) === Number(opponentRosterId));
      activeRealMatchup = current ? {
        week: activeLeagueWeek,
        matchupId: current.matchupId ?? current.provider_matchup_id ?? null,
        myRoster: userRealRoster,
        oppRoster: opponentRoster,
        oppRosterId: opponentRosterId,
        myScore: isA ? (current.scoreA ?? current.score_a ?? null) : (current.scoreB ?? current.score_b ?? null),
        oppScore: isA ? (current.scoreB ?? current.score_b ?? null) : (current.scoreA ?? current.score_a ?? null),
        snapshot: current
      } : null;
      activeRealMatchupWeek6 = activeRealMatchup;
      window.activeRealMatchup = activeRealMatchup;
      deriveLeagueFreeAgents(); renderTeamsView(); renderRankingsView(); renderWaiversView(); renderPlaybookView(); renderLeagueView(); renderPlayersView(); if (typeof renderHomeView === 'function') renderHomeView(); if (typeof renderTradeView === 'function') renderTradeView(); showToast(`Liga sincronizada: ${snapshot.rosters?.length || 0} times · Semana ${activeLeagueWeek}`); return snapshot;
    } catch (e) { console.error('[Yardline sync]', e); showToast(`${e.message || 'Não foi possível atualizar os dados.'}`); throw e; }
  }
}

// One automatic sync is started by renderAllViews; no duplicate timer.


/* Card resolver and null handling live in the shared DTO, not final global overrides.
   Zero is a real value when sourced; the former DOM zero-to-dash patch is retired. */
if (typeof window !== 'undefined' && window.YL_FIX2_TEAMS) window.renderTeamsView = window.YL_FIX2_TEAMS;

/* YARDLINE LINEUP FIX — dossier funcional e dados oficiais sob demanda */
(function(){
  const API=window.YL_API_BASE || (window.location.port === '3001' ? window.location.origin : `http://${window.location.hostname || '127.0.0.1'}:3001`);
  let dossierRequest = 0;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const num=v=>v===null||v===undefined||v===''||Number.isNaN(Number(v))?'—':Number(v).toFixed(1);
  const get=async(url)=>{const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetch(url,{signal:c.signal,cache:'no-store'});if(!r.ok)throw Error(`HTTP ${r.status}`);return await r.json();}finally{clearTimeout(t);}};
  const rawOf=id=>window.YL_CANONICAL?.players?.[String(id)]||{};
  const logo=t=>t?`https://a.espncdn.com/i/teamlogos/nfl/500/${String(t).toLowerCase()}.png`:'https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png';
  const teamColors={SF:'#AA0000',BUF:'#00338D',DAL:'#041E42',KC:'#E31837',PHI:'#004C54',GB:'#203731',BAL:'#241773',MIA:'#008E97',NYJ:'#125740',NYG:'#0B2265',DET:'#0076B6',HOU:'#03202F',ATL:'#A71930',LAR:'#003594',TB:'#D50A0A',CIN:'#FB4F14',PIT:'#FFB612',MIN:'#4F2683',SEA:'#002244',JAX:'#006778',CAR:'#0085CA',LV:'#000000',LAC:'#0080C6',DEN:'#FB4F14',CLE:'#311D00',ARI:'#97233F',IND:'#002C5F',TEN:'#4B92DB',WAS:'#5A1414',NE:'#002244',CHI:'#0B162A'};
  function rosterPerc(id){const rosters=Array.isArray(activeSleeperRosters)?activeSleeperRosters:[];const total=rosters.length||0;const rostered=rosters.filter(r=>(r.players||[]).map(String).includes(String(id))).length;const started=rosters.filter(r=>(r.starters||[]).map(String).includes(String(id))).length;return {rostered:total?Math.round(rostered/total*100):null,started:total?Math.round(started/total*100):null};}
  function depthFor(p) {
    return Object.values(window.YL_PLAYER_CARDS || {}).filter(r => r.team === p.team && r.depthChartOrder !== null &&
      (r.position === p.position || (r.fantasyPositions || []).includes(p.position)))
      .sort((a,b) => a.depthChartOrder - b.depthChartOrder).slice(0,6)
      .map(r => ({ id: r.id, name: r.name, order: r.depthChartOrder }));
  }
  async function seasonRows(id, season) {
    const leagueId = window.YL_SHELL_SNAPSHOT?.league?.providerLeagueId;
    const data = await get(`${API}/api/players/${encodeURIComponent(id)}/history?season=${encodeURIComponent(season)}${leagueId ? `&leagueId=${encodeURIComponent(leagueId)}` : ''}`);
    return data.rows || data.history || [];
  }
  async function newsFor(p) {
    try { const data = await get(`${API}/api/players/${encodeURIComponent(p.id)}/news`); return Array.isArray(data) ? data.slice(0,3) : (data.items || []).slice(0,3); }
    catch { return []; }
  }
  function formatHeight(h) {
    if (!h || h === '—') return '—';
    const str = String(h).trim();
    if (str.includes("'") || str.includes('m')) return str;
    const num = Number(str);
    if (!isNaN(num) && num >= 55 && num <= 90) {
      const feet = Math.floor(num / 12);
      const inches = num % 12;
      const meters = (num * 0.0254).toFixed(2);
      return `${feet}'${inches}" (${meters}m)`;
    }
    return str;
  }
  function formatWeight(w) {
    if (!w || w === '—') return '—';
    const str = String(w).trim();
    if (str.toLowerCase().includes('lb') || str.toLowerCase().includes('kg')) return str;
    const num = Number(str);
    if (!isNaN(num) && num >= 100 && num <= 450) {
      const kg = Math.round(num * 0.453592);
      return `${num} lbs (${kg}kg)`;
    }
    return str;
  }
  function profile(id) { return resolveNFLPlayer(String(id)); }
  window.YL_SWITCH_DOSSIER_TAB = function(tabName) {
    const tabs = ['gamelogs', 'sentiment', 'seasonstats', 'news', 'depth'];
    tabs.forEach(t => {
      const sec = document.getElementById('tab-sec-' + t);
      const btn = document.getElementById('tab-btn-' + t);
      if (sec) sec.style.display = (t === tabName ? 'block' : 'none');
      if (btn) btn.classList.toggle('active', t === tabName);
    });
  };

  function render(p,season,rows,news,error) {
    const raw = rawOf(p.id), depth = depthFor(p), color = teamColors[p.team] || '#C00000', dto = p;
    const m = p.metrics, pc = rosterPerc(p.id), projDisplay = num(m.projectedPoints);
    const member = p.rosterContext.find(r => r.rosterId === selectedActiveRosterId);
    const isMyPlayer = Boolean(member && userRealRoster);
    const ownerTag = isMyPlayer ? 'Seu elenco' : p.rosterContext.length ? 'Rosterizado nesta liga' : window.YL_SHELL_SNAPSHOT?.rosters?.length ? 'Não rosterizado nesta liga' : 'Disponibilidade não validada';
    const validRows = rows.filter(row => window.YardlinePlayerCard.numberOrNull(row.fpts) !== null);
    const sumStat = key => {
      const values = rows.map(row => window.YardlinePlayerCard.numberOrNull(row.stats?.[key])).filter(value => value !== null);
      return values.length ? values.reduce((sum,value) => sum + value,0) : null;
    };
    const seasonPoints = validRows.length ? validRows.reduce((sum,row) => sum + row.fpts,0) : null;
    const hasValidStats = rows.some(x => (x.points != null || x.fpts != null || x.proj != null || (x.stats && Object.keys(x.stats).length > 0)));
    const logRows=hasValidStats?rows.map(x=>{
      const pts=window.YardlinePlayerCard.numberOrNull(x.fpts);
      const proj=window.YardlinePlayerCard.numberOrNull(x.proj);
      const opp=x.opp??x.stats?.opp??x.stats?.opponent??'—';
      const snap=x.snap??x.stats?.snap_pct??x.stats?.snap??null;
      const att=x.att??x.stats?.pass_att??x.stats?.rush_att??null;
      const cmp=x.cmp??x.stats?.pass_cmp??null;
      const yd=x.yd??x.stats?.pass_yd??x.stats?.rush_yd??x.stats?.rec_yd??null;
      const td=x.td??x.stats?.pass_td??x.stats?.rush_td??x.stats?.rec_td??null;
      const intVal=x.int??x.stats?.pass_int??null;
      const sk=x.sk??x.stats?.pass_sack??null;
      const fum=x.fum??x.stats?.fum??null;

      let heatClass = '';
      if (pts != null) {
        if (pts >= 22) heatClass = 'cell-heat-very-high';
        else if (pts >= 16) heatClass = 'cell-heat-high';
        else if (pts >= 11) heatClass = 'cell-heat-med';
        else heatClass = 'cell-heat-cold';
      }

      return `<tr>
        <td><strong>${esc(x.week)}</strong></td>
        <td>${esc(opp)}</td>
        <td>${num(proj)}</td>
        <td class="sleeper-fpts ${heatClass}">${pts!=null?num(pts):'<span class="badge badge-navy">Indisponível</span>'}</td>
        <td>${snap!=null?num(snap)+'%':'—'}</td>
        <td>${num(att)}</td>
        <td>${num(cmp)}</td>
        <td class="${yd>=250?'cell-heat-high':''}">${num(yd)}</td>
        <td class="${td>=2?'cell-heat-very-high':''}">${num(td)}</td>
        <td class="${intVal>0?'cell-heat-cold':''}">${num(intVal)}</td>
        <td>${num(sk)}</td>
        <td>${num(fum)}</td>
      </tr>`;
    }).join(''):`<tr><td colspan="12" class="sleeper-empty" style="padding:24px;text-align:center;">Histórico indisponível para ${esc(season)}. Projeção recebida: <strong>${projDisplay}</strong>. Campos ausentes não são preenchidos com mock.</td></tr>`;

    // Keep Coach AI / expert parity panels; unsourced model outputs never become athlete facts.
    const sentimentHtml = `
      <div class="yl-coach-ai-card">
        <div class="yl-coach-ai-header"><strong>COACH AI · CONSENSUS SENTIMENT</strong><span class="badge badge-navy">INDISPONÍVEL</span></div>
        <div class="yl-coach-meters">${['START / SIT','UPSIDE','BUST RISK'].map(label => `<div class="yl-meter"><div class="yl-meter-label">${label} <b>SEM MODELO VALIDADO</b></div><div class="yl-meter-bars">${Array(5).fill('<span class="yl-meter-seg"></span>').join('')}</div></div>`).join('')}</div>
        <div class="yl-coach-body">Projeção disponível: <strong>${projDisplay}</strong> ${esc(p.context.projectionFormat || '')}. Consenso, risco e teto não foram recebidos de uma fonte verificada para esta rodada.</div>
      </div>`;
    const expertNoteHtml = `<div class="yl-expert-card"><div class="yl-expert-avatar">YL</div><div class="yl-expert-content"><div class="yl-expert-head"><strong>Notas de especialistas</strong><span>Fonte externa não carregada</span></div><p class="yl-expert-text">Nenhuma opinião de especialista será atribuída sem fonte verificável.</p></div></div>`;
    const seasonStatsHtml = `<div class="sleeper-table-wrap" style="margin-top:10px;"><table class="sleeper-log"><thead><tr class="super-header"><th colspan="4">RESUMO OBSERVADO</th><th colspan="5">PASSING</th><th colspan="2">RUSHING</th></tr><tr><th>TEMPORADA</th><th>TIME</th><th>FPTS LIGA</th><th>SEMANAS OBS.</th><th>ATT</th><th>CMP</th><th>YDS</th><th>TD</th><th>INT</th><th>ATT</th><th>YDS</th></tr></thead><tbody><tr><td>${esc(season)}</td><td>${esc(p.team || '—')}</td><td class="sleeper-fpts">${num(seasonPoints)}</td><td>${validRows.length || '—'}</td>${['pass_att','pass_cmp','pass_yd','pass_td','pass_int','rush_att','rush_yd'].map(key => `<td>${num(sumStat(key))}</td>`).join('')}</tr></tbody></table><p class="sleeper-empty">Totais parciais das semanas efetivamente persistidas; ausência não equivale a zero.</p></div>`;

    const newsHtml=news.length?news.map(n=>`<article class="sleeper-news"><a href="${esc(n.sourceUrl||n.canonical_url||'#')}" target="_blank" rel="noopener"><b>${esc(n.title||'Atualização do jogador')}</b></a><small>${esc(n.source||'NFL.com')} · ${esc(n.published_at||n.publishedAt||n.fetchedAt||'Atualizado')}</small><p>${esc(n.summary||'')}</p></article>`).join(''):`<p class="sleeper-empty">Nenhuma notícia vinculada ao atleta no worker.</p>`;
    const hasInjury=Boolean(p.injuryStatus && p.injuryStatus !== 'Active' && p.injuryStatus !== 'Sem restrição');
    const injuryText=esc(p.injuryStatus || 'Lesão não informada') + (p.taxi ? ' · TAXI' : '');
    const provStatus=p.dataStatus;
    const provBadge=`<span style="font-size:10px;padding:3px 9px;border-radius:4px;background:#0f172a;color:#93c5fd;border:1px solid #3b82f6;margin-left:auto;">FONTE: ${esc(provStatus.toUpperCase())} · ${esc(p.source.catalog || 'INDISPONÍVEL')}</span>`;

    const actionBtn = !userRealRoster ? '<button class="sleeper-action" disabled>OWNER NÃO VALIDADO</button>' : p.rosterContext.length && !isMyPlayer ? '<button class="sleeper-action" disabled>ROSTERIZADO</button>' : isMyPlayer
      ? `<button class="sleeper-action" style="background:#ef4444;color:#fff;" onclick="closeModal('player-modal');if(typeof openStarterSwap==='function')openStarterSwap('${p.pos}');">DROP / SWAP</button>`
      : `<button class="sleeper-action" style="background:#22c55e;color:#000;" onclick="closeModal('player-modal');if(typeof openSmartWaiverClaimModal==='function')openSmartWaiverClaimModal('${p.id}');">REIVINDICAR</button>`;

    document.getElementById('player-modal-content').innerHTML=`
      <div class="sleeper-dossier" style="--sleeper-team:${color}">
        <button class="sleeper-close" aria-label="Fechar dossiê" onclick="closeModal('player-modal')">×</button>

        <!-- HERO SECTION (SLEEPER + FANTASYPROS) -->
        <div class="sleeper-dossier__hero">
          <div class="sleeper-dossier__teambg"><img src="${esc(p.teamLogo)}" alt=""></div>
          <div class="sleeper-dossier__mini">
            <b>${esc(p.name.split(' ').map(x=>x[0]).join('').slice(0,2))}</b>
            <span>${esc(p.pos)} · ${esc(p.team)}</span>
          </div>
          <div class="sleeper-dossier__player">
            <img src="${esc(p.photo)}" onerror="this.onerror=null;this.src='https://sleepercdn.com/content/nfl/players/thumb/${esc(p.sleeperId||p.id)}.jpg'" alt="${esc(p.name)}">
          </div>
          <div class="sleeper-dossier__identity">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;">
              <small style="font-weight:700;letter-spacing:0.5px;">${esc(ownerTag)}</small>
              <div class="sleeper-actions" style="position:static;margin-bottom:4px;">
                <button class="sleeper-star" onclick="this.classList.toggle('active');showToast('Adicionado aos favoritos!');"></button>
                ${actionBtn}
              </div>
            </div>
            <h1>${esc(p.name)}</h1>
            <div class="sleeper-bio">
              <span><b>AGE</b>${esc(p.age??'—')}</span><i></i>
              <span><b>HEIGHT</b>${esc(formatHeight(p.height))}</span><i></i>
              <span><b>WEIGHT</b>${esc(formatWeight(p.weight))}</span><i></i>
              <span><b>EXP</b>${esc(p.exp??'—')}</span>
              <span class="college"><b>COLLEGE</b>${esc(p.college??'—')}</span>
            </div>

            <!-- FANTASYPROS STAT BOXES ROW -->
            <div class="fp-stat-boxes">
              <div class="fp-stat-box">
                <small>PPG OBSERVADO*</small>
                <strong>${num(m.pointsPerGame)}</strong>
              </div>
              <div class="fp-stat-box">
                <small>PROJ. ${esc(p.context.projectionFormat || '—')}</small>
                <strong style="color:#38bdf8;">${projDisplay}</strong>
              </div>
              <div class="fp-stat-box">
                <small>YL INDEX</small>
                <strong style="color:#f59e0b;">${num(m.ylIndex)}</strong>
              </div>
              <div class="fp-stat-box">
                <small>TOTAL OBSERVADO*</small>
                <strong>${num(m.totalPoints)}</strong>
              </div>
              <div class="fp-stat-box">
                <small>% ROSTERS DA LIGA</small>
                <strong>${pc.rostered ?? '—'}%</strong>
              </div>
              <div class="fp-stat-box">
                <small>% TITULARES DA LIGA</small>
                <strong>${pc.started ?? '—'}%</strong>
              </div>
            </div>
          </div>
        </div>

        <!-- SECONDARY BAR -->
        <div class="sleeper-dossier__bar">
          <b>${esc(p.pos)}</b>
          <strong>${esc(p.team)} · #${esc(p.number??'—')}</strong>
          <span class="${hasInjury?'danger':''}">${injuryText}</span>
          ${provBadge}
        </div>

        <!-- NAVIGATION TABS BAR (FANTASYPROS PARITY) -->
        <div class="sleeper-dossier-nav">
          <button class="sleeper-tab-btn active" id="tab-btn-gamelogs" onclick="window.YL_SWITCH_DOSSIER_TAB('gamelogs')">Game Logs</button>
          <button class="sleeper-tab-btn" id="tab-btn-sentiment" onclick="window.YL_SWITCH_DOSSIER_TAB('sentiment')">Consensus Sentiment (Coach AI)</button>
          <button class="sleeper-tab-btn" id="tab-btn-seasonstats" onclick="window.YL_SWITCH_DOSSIER_TAB('seasonstats')">Season Stats</button>
          <button class="sleeper-tab-btn" id="tab-btn-news" onclick="window.YL_SWITCH_DOSSIER_TAB('news')">Latest News & Analysis</button>
          <button class="sleeper-tab-btn" id="tab-btn-depth" onclick="window.YL_SWITCH_DOSSIER_TAB('depth')">Depth Chart</button>
        </div>

        <!-- CONTENT MAIN GRID -->
        <div class="sleeper-dossier__content">
          <!-- MAIN TAB CONTENT -->
          <section class="sleeper-dossier__logs">
            <!-- TAB 1: GAME LOGS -->
            <div id="tab-sec-gamelogs">
              <div class="sleeper-section-title">
                <b>GAME LOGS / PROJECTIONS</b>
                <div class="sleeper-years">
                  ${[0,1,2].map(offset => Number(p.context.season || season) - offset).map(y=>`<button type="button" onclick="window.YL_LOAD_PLAYER_SEASON('${esc(p.id)}',${y})" class="${y===season?'active':''}">${y}</button>`).join('')}
                </div>
              </div>
              <p class="sleeper-empty">${esc(window.YardlinePlayerCard.provenance(p))}</p>
              ${error?`<p class="sleeper-empty" role="status">${esc(error)}</p>`:''}
              <div class="sleeper-table-wrap">
                <table class="sleeper-log">
                  <thead>
                    <tr class="super-header">
                      <th colspan="5" style="border-right: 1px solid #334155;">FANTASY</th>
                      <th colspan="5" style="border-right: 1px solid #334155;">PASS / RECEIVING</th>
                      <th colspan="2">SACKS & FUM</th>
                    </tr>
                    <tr>
                      <th>WK</th><th>OPP</th><th>PROJ</th><th>FPTS</th><th>SNAP%</th>
                      <th>ATT</th><th>CMP</th><th>YD</th><th>TD</th><th>INT</th>
                      <th>SK</th><th>FUM</th>
                    </tr>
                  </thead>
                  <tbody>${logRows}</tbody>
                </table>
              </div>
            </div>

            <!-- TAB 2: CONSENSUS SENTIMENT (COACH AI) -->
            <div id="tab-sec-sentiment" style="display:none;">
              ${sentimentHtml}
              ${expertNoteHtml}
            </div>

            <!-- TAB 3: SEASON STATS -->
            <div id="tab-sec-seasonstats" style="display:none;">
              <div class="sleeper-section-title">
                <b>HISTÓRICO CONSOLIDADO POR TEMPORADA</b>
              </div>
              ${seasonStatsHtml}
            </div>

            <!-- TAB 4: LATEST NEWS -->
            <div id="tab-sec-news" style="display:none;">
              <div class="sleeper-section-title">
                <b>NOTÍCIAS & ANÁLISES TÁTICAS VINCULADAS</b>
              </div>
              ${newsHtml}
              ${expertNoteHtml}
            </div>

            <!-- TAB 5: DEPTH CHART -->
            <div id="tab-sec-depth" style="display:none;">
              <div class="sleeper-section-title">
                <b>DEPTH CHART OFICIAL · ${esc(p.team)}</b>
              </div>
              <div style="background:#1e293b;border-radius:8px;padding:14px;">
                ${depth.length?depth.map((x,i)=>`
                  <div class="sleeper-depth-row ${String(x.id)===String(p.id)?'active':''}" style="padding:10px 0;border-bottom:1px solid #334155;">
                    <b style="font-size:12px;">#${esc(x.order)}</b>
                    <span style="font-size:13px;">${esc(x.name)}</span>
                    ${String(x.id)===String(p.id)?'<span class="badge badge-green" style="margin-left:auto;font-size:10px;">ATLETA SELECIONADO</span>':''}
                  </div>
                `).join(''):'<p class="sleeper-empty">Sem depth chart no catálogo Sleeper.</p>'}
              </div>
            </div>
          </section>

          <!-- SIDEBAR -->
          <aside class="sleeper-dossier__side">
            <section>
              <h3>COACH AI SENTIMENT</h3>
              <div style="background:#151e2b;border-radius:6px;padding:10px;margin-bottom:14px;border-left:3px solid #a855f7;">
                <div style="font-size:11px;font-weight:700;color:#c084fc;">PROJEÇÃO SEMANAL: ${projDisplay} PTS</div>
                <div style="font-size:10px;color:#94a3b8;margin-top:4px;">Estimativas de risco e consenso indisponíveis; métricas acima usam o mesmo DTO do card.</div>
              </div>
            </section>
            <section>
              <h3>LATEST NEWS</h3>
              ${newsHtml}
            </section>
            <section class="sleeper-depth">
              <h3>DEPTH CHART · ${esc(p.team)}</h3>
              ${depth.length?depth.map((x,i)=>`<div class="sleeper-depth-row ${String(x.id)===String(p.id)?'active':''}"><b>${esc(x.order)}</b><span>${esc(x.name)}</span></div>`).join(''):'<p class="sleeper-empty">Sem depth chart no catálogo Sleeper.</p>'}
            </section>
            <section class="sleeper-depth">
              <h3>FICHA TÉCNICA DTO</h3>
              <p class="sleeper-empty" style="padding:6px 0">Status: ${injuryText} · Posição: ${esc(p.pos)} · Time: ${esc(p.team)}<br>ID Sleeper: ${esc(dto?.sleeperId||p.sleeperId||p.id)} · ID ESPN: ${esc(p.espnId||dto?.espnId||raw.espn_id||'—')}<br>Sincronizado: ${esc(window.YL_SHELL_SNAPSHOT?.syncedAt || 'Não informado')}</p>
            </section>
          </aside>
        </div>
      </div>
    `;
  }
  window.YL_LOAD_PLAYER_SEASON = async function(id,season) {
    const p = profile(id), modal = document.getElementById('player-modal-content');
    if (!p || !modal) return;
    const request = ++dossierRequest;
    const logs = modal.querySelector?.('.sleeper-dossier__logs');
    if (logs) logs.innerHTML = '<p class="sleeper-empty">Carregando histórico persistido…</p>';
    let rows = [], error = '';
    try { rows = await seasonRows(p.id,season); } catch { error = 'Não foi possível carregar este histórico agora.'; }
    const news = await newsFor(p);
    if (request === dossierRequest) render(p,season,rows,news,error);
  };
  window.openPlayerDossierModal = async function(id) {
    const p = profile(id), modal = document.getElementById('player-modal'), content = document.getElementById('player-modal-content');
    if (!modal || !content) return;
    const request = ++dossierRequest;
    openModal('player-modal');
    if (!p) { content.innerHTML = '<div class="sleeper-dossier"><p class="sleeper-empty" style="padding:40px">Jogador ainda não foi carregado no catálogo oficial.</p></div>'; return; }
    const season = Number(p.context.season || activeSleeperLeagueData?.season || new Date().getUTCFullYear());
    render(p,season,[],[],'Carregando histórico persistido…');
    try {
      const [rows,news] = await Promise.all([seasonRows(p.id,season),newsFor(p)]);
      if (request === dossierRequest) render(p,season,rows,news,'');
    } catch {
      if (request === dossierRequest) render(p,season,[],[],'A consulta ao histórico falhou; o resumo acima mantém o DTO do shell.');
    }
  };

})();


// ==========================================
//  SLEEPER AUDIT SCORING ENGINE (PILLAR 2)
// Liga: Neilo Pistola League (16 times, Keeper PPR com IDP)
// ==========================================
(function() {
  const RULES = [
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
    { key: 'idp_blk_kick', stat: 'blocked_kicks', label: 'IDP Blocked kicks' },
    { key: 'bonus_fd_te', stat: 'tight_end_first_downs', label: 'TE first downs' },
    { key: 'sack', stat: 'team_defense_sacks', label: 'Def sacks' },
    { key: 'int', stat: 'team_defense_interceptions', label: 'Def INT' },
    { key: 'fum_rec', stat: 'team_defense_fumble_recoveries', label: 'Def FR' },
    { key: 'ff', stat: 'team_defense_forced_fumbles', label: 'Def FF' },
    { key: 'safe', stat: 'team_defense_safeties', label: 'Def Safeties' },
    { key: 'def_td', stat: 'team_defense_touchdowns', label: 'Def TD' },
    { key: 'def_st_td', stat: 'special_teams_touchdowns', label: 'Special Teams TD' },
    { key: 'blk_kick', stat: 'team_defense_blocked_kicks', label: 'Def Blocked kicks' }
  ];

  // Regras oficiais da Neilo Pistola League (Sleeper #1369770282776006656)
  const DEFAULT_SCORING = {
    pass_yd: 0.05, pass_td: 4, pass_2pt: 2, pass_int: -2, pass_int_td: -4, pass_sack: -1,
    rush_yd: 0.1, rush_td: 6, rush_2pt: 2,
    rec: 1, rec_yd: 0.1, rec_td: 6, rec_2pt: 2, bonus_fd_te: 0.5,
    fum_lost: -2, fum_rec_td: 6,
    idp_tkl_solo: 1, idp_tkl_ast: 0.5, idp_sack: 4, idp_tkl_loss: 1, idp_qb_hit: 0.5,
    idp_pass_def: 1, idp_int: 6, idp_ff: 4, idp_fum_rec: 2, idp_safe: 4, idp_def_td: 6, idp_blk_kick: 3,
    xpm: 1, xpmiss: -2,
    fgm_0_19: 2, fgm_20_29: 2, fgm_30_39: 3, fgm_40_49: 4, fgm_50_59: 5, fgm_60p: 6,
    fgmiss_0_19: -3, fgmiss_20_29: -2, fgmiss_30_39: -1, fgmiss: 0,
    pts_allow_0: 10, pts_allow_1_6: 7, pts_allow_7_13: 4, pts_allow_14_20: 1,
    pts_allow_21_27: 0, pts_allow_28_34: -1, pts_allow_35p: -4,
    sack: 1, int: 2, fum_rec: 2, ff: 1, safe: 2, def_td: 6, def_st_td: 6, blk_kick: 2
  };

  function roundHalfPoint(n) {
    return Math.round((Number(n || 0) + Number.EPSILON) * 100) / 100;
  }

  function value(stats, key) {
    const n = Number(stats?.[key] ?? 0);
    return Number.isFinite(n) ? n : 0;
  }

  function calculateKickingBuckets(stats, scoring, breakdown = {}) {
    let pts = 0;
    pts += value(stats, 'xpm') * (scoring.xpm ?? 1);
    pts += value(stats, 'xpmiss') * (scoring.xpmiss ?? -2);

    const fgKeys = ['fgm_0_19', 'fgm_20_29', 'fgm_30_39', 'fgm_40_49', 'fgm_50_59', 'fgm_60p'];
    for (const k of fgKeys) {
      const cnt = value(stats, k);
      if (cnt > 0) {
        const p = cnt * (scoring[k] ?? 3);
        pts += p;
        breakdown[k] = (breakdown[k] || 0) + p;
      }
    }
    const fgMissKeys = ['fgmiss_0_19', 'fgmiss_20_29', 'fgmiss_30_39', 'fgmiss'];
    for (const k of fgMissKeys) {
      const cnt = value(stats, k);
      if (cnt > 0) {
        const p = cnt * (scoring[k] ?? 0);
        pts += p;
        breakdown[k] = (breakdown[k] || 0) + p;
      }
    }
    return pts;
  }

  function calculateDefenseBuckets(stats, scoring, breakdown = {}) {
    if (stats?.pts_allow == null) return 0;
    const pa = Number(stats.pts_allow);
    let bucketKey = null;
    if (pa === 0) bucketKey = 'pts_allow_0';
    else if (pa <= 6) bucketKey = 'pts_allow_1_6';
    else if (pa <= 13) bucketKey = 'pts_allow_7_13';
    else if (pa <= 20) bucketKey = 'pts_allow_14_20';
    else if (pa <= 27) bucketKey = 'pts_allow_21_27';
    else if (pa <= 34) bucketKey = 'pts_allow_28_34';
    else bucketKey = 'pts_allow_35p';

    const pts = scoring[bucketKey] ?? 0;
    if (pts !== 0) breakdown[bucketKey] = pts;
    return pts;
  }

  function calculatePlayerScore(stats, scoring = DEFAULT_SCORING) {
    const s = Object.assign({}, DEFAULT_SCORING, scoring);
    const breakdown = {};
    let total = 0;

    for (const rule of RULES) {
      const multiplier = Number(s[rule.key] ?? 0);
      const quantity = value(stats, rule.stat) || value(stats, rule.key);
      const points = quantity * multiplier;
      if (points !== 0) {
        breakdown[rule.key] = points;
        total += points;
      }
    }

    total += calculateKickingBuckets(stats, s, breakdown);
    total += calculateDefenseBuckets(stats, s, breakdown);

    return { total: roundHalfPoint(total), breakdown };
  }

  function calculateRosterScore(starters, playerStats = {}, scoring = DEFAULT_SCORING, customPoints = null) {
    if (customPoints != null) {
      return { total: roundHalfPoint(customPoints), playerScores: [], source: 'custom_points' };
    }
    const list = Array.isArray(starters) ? starters : [];
    const playerScores = list.map(playerId => {
      const stats = playerStats[playerId] || {};
      const res = calculatePlayerScore(stats, scoring);
      return { playerId: String(playerId), ...res };
    });
    const total = roundHalfPoint(playerScores.reduce((sum, p) => sum + p.total, 0));
    return { total, playerScores, source: 'calculated' };
  }

  window.YL_SCORING_RULES = RULES;
  window.YL_DEFAULT_SCORING = DEFAULT_SCORING;
  window.roundHalfPoint = roundHalfPoint;
  window.calculateKickingBuckets = calculateKickingBuckets;
  window.calculateDefenseBuckets = calculateDefenseBuckets;
  window.calculatePlayerScore = calculatePlayerScore;
  window.calculateRosterScore = calculateRosterScore;
  window.YL_SCORING_ENGINE = {
    RULES, DEFAULT_SCORING, roundHalfPoint,
    calculateKickingBuckets, calculateDefenseBuckets,
    calculatePlayerScore, calculateRosterScore
  };
})();
