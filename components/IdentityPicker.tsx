"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PlayerAvatar from "./PlayerAvatar";
import type { Player } from "@/lib/types";

/**
 * Seletor de perfil no modelo Netflix (docs/PLANO-PARTIDAS.md §6): escolha
 * aberta, sem senha — qualquer um entra em qualquer perfil. Isso é decisão do
 * usuário, não um esquecimento: o grupo é pequeno e o que se quer daqui é
 * **autoria** dos registros, não controle de acesso (a porta do site continua
 * sendo o basic-auth do middleware).
 */
export default function IdentityPicker({
  players,
  current,
  next,
}: {
  players: Player[];
  current: Player | null;
  next: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(playerId: number) {
    setError(null);
    setBusy(playerId);
    const res = await fetch("/api/identity", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ player_id: playerId }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Não deu para entrar nesse perfil.");
      setBusy(null);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="stack">
      <p className="muted" style={{ marginTop: 0 }}>
        Escolha seu perfil neste aparelho. É só para saber quem registrou o quê —
        dá para trocar quando quiser.
      </p>

      {players.length === 0 ? (
        <div className="panel">
          <div className="center-empty">
            Nenhum jogador cadastrado ainda.{" "}
            <Link href="/jogadores" className="row-link">
              Cadastre o primeiro
            </Link>
            .
          </div>
        </div>
      ) : (
        <div className="identity-grid">
          {players.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`identity-card${current?.id === p.id ? " current" : ""}`}
              onClick={() => choose(p.id)}
              disabled={busy !== null}
            >
              <PlayerAvatar face={p.base_face} size={96} avatarCache={p.avatar_cache} />
              <span className="pixel-label identity-name">{p.name}</span>
              {p.nickname && <span className="muted identity-nick">{p.nickname}</span>}
              {current?.id === p.id && <span className="badge">você</span>}
            </button>
          ))}
          <Link href="/jogadores" className="identity-card identity-new">
            <span className="identity-plus">+</span>
            <span className="pixel-label identity-name">Novo jogador</span>
          </Link>
        </div>
      )}

      {error && <div style={{ color: "var(--blood)" }}>{error}</div>}
    </div>
  );
}
