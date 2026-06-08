import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeDate(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "ahora";
  if (minutes < 60) return `hace ${minutes}m`;
  if (hours < 24) return `hace ${hours}h`;
  if (days < 7) return `hace ${days}d`;
  return formatDate(d);
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function getPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    low: "Baja",
    medium: "Media",
    high: "Alta",
    urgent: "Urgente",
  };
  return map[priority] ?? priority;
}

export function getPriorityColor(priority: string): string {
  const map: Record<string, string> = {
    low: "text-slate-400",
    medium: "text-blue-400",
    high: "text-orange-400",
    urgent: "text-red-400",
  };
  return map[priority] ?? "text-slate-400";
}
