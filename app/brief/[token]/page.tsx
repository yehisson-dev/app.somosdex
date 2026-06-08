"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast, Toaster } from "sonner";
import { Send, CheckCircle2, Loader2, ChevronDown, ChevronRight } from "lucide-react";

// ─── Definición del formulario ─────────────────────────────────────────────
const SECTIONS = [
  {
    id: "empresa",
    title: "Sobre tu empresa",
    color: "#8b5cf6",
    questions: [
      { id: "nombre_comercial", label: "Nombre comercial", type: "text" },
      { id: "descripcion_actividad", label: "Descripción de la actividad comercial", type: "textarea" },
      { id: "productos_marcas", label: "Productos y marcas relacionadas", type: "textarea" },
      { id: "como_comercializa", label: "¿Cómo se comercializan los productos?", type: "textarea" },
      { id: "necesidades_satisface", label: "¿Qué necesidades satisfacen los productos o servicios?", type: "textarea" },
      { id: "para_que_sirven", label: "¿Para qué sirven?", type: "textarea" },
      { id: "puntos_contacto", label: "Puntos de contacto con la audiencia (tienda física/digital, web, redes sociales, blogs, etc.)", type: "textarea" },
      { id: "planes_futuro", label: "En el futuro, ¿tienes pensado ampliar tu línea de productos, puntos de contacto o estás planificando algún cambio sustancial en tu marca?", type: "textarea" },
      { id: "posicionamiento", label: "¿Cómo está posicionada la marca?", type: "textarea" },
      { id: "percepcion_deseada", label: "¿Cómo quieres que sea percibida la marca?", type: "textarea" },
      { id: "percepcion_satisfecha", label: "¿Estás contenta/o con cómo se percibe la marca o te gustaría cambiar la percepción?", type: "textarea" },
      { id: "punto_fuerte", label: "¿Cuál es el punto más fuerte de la marca?", type: "textarea" },
      { id: "punto_debil", label: "¿Cuál es el punto más débil de la marca?", type: "textarea" },
      { id: "opinion_gente", label: "¿Qué crees que piensa la gente de tu marca, productos o servicios?", type: "textarea" },
      { id: "necesidad_marca", label: "¿Qué necesidad satisface tu marca?", type: "textarea" },
      { id: "historia", label: "¿Cómo has llegado hasta aquí? ¿Por qué surge el negocio? Cuéntanos tu historia.", type: "textarea" },
      { id: "objetivo_marca", label: "¿Qué quieres lograr con la marca?", type: "textarea" },
      { id: "vision", label: "En un mundo ideal, ¿hasta dónde querrías llegar con tu marca?", type: "textarea" },
    ],
  },
  {
    id: "conceptos",
    title: "Conceptos de marca",
    color: "#3b82f6",
    questions: [
      { id: "concepto1_nombre", label: "Concepto 1", type: "text", placeholder: "Escribe el concepto..." },
      { id: "concepto1_porque", label: "¿Por qué este concepto te representa?", type: "textarea" },
      { id: "concepto1_evidencia", label: "¿De qué maneras tus clientes se dan cuenta de que eres así? ¿Qué hace tu marca para confirmarlo?", type: "textarea" },
      { id: "concepto2_nombre", label: "Concepto 2", type: "text", placeholder: "Escribe el concepto..." },
      { id: "concepto2_porque", label: "¿Por qué este concepto te representa?", type: "textarea" },
      { id: "concepto2_evidencia", label: "¿De qué maneras tus clientes se dan cuenta de que eres así? ¿Qué hace tu marca para confirmarlo?", type: "textarea" },
      { id: "concepto3_nombre", label: "Concepto 3", type: "text", placeholder: "Escribe el concepto..." },
      { id: "concepto3_porque", label: "¿Por qué este concepto te representa?", type: "textarea" },
      { id: "concepto3_evidencia", label: "¿De qué maneras tus clientes se dan cuenta de que eres así? ¿Qué hace tu marca para confirmarlo?", type: "textarea" },
      { id: "concepto4_nombre", label: "Concepto 4", type: "text", placeholder: "Escribe el concepto..." },
      { id: "concepto4_porque", label: "¿Por qué este concepto te representa?", type: "textarea" },
      { id: "concepto4_evidencia", label: "¿De qué maneras tus clientes se dan cuenta de que eres así? ¿Qué hace tu marca para confirmarlo?", type: "textarea" },
      { id: "concepto5_nombre", label: "Concepto 5", type: "text", placeholder: "Escribe el concepto..." },
      { id: "concepto5_porque", label: "¿Por qué este concepto te representa?", type: "textarea" },
      { id: "concepto5_evidencia", label: "¿De qué maneras tus clientes se dan cuenta de que eres así? ¿Qué hace tu marca para confirmarlo?", type: "textarea" },
    ],
  },
  {
    id: "competencia",
    title: "Competencia",
    color: "#ef4444",
    questions: [
      { id: "lider_sector", label: "¿Quién es el líder de tu sector?", type: "text" },
      { id: "marcas_similares", label: "Marcas similares a la tuya", type: "textarea" },
      { id: "productos_similares", label: "Productos similares a los tuyos", type: "textarea" },
      { id: "opciones_clientes", label: "¿Qué opciones tienen tus clientes para satisfacer la misma necesidad que resuelves?", type: "textarea" },
      { id: "marcas_no_parecer", label: "¿A qué marcas no te gustaría parecerte?", type: "textarea" },
      { id: "marcas_admiradas_sector", label: "¿A qué marcas admiras de tu sector?", type: "textarea" },
      { id: "marcas_admiradas_otro", label: "¿A qué marcas admiras de otro sector?", type: "textarea" },
    ],
  },
  {
    id: "audiencia",
    title: "Audiencia",
    color: "#10b981",
    questions: [
      { id: "quien_compra", label: "¿Quién compra tus productos o servicios?", type: "textarea" },
      { id: "que_sabes_ellos", label: "¿Qué sabes de ellos?", type: "textarea" },
      { id: "otras_audiencias", label: "¿Qué otras audiencias son relevantes para ti?", type: "textarea" },
      { id: "opinion_audiencia", label: "¿Qué opinan de tu marca?", type: "textarea" },
      { id: "marcas_usan", label: "¿Qué tipo de marcas o productos utilizan?", type: "textarea" },
      { id: "estilo_vida", label: "¿Cómo es su estilo de vida?", type: "textarea" },
      { id: "como_conocen_marca", label: "¿Cómo saben que tu marca existe?", type: "textarea" },
    ],
  },
  {
    id: "comunicacion",
    title: "Comunicación",
    color: "#f59e0b",
    questions: [
      { id: "como_dado_conocer", label: "¿Cómo te has dado a conocer hasta ahora?", type: "textarea" },
      { id: "que_funciono", label: "¿Qué te ha funcionado y qué no?", type: "textarea" },
      { id: "puntos_fuertes_contenido", label: "A la hora de crear contenido, ¿cuáles son tus puntos fuertes?", type: "textarea" },
      { id: "puntos_debiles_contenido", label: "¿Cuáles son tus puntos débiles al crear contenido?", type: "textarea" },
      { id: "dificultades_comunicacion", label: "¿Cuáles son las dificultades que encuentras al comunicar tu marca o producto?", type: "textarea" },
      { id: "mensaje_clave", label: "En general, ¿cuál es el mensaje clave de tu comunicación?", type: "textarea" },
      { id: "comunicar_si", label: "¿Hay algo que debamos comunicar sí o sí de tu marca?", type: "textarea" },
      { id: "comunicar_no", label: "¿Hay algo que NO debamos comunicar de tu marca?", type: "textarea" },
      { id: "tono_voz", label: "¿Tienes un tono de voz marcado? (Firme, dulce, cercano...)", type: "textarea" },
      { id: "linea_visual", label: "¿Tienes una línea visual definida? ¿Estás contenta/o con ella o hay algo que te gustaría mejorar?", type: "textarea" },
    ],
  },
  {
    id: "emociones",
    title: "Emociones y sensaciones",
    color: "#ec4899",
    questions: [
      { id: "texturas", label: "¿Cuáles texturas representan tu marca?", type: "textarea" },
      { id: "olores", label: "¿Cuáles olores representan tu marca?", type: "textarea" },
      { id: "sabores", label: "¿Cuáles sabores representan tu marca?", type: "textarea" },
      { id: "colores", label: "¿Cuáles colores representan tu marca?", type: "textarea" },
      { id: "musica", label: "¿Cuál música sonaría en el ambiente cuando alguien consume tu producto o tu marca?", type: "textarea" },
      { id: "sensaciones", label: "¿Cuáles sensaciones quieres que tu marca despierte?", type: "textarea" },
    ],
  },
];

