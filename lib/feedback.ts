import { all, get, run, nowIso } from "./db";
import type { Feedback, FeedbackFull, FeedbackInput, FeedbackPatch } from "./types";

const FULL_SELECT = `
  SELECT f.*, p.name AS player_name, a.name AS assignee_name
    FROM feedback f
    LEFT JOIN players p ON p.id = f.player_id
    LEFT JOIN players a ON a.id = f.assignee_player_id
`;

/** Backlog completo, mais recentes primeiro, com autor e responsável já resolvidos. */
export async function listFeedback(): Promise<FeedbackFull[]> {
  return all<FeedbackFull>(`${FULL_SELECT} ORDER BY f.created_at DESC, f.id DESC`);
}

export async function getFeedback(id: number): Promise<Feedback | undefined> {
  return get<Feedback>("SELECT * FROM feedback WHERE id = ?", [id]);
}

export async function createFeedback(input: FeedbackInput): Promise<FeedbackFull> {
  const { lastId } = await run(
    `INSERT INTO feedback (kind, title, description, area, priority, status, player_id, created_at)
     VALUES (@kind, @title, @description, @area, @priority, 'aberto', @player_id, @created_at)`,
    { ...input, created_at: nowIso() }
  );
  return (await get<FeedbackFull>(`${FULL_SELECT} WHERE f.id = ?`, [lastId]))!;
}

/**
 * Move de coluna e/ou troca o responsável. Regra de reserva de tarefa: um
 * card só pode ficar em "andamento" com um responsável definido (senão duas
 * pessoas podem achar que estão livres pra pegar a mesma coisa); ao voltar
 * pra "aberto" o responsável é liberado automaticamente, pra ficar
 * realmente disponível de novo.
 */
export async function updateFeedback(
  id: number,
  patch: FeedbackPatch
): Promise<FeedbackFull | { error: string } | undefined> {
  const current = await getFeedback(id);
  if (!current) return undefined;

  const status = patch.status ?? current.status;
  let assignee_player_id =
    patch.assignee_player_id !== undefined
      ? patch.assignee_player_id
      : current.assignee_player_id;

  if (status === "andamento" && assignee_player_id === null) {
    return { error: "escolha um responsável antes de mover para Em andamento" };
  }
  if (status === "aberto") {
    assignee_player_id = null;
  }

  await run("UPDATE feedback SET status = ?, assignee_player_id = ? WHERE id = ?", [
    status,
    assignee_player_id,
    id,
  ]);
  return (await get<FeedbackFull>(`${FULL_SELECT} WHERE f.id = ?`, [id]))!;
}

export async function deleteFeedback(id: number): Promise<boolean> {
  const { changes } = await run("DELETE FROM feedback WHERE id = ?", [id]);
  return changes > 0;
}
