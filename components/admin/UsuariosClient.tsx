"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Shield, Briefcase, User as UserIcon, ChevronDown, Check, X, Plus, Mail, UserPlus } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import type { User, Project, Client } from "@/types/database";

interface Props {
  users: User[];
  projects: Project[];
  memberships: { project_id: string; user_id: string }[];
  clientsByProject: Record<string, Client[]>;
  memberClients: { project_id: string; user_id: string; client_id: string }[];
}

const ROLE_CONFIG = {
  admin:           { label: "Admin",           color: "text-violet-700 bg-violet-50 border-violet-200", icon: <Shield className="w-3 h-3" /> },
  project_manager: { label: "Project Manager", color: "text-blue-700 bg-blue-50 border-blue-200",       icon: <Briefcase className="w-3 h-3" /> },
  collaborator:    { label: "Colaborador",      color: "text-gray-600 bg-gray-100 border-gray-200",      icon: <UserIcon className="w-3 h-3" /> },
};

const EMPTY_USER_FORM = { full_name: "", email: "", role: "collaborator" };

export function UsuariosClient({
  users: initialUsers,
  projects,
  memberships: initialMemberships,
  clientsByProject,
  memberClients: initialMemberClients,
}: Props) {
  const [users, setUsers] = useState(initialUsers);
  const [memberships, setMemberships] = useState(initialMemberships);
  const [memberClients, setMemberClients] = useState(initialMemberClients);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [roleOpen, setRoleOpen] = useState<string | null>(null);

  // Nuevo usuario
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userForm, setUserForm] = useState(EMPTY_USER_FORM);
  const [saving, setSaving] = useState(false);

  const supabase = createClient();

  // ── Rol ───────────────────────────────────────────────────────────────────
  async function changeRole(userId: string, role: string) {
    const { error } = await supabase.from("users").update({ role } as any).eq("id", userId);
    if (error) { toast.error("Error al cambiar rol"); return; }
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: role as any } : u));
    setRoleOpen(null);
    toast.success("Rol actualizado");
  }

  // ── Proyectos ─────────────────────────────────────────────────────────────
  async function addToProject(userId: string, projectId: string) {
    const { error } = await supabase
      .from("project_members")
      .insert({ project_id: projectId, user_id: userId } as any);
    if (error) { toast.error("Error al asignar proyecto"); return; }
    setMemberships((prev) => [...prev, { project_id: projectId, user_id: userId }]);
    toast.success("Usuario asignado al proyecto");
  }

  async function removeFromProject(userId: string, projectId: string) {
    const { error } = await supabase
      .from("project_members")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    if (error) { toast.error("Error al quitar del proyecto"); return; }
    // Quitar también sus clientes en ese proyecto
    await supabase
      .from("member_clients")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId);
    setMemberships((prev) => prev.filter((m) => !(m.project_id === projectId && m.user_id === userId)));
    setMemberClients((prev) => prev.filter((mc) => !(mc.project_id === projectId && mc.user_id === userId)));
    toast.success("Usuario removido del proyecto");
  }

  // ── Clientes ──────────────────────────────────────────────────────────────
  async function assignClient(userId: string, projectId: string, clientId: string) {
    const { error } = await supabase
      .from("member_clients")
      .insert({ project_id: projectId, user_id: userId, client_id: clientId } as any);
    if (error) { toast.error("Error al asignar cliente"); return; }
    setMemberClients((prev) => [...prev, { project_id: projectId, user_id: userId, client_id: clientId }]);
    toast.success("Cliente asignado");
  }

  async function unassignClient(userId: string, projectId: string, clientId: string) {
    const { error } = await supabase
      .from("member_clients")
      .delete()
      .eq("project_id", projectId)
      .eq("user_id", userId)
      .eq("client_id", clientId);
    if (error) { toast.error("Error al quitar cliente"); return; }
    setMemberClients((prev) =>
      prev.filter((mc) => !(mc.project_id === projectId && mc.user_id === userId && mc.client_id === clientId))
    );
    toast.success("Cliente removido");
  }

  // ── Crear usuario ────────────────────────────────────────────────────────
  async function createUser() {
    if (!userForm.full_name.trim()) { toast.error("El nombre es requerido"); return; }
    if (!userForm.email.trim()) { toast.error("El email es requerido"); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userForm.email.trim())) { toast.error("Email inválido"); return; }

    // Verificar que no exista
    const { data: existing } = await supabase
      .from("users")
      .select("id")
      .eq("email", userForm.email.trim().toLowerCase())
      .single();
    if (existing) { toast.error("Ya existe un usuario con ese email"); return; }

    setSaving(true);
    const { data, error } = await supabase
      .from("users")
      .insert({
        full_name: userForm.full_name.trim(),
        email: userForm.email.trim().toLowerCase(),
        role: userForm.role,
      } as any)
      .select()
      .single();

    if (error || !data) {
      toast.error("Error al crear usuario");
      setSaving(false);
      return;
    }
    setUsers((prev) => [...prev, data as User]);
    setUserForm(EMPTY_USER_FORM);
    setDrawerOpen(false);
    setSaving(false);
    toast.success("Usuario creado — podrá entrar con su cuenta de Google");
  }

  // ── Eliminar usuario ──────────────────────────────────────────────────────
  async function deleteUser(userId: string) {
    if (!confirm("¿Eliminar este usuario? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("users").delete().eq("id", userId);
    if (error) { toast.error("Error al eliminar usuario"); return; }
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    setMemberships((prev) => prev.filter((m) => m.user_id !== userId));
    setMemberClients((prev) => prev.filter((mc) => mc.user_id !== userId));
    toast.success("Usuario eliminado");
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function getUserProjects(userId: string) {
    return memberships
      .filter((m) => m.user_id === userId)
      .map((m) => projects.find((p) => p.id === m.project_id))
      .filter(Boolean) as Project[];
  }

  function getAvailableProjects(userId: string) {
    const assigned = memberships.filter((m) => m.user_id === userId).map((m) => m.project_id);
    return projects.filter((p) => !assigned.includes(p.id));
  }

  function isClientAssigned(userId: string, projectId: string, clientId: string) {
    return memberClients.some(
      (mc) => mc.user_id === userId && mc.project_id === projectId && mc.client_id === clientId
    );
  }

  return (
    <>
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-3xl space-y-2">

        {/* Botón nuevo usuario */}
        <div className="mb-4">
          <button
            onClick={() => { setUserForm(EMPTY_USER_FORM); setDrawerOpen(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo usuario
          </button>
        </div>

        {users.map((user) => {
          const roleCfg = ROLE_CONFIG[user.role] ?? ROLE_CONFIG.collaborator;
          const userProjects = getUserProjects(user.id);
          const available = getAvailableProjects(user.id);
          const isExpanded = expandedUser === user.id;
          const isRoleOpen = roleOpen === user.id;

          return (
            <div key={user.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">

              {/* ── Fila principal ─────────────────────────────────── */}
              <div className="flex items-center gap-3 px-4 py-3">
                <Avatar className="w-8 h-8 shrink-0">
                  <AvatarImage src={user.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-violet-100 text-violet-600 text-xs">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{user.full_name ?? "Sin nombre"}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>

                {/* Proyectos (badges resumen) */}
                <div className="hidden sm:flex items-center gap-1.5 flex-wrap justify-end max-w-[180px]">
                  {userProjects.slice(0, 3).map((p) => (
                    <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                      style={{ backgroundColor: p.color + "22", color: p.color }}>
                      {p.name}
                    </span>
                  ))}
                  {userProjects.length > 3 && (
                    <span className="text-[10px] text-gray-400">+{userProjects.length - 3}</span>
                  )}
                </div>

                {/* Selector de rol */}
                <div className="relative">
                  <button
                    onClick={() => setRoleOpen(isRoleOpen ? null : user.id)}
                    className={cn(
                      "flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-full border transition-colors",
                      roleCfg.color
                    )}
                  >
                    {roleCfg.icon}
                    {roleCfg.label}
                    <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>

                  {isRoleOpen && (
                    <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden w-44">
                      {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG.admin][]).map(([key, cfg]) => (
                        <button
                          key={key}
                          onClick={() => changeRole(user.id, key)}
                          className={cn(
                            "w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                            user.role === key ? "text-gray-900" : "text-gray-500"
                          )}
                        >
                          {cfg.icon}
                          {cfg.label}
                          {user.role === key && <Check className="w-3 h-3 ml-auto text-violet-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Eliminar usuario */}
                <button
                  onClick={() => deleteUser(user.id)}
                  className="p-1.5 rounded-md hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors"
                  title="Eliminar usuario"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Expandir */}
                <button
                  onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                  className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                </button>
              </div>

              {/* ── Panel expandido ────────────────────────────────── */}
              {isExpanded && (
                <div className="border-t border-gray-200 divide-y divide-gray-100">

                  {/* Proyectos asignados + clientes por proyecto */}
                  {userProjects.length > 0 && (
                    <div className="px-4 py-3 space-y-3">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        Proyectos y clientes asignados
                      </p>

                      {userProjects.map((project) => {
                        const projectClients = clientsByProject[project.id] ?? [];

                        return (
                          <div key={project.id} className="space-y-2">
                            {/* Nombre del proyecto */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                                <span className="text-xs font-medium text-gray-700">{project.name}</span>
                              </div>
                              <button
                                onClick={() => removeFromProject(user.id, project.id)}
                                className="text-[10px] text-gray-300 hover:text-red-500 transition-colors flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Quitar del proyecto
                              </button>
                            </div>

                            {/* Clientes del proyecto */}
                            {projectClients.length > 0 ? (
                              <div className="ml-4 flex flex-wrap gap-1.5">
                                {projectClients.map((client) => {
                                  const assigned = isClientAssigned(user.id, project.id, client.id);
                                  return (
                                    <button
                                      key={client.id}
                                      onClick={() =>
                                        assigned
                                          ? unassignClient(user.id, project.id, client.id)
                                          : assignClient(user.id, project.id, client.id)
                                      }
                                      className={cn(
                                        "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border transition-all",
                                        assigned
                                          ? "border-current font-medium"
                                          : "border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600"
                                      )}
                                      style={assigned ? {
                                        backgroundColor: client.color + "20",
                                        borderColor: client.color + "60",
                                        color: client.color,
                                      } : {}}
                                    >
                                      <span
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: assigned ? client.color : undefined }}
                                      />
                                      {client.name}
                                      {assigned && <Check className="w-2.5 h-2.5 ml-0.5" />}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="ml-4 text-[11px] text-gray-300 italic">Sin clientes en este proyecto</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Agregar a más proyectos */}
                  {available.length > 0 && (
                    <div className="px-4 py-3 space-y-2">
                      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                        Agregar a proyecto
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {available.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => addToProject(user.id, p.id)}
                            className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {userProjects.length === 0 && available.length === 0 && (
                    <div className="px-4 py-3">
                      <p className="text-xs text-gray-400 italic">Sin proyectos disponibles</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>

      {/* ── Drawer nuevo usuario ─────────────────────────────────────── */}
      {drawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-30" onClick={() => setDrawerOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white border-l border-gray-200 z-40 flex flex-col shadow-2xl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-violet-600" />
                <h2 className="text-sm font-semibold text-gray-900">Nuevo usuario</h2>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cuerpo */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Aviso */}
              <div className="flex gap-2.5 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <Mail className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  El colaborador podrá ingresar usando <strong>Google Sign-In</strong> con el email que registres aquí. Si el email no coincide con su cuenta de Google, no podrá acceder.
                </p>
              </div>

              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">Nombre completo *</label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm((f) => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ej. Ana García"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">Email de Google *</label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="colaborador@gmail.com"
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 transition-colors"
                />
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-gray-600">Rol</label>
                <div className="space-y-2">
                  {(Object.entries(ROLE_CONFIG) as [string, typeof ROLE_CONFIG.admin][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setUserForm((f) => ({ ...f, role: key }))}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all text-left",
                        userForm.role === key
                          ? "border-violet-300 bg-violet-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      )}
                    >
                      <span className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border",
                        cfg.color
                      )}>
                        {cfg.icon}
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-500 flex-1">
                        {key === "admin" && "Acceso total, gestión de usuarios y configuración"}
                        {key === "project_manager" && "Gestiona proyectos, tareas y clientes"}
                        {key === "collaborator" && "Ve y trabaja en las tareas asignadas"}
                      </span>
                      {userForm.role === key && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 px-5 py-3 flex items-center justify-end gap-2">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={createUser}
                disabled={saving}
                className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium transition-colors"
              >
                {saving ? "Creando…" : "Crear usuario"}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
