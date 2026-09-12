import { notFound, redirect } from "next/navigation";
import Frame from "@/components/Frame";
import GameFinish from "@/components/GameFinish";
import { getRunState } from "@/lib/games";
import { listTreasures } from "@/lib/treasures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function FinalizarPartidaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const [state, treasures] = await Promise.all([getRunState(id), listTreasures()]);
  if (!state) notFound();

  // Já finalizada/abandonada não volta pra esta tela — evita "finalizar duas
  // vezes" por link antigo ou botão de voltar do navegador.
  if (state.game.status === "finalizada" || state.game.status === "abortada") {
    redirect(`/partidas/${id}`);
  }

  const treasureOptions = treasures.map((t) => ({
    id: t.id,
    name: t.name,
    icon_sprite_path: t.icon_sprite_path,
  }));

  return (
    <Frame variant="frame-library" title="Finalizar partida">
      <GameFinish
        game={state.game}
        derived={state.derived}
        activeMinutes={state.active_minutes}
        treasureOptions={treasureOptions}
      />
    </Frame>
  );
}
