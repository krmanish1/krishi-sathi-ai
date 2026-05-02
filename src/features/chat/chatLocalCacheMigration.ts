import type { QueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { clearAllChatThreads } from "./chatMessagesRepo";
import { clearChatResumeStorage } from "./chatResumeSnap";
import { useChatStore } from "./chatStore";

const REVISION_KEY = "krishi_chat_local_cache_revision";

/**
 * Bump this when you need every device to drop local chat rows + resume keys again
 * (e.g. after fixing thread IDs or server-backed history).
 */
const REQUIRED_REVISION = "legacy-v1";

async function readRevision(): Promise<string | null> {
  if (Platform.OS === "web") {
    try {
      return typeof localStorage !== "undefined" ? localStorage.getItem(REVISION_KEY) : null;
    } catch {
      return null;
    }
  }
  return AsyncStorage.getItem(REVISION_KEY);
}

async function writeRevision(value: string): Promise<void> {
  if (Platform.OS === "web") {
    try {
      localStorage?.setItem(REVISION_KEY, value);
    } catch {
      /* quota / private mode */
    }
    return;
  }
  await AsyncStorage.setItem(REVISION_KEY, value);
}

/**
 * One-shot migration: wipe all locally cached chat threads (SQLite / web JSON DB),
 * clear web reload-resume snapshot, reset Zustand chat session, drop TanStack chat queries.
 * Safe to call once per revision; no-op when `REQUIRED_REVISION` already stored.
 */
export async function runChatLocalCacheMigrationIfNeeded(qc: QueryClient): Promise<void> {
  const cur = await readRevision();
  if (cur === REQUIRED_REVISION) return;

  await clearAllChatThreads();
  clearChatResumeStorage();
  useChatStore.getState().resetConversation();
  qc.removeQueries({ queryKey: ["chat"] });

  await writeRevision(REQUIRED_REVISION);
}
