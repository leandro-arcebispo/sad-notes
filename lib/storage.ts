import { put, del } from "@vercel/blob";
import path from "node:path";
import fs from "node:fs";

/**
 * Abstração de storage de imagens (sprites recortados, avatares compostos).
 *
 * - **Produção (Vercel):** grava no Vercel Blob quando `BLOB_READ_WRITE_TOKEN`
 *   está presente (injetado automaticamente ao anexar um Blob store). Devolve a
 *   URL pública completa (`https://...`), que é guardada no banco.
 * - **Dev local:** sem o token, grava em `public/<key>` e devolve `/<key>` — o
 *   Next serve como estático, então `npm run dev` continua funcionando sem
 *   nenhuma dependência de nuvem.
 *
 * `assetUrl()` (lib/asset-url.ts) sabe lidar com os dois formatos na hora de
 * renderizar.
 */

const useBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN);
/** Rodando num ambiente serverless (Vercel), onde o filesystem é read-only. */
const isServerless = () => Boolean(process.env.VERCEL);

/** Grava a imagem e devolve a referência a guardar no banco (URL ou caminho). */
export async function putImage(
  key: string,
  body: Buffer,
  contentType = "image/png"
): Promise<string> {
  if (useBlob()) {
    const res = await put(key, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    return res.url;
  }
  // Sem Blob no Vercel: o fallback de disco falharia com um ENOENT confuso
  // (filesystem read-only). Erro claro em vez disso.
  if (isServerless()) {
    throw new Error(
      "Storage de imagens não configurado: BLOB_READ_WRITE_TOKEN ausente. " +
        "Anexe um Vercel Blob store ao projeto (Storage → Blob) e refaça o deploy."
    );
  }
  const abs = path.join(process.cwd(), "public", key);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, body);
  return `/${key}`;
}

/** Remove uma imagem previamente gravada (URL do Blob ou caminho local). */
export async function deleteImage(ref: string | null | undefined): Promise<void> {
  if (!ref) return;
  if (/^https?:\/\//i.test(ref)) {
    if (useBlob()) {
      try {
        await del(ref);
      } catch {
        /* já ausente — segue */
      }
    }
    return;
  }
  if (isServerless()) return; // caminho local não existe no serverless
  const rel = ref.replace(/^\//, "");
  const pub = path.join(process.cwd(), "public");
  const abs = path.join(pub, rel);
  if (abs.startsWith(pub) && fs.existsSync(abs)) {
    try {
      fs.unlinkSync(abs);
    } catch {
      /* já ausente — segue */
    }
  }
}
