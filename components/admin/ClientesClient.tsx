"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Plus, X, Check, ChevronDown, Building2, Phone, MapPin,
  Clock, Target, FileText, Palette, ListTodo, Pencil, LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Client, Project } from "@/types/database";

interface Props {
  clients: Client[];
  projects: Project[];
  clientProjects: { client_id: string; project_id: string }[];
}

const COLORS = [
  "#8b5cf6", "#6366f1", "#3b82f6", "#06b6d4", "#10b981",
  "#f59e0b", "#ef4444", "#ec4899", "#f97316", "#84cc16",
];

const EMPTY_FORM = {
  name: "",
  company: "",
  email: "",
  color: "#8b5cf6",
  brief: "",
  visual_identity: "",
  action_plan: "",
  schedule: "",
  address: "",
  support_phone: "",
  objective: "",
};

export function ClientesClient({ clients: initialClients, projects, clientProjects: initialCP }: Props) {
  const [clients, setClients] = useState(initialClients);
  const [clientProjects, setClientProjects] = useState(initialCP);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [assignedProjects, setAssignedProjects] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("basic");
  const supabase = createClient();

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getClientProjects(clientId: string) {
    return clientProjects
      .filter((cp) => cp.client_id === clientId)
      .map((cp) => projects.find((p) => p.id === cp.project_id))
      .filter(Boolean) as Project[];
  }

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setAssignedProjects([]);
    setActiveSection("basic");
    setPanelOpen(true);
  }

  function openEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      company: client.company ?? "",
      email: client.email ?? "",
      color: client.color,
      brief: client.brief ?? "",
      visual_identity: client.visual_identity ?? "",
      action_plan: client.action_plan ?? "",
      schedule: client.schedule ?? "",
      address: client.address ?? "",
      support_phone: client.support_phone ?? "",
      objective: client.objective ?? "",
    });
    setAssignedProjects(
      clientProjects.filter((cp) => cp.client_id === client.id).map((cp) => cp.project_id)
    );
    setActiveSection("basic");
    setPanelOpen(true);
  }

  function toggleProject(projectId: string) {
    setAssignedProjects((prev) =>
      prev.includes(projectId) ? prev.filter((id) => id !== projectId) : [...prev, projectId]
    );
  }

  // ── Save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!form.name.trim()) { toast.error("El nombre es requerido"); return; }
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      company: form.company.trim() || null,
      email: form.email.trim() || null,
      color: form.color,
      brief: form.brief.trim() || null,
      visual_identity: form.visual_identity.trim() || null,
      action_plan: form.action_plan.trim() || null,
      schedule: form.schedule.trim() || null,
      address: form.address.trim() || null,
      support_phone: form.support_phone.trim() || null,
      objective: form.objective.trim() || null,
    };

    let clientId = editing?.id ?? "";

    if (editing) {
      // Update
      const { error } = await supabase.from("clients").update(payload as any).eq("id", editing.id);
      if (error) { toast.error("Error al actualizar cliente"); setSaving(false); return; }
      setClients((prev) => prev.map((c) => c.id === editing.id ? { ...c, ...payload } : c));
    } else {
      // Insert
      const { data, error } = await supabase.from("clients").insert(payload as any).select().single();
      if (error || !data) { toast.error("Error al crear cliente"); setSaving(false); return; }
      clientId = (data as Client).id;
      setClients((prev) => [...prev, data as Client]);
    }

    // Sync project assignments
    const currentProjects = clientProjects.filter((cp) => cp.client_id === clientId).map((cp) => cp.project_id);
    const toAdd = assignedProjects.filter((id) => !currentProjects.includes(id));
    const toRemove = currentProjects.filter((id) => !assignedProjects.includes(id));

    if (toAdd.length) {
      await supabase.from("client_projects").insert(
        toAdd.map((project_id) => ({ client_id: clientId, project_id } as any))
      );
    }
    if (toRemove.length) {
      for (const project_id of toRemove) {
        await supabase.from("client_projects")
          .delete().eq("client_id", clientId).eq("project_id", project_id);
      }
    }

    // Update local state
    setClientProjects((prev) => {
      const filtered = prev.filter((cp) => cp.client_id !== clientId);
      return [...filtered, ...assignedProjects.map((project_id) => ({ client_id: clientId, project_id }))];
    });

    toast.success(editing ? "Cliente actualizado" : "Cliente creado");
    setSaving(false);
    setPanelOpen(false);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function handleDelete(clientId: string) {
    if (!confirm("¿Eliminar este cliente? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("clients").delete().eq("id", clientId);
    if (error) { toast.error("Error al eliminar cliente"); return; }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
    setClientProjects((prev) => prev.filter((cp) => cp.client_id !== clientId));
    if (editing?.id === clientId) setPanelOpen(false);
    toast.success("Cliente eliminado");
  }

  // ── Sections ───────────────────────────────────────────────────────────────
  const sections = [
    { id: "basic",    label: "Información básica",  icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: "brief",    label: "Brief",               icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "identity", label: "Identidad visual",    icon: <Palette className="w-3.5 h-3.5" /> },
    { id: "plan",     label: "Plan de acción",       icon: <ListTodo className="w-3.5 h-3.5" /> },
    { id: "goal",     label: "Objetivo",             icon: <Target className="w-3.5 h-3.5" /> },
    { id: "projects", label: "Proyectos",            icon: <ChevronDown className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-hidden flex">
      {/* ── Lista de clientes ──────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-3">
          {/* Botón nuevo */}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors mb-4"
          >
            <Plus className="w-4 h-4" />
            Nuevo cliente
          </button>

          {clients.length === 0 && (
            <p className="text-sm text-gray-400 italic">No hay clientes registrados aún.</p>
          )}

          {clients.map((client) => {
            const cProjects = getClientProjects(client.id);
            return (
              <div
                key={client.id}
                className="bg-white border border-gray-200 rounded-xl p-4 flex items-start gap-4"
              >
                {/* Color dot */}
                <div
                  className="w-10 h-10 rounded-xl shrink-0 flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: client.color + "33", border: `2px solid ${client.color}55`, color: client.color }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">{client.name}</p>
                    {client.company && (
                      <span className="text-xs text-gray-400">· {client.company}</span>
                    )}
                  </div>
                  {client.email && (
                    <p className="text-xs text-gray-400 mt-0.5">{client.email}</p>
                  )}

                  {/* Info rápida */}
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                    {client.support_phone && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Phone className="w-3 h-3" />{client.support_phone}
                      </span>
                    )}
                    {client.address && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="w-3 h-3" />{client.address}
                      </span>
                    )}
                    {client.schedule && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="w-3 h-3" />{client.schedule}
                      </span>
                    )}
                  </div>

                  {/* Proyectos */}
                  {cProjects.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {cProjects.map((p) => (
                        <span
                          key={p.id}
                          className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: p.color + "22", color: p.color }}
                        >
                          {p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/clientes/${client.id}`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors"
                    title="Ver perfil del cliente"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Ver perfil</span>
                  </Link>
                  <Link
                    href={`/clientes/${client.id}/contenido`}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-medium transition-colors"
                    title="Plan de contenido"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Contenido</span>
                  </Link>
                  <button
                    onClick={() => openEdit(client)}
                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                    title="Eliminar"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Panel lateral (drawer) ─────────────────────────────────────── */}
      {panelOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/40 z-30"
            onClick={() => setPanelOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">
                {editing ? "Editar cliente" : "Nuevo cliente"}
              </h2>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs de sección */}
            <div className="flex overflow-x-auto border-b border-gray-200 px-2 gap-0.5 shrink-0">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium whitespace-nowrap transition-colors border-b-2 -mb-px",
                    activeSection === s.id
                      ? "text-violet-600 border-violet-500"
                      : "text-gray-400 border-transparent hover:text-gray-600"
                  )}
                >
                  {s.icon}
                  {s.label}
                </button>
              ))}
            </div>

            {/* Contenido scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── Información básica ──────────────── */}
              {activeSection === "basic" && (
                <div className="space-y-4">
                  {/* Nombre + color */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-1.5">
                      <Label>Nombre *</Label>
                      <Input
                        value={form.name}
                        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                        placeholder="Nombre del cliente"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Color</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {COLORS.map((c) => (
                          <button
                            key={c}
                            onClick={() => setForm((f) => ({ ...f, color: c }))}
                            className={cn(
                              "w-6 h-6 rounded-full border-2 transition-all",
                              form.color === c ? "border-gray-800 scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Empresa / Marca</Label>
                    <Input
                      value={form.company}
                      onChange={(v) => setForm((f) => ({ ...f, company: v }))}
                      placeholder="Nombre de la empresa"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Email de contacto</Label>
                    <Input
                      value={form.email}
                      onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                      placeholder="contacto@empresa.com"
                      type="email"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      <Phone className="w-3.5 h-3.5 inline mr-1" />
                      Teléfono de servicio al cliente
                    </Label>
                    <Input
                      value={form.support_phone}
                      onChange={(v) => setForm((f) => ({ ...f, support_phone: v }))}
                      placeholder="+58 412 000 0000"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      <MapPin className="w-3.5 h-3.5 inline mr-1" />
                      Dirección
                    </Label>
                    <Input
                      value={form.address}
                      onChange={(v) => setForm((f) => ({ ...f, address: v }))}
                      placeholder="Av. Principal, Caracas"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Horario de atención
                    </Label>
                    <Input
                      value={form.schedule}
                      onChange={(v) => setForm((f) => ({ ...f, schedule: v }))}
                      placeholder="Lun–Vie 8am–6pm"
                    />
                  </div>
                </div>
              )}

              {/* ── Brief ──────────────────────────────── */}
              {activeSection === "brief" && (
                <div className="space-y-1.5">
                  <Label>
                    <FileText className="w-3.5 h-3.5 inline mr-1" />
                    Brief del cliente
                  </Label>
                  <p className="text-[11px] text-gray-400">
                    Contexto general del cliente, su negocio, historia y necesidades.
                  </p>
                  <Textarea
                    value={form.brief}
                    onChange={(v) => setForm((f) => ({ ...f, brief: v }))}
                    placeholder="Describe el negocio, los productos o servicios que ofrece, su contexto de mercado..."
                    rows={12}
                  />
                </div>
              )}

              {/* ── Identidad visual ───────────────────── */}
              {activeSection === "identity" && (
                <div className="space-y-1.5">
                  <Label>
                    <Palette className="w-3.5 h-3.5 inline mr-1" />
                    Identidad visual
                  </Label>
                  <p className="text-[11px] text-gray-400">
                    Paleta de colores, tipografías, estilo visual, tono de comunicación.
                  </p>
                  <Textarea
                    value={form.visual_identity}
                    onChange={(v) => setForm((f) => ({ ...f, visual_identity: v }))}
                    placeholder="Colores principales: #... · Tipografía: ... · Tono: profesional / cercano / ..."
                    rows={12}
                  />
                </div>
              )}

              {/* ── Plan de acción ─────────────────────── */}
              {activeSection === "plan" && (
                <div className="space-y-1.5">
                  <Label>
                    <ListTodo className="w-3.5 h-3.5 inline mr-1" />
                    Plan de acción
                  </Label>
                  <p className="text-[11px] text-gray-400">
                    Estrategia, entregables acordados, frecuencia de publicación, canales.
                  </p>
                  <Textarea
                    value={form.action_plan}
                    onChange={(v) => setForm((f) => ({ ...f, action_plan: v }))}
                    placeholder="Canal · Frecuencia · Tipo de contenido · Responsable..."
                    rows={12}
                  />
                </div>
              )}

              {/* ── Objetivo ───────────────────────────── */}
              {activeSection === "goal" && (
                <div className="space-y-1.5">
                  <Label>
                    <Target className="w-3.5 h-3.5 inline mr-1" />
                    Objetivo del cliente
                  </Label>
                  <p className="text-[11px] text-gray-400">
                    ¿Qué quiere lograr el cliente con el trabajo de la agencia?
                  </p>
                  <Textarea
                    value={form.objective}
                    onChange={(v) => setForm((f) => ({ ...f, objective: v }))}
                    placeholder="Aumentar ventas, posicionar marca, generar comunidad..."
                    rows={12}
                  />
                </div>
              )}

              {/* ── Proyectos ──────────────────────────── */}
              {activeSection === "projects" && (
                <div className="space-y-3">
                  <Label>Asignar a proyectos</Label>
                  <p className="text-[11px] text-gray-400">
                    El cliente aparecerá en el kanban de los proyectos seleccionados.
                  </p>
                  {projects.map((p) => {
                    const checked = assignedProjects.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        onClick={() => toggleProject(p.id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left",
                          checked
                            ? "border-current"
                            : "border-gray-200 hover:border-gray-300"
                        )}
                        style={checked ? {
                          backgroundColor: p.color + "15",
                          borderColor: p.color + "60",
                        } : {}}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                        <span className={cn("flex-1 text-sm", checked ? "text-gray-900 font-medium" : "text-gray-500")}>
                          {p.name}
                        </span>
                        {checked && <Check className="w-4 h-4 shrink-0" style={{ color: p.color }} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-between gap-3">
              {editing && (
                <button
                  onClick={() => handleDelete(editing.id)}
                  className="text-xs text-red-400 hover:text-red-500 transition-colors"
                >
                  Eliminar cliente
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button
                  onClick={() => setPanelOpen(false)}
                  className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
                >
                  {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear cliente"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ── Micro-componentes de formulario ────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-600 mb-1">{children}</label>;
}

function Input({
  value, onChange, placeholder, type = "text",
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors"
    />
  );
}

function Textarea({
  value, onChange, placeholder, rows = 6,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors resize-none leading-relaxed"
    />
  );
}
