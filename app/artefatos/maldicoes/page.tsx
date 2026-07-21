import CursesClient from "@/components/CursesClient";
import { listCurses } from "@/lib/curses";
import { listSprites } from "@/lib/sprites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function MaldicoesPage() {
  const [curses, sprites] = await Promise.all([listCurses(), listSprites()]);
  return <CursesClient curses={curses} sprites={sprites} />;
}
