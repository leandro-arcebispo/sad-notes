// Sincroniza o CATÁLOGO (sprites, sheets, ornaments, treasures) do banco local
// (data/sad-notes.db) pro Turso de produção + Vercel Blob. NÃO toca em dados
// de uso real (players, games, game_players, game_player_treasures, feedback)
// — decisão consciente, ver HANDOFF.md.
//
// Uso: node --env-file=.env.production.local scripts/sync-catalog-to-prod.mjs
//   (precisa de TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, BLOB_READ_WRITE_TOKEN)
//
// Idempotência: aborta se a prod já tiver QUALQUER linha nas 4 tabelas de
// catálogo, pra nunca duplicar. Se for re-rodar depois de mais cadastro local
// (ex.: mais ícones cortados), rode de novo contra uma prod ainda vazia nessas
// tabelas, ou apague manualmente antes (é a prod, tenha certeza).
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Faltando ${name} no ambiente. Rode com: node --env-file=.env.production.local scripts/sync-catalog-to-prod.mjs`);
    process.exit(1);
  }
  return v;
}

const TURSO_URL = need("TURSO_DATABASE_URL");
const TURSO_TOKEN = need("TURSO_AUTH_TOKEN");
need("BLOB_READ_WRITE_TOKEN"); // lido implicitamente por @vercel/blob via process.env

const CATALOG_SCHEMA = `
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
  CREATE TABLE IF NOT EXISTS treasures (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    name                  TEXT NOT NULL COLLATE NOCASE UNIQUE,
    icon_ornament_id      INTEGER REFERENCES ornaments(id),
    transform_ornament_id INTEGER REFERENCES ornaments(id),
    card_sprite_id        INTEGER REFERENCES sprites(id),
    unlock_mode           TEXT NOT NULL DEFAULT 'treasure_item',
    created_at            TEXT NOT NULL
  );
`;

function extToContentType(ext) {
  const e = ext.toLowerCase();
  if (e === "png") return "image/png";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "webp") return "image/webp";
  if (e === "gif") return "image/gif";
  return "application/octet-stream";
}

/** SELECT → array de objetos planos (mesma lógica de lib/db.ts). */
async function allRows(client, sql) {
  const rs = await client.execute(sql);
  return rs.rows.map((row) => {
    const o = {};
    rs.columns.forEach((c, i) => (o[c] = row[i]));
    return o;
  });
}

/** Sobe um arquivo de public/<path local> pro Blob, devolve a URL pública. */
async function uploadToBlob(localPath) {
  const key = localPath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", key);
  const buffer = fs.readFileSync(abs);
  const ext = path.extname(key).slice(1);
  const res = await put(key, buffer, {
    access: "public",
    contentType: extToContentType(ext),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return res.url;
}

async function main() {
  const local = createClient({ url: "file:./data/sad-notes.db", intMode: "number" });
  const prod = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN, intMode: "number" });

  await prod.executeMultiple(CATALOG_SCHEMA);

  for (const t of ["sprites", "sheets", "ornaments", "treasures"]) {
    const rows = await allRows(prod, `SELECT COUNT(*) AS n FROM ${t}`);
    if (rows[0].n > 0) {
      console.error(
        `Prod já tem ${rows[0].n} linha(s) em '${t}' — abortando pra não duplicar.\n` +
          `Se a intenção é mesmo ressincronizar, limpe a tabela na prod manualmente antes de rodar de novo.`
      );
      process.exit(1);
    }
  }
  console.log("Prod vazia nas 4 tabelas de catálogo — prosseguindo.\n");

  // ---- sheets (independente) ----
  const sheets = await allRows(local, "SELECT * FROM sheets ORDER BY id");
  console.log(`Sheets: ${sheets.length}`);
  for (const s of sheets) {
    const url = await uploadToBlob(s.path);
    await prod.execute({
      sql: "INSERT INTO sheets (name, path, width, height, created_at) VALUES (?, ?, ?, ?, ?)",
      args: [s.name, url, s.width, s.height, s.created_at],
    });
    console.log(`  ✓ ${s.name}`);
  }

  // ---- sprites (independente) ----
  const sprites = await allRows(local, "SELECT * FROM sprites ORDER BY id");
  console.log(`\nSprites: ${sprites.length}`);
  const spriteIdMap = new Map();
  for (const [i, s] of sprites.entries()) {
    const url = await uploadToBlob(s.path);
    const ins = await prod.execute({
      sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.name, s.category, url, s.width, s.height, s.source_sheet, s.sx, s.sy, s.sw, s.sh, s.created_at],
    });
    spriteIdMap.set(s.id, Number(ins.lastInsertRowid));
    if ((i + 1) % 25 === 0 || i === sprites.length - 1) {
      console.log(`  ... ${i + 1}/${sprites.length}`);
    }
  }

  // ---- ornaments (depende de sprites) ----
  const ornaments = await allRows(local, "SELECT * FROM ornaments ORDER BY id");
  console.log(`\nOrnaments: ${ornaments.length}`);
  const ornamentIdMap = new Map();
  for (const o of ornaments) {
    const newSpriteId = spriteIdMap.get(o.sprite_id);
    if (!newSpriteId) {
      console.error(`  ✗ ornament "${o.name}" (id ${o.id}) referencia sprite_id ${o.sprite_id} que não foi migrado — pulando.`);
      continue;
    }
    const ins = await prod.execute({
      sql: `INSERT INTO ornaments (sprite_id, name, category, offset_x, offset_y, scale, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [newSpriteId, o.name, o.category, o.offset_x, o.offset_y, o.scale, o.created_at],
    });
    ornamentIdMap.set(o.id, Number(ins.lastInsertRowid));
    console.log(`  ✓ ${o.name}`);
  }

  // ---- treasures (depende de ornaments + sprites) ----
  const treasures = await allRows(local, "SELECT * FROM treasures ORDER BY id");
  console.log(`\nTreasures: ${treasures.length}`);
  let ok = 0;
  for (const t of treasures) {
    const iconId = t.icon_ornament_id ? ornamentIdMap.get(t.icon_ornament_id) ?? null : null;
    const transformId = t.transform_ornament_id ? ornamentIdMap.get(t.transform_ornament_id) ?? null : null;
    const cardId = t.card_sprite_id ? spriteIdMap.get(t.card_sprite_id) ?? null : null;
    await prod.execute({
      sql: `INSERT INTO treasures (name, icon_ornament_id, transform_ornament_id, card_sprite_id, unlock_mode, created_at)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [t.name, iconId, transformId, cardId, t.unlock_mode, t.created_at],
    });
    ok++;
  }
  console.log(`  ✓ ${ok} tesouros criados`);

  console.log("\n=== Resumo ===");
  console.log("sheets:", sheets.length, "| sprites:", sprites.length, "| ornaments:", ornamentIdMap.size, "/", ornaments.length, "| treasures:", ok);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
