// Sincroniza carta + item inicial (+ versos reais dupla-face) dos
// Personagens do banco local pro Turso de produção + Vercel Blob.
//
// Escopo, mesmo espírito de scripts/sync-treasure-cards-to-prod.mjs: só soma
// `sprites` (categorias character-card/character-item) e atualiza
// card_sprite_id/starter_item_sprite_id/starter_item_name/
// card_back_sprite_id/starter_item_back_sprite_id em `characters`. NUNCA
// toca em expansion/tainted/active nem em outras tabelas (players/games/
// outros Artefatos).
//
// Casamento por nome (COLLATE NOCASE) — MAS com um detalhe importante desta
// rodada: vários personagens foram RENOMEADOS localmente nesta sessão
// (epítetos oficiais da Requiem, ex. "Tainted Isaac" -> "The Broken"; "???"
// -> "Blue Baby") e a prod nunca recebeu esses renomes (foi seedada com os
// nomes antigos há muito tempo e não foi tocada). O script tenta o nome
// atual primeiro; se não achar, tenta o ALIAS_MAP abaixo (nome antigo) e,
// se achar por ali, RENOMEIA a linha da prod pro nome atual como parte do
// mesmo update (não dá pra sincronizar a carta certa sob o rótulo errado).
//
// "Flash Isaac" é candidato NOVO que nunca existiu na prod (adicionado nesta
// sessão) — é o único caso em que o script CRIA uma linha nova em
// `characters` (efeitos colaterais em outras tabelas/roster não existem: é
// só uma linha de catálogo). Qualquer outro nome que não bater nem direto
// nem por alias é reportado e pulado, nunca criado — evita linha nova por
// engano de dado divergente.
//
// Uso: node --env-file=.env.production.local scripts/sync-character-cards-to-prod.mjs
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

// nome antigo (como a prod ainda deve estar) -> nome atual (local)
const ALIAS_MAP = {
  "???": "Blue Baby",
  "Tainted Isaac": "The Broken",
  "Tainted Magdalene": "The Dauntless",
  "Tainted Cain": "The Hoarder",
  "Tainted Judas": "The Deceiver",
  "Tainted ???": "The Soiled",
  "Tainted Eve": "The Curdled",
  "Tainted Samson": "The Savage",
  "Tainted Azazel": "The Benighted",
  "Tainted Lazarus": "The Enigma",
  "Tainted Eden": "The Capricious",
  "Tainted Lost": "The Baleful",
  "Tainted Lilith": "The Harlot",
  "Tainted Keeper": "The Miser",
  "Tainted Apollyon": "The Empty",
  "Tainted Forgotten": "The Fettered",
  "Tainted Bethany": "The Zealot",
  "Tainted Jacob": "The Deserter",
};
const OLD_NAME_BY_NEW = new Map(Object.entries(ALIAS_MAP).map(([oldN, newN]) => [newN, oldN]));

// Único nome que pode virar linha NOVA em prod se não achar por nome nem alias.
const ALLOW_CREATE = new Set(["Flash Isaac"]);

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

async function uploadSprite(prod, name, category, spritePathLocal, w, h) {
  const url = await uploadToBlob(name, category, spritePathLocal);
  const ins = await prod.execute({
    sql: `INSERT INTO sprites (name, category, path, width, height, source_sheet, sx, sy, sw, sh, created_at)
          VALUES (?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, ?)`,
    args: [name, category, url, w, h, new Date().toISOString()],
  });
  return Number(ins.lastInsertRowid);
}

async function findInProd(prod, localName) {
  const direct = await allRows(
    prod,
    "SELECT * FROM characters WHERE name = ? COLLATE NOCASE",
    [localName]
  );
  if (direct.length) return { row: direct[0], renamed: false };

  const oldName = OLD_NAME_BY_NEW.get(localName);
  if (oldName) {
    const viaAlias = await allRows(
      prod,
      "SELECT * FROM characters WHERE name = ? COLLATE NOCASE",
      [oldName]
    );
    if (viaAlias.length) return { row: viaAlias[0], renamed: true };
  }
  return null;
}

