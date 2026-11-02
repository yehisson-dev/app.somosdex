"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Search, Shield, Briefcase, User as UserIcon, Plus, Mail,
  CheckCircle2, AlertCircle, ClipboardList, Edit2, Check, X, UserPlus, ChevronDown, BarChart2,
} from "lucide-react";
import { KpiDashboard } from "@/components/kpis/KpiDashboard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { getInitials, cn } from "@/lib/utils";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  admin:           { label: "Admin",           color: "text-violet-700 bg-violet-50 border-violet-200", icon: <Shield className="w-3 h-3" /> },
  project_manager: { label: "Project Manager", color: "text-blue-700 bg-blue-50 border-blue-200",       icon: <Briefcase className="w-3 h-3" /> },
  collaborator:    { label: "Colaborador",      color: "text-gray-600 bg-gray-100 border-gray-200",      icon: <UserIcon className="w-3 h-3" /> },
};

const CONTRACT_LABELS: Record<string, string> = {
  tiempo_completo: "Tiempo completo",
  medio_tiempo:    "Medio tiempo",
  freelance:       "Freelance",
  pasante:         "Pasante",
  consultor:       "Consultor",
};

const EMPTY_FORM = { full_name: "", email: "", job_title: "", role: "collaborator" };

interface User {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  job_title: string | null;
  avatar_url: string | null;
  created_at: string;
  profile: any;
  stats: { completed: number | string; overdue: number | string; total: number | string };
}

interface Props {
  users: User[];
  projects: any[];
  memberships: { project_id: string; user_id: string }[];
  clientsByProject: Record<string, any[]>;
  memberClients: { project_id: string; user_id: string; client_id: string }[];
}

