import TreasuresClient from "@/components/TreasuresClient";
import { listTreasures } from "@/lib/treasures";
import { listSprites } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function TesourosPage() {
  const [treasures, sprites] = await Promise.all([listTreasures(), listSprites()]);
  return <TreasuresClient treasures={treasures} sprites={sprites} />;
}
