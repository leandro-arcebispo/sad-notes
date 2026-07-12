import Link from "next/link";
import { notFound } from "next/navigation";
import Frame from "@/components/Frame";
import AvatarEditor from "@/components/AvatarEditor";
import { getPlayer } from "@/lib/players";
import { listOrnaments } from "@/lib/ornaments";
import { getAvatarRecipe } from "@/lib/player-avatar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PlayerAvatarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const id = Number((await params).id);
  const player = getPlayer(id);
  if (!player) notFound();

  const ornaments = listOrnaments();
  const recipe = getAvatarRecipe(id);

  return (
    <Frame
      variant="frame-cathedral"
      title={`Avatar · ${player.name}`}
      actions={<Link href="/jogadores" className="btn">← Jogadores</Link>}
    >
      <AvatarEditor
        player={player}
        initialRecipe={recipe}
        hairOptions={ornaments.filter((o) => o.category === "cabelo")}
        diversoOptions={ornaments.filter((o) => o.category === "diverso")}
      />
    </Frame>
  );
}
