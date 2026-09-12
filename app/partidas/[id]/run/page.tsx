import { notFound, redirect } from "next/navigation";
import Frame from "@/components/Frame";
import RunClient from "@/components/RunClient";
import { listCharacters } from "@/lib/characters";
import { listCurses } from "@/lib/curses";
import { parseParams } from "@/lib/game-modes";
import { getRunState } from "@/lib/games";
import { listMonsters } from "@/lib/monsters";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * A **Run**: a partida enquanto está acontecendo. Partida finalizada ou
 * abandonada não tem Run — cai no detalhe, que é a visão de registro.
 */
export default async function RunPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const state = await getRunState(id);
  if (!state) notFound();

  if (state.game.status === "finalizada" || state.game.status === "abortada") {
    redirect(`/partidas/${id}`);
  }

  const modeParams = parseParams(state.game.params_json);

  const [monsters, curses, characters] = await Promise.all([
    listMonsters(),
    listCurses(),
    listCharacters(),
  ]);

  return (
    <Frame variant="frame-dank-depths" title={`Run · ${state.game.played_at}`}>
      <RunClient
        initialGame={state.game}
        initialEvents={state.events}
        initialDerived={state.derived}
        initialActiveMinutes={state.active_minutes}
        params={modeParams}
        monsters={monsters.map((m) => ({ id: m.id, name: m.name }))}
        curses={curses.map((c) => ({ id: c.id, name: c.name }))}
        characters={characters.filter(
          (c) =>
            c.active === 1 &&
            (modeParams.edition === "requiem" || c.expansion === "base") &&
            (modeParams.allow_tainted || !c.tainted)
        )}
      />
    </Frame>
  );
}
