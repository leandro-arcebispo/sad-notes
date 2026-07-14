import Frame from "@/components/Frame";
import SpritesClient from "@/components/SpritesClient";
import { listSprites, listSpriteCategories } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SpritesPage() {
  const sprites = await listSprites();
  const categories = await listSpriteCategories();
  return (
    <Frame variant="frame-utero-purple" title="Catálogo de Sprites">
      <SpritesClient sprites={sprites} categories={categories} />
    </Frame>
  );
}
