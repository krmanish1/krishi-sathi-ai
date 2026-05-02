import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSupabaseSession } from "@/shared/auth";
import { resolveDisplayName } from "./displayName";
import { useFarmerTwin } from "./useFarmerTwin";

/**
 * Preferred display name: twin profile → Supabase user_metadata → email local-part → i18n fallback.
 */
export function useDisplayName(): string {
  const { t } = useTranslation();
  const { data: twin } = useFarmerTwin();
  const session = useSupabaseSession();
  const fallback = t("profile.displayNameFallback");

  return useMemo(() => {
    const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
    const metaName = typeof meta?.name === "string" ? meta.name : null;
    const metaFull = typeof meta?.full_name === "string" ? meta.full_name : null;
    return resolveDisplayName({
      twinName: twin?.name ?? null,
      metadataName: metaName,
      metadataFullName: metaFull,
      email: session?.user?.email ?? null,
      fallback,
    });
  }, [twin, session, fallback]);
}
