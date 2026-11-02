import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { GlobalContentSearch } from "@/components/contenido/GlobalContentSearch";

export const dynamic = "force-dynamic";

export default async function ContenidoGlobalPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (role !== "admin" && role !== "project_manager") redirect("/proyectos");

  const clients = await sql`SELECT id, name, color FROM clients ORDER BY name`;

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Búsqueda de Contenidos"
        subtitle="Busca posts a través de todas las marcas"
      />
      <div className="flex-1 overflow-y-auto p-6">
        <GlobalContentSearch
          clients={clients.map(c => ({ id: c.id as string, name: c.name as string, color: c.color as string }))}
        />
      </div>
    </div>
  );
}
