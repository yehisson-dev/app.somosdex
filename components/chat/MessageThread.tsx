"use client";

import { useEffect, useRef } from "react";
import { cn, getInitials, formatRelativeDate } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { Message, User } from "@/types/database";

interface Props {
  messages: Message[];
  currentUserId: string;
  loading?: boolean;
}

export function MessageThread({ messages, currentUserId, loading }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <span className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 py-16">
        <p className="text-sm">Aún no hay mensajes</p>
        <p className="text-xs">¡Sé el primero en escribir!</p>
      </div>
    );
  }

  // Agrupar mensajes consecutivos del mismo usuario
  const grouped: Array<{ user: User | null | undefined; msgs: Message[] }> = [];
  for (const msg of messages) {
    const last = grouped[grouped.length - 1];
    if (last && last.user?.id === msg.user?.id) {
      last.msgs.push(msg);
    } else {
      grouped.push({ user: msg.user, msgs: [msg] });
    }
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {grouped.map((group, gi) => {
        const isMe = group.user?.id === currentUserId;
        return (
          <div key={gi} className={cn("flex gap-2.5", isMe && "flex-row-reverse")}>
            {/* Avatar */}
            <Avatar className="w-7 h-7 shrink-0 mt-0.5">
              <AvatarImage src={group.user?.avatar_url ?? undefined} />
              <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                {getInitials(group.user?.full_name)}
              </AvatarFallback>
            </Avatar>

            {/* Mensajes del grupo */}
            <div className={cn("flex flex-col gap-0.5 max-w-[75%]", isMe && "items-end")}>
              {/* Nombre + hora del primer mensaje */}
              <div className={cn("flex items-baseline gap-1.5 mb-0.5", isMe && "flex-row-reverse")}>
                <span className="text-[11px] font-semibold text-gray-700">
                  {isMe ? "Tú" : (group.user?.full_name ?? "Usuario")}
                </span>
                <span className="text-[10px] text-gray-400">
                  {formatRelativeDate(group.msgs[0].created_at)}
                </span>
              </div>

              {group.msgs.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "px-3 py-2 rounded-2xl text-sm leading-relaxed",
                    isMe
                      ? "bg-violet-600 text-white rounded-tr-sm"
                      : "bg-white border border-gray-200 text-gray-800 rounded-tl-sm"
                  )}
                >
                  {renderContent(msg.content)}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}

// Resaltar @menciones en el texto
function renderContent(content: string) {
  const parts = content.split(/(@[\w\s]+)/g);
  return parts.map((part, i) =>
    part.startsWith("@") ? (
      <span key={i} className="font-semibold opacity-90">{part}</span>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}
