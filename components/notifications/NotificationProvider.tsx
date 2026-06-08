"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { Notification } from "@/types/database";

interface Props {
  userId: string;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export function NotificationProvider({ userId }: Props) {
  const { setNotifications, addNotification } = useAppStore();
  const lastCountRef = useRef<number>(0);
  const knownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    async function fetchNotifications() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const { notifications } = await res.json() as { notifications: Notification[] };
        if (!notifications) return;

        // On first load, set all
        if (lastCountRef.current === 0) {
          setNotifications(notifications);
          notifications.forEach((n) => knownIdsRef.current.add(n.id));
          lastCountRef.current = notifications.length;
          return;
        }

        // On subsequent polls, detect new notifications
        const newOnes = notifications.filter((n) => !knownIdsRef.current.has(n.id));
        if (newOnes.length > 0) {
          newOnes.forEach((n) => {
            addNotification(n);
            knownIdsRef.current.add(n.id);
          });
        }
        lastCountRef.current = notifications.length;
      } catch {
        // network error — ignore silently
      }
    }

    // Initial fetch
    fetchNotifications();

    // Poll every 30 seconds
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [userId, setNotifications, addNotification]);

  return null;
}
