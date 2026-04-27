import * as SQLite from "expo-sqlite";
import type { AppDatabase } from "./db.types";

let db: AppDatabase | null = null;

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

export const initDb = async (): Promise<AppDatabase> => {
  if (db) {
    return db;
  }
  const d = await SQLite.openDatabaseAsync("krishisaathi.db");
  await d.execAsync(MIGRATION_0001);
  db = d;
  return d;
};

export const getDb = (): AppDatabase => {
  if (!db) {
    throw new Error("DB not initialized. Call initDb() from RootProviders first.");
  }
  return db;
};
