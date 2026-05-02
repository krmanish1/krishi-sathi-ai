/**
 * Shared logic for showing the farmer's name in UI — tested without React.
 */

export function resolveDisplayName(params: {
  twinName?: string | null;
  metadataName?: string | null;
  metadataFullName?: string | null;
  email?: string | null;
  fallback: string;
}): string {
  const twin = params.twinName?.trim();
  if (twin) return twin;

  const meta = (params.metadataName ?? params.metadataFullName)?.trim();
  if (meta) return meta;

  const email = params.email;
  if (email?.includes("@")) {
    const local = email.split("@")[0] ?? "";
    const parts = local.replace(/[.+_-]/g, " ").trim().split(/\s+/).filter(Boolean);
    if (parts.length) {
      return parts.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    }
  }

  return params.fallback;
}

/** First word for greetings like "Ram Ram, {{name}} Ji!" */
export function greetingFirstName(displayName: string): string {
  const s = displayName.trim();
  if (!s) return s;
  return s.split(/\s+/)[0] ?? s;
}
