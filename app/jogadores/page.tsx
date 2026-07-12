import Frame from "@/components/Frame";
import ComingSoon from "@/components/ComingSoon";

export default function JogadoresPage() {
  return (
    <Frame variant="frame-library" title="Jogadores">
      <ComingSoon
        phase="Fase 1 — Jogadores"
        desc="Cadastro do bando (nome, apelido, cor do token). O avatar customizado chega na Fase 5, alimentado pelo Catálogo de Sprites e pelos Ornamentos."
      />
    </Frame>
  );
}
