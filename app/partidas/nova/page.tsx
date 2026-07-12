import Frame from "@/components/Frame";
import GameWizard from "@/components/GameWizard";
import { listPlayers } from "@/lib/players";
import { listCharacters } from "@/lib/characters";
import { listItems } from "@/lib/items";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function NovaPartidaPage() {
  const players = listPlayers(false); // só ativos
  const characters = listCharacters();
  const itemSuggestions = listItems().map((i) => i.name);
  return (
    <Frame variant="frame-dank-depths" title="Nova partida">
      <GameWizard
        players={players}
        characters={characters}
        itemSuggestions={itemSuggestions}
      />
    </Frame>
  );
}
