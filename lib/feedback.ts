import { getDb, nowIso } from "./db";
import type { Feedback, FeedbackFull, FeedbackInput, FeedbackStatus } from "./types";

/** Backlog completo, mais recentes primeiro, com o nome de quem preencheu. */
export function listFeedback(): FeedbackFull[] {
  return getDb()
    .prepare(
      `SELECT f.*, p.name AS player_name
         FROM feedback f
         LEFT JOIN players p ON p.id = f.player_id
        ORDER BY f.created_at DESC, f.id DESC`
    )
    .all() as FeedbackFull[];
}

export function getFeedback(id: number): Feedback | undefined {
  return getDb().prepare("SELECT * FROM feedback WHERE id = ?").get(id) as
    | Feedback
    | undefined;
}

export function createFeedback(input: FeedbackInput): FeedbackFull {
  const db = getDb();
  const res = db
    .prepare(
      `INSERT INTO feedback (kind, description, area, priority, status, player_id, created_at)
       VALUES (@kind, @description, @area, @priority, 'aberto', @player_id, @created_at)`
    )
    .run({ ...input, created_at: nowIso() });
  return db
    .prepare(
      `SELECT f.*, p.name AS player_name
         FROM feedback f LEFT JOIN players p ON p.id = f.player_id
        WHERE f.id = ?`
    )
    .get(Number(res.lastInsertRowid)) as FeedbackFull;
}

export function updateFeedbackStatus(
  id: number,
  status: FeedbackStatus
): boolean {
  const res = getDb()
    .prepare("UPDATE feedback SET status = ? WHERE id = ?")
    .run(status, id);
  return res.changes > 0;
}

export function deleteFeedback(id: number): boolean {
  const res = getDb().prepare("DELETE FROM feedback WHERE id = ?").run(id);
  return res.changes > 0;
}
