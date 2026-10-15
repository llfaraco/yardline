/*
 * SLEEPER SINGLE FILE STACK
 *
 * Um único arquivo para copiar para outro projeto.
 * Requer Node.js 20+ e execução com:
 *   npx tsx sleeper-single-file.ts
 *
 * Variáveis opcionais:
 *   SLEEPER_LEAGUE_ID=1369770282776006656
 *   SLEEPER_SPORT=nfl
 *   SYNC_INTERVAL_MS=300000
 *   PORT=3000
 *   HOST=0.0.0.0
 *   DATA_FILE=./sleeper-snapshot.json
 *
 * A API pública do Sleeper é somente leitura. Estatísticas play-by-play ao vivo
 * não são fornecidas aqui; o endpoint POST /api/live-stats aceita snapshots
 * normalizados de um provedor autorizado e recalcula scores localmente.
 */

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const CONFIG = {
  leagueId: process.env.SLEEPER_LEAGUE_ID ?? '1369770282776006656',
  sport: process.env.SLEEPER_SPORT ?? 'nfl',
  intervalMs: Number(process.env.SYNC_INTERVAL_MS ?? 300_000),
  port: Number(process.env.PORT ?? 3000),
  host: process.env.HOST ?? '0.0.0.0',
  dataFile: process.env.DATA_FILE ?? './sleeper-snapshot.json',
  api: 'https://api.sleeper.app/v1',
};

type Json = Record<string, any>;
type Stats = Record<string, number | undefined>;
type Snapshot = {
  league?: Json;
  users?: Json[];
  rosters?: Json[];
  matchups?: Record<string, Json[]>;
  transactions?: Record<string, Json[]>;
  tradedPicks?: Json[];
  players?: Record<string, Json>;
  state?: Json;
  liveStats?: Record<string, Stats>;
  calculatedScores?: Record<string, { total: number; breakdown: Json }>;
  syncedAt?: string;
};

let db: Snapshot = { matchups: {}, transactions: {}, liveStats: {}, calculatedScores: {} };

async function loadSnapshot() {
  if (!existsSync(CONFIG.dataFile)) return;
  try { db = { ...db, ...JSON.parse(await readFile(CONFIG.dataFile, 'utf8')) }; }
  catch (error) { console.error('[storage] invalid snapshot, starting empty', error); }
}
async function saveSnapshot() { await writeFile(CONFIG.dataFile, JSON.stringify(db, null, 2)); }

