import type { AvatarRecipe } from "@/lib/types";
import { FACE_BOX, ornamentBox } from "@/lib/avatar-geometry";
import { hairColorCssFilter } from "@/lib/hair-colors";

/** Renderiza a receita do avatar (base + cabelo + diversos) empilhada no
 * estágio, com a mesma geometria usada no OrnamentBuilder e no compositor
 * server-side (lib/avatar-compose.ts) — o preview aqui é fiel ao PNG final. */
export default function AvatarComposer({ recipe }: { recipe: AvatarRecipe }) {
  return (
    <div className="preview-stage">
      <img
        className="preview-layer"
        style={{ width: FACE_BOX.w, height: FACE_BOX.h, left: FACE_BOX.left, top: FACE_BOX.top }}
        src={`/design-system/img/faces/face-${recipe.base_face}.png`}
        alt=""
      />
      {recipe.hair && (() => {
        const box = ornamentBox(
          recipe.hair.sprite_width,
          recipe.hair.sprite_height,
          recipe.hair.offset_x,
          recipe.hair.offset_y,
          recipe.hair.scale
        );
        return (
          <img
            className="preview-layer"
            style={{
              width: box.w,
              height: box.h,
              left: box.left,
              top: box.top,
              filter: hairColorCssFilter(recipe.hair_color),
            }}
            src={`/${recipe.hair.sprite_path}`}
            alt=""
          />
        );
      })()}
      {recipe.diversos.map((orn) => {
        const box = ornamentBox(orn.sprite_width, orn.sprite_height, orn.offset_x, orn.offset_y, orn.scale);
        return (
          <img
            key={orn.row_id}
            className="preview-layer"
            style={{ width: box.w, height: box.h, left: box.left, top: box.top }}
            src={`/${orn.sprite_path}`}
            alt=""
          />
        );
      })}
    </div>
  );
}
