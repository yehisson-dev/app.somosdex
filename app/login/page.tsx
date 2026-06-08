"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { FolderKanban, ShieldX } from "lucide-react";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const isUnauthorized = error === "AccessDenied";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-6">
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-600 flex items-center justify-center">
              <FolderKanban className="w-6 h-6 text-white" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900">Cowork Agency</h1>
              <p className="text-sm text-gray-500 mt-1">Plataforma interna de proyectos</p>
            </div>
          </div>

          {/* Error de acceso denegado */}
          {isUnauthorized && (
            <div className="w-full flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <ShieldX className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">Acceso no autorizado</p>
                <p className="text-xs text-red-500 mt-0.5">
                  Tu cuenta de Google no tiene acceso a esta plataforma. Contacta al administrador para solicitar acceso.
                </p>
              </div>
            </div>
          )}

          {/* Card */}
          <div className="w-full bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
            <div className="text-center">
              <h2 className="text-sm font-semibold text-gray-900">Iniciar sesión</h2>
              <p className="text-xs text-gray-500 mt-1">Usa tu cuenta de Google corporativa</p>
            </div>

            <button
              onClick={() => signIn("google", { callbackUrl: "/proyectos" })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-900 font-medium text-sm rounded-lg px-4 py-2.5 transition-colors border border-gray-200"
            >
              <GoogleIcon />
              Continuar con Google
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Acceso restringido — solo usuarios invitados
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18">
      <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"/>
      <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
      <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
    </svg>
  );
}
