import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { AgentesClient } from "@/components/agents/AgentesClient";

export const dynamic = "force-dynamic";

export const metadata = { title: "Agentes IA · Cubo Digital" };

export default async function AgentesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  if (role !== "admin") redirect("/mis-tareas");

  const supabase = createAdminClient();
  const { data: agents } = await supabase
    .from("agents")
    .select("*")
    .order("position");

  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, color, logo_url")
    .order("name");

  return <AgentesClient agents={agents ?? []} clients={clients ?? []} />;
}