async function main() {
  const local = createClient({ url: "file:./data/sad-notes.db", intMode: "number" });
  const prod = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN, intMode: "number" });

  // Prod pode não ter rodado ainda o initSchema() com as colunas novas
  // (armadilha #11 do HANDOFF — scripts soltos não migram schema sozinhos).
  await ensureColumn(prod, "characters", "card_sprite_id", "INTEGER REFERENCES sprites(id)");
  await ensureColumn(prod, "characters", "starter_item_sprite_id", "INTEGER REFERENCES sprites(id)");
  await ensureColumn(prod, "characters", "starter_item_name", "TEXT");
  await ensureColumn(prod, "characters", "card_back_sprite_id", "INTEGER REFERENCES sprites(id)");
  await ensureColumn(prod, "characters", "starter_item_back_sprite_id", "INTEGER REFERENCES sprites(id)");

  const candidates = await allRows(
    local,
    `SELECT c.id, c.name, c.expansion, c.tainted, c.starter_item_name,
            sc.path AS card_path, sc.width AS card_w, sc.height AS card_h,
            si.path AS item_path, si.width AS item_w, si.height AS item_h,
            scb.path AS card_back_path, scb.width AS card_back_w, scb.height AS card_back_h,
            sib.path AS item_back_path, sib.width AS item_back_w, sib.height AS item_back_h
       FROM characters c
       JOIN sprites sc ON sc.id = c.card_sprite_id
       LEFT JOIN sprites si ON si.id = c.starter_item_sprite_id
       LEFT JOIN sprites scb ON scb.id = c.card_back_sprite_id
       LEFT JOIN sprites sib ON sib.id = c.starter_item_back_sprite_id
      WHERE c.card_sprite_id IS NOT NULL
      ORDER BY c.id`
  );
  console.log(`Personagens locais com carta: ${candidates.length}`);

  let created = 0,
    updated = 0,
    renamed = 0,
    skipped = 0,
    backfilledBacks = 0,
    notFound = 0,
    failed = 0;
  const issues = [];

  for (const [i, ch] of candidates.entries()) {
    process.stdout.write(`[${i + 1}/${candidates.length}] ${ch.name} ... `);
    try {
      const match = await findInProd(prod, ch.name);

      if (!match) {
        if (ALLOW_CREATE.has(ch.name)) {
          const ins = await prod.execute({
            sql: `INSERT INTO characters (name, expansion, tainted, active) VALUES (?, ?, ?, 1)`,
            args: [ch.name, ch.expansion, ch.tainted],
          });
          const prodId = Number(ins.lastInsertRowid);
          const cardSpriteId = await uploadSprite(prod, ch.name, "character-card", ch.card_path, ch.card_w, ch.card_h);
          const itemSpriteId = ch.item_path
            ? await uploadSprite(prod, ch.starter_item_name || ch.name, "character-item", ch.item_path, ch.item_w, ch.item_h)
            : null;
          await prod.execute({
            sql: `UPDATE characters SET card_sprite_id = ?, starter_item_sprite_id = ?, starter_item_name = ? WHERE id = ?`,
            args: [cardSpriteId, itemSpriteId, ch.starter_item_name, prodId],
          });
          created++;
          console.log("criado (personagem novo em prod)");
          continue;
        }
        notFound++;
        issues.push({ name: ch.name, issue: "não encontrado em prod (nem por nome nem por alias)" });
        console.log("⚠ não encontrado em prod — pulado");
        continue;
      }

      const prodRow = match.row;

      if (match.renamed) {
        await prod.execute({
          sql: "UPDATE characters SET name = ? WHERE id = ?",
          args: [ch.name, prodRow.id],
        });
        renamed++;
      }

      if (prodRow.card_sprite_id != null) {
        skipped++;
        console.log(match.renamed ? "renomeado (já tinha carta)" : "já tinha carta em prod — pulado");
      } else {
        const cardSpriteId = await uploadSprite(prod, ch.name, "character-card", ch.card_path, ch.card_w, ch.card_h);
        let itemSpriteId = null;
        if (ch.item_path) {
          itemSpriteId = await uploadSprite(
            prod,
            ch.starter_item_name || ch.name,
            "character-item",
            ch.item_path,
            ch.item_w,
            ch.item_h
          );
        }
        await prod.execute({
          sql: `UPDATE characters
                   SET card_sprite_id = ?, starter_item_sprite_id = ?, starter_item_name = ?
                 WHERE id = ?`,
          args: [cardSpriteId, itemSpriteId, ch.starter_item_name, prodRow.id],
        });
        updated++;
        console.log(match.renamed ? "renomeado + carta criada" : "carta criada");
      }

      // Versos reais dupla-face (The Enigma / The Deserter) — backfill
      // independente do bloco acima, pra poder rodar de novo com segurança
      // mesmo que o card_sprite_id principal já estivesse preenchido.
      const freshProd = (
        await allRows(prod, "SELECT card_back_sprite_id, starter_item_back_sprite_id FROM characters WHERE id = ?", [
          prodRow.id,
        ])
      )[0];

      if (ch.card_back_path && freshProd.card_back_sprite_id == null) {
        const backId = await uploadSprite(
          prod,
          `${ch.name} (verso)`,
          "character-card",
          ch.card_back_path,
          ch.card_back_w,
          ch.card_back_h
        );
        await prod.execute({
          sql: "UPDATE characters SET card_back_sprite_id = ? WHERE id = ?",
          args: [backId, prodRow.id],
        });
        backfilledBacks++;
      }
      if (ch.item_back_path && freshProd.starter_item_back_sprite_id == null) {
        const backId = await uploadSprite(
          prod,
          `${ch.starter_item_name || ch.name} (verso)`,
          "character-item",
          ch.item_back_path,
          ch.item_back_w,
          ch.item_back_h
        );
        await prod.execute({
          sql: "UPDATE characters SET starter_item_back_sprite_id = ? WHERE id = ?",
          args: [backId, prodRow.id],
        });
        backfilledBacks++;
      }
    } catch (err) {
      failed++;
      issues.push({ name: ch.name, issue: String(err) });
      console.log("FALHOU: " + String(err));
    }
  }

  console.log("\n=== Resumo ===");
  console.log(
    "Criados (novos):", created,
    "| Atualizados (carta nova):", updated,
    "| Renomeados:", renamed,
    "| Já tinham (pulados):", skipped,
    "| Versos dupla-face preenchidos:", backfilledBacks,
    "| Não encontrados:", notFound,
    "| Falhas:", failed
  );
  if (issues.length) console.log(JSON.stringify(issues, null, 2));

  const total = await allRows(prod, "SELECT COUNT(*) AS n FROM characters WHERE card_sprite_id IS NOT NULL");
  console.log("Personagens com carta em prod agora:", total[0].n);
}

main().catch((err) => {
  console.error("Falhou:", err);
  process.exit(1);
});
