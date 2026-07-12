import type { ReactNode } from "react";

type FrameVariant =
  | "frame-chest-torch"
  | "frame-chest"
  | "frame-library"
  | "frame-dank-depths"
  | "frame-cathedral"
  | "frame-utero-purple"
  | "frame-scarred-womb"
  | "frame-brick";

/**
 * Container padrão de página: a "sala" do jogo (border-image pixel-art) que
 * envolve o conteúdo. Escolha o `variant` conforme o tema da tela — ver
 * public/design-system/frames.md para o catálogo completo de 28 frames.
 */
export default function Frame({
  variant = "frame-chest-torch",
  title,
  actions,
  children,
}: {
  variant?: FrameVariant;
  title?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={`frame ${variant} page-frame`}>
      {(title || actions) && (
        <header className="page-head">
          {title && <h1 className="title">{title}</h1>}
          {actions && <div className="row">{actions}</div>}
        </header>
      )}
      {children}
    </div>
  );
}
