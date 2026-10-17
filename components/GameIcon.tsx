import { GAME_ICONS, type GameIconName } from "@/lib/game-icons";

export type { GameIconName };

export default function GameIcon({
  name,
  size = 22,
  alt = "",
}: {
  name: GameIconName;
  size?: number;
  alt?: string;
}) {
  return (
    <img
      src={`/design-system/img/${GAME_ICONS[name]}`}
      alt={alt}
      className="game-icon"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
  );
}
