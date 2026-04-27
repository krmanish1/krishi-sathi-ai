import { randomUUID } from "@/shared/utils/uuid";
import { getDb } from "@/shared/storage/db";

export const MAIN_THREAD_ID = "main";

export type ChatMessageRow = {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  text: string;
  source: "ondevice" | "backend" | null;
  confidence: number | null;
  created_at: number;
};

export async function listThreadMessages(
  threadId: string = MAIN_THREAD_ID,
): Promise<ChatMessageRow[]> {
  const d = getDb();
  return d.getAllAsync<ChatMessageRow>(
    `SELECT id, thread_id, role, text, source, confidence, created_at
     FROM chat_messages WHERE thread_id = ? ORDER BY created_at ASC`,
    [threadId],
  );
}

type AppendInput = {
  id?: string;
  threadId?: string;
  role: "user" | "assistant";
  text: string;
  source?: "ondevice" | "backend" | null;
  confidence?: number | null;
  createdAt?: number;
};

export async function appendMessage(input: AppendInput): Promise<ChatMessageRow> {
  const d = getDb();
  const id = input.id ?? randomUUID();
  const threadId = input.threadId ?? MAIN_THREAD_ID;
  const created = input.createdAt ?? Date.now();
  const source = input.source ?? null;
  const conf = input.confidence ?? null;
  await d.runAsync(
    `INSERT INTO chat_messages (id, thread_id, role, text, source, confidence, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, threadId, input.role, input.text, source, conf, created],
  );
  return {
    id,
    thread_id: threadId,
    role: input.role,
    text: input.text,
    source,
    confidence: conf,
    created_at: created,
  };
}

export async function clearThread(threadId: string = MAIN_THREAD_ID): Promise<void> {
  const d = getDb();
  await d.runAsync("DELETE FROM chat_messages WHERE thread_id = ?", [threadId]);
}
