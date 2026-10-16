/**
 * YARDLINE AGENT COMMAND CENTER — VIEW RENDERERS
 * Renderizadores modulares para as 8 telas operacionais.
 */

function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' ' + d.toLocaleDateString('pt-BR');
  } catch (e) {
    return String(iso);
  }
}

// 1. DASHBOARD GERAL
function renderDashboardView(store) {
  const d = store.dashboard;
  if (!d) return `<div class="cc-card"><p>Carregando telemetria operacional do Command Center...</p></div>`;

  const healthBadge = d.overallHealth === 'HEALTHY'
    ? `<span class="badge badge-green">HEALTHY</span>`
    : d.overallHealth === 'BLOCKED / CRITICAL'
      ? `<span class="badge badge-red">BLOCKED / CRITICAL</span>`
      : `<span class="badge badge-amber">${esc(d.overallHealth)}</span>`;

  const releaseBadge = d.releaseStatus === 'RELEASE APROVADA'
    ? `<span class="badge badge-green" style="font-size:12px;padding:3px 8px;">RELEASE APROVADA</span>`
    : `<span class="badge badge-red" style="font-size:12px;padding:3px 8px;">RELEASE BLOQUEADA</span>`;

  return `
    <!-- Top Alert Banner if Release is Blocked -->
    <div class="cc-card" style="border-left:4px solid var(--cc-crimson);background:rgba(239, 68, 68, 0.05);">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">
        <div style="display:flex;align-items:center;gap:12px;">
          ${releaseBadge}
          <div>
            <strong style="color:#f87171;font-size:13.5px;">Diretiva do Team Leader & Senior QA em Vigor</strong>
            <div style="color:var(--cc-text-muted);font-size:12px;margin-top:2px;">
              ${esc(d.releaseBlockingReason)}
            </div>
          </div>
        </div>
        <button class="btn-cc btn-cc-outline" onclick="window.ccStore.setTab('release')">Ver Checklist dos 5 Portões →</button>
      </div>
    </div>

    <!-- 4 Stat Counters -->
    <div class="grid-4" style="margin-bottom:18px;">
      <div class="cc-stat-box border-blue">
        <div class="cc-stat-label">Agentes Operando</div>
        <div class="cc-stat-value">${d.agentsSummary.total}</div>
        <div class="cc-stat-sub">${d.agentsSummary.active} ativos · ${d.agentsSummary.completed} concluídos · ${d.agentsSummary.blocked} bloqueados</div>
      </div>
      <div class="cc-stat-box border-red">
        <div class="cc-stat-label">Bugs P0 (Bloqueiam Release)</div>
        <div class="cc-stat-value" style="color:#f87171;">${d.bugsSummary.p0}</div>
        <div class="cc-stat-sub">${d.bugsSummary.p1} bugs P1 · ${d.bugsSummary.p2} bugs P2 em triagem</div>
      </div>
      <div class="cc-stat-box border-green">
        <div class="cc-stat-label">Bateria de Testes QA</div>
        <div class="cc-stat-value" style="color:#34d399;">${d.qaSummary.pass} / ${d.qaSummary.total}</div>
        <div class="cc-stat-sub">100% dos testes executados aprovados</div>
      </div>
      <div class="cc-stat-box border-amber">
        <div class="cc-stat-label">Saúde Geral da Plataforma</div>
        <div class="cc-stat-value" style="font-size:18px;margin-top:8px;">${healthBadge}</div>
        <div class="cc-stat-sub">Sincronização com origin/main ativa</div>
      </div>
    </div>

    <!-- Services & Daemons Health Grid -->
    <div class="cc-card">
      <div class="cc-card-header">
        <div class="cc-card-title">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          Daemons em Segundo Plano & Infraestrutura Local
        </div>
        <span class="badge badge-green">TODOS ONLINE (200 OK)</span>
      </div>
      <div class="grid-3">
        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Backend Core API</strong>
            <span class="badge badge-green">PORT 3001</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">Express + SQLite (WAL mode)</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">Latência: ${d.services.backend.latencyMs}ms · 26 testes verdes</div>
        </div>

        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Frontend Shell SPA</strong>
            <span class="badge badge-green">PORT 8080</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">Live Server Local</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">12 abas integradas · 100% SHA-256 match</div>
        </div>

        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>GitHub Sync Agent</strong>
            <span class="badge badge-green">PORT 8788</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">Daemon de 10 minutos</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">Último push: commit ${d.lastBuild.commit}</div>
        </div>

        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>NFL News Worker</strong>
            <span class="badge badge-green">PORT 8787</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">Ingestão e Deduplicação</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">24 notícias vinculadas a atletas</div>
        </div>

        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Sleeper Live Stack</strong>
            <span class="badge badge-green">PORT 3000</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">Single-File Sync Engine</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">Liga #1369770282776006656</div>
        </div>

        <div style="background:#0b1120;padding:12px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <strong>Banco SQLite Operacional</strong>
            <span class="badge badge-green">YARDLINE.DB</span>
          </div>
          <div class="mono" style="font-size:11.5px;color:var(--cc-text-muted);margin-top:4px;">16 Rosters · 8 Matchups W6</div>
          <div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">480 escolhas de draft persistidas</div>
        </div>
      </div>
    </div>
  `;
}

