import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas públicas que no requieren sesión
const PUBLIC_PATHS = [
  "/onboarding/",
  "/brief/",
  "/api/onboarding/",
  "/api/brief/",
  "/api/calendar/",
  "/login",
  "/api/auth/",
];

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Permitir rutas públicas sin verificar sesión
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Para el resto, verificar sesión
  const session = await auth();
  if (!session && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Aplicar a todo excepto assets estáticos y archivos del sistema Next.js
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff|woff2)).*)",
  ],
};
