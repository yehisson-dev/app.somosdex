import { auth } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { TaskListLive } from "@/components/tareas/TaskListLive";

export const dynamic = "force-dynamic";

export default async function MisTareasPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Mis tareas" subtitle="Retrasadas y pendientes de hoy" />
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        {userId ? (
          <TaskListLive
            apiUrl="/api/mis-tareas"
            emptyMessage="Todo al día — no tienes tareas retrasadas ni para hoy"
            onlyTodayAndOverdue
          />
        ) : (
          <p className="text-sm text-gray-400 py-10 text-center">Inicia sesión para ver tus tareas</p>
        )}
      </div>
    </div>
  );
}
