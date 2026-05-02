import type { SQLiteBindParams } from "expo-sqlite";
import type { AppDatabase } from "./db.types";

const STORAGE_KEY = "krishisaathi.webdb.v1";

type SyncRow = { id: 1; version: string; payload: string; updated_at: number } | null;

type ChatRow = {
  id: string;
  thread_id: string;
  role: string;
  text: string;
  source: string | null;
  confidence: number | null;
  created_at: number;
  /** Local file URI for user-attached crop images (scan / chat attachment). */
  image_local_uri?: string | null;
};

type TwinRow = { payload: string; updated_at: number };

type Store = {
  syncBundle: SyncRow;
  chatMessages: ChatRow[];
  twinByFarmer: Record<string, TwinRow>;
};

const emptyStore = (): Store => ({
  syncBundle: null,
  chatMessages: [],
  twinByFarmer: {},
});

const MIGRATION_0001 = `
CREATE TABLE IF NOT EXISTS sync_bundle (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version TEXT NOT NULL,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  text TEXT NOT NULL,
  source TEXT CHECK (source IN ('ondevice','backend')),
  confidence REAL,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_chat_thread ON chat_messages(thread_id, created_at);
CREATE TABLE IF NOT EXISTS twin_cache (
  farmer_id TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
`;

function norm(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

function asArray(p: SQLiteBindParams | undefined): readonly unknown[] {
  if (p == null) {
    return [];
  }
  if (Array.isArray(p)) {
    return p;
  }
  return Object.values(p);
}

class WebAppDatabase {
  private data: Store = emptyStore();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.hydrate();
  }

  private hydrate(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const o = JSON.parse(raw) as Store;
        this.data = {
          syncBundle: o.syncBundle ?? null,
          chatMessages: Array.isArray(o.chatMessages) ? o.chatMessages : [],
          twinByFarmer: o.twinByFarmer && typeof o.twinByFarmer === "object" ? o.twinByFarmer : {},
        };
      }
    } catch {
      this.data = emptyStore();
    }
  }

  private schedulePersist(): void {
    if (typeof localStorage === "undefined") {
      return;
    }
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
    }
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
      } catch {
        // quota / private mode; in-memory only
      }
    }, 0);
  }

  async execAsync(_source: string): Promise<void> {
    // Native runs CREATE TABLE; web store is in-memory/JSON and needs no schema step.
    if (norm(_source) === norm(MIGRATION_0001)) {
      return;
    }
  }

  async runAsync(
    source: string,
    params: SQLiteBindParams,
  ): Promise<{ changes: number; lastInsertRowId: number }> {
    const s = norm(source);
    const a = asArray(params);

    if (
      s ===
      "INSERT OR REPLACE INTO sync_bundle (id, version, payload, updated_at) VALUES (1, ?, ?, ?)"
    ) {
      this.data.syncBundle = {
        id: 1,
        version: String(a[0] ?? ""),
        payload: String(a[1] ?? ""),
        updated_at: Number(a[2] ?? 0),
      };
      this.schedulePersist();
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (
      s ===
      "INSERT INTO chat_messages (id, thread_id, role, text, source, confidence, created_at, image_local_uri) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ) {
      this.data.chatMessages.push({
        id: String(a[0] ?? ""),
        thread_id: String(a[1] ?? ""),
        role: String(a[2] ?? ""),
        text: String(a[3] ?? ""),
        source: a[4] == null ? null : String(a[4]),
        confidence: a[5] == null ? null : Number(a[5]),
        created_at: Number(a[6] ?? 0),
        image_local_uri: a[7] == null || a[7] === "" ? null : String(a[7]),
      });
      this.schedulePersist();
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (
      s === "INSERT OR REPLACE INTO twin_cache (farmer_id, payload, updated_at) VALUES (?, ?, ?)"
    ) {
      const id = String(a[0] ?? "");
      this.data.twinByFarmer[id] = {
        payload: String(a[1] ?? ""),
        updated_at: Number(a[2] ?? 0),
      };
      this.schedulePersist();
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (s === "DELETE FROM chat_messages WHERE thread_id = ?") {
      const tid = String(a[0] ?? "");
      const before = this.data.chatMessages.length;
      this.data.chatMessages = this.data.chatMessages.filter((m) => m.thread_id !== tid);
      this.schedulePersist();
      return { changes: before - this.data.chatMessages.length, lastInsertRowId: 0 };
    }

    if (s === "DELETE FROM twin_cache WHERE farmer_id = ?") {
      const id = String(a[0] ?? "");
      if (id in this.data.twinByFarmer) {
        delete this.data.twinByFarmer[id];
        this.schedulePersist();
        return { changes: 1, lastInsertRowId: 0 };
      }
      return { changes: 0, lastInsertRowId: 0 };
    }

    throw new Error(`[db.web] Unsupported SQL: ${s}`);
  }

  async getFirstAsync<T>(source: string, p?: SQLiteBindParams): Promise<T | null> {
    const s = norm(source);
    const a = p == null ? [] : asArray(p);

    if (s === "SELECT version FROM sync_bundle WHERE id = 1") {
      if (!this.data.syncBundle) {
        return null;
      }
      return { version: this.data.syncBundle.version } as T;
    }

    if (s === "SELECT payload FROM sync_bundle WHERE id = 1") {
      if (!this.data.syncBundle) {
        return null;
      }
      return { payload: this.data.syncBundle.payload } as T;
    }

    if (s === "SELECT payload FROM twin_cache WHERE farmer_id = ?") {
      const id = String(a[0] ?? "");
      const row = this.data.twinByFarmer[id];
      if (!row) {
        return null;
      }
      return { payload: row.payload } as T;
    }

    throw new Error(`[db.web] Unsupported SQL: ${s}`);
  }

  async getAllAsync<T>(source: string, p?: SQLiteBindParams): Promise<T[]> {
    const s = norm(source);
    const a = p == null ? [] : asArray(p);

    const listPrefix =
      "SELECT id, thread_id, role, text, source, confidence, created_at, image_local_uri AS imageLocalUri FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC";
    if (s === norm(listPrefix)) {
      const tid = String(a[0] ?? "");
      const rows = this.data.chatMessages
        .filter((m) => m.thread_id === tid)
        .sort((x, y) => x.created_at - y.created_at)
        .map((m) => ({
          id: m.id,
          thread_id: m.thread_id,
          role: m.role,
          text: m.text,
          source: m.source,
          confidence: m.confidence,
          created_at: m.created_at,
          imageLocalUri: m.image_local_uri ?? undefined,
        }));
      return rows as T[];
    }

    throw new Error(`[db.web] Unsupported SQL: ${s}`);
  }
}

let instance: AppDatabase | null = null;

export const initDb = async (): Promise<AppDatabase> => {
  if (instance) {
    return instance;
  }
  const w = new WebAppDatabase() as unknown as AppDatabase;
  await w.execAsync(MIGRATION_0001);
  instance = w;
  return w;
};

export const getDb = (): AppDatabase => {
  if (!instance) {
    throw new Error("DB not initialized. Call initDb() from RootProviders first.");
  }
  return instance;
};
