/**
 * Native: no full-page reload — keep noop (same as default `chatResumeSnap.ts`).
 */
export function persistUnloadSnapshot(_farmerId: string | null, _conversationId: string): void {
  void _farmerId;
  void _conversationId;
}

export function consumeUnloadSnapshot(_farmerId: string | null): string | null {
  void _farmerId;
  return null;
}

export function clearChatResumeStorage(): void {
  /* native: nothing persisted for reload resume */
}
