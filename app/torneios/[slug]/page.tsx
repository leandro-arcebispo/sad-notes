import { notFound } from "next/navigation";
import Frame from "@/components/Frame";
import TournamentClient from "@/components/TournamentClient";
import { listPlayers } from "@/lib/players";
import { findTournament } from "@/lib/tournament-defs";
import { getTournamentState } from "@/lib/tournaments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TorneioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const def = findTournament((await params).slug);
  if (!def) notFound();

  const [state, players] = await Promise.all([
    getTournamentState(def),
    listPlayers(false), // só ativos podem ocupar vaga
  ]);

  return (
    <Frame variant="frame-chest-torch" title={`${def.name} ${def.year}`}>
      <TournamentClient state={state} players={players} />
    </Frame>
  );
}
