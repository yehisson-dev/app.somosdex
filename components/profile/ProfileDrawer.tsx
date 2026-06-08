"use client";

import { useState, useRef, useEffect } from "react";
import {
  X, Camera, Loader2, Check, User, Briefcase, Mail,
  Globe, Phone, MapPin, Building2, LayoutDashboard,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "next-auth/react";
import { useAppStore, type WorkspaceSettings } from "@/store/useAppStore";
import type { User as UserType } from "@/types/database";

interface Props {
  open: boolean;
  onClose: () => void;
  user: UserType;
  onSaved: (updated: Partial<UserType>) => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Administrador",
  project_manager: "Project Manager",
  collaborator: "Colaborador",
};

export function ProfileDrawer({ open, onClose, user, onSaved }: Props) {
  const { update: updateSession } = useSession();
  const supabase = createClient();
  const avatarFileRef  = useRef<HTMLInputElement>(null);
  const logoFileRef    = useRef<HTMLInputElement>(null);

  const isAdmin = user.role === "admin";
  const [tab, setTab] = useState<"profile" | "workspace">("profile");

  // ── Profile state ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [jobTitle, setJobTitle] = useState(user.job_title ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user.avatar_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [error, setError]         = useState("");

  // ── Workspace state ──────────────────────────────────────────────────────────
  const { workspaceSettings, setWorkspaceSettings } = useAppStore();
  const [ws, setWs]           = useState<WorkspaceSettings | null>(null);
  const [wsDraft, setWsDraft] = useState({
    platform_name: "",
    company_name: "",
    company_email: "",
    company_phone: "",
    company_website: "",
    company_address: "",
    logo_url: "",
  });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingWs, setSavingWs]           = useState(false);
  const [savedWs, setSavedWs]             = useState(false);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setFullName(user.full_name ?? "");
    setJobTitle(user.job_title ?? "");
    setAvatarUrl(user.avatar_url ?? "");
    setError(""); setSaved(false);

    // Load workspace settings
    if (isAdmin) {
      async function loadWs() {
        const { data } = await supabase
          .from("workspace_settings")
          .select("*")
          .limit(1)
          .single();
        if (data) {
          const s = data as WorkspaceSettings;
          setWs(s);
          setWsDraft({
            platform_name:   s.platform_name ?? "Cowork Agency",
            company_name:    s.company_name ?? "",
            company_email:   s.company_email ?? "",
            company_phone:   s.company_phone ?? "",
            company_website: s.company_website ?? "",
            company_address: s.company_address ?? "",
            logo_url:        s.logo_url ?? "",
          });
        }
      }
      loadWs();
    }
  }, [open, user]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [open, onClose]);

  // ── Avatar upload ────────────────────────────────────────────────────────────
  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      const ext  = file.name.split(".").pop();
      const path = `${user.id}.${ext}`;
      const { error: err } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
      if (err) throw err;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
    } catch { setError("Error al subir la imagen."); }
    finally { setUploading(false); }
  }

  // ── Profile save ─────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!fullName.trim()) { setError("El nombre es requerido."); return; }
    setSaving(true); setError("");
    const { error: dbErr } = await supabase.from("users").update({
      full_name: fullName.trim(),
      job_title: jobTitle.trim() || null,
      avatar_url: avatarUrl || null,
    } as any).eq("id", user.id);
    if (dbErr) { setError("Error al guardar."); setSaving(false); return; }
    await updateSession();
    onSaved({ full_name: fullName.trim(), job_title: jobTitle.trim() || null, avatar_url: avatarUrl || null });
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // ── Workspace logo upload ────────────────────────────────────────────────────
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingLogo(true);
    const ext  = file.name.split(".").pop();
    const path = `logo.${ext}`;
    const { error: err } = await supabase.storage.from("workspace").upload(path, file, { upsert: true });
    if (err) { setUploadingLogo(false); return; }
    const { data } = supabase.storage.from("workspace").getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;
    setWsDraft((d) => ({ ...d, logo_url: url }));
    setUploadingLogo(false);
  }

  // ── Workspace save ───────────────────────────────────────────────────────────
  async function handleSaveWorkspace() {
    if (!wsDraft.platform_name.trim()) return;
    setSavingWs(true);
    const payload = {
      platform_name:   wsDraft.platform_name.trim(),
      company_name:    wsDraft.company_name.trim() || null,
      company_email:   wsDraft.company_email.trim() || null,
      company_phone:   wsDraft.company_phone.trim() || null,
      company_website: wsDraft.company_website.trim() || null,
      company_address: wsDraft.company_address.trim() || null,
      logo_url:        wsDraft.logo_url || null,
      updated_at:      new Date().toISOString(),
    };
    const { data, error: err } = ws?.id
      ? await supabase.from("workspace_settings").update(payload as any).eq("id", ws.id).select().single()
      : await supabase.from("workspace_settings").insert(payload as any).select().single();
    if (!err && data) {
      const updated = data as WorkspaceSettings;
      setWs(updated);
      setWorkspaceSettings(updated);
    }
    setSavingWs(false); setSavedWs(true);
    setTimeout(() => setSavedWs(false), 2000);
  }

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-full max-w-sm bg-white shadow-xl z-50 flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-900">Configuración</h2>
          <button onClick={onClose}
            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-4 gap-0 shrink-0">
          <TabBtn active={tab === "profile"} onClick={() => setTab("profile")}>
            <User className="w-3.5 h-3.5" /> Mi perfil
          </TabBtn>
          {isAdmin && (
            <TabBtn active={tab === "workspace"} onClick={() => setTab("workspace")}>
              <LayoutDashboard className="w-3.5 h-3.5" /> Plataforma
            </TabBtn>
          )}
        </div>

        {/* ── Tab: Mi perfil ─────────────────────────────────────────────────── */}
        {tab === "profile" && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Avatar */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative">
                  <Avatar className="w-20 h-20">
                    <AvatarImage src={avatarUrl || undefined} />
                    <AvatarFallback className="bg-violet-100 text-violet-600 text-2xl font-semibold">
                      {getInitials(fullName || user.email)}
                    </AvatarFallback>
                  </Avatar>
                  <button onClick={() => avatarFileRef.current?.click()} disabled={uploading}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md transition-colors disabled:opacity-50">
                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input ref={avatarFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleAvatarUpload} />
                </div>
                <p className="text-[10px] text-gray-400">JPG, PNG, WEBP — máx. 5 MB</p>
              </div>

              <div className="space-y-3">
                <Field label="Nombre completo" icon={<User className="w-3.5 h-3.5" />}>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                    placeholder="Tu nombre completo"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Cargo / Rol" icon={<Briefcase className="w-3.5 h-3.5" />}>
                  <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="ej. Diseñador, Copywriter…"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Email" icon={<Mail className="w-3.5 h-3.5" />}>
                  <input type="email" value={user.email} readOnly
                    className="w-full px-3 py-2 text-sm border border-gray-100 rounded-lg bg-gray-50 text-gray-400 cursor-not-allowed" />
                  <p className="text-[10px] text-gray-400 mt-1">Vinculado a tu cuenta de Google.</p>
                </Field>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Rol en el sistema</label>
                  <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-100 rounded-lg">
                    <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                    <span className="text-sm text-violet-700 font-medium">{ROLE_LABELS[user.role] ?? user.role}</span>
                  </div>
                </div>
              </div>

              {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <button onClick={handleSave} disabled={saving || uploading}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  saved ? "bg-green-500 text-white" : "bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                )}>
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                  : saved ? <><Check className="w-4 h-4" /> ¡Guardado!</>
                  : "Guardar cambios"}
              </button>
            </div>
          </>
        )}

        {/* ── Tab: Plataforma ──────────────────────────────────────────────────── */}
        {tab === "workspace" && isAdmin && (
          <>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* Logo de la plataforma */}
              <div className="flex flex-col items-center gap-3 pt-2">
                <div className="relative group">
                  <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50 flex items-center justify-center overflow-hidden">
                    {wsDraft.logo_url ? (
                      <img src={wsDraft.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <LayoutDashboard className="w-8 h-8 text-violet-300" />
                        <span className="text-[9px] text-violet-300 font-medium">Logo</span>
                      </div>
                    )}
                  </div>
                  <button onClick={() => logoFileRef.current?.click()} disabled={uploadingLogo}
                    className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center shadow-md transition-colors">
                    {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input ref={logoFileRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                </div>
                <p className="text-[10px] text-gray-400">Logo de la plataforma — PNG, SVG recomendado</p>
                {wsDraft.logo_url && (
                  <button onClick={() => setWsDraft((d) => ({ ...d, logo_url: "" }))}
                    className="text-[11px] text-red-400 hover:text-red-600 transition-colors">
                    Quitar logo
                  </button>
                )}
              </div>

              <div className="space-y-3">
                {/* Platform name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                    <LayoutDashboard className="w-3.5 h-3.5 text-violet-500" /> Nombre de la plataforma
                  </label>
                  <input
                    type="text"
                    value={wsDraft.platform_name}
                    onChange={(e) => setWsDraft((d) => ({ ...d, platform_name: e.target.value }))}
                    placeholder="Cowork Agency"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition font-medium"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Aparece en el sidebar y el navegador.</p>
                </div>

                <div className="pt-1 pb-0.5">
                  <div className="h-px bg-gray-100" />
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mt-3 mb-2">Datos de la empresa</p>
                </div>

                <Field label="Nombre de la empresa" icon={<Building2 className="w-3.5 h-3.5" />}>
                  <input type="text" value={wsDraft.company_name}
                    onChange={(e) => setWsDraft((d) => ({ ...d, company_name: e.target.value }))}
                    placeholder="Tu empresa S.A."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Email de contacto" icon={<Mail className="w-3.5 h-3.5" />}>
                  <input type="email" value={wsDraft.company_email}
                    onChange={(e) => setWsDraft((d) => ({ ...d, company_email: e.target.value }))}
                    placeholder="hola@empresa.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Teléfono" icon={<Phone className="w-3.5 h-3.5" />}>
                  <input type="text" value={wsDraft.company_phone}
                    onChange={(e) => setWsDraft((d) => ({ ...d, company_phone: e.target.value }))}
                    placeholder="+1 555 000 0000"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Sitio web" icon={<Globe className="w-3.5 h-3.5" />}>
                  <input type="url" value={wsDraft.company_website}
                    onChange={(e) => setWsDraft((d) => ({ ...d, company_website: e.target.value }))}
                    placeholder="https://empresa.com"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>

                <Field label="Dirección" icon={<MapPin className="w-3.5 h-3.5" />}>
                  <input type="text" value={wsDraft.company_address}
                    onChange={(e) => setWsDraft((d) => ({ ...d, company_address: e.target.value }))}
                    placeholder="Ciudad, País"
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition" />
                </Field>
              </div>
            </div>

            <div className="border-t border-gray-100 px-5 py-4">
              <button onClick={handleSaveWorkspace} disabled={savingWs || !wsDraft.platform_name.trim()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-colors",
                  savedWs ? "bg-green-500 text-white" : "bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-50"
                )}>
                {savingWs ? <><Loader2 className="w-4 h-4 animate-spin" /> Guardando…</>
                  : savedWs ? <><Check className="w-4 h-4" /> ¡Guardado!</>
                  : "Guardar configuración"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
        active ? "text-violet-600 border-violet-500" : "text-gray-400 border-transparent hover:text-gray-600"
      )}
    >
      {children}
    </button>
  );
}

function Field({ label, icon, children }: { label: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5 flex items-center gap-1.5">
        <span className="text-gray-400">{icon}</span> {label}
      </label>
      {children}
    </div>
  );
}
