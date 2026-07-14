import JogadoresClient from "@/components/JogadoresClient";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function JogadoresPage() {
  const players = await listPlayers();
  return <JogadoresClient players={players} />;
}