// ─── Componente principal ──────────────────────────────────────────────────
export default function BriefPage() {
  const params = useParams();
  const token = params.token as string;

  const [client, setClient] = useState<{ id: string; name: string; company?: string } | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ empresa: true });

  // Cargar datos existentes del brief
  useEffect(() => {
    fetch(`/api/brief/${token}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) { setNotFound(true); return; }
        setClient({ id: data.id, name: data.name, company: data.company });
        if (data.brief_data && typeof data.brief_data === "object") {
          setAnswers(data.brief_data as Record<string, string>);
        }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [token]);

  // Auto-guardar 2 segundos después de dejar de escribir
  const autoSave = useCallback(async (data: Record<string, string>) => {
    try {
      const res = await fetch(`/api/brief/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        setSaved(true);
        setLastSaved(new Date());
      }
    } catch {
      // Fallo silencioso — el usuario puede guardar manualmente
    }
  }, [token]);

  function set(id: string, val: string) {
    setAnswers((prev) => {
      const next = { ...prev, [id]: val };
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => autoSave(next), 2000);
      return next;
    });
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/brief/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(answers),
      });
      if (res.ok) {
        setSaved(true);
        setLastSaved(new Date());
        toast.success("¡Guardado! Puedes cerrar esta página y continuar más tarde desde el mismo link.");
      } else {
        toast.error("Error al guardar. Intenta nuevamente.");
      }
    } catch {
      toast.error("Error de conexión. Intenta nuevamente.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSection(id: string) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // ── Estados de carga ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl font-bold text-gray-800 mb-2">Enlace no válido</p>
          <p className="text-gray-400 text-sm">Este formulario no existe o ha expirado.</p>
        </div>
      </div>
    );
  }

  // ── Formulario principal ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster position="bottom-right" />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Brief de marca</p>
            <h1 className="text-lg font-bold text-gray-900">{client?.name}</h1>
            {client?.company && client.company !== client.name && (
              <p className="text-sm text-gray-400">{client.company}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {lastSaved && (
              <div className="hidden sm:flex items-center gap-1 text-xs text-gray-400">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                <span>Guardado {lastSaved.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {saving ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
              ) : saved ? (
                <><CheckCircle2 className="w-4 h-4" /> Guardado</>
              ) : (
                <><Send className="w-4 h-4" /> Guardar</>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Intro */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-5 mb-8">
          <p className="text-sm text-violet-700 leading-relaxed">
            👋 Bienvenida/o. Este formulario es <strong>exclusivo para ti</strong> y nos ayudará a conocer tu marca en profundidad.
            Son muchas preguntas — no tienes que responderlas todas de una vez.
            <strong> Tu progreso se guarda automáticamente</strong> mientras escribes.
            Puedes cerrar esta página y continuar más tarde abriendo el mismo link. <strong>No se pierde nada.</strong>
          </p>
        </div>

        {/* Secciones */}
        <div className="space-y-4">
          {SECTIONS.map((section) => {
            const isOpen = !!openSections[section.id];
            const answered = section.questions.filter((q) => answers[q.id]?.trim()).length;
            const total = section.questions.length;

            return (
              <div key={section.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Header de sección */}
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: section.color }}
                    />
                    <span className="font-semibold text-gray-900">{section.title}</span>
                    <span className="text-xs text-gray-400">{answered}/{total} respondidas</span>
                  </div>
                  {isOpen ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                {/* Preguntas */}
                {isOpen && (
                  <div className="px-5 pb-5 space-y-5 border-t border-gray-100 pt-4">
                    {section.questions.map((q) => (
                      <div key={q.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">
                          {q.label}
                        </label>
                        {q.type === "text" ? (
                          <input
                            type="text"
                            value={answers[q.id] ?? ""}
                            onChange={(e) => set(q.id, e.target.value)}
                            placeholder={q.placeholder ?? "Tu respuesta..."}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-violet-400 transition-colors"
                          />
                        ) : (
                          <textarea
                            value={answers[q.id] ?? ""}
                            onChange={(e) => set(q.id, e.target.value)}
                            placeholder="Tu respuesta..."
                            rows={3}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-violet-400 transition-colors resize-y"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Botón guardar bottom */}
        <div className="mt-8 flex justify-center">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-medium px-8 py-3 rounded-xl transition-colors"
          >
            {saving ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Guardando...</>
            ) : saved ? (
              <><CheckCircle2 className="w-4 h-4" /> Guardado — puedes continuar después</>
            ) : (
              <><Send className="w-4 h-4" /> Guardar y continuar después</>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-gray-300 mt-6 pb-8">
          Powered by Cubo Digital · Tu información es confidencial y segura
        </p>
      </div>
    </div>
  );
}
