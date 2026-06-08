"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Save, Calendar, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

export default function CrearTareaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const proyectoId = searchParams.get("proyecto");
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es obligatorio");
      return;
    }

    setLoading(true);
    try {
      const projectId = proyectoId || "00000000-0000-0000-0000-000000000001";

      const { data: statusData } = await supabase
        .from("project_statuses")
        .select("id")
        .eq("project_id", projectId)
        .order("position")
        .limit(1)
        .single();

      const { error } = await supabase.from("tasks").insert({
        title: title.trim(),
        description: description.trim() || null,
        project_id: projectId,
        status_id: statusData?.id || null,
        priority,
        due_date: dueDate || null,
      } as any);

      if (error) throw error;

      toast.success("Tarea creada");
      router.push("/app-movil/mis-tareas");
    } catch (err: any) {
      toast.error(err.message || "Error al crear tarea");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/app-movil" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-lg font-bold text-gray-900">Nueva Tarea</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la tarea"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción de la tarea"
            rows={3}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400 resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { value: "low", label: "Baja", color: "bg-gray-100 text-gray-600" },
              { value: "medium", label: "Media", color: "bg-blue-100 text-blue-600" },
              { value: "high", label: "Alta", color: "bg-orange-100 text-orange-600" },
              { value: "urgent", label: "Urgente", color: "bg-red-100 text-red-600" },
            ].map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value as any)}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${
                  priority === p.value ? p.color + " ring-2 ring-violet-500" : "bg-gray-50 text-gray-500"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Fecha límite
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? "Creando..." : (
            <>
              <Save className="w-5 h-5" />
              Crear Tarea
            </>
          )}
        </button>
      </form>
    </div>
  );
}