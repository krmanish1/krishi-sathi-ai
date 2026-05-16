import type { Language } from "@/constants/Timeouts";
import type { DeviceIntent, OnDeviceModel } from "@/types/api";

export type QueryRequestDto = {
  farmer_id: string;
  conversation_id: string;
  query: {
    text: string;
    voice_b64: string;
    image_ref: string | null;
    language: Language;
  };
  context: {
    location: { state: string; district: string; lat?: number; lng?: number };
    connectivity: "online" | "offline";
    device_intent: DeviceIntent;
    device_capabilities: { ondevice_model: OnDeviceModel };
  };
};
