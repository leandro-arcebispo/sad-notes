import { STAGE, FACE_BOX, ornamentBox, AVATAR_FRAME, AVATAR_FRAME_OFFSET } from "./avatar-geometry";
import { hairColorCssFilter } from "./hair-colors";
import { assetUrl } from "./asset-url";
import type { AvatarRecipe } from "./types";

/** Tamanho final do PNG cacheado (igual ao antigo compositor server-side). */
const OUTPUT_SIZE = 128;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // necessário p/ não "tingir" o canvas com sprites do Blob
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`falha ao carregar imagem: ${src}`));
    img.src = src;
  });
}

/**
 * Compõe o avatar (base + cabelo + diversos) num PNG (dataURL) usando Canvas,
 * espelhando exatamente a geometria e a tintura do preview (AvatarComposer).
 * Substitui o compositor server-side via sharp — roda só no navegador, então o
 * Vercel não precisa gravar imagem em disco nem rodar sharp.
 */
export async function composeAvatarDataUrl(recipe: AvatarRecipe): Promise<string> {
  const stage = document.createElement("canvas");
  stage.width = STAGE;
  stage.height = STAGE;
  const ctx = stage.getContext("2d");
  if (!ctx) throw new Error("canvas 2d indisponível");
  ctx.imageSmoothingEnabled = false;

  // base (rosto)
  const face = await loadImage(`/design-system/img/faces/face-${recipe.base_face}.png`);
  ctx.drawImage(face, FACE_BOX.left, FACE_BOX.top, FACE_BOX.w, FACE_BOX.h);

  // cabelo (com tintura via filtro CSS — idêntico ao preview)
  if (recipe.hair) {
    const box = ornamentBox(
      recipe.hair.sprite_width,
      recipe.hair.sprite_height,
      recipe.hair.offset_x,
      recipe.hair.offset_y,
      recipe.hair.scale
    );
    const hairImg = await loadImage(assetUrl(recipe.hair.sprite_path));
    ctx.filter = hairColorCssFilter(recipe.hair_color);
    ctx.drawImage(hairImg, box.left, box.top, box.w, box.h);
    ctx.filter = "none";
  }

  // diversos (empilhados na ordem — o último aparece por cima)
  for (const orn of recipe.diversos) {
    const box = ornamentBox(orn.sprite_width, orn.sprite_height, orn.offset_x, orn.offset_y, orn.scale);
    const img = await loadImage(assetUrl(orn.sprite_path));
    ctx.drawImage(img, box.left, box.top, box.w, box.h);
  }

  // recorta a janela central (AVATAR_FRAME) e reduz pro tamanho de cache
  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const octx = out.getContext("2d");
  if (!octx) throw new Error("canvas 2d indisponível");
  octx.imageSmoothingEnabled = false;
  octx.drawImage(
    stage,
    AVATAR_FRAME_OFFSET,
    AVATAR_FRAME_OFFSET,
    AVATAR_FRAME,
    AVATAR_FRAME,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return out.toDataURL("image/png");
}
