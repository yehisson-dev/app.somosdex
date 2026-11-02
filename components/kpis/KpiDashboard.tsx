"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, TrendingUp,
  ChevronLeft, ChevronRight, BarChart2, Edit3, X, Loader2,
  Users, Target, Repeat2, Video, Palette, FileText, CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserKpi {
  id: string; full_name: string; email: string; job_title: string; avatar_url?: string;
  tasks: {
    total: number; delivered: number; on_time: number; late: number;
    pct_on_time: number | null; avg_revisions: number | null;
    over_revision_limit: number; brief_reprocesos: number;
    piezas_graficas: number; videos: number; calendarios: number; reportes: number;
    brand_approved: number; brand_rejected: number;
  };
  social: {
    avg_retention_3s: number | null; videos_with_brand_id: number | null;
    total_videos: number | null; avg_saves: number | null;
    avg_comments: number | null; authority_pieces: number | null;
    total_pieces: number | null; escalations_to_director: number | null;
    notes: string | null; id: string | null;
  };
}

// ─── Role config ─────────────────────────────────────────────────────────────
const ROLE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  "Coordinadora":    { label: "Project Manager", color: "text-violet-700", bg: "bg-violet-100", icon: <Users className="w-4 h-4" /> },
  "Project Manager": { label: "Project Manager", color: "text-violet-700", bg: "bg-violet-100", icon: <Users className="w-4 h-4" /> },
  "Content Creator": { label: "Content Creator", color: "text-blue-700",   bg: "bg-blue-100",   icon: <FileText className="w-4 h-4" /> },
  "Diseñadora":      { label: "Diseñadora",       color: "text-pink-700",  bg: "bg-pink-100",   icon: <Palette className="w-4 h-4" /> },
  "Diseñador":       { label: "Diseñador",         color: "text-pink-700",  bg: "bg-pink-100",   icon: <Palette className="w-4 h-4" /> },
  "Editor Videos":   { label: "Editor de Video",  color: "text-amber-700", bg: "bg-amber-100",  icon: <Video className="w-4 h-4" /> },
};

// ─── Targets per role ─────────────────────────────────────────────────────────
const TARGETS: Record<string, Record<string, number>> = {
  "Coordinadora":    { pct_on_time: 95, reportes: 1, onboarding_days: 7 },
  "Project Manager": { pct_on_time: 95, reportes: 1 },
  "Content Creator": { calendarios: 1, brief_reprocesos: 0 },
  "Diseñadora":      { piezas_graficas: 84, avg_revisions: 2, brand_rejected: 0 },
  "Diseñador":       { piezas_graficas: 84, avg_revisions: 2, brand_rejected: 0 },
  "Editor Videos":   { avg_revisions: 2, avg_retention_3s: 40 },
};

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ─── Semaphore helper ─────────────────────────────────────────────────────────
function semaphore(value: number | null, target: number, higherIsBetter = true): "green" | "yellow" | "red" | "gray" {
  if (value === null) return "gray";
  if (higherIsBetter) {
    if (value >= target) return "green";
    if (value >= target * 0.8) return "yellow";
    return "red";
  } else {
    if (value <= target) return "green";
    if (value <= target * 1.5) return "yellow";
    return "red";
  }
}

const SEMAPHORE_STYLES = {
  green:  "text-emerald-600 bg-emerald-50 border-emerald-200",
  yellow: "text-amber-600 bg-amber-50 border-amber-200",
  red:    "text-red-600 bg-red-50 border-red-200",
  gray:   "text-gray-400 bg-gray-50 border-gray-200",
};

const SEMAPHORE_DOT = {
  green:  "bg-emerald-500",
  yellow: "bg-amber-400",
  red:    "bg-red-500",
  gray:   "bg-gray-300",
};

