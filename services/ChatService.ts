import { injectable, inject } from 'inversify';
import { TYPES } from '@/config/types';
import type { IHttpService } from "./interfaces/IHttpService";
import type { IChatService } from "./interfaces/IChatService";
import type { QueryResponseDto, ImageUploadResponseDto } from "@/dtos/QueryResponseDto";
import type { ConversationDto, SyncBundleDto } from "@/dtos/ConversationDto";
import type { FarmerTwinDto } from "@/dtos/FarmerTwinDto";
import type { WeatherReportDto } from "@/dtos/WeatherDto";
import type { Connectivity } from "@/types/api";
import { TIMEOUTS_MS } from "@/shared/config/constants";
import { normalizeTwinFromApi, serializeTwinForApi, twinTwinQueryString } from "@/shared/api/twinWire";
import { queryConnectivityWire } from "@/shared/api/types";

@injectable()
export class ChatService implements IChatService {
  constructor(
    @inject(TYPES.IHttpService) private readonly http: IHttpService,
  ) {}

  postQuery(req: import("@/dtos/QueryRequestDto").QueryRequestDto, signal?: AbortSignal) {
    return this.http.post<QueryResponseDto>("/api/v1/query", req, {
      timeoutMs: TIMEOUTS_MS.query,
      signal,
    });
  }

  async postQueryImage(
    params: { uri: string; farmerId: string; purpose: "crop_disease" | "soil_photo" | "pest_id" },
    signal?: AbortSignal,
  ) {
    const fd = new FormData();
    if (typeof document !== "undefined") {
      const res = await fetch(params.uri);
      let blob = await res.blob();
      if (blob.type !== "image/jpeg" && blob.type !== "image/png") {
        blob = await this.toJpegBlob(blob);
      }
      fd.append("image", blob, "image.jpg");
    } else {
      fd.append("image", { uri: params.uri, type: "image/jpeg", name: "image.jpg" } as unknown as Blob);
    }
    fd.append("farmer_id", params.farmerId);
    fd.append("purpose", params.purpose);
    return this.http.post<ImageUploadResponseDto>("/api/v1/query/image", fd, {
      timeoutMs: TIMEOUTS_MS.queryImage,
      signal,
    });
  }

  private toJpegBlob(source: Blob): Promise<Blob> {
    return new Promise((resolve: (value: Blob) => void, reject: (reason: Error) => void) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(source);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(objectUrl); reject(new Error("Canvas unavailable")); return; }
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(
          (result: Blob | null) => {
            URL.revokeObjectURL(objectUrl);
            if (result) { resolve(result); } else { reject(new Error("JPEG conversion failed")); }
          },
          "image/jpeg", 0.85,
        );
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Image load failed")); };
      img.src = objectUrl;
    });
  }

  getHealth(signal?: AbortSignal) {
    return this.http.get<{ status: string; version: string }>("/api/v1/health", {
      timeoutMs: TIMEOUTS_MS.health,
      signal,
    });
  }

  getSyncBundle(params: { state: string; district: string; bundleVersion?: string }) {
    const q = new URLSearchParams({ state: params.state, district: params.district });
    if (params.bundleVersion) q.set("bundle_version", params.bundleVersion);
    return this.http.get<SyncBundleDto>(`/api/v1/sync/bundle?${q.toString()}`, {
      timeoutMs: TIMEOUTS_MS.syncBundle,
      headers: { "Accept-Encoding": "gzip" },
    });
  }

  async getFarmerTwin(farmerId: string, connectivity: Connectivity) {
    const raw = await this.http.get<unknown>(
      `/api/v1/farmer/${encodeURIComponent(farmerId)}/twin${twinTwinQueryString(connectivity)}`,
      { timeoutMs: TIMEOUTS_MS.query },
    );
    return normalizeTwinFromApi(raw) as FarmerTwinDto;
  }

  async putFarmerTwin(
    farmerId: string,
    twin: FarmerTwinDto,
    connectivity: Connectivity,
    accessToken?: string | null,
  ) {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    const raw = await this.http.put<unknown>(
      `/api/v1/farmer/${encodeURIComponent(farmerId)}/twin${twinTwinQueryString(connectivity)}`,
      serializeTwinForApi(twin),
      { timeoutMs: TIMEOUTS_MS.query, headers },
    );
    return normalizeTwinFromApi(raw) as FarmerTwinDto;
  }

  getFarmerWeather(
    farmerId: string,
    connectivity: Connectivity,
    opts?: { forceRefresh?: boolean; signal?: AbortSignal },
  ) {
    const q = new URLSearchParams({
      connectivity: queryConnectivityWire(connectivity),
      force_refresh: opts?.forceRefresh === true ? "true" : "false",
    });
    return this.http.get<WeatherReportDto>(
      `/api/v1/weather/${encodeURIComponent(farmerId)}?${q.toString()}`,
      { timeoutMs: TIMEOUTS_MS.weather, signal: opts?.signal },
    );
  }

  getFarmerConversations(farmerId: string, connectivity: Connectivity, signal?: AbortSignal) {
    return this.http.get<ConversationDto[]>(
      `/api/v1/farmer/${encodeURIComponent(farmerId)}/conversations?connectivity=${queryConnectivityWire(connectivity)}`,
      { timeoutMs: TIMEOUTS_MS.conversation, signal },
    );
  }

  postConversation(
    params: { farmerId: string; title: string },
    connectivity: Connectivity,
    signal?: AbortSignal,
  ) {
    return this.http.post<ConversationDto>(
      `/api/v1/conversation?connectivity=${queryConnectivityWire(connectivity)}`,
      { farmer_id: params.farmerId, title: params.title },
      { timeoutMs: TIMEOUTS_MS.conversationCreate, signal },
    );
  }

  deleteFarmerConversation(
    farmerId: string,
    conversationId: string,
    connectivity: Connectivity,
    signal?: AbortSignal,
  ) {
    return this.http
      .delete<unknown>(
        `/api/v1/farmer/${encodeURIComponent(farmerId)}/conversations/${encodeURIComponent(conversationId)}?connectivity=${queryConnectivityWire(connectivity)}`,
        { timeoutMs: TIMEOUTS_MS.conversation, signal },
      )
      .then(() => undefined);
  }

  postSyncPush(accessToken?: string | null, signal?: AbortSignal) {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    return this.http.post<unknown>("/api/v1/sync/push", undefined, {
      timeoutMs: TIMEOUTS_MS.syncPush,
      headers,
      signal,
    });
  }
}
