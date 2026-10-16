/**
 * YARDLINE AGENT COMMAND CENTER — STORE & API CLIENT
 * Gerencia o estado e comunicação com /api/command-center.
 */

const API_BASE = 'http://127.0.0.1:3001/api/command-center';

class CommandCenterStore {
  constructor() {
    this.currentTab = 'dashboard';
    this.dashboard = null;
    this.agents = [];
    this.qaTests = [];
    this.bugs = [];
    this.references = [];
    this.activity = [];
    this.contracts = null;
    this.release = null;

    // Filtros
    this.agentSearch = '';
    this.agentStatusFilter = 'ALL';
    this.qaSearch = '';
    this.qaStatusFilter = 'ALL';
    this.qaViewportFilter = 'ALL';
    this.bugSeverityFilter = 'ALL';
    this.bugStatusFilter = 'ALL';
    this.activitySearch = '';
    this.activityAgentFilter = 'ALL';

    this.selectedModalItem = null;
    this.modalType = null;
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(l => l(this));
  }

  setTab(tab) {
    this.currentTab = tab;
    this.notify();
  }

  openModal(type, item) {
    this.modalType = type;
    this.selectedModalItem = item;
    this.notify();
  }

  closeModal() {
    this.modalType = null;
    this.selectedModalItem = null;
    this.notify();
  }

  async fetchAll() {
    try {
      const [dashRes, agentsRes, qaRes, bugsRes, refsRes, actRes, contRes, relRes] = await Promise.all([
        fetch(`${API_BASE}/dashboard`).catch(() => null),
        fetch(`${API_BASE}/agents`).catch(() => null),
        fetch(`${API_BASE}/qa`).catch(() => null),
        fetch(`${API_BASE}/bugs`).catch(() => null),
        fetch(`${API_BASE}/references`).catch(() => null),
        fetch(`${API_BASE}/activity`).catch(() => null),
        fetch(`${API_BASE}/contracts`).catch(() => null),
        fetch(`${API_BASE}/release`).catch(() => null)
      ]);

      if (dashRes && dashRes.ok) this.dashboard = await dashRes.json();
      if (agentsRes && agentsRes.ok) this.agents = await agentsRes.json();
      if (qaRes && qaRes.ok) this.qaTests = await qaRes.json();
      if (bugsRes && bugsRes.ok) this.bugs = await bugsRes.json();
      if (refsRes && refsRes.ok) this.references = await refsRes.json();
      if (actRes && actRes.ok) this.activity = await actRes.json();
      if (contRes && contRes.ok) this.contracts = await contRes.json();
      if (relRes && relRes.ok) this.release = await relRes.json();

      this.notify();
    } catch (e) {
      console.warn('[CommandCenterStore] Erro ao carregar da API; usando estado local.', e);
    }
  }

  async triggerSync() {
    try {
      const res = await fetch(`${API_BASE}/sync`, { method: 'POST' });
      if (res.ok) {
        await this.fetchAll();
        return true;
      }
    } catch (e) {
      console.warn('[CommandCenterStore] Falha ao sincronizar:', e);
    }
    return false;
  }
}

window.ccStore = new CommandCenterStore();
