// ========================================================
// YARDLINE NFL - SLEEPER API CONNECTOR DE PRODUÇÃO
// Conector centralizado com timeout, backoff, retry e rate-limit
// ========================================================

const SLEEPER_BASE_URL = 'https://api.sleeper.app/v1';

class SleeperConnector {
  constructor() {
    this.timeoutMs = 12000;
    this.maxRetries = 3;
    this.consecutiveFailures = 0;
    this.circuitOpenUntil = 0;
  }

  async request(endpoint, options = {}) {
    // Verificar se o Circuit Breaker está ativo
    if (Date.now() < this.circuitOpenUntil) {
      throw new Error(`[SleeperConnector] Circuit breaker ativo. Tente novamente em alguns segundos.`);
    }

    const url = `${SLEEPER_BASE_URL}${endpoint}`;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);

        const res = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Yardline-Intelligence-Engine/1.0',
            ...(options.headers || {})
          }
        });
        clearTimeout(timer);

        if (res.ok) {
          this.consecutiveFailures = 0;
          return await res.json();
        }

        // Tratamento de códigos de erro
        if (res.status === 404) {
          return null; // Recurso não encontrado
        }

        if (res.status === 429) {
          // Rate limit: aguardar com backoff
          const retryAfter = parseInt(res.headers.get('retry-after') || '2', 10);
          console.warn(`[SleeperConnector] Rate limit (429) em ${endpoint}. Aguardando ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }

        if (res.status >= 500) {
          console.warn(`[SleeperConnector] Erro 5xx do Sleeper (${res.status}) na tentativa ${attempt}. Retentando...`);
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 600));
          continue;
        }

        throw new Error(`Sleeper API respondeu com status ${res.status}: ${res.statusText}`);
      } catch (err) {
        if (attempt >= this.maxRetries) {
          this.consecutiveFailures++;
          if (this.consecutiveFailures >= 5) {
            this.circuitOpenUntil = Date.now() + 30000; // Abre circuito por 30 segundos
            console.error('[SleeperConnector] 5 falhas consecutivas. Circuit breaker aberto por 30s.');
          }
          throw err;
        }
        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
      }
    }
  }

  // Endpoints Canônicos
  getUser(username) {
    return this.request(`/user/${encodeURIComponent(username)}`);
  }

  getUserLeagues(userId, sport = 'nfl', season = '2026') {
    return this.request(`/user/${userId}/leagues/${sport}/${season}`);
  }

  getLeague(leagueId) {
    return this.request(`/league/${leagueId}`);
  }

  getLeagueUsers(leagueId) {
    return this.request(`/league/${leagueId}/users`);
  }

  getLeagueRosters(leagueId) {
    return this.request(`/league/${leagueId}/rosters`);
  }

  getLeagueMatchups(leagueId, week) {
    return this.request(`/league/${leagueId}/matchups/${week}`);
  }

  getLeagueTransactions(leagueId, week) {
    return this.request(`/league/${leagueId}/transactions/${week}`);
  }

  getNFLState(sport = 'nfl') {
    return this.request(`/state/${sport}`);
  }

  getPlayersCatalog() {
    return this.request('/players/nfl');
  }

  getNflStats(season, week) {
    return this.request(`/stats/nfl/${encodeURIComponent(season)}/${encodeURIComponent(week)}`);
  }

  getNflProjections(season, week) {
    return this.request(`/projections/nfl/${encodeURIComponent(season)}/${encodeURIComponent(week)}`);
  }

  getLeagueTradedPicks(leagueId) {
    return this.request(`/league/${leagueId}/traded_picks`);
  }

  getLeagueDrafts(leagueId) {
    return this.request(`/league/${leagueId}/drafts`);
  }

  getDraft(draftId) {
    return this.request(`/draft/${draftId}`);
  }

  getDraftPicks(draftId) {
    return this.request(`/draft/${draftId}/picks`);
  }

  getTrendingPlayers(type = 'add', lookbackHours = 24, limit = 25) {
    return this.request(`/players/nfl/trending/${encodeURIComponent(type)}?lookback_hours=${encodeURIComponent(lookbackHours)}&limit=${encodeURIComponent(limit)}`);
  }

  getWinnersBracket(leagueId) {
    return this.request(`/league/${leagueId}/winners_bracket`);
  }

  getLosersBracket(leagueId) {
    return this.request(`/league/${leagueId}/losers_bracket`);
  }
}

export const sleeperConnector = new SleeperConnector();
