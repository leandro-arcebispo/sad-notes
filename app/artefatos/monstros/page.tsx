import MonstersClient from "@/components/MonstersClient";
import { listMonsters } from "@/lib/monsters";
import { listSprites } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MonstrosPage() {
  const [monsters, sprites] = await Promise.all([listMonsters(), listSprites()]);
  return <MonstersClient monsters={monsters} sprites={sprites} />;
}
