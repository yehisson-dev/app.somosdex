"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronDown,
  ChevronRight,
  CheckSquare,
  Clock,
  FolderKanban,
  LogOut,
  Users,
  Building2,
  MessageSquare,
  Settings,
  LayoutDashboard,
  Brain,
  Bot,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAppStore } from "@/store/useAppStore";
import { ProfileDrawer } from "@/components/profile/ProfileDrawer";
import type { Client, User } from "@/types/database";

const PROJECT_COLORS: Record<string, string> = {
  "social-media": "#8b5cf6",
  seo: "#3b82f6",
  ads: "#f59e0b",
  branding: "#ec4899",
  eventos: "#10b981",
};

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const {
    projects,
    setProjects,
    expandedProjects,
    toggleProjectExpanded,
    workspaceSettings,
    setWorkspaceSettings,
  } = useAppStore();

  const [profileOpen, setProfileOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    if (!session) return;
    fetch("/api/data/projects")
      .then((r) => r.json())
      .then(({ projects: data }) => {
        if (data) setProjects(data as any[]);
      })
      .catch(console.error);
  }, [session, setProjects]);

  useEffect(() => {
    if (!session || workspaceSettings) return;
    fetch("/api/data/workspace")
      .then((r) => r.json())
      .then(({ workspace }) => {
        if (workspace) setWorkspaceSettings(workspace as any);
      })
      .catch(console.error);
  }, [session, workspaceSettings, setWorkspaceSettings]);

  useEffect(() => {
    if (!session?.user?.email) return;
    fetch("/api/data/me")
      .then((r) => r.json())
      .then(({ user }) => {
        if (user) setCurrentUser(user as User);
      })
      .catch(console.error);
  }, [session?.user?.email]);

  const role = (session?.user as { role?: string })?.role;

  return (
    <>
      <aside className="flex flex-col w-60 min-h-screen bg-white border-r border-gray-200 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-4 h-14 border-b border-gray-200">
          <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center shrink-0 overflow-hidden">
            {workspaceSettings?.logo_url ? (
              <img src={workspaceSettings.logo_url} alt="Logo" className="w-full h-full object-contain p-0.5" />
            ) : (
              <FolderKanban className="w-4 h-4 text-white" />
            )}
          </div>
          <span className="font-semibold text-sm text-gray-900 tracking-wide truncate">
            {workspaceSettings?.platform_name ?? "Cowork Agency"}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          <NavItem href="/mis-tareas"  icon={<CheckSquare   className="w-4 h-4" />} label="Mis tareas"     active={pathname === "/mis-tareas"} />
          <NavItem href="/pendientes"  icon={<Clock         className="w-4 h-4" />} label="Pendientes hoy" active={pathname === "/pendientes"} />
          <NavItemWithBadge href="/mensajes" icon={<MessageSquare className="w-4 h-4" />} label="Mensajes" active={pathname.startsWith("/mensajes")} />
          <NavItem href="/pizarras" icon={<LayoutDashboard className="w-4 h-4" />} label="Pizarras" active={pathname.startsWith("/pizarras")} />

          <div className="pt-3 pb-1 px-2">
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Proyectos</span>
          </div>

          {projects.map((project) => (
            <ProjectItem
              key={project.id}
              project={project}
              expanded={expandedProjects.includes(project.id)}
              onToggle={() => toggleProjectExpanded(project.id)}
              pathname={pathname}
            />
          ))}

          {role === "admin" && (
            <>
              <div className="pt-3 pb-1 px-2">
                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest">Administración</span>
              </div>
              <NavItem
                href="/clientes"
                icon={<Building2 className="w-4 h-4" />}
                label="Clientes"
                active={pathname.startsWith("/clientes")}
              />
              <NavItem
                href="/usuarios"
                icon={<Users className="w-4 h-4" />}
                label="Usuarios"
                active={pathname.startsWith("/usuarios")}
              />
              <NavItem
                href="/cerebro"
                icon={<Brain className="w-4 h-4" />}
                label="Cerebro"
                active={pathname.startsWith("/cerebro")}
              />
              <NavItem
                href="/agentes"
                icon={<Bot className="w-4 h-4" />}
                label="Agentes IA"
                active={pathname.startsWith("/agentes")}
              />
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setProfileOpen(true)}
              className="flex items-center gap-2.5 flex-1 min-w-0 rounded-md p-1 hover:bg-gray-100 transition-colors text-left group"
              title="Editar perfil"
            >
              <Avatar className="w-7 h-7 shrink-0">
                <AvatarImage src={currentUser?.avatar_url ?? session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-violet-100 text-violet-600 text-xs">
                  {getInitials(currentUser?.full_name ?? session?.user?.name ?? session?.user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-gray-900 truncate">
                  {currentUser?.full_name ?? session?.user?.name ?? session?.user?.email}
                </p>
                <p className="text-[10px] text-gray-400 capitalize">
                  {currentUser?.job_title ?? role}
                </p>
              </div>
              <Settings className="w-3 h-3 text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {currentUser && (
        <ProfileDrawer
          open={profileOpen}
          onClose={() => setProfileOpen(false)}
          user={currentUser}
          onSaved={(updated) => {
            setCurrentUser((prev) => prev ? { ...prev, ...updated } : prev);
            setProfileOpen(false);
          }}
        />
      )}
    </>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-violet-50 text-violet-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      )}
    >
      <span className={active ? "text-violet-600" : "text-gray-400"}>{icon}</span>
      {label}
    </Link>
  );
}

function NavItemWithBadge({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active: boolean }) {
  const totalUnread = useAppStore((s) => s.totalUnreadMessages);
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
        active
          ? "bg-violet-50 text-violet-700"
          : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      )}
    >
      <span className={active ? "text-violet-600" : "text-gray-400"}>{icon}</span>
      <span className="flex-1">{label}</span>
      {totalUnread > 0 && (
        <span className="ml-auto flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-violet-600 text-white text-[10px] font-semibold leading-none">
          {totalUnread > 9 ? "9+" : totalUnread}
        </span>
      )}
    </Link>
  );
}

function ProjectItem({
  project,
  expanded,
  onToggle,
  pathname,
}: {
  project: any;
  expanded: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const color = project.color ?? PROJECT_COLORS[project.slug] ?? "#6366f1";
  const rawClients: unknown[] = project.clients ?? [];
  const clients: Client[] = rawClients.map((c: any) =>
    c && typeof c === "object" && "client" in c ? (c as { client: Client }).client : (c as Client)
  ).filter(Boolean);
  const isActive = pathname.includes(`/proyectos/${project.id}`);

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-sm transition-colors text-left",
          isActive ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        )}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="flex-1 truncate">{project.name}</span>
        {clients.length > 0 && (
          expanded
            ? <ChevronDown className="w-3 h-3 text-gray-400 shrink-0" />
            : <ChevronRight className="w-3 h-3 text-gray-400 shrink-0" />
        )}
      </button>

      {expanded && clients.length > 0 && (
        <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
          {clients.map((client) => {
            const href = `/proyectos/${project.id}/${client.id}`;
            const clientActive = pathname === href;
            return (
              <Link
                key={client.id}
                href={href}
                className={cn(
                  "flex items-center gap-2 px-2 py-1 rounded text-xs transition-colors",
                  clientActive
                    ? "text-violet-700 bg-violet-50"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                )}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ backgroundColor: client.color }}
                />
                <span className="truncate">{client.name}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
