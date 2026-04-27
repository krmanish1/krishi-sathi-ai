import type { Language } from "@/shared/config/constants";
import type { DeviceIntent, OnDeviceModel } from "../api/types";

export type GenerateInput = {
  prompt: string;
  language: Language;
  intent: DeviceIntent;
};

export type GenerateOutput = { text: string; confidence: number; modelUsed: OnDeviceModel };

export type GemmaBackend = {
  generate: (i: GenerateInput) => Promise<GenerateOutput>;
  loadModel?: () => Promise<void>;
  cancel?: () => void;
};

let backend: GemmaBackend | null = null;
export const setGemmaBackend = (b: GemmaBackend) => {
  backend = b;
};

export const generate = (i: GenerateInput): Promise<GenerateOutput> => {
  if (!backend) {
    throw new Error("Gemma backend not set");
  }
  return backend.generate(i);
};
