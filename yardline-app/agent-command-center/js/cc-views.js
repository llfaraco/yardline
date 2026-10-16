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

function renderPlayerDossierReference(store) {
  const references = store.orchestration?.playerDossierReference || store.contracts?.playerDossierReference;
  const contract = store.orchestration?.dossierContract || store.contracts?.dossierContract;
  if (!references || !contract) return '<div class="cc-card">Referência do dossier / Bijan Robinson: NOT_VERIFIABLE — contrato ainda indisponível.</div>';
  const documents = Object.entries(references).map(([kind, doc]) => {
    // Endpoint is locally constructed from a fixed allowlist, never an external evidence URL.
    const href = `${store.apiBase || '/api/command-center'}/player-dossier/${kind === 'audit' ? 'audit' : 'handoff'}`;
    return `<p><strong>${esc(doc.title)}</strong> · ${esc(doc.status)}<br><code>${esc(doc.path)}</code>${doc.available ? ` · <a href="${esc(href)}" target="_blank" rel="noopener noreferrer">Ler documento versionado</a>` : ' · Arquivo não fornecido; não inventar observações.'}</p>`;
  }).join('');
  return `<div class="cc-card"><div class="cc-card-header"><strong>Bijan Robinson · contrato do dossier profundo</strong><span class="badge badge-amber">Team Leader → Antigravity</span></div>
    ${documents}<p>Classificação da referência: <strong>OBSERVED / INFERRED / NOT_VERIFIABLE</strong>. Disponibilidade do relatório não é PASS atual de Yardline.</p>
    <p><strong>Oito contextos esperados:</strong> ${(contract.requiredTabs || []).map(esc).join(' · ')}. Equivalentes combinados explícitos podem compartilhar uma aba; QA registra os botões reais.</p>
    <p><strong>Mescla:</strong> sidebar de liga/roster/jogadores recentes, hero, tabs, sentiment explicável, expert note, logs e stats. Sleeper = liga/roster/scoring; Yardline = cálculos; NFL/Yahoo = editorial.</p>
    <p>Revisar correções de harness antes de distribuir. RETRACTED não é VERIFIED de produto. Nenhum dossier completo foi implementado por esta correção.</p>
  </div>`;
}

// 1. DASHBOARD GERAL
function renderDashboardView(store) {
  const d = store.dashboard;
  if (!d) return `<div class="cc-card">${esc(store.lastTransportError || 'Aguardando telemetria real; nenhum PASS presumido.')}</div>`;
  const cycle = d.lastCycle;
  return `<div class="cc-card">
    <div class="cc-card-header"><strong>Monitoramento recorrente / read-only</strong><span class="badge ${d.liveState === 'LIVE' ? 'badge-blue' : 'badge-amber'}">${esc(d.liveState)}</span></div>
    <p>Cadência ${esc(d.cadenceMinutes)} min · depende do runtime online. ${esc(d.releaseStatus)}</p>
    <p><strong>Último ciclo real:</strong> <code>${esc(cycle?.cycleId || 'Nenhum')}</code> · ${esc(cycle?.status || 'NOT_VERIFIABLE')}</p>
    <p>Início ${formatDate(cycle?.startedAt)} · Fim ${formatDate(cycle?.finishedAt)} · Commit <code>${esc(cycle?.currentCommit || 'Não observado')}</code></p>
    <p><strong>Último erro:</strong> ${esc(store.lastTransportError || d.lastError || 'Nenhum erro registrado no último ciclo')}</p>
    <p>${esc(d.releaseBlockingReason)}</p>
    <p>Estado do agente não é resultado QA. Polling/JSDOM não confirma login, fluxo privado, viewport real ou 100% de cobertura.</p>
  </div>
  <div class="grid-4">
    <div class="cc-stat-box border-blue"><div class="cc-stat-label">Agentes contínuos</div><div class="cc-stat-value">${d.agentsSummary.total}</div><div>${d.agentsSummary.active} trabalhando/revisando · ${d.agentsSummary.blocked} dependências/bloqueados</div></div>
    <div class="cc-stat-box border-red"><div class="cc-stat-label">Handoffs abertos</div><div class="cc-stat-value">${d.handoffsSummary.open}</div><div>${d.handoffsSummary.reopened} reabertos históricos · ${d.handoffsSummary.reopenedInLastCycle} neste ciclo</div></div>
    <div class="cc-stat-box border-green"><div class="cc-stat-label">QA atual</div><div class="cc-stat-value">${d.qaSummary.pass}/${d.qaSummary.total}</div><div>${d.qaSummary.fail} FAIL · ${d.qaSummary.blocked} BLOCKED · ${d.qaSummary.notVerifiable} NOT_VERIFIABLE</div></div>
    <div class="cc-stat-box border-amber"><div class="cc-stat-label">Veto P0/P1</div><div class="cc-stat-value">${d.bugsSummary.p0}/${d.bugsSummary.p1}</div><div>${esc(d.overallHealth)}</div></div>
  </div>
  <div class="cc-card"><strong>Infraestrutura observada, sem presumir daemons online</strong>
    ${Object.entries(d.services).map(([name, service]) => `<p>${esc(name)}: <span class="badge badge-gray">${esc(service.status)}</span> ${service.latencyMs == null ? '' : `${esc(service.latencyMs)} ms`}${service.metrics ? ` · ${esc(JSON.stringify(service.metrics))}` : ''}</p>`).join('')}
    <p>GitHub: fetch separado de implementação; commit/push somente revisados manualmente.</p>
  </div>${renderHandoffsView(store, true)}`;
}

