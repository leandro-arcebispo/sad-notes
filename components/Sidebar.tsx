"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import PlayerAvatar from "./PlayerAvatar";
import type { Player } from "@/lib/types";

type NavEntry = { href: string; label: string; icon: ReactNode; exact?: boolean };

/**
 * Ícones vêm da arte do jogo, não de SVG genérico — ver
 * `docs/PROPOSTA-ICONES.md`. Duas trocas corrigem semântica, não só estética:
 * Partidas usava `icon-report.png`, que é um bicho de olhos em X (o mesmo
 * arquivo mapeado como `deaths` no StatIcon), enquanto `icon-partidas.png`
 * (adagas cruzadas) existia e estava quase sem uso; e o troféu saiu do
 * Ranking pro Torneio, que é de quem ele é.
 */
const NAV: NavEntry[] = [
  { href: "/", label: "Ranking", exact: true, icon: <img src="/design-system/img/icon-wins.png" alt="" /> },
  { href: "/partidas", label: "Partidas", icon: <img src="/design-system/img/icon-partidas.png" alt="" /> },
  { href: "/jogadores", label: "Jogadores", icon: <img src="/design-system/img/icon-isaac-avatar.png" alt="" /> },
  { href: "/torneios", label: "Torneios", icon: <img src="/design-system/img/icon-nav-ranking.png" alt="" /> },
];

const ARTIFACTS_NAV: NavEntry[] = [
  { href: "/artefatos/personagens", label: "Personagens", icon: <img src="/design-system/img/character-card-back.png" alt="" /> },
  { href: "/artefatos/tesouros", label: "Tesouros", icon: <img src="/design-system/img/icon-treasures.png" alt="" /> },
  { href: "/artefatos/maldicoes", label: "Maldições", icon: <img src="/design-system/img/game/icon-sin.png" alt="" /> },
  { href: "/artefatos/monstros", label: "Monstros", icon: <img src="/design-system/img/game/icon-monstro.png" alt="" /> },
];

const ADMIN_NAV: NavEntry[] = [
  { href: "/sprites", label: "Oficina", icon: <img src="/design-system/img/game/icon-nota.png" alt="" /> },
  { href: "/backlog", label: "Backlog", icon: <img src="/design-system/img/game/icon-poop.png" alt="" /> },
];

export default function Sidebar({ currentPlayer }: { currentPlayer: Player | null }) {
  const pathname = usePathname();
  const isActive = (e: NavEntry) =>
    e.exact ? pathname === e.href : pathname.startsWith(e.href);

  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <img src="/brand/app-logo.png" alt="Sad Notes" />
      </div>
      <div className="nav-divider" />
      {NAV.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          className={`nav-item${isActive(e) ? " active" : ""}`}
          title={e.label}
        >
          <span className="nav-icon">{e.icon}</span>
          <span className="nav-label">{e.label}</span>
        </Link>
      ))}
      <div className="nav-divider" />
      <div className="nav-group-label">Artefatos</div>
      {ARTIFACTS_NAV.map((e) => (
        <Link
          key={e.href}
          href={e.href}
          className={`nav-item${isActive(e) ? " active" : ""}`}
          title={e.label}
        >
          <span className="nav-icon">{e.icon}</span>
          <span className="nav-label">{e.label}</span>
        </Link>
      ))}
      <div className="sidebar-footer">
        <div className="nav-divider" />
        <div className="nav-group-label">Admin</div>
        {ADMIN_NAV.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className={`nav-item${isActive(e) ? " active" : ""}`}
          title={e.label}
          >
            <span className="nav-icon">{e.icon}</span>
            <span className="nav-label">{e.label}</span>
          </Link>
        ))}
        <div className="nav-divider" />
        <Link
          href="/configuracoes"
          className={`nav-item${
            pathname.startsWith("/configuracoes") ? " active" : ""
          }`}
        >
          <span className="nav-icon">
            <IconGear />
          </span>
          <span className="nav-label">Configurações</span>
        </Link>
        <div className="nav-divider" />
        {/* Perfil do aparelho — é daqui que sai a autoria dos registros. */}
        <Link
          href={`/quem-e-voce?next=${encodeURIComponent(pathname)}`}
          className={`nav-item${pathname.startsWith("/quem-e-voce") ? " active" : ""}`}
          title={currentPlayer ? `Você é ${currentPlayer.name} — trocar` : "Quem é você?"}
        >
          <span className="nav-icon">
            {currentPlayer ? (
              <PlayerAvatar
                face={currentPlayer.base_face}
                size={22}
                avatarCache={currentPlayer.avatar_cache}
              />
            ) : (
              <img src="/design-system/img/faces/face-white.png" alt="" />
            )}
          </span>
          <span className="nav-label">{currentPlayer?.name ?? "Quem é você?"}</span>
        </Link>
      </div>
    </nav>
  );
}

/* ---------- ícones (SVG traço, grayscale→dourado quando .active) ---------- */
function svg(children: ReactNode) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round">
      {children}
    </svg>
  );
}
function IconGear() {
  return svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
    </>
  );
}
