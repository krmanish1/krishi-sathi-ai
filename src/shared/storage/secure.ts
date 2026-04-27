/**
 * Default for TypeScript and Node (Jest). Metro uses `secure.web.ts` on web
 * and `secure.native.ts` on iOS/Android.
 */
export { secureDelete, secureGet, secureSet } from "./secure.web";
