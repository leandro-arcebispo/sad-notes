import Frame from "@/components/Frame";
import GameSetup from "@/components/GameSetup";
import { listCharacters } from "@/lib/characters";
import { listGameModes } from "@/lib/game-modes";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaPartidaPage() {
  const [players, characters, modes] = await Promise.all([
    listPlayers(false), // só ativos
    listCharacters(),
    listGameModes(),
  ]);
  return (
    <Frame variant="frame-library" title="Nova partida">
      <GameSetup players={players} characters={characters} modes={modes} />
    </Frame>
  );
}
