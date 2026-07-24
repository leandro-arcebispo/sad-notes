import CharactersClient from "@/components/CharactersClient";
import { listCharacters } from "@/lib/characters";
import { listSprites } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PersonagensPage() {
  const [characters, sprites] = await Promise.all([
    listCharacters(true),
    listSprites(),
  ]);
  return <CharactersClient characters={characters} sprites={sprites} />;
}
