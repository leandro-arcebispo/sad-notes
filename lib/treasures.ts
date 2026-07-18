import { all, get, getClient, run, nowIso } from "./db";
import type { Treasure, TreasureFull, TreasureInput } from "./types";

const SELECT_FULL = `
  SELECT t.*,
         oi.sprite_id AS icon_sprite_id,
         oi.offset_x AS icon_offset_x, oi.offset_y AS icon_offset_y, oi.scale AS icon_scale,
         si.path AS icon_sprite_path, si.name AS icon_sprite_name,
         si.width AS icon_sprite_width, si.height AS icon_sprite_height,
         ot.sprite_id AS transform_sprite_id,
         ot.offset_x AS transform_offset_x, ot.offset_y AS transform_offset_y, ot.scale AS transform_scale,
         st.path AS transform_sprite_path, st.name AS transform_sprite_name,
         st.width AS transform_sprite_width, st.height AS transform_sprite_height,
         sc.path AS card_sprite_path, sc.name AS card_sprite_name
    FROM treasures t
    LEFT JOIN ornaments oi ON oi.id = t.icon_ornament_id
    LEFT JOIN sprites si ON si.id = oi.sprite_id
    LEFT JOIN ornaments ot ON ot.id = t.transform_ornament_id
    LEFT JOIN sprites st ON st.id = ot.sprite_id
    LEFT JOIN sprites sc ON sc.id = t.card_sprite_id
`;

export async function listTreasures(): Promise<TreasureFull[]> {
  return all<TreasureFull>(`${SELECT_FULL} ORDER BY t.name COLLATE NOCASE`);
}

export async function getTreasure(id: number): Promise<TreasureFull | undefined> {
  return get<TreasureFull>(`${SELECT_FULL} WHERE t.id = ?`, [id]);
}

/** Resultado de resolver um slot (ícone/transformação): o novo id de ornamento
 * a gravar no Tesouro, e (se o slot foi limpo) o id antigo que ficou órfão —
 * só pode ser apagado DEPOIS que a linha de `treasures` parar de referenciá-lo
 * (a FK é forçada mesmo em dev local; apagar antes quebra a constraint). */
type SlotResult = { id: number | null; orphanId: number | null };

/** Cria, atualiza ou libera o ornamento por trás de um slot, conforme o sprite
 * escolhido. `spriteId` null libera o slot (o ornamento antigo vem em `orphanId`,
 * a apagar só após repontar a FK do Tesouro). */
async function resolveOrnamentSlot(
  existingOrnamentId: number | null,
  spriteId: number | null,
  name: string,
  offsetX: number,
  offsetY: number,
  scale: number
): Promise<SlotResult> {
  if (spriteId === null) {
    return { id: null, orphanId: existingOrnamentId };
  }
  if (existingOrnamentId) {
    await run(
      "UPDATE ornaments SET sprite_id = ?, name = ?, offset_x = ?, offset_y = ?, scale = ? WHERE id = ?",
      [spriteId, name, offsetX, offsetY, scale, existingOrnamentId]
    );
    return { id: existingOrnamentId, orphanId: null };
  }
  const { lastId } = await run(
    `INSERT INTO ornaments (sprite_id, name, category, offset_x, offset_y, scale, created_at)
     VALUES (?, ?, 'diverso', ?, ?, ?, ?)`,
    [spriteId, name, offsetX, offsetY, scale, nowIso()]
  );
  return { id: lastId, orphanId: null };
}

async function deleteOrnamentCascade(ornamentId: number): Promise<void> {
  const db = await getClient();
  await db.batch(
    [
      { sql: "DELETE FROM player_ornaments WHERE ornament_id = ?", args: [ornamentId] },
      { sql: "DELETE FROM ornaments WHERE id = ?", args: [ornamentId] },
    ],
    "write"
  );
}

export async function createTreasure(input: TreasureInput): Promise<TreasureFull> {
  // Sem tesouro existente ainda: nenhum slot pode ficar órfão.
  const icon = await resolveOrnamentSlot(
    null, input.icon_sprite_id, `${input.name} · ícone`,
    input.icon_offset_x, input.icon_offset_y, input.icon_scale
  );
  const transform = await resolveOrnamentSlot(
    null, input.transform_sprite_id, `${input.name} · transformação`,
    input.transform_offset_x, input.transform_offset_y, input.transform_scale
  );

  const { lastId } = await run(
    `INSERT INTO treasures (name, icon_ornament_id, transform_ornament_id, card_sprite_id, unlock_mode, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [input.name, icon.id, transform.id, input.card_sprite_id, input.unlock_mode, nowIso()]
  );
  return (await getTreasure(lastId))!;
}

export async function updateTreasure(
  id: number,
  input: TreasureInput
): Promise<TreasureFull | undefined> {
  const existing = await get<Treasure>("SELECT * FROM treasures WHERE id = ?", [id]);
  if (!existing) return undefined;

  const icon = await resolveOrnamentSlot(
    existing.icon_ornament_id, input.icon_sprite_id, `${input.name} · ícone`,
    input.icon_offset_x, input.icon_offset_y, input.icon_scale
  );
  const transform = await resolveOrnamentSlot(
    existing.transform_ornament_id, input.transform_sprite_id, `${input.name} · transformação`,
    input.transform_offset_x, input.transform_offset_y, input.transform_scale
  );

  // Repontar a FK do Tesouro ANTES de apagar qualquer ornamento órfão (a FK
  // é forçada mesmo em dev local — apagar antes quebra a constraint).
  await run(
    `UPDATE treasures
        SET name = ?, icon_ornament_id = ?, transform_ornament_id = ?, card_sprite_id = ?, unlock_mode = ?
      WHERE id = ?`,
    [input.name, icon.id, transform.id, input.card_sprite_id, input.unlock_mode, id]
  );

  for (const orphanId of [icon.orphanId, transform.orphanId]) {
    if (orphanId) await deleteOrnamentCascade(orphanId);
  }
  return getTreasure(id);
}

export async function deleteTreasure(id: number): Promise<boolean> {
  const existing = await get<Treasure>("SELECT * FROM treasures WHERE id = ?", [id]);
  if (!existing) return false;

  // Cascata manual (FKs não são forçadas via conexões HTTP do libSQL):
  // histórico de partidas → aplicações no avatar → o tesouro → os ornamentos dele.
  const db = await getClient();
  const stmts: { sql: string; args: (number | string)[] }[] = [
    { sql: "DELETE FROM game_player_treasures WHERE treasure_id = ?", args: [id] },
  ];
  for (const ornamentId of [existing.icon_ornament_id, existing.transform_ornament_id]) {
    if (ornamentId) {
      stmts.push({ sql: "DELETE FROM player_ornaments WHERE ornament_id = ?", args: [ornamentId] });
    }
  }
  stmts.push({ sql: "DELETE FROM treasures WHERE id = ?", args: [id] });
  for (const ornamentId of [existing.icon_ornament_id, existing.transform_ornament_id]) {
    if (ornamentId) {
      stmts.push({ sql: "DELETE FROM ornaments WHERE id = ?", args: [ornamentId] });
    }
  }
  await db.batch(stmts, "write");
  return true;
}