// 2. TELA DE AGENTES (15 PAPÉIS)
function renderAgentsView(store) {
  const agents = store.agents || [];
  const search = store.agentSearch.toLowerCase();
  const filtered = agents.filter(a => (!search || `${a.name} ${a.role} ${a.currentTask}`.toLowerCase().includes(search)) && (store.agentStatusFilter === 'ALL' || a.status === store.agentStatusFilter));
  return `<div class="cc-filter-strip">
    <input class="cc-search-input" placeholder="Buscar agente/mission..." value="${esc(store.agentSearch)}" oninput="window.ccStore.agentSearch=this.value;window.ccStore.notify()">
    <select class="cc-select" onchange="window.ccStore.agentStatusFilter=this.value;window.ccStore.notify()">${['ALL','WORKING','BLOCKED','NEEDS_REVIEW','WAITING_DEPENDENCY'].map(status => `<option ${status === store.agentStatusFilter ? 'selected' : ''}>${status}</option>`).join('')}</select>
    <span>Estado de execução ≠ QA. COMPLETED não é estado de ciclo contínuo.</span>
  </div><div class="cc-table-container"><table class="cc-table"><thead><tr><th>Agente / mission</th><th>Agente / freshness</th><th>QA</th><th>Cadência / referência</th><th>Handoffs / Antigravity</th><th>Última execução / erro</th><th>Evidência</th></tr></thead><tbody>
  ${filtered.map(a => `<tr>
    <td><strong>${esc(a.name)}</strong><div>${esc(a.currentTask)}</div><small>Próximo: ${esc(a.nextAction)}</small></td>
    <td><span class="badge ${a.status === 'BLOCKED' ? 'badge-red' : 'badge-blue'}">${esc(a.status)}</span><br><span class="badge ${a.liveState === 'LIVE' ? 'badge-blue' : 'badge-amber'}">${esc(a.liveState)}</span></td>
    <td><span class="badge ${a.qaResult === 'PASS' ? 'badge-green' : a.qaResult === 'FAIL' ? 'badge-red' : 'badge-gray'}">${esc(a.qaResult)}</span></td>
    <td>${esc(a.cadenceMinutes)} min<br>${(a.monitorTargets || []).map(esc).join('<br>')}</td>
    <td>${esc(a.openHandoffs)} abertos · ${esc(a.reopenedHandoffs)} reabertos<br>${esc(a.handoffTo)}</td>
    <td>${formatDate(a.updatedAt)}<br><code>${esc(a.cycleId || 'Sem ciclo')}</code><br>${esc(a.lastError || '—')}</td>
    <td><button class="btn-cc btn-cc-outline" onclick="window.ccStore.openItem('agent','${esc(a.id)}')">Ver evidência</button></td>
  </tr>`).join('')}</tbody></table></div>`;
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
                  <button class="btn-cc btn-cc-outline" style="padding:3px 8px;font-size:11px;" onclick="window.ccStore.openItem('qa','${esc(t.id)}')">Ver Detalhes →</button>
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
                  <button class="btn-cc btn-cc-outline" style="padding:3px 8px;font-size:11px;" onclick="window.ccStore.openItem('bug','${esc(b.id)}')">Ver Ciclo →</button>
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
  return `${renderPlayerDossierReference(store)}<div class="cc-card">GET público / read-only. OBSERVED é resposta observada; INFERRED é inferência/cache declarado; NOT_VERIFIABLE não é sucesso. Sem login, compra, cópia de assets ou execução de código proprietário.</div>
  ${(store.references || []).map(r => `<div class="cc-card"><div class="cc-card-header"><strong>${esc(r.name || r.sourceName)} · ${esc(r.domain)}</strong><span class="badge badge-purple">${esc(r.liveState)} / ${esc(r.observationType)} / ${esc(r.status)}</span></div><p>${esc(r.handoffTo)}</p>
    ${(r.checks || []).map(c => `<details><summary>${esc(c.id)} · ${esc(c.status)} · HTTP ${esc(c.httpStatus ?? '—')} · ${esc(c.latencyMs ?? '—')} ms · ${formatDate(c.checkedAt)}</summary>
      <p>URL: ${esc(c.url || 'Sem rota pública documentada')}</p><p>Erro: ${esc(c.error || '—')}</p><p>Freshness: ${esc(JSON.stringify(c.freshness))}</p><pre>${esc(JSON.stringify(c.evidence, null, 2))}</pre><p>${esc(c.limitations)}</p>
    </details>`).join('') || '<p>Nenhuma observação atual disponível.</p>'}
  </div>`).join('')}`;
}

