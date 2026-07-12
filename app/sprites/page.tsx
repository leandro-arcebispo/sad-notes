import Frame from "@/components/Frame";
import SpritesClient from "@/components/SpritesClient";
import { listSprites, listSpriteCategories } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function SpritesPage() {
  const sprites = listSprites();
  const categories = listSpriteCategories();
  return (
    <Frame variant="frame-utero-purple" title="Catálogo de Sprites">
      <SpritesClient sprites={sprites} categories={categories} />
    </Frame>
  );
}
