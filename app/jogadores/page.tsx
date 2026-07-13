import JogadoresClient from "@/components/JogadoresClient";
import { listPlayers } from "@/lib/players";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default function JogadoresPage() {
  const players = listPlayers();
  return <JogadoresClient players={players} />;
}
