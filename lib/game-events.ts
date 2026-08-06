import { all, get, getClient, nowIso, run } from "./db";
import type {
  DerivedPlayerStats,
  Game,
  GameEvent,
  GameEventFull,
  GameEventInput,
  GameEventRefType,
  GameEventType,
} from "./types";

/**
 * Registro de tipos de evento da Run — o substrato do registro de partidas
 * (docs/PLANO-PARTIDAS.md §4). Mesmo padrão plugável de `lib/unlocks.ts`:
 * **tipo de evento novo é uma entrada neste registro, sem migração de schema**,
 * e estatística nova vira query em cima do que já está gravado.
 *
 * ⚠️ Os eventos NÃO são a fonte de verdade do ranking (§1.3): alma pode ser
 * roubada/destruída e partida registrada retroativamente não tem evento algum.
 * Eles pré-preenchem a finalização e alimentam estatística/badge; o placar
 * continua saindo do snapshot em `game_players`.
 */

interface EventTypeDef {
  label: string;
  /** Rótulo do sujeito (`player_id`) — muda por tipo: em `morte` é quem
   * morreu, em `alma_roubada` é quem roubou. Por isso as colunas são neutras
   * (`player_id`/`other_player_id`) e não `actor`/`target`. */
  subjectLabel: string;
  /** Rótulo da contraparte (`other_player_id`), ou null se o tipo não usa. */
  counterpartLabel: string | null;
  /** Contraparte é obrigatória? (em `morte` é opcional: nem toda morte tem culpado) */
  counterpartRequired: boolean;
  /** Artefato ao qual o evento aponta, se houver. */
  refType: GameEventRefType | null;
  /** `true` = o evento é registrado pela mesa; `false` = gerado pelo sistema
   * (pause/resume/sorteio) e não aparece na paleta de botões. */
  manual: boolean;
  /** Tier 1 = sempre ligado, 2 = opcional por modo (§4 do plano). */
  tier: 1 | 2 | null;
  icon: string;
}

export const EVENT_TYPE_DEFS: Record<GameEventType, EventTypeDef> = {
  morte: {
    label: "Morte",
    subjectLabel: "Quem morreu",
    counterpartLabel: "Morto por (opcional)",
    counterpartRequired: false,
    refType: null,
    manual: true,
    tier: 1,
    icon: "💀",
  },
  alma_ganha: {
    label: "Ganhou alma",
    subjectLabel: "Quem ganhou",
    counterpartLabel: null,
    counterpartRequired: false,
    // Almas bônus ainda não têm catálogo próprio (§2.1) — até lá o evento
    // guarda só `ref_name`, e o dia em que o Artefato existir encaixa aqui.
    refType: "alma_bonus",
    manual: true,
    tier: 1,
    icon: "👻",
  },
  monstro_derrotado: {
    label: "Derrotou monstro",
    subjectLabel: "Quem derrotou",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: "monstro",
    manual: true,
    tier: 1,
    icon: "👹",
  },
  alma_perdida: {
    label: "Perdeu alma",
    subjectLabel: "Quem perdeu",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: null,
    manual: true,
    tier: 2,
    icon: "🕳️",
  },
  alma_roubada: {
    label: "Roubou alma",
    subjectLabel: "Quem roubou",
    counterpartLabel: "De quem",
    counterpartRequired: true,
    refType: null,
    manual: true,
    tier: 2,
    icon: "🫱",
  },
  maldicao_recebida: {
    label: "Recebeu maldição",
    subjectLabel: "Quem recebeu",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: "maldicao",
    manual: true,
    tier: 2,
    icon: "🩸",
  },
  personagem_sorteado: {
    label: "Personagem sorteado",
    subjectLabel: "Jogador",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: "personagem",
    manual: false,
    tier: null,
    icon: "🎲",
  },
  pause: {
    label: "Partida pausada",
    subjectLabel: "Jogador",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: null,
    manual: false,
    tier: null,
    icon: "⏸️",
  },
  resume: {
    label: "Partida retomada",
    subjectLabel: "Jogador",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: null,
    manual: false,
    tier: null,
    icon: "▶️",
  },
  nota: {
    label: "Nota",
    subjectLabel: "Quem escreveu",
    counterpartLabel: null,
    counterpartRequired: false,
    refType: null,
    manual: true,
    tier: 2,
    icon: "📝",
  },
};

/** Tipos que a mesa registra à mão (a paleta de botões da Run sai daqui). */
export function manualEventTypes(): GameEventType[] {
  return (Object.keys(EVENT_TYPE_DEFS) as GameEventType[]).filter(
    (t) => EVENT_TYPE_DEFS[t].manual
  );
}

/**
 * Acrescenta um evento. **Idempotente por `client_event_id`** (§6.1 do plano):
 * celular com rede ruim reenvia, e sem isso nasceriam mortes fantasmas — o
 * reenvio devolve o evento já gravado em vez de duplicar.
 *
 * O `seq` é atribuído no servidor dentro da transação (MAX+1), então a ordem
 * é a mesma pra todo mundo, independente de quem registrou primeiro.
 */
