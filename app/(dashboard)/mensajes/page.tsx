import { Suspense } from "react";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { MessagesClient } from "@/components/chat/MessagesClient";
import type { User, Channel } from "@/types/database";

export default async function MensajesPage() {
  const session = await auth();

  const currentUserRows = await sql`
    SELECT * FROM users WHERE email = ${session?.user?.email ?? ""} LIMIT 1
  `;
  const currentUser = currentUserRows[0] as User;
  if (!currentUser) return null;

  const [allUsers, memberChannels] = await Promise.all([
    sql`
      SELECT id, full_name, email, avatar_url, role, job_title, created_at, updated_at
      FROM users WHERE id != ${currentUser.id} ORDER BY full_name
    `,
    sql`SELECT channel_id FROM channel_members WHERE user_id = ${currentUser.id}`,
  ]);

  const channelIds = (memberChannels ?? []).map((m: any) => m.channel_id);

  let channelsRaw: any[] = [];
  if (channelIds.length > 0) {
    channelsRaw = await sql`
      SELECT * FROM channels WHERE id = ANY(${channelIds}::uuid[]) ORDER BY created_at
    `;
  }

  return (
    <Suspense>
      <MessagesClient
        currentUser={currentUser}
        allUsers={(allUsers ?? []) as User[]}
        initialChannels={(channelsRaw ?? []) as Channel[]}
      />
    </Suspense>
  );
}
