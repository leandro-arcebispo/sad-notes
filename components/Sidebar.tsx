"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

type NavEntry = { href: string; label: string; icon: ReactNode; exact?: boolean };

const NAV: NavEntry[] = [
  { href: "/", label: "Ranking", exact: true, icon: <img src="/design-system/img/icon-nav-ranking.png" alt="" /> },
  { href: "/partidas", label: "Partidas", icon: <img src="/design-system/img/icon-report.png" alt="" /> },
  { href: "/jogadores", label: "Jogadores", icon: <img src="/design-system/img/icon-isaac-avatar.png" alt="" /> },
  { href: "/spritesheets", label: "Spritesheets", icon: <IconSheets /> },
];

const ADMIN_NAV: NavEntry[] = [
  { href: "/backlog", label: "Backlog", icon: <IconBug /> },
  { href: "/sprites", label: "Sprites", icon: <IconGrid /> },
  { href: "/ornamentos", label: "Ornamentos", icon: <IconStar /> },
];

export default function Sidebar() {
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
function IconGrid() {
  return svg(
    <>
      <rect x="4" y="4" width="7" height="7" />
      <rect x="13" y="4" width="7" height="7" />
      <rect x="4" y="13" width="7" height="7" />
      <rect x="13" y="13" width="7" height="7" />
    </>
  );
}
function IconStar() {
  return svg(<path d="M12 3l2.6 5.6 6.4.8-4.7 4.4 1.2 6.2L12 17.8 6.3 20.4l1.2-6.2L2.8 9.4l6.4-.8z" />);
}
function IconSheets() {
  return svg(
    <>
      <rect x="3" y="3" width="18" height="14" rx="1" />
      <path d="M3 13l4-4 4 4 3-3 4 4" />
      <circle cx="8" cy="8" r="1.4" />
      <path d="M7 21h14M7 21v-2" />
    </>
  );
}
function IconBug() {
  return svg(
    <>
      <rect x="8" y="8" width="8" height="11" rx="4" />
      <path d="M12 3v4M9 6l1.5 2M15 6l-1.5 2M8 11H4M8 15H4.5M16 11h4M16 15h3.5M8.5 19l-2 2M15.5 19l2 2" />
    </>
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
