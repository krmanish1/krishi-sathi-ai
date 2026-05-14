import type { ConversationDto } from "@/dtos/ConversationDto";
import type { QueryRequestDto } from "@/dtos/QueryRequestDto";
import type { QueryResponseDto, ImageUploadResponseDto } from "@/dtos/QueryResponseDto";
import type { FarmerTwinDto } from "@/dtos/FarmerTwinDto";
import type { WeatherReportDto } from "@/dtos/WeatherDto";
import type { SyncBundleDto } from "@/dtos/ConversationDto";
import type { Connectivity } from "@/types/api";

export interface IChatService {
  postQuery(req: QueryRequestDto, signal?: AbortSignal): Promise<QueryResponseDto>;
  postQueryImage(
    params: { uri: string; farmerId: string; purpose: "crop_disease" | "soil_photo" | "pest_id" },
    signal?: AbortSignal,
  ): Promise<ImageUploadResponseDto>;
  getHealth(signal?: AbortSignal): Promise<{ status: string; version: string }>;
  getSyncBundle(params: { state: string; district: string; bundleVersion?: string }): Promise<SyncBundleDto>;
  getFarmerTwin(farmerId: string, connectivity: Connectivity): Promise<FarmerTwinDto>;
  putFarmerTwin(farmerId: string, twin: FarmerTwinDto, connectivity: Connectivity, accessToken?: string | null): Promise<FarmerTwinDto>;
  getFarmerWeather(farmerId: string, connectivity: Connectivity, opts?: { forceRefresh?: boolean; signal?: AbortSignal }): Promise<WeatherReportDto>;
  getFarmerConversations(farmerId: string, connectivity: Connectivity, signal?: AbortSignal): Promise<ConversationDto[]>;
  postConversation(params: { farmerId: string; title: string }, connectivity: Connectivity, signal?: AbortSignal): Promise<ConversationDto>;
  deleteFarmerConversation(farmerId: string, conversationId: string, connectivity: Connectivity, signal?: AbortSignal): Promise<void>;
  postSyncPush(accessToken?: string | null, signal?: AbortSignal): Promise<unknown>;
}
