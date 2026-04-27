import type { SQLiteDatabase } from "expo-sqlite";

/**
 * Subset of {@link SQLiteDatabase} used app-wide.
 * Web uses an in-memory + localStorage implementation; native uses real SQLite.
 */
export type AppDatabase = Pick<
  SQLiteDatabase,
  "execAsync" | "runAsync" | "getFirstAsync" | "getAllAsync"
>;
