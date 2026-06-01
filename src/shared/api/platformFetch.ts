/** Web and Node/tests — standard fetch (delegates so tests can mock `global.fetch`). */
export const platformFetch: typeof fetch = (input, init) => globalThis.fetch(input, init);
