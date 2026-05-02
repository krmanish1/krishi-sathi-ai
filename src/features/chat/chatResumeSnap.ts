/**
 * Default (Node unit tests): unload snapshot is a no-op.
 * Metro picks `chatResumeSnap.web.ts` / `chatResumeSnap.native.ts` at bundle time.
 */
export function persistUnloadSnapshot(_farmerId: string | null, _conversationId: string): void {
  void _farmerId;
  void _conversationId;
}

export function consumeUnloadSnapshot(_farmerId: string | null): string | null {
  void _farmerId;
  return null;
}

/** Clears reload-resume snapshot (web implementation is in `.web.ts`). */
export function clearChatResumeStorage(): void {
  /* no-op default */
}
