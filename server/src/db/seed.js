import crypto from 'node:crypto';
import { db, initDatabase } from './database.js';
import { newsService } from '../modules/news/news.service.js';

initDatabase();

export function seedCanonicalData() {
  console.log('🌱 [Seed] Semeando jogadores canônicos e notícias oficiais...');

  // 1. Jogadores Canônicos da NFL
  const players = [
    { id: '4984', name: 'Josh Allen', first: 'Josh', last: 'Allen', pos: 'QB', team: 'BUF', num: '17', age: 28, col: 'Wyoming', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/buf.png' },
    { id: '4046', name: 'Patrick Mahomes', first: 'Patrick', last: 'Mahomes', pos: 'QB', team: 'KC', num: '15', age: 29, col: 'Texas Tech', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3139477.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
    { id: '7564', name: 'Ja\'Marr Chase', first: 'Ja\'Marr', last: 'Chase', pos: 'WR', team: 'CIN', num: '1', age: 24, col: 'LSU', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4362628.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cin.png' },
    { id: '6794', name: 'Justin Jefferson', first: 'Justin', last: 'Jefferson', pos: 'WR', team: 'MIN', num: '18', age: 25, col: 'LSU', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4262921.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/min.png' },
    { id: '6813', name: 'CeeDee Lamb', first: 'CeeDee', last: 'Lamb', pos: 'WR', team: 'DAL', num: '88', age: 25, col: 'Oklahoma', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4241389.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
    { id: '7569', name: 'Nico Collins', first: 'Nico', last: 'Collins', pos: 'WR', team: 'HOU', num: '12', age: 25, col: 'Michigan', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4258185.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
    { id: '4034', name: 'Christian McCaffrey', first: 'Christian', last: 'McCaffrey', pos: 'RB', team: 'SF', num: '23', age: 28, col: 'Stanford', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3117251.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
    { id: '9226', name: 'Bijan Robinson', first: 'Bijan', last: 'Robinson', pos: 'RB', team: 'ATL', num: '7', age: 22, col: 'Texas', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4430807.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/atl.png' },
    { id: '9221', name: 'Jahmyr Gibbs', first: 'Jahmyr', last: 'Gibbs', pos: 'RB', team: 'DET', num: '26', age: 22, col: 'Alabama', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4430764.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
    { id: '7588', name: 'Javonte Williams', first: 'Javonte', last: 'Williams', pos: 'RB', team: 'DEN', num: '33', age: 24, col: 'North Carolina', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4361579.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/den.png' },
    { id: '4039', name: 'Travis Kelce', first: 'Travis', last: 'Kelce', pos: 'TE', team: 'KC', num: '87', age: 35, col: 'Cincinnati', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/15847.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/kc.png' },
    { id: '9509', name: 'Sam LaPorta', first: 'Sam', last: 'LaPorta', pos: 'TE', team: 'DET', num: '87', age: 23, col: 'Iowa', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4430027.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/det.png' },
    { id: '9508', name: 'Brock Bowers', first: 'Brock', last: 'Bowers', pos: 'TE', team: 'LV', num: '89', age: 21, col: 'Georgia', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4432665.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lv.png' },
    { id: '7591', name: 'Micah Parsons', first: 'Micah', last: 'Parsons', pos: 'LB', team: 'DAL', num: '11', age: 25, col: 'Penn State', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4361423.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/dal.png' },
    { id: '4037', name: 'T.J. Watt', first: 'T.J.', last: 'Watt', pos: 'LB', team: 'PIT', num: '90', age: 30, col: 'Wisconsin', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3045138.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/pit.png' },
    { id: '4983', name: 'Roquan Smith', first: 'Roquan', last: 'Smith', pos: 'LB', team: 'BAL', num: '0', age: 27, col: 'Georgia', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3915437.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' },
    { id: '4038', name: 'Myles Garrett', first: 'Myles', last: 'Garrett', pos: 'DL', team: 'CLE', num: '95', age: 28, col: 'Texas A&M', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3122132.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/cle.png' },
    { id: '5848', name: 'Nick Bosa', first: 'Nick', last: 'Bosa', pos: 'DL', team: 'SF', num: '97', age: 26, col: 'Ohio State', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4040605.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/sf.png' },
    { id: '9510', name: 'Will Anderson Jr.', first: 'Will', last: 'Anderson', pos: 'DL', team: 'HOU', num: '51', age: 23, col: 'Alabama', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4429023.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/hou.png' },
    { id: '4990', name: 'Derwin James', first: 'Derwin', last: 'James', pos: 'DB', team: 'LAC', num: '3', age: 28, col: 'Florida State', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/3915530.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/lac.png' },
    { id: '8150', name: 'Kyle Hamilton', first: 'Kyle', last: 'Hamilton', pos: 'DB', team: 'BAL', num: '14', age: 23, col: 'Notre Dame', photo: 'https://a.espncdn.com/i/headshots/nfl/players/full/4427407.png', logo: 'https://a.espncdn.com/i/teamlogos/nfl/500/bal.png' }
  ];

  const now = new Date().toISOString();
  const insertPlayer = db.prepare(`
    INSERT OR REPLACE INTO players (id, canonical_name, first_name, last_name, position, team, status, age, number, college, height, weight, photo_url, team_logo_url, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 'Active', ?, ?, ?, '1.85m', '98kg', ?, ?, ?, ?)
  `);

  const insertIdentity = db.prepare(`
    INSERT OR REPLACE INTO player_identities (id, player_id, provider, provider_player_id, raw_name, valid_from, metadata_json)
    VALUES (?, ?, 'sleeper', ?, ?, ?, '{}')
  `);

  for (const p of players) {
    insertPlayer.run(p.id, p.name, p.first, p.last, p.pos, p.team, p.age, '#' + p.num, p.col, p.photo, p.logo, now, now);
    insertIdentity.run('id_slp_' + p.id, p.id, p.id, p.name, now);
  }

  // 2. Ingestão de Notícias Oficiais Verificadas
  const news = [
    {
      source: 'NFL Network',
      sourceArticleId: 'nfl_net_101',
      canonicalUrl: 'https://www.nfl.com/news/bills-josh-allen-dominant-performance-week-6-game-plan',
      title: 'Josh Allen lidera preparação do ataque dos Bills para o confronto da Semana 6',
      summary: 'O quarterback treinou sem restrições e demonstrou alta precisão em rotas verticais. Coordenador ofensivo Joe Brady planeja explorar o meio do campo.',
      author: 'Ian Rapoport',
      publishedAt: '2026-10-15T08:30:00Z',
      imageUrl: 'https://a.espncdn.com/i/headshots/nfl/players/full/3918298.png',
      category: 'tactical',
      playerIds: ['4984']
    },
    {
      source: 'ESPN Insider',
      sourceArticleId: 'espn_ins_202',
      canonicalUrl: 'https://www.espn.com/nfl/story/_/id/40001/jamarr-chase-bengals-target-share-breakdown',
      title: 'Ja\'Marr Chase atinge 34% de participação nos alvos dos Bengals em jogadas de red zone',
      summary: 'Com a ausência temporária de Tee Higgins, Joe Burrow concentrou as primeiras leituras no camisa 1, elevando sua projeção PPR para 21.2 pontos.',
      author: 'Dan Graziano',
      publishedAt: '2026-10-14T19:45:00Z',
      imageUrl: 'https://a.espncdn.com/i/headshots/nfl/players/full/4362628.png',
      category: 'fantasy_intel',
      playerIds: ['7564']
    },
    {
      source: 'Sleeper Intel',
      sourceArticleId: 'slp_int_303',
      canonicalUrl: 'https://sleeper.com/news/nico-collins-hamstring-status-week-6-houston-texans',
      title: 'Nico Collins passa por exames adicionais e equipe médica mantém otimismo moderado',
      summary: 'O wide receiver principal do Houston Texans realizou atividades no gramado. C.J. Stroud destacou a importância de Collins para o ritmo do passe.',
      author: 'Sleeper Wire',
      publishedAt: '2026-10-14T15:20:00Z',
      imageUrl: 'https://a.espncdn.com/i/headshots/nfl/players/full/4258185.png',
      category: 'medical',
      playerIds: ['7569']
    },
    {
      source: 'The Athletic',
      sourceArticleId: 'ath_404',
      canonicalUrl: 'https://theathletic.com/nfl/micah-parsons-cowboys-defensive-gameplan',
      title: 'Micah Parsons lidera pressões ao quarterback na liga e projeta confronto favorável',
      summary: 'Alinhando tanto como defensive end quanto linebacker, Parsons gerou 8 pressões no último jogo e segue como a âncora pontuadora em ligas IDP.',
      author: 'Jon Machota',
      publishedAt: '2026-10-13T12:00:00Z',
      imageUrl: 'https://a.espncdn.com/i/headshots/nfl/players/full/4361423.png',
      category: 'idp',
      playerIds: ['7591']
    }
  ];

  for (const n of news) {
    newsService.ingestNewsItem(n);
  }

  console.log('✅ [Seed] Catálogo de atletas canônicos e notícias oficiais semeados com sucesso!');
}

seedCanonicalData();
