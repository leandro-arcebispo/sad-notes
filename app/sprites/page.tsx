import Frame from "@/components/Frame";
import SpritesClient from "@/components/SpritesClient";
import { listSprites, listSpriteCategories } from "@/lib/sprites";
import { listSheets } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SpritesPage() {
  const sprites = await listSprites();
  const categories = await listSpriteCategories();
  const savedSheets = await listSheets();
  return (
    <Frame variant="frame-utero-purple" title="Catálogo de Sprites">
      <SpritesClient sprites={sprites} categories={categories} savedSheets={savedSheets} />
    </Frame>
  );
}
