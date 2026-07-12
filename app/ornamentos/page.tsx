import Frame from "@/components/Frame";
import OrnamentBuilder from "@/components/OrnamentBuilder";
import { listSprites } from "@/lib/sprites";
import { listOrnaments } from "@/lib/ornaments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function OrnamentosPage() {
  const sprites = listSprites();
  const ornaments = listOrnaments();
  return (
    <Frame variant="frame-cathedral" title="Ornamentos">
      <OrnamentBuilder sprites={sprites} ornaments={ornaments} />
    </Frame>
  );
}
