import type { BaseFace } from "@/lib/types";

/**
 * Avatar do jogador: usa o PNG composto cacheado (Fase 6 — base + cabelo +
 * diversos) quando existe; senão cai no avatar provisório (Fase 1 — só o rosto
 * base na cor escolhida). Sempre com um anel na cor do token do jogador.
 */
export default function PlayerAvatar({
  face,
  color,
  size = 48,
  avatarCache,
}: {
  face: BaseFace;
  color: string;
  size?: number;
  avatarCache?: string | null;
}) {
  const src = avatarCache ? `/${avatarCache}` : `/design-system/img/faces/face-${face}.png`;
  return (
    <span
      className="player-avatar"
      style={{
        width: size,
        height: size,
        borderColor: color,
      }}
    >
      <img src={src} alt="" width={size} height={size} />
    </span>
  );
}
