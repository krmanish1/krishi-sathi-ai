import { useQuery } from "@tanstack/react-query";
import { getFarmerConversations } from "@/shared/api";
import type { Connectivity } from "@/shared/api/types";

export const FARMER_CONVERSATIONS_QUERY_KEY = (
  farmerId: string,
  connectivity: Connectivity,
) => ["chat", "farmerConversations", farmerId, connectivity] as const;

/**
 * Lists backend conversations for the farmer (newest activity typical from API order).
 */
export function useFarmerConversations(opts: {
  farmerId: string | null | undefined;
  connectivity: Connectivity;
}) {
  const { farmerId, connectivity } = opts;
  const enabled = !!farmerId && connectivity !== "offline";

  return useQuery({
    queryKey:
      farmerId != null
        ? FARMER_CONVERSATIONS_QUERY_KEY(farmerId, connectivity)
        : (["chat", "farmerConversations", "disabled"] as const),
    queryFn: () => getFarmerConversations(farmerId!, connectivity),
    enabled,
  });
}
