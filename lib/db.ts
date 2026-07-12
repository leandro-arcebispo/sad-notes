import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import { SEED_CHARACTERS } from "./seed-characters";

/**
 * Conexão SQLite (singleton). Cada fase do projeto estende `initSchema` com as
 * suas tabelas. A Fase 0 criou a infra + `settings`; a Fase 1 adiciona
 * `players` e `characters` (com seed do roster Four Souls + Requiem).
 */

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "sad-notes.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  initSchema(db);
  _db = db;
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
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
      tournament_id       INTEGER,            -- null = Global Board
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

    CREATE INDEX IF NOT EXISTS idx_players_active ON players(active);
    CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(active);
    CREATE INDEX IF NOT EXISTS idx_sprites_category ON sprites(category);
    CREATE INDEX IF NOT EXISTS idx_ornaments_category ON ornaments(category);
    CREATE INDEX IF NOT EXISTS idx_player_ornaments_player ON player_ornaments(player_id);
    CREATE INDEX IF NOT EXISTS idx_games_played_at ON games(played_at);
    CREATE INDEX IF NOT EXISTS idx_gp_game ON game_players(game_id);
    CREATE INDEX IF NOT EXISTS idx_gp_player ON game_players(player_id);
    CREATE INDEX IF NOT EXISTS idx_gpi_item ON game_player_items(item_id);
  `);
  seedDefaultSettings(db);
  seedCharactersIfEmpty(db);
}

function seedCharactersIfEmpty(db: Database.Database) {
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM characters").get() as {
    n: number;
  };
  if (n > 0) return;
  const insert = db.prepare(
    "INSERT INTO characters (name, expansion, tainted) VALUES (?, ?, ?)"
  );
  const seed = db.transaction(() => {
    for (const c of SEED_CHARACTERS) {
      insert.run(c.name, c.expansion, c.tainted ? 1 : 0);
    }
  });
  seed();
}

/** Configurações padrão idempotentes (INSERT OR IGNORE). */
function seedDefaultSettings(db: Database.Database) {
  const put = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)"
  );
  const seed = db.transaction(() => {
    // Diretório (relativo a /public) onde o catálogo de sprites grava os PNGs.
    put.run("sprites_dir", "sprites");
  });
  seed();
}

export function getSetting(key: string): string | null {
  const row = getDb()
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get(key) as { value: string } | undefined;
  return row?.value ?? null;
}

export function setSetting(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO settings (key, value) VALUES (?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value"
    )
    .run(key, value);
}

export function nowIso(): string {
  return new Date().toISOString();
}
