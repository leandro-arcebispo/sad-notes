import Frame from "@/components/Frame";
import ComingSoon from "@/components/ComingSoon";

export default function SpritesPage() {
  return (
    <Frame variant="frame-utero-purple" title="Catálogo de Sprites">
      <ComingSoon
        phase="Fase 3 — Catálogo de Sprites"
        desc="Importar um sprite-sheet, recortar um sprite, nomear e categorizar, e salvar como PNG numa pasta configurável do projeto. Biblioteca reutilizável por outras telas — sem depender de IA."
      />
    </Frame>
  );
}
