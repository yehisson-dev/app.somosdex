import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { ClientProfileDashboard } from "@/components/admin/ClientProfileDashboard";
import type { Project } from "@/types/database";

interface Props { params: Promise<{ clientId: string }> }

export const dynamic = "force-dynamic";

export default async function ClientProfilePage({ params }: Props) {
  const { clientId } = await params;
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const [clientRows, projects, clientProjects, whiteboards] = await Promise.all([
    sql`SELECT * FROM clients WHERE id = ${clientId} LIMIT 1`,
    sql`SELECT id, name, color, slug FROM projects ORDER BY name`,
    sql`SELECT project_id FROM client_projects WHERE client_id = ${clientId}`,
    sql`SELECT id, name, description, updated_at FROM whiteboards WHERE client_id = ${clientId} ORDER BY updated_at DESC`,
  ]);

  if (!clientRows[0]) notFound();

  return (
    <ClientProfileDashboard
      client={clientRows[0] as any}
      projects={projects as Project[]}
      initialAssigned={clientProjects.map((cp: any) => cp.project_id)}
      whiteboards={whiteboards as any[]}
    />
  );
}
