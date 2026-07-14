import { NextResponse, type NextRequest } from "next/server";

/**
 * Trava de acesso simples (HTTP Basic Auth) para quando o app fica exposto na
 * internet (túnel Cloudflare). Protege TODAS as páginas e rotas de API — sem
 * isso qualquer um com a URL poderia criar/apagar jogadores, partidas e itens
 * do backlog.
 *
 * Só entra em ação quando `BASIC_AUTH_PASSWORD` está definido (ver .env.local).
 * Sem a variável — ex.: desenvolvimento local — libera tudo, pra não pedir
 * senha o tempo todo. Em produção, DEFINA a senha antes de abrir o túnel.
 * (Se você usar Cloudflare Access na frente, isto vira uma segunda camada.)
 */

const REALM = 'Basic realm="Sad Notes", charset="UTF-8"';

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(req: NextRequest) {
  const expected = process.env.BASIC_AUTH_PASSWORD;
  // Sem senha configurada (dev) → libera.
  if (!expected) return NextResponse.next();

  const expectedUser = process.env.BASIC_AUTH_USER || "amigos";
  const header = req.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    let decoded = "";
    try {
      decoded = atob(header.slice(6));
    } catch {
      decoded = "";
    }
    const sep = decoded.indexOf(":");
    if (sep !== -1) {
      const user = decoded.slice(0, sep);
      const pass = decoded.slice(sep + 1);
      if (safeEqual(user, expectedUser) && safeEqual(pass, expected)) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Autenticação necessária.", {
    status: 401,
    headers: { "WWW-Authenticate": REALM },
  });
}

export const config = {
  // Protege tudo, menos os assets internos do Next (não sensíveis) — evita
  // re-desafiar a cada chunk/otimização de imagem.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
