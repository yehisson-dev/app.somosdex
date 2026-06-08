import { NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación en el middleware
// (las rutas /api/* tienen su propia autenticación interna)
const PUBLIC_PATHS = [
  "/login",
  "/brief/",       // formularios de brief de clientes
  "/plan/",        // planes de contenido compartidos
  "/api/",         // todas las API tienen auth propia, el middleware no las bloquea
  "/_next/",       // assets de Next.js
  "/favicon",
  "/icon",
  "/manifest",
  "/sw.js",
  "/app-icon",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir rutas públicas
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Verificar cookie de sesión de NextAuth v5
  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  // Sin sesión → redirigir al login directamente (1 solo redirect, sin RSC)
  if (!sessionToken && pathname !== "/login") {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  // Con sesión en la raíz → ir a proyectos
  if (sessionToken && pathname === "/") {
    const proyectosUrl = req.nextUrl.clone();
    proyectosUrl.pathname = "/proyectos";
    return NextResponse.redirect(proyectosUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Excluir archivos estáticos y API de NextAuth
    "/((?!_next/static|_next/image|favicon|icon|manifest|sw\\.js|app-icon).*)",
  ],
};