export function RRHHListClient({ users: initialUsers, projects, memberships: initMemberships, clientsByProject, memberClients: initMemberClients }: Props) {
  const supabase = createClient();
  const [users, setUsers] = useState(initialUsers);
  const [memberships, setMemberships] = useState(initMemberships);
  const [memberClients, setMemberClients] = useState(initMemberClients);
  const [search, setSearch] = useState("");
  const [editingTitle, setEditingTitle] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [roleOpen, setRoleOpen] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"equipo" | "kpis">("equipo");

  const filtered = users.filter(
    (u) =>
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.job_title?.toLowerCase().includes(search.toLowerCase()),
  );

  async function changeRole(userId: string, role: string) {
    const { error } = await supabase.from("users").update({ role } as any).eq("id", userId);
    if (error) { toast.error("Error al cambiar rol"); return; }
    setUsers((p) => p.map((u) => u.id === userId ? { ...u, role } : u));
    setRoleOpen(null);
    toast.success("Rol actualizado");
  }

  async function saveJobTitle(userId: string) {
    const { error } = await supabase
      .from("users")
      .update({ job_title: titleDraft.trim() || null } as any)
      .eq("id", userId);
    if (error) { toast.error("Error al guardar cargo"); return; }
    setUsers((p) => p.map((u) => u.id === userId ? { ...u, job_title: titleDraft.trim() || null } : u));
    setEditingTitle(null);
    toast.success("Cargo actualizado");
  }

  async function deleteUser(userId: string) {
    if (!confirm("¿Eliminar este colaborador? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) { toast.error("Error al eliminar colaborador"); return; }
    setUsers((p) => p.filter((u) => u.id !== userId));
    toast.success("Colaborador eliminado");
  }

  async function addToProject(userId: string, projectId: string) {
    const { error } = await supabase.from("project_members").insert({ project_id: projectId, user_id: userId } as any);
    if (error) { toast.error("Error al asignar proyecto"); return; }
    setMemberships((p) => [...p, { project_id: projectId, user_id: userId }]);
    toast.success("Proyecto asignado");
  }

  async function removeFromProject(userId: string, projectId: string) {
    await supabase.from("project_members").delete().eq("project_id", projectId).eq("user_id", userId);
    await supabase.from("member_clients").delete().eq("project_id", projectId).eq("user_id", userId);
    setMemberships((p) => p.filter((m) => !(m.project_id === projectId && m.user_id === userId)));
    setMemberClients((p) => p.filter((mc) => !(mc.project_id === projectId && mc.user_id === userId)));
    toast.success("Proyecto removido");
  }

  async function toggleClient(userId: string, projectId: string, clientId: string, assigned: boolean) {
    if (assigned) {
      await supabase.from("member_clients").delete().eq("project_id", projectId).eq("user_id", userId).eq("client_id", clientId);
      setMemberClients((p) => p.filter((mc) => !(mc.project_id === projectId && mc.user_id === userId && mc.client_id === clientId)));
    } else {
      await supabase.from("member_clients").insert({ project_id: projectId, user_id: userId, client_id: clientId } as any);
      setMemberClients((p) => [...p, { project_id: projectId, user_id: userId, client_id: clientId }]);
    }
  }

  function getUserProjects(userId: string) {
    return memberships.filter((m) => m.user_id === userId).map((m) => projects.find((p) => p.id === m.project_id)).filter(Boolean);
  }
  function getAvailableProjects(userId: string) {
    const ids = memberships.filter((m) => m.user_id === userId).map((m) => m.project_id);
    return projects.filter((p) => !ids.includes(p.id));
  }
  function isClientAssigned(userId: string, projectId: string, clientId: string) {
    return memberClients.some((mc) => mc.user_id === userId && mc.project_id === projectId && mc.client_id === clientId);
  }

  async function createUser() {
    if (!form.full_name.trim()) { toast.error("El nombre es requerido"); return; }
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      toast.error("Email inválido"); return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .insert({
          full_name: form.full_name.trim(),
          email: form.email.trim().toLowerCase(),
          job_title: form.job_title.trim() || null,
          role: form.role,
        } as any)
        .select()
        .single();

      if (error || !data) { toast.error("Error al crear colaborador"); return; }

      setUsers((p) => [...p, { ...(data as any), profile: null, stats: { completed: 0, overdue: 0, total: 0 } }]);
      setForm(EMPTY_FORM);
      setDrawerOpen(false);
      toast.success("Colaborador creado");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTab("equipo")}
              className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                tab === "equipo" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              <UserIcon className="w-3.5 h-3.5" /> Equipo
            </button>
            <button
              onClick={() => setTab("kpis")}
              className={cn("flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-colors",
                tab === "kpis" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}
            >
              <BarChart2 className="w-3.5 h-3.5" /> KPIs
            </button>
          </div>
          {tab === "equipo" && (
            <button
              onClick={() => { setForm(EMPTY_FORM); setDrawerOpen(true); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
            >
              <UserPlus className="w-4 h-4" /> Nuevo colaborador
            </button>
          )}
        </div>

        {/* KPI tab */}
        {tab === "kpis" && <KpiDashboard embedded />}

        {/* Equipo tab toolbar */}
        {tab === "equipo" && <div className="flex items-center justify-between mb-6">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar colaborador..."
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-violet-300"
            />
          </div>
        </div>}

        {/* Grid */}
        {tab === "equipo" && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((user) => {
            const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.collaborator;
            const isExpanded = expandedUser === user.id;
            const userProjects = getUserProjects(user.id);
            const availableProjects = getAvailableProjects(user.id);
            const stats = user.stats ?? { completed: 0, overdue: 0, total: 0 };
            const total = Number(stats.total);
            const completed = Number(stats.completed);
            const overdue = Number(stats.overdue);
            const rate = total > 0 ? Math.round((completed / total) * 100) : null;
            const profile = user.profile;
            const isEditingTitle = editingTitle === user.id;

            return (
              <div key={user.id} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3 hover:border-gray-300 transition-colors">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/rrhh/${user.id}`} className="flex items-center gap-3 min-w-0 group">
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarImage src={user.avatar_url ?? undefined} />
                      <AvatarFallback className="bg-violet-100 text-violet-600 text-xs font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">
                        {user.full_name ?? "Sin nombre"}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate">{user.email}</p>
                    </div>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => deleteUser(user.id)}
                    title="Eliminar colaborador"
                    className="p-1 rounded-md text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.preventDefault(); setRoleOpen(roleOpen === user.id ? null : user.id); }}
                      title="Cambiar rol"
                      className={cn("flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full border transition-colors hover:opacity-80", roleCfg.color)}
                    >
                      {roleCfg.icon}
                      <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                    </button>
                    {roleOpen === user.id && (
                      <>
                        <div className="fixed inset-0 z-10" onClick={() => setRoleOpen(null)} />
                        <div className="absolute right-0 top-7 z-20 bg-white border border-gray-200 rounded-lg shadow-lg w-44 py-1">
                          {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                            <button key={key} onClick={() => changeRole(user.id, key)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors">
                              <span className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded-full border text-[10px] font-medium", cfg.color)}>
                                {cfg.icon}{cfg.label}
                              </span>
                              {user.role === key && <Check className="w-3 h-3 ml-auto text-violet-400" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  </div>
                </div>

                {/* Cargo editable */}
                {isEditingTitle ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveJobTitle(user.id);
                        if (e.key === "Escape") setEditingTitle(null);
                      }}
                      className="flex-1 text-xs border border-violet-300 rounded px-2 py-1 focus:outline-none"
                      placeholder="Ej. Diseñador UI"
                    />
                    <button onClick={() => saveJobTitle(user.id)} className="p-1 text-violet-600 hover:text-violet-800">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingTitle(null)} className="p-1 text-gray-400 hover:text-gray-600">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setTitleDraft(user.job_title ?? ""); setEditingTitle(user.id); }}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-violet-600 group w-fit transition-colors"
                  >
                    <span className={user.job_title ? "font-medium" : "italic text-gray-400"}>
                      {user.job_title || "Sin cargo"}
                    </span>
                    <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                )}

                {/* Contrato / fecha */}
                {(profile?.contract_type || profile?.start_date) && (
                  <div className="flex flex-wrap gap-1.5">
                    {profile?.contract_type && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {CONTRACT_LABELS[profile.contract_type] ?? profile.contract_type}
                      </span>
                    )}
                    {profile?.start_date && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Desde {new Date(profile.start_date).toLocaleDateString("es-DO", { month: "short", year: "numeric" })}
                      </span>
                    )}
                  </div>
                )}

                {/* Sueldo */}
                {profile?.salary && (
                  <p className="text-sm font-semibold text-gray-700">
                    {profile.salary_currency === "USD" ? "$" : "RD$"}
                    {Number(profile.salary).toLocaleString("es-DO")}
                    <span className="text-[10px] font-normal text-gray-400 ml-1">/ mes</span>
                  </p>
                )}

                {/* Stats */}
                {total > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-gray-100">
                    <div className="w-full bg-gray-100 rounded-full h-1">
                      <div
                        className={cn("h-1 rounded-full transition-all", rate !== null && rate >= 70 ? "bg-emerald-500" : rate !== null && rate >= 40 ? "bg-amber-400" : "bg-red-400")}
                        style={{ width: `${rate ?? 0}%` }}
                      />
                    </div>
                    <div className="flex items-center gap-3 text-[10px]">
                      <span className="flex items-center gap-0.5 text-emerald-600">
                        <CheckCircle2 className="w-3 h-3" />{completed}
                      </span>
                      {overdue > 0 && (
                        <span className="flex items-center gap-0.5 text-red-400">
                          <AlertCircle className="w-3 h-3" />{overdue} venc.
                        </span>
                      )}
                      <span className="flex items-center gap-0.5 text-gray-400 ml-auto">
                        <ClipboardList className="w-3 h-3" />{total}
                      </span>
                      {rate !== null && (
                        <span className={cn("font-semibold", rate >= 70 ? "text-emerald-600" : rate >= 40 ? "text-amber-500" : "text-red-400")}>
                          {rate}%
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Botón proyectos */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="flex items-center justify-between w-full pt-2 border-t border-gray-100 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="w-3 h-3" />
                    {userProjects.length === 0 ? "Sin proyectos asignados" : `${userProjects.length} proyecto${userProjects.length > 1 ? "s" : ""}`}
                  </span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", isExpanded && "rotate-180")} />
                </button>

                {/* Panel expandible */}
                {isExpanded && (
                  <div className="space-y-3 pt-1">
                    {userProjects.map((project: any) => {
                      const pClients = clientsByProject[project.id] ?? [];
                      return (
                        <div key={project.id} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                              <span className="text-xs font-medium text-gray-700">{project.name}</span>
                            </div>
                            <button
                              onClick={() => removeFromProject(user.id, project.id)}
                              className="text-[10px] text-gray-300 hover:text-red-400 transition-colors flex items-center gap-0.5"
                            >
                              <X className="w-3 h-3" /> Quitar
                            </button>
                          </div>
                          {pClients.length > 0 && (
                            <div className="ml-3.5 flex flex-wrap gap-1.5">
                              {pClients.map((client: any) => {
                                const assigned = isClientAssigned(user.id, project.id, client.id);
                                return (
                                  <button
                                    key={client.id}
                                    onClick={() => toggleClient(user.id, project.id, client.id, assigned)}
                                    className={cn(
                                      "flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border transition-all",
                                      assigned
                                        ? "font-medium"
                                        : "border-gray-200 text-gray-400 hover:border-gray-300",
                                    )}
                                    style={assigned ? { backgroundColor: client.color + "20", borderColor: client.color + "60", color: client.color } : {}}
                                  >
                                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: assigned ? client.color : "#d1d5db" }} />
                                    {client.name}
                                    {assigned && <Check className="w-2.5 h-2.5" />}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {availableProjects.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-[10px] text-gray-400 font-medium">Agregar proyecto</p>
                        <div className="flex flex-wrap gap-1.5">
                          {availableProjects.map((p: any) => (
                            <button
                              key={p.id}
                              onClick={() => addToProject(user.id, p.id)}
                              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-dashed border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 transition-colors"
                            >
                              <Plus className="w-2.5 h-2.5" />{p.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-400 text-sm">
              No se encontraron colaboradores
            </div>
          )}
        </div>}
      </div>

      {/* Drawer nuevo colaborador */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-gray-900">Nuevo colaborador</h2>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  El colaborador podrá ingresar con <strong>Google Sign-In</strong> usando el email que registres aquí.
                </p>
              </div>

              {[
                { label: "Nombre completo *", key: "full_name", placeholder: "Ej. Ana García",       type: "text"  },
                { label: "Email de Google *",  key: "email",     placeholder: "colaborador@gmail.com", type: "email" },
                { label: "Cargo",              key: "job_title", placeholder: "Ej. Diseñador UI",     type: "text"  },
              ].map(({ label, key, placeholder, type }) => (
                <div key={key} className="space-y-1.5">
                  <label className="block text-xs font-medium text-gray-600">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm placeholder-gray-400 focus:outline-none focus:border-violet-400 transition-colors"
                  />
                </div>
              ))}

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">Rol</label>
                <div className="space-y-2">
                  {Object.entries(ROLE_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setForm((f) => ({ ...f, role: key }))}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left",
                        form.role === key ? "border-violet-300 bg-violet-50" : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                      )}
                    >
                      <span className={cn("flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border", cfg.color)}>
                        {cfg.icon}{cfg.label}
                      </span>
                      <span className="text-xs text-gray-500 flex-1">
                        {key === "admin"           && "Acceso total, gestión de usuarios"}
                        {key === "project_manager" && "Gestiona proyectos y tareas"}
                        {key === "collaborator"    && "Ve y trabaja en sus tareas"}
                      </span>
                      {form.role === key && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-gray-200 px-5 py-3 flex justify-end gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createUser}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Creando…" : "Crear colaborador"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
