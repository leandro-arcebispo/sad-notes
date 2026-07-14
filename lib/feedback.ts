import { all, get, run, nowIso } from "./db";
import type { Feedback, FeedbackFull, FeedbackInput, FeedbackStatus } from "./types";

/** Backlog completo, mais recentes primeiro, com o nome de quem preencheu. */
export async function listFeedback(): Promise<FeedbackFull[]> {
  return all<FeedbackFull>(
    `SELECT f.*, p.name AS player_name
       FROM feedback f
       LEFT JOIN players p ON p.id = f.player_id
      ORDER BY f.created_at DESC, f.id DESC`
  );
}

export async function getFeedback(id: number): Promise<Feedback | undefined> {
  return get<Feedback>("SELECT * FROM feedback WHERE id = ?", [id]);
}

export async function createFeedback(input: FeedbackInput): Promise<FeedbackFull> {
  const { lastId } = await run(
    `INSERT INTO feedback (kind, description, area, priority, status, player_id, created_at)
     VALUES (@kind, @description, @area, @priority, 'aberto', @player_id, @created_at)`,
    { ...input, created_at: nowIso() }
  );
  return (await get<FeedbackFull>(
    `SELECT f.*, p.name AS player_name
       FROM feedback f LEFT JOIN players p ON p.id = f.player_id
      WHERE f.id = ?`,
    [lastId]
  ))!;
}

export async function updateFeedbackStatus(
  id: number,
  status: FeedbackStatus
): Promise<boolean> {
  const { changes } = await run("UPDATE feedback SET status = ? WHERE id = ?", [status, id]);
  return changes > 0;
}

export async function deleteFeedback(id: number): Promise<boolean> {
  const { changes } = await run("DELETE FROM feedback WHERE id = ?", [id]);
  return changes > 0;
}
