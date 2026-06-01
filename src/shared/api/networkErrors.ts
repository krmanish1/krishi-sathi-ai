/** True when fetch failed due to no route, DNS, or unreachable host (not HTTP 4xx/5xx). */
export function isNetworkFetchError(e: unknown): boolean {
  if (!(e instanceof Error)) return false;
  const msg = e.message;
  return (
    msg.includes("Network request failed") ||
    msg.includes("fetch failed") ||
    msg.includes("UnknownHost") ||
    msg.includes("Unable to resolve host")
  );
}
