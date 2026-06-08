import { createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Send } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";

export default async function MensajesPage() {
  const supabase = createAdminClient();

  const { data: channels } = await supabase
    .from("channels")
    .select("id, name, is_group, created_at")
    .order("created_at", { ascending: false });

  const { data: recentMessages } = await supabase
    .from("messages")
    .select(`
      id, content, created_at, user_id, channel_id,
      user:users(full_name, avatar_url),
      channel:channels(name)
    `)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app-movil" className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </Link>
            <h1 className="text-lg font-bold text-gray-900">Mensajes</h1>
          </div>
        </div>
      </header>

      {/* Channels */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Canales</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {channels?.map((channel) => (
            <Link
              key={channel.id}
              href={`/app-movil/mensajes/${channel.id}`}
              className="flex-shrink-0 px-3 py-2 bg-violet-100 text-violet-700 rounded-full text-sm font-medium"
            >
              # {channel.name}
            </Link>
          ))}
          {(!channels || channels.length === 0) && (
            <p className="text-sm text-gray-400">No hay canales</p>
          )}
        </div>
      </div>

      {/* Recent Messages */}
      <div className="px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">Mensajes recientes</h2>
        <div className="space-y-2">
          {recentMessages?.map((msg) => {
            const user = msg.user as any;
            const channel = msg.channel as any;
            return (
              <Link
                key={msg.id}
                href={`/app-movil/mensajes/${msg.channel_id}`}
                className="block bg-white rounded-xl p-3 shadow-sm border border-gray-100"
              >
                <div className="flex items-start gap-3">
                  {user?.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-8 h-8 rounded-full" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-xs text-gray-500">{user?.full_name?.[0] || "?"}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 text-sm">{user?.full_name || "Usuario"}</span>
                      <span className="text-xs text-gray-400">#{channel?.name}</span>
                    </div>
                    <p className="text-sm text-gray-600 truncate mt-0.5">{msg.content}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(msg.created_at)}</p>
                  </div>
                </div>
              </Link>
            );
          })}
          
          {(!recentMessages || recentMessages.length === 0) && (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay mensajes</p>
            </div>
          )}
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
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            <span className="text-[10px]">Tareas</span>
          </Link>
          <Link href="/app-movil/mensajes" className="flex flex-col items-center gap-1 p-2 text-violet-600">
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px]">Msjs</span>
          </Link>
        </div>
      </nav>
    </div>
  );
}