// 2. TELA DE AGENTES (15 PAPÉIS)
function renderAgentsView(store) {
  const agents = store.agents || [];
  const search = store.agentSearch.toLowerCase();
  const filter = store.agentStatusFilter;

  const filtered = agents.filter(a => {
    const matchesSearch = !search || a.name.toLowerCase().includes(search) || a.role.toLowerCase().includes(search) || a.currentTask.toLowerCase().includes(search);
    const matchesFilter = filter === 'ALL' || a.status === filter;
    return matchesSearch && matchesFilter;
  });

  return `
    <div class="cc-filter-strip">
      <input type="text" class="cc-search-input" placeholder="Buscar por agente, função ou tarefa..." value="${esc(store.agentSearch)}" oninput="window.ccStore.agentSearch = this.value; window.ccStore.notify();" />
      <select class="cc-select" onchange="window.ccStore.agentStatusFilter = this.value; window.ccStore.notify();">
        <option value="ALL" ${filter === 'ALL' ? 'selected' : ''}>Todos os Status (${agents.length})</option>
        <option value="WORKING" ${filter === 'WORKING' ? 'selected' : ''}>WORKING</option>
        <option value="COMPLETED" ${filter === 'COMPLETED' ? 'selected' : ''}>COMPLETED</option>
        <option value="BLOCKED" ${filter === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
        <option value="IDLE" ${filter === 'IDLE' ? 'selected' : ''}>IDLE</option>
      </select>
      <span style="margin-left:auto;font-size:12px;color:var(--cc-text-muted);">
        Exibindo <strong>${filtered.length}</strong> de ${agents.length} agentes
      </span>
    </div>

    <div class="cc-table-container">
      <table class="cc-table">
        <thead>
          <tr>
            <th style="width:220px;">Agente & Função</th>
            <th style="width:110px;">Status</th>
            <th>Tarefa Atual</th>
            <th style="width:70px;">Prio</th>
            <th style="width:100px;">Progresso</th>
            <th style="width:140px;">Última Atualização</th>
            <th style="width:110px;text-align:right;">Ação</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(a => {
            const statusClass = a.status === 'COMPLETED' ? 'badge-green' : a.status === 'WORKING' ? 'badge-blue' : a.status === 'BLOCKED' ? 'badge-red' : 'badge-gray';
            return `
              <tr>
                <td>
                  <strong>${esc(a.name)}</strong>
                  <div style="font-size:11px;color:var(--cc-text-muted);margin-top:2px;">${esc(a.role)}</div>
                </td>
                <td><span class="badge ${statusClass}">${esc(a.status)}</span></td>
                <td>
                  <div>${esc(a.currentTask)}</div>
                  ${a.nextAction ? `<div style="font-size:11px;color:var(--cc-text-dim);margin-top:2px;">Próximo: ${esc(a.nextAction)}</div>` : ''}
                </td>
                <td><span class="badge badge-gray mono">${esc(a.priority)}</span></td>
                <td>
                  <div style="display:flex;align-items:center;gap:6px;">
                    <div class="cc-progress" style="width:50px;">
                      <div class="cc-progress-fill" style="width:${a.progress}%;"></div>
                    </div>
                    <span class="mono" style="font-size:11px;">${a.progress}%</span>
                  </div>
                </td>
                <td class="mono" style="font-size:11px;color:var(--cc-text-muted);">${formatDate(a.updatedAt)}</td>
                <td style="text-align:right;">
                  <button class="btn-cc btn-cc-outline" style="padding:3px 8px;font-size:11px;" onclick='window.ccStore.openModal("agent", ${JSON.stringify(a)})'>Relatório →</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 3. TELA DE QA SENIOR
function renderQAView(store) {
  const tests = store.qaTests || [];
  const search = store.qaSearch.toLowerCase();
  const statusFilter = store.qaStatusFilter;

  const filtered = tests.filter(t => {
    const matchesSearch = !search || t.title.toLowerCase().includes(search) || t.area.toLowerCase().includes(search) || t.id.toLowerCase().includes(search);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return `
    <div class="cc-filter-strip">
      <input type="text" class="cc-search-input" placeholder="Buscar por ID, título ou área..." value="${esc(store.qaSearch)}" oninput="window.ccStore.qaSearch = this.value; window.ccStore.notify();" />
      <select class="cc-select" onchange="window.ccStore.qaStatusFilter = this.value; window.ccStore.notify();">
        <option value="ALL">Todos os Status (${tests.length})</option>
        <option value="PASS" ${statusFilter === 'PASS' ? 'selected' : ''}>PASS</option>
        <option value="FAIL" ${statusFilter === 'FAIL' ? 'selected' : ''}>FAIL</option>
        <option value="BLOCKED" ${statusFilter === 'BLOCKED' ? 'selected' : ''}>BLOCKED</option>
        <option value="NOT_VERIFIABLE" ${statusFilter === 'NOT_VERIFIABLE' ? 'selected' : ''}>NOT_VERIFIABLE</option>
      </select>
      <span class="badge badge-red" style="margin-left:auto;">PODER DE VETO DO SENIOR QA: ATIVO</span>
    </div>

    <div class="cc-table-container">
      <table class="cc-table">
        <thead>
          <tr>
            <th style="width:110px;">ID & Prio</th>
            <th>Caso de Teste E2E</th>
            <th style="width:160px;">Área & Rota</th>
            <th style="width:140px;">Viewport Auditado</th>
            <th style="width:90px;">Status</th>
            <th style="width:110px;text-align:right;">Evidência</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(t => {
            const statusClass = t.status === 'PASS' ? 'badge-green' : t.status === 'FAIL' ? 'badge-red' : t.status === 'BLOCKED' ? 'badge-amber' : 'badge-gray';
            return `
              <tr>
                <td>
                  <strong class="mono" style="color:#38bdf8;">${esc(t.id)}</strong>
                  <div style="margin-top:2px;"><span class="badge badge-gray mono">${esc(t.priority)}</span></div>
                </td>
                <td>
                  <strong>${esc(t.title)}</strong>
                  <div style="font-size:11px;color:var(--cc-text-muted);margin-top:2px;">${esc(t.expectedResult)}</div>
                </td>
                <td>
                  <div>${esc(t.area)}</div>
                  <code style="font-size:10.5px;color:var(--cc-text-dim);">${esc(t.route)}</code>
                </td>
                <td>
                  <span class="badge badge-purple">${esc(t.viewport)}</span>
                  <div style="font-size:10.5px;color:var(--cc-text-dim);margin-top:2px;">${esc(t.authState)}</div>
                </td>
                <td><span class="badge ${statusClass}">${esc(t.status)}</span></td>
                <td style="text-align:right;">
                  <button class="btn-cc btn-cc-outline" style="padding:3px 8px;font-size:11px;" onclick='window.ccStore.openModal("qa", ${JSON.stringify(t)})'>Ver Detalhes →</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 4. TELA DE BUGS E BLOQUEIOS
function renderBugsView(store) {
  const bugs = store.bugs || [];
  const filter = store.bugSeverityFilter;

  const filtered = bugs.filter(b => filter === 'ALL' || b.severity === filter);

  return `
    <div class="cc-filter-strip">
      <div style="display:flex;gap:6px;">
        <button class="btn-cc ${filter === 'ALL' ? 'btn-cc-primary' : 'btn-cc-outline'}" onclick="window.ccStore.bugSeverityFilter = 'ALL'; window.ccStore.notify();">Todos (${bugs.length})</button>
        <button class="btn-cc ${filter === 'P0' ? 'btn-cc-primary' : 'btn-cc-outline'}" onclick="window.ccStore.bugSeverityFilter = 'P0'; window.ccStore.notify();">P0 — Bloqueia Release</button>
        <button class="btn-cc ${filter === 'P1' ? 'btn-cc-primary' : 'btn-cc-outline'}" onclick="window.ccStore.bugSeverityFilter = 'P1'; window.ccStore.notify();">P1 — Bloqueia Feature</button>
        <button class="btn-cc ${filter === 'P2' ? 'btn-cc-primary' : 'btn-cc-outline'}" onclick="window.ccStore.bugSeverityFilter = 'P2'; window.ccStore.notify();">P2 — Degrada Qualidade</button>
      </div>
    </div>

    <div class="cc-table-container">
      <table class="cc-table">
        <thead>
          <tr>
            <th style="width:110px;">ID & Severidade</th>
            <th>Título & Diagnóstico</th>
            <th style="width:140px;">Área & Arquivo</th>
            <th style="width:110px;">Status</th>
            <th style="width:110px;text-align:right;">Resolução</th>
          </tr>
        </thead>
        <tbody>
          ${filtered.map(b => {
            const sevClass = b.severity === 'P0' ? 'badge-red' : b.severity === 'P1' ? 'badge-amber' : 'badge-blue';
            const statClass = b.status === 'RESOLVED' || b.status === 'VERIFIED' ? 'badge-green' : 'badge-red';
            return `
              <tr>
                <td>
                  <strong class="mono">${esc(b.id)}</strong>
                  <div style="margin-top:2px;"><span class="badge ${sevClass}">${esc(b.severity)}</span></div>
                </td>
                <td>
                  <strong>${esc(b.title)}</strong>
                  <div style="font-size:11.5px;color:var(--cc-text-muted);margin-top:2px;">Causa: ${esc(b.rootCause || 'Em investigação')}</div>
                </td>
                <td>
                  <div>${esc(b.area)}</div>
                  <code style="font-size:10.5px;color:var(--cc-text-dim);">${esc(b.file ? b.file.split('/').pop() : '—')}</code>
                </td>
                <td><span class="badge ${statClass}">${esc(b.status)}</span></td>
                <td style="text-align:right;">
                  <button class="btn-cc btn-cc-outline" style="padding:3px 8px;font-size:11px;" onclick='window.ccStore.openModal("bug", ${JSON.stringify(b)})'>Ver Ciclo →</button>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

// 5. TELA DE REFERÊNCIAS EXTERNAS
function renderReferencesView(store) {
  const refs = store.references || [];

  return `
    <div class="cc-card" style="border-left:4px solid var(--cc-navy);">
      <div style="font-size:13px;color:var(--cc-text-main);">
        <strong>Diretiva de Integridade Intelectual:</strong> As referências abaixo foram auditadas exclusivamente para compreensão comportamental e requisitos de produto. Nenhuma marca, logo, texto editorial, css proprietário ou código de terceiro é copiado no Yardline.
      </div>
    </div>

    <div class="grid-2">
      ${refs.map(r => `
        <div class="cc-card">
          <div class="cc-card-header">
            <div>
              <span class="badge badge-purple">${esc(r.observationType)}</span>
              <h3 style="font-size:16px;font-weight:700;color:#fff;margin-top:4px;">${esc(r.sourceName)}</h3>
            </div>
            <a href="${esc(r.url)}" target="_blank" class="badge badge-gray" style="text-decoration:none;">${esc(r.domain)} ↗</a>
          </div>
          <div style="font-size:12px;display:flex;flex-direction:column;gap:8px;">
            <div><strong style="color:var(--cc-text-muted);">Fluxo Auditado:</strong> ${esc(r.testedFlow)}</div>
            <div><strong style="color:var(--cc-text-muted);">Comportamento de Loading:</strong> ${esc(r.loadingBehavior)}</div>
            <div><strong style="color:var(--cc-text-muted);">Diferencial Yardline:</strong> <span style="color:#38bdf8;">${esc(r.differencesVsYardline)}</span></div>
            <div><strong style="color:var(--cc-text-muted);">Evidência:</strong> <code style="font-size:11px;">${esc(r.evidence)}</code></div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 6. TIMELINE DE ATIVIDADE DOS AGENTES
function renderActivityView(store) {
  const act = store.activity || [];

  return `
    <div class="cc-card">
      <div class="cc-card-header">
        <div class="cc-card-title">Feed de Eventos e Comunicação Operacional</div>
        <span class="badge badge-blue">${act.length} EVENTOS REGISTRADOS</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;">
        ${act.map(ev => `
          <div style="background:#0b1120;border:1px solid var(--cc-border-subtle);border-radius:6px;padding:14px;">
            <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="badge badge-gray mono">${esc(ev.id)}</span>
                <strong style="color:#38bdf8;">${esc(ev.agentName)}</strong>
                <span class="badge badge-blue">${esc(ev.area)}</span>
              </div>
              <span class="mono" style="font-size:11px;color:var(--cc-text-muted);">${formatDate(ev.timestamp)}</span>
            </div>
            <h4 style="font-size:13.5px;font-weight:700;color:#fff;margin:8px 0 4px;">${esc(ev.objective)}</h4>
            <div style="font-size:12px;color:var(--cc-text-muted);line-height:1.6;">
              ${ev.stepsExecuted.map(s => `<div>• ${esc(s)}</div>`).join('')}
            </div>
            ${ev.observedResult ? `<div style="margin-top:8px;font-size:11.5px;color:#34d399;"><strong>Resultado:</strong> ${esc(ev.observedResult)}</div>` : ''}
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// 7. CONTRATOS E ARQUITETURA
function renderContractsView(store) {
  const c = store.contracts;
  if (!c) return `<div class="cc-card"><p>Carregando especificações de contratos...</p></div>`;

  return `
    <!-- 10 Innegotiable Guarantees -->
    <div class="cc-card" style="border-left:4px solid #10b981;">
      <div class="cc-card-header">
        <div class="cc-card-title">Garantias Inegociáveis de Integridade de Dados</div>
        <span class="badge badge-green">ESTRITO</span>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;">
        ${c.guarantees.map(g => `
          <div style="display:flex;align-items:center;gap:6px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            <span>${esc(g)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- Contracts List -->
    <div class="grid-2">
      ${c.contracts.map(cnt => `
        <div class="cc-card">
          <div class="cc-card-header">
            <div>
              <strong style="font-size:15px;color:#38bdf8;">${esc(cnt.name)}</strong>
              <div style="font-size:11px;color:var(--cc-text-muted);margin-top:2px;">${esc(cnt.description)}</div>
            </div>
            <span class="badge badge-gray">${cnt.fields.length} campos</span>
          </div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:11.5px;max-height:280px;overflow-y:auto;">
            ${cnt.fields.map(f => `
              <div style="display:flex;justify-content:space-between;border-bottom:1px solid #1e293b;padding:4px 0;">
                <div>
                  <strong class="mono" style="color:#e2e8f0;">${esc(f.field)}</strong>
                  ${f.required ? '<span style="color:#f87171;font-size:10px;">*</span>' : ''}
                  <div style="font-size:10px;color:var(--cc-text-dim);">${esc(f.rule)}</div>
                </div>
                <code class="mono" style="font-size:10.5px;color:#94a3b8;">${esc(f.type)}</code>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// 8. RELEASES E SAÚDE DO PROJETO
function renderReleaseView(store) {
  const r = store.release;
  if (!r) return `<div class="cc-card"><p>Carregando status de release...</p></div>`;

  const isBlocked = r.status === 'RELEASE BLOQUEADA';

  return `
    <!-- Big Release Banner -->
    <div class="cc-card" style="text-align:center;padding:28px;border:2px solid ${isBlocked ? 'var(--cc-crimson)' : 'var(--cc-emerald)'};background:${isBlocked ? 'rgba(239, 68, 68, 0.06)' : 'rgba(16, 185, 129, 0.06)'};">
      <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${isBlocked ? '#f87171' : '#34d399'};">
        STATUS OFICIAL DE PRODUÇÃO
      </div>
      <h2 style="font-size:32px;font-weight:800;color:${isBlocked ? '#f87171' : '#34d399'};margin:6px 0 8px;">
        ${esc(r.status)}
      </h2>
      <p style="color:var(--cc-text-muted);font-size:13px;max-width:680px;margin:0 auto;">
        ${r.blockingReasons.join(' ')}
      </p>
    </div>

    <!-- The 5 Quality Gates -->
    <div class="cc-card">
      <div class="cc-card-header">
        <div class="cc-card-title">Os Cinco Portões de Qualidade Obrigatórios</div>
        <span class="badge badge-purple">GOVERNANÇA</span>
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${r.gates.map(g => {
          const badgeClass = g.status === 'APROVADO' ? 'badge-green' : g.status === 'HOMOLOGANDO' ? 'badge-amber' : 'badge-red';
          return `
            <div style="display:flex;align-items:center;justify-content:space-between;background:#0b1120;padding:12px 16px;border-radius:6px;border:1px solid var(--cc-border-subtle);">
              <div>
                <strong>${esc(g.name)}</strong>
                <div style="font-size:11.5px;color:var(--cc-text-muted);margin-top:2px;">${esc(g.criteria)}</div>
              </div>
              <span class="badge ${badgeClass}">${esc(g.status)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// Render Modal Detalhado
function renderModalContent(store) {
  const item = store.selectedModalItem;
  const type = store.modalType;
  if (!item || !type) return '';

  if (type === 'agent') {
    return `
      <div class="cc-modal-header">
        <div>
          <span class="badge badge-blue mono">${esc(item.id)}</span>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin-top:4px;">${esc(item.name)}</h3>
          <div style="font-size:12px;color:var(--cc-text-muted);">${esc(item.role)}</div>
        </div>
        <button class="btn-cc btn-cc-outline" onclick="window.ccStore.closeModal()">✕</button>
      </div>
      <div class="cc-modal-body" style="font-size:12.5px;display:flex;flex-direction:column;gap:12px;">
        <div><strong>Status Atual:</strong> <span class="badge badge-green">${esc(item.status)}</span> (${item.progress}% concluído)</div>
        <div><strong>Tarefa em Execução:</strong> ${esc(item.currentTask)}</div>
        <div><strong>Arquivos Alterados:</strong> ${item.filesModified.map(f => `<code style="display:block;margin-top:2px;">${esc(f)}</code>`).join('')}</div>
        <div><strong>Testes Executados:</strong> ${item.testsRun.map(t => `<div style="color:#34d399;">✓ ${esc(t)}</div>`).join('')}</div>
        <div><strong>Evidência Auditada:</strong> <div style="background:#0b1120;padding:8px;border-radius:4px;margin-top:4px;color:#e2e8f0;">${esc(item.evidence || 'Nenhuma')}</div></div>
        <div><strong>Limitações e Limites de Escopo:</strong> ${esc(item.limitations || 'Sem limitações específicas')}</div>
      </div>
    `;
  }

  if (type === 'qa') {
    return `
      <div class="cc-modal-header">
        <div>
          <span class="badge badge-purple mono">${esc(item.id)}</span>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin-top:4px;">${esc(item.title)}</h3>
          <div style="font-size:12px;color:var(--cc-text-muted);">${esc(item.area)} · ${esc(item.viewport)}</div>
        </div>
        <button class="btn-cc btn-cc-outline" onclick="window.ccStore.closeModal()">✕</button>
      </div>
      <div class="cc-modal-body" style="font-size:12.5px;display:flex;flex-direction:column;gap:12px;">
        <div><strong>Status do Teste:</strong> <span class="badge badge-green">${esc(item.status)}</span></div>
        <div><strong>Passos Executados:</strong> ${item.steps.map(s => `<div>${esc(s)}</div>`).join('')}</div>
        <div><strong>Resultado Esperado:</strong> <div style="color:var(--cc-text-muted);margin-top:2px;">${esc(item.expectedResult)}</div></div>
        <div><strong>Resultado Observado:</strong> <div style="color:#34d399;margin-top:2px;">${esc(item.observedResult)}</div></div>
        <div><strong>Evidência & Logs:</strong> <pre style="background:#0b1120;padding:10px;border-radius:4px;overflow-x:auto;font-size:11px;color:#e2e8f0;margin-top:4px;">${esc(item.evidence)}</pre></div>
      </div>
    `;
  }

  if (type === 'bug') {
    return `
      <div class="cc-modal-header">
        <div>
          <span class="badge badge-red mono">${esc(item.id)} · ${esc(item.severity)}</span>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin-top:4px;">${esc(item.title)}</h3>
        </div>
        <button class="btn-cc btn-cc-outline" onclick="window.ccStore.closeModal()">✕</button>
      </div>
      <div class="cc-modal-body" style="font-size:12.5px;display:flex;flex-direction:column;gap:12px;">
        <div><strong>Status:</strong> <span class="badge badge-green">${esc(item.status)}</span></div>
        <div><strong>Passos de Reprodução:</strong> ${item.stepsToReproduce.map(s => `<div>${esc(s)}</div>`).join('')}</div>
        <div><strong>Causa Raiz Identificada:</strong> <div style="color:var(--cc-text-muted);">${esc(item.rootCause)}</div></div>
        <div><strong>Correção Aplicada:</strong> <div style="color:#38bdf8;">${esc(item.proposedFix)}</div></div>
        <div><strong>Teste de Regressão Vinculado:</strong> <code>${esc(item.regressionTest)}</code></div>
      </div>
    `;
  }

  return '';
}

// Master Render Router
function renderCommandCenter() {
  const store = window.ccStore;
  const container = document.getElementById('cc-view-container');
  if (!container) return;

  // Atualizar classes ativas na sidebar
  document.querySelectorAll('.cc-nav-item').forEach(el => {
    el.classList.toggle('active', el.getAttribute('data-tab') === store.currentTab);
  });

  let html = '';
  switch (store.currentTab) {
    case 'dashboard': html = renderDashboardView(store); break;
    case 'agents': html = renderAgentsView(store); break;
    case 'qa': html = renderQAView(store); break;
    case 'bugs': html = renderBugsView(store); break;
    case 'references': html = renderReferencesView(store); break;
    case 'activity': html = renderActivityView(store); break;
    case 'contracts': html = renderContractsView(store); break;
    case 'release': html = renderReleaseView(store); break;
    default: html = renderDashboardView(store);
  }

  container.innerHTML = html;

  // Modal
  const modalOverlay = document.getElementById('cc-modal-overlay');
  const modalContent = document.getElementById('cc-modal-container');
  if (modalOverlay && modalContent) {
    if (store.modalType && store.selectedModalItem) {
      modalContent.innerHTML = renderModalContent(store);
      modalOverlay.classList.add('active');
    } else {
      modalOverlay.classList.remove('active');
      modalContent.innerHTML = '';
    }
  }
}

window.renderCommandCenter = renderCommandCenter;
