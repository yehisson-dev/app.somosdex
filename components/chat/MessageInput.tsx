"use client";

import { useState, useRef } from "react";
import { Send } from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import type { User } from "@/types/database";

interface Props {
  onSend: (content: string, mentions: string[]) => Promise<void>;
  members: User[];
  placeholder?: string;
  disabled?: boolean;
}

export function MessageInput({ onSend, members, placeholder = "Escribe un mensaje…", disabled }: Props) {
  const [content, setContent] = useState("");
  const [sending, setSending] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(0);
  const [mentions, setMentions] = useState<User[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Detectar @mención mientras escribe
  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setContent(val);

    const cursor = e.target.selectionStart ?? 0;
    const before = val.slice(0, cursor);
    const match = before.match(/@(\w*)$/);

    if (match) {
      setMentionQuery(match[1].toLowerCase());
      setMentionStart(cursor - match[0].length);
    } else {
      setMentionQuery(null);
    }
  }

  function selectMention(user: User) {
    const before = content.slice(0, mentionStart);
    const after = content.slice(textareaRef.current?.selectionStart ?? 0);
    const newContent = `${before}@${user.full_name ?? user.email} ${after}`;
    setContent(newContent);
    setMentionQuery(null);
    setMentions((prev) => (prev.find((m) => m.id === user.id) ? prev : [...prev, user]));
    textareaRef.current?.focus();
  }

  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending) return;
    setSending(true);
    await onSend(trimmed, mentions.map((m) => m.id));
    setContent("");
    setMentions([]);
    setMentionQuery(null);
    setSending(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === "Escape") setMentionQuery(null);
  }

  const filteredMembers = mentionQuery !== null
    ? members.filter((m) =>
        (m.full_name?.toLowerCase().includes(mentionQuery) ||
         m.email.toLowerCase().includes(mentionQuery)) &&
        !mentions.find((x) => x.id === m.id)
      )
    : [];

  return (
    <div className="relative">
      {/* Autocomplete de @menciones */}
      {filteredMembers.length > 0 && (
        <div className="absolute bottom-full mb-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-20">
          {filteredMembers.slice(0, 5).map((user) => (
            <button
              key={user.id}
              onMouseDown={(e) => { e.preventDefault(); selectMention(user); }}
              className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-violet-50 text-left transition-colors"
            >
              <Avatar className="w-6 h-6 shrink-0">
                <AvatarImage src={user.avatar_url ?? undefined} />
                <AvatarFallback className="text-[9px] bg-violet-100 text-violet-600">
                  {getInitials(user.full_name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs font-medium text-gray-800">{user.full_name}</p>
                <p className="text-[10px] text-gray-400">{user.email}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Chips de menciones activas */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1 px-3 pt-2">
          {mentions.map((m) => (
            <span key={m.id} className="flex items-center gap-1 text-[10px] bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5">
              @{m.full_name?.split(" ")[0]}
              <button onClick={() => setMentions((p) => p.filter((x) => x.id !== m.id))} className="hover:text-red-500">×</button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex items-end gap-2 p-3 bg-white border border-gray-200 rounded-xl">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          style={{ resize: "none" }}
          className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none leading-relaxed max-h-32 overflow-y-auto"
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 128)}px`;
          }}
        />
        <button
          onClick={handleSend}
          disabled={!content.trim() || sending || disabled}
          className="p-2 rounded-lg bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-[10px] text-gray-400 mt-1 px-1">
        <kbd className="font-mono">Enter</kbd> para enviar · <kbd className="font-mono">Shift+Enter</kbd> nueva línea · <kbd className="font-mono">@</kbd> para mencionar
      </p>
    </div>
  );
}
