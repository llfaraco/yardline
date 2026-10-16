/**
 * YARDLINE — CANONICAL PLAYER SEARCH & FILTERS SERVICE
 * Motor de busca e filtros avançados sobre o catálogo oficial de atletas (SQLite).
 * Suporta busca textual, filtros por posição, franquia NFL, status de atividade e disponibilidade na liga (Meu Time, Waivers, Adversário).
 */

import { db } from '../../db/database.js';
import { DATA_STATUS } from '../../contracts/dtos.js';

class PlayersService {
  /**
   * Obtém os conjuntos de IDs de atletas da liga: meu time, adversário e todos os rosterizados.
   */
  getRosterPlayerSets(leagueId = '1369770282776006656', myRosterId = 2, oppRosterId = 1) {
    const allRostered = new Set();
    const myRoster = new Set();
    const oppRoster = new Set();

    try {
      const rosters = db.prepare(`
        SELECT r.provider_roster_id, r.players_json, r.starters_json, r.reserve_json
        FROM rosters r
        LEFT JOIN leagues l ON r.league_id = l.id
        WHERE l.provider_league_id = ? OR r.league_id = ?
      `).all(String(leagueId), String(leagueId));

      for (const r of rosters) {
        const provId = Number(r.provider_roster_id);
        const pList = [...(JSON.parse(r.players_json || '[]')), ...(JSON.parse(r.starters_json || '[]')), ...(JSON.parse(r.reserve_json || '[]'))];

        for (const pid of pList) {
          if (!pid) continue;
          const sPid = String(pid);
          allRostered.add(sPid);
          if (provId === Number(myRosterId)) {
            myRoster.add(sPid);
          } else if (provId === Number(oppRosterId)) {
            oppRoster.add(sPid);
          }
        }
      }
    } catch (e) {
      // Se a tabela ainda não tiver dados para essa liga, segue com conjuntos vazios
    }

    return { allRostered, myRoster, oppRoster };
  }