async function sleeperGet<T = any>(path: string, attempt = 0): Promise<T> {
  try {
    const response = await fetch(`${CONFIG.api}${path}`, {
      headers: { accept: 'application/json', 'user-agent': 'sleeper-single-file/1.0' },
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) return await response.json() as T;
    if (![408, 429, 500, 502, 503, 504].includes(response.status)) throw new Error(`Sleeper HTTP ${response.status}: ${await response.text()}`);
    throw new Error(`Sleeper temporary HTTP ${response.status}`);
  } catch (error) {
    if (attempt >= 4) throw error;
    await new Promise(resolve => setTimeout(resolve, 600 * 2 ** attempt + Math.random() * 250));
    return sleeperGet<T>(path, attempt + 1);
  }
}

async function syncSleeper() {
  const league = await sleeperGet<Json>(`/league/${CONFIG.leagueId}`);
  const week = Number(league.settings?.leg ?? 1);
  const [users, rosters, matchups, transactions, tradedPicks, players, state] = await Promise.all([
    sleeperGet<Json[]>(`/league/${CONFIG.leagueId}/users`),
    sleeperGet<Json[]>(`/league/${CONFIG.leagueId}/rosters`),
    sleeperGet<Json[]>(`/league/${CONFIG.leagueId}/matchups/${week}`),
    sleeperGet<Json[]>(`/league/${CONFIG.leagueId}/transactions/${week}`),
    sleeperGet<Json[]>(`/league/${CONFIG.leagueId}/traded_picks`),
    sleeperGet<Record<string, Json>>('/players/nfl'),
    sleeperGet<Json>(`/state/${CONFIG.sport}`),
  ]);
  db.league = league;
  db.users = users;
  db.rosters = rosters;
  db.matchups ??= {};
  db.transactions ??= {};
  db.matchups[String(week)] = matchups;
  db.transactions[String(week)] = transactions;
  db.tradedPicks = tradedPicks;
  db.players = players;
  db.state = state;
  db.syncedAt = new Date().toISOString();
  recalculateAllScores(week);
  await saveSnapshot();
  console.info(`[sync] league=${CONFIG.leagueId} week=${week} rosters=${rosters.length} players=${Object.keys(players).length}`);
  return { week, syncedAt: db.syncedAt, rosters: rosters.length, players: Object.keys(players).length };
}

const RULES: Record<string, { stat: string; label: string }> = {
  pass_yd: { stat: 'passing_yards', label: 'Passing yards' }, pass_td: { stat: 'passing_touchdowns', label: 'Passing TD' }, pass_2pt: { stat: 'passing_2pt', label: 'Passing 2PT' }, pass_int: { stat: 'interceptions_thrown', label: 'Interceptions thrown' }, pass_int_td: { stat: 'pick_sixes_thrown', label: 'Pick six thrown' }, pass_sack: { stat: 'sacks_taken', label: 'Sacks taken' },
  rush_yd: { stat: 'rushing_yards', label: 'Rushing yards' }, rush_td: { stat: 'rushing_touchdowns', label: 'Rushing TD' }, rush_2pt: { stat: 'rushing_2pt', label: 'Rushing 2PT' },
  rec: { stat: 'receptions', label: 'Receptions' }, rec_yd: { stat: 'receiving_yards', label: 'Receiving yards' }, rec_td: { stat: 'receiving_touchdowns', label: 'Receiving TD' }, rec_2pt: { stat: 'receiving_2pt', label: 'Receiving 2PT' },
  fum_lost: { stat: 'fumbles_lost', label: 'Fumbles lost' }, fum_rec_td: { stat: 'fumble_recovery_touchdowns', label: 'Fumble recovery TD' },
  sack: { stat: 'defensive_sacks', label: 'Defensive sacks' }, int: { stat: 'defensive_interceptions', label: 'Defensive interceptions' }, fum_rec: { stat: 'fumble_recoveries', label: 'Fumble recoveries' }, safe: { stat: 'safeties', label: 'Safeties' }, ff: { stat: 'forced_fumbles', label: 'Forced fumbles' }, blk_kick: { stat: 'blocked_kicks', label: 'Blocked kicks' }, def_td: { stat: 'defensive_touchdowns', label: 'Defensive TD' },
  idp_def_td: { stat: 'idp_touchdowns', label: 'IDP TD' }, idp_sack: { stat: 'idp_sacks', label: 'IDP sacks' }, idp_qb_hit: { stat: 'qb_hits', label: 'QB hits' }, idp_tkl_loss: { stat: 'tackles_for_loss', label: 'Tackles for loss' }, idp_int: { stat: 'idp_interceptions', label: 'IDP interceptions' }, idp_fum_rec: { stat: 'idp_fumble_recoveries', label: 'IDP fumble recoveries' }, idp_ff: { stat: 'idp_forced_fumbles', label: 'IDP forced fumbles' }, idp_safe: { stat: 'idp_safeties', label: 'IDP safeties' }, idp_tkl_ast: { stat: 'assisted_tackles', label: 'Assisted tackles' }, idp_tkl_solo: { stat: 'solo_tackles', label: 'Solo tackles' }, idp_pass_def: { stat: 'passes_defended', label: 'Passes defended' }, bonus_fd_te: { stat: 'tight_end_first_downs', label: 'TE first downs' },
};
const num = (stats: Stats, key: string) => Number.isFinite(Number(stats[key] ?? 0)) ? Number(stats[key] ?? 0) : 0;
const round = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

function calculatePlayerScore(stats: Stats, scoring: Record<string, number>) {
  const breakdown: Json = {};
  let total = 0;
  for (const [rule, meta] of Object.entries(RULES)) {
    const points = num(stats, meta.stat) * Number(scoring[rule] ?? 0);
    if (points !== 0) breakdown[rule] = round(points);
    total += points;
  }
  total += num(stats, 'extra_points_made') * Number(scoring.xpm ?? 0);
  total += num(stats, 'extra_points_missed') * Number(scoring.xpmiss ?? 0);
  if (Array.isArray(stats.field_goals)) for (const kick of stats.field_goals as any[]) {
    const d = Number(kick.distance ?? 0);
    const suffix = d < 20 ? '0_19' : d < 30 ? '20_29' : d < 40 ? '30_39' : d < 50 ? '40_49' : d < 60 ? '50_59' : '60p';
    const key = kick.made ? `fgm_${suffix}` : `fgmiss_${suffix}`;
    const points = Number(scoring[key] ?? 0); breakdown[key] = (breakdown[key] ?? 0) + points; total += points;
  }
  const allowed = num(stats, 'points_allowed');
  const allowedKey = allowed === 0 ? 'pts_allow_0' : allowed <= 6 ? 'pts_allow_1_6' : allowed <= 13 ? 'pts_allow_7_13' : allowed <= 20 ? 'pts_allow_14_20' : allowed <= 27 ? 'pts_allow_21_27' : allowed <= 34 ? 'pts_allow_28_34' : 'pts_allow_35p';
  if (scoring[allowedKey] !== undefined) { breakdown[allowedKey] = Number(scoring[allowedKey]); total += Number(scoring[allowedKey]); }
  return { total: round(total), breakdown };
}

function recalculateAllScores(week: number) {
  const scoring = db.league?.scoring_settings ?? {};
  const matchups = db.matchups?.[String(week)] ?? [];
  db.calculatedScores = {};
  for (const matchup of matchups) {
    for (const playerId of matchup.starters ?? []) {
      const result = calculatePlayerScore(db.liveStats?.[String(playerId)] ?? {}, scoring);
      db.calculatedScores[String(playerId)] = result;
    }
  }
}

function json(res: ServerResponse, status: number, payload: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' }); res.end(JSON.stringify(payload));
}
async function body(req: IncomingMessage) { let data = ''; for await (const chunk of req) data += chunk; return data ? JSON.parse(data) : {}; }
function players(query: URLSearchParams) {
  const q = (query.get('q') ?? '').toLowerCase(); const position = query.get('position');
  return Object.values(db.players ?? {}).filter(p => (!q || `${p.full_name ?? ''} ${p.first_name ?? ''} ${p.last_name ?? ''}`.toLowerCase().includes(q)) && (!position || p.position === position)).slice(0, 250);
}

const HTML = `<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Sleeper Stack</title><script src="https://cdn.tailwindcss.com"></script><script>tailwind.config={theme:{extend:{colors:{app:'#171b2a',panel:'#232a3d',soft:'#2b3348',accent:'#19e6c1',muted:'#9aa5bb'}}}}</script><script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script><script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script><script src="https://unpkg.com/@babel/standalone/babel.min.js"></script></head><body class="bg-app text-white"><div id="root"></div><script type="text/babel">
const e=React.createElement;
function Sidebar(){return <aside className="hidden w-64 shrink-0 border-r border-white/5 bg-[#131827] p-4 md:block"><div className="mb-8 text-xl font-bold"><span className="text-accent">●</span> sleeper</div><p className="mb-2 text-[10px] uppercase tracking-widest text-muted">Leagues</p>{['Neilo Pistola League','Calvary Fantasy League','La B','RedZone8','Neilo Pistola PE'].map((x,i)=><div className={'mb-1 rounded-lg p-3 text-sm '+(i===0?'bg-soft':'text-muted')} key={x}>{x}<small className="mt-1 block text-xs text-muted">2026 · Fantasy Football</small></div>)}</aside>}
function Chat(){return <aside className="hidden w-[340px] shrink-0 border-l border-white/5 bg-[#1d2435] lg:flex lg:flex-col"><header className="border-b border-white/5 p-4 font-semibold">League Chat</header><div className="flex-1 space-y-4 overflow-auto p-4">{['NacuaMatata90 made a free agent move.','Faraco made a free agent move.','The weekly report is ready to view.'].map((x,i)=><div className="border-l-2 border-soft pl-3 text-sm" key={i}><b>{x.split(' ')[0]}</b> {x.slice(x.indexOf(' ')+1)}<small className="mt-2 block text-xs text-muted">{i+1} hours ago · reply</small></div>)}</div><div className="border-t border-white/5 p-3"><input className="w-full rounded-lg bg-soft p-3 text-sm outline-none" placeholder="Enter Message"/></div></aside>}
function Matchup(){const rows=[['B. Purdy','QB','SF','WAS','21.69'],['J. Williams','RB','DAL','GB','17.33'],['D. London','WR','ATL','CHI','18.81'],['Z. Flowers','WR','BAL','CLE','17.32'],['G. Kittle','TE','SF','WAS','14.88']]; const team=(name,owner,score)=> <section className="overflow-hidden rounded-xl border border-white/5 bg-panel"><div className="flex items-center gap-3 bg-soft/60 p-4"><span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-fuchsia-500 to-orange-400 text-xs font-bold">{name.slice(0,2)}</span><div className="flex-1"><small className="text-muted">@{owner}</small><h2 className="font-semibold">{name}</h2><small className="text-muted">Week 6 · 0% win chance</small></div><strong className="text-xl">{score}</strong></div><p className="px-4 py-3 text-xs font-bold uppercase tracking-widest text-muted">Starters</p>{rows.map(r=><div className="grid grid-cols-[34px_1fr_auto] gap-3 border-t border-white/5 p-3" key={r[0]}><span className="grid h-7 w-7 place-items-center rounded-full bg-soft text-[10px] text-muted">{r[1]}</span><div><b className="text-sm">{r[0]}</b><small className="block text-xs text-muted">{r[1]} · {r[2]} · Sun 2:00 PM · vs {r[3]}</small></div><span className="text-right text-sm">0.00<small className="block text-xs text-muted">proj. {r[4]}</small></span></div>)}</section>; return <><div className="mb-4 flex items-center justify-between"><div><small className="uppercase tracking-widest text-muted">Matchup</small><h1 className="text-xl font-bold">Week 6</h1></div><button className="rounded-lg bg-soft px-3 py-2 text-xs">All weeks</button></div><div className="grid gap-4 xl:grid-cols-2">{team('Gengar My Balls','Faraco','192.07')}{team('Curitiba Red Fox','neyllon','151.36')}</div></>}
function App(){const [tab,setTab]=React.useState('MATCHUP'); const tabs=['MATCHUP','TEAM','LEAGUE','PLAYERS','TREND','TRADES','SCORES']; return <div className="flex min-h-screen"><Sidebar/><main className="min-w-0 flex-1"><header className="flex items-center gap-3 border-b border-white/5 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-500 to-orange-400 text-xs font-bold">NP</span><div className="flex-1"><b>Neilo Pistola League</b><small className="block text-xs text-muted">2026 · 16-Team Keeper PPR</small></div></header><nav className="flex gap-1 overflow-x-auto border-b border-white/5 p-3">{tabs.map(x=><button onClick={()=>setTab(x)} className={'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold '+(tab===x?'bg-accent text-app':'text-muted hover:bg-soft')} key={x}>{x}</button>)}</nav><div className="mx-auto max-w-[1180px] p-4 md:p-6">{tab==='MATCHUP'?<Matchup/>:<div className="grid min-h-[420px] place-items-center rounded-xl border border-white/5 bg-panel text-muted">{tab} view connected to the local API</div>}</div></main><Chat/></div>}; ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
</script></body></html>`;

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'access-control-allow-origin': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'access-control-allow-headers': 'content-type' }); return res.end(); }
  try {
    if (req.method === 'GET' && url.pathname === '/') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(HTML); }
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { ok: true, syncedAt: db.syncedAt ?? null });
    if (req.method === 'GET' && url.pathname === '/api/league') return json(res, 200, db.league ?? { error: 'not_synced' });
    if (req.method === 'GET' && url.pathname === '/api/rosters') return json(res, 200, db.rosters ?? []);
    if (req.method === 'GET' && url.pathname.startsWith('/api/matchups/')) return json(res, 200, db.matchups?.[url.pathname.split('/').pop()!] ?? []);
    if (req.method === 'GET' && url.pathname.startsWith('/api/transactions/')) return json(res, 200, db.transactions?.[url.pathname.split('/').pop()!] ?? []);
    if (req.method === 'GET' && url.pathname === '/api/players') return json(res, 200, players(url.searchParams));
    if (req.method === 'GET' && url.pathname.startsWith('/api/scores/')) return json(res, 200, { week: url.pathname.split('/').pop(), scores: db.calculatedScores ?? {} });
    if (req.method === 'POST' && url.pathname === '/api/live-stats') {
      const payload = await body(req); db.liveStats = { ...db.liveStats, ...(payload.players ?? payload) }; recalculateAllScores(Number(db.league?.settings?.leg ?? 1)); await saveSnapshot(); return json(res, 200, { ok: true, scores: db.calculatedScores });
    }
    return json(res, 404, { error: 'not_found' });
  } catch (error) { console.error(error); return json(res, 500, { error: error instanceof Error ? error.message : 'internal_error' }); }
}

async function start() {
  await loadSnapshot();
  try { await syncSleeper(); } catch (error) { console.error('[sync:first-run]', error); }
  setInterval(() => syncSleeper().catch(error => console.error('[sync]', error)), CONFIG.intervalMs);
  createServer(handle).listen(CONFIG.port, CONFIG.host, () => console.info(`Sleeper Stack: http://localhost:${CONFIG.port}`));
}
start();
