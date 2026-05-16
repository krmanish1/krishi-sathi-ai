import * as SQLite from "expo-sqlite";
import type { AppDatabase } from "./db.types";

let db: AppDatabase | null = null;
let initDbPromise: Promise<AppDatabase> | null = null;

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

const MIGRATION_0002_OFFLINE = `
CREATE TABLE IF NOT EXISTS schemes (
  id TEXT PRIMARY KEY,
  name TEXT,
  eligibility TEXT,
  benefits TEXT,
  how_to_apply TEXT,
  keywords TEXT
);
CREATE TABLE IF NOT EXISTS mandi_prices (
  crop TEXT,
  mandi TEXT,
  district TEXT,
  state TEXT,
  date TEXT,
  price_inr REAL,
  unit TEXT
);
CREATE TABLE IF NOT EXISTS crop_calendar (
  crop TEXT PRIMARY KEY,
  data TEXT
);
CREATE TABLE IF NOT EXISTS weather_history (
  district TEXT,
  month INTEGER,
  avg_temp_c REAL,
  avg_rain_mm REAL,
  PRIMARY KEY (district, month)
);
CREATE VIRTUAL TABLE IF NOT EXISTS schemes_fts
  USING fts5(name, eligibility, benefits, how_to_apply, keywords, content='schemes', content_rowid='rowid');
CREATE TRIGGER IF NOT EXISTS schemes_ai AFTER INSERT ON schemes BEGIN
  INSERT INTO schemes_fts(rowid, name, eligibility, benefits, how_to_apply, keywords)
  VALUES (new.rowid, new.name, new.eligibility, new.benefits, new.how_to_apply, new.keywords);
END;
CREATE TRIGGER IF NOT EXISTS schemes_ad AFTER DELETE ON schemes BEGIN
  INSERT INTO schemes_fts(schemes_fts, rowid, name, eligibility, benefits, how_to_apply, keywords)
  VALUES ('delete', old.rowid, old.name, old.eligibility, old.benefits, old.how_to_apply, old.keywords);
END;
CREATE TRIGGER IF NOT EXISTS schemes_au AFTER UPDATE ON schemes BEGIN
  INSERT INTO schemes_fts(schemes_fts, rowid, name, eligibility, benefits, how_to_apply, keywords)
  VALUES ('delete', old.rowid, old.name, old.eligibility, old.benefits, old.how_to_apply, old.keywords);
  INSERT INTO schemes_fts(rowid, name, eligibility, benefits, how_to_apply, keywords)
  VALUES (new.rowid, new.name, new.eligibility, new.benefits, new.how_to_apply, new.keywords);
END;
`;

export const initDb = async (): Promise<AppDatabase> => {
  if (db) {
    return db;
  }
  if (initDbPromise) return initDbPromise;

  initDbPromise = (async () => {
    const d = await SQLite.openDatabaseAsync("krishisaathi.db");
    await d.execAsync(MIGRATION_0001);
    await d.execAsync(MIGRATION_0002_OFFLINE);
    try {
      await d.execAsync("ALTER TABLE chat_messages ADD COLUMN image_local_uri TEXT;");
    } catch {
      /* column already exists */
    }
    try {
      await d.execAsync("ALTER TABLE chat_messages ADD COLUMN meta_json TEXT;");
    } catch {
      /* column already exists */
    }
    db = d;
    return d;
  })();

  try {
    return await initDbPromise;
  } catch (e) {
    initDbPromise = null;
    throw e;
  }
};

export const getDb = (): AppDatabase => {
  if (!db) {
    throw new Error("DB not initialized. Call initDb() from RootProviders first.");
  }
  return db;
};
