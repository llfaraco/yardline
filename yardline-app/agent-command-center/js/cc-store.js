/** Client-side telemetry polling only; does not schedule or run persistent agents. */
const localHost = ['localhost', '127.0.0.1'].includes(location.hostname);
const API_BASE = window.CC_API_BASE || `${localHost && location.port === '8080' ? `${location.protocol}//${location.hostname}:3001` : location.origin}/api/command-center`;
class CommandCenterStore {
  constructor() {
    this.apiBase = API_BASE;
    this.currentTab = 'dashboard'; this.dashboard = null; this.agents = []; this.qaTests = []; this.bugs = []; this.references = []; this.activity = []; this.contracts = null; this.release = null;
    this.orchestration = null; this.handoffs = []; this.lastTransportError = null; this.syncCycle = null; this.loading = false;
    this.agentSearch = ''; this.agentStatusFilter = 'ALL'; this.qaSearch = ''; this.qaStatusFilter = 'ALL'; this.qaViewportFilter = 'ALL'; this.bugSeverityFilter = 'ALL'; this.bugStatusFilter = 'ALL'; this.activitySearch = ''; this.activityAgentFilter = 'ALL';
    this.selectedModalItem = null; this.modalType = null; this.listeners = [];
  }
  subscribe(listener) { this.listeners.push(listener); return () => { this.listeners = this.listeners.filter(l => l !== listener); }; }
  notify() { this.listeners.forEach(l => l(this)); }
  setTab(tab) { this.currentTab = tab; this.notify(); }
  openModal(type, item) { this.modalType = type; this.selectedModalItem = item; this.notify(); }
  openItem(type, id) { this.openModal(type, ({ agent: this.agents, qa: this.qaTests, bug: this.bugs, handoff: this.handoffs }[type] || []).find(item => item.id === id)); }
  closeModal() { this.modalType = null; this.selectedModalItem = null; this.notify(); }
  async fetchAll() {
    if (this.loading) return;
    this.loading = true;
    const fields = { dashboard: 'dashboard', agents: 'agents', qa: 'qaTests', bugs: 'bugs', references: 'references', activity: 'activity', contracts: 'contracts', release: 'release', orchestration: 'orchestration', handoffs: 'handoffs' };
    const errors = [];
    await Promise.all(Object.entries(fields).map(async ([route, key]) => {
      try {
        const response = await fetch(`${API_BASE}/${route}`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        if (!response.ok) throw new Error(`${route}: HTTP ${response.status}`);
        this[key] = await response.json();
      } catch (error) { errors.push(error.message); }
    }));
    this.lastTransportError = errors.length ? errors.join(' | ') : null;
    if (errors.length) {
      if (this.dashboard) this.dashboard = { ...this.dashboard, liveState: 'STALE', overallHealth: 'STALE', releaseStatus: 'RELEASE BLOQUEADA', releaseBlockingReason: `Telemetria indisponível: ${this.lastTransportError}` };
      this.agents = this.agents.map(a => ({ ...a, liveState: 'STALE', qaResult: 'NOT_VERIFIABLE' }));
      this.qaTests = this.qaTests.map(q => ({ ...q, status: 'NOT_VERIFIABLE', observedResult: `STALE: ${q.observedResult}` }));
      this.references = this.references.map(r => ({ ...r, liveState: 'STALE', status: 'NOT_VERIFIABLE', observationType: 'NOT_VERIFIABLE' }));
      if (this.release) this.release = { ...this.release, status: 'RELEASE BLOQUEADA', blockingReasons: [this.lastTransportError] };
    }
    this.loading = false; this.notify();
  }
  async triggerSync() {
    try {
      const response = await fetch(`${API_BASE}/sync`, { method: 'POST', signal: AbortSignal.timeout(8000) });
      const cycle = await response.json();
      if (!response.ok || !cycle.cycleId) throw new Error(cycle.error || 'Nenhum cycleId retornado');
      this.syncCycle = cycle;
      await this.fetchAll();
      return cycle;
    } catch (error) { this.lastTransportError = error.message; this.notify(); return null; }
  }
}
window.ccStore = new CommandCenterStore();
