/** Explicit, traceable player-career ingestion. No seed data or editorial inserts. */
async function main() {
  if (!process.env.DATABASE_PATH) throw new Error('Defina DATABASE_PATH explicitamente antes de sincronizar.');
  const ids = process.argv.slice(2);
  if (!ids.length || ids.some(id => !/^[A-Za-z0-9_-]+$/.test(id))) throw new Error('Uso: node server/scripts/sync-historical-stats.cjs <playerId> [playerId...]');
  const { db, initDatabase } = await import('../src/db/database.js');
  const { playerHistoryService } = await import('../src/modules/players/player-history.service.js');
  initDatabase();
  for (const id of ids) {
    const player = db.prepare('SELECT * FROM players WHERE id=?').get(id);
    if (!player) throw new Error(`Jogador ${id} ausente do catálogo. Sincronize o catálogo primeiro.`);
    playerHistoryService.getCareer(player);
    await playerHistoryService.wait(id);
    const result = playerHistoryService.getCareer(player, { sync: false });
    console.log(JSON.stringify({ playerId: id, status: result.status, seasons: result.seasons }));
    if (result.seasons.some(row => row.status === 'failed')) process.exitCode = 1;
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
