import type { BaseFace } from "@/lib/types";
import { assetUrl } from "@/lib/asset-url";

/**
 * Avatar do jogador: usa o PNG composto cacheado (Fase 6 — base + cabelo +
 * diversos) quando existe; senão cai no avatar provisório (Fase 1 — só o rosto
 * base na cor escolhida). Sem moldura — só a imagem.
 */
export default function PlayerAvatar({
  face,
  size = 56,
  avatarCache,
}: {
  face: BaseFace;
  size?: number;
  avatarCache?: string | null;
}) {
  const src = avatarCache ? assetUrl(avatarCache) : `/design-system/img/faces/face-${face}.png`;
  return (
    <span className="player-avatar" style={{ width: size, height: size }}>
      <img src={src} alt="" width={size} height={size} />
    </span>
  );
}
