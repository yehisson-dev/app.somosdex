"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, X, Save, Trash2, CheckCircle2, XCircle,
  Upload, MessageSquare, Clock,
  Download, Timer, AlertTriangle, Eye,
} from "lucide-react";
import { formatDate, formatRelativeDate, getInitials, getPriorityLabel, cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createClient } from "@/lib/supabase/client";
import type { Task, ProjectStatus, User as UserType, TaskDeliverable, TaskComment, TaskActivity, NotificationType } from "@/types/database";

interface TaskDetailClientProps {
  task: Task;
  statuses: ProjectStatus[];
  projectMembers: UserType[];
  currentUserId: string;
  onClose?: () => void;
}

export function TaskDetailClient({ task: initialTask, statuses, projectMembers, currentUserId, onClose }: TaskDetailClientProps) {
  const router = useRouter();
  const [task, setTask] = useState(initialTask);
  const [comment, setComment] = useState("");
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState(initialTask.content ?? initialTask.description ?? "");
  const [savingDesc, setSavingDesc] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  // Expiración automática
  const daysLeft = task.scheduled_at
    ? Math.ceil(
        (new Date(task.scheduled_at).getTime() + 60 * 24 * 60 * 60 * 1000 - Date.now()) /
          (24 * 60 * 60 * 1000)
      )
    : null;
  const expiryDate = task.scheduled_at
    ? new Date(new Date(task.scheduled_at).getTime() + 60 * 24 * 60 * 60 * 1000)
    : null;

  const deliverables = (task.deliverables ?? []) as TaskDeliverable[];
  const comments = (task.comments ?? []) as (TaskComment & { user: UserType })[];
  const activity = (task.activity ?? []) as (TaskActivity & { user: UserType })[];

  async function updateStatus(statusId: string) {
    const { error } = await supabase.from("tasks").update({ status_id: statusId } as any).eq("id", task.id);
    if (!error) {
      const status = statuses.find((s) => s.id === statusId);
      setTask((prev) => ({ ...prev, status_id: statusId, status }));
      await logActivity("status_change", { from: task.status?.name, to: status?.name });
      router.refresh();
      toast.success("Estado actualizado");
    }
  }

  async function updateAssignee(userId: string) {
    const { error } = await supabase.from("tasks").update({ assignee_id: userId } as any).eq("id", task.id);
    if (!error) {
      const assignee = projectMembers.find((m) => m.id === userId);
      setTask((prev) => ({ ...prev, assignee_id: userId, assignee }));
      await createNotification(userId, "task_assigned", `Se te asignó: ${task.title}`);
      router.refresh();
      toast.success("Asignado actualizado");
    }
  }

  async function submitComment() {
    if (!comment.trim()) return;
    const mentions: string[] = [];
    const { data, error } = await supabase.from("task_comments").insert({
      task_id: task.id,
      user_id: currentUserId,
      content: comment,
      mentions,
    } as any).select("*, user:users!task_comments_user_id_fkey(id, full_name, avatar_url)").single();

    if (!error && data) {
      setTask((prev) => ({ ...prev, comments: [...(prev.comments ?? []), data] }));
      setComment("");
      router.refresh();

      // Notificar al asignado si no soy yo el que comenta
      if (task.assignee_id && task.assignee_id !== currentUserId) {
        await createNotification(task.assignee_id, "task_comment", `Nuevo comentario en: ${task.title}`);
      }
      // Notificar al aprobador si no soy yo
      if (task.approver_id && task.approver_id !== currentUserId && task.approver_id !== task.assignee_id) {
        await createNotification(task.approver_id, "task_comment", `Nuevo comentario en: ${task.title}`);
      }
    }
  }

  async function uploadDeliverable(file: File, versionOffset = 0) {
    try {
      // 1. Subir archivo a /api/upload (almacenamiento local en el servidor)
      const uploadRes = await fetch(
        `/api/upload?filename=${encodeURIComponent(file.name)}&mimetype=${encodeURIComponent(file.type)}`,
        { method: "POST", body: file }
      );
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error ?? "Error al subir el archivo");
      }
      const uploaded = await uploadRes.json();
      const fileUrl = uploaded.url; // /api/files/<uuid>.<ext>

      // 2. Guardar registro en task_deliverables
      const nextVersion = deliverables.length + 1 + versionOffset;
      const isImage = file.type.startsWith("image");

      const { data: deliverable, error: dbErr } = await supabase
        .from("task_deliverables")
        .insert({
          task_id: task.id,
          uploaded_by: currentUserId,
          version: nextVersion,
          file_name: file.name,
          file_url: fileUrl,
          file_type: file.type,
          thumbnail_url: isImage ? fileUrl : null,
          status: "pending" as const,
        } as any)
        .select("*, uploader:users!task_deliverables_uploaded_by_fkey(id, full_name, avatar_url)")
        .single();

      if (dbErr) throw dbErr;

      // 3. Auto-mover a "En Revisión" si existe ese estado (solo en el primero)
      if (versionOffset === 0) {
        const revisionStatus = statuses.find((s) => s.name.toLowerCase().includes("revisión"));
        if (revisionStatus) {
          await supabase.from("tasks").update({ status_id: revisionStatus.id } as any).eq("id", task.id);
          setTask((prev) => ({ ...prev, status_id: revisionStatus.id, status: revisionStatus }));
        }
      }

      setTask((prev) => ({
        ...prev,
        deliverables: [...(prev.deliverables ?? []), deliverable],
      }));

      // 4. Notificar al aprobador (solo en el primero para no spamear)
      if (task.approver_id && versionOffset === 0) {
        await createNotification(task.approver_id, "deliverable_uploaded", `Nuevo entregable en: ${task.title}`);
      }

      await logActivity("deliverable_uploaded", { version: nextVersion, file: file.name });
      return true;
    } catch (err: any) {
      console.error("[uploadDeliverable]", err);
      toast.error(`Error subiendo ${file.name}: ${err.message ?? "Error desconocido"}`);
      return false;
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
      const ok = await uploadDeliverable(files[i], i);
      if (ok) successCount++;
    }
    router.refresh();
    if (successCount > 0) {
      toast.success(successCount === 1 ? `Entregable subido` : `${successCount} entregables subidos`);
    }
    setUploading(false);
    // Resetear input para permitir volver a seleccionar los mismos archivos
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function reviewDeliverable(deliverableId: string, status: "approved" | "rejected", note?: string) {
    const { error } = await supabase
      .from("task_deliverables")
      .update({ status, review_note: note, reviewed_by: currentUserId, reviewed_at: new Date().toISOString() } as any)
      .eq("id", deliverableId);

    if (!error) {
      setTask((prev) => ({
        ...prev,
        deliverables: (prev.deliverables ?? []).map((d: any) =>
          d.id === deliverableId ? { ...d, status, review_note: note } : d
        ),
      }));

      if (task.assignee_id) {
        const type = status === "approved" ? "deliverable_approved" : "deliverable_rejected";
        const msg = status === "approved" ? `Aprobado: ${task.title}` : `Cambios solicitados: ${task.title}`;
        await createNotification(task.assignee_id, type as any, msg);
      }

      await logActivity(status === "approved" ? "deliverable_approved" : "deliverable_rejected", {});
      router.refresh();
      toast.success(status === "approved" ? "Entregable aprobado" : "Cambios solicitados");
    }
  }

  async function deleteDeliverable(del: TaskDeliverable & { uploader?: UserType }) {
    if (!confirm("Eliminar este entregable? Esta accion no se puede deshacer.")) return;
    // Eliminar archivo fisico del servidor
    if (del.file_url?.startsWith("/api/files/")) {
      const filename = del.file_url.split("/").pop();
      if (filename) await fetch("/api/files/" + filename, { method: "DELETE" }).catch(() => {});
    }
    // Eliminar registro de la DB
    const { error } = await supabase.from("task_deliverables").delete().eq("id", del.id);
    if (error) { toast.error("Error al eliminar el entregable"); return; }
    setTask((prev) => ({
      ...prev,
      deliverables: (prev.deliverables ?? []).filter((d: any) => d.id !== del.id),
    }));
    await logActivity("deliverable_deleted", { file: del.file_name });
    toast.success("Entregable eliminado");
  }

  async function updatePriority(priority: string) {
    const { error } = await supabase.from("tasks").update({ priority } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, priority: priority as any }));
      router.refresh();
      toast.success("Prioridad actualizada");
    }
  }

  async function updateContentType(content_type: string) {
    const val = content_type.trim() || null;
    const { error } = await supabase.from("tasks").update({ content_type: val } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, content_type: val }));
      router.refresh();
      toast.success("Tipo de contenido actualizado");
    }
  }

  async function updateDueDate(due_date: string) {
    const val = due_date || null;
    const { error } = await supabase.from("tasks").update({ due_date: val } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, due_date: val }));
      router.refresh();
      toast.success("Fecha límite actualizada");
    }
  }

  async function updateScheduledDate(scheduled_date: string) {
    const val = scheduled_date || null;
    const { data, error } = await supabase
      .from("tasks")
      .update({ scheduled_date: val } as any)
      .eq("id", task.id)
      .select("scheduled_at")
      .single();
    if (!error && data) {
      setTask((prev) => ({
        ...prev,
        scheduled_date: val,
        scheduled_at: (data as any).scheduled_at ?? prev.scheduled_at,
      }));
      router.refresh();
      toast.success(val ? "Tarea marcada como programada" : "Fecha programada eliminada");
    }
  }

  async function updateTitle(title: string) {
    const val = title.trim();
    if (!val) return;
    const { error } = await supabase.from("tasks").update({ title: val } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, title: val }));
      router.refresh();
      toast.success("Título actualizado");
    }
  }

  async function updateEstimatedHours(val: string) {
    const num = val ? parseFloat(val) : null;
    const { error } = await supabase.from("tasks").update({ estimated_hours: num } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, estimated_hours: num }));
      router.refresh();
      toast.success("Horas estimadas actualizadas");
    }
  }

  async function updatePrice(val: string) {
    const num = val ? parseFloat(val) : null;
    const { error } = await supabase.from("tasks").update({ price: num } as any).eq("id", task.id);
    if (!error) {
      setTask((prev) => ({ ...prev, price: num }));
      router.refresh();
      toast.success("Precio actualizado");
    }
  }

  async function updateApprover(userId: string) {
    const val = userId === "none" ? null : userId;
    const { error } = await supabase.from("tasks").update({ approver_id: val } as any).eq("id", task.id);
    if (!error) {
      const approver = projectMembers.find((m) => m.id === val) ?? undefined;
      setTask((prev) => ({ ...prev, approver_id: val, approver }));
      router.refresh();
      toast.success("Aprobador actualizado");
    }
  }

  async function saveDescription() {
    const trimmed = description.trim();
    if (trimmed === (task.content ?? task.description ?? "").trim()) return; // sin cambios
    setSavingDesc(true);
    const { error } = await supabase
      .from("tasks")
      .update({ content: trimmed, description: trimmed } as any)
      .eq("id", task.id);
    setSavingDesc(false);
    if (!error) {
      setTask((prev) => ({ ...prev, content: trimmed, description: trimmed }));
      router.refresh();
      toast.success("Descripción guardada");
    } else {
      toast.error("Error al guardar");
    }
  }

  async function logActivity(action: string, metadata: Record<string, unknown>) {
    const { data } = await supabase
      .from("task_activity")
      .insert({ task_id: task.id, user_id: currentUserId, action, metadata } as any)
      .select("*, user:users!task_activity_user_id_fkey(id, full_name, avatar_url)")
      .single();
    if (data) {
      setTask((prev) => ({ ...prev, activity: [...(prev.activity ?? []), data] }));
    }
  }

  async function handleSaveAndClose() {
    await saveDescription();
    onClose?.();
  }

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from("tasks").delete().eq("id", task.id);
    if (error) {
      toast.error("Error al eliminar la tarea");
      setDeleting(false);
      setConfirmDelete(false);
      return;
    }
    toast.success("Tarea eliminada");
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
    router.refresh();
  }

  async function createNotification(userId: string, type: string, title: string) {
    // Llama al endpoint que crea la notificación en DB Y envía email al usuario
    await fetch("/api/notifications/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        type,
        title,
        task_id: task.id,
      }),
    });
  }

  const priorityColors: Record<string, string> = {
    low: "text-slate-400",
    medium: "text-blue-400",
    high: "text-orange-400",
    urgent: "text-red-400",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 border-b border-gray-200 bg-white shrink-0">
        {/* Botón izquierdo: volver (página) o cerrar (drawer) */}
        <button
          onClick={onClose ? onClose : () => router.back()}
          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
        >
          {onClose ? <X className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        </button>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={task.title}
            onChange={(e) => setTask((p) => ({ ...p, title: e.target.value }))}
            onBlur={(e) => updateTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="w-full text-sm font-semibold text-gray-900 bg-transparent border-none outline-none focus:ring-1 focus:ring-violet-400 rounded px-1 -mx-1 truncate"
          />
          {task.client && (
            <p className="text-xs text-gray-400">
              {(task.client as any).name} · {(task.project as any)?.name}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* Eliminar */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
              title="Eliminar tarea"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-lg px-2 py-1">
              <span className="text-xs text-red-600 font-medium">¿Eliminar?</span>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 rounded px-2 py-0.5 font-medium transition-colors"
              >
                {deleting ? "…" : "Sí"}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-xs text-red-400 hover:text-red-600 transition-colors px-1"
              >
                No
              </button>
            </div>
          )}

          {/* Guardar — solo en modo drawer */}
          {onClose && (
            <button
              onClick={handleSaveAndClose}
              disabled={savingDesc}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              {savingDesc ? "Guardando…" : "Guardar"}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Banner de expiración automática */}
          {daysLeft !== null && (
            <div
              className={cn(
                "flex items-start gap-3 rounded-xl border px-4 py-3 text-sm",
                daysLeft <= 7
                  ? "bg-red-50 border-red-200 text-red-600"
                  : daysLeft <= 14
                  ? "bg-amber-50 border-amber-200 text-amber-600"
                  : "bg-blue-50 border-blue-200 text-blue-600"
              )}
            >
              {daysLeft <= 14 ? (
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              ) : (
                <Timer className="w-4 h-4 mt-0.5 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">
                  {daysLeft <= 0
                    ? "Esta tarea expira hoy y será eliminada automáticamente."
                    : daysLeft === 1
                    ? "Esta tarea se eliminará mañana."
                    : `Esta tarea se eliminará en ${daysLeft} días.`}
                </p>
                {expiryDate && (
                  <p className="text-[11px] mt-0.5 opacity-70">
                    Eliminación programada: {expiryDate.toLocaleDateString("es", {
                      day: "numeric", month: "long", year: "numeric",
                    })} · Las tareas programadas se borran 60 días después de ser marcadas para liberar almacenamiento.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Descripción / Guión</h3>
              {savingDesc && <span className="text-[10px] text-gray-400">Guardando…</span>}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              placeholder="Escribe el guión, brief o descripción de la tarea…"
              rows={6}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-800 placeholder:text-gray-400 resize-y focus:outline-none focus:border-violet-300 transition-colors min-h-[120px]"
            />
          </section>

          {/* Deliverables */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Entregables ({deliverables.length})
              </h3>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept="image/*,video/*,application/pdf"
                  multiple
                  onChange={handleFileChange}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs border-gray-200 hover:bg-gray-50 text-gray-600"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {uploading ? "Subiendo..." : "Subir entregable"}
                </Button>
              </div>
            </div>

            {deliverables.length === 0 ? (
              <div className="border border-dashed border-gray-200 rounded-lg p-8 text-center">
                <Upload className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs text-gray-400">Sin entregables. Sube el primer archivo.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {deliverables.map((d) => (
                  <DeliverableRow
                    key={d.id}
                    deliverable={d as TaskDeliverable & { uploader?: UserType }}
                    canReview={task.approver_id === currentUserId}
                    onReview={reviewDeliverable}
                    onDelete={deleteDeliverable}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Comments */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Comentarios ({comments.length})
            </h3>
            <div className="space-y-3 mb-4">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                  <Avatar className="w-6 h-6 shrink-0 mt-0.5">
                    <AvatarImage src={c.user?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                      {getInitials(c.user?.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-gray-700">{c.user?.full_name}</span>
                      <span className="text-[10px] text-gray-400">{formatRelativeDate(c.created_at)}</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Escribe un comentario... (@usuario para mencionar)"
                rows={2}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-800 placeholder:text-gray-400 resize-none focus:outline-none focus:border-violet-300"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
              />
              <Button
                size="sm"
                onClick={submitComment}
                disabled={!comment.trim()}
                className="self-end bg-violet-600 hover:bg-violet-700 text-white text-xs"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </Button>
            </div>
          </section>

          {/* Activity */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Actividad</h3>
            <div className="space-y-2">
              {activity.slice().reverse().map((a) => (
                <div key={a.id} className="flex items-start gap-2 text-xs text-gray-400">
                  <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                  <span>
                    <span className="text-gray-600">{a.user?.full_name}</span>
                    {" "}{getActivityLabel(a.action, a.metadata as any)}
                    {" · "}
                    <span>{formatRelativeDate(a.created_at)}</span>
                  </span>
                </div>
              ))}
              {activity.length === 0 && (
                <p className="text-xs text-gray-300">Sin actividad registrada</p>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar metadata */}
        <div className="w-64 border-l border-gray-200 overflow-y-auto p-4 space-y-5 shrink-0 bg-gray-50">
          <MetaField label="Estado">
            <Select value={task.status_id ?? ""} onValueChange={updateStatus}>
              <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                <div className="flex items-center gap-1.5">
                  {task.status && (
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: (task.status as any).color }} />
                  )}
                  <SelectValue placeholder="Sin estado" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {statuses.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Responsable">
            <Select value={task.assignee_id ?? ""} onValueChange={updateAssignee}>
              <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                {projectMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Aprueba">
            <Select value={task.approver_id ?? "none"} onValueChange={updateApprover}>
              <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                <SelectValue placeholder="Sin definir" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin definir</SelectItem>
                {projectMembers.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Prioridad">
            <Select value={task.priority} onValueChange={updatePriority}>
              <SelectTrigger className="h-7 text-xs bg-white border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="urgent"><span className="text-red-400">Urgente</span></SelectItem>
                <SelectItem value="high"><span className="text-orange-400">Alta</span></SelectItem>
                <SelectItem value="medium"><span className="text-blue-400">Media</span></SelectItem>
                <SelectItem value="low"><span className="text-slate-400">Baja</span></SelectItem>
              </SelectContent>
            </Select>
          </MetaField>

          <MetaField label="Tipo de contenido">
            <input
              type="text"
              value={task.content_type ?? ""}
              onChange={(e) => setTask((p) => ({ ...p, content_type: e.target.value || null }))}
              onBlur={(e) => updateContentType(e.target.value)}
              placeholder="Ej: Imagen, Video, Reels…"
              className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </MetaField>

          <MetaField label="Precio">
            <input
              type="number"
              step="0.01"
              min="0"
              value={task.price ?? ""}
              onChange={(e) => setTask((p) => ({ ...p, price: e.target.value ? parseFloat(e.target.value) : null }))}
              onBlur={(e) => updatePrice(e.target.value)}
              placeholder="0.00"
              className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </MetaField>

          <MetaField label="Horas estimadas">
            <input
              type="number"
              step="0.5"
              min="0"
              value={task.estimated_hours ?? ""}
              onChange={(e) => setTask((p) => ({ ...p, estimated_hours: e.target.value ? parseFloat(e.target.value) : null }))}
              onBlur={(e) => updateEstimatedHours(e.target.value)}
              placeholder="0"
              className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-violet-400 transition-colors"
            />
          </MetaField>

          <MetaField label="Fecha límite">
            <input
              type="date"
              value={task.due_date ?? ""}
              onChange={(e) => updateDueDate(e.target.value)}
              className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-xs text-gray-600 focus:outline-none focus:border-violet-400 [color-scheme:light] transition-colors"
            />
          </MetaField>

          <MetaField label="Fecha programada">
            <input
              type="date"
              value={task.scheduled_date ?? ""}
              onChange={(e) => updateScheduledDate(e.target.value)}
              className="w-full h-7 bg-white border border-gray-200 rounded px-2 text-xs text-gray-600 focus:outline-none focus:border-violet-400 [color-scheme:light] transition-colors"
            />
            {task.scheduled_at && daysLeft !== null && (
              <p className={cn(
                "text-[10px] mt-1 flex items-center gap-1",
                daysLeft <= 7 ? "text-red-400" : daysLeft <= 14 ? "text-amber-400" : "text-gray-400"
              )}>
                <Timer className="w-2.5 h-2.5" />
                {daysLeft <= 0 ? "Expira hoy" : `Se elimina en ${daysLeft} días`}
              </p>
            )}
          </MetaField>
        </div>
      </div>
    </div>
  );
}

function MetaField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function DeliverableRow({
  deliverable,
  canReview,
  onReview,
  onDelete,
}: {
  deliverable: TaskDeliverable & { uploader?: UserType };
  canReview: boolean;
  onReview: (id: string, status: "approved" | "rejected", note?: string) => void;
  onDelete: (del: TaskDeliverable & { uploader?: UserType }) => void;
}) {
  const [showReject, setShowReject] = useState(false);
  const [rejectNote, setRejectNote] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const isImage = deliverable.file_type?.startsWith("image");
  const isVideo = deliverable.file_type?.startsWith("video");

  const statusColors: Record<string, string> = {
    pending: "text-amber-600 bg-amber-50 border-amber-200",
    approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
    rejected: "text-red-600 bg-red-50 border-red-200",
  };

  const statusLabels: Record<string, string> = {
    pending: "En revisión",
    approved: "Aprobado",
    rejected: "Cambios solicitados",
  };

  async function downloadFile() {
    try {
      const response = await fetch(deliverable.file_url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = deliverable.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      window.open(deliverable.file_url, "_blank");
    }
  }

  return (
    <>
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        {/* Preview */}
        {deliverable.thumbnail_url ? (
          <div className="w-14 h-10 rounded-md overflow-hidden bg-gray-100 shrink-0">
            <img src={deliverable.thumbnail_url} alt="" className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-10 rounded-md bg-gray-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] text-gray-400 uppercase">
              {deliverable.file_type?.split("/")[1]?.slice(0, 3) ?? "FILE"}
            </span>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-700 truncate font-medium">{deliverable.file_name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-gray-400">v{deliverable.version}</span>
            {deliverable.uploader && (
              <span className="text-[10px] text-gray-400">· {deliverable.uploader.full_name}</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full border font-medium", statusColors[deliverable.status])}>
            {statusLabels[deliverable.status]}
          </span>
          <button
            onClick={() => { if (isImage || isVideo) { setLightboxOpen(true); } else { window.open(deliverable.file_url, "_blank"); } }}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Ver archivo"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={downloadFile}
            className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            title="Descargar archivo"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDelete(deliverable)}
            className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
            title="Eliminar entregable"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Review actions */}
      {canReview && deliverable.status === "pending" && !showReject && (
        <div className="flex gap-2 px-3 pb-3">
          <button
            onClick={() => onReview(deliverable.id, "approved")}
            className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 rounded-md px-2.5 py-1 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Aprobar
          </button>
          <button
            onClick={() => setShowReject(true)}
            className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md px-2.5 py-1 transition-colors"
          >
            <XCircle className="w-3.5 h-3.5" />
            Pedir cambios
          </button>
        </div>
      )}

      {showReject && (
        <div className="px-3 pb-3 space-y-2">
          <textarea
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            placeholder="Describe los cambios necesarios..."
            rows={2}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 resize-none focus:outline-none focus:border-violet-400 transition-colors"
          />
          <div className="flex gap-2">
            <button
              onClick={() => { onReview(deliverable.id, "rejected", rejectNote); setShowReject(false); }}
              className="text-xs text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 rounded-md px-2.5 py-1 transition-colors"
            >
              Enviar cambios
            </button>
            <button
              onClick={() => { setShowReject(false); setRejectNote(""); }}
              className="text-xs text-gray-400 hover:text-gray-600 px-2"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {deliverable.review_note && (
        <div className="px-3 pb-3">
          <p className="text-[11px] text-gray-400 bg-gray-50 border border-gray-200 rounded p-2">
            <span className="text-gray-600 font-medium">Nota: </span>
            {deliverable.review_note}
          </p>
        </div>
      )}
    </div>

    {/* Lightbox */}
    {lightboxOpen && (isImage || isVideo) && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        onClick={() => setLightboxOpen(false)}
      >
        <div className="relative max-w-5xl max-h-[90vh] w-full mx-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3 px-1">
            <span className="text-white text-sm font-medium truncate pr-4">{deliverable.file_name}</span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={downloadFile}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded px-2.5 py-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Descargar
              </button>
              <button
                onClick={() => setLightboxOpen(false)}
                className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
          {isImage && (
            <img src={deliverable.file_url} alt={deliverable.file_name} className="w-full max-h-[82vh] object-contain rounded-lg" />
          )}
          {isVideo && (
            <video src={deliverable.file_url} controls autoPlay className="w-full max-h-[82vh] rounded-lg bg-black" />
          )}
        </div>
      </div>
    )}
    </>
  );
}

function getActivityLabel(action: string, metadata: Record<string, string>): string {
  const labels: Record<string, string> = {
    status_change: `cambió el estado de "${metadata?.from}" a "${metadata?.to}"`,
    deliverable_uploaded: `subió el entregable v${metadata?.version}`,
    deliverable_approved: "aprobó el entregable",
    deliverable_rejected: "solicitó cambios en el entregable",
    comment_added: "comentó en la tarea",
  };
  return labels[action] ?? action;
}
