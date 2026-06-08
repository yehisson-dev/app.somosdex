import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { ProspectosPipeline } from "@/components/crm/ProspectosPipeline";
import sql from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ProspectosPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  const [prospectos, usuarios] = await Promise.all([
    sql`
      SELECT p.*, to_char(p.expected_close, 'YYYY-MM-DD') AS expected_close,
        json_build_object('id', u.id, 'full_name', u.full_name, 'avatar_url', u.avatar_url) AS assigned_user
      FROM prospects p
      LEFT JOIN users u ON u.id = p.assigned_to
      ORDER BY p.created_at DESC
    `.catch(() => []),
    sql`SELECT id, full_name, avatar_url FROM users ORDER BY full_name`.catch(() => []),
  ]);

  return (
    <div className="flex flex-col h-full">
      <TopBar
        title="Prospectos"
        subtitle="Pipeline de ventas y seguimiento de oportunidades"
      />
      <ProspectosPipeline
        initialProspectos={prospectos as any[]}
        usuarios={usuarios as any[]}
      />
    </div>
  );
}
