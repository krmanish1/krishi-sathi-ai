/**
 * LiteRT EngineConfig on Android expects a plain filesystem path, not a `file://` URI.
 * Expo `documentDirectory` is usually `file:///data/user/0/.../files/`.
 */
export function toNativeFilesystemPath(modelPath: string): string {
  const trimmed = modelPath.trim();
  if (!trimmed) return trimmed;
  if (/^file:\/\//i.test(trimmed)) {
    try {
      return decodeURIComponent(trimmed.replace(/^file:\/\//i, ""));
    } catch {
      return trimmed.replace(/^file:\/\//i, "");
    }
  }
  return trimmed;
}

/** Path forms Expo FileSystem accepts for existence checks. */
export function pathsForFileSystemCheck(modelPath: string): string[] {
  const trimmed = modelPath.trim();
  if (!trimmed) return [];
  const native = toNativeFilesystemPath(trimmed);
  if (native === trimmed) {
    return [trimmed, `file://${native}`];
  }
  return [trimmed, native, `file://${native}`];
}
