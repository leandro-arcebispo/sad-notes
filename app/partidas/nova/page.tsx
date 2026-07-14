import Frame from "@/components/Frame";
import GameWizard from "@/components/GameWizard";
import { listPlayers } from "@/lib/players";
import { listCharacters } from "@/lib/characters";
import { listItems } from "@/lib/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function NovaPartidaPage() {
  const players = await listPlayers(false); // só ativos
  const characters = await listCharacters();
  const itemSuggestions = (await listItems()).map((i) => i.name);
  return (
    <Frame variant="frame-library" title="Nova partida">
      <GameWizard
        players={players}
        characters={characters}
        itemSuggestions={itemSuggestions}
      />
    </Frame>
  );
}
