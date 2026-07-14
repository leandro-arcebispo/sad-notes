import Frame from "@/components/Frame";
import BacklogClient from "@/components/BacklogClient";
import { listFeedback } from "@/lib/feedback";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function BacklogPage() {
  const feedback = await listFeedback();
  const players = await listPlayers(false); // só jogadores ativos preenchem o form
  return (
    <Frame variant="frame-library" title="Backlog">
      <BacklogClient feedback={feedback} players={players} />
    </Frame>
  );
}