// ─── KPI Chip ─────────────────────────────────────────────────────────────────
function KpiChip({ label, value, unit = "", status }: {
  label: string; value: string | number | null; unit?: string; status: "green"|"yellow"|"red"|"gray";
}) {
  return (
    <div className={cn("flex flex-col gap-1 border rounded-xl px-3 py-2.5", SEMAPHORE_STYLES[status])}>
      <div className="flex items-center gap-1.5">
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", SEMAPHORE_DOT[status])} />
        <span className="text-[10px] uppercase tracking-wide font-medium opacity-70 leading-none">{label}</span>
      </div>
      <span className="text-base font-bold leading-none">
        {value === null ? "—" : `${value}${unit}`}
      </span>
    </div>
  );
}

// ─── User Card ────────────────────────────────────────────────────────────────
function UserKpiCard({ user, onEditSocial, onShowLate }: {
  user: UserKpi;
  onEditSocial: (u: UserKpi) => void;
  onShowLate: (u: UserKpi) => void;
}) {
  const rc = ROLE_CONFIG[user.job_title] ?? { label: user.job_title, color: "text-gray-700", bg: "bg-gray-100", icon: <Users className="w-4 h-4" /> };
  const t  = TARGETS[user.job_title] ?? {};

  const initials = (user.full_name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  // Build KPI chips based on role
  const chips: Array<{ label: string; value: string|number|null; unit?: string; status: "green"|"yellow"|"red"|"gray" }> = [];

  if (t.pct_on_time !== undefined) {
    chips.push({ label: "Entregas a tiempo", value: user.tasks.pct_on_time, unit: "%", status: semaphore(user.tasks.pct_on_time, t.pct_on_time) });
  }
  if (t.piezas_graficas !== undefined) {
    chips.push({ label: "Piezas gráficas", value: user.tasks.piezas_graficas, status: semaphore(user.tasks.piezas_graficas, t.piezas_graficas) });
  }
  if (t.avg_revisions !== undefined) {
    chips.push({ label: "Rondas prom.", value: user.tasks.avg_revisions, status: semaphore(user.tasks.avg_revisions, t.avg_revisions, false) });
    if (user.tasks.over_revision_limit > 0) {
      chips.push({ label: "+2 rondas", value: user.tasks.over_revision_limit, status: user.tasks.over_revision_limit > 0 ? "red" : "green" });
    }
  }
  if (t.brand_rejected !== undefined) {
    chips.push({ label: "Fuera de marca", value: user.tasks.brand_rejected, status: user.tasks.brand_rejected === 0 ? "green" : "red" });
  }
  if (t.calendarios !== undefined) {
    chips.push({ label: "Calendarios", value: user.tasks.calendarios, status: semaphore(user.tasks.calendarios, t.calendarios) });
  }
  if (t.brief_reprocesos !== undefined) {
    chips.push({ label: "Reprocesos brief", value: user.tasks.brief_reprocesos, status: user.tasks.brief_reprocesos === 0 ? "green" : "red" });
  }
  if (t.avg_retention_3s !== undefined) {
    chips.push({ label: "Retención 3s", value: user.social.avg_retention_3s, unit: "%", status: semaphore(user.social.avg_retention_3s, t.avg_retention_3s) });
  }
  if (t.reportes !== undefined) {
    chips.push({ label: "Reportes", value: user.tasks.reportes, status: semaphore(user.tasks.reportes, t.reportes) });
  }

  // Overall health
  const greenCount  = chips.filter(c => c.status === "green").length;
  const redCount    = chips.filter(c => c.status === "red").length;
  const grayCount   = chips.filter(c => c.status === "gray").length;
  const overall = grayCount === chips.length ? "gray" : redCount > 0 ? (redCount >= 2 ? "red" : "yellow") : "green";

  const overallLabel: Record<string, string> = { green: "En meta", yellow: "Con alertas", red: "Fuera de meta", gray: "Sin datos" };
  const overallStyle: Record<string, string> = {
    green:  "bg-emerald-100 text-emerald-700 border-emerald-200",
    yellow: "bg-amber-100 text-amber-700 border-amber-200",
    red:    "bg-red-100 text-red-700 border-red-200",
    gray:   "bg-gray-100 text-gray-500 border-gray-200",
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full object-cover" />
          ) : (
            <div className={cn("w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold", rc.bg, rc.color)}>
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{user.full_name}</p>
            <div className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full mt-0.5", rc.bg, rc.color)}>
              {rc.icon} {rc.label}
            </div>
          </div>
          <div className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", overallStyle[overall])}>
            {overallLabel[overall]}
          </div>
        </div>
      </div>

      {/* Task summary row */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-100 text-center">
        {[
          { label: "Tareas",     val: user.tasks.total,     clickable: false },
          { label: "Entregadas", val: user.tasks.delivered, clickable: false },
          { label: "A tiempo",   val: user.tasks.on_time,   clickable: false },
          { label: "Tarde",      val: user.tasks.late,      clickable: true  },
        ].map(({ label, val, clickable }) => (
          clickable && val > 0 ? (
            <button key={label} onClick={() => onShowLate(user)}
              className="py-3 hover:bg-red-50 transition-colors group cursor-pointer">
              <p className="text-base font-bold text-red-500 group-hover:text-red-600">{val}</p>
              <p className="text-[10px] text-red-400 group-hover:text-red-500 underline decoration-dotted">{label}</p>
            </button>
          ) : (
            <div key={label} className="py-3">
              <p className={cn("text-base font-bold", label === "Tarde" && val === 0 ? "text-emerald-600" : "text-gray-900")}>{val}</p>
              <p className="text-[10px] text-gray-400">{label}</p>
            </div>
          )
        ))}
      </div>

      {/* KPI chips */}
      <div className="p-4">
        {chips.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-3">Sin indicadores configurados para este rol</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {chips.map((chip, i) => (
              <KpiChip key={i} {...chip} />
            ))}
          </div>
        )}

        {/* Social metrics hint */}
        {(user.job_title === "Editor Videos" || user.job_title === "Content Creator") && (
          <button
            onClick={() => onEditSocial(user)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 border border-dashed border-gray-200 hover:border-violet-300 rounded-xl py-2 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            {user.social.id ? "Editar métricas de redes" : "Ingresar métricas de redes"}
          </button>
        )}
        {user.job_title === "Coordinadora" || user.job_title === "Project Manager" ? (
          <button
            onClick={() => onEditSocial(user)}
            className="mt-3 w-full flex items-center justify-center gap-1.5 text-xs text-gray-400 hover:text-violet-600 border border-dashed border-gray-200 hover:border-violet-300 rounded-xl py-2 transition-colors"
          >
            <Edit3 className="w-3 h-3" />
            {user.social.id ? "Editar métricas adicionales" : "Registrar escalaciones / notas"}
          </button>
        ) : null}
      </div>

      {/* Notes */}
      {user.social.notes && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 bg-gray-50 rounded-lg px-3 py-2 italic">"{user.social.notes}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Social Metrics Modal ─────────────────────────────────────────────────────
function SocialMetricsModal({ user, month, year, onClose, onSaved }: {
  user: UserKpi; month: number; year: number; onClose: () => void; onSaved: (u: UserKpi) => void;
}) {
  const isEditor  = user.job_title === "Editor Videos";
  const isCreator = user.job_title === "Content Creator";
  const isPM      = user.job_title === "Coordinadora" || user.job_title === "Project Manager";

  const [form, setForm] = useState({
    avg_retention_3s:     user.social.avg_retention_3s ?? "",
    videos_with_brand_id: user.social.videos_with_brand_id ?? "",
    total_videos:         user.social.total_videos ?? "",
    avg_saves:            user.social.avg_saves ?? "",
    avg_comments:         user.social.avg_comments ?? "",
    authority_pieces:     user.social.authority_pieces ?? "",
    total_pieces:         user.social.total_pieces ?? "",
    escalations_to_director: user.social.escalations_to_director ?? "",
    notes:                user.social.notes ?? "",
  });
  const [saving, setSaving] = useState(false);

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })); }
  const n = (v: string | number) => v === "" ? null : Number(v);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/kpis/social", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: user.id, month, year,
        avg_retention_3s:     n(form.avg_retention_3s),
        videos_with_brand_id: n(form.videos_with_brand_id),
        total_videos:         n(form.total_videos),
        avg_saves:            n(form.avg_saves),
        avg_comments:         n(form.avg_comments),
        authority_pieces:     n(form.authority_pieces),
        total_pieces:         n(form.total_pieces),
        escalations_to_director: n(form.escalations_to_director),
        notes: form.notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      const saved = await res.json();
      onSaved({ ...user, social: { ...user.social, ...saved, id: saved.id } });
      toast.success("Métricas guardadas");
      onClose();
    } else {
      toast.error("Error al guardar");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Métricas de redes — {MONTHS[month - 1]} {year}</p>
            <h2 className="text-sm font-semibold text-gray-900">{user.full_name}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {isEditor && (<>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Editor de Video</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Retención prom. 3s (%)" value={form.avg_retention_3s} onChange={v => set("avg_retention_3s", v)} type="number" placeholder="40" hint="Meta: 40%+" />
              <Field label="Videos con identidad de marca" value={form.videos_with_brand_id} onChange={v => set("videos_with_brand_id", v)} type="number" placeholder="0" />
              <Field label="Total videos entregados" value={form.total_videos} onChange={v => set("total_videos", v)} type="number" placeholder="0" />
            </div>
          </>)}

          {isCreator && (<>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Content Creator</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prom. guardados/pieza" value={form.avg_saves} onChange={v => set("avg_saves", v)} type="number" placeholder="0" hint="Piezas de autoridad" />
              <Field label="Prom. comentarios/pieza" value={form.avg_comments} onChange={v => set("avg_comments", v)} type="number" placeholder="0" />
              <Field label="Piezas de autoridad" value={form.authority_pieces} onChange={v => set("authority_pieces", v)} type="number" placeholder="0" />
              <Field label="Total piezas publicadas" value={form.total_pieces} onChange={v => set("total_pieces", v)} type="number" placeholder="0" />
            </div>
          </>)}

          {isPM && (<>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Project Manager</p>
            <Field label="Escalaciones al Director" value={form.escalations_to_director} onChange={v => set("escalations_to_director", v)} type="number" placeholder="0" hint="Meta: 0" />
          </>)}

          <div>
            <label className="block text-xs text-gray-500 mb-1">Notas del mes</label>
            <textarea
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              rows={3}
              placeholder="Observaciones, contexto, logros especiales…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-violet-400 resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2 text-sm text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50">Cancelar</button>
          <button onClick={save} disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-medium py-2 rounded-xl transition-colors">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, hint }: {
  label: string; value: string|number; onChange: (v: string) => void;
  type?: string; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-violet-400"
      />
      {hint && <p className="text-[10px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function KpiDashboard({ embedded = false }: { embedded?: boolean }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());
  const [users, setUsers] = useState<UserKpi[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<UserKpi | null>(null);
  const [lateUser, setLateUser] = useState<UserKpi | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/kpis?month=${month}&year=${year}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }, [month, year]);

  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function onSocialSaved(updated: UserKpi) {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditUser(null);
  }

  // Overall team health
  const withData   = users.filter(u => u.tasks.total > 0 || u.social.id);
  const allGreen   = withData.every(u => {
    const t = TARGETS[u.job_title] ?? {};
    if (t.pct_on_time && u.tasks.pct_on_time !== null && u.tasks.pct_on_time < t.pct_on_time) return false;
    if (t.avg_revisions && u.tasks.avg_revisions !== null && u.tasks.avg_revisions > t.avg_revisions) return false;
    if (t.brand_rejected !== undefined && u.tasks.brand_rejected > 0) return false;
    return true;
  });

  return (
    <div className={embedded ? "w-full" : "flex-1 overflow-y-auto p-6"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-gray-900">KPIs del Equipo</h1>
          <p className="text-sm text-gray-400">Indicadores de productividad por colaborador</p>
        </div>

        {/* Month navigator */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
          <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-36 text-center">
            {MONTHS[month - 1]} {year}
          </span>
          <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Team health banner */}
      {withData.length > 0 && (
        <div className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 mb-6 border text-sm font-medium",
          allGreen
            ? "bg-emerald-50 border-emerald-200 text-emerald-700"
            : "bg-amber-50 border-amber-200 text-amber-700"
        )}>
          {allGreen ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {allGreen
            ? `Equipo en meta — todos los indicadores medidos están dentro del rango esperado para ${MONTHS[month-1]}.`
            : `Hay alertas en el equipo este mes. Revisa los indicadores en rojo.`
          }
        </div>
      )}

      {/* Cards */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">Sin colaboradores configurados</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map(u => (
            <UserKpiCard key={u.id} user={u} onEditSocial={setEditUser} onShowLate={setLateUser} />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="mt-8 flex flex-wrap gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" />En meta</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Cerca del límite</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Fuera de meta</div>
        <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-gray-300" />Sin datos del mes</div>
        <span className="text-gray-300">|</span>
        <span>Las tareas se cuentan por fecha de vencimiento dentro del mes seleccionado.</span>
      </div>

      {/* Social Modal */}
      {editUser && (
        <SocialMetricsModal
          user={editUser}
          month={month} year={year}
          onClose={() => setEditUser(null)}
          onSaved={onSocialSaved}
        />
      )}

      {/* Late Tasks Modal */}
      {lateUser && (
        <LateTasksModal
          user={lateUser}
          month={month} year={year}
          onClose={() => setLateUser(null)}
        />
      )}
    </div>
  );
}

// ─── Late Tasks Modal ──────────────────────────────────────────────────────────
function LateTasksModal({ user, month, year, onClose }: {
  user: UserKpi; month: number; year: number; onClose: () => void;
}) {
  const [tasks, setTasks]   = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/kpis/late-tasks?user_id=${user.id}&month=${month}&year=${year}`)
      .then(r => r.json())
      .then(d => { setTasks(d.tasks ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [user.id, month, year]);

  const PRIORITY_COLORS: Record<string, string> = {
    urgent: "bg-red-100 text-red-600",
    high:   "bg-orange-100 text-orange-600",
    medium: "bg-blue-100 text-blue-700",
    low:    "bg-gray-100 text-gray-500",
  };
  const PRIORITY_LABELS: Record<string, string> = {
    urgent: "Urgente", high: "Alta", medium: "Media", low: "Baja",
  };

  function daysLate(due: string, completedDate?: string) {
    const ref = completedDate ?? new Date().toISOString().slice(0, 10);
    const diff = Math.floor((new Date(ref + "T00:00:00").getTime() - new Date(due + "T00:00:00").getTime()) / 86_400_000);
    return diff;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-xs text-gray-400">{MONTHS[month - 1]} {year}</p>
            <h2 className="text-sm font-semibold text-gray-900">
              Tareas tarde — {user.full_name}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No hay tareas tarde para este mes</p>
          ) : (
            <div className="space-y-2">
              {tasks.map(task => {
                const days = daysLate(task.due_date, task.completion_state === "done" ? task.completed_date : undefined);
                const isDone = task.completion_state === "done";
                return (
                  <a key={task.id} href={`/tareas/${task.id}`}
                    className="flex items-start gap-3 border border-gray-200 rounded-xl px-4 py-3 hover:border-red-200 hover:bg-red-50/40 transition-all group">
                    {/* Status dot */}
                    <span className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ backgroundColor: task.status_color ?? "#e5e7eb" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-red-700 truncate">
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {task.client && (
                          <span className="flex items-center gap-1 text-xs text-gray-400">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.client.color }} />
                            {task.client.name}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">{task.status_name}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium block",
                        PRIORITY_COLORS[task.priority] ?? PRIORITY_COLORS.medium)}>
                        {PRIORITY_LABELS[task.priority] ?? task.priority}
                      </span>
                      <span className={cn("text-[10px] font-semibold block",
                        isDone ? "text-orange-500" : "text-red-500")}>
                        {isDone ? `Entregó ${days}d tarde` : `${days}d atrasada`}
                      </span>
                      <span className="text-[10px] text-gray-400 block">
                        Venció {task.due_date}
                      </span>
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