  /**
   * Busca e filtra atletas com paginação e ordenação determinística.
   */
  searchPlayers(params = {}) {
    const {
      q = '',
      position = 'ALL',
      team = 'ALL',
      status = 'active',
      availability = 'all',
      page = 1,
      limit = 24,
      sortBy = 'name',
      sortOrder = 'asc',
      leagueId = '1369770282776006656',
      myRosterId = 2,
      oppRosterId = 1
    } = params;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
    const offset = (pageNum - 1) * limitNum;

    const conditions = ['1=1'];
    const sqlParams = [];

    // 1. Filtro textual (nome, faculdade, número, ID)
    const cleanQ = String(q || '').trim();
    if (cleanQ) {
      conditions.push('(p.canonical_name LIKE ? OR p.first_name LIKE ? OR p.last_name LIKE ? OR p.team LIKE ? OR p.college LIKE ? OR p.id = ?)');
      const likeStr = `%${cleanQ}%`;
      sqlParams.push(likeStr, likeStr, likeStr, likeStr, likeStr, cleanQ);
    }

    // 2. Filtro por Posição
    const cleanPos = String(position || 'ALL').toUpperCase();
    if (cleanPos !== 'ALL') {
      if (cleanPos === 'IDP') {
        conditions.push("p.position IN ('DL', 'LB', 'DB', 'DE', 'DT', 'CB', 'S')");
      } else if (cleanPos === 'DEF') {
        conditions.push("p.position IN ('DEF', 'DE', 'DT')");
      } else {
        conditions.push('p.position = ?');
        sqlParams.push(cleanPos);
      }
    }

    // 3. Filtro por Franquia NFL
    const cleanTeam = String(team || 'ALL').toUpperCase();
    if (cleanTeam !== 'ALL') {
      conditions.push('p.team = ?');
      sqlParams.push(cleanTeam);
    }

    // 4. Filtro por Status de Atividade
    if (status === 'active') {
      conditions.push("(p.status = 'Active' OR p.status IS NULL) AND p.team IS NOT NULL");
    }

    // 5. Filtro por Disponibilidade na Liga Fantasy
    const { allRostered, myRoster, oppRoster } = this.getRosterPlayerSets(leagueId, myRosterId, oppRosterId);

    if (availability === 'waivers' && allRostered.size > 0) {
      const rosteredArray = Array.from(allRostered);
      const placeholders = rosteredArray.map(() => '?').join(',');
      conditions.push(`p.id NOT IN (${placeholders})`);
      sqlParams.push(...rosteredArray);
    } else if (availability === 'my_roster' && myRoster.size > 0) {
      const myArray = Array.from(myRoster);
      const placeholders = myArray.map(() => '?').join(',');
      conditions.push(`p.id IN (${placeholders})`);
      sqlParams.push(...myArray);
    } else if (availability === 'opponent' && oppRoster.size > 0) {
      const oppArray = Array.from(oppRoster);
      const placeholders = oppArray.map(() => '?').join(',');
      conditions.push(`p.id IN (${placeholders})`);
      sqlParams.push(...oppArray);
    } else if (availability === 'rostered' && allRostered.size > 0) {
      const rosteredArray = Array.from(allRostered);
      const placeholders = rosteredArray.map(() => '?').join(',');
      conditions.push(`p.id IN (${placeholders})`);
      sqlParams.push(...rosteredArray);
    }

    const whereClause = conditions.join(' AND ');

    // 6. Contagem Total para Paginação
    const countSql = `SELECT count(*) as total FROM players p WHERE ${whereClause}`;
    const totalRow = db.prepare(countSql).get(...sqlParams);
    const total = totalRow ? totalRow.total : 0;
    const totalPages = Math.ceil(total / limitNum) || 1;

    // 7. Ordenação
    let orderClause = 'p.canonical_name ASC';
    const direction = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    if (sortBy === 'name') {
      orderClause = `p.canonical_name ${direction}`;
    } else if (sortBy === 'position') {
      orderClause = `p.position ${direction}, p.canonical_name ASC`;
    } else if (sortBy === 'team') {
      orderClause = `p.team ${direction}, p.canonical_name ASC`;
    } else if (sortBy === 'age') {
      orderClause = `p.age ${direction}, p.canonical_name ASC`;
    }

    // 8. Consulta Paginada
    const selectSql = `
      SELECT
        p.id,
        p.canonical_name as name,
        p.first_name,
        p.last_name,
        p.position,
        p.team,
        p.status,
        p.age,
        p.number,
        p.college,
        p.height,
        p.weight,
        p.photo_url as photo,
        p.team_logo_url as teamLogo
      FROM players p
      WHERE ${whereClause}
      ORDER BY ${orderClause}
      LIMIT ? OFFSET ?
    `;

    const rows = db.prepare(selectSql).all(...sqlParams, limitNum, offset);

    // Enriquecer cada atleta com metadados de liga
    const players = rows.map(p => {
      const sId = String(p.id);
      let leagueStatus = 'FREE_AGENT';
      let leagueBadgeText = 'LIVRE NO WAIVER';
      let leagueBadgeClass = 'badge-green';

      if (myRoster.has(sId)) {
        leagueStatus = 'MY_ROSTER';
        leagueBadgeText = 'SEU TIME';
        leagueBadgeClass = 'badge-crimson';
      } else if (oppRoster.has(sId)) {
        leagueStatus = 'OPPONENT';
        leagueBadgeText = 'ADVERSÁRIO';
        leagueBadgeClass = 'badge-amber';
      } else if (allRostered.has(sId)) {
        leagueStatus = 'ROSTERED';
        leagueBadgeText = 'RIVAL';
        leagueBadgeClass = 'badge-navy';
      }

      return {
        id: p.id,
        sleeperId: p.id,
        name: p.name,
        firstName: p.first_name,
        lastName: p.last_name,
        pos: p.position || 'FLEX',
        position: p.position || 'FLEX',
        team: p.team || 'FA',
        teamName: p.team || 'Free Agent',
        status: p.status || null,
        injuryStatus: p.status === 'Active' ? null : p.status, // null nunca vira 'Saudável'
        age: p.age,
        number: p.number ? `#${p.number}` : null,
        college: p.college,
        photo: p.photo || `https://sleepercdn.com/content/nfl/players/thumb/${p.id}.jpg`,
        teamLogo: p.teamLogo || (p.team ? `https://a.espncdn.com/i/teamlogos/nfl/500/${p.team.toLowerCase()}.png` : 'https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png'),
        leagueStatus,
        leagueBadgeText,
        leagueBadgeClass
      };
    });

    return {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages,
      players,
      provenance: {
        source: 'Sleeper Canonical SQLite',
        status: DATA_STATUS.OFFICIAL,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Retorna os detalhes de um jogador canônico pelo Sleeper ID ou ESPN ID via crosswalk.
   */
  getPlayerById(playerId) {
    const sId = String(playerId || '').trim();
    if (!sId) return null;

    let row = db.prepare('SELECT * FROM players WHERE id = ?').get(sId);
    if (!row) {
      const cross = db.prepare('SELECT player_id FROM player_identities WHERE provider_player_id = ?').get(sId);
      if (cross) {
        row = db.prepare('SELECT * FROM players WHERE id = ?').get(cross.player_id);
      }
    }

    if (!row) return null;

    const { allRostered, myRoster, oppRoster } = this.getRosterPlayerSets();
    const rowId = String(row.id);

    let leagueStatus = 'FREE_AGENT';
    let leagueBadgeText = 'LIVRE NO WAIVER';
    if (myRoster.has(rowId)) {
      leagueStatus = 'MY_ROSTER';
      leagueBadgeText = 'SEU TIME';
    } else if (oppRoster.has(rowId)) {
      leagueStatus = 'OPPONENT';
      leagueBadgeText = 'ADVERSÁRIO';
    } else if (allRostered.has(rowId)) {
      leagueStatus = 'ROSTERED';
      leagueBadgeText = 'RIVAL';
    }

    return {
      id: row.id,
      sleeperId: row.id,
      name: row.canonical_name,
      firstName: row.first_name,
      lastName: row.last_name,
      pos: row.position || 'FLEX',
      position: row.position || 'FLEX',
      team: row.team || 'FA',
      status: row.status || null,
      injuryStatus: row.status === 'Active' ? null : row.status,
      age: row.age,
      number: row.number ? `#${row.number}` : null,
      college: row.college,
      height: row.height,
      weight: row.weight,
      photo: row.photo_url || `https://sleepercdn.com/content/nfl/players/thumb/${row.id}.jpg`,
      teamLogo: row.team_logo_url || (row.team ? `https://a.espncdn.com/i/teamlogos/nfl/500/${row.team.toLowerCase()}.png` : 'https://a.espncdn.com/i/teamlogos/nfl/500/nfl.png'),
      leagueStatus,
      leagueBadgeText,
      provenance: {
        source: 'Sleeper Canonical SQLite',
        status: DATA_STATUS.OFFICIAL,
        timestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Retorna todas as 32 franquias ativas da NFL com contagem de atletas cadastrados.
   */
  getActiveTeams() {
    const rows = db.prepare(`
      SELECT
        team,
        count(*) as count
      FROM players
      WHERE team IS NOT NULL AND (status = 'Active' OR status IS NULL)
      GROUP BY team
      ORDER BY team ASC
    `).all();

    return rows.map(r => ({
      code: r.team,
      count: r.count,
      logo: `https://a.espncdn.com/i/teamlogos/nfl/500/${r.team.toLowerCase()}.png`
    }));
  }
}

export const playersService = new PlayersService();
