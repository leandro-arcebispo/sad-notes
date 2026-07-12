import type { BaseFace } from "@/lib/types";

/**
 * Avatar provisório (Fase 1): rosto base do Isaac na cor escolhida, com um anel
 * na cor do token do jogador. Na Fase 6 o mesmo rosto vira a camada de baixo do
 * avatar composto (base + cabelo + diversos).
 */
export default function PlayerAvatar({
  face,
  color,
  size = 48,
}: {
  face: BaseFace;
  color: string;
  size?: number;
}) {
  return (
    <span
      className="player-avatar"
      style={{
        width: size,
        height: size,
        borderColor: color,
      }}
    >
      <img
        src={`/design-system/img/faces/face-${face}.png`}
        alt=""
        width={size}
        height={size}
      />
    </span>
  );
}
