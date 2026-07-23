import { createClient, type Client, type InArgs, type Row } from "@libsql/client";
import { SEED_CHARACTERS } from "./seed-characters";

/**
 * Conexão libSQL (Turso em produção; arquivo local em dev). Substituiu o
 * better-sqlite3 síncrono na migração pro Vercel — o cliente do libSQL é
 * assíncrono, então toda a camada de dados usa `await`.
 *
 * - **Produção:** `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` (Turso).
 * - **Dev:** sem essas vars, cai para `file:./data/sad-notes.db` (mesmo arquivo
 *   SQLite de antes; o dialeto é idêntico), então dá pra rodar/testar local sem
 *   nenhuma conta na nuvem.
 */

let _client: Client | null = null;
let _ready: Promise<void> | null = null;

function rawClient(): Client {
  if (_client) return _client;
  const url = process.env.TURSO_DATABASE_URL || "file:./data/sad-notes.db";
  const authToken = process.env.TURSO_AUTH_TOKEN;
  _client = createClient(
    authToken ? { url, authToken, intMode: "number" } : { url, intMode: "number" }
  );
  return _client;
}

/** Cliente pronto (schema garantido). Use os helpers `all/get/run` no lugar. */
export async function getClient(): Promise<Client> {
  const c = rawClient();
  if (!_ready) _ready = initSchema(c);
  await _ready;
  return c;
}

function rowToObject<T>(columns: string[], row: Row): T {
  const o: Record<string, unknown> = {};
  for (let i = 0; i < columns.length; i++) o[columns[i]] = row[i];
  return o as T;
}

/** SELECT → array de objetos planos (serializáveis em JSON). */
export async function all<T>(sql: string, args?: InArgs): Promise<T[]> {
  const db = await getClient();
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return rs.rows.map((r) => rowToObject<T>(rs.columns, r));
}

/** SELECT de uma linha (ou undefined). */
export async function get<T>(sql: string, args?: InArgs): Promise<T | undefined> {
  const rows = await all<T>(sql, args);
  return rows[0];
}

/** INSERT/UPDATE/DELETE → { lastId, changes }. */
export async function run(
  sql: string,
  args?: InArgs
): Promise<{ lastId: number; changes: number }> {
  const db = await getClient();
  const rs = await db.execute(args === undefined ? sql : { sql, args });
  return {
    lastId: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
    changes: rs.rowsAffected,
  };
}

