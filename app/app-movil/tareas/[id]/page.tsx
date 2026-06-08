"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Circle, Clock, Upload, Send } from "lucide-react";
import { toast } from "sonner";

export default function TareaDetallePage() {
  const params = useParams();
  const taskId = params.id as string;
  const supabase = createClient();
  const [completado, setCompletado] = useState(false);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Simular datos de tarea
  const tarea = {
    title: "Tarea de ejemplo",
    description: "Descripción de la tarea",
    priority: "medium",
    due_date: new Date().toISOString().split("T")[0],
    status: { name: "En progreso", color: "#6366F1" }
  };

  async function marcarCompletado() {
    setEnviando(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status_id: "done" })
        .eq("id", taskId);

      if (error) throw error;
      toast.success("Tarea marcada como completada");
      setCompletado(true);
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarComentario() {
    if (!comentario.trim()) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from("task_comments").insert({
        task_id: taskId,
        content: comentario,
      } as any);

      if (error) throw error;
      toast.success("Comentario agregado");
      setComentario("");
    } catch (err: any) {
      toast.error(err.message || "Error");
    } finally {
      setEnviando(false);
    }
  }

  const priorityColors: Record<string, string> = {
    urgent: "bg-red-100 text-red-700",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-blue-100 text-blue-700",
    low: "bg-gray-100 text-gray-700"
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href="/app-movil/mis-tareas" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{tarea.title}</h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tarea.status.color }}></div>
                {tarea.status.name}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {/* Priority & Due Date */}
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${priorityColors[tarea.priority]}`}>
            {tarea.priority}
          </span>
          {tarea.due_date && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {tarea.due_date}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-sm text-gray-600">{tarea.description}</p>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={marcarCompletado}
            disabled={enviando || completado}
            className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 ${
              completado 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-emerald-600 text-white hover:bg-emerald-700"
            } disabled:opacity-50`}
          >
            {completado ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                Completado
              </>
            ) : (
              <>
                <Circle className="w-5 h-5" />
                Marcar como completado
              </>
            )}
          </button>

          <button className="w-full py-3 bg-violet-600 text-white rounded-lg font-medium flex items-center justify-center gap-2">
            <Upload className="w-5 h-5" />
            Subir entregable
          </button>
        </div>

        {/* Comments */}
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <h3 className="font-medium text-gray-900 mb-3">Comentarios</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-violet-400"
            />
            <button
              onClick={enviarComentario}
              disabled={enviando || !comentario.trim()}
              className="p-2 bg-violet-600 text-white rounded-lg disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe">
        <div className="grid grid-cols-5 gap-1 px-2 py-2">
          <Link href="/app-movil" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            <span className="text-[10px]">Inicio</span>
          </Link>
          <Link href="/app-movil/proyectos" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            <span className="text-[10px]">Proyectos</span>
          </Link>
          <Link href="/app-movil/tareas/nueva" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            <span className="text-[10px]">Crear</span>
          </Link>
          <Link href="/app-movil/mis-tareas" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            <span className="text-[10px]">Tareas</span>
          </Link>
          <Link href="/app-movil/mensajes" className="flex flex-col items-center gap-1 p-2 text-gray-400">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <span className="text-[10px]">Msjs</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}