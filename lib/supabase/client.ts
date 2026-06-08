/**
 * Browser Supabase client replacement.
 * Proxies all DB calls to /api/db which uses postgres.js server-side.
 * Supabase Storage calls still go to Supabase (storage migration is out of scope).
 *
 * The query builder mimics the Supabase fluent API surface used in this codebase.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// ---------------------------------------------------------------------------
// Storage shim — still uses real Supabase Storage
// ---------------------------------------------------------------------------
function makeStorage() {
  return {
    from(bucket: string) {
      return {
        async upload(path: string, file: File | Blob, opts?: { upsert?: boolean }) {
          const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;
          const method = opts?.upsert ? "PUT" : "POST";
          const resp = await fetch(url, {
            method,
            headers: {
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
              "x-upsert": opts?.upsert ? "true" : "false",
            },
            body: file,
          });
          if (!resp.ok) {
            const err = await resp.json().catch(() => ({ message: resp.statusText }));
            return { data: null, error: err };
          }
          const data = await resp.json();
          return { data, error: null };
        },
        getPublicUrl(path: string) {
          return {
            data: {
              publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`,
            },
          };
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Query builder
// ---------------------------------------------------------------------------
type Filter = { col: string; op: string; val: unknown };

class Query {
  private _table: string;
  private _op: "select" | "insert" | "update" | "delete" = "select";
  private _filters: Filter[] = [];
  private _order: { col: string; desc?: boolean } | null = null;
  private _limit: number | null = null;
  private _single = false;
  private _returning = false;
  private _insertData: Record<string, unknown> | Record<string, unknown>[] | null = null;
  private _updateData: Record<string, unknown> | null = null;

  constructor(table: string) {
    this._table = table;
  }

  select(_cols?: string) {
    // We always fetch * from the proxy; cols param ignored
    return this;
  }

  insert(data: Record<string, unknown> | Record<string, unknown>[]) {
    this._op = "insert";
    this._insertData = data;
    return this;
  }

  update(data: Record<string, unknown>) {
    this._op = "update";
    this._updateData = data;
    return this;
  }

  delete() {
    this._op = "delete";
    return this;
  }

  eq(col: string, val: unknown) {
    this._filters.push({ col, op: "eq", val });
    return this;
  }

  neq(col: string, val: unknown) {
    this._filters.push({ col, op: "neq", val });
    return this;
  }

  ilike(col: string, pattern: string) {
    this._filters.push({ col, op: "ilike", val: pattern });
    return this;
  }

  in(col: string, vals: unknown[]) {
    this._filters.push({ col, op: "in", val: vals });
    return this;
  }

  is(col: string, val: unknown) {
    this._filters.push({ col, op: "is", val });
    return this;
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this._order = { col, desc: opts?.ascending === false };
    return this;
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  single() {
    this._single = true;
    this._limit = 1;
    return this;
  }

  returning() {
    this._returning = true;
    return this;
  }

  then(
    resolve: (v: { data: unknown; error: unknown }) => void,
    reject?: (e: unknown) => void
  ) {
    this._call().then(resolve).catch(
      reject ?? ((e) => resolve({ data: null, error: e }))
    );
  }

  async _call(): Promise<{ data: unknown; error: unknown }> {
    const body: Record<string, unknown> = {
      op: this._op,
      table: this._table,
      filters: this._filters,
      single: this._single,
      returning: this._returning,
    };

    if (this._op === "select") {
      body.order = this._order;
      body.limit = this._limit;
    } else if (this._op === "insert") {
      body.data = this._insertData;
    } else if (this._op === "update") {
      body.data = this._updateData;
    }

    const resp = await fetch("/api/db", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: resp.statusText }));
      return { data: null, error: err.error ?? resp.statusText };
    }

    return resp.json();
  }
}

// ---------------------------------------------------------------------------
// Realtime stub — Supabase Realtime is no longer available.
// Returns a no-op channel so existing code doesn't throw.
// MessagesClient and WhiteboardClient should migrate to polling (done).
// ---------------------------------------------------------------------------
function makeNoopChannel() {
  const noop: any = {
    on(_event: string, _filter: any, _cb?: any) { return noop; },
    subscribe(_cb?: (status: string) => void) {
      _cb?.("SUBSCRIBED");
      return noop;
    },
    track(_data: any) { return Promise.resolve(); },
    presenceState<T>(): Record<string, T[]> { return {}; },
    unsubscribe() { return Promise.resolve("ok"); },
  };
  return noop;
}

// ---------------------------------------------------------------------------
// Public factory
// ---------------------------------------------------------------------------
export function createClient() {
  return {
    from(table: string) {
      return new Query(table);
    },
    storage: makeStorage(),
    channel(_name: string, _opts?: any) {
      return makeNoopChannel();
    },
    removeChannel(_ch: any) {
      return Promise.resolve("ok" as const);
    },
  };
}
