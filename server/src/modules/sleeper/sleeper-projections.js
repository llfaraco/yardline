export function normalizeSleeperProjections(payload, season, week) {
  if (!Array.isArray(payload)) throw new Error('Resposta de projeções Sleeper inválida.');
  const result = {};
  for (const row of payload) {
    if (row?.category !== 'proj' || row.sport !== 'nfl' || row.season_type !== 'regular'
      || String(row.season) !== String(season) || Number(row.week) !== Number(week)
      || !row.player_id || !row.stats || typeof row.stats !== 'object' || Array.isArray(row.stats)) continue;
    result[String(row.player_id)] = row.stats;
  }
  return result;
}
