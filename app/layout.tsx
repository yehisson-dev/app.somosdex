import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/providers/SessionProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Cubo Digital",
  description: "Plataforma interna de gestión de proyectos",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className={`${inter.className} h-full bg-white`}>
        <SessionProvider>
          {children}
          <Toaster
            theme="light"
            position="bottom-right"
            toastOptions={{
              style: { background: "#ffffff", border: "1px solid #e5e7eb" },
            }}
          />
        </SessionProvider>
      </body>
    </html>
  );
}
