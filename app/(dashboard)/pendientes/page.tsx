import { auth } from "@/lib/auth";
import { TopBar } from "@/components/layout/TopBar";
import { TaskListLive } from "@/components/tareas/TaskListLive";

export const dynamic = "force-dynamic";

export default async function PendientesPage() {
  const session = await auth();
  const userId  = session?.user?.id;

  return (
    <div className="flex flex-col h-full">
      <TopBar title="Pendientes de aprobar" subtitle="Tareas que esperan tu revisión o aprobación" />
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl">
        {userId ? (
          <TaskListLive
            apiUrl="/api/pendientes-aprobar"
            emptyMessage="No hay tareas esperando tu aprobación"
            showAssignee
          />
        ) : (
          <p className="text-sm text-gray-400 py-10 text-center">Inicia sesión para ver los pendientes</p>
        )}
      </div>
    </div>
  );
}
