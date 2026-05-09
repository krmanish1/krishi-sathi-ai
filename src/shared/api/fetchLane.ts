import { Platform } from "react-native";

/**
 * Limits parallel HTTP calls on native. Hosts like Hugging Face Spaces often
 * drop or stall when many connections open at once; web keeps default behavior.
 */
const MAX_CONCURRENT = 4;
let inFlight = 0;
const waitQueue: (() => void)[] = [];

function acquire(): Promise<void> {
  if (Platform.OS === "web") {
    return Promise.resolve();
  }
  if (inFlight < MAX_CONCURRENT) {
    inFlight += 1;
    return Promise.resolve();
  }
  return new Promise<void>((resolve) => {
    waitQueue.push(() => {
      inFlight += 1;
      resolve();
    });
  });
}

function release(): void {
  if (Platform.OS === "web") {
    return;
  }
  inFlight -= 1;
  const next = waitQueue.shift();
  if (next) next();
}

/** Run one `fetch` (or any async work) inside the global API lane on iOS/Android. */
export async function withFetchLane<T>(fn: () => Promise<T>): Promise<T> {
  await acquire();
  try {
    return await fn();
  } finally {
    release();
  }
}
