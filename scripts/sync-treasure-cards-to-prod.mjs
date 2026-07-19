// Sincroniza SÓ os Tesouros importados na Fase A (nome + carta ilustrativa,
// sem ícone/transformação) do banco local pro Turso de produção + Vercel Blob.
//
// Escopo deliberadamente estreito: a prod NÃO está vazia (achado em
// 2026-07-19) — já tem trabalho manual real (ex.: "Lazaru's Rags" com
// ícone/transformação/carta prontos, sprites de cabelo, sheets de
// personagem) que não existe local, e vice-versa. Este script NUNCA toca em
// `sheets`/`ornaments`/players/games — só soma os 158 Tesouros novos que a
// prod ainda não tem, identificados por não ter ícone nem transformação
// (`card_sprite_id IS NOT NULL AND icon_ornament_id IS NULL AND
// transform_ornament_id IS NULL`), e pula por nome (COLLATE NOCASE) qualquer
// um que a prod já tenha, pra poder rodar de novo com segurança.
//
// Uso: node --env-file=.env.production.local scripts/sync-treasure-cards-to-prod.mjs
import { createClient } from "@libsql/client";
import { put } from "@vercel/blob";
import fs from "node:fs";
import path from "node:path";

function need(name) {
  const v = process.env[name];
  if (!v) {
    console.error(`Faltando ${name} no ambiente. Rode com: node --env-file=.env.production.local scripts/sync-treasure-cards-to-prod.mjs`);
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

async function uploadToBlob(localPath) {
  const key = localPath.replace(/^\//, "");
  const abs = path.join(process.cwd(), "public", key);
  const buffer = fs.readFileSync(abs);
  const res = await put(key, buffer, {
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

  const candidates = await allRows(
    local,
    `SELECT t.id, t.name, t.unlock_mode, t.created_at, s.path
       FROM treasures t
       JOIN sprites s ON s.id = t.card_sprite_id
      WHERE t.card_sprite_id IS NOT NULL
        AND t.icon_ornament_id IS NULL
        AND t.transform_ornament_id IS NULL
      ORDER BY t.id`
  );
  console.log(`Candidatos locais (Fase A, card-only): ${candidates.length}`);

  let created = 0,
    skipped = 0,
    failed = 0;
  const failures = [];

  for (const [i, t] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${t.name} ... `);
    try {
      const existing = await allRows(prod, "SELECT id FROM treasures WHERE name = ? COLLATE NOCASE", [t.name]);
      if (existing.length) {
        skipped++;
        console.log("já existe em prod — pulado");
        continue;
      }

      const url = await uploadToBlob(t.path);
      const spriteIns = await prod.execute({
        sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
              VALUES (?, 'treasure-card', ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
        args: [t.name, url, 308, 420, t.created_at],
      });
      const spriteId = Number(spriteIns.lastInsertRowid);

      await prod.execute({
        sql: `INSERT INTO treasures (name, icon_ornament_id, transform_ornament_id, card_sprite_id, unlock_mode, created_at)
              VALUES (?, NULL, NULL, ?, ?, ?)`,
        args: [t.name, spriteId, t.unlock_mode, t.created_at],
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
  console.log("Criados:", created, "| Já existiam (pulados):", skipped, "| Falhas:", failed);
  if (failures.length) console.log(JSON.stringify(failures, null, 2));

  const total = await allRows(prod, "SELECT COUNT(*) AS n FROM treasures");
  console.log("Total de treasures em prod agora:", total[0].n);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
