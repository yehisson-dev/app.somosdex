import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationProvider } from "@/components/notifications/NotificationProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  const rows = await sql`
    SELECT id FROM users WHERE email = ${session.user?.email ?? ""} LIMIT 1
  `;
  const userId = (rows[0] as any)?.id ?? "";

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <NotificationProvider userId={userId} />
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}
