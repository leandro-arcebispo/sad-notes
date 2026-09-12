import Link from "next/link";
import Frame from "@/components/Frame";
import { TOURNAMENTS } from "@/lib/tournament-defs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Torneios são definidos estaticamente em `lib/tournament-defs.ts` — não há
 * cadastro. Esta lista só aponta pros que existem. */
export default function TorneiosPage() {
  return (
    <Frame variant="frame-chest-torch" title="Torneios">
      <div className="stack">
        {TOURNAMENTS.map((t) => (
          <Link key={t.slug} href={`/torneios/${t.slug}`} className="panel form-panel run-cta">
            <span>
              <span className="pixel-label" style={{ fontSize: 18 }}>
                🏆 {t.name} {t.year}
              </span>
              <br />
              <span className="muted">
                {t.format} · {t.rulesNote}
              </span>
            </span>
            <span className="btn btn-accent">abrir →</span>
          </Link>
        ))}
      </div>
    </Frame>
  );
}