function renderHandoffsView(store, compact = false) {
  const rows = (store.handoffs || []).filter(h => !compact || !['VERIFIED', 'RETRACTED'].includes(h.status));
  const retracted = (store.handoffs || []).filter(h => h.status === 'RETRACTED');
  return `${renderPlayerDossierReference(store)}<div class="cc-card"><div class="cc-card-header"><strong>Fila Team Leader → Antigravity</strong><span class="badge badge-amber">${rows.length} handoffs ${compact ? 'ativos' : 'registrados'}</span></div>
    <p>${retracted.length} falso(s) positivo(s) RETRACTED, com evidência/histórico preservados e fora da distribuição ativa. Não são correções VERIFIED de produto.</p>
    <p>ACK → IN_PROGRESS → VERIFIED exige QA fresco do check exato. Sem auto-implementação, auto-resolved ou auto-push. API de escrita: ${esc(store.orchestration?.handoffWriteAPI || 'Não verificada')}.</p>
    ${(compact ? rows.slice(0, 8) : rows).map(h => `<div class="cc-handoff-row"><strong>${esc(h.priority)} · ${esc(h.title)}</strong><span class="badge badge-gray">${esc(h.status)}</span>${h.reopenedCount ? `<span class="badge badge-amber">REABERTO ${esc(h.reopenedCount)}x</span>` : ''}<p>${esc(h.sourceAgent)} → ${esc(h.targetAgent)}</p><p>${esc(h.observed)}</p><small>${formatDate(h.updatedAt)} · ${esc(h.lastSeenCycleId)}</small><button class="btn-cc btn-cc-outline" onclick="window.ccStore.openItem('handoff','${esc(h.id)}')">Reprodução / evidência</button></div>`).join('') || '<p>Sem handoffs registrados; não implica QA aprovado.</p>'}
  </div>`;
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
    ${renderPlayerDossierReference(store)}
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

  if (type === 'handoff') {
    return `<div class="cc-modal-header"><h3>${esc(item.priority)} · ${esc(item.title)}</h3><button class="btn-cc btn-cc-outline" onclick="window.ccStore.closeModal()" aria-label="Fechar">X</button></div><div class="cc-modal-body"><p><strong>Estado:</strong> ${esc(item.status)} · Reaberturas ${esc(item.reopenedCount)}</p><p><strong>Check exato:</strong> <code>${esc(item.checkId)}</code> · ${esc(item.qaStatus || 'Legado: revisar evidência')} · ${esc(item.issueType || 'Revisão pendente')}</p><p>${esc(item.sourceAgent)} → ${esc(item.targetAgent)}</p><p><strong>Observado:</strong> ${esc(item.observed)}</p><p><strong>Esperado:</strong> ${esc(item.expected)}</p><p><strong>Reprodução:</strong></p>${item.reproduction.map(r => `<p>${esc(r)}</p>`).join('')}<p><strong>Arquivos:</strong> ${item.affectedFiles.map(esc).join(', ')}</p><pre>${esc(JSON.stringify(item.evidence, null, 2))}</pre><details><summary>Histórico de revisão / retratação (não é VERIFIED de produto)</summary><pre>${esc(JSON.stringify(item.reviewHistory || [], null, 2))}</pre></details><p><strong>Referências:</strong> ${(item.referenceDocuments || []).map(esc).join(' · ') || '—'}</p><p><strong>Próximo:</strong> ${esc(item.proposedNextStep)}</p><code>${esc(item.id)}</code></div>`;
  }

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
        <div><strong>Status Atual:</strong> <span class="badge badge-blue">${esc(item.status)}</span> · ${esc(item.liveState)} · QA ${esc(item.qaResult)}</div>
        <div><strong>Tarefa em Execução:</strong> ${esc(item.currentTask)}</div><div><strong>Cadência / Antigravity:</strong> ${esc(item.cadenceMinutes)} min · ${esc(item.handoffTo)}</div><div><strong>Último erro:</strong> ${esc(item.lastError || '—')}</div>
        <div><strong>Arquivos Alterados:</strong> ${item.filesModified.map(f => `<code style="display:block;margin-top:2px;">${esc(f)}</code>`).join('')}</div>
        <div><strong>Testes Executados:</strong> ${item.testsRun.map(t => `<div>${esc(t)}</div>`).join('')}</div>
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
    case 'handoffs': html = renderHandoffsView(store); break;
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
