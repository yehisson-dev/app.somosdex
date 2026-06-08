import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";
import { WhiteboardClient } from "@/components/whiteboard/WhiteboardClient";
import type { User } from "@/types/database";

interface Props { params: Promise<{ id: string }> }

export default async function WhiteboardPage({ params }: Props) {
  const { id } = await params;
  const session = await auth();
  if (!session) redirect("/login");

  const [boardRows, allUsers, currentUserRows, allClients, membersRaw] = await Promise.all([
    sql`SELECT * FROM whiteboards WHERE id = ${id} LIMIT 1`,
    sql`SELECT id, full_name, email, avatar_url, role, job_title, created_at, updated_at FROM users ORDER BY full_name`,
    sql`SELECT * FROM users WHERE email = ${session.user?.email ?? ""} LIMIT 1`,
    sql`SELECT id, name, color FROM clients ORDER BY name`,
    sql`
      SELECT wm.user_id,
        json_build_object('id', u.id, 'full_name', u.full_name, 'email', u.email, 'avatar_url', u.avatar_url) AS user
      FROM whiteboard_members wm
      JOIN users u ON u.id = wm.user_id
      WHERE wm.whiteboard_id = ${id}
    `,
  ]);

  if (!boardRows[0]) notFound();

  const board = boardRows[0] as any;
  const clientRow = board.client_id
    ? (await sql`SELECT id, name, color FROM clients WHERE id = ${board.client_id} LIMIT 1`)[0]
    : null;

  const boardWithRelations = {
    ...board,
    client: clientRow ?? null,
    members: membersRaw,
  };

  return (
    <div className="flex flex-col h-full">
      <WhiteboardClient
        board={boardWithRelations as any}
        currentUser={currentUserRows[0] as User}
        allUsers={(allUsers ?? []) as User[]}
        allClients={(allClients ?? []) as any[]}
      />
    </div>
  );
}
