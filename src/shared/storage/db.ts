/**
 * Default module for TypeScript and Node (e.g. Jest, `tsc` without a platform).
 * Metro resolves imports to `db.web.ts` on web and `db.native.ts` on iOS/Android, so
 * this file is not part of those bundles when platform-specific files exist.
 */
export type { AppDatabase } from "./db.types";
export { getDb, initDb } from "./db.web";
