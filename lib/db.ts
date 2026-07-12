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

    CREATE INDEX IF NOT EXISTS idx_players_active ON players(active);
    CREATE INDEX IF NOT EXISTS idx_characters_active ON characters(active);
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
