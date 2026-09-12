import Frame from "@/components/Frame";
import IdentityPicker from "@/components/IdentityPicker";
import { getCurrentPlayer } from "@/lib/identity";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function QuemEVocePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [players, current, sp] = await Promise.all([
    listPlayers(false), // só ativos
    getCurrentPlayer(),
    searchParams,
  ]);

  // Só aceita caminho interno — `?next=` vem da URL e não pode virar redirect
  // pra fora do app.
  const next = sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/";

  return (
    <Frame variant="frame-cathedral" title="Quem é você?">
      <IdentityPicker players={players} current={current} next={next} />
    </Frame>
  );
}
