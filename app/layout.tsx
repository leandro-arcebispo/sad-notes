import type { Metadata } from "next";
import Sidebar from "@/components/Sidebar";
import { getCurrentPlayer } from "@/lib/identity";
import "./globals.css";

export const metadata: Metadata = {
  title: "IFSN — Sad Notes",
  description:
    "Isaaquinho's Friends Sad Notes — registro de partidas, ranking e torneios de Four Souls + Requiem.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentPlayer = await getCurrentPlayer();
  return (
    <html lang="pt-BR">
      <head>
        {/* Frames pixel-art (border-image). Servido estático de /design-system
            para que os url("img/...") relativos resolvam a partir dessa pasta. */}
        <link rel="stylesheet" href="/design-system/frames.css" />
      </head>
      <body>
        <Sidebar currentPlayer={currentPlayer} />
        <main className="main">{children}</main>
      </body>
    </html>
  );
}