async function initSchema(db: Client): Promise<void> {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS players (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      nickname     TEXT,
      color        TEXT NOT NULL DEFAULT '#e8b978',
      base_face    TEXT NOT NULL DEFAULT 'white',
      hair_color   TEXT NOT NULL DEFAULT 'natural',
      avatar_cache TEXT,
      active       INTEGER NOT NULL DEFAULT 1,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS characters (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT NOT NULL,
      expansion   TEXT NOT NULL DEFAULT 'base',
      tainted     INTEGER NOT NULL DEFAULT 0,
      sprite_path TEXT,
      active      INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS items (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL COLLATE NOCASE UNIQUE,
      first_seen_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS games (
      id                  INTEGER PRIMARY KEY AUTOINCREMENT,
      played_at           TEXT NOT NULL,
      edition             TEXT NOT NULL DEFAULT 'base',
      souls_to_win        INTEGER NOT NULL DEFAULT 4,
      character_selection TEXT NOT NULL DEFAULT 'free',
      format              TEXT NOT NULL DEFAULT 'solo',
      tournament_id       INTEGER,
      duration_min        INTEGER,
      rounds              INTEGER,
      notes               TEXT,
      created_at          TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_players (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id       INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
      player_id     INTEGER NOT NULL REFERENCES players(id),
      character_id  INTEGER REFERENCES characters(id),
      had_reroll    INTEGER NOT NULL DEFAULT 0,
      loot_in_hand  INTEGER NOT NULL DEFAULT 0,
      coins         INTEGER NOT NULL DEFAULT 0,
      deaths        INTEGER NOT NULL DEFAULT 0,
      treasures     INTEGER NOT NULL DEFAULT 0,
      souls         INTEGER NOT NULL DEFAULT 0,
      is_winner     INTEGER NOT NULL DEFAULT 0,
      team          INTEGER,
      seat_order    INTEGER NOT NULL DEFAULT 0,
      UNIQUE (game_id, player_id)
    );

    CREATE TABLE IF NOT EXISTS game_player_items (
      game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
      item_id        INTEGER NOT NULL REFERENCES items(id),
      PRIMARY KEY (game_player_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS sprites (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT NOT NULL,
      category     TEXT NOT NULL DEFAULT 'outro',
      path         TEXT NOT NULL,
      width        INTEGER NOT NULL,
      height       INTEGER NOT NULL,
      source_sheet TEXT,
      sx           INTEGER,
      sy           INTEGER,
      sw           INTEGER,
      sh           INTEGER,
      created_at   TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sheets (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      name       TEXT NOT NULL,
      path       TEXT NOT NULL,
      width      INTEGER NOT NULL,
      height     INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ornaments (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      sprite_id  INTEGER NOT NULL REFERENCES sprites(id) ON DELETE CASCADE,
      name       TEXT NOT NULL,
      category   TEXT NOT NULL DEFAULT 'diverso',
      offset_x   INTEGER NOT NULL DEFAULT 0,
      offset_y   INTEGER NOT NULL DEFAULT 0,
      scale      INTEGER NOT NULL DEFAULT 100,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_ornaments (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id   INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      ornament_id INTEGER NOT NULL REFERENCES ornaments(id) ON DELETE CASCADE,
      sort_order  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS treasures (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      name                  TEXT NOT NULL COLLATE NOCASE UNIQUE,
      icon_ornament_id      INTEGER REFERENCES ornaments(id),
      transform_ornament_id INTEGER REFERENCES ornaments(id),
      card_sprite_id        INTEGER REFERENCES sprites(id),
      unlock_mode           TEXT NOT NULL DEFAULT 'treasure_item',
      created_at            TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS game_player_treasures (
      game_player_id INTEGER NOT NULL REFERENCES game_players(id) ON DELETE CASCADE,
      treasure_id    INTEGER NOT NULL REFERENCES treasures(id),
      PRIMARY KEY (game_player_id, treasure_id)
    );

    CREATE TABLE IF NOT EXISTS curses (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL COLLATE NOCASE UNIQUE,
      card_sprite_id INTEGER REFERENCES sprites(id),
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS monsters (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      name           TEXT NOT NULL COLLATE NOCASE UNIQUE,
      card_sprite_id INTEGER REFERENCES sprites(id),
      created_at     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id                 INTEGER PRIMARY KEY AUTOINCREMENT,
      kind               TEXT NOT NULL DEFAULT 'bug',
      title              TEXT NOT NULL DEFAULT '',
      description        TEXT NOT NULL,
      area               TEXT NOT NULL DEFAULT 'geral',
      priority           TEXT NOT NULL DEFAULT 'media',
      status             TEXT NOT NULL DEFAULT 'aberto',
      player_id          INTEGER REFERENCES players(id),
      assignee_player_id INTEGER REFERENCES players(id),
      created_at         TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_players_active ON players(active);
    CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(active);
    CREATE INDEX IF NOT EXISTS idx_sprites_category ON sprites(category);
    CREATE INDEX IF NOT EXISTS idx_ornaments_category ON ornaments(category);
    CREATE INDEX IF NOT EXISTS idx_player_ornaments_player ON player_ornaments(player_id);
    CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at);
    CREATE INDEX IF NOT EXISTS idx_gp_game ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_gp_player ON game_players(player_id);
    CREATE INDEX IF NOT EXISTS idx_gpi_item ON game_player_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
    CREATE INDEX IF NOT EXISTS idx_feedback_created ON feedback(created_at);
    CREATE INDEX IF NOT EXISTS idx_sheets_created ON sheets(created_at);
    CREATE INDEX IF NOT EXISTS idx_gpt_treasure ON game_player_treasures(treasure_id);
  `);
  await ensureColumn(db, "curses", "locked", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(db, "feedback", "title", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn(db, "feedback", "assignee_player_id", "INTEGER REFERENCES players(id)");
  await seedDefaultSettings(db);
  await seedCharactersIfEmpty(db);
}

/** Adiciona uma coluna a uma tabela já existente, se ela ainda não existir —
 * `CREATE TABLE IF NOT EXISTS` não cobre colunas novas em tabelas que já têm
 * dado real, e rodar `ALTER TABLE ADD COLUMN` duas vezes falha. */
async function ensureColumn(
  db: Client,
  table: string,
  column: string,
  ddl: string
): Promise<void> {
  const info = await db.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((r) => String(r[1]) === column);
  if (!exists) {
    await db.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
  }
}

async function seedCharactersIfEmpty(db: Client): Promise<void> {
  const rs = await db.execute("SELECT COUNT(*) AS n FROM characters");
  const n = Number(rs.rows[0][0]);
  if (n > 0) return;
  await db.batch(
    SEED_CHARACTERS.map((c) => ({
      sql: "INSERT INTO characters (name, expansion, tainted) VALUES (?, ?, ?)",
      args: [c.name, c.expansion, c.tainted ? 1 : 0],
    })),
    "write"
  );
}

async function seedDefaultSettings(db: Client): Promise<void> {
  await db.execute({
    sql: "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)",
    args: ["sprites_dir", "sprites"],
  });
}

export async function getSetting(key: string): Promise<string | null> {
  const row = await get<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await run(
    "INSERT INTO settings (key, value) VALUES (?, ?) " +
      "ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    [key, value]
  );
}

export function nowIso(): string {
  return new Date().toISOString();
}
