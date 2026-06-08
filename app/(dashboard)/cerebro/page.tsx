import { unstable_noStore as noStore } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/server";
import { CerebroClient } from "@/components/brain/CerebroClient";
import type { Client } from "@/types/database";

export const dynamic = "force-dynamic";

export const metadata = { title: "Cerebro · Cubo Digital" };

export default async function CerebroPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const role = (session.user as { role?: string })?.role;
  if (role !== "admin") redirect("/mis-tareas");

  const supabase = createAdminClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, company, logo_url, color")
    .order("name");

  return <CerebroClient clients={(clients ?? []) as Client[]} />;
}
