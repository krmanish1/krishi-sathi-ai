import { useQuery } from "@tanstack/react-query";
import { getFarmerConversations } from "@/shared/api";
import type { Connectivity } from "@/shared/api/types";
import { listLocalConversations, localConvToConversation } from "./localConversationsRepo";

// Key uses isOnline boolean so cache key is stable while transitioning between online/degraded.
export const FARMER_CONVERSATIONS_QUERY_KEY = (
  farmerId: string,
  connectivity: Connectivity,
) => ["chat", "farmerConversations", farmerId, connectivity === "online"] as const;

/**
 * Lists conversations for the farmer. When offline, reads from local SQLite;
 * when online, fetches from backend.
 */
export function useFarmerConversations(opts: {
  farmerId: string | null | undefined;
  connectivity: Connectivity;
}) {
  const { farmerId, connectivity } = opts;

  return useQuery({
    queryKey:
      farmerId != null
        ? FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivity)
        : (["chat", "farmerConversations", "disabled"] as const),
    queryFn: async () => {
      if (!farmerId) return [];
      if (connectivity !== "online") {
        const locals = await listLocalConversations(farmerId);
        return locals.map(localConvToConversation);
      }
      return getFarmerConversations(farmerId, connectivity);
    },
    enabled: !!farmerId,
  });
}
