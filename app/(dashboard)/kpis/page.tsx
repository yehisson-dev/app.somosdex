import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { KpiDashboard } from "@/components/kpis/KpiDashboard";

export const dynamic = "force-dynamic";

export default async function KpisPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/proyectos");

  return (
    <div className="flex flex-col h-full">
      <TopBar title="KPIs" subtitle="Productividad del equipo" />
      <KpiDashboard />
    </div>
  );
}
