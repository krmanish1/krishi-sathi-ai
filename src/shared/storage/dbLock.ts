/** Web in-memory DB — no native lock needed. */
export const enqueueDb = <T>(work: () => Promise<T>): Promise<T> => work();
