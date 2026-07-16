import Frame from "@/components/Frame";
import OficinaTabs from "@/components/OficinaTabs";
import { listSprites, listSpriteCategories } from "@/lib/sprites";
import { listOrnaments } from "@/lib/ornaments";
import { listSheets } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OficinaPage() {
  const [sheets, sprites, categories, ornaments] = await Promise.all([
    listSheets(),
    listSprites(),
    listSpriteCategories(),
    listOrnaments(),
  ]);
  return (
    <Frame variant="frame-utero-purple" title="Oficina">
      <OficinaTabs
        sheets={sheets}
        sprites={sprites}
        categories={categories}
        ornaments={ornaments}
      />
    </Frame>
  );
}
