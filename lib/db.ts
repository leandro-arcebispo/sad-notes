import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";

/**
 * Conexão SQLite (singleton). Cada fase do projeto estende `initSchema` com as
 * suas tabelas. A Fase 0 cria só a infraestrutura + a tabela `settings`
 * (chave/valor) — que já hospeda, entre outras coisas, o diretório configurável
 * onde o Catálogo de Sprites (F1) grava os PNGs recortados.
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
  `);
  seedDefaultSettings(db);
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
