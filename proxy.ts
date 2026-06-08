import { NextRequest, NextResponse } from "next/server";

// Rutas públicas que no requieren autenticación
const PUBLIC_PATHS = [
  "/login",
  "/brief/",
  "/plan/",
  "/api/",
  "/_next/",
  "/favicon",
  "/icon",
  "/manifest",
  "/sw.js",
  "/app-icon",
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const sessionToken =
    req.cookies.get("authjs.session-token")?.value ||
    req.cookies.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken && pathname !== "/login") {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl, { status: 307 });
  }

  if (sessionToken && pathname === "/") {
    const proyectosUrl = req.nextUrl.clone();
    proyectosUrl.pathname = "/proyectos";
    return NextResponse.redirect(proyectosUrl, { status: 307 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon|icon|manifest|sw\\.js|app-icon).*)",
  ],
};
