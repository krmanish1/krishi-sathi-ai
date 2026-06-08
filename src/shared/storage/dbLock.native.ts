/**
 * Serializes native SQLite access so concurrent runAsync/execAsync calls
 * (chat + sync bundle + twin cache) do not raise "database is locked".
 */
let tail: Promise<unknown> = Promise.resolve();

export function enqueueDb<T>(work: () => Promise<T>): Promise<T> {
  const run = tail.then(work, work);
  tail = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}
