import Frame from "@/components/Frame";
import SpritesheetsClient from "@/components/SpritesheetsClient";
import { listSheets } from "@/lib/sheets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function SpritesheetsPage() {
  const sheets = await listSheets();
  return (
    <Frame variant="frame-scarred-womb" title="Spritesheets">
      <SpritesheetsClient sheets={sheets} />
    </Frame>
  );
}
