"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const { unreadCount } = useAppStore();
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 bg-white shrink-0 relative">
      <div>
        <h1 className="text-sm font-semibold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2 relative">
        <button
          onClick={() => setPanelOpen((v) => !v)}
          className={cn(
            "relative p-2 rounded-md transition-colors",
            panelOpen ? "bg-violet-50 text-violet-600" : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
          )}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-violet-600 text-[9px] font-bold text-white px-0.5">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        <NotificationPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
      </div>
    </header>
  );
}
