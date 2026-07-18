import Frame from "@/components/Frame";
import GameWizard from "@/components/GameWizard";
import { listPlayers } from "@/lib/players";
import { listCharacters } from "@/lib/characters";
import { listTreasures } from "@/lib/treasures";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaPartidaPage() {
  const [players, characters, treasures] = await Promise.all([
    listPlayers(false), // só ativos
    listCharacters(),
    listTreasures(),
  ]);
  const treasureOptions = treasures.map((t) => ({
    id: t.id,
    name: t.name,
    icon_sprite_path: t.icon_sprite_path,
  }));
  return (
    <Frame variant="frame-library" title="Nova partida">
      <GameWizard
        players={players}
        characters={characters}
        treasureOptions={treasureOptions}
      />
    </Frame>
  );
}
