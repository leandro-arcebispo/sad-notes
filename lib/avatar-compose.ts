import sharp from "sharp";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { STAGE, FACE_BOX, ornamentBox, AVATAR_FRAME, AVATAR_FRAME_OFFSET } from "./avatar-geometry";
import type { AppliedOrnament, BaseFace } from "./types";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const AVATARS_DIR = path.join(PUBLIC_DIR, "avatars");
/** Tamanho final do PNG cacheado — menor que o estágio de edição (256), já
 * que é usado em avatares pequenos (ranking, listas); mantém nitidez pixelada. */
const OUTPUT_SIZE = 128;

/** Subconjunto de `sharp.OverlayOptions` que usamos — evita depender do tipo
 * namespaced do pacote (incompatível com isolatedModules neste tsconfig). */
type Layer = { input: Buffer; left: number; top: number };

async function layerBuffer(
  relPath: string,
  box: { w: number; h: number; left: number; top: number }
): Promise<Layer> {
  const abs = path.join(PUBLIC_DIR, relPath);
  const w = Math.max(1, Math.round(box.w));
  const h = Math.max(1, Math.round(box.h));
  const buf = await sharp(abs)
    .resize(w, h, { kernel: "nearest", fit: "fill" })
    .toBuffer();
  return { input: buf, left: Math.round(box.left), top: Math.round(box.top) };
}

/** Compõe base + cabelo + diversos (nessa ordem, diversos por cima em sequência)
 * num único PNG, seguindo a mesma geometria do editor/ornament builder. */
export async function composeAvatarPng(recipe: {
  base_face: BaseFace;
  hair: AppliedOrnament | null;
  diversos: AppliedOrnament[];
}): Promise<Buffer> {
  const layers: Layer[] = [];

  const facePath = path.join("design-system", "img", "faces", `face-${recipe.base_face}.png`);
  layers.push(await layerBuffer(facePath, FACE_BOX));

  if (recipe.hair) {
    const box = ornamentBox(recipe.hair.sprite_width, recipe.hair.sprite_height, recipe.hair.offset_x, recipe.hair.offset_y, recipe.hair.scale);
    layers.push(await layerBuffer(recipe.hair.sprite_path, box));
  }
  for (const orn of recipe.diversos) {
    const box = ornamentBox(orn.sprite_width, orn.sprite_height, orn.offset_x, orn.offset_y, orn.scale);
    layers.push(await layerBuffer(orn.sprite_path, box));
  }

  // Importante: finalizar a composição num buffer próprio ANTES de redimensionar,
  // em vez de encadear .composite().resize() numa única pipeline — o sharp não
  // garante executar composite/resize na ordem em que aparecem no código quando
  // encadeados direto, o que já produziu um avatar com camadas na posição errada.
  const composedBuf = await sharp({
    create: {
      width: STAGE,
      height: STAGE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(layers)
    .png()
    .toBuffer();

  // Corta pra janela central (AVATAR_FRAME) antes de reduzir — o estágio de
  // edição tem folga em volta do rosto p/ posicionar ornamentos livremente,
  // mas o avatar final deve ficar "zoomado" no rosto, sem essa margem.
  const croppedBuf = await sharp(composedBuf)
    .extract({ left: AVATAR_FRAME_OFFSET, top: AVATAR_FRAME_OFFSET, width: AVATAR_FRAME, height: AVATAR_FRAME })
    .png()
    .toBuffer();

  return sharp(croppedBuf)
    .resize(OUTPUT_SIZE, OUTPUT_SIZE, { kernel: "nearest" })
    .png()
    .toBuffer();
}

/**
 * Gera e grava o PNG cacheado do avatar em public/avatars/, removendo o
 * arquivo anterior (se houver) e devolvendo o novo caminho relativo a /public
 * (com sufixo único para invalidar cache do navegador a cada regeneração).
 */
export async function writeAvatarCache(
  playerId: number,
  recipe: { base_face: BaseFace; hair: AppliedOrnament | null; diversos: AppliedOrnament[] },
  previousPath: string | null
): Promise<string> {
  fs.mkdirSync(AVATARS_DIR, { recursive: true });
  const buffer = await composeAvatarPng(recipe);

  const suffix = crypto.randomBytes(3).toString("hex");
  const filename = `player-${playerId}-${suffix}.png`;
  fs.writeFileSync(path.join(AVATARS_DIR, filename), buffer);

  if (previousPath) {
    const prevAbs = path.join(PUBLIC_DIR, previousPath);
    if (prevAbs.startsWith(PUBLIC_DIR) && fs.existsSync(prevAbs)) {
      try {
        fs.unlinkSync(prevAbs);
      } catch {
        /* arquivo já ausente — segue */
      }
    }
  }

  return `avatars/${filename}`;
}
