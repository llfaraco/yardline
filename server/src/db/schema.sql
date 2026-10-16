-- ========================================================
-- YARDLINE NFL - SCHEMA CANÔNICO DE PRODUÇÃO
-- Baseado no Plano Mestre (Seção 6)
-- ========================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  locale TEXT DEFAULT 'pt-BR',
  timezone TEXT DEFAULT 'America/Sao_Paulo',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS external_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_username TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  last_verified_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS leagues (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL DEFAULT 'sleeper',
  provider_league_id TEXT UNIQUE NOT NULL,
  sport TEXT DEFAULT 'nfl',
  season TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT DEFAULT 'in_season',
  season_type TEXT DEFAULT 'regular',
  total_rosters INTEGER NOT NULL,
  settings_json TEXT,
  scoring_settings_json TEXT,
  roster_positions_json TEXT,
  last_synced_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS league_memberships (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  user_id TEXT,
  provider_user_id TEXT NOT NULL,
  roster_id INTEGER NOT NULL,
  display_name TEXT NOT NULL,
  team_name TEXT NOT NULL,
  avatar TEXT,
  is_commissioner INTEGER DEFAULT 0,
  is_current_user INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  canonical_name TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  position TEXT NOT NULL,
  team TEXT,
  status TEXT DEFAULT 'Active',
  injury_status TEXT,
  catalog_json TEXT,
  age INTEGER,
  number TEXT,
  college TEXT,
  height TEXT,
  weight TEXT,
  photo_url TEXT,
  team_logo_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS player_identities (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_player_id TEXT NOT NULL,
  raw_name TEXT,
  valid_from TEXT,
  valid_to TEXT,
  metadata_json TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
  UNIQUE(provider, provider_player_id)
);

CREATE TABLE IF NOT EXISTS rosters (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  provider_roster_id INTEGER NOT NULL,
  owner_membership_id TEXT,
  players_json TEXT NOT NULL,
  starters_json TEXT NOT NULL,
  reserve_json TEXT,
  taxi_json TEXT,
  settings_json TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matchups (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  provider_matchup_id INTEGER NOT NULL,
  roster_a_id INTEGER NOT NULL,
  roster_b_id INTEGER,
  status TEXT DEFAULT 'scheduled',
  score_a REAL DEFAULT 0.0,
  score_b REAL DEFAULT 0.0,
  custom_points_json TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS matchup_players (
  id TEXT PRIMARY KEY,
  matchup_id TEXT NOT NULL,
  roster_id INTEGER NOT NULL,
  player_id TEXT NOT NULL,
  slot TEXT NOT NULL,
  is_starter INTEGER DEFAULT 0,
  points REAL DEFAULT 0.0,
  projected_points REAL DEFAULT 0.0,
  scoring_breakdown_json TEXT,
  captured_at TEXT NOT NULL,
  FOREIGN KEY (matchup_id) REFERENCES matchups(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL,
  source_article_id TEXT,
  canonical_url TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  author TEXT,
  published_at TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  image_url TEXT,
  category TEXT DEFAULT 'general',
  status TEXT DEFAULT 'published',
  content_hash TEXT UNIQUE NOT NULL,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS news_player_links (
  id TEXT PRIMARY KEY,
  news_id TEXT NOT NULL,
  player_id TEXT NOT NULL,
  relevance_score REAL DEFAULT 1.0,
  linked_by TEXT DEFAULT 'canonical_tag',
  FOREIGN KEY (news_id) REFERENCES news_items(id) ON DELETE CASCADE,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projections (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  scoring_format TEXT NOT NULL DEFAULT 'PPR',
  projection REAL NOT NULL,
  floor REAL,
  ceiling REAL,
  confidence REAL DEFAULT 0.85,
  source TEXT NOT NULL DEFAULT 'yardline_vbd_model',
  model_version TEXT DEFAULT 'v1.0',
  created_at TEXT NOT NULL,
  expires_at TEXT,
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  interval TEXT DEFAULT 'month',
  features_json TEXT NOT NULL,
  active INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  plan_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT DEFAULT 'active',
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  cancel_at_period_end INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (plan_id) REFERENCES plans(id)
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  provider_payment_id TEXT UNIQUE,
  status TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'BRL',
  method TEXT NOT NULL,
  paid_at TEXT,
  raw_event_id TEXT,
  metadata_json TEXT,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS sync_runs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  league_id TEXT,
  provider TEXT NOT NULL,
  resource TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  records_read INTEGER DEFAULT 0,
  records_written INTEGER DEFAULT 0,
  error_code TEXT,
  error_message TEXT,
  metric_status_json TEXT
);

CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  metadata_json TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_league_memberships_league ON league_memberships(league_id);
CREATE INDEX IF NOT EXISTS idx_rosters_league ON rosters(league_id);
CREATE INDEX IF NOT EXISTS idx_matchups_league_week ON matchups(league_id, week);
CREATE INDEX IF NOT EXISTS idx_matchup_players_matchup ON matchup_players(matchup_id);
CREATE INDEX IF NOT EXISTS idx_player_identities_lookup ON player_identities(provider, provider_player_id);
CREATE INDEX IF NOT EXISTS idx_projections_lookup ON projections(player_id, season, week, scoring_format);
CREATE INDEX IF NOT EXISTS idx_news_player_links_player ON news_player_links(player_id);

-- ========================================================
-- Sincronização Sleeper idempotente e scoring explicável
-- ========================================================

CREATE TABLE IF NOT EXISTS player_stats (
  id TEXT PRIMARY KEY,
  player_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  stats_json TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'sleeper',
  captured_at TEXT NOT NULL,
  UNIQUE(player_id, season, week, source),
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  provider_transaction_id TEXT NOT NULL,
  season TEXT NOT NULL,
  week INTEGER NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  roster_ids_json TEXT NOT NULL,
  adds_json TEXT NOT NULL,
  drops_json TEXT NOT NULL,
  draft_picks_json TEXT NOT NULL,
  waiver_budget_json TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  occurred_at TEXT,
  captured_at TEXT NOT NULL,
  UNIQUE(league_id, provider_transaction_id),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS traded_picks (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  season TEXT NOT NULL,
  round INTEGER NOT NULL,
  pick_no INTEGER,
  roster_id INTEGER,
  previous_owner_id INTEGER,
  owner_id INTEGER,
  raw_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  UNIQUE(league_id, season, round, pick_no),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS sync_payloads (
  id TEXT PRIMARY KEY,
  league_id TEXT,
  resource TEXT NOT NULL,
  resource_key TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  UNIQUE(resource, resource_key, payload_hash),
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS league_messages (
  id TEXT PRIMARY KEY,
  league_id TEXT NOT NULL,
  provider_user_id TEXT,
  author TEXT NOT NULL,
  initials TEXT,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (league_id) REFERENCES leagues(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_player_stats_lookup ON player_stats(player_id, season, week);
CREATE INDEX IF NOT EXISTS idx_transactions_league_week ON transactions(league_id, week);
CREATE INDEX IF NOT EXISTS idx_traded_picks_league ON traded_picks(league_id, season);
CREATE INDEX IF NOT EXISTS idx_sync_payloads_resource ON sync_payloads(resource, resource_key);
CREATE INDEX IF NOT EXISTS idx_league_messages_feed ON league_messages(league_id, created_at);
