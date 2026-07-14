/**
 * Resolve o caminho de uma imagem (sprite, avatar) para uma URL utilizável no
 * <img src>. Depois da migração pro Vercel Blob, `path` pode ser:
 *  - uma URL completa do Blob (`https://...`) em produção → usa como está;
 *  - um caminho relativo a /public (`sprites/...`, `avatars/...`) no fallback
 *    de desenvolvimento local → prefixa com "/".
 * Também aceita valores que já comecem com "/".
 */
export function assetUrl(pathOrUrl: string | null | undefined): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//i.test(pathOrUrl) || pathOrUrl.startsWith("/")) return pathOrUrl;
  return `/${pathOrUrl}`;
}
