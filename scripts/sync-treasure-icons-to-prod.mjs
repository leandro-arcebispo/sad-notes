// Sincroniza SÓ o icon_ornament_id dos Tesouros que já têm ícone no banco
// local (cortado manualmente via Oficina, ou importado dos scripts
// isaacguru.com/Repentance Plus) pro Turso de produção — nunca toca em
// transform_ornament_id, card_sprite_id, sheets, players ou games.
//
// Mesmo espírito do sync-treasure-cards-to-prod.mjs (Fase B): escopo
// estreito, idempotente, casa por nome (COLLATE NOCASE), pula o que a prod
// já tem. Ver plano completo em HANDOFF.md, seção "PLANO: sincronizar os
// 137 ícones locais pra prod".
//
// Uso: node --env-file=.env.production.local scripts/sync-treasure-icons-to-prod.mjs
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Faltando ${name} no ambiente. Rode com: node --env-file=.env.production.local scripts/sync-treasure-icons-to-prod.mjs`);
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

function contentTypeFor(localPath) {
  return localPath.toLowerCase().endsWith(".webp") ? "image/webp" : "image/png";
}

async function uploadToBlob(localPath) {
  const key = localPath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", key);
  const buffer = fs.readFileSync(abs);
  const res = await put(key, buffer, {
    access: "public",
    contentType: contentTypeFor(localPath),
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return res.url;
}

async function main() {
  const local = createClient({ url: "file:./data/sad-notes.db", intMode: "number" });
  const prod = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN, intMode: "number" });

  const candidates = await allRows(
    local,
    `SELECT t.id AS treasure_id, t.name, s.path, s.width, s.height,
            o.name AS ornament_name, o.offset_x, o.offset_y, o.scale,
            s.name AS sprite_name, s.created_at
       FROM treasures t
       JOIN ornaments o ON o.id = t.icon_ornament_id
       JOIN sprites s ON s.id = o.sprite_id
      WHERE t.icon_ornament_id IS NOT NULL
      ORDER BY t.id`
  );
  console.log(`Candidatos locais (com icon_ornament_id): ${candidates.length}`);

  let created = 0,
    skippedNoMatch = 0,
    skippedHasIcon = 0,
    failed = 0;
  const failures = [];

  for (const [i, t] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${t.name} ... `);
    try {
      const existing = await allRows(prod, "SELECT id, icon_ornament_id FROM treasures WHERE name = ? COLLATE NOCASE", [t.name]);
      if (!existing.length) {
        skippedNoMatch++;
        console.log("não achado em prod por nome — pulado");
        continue;
      }
      const prodTreasureId = existing[0].id;
      if (existing[0].icon_ornament_id !== null) {
        skippedHasIcon++;
        console.log("já tem ícone em prod — pulado");
        continue;
      }

      const url = await uploadToBlob(t.path);
      const spriteIns = await prod.execute({
        sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
              VALUES (?, 'treasure-icon', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
        args: [t.sprite_name, url, t.width, t.height, t.created_at],
      });
      const spriteId = Number(spriteIns.lastInsertRowid);

      const ornamentIns = await prod.execute({
        sql: `INSERT INTO ornaments (sprite_id, name, category, offset_x, offset_y, scale, created_at)
              VALUES (?, ?, 'diverso', ?, ?, ?, ?)`,
        args: [spriteId, t.ornament_name, t.offset_x, t.offset_y, t.scale, t.created_at],
      });
      const ornamentId = Number(ornamentIns.lastInsertRowid);

      await prod.execute({
        sql: `UPDATE treasures SET icon_ornament_id = ? WHERE id = ?`,
        args: [ornamentId, prodTreasureId],
      });
      created++;
      console.log("criado");
    } catch (err) {
      failed++;
      failures.push({ name: t.name, error: String(err) });
      console.log("FALHOU: " + String(err));
    }
  }

  console.log("\n=== Resumo ===");
  console.log(
    "Criados:", created,
    "| Sem match em prod:", skippedNoMatch,
    "| Já tinham ícone em prod:", skippedHasIcon,
    "| Falhas:", failed
  );
  if (failures.length) console.log(JSON.stringify(failures, null, 2));

  const totalWithIcon = await allRows(prod, "SELECT COUNT(*) AS n FROM treasures WHERE icon_ornament_id IS NOT NULL");
  const totalSprites = await allRows(prod, "SELECT COUNT(*) AS n FROM sprites");
  console.log("Treasures com ícone em prod agora:", totalWithIcon[0].n);
  console.log("Total de sprites em prod agora:", totalSprites[0].n);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
