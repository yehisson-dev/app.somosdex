/**
 * Universal DB proxy for browser components.
 * Replaces the Supabase browser client by accepting structured JSON
 * operations and executing them via postgres.js.
 *
 * POST /api/db
 * Body: { op, table, ...opParams }
 *
 * Supported ops:
 *  - select: { table, select?, filters?, order?, limit?, single? }
 *  - insert: { table, data, returning? }
 *  - update: { table, data, filters, returning? }
 *  - delete: { table, filters }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import sql from "@/lib/db";

type Filter = { col: string; op: string; val: unknown };

function applyFilters(filters: Filter[]): string {
  if (!filters || filters.length === 0) return "";
  const parts = filters.map(({ col, op, val }) => {
    const quotedCol = `"${col}"`;
    if (op === "eq")    return val === null ? `${quotedCol} IS NULL` : `${quotedCol} = ${lit(val)}`;
    if (op === "neq")   return `${quotedCol} != ${lit(val)}`;
    if (op === "ilike") return `${quotedCol} ILIKE ${lit(val)}`;
    if (op === "in")    return `${quotedCol} IN (${(val as unknown[]).map(lit).join(", ")})`;
    if (op === "is")    return val === null ? `${quotedCol} IS NULL` : `${quotedCol} = ${lit(val)}`;
    if (op === "gte")   return `${quotedCol} >= ${lit(val)}`;
    if (op === "lte")   return `${quotedCol} <= ${lit(val)}`;
    return `${quotedCol} = ${lit(val)}`;
  });
  return "WHERE " + parts.join(" AND ");
}

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { op, table } = body as { op: string; table: string };

  // Allowlist tables to prevent arbitrary queries
  const ALLOWED_TABLES = new Set([
    "tasks", "task_comments", "task_deliverables", "task_activity",
    "users", "clients", "projects", "project_statuses", "project_members",
    "client_projects", "member_clients", "channels", "channel_members",
    "messages", "notifications", "whiteboards", "whiteboard_members",
    "workspace_settings", "content_plans", "content_posts", "content_post_comments",
    "agents", "agent_runs", "brain_sources", "brain_embeddings",
    "prospects",
  ]);

  if (!table || !ALLOWED_TABLES.has(table)) {
    return NextResponse.json({ error: `Table '${table}' not allowed` }, { status: 400 });
  }

  try {
    if (op === "select") {
      const { filters = [], order, limit, single } = body as any;
      const where = applyFilters(filters);
      const orderBy = order ? `ORDER BY "${order.col}" ${order.desc ? "DESC" : "ASC"}` : "";
      const limitStr = limit ? `LIMIT ${Number(limit)}` : single ? "LIMIT 1" : "";
      const rows = await sql.unsafe(`SELECT * FROM "${table}" ${where} ${orderBy} ${limitStr}`);
      const data = single ? (rows[0] ?? null) : rows;
      return NextResponse.json({ data, error: null });
    }

    if (op === "insert") {
      const { data: insertData } = body as { data: Record<string, unknown> | Record<string, unknown>[] };
      const rows = Array.isArray(insertData) ? insertData : [insertData];
      if (rows.length === 0) return NextResponse.json({ data: null, error: null });
      const cols = Object.keys(rows[0]);
      const colStr = cols.map((c) => `"${c}"`).join(", ");
      const valRows = rows.map((r) => `(${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n");
      const result = await sql.unsafe(`INSERT INTO "${table}" (${colStr}) VALUES ${valRows} RETURNING *`);
      const single = (body as any).single;
      return NextResponse.json({ data: single ? (result[0] ?? null) : result, error: null });
    }

    if (op === "update") {
      const { data: updateData, filters = [] } = body as any;
      const set = Object.entries(updateData as Record<string, unknown>)
        .map(([k, v]) => `"${k}" = ${lit(v)}`)
        .join(", ");
      const where = applyFilters(filters);
      const returning = (body as any).returning ? " RETURNING *" : "";
      const result = await sql.unsafe(`UPDATE "${table}" SET ${set} ${where}${returning}`);
      const single = (body as any).single;
      const data = returning ? (single ? (result[0] ?? null) : result) : null;
      return NextResponse.json({ data, error: null });
    }

    if (op === "delete") {
      const { filters = [] } = body as any;
      const where = applyFilters(filters);
      await sql.unsafe(`DELETE FROM "${table}" ${where}`);
      return NextResponse.json({ data: null, error: null });
    }

    return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
  } catch (e: unknown) {
    console.error("[api/db] Error:", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
