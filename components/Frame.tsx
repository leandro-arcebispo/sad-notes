import type { ReactNode } from "react";

type FrameVariant =
  | "frame-chest-torch"
  | "frame-chest"
  | "frame-library"
  | "frame-dank-depths"
  | "frame-cathedral"
  | "frame-utero"
  | "frame-utero-purple"
  | "frame-scarred-womb"
  | "frame-brick"
  | "frame-dank-depths-skulls"
  | "frame-shop-stocked"
  | "frame-cathedral-skulls";

/**
 * Container padrão de página: a "sala" do jogo (border-image pixel-art) que
 * envolve o conteúdo. Escolha o `variant` conforme o tema da tela — ver
 * public/design-system/frames.md para o catálogo completo de 28 frames.
 */
export default function Frame({
  variant = "frame-chest-torch",
  title,
  actions,
  actionsGrow = false,
  children,
}: {
  variant?: FrameVariant;
  title?: string;
  actions?: ReactNode;
  /** Quando true, a área de actions ocupa o espaço restante do header (ex.:
   * pra um input de busca crescer até o botão em vez de ficar encolhido). */
  actionsGrow?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`frame ${variant} page-frame`}>
      {(title || actions) && (
        <header className="page-head">
          {title && <h1 className="title">{title}</h1>}
          {actions && (
            <div className="row" style={actionsGrow ? { flex: 1 } : undefined}>
              {actions}
            </div>
          )}
        </header>
      )}
      {children}
    </div>
  );
}
