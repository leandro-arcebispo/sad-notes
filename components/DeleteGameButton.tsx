"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DeleteGameButton({ id }: { id: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function del() {
    setBusy(true);
    await fetch(`/api/games/${id}`, { method: "DELETE" });
    router.push("/partidas");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button className="btn btn-danger" onClick={() => setConfirming(true)}>
        Excluir
      </button>
    );
  }
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="muted">Excluir mesmo?</span>
      <button className="btn" onClick={() => setConfirming(false)} disabled={busy}>
        Não
      </button>
      <button className="btn btn-danger" onClick={del} disabled={busy}>
        {busy ? "…" : "Sim, excluir"}
      </button>
    </span>
  );
}
