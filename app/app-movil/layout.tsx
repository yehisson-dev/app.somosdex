import { auth } from "@/lib/session";
import { redirect } from "next/navigation";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "ClicUp Móvil",
  description: "Gestión de proyectos desde tu móvil",
};

export default async function AppMovilLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login?callbackUrl=/app-movil");
  }

  return (
    <html lang="es">
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        {children}
      </body>
    </html>
  );
}