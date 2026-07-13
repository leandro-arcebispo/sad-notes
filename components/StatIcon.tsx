const ICONS = {
  wins: "icon-wins.png",
  souls: "icon-souls.png",
  coins: "icon-moedas-new.png",
  loot: "icon-loot.png",
  games: "icon-partidas.png",
  deaths: "icon-report.png",
  treasures: "icon-tesouros-new.png",
} as const;

export type StatIconName = keyof typeof ICONS;

export default function StatIcon({ name, size = 16 }: { name: StatIconName; size?: number }) {
  return (
    <img
      src={`/design-system/img/${ICONS[name]}`}
      alt=""
      className="stat-icon"
      style={{ height: size }}
    />
  );
}
