"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

export default function RealTimeNotify() {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const msgsChannel = supabase
      .channel("rt-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload: any) => {
          const msg = payload.new as any;
          const { data: user } = await supabase
            .from("users")
            .select("full_name")
            .eq("id", msg.user_id)
            .single();
          toast(`Nuevo mensaje de ${user?.full_name || "Alguien"}`, {
            description: msg.content?.slice(0, 80),
          });
        }
      )
      .subscribe();

    const tasksChannel = supabase
      .channel("rt-tasks")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "tasks",
          filter: `assignee_id=eq.${userId}`,
        },
        (payload: any) => {
          const task = payload.new as any;
          toast("Nueva tarea asignada", {
            description: task.title,
          });
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tasks",
          filter: `assignee_id=eq.${userId}`,
        },
        (payload: any) => {
          const task = payload.new as any;
          toast("Tarea actualizada", {
            description: task.title,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(msgsChannel);
      supabase.removeChannel(tasksChannel);
    };
  }, [userId]);

  return null;
}