export async function appendEvent(
  gameId: number,
  input: GameEventInput,
  createdByPlayerId: number | null
): Promise<GameEvent> {
  if (input.client_event_id) {
    const dup = await get<GameEvent>(
      "SELECT * FROM game_events WHERE game_id = ? AND client_event_id = ?",
      [gameId, input.client_event_id]
    );
    if (dup) return dup;
  }

  const db = await getClient();
  const tx = await db.transaction("write");
  try {
    const maxRs = await tx.execute({
      sql: "SELECT COALESCE(MAX(seq), 0) AS m FROM game_events WHERE game_id = ?",
      args: [gameId],
    });
    const seq = Number(maxRs.rows[0][0]) + 1;
    const ins = await tx.execute({
      sql: `INSERT INTO game_events
              (game_id, seq, round, type, player_id, other_player_id,
               ref_type, ref_id, ref_name, amount, created_by_player_id,
               client_event_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        gameId,
        seq,
        input.round,
        input.type,
        input.player_id,
        input.other_player_id,
        input.ref_type,
        input.ref_id,
        input.ref_name,
        input.amount,
        createdByPlayerId,
        input.client_event_id,
        nowIso(),
      ],
    });
    await tx.commit();
    return (await get<GameEvent>("SELECT * FROM game_events WHERE id = ?", [
      Number(ins.lastInsertRowid),
    ]))!;
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}

/** Eventos vivos da partida, com nomes resolvidos. `since` traz só o que veio
 * depois de um `seq` — é o formato do polling incremental (§6.7). */
export async function listEvents(
  gameId: number,
  since = 0
): Promise<GameEventFull[]> {
  return await all<GameEventFull>(
    `SELECT e.*,
            p.name  AS player_name,
            o.name  AS other_player_name,
            c.name  AS created_by_name
       FROM game_events e
  LEFT JOIN players p ON p.id = e.player_id
  LEFT JOIN players o ON o.id = e.other_player_id
  LEFT JOIN players c ON c.id = e.created_by_player_id
      WHERE e.game_id = ? AND e.seq > ? AND e.deleted_at IS NULL
      ORDER BY e.seq`,
    [gameId, since]
  );
}

/** Soft-delete: qualquer um pode apagar um evento errado, mas fica registrado
 * quem apagou (§2.11). O `seq` nunca é reciclado. */
export async function deleteEvent(
  eventId: number,
  byPlayerId: number | null
): Promise<boolean> {
  const { changes } = await run(
    "UPDATE game_events SET deleted_at = ?, deleted_by_player_id = ? WHERE id = ? AND deleted_at IS NULL",
    [nowIso(), byPlayerId, eventId]
  );
  return changes > 0;
}

/**
 * Estatísticas por jogador derivadas dos eventos — usadas pra **pré-preencher**
 * a finalização, nunca como placar oficial.
 *
 * Almas: ganhas + roubadas de alguém − perdidas − roubadas de você. É por isso
 * que a soma de eventos pode não bater com o estado final (§2.2), e por isso o
 * usuário pode sobrescrever qualquer número na finalização.
 */
export async function deriveStats(
  gameId: number
): Promise<Map<number, DerivedPlayerStats>> {
  const events = await all<
    Pick<GameEvent, "type" | "player_id" | "other_player_id" | "amount">
  >(
    `SELECT type, player_id, other_player_id, amount
       FROM game_events WHERE game_id = ? AND deleted_at IS NULL`,
    [gameId]
  );

  const out = new Map<number, DerivedPlayerStats>();
  const touch = (id: number | null): DerivedPlayerStats | null => {
    if (id == null) return null;
    if (!out.has(id)) {
      out.set(id, {
        souls: 0,
        deaths: 0,
        pvp_kills: 0,
        monsters: 0,
        curses: 0,
        reroll_count: 0,
      });
    }
    return out.get(id)!;
  };

  for (const e of events) {
    const subject = touch(e.player_id);
    const other = touch(e.other_player_id);
    const n = e.amount || 1;
    switch (e.type) {
      case "alma_ganha":
        if (subject) subject.souls += n;
        break;
      case "alma_perdida":
        if (subject) subject.souls -= n;
        break;
      case "alma_roubada":
        if (subject) subject.souls += n;
        if (other) other.souls -= n;
        break;
      case "morte":
        if (subject) subject.deaths += n;
        // Morte com culpado rende PvP kill pra contraparte; morte por monstro
        // ou qualquer outra causa conta só como morte (§2.3).
        if (other) other.pvp_kills += n;
        break;
      case "monstro_derrotado":
        if (subject) subject.monsters += n;
        break;
      case "maldicao_recebida":
        if (subject) subject.curses += n;
        break;
      case "personagem_sorteado":
        if (subject) subject.reroll_count += 1;
        break;
      default:
        break;
    }
  }

  // O 1º sorteio não é re-roll — só o que vem depois dele conta.
  for (const s of out.values()) s.reroll_count = Math.max(0, s.reroll_count - 1);
  return out;
}

/**
 * Duração ativa em minutos: tempo entre o início e o fim MENOS os intervalos
 * pausados. É o que permite partida em dois dias sem inflar a duração — pause
 * é só mais um evento, não uma tabela à parte (§7.2).
 */
export async function deriveActiveMinutes(game: Game): Promise<number | null> {
  if (!game.started_at) return null;
  const events = await all<Pick<GameEvent, "type" | "created_at">>(
    `SELECT type, created_at FROM game_events
      WHERE game_id = ? AND deleted_at IS NULL AND type IN ('pause','resume')
      ORDER BY seq`,
    [game.id]
  );

  const end = game.ended_at ? Date.parse(game.ended_at) : Date.now();
  let active = 0;
  let segmentStart = Date.parse(game.started_at);
  let paused = false;

  for (const e of events) {
    const t = Date.parse(e.created_at);
    if (e.type === "pause" && !paused) {
      active += t - segmentStart;
      paused = true;
    } else if (e.type === "resume" && paused) {
      segmentStart = t;
      paused = false;
    }
  }
  if (!paused) active += end - segmentStart;

  return Math.max(0, Math.round(active / 60000));
}
