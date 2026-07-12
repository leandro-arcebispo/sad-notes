import Frame from "@/components/Frame";
import JogadoresClient from "@/components/JogadoresClient";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function JogadoresPage() {
  const players = listPlayers();
  return (
    <Frame variant="frame-library" title="Jogadores">
      <JogadoresClient players={players} />
    </Frame>
  );
}
