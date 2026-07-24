// Sincroniza carta + item inicial dos Personagens (importados localmente via
// foursouls.com, ver HANDOFF.md) do banco local pro Turso de produção +
// Vercel Blob.
//
// Escopo estreito, mesmo espírito de scripts/sync-treasure-cards-to-prod.mjs:
// só soma `sprites` (categorias character-card/character-item) e faz
// UPDATE em `characters` (card_sprite_id/starter_item_sprite_id/
// starter_item_name) das linhas que a prod já tem (casadas por nome exato,
// COLLATE NOCASE — characters já é seedado idêntico local/prod desde a Fase
// 1, então não deveria faltar nenhuma, mas o script não assume isso: avisa e
// pula em vez de criar linha nova). NUNCA toca em name/expansion/tainted/
// active nem em outras tabelas (players/games/outros Artefatos). Idempotente
// — pula quem a prod já tiver com card_sprite_id preenchido.
//
// Rodar SÓ depois de validar localmente (ver /artefatos/personagens):
//   node --env-file=.env.production.local scripts/sync-character-cards-to-prod.mjs
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(
      `Faltando ${name} no ambiente. Rode com: node --env-file=.env.production.local scripts/sync-character-cards-to-prod.mjs`
    );
    process.exit(1);
  }
  return v;
}

const TURSO_URL = need("TURSO_DATABASE_URL");
const TURSO_TOKEN = need("TURSO_AUTH_TOKEN");
need("BLOB_READ_WRITE_TOKEN");

async function allRows(client, sql, args) {
  const rs = await client.execute(args ? { sql, args } : sql);
  return rs.rows.map((row) => {
    const o = {};
    rs.columns.forEach((c, i) => (o[c] = row[i]));
    return o;
  });
}

async function ensureColumn(client, table, column, ddl) {
  const info = await client.execute(`PRAGMA table_info(${table})`);
  const exists = info.rows.some((r) => String(r[1]) === column);
  if (!exists) await client.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`);
}

async function uploadToBlob(name, category, localPath) {
  const key = localPath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", key);
  const buffer = fs.readFileSync(abs);
  const blobKey = `sprites/${category}/${path.basename(key)}`;
  const res = await put(blobKey, buffer, {
    access: "public",
    contentType: "image/png",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return res.url;
}

async function main() {
  const local = createClient({ url: "file:./data/sad-notes.db", intMode: "number" });
  const prod = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN, intMode: "number" });

  // Prod pode não ter rodado ainda o initSchema() com as colunas novas
  // (armadilha #11 do HANDOFF — scripts soltos não migram schema sozinhos).
  await ensureColumn(prod, "characters", "card_sprite_id", "INTEGER REFERENCES sprites(id)");
  await ensureColumn(prod, "characters", "starter_item_sprite_id", "INTEGER REFERENCES sprites(id)");
  await ensureColumn(prod, "characters", "starter_item_name", "TEXT");

  const candidates = await allRows(
    local,
    `SELECT c.id, c.name, c.starter_item_name,
            sc.path AS card_path, sc.width AS card_w, sc.height AS card_h,
            si.path AS item_path, si.width AS item_w, si.height AS item_h
       FROM characters c
       JOIN sprites sc ON sc.id = c.card_sprite_id
       LEFT JOIN sprites si ON si.id = c.starter_item_sprite_id
      WHERE c.card_sprite_id IS NOT NULL
      ORDER BY c.id`
  );
  console.log(`Personagens locais com carta: ${candidates.length}`);

  let created = 0,
    skipped = 0,
    notFound = 0,
    failed = 0;
  const issues = [];

  for (const [i, ch] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${ch.name} ... `);
    try {
      const existing = await allRows(
        prod,
        "SELECT id, card_sprite_id FROM characters WHERE name = ? COLLATE NOCASE",
        [ch.name]
      );
      if (existing.length === 0) {
        notFound++;
        issues.push({ name: ch.name, issue: "não encontrado em prod" });
        console.log("⚠ não encontrado em prod — pulado");
        continue;
      }
      if (existing[0].card_sprite_id != null) {
        skipped++;
        console.log("já tem carta em prod — pulado");
        continue;
      }
      const prodId = existing[0].id;

      const cardUrl = await uploadToBlob(ch.name, "character-card", ch.card_path);
      const cardSpriteIns = await prod.execute({
        sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
              VALUES (?, 'character-card', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
        args: [ch.name, cardUrl, ch.card_w, ch.card_h, new Date().toISOString()],
      });
      const cardSpriteId = Number(cardSpriteIns.lastInsertRowid);

      let itemSpriteId = null;
      if (ch.item_path) {
        const itemUrl = await uploadToBlob(ch.starter_item_name || ch.name, "character-item", ch.item_path);
        const itemSpriteIns = await prod.execute({
          sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
                VALUES (?, 'character-item', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
          args: [ch.starter_item_name || ch.name, itemUrl, ch.item_w, ch.item_h, new Date().toISOString()],
        });
        itemSpriteId = Number(itemSpriteIns.lastInsertRowid);
      }

      await prod.execute({
        sql: `UPDATE characters
                 SET card_sprite_id = ?, starter_item_sprite_id = ?, starter_item_name = ?
               WHERE id = ?`,
        args: [cardSpriteId, itemSpriteId, ch.starter_item_name, prodId],
      });
      created++;
      console.log("criado");
    } catch (err) {
      failed++;
      issues.push({ name: ch.name, issue: String(err) });
      console.log("FALHOU: " + String(err));
    }
  }

  console.log("\n=== Resumo ===");
  console.log(
    "Criados:",
    created,
    "| Já tinham (pulados):",
    skipped,
    "| Não encontrados em prod:",
    notFound,
    "| Falhas:",
    failed
  );
  if (issues.length) console.log(JSON.stringify(issues, null, 2));

  const total = await allRows(prod, "SELECT COUNT(*) AS n FROM characters WHERE card_sprite_id IS NOT NULL");
  console.log("Personagens com carta em prod agora:", total[0].n);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
