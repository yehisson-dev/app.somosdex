/**
 * Compatibility shim: replaces Supabase admin/server clients with a
 * postgres.js-backed implementation that has the same call shape used
 * throughout the codebase (from/select/insert/update/delete/eq/…).
 *
 * Only the query builder methods actually used in this project are
 * implemented. The returned objects are plain JS, not Supabase types.
 */
import sql from "@/lib/db";

// ---------------------------------------------------------------------------
// Minimal query-builder that mimics the Supabase fluent API
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

class Query {
  private _table: string;
  private _select: string = "*";
  private _filters: string[] = [];
  private _order: string | null = null;
  private _limit: number | null = null;
  private _single = false;
  private _insert: Row | Row[] | null = null;
  private _update: Row | null = null;
  private _delete = false;
  private _rpc: string | null = null;
  private _rpcArgs: Row | null = null;
  private _returnSingle = false;  // for insert().select().single()

  constructor(table: string) {
    this._table = table;
  }

  select(cols = "*") {
    this._select = cols;
    return this;
  }

  insert(data: Row | Row[]) {
    this._insert = data;
    return this;
  }

  update(data: Row) {
    this._update = data;
    return this;
  }

  delete() {
    this._delete = true;
    return this;
  }

  eq(col: string, val: unknown) {
    if (val === null || val === undefined) {
      this._filters.push(`"${col}" IS NULL`);
    } else {
      this._filters.push(`"${col}" = ${lit(val)}`);
    }
    return this;
  }

  neq(col: string, val: unknown) {
    this._filters.push(`"${col}" != ${lit(val)}`);
    return this;
  }

  ilike(col: string, pattern: string) {
    this._filters.push(`"${col}" ILIKE ${lit(pattern)}`);
    return this;
  }

  in(col: string, vals: unknown[]) {
    const inList = vals.map(lit).join(", ");
    this._filters.push(`"${col}" IN (${inList})`);
    return this;
  }

  is(col: string, val: unknown) {
    if (val === null) {
      this._filters.push(`"${col}" IS NULL`);
    } else {
      this._filters.push(`"${col}" = ${lit(val)}`);
    }
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    const dir = opts?.ascending === false ? "DESC" : "ASC";
    this._order = `"${col}" ${dir}`;
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    if (this._limit === null) this._limit = 1;
    return this;
  }

  // Chaining after insert
  returning() {
    return this;
  }

  // Allow .then() so callers can await the query directly
  then(resolve: (v: { data: unknown; error: unknown }) => void, reject?: (e: unknown) => void) {
    this._execute().then(resolve).catch(reject ?? ((e) => resolve({ data: null, error: e })));
  }

  // Also make it a real Promise/thenable via async execute
  async _execute(): Promise<{ data: unknown; error: unknown }> {
    try {
      // ---- RPC ----
      if (this._rpc) {
        const rows = await sql.unsafe(buildRpcCall(this._rpc, this._rpcArgs ?? {}));
        const data = this._single ? (rows[0] ?? null) : rows;
        return { data, error: null };
      }

      // ---- DELETE ----
      if (this._delete) {
        const where = this._filters.length ? `WHERE ${this._filters.join(" AND ")}` : "";
        await sql.unsafe(`DELETE FROM "${this._table}" ${where}`);
        return { data: null, error: null };
      }

      // ---- INSERT ----
      if (this._insert !== null) {
        const rows = Array.isArray(this._insert) ? this._insert : [this._insert];
        if (rows.length === 0) return { data: this._single ? null : [], error: null };
        const cols = Object.keys(rows[0]);
        const colStr = cols.map((c) => `"${c}"`).join(", ");
        const valRows = rows.map((r) => `(${cols.map((c) => lit(r[c])).join(", ")})`).join(",\n");
        const query = `INSERT INTO "${this._table}" (${colStr}) VALUES ${valRows} RETURNING *`;
        const result = await sql.unsafe(query);
        const data = this._single || this._returnSingle ? (result[0] ?? null) : result;
        return { data, error: null };
      }

      // ---- UPDATE ----
      if (this._update !== null) {
        const set = Object.entries(this._update)
          .map(([k, v]) => `"${k}" = ${lit(v)}`)
          .join(", ");
        const where = this._filters.length ? `WHERE ${this._filters.join(" AND ")}` : "";
        const returning = this._single ? " RETURNING *" : "";
        const result = await sql.unsafe(
          `UPDATE "${this._table}" SET ${set} ${where}${returning}`
        );
        const data = this._single ? (result[0] ?? null) : null;
        return { data, error: null };
      }

      // ---- SELECT ----
      // Resolve nested select syntax (Supabase-style) → simple columns
      const selectCols = resolveSelect(this._select);
      const where = this._filters.length ? `WHERE ${this._filters.join(" AND ")}` : "";
      const orderBy = this._order ? `ORDER BY ${this._order}` : "";
      const limitStr = this._limit ? `LIMIT ${this._limit}` : "";
      const result = await sql.unsafe(
        `SELECT ${selectCols} FROM "${this._table}" ${where} ${orderBy} ${limitStr}`
      );

      // For simple columns with Supabase join syntax we return flat rows
      const data = this._single ? (result[0] ?? null) : result;
      return { data, error: null };
    } catch (e: unknown) {
      return { data: null, error: e };
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function lit(v: unknown): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

/**
 * Supabase select strings like
 *   "*, manager:users!projects_manager_id_fkey(id, full_name)"
 * cannot be passed to plain SQL. We strip join sub-selects and return "*".
 * The dashboard pages that need joins use SQL directly (see route files).
 */
function resolveSelect(sel: string): string {
  if (!sel || sel === "*") return "*";
  // If it contains parentheses (join syntax), fall back to *
  if (sel.includes("(")) return "*";
  // Otherwise keep as-is (might be "id, name" etc.)
  return sel;
}

function buildRpcCall(fn: string, args: Row): string {
  const params = Object.entries(args)
    .map(([k, v]) => `${k} := ${lit(v)}`)
    .join(", ");
  return `SELECT * FROM ${fn}(${params})`;
}

// ---------------------------------------------------------------------------
// Supabase-compatible client factory
// ---------------------------------------------------------------------------

interface SupabaseClient {
  from(table: string): Query;
  rpc(fn: string, args?: Row): Query;
}

function makeClient(): SupabaseClient {
  return {
    from(table: string) {
      return new Query(table);
    },
    rpc(fn: string, args: Row = {}) {
      const q = new Query("__rpc__");
      q["_rpc"] = fn;
      q["_rpcArgs"] = args;
      return q;
    },
  };
}

/**
 * Drop-in replacement for Supabase createAdminClient().
 * Returns a client that speaks postgres.js underneath.
 */
export function createAdminClient(): SupabaseClient {
  return makeClient();
}

/**
 * Drop-in replacement for Supabase createClient() (server side).
 * Same implementation — auth is handled by NextAuth, not Supabase.
 */
export async function createClient(): Promise<SupabaseClient> {
  return makeClient();
}
