import { randomUUID } from "@/shared/utils/uuid";
import { getDb } from "@/shared/storage/db";
import type { Conversation } from "@/shared/api/types";

export type LocalConversation = {
  id: string;
  farmer_id: string;
  title: string;
  created_at: number;
  synced: boolean;
};

type ConvRow = {
  id: string;
  farmer_id: string;
  title: string;
  created_at: number;
  synced: number;
};

function rowToLocal(r: ConvRow): LocalConversation {
  return { ...r, synced: r.synced === 1 };
}

export function localConvToConversation(c: LocalConversation): Conversation {
  const iso = new Date(c.created_at).toISOString();
  return {
    conversation_id: c.id,
    farmer_id: c.farmer_id,
    title: c.title,
    created_at: iso,
    updated_at: iso,
  };
}

export async function createLocalConversation(
  farmerId: string,
  title = "Chat session",
): Promise<LocalConversation> {
  const d = getDb();
  const id = randomUUID();
  const created_at = Date.now();
  await d.runAsync(
    "INSERT INTO local_conversations (id, farmer_id, title, created_at, synced) VALUES (?, ?, ?, ?, 0)",
    [id, farmerId, title, created_at],
  );
  return { id, farmer_id: farmerId, title, created_at, synced: false };
}

export async function getLocalConversation(id: string): Promise<LocalConversation | null> {
  const d = getDb();
  const row = await d.getFirstAsync<ConvRow>(
    "SELECT id, farmer_id, title, created_at, synced FROM local_conversations WHERE id = ?",
    [id],
  );
  return row ? rowToLocal(row) : null;
}

export async function listLocalConversations(farmerId: string): Promise<LocalConversation[]> {
  const d = getDb();
  const rows = await d.getAllAsync<ConvRow>(
    "SELECT id, farmer_id, title, created_at, synced FROM local_conversations WHERE farmer_id = ? ORDER BY created_at DESC",
    [farmerId],
  );
  return rows.map(rowToLocal);
}

export async function listPendingConversations(farmerId: string): Promise<LocalConversation[]> {
  const d = getDb();
  const rows = await d.getAllAsync<ConvRow>(
    "SELECT id, farmer_id, title, created_at, synced FROM local_conversations WHERE farmer_id = ? AND synced = 0",
    [farmerId],
  );
  return rows.map(rowToLocal);
}

/**
 * Marks a conversation as synced. When the backend assigned a different UUID,
 * migrates all chat_messages and the local row to use the backend ID.
 */
export async function markConversationSynced(localId: string, backendId: string): Promise<void> {
  const d = getDb();
  if (localId !== backendId) {
    await d.runAsync("UPDATE chat_messages SET thread_id = ? WHERE thread_id = ?", [
      backendId,
      localId,
    ]);
    await d.runAsync(
      "UPDATE local_conversations SET id = ?, synced = 1 WHERE id = ?",
      [backendId, localId],
    );
  } else {
    await d.runAsync("UPDATE local_conversations SET synced = 1 WHERE id = ?", [localId]);
  }
}